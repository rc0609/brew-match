from pydantic import BaseModel
from typing import List, Optional

class Location(BaseModel):
    latitude: Optional[float]
    longitude: Optional[float]

class CoffeeShop(BaseModel):
    name: str
    location: Location
    rating: float
    userRatingCount: int
    priceLevel: int  # Changed from str to int
    types: List[str]
    formattedAddress: str
    businessStatus: str
    currentOpeningHours: Optional[dict] = {}
    servesCoffee: bool
    servesDessert: bool
    servesBreakfast: bool
    liveMusic: bool
    takeout: bool
    delivery: bool
    dineIn: bool
    paymentOptions: Optional[dict] = {}
    parkingOptions: Optional[dict] = {}
    accessibilityOptions: Optional[dict] = {}