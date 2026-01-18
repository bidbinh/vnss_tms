"""
Geofencing Service
Check if GPS location is within geofence radius of a target location
Used for GPS-based status detection (arrival at pickup/delivery)
"""
import math
import logging
from typing import Optional, Tuple
from app.services.distance_calculator_advanced import get_distance_calculator

logger = logging.getLogger(__name__)


class GeofencingService:
    """Geofencing service for GPS-based status detection"""

    def __init__(self):
        self.distance_calculator = get_distance_calculator()

    def is_within_geofence(
        self,
        gps_location: Tuple[float, float],
        target_location: Tuple[float, float],
        radius_meters: float = 100.0
    ) -> bool:
        """
        Check if GPS location is within geofence radius of target location

        Args:
            gps_location: (latitude, longitude) of GPS position
            target_location: (latitude, longitude) of target location
            radius_meters: Geofence radius in meters (default: 100m)

        Returns:
            True if GPS location is within radius, False otherwise
        """
        # Calculate distance in kilometers
        distance_km = self.distance_calculator.calculate_distance(
            gps_location,
            target_location
        )

        if distance_km is None:
            return False

        # Convert to meters and check
        distance_meters = distance_km * 1000.0
        return distance_meters <= radius_meters

    def get_distance_to_target(
        self,
        gps_location: Tuple[float, float],
        target_location: Tuple[float, float]
    ) -> Optional[float]:
        """
        Get distance from GPS location to target location

        Args:
            gps_location: (latitude, longitude) of GPS position
            target_location: (latitude, longitude) of target location

        Returns:
            Distance in meters, or None if calculation fails
        """
        distance_km = self.distance_calculator.calculate_distance(
            gps_location,
            target_location
        )

        if distance_km is None:
            return None

        return distance_km * 1000.0  # Convert to meters

    def check_order_pickup_arrival(
        self,
        vehicle_gps_lat: float,
        vehicle_gps_lon: float,
        order,
        session
    ) -> bool:
        """
        Check if vehicle has arrived at order pickup location

        Args:
            vehicle_gps_lat: Vehicle GPS latitude
            vehicle_gps_lon: Vehicle GPS longitude
            order: Order object
            session: Database session

        Returns:
            True if vehicle is within geofence of pickup location
        """
        from app.models import Site

        # Get pickup site coordinates
        pickup_coords = self.distance_calculator.get_coordinates_from_site(
            order.pickup_site_id,
            session
        )

        if not pickup_coords:
            return False

        # Get geofence radius from site
        if order.pickup_site_id:
            site = session.get(Site, order.pickup_site_id)
            radius_meters = site.geofence_radius_meters if site else 100.0
        else:
            radius_meters = 100.0  # Default

        gps_location = (vehicle_gps_lat, vehicle_gps_lon)
        return self.is_within_geofence(gps_location, pickup_coords, radius_meters)

    def check_order_delivery_arrival(
        self,
        vehicle_gps_lat: float,
        vehicle_gps_lon: float,
        order,
        session
    ) -> bool:
        """
        Check if vehicle has arrived at order delivery location

        Args:
            vehicle_gps_lat: Vehicle GPS latitude
            vehicle_gps_lon: Vehicle GPS longitude
            order: Order object
            session: Database session

        Returns:
            True if vehicle is within geofence of delivery location
        """
        from app.models import Site

        # Get delivery site coordinates
        delivery_coords = self.distance_calculator.get_coordinates_from_site(
            order.delivery_site_id,
            session
        )

        if not delivery_coords:
            return False

        # Get geofence radius from site
        if order.delivery_site_id:
            site = session.get(Site, order.delivery_site_id)
            radius_meters = site.geofence_radius_meters if site else 100.0
        else:
            radius_meters = 100.0  # Default

        gps_location = (vehicle_gps_lat, vehicle_gps_lon)
        return self.is_within_geofence(gps_location, delivery_coords, radius_meters)


# Singleton instance
_geofencing_service: Optional[GeofencingService] = None


def get_geofencing_service() -> GeofencingService:
    """Get singleton geofencing service instance"""
    global _geofencing_service
    if _geofencing_service is None:
        _geofencing_service = GeofencingService()
    return _geofencing_service
