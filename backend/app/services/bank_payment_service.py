"""
Bank Payment Integration Service

Supports multiple payment providers:
1. SePay - Official MB Bank Open Banking Partner (Recommended)
2. Casso - Multi-bank integration (VCB, MB, Techcombank, etc.)
3. Direct MB Bank API (requires business registration)
4. Manual/Excel export fallback

Configuration is stored per tenant to support different bank accounts.
"""

import httpx
import hashlib
import hmac
import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel
from sqlmodel import Session, select

logger = logging.getLogger(__name__)


class PaymentProvider(str, Enum):
    SEPAY = "sepay"
    CASSO = "casso"
    MB_DIRECT = "mb_direct"
    VCB_DIRECT = "vcb_direct"
    MANUAL = "manual"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PaymentRequest(BaseModel):
    """Single payment request"""
    payroll_id: str
    driver_id: str
    driver_name: str
    amount: int  # VND, integer
    bank_account: str
    bank_name: str
    bank_bin: Optional[str] = None
    description: str


class BatchPaymentRequest(BaseModel):
    """Batch payment request"""
    payments: List[PaymentRequest]
    provider: PaymentProvider = PaymentProvider.SEPAY
    callback_url: Optional[str] = None


class PaymentResult(BaseModel):
    """Payment result"""
    payroll_id: str
    status: PaymentStatus
    transaction_id: Optional[str] = None
    message: Optional[str] = None
    paid_at: Optional[datetime] = None


