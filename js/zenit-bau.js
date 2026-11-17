// ZENIT – Montagehalle: freier Raketenbau aus Teilen (ohne DOM, in Node testbar: node tools/zenit/bau_test.js)
//
// Die Rakete ist ein Stapel von unten nach oben. Trennringe teilen ihn in Stufen: Jede Stufe zündet ihr unterstes
// Triebwerk und verbrennt den Treibstoff aller Tanks darüber bis zum nächsten Trennring. Seitenblöcke hängen an der
// untersten Stufe (2 oder 4). Oben sitzt die Nutzlast des Auftrags, wahlweise unter einer Verkleidung.
// Aus dem Stapel werden echte Stufen für die Flugphysik (zenit-flug.js); die Prognose fliegt die Rakete einmal mit
// dem Bordcomputer durch und sagt, wie weit sie kommt. Teilewerte und Preise: tools/zenit/QUELLEN.md.
const ZenitBau = (function () {
  'use strict';
  const F = typeof ZenitFlug !== 'undefined' ? ZenitFlug : require('./zenit-flug.js');
  const G0 = 9.80665;

  // art: triebwerk | tank | trenner | booster | huelle | nutz. masse = leer (kg), treib = Treibstoff (kg), preis in Mio. (Spielwert)
  // hoehe/d in Metern für die Zeichnung. Triebwerke: Schub am Boden (tsl) und im Vakuum (tvac), spezifischer Impuls (isp, Vakuum).
  const KATALOG = {
    rd108: { art: 'triebwerk', name: 'RD-108', kurz: 'Triebwerk der Kernstufe', masse: 1278, tsl: 745e3, tvac: 941e3, isp: 315, preis: 12, hoehe: 2.9, d: 2.06, kammern: 4, lenk: 4,
      text: 'Vier Brennkammern und vier kleine Schwenkdüsen zum Lenken. Läuft vom Start bis in die Umlaufbahn.' },
    tankS: { art: 'tank', name: 'Tank klein', kurz: 'Kerosin + Sauerstoff', masse: 1100, treib: 15000, preis: 2, hoehe: 3.2, d: 2.95,
      text: '15 t Treibstoff. Kleine Tanks sind im Verhältnis schwerer als große.' },
    tankM: { art: 'tank', name: 'Tank mittel', kurz: 'Kerosin + Sauerstoff', masse: 2000, treib: 30000, preis: 3.5, hoehe: 6.2, d: 2.95, text: '30 t Treibstoff.' },
    tankL: { art: 'tank', name: 'Tank groß', kurz: 'Kerosin + Sauerstoff', masse: 2800, treib: 45000, preis: 5, hoehe: 9.0, d: 2.95,
      text: '45 t Treibstoff. Je größer der Tank, desto weniger wiegt er im Verhältnis zum Inhalt.' },
    trenner: { art: 'trenner', name: 'Trennring', kurz: 'teilt die Rakete in Stufen', masse: 350, preis: 1, hoehe: .8, d: 2.95,
      text: 'Darunter eine Stufe, darüber die nächste. Ist die untere leer, wird sie abgeworfen.' },
    seitenblock: { art: 'booster', name: 'Seitenblock', kurz: 'RD-107, fertig mit Tank', masse: 3800, treib: 39700, tsl: 814e3, tvac: 1000e3, isp: 313, preis: 9, hoehe: 19.6, d: 2.68,
      text: 'Hängt seitlich an der untersten Stufe, immer zu zweit oder zu viert. Brennt ab dem Start mit und fällt leer ab.' },
    verkleidung: { art: 'huelle', name: 'Nasenverkleidung', kurz: 'schützt die Nutzlast', masse: 900, preis: 1.5, hoehe: 3.6, d: 2.0,
      text: 'Schützt die Nutzlast vor dem Fahrtwind. Oben in der dünnen Luft wird sie abgesprengt.' },
    sputnik: { art: 'nutz', name: 'Sputnik 1', masse: 83.6, preis: 0, hoehe: 2.9, d: .58, text: 'Kugel mit 58 cm Durchmesser und vier Antennen.' },
  };
  // Aufträge: welche Teile es gibt, Budget (mehr geht nicht) und die Grenzen für Silber und Gold
  const AUFTRAEGE = {
    sputnik: { nutz: 'sputnik', teile: ['rd108', 'tankS', 'tankM', 'tankL', 'trenner', 'seitenblock', 'verkleidung'], budget: 70, silber: 60, gold: 54,
      bahn: { tief: 150000 }, echt: { stapel: ['rd108', 'tankS', 'tankM', 'tankL'], booster: 4, huelle: true } },
  };
  const BOOSTER_N = [0, 2, 4];

  const leer = auftrag => ({ auftrag, stapel: [], booster: 0, huelle: false });
  const klon = b => ({ ...b, stapel: b.stapel.slice() });
  const nutzlast = b => KATALOG[AUFTRAEGE[b.auftrag].nutz];

  /** Stufen aus dem Stapel: zwischen den Trennringen, von unten nach oben */
  function stufen(b) {
    const liste = []; let akt = null;
    const neu = () => (akt = { teile: [], triebwerk: null, totTriebwerke: 0, masse: 0, treib: 0, preis: 0 });
    neu();
    b.stapel.forEach((id, i) => {
      const T = KATALOG[id];
      akt.teile.push(i); akt.masse += T.masse; akt.preis += T.preis;
      if (T.art === 'trenner') { liste.push(akt); neu(); return; }   // Ring fliegt mit der Stufe darunter weg
      if (T.art === 'triebwerk') { if (akt.teile.length === 1 && !akt.triebwerk) akt.triebwerk = id; else akt.totTriebwerke++; }
      if (T.art === 'tank') akt.treib += T.treib;
    });
    if (akt.teile.length) liste.push(akt);
    return liste;
  }
  const preis = b => b.stapel.reduce((s, id) => s + KATALOG[id].preis, 0) + b.booster * KATALOG.seitenblock.preis + (b.huelle ? KATALOG.verkleidung.preis : 0);
  function startmasse(b) {
    let m = nutzlast(b).masse + (b.huelle ? KATALOG.verkleidung.masse : 0);
    for (const id of b.stapel) m += KATALOG[id].masse + (KATALOG[id].treib && KATALOG[id].art === 'tank' ? KATALOG[id].treib : 0);
    return m + b.booster * (KATALOG.seitenblock.masse + KATALOG.seitenblock.treib);
  }
  function startschub(b) {
    const st = stufen(b)[0], T = st && st.triebwerk && st.treib > 0 ? KATALOG[st.triebwerk] : null;
    return (T ? T.tsl : 0) + b.booster * KATALOG.seitenblock.tsl;
  }
  const schubZuGewicht = b => startschub(b) / (startmasse(b) * G0);

  /** Was ein Ingenieur am Stapel sofort sieht – ohne Lösungshinweis, nur der Befund am Teil */
  function befunde(b) {
    const out = [], st = stufen(b);
    if (!b.stapel.length) return [{ art: 'leer' }];
    st.forEach((s, n) => {
      const nurRing = s.teile.length === 1 && KATALOG[b.stapel[s.teile[0]]].art === 'trenner';
      if (nurRing) { out.push({ art: 'ring_leer', i: s.teile[0], stufe: n }); return; }
      if (!s.triebwerk) out.push({ art: 'ohne_triebwerk', i: s.teile[0], stufe: n });
      else if (!s.treib) out.push({ art: 'ohne_tank', i: s.teile[0], stufe: n });
      if (s.totTriebwerke) s.teile.forEach((i, k) => { if (k > 0 && KATALOG[b.stapel[i]].art === 'triebwerk') out.push({ art: 'triebwerk_innen', i, stufe: n }); });
    });
    if (b.booster && (!st[0] || !st[0].triebwerk)) out.push({ art: 'booster_ohne_kern' });
    return out;
  }

  /** Stapel → Stufen für die Flugphysik anmelden, gibt die Bauliste für ZenitFlug.neu zurück */
  function flugDef(b) {
    const k = {}, st = stufen(b);
    st.slice(0, 6).forEach((s, n) => {
      const T = s.triebwerk ? KATALOG[s.triebwerk] : null, brennt = T && s.treib > 0;
      F.setze('b' + (n + 1), { art: 'stufe', name: `Stufe ${n + 1}`, masse: s.masse + s.treib, leer: brennt ? s.masse : s.masse + s.treib,
        tvac: brennt ? T.tvac : 0, tsl: brennt ? T.tsl : 0, isp: T ? T.isp : 300, triebwerk: T ? T.name : null });
      k['b' + (n + 1)] = 1;
    });
    for (let n = st.length; n < 6; n++) F.setze('b' + (n + 1), { art: 'stufe', name: '', masse: 0, leer: 0, tvac: 0, isp: 300 });
    if (b.booster) { const S = KATALOG.seitenblock; F.setze('bB', { art: 'booster', name: S.name, masse: S.masse + S.treib, leer: S.masse, tsl: S.tsl, tvac: S.tvac, isp: S.isp, triebwerk: 'RD-107' }); k.bB = b.booster; }
    if (b.huelle) { F.setze('bH', { art: 'huelle', name: 'Nasenverkleidung', masse: KATALOG.verkleidung.masse }); k.bH = 1; }
    k[AUFTRAEGE[b.auftrag].nutz] = 1;
    return k;
  }

  /** Tempo-Vorrat der ganzen Rakete im leeren Raum (Raketengleichung, km/s): erst alle Triebwerke zusammen, bis die
   *  Seitenblöcke leer sind, dann jede Stufe allein. Am Boden liefern die Triebwerke weniger, darum unten etwas abgezogen. */
  function tempoVorrat(b) {
    const st = stufen(b); if (!st.length) return 0;
    const SB = KATALOG.seitenblock, md = T => T.tvac / (T.isp * G0);
    let m = startmasse(b), dv = 0;
    st.forEach((s, n) => {
      const T = s.triebwerk && s.treib > 0 ? KATALOG[s.triebwerk] : null;
      let rest = s.treib;
      if (n === 0 && b.booster && T) {
        const tB = SB.treib / md(SB), verbrK = Math.min(rest, md(T) * tB), verbr = b.booster * SB.treib + verbrK;
        const isp = (b.booster * SB.tvac + T.tvac) / (b.booster * md(SB) + md(T)) / G0 - 25;
        dv += isp * G0 * Math.log(m / (m - verbr)); m -= verbr + b.booster * SB.masse; rest -= verbrK;
      } else if (n === 0 && b.booster) m -= b.booster * (SB.masse + SB.treib);
      if (T && rest > 0) dv += (T.isp - (n === 0 && !b.booster ? 25 : 0)) * G0 * Math.log(m / (m - rest));
      m -= rest + s.masse;
      if (n === 0 && b.huelle) m -= KATALOG.verkleidung.masse;
    });
    return dv / 1000;
  }
  const NOETIG = 9.6;   // km/s: rund 7,8 km/s Bahntempo plus Verluste durch Schwerkraft und Luft (im Flugmodell gemessen: ab 9,6 erreichen R-7-Bauten die Bahn)

  /** Tempo, das der restliche Treibstoff noch bringen kann (Raketengleichung über die verbleibenden Stufen) */
  function reserve(S) {
    let m = F.masse(S), dv = 0;
    if (S.seiten > 0 && S.seitenTreib > 0) return Infinity;
    S.stufen.forEach((s, n) => {
      const T = F.TEILE[s.id];
      if (s.treib > 0 && T.tvac > 0) dv += T.isp * G0 * Math.log(m / (m - s.treib));
      m -= s.treib + T.leer;
    });
    return dv;
  }

  // Lenkprogramme des Bordcomputers: steil (kräftige Rakete) und flach (schwache Oberstufe); die Prognose nimmt das bessere
  const PROGRAMME = [F.ZIEL, F.ZIEL_WOSTOK, { kipp: 800, h1: 40000, w1: 66, p: .55, H: 200000, k: .02, steilMax: .75 }];
  /** Flug mit dem Bordcomputer durchrechnen: wie weit kommt die Rakete? Liefert auch den Kurs für die Hilfslinie. */
  function fliege(b, Z, opt = {}) {
    const k = flugDef(b), S = F.neu(k), bahnMin = AUFTRAEGE[b.auftrag].bahn.tief, pfad = [];
    S.an = true;
    let maxH = 0, ende = 'leer', naechst = 0, tTrenn = 0;
    while (S.t < 1200) {
      S.neig = F.zielNeigung(S, Z);
      F.weiter(S, .2, .02);
      const h = F.hoehe(S); maxH = Math.max(maxH, h);
      if (S.t >= naechst) { pfad.push({ t: S.t, x: S.x, y: S.y, neig: S.neig, h }); naechst += 2; }
      if (!S.abgehoben) { if (S.t > 3) { ende = 'boden'; break; } continue; }
      if (h < -1) { ende = 'absturz'; break; }
      if (F.seitenLeer(S)) F.seitenAb(S);
      if (S.huelle && h > 85000) F.verkleidungAb(S);
      if (F.stufeLeer(S) && F.obenNoch(S) && !S.seiten && S.t > tTrenn) { F.stufeAb(S); tTrenn = S.t + 1; }
      const B = F.bahn(S);
      if (!S.aus && B.tief >= bahnMin + 10000) { F.abschalten(S); ende = 'bahn'; break; }
      if (S.aus && !F.obenNoch(S)) { ende = B.tief >= bahnMin ? 'bahn' : 'leer'; break; }
      if (!S.aus && F.stufeLeer(S) && !F.obenNoch(S)) { ende = 'leer'; break; }
      if (h < maxH - 5000 && F.teile(S).hoch < -200) { ende = 'faellt'; break; }
    }
    const B = F.bahn(S);
    return { ende, bahn: ende === 'bahn', maxH, tief: B.tief, hoch: B.hoch, reserve: ende === 'bahn' ? reserve(S) : 0, t: S.t, pfad, Z, maxQ: S.maxQ };
  }
  /** Prognose der Montagehalle: Chance 0 (hebt nicht ab) … 4 (Umlaufbahn mit viel Reserve) */
  function prognose(b) {
    const twr = schubZuGewicht(b), m = startmasse(b);
    const basis = { twr, masse: m, schub: startschub(b), preis: preis(b), chance: 0, ergebnis: null };
    if (!b.stapel.length || twr <= 1.0) return { ...basis, grund: twr <= 1 && b.stapel.length ? 'zu_schwer' : 'leer' };
    let best = null;
    for (const Z of PROGRAMME) {
      const r = fliege(b, Z);
      const wert = r.bahn ? 1e6 + r.reserve : r.maxH;
      if (!best || wert > best.wert) best = { ...r, wert };
    }
    const chance = best.ende === 'boden' ? 0 : !best.bahn ? (best.maxH > 100000 ? 1 : 0) : best.reserve < 150 ? 2 : best.reserve < 600 ? 3 : 4;
    return { ...basis, chance, ergebnis: best, grund: best.bahn ? 'bahn' : best.maxH > 100000 ? 'weltraum' : best.ende === 'boden' ? 'zu_schwer' : 'zu_kurz' };
  }

  /** Kurs halten: Soll-Neigung, damit die Rakete auf der Ideallinie (durch die Ringe) bleibt.
   *  Neigung des Idealflugs an dieser Stelle + Korrektur, wenn die Rakete über/unter der Linie liegt oder wegdriftet.
   *  j0 = zuletzt gefundener Punkt (spart Suchen). neig = null: Ende der Linie erreicht. */
  function kursZiel(kurs, S, j0 = 1) {
    if (!kurs || kurs.length < 4) return null;
    let j = Math.max(1, j0), best = Infinity;
    for (let i = Math.max(1, j0 - 3); i < Math.min(kurs.length - 1, j0 + 30); i++) { const d = Math.hypot(S.x - kurs[i].x, S.y - kurs[i].y); if (d < best) { best = d; j = i; } }
    if (j >= kurs.length - 2) return { j, neig: null, ab: 0 };
    const a = kurs[j - 1], P = kurs[j], b = kurs[j + 1];
    let dx = b.x - a.x, dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    let nx = -dy, ny = dx; if (nx * P.x + ny * P.y < 0) { nx = -nx; ny = -ny; }   // Normale zeigt von der Erde weg
    const s = Math.max(-1, Math.min(1, ((S.x - P.x) * dx + (S.y - P.y) * dy) / (l / 2)));
    const basis = s >= 0 ? P.neig + (b.neig - P.neig) * s : P.neig + (P.neig - a.neig) * s;
    const ab = (S.x - P.x) * nx + (S.y - P.y) * ny, vn = S.vx * nx + S.vy * ny;
    return { j, neig: basis + Math.max(-15, Math.min(15, ab / 800 + vn / 40)), ab };
  }
  /** Ringe entlang der Ideallinie: Höhe, Punkt, Richtung, Toleranz quer zur Linie (Spielwerte) */
  function ringe(kurs) {
    const wp = [];
    for (const h of [8, 20, 35, 55, 80, 110, 140]) {
      const j = kurs.findIndex(q => q.h >= h * 1000); if (j < 1 || j >= kurs.length - 1) continue;
      const a = kurs[j - 1], b = kurs[j + 1], l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      wp.push({ x: kurs[j].x, y: kurs[j].y, h: kurs[j].h, tol: 3000 + .12 * kurs[j].h, dx: (b.x - a.x) / l, dy: (b.y - a.y) / l, st: 0 });
    }
    return wp;
  }
  /** Ring geprüft, sobald die Rakete seine Ebene durchstößt: 1 = durch, -1 = vorbei, 0 = noch nicht */
  function ringPruefen(p, S) {
    if (p.st) return p.st;
    const rx = S.x - p.x, ry = S.y - p.y;
    if (rx * p.dx + ry * p.dy < 0) return 0;
    return Math.abs(-rx * p.dy + ry * p.dx) <= p.tol ? 1 : -1;
  }

  return { kursZiel, ringe, ringPruefen, NOETIG, tempoVorrat, KATALOG, AUFTRAEGE, BOOSTER_N, leer, klon, stufen, preis, startmasse, startschub, schubZuGewicht, befunde, flugDef, fliege, prognose, reserve, nutzlast };
})();
if (typeof module !== 'undefined') module.exports = ZenitBau;
