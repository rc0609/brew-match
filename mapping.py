from typing import Dict, Any
from models import CoffeeShop
from price_level_mapping import PRICE_LEVEL_MAPPING


def map_price_level(place_data: Dict[str, Any]) -> (int, bool):
    """
    Maps the Google Places API price_level to the desired numerical value.
    Determines if the place is free based on specific criteria.

    Args:
        place_data (Dict[str, Any]): The place data from Google Places API.

    Returns:
        tuple: Mapped price level and is_free flag.
    """
    google_price_level = place_data.get("price_level", 0)
    price_level = PRICE_LEVEL_MAPPING.get(google_price_level, 0)  # Default to 0 if not found

    # Determine if the place is free
    # Example criteria: If 'free' is in the name or types include 'free'
    is_free = False
    name = place_data.get("name", "").lower()
    types = place_data.get("types", [])

    if "free" in name:
        is_free = True
    if "free" in [t.lower() for t in types]:
        is_free = True

    # If the place is free, override the price_level to 6
    if is_free:
        price_level = 6

    return price_level, is_free