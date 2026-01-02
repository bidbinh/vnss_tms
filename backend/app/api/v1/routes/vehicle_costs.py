"""
Vehicle Operating Costs API
Quản lý chi phí vận hành xe và tính P&L
"""
from typing import Optional, List
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from calendar import monthrange
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, and_, or_
from pydantic import BaseModel

from app.db.session import get_session
from app.models import (
    Vehicle, User, Driver,
    VehicleOperatingCost, VehicleCostAllocation,
    CostCategory, CostType, CostAllocationMethod,
    COST_CATEGORY_CONFIGS,
    # For P&L calculation
    Trip, TripFinanceItem, FuelLog, EmptyReturn,
    MaintenanceRecord, Order,
)
from app.models.order import OrderStatus
from app.core.security import get_current_user


router = APIRouter(prefix="/vehicle-costs", tags=["Vehicle Operating Costs"])


# ============================================================================
# SCHEMAS
# ============================================================================

class CostCreateRequest(BaseModel):
    vehicle_id: Optional[str] = None
    category: str  # CostCategory enum value
    name: str
    description: Optional[str] = None
    amount: float
    currency: str = "VND"
    effective_date: date
    expiry_date: Optional[date] = None
    allocation_months: Optional[int] = None
    cost_month: Optional[int] = None
    cost_year: Optional[int] = None
    reference_no: Optional[str] = None
    vendor: Optional[str] = None
    payment_status: str = "unpaid"
    paid_amount: float = 0
    paid_date: Optional[date] = None


class CostUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    effective_date: Optional[date] = None
    expiry_date: Optional[date] = None
    allocation_months: Optional[int] = None
    cost_month: Optional[int] = None
    cost_year: Optional[int] = None
    reference_no: Optional[str] = None
    vendor: Optional[str] = None
    payment_status: Optional[str] = None
    paid_amount: Optional[float] = None
    paid_date: Optional[date] = None
    is_active: Optional[bool] = None


class CostResponse(BaseModel):
    id: str
    vehicle_id: Optional[str]
    vehicle_plate: Optional[str] = None
    category: str
    category_name: str
    cost_type: str
    name: str
    description: Optional[str]
    amount: float
    currency: str
    effective_date: date
    expiry_date: Optional[date]
    allocation_method: str
    allocation_months: Optional[int]
    monthly_amount: float  # Số tiền phân bổ/tháng
    cost_month: Optional[int]
    cost_year: Optional[int]
    reference_no: Optional[str]
    vendor: Optional[str]
    payment_status: str
    paid_amount: float
    paid_date: Optional[date]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryConfigResponse(BaseModel):
    value: str
    name: str
    cost_type: str
    allocation_method: str
    default_months: int
    description: str
    requires_vehicle: bool


class MonthlyCostSummary(BaseModel):
    year: int
    month: int
    vehicle_id: Optional[str]
    vehicle_plate: Optional[str]
    category: str
    category_name: str
    total_amount: float


class VehiclePLReport(BaseModel):
    """Báo cáo P&L theo xe"""
    vehicle_id: str
    vehicle_plate: str
    year: Optional[int] = None
    month: Optional[int] = None

    # Doanh thu
    total_revenue: float  # Tổng doanh thu từ trips
    freight_revenue: float  # Cước vận chuyển
    other_revenue: float  # Thu nhập khác

    # Chi phí trực tiếp
    fuel_cost: float  # Chi phí xăng dầu
    driver_salary: float  # Lương tài xế
    toll_cost: float  # Phí cầu đường
    empty_return_cost: float  # Chi phí hạ rỗng
    maintenance_cost: float  # Chi phí bảo dưỡng
    other_direct_cost: float  # Chi phí trực tiếp khác

    # Chi phí gián tiếp (phân bổ)
    depreciation: float  # Khấu hao
    insurance: float  # Bảo hiểm
    registration: float  # Đăng kiểm
    road_tax: float  # Thuế đường bộ
    gps_fee: float  # Phí GPS
    loan_interest: float  # Lãi vay
    other_indirect_cost: float  # Chi phí gián tiếp khác

    # Tổng kết
    total_direct_cost: float
    total_indirect_cost: float
    total_cost: float
    gross_profit: float  # Lợi nhuận gộp
    net_profit: float  # Lợi nhuận ròng
    profit_margin: float  # Tỷ suất lợi nhuận (%)

    # Thống kê
    trip_count: int
    total_km: float
    revenue_per_km: float
    cost_per_km: float


