#!/usr/bin/env python3
"""Spanar på en restaurangsida inför att en skrapa ska skrivas.

Utvecklingsverktyg. Körs för hand, aldrig av scrape_menus.py, och kräver
playwright — som med flit INTE finns i requirements.txt. Se CLAUDE.md.

Frågan skriptet finns för att besvara är den första man måste svara på:
ligger menyn i HTML:en som `requests` får, eller byggs den av JavaScript?
Därför hämtas sidan två gånger, på båda sätten, och läggs bredvid varandra.

Den råa hämtningen går genom BaseScraper med flit. Den bär retry, IPv4-tvång
och teckenkodningshanteringen, och det är den vägen den färdiga skrapan
kommer att gå — en jämförelse mot ett eget requests.get hade kunnat ge ett
annat svar än verkligheten.
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests

from app.scrapers.base_scraper import BaseScraper

WEEKDAYS = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag']
PRICE = re.compile(r'\b\d{2,4}\s*(?:kr|:-)', re.IGNORECASE)
# Alla menyer bär inte veckodagsnamn. Menydags nycklar sina dagblock på datum
# (id="2026-08-03"), och ett JSON-svar gör ofta detsamma. Utan det här måttet
# ser en sådan meny ut som brus.
ISODATE = re.compile(r'\b20\d{2}-\d{2}-\d{2}\b')

# Bilder mindre än så här på skärmen är logotyper, ikoner och dekor.
MIN_IMAGE_AREA = 250 * 250
MAX_ATTACHMENTS = 12

# Cookierutor täcker menyn på ungefär varannan restaurangsida. Ett
# bästa-försök att klicka bort dem — misslyckas det spelar det sällan roll,
# eftersom rutan ligger ovanpå och inte tar bort innehållet under.
COOKIE_TEXTS = [
    'Godkänn alla', 'Acceptera alla', 'Tillåt alla', 'Godkänn', 'Acceptera',
    'Jag förstår', 'OK', 'Accept all', 'Allow all', 'Accept',
]


class _Spanare(BaseScraper):
    """Minsta möjliga BaseScraper, bara för att låna get_page_content()."""

    def scrape(self):
        raise NotImplementedError('Spanaren skrapar inte, den tittar.')


def synlig_text(html: str) -> str:
    """Texten en läsare ser, utan taggar, script och style."""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, 'html.parser')
    for tag in soup(['script', 'style', 'noscript']):
        tag.decompose()
    return re.sub(r'\s+', ' ', soup.get_text(' ', strip=True))


def menyspar(text: str) -> Dict[str, int]:
    """Grova mått på om en text ser ut att innehålla en lunchmeny."""
    low = text.lower()
    return {
        'veckodagar': sum(1 for d in WEEKDAYS if d in low),
        'priser': len(PRICE.findall(text)),
        'datum': len(set(ISODATE.findall(text))),
        'tecken': len(text),
    }


def hamta_ratt(url: str, ut: str) -> Optional[str]:
    """Sidan som en skrapa ser den. None när hämtningen misslyckas."""
    spanare = _Spanare({'name': 'spana', 'website': url, 'menu_url': url})
    soup = spanare.get_page_content()
    if soup is None:
        return None
    # str(soup) och inte response.text: det är den parsade trädet selektorerna
    # kommer att köras mot, alltså det som faktiskt avgör om steg 1 går.
    html = str(soup)
    _skriv(os.path.join(ut, 'ra.html'), html)
    return html


def hamta_renderat(url: str, ut: str) -> Optional[Dict]:
    """Sidan efter att JavaScript kört, plus all nätverkstrafik."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('playwright saknas. pip install -r requirements-dev.txt '
              '&& playwright install chromium', file=sys.stderr)
        return None

    trafik: List[dict] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(locale='sv-SE')

        def pa_svar(response):
            typ = (response.headers or {}).get('content-type', '')
            # Bilder, typsnitt och CSS bär ingen meny.
            if re.search(r'image/|font/|text/css|javascript', typ):
                return
            post = {
                'url': response.url,
                'status': response.status,
                'typ': typ.split(';')[0],
                'metod': response.request.method,
            }
            try:
                kropp = response.text()
                post['tecken'] = len(kropp)
                post['spar'] = menyspar(kropp)
                post['borjan'] = kropp[:600]
            except Exception:
                post['tecken'] = 0
            trafik.append(post)

        page.on('response', pa_svar)

        try:
            page.goto(url, timeout=45000, wait_until='networkidle')
        except Exception as fel:
            print(f'Sidan laddade inte klart ({fel}). Fortsätter med det som finns.',
                  file=sys.stderr)

        klickat = _klicka_bort_cookies(page)
        if klickat:
            page.wait_for_timeout(1500)

        html = page.content()
        page.screenshot(path=os.path.join(ut, 'sida.png'), full_page=True)
        bilder = _bildkandidater(page)
        lankar = _pdflankar(page, url)
        browser.close()

    _skriv(os.path.join(ut, 'renderad.html'), html)
    with open(os.path.join(ut, 'natverk.jsonl'), 'w', encoding='utf-8') as f:
        for post in trafik:
            f.write(json.dumps(post, ensure_ascii=False) + '\n')

    return {'html': html, 'trafik': trafik, 'bilder': bilder,
            'pdf': lankar, 'cookieklick': klickat}


