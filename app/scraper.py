from flask_caching import Cache
from functools import wraps
import logging
from datetime import datetime, time
from .scrapers.restaurants.bistrot_scraper import BistrotScraper
from .scrapers.restaurants.kooperativet_scraper import KooperativetScraper
from .scrapers.restaurants.pier11_scraper import Pier11Scraper
from .scrapers.restaurants.district_one_scraper import DistrictOneScraper
# Import other restaurant scrapers as they are created

# Global cache instance
cache = None

# Scheduled refresh times (24-hour format)
REFRESH_TIMES = [
    time(7, 0),   # 07:00
    time(8, 0),   # 08:00
    time(10, 0),  # 10:00
]

def init_scraper(app_cache):
    global cache
    cache = app_cache
    if cache:
        cache.delete('menus')
        cache.delete('last_refresh_time')
        logging.info("[CACHE] Cleared existing cache on startup")

def clear_cache():
    if cache:
        cache.delete('menus')
        cache.delete('last_refresh_time')
        logging.info("[CACHE] Cache manually cleared")
        return True
    return False

def should_refresh_cache():
    """Check if cache should be refreshed based on scheduled times"""
    if cache is None:
        return True
    
    # Get last refresh time
    last_refresh = cache.get('last_refresh_time')
    now = datetime.now()
    current_time = now.time()
    
    # If no last refresh time, refresh immediately
    if last_refresh is None:
        logging.info("[SCHEDULE] No previous refresh time found, refreshing cache")
        return True
    
    # Check if we've passed any scheduled refresh time since last refresh
    for refresh_time in REFRESH_TIMES:
        # Create datetime objects for comparison
        today_refresh = datetime.combine(now.date(), refresh_time)
        
        # If current time is past this refresh time AND last refresh was before this refresh time
        if (current_time >= refresh_time and 
            last_refresh < today_refresh):
            logging.info(f"[SCHEDULE] Cache refresh needed - current time {current_time.strftime('%H:%M')} >= scheduled time {refresh_time.strftime('%H:%M')}")
            return True
    
    # Check if it's a new day and we need the first refresh
    if last_refresh.date() < now.date():
        # New day - check if current time is past first refresh time
        if current_time >= REFRESH_TIMES[0]:
            logging.info("[SCHEDULE] New day detected, refreshing cache")
            return True
    
    logging.info(f"[SCHEDULE] Cache is current - last refresh: {last_refresh.strftime('%Y-%m-%d %H:%M:%S')}")
    return False

def cached_menu(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if cache is None:
            logging.warning("[WARNING] Cache not initialized, fetching fresh data...")
            return f(*args, **kwargs)
        
        # Check if we need to refresh based on schedule
        if should_refresh_cache():
            # Clear existing cache and fetch fresh data
            cache.delete('menus')
            logging.info("[FRESH] Scheduled refresh - fetching fresh lunch menu data...")
            result = f(*args, **kwargs)
            
            # Store the data and refresh time
            cache.set('menus', result, timeout=0)  # No timeout - only refresh on schedule
            cache.set('last_refresh_time', datetime.now(), timeout=0)
            logging.info(f"[CACHE] Data cached and refresh time updated to {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            return result
        
        # Use cached data
        cached_data = cache.get('menus')
        if cached_data is not None:
            logging.info("[CACHE] Using cached lunch menu data")
            return cached_data
        
        # Fallback - should not happen with the new logic, but safety net
        logging.warning("[WARNING] Cache miss despite schedule check - fetching fresh data...")
        result = f(*args, **kwargs)
        cache.set('menus', result, timeout=0)
        cache.set('last_refresh_time', datetime.now(), timeout=0)
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

def get_next_refresh_time():
    """Get the next scheduled refresh time for debugging/status"""
    now = datetime.now()
    current_time = now.time()
    
    # Find next refresh time today
    for refresh_time in REFRESH_TIMES:
        if current_time < refresh_time:
            return datetime.combine(now.date(), refresh_time)
    
    # If all today's refresh times have passed, return first refresh time tomorrow
    from datetime import timedelta
    tomorrow = now.date() + timedelta(days=1)
    return datetime.combine(tomorrow, REFRESH_TIMES[0])
