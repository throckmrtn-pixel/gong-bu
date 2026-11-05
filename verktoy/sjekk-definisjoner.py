#!/usr/bin/env python3
"""
gong-bu · sjekk-definisjoner

Leser definisjonene i begrepsnotatene dine og ber en modell se etter
problemer. Skriver en RAPPORT. Den retter ingenting.

Det er med vilje. En modell som «fikser» definisjonen din kan ta feil,
og da har du pugget noe galt uten å vite det. Rapporten peker, du
bestemmer.

Rapporten havner i rapporter/ på Desktop, ikke i vaulten.

Bruk:
    python3 verktoy/sjekk-definisjoner.py
    python3 verktoy/sjekk-definisjoner.py --gruppe Sikkerhet
    python3 verktoy/sjekk-definisjoner.py --torr
"""

import argparse, json, os, re, ssl, sys, time
from datetime import date
from pathlib import Path

HER = Path(__file__).resolve().parent.parent
VAULT = Path(os.environ.get("GONGBU_VAULT", Path.home() /
    "Library/CloudStorage/OneDrive-UniversitetetiOslo/Notater/"
    "Informatikk, digital økonomi og ledelse"))
BEGREPSROT = VAULT / "20 Begreper"
RAPPORTROT = HER / "rapporter"

API = os.environ.get("GONGBU_API", "https://api.openai.com/v1/chat/completions")
MODELL = os.environ.get("GONGBU_MODELL", "gpt-5")

PULJE = 12          # begreper per kall


def tillit():
    """macOS-Python har ofte et tomt CA-lager. certifi er det vanlige
    svaret. Verifisering slås aldri av."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def raad(feil):
    if "CERTIFICATE_VERIFY_FAILED" not in str(feil):
        return ""
    try:
        import certifi                                   # noqa: F401
    except ImportError:
        return ("\nPython mangler sertifikatlageret sitt. Kjør:\n"
                "    pip3 install certifi\nog prøv igjen.")
    return ("\ncertifi er installert, så dette er trolig en VPN eller\n"
            "brannmur som signerer trafikken selv. Skru av VPN-en og prøv igjen.")


def ekte_nokkel(n):
    """Plassholderen «sk-...» er ikke en nøkkel. Si det her, ikke la
    OpenAI svare «Incorrect API key» på den."""
    n = (n or "").strip().strip('"').strip("'")
    return "" if (not n or "..." in n or len(n) < 20) else n


def les_nokkel():
    fra_skall = ekte_nokkel(os.environ.get("OPENAI_API_KEY"))
    if fra_skall:
        return fra_skall

    env = HER / ".env"
    funnet, plassholder = [], False
    if env.exists():
        for linje in env.read_text(encoding="utf-8").splitlines():
            if not linje.strip().startswith("OPENAI_API_KEY") or "=" not in linje:
                continue
            n = ekte_nokkel(linje.split("=", 1)[1])
            if n:
                funnet.append(n)
            else:
                plassholder = True

    if funnet:
        return funnet[-1]
    if plassholder:
        sys.exit(f"Plassholderen «sk-...» står fortsatt i {env}. "
                 "Bytt den ut med den ekte nøkkelen, på samme linje.")
    sys.exit(f"Fant ingen API-nøkkel i {env}. Fila skal ha linja "
             "OPENAI_API_KEY=<nøkkelen din>")


def rens(s):
    s = re.sub(r"```[\s\S]*?```", "", s or "")
    s = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", s)
    s = re.sub(r"\[\[([^\]]+)\]\]", r"\1", s)
    return re.sub(r"\n{3,}", "\n\n", s).strip()


def hent_sitat(kropp):
    ut, startet = [], False
    for l in kropp.splitlines():
        if l.startswith(">"):
            startet = True
            ut.append(l.lstrip("> ").rstrip())
        elif startet and l.strip():
            break
    t = "\n".join(ut).strip()
    return "" if t.lower() == "definisjon" else t


def hent_seksjon(kropp, navn):
    linjer = kropp.splitlines()
    i = next((k for k, l in enumerate(linjer) if re.match(rf"^##\s+{navn}", l, re.I)), None)
    if i is None:
        return ""
    ut = []
    for l in linjer[i + 1:]:
        if l.startswith("## "):
            break
        ut.append(l)
    return "\n".join(ut)


def les_begreper():
    ut = []
    if not BEGREPSROT.is_dir():
        sys.exit(f"Fant ikke {BEGREPSROT}")
    for sti in sorted(BEGREPSROT.rglob("*.md")):
        raa = sti.read_text(encoding="utf-8")
        if re.search(r"^Type:\s*temakart", raa, re.M):
            continue
        m = re.search(r"^Begrep:\s*(.+)$", raa, re.M)
        if not m:
            continue
        kropp = re.sub(r"^---[\s\S]*?\n---\n?", "", raa)
        ut.append({
            "navn": m.group(1).strip(),
            "gruppe": sti.parent.name,
            "status": (re.search(r"^Status:\s*(.+)$", raa, re.M) or [None, ""])[1].strip()
                      if re.search(r"^Status:\s*(.+)$", raa, re.M) else "",
            "definisjon": rens(hent_sitat(kropp)),
            "hensikt": rens(hent_seksjon(kropp, "Hensikt"))[:800],
            "eksempel": rens(hent_seksjon(kropp, "Eksempel"))[:500],
            "fil": str(sti.relative_to(VAULT)),
        })
    return ut


SYSTEM = """Du leser definisjoner en informatikkstudent har skrevet selv, og ser etter problemer.

