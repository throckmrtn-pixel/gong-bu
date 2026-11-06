# gong-bu · designnotat

Studieapp for eksamenslesing. Kortene genereres fra egne Obsidian-notater.
Telefon først (390 × 844). Skjermene er statiske — bortsett fra studieøkten,
som teller på ekte.

## Uttrykket

**Frostet glass som flyter i myk luft. Alt er lys og volum — ingenting er
strek.**

Det er den ene regelen hele systemet henger på, og den er verdt å si rett ut,
fordi forrige utgave brøt den overalt uten at noen enkelt element så feil ut:
strømmende bånd i bakgrunnen, et koordinatnett over dem, en målerail langs
venstre kant, ledestreker i hver korttittel, segmenterte fremdriftsstriper,
hundre og tjue merkestreker rundt urskiva. Hver for seg små. Lagt oppå
hverandre ble de et mønster, og mønsteret spiste innholdet.

Alt det er ute. Det som bærer uttrykket nå er fire ting:

**1 · Myk luft.** Scenen er tre store uskarpe lysflekker, en diger kulekant
oppe til høyre, tre bobler og en dis langs nedre kant. Ingen kanter, ingen
linjer, ingenting som gjentar seg.

**2 · Runde kort.** Radier 20 / 24 / 14. Nok til å lese som frostet plate,
ikke nok til å lese som pute.

**3 · Hvit hårkant.** Hver flate har én lys 1 px kant og en vid, nesten
usynlig skygge. Det er kanten som gjør jobben — skrur du den av, smelter
kortet inn i bakgrunnen.

**4 · Lett type.** Overskrifter på vekt 200–300. Små sperrede versaler til
merkelapper. Mono er reservert for kode; brukt på løpende tekst legger den en
teknisk maske over alt.

## Scenen

Seks lag, bakfra og fram: dis, bue, bobler, dugg, skrim, korn. Alt bygges av
`flyt-scene.js`, og alt er dekorativt — skjermene virker uten.

Tre tall å kjenne til hvis du skal røre laget:

- **Blur 64 px på disen.** Under cirka 40 begynner kanten å avtegne seg, og da
  leser flekken som en form i stedet for som lys i rommet.
- **Boblene ligger på opacity .3 og i øvre del av skjermen.** Nede dekker
  kortene flaten, og der leste de som smuss på glasset i stedet for som kuler
  bak det.
- **Ingen drift under førti sekunder.** Går det fortere leses det som en
  animasjon i stedet for som luft.

Lyset har retning: hvit glød oppe til høyre, blå fordypning nede til venstre.
Lå flekkene jevnt utover flaten ble lyset retningsløst og hele skjermen flat.

## Filer

| Fil | Skjerm |
|---|---|
| `flyt.css` | **Designsystemet.** Alt visuelt bor her. |
| `flyt-scene.js` | Atmosfæren: dis, bue, bobler, dugg, skrim, korn. |
| `flyt-orb.js` | Orben. Delt mellom sidene. |
| `flyt-ui.js` | Tall som teller seg opp, og ring der fingeren treffer. |
| `index.html` | Hjem — sesjon, dagens plan, fliser, beredskap, vault, begrepskart |
| `studie.html` | Studieøkt — urskive, nedtelling, alarm |
| `nivaa1.html` | Nivå 1 · gjenkjenning (definisjon → begrep) |
| `nivaa2.html` | Nivå 2 · forklaring (du skriver selv) |
| `nivaa2-fasit.html` | Nivå 2 · fasit, retting og egenvurdering |
| `nivaa3.html` | Nivå 3 · diskriminering (sorter TCP/UDP) |
| `kode.html` | Kodespor for IN1000 |
| `oversikt.html` | Hva sitter / hva sitter ikke |
| `bord.html` | Bredt dashbord (1280 × 800) for skjerm, ikke telefon |
| `index.html` | **Fagvelgeren.** Inngangen til appen. |
| `hjem.html` | Hjemskjermen for ett fag (lå i `index.html` før). |
| `flyt-fag.js` | Faget som modus: finner det, husker det, bærer det videre. |
| `flyt-tid.js` | Temaet følger klokka. |
| `bakgrunn-dag.webp` · `bakgrunn-natt.webp` | Bakgrunnsbildene. |
| `blomst-dag.webp` · `blomst-natt.webp` | Det andre bakgrunnsmotivet. |
| `flyt-utseende.js` | Arket der bakgrunn og tema velges, og som bruker valget. |
| `galleri.html` | Alle skjermene side om side. Ikke en del av appen. |
| `meny.html` | De tre bunnmeny-variantene side om side. Ikke en del av appen. |
| `prototype.html` | Klikkbar gjennomgang + paletten. Ikke en del av appen. |
| `ku.svg` | Pikselkua. |
| `styles.css` | Det aller første systemet. Bare `hjem-sol.html` bruker det. |

