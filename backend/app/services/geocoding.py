"""
Geocoding Service
Converts addresses to coordinates (latitude, longitude) for TMS automation

Supports multiple providers:
- Google Maps Geocoding API (primary)
- OpenStreetMap Nominatim (fallback, free)
"""
import logging
import httpx
from typing import Optional, Tuple, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


class GeocodingService:
    """Geocoding service with multi-provider support"""

    def __init__(self):
        self.google_api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', None) or None
        self.timeout = 10.0

    async def geocode(
        self,
        address: str,
        city: Optional[str] = None,
        district: Optional[str] = None,
        province: Optional[str] = None,
        country: str = "Vietnam"
    ) -> Optional[Tuple[float, float]]:
        """
        Geocode an address to coordinates (latitude, longitude)

        Args:
            address: Full address or location name
            city: City name (optional)
            district: District name (optional)
            province: Province name (optional)
            country: Country name (default: Vietnam)

        Returns:
            Tuple of (latitude, longitude) if found, None otherwise
        """
        # Try Google Maps first if API key available
        if self.google_api_key:
            result = await self._geocode_google(address, city, district, province, country)
            if result:
                return result

        # Fallback to OpenStreetMap Nominatim
        result = await self._geocode_nominatim(address, city, district, province, country)
        return result

    async def _geocode_google(
        self,
        address: str,
        city: Optional[str] = None,
        district: Optional[str] = None,
        province: Optional[str] = None,
        country: str = "Vietnam"
    ) -> Optional[Tuple[float, float]]:
        """Geocode using Google Maps Geocoding API"""
        try:
            # Build full address
            full_address_parts = [address]
            if district:
                full_address_parts.append(district)
            if city:
                full_address_parts.append(city)
            if province:
                full_address_parts.append(province)
            if country:
                full_address_parts.append(country)

            full_address = ", ".join(full_address_parts)

            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                "address": full_address,
                "key": self.google_api_key,
                "region": "vn"  # Prefer Vietnam results
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

            if data.get("status") == "OK" and data.get("results"):
                location = data["results"][0]["geometry"]["location"]
                lat = location["lat"]
                lng = location["lng"]
                logger.info(f"Geocoded '{full_address}' to ({lat}, {lng}) via Google")
                return (lat, lng)
            else:
                logger.warning(f"Google geocoding failed for '{full_address}': {data.get('status')}")
                return None

        except Exception as e:
            logger.error(f"Google geocoding error: {e}")
            return None

    async def _geocode_nominatim(
        self,
        address: str,
        city: Optional[str] = None,
        district: Optional[str] = None,
        province: Optional[str] = None,
        country: str = "Vietnam"
    ) -> Optional[Tuple[float, float]]:
        """Geocode using OpenStreetMap Nominatim (free, rate-limited)"""
        try:
            # Build full address
            full_address_parts = [address]
            if district:
                full_address_parts.append(district)
            if city:
                full_address_parts.append(city)
            if province:
                full_address_parts.append(province)
            if country:
                full_address_parts.append(country)

            full_address = ", ".join(full_address_parts)

            url = "https://nominatim.openstreetmap.org/search"
            params = {
                "q": full_address,
                "format": "json",
                "limit": 1,
                "countrycodes": "vn"  # Limit to Vietnam
            }
            headers = {
                "User-Agent": "9log-TMS/1.0"  # Required by Nominatim
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params, headers=headers)
                response.raise_for_status()
                data = response.json()

            if data and len(data) > 0:
                result = data[0]
                lat = float(result["lat"])
                lng = float(result["lon"])
                logger.info(f"Geocoded '{full_address}' to ({lat}, {lng}) via Nominatim")
                return (lat, lng)
            else:
                logger.warning(f"Nominatim geocoding failed for '{full_address}': No results")
                return None

        except Exception as e:
            logger.error(f"Nominatim geocoding error: {e}")
            return None

    def build_address_string(
        self,
        address: Optional[str] = None,
        ward: Optional[str] = None,
        district: Optional[str] = None,
        city: Optional[str] = None,
        province: Optional[str] = None,
        country: str = "Vietnam"
    ) -> str:
        """Build full address string from components"""
        parts = []
        if address:
            parts.append(address)
        if ward:
            parts.append(ward)
        if district:
            parts.append(district)
        if city:
            parts.append(city)
        elif province:  # Use province if city not available
            parts.append(province)
        if country:
            parts.append(country)
        return ", ".join(parts)


# Singleton instance
_geocoding_service: Optional[GeocodingService] = None


def get_geocoding_service() -> GeocodingService:
    """Get singleton geocoding service instance"""
    global _geocoding_service
    if _geocoding_service is None:
        _geocoding_service = GeocodingService()
    return _geocoding_service
