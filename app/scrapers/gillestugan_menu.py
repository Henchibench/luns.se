"""Gillestugans inbäddade originalflöde och lokal OCR av dess veckobild."""
import base64
from datetime import datetime, timedelta
from io import BytesIO
import json
from pathlib import Path
import re
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from PIL import Image
import requests

from .bo_ocr import _recognize, _line
from .menu_week import DAYS


WIDGET_ID = '0x259c16'
PAGE_ID = '672305505964335'  # API-identiteten för Gillestugan Jerntorget – Lunch.
HEADINGS = ['VECKANS FÅNGST', 'VECKANS PASTA', 'VECKANS BURGARE', 'VECKANS VEGO', 'STAMMISEN']
PRICE = re.compile(r'^(.*?)\s+(\d{2,3}):-$')


def fetch_posts(soup):
    scripts = {s.get('src', '').split('?')[0] for s in soup.select('script[src]')}
    if f'https://wdg.fouita.com/widgets/{WIDGET_ID}.js' not in scripts:
        raise ValueError('Lunchsidans verifierade widget saknas')
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
        raise ValueError('Widgeten pekar inte på Gillestugans lunchsida')
    response = requests.post('https://social-api.fouita.com/social/fb/get-page-data',
        json={'selectedPages': selected, 'userKey': feed['key'], 'skip': False}, timeout=30)
    response.raise_for_status()
    pages = response.json()
    if not isinstance(pages, list) or len(pages) != 1 or pages[0]['id'] != PAGE_ID:
        raise ValueError('Flödet kommer inte från Gillestugan')
    # Behåll bara publiceringstid och bildadresser; aldrig konton, kommentarer,
    # reaktioner, flödesnycklar eller råsvar i logg/filer.
    posts = []
    for post in pages[0].get('data', []):
        photos = []
        for attachment in (post.get('attachments') or {}).get('data', []):
            if attachment.get('media_type') == 'photo':
                photos.append(attachment.get('media', {}).get('image', {}).get('src'))
        posts.append({'created_time': post.get('created_time'), 'photos': photos})
    return posts


def select_image(posts, monday):
    candidates = []
    for post in posts:
        try:
            stamp = datetime.fromisoformat(post['created_time'])
            if stamp.tzinfo is None:
                continue
            published = stamp.astimezone(ZoneInfo('Europe/Stockholm')).date()
        except (TypeError, ValueError, KeyError):
            continue
        if not monday - timedelta(days=3) <= published <= monday + timedelta(days=4):
            continue
        photos = post.get('photos', [])
        if len(photos) != 1 or not isinstance(photos[0], str):
            raise ValueError('Veckoinlägget saknar en entydig menybild')
        parsed = urlsplit(photos[0])
        if parsed.scheme != 'https' or not (parsed.hostname or '').endswith('.fbcdn.net'):
            raise ValueError('Oväntad bildkälla')
        candidates.append((stamp, photos[0]))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    if len(candidates) > 1 and candidates[0][0] == candidates[1][0] and candidates[0][1] != candidates[1][1]:
        raise ValueError('Flera menybilder med samma publiceringstid')
    return candidates[0][1]


def download_image(url):
    with requests.get(url, timeout=30, stream=True) as response:
        response.raise_for_status()
        data, size = [], 0
        for chunk in response.iter_content(65536):
            size += len(chunk)
            if size > 10_000_000:
                raise ValueError('Menybilden är för stor')
            data.append(chunk)
    return b''.join(data)


def read_image(content):
    """Läs veckonummer och de två kolumnerna separat i den kontrollerade mallen."""
    boxes = [(330, 178, 402, 208), (45, 260, 355, 900), (380, 260, 666, 953)]
    with Image.open(BytesIO(content)) as image, TemporaryDirectory(prefix='luns-gille-') as directory:
        if image.width < 600 or image.width * image.height > 25_000_000:
            raise ValueError('Menybildens upplösning stöds inte')
        if abs(image.height / image.width - 1018 / 720) > .03:
            raise ValueError('Menybildens layout har ändrats')
        image = image.convert('RGB')
        columns = []
        for index, box in enumerate(boxes):
            crop = image.crop(tuple(round(v * (image.width / 720 if i % 2 == 0 else image.height / 1018))
                                    for i, v in enumerate(box)))
            factor = min(4, 2880 / image.width)
            crop = crop.resize((round(crop.width * factor), round(crop.height * factor)), Image.Resampling.LANCZOS)
            path = Path(directory) / f'{index}.png'
            crop.save(path)
            lines = []
            for words in _recognize(path, 7 if index == 0 else 3):
                # Dekorativa punkter/pilar runt rubrikerna varierar i OCR.
                words = [w for w in words if w['text'].strip('•·»«*+| ') != '']
                if words:
                    lines.append(_line(words))
            columns.append(lines)
    return columns