## Temaene

Byttes med `data-tema` på `.skjerm`. Gamle og nye navn peker på det samme, så
eldre markup ikke brekker.

| Nytt navn | Gammelt | Grunn | Tekst |
|---|---|---|---|
| `klar` | `lys` | lys blå | mørkt blekk |
| `staal` | `glo` | dempet blått | hvit |
| `natt` | `mork` | nattblå | lys |

Hvert tema setter de samme variablene; ingenting annet i fila kjenner til
fargene.

To tokens er verdt å kjenne, fordi de er grunnen til at diagrammene virker i
alle tre temaene:

- **`--strek`** er fargen en graf, en søyle eller et ikon tegnes i: mørk mot
  lyst, hvit mot mørkt. Diagrammene på bordet var hardkodet lyse og forsvant
  fullstendig da klar ble et lyst tema. Tegner du noe nytt, tegn det i denne.
- **`--urviser`** er det samme for viseren på urskiva. `--band-kjerne` er
  beholdt som alias til `--strek` for gammel markup.

Orben er unntaket: hun er en glasskule som fanger lys, og ringene rundt henne
står i `--orb-kjerne`, som er hvit i alle temaer.

## Kontrast

Målt, ikke antatt. Alle tre tekstnivåene og `--puls` er sjekket mot alle tre
grunnfargene i alle tre temaene — verste kombinasjon per farge:

| | klar | stål | natt |
|---|---|---|---|
| `--blekk` | 11,2 | 6,4 | 14,7 |
| `--blekk-2` | 6,0 | 5,5 | 8,9 |
| `--blekk-3` | 4,6 | 4,6 | 5,5 |
| `--puls` | 5,2 | 5,0 | 9,5 |

To ting å vite før du flytter på en grunnfarge:

**En mellomtone tåler ikke tre nivåer lys tekst.** Stål lå først på en lysere
blå, og da falt svakeste tekst til 2,6:1. På et mellomblått felt er det
avstanden til hvitt som gir kontrast, ikke avstanden til svart — svakeste
tekst måtte nærmere hvitt, ikke lenger fra det.

**`--blekk-3` er grensen.** Ikke lysere enn den i klar, ikke mørkere i de to
andre.

I de mørke temaene har merkelapper (`.etikett`, `.indeks`, `.trapp`,
`.tegnforklaring`) samme tekstskygge som brødteksten, fordi de kan havne rett
på scenen uten glass bak seg. I klar er `--tekstskygge` ikke satt, så der skjer
ingenting.

## Faget som modus

`index.html` er fagvelgeren, og den ligger **over** appen, ikke inni den —
derfor har den ingen bunnmeny.

Faget velges i et **nedtrekk rett under gong-bu-linja**. Det er den plassen i
toppbaren der navnet på stedet du er står fra før, og dermed den naturlige
plassen for navnet på det du er i ferd med å gå inn i. Resten av flaten er
bildet: én hilsen, to tall og én knapp.

Lista legger seg **over** innholdet under, ikke dytter det nedover — en liste
som skyver halve skjermen leser som en ny side i stedet for som et valg. Den
må også være tettere enn vanlig glass, fordi den havner oppå «Fortsett», som er
den ene ugjennomsiktige hvite flaten på skjermen.

Velger du et fag havner du på `hjem.html?fag=…`, og derfra bærer `flyt-fag.js`
det videre:

- faget legges på `.skjerm` som `data-fag`
- stilarket forskyver `--puls` og `--orb-glod` etter det
- navn og kode fylles inn der markupen ber om det (`data-fag-navn` osv.)
- faget henges på alle interne lenker, så det følger med inn i en øvelse

