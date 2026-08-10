#!/usr/bin/env bash
# Testserver för luns.se — kör hela produktionskedjan lokalt och servar utfallet.
#
# Varför den finns: sajten är statisk och byggs i GitHub Actions, så den enda
# platsen en färdig skrapa förut gick att SE var i produktion, efter en merge
# till main. Den som skulle godkänna en skrapa fick alltså läsa Python och lita
# på den. Nu går det att titta i stället.
#
# Kedjan är med flit densamma som .github/workflows/scrape-and-deploy.yml:
#
#     pip install requests beautifulsoup4 lxml   ->  .venv-prod
#     python scripts/scrape_menus.py             ->  public/data/*.json
#     npm ci && npm run build                    ->  out/
#
# Det andra venvet är hela poängen med steg ett. Repots vanliga .venv bär
# playwright, och en skrapa som råkat importera det fungerar där men ger tomt i
# Actions — sajten visar då gårdagens meny för alltid utan att något ser
# trasigt ut. Här faller den i stället, direkt och högljutt, på den maskin där
# någon fortfarande tittar.
#
# Servern servar out/ och ingenting annat. Det är samma filer som skulle ha
# publicerats, inte en utvecklingsserver som renderar om vid varje tangenttryck
# — det som fungerar här fungerar på riktigt.
#
# Variabelnamnen är avsiktligt utan å/ä/ö: bash tillåter bara ASCII i
# variabelnamn och "BYGGT=1" med å blir ett kommandoanrop utan att bash -n
# säger ifrån.

set -uo pipefail

ROT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
FRONT="$ROT/nextjs-luns-se"
VENV="$ROT/.venv-prod"
KOR="$ROT/.testserver"
PIDFIL="$KOR/pid"
SERVERLOGG="$KOR/server.log"
PORT="${LUNS_TESTPORT:-3002}"

avbryt() {
  echo >&2
  echo "AVBRUTET: $*" >&2
  echo "Servern rördes inte — står den redan uppe visar den fortfarande förra bygget." >&2
  exit 1
}

# Bygger man som root blir filerna rotägda och hench kan inte bygga nästa gång.
# Samma fälla som i hubben, och den kostar en chown att städa upp.
if [ "$(id -u)" -eq 0 ]; then
  avbryt "kör inte som root. Kör: sudo -u hench $0 $*"
fi

# --- server: start, stopp, status --------------------------------------------

# Pid:er återanvänds. Att döda en pid ur en gammal fil utan att titta på vad den
# faktiskt är kan träffa vad som helst — därför kontrolleras kommandoraden.
serverpid() {
  [ -f "$PIDFIL" ] || return 1
  PID=$(cat "$PIDFIL" 2>/dev/null)
  [ -n "${PID:-}" ] || return 1
  ps -p "$PID" -o command= 2>/dev/null | grep -q "http.server" || return 1
  echo "$PID"
}

stoppa() {
  PID=$(serverpid) || { rm -f "$PIDFIL"; return 0; }
  kill "$PID" 2>/dev/null
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    ps -p "$PID" >/dev/null 2>&1 || break
    sleep 0.3
  done
  ps -p "$PID" >/dev/null 2>&1 && kill -9 "$PID" 2>/dev/null
  rm -f "$PIDFIL"
}

adress() {
  IP=$(hostname -I 2>/dev/null | awk '{print $1}')
  [ -n "${IP:-}" ] || IP=localhost
  echo "http://$IP:$PORT/"
}

starta() {
  mkdir -p "$KOR"
  stoppa
  # setsid lösgör servern från skalet som startade den. Utan det dör den när
  # agenten som körde skriptet avslutas, och Henrik hittar en död port.
  if command -v setsid >/dev/null 2>&1; then
    setsid python3 -m http.server "$PORT" --bind 0.0.0.0 --protocol HTTP/1.1 \
      -d "$FRONT/out" </dev/null >>"$SERVERLOGG" 2>&1 &
  else
    nohup python3 -m http.server "$PORT" --bind 0.0.0.0 --protocol HTTP/1.1 \
      -d "$FRONT/out" </dev/null >>"$SERVERLOGG" 2>&1 &
  fi
  echo $! > "$PIDFIL"
  sleep 1
  serverpid >/dev/null || avbryt "servern startade inte. Se $SERVERLOGG (porten $PORT kanske är upptagen)."
}

case "${1:-bygg}" in
  stopp|stop)
    if serverpid >/dev/null; then stoppa; echo "Testservern stoppad."; else echo "Ingen testserver körde."; fi
    exit 0
    ;;
  status)
    if PID=$(serverpid); then
      echo "Testservern kör (pid $PID) på $(adress)"
      [ -f "$KOR/byggd" ] && echo "Visar: $(cat "$KOR/byggd")"
    else
      echo "Testservern kör inte."
    fi
    exit 0
    ;;
  bygg|"") HOPPA_SKRAP=0 ;;
  --utan-skrap) HOPPA_SKRAP=1 ;;
  -h|--hjalp|--help)
    cat <<'HJALP'
Användning:
  scripts/testserver.sh                 skrapa, bygg och (om)starta testservern
  scripts/testserver.sh --utan-skrap    bygg om frontenden på befintlig menydata
  scripts/testserver.sh status          kör den, och vad visar den?
  scripts/testserver.sh stopp           stäng av

