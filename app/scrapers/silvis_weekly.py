"""Läs samma offentliga Facebook-flöde som Silvis bäddar in på lunchsidan."""
import base64
from datetime import datetime, timedelta
import json
import re
from zoneinfo import ZoneInfo

import requests

from .menu_week import menu_monday, validity_row

WIDGET_ID = '0x111b3d'
PAGE_ID = '254527854405580'
HEADINGS = ['VECKANS KÖTT', 'VECKANS KYCKLING', 'BLANDAD KÖTTMIX', 'MEZE MIX KÖTT/VEG']


def fetch_posts():
    # Identifieraren kommer från script-taggen på Silvis egen lunchsida.
    # Endast restaurangens valda flöde läses. Inga Facebook-tokens används,
    # och svarens personuppgifter/paginering sparas eller loggas aldrig.
    response = requests.post('https://api2.fouita.com/v1/q/widget',
                             json={'uid': WIDGET_ID}, timeout=20)
    response.raise_for_status()
    payload = response.json()
    if 'json' in payload:
        payload = json.loads(base64.b64decode(payload['json']))
    feeds = payload['q'][0]['data_feed']
    if len(feeds) != 1:
        raise ValueError('Widgetens flöde har ändrats')
    feed = json.loads(base64.b64decode(feeds[0]['feed_data']))
    selected = feed['selectedPages']
    if len(selected) != 1 or selected[0]['id'] != PAGE_ID:
        raise ValueError('Widgeten pekar inte längre på Silvis Lunch')
    response = requests.post('https://social-api.fouita.com/social/fb/get-page-data',
                             json={'selectedPages': selected, 'userKey': feed['key'], 'skip': False}, timeout=30)
    response.raise_for_status()
    pages = response.json()
    if not isinstance(pages, list) or len(pages) != 1 or pages[0]['id'] != PAGE_ID:
        raise ValueError('Svaret kommer inte från Silvis Lunch')
    return [{key: post.get(key) for key in ('message', 'created_time')}
            for post in pages[0].get('data', [])]


def weekly_row(posts, monday=None):
    monday = monday or menu_monday()
    candidates = []
    for post in posts:
        message = post.get('message') or ''
        match = re.search(r'Välkomna till Silvis\s+V\.(\d{1,2})\b', message, re.I)
        if not match or int(match[1]) != monday.isocalendar().week:
            continue
        try:
            stamp = datetime.fromisoformat(post['created_time']).astimezone(ZoneInfo('Europe/Stockholm')).date()
        except (TypeError, ValueError):
            continue
        # Årtalet i Facebooks datum skyddar mot samma veckonummer förra året.
        if monday - timedelta(days=3) <= stamp <= monday + timedelta(days=4):
            candidates.append((post['created_time'], message))
    if not candidates:
        return None
    message = max(candidates)[1]
    lines = [' '.join(line.split()) for line in message.splitlines() if line.strip()]
    if not any(re.fullmatch(r'Lunchen Serveras Tisdag-Fredag 11\.00-14\.00\.', line, re.I) for line in lines):
        raise ValueError('Lunchdagarna i veckoinlägget har ändrats')
    if any(lines.count(heading) != 1 for heading in HEADINGS):
        raise ValueError('Veckorätternas rubriker saknas eller upprepas')
    positions = [lines.index(heading) for heading in HEADINGS]
    if positions != sorted(positions):
        raise ValueError('Veckorätternas rubriker har ändrats')
    rows = []
    for index, (heading, start) in enumerate(zip(HEADINGS, positions)):
        stop = positions[index + 1] if index + 1 < len(positions) else len(lines)
        body = lines[start + 1:stop]
        price = re.fullmatch(r'(\d{2,3})\s*kr', body[-1]) if body else None
        if len(body) < 2 or not price or any(re.fullmatch(r'\d+\s*kr', line) for line in body[:-1]):
            raise ValueError('Ofullständigt veckoblock eller oväntad extra rätt')
        description = ' '.join(body[:-1])
        category = 'Mezemix' if heading == 'MEZE MIX KÖTT/VEG' else heading.capitalize()
        for day in ['Tisdag', 'Onsdag', 'Torsdag', 'Fredag']:
            rows.append(f'{day}|<strong>{category}</strong> - {description} ({price[1]} kr)')
    # Tillägget har egen giltighet: stående rätter ska finnas kvar även om ett
    # gammalt statiskt bygge ligger uppe när veckan byts.
    validity = json.loads(validity_row(monday).split(':', 1)[1])
    return 'MENU_WEEKLY:' + json.dumps({**validity, 'rows': rows}, ensure_ascii=False)