Det siste er ikke overflødig ved siden av lagringen i `localStorage`: uten det
ville en delt lenke til en øvelse alltid åpnet i det faget du var i sist.
Kodesporet er unntaket — det er IN1000 uansett hvor du kom fra, så den lenka
bærer faget sitt selv.

Registeret over fag står **ett sted**, øverst i `flyt-fag.js`: kode, navn,
merke, beredskap og hva som venter. Nedtrekket bygges derfra, og det samme gjør
tallene på velgeren. Et nytt fag er én linje der, og ingenting i markupen.

`.fagrutenett` og `.fagflis` i stilarket er rutenettet med fire fliser, som var
den første utgaven av velgeren. Ingen side bruker dem nå, men de står igjen —
de er den naturlige formen hvis «Legg til fag» skal vise alle fagene samtidig.

**Tonen per fag er med vilje svak.** Fire fag med hver sin sterke farge ville
vært fire konkurrerende systemer. Her er den én uskarp lysflekk i hjørnet av
flisa, en liten kule i fagets farge, og en dempet forskyvning av aksenten inne
i appen. Nok til at du vet hvor du er, ikke nok til at paletten flytter seg.

## Bakgrunnen og klokka

Scenen har et fotolag nederst: det samme motivet i en lys og en mørk utgave,
begge rundt 85 kB som WebP.

To ting holder det fra å spise innholdet:

**Uskarpheten.** Bildet har harde lysstreker og kretstegninger i seg. Skarpt
konkurrerer det med teksten; på 7–10 px blir det den lyskilden bak glasset som
resten av systemet allerede er bygget rundt, og motivet overlever fint — det er
formene man leser, ikke detaljene.

**Vasken.** Temaets egen grunnfarge lagt over fotoet, på 55–69 %. Den trekker
hele flaten mot grunnfargen uten å skjule motivet, og den er grunnen til at det
i det hele tatt går an å bruke et så sterkt bilde bak et grensesnitt.

Kontrasten er målt mot det *faktiske* fotoet og ikke mot grunnfargene: for hver
tekst skjules teksten, flaten bak den fotograferes, og den verste enkeltpikselen
sammenlignes med tekstfargen. Alt ligger over 4,5:1 i alle tre temaene.

**Bakgrunn og tema velges i appen**, under «···» i toppbaren på velgeren.
Arket bygges av `flyt-utseende.js`, valget lagres på enheten og brukes på alle
skjermene. «Auto» lar klokka bestemme; et fast tema setter `data-tema-laast`,
som er flagget `flyt-tid.js` ser etter for å la være å overstyre. Derfor må
`flyt-utseende.js` lastes **før** `flyt-tid.js`.

**Motivet byttes med `data-bak` på `.skjerm`.** `ror` (standard) og `blomst`.
Alt annet i fotolaget — styrke, uskarphet, vask — er felles, så et nytt motiv
koster to WebP-filer og tre linjer CSS. Rekkefølgen i de reglene betyr noe: den
mørke står først og gjelder alle temaer, så overstyrer den lyse de to lyse.

**Uskarpheten er halvert** siden første runde, til 3–5 px. Mer av motivet er
framme, og vasken tar tilsvarende mer av lesbarhetsjobben.

**Skrimmet går nå i begge ender.** Bunnen er den viktigste: det er der sokkelen
og menyen bor, og den eneste delen av skjermen der tekst kan havne rett på
fotoet uten glass bak seg. Målingen fant nettopp det — «Legg til fag» falt til
2,45:1 mot en lys flekk i blomstermotivet.

**Temaet følger klokka** (`flyt-tid.js`), for skjermer som ber om det med
`data-tema-auto`:

| | |
|---|---|
| 07–15 | `klar` |
| 15–20 | `staal` |
| 20–07 | `natt` |

Grensene er satt etter norsk november, ikke etter et døgn ved ekvator — her er
det mørkt før fire om ettermiddagen. Galleriet, prototypen og menysiden ber
ikke om det, så der kan man studere alle tre temaene uansett hva klokka er.

## Avstandene

