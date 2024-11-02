import requests
from bs4 import BeautifulSoup
import logging
from flask_caching import Cache
from functools import wraps

# Global cache instance - initialized later via init_scraper
cache = None

# Cache configuration
CACHE_TIMEOUT = 1800  # 30 minutes (changed from 1 hour)

def init_scraper(app_cache):
    # Initialize the global cache instance with the application's cache
    global cache
    cache = app_cache
    
    # Clear any existing cache when the server starts
    if cache:
        cache.delete('menus')
        logging.info("[CACHE] Cleared existing cache on startup")

def clear_cache():
    # Manually clear the cache
    if cache:
        cache.delete('menus')
        logging.info("[CACHE] Cache manually cleared")
        return True
    return False

def cached_menu(f):
    # Custom decorator to handle caching of menu data
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if cache is initialized
        if cache is None:
            logging.warning("[WARNING] Cache not initialized, fetching fresh data...")
            return f(*args, **kwargs)
        
        # Try to get data from cache first
        cached_data = cache.get('menus')
        if cached_data is not None:
            logging.info("[CACHE] Using cached lunch menu data")
            return cached_data
        
        # If no cached data found, fetch fresh data
        logging.info("[FRESH] Cache miss - fetching fresh lunch menu data...")
        result = cache.cached(timeout=CACHE_TIMEOUT, key_prefix='menus')(f)(*args, **kwargs)
        return result
    return decorated_function

# Dictionary for restaurant name modifications
restaurant_name_modifications = {
    "Rollin Bistros": "Piren"
}

# Dictionary mapping restaurant names to their Google Maps links and website URLs
restaurant_locations = {
    "Alkemisten Kaffebar & Kafé": {
        "maps": "https://maps.app.goo.gl/HrvVSYgfaqzw7ARf8",
        "website": "https://www.alkemistenkaffebar.se/"
    },
    "Bistrot": {
        "maps": "https://maps.app.goo.gl/avRsfzoVuwcrawUK7",
        "website": "https://www.bistrot.se/"
    },
    "Cuckoo's Nest": {
        "maps": "https://maps.app.goo.gl/g8AkjGt6yr91R9rdA",
        "website": "https://www.cuckoosnest.se/"
    },
    "District One": {
        "maps": "https://maps.app.goo.gl/RwHPDeykZvKpaTL26",
        "website": "https://www.facebook.com/DistrictOneGBG/"
    },
    "Gourmetkorv": {
        "maps": "https://maps.app.goo.gl/jVNY4Jxve1wNLsfXA",
        "website": "https://www.facebook.com/gourmetkorvlindholmen/"
    },
    "Kooperativet": {
        "maps": "https://maps.app.goo.gl/my6t4v54DmjTEBpt6",
        "website": "https://www.kooperativet.com/"
    },
    "L's Kitchen": {
        "maps": "https://maps.app.goo.gl/mmYxMRt4VM4wnR1i8",
        "website": "https://www.lskitchen.se/"
    },
    "L's Resto": {
        "maps": "https://maps.app.goo.gl/RtVkeYh96g2zebqd7",
        "website": "https://www.lsresto.se/"
    },
    "Matminnen": {
        "maps": "https://maps.app.goo.gl/qobKmdY8mWpKQxvCA",
        "website": "https://matminnen.se/"
    },
    "Miss F": {
        "maps": "https://maps.app.goo.gl/bQFos82i7oNAazfv5",
        "website": "https://www.facebook.com/missfgbg/"
    },
    "Restaurant Pier 11 - Ericsson by Nordrest": {
        "maps": "https://maps.app.goo.gl/VMJKfEYDJ6QFrtfn6",
        "website": "https://nordrest.se/"
    },
    "Piren": {
        "maps": "https://maps.app.goo.gl/25UAJZWyC2wp5myh8",
        "website": "https://www.pirengbg.se/"
    },
    "Uni3 – World of Food": {
        "maps": "https://maps.app.goo.gl/4Ec1qUTYguYDXSwz7",
        "website": "https://www.facebook.com/uni3worldoffood/"
    }
}


@cached_menu
def get_cached_menus():
    # Fetch and cache the lunch menus
    logging.info("[SCRAPER] Scraping the site for lunch menus...")
    return scrape_lunchlindholmen()

def scrape_lunchlindholmen():
    # Scrape the Lindholmen lunch menu website
    # Returns a dictionary of restaurant names and their menus
    url = 'https://lindholmen.uit.se/omradet/dagens-lunch?embed-mode=iframe'
    response = requests.get(url)
    
    if response.status_code == 200:
        logging.info("[SUCCESS] Successfully retrieved menu data from website")
        soup = BeautifulSoup(response.text, 'html.parser')
        lunch_menus = {}
        
        # Find the main content div containing all menus
        view_content = soup.find('div', class_='view-content')
        if view_content:
            # Find all restaurant titles
            restaurants = view_content.find_all('h3', class_='title')
            
            # Process each restaurant's menu
            for restaurant in restaurants:
                restaurant_name = restaurant.text.strip()
                
                # Apply name modification if it exists
                display_name = restaurant_name_modifications.get(restaurant_name, restaurant_name)
                
                lunch_menus[display_name] = []
                
                # Get all menu items for this restaurant
                menu_items = restaurant.find_next_sibling('div', class_='table-list__row')
                while menu_items and menu_items.find_previous_sibling('h3', class_='title') == restaurant:
                    # Extract dish details
                    dish_name = menu_items.find('span', class_='dish-name').text.strip()
                    food_type_div = menu_items.find('div', class_='icon-dish')
                    food_type = food_type_div.text.strip() if food_type_div else "Unknown"
                    price_div = menu_items.find('div', class_='table-list__column table-list__column--price')
                    price = price_div.text.strip() if price_div else "Unknown"
                    
                    # Format the menu item with HTML-safe bold tags
                    lunch_menus[display_name].append(f"{food_type}: {dish_name} - {price}")
                    menu_items = menu_items.find_next_sibling('div', class_='table-list__row')
                    
        return lunch_menus
    else:
        logging.error(f"[ERROR] Failed to retrieve menu data. Status code: {response.status_code}")
        return {"Error": "Failed to retrieve menu"}
