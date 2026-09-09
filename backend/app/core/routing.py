"""
Road routing utility using OSRM (Open Source Routing Machine).
Free, no API key required. Returns real road-following routes between waypoints.
Falls back to straight-line (Haversine) if OSRM is unavailable.
"""

import logging
import asyncio
import math

logger = logging.getLogger(__name__)

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

OSRM_URL = "https://router.project-osrm.org/route/v1/driving"


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate straight-line distance between two points in km."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


async def calculate_road_route(
    waypoints: list[tuple[float, float]],
) -> dict:
    """
    Calculate a road-following route through ordered waypoints.
    
    Args:
        waypoints: List of (latitude, longitude) tuples in order.
                   First point = start, last point = destination (school).
    
    Returns:
        {
            "geometry": "encoded_polyline_string",
            "total_distance_km": 12.5,
            "total_duration_mins": 25.3,
            "legs": [
                {
                    "distance_km": 2.1,
                    "duration_mins": 4.5,
                    "from_index": 0,
                    "to_index": 1,
                }
            ],
            "source": "osrm" | "haversine"
        }
    
    Falls back to straight-line distances if OSRM is unavailable.
    """
    if len(waypoints) < 2:
        return {
            "geometry": None,
            "total_distance_km": 0,
            "total_duration_mins": 0,
            "legs": [],
            "source": "none",
        }
    
    try:
        if HAS_HTTPX:
            return await _route_osrm(waypoints)
        else:
            return await _route_osrm_urllib(waypoints)
    except Exception as e:
        logger.warning(f"OSRM routing failed: {e}. Falling back to Haversine.")
        return _route_haversine(waypoints)


async def _route_osrm(waypoints: list[tuple[float, float]]) -> dict:
    """Use OSRM public demo server for routing."""
    # OSRM expects lng,lat (reverse of our lat,lng)
    coords_str = ";".join(f"{lng},{lat}" for lat, lng in waypoints)
    url = f"{OSRM_URL}/{coords_str}"
    
    params = {
        "overview": "full",          # Full route geometry
        "geometries": "polyline",    # Encoded polyline format
        "steps": "false",
        "alternatives": "false",
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
    
    if data.get("code") != "Ok" or not data.get("routes"):
        logger.warning(f"OSRM returned non-Ok response: {data.get('code')}")
        return _route_haversine(waypoints)
    
    route = data["routes"][0]
    legs = route.get("legs", [])
    
    leg_data = []
    for i, leg in enumerate(legs):
        leg_data.append({
            "distance_km": round(leg["distance"] / 1000, 2),
            "duration_mins": round(leg["duration"] / 60, 1),
            "from_index": i,
            "to_index": i + 1,
        })
    
    return {
        "geometry": route.get("geometry"),  # Encoded polyline
        "total_distance_km": round(route["distance"] / 1000, 2),
        "total_duration_mins": round(route["duration"] / 60, 1),
        "legs": leg_data,
        "source": "osrm",
    }


async def _route_osrm_urllib(waypoints: list[tuple[float, float]]) -> dict:
    """Fallback using urllib."""
    import urllib.request
    import json
    
    coords_str = ";".join(f"{lng},{lat}" for lat, lng in waypoints)
    url = (
        f"{OSRM_URL}/{coords_str}"
        f"?overview=full&geometries=polyline&steps=false&alternatives=false"
    )
    req = urllib.request.Request(url)
    
    def _fetch():
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    
    loop = asyncio.get_event_loop()
    data = await loop.run_in_executor(None, _fetch)
    
    if data.get("code") != "Ok" or not data.get("routes"):
        return _route_haversine(waypoints)
    
    route = data["routes"][0]
    legs = route.get("legs", [])
    
    leg_data = []
    for i, leg in enumerate(legs):
        leg_data.append({
            "distance_km": round(leg["distance"] / 1000, 2),
            "duration_mins": round(leg["duration"] / 60, 1),
            "from_index": i,
            "to_index": i + 1,
        })
    
    return {
        "geometry": route.get("geometry"),
        "total_distance_km": round(route["distance"] / 1000, 2),
        "total_duration_mins": round(route["duration"] / 60, 1),
        "legs": leg_data,
        "source": "osrm",
    }


def _route_haversine(waypoints: list[tuple[float, float]]) -> dict:
    """Fallback: calculate straight-line distances between waypoints."""
    legs = []
    total_distance = 0.0
    
    for i in range(len(waypoints) - 1):
        dist = haversine_distance(
            waypoints[i][0], waypoints[i][1],
            waypoints[i + 1][0], waypoints[i + 1][1],
        )
        # Estimate duration: assume avg 25 km/h in city
        dur = (dist / 25) * 60
        legs.append({
            "distance_km": round(dist, 2),
            "duration_mins": round(dur, 1),
            "from_index": i,
            "to_index": i + 1,
        })
        total_distance += dist
    
    total_duration = (total_distance / 25) * 60
    
    return {
        "geometry": None,  # No polyline for straight-line fallback
        "total_distance_km": round(total_distance, 2),
        "total_duration_mins": round(total_duration, 1),
        "legs": legs,
        "source": "haversine",
    }
