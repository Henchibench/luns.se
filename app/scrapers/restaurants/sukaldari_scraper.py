import re
from typing import Dict, List, Optional, Tuple

from bs4 import Tag

from ..base_scraper import BaseScraper


class SukaldariScraper(BaseScraper):
    """Sukaldari — foodtruck vid Dataton, Teknikringen 22 i Mjärdevi.

    Det här är ingen restaurang med dagens rätt, utan en foodtruck med **fast
    meny** som dessutom **byter plats över veckan**. Båda sakerna styr hur
    skrapan är byggd.

    Sidan är WordPress med Divi, och menyn ligger i rå HTML — inget JS behövs.
    Varje modul är en egen ``div.et_pb_text_inner`` med precis ett element i:

        <div class="et_pb_text_inner"><h3>Vår menu</h3></div>
        <div class="et_pb_text_inner"><h5>Sant Elm</h5></div>
        <div class="et_pb_text_inner"><p>Högrev, mozzarella …</p></div>
        …
        <div class="et_pb_text_inner"><h2>Du hittar oss på</h2></div>
        <div class="et_pb_text_inner"><h1>Mondag – Onsdag</h1></div>
        <div class="et_pb_text_inner"><h3><a …>Teknikringen 22 Dataton</a></h3></div>

    Rätt och beskrivning är alltså **syskonmoduler**, inte nästlade. Det finns
    ingen gemensam behållare att greppa och inga klassnamn på rubrikerna, så
    tolkningen sker på dokumentordning inom ett intervall som avgränsas av två
    rubriker någon skrivit för hand: "Vår menu" och "Du hittar oss på". Divis
    numrerade modulklasser (``et_pb_text_2``) räknar moduler i sidordning och
    flyttar sig så fort någon lägger till ett block ovanför — de duger inte.

    **Platsschemat är hela poängen med skrapan.** Mån–ons och fre står trucken
    på Teknikringen 22 (Dataton), mitt i Mjärdevi; på torsdagar står den på
    Ensbovägen vid Saab, som inte är Mjärdevi. Menyn läggs därför bara på de
    dagar sidan säger att trucken faktiskt står i området. Att lägga den på
    alla fem hade varit ett tyst fel av värsta sorten: någon går ut på lunchen
    till en tom parkering, och ingenting på sajten ser trasigt ut.

    Av samma skäl **hårdkodas inte dagarna** — de läses ur schemat vid varje
    körning. Flyttar trucken följer sajten med. Går schemat inte att läsa
    returneras fellägena i stället, så att ``scrape_menus.py`` behåller förra
    körningens dagar hellre än att gissa.

    Dagnamnen matchas tolerant: sidan skriver "Mondag" för måndag, och den
    stavningen har stått där länge nog att räknas som sidans normala läge.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    # Kända skrivningar per veckodag. Sidans egna "Mondag" ligger med, liksom
    # några uppenbara grannar — det är billigare att acceptera en felstavning
    # än att tappa en hel dag för att någon skrev fel i WordPress.
    DAY_SPELLINGS = {
        'Måndag': ('måndag', 'mandag', 'mondag', 'monday'),
        'Tisdag': ('tisdag', 'tuesday'),
        'Onsdag': ('onsdag', 'wednesday'),
        'Torsdag': ('torsdag', 'thursday'),
        'Fredag': ('fredag', 'friday'),
    }

    # Gatan som avgör om trucken står i Mjärdevi. Ett gatunamn och inte en
    # husnummersträng: "Teknikringen 22 Dataton" kan lika gärna skrivas om
    # till "Teknikringen 22, Dataton" utan att något egentligen ändrats.
    # Flyttar de till en annan adress i området slutar den här matcha, och då
    # krymper menyn i stället för att bli osann — rätt håll att fela åt.
    MJARDEVI_STREET = 'teknikringen'

    MENU_START = 'vår menu'
    MENU_END = 'du hittar oss på'

    def __init__(self):
        super().__init__({
            'name': 'Sukaldari',
            'website': 'https://sukaldari.se',
            'menu_url': 'https://sukaldari.se/',
        })

    def _modules(self, soup) -> List[Tag]:
        """Divis textmoduler i dokumentordning, en per rubrik eller stycke."""
        return soup.select('.et_pb_text_inner')

    def _lone_child(self, module: Tag) -> Optional[Tag]:
        """Modulens enda innehållselement, om det finns precis ett."""
        children = module.find_all(True, recursive=False)
        return children[0] if len(children) == 1 else None

    def _index_of(self, modules: List[Tag], heading: str) -> Optional[int]:
        for index, module in enumerate(modules):
            if self.clean_text(module.get_text(' ', strip=True)).lower() == heading:
                return index
        return None

    def _day_from_text(self, text: str) -> Optional[str]:
        """Veckodagen ur ett ord, med sidans stavningar tillåtna."""
        word = text.strip().lower()
        for day, spellings in self.DAY_SPELLINGS.items():
            if word in spellings:
                return day
        return None

    def _days_from_heading(self, text: str) -> List[str]:
        """Dagarna en schemarubrik står för: "Fredag" eller "Mondag – Onsdag".

        Intervallet skrivs med tankstreck på sidan, men bindestreck är minst
        lika troligt nästa gång någon redigerar. Båda tas.
        """
        parts = [part for part in re.split(r'[–—-]', text) if part.strip()]

        if len(parts) == 2:
            start = self._day_from_text(parts[0])
            end = self._day_from_text(parts[1])
            if start and end:
                first = self.SWEDISH_DAYS.index(start)
                last = self.SWEDISH_DAYS.index(end)
                if first <= last:
                    return self.SWEDISH_DAYS[first:last + 1]

        single = self._day_from_text(text)
        return [single] if single else []

    def _dishes(self, modules: List[Tag], start: int, end: int) -> List[str]:
        """Rätterna mellan menyrubriken och platsblocket.

        En rätt är en ``h5``-modul följd av en ``p``-modul med beskrivningen.
        Saknas beskrivningen tas namnet ändå — halva sanningen är bättre än
        ingen, och det syns direkt i utdata.

        Kategorin är rättens eget namn. Sidan har ingen kategoriindelning för
        burgarna, och att hitta på en ("KÖTT", "VEGETARISKT") vore ett
        påstående om maten som källan inte gör. ``Fries`` däremot är en rubrik
        restaurangen själv satt, och den används som kategori för raderna
        under sig.
        """
        dishes: List[str] = []
        category: Optional[str] = None

        index = start + 1
        while index < end:
            child = self._lone_child(modules[index])
            if child is None:
                index += 1
                continue

            text = self.clean_text(child.get_text(' ', strip=True))
            if not text:
                index += 1
                continue

            if child.name == 'h5':
                # Rättens namn. Beskrivningen ligger i nästa p-modul, om den
                # kommer före nästa rubrik.
                description = ''
                following = self._lone_child(modules[index + 1]) if index + 1 < end else None
                if following is not None and following.name == 'p':
                    description = self.clean_text(following.get_text(' ', strip=True))
                    index += 1

                # Rättens namn står redan i kategorikolumnen — upprepas det i
                # beskrivningen läser sajten "SANT ELM / Sant Elm - Högrev …".
                # Saknas beskrivning får namnet stå som beskrivning i stället,
                # för en rad utan beskrivning är oläsbar på sajten och går
                # heller inte att bevaka.
                dishes.append(f'<strong>{text}</strong> - {description or text}')
                category = None

            elif child.name in ('h2', 'h3', 'h4'):
                # En kategorirubrik — men bara om den är kort. De långa h4:orna
                # här är brödtext ("Sukaldari's burgare och dressing är
                # hemgjorda !"), inte rubriker, och ska inte bli kategorier.
                category = text if len(text) <= 40 else None

            elif child.name == 'p' and category:
                dishes.append(f'<strong>{category}</strong> - {text}')

            index += 1

        return dishes

    def _mjardevi_days(self, modules: List[Tag], start: int) -> Tuple[List[str], List[str]]:
        """Dagarna trucken står på Teknikringen, och dagarna den står någon
        annanstans.

        Schemat är par av rubriker: en med dagen eller dagintervallet, en med
        adressen. Den andra returneras bara för loggningen — den visar att
        skrapan läst hela schemat och valt bort något, inte att den missat det.
        """
        here: List[str] = []
        elsewhere: List[str] = []
        pending: List[str] = []

        for module in modules[start + 1:]:
            child = self._lone_child(module)
            if child is None:
                continue

            text = self.clean_text(child.get_text(' ', strip=True))
            if not text:
                continue

            days = self._days_from_heading(text)
            if days:
                pending = days
                continue

            if pending:
                if self.MJARDEVI_STREET in text.lower():
                    here.extend(day for day in pending if day not in here)
                else:
                    elsewhere.extend(day for day in pending if day not in elsewhere)
                pending = []

        return here, elsewhere

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content()
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            modules = self._modules(soup)
            menu_start = self._index_of(modules, self.MENU_START)
            menu_end = self._index_of(modules, self.MENU_END)

            if menu_start is None or menu_end is None or menu_end <= menu_start:
                self.log_error(
                    'Hittade inte rubrikerna "Vår menu" och "Du hittar oss på" — '
                    'sidan är ombyggd och tolkningen kan inte lita på ordningen'
                )
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            dishes = self._dishes(modules, menu_start, menu_end)
            if not dishes:
                self.log_warning('Menyrubriken finns men inga rätter under den')
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            here, elsewhere = self._mjardevi_days(modules, menu_end)
            if not here:
                # Antingen står trucken inte i Mjärdevi den här veckan, eller
                # så har schemat skrivits om till något vi inte kan läsa. Båda
                # är fall där vi hellre behåller förra körningens meny än
                # påstår att den står här.
                self.log_error(
                    'Inga dagar med Teknikringen i platsschemat '
                    f'(lästa dagar på annan plats: {", ".join(elsewhere) or "inga"})'
                )
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            days = [day for day in self.SWEDISH_DAYS if day in here]
            items = [f'{day}|{dish}' for day in days for dish in dishes]

            # Foodtrucken är inte självklar för den som läser sajten: en dag
            # utan meny betyder här "står någon annanstans", inte "stängt".
            for day in days:
                items.append(
                    f'INFO:{day} - Restaurant Info: '
                    '🚚 Foodtruck vid Dataton, Teknikringen 22'
                )

            self.log_info(
                f'{len(dishes)} rätter på {len(days)} dagar i Mjärdevi '
                f'({", ".join(days)}); annan plats: {", ".join(elsewhere) or "inga"}'
            )
            return {self.name: items}

        except Exception as error:
            self.log_error(f'Fel vid skrapning: {error}')
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
