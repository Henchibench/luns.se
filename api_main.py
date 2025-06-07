from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
import logging
import os
from datetime import datetime

# Import existing Flask app functionality
from app.scraper import get_cached_menus, clear_cache, init_scraper
from app.restaurant_data import restaurant_locations, LOCATIONS
from app.routes import (
    get_food_types, 
    filter_menus_by_search_terms,
    get_current_day_index,
    is_weekend
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize cache for FastAPI app
from flask_caching import Cache

# Create a simple in-memory cache for FastAPI
class SimpleCache:
    def __init__(self):
        self._cache = {}
    
    def get(self, key):
        return self._cache.get(key)
    
    def set(self, key, value, timeout=None):
        self._cache[key] = value
    
    def delete(self, key):
        if key in self._cache:
            del self._cache[key]

# Initialize the cache
fastapi_cache = SimpleCache()
init_scraper(fastapi_cache)

# Create FastAPI app
app = FastAPI(
    title="Luns.se API",
    description="Modern REST API for Lindholmen lunch menus",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Luns.se API",
        "version": "2.0.0",
        "description": "Modern REST API for Lindholmen lunch menus",
        "endpoints": {
            "menus": "/menus",
            "restaurants": "/restaurants",
            "food_types": "/food-types",
            "cache": "/cache"
        }
    }

@app.get("/menus")
async def get_menus(
    locations: Optional[List[str]] = Query(None),
    food_types: Optional[List[str]] = Query(None),
    search_terms: Optional[List[str]] = Query(None),
    restaurants: Optional[List[str]] = Query(None)
) -> Dict[str, Any]:
    """Get filtered lunch menus"""
    try:
        # Get all menus
        menus = get_cached_menus()
        
        # Apply location filter
        if locations:
            menus = {
                restaurant: menu 
                for restaurant, menu in menus.items() 
                if restaurant_locations.get(restaurant, {}).get('area') in locations
            }
        
        # Apply restaurant filter
        if restaurants:
            menus = {k: v for k, v in menus.items() if k in restaurants}
        
        # Apply food type filter
        if food_types:
            filtered_menus = {}
            for restaurant, menu in menus.items():
                filtered_menu = []
                info_items = []
                has_matching_dishes = False
                
                for dish in menu:
                    if dish.startswith('INFO:'):
                        info_items.append(dish)
                    else:
                        food_type = dish.split('</strong>')[0].split('>')[-1] if '<strong>' in dish else dish.split(':')[0]
                        if food_type in food_types:
                            filtered_menu.append(dish)
                            has_matching_dishes = True
                
                if has_matching_dishes:
                    filtered_menus[restaurant] = info_items + filtered_menu
            menus = filtered_menus
        
        # Apply search terms filter
        if search_terms:
            menus = filter_menus_by_search_terms(menus, search_terms)
        
        return {
            "menus": menus,
            "metadata": {
                "total_restaurants": len(menus),
                "current_day_index": get_current_day_index(),
                "is_weekend": is_weekend(),
                "filters_applied": {
                    "locations": locations or [],
                    "food_types": food_types or [],
                    "search_terms": search_terms or [],
                    "restaurants": restaurants or []
                }
            }
        }
    
    except Exception as e:
        logger.error(f"Error getting menus: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/restaurants")
async def get_restaurants():
    """Get all restaurant information"""
    try:
        menus = get_cached_menus()
        restaurants = {}
        
        for restaurant_name in menus.keys():
            restaurant_info = restaurant_locations.get(restaurant_name, {})
            restaurants[restaurant_name] = {
                "name": restaurant_name,
                "area": restaurant_info.get('area', 'Unknown'),
                "website": restaurant_info.get('website'),
                "maps": restaurant_info.get('maps'),
                "instagram": restaurant_info.get('instagram'),
                "review_score": restaurant_info.get('review_score'),
                "has_menu": True
            }
        
        return {
            "restaurants": restaurants,
            "total": len(restaurants)
        }
    
    except Exception as e:
        logger.error(f"Error getting restaurants: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/food-types")
async def get_available_food_types():
    """Get all available food types"""
    try:
        menus = get_cached_menus()
        food_types = get_food_types(menus)
        
        return {
            "food_types": food_types,
            "total": len(food_types)
        }
    
    except Exception as e:
        logger.error(f"Error getting food types: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/locations")
async def get_locations():
    """Get all available locations"""
    return {
        "locations": list(LOCATIONS.keys()),
        "total": len(LOCATIONS)
    }

@app.get("/cache/status")
async def cache_status():
    """Get cache status information"""
    try:
        menus = get_cached_menus()
        return {
            "cache_active": True,
            "restaurants_cached": len(menus),
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting cache status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/cache/clear")
async def clear_cache_endpoint():
    """Clear the menu cache"""
    try:
        clear_cache()
        return {"message": "Cache cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 