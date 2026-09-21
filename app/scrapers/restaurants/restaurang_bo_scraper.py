"""BO:s bildmeny, med tidsbegränsad avskrift och original vid bildbyte."""

from datetime import datetime, timedelta
import hashlib
import json
from pathlib import Path
import re
from typing import Dict, List
from urllib.parse import urljoin, urlsplit
from zoneinfo import ZoneInfo

import requests

from ..base_scraper import BaseScraper


class RestaurangBOScraper(BaseScraper):
    allow_previous_menu = False
    DAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"]
    TRANSCRIPT = Path(__file__).parents[1] / "data" / "restaurang_bo.json"

    def __init__(self):
        super().__init__({
            "name": "Restaurang BO",
            "website": "https://www.restaurangbo.se/",
            "menu_url": "https://www.restaurangbo.se/lunchmat",
        })

    @staticmethod
    def _today():
        return datetime.now(ZoneInfo("Europe/Stockholm")).date()

    def week_start(self):
        today = self._today()
        # Sajten visar kommande måndag under helgen.
        return today + timedelta(days=(7 if today.weekday() > 4 else 0) - today.weekday())

    def notice(self, message):
        return {self.name: [f"INFO:{day} - Restaurant Info: Menybesked: {message}"
                            for day in self.DAYS]}

    def image_source(self, soup):
        candidates = set()
        for img in soup.find_all("img"):
            url = urljoin(self.menu_url, img.get("data-src") or img.get("src", ""))
            parts = urlsplit(url)
            match = re.search(r"/v[.]?\s*(\d{1,2})[.](?:jpg|jpeg|png|webp)$", parts.path, re.I)
            if (parts.scheme == "https" and parts.hostname == "images.squarespace-cdn.com"
                    and match):
                candidates.add((url, int(match.group(1))))
        current = [item for item in candidates if item[1] == self.week_start().isocalendar().week]
        if len(current) != 1:
            raise ValueError("Ingen entydig menybild för den valda veckan")
        return current[0]

    def fetch_image(self, url):
        # Fast Accept undviker att CDN:ens formatval ändrar kontrollsumman.
        response = requests.get(url, headers={**self.headers, "Accept": "image/jpeg"}, timeout=30)
        response.raise_for_status()
        if not response.headers.get("Content-Type", "").startswith("image/") or not response.content:
            raise ValueError("Menyadressen gav ingen bild")
        return response.content

    def verified_rows(self, image_url, image_bytes):
        saved = json.loads(self.TRANSCRIPT.read_text(encoding="utf-8"))
        monday = self.week_start()
        if (saved["source"] != self.menu_url or saved["image_url"] != image_url
                or saved["sha256"] != hashlib.sha256(image_bytes).hexdigest()
                or saved["valid_from"] != monday.isoformat()
                or saved["valid_until"] != (monday + timedelta(days=4)).isoformat()):
            return []
        days = saved["days"]
        if set(days) != set(self.DAYS) or any(not days[day] for day in self.DAYS):
            raise ValueError("Avskriften saknar veckodagar")
        rows = []
        for day in self.DAYS:
            for dish in days[day]:
                if (not all(isinstance(dish.get(key), str) and dish[key].strip()
                            for key in ("category", "description"))
                        or type(dish.get("price")) is not int or dish["price"] <= 0):
                    raise ValueError("Ofullständig rätt i avskriften")
                rows.append(f'{day}|<strong>{dish["category"]}</strong> - '
                            f'{dish["description"]} ({dish["price"]} kr)')
            for info in saved.get("info", {}).get(day, []):
                rows.append(f"INFO:{day} - Restaurant Info: {info}")
        return rows

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content()
        if soup is None:
            return self.notice("Lunchmenyn kunde inte hämtas. Se MENY för restaurangens original.")
        try:
            image_url, week = self.image_source(soup)
            image_bytes = self.fetch_image(image_url)
        except (requests.RequestException, ValueError) as error:
            self.log_error(str(error))
            return self.notice("Ingen verifierad menybild för veckan. Se MENY för restaurangens original.")

        try:
            rows = self.verified_rows(image_url, image_bytes)
        except (OSError, ValueError, KeyError, TypeError) as error:
            self.log_error(f"Bildavskriften kan inte användas: {error}")
            rows = []
        if not rows:
            self.log_warning("Ny eller ej avläst veckobild: visar originalet utan gamla rätter")
        monday = self.week_start()
        rows.append("MENU_IMAGE:" + json.dumps({
            "url": image_url,
            "week": week,
            "valid_from": monday.isoformat(),
            "valid_until": (monday + timedelta(days=4)).isoformat(),
        }, ensure_ascii=False))
        return {self.name: rows}
