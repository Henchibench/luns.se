"""Osäker/äldre källmeny visas separat och räknas aldrig som aktuell mat."""
import json


def reference_row(label, warning, url, rows):
    return 'MENU_REFERENCE:' + json.dumps({
        'label': label, 'warning': warning, 'url': url,
        'rows': [row for row in rows if not row.startswith('INFO:')],
    }, ensure_ascii=False)