class RoutePLReport(BaseModel):
    """Báo cáo P&L theo tuyến đường"""
    route_name: str
    route_code: str
    year: Optional[int] = None
    month: Optional[int] = None

    # Thống kê
    trip_count: int
    total_km: float
    avg_km: float

    # Doanh thu
    total_revenue: float
    avg_revenue_per_trip: float

    # Chi phí
    total_cost: float
    avg_cost_per_trip: float

    # Lợi nhuận
    total_profit: float
    avg_profit_per_trip: float
    profit_margin: float

    # Chi tiết chi phí trung bình
    avg_fuel_cost: float
    avg_toll_cost: float
    avg_other_cost: float

    # So sánh với giá niêm yết
    listed_rate: Optional[float]  # Giá niêm yết
    rate_variance: Optional[float]  # Chênh lệch %


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def calculate_monthly_amount(cost: VehicleOperatingCost) -> float:
    """Tính số tiền phân bổ hàng tháng cho chi phí định kỳ"""
    if cost.cost_type == CostType.VARIABLE.value:
        return cost.amount

    # RECURRING - tính số tháng phân bổ
    if cost.allocation_months:
        months = cost.allocation_months
    elif cost.expiry_date and cost.effective_date:
        delta = relativedelta(cost.expiry_date, cost.effective_date)
        months = delta.years * 12 + delta.months + 1  # +1 để bao gồm cả tháng cuối
    else:
        # Fallback to default from config
        config = COST_CATEGORY_CONFIGS.get(cost.category, {})
        months = config.get("default_months", 12)

    return cost.amount / max(months, 1)


def generate_cost_allocations(
    session: Session,
    cost: VehicleOperatingCost
) -> List[VehicleCostAllocation]:
    """Tạo các bản ghi phân bổ chi phí theo tháng"""
    allocations = []
    monthly_amount = calculate_monthly_amount(cost)

    if cost.cost_type == CostType.VARIABLE.value:
        # Variable cost - chỉ tạo 1 allocation cho tháng cụ thể
        if cost.cost_month and cost.cost_year:
            allocation = VehicleCostAllocation(
                tenant_id=cost.tenant_id,
                cost_id=cost.id,
                vehicle_id=cost.vehicle_id,
                year=cost.cost_year,
                month=cost.cost_month,
                allocated_amount=cost.amount,
                category=cost.category,
            )
            allocations.append(allocation)
    else:
        # Recurring cost - tạo allocations cho từng tháng trong khoảng thời gian
        start_date = cost.effective_date

        if cost.expiry_date:
            end_date = cost.expiry_date
        elif cost.allocation_months:
            end_date = start_date + relativedelta(months=cost.allocation_months - 1)
        else:
            config = COST_CATEGORY_CONFIGS.get(cost.category, {})
            default_months = config.get("default_months", 12)
            end_date = start_date + relativedelta(months=default_months - 1)

        current = date(start_date.year, start_date.month, 1)
        end = date(end_date.year, end_date.month, 1)

        while current <= end:
            allocation = VehicleCostAllocation(
                tenant_id=cost.tenant_id,
                cost_id=cost.id,
                vehicle_id=cost.vehicle_id,
                year=current.year,
                month=current.month,
                allocated_amount=monthly_amount,
                category=cost.category,
            )
            allocations.append(allocation)
            current = current + relativedelta(months=1)

    return allocations


# ============================================================================
# CATEGORY CONFIG ENDPOINTS
# ============================================================================

@router.get("/categories", response_model=List[CategoryConfigResponse])
def get_cost_categories():
    """Lấy danh sách các loại chi phí và cấu hình mặc định"""
    result = []
    for value, config in COST_CATEGORY_CONFIGS.items():
        result.append(CategoryConfigResponse(
            value=value,
            name=config["name"],
            cost_type=config["cost_type"],
            allocation_method=config["allocation_method"],
            default_months=config["default_months"],
            description=config["description"],
            requires_vehicle=config["requires_vehicle"],
        ))
    return result


# ============================================================================
# CRUD ENDPOINTS
# ============================================================================

