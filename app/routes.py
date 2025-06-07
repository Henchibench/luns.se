from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from markupsafe import Markup
from .restaurant_data import LOCATIONS, restaurant_locations
from .scraper import get_cached_menus, clear_cache
import logging
from datetime import datetime

# Create a Blueprint for our main routes
main = Blueprint('main', __name__)

def get_current_day_index():
    """Get current day index (0=Monday, 4=Friday)
    
    Returns:
        int: Day index where 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday
             Weekends (Saturday/Sunday) default to Monday (0)
    """
    today = datetime.now().weekday()  # 0=Monday, 6=Sunday
    if today > 4:  # Weekend (Saturday=5, Sunday=6)
        return 0  # Default to Monday for weekends
    return today

def is_weekend():
    """Check if today is a weekend (Saturday or Sunday)
    
    Returns:
        bool: True if today is Saturday or Sunday, False otherwise
    """
    today = datetime.now().weekday()  # 0=Monday, 6=Sunday
    return today > 4  # Weekend (Saturday=5, Sunday=6)

def get_linked_restaurants(menus):
    """Get restaurant information for the restaurants in the menu"""
    from .restaurant_data import restaurant_locations
    
    linked_restaurants = {}
    for restaurant in menus.keys():
        if restaurant in restaurant_locations:
            linked_restaurants[restaurant] = restaurant_locations[restaurant]
    return linked_restaurants

@main.route('/', methods=['GET'])
def home():
    # Get selected filters
    selected_location = request.args.get('location', '')
    selected_locations = request.args.getlist('locations[]')
    if selected_location and not selected_locations:  # Handle single location selection
        selected_locations = [selected_location]
    selected_food_types = request.args.getlist('food_types[]')
    selected_search_terms = request.args.getlist('search_terms[]')
    filtered_restaurants = request.args.getlist('restaurants[]')
    
    # Get menus and apply filters
    menus = get_cached_menus()
    
    # Filter by location
    if selected_locations:
        menus = {
            restaurant: menu 
            for restaurant, menu in menus.items() 
            if restaurant_locations.get(restaurant, {}).get('area') in selected_locations
        }
    
    # Filter by restaurants
    if filtered_restaurants:
        menus = {k: v for k, v in menus.items() if k in filtered_restaurants}
    
    # Filter by food types
    if selected_food_types:
        filtered_menus = {}
        for restaurant, menu in menus.items():
            filtered_menu = []
            info_items = []
            has_matching_dishes = False
            
            for dish in menu:
                # Collect INFO items separately
                if dish.startswith('INFO:'):
                    info_items.append(dish)
                else:
                    # Extract food type from the HTML string
                    food_type = dish.split('</strong>')[0].split('>')[-1] if '<strong>' in dish else dish.split(':')[0]
                    if food_type in selected_food_types:
                        filtered_menu.append(dish)
                        has_matching_dishes = True
            
            # Only include restaurant if it has matching dishes (not just INFO items)
            if has_matching_dishes:
                # Add INFO items first, then matching dishes
                filtered_menus[restaurant] = info_items + filtered_menu
        menus = filtered_menus
    
    # Filter by search terms
    if selected_search_terms:
        menus = filter_menus_by_search_terms(menus, selected_search_terms)
    
    # Format the menus
    formatted_menus = format_menu_items(menus)
    
    return render_template('index.html',
                         menus=formatted_menus,
                         food_types=get_food_types(get_cached_menus()),  # Get all possible food types
                         locations=list(LOCATIONS.keys()),
                         all_restaurants=list(get_cached_menus().keys()),
                         selected_location=selected_location,
                         selected_food_types=selected_food_types,
                         selected_search_terms=selected_search_terms,
                         filtered_restaurants=filtered_restaurants,
                         linked_restaurants=get_linked_restaurants(formatted_menus),
                         current_day_index=get_current_day_index(),
                         is_weekend=is_weekend())

