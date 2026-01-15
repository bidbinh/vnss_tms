"""
Bank Payment API Routes

Endpoints for automated payroll payments via bank integration.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import logging

from app.db import get_session
from app.core.security import get_current_user
from app.models import User, Driver
from app.models.hrm.driver_payroll import DriverPayroll, DriverPayrollStatus
from app.services.bank_payment_service import (
    BankPaymentService,
    PaymentProvider,
    PaymentRequest,
    BatchPaymentRequest,
    PaymentResult,
    PaymentStatus,
    get_bank_payment_service,
    generate_vietqr_link,
)

router = APIRouter(prefix="/bank-payment", tags=["Bank Payment"])
logger = logging.getLogger(__name__)


# Request/Response models
class PayrollPaymentRequest(BaseModel):
    """Request to pay selected payrolls"""
    payroll_ids: List[str]
    provider: Optional[str] = "sepay"


class PaymentConfigUpdate(BaseModel):
    """Update payment provider configuration"""
    provider: str  # sepay, casso, mb_direct, manual
    sepay_api_key: Optional[str] = None
    sepay_webhook_secret: Optional[str] = None
    casso_api_key: Optional[str] = None
    casso_webhook_secret: Optional[str] = None
    mb_client_id: Optional[str] = None
    mb_client_secret: Optional[str] = None
    mb_account_number: Optional[str] = None
    mb_webhook_secret: Optional[str] = None


class PaymentStatusResponse(BaseModel):
    """Payment status response"""
    payroll_id: str
    driver_name: str
    amount: int
    status: str
    transaction_id: Optional[str] = None
    message: Optional[str] = None
    paid_at: Optional[datetime] = None


class BatchPaymentResponse(BaseModel):
    """Batch payment response"""
    total: int
    processing: int
    success: int
    failed: int
    results: List[PaymentStatusResponse]


# Temporary in-memory config (should be stored in database per tenant)
TENANT_PAYMENT_CONFIG = {}


def get_tenant_payment_config(tenant_id: str) -> dict:
    """Get payment config for tenant"""
    return TENANT_PAYMENT_CONFIG.get(tenant_id, {
        "provider": "manual",
        "bank_payment": {}
    })


def save_tenant_payment_config(tenant_id: str, config: dict):
    """Save payment config for tenant"""
    TENANT_PAYMENT_CONFIG[tenant_id] = config


@router.get("/config")
def get_payment_config(
    current_user: User = Depends(get_current_user),
):
    """Get current payment provider configuration"""
    if current_user.role not in ("ADMIN", "ACCOUNTANT"):
        raise HTTPException(403, "Access denied")

    tenant_id = str(current_user.tenant_id)
    config = get_tenant_payment_config(tenant_id)

    # Don't expose secrets
    safe_config = {
        "provider": config.get("provider", "manual"),
        "sepay_configured": bool(config.get("bank_payment", {}).get("sepay", {}).get("api_key")),
        "casso_configured": bool(config.get("bank_payment", {}).get("casso", {}).get("api_key")),
        "mb_configured": bool(config.get("bank_payment", {}).get("mb_direct", {}).get("client_id")),
    }

    return safe_config


@router.post("/config")
def update_payment_config(
    payload: PaymentConfigUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update payment provider configuration"""
    if current_user.role != "ADMIN":
        raise HTTPException(403, "Only admin can update payment configuration")

    tenant_id = str(current_user.tenant_id)

    config = {
        "provider": payload.provider,
        "bank_payment": {
            "provider": payload.provider,
        }
    }

    if payload.provider == "sepay" and payload.sepay_api_key:
        config["bank_payment"]["sepay"] = {
            "api_key": payload.sepay_api_key,
            "webhook_secret": payload.sepay_webhook_secret or "",
        }

    if payload.provider == "casso" and payload.casso_api_key:
        config["bank_payment"]["casso"] = {
            "api_key": payload.casso_api_key,
            "webhook_secret": payload.casso_webhook_secret or "",
        }

    if payload.provider == "mb_direct" and payload.mb_client_id:
        config["bank_payment"]["mb_direct"] = {
            "client_id": payload.mb_client_id,
            "client_secret": payload.mb_client_secret or "",
            "account_number": payload.mb_account_number or "",
            "webhook_secret": payload.mb_webhook_secret or "",
        }

    save_tenant_payment_config(tenant_id, config)

    return {"message": "Payment configuration updated", "provider": payload.provider}


