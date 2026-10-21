// Hof-Farm: Spiellogik (ohne DOM, ohne Zeichnen). Alles ist zeitstempel-basiert: Auftraege, Wachstum, Produktion und
// Bestellungen werden mit simuliere(jetzt) fortgeschrieben - auch ueber Stunden, in denen die App zu war. Der ganze
// Spielstand ist ein einfaches JSON-Objekt (spaeter synchronisierbar, z. B. fuer Mitspielen am Handy ueber den Pi).
const FarmModell = (function () {
  const D = FarmDaten;
  const KMH_PX = 4.2;                 // Pixel/s je km/h (nur fuer Wegzeiten)
  const TRANSPORT_KMH = 28;
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
    return { phase: 'stoppel', frucht: null, pflanz: 0, reife: 0, bonus: { pf: 0, dg: 0, sp: 0, wa: 0 }, boden: 70, vorher: [], auto: null };
  }
  function maschineNeu(defId) { return { uid: S.nextId++, id: defId, zustand: 100, job: null }; }
  function neu(jetzt) {
    S = {
      v: 2, geld: D.STARTGELD, xp: 0, level: 1, zeit: jetzt, tempo: 1, anfang: true, felder: {}, flotte: [], jobs: [], silo: {},
      preise: {}, produktion: {}, auftraege: [], auftragNaechst: jetzt, preisZeit: jetzt, fahrer: 0, siloStufe: 0, nextId: 1,
      statistik: { verkauft: 0, geerntet: 0, auftraege: 0, jobs: 0 }, erstellt: jetzt, hilfe: {}, ton: true
    };
    D.STARTFELDER.forEach(id => { S.felder[id] = feldNeu(); });
    D.STARTFLOTTE.forEach(id => { S.flotte.push(maschineNeu(id)); });
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
  function verschleissFaktor(m) { return m.zustand >= 50 ? 1 : 1 + (50 - m.zustand) / 50 * 0.6; }
  const einsatzbereit = m => !m.job && m.zustand >= 15;

  // Ertragsfaktor fuer ein Feld (zum Erntezeitpunkt)
  function ertragsFaktor(f, fruchtId) {
    const fr = D.frucht(fruchtId);
    let faktor = 0.75 + 0.25 * f.boden / 100;
    faktor *= 1 + D.BONUS.pf * f.bonus.pf + D.BONUS.dg * f.bonus.dg + D.BONUS.sp * f.bonus.sp + D.BONUS.wa * f.bonus.wa;
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
    return zahl((jetzt - f.pflanz) / Math.max(1, f.reife - f.pflanz), 0, 1);
  }

  // ----------------------------------------------------------------------------------------------
  // Level / Geld / Lager
  // ----------------------------------------------------------------------------------------------
  function xpGeben(n) {
    S.xp += n;
    while (S.xp >= D.xpFuerLevel(S.level)) {
      S.xp -= D.xpFuerLevel(S.level);
      S.level++;
      const bonus = S.level * 500;
      S.geld += bonus;
      ereignis('level', { level: S.level, bonus });
    }
  }
  function lagerEin(gutId, kg) {
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
    xpGeben(Math.round(erloes / 80));
    if (S.anfang) { S.anfang = false; ereignis('anfangEnde'); }
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
    S.geld -= k; m.zustand = 100;
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
    return { ok: true };
  }
  function autoFelder() { return Object.keys(S.felder).filter(id => S.felder[id].auto).map(Number); }
  function autoSetzen(feldId, fruchtId) {
    const f = S.felder[feldId];
    if (!f) return { ok: false, grund: 'Das Feld gehört dir nicht.' };
    if (!fruchtId) { f.auto = null; return { ok: true }; }
    if (!f.auto && autoFelder().length >= S.fahrer) return { ok: false, grund: 'Dafür brauchst du einen freien Fahrer (im Händler unter „Fahrer“).' };
    const fr = D.frucht(fruchtId);
    if (!fr || S.level < fr.lvl) return { ok: false, grund: 'Diese Frucht gibt es noch nicht.' };
    f.auto = { frucht: fruchtId };
    return { ok: true };
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
        res.push({ geraet: g.uid, traktor: t.uid, traktoren: traktoren.filter(x => D.def(x.id).ps >= gd.ps).map(x => x.uid), sek: arbeitsSek(schritt, feldId, gd, null) * verschleissFaktor(g) * verschleissFaktor(t) });
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
    const sek = arbeitsSek(schritt, feldId, g ? D.def(g.id) : null, g ? null : D.def(t.id)) * verschleissFaktor(t) * (g ? verschleissFaktor(g) : 1) / tf;
    const reise = wegLaenge(feldId) / (TRANSPORT_KMH * KMH_PX) / tf;
    S.geld -= kosten;
    const job = { id: S.nextId++, feld: feldId, schritt, geraet: g ? g.uid : null, traktor: t.uid, start: jetzt, hin: Math.round(reise * 1000), arbeit: Math.round(sek * 1000), rueck: Math.round(reise * 1000), frucht: o.frucht || null, kosten, fertig: false };
    S.jobs.push(job);
    t.job = job.id; if (g) g.job = job.id;
    S.statistik.jobs++;
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
    const zeitEnde = j.start + j.hin + j.arbeit;
    if (j.schritt === 'grubbern') f.phase = 'bearbeitet';
    else if (j.schritt === 'pfluegen') {
      if (f.phase === 'waechst' || f.phase === 'reif') { f.frucht = null; f.pflanz = 0; f.reife = 0; f.bonus = { pf: 0, dg: 0, sp: 0, wa: 0 }; ereignis('umgebrochen', { feld: j.feld }); }
      f.phase = 'gepfluegt'; f.bonus.pf = 1;
    } else if (j.schritt === 'kalken') f.boden = Math.min(100, f.boden + 25);
    else if (j.schritt === 'saeen') {
      const fr = D.frucht(j.frucht);
      f.phase = 'waechst'; f.frucht = fr.id; f.pflanz = zeitEnde;
      f.reife = zeitEnde + Math.round(fr.dauer * 1000 / tempoFaktor());
    } else if (st.bonus) f.bonus[st.bonus] = 1;
    else if (j.schritt === 'ernten') {
      const fr = D.frucht(f.frucht);
      const kg = ha * fr.ertrag * 1000 * ertragsFaktor(f, fr.id);
      const r = lagerEin(fr.id, kg);
      S.statistik.geerntet += kg;
      f.vorher.unshift(fr.id); f.vorher = f.vorher.slice(0, 2);
      f.boden = Math.max(20, f.boden - 10);
      f.bonus = { pf: 0, dg: 0, sp: 0, wa: 0 }; f.frucht = null; f.pflanz = 0; f.reife = 0; f.phase = 'stoppel';
      ereignis('ernte', { feld: j.feld, gut: fr.id, kg, ueber: r.rest, erloes: r.erloes });
    }
    xpGeben(Math.round(ha * st.xp));
    // Verschleiss
    const m1 = maschine(j.traktor), m2 = j.geraet && maschine(j.geraet);
    const stunden = j.arbeit * tempoFaktorAlt(j) / 3600000;
    [m1, m2].forEach(m => { if (m) m.zustand = Math.max(0, m.zustand - 4 * stunden); });
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
    const ids = autoFelder().slice(0, S.fahrer);
    ids.forEach(id => {
      const f = S.felder[id];
      if (jobAufFeld(id)) return;
      let plan = [];
      if (f.phase === 'stoppel') plan = f.boden < 45 ? ['kalken', 'grubbern'] : ['grubbern'];
      else if (f.phase === 'bearbeitet' || f.phase === 'gepfluegt') plan = ['saeen'];
      else if (f.phase === 'waechst') plan = ['duengen', 'spritzen', 'walzen'];
      else if (f.phase === 'reif') plan = ['ernten'];
      for (const sch of plan) {
        if (!schrittErlaubt(id, sch, jetzt).ok) continue;
        const fr = sch === 'saeen' ? f.auto.frucht : f.frucht;
        if (sch === 'saeen' && S.level < D.frucht(f.auto.frucht).lvl) continue;
        const p = bestesPaar(sch, id, fr);
        if (!p) continue;
        const r = starteIntern(id, sch, { geraet: p.geraet, traktor: p.traktor, frucht: f.auto.frucht }, jetzt);
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
    anzahl = Math.max(1, Math.min(anzahl || 1, 6 - p.queue.length));
    if (p.queue.length >= 6) return { ok: false, grund: 'Die Warteschlange ist voll.' };
    let n = 0;
    while (n < anzahl && (S.silo[r.ein] || 0) >= r.einKg) {
      S.silo[r.ein] -= r.einKg; if (S.silo[r.ein] < 1) delete S.silo[r.ein];
      p.queue.push({ rez: r.id, start: null, dauer: 0 });
      n++;
    }
    if (!n) return { ok: false, grund: 'Dafür fehlen ' + (r.einKg / 1000) + ' t ' + D.gut(r.ein).name + ' im Lager.' };
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
  // Bestellungen
  // ----------------------------------------------------------------------------------------------
  function auftragErzeugen(jetzt) {
    const kandidaten = [];
    D.FRUECHTE.forEach(f => { if (S.level >= f.lvl) kandidaten.push({ id: f.id, kleinst: 4000, groesst: Math.min(60000, 8000 + S.level * 1500), wurzel: f.ernte === 'wurzel' }); });
    Object.keys(S.produktion).forEach(pid => {
      D.betrieb(pid).rezepte.forEach(r => kandidaten.push({ id: r.aus, kleinst: 500, groesst: Math.min(12000, 1500 + S.level * 300) }));
    });
    if (!kandidaten.length) return null;
    const k = kandidaten[Math.floor(Math.random() * kandidaten.length)];
    const schritt = k.wurzel ? 5000 : 1000;
    let kg = Math.round(rnd(k.kleinst, k.groesst) / schritt) * schritt;
    kg = Math.max(kg, k.kleinst - (k.kleinst % schritt) || schritt);
    const lohn = Math.round(kg / 1000 * grundPreis(k.id) * rnd(1.3, 1.7) / 50) * 50;
    return { id: S.nextId++, gut: k.id, kg, lohn, xp: 100 + Math.round(lohn / 100), bis: jetzt + Math.round(rnd(6, 20) * 3600000) };
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
  // Zeit fortschreiben
  // ----------------------------------------------------------------------------------------------
  function naechstes(bis) {
    let best = null;
    const kand = (zeit, art, ref) => { if (zeit <= bis && (!best || zeit < best.zeit)) best = { zeit, art, ref }; };
    S.jobs.forEach(j => {
      if (!j.fertig) kand(j.start + j.hin + j.arbeit, 'jobWirkung', j);
      else kand(j.start + j.hin + j.arbeit + j.rueck, 'jobEnde', j);
    });
    Object.keys(S.felder).forEach(id => { const f = S.felder[id]; if (f.phase === 'waechst') kand(f.reife, 'reif', Number(id)); });
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
      if (e.art === 'jobWirkung') jobWirkung(e.ref);
      else if (e.art === 'jobEnde') {
        const j = e.ref;
        [j.geraet, j.traktor].forEach(u => { const m = u && maschine(u); if (m) m.job = null; });
        S.jobs.splice(S.jobs.indexOf(j), 1);
        autoPlaner(S.zeit);
      } else if (e.art === 'reif') {
        const f = S.felder[e.ref]; f.phase = 'reif';
        ereignis('reif', { feld: e.ref });
        autoPlaner(S.zeit);
      } else if (e.art === 'prod') {
        const p = S.produktion[e.ref], q = p.queue.shift(), r = D.betrieb(e.ref).rezepte.find(x => x.id === q.rez);
        const res = lagerEin(r.aus, r.ausKg);
        xpGeben(25);
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
      } else if (e.art === 'preis') {
        S.preisZeit += 600000;
        D.alleGueter().forEach(g => { S.preise[g] = zahl(S.preise[g] + (1 - S.preise[g]) * 0.1 + (Math.random() - 0.5) * 0.09, D.PREIS_MIN, D.PREIS_MAX); });
      }
    }
    S.zeit = jetzt;
    autoPlaner(jetzt);
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
    return { feld: f, job: j, jobStand: j ? jobStand(j, jetzt) : null, wachstum: fortschrittWachstum(f, jetzt), restWachsen: f.phase === 'waechst' ? Math.max(0, f.reife - jetzt) : 0 };
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
    tempoSetzen(x) { S.tempo = x; }
  };
})();
