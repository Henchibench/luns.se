from flask import Blueprint, render_template, request, redirect, url_for, flash
from markupsafe import Markup
from .restaurant_data import LOCATIONS, restaurant_locations
from .scraper import get_cached_menus, clear_cache
import logging

# Create a Blueprint for our main routes
main = Blueprint('main', __name__)


@main.route('/', methods=['GET', 'POST'])
def home():
    # Main route handler for the homepage
    # Handles both GET and POST requests for menu filtering
    
    # Get selected filters
    selected_location = request.args.get('location', '')  # Default to empty string instead of 'Lindholmen'
    selected_food_type = request.args.get('food_type')
    selected_search_term = request.args.get('search_term')
    
    # Get menus and apply filters
    menus = get_cached_menus()
    
    # Filter by location if one is selected
    if selected_location:
        location_filtered_menus = {
            restaurant: menu 
            for restaurant, menu in menus.items() 
            if restaurant_locations.get(restaurant, {}).get('area') == selected_location
        }
    else:
        location_filtered_menus = menus  # Show all locations if none selected
    
    # Then apply other filters
    food_types = get_food_types(location_filtered_menus)
    filtered_menus = filter_menus_by_food_type(location_filtered_menus, selected_food_type)
    filtered_menus = filter_menus_by_search_term(filtered_menus, selected_search_term)
    
    # Format the menus to make food types bold
    formatted_menus = format_menu_items(filtered_menus)
    
    # Create linked_restaurants with filtered menus
    linked_restaurants = {
        restaurant: {
            "menu": menu,
            "maps_link": restaurant_locations.get(restaurant, {}).get("maps"),
            "website": restaurant_locations.get(restaurant, {}).get("website"),
            "instagram": restaurant_locations.get(restaurant, {}).get("instagram"),
            "review_score": restaurant_locations.get(restaurant, {}).get("review_score"),
            "area": restaurant_locations.get(restaurant, {}).get("area")
        }
        for restaurant, menu in formatted_menus.items()
    }
    
    return render_template('index.html',
                         menus=formatted_menus,
                         food_types=food_types,
                         locations=list(LOCATIONS.keys()),
                         selected_location=selected_location,
                         selected_food_type=selected_food_type,
                         selected_search_term=selected_search_term,
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
        'burgare': ['burger', 'högrevsburgare', 'hamburgare', 'cheeseburger','veggieburger', 'veganburger', 'halloumiburger'],
        'mos': ['potatismos', 'mos', 'potatispure', 'potatispuré', 'smashed potatoes'],
        'körv': ['korv', 'falukorv', 'wienerkorv', 'prinskorv', 'chorizo', 'grillkorv', 'braadwurst'],
    }
    
    terms = search_terms.get(search_term, [])
    filtered_menus = {}
    for restaurant, menu in menus.items():
        filtered_menu = [dish for dish in menu if any(term in dish.lower() for term in terms)]
        if filtered_menu:
            filtered_menus[restaurant] = filtered_menu
    return filtered_menus

# Format the menu items to make food types bold
def format_menu_items(menus):
    formatted_menus = {}
    for restaurant, menu in menus.items():
        formatted_menu = []
        for item in menu:
            if ': ' in item:
                food_type, rest = item.split(': ', 1)
                # Use Markup to prevent escaping
                formatted_item = Markup(f"<strong>{food_type}</strong>: {rest}")
                formatted_menu.append(formatted_item)
            else:
                formatted_menu.append(item)
        formatted_menus[restaurant] = formatted_menu
    return formatted_menus