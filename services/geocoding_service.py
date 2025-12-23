"""
Geocoding Service
Get address from GPS coordinates
"""

import requests
from config import Config
import logging

logger = logging.getLogger(__name__)


def get_address_from_coordinates(latitude: str, longitude: str) -> str:
    """Get address from GPS coordinates using Nominatim"""
    if not latitude or not longitude:
        return ''
    
    try:
        url = f"https://nominatim.openstreetmap.org/reverse"
        params = {
            "format": "json",
            "lat": latitude,
            "lon": longitude,
            "addressdetails": 1
        }
        headers = {"User-Agent": "EmployeeManagementApp/1.0"}
        
        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=Config.GEOCODING_TIMEOUT
        )
        
        if response.status_code == 200:
            data = response.json()
            addr = data.get("address", {})
            
            building = (addr.get("building") or addr.get("house_name") or 
                       addr.get("amenity") or addr.get("office"))
            locality = (addr.get("neighbourhood") or addr.get("suburb") or 
                       addr.get("village") or addr.get("town") or addr.get("city"))
            
            if building and locality:
                return f"{building}, {locality}"
            elif locality:
                return locality
            elif building:
                return building
            
            return data.get("display_name", f"{latitude}, {longitude}")[:200]
        
        return f"{latitude}, {longitude}"
    
    except Exception as e:
        logger.error(f"Geocoding error: {e}")
        return f"{latitude}, {longitude}"
