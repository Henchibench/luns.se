"""Standalone scraper script for GitHub Actions.

Runs all restaurant scrapers and writes static JSON files
that the Next.js frontend reads at runtime.
"""

import json
import logging
import os
import sys
from datetime import datetime

# Add project root to path so we can import the scraper modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.scrapers.restaurants.bistrot_scraper import BistrotScraper
from app.scrapers.restaurants.bombay_bistro_scraper import BombayBistroScraper
from app.scrapers.restaurants.kooperativet_scraper import KooperativetScraper
from app.scrapers.restaurants.pier11_scraper import Pier11Scraper
from app.scrapers.restaurants.district_one_scraper import DistrictOneScraper
from app.scrapers.restaurants.uni3_scraper import Uni3Scraper
from app.restaurant_data import restaurant_locations

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

OUTPUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "nextjs-luns-se", "public", "data"
)


def scrape_all_menus():
    """Run all scrapers and return the combined menus dict."""
    scrapers = [
        BistrotScraper(),
        BombayBistroScraper(),
        KooperativetScraper(),
        Pier11Scraper(),
        DistrictOneScraper(),
        Uni3Scraper(),
    ]

    menus = {}
    for scraper in scrapers:
        try:
            result = scraper.scrape()
            menus.update(result)
            logger.info(f"[OK] {scraper.name}: {len(result.get(scraper.name, []))} items")
        except Exception as e:
            logger.error(f"[FAIL] {scraper.name}: {e}")
            menus[scraper.name] = [f"Error: {e}"]

    return menus


def build_restaurants_response(menus):
    """Build the restaurants JSON matching the /restaurants API shape."""
    restaurants = {}
    for restaurant_name in menus.keys():
        info = restaurant_locations.get(restaurant_name, {})
        restaurants[restaurant_name] = {
            "name": restaurant_name,
            "area": info.get("area", "Unknown"),
            "website": info.get("website"),
            "maps": info.get("maps"),
            "instagram": info.get("instagram"),
            "review_score": info.get("review_score"),
            "has_menu": True,
        }
    return {"restaurants": restaurants, "total": len(restaurants)}


def build_menus_response(menus):
    """Build the menus JSON matching the /menus API shape."""
    now = datetime.now()
    day_index = now.weekday()  # 0=Monday ... 6=Sunday
    return {
        "menus": menus,
        "metadata": {
            "total_restaurants": len(menus),
            "current_day_index": day_index,
            "is_weekend": day_index >= 5,
            "filters_applied": {
                "locations": [],
                "food_types": [],
                "search_terms": [],
                "restaurants": [],
            },
        },
        "scrape_timestamp": now.isoformat(),
    }


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    logger.info("Starting menu scrape...")
    menus = scrape_all_menus()

    menus_data = build_menus_response(menus)
    restaurants_data = build_restaurants_response(menus)
    restaurants_data["scrape_timestamp"] = menus_data["scrape_timestamp"]

    menus_path = os.path.join(OUTPUT_DIR, "menus.json")
    restaurants_path = os.path.join(OUTPUT_DIR, "restaurants.json")

    with open(menus_path, "w", encoding="utf-8") as f:
        json.dump(menus_data, f, ensure_ascii=False, indent=2)
    logger.info(f"Wrote {menus_path}")

    with open(restaurants_path, "w", encoding="utf-8") as f:
        json.dump(restaurants_data, f, ensure_ascii=False, indent=2)
    logger.info(f"Wrote {restaurants_path}")

    logger.info(f"Done — {len(menus)} restaurants scraped.")


if __name__ == "__main__":
    main()