Du er streng, men ikke kjedelig. Meld bare det som faktisk er galt eller uklart nok til å
koste poeng på en eksamen. En definisjon som er kortfattet men riktig, er en god definisjon.

Kategorier du kan melde:
- "feil"      : noe står direkte galt
- "upresis"   : mangler en betingelse som gjør definisjonen sann bare noen ganger
- "sirkulaer" : definisjonen bruker begrepet til å forklare seg selv
- "forvekslet": definisjonen beskriver egentlig et annet begrep
- "tynn"      : så vag at den ikke skiller begrepet fra naboene sine
- "uenig"     : definisjonen er forsvarlig, men pensum sier det vanligvis annerledes

Er definisjonen god, ikke meld den i det hele tatt.

Svar med gyldig JSON og ingenting annet."""

OPPDRAG = """Gå gjennom begrepene under.

JSON:
{"funn": [{"begrep":"navnet", "slag":"feil|upresis|sirkulaer|forvekslet|tynn|uenig",
"hva":"hva som er problemet, én til to setninger", "forslag":"hvordan den kunne stått"}]}

Begreper med god definisjon utelater du fra listen.

## Begreper
"""


def sporr(nokkel, bruker, torr=False):
    import urllib.request, urllib.error
    if torr:
        print("\n----- ville sendt -----")
        print(bruker[:1200] + ("\n… (kuttet)" if len(bruker) > 1200 else ""))
        return {"funn": []}

    kropp = json.dumps({
        "model": MODELL,
        "messages": [{"role": "system", "content": SYSTEM},
                     {"role": "user", "content": bruker}],
        "response_format": {"type": "json_object"},
    }).encode("utf-8")
    req = urllib.request.Request(API, data=kropp, headers={
        "Authorization": f"Bearer {nokkel}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180, context=tillit()) as svar:
            data = json.loads(svar.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"API svarte {e.code}: {e.read().decode('utf-8','replace')[:400]}")
    except urllib.error.URLError as e:
        sys.exit(f"Fikk ikke kontakt med {API}: {e.reason}\n" + raad(e))
    try:
        return json.loads(data["choices"][0]["message"]["content"])
    except (KeyError, json.JSONDecodeError) as e:
        sys.exit(f"Uventet svar fra modellen: {e}")


MERKE = {
    "feil":       "🔴 feil",
    "forvekslet": "🔴 forvekslet med et annet begrep",
    "sirkulaer":  "🟠 sirkulær",
    "upresis":    "🟠 upresis",
    "tynn":       "🟡 tynn",
    "uenig":      "🔵 avviker fra pensum",
}
RANG = {"feil": 0, "forvekslet": 1, "sirkulaer": 2, "upresis": 3, "tynn": 4, "uenig": 5}


def main():
    p = argparse.ArgumentParser(description="Se etter problemer i definisjonene dine.")
    p.add_argument("--gruppe", help="bare én mappe, f.eks. Sikkerhet")
    p.add_argument("--torr", action="store_true")
    a = p.parse_args()

    nokkel = None if a.torr else les_nokkel()
    begreper = [b for b in les_begreper() if b["definisjon"]]
    if a.gruppe:
        begreper = [b for b in begreper if b["gruppe"].lower() == a.gruppe.lower()]
    if not begreper:
        sys.exit("Ingen begreper med definisjon å sjekke.")

    etter = {b["navn"]: b for b in begreper}
    print(f"{len(begreper)} definisjoner å gå gjennom, {PULJE} i slengen")

    funn = []
    for i in range(0, len(begreper), PULJE):
        pulje = begreper[i:i + PULJE]
        blokk = "\n".join(
            f"### {b['navn']}  ({b['gruppe']})\n"
            f"Definisjon: {b['definisjon']}\n"
            + (f"Hensikt: {b['hensikt']}\n" if b["hensikt"] else "")
            + (f"Eksempel: {b['eksempel']}\n" if b["eksempel"] else "")
            for b in pulje)
        print(f"  {i+1}–{min(i+PULJE, len(begreper))} …", end="", flush=True)
        svar = sporr(nokkel, OPPDRAG + blokk, a.torr)
        nye = svar.get("funn", [])
        funn += nye
        print(f" {len(nye)} funn")
        time.sleep(0.4)

    if a.torr:
        print("\nTørrkjøring — ingenting sendt og ingenting skrevet.")
        return

    funn.sort(key=lambda f: (RANG.get(f.get("slag", "uenig"), 9), f.get("begrep", "")))

    RAPPORTROT.mkdir(parents=True, exist_ok=True)
    sti = RAPPORTROT / f"definisjoner-{date.today()}.md"

    ut = [f"# Gjennomgang av definisjoner · {date.today()}", "",
          f"{len(begreper)} definisjoner lest. {len(funn)} er verdt et blikk.",
          "", "Dette er en modells mening, ikke en fasit. Den tar feil av og til — ",
          "les forslaget, sjekk mot pensum, og rett bare der du er enig.", ""]

    if not funn:
        ut += ["Ingen funn. Definisjonene holder.", ""]
    else:
        for slag in sorted({f.get("slag", "uenig") for f in funn}, key=lambda s: RANG.get(s, 9)):
            ut += [f"## {MERKE.get(slag, slag)}", ""]
            for f in [x for x in funn if x.get("slag") == slag]:
                navn = f.get("begrep", "?")
                b = etter.get(navn)
                ut += [f"### {navn}" + (f"  ·  {b['gruppe']}" if b else "")]
                if b:
                    ut += ["", f"> {b['definisjon']}"]
                ut += ["", f"**Problemet:** {f.get('hva','')}"]
                if f.get("forslag"):
                    ut += ["", f"**Kunne stått:** {f['forslag']}"]
                if b:
                    ut += ["", f"*{b['fil']}*"]
                ut += [""]

    sti.write_text("\n".join(ut), encoding="utf-8")
    print(f"\nRapport: {sti}")
    print("Notatene dine er ikke rørt.")


if __name__ == "__main__":
    main()
