from abc import ABC, abstractmethod
import logging
import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Optional
import re

class BaseScraper(ABC):
    def __init__(self, restaurant_info: dict):
        self.name = restaurant_info['name']
        self.url = restaurant_info['website']
        self.menu_url = restaurant_info.get('menu_url', restaurant_info['website'])
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
        }
    
    @abstractmethod
    def scrape(self) -> Dict[str, List[str]]:
        """Implement the scraping logic for a specific restaurant"""
        pass
    
    def get_page_content(self, url: Optional[str] = None) -> Optional[BeautifulSoup]:
        """Get the page content and return a BeautifulSoup object"""
        try:
            response = requests.get(url or self.menu_url, headers=self.headers)
            response.raise_for_status()
            return BeautifulSoup(response.text, 'html.parser')
        except requests.RequestException as e:
            self.log_error(f"Failed to retrieve page: {str(e)}")
            return None
    
    def format_menu_item(self, food_type: str, dish: str, price: Optional[str] = None) -> str:
        """Format a menu item with food type, dish description, and optional price"""
        formatted_item = f"<strong>{food_type}</strong>: <span class='dish-description'>{dish}</span>"
        if price:
            formatted_item += f" - {price}"
        return formatted_item
    
    def clean_text(self, text: str) -> str:
        """Clean text by removing extra whitespace and normalizing"""
        return re.sub(r'\s+', ' ', text.strip())
    
    def log_info(self, message: str):
        logging.info(f"[{self.name.upper()}] {message}")
        
    def log_error(self, message: str):
        logging.error(f"[{self.name.upper()}] {message}")
        
    def log_warning(self, message: str):
        logging.warning(f"[{self.name.upper()}] {message}")
