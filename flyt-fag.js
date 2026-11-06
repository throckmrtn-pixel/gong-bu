/* ============================================================
   gong-bu · flyt · faget

   Faget er en modus. Dette skriptet er alt som holder den:

     1  finner hvilket fag du er i — fra ?fag= i adressen, eller
        fra det du valgte sist
     2  legger det på .skjerm som data-fag, slik at stilarket kan
        forskyve aksenten og gløden
     3  fyller inn navn og kode der markupen ber om det
     4  henger faget på alle interne lenker, så det følger med
        videre inn i appen

   Registeret under er det eneste stedet et fag er definert. Skal
   du legge til ett, legg det inn her og lag en flis i index.html
   med samme nøkkel.
   ============================================================ */

(function () {
  "use strict";

  /* Rekkefølgen her er rekkefølgen i nedtrekket. */
  var ORDEN = ['in1020', 'in1000', 'inf0010', 'inec1821'];

  var FAG = {
    in1020:   { kode: 'IN1020',   navn: 'Datateknologi',                 merke: 'IN',  andel: 62, venter: '12 forfalt'  },
    in1000:   { kode: 'IN1000',   navn: 'Objektorientert programmering', merke: 'IN',  andel: 41, venter: '8 oppgaver' },
    inf0010:  { kode: 'INF0010',  navn: 'Forkurs informatikk',           merke: 'INF', andel: 88, venter: '3 forfalt'  },
    inec1821: { kode: 'INEC1821', navn: 'Organisasjon og ledelse',       merke: 'EC',  andel: 27, venter: '24 forfalt' }
  };

  var STANDARD = 'in1020';
  var NOKKEL = 'gongbu:fag';

  /* localStorage finnes ikke i alle sammenhenger — privat vindu,
     innebygd ramme, blokkert lagring. Faget er ikke viktig nok
     til å velte siden hvis det ikke går. */
  function lagret() {
    try { return localStorage.getItem(NOKKEL); } catch (e) { return null; }
  }
  function lagre(id) {
    try { localStorage.setItem(NOKKEL, id); } catch (e) { /* lever uten */ }
  }

  function finnFag() {
    var fra = new URLSearchParams(location.search).get('fag');
    if (fra && FAG[fra]) { lagre(fra); return fra; }
    var sist = lagret();
    if (sist && FAG[sist]) return sist;
    return STANDARD;
  }

  /* Faget følger med videre. Uten dette ville du falt tilbake til
     standardfaget så snart du gikk fra hjem til en øvelse — og
     lagringen alene holder ikke, for da ville en delt lenke til en
     øvelse alltid åpnet i det faget du var i sist. */
  function hengPaaLenker(id) {
    var lenker = document.querySelectorAll('a[href$=".html"]');
    for (var i = 0; i < lenker.length; i++) {
      var a = lenker[i];
      var href = a.getAttribute('href');
      if (!href || href.indexOf('fag=') > -1 || href.charAt(0) === '#') continue;
      /* velgeren selv skal ikke ha et fag hengende på seg */
      if (href.indexOf('index.html') === 0) continue;
      a.setAttribute('href', href + (href.indexOf('?') > -1 ? '&' : '?') + 'fag=' + id);
    }
  }

  function start() {
    var skjerm = document.querySelector('.skjerm');
    if (!skjerm) return;

    var id = finnFag();

    var nedtrekk = document.querySelector('.nedtrekk');
    skjerm.dataset.fag = id;

    tegnFag(skjerm, id);
    if (nedtrekk) byggNedtrekk(nedtrekk, skjerm, id);
    else hengPaaLenker(id);
  }

  /* Fyller inn alt som viser hvilket fag du er i. */
  function tegnFag(skjerm, id) {
    var f = FAG[id];
    skjerm.dataset.fag = id;

    var sett = function (velger, verdi) {
      var el = document.querySelectorAll(velger);
      for (var i = 0; i < el.length; i++) el[i].textContent = verdi;
    };
    sett('[data-fag-navn]',  f.navn);
    sett('[data-fag-kode]',  f.kode);
    sett('[data-fag-merke]', f.merke);
    sett('[data-fag-venter]', f.venter);

    var andel = document.querySelector('[data-fag-andel]');
    if (andel) andel.innerHTML = f.andel + '<small>&#8202;%</small>';

    var stripe = document.querySelector('[data-fag-stripe]');
    if (stripe) stripe.style.width = f.andel + '%';

    var videre = document.querySelectorAll('[data-fag-videre]');
    for (var i = 0; i < videre.length; i++) {
      videre[i].setAttribute('href',
        videre[i].dataset.fagVidere.replace('{fag}', id));
    }
  }

  /* ------------------------------------------------------------
     NEDTREKKET
     Lista bygges fra det samme registeret som alt annet, så et nytt
     fag er én linje der oppe og ingenting her nede.
     ------------------------------------------------------------ */
  function byggNedtrekk(rot, skjerm, id) {
    var knapp = rot.querySelector('.nedtrekk-knapp');
    var liste = rot.querySelector('.nedtrekk-liste');
    if (!knapp || !liste) return;

    liste.innerHTML = ORDEN.map(function (n) {
      var f = FAG[n];
      return '<li role="option" data-id="' + n + '" aria-selected="' + (n === id) + '">'
        + '<button type="button" data-fag="' + n + '" data-fag-tone="' + n + '">'
        + '<span class="kule" aria-hidden="true"></span>'
        + '<span class="navn">' + f.navn + '</span>'
        + '<span class="andel">' + f.andel + '%</span>'
        + '</button></li>';
    }).join('');

    /* Kulene henter tonen sin fra data-fag på selve knappen. */
    Array.prototype.forEach.call(liste.querySelectorAll('button'), function (b) {
      b.setAttribute('data-fag', b.dataset.fagTone);
    });

    function apne(pa) {
      rot.dataset.apen = String(pa);
      knapp.setAttribute('aria-expanded', String(pa));
    }

    function velg(ny) {
      lagre(ny);
      tegnFag(skjerm, ny);
      Array.prototype.forEach.call(liste.children, function (li) {
        li.setAttribute('aria-selected', String(li.dataset.id === ny));
      });
    }

    knapp.addEventListener('click', function (e) {
      e.stopPropagation();
      apne(rot.dataset.apen !== 'true');
    });

    liste.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-fag]');
      if (!b) return;
      velg(b.dataset.fag);
      apne(false);
      knapp.focus();
    });

    /* Klikk utenfor og Escape lukker. Uten begge to føles et
       nedtrekk som en felle. */
    document.addEventListener('click', function (e) {
      if (!rot.contains(e.target)) apne(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && rot.dataset.apen === 'true') { apne(false); knapp.focus(); }
    });

    apne(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