@router.get("", response_model=List[CostResponse])
def list_costs(
    vehicle_id: Optional[str] = None,
    category: Optional[str] = None,
    cost_type: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    is_active: bool = True,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách chi phí vận hành"""
    tenant_id = str(current_user.tenant_id)

    query = select(VehicleOperatingCost).where(
        VehicleOperatingCost.tenant_id == tenant_id,
        VehicleOperatingCost.is_active == is_active,
    )

    if vehicle_id:
        query = query.where(VehicleOperatingCost.vehicle_id == vehicle_id)
    if category:
        query = query.where(VehicleOperatingCost.category == category)
    if cost_type:
        query = query.where(VehicleOperatingCost.cost_type == cost_type)
    # Lọc theo năm và/hoặc tháng nếu có
    if year and month:
        # Lọc theo tháng/năm cụ thể
        query = query.where(
            or_(
                # Variable costs trong tháng cụ thể
                and_(
                    VehicleOperatingCost.cost_type == CostType.VARIABLE.value,
                    VehicleOperatingCost.cost_year == year,
                    VehicleOperatingCost.cost_month == month,
                ),
                # Recurring costs còn hiệu lực trong tháng
                and_(
                    VehicleOperatingCost.cost_type == CostType.RECURRING.value,
                    VehicleOperatingCost.effective_date <= date(year, month, monthrange(year, month)[1]),
                    or_(
                        VehicleOperatingCost.expiry_date == None,
                        VehicleOperatingCost.expiry_date >= date(year, month, 1),
                    ),
                ),
            )
        )
    elif year:
        # Chỉ lọc theo năm
        query = query.where(
            or_(
                # Variable costs trong năm
                and_(
                    VehicleOperatingCost.cost_type == CostType.VARIABLE.value,
                    VehicleOperatingCost.cost_year == year,
                ),
                # Recurring costs có hiệu lực trong năm
                and_(
                    VehicleOperatingCost.cost_type == CostType.RECURRING.value,
                    VehicleOperatingCost.effective_date <= date(year, 12, 31),
                    or_(
                        VehicleOperatingCost.expiry_date == None,
                        VehicleOperatingCost.expiry_date >= date(year, 1, 1),
                    ),
                ),
            )
        )
    # Nếu không có year và month, trả về tất cả

    query = query.order_by(VehicleOperatingCost.created_at.desc())
    query = query.offset(skip).limit(limit)

    costs = session.exec(query).all()

    # Get vehicle plates
    vehicle_plates = {}
    vehicle_ids = [c.vehicle_id for c in costs if c.vehicle_id]
    if vehicle_ids:
        vehicles = session.exec(
            select(Vehicle).where(Vehicle.id.in_(vehicle_ids))
        ).all()
        vehicle_plates = {v.id: v.plate_no for v in vehicles}

    result = []
    for cost in costs:
        config = COST_CATEGORY_CONFIGS.get(cost.category, {})
        result.append(CostResponse(
            id=cost.id,
            vehicle_id=cost.vehicle_id,
            vehicle_plate=vehicle_plates.get(cost.vehicle_id),
            category=cost.category,
            category_name=config.get("name", cost.category),
            cost_type=cost.cost_type,
            name=cost.name,
            description=cost.description,
            amount=cost.amount,
            currency=cost.currency,
            effective_date=cost.effective_date,
            expiry_date=cost.expiry_date,
            allocation_method=cost.allocation_method,
            allocation_months=cost.allocation_months,
            monthly_amount=calculate_monthly_amount(cost),
            cost_month=cost.cost_month,
            cost_year=cost.cost_year,
            reference_no=cost.reference_no,
            vendor=cost.vendor,
            payment_status=cost.payment_status,
            paid_amount=cost.paid_amount,
            paid_date=cost.paid_date,
            is_active=cost.is_active,
            created_at=cost.created_at,
        ))

    return result


@router.post("", response_model=CostResponse)
def create_cost(
    data: CostCreateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Tạo chi phí mới"""
    tenant_id = str(current_user.tenant_id)

    # Validate category
    if data.category not in COST_CATEGORY_CONFIGS:
        raise HTTPException(400, f"Invalid category: {data.category}")

    config = COST_CATEGORY_CONFIGS[data.category]

    # Validate vehicle requirement
    if config["requires_vehicle"] and not data.vehicle_id:
        raise HTTPException(400, f"Category '{config['name']}' requires a vehicle")

    # Validate vehicle exists
    if data.vehicle_id:
        vehicle = session.get(Vehicle, data.vehicle_id)
        if not vehicle or str(vehicle.tenant_id) != tenant_id:
            raise HTTPException(404, "Vehicle not found")

    # Determine cost type from config
    cost_type = config["cost_type"]

    # For variable costs, require month/year
    if cost_type == CostType.VARIABLE.value:
        if not data.cost_month or not data.cost_year:
            # Default to effective_date month/year
            data.cost_month = data.effective_date.month
            data.cost_year = data.effective_date.year

    cost = VehicleOperatingCost(
        tenant_id=tenant_id,
        vehicle_id=data.vehicle_id,
        category=data.category,
        cost_type=cost_type,
        name=data.name,
        description=data.description,
        amount=data.amount,
        currency=data.currency,
        effective_date=data.effective_date,
        expiry_date=data.expiry_date,
        allocation_method=config["allocation_method"],
        allocation_months=data.allocation_months or config["default_months"],
        cost_month=data.cost_month,
        cost_year=data.cost_year,
        reference_no=data.reference_no,
        vendor=data.vendor,
        payment_status=data.payment_status,
        paid_amount=data.paid_amount,
        paid_date=data.paid_date,
    )

    session.add(cost)
    session.flush()  # Get the ID

    # Generate allocations
    allocations = generate_cost_allocations(session, cost)
    for alloc in allocations:
        session.add(alloc)

    session.commit()
    session.refresh(cost)

    # Get vehicle plate
    vehicle_plate = None
    if cost.vehicle_id:
        vehicle = session.get(Vehicle, cost.vehicle_id)
        vehicle_plate = vehicle.plate_no if vehicle else None

    return CostResponse(
        id=cost.id,
        vehicle_id=cost.vehicle_id,
        vehicle_plate=vehicle_plate,
        category=cost.category,
        category_name=config["name"],
        cost_type=cost.cost_type,
        name=cost.name,
        description=cost.description,
        amount=cost.amount,
        currency=cost.currency,
        effective_date=cost.effective_date,
        expiry_date=cost.expiry_date,
        allocation_method=cost.allocation_method,
        allocation_months=cost.allocation_months,
        monthly_amount=calculate_monthly_amount(cost),
        cost_month=cost.cost_month,
        cost_year=cost.cost_year,
        reference_no=cost.reference_no,
        vendor=cost.vendor,
        payment_status=cost.payment_status,
        paid_amount=cost.paid_amount,
        paid_date=cost.paid_date,
        is_active=cost.is_active,
        created_at=cost.created_at,
    )


@router.get("/{cost_id}", response_model=CostResponse)
def get_cost(
    cost_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Lấy chi tiết chi phí"""
    tenant_id = str(current_user.tenant_id)

    cost = session.get(VehicleOperatingCost, cost_id)
    if not cost or cost.tenant_id != tenant_id:
        raise HTTPException(404, "Cost not found")

    config = COST_CATEGORY_CONFIGS.get(cost.category, {})

    vehicle_plate = None
    if cost.vehicle_id:
        vehicle = session.get(Vehicle, cost.vehicle_id)
        vehicle_plate = vehicle.plate_no if vehicle else None

    return CostResponse(
        id=cost.id,
        vehicle_id=cost.vehicle_id,
        vehicle_plate=vehicle_plate,
        category=cost.category,
        category_name=config.get("name", cost.category),
        cost_type=cost.cost_type,
        name=cost.name,
        description=cost.description,
        amount=cost.amount,
        currency=cost.currency,
        effective_date=cost.effective_date,
        expiry_date=cost.expiry_date,
        allocation_method=cost.allocation_method,
        allocation_months=cost.allocation_months,
        monthly_amount=calculate_monthly_amount(cost),
        cost_month=cost.cost_month,
        cost_year=cost.cost_year,
        reference_no=cost.reference_no,
        vendor=cost.vendor,
        payment_status=cost.payment_status,
        paid_amount=cost.paid_amount,
        paid_date=cost.paid_date,
        is_active=cost.is_active,
        created_at=cost.created_at,
    )


@router.put("/{cost_id}", response_model=CostResponse)
def update_cost(
    cost_id: str,
    data: CostUpdateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật chi phí"""
    tenant_id = str(current_user.tenant_id)

    cost = session.get(VehicleOperatingCost, cost_id)
    if not cost or cost.tenant_id != tenant_id:
        raise HTTPException(404, "Cost not found")

    # Update fields
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(cost, key, value)

    cost.updated_at = datetime.utcnow()

    # If amount, allocation, or period changed, regenerate allocations
    needs_realloc = any(k in update_data for k in ['amount', 'allocation_months', 'expiry_date', 'effective_date', 'cost_month', 'cost_year'])
    if needs_realloc:
        # Delete old allocations
        session.exec(
            select(VehicleCostAllocation).where(
                VehicleCostAllocation.cost_id == cost_id
            )
        )
        old_allocs = session.exec(
            select(VehicleCostAllocation).where(VehicleCostAllocation.cost_id == cost_id)
        ).all()
        for alloc in old_allocs:
            session.delete(alloc)

        # Generate new allocations
        new_allocs = generate_cost_allocations(session, cost)
        for alloc in new_allocs:
            session.add(alloc)

    session.commit()
    session.refresh(cost)

    config = COST_CATEGORY_CONFIGS.get(cost.category, {})
    vehicle_plate = None
    if cost.vehicle_id:
        vehicle = session.get(Vehicle, cost.vehicle_id)
        vehicle_plate = vehicle.plate_no if vehicle else None

    return CostResponse(
        id=cost.id,
        vehicle_id=cost.vehicle_id,
        vehicle_plate=vehicle_plate,
        category=cost.category,
        category_name=config.get("name", cost.category),
        cost_type=cost.cost_type,
        name=cost.name,
        description=cost.description,
        amount=cost.amount,
        currency=cost.currency,
        effective_date=cost.effective_date,
        expiry_date=cost.expiry_date,
        allocation_method=cost.allocation_method,
        allocation_months=cost.allocation_months,
        monthly_amount=calculate_monthly_amount(cost),
        cost_month=cost.cost_month,
        cost_year=cost.cost_year,
        reference_no=cost.reference_no,
        vendor=cost.vendor,
        payment_status=cost.payment_status,
        paid_amount=cost.paid_amount,
        paid_date=cost.paid_date,
        is_active=cost.is_active,
        created_at=cost.created_at,
    )


@router.delete("/{cost_id}")
def delete_cost(
    cost_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Xóa chi phí (soft delete)"""
    tenant_id = str(current_user.tenant_id)

    cost = session.get(VehicleOperatingCost, cost_id)
    if not cost or cost.tenant_id != tenant_id:
        raise HTTPException(404, "Cost not found")

    cost.is_active = False
    cost.updated_at = datetime.utcnow()
    session.commit()

    return {"message": "Cost deleted", "id": cost_id}


# ============================================================================
# SUMMARY & REPORT ENDPOINTS
# ============================================================================

@router.get("/summary/monthly", response_model=List[MonthlyCostSummary])
def get_monthly_cost_summary(
    year: int,
    month: int,
    vehicle_id: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Lấy tổng hợp chi phí theo tháng, group by category"""
    tenant_id = str(current_user.tenant_id)

    query = select(
        VehicleCostAllocation.vehicle_id,
        VehicleCostAllocation.category,
        func.sum(VehicleCostAllocation.allocated_amount).label("total_amount"),
    ).where(
        VehicleCostAllocation.tenant_id == tenant_id,
        VehicleCostAllocation.year == year,
        VehicleCostAllocation.month == month,
    )

    if vehicle_id:
        query = query.where(VehicleCostAllocation.vehicle_id == vehicle_id)

    query = query.group_by(
        VehicleCostAllocation.vehicle_id,
        VehicleCostAllocation.category,
    )

    results = session.exec(query).all()

    # Get vehicle plates
    vehicle_ids = list(set([r[0] for r in results if r[0]]))
    vehicle_plates = {}
    if vehicle_ids:
        vehicles = session.exec(select(Vehicle).where(Vehicle.id.in_(vehicle_ids))).all()
        vehicle_plates = {v.id: v.plate_no for v in vehicles}

    summaries = []
    for vid, cat, total in results:
        config = COST_CATEGORY_CONFIGS.get(cat, {})
        summaries.append(MonthlyCostSummary(
            year=year,
            month=month,
            vehicle_id=vid,
            vehicle_plate=vehicle_plates.get(vid),
            category=cat,
            category_name=config.get("name", cat),
            total_amount=total or 0,
        ))

    return summaries


@router.get("/report/vehicle-pl", response_model=List[VehiclePLReport])
def get_vehicle_pl_report(
    year: Optional[int] = None,
    month: Optional[int] = None,
    vehicle_id: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Báo cáo P&L theo xe (chỉ tính cho đầu kéo TRACTOR)
    - Nếu không truyền year/month: lấy toàn bộ dữ liệu
    - Nếu chỉ truyền year: lấy cả năm đó
    - Nếu truyền cả year và month: lấy tháng cụ thể
    """
    tenant_id = str(current_user.tenant_id)

    # Get all vehicles for counting
    all_vehicles = session.exec(
        select(Vehicle).where(Vehicle.tenant_id == tenant_id)
    ).all()

    # Chỉ lấy đầu kéo (TRACTOR) để báo cáo P&L
    tractor_query = select(Vehicle).where(
        Vehicle.tenant_id == tenant_id,
        Vehicle.type == "TRACTOR",
    )
    if vehicle_id:
        tractor_query = tractor_query.where(Vehicle.id == vehicle_id)
    vehicles = session.exec(tractor_query).all()

    # Đếm số đầu kéo để chia chi phí chung
    total_tractors = len([v for v in all_vehicles if v.type == "TRACTOR"])

    # Lấy danh sách rơ mooc (TRAILER) để tính chi phí gộp
    trailers = [v for v in all_vehicles if v.type == "TRAILER"]
    trailer_ids = [t.id for t in trailers]

    # Xác định date range
    if year and month:
        start_date = date(year, month, 1)
        end_date = date(year, month, monthrange(year, month)[1])
    elif year:
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
    else:
        # Toàn thời gian - từ 2020 đến hiện tại
        start_date = date(2020, 1, 1)
        end_date = date.today()

    reports = []

    for vehicle in vehicles:
        # === DOANH THU ===
        # Cách 1: Lấy driver được gán cho xe này (Driver.vehicle_id = vehicle.id)
        assigned_drivers = session.exec(
            select(Driver).where(
                Driver.tenant_id == tenant_id,
                Driver.vehicle_id == vehicle.id,
            )
        ).all()
        assigned_driver_ids = [d.id for d in assigned_drivers]

        # Cách 2: Lấy driver từ Trip (nếu có)
        trips = session.exec(
            select(Trip).where(
                Trip.tenant_id == tenant_id,
                Trip.vehicle_id == vehicle.id,
                Trip.completed_at >= datetime.combine(start_date, datetime.min.time()),
                Trip.completed_at <= datetime.combine(end_date, datetime.max.time()),
            )
        ).all()

        trip_ids = [t.id for t in trips]
        trip_driver_ids = list(set(t.driver_id for t in trips if t.driver_id))

        # Combine cả 2 nguồn driver
        all_driver_ids = list(set(assigned_driver_ids + trip_driver_ids))

        # Doanh thu từ Order.freight_charge của các đơn DELIVERED
        freight_revenue = 0
        other_revenue = 0
        toll_cost = 0
        other_direct_cost = 0
        order_count = 0
        total_km = 0

        if all_driver_ids:
            # Lấy đơn hàng DELIVERED trong kỳ bởi các driver này
            delivered_orders = session.exec(
                select(Order).where(
                    Order.tenant_id == tenant_id,
                    Order.driver_id.in_(all_driver_ids),
                    Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED]),
                    Order.order_date >= start_date,
                    Order.order_date <= end_date,
                )
            ).all()

            for order in delivered_orders:
                freight_revenue += order.freight_charge or 0
                total_km += order.distance_km or 0
            order_count = len(delivered_orders)

        # Số chuyến = số đơn hàng DELIVERED (nếu không có Trip)
        trip_count = len(trips) if trips else order_count

        # Lấy km từ Trip nếu có, ngược lại từ Order
        if trips:
            total_km = sum(t.distance_km or 0 for t in trips)

        # Chi phí từ TripFinanceItem (nếu có)
        if trip_ids:
            finance_items = session.exec(
                select(TripFinanceItem).where(
                    TripFinanceItem.trip_id.in_(trip_ids)
                )
            ).all()

            for item in finance_items:
                if item.direction == "expense":
                    if item.item_type == "toll":
                        toll_cost += item.amount
                    elif item.item_type not in ["fuel", "salary"]:
                        other_direct_cost += item.amount

        total_revenue = freight_revenue + other_revenue

        # === CHI PHÍ TRỰC TIẾP ===
        # Fuel from fuel_logs
        fuel_cost = session.exec(
            select(func.sum(FuelLog.total_amount)).where(
                FuelLog.tenant_id == tenant_id,
                FuelLog.vehicle_id == vehicle.id,
                FuelLog.date >= start_date,
                FuelLog.date <= end_date,
            )
        ).one() or 0

        # Empty return costs - EmptyReturn links via Order, not directly to vehicle
        # For now, skip this calculation as it requires joining through Order->Trip->Vehicle
        empty_return_cost = 0  # TODO: Calculate via Order->Trip relationship

        # Maintenance costs
        maintenance_cost = session.exec(
            select(func.sum(MaintenanceRecord.total_cost)).where(
                MaintenanceRecord.tenant_id == tenant_id,
                MaintenanceRecord.vehicle_id == vehicle.id,
                MaintenanceRecord.service_date >= start_date,
                MaintenanceRecord.service_date <= end_date,
            )
        ).one() or 0

        # Driver salary (simplified - would need more complex calculation in real scenario)
        driver_salary = 0  # TODO: Calculate from driver salary settings

        total_direct_cost = fuel_cost + driver_salary + toll_cost + empty_return_cost + maintenance_cost + other_direct_cost

        # === CHI PHÍ GIÁN TIẾP (từ allocations) ===
        # Build date filter for allocations
        def build_alloc_query(base_query):
            if year and month:
                return base_query.where(
                    VehicleCostAllocation.year == year,
                    VehicleCostAllocation.month == month,
                )
            elif year:
                return base_query.where(VehicleCostAllocation.year == year)
            else:
                # Toàn thời gian - không filter theo year/month
                return base_query

        # Chi phí gán cho đầu kéo cụ thể
        alloc_query = select(VehicleCostAllocation).where(
            VehicleCostAllocation.tenant_id == tenant_id,
            VehicleCostAllocation.vehicle_id == vehicle.id,
        )
        allocations = session.exec(build_alloc_query(alloc_query)).all()

        # Chi phí chung (vehicle_id = NULL) - chia đều cho số đầu kéo
        shared_query = select(VehicleCostAllocation).where(
            VehicleCostAllocation.tenant_id == tenant_id,
            VehicleCostAllocation.vehicle_id == None,
        )
        shared_allocations = session.exec(build_alloc_query(shared_query)).all()

        # Chi phí của rơ mooc (TRAILER) - chia đều cho số đầu kéo
        trailer_allocations = []
        if trailer_ids:
            trailer_query = select(VehicleCostAllocation).where(
                VehicleCostAllocation.tenant_id == tenant_id,
                VehicleCostAllocation.vehicle_id.in_(trailer_ids),
            )
            trailer_allocations = session.exec(build_alloc_query(trailer_query)).all()

        indirect_costs = {cat: 0 for cat in CostCategory}
        # Cộng chi phí gán riêng cho đầu kéo này
        for alloc in allocations:
            if alloc.category in indirect_costs:
                indirect_costs[alloc.category] += alloc.allocated_amount
        # Cộng chi phí chung (chia đều cho số đầu kéo)
        for alloc in shared_allocations:
            if alloc.category in indirect_costs and total_tractors > 0:
                indirect_costs[alloc.category] += alloc.allocated_amount / total_tractors
        # Cộng chi phí rơ mooc (chia đều cho số đầu kéo)
        for alloc in trailer_allocations:
            if alloc.category in indirect_costs and total_tractors > 0:
                indirect_costs[alloc.category] += alloc.allocated_amount / total_tractors

        depreciation = indirect_costs.get(CostCategory.DEPRECIATION.value, 0)
        insurance = indirect_costs.get(CostCategory.INSURANCE.value, 0)
        registration = indirect_costs.get(CostCategory.REGISTRATION.value, 0)
        road_tax = indirect_costs.get(CostCategory.ROAD_TAX.value, 0)
        gps_fee = indirect_costs.get(CostCategory.GPS_FEE.value, 0)
        loan_interest = indirect_costs.get(CostCategory.LOAN_INTEREST.value, 0)
        etc_toll = indirect_costs.get(CostCategory.ETC_TOLL.value, 0)
        parking = indirect_costs.get(CostCategory.PARKING.value, 0)
        other_indirect = indirect_costs.get(CostCategory.OTHER.value, 0) + etc_toll + parking

        total_indirect_cost = depreciation + insurance + registration + road_tax + gps_fee + loan_interest + other_indirect

        # === TỔNG KẾT ===
        total_cost = total_direct_cost + total_indirect_cost
        gross_profit = total_revenue - total_direct_cost
        net_profit = total_revenue - total_cost
        profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0

        revenue_per_km = (total_revenue / total_km) if total_km > 0 else 0
        cost_per_km = (total_cost / total_km) if total_km > 0 else 0

        reports.append(VehiclePLReport(
            vehicle_id=vehicle.id,
            vehicle_plate=vehicle.plate_no,
            year=year,
            month=month,
            total_revenue=total_revenue,
            freight_revenue=freight_revenue,
            other_revenue=other_revenue,
            fuel_cost=fuel_cost,
            driver_salary=driver_salary,
            toll_cost=toll_cost,
            empty_return_cost=empty_return_cost,
            maintenance_cost=maintenance_cost,
            other_direct_cost=other_direct_cost,
            depreciation=depreciation,
            insurance=insurance,
            registration=registration,
            road_tax=road_tax,
            gps_fee=gps_fee,
            loan_interest=loan_interest,
            other_indirect_cost=other_indirect,
            total_direct_cost=total_direct_cost,
            total_indirect_cost=total_indirect_cost,
            total_cost=total_cost,
            gross_profit=gross_profit,
            net_profit=net_profit,
            profit_margin=round(profit_margin, 2),
            trip_count=trip_count,
            total_km=total_km,
            revenue_per_km=round(revenue_per_km, 0),
            cost_per_km=round(cost_per_km, 0),
        ))

    return reports


@router.get("/report/route-pl", response_model=List[RoutePLReport])
def get_route_pl_report(
    year: Optional[int] = None,
    month: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Báo cáo P&L theo tuyến đường
    - Nếu không truyền year/month: lấy toàn bộ dữ liệu
    - Nếu chỉ truyền year: lấy cả năm đó
    - Nếu truyền cả year và month: lấy tháng cụ thể
    """
    tenant_id = str(current_user.tenant_id)

    # Xác định date range
    if year and month:
        start_date = date(year, month, 1)
        end_date = date(year, month, monthrange(year, month)[1])
    elif year:
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
    else:
        # Toàn thời gian - từ 2020 đến hiện tại
        start_date = date(2020, 1, 1)
        end_date = date.today()

    # Get trips grouped by route (using route_code)
    trips = session.exec(
        select(Trip).where(
            Trip.tenant_id == tenant_id,
            Trip.completed_at >= datetime.combine(start_date, datetime.min.time()),
            Trip.completed_at <= datetime.combine(end_date, datetime.max.time()),
        )
    ).all()

    # Group by route_code
    routes = {}
    for trip in trips:
        # Use route_code as key
        route_code = trip.route_code or "Unknown"

        if route_code not in routes:
            routes[route_code] = {
                "route_code": route_code,
                "trips": [],
            }
        routes[route_code]["trips"].append(trip)

    reports = []

    for route_key, route_data in routes.items():
        route_trips = route_data["trips"]
        trip_ids = [t.id for t in route_trips]
        trip_count = len(route_trips)

        # Calculate totals
        total_km = sum(t.distance_km or 0 for t in route_trips)
        avg_km = total_km / trip_count if trip_count > 0 else 0

        # Revenue & costs from finance items
        total_revenue = 0
        total_fuel = 0
        total_toll = 0
        total_other = 0

        if trip_ids:
            finance_items = session.exec(
                select(TripFinanceItem).where(TripFinanceItem.trip_id.in_(trip_ids))
            ).all()

            for item in finance_items:
                if item.direction == "income":
                    total_revenue += item.amount
                else:
                    if item.item_type == "fuel":
                        total_fuel += item.amount
                    elif item.item_type == "toll":
                        total_toll += item.amount
                    else:
                        total_other += item.amount

        total_cost = total_fuel + total_toll + total_other
        total_profit = total_revenue - total_cost
        profit_margin = (total_profit / total_revenue * 100) if total_revenue > 0 else 0

        avg_revenue = total_revenue / trip_count if trip_count > 0 else 0
        avg_cost = total_cost / trip_count if trip_count > 0 else 0
        avg_profit = total_profit / trip_count if trip_count > 0 else 0
        avg_fuel = total_fuel / trip_count if trip_count > 0 else 0
        avg_toll = total_toll / trip_count if trip_count > 0 else 0
        avg_other = total_other / trip_count if trip_count > 0 else 0

        # TODO: Get listed rate from rates table for comparison

        reports.append(RoutePLReport(
            route_name=route_data["route_code"],
            route_code=route_data["route_code"],
            year=year,
            month=month,
            trip_count=trip_count,
            total_km=total_km,
            avg_km=round(avg_km, 1),
            total_revenue=total_revenue,
            avg_revenue_per_trip=round(avg_revenue, 0),
            total_cost=total_cost,
            avg_cost_per_trip=round(avg_cost, 0),
            total_profit=total_profit,
            avg_profit_per_trip=round(avg_profit, 0),
            profit_margin=round(profit_margin, 2),
            avg_fuel_cost=round(avg_fuel, 0),
            avg_toll_cost=round(avg_toll, 0),
            avg_other_cost=round(avg_other, 0),
            listed_rate=None,  # TODO
            rate_variance=None,  # TODO
        ))

    # Sort by trip count descending
    reports.sort(key=lambda x: x.trip_count, reverse=True)

    return reports
