// ZENIT – Flugphysik: Aufstieg, Umlaufbahn, Bremsen und Rückkehr (ohne DOM, in Node testbar: node tools/zenit/flug_physik_test.js)
//
// Rechnet in echten Einheiten (m, s, kg, N) in einer Ebene durch den Erdmittelpunkt: Schwerkraft μ/r², Luftwiderstand
// mit Dichte ρ0·e^(−h/8,5 km), Schub zwischen Bodenwert und Vakuumwert, Treibstoffverbrauch aus dem spezifischen Impuls.
// Die Bahn nach Brennschluss folgt aus Energie und Drehimpuls (Kepler) – Tief-/Hochpunkt und Umlaufzeit sind also echt
// ausgerechnet, nicht gespielt. Beim Wiedereintritt: Bremsung durch die Luft (g-Kraft) und Hitze nach Sutton-Graves.
// Quellen der Teilewerte und alle Spielwerte: tools/zenit/QUELLEN.md.
const ZenitFlug = (function () {
  'use strict';
  const MU = 3.986004418e14, R = 6371000, G0 = 9.80665, HS = 8500, RHO0 = 1.225;

  // art: booster (hängt seitlich an der ersten Stufe), stufe (übereinander, von unten nach oben), nutz (Nutzlast), huelle
  const TEILE = {
    // R-7-Unterstufe (Sputnik und Wostok): RD-107 (Seitenblock) und RD-108 (Kernstufe). Massen = Spielwerte.
    kern: { art: 'stufe', name: 'Kernstufe Block A', masse: 92000, leer: 7500, tvac: 941e3, tsl: 745e3, isp: 315, triebwerk: 'RD-108' },
    seite: { art: 'booster', name: 'Seitenblock', masse: 43500, leer: 3800, tvac: 1000e3, tsl: 814e3, isp: 313, triebwerk: 'RD-107' },
    // Auftrag 1: Sputnik
    sputnik: { art: 'nutz', name: 'Sputnik 1', masse: 83.6 },
    verkleidung: { art: 'huelle', name: 'Nasenverkleidung', masse: 900 },
    // Auftrag 2: Wostok-K mit Wostok 1. RD-0109: 54,5 kN, Isp 323,5 s. Massen Block E und Verkleidung = Spielwerte.
    kernW: { art: 'stufe', name: 'Kernstufe Block A', masse: 97000, leer: 6500, tvac: 941e3, tsl: 745e3, isp: 315, triebwerk: 'RD-108' },
    seiteW: { art: 'booster', name: 'Seitenblock', masse: 43000, leer: 3400, tvac: 1000e3, tsl: 814e3, isp: 313, triebwerk: 'RD-107' },
    blockE: { art: 'stufe', name: 'Oberstufe Block E', masse: 7775, leer: 1440, tvac: 54.5e3, isp: 323.5, triebwerk: 'RD-0109' },
    verkleidungW: { art: 'huelle', name: 'Nasenverkleidung', masse: 1000 },
    geraet: { art: 'nutz', name: 'Geräteteil', masse: 2270, treib: 275, tvac: 15.83e3, isp: 266, triebwerk: 'TDU-1' },
    kugel: { art: 'nutz', name: 'Landekugel', masse: 2460, d: 2.3 },
  };
  const STUFEN = ['kern', 'kernW', 'blockE'];           // von unten nach oben
  const NUTZ = ['geraet', 'kugel', 'sputnik'];
  const HUELLEN = ['verkleidung', 'verkleidungW'];
  const BOOSTER = ['seite', 'seiteW'];
  const BAHN_MIN = 150000;                     // Tiefpunkt über 150 km = Umlaufbahn
  const BREMS_DAUER = 40;                      // s, Bremszündung Wostok 1
  const KABEL_HOEHE = 110000;                  // Spielregel: hier reißen die Kabel zum Geräteteil (echt: rund 10 min nach dem Bremsen)
  const VERLUST = [0, 1500, 1500];             // m/s Schwerkraft- und Luftverluste je Stufenzahl (aus dem Flugmodell gemessen)

  const ERD_W = 2 * Math.PI / 86164;          // rad/s, die Erde dreht sich unter der Bahn weiter (Sterntag)
  /** Wo steht ein Ort der Erde (Lage auf dem Flugweg in Grad, Startplatz = 0) zur Zeit t – als Bogen der Bahnebene */
  const ortBogen = (grad, t) => grad * Math.PI / 180 + ERD_W * t;
  const kreisTempo = h => Math.sqrt(MU / (R + h));
  const dichte = h => (h > 150000 ? 0 : RHO0 * Math.exp(-Math.max(h, 0) / HS));
  const anz = (k, id) => (k[id] === true ? 1 : k[id] || 0);
  const mdot = T => T.tvac / (T.isp * G0);

  // ------------------------------------------------ Rakete in der Montagehalle (k: Teil → Anzahl)
  function plan(k) {
    const typ = BOOSTER.find(id => anz(k, id)) || 'seite';
    return { seitenTyp: typ, seiten: anz(k, typ), stufen: STUFEN.filter(id => anz(k, id)), nutz: NUTZ.filter(id => anz(k, id)),
      huelle: HUELLEN.find(id => anz(k, id)) || null };
  }
  function startmasse(k) { let m = 0; for (const id in k) if (TEILE[id]) m += anz(k, id) * TEILE[id].masse; return m; }
  function startschub(k) {
    const p = plan(k), erste = p.stufen[0] && TEILE[p.stufen[0]];
    return p.seiten * TEILE[p.seitenTyp].tsl + (erste ? (erste.tsl ?? erste.tvac) : 0);
  }
  /** Rakete hebt ab, wenn der Schub größer ist als das Gewicht */
  const schubZuGewicht = k => { const m = startmasse(k); return m ? startschub(k) / (m * G0) : 0; };
  /** Geschwindigkeit, die die Rakete im leeren Raum erreichen könnte (Raketengleichung, alle Stufen) minus Verluste
   *  durch Schwerkraft und Luft – Anzeige in der Montagehalle */
  function tempoSchaetzung(k) {
    const p = plan(k); if (!p.stufen.length) return 0;
    const Sb = TEILE[p.seitenTyp], erste = TEILE[p.stufen[0]];
    let m = startmasse(k), dv = 0, rest = erste.masse - erste.leer;
    if (p.seiten > 0) {
      const brennS = (Sb.masse - Sb.leer) / mdot(Sb), verbrE = Math.min(rest, mdot(erste) * brennS);
      const verbr = p.seiten * (Sb.masse - Sb.leer) + verbrE;
      const isp = (p.seiten * Sb.tvac + erste.tvac) / (p.seiten * mdot(Sb) + mdot(erste)) / G0 - 22;   // −22 s: am Boden schwächer
      dv += isp * G0 * Math.log(m / (m - verbr));
      m -= verbr + p.seiten * Sb.leer; rest -= verbrE;
    }
    dv += erste.isp * G0 * Math.log(m / (m - rest)); m -= rest + erste.leer;
    if (p.huelle) m -= TEILE[p.huelle].masse;
    for (const id of p.stufen.slice(1)) {
      const T = TEILE[id], t = T.masse - T.leer;
      dv += T.isp * G0 * Math.log(m / (m - t)); m -= t + T.leer;
    }
    return Math.max(0, dv - VERLUST[Math.min(p.stufen.length, 2)]);
  }

  // ------------------------------------------------ Flug
  function neu(k) {
    const p = plan(k), Sb = TEILE[p.seitenTyp];
    return {
      x: 0, y: R, vx: 0, vy: 0, t: 0, bogen: 0, neig: 0, abgehoben: false, an: false, aus: false,
      seitenTyp: p.seitenTyp, seiten: p.seiten, seitenTreib: p.seiten * (Sb.masse - Sb.leer),
      stufen: p.stufen.map(id => ({ id, treib: TEILE[id].masse - TEILE[id].leer })),
      nutz: p.nutz.slice(), geraetTreib: p.nutz.includes('geraet') ? TEILE.geraet.treib : 0, huelle: p.huelle,
      bremsen: false, bremsT: 0, gebremst: false, kabelT: null,
      q: 0, maxQ: 0, g: 0, maxG: 0, hitze: 0, maxHitze: 0,
    };
  }
  const klon = S => ({ ...S, stufen: S.stufen.map(s => ({ ...s })), nutz: S.nutz.slice() });
  function masse(S) {
    let m = S.seiten * TEILE[S.seitenTyp].leer + S.seitenTreib;
    for (const s of S.stufen) m += TEILE[s.id].leer + s.treib;
    for (const id of S.nutz) m += id === 'geraet' ? TEILE.geraet.masse - TEILE.geraet.treib + S.geraetTreib : TEILE[id].masse;
    if (S.huelle) m += TEILE[S.huelle].masse;
    return m;
  }
  /** Luftwiderstand × Fläche (m²) – Spielwerte: Rakete mit/ohne Seitenblöcke, Raumschiff, Kugel (Ø 2,3 m) */
  function cda(S) {
    if (S.seiten > 0) return 9;
    if (S.stufen.length) return 3.5;
    if (S.nutz.includes('geraet')) return 5.5;
    if (S.nutz.includes('kugel')) return 4.2;
    return 1;
  }
  const hoehe = S => Math.hypot(S.x, S.y) - R;
  const tempo = S => Math.hypot(S.vx, S.vy);
  /** Tempo senkrecht (hoch) und waagerecht (seitwärts, Richtung Osten) */
  function teile(S) {
    const r = Math.hypot(S.x, S.y), ux = S.x / r, uy = S.y / r;
    return { hoch: S.vx * ux + S.vy * uy, seit: S.vx * uy - S.vy * ux };
  }
  /** Anteil Treibstoff: Seitenblöcke, die gerade brennende Stufe und das Bremstriebwerk (0…1) */
  function tank(S) {
    const Sb = TEILE[S.seitenTyp], st = S.stufen[0];
    return { seiten: S.seiten ? S.seitenTreib / (S.seiten * (Sb.masse - Sb.leer)) : 0,
      stufe: st ? st.treib / (TEILE[st.id].masse - TEILE[st.id].leer) : 0, stufeId: st ? st.id : null,
      bremse: S.nutz.includes('geraet') ? S.geraetTreib / TEILE.geraet.treib : 0 };
  }
  function schub(S) {
    const r = { N: 0, md: 0, seitenAn: false, rueck: false };
    if (S.bremsen && S.geraetTreib > 0) { const G = TEILE.geraet; r.N = G.tvac; r.md = mdot(G); r.rueck = true; return r; }
    if (!S.an || S.aus) return r;
    const p = Math.exp(-Math.max(0, hoehe(S)) / HS), st = S.stufen[0];
    if (st && st.treib > 0) { const T = TEILE[st.id], tsl = T.tsl ?? T.tvac; r.N += T.tvac - (T.tvac - tsl) * p; r.md += mdot(T); }
    if (S.seiten > 0 && S.seitenTreib > 0) {
      const Sb = TEILE[S.seitenTyp]; r.seitenAn = true;
      r.N += S.seiten * (Sb.tvac - (Sb.tvac - Sb.tsl) * p); r.md += S.seiten * mdot(Sb);
    }
    return r;
  }
  function schritt(S, dt) {
    const r = Math.hypot(S.x, S.y), ux = S.x / r, uy = S.y / r, h = r - R;
    const sb = schub(S), m = masse(S), v = Math.hypot(S.vx, S.vy);
    let dx, dy;
    if (sb.rueck) { dx = v > 0 ? -S.vx / v : 0; dy = v > 0 ? -S.vy / v : 0; }       // Bremstriebwerk zeigt nach vorn
    else { const w = S.neig * Math.PI / 180; dx = ux * Math.cos(w) + uy * Math.sin(w); dy = uy * Math.cos(w) - ux * Math.sin(w); }
    const rho = dichte(h);
    S.q = 0.5 * rho * v * v; S.maxQ = Math.max(S.maxQ, S.q);
    const fw = S.q * cda(S);
    // Beschleunigung ohne Schwerkraft = das, was man an Bord spürt (g-Kraft)
    const axS = (sb.N * dx - (v > 0 ? fw * S.vx / v : 0)) / m, ayS = (sb.N * dy - (v > 0 ? fw * S.vy / v : 0)) / m;
    if (!S.abgehoben) {                          // hängt im Startgerüst, bis der Schub das Gewicht übersteigt
      if (sb.N <= m * G0) { S.t += dt; return S; }
      S.abgehoben = true;
    }
    S.g = Math.hypot(axS, ayS) / G0; S.maxG = Math.max(S.maxG, S.g);
    S.hitze = 1.7415e-4 * Math.sqrt(rho / 1.15) * v * v * v / 1e6;     // MW/m², Sutton-Graves, Nasenradius 1,15 m
    S.maxHitze = Math.max(S.maxHitze, S.hitze);
    const ox = S.x, oy = S.y, r3 = r * r * r;
    S.vx += (-MU * S.x / r3 + axS) * dt; S.vy += (-MU * S.y / r3 + ayS) * dt;
    S.x += S.vx * dt; S.y += S.vy * dt; S.t += dt;
    S.bogen -= Math.atan2(ox * S.y - oy * S.x, ox * S.x + oy * S.y);    // Weg über dem Boden als Winkel, ostwärts positiv
    if (sb.md > 0) {
      if (sb.rueck) {
        S.geraetTreib = Math.max(0, S.geraetTreib - sb.md * dt); S.bremsT += dt;
        if (S.bremsT >= BREMS_DAUER || S.geraetTreib <= 0) { S.bremsen = false; S.gebremst = true; }
      } else {
        const st = S.stufen[0];
        if (st && st.treib > 0) st.treib = Math.max(0, st.treib - mdot(TEILE[st.id]) * dt);
        if (sb.seitenAn) S.seitenTreib = Math.max(0, S.seitenTreib - S.seiten * mdot(TEILE[S.seitenTyp]) * dt);
        if (!st || st.treib <= 0) S.aus = true;  // Brennschluss der Stufe
      }
    }
    if (S.gebremst && S.kabelT === null && S.nutz.includes('geraet') && h < KABEL_HOEHE) { kugelAb(S); S.kabelT = S.t; }
    return S;
  }
  /** Schrittweite: fein bei Schub und in der Luft, grob im leeren Raum */
  function dtFuer(S) { return schub(S).N > 0 ? 0.02 : hoehe(S) < 150000 ? 0.05 : 0.5; }
  function weiter(S, dauer, dtMax = Infinity) {
    let t = 0;
    while (t < dauer - 1e-9) { const h = Math.min(dtFuer(S), dtMax, dauer - t); schritt(S, h); t += h; }
    return S;
  }
  const seitenLeer = S => S.seiten > 0 && S.seitenTreib <= 0;
  function seitenAb(S) { if (S.seiten > 0) { S.seiten = 0; S.seitenTreib = 0; return true; } return false; }
  function verkleidungAb(S) { if (S.huelle) { S.huelle = null; return true; } return false; }
  const stufeLeer = S => S.stufen.length > 0 && S.stufen[0].treib <= 0;
  const obenNoch = S => S.stufen.length > 1;
  /** Untere Stufe abtrennen – die nächste zündet sofort */
  function stufeAb(S) { if (!S.stufen.length || S.seiten > 0) return false; S.stufen.shift(); S.aus = !S.stufen.length; return true; }
  function abschalten(S) { S.aus = true; }
  /** Nutzlast trennt sich von der letzten Stufe: ab jetzt fliegt nur noch das Raumschiff */
  function raumschiffAb(S) { S.stufen = []; S.seiten = 0; S.seitenTreib = 0; S.huelle = null; S.aus = true; }
  function bremsen(S) { if (S.geraetTreib > 0 && !S.bremsen && !S.gebremst) { S.bremsen = true; S.bremsT = 0; return true; } return false; }
  function kugelAb(S) { S.nutz = S.nutz.filter(id => id !== 'geraet'); S.geraetTreib = 0; }

  /** Bahn aus Ort und Tempo (ohne Schub): Tief-/Hochpunkt über dem Boden, Umlaufzeit in s */
  function bahn(S) {
    const r = Math.hypot(S.x, S.y), v2 = S.vx * S.vx + S.vy * S.vy, eps = v2 / 2 - MU / r;
    const hm = S.x * S.vy - S.y * S.vx;
    if (eps >= 0) return { offen: true, tief: Infinity, hoch: Infinity, umlauf: Infinity };
    const a = -MU / (2 * eps), e = Math.sqrt(Math.max(0, 1 + 2 * eps * hm * hm / (MU * MU)));
    return { offen: false, a, e, tief: a * (1 - e) - R, hoch: a * (1 + e) - R, umlauf: 2 * Math.PI * Math.sqrt(a * a * a / MU) };
  }
  const umlaufbahn = S => bahn(S).tief >= BAHN_MIN;

  /** Ziel-Neigung des Bordcomputers (Grad von senkrecht). Unten ein festes Wendeprogramm durch die Luft, oben eine
   *  Regelung wie bei echten Raketen: so steil, dass die Rakete genau bis zur Zielhöhe steigt und dort waagerecht wird.
   *  Weil sie auf den tatsächlichen Flug schaut, gleicht sie Steuerfehler von Max wieder aus. Z: Lenkwerte des Auftrags. */
  const ZIEL = { kipp: 1000, h1: 50000, w1: 58, p: 0.6, H: 220000, k: 0.02 };
  // Wostok-K: flacher durch die Luft, damit die schwache Oberstufe schon viel Tempo vorfindet (im Test robust bis ±10°)
  const ZIEL_WOSTOK = { kipp: 1000, h1: 50000, w1: 74, p: 0.5, H: 210000, k: 0.02, steilMax: 0.6 };
  function zielNeigung(S, Z = ZIEL) {
    const h = hoehe(S);
    if (h < Z.kipp) return 0;
    const unten = Z.w1 * Math.pow(Math.min(1, (h - Z.kipp) / (Z.h1 - Z.kipp)), Z.p);
    if (h < Z.h1 * 0.8) return unten;
    const { hoch, seit } = teile(S), r = R + h, sb = schub(S), m = masse(S);
    if (!sb.N) return unten;
    const gEff = MU / (r * r) - seit * seit / r;                    // Schwerkraft minus Fliehkraft
    const vSoll = Math.sqrt(2 * Math.max(0, gEff) * Math.max(0, Z.H - h)) * 0.8;
    const soll = gEff + Z.k * (vSoll - hoch) * 9.81;
    // Z.steilMax: schwache Oberstufe nie steiler als nötig lenken – lieber kurz sinken und waagerecht Tempo holen
    const sinA = Math.max(-0.35, Math.min(Z.steilMax ?? 0.95, soll * m / sb.N));
    const oben = 90 - Math.asin(sinA) * 180 / Math.PI;
    const f = Math.min(1, (h - Z.h1 * 0.8) / (Z.h1 * 0.4));         // weich überblenden
    return unten * (1 - f) + oben * f;
  }

  /** Vorhersage ohne Schub und ohne Luft: Punkte der Bahn für die nächste Zeit (endet beim Aufschlag) */
  function vorhersage(S, dauer = 6000, n = 160) {
    const P = { x: S.x, y: S.y, vx: S.vx, vy: S.vy }, dt = dauer / n, pkt = [[P.x, P.y]];
    let aufschlag = false;
    for (let i = 0; i < n && !aufschlag; i++) {
      const k = 8, h = dt / k;
      for (let j = 0; j < k; j++) {
        const r = Math.hypot(P.x, P.y), f = -MU / (r * r * r);
        P.vx += f * P.x * h; P.vy += f * P.y * h; P.x += P.vx * h; P.y += P.vy * h;
        if (Math.hypot(P.x, P.y) < R) { aufschlag = true; break; }
      }
      pkt.push([P.x, P.y]);
    }
    return { pkt, aufschlag };
  }
  /** Wo käme das Raumschiff herunter? Rechnet mit Luft und (falls mitBremsen) mit sofortiger Bremszündung bis hEnde.
   *  Gleiches Rechenverfahren wie der Flug selbst, darum stimmt die Vorhersage mit dem echten Ablauf überein. */
  function landung(S, mitBremsen = false, hEnde = 7000, tMax = 9000) {
    const P = klon(S); P.maxG = 0; P.maxHitze = 0; if (mitBremsen) bremsen(P);
    const pkt = [[P.x, P.y]]; let naechst = P.t + 20;
    while (P.t - S.t < tMax) {
      schritt(P, dtFuer(P));
      if (P.t >= naechst) { pkt.push([P.x, P.y]); naechst += hoehe(P) < 150000 ? 5 : 20; }
      if (hoehe(P) <= hEnde) { pkt.push([P.x, P.y]); return { unten: true, x: P.x, y: P.y, bogen: P.bogen, t: P.t, maxG: P.maxG, maxHitze: P.maxHitze, pkt }; }
    }
    return { unten: false, bogen: P.bogen, pkt };
  }

  return { MU, R, G0, TEILE, BAHN_MIN, BREMS_DAUER, KABEL_HOEHE, ZIEL, ZIEL_WOSTOK, ERD_W, ortBogen, kreisTempo, dichte, plan, startmasse, startschub, schubZuGewicht,
    tempoSchaetzung, neu, klon, masse, cda, hoehe, tempo, teile, tank, schub, schritt, dtFuer, weiter, seitenLeer, seitenAb, verkleidungAb,
    stufeLeer, obenNoch, stufeAb, abschalten, raumschiffAb, bremsen, kugelAb, bahn, umlaufbahn, zielNeigung, vorhersage, landung };
})();
if (typeof module !== 'undefined') module.exports = ZenitFlug;
