from flask import Blueprint, render_template, request, redirect, url_for, flash
from .scraper import (
    get_cached_menus, 
    restaurant_locations, 
    clear_cache,
    restaurant_name_modifications
)
import logging

# Create a Blueprint for our main routes
main = Blueprint('main', __name__)

# Add new route for cache clearing
@main.route('/clear-cache')
def clear_cache_route():
    if clear_cache():
        logging.info("[CACHE] Cache cleared via web request")
        # Force a new fetch of menus
        get_cached_menus()
        return redirect(url_for('main.home'))
    return "Failed to clear cache", 500

@main.route('/', methods=['GET', 'POST'])
def home():
    # Main route handler for the homepage
    # Handles both GET and POST requests for menu filtering
    
    # Handle POST request (form submission)
    if request.method == 'POST':
        selected_food_type = request.form.get('food_type')
        selected_search_term = request.form.get('search_term')
        selected_restaurants = request.form.getlist('restaurants[]')
        # Redirect to GET request with selected filters
        return redirect(url_for('main.home', 
                              food_type=selected_food_type, 
                              search_term=selected_search_term, 
                              restaurants=selected_restaurants))
    
    # Handle GET request (page load or redirect from POST)
    selected_food_type = request.args.get('food_type')
    selected_search_term = request.args.get('search_term')
    selected_restaurants = request.args.getlist('restaurants')
    
    # Get menus and apply filters
    menus = get_cached_menus()
    food_types = get_food_types(menus)
    filtered_menus = filter_menus_by_food_type(menus, selected_food_type)
    filtered_menus = filter_menus_by_search_term(filtered_menus, selected_search_term)
    
    # Add debug logging
    logging.debug(f"Available restaurants: {list(filtered_menus.keys())}")
    logging.debug(f"Restaurant locations: {list(restaurant_locations.keys())}")
    
    # Create linked_restaurants dictionary
    linked_restaurants = {
        restaurant: {
            "menu": menu,
            "maps_link": restaurant_locations.get(restaurant, {}).get("maps"),
            "website": restaurant_locations.get(restaurant, {}).get("website"),
            "review_score": restaurant_locations.get(restaurant, {}).get("review_score")
        }
        for restaurant, menu in filtered_menus.items()
    }
    
    logging.debug(f"Linked restaurants: {list(linked_restaurants.keys())}")
    
    return render_template('index.html',
                         menus=filtered_menus,
                         food_types=food_types,
                         selected_food_type=selected_food_type,
                         selected_search_term=selected_search_term,
                         selected_restaurants=selected_restaurants,
                         linked_restaurants=linked_restaurants)

def get_food_types(menus):
    # Extract and sort unique food types from all menus
    food_types = set()
    for menu in menus.values():
        for dish in menu:
            food_type = dish.split(':')[0]
            food_types.add(food_type)
    return sorted(food_types)

def filter_menus_by_food_type(menus, food_type):
    # Filter menus to show only dishes of a specific food type
    if not food_type:
        return menus
    filtered_menus = {}
    for restaurant, menu in menus.items():
        filtered_menu = [dish for dish in menu if dish.startswith(food_type)]
        if filtered_menu:
            filtered_menus[restaurant] = filtered_menu
    return filtered_menus

def filter_menus_by_search_term(menus, search_term):
    # Filter menus based on predefined search terms
    # Includes variations of common food items in Swedish and English
    if not search_term:
        return menus
    
    # Dictionary of search terms and their variations
    search_terms = {
        'burgare': ['burger', 'högrevsburgare', 'hamburgare', 'cheeseburger', 
                   'veggieburger', 'veganburger', 'halloumiburger'],
        'mos': ['potatismos', 'mos', 'potatispure', 'potatispuré', 'smashed potatoes'],
        'körv': ['korv', 'falukorv', 'wienerkorv', 'prinskorv', 'chorizo', 
                'grillkorv', 'braadwurst']
    }
    
    terms = search_terms.get(search_term, [])
    filtered_menus = {}
    for restaurant, menu in menus.items():
        filtered_menu = [dish for dish in menu if any(term in dish.lower() for term in terms)]
        if filtered_menu:
            filtered_menus[restaurant] = filtered_menu
    return filtered_menus
