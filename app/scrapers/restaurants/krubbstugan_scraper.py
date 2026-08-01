import re
from typing import Dict, List

from ..base_scraper import BaseScraper


class KrubbstuganScraper(BaseScraper):
    """Krubbstugan, Gelbgjutaregatan 2 — Tannefors, Linköping.

    A WordPress page with no menu markup to speak of: one flat run of sibling
    <p> blocks. A day is a paragraph whose only content is a bolded weekday and
    every paragraph after it is a dish, then below the week come the standing
    dishes and finally the pricing. Nothing marks those transitions
    structurally, so we walk the paragraphs in document order and move through
    three phases by matching the prose that introduces each one.

    Phrase matching is the fragile part. If the page is reworded this is what
    breaks, so a run that finds no dishes fails loudly rather than quietly
    publishing an empty menu.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    # Ends the weekday listing — prose, not food.
    WEEK_END_PATTERNS = [r'vi bjuder', r'välkommen', r'varje\s+dag kan du njuta']

    # Introduces the pricing block, which ends the menu proper. Everything
    # between the end of the week and this is treated as a standing dish.
    #
    # The boundary is deliberately anchored here rather than on the phrase that
    # introduces the standing dishes ("Varje dag kan du njuta av vår"). Keying
    # on that intro means a reworded sentence silently drops the whole block,
    # and because the weekday dishes would still be found, nothing would look
    # wrong. Anchoring on the price line instead fails the other way: reworded
    # prose shows up as a stray dish, which is visible and easy to fix.
    INFO_PATTERNS = [r'^\s*servering\b', r'^\s*avhämtning\b']
    INFO_START_PATTERNS = INFO_PATTERNS + [r'häfte', r'valfri dricka', r'@']

    # Prose that sits among the standing dishes without being one.
    SKIP_PATTERNS = [
        r'välkommen',
        r'vi bjuder även',
        r'vid allergi',
        r'fråga kocken',
        r'varje\s+dag kan du njuta',
    ]

    def __init__(self):
        restaurant_info = {
            'name': 'Krubbstugan',
            'website': 'https://krubbstugan.se',
            'menu_url': 'https://krubbstugan.se/veckans-meny/',
        }
        super().__init__(restaurant_info)

    def _is_day_heading(self, paragraph) -> str:
        """Return the weekday if this paragraph is a day heading, else ''."""
        emphasis = paragraph.find(['strong', 'b'])
        if not emphasis:
            return ''
        text = self.clean_text(emphasis.get_text(strip=True))
        return next((d for d in self.SWEDISH_DAYS if text.lower() == d.lower()), '')

    @staticmethod
    def _matches(text: str, patterns: List[str]) -> bool:
        lowered = text.lower()
        return any(re.search(p, lowered) for p in patterns)

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content()
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            by_day: List[tuple] = []      # (day, category, dish)
            standing: List[tuple] = []    # (category, dish)
            info_lines: List[str] = []

            current_day = ''
            phase = 'week'

            for paragraph in soup.find_all('p'):
                text = self.clean_text(paragraph.get_text(' ', strip=True))
                if not text:
                    continue

                day = self._is_day_heading(paragraph)
                if day:
                    current_day, phase = day, 'week'
                    continue

                if self._matches(text, self.INFO_START_PATTERNS):
                    phase = 'info'
                    if self._matches(text, self.INFO_PATTERNS):
                        info_lines.append(text)
                    continue

                if phase == 'week':
                    # Once the prose starts, the week is over and whatever
                    # follows until the pricing is a standing dish.
                    if self._matches(text, self.WEEK_END_PATTERNS):
                        phase = 'standing'
                        continue
                    if not current_day:
                        continue
                    # "*** tacobuffé ***" is a real Friday dish, just shouted
                    dish = text.strip('* ').strip()
                    if dish:
                        by_day.append((current_day, self._categorise(dish), dish))

                elif phase == 'standing':
                    if self._matches(text, self.SKIP_PATTERNS):
                        continue
                    dish = text.strip('* ').strip()
                    if dish:
                        category = 'Veckans' if 'veckans' in dish.lower() else 'Stående rätter'
                        standing.append((category, dish))

            if not by_day:
                self.log_error("No dishes found — page layout may have changed")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            if not standing:
                # The weekday dishes carry the run, so an empty standing block
                # would otherwise pass unnoticed. Say so.
                self.log_error("No standing dishes found — page layout may have changed")

            items = [f"{day}|<strong>{category}</strong> - {dish}" for day, category, dish in by_day]

            # Standing dishes are available every day, so they repeat across the week
            for category, dish in standing:
                for day in self.SWEDISH_DAYS:
                    items.append(f"{day}|<strong>{category}</strong> - {dish}")

            for line in info_lines:
                for day in self.SWEDISH_DAYS:
                    items.append(f"INFO:{day} - Restaurant Info: 💰 {line}")

            self.log_info(
                f"Found {len(by_day)} weekday dishes and {len(standing)} standing dishes"
            )
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

    @staticmethod
    def _categorise(dish: str) -> str:
        return 'Vegetarisk' if re.search(r'(?i)\b(vegetarisk|vegansk|vegan)\b', dish) else 'Dagens'