def _klicka_bort_cookies(page) -> Optional[str]:
    for text in COOKIE_TEXTS:
        try:
            knapp = page.get_by_role('button', name=text, exact=False).first
            if knapp.is_visible(timeout=800):
                knapp.click(timeout=2000)
                return text
        except Exception:
            continue
    return None


def _bildkandidater(page) -> List[str]:
    """Bilder som visas tillräckligt stort för att kunna vara en meny."""
    try:
        rader = page.evaluate(
            """() => Array.from(document.images).map(i => ({
                 src: i.currentSrc || i.src,
                 area: i.getBoundingClientRect().width * i.getBoundingClientRect().height
               }))"""
        )
    except Exception:
        return []
    stora = [r['src'] for r in rader
             if r.get('src') and r.get('area', 0) >= MIN_IMAGE_AREA]
    # Ordningen bevaras men dubbletter bort — samma bild ligger ofta i flera
    # <img> för olika skärmbredder.
    sedda, unika = set(), []
    for src in stora:
        if src not in sedda:
            sedda.add(src)
            unika.append(src)
    return unika[:MAX_ATTACHMENTS]


def _pdflankar(page, bas: str) -> List[str]:
    try:
        href = page.eval_on_selector_all(
            'a[href]', '(as) => as.map(a => a.href)')
    except Exception:
        return []
    pdf = [h for h in href if urlparse(h).path.lower().endswith('.pdf')]
    sedda, unika = set(), []
    for h in pdf:
        h = urljoin(bas, h)
        if h not in sedda:
            sedda.add(h)
            unika.append(h)
    return unika[:MAX_ATTACHMENTS]


def hamta_bilagor(urler: List[str], ut: str) -> List[dict]:
    """Laddar ner bilder och PDF:er, och drar texten ur PDF:erna."""
    if not urler:
        return []
    katalog = os.path.join(ut, 'bilagor')
    os.makedirs(katalog, exist_ok=True)
    resultat = []

    for i, url in enumerate(urler):
        try:
            svar = requests.get(url, timeout=30)
            svar.raise_for_status()
        except Exception as fel:
            resultat.append({'url': url, 'fel': str(fel)})
            continue

        namn = os.path.basename(urlparse(url).path) or f'bilaga{i}'
        if len(namn) > 60:
            namn = namn[-60:]
        sokvag = os.path.join(katalog, f'{i:02d}-{namn}')
        with open(sokvag, 'wb') as f:
            f.write(svar.content)

        post = {
            'url': url,
            'fil': sokvag,
            'byte': len(svar.content),
            'sha256': hashlib.sha256(svar.content).hexdigest(),
        }

        if sokvag.lower().endswith('.pdf'):
            post['text'] = _pdftotext(sokvag)
        resultat.append(post)

    return resultat


def _pdftotext(sokvag: str) -> Optional[str]:
    """Textlagret ur en PDF, om det finns ett.

    En PDF med textlager ska aldrig OCR-tolkas — texten finns redan, exakt.
    Kommer det tillbaka nästan ingenting är PDF:en en inskannad bild.
    """
    ut = sokvag + '.txt'
    try:
        subprocess.run(['pdftotext', '-layout', sokvag, ut],
                       check=True, capture_output=True, timeout=60)
    except FileNotFoundError:
        return None
    except Exception:
        return None
    try:
        with open(ut, encoding='utf-8', errors='replace') as f:
            return f.read()
    except OSError:
        return None


def _skriv(sokvag: str, text: str) -> None:
    with open(sokvag, 'w', encoding='utf-8') as f:
        f.write(text)


def _intressanta_svar(trafik: List[dict]) -> List[dict]:
    """Nätverkssvar som ser ut att bära en meny, bäst först."""
    poang = []
    for post in trafik:
        spar = post.get('spar') or {}
        p = (spar.get('veckodagar', 0) * 3
             + min(spar.get('priser', 0), 10)
             + min(spar.get('datum', 0), 7) * 2)
        # JSON väger bara som utslagsgivare mellan svar som redan bär spår.
        # Utan det villkoret hamnade varje konfigurationsfil på sidan i listan.
        if p > 0 and 'json' in post.get('typ', ''):
            p += 2
        if p > 0:
            poang.append((p, post))
    poang.sort(key=lambda x: -x[0])
    return [post for _, post in poang[:8]]


