from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from models import CoffeeShop
import os
import logging
import csv
import asyncio
from concurrent.futures import ThreadPoolExecutor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

app = FastAPI()
origins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI not found in environment variables.")

client = MongoClient(MONGO_URI)
db = client['coffee_shop_db']
collection = db['coffee_shops']

csv_lock = asyncio.Lock()

class StoreRequest(BaseModel):
    coffee_shops: List[CoffeeShop]

@app.post("/api/store-coffee-shops/")
def store_coffee_shops(request: StoreRequest):
    new_shops = 0
    for shop in request.coffee_shops:
        shop_dict = shop.dict()

        # Check if shop already exists
        existing_shop = collection.find_one({"id": shop_dict["id"]})

        if not existing_shop:
            try:
                collection.insert_one(shop_dict)
                new_shops += 1
                logger.info(f"Added new coffee shop: {shop.name}")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error storing coffee shop '{shop.name}': {str(e)}")
        else:
            logger.info(f"Skipped duplicate coffee shop: {shop.name}")

    return {
        "message": f"Process completed. Added {new_shops} new coffee shops. {len(request.coffee_shops) - new_shops} duplicates skipped."
    }


async def append_to_csv(document):
    csv_file = 'coffee_shops.csv'

    # First check if this ID already exists in the CSV
    exists = False
    if os.path.exists(csv_file):
        try:
            with open(csv_file, mode='r', newline='', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                exists = any(row.get('id') == document.get('id') for row in reader)
        except Exception as e:
            logger.error(f"Error checking CSV for duplicates: {str(e)}")

    if exists:
        logger.info(f"Skipped duplicate CSV entry for: {document.get('name')}")
        return

    headers = [
        "id",
        "name",
        "latitude",
        "longitude",
        "rating",
        "userRatingCount",
        "priceLevel",
        "types",
        "formattedAddress",
        "businessStatus",
        "currentOpeningHours",
        "servesCoffee",
        "servesDessert",
        "servesBreakfast",
        "liveMusic",
        "takeout",
        "delivery",
        "dineIn",
        "paymentOptions",
        "parkingOptions",
        "accessibilityOptions"
    ]

    row = {
        "id": document.get("id", ""),
        "name": document.get("name", ""),
        "latitude": document.get("location", {}).get("latitude", ""),
        "longitude": document.get("location", {}).get("longitude", ""),
        "rating": document.get("rating", ""),
        "userRatingCount": document.get("userRatingCount", ""),
        "priceLevel": document.get("priceLevel", ""),
        "types": ";".join(document.get("types", [])),
        "formattedAddress": document.get("formattedAddress", ""),
        "businessStatus": document.get("businessStatus", ""),
        "currentOpeningHours": str(document.get("currentOpeningHours", {})),
        "servesCoffee": document.get("servesCoffee", False),
        "servesDessert": document.get("servesDessert", False),
        "servesBreakfast": document.get("servesBreakfast", False),
        "liveMusic": document.get("liveMusic", False),
        "takeout": document.get("takeout", False),
        "delivery": document.get("delivery", False),
        "dineIn": document.get("dineIn", False),
        "paymentOptions": str(document.get("paymentOptions", {})),
        "parkingOptions": str(document.get("parkingOptions", {})),
        "accessibilityOptions": str(document.get("accessibilityOptions", {})),
    }

    async with csv_lock:
        file_exists = os.path.isfile(csv_file)
        try:
            with open(csv_file, mode='a', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=headers)
                if not file_exists:
                    writer.writeheader()
                writer.writerow(row)
                logger.info(f"Appended coffee shop '{row['name']}' to CSV.")
        except Exception as e:
            logger.error(f"Failed to write to CSV: {str(e)}")

def watch_coffee_shops_sync():
    logger.info("Starting change stream listener for 'coffee_shops' collection.")
    try:
        with collection.watch([{'$match': {'operationType': 'insert'}}]) as stream:
            for change in stream:
                full_document = change['fullDocument']
                logger.info(f"New coffee shop inserted: {full_document['name']}")
                asyncio.run(append_to_csv(full_document))
    except PyMongoError as e:
        logger.error(f"Change stream error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in change stream: {str(e)}")


async def initial_export():
    csv_file = 'coffee_shops.csv'

    # Get unique documents from MongoDB
    unique_shops = list(collection.find())
    unique_ids = set()
    filtered_shops = []

    # Filter out duplicates based on ID
    for shop in unique_shops:
        if shop.get('id') not in unique_ids:
            unique_ids.add(shop.get('id'))
            filtered_shops.append(shop)

    headers = [
        "id",
        "name",
        "latitude",
        "longitude",
        "rating",
        "userRatingCount",
        "priceLevel",
        "types",
        "formattedAddress",
        "businessStatus",
        "currentOpeningHours",
        "servesCoffee",
        "servesDessert",
        "servesBreakfast",
        "liveMusic",
        "takeout",
        "delivery",
        "dineIn",
        "paymentOptions",
        "parkingOptions",
        "accessibilityOptions"
    ]

    file_exists = os.path.isfile(csv_file)

    if not file_exists:
        logger.info("Performing initial export of existing coffee shops.")
        try:
            with open(csv_file, mode='w', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=headers)
                writer.writeheader()

                for shop in filtered_shops:
                    row = {
                        "id": shop.get("id", ""),
                        "name": shop.get("name", ""),
                        "latitude": shop.get("location", {}).get("latitude", ""),
                        "longitude": shop.get("location", {}).get("longitude", ""),
                        "rating": shop.get("rating", ""),
                        "userRatingCount": shop.get("userRatingCount", ""),
                        "priceLevel": shop.get("priceLevel", ""),
                        "types": ";".join(shop.get("types", [])),
                        "formattedAddress": shop.get("formattedAddress", ""),
                        "businessStatus": shop.get("businessStatus", ""),
                        "currentOpeningHours": str(shop.get("currentOpeningHours", {})),
                        "servesCoffee": shop.get("servesCoffee", False),
                        "servesDessert": shop.get("servesDessert", False),
                        "servesBreakfast": shop.get("servesBreakfast", False),
                        "liveMusic": shop.get("liveMusic", False),
                        "takeout": shop.get("takeout", False),
                        "delivery": shop.get("delivery", False),
                        "dineIn": shop.get("dineIn", False),
                        "paymentOptions": str(shop.get("paymentOptions", {})),
                        "parkingOptions": str(shop.get("parkingOptions", {})),
                        "accessibilityOptions": str(shop.get("accessibilityOptions", {})),
                    }
                    writer.writerow(row)
            logger.info(f"Initial export completed. Exported {len(filtered_shops)} unique coffee shops.")
        except Exception as e:
            logger.error(f"Failed during initial export: {str(e)}")

@app.on_event("startup")
async def startup_event():

    await initial_export()

    executor = ThreadPoolExecutor(max_workers=1)
    executor.submit(watch_coffee_shops_sync)
    logger.info("Startup event completed: Change stream listener started.")