def get_food_types(menus):
    """Return predefined main food categories instead of extracting from individual dishes"""
    # Define the main food categories we want to filter by
    # Focus on broad categories, not specific dishes
    main_categories = [
        'Kött',
        'Fisk', 
        'Vegetarisk',
        'Sallad',
        'Veckans',
        'Veckans Special',  # Alternative naming
        'Thai',
        'Indisk',
        'Asiatisk',  # Includes ramen, pho, poke bowls etc.
        'Dagens',
        'Dagens Rätt'
    ]
    
    # Only return categories that actually exist in the current menus
    available_categories = set()
    for menu in menus.values():
        for item in menu:
            if '<strong>' in item:
                # Extract the category from between <strong> tags
                food_type = item.split('</strong>')[0].split('>')[-1]
                if food_type in main_categories:
                    available_categories.add(food_type)
    
    return sorted(available_categories)

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

def filter_menus_by_search_terms(menus, search_terms):
    """Filter menus based on multiple search terms"""
    if not search_terms:
        return menus
    
    # Dictionary of search terms and their variations
    search_variations = {
        'burgare': ['burger', 'högrevsburgare', 'hamburgare', 'cheeseburger','veggieburger', 'veganburger', 'halloumiburger'],
        'mos': ['potatismos', 'mos', 'potatispure', 'potatispuré', 'smashed potatoes'],
        'körv': ['korv', 'falukorv', 'wienerkorv', 'prinskorv', 'chorizo', 'grillkorv', 'braadwurst'],
    }
    
    # Collect all terms to search for
    all_terms = []
    for search_term in search_terms:
        all_terms.extend(search_variations.get(search_term, []))
    
    filtered_menus = {}
    for restaurant, menu in menus.items():
        filtered_menu = []
        info_items = []
        has_matching_dishes = False
        
        for dish in menu:
            # Collect INFO items separately
            if dish.startswith('INFO:'):
                info_items.append(dish)
            elif any(term in dish.lower() for term in all_terms):
                filtered_menu.append(dish)
                has_matching_dishes = True
        
        # Only include restaurant if it has matching dishes (not just INFO items)
        if has_matching_dishes:
            # Add INFO items first, then matching dishes
            filtered_menus[restaurant] = info_items + filtered_menu
    
    return filtered_menus

# Format the menu items to make food types bold
def format_menu_items(menus):
    formatted_menus = {}
    for restaurant, menu in menus.items():
        formatted_menu = []
        for item in menu:
            formatted_menu.append(Markup(item))
        formatted_menus[restaurant] = formatted_menu
    return formatted_menus

@main.route('/cache/status')
def cache_status():
    """Show cache status for debugging"""
    from .scraper import cache, get_next_refresh_time
    if cache is None:
        return jsonify({"status": "Cache not initialized"})
    
    cached_data = cache.get('menus')
    last_refresh = cache.get('last_refresh_time')
    next_refresh = get_next_refresh_time()
    
    if cached_data is not None:
        status_info = {
            "status": "Cache HIT",
            "restaurants": len(cached_data),
            "restaurant_names": list(cached_data.keys()),
            "last_refresh": last_refresh.strftime('%Y-%m-%d %H:%M:%S') if last_refresh else "Never",
            "next_scheduled_refresh": next_refresh.strftime('%Y-%m-%d %H:%M:%S'),
            "scheduled_times": ["07:00", "08:00", "10:00"]
        }
        return jsonify(status_info)
    else:
        return jsonify({
            "status": "Cache MISS",
            "last_refresh": last_refresh.strftime('%Y-%m-%d %H:%M:%S') if last_refresh else "Never",
            "next_scheduled_refresh": next_refresh.strftime('%Y-%m-%d %H:%M:%S'),
            "scheduled_times": ["07:00", "08:00", "10:00"]
        })

@main.route('/cache/clear')
def clear_cache_endpoint():
    """Clear cache manually"""
    result = clear_cache()
    if result:
        return jsonify({"status": "Cache cleared successfully"})
    else:
        return jsonify({"status": "Cache not available"})

