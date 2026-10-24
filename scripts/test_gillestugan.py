"""Syntetiska OCR-rader och flödessvar; inga nedladdade menyer sparas."""
import base64
from datetime import date
import json
import unittest
from unittest.mock import Mock, patch

from bs4 import BeautifulSoup
from app.scrapers import gillestugan_menu as menu
from app.scrapers.bo_ocr import TextLine
from app.scrapers.restaurants.jarntorget_extra_scrapers import GillestuganScraper

MONDAY = date(2026, 10, 19)
IMAGE = 'https://example.fbcdn.net/menu.jpg'


def columns():
    left = ['DAGENS RÄTT', '129:-']
    for day in menu.DAYS:
        left += [day.upper(), 'KÄLLANS RÄTT & TILLBEHÖR', 'med sås']
    right = []
    for heading in menu.HEADINGS:
        right += [heading, 'KÄLLRÄTT 139:-', 'med tillbehör']
        if heading == 'STAMMISEN':
            right += ['ANNAN KÄLLRÄTT 149:-', 'med andra tillbehör']
    right += ['Serveras varje helgfri vardag kl. 11:30-15:00.', 'Sallad, bröd och kaffe ingår.']
    return [[TextLine('Vv. 43')], list(map(TextLine, left)), list(map(TextLine, right))]


def post(stamp='2026-10-19T05:41:23+0000', photos=None):
    return {'created_time': stamp, 'photos': [IMAGE] if photos is None else photos}


class GillestuganTests(unittest.TestCase):
    def test_all_days_and_shared_dishes_keep_source_categories_and_prices(self):
        rows = menu.parse_columns(columns(), MONDAY)
        for day in menu.DAYS:
            dishes = [r for r in rows if r.startswith(day + '|')]
            self.assertEqual(len(dishes), 7)
            self.assertIn('KÄLLANS RÄTT & TILLBEHÖR med sås (129 kr)', dishes[0])
            self.assertIn('<strong>Veckans fångst</strong>', dishes[1])
            self.assertTrue(dishes[-1].endswith('(149 kr)'))
        self.assertEqual(sum(r.startswith('INFO:') for r in rows), 5)

    def test_wrong_week_low_confidence_missing_day_price_or_footer_rejected(self):
        cases = []
        c = columns(); c[0][0].text = 'V. 42'; cases.append(c)
        c = columns(); c[1][4].confidence = 40; cases.append(c)
        c = columns(); c[1] = [r for r in c[1] if r.text != 'ONSDAG']; cases.append(c)
        c = columns(); c[2][1].text = 'KÄLLRÄTT'; cases.append(c)
        c = columns(); c[2].pop(); cases.append(c)
        c = columns(); c[2][0].text = 'OKÄND RUBRIK'; cases.append(c)
        for c in cases:
            with self.subTest(c=c), self.assertRaises(ValueError):
                menu.parse_columns(c, MONDAY)

    def test_publication_year_and_week_boundaries(self):
        self.assertEqual(menu.select_image([post()], MONDAY), IMAGE)
        for stamp in ['2025-10-20T10:00:00+0000', '2026-10-15T10:00:00+0000',
                      '2026-10-26T10:00:00+0000', '2026-10-19T10:00:00', None]:
            self.assertIsNone(menu.select_image([post(stamp)], MONDAY))
        self.assertIsNone(menu.select_image([post()], date(2026, 10, 26)))

    def test_ambiguous_photos_and_unexpected_hosts_rejected(self):
        for photos in [[], [IMAGE, IMAGE], ['https://example.com/menu.jpg']]:
            with self.subTest(photos=photos), self.assertRaises(ValueError):
                menu.select_image([post(photos=photos)], MONDAY)
        with self.assertRaises(ValueError):
            menu.select_image([post(), post(photos=[IMAGE + '?other'])], MONDAY)

    def test_latest_post_is_selected(self):
        old = post('2026-10-18T10:00:00+0000', [IMAGE + '?old'])
        self.assertEqual(menu.select_image([old, post()], MONDAY), IMAGE)

    def test_widget_identity_and_minimal_output(self):
        feed = {'selectedPages': [{'id': menu.PAGE_ID}], 'key': 'synthetic-public-key'}
        widget = {'q': [{'data_feed': [{'feed_data': base64.b64encode(json.dumps(feed).encode()).decode()}]}]}
        page = [{'id': menu.PAGE_ID, 'data': [{'created_time': post()['created_time'],
            'comments': ['not menu data'], 'attachments': {'data': [{'media_type': 'photo',
            'media': {'image': {'src': IMAGE}}}]}}]}]
        soup = BeautifulSoup(f'<script src="https://wdg.fouita.com/widgets/{menu.WIDGET_ID}.js"></script>', 'html.parser')
        responses = [Mock(), Mock()]
        responses[0].json.return_value = widget; responses[1].json.return_value = page
        with patch.object(menu.requests, 'post', side_effect=responses):
            self.assertEqual(menu.fetch_posts(soup), [post()])
        page[0]['id'] = 'wrong-page'
        with patch.object(menu.requests, 'post', side_effect=responses), self.assertRaises(ValueError):
            menu.fetch_posts(soup)
        with patch.object(menu.requests, 'post') as request, self.assertRaises(ValueError):
            menu.fetch_posts(BeautifulSoup('<p>No widget</p>', 'html.parser'))
        request.assert_not_called()

    def test_scraper_never_ocr_reads_last_weeks_image(self):
        scraper = GillestuganScraper()
        module = 'app.scrapers.restaurants.jarntorget_extra_scrapers'
        with patch(module + '.menu_monday', return_value=date(2026, 10, 26)), \
             patch.object(scraper, 'get_page_content', return_value=object()), \
             patch.object(menu, 'fetch_posts', return_value=[post()]), \
             patch.object(menu, 'download_image') as download:
            rows = scraper.scrape()[scraper.name]
        download.assert_not_called()
        self.assertFalse(any('|' in r for r in rows))
        self.assertIn('vecka 44', rows[0])
        self.assertIn('2026-10-26', rows[-1])

    def test_scraper_success_and_ocr_failure(self):
        scraper = GillestuganScraper()
        module = 'app.scrapers.restaurants.jarntorget_extra_scrapers'
        with patch(module + '.menu_monday', return_value=MONDAY), \
             patch.object(scraper, 'get_page_content', return_value=object()), \
             patch.object(menu, 'fetch_posts', return_value=[post()]), \
             patch.object(menu, 'download_image', return_value=b'image'), \
             patch.object(menu, 'read_image', return_value=columns()) as read:
            rows = scraper.scrape()[scraper.name]
            self.assertEqual(sum('|' in r for r in rows), 35)
            self.assertIn('2026-10-23', rows[-1])
            read.side_effect = ValueError('Uncertain OCR')
            self.assertFalse(any('|' in r for r in scraper.scrape()[scraper.name]))


if __name__ == '__main__':
    unittest.main()
