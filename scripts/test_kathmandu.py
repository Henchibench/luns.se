"""Stående rotation: källans veckoval, dietetiketter och nätfel."""
from copy import deepcopy
from datetime import date
import json
import unittest
from unittest.mock import patch
from bs4 import BeautifulSoup

from app.scrapers.menu_week import menu_monday
from app.scrapers.restaurants.kathmandu_scraper import KathmanduScraper


class KathmanduTests(unittest.TestCase):
    def setUp(self):
        self.scraper = KathmanduScraper()
        self.saved = json.loads(self.scraper.SNAPSHOT.read_text())
        self.menu = self.saved['menu']

    def soup(self, menu):
        block = {'blockType':'weeklyLunchMenu', **menu}
        payload = '24:' + json.dumps(['$', 'component', None, block]) + '\n'
        return BeautifulSoup('<script>self.__next_f.push('+json.dumps([1,payload])+')</script>', 'html.parser')

    def scrape(self, soup=None, today=date(2026,10,19)):
        with patch.object(self.scraper,'get_page_content',return_value=soup), patch(
                'app.scrapers.restaurants.kathmandu_scraper.menu_monday',return_value=menu_monday(today)):
            return self.scraper.scrape()[self.scraper.name]

    def test_public_json_contains_both_weeks(self):
        self.assertEqual(self.scraper.extract_menu(self.soup(self.menu)),self.menu)

    def test_odd_even_and_weekend_select_source_group(self):
        for today, title in [(date(2026,10,19),'Udda veckor'),(date(2026,10,24),'Jämna veckor'),
                             (date(2026,10,26),'Jämna veckor'),(date(2026,12,31),'Udda veckor'),
                             (date(2027,1,2),'Udda veckor')]:
            rows=self.scrape(today=today)
            group=next(g for g in self.menu['primaryGroups'] if g['groupTitle']==title)
            for day,key in zip(self.scraper.DAYS,self.scraper.DAY_KEYS):
                dishes=[r for r in rows if r.startswith(day+'|')]
                self.assertEqual(len(dishes),4)
                for source,row in zip(group[key]['dishes'],dishes):
                    self.assertIn(source['name'],row)
                    self.assertIn(source['description'],row)
                    self.assertIn('(129 kr)',row)
                self.assertIn('Momo - 8 st per person (139 kr)',dishes[-1])
            self.assertFalse(self.scraper.allow_previous_menu)

    def test_live_source_overrides_saved_menu(self):
        menu=deepcopy(self.menu)
        menu['sharedPrice']=130
        rows=self.scrape(self.soup(menu))
        self.assertTrue(any('(130 kr)' in r for r in rows))
        self.assertFalse(any('(129 kr)' in r for r in rows))

    def test_changed_or_incomplete_readable_source_does_not_fall_back(self):
        menu=deepcopy(self.menu)
        menu['primaryGroups'][0]['monday']['dishes']=[]
        for soup in [self.soup(menu),BeautifulSoup('<h1>Ny meny</h1>','html.parser')]:
            rows=self.scrape(soup)
            self.assertEqual(sum('Menybesked:' in r for r in rows),5)
            self.assertEqual(sum('|' in r for r in rows),0)

    def test_corrupted_standing_copy_is_rejected(self):
        self.saved['kalla_hash']='changed'
        with patch('pathlib.Path.read_text',return_value=json.dumps(self.saved)):
            self.assertEqual(sum('|' in r for r in self.scrape()),0)

    def test_categories_follow_explicit_source_labels(self):
        rows=self.scrape()
        self.assertTrue(any('<strong>Vegansk</strong> - Chana Masala' in r for r in rows))
        self.assertTrue(any('<strong>Vegetarisk</strong> - Soya Paneer Saag' in r for r in rows))
        self.assertTrue(any('<strong>Dagens</strong> - Butter Chicken' in r for r in rows))


if __name__ == '__main__':
    unittest.main()
