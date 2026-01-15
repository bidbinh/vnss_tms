"""
OMS Status Logger Service
"""
from datetime import datetime
from typing import Optional, Dict
from sqlmodel import Session

from app.models.oms import OMSStatusLog


def log_status_change(
    session: Session,
    entity_type: str,
    entity_id: str,
    from_status: Optional[str],
    to_status: str,
    change_reason: Optional[str],
    tenant_id: str,
    changed_by_id: Optional[str] = None,
    changed_by_role: Optional[str] = None,
    metadata: Optional[Dict] = None
) -> OMSStatusLog:
    """
    Log status change for order or shipment
    """
    log = OMSStatusLog(
        tenant_id=tenant_id,
        entity_type=entity_type,
        entity_id=entity_id,
        from_status=from_status,
        to_status=to_status,
        change_reason=change_reason,
        changed_by_id=changed_by_id,
        changed_by_role=changed_by_role,
        changed_at=datetime.utcnow(),
        metadata=metadata or {}
    )

    session.add(log)
    return log
