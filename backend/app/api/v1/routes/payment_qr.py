"""
Payment QR API - Generate VietQR for driver reimbursement
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Optional, List
from datetime import date as date_type
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User, Driver, EmptyReturn, Order
from app.core.security import get_current_user

router = APIRouter(prefix="/payment-qr", tags=["payment-qr"])

# VietQR Bank BIN codes - includes short names, codes, and full Vietnamese names
BANK_BINS = {
    # Vietcombank
    "Vietcombank": "970436",
    "VCB": "970436",
    "Ngân hàng TMCP Ngoại Thương Việt Nam": "970436",
    "Ngoại Thương": "970436",
    # Techcombank
    "Techcombank": "970407",
    "TCB": "970407",
    "Ngân hàng TMCP Kỹ Thương Việt Nam": "970407",
    "Kỹ Thương": "970407",
    # BIDV
    "BIDV": "970418",
    "Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam": "970418",
    "Đầu Tư và Phát Triển": "970418",
    # Vietinbank
    "Vietinbank": "970415",
    "CTG": "970415",
    "Ngân hàng TMCP Công Thương Việt Nam": "970415",
    "Công Thương": "970415",
    # VPBank
    "VPBank": "970432",
    "Ngân hàng TMCP Việt Nam Thịnh Vượng": "970432",
    "Việt Nam Thịnh Vượng": "970432",
    "Thịnh Vượng": "970432",
    # MBBank
    "MBBank": "970422",
    "MB": "970422",
    "Ngân hàng TMCP Quân Đội": "970422",
    "Quân Đội": "970422",
    # ACB
    "ACB": "970416",
    "Ngân hàng TMCP Á Châu": "970416",
    "Á Châu": "970416",
    # TPBank
    "TPBank": "970423",
    "Ngân hàng TMCP Tiên Phong": "970423",
    "Tiên Phong": "970423",
    # Sacombank
    "Sacombank": "970403",
    "STB": "970403",
    "Ngân hàng TMCP Sài Gòn Thương Tín": "970403",
    "Sài Gòn Thương Tín": "970403",
    # HDBank
    "HDBank": "970437",
    "Ngân hàng TMCP Phát Triển TP.HCM": "970437",
    "Phát Triển TP.HCM": "970437",
    # VIB
    "VIB": "970441",
    "Ngân hàng TMCP Quốc Tế Việt Nam": "970441",
    "Quốc Tế Việt Nam": "970441",
    # SHB
    "SHB": "970443",
    "Ngân hàng TMCP Sài Gòn - Hà Nội": "970443",
    "Sài Gòn - Hà Nội": "970443",
    # Eximbank
    "Eximbank": "970431",
    "EIB": "970431",
    "Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam": "970431",
    "Xuất Nhập Khẩu": "970431",
    # MSB
    "MSB": "970426",
    "Ngân hàng TMCP Hàng Hải Việt Nam": "970426",
    "Hàng Hải": "970426",
    # OCB
    "OCB": "970448",
    "Ngân hàng TMCP Phương Đông": "970448",
    "Phương Đông": "970448",
    # LienVietPostBank
    "LienVietPostBank": "970449",
    "LVPB": "970449",
    "LPB": "970449",
    "Ngân hàng TMCP Bưu Điện Liên Việt": "970449",
    "Bưu Điện Liên Việt": "970449",
    # SeABank
    "SeABank": "970440",
    "Ngân hàng TMCP Đông Nam Á": "970440",
    "Đông Nam Á": "970440",
    # ABBank
    "ABBank": "970425",
    "Ngân hàng TMCP An Bình": "970425",
    "An Bình": "970425",
    # BacABank
    "BacABank": "970409",
    "Ngân hàng TMCP Bắc Á": "970409",
    "Bắc Á": "970409",
    # Agribank
    "Agribank": "970405",
    "VARB": "970405",
    "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam": "970405",
    "Nông nghiệp": "970405",
    # NamABank
    "NamABank": "970428",
    "Ngân hàng TMCP Nam Á": "970428",
    "Nam Á": "970428",
    # PVcomBank
    "PVcomBank": "970412",
    "Ngân hàng TMCP Đại Chúng Việt Nam": "970412",
    "Đại Chúng": "970412",
    # SCB
    "SCB": "970429",
    "Ngân hàng TMCP Sài Gòn": "970429",
    # NCB
    "NCB": "970419",
    "Ngân hàng TMCP Quốc Dân": "970419",
    "Quốc Dân": "970419",
    # VietABank
    "VietABank": "970427",
    "VAB": "970427",
    "Ngân hàng TMCP Việt Á": "970427",
    "Việt Á": "970427",
    # Kienlongbank
    "Kienlongbank": "970452",
    "KLB": "970452",
    "Ngân hàng TMCP Kiên Long": "970452",
    "Kiên Long": "970452",
    # BaoVietBank
    "BaoVietBank": "970438",
    "BVB": "970438",
    "Ngân hàng TMCP Bảo Việt": "970438",
    "Bảo Việt": "970438",
    # GPBank
    "GPBank": "970408",
    "Ngân hàng TMCP Dầu Khí Toàn Cầu": "970408",
    # PGBank
    "PGBank": "970430",
    "Ngân hàng TMCP Xăng Dầu Petrolimex": "970430",
    # VietCapitalBank
    "VietCapitalBank": "970454",
    "Ngân hàng TMCP Bản Việt": "970454",
    "Bản Việt": "970454",
    # SaigonBank
    "SaigonBank": "970400",
    "Ngân hàng TMCP Sài Gòn Công Thương": "970400",
    # Foreign banks
    "CIMB": "422589",
    "Ngân hàng CIMB Việt Nam": "422589",
    "UOB": "970458",
    "Ngân hàng UOB Việt Nam": "970458",
    "Woori": "970457",
    "Ngân hàng Woori Việt Nam": "970457",
    "ShinhanBank": "970424",
    "Shinhan": "970424",
    "Ngân hàng Shinhan Việt Nam": "970424",
    "HSBC": "458761",
    "Ngân hàng HSBC Việt Nam": "458761",
    "StandardChartered": "970410",
    "Ngân hàng Standard Chartered Việt Nam": "970410",
    # Digital banks
    "CAKE": "546034",
    "Ngân hàng số CAKE by VPBank": "546034",
    "Ubank": "546035",
    "Ngân hàng số Ubank by VPBank": "546035",
}


class QRRequest(BaseModel):
    empty_return_id: str
    amount: Optional[int] = None  # Override amount if needed


class BatchQRRequest(BaseModel):
    empty_return_ids: List[str]


class PaymentConfirmRequest(BaseModel):
    empty_return_id: str
    paid_amount: int
    note: Optional[str] = None


class BatchPaymentConfirmRequest(BaseModel):
    empty_return_ids: List[str]
    note: Optional[str] = None


def get_bank_bin(bank_name: str) -> Optional[str]:
    """Get bank BIN from bank name"""
    if not bank_name:
        return None

    # Direct match
    if bank_name in BANK_BINS:
        return BANK_BINS[bank_name]

    # Partial match
    bank_name_upper = bank_name.upper()
    for name, bin_code in BANK_BINS.items():
        if name.upper() in bank_name_upper or bank_name_upper in name.upper():
            return bin_code

    return None


def generate_vietqr_url(
    bank_bin: str,
    account_no: str,
    amount: int,
    description: str,
    account_name: Optional[str] = None
) -> str:
    """
    Generate VietQR URL
    Format: https://img.vietqr.io/image/{BANK_BIN}-{ACCOUNT_NO}-{TEMPLATE}.png?amount={AMOUNT}&addInfo={DESC}&accountName={NAME}
    """
    import urllib.parse

    template = "compact2"  # compact, compact2, qr_only, print

    # Clean account number (remove spaces, dashes)
    account_no = account_no.replace(" ", "").replace("-", "")

    # Build URL
    base_url = f"https://img.vietqr.io/image/{bank_bin}-{account_no}-{template}.png"

    params = {
        "amount": amount,
        "addInfo": description[:50],  # Max 50 chars
    }

    if account_name:
        params["accountName"] = account_name

    query_string = urllib.parse.urlencode(params)
    return f"{base_url}?{query_string}"


@router.get("/banks")
def list_banks():
    """List available bank BINs for VietQR"""
    return [{"name": name, "bin": bin_code} for name, bin_code in sorted(BANK_BINS.items())]


@router.post("/generate")
def generate_qr(
    request: QRRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Generate VietQR for single empty return payment
    Returns QR image URL for accountant to scan and pay driver
    """
    tenant_id = str(current_user.tenant_id)

    # Get empty return
    empty_return = session.get(EmptyReturn, request.empty_return_id)
    if not empty_return or str(empty_return.tenant_id) != tenant_id:
        raise HTTPException(404, "Empty return not found")

    # Get order to find driver
    order = session.get(Order, empty_return.order_id)
    if not order or not order.driver_id:
        raise HTTPException(400, "Order has no driver assigned")

    # Get driver
    driver = session.get(Driver, order.driver_id)
    if not driver:
        raise HTTPException(404, "Driver not found")

    if not driver.bank_account:
        raise HTTPException(400, f"Tài xế {driver.name} chưa có số tài khoản ngân hàng")

    # Get bank BIN
    bank_bin = driver.bank_bin or get_bank_bin(driver.bank_name or "")
    if not bank_bin:
        raise HTTPException(400, f"Không xác định được mã ngân hàng của {driver.bank_name}. Vui lòng cập nhật bank_bin cho tài xế.")

    # Calculate amount to pay (total_amount - total_paid = remaining)
    amount = request.amount or (empty_return.total_amount - empty_return.total_paid)
    if amount <= 0:
        raise HTTPException(400, "Số tiền thanh toán phải lớn hơn 0")

    # Generate description
    description = f"Ha rong {order.order_code}"

    # Generate QR URL
    qr_url = generate_vietqr_url(
        bank_bin=bank_bin,
        account_no=driver.bank_account,
        amount=amount,
        description=description,
        account_name=driver.name,
    )

    return {
        "qr_url": qr_url,
        "driver_name": driver.name,
        "bank_name": driver.bank_name,
        "bank_account": driver.bank_account,
        "amount": amount,
        "order_code": order.order_code,
        "container_code": order.container_code,
        "description": description,
        "empty_return_id": empty_return.id,
    }


