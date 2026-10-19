"""Liten PDF-textläsare för restaurangernas maskinskapade menyer.

Modulen är medvetet smal. Den hanterar textlager med ToUnicode-tabeller och
Flate-komprimerade innehållsströmmar, vilket är formaten som de kontrollerade
Google Docs- och Canva-menyerna använder. Den är inte OCR och försöker aldrig
tolka en bild som text.

Vi har inget PDF-paket i produktionsmiljön. Att anropa ``pdftotext`` skulle
fungera på utvecklingsservern men verktyget finns inte i GitHub Actions
garanterade paketlista, så tolkningen här använder bara standardbiblioteket.
"""

from __future__ import annotations

from dataclasses import dataclass
import re
import zlib
from typing import Dict, Iterator, List, Optional, Tuple, Union


class PdfTextError(ValueError):
    """PDF-filen saknar ett textlager som den smala läsaren kan använda."""


_OBJECT = re.compile(rb"(?m)(\d+)\s+(\d+)\s+obj\b")
_REFERENCE = re.compile(rb"(\d+)\s+\d+\s+R")
_FONT_REFERENCE = re.compile(rb"/([^\s/<>()\[\]]+)\s+(\d+)\s+\d+\s+R")


def _objects(document: bytes) -> Dict[int, bytes]:
    matches = list(_OBJECT.finditer(document))
    result: Dict[int, bytes] = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(document)
        result[int(match.group(1))] = document[match.end():end]
    return result


def _stream(body: bytes) -> Optional[bytes]:
    marker = re.search(rb"stream\r?\n", body)
    if marker is None:
        return None
    end = body.rfind(b"endstream")
    if end < marker.end():
        return None
    # zlib tillåter radbrytningen före ``endstream`` som släpande data.
    # ``rstrip`` är däremot farligt: en giltig komprimerad ström kan själv
    # sluta med en byte som råkar klassas som blanktecken.
    payload = body[marker.end():end]
    dictionary = body[:marker.start()]
    if b"/FlateDecode" in dictionary:
        try:
            payload = zlib.decompress(payload)
        except zlib.error as error:
            raise PdfTextError(f"kunde inte packa upp PDF-strömmen: {error}") from error
    elif b"/Filter" in dictionary:
        # JPEG-/bildströmmar hör inte till textlagret. De hoppas över; om
        # dokumentet enbart består av sådana fångas det av längdkontrollen.
        return None
    return payload


def _unicode(hex_value: bytes) -> str:
    raw = bytes.fromhex(re.sub(rb"\s+", b"", hex_value).decode("ascii"))
    if not raw:
        return ""
    if len(raw) % 2 == 0:
        try:
            return raw.decode("utf-16-be")
        except UnicodeDecodeError:
            pass
    return raw.decode("cp1252", errors="replace")


@dataclass(frozen=True)
class _CMap:
    values: Dict[bytes, str]
    lengths: Tuple[int, ...]

    def decode(self, raw: bytes) -> str:
        if not self.values:
            return raw.decode("cp1252", errors="replace")
        output: List[str] = []
        position = 0
        while position < len(raw):
            for length in self.lengths:
                value = self.values.get(raw[position:position + length])
                if value is not None:
                    output.append(value)
                    position += length
                    break
            else:
                # Ett okänt tecken får inte flytta resten av strängen ur fas.
                output.append("�")
                position += min(self.lengths, default=1)
        return "".join(output)


