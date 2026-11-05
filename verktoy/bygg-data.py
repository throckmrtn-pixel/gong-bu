#!/usr/bin/env python3
"""
gong-bu · bygg-data

Leser begrepsnotatene i Obsidian-vaulten og skriver data/begreper.json.

Enveis. Skriptet åpner aldri en notatfil for skriving, og appen skriver
aldri tilbake til vaulten — framdriften din bor i nettleseren, ikke i
notatene. Vil du at et begrep skal telle som «sitter», er det appen som
husker det.

Bruk:
    python3 verktoy/bygg-data.py "/sti/til/vault"

Uten sti leter den etter vaulten på standardplassen under OneDrive.
"""

import json, os, re, sys, unicodedata
from datetime import datetime, timezone

STANDARDVAULT = os.path.expanduser(
    "~/Library/CloudStorage/OneDrive-UniversitetetiOslo/Notater/"
    "Informatikk, digital økonomi og ledelse"
)
BEGREPSROT = "20 Begreper"


# ---------------------------------------------------------------- hjelpere

def slugg(s):
    """Lager en id som tåler å stå i en URL. Beholder æøå som ae/oe/aa."""
    s = s.lower().strip()
    for a, b in (("æ", "ae"), ("ø", "oe"), ("å", "aa")):
        s = s.replace(a, b)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def del_frontmatter(tekst):
    """Deler notatet i frontmatter og brødtekst."""
    if not tekst.startswith("---"):
        return {}, tekst
    slutt = tekst.find("\n---", 3)
    if slutt == -1:
        return {}, tekst
    return les_yaml(tekst[3:slutt]), tekst[slutt + 4:]


def les_yaml(blokk):
    """
    Nok YAML for disse notatene: «nøkkel: verdi» og lister skrevet som
    innrykkede bindestreker under en nøkkel. Ingen nøsting utover det.
    """
    ut, siste = {}, None
    for linje in blokk.splitlines():
        if not linje.strip():
            continue
        liste = re.match(r"^\s+-\s*(.*)$", linje)
        if liste and siste:
            verdi = liste.group(1).strip().strip('"').strip("'")
            if verdi:
                # Nøkkelen fikk "" da den ble lest; nå vet vi at den er en liste.
                if not isinstance(ut.get(siste), list):
                    ut[siste] = []
                ut[siste].append(verdi)
            continue
        par = re.match(r"^([A-Za-zÆØÅæøå ]+):\s*(.*)$", linje)
        if par:
            siste = par.group(1).strip()
            verdi = par.group(2).strip().strip('"').strip("'")
            # «Fag: []» på én linje betyr tom liste, ikke teksten «[]»
            ut[siste] = "" if verdi in ("", "[]", "{}") else verdi
    return ut


def lenkemaal(s):
    """Henter ut det en [[wikilenke]] peker på."""
    return [m.split("|")[0].strip() for m in re.findall(r"\[\[([^\]]+)\]\]", s)]


def rens(s):
    """
    Gjør markdown om til lesbar tekst: wikilenker blir til ordet sitt,
    fet/kursiv faller bort, dataview-blokker fjernes.
    """
    s = re.sub(r"```.*?```", "", s, flags=re.S)
    s = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", s)
    s = re.sub(r"\[\[([^\]]+)\]\]", r"\1", s)
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"\1", s)
    return re.sub(r"\n{3,}", "\n\n", s).strip()


def seksjoner(kropp):
    """Deler brødteksten på ##-overskrifter."""
    ut, navn, buffer = {}, None, []
    for linje in kropp.splitlines():
        h = re.match(r"^##\s+(.+?)\s*$", linje)
        if h:
            if navn:
                ut[navn] = "\n".join(buffer).strip()
            navn, buffer = h.group(1), []
        elif navn:
            buffer.append(linje)
    if navn:
        ut[navn] = "\n".join(buffer).strip()
    return ut


def finn_definisjon(kropp):
    """Definisjonen er sitatblokka rett under tittelen."""
    linjer, samlet, startet = kropp.splitlines(), [], False
    for linje in linjer:
        if linje.startswith(">"):
            startet = True
            samlet.append(linje.lstrip("> ").rstrip())
        elif startet:
            if linje.strip():
                break
            samlet.append("")
    tekst = rens("\n".join(samlet)).strip()
    return "" if tekst.lower() in ("", "definisjon") else tekst


def finn_beslektet(tekst):
    """
    «Beslektet» er en punktliste der hvert begrep kan ha en innrykket
    linje under seg som sier hvorfor de henger sammen.
    """
    ut = []
    for linje in tekst.splitlines():
        topp = re.match(r"^[-*]\s+(.*)$", linje)
        under = re.match(r"^[\t ]+[-*]\s+(.*)$", linje)
        if under and ut:
            ut[-1]["hvorfor"] = rens(under.group(1))
        elif topp:
            maal = lenkemaal(topp.group(1))
            if maal:
                ut.append({"navn": maal[0], "hvorfor": ""})
    return ut


