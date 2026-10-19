"""Samma visningsvecka som tavlan: helgen hör till kommande måndag."""
from datetime import datetime, timedelta
import json
from zoneinfo import ZoneInfo

DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']


def menu_monday(today=None):
    today = today or datetime.now(ZoneInfo('Europe/Stockholm')).date()
    return today + timedelta(days=(7 if today.weekday() > 4 else 0) - today.weekday())


def validity_row(monday):
    # Datum behövs även om ett statiskt bygge ligger kvar över veckobytet.
    return 'MENU_VALIDITY:' + json.dumps({
        'valid_from': monday.isoformat(),
        'valid_until': (monday + timedelta(days=4)).isoformat(),
    })
