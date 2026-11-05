#!/usr/bin/env python3
"""
gong-bu · lag-kort

Lager øvingskort av eksamens-PDF-er og dine egne begrepsnotater, og
legger dem som markdown i en egen mappe i vaulten.

Hva som er hellig her:

  · Begrepsnotatene dine åpnes aldri for skriving. Scriptet leser.
  · PDF-ene blir liggende på Desktop. De kommer ikke inn i vaulten.
  · Hvert kort får «Sjekket: nei». Pluginen viser det som ukontrollert
    til du har lest gjennom og satt ja. En modell som finner på en
    definisjon er verre enn ingen kort.
  · Hvert kort sier hvor det kommer fra, så du kan gå tilbake og se.

Avhengigheter:  pip3 install pypdf
Nøkkel:         legg OPENAI_API_KEY i .env ved siden av dette scriptet,
                eller eksporter den i skallet.

Bruk:
    python3 verktoy/lag-kort.py --type scenario --maks 10
    python3 verktoy/lag-kort.py --type eksamen            # leser eksamen/*.pdf
    python3 verktoy/lag-kort.py --type alle --torr        # vis uten å kalle API
"""

import argparse, hashlib, json, os, re, sys, textwrap, time, unicodedata
import urllib.request, urllib.error
from datetime import date
from pathlib import Path

HER = Path(__file__).resolve().parent.parent
VAULT = Path(os.environ.get("GONGBU_VAULT", Path.home() /
    "Library/CloudStorage/OneDrive-UniversitetetiOslo/Notater/"
    "Informatikk, digital økonomi og ledelse"))
BEGREPSROT = VAULT / "20 Begreper"
KORTROT = VAULT / "50 Kort"
PDFROT = HER / "eksamen"

API = os.environ.get("GONGBU_API", "https://api.openai.com/v1/chat/completions")
MODELL = os.environ.get("GONGBU_MODELL", "gpt-5")


# ================================================================ nøkkel

def les_nokkel():
    n = os.environ.get("OPENAI_API_KEY")
    if n:
        return n.strip()
    env = HER / ".env"
    if env.exists():
        for linje in env.read_text(encoding="utf-8").splitlines():
            if linje.strip().startswith("OPENAI_API_KEY"):
                return linje.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit(
        "Fant ingen API-nøkkel.\n"
        "  Lag en fil .env i prosjektmappa med linja:\n"
        "      OPENAI_API_KEY=sk-...\n"
        "  (.env er gitignorert — nøkkelen havner aldri i repoet.)"
    )


# ================================================================ lesing

def slugg(s, maks=60):
    s = s.lower().strip()
    for a, b in (("æ", "ae"), ("ø", "oe"), ("å", "aa")):
        s = s.replace(a, b)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:maks]


def rens(s):
    s = re.sub(r"```[\s\S]*?```", "", s or "")
    s = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", s)
    s = re.sub(r"\[\[([^\]]+)\]\]", r"\1", s)
    return re.sub(r"\n{3,}", "\n\n", s).strip()


def les_begreper():
    """Begrepsnotatene, som rådata til modellen."""
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
        delav = re.search(r"^Del av:\s*\"?\[\[([^\]]+)\]\]", raa, re.M)
        ut.append({
            "navn": m.group(1).strip(),
            "gruppe": sti.parent.name,
            "delAv": delav.group(1).strip() if delav else None,
            "definisjon": rens(hent_sitat(kropp)),
            "hensikt": rens(hent_seksjon(kropp, "Hensikt")),
            "eksempel": rens(hent_seksjon(kropp, "Eksempel")),
            "fil": str(sti.relative_to(VAULT)),
        })
    return ut


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


def les_pdfer():
    """Eksamenssettene. Blir liggende på Desktop."""
    if not PDFROT.is_dir():
        return []
    try:
        from pypdf import PdfReader
    except ImportError:
        sys.exit("Mangler pypdf. Kjør:  pip3 install pypdf")

    ut = []
    for sti in sorted(PDFROT.glob("*.pdf")):
        tekst = "\n".join((s.extract_text() or "") for s in PdfReader(str(sti)).pages)
        tekst = re.sub(r"\n{3,}", "\n\n", tekst).strip()
        if len(tekst) < 200:
            print(f"  ! {sti.name}: fikk nesten ingen tekst — skannet PDF?")
            continue
        ut.append({"navn": sti.stem, "tekst": tekst})
    return ut


# ================================================================ modellen

