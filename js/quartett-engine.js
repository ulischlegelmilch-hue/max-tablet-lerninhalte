// Auto-Quartett: reine Spiellogik ohne Oberflaeche (laeuft im Browser UND in Node auf dem Pi).
// Regeln (wie "Supertrumpf"): meist 32 Karten, jeder bekommt die Haelfte. Wer am Zug ist, waehlt auf seiner
// obersten Karte einen Wert. Der bessere Wert gewinnt beide Karten, der Gewinner waehlt als Naechstes.
// Gleichstand: beide Karten kommen in die Mitte, der naechste Gewinner nimmt sie mit.
// Wer alle Karten hat, gewinnt. Nach MAX_RUNDEN Runden gewinnt, wer mehr Karten hat.
//
// VENDORED: die Kopie unter backend/ wird von tools/export_quartett.js erzeugt - nur hier aendern.
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.QuartettEngine = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  const MAX_RUNDEN = 60;

  // Kartensaetze: { id: { name, ordner, werte: [{key,label,einheit,besser,hinweis}], karten: [...] } }
  // besser: 'hoch' = der groessere Wert gewinnt, 'niedrig' = der kleinere Wert gewinnt
  let saetze = {};
  let autos = {}; // Karten-id -> Karte (jede Karte kennt ihren Satz)
  let ids = {};   // Satz-id -> [Karten-ids]

  function setzeSaetze(def) {
    saetze = def; autos = {}; ids = {};
    Object.keys(def).forEach((sid) => {
      ids[sid] = [];
      def[sid].karten.forEach((k) => { k.satz = sid; autos[k.id] = k; ids[sid].push(k.id); });
    });
  }
  function satzListe() { return Object.keys(saetze).map((sid) => ({ id: sid, name: saetze[sid].name, ordner: saetze[sid].ordner })); }
  function satz(sid) { return saetze[sid]; }
  function auto(id) { return autos[id]; }
  function alleIds(sid) { return (ids[sid] || []).slice(); }
  function werte(sid) { return saetze[sid] ? saetze[sid].werte : []; }
  function wertInfo(sid, key) { return werte(sid).find((w) => w.key === key); }

  /** 1 = Karte a gewinnt, -1 = Karte b gewinnt, 0 = Gleichstand. */
  function vergleiche(a, b, key) {
    if (!a || !b) return 0;
    const info = wertInfo(a.satz, key);
    if (!info) return 0;
    const d = a[key] - b[key];
    if (d === 0) return 0;
    return (info.besser === 'hoch' ? d > 0 : d < 0) ? 1 : -1;
  }

  /** Platz der Karte bei diesem Wert unter allen Karten (1 = beste). Gleiche Werte teilen den Platz. */
  function platz(id, key) {
    const k = autos[id];
    let besser = 0;
    ids[k.satz].forEach((i) => { if (vergleiche(autos[i], k, key) > 0) besser++; });
    return besser + 1;
  }

  function mische(liste, zufall) {
    const z = zufall || Math.random;
    const kopie = liste.slice();
    for (let i = kopie.length - 1; i > 0; i--) {
      const j = Math.floor(z() * (i + 1));
      const t = kopie[i]; kopie[i] = kopie[j]; kopie[j] = t;
    }
    return kopie;
  }

  /** Neues Spiel fuer zwei Rollen (z.B. 'papa'/'max' oder 'spieler'/'computer'). Die erste Rolle beginnt. */
  function neuesSpiel(erste, zweite, zufall, sid) {
    const satzId = sid && saetze[sid] ? sid : Object.keys(saetze)[0];
    const deck = mische(ids[satzId], zufall);
    const decks = {};
    const haelfte = Math.floor(deck.length / 2);
    decks[erste] = deck.slice(0, haelfte);
    decks[zweite] = deck.slice(haelfte, haelfte * 2);
    const rest = deck.slice(haelfte * 2); // bei ungerader Kartenzahl: die uebrige Karte liegt zu Beginn in der Mitte
    return {
      spielId: Date.now(), satz: satzId, status: 'laeuft', spieler: { erster: erste, zweiter: zweite }, amZug: erste,
      decks, mitte: rest, rundenNr: 0, runden: 0, letzteRunde: null,
      gewinner: null, aufgegebenVon: null
    };
  }

  function andere(sp, rolle) { return rolle === sp.spieler.erster ? sp.spieler.zweiter : sp.spieler.erster; }
  function obersteKarte(sp, rolle) { return sp.decks[rolle][0] || null; }

  /** Der Spieler am Zug waehlt einen Wert. Gibt false zurueck, wenn der Zug ungueltig ist. */
  function spieleRunde(sp, rolle, key) {
    if (sp.status !== 'laeuft' || sp.amZug !== rolle || !wertInfo(sp.satz, key)) return false;
    const gegner = andere(sp, rolle);
    const meine = sp.decks[rolle].shift();
    const seine = sp.decks[gegner].shift();
    if (!meine || !seine) return false;
    if (!wertInfo(sp.satz, key)) { sp.decks[rolle].unshift(meine); sp.decks[gegner].unshift(seine); return false; }
    const v = vergleiche(autos[meine], autos[seine], key);
    const karten = {}; karten[rolle] = meine; karten[gegner] = seine;
    let gewinner = null;
    let mitgenommen = 0;
    if (v === 0) {
      sp.mitte.push(meine, seine);
    } else {
      gewinner = v > 0 ? rolle : gegner;
      const verlierer = gewinner === rolle ? gegner : rolle;
      const gewonnen = [karten[gewinner], karten[verlierer]].concat(sp.mitte);
      mitgenommen = sp.mitte.length;
      sp.mitte = [];
      sp.decks[gewinner].push(...gewonnen);
      sp.amZug = gewinner;
    }
    sp.runden++;
    sp.rundenNr++;
    sp.letzteRunde = { nr: sp.rundenNr, wahl: key, wahlVon: rolle, karten, gewinner, mitteGroesse: sp.mitte.length, mitgenommen };
    pruefeEnde(sp);
    return true;
  }

  function pruefeEnde(sp) {
    const a = sp.decks[sp.spieler.erster].length, b = sp.decks[sp.spieler.zweiter].length;
    if (a === 0 || b === 0) {
      sp.status = 'beendet';
      sp.gewinner = a === b ? null : (a > b ? sp.spieler.erster : sp.spieler.zweiter);
    } else if (sp.runden >= MAX_RUNDEN) {
      sp.status = 'beendet';
      sp.gewinner = a === b ? null : (a > b ? sp.spieler.erster : sp.spieler.zweiter);
    }
    if (sp.status === 'beendet') sp.amZug = null;
  }

  function aufgeben(sp, rolle) {
    if (sp.status !== 'laeuft') return false;
    sp.status = 'beendet'; sp.aufgegebenVon = rolle; sp.gewinner = andere(sp, rolle); sp.amZug = null;
    return true;
  }

  /** Wertung fuer die Wahl: 0 (schlecht) .. 1 (beste Karte der ganzen Packung bei diesem Wert). */
  function staerke(id, key) { return 1 - (platz(id, key) - 1) / Math.max(1, ids[autos[id].satz].length - 1); }

  /** Waehlt den Wert fuer den Computer. stufe: 'leicht' | 'normal' | 'schlau' */
  function computerWahl(id, stufe, zufall) {
    const z = zufall || Math.random;
    const rang = werte(autos[id].satz).map((w) => ({ key: w.key, s: staerke(id, w.key) })).sort((a, b) => b.s - a.s);
    if (stufe === 'leicht') {
      // meistens irgendein Wert, selten der beste
      return (z() < 0.25 ? rang[0] : rang[Math.floor(z() * rang.length)]).key;
    }
    if (stufe === 'schlau') return rang[0].key;
    // normal: meist der beste, manchmal der zweitbeste
    return (z() < 0.7 ? rang[0] : rang[1]).key;
  }

  /** Der Wert, bei dem die eigene Karte am staerksten ist (fuer den Tipp). */
  function besterWert(id) {
    return werte(autos[id].satz).map((w) => ({ key: w.key, s: staerke(id, w.key) })).sort((a, b) => b.s - a.s)[0].key;
  }

  /** Persoenlicher Blick fuer eine Rolle: nur die eigene oberste Karte, vom Gegner nur die Anzahl. */
  function standFuerRolle(sp, rolle) {
    const gegner = andere(sp, rolle);
    return {
      typ: 'stand', spielId: sp.spielId, satz: sp.satz, status: sp.status, spieler: sp.spieler, amZug: sp.amZug, gewinner: sp.gewinner,
      aufgegebenVon: sp.aufgegebenVon, rundenNr: sp.rundenNr, runden: sp.runden, maxRunden: MAX_RUNDEN,
      meineKarte: obersteKarte(sp, rolle), meineAnzahl: sp.decks[rolle].length,
      gegnerAnzahl: sp.decks[gegner].length, mitteGroesse: sp.mitte.length, letzteRunde: sp.letzteRunde
    };
  }

  function formatWert(sid, key, wert) {
    const info = wertInfo(sid, key);
    let text;
    if (info.format === 'jahr') text = String(wert);
    else if (info.nachkomma) text = wert.toLocaleString('de-DE', { minimumFractionDigits: info.nachkomma, maximumFractionDigits: info.nachkomma });
    else text = wert.toLocaleString('de-DE');
    return info.einheit ? text + ' ' + info.einheit : text;
  }

  return {
    MAX_RUNDEN, setzeSaetze, satzListe, satz, auto, alleIds, werte, wertInfo, vergleiche, platz, mische, neuesSpiel,
    andere, obersteKarte, spieleRunde, aufgeben, computerWahl, besterWert, standFuerRolle, formatWert
  };
});
