"""
Driver Scoring Service
Calculates driver score for auto-assignment based on:
- Distance to pickup location
- Driver availability
- Historical performance
- Route optimization potential
"""
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from sqlmodel import Session, select, func, and_, or_
from app.models import Driver, Vehicle, Order, VehicleGPS
from app.services.distance_calculator_advanced import get_distance_calculator

logger = logging.getLogger(__name__)


class DriverScore:
    """Driver score result"""

    def __init__(
        self,
        driver_id: str,
        driver_name: str,
        vehicle_id: Optional[str],
        total_score: float,
        factors: Dict[str, float],
        reasons: List[str]
    ):
        self.driver_id = driver_id
        self.driver_name = driver_name
        self.vehicle_id = vehicle_id
        self.total_score = total_score
        self.factors = factors
        self.reasons = reasons


class DriverScorer:
    """Driver scoring service for auto-assignment"""

    def __init__(self):
        self.distance_calculator = get_distance_calculator()
        # Scoring weights (can be configured)
        self.weights = {
            "distance": 0.30,  # 30% weight
            "availability": 0.25,  # 25% weight
            "performance": 0.25,  # 25% weight
            "route_optimization": 0.20,  # 20% weight
        }

    def score_driver(
        self,
        driver: Driver,
        order: Order,
        session: Session
    ) -> DriverScore:
        """
        Calculate driver score for an order

        Args:
            driver: Driver object
            order: Order object
            session: Database session

        Returns:
            DriverScore with total score and factors
        """
        factors = {}
        reasons = []
        total_score = 0.0

        # Factor 1: Distance to pickup location
        distance_score = self._calculate_distance_score(driver, order, session)
        factors["distance"] = distance_score
        total_score += distance_score * self.weights["distance"]
        reasons.append(f"Distance score: {distance_score:.2f}")

        # Factor 2: Availability
        availability_score = self._calculate_availability_score(driver, order, session)
        factors["availability"] = availability_score
        total_score += availability_score * self.weights["availability"]
        reasons.append(f"Availability score: {availability_score:.2f}")

        # Factor 3: Historical performance
        performance_score = self._calculate_performance_score(driver, session)
        factors["performance"] = performance_score
        total_score += performance_score * self.weights["performance"]
        reasons.append(f"Performance score: {performance_score:.2f}")

        # Factor 4: Route optimization potential
        route_score = self._calculate_route_score(driver, order, session)
        factors["route_optimization"] = route_score
        total_score += route_score * self.weights["route_optimization"]
        reasons.append(f"Route score: {route_score:.2f}")

        # Get vehicle ID
        vehicle_id = driver.tractor_id

        return DriverScore(
            driver_id=driver.id,
            driver_name=driver.name,
            vehicle_id=vehicle_id,
            total_score=total_score,
            factors=factors,
            reasons=reasons
        )

    def _calculate_distance_score(
        self,
        driver: Driver,
        order: Order,
        session: Session
    ) -> float:
        """Calculate score based on distance to pickup location (0-100)"""
        # Get driver's current location from GPS
        vehicle_id = driver.tractor_id
        if not vehicle_id:
            return 50.0  # Neutral score if no vehicle

        gps = session.exec(
            select(VehicleGPS).where(
                and_(
                    VehicleGPS.vehicle_id == vehicle_id,
                    VehicleGPS.tenant_id == order.tenant_id
                )
            ).order_by(VehicleGPS.gps_timestamp.desc())
        ).first()

        if not gps or not gps.latitude or not gps.longitude:
            return 50.0  # Neutral score if no GPS data

        # Get pickup coordinates
        pickup_coords = self.distance_calculator.get_coordinates_from_site(
            order.pickup_site_id,
            session
        )

        if not pickup_coords:
            return 50.0  # Neutral score if no pickup coordinates

        # Calculate distance
        driver_location = (gps.latitude, gps.longitude)
        distance_km = self.distance_calculator.calculate_distance(
            driver_location,
            pickup_coords
        )

        if distance_km is None:
            return 50.0

        # Score: closer = higher score
        # 0 km = 100, 50 km = 50, 100+ km = 0
        if distance_km <= 10:
            score = 100.0
        elif distance_km <= 50:
            score = 100.0 - (distance_km - 10) * 1.25  # Linear from 100 to 50
        else:
            score = max(0.0, 50.0 - (distance_km - 50) * 1.0)  # Linear from 50 to 0

        return score

    def _calculate_availability_score(
        self,
        driver: Driver,
        order: Order,
        session: Session
    ) -> float:
        """Calculate score based on driver availability (0-100)"""
        # Check driver status
        if driver.status != "ACTIVE":
            return 0.0

        # Check if driver has vehicle
        if not driver.tractor_id:
            return 50.0  # Neutral score

        # Check GPS work status
        vehicle_id = driver.tractor_id
        gps = session.exec(
            select(VehicleGPS).where(
                and_(
                    VehicleGPS.vehicle_id == vehicle_id,
                    VehicleGPS.tenant_id == order.tenant_id
                )
            ).order_by(VehicleGPS.gps_timestamp.desc())
        ).first()

        if not gps:
            return 50.0  # Neutral if no GPS data

        # Check work status
        if gps.work_status == "available":
            return 100.0
        elif gps.work_status == "on_trip":
            # Check if can fit this order into current trip
            return 60.0  # Medium score
        elif gps.work_status in ["loading", "unloading"]:
            return 40.0  # Lower score
        else:
            return 20.0  # Low score for maintenance, off_duty, etc.

    def _calculate_performance_score(
        self,
        driver: Driver,
        session: Session
    ) -> float:
        """Calculate score based on historical performance (0-100)"""
        # Get completed orders in last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        completed_orders = session.exec(
            select(Order).where(
                and_(
                    Order.driver_id == driver.id,
                    Order.status == "COMPLETED",
                    Order.updated_at >= thirty_days_ago
                )
            )
        ).all()

        if not completed_orders:
            return 70.0  # Default score for new drivers

        # Calculate on-time delivery rate
        on_time_count = 0
        total_count = len(completed_orders)

        for order in completed_orders:
            if order.actual_delivery_at and order.eta_delivery_at:
                # Consider on-time if within 30 minutes of ETA
                delay = (order.actual_delivery_at - order.eta_delivery_at).total_seconds() / 60
                if delay <= 30:
                    on_time_count += 1

        on_time_rate = on_time_count / total_count if total_count > 0 else 0.0
        score = on_time_rate * 100.0

        return score

    def _calculate_route_score(
        self,
        driver: Driver,
        order: Order,
        session: Session
    ) -> float:
        """Calculate score based on route optimization potential (0-100)"""
        # Check if driver has other assigned orders that can be combined
        assigned_orders = session.exec(
            select(Order).where(
                and_(
                    Order.driver_id == driver.id,
                    Order.status.in_(["ASSIGNED", "IN_TRANSIT"]),
                    Order.id != order.id
                )
            )
        ).all()

        if not assigned_orders:
            return 80.0  # Good score if no other orders (can start fresh)

        # Check if this order can be combined with existing orders
        # (simplified: if pickup/delivery locations are close)
        # TODO: Implement proper route optimization check
        return 70.0  # Medium score if has other orders

    def find_best_driver(
        self,
        order: Order,
        session: Session,
        limit: int = 5
    ) -> List[DriverScore]:
        """
        Find best drivers for an order

        Args:
            order: Order object
            session: Database session
            limit: Maximum number of results

        Returns:
            List of DriverScore sorted by total_score (descending)
        """
        # Get available drivers
        drivers = session.exec(
            select(Driver).where(
                and_(
                    Driver.tenant_id == order.tenant_id,
                    Driver.status == "ACTIVE",
                    Driver.tractor_id != None  # Must have vehicle
                )
            )
        ).all()

        if not drivers:
            return []

        # Score each driver
        scores = []
        for driver in drivers:
            try:
                score = self.score_driver(driver, order, session)
                scores.append(score)
            except Exception as e:
                logger.error(f"Error scoring driver {driver.id}: {e}")
                continue

        # Sort by total score (descending)
        scores.sort(key=lambda x: x.total_score, reverse=True)

        return scores[:limit]


# Singleton instance
_driver_scorer: Optional[DriverScorer] = None


def get_driver_scorer() -> DriverScorer:
    """Get singleton driver scorer instance"""
    global _driver_scorer
    if _driver_scorer is None:
        _driver_scorer = DriverScorer()
    return _driver_scorer