@router.post("/pay-payrolls", response_model=BatchPaymentResponse)
async def pay_payrolls(
    payload: PayrollPaymentRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Initiate payment for selected payrolls

    This will:
    1. Validate payrolls are in CONFIRMED status
    2. Get driver bank info
    3. Call payment provider API
    4. Return status for each payment
    """
    if current_user.role not in ("ADMIN", "ACCOUNTANT"):
        raise HTTPException(403, "Only Accountant or Admin can initiate payments")

    tenant_id = str(current_user.tenant_id)

    if not payload.payroll_ids:
        raise HTTPException(400, "No payrolls selected")

    # Get payrolls
    payrolls = session.exec(
        select(DriverPayroll).where(
            DriverPayroll.id.in_(payload.payroll_ids),
            DriverPayroll.tenant_id == tenant_id
        )
    ).all()

    if not payrolls:
        raise HTTPException(404, "No payrolls found")

    # Validate all are CONFIRMED
    invalid = [p for p in payrolls if p.status != DriverPayrollStatus.CONFIRMED.value]
    if invalid:
        raise HTTPException(
            400,
            f"{len(invalid)} payrolls are not in CONFIRMED status. Please confirm them first."
        )

    # Build payment requests
    payment_requests = []
    for payroll in payrolls:
        driver = session.get(Driver, payroll.driver_id)
        if not driver:
            continue

        if not driver.bank_account:
            # Skip drivers without bank info
            continue

        payment_requests.append(PaymentRequest(
            payroll_id=str(payroll.id),
            driver_id=str(driver.id),
            driver_name=driver.name,
            amount=int(payroll.net_salary),
            bank_account=driver.bank_account or "",
            bank_name=driver.bank_name or "",
            bank_bin=driver.bank_bin,
            description=f"Luong T{payroll.month}/{payroll.year} {driver.name}"
        ))

    if not payment_requests:
        raise HTTPException(400, "No valid payrolls with bank info found")

    # Get payment service
    tenant_config = get_tenant_payment_config(tenant_id)
    service = get_bank_payment_service(tenant_config)

    # Process payments
    try:
        provider = PaymentProvider(payload.provider or tenant_config.get("provider", "manual"))
    except ValueError:
        provider = PaymentProvider.MANUAL

    batch_request = BatchPaymentRequest(
        payments=payment_requests,
        provider=provider,
    )

    results = await service.process_batch_payment(batch_request)

    # Update payroll status based on results
    response_results = []
    success_count = 0
    processing_count = 0
    failed_count = 0

    for result in results:
        payroll = session.get(DriverPayroll, result.payroll_id)
        driver = session.get(Driver, payroll.driver_id) if payroll else None

        if result.status == PaymentStatus.SUCCESS:
            success_count += 1
            if payroll:
                payroll.status = DriverPayrollStatus.PAID.value
                payroll.paid_at = result.paid_at or datetime.utcnow()
                session.add(payroll)

        elif result.status == PaymentStatus.PROCESSING:
            processing_count += 1
            # Keep as CONFIRMED, will be updated via webhook

        else:
            failed_count += 1

        response_results.append(PaymentStatusResponse(
            payroll_id=result.payroll_id,
            driver_name=driver.name if driver else "Unknown",
            amount=int(payroll.net_salary) if payroll else 0,
            status=result.status.value,
            transaction_id=result.transaction_id,
            message=result.message,
            paid_at=result.paid_at,
        ))

    session.commit()

    return BatchPaymentResponse(
        total=len(results),
        processing=processing_count,
        success=success_count,
        failed=failed_count,
        results=response_results,
    )


@router.post("/webhook/{provider}")
async def payment_webhook(
    provider: str,
    request: Request,
    x_signature: Optional[str] = Header(None, alias="X-Signature"),
    session: Session = Depends(get_session),
):
    """
    Webhook endpoint for payment provider callbacks

    Each provider will call this endpoint when payment status changes.
    """
    try:
        provider_enum = PaymentProvider(provider)
    except ValueError:
        raise HTTPException(400, f"Unknown provider: {provider}")

    payload_bytes = await request.body()
    payload = await request.json()

    logger.info(f"Received webhook from {provider}: {payload}")

    # Find tenant from payload (provider-specific)
    # For now, we'll try to match by payroll_id
    payroll_id = None

    if provider_enum == PaymentProvider.SEPAY:
        payroll_id = payload.get("reference_id")
    elif provider_enum == PaymentProvider.CASSO:
        # Casso puts reference in description
        desc = payload.get("description", "")
        # Try to extract payroll ID from description
        # Format: "Luong T1/2026 Driver Name - PAYROLL_ID"
        if "-" in desc:
            payroll_id = desc.split("-")[-1].strip()
    elif provider_enum == PaymentProvider.MB_DIRECT:
        payroll_id = payload.get("referenceId")

    if not payroll_id:
        logger.warning(f"Could not extract payroll_id from webhook: {payload}")
        return {"status": "ignored", "reason": "no payroll_id"}

    # Get payroll
    payroll = session.get(DriverPayroll, payroll_id)
    if not payroll:
        logger.warning(f"Payroll not found: {payroll_id}")
        return {"status": "ignored", "reason": "payroll not found"}

    # Get tenant config and verify signature
    tenant_id = str(payroll.tenant_id)
    tenant_config = get_tenant_payment_config(tenant_id)
    service = get_bank_payment_service(tenant_config)

    if x_signature:
        if not service.verify_webhook_signature(payload_bytes, x_signature, provider_enum):
            logger.warning(f"Invalid webhook signature for {payroll_id}")
            raise HTTPException(401, "Invalid signature")

    # Parse result
    result = service.parse_webhook_payload(payload, provider_enum)
    if not result:
        return {"status": "ignored", "reason": "could not parse payload"}

    # Update payroll status
    if result.status == PaymentStatus.SUCCESS:
        payroll.status = DriverPayrollStatus.PAID.value
        payroll.paid_at = result.paid_at or datetime.utcnow()
        session.add(payroll)
        session.commit()
        logger.info(f"Payroll {payroll_id} marked as PAID via webhook")

    return {
        "status": "processed",
        "payroll_id": payroll_id,
        "payment_status": result.status.value,
    }


@router.get("/qr/{payroll_id}")
def get_payment_qr(
    payroll_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get VietQR payment link for a single payroll"""
    if current_user.role not in ("ADMIN", "ACCOUNTANT"):
        raise HTTPException(403, "Access denied")

    tenant_id = str(current_user.tenant_id)

    payroll = session.get(DriverPayroll, payroll_id)
    if not payroll or str(payroll.tenant_id) != tenant_id:
        raise HTTPException(404, "Payroll not found")

    driver = session.get(Driver, payroll.driver_id)
    if not driver or not driver.bank_bin or not driver.bank_account:
        raise HTTPException(400, "Driver bank info not configured")

    qr_url = generate_vietqr_link(
        bank_bin=driver.bank_bin,
        account_number=driver.bank_account,
        account_name=driver.name,
        amount=int(payroll.net_salary),
        description=f"Luong T{payroll.month}/{payroll.year} {driver.name}",
    )

    return {
        "payroll_id": payroll_id,
        "driver_name": driver.name,
        "amount": int(payroll.net_salary),
        "bank_name": driver.bank_name,
        "bank_account": driver.bank_account,
        "qr_url": qr_url,
    }


@router.get("/providers")
def list_available_providers():
    """List available payment providers with info"""
    return {
        "providers": [
            {
                "id": "sepay",
                "name": "SePay",
                "description": "MB Bank Official Open Banking Partner",
                "website": "https://sepay.vn",
                "features": ["Free API", "Webhook notifications", "VietQR support"],
                "setup_required": ["API Key from SePay dashboard"],
            },
            {
                "id": "casso",
                "name": "Casso",
                "description": "Multi-bank integration platform",
                "website": "https://casso.vn",
                "features": ["Multiple banks", "Transaction monitoring", "Webhook"],
                "setup_required": ["API Key from Casso dashboard"],
            },
            {
                "id": "mb_direct",
                "name": "MB Bank Direct API",
                "description": "Direct integration with MB Bank Open API",
                "website": "https://developer.mbbank.com.vn",
                "features": ["Direct transfer", "Full automation", "Real-time status"],
                "setup_required": ["Business registration with MB Bank", "Client ID/Secret"],
            },
            {
                "id": "manual",
                "name": "Manual / Excel Export",
                "description": "Export to Excel for manual bank transfer",
                "features": ["No setup required", "Works with any bank"],
                "setup_required": [],
            },
        ]
    }
