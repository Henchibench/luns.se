"""BO: daterad text måste följa visningsveckan, aldrig bli en bildreserv."""
from datetime import date
import unittest
from unittest.mock import patch
from bs4 import BeautifulSoup

from app.scrapers.restaurants.restaurang_bo_scraper import RestaurangBOScraper
from app.scrapers.menu_week import menu_monday
from scripts.menylage import rakna


def block(stamp, heading='Måndag 19 oktober', description='Källans beskrivning', price='<span>159:-</span>'):
    return f'<div id="{stamp}"><h3>{heading}</h3><ul><li><p>Källans rätt</p><p>{description}</p>{price}</li></ul></div>'


class BOMenuTests(unittest.TestCase):
    def scrape(self, html, today=date(2026, 10, 19)):
        scraper = RestaurangBOScraper()
        soup = BeautifulSoup(html, 'html.parser') if html is not None else None
        with patch.object(scraper, 'get_page_content', return_value=soup), patch(
                'app.scrapers.restaurants.restaurang_bo_scraper.menu_monday', return_value=menu_monday(today)):
            return scraper.scrape()[scraper.name]

    def test_only_current_date_and_matching_heading_are_served(self):
        html = ''.join(block(d) for d in ['2025-10-20','2026-10-12','2026-10-19','2026-10-26'])
        rows = self.scrape(html)
        self.assertEqual([r for r in rows if '|' in r],
                         ['Måndag|<strong>Dagens</strong> - Källans rätt - Källans beskrivning (159 kr)'])
        self.assertEqual(sum('Menybesked:' in r for r in rows), 4)
        self.assertFalse(any(r.startswith('MENU_IMAGE:') for r in rows))
        self.assertEqual(rakna(rows)[1], 0)
        self.assertEqual(sum('|' in r for r in self.scrape(block('2026-10-19','Tisdag 19 oktober'))), 0)

    def test_next_week_is_read_without_changing_saved_data(self):
        rows = self.scrape(block('2026-10-26','Måndag 26 oktober'), date(2026,10,24))
        self.assertEqual(sum('|' in r for r in rows), 1)
        self.assertIn('2026-10-26', rows[-1])
        self.assertEqual(sum('|' in r for r in self.scrape(block('2026-10-19'),date(2026,10,24))), 0)

    def test_missing_or_unreadable_source_does_not_return_old_text_or_image(self):
        for html in [None, '', block('2026-10-19',price=''), block('2026-10-19',price='<span>3-4 portioner</span>')]:
            rows = self.scrape(html)
            self.assertEqual(sum('Menybesked:' in r for r in rows), 5)
            self.assertEqual(sum('|' in r for r in rows), 0)
        self.assertFalse(RestaurangBOScraper.allow_previous_menu)

    def test_explicit_dietary_tag_and_dessert_are_preserved(self):
        html = block('2026-10-23','Fredag 23 oktober','Tillbehör FREDAGSDESSERT = källans dessert',
                     '<span>159:-</span><span>Vegetarisk</span>')
        rows = self.scrape(html)
        self.assertIn('Fredag|<strong>Vegetarisk</strong> - Källans rätt - Tillbehör (159 kr)',rows)
        self.assertIn('INFO:Fredag - Restaurant Info: Fredagsdessert: källans dessert',rows)

    def test_iso_year_boundary(self):
        rows = self.scrape(block('2027-01-01','Fredag 1 januari'),date(2026,12,31))
        self.assertEqual(sum('|' in r for r in rows),1)


if __name__ == '__main__':
    unittest.main()
