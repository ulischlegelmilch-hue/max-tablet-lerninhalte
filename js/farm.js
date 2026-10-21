// Hof-Farm: Oberflaeche (Vollbild-Spiel). Max faehrt nicht selbst - er kauft Maschinen und schickt sie als Auftraege auf die
// Felder. Logik: farm-modell.js, Darstellung: farm-ansicht.js, Daten: farm-daten.js, Grafik: farm-gfx.js.
// Bewusst OHNE Anbindung an Sterne/Guthaben/Lernen (Uli 21.10.2026: "erstmal nur das Spiel spielen") - Schnittstelle spaeter.
const Farm = (function () {
  const D = FarmDaten, G = FarmGfx, M = FarmModell, A = FarmAnsicht;

  let wurzel = null, cv = null, g = null, R = {};
  let W = 0, H = 0, dpr = 1;
  let laeuft = false, raf = 0, tLast = 0, tSpiel = 0;
  const cam = { x: 1750, y: 1450, z: 0.8, ziel: null };
  let dlg = null;                 // { typ, ... } geoeffneter Dialog
  let dlgAnfasst = false, dlgAnfassEnde = 0;
  let timer = { sim: 0, speicher: 0, hud: 0, dlg: 0 };
  let ton = null;
  let vorschauCache = {};
  let ausgang = null;
  let geldAnzeige = 0;
  let tempoKlicks = 0;
  const zeiger = {};

  const fmt = n => Math.round(n).toLocaleString('de-DE');
  const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('de-DE');
  const tonnen = kg => (kg >= 100000 ? fmt(kg / 1000) : fmt1(kg / 1000)) + ' t';
  const meter = px => fmt1(px / D.PX_JE_M) + ' m';
  const jetzt = () => Date.now();
  const stand = () => M.stand();

  // ----------------------------------------------------------------------------------------------
  // Ton (kurze, leise Signale)
  // ----------------------------------------------------------------------------------------------
  function tonStart() {
    if (ton) { try { if (ton.ac.state === 'suspended') ton.ac.resume(); } catch (e) { /* egal */ } return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ton = { ac: new AC() };
    } catch (e) { ton = null; }
  }
  function piep(art) {
    if (!ton || !stand().ton) return;
    try {
      const ac = ton.ac, t0 = ac.currentTime;
      const noten = art === 'fertig' ? [660, 880] : art === 'level' ? [520, 660, 880] : art === 'geld' ? [880, 1180] : art === 'fehler' ? [220] : [740];
      noten.forEach((fr, i) => {
        const o = ac.createOscillator(), gn = ac.createGain();
        o.type = 'sine'; o.frequency.value = fr;
        gn.gain.setValueAtTime(0.0001, t0 + i * 0.11); gn.gain.exponentialRampToValueAtTime(0.05, t0 + i * 0.11 + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.11 + 0.18);
        o.connect(gn); gn.connect(ac.destination); o.start(t0 + i * 0.11); o.stop(t0 + i * 0.11 + 0.2);
      });
    } catch (e) { /* egal */ }
  }

  // ----------------------------------------------------------------------------------------------
  // Aufbau der Oberflaeche
  // ----------------------------------------------------------------------------------------------
  const CSS = `
  #farm{position:fixed;left:0;top:0;right:0;bottom:0;z-index:9000;background:#2c4a24;color:#fff;font-family:system-ui,-apple-system,Roboto,sans-serif;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
  #farm canvas#farm-cv{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
  #farm button{font:inherit;color:inherit;border:0;cursor:pointer;-webkit-appearance:none;touch-action:manipulation}
  .f-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:flex-start;padding:10px 12px;pointer-events:none}
  .f-top>*{pointer-events:auto}
  .f-pill{background:rgba(16,26,18,.8);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:7px 14px;font-weight:700}
  .f-links{display:flex;flex-direction:column;margin-right:10px}
  .f-geld{font-size:21px;color:#ffe27a;text-align:center;min-width:130px}
  .f-lvl{margin-top:6px;font-size:13px;padding:6px 12px}
  .f-lvl .bar{height:7px;border-radius:4px;background:rgba(255,255,255,.18);margin-top:4px;overflow:hidden}
  .f-lvl .bar>div{height:100%;background:linear-gradient(90deg,#7fe083,#4fae58);width:0}
  .f-hinweis{flex:1;min-width:0;display:flex;justify-content:center;pointer-events:none!important}
  .f-hinweis>div{background:rgba(255,226,122,.95);color:#2a2300;border-radius:18px;padding:9px 16px;font-weight:700;font-size:15px;max-width:600px;text-align:center;box-shadow:0 3px 12px rgba(0,0,0,.35);line-height:1.25;pointer-events:auto}
  .f-hinweis.leer>div{display:none}
  .f-btns{display:flex;flex-wrap:wrap;justify-content:flex-end;max-width:600px}
  .f-wetter{margin-top:6px;font-size:13px;padding:6px 12px;cursor:pointer;white-space:nowrap}
  .f-ib{width:56px;height:56px;border-radius:50%;background:rgba(16,26,18,.84);border:1px solid rgba(255,255,255,.18)!important;font-size:26px;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.35);margin:0 0 18px 9px}
  .f-ib:active{background:rgba(60,90,60,.95)}
  .f-ib small{position:absolute;bottom:-15px;left:50%;transform:translateX(-50%);font-size:10.5px;font-weight:700;white-space:nowrap;text-shadow:0 1px 3px #000}
  .f-ib .pkt{position:absolute;top:-3px;right:-3px;min-width:19px;height:19px;border-radius:10px;background:#e8452c;font-size:11.5px;font-weight:800;display:none;align-items:center;justify-content:center;padding:0 4px}
  .f-zoom{position:absolute;left:12px;bottom:18px;display:flex;flex-direction:column}
  .f-zoom .f-ib{width:48px;height:48px;font-size:24px;font-weight:800;margin:8px 0 0 0}
  .f-toasts{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;pointer-events:none;width:80%;max-width:640px}
  .f-toast{background:rgba(16,26,18,.92);border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:8px 16px;font-weight:700;font-size:15px;text-align:center;margin-top:6px;animation:ftin .22s ease-out}
  .f-toast.warn{background:rgba(120,40,26,.93);border-color:#ff9a7a}
  .f-toast.gut{background:rgba(32,100,48,.95);border-color:#8cf09a}
  .f-toast.geld{background:rgba(110,86,10,.95);border-color:#ffe27a;color:#fff3b8}
  @keyframes ftin{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}
  .f-dlg{position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(6,12,8,.66);display:flex;align-items:center;justify-content:center;padding:14px;z-index:5;touch-action:pan-y}
  .f-box{background:linear-gradient(#25362a,#1b2a1f);border:1px solid rgba(255,255,255,.2);border-radius:22px;max-width:1080px;width:100%;max-height:100%;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.6);overflow:hidden}
  .f-box.klein{max-width:560px}
  .f-kopf{display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.12)}
  .f-kopf h2{margin:0;font-size:21px;flex:1}
  .f-kopf .f-pill{font-size:15px;color:#ffe27a;padding:6px 12px;margin-right:10px}
  .f-x{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.12);font-size:22px}
  .f-zurueck{height:44px;border-radius:22px;background:rgba(255,255,255,.12);font-size:15px;font-weight:700;padding:0 14px;margin-right:10px}
  .f-inhalt{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 16px;touch-action:pan-y}
  .f-tabs{display:flex;flex-wrap:wrap;padding:10px 16px 0}
  .f-tab{padding:9px 16px;border-radius:14px;background:rgba(255,255,255,.1);font-weight:700;font-size:15px;margin:0 8px 8px 0}
  .f-tab.an{background:#4fae58;color:#0d2210}
  .f-gitter{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:12px}
  .f-karte{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);border-radius:16px;padding:10px;display:flex;flex-direction:column;text-align:left}
  .f-karte.gesperrt{opacity:.5}
  .f-karte img{width:100%;height:92px;object-fit:contain;background:radial-gradient(#4c7a3d,#335a2b);border-radius:10px}
  .f-karte b{font-size:15px;margin-top:5px}
  .f-karte .s{font-size:12.5px;opacity:.88;line-height:1.35;margin-top:3px}
  .f-kauf{margin-top:8px;padding:10px 12px;border-radius:12px;background:#f0b429;color:#2b1d00;font-weight:800;font-size:14.5px}
  .f-kauf[disabled]{background:#5b6a5d;color:#c9d3ca;opacity:.85}
  .f-kauf.sek{background:rgba(255,255,255,.16);color:#fff}
  .f-kauf.sek[disabled]{background:rgba(255,255,255,.07);color:#98a598}
  .f-kauf.gruen{background:#4fae58;color:#08210c}
  .f-kauf.rot{background:#a33a2a;color:#fff}
  .f-badge{display:inline-block;background:#2f7d3a;border-radius:8px;padding:1px 7px;font-size:11.5px;margin-left:6px;font-weight:700}
  .f-badge.rot{background:#a33a2a}.f-badge.gelb{background:#8a6d12}
  .f-zeile{display:flex;align-items:center;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,.1)}
  .f-zeile:last-child{border:0}
  .f-zeile>*{margin-right:12px}.f-zeile>*:last-child{margin-right:0}
  .f-zeile .n{flex:1;font-weight:700;min-width:0}
  .f-zeile .n small{display:block;font-weight:500;opacity:.82;font-size:12.5px;margin-top:2px}
  .f-zeile .f-kauf{margin-top:0}
  .f-zeile .ico{font-size:28px;width:38px;text-align:center}
  .f-bal{height:9px;border-radius:5px;background:rgba(255,255,255,.18);overflow:hidden;margin-top:5px}
  .f-bal>div{height:100%;background:linear-gradient(90deg,#7fe083,#4fae58)}
  .f-bal.gelb>div{background:linear-gradient(90deg,#ffd24a,#f4a321)}
  .f-bal.rot>div{background:linear-gradient(90deg,#ff9a7a,#d9452c)}
  .up{color:#7fe083}.down{color:#ff8e7a}
  .f-chips{display:flex;flex-wrap:wrap;margin:-4px 0 10px}
  .f-chip{background:rgba(255,255,255,.1);border-radius:12px;padding:5px 11px;font-size:13px;font-weight:600;margin:4px 8px 0 0}
  .f-chip b{color:#ffe27a}
  .f-info{background:rgba(255,255,255,.08);border-radius:12px;padding:9px 12px;font-size:14px;margin-bottom:10px;line-height:1.4}
  .f-info.warn{background:rgba(160,60,36,.4)}
  .f-h3{font-size:14px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;opacity:.75;margin:14px 0 6px}
  .f-liste{margin:6px 0 0;padding-left:20px;line-height:1.6;font-size:15.5px}
  .f-gross{font-size:16.5px;line-height:1.5}
  .f-btnreihe{display:flex;flex-wrap:wrap}
  .f-btnreihe .f-kauf{flex:1;min-width:140px;margin:8px 8px 0 0}
  .f-wahl{display:inline-block;background:rgba(255,255,255,.14);border-radius:10px;padding:4px 10px;font-size:13px;font-weight:700}
  `;

  function baueOberflaeche() {
    wurzel = document.createElement('div');
    wurzel.id = 'farm';
    wurzel.innerHTML = `
      <style>${CSS}</style>
      <canvas id="farm-cv"></canvas>
      <div class="f-top">
        <div class="f-links">
          <div class="f-pill f-geld" id="f-geld">0 €</div>
          <div class="f-pill f-lvl"><span id="f-lvl">Level 1</span><div class="bar"><div id="f-xp"></div></div></div>
          <div class="f-pill f-wetter" id="f-wetter" data-a="wetter">☀️ Sonnig</div>
        </div>
        <div class="f-hinweis leer" id="f-hinweis"><div id="f-hinweis-t" data-a="hinweisZeigen"></div></div>
        <div class="f-btns">
          <button class="f-ib" data-a="felder">🌾<small>Felder</small></button>
          <button class="f-ib" data-a="auftraege">📋<small>Aufträge</small><span class="pkt" id="f-pkt-auf"></span></button>
          <button class="f-ib" data-a="lager">📦<small>Lager</small></button>
          <button class="f-ib" data-a="tiere">🐔<small>Tiere</small></button>
          <button class="f-ib" data-a="betriebe">🏭<small>Betriebe</small></button>
          <button class="f-ib" data-a="fuhrpark">🚜<small>Fuhrpark</small></button>
          <button class="f-ib" data-a="shop">🏪<small>Händler</small></button>
          <button class="f-ib" data-a="menue">☰<small>Menü</small></button>
        </div>
      </div>
      <div class="f-zoom"><button class="f-ib" data-a="zoom+">＋</button><button class="f-ib" data-a="zoom-">－</button></div>
      <div class="f-toasts" id="f-toasts"></div>`;
    document.body.appendChild(wurzel);
    cv = wurzel.querySelector('#farm-cv');
    g = cv.getContext('2d');
    R = {
      geld: wurzel.querySelector('#f-geld'), lvl: wurzel.querySelector('#f-lvl'), xp: wurzel.querySelector('#f-xp'),
      hinweis: wurzel.querySelector('#f-hinweis'), hinweisT: wurzel.querySelector('#f-hinweis-t'), toasts: wurzel.querySelector('#f-toasts'),
      pktAuf: wurzel.querySelector('#f-pkt-auf'), wetter: wurzel.querySelector('#f-wetter')
    };
    wurzel.addEventListener('click', klick);
    wurzel.addEventListener('pointerdown', () => { dlgAnfasst = true; });
    const lose = () => { dlgAnfassEnde = Date.now(); dlgAnfasst = false; };
    wurzel.addEventListener('pointerup', lose); wurzel.addEventListener('pointercancel', lose);
    kamera(cv);
    window.addEventListener('resize', groesse);
    window.addEventListener('keydown', taste, true);
    document.addEventListener('visibilitychange', sichtbarkeit);
    groesse();
  }
  function abbauen() {
    window.removeEventListener('resize', groesse);
    window.removeEventListener('keydown', taste, true);
    document.removeEventListener('visibilitychange', sichtbarkeit);
    if (wurzel && wurzel.parentNode) wurzel.parentNode.removeChild(wurzel);
    wurzel = null;
  }
  function sichtbarkeit() {
    if (document.hidden) speichern();
    else if (M.stand()) { M.simuliere(jetzt()); }
  }
  function groesse() {
    if (!wurzel) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    W = wurzel.clientWidth; H = wurzel.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }

  // ----------------------------------------------------------------------------------------------
  // Kamera: Ziehen, Zoomen, Antippen
  // ----------------------------------------------------------------------------------------------
  function klemmen() {
    cam.z = Math.max(0.3, Math.min(1.8, cam.z));
    cam.x = Math.max(0, Math.min(D.WELT.b, cam.x));
    cam.y = Math.max(0, Math.min(D.WELT.h, cam.y));
  }
  function kamera(el) {
    let start = null;
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); tonStart();
      try { el.setPointerCapture(e.pointerId); } catch (x) { /* egal */ }
      zeiger[e.pointerId] = { x: e.clientX, y: e.clientY };
      const n = Object.keys(zeiger).length;
      if (n === 1) start = { x: e.clientX, y: e.clientY, t: Date.now(), bewegt: false };
      else start = null;
      cam.ziel = null;
    });
    el.addEventListener('pointermove', e => {
      const p = zeiger[e.pointerId];
      if (!p) return;
      const ids = Object.keys(zeiger);
      if (ids.length >= 2) {
        const a = zeiger[ids[0]], b = zeiger[ids[1]];
        const d0 = Math.hypot(a.x - b.x, a.y - b.y);
        p.x = e.clientX; p.y = e.clientY;
        const d1 = Math.hypot(a.x - b.x, a.y - b.y);
        if (d0 > 10) { cam.z *= d1 / d0; klemmen(); }
        return;
      }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (start && !start.bewegt && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) start.bewegt = true;
      if (start && start.bewegt) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; klemmen(); }
    });
    const ende = e => {
      if (!zeiger[e.pointerId]) return;
      delete zeiger[e.pointerId];
      if (start && !start.bewegt && Date.now() - start.t < 600 && Object.keys(zeiger).length === 0) antippen(e.clientX, e.clientY);
      if (Object.keys(zeiger).length === 0) start = null;
    };
    el.addEventListener('pointerup', ende); el.addEventListener('pointercancel', ende);
    el.addEventListener('wheel', e => { e.preventDefault(); cam.z *= e.deltaY < 0 ? 1.12 : 1 / 1.12; klemmen(); }, { passive: false });
  }
  function antippen(sx, sy) {
    if (dlg) return;
    const r = cv.getBoundingClientRect();
    const wx = cam.x + (sx - r.left - W / 2) / cam.z, wy = cam.y + (sy - r.top - H / 2) / cam.z;
    const t = A.trefferBei(wx, wy, stand());
    if (!t) return;
    if (t.art === 'feld') dialogFeld(t.id);
    else if (t.art === 'betrieb') dialogBetriebe(t.id);
    else if (t.art === 'stall') dialogTiere(t.id);
    else if (t.id === 'handel' || t.id === 'silo') dialogLager();
    else if (t.id === 'haendler') dialogShop('traktor');
    else if (t.id === 'halle') dialogFuhrpark();
    else if (t.id === 'haus') dialogMenue();
  }
  function fliegeZu(x, y, z) { cam.ziel = { x, y, z: z || cam.z }; }
  function feldMitte(id) { const f = D.feld(id); return { x: f.x + f.c * D.ZELLE / 2, y: f.y + f.r * D.ZELLE / 2 }; }

  // ----------------------------------------------------------------------------------------------
  // Meldungen
  // ----------------------------------------------------------------------------------------------
  const toastTimer = {};
  function toast(text, typ, key) {
    if (!R.toasts) return;
    let el = key ? R.toasts.querySelector('[data-k="' + key + '"]') : null;
    if (!el) {
      el = document.createElement('div');
      if (key) el.setAttribute('data-k', key);
      R.toasts.appendChild(el);
      while (R.toasts.children.length > 3) R.toasts.removeChild(R.toasts.firstChild);
    }
    el.className = 'f-toast' + (typ ? ' ' + typ : '');
    el.textContent = text;
    const id = key || String(Math.random());
    clearTimeout(toastTimer[id]);
    toastTimer[id] = setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 4200);
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog-Grundgeruest
  // ----------------------------------------------------------------------------------------------
  function dialogAuf(html, klein) {
    let d = wurzel.querySelector('#f-dlg');
    let top = 0;
    if (d) { const sc = d.querySelector('.f-inhalt'); top = sc ? sc.scrollTop : 0; d.parentNode.removeChild(d); }
    d = document.createElement('div');
    d.className = 'f-dlg'; d.id = 'f-dlg';
    d.innerHTML = '<div class="f-box' + (klein ? ' klein' : '') + '">' + html + '</div>';
    wurzel.appendChild(d);
    const sc = d.querySelector('.f-inhalt'); if (sc && top) sc.scrollTop = top;
  }
  const levelWarte = [];
  function dialogZu() {
    const d = wurzel && wurzel.querySelector('#f-dlg');
    if (d) d.parentNode.removeChild(d);
    dlg = null;
    if (levelWarte.length) { const n = levelWarte.shift(); dialogLevel(n.level, n.bonus); }
  }
  function kopf(titel, extra, zurueck) {
    return '<div class="f-kopf">' + (zurueck ? '<button class="f-zurueck" data-a="' + zurueck + '">◀ Zurück</button>' : '') + '<h2>' + titel + '</h2>' + (extra || '') + '<button class="f-x" data-a="zu">✕</button></div>';
  }
  const geldPille = () => '<span class="f-pill">' + fmt(stand().geld) + ' €</span>';
  function vorschauBild(d) {
    if (!vorschauCache[d.id]) vorschauCache[d.id] = G.vorschau(d, 170, 92);
    return vorschauCache[d.id];
  }
  const gutName = id => { const x = D.gut(id); return x.icon + ' ' + x.name; };
  const sekText = sek => A.zeitText(sek * 1000);
  const einText = r => r.ein.map(z => (z.kg / 1000) + ' t ' + D.gut(z.gut).name).join(' + ');
  const GERAET_NAME = { grubber: 'Grubber', pflug: 'Pflug', saeen: 'Sämaschine', duenger: 'Düngerstreuer', walze: 'Walze', spritze: 'Feldspritze', kalk: 'Kalkstreuer' };

  // ----------------------------------------------------------------------------------------------
  // Dialog: Feld
  // ----------------------------------------------------------------------------------------------
  function dialogFeld(id, sub) {
    dlg = { typ: 'feld', id, sub: sub || (dlg && dlg.typ === 'feld' && dlg.id === id ? dlg.sub : null), wahl: (dlg && dlg.wahl) || {} };
    zeichneFeldDialog();
  }
  function phasenText(f, now) {
    const fn = f.frucht ? D.frucht(f.frucht).name : '';
    if (f.phase === 'stoppel') return 'Stoppelfeld';
    if (f.phase === 'bearbeitet') return 'Gegrubbert';
    if (f.phase === 'gepfluegt') return 'Gepflügt';
    if (f.phase === 'waechst') return fn + ' wächst (' + Math.round(M.fortschrittWachstum(f, now) * 100) + ' %)';
    return fn + ' ist erntereif';
  }
  function zeichneFeldDialog() {
    const S = stand(), id = dlg.id, d = D.feld(id), f = S.felder[id], now = jetzt();
    if (!f) { zeichneFeldKauf(); return; }
    const job = M.jobAufFeld(id);
    const zurueck = !job && dlg.sub ? 'feldzurueck' : null;
    const chips = '<div class="f-chips"><span class="f-chip">📐 <b>' + fmt1(d.ha) + ' ha</b></span><span class="f-chip">🌍 Boden <b>' + Math.round(f.boden) + ' %</b></span>' +
      '<span class="f-chip">🔁 Vorher: <b>' + (f.vorher.length ? f.vorher.map(x => D.frucht(x).name).join(', ') : '–') + '</b></span>' +
      (f.phase === 'waechst' || f.phase === 'reif' ? '<span class="f-chip">📦 Ertrag ca. <b>' + tonnen(M.ertragsSchaetzungKg(id)) + '</b></span>' : '') + '</div>';
    let inhalt;
    if (job) inhalt = jobAnsicht(job, now);
    else if (dlg.sub && dlg.sub.schritt === 'saeen' && !dlg.sub.frucht) inhalt = saatWahl(id);
    else if (dlg.sub) inhalt = maschinenWahl(id, dlg.sub.schritt, dlg.sub.frucht);
    else inhalt = feldAktionen(id, f, now);
    dialogAuf(kopf(d.name + ' <span style="font-weight:500;font-size:15px;opacity:.85">· ' + phasenText(f, now) + '</span>', '', zurueck) +
      '<div class="f-inhalt">' + chips + inhalt + (dlg.sub || job ? '' : fahrerBlock(f)) + '</div>');
  }
  function jobAnsicht(job, now) {
    const st = M.jobStand(job, now), sch = D.SCHRITTE[job.schritt];
    const tm = M.maschine(job.traktor), gm = job.geraet ? M.maschine(job.geraet) : null;
    const gesamt = job.hin + job.arbeit + job.rueck;
    const p = Math.min(1, (now - job.start) / gesamt);
    return '<div class="f-info"><b>' + sch.icon + ' ' + sch.name + '</b> läuft gerade.</div>' +
      '<div class="f-zeile"><div class="ico">' + (gm ? '🔧' : '🌾') + '</div><div class="n">' + (gm ? D.def(gm.id).name + ' + ' : '') + D.def(tm.id).name +
      '<small>' + (st.teil === 'hin' ? 'Fährt aufs Feld …' : st.teil === 'rueck' ? 'Fährt zurück zum Hof' : 'Arbeitet – noch ' + sekText(st.restMs / 1000)) + '</small></div></div>' +
      '<div class="f-bal"><div style="width:' + Math.round(p * 100) + '%"></div></div>' +
      '<div class="f-btnreihe"><button class="f-kauf sek" data-a="zeigen" data-id="' + job.feld + '">📍 Auf der Karte zeigen</button><button class="f-kauf rot" data-a="jobAbbruch" data-id="' + job.id + '">Abbrechen</button></div>' +
      '<div class="f-info" style="margin-top:12px;opacity:.85">Abbrechen verliert die Kosten (z. B. Saatgut), das Feld bleibt unverändert.</div>';
  }
  function feldAktionen(id, f, now) {
    const liste = M.moeglicheSchritte(id, now);
    let html = '<div class="f-h3">Das kannst du tun</div>';
    liste.forEach(s => {
      const st = D.SCHRITTE[s.schritt];
      const opts = M.optionen(id, s.schritt, f.frucht);
      const bestes = opts.find(o => o.traktor);
      let zusatz, knopf;
      const kosten = s.schritt === 'saeen' ? 'Saatgut je nach Frucht' : (st.kosten ? '− ' + fmt(M.kostenFuer(id, s.schritt)) + ' €' : '');
      if (!s.erlaubt.ok) { zusatz = s.erlaubt.grund; knopf = '<button class="f-kauf sek" disabled>–</button>'; }
      else if (!bestes) {
        zusatz = opts.length && opts[0].grund ? opts[0].grund : (st.geraet ? 'Kein freies Gerät (' + GERAET_NAME[st.geraet] + ') – im Händler kaufen oder warten' : 'Keine freie Erntemaschine (' + (f.frucht && D.frucht(f.frucht).ernte === 'wurzel' ? 'Roder' : 'Mähdrescher') + ')');
        knopf = '<button class="f-kauf sek" data-a="shop" data-id="' + (st.geraet ? 'geraet' : 'ernter') + '">🏪</button>';
      } else {
        zusatz = 'ca. ' + sekText(bestes.sek / M.tempoFaktor()) + (kosten ? ' · ' + kosten : '') + ' · ' + st.text;
        knopf = '<button class="f-kauf gruen" data-a="schritt" data-id="' + s.schritt + '">Los</button>';
      }
      html += '<div class="f-zeile"><div class="ico">' + st.icon + '</div><div class="n">' + st.name + '<small>' + zusatz + '</small></div>' + knopf + '</div>';
    });
    if (!liste.length) html += '<div class="f-info">Hier gibt es gerade nichts zu tun.</div>';
    if (f.beregnung) html += '<div class="f-info" style="margin-top:8px">💦 Beregnungsanlage eingebaut: Bei Hitze wächst hier alles normal weiter.</div>';
    else if (stand().level >= D.BEREGNUNG_LVL) html += '<div class="f-zeile"><div class="ico">💦</div><div class="n">Beregnungsanlage<small>Bei Hitze wachsen die Pflanzen nicht langsamer · ' + fmt(D.feld(id).ha * D.BEREGNUNG_PREIS_HA) + ' €</small></div><button class="f-kauf sek" data-a="beregnung">Einbauen</button></div>';
    if (f.phase === 'waechst') html += '<div class="f-info" style="margin-top:10px">🌱 Noch ' + sekText(M.restWachsen(id, now) / 1000) + ' bis zur Ernte (bei ' + D.WETTER[M.wetterTyp(now)].name + '). Düngen, Spritzen und Walzen geben mehr Ertrag.</div>';
    return html;
  }
  function saatWahl(id) {
    const S = stand();
    let html = '<div class="f-h3">Was soll gesät werden?</div><div class="f-gitter">';
    D.FRUECHTE.forEach(fr => {
      const gesperrt = S.level < fr.lvl;
      const ertrag = D.feld(id).ha * fr.ertrag * 1000 * M.ertragsFaktor(S.felder[id], fr.id);
      const wert = ertrag / 1000 * M.grundPreis(fr.id);
      const kosten = M.kostenFuer(id, 'saeen', fr.id);
      const hinweis = M.fruchtfolgeHinweis(id, fr.id);
      html += '<button class="f-karte' + (gesperrt ? ' gesperrt' : '') + '" data-a="saatwahl" data-id="' + fr.id + '"' + (gesperrt ? ' disabled' : '') + '><b>' + (fr.ernte === 'wurzel' ? '🥔' : '🌾') + ' ' + fr.name + (gesperrt ? '<span class="f-badge rot">ab Level ' + fr.lvl + '</span>' : '') + '</b><div class="s">' +
        'Reif nach ' + sekText(fr.dauer / M.tempoFaktor()) + '<br>' + (fr.ernte === 'wurzel' ? 'Roder' : 'Mähdrescher') + '<br>Ertrag ca. ' + tonnen(ertrag) + '<br>Wert ca. ' + fmt(wert) + ' €<br>Saatgut ' + fmt(kosten) + ' €' +
        (hinweis ? '<br><span class="' + (hinweis.indexOf('−') >= 0 ? 'down' : 'up') + '">' + hinweis + '</span>' : '') + '</div></button>';
    });
    return html + '</div>';
  }
  function maschinenWahl(id, schritt, fruchtId) {
    const st = D.SCHRITTE[schritt];
    const opts = M.optionen(id, schritt, fruchtId).filter(o => o.traktor);
    let html = '<div class="f-h3">' + st.icon + ' ' + st.name + (fruchtId ? ' · ' + D.frucht(fruchtId).name : '') + ' – welche Maschine?</div>';
    const kosten = M.kostenFuer(id, schritt, fruchtId);
    html += '<div class="f-info">Kosten: <b>' + fmt(kosten) + ' €</b>' + (stand().geld < kosten ? ' <span class="down">– so viel Geld hast du noch nicht</span>' : '') + '</div>';
    if (!opts.length) return html + '<div class="f-info warn">Keine freie Maschine. Warte, bis eine fertig ist, oder kaufe im Händler eine neue.</div><div class="f-btnreihe"><button class="f-kauf" data-a="shop" data-id="' + (st.geraet ? 'geraet' : 'ernter') + '">🏪 Zum Händler</button></div>';
    opts.forEach(o => {
      const gm = o.geraet ? M.maschine(o.geraet) : null;
      const key = o.geraet || o.traktor;
      const liste = o.traktoren || [o.traktor];
      const wahlIdx = Math.min(dlg.wahl[key] || 0, liste.length - 1);
      const tm = M.maschine(liste[wahlIdx]);
      const td = D.def(tm.id);
      const bild = D.def(gm ? gm.id : tm.id);
      const sek = (gm ? M.arbeitsSek(schritt, id, D.def(gm.id), null) : M.arbeitsSek(schritt, id, null, td)) / M.tempoFaktor();
      const kaputt = (gm && gm.zustand < 50) || tm.zustand < 50;
      html += '<div class="f-zeile"><img src="' + vorschauBild(bild) + '" style="width:120px;height:64px;object-fit:contain;background:#3b6a30;border-radius:8px">' +
        '<div class="n">' + (gm ? D.def(gm.id).name : td.name) + '<small>' + (gm ? 'mit <span class="f-wahl" data-a="traktorWechsel" data-id="' + key + '">' + td.name + ' (' + td.ps + ' PS) ⟳</span>' : 'selbstfahrend') + '</small>' +
        '<small>Dauer ca. <b>' + sekText(sek) + '</b>' + (kaputt ? ' <span class="down">· abgenutzt – langsamer</span>' : '') + '</small></div>' +
        '<button class="f-kauf gruen" data-a="start" data-id="' + (o.geraet || 0) + ':' + tm.uid + '"' + (stand().geld < kosten ? ' disabled' : '') + '>Starten</button></div>';
    });
    return html;
  }
  function fahrerBlock(f) {
    const S = stand();
    const html = '<div class="f-h3">Fahrer (Auto-Betrieb)</div>';
    if (f.auto) return html + '<div class="f-zeile"><div class="ico">👨‍🌾</div><div class="n">Ein Fahrer bewirtschaftet das Feld allein<small>Er baut immer wieder ' + D.frucht(f.auto.frucht).name + ' an: bearbeiten, säen, düngen, ernten – mit freien Maschinen.</small></div><button class="f-kauf rot" data-a="autoAus">Stoppen</button></div>';
    if (!S.fahrer) return html + '<div class="f-info">Ein Fahrer erledigt die ganze Arbeit auf einem Feld von allein. Du kannst ihn im 🏪 Händler unter „Fahrer“ einstellen (ab Level ' + D.FAHRER[0].lvl + ').</div>';
    if (M.autoFelder().length >= S.fahrer) return html + '<div class="f-info">Alle deine ' + S.fahrer + ' Fahrer sind schon im Einsatz. Im Händler kannst du weitere einstellen.</div>';
    let h = html + '<div class="f-info">Du hast einen freien Fahrer! Welche Frucht soll er anbauen?</div><div class="f-btnreihe">';
    D.FRUECHTE.filter(fr => S.level >= fr.lvl).forEach(fr => { h += '<button class="f-kauf sek" data-a="autoAn" data-id="' + fr.id + '">' + fr.name + '</button>'; });
    return h + '</div>';
  }
  function zeichneFeldKauf() {
    const S = stand(), d = D.feld(dlg.id);
    const gesperrt = S.level < d.lvl, kann = S.geld >= d.preis;
    dialogAuf(kopf(d.name + ' <span style="font-weight:500;font-size:15px;opacity:.85">· zu verkaufen</span>', geldPille()) +
      '<div class="f-inhalt"><div class="f-chips"><span class="f-chip">📐 <b>' + fmt1(d.ha) + ' ha</b></span><span class="f-chip">💶 <b>' + fmt(d.preisHa) + ' €/ha</b></span></div>' +
      '<div class="f-info">Preis: <b>' + fmt(d.preis) + ' €</b>' + (gesperrt ? '<br><span class="down">Dieses Feld gibt es ab Level ' + d.lvl + '.</span>' : '') + '</div>' +
      '<div class="f-btnreihe"><button class="f-kauf" data-a="feldkauf" data-id="' + d.id + '"' + (gesperrt || !kann ? ' disabled' : '') + '>' + (gesperrt ? '🔒 ab Level ' + d.lvl : kann ? 'Feld kaufen' : 'Noch ' + fmt(d.preis - S.geld) + ' € fehlen') + '</button></div></div>', true);
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Haendler
  // ----------------------------------------------------------------------------------------------
  function dialogShop(tab) { dlg = { typ: 'shop', tab: tab || 'traktor' }; zeichneShop(); }
  function zeichneShop() {
    const S = stand(), tab = dlg.tab;
    const tabs = [['traktor', '🚜 Traktoren'], ['geraet', '🔧 Geräte'], ['ernter', '🌾 Erntemaschinen'], ['fahrer', '👨‍🌾 Fahrer'], ['silo', '🏗 Silo']];
    let inhalt = '';
    const besitz = id => S.flotte.filter(f => f.id === id).length;
    const karte = d => {
      const m = D.MARKEN[d.marke];
      let stats;
      if (d.art === 'traktor') stats = d.ps + ' PS · bis ' + d.kmh + ' km/h';
      else if (d.art === 'geraet') stats = GERAET_NAME[d.typ] + ' · ' + meter(d.w) + ' breit<br>braucht ab ' + d.ps + ' PS';
      else stats = (d.typ === 'rodemaschine' ? 'Roder (Kartoffeln, Rüben)' : 'Mähdrescher (Getreide, Raps, Mais …)') + '<br>Schneidwerk ' + meter(d.w) + ' · Tank ' + tonnen(d.tank);
      const hab = besitz(d.id), gesperrt = S.level < d.lvl, kann = S.geld >= d.preis;
      return '<div class="f-karte' + (gesperrt ? ' gesperrt' : '') + '"><img src="' + vorschauBild(d) + '"><b>' + d.name + (hab ? '<span class="f-badge">' + hab + '× im Hof</span>' : '') + (gesperrt ? '<span class="f-badge rot">ab Level ' + d.lvl + '</span>' : '') + '</b>' +
        '<div class="s" style="color:' + m.c1 + ';filter:brightness(1.6)">' + m.name + '</div><div class="s">' + stats + '</div>' +
        '<button class="f-kauf" data-a="kaufen" data-id="' + d.id + '"' + (gesperrt || !kann ? ' disabled' : '') + '>' + fmt(d.preis) + ' € kaufen</button></div>';
    };
    if (tab === 'traktor') inhalt = '<div class="f-gitter">' + D.TRAKTOREN.map(karte).join('') + '</div>';
    else if (tab === 'geraet') inhalt = '<div class="f-gitter">' + D.GERAETE.map(karte).join('') + '</div>';
    else if (tab === 'ernter') inhalt = '<div class="f-gitter">' + D.ERNTER.map(karte).join('') + '</div>';
    else if (tab === 'fahrer') {
      const n = D.FAHRER[S.fahrer];
      inhalt = '<div class="f-info">Ein <b>Fahrer</b> bewirtschaftet ein Feld ganz allein: Er baut die gewählte Frucht immer wieder an – bearbeiten, säen, düngen, ernten – und nimmt dafür freie Maschinen aus dem Hof. Du hast <b>' + S.fahrer + '</b> Fahrer (' + M.autoFelder().length + ' im Einsatz).</div>' +
        (n ? '<div class="f-zeile"><div class="ico">👨‍🌾</div><div class="n">Fahrer Nr. ' + (S.fahrer + 1) + '<small>' + (S.level < n.lvl ? 'Gibt es ab Level ' + n.lvl : 'Einstellen und auf einem Feld einsetzen') + '</small></div><button class="f-kauf" data-a="fahrerKauf"' + (S.level < n.lvl || S.geld < n.preis ? ' disabled' : '') + '>' + fmt(n.preis) + ' €</button></div>' : '<div class="f-info">Mehr Fahrer gibt es nicht – dein Hof läuft wie am Schnürchen!</div>');
    } else {
      const n = D.SILO_STUFEN[S.siloStufe + 1];
      inhalt = '<div class="f-info">Dein Silo fasst <b>' + tonnen(M.siloKap()) + '</b> (' + tonnen(M.lagerMenge()) + ' belegt). Ist es voll, wird die Ernte zu 80 % des Preises sofort verkauft.</div>' +
        (n ? '<div class="f-zeile"><div class="ico">🏗</div><div class="n">Silo ausbauen auf ' + tonnen(n.kg) + '</div><button class="f-kauf" data-a="siloKauf"' + (S.geld < n.preis ? ' disabled' : '') + '>' + fmt(n.preis) + ' €</button></div>' : '<div class="f-info">Das Silo ist voll ausgebaut.</div>');
    }
    dialogAuf(kopf('Traktor-Händler', geldPille()) + '<div class="f-tabs">' + tabs.map(t => '<button class="f-tab' + (t[0] === tab ? ' an' : '') + '" data-a="shoptab" data-id="' + t[0] + '">' + t[1] + '</button>').join('') + '</div><div class="f-inhalt">' + inhalt + '</div>');
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Lager und Markt
  // ----------------------------------------------------------------------------------------------
  function dialogLager() { dlg = { typ: 'lager' }; zeichneLager(); }
  function zeichneLager() {
    const S = stand();
    const kap = M.siloKap(), menge = M.lagerMenge(), voll = menge / kap;
    const zeilen = D.alleGueter().map(id => {
      const x = D.gut(id), p = M.preis(id), rel = S.preise[id], lager = S.silo[id] || 0;
      const trend = rel > 1.12 ? '<span class="up">▲ gut</span>' : rel < 0.9 ? '<span class="down">▼ niedrig</span>' : '<span>● normal</span>';
      const gesperrt = D.frucht(id) ? S.level < D.frucht(id).lvl : false;
      if (!lager && gesperrt) return '';
      return '<div class="f-zeile"><div class="ico">' + x.icon + '</div><div class="n">' + x.name + '<small>' + fmt(p) + ' €/t · ' + trend + '</small></div>' +
        '<div style="min-width:80px;text-align:right"><b>' + tonnen(lager) + '</b></div>' +
        (lager > 0 ? '<button class="f-kauf" data-a="verkauf" data-id="' + id + ':all">Alles · ' + fmt(lager / 1000 * p) + ' €</button><button class="f-kauf sek" data-a="verkauf" data-id="' + id + ':half">Hälfte</button>' : '<span style="min-width:190px"></span>') + '</div>';
    }).join('');
    dialogAuf(kopf('Lager & Markt', '<span class="f-pill">' + tonnen(menge) + ' / ' + tonnen(kap) + '</span>' + geldPille()) +
      '<div class="f-inhalt"><div class="f-bal ' + (voll > 0.9 ? 'rot' : voll > 0.7 ? 'gelb' : '') + '"><div style="width:' + Math.round(voll * 100) + '%"></div></div>' +
      '<div class="f-info" style="margin-top:10px">Die Ernte kommt ins Silo. Die Preise schwanken: Wenn „▲ gut“ steht, lohnt sich das Verkaufen. Mit Betrieben (🏭) wird aus Rohstoffen mehr Geld – und Aufträge (📋) zahlen extra.</div>' + zeilen + '</div>');
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Auftraege
  // ----------------------------------------------------------------------------------------------
  function dialogAuftraege() { dlg = { typ: 'auftraege' }; zeichneAuftraege(); }
  function zeichneAuftraege() {
    const S = stand(), now = jetzt();
    let html = '<div class="f-info">Nachbarn und Händler bestellen Waren. Liefere aus deinem Lager und kassiere <b>mehr als den Marktpreis</b> plus Erfahrung. Neue Aufträge kommen mit der Zeit.</div>';
    if (!S.auftraege.length) html += '<div class="f-info">Gerade gibt es keinen Auftrag – schau später wieder rein.</div>';
    S.auftraege.forEach(a => {
      const hab = S.silo[a.gut] || 0, ok = hab >= a.kg;
      html += '<div class="f-zeile"><div class="ico">' + D.gut(a.gut).icon + '</div><div class="n">' + tonnen(a.kg) + ' ' + D.gut(a.gut).name +
        '<small>Lohn <b style="color:#ffe27a">' + fmt(a.lohn) + ' €</b> · +' + a.xp + ' XP · noch ' + A.zeitText(a.bis - now) + '</small>' +
        '<div class="f-bal ' + (ok ? '' : 'gelb') + '"><div style="width:' + Math.min(100, Math.round(hab / a.kg * 100)) + '%"></div></div><small>Im Lager: ' + tonnen(hab) + '</small></div>' +
        '<button class="f-kauf ' + (ok ? 'gruen' : '') + '" data-a="liefern" data-id="' + a.id + '"' + (ok ? '' : ' disabled') + '>Liefern</button></div>';
    });
    dialogAuf(kopf('Aufträge', geldPille()) + '<div class="f-inhalt">' + html + '</div>');
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Betriebe (Verarbeitung)
  // ----------------------------------------------------------------------------------------------
  function dialogBetriebe(fokus) { dlg = { typ: 'betriebe', fokus: fokus || null }; zeichneBetriebe(); }
  function zeichneBetriebe() {
    const S = stand(), now = jetzt();
    let html = '<div class="f-info">In Betrieben wird aus Rohstoffen aus deinem Lager mehr Geld: Weizen → Mehl → Brot, Raps/Sonnenblumen → Öl, Kartoffeln → Chips, Rüben → Zucker. Die Ware landet im Lager.</div>';
    D.PRODUKTION.forEach(b => {
      const p = S.produktion[b.id];
      if (!p) {
        const gesperrt = S.level < b.lvl;
        html += '<div class="f-zeile"><div class="ico">' + b.icon + '</div><div class="n">' + b.name + (gesperrt ? '<span class="f-badge rot">ab Level ' + b.lvl + '</span>' : '') +
          '<small>' + b.rezepte.map(r => einText(r) + ' → ' + r.ausKg / 1000 + ' t ' + D.gut(r.aus).name + ' (' + sekText(r.sek) + ')').join('<br>') + '</small></div>' +
          '<button class="f-kauf" data-a="bauen" data-id="' + b.id + '"' + (gesperrt || S.geld < b.preis ? ' disabled' : '') + '>Bauen · ' + fmt(b.preis) + ' €</button></div>';
        return;
      }
      const q0 = p.queue[0];
      let h = '<div class="f-zeile" style="align-items:flex-start"><div class="ico">' + b.icon + '</div><div class="n">' + b.name + ' <span class="f-badge">Stufe ' + (p.stufe + 1) + '</span>';
      if (q0 && q0.start != null) {
        const r = b.rezepte.find(x => x.id === q0.rez);
        h += '<small>Produziert: ' + gutName(r.aus) + ' – noch ' + A.zeitText(q0.start + q0.dauer - now) + (p.queue.length > 1 ? ' (+' + (p.queue.length - 1) + ' in der Schlange)' : '') + '</small><div class="f-bal"><div style="width:' + Math.round(Math.min(1, (now - q0.start) / q0.dauer) * 100) + '%"></div></div>';
      } else h += '<small>Bereit für neue Aufträge.</small>';
      h += '<div class="f-btnreihe">';
      b.rezepte.forEach(r => {
        const moeglich = Math.min.apply(null, r.ein.map(z => Math.floor((S.silo[z.gut] || 0) / z.kg)));
        h += '<button class="f-kauf sek" data-a="prod" data-id="' + b.id + ':' + r.id + ':1"' + (moeglich < 1 || p.queue.length >= 6 ? ' disabled' : '') + '>' + gutName(r.aus) + ' ×1<br><span style="font-weight:500;font-size:12px">' + einText(r) + ' (' + moeglich + '× möglich)</span></button>';
        h += '<button class="f-kauf sek" data-a="prod" data-id="' + b.id + ':' + r.id + ':9"' + (moeglich < 2 || p.queue.length >= 6 ? ' disabled' : '') + '>so viele wie möglich</button>';
      });
      h += '</div></div>';
      const n = D.PROD_STUFEN[p.stufe + 1];
      h += (n ? '<button class="f-kauf" data-a="prodAus" data-id="' + b.id + '"' + (S.geld < Math.round(b.preis * n.preis) ? ' disabled' : '') + '>Ausbauen<br><span style="font-weight:500;font-size:12px">' + fmt(b.preis * n.preis) + ' € · ×' + n.faktor + ' schneller</span></button>' : '') + '</div>';
      html += h;
    });
    dialogAuf(kopf('Betriebe', geldPille()) + '<div class="f-inhalt">' + html + '</div>');
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Tiere
  // ----------------------------------------------------------------------------------------------
  function dialogTiere(fokus) { dlg = { typ: 'tiere', fokus: fokus || null }; zeichneTiere(); }
  function stundenText(h) { return h >= 48 ? Math.floor(h / 24) + ' Tage' : h >= 1 ? Math.round(h) + ' Std' : Math.max(0, Math.round(h * 60)) + ' Min'; }
  function zeichneTiere() {
    const S = stand(), now = jetzt();
    const w = D.WETTER[M.wetterTyp(now)];
    let html = '<div class="f-info">Tiere brauchen <b>Futter</b> aus deinem Silo und liefern Rohstoffe. Alles <b>einsammeln</b>, bevor der Stall voll ist (24 Stunden Vorrat). Ein <b>Futterautomat</b> füllt automatisch nach. Aktuell: ' + w.icon + ' ' + w.name + (w.tiere !== 1 ? ' (Tiere ' + (w.tiere < 1 ? '' : '+') + Math.round((w.tiere - 1) * 100) + ' %)' : '') + '</div>';
    D.TIERE.forEach(d => {
      const st = S.tiere[d.id];
      if (!st) {
        const gesperrt = S.level < d.lvl;
        html += '<div class="f-zeile"><div class="ico">' + d.icon + '</div><div class="n">' + d.stall + (gesperrt ? '<span class="f-badge rot">ab Level ' + d.lvl + '</span>' : '') +
          '<small>' + d.name + ' liefern ' + D.gut(d.gut).name + (d.futter.length ? ' · Futter: ' + d.futter.map(g => D.gut(g).name).join(' / ') : ' · kein Futter nötig') + '</small>' + (d.text ? '<small>' + d.text + '</small>' : '') + '</div>' +
          '<button class="f-kauf" data-a="stallBau" data-id="' + d.id + '"' + (gesperrt || S.geld < d.bau ? ' disabled' : '') + '>Bauen · ' + fmt(d.bau) + ' €</button></div>';
        return;
      }
      const ss = M.stallStand(d.id, now);
      const frei = ss.kap - st.anzahl;
      const futterProz = ss.futterKap > 0 ? Math.round(st.futter / ss.futterKap * 100) : 100;
      const lagerProz = ss.lagerKap > 0 ? Math.round(st.lager / ss.lagerKap * 100) : 0;
      html += '<div class="f-zeile" style="align-items:flex-start' + (dlg.fokus === d.id ? ';background:rgba(255,226,122,.08);border-radius:12px' : '') + '"><div class="ico">' + d.icon + '</div><div class="n">' + d.stall + ' <span class="f-badge">Stufe ' + (st.stufe + 1) + '</span>' + (st.auto ? ' <span class="f-badge">🤖 Futterautomat</span>' : '') +
        '<small>' + st.anzahl + ' von ' + ss.kap + ' Plätzen · ' + (ss.rateH >= 1 ? fmt1(ss.rateH) + ' kg' : fmt1(ss.rateH * 1000) + ' g') + ' ' + D.gut(d.gut).name + ' pro Stunde' + (st.anzahl && d.futterKgH && !ss.laeuft ? ' · <span class="down">kein Futter!</span>' : '') + '</small>' +
        (d.futterKgH ? '<small style="margin-top:6px">Futter (' + d.futter.map(g => D.gut(g).name).join('/') + '): ' + Math.round(st.futter) + ' kg · reicht ' + stundenText(ss.futterStunden) + ' · Silo: ' + tonnen(ss.futterSilo) + '</small><div class="f-bal ' + (futterProz < 20 ? 'rot' : futterProz < 50 ? 'gelb' : '') + '"><div style="width:' + futterProz + '%"></div></div>' : '') +
        '<small style="margin-top:6px">' + D.gut(d.gut).icon + ' Bereit: <b>' + (st.lager >= 1000 ? fmt1(st.lager / 1000) + ' t' : Math.round(st.lager) + ' kg') + '</b> (von ' + (ss.lagerKap >= 1000 ? fmt1(ss.lagerKap / 1000) + ' t' : Math.round(ss.lagerKap) + ' kg') + ')</small><div class="f-bal ' + (lagerProz > 90 ? 'rot' : lagerProz > 60 ? 'gelb' : '') + '"><div style="width:' + lagerProz + '%"></div></div>' +
        '<div class="f-btnreihe">' +
        '<button class="f-kauf gruen" data-a="einsammeln" data-id="' + d.id + '"' + (st.lager < 1 ? ' disabled' : '') + '>✋ Einsammeln</button>' +
        (d.futterKgH ? '<button class="f-kauf sek" data-a="fuettern" data-id="' + d.id + '"' + (futterProz >= 98 || !ss.futterSilo ? ' disabled' : '') + '>🥣 Füttern</button>' : '') +
        '<button class="f-kauf sek" data-a="tierKauf" data-id="' + d.id + ':1"' + (frei < 1 || S.geld < d.tierPreis ? ' disabled' : '') + '>+1 ' + d.tier + ' · ' + fmt(d.tierPreis) + ' €</button>' +
        '<button class="f-kauf sek" data-a="tierKauf" data-id="' + d.id + ':10"' + (frei < 2 || S.geld < d.tierPreis * 2 ? ' disabled' : '') + '>+10 · ' + fmt(d.tierPreis * 10) + ' €</button>' +
        (d.automat && !st.auto ? '<button class="f-kauf sek" data-a="automat" data-id="' + d.id + '"' + (S.geld < d.automat ? ' disabled' : '') + '>🤖 Futterautomat · ' + fmt(d.automat) + ' €</button>' : '') +
        (d.ausbau[st.stufe + 1] !== undefined ? '<button class="f-kauf sek" data-a="stallAus" data-id="' + d.id + '"' + (S.geld < d.ausbau[st.stufe + 1] ? ' disabled' : '') + '>🏗 Ausbau auf ' + d.kap[st.stufe + 1] + ' · ' + fmt(d.ausbau[st.stufe + 1]) + ' €</button>' : '') +
        '</div></div></div>';
    });
    dialogAuf(kopf('Tierhof', geldPille()) + '<div class="f-inhalt">' + html + '</div>');
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Wetter
  // ----------------------------------------------------------------------------------------------
  function dialogWetter() { dlg = { typ: 'wetter' }; zeichneWetter(); }
  function zeichneWetter() {
    const S = stand(), now = jetzt();
    const w = M.wetter(now);
    const saison = { fruehling: 'Frühling', sommer: 'Sommer', herbst: 'Herbst', winter: 'Winter' }[M.jahreszeit(now)];
    const wirkung = x => (x === 1 ? 'normal' : (x > 1 ? '+' : '−') + Math.abs(Math.round((x - 1) * 100)) + ' %');
    const slotMs = D.WETTER_SLOT_MS;
    const bis = (Math.floor(now / slotMs) + 1) * slotMs;
    let html = '<div class="f-zeile"><div class="ico" style="font-size:44px;width:60px">' + w.icon + '</div><div class="n" style="font-size:20px">' + w.name + '<small>' + saison + ' · wechselt in ' + A.zeitText(bis - now) + '</small><small>' + w.text + '</small></div></div>' +
      '<div class="f-chips"><span class="f-chip">🌱 Wachstum <b>' + wirkung(w.wachs) + '</b></span><span class="f-chip">🚜 Arbeitszeit <b>' + (w.arbeit === 1 ? 'normal' : (w.arbeit > 1 ? '+' : '−') + Math.abs(Math.round((w.arbeit - 1) * 100)) + ' %') + '</b></span><span class="f-chip">🐔 Tiere <b>' + wirkung(w.tiere) + '</b></span></div>';
    const vor = M.wetterVorschau(now);
    html += '<div class="f-h3">Vorhersage</div>';
    if (vor.length) {
      html += '<div class="f-chips">' + vor.map(v => { const x = D.WETTER[v.typ]; return '<span class="f-chip">' + x.icon + ' ' + x.name + '<br><span style="opacity:.7;font-size:11px">in ' + A.zeitText(v.von - now) + '</span></span>'; }).join('') + '</div>';
    } else html += '<div class="f-info">Ohne Wetterstation siehst du nur das aktuelle Wetter.</div>';
    const n = D.WETTERSTATION[S.wetterstation];
    if (n) html += '<div class="f-zeile"><div class="ico">🌦</div><div class="n">' + n.name + '<small>Zeigt das Wetter der nächsten ' + n.slots + ' Stunden' + (S.level < n.lvl ? ' · ab Level ' + n.lvl : '') + '</small></div><button class="f-kauf" data-a="stationKauf"' + (S.level < n.lvl || S.geld < n.preis ? ' disabled' : '') + '>' + fmt(n.preis) + ' €</button></div>';
    html += '<div class="f-h3">Tipps</div><div class="f-info">☀️ Bei Sonne geht die Arbeit am schnellsten · 🌧 Regen lässt die Pflanzen schneller wachsen · 🔥 Hitze bremst Pflanzen und Tiere – eine <b>Beregnungsanlage</b> (im Feld-Dialog) schützt das Feld · ❄️ Frost und Schnee: es wächst kaum etwas.</div>';
    dialogAuf(kopf('Wetter', geldPille()) + '<div class="f-inhalt">' + html + '</div>');
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Fuhrpark
  // ----------------------------------------------------------------------------------------------
  function dialogFuhrpark() { dlg = { typ: 'fuhrpark' }; zeichneFuhrpark(); }
  function zeichneFuhrpark() {
    const S = stand();
    const reihenfolge = { traktor: 0, geraet: 1, ernter: 2 };
    const liste = S.flotte.slice().sort((a, b) => reihenfolge[D.def(a.id).art] - reihenfolge[D.def(b.id).art] || D.def(a.id).preis - D.def(b.id).preis);
    let html = '<div class="f-info">Deine Maschinen: Sie nutzen sich bei der Arbeit ab (langsamer, ab 15 % kaputt). In der Werkstatt wird repariert. Neue Maschinen gibt es im 🏪 Händler.</div>';
    liste.forEach(m => {
      const d = D.def(m.id), job = m.job ? S.jobs.find(j => j.id === m.job) : null;
      const status = job ? '<span class="f-badge gelb">arbeitet: ' + D.SCHRITTE[job.schritt].name + ' · Feld ' + job.feld + '</span>' : m.zustand < 15 ? '<span class="f-badge rot">kaputt</span>' : '<span class="f-badge">frei</span>';
      const kosten = M.reparaturKosten(m);
      html += '<div class="f-zeile"><img src="' + vorschauBild(d) + '" style="width:120px;height:64px;object-fit:contain;background:#3b6a30;border-radius:8px"><div class="n">' + d.name + ' ' + status +
        '<small>' + D.MARKEN[d.marke].name + (d.ps ? ' · ' + d.ps + ' PS' : '') + ' · Zustand ' + Math.round(m.zustand) + ' %</small><div class="f-bal ' + (m.zustand < 30 ? 'rot' : m.zustand < 60 ? 'gelb' : '') + '"><div style="width:' + Math.round(m.zustand) + '%"></div></div></div>' +
        '<button class="f-kauf sek" data-a="reparieren" data-id="' + m.uid + '"' + (m.job || m.zustand >= 99.5 || S.geld < kosten ? ' disabled' : '') + '>🔧 ' + (m.zustand >= 99.5 ? 'top' : fmt(kosten) + ' €') + '</button>' +
        '<button class="f-kauf sek" data-a="mverkauf" data-id="' + m.uid + '"' + (m.job ? ' disabled' : '') + '>Verkaufen ' + fmt(M.verkaufswert(m)) + ' €</button></div>';
    });
    dialogAuf(kopf('Fuhrpark', geldPille()) + '<div class="f-inhalt">' + html + '</div>');
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Felderuebersicht
  // ----------------------------------------------------------------------------------------------
  function dialogFelder() { dlg = { typ: 'felder' }; zeichneFelder(); }
  function zeichneFelder() {
    const S = stand(), now = jetzt();
    let html = '<div class="f-info">Alle deine Felder auf einen Blick. Tippe auf „Öffnen“, um zu arbeiten.</div>';
    D.FELDER.forEach(d => {
      const f = S.felder[d.id];
      if (!f) return;
      const job = M.jobAufFeld(d.id);
      let text;
      if (job) { const st = M.jobStand(job, now); text = D.SCHRITTE[job.schritt].icon + ' ' + D.SCHRITTE[job.schritt].name + ' · ' + (st.teil === 'arbeit' ? Math.round(st.p * 100) + ' % · noch ' + A.zeitText(st.restMs) : st.teil === 'hin' ? 'fährt hin' : 'fertig'); }
      else if (f.phase === 'waechst') text = '🌱 ' + phasenText(f, now) + ' · noch ' + A.zeitText(M.restWachsen(d.id, now));
      else if (f.phase === 'reif') text = '🌾 ' + phasenText(f, now);
      else text = phasenText(f, now) + ' – wartet auf dich';
      html += '<div class="f-zeile"><div class="n">' + d.name + ' · ' + fmt1(d.ha) + ' ha' + (f.auto ? ' <span class="f-badge">👨‍🌾 Fahrer</span>' : '') + (f.phase === 'reif' && !job ? ' <span class="f-badge gelb">ernten!</span>' : '') + '<small>' + text + '</small></div>' +
        '<button class="f-kauf sek" data-a="zeigen" data-id="' + d.id + '">📍</button><button class="f-kauf gruen" data-a="feldoeffnen" data-id="' + d.id + '">Öffnen</button></div>';
    });
    const frei = D.FELDER.filter(d => !S.felder[d.id]);
    if (frei.length) html += '<div class="f-h3">Zu kaufen</div>' + frei.slice(0, 6).map(d => '<div class="f-zeile"><div class="n">' + d.name + ' · ' + fmt1(d.ha) + ' ha<small>' + fmt(d.preis) + ' € · ab Level ' + d.lvl + '</small></div><button class="f-kauf sek" data-a="zeigen" data-id="' + d.id + '">📍</button><button class="f-kauf" data-a="feldoeffnen" data-id="' + d.id + '">Ansehen</button></div>').join('');
    dialogAuf(kopf('Meine Felder', geldPille()) + '<div class="f-inhalt">' + html + '</div>');
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Menue / Hilfe / Level
  // ----------------------------------------------------------------------------------------------
  function dialogMenue() {
    dlg = { typ: 'menue' };
    const S = stand();
    dialogAuf('<div class="f-kopf"><h2 data-a="tempoKlick">Menü</h2><button class="f-x" data-a="zu">✕</button></div><div class="f-inhalt"><div class="f-btnreihe" style="flex-direction:column">' +
      '<button class="f-kauf gruen" data-a="zu">▶ Weiterspielen</button>' +
      '<button class="f-kauf sek" data-a="hilfe">❓ So funktioniert\'s</button>' +
      '<button class="f-kauf sek" data-a="ton">' + (S.ton ? '🔊 Signaltöne: an' : '🔇 Signaltöne: aus') + '</button>' +
      '<button class="f-kauf sek" data-a="neu">🗑 Neu anfangen</button>' +
      '<button class="f-kauf sek" data-a="beenden">⬅ Hof verlassen</button></div>' +
      '<div class="f-info" style="margin-top:14px">Level ' + S.level + ' · ' + fmt(S.statistik.geerntet / 1000) + ' t geerntet · ' + fmt(S.statistik.verkauft) + ' € verkauft · ' + S.statistik.jobs + ' Arbeitsaufträge</div>' +
      (tempoKlicks >= 5 ? '<div class="f-h3">Für Papa: Zeitraffer</div><div class="f-btnreihe">' + [1, 5, 20, 100].map(x => '<button class="f-kauf ' + (S.tempo === x ? 'gruen' : 'sek') + '" data-a="tempo" data-id="' + x + '">×' + x + '</button>').join('') + '</div><div class="f-info">Gilt für neu gestartete Arbeiten und Wachstum.</div>' : '') +
      '</div>', true);
  }
  function dialogHilfe() {
    dlg = { typ: 'hilfe' };
    dialogAuf(kopf('So bewirtschaftest du deinen Hof') + '<div class="f-inhalt f-gross"><ol class="f-liste">' +
      '<li><b>Tippe auf ein Feld</b> und wähle einen Arbeitsschritt: erst <b>Grubbern</b> (oder Pflügen), dann <b>Säen</b>.</li>' +
      '<li>Die Maschinen fahren <b>von allein</b> los und bearbeiten das Feld Bahn für Bahn. Das dauert – auch wenn du das Spiel schließt!</li>' +
      '<li><b>Düngen, Spritzen und Walzen</b> geben mehr Ertrag. Kalken verbessert den Boden.</li>' +
      '<li>Die Pflanzen <b>wachsen von allein</b> (nichts verdorrt). Wenn sie reif sind: <b>Ernten</b> mit Mähdrescher oder Roder.</li>' +
      '<li>Die Ernte liegt im <b>Silo</b> (📦 Lager). Verkaufe, wenn der Preis gut ist – oder liefere <b>Aufträge</b> (📋) für extra Lohn.</li>' +
      '<li>Mit <b>Betrieben</b> (🏭) machst du aus Weizen Mehl und Brot, aus Raps Öl …</li>' +
      '<li>Im <b>Händler</b> (🏪) kaufst du größere, schnellere Maschinen – und später <b>Fahrer</b>, die ein Feld ganz allein bewirtschaften.</li>' +
      '<li>Im <b>Tierhof</b> (🐔) leben Hühner, Bienen, Kühe und Schafe: Füttern, Eier/Milch/Wolle/Honig <b>einsammeln</b> – und in Käserei und Bäckerei veredeln.</li>' +
      '<li>Das <b>Wetter</b> ändert sich ständig: Regen lässt Pflanzen schneller wachsen, Hitze bremst sie. Mit der Wetterstation siehst du es voraus.</li>' +
      '<li>Mit Erfahrung steigst du auf und schaltest neue Felder, Früchte und Maschinen frei.</li></ol>' +
      '<div class="f-info">⏩ Am Anfang laufen die Arbeiten extra schnell – bis du deine erste Ernte verkauft hast.</div>' +
      '<div class="f-btnreihe"><button class="f-kauf gruen" data-a="zu">Los geht\'s!</button></div></div>');
  }
  function dialogLevel(level, bonus) {
    const neu = [];
    D.TRAKTOREN.concat(D.GERAETE, D.ERNTER).forEach(x => { if (x.lvl === level) neu.push((x.art === 'traktor' ? '🚜 ' : x.art === 'ernter' ? '🌾 ' : '🔧 ') + x.name); });
    D.FRUECHTE.forEach(x => { if (x.lvl === level) neu.push('🌱 ' + x.name); });
    D.FELDER.forEach(x => { if (x.lvl === level) neu.push('🏞 ' + x.name + ' (zu kaufen)'); });
    D.PRODUKTION.forEach(x => { if (x.lvl === level) neu.push(x.icon + ' ' + x.name); });
    D.FAHRER.forEach((x, i) => { if (x.lvl === level) neu.push('👨‍🌾 Fahrer Nr. ' + (i + 1)); });
    D.TIERE.forEach(x => { if (x.lvl === level) neu.push(x.icon + ' ' + x.stall); });
    D.WETTERSTATION.forEach(x => { if (x.lvl === level) neu.push('🌦 ' + x.name); });
    if (level === D.BEREGNUNG_LVL) neu.push('💦 Beregnungsanlagen für Felder');
    dlg = { typ: 'level' };
    dialogAuf('<div class="f-kopf"><h2>🎉 Level ' + level + '!</h2><button class="f-x" data-a="zu">✕</button></div><div class="f-inhalt"><div class="f-info">Bonus: <b>+' + fmt(bonus) + ' €</b></div>' +
      (neu.length ? '<div class="f-h3">Neu freigeschaltet</div><div class="f-info">' + neu.join('<br>') + '</div>' : '') + '<div class="f-btnreihe"><button class="f-kauf gruen" data-a="zu">Weiter</button></div></div>', true);
  }

  // ----------------------------------------------------------------------------------------------
  // Aktionen (Klicks)
  // ----------------------------------------------------------------------------------------------
  function klick(e) {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    aktion(el.getAttribute('data-a'), el.getAttribute('data-id'));
  }
  function ergebnis(r, okText, typ) {
    if (r && r.ok) { if (okText) toast(okText, typ || 'gut', 'erg'); piep('geld'); return true; }
    toast((r && r.grund) || 'Das geht gerade nicht.', 'warn', 'erg'); piep('fehler');
    return false;
  }
  function aktion(a, id) {
    const S = stand();
    switch (a) {
      case 'zu': return dialogZu();
      case 'zoom+': cam.z *= 1.25; cam.ziel = null; return klemmen();
      case 'zoom-': cam.z /= 1.25; cam.ziel = null; return klemmen();
      case 'felder': return dialogFelder();
      case 'auftraege': return dialogAuftraege();
      case 'lager': return dialogLager();
      case 'betriebe': return dialogBetriebe();
      case 'tiere': return dialogTiere();
      case 'wetter': return dialogWetter();
      case 'fuhrpark': return dialogFuhrpark();
      case 'shop': return dialogShop(id || 'traktor');
      case 'menue': return dialogMenue();
      case 'hilfe': return dialogHilfe();
      case 'hinweisZeigen': { const h = hinweisBerechnen(); if (h && h.feld) { const m = feldMitte(h.feld); fliegeZu(m.x, m.y, 0.85); } else if (h && h.tier) { const d = D.tier(h.tier); fliegeZu(d.haus.x + d.haus.w / 2, d.haus.y + 90, 0.8); } return; }
      case 'tempoKlick': tempoKlicks++; if (tempoKlicks === 5) dialogMenue(); return;
      case 'tempo': M.tempoSetzen(+id); toast('Zeitraffer ×' + id, 'gut', 'tempo'); return dialogMenue();
      case 'ton': S.ton = !S.ton; if (S.ton) tonStart(); return dialogMenue();
      case 'neu': if (window.confirm('Wirklich alles löschen und neu anfangen?')) { M.neu(jetzt()); speichern(); dialogZu(); toast('Neuer Hof!', 'gut', 'neu'); } return;
      case 'beenden': return schliessen();
      case 'feldzurueck': dlg.sub = (dlg.sub && dlg.sub.frucht && dlg.sub.schritt === 'saeen') ? { schritt: 'saeen' } : null; return zeichneFeldDialog();
      case 'schritt': dlg.sub = { schritt: id }; return zeichneFeldDialog();
      case 'saatwahl': dlg.sub = { schritt: 'saeen', frucht: id }; return zeichneFeldDialog();
      case 'traktorWechsel': {
        dlg.wahl[id] = (dlg.wahl[id] || 0) + 1;
        const o = M.optionen(dlg.id, dlg.sub.schritt, dlg.sub.frucht).find(x => String(x.geraet || x.traktor) === String(id));
        if (o && o.traktoren && dlg.wahl[id] >= o.traktoren.length) dlg.wahl[id] = 0;
        return zeichneFeldDialog();
      }
      case 'start': {
        const p = id.split(':');
        const r = M.arbeitStarten(dlg.id, dlg.sub.schritt, { geraet: +p[0] || null, traktor: +p[1], frucht: dlg.sub.frucht }, jetzt());
        if (ergebnis(r, 'Die Maschine fährt los!', 'gut')) { dlg.sub = null; zeichneFeldDialog(); speichern(); }
        return;
      }
      case 'jobAbbruch': if (window.confirm('Arbeit wirklich abbrechen? Die Kosten sind weg.')) { M.arbeitAbbrechen(+id); dlg.sub = null; zeichneFeldDialog(); } return;
      case 'autoAn': if (ergebnis(M.autoSetzen(dlg.id, id), 'Der Fahrer übernimmt das Feld.')) zeichneFeldDialog(); return;
      case 'autoAus': M.autoSetzen(dlg.id, null); return zeichneFeldDialog();
      case 'zeigen': { const m = feldMitte(+id); dialogZu(); fliegeZu(m.x, m.y, 0.8); return; }
      case 'feldoeffnen': return dialogFeld(+id);
      case 'feldkauf': { const r = M.feldKaufen(+id); if (ergebnis(r, D.feld(+id).name + ' gehört jetzt dir!')) { dialogFeld(+id); speichern(); } return; }
      case 'shoptab': dlg.tab = id; return zeichneShop();
      case 'kaufen': { const r = M.maschineKaufen(id); if (ergebnis(r, D.def(id).name + ' gekauft – steht auf dem Hof.')) { zeichneShop(); speichern(); } return; }
      case 'fahrerKauf': if (ergebnis(M.fahrerKaufen(), 'Fahrer eingestellt!')) { zeichneShop(); speichern(); } return;
      case 'siloKauf': if (ergebnis(M.lagerAusbauen(), 'Das Silo ist größer!')) { zeichneShop(); speichern(); } return;
      case 'verkauf': {
        const p = id.split(':'), had = S.silo[p[0]] || 0, kg = p[1] === 'half' ? had / 2 : had;
        const r = M.verkaufen(p[0], kg);
        if (ergebnis(r, r.ok ? '+' + fmt(r.erloes) + ' € verkauft' : '', 'geld')) { zeichneLager(); speichern(); }
        return;
      }
      case 'liefern': { const r = M.auftragLiefern(+id); if (ergebnis(r, r.ok ? 'Auftrag erledigt: +' + fmt(r.lohn) + ' €' : '', 'geld')) { zeichneAuftraege(); speichern(); } return; }
      case 'bauen': if (ergebnis(M.produktionBauen(id), 'Betrieb gebaut!')) { zeichneBetriebe(); speichern(); } return;
      case 'prodAus': if (ergebnis(M.produktionAusbauen(id), 'Betrieb ausgebaut!')) { zeichneBetriebe(); speichern(); } return;
      case 'prod': { const p = id.split(':'); const r = M.produktionStarten(p[0], p[1], +p[2], jetzt()); if (ergebnis(r, r.ok ? r.anzahl + '× in Produktion' : '', 'gut')) { zeichneBetriebe(); speichern(); } return; }
      case 'beregnung': if (ergebnis(M.beregnungKaufen(dlg.id), 'Beregnungsanlage eingebaut!')) { zeichneFeldDialog(); speichern(); } return;
      case 'stationKauf': if (ergebnis(M.wetterstationKaufen(), 'Wetterstation gebaut!')) { zeichneWetter(); speichern(); } return;
      case 'stallBau': if (ergebnis(M.stallBauen(id), D.tier(id).stall + ' gebaut!')) { zeichneTiere(); speichern(); } return;
      case 'tierKauf': { const p = id.split(':'); const r = M.tierKaufen(p[0], +p[1]); if (ergebnis(r, r.ok ? r.anzahl + '× ' + D.tier(p[0]).tier + ' gekauft' : '')) { zeichneTiere(); speichern(); } return; }
      case 'stallAus': if (ergebnis(M.stallAusbauen(id), 'Stall ausgebaut!')) { zeichneTiere(); speichern(); } return;
      case 'automat': if (ergebnis(M.automatKaufen(id), 'Futterautomat eingebaut!')) { zeichneTiere(); speichern(); } return;
      case 'fuettern': { const r = M.fuettern(id); if (ergebnis(r, r.ok ? tonnen(r.kg) + ' Futter eingefüllt' : '', 'gut')) { zeichneTiere(); speichern(); } return; }
      case 'einsammeln': { const r = M.einsammeln(id); if (ergebnis(r, r.ok ? tonnen(r.kg) + ' ' + D.gut(r.gut).name + ' im Lager' + (r.ueber > 1 ? ' (Silo voll: Rest verkauft)' : '') : '', 'geld')) { zeichneTiere(); speichern(); } return; }
      case 'reparieren': if (ergebnis(M.maschineReparieren(+id), 'Repariert!')) zeichneFuhrpark(); return;
      case 'mverkauf': if (window.confirm('Maschine wirklich verkaufen?') && ergebnis(M.maschineVerkaufen(+id), 'Verkauft.', 'geld')) zeichneFuhrpark(); return;
      default: return;
    }
  }
  function taste(e) {
    if (!wurzel) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { if (dlg) dialogZu(); else dialogMenue(); }
    else if (k === '+' || k === '=') aktion('zoom+');
    else if (k === '-') aktion('zoom-');
    else if (!dlg && (k === 'arrowleft' || k === 'a')) { cam.x -= 60 / cam.z; klemmen(); }
    else if (!dlg && (k === 'arrowright' || k === 'd')) { cam.x += 60 / cam.z; klemmen(); }
    else if (!dlg && (k === 'arrowup' || k === 'w')) { cam.y -= 60 / cam.z; klemmen(); }
    else if (!dlg && (k === 'arrowdown' || k === 's')) { cam.y += 60 / cam.z; klemmen(); }
  }

  // ----------------------------------------------------------------------------------------------
  // Hinweise (naechster sinnvoller Schritt)
  // ----------------------------------------------------------------------------------------------
  function hinweisBerechnen() {
    const S = stand(), now = jetzt();
    const felder = Object.keys(S.felder).map(Number);
    for (const id of felder) { const f = S.felder[id]; if (!M.jobAufFeld(id) && f.phase === 'reif' && !f.auto) return { t: D.feld(id).name + ' ist erntereif – tippe darauf zum Ernten!', feld: id }; }
    for (const id of felder) {
      const f = S.felder[id];
      if (M.jobAufFeld(id) || f.auto) continue;
      if (f.phase === 'stoppel') return { t: S.statistik.jobs === 0 ? 'Tippe auf dein Feld und starte das Grubbern.' : D.feld(id).name + ' wartet auf Bearbeitung – tippe darauf.', feld: id };
      if (f.phase === 'bearbeitet' || f.phase === 'gepfluegt') return { t: D.feld(id).name + ' ist bereit zum Säen – tippe darauf.', feld: id };
    }
    for (const d of D.TIERE) {
      const st = S.tiere[d.id];
      if (!st || !st.anzahl) continue;
      const ss = M.stallStand(d.id, now);
      if (d.futterKgH && !ss.laeuft) return { t: d.icon + ' ' + d.name + ' haben kein Futter mehr – füttere sie im 🐔 Tierhof.', feld: null, tier: d.id };
      if (ss.lagerKap > 0 && st.lager >= ss.lagerKap * 0.8) return { t: d.icon + ' ' + D.gut(d.gut).name + ' sind bereit – im 🐔 Tierhof einsammeln!', feld: null, tier: d.id };
    }
    if (M.lagerMenge() > M.siloKap() * 0.85) return { t: 'Das Lager ist fast voll – verkaufe etwas im 📦 Lager.', feld: null };
    if (S.jobs.length) {
      const j = S.jobs[0], st = M.jobStand(j, now);
      return { t: D.SCHRITTE[j.schritt].name + ' auf ' + D.feld(j.feld).name + ' – noch ' + A.zeitText(st.restMs) + '.', feld: j.feld };
    }
    const w = felder.filter(id => S.felder[id].phase === 'waechst');
    if (w.length) {
      const id = w.sort((a, b) => M.restWachsen(a, now) - M.restWachsen(b, now))[0];
      return { t: D.feld(id).name + ' wächst – noch ' + A.zeitText(M.restWachsen(id, now)) + '. Düngen bringt mehr Ertrag!', feld: id };
    }
    const nf = D.FELDER.find(d => !S.felder[d.id] && S.level >= d.lvl);
    if (nf && S.geld >= nf.preis) return { t: 'Du kannst ' + nf.name + ' kaufen – tippe auf das Feld!', feld: nf.id };
    return null;
  }

  // ----------------------------------------------------------------------------------------------
  // Ereignisse aus der Logik
  // ----------------------------------------------------------------------------------------------
  function ereignisse(art, d) {
    if (!wurzel) return;
    if (art === 'jobFertig') { toast(D.feld(d.job.feld).name + ': ' + D.SCHRITTE[d.job.schritt].name + ' fertig', 'gut', 'jf' + d.job.id); piep('fertig'); }
    else if (art === 'reif') { toast(D.feld(d.feld).name + ' ist erntereif! 🌾', 'gut', 'reif' + d.feld); piep('fertig'); }
    else if (art === 'ernte') toast(D.feld(d.feld).name + ': ' + tonnen(d.kg) + ' ' + D.gut(d.gut).name + ' geerntet' + (d.ueber > 1 ? ' (Silo voll: ' + tonnen(d.ueber) + ' verkauft)' : ''), 'geld', 'ernte' + d.feld);
    else if (art === 'level') { piep('level'); if (dlg && dlg.typ !== 'level') levelWarte.push({ level: d.level, bonus: d.bonus }); else dialogLevel(d.level, d.bonus); }
    else if (art === 'prodFertig') { toast(D.betrieb(d.betrieb).name + ': ' + tonnen(d.kg) + ' ' + D.gut(d.gut).name + ' fertig', 'gut', 'pf' + d.betrieb); piep('fertig'); }
    else if (art === 'auftragNeu') toast('Neuer Auftrag: ' + tonnen(d.auftrag.kg) + ' ' + D.gut(d.auftrag.gut).name, '', 'an');
    else if (art === 'anfangEnde') toast('Anfangsbonus vorbei – ab jetzt dauern Arbeiten so lange wie auf einem echten Hof!', '', 'ae');
    else if (art === 'wetter') { const x = D.WETTER[d.typ]; toast(x.icon + ' ' + x.name + ' – ' + x.text, '', 'wetter'); }
    else if (art === 'stallVoll') toast(D.tier(d.id).icon + ' ' + D.tier(d.id).stall + ' ist voll – einsammeln!', 'geld', 'sv' + d.id);
    else if (art === 'umgebrochen') toast(D.feld(d.feld).name + ': Der Pflug hat die Pflanzen umgebrochen.', 'warn', 'ub');
  }

  // ----------------------------------------------------------------------------------------------
  // Hauptschleife
  // ----------------------------------------------------------------------------------------------
  function hudAktualisieren(dt) {
    const S = stand();
    geldAnzeige += (S.geld - geldAnzeige) * Math.min(1, dt * 8);
    if (Math.abs(S.geld - geldAnzeige) < 1) geldAnzeige = S.geld;
    R.geld.textContent = fmt(geldAnzeige) + ' €';
    timer.hud -= dt;
    if (timer.hud > 0) return;
    timer.hud = 0.3;
    R.lvl.textContent = 'Level ' + S.level;
    const wt = M.wetter(jetzt());
    R.wetter.textContent = wt.icon + ' ' + wt.name;
    R.xp.style.width = Math.round(S.xp / D.xpFuerLevel(S.level) * 100) + '%';
    const h = hinweisBerechnen();
    if (h && !dlg) { R.hinweis.classList.remove('leer'); R.hinweisT.textContent = h.t; } else R.hinweis.classList.add('leer');
    const n = S.auftraege.filter(a => (S.silo[a.gut] || 0) >= a.kg).length;
    R.pktAuf.style.display = n ? 'flex' : 'none'; R.pktAuf.textContent = n;
  }
  function frame(ts) {
    if (!laeuft) return;
    raf = requestAnimationFrame(frame);
    let dt = tLast ? (ts - tLast) / 1000 : 0.016; tLast = ts;
    if (!(dt > 0)) dt = 0.016;
    dt = Math.min(dt, 0.1);
    tSpiel += dt;
    const now = jetzt();
    timer.sim += dt;
    if (timer.sim >= 0.25) { M.simuliere(now); timer.sim = 0; }
    timer.speicher += dt;
    if (timer.speicher >= 10) { speichern(); timer.speicher = 0; }
    if (cam.ziel) {
      const k = Math.min(1, dt * 4);
      cam.x += (cam.ziel.x - cam.x) * k; cam.y += (cam.ziel.y - cam.y) * k; cam.z += (cam.ziel.z - cam.z) * k;
      if (Math.hypot(cam.ziel.x - cam.x, cam.ziel.y - cam.y) < 3 && Math.abs(cam.ziel.z - cam.z) < 0.01) cam.ziel = null;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#2c4a24'; g.fillRect(0, 0, W, H);
    g.save();
    g.translate(W / 2, H / 2); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
    A.zeichneWelt(g, cam, W, H, tSpiel, now, dt);
    g.restore();
    A.zeichneWetter(g, W, H, tSpiel, M.wetterTyp(now));
    A.zeichneBeschriftungen(g, cam, W, H, now, tSpiel);
    hudAktualisieren(dt);
    timer.dlg += dt;
    if (dlg && timer.dlg >= 1 && !dlgAnfasst && Date.now() - dlgAnfassEnde > 500) {
      timer.dlg = 0;
      const t = dlg.typ;
      if (t === 'feld') zeichneFeldDialog();
      else if (t === 'auftraege') zeichneAuftraege();
      else if (t === 'betriebe') zeichneBetriebe();
      else if (t === 'felder') zeichneFelder();
      else if (t === 'tiere') zeichneTiere();
      else if (t === 'wetter') zeichneWetter();
    }
  }

  // ----------------------------------------------------------------------------------------------
  // Speichern / Start / Ende
  // ----------------------------------------------------------------------------------------------
  function speichern() {
    try { localStorage.setItem(M.SPEICHER, M.speichern()); } catch (e) { /* Speicher voll/gesperrt */ }
  }
  let hoererGesetzt = false;
  function oeffnen(beimSchliessen) {
    if (wurzel) return;
    ausgang = beimSchliessen || null;
    baueOberflaeche();
    let roh = null;
    try { roh = localStorage.getItem(M.SPEICHER); } catch (e) { roh = null; }
    const erstes = !roh;
    const jetztMs = jetzt();
    if (!roh || !M.laden(roh, jetztMs)) M.neu(jetztMs);
    if (!hoererGesetzt) { M.beiEreignis(ereignisse); hoererGesetzt = true; }
    geldAnzeige = stand().geld;
    cam.x = 1720; cam.y = 1500; cam.z = Math.min(1, Math.max(0.45, Math.min(W / 1500, H / 1000))); cam.ziel = null;
    tempoKlicks = 0; dlg = null;
    timer = { sim: 0, speicher: 0, hud: 0, dlg: 0 };
    laeuft = true; tLast = 0; tSpiel = 0;
    raf = requestAnimationFrame(frame);
    tonStart();
    if (erstes) dialogHilfe();
  }
  function schliessen() {
    laeuft = false; cancelAnimationFrame(raf);
    speichern();
    if (ton) { try { ton.ac.close(); } catch (e) { /* egal */ } ton = null; }
    abbauen();
    if (ausgang) ausgang();
    else if (typeof App !== 'undefined' && App.renderSpieleMenu) App.renderSpieleMenu();
  }
  function fortschrittText() {
    try {
      const raw = JSON.parse(localStorage.getItem(M.SPEICHER) || 'null');
      if (!raw || raw.v !== 2) return 'Neuer Hof';
      return 'Level ' + raw.level + ' · ' + Object.keys(raw.felder || {}).length + ' Felder';
    } catch (e) { return 'Neuer Hof'; }
  }

  return {
    oeffnen, schliessen, fortschrittText,
    _t: { M, A, aktion, dlg: () => dlg, dialogFeld, dialogShop, dialogLager, dialogAuftraege, dialogBetriebe, dialogFuhrpark, dialogFelder, dialogMenue, dialogHilfe, dialogTiere, dialogWetter, hinweisBerechnen, cam, toast, speichern }
  };
})();