Porten är 3002. Sätt LUNS_TESTPORT för en annan.
HJALP
    exit 0
    ;;
  *) avbryt "okänt argument: $1 (prova --hjalp)" ;;
esac

cd "$ROT" || avbryt "hittar inte repot"
mkdir -p "$KOR"

# --- 1. produktionsvenvet ----------------------------------------------------

if [ ! -x "$VENV/bin/python" ]; then
  echo "== Skapar .venv-prod (samma tre paket som Actions installerar)"
  python3 -m venv "$VENV" || avbryt "python3 -m venv föll. Saknas python3-venv?"
  "$VENV/bin/pip" install --quiet --upgrade pip || true
  "$VENV/bin/pip" install --quiet -r "$ROT/requirements.txt" \
    || avbryt "pip install -r requirements.txt föll"
fi

# Spärren som gör venvet meningsfullt. Hamnar playwright här av misstag är
# skriptet inte längre ett prov på produktionsmiljön, bara ett till skal.
if "$VENV/bin/python" -c "import playwright" 2>/dev/null; then
  avbryt "playwright är installerat i .venv-prod. Ta bort venvet och kör om — det ska spegla Actions, som inte har det."
fi

# --- 2. skrapningen ----------------------------------------------------------

if [ "$HOPPA_SKRAP" -eq 0 ]; then
  echo "== Kör skraporna (samma kommando som Actions, ~1-2 minuter)"
  "$VENV/bin/python" "$ROT/scripts/scrape_menus.py" || avbryt "scrape_menus.py föll"
  echo
  "$VENV/bin/python" "$ROT/scripts/menylage.py"
  echo
else
  [ -f "$FRONT/public/data/menus.json" ] || avbryt "ingen menydata att bygga på. Kör utan --utan-skrap."
  echo "== Hoppar över skrapningen, bygger på befintlig menus.json"
fi

# --- 3. bygget ---------------------------------------------------------------

cd "$FRONT" || avbryt "hittar inte $FRONT"

# npm ci bara när låsfilen faktiskt är nyare än den installerade trädet. npm
# skriver node_modules/.package-lock.json vid varje install, så jämförelsen är
# exakt och kostar inget.
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "== npm ci"
  npm ci || avbryt "npm ci föll"
fi

echo "== npm run build"
npm run build || avbryt "bygget föll — samma fel hade stoppat Actions"
[ -f out/index.html ] || avbryt "bygget gav ingen out/index.html"

# --- 4. bandet ---------------------------------------------------------------

GREN=$(git -C "$ROT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
COMMIT=$(git -C "$ROT" rev-parse --short HEAD 2>/dev/null || echo "?")
SMUTS=""
[ -n "$(git -C "$ROT" status --porcelain 2>/dev/null)" ] && SMUTS=" + okommitterade ändringar"
STAMPEL="gren $GREN · $COMMIT$SMUTS · byggd $(date '+%F %H:%M')"

# Bandet injiceras i out/, som är gitignorerad. Det kan alltså aldrig följa med
# en commit och aldrig hamna på den publicerade sajten — märkningen finns bara
# på den kopia den här servern levererar.
#
# Och det är ett CSS-pseudoelement, inte en div. Första versionen lade en
# <div> först i <body> och den försvann efter en sekund: React hydrerar hela
# dokumentet i app-routern och rensar bort DOM-noder som inte finns i trädet
# den renderar. Sidan såg alltså skarp ut precis när man började läsa den.
# html::before ligger utanför DOM:en och kan inte tas bort på det sättet.
python3 - "$FRONT/out" "TESTSERVER · $STAMPEL · detta är INTE luns.se" <<'PY'
import json, pathlib, sys

rot, text = pathlib.Path(sys.argv[1]), sys.argv[2]
# json.dumps ger en korrekt citerad CSS-sträng: samma escaping av " och \.
# ensure_ascii=False är inte kosmetik — CSS skriver teckenkoder som \00b7 och
# tolkar json:ens · som ett escapat "u". Bandet stod "u00b7 gren Dev".
stil = (
    '<style id="luns-testband">'
    "html::before{content:" + json.dumps(text, ensure_ascii=False) + ";"
    "position:fixed;top:0;left:0;right:0;height:30px;z-index:2147483647;"
    "background:#ffd400;color:#141414;text-align:center;overflow:hidden;white-space:nowrap;"
    "font:600 13px/30px system-ui,-apple-system,sans-serif;letter-spacing:.01em}"
    "body{padding-top:30px!important}"
    "</style>"
)

antal = 0
for fil in rot.rglob("*.html"):
    sida = fil.read_text(encoding="utf-8")
    if "luns-testband" in sida:
        continue
    if "</head>" not in sida:
        continue
    fil.write_text(sida.replace("</head>", stil + "</head>", 1), encoding="utf-8")
    antal += 1
print(f"== Testbandet injicerat i {antal} html-filer")
PY

echo "$STAMPEL" > "$KOR/byggd"

# --- 5. servern --------------------------------------------------------------

starta

echo
echo "Testservern kör: $(adress)"
echo "Visar: $STAMPEL"
echo "Stäng av med: scripts/testserver.sh stopp"
