// VOLLDAMPF: Spiellogik ohne DOM (läuft auch in Node für die Balance-Simulation tests/volldampf_sim.js).
// Wie FarmModell zeitstempel-basiert: simuliere(jetzt) rechnet ereignisgenau weiter – Züge fahren auch, während die
// App zu ist, bis die Kohle im Bunker alle ist (das ist die natürliche Obergrenze fürs Weg-sein).
//
// Zeit: 1 echte Sekunde = 1 Bahn-Minute. Fahrzeit = km / kmh Stunden Bahnzeit -> km / kmh * 60 000 ms echt.
// Geld: intern „Taler“-Einheiten, angezeigt als Euro (1 Einheit = 1000 €, siehe geld()). Energie (S.kohle): Verbrauch je km. Goldtickets: nur fürs Lernen (+1 je Lernrunde, +1 mehr bei alles richtig)
// und für jedes neu erreichte Bundesland (+2). Volldampf: gespeicherte Minuten; „Volldampf geben“ macht alle Züge und
// Baustellen doppelt so schnell.
const VolldampfModell = (function () {
  const D = typeof VolldampfDaten !== 'undefined' ? VolldampfDaten : require('./volldampf-daten.js');
  const K = typeof VolldampfKarte !== 'undefined' ? VolldampfKarte : require('./volldampf-karte.js');
  const SPEICHER = 'maxlernt_volldampf_v1';

  // ---------------------------------------------------------------- Spielwerte (Balance: tests/volldampf_sim.js)
  const W = {
    STARTTALER: 1500, STARTKOHLE: 300,   // kein Geschenk-Zug: Max kauft seinen ersten Zug selbst
    HALT_MS: 8000,                    // 8 Bahn-Minuten Halt
    FAHR_GRUND: 1.0, FAHRPREIS: 0.3,  // Fahrkarte: Grundpreis + 0,3 * Wurzel(km) – lange Fahrten lohnen, aber nicht maßlos
    WARE_FAKTOR: 0.35,                // Ware: menge * (1 + km/100) * wert * Faktor
    KOHLE_PREIS: 0.5, ZECHE_RABATT: 0.7,         // jede angebundene Kohlestadt: Kohle 30 % billiger
    AUTO_KOHLE: 0.6,                             // solange Max spielt: Bunker unter 60 % -> automatisch nachkaufen
    BUNKER: [250, 600, 1500, 3000, 6000, 12000], BUNKER_PREIS: [0, 1500, 5000, 12000, 25000, 50000],
    BAUTRUPP_PREIS: [0, 3000, 15000],
    STRECKE_BASIS: 120, STRECKE_KM: 22, STRECKE_NETZ: 0.08, STRECKE_NETZ2: 0.003,    // jede gebaute Strecke macht die nächste teurer (quadratisch: Anfang flüssig, großes Netz kostet; Ziel 16 Länder nach 4–6 Wochen)
    BAU_BASIS_MS: 15000, BAU_KM_MS: 2500,        // Bauzeit
    BAU_ERST_MS: 12000,                          // die geschenkte erste Strecke ist schnell fertig (Einführung)
    BAHNHOF_PREIS: [0, 1200, 6000, 20000], BAHNHOF_FAKTOR: [1, 1, 1.4, 1.8],
    XP_STADT: 6, XP_LAND: 20, XP_KM: 1 / 500, LEVEL_MAX: 30,
    VERKAUF: 0.5,                                // Lok verkaufen: halber Preis zurück
    WERK_PREIS: { kessel: 0.35, wagen: 0.3 },    // Anteil vom Lokpreis je Stufe (Dampflokwerk Meiningen)
    LERN_KOHLE: [0.15, 0.4],   // Anteil der Bunkergröße je Lernrunde (darf über den Bunker hinaus)
    LERN_VOLLDAMPF_MIN: [4, 12], LAND_GOLD: 2,
    LERN_GOLD_TAG: 3,                            // höchstens so viele Goldtickets am Tag fürs Lernen (Uli 19.11.: viele Lernstapel = zu viele Tickets)
    AUFTRAEGE: 3,
    BW_PLAETZE: 2, STELLWERK_HALT: 0.5, GASTSTAETTE: 1.25, GUETERHALLE: 2,   // Gebäude (D.GEBAEUDE)
    BAHN_TALER: 100, BAHN_KM: 3, BAHN_XP: 3, BAHN_GOLD_AB: 3,   // Streckenalbum: Bonus für eine komplette echte Bahnstrecke (Gold ab 3 Abschnitten)
    GLEICHGEWICHT: 1.15,                         // Personen- und Güterzüge im Gleichgewicht (1:1 bis 3:1): 15 % mehr Einnahmen
    KAP_EIN: 2, KAP_ZWEI: 4,                     // so viele Züge passen auf einen Abschnitt: eingleisig / zweigleisig
    GLEIS2_LEVEL: 3, GLEIS2_BASIS: 300, GLEIS2_KM: 18,   // zweites Gleis nachrüsten
    NOSTALGIE: 1.6,                              // Dampf-Sonderfahrt: Fahrkarten bringen 60 % mehr (Ausflügler zahlen gern)
    TAUFE_GOLD: 1,                               // Zug taufen (Name einer angeschlossenen Stadt / eines erschlossenen Landes)
    KARTE_PASST: 1.3,                            // Linienkarte mit dem Zug des Vorbilds: 30 % mehr Geld (+ 1 Goldticket)
    OL_LEVEL: 5, OL_BASIS: 300, OL_KM: 15,       // Oberleitung nachrüsten (Strecken ohne echte Oberleitung)
    FARBEN: 10                                   // Linienfarben auf der Karte (Index in VolldampfAnsicht.FARBEN)
  };
  // Fahrgäste je Minute an einem Bahnhof
  function paxRate(c) { const s = D.STADT[c]; return (1.5 + Math.sqrt(s.einw / 1000) * 0.9) * (s.tourist ? 1.4 : 1); }
  function wareRate(c) { const s = D.STADT[c]; return s.ware ? 3 + Math.sqrt(s.einw / 1000) * 0.25 : 0; }
  // Level: benötigte Gesamt-XP für Level L
  function xpFuer(L) { return L <= 1 ? 0 : Math.round(20 * Math.pow(L - 1, 1.8)); }
  /** Plätze im Lokschuppen: wächst mit der Stufe */
  function maxLoks(level) { return 1 + Math.ceil(level / 2); }

  /** Geld für die Anzeige: 1 Spiel-Einheit = 1000 €; ab 1 Mio. kurz („2,77 Mio. €“) */
  const EURO = 1000;
  function geld(n) {
    const e = Math.round(n * EURO), b = Math.abs(e);
    if (b >= 1e6) { const m = e / 1e6; return m.toLocaleString('de-DE', { maximumFractionDigits: Math.abs(m) >= 100 ? 0 : Math.abs(m) >= 10 ? 1 : 2 }) + ' Mio. €'; }
    return e.toLocaleString('de-DE') + ' €';
  }
  const fehlt = preis => 'Dafür fehlen noch ' + geld(preis - Math.floor(S.taler)) + '.';

  let S = null;
  const hoerer = [];
  function ereignis(art, daten) { hoerer.forEach(f => { try { f(art, daten || {}); } catch (e) { /* Anzeige darf Logik nie stören */ } }); }
  function beiEreignis(fn) { hoerer.push(fn); }

  // ---------------------------------------------------------------- Hilfen
  const schl = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  const KANTE = {};      // 'a|b' -> km
  const KINFO = {};      // 'a|b' -> { km, strom (echte Oberleitung heute), name (Bahnstrecke), info }
  const NACH = {};       // id -> [{ n, km }]
  D.STAEDTE.forEach(s => { NACH[s.id] = []; });
  K.kanten.forEach(k => {
    const id = schl(k[0], k[1]);
    KANTE[id] = k[2]; KINFO[id] = { km: k[2], strom: !!k[3], name: k[4] || '', info: k[5] || '' };
    NACH[k[0]].push({ n: k[1], km: k[2] }); NACH[k[1]].push({ n: k[0], km: k[2] });
  });
  function kante(a, b) { return KINFO[schl(a, b)] || null; }
  // Streckenalbum: Abschnitte mit demselben Namen bilden eine echte Bahnstrecke (z. B. Thüringer Bahn = 5 Abschnitte).
  // Wege über mehrere Strecken („über Hamm“) sind je ein eigener Eintrag „A – B“.
  const BAHNEN = [], BAHN = {}, BAHN_VON = {};
  K.kanten.forEach(k => {
    const viaWeg = /^über /.test(k[4] || '');
    const bid = viaWeg ? schl(k[0], k[1]) : k[4];
    if (!BAHN[bid]) { BAHN[bid] = { id: bid, name: viaWeg ? D.STADT[k[0]].name + ' – ' + D.STADT[k[1]].name : k[4], unter: viaWeg ? k[4] : '', teile: [], km: 0, infos: [] }; BAHNEN.push(BAHN[bid]); }
    const B = BAHN[bid];
    B.teile.push({ a: k[0], b: k[1], km: k[2] }); B.km += k[2]; if (k[5] && !/^Über [^–]{1,40}\.$/.test(k[5])) B.infos.push(k[5]);   // reine Wegangaben („Über Naumburg.“) gehören zum Abschnitt, nicht ins Album
    BAHN_VON[schl(k[0], k[1])] = bid;
  });
  /** Stand einer Bahnstrecke im Album: { id, name, unter, teile:[{a,b,km,fertig}], fertig, anzahl, komplett, km, infos, bonus } */
  function bahn(bid) {
    const B = BAHN[bid]; if (!B) return null;
    const teile = B.teile.map(t => ({ a: t.a, b: t.b, km: t.km, fertig: streckeFertig(t.a, t.b) }));
    const fertig = teile.filter(t => t.fertig).length;
    return { id: B.id, name: B.name, unter: B.unter, teile, fertig, anzahl: teile.length, komplett: !!S.album.bahnen[bid], km: B.km, infos: B.infos, bonus: bahnBonus(B) };
  }
  function bahnVon(a, b) { const bid = BAHN_VON[schl(a, b)]; return bid ? bahn(bid) : null; }
  function bahnen() { return BAHNEN.map(B => bahn(B.id)); }
  // Geld nur für Strecken aus mehreren Abschnitten (sonst wäre jeder Bau verbilligt – Balance); einteilige zählen fürs Album + etwas Erfahrung
  function bahnBonus(B) { const n = B.teile.length; return { taler: n > 1 ? runde((W.BAHN_TALER + B.km * W.BAHN_KM) / 10) * 10 : 0, xp: n > 1 ? W.BAHN_XP * n : 1, gold: n >= W.BAHN_GOLD_AB ? 1 : 0 }; }
  function pruefeBahn(a, b, t, still) {
    const bid = BAHN_VON[schl(a, b)], B = BAHN[bid];
    if (!B || S.album.bahnen[bid] || !B.teile.every(x => streckeFertig(x.a, x.b))) return;
    S.album.bahnen[bid] = 1;
    if (still) return;
    const bo = bahnBonus(B);
    S.taler += bo.taler; S.gold += bo.gold;
    ereignis('bahn', { id: bid, bonus: bo });
    xpPlus(bo.xp, t);
  }
  function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function zufall() { const r = mulberry(S.seed)(); S.seed = (S.seed * 1103515245 + 12345) % 2147483647; return r; }
  const runde = n => Math.round(n);
  function heute(ts) { const d = new Date(ts); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  // ---------------------------------------------------------------- Spielstand
  function neu(jetzt, heimat) {
    if (!D.STADT[heimat]) heimat = 'erfurt';
    S = {
      v: 1, erstellt: jetzt, zeit: jetzt, heimat, seed: (Math.floor(jetzt / 1000) % 100003) + 7,
      taler: W.STARTTALER, kohle: W.STARTKOHLE, gold: 0, xp: 0, xpRest: 0, level: 1,
      volldampf: { vorrat: 0, bis: 0 }, bunker: 0, bautrupps: 1,
      strecken: {}, bahnhoefe: {}, loks: [], nextUid: 1,
      auftraege: [], nextAid: 1, laender: {}, album: { loks: {}, waren: {}, staedte: {}, laender: {}, bahnen: {} }, karten: { aktiv: null, fertig: {}, dreh: 0 },
      statistik: { fahrten: 0, km: 0, taler: 0, fahrgaeste: 0, kisten: 0, kohle: 0, auftraege: 0 },
      lern: { datum: '', ids: {} }, hilfe: {}, ton: true, freiStrecke: 1, projekte: { stand: {}, fertig: {}, bau: null },
      neuGesehen: D.NEUERUNGEN.length ? D.NEUERUNGEN[D.NEUERUNGEN.length - 1].id : ''   // neue Spieler: Einführung statt Neuigkeiten
    };
    bahnhofAnlegen(heimat, jetzt);
    landErreicht(D.STADT[heimat].land, jetzt, true);
    auftraegeAuffuellen(jetzt);
    return S;
  }
  function speichern() { return JSON.stringify(S); }
  function laden(text, jetzt) {
    let raw = null;
    try { raw = JSON.parse(text); } catch (e) { raw = null; }
    if (!raw || raw.v !== 1) return null;
    S = raw;
    if (!S.hilfe) S.hilfe = {};
    if (!S.album.bahnen) S.album.bahnen = {};
    kartenStand(); projStand();
    if (S.projekte.bau && !D.PROJEKT[S.projekte.bau.id]) S.projekte.bau = null;
    if (S.karten.aktiv && !D.LINIE[S.karten.aktiv]) S.karten.aktiv = null;
    S.loks = S.loks.filter(l => D.LOK[l.id]);
    S.loks.forEach(l => { if (l.f == null) l.f = freieFarbe(); });
    Object.keys(S.bahnhoefe).forEach(c => { if (!S.bahnhoefe[c].geb) S.bahnhoefe[c].geb = {}; });
    // Karte geändert (neue Städte, z. B. Zella-Mehlis/Altenburg): Strecken, die es im Gleisnetz nicht mehr gibt, abbauen und
    // erstatten; Züge, deren Linie darüber lief, ins Depot
    Object.keys(S.strecken).forEach(k => {
      if (KANTE[k] != null) return;
      const st = S.strecken[k], A = D.STADT[st.a], B = D.STADT[st.b];
      if (A && B) S.taler += W.STRECKE_BASIS + luftKm(A, B) * W.STRECKE_KM;
      delete S.strecken[k];
    });
    Object.keys(S.strecken).forEach(k => { const st = S.strecken[k]; if (st.fertig) pruefeBahn(st.a, st.b, 0, true); });
    // Oberleitung gehört jetzt zur Strecke (früher: ein Umspannwerk am Bahnhof elektrifizierte alle Strecken dort).
    // Wer eins gebaut hat, behält den Strom auf den Strecken daran.
    Object.keys(S.bahnhoefe).forEach(c => {
      const g = S.bahnhoefe[c].geb;
      if (!g.umspannwerk) return;
      Object.keys(S.strecken).forEach(k => { const s = S.strecken[k]; if (s.a === c || s.b === c) s.ol = true; });
      delete g.umspannwerk;
    });
    // Dampfloks fahren nur noch Sonderfahrten: alte Linien enden, die Lok wartet im Schuppen
    S.loks.forEach(l => { if (l.linie && istDampf(l) && !l.linie.sonder && !(l.linie.karte && D.LINIE[l.linie.karte] && D.LINIE[l.linie.karte].dampf)) { l.linie = null; l.fahrt = null; l.status = 'depot'; l.halt = 0; } });
    S.loks.forEach(l => {
      if (l.linie && l.linie.weg.some((c, i) => i > 0 && KANTE[schl(l.linie.weg[i - 1], c)] == null)) { l.linie = null; l.fahrt = null; l.status = 'depot'; l.halt = 0; }
      // E-Zug auf einer Linie, der jetzt die Oberleitung fehlt (Strecke war früher über ein Umspannwerk elektrifiziert): ins Depot
      else if (l.linie && D.LOK[l.id].antrieb === 'elektro' && l.linie.weg.some((c, i) => i > 0 && !strom(l.linie.weg[i - 1], c))) { l.linie = null; l.fahrt = null; l.status = 'depot'; l.halt = 0; }
    });
    if (jetzt != null) simuliere(jetzt);
    return S;
  }
  function zustand() { return S; }
  function luftKm(a, b) {
    const r = Math.PI / 180, h = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  }

  function lokNeu(id) {
    S.album.loks[id] = 1;
    return { uid: S.nextUid++, id, f: freieFarbe(), linie: null, fahrt: null, halt: 0, status: 'depot', kessel: 0, wagen: 0, stat: { fahrten: 0, km: 0, taler: 0 } };
  }
  /** Linienfarbe für einen neuen Zug: die am seltensten benutzte (bei Gleichstand die erste) */
  function freieFarbe() {
    const n = []; for (let i = 0; i < W.FARBEN; i++) n.push(0);
    S.loks.forEach(l => { if (l.f != null) n[l.f % W.FARBEN]++; });
    return n.indexOf(Math.min.apply(null, n));
  }
  /** Plätze im Fuhrpark: wachsen mit der Stufe und mit jedem Betriebswerk */
  function fuhrpark() { return maxLoks(S.level) + W.BW_PLAETZE * gebaeudeZahl('betriebswerk') + projektPlaetze(); }
  function lokWerte(lok) {
    const L = D.LOK[lok.id];
    return { kmh: L.kmh * (1 + 0.15 * (lok.kessel || 0)), plaetze: runde(L.plaetze * (1 + 0.25 * (lok.wagen || 0))),
      ladung: runde(L.ladung * (1 + 0.25 * (lok.wagen || 0))), kohle: L.kohle };
  }
  function bunkerGroesse() { return W.BUNKER[S.bunker]; }

  // ---------------------------------------------------------------- Netz
  function streckeFertig(a, b) { const s = S.strecken[schl(a, b)]; return !!(s && s.fertig); }
  function angebunden(c) { return !!S.bahnhoefe[c]; }
  function bahnhofAnlegen(c, jetzt) {
    if (S.bahnhoefe[c]) return;
    S.bahnhoefe[c] = { stufe: 1, wartend: paxRate(c) * 3, lager: wareRate(c) * 3, geb: {} };
    S.album.staedte[c] = 1;
    if (D.STADT[c].ware) S.album.waren[D.STADT[c].ware] = 1;
    if (c !== S.heimat) { ereignis('stadt', { stadt: c }); xpPlus(W.XP_STADT, jetzt); }
    landErreicht(D.STADT[c].land, jetzt, c === S.heimat);   // das Heimatland ist kein „neues“ Land
  }
  function landErreicht(land, jetzt, still) {
    if (S.laender[land]) return;
    S.laender[land] = jetzt;
    S.album.laender[land] = 1;
    if (!still) { S.gold += W.LAND_GOLD; ereignis('land', { land, gold: W.LAND_GOLD }); xpPlus(W.XP_LAND, jetzt); }
  }
  function streckenPreis(a, b) {
    const km = KANTE[schl(a, b)], n = Object.keys(S.strecken).length;
    return runde((W.STRECKE_BASIS + km * W.STRECKE_KM) * (1 + W.STRECKE_NETZ * n + W.STRECKE_NETZ2 * n * n) / 10) * 10;
  }
  function bauDauer(a, b) { const km = KANTE[schl(a, b)]; return W.BAU_BASIS_MS + km * W.BAU_KM_MS; }
  function baustellen() { return Object.keys(S.strecken).filter(k => !S.strecken[k].fertig); }
  /** Strecken, die Max jetzt bauen kann: ein Ende hängt am Netz (Bahnhof), noch nicht gebaut. */
  function baubar() {
    const r = [];
    K.kanten.forEach(k => {
      const id = schl(k[0], k[1]);
      if (S.strecken[id]) return;
      if (angebunden(k[0]) || angebunden(k[1])) r.push({ id, a: k[0], b: k[1], km: k[2], strom: !!k[3], name: k[4] || '', info: k[5] || '', preis: S.freiStrecke > 0 ? 0 : streckenPreis(k[0], k[1]), dauer: bauDauer(k[0], k[1]) });
    });
    return r;
  }
  function baue(a, b, jetzt) {
    simuliere(jetzt);
    const id = schl(a, b);
    if (KANTE[id] == null) return { ok: false, grund: 'Hier kann keine Strecke gebaut werden.' };
    if (S.strecken[id]) return { ok: false, grund: 'Die Strecke gibt es schon.' };
    if (!angebunden(a) && !angebunden(b)) return { ok: false, grund: 'Die Strecke muss an dein Netz anschließen.' };
    if (baustellen().length >= S.bautrupps) return { ok: false, grund: 'Alle Bautrupps sind beschäftigt.' };
    const frei = S.freiStrecke > 0;
    const preis = frei ? 0 : streckenPreis(a, b);
    if (S.taler < preis) return { ok: false, grund: fehlt(preis) };
    // ohne Zug kein Einkommen: Geld für den billigsten Zug muss übrig bleiben
    if (preis > 0 && zugReserve() > 0 && S.taler - preis < zugReserve()) return { ok: false, zugZuerst: true, grund: 'Kauf zuerst einen Zug. Ohne Zug verdienst du kein Geld – nach dem Bau wäre keiner mehr bezahlbar.' };
    S.taler -= preis;
    if (frei) S.freiStrecke--;
    let dauer = bauDauer(a, b);
    if (frei) dauer = Math.min(dauer, W.BAU_ERST_MS);
    const boost = Math.max(0, S.volldampf.bis - jetzt);
    dauer -= Math.min(boost, dauer / 2);
    S.strecken[id] = { a, b, fertig: false, start: jetzt, ende: jetzt + dauer };
    ereignis('baustart', { id, a, b });
    return { ok: true, id, ende: S.strecken[id].ende, preis };
  }
  /** Solange Max keinen Zug von heute hat: so viel Geld muss für den billigsten übrig bleiben (sonst 0) */
  function zugReserve() {
    if (S.loks.some(l => !istDampf(l))) return 0;
    const p = D.LOKS.filter(L => !L.gold && L.level <= S.level).map(L => L.preis);
    return p.length ? Math.min.apply(null, p) : 0;
  }
  // ---- Streckenkapazität: Auf einen Abschnitt passen nur wenige Züge (eingleisig 2, zweigleisig 4). Hauptstrecken mit
  // Oberleitung sind im Spiel von Anfang an zweigleisig, alle anderen kann Max ausbauen.
  function zweigleisig(a, b) { const id = schl(a, b), st = S.strecken[id]; return !!(KINFO[id] && (KINFO[id].strom || (st && st.gleis2))); }
  function kapazitaet(a, b) { return zweigleisig(a, b) ? W.KAP_ZWEI : W.KAP_EIN; }
  /** Züge, deren Linie über den Abschnitt führt (ohne den Zug `ausser`) */
  function auslastung(a, b, ausser) {
    const id = schl(a, b); let n = 0;
    // Dampfloks zählen nicht: Sonderzüge fahren in den Lücken des Fahrplans
    S.loks.forEach(l => { if (l.uid !== ausser && !istDampf(l) && l.linie && l.linie.weg.some((c, i) => i > 0 && schl(l.linie.weg[i - 1], c) === id)) n++; });
    return n;
  }
  /** erster voller Abschnitt auf einem Weg (für den Zug uid) oder null */
  function vollAuf(wegListe, uid) {
    for (let i = 1; i < wegListe.length; i++) { const a = wegListe[i - 1], b = wegListe[i]; if (auslastung(a, b, uid) >= kapazitaet(a, b)) return { a, b }; }
    return null;
  }
  const vollText = v => 'Zwischen ' + D.STADT[v.a].name + ' und ' + D.STADT[v.b].name + ' ist kein Platz mehr: Dort fahren schon ' + kapazitaet(v.a, v.b) + ' Züge. ' +
    (zweigleisig(v.a, v.b) ? 'Schick einen anderen Zug woandershin.' : 'Bau ein zweites Gleis (Strecke antippen) oder schick einen Zug woandershin.');
  function gleis2Preis(a, b) { const km = KANTE[schl(a, b)]; return runde((W.GLEIS2_BASIS + km * W.GLEIS2_KM) / 10) * 10; }
  function gleis2Baubar(a, b) {
    const st = S.strecken[schl(a, b)];
    if (!st || !st.fertig) return { ok: false, grund: 'Die Strecke ist noch nicht fertig.' };
    if (zweigleisig(a, b)) return { ok: false, steht: true, grund: 'Hier liegen schon zwei Gleise.' };
    const preis = gleis2Preis(a, b);
    if (S.level < W.GLEIS2_LEVEL) return { ok: false, grund: 'Ab Stufe ' + W.GLEIS2_LEVEL, preis };
    if (S.taler < preis) return { ok: false, grund: fehlt(preis), preis };
    return { ok: true, preis };
  }
  function gleis2Bauen(a, b, jetzt) {
    simuliere(jetzt);
    const k = gleis2Baubar(a, b);
    if (!k.ok) return k;
    S.taler -= k.preis; S.strecken[schl(a, b)].gleis2 = true;
    ereignis('gleis2', { a, b });
    return { ok: true, preis: k.preis };
  }
  /** Mischung im Betrieb: Züge von heute mit Linie, geteilt in Personen- und Güterzüge (Güterzug = fährt nur Kisten).
   *  Ausgewogen = mindestens ein Güterzug je drei Personenzüge und nicht mehr Güter- als Personenzüge. */
  function betrieb() {
    let personen = 0, gueter = 0;
    S.loks.forEach(l => { if (!l.linie || istDampf(l)) return; const L = D.LOK[l.id]; if (L.ladung > 0 && !L.plaetze) gueter++; else personen++; });
    const ausgewogen = personen >= 1 && gueter >= 1 && gueter * 3 >= personen && gueter <= personen;
    return { personen, gueter, ausgewogen, fehlt: ausgewogen ? null : (gueter * 3 < personen || !gueter) && personen ? 'gueter' : 'personen', bonus: W.GLEICHGEWICHT };
  }
  function sofortFertig(id, jetzt) {
    simuliere(jetzt);
    const s = S.strecken[id];
    if (!s || s.fertig) return { ok: false };
    if (S.gold < 1) return { ok: false, grund: 'Du brauchst ein Goldticket.' };
    S.gold--; s.ende = jetzt; simuliere(jetzt);
    return { ok: true };
  }
  function streckeVollenden(s, t) {
    s.fertig = true; delete s.start; s.zeit = t;
    [s.a, s.b].forEach(c => bahnhofAnlegen(c, t));
    ereignis('gebaut', { a: s.a, b: s.b, km: KANTE[schl(s.a, s.b)] });
    pruefeBahn(s.a, s.b, t);
    pruefeAuftraege(t);
  }

  /** Oberleitung: wie in echt (Kartendaten) oder von Max nachgerüstet */
  function strom(a, b) { const id = schl(a, b), s = S.strecken[id]; return !!(KINFO[id] && (KINFO[id].strom || (s && s.ol))); }
  function oberleitungPreis(a, b) { const km = KANTE[schl(a, b)]; return runde((W.OL_BASIS + km * W.OL_KM) / 10) * 10; }
  /** Oberleitung nachrüsten: nur fertige Strecken ohne Strom, ab Stufe W.OL_LEVEL */
  function oberleitungBaubar(a, b) {
    const s = S.strecken[schl(a, b)];
    if (!s || !s.fertig) return { ok: false, grund: 'Die Strecke ist noch nicht fertig.' };
    if (strom(a, b)) return { ok: false, steht: true, grund: 'Hier hängt schon eine Oberleitung.' };
    const preis = oberleitungPreis(a, b);
    if (S.level < W.OL_LEVEL) return { ok: false, grund: 'Ab Stufe ' + W.OL_LEVEL, preis };
    if (S.taler < preis) return { ok: false, grund: fehlt(preis), preis };
    return { ok: true, preis };
  }
  function oberleitungBauen(a, b, jetzt) {
    simuliere(jetzt);
    const k = oberleitungBaubar(a, b);
    if (!k.ok) return k;
    S.taler -= k.preis;
    S.strecken[schl(a, b)].ol = true;
    ereignis('oberleitung', { a, b });
    pruefeAuftraege(jetzt);
    return { ok: true, preis: k.preis };
  }
  /** Kürzester Weg über fertige Strecken (Dijkstra nach km). nurStrom: nur Strecken mit Oberleitung.
   *  fuer (uid): nur Abschnitte, auf denen für diesen Zug noch Platz ist. -> { weg:[ids], km } oder null */
  function weg(von, nach, nurStrom, fuer) {
    if (von === nach || !angebunden(von) || !angebunden(nach)) return null;
    const dist = {}, vor = {}, offen = new Set([von]);
    dist[von] = 0;
    while (offen.size) {
      let c = null;
      offen.forEach(x => { if (c === null || dist[x] < dist[c]) c = x; });
      offen.delete(c);
      if (c === nach) break;
      NACH[c].forEach(({ n, km }) => {
        if (!streckeFertig(c, n) || (nurStrom && !strom(c, n)) || (fuer != null && auslastung(c, n, fuer) >= kapazitaet(c, n))) return;
        const d = dist[c] + km;
        if (dist[n] == null || d < dist[n]) { dist[n] = d; vor[n] = c; offen.add(n); }
      });
    }
    if (dist[nach] == null) return null;
    const w = [nach];
    while (w[0] !== von) w.unshift(vor[w[0]]);
    return { weg: w, km: dist[nach] };
  }

  // ---------------------------------------------------------------- Loks & Linien
  function kaufePreis(id) { return D.LOK[id].preis; }
  const istDampf = l => D.LOK[l.id].antrieb === 'dampf';
  /** belegte Plätze im Fuhrpark: Dampfloks stehen im eigenen Lokschuppen und zählen nicht */
  function belegt() { return S.loks.filter(l => !istDampf(l)).length; }
  function kaufbar(id) {
    const L = D.LOK[id];
    if (!L) return { ok: false, grund: '?' };
    if (S.level < L.level) return { ok: false, grund: 'Ab Stufe ' + L.level };
    if (L.gold && S.loks.some(l => l.id === id)) return { ok: false, grund: 'Diese Dampflok hast du schon.', einmal: true };   // jede Goldlok gibt es nur einmal
    if (L.antrieb !== 'dampf' && belegt() >= fuhrpark()) return { ok: false, grund: 'Der Fuhrpark ist voll. Mehr Platz gibt es mit der nächsten Stufe, mit einem Betriebswerk – oder verkaufe einen Zug.', voll: true };
    if (L.gold && S.gold < L.gold) return { ok: false, grund: 'Dafür brauchst du ' + L.gold + ' Goldtickets.' };
    if (S.taler < L.preis) return { ok: false, grund: fehlt(L.preis) };
    return { ok: true };
  }
  function kaufeLok(id, jetzt) {
    simuliere(jetzt);
    const k = kaufbar(id);
    if (!k.ok) return k;
    const L = D.LOK[id];
    S.taler -= L.preis;
    if (L.gold) S.gold -= L.gold;
    const neuLok = !S.album.loks[id];
    const lok = lokNeu(id);
    S.loks.push(lok);
    ereignis('lok', { uid: lok.uid, id, neu: neuLok });
    return { ok: true, uid: lok.uid };
  }
  function lok(uid) { return S.loks.find(l => l.uid === uid) || null; }
  function verkaufPreis(l) { const L = D.LOK[l.id]; return L.gold ? 0 : runde(L.preis * W.VERKAUF / 10) * 10; }
  function verkaufeLok(uid, jetzt) {
    simuliere(jetzt);
    const l = lok(uid);
    if (!l) return { ok: false };
    if (D.LOK[l.id].gold) return { ok: false, grund: 'Dampfloks bleiben für immer in deiner Sammlung.' };
    if (S.loks.length <= 1) return { ok: false, grund: 'Deinen letzten Zug behältst du.' };
    const preis = verkaufPreis(l);
    S.taler += preis;
    S.loks.splice(S.loks.indexOf(l), 1);
    ereignis('verkauft', { uid, id: l.id, preis });
    return { ok: true, preis };
  }
  function setzeLinie(uid, von, nach, jetzt) {
    simuliere(jetzt);
    const l = lok(uid);
    if (!l) return { ok: false, grund: '?' };
    if (istDampf(l)) return { ok: false, dampf: true, grund: 'Dampfloks fahren heute nur noch Sonderfahrten. Öffne den Zug und wähle eine Sonderfahrt.' };
    const elektro = D.LOK[l.id].antrieb === 'elektro';
    const w = weg(von, nach, elektro, uid);
    if (!w) { const ohne = weg(von, nach, elektro); if (ohne) { const v = vollAuf(ohne.weg, uid); return { ok: false, voll: v, grund: vollText(v) }; } }
    if (!w) return weg(von, nach) ? { ok: false, strom: true, grund: 'Auf diesem Weg fehlt die Oberleitung. Tippe auf die Strecke ohne Oberleitung und rüste sie nach' + (S.level < W.OL_LEVEL ? ' (ab Stufe ' + W.OL_LEVEL + ').' : '.') }
      : { ok: false, grund: 'Zwischen diesen Bahnhöfen gibt es noch keine fertige Strecke.' };
    if (w.km * lokWerte(l).kohle / 100 > bunkerGroesse()) return { ok: false, grund: 'So weit reicht dein Energielager nicht. Baue es aus!' };
    l.linie = { von, nach, weg: w.weg, km: w.km };
    l.fahrt = null; l.ort = von; l.status = 'halt'; l.halt = jetzt + 1500;
    ereignis('linie', { uid, von, nach });
    pruefeAuftraege(jetzt);
    return { ok: true, km: w.km };
  }
  /** Nur prüfen, warum eine Linie nicht geht (für den Hinweis beim Linienwählen) – ändert nichts */
  function setzeLinieProbe(uid, von, nach) {
    const l = lok(uid); if (!l) return null;
    const elektro = D.LOK[l.id].antrieb === 'elektro';
    if (weg(von, nach, elektro, uid)) return { ok: true };
    const ohne = weg(von, nach, elektro);
    if (ohne) { const v = vollAuf(ohne.weg, uid); return { ok: false, voll: v, grund: vollText(v) }; }
    return { ok: false };
  }
  function insDepot(uid, jetzt) {
    simuliere(jetzt);
    const l = lok(uid);
    if (!l) return;
    l.linie = null; l.fahrt = null; l.status = 'depot'; l.halt = 0;
  }
  /** Fahrzeit in echten ms. Mit weg (Stadt-ids) und ohne Dampf: Abschnitte ausgebauter Schnellfahrstrecken (Großprojekt) zählen kürzer. */
  function fahrzeitMs(km, kmh, weg, dampf) {
    if (weg && !dampf && weg.length > 1) {
      let roh = 0, eff = 0;
      for (let i = 1; i < weg.length; i++) { const k = KANTE[schl(weg[i - 1], weg[i])] || 0; roh += k; eff += k / tempo(weg[i - 1], weg[i]); }
      if (roh > 0 && eff < roh) km = km * eff / roh;
    }
    return km / kmh * 60000;
  }
  /** Bonus der Museumsloks (Harz, Rügen, Nürnberg …) */
  function lokBonus(l, a, b) {
    const L = D.LOK[l.id];
    if (!L.bonus) return 1;
    return (L.bonus.staedte.indexOf(a) >= 0 || L.bonus.staedte.indexOf(b) >= 0) ? L.bonus.faktor : 1;
  }

  // Abfahrt in a (Richtung b): Fahrgäste/Ware einladen, Kohle abziehen. false = Kohle reicht nicht.
  function abfahren(l, t) {
    const lin = l.linie;
    const von = l.ort, nach = von === lin.von ? lin.nach : lin.von;
    const w = lokWerte(l);
    const bedarf = lin.km * w.kohle / 100;
    // Notration: Kasse und Energielager leer -> einmal am Tag reicht es für ein paar Fahrten, damit das Spiel nie ganz stillsteht
    if (S.kohle + 1e-9 < bedarf && S.taler < bedarf * kohlePreis() && S.notTag !== heute(t)) { S.notTag = heute(t); S.kohle += Math.min(bunkerGroesse(), bedarf * 6); ereignis('notration', {}); }
    if (S.kohle + 1e-9 < bedarf) { if (l.status !== 'kohle') { l.status = 'kohle'; ereignis('kohleLeer', { uid: l.uid }); } return false; }
    S.kohle -= bedarf; S.statistik.kohle += bedarf;
    const bf = S.bahnhoefe[von];
    const pax = Math.floor(Math.min(w.plaetze, bf.wartend));
    bf.wartend -= pax;
    const ware = D.STADT[von].ware;
    const menge = ware ? Math.floor(Math.min(w.ladung, bf.lager)) : 0;
    if (menge) bf.lager -= menge;
    const schnell = t < S.volldampf.bis ? 2 : 1;
    const dauer = fahrzeitMs(lin.km, w.kmh, lin.weg, istDampf(l)) / schnell;
    const weg = von === lin.von ? lin.weg : lin.weg.slice().reverse();
    l.fahrt = { von, nach, weg, km: lin.km, start: t, ende: t + dauer, pax, ware: menge ? ware : null, menge, volldampf: schnell > 1 };
    l.status = 'faehrt';
    return true;
  }
  function ankommen(l, t) {
    const f = l.fahrt;
    const bonus = lokBonus(l, f.von, f.nach) * (istDampf(l) ? W.NOSTALGIE : 1);
    const mix = betrieb().ausgewogen ? W.GLEICHGEWICHT : 1;
    const gast = hatGeb(f.nach, 'gaststaette') ? W.GASTSTAETTE : 1;
    const taler = runde((f.pax * (W.FAHR_GRUND + Math.sqrt(f.km) * W.FAHRPREIS) * bonus * gast + (f.ware ? f.menge * (1 + f.km / 100) * D.WAREN[f.ware].wert * W.WARE_FAKTOR : 0)) * mix);
    S.taler += taler;
    S.xpRest = (S.xpRest || 0) + f.km * W.XP_KM;
    const xp = Math.floor(S.xpRest); S.xpRest -= xp;
    S.statistik.fahrten++; S.statistik.km += f.km; S.statistik.taler += taler; S.statistik.fahrgaeste += f.pax; S.statistik.kisten += f.menge;
    l.stat.fahrten++; l.stat.km += f.km; l.stat.taler += taler;
    l.ort = f.nach; l.fahrt = null; l.status = 'halt'; l.halt = t + haltMs(f.nach);
    ereignis('ankunft', { uid: l.uid, von: f.von, nach: f.nach, taler, pax: f.pax, ware: f.ware, menge: f.menge, km: f.km });
    karteAnkunft(l, t);
    auftragFortschritt(f, t);
    xpPlus(xp, t);
  }
  function xpPlus(n, t) {
    S.xp += n;
    while (S.level < W.LEVEL_MAX && S.xp >= xpFuer(S.level + 1)) { S.level++; ereignis('level', { level: S.level }); auftraegeAuffuellen(t); }
  }


  // ---------------------------------------------------------------- Linienkarten (D.LINIEN): echte Zuglinien als Ziel
  // Ablauf: drei Karten im Angebot -> Max nimmt eine -> baut die Abschnitte -> setzt einen Zug auf genau diesen Weg ->
  // erste Fahrt bis zum anderen Ende = Karte erfüllt. Passt der Zug zum Vorbild, gibt es mehr Geld und ein Goldticket.
  function kartenStand() { if (!S.karten) S.karten = { aktiv: null, fertig: {}, dreh: 0 }; return S.karten; }
  function kartePasst(Lk, lokId) { const L = D.LOK[lokId]; return !!L && (Lk.zuege ? Lk.zuege.indexOf(lokId) >= 0 : Lk.dampf ? L.antrieb === 'dampf' : L.antrieb === Lk.antrieb); }
  /** Darf der Zug die Linie überhaupt fahren? Sonderfahrten nur mit Dampf, alles andere nur ohne. */
  function karteErlaubt(Lk, lokId) { return (D.LOK[lokId].antrieb === 'dampf') === !!Lk.dampf; }
  function karteLevel(Lk) { return Math.min.apply(null, D.LOKS.filter(L => kartePasst(Lk, L.id)).map(L => L.level)); }
  function karteBelohnung(Lk, km) {
    const lv = 1 + (S.level - 1) * 0.18, n = Lk.halte.length - 1;
    const taler = runde((150 + km * 4 + n * 60) * lv / 10) * 10;
    return { taler, talerPasst: runde(taler * W.KARTE_PASST / 10) * 10, xp: 10 + n * 4 + Math.round(km / 12), gold: 1 };
  }
  /** Stand einer Linienkarte: Abschnitte, was fehlt, welcher Zug fährt, Belohnung */
  function karte(id) {
    const Lk = D.LINIE[id]; if (!Lk) return null;
    const ks = kartenStand(), teile = [];
    for (let i = 1; i < Lk.halte.length; i++) { const a = Lk.halte[i - 1], b = Lk.halte[i]; teile.push({ a, b, km: KANTE[schl(a, b)], fertig: streckeFertig(a, b), strom: strom(a, b) }); }
    const km = teile.reduce((n, t) => n + t.km, 0), fertig = teile.filter(t => t.fertig).length;
    const lokAuf = S.loks.find(l => l.linie && l.linie.karte === id);
    return { id, L: Lk, teile, km, fertig, anzahl: teile.length, gebaut: fertig === teile.length, aktiv: ks.aktiv === id, erfuellt: !!ks.fertig[id],
      uid: lokAuf ? lokAuf.uid : null, level: karteLevel(Lk), belohnung: karteBelohnung(Lk, km) };
  }
  /** Drei Karten zur Wahl: zuerst, was nah am Netz ist und wofür es bald einen passenden Zug gibt */
  function kartenAngebot() {
    const ks = kartenStand();
    const offen = D.LINIEN.filter(Lk => !ks.fertig[Lk.id]).map(Lk => {
      const k = karte(Lk.id), amNetz = Lk.halte.some(c => angebunden(c));
      return { id: Lk.id, wert: (k.anzahl - k.fertig) + (amNetz ? 0 : 6) + Math.max(0, k.level - S.level) * 1.5 + (Lk.dampf && !S.loks.some(istDampf) ? 3 : 0) };
    }).sort((x, y) => x.wert - y.wert);
    if (offen.length <= 3) return offen.map(o => o.id);
    const start = ks.dreh % Math.min(offen.length - 2, 4);
    return offen.slice(start, start + 3).map(o => o.id);
  }
  function karteNehmen(id) {
    const ks = kartenStand();
    if (!D.LINIE[id] || ks.fertig[id]) return { ok: false };
    karteLoesen();
    ks.aktiv = id;
    ereignis('karteGewaehlt', { id });
    return { ok: true };
  }
  function karteLoesen() { S.loks.forEach(l => { if (l.linie && l.linie.karte) delete l.linie.karte; }); }
  /** Karte zurückgeben: kostet nichts, das nächste Angebot zeigt andere Karten */
  function karteZurueck() { const ks = kartenStand(); karteLoesen(); ks.aktiv = null; ks.dreh++; ereignis('karteGewaehlt', { id: null }); return { ok: true }; }
  /** Zug auf den Weg der aktiven Karte setzen (genau die Halte der Karte, nicht der kürzeste Weg) */
  function karteFahren(uid, jetzt) {
    simuliere(jetzt);
    const ks = kartenStand(), k = ks.aktiv ? karte(ks.aktiv) : null, l = lok(uid);
    if (!k || !l) return { ok: false, grund: 'Nimm zuerst eine Linienkarte.' };
    if (!k.gebaut) return { ok: false, grund: 'Es fehlen noch ' + (k.anzahl - k.fertig) + ' Abschnitte.' };
    if (!karteErlaubt(k.L, l.id)) return { ok: false, grund: k.L.dampf ? 'Das ist eine Sonderfahrt – sie braucht eine Dampflok.' : 'Dampfloks fahren nur Sonderfahrten. Nimm einen Zug von heute.' };
    if (D.LOK[l.id].antrieb === 'elektro' && k.teile.some(t => !t.strom)) return { ok: false, strom: true, grund: 'Auf diesem Weg fehlt die Oberleitung. Nimm einen Zug ohne Stromabnehmer oder rüste die Strecke nach.' };
    if (k.km * lokWerte(l).kohle / 100 > bunkerGroesse()) return { ok: false, grund: 'So weit reicht dein Energielager nicht. Baue es aus!' };
    const kv = istDampf(l) ? null : vollAuf(k.L.halte, uid); if (kv) return { ok: false, voll: kv, grund: vollText(kv) };
    karteLoesen();
    const h = k.L.halte;
    l.linie = { von: h[0], nach: h[h.length - 1], weg: h.slice(), km: k.km, karte: k.id };
    l.fahrt = null; l.ort = h[0]; l.status = 'halt'; l.halt = jetzt + 1500;
    ereignis('linie', { uid, von: l.linie.von, nach: l.linie.nach });
    return { ok: true, passt: kartePasst(k.L, l.id) };
  }
  /** Sonderfahrten (Linien mit dampf: true): Hier dürfen Dampfloks fahren – auch ohne Linienkarte, so oft Max will. */
  function sonderfahrten() { return D.LINIEN.filter(Lk => Lk.dampf).map(Lk => karte(Lk.id)); }
  function sonderFahren(uid, id, jetzt) {
    simuliere(jetzt);
    const l = lok(uid), k = karte(id);
    if (!l || !k || !k.L.dampf) return { ok: false, grund: '?' };
    if (!istDampf(l)) return { ok: false, grund: 'Sonderfahrten sind für Dampfloks.' };
    if (!k.gebaut) return { ok: false, grund: 'Für diese Sonderfahrt fehlen noch ' + (k.anzahl - k.fertig) + ' Abschnitte.' };
    if (k.km * lokWerte(l).kohle / 100 > bunkerGroesse()) return { ok: false, grund: 'So weit reicht dein Energielager nicht. Baue es aus!' };
    const h = k.L.halte, ks = kartenStand();
    l.linie = { von: h[0], nach: h[h.length - 1], weg: h.slice(), km: k.km, sonder: id };
    if (ks.aktiv === id && !S.loks.some(x => x.linie && x.linie.karte === id)) l.linie.karte = id;
    l.fahrt = null; l.ort = h[0]; l.status = 'halt'; l.halt = jetzt + 1500;
    ereignis('linie', { uid, von: l.linie.von, nach: l.linie.nach });
    return { ok: true, passt: kartePasst(k.L, l.id) };
  }
  function karteAnkunft(l, t) {
    const ks = kartenStand(), id = l.linie && l.linie.karte;
    if (!id || id !== ks.aktiv) return;
    const k = karte(id), passt = kartePasst(k.L, l.id), bo = k.belohnung;
    const taler = passt ? bo.talerPasst : bo.taler, gold = passt ? bo.gold : 0;
    ks.fertig[id] = 1; ks.aktiv = null; delete l.linie.karte;
    S.taler += taler; S.gold += gold;
    ereignis('karte', { id, uid: l.uid, passt, taler, gold, xp: bo.xp });
    xpPlus(bo.xp, t);
  }

  // ---------------------------------------------------------------- Züge taufen (wie die Bahn ihre ICE nach Städten und Ländern benennt)
  /** Freie Taufnamen: angeschlossene Städte + erschlossene Bundesländer, jeder Name nur einmal */
  function taufNamen() {
    const benutzt = {}; S.loks.forEach(l => { if (l.name) benutzt[l.name] = 1; });
    const st = Object.keys(S.bahnhoefe).map(c => D.STADT[c]).sort((a, b) => b.einw - a.einw).map(s => s.name);
    const la = Object.keys(S.laender).map(id => D.LAENDER[id].name);
    return { staedte: st.filter(n => !benutzt[n]), laender: la.filter(n => !benutzt[n]) };
  }
  function taufe(uid, name, jetzt) {
    simuliere(jetzt);
    const l = lok(uid), n = taufNamen();
    if (!l) return { ok: false, grund: '?' };
    if (n.staedte.indexOf(name) < 0 && n.laender.indexOf(name) < 0) return { ok: false, grund: 'Diesen Namen gibt es gerade nicht.' };
    if (S.gold < W.TAUFE_GOLD) return { ok: false, grund: 'Für eine Zugtaufe brauchst du ein Goldticket.' };
    S.gold -= W.TAUFE_GOLD;
    l.name = name;
    ereignis('taufe', { uid, name });
    return { ok: true };
  }

  // ---------------------------------------------------------------- Zeit
  function zechen() { return D.STAEDTE.filter(s => s.kohle && angebunden(s.id)).length; }
  function kohlePreis() { return W.KOHLE_PREIS * Math.pow(W.ZECHE_RABATT, zechen()); }
  // Kohle fließt nie von selbst nach: Der Bunker ist die Obergrenze, wie lange Züge ohne Max fahren.
  function kohleZufluss() { return 0; }
  /** Bahnhöfe füllen sich mit Fahrgästen und Waren. */
  function zeitVergeht(dt) {
    if (dt <= 0) return;
    const min = dt / 60000;
    Object.keys(S.bahnhoefe).forEach(c => {
      const b = S.bahnhoefe[c], f = W.BAHNHOF_FAKTOR[b.stufe] * projektFaktor(c);
      const pr = paxRate(c) * f, wr = wareRate(c) * f * (hatGeb(c, 'gueterhalle') ? W.GUETERHALLE : 1);
      b.wartend = Math.min(pr * 12, b.wartend + pr * min);
      if (wr) b.lager = Math.min(wr * 20, b.lager + wr * min);
    });
  }
  function naechstesEreignis() {
    let best = null;
    Object.keys(S.strecken).forEach(k => { const s = S.strecken[k]; if (!s.fertig && (!best || s.ende < best.t)) best = { t: s.ende, art: 'bau', s }; });
    if (S.projekte && S.projekte.bau && (!best || S.projekte.bau.ende < best.t)) best = { t: S.projekte.bau.ende, art: 'projekt' };
    S.loks.forEach(l => {
      if (!l.linie) return;
      let t = Infinity;
      if (l.status === 'faehrt') t = l.fahrt.ende;
      else if (l.status === 'halt') t = l.halt;
      else if (l.status === 'kohle') {
        const bedarf = l.linie.km * lokWerte(l).kohle / 100, r = kohleZufluss();
        if (S.kohle >= bedarf) t = S.zeit;
        else if (r > 0 && bedarf <= bunkerGroesse()) t = S.zeit + (bedarf - S.kohle) / r + 1;
      }
      if (t < Infinity && (!best || t < best.t)) best = { t, art: 'lok', l };
    });
    return best;
  }
  function simuliere(jetzt) {
    if (!S) return;
    if (jetzt < S.zeit) jetzt = S.zeit;      // Uhr zurückgestellt: nichts rückwärts rechnen
    let schutz = 200000;
    for (;;) {
      const e = naechstesEreignis();
      if (!e || e.t > jetzt || --schutz < 0) break;
      const t = Math.max(e.t, S.zeit);
      zeitVergeht(t - S.zeit); S.zeit = t;
      if (e.art === 'bau') streckeVollenden(e.s, t);
      else if (e.art === 'projekt') projektWeiter(t);
      else if (e.l.status === 'faehrt') ankommen(e.l, t);
      else if (!abfahren(e.l, t) && e.l.status === 'kohle' && kohleZufluss() <= 0) { /* wartet auf Kohle */ }
    }
    zeitVergeht(jetzt - S.zeit); S.zeit = jetzt;
  }

  // ---------------------------------------------------------------- Kohle, Bunker, Bahnhöfe, Bautrupps, Werk
  function kaufeKohle(menge, jetzt) {
    simuliere(jetzt);
    const platz = Math.max(0, Math.floor(bunkerGroesse() - S.kohle));
    const preis = kohlePreis();
    menge = Math.min(menge, platz, Math.floor(S.taler / preis));
    if (menge <= 0) return { ok: false, grund: platz <= 0 ? 'Das Energielager ist voll.' : 'Dafür reicht das Geld nicht.' };
    S.taler -= menge * preis; S.kohle += menge;
    simuliere(jetzt);   // wartende Züge fahren sofort los
    return { ok: true, menge, preis: menge * preis };
  }
  /** Solange das Spiel offen ist: Bunker automatisch nachfüllen (Ansicht ruft das jede Sekunde auf). */
  function autoKohle(jetzt) {
    if (S.kohle >= bunkerGroesse() * W.AUTO_KOHLE) return null;
    const r = kaufeKohle(1e9, jetzt);
    return r.ok ? r : null;
  }
  /** Kohleverbrauch je echte Minute, wenn alle Züge fahren (für „reicht ohne dich ca. N Minuten“) */
  function kohleProMinute() {
    let v = 0;
    S.loks.forEach(l => {
      if (!l.linie) return;
      const w = lokWerte(l), fahr = fahrzeitMs(l.linie.km, w.kmh, l.linie.weg, istDampf(l));
      v += (l.linie.km * w.kohle / 100) / ((fahr + W.HALT_MS) / 60000);
    });
    return v;
  }
  function kohleReichtMinuten() { const v = kohleProMinute(); return v > 0 ? Math.floor(S.kohle / v) : null; }
  function ausbau(art, jetzt, stadt) {
    simuliere(jetzt);
    let preis, tun;
    if (art === 'bunker') {
      if (S.bunker >= W.BUNKER.length - 1) return { ok: false, grund: 'Größer geht es nicht.' };
      preis = W.BUNKER_PREIS[S.bunker + 1]; tun = () => { S.bunker++; };
    } else if (art === 'bautrupp') {
      if (S.bautrupps >= W.BAUTRUPP_PREIS.length) return { ok: false, grund: 'Mehr Bautrupps gibt es nicht.' };
      preis = W.BAUTRUPP_PREIS[S.bautrupps]; tun = () => { S.bautrupps++; };
    } else if (art === 'bahnhof') {
      const b = S.bahnhoefe[stadt];
      if (!b) return { ok: false, grund: '?' };
      if (b.stufe >= 3) return { ok: false, grund: 'Schon ein Hauptbahnhof.' };
      preis = W.BAHNHOF_PREIS[b.stufe + 1]; tun = () => { b.stufe++; };
    } else return { ok: false };
    if (S.taler < preis) return { ok: false, grund: fehlt(preis) };
    S.taler -= preis; tun();
    ereignis('ausbau', { art, stadt });
    return { ok: true, preis };
  }
  // ---------------------------------------------------------------- Gebäude am Bahnhof (D.GEBAEUDE)
  function hatGeb(c, art) { const b = S.bahnhoefe[c]; return !!(b && b.geb && b.geb[art]); }
  function gebaeudeZahl(art) { return Object.keys(S.bahnhoefe).filter(c => hatGeb(c, art)).length; }
  function haltMs(c) { return W.HALT_MS * (hatGeb(c, 'stellwerk') ? W.STELLWERK_HALT : 1); }
  /** Kann Max dieses Gebäude hier bauen? -> { ok, grund, preis, zeigen } (zeigen = in der Liste anbieten) */
  function gebaeudeBaubar(c, art) {
    const G = D.GEBAEUDE[art], b = S.bahnhoefe[c];
    if (!G || !b) return { ok: false, zeigen: false, grund: '?' };
    if (G.nurWare && !D.STADT[c].ware) return { ok: false, zeigen: false, grund: 'Hier gibt es keine Ware.' };
    if (b.geb[art]) return { ok: false, zeigen: true, steht: true, grund: 'Steht schon.' };
    const n = gebaeudeZahl(art), preis = Math.round(G.preis * Math.pow(G.steigt || 1, n));   // z. B. jedes weitere Betriebswerk kostet das Doppelte
    if (G.max && n >= G.max) return { ok: false, zeigen: true, grund: 'Du hast schon ' + G.max + ' davon.', preis, max: true };
    if (S.level < G.level) return { ok: false, zeigen: true, grund: 'Ab Stufe ' + G.level, preis };
    if (S.taler < preis) return { ok: false, zeigen: true, grund: fehlt(preis), preis };
    return { ok: true, zeigen: true, preis };
  }
  function baueGebaeude(c, art, jetzt) {
    simuliere(jetzt);
    const k = gebaeudeBaubar(c, art);
    if (!k.ok) return k;
    S.taler -= k.preis;
    S.bahnhoefe[c].geb[art] = jetzt;
    ereignis('gebaeude', { stadt: c, art });
    return { ok: true, preis: k.preis };
  }
  // ---------------------------------------------------------------- Großprojekte (D.PROJEKTE): Geld braucht ein großes Ziel
  // Drei Bauabschnitte nacheinander, immer nur eine Großbaustelle. Wirkung (Bahnhof ×2, Fuhrpark, Tempo) nach dem letzten.
  function projStand() { if (!S.projekte) S.projekte = { stand: {}, fertig: {}, bau: null }; return S.projekte; }
  function projektFertig(id) { return !!(S.projekte && S.projekte.fertig[id]); }
  const PROJ_KANTEN = {};   // Projekt-id -> Abschnitts-Schlüssel seiner Bahnstrecken
  D.PROJEKTE.forEach(P => { PROJ_KANTEN[P.id] = []; (P.bahnen || []).forEach(n => { if (BAHN[n]) BAHN[n].teile.forEach(t => PROJ_KANTEN[P.id].push(schl(t.a, t.b))); }); });
  /** So viel schneller fahren Züge auf diesem Abschnitt (fertige Schnellfahrstrecken-Projekte), sonst 1 */
  function tempo(a, b) {
    if (!S || !S.projekte) return 1;
    const id = schl(a, b); let f = 1;
    D.PROJEKTE.forEach(P => { if (P.art === 'tempo' && S.projekte.fertig[P.id] && PROJ_KANTEN[P.id].indexOf(id) >= 0) f = Math.max(f, P.faktor); });
    return f;
  }
  function projektFaktor(c) { let f = 1; D.PROJEKTE.forEach(P => { if (P.art === 'bahnhof' && P.stadt === c && projektFertig(P.id)) f *= P.faktor; }); return f; }
  function projektPlaetze() { let n = 0; D.PROJEKTE.forEach(P => { if (P.art === 'werk' && projektFertig(P.id)) n += P.plaetze; }); return n; }
  function projektVoraus(P) {
    if (P.stadt && !angebunden(P.stadt)) return { ok: false, grund: 'Verbinde zuerst ' + D.STADT[P.stadt].name + ' mit deinem Netz.', stadt: P.stadt };
    const fehlen = (P.bahnen || []).filter(n => !BAHN[n] || !BAHN[n].teile.every(t => streckeFertig(t.a, t.b)));
    if (fehlen.length) {
      const teile = []; fehlen.forEach(n => BAHN[n].teile.forEach(t => { if (!streckeFertig(t.a, t.b)) teile.push(D.STADT[t.a].name + ' – ' + D.STADT[t.b].name); }));
      return { ok: false, grund: 'Bau zuerst ' + (teile.length === 1 ? 'die Strecke ' + teile[0] : teile.length <= 3 ? 'die Strecken ' + teile.join(', ') : fehlen.map(n => 'die ' + n).join(' und ') + ' komplett (' + teile.length + ' Abschnitte fehlen)') + '.', bahnen: fehlen };
    }
    if (S.level < P.level) return { ok: false, grund: 'Ab Stufe ' + P.level, stufe: true };
    return { ok: true };
  }
  /** Stand eines Großprojekts: { id, P, n (fertige Abschnitte), anzahl, fertig, bau {start, ende} | null, offen, grund, naechster, preis } */
  function projekt(id) {
    const P = D.PROJEKT[id]; if (!P) return null;
    const ps = projStand(), n = ps.stand[id] || 0, v = projektVoraus(P), naechster = n < P.abschnitte.length ? P.abschnitte[n] : null;
    return { id, P, n, anzahl: P.abschnitte.length, fertig: !!ps.fertig[id], bau: ps.bau && ps.bau.id === id ? { start: ps.bau.start, ende: ps.bau.ende } : null,
      offen: v.ok, grund: v.grund || '', voraus: v, naechster, preis: naechster ? naechster.preis : 0 };
  }
  function projekte() { return D.PROJEKTE.map(P => projekt(P.id)); }
  function projektBaubar(id) {
    const p = projekt(id);
    if (!p) return { ok: false, grund: '?' };
    if (p.fertig) return { ok: false, steht: true, grund: 'Schon fertig.' };
    if (grossbaustelle() && projStand().bau.id === id) return { ok: false, laeuft: true, grund: 'Hier wird gerade gebaut.' };
    if (!p.offen) return { ok: false, grund: p.grund, preis: p.preis };
    if (grossbaustelle()) return { ok: false, grund: 'Es gibt nur eine Großbaustelle: Erst wird ' + D.PROJEKT[projStand().bau.id].name + ' fertig.', preis: p.preis };
    if (S.taler < p.preis) return { ok: false, grund: fehlt(p.preis), preis: p.preis };
    return { ok: true, preis: p.preis };
  }
  function grossbaustelle() { return !!projStand().bau; }
  function projektBauen(id, jetzt) {
    simuliere(jetzt);
    const k = projektBaubar(id);
    if (!k.ok) return k;
    const P = D.PROJEKT[id], n = projStand().stand[id] || 0;
    let dauer = P.abschnitte[n].min * 60000;
    dauer -= Math.min(Math.max(0, S.volldampf.bis - jetzt), dauer / 2);   // Volldampf: Bautrupps doppelt so schnell
    S.taler -= k.preis;
    projStand().bau = { id, start: jetzt, ende: jetzt + dauer };
    ereignis('projektStart', { id, abschnitt: n });
    return { ok: true, preis: k.preis, ende: jetzt + dauer };
  }
  function projektWeiter(t) {
    const ps = projStand(), b = ps.bau, P = D.PROJEKT[b.id];
    ps.bau = null;
    const n = (ps.stand[b.id] || 0) + 1; ps.stand[b.id] = n;
    if (n < P.abschnitte.length) { ereignis('projektAbschnitt', { id: b.id, abschnitt: n - 1 }); return; }
    ps.fertig[b.id] = t;
    S.gold += P.gold;
    ereignis('projekt', { id: b.id, gold: P.gold, xp: P.xp });
    xpPlus(P.xp, t);
  }
  // ---------------------------------------------------------------- Neuigkeiten nach einem Update (D.NEUERUNGEN)
  /** Noch nicht gesehene Neuigkeiten (älteste zuerst). Alter Spielstand ohne neuGesehen: alle. */
  function neuerungenOffen() { const L = D.NEUERUNGEN || [], i = L.findIndex(N => N.id === S.neuGesehen); return L.slice(i + 1); }
  function neuerungGesehen(id) { S.neuGesehen = id; }
  function werkOffen() { return D.STAEDTE.some(s => s.werk && angebunden(s.id)); }
  function werkPreis(l, art) { const st = l[art] || 0; return st >= 2 ? null : runde(D.LOK[l.id].preis * W.WERK_PREIS[art] * (st + 1) + 400); }
  function werkstatt(uid, art, jetzt) {
    simuliere(jetzt);
    const l = lok(uid);
    if (!l || !werkOffen()) return { ok: false, grund: 'Verbinde zuerst Meiningen mit deinem Netz.' };
    if (D.LOK[l.id].antrieb !== 'dampf') return { ok: false, grund: 'Das Dampflokwerk baut nur Dampfloks um.' };
    const preis = werkPreis(l, art);
    if (preis == null) return { ok: false, grund: 'Schon voll ausgebaut.' };
    if (S.taler < preis) return { ok: false, grund: fehlt(preis) };
    S.taler -= preis; l[art] = (l[art] || 0) + 1;
    ereignis('werk', { uid, art });
    return { ok: true };
  }

  // ---------------------------------------------------------------- Volldampf & Lernbonus
  function volldampfGeben(jetzt) {
    simuliere(jetzt);
    const v = S.volldampf;
    if (v.vorrat <= 0) return { ok: false, grund: 'Kein Volldampf gespeichert. Den gibt es für Lernrunden.' };
    const dauer = v.vorrat;
    // Baustellen: im Volldampf doppelt so schnell -> spart min(Dauer, Rest/2)
    baustellen().forEach(k => { const s = S.strecken[k]; const rest = s.ende - jetzt; s.ende -= Math.min(dauer, rest / 2); });
    v.bis = Math.max(v.bis, jetzt) + dauer; v.vorrat = 0;
    // fahrende Züge: Rest der Fahrt halbiert sich (im Rahmen der Volldampf-Zeit)
    S.loks.forEach(l => { if (l.status === 'faehrt' && !l.fahrt.volldampf) { const rest = l.fahrt.ende - jetzt; l.fahrt.ende -= Math.min(dauer, rest / 2); l.fahrt.volldampf = true; } });
    ereignis('volldampf', { bis: v.bis, minuten: Math.round(dauer / 60000) });
    return { ok: true, bis: v.bis };
  }
  /** Lernrunden einlösen: rounds = [{ id, quote }] (je id einmal am Tag). -> Summe der Belohnung */
  function lernBonus(rounds, jetzt) {
    simuliere(jetzt);
    const tag = heute(jetzt);
    if (S.lern.datum !== tag) S.lern = { datum: tag, ids: {}, gold: 0 };
    const erg = { runden: 0, kohle: 0, minuten: 0, gold: 0, perfekt: 0, gedeckelt: false, grenze: W.LERN_GOLD_TAG };
    rounds.forEach(r => {
      if (!r || !r.id || S.lern.ids[r.id]) return;
      const q = Math.max(0, Math.min(1, +r.quote || 0));
      S.lern.ids[r.id] = 1;
      const kohle = runde(bunkerGroesse() * (W.LERN_KOHLE[0] + (W.LERN_KOHLE[1] - W.LERN_KOHLE[0]) * q));
      const min = runde(W.LERN_VOLLDAMPF_MIN[0] + (W.LERN_VOLLDAMPF_MIN[1] - W.LERN_VOLLDAMPF_MIN[0]) * q);
      const perfekt = q >= 0.999;
      const verdient = 1 + (perfekt ? 1 : 0), gold = Math.min(verdient, Math.max(0, W.LERN_GOLD_TAG - (S.lern.gold || 0)));   // Tagesgrenze
      S.lern.gold = (S.lern.gold || 0) + gold;
      if (gold < verdient) erg.gedeckelt = true;
      S.kohle += kohle;                       // Sonderlieferung: darf über den Bunker hinaus
      S.volldampf.vorrat += min * 60000;
      S.gold += gold;
      erg.runden++; erg.kohle += kohle; erg.minuten += min; erg.gold += gold; if (perfekt) erg.perfekt++;
    });
    if (erg.runden) { ereignis('lernbonus', erg); simuliere(jetzt); }
    return erg;
  }

  // ---------------------------------------------------------------- Aufträge
  // art 'anschluss': Stadt ans Netz bringen | 'fracht': Ware von A nach B fahren | 'reise': Fahrgäste nach B bringen
  function netzStaedte() { return Object.keys(S.bahnhoefe); }
  function randStaedte() {   // eine fertige oder geplante Strecke entfernt
    const r = new Set();
    netzStaedte().forEach(c => NACH[c].forEach(({ n }) => { if (!angebunden(n)) r.add(n); }));
    return Array.from(r);
  }
  function waehle(arr) { return arr.length ? arr[Math.floor(zufall() * arr.length)] : null; }
  function auftragBelohnung(km, art) {
    const lv = 1 + (S.level - 1) * 0.18;
    if (art === 'anschluss') return { taler: runde((200 + km * 9) * lv / 10) * 10, xp: 8 + Math.round(km / 10) };
    if (art === 'fracht') return { taler: runde((260 + km * 12) * lv / 10) * 10, xp: 10 + Math.round(km / 8) };
    return { taler: runde((220 + km * 10) * lv / 10) * 10, xp: 8 + Math.round(km / 9) };
  }
  function auftragNeu(jetzt) {
    const netz = netzStaedte();
    const offen = S.auftraege.map(a => a.ziel + a.art + (a.von || ''));
    const arten = [];
    const rand = randStaedte().filter(c => offen.indexOf(c + 'anschluss') < 0);
    if (rand.length) arten.push('anschluss', 'anschluss');
    const erzeuger = netz.filter(c => D.STADT[c].ware);
    if (erzeuger.length && netz.length >= 2 && S.loks.some(l => !istDampf(l) && D.LOK[l.id].ladung > 0)) arten.push('fracht', 'fracht');   // Fracht erst, wenn eine Güterlok da ist
    if (netz.length >= 2) arten.push('reise');
    const art = waehle(arten);
    if (!art) return null;
    let a = null;
    if (art === 'anschluss') {
      // Städte in neuen Bundesländern, Hauptstädte und Warenstädte am Rand bevorzugen (Lernen nebenbei: Name + Land)
      const gewicht = rand.reduce((acc, c) => {
        const s = D.STADT[c], n = 1 + (S.laender[s.land] ? 0 : (Object.keys(S.laender).length < 3 ? 3 : 1)) + (D.LAENDER[s.land].hauptstadt === c ? 2 : 0) + (s.ware ? 1 : 0);
        for (let i = 0; i < n; i++) acc.push(c);
        return acc;
      }, []);
      const ziel = waehle(gewicht);
      const nb = NACH[ziel].filter(x => angebunden(x.n)).sort((x, y) => x.km - y.km)[0];
      a = { art, ziel, km: nb ? nb.km : 50, menge: 1 };
      Object.assign(a, auftragBelohnung(a.km, art));
    } else if (art === 'fracht') {
      const von = waehle(erzeuger);
      const ziele = netz.filter(c => c !== von && offen.indexOf(c + 'fracht' + von) < 0);
      // auch Städte am Rand als Ziel: Der Auftrag lockt zum Weiterbauen
      const ziel = waehle(ziele.concat(randStaedte().slice(0, 3)));
      if (!ziel) return null;
      const km = luftlinie(von, ziel);
      const menge = Math.max(10, runde((12 + S.level * 5) / 5) * 5);
      a = { art, von, ziel, ware: D.STADT[von].ware, km, menge };
      Object.assign(a, auftragBelohnung(km, art));
    } else {
      const ziel = waehle(netz.filter(c => offen.indexOf(c + 'reise') < 0));
      if (!ziel) return null;
      const menge = Math.max(20, runde((30 + S.level * 12) / 10) * 10);
      a = { art, ziel, menge, km: 60 };
      Object.assign(a, auftragBelohnung(40 + menge / 3, art));
    }
    a.aid = S.nextAid++; a.stand = 0; a.erstellt = jetzt;
    return a;
  }
  function auftraegeAuffuellen(jetzt) {
    let n = 0;
    while (S.auftraege.length < W.AUFTRAEGE && n++ < 10) { const a = auftragNeu(jetzt); if (a) S.auftraege.push(a); }
  }
  function auftragFortschritt(f, t) {
    S.auftraege.forEach(a => {
      if (a.fertig) return;
      if (a.art === 'fracht' && f.von === a.von && f.nach === a.ziel && f.ware === a.ware) a.stand = Math.min(a.menge, a.stand + f.menge);
      if (a.art === 'reise' && f.nach === a.ziel) a.stand = Math.min(a.menge, a.stand + f.pax);
      if (a.stand >= a.menge && !a.fertig) { a.fertig = t; ereignis('auftragFertig', { aid: a.aid }); }
    });
  }
  function pruefeAuftraege(t) {
    S.auftraege.forEach(a => {
      if (!a.fertig && a.art === 'anschluss' && angebunden(a.ziel)) { a.stand = 1; a.fertig = t; ereignis('auftragFertig', { aid: a.aid }); }
    });
  }
  /** Belohnung abholen (Max tippt auf den fertigen Auftrag). */
  function auftragAbholen(aid, jetzt) {
    simuliere(jetzt);
    const i = S.auftraege.findIndex(a => a.aid === aid);
    if (i < 0 || !S.auftraege[i].fertig) return { ok: false };
    const a = S.auftraege[i];
    S.auftraege.splice(i, 1);
    S.taler += a.taler; S.statistik.auftraege++;
    xpPlus(a.xp, jetzt);
    auftraegeAuffuellen(jetzt);
    ereignis('belohnung', { aid, taler: a.taler, xp: a.xp });
    return { ok: true, taler: a.taler, xp: a.xp };
  }
  /** Was ist für einen Auftrag als Nächstes zu tun? (für den Knopf auf der Auftragskarte)
   *  -> { tun:'bauen', a, b, preis } | { tun:'zug', von, nach } | { tun:'laeuft', uid } | { tun:'fertig' } | { tun:'nichts' } */
  function auftragHilfe(aid) {
    const a = S.auftraege.find(x => x.aid === aid);
    if (!a) return { tun: 'nichts' };
    if (a.fertig) return { tun: 'fertig' };
    const bauZu = ziel => {   // günstigste baubare Strecke, die näher an ziel heranführt
      const opt = baubar().filter(k => k.a === ziel || k.b === ziel);
      if (opt.length) { opt.sort((x, y) => x.preis - y.preis); return { tun: 'bauen', a: opt[0].a, b: opt[0].b, preis: opt[0].preis, id: opt[0].id }; }
      return { tun: 'nichts' };
    };
    if (a.art === 'anschluss') return bauZu(a.ziel);
    if (a.art === 'fracht') {
      if (!angebunden(a.ziel)) return bauZu(a.ziel);
      const l = S.loks.find(x => x.linie && x.linie.von === a.von && x.linie.nach === a.ziel || x.linie && x.linie.von === a.ziel && x.linie.nach === a.von);
      if (l) return { tun: 'laeuft', uid: l.uid };
      return weg(a.von, a.ziel) ? { tun: 'zug', von: a.von, nach: a.ziel } : { tun: 'nichts' };
    }
    const l = S.loks.find(x => x.linie && (x.linie.von === a.ziel || x.linie.nach === a.ziel));
    if (l) return { tun: 'laeuft', uid: l.uid };
    // Reise: die größte andere Stadt im Netz, die einen Weg zum Ziel hat
    const quelle = Object.keys(S.bahnhoefe).filter(c => c !== a.ziel && weg(c, a.ziel)).sort((x, y) => D.STADT[y].einw - D.STADT[x].einw)[0];
    return quelle ? { tun: 'zug', von: quelle, nach: a.ziel } : { tun: 'nichts' };
  }
  /** Lok, die für einen Auftrag umgesetzt würde: freie Lok zuerst, sonst die, die gerade am wenigsten einbringt
   *  und keinen anderen Auftrag bedient. */
  function lokFuerAuftrag(von, nach) {
    const frei = S.loks.filter(l => !l.linie && !istDampf(l));
    const bedarfOk = l => { const w = weg(von, nach, D.LOK[l.id].antrieb === 'elektro', l.uid); return !!w && w.km * lokWerte(l).kohle / 100 <= bunkerGroesse(); };
    if (frei.length) return frei.filter(bedarfOk)[0] || null;
    const schuetzen = new Set();
    S.auftraege.forEach(a => { if (!a.fertig) { const h = auftragHilfe(a.aid); if (h.tun === 'laeuft') schuetzen.add(h.uid); } });
    S.loks.forEach(l => { if (l.linie && l.linie.karte) schuetzen.add(l.uid); });   // Zug auf Eröffnungsfahrt (Linienkarte) nicht abziehen
    const kand = S.loks.filter(l => !schuetzen.has(l.uid) && !istDampf(l) && bedarfOk(l))
      .sort((x, y) => (x.stat.taler / Math.max(1, x.stat.fahrten)) - (y.stat.taler / Math.max(1, y.stat.fahrten)));
    return kand[0] || null;
  }
  function auftragBedienen(aid, jetzt) {
    simuliere(jetzt);
    const h = auftragHilfe(aid);
    if (h.tun === 'bauen') return Object.assign(baue(h.a, h.b, jetzt), { tun: 'bauen' });
    if (h.tun !== 'zug') return { ok: false, tun: h.tun };
    const l = lokFuerAuftrag(h.von, h.nach);
    if (!l) return { ok: false, grund: S.loks.length ? 'Kein passender Zug frei. Kauf einen neuen Zug im Fuhrpark!' : 'Du hast noch keinen Zug. Kauf deinen ersten im Fuhrpark!' };
    return Object.assign(setzeLinie(l.uid, h.von, h.nach, jetzt), { tun: 'zug', uid: l.uid });
  }

  /** Auftrag tauschen (kostenlos, einmal je 3 Minuten) – wenn er Max nicht gefällt. */
  function auftragTauschen(aid, jetzt) {
    simuliere(jetzt);
    if (S.tauschBis && jetzt < S.tauschBis) return { ok: false, grund: 'Gleich wieder möglich.' };
    const i = S.auftraege.findIndex(a => a.aid === aid && !a.fertig);
    if (i < 0) return { ok: false };
    S.auftraege.splice(i, 1);
    auftraegeAuffuellen(jetzt);
    S.tauschBis = jetzt + 180000;
    return { ok: true };
  }

  // ---------------------------------------------------------------- Anzeige-Hilfen (rein lesend)
  function luftlinie(a, b) {
    const x = D.STADT[a], y = D.STADT[b], R = 6371, r = Math.PI / 180;
    const dLat = (y.lat - x.lat) * r, dLon = (y.lon - x.lon) * r;
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(x.lat * r) * Math.cos(y.lat * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }
  /** Bahnzeit (Minuten seit Mitternacht): 1 echte Sekunde = 1 Bahn-Minute, ein Bahn-Tag dauert 24 echte Minuten. */
  function bahnzeit(ts) { return Math.floor(ts / 1000) % 1440; }
  function uhr(ts) { const m = bahnzeit(ts); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  /** Position eines Zugs auf der Karte: { x, y, winkel, fort, kante } – fort 0..1 der ganzen Fahrt */
  function zugPosition(l, jetzt) {
    if (!l.linie) return null;
    if (l.status !== 'faehrt') { const p = K.staedte[l.ort]; return { x: p[0], y: p[1], winkel: 0, fort: 0, steht: true }; }
    const f = l.fahrt;
    const fort = Math.max(0, Math.min(1, (jetzt - f.start) / (f.ende - f.start)));
    // Strecke entlang der Wegpunkte (Kartenlänge)
    const pts = f.weg.map(c => K.staedte[c]);
    const len = []; let ges = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); len.push(d); ges += d; }
    let s = fort * ges, i = 0;
    while (i < len.length - 1 && s > len[i]) { s -= len[i]; i++; }
    const a = pts[i], b = pts[i + 1], u = len[i] ? Math.min(1, s / len[i]) : 0;
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, winkel: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI, fort, steht: false, abschnitt: [f.weg[i], f.weg[i + 1]] };
  }
  /** Abfahrtstafel eines Bahnhofs: [{ zeit, art:'ab'|'an', uid, gegen, fahrzeit }] sortiert */
  function tafel(c, jetzt) {
    const r = [];
    S.loks.forEach(l => {
      if (!l.linie || (l.linie.von !== c && l.linie.nach !== c)) return;
      const w = lokWerte(l);
      const dauer = fahrzeitMs(l.linie.km, w.kmh, l.linie.weg, istDampf(l));
      const gegen = l.linie.von === c ? l.linie.nach : l.linie.von;
      if (l.status === 'faehrt' && l.fahrt.nach === c) {
        r.push({ zeit: l.fahrt.ende, art: 'an', uid: l.uid, gegen, fahrzeit: dauer });
        r.push({ zeit: l.fahrt.ende + haltMs(c), art: 'ab', uid: l.uid, gegen, fahrzeit: dauer });
      } else if (l.status === 'faehrt') {
        const zurueck = l.fahrt.ende + haltMs(l.fahrt.nach) + dauer;
        r.push({ zeit: zurueck, art: 'an', uid: l.uid, gegen, fahrzeit: dauer });
        r.push({ zeit: zurueck + haltMs(c), art: 'ab', uid: l.uid, gegen, fahrzeit: dauer });
      } else if (l.ort === c) {
        r.push({ zeit: Math.max(l.halt, jetzt), art: 'ab', uid: l.uid, gegen, fahrzeit: dauer, kohle: l.status === 'kohle' });
      }
    });
    return r.sort((a, b) => a.zeit - b.zeit);
  }
  /** Was die Züge gerade je Minute verdienen (für die Anzeige) */
  function einnahmenProMinute() {
    const st = S.statistik;
    return st.fahrten ? Math.round(st.taler / Math.max(1, (S.zeit - S.erstellt) / 60000)) : 0;
  }

  return {
    W, SPEICHER, geld, neu, laden, speichern, zustand, simuliere, beiEreignis, maxLoks, fuhrpark, verkaufeLok, verkaufPreis,
    strom, kante, bahn, bahnVon, bahnen, karte, kartenAngebot, karteNehmen, karteZurueck, karteFahren, kartePasst, karteErlaubt, kartenStand, sonderfahrten, sonderFahren, belegt, lokFuerAuftrag, zugReserve, betrieb, setzeLinieProbe, kapazitaet, auslastung, zweigleisig, gleis2Preis, gleis2Baubar, gleis2Bauen, taufNamen, taufe, oberleitungPreis, oberleitungBaubar, oberleitungBauen, hatGeb, gebaeudeZahl, haltMs, gebaeudeBaubar, baueGebaeude,
    autoKohle, kohlePreis, kohleProMinute, kohleReichtMinuten,
    baubar, baue, sofortFertig, streckenPreis, bauDauer, baustellen, streckeFertig, angebunden, weg,
    kaufbar, kaufeLok, kaufePreis, lok, lokWerte, setzeLinie, insDepot, fahrzeitMs,
    projekte, projekt, projektBaubar, projektBauen, projektFertig, projektFaktor, projektPlaetze, tempo, neuerungenOffen, neuerungGesehen,
    kaufeKohle, ausbau, bunkerGroesse, werkOffen, werkPreis, werkstatt, zechen,
    volldampfGeben, lernBonus, auftragAbholen, auftragTauschen, auftragHilfe, auftragBedienen,
    luftlinie, bahnzeit, uhr, zugPosition, tafel, xpFuer, paxRate, wareRate, einnahmenProMinute, schl, NACH
  };
})();
if (typeof module !== 'undefined') module.exports = VolldampfModell;
