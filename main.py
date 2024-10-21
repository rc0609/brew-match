from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from pymongo import MongoClient
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from models import CoffeeShop

app = FastAPI()
origins = [
    "http://localhost:5500",  # Frontend origin
    "http://127.0.0.1:5500",  # Alternative frontend origin
    # Add other origins if necessary
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # **[MODIFIED]** Allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI not found in environment variables.")

client = MongoClient(MONGO_URI)
db = client['coffee_shop_db']  # Database name
collection = db['coffee_shops']  # Collection name

class StoreRequest(BaseModel):
    coffee_shops: List[CoffeeShop]

@app.post("/api/store-coffee-shops/")
def store_coffee_shops(request: StoreRequest):
    for shop in request.coffee_shops:
        # Convert Pydantic model to dictionary
        shop_dict = shop.dict()

        # Upsert the coffee shop into MongoDB to prevent duplicates
        try:
            collection.update_one(
                {"name": shop_dict["name"], "location.latitude": shop_dict["location"]["latitude"], "location.longitude": shop_dict["location"]["longitude"]},
                {"$set": shop_dict},
                upsert=True
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error storing coffee shop '{shop.name}': {str(e)}")

    return {"message": "Coffee shops stored successfully."}