SYSTEM = """Du lager øvingskort for en student som leser til eksamen i informatikk ved UiO.

Absolutte krav:
- Bygg BARE på materialet du får. Finner du ikke dekning i materialet, lag færre kort.
- Ikke hent inn kunnskap utenfra, og ikke fyll hull med noe som høres rimelig ut.
- Skriv på norsk bokmål, i samme tone som notatene: nøkternt og konkret.
- Distraktorer skal være plausible og hentet fra samme fagområde, aldri tullealternativer.
- Hvert kort skal kunne besvares av noen som har lest materialet, og bommes av noen som bare gjenkjenner ord.

Svar med gyldig JSON og ingenting annet."""

OPPSKRIFT = {
    "scenario": """Lag {n} scenariokort.

Hvert kort er en kort, konkret situasjon (én til to setninger) der studenten skal avgjøre
hvilket begrep situasjonen handler om — typisk hvilket sikkerhetsmål som brytes, eller
hvilket fenomen som beskrives.

JSON: {{"kort": [{{"type":"flervalg","sporsmaal":"...","alternativer":["..","..","..",".."],
"riktig":0,"begrunnelse":"hvorfor dette og ikke de andre","handler_om":"begrepsnavn"}}]}}""",

    "finnfeilen": """Lag {n} «finn feilen»-kort.

Hvert kort er en påstand som ser riktig ut, men har én presis feil — en byttet betingelse,
en forvekslet egenskap, en feil retning på en sammenheng. Alternativene er fire forslag til
hva feilen er.

JSON: {{"kort": [{{"type":"flervalg","sporsmaal":"Hva er feil i denne påstanden?\\n\\n«...»",
"alternativer":["..","..","..",".."],"riktig":0,"begrunnelse":"hva som faktisk gjelder",
"handler_om":"begrepsnavn"}}]}}""",

    "forskjell": """Lag {n} forskjellskort.

Hvert kort tar to beslektede begreper fra materialet og spør hva som faktisk skiller dem.
Alternativene er fire forslag til skillet; tre av dem skal være forskjeller som høres
riktige ut, men som ikke er det avgjørende skillet.

JSON: {{"kort": [{{"type":"flervalg","sporsmaal":"Hva skiller X fra Y?",
"alternativer":["..","..","..",".."],"riktig":0,"begrunnelse":"...",
"handler_om":"X"}}]}}""",

    "eksamen": """Hent {n} oppgaver fra eksamenssettet.

Gjengi oppgaven slik den står (forkort bare hvis den er svært lang). Legg ved et godt svar
basert på materialet, og hva en sensor ser etter. Dette er skrivekort, ikke flervalg.

JSON: {{"kort": [{{"type":"skriv","sporsmaal":"oppgaveteksten","fasit":"et godt svar",
"kriterier":["det sensor ser etter","..."],"handler_om":"begrepsnavn eller tema"}}]}}""",
}


