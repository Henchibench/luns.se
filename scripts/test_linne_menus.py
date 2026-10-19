"""Syntetiska källor provar dagsfördelning, datumvarningar och widgetens kontrakt."""
import base64
from datetime import date, datetime, timezone
import json
from pathlib import Path
import unittest
from unittest.mock import patch, Mock
from bs4 import BeautifulSoup

from app.scrapers.restaurants.byns_trattoria_scraper import BynsTrattoriaScraper
from app.scrapers.restaurants.feskekorka_scraper import FeskekorkaScraper
from app.scrapers.restaurants.heurlins_scraper import HeurlinsScraper
from app.scrapers.restaurants.silvis_scraper import SilvisScraper
from app.scrapers.silvis_weekly import HEADINGS, PAGE_ID, fetch_posts, weekly_row
from scripts.menylage import rakna


def byns_group(name):
    return f'{name} -\nTillbehör\nFISKRÄTT\n-\nTillbehör\nPIZZA -\nTillbehör\nPASTA\n- Tillbehör\nSALLAD\n- Tillbehör\n'

BYNS = ('VECKA 41\n' + byns_group('ONSDAGSRÄTT') + byns_group('FREDAGSRÄTT') + 'LUNCHMENY\n'
        + byns_group('MÅNDAGSRÄTT') + 'MÅNDAG & TISDAG\nONSDAG & TORSDAG\nFREDAGSGÖTT!!!\n'
        + '11:30 - 14:00\n145KR\nINKL. KAFFE\nLÄSK 25KR')
HEURLINS = '''Veckans lunch
caesar sallad
Välj mellan
alternativ ett 165:-
alternativ två 175:-
alternativ tre
185:-
Kaffe ingår alltid
efter lunchen!
VECKANS LUNCHGÄST 145:-
K
ällans lunchrätt
onsdag - fredag
VECKANS sandwich 155:-
Källans smörgås
Fish and chips 225:-
Källans tillbehör
Boka brunch
Reklam ska inte följa med
'''


def silvis_post(week=43, stamp='2026-10-19T19:26:24+0000'):
    message = f'Välkomna till Silvis V.{week}\nLunchen Serveras Tisdag-Fredag 11.00-14.00.\n'
    message += '\n'.join(h+'\nKällans rätt\nServeras med tillbehör\n145 kr' for h in HEADINGS)
    return {'message': message, 'created_time': stamp}


