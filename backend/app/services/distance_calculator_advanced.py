"""
Advanced Distance Calculation Service
- Haversine formula for great-circle distance
- Distance matrix caching
- Integration with Google Maps Distance Matrix API (optional)
"""
import math
import logging
from typing import Optional, Tuple, Dict
from functools import lru_cache
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class DistanceCalculator:
    """Distance calculation service with caching and API integration"""

    def __init__(self):
        self.google_api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', None) or None
        self.use_google_api = bool(self.google_api_key)
        self._cache: Dict[Tuple[float, float, float, float], float] = {}

    def haversine_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        Calculate great-circle distance between two points using Haversine formula

        Args:
            lat1, lon1: Latitude and longitude of first point
            lat2, lon2: Latitude and longitude of second point

        Returns:
            Distance in kilometers
        """
        # Earth radius in kilometers
        R = 6371.0

        # Convert latitude and longitude from degrees to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)

        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        a = (
            math.sin(dlat / 2) ** 2 +
            math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        distance = R * c
        return distance

    def calculate_distance(
        self,
        point1: Tuple[float, float],
        point2: Tuple[float, float],
        use_api: bool = False
    ) -> Optional[float]:
        """
        Calculate distance between two points

        Args:
            point1: (latitude, longitude) of first point
            point2: (latitude, longitude) of second point
            use_api: If True, use Google Maps API (if available)

        Returns:
            Distance in kilometers, or None if calculation fails
        """
        lat1, lon1 = point1
        lat2, lon2 = point2

        # Check cache
        cache_key = (lat1, lon1, lat2, lon2)
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Use Google Maps API if requested and available
        if use_api and self.use_google_api:
            distance = self._calculate_distance_google(point1, point2)
            if distance:
                self._cache[cache_key] = distance
                return distance

        # Fallback to Haversine
        distance = self.haversine_distance(lat1, lon1, lat2, lon2)
        self._cache[cache_key] = distance
        return distance

    async def _calculate_distance_google(
        self,
        point1: Tuple[float, float],
        point2: Tuple[float, float]
    ) -> Optional[float]:
        """Calculate distance using Google Maps Distance Matrix API"""
        try:
            url = "https://maps.googleapis.com/maps/api/distancematrix/json"
            params = {
                "origins": f"{point1[0]},{point1[1]}",
                "destinations": f"{point2[0]},{point2[1]}",
                "key": self.google_api_key,
                "units": "metric"
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

            if data.get("status") == "OK" and data.get("rows"):
                element = data["rows"][0]["elements"][0]
                if element.get("status") == "OK":
                    distance_m = element["distance"]["value"]  # meters
                    distance_km = distance_m / 1000.0
                    return distance_km
            return None

        except Exception as e:
            logger.error(f"Google Distance Matrix API error: {e}")
            return None

    def get_coordinates_from_location(
        self,
        location_id: Optional[str],
        session
    ) -> Optional[Tuple[float, float]]:
        """Get coordinates from Location ID"""
        if not location_id:
            return None

        from app.models import Location
        location = session.get(Location, location_id)
        if location and location.latitude and location.longitude:
            return (location.latitude, location.longitude)
        return None

    def get_coordinates_from_site(
        self,
        site_id: Optional[str],
        session
    ) -> Optional[Tuple[float, float]]:
        """Get coordinates from Site ID (prefer Site, fallback to Location)"""
        if not site_id:
            return None

        from app.models import Site, Location
        site = session.get(Site, site_id)
        if not site:
            return None

        # Prefer Site coordinates
        if site.latitude and site.longitude:
            return (site.latitude, site.longitude)

        # Fallback to Location coordinates
        if site.location_id:
            location = session.get(Location, site.location_id)
            if location and location.latitude and location.longitude:
                return (location.latitude, location.longitude)

        return None

    def calculate_order_distance(
        self,
        order,
        session
    ) -> Optional[float]:
        """
        Calculate distance for an order (pickup to delivery)

        Args:
            order: Order object
            session: Database session

        Returns:
            Distance in kilometers, or None if calculation fails
        """
        # Try to get coordinates from sites first
        pickup_coords = self.get_coordinates_from_site(order.pickup_site_id, session)
        delivery_coords = self.get_coordinates_from_site(order.delivery_site_id, session)

        # Fallback to locations
        if not pickup_coords:
            pickup_coords = self.get_coordinates_from_location(order.pickup_location_id, session)
        if not delivery_coords:
            delivery_coords = self.get_coordinates_from_location(order.delivery_location_id, session)

        if not pickup_coords or not delivery_coords:
            return None

        return self.calculate_distance(pickup_coords, delivery_coords)

    def clear_cache(self):
        """Clear distance cache"""
        self._cache.clear()


# Singleton instance
_distance_calculator: Optional[DistanceCalculator] = None


def get_distance_calculator() -> DistanceCalculator:
    """Get singleton distance calculator instance"""
    global _distance_calculator
    if _distance_calculator is None:
        _distance_calculator = DistanceCalculator()
    return _distance_calculator
