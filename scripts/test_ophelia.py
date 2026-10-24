"""Syntetiska lunchdata: flikar, priser, datum och säker felhantering."""
from copy import deepcopy
from datetime import date
import json
import unittest
from unittest.mock import patch
from bs4 import BeautifulSoup
from app.restaurant_data import restaurant_locations
from app.scrapers.menu_week import DAYS, menu_monday
from app.scrapers.restaurants.ophelia_scraper import OpheliaScraper

MONDAY = date(2026, 10, 19)


def week():
    return {'year': 2026, 'isoWeek': 43, 'priceSek': 139, 'promoPriceSek': None,
            'extras': 'Sallad och kaffe ingår.',
            'dishes': [{'id': str(day), 'weekday': day, 'name': f'Källrätt {day}',
                        'description': 'Sås & tillbehör', 'priceSek': 149 if day == 2 else None,
                        'sortOrder': 0, 'isTemporarilyOut': False} for day in range(1, 6)],
            'alternativeDishes': [{'id': 'alt', 'name': 'Källans alternativ',
                                  'description': None, 'isTemporarilyOut': False}]}


def html(data, split=False, copies=1):
    record = '20:' + json.dumps(['$', 'section', None, {'id': 'lunch', 'children': [
        ['$', '$Lview', None, {'defaultWeekday': 5, 'week': data}]]}]) + '\n'
    parts = [record[:len(record)//2], record[len(record)//2:]] if split else [record]
    scripts = ''.join('<script>self.__next_f.push(' + json.dumps([1, p]) + ')</script>' for p in parts)
    return BeautifulSoup('<section id="lunch">Only Friday in HTML</section>' + scripts * copies, 'html.parser')


class OpheliaTests(unittest.TestCase):
    def setUp(self):
        self.scraper = OpheliaScraper()

    def test_all_tabs_are_read_from_split_frames_without_a_la_carte(self):
        data = self.scraper.extract_week(html(week(), split=True))
        rows = self.scraper.menu_rows(data, MONDAY)
        for n, day in enumerate(DAYS, 1):
            dishes = [r for r in rows if r.startswith(day + '|')]
            self.assertEqual(len(dishes), 2)
            self.assertIn(f'Källrätt {n} – Sås & tillbehör', dishes[0])
            self.assertTrue(dishes[0].endswith('(149 kr)' if n == 2 else '(139 kr)'))
            self.assertNotIn('kr)', dishes[1])
        self.assertIn('2026-10-23', rows[0])

    def test_week_year_and_weekend_guard(self):
        for year, number, monday in [(2025, 43, MONDAY), (2026, 44, MONDAY),
                                     (2026, 43, menu_monday(date(2026, 10, 24)))]:
            data = week(); data.update(year=year, isoWeek=number)
            rows = self.scraper.menu_rows(data, monday)
            self.assertFalse(any('|' in r for r in rows))
        data = week(); data['isoWeek'] = 44
        self.assertEqual(sum('|' in r for r in self.scraper.menu_rows(data, date(2026, 10, 26))), 10)

    def test_promotion_keeps_individually_priced_dish(self):
        data = week(); data['promoPriceSek'] = 119
        rows = self.scraper.menu_rows(data, MONDAY)
        self.assertTrue(any('Källrätt 1' in r and '(119 kr)' in r for r in rows))
        self.assertTrue(any('Källrätt 2' in r and '(149 kr)' in r for r in rows))

    def test_temporarily_out_not_counted_as_available(self):
        data = week(); data['dishes'][0]['isTemporarilyOut'] = True
        data['alternativeDishes'][0]['isTemporarilyOut'] = True
        rows = self.scraper.menu_rows(data, MONDAY)
        self.assertFalse(any(r.startswith('Måndag|') for r in rows))
        self.assertTrue(any('Tillfälligt slut: Källrätt 1' in r for r in rows))

    def test_no_week_and_missing_day_produce_notices(self):
        self.assertIsNone(self.scraper.extract_week(html(None)))
        self.assertFalse(any('|' in r for r in self.scraper.menu_rows(None, MONDAY)))
        data = week(); data['dishes'].pop(0); data['alternativeDishes'] = []
        rows = self.scraper.menu_rows(data, MONDAY)
        self.assertTrue(any(r.startswith('INFO:Måndag') and 'inte publicerade' in r for r in rows))

    def test_ambiguous_sections_invalid_day_price_or_duplicate_rejected(self):
        with self.assertRaises(ValueError):
            self.scraper.extract_week(html(week(), copies=2))
        for field, value in [('weekday', 6), ('priceSek', -1), ('name', ''), ('isTemporarilyOut', 'false')]:
            data = week(); data['dishes'][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.scraper.menu_rows(data, MONDAY)
        data = week(); data['dishes'].append(deepcopy(data['dishes'][0]))
        with self.assertRaises(ValueError):
            self.scraper.menu_rows(data, MONDAY)

    def test_fetch_failure_and_registry(self):
        with patch.object(self.scraper, 'get_page_content', return_value=None):
            rows = self.scraper.scrape()[self.scraper.name]
        self.assertFalse(any('|' in r for r in rows))
        self.assertFalse(self.scraper.allow_previous_menu)
        self.assertEqual(restaurant_locations[self.scraper.name]['area'], 'Lindholmen')
        self.assertEqual(restaurant_locations[self.scraper.name]['menu_url'], self.scraper.menu_url)


if __name__ == '__main__':
    unittest.main()
