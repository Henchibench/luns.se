"""Lokal OCR av BO:s bild; inga externa text- eller modelltjänster."""
import csv
from dataclasses import dataclass
from io import BytesIO, StringIO
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory

from PIL import Image


@dataclass
class TextLine:
    text: str
    confidence: float = 100


# BO skriver priset efter rättnamnet på samma rad, utan valutasuffix.
DISH = re.compile(r"^([A-ZÅÄÖÉ][A-ZÅÄÖÉa-zåäöé’' &/(),.\-]+?)\s+(\d{2,3})$")


def _recognize(path, mode):
    result = subprocess.run(
        ['tesseract', str(path), 'stdout', '-l', 'swe', '--psm', str(mode),
         '-c', 'tessedit_create_tsv=1'],
        capture_output=True, text=True, timeout=30, check=True,
    )
    groups = {}
    for word in csv.DictReader(StringIO(result.stdout), delimiter='\t', quoting=csv.QUOTE_NONE):
        if word['level'] == '5' and word['text'].strip():
            key = tuple(word[k] for k in ('page_num', 'block_num', 'par_num', 'line_num'))
            groups.setdefault(key, []).append(word)
    return list(groups.values())


def _line(words):
    return TextLine(' '.join(w['text'] for w in words),
                    sum(float(w['conf']) for w in words) / len(words))


def read_menu_image(content):
    with Image.open(BytesIO(content)) as image, TemporaryDirectory(prefix='luns-bo-') as directory:
        if image.width * image.height > 25_000_000:
            raise ValueError('Menybilden är för stor')
        image = image.convert('RGB')
        page = Path(directory) / 'page.png'
        image.save(page)
        lines = []
        for words in _recognize(page, 3):
            line = _line(words)
            if line.text.strip() == 'LUNCHDRYCK':
                lines.append(line)
                break
            if DISH.fullmatch(line.text):
                # Helbildsläsningen tappar prickar över BO:s tunna versaler.
                # En andra läsning av rättens egen rad återfår dem utan ordlista
                # eller gissade rättelser. Marginalen behåller accenterna.
                left = min(int(w['left']) for w in words)
                top = min(int(w['top']) for w in words)
                right = max(int(w['left']) + int(w['width']) for w in words)
                bottom = max(int(w['top']) + int(w['height']) for w in words)
                crop = Path(directory) / 'line.png'
                image.crop((max(0, left - 20), max(0, top - 30),
                            min(image.width, right + 20), min(image.height, bottom + 20))).save(crop)
                refined = _recognize(crop, 7)
                if len(refined) != 1:
                    raise ValueError('Rättnamnets rad kunde inte läsas entydigt')
                original_price = DISH.fullmatch(line.text)[2]
                line = _line(refined[0])
                match = DISH.fullmatch(line.text)
                if not match or match[2] != original_price:
                    raise ValueError('De två avläsningarna ger olika pris eller rättstruktur')
            lines.append(line)
        return lines
