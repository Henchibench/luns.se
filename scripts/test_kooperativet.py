"""Dagankare kan saknas i Enfold; läs båda kolumnerna utan att blanda dagar."""
import unittest
from unittest.mock import Mock
from bs4 import BeautifulSoup
from app.scrapers.restaurants.kooperativet_scraper import KooperativetScraper


def section(day='Fredag', anchor='', heading='h1'):
    return f'''<div {anchor}><div class="entry-content-wrapper">
    <div class="flex_column"><{heading}>Lunch {day} v43</{heading}>
    <div class="avia_textblock"><p><strong>KÖTT</strong><br>
    Fredags Grillen – Vedeldad gårdsgris, pommes &amp; bea</p></div></div>
    <div class="flex_column"><h1>–</h1><div class="avia_textblock">
    <p><strong>FISK</strong><br>Havets Wallenbergare serveras med dillkokt potatis,
    romsås samt citron och örter</p></div></div></div></div>'''


class KooperativetTests(unittest.TestCase):
    def setUp(self):
        self.scraper = KooperativetScraper()
        self.scraper.log_error = Mock()

    def rows(self, html):
        return self.scraper._extract_weekly_menu(BeautifulSoup(html, 'html.parser'))

    def test_missing_anchor_reads_both_columns_like_anchored_section(self):
        self.assertEqual(self.rows(section()), self.rows(section(anchor='id="friday"')))
        self.assertEqual(len(self.rows(section())), 2)
        self.assertTrue(all(row.startswith('Fredag|') for row in self.rows(section())))

    def test_heading_levels_case_and_spacing(self):
        for heading in ['h1', 'h2', 'h3', 'h4']:
            with self.subTest(heading=heading):
                self.assertEqual(len(self.rows(section(day='fredag', heading=heading))), 2)

    def test_all_days_keep_their_own_rows(self):
        days = [('monday', 'Måndag'), ('tuesday', 'Tisdag'), ('wednesday', 'Onsdag'),
                ('thursday', 'Torsdag'), ('friday', 'Fredag')]
        html = ''.join(section(day, f'id="{anchor}"' if anchor != 'friday' else '')
                       for anchor, day in days)
        rows = self.rows(html)
        self.assertEqual([sum(r.startswith(day + '|') for r in rows) for _, day in days], [2]*5)

    def test_existing_anchor_is_not_read_twice(self):
        self.assertEqual(len(self.rows(section(anchor='id="friday"'))), 2)

    def test_ambiguous_unanchored_headings_are_rejected(self):
        self.assertEqual(self.rows(section() + section()), [])
        self.scraper.log_error.assert_any_call('Ingen entydig menysektion för Fredag')

    def test_shared_wrapper_with_another_day_is_rejected(self):
        html = section().replace('<h1>–</h1>', '<h1>Lunch Torsdag v43</h1>')
        self.assertEqual(self.rows(html), [])

    def test_no_known_wrapper_or_no_weekday_does_not_guess(self):
        self.assertEqual(self.rows(section().replace('entry-content-wrapper', 'unknown')), [])
        self.assertEqual(self.rows(section(day='helg')), [])


if __name__ == '__main__':
    unittest.main()
