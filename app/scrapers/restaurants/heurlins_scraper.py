import re
from datetime import timedelta
from zoneinfo import ZoneInfo
from typing import Dict, List
from urllib.parse import urljoin

from ..weekly_pdf_scraper import WeeklyPdfScraper
from ..menu_reference import reference_row
from ..menu_week import menu_monday, validity_row


class HeurlinsScraper(WeeklyPdfScraper):
    WEEKLY_LABEL = re.compile(r"VECKANS (sandwich|LUNCHGÄST) (\d+):-", re.I)
    DAY_RANGE = re.compile(
        r"(Måndag|Tisdag|Onsdag|Torsdag|Fredag)\s*[-–&]\s*"
        r"(måndag|tisdag|onsdag|torsdag|fredag)", re.I
    )

    def __init__(self):
        super().__init__({
            "name": "Heurlins",
            "website": "https://heurlinsgbg.se/",
            "menu_url": "https://heurlinsgbg.se/lunch",
        })

    def weekly_rows(self, text: str) -> List[str]:
        """Läs veckans två rätter ur de två verifierade PDF-mallarna.

        PDF:ens textobjekt ligger i annan ordning än texten på sidan.
        Ordningen nedan är kontrollerad mot originalen 7 och 21 september.
        Matcha hela mallen innan dagarna kopplas till rätterna. Övriga sidor
        har separat satta priser/alternativ och lämnas till originalmenyn.
        """
        lines = [self.compact(line) for line in text.splitlines() if self.compact(line)]
        labels = [(i, self.WEEKLY_LABEL.fullmatch(line)) for i, line in enumerate(lines)]
        labels = [(i, match) for i, match in labels if match]
        ranges = [(i, self.DAY_RANGE.fullmatch(line)) for i, line in enumerate(lines)]
        ranges = [(i, match) for i, match in ranges if match]
        if len(labels) == 2 and len(ranges) == 1:
            return self.autumn_rows(lines, labels, ranges)
        if len(labels) != 4 or len(ranges) != 2:
            raise ValueError("förväntade fyra veckorätter och två dagintervall")

        kinds = [match.group(1).casefold() for _, match in labels]
        if kinds == ["lunchgäst", "sandwich", "lunchgäst", "sandwich"]:
            # Septembermallen: lunchgäst, dagrubrik, sandwich per dagsgrupp.
            if not (labels[0][0] < ranges[0][0] < labels[1][0] <
                    labels[2][0] < ranges[1][0] < labels[3][0]):
                raise ValueError("veckoblockens ordning har ändrats")
            groups = [(1, 0), (3, 2)]
            end = lines.index("Cobbsallad")
        elif kinds == ["sandwich", "sandwich", "lunchgäst", "lunchgäst"]:
            # Äldre mallen: båda sandwicharna, båda lunchgästerna, dagrubriker.
            if not labels[3][0] < ranges[0][0] < ranges[1][0]:
                raise ValueError("veckoblockens ordning har ändrats")
            groups = [(0, 2), (1, 3)]
            end = ranges[0][0]
        else:
            raise ValueError("okänd PDF-mall för veckorätterna")
        if end <= labels[-1][0]:
            raise ValueError("slutet på veckomenyn saknas")

        schedules = []
        for _, match in ranges:
            first = self.DAYS.index(match.group(1).capitalize())
            last = self.DAYS.index(match.group(2).capitalize())
            schedules.append(self.DAYS[first:last + 1])
        if schedules[0] + schedules[1] != self.DAYS:
            raise ValueError("dagintervallen täcker inte veckan exakt en gång")

        dishes = []
        boundaries = sorted([i for i, _ in labels + ranges] + [end])
        for start, match in labels:
            stop = next(i for i in boundaries if i > start)
            description = " ".join(lines[start + 1:stop])
            # Äldre mallen lägger första versalen i ett eget textobjekt.
            description = re.sub(r"\b([A-ZÅÄÖ])\s+([a-zåäö])", r"\1\2", description)
            if not description:
                raise ValueError("veckorätt saknar beskrivning")
            dishes.append(
                f"<strong>Veckans {match.group(1).lower()}</strong> - "
                f"{description} ({match.group(2)} kr)"
            )

        return [f"{day}|{dishes[index]}" for days, indices in zip(schedules, groups)
                for day in days for index in indices]

    def autumn_rows(self, lines, labels, ranges):
        """Oktobermallen: samma två veckorätter ons–fre samt fyra lunchklassiker."""
        if ([match[1].casefold() for _, match in labels] != ['lunchgäst', 'sandwich']
                or not labels[0][0] < ranges[0][0] < labels[1][0]
                or [part.capitalize() for part in ranges[0][1].groups()] != ['Onsdag','Fredag']):
            raise ValueError('okänd ordning i ons–fre-mallen')
        fish = next(i for i, line in enumerate(lines) if re.fullmatch(r'Fish and chips \d+:-', line))
        end = lines.index('Boka brunch')
        if not labels[1][0] < fish < end:
            raise ValueError('slutet på lunchmenyn saknas')
        dishes = []
        for (start, match), stop in zip(labels, [ranges[0][0], fish]):
            description = ' '.join(lines[start+1:stop])
            description = re.sub(r'\b([A-ZÅÄÖ])\s+([a-zåäö])', r'\1\2', description)
            # Originalets textobjekt delar just detta ord mitt i ordet.
            # Sammanfogningen är kontrollerad mot oktobermallens synliga PDF.
            description = description.replace('rucc ola', 'ruccola')
            if not description:
                raise ValueError('veckorätt saknar beskrivning')
            dishes.append(f'<strong>Veckans {match[1].lower()}</strong> - {description} ({match[2]} kr)')
        price = re.fullmatch(r'Fish and chips (\d+):-', lines[fish])[1]
        description = ' '.join(lines[fish+1:end])
        if not description:
            raise ValueError('Fish and chips saknar beskrivning')
        dishes.append(f'<strong>Lunch</strong> - Fish and chips - {description} ({price} kr)')
        salad = lines.index('caesar sallad')
        coffee = lines.index('Kaffe ingår alltid')
        if lines[salad+1] != 'Välj mellan' or not salad < coffee < labels[0][0]:
            raise ValueError('salladsalternativens gränser saknas')
        alternatives = ' '.join(lines[salad+2:coffee])
        matches = list(re.finditer(r'(.+?) (\d+):-', alternatives))
        if len(matches) != 3 or matches[-1].end() != len(alternatives):
            raise ValueError('förväntade tre prissatta salladsalternativ')
        for match in matches:
            dishes.append(f'<strong>Sallad</strong> - Caesarsallad med {match[1].strip()} ({match[2]} kr)')
        return [f'{day}|{dish}' for day in self.DAYS[2:] for dish in dishes]

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content(self.menu_url)
        if not soup:
            return {self.name: ['Ett fel uppstod vid hämtning av menyn']}
        # Sidans namngivna lunchknapp kan byta filnamn vid varje uppladdning.
        links = {urljoin(self.menu_url, a['href']) for a in soup.find_all('a', href=True)
                 if '.pdf' in a['href'].lower() and self.clean_text(a.get_text(' ', strip=True)).casefold() == 'meny lunch'}
        if len(links) != 1:
            return {self.name: ['Ingen lunchmeny tillgänglig']}
        url = links.pop()
        try:
            text, modified = self.fetch_pdf_text(url)
            rows = self.weekly_rows(text)
            available = {row.split('|')[0] for row in rows}
            closed = [f'INFO:{day} - Restaurant Info: Menybesked: Lunch serveras onsdag–fredag 11.30–14.00.'
                      for day in self.DAYS if day not in available]
            monday = menu_monday()
            fresh = (modified is not None and modified.tzinfo is not None and
                     monday - timedelta(days=3) <= modified.astimezone(ZoneInfo('Europe/Stockholm')).date()
                     <= monday + timedelta(days=4))
            if not fresh:
                stamp = f' Senast ändrad {modified:%Y-%m-%d}.' if modified else ''
                warning = ('PDF-menyn saknar veckodatum. Det är inte bekräftat att den gäller veckan som visas; '
                           f'rätter och priser kan ha ändrats.{stamp}')
                status = [f'INFO:{day} - Restaurant Info: Menybesked: Ingen bekräftad meny för den här veckan.'
                          for day in self.DAYS if day in available]
                return {self.name: closed + status + [reference_row('Publicerad lunchmeny · datum osäkert', warning, url, rows)]}
            return {self.name: closed + rows + [validity_row(menu_monday())]}
        except Exception as error:
            self.log_error(f'Kunde inte läsa lunch-PDF: {error}')
            return {self.name: ['Ett fel uppstod vid hämtning av menyn']}