@router.post("/generate-batch")
def generate_batch_qr(
    request: BatchQRRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Generate payment summary for batch payment
    Groups by driver and returns total amount per driver
    """
    tenant_id = str(current_user.tenant_id)

    # Get all empty returns
    empty_returns = session.exec(
        select(EmptyReturn).where(
            EmptyReturn.id.in_(request.empty_return_ids),
            EmptyReturn.tenant_id == tenant_id,
        )
    ).all()

    if not empty_returns:
        raise HTTPException(404, "No empty returns found")

    # Group by driver
    driver_payments = {}  # driver_id -> {driver_info, total_amount, orders}

    for er in empty_returns:
        order = session.get(Order, er.order_id)
        if not order or not order.driver_id:
            continue

        driver = session.get(Driver, order.driver_id)
        if not driver:
            continue

        amount = er.total_amount - er.total_paid
        if amount <= 0:
            continue

        if driver.id not in driver_payments:
            driver_payments[driver.id] = {
                "driver_id": driver.id,
                "driver_name": driver.name,
                "bank_name": driver.bank_name,
                "bank_account": driver.bank_account,
                "bank_bin": driver.bank_bin or get_bank_bin(driver.bank_name or ""),
                "total_amount": 0,
                "orders": [],
                "empty_return_ids": [],
            }

        driver_payments[driver.id]["total_amount"] += amount
        driver_payments[driver.id]["orders"].append({
            "order_code": order.order_code,
            "container_code": order.container_code,
            "amount": amount,
            "empty_return_id": er.id,
        })
        driver_payments[driver.id]["empty_return_ids"].append(er.id)

    # Generate QR for each driver
    result = []
    for driver_id, payment in driver_payments.items():
        if not payment["bank_account"] or not payment["bank_bin"]:
            payment["qr_url"] = None
            payment["error"] = "Thiếu thông tin ngân hàng"
        else:
            # Description lists all order codes (VietQR max 50 chars)
            order_codes = " ".join([o["order_code"] for o in payment["orders"]])
            description = f"Ha rong {order_codes}"
            # Truncate if too long (max 50 chars for VietQR)
            if len(description) > 50:
                description = description[:50]

            payment["qr_url"] = generate_vietqr_url(
                bank_bin=payment["bank_bin"],
                account_no=payment["bank_account"],
                amount=payment["total_amount"],
                description=description,
                account_name=payment["driver_name"],
            )

        result.append(payment)

    # Sort by total amount desc
    result.sort(key=lambda x: x["total_amount"], reverse=True)

    return {
        "total_drivers": len(result),
        "total_amount": sum(p["total_amount"] for p in result),
        "payments": result,
    }


@router.post("/confirm")
def confirm_payment(
    request: PaymentConfirmRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Confirm payment has been made - update empty return status
    """
    if current_user.role not in ("ADMIN", "DISPATCHER", "ACCOUNTANT"):
        raise HTTPException(403, "Only ADMIN, DISPATCHER, or ACCOUNTANT can confirm payments")

    tenant_id = str(current_user.tenant_id)

    empty_return = session.get(EmptyReturn, request.empty_return_id)
    if not empty_return or str(empty_return.tenant_id) != tenant_id:
        raise HTTPException(404, "Empty return not found")

    # Update paid amount
    empty_return.total_paid = (empty_return.total_paid or 0) + request.paid_amount

    # Update individual fee paid fields proportionally
    if empty_return.total_amount > 0:
        ratio = empty_return.total_paid / empty_return.total_amount
        empty_return.cleaning_fee_paid = int(empty_return.cleaning_fee * ratio)
        empty_return.lift_fee_paid = int(empty_return.lift_fee * ratio)
        empty_return.storage_fee_paid = int(empty_return.storage_fee * ratio)
        empty_return.repair_fee_paid = int(empty_return.repair_fee * ratio)
        empty_return.other_fee_paid = int(empty_return.other_fee * ratio)

    # Update status if fully paid
    if empty_return.total_paid >= empty_return.total_amount:
        empty_return.status = "COMPLETED"
    else:
        empty_return.status = "CONFIRMED"  # Partially paid

    # Add note
    if request.note:
        existing_notes = empty_return.notes or ""
        empty_return.notes = f"{existing_notes}\n[Thanh toán] {request.note}".strip()

    session.add(empty_return)
    session.commit()
    session.refresh(empty_return)

    return {
        "message": "Xác nhận thanh toán thành công",
        "empty_return_id": empty_return.id,
        "total_paid": empty_return.total_paid,
        "status": empty_return.status,
    }


@router.post("/confirm-batch")
def confirm_batch_payment(
    request: BatchPaymentConfirmRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Confirm batch payment - mark all selected empty returns as paid
    """
    if current_user.role not in ("ADMIN", "DISPATCHER", "ACCOUNTANT"):
        raise HTTPException(403, "Only ADMIN, DISPATCHER, or ACCOUNTANT can confirm payments")

    tenant_id = str(current_user.tenant_id)

    empty_returns = session.exec(
        select(EmptyReturn).where(
            EmptyReturn.id.in_(request.empty_return_ids),
            EmptyReturn.tenant_id == tenant_id,
        )
    ).all()

    if not empty_returns:
        raise HTTPException(404, "No empty returns found")

    updated = []
    for er in empty_returns:
        remaining = er.total_amount - (er.total_paid or 0)
        if remaining > 0:
            er.total_paid = er.total_amount
            er.cleaning_fee_paid = er.cleaning_fee
            er.lift_fee_paid = er.lift_fee
            er.storage_fee_paid = er.storage_fee
            er.repair_fee_paid = er.repair_fee
            er.other_fee_paid = er.other_fee
            er.status = "COMPLETED"

            if request.note:
                existing_notes = er.notes or ""
                er.notes = f"{existing_notes}\n[Thanh toán hàng loạt] {request.note}".strip()

            session.add(er)
            updated.append(er.id)

    session.commit()

    return {
        "message": f"Đã xác nhận thanh toán {len(updated)} đơn hạ rỗng",
        "updated_ids": updated,
    }


@router.get("/pending")
def get_pending_payments(
    driver_id: Optional[str] = None,
    start_date: Optional[date_type] = None,
    end_date: Optional[date_type] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get all pending payments (empty returns that need reimbursement)
    """
    tenant_id = str(current_user.tenant_id)

    # Get empty returns with remaining balance
    stmt = select(EmptyReturn).where(
        EmptyReturn.tenant_id == tenant_id,
        EmptyReturn.status.in_(["PENDING", "SUBMITTED", "CONFIRMED"]),
    )

    if start_date:
        stmt = stmt.where(EmptyReturn.return_date >= start_date)
    if end_date:
        stmt = stmt.where(EmptyReturn.return_date <= end_date)

    empty_returns = session.exec(stmt).all()

    result = []
    for er in empty_returns:
        remaining = er.total_amount - (er.total_paid or 0)
        if remaining <= 0:
            continue

        order = session.get(Order, er.order_id)
        if not order:
            continue

        # Filter by driver if specified
        if driver_id and order.driver_id != driver_id:
            continue

        driver = session.get(Driver, order.driver_id) if order.driver_id else None

        result.append({
            "empty_return_id": er.id,
            "order_code": order.order_code,
            "container_code": order.container_code,
            "return_date": er.return_date,
            "driver_id": order.driver_id,
            "driver_name": driver.name if driver else None,
            "total_amount": er.total_amount,
            "total_paid": er.total_paid or 0,
            "remaining": remaining,
            "status": er.status,
        })

    # Group by driver
    by_driver = {}
    for item in result:
        did = item["driver_id"] or "unknown"
        if did not in by_driver:
            by_driver[did] = {
                "driver_id": did,
                "driver_name": item["driver_name"],
                "total_remaining": 0,
                "count": 0,
                "items": [],
            }
        by_driver[did]["total_remaining"] += item["remaining"]
        by_driver[did]["count"] += 1
        by_driver[did]["items"].append(item)

    return {
        "total_remaining": sum(item["remaining"] for item in result),
        "total_count": len(result),
        "by_driver": list(by_driver.values()),
    }
