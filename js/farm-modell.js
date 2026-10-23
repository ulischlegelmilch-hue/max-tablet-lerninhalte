// Hof-Farm: Spiellogik (ohne DOM, ohne Zeichnen). Alles ist zeitstempel-basiert: Auftraege, Wachstum, Produktion und
// Bestellungen werden mit simuliere(jetzt) fortgeschrieben - auch ueber Stunden, in denen die App zu war. Der ganze
// Spielstand ist ein einfaches JSON-Objekt (spaeter synchronisierbar, z. B. fuer Mitspielen am Handy ueber den Pi).
const FarmModell = (function () {
  const D = FarmDaten;
  const KMH_PX = 4.2;                 // Pixel/s je km/h (nur fuer Wegzeiten)
  const TRANSPORT_KMH = 14;
  const SPEICHER = 'maxlernt_farm_v2';
  let S = null;
  const hoerer = [];

  function ereignis(art, daten) { hoerer.forEach(f => { try { f(art, daten || {}); } catch (e) { /* UI-Fehler duerfen die Logik nicht stoeren */ } }); }
  function beiEreignis(fn) { hoerer.push(fn); }
  const zahl = (n, a, b) => n < a ? a : n > b ? b : n;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ----------------------------------------------------------------------------------------------
  // Spielstand
  // ----------------------------------------------------------------------------------------------
  function feldNeu() {
    return { phase: 'stoppel', frucht: null, fort: 0, fortZeit: 0, dauer: 0, beregnung: false, lern: false, bonus: { pf: 0, dg: 0, sp: 0, wa: 0 }, boden: 70, vorher: [], auto: null };
  }
  function maschineNeu(defId) { return { uid: S.nextId++, id: defId, zustand: 100, job: null }; }
  function neu(jetzt) {
    S = {
      v: 2, geld: D.STARTGELD, xp: 0, level: 1, zeit: jetzt, tempo: 1, anfang: true, felder: {}, flotte: [], jobs: [], silo: {},
      preise: {}, produktion: {}, auftraege: [], auftragNaechst: jetzt, preisZeit: jetzt, fahrer: 0, siloStufe: 0, nextId: 1,
      statistik: { verkauft: 0, geerntet: 0, auftraege: 0, jobs: 0, jobsJe: {}, ernteJe: {}, produziert: 0, eingesammelt: 0, repariert: 0, maxGeld: D.STARTGELD, tage: [] },
      album: { maschinen: {}, fruechte: {}, tiere: {}, wetter: {}, waren: {}, betriebe: {} }, erfolge: {}, albumBonus: {}, tag: null, serie: { tage: 0, letzter: '' }, erstellt: jetzt, hilfe: {}, ton: true,
      tiere: {}, wetterstation: 0, wetterSeed: (Math.floor(jetzt / 1000) % 100003) + 17, stepZeit: jetzt
    };
    D.STARTFELDER.forEach(id => { S.felder[id] = feldNeu(); });
    D.STARTFLOTTE.forEach(id => { S.flotte.push(maschineNeu(id)); S.album.maschinen[id] = 1; });
    D.alleGueter().forEach(g => { S.preise[g] = 1; });
    return S;
  }
  function speichern() { return JSON.stringify(S); }
  function laden(text, jetzt) {
    let raw = null;
    try { raw = JSON.parse(text); } catch (e) { raw = null; }
    if (!raw || raw.v !== 2) return null;
    S = raw;
    D.alleGueter().forEach(g => { if (S.preise[g] == null) S.preise[g] = 1; });
    if (!S.hilfe) S.hilfe = {};
    S.nextId = S.nextId || 100;
    if (!S.tiere) S.tiere = {};
    if (!S.wetterstation) S.wetterstation = 0;
    if (!S.wetterSeed) S.wetterSeed = (Math.floor((S.erstellt || S.zeit) / 1000) % 100003) + 17;
    if (!S.stepZeit) S.stepZeit = S.zeit;
    // Migration: Erfolge/Album (Album wird aus dem vorhandenen Stand rekonstruiert)
    const st = S.statistik;
    ['jobsJe', 'ernteJe'].forEach(k => { if (!st[k]) st[k] = {}; });
    ['produziert', 'eingesammelt', 'repariert'].forEach(k => { if (!st[k]) st[k] = 0; });
    if (!st.maxGeld) st.maxGeld = S.geld;
    if (!st.tage) st.tage = [];
    if (!S.erfolge) S.erfolge = {};
    if (!S.albumBonus) S.albumBonus = {};
    if (!S.serie) S.serie = { tage: 0, letzter: '' };
    if (!S.album) {
      S.album = { maschinen: {}, fruechte: {}, tiere: {}, wetter: {}, waren: {}, betriebe: {} };
      S.flotte.forEach(m => { S.album.maschinen[m.id] = 1; });
      Object.keys(S.felder).forEach(id => { const f = S.felder[id]; if (f.frucht) S.album.fruechte[f.frucht] = 1; (f.vorher || []).forEach(v => { S.album.fruechte[v] = 1; }); });
      Object.keys(S.silo).forEach(g => { if (D.frucht(g)) S.album.fruechte[g] = 1; else if (D.WAREN[g]) S.album.waren[g] = 1; });
      Object.keys(S.produktion).forEach(b => { S.album.betriebe[b] = 1; });
      Object.keys(S.tiere).forEach(t => { if (S.tiere[t].anzahl > 0) S.album.tiere[t] = 1; });
      st.jobsJe = st.jobsJe || {};
    }
    // Migration alter Staende (Wachstum nach festem Reifezeitpunkt -> Fortschritt)
    Object.keys(S.felder).forEach(id => {
      const f = S.felder[id];
      if (f.dauer === undefined) {
        f.dauer = f.phase === 'waechst' ? Math.max(1, (f.reife || 0) - (f.pflanz || 0)) : 0;
        f.fort = f.phase === 'waechst' ? zahl((S.zeit - (f.pflanz || 0)) / f.dauer, 0, 1) : (f.phase === 'reif' ? 1 : 0);
        f.fortZeit = S.zeit; f.beregnung = false;
        delete f.reife; delete f.pflanz;
      }
    });
    if (jetzt != null) simuliere(jetzt);
    return S;
  }
  function stand() { return S; }

  // ----------------------------------------------------------------------------------------------
  // Hilfsfunktionen
  // ----------------------------------------------------------------------------------------------
  const maschine = uid => S.flotte.find(m => m.uid === uid) || null;
  const tempoFaktor = () => (S.tempo || 1) * (S.anfang ? D.ANFANGS_TEMPO : 1);
  const jobAufFeld = id => S.jobs.find(j => j.feld === id) || null;
  const siloKap = () => D.SILO_STUFEN[S.siloStufe].kg;
  function lagerMenge() { return Object.keys(S.silo).reduce((a, k) => a + S.silo[k], 0); }
  function preis(gut) { return D.gut(gut).preis * D.PREISFAKTOR * S.preise[gut]; }
  function grundPreis(gut) { return D.gut(gut).preis * D.PREISFAKTOR; }

  function wegPunkte(id) {
    const f = D.feld(id), g = D.HOF_TOR, fy = f.y + f.r * D.ZELLE / 2;
    let ex = f.x - 30;
    if (ex < 30) ex = f.x + f.c * D.ZELLE + 30;
    return [{ x: g.x, y: g.y }, { x: g.x, y: D.STRASSE_Y }, { x: ex, y: D.STRASSE_Y }, { x: ex, y: fy }];
  }
  function wegLaenge(id) {
    const p = wegPunkte(id);
    let s = 0;
    for (let i = 1; i < p.length; i++) s += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
    return s + 60;
  }

  // Arbeitsdauer in Sekunden (ohne Tempo-Faktor)
  function arbeitsSek(schritt, feldId, geraetDef, ernterDef) {
    const st = D.SCHRITTE[schritt], ha = D.feld(feldId).ha;
    let w, kmh, eff = st.eff;
    if (ernterDef) { w = ernterDef.w; kmh = ernterDef.kmh; if (ernterDef.typ === 'rodemaschine') eff *= 0.8; }
    else { w = geraetDef.w; kmh = geraetDef.kmh; }
    return D.ARBEIT_K * ha / ((w / D.PX_JE_M) * kmh * eff);
  }
  // Bessere Maschinen haben echte Vorteile (alles aus dem Level der Maschine bzw. der Motorleistung):
  //  - Zugreserve: ein Traktor mit mehr PS als das Geraet braucht, arbeitet schneller (bis +30 %)
  //  - Transport: schnellere Traktoren sind schneller zum Feld und zurueck
  //  - Verschleiss: hoeherwertige Maschinen nutzen sich langsamer ab (bis -50 %)
  //  - Wirkung: bessere Geraete (Pflug, Streuer, Spritze, Walze) bringen mehr Ertrag je Arbeitsgang (bis +50 % des Bonus),
  //    bessere Maehdrescher/Roder ernten sauberer (bis +10 % Ertrag)
  const zugFaktor = (td, gd) => gd ? 1 + Math.min(0.30, Math.max(0, td.ps / gd.ps - 1) * 0.15) : 1;
  const transportFaktor = td => td.art === 'traktor' ? td.kmh / 30 : 1;
  const verschleissRate = d => 1 - Math.min(0.5, (d.lvl - 1) * 0.0125);
  const wirkungFaktor = d => d.art === 'geraet' ? 1 + Math.min(0.5, (d.lvl - 1) * 0.012) : 1;
  const erntePlus = d => d.art === 'ernter' ? 1 + Math.min(0.10, (d.lvl - 1) * 0.003) : 1;
  function maschinenVorteile(defId) {
    const d = D.def(defId), v = [];
    if (!d) return v;
    if (d.art === 'traktor') {
      if (transportFaktor(d) > 1.01) v.push('Transport +' + Math.round((transportFaktor(d) - 1) * 100) + ' % schneller');
      v.push('Zugreserve: bei kleineren Geräten bis +30 % Tempo');
    }
    if (d.art === 'geraet' && wirkungFaktor(d) > 1.001) v.push('Wirkung +' + Math.round((wirkungFaktor(d) - 1) * 100) + ' % (mehr Ertrag je Arbeitsgang)');
    if (d.art === 'ernter' && erntePlus(d) > 1.001) v.push('Ernte +' + Math.round((erntePlus(d) - 1) * 100) + ' % (weniger Verlust)');
    if (verschleissRate(d) < 0.999) v.push('Verschleiß −' + Math.round((1 - verschleissRate(d)) * 100) + ' %');
    return v;
  }
  function verschleissFaktor(m) { return m.zustand >= 50 ? 1 : 1 + (50 - m.zustand) / 50 * 0.6; }
  const einsatzbereit = m => !m.job && m.zustand >= 15;

  // ----------------------------------------------------------------------------------------------
  // Wetter (reine Funktion der Zeit)
  // ----------------------------------------------------------------------------------------------
  function hash(n) {
    let x = (Math.imul(n | 0, 2654435761)) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; x = Math.imul(x, 3266489917) >>> 0; x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }
  function jahreszeit(t) {
    const m = new Date(t).getMonth();
    return m >= 2 && m <= 4 ? 'fruehling' : m >= 5 && m <= 7 ? 'sommer' : m >= 8 && m <= 10 ? 'herbst' : 'winter';
  }
  function wetterRoh(slot) {
    const gw = D.WETTER_GEWICHTE[jahreszeit(slot * D.WETTER_SLOT_MS)];
    const ids = Object.keys(gw);
    let total = 0; ids.forEach(k => { total += gw[k]; });
    let r = hash(slot * 131 + (S.wetterSeed || 1)) * total;
    for (let i = 0; i < ids.length; i++) { r -= gw[ids[i]]; if (r < 0) return ids[i]; }
    return 'sonnig';
  }
  function wetterTyp(t) {
    const slot = Math.floor(t / D.WETTER_SLOT_MS);
    let typ = wetterRoh(slot);
    if (hash(slot * 977 + (S.wetterSeed || 1)) < 0.4) typ = wetterRoh(slot - 1);
    return typ;
  }
  function wetter(t) { return D.WETTER[wetterTyp(t)]; }
  function wachsFaktor(f, t) {
    const w = wetter(t);
    return (w.id === 'hitze' && f.beregnung) ? 1 : w.wachs;
  }
  // Vorhersage ab jetzt: abhaengig von der Wetterstation
  function wetterVorschau(jetzt) {
    const n = S.wetterstation ? D.WETTERSTATION[S.wetterstation - 1].slots : 0;
    const out = [];
    const slot0 = Math.floor(jetzt / D.WETTER_SLOT_MS);
    for (let i = 1; i <= n; i++) out.push({ von: (slot0 + i) * D.WETTER_SLOT_MS, typ: wetterTyp((slot0 + i) * D.WETTER_SLOT_MS) });
    return out;
  }
  function wetterstationKaufen() {
    const n = D.WETTERSTATION[S.wetterstation];
    if (!n) return { ok: false, grund: 'Die Wetterstation ist voll ausgebaut.' };
    if (S.level < n.lvl) return { ok: false, grund: n.name + ' gibt es ab Level ' + n.lvl + '.' };
    if (S.geld < n.preis) return { ok: false, grund: 'Es fehlen noch ' + Math.round(n.preis - S.geld).toLocaleString('de-DE') + ' €.' };
    S.geld -= n.preis; S.wetterstation++;
    return { ok: true };
  }
  function beregnungKaufen(feldId) {
    const f = S.felder[feldId];
    if (!f) return { ok: false, grund: 'Das Feld gehört dir nicht.' };
    if (f.beregnung) return { ok: false, grund: 'Schon eingebaut.' };
    if (S.level < D.BEREGNUNG_LVL) return { ok: false, grund: 'Beregnung gibt es ab Level ' + D.BEREGNUNG_LVL + '.' };
    const k = Math.round(D.feld(feldId).ha * D.BEREGNUNG_PREIS_HA);
    if (S.geld < k) return { ok: false, grund: 'Es fehlen noch ' + Math.round(k - S.geld).toLocaleString('de-DE') + ' €.' };
    S.geld -= k; f.beregnung = true;
    return { ok: true };
  }
  function restWachsen(id, jetzt) {
    const f = S.felder[id];
    if (!f || f.phase !== 'waechst') return 0;
    const noch = (1 - fortschrittWachstum(f, jetzt)) * f.dauer;
    return Math.max(0, noch / wachsFaktor(f, jetzt));
  }

  // Ertragsfaktor fuer ein Feld (zum Erntezeitpunkt)
  function ertragsFaktor(f, fruchtId) {
    const fr = D.frucht(fruchtId);
    let faktor = 0.75 + 0.25 * f.boden / 100;
    faktor *= 1 + D.BONUS.pf * f.bonus.pf + D.BONUS.dg * f.bonus.dg + D.BONUS.sp * f.bonus.sp + D.BONUS.wa * f.bonus.wa;
    if (fr.familie === 'oel' && S.tiere.bienen && S.tiere.bienen.anzahl) faktor *= 1 + Math.min(0.12, S.tiere.bienen.anzahl * D.BIENEN_BONUS);
    const v0 = f.vorher[0] ? D.frucht(f.vorher[0]) : null;
    if (v0) {
      if (v0.id === fr.id) faktor *= 0.85;
      else if (v0.familie !== fr.familie) faktor *= 1.06;
    }
    return faktor;
  }
  function ertragsSchaetzungKg(feldId, fruchtId) {
    const f = S.felder[feldId], fr = D.frucht(fruchtId || f.frucht);
    if (!fr) return 0;
    return D.feld(feldId).ha * fr.ertrag * 1000 * ertragsFaktor(f, fr.id);
  }
  function fruchtfolgeHinweis(feldId, fruchtId) {
    const f = S.felder[feldId], fr = D.frucht(fruchtId), v0 = f.vorher[0] ? D.frucht(f.vorher[0]) : null;
    if (!v0) return '';
    if (v0.id === fr.id) return 'Gleiche Frucht wie zuvor: −15 % Ertrag';
    if (v0.familie !== fr.familie) return 'Gute Fruchtfolge: +6 % Ertrag';
    return '';
  }
  function fortschrittWachstum(f, jetzt) {
    if (f.phase === 'reif') return 1;
    if (f.phase !== 'waechst') return 0;
    return zahl(f.fort + Math.max(0, jetzt - f.fortZeit) / Math.max(1, f.dauer) * wachsFaktor(f, jetzt), 0, 1);
  }

  // ----------------------------------------------------------------------------------------------
  // Level / Geld / Lager
  // ----------------------------------------------------------------------------------------------
  function xpGeben(n) {
    S.xp += n;
    while (S.xp >= D.xpFuerLevel(S.level)) {
      S.xp -= D.xpFuerLevel(S.level);
      S.level++;
      const bonus = Math.min(S.level, 60) * 150;
      S.geld += bonus;
      ereignis('level', { level: S.level, bonus });
    }
  }
  function lagerEin(gutId, kg) {
    if (D.WAREN[gutId]) albumSetzen('waren', gutId);
    const frei = Math.max(0, siloKap() - lagerMenge());
    const ein = Math.min(kg, frei), rest = kg - ein;
    if (ein > 0) S.silo[gutId] = (S.silo[gutId] || 0) + ein;
    let erloes = 0;
    if (rest > 0.5) { erloes = rest / 1000 * preis(gutId) * 0.8; S.geld += erloes; }
    return { ein, rest, erloes };
  }
  function verkaufen(gutId, kg) {
    kg = Math.min(kg, S.silo[gutId] || 0);
    if (kg <= 0) return { ok: false, grund: 'Davon ist nichts im Lager.' };
    const erloes = kg / 1000 * preis(gutId);
    S.silo[gutId] -= kg;
    if (S.silo[gutId] < 1) delete S.silo[gutId];
    S.geld += erloes;
    S.preise[gutId] = zahl(S.preise[gutId] - 0.05 * (kg / 20000), D.PREIS_MIN, D.PREIS_MAX);
    S.statistik.verkauft += erloes;
    xpGeben(Math.round(erloes / 200));
    return { ok: true, erloes, kg };
  }

  // ----------------------------------------------------------------------------------------------
  // Kaufen / Verkaufen / Reparieren
  // ----------------------------------------------------------------------------------------------
  function feldKaufen(id) {
    const d = D.feld(id);
    if (!d || S.felder[id]) return { ok: false, grund: 'Das Feld gehört dir schon.' };
    if (S.level < d.lvl) return { ok: false, grund: 'Dieses Feld gibt es ab Level ' + d.lvl + '.' };
    if (S.geld < d.preis) return { ok: false, grund: 'Es fehlen noch ' + Math.round(d.preis - S.geld).toLocaleString('de-DE') + ' €.' };
    S.geld -= d.preis; S.felder[id] = feldNeu();
    ereignis('feldGekauft', { id });
    return { ok: true };
  }
  function maschineKaufen(defId) {
    const d = D.def(defId);
    if (!d) return { ok: false, grund: 'Unbekannt.' };
    if (S.level < d.lvl) return { ok: false, grund: 'Das gibt es ab Level ' + d.lvl + '.' };
    if (S.geld < d.preis) return { ok: false, grund: 'Es fehlen noch ' + Math.round(d.preis - S.geld).toLocaleString('de-DE') + ' €.' };
    S.geld -= d.preis;
    const m = maschineNeu(defId);
    S.flotte.push(m);
    albumSetzen('maschinen', defId);
    ereignis('maschineGekauft', { uid: m.uid, id: defId });
    return { ok: true, maschine: m };
  }
  function verkaufswert(m) { return Math.round(D.def(m.id).preis * (0.35 + 0.2 * m.zustand / 100)); }
  function maschineVerkaufen(uid) {
    const m = maschine(uid);
    if (!m) return { ok: false, grund: 'Unbekannt.' };
    if (m.job) return { ok: false, grund: 'Die Maschine arbeitet gerade.' };
    if (D.def(m.id).art === 'traktor' && S.flotte.filter(x => D.def(x.id).art === 'traktor').length <= 1) return { ok: false, grund: 'Den letzten Traktor behältst du.' };
    S.geld += verkaufswert(m);
    S.flotte.splice(S.flotte.indexOf(m), 1);
    return { ok: true };
  }
  function reparaturKosten(m) { return Math.round(D.def(m.id).preis * 0.1 * (100 - m.zustand) / 100); }
  function maschineReparieren(uid) {
    const m = maschine(uid);
    if (!m) return { ok: false, grund: 'Unbekannt.' };
    if (m.job) return { ok: false, grund: 'Die Maschine arbeitet gerade.' };
    const k = reparaturKosten(m);
    if (m.zustand >= 99.5) return { ok: false, grund: 'Sie ist in Topform.' };
    if (S.geld < k) return { ok: false, grund: 'Es fehlen noch ' + Math.round(k - S.geld).toLocaleString('de-DE') + ' €.' };
    S.geld -= k; m.zustand = 100; S.statistik.repariert++;
    return { ok: true, kosten: k };
  }
  function lagerAusbauen() {
    const n = D.SILO_STUFEN[S.siloStufe + 1];
    if (!n) return { ok: false, grund: 'Das Silo ist voll ausgebaut.' };
    if (S.geld < n.preis) return { ok: false, grund: 'Es fehlen noch ' + Math.round(n.preis - S.geld).toLocaleString('de-DE') + ' €.' };
    S.geld -= n.preis; S.siloStufe++;
    return { ok: true };
  }
  function fahrerKaufen() {
    const n = D.FAHRER[S.fahrer];
    if (!n) return { ok: false, grund: 'Mehr Fahrer gibt es nicht.' };
    if (S.level < n.lvl) return { ok: false, grund: 'Der nächste Fahrer ab Level ' + n.lvl + '.' };
    if (S.geld < n.preis) return { ok: false, grund: 'Es fehlen noch ' + Math.round(n.preis - S.geld).toLocaleString('de-DE') + ' €.' };
    S.geld -= n.preis; S.fahrer++;
    if (!S.lohnTag) S.lohnTag = tagesStart(Date.now());   // erster Lohn am naechsten Tag
    return { ok: true };
  }
  function autoFelder() { return Object.keys(S.felder).filter(id => S.felder[id].auto).map(Number); }
  // Fahrer (seit 23.10.2026, Uli: "Max soll nicht fuer jedes Feld einen Manager einstellen und dann nichts mehr tun muessen"):
  // ein Fahrer erledigt nur die ROUTINE auf einem Feld - Kalken, Grubbern, Walzen. Saeen (Fruchtwahl), Duengen, Spritzen und Ernten
  // bleiben bei Max. Jeder eingestellte Fahrer kostet jeden Tag Lohn. an = true: einsetzen, sonst abziehen (alter Parameter "Frucht" wird ignoriert).
  function autoSetzen(feldId, an) {
    const f = S.felder[feldId];
    if (!f) return { ok: false, grund: 'Das Feld gehört dir nicht.' };
    if (!an) { f.auto = null; return { ok: true }; }
    if (!f.auto && autoFelder().length >= S.fahrer) return { ok: false, grund: 'Dafür brauchst du einen freien Fahrer (im Händler unter „Fahrer“).' };
    f.auto = { an: true };
    return { ok: true };
  }
  // Lohn: jeden Tag (Mitternacht) fuer alle eingestellten Fahrer. Fehlt das Geld, laeuft eine Schuld auf; solange sie offen ist, arbeiten die Fahrer nicht.
  const fahrerLohn = i => Math.round(D.FAHRER[i].preis * D.FAHRER_LOHN_ANTEIL / 50) * 50;
  function lohnProTag() { let sum = 0; for (let i = 0; i < S.fahrer; i++) sum += fahrerLohn(i); return sum; }
  function tagesStart(t) { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
  function lohnPruefen(jetzt) {
    const heute = tagesStart(jetzt);
    if (!S.lohnTag) { S.lohnTag = heute; if (S.lohnOffen == null) S.lohnOffen = 0; return; }
    if (S.lohnOffen == null) S.lohnOffen = 0;
    let tage = 0, d = new Date(S.lohnTag);
    for (;;) {
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      if (d.getTime() > heute) break;
      tage++;
      if (tage >= 14) { S.lohnTag = heute; break; }   // sehr lange Pause: hoechstens 14 Tage nachberechnen
    }
    if (tage > 0) {
      S.lohnTag = Math.max(S.lohnTag, heute);
      const summe = lohnProTag() * tage;
      if (summe > 0) {
        if (S.geld >= summe) { S.geld -= summe; S.statistik.lohn = (S.statistik.lohn || 0) + summe; ereignis('lohn', { betrag: summe, tage, fahrer: S.fahrer }); }
        else { S.lohnOffen += summe; ereignis('lohnFehlt', { betrag: summe }); }
      }
    }
    if (S.lohnOffen > 0 && S.geld >= S.lohnOffen) { const b = S.lohnOffen; S.geld -= b; S.lohnOffen = 0; S.statistik.lohn = (S.statistik.lohn || 0) + b; ereignis('lohn', { betrag: b, tage: 0, fahrer: S.fahrer, nachgezahlt: true }); autoPlaner(jetzt); }
  }


  // ----------------------------------------------------------------------------------------------
  // Auftraege (Arbeitseinsaetze auf Feldern)
  // ----------------------------------------------------------------------------------------------
  // Passende freie Maschinen fuer einen Schritt: [{ geraet, traktor, sek }] sortiert nach Dauer
  function optionen(feldId, schritt, fruchtId) {
    const st = D.SCHRITTE[schritt], res = [];
    const frei = S.flotte.filter(einsatzbereit);
    if (st.geraet) {
      const traktoren = frei.filter(m => D.def(m.id).art === 'traktor').sort((a, b) => D.def(a.id).ps - D.def(b.id).ps);
      frei.filter(m => D.def(m.id).art === 'geraet' && D.def(m.id).typ === st.geraet).forEach(g => {
        const gd = D.def(g.id);
        const t = traktoren.find(x => D.def(x.id).ps >= gd.ps);
        if (!t) { res.push({ geraet: g.uid, traktor: null, grund: 'Kein Traktor mit ' + gd.ps + ' PS frei', sek: arbeitsSek(schritt, feldId, gd, null) }); return; }
        res.push({ geraet: g.uid, traktor: t.uid, traktoren: traktoren.filter(x => D.def(x.id).ps >= gd.ps).map(x => x.uid), sek: arbeitsSek(schritt, feldId, gd, null) * verschleissFaktor(g) * verschleissFaktor(t) / zugFaktor(D.def(t.id), gd) });
      });
    } else {
      const f = S.felder[feldId], fr = D.frucht(fruchtId || f.frucht);
      const typ = fr && fr.ernte === 'wurzel' ? 'rodemaschine' : 'maehdrescher';
      frei.filter(m => D.def(m.id).art === 'ernter' && D.def(m.id).typ === typ).forEach(h => {
        res.push({ geraet: null, traktor: h.uid, traktoren: [h.uid], sek: arbeitsSek(schritt, feldId, null, D.def(h.id)) * verschleissFaktor(h) });
      });
    }
    return res.sort((a, b) => (a.traktor ? 0 : 1) - (b.traktor ? 0 : 1) || a.sek - b.sek);
  }

  // Pruefung, ob ein Schritt auf dem Feld gerade erlaubt ist (ohne Maschinen)
  function schrittErlaubt(feldId, schritt, jetzt) {
    const f = S.felder[feldId], st = D.SCHRITTE[schritt];
    if (!f) return { ok: false, grund: 'Das Feld gehört dir nicht.' };
    if (jobAufFeld(feldId)) return { ok: false, grund: 'Hier arbeitet schon eine Maschine.' };
    if (st.von.indexOf(f.phase) < 0) return { ok: false, grund: 'Im Moment nicht möglich.' };
    if (schritt === 'duengen' && f.bonus.dg) return { ok: false, grund: 'Schon gedüngt.' };
    if (schritt === 'spritzen' && f.bonus.sp) return { ok: false, grund: 'Schon gespritzt.' };
    if (schritt === 'walzen' && f.bonus.wa) return { ok: false, grund: 'Schon gewalzt.' };
    if (schritt === 'walzen' && fortschrittWachstum(f, jetzt) > st.maxAnteil) return { ok: false, grund: 'Zu spät zum Walzen.' };
    if (schritt === 'kalken' && f.boden >= 90) return { ok: false, grund: 'Der Boden ist schon bestens.' };
    if (schritt === 'pfluegen' && f.phase === 'gepfluegt') return { ok: false, grund: 'Schon gepflügt.' };
    return { ok: true };
  }
  function kostenFuer(feldId, schritt, fruchtId) {
    const st = D.SCHRITTE[schritt], ha = D.feld(feldId).ha;
    if (schritt === 'saeen') return Math.round(D.frucht(fruchtId).saat * ha);
    return Math.round(st.kosten * ha);
  }

  function arbeitStarten(feldId, schritt, o, jetzt) {
    simuliere(jetzt);
    return starteIntern(feldId, schritt, o, jetzt);
  }
  function starteIntern(feldId, schritt, o, jetzt) {
    const st = D.SCHRITTE[schritt];
    const f = S.felder[feldId];
    const erl = schrittErlaubt(feldId, schritt, jetzt);
    if (!erl.ok) return erl;
    o = o || {};
    if (schritt === 'saeen') {
      const fr = D.frucht(o.frucht);
      if (!fr) return { ok: false, grund: 'Wähle eine Frucht.' };
      if (S.level < fr.lvl) return { ok: false, grund: fr.name + ' gibt es ab Level ' + fr.lvl + '.' };
    }
    let g = null, t = null;
    if (st.geraet) {
      g = maschine(o.geraet); t = maschine(o.traktor);
      if (!g || !t || !einsatzbereit(g) || !einsatzbereit(t)) return { ok: false, grund: 'Die Maschinen sind nicht frei.' };
      if (D.def(g.id).typ !== st.geraet) return { ok: false, grund: 'Falsches Gerät.' };
      if (D.def(t.id).ps < D.def(g.id).ps) return { ok: false, grund: D.def(g.id).name + ' braucht ' + D.def(g.id).ps + ' PS.' };
    } else {
      t = maschine(o.traktor);
      const fr = D.frucht(f.frucht);
      if (!t || !einsatzbereit(t) || D.def(t.id).art !== 'ernter') return { ok: false, grund: 'Die Erntemaschine ist nicht frei.' };
      if ((D.def(t.id).typ === 'rodemaschine') !== (fr.ernte === 'wurzel')) return { ok: false, grund: fr.ernte === 'wurzel' ? 'Kartoffeln und Rüben erntet der Roder.' : 'Das erntet der Mähdrescher.' };
    }
    const kosten = kostenFuer(feldId, schritt, o.frucht);
    if (S.geld < kosten) return { ok: false, grund: 'Dafür fehlen noch ' + Math.round(kosten - S.geld).toLocaleString('de-DE') + ' €.' };
    const tf = tempoFaktor();
    const sek = arbeitsSek(schritt, feldId, g ? D.def(g.id) : null, g ? null : D.def(t.id)) * verschleissFaktor(t) * (g ? verschleissFaktor(g) : 1) * wetter(jetzt).arbeit / tf / zugFaktor(D.def(t.id), g ? D.def(g.id) : null);
    const reise = wegLaenge(feldId) / (TRANSPORT_KMH * transportFaktor(D.def(t.id)) * KMH_PX) / tf;
    S.geld -= kosten;
    const job = { id: S.nextId++, feld: feldId, schritt, geraet: g ? g.uid : null, traktor: t.uid, start: jetzt, hin: Math.round(reise * 1000), arbeit: Math.round(sek * 1000), rueck: Math.round(reise * 1000), frucht: o.frucht || null, kosten, fertig: false };
    S.jobs.push(job);
    t.job = job.id; if (g) g.job = job.id;
    S.statistik.jobs++;
    S.statistik.jobsJe[schritt] = (S.statistik.jobsJe[schritt] || 0) + 1;
    ereignis('jobStart', { job });
    return { ok: true, job };
  }
  function arbeitAbbrechen(jobId) {
    const j = S.jobs.find(x => x.id === jobId);
    if (!j) return { ok: false, grund: 'Unbekannt.' };
    [j.geraet, j.traktor].forEach(u => { const m = u && maschine(u); if (m) m.job = null; });
    S.jobs.splice(S.jobs.indexOf(j), 1);
    return { ok: true };
  }

  // Wirkung eines fertigen Arbeitsschritts auf das Feld
  function jobWirkung(j) {
    const f = S.felder[j.feld], st = D.SCHRITTE[j.schritt], d = D.feld(j.feld);
    const ha = d.ha;
    const mg = j.geraet && maschine(j.geraet), mt = maschine(j.traktor);
    const gq = mg ? wirkungFaktor(D.def(mg.id)) : 1;   // Qualitaet des Geraets
    const zeitEnde = j.start + j.hin + j.arbeit;
    if (j.schritt === 'grubbern') f.phase = 'bearbeitet';
    else if (j.schritt === 'pfluegen') {
      if (f.phase === 'waechst' || f.phase === 'reif') { f.frucht = null; f.fort = 0; f.dauer = 0; f.bonus = { pf: 0, dg: 0, sp: 0, wa: 0 }; ereignis('umgebrochen', { feld: j.feld }); }
      f.phase = 'gepfluegt'; f.bonus.pf = gq;
    } else if (j.schritt === 'kalken') f.boden = Math.min(100, f.boden + 25);
    else if (j.schritt === 'saeen') {
      const fr = D.frucht(j.frucht);
      f.phase = 'waechst'; f.frucht = fr.id; f.fort = 0; f.fortZeit = zeitEnde; f.lern = false;
      f.dauer = Math.round(fr.dauer * 1000 / tempoFaktor());
    } else if (st.bonus) f.bonus[st.bonus] = gq;
    else if (j.schritt === 'ernten') {
      const fr = D.frucht(f.frucht);
      const kg = ha * fr.ertrag * 1000 * ertragsFaktor(f, fr.id) * (mt ? erntePlus(D.def(mt.id)) : 1);
      const r = lagerEin(fr.id, kg);
      S.statistik.geerntet += kg;
      S.statistik.ernteJe[fr.id] = (S.statistik.ernteJe[fr.id] || 0) + kg;
      albumSetzen('fruechte', fr.id);
      f.vorher.unshift(fr.id); f.vorher = f.vorher.slice(0, 2);
      f.boden = Math.max(20, f.boden - 10);
      f.bonus = { pf: 0, dg: 0, sp: 0, wa: 0 }; f.frucht = null; f.fort = 0; f.dauer = 0; f.phase = 'stoppel';
      ereignis('ernte', { feld: j.feld, gut: fr.id, kg, ueber: r.rest, erloes: r.erloes });
      if (S.anfang) { S.anfang = false; ereignis('anfangEnde'); }
    }
    xpGeben(Math.round(ha * st.xp * D.XP_FAKTOR));
    // Verschleiss
    const m1 = maschine(j.traktor), m2 = j.geraet && maschine(j.geraet);
    const stunden = j.arbeit * tempoFaktorAlt(j) / 3600000;
    [m1, m2].forEach(m => { if (m) m.zustand = Math.max(0, m.zustand - 4 * stunden * verschleissRate(D.def(m.id))); });
    j.fertig = true;
    ereignis('jobFertig', { job: j });
  }
  function tempoFaktorAlt(j) { return 1; }  // Verschleiss bezieht sich auf die (schon skalierte) Arbeitszeit

  // ----------------------------------------------------------------------------------------------
  // Fahrer: automatischer Anbau
  // ----------------------------------------------------------------------------------------------
  function bestesPaar(schritt, feldId, fruchtId) {
    const opts = optionen(feldId, schritt, fruchtId).filter(o => o.traktor);
    return opts.length ? opts[0] : null;
  }
  function autoPlaner(jetzt) {
    if (S.lohnOffen > 0) return;   // Lohn nicht bezahlt: die Fahrer streiken
    const ids = autoFelder().slice(0, S.fahrer);
    ids.forEach(id => {
      const f = S.felder[id];
      if (jobAufFeld(id)) return;
      let plan = [];
      if (f.phase === 'stoppel') plan = f.boden < 45 ? ['kalken', 'grubbern'] : ['grubbern'];
      else if (f.phase === 'waechst') plan = ['walzen'];
      for (const sch of plan) {
        if (!schrittErlaubt(id, sch, jetzt).ok) continue;
        const p = bestesPaar(sch, id, f.frucht);
        if (!p) continue;
        const r = starteIntern(id, sch, { geraet: p.geraet, traktor: p.traktor }, jetzt);
        if (r.ok) break;
      }
    });
  }

  // ----------------------------------------------------------------------------------------------
  // Verarbeitung
  // ----------------------------------------------------------------------------------------------
  function produktionBauen(id) {
    const b = D.betrieb(id);
    if (!b || S.produktion[id]) return { ok: false, grund: 'Schon gebaut.' };
    if (S.level < b.lvl) return { ok: false, grund: 'Ab Level ' + b.lvl + '.' };
    if (S.geld < b.preis) return { ok: false, grund: 'Es fehlen noch ' + Math.round(b.preis - S.geld).toLocaleString('de-DE') + ' €.' };
    S.geld -= b.preis; S.produktion[id] = { stufe: 0, queue: [] };
    albumSetzen('betriebe', id);
    return { ok: true };
  }
  function produktionAusbauen(id) {
    const p = S.produktion[id], b = D.betrieb(id);
    if (!p) return { ok: false, grund: 'Noch nicht gebaut.' };
    const n = D.PROD_STUFEN[p.stufe + 1];
    if (!n) return { ok: false, grund: 'Voll ausgebaut.' };
    const k = Math.round(b.preis * n.preis);
    if (S.geld < k) return { ok: false, grund: 'Es fehlen noch ' + Math.round(k - S.geld).toLocaleString('de-DE') + ' €.' };
    S.geld -= k; p.stufe++;
    return { ok: true };
  }
  function produktionStarten(id, rezeptId, anzahl, jetzt) {
    simuliere(jetzt);
    const p = S.produktion[id], b = D.betrieb(id);
    if (!p) return { ok: false, grund: 'Noch nicht gebaut.' };
    const r = b.rezepte.find(x => x.id === rezeptId);
    if (!r) return { ok: false, grund: 'Unbekanntes Rezept.' };
    if (p.queue.length >= 6) return { ok: false, grund: 'Die Warteschlange ist voll.' };
    anzahl = Math.max(1, Math.min(anzahl || 1, 6 - p.queue.length));
    let n = 0;
    while (n < anzahl && r.ein.every(z => (S.silo[z.gut] || 0) >= z.kg)) {
      r.ein.forEach(z => { S.silo[z.gut] -= z.kg; if (S.silo[z.gut] < 1) delete S.silo[z.gut]; });
      p.queue.push({ rez: r.id, start: null, dauer: 0 });
      n++;
    }
    if (!n) return { ok: false, grund: 'Dafür fehlt im Lager: ' + r.ein.map(z => (z.kg / 1000) + ' t ' + D.gut(z.gut).name).join(' + ') + '.' };
    prodAnstossen(p, id, jetzt);
    return { ok: true, anzahl: n };
  }
  function prodAnstossen(p, id, t) {
    const q = p.queue[0];
    if (!q || q.start != null) return;
    const r = D.betrieb(id).rezepte.find(x => x.id === q.rez);
    q.start = t;
    q.dauer = Math.round(r.sek * 1000 / D.PROD_STUFEN[p.stufe].faktor / tempoFaktor());
  }

  // ----------------------------------------------------------------------------------------------
  // Tiere
  // ----------------------------------------------------------------------------------------------
  const stall = id => S.tiere[id] || null;
  const tempoTiere = () => S.tempo || 1;
  function futterKap(d, st) { return st.anzahl * d.futterKgH * D.FUTTER_LAGER_H * tempoTiere(); }
  function lagerKap(d, st) { return st.anzahl * d.kgH * D.STALL_LAGER_H * tempoTiere(); }
  function futterImSilo(d) { return d.futter.reduce((a, g) => a + (S.silo[g] || 0), 0); }
  function nimmFutter(d, kg) {
    let rest = kg;
    d.futter.forEach(g => {
      const have = S.silo[g] || 0, nehmen = Math.min(have, rest);
      if (nehmen > 0) { S.silo[g] -= nehmen; if (S.silo[g] < 1) delete S.silo[g]; rest -= nehmen; }
    });
    return kg - rest;
  }
  function stallBauen(id) {
    const d = D.tier(id);
    if (!d || S.tiere[id]) return { ok: false, grund: 'Schon gebaut.' };
    if (S.level < d.lvl) return { ok: false, grund: d.stall + ' gibt es ab Level ' + d.lvl + '.' };
    if (S.geld < d.bau) return { ok: false, grund: 'Es fehlen noch ' + Math.round(d.bau - S.geld).toLocaleString('de-DE') + ' €.' };
    S.geld -= d.bau; S.tiere[id] = { stufe: 0, anzahl: 0, futter: 0, lager: 0, auto: false, voll: false };
    return { ok: true };
  }
  function tierKaufen(id, n) {
    const d = D.tier(id), st = stall(id);
    if (!st) return { ok: false, grund: 'Erst den Stall bauen.' };
    const frei = d.kap[st.stufe] - st.anzahl;
    if (frei <= 0) return { ok: false, grund: 'Der Stall ist voll – baue ihn aus.' };
    n = Math.min(n, frei);
    if (S.geld < n * d.tierPreis) { n = Math.floor(S.geld / d.tierPreis); if (n < 1) return { ok: false, grund: 'Es fehlen noch ' + Math.round(d.tierPreis - S.geld).toLocaleString('de-DE') + ' €.' }; }
    S.geld -= n * d.tierPreis; st.anzahl += n;
    albumSetzen('tiere', id);
    return { ok: true, anzahl: n };
  }
  function stallAusbauen(id) {
    const d = D.tier(id), st = stall(id);
    if (!st) return { ok: false, grund: 'Erst den Stall bauen.' };
    const k = d.ausbau[st.stufe + 1];
    if (k === undefined) return { ok: false, grund: 'Voll ausgebaut.' };
    if (S.geld < k) return { ok: false, grund: 'Es fehlen noch ' + Math.round(k - S.geld).toLocaleString('de-DE') + ' €.' };
    S.geld -= k; st.stufe++;
    return { ok: true };
  }
  function automatKaufen(id) {
    const d = D.tier(id), st = stall(id);
    if (!st || !d.automat) return { ok: false, grund: 'Das geht hier nicht.' };
    if (st.auto) return { ok: false, grund: 'Schon eingebaut.' };
    if (S.geld < d.automat) return { ok: false, grund: 'Es fehlen noch ' + Math.round(d.automat - S.geld).toLocaleString('de-DE') + ' €.' };
    S.geld -= d.automat; st.auto = true;
    return { ok: true };
  }
  function fuettern(id) {
    const d = D.tier(id), st = stall(id);
    if (!st || !st.anzahl || !d.futterKgH) return { ok: false, grund: 'Hier gibt es nichts zu füttern.' };
    const platz = futterKap(d, st) - st.futter;
    if (platz < 1) return { ok: false, grund: 'Der Futtervorrat ist schon voll.' };
    const kg = nimmFutter(d, platz);
    if (kg < 1) return { ok: false, grund: 'Im Silo fehlt Futter (' + d.futter.map(g => D.gut(g).name).join(' oder ') + ').' };
    st.futter += kg; S.statistik.gefuettert = (S.statistik.gefuettert || 0) + 1;
    return { ok: true, kg };
  }
  // Futter zukaufen (Landhandel, teuer: 1,9-facher Preis): damit Max nicht festsitzt, wenn sein Silo kein Futter hat
  function futterPreisProT(d) { return Math.min.apply(null, d.futter.map(g => Math.max(preis(g), grundPreis(g)))) * D.ZUKAUF_FAKTOR; }
  function futterKaufen(id) {
    const d = D.tier(id), st = stall(id);
    if (!st || !st.anzahl || !d.futterKgH) return { ok: false, grund: 'Hier gibt es nichts zu füttern.' };
    const platz = futterKap(d, st) - st.futter;
    if (platz < 1) return { ok: false, grund: 'Der Futtervorrat ist schon voll.' };
    const proKg = futterPreisProT(d) / 1000;
    const kg = Math.min(platz, Math.floor(S.geld / proKg));
    if (kg < 1) return { ok: false, grund: 'Für Futter fehlt dir das Geld (' + Math.round(proKg * 1000).toLocaleString('de-DE') + ' € je Tonne).' };
    const kosten = Math.round(kg * proKg);
    S.geld -= kosten; st.futter += kg;
    return { ok: true, kg, kosten };
  }
  // Notkauf von Feldfruechten fuers Lager (z.B. um einen Auftrag zu erfuellen oder Vieh/Betriebe zu versorgen): teuer und begrenzt
  function zukaufPreisProT(gut) { return Math.max(preis(gut), grundPreis(gut)) * D.ZUKAUF_FAKTOR; }
  function zukaufRestKg(jetzt) {
    const key = tagKey(jetzt || S.zeit);
    return D.ZUKAUF_MAX_TAG_KG - (S.zukaufTag && S.zukaufTag.datum === key ? S.zukaufTag.kg : 0);
  }
  function zukaufen(gut, kg, jetzt) {
    const fr = D.frucht(gut);
    if (!fr) return { ok: false, grund: 'Das kannst du nicht zukaufen.' };
    if (S.level < fr.lvl) return { ok: false, grund: fr.name + ' gibt es ab Level ' + fr.lvl + '.' };
    kg = Math.round(Number(kg));
    if (!(kg >= 100 && kg <= D.ZUKAUF_MAX_TAG_KG)) return { ok: false, grund: 'Ungültige Menge.' };
    const t = jetzt || S.zeit, key = tagKey(t);
    if (!S.zukaufTag || S.zukaufTag.datum !== key) S.zukaufTag = { datum: key, kg: 0 };
    const rest = D.ZUKAUF_MAX_TAG_KG - S.zukaufTag.kg;
    if (kg > rest) return { ok: false, grund: rest < 100 ? 'Heute hast du schon das Zukauf-Limit (' + (D.ZUKAUF_MAX_TAG_KG / 1000) + ' t) erreicht.' : 'Heute kannst du nur noch ' + (rest / 1000).toLocaleString('de-DE') + ' t zukaufen.' };
    const frei = siloKap() - lagerMenge();
    if (kg > frei) return { ok: false, grund: 'Im Silo ist nicht genug Platz.' };
    const kosten = Math.round(kg / 1000 * zukaufPreisProT(gut));
    if (S.geld < kosten) return { ok: false, grund: 'Es fehlen noch ' + Math.round(kosten - S.geld).toLocaleString('de-DE') + ' €.' };
    S.geld -= kosten; S.silo[gut] = (S.silo[gut] || 0) + kg; S.zukaufTag.kg += kg;
    S.statistik.zugekauft = (S.statistik.zugekauft || 0) + kg;
    return { ok: true, kg, kosten };
  }
  function einsammeln(id) {
    const d = D.tier(id), st = stall(id);
    if (!st || st.lager < 1) return { ok: false, grund: 'Es gibt noch nichts einzusammeln.' };
    const kg = st.lager;
    st.lager = 0; st.voll = false;
    const r = lagerEin(d.gut, kg);
    xpGeben(Math.round(kg / 25) + 5);
    S.statistik.eingesammelt++;
    return { ok: true, kg, gut: d.gut, ueber: r.rest, erloes: r.erloes };
  }
  // Stand eines Stalls fuer die Anzeige (hochgerechnet bis jetzt, ohne den Spielstand zu veraendern)
  function stallStand(id, jetzt) {
    const d = D.tier(id), st = stall(id);
    if (!st) return null;
    const rate = st.anzahl * d.kgH * tempoTiere();
    const futterStunden = d.futterKgH && st.anzahl ? st.futter / (st.anzahl * d.futterKgH * tempoTiere()) : (d.futterKgH ? 0 : 99);
    const w = wetter(jetzt);
    return { st, d, kap: d.kap[st.stufe], rateH: rate * w.tiere, lagerKap: lagerKap(d, st), futterKap: futterKap(d, st), futterStunden, futterSilo: futterImSilo(d), laeuft: st.anzahl > 0 && (!d.futterKgH || st.futter > 0 || (st.auto && futterImSilo(d) > 0)) };
  }

  // Lernrunde: je gewusster Karte waechst die Saat um einen Teil der Gesamtzeit weiter (einmal je Saat, hoechstens LERN_MAX_TAG Runden am Tag)
  function lernBeschleunigen(feldId, richtig, jetzt) {
    simuliere(jetzt);
    const f = S.felder[feldId];
    if (!f || f.phase !== 'waechst') return { ok: false, grund: 'Hier wächst gerade nichts.' };
    if (f.lern) return { ok: false, grund: 'Auf diesem Feld hast du schon gelernt – bei der nächsten Saat geht es wieder.' };
    const key = tagKey(jetzt);
    if (!S.lernTag || S.lernTag.datum !== key) S.lernTag = { datum: key, n: 0 };
    if (S.lernTag.n >= D.LERN_MAX_TAG) return { ok: false, grund: 'Heute hast du schon ' + D.LERN_MAX_TAG + ' Lernrunden gemacht – morgen wieder!' };
    richtig = Math.max(0, Math.min(D.LERN_KARTEN, Math.round(Number(richtig)) || 0));
    S.lernTag.n++;
    S.statistik.lerneinsaetze = (S.statistik.lerneinsaetze || 0) + 1;
    S.statistik.gelernt = (S.statistik.gelernt || 0) + richtig;
    let gespartMs = 0, reif = false;
    if (richtig > 0) {
      f.lern = true;
      const vorher = fortschrittWachstum(f, jetzt), neu = Math.min(1, vorher + D.LERN_PRO_KARTE * richtig);
      gespartMs = (neu - vorher) * f.dauer / wachsFaktor(f, jetzt);
      f.fort = neu; f.fortZeit = jetzt;
      if (neu >= 1) { f.phase = 'reif'; f.fort = 1; reif = true; ereignis('reif', { feld: feldId }); }
      xpGeben(richtig * 8);
    }
    return { ok: true, richtig, gespartMs, reif, rundenUebrig: D.LERN_MAX_TAG - S.lernTag.n };
  }
  // Tagesaufgabe der Schule (Ferientraining-Checkliste) geschafft: alle laufenden Arbeiten, wachsenden Felder und Produktionen
  // werden verkuerzt - adaptiv: quote (0..1) = Anteil beim ersten Versuch richtig. Mindestens 20-100 % von D.SCHUL_BONUS_MIN Minuten, bei guter Quote
  // einen grossen Teil der Restzeit (Quote^2), bei Quote 1 wird alles sofort fertig. Jede Aufgabe (id) zaehlt einmal am Tag.
  function schulMinuten(quote) { return Math.round(D.SCHUL_BONUS_MIN * (0.2 + 0.8 * Math.max(0, Math.min(1, Number(quote) || 0)))); }
  // Anteil der Restzeit, den eine Aufgabe auf einen Schlag erledigt: Quote^2 (alles richtig = alles fertig, 90 % = 81 %, 50 % = 25 %)
  function schulAnteil(quote) { const q = Math.max(0, Math.min(1, Number(quote) || 0)); return Math.round(q * q * 100) / 100; }
  function tagesaufgabeGeschafft(id, quote, jetzt) {
    simuliere(jetzt);
    id = String(id || '');
    if (!/^[a-z_]{1,24}$/.test(id)) return { ok: false, grund: 'Unbekannte Aufgabe.' };
    const key = tagKey(jetzt);
    if (!S.schulTag || S.schulTag.datum !== key) S.schulTag = { datum: key, ids: {}, ant: {} };
    if (!S.schulTag.ant) S.schulTag.ant = {};
    if (S.schulTag.ids[id]) return { ok: false, grund: 'Diese Aufgabe hat heute schon Zeit gespart.' };
    if (Object.keys(S.schulTag.ids).length >= 12) return { ok: false, grund: 'Für heute ist genug Zeit gespart.' };
    const min = schulMinuten(quote), anteil = schulAnteil(quote);
    S.schulTag.ids[id] = min; S.schulTag.ant[id] = anteil;
    const ms = min * 60000;
    // je laufender Sache: mindestens die Minuten, bei guter Quote aber einen grossen Teil der Restzeit (bei Quote 1 alles)
    const kuerzung = rest => Math.min(rest, Math.max(ms, Math.ceil(rest * anteil)));
    let jobs = 0, felder = 0, betriebe = 0;
    S.jobs.forEach(j => { j.start -= kuerzung(Math.max(0, j.start + j.hin + j.arbeit + j.rueck - jetzt)); jobs++; });
    Object.keys(S.felder).forEach(fid => {
      const f = S.felder[fid];
      if (f.phase !== 'waechst') return;
      const wf = wachsFaktor(f, jetzt), rest = Math.max(0, (1 - f.fort) * f.dauer / wf);
      f.fort = Math.min(1, f.fort + kuerzung(rest) * wf / Math.max(1, f.dauer)); f.fortZeit = jetzt; felder++;
      if (f.fort >= 0.9999) { f.phase = 'reif'; f.fort = 1; ereignis('reif', { feld: +fid }); }
    });
    Object.keys(S.produktion).forEach(bid => {
      const q = S.produktion[bid].queue[0];
      if (q && q.start != null) { q.start -= kuerzung(Math.max(0, q.start + q.dauer - jetzt)); betriebe++; }
    });
    S.statistik.schulaufgaben = (S.statistik.schulaufgaben || 0) + 1;
    xpGeben(25);
    simuliere(jetzt);
    return { ok: true, min, anteil, komplett: anteil >= 0.999, jobs, felder, betriebe };
  }
  function schulHeute(jetzt) {
    const key = tagKey(jetzt);
    return S.schulTag && S.schulTag.datum === key ? S.schulTag.ids : {};   // id -> gutgeschriebene Mindest-Minuten
  }
  function schulAnteileHeute(jetzt) {
    const key = tagKey(jetzt);
    return S.schulTag && S.schulTag.datum === key ? (S.schulTag.ant || {}) : {};
  }
  function lernRundenUebrig(jetzt) {
    const key = tagKey(jetzt);
    return D.LERN_MAX_TAG - (S.lernTag && S.lernTag.datum === key ? S.lernTag.n : 0);
  }

  // Zeit-Schritt: Pflanzenwachstum und Tiere bis 'bis' fortschreiben (Wetter ist im Intervall konstant)
  function schritt(bis) {
    const dt = bis - S.stepZeit;
    if (dt <= 0) return;
    const w = wetter(S.stepZeit);
    Object.keys(S.felder).forEach(id => {
      const f = S.felder[id];
      if (f.phase !== 'waechst') return;
      f.fort = Math.min(1, f.fort + dt / Math.max(1, f.dauer) * wachsFaktor(f, S.stepZeit));
      f.fortZeit = bis;
    });
    const h = dt / 3600000, tempo = tempoTiere();
    Object.keys(S.tiere).forEach(id => {
      const st = S.tiere[id], d = D.tier(id);
      if (!st.anzahl) return;
      let eff = 1;
      if (d.futterKgH > 0) {
        const bedarf = st.anzahl * d.futterKgH * h * tempo;
        if (st.auto) {
          const want = Math.min(futterKap(d, st) - st.futter, bedarf);
          if (want > 0) st.futter += nimmFutter(d, want);
        }
        const verbraucht = Math.min(st.futter, bedarf);
        st.futter -= verbraucht;
        eff = bedarf > 0 ? verbraucht / bedarf : 1;
      }
      const kap = lagerKap(d, st);
      st.lager = Math.min(kap, st.lager + st.anzahl * d.kgH * h * tempo * eff * w.tiere);
      if (!st.voll && st.lager >= kap - 0.01) { st.voll = true; ereignis('stallVoll', { id }); }
    });
    S.stepZeit = bis;
  }

  // ----------------------------------------------------------------------------------------------
  // Bestellungen
  // ----------------------------------------------------------------------------------------------
  function auftragErzeugen(jetzt) {
    const kandidaten = [];
    D.FRUECHTE.forEach(f => { if (S.level >= f.lvl) kandidaten.push({ id: f.id, kleinst: 4000, groesst: Math.min(60000, 8000 + S.level * 1500), wurzel: f.ernte === 'wurzel' }); });
    Object.keys(S.produktion).forEach(pid => {
      D.betrieb(pid).rezepte.forEach(r => kandidaten.push({ id: r.aus, kleinst: 500, groesst: Math.min(12000, 1500 + S.level * 300) }));
    });
    Object.keys(S.tiere).forEach(tid => {
      if (S.tiere[tid].anzahl > 0) kandidaten.push({ id: D.tier(tid).gut, kleinst: 100, groesst: Math.min(3000, 300 + S.level * 60), fein: true });
    });
    if (!kandidaten.length) return null;
    const k = kandidaten[Math.floor(Math.random() * kandidaten.length)];
    const schritt = k.wurzel ? 5000 : k.fein ? 100 : 1000;
    let kg = Math.round(rnd(k.kleinst, k.groesst) / schritt) * schritt;
    kg = Math.max(kg, k.kleinst - (k.kleinst % schritt) || schritt);
    const lohn = Math.round(kg / 1000 * grundPreis(k.id) * rnd(1.3, 1.7) / 50) * 50;
    return { id: S.nextId++, gut: k.id, kg, lohn, xp: 40 + Math.round(lohn / 250), bis: jetzt + Math.round(rnd(6, 20) * 3600000) };
  }
  function auftragLiefern(id) {
    const a = S.auftraege.find(x => x.id === id);
    if (!a) return { ok: false, grund: 'Der Auftrag ist weg.' };
    if ((S.silo[a.gut] || 0) < a.kg) return { ok: false, grund: 'Im Lager fehlen noch ' + ((a.kg - (S.silo[a.gut] || 0)) / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' t ' + D.gut(a.gut).name + '.' };
    S.silo[a.gut] -= a.kg; if (S.silo[a.gut] < 1) delete S.silo[a.gut];
    S.geld += a.lohn;
    S.auftraege.splice(S.auftraege.indexOf(a), 1);
    S.auftragNaechst = Math.max(S.auftragNaechst, S.zeit + 8 * 60000);
    S.statistik.auftraege++;
    xpGeben(a.xp);
    ereignis('auftragErledigt', { auftrag: a });
    return { ok: true, lohn: a.lohn, xp: a.xp };
  }

  // ----------------------------------------------------------------------------------------------
  // Album und Erfolge
  // ----------------------------------------------------------------------------------------------
  function albumSetzen(kat, id) {
    if (!S.album[kat]) S.album[kat] = {};
    if (!S.album[kat][id]) { S.album[kat][id] = 1; ereignis('karte', { kat, id }); }
  }
  function wetterGesehen(typ) { albumSetzen('wetter', typ); }
  function erfolgWert(wert) {
    const st = S.statistik;
    switch (wert) {
      case 'ernteT': return st.geerntet / 1000;
      case 'jobs': return st.jobs;
      case 'gruen': return (st.jobsJe.duengen || 0) + (st.jobsJe.spritzen || 0) + (st.jobsJe.walzen || 0);
      case 'pflug': return st.jobsJe.pfluegen || 0;
      case 'fruechte': return Object.keys(S.album.fruechte).length;
      case 'felder': return Object.keys(S.felder).length;
      case 'maschinen': return S.flotte.length;
      case 'kraft': return S.flotte.reduce((a, m) => Math.max(a, D.def(m.id).art === 'traktor' ? D.def(m.id).ps : 0), 0);
      case 'repariert': return st.repariert;
      case 'fahrer': return S.fahrer;
      case 'verkauft': return st.verkauft;
      case 'maxGeld': return st.maxGeld;
      case 'auftraege': return st.auftraege;
      case 'prod': return st.produziert;
      case 'betriebe': return Object.keys(S.produktion).length;
      case 'tiere': return Object.keys(S.tiere).reduce((a, k) => a + S.tiere[k].anzahl, 0);
      case 'tierarten': return Object.keys(S.tiere).filter(k => S.tiere[k].anzahl > 0).length;
      case 'eingesammelt': return st.eingesammelt;
      case 'wetter': return Object.keys(S.album.wetter).length;
      case 'level': return S.level;
      case 'tage': return st.tage.length;
      case 'saeen': return st.jobsJe.saeen || 0;
      case 'gelernt': return st.gelernt || 0;
      case 'lerneinsaetze': return st.lerneinsaetze || 0;
      case 'gefuettert': return st.gefuettert || 0;
      default: return 0;
    }
  }
  // Neu erreichte Erfolgsstufen feststellen (Belohnung bleibt zum Abholen liegen)
  function erfolgePruefen() {
    S.statistik.maxGeld = Math.max(S.statistik.maxGeld, S.geld);
    const neu = [];
    D.ERFOLGE.forEach(e => {
      const w = erfolgWert(e.wert);
      const rec = S.erfolge[e.id] || (S.erfolge[e.id] = { erreicht: 0, abgeholt: 0 });
      let n = 0;
      e.stufen.forEach(st => { if (w >= st.ziel) n++; });
      if (n > rec.erreicht) { for (let i = rec.erreicht; i < n; i++) neu.push({ id: e.id, name: e.name, icon: e.icon, stufe: i + 1, von: e.stufen.length }); rec.erreicht = n; }
    });
    if (neu.length) ereignis('erfolg', { neu });
  }
  function erfolgAbholen(id) {
    const e = D.ERFOLGE.find(x => x.id === id), rec = S.erfolge[id];
    if (!e || !rec || rec.abgeholt >= rec.erreicht) return { ok: false, grund: 'Hier gibt es nichts abzuholen.' };
    let geld = 0, xp = 0;
    for (let i = rec.abgeholt; i < rec.erreicht; i++) { geld += e.stufen[i].geld; xp += e.stufen[i].xp; }
    rec.abgeholt = rec.erreicht;
    S.geld += geld; xpGeben(xp);
    return { ok: true, geld, xp };
  }
  function albumSeite(id) {
    const seite = D.ALBUM.find(x => x.id === id);
    const karten = seite.karten().map(k => Object.assign({}, k, { frei: !!(S.album[seite.kat] && S.album[seite.kat][k.id]) }));
    const gesammelt = karten.filter(k => k.frei).length;
    return { seite, karten, gesammelt, fertig: gesammelt === karten.length, bonusAbgeholt: !!S.albumBonus[id] };
  }
  function albumBonusAbholen(id) {
    const a = albumSeite(id);
    if (!a.fertig) return { ok: false, grund: 'Die Seite ist noch nicht komplett.' };
    if (a.bonusAbgeholt) return { ok: false, grund: 'Der Bonus ist schon abgeholt.' };
    S.albumBonus[id] = 1; S.geld += a.seite.bonus.geld; xpGeben(a.seite.bonus.xp);
    return { ok: true, geld: a.seite.bonus.geld, xp: a.seite.bonus.xp };
  }
  // Anzahl abholbarer Belohnungen (fuer das Zeichen am Knopf)
  function abholbar() {
    let n = 0;
    D.ERFOLGE.forEach(e => { const r = S.erfolge[e.id]; if (r && r.erreicht > r.abgeholt) n++; });
    D.ALBUM.forEach(a => { if (!S.albumBonus[a.id] && albumSeite(a.id).fertig) n++; });
    if (S.tag) { S.tag.aufgaben.forEach(q => { if (q.fertig && !q.abgeholt) n++; }); if (S.tag.alle && !S.tag.bonusAbgeholt) n++; }
    return n;
  }
  function tagVermerken(t) {
    const d = new Date(t), key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    if (S.statistik.tage.indexOf(key) < 0) S.statistik.tage.push(key);
  }

  // ----------------------------------------------------------------------------------------------
  // Tagesaufgaben
  // ----------------------------------------------------------------------------------------------
  function tagKey(t) { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function gesternKey(t) { const d = new Date(t); d.setDate(d.getDate() - 1); return tagKey(d.getTime()); }
  function naechsterTag(t) { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); }
  function tagGeeignet(a) {
    const hatTiere = Object.keys(S.tiere).some(k => S.tiere[k].anzahl > 0);
    switch (a.id) {
      case 'gruen': return S.level >= 3 && S.flotte.some(m => ['duenger', 'spritze', 'walze'].indexOf(D.def(m.id).typ) >= 0);
      case 'eingesammelt': return hatTiere;
      case 'gefuettert': return Object.keys(S.tiere).some(k => S.tiere[k].anzahl > 0 && D.tier(k).futterKgH > 0);
      case 'lernen': return S.level >= 2 && Object.keys(S.felder).some(id => S.felder[id].phase === 'waechst' || S.felder[id].phase === 'stoppel');
      case 'produziert': return Object.keys(S.produktion).length > 0;
      case 'auftraege': return S.auftraege.some(o => (S.silo[o.gut] || 0) >= o.kg * 0.4);
      default: return true;
    }
  }
  function tagErzeugen(t) {
    const key = tagKey(t);
    const kand = D.TAGESAUFGABEN.filter(tagGeeignet);
    const seed = key.split('-').reduce((a, x) => a * 31 + (+x), 7) + (S.wetterSeed || 1);
    const gewaehlt = [];
    const pool = kand.slice();
    for (let i = 0; i < 3 && pool.length; i++) {
      const k = Math.floor(hash(seed * 17 + i * 101) * pool.length);
      gewaehlt.push(pool.splice(k, 1)[0]);
    }
    return {
      datum: key, alle: false, bonusAbgeholt: false,
      aufgaben: gewaehlt.map(a => ({ art: a.id, ziel: a.ziel(S.level), basis: erfolgWert(a.stat), fertig: false, abgeholt: false, geld: D.tagGeld(S.level), xp: D.tagXp(S.level) }))
    };
  }
  const tagArt = id => D.TAGESAUFGABEN.find(a => a.id === id);
  function tagWert(q) { return Math.max(0, erfolgWert(tagArt(q.art).stat) - q.basis); }
  function serieAktuell(t) {
    return S.serie.letzter === tagKey(t) || S.serie.letzter === gesternKey(t) ? S.serie.tage : 0;
  }
  function tagPruefen(t) {
    const key = tagKey(t);
    if (!S.tag || S.tag.datum !== key) { S.tag = tagErzeugen(t); ereignis('tagNeu', {}); }
    S.tag.aufgaben.forEach(q => {
      if (!q.fertig && tagWert(q) >= q.ziel) { q.fertig = true; ereignis('tagFertig', { art: q.art }); }
    });
    if (!S.tag.alle && S.tag.aufgaben.length && S.tag.aufgaben.every(q => q.fertig)) {
      S.tag.alle = true;
      if (S.serie.letzter !== key) { S.serie.tage = S.serie.letzter === gesternKey(t) ? S.serie.tage + 1 : 1; S.serie.letzter = key; }
      ereignis('tagAlle', { serie: S.serie.tage });
    }
  }
  function tagAbholen(i) {
    const q = S.tag && S.tag.aufgaben[i];
    if (!q || !q.fertig || q.abgeholt) return { ok: false, grund: 'Hier gibt es nichts abzuholen.' };
    q.abgeholt = true; S.geld += q.geld; xpGeben(q.xp);
    return { ok: true, geld: q.geld, xp: q.xp };
  }
  function tagBonus(t) {
    const summe = S.tag.aufgaben.reduce((a, q) => a + q.geld, 0);
    const serie = Math.max(1, serieAktuell(t));
    const faktor = 0.8 * (1 + Math.min(0.5, 0.05 * (serie - 1)));
    return { geld: Math.round(summe * faktor / 50) * 50, xp: Math.round(S.tag.aufgaben.reduce((a, q) => a + q.xp, 0) * 0.8), serie };
  }
  function tagBonusAbholen(t) {
    if (!S.tag || !S.tag.alle) return { ok: false, grund: 'Erst alle drei Aufgaben schaffen.' };
    if (S.tag.bonusAbgeholt) return { ok: false, grund: 'Der Tagesbonus ist schon abgeholt.' };
    const b = tagBonus(t);
    S.tag.bonusAbgeholt = true; S.geld += b.geld; xpGeben(b.xp);
    return { ok: true, geld: b.geld, xp: b.xp, serie: b.serie };
  }

  // ----------------------------------------------------------------------------------------------
  // Zeit fortschreiben
  // ----------------------------------------------------------------------------------------------
  function naechstes(bis) {
    let best = null;
    const kand = (zeit, art, ref) => { if (zeit <= bis && (!best || zeit < best.zeit)) best = { zeit, art, ref }; };
    S.jobs.forEach(j => {
      if (!j.fertig) kand(j.start + j.hin + j.arbeit, 'jobWirkung', j);
      else kand(j.start + j.hin + j.arbeit + j.rueck, 'jobEnde', j);
    });
    Object.keys(S.felder).forEach(id => {
      const f = S.felder[id];
      if (f.phase === 'waechst') kand(f.fortZeit + (1 - f.fort) * f.dauer / wachsFaktor(f, S.stepZeit), 'reif', Number(id));
    });
    kand((Math.floor(S.zeit / D.WETTER_SLOT_MS) + 1) * D.WETTER_SLOT_MS, 'wetter', null);
    Object.keys(S.produktion).forEach(id => { const p = S.produktion[id]; if (p.queue[0] && p.queue[0].start != null) kand(p.queue[0].start + p.queue[0].dauer, 'prod', id); });
    S.auftraege.forEach(a => kand(a.bis, 'auftragAblauf', a));
    if (S.auftraege.length < 4) kand(S.auftragNaechst, 'auftragNeu', null);
    kand(S.preisZeit + 600000, 'preis', null);
    return best;
  }
  function simuliere(jetzt) {
    if (jetzt < S.zeit) jetzt = S.zeit;      // Uhr zurueckgestellt: ignorieren
    let guard = 0;
    for (;;) {
      if (guard++ > 6000) break;
      const e = naechstes(jetzt);
      if (!e) break;
      S.zeit = Math.max(S.zeit, e.zeit);
      schritt(S.zeit);
      if (e.art === 'jobWirkung') jobWirkung(e.ref);
      else if (e.art === 'jobEnde') {
        const j = e.ref;
        [j.geraet, j.traktor].forEach(u => { const m = u && maschine(u); if (m) m.job = null; });
        S.jobs.splice(S.jobs.indexOf(j), 1);
        autoPlaner(S.zeit);
      } else if (e.art === 'reif') {
        const f = S.felder[e.ref]; f.phase = 'reif'; f.fort = 1;
        ereignis('reif', { feld: e.ref });
        autoPlaner(S.zeit);
      } else if (e.art === 'prod') {
        const p = S.produktion[e.ref], q = p.queue.shift(), r = D.betrieb(e.ref).rezepte.find(x => x.id === q.rez);
        const res = lagerEin(r.aus, r.ausKg);
        xpGeben(25);
        S.statistik.produziert++;
        ereignis('prodFertig', { betrieb: e.ref, gut: r.aus, kg: r.ausKg, ueber: res.rest });
        if (p.queue[0]) prodAnstossen(p, e.ref, S.zeit);
      } else if (e.art === 'auftragAblauf') {
        S.auftraege.splice(S.auftraege.indexOf(e.ref), 1);
        S.auftragNaechst = Math.max(S.auftragNaechst, S.zeit + 5 * 60000);
        ereignis('auftragAbgelaufen', { auftrag: e.ref });
      } else if (e.art === 'auftragNeu') {
        const a = auftragErzeugen(S.zeit);
        if (a) { S.auftraege.push(a); ereignis('auftragNeu', { auftrag: a }); }
        S.auftragNaechst = S.zeit + 15 * 60000;
      } else if (e.art === 'wetter') {
        ereignis('wetter', { typ: wetterTyp(S.zeit), zeit: S.zeit });
      } else if (e.art === 'preis') {
        S.preisZeit += 600000;
        D.alleGueter().forEach(g => { S.preise[g] = zahl(S.preise[g] + (1 - S.preise[g]) * 0.1 + (Math.random() - 0.5) * 0.09, D.PREIS_MIN, D.PREIS_MAX); });
      }
    }
    S.zeit = jetzt;
    schritt(jetzt);
    autoPlaner(jetzt);
    if (S.anfang && jetzt - S.erstellt > 3 * 3600000) { S.anfang = false; ereignis('anfangEnde'); }
    lohnPruefen(jetzt);
    tagVermerken(jetzt);
    tagPruefen(jetzt);
    erfolgePruefen();
  }

  // ----------------------------------------------------------------------------------------------
  // Abfragen fuer Anzeige
  // ----------------------------------------------------------------------------------------------
  // Fortschritt eines Jobs: { teil: 'hin'|'arbeit'|'rueck', p (0..1 im Teil), gesamt (0..1), restMs bis Arbeitsende }
  function jobStand(j, jetzt) {
    const t = jetzt - j.start;
    if (t < j.hin) return { teil: 'hin', p: t / Math.max(1, j.hin), gesamt: 0, arbeitP: 0, restMs: j.hin + j.arbeit - t };
    if (t < j.hin + j.arbeit) return { teil: 'arbeit', p: (t - j.hin) / Math.max(1, j.arbeit), arbeitP: (t - j.hin) / Math.max(1, j.arbeit), restMs: j.hin + j.arbeit - t };
    return { teil: 'rueck', p: Math.min(1, (t - j.hin - j.arbeit) / Math.max(1, j.rueck)), arbeitP: 1, restMs: 0 };
  }
  function feldStand(id, jetzt) {
    const f = S.felder[id];
    if (!f) return null;
    const j = jobAufFeld(id);
    return { feld: f, job: j, jobStand: j ? jobStand(j, jetzt) : null, wachstum: fortschrittWachstum(f, jetzt), restWachsen: restWachsen(id, jetzt) };
  }
  function moeglicheSchritte(feldId, jetzt) {
    return D.SCHRITT_REIHENFOLGE.filter(s => D.SCHRITTE[s].von.indexOf(S.felder[feldId].phase) >= 0).map(s => ({ schritt: s, erlaubt: schrittErlaubt(feldId, s, jetzt) }));
  }

  return {
    SPEICHER, neu, laden, speichern, stand, beiEreignis, simuliere,
    feldKaufen, maschineKaufen, maschineVerkaufen, maschineReparieren, verkaufswert, reparaturKosten, lagerAusbauen, fahrerKaufen, autoSetzen, autoFelder,
    arbeitStarten, arbeitAbbrechen, optionen, schrittErlaubt, kostenFuer, produktionBauen, produktionAusbauen, produktionStarten,
    auftragLiefern, verkaufen, preis, grundPreis, lagerMenge, siloKap, maschine, jobAufFeld, ertragsFaktor, ertragsSchaetzungKg, fruchtfolgeHinweis,
    fortschrittWachstum, jobStand, feldStand, moeglicheSchritte, wegPunkte, wegLaenge, arbeitsSek, tempoFaktor, xpGeben,
    tagAbholen, tagBonusAbholen, tagBonus, tagWert, tagArt, serieAktuell, naechsterTag,
    lernBeschleunigen, lernRundenUebrig, lohnProTag, fahrerLohn, futterKaufen, futterPreisProT, zukaufen, zukaufPreisProT, zukaufRestKg, tagesaufgabeGeschafft, schulHeute, schulAnteileHeute, schulMinuten, schulAnteil, maschinenVorteile,
    albumSeite, albumBonusAbholen, abholbar, erfolgWert, erfolgAbholen, erfolgePruefen, wetterGesehen,
    wetter, wetterTyp, wetterVorschau, wetterstationKaufen, beregnungKaufen, restWachsen, jahreszeit,
    stallBauen, tierKaufen, stallAusbauen, automatKaufen, fuettern, einsammeln, stallStand,
    tempoSetzen(x) { S.tempo = x; }
  };
})();