Fire tall styrer all luft i appen. Ikke legg inn et femte, og ikke overstyr
dem med `style`-attributter i markupen — det var akkurat det som gjorde at
mellomrommene ikke var like før. Alle ni skjermene er ryddet for innebygde
avstander.

| Token | Verdi | Hva den er |
|---|---|---|
| `--kant` | 22 px | margen mot skjermkanten. Alt med en venstre- eller høyrekant bruker denne, så alt flukter — også toppbaren og bunnmenyen. |
| `--takt` | 16 px | avstanden mellom to blokker under hverandre. |
| `--glipe` | 12 px | avstanden mellom to ting ved siden av hverandre, og mellom to avsnitt. |
| `--kortluft` | 18 px | lufta inni et kort. Samme i små og store kort. |

`.seksjon--tett` finnes fortsatt, men den er nå det samme som `.seksjon`.
Den var unntaket som gjorde at enkelte overganger var strammere enn andre.

## Bevegelse

Fire lag. Alle fire er pynt, alle fire er slått av under
`prefers-reduced-motion`, og regelen for alle er den samme: **lang varighet,
kort utslag.** Ingenting skal kunne oppfattes som at det «spiller».

**Pass på med skript som setter inn markup.** Inngangen under skjuler
`.topp`, `.toppbar`, `.seksjon`, `.telemetri`, `.sokkel` og `.fyll` til
observatøren har sett dem. Alt som settes inn etter at den har kjørt — et ark,
en dialog — må holde seg unna de klassene, ellers står det på opacity 0 for
alltid. Det tok meg en stund å finne første gang.

**Overlegg må ha et unntak fra `position`.** `.skjerm > *:not(.scene)` gir alle
barn `position: relative`, og et overlegg uten unntak blir et flex-element som
presser resten av skjermen sammen i stedet for å legge seg over den. Unntaket
står rett under den regelen; utvid det hvis du lager flere overlegg.

**1 · Inngangen.** Blokkene legger seg på plass når de kommer til syne,
forskjøvet 18 px nedenfra, med 70 ms mellom hver i rekka. Terskelen er
−12 % nedenfra, så en blokk begynner å legge seg på plass mens den fortsatt
er like under kanten og er ferdig omtrent når du ser hele den. Venter du til
den er inne i bildet, rekker du å se den tomme plassen først.

Tilstanden ligger bak `[data-liv]`, som skriptet setter — og det setter det
først når det vet at det faktisk kan animere. Uten JS, eller med redusert
bevegelse, settes attributtet aldri og alt står synlig fra første frame. Det
er med vilje: et grensesnitt som er usynlig til et skript rekker fram er verre
enn et uten animasjon.

**2 · Dybden.** Scenen beveger seg saktere enn innholdet når du ruller.
Skriptet legger rullehøyden på `.skjerm` som `--rull`, og stilarket flytter
hvert lag i sin egen takt: disen minst, boblene mest. Lagene flyttes med
`translate` og ikke `transform`, fordi `transform` allerede er opptatt av
driften i scenen — de to egenskapene legges sammen i stedet for å overskrive
hverandre. Tallene er små med vilje; over cirka 0,2 slutter det å lese som
dybde og begynner å lese som at bakgrunnen sklir.

**3 · Sideskiftet.** Skjermene er egne dokumenter, så overgangen går via
view transitions (`@view-transition { navigation: auto }`). De navngitte
elementene morfes i stedet for å krysstone, og det er **menypilla** som bærer
effekten: den glir fra sin gamle plass til sin nye mens innholdet bytter.
Scenen, statuslinja og hjemstreken står helt i ro.

Navnene må være unike per side. `menypille` sitter på
`.tab a[aria-current="page"]`, og det er alltid nøyaktig én.

**4 · Trykket.** Ringen av lys der fingeren treffer. Gjelder nå også flisene
og bunnmenyen.

## Bunnmenyen

Grunnformen er en **flytende kapsel**: menyen går ikke ut til kantene, den
svever. Det er den enkleste måten å få en meny til å lese som et objekt i
rommet i stedet for som en list langs bunnen, og det er samme logikk som
resten av systemet — flater som flyter, ikke flater som sitter fast.

