"""BO:s OCR måste ge en hel aktuell vecka eller ett tydligt menybesked."""
from datetime import date
from io import BytesIO
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

from bs4 import BeautifulSoup
from PIL import Image

from app.scrapers.bo_ocr import TextLine, read_menu_image
from app.scrapers.restaurants.restaurang_bo_scraper import RestaurangBOScraper, parse_menu, SECTIONS
from app.scrapers.menu_week import DAYS, menu_monday


def menu(week=43):
    lines = [TextLine(f'LUNCHMENY V.{week}'), TextLine('alltid med sallad')]
    for section in SECTIONS:
        lines += [TextLine(section)]
        for i in range(1 if section in ('FREDAG', 'VECKANS GRÖNA') else 2):
            lines += [TextLine(f'KÄLLANS RÄTT {159+i*10}'), TextLine('källans tillbehör')]
        if section == 'FREDAG':
            lines += [TextLine('FREDAGSDESSERT = äppelkaka')]
    return lines + [TextLine('LUNCHDRYCK'), TextLine('LUNCHVIN 95')]


class BOMenuTests(unittest.TestCase):
    def scrape(self, lines, today=date(2026,10,19)):
        scraper = RestaurangBOScraper()
        with patch.object(scraper, 'read_current_image', return_value=lines), patch(
                'app.scrapers.restaurants.restaurang_bo_scraper.menu_monday', return_value=menu_monday(today)):
            return scraper.scrape()[scraper.name]

    def test_complete_week_prices_common_dishes_and_dessert(self):
        rows = self.scrape(menu())
        self.assertEqual([sum(r.startswith(d+'|') for r in rows) for d in DAYS], [5,5,5,5,4])
        self.assertTrue(any('Veckans gröna</strong>' in r for r in rows))
        self.assertIn('INFO:Fredag - Restaurant Info: Fredagsdessert: äppelkaka', rows)
        self.assertTrue(any('(169 kr)' in r for r in rows))
        self.assertFalse(any('LUNCHVIN' in r or 'MENU_IMAGE' in r or 'Vegansk' in r for r in rows))

    def test_week_change_and_weekend(self):
        self.assertEqual(sum('|' in r for r in self.scrape(menu(44),date(2026,10,24))),24)
        self.assertEqual(sum('|' in r for r in self.scrape(menu(43),date(2026,10,24))),0)
        self.assertIn('2026-10-26',self.scrape(menu(44),date(2026,10,24))[-1])
        self.assertEqual(sum('|' in r for r in self.scrape(menu(53),date(2026,12,31))),24)
        self.assertEqual(sum('|' in r for r in self.scrape(menu(1),date(2027,1,2))),24)

    def test_incomplete_or_uncertain_menu_fails_closed(self):
        variants = [[], menu(42), menu()[:-2], [r for r in menu() if r.text != 'TISDAG'],
                    [TextLine(r.text, 15) if r.text == 'källans tillbehör' else r for r in menu()],
                    [TextLine('KÄLLANS RÄTT 15') if r.text == 'KÄLLANS RÄTT 159' else r for r in menu()],
                    [TextLine('OKÄND RUBRIK') if r.text == 'SALLAD' else r for r in menu()]]
        for lines in variants:
            with self.subTest(lines=lines):
                rows=self.scrape(lines)
                self.assertEqual(sum('|' in r for r in rows),0)
                self.assertEqual(sum('Menybesked:' in r for r in rows),5)
        self.assertFalse(RestaurangBOScraper.allow_previous_menu)

    def test_ocr_missing_timeout_and_network_failure_have_no_image_fallback(self):
        scraper=RestaurangBOScraper()
        for error in [FileNotFoundError('tesseract'), subprocess.TimeoutExpired('tesseract',30),ValueError('nätfel')]:
            with patch.object(scraper,'read_current_image',side_effect=error):
                rows=scraper.scrape()[scraper.name]
            self.assertEqual(sum('Menybesked:' in r for r in rows),5)
            self.assertFalse(any('MENU_IMAGE' in r or '|' in r for r in rows))

    def test_official_image_must_match_week_and_be_unique(self):
        scraper=RestaurangBOScraper()
        base='https://images.squarespace-cdn.com/content/v1/bo/'
        for html in ['',f'<img data-image="{base}v.42.jpg">',
                     f'<img data-image="{base}v.43.jpg"><img data-image="{base}new/v.43.jpg">',
                     '<img data-image="https://example.com/v.43.jpg">']:
            with patch.object(scraper,'get_page_content',return_value=BeautifulSoup(html,'html.parser')):
                with self.assertRaises(ValueError):scraper.read_current_image(date(2026,10,19))

    def test_small_layout_noise_does_not_move_dishes_between_days(self):
        lines=[TextLine('oo TISDAG',55) if r.text=='TISDAG' else r for r in menu()]
        self.assertEqual(sum(r.startswith('Tisdag|') for r in self.scrape(lines)),5)

    def test_title_is_read_again_from_pixels_with_accents(self):
        def word(text,left,width):
            return dict(text=text,conf='95',left=str(left),top='50',height='40',width=str(width))
        buffer=BytesIO();Image.new('RGB',(800,200),'white').save(buffer,format='PNG')
        groups=[[word('HELSTEKT',30,180),word('FLASKFILE',220,200),word('169',440,60)]]
        refined=[[word('HELSTEKT',30,180),word('FLÄSKFILÉ',220,200),word('169',440,60)]]
        with patch('app.scrapers.bo_ocr._recognize',side_effect=[groups,refined]) as recognize:
            lines=read_menu_image(buffer.getvalue())
        self.assertEqual(lines[0].text,'HELSTEKT FLÄSKFILÉ 169')
        self.assertEqual([c.args[1] for c in recognize.call_args_list],[3,7])


if __name__ == '__main__':
    unittest.main()
