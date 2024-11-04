from abc import ABC, abstractmethod
import logging

class BaseScraper(ABC):
    def __init__(self, scraper_info: dict):
        self.name = scraper_info['name']
        self.url = scraper_info['url']
    
    @abstractmethod
    def scrape(self) -> dict:
        """Implement the scraping logic for a specific restaurant"""
        pass
    
    def log_info(self, message: str):
        logging.info(f"[{self.name.upper()}] {message}")
        
    def log_error(self, message: str):
        logging.error(f"[{self.name.upper()}] {message}")
