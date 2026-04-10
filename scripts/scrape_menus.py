"""Standalone scraper script for GitHub Actions.

Runs all restaurant scrapers and writes static JSON files
that the Next.js frontend reads at runtime.

If a scraper fails, falls back to the previous data from the live site.
"""

import json
import logging
import os
import sys
import time
from datetime import datetime

import requests

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

LIVE_MENUS_URL = "https://luns.se/data/menus.json"

MAX_RETRIES = 2
RETRY_DELAY = 3  # seconds


def load_previous_menus():
    """Fetch the currently live menu data as fallback."""
    try:
        resp = requests.get(LIVE_MENUS_URL, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        logger.info(f"[FALLBACK] Loaded previous data with {len(data.get('menus', {}))} restaurants")
        return data.get("menus", {})
    except Exception as e:
        logger.warning(f"[FALLBACK] Could not load previous data: {e}")
        return {}


def is_scrape_failure(items):
    """Check if scraper returned an error/fallback message instead of real data."""
    if len(items) == 1:
        msg = items[0]
        return (msg.startswith("Kunde inte") or msg.startswith("Ett fel")
                or msg.startswith("Ingen lunch") or msg.startswith("Error:"))
    return False


def scrape_with_retry(scraper):
    """Run a scraper with retries and backoff."""
    for attempt in range(MAX_RETRIES + 1):
        try:
            result = scraper.scrape()
            items = result.get(scraper.name, [])
            if is_scrape_failure(items) and attempt < MAX_RETRIES:
                delay = RETRY_DELAY + attempt
                logger.warning(f"[RETRY] {scraper.name}: got fallback message, retrying in {delay}s (attempt {attempt + 1}/{MAX_RETRIES})...")
                time.sleep(delay)
                continue
            return result
        except Exception as e:
            if attempt < MAX_RETRIES:
                delay = RETRY_DELAY + attempt
                logger.warning(f"[RETRY] {scraper.name}: {e}, retrying in {delay}s (attempt {attempt + 1}/{MAX_RETRIES})...")
                time.sleep(delay)
            else:
                raise
    return scraper.scrape()


def scrape_all_menus(previous_menus):
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
            result = scrape_with_retry(scraper)
            items = result.get(scraper.name, [])

            if is_scrape_failure(items) and scraper.name in previous_menus:
                logger.warning(f"[FALLBACK] {scraper.name}: using previous data")
                menus[scraper.name] = previous_menus[scraper.name]
            else:
                menus.update(result)
                logger.info(f"[OK] {scraper.name}: {len(items)} items")
        except Exception as e:
            if scraper.name in previous_menus:
                logger.warning(f"[FALLBACK] {scraper.name}: {e} — using previous data")
                menus[scraper.name] = previous_menus[scraper.name]
            else:
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

    previous_menus = load_previous_menus()

    logger.info("Starting menu scrape...")
    menus = scrape_all_menus(previous_menus)

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