# ---------------------------------------------------------------- lesing

def les_begrep(sti, gruppe):
    raa = open(sti, encoding="utf-8").read()
    fm, kropp = del_frontmatter(raa)

    if str(fm.get("Type", "")).strip() == "temakart" or "Begrep" not in fm:
        return None

    navn = (fm.get("Begrep") or os.path.splitext(os.path.basename(sti))[0]).strip()
    seks = seksjoner(kropp)
    hensikt = next((v for k, v in seks.items() if k.startswith("Hensikt")), "")

    delav = lenkemaal(str(fm.get("Del av", "")))

    aliaser = fm.get("aliases") or fm.get("Aliases") or []
    if isinstance(aliaser, str):
        aliaser = [aliaser] if aliaser else []
    aliaser = [a for a in aliaser if a and a != navn]

    fag = fm.get("Fag") or []
    if isinstance(fag, str):
        fag = [fag] if fag else []

    return {
        "id": slugg(navn),
        "navn": navn,
        "aliaser": aliaser,
        "gruppe": gruppe,
        "delAv": delav[0] if delav else None,
        "fag": fag,
        "status": str(fm.get("Status", "")).strip() or "utkast",
        "definisjon": finn_definisjon(kropp),
        "hensikt": rens(hensikt),
        "eksempel": rens(seks.get("Eksempel", "")),
        "beslektet": finn_beslektet(seks.get("Beslektet", "")),
        "lenker": sorted({m for m in lenkemaal(kropp) if m != navn}),
        "fil": os.path.relpath(sti, VAULT),
    }


def bygg(vault):
    rot = os.path.join(vault, BEGREPSROT)
    if not os.path.isdir(rot):
        sys.exit(f"Fant ikke «{BEGREPSROT}» i {vault}")

    begreper, hoppet = [], 0
    for mappe, _, filer in os.walk(rot):
        gruppe = os.path.basename(mappe)
        if gruppe == BEGREPSROT:
            gruppe = "Uplassert"
        for f in sorted(filer):
            if not f.endswith(".md"):
                continue
            b = les_begrep(os.path.join(mappe, f), gruppe)
            if b:
                begreper.append(b)
            else:
                hoppet += 1

    begreper.sort(key=lambda b: b["navn"].lower())
    etter_navn = {b["navn"]: b for b in begreper}
    for b in begreper:
        for a in b["aliaser"]:
            etter_navn.setdefault(a, b)

    # Søsken: begreper med samme overbegrep. Det er dem som er lette å
    # forveksle, så det er dem nivå 3 skal sortere mellom.
    for b in begreper:
        if b["delAv"]:
            b["soesken"] = [a["id"] for a in begreper
                            if a["delAv"] == b["delAv"] and a["id"] != b["id"]]
        else:
            b["soesken"] = []
        # Bare behold lenker som faktisk peker på et begrep vi har.
        b["lenker"] = sorted({etter_navn[l]["id"] for l in b["lenker"] if l in etter_navn})
        b["beslektet"] = [
            {**r, "id": etter_navn[r["navn"]]["id"] if r["navn"] in etter_navn else None}
            for r in b["beslektet"]
        ]
        if b["delAv"] and b["delAv"] in etter_navn:
            b["delAvId"] = etter_navn[b["delAv"]]["id"]
        else:
            b["delAvId"] = None

    grupper = {}
    for b in begreper:
        g = grupper.setdefault(b["gruppe"], {"navn": b["gruppe"], "id": slugg(b["gruppe"]), "antall": 0})
        g["antall"] += 1

    return {
        "generert": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "kilde": BEGREPSROT,
        "grupper": sorted(grupper.values(), key=lambda g: -g["antall"]),
        "begreper": begreper,
    }, hoppet


if __name__ == "__main__":
    VAULT = sys.argv[1] if len(sys.argv) > 1 else STANDARDVAULT
    VAULT = os.path.expanduser(VAULT)
    data, hoppet = bygg(VAULT)

    her = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ut = os.path.join(her, "data")
    os.makedirs(ut, exist_ok=True)
    fil = os.path.join(ut, "begreper.json")
    with open(fil, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    b = data["begreper"]
    print(f"{len(b)} begreper skrevet til {os.path.relpath(fil, her)}")
    print(f"  hoppet over:     {hoppet} (temakart og notater uten Begrep-felt)")
    print(f"  med definisjon:  {sum(1 for x in b if x['definisjon'])}")
    print(f"  med hensikt:     {sum(1 for x in b if x['hensikt'])}")
    print(f"  med eksempel:    {sum(1 for x in b if x['eksempel'])}")
    print(f"  med søsken:      {sum(1 for x in b if x['soesken'])}")
    print("  grupper:         " + ", ".join(f"{g['navn']} {g['antall']}" for g in data["grupper"]))
    print(f"  filstørrelse:    {os.path.getsize(fil) // 1024} KB")