def _cmap(data: bytes) -> _CMap:
    values: Dict[bytes, str] = {}
    for block in re.findall(rb"beginbfchar(.*?)endbfchar", data, re.S):
        for source, target in re.findall(rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", block):
            values[bytes.fromhex(source.decode("ascii"))] = _unicode(target)

    for block in re.findall(rb"beginbfrange(.*?)endbfrange", data, re.S):
        entries = re.findall(
            rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(\[[^\]]*\]|<[0-9A-Fa-f]+>)",
            block,
            re.S,
        )
        for first_hex, last_hex, target in entries:
            first = int(first_hex, 16)
            last = int(last_hex, 16)
            width = len(first_hex) // 2
            if target.startswith(b"["):
                destinations = re.findall(rb"<([0-9A-Fa-f]+)>", target)
                for offset, destination in enumerate(destinations[:last - first + 1]):
                    values[(first + offset).to_bytes(width, "big")] = _unicode(destination)
            else:
                base_hex = target.strip(b"<>")
                base = int(base_hex, 16)
                destination_width = len(base_hex) // 2
                for code in range(first, last + 1):
                    destination = (base + code - first).to_bytes(destination_width, "big")
                    values[code.to_bytes(width, "big")] = _unicode(destination.hex().encode("ascii"))

    lengths = tuple(sorted({len(key) for key in values}, reverse=True))
    return _CMap(values, lengths)


def _font_maps(objects: Dict[int, bytes]) -> Dict[str, _CMap]:
    by_object: Dict[int, _CMap] = {}
    for number, body in objects.items():
        match = re.search(rb"/ToUnicode\s+(\d+)\s+\d+\s+R", body)
        if match is None:
            continue
        unicode_body = objects.get(int(match.group(1)))
        unicode_stream = _stream(unicode_body) if unicode_body else None
        if unicode_stream:
            by_object[number] = _cmap(unicode_stream)

    result: Dict[str, _CMap] = {}
    for body in objects.values():
        for name, object_number in _FONT_REFERENCE.findall(body):
            mapping = by_object.get(int(object_number))
            if mapping and name.decode("latin1") not in result:
                result[name.decode("latin1")] = mapping
    return result


@dataclass(frozen=True)
class _Name:
    value: str


@dataclass(frozen=True)
class _String:
    value: bytes


Token = Union[float, str, _Name, _String, List["Token"]]


def _literal(data: bytes, start: int) -> Tuple[_String, int]:
    result = bytearray()
    depth = 1
    position = start + 1
    escapes = {ord("n"): b"\n", ord("r"): b"\r", ord("t"): b"\t", ord("b"): b"\b", ord("f"): b"\f"}
    while position < len(data) and depth:
        value = data[position]
        position += 1
        if value == ord("\\") and position < len(data):
            escaped = data[position]
            position += 1
            if escaped in escapes:
                result.extend(escapes[escaped])
            elif escaped in b"\r\n":
                if escaped == ord("\r") and position < len(data) and data[position] == ord("\n"):
                    position += 1
            elif ord("0") <= escaped <= ord("7"):
                digits = bytes([escaped])
                while len(digits) < 3 and position < len(data) and ord("0") <= data[position] <= ord("7"):
                    digits += bytes([data[position]])
                    position += 1
                result.append(int(digits, 8))
            else:
                result.append(escaped)
        elif value == ord("("):
            depth += 1
            result.append(value)
        elif value == ord(")"):
            depth -= 1
            if depth:
                result.append(value)
        else:
            result.append(value)
    return _String(bytes(result)), position


