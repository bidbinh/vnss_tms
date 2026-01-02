"""
Invoice Automation API
Automates VAT invoice retrieval from depot websites
Supports image upload with OCR to extract receipt info
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum
import asyncio
import sys
import os
import re
import tempfile
from datetime import datetime

# AI Vision imports
import base64
import json
import io

# Try Google Gemini first (free tier), fallback to Anthropic
GEMINI_AVAILABLE = False
ANTHROPIC_AVAILABLE = False

try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    pass

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    pass

AI_VISION_AVAILABLE = GEMINI_AVAILABLE or ANTHROPIC_AVAILABLE

router = APIRouter(prefix="/invoice-automation", tags=["Invoice Automation"])


class DepotCode(str, Enum):
    GFORTUNE = "GFORTUNE"
    # Add more depots here as they are implemented


class InvoiceRequest(BaseModel):
    depot_code: DepotCode
    receipt_number: str
    container_code: str


class InvoiceJob(BaseModel):
    job_id: str
    depot_code: str
    receipt_number: str
    container_code: str
    status: str  # pending, running, completed, failed
    message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class DepotInfo(BaseModel):
    code: str
    name: str
    url: str
    description: str


class OCRResult(BaseModel):
    success: bool
    receipt_number: Optional[str] = None
    container_code: Optional[str] = None
    depot_code: Optional[str] = None
    amount: Optional[str] = None
    raw_text: Optional[str] = None
    message: Optional[str] = None


# In-memory job storage (in production, use Redis or database)
jobs: dict[str, InvoiceJob] = {}


# Available depots
DEPOTS = {
    "GFORTUNE": DepotInfo(
        code="GFORTUNE",
        name="Greating Fortune Container",
        url="http://gfortune.sangtaoketnoi.vn/",
        description="Depot tai Hai An, Hai Phong - Ho tro cac hang tru COSCO"
    )
}

# Depot detection patterns
DEPOT_PATTERNS = {
    "GFORTUNE": [
        r"greating\s*fortune",
        r"gfortune",
        r"hai\s*an.*hai\s*phong",
        r"h[aả]i\s*an",
    ]
}


def extract_receipt_info(text: str) -> dict:
    """Extract receipt info from OCR text"""
    result = {
        "receipt_number": None,
        "container_code": None,
        "depot_code": None,
        "amount": None,
    }

    # Clean text
    text_lower = text.lower()

    # Detect depot
    for depot_code, patterns in DEPOT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                result["depot_code"] = depot_code
                break
        if result["depot_code"]:
            break

    # Extract receipt number (NH followed by digits)
    receipt_match = re.search(r'NH\s*(\d{5,10})', text, re.IGNORECASE)
    if receipt_match:
        result["receipt_number"] = f"NH{receipt_match.group(1)}"

    # Extract container code (4 letters + 7 digits pattern)
    container_match = re.search(r'([A-Z]{4}\s*\d{7})', text, re.IGNORECASE)
    if container_match:
        result["container_code"] = container_match.group(1).replace(" ", "").upper()

    # Extract amount (number with dots like 1.620.000)
    amount_match = re.search(r'(\d{1,3}(?:\.\d{3})+)\s*(?:VND|đ|dong)?', text, re.IGNORECASE)
    if amount_match:
        result["amount"] = amount_match.group(1)

    return result


@router.get("/depots", response_model=List[DepotInfo])
async def get_available_depots():
    """Get list of available depots for invoice automation"""
    return list(DEPOTS.values())


@router.post("/ocr", response_model=OCRResult)
async def extract_from_image(file: UploadFile = File(...)):
    """
    Upload a receipt image and extract info using AI Vision
    Supports: JPG, PNG, JPEG
    Uses Google Gemini (free) or Anthropic Claude as fallback
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed: {allowed_types}"
        )

    # Check if AI Vision is available
    if not AI_VISION_AVAILABLE:
        return OCRResult(
            success=False,
            message="AI Vision not available. Please install google-generativeai or anthropic package."
        )

    try:
        # Read image content
        content = await file.read()

        prompt = """Analyze this receipt/invoice image and extract the following information in JSON format:
{
    "receipt_number": "the receipt number, usually starts with NH followed by digits",
    "container_code": "container code, format is 4 letters followed by 7 digits like JXLU6143159",
    "depot_name": "name of the depot/company on the receipt",
    "amount": "total amount in VND"
}

If any field cannot be found, use null. Only return the JSON, no other text."""

        response_text = None

        # Try Gemini first (free tier)
        if GEMINI_AVAILABLE:
            gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            if gemini_key:
                try:
                    client = genai.Client(api_key=gemini_key)

                    # Determine mime type
                    mime_type = file.content_type or "image/jpeg"

                    response = client.models.generate_content(
                        model="gemini-2.0-flash-exp",
                        contents=[
                            types.Content(
                                role="user",
                                parts=[
                                    types.Part.from_bytes(data=content, mime_type=mime_type),
                                    types.Part.from_text(text=prompt),
                                ]
                            )
                        ]
                    )
                    response_text = response.text
                except Exception as gemini_error:
                    # Log but continue to try Anthropic
                    print(f"Gemini failed: {gemini_error}")

        # Fallback to Anthropic if Gemini failed or not configured
        if response_text is None and ANTHROPIC_AVAILABLE:
            anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
            if anthropic_key:
                base64_image = base64.standard_b64encode(content).decode("utf-8")
                media_type = file.content_type or "image/png"

                client = anthropic.Anthropic(api_key=anthropic_key)
                message = client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=1024,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": media_type,
                                        "data": base64_image,
                                    },
                                },
                                {"type": "text", "text": prompt}
                            ],
                        }
                    ],
                )
                response_text = message.content[0].text

        if response_text is None:
            return OCRResult(
                success=False,
                message="No AI API key configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY."
            )

        # Parse JSON from response
        try:
            json_match = re.search(r'\{[^}]+\}', response_text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
            else:
                data = json.loads(response_text)
        except json.JSONDecodeError:
            data = {}

        # Detect depot from depot_name
        depot_code = None
        depot_name = data.get("depot_name", "") or ""
        depot_name_lower = depot_name.lower()
        for code, patterns in DEPOT_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, depot_name_lower, re.IGNORECASE):
                    depot_code = code
                    break
            if depot_code:
                break

        return OCRResult(
            success=True,
            receipt_number=data.get("receipt_number"),
            container_code=data.get("container_code"),
            depot_code=depot_code,
            amount=data.get("amount"),
            raw_text=response_text[:500],
            message="AI Vision completed successfully"
        )

    except Exception as e:
        return OCRResult(
            success=False,
            message=f"AI Vision failed: {str(e)}"
        )


