"""Cuckoo's Nest: svensk kolumn, veckospärr och källmärkta kategorier."""

import unittest
from unittest.mock import patch

from bs4 import BeautifulSoup

from app.scrapers.restaurants.cuckoos_nest_scraper import CuckoosNestScraper


DAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"]


def source_html(week=43, days=DAYS):
    daily = "".join(
        f"<h3>{day}</h3><p>Källans rätt för {day.lower()}</p>"
        for day in days
    )
    return f"""
    <div class="content-region">
      <h2>Vecka {week}</h2>
      <div class="block menu-text">
        <h3>Måndag- Fredag kl.11.30-13.30<br>inkl. salladsbuffé, kaffe, te &amp; kaka</h3>
        <h3>195.-</h3>
      </div>
      <div class="block menu-text menu-text--center">
        {daily}
        <h3>Veckans vegetariska</h3><p>Källans vegetariska rätt</p>
      </div>
      <div class="block menu-text">
        <h3>caesarsallad 215 kr</h3><p>Källans caesarsallad</p>
        <h3>räkmacka 295 kr</h3><p>Källans räkmacka</p>
        <h3>Double smashed cheeseburger 235 kr</h3><p>Källans burgare</p>
      </div>
    </div>
    <div class="sidebar-region">
      <h2>WEEK {week}</h2><h3>Monday</h3><p>English duplicate</p>
    </div>
    """


class CuckoosNestTests(unittest.TestCase):
    def scrape(self, html, current_week=43):
        scraper = CuckoosNestScraper()
        soup = BeautifulSoup(html, "html.parser")
        with patch.object(scraper, "get_page_content", return_value=soup), \
                patch.object(scraper, "_current_week", return_value=current_week):
            return scraper, scraper.scrape()[scraper.name]

    def test_current_swedish_menu_is_assigned_per_day(self):
        scraper, rows = self.scrape(source_html())
        self.assertFalse(scraper.allow_previous_menu)
        self.assertEqual([sum(row.startswith(day + "|") for row in rows) for day in DAYS], [5] * 5)
        self.assertEqual(sum(row.startswith("INFO:") for row in rows), 5)
        self.assertIn(
            "Måndag|<strong>Dagens</strong> - Källans rätt för måndag",
            rows,
        )
        self.assertIn(
            "Fredag|<strong>Veckans vegetariska</strong> - Källans vegetariska rätt",
            rows,
        )
        self.assertIn(
            "Tisdag|<strong>räkmacka</strong> - Källans räkmacka (295 kr)",
            rows,
        )
        self.assertFalse(any("English duplicate" in row for row in rows))

    def test_old_week_returns_only_a_visible_menu_message(self):
        _, rows = self.scrape(source_html(week=42), current_week=43)
        self.assertEqual(len(rows), 5)
        self.assertTrue(all("Menybesked: Vecka 43 är inte publicerad än" in row for row in rows))
        self.assertFalse(any("|<strong>" in row for row in rows))

    def test_incomplete_week_is_rejected(self):
        _, rows = self.scrape(source_html(days=DAYS[:-1]))
        self.assertEqual(rows, ["Ingen lunchmeny tillgänglig"])

    def test_lunch_info_does_not_depend_on_the_current_price(self):
        _, rows = self.scrape(source_html().replace("195.-", "205.-"))
        self.assertEqual(sum(row.startswith("INFO:") and "205.-" in row for row in rows), 5)


if __name__ == "__main__":
    unittest.main()