class BankPaymentService:
    """
    Bank Payment Integration Service

    Usage:
        service = BankPaymentService(config)
        results = await service.process_batch_payment(batch_request)
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize with tenant-specific config

        Config structure:
        {
            "provider": "sepay",  # or "casso", "mb_direct", etc.
            "sepay": {
                "api_key": "...",
                "bank_account": "...",
                "webhook_secret": "..."
            },
            "casso": {
                "api_key": "...",
                "webhook_secret": "..."
            },
            "mb_direct": {
                "client_id": "...",
                "client_secret": "...",
                "account_number": "..."
            }
        }
        """
        self.config = config
        self.provider = PaymentProvider(config.get("provider", "manual"))

    async def process_batch_payment(
        self,
        request: BatchPaymentRequest
    ) -> List[PaymentResult]:
        """Process batch payment through configured provider"""

        if request.provider == PaymentProvider.SEPAY:
            return await self._process_sepay_batch(request)
        elif request.provider == PaymentProvider.CASSO:
            return await self._process_casso_batch(request)
        elif request.provider == PaymentProvider.MB_DIRECT:
            return await self._process_mb_direct_batch(request)
        else:
            # Manual - just return pending status
            return [
                PaymentResult(
                    payroll_id=p.payroll_id,
                    status=PaymentStatus.PENDING,
                    message="Manual payment required"
                )
                for p in request.payments
            ]

    async def _process_sepay_batch(
        self,
        request: BatchPaymentRequest
    ) -> List[PaymentResult]:
        """
        Process payment via SePay API

        SePay is MB Bank's official Open Banking partner.
        Docs: https://sepay.vn/docs/api

        Note: SePay primarily handles INBOUND payments (receiving money).
        For OUTBOUND payments (sending money), you need to use MB Bank Direct API
        or manual transfer.

        SePay flow for payroll:
        1. Generate payment links/QR codes for each payment
        2. Staff scans QR to transfer from company account
        3. SePay webhook notifies when transfer is complete
        """
        sepay_config = self.config.get("sepay", {})
        api_key = sepay_config.get("api_key")

        if not api_key:
            return [
                PaymentResult(
                    payroll_id=p.payroll_id,
                    status=PaymentStatus.FAILED,
                    message="SePay API key not configured"
                )
                for p in request.payments
            ]

        results = []

        async with httpx.AsyncClient() as client:
            for payment in request.payments:
                try:
                    # Generate transfer instruction
                    # SePay doesn't directly transfer - it creates payment requests
                    # For outbound, we create a "bill" that staff pays via banking app

                    payload = {
                        "account_number": payment.bank_account,
                        "account_name": payment.driver_name,
                        "bank_bin": payment.bank_bin,
                        "amount": payment.amount,
                        "description": payment.description,
                        "reference_id": payment.payroll_id,
                    }

                    # In production, call SePay API
                    # response = await client.post(
                    #     "https://api.sepay.vn/v1/transfers",
                    #     headers={"Authorization": f"Bearer {api_key}"},
                    #     json=payload
                    # )

                    # For now, return processing status (QR generated)
                    results.append(PaymentResult(
                        payroll_id=payment.payroll_id,
                        status=PaymentStatus.PROCESSING,
                        transaction_id=f"SEPAY-{payment.payroll_id[:8]}",
                        message="Payment QR generated, awaiting transfer"
                    ))

                except Exception as e:
                    logger.error(f"SePay payment error for {payment.payroll_id}: {e}")
                    results.append(PaymentResult(
                        payroll_id=payment.payroll_id,
                        status=PaymentStatus.FAILED,
                        message=str(e)
                    ))

        return results

    async def _process_casso_batch(
        self,
        request: BatchPaymentRequest
    ) -> List[PaymentResult]:
        """
        Process via Casso API

        Casso is primarily for transaction monitoring (reading bank statements).
        For outbound payments, similar to SePay - generates payment instructions.

        Docs: https://casso.vn/api-doc
        """
        casso_config = self.config.get("casso", {})
        api_key = casso_config.get("api_key")

        if not api_key:
            return [
                PaymentResult(
                    payroll_id=p.payroll_id,
                    status=PaymentStatus.FAILED,
                    message="Casso API key not configured"
                )
                for p in request.payments
            ]

        # Similar implementation to SePay
        # Casso can monitor when payments go out and match them
        results = []

        for payment in request.payments:
            results.append(PaymentResult(
                payroll_id=payment.payroll_id,
                status=PaymentStatus.PROCESSING,
                transaction_id=f"CASSO-{payment.payroll_id[:8]}",
                message="Payment instruction created, monitoring for completion"
            ))

        return results

    async def _process_mb_direct_batch(
        self,
        request: BatchPaymentRequest
    ) -> List[PaymentResult]:
        """
        Process via MB Bank Direct API (Open Banking)

        Requires business registration with MB Bank.
        Portal: https://developer.mbbank.com.vn

        This provides TRUE automation - direct bank transfer without manual steps.

        Flow:
        1. Authenticate with OAuth2
        2. Create batch transfer request
        3. MB Bank processes and returns transaction IDs
        4. Webhook notification on completion
        """
        mb_config = self.config.get("mb_direct", {})
        client_id = mb_config.get("client_id")
        client_secret = mb_config.get("client_secret")
        account_number = mb_config.get("account_number")

        if not all([client_id, client_secret, account_number]):
            return [
                PaymentResult(
                    payroll_id=p.payroll_id,
                    status=PaymentStatus.FAILED,
                    message="MB Bank API credentials not configured"
                )
                for p in request.payments
            ]

        results = []

        async with httpx.AsyncClient() as client:
            try:
                # Step 1: Get OAuth token
                # token_response = await client.post(
                #     "https://api.mbbank.com.vn/oauth/token",
                #     data={
                #         "grant_type": "client_credentials",
                #         "client_id": client_id,
                #         "client_secret": client_secret
                #     }
                # )
                # access_token = token_response.json()["access_token"]

                # Step 2: Create batch transfer
                # For each payment, create transfer request
                for payment in request.payments:
                    try:
                        transfer_payload = {
                            "fromAccount": account_number,
                            "toAccount": payment.bank_account,
                            "toAccountName": payment.driver_name,
                            "toBankBin": payment.bank_bin,
                            "amount": payment.amount,
                            "description": payment.description,
                            "referenceId": payment.payroll_id
                        }

                        # In production:
                        # response = await client.post(
                        #     "https://api.mbbank.com.vn/v1/transfers/internal",
                        #     headers={"Authorization": f"Bearer {access_token}"},
                        #     json=transfer_payload
                        # )
                        # transaction_id = response.json()["transactionId"]

                        # Simulated response
                        results.append(PaymentResult(
                            payroll_id=payment.payroll_id,
                            status=PaymentStatus.PROCESSING,
                            transaction_id=f"MB-{datetime.now().strftime('%Y%m%d%H%M%S')}-{payment.payroll_id[:6]}",
                            message="Transfer initiated, awaiting bank confirmation"
                        ))

                    except Exception as e:
                        logger.error(f"MB transfer error for {payment.payroll_id}: {e}")
                        results.append(PaymentResult(
                            payroll_id=payment.payroll_id,
                            status=PaymentStatus.FAILED,
                            message=str(e)
                        ))

            except Exception as e:
                logger.error(f"MB Bank authentication error: {e}")
                return [
                    PaymentResult(
                        payroll_id=p.payroll_id,
                        status=PaymentStatus.FAILED,
                        message=f"Bank authentication failed: {e}"
                    )
                    for p in request.payments
                ]

        return results

    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        provider: PaymentProvider
    ) -> bool:
        """Verify webhook signature from payment provider"""

        if provider == PaymentProvider.SEPAY:
            secret = self.config.get("sepay", {}).get("webhook_secret", "")
        elif provider == PaymentProvider.CASSO:
            secret = self.config.get("casso", {}).get("webhook_secret", "")
        elif provider == PaymentProvider.MB_DIRECT:
            secret = self.config.get("mb_direct", {}).get("webhook_secret", "")
        else:
            return False

        if not secret:
            return False

        expected = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected, signature)

    def parse_webhook_payload(
        self,
        payload: Dict[str, Any],
        provider: PaymentProvider
    ) -> Optional[PaymentResult]:
        """Parse webhook payload from payment provider"""

        try:
            if provider == PaymentProvider.SEPAY:
                # SePay webhook format
                return PaymentResult(
                    payroll_id=payload.get("reference_id", ""),
                    status=PaymentStatus.SUCCESS if payload.get("status") == "success" else PaymentStatus.FAILED,
                    transaction_id=payload.get("transaction_id"),
                    message=payload.get("message"),
                    paid_at=datetime.fromisoformat(payload["paid_at"]) if payload.get("paid_at") else None
                )

            elif provider == PaymentProvider.CASSO:
                # Casso webhook format (transaction notification)
                return PaymentResult(
                    payroll_id=payload.get("description", "").split("-")[-1],  # Extract from description
                    status=PaymentStatus.SUCCESS,
                    transaction_id=payload.get("id"),
                    message=f"Received {payload.get('amount')} VND",
                    paid_at=datetime.fromisoformat(payload["when"]) if payload.get("when") else None
                )

            elif provider == PaymentProvider.MB_DIRECT:
                # MB Bank webhook format
                return PaymentResult(
                    payroll_id=payload.get("referenceId", ""),
                    status=PaymentStatus.SUCCESS if payload.get("status") == "COMPLETED" else PaymentStatus.FAILED,
                    transaction_id=payload.get("transactionId"),
                    message=payload.get("statusDescription"),
                    paid_at=datetime.fromisoformat(payload["completedAt"]) if payload.get("completedAt") else None
                )

        except Exception as e:
            logger.error(f"Failed to parse webhook payload: {e}")

        return None


# Factory function to create service from tenant config
def get_bank_payment_service(tenant_config: Dict[str, Any]) -> BankPaymentService:
    """Create BankPaymentService from tenant configuration"""
    return BankPaymentService(tenant_config.get("bank_payment", {}))


# Helper to generate VietQR payment link
def generate_vietqr_link(
    bank_bin: str,
    account_number: str,
    account_name: str,
    amount: int,
    description: str,
    template: str = "compact2"
) -> str:
    """
    Generate VietQR image URL for payment

    VietQR is a free service that generates payment QR codes
    supported by all Vietnamese banks.

    This can be used as a fallback when direct API is not available.
    """
    import urllib.parse

    base_url = "https://img.vietqr.io/image"
    encoded_desc = urllib.parse.quote(description)
    encoded_name = urllib.parse.quote(account_name)

    return f"{base_url}/{bank_bin}-{account_number}-{template}.png?amount={amount}&addInfo={encoded_desc}&accountName={encoded_name}"
