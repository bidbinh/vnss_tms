"""
VNPay Payment Integration Service
Tích hợp cổng thanh toán VNPay
"""
import hashlib
import hmac
import urllib.parse
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlmodel import Session, select

from app.models.billing import (
    PaymentTransaction,
    BillingInvoice,
    BillingPaymentStatus,
    InvoiceStatus,
    TenantSubscription,
    SubscriptionStatus,
)
from app.core.config import settings


class VNPayConfig:
    """VNPay configuration from environment"""

    # These should be set in environment variables
    TMN_CODE = getattr(settings, "VNPAY_TMN_CODE", "DEMO")
    HASH_SECRET = getattr(settings, "VNPAY_HASH_SECRET", "DEMO_SECRET")
    PAYMENT_URL = getattr(
        settings,
        "VNPAY_URL",
        "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    )
    RETURN_URL = getattr(
        settings,
        "VNPAY_RETURN_URL",
        "http://localhost:3000/billing/payment/return"
    )
    API_URL = getattr(
        settings,
        "VNPAY_API_URL",
        "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"
    )


def generate_txn_ref() -> str:
    """Generate unique transaction reference"""
    return datetime.utcnow().strftime("%Y%m%d%H%M%S") + str(hash(datetime.utcnow()))[-6:]


def create_payment_url(
    session: Session,
    tenant_id: str,
    invoice_id: str,
    amount: Decimal,
    order_info: str,
    ip_address: str,
    locale: str = "vn",
) -> dict:
    """
    Create VNPay payment URL.

    Args:
        session: Database session
        tenant_id: Tenant making payment
        invoice_id: Invoice being paid
        amount: Amount in VND
        order_info: Description of the payment
        ip_address: Client IP address
        locale: Language (vn/en)

    Returns:
        dict with payment_url and transaction info
    """
    # Create transaction record
    txn_ref = generate_txn_ref()
    transaction = PaymentTransaction(
        tenant_id=tenant_id,
        invoice_id=invoice_id,
        amount=amount,
        currency="VND",
        vnp_txn_ref=txn_ref,
        status=BillingPaymentStatus.PENDING.value,
    )
    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    # Build VNPay params
    vnp_params = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": VNPayConfig.TMN_CODE,
        "vnp_Amount": str(int(amount * 100)),  # VNPay expects amount * 100
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": txn_ref,
        "vnp_OrderInfo": order_info,
        "vnp_OrderType": "billpayment",
        "vnp_Locale": locale,
        "vnp_ReturnUrl": VNPayConfig.RETURN_URL,
        "vnp_IpAddr": ip_address,
        "vnp_CreateDate": datetime.utcnow().strftime("%Y%m%d%H%M%S"),
    }

    # Sort params and create query string
    sorted_params = sorted(vnp_params.items())
    query_string = urllib.parse.urlencode(sorted_params)

    # Generate secure hash
    hash_data = query_string
    secure_hash = hmac.new(
        VNPayConfig.HASH_SECRET.encode("utf-8"),
        hash_data.encode("utf-8"),
        hashlib.sha512
    ).hexdigest()

    # Build final URL
    payment_url = f"{VNPayConfig.PAYMENT_URL}?{query_string}&vnp_SecureHash={secure_hash}"

    return {
        "payment_url": payment_url,
        "transaction_id": str(transaction.id),
        "txn_ref": txn_ref,
    }


def verify_return_url(params: dict) -> bool:
    """
    Verify the secure hash from VNPay return URL.

    Args:
        params: Query parameters from return URL

    Returns:
        True if hash is valid
    """
    vnp_secure_hash = params.pop("vnp_SecureHash", "")
    params.pop("vnp_SecureHashType", None)

    # Sort and create hash data
    sorted_params = sorted(params.items())
    hash_data = urllib.parse.urlencode(sorted_params)

    # Calculate expected hash
    expected_hash = hmac.new(
        VNPayConfig.HASH_SECRET.encode("utf-8"),
        hash_data.encode("utf-8"),
        hashlib.sha512
    ).hexdigest()

    return expected_hash.lower() == vnp_secure_hash.lower()


