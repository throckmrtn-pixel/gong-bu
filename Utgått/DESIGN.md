# gong-bu · designnotat

Studieapp for eksamenslesing. Kortene genereres fra egne Obsidian-notater.
Telefon først (390 × 844). Dette er statiske skjermer — ingen logikk ennå.

## Filer

| Fil | Skjerm |
|---|---|
| `flyt.css` | **Designsystemet.** Alt visuelt bor her nå. |
| `flyt-scene.js` | Bakgrunnen — båndene og gulvet. Delt mellom sidene. |
| `flyt-orb.js` | Orben. Delt mellom sidene. |
| `flyt-ui.js` | Tall som teller seg opp, og ring av lys ved trykk. |
| `galleri.html` | Alle skjermene side om side. Ikke en del av appen. |
| `styles.css` | Forrige system. Ingen sider bruker det lenger. |
| `ku.svg` | Pikselkua. Brukes med `<img class="kua">` i alle størrelser. |
| `index.html` | **Ny retning.** Hjem — vaultstatus, orb, beredskap, dagens plan, begrepskart |
| `hjem-sol.html` | Forrige hjemskjerm, på det gamle systemet. Beholdt for sammenligning. |
| `nivaa1.html` | Nivå 1 · gjenkjenning (definisjon → begrep) |
| `nivaa2.html` | Nivå 2 · forklaring (du skriver selv) |
| `nivaa2-fasit.html` | Nivå 2 · fasit, retting og egenvurdering |
| `nivaa3.html` | Nivå 3 · diskriminering (sorter TCP/UDP) |
| `kode.html` | Kodespor for IN1000 |
| `oversikt.html` | Hva sitter / hva sitter ikke |
| `flyt.css` | **Ny retning.** Eget designsystem: lys i bevegelse, tre temaer. |
| `flyt-scene.js` | Bakgrunnen — båndene og gulvet. Delt mellom flyt-skjermene. |
| `flyt-orb.js` | Orben. Delt mellom flyt-skjermene. |
| `studie.html` | **Ny retning.** Studieøkt — nedtelling, alarm og orben. |
| `bord.html` | **Ny retning.** Bredt dashbord (1280 × 800) for skjerm, ikke telefon. |
| `prototype.html` | Klikkbar gjennomgang av alle skjermene + paletten. Ikke en del av appen. |

Sidene inneholder bare struktur. Vil du endre utseende, gjør det i `styles.css`.

## Uttrykket

Kald pastellgrunn, varmt sollys ovenfra høyre. Runde squircle-former, mye luft.
**Ingen mørke flater noe sted** — heller ikke kodeblokker.

### Lyset er hele systemet

Én sol, øverst til høyre, på **203°**. Den vinkelen ligger i `--lysvinkel` og brukes i
hver eneste gradient. Konsekvensen er tredelt, og den gjentas på alt som er glass:

1. **Kanten mot sola er nesten hvit** (`--kant-sol`), kanten bort fra den er svak.
2. **Skyggen faller ned mot venstre**, og den er kjølig, ikke grå (`--kast-1/2/3`).
3. **Kaustikken** — den varme lysflekken glasset kaster på flaten bak — ligger nede
   til venstre.

Bryter du vinkelen ett sted, slutter flatene å lese som fysisk glass og blir
gjennomsiktige bokser igjen. Det er den eneste regelen i systemet som ikke tåler unntak.

### Fire byggeklosser for lys

Alle fire er dekorative: aldri klikkbare, aldri under tekst. De legges som første barn
i en `position:relative`-forelder, slik at elementet selv havner over dem.

- `.kaust` — kaustikken. Varm flekk under elementet, forskjøvet ned mot venstre.
  Brukes på **flater**: kort, kodeblokker, lesepaneler.
- `.iris` — prismeglød hele veien rundt, gull på solsiden og periwinkle i skyggen.
  Brukes på **det som skal gløde**: hovedknappen, brikken som svever.
- `.glans` — hvit refleks langs øvre kant, inni elementet.
- `.glimt` — kjølig brytning nede i skyggesiden, inni elementet.

I tillegg har alle glassflater en **prismekant**: én piksel langs øvre fas som går
gull → hvitt → periwinkle. Den ligger i `::after` på `.panel`, `.pille`, `.kode` og
`.nav`, så du trenger ikke gjøre noe for å få den.

