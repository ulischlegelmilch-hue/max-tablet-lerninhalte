// Hof-Farm: Darstellung der Spielwelt (Draufsicht). Maschinen fahren selbststaendig; hier wird nur aus dem Spielstand
// (FarmModell) und der Uhrzeit berechnet, wo was steht und wie die Felder aussehen.
const FarmAnsicht = (function () {
  const D = FarmDaten, G = FarmGfx, M = FarmModell, Z = D.ZELLE;
  let muster = null;
  const musterCache = {};
  let baeume = [];
  let parkCache = { schluessel: '', pos: {} };
  const partikel = [];
  let letztePartikelZeit = 0;

  // ----------------------------------------------------------------------------------------------
  // Hilfen
  // ----------------------------------------------------------------------------------------------
  function inRect(px, py, r, rand) { rand = rand || 0; return px >= r.x - rand && px <= r.x + r.w + rand && py >= r.y - rand && py <= r.y + r.h + rand; }
  function musterHolen(ctx) {
    if (!muster) muster = { gras: G.grasMuster(ctx), asphalt: G.asphaltMuster(ctx), beton: G.betonMuster(ctx), brach: G.brachMuster(ctx) };
    return muster;
  }
  function kachelMuster(ctx, art, frucht, stufe) {
    const key = art + '|' + frucht + '|' + stufe;
    if (!musterCache[key]) musterCache[key] = ctx.createPattern(G.kachel(art, frucht, stufe, 0), 'repeat');
    return musterCache[key];
  }
  function stufeVon(w) { return w < 0.1 ? 0 : w < 0.35 ? 1 : w < 0.65 ? 2 : 3; }
  // Muster fuer eine Feldphase
  function phaseMuster(ctx, phase, frucht, wachstum) {
    if (phase === 'stoppel') return kachelMuster(ctx, 'stoppel', '', 0);
    if (phase === 'bearbeitet') return kachelMuster(ctx, 'bearbeitet', '', 0);
    if (phase === 'gepfluegt') return kachelMuster(ctx, 'gepfluegt', '', 0);
    if (phase === 'waechst') return kachelMuster(ctx, 'pflanze', frucht, stufeVon(wachstum));
    return kachelMuster(ctx, 'pflanze', frucht, 4);
  }
  function nachMuster(ctx, job, f) {
    const s = job.schritt;
    if (s === 'grubbern') return kachelMuster(ctx, 'bearbeitet', '', 0);
    if (s === 'pfluegen') return kachelMuster(ctx, 'gepfluegt', '', 0);
    if (s === 'saeen') return kachelMuster(ctx, 'pflanze', job.frucht, 0);
    if (s === 'ernten') return kachelMuster(ctx, 'stoppel', '', 0);
    return null;
  }
  const TINT = { duengen: 'rgba(255,255,255,0.20)', spritzen: 'rgba(120,200,255,0.20)', walzen: 'rgba(0,0,0,0.16)', kalken: 'rgba(255,255,255,0.34)' };

  function schildText(ctx, text, x, y, groesse, farbe) {
    ctx.font = 'bold ' + groesse + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(1, groesse * 0.14); ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.strokeText(text, x, y);
    ctx.fillStyle = farbe || '#fff'; ctx.fillText(text, x, y);
  }

  // ----------------------------------------------------------------------------------------------
  // Baeume (reine Dekoration)
  // ----------------------------------------------------------------------------------------------
  function baumeErzeugen() {
    baeume = [];
    const rnd = G.zufall(4711);
    const sperr = [];
    D.FELDER.forEach(f => sperr.push({ x: f.x - 56, y: f.y - 56, w: f.c * Z + 112, h: f.r * Z + 112 }));
    D.STRASSEN.forEach(s => sperr.push({ x: s.x - 50, y: s.y - 50, w: s.w + 100, h: s.h + 100 }));
    sperr.push({ x: D.HOF.x - 50, y: D.HOF.y - 50, w: D.HOF.w + 100, h: D.HOF.h + 100 });
    sperr.push({ x: D.PLATZ_LANDHANDEL.x - 50, y: D.PLATZ_LANDHANDEL.y - 50, w: D.PLATZ_LANDHANDEL.w + 100, h: D.PLATZ_LANDHANDEL.h + 450 });
    D.GEBAEUDE.forEach(g => sperr.push({ x: g.x - 70, y: g.y - 70, w: g.w + 140, h: g.h + 140 }));
    D.PRODUKTION.forEach(g => sperr.push({ x: g.x - 50, y: g.y - 50, w: g.w + 100, h: g.h + 100 }));
    for (let n = 0; n < 2600 && baeume.length < 520; n++) {
      const x = 30 + rnd() * (D.WELT.b - 60), y = 30 + rnd() * (D.WELT.h - 60);
      const rand = Math.min(x, y, D.WELT.b - x, D.WELT.h - y);
      if (rand > 170 && rnd() < 0.78) continue;
      if (sperr.some(r => inRect(x, y, r))) continue;
      baeume.push({ x, y, v: (rnd() * 4) | 0 });
    }
  }

  // ----------------------------------------------------------------------------------------------
  // Felder: Bahnen und Fahrwege
  // ----------------------------------------------------------------------------------------------
  function bahnen(feldId, breite) {
    const f = D.feld(feldId), W = f.c * Z, H = f.r * Z;
    const horizontal = W >= H;
    const quer = horizontal ? H : W, laenge = horizontal ? W : H;
    const laneW = Math.max(26, breite);
    const n = Math.max(1, Math.ceil(quer / laneW));
    return { f, W, H, horizontal, quer, laenge, laneW, n };
  }
  function bahnMitte(b, i) { return b.laneW >= b.quer ? b.quer / 2 : Math.min((i + 0.5) * b.laneW, b.quer - b.laneW / 2); }
  // Position der Arbeitslinie bei Fortschritt p (0..1): { x, y, a, fertigBahnen, teil }
  function aufBahn(b, p) {
    const u = Math.min(0.99999, Math.max(0, p)) * b.n;
    const li = Math.floor(u), fr = u - li, richtung = li % 2 === 0 ? 1 : -1;
    const TURN = 0.1;
    let s, quer = bahnMitte(b, li), winkelZusatz = 0;
    if (fr < 1 - TURN || li === b.n - 1) s = Math.min(1, fr / (1 - TURN));
    else {
      s = 1;
      const tt = (fr - (1 - TURN)) / TURN;
      quer = bahnMitte(b, li) + (bahnMitte(b, li + 1) - bahnMitte(b, li)) * tt;
      winkelZusatz = Math.PI * tt * richtung;
    }
    const along = richtung > 0 ? s * b.laenge : (1 - s) * b.laenge;
    const ueber = (fr >= 1 - TURN && li < b.n - 1) ? 26 * Math.sin(Math.PI * ((fr - (1 - TURN)) / TURN)) * richtung : 0;
    let x, y, a;
    if (b.horizontal) { x = b.f.x + along + ueber; y = b.f.y + quer; a = (richtung > 0 ? 0 : Math.PI) + winkelZusatz; }
    else { x = b.f.x + quer; y = b.f.y + along + ueber; a = (richtung > 0 ? Math.PI / 2 : -Math.PI / 2) + winkelZusatz; }
    return { x, y, a, li, fr, s, richtung };
  }
  // Polyline entlang p (0..1)
  function entlang(pts, p) {
    let gesamt = 0;
    for (let i = 1; i < pts.length; i++) gesamt += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    let ziel = p * gesamt;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (ziel <= l || i === pts.length - 1) {
        const t = l ? Math.min(1, ziel / l) : 1;
        return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t, a: Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x) };
      }
      ziel -= l;
    }
    return { x: pts[0].x, y: pts[0].y, a: 0 };
  }

  // ----------------------------------------------------------------------------------------------
  // Maschinen: Parkplaetze und Einsatz-Positionen
  // ----------------------------------------------------------------------------------------------
  function halbmasse(d) {
    if (d.art === 'traktor') return [d.b * 0.5 + 4, d.l * 0.5 + 8];
    if (d.art === 'ernter') return [Math.max(d.w, d.b) * 0.5 + 4, d.l * 0.55 + 20];
    return [d.w * 0.5 + 4, d.len * 0.5 + 8];
  }
  function parkplaetze(S) {
    const schluessel = S.flotte.map(m => m.uid + m.id).join(',');
    if (parkCache.schluessel === schluessel) return parkCache.pos;
    const pos = {}, platziert = [];
    const zeilen = [1960, 2090, 2210, 2330];
    S.flotte.forEach(m => {
      const d = D.def(m.id), [hw, hl] = halbmasse(d);
      let ok = false;
      for (let zi = 0; zi < zeilen.length && !ok; zi++) {
        for (let x = 1070 + hw; x < 2080 - hw; x += 12) {
          if (platziert.every(o => Math.abs(o.x - x) >= hw + o.hw || Math.abs(o.y - zeilen[zi]) >= hl + o.hl)) {
            pos[m.uid] = { x, y: zeilen[zi] }; platziert.push({ x, y: zeilen[zi], hw, hl }); ok = true; break;
          }
        }
      }
      if (!ok) { pos[m.uid] = { x: 1100, y: 2330 }; }
    });
    parkCache = { schluessel, pos };
    return pos;
  }

  // Berechnet Lage von Zugmaschine/Erntemaschine und Geraet fuer einen Job
  function jobPosen(job, jetzt) {
    const st = M.jobStand(job, jetzt);
    const tm = M.maschine(job.traktor), gm = job.geraet ? M.maschine(job.geraet) : null;
    const td = D.def(tm.id), gd = gm ? D.def(gm.id) : null;
    const breite = gd ? gd.w : td.w;
    const b = bahnen(job.feld, breite);
    // Offset der Arbeitslinie hinter/vor der Zugmaschine
    const off = gd ? -(td.l * 0.38 + (gd.len - 6)) : (td.l * 0.2 + 14 + (td.typ === 'rodemaschine' ? 28 : 24));
    const posAus = (arbeit) => {  // Arbeitslinie -> Position der Maschine
      return { x: arbeit.x - Math.cos(arbeit.a) * off, y: arbeit.y - Math.sin(arbeit.a) * off, a: arbeit.a };
    };
    let pose, arbeitend = false, arbeitslinie = null;
    const weg = M.wegPunkte(job.feld);
    const startArbeit = aufBahn(b, 0);
    const startPose = posAus(startArbeit);
    const wegPts = weg.concat([{ x: startPose.x, y: startPose.y }]);
    if (st.teil === 'hin') pose = entlang(wegPts, st.p);
    else if (st.teil === 'rueck') {
      const ende = posAus(aufBahn(b, 1));
      pose = entlang([{ x: ende.x, y: ende.y }].concat(wegPts.slice().reverse()), st.p);
    } else {
      arbeitslinie = aufBahn(b, st.p);
      pose = posAus(arbeitslinie);
      arbeitend = true;
    }
    return { st, pose, arbeitend, arbeitslinie, b, tm, gm, td, gd };
  }

  function zeichneZugmaschine(ctx, m, x, y, a) {
    const d = D.def(m.id), s = G.fuerDef(d);
    G.zeichne(ctx, s.koerper, x, y, a, true);
    if (s.rad) {
      const ax = d.art === 'traktor' ? d.achs : -d.achs;
      const hr = d.art === 'traktor' ? d.b * 0.34 : d.b * 0.46;
      [-1, 1].forEach(sd => {
        const lx = ax, ly = sd * hr;
        G.zeichne(ctx, s.rad, x + Math.cos(a) * lx - Math.sin(a) * ly, y + Math.sin(a) * lx + Math.cos(a) * ly, a, false);
      });
    }
  }
  function zeichneGeraetAm(ctx, g, tm, x, y, a) {
    const d = D.def(tm.id);
    const hx = x - Math.cos(a) * d.l * 0.38, hy = y - Math.sin(a) * d.l * 0.38;
    G.zeichne(ctx, G.fuerDef(D.def(g.id)).koerper, hx, hy, a, true);
  }

  function staub(x, y, farbe, jetzt, dt) {
    if (partikel.length > 150) return;
    if (Math.random() > dt * 14) return;
    const w = Math.random() * 6.283;
    partikel.push({ x, y, vx: Math.cos(w) * 14, vy: Math.sin(w) * 14, t: 0, max: 0.6 + Math.random() * 0.7, farbe, r: 2 + Math.random() * 3 });
  }
  function partikelStep(dt) {
    for (let i = partikel.length - 1; i >= 0; i--) {
      const p = partikel[i];
      p.t += dt;
      if (p.t >= p.max) { partikel.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97;
    }
  }

  // ----------------------------------------------------------------------------------------------
  // Gebaeude
  // ----------------------------------------------------------------------------------------------
  function dach(ctx, x, y, w, h, farbe) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x + 8, y + 10, w, h);
    const gr = ctx.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, G.abdunkeln(farbe, 0.2)); gr.addColorStop(0.5, farbe); gr.addColorStop(1, G.abdunkeln(farbe, -0.25));
    ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath();
    if (w >= h) for (let xx = x + 10; xx < x + w; xx += 10) { ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); }
    else for (let yy = y + 10; yy < y + h; yy += 10) { ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); if (w >= h) { ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); } else { ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); } ctx.stroke();
  }
  function zeichneGebaeude(ctx, sicht, S, jetzt) {
    D.GEBAEUDE.forEach(g => {
      if (g.x > sicht.x1 || g.x + g.w < sicht.x0 || g.y > sicht.y1 || g.y + g.h < sicht.y0) return;
      dach(ctx, g.x, g.y, g.w, g.h, g.dach);
      if (g.art === 'halle') {
        ctx.fillStyle = '#2b2a2a'; ctx.fillRect(g.x + 30, g.y + g.h - 8, g.w - 60, 8);
        schildText(ctx, 'MASCHINENHALLE', g.x + g.w / 2, g.y + g.h / 2 - 6, 18, '#fff3e0');
      } else if (g.art === 'haus') {
        ctx.fillStyle = '#7b6a5a'; ctx.fillRect(g.x + 120, g.y + 14, 14, 18);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(g.x + 122, g.y + 16, 10, 12);
        schildText(ctx, 'HOF', g.x + g.w / 2, g.y + g.h / 2 + 22, 20, '#ffe9d6');
      } else if (g.art === 'handel') {
        ctx.fillStyle = '#e9edf0'; ctx.fillRect(g.x + 20, g.y + 20, g.w - 40, 16);
        ctx.fillStyle = '#3a5a78'; for (let xx = g.x + 24; xx < g.x + g.w - 28; xx += 22) ctx.fillRect(xx, g.y + 24, 12, 8);
        schildText(ctx, 'LANDHANDEL', g.x + g.w / 2, g.y + g.h / 2 + 14, 24, '#f4f8ff');
      } else if (g.art === 'haendler') {
        ctx.fillStyle = '#c8202a'; ctx.fillRect(g.x, g.y + g.h * 0.42, g.w, g.h * 0.16);
        schildText(ctx, 'TRAKTOR-HÄNDLER', g.x + g.w / 2, g.y + g.h * 0.5, 22, '#fff');
        ctx.fillStyle = 'rgba(120,150,175,0.65)'; ctx.fillRect(g.x + 14, g.y + g.h - 24, g.w - 28, 14);
      }
    });
    D.SILOS.forEach(s => {
      if (s.x + s.r < sicht.x0 || s.x - s.r > sicht.x1 || s.y + s.r < sicht.y0 || s.y - s.r > sicht.y1) return;
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.arc(s.x + 9, s.y + 11, s.r, 0, 7); ctx.fill();
      const rg = ctx.createRadialGradient(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.1, s.x, s.y, s.r);
      rg.addColorStop(0, '#f0f3f5'); rg.addColorStop(0.6, '#bcc6cc'); rg.addColorStop(1, '#7e8b94');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
      [0.78, 0.55, 0.3].forEach(k => { ctx.beginPath(); ctx.arc(s.x, s.y, s.r * k, 0, 7); ctx.stroke(); });
      ctx.fillStyle = '#6a757d'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.12, 0, 7); ctx.fill();
    });
    ctx.strokeStyle = '#8b959c'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(D.SILOS[0].x + 40, D.SILOS[0].y + 20); ctx.lineTo(D.SILOS[1].x - 40, D.SILOS[1].y + 20); ctx.stroke();
    // Silo-Fuellstand (Balken unter den Silos)
    const kap = M.siloKap(), voll = Math.min(1, M.lagerMenge() / kap);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(1520, 1792, 240, 10);
    ctx.fillStyle = voll > 0.9 ? '#e0533a' : '#f2c14a'; ctx.fillRect(1521, 1793, 238 * voll, 8);
    // Betriebe
    D.PRODUKTION.forEach(b => {
      if (b.x > sicht.x1 || b.x + b.w < sicht.x0 || b.y > sicht.y1 || b.y + b.h < sicht.y0) return;
      const p = S.produktion[b.id];
      if (!p) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(255,230,120,0.85)'; ctx.lineWidth = 3; ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4); ctx.setLineDash([]);
        schildText(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2 - 14, 34, '#fff');
        schildText(ctx, 'BAUPLATZ', b.x + b.w / 2, b.y + b.h / 2 + 18, 12, '#ffe27a');
        schildText(ctx, b.name + (S.level < b.lvl ? ' · Lvl ' + b.lvl : ''), b.x + b.w / 2, b.y + b.h / 2 + 34, 12, '#fff');
      } else {
        dach(ctx, b.x, b.y, b.w, b.h, b.dach);
        schildText(ctx, b.icon, b.x + b.w / 2, b.y + b.h / 2 - 12, 34, '#fff');
        schildText(ctx, b.name, b.x + b.w / 2, b.y + b.h / 2 + 22, 13, '#fff');
        const q = p.queue[0];
        if (q && q.start != null) {
          const f = Math.min(1, (jetzt - q.start) / Math.max(1, q.dauer));
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(b.x + 8, b.y + b.h - 16, b.w - 16, 8);
          ctx.fillStyle = '#7fe083'; ctx.fillRect(b.x + 9, b.y + b.h - 15, (b.w - 18) * f, 6);
        }
      }
    });
  }

  // ----------------------------------------------------------------------------------------------
  // Felder
  // ----------------------------------------------------------------------------------------------
  function zeichneFeld(ctx, d, S, jetzt, m) {
    const fw = d.c * Z, fh = d.r * Z;
    const f = S.felder[d.id];
    ctx.fillStyle = 'rgba(40,30,15,0.35)'; ctx.fillRect(d.x - 5, d.y - 5, fw + 10, fh + 10);
    if (!f) {
      ctx.fillStyle = m.brach; ctx.fillRect(d.x, d.y, fw, fh);
      ctx.fillStyle = 'rgba(110,120,60,0.18)'; ctx.fillRect(d.x, d.y, fw, fh);
      ctx.strokeStyle = 'rgba(120,90,50,0.9)'; ctx.lineWidth = 3; ctx.strokeRect(d.x - 1.5, d.y - 1.5, fw + 3, fh + 3);
      ctx.strokeStyle = 'rgba(210,190,150,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.strokeRect(d.x - 10, d.y - 10, fw + 20, fh + 20); ctx.setLineDash([]);
      const px = d.x - 18, py = d.y + fh / 2 - 20;
      ctx.fillStyle = '#6b4a2e'; ctx.fillRect(px + 14, py + 18, 4, 22);
      ctx.fillStyle = '#fff'; ctx.fillRect(px - 20, py - 16, 70, 36);
      ctx.strokeStyle = '#d02a2a'; ctx.lineWidth = 3; ctx.strokeRect(px - 20, py - 16, 70, 36);
      schildText(ctx, 'ZU VERKAUFEN', px + 15, py - 5, 8.5, '#c02020');
      schildText(ctx, d.name, px + 15, py + 9, 10, '#222');
      return;
    }
    const wachstum = M.fortschrittWachstum(f, jetzt);
    ctx.fillStyle = phaseMuster(ctx, f.phase, f.frucht, wachstum);
    ctx.fillRect(d.x, d.y, fw, fh);
    const job = M.jobAufFeld(d.id);
    if (job) {
      const st = M.jobStand(job, jetzt);
      if (st.teil !== 'hin') {
        const p = st.teil === 'rueck' ? 1 : st.p;
        const gm = job.geraet ? M.maschine(job.geraet) : null, tm = M.maschine(job.traktor);
        const breite = gm ? D.def(gm.id).w : D.def(tm.id).w;
        const b = bahnen(d.id, breite);
        const nach = nachMuster(ctx, job, f);
        const tint = TINT[job.schritt];
        const u = p * b.n, li = Math.min(b.n - 1, Math.floor(u)), fr = u - li;
        const fuell = (x, y, w, h) => {
          if (w <= 0 || h <= 0) return;
          if (nach) { ctx.fillStyle = nach; ctx.fillRect(x, y, w, h); }
          if (tint) { ctx.fillStyle = tint; ctx.fillRect(x, y, w, h); }
        };
        // fertige Bahnen
        const fertigQuer = li >= b.n || p >= 1 ? b.quer : Math.min(b.quer, li * b.laneW);
        const richtung = li % 2 === 0 ? 1 : -1;
        const teil = Math.min(1, fr / 0.9) * b.laenge;
        if (b.horizontal) {
          fuell(d.x, d.y, fw, fertigQuer);
          if (p < 1) {
            const y0 = d.y + li * b.laneW, hh = Math.min(b.laneW, b.quer - li * b.laneW);
            if (richtung > 0) fuell(d.x, y0, teil, hh); else fuell(d.x + b.laenge - teil, y0, teil, hh);
          }
        } else {
          fuell(d.x, d.y, fertigQuer, fh);
          if (p < 1) {
            const x0 = d.x + li * b.laneW, ww = Math.min(b.laneW, b.quer - li * b.laneW);
            if (richtung > 0) fuell(x0, d.y, ww, teil); else fuell(x0, d.y + b.laenge - teil, ww, teil);
          }
        }
      }
    }
    // Rand
    ctx.strokeStyle = 'rgba(90,60,30,0.9)'; ctx.lineWidth = 3; ctx.strokeRect(d.x - 1.5, d.y - 1.5, fw + 3, fh + 3);
    // leichte Innenschatten
    const g1 = ctx.createLinearGradient(d.x, 0, d.x + 18, 0); g1.addColorStop(0, 'rgba(0,0,0,0.22)'); g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g1; ctx.fillRect(d.x, d.y, 18, fh);
    const g2 = ctx.createLinearGradient(0, d.y, 0, d.y + 18); g2.addColorStop(0, 'rgba(0,0,0,0.22)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2; ctx.fillRect(d.x, d.y, fw, 18);
  }

  // ----------------------------------------------------------------------------------------------
  // Welt zeichnen
  // ----------------------------------------------------------------------------------------------
  function zeichneWelt(ctx, cam, W, H, t, jetzt, dt) {
    const S = M.stand();
    const m = musterHolen(ctx);
    const sicht = { x0: cam.x - W / 2 / cam.z - 80, y0: cam.y - H / 2 / cam.z - 80, x1: cam.x + W / 2 / cam.z + 80, y1: cam.y + H / 2 / cam.z + 80 };
    ctx.fillStyle = m.gras; ctx.fillRect(sicht.x0, sicht.y0, sicht.x1 - sicht.x0, sicht.y1 - sicht.y0);
    // Strassen
    D.STRASSEN.forEach(s => {
      if (s.x > sicht.x1 || s.x + s.w < sicht.x0 || s.y > sicht.y1 || s.y + s.h < sicht.y0) return;
      const x0 = Math.max(s.x, sicht.x0), y0 = Math.max(s.y, sicht.y0), x1 = Math.min(s.x + s.w, sicht.x1), y1 = Math.min(s.y + s.h, sicht.y1);
      ctx.fillStyle = 'rgba(40,36,30,0.35)'; ctx.fillRect(x0 - (s.w > s.h ? 0 : 6), y0 - (s.w > s.h ? 6 : 0), (x1 - x0) + (s.w > s.h ? 0 : 12), (y1 - y0) + (s.w > s.h ? 12 : 0));
      ctx.fillStyle = m.asphalt; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.strokeStyle = 'rgba(235,235,225,0.85)'; ctx.lineWidth = 3; ctx.setLineDash([34, 30]);
      ctx.beginPath();
      if (s.w > s.h) { ctx.moveTo(x0, s.y + s.h / 2); ctx.lineTo(x1, s.y + s.h / 2); } else { ctx.moveTo(s.x + s.w / 2, y0); ctx.lineTo(s.x + s.w / 2, y1); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(240,240,230,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath();
      if (s.w > s.h) { ctx.moveTo(x0, s.y + 6); ctx.lineTo(x1, s.y + 6); ctx.moveTo(x0, s.y + s.h - 6); ctx.lineTo(x1, s.y + s.h - 6); }
      else { ctx.moveTo(s.x + 6, y0); ctx.lineTo(s.x + 6, y1); ctx.moveTo(s.x + s.w - 6, y0); ctx.lineTo(s.x + s.w - 6, y1); }
      ctx.stroke();
    });
    ctx.fillStyle = m.asphalt; ctx.fillRect(2150, 1500, 90, 90);
    [D.HOF, D.PLATZ_LANDHANDEL].forEach(r => {
      if (r.x > sicht.x1 || r.x + r.w < sicht.x0 || r.y > sicht.y1 || r.y + r.h < sicht.y0) return;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
      ctx.fillStyle = m.beton; ctx.fillRect(r.x, r.y, r.w, r.h);
    });
    ctx.fillStyle = m.beton; ctx.fillRect(1700, 1590, 200, 40); ctx.fillRect(2240, 1590, 40, 60);
    // Betriebs-Platz (Beton)
    ctx.fillStyle = m.beton; ctx.fillRect(2800, 1610, 280, 430);
    // Felder
    D.FELDER.forEach(d => {
      if (d.x > sicht.x1 || d.x + d.c * Z < sicht.x0 || d.y > sicht.y1 || d.y + d.r * Z < sicht.y0) return;
      zeichneFeld(ctx, d, S, jetzt, m);
    });
    // Maschinen
    const park = parkplaetze(S);
    const einsaetze = {};
    S.jobs.forEach(j => { einsaetze[j.traktor] = j; if (j.geraet) einsaetze[j.geraet] = j; });
    // parkende Geraete und Maschinen
    S.flotte.forEach(mm => {
      if (einsaetze[mm.uid]) return;
      const d = D.def(mm.id), p = park[mm.uid];
      if (p.x < sicht.x0 - 200 || p.x > sicht.x1 + 200 || p.y < sicht.y0 - 200 || p.y > sicht.y1 + 200) return;
      if (d.art === 'geraet') G.zeichne(ctx, G.fuerDef(d).koerper, p.x, p.y - d.len * 0.5, -Math.PI / 2, true);
      else zeichneZugmaschine(ctx, mm, p.x, p.y, -Math.PI / 2);
    });
    // Einsatz
    S.jobs.forEach(j => {
      const po = jobPosen(j, jetzt);
      if (po.pose.x < sicht.x0 - 300 || po.pose.x > sicht.x1 + 300 || po.pose.y < sicht.y0 - 300 || po.pose.y > sicht.y1 + 300) return;
      if (po.gm) zeichneGeraetAm(ctx, po.gm, po.tm, po.pose.x, po.pose.y, po.pose.a);
      zeichneZugmaschine(ctx, po.tm, po.pose.x, po.pose.y, po.pose.a);
      if (po.arbeitend && dt > 0) {
        const farbe = j.schritt === 'ernten' ? 'rgba(236,214,120,0.8)' : j.schritt === 'duengen' || j.schritt === 'kalken' ? 'rgba(240,240,235,0.75)' : j.schritt === 'spritzen' ? 'rgba(170,220,255,0.7)' : 'rgba(110,78,48,0.75)';
        staub(po.arbeitslinie.x, po.arbeitslinie.y, farbe, jetzt, dt);
      }
    });
    if (dt > 0) partikelStep(dt);
    zeichneGebaeude(ctx, sicht, S, jetzt);
    partikel.forEach(p => {
      const k = 1 - p.t / p.max;
      ctx.globalAlpha = Math.max(0, k * 0.8); ctx.fillStyle = p.farbe;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.6 - k * 0.6), 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // Baeume
    baeume.forEach(b => {
      if (b.x < sicht.x0 - 50 || b.x > sicht.x1 + 50 || b.y < sicht.y0 - 50 || b.y > sicht.y1 + 50) return;
      const sp = G.baum(b.v);
      ctx.drawImage(sp.c, b.x - sp.ox, b.y - sp.oy, sp.w, sp.h);
    });
  }

  // Beschriftungen in Bildschirmkoordinaten (gut lesbar bei jedem Zoom)
  function zeichneBeschriftungen(ctx, cam, W, H, jetzt, t) {
    const S = M.stand();
    const zuS = (x, y) => ({ x: (x - cam.x) * cam.z + W / 2, y: (y - cam.y) * cam.z + H / 2 });
    const pille = (x, y, text, farbe, schrift) => {
      ctx.font = 'bold ' + (schrift || 13) + 'px system-ui,sans-serif';
      const w = ctx.measureText(text).width + 16, h = (schrift || 13) + 10;
      ctx.fillStyle = 'rgba(14,24,16,0.82)';
      ctx.beginPath(); ctx.moveTo(x - w / 2 + 8, y - h / 2); ctx.arcTo(x + w / 2, y - h / 2, x + w / 2, y + h / 2, 8); ctx.arcTo(x + w / 2, y + h / 2, x - w / 2, y + h / 2, 8); ctx.arcTo(x - w / 2, y + h / 2, x - w / 2, y - h / 2, 8); ctx.arcTo(x - w / 2, y - h / 2, x + w / 2, y - h / 2, 8); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = farbe || '#fff'; ctx.fillText(text, x, y + 1);
      return h;
    };
    D.FELDER.forEach(d => {
      const cx = d.x + d.c * Z / 2, cy = d.y + d.r * Z / 2;
      const p = zuS(cx, cy);
      if (p.x < -120 || p.x > W + 120 || p.y < -60 || p.y > H + 60) return;
      const f = S.felder[d.id];
      if (!f) {
        if (cam.z > 0.4) pille(p.x, p.y, S.level < d.lvl ? '🔒 ab Level ' + d.lvl : '🏷 ' + Math.round(d.preis / 100) / 10 + ' T€', S.level < d.lvl ? '#ffb4a2' : '#ffe27a', 14);
        return;
      }
      const wachstum = M.fortschrittWachstum(f, jetzt);
      const job = M.jobAufFeld(d.id);
      const zeilen = [];
      let farbe = '#fff';
      const fn = f.frucht ? D.frucht(f.frucht).name : null;
      if (job) {
        const st = M.jobStand(job, jetzt);
        const sch = D.SCHRITTE[job.schritt];
        const rest = Math.max(0, st.restMs);
        zeilen.push(sch.icon + ' ' + sch.name + (st.teil === 'hin' ? ' · fährt hin' : st.teil === 'rueck' ? ' · fertig' : ' ' + Math.round(st.p * 100) + ' %'));
        if (st.teil !== 'rueck') zeilen.push('noch ' + zeitText(rest));
      } else if (f.phase === 'reif') { zeilen.push('🌾 ' + fn + ' erntereif!'); farbe = '#ffe27a'; }
      else if (f.phase === 'waechst') { zeilen.push('🌱 ' + fn + ' ' + Math.round(wachstum * 100) + ' %'); zeilen.push('noch ' + zeitText(Math.max(0, f.reife - jetzt))); }
      else if (f.phase === 'bearbeitet') zeilen.push('Gegrubbert – bereit zum Säen');
      else if (f.phase === 'gepfluegt') zeilen.push('Gepflügt – bereit zum Säen');
      else zeilen.push('Stoppelfeld – bearbeiten');
      if (f.auto) zeilen.push('👨‍🌾 Fahrer: ' + D.frucht(f.auto.frucht).name);
      let y = p.y - zeilen.length * 11;
      if (cam.z < 0.45) { pille(p.x, p.y, d.id + '', '#fff', 15); return; }
      zeilen.forEach((z, i) => { const h = pille(p.x, y, z, i === 0 ? farbe : '#cfe0cf', i === 0 ? 14 : 12); y += h + 3; });
      if (!job && f.phase === 'reif') {
        const k = 0.5 + 0.5 * Math.sin(t * 5);
        ctx.fillStyle = 'rgba(255,226,90,' + (0.6 + 0.4 * k) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y - zeilen.length * 11 - 20, 7 + 2 * k, 0, 7); ctx.fill();
      }
    });
    // Betriebs-Hinweise
    D.PRODUKTION.forEach(b => {
      const pr = S.produktion[b.id];
      if (!pr) return;
      const q = pr.queue[0];
      const p = zuS(b.x + b.w / 2, b.y - 8);
      if (cam.z > 0.5 && q && q.start != null) pille(p.x, p.y, 'noch ' + zeitText(Math.max(0, q.start + q.dauer - jetzt)) + (pr.queue.length > 1 ? ' (+' + (pr.queue.length - 1) + ')' : ''), '#cfe8cf', 12);
    });
  }
  function zeitText(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s >= 3600) return Math.floor(s / 3600) + ' Std ' + Math.floor((s % 3600) / 60) + ' Min';
    if (s >= 60) return Math.floor(s / 60) + ' Min ' + (s % 60 < 10 ? '0' : '') + (s % 60) + ' s';
    return s + ' s';
  }

  // Was liegt an Weltposition?
  function trefferBei(wx, wy, S) {
    for (let i = 0; i < D.PRODUKTION.length; i++) { const b = D.PRODUKTION[i]; if (inRect(wx, wy, b, 8)) return { art: 'betrieb', id: b.id }; }
    for (let i = 0; i < D.GEBAEUDE.length; i++) { const g = D.GEBAEUDE[i]; if (inRect(wx, wy, g, 6)) return { art: 'gebaeude', id: g.art }; }
    for (let i = 0; i < D.SILOS.length; i++) { const s = D.SILOS[i]; if (Math.hypot(wx - s.x, wy - s.y) < s.r + 6) return { art: 'gebaeude', id: 'silo' }; }
    for (let i = 0; i < D.FELDER.length; i++) { const f = D.FELDER[i]; if (inRect(wx, wy, { x: f.x, y: f.y, w: f.c * Z, h: f.r * Z }, 10)) return { art: 'feld', id: f.id }; }
    if (inRect(wx, wy, D.HOF)) return { art: 'gebaeude', id: 'halle' };
    return null;
  }

  baumeErzeugen();
  return { zeichneWelt, zeichneBeschriftungen, trefferBei, zeitText, jobPosen, parkplaetze, bahnen, aufBahn };
})();