def parse_columns(columns, monday):
    week_lines, left, right = columns
    if len(week_lines) != 1 or week_lines[0].confidence < 70:
        raise ValueError('Veckonumret kunde inte läsas säkert')
    match = re.fullmatch(r'[Vv]{1,2}\.\s*(\d{1,2})', week_lines[0].text)
    if not match or int(match[1]) != monday.isocalendar().week:
        raise ValueError('Bilden gäller inte visningsveckan')
    if any(line.confidence < 70 for line in left + right):
        raise ValueError('Osäker textavläsning')
    left = [line.text.strip() for line in left]
    right = [line.text.strip() for line in right]
    if len(left) < 3 or left[0] != 'DAGENS RÄTT' or not re.fullmatch(r'\d{2,3}:-', left[1]):
        raise ValueError('Dagens pris saknas')
    daily_price = int(left[1][:-2])
    if not 50 <= daily_price <= 500:
        raise ValueError('Orimligt pris')
    daily, current = {}, None
    for text in left[2:]:
        if text in [d.upper() for d in DAYS]:
            current = DAYS[[d.upper() for d in DAYS].index(text)]
            if current in daily:
                raise ValueError('Dubblerad dag')
            daily[current] = []
        elif current:
            daily[current].append(text)
        else:
            raise ValueError('Oväntad text före dagarna')
    if list(daily) != DAYS:
        raise ValueError('Ofullständiga eller omkastade dagar')
    entries = {heading: [] for heading in HEADINGS}
    seen, current, info = [], None, []
    for text in right:
        if text in HEADINGS:
            seen.append(text)
            current = text
        elif text.startswith('Serveras varje helgfri vardag') or info:
            info.append(text)
        elif current:
            entries[current].append(text)
        else:
            raise ValueError('Oväntad veckorubrik')
    if seen != HEADINGS or len(info) != 2 or not info[1].startswith('Sallad,'):
        raise ValueError('Veckoblock eller sidans slut saknas')

    def join_dish(lines):
        if len(lines) < 2 or not lines[0][0].isupper():
            raise ValueError('Rättnamn eller beskrivning saknas')
        # Radbrutna namn som CHILI- / MARINERAD förenas utan nya ord.
        text = lines[0]
        for line in lines[1:]:
            text += ('' if text.endswith('-') else ' ') + line
        return text

    weekly = []
    for heading, lines in entries.items():
        dishes, pending = [], None
        for text in lines:
            priced = PRICE.fullmatch(text)
            if priced:
                if pending:
                    dishes.append(pending)
                if not 50 <= int(priced[2]) <= 500:
                    raise ValueError('Orimligt veckopris')
                pending = ([priced[1]], priced[2])
            elif pending:
                pending[0].append(text)
            else:
                raise ValueError('Veckorätt saknar namn/pris')
        if pending:
            dishes.append(pending)
        if len(dishes) != (2 if heading == 'STAMMISEN' else 1):
            raise ValueError('Ofullständigt veckoblock')
        weekly.extend((heading.capitalize(), join_dish(body), price) for body, price in dishes)
    rows = []
    for day in DAYS:
        body = daily[day]
        if not any(text.startswith(('med ', 'Serveras ')) for text in body):
            raise ValueError('Dagsrättens beskrivning saknas')
        rows.append(f'{day}|<strong>Dagens</strong> - {join_dish(body)} ({daily_price} kr)')
        rows.extend(f'{day}|<strong>{category}</strong> - {text} ({price} kr)' for category, text, price in weekly)
        rows.append(f'INFO:{day} - Restaurant Info: {" ".join(info)}')
    return rows
