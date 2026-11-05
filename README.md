# gong-bu 공부

Studieapp for eksamenslesing. Kortene genereres fra egne Obsidian-notater.
Rene statiske sider — ingen byggesteg, ingen avhengigheter.

## Kjør lokalt

Åpne `index.html` rett i nettleseren, eller start en liten server så
relative stier og `fetch` oppfører seg som på nett:

```sh
python3 -m http.server 8000
# → http://localhost:8000
```

## Legg den ut på GitHub Pages

```sh
git init
git add .
git commit -m "gong-bu: frontend i flyt"

# med GitHub CLI
gh repo create gong-bu --public --source=. --push

# eller manuelt, etter å ha laget repoet på github.com
git branch -M main
git remote add origin https://github.com/<brukernavn>/gong-bu.git
git push -u origin main
```

Så: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save.**
Sida havner på `https://<brukernavn>.github.io/gong-bu/` etter et minutt eller to.

`index.html` ligger i rota, så Pages serverer appen direkte.
`.nojekyll` er med for at Pages skal la filnavn med understrek være i fred.

## Filer

| Fil | Hva |
|---|---|
| `index.html` | Hjem |
| `studie.html` | Studieøkt med nedtelling og alarm |
| `nivaa1.html` | Nivå 1 · gjenkjenning |
| `nivaa2.html` | Nivå 2 · forklaring |
| `nivaa2-fasit.html` | Nivå 2 · fasit og retting |
| `nivaa3.html` | Nivå 3 · diskriminering |
| `kode.html` | Kodespor for IN1000 |
| `oversikt.html` | Hva sitter / hva sitter ikke |
| `bord.html` | Bredt dashbord, fast 1280 × 800 |
| `bordet.html` | Samme dashbord, responsivt og selvstendig |
| `flyt.css` | **Designsystemet.** Alt visuelt bor her. |
| `flyt-scene.js` | Bakgrunnslagene |
| `flyt-orb.js` | Orben |
| `flyt-ui.js` | Tellende tall, ring av lys ved trykk |
| `ku.svg` | Pikselkua |
| `bg-*.webp` | Bakgrunnsbildene, ett sett per tema |
| `galleri.html` | Alle skjermene side om side. Ikke en del av appen. |
| `prototype.html` | Eldre gjennomgang. Ikke en del av appen. |
| `hjem-sol.html`, `styles.css` | Forrige designsystem. Beholdt som referanse. |

Se `DESIGN.md` for hvorfor ting ser ut som de gjør.

## Temaer

Tre, byttes med `data-tema` på `.skjerm`:

```html
<div class="skjerm" data-tema="glo">   <!-- lys · mork · glo -->
```

## Bakgrunnsbildene

`bg-lys.webp` og `bg-mork.webp` er Amis egne referansebilder, komprimert.
Skal appen deles videre, bytt dem mot bilder du har rettighetene til.
