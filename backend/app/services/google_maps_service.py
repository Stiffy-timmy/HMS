"""
Lightweight Google Maps helper service.

Provides:
- geocode_address: text -> (lat, lng) via Geocoding API
- get_directions: (origin -> destination) -> polyline + duration
- haversine_distance: great-circle distance in meters (used even when no API key)

If GOOGLE_MAPS_API_KEY is not set, geocode_address returns None and the rest of
the platform falls back to haversine + simple estimates (rough but still functional).
"""
import math
import os
import logging
from typing import Optional, Tuple

import requests

logger = logging.getLogger(__name__)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()

# Default city coordinates used as a fallback when geocoding fails / key is missing.
# Indexed by lowercased city name to match the existing appointments logic.
CITY_FALLBACK = {
    "hyderabad": (17.3850, 78.4867),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "visakhapatnam": (17.6868, 83.2185),
    "vizag": (17.6868, 83.2185),
    "mumbai": (19.0760, 72.8777),
    "navi mumbai": (19.0330, 73.0297),
    "delhi": (28.6139, 77.2090),
    "chennai": (13.0827, 80.2707),
    "pune": (18.5204, 73.8567),
    "kolkata": (22.5726, 88.3639),
    "ahmedabad": (23.0225, 72.5714),
    "jaipur": (26.9124, 75.7873),
    "lucknow": (26.8467, 80.9462),
}

# Average ambulance speed in m/s (~36 km/h) used as a fallback estimate
FALLBACK_AMBULANCE_SPEED_MPS = 10.0


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in meters."""
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def geocode_address(address: str) -> Optional[Tuple[float, float]]:
    """
    Convert an address string to (lat, lng). Returns None on failure.
    Falls back to a small city-name lookup table when no API key is configured
    OR when the API request fails.
    """
    if not address or not address.strip():
        return None

    if GOOGLE_MAPS_API_KEY:
        try:
            resp = requests.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"address": address, "key": GOOGLE_MAPS_API_KEY},
                timeout=4.0,
            )
            data = resp.json()
            if data.get("status") == "OK" and data.get("results"):
                loc = data["results"][0]["geometry"]["location"]
                return float(loc["lat"]), float(loc["lng"])
            logger.warning(f"Geocoding API returned status={data.get('status')}: {address}")
        except Exception as e:
            logger.warning(f"Geocoding API error: {e}")

    # Fallback: try to match a city name in the address
    address_lower = address.lower()
    for city, coords in CITY_FALLBACK.items():
        if city in address_lower:
            return coords
    return None


def get_directions(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> Optional[dict]:
    """
    Returns {"polyline": str, "duration_seconds": int} or None on failure.
    Falls back to a straight-line distance / average-speed estimate.
    """
    if GOOGLE_MAPS_API_KEY:
        try:
            resp = requests.get(
                "https://maps.googleapis.com/maps/api/directions/json",
                params={
                    "origin": f"{origin_lat},{origin_lng}",
                    "destination": f"{dest_lat},{dest_lng}",
                    "key": GOOGLE_MAPS_API_KEY,
                },
                timeout=4.0,
            )
            data = resp.json()
            if data.get("status") == "OK" and data.get("routes"):
                route = data["routes"][0]
                polyline = route.get("overview_polyline", {}).get("points")
                duration = route.get("legs", [{}])[0].get("duration", {}).get("value")
                if polyline and duration is not None:
                    return {
                        "polyline": polyline,
                        "duration_seconds": int(duration),
                    }
            logger.warning(f"Directions API returned status={data.get('status')}")
        except Exception as e:
            logger.warning(f"Directions API error: {e}")

    # Fallback: straight-line haversine * 1.4 detour factor, divided by ~10 m/s
    distance_m = haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng) * 1.4
    duration_seconds = max(60, int(distance_m / FALLBACK_AMBULANCE_SPEED_MPS))
    return {
        "polyline": None,  # No polyline available without API
        "duration_seconds": duration_seconds,
    }