Den aktive fanen utvider seg til en pille med etikett; de tre andre er bare
ikon. Fire etiketter ved siden av hverandre er fire ord du uansett ikke leser
— ett ord på den du står i er en posisjonsangivelse. Teksten ligger fortsatt i
markupen, bare kollapset, så lenken beholder navnet sitt.

**Bredden er låst til 274 px.** Den aktive pilla er bredere enn de andre, så en
kapsel som krympet til innholdet ville flyttet seg sidelengs hver gang du
byttet side. Nå står kapselen i ro og bare pilla inni beveger seg.

To varianter til, begge full bredde og med alle fire etikettene synlige. Bytt
med én klasse på `<nav class="tab">`; `meny.html` viser alle tre live:

| Klasse | Markering |
|---|---|
| *(ingen)* | Kapsel — den aktive blir en pille med etikett |
| `.tab--bloom` | Lys som siver ut bakfra, ingen plate. Stillest av de tre. |
| `.tab--ring` | Tynn ring rundt ikonet — samme motiv som urskiva |

Kapselen er ikke en matt plate med uskarphet bak, den er **et stykke optisk
glass**. Tre ting gjør det: kraftig `backdrop-filter` med litt metning og lys,
et rim oppe til venstre, og en indre skygge som samler seg i bunnen. Uten de to
siste er den flat.

**Lyset samler seg der du står.** `--pille-x` er midten av den aktive fanen i
prosent, målt av skriptet. Både lysflekken på glassfasen og pølen under
kapselen følger den, så hele kapselen lyser der du er i stedet for alltid på
midten. Pølen henter fagets tone, så menyen sier hvilken modus du er i uten å
skrive det.

`--glod` er lyset bak den aktive fanen. Den snur retning i klar: baren er
allerede nesten hvit der, så en hvit glød forsvant helt, og markeringen må gå
andre veien — en myk blå fordypning i stedet for et lys.

## Fem regler som ikke bør brytes

**1 · Ingenting i scenen har skarp kant.** Alt som er en flekk har blur, alt
som har kontur er en boble med mykt rim. Legger du inn noe med hard kant, hører
det ikke hjemme i det laget.

**2 · Glass på rammeverk, tett på innhold.** Fire tettheter: `.kort`
(rammeverk), `.kort--tett` (innhold — spørsmål, fasit, kode), `.kort--tynn`
(antydning), `.kort--strek` (bare kant). Flater du skal lese eller skrive i er
nesten helt tette. Ellers kjemper teksten mot bakgrunnen, og det er slitsomt
etter tjue kort på bussen.

**3 · Merket bærer tilstanden, ikke fargen.** Hel prikk (sitter), halv prikk
(på vei), tom ring (ikke rørt). Med tre temaer klarer ikke farge alene jobben.

**4 · Én solid ting per skjerm.** Hovedhandlingen er den eneste
ugjennomsiktige flaten. I et system der alt annet slipper lys gjennom er det et
sterkere signal enn å lyse. Bruk `.pille--lys` én gang.

**5 · Kua er den eneste tingen som ikke er lys eller glass.** Derfor fungerer
hun. Blir flere elementer «søte» forsvinner effekten.

## Typografi

- **Space Grotesk** — overskrifter, korttitler, knapper, tall. Vekt 200–500.
- **Inter** — brødtekst, merkelapper, etiketter.
- **JetBrains Mono** — kode og kodefelt. Ikke noe annet.

Merkelappen (`.etikett`) står på .22em sperring. Sperringen er det eneste som
skiller den fra brødtekst, og det holder.

## Ikke bestemt ennå

- **Kua.** Skal hun bli igjen som pikselku? Hun er lesbar i alle tre temaene
  nå, men hun er det eneste som ikke følger språket.
- **Orben i klar.** Hun leser som en blank kule mot lyst papir. Det kan være
  riktig — hun er det ene objektet på en ellers myk flate.
- **Tab-raden** er Hjem / Øv / Økt / Kart. Kodesporet nås fra flisene på hjem.
- **Tallene på hjemskjermen** (428 notater, 1 276 lenker, 62 %) er eksempeldata.
- **Spillene** (matche begrep/definisjon på tid) har ingen skjerm ennå.
- **Ikon og splash** for hjemskjermen.
- **Drag-and-drop** på nivå 3. Feltene er `<button class="felle">` i dag.
