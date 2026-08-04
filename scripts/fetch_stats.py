#!/usr/bin/env python3
"""Hämtar besöksstatistik från Umami och skriver public/data/stats.json.

Körs vid bygget, som skrapan. Ingen nyckel når därför besökaren och sajten
anropar ingen analystjänst när någon öppnar statistikrutan.

Umami Cloud tar betalt för API-nycklar, men delningslänkens egen väg är öppen:
GET /api/share/<slug> lämnar ut ett websiteId och en JWT, och med den plus två
headers svarar de vanliga statistikanropen. Odokumenterat, alltså något som kan
sluta fungera utan förvarning — därför avbryter skriptet tyst i stället för att
fälla hela bygget. Menyerna är viktigare än kuriosan.

Miljövariabler:
    UMAMI_SHARE_SLUG    krävs, slugen ur delningslänken
    UMAMI_SHARE_BASE    valfri, standard är EU-regionens adress
    UMAMI_HOSTNAME      valfri, standard luns.se. Se HOSTNAME nedan.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from pathlib import Path

BASE = os.environ.get("UMAMI_SHARE_BASE", "https://cloud.umami.is/analytics/eu/api")
SLUG = os.environ.get("UMAMI_SHARE_SLUG", "")

# Umami räknar i klientens tidszon om man ber om det. Utan detta hamnar
# lunchtoppen en timme fel på sommaren.
TZ = "Europe/Stockholm"
DAYS = 30
OUT = Path(__file__).resolve().parent.parent / "nextjs-luns-se" / "public" / "data" / "stats.json"

# Allt räknas per värdnamn, annars blandas våra egna klick in bland besökarnas.
# Umami hade 135 händelser registrerade — favoritmarkeringar på "Testkrogen
# Tannefors" och andra ställen som aldrig funnits i vår data — och med det här
# filtret blir samma fråga noll. Varenda en kom från utveckling, vilket stämmer
# med att versionen som ligger live inte skickar en enda händelse.
#
# Ett datumstopp hade fungerat lika bra idag och gått sönder nästa gång någon
# kör en produktionsbygge lokalt. Värdnamnet håller.
HOSTNAME = os.environ.get("UMAMI_HOSTNAME", "luns.se")

# Sajten listar lunchmenyer i Göteborg. En besökare från Singapore letar inte
# lunch på Lindholmen, så allt utanför Sverige är brus — crawlers, skannrar,
# någon som klickat fel. Just nu rör det fyra av 77 besökare, alltså inget som
# välter statistiken, men skevheten växer om sajten någon gång blir upptäckt av
# en botfarm.
COUNTRY = os.environ.get("UMAMI_COUNTRY", "SE")

WEEKDAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"]

# Vilka händelser som blir vilket avsnitt. Namnen måste matcha det sajten
# faktiskt skickar — se trackEvent-anropen i src/app/hooks/.
#   avsnitt, händelse, egenskap, är egenskapen ett id?
# Restaurang- och rättnamn kommer ordagrant ur menydatan och ska inte röras —
# pretty() hade gjort "Bar Schiacciate" till "Bar schiacciate".
BREAKDOWNS = [
    ("restaurants", "favorite-toggle", "restaurant", False),
    ("dishes", "dish-favorite-toggle", "dish", False),
    ("locations", "location-select", "location", True),
    ("cravings", "craving-toggle", "craving", True),
]


class Unavailable(Exception):
    """Umami svarade inte som väntat. Inte ett fel värt att fälla bygget för."""


def api(path: str, token: str | None = None, **params) -> object:
    url = f"{BASE}/{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    headers = {"Accept": "application/json", "User-Agent": "luns.se-build"}
    if token:
        # Båda krävs. Bara token ger 401 — det tog sju försök att lista ut.
        headers["x-umami-share-token"] = token
        headers["x-umami-share-context"] = "1"
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode())
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as error:
        raise Unavailable(f"{path}: {error}") from error


def local(stamp: str) -> datetime:
    """Umami stämplar bucketarna i UTC men lägger dem på lokal dygnsgräns.

    Midnatt den 6 juli i Stockholm kommer alltså som 2026-07-05T22:00:00Z. Läser
    man den som UTC hamnar måndagens besök på söndagen och lunchtoppen två
    timmar för tidigt — det såg ut som att sajten var populärast på söndagar
    klockan åtta, vilket är fel dag och fel tid för en lunchsajt.
    """
    return datetime.fromisoformat(stamp.replace("Z", "+00:00")).astimezone(ZoneInfo(TZ))


def pretty(value: str) -> str:
    """Sajten skickar id:n — 'hamburgare', 'lindholmen'. Rutan visar text."""
    return value.replace("-", " ").replace("_", " ").strip().capitalize()


def parse_series(rows: object, key: str = "pageviews") -> list[dict]:
    """Umami svarar än med en lista, än med {"pageviews": [...]}."""
    if isinstance(rows, dict):
        rows = rows.get(key, [])
    return [row for row in rows if isinstance(row, dict)]


def build_stats() -> dict:
    if not SLUG:
        raise Unavailable("UMAMI_SHARE_SLUG saknas")

    share = api(f"share/{SLUG}")
    if not isinstance(share, dict) or "token" not in share:
        raise Unavailable("delningslänken lämnade ingen token")
    token, website = share["token"], share["websiteId"]

    end = int(time.time() * 1000)
    start = end - DAYS * 24 * 3600 * 1000
    window = {"startAt": start, "endAt": end, "timezone": TZ, "hostname": HOSTNAME}
    if COUNTRY:
        window["country"] = COUNTRY

    summary = api(f"websites/{website}/stats", token, **window)
    if not isinstance(summary, dict) or "visits" not in summary:
        raise Unavailable("stats svarade utan besökssiffra")

    daily = parse_series(api(f"websites/{website}/pageviews", token, unit="day", **window))
    weekday_totals = defaultdict(int)
    for row in daily:
        weekday_totals[local(str(row["x"])).weekday()] += row.get("y", 0)

    hourly = parse_series(api(f"websites/{website}/pageviews", token, unit="hour", **window))
    hours = [0] * 24
    for row in hourly:
        hours[local(str(row["x"])).hour] += row.get("y", 0)

    stats = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "period": {"label": f"senaste {DAYS} dagarna", "days": DAYS},
        "visits": {
            "total": summary["visits"],
            "weekdays": [
                {"label": name, "value": weekday_totals.get(index, 0)}
                for index, name in enumerate(WEEKDAYS)
            ],
        },
        "hours": hours,
        "restaurants": [],
        "dishes": [],
        "locations": [],
        "cravings": [],
    }

    # Tomma listor så länge sajten som ligger live inte skickar händelser.
    # Rutan utelämnar de avsnitten helt i stället för att visa tomma diagram.
    for section, event_name, property_name, is_id in BREAKDOWNS:
        values = api(
            f"websites/{website}/event-data/values",
            token,
            eventName=event_name,
            propertyName=property_name,
            **window,
        )
        if isinstance(values, list):
            stats[section] = [
                {
                    "label": pretty(str(row["value"])) if is_id else str(row["value"]),
                    "value": row["total"],
                }
                for row in values
                if isinstance(row, dict) and row.get("value")
            ][:10]

    return stats


def main() -> int:
    try:
        stats = build_stats()
    except Unavailable as error:
        # Utan fil visar rutan "gick inte att hämta just nu", vilket är
        # sannare än en tom ruta som ser ut som noll besök.
        print(f"stats: hoppar över ({error})", file=sys.stderr)
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(stats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"stats: {stats['visits']['total']} besök, skrev {OUT.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
