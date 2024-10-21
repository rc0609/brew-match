import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from a .env file (optional but recommended)
load_dotenv()

# Retrieve the connection string from environment variables
MONGO_URI = os.getenv("MONGO_URI")  # e.g., mongodb+srv://coffeeAdmin:password@cluster0.mongodb.net/coffee_shop_db?retryWrites=true&w=majority

# Initialize MongoDB client
client = MongoClient(MONGO_URI)

# Access the database
db = client['coffee_shop_db']  # Replace with your database name

# Access a collection
collection = db['coffee_shops']  # Replace with your collection name

# Example: Insert a document
coffee_shop = {
    "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "name": "Coffee Shop A",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "123 Coffee St, New York, NY",
    "rating": 4.5,
    "user_ratings_total": 150,
    "types": ["cafe", "food", "point_of_interest", "establishment"],
    "price_level": 2,
    "timestamp": "2023-10-15T12:00:00Z"
}

# Insert the document
result = collection.insert_one(coffee_shop)
print(f"Inserted document with _id: {result.inserted_id}")

# Example: Retrieve documents
for shop in collection.find().limit(5):
    print(shop)