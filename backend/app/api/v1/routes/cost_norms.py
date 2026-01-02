from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.models import CostNorm
from app.schemas.cost_norms import CostNormCreate, CostNormRead

router = APIRouter(prefix="/cost-norms", tags=["cost_norms"])

def tenant() -> str:
    return "TENANT_DEMO"

@router.post("", response_model=CostNormRead)
def create_cost_norm(payload: CostNormCreate, session: Session = Depends(get_session)):
    item = CostNorm(
        tenant_id=tenant(),
        type=payload.type.upper(),
        apply_level=payload.apply_level.upper(),
        vehicle_id=payload.vehicle_id,
        route_code=payload.route_code,
        unit_cost=float(payload.unit_cost),
        unit=payload.unit.upper(),
        note=payload.note,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@router.get("", response_model=list[CostNormRead])
def list_cost_norms(
    type: str | None = None,
    apply_level: str | None = None,
    vehicle_id: str | None = None,
    route_code: str | None = None,
    session: Session = Depends(get_session),
):
    q = select(CostNorm).where(CostNorm.tenant_id == tenant())

    if type:
        q = q.where(CostNorm.type == type.upper())
    if apply_level:
        q = q.where(CostNorm.apply_level == apply_level.upper())
    if vehicle_id:
        q = q.where(CostNorm.vehicle_id == vehicle_id)
    if route_code:
        q = q.where(CostNorm.route_code == route_code)

    return session.exec(q.order_by(CostNorm.created_at.desc())).all()

@router.get("/{norm_id}", response_model=CostNormRead)
def get_cost_norm(norm_id: str, session: Session = Depends(get_session)):
    item = session.get(CostNorm, norm_id)
    if not item or item.tenant_id != tenant():
        raise HTTPException(404, "Not found")
    return item

@router.delete("/{norm_id}")
def delete_cost_norm(norm_id: str, session: Session = Depends(get_session)):
    item = session.get(CostNorm, norm_id)
    if not item or item.tenant_id != tenant():
        raise HTTPException(404, "Not found")
    session.delete(item)
    session.commit()
    return {"ok": True}
