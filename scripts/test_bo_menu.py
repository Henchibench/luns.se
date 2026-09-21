"""BO: källbyte och datum får aldrig lämna gammal mat på sajten."""

from datetime import date
import hashlib
import json
import unittest
from unittest.mock import patch

from bs4 import BeautifulSoup
import requests

from app.scrapers.restaurants.restaurang_bo_scraper import RestaurangBOScraper
from scripts.menylage import rakna


class BOMenuTests(unittest.TestCase):
    def setUp(self):
        self.scraper = RestaurangBOScraper()
        self.saved = json.loads(self.scraper.TRANSCRIPT.read_text())
        self.saved['sha256'] = hashlib.sha256(b'verified image').hexdigest()
        self.url = self.saved['image_url']
        self.soup = BeautifulSoup(f'<img src="{self.url}">', 'html.parser')

    def scrape(self, today=date(2026, 9, 21), image=b'verified image', soup=None):
        with patch.object(self.scraper, '_today', return_value=today), \
                patch.object(self.scraper, 'get_page_content', return_value=self.soup if soup is None else soup), \
                patch.object(self.scraper, 'fetch_image', return_value=image), \
                patch('pathlib.Path.read_text', return_value=json.dumps(self.saved)):
            return self.scraper.scrape()[self.scraper.name]

    def test_verified_original_matches_every_day_and_price(self):
        rows = self.scrape()
        self.assertEqual([sum(r.startswith(day+'|') for r in rows) for day in self.scraper.DAYS], [5,5,5,5,4])
        self.assertIn('Måndag|<strong>Dagens</strong> - Nattbakad karré – potatispuré, rostad pumpa & katrinplommonsky (159 kr)', rows)
        self.assertEqual(sum('Fredagsdessert' in row for row in rows), 1)
        self.assertTrue(any(r.startswith('INFO:Fredag') and 'björnbärsockerkaka' in r for r in rows))
        self.assertEqual(sum(r.startswith('MENU_IMAGE:') for r in rows), 1)
        self.assertFalse(self.scraper.allow_previous_menu)

    def test_same_url_with_changed_image_drops_all_dishes_and_info(self):
        rows = self.scrape(image=b'new image')
        self.assertEqual(len(rows), 1)
        self.assertTrue(rows[0].startswith('MENU_IMAGE:'))

    def test_report_counts_only_dishes_and_accepts_image_metadata(self):
        counts, unknown = rakna(self.scrape())
        self.assertEqual(list(counts.values()), [5,5,5,5,4])
        self.assertEqual(unknown, 0)
        counts, unknown = rakna(self.scrape(image=b'new image'))
        self.assertEqual(sum(counts.values()), 0)
        self.assertEqual(unknown, 0)

    def test_changed_url_with_identical_bytes_requires_new_verification(self):
        self.saved['image_url'] = self.url + '?old'
        self.assertEqual(len(self.scrape()), 1)

    def test_expired_or_wrong_year_transcript_is_not_reused(self):
        for start, end in [('2025-09-22','2025-09-26'), ('2026-09-14','2026-09-18'), ('2026-09-21','2026-09-26')]:
            with self.subTest(start=start, end=end):
                self.saved.update(valid_from=start, valid_until=end)
                self.assertEqual(len(self.scrape()), 1)

    def test_next_week_image_displays_without_a_new_transcription(self):
        url = self.url.replace('v.39.jpg','v.40.jpg')
        soup = BeautifulSoup(f'<img src="{url}">', 'html.parser')
        for today in [date(2026,9,26), date(2026,9,28)]:
            rows = self.scrape(today=today, soup=soup)
            self.assertEqual(len(rows), 1)
            image = json.loads(rows[0].removeprefix('MENU_IMAGE:'))
            self.assertEqual(image['valid_from'], '2026-09-28')
            self.assertEqual(image['week'], 40)

    def test_old_source_is_not_presented_as_next_week(self):
        rows = self.scrape(today=date(2026,9,28))
        self.assertTrue(all('Menybesked:' in r for r in rows))

    def test_incomplete_transcript_falls_back_to_image(self):
        del self.saved['days']['Fredag']
        self.assertEqual(len(self.scrape()), 1)

    def test_duplicate_responsive_image_is_ok_but_two_different_current_images_are_not(self):
        same = BeautifulSoup(f'<img src="{self.url}"><img data-src="{self.url}">','html.parser')
        self.assertEqual(sum('|' in r for r in self.scrape(soup=same)),24)
        different = BeautifulSoup(f'<img src="{self.url}"><img src="{self.url.replace("/v.39", "/another/v.39")}">','html.parser')
        self.assertTrue(all('Menybesked:' in r for r in self.scrape(soup=different)))

    def test_image_fetch_failure_does_not_use_transcript(self):
        with patch.object(self.scraper, '_today', return_value=date(2026,9,21)), \
                patch.object(self.scraper, 'get_page_content', return_value=self.soup), \
                patch.object(self.scraper, 'fetch_image', side_effect=requests.RequestException('offline')):
            rows = self.scraper.scrape()[self.scraper.name]
        self.assertTrue(all('Menybesked:' in r for r in rows))


if __name__ == '__main__':
    unittest.main()