def process_payment_return(
    session: Session,
    params: dict,
) -> dict:
    """
    Process VNPay return callback.

    Args:
        session: Database session
        params: Query parameters from VNPay

    Returns:
        dict with processing result
    """
    # Verify hash
    if not verify_return_url(params.copy()):
        return {"success": False, "message": "Invalid secure hash"}

    txn_ref = params.get("vnp_TxnRef")
    response_code = params.get("vnp_ResponseCode")
    transaction_no = params.get("vnp_TransactionNo")
    bank_code = params.get("vnp_BankCode")
    card_type = params.get("vnp_CardType")
    amount = Decimal(params.get("vnp_Amount", "0")) / 100  # Convert back

    # Find transaction
    transaction = session.exec(
        select(PaymentTransaction).where(PaymentTransaction.vnp_txn_ref == txn_ref)
    ).first()

    if not transaction:
        return {"success": False, "message": "Transaction not found"}

    # Update transaction
    transaction.vnp_transaction_no = transaction_no
    transaction.vnp_bank_code = bank_code
    transaction.vnp_card_type = card_type
    transaction.response_json = str(params)

    if response_code == "00":
        # Payment successful
        transaction.status = BillingPaymentStatus.SUCCESS.value
        transaction.paid_at = datetime.utcnow()

        # Update invoice
        if transaction.invoice_id:
            invoice = session.get(BillingInvoice, transaction.invoice_id)
            if invoice:
                invoice.paid_amount = invoice.paid_amount + amount
                invoice.paid_at = datetime.utcnow()
                invoice.payment_method = "VNPAY"
                invoice.payment_reference = transaction_no

                if invoice.paid_amount >= invoice.total_amount:
                    invoice.status = InvoiceStatus.PAID.value

                    # Reactivate subscription if it was suspended
                    if invoice.subscription_id:
                        subscription = session.get(TenantSubscription, invoice.subscription_id)
                        if subscription and subscription.status == SubscriptionStatus.SUSPENDED.value:
                            subscription.status = SubscriptionStatus.ACTIVE.value
                            session.add(subscription)
                else:
                    invoice.status = InvoiceStatus.PARTIAL.value

                session.add(invoice)

        session.add(transaction)
        session.commit()

        return {
            "success": True,
            "message": "Payment successful",
            "transaction_id": str(transaction.id),
            "amount": amount,
        }
    else:
        # Payment failed
        transaction.status = BillingPaymentStatus.FAILED.value
        session.add(transaction)
        session.commit()

        return {
            "success": False,
            "message": f"Payment failed with code: {response_code}",
            "response_code": response_code,
        }


def process_ipn(
    session: Session,
    params: dict,
) -> dict:
    """
    Process VNPay IPN (Instant Payment Notification).

    Args:
        session: Database session
        params: IPN parameters

    Returns:
        dict with IPN response
    """
    # Verify hash
    if not verify_return_url(params.copy()):
        return {"RspCode": "97", "Message": "Invalid Checksum"}

    txn_ref = params.get("vnp_TxnRef")
    response_code = params.get("vnp_ResponseCode")
    amount = Decimal(params.get("vnp_Amount", "0")) / 100

    # Find transaction
    transaction = session.exec(
        select(PaymentTransaction).where(PaymentTransaction.vnp_txn_ref == txn_ref)
    ).first()

    if not transaction:
        return {"RspCode": "01", "Message": "Order not Found"}

    # Check amount
    if transaction.amount != amount:
        return {"RspCode": "04", "Message": "Invalid Amount"}

    # Check if already processed
    if transaction.status != BillingPaymentStatus.PENDING.value:
        return {"RspCode": "02", "Message": "Order already confirmed"}

    if response_code == "00":
        # Update via process_payment_return
        result = process_payment_return(session, params)
        if result["success"]:
            return {"RspCode": "00", "Message": "Confirm Success"}

    return {"RspCode": "00", "Message": "Confirm Success"}


def get_transaction_status(
    session: Session,
    transaction_id: str,
) -> Optional[PaymentTransaction]:
    """
    Get transaction status.

    Args:
        session: Database session
        transaction_id: Transaction ID

    Returns:
        PaymentTransaction or None
    """
    return session.get(PaymentTransaction, transaction_id)


def refund_transaction(
    session: Session,
    transaction_id: str,
    amount: Optional[Decimal] = None,
    reason: str = "Customer request",
) -> dict:
    """
    Request refund for a transaction.
    Note: This requires VNPay API integration for actual refund.

    Args:
        session: Database session
        transaction_id: Original transaction ID
        amount: Refund amount (default: full amount)
        reason: Refund reason

    Returns:
        dict with refund result
    """
    transaction = session.get(PaymentTransaction, transaction_id)
    if not transaction:
        return {"success": False, "message": "Transaction not found"}

    if transaction.status != BillingPaymentStatus.SUCCESS.value:
        return {"success": False, "message": "Can only refund successful transactions"}

    refund_amount = amount or transaction.amount

    # TODO: Implement actual VNPay refund API call
    # For now, just mark as refunded
    transaction.status = BillingPaymentStatus.REFUNDED.value
    transaction.refund_amount = refund_amount
    transaction.refund_reason = reason
    transaction.refund_at = datetime.utcnow()
    session.add(transaction)
    session.commit()

    return {
        "success": True,
        "message": "Refund processed",
        "refund_amount": refund_amount,
    }
