"""Gemensamma skyddsräcken för veckomenyer som publiceras som PDF."""

from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
import re
from typing import List, Optional, Tuple
from zoneinfo import ZoneInfo

import requests

from .base_scraper import BaseScraper
from .pdf_text import PdfTextError, extract_pdf_text


class WeeklyPdfScraper(BaseScraper):
    allow_previous_menu = False
    DAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"]

    def fetch_pdf_text(self, url: str) -> Tuple[str, Optional[datetime]]:
        response = requests.get(url, headers=self.headers, timeout=30)
        response.raise_for_status()
        text = extract_pdf_text(response.content)
        modified = None
        if response.headers.get("Last-Modified"):
            modified = parsedate_to_datetime(response.headers["Last-Modified"])
        return text, modified

    @staticmethod
    def compact(text: str) -> str:
        return re.sub(r"\s+", " ", text.replace("ﬀ", "ff")).strip()

    @classmethod
    def info_for_all_days(cls, message: str) -> List[str]:
        return [f"INFO:{day} - Restaurant Info: {message}" for day in cls.DAYS]

    @staticmethod
    def current_week() -> int:
        return datetime.now(ZoneInfo("Europe/Stockholm")).isocalendar().week

    @staticmethod
    def is_recent(modified: Optional[datetime]) -> bool:
        if modified is None:
            return False
        now = datetime.now(ZoneInfo("Europe/Stockholm"))
        if modified.tzinfo is None:
            modified = modified.replace(tzinfo=ZoneInfo("Europe/Stockholm"))
        # En meny för kommande vecka kan publiceras på fredagen. Äldre än
        # så är inte en säker grund när dokumentet saknar veckonummer.
        monday = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        return modified >= monday - timedelta(days=3)

    @staticmethod
    def pdf_error(error: Exception) -> bool:
        return isinstance(error, (requests.RequestException, PdfTextError))