@router.post("/create", response_model=InvoiceJob)
async def create_invoice(request: InvoiceRequest, background_tasks: BackgroundTasks):
    """
    Create a new invoice automation job
    The job runs in background and can be tracked via job_id
    """
    # Validate depot
    if request.depot_code not in [d.value for d in DepotCode]:
        raise HTTPException(status_code=400, detail=f"Unknown depot: {request.depot_code}")

    # Get depot code value from enum
    depot_code_str = request.depot_code.value if hasattr(request.depot_code, 'value') else str(request.depot_code)

    # Create job
    job_id = f"{depot_code_str}_{request.receipt_number}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    job = InvoiceJob(
        job_id=job_id,
        depot_code=depot_code_str,
        receipt_number=request.receipt_number,
        container_code=request.container_code,
        status="pending",
        created_at=datetime.now()
    )
    jobs[job_id] = job

    # Run automation in background
    background_tasks.add_task(run_automation, job_id, request)

    return job


@router.get("/jobs/{job_id}", response_model=InvoiceJob)
async def get_job_status(job_id: str):
    """Get the status of an invoice automation job"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]


@router.get("/jobs", response_model=List[InvoiceJob])
async def list_jobs(limit: int = 20):
    """List recent invoice automation jobs"""
    sorted_jobs = sorted(jobs.values(), key=lambda x: x.created_at, reverse=True)
    return sorted_jobs[:limit]


async def run_automation(job_id: str, request: InvoiceRequest):
    """Run the invoice automation in background"""
    job = jobs[job_id]
    job.status = "running"

    try:
        # Path to the automation tool - go up from backend to project root, then to tools
        # __file__ = backend/app/api/v1/routes/invoice_automation.py
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
        project_root = os.path.dirname(backend_dir)
        tool_path = os.path.join(project_root, "tools", "invoice-automation")
        main_py = os.path.join(tool_path, "main.py")

        if not os.path.exists(main_py):
            raise Exception(f"Automation tool not found at {main_py}")

        # Get depot code value from enum
        depot_code = request.depot_code.value if hasattr(request.depot_code, 'value') else str(request.depot_code)

        # Run the automation script
        python_exe = sys.executable
        cmd = [
            python_exe, main_py,
            "--depot", depot_code,
            "--receipt", request.receipt_number,
            "--container", request.container_code
        ]

        # Run with timeout
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=tool_path
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=180  # 3 minutes timeout
        )

        output = stdout.decode() if stdout else ""
        error = stderr.decode() if stderr else ""

        if process.returncode == 0:
            job.status = "completed"
            job.message = "Invoice created successfully. Check email for PDF."
        else:
            job.status = "failed"
            job.message = f"Automation failed: {error or output}"

    except asyncio.TimeoutError:
        job.status = "failed"
        job.message = "Automation timed out after 3 minutes"
    except Exception as e:
        job.status = "failed"
        job.message = str(e)

    job.completed_at = datetime.now()
