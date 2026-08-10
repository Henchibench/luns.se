#!/usr/bin/env python3
"""Sammanfattar en skrapning: rätter per veckodag, en rad per restaurang.

Finns därför att `scrape_menus.py` är tyst om det som oftast går fel. En skrapa
som spricker faller tillbaka på förra körningens meny, och en skrapa som läser
sidan men lägger rätterna på fel dag ser ut precis som en som fungerar. Båda
märks direkt i en tabell där dagarna står bredvid varandra, och inte alls i
loggen.

Körs av `scripts/testserver.sh` efter varje skrapning, men går lika bra för
hand. Vill du jämföra före och efter en ändring: spara undan menus.json först
och kör skriptet mot båda.

    python scripts/menylage.py                        # senaste skrapningen
    python scripts/menylage.py /tmp/menus-innan.json  # en sparad kopia

Bara standardbiblioteket, av samma skäl som skraporna: filen ska gå att köra i
en miljö som bara har produktionens tre paket.
"""

import json
import os
import sys

DAGAR = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"]

# Samma två strängar som scrape_menus.py känner igen. De är signaler, inte text.
FEL = "Ett fel uppstod vid hämtning av menyn"
TOMT = "Ingen lunchmeny tillgänglig"

STANDARDFIL = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "nextjs-luns-se", "public", "data", "menus.json",
)


def rakna(rader):
    """Rätter per veckodag. INFO-raderna räknas inte — de är inte mat."""
    per_dag = {dag: 0 for dag in DAGAR}
    okand = 0
    for rad in rader:
        if rad.startswith("INFO:"):
            continue
        dag, _, _ = rad.partition("|")
        if dag in per_dag:
            per_dag[dag] += 1
        else:
            okand += 1
    return per_dag, okand


def main():
    fil = sys.argv[1] if len(sys.argv) > 1 else STANDARDFIL
    if not os.path.exists(fil):
        print(f"Hittar ingen {fil} — har skrapningen körts?", file=sys.stderr)
        return 1

    with open(fil, encoding="utf-8") as f:
        menyer = json.load(f).get("menus", {})

    print(f"{'Restaurang':<28}" + "".join(f"{d[:3]:>5}" for d in DAGAR) + f"{'summa':>8}")
    print("-" * (28 + 5 * len(DAGAR) + 8))

    tomma = []
    trasiga = []
    for namn in sorted(menyer):
        rader = menyer[namn]
        if any(FEL in r for r in rader):
            trasiga.append(namn)
            print(f"{namn:<28}{'— hämtningen sprack':>33}")
            continue
        if any(TOMT in r for r in rader):
            tomma.append(namn)
            print(f"{namn:<28}{'— ingen meny hittad':>33}")
            continue

        per_dag, okand = rakna(rader)
        summa = sum(per_dag.values())
        rad = f"{namn:<28}" + "".join(f"{per_dag[d]:>5}" for d in DAGAR) + f"{summa:>8}"

        # En meny på en enda dag är nästan alltid en skrapa som läst rätt sida
        # men missat veckouppdelningen. Den ser komplett ut i JSON:en.
        dagar_med_mat = sum(1 for d in DAGAR if per_dag[d])
        if summa == 0:
            rad += "   <- noll rätter"
            tomma.append(namn)
        elif dagar_med_mat == 1:
            rad += "   <- allt på en dag?"
        if okand:
            rad += f"   <- {okand} rader utan giltig veckodag"
        print(rad)

    print()
    print(f"{len(menyer)} restauranger.", end="")
    if trasiga:
        print(f" Hämtningen sprack för: {', '.join(trasiga)}.", end="")
    if tomma:
        print(f" Utan meny: {', '.join(tomma)}.", end="")
    print()
    # Att en enskild restaurang saknar meny är normalt — flera publicerar inte
    # på helgen. Därför är utfallet 0 även då: det här skriptet rapporterar,
    # det dömer inte.
    return 0


if __name__ == "__main__":
    sys.exit(main())
