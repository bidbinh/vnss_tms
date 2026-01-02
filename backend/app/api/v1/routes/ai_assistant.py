from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import User, Customer, Site, Driver, Order
from app.core.security import get_current_user
from app.services.ai_assistant import AIAssistant
from pydantic import BaseModel
from typing import Optional, List
import base64
from datetime import datetime, date

router = APIRouter(prefix="/ai-assistant", tags=["ai-assistant"])


class ChatMessage(BaseModel):
    """Chat message from user"""
    message: str
    image: Optional[str] = None  # Base64 encoded image
    image_type: Optional[str] = None  # image/jpeg, image/png


class OrderCreationRequest(BaseModel):
    """Request to create order from AI-extracted data"""
    order_data: dict
    auto_create: bool = False  # If True, create order immediately


@router.post("/parse-message")
async def parse_message(
    chat: ChatMessage,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Parse a chat message and extract order information

    This endpoint uses AI to analyze text messages (and optionally images)
    to extract structured order information.
    """
    tenant_id = str(current_user.tenant_id)

    # Get context: customers and sites
    customers = session.exec(
        select(Customer).where(Customer.tenant_id == tenant_id)
    ).all()

    sites = session.exec(
        select(Site).where(Site.tenant_id == tenant_id)
    ).all()

    context = {
        "customers": [
            {"id": str(c.id), "name": c.name, "code": c.code}
            for c in customers
        ],
        "sites": [
            {
                "id": str(s.id),
                "company_name": s.company_name,
                "address": s.detailed_address,
                "contact_name": s.contact_name,
                "contact_phone": s.contact_phone
            }
            for s in sites
        ]
    }

    # Initialize AI assistant
    ai = AIAssistant()

    # Parse message
    if chat.image:
        # If image is provided, use vision
        result = ai.extract_from_image(chat.image, chat.image_type or "image/jpeg")
    else:
        # Text-only parsing
        result = ai.extract_order_info(chat.message, context)

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "AI parsing failed"))

    return {
        "success": True,
        "order_data": result["order_data"],
        "confidence": result["confidence"],
        "suggestions": {
            "message": "Dữ liệu đã được trích xuất. Vui lòng kiểm tra và xác nhận trước khi tạo đơn hàng."
        }
    }


@router.post("/create-order")
async def create_order_from_ai(
    request: OrderCreationRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Create an order from AI-extracted data

    This endpoint takes the structured order data from AI
    and creates an actual order in the system.
    """
    tenant_id = str(current_user.tenant_id)
    order_data = request.order_data

    try:
        # Map AI data to Order model
        pickup_info = order_data.get("pickup", {})
        delivery_info = order_data.get("delivery", {})
        cargo_info = order_data.get("cargo", {})

        # Find or create customer
        customer_id = None
        customer_name = order_data.get("customer", {}).get("name")
        if customer_name:
            customer = session.exec(
                select(Customer).where(
                    Customer.tenant_id == tenant_id,
                    Customer.name.ilike(f"%{customer_name}%")
                )
            ).first()
            if customer:
                customer_id = str(customer.id)

        # Find pickup site
        pickup_site_id = None
        if pickup_info.get("location"):
            pickup_site = session.exec(
                select(Site).where(
                    Site.tenant_id == tenant_id,
                    Site.company_name.ilike(f"%{pickup_info['location']}%")
                )
            ).first()
            if pickup_site:
                pickup_site_id = str(pickup_site.id)

        # Find delivery site
        delivery_site_id = None
        if delivery_info.get("company_name"):
            delivery_site = session.exec(
                select(Site).where(
                    Site.tenant_id == tenant_id,
                    Site.company_name.ilike(f"%{delivery_info['company_name']}%")
                )
            ).first()
            if delivery_site:
                delivery_site_id = str(delivery_site.id)

        # Parse dates
        order_date = date.today()
        if pickup_info.get("date"):
            try:
                order_date = datetime.strptime(pickup_info["date"], "%Y-%m-%d").date()
            except:
                pass

        delivery_date = None
        if delivery_info.get("date"):
            try:
                delivery_date = datetime.strptime(delivery_info["date"], "%Y-%m-%d").date()
            except:
                pass

        # Create order
        new_order = Order(
            tenant_id=tenant_id,
            customer_id=customer_id,
            order_date=order_date,
            pickup_site_id=pickup_site_id,
            pickup_text=pickup_info.get("address") or pickup_info.get("location"),
            delivery_site_id=delivery_site_id,
            delivery_text=delivery_info.get("address"),
            cargo_description=cargo_info.get("description"),
            weight_tons=cargo_info.get("weight_tons"),
            status="PENDING",
            special_instructions=delivery_info.get("instructions"),
            created_by=str(current_user.id)
        )

        if request.auto_create:
            session.add(new_order)
            session.commit()
            session.refresh(new_order)

            return {
                "success": True,
                "message": "Đơn hàng đã được tạo thành công",
                "order_id": str(new_order.id),
                "order": new_order
            }
        else:
            # Return preview without saving
            return {
                "success": True,
                "message": "Preview đơn hàng. Chưa lưu vào database.",
                "order_preview": {
                    "customer_id": customer_id,
                    "order_date": str(order_date),
                    "pickup": pickup_info.get("address") or pickup_info.get("location"),
                    "delivery": delivery_info.get("address"),
                    "cargo": cargo_info.get("description"),
                    "weight_tons": cargo_info.get("weight_tons"),
                    "special_instructions": delivery_info.get("instructions")
                }
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@router.get("/suggest-driver")
async def suggest_driver(
    pickup_location: str,
    delivery_location: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get AI suggestion for best driver based on route

    This uses AI to analyze driver performance, location, and
    suggest the most suitable driver for the route.
    """
    tenant_id = str(current_user.tenant_id)

    # Get available drivers
    drivers = session.exec(
        select(Driver).where(
            Driver.tenant_id == tenant_id,
            Driver.status == "ACTIVE"
        )
    ).all()

    if not drivers:
        return {
            "success": False,
            "message": "Không có tài xế khả dụng"
        }

    # Prepare driver info for AI
    driver_list = [
        {
            "id": str(d.id),
            "name": d.name,
            "phone": d.phone,
            "license_number": d.license_number
        }
        for d in drivers
    ]

    order_data = {
        "pickup": {"location": pickup_location},
        "delivery": {"location": delivery_location}
    }

    ai = AIAssistant()
    suggestion = ai.suggest_driver(order_data, driver_list)

    return {
        "success": True,
        "suggestion": suggestion
    }


@router.post("/upload-pod")
async def upload_pod_image(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Upload POD (Proof of Delivery) image and extract information

    This endpoint accepts an image file, uses AI vision to extract
    order details, and returns structured data.
    """

    # Read image file
    contents = await file.read()
    base64_image = base64.b64encode(contents).decode('utf-8')

    # Determine image type
    content_type = file.content_type or "image/jpeg"

    # Use AI to extract info
    ai = AIAssistant()
    result = ai.extract_from_image(base64_image, content_type)

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to process image"))

    return {
        "success": True,
        "filename": file.filename,
        "order_data": result["order_data"],
        "confidence": result["confidence"],
        "raw_response": result.get("raw_response")
    }
