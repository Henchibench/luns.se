import re
from typing import Dict, List
from urllib.parse import urljoin

from ..weekly_pdf_scraper import WeeklyPdfScraper


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

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content(self.menu_url)
        if not soup:
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
        link = next((a.get("href") for a in soup.find_all("a", href=True)
                     if ".pdf" in a.get("href", "").lower()), None)
        if not link:
            return {self.name: ["Ingen lunchmeny tillgänglig"]}
        try:
            text, modified = self.fetch_pdf_text(urljoin(self.menu_url, link))
            if not self.is_recent(modified):
                stamp = f" Filen är senast ändrad {modified:%Y-%m-%d}." if modified else ""
                message = (
                    "Menybesked: Lunchmenyn saknar veckodatum, så vi kan inte bekräfta "
                    f"att den gäller den här veckan.{stamp} Se MENY eller fråga restaurangen."
                )
                return {self.name: self.info_for_all_days(message)}

            rows = self.weekly_rows(text)
            rows += self.info_for_all_days("Veckans rätter visas här. Hela lunchmenyn finns via MENY.")
            self.log_info("Hittade två veckorätter per vardag i aktuell PDF")
            return {self.name: rows}
        except Exception as error:
            self.log_error(f"Error parsing PDF menu: {error}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
