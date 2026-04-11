import json
import os
from .base_scraper import BaseScraper
from typing import Dict, List


class StaticMenuScraper(BaseScraper):
    """Base class for restaurants with static JSON menu files."""

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    def __init__(self, restaurant_info: dict, data_file: str):
        super().__init__(restaurant_info)
        data_path = os.path.join(os.path.dirname(__file__), 'data', data_file)
        with open(data_path, encoding='utf-8') as f:
            self.menu_data = json.load(f)

    def format_static_item(self, day: str, category: str, name: str, description: str = '', price: str = '') -> str:
        """Format a static menu item in our standard output format."""
        parts = [name]
        if description:
            parts.append(description)
        dish_text = ' - '.join(parts)
        if price:
            dish_text += f" ({price})"
        return f"{day}|<strong>{category}</strong> - {dish_text}"

    def items_for_all_days(self, items: List[str]) -> List[str]:
        """Duplicate a list of day-less formatted items for all weekdays.
        Items should already be formatted with day prefix."""
        return items
