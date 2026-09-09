"""
Reverse geocoding utility using Nominatim (OpenStreetMap).
Free, no API key required. Returns human-friendly location data from coordinates.
"""

import logging
import asyncio
from urllib.parse import quote

logger = logging.getLogger(__name__)

# Use httpx for async HTTP requests (we'll fall back to urllib if not available)
try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "YellowBird-SchoolBusTracker/1.0"


async def reverse_geocode(lat: float, lng: float) -> dict:
    """
    Reverse geocode coordinates into a human-friendly location.
    
    Returns:
        {
            "landmark": "Near ABC Temple" or None,
            "street": "College Road" or None,
            "locality": "Sector 42" or None,
            "city": "Nashik" or None,
            "state": "Maharashtra" or None,
            "postal_code": "422101" or None,
            "display_name": "Full address string",
            "name": "Auto-generated stop name"
        }
    
    Falls back gracefully if Nominatim is unavailable.
    """
    try:
        if HAS_HTTPX:
            return await _geocode_httpx(lat, lng)
        else:
            return await _geocode_urllib(lat, lng)
    except Exception as e:
        logger.warning(f"Reverse geocoding failed for ({lat}, {lng}): {e}")
        return _fallback_result(lat, lng)


async def _geocode_httpx(lat: float, lng: float) -> dict:
    """Use httpx for async reverse geocoding."""
    params = {
        "lat": lat,
        "lon": lng,
        "format": "json",
        "addressdetails": 1,
        "zoom": 18,
        "accept-language": "en",
    }
    headers = {"User-Agent": USER_AGENT}
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(NOMINATIM_URL, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()
    
    return _parse_nominatim_response(data, lat, lng)


async def _geocode_urllib(lat: float, lng: float) -> dict:
    """Fallback using urllib (runs in thread pool to avoid blocking)."""
    import urllib.request
    import json
    
    url = (
        f"{NOMINATIM_URL}?lat={lat}&lon={lng}"
        f"&format=json&addressdetails=1&zoom=18&accept-language=en"
    )
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    
    def _fetch():
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
    
    loop = asyncio.get_event_loop()
    data = await loop.run_in_executor(None, _fetch)
    return _parse_nominatim_response(data, lat, lng)


def _parse_nominatim_response(data: dict, lat: float, lng: float) -> dict:
    """Parse Nominatim JSON response into our standardized format."""
    if not data or "error" in data:
        return _fallback_result(lat, lng)
    
    address = data.get("address", {})
    
    # Extract landmark — Nominatim often returns amenity/building/tourism
    landmark = (
        address.get("amenity")
        or address.get("tourism")
        or address.get("building")
        or address.get("shop")
        or address.get("leisure")
        or address.get("place_of_worship")
        or address.get("historic")
    )
    
    # Extract street/road
    street = address.get("road") or address.get("pedestrian") or address.get("footway")
    
    # Extract locality (suburb/neighbourhood/village)
    locality = (
        address.get("suburb")
        or address.get("neighbourhood")
        or address.get("village")
        or address.get("hamlet")
        or address.get("residential")
    )
    
    # Extract city
    city = (
        address.get("city")
        or address.get("town")
        or address.get("municipality")
        or address.get("county")
    )
    
    state = address.get("state")
    postal_code = address.get("postcode")
    display_name = data.get("display_name", "")
    
    # Build a human-friendly stop name
    name = _build_stop_name(landmark, street, locality, lat, lng)
    
    return {
        "landmark": f"Near {landmark}" if landmark else None,
        "street": street,
        "locality": locality,
        "city": city,
        "state": state,
        "postal_code": postal_code,
        "display_name": display_name,
        "name": name,
    }


def _build_stop_name(
    landmark: str | None,
    street: str | None,
    locality: str | None,
    lat: float,
    lng: float,
) -> str:
    """Build a user-friendly stop name from geocoding results."""
    parts = []
    
    if landmark:
        parts.append(f"Near {landmark}")
    if street:
        parts.append(street)
    elif locality:
        parts.append(locality)
    
    if parts:
        return ", ".join(parts)
    
    # Absolute fallback
    return f"Pickup Point ({lat:.4f}, {lng:.4f})"


def _fallback_result(lat: float, lng: float) -> dict:
    """Return minimal result when geocoding fails."""
    return {
        "landmark": None,
        "street": None,
        "locality": None,
        "city": None,
        "state": None,
        "postal_code": None,
        "display_name": f"Location ({lat:.6f}, {lng:.6f})",
        "name": f"Pickup Point ({lat:.4f}, {lng:.4f})",
    }