Mønsteret er alltid det samme:

```html
<div style="position:relative">
  <span class="iris"></span>
  <a class="pille pille--stor" href="...">
    <span class="glans"></span>
    <span class="glimt"></span>
    <span>Tekst</span>
  </a>
</div>
```

> Merk: `.glans` og `.glimt` må beholde `position:absolute`. Regelen i `styles.css` er
> derfor `.pille > span:not(.glans):not(.glimt)` — uten `:not()` blir de flex-elementer
> og dytter knappeteksten ut av midten.

## Fem regler som ikke bør brytes

**1. Glass på rammeverk, tett på innhold.**
Tre tettheter: `.panel` (rammeverk, slipper bakgrunnen gjennom), `.panel--lese`
(innhold, nesten tett) og `.panel--hinne` (bare en antydning). Flater du skal lese
eller skrive i — `.panel--lese`, `.felt`, `.kode` — er nesten helt hvite. Ellers kjemper
teksten mot bakgrunnen, og det er slitsomt etter tjue kort på bussen.

**2. Tilstand bæres av merket, ikke fargen.**
I oversikten har hver brikke en prikk: hel (sitter), halv (på vei), tom ring
(ikke rørt). Når hele paletten er lys, klarer ikke farge alene å skille tre
tilstander — særlig ikke i sollys eller for fargeblinde. Ikke fjern prikken.

**3. Én glødende ting per skjerm.**
Full `.iris` brukes én gang. På nivå 1 er det *ingen* av svaralternativene som gløder —
de får bare en svak `.kaust` hver. Fire like glorier over hverandre blir et fargebelte,
og da forsvinner hierarkiet.

**4. Nederste tredjedel er tommelsonen.**
Alt man trykker på bor i `.sokkel` og skal nås uten å flytte grepet. Minste
trykkflate 44 px.

**5. Kua er den eneste tingen som ikke er glass.**
Alt annet er lys og presisjon. Derfor fungerer den. Hvis flere elementer blir
«søte», forsvinner effekten. Den har fått en liten kjølig drop-shadow så den står i
samme lys som resten, og den rusler sakte (`@keyframes rusle`).

## Paletten

Kalde pasteller som flate, varmt lys som belysning. **Gullet er aldri fyll** — det er
bare sola som treffer noe.

| Token | Hex | Brukes til |
|---|---|---|
| `--is-1` | `#ABC0F6` | periwinkle, dypeste aksentpastell |
| `--is-2` | `#C7D6F7` | dis |
| `--is-3` | `#D5D9F2` | lilla dis |
| `--is-4` | `#E4E2F8` | syrin |
| `--is-5` | `#E1EDF6` | is |
| `--mint` | `#D6F0EA` | mint |
| `--rosa` | `#F8DCE6` | rosa |
| `--sol-kant` | `#FFE2AA` | lys som treffer en kant |
| `--aksent` | `#44489C` | lenker, tall, nivåmerker |
| `--blekk` | `#191D2B` | primærtekst |

## Typografi

- **Space Grotesk** — overskrifter, knapper, store tall. Stram tracking (−.025em).
- **Inter** — brødtekst, definisjoner, svar.
- **JetBrains Mono** — merkelapper, tall, statuslinjer (`NIVÅ 02`, `KRYPT_004`,
  `12 FORFALT`). Det er herfra det tekniske preget kommer.

Hjelpeklassen `.hakk` er en rad bittesmå målestrek. Rent ornament, men det er den som
gjør at skjermen leses som et instrument heller enn en app.

## Kontrast

Alle tekstfarger er valgt til minst 4.5:1 mot sin egen bakgrunn.
`--blekk-3` (`#4F5770`) er grensen — ikke lysere enn den.
`--gull` (`#7A5E31`) er kun til små etiketter, og aldri på den kaldeste bakgrunnen.

## Flyt

Alle åtte skjermene ligger nå på `flyt.css`. `styles.css` er ikke lenger i bruk, men
beholdes til `hjem-sol.html` så det går an å se hvor designet kom fra.

