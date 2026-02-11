"""
Geocoding Service - IMPROVED VERSION
Get precise address from GPS coordinates using Nominatim (OpenStreetMap)
NO MAPBOX - This is backend only, uses free Nominatim service
"""

import requests
from config import Config
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1000)  # Cache 1000 most recent addresses
def get_address_from_coordinates(latitude: str, longitude: str) -> str:
    """
    Get detailed address from GPS coordinates using Nominatim
    
    ✅ IMPROVEMENTS FROM OLD VERSION:
    - Added zoom=18 for maximum address detail
    - Prioritizes street address over just city name
    - Returns: "Street, Building, Madhapur, Hyderabad" instead of just "Madhapur"
    - Added caching to reduce API calls
    - Better fallback to coordinates if no address found
    
    Args:
        latitude: Latitude as string
        longitude: Longitude as string
    
    Returns:
        Formatted address string with street-level details
    """
    if not latitude or not longitude:
        return ''
    
    try:
        # Validate coordinates
        try:
            lat_f = float(latitude)
            lon_f = float(longitude)
        except (ValueError, TypeError):
            logger.error(f"Invalid coordinates: lat={latitude}, lon={longitude}")
            return f"{latitude}, {longitude}"
        
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "format": "json",
            "lat": latitude,
            "lon": longitude,
            "addressdetails": 1,
            "zoom": 18,  # ✅ KEY FIX: Maximum zoom for street-level detail
        }
        headers = {
            "User-Agent": "FawnixEmployeeApp/1.0 (Employee Tracking System)",
            "Accept-Language": "en"
        }
        
        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=Config.GEOCODING_TIMEOUT
        )
        
        if response.status_code == 200:
            data = response.json()
            addr = data.get("address", {})
            
            # ✅ Build address components in order of specificity
            components = []
            
            # 1. Street address (most specific)
            house_number = addr.get("house_number", "")
            road = addr.get("road", "")
            
            if house_number and road:
                components.append(f"{house_number} {road}")
            elif road:
                components.append(road)
            
            # 2. Building/Place name
            building = (
                addr.get("building") or 
                addr.get("house_name") or 
                addr.get("amenity") or 
                addr.get("office") or
                addr.get("shop") or
                addr.get("commercial")
            )
            if building and building not in str(components):
                components.append(building)
            
            # 3. Neighborhood/Suburb
            locality = (
                addr.get("neighbourhood") or 
                addr.get("suburb") or
                addr.get("residential") or
                addr.get("quarter")
            )
            if locality:
                components.append(locality)
            
            # 4. City/Town
            city = (
                addr.get("city") or 
                addr.get("town") or 
                addr.get("village") or
                addr.get("municipality")
            )
            if city and city != locality:  # Don't duplicate if same as locality
                components.append(city)
            
            # ✅ Build final address string
            if components:
                address = ", ".join(components)
                # Limit to 250 characters
                if len(address) > 250:
                    address = address[:247] + "..."
                return address
            
            # Fallback to full display_name if components failed
            display_name = data.get("display_name", "")
            if display_name:
                # Truncate very long addresses
                if len(display_name) > 250:
                    # Take first 3 parts of display_name
                    parts = display_name.split(", ")
                    return ", ".join(parts[:4])
                return display_name
        
        elif response.status_code == 429:
            logger.warning(f"Nominatim rate limit hit for {latitude}, {longitude}")
        
        else:
            logger.warning(f"Nominatim returned status {response.status_code} for {latitude}, {longitude}")
        
        # Fallback: return formatted coordinates
        return f"{lat_f:.6f}, {lon_f:.6f}"
    
    except requests.Timeout:
        logger.error(f"Geocoding timeout for {latitude}, {longitude}")
        return f"{latitude}, {longitude}"
    
    except Exception as e:
        logger.error(f"Geocoding error for {latitude}, {longitude}: {str(e)}")
        import traceback
        logger.debug(traceback.format_exc())
        return f"{latitude}, {longitude}"


def clear_geocoding_cache():
    """
    Clear the geocoding cache
    Useful if you want to force fresh lookups
    """
    get_address_from_coordinates.cache_clear()
    logger.info("Geocoding cache cleared")


def get_cache_info():
    """Get information about the geocoding cache"""
    return get_address_from_coordinates.cache_info()