class LinneTests(unittest.TestCase):
    def test_byns_visual_order_and_all_prices(self):
        week, rows = BynsTrattoriaScraper().parse_week(BYNS)
        self.assertEqual(week,41)
        self.assertEqual(list(rakna(rows)[0].values()),[5]*5)
        for day, expected in [('Måndag','MÅNDAGSRÄTT'),('Onsdag','ONSDAGSRÄTT'),('Fredag','FREDAGSRÄTT')]:
            self.assertTrue(any(r.startswith(day+'|') and expected in r for r in rows))
        self.assertTrue(all(r.endswith('(145 kr)') for r in rows))

    def test_byns_old_menu_only_becomes_reference_and_new_one_is_current(self):
        scraper=BynsTrattoriaScraper()
        soup=BeautifulSoup('<a href="/other.pdf">Nyår</a><div id="lunch-pdf"><iframe src="/new.pdf#view=FitH"></iframe></div>','html.parser')
        for week, modified, expected in [(41,datetime(2026,10,3,tzinfo=timezone.utc),0),
                                          (43,datetime(2026,10,19,tzinfo=timezone.utc),25),
                                          (43,datetime(2025,10,19,tzinfo=timezone.utc),0)]:
            with patch.object(scraper,'get_page_content',return_value=soup), \
                 patch.object(scraper,'fetch_pdf_text',return_value=(BYNS.replace('VECKA 41',f'VECKA {week}'),modified)) as fetch, \
                 patch('app.scrapers.restaurants.byns_trattoria_scraper.menu_monday',return_value=date(2026,10,19)), \
                 patch.object(scraper,'is_recent',return_value=modified.year==2026 and modified.day==19):
                rows=scraper.scrape()[scraper.name]
            fetch.assert_called_once_with('https://www.bynstrattoria.se/new.pdf')
            self.assertEqual(sum(rakna(rows)[0].values()),expected)
            self.assertEqual(any(r.startswith('MENU_REFERENCE:') for r in rows),expected==0)

    def test_byns_incomplete_template_is_rejected(self):
        for text in [BYNS.replace('MÅNDAG & TISDAG','Måndag'),BYNS.replace('SALLAD','Okänd'),BYNS.replace('145KR','Pris saknas')]:
            with self.assertRaises(ValueError): BynsTrattoriaScraper().parse_week(text)

    def test_byns_warning_tracks_each_download_and_week_change(self):
        scraper = BynsTrattoriaScraper()
        soup = BeautifulSoup('<div id="lunch-pdf"><iframe src="/lunch.pdf"></iframe></div>', 'html.parser')
        # Samma filadress kan byta innehåll. Prova den riktiga datumkontrollen
        # och flera körningar så att en gammal varning inte kan bli kvar.
        cases = [
            (date(2026,10,19), 41, datetime(2026,10,3,tzinfo=timezone.utc), True),
            (date(2026,10,19), 43, datetime(2026,10,19,tzinfo=timezone.utc), False),
            (date(2026,10,26), 43, datetime(2026,10,19,tzinfo=timezone.utc), True),
            (date(2026,10,26), 44, datetime(2026,10,26,tzinfo=timezone.utc), False),
        ]
        for monday, week, modified, warned in cases:
            with self.subTest(monday=monday, week=week), \
                 patch.object(scraper, 'get_page_content', return_value=soup), \
                 patch.object(scraper, 'fetch_pdf_text', return_value=(BYNS.replace('VECKA 41', f'VECKA {week}'), modified)), \
                 patch('app.scrapers.restaurants.byns_trattoria_scraper.menu_monday', return_value=monday), \
                 patch('app.scrapers.weekly_pdf_scraper.datetime') as clock:
                clock.now.return_value = datetime.combine(monday, datetime.min.time(), timezone.utc)
                rows = scraper.scrape()[scraper.name]
            references = [r for r in rows if r.startswith('MENU_REFERENCE:')]
            self.assertEqual(bool(references), warned)
            if warned:
                self.assertIn(f'vecka {week}', json.loads(references[0].split(':',1)[1])['warning'])
            else:
                self.assertEqual(list(rakna(rows)[0].values()), [5]*5)
                self.assertFalse(any('Menybesked:' in r for r in rows))
                self.assertEqual(json.loads(rows[-1].split(':',1)[1])['valid_from'], monday.isoformat())

    def test_heurlins_october_has_six_dishes_only_wednesday_to_friday(self):
        rows=HeurlinsScraper().weekly_rows(HEURLINS)
        self.assertEqual(list(rakna(rows)[0].values()),[0,0,6,6,6])
        self.assertTrue(any('Källans lunchrätt' in r for r in rows))
        self.assertTrue(any('(185 kr)' in r for r in rows))
        self.assertFalse(any('Reklam' in r for r in rows))

    def test_heurlins_uses_named_link_and_old_document_is_only_reference(self):
        scraper=HeurlinsScraper();soup=BeautifulSoup('<a href="/wine.pdf">Vin</a><a href="/new.pdf?v=2">Meny lunch</a>','html.parser')
        with patch.object(scraper,'get_page_content',return_value=soup), \
             patch.object(scraper,'fetch_pdf_text',return_value=(HEURLINS,datetime(2026,10,14,tzinfo=timezone.utc))) as fetch, \
             patch('app.scrapers.restaurants.heurlins_scraper.menu_monday',return_value=date(2026,10,19)):
            rows=scraper.scrape()[scraper.name]
        fetch.assert_called_once_with('https://heurlinsgbg.se/new.pdf?v=2')
        self.assertEqual(sum(rakna(rows)[0].values()),0)
        self.assertTrue(any('2026-10-14' in r for r in rows))
        self.assertTrue(any(r.startswith('INFO:Måndag') and 'onsdag–fredag' in r for r in rows))

    def test_feskekorka_reads_changed_days_and_rejects_unpaired_rows(self):
        def block(days,extra=''):
            return '<section><h3>Lunchmeny serveras '+days+'</h3>'+''.join('<div data-testid="richTextElement">'+s+'</div>' for s in ['VARMRÄTTER','Källans rätt','165/245kr Beskrivning']+([extra] if extra else [])+['DESSERT','Sött 45kr'])+'</section>'
        scraper=FeskekorkaScraper()
        with patch.object(scraper,'get_page_content',return_value=BeautifulSoup(block('tisdag - lördag'),'html.parser')):
            rows=scraper.scrape()[scraper.name]
        self.assertEqual(list(rakna(rows)[0].values()),[0,1,1,1,1])
        self.assertFalse(any('Sött' in r for r in rows))
        with patch.object(scraper,'get_page_content',return_value=BeautifulSoup(block('tisdag - lördag','Förskjutet namn'),'html.parser')):
            self.assertIn('Ett fel uppstod',scraper.scrape()[scraper.name][0])

    def test_silvis_requires_current_week_and_current_publication_year(self):
        monday=date(2026,10,19)
        for post in [silvis_post(42),silvis_post(stamp='2025-10-19T19:26:24+0000'),silvis_post(stamp='bad')]:
            self.assertIsNone(weekly_row([post],monday))
        row=weekly_row([silvis_post()],monday)
        self.assertEqual(list(rakna([row])[0].values()),[0,4,4,4,4])
        self.assertEqual(json.loads(row.split(':',1)[1])['valid_until'],'2026-10-23')
        self.assertIsNone(weekly_row([silvis_post()],date(2026,10,26)))
        post=silvis_post();post['message']=post['message'].replace('145 kr','Okänt pris',1)
        with self.assertRaises(ValueError): weekly_row([post],monday)

    def test_silvis_widget_reads_only_selected_restaurant(self):
        def encoded(data):return base64.b64encode(json.dumps(data).encode()).decode()
        def response(data):r=Mock();r.json.return_value=data;return r
        feed={'selectedPages':[{'id':PAGE_ID,'name':'Silvis Lunch'}],'key':'public-widget-id'}
        widget={'json':encoded({'q':[{'data_feed':[{'feed_data':encoded(feed)}]}]})}
        posts=[{**silvis_post(),'comments':'ska inte returneras'}]
        with patch('app.scrapers.silvis_weekly.requests.post',side_effect=[response(widget),response([{'id':PAGE_ID,'data':posts}])]) as request:
            result=fetch_posts()
        self.assertEqual(result,[silvis_post()]);self.assertEqual(request.call_count,2)
        self.assertEqual(request.call_args.kwargs['json']['selectedPages'],feed['selectedPages'])

    def test_silvis_failure_preserves_only_standing_food(self):
        scraper=SilvisScraper()
        with patch('app.scrapers.restaurants.silvis_scraper.fetch_posts',side_effect=ValueError):
            rows=scraper.scrape()[scraper.name]
        self.assertEqual(list(rakna(rows)[0].values()),[0,5,5,5,5])
        self.assertFalse(scraper.allow_previous_menu)

    def test_fula_hummern_is_removed_from_active_configuration(self):
        from app.restaurant_data import restaurant_locations
        self.assertNotIn('Fula Hummern',restaurant_locations)
        self.assertNotIn('FulaHummernScraper',Path('scripts/scrape_menus.py').read_text())


if __name__=='__main__':unittest.main()
