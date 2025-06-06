from flask_caching import Cache
from functools import wraps
import logging
from .scrapers.restaurants.bistrot_scraper import BistrotScraper
from .scrapers.restaurants.kooperativet_scraper import KooperativetScraper
from .scrapers.restaurants.pier11_scraper import Pier11Scraper
from .scrapers.restaurants.district_one_scraper import DistrictOneScraper
# Import other restaurant scrapers as they are created

# Global cache instance
cache = None
CACHE_TIMEOUT = 1800  # 30 minutes

def init_scraper(app_cache):
    global cache
    cache = app_cache
    if cache:
        cache.delete('menus')
        logging.info("[CACHE] Cleared existing cache on startup")

def clear_cache():
    if cache:
        cache.delete('menus')
        logging.info("[CACHE] Cache manually cleared")
        return True
    return False

def cached_menu(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if cache is None:
            logging.warning("[WARNING] Cache not initialized, fetching fresh data...")
            return f(*args, **kwargs)
        
        cached_data = cache.get('menus')
        if cached_data is not None:
            logging.info("[CACHE] Using cached lunch menu data")
            return cached_data
        
        logging.info("[FRESH] Cache miss - fetching fresh lunch menu data...")
        result = cache.cached(timeout=CACHE_TIMEOUT, key_prefix='menus')(f)(*args, **kwargs)
        return result
    return decorated_function

@cached_menu
def get_cached_menus():
    logging.info("[SCRAPER] Scraping sites for lunch menus...")
    menus = {}
    
    # List of scraper instances
    scrapers = [
        BistrotScraper(),
        KooperativetScraper(),
        Pier11Scraper(),
        DistrictOneScraper(),
        # Add other restaurant scrapers here as they are created
    ]
    
    # Execute all scrapers
    for scraper in scrapers:
        try:
            result = scraper.scrape()
            menus.update(result)
        except Exception as e:
            logging.error(f"Error scraping {scraper.name}: {str(e)}")
            menus[scraper.name] = [f"Error: {str(e)}"]
    
    return menus
