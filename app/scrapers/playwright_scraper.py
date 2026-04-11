from .base_scraper import BaseScraper
from bs4 import BeautifulSoup
from typing import Optional
import logging


class PlaywrightScraper(BaseScraper):
    """Base class for scrapers that need JavaScript rendering via Playwright."""

    def get_page_content_js(self, url: Optional[str] = None, wait_selector: Optional[str] = None, wait_ms: int = 5000) -> Optional[BeautifulSoup]:
        """Fetch a page using Playwright's headless Chromium and return parsed HTML.

        Args:
            url: URL to fetch (defaults to self.menu_url)
            wait_selector: CSS selector to wait for before capturing HTML
            wait_ms: Milliseconds to wait if no selector provided
        """
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            self.log_error("playwright is not installed. Install with: pip install playwright && playwright install chromium")
            return None

        target_url = url or self.menu_url
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(target_url, timeout=30000)

                if wait_selector:
                    page.wait_for_selector(wait_selector, timeout=15000)
                else:
                    page.wait_for_timeout(wait_ms)

                html = page.content()
                browser.close()
                return BeautifulSoup(html, 'html.parser')
        except Exception as e:
            self.log_error(f"Playwright failed to fetch {target_url}: {e}")
            return None