def main() -> int:
    ap = argparse.ArgumentParser(description='Spanar på en restaurangsida.')
    ap.add_argument('url')
    ap.add_argument('--ut', help='katalog att skriva till (annars en tillfällig)')
    args = ap.parse_args()

    ut = args.ut or tempfile.mkdtemp(prefix='spana-')
    os.makedirs(ut, exist_ok=True)
    print(f'Spanar på {args.url}\nSkriver till {ut}\n')

    ra = hamta_ratt(args.url, ut)
    if ra is None:
        print('RÅ HÄMTNING MISSLYCKADES — sidan svarade inte, eller blockerade oss.')
        print('  Det är i sig ett fynd: blockeras vi härifrån blockeras Actions')
        print('  troligen också. Jämför med Mimolett, som möter Cloudflare.\n')
    ra_spar = menyspar(synlig_text(ra)) if ra else {'veckodagar': 0, 'priser': 0, 'tecken': 0}

    renderat = hamta_renderat(args.url, ut)
    if renderat is None:
        print('Ingen renderad hämtning gjordes.')
        return 1

    if renderat['cookieklick']:
        print(f'Klickade bort en cookieruta ("{renderat["cookieklick"]}").')

    rend_spar = menyspar(synlig_text(renderat['html']))

    bilagor = hamta_bilagor(renderat['bilder'] + renderat['pdf'], ut)

    print('MENYSPÅR I TEXTEN')
    for etikett, spar in (('rå HTML  ', ra_spar), ('renderad ', rend_spar)):
        print(f'  {etikett}    veckodagar {spar["veckodagar"]}/5, '
              f'priser {spar["priser"]}, datum {spar["datum"]}, '
              f'{spar["tecken"]} tecken')

    print('\nSLUTSATS')
    if ra and (ra_spar['veckodagar'] >= 3 or ra_spar['datum'] >= 3):
        print('  Menyn finns i den råa HTML:en. STEG 1 — vanlig skrapa mot sidan.')
    elif ra and ra_spar['priser'] >= 3 and ra_spar['tecken'] > 500:
        print('  Ingen tydlig veckostruktur, men priser finns i rå HTML.')
        print('  Troligen STEG 1 med fast meny — se bistro3_scraper.py.')
    elif (rend_spar['veckodagar'] >= 3 or rend_spar['priser'] >= 3
          or rend_spar['datum'] >= 3):
        print('  Menyn finns BARA efter att JavaScript kört. STEG 2 —')
        print('  leta upp endpointen nedan och skrapa den i stället.')
        print('  Skriv aldrig en selektor du bara sett i renderad.html.')
    elif bilagor:
        print('  Ingen menytext någonstans, men bilagor hittades. STEG 3 eller 4 —')
        print('  läs bilderna/PDF:erna och avgör om menyn är stående eller byts.')
    else:
        print('  Ingen meny hittad alls. Fel URL, inloggning, eller menyn ligger')
        print('  någon annanstans än på den här sidan.')

    intressanta = _intressanta_svar(renderat['trafik'])
    if intressanta:
        print('\nNÄTVERKSSVAR SOM KAN BÄRA MENYN (bäst först)')
        for post in intressanta:
            spar = post.get('spar', {})
            print(f'  [{post["status"]}] {post["typ"]}  '
                  f'veckodagar {spar.get("veckodagar", 0)}, priser {spar.get("priser", 0)}')
            print(f'      {post["url"][:150]}')

    if bilagor:
        print('\nBILAGOR')
        for post in bilagor:
            if 'fel' in post:
                print(f'  MISSLYCKADES {post["url"][:100]} — {post["fel"]}')
                continue
            rad = f'  {post["fil"]}  ({post["byte"]} byte)'
            if post.get('text') is not None:
                tecken = len(post['text'].strip())
                rad += f' — pdftotext gav {tecken} tecken'
                rad += ' (textlager finns, ingen OCR behövs)' if tecken > 200 \
                    else ' (inskannad bild — läs den med egna ögon)'
            elif post['fil'].lower().endswith('.pdf'):
                rad += ' — pdftotext saknas, installera poppler-utils'
            print(rad)
            print(f'      sha256 {post["sha256"]}')
        print('\n  Är menyn stående: läs bilden själv och spara som JSON enligt')
        print('  CLAUDE.md. Använd sha256 ovan som kalla_hash.')

    print(f'\nFiler: {ut}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