def sporr(nokkel, bruker, torr=False):
    if torr:
        print("\n----- ville sendt -----")
        print(bruker[:1500] + ("\n… (kuttet)" if len(bruker) > 1500 else ""))
        return {"kort": []}

    kropp = json.dumps({
        "model": MODELL,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": bruker},
        ],
        "response_format": {"type": "json_object"},
    }).encode("utf-8")

    req = urllib.request.Request(API, data=kropp, headers={
        "Authorization": f"Bearer {nokkel}",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=180) as svar:
            data = json.loads(svar.read())
    except urllib.error.HTTPError as e:
        detalj = e.read().decode("utf-8", "replace")[:400]
        sys.exit(f"API svarte {e.code}: {detalj}")
    except urllib.error.URLError as e:
        sys.exit(f"Fikk ikke kontakt med {API}: {e.reason}")

    try:
        return json.loads(data["choices"][0]["message"]["content"])
    except (KeyError, json.JSONDecodeError) as e:
        sys.exit(f"Uventet svar fra modellen: {e}")


# ================================================================ skriving

def skriv_kort(kort, kilde, type_):
    """Ett kort = én markdown-fil med frontmatter pluginen kan lese."""
    KORTROT.mkdir(parents=True, exist_ok=True)

    tittel = re.sub(r"\s+", " ", kort["sporsmaal"]).strip()
    if len(tittel) > 70:                      # kutt på ordgrense, ikke midt i et ord
        tittel = tittel[:70].rsplit(" ", 1)[0] + " …"
    navn = f"{type_}-{slugg(kort.get('handler_om') or tittel)}"
    sti = KORTROT / f"{navn}.md"
    n = 2
    while sti.exists():
        sti = KORTROT / f"{navn}-{n}.md"
        n += 1

    fm = [
        "---",
        f"Korttype: {kort['type']}",
        f"Sjanger: {type_}",
        f'Handler om: "[[{kort.get("handler_om", "")}]]"' if kort.get("handler_om") else "Handler om:",
        f'Kilde: "{kilde}"',
        f"Laget: {date.today()}",
        f"Modell: {MODELL}",
        "Sjekket: nei",
        "---",
        "",
    ]

    kropp = [f"# {tittel}", "", "## Spørsmål", kort["sporsmaal"], ""]

    if kort["type"] == "flervalg":
        kropp += ["## Alternativer"]
        for i, a in enumerate(kort["alternativer"]):
            kropp.append(f"{'- [x]' if i == kort['riktig'] else '- [ ]'} {a}")
        kropp += ["", "## Begrunnelse", kort.get("begrunnelse", ""), ""]
    else:
        kropp += ["## Fasit", kort.get("fasit", ""), "", "## Sensor ser etter"]
        kropp += [f"- {k}" for k in kort.get("kriterier", [])]
        kropp += [""]

    sti.write_text("\n".join(fm + kropp), encoding="utf-8")
    return sti


def allerede_laget():
    """Navn på kort som finnes fra før, så vi ikke lager dubletter."""
    if not KORTROT.is_dir():
        return set()
    return {p.stem for p in KORTROT.glob("*.md")}


# ================================================================ kjøring

def material_begreper(begreper, maks_tegn=24000):
    """Pakker begrepsnotatene til én tekstblokk modellen kan lese."""
    biter, lengde = [], 0
    for b in begreper:
        bit = (f"### {b['navn']}  ({b['gruppe']}"
               + (f", del av {b['delAv']}" if b["delAv"] else "") + ")\n"
               + f"Definisjon: {b['definisjon']}\n"
               + (f"Hensikt: {b['hensikt'][:600]}\n" if b["hensikt"] else "")
               + (f"Eksempel: {b['eksempel'][:400]}\n" if b["eksempel"] else ""))
        if lengde + len(bit) > maks_tegn:
            break
        biter.append(bit)
        lengde += len(bit)
    return "\n".join(biter)


def main():
    p = argparse.ArgumentParser(description="Lag øvingskort av notater og eksamenssett.")
    p.add_argument("--type", default="alle",
                   choices=["alle", "scenario", "finnfeilen", "forskjell", "eksamen"])
    p.add_argument("--maks", type=int, default=8, help="kort per sjanger (standard 8)")
    p.add_argument("--gruppe", help="begrens til én mappe, f.eks. Sikkerhet")
    p.add_argument("--torr", action="store_true", help="vis hva som ville blitt sendt")
    a = p.parse_args()

    nokkel = None if a.torr else les_nokkel()

    begreper = les_begreper()
    if a.gruppe:
        begreper = [b for b in begreper if b["gruppe"].lower() == a.gruppe.lower()]
    print(f"{len(begreper)} begreper lest fra {BEGREPSROT.name}"
          + (f" (bare {a.gruppe})" if a.gruppe else ""))

    sjangre = ["scenario", "finnfeilen", "forskjell", "eksamen"] if a.type == "alle" else [a.type]
    fantes = allerede_laget()
    nye = 0

    for sj in sjangre:
        if sj == "eksamen":
            pdfer = les_pdfer()
            if not pdfer:
                print(f"\n[eksamen] ingen PDF-er i {PDFROT.relative_to(HER)}/ — hopper over")
                continue
            for pdf in pdfer:
                print(f"\n[eksamen] {pdf['navn']}")
                bruker = (OPPSKRIFT["eksamen"].format(n=a.maks)
                          + "\n\n## Eksamenssett\n" + pdf["tekst"][:40000]
                          + "\n\n## Studentens begreper (for å treffe språket)\n"
                          + material_begreper(begreper, 6000))
                svar = sporr(nokkel, bruker, a.torr)
                for k in svar.get("kort", []):
                    sti = skriv_kort(k, f"{pdf['navn']}.pdf", sj)
                    print("   +", sti.name); nye += 1
        else:
            print(f"\n[{sj}]")
            bruker = (OPPSKRIFT[sj].format(n=a.maks)
                      + "\n\n## Materiale\n" + material_begreper(begreper))
            svar = sporr(nokkel, bruker, a.torr)
            for k in svar.get("kort", []):
                sti = skriv_kort(k, "egne begrepsnotater", sj)
                print("   +", sti.name); nye += 1
        time.sleep(0.5)

    if a.torr:
        print("\nTørrkjøring — ingenting sendt og ingenting skrevet.")
    else:
        print(f"\n{nye} nye kort i {KORTROT}")
        print("Alle står som «Sjekket: nei». Les gjennom i Obsidian og sett ja på dem du stoler på.")
        print(f"Fra før: {len(fantes)} kort.")


if __name__ == "__main__":
    main()
