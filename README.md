# gong-bu 공부

Øving på egne begreper, rett inne i Obsidian. Kortene bygges av notatene
i vaulten — ingen eksport, ingen datafil, ingenting som må holdes i synk.

Tre deler:

| Del | Hva | Hvor |
|---|---|---|
| **Pluginen** | Selve appen. Leser vaulten, viser kort, husker framdrift. | `plugin/` |
| **Verktøyene** | Lager kort av eksamenssett og notater. Sjekker definisjoner. | `verktoy/` |
| **Frontenden** | Designsystemet. Statiske sider, brukt til å finne uttrykket. | rota |

Notatene dine blir lest, aldri skrevet til. Framdriften ligger i pluginens
egen `data.json`, utenfor notatene men inne i vaulten, så den følger med
når vaulten synkes til telefonen.

---

## Pluginen

### Installere

```sh
cp -r plugin "<vault>/.obsidian/plugins/gong-bu"
```

Så i Obsidian: **Innstillinger → Community plugins → Installed plugins**,
trykk oppdater-ikonet, og slå på `gong-bu`. Åpne den med
graduation-cap-ikonet i margen, eller kommandoen «Åpne gong-bu».

### Hva den leser

`20 Begreper/` — alle notater med `Begrep:` i frontmatter. Notater med
`Type: temakart` hoppes over.

```yaml
---
Begrep: Symmetrisk kryptering
aliases: [symmetrisk]
Del av: "[[Kryptering]]"
Fag:
  - IN1020
Status: ryddet
---
# Symmetrisk kryptering
> Definisjonen står som sitatblokk rett under tittelen.

## Hensikt / Hva det brukes til
## Eksempel
```

`Del av:` er det feltet som gjør kortene vanskelige: begreper med samme
overbegrep blir hverandres svaralternativer. Det er dem du faktisk
forveksler.

`50 Kort/` — kortene verktøyene har laget. Se under.

Skriver du et nytt begrep, er det med i neste kort. Ingen reindeksering
å huske på.

### Repetisjon

Trinnene er `0 · 1 · 3 · 7 · 16 · 35 · 75` dager. Treffer du, går kortet
opp et trinn. Bommer du, faller det til trinn 0 og kommer tilbake om ti
minutter.

Ingen streaks. En dag uten lesing koster ingenting — kortene blir bare
forfalte, og forfalte kort kommer først.

---

## Verktøyene

Kjører på maskinen din, ikke i pluginen. Tre grunner: API-nøkkelen havner
aldri på telefonen, pluginen er rask og virker uten nett, og — viktigst —
du får se LLM-generert innhold før det blir kort du pugger på. En modell
som finner på en definisjon er verre enn ingen kort.

### Oppsett

```sh
pip3 install pypdf
cp env-eksempel.txt .env        # og lim inn nøkkelen i .env
```

`.env` er gitignorert.

### Lage kort

```sh
python3 verktoy/lag-kort.py --type alle --maks 8
python3 verktoy/lag-kort.py --type scenario --gruppe Sikkerhet
python3 verktoy/lag-kort.py --type eksamen        # leser eksamen/*.pdf
python3 verktoy/lag-kort.py --type alle --torr    # vis uten å kalle API
```

Fire sjangre:

| `--type` | Kortet | Form |
|---|---|---|
| `scenario` | En situasjon — hvilket begrep er det? | flervalg |
| `finnfeilen` | En påstand med én presis feil | flervalg |
| `forskjell` | Hva skiller to beslektede begreper? | flervalg |
| `eksamen` | Oppgave fra et eksamenssett, med fasit og sensorkriterier | skriv |

Kortene havner i `50 Kort/` i vaulten, ett per fil, med `Sjekket: nei`.
Pluginen viser dem med et oransje **ukontrollert**-merke til du har lest
gjennom og satt `Sjekket: ja`. Er kortet feil: rett det i Obsidian, eller
slett fila.

Eksamens-PDF-ene legger du i `eksamen/`. Mappa er gitignorert — settene
blir liggende hos deg, og kommer verken inn i repoet eller i vaulten.

### Sjekke definisjoner

```sh
python3 verktoy/sjekk-definisjoner.py
python3 verktoy/sjekk-definisjoner.py --gruppe Sikkerhet
```

Går gjennom definisjonene dine og skriver en **rapport** til
`rapporter/definisjoner-<dato>.md`. Den retter ingenting. En modell som
«fikser» definisjonen din kan ta feil, og da har du pugget noe galt uten
å vite det. Rapporten peker, du bestemmer.

Funnene er sortert: feil og forveksling først, så sirkulært og upresist,
så det tynne. God definisjon blir ikke meldt i det hele tatt.

---

## Frontenden

De statiske sidene i rota er designsystemet — der uttrykket ble funnet.
Pluginvisningen følger Obsidians eget tema foreløpig.

```sh
python3 -m http.server 8000      # → http://localhost:8000
```

| Fil | Hva |
|---|---|
| `index.html` | Hjem |
| `studie.html` | Studieøkt med nedtelling og alarm |
| `nivaa1.html` | Nivå 1 · gjenkjenning |
| `nivaa2.html` · `nivaa2-fasit.html` | Nivå 2 · forklaring og retting |
| `nivaa3.html` | Nivå 3 · diskriminering |
| `kode.html` | Kodespor for IN1000 |
| `oversikt.html` | Hva sitter / hva sitter ikke |
| `bord.html` · `bordet.html` | Bredt dashbord, fast og responsivt |
| `flyt.css` | **Designsystemet.** Alt visuelt bor her. |
| `flyt-scene.js` | Bakgrunnslagene |
| `flyt-orb.js` | Orben |
| `flyt-ui.js` | Tellende tall, ring av lys ved trykk |
| `ku.svg` | Pikselkua |
| `bg-*.webp` | Bakgrunnsbildene, ett sett per tema |
| `galleri.html` | Alle skjermene side om side. Ikke en del av appen. |
| `prototype.html` | Eldre gjennomgang. Ikke en del av appen. |
| `hjem-sol.html` · `styles.css` | Forrige designsystem. Beholdt som referanse. |

Se `DESIGN.md` for hvorfor ting ser ut som de gjør.

Tre temaer, byttes med `data-tema` på `.skjerm`:

```html
<div class="skjerm" data-tema="glo">   <!-- lys · mork · glo -->
```

`bg-lys.webp` og `bg-mork.webp` er Amis egne referansebilder, komprimert.
Skal appen deles videre, bytt dem mot bilder du har rettighetene til.
