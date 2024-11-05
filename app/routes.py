from flask import Blueprint, render_template, request, redirect, url_for, flash
from markupsafe import Markup
from .restaurant_data import LOCATIONS, restaurant_locations
from .scraper import get_cached_menus, clear_cache
import logging

# Create a Blueprint for our main routes
main = Blueprint('main', __name__)

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
            for dish in menu:
                if any(dish.startswith(food_type) for food_type in selected_food_types):
                    filtered_menu.append(dish)
            if filtered_menu:
                filtered_menus[restaurant] = filtered_menu
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
                         linked_restaurants=get_linked_restaurants(formatted_menus))

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
        filtered_menu = [
            dish for dish in menu 
            if any(term in dish.lower() for term in all_terms)
        ]
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

