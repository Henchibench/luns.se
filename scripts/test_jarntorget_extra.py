"""Syntetiska menyexempel: datum, kategorier, radbrytning och fellägen."""
import base64
from datetime import date
import json
import unittest
from unittest.mock import Mock, patch

from bs4 import BeautifulSoup

from app.restaurant_data import restaurant_locations
from app.scrapers.menu_week import DAYS, menu_monday
from app.scrapers.restaurants.jarntorget_extra_scrapers import (
    VitaScraper, SchnitzelplatzScraper, TaiShanghaiScraper, GillestuganScraper,
)

MODULE = 'app.scrapers.restaurants.jarntorget_extra_scrapers'
MONDAY = date(2026, 10, 19)


def soup(html):
    return BeautifulSoup(html, 'html.parser')


def schnitzel(week=43):
    return '<div class="introbox__container"><h1>Lunch vecka ' + str(week) + '</h1>' + \
        '<p>Lunchkort 1300:-</p><h2>Alltid på Platz</h2><p>Kalvrätt<br>295:-</p>' + \
        '<h2>Veckans vegetariska</h2><p>Grön rätt 149:-</p>' + \
        ''.join(f'<h2>{d}</h2><p>Rätt för {d}<br>149:-</p>' for d in DAYS) + '</div>'


def tai(week=43, year=2026):
    return f'<div class="divider-full"><b>VECKA {week}, {year}</b><div class="day"><div class="meny">' + \
        '<strong>Måndag</strong><br>Stängt<br>' + ''.join(
            f'<strong>{d}</strong><br>1. Källrätt {d} 97:-<i style="opacity: 0.1;color: #eee;">cbh</i><br>'
            '2. Två delar - första delen<br>andra delen 101:-<br>'
            'Vegetariska rätter: Se separat lunchlista<br>'
            '7. Sista rätten 92:-<br>' for d in DAYS[1:]) + \
        '<i>(En stor dryck istället för liten 10:-)</i><br><b>Tisdag - fredag kl. 11-16</b>' + \
        '</div><div class="meny">inkl. kaffe<br>Öppet</div></div></div>'


class SchnitzelTests(unittest.TestCase):
    def test_day_and_shared_dishes_with_source_categories(self):
        rows = SchnitzelplatzScraper().parse_menu(soup(schnitzel()), MONDAY)
        for day in DAYS:
            dishes = [r for r in rows if r.startswith(day + '|')]
            self.assertEqual(len(dishes), 3)
            self.assertIn(f'Rätt för {day}', dishes[0])
            self.assertIn('<strong>Veckans vegetariska</strong>', dishes[2])
            self.assertTrue(all(r.endswith(' kr)') for r in dishes))
        self.assertFalse(any('1300' in r for r in rows))
        self.assertIn('2026-10-23', rows[0])

    def test_future_week_waits_until_weekend(self):
        scraper = SchnitzelplatzScraper()
        self.assertTrue(all(r.startswith('INFO:') for r in scraper.parse_menu(soup(schnitzel(44)), MONDAY)))
        saturday = menu_monday(date(2026, 10, 24))
        rows = scraper.parse_menu(soup(schnitzel(44)), saturday)
        self.assertEqual(sum('|' in r for r in rows), 15)
        self.assertTrue(all(r.startswith('INFO:') for r in scraper.parse_menu(soup(schnitzel(43)), saturday)))

    def test_incomplete_or_ambiguous_menu_rejected(self):
        for html in [schnitzel().replace('<h2>Fredag</h2>', '<h2>Lördag</h2>'),
                     schnitzel().replace('Grön rätt 149:-', ''), schnitzel() * 2]:
            with self.subTest(html=html), self.assertRaises(ValueError):
                SchnitzelplatzScraper().parse_menu(soup(html), MONDAY)


