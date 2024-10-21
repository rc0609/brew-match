import os
import requests
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection string
MONGO_URI = os.getenv(
    "MONGO_URI")  # e.g., mongodb+srv://coffeeAdmin:password@cluster0.mongodb.net/coffee_shop_db?retryWrites=true&w=majority

# Initialize MongoDB client
client = MongoClient(MONGO_URI)
db = client['coffee_shop_db']
collection = db['coffee_shops']

# Google Places API key
API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")  # Ensure this is set in your .env file


def fetch_coffee_shops(latitude, longitude, radius=1500, max_results=60):
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{latitude},{longitude}",
        "radius": radius,
        "type": "cafe",
        "keyword": "coffee",
        "key": API_KEY
    }

    results = []
    while True:
        response = requests.get(url, params=params)
        if response.status_code != 200:
            print(f"Error fetching data: {response.text}")
            break

        data = response.json()
        results.extend(data.get('results', []))

        if 'next_page_token' in data and len(results) < max_results:
            # Wait for a short period to allow the next_page_token to become valid
            import time
            time.sleep(2)
            params['pagetoken'] = data['next_page_token']
        else:
            break

    return results[:max_results]


def store_coffee_shops(places):
    for place in places:
        # Extract relevant fields
        coffee_shop = {
            "place_id": place.get("place_id"),
            "name": place.get("name"),
            "latitude": place["geometry"]["location"]["lat"],
            "longitude": place["geometry"]["location"]["lng"],
            "address": place.get("vicinity"),
            "rating": place.get("rating", 0),
            "user_ratings_total": place.get("user_ratings_total", 0),
            "types": place.get("types", []),
            "price_level": place.get("price_level", 0),
            "timestamp": datetime.utcnow()
        }

        # Upsert to avoid duplicates
        collection.update_one(
            {"place_id": coffee_shop["place_id"]},
            {"$set": coffee_shop},
            upsert=True
        )
    print(f"Stored {len(places)} coffee shops.")


def retrieve_coffee_shops(limit=5):
    shops = list(collection.find({}, {'_id': 0}).limit(limit))
    return shops


if __name__ == "__main__":
    # Example coordinates (replace with dynamic input or configuration)
    latitude = 40.7128  # New York City latitude
    longitude = -74.0060  # New York City longitude

    # Fetch coffee shops
    places = fetch_coffee_shops(latitude, longitude)
    print(f"Fetched {len(places)} coffee shops.")

    # Store in MongoDB
    store_coffee_shops(places)

    # Retrieve and print
    retrieved_shops = retrieve_coffee_shops()
    for shop in retrieved_shops:
        print(shop)