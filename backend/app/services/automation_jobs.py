"""
TMS Automation Background Jobs
- Auto-accept orders
- Auto-assign drivers
- GPS-based status detection
- ETA recalculation
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from sqlmodel import Session, select, and_, or_
from app.models import (
    Order, Driver, Vehicle, Customer,
    VehicleGPS, AIDecision, DispatchLog, DispatchAlert
)
from app.models.order import OrderStatus
from app.models.dispatch import DispatchLogType, AlertType, AlertSeverity
from app.services.order_validator import get_order_validator
from app.services.driver_scorer import get_driver_scorer
from app.services.geofencing import get_geofencing_service
from app.services.distance_calculator_advanced import get_distance_calculator

logger = logging.getLogger(__name__)


class AutomationJobs:
    """Background jobs for TMS automation"""

    def __init__(self):
        self.order_validator = get_order_validator()
        self.driver_scorer = get_driver_scorer()
        self.geofencing = get_geofencing_service()
        self.distance_calculator = get_distance_calculator()

    def auto_accept_orders(
        self,
        session: Session,
        tenant_id: str,
        limit: int = 50
    ) -> dict:
        """
        Auto-accept orders that meet validation criteria

        Args:
            session: Database session
            tenant_id: Tenant ID
            limit: Maximum number of orders to process

        Returns:
            Dict with results
        """
        # Get NEW orders
        orders = session.exec(
            select(Order).where(
                and_(
                    Order.tenant_id == tenant_id,
                    Order.status == OrderStatus.NEW
                )
            ).limit(limit)
        ).all()

        accepted = 0
        rejected = 0
        pending = 0
        errors = 0

        for order in orders:
            try:
                # Validate order
                should_accept, confidence, reason = self.order_validator.should_auto_accept(
                    order, session
                )

                if should_accept:
                    # Auto-accept
                    order.status = OrderStatus.ACCEPTED
                    order.dispatcher_id = None  # Auto-accepted
                    session.add(order)

                    # Log action
                    self._log_auto_action(
                        session, tenant_id,
                        log_type=DispatchLogType.AUTO_ASSIGN.value,
                        title=f"Auto-accepted order {order.order_code}",
                        description=f"Confidence: {confidence:.1f}% - {reason}",
                        order_id=order.id,
                        is_ai=True,
                        ai_confidence=confidence
                    )

                    accepted += 1
                    logger.info(f"Auto-accepted order {order.order_code} (confidence: {confidence:.1f}%)")

                elif confidence < 50.0:
                    # Auto-reject
                    order.status = OrderStatus.REJECTED
                    order.reject_reason = f"Auto-rejected: {reason}"
                    order.dispatcher_id = None
                    session.add(order)

                    # Log action
                    self._log_auto_action(
                        session, tenant_id,
                        log_type=DispatchLogType.AUTO_ASSIGN.value,
                        title=f"Auto-rejected order {order.order_code}",
                        description=f"Confidence: {confidence:.1f}% - {reason}",
                        order_id=order.id,
                        is_ai=True,
                        ai_confidence=confidence
                    )

                    rejected += 1
                    logger.info(f"Auto-rejected order {order.order_code} (confidence: {confidence:.1f}%)")

                else:
                    # Pending approval
                    pending += 1

            except Exception as e:
                errors += 1
                logger.error(f"Error processing order {order.id}: {e}")

        session.commit()

        return {
            "processed": len(orders),
            "accepted": accepted,
            "rejected": rejected,
            "pending": pending,
            "errors": errors
        }

    def auto_assign_drivers(
        self,
        session: Session,
        tenant_id: str,
        limit: int = 50
    ) -> dict:
        """
        Auto-assign drivers to ACCEPTED orders

        Args:
            session: Database session
            tenant_id: Tenant ID
            limit: Maximum number of orders to process

        Returns:
            Dict with results
        """
        # Get ACCEPTED orders without driver
        orders = session.exec(
            select(Order).where(
                and_(
                    Order.tenant_id == tenant_id,
                    Order.status == OrderStatus.ACCEPTED,
                    or_(
                        Order.driver_id == None,
                        Order.driver_id == ""
                    )
                )
            ).limit(limit)
        ).all()

        assigned = 0
        pending = 0
        errors = 0

        for order in orders:
            try:
                # Find best drivers
                driver_scores = self.driver_scorer.find_best_driver(order, session, limit=3)

                if not driver_scores:
                    pending += 1
                    continue

                best_driver = driver_scores[0]

                # Auto-assign if confidence > 80%
                if best_driver.total_score >= 80.0:
                    # Get driver
                    driver = session.get(Driver, best_driver.driver_id)
                    if not driver:
                        continue

                    # Assign driver and vehicle
                    order.driver_id = driver.id
                    order.vehicle_id = driver.tractor_id
                    order.status = OrderStatus.ASSIGNED
                    session.add(order)

                    # Log action
                    self._log_auto_action(
                        session, tenant_id,
                        log_type=DispatchLogType.AUTO_ASSIGN.value,
                        title=f"Auto-assigned order {order.order_code} to {driver.name}",
                        description=f"Score: {best_driver.total_score:.1f}",
                        order_id=order.id,
                        driver_id=driver.id,
                        vehicle_id=driver.tractor_id,
                        is_ai=True,
                        ai_confidence=best_driver.total_score
                    )

                    assigned += 1
                    logger.info(f"Auto-assigned order {order.order_code} to driver {driver.name} (score: {best_driver.total_score:.1f})")

                else:
                    # Create AI decision for approval
                    self._create_ai_decision(
                        session, tenant_id, order,
                        decision_type="assign",
                        title=f"Gợi ý phân công đơn {order.order_code}",
                        description=f"Đề xuất giao cho {best_driver.driver_name} (điểm: {best_driver.total_score:.1f})",
                        confidence=best_driver.total_score,
                        driver_id=best_driver.driver_id,
                        vehicle_id=best_driver.vehicle_id
                    )
                    pending += 1

            except Exception as e:
                errors += 1
                logger.error(f"Error assigning driver to order {order.id}: {e}")

        session.commit()

        return {
            "processed": len(orders),
            "assigned": assigned,
            "pending_approval": pending,
            "errors": errors
        }

    def detect_gps_status(
        self,
        session: Session,
        tenant_id: str,
        limit: int = 100
    ) -> dict:
        """
        Detect order status changes from GPS data

        Args:
            session: Database session
            tenant_id: Tenant ID
            limit: Maximum number of orders to check

        Returns:
            Dict with results
        """
        # Get active orders with GPS tracking
        orders = session.exec(
            select(Order).where(
                and_(
                    Order.tenant_id == tenant_id,
                    Order.status.in_([OrderStatus.ASSIGNED, OrderStatus.IN_TRANSIT]),
                    Order.driver_id != None,
                    Order.vehicle_id != None
                )
            ).limit(limit)
        ).all()

        detected_pickup = 0
        detected_delivery = 0
        errors = 0

        for order in orders:
            try:
                # Get vehicle GPS
                gps = session.exec(
                    select(VehicleGPS).where(
                        and_(
                            VehicleGPS.vehicle_id == order.vehicle_id,
                            VehicleGPS.tenant_id == tenant_id
                        )
                    ).order_by(VehicleGPS.gps_timestamp.desc())
                ).first()

                if not gps or not gps.latitude or not gps.longitude:
                    continue

                # Check pickup arrival
                if order.status == OrderStatus.ASSIGNED:
                    if not order.arrived_at_pickup_at:
                        if self.geofencing.check_order_pickup_arrival(
                            gps.latitude, gps.longitude, order, session
                        ):
                            order.arrived_at_pickup_at = datetime.utcnow()
                            session.add(order)
                            detected_pickup += 1
                            logger.info(f"Detected arrival at pickup for order {order.order_code}")

                # Check delivery arrival
                elif order.status == OrderStatus.IN_TRANSIT:
                    if not order.arrived_at_delivery_at:
                        if self.geofencing.check_order_delivery_arrival(
                            gps.latitude, gps.longitude, order, session
                        ):
                            order.arrived_at_delivery_at = datetime.utcnow()
                            # Auto-update to DELIVERED if arrived > 5 minutes ago
                            if (datetime.utcnow() - order.arrived_at_delivery_at).total_seconds() > 300:
                                order.status = OrderStatus.DELIVERED
                                order.actual_delivery_at = datetime.utcnow()
                            session.add(order)
                            detected_delivery += 1
                            logger.info(f"Detected arrival at delivery for order {order.order_code}")

            except Exception as e:
                errors += 1
                logger.error(f"Error detecting GPS status for order {order.id}: {e}")

        session.commit()

        return {
            "processed": len(orders),
            "detected_pickup": detected_pickup,
            "detected_delivery": detected_delivery,
            "errors": errors
        }

    def recalculate_etas(
        self,
        session: Session,
        tenant_id: str,
        limit: int = 100
    ) -> dict:
        """
        Recalculate ETAs for active orders based on current GPS location

        Args:
            session: Database session
            tenant_id: Tenant ID
            limit: Maximum number of orders to process

        Returns:
            Dict with results
        """
        # Get active orders with GPS
        orders = session.exec(
            select(Order).where(
                and_(
                    Order.tenant_id == tenant_id,
                    Order.status.in_([OrderStatus.ASSIGNED, OrderStatus.IN_TRANSIT]),
                    Order.driver_id != None,
                    Order.vehicle_id != None
                )
            ).limit(limit)
        ).all()

        updated = 0
        alerts_created = 0
        errors = 0

        for order in orders:
            try:
                # Get vehicle GPS
                gps = session.exec(
                    select(VehicleGPS).where(
                        and_(
                            VehicleGPS.vehicle_id == order.vehicle_id,
                            VehicleGPS.tenant_id == tenant_id
                        )
                    ).order_by(VehicleGPS.gps_timestamp.desc())
                ).first()

                if not gps or not gps.latitude or not gps.longitude:
                    continue

                # Get target coordinates
                if order.status == OrderStatus.ASSIGNED:
                    target_coords = self.distance_calculator.get_coordinates_from_site(
                        order.pickup_site_id, session
                    )
                    target_eta = order.eta_pickup_at
                else:
                    target_coords = self.distance_calculator.get_coordinates_from_site(
                        order.delivery_site_id, session
                    )
                    target_eta = order.eta_delivery_at

                if not target_coords or not target_eta:
                    continue

                # Calculate remaining distance
                current_location = (gps.latitude, gps.longitude)
                remaining_km = self.distance_calculator.calculate_distance(
                    current_location, target_coords
                )

                if remaining_km is None:
                    continue

                # Estimate travel time (assume average speed 50 km/h)
                avg_speed_kmh = 50.0
                estimated_hours = remaining_km / avg_speed_kmh
                new_eta = datetime.utcnow() + timedelta(hours=estimated_hours)

                # Update ETA
                if order.status == OrderStatus.ASSIGNED:
                    order.eta_pickup_at = new_eta
                else:
                    order.eta_delivery_at = new_eta

                session.add(order)

                # Check for delay
                delay_minutes = (new_eta - target_eta).total_seconds() / 60

                # Get customer delay threshold
                customer = session.get(Customer, order.customer_id)
                threshold_minutes = customer.delay_alert_threshold_minutes if customer else 15

                if delay_minutes > threshold_minutes:
                    # Create delay alert
                    self._create_delay_alert(
                        session, tenant_id, order,
                        delay_minutes=delay_minutes
                    )
                    alerts_created += 1

                updated += 1

            except Exception as e:
                errors += 1
                logger.error(f"Error recalculating ETA for order {order.id}: {e}")

        session.commit()

        return {
            "processed": len(orders),
            "updated": updated,
            "alerts_created": alerts_created,
            "errors": errors
        }

    def _log_auto_action(
        self,
        session: Session,
        tenant_id: str,
        log_type: str,
        title: str,
        description: str,
        order_id: Optional[str] = None,
        driver_id: Optional[str] = None,
        vehicle_id: Optional[str] = None,
        is_ai: bool = True,
        ai_confidence: Optional[float] = None
    ):
        """Log automation action"""
        log = DispatchLog(
            tenant_id=tenant_id,
            log_type=log_type,
            title=title,
            description=description,
            order_id=order_id,
            driver_id=driver_id,
            vehicle_id=vehicle_id,
            is_ai=is_ai,
            ai_confidence=ai_confidence
        )
        session.add(log)

    def _create_ai_decision(
        self,
        session: Session,
        tenant_id: str,
        order: Order,
        decision_type: str,
        title: str,
        description: str,
        confidence: float,
        driver_id: Optional[str] = None,
        vehicle_id: Optional[str] = None
    ):
        """Create AI decision for approval"""
        decision = AIDecision(
            tenant_id=tenant_id,
            decision_type=decision_type,
            order_id=order.id,
            driver_id=driver_id,
            vehicle_id=vehicle_id,
            title=title,
            description=description,
            confidence=confidence,
            status="pending"
        )
        session.add(decision)

    def _create_delay_alert(
        self,
        session: Session,
        tenant_id: str,
        order: Order,
        delay_minutes: float
    ):
        """Create delay alert"""
        alert = DispatchAlert(
            tenant_id=tenant_id,
            alert_type=AlertType.DELAY.value,
            severity=AlertSeverity.WARNING.value if delay_minutes <= 30 else AlertSeverity.CRITICAL.value,
            order_id=order.id,
            vehicle_id=order.vehicle_id,
            driver_id=order.driver_id,
            title=f"Trễ tiến độ: Đơn {order.order_code}",
            message=f"Ước tính trễ {delay_minutes:.0f} phút so với lịch trình",
            is_auto=True
        )
        session.add(alert)


# Singleton instance
_automation_jobs: Optional[AutomationJobs] = None


def get_automation_jobs() -> AutomationJobs:
    """Get singleton automation jobs instance"""
    global _automation_jobs
    if _automation_jobs is None:
        _automation_jobs = AutomationJobs()
    return _automation_jobs
