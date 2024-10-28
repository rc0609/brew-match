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
    for shop in request.coffee_shops:

        shop_dict = shop.dict()

        try:
            collection.update_one(
                {"name": shop_dict["name"], "location.latitude": shop_dict["location"]["latitude"], "location.longitude": shop_dict["location"]["longitude"]},
                {"$set": shop_dict},
                upsert=True
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error storing coffee shop '{shop.name}': {str(e)}")

    return {"message": "Coffee shops stored successfully."}

async def append_to_csv(document):

    csv_file = 'coffee_shops.csv'


    headers = [
        "name", "latitude", "longitude", "rating", "userRatingCount",
        "priceLevel", "types", "formattedAddress", "businessStatus",
        "currentOpeningHours", "servesCoffee", "servesDessert",
        "servesBreakfast", "liveMusic", "takeout", "delivery",
        "dineIn", "paymentOptions", "parkingOptions", "accessibilityOptions"
    ]


    row = {
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
    headers = [
        "name", "latitude", "longitude", "rating", "userRatingCount",
        "priceLevel", "types", "formattedAddress", "businessStatus",
        "currentOpeningHours", "servesCoffee", "servesDessert",
        "servesBreakfast", "liveMusic", "takeout", "delivery",
        "dineIn", "paymentOptions", "parkingOptions", "accessibilityOptions"
    ]

    file_exists = os.path.isfile(csv_file)

    if not file_exists:
        logger.info("Performing initial export of existing coffee shops.")
        try:
            with open(csv_file, mode='w', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=headers)
                writer.writeheader()

                for shop in collection.find():
                    row = {
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
            logger.info("Initial export completed.")
        except Exception as e:
            logger.error(f"Failed during initial export: {str(e)}")

@app.on_event("startup")
async def startup_event():

    await initial_export()

    executor = ThreadPoolExecutor(max_workers=1)
    executor.submit(watch_coffee_shops_sync)
    logger.info("Startup event completed: Change stream listener started.")