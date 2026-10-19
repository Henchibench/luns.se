"""Regressioner för datum och dagsgrupper; all källtext nedan är syntetisk."""

from datetime import date, datetime, timezone
import json
import unittest
from unittest.mock import patch

from bs4 import BeautifulSoup

from app.scrapers.restaurants.heurlins_scraper import HeurlinsScraper


NEW_TEMPLATE = """VECKANS LUNCHGÄST 145:-
Första lunchgästens källtext
Måndag - onsdag
VECKANS sandwich 145:-
Första sandwichens källtext
VECKANS LUNCHGÄST 145:-
Andra lunchgästens källtext
Torsdag - fredag
VECKANS sandwich 145:-
Andra sandwichens källtext
Cobbsallad
Text från nästa sida ska inte följa med
"""

OLD_TEMPLATE = """VECKANS sandwich 145:-
Första sandwichens källtext
VECKANS sandwich 145:-
Andra sandwichens källtext
VECKANS LUNCHGÄST 145:-
Första lunchgästens källtext
VECKANS LUNCHGÄST 145:-
Andra lunchgästens källtext
Måndag & tisdag
onsdag - fredag
Fish and chips 225:-
Text utanför veckoblocken
"""


class HeurlinsTests(unittest.TestCase):
    def test_new_template_assigns_wednesday_to_first_group(self):
        rows = HeurlinsScraper().weekly_rows(NEW_TEMPLATE)
        for day in HeurlinsScraper.DAYS:
            dishes = [row for row in rows if row.startswith(day + "|")]
            self.assertEqual(len(dishes), 2)
            group = "Första" if day in ["Måndag", "Tisdag", "Onsdag"] else "Andra"
            self.assertTrue(all(group in dish for dish in dishes))
        self.assertFalse(any("nästa sida" in row for row in rows))

    def test_old_template_keeps_its_own_day_ranges(self):
        rows = HeurlinsScraper().weekly_rows(OLD_TEMPLATE)
        self.assertEqual(len(rows), 10)
        self.assertTrue(all("Andra" in r for r in rows if r.startswith("Onsdag|")))
        self.assertFalse(any("utanför" in r for r in rows))

    def test_ambiguous_or_incomplete_layout_is_rejected(self):
        for text in [
            NEW_TEMPLATE.replace("Torsdag - fredag", "Onsdag - fredag"),
            NEW_TEMPLATE.replace("Måndag - onsdag", "Måndag - tisdag"),
            NEW_TEMPLATE.replace("Cobbsallad", "Okänd sidgräns"),
            NEW_TEMPLATE.replace("Första sandwichens källtext", ""),
        ]:
            with self.subTest(text=text), self.assertRaises(ValueError):
                HeurlinsScraper().weekly_rows(text)

    def test_old_file_is_not_served_as_current(self):
        scraper = HeurlinsScraper()
        soup = BeautifulSoup('<a href="/menu.pdf">Meny lunch</a>', "html.parser")
        with patch.object(scraper, "get_page_content", return_value=soup), \
                patch.object(scraper, "fetch_pdf_text", return_value=(NEW_TEMPLATE, None)):
            rows = scraper.scrape()[scraper.name]
        self.assertEqual(sum(row.startswith('INFO:') for row in rows), 5)
        self.assertEqual(sum(row.split('|')[0] in scraper.DAYS for row in rows), 0)
        reference = json.loads(next(row.split(':', 1)[1] for row in rows if row.startswith('MENU_REFERENCE:')))
        self.assertEqual(len(reference['rows']), 10)
        self.assertIn('inte bekräftat', reference['warning'])

    def test_live_contract_and_relative_pdf_link(self):
        scraper = HeurlinsScraper()
        soup = BeautifulSoup('<a href="/menu.pdf">Meny lunch</a>', "html.parser")
        with patch.object(scraper, "get_page_content", return_value=soup), \
                patch.object(scraper, "fetch_pdf_text", return_value=(
                    NEW_TEMPLATE, datetime.now(timezone.utc))) as fetch:
            rows = scraper.scrape()[scraper.name]
        fetch.assert_called_once_with("https://heurlinsgbg.se/menu.pdf")
        self.assertEqual(sum("|" in row for row in rows), 10)
        self.assertFalse(scraper.allow_previous_menu)


if __name__ == "__main__":
    unittest.main()
