"""
AI Tool Definitions for 9log Support Bot

These tools allow the AI to perform actions on behalf of users.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlmodel import Session, select
from uuid import uuid4

# Tool definitions for Claude
TOOL_DEFINITIONS = [
    {
        "name": "check_order_status",
        "description": "Kiểm tra trạng thái đơn hàng theo mã đơn. Dùng khi user hỏi về đơn hàng cụ thể.",
        "input_schema": {
            "type": "object",
            "properties": {
                "order_code": {
                    "type": "string",
                    "description": "Mã đơn hàng (VD: ORD-20240105-001)"
                }
            },
            "required": ["order_code"]
        }
    },
    {
        "name": "check_billing_status",
        "description": "Kiểm tra trạng thái thanh toán/hóa đơn của tenant. Dùng khi user hỏi về billing, invoice.",
        "input_schema": {
            "type": "object",
            "properties": {
                "tenant_id": {
                    "type": "string",
                    "description": "ID của tenant (công ty)"
                }
            },
            "required": ["tenant_id"]
        }
    },
    {
        "name": "create_support_ticket",
        "description": "Tạo ticket hỗ trợ khi vấn đề phức tạp cần human review. Dùng khi AI không thể giải quyết.",
        "input_schema": {
            "type": "object",
            "properties": {
                "subject": {
                    "type": "string",
                    "description": "Tiêu đề ticket"
                },
                "description": {
                    "type": "string",
                    "description": "Mô tả chi tiết vấn đề"
                },
                "priority": {
                    "type": "string",
                    "enum": ["LOW", "MEDIUM", "HIGH", "URGENT"],
                    "description": "Độ ưu tiên"
                },
                "user_email": {
                    "type": "string",
                    "description": "Email người dùng để phản hồi"
                }
            },
            "required": ["subject", "description", "priority"]
        }
    },
    {
        "name": "request_password_reset",
        "description": "Yêu cầu reset mật khẩu. Gửi email reset password cho user.",
        "input_schema": {
            "type": "object",
            "properties": {
                "email": {
                    "type": "string",
                    "description": "Email đăng ký tài khoản"
                }
            },
            "required": ["email"]
        }
    },
    {
        "name": "get_pricing_info",
        "description": "Lấy thông tin bảng giá, gói dịch vụ. Dùng khi user hỏi về giá.",
        "input_schema": {
            "type": "object",
            "properties": {
                "plan_type": {
                    "type": "string",
                    "enum": ["FREE", "STARTER", "PRO", "ENTERPRISE", "ALL"],
                    "description": "Loại gói muốn xem, hoặc ALL để xem tất cả"
                }
            },
            "required": ["plan_type"]
        }
    },
    {
        "name": "escalate_to_human",
        "description": "Chuyển cuộc hội thoại cho nhân viên support. Dùng khi user yêu cầu nói chuyện với người thật.",
        "input_schema": {
            "type": "object",
            "properties": {
                "reason": {
                    "type": "string",
                    "description": "Lý do cần escalate"
                },
                "conversation_summary": {
                    "type": "string",
                    "description": "Tóm tắt cuộc hội thoại"
                }
            },
            "required": ["reason", "conversation_summary"]
        }
    }
]


class ToolExecutor:
    """Execute AI tools with database access"""

    def __init__(self, session: Optional[Session] = None):
        self.session = session

    async def execute(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool and return result"""
        handlers = {
            "check_order_status": self._check_order_status,
            "check_billing_status": self._check_billing_status,
            "create_support_ticket": self._create_support_ticket,
            "request_password_reset": self._request_password_reset,
            "get_pricing_info": self._get_pricing_info,
            "escalate_to_human": self._escalate_to_human,
        }

        handler = handlers.get(tool_name)
        if not handler:
            return {"error": f"Unknown tool: {tool_name}"}

        try:
            return await handler(tool_input)
        except Exception as e:
            return {"error": str(e)}

    async def _check_order_status(self, input: Dict) -> Dict:
        """Check order status by code"""
        order_code = input.get("order_code", "")

        if not self.session:
            return {"error": "Database session not available"}

        from app.models import Order
        order = self.session.exec(
            select(Order).where(Order.order_code == order_code)
        ).first()

        if not order:
            return {
                "found": False,
                "message": f"Không tìm thấy đơn hàng với mã {order_code}"
            }

        return {
            "found": True,
            "order_code": order.order_code,
            "status": order.status,
            "status_display": self._translate_status(order.status),
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "pickup": order.pickup_text,
            "delivery": order.delivery_text,
            "container": order.container_code,
            "equipment": order.equipment
        }

    def _translate_status(self, status: str) -> str:
        """Translate status to Vietnamese"""
        translations = {
            "NEW": "Mới tạo",
            "ASSIGNED": "Đã phân tài xế",
            "IN_TRANSIT": "Đang vận chuyển",
            "DELIVERED": "Đã giao hàng",
            "COMPLETED": "Hoàn thành",
            "CANCELLED": "Đã hủy"
        }
        return translations.get(status, status)

    async def _check_billing_status(self, input: Dict) -> Dict:
        """Check billing status for tenant"""
        tenant_id = input.get("tenant_id", "")

        if not self.session:
            return {"error": "Database session not available"}

        from app.models.billing import TenantSubscription, BillingInvoice, BillingPlan

        # Get subscription
        subscription = self.session.exec(
            select(TenantSubscription).where(TenantSubscription.tenant_id == tenant_id)
        ).first()

        if not subscription:
            return {"message": "Chưa có thông tin subscription"}

        # Get plan info
        plan = self.session.exec(
            select(BillingPlan).where(BillingPlan.id == subscription.plan_id)
        ).first()
        plan_code = plan.code if plan else "UNKNOWN"

        # Get pending invoices
        pending_invoices = self.session.exec(
            select(BillingInvoice).where(
                BillingInvoice.tenant_id == tenant_id,
                BillingInvoice.status.in_(["DRAFT", "SENT", "OVERDUE"])
            )
        ).all()

        return {
            "plan": plan_code,
            "status": subscription.status,
            "credits_used": float(subscription.credits_used),
            "credits_limit": subscription.credits_limit,
            "period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
            "pending_invoices": len(pending_invoices),
            "total_pending_amount": float(sum(inv.total_amount or 0 for inv in pending_invoices))
        }

    async def _create_support_ticket(self, input: Dict) -> Dict:
        """Create support ticket"""
        ticket_id = str(uuid4())[:8].upper()

        # In production, save to database and notify team
        # For now, just return success
        return {
            "success": True,
            "ticket_id": f"TKT-{ticket_id}",
            "message": f"Đã tạo ticket hỗ trợ #{ticket_id}. Team support sẽ liên hệ trong vòng 2 giờ.",
            "subject": input.get("subject"),
            "priority": input.get("priority")
        }

    async def _request_password_reset(self, input: Dict) -> Dict:
        """Request password reset"""
        email = input.get("email", "")

        if not self.session:
            return {"error": "Database session not available"}

        from app.models import User
        user = self.session.exec(
            select(User).where(User.email == email)
        ).first()

        if not user:
            # Don't reveal if email exists
            return {
                "success": True,
                "message": "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link reset password trong vài phút."
            }

        # In production, send actual reset email
        return {
            "success": True,
            "message": "Đã gửi email reset password. Vui lòng kiểm tra hộp thư (cả thư mục spam)."
        }

    async def _get_pricing_info(self, input: Dict) -> Dict:
        """Get pricing information"""
        plan_type = input.get("plan_type", "ALL")

        pricing = {
            "FREE": {
                "name": "FREE",
                "price": "0 VND/tháng",
                "features": [
                    "100 đơn hàng/tháng",
                    "3 users",
                    "Module TMS cơ bản",
                    "Support qua email"
                ],
                "limitations": "Dùng thử 14 ngày, sau đó giới hạn tính năng"
            },
            "STARTER": {
                "name": "STARTER",
                "price": "990,000 VND/tháng",
                "features": [
                    "500 đơn hàng/tháng",
                    "10 users",
                    "TMS + HRM cơ bản",
                    "Báo cáo cơ bản",
                    "Support qua chat"
                ]
            },
            "PRO": {
                "name": "PRO",
                "price": "2,990,000 VND/tháng",
                "features": [
                    "2000 đơn hàng/tháng",
                    "Không giới hạn users",
                    "Tất cả modules",
                    "Báo cáo nâng cao",
                    "API access",
                    "Support ưu tiên"
                ]
            },
            "ENTERPRISE": {
                "name": "ENTERPRISE",
                "price": "Liên hệ",
                "features": [
                    "Không giới hạn",
                    "Custom modules",
                    "Dedicated support",
                    "On-premise option",
                    "SLA 99.9%",
                    "Training team"
                ]
            }
        }

        if plan_type == "ALL":
            return {"plans": pricing}
        elif plan_type in pricing:
            return {"plan": pricing[plan_type]}
        else:
            return {"error": f"Unknown plan type: {plan_type}"}

    async def _escalate_to_human(self, input: Dict) -> Dict:
        """Escalate to human support"""
        reason = input.get("reason", "")
        summary = input.get("conversation_summary", "")

        # In production, notify via Telegram/Slack
        return {
            "success": True,
            "message": "Đã chuyển yêu cầu cho nhân viên hỗ trợ. Bạn sẽ được liên hệ trong vòng 30 phút (giờ hành chính) hoặc 2 giờ (ngoài giờ).",
            "estimated_response": "30 phút - 2 giờ",
            "reason": reason
        }