**Hva som er annerledes.** Forrige system har én fast sol. Her beveger lyset seg *bak*
glasset — båndene strømmer, speiles i et gulv nederst, og kortene plukker opp fargen fra
det som ligger under dem. Det betyr også at regelen «ingen mørke flater» faller: det
finnes nå et nattema.

**Tre temaer**, byttes med `data-tema` på `.skjerm`:

| Tema | Grunn | Tekst | Til hva |
|---|---|---|---|
| `lys` | lys pastell | mørkt blekk | dagslys, lange økter |
| `mork` | dyp blå | lyst | natt |
| `glo` | dus fiolett | hvit | stemning |

Glød er mørkere enn referansebildet med vilje. På den lyse pastellgrunnen lå hvit tekst
rundt 2,5:1 — nå ligger den på 4,7:1. Vil du ha den blekere, må teksten enten bli mørk
eller flytte inn på glass.

**Orben** er tegnet i SVG, ikke hentet fra et bilde. Derfor skalerer den, arver fargene
fra temaet, og kan reagere på hva som skjer. Tilstand settes med `data-sinn` på `.orb`:

- `rolig` — puster langsomt, venter
- `jobber` — raskere puls, ringen løper
- `hviler` — dempet, øynene halvlukket
- `ferdig` — blusser opp

**Hjemskjermen** har mer innhold enn 844 px, så toppbaren og tab-raden står i ro mens
feltet imellom ruller (`.rull`). Derfor har `.skjerm` i flyt fast høyde, ikke `min-height`
— et rullefelt trenger en ramme å rulle inni. På ekte telefon byttes den mot `100dvh`.

Kortene i bentoen starter på ulik linje (`.forskjov`). Det er forskyvningen som gjør at de
leses som flytende plater og ikke som en tabell.

**Bordet** er samme system i bredt format. Ett hovedpanel i midten, svevende sidepaneler
utenfor, og tynne koblingslinjer med lysende noder imellom. Linjene tegnes av skriptet i
`bord.html` ut fra `getBoundingClientRect`, ikke fra faste tall — da treffer de selv om et
panel endrer høyde, og de tegnes på nytt når vinduet endrer seg.

**Båndene** består av fem streker oppå hverandre: glød, kropp, to fargefrynser forskjøvet
opp og ned, mykt indre lys, og en hårtynn spekulær strek på toppkanten. Det er frynsene og
den spekulære streken som skiller «tykt glass» fra «en farget linje». Markupen genereres i
`flyt-scene.js`, fordi fem streker ganger fire bånd ganger to formater blir førti nesten
like linjer.

**Futurisme-laget** er fem tillegg som gjør systemet mer instrument og mindre app, og som
alle tåler å bli slått av: prismekanten på toppen av hvert kort (lysstripa splittes i
fargene fra båndene bak), lyssveipet som passerer over glasset hvert ellevte sekund
forskjøvet fra kort til kort, hjørnemerkene som rammer inn hovedflaten, tallene som teller
seg opp, og ringen av lys der fingeren treffer.

**Statuslinja og hjemstreken** hører til telefonen, ikke til appen. De er med fordi
skjermbildet ellers ikke ser ut som en telefon.

**Studieøkten** teller ned mot et klokkeslett, ikke ved å trekke fra en variabel, slik at
den ikke sakker etter når fanen har ligget i bakgrunnen. Alarmen er tre toner laget med
Web Audio — den trenger ingen lydfil, og den får lov til å spille fordi brukeren allerede
har trykket «Start». Ingen streak, ingen tapt-dag: kortene «går ingen steder».

## Ikke bestemt ennå

- **Om flyt skal overta helt.** Hjem og studieøkt er flyttet. De seks øvelses- og
  oversiktsskjermene står igjen på `styles.css`.
- **Tab-raden** er nå Hjem / Øv / Økt / Kart. Kodesporet mistet plassen sin da økten kom
  inn — det må nås fra Øv, eller bytte plass med Kart.
- **Tallene på hjemskjermen** (428 notater, 1 276 lenker, 62 %) er eksempeldata.
- **Spillene** (matche begrep/definisjon på tid) har ingen skjerm ennå.
- **Ikon og splash** for hjemskjermen.
- **Drag-and-drop** på nivå 3. Feltene er `<button class="felle">` i dag; de må bli
  ekte dropsoner når logikken kommer.