class TaiTests(unittest.TestCase):
    def test_closed_day_wrapped_dish_and_non_dish_information(self):
        rows = TaiShanghaiScraper().parse_menu(soup(tai()), MONDAY)
        self.assertFalse(any(r.startswith('Måndag|') for r in rows))
        self.assertTrue(any('Ingen lunchservering' in r for r in rows))
        for day in DAYS[1:]:
            dishes = [r for r in rows if r.startswith(day + '|')]
            self.assertEqual(len(dishes), 3)
            self.assertIn('första delen andra delen (101 kr)', dishes[1])
            self.assertTrue(all('cbh' not in r and 'separat lunchlista' not in r and 'dryck' not in r for r in dishes))
            self.assertTrue(all('<strong>Lunch</strong>' in r for r in dishes))

    def test_wrong_year_or_week_never_serves_old_food(self):
        for week, year in [(42, 2026), (43, 2025), (44, 2026)]:
            rows = TaiShanghaiScraper().parse_menu(soup(tai(week, year)), MONDAY)
            self.assertTrue(all(r.startswith('INFO:') for r in rows))

    def test_missing_price_day_and_duplicate_menu_fail_closed(self):
        for html in [tai().replace('andra delen 101:-', 'andra delen'),
                     tai().replace('<strong>Onsdag</strong>', ''), tai() * 2]:
            with self.subTest(html=html), self.assertRaises(ValueError):
                TaiShanghaiScraper().parse_menu(soup(html), MONDAY)


class VitaTests(unittest.TestCase):
    def test_dated_rows_preserve_price_description_and_declared_allergens(self):
        rows = VitaScraper.parse_lunch([{
            'menu_date': '2026-10-20', 'name': 'Källrätt', 'description': 'Tillbehör & sås',
            'price_cents': 14500, 'allergens': ['MJÖLK'],
        }], MONDAY)
        self.assertEqual(sum('|' in r for r in rows), 1)
        self.assertIn('Tisdag|<strong>Lunch</strong> - Källrätt – Tillbehör & sås (MJÖLK) (145 kr)', rows)
        self.assertEqual(sum(r.startswith('INFO:') for r in rows), 4)

    def test_no_published_menu_is_not_replaced_with_a_la_carte(self):
        rows = VitaScraper.parse_lunch([], MONDAY)
        self.assertEqual(sum('|' in r for r in rows), 0)
        self.assertEqual(sum(r.startswith('INFO:') for r in rows), 5)

    def test_wrong_date_or_bad_price_rejected(self):
        for served, price in [('2026-10-26', 10000), ('2026-10-24', 10000), ('2026-10-20', -1)]:
            with self.subTest(served=served, price=price), self.assertRaises(ValueError):
                VitaScraper.parse_lunch([{'menu_date': served, 'name': 'Källrätt', 'price_cents': price}], MONDAY)

    def test_live_connection_uses_only_public_lunch_fields_and_week_bounds(self):
        claims = base64.urlsafe_b64encode(json.dumps({'role': 'anon', 'ref': 'qobimmhbtklvvjmxjyau'}).encode()).decode().rstrip('=')
        token = 'eyJtest.' + claims + '.test'
        script = Mock(text=f'"{VitaScraper.API_ORIGIN}","{token}"')
        response = Mock(); response.json.return_value = []
        with patch(MODULE + '.requests.get', side_effect=[script, response]) as get:
            result = VitaScraper().fetch_lunch(soup('<script type="module" src="/assets/new.js"></script>'), MONDAY)
            self.assertEqual(result, [])
            args, kwargs = get.call_args
            self.assertTrue(args[0].endswith('/rest/v1/lunch_menu'))
            self.assertIn(('menu_date', 'gte.2026-10-19'), kwargs['params'])
            self.assertIn(('menu_date', 'lte.2026-10-23'), kwargs['params'])
            self.assertEqual(kwargs['headers']['apikey'], token)


class IntegrationTests(unittest.TestCase):
    def test_names_areas_and_no_previous_menu_fallback(self):
        for cls in [VitaScraper, GillestuganScraper, SchnitzelplatzScraper, TaiShanghaiScraper]:
            scraper = cls()
            self.assertEqual(restaurant_locations[scraper.name]['area'], 'Järntorget/Linné')
            self.assertFalse(scraper.allow_previous_menu)

    def test_fetch_failure_produces_status_not_food(self):
        for cls in [VitaScraper, SchnitzelplatzScraper, TaiShanghaiScraper]:
            scraper = cls()
            with patch.object(scraper, 'get_page_content', return_value=None):
                rows = scraper.scrape()[scraper.name]
            self.assertEqual(len(rows), 5)
            self.assertTrue(all(r.startswith('INFO:') for r in rows))

    def test_gillestugan_links_to_source_without_inventing_menu(self):
        scraper = GillestuganScraper()
        with patch.object(scraper, 'get_page_content', return_value=None):
            rows = scraper.scrape()[scraper.name]
        self.assertFalse(any('|' in r for r in rows))
        self.assertEqual(restaurant_locations[scraper.name]['menu_url'], scraper.menu_url)


if __name__ == '__main__':
    unittest.main()