def _tokens(data: bytes, start: int = 0, stop: Optional[int] = None) -> Iterator[Tuple[Token, int]]:
    position = start
    while position < len(data):
        value = data[position]
        if stop is not None and value == stop:
            return
        if value in b" \t\r\n\x0c\x00":
            position += 1
            continue
        if value == ord("%"):
            newline = data.find(b"\n", position)
            position = len(data) if newline < 0 else newline + 1
            continue
        if value == ord("("):
            token, position = _literal(data, position)
            yield token, position
            continue
        if value == ord("<") and position + 1 < len(data) and data[position + 1] != ord("<"):
            end = data.find(b">", position + 1)
            if end < 0:
                return
            compact = re.sub(rb"\s+", b"", data[position + 1:end])
            if len(compact) % 2:
                compact += b"0"
            yield _String(bytes.fromhex(compact.decode("ascii"))), end + 1
            position = end + 1
            continue
        if data[position:position + 2] in (b"<<", b">>"):
            yield data[position:position + 2].decode("ascii"), position + 2
            position += 2
            continue
        if value == ord("["):
            array: List[Token] = []
            array_end = position + 1
            for token, array_end in _tokens(data, position + 1, ord("]")):
                array.append(token)
            yield array, array_end + 1
            position = array_end + 1
            continue
        end = position + 1
        while end < len(data) and data[end] not in b" \t\r\n\x0c\x00()<>[]{}/%":
            end += 1
        if value == ord("/"):
            end = position + 1
            while end < len(data) and data[end] not in b" \t\r\n\x0c\x00()<>[]{}/%":
                end += 1
            yield _Name(data[position + 1:end].decode("latin1")), end
        else:
            word = data[position:end].decode("latin1")
            try:
                yield float(word), end
            except ValueError:
                yield word, end
        position = end


def _decode(value: _String, font: Optional[_CMap]) -> str:
    if font:
        return font.decode(value.value)
    if value.value.startswith((b"\xfe\xff", b"\xff\xfe")):
        return value.value.decode("utf-16", errors="replace")
    return value.value.decode("cp1252", errors="replace")


def _content_text(data: bytes, fonts: Dict[str, _CMap]) -> str:
    operands: List[Token] = []
    lines: List[str] = []
    current: List[str] = []
    font: Optional[_CMap] = None
    in_text = False

    def newline() -> None:
        text = "".join(current)
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            lines.append(text)
        current.clear()

    for token, _ in _tokens(data):
        if not isinstance(token, str):
            operands.append(token)
            continue
        operator = token
        if operator == "BT":
            newline()
            in_text = True
        elif operator == "ET":
            newline()
            in_text = False
        elif in_text and operator == "Tf" and len(operands) >= 2 and isinstance(operands[-2], _Name):
            font = fonts.get(operands[-2].value)
        elif in_text and operator in ("Td", "TD") and len(operands) >= 2:
            if isinstance(operands[-1], float) and abs(operands[-1]) > 0.01:
                newline()
        elif in_text and operator == "Tm" and len(operands) >= 6:
            newline()
        elif in_text and operator == "T*":
            newline()
        elif in_text and operator == "Tj" and operands and isinstance(operands[-1], _String):
            current.append(_decode(operands[-1], font))
        elif in_text and operator == "TJ" and operands and isinstance(operands[-1], list):
            for item in operands[-1]:
                if isinstance(item, _String):
                    current.append(_decode(item, font))
                elif isinstance(item, float) and item < -220:
                    current.append(" ")
        elif in_text and operator in ("'", '"') and operands and isinstance(operands[-1], _String):
            newline()
            current.append(_decode(operands[-1], font))
        operands.clear()
    newline()
    return "\n".join(lines)


def extract_pdf_text(document: bytes) -> str:
    """Returnera text ur en textbärande PDF utan externa program.

    Ett tomt eller mycket kort resultat behandlas som avsaknad av textlager.
    Det gör att en menybild aldrig råkar passera som en lyckad skrapning.
    """
    if not document.startswith(b"%PDF-"):
        raise PdfTextError("svaret är inte en PDF")
    objects = _objects(document)
    if not objects:
        raise PdfTextError("PDF-filen saknar läsbara objekt")
    fonts = _font_maps(objects)
    pieces: List[str] = []
    for body in objects.values():
        stream = _stream(body)
        if stream and b"BT" in stream and (b"Tj" in stream or b"TJ" in stream):
            text = _content_text(stream, fonts)
            if text:
                pieces.append(text)
    result = "\n".join(pieces)
    result = re.sub(r"[ \t]+", " ", result)
    result = re.sub(r"\n{3,}", "\n\n", result).strip()
    if len(result) < 40:
        raise PdfTextError("PDF-filen saknar användbart textlager")
    return result
