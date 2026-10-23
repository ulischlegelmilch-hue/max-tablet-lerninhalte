// Hof-Farm: Oberflaeche (Vollbild-Spiel). Max faehrt nicht selbst - er kauft Maschinen und schickt sie als Auftraege auf die
// Felder. Logik: farm-modell.js, Darstellung: farm-ansicht.js, Daten: farm-daten.js, Grafik: farm-gfx.js.
// Bewusst OHNE Anbindung an Sterne/Guthaben/Lernen (Uli 21.10.2026: "erstmal nur das Spiel spielen") - Schnittstelle spaeter.
const Farm = (function () {
  const D = FarmDaten, G = FarmGfx, M = FarmModell, A = FarmAnsicht;

  let wurzel = null, cv = null, g = null, R = {};
  let W = 0, H = 0, dpr = 1;
  // Auflösung passt sich der Geschwindigkeit des Geräts an (nur abwärts, damit nichts hin- und herspringt)
  const DPR_STUFEN = [2, 1.5, 1.25, 1, 0.8, 0.65];
  let dprStufe = 0, frameMs = 16, frameAb = 0;
  let laeuft = false, raf = 0, tLast = 0, tSpiel = 0;
  const cam = { x: 1750, y: 1450, z: 0.8, ziel: null };
  let dlg = null;                 // { typ, ... } geoeffneter Dialog
  let dlgAnfasst = false, dlgAnfassEnde = 0;
  let timer = { sim: 0, speicher: 0, hud: 0, dlg: 0 };
  let ton = null;
  let vorschauCache = {};
  let ausgang = null;
  let geldAnzeige = 0, geldLetzt = null;
  let tempoKlicks = 0;
  let bestaetigenFn = null;
  const zeiger = {};

  const fmt = n => Math.round(n).toLocaleString('de-DE');
  const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('de-DE');
  const tonnen = kg => (kg >= 100000 ? fmt(kg / 1000) : fmt1(kg / 1000)) + ' t';
  const meter = px => fmt1(px / D.PX_JE_M) + ' m';
  // Gemeinsamer Hof: Ist fernKonfig gesetzt ({ basis, von: 'max'|'papa' }), liegt der Spielstand auf dem Pi (backend/farm-server.js).
  // Dann rechnet NUR der Server die Zeit weiter; hier werden Befehle geschickt und der Stand per Poll geholt.
  let fernKonfig = null;
  let fern = null;
  function konfig(c) { fernKonfig = c && c.fern ? c.fern : null; }
  const jetzt = () => Date.now() + (fern ? fern.offset : 0);
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
  .f-ib{transition:transform .12s,background .12s}.f-ib:active{transform:scale(.88)}
  .f-box button{transition:transform .1s,filter .1s}.f-box button:active{transform:scale(.95);filter:brightness(1.12)}
  .f-dlg.f-neu{animation:fdlgin .18s ease-out}.f-dlg.f-neu .f-box{animation:fboxin .26s cubic-bezier(.2,.9,.3,1.25)}
  @keyframes fdlgin{from{background-color:rgba(6,12,8,0)}to{background-color:rgba(6,12,8,.66)}}
  @keyframes fboxin{from{transform:scale(.9) translateY(14px);opacity:0}to{transform:none;opacity:1}}
  .f-geld.puls{animation:fpuls .45s ease-out}
  @keyframes fpuls{0%{transform:scale(1)}30%{transform:scale(1.18)}100%{transform:scale(1)}}
  .f-plus{position:absolute;z-index:7;pointer-events:none;font-weight:800;color:#ffe27a;text-shadow:0 2px 6px #000,0 0 12px rgba(255,200,60,.6);font-size:20px;animation:fplus 1.3s ease-out forwards;white-space:nowrap}
  @keyframes fplus{0%{transform:translate(-50%,0) scale(.7);opacity:0}15%{transform:translate(-50%,-6px) scale(1.15);opacity:1}100%{transform:translate(-50%,-48px) scale(1);opacity:0}}
  .f-muenze{position:absolute;z-index:7;pointer-events:none;font-size:22px;transition:transform .8s cubic-bezier(.5,0,.8,.4),opacity .8s;will-change:transform}
  .f-konf{position:absolute;top:-16px;z-index:9;pointer-events:none;width:9px;height:14px;border-radius:2px;animation:fkonf linear forwards}
  @keyframes fkonf{0%{transform:translateY(0) rotate(0)}100%{transform:translateY(105vh) rotate(720deg)}}
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
  .f-album{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}
  .f-card{border-radius:16px;padding:10px;display:flex;flex-direction:column;text-align:left;background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.2);min-height:150px}
  .f-card.frei{border-color:#ffd24a;box-shadow:0 0 0 1px rgba(255,210,74,.25),0 4px 14px rgba(0,0,0,.3)}
  .f-card.zu{filter:grayscale(1);opacity:.55;border-style:dashed}
  .f-card .gr{font-size:44px;text-align:center;line-height:1.1;margin:6px 0}
  .f-card img{width:100%;height:84px;object-fit:contain;background:radial-gradient(#4c7a3d,#335a2b);border-radius:10px}
  .f-card b{font-size:14.5px;margin-top:4px}
  .f-card .s{font-size:12px;opacity:.9;line-height:1.35;margin-top:3px}
  .f-pips{display:inline-block;letter-spacing:2px;color:#ffd24a;font-size:13px;margin-left:6px}
  .f-offline{position:absolute;left:50%;top:6px;transform:translateX(-50%);background:rgba(160,50,30,.95);border:1px solid #ff9a7a;border-radius:14px;padding:6px 16px;font-weight:700;font-size:14px;z-index:7;display:none}
  .f-mit{background:rgba(32,100,48,.88)!important;border-color:#8cf09a!important}
  .f-lade{position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#1d2a1f;z-index:9;text-align:center;padding:20px}
  .f-lade h2{margin:0 0 10px}.f-lade p{opacity:.85;max-width:420px;line-height:1.45;margin:0 0 14px}
  .f-chronik{font-size:13px;line-height:1.5}.f-chronik b{color:#ffe27a}
  @media (max-width:820px){
    .f-hinweis{min-width:0;overflow:hidden}.f-hinweis>div{max-width:100%;font-size:13px;padding:7px 12px}
    .f-top{padding:6px 8px}.f-geld{font-size:17px;min-width:100px;padding:5px 10px}.f-lvl,.f-wetter{font-size:12px;padding:4px 9px}
    .f-links{margin-right:6px}.f-ib{width:44px;height:44px;font-size:21px;margin:0 0 16px 6px}.f-ib small{font-size:9.5px;bottom:-13px}
    .f-hinweis>div{font-size:12.5px;padding:6px 10px;max-width:58vw}
    .f-dlg{padding:6px}.f-box{border-radius:16px}.f-inhalt{padding:10px}.f-gitter{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
    .f-album{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}.f-zeile{flex-wrap:wrap}.f-kauf{font-size:13.5px}
    .f-toasts{width:94%;bottom:12px}.f-toast{font-size:13.5px}
  }
  @media (max-width:820px), (max-height:480px){
    .f-btns{position:fixed;left:0;right:0;bottom:0;max-width:none;flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;-webkit-overflow-scrolling:touch;background:rgba(14,22,16,.93);padding:6px 8px 2px;border-top:1px solid rgba(255,255,255,.15);z-index:4;touch-action:pan-x}
    .f-btns .f-ib{flex:0 0 auto;margin:0 8px 14px 0}
    .f-zoom{bottom:86px}.f-toasts{bottom:88px}
  }
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
          <div class="f-pill f-wetter" id="f-tag" data-a="tagTab">📅 Heute</div>
          <div class="f-pill f-wetter" id="f-schule" data-a="tagTab" style="display:none">📚 Schule</div>
          <div class="f-pill f-wetter f-mit" id="f-mit" style="display:none"></div>
        </div>
        <div class="f-hinweis leer" id="f-hinweis"><div id="f-hinweis-t" data-a="hinweisZeigen"></div></div>
        <div class="f-btns">
          <button class="f-ib" data-a="felder">🌾<small>Felder</small></button>
          <button class="f-ib" data-a="sammlung">🏆<small>Erfolge</small><span class="pkt" id="f-pkt-erf"></span></button>
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
      <div class="f-offline" id="f-offline">⚠ Keine Verbindung zum Hof</div>
      <div class="f-toasts" id="f-toasts"></div>`;
    document.body.appendChild(wurzel);
    cv = wurzel.querySelector('#farm-cv');
    g = cv.getContext('2d');
    R = {
      geld: wurzel.querySelector('#f-geld'), lvl: wurzel.querySelector('#f-lvl'), xp: wurzel.querySelector('#f-xp'),
      hinweis: wurzel.querySelector('#f-hinweis'), hinweisT: wurzel.querySelector('#f-hinweis-t'), toasts: wurzel.querySelector('#f-toasts'),
      pktAuf: wurzel.querySelector('#f-pkt-auf'), pktErf: wurzel.querySelector('#f-pkt-erf'), tag: wurzel.querySelector('#f-tag'), schule: wurzel.querySelector('#f-schule'), mit: wurzel.querySelector('#f-mit'), offline: wurzel.querySelector('#f-offline'), wetter: wurzel.querySelector('#f-wetter')
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
    else if (fern) fernPoll();
    else if (M.stand()) { M.simuliere(jetzt()); }
  }
  function groesse() {
    if (!wurzel) return;
    dpr = Math.min(window.devicePixelRatio || 1, DPR_STUFEN[dprStufe]);
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
    const war = !!d;
    let top = 0;
    if (d) { const sc = d.querySelector('.f-inhalt'); top = sc ? sc.scrollTop : 0; d.parentNode.removeChild(d); }
    d = document.createElement('div');
    d.className = 'f-dlg' + (war ? '' : ' f-neu'); d.id = 'f-dlg';
    d.innerHTML = '<div class="f-box' + (klein ? ' klein' : '') + '">' + html + '</div>';
    wurzel.appendChild(d);
    const sc = d.querySelector('.f-inhalt'); if (sc && top) sc.scrollTop = top;
  }
  // Kleine Belohnungseffekte (nur DOM, leicht): schwebende Zahl am Geld, fliegende Muenzen, Konfetti
  function geldEffekt(plus) {
    if (!wurzel || !R.geld) return;
    R.geld.classList.remove('puls'); void R.geld.offsetWidth; R.geld.classList.add('puls');
    const r = R.geld.getBoundingClientRect(), w = wurzel.getBoundingClientRect();
    const t = document.createElement('div'); t.className = 'f-plus'; t.textContent = '+' + fmt(plus) + ' €';
    t.style.left = (r.left - w.left + r.width / 2) + 'px'; t.style.top = (r.bottom - w.top + 2) + 'px';
    wurzel.appendChild(t); setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 1400);
    const n = plus >= 5000 ? 8 : plus >= 800 ? 5 : plus >= 150 ? 3 : 0;
    for (let i = 0; i < n; i++) {
      const m = document.createElement('div'); m.className = 'f-muenze'; m.textContent = '🪙';
      const sx = w.width * (0.3 + Math.random() * 0.4), sy = w.height * (0.45 + Math.random() * 0.2);
      m.style.left = sx + 'px'; m.style.top = sy + 'px'; m.style.opacity = '1';
      wurzel.appendChild(m);
      const tx = r.left - w.left + r.width / 2 - sx, ty = r.top - w.top + r.height / 2 - sy;
      setTimeout(() => { m.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(.5)'; m.style.opacity = '.2'; }, 40 + i * 70);
      setTimeout(() => { if (m.parentNode) m.parentNode.removeChild(m); }, 1100 + i * 70);
    }
  }
  function konfetti() {
    if (!wurzel) return;
    const farben = ['#ffe27a', '#7fe083', '#ff8a6a', '#8ec9ff', '#e6a8ff'];
    for (let i = 0; i < 36; i++) {
      const k = document.createElement('div'); k.className = 'f-konf';
      k.style.left = (Math.random() * 100) + '%'; k.style.background = farben[i % farben.length];
      k.style.animationDuration = (1.6 + Math.random() * 1.4) + 's'; k.style.animationDelay = (Math.random() * 0.5) + 's';
      wurzel.appendChild(k); setTimeout(() => { if (k.parentNode) k.parentNode.removeChild(k); }, 3800);
    }
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

  // Eigene Rueckfrage (window.confirm geht in den WebViews von Tablet und Papa-App nicht)
  function bestaetigen(text, ja, jaText) {
    confZu();
    const d = document.createElement('div');
    d.className = 'f-dlg'; d.id = 'f-conf'; d.style.zIndex = '8';
    d.innerHTML = '<div class="f-box klein"><div class="f-kopf"><h2>Sicher?</h2></div><div class="f-inhalt"><div class="f-info">' + text + '</div><div class="f-btnreihe"><button class="f-kauf sek" data-a="confNein">Abbrechen</button><button class="f-kauf rot" data-a="confJa">' + (jaText || 'Ja') + '</button></div></div></div>';
    wurzel.appendChild(d);
    bestaetigenFn = ja;
  }
  function confZu() { const c = wurzel && wurzel.querySelector('#f-conf'); if (c) c.parentNode.removeChild(c); }

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
    const zurueck = !job && dlg.lern ? 'lernAbbruch' : (!job && dlg.sub ? 'feldzurueck' : null);
    const chips = '<div class="f-chips"><span class="f-chip">📐 <b>' + fmt1(d.ha) + ' ha</b></span><span class="f-chip">🌍 Boden <b>' + Math.round(f.boden) + ' %</b></span>' +
      '<span class="f-chip">🔁 Vorher: <b>' + (f.vorher.length ? f.vorher.map(x => D.frucht(x).name).join(', ') : '–') + '</b></span>' +
      (f.phase === 'waechst' || f.phase === 'reif' ? '<span class="f-chip">📦 Ertrag ca. <b>' + tonnen(M.ertragsSchaetzungKg(id)) + '</b></span>' : '') + '</div>';
    let inhalt;
    if (dlg.lern) inhalt = lernAnsicht();
    else if (job) inhalt = jobAnsicht(job, now);
    else if (dlg.sub && dlg.sub.schritt === 'saeen' && !dlg.sub.frucht) inhalt = saatWahl(id);
    else if (dlg.sub) inhalt = maschinenWahl(id, dlg.sub.schritt, dlg.sub.frucht);
    else inhalt = feldAktionen(id, f, now);
    dialogAuf(kopf(d.name + ' <span style="font-weight:500;font-size:15px;opacity:.85">· ' + phasenText(f, now) + '</span>', '', zurueck) +
      '<div class="f-inhalt">' + (dlg.lern ? '' : chips) + inhalt + (dlg.sub || job || dlg.lern ? '' : fahrerBlock(f)) + '</div>');
  }
  function lernAnsicht() {
    const L = dlg.lern;
    if (L.ergebnis) {
      const r = L.ergebnis;
      let h = '<div class="f-h3">Lernrunde geschafft</div>';
      if (!r.ok) return h + '<div class="f-info warn">' + r.grund + '</div><div class="f-btnreihe"><button class="f-kauf gruen" data-a="lernEnde">Zurück zum Feld</button></div>';
      h += '<div class="f-info" style="font-size:18px">⭐ <b>' + r.richtig + ' von ' + L.karten.length + '</b> Karten gewusst' + (r.gespartMs > 0 ? '<br>⏱ Die Saat ist <b>' + A.zeitText(r.gespartMs) + '</b> schneller reif!' : '<br>Beim nächsten Mal klappt es besser – die Karten kommen bald wieder dran.') + (r.reif ? '<br>🌾 <b>Das Feld ist jetzt erntereif!</b>' : '') + '</div>';
      const falsch = L.karten.filter((k, i) => !L.gewusst[i]);
      if (falsch.length) h += '<div class="f-info">Das üben wir weiter:<br>' + falsch.map(k => '• ' + k.front).join('<br>') + '</div>';
      return h + '<div class="f-btnreihe"><button class="f-kauf gruen" data-a="lernEnde">Zurück zum Feld</button></div>';
    }
    const k = L.karten[L.i];
    const punkte = L.karten.map((x, i) => '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;margin:0 3px;background:' + (i < L.i ? (L.gewusst[i] ? '#7fe083' : '#ff9a7a') : i === L.i ? '#ffe27a' : 'rgba(255,255,255,.25)') + '"></span>').join('');
    return '<div style="text-align:center;margin:4px 0 10px">' + punkte + '<div style="font-size:13px;opacity:.8;margin-top:4px">Karte ' + (L.i + 1) + ' von ' + L.karten.length + ' · ' + k.titel + '</div></div>' +
      '<div class="f-karte" style="text-align:center;min-height:190px;justify-content:center;font-size:20px;line-height:1.4"><div style="font-weight:700">' + k.front + '</div>' + (L.auf ? '<div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.25);font-size:19px">' + k.back + '</div>' : '') + '</div>' +
      (L.auf ? '<div class="f-btnreihe"><button class="f-kauf gruen" data-a="lernWeiss">✓ Gewusst</button><button class="f-kauf sek" data-a="lernNicht">✗ Noch nicht</button></div>'
        : '<div class="f-btnreihe"><button class="f-kauf" data-a="lernUm">Umdrehen</button></div><div class="f-info" style="margin-top:12px;opacity:.85">Denk erst nach, dann umdrehen – und sei ehrlich: Nur „Gewusst“, wenn du es wirklich gewusst hast!</div>');
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
    if (f.phase === 'waechst' && typeof FarmLernen !== 'undefined' && FarmLernen.verfuegbar()) {
      const uebrig = M.lernRundenUebrig(now);
      const sperre = f.lern ? 'Hier hast du schon gelernt – bei der nächsten Saat geht es wieder.' : (uebrig <= 0 ? 'Heute hast du schon ' + D.LERN_MAX_TAG + ' Lernrunden gemacht – morgen wieder!' : '');
      html += '<div class="f-h3">Schneller reif</div><div class="f-zeile"><div class="ico">📚</div><div class="n">Lernrunde: ' + D.LERN_KARTEN + ' Karten<small>' + (sperre || 'Die Karten, die du am meisten üben solltest. Jede gewusste Karte macht die Saat ' + Math.round(D.LERN_PRO_KARTE * 100) + ' % schneller reif (bis zu −' + Math.round(D.LERN_PRO_KARTE * D.LERN_KARTEN * 100) + ' %). Heute noch ' + uebrig + ' Runde' + (uebrig === 1 ? '' : 'n') + '.') + '</small></div><button class="f-kauf gruen" data-a="lernStart"' + (sperre ? ' disabled' : '') + '>Los</button></div>';
    }
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
    const html = '<div class="f-h3">Fahrer (Routinearbeit)</div>';
    const lohn = M.lohnProTag();
    if (f.auto) return html + '<div class="f-zeile"><div class="ico">👨‍🌾</div><div class="n">Ein Fahrer kümmert sich um die Routine<small>Er kalkt, grubbert und walzt mit freien Maschinen. Säen, Düngen, Spritzen und Ernten machst du selbst.' + (S.lohnOffen > 0 ? ' <b style="color:#ff9a7a">Der Lohn ist offen – er arbeitet erst nach der Zahlung.</b>' : '') + '</small></div><button class="f-kauf rot" data-a="autoAus">Abziehen</button></div>';
    if (!S.fahrer) return html + '<div class="f-info">Ein Fahrer übernimmt auf einem Feld die Routinearbeit (Kalken, Grubbern, Walzen). Du kannst ihn im 🏪 Händler unter „Fahrer“ einstellen (ab Level ' + D.FAHRER[0].lvl + '). Er kostet jeden Tag Lohn.</div>';
    if (M.autoFelder().length >= S.fahrer) return html + '<div class="f-info">Alle deine ' + S.fahrer + ' Fahrer sind schon im Einsatz. Im Händler kannst du weitere einstellen.</div>';
    return html + '<div class="f-info">Du hast einen freien Fahrer! Er kalkt, grubbert und walzt hier. Säen, Düngen, Spritzen und Ernten bleiben bei dir. (Alle Fahrer zusammen kosten ' + fmt(lohn) + ' € Lohn am Tag.)</div><div class="f-btnreihe"><button class="f-kauf gruen" data-a="autoAn" data-id="ja">👨‍🌾 Fahrer hier einsetzen</button></div>';
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
      const vor = M.maschinenVorteile(d.id);
      if (vor.length) stats += '<br><span style="color:#9ff0a8">' + vor.map(x => '✓ ' + x).join('<br>') + '</span>';
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
      inhalt = '<div class="f-info">Ein <b>Fahrer</b> übernimmt auf einem Feld die <b>Routinearbeit</b>: Er kalkt, grubbert und walzt mit freien Maschinen. <b>Säen, Düngen, Spritzen und Ernten machst du selbst.</b> Jeder Fahrer kostet <b>jeden Tag Lohn</b> (' + fmt(Math.round(D.FAHRER_LOHN_ANTEIL * 100)) + ' % seines Einstellpreises); fehlt das Geld, streiken alle Fahrer, bis der Lohn bezahlt ist. Du hast <b>' + S.fahrer + '</b> Fahrer (' + M.autoFelder().length + ' im Einsatz), sie kosten zusammen <b>' + fmt(M.lohnProTag()) + ' € am Tag</b>' + (S.lohnOffen > 0 ? ' – <b style="color:#ff9a7a">' + fmt(S.lohnOffen) + ' € Lohn sind noch offen!</b>' : '') + '.</div>' +
        (n ? '<div class="f-zeile"><div class="ico">👨‍🌾</div><div class="n">Fahrer Nr. ' + (S.fahrer + 1) + '<small>' + (S.level < n.lvl ? 'Gibt es ab Level ' + n.lvl : 'Einstellen und auf einem Feld einsetzen · Lohn ' + fmt(M.fahrerLohn(S.fahrer)) + ' € am Tag') + '</small></div><button class="f-kauf" data-a="fahrerKauf"' + (S.level < n.lvl || S.geld < n.preis ? ' disabled' : '') + '>' + fmt(n.preis) + ' €</button></div>' : '<div class="f-info">Mehr Fahrer gibt es nicht – dein Hof läuft wie am Schnürchen!</div>');
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
    const kap = M.siloKap(), menge = M.lagerMenge(), voll = menge / kap, rest1 = M.zukaufRestKg(jetzt());
    const zeilen = D.alleGueter().map(id => {
      const x = D.gut(id), p = M.preis(id), rel = S.preise[id], lager = S.silo[id] || 0;
      const trend = rel > 1.12 ? '<span class="up">▲ gut</span>' : rel < 0.9 ? '<span class="down">▼ niedrig</span>' : '<span>● normal</span>';
      const gesperrt = D.frucht(id) ? S.level < D.frucht(id).lvl : false;
      if (!lager && (gesperrt || (D.WAREN[id] && !S.album.waren[id]))) return '';
      return '<div class="f-zeile"><div class="ico">' + x.icon + '</div><div class="n">' + x.name + '<small>' + fmt(p) + ' €/t · ' + trend + '</small></div>' +
        '<div style="min-width:80px;text-align:right"><b>' + tonnen(lager) + '</b></div>' +
        (lager > 0 ? '<button class="f-kauf" data-a="verkauf" data-id="' + id + ':all">Alles · ' + fmt(lager / 1000 * p) + ' €</button><button class="f-kauf sek" data-a="verkauf" data-id="' + id + ':half">Hälfte</button>' : '<span style="min-width:190px"></span>') +
        (D.frucht(id) && !gesperrt ? '<button class="f-kauf sek" data-a="zukauf" data-id="' + id + ':1000"' + (rest1 < 1000 || S.geld < M.zukaufPreisProT(id) || kap - menge < 1000 ? ' disabled' : '') + '>🛒 +1 t · ' + fmt(Math.round(M.zukaufPreisProT(id))) + ' €</button>' : '') + '</div>';
    }).join('');
    dialogAuf(kopf('Lager & Markt', '<span class="f-pill">' + tonnen(menge) + ' / ' + tonnen(kap) + '</span>' + geldPille()) +
      '<div class="f-inhalt"><div class="f-bal ' + (voll > 0.9 ? 'rot' : voll > 0.7 ? 'gelb' : '') + '"><div style="width:' + Math.round(voll * 100) + '%"></div></div>' +
      '<div class="f-info" style="margin-top:10px">Die Ernte kommt ins Silo. Die Preise schwanken: Wenn „▲ gut“ steht, lohnt sich das Verkaufen. Mit Betrieben (🏭) wird aus Rohstoffen mehr Geld – und Aufträge (📋) zahlen extra.<br><b>Zur Not zukaufen:</b> Feldfrüchte kannst du mit 🛒 zum fast doppelten Preis nachkaufen (höchstens ' + (D.ZUKAUF_MAX_TAG_KG / 1000) + ' t am Tag, heute noch ' + tonnen(rest1) + ').</div>' + zeilen + '</div>');
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
        (d.futterKgH ? '<small style="margin-top:6px">Futter (' + d.futter.map(g => D.gut(g).name).join('/') + '): ' + Math.round(st.futter) + ' kg · reicht ' + stundenText(ss.futterStunden) + ' · Silo: ' + tonnen(ss.futterSilo) + '</small><div class="f-bal ' + (futterProz < 20 ? 'rot' : futterProz < 50 ? 'gelb' : '') + '"><div style="width:' + futterProz + '%"></div></div>' + (!ss.futterSilo && futterProz < 98 ? '<div class="f-info warn" style="margin-top:8px">⚠ Im Silo ist kein Futter. ' + d.name + ' fressen ' + d.futter.map(g => D.gut(g).name).join(' oder ') + ' – ernte welches (im Lager siehst du, was im Silo liegt) oder kaufe Futter.</div>' : '') : '') +
        '<small style="margin-top:6px">' + D.gut(d.gut).icon + ' Bereit: <b>' + (st.lager >= 1000 ? fmt1(st.lager / 1000) + ' t' : Math.round(st.lager) + ' kg') + '</b> (von ' + (ss.lagerKap >= 1000 ? fmt1(ss.lagerKap / 1000) + ' t' : Math.round(ss.lagerKap) + ' kg') + ')</small><div class="f-bal ' + (lagerProz > 90 ? 'rot' : lagerProz > 60 ? 'gelb' : '') + '"><div style="width:' + lagerProz + '%"></div></div>' +
        '<div class="f-btnreihe">' +
        '<button class="f-kauf gruen" data-a="einsammeln" data-id="' + d.id + '"' + (st.lager < 1 ? ' disabled' : '') + '>✋ Einsammeln</button>' +
        (d.futterKgH ? '<button class="f-kauf sek" data-a="fuettern" data-id="' + d.id + '"' + (futterProz >= 98 ? ' disabled' : '') + '>🥣 Aus dem Silo füttern</button>' : '') +
        (d.futterKgH && futterProz < 98 && !ss.futterSilo ? '<button class="f-kauf" data-a="futterKauf" data-id="' + d.id + '"' + (S.geld < M.futterPreisProT(d) / 1000 ? ' disabled' : '') + '>🛒 Futter kaufen · ' + fmt(Math.round(M.futterPreisProT(d))) + ' €/t</button>' : '') +
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
  // Dialog: Sammlung (Erfolge + Album)
  // ----------------------------------------------------------------------------------------------
  function dialogSammlung(tab, seite) {
    const gleich = dlg && dlg.typ === 'sammlung';
    dlg = { typ: 'sammlung', tab: tab || (gleich ? dlg.tab : 'heute'), seite: seite || (gleich ? dlg.seite : 'traktoren') };
    zeichneSammlung();
  }
  function wertText(wert, einheit) {
    const t = wert >= 100 ? fmt(wert) : fmt1(wert);
    return t + (einheit ? ' ' + einheit : '');
  }
  function zeichneSammlung() {
    const S = stand();
    const now = jetzt();
    const tagClaim = S.tag ? S.tag.aufgaben.filter(q => q.fertig && !q.abgeholt).length + (S.tag.alle && !S.tag.bonusAbgeholt ? 1 : 0) : 0;
    const erfClaim = D.ERFOLGE.filter(e => { const r = S.erfolge[e.id]; return r && r.erreicht > r.abgeholt; }).length;
    const albClaim = D.ALBUM.filter(a => !S.albumBonus[a.id] && M.albumSeite(a.id).fertig).length;
    const tabs = [['heute', '📅 Heute' + (tagClaim ? ' 🎁' : '')], ['erfolge', '🏆 Erfolge' + (erfClaim ? ' 🎁' : '')], ['album', '📖 Album' + (albClaim ? ' 🎁' : '')]];
    let inhalt = '';
    if (dlg.tab === 'heute') {
      const t = S.tag, serie = M.serieAktuell(now);
      const fertigN = t.aufgaben.filter(q => q.fertig).length;
      inhalt = '<div class="f-chips"><span class="f-chip">⏰ Neue Aufgaben in <b>' + A.zeitText(M.naechsterTag(now) - now) + '</b></span><span class="f-chip">🔥 Serie: <b>' + serie + ' Tag' + (serie === 1 ? '' : 'e') + '</b></span><span class="f-chip">✅ <b>' + fertigN + ' von ' + t.aufgaben.length + '</b> geschafft</span></div>';
      t.aufgaben.forEach((q, i) => {
        const a = M.tagArt(q.art), w = Math.min(M.tagWert(q), q.ziel);
        const proz = Math.round(w / q.ziel * 100);
        inhalt += '<div class="f-zeile"><div class="ico">' + a.icon + '</div><div class="n">' + a.text.replace('{ziel}', fmt(q.ziel)) +
          '<small>' + (q.fertig ? '✓ Geschafft!' : wertText(w, '') + ' / ' + wertText(q.ziel, a.einheit)) + ' · Belohnung: <b style="color:#ffe27a">' + fmt(q.geld) + ' €</b> + ' + q.xp + ' XP</small>' +
          '<div class="f-bal"><div style="width:' + proz + '%"></div></div></div>' +
          (q.abgeholt ? '<span class="f-badge">abgeholt ✓</span>' : q.fertig ? '<button class="f-kauf gruen" data-a="tagAbholen" data-id="' + i + '">Abholen<br>+' + fmt(q.geld) + ' €</button>' : '') + '</div>';
      });
      const b = M.tagBonus(now);
      inhalt += '<div class="f-h3">Tagesbonus</div><div class="f-zeile"><div class="ico">🎁</div><div class="n">Alle drei geschafft!<small>Bonus <b style="color:#ffe27a">' + fmt(b.geld) + ' €</b> + ' + b.xp + ' XP · jeder weitere Tag in Folge gibt +5 % (bis +50 %). Wer einen Tag auslässt, fängt die Serie neu an – kein Drama!</small></div>' +
        (t.bonusAbgeholt ? '<span class="f-badge">abgeholt ✓</span>' : '<button class="f-kauf ' + (t.alle ? 'gruen' : '') + '" data-a="tagBonus"' + (t.alle ? '' : ' disabled') + '>' + (t.alle ? 'Abholen' : 'noch nicht') + '</button>') + '</div>';
      const plan = (typeof FarmLernen !== 'undefined' && FarmLernen.tagesplan) ? FarmLernen.tagesplan() : [];
      if (plan.length) {
        const belohnt = M.schulHeute(now), anteile = M.schulAnteileHeute(now), okN = plan.filter(x => x.fertig).length;
        const summe = Object.keys(belohnt).reduce((a, k) => a + belohnt[k], 0);
        inhalt += '<div class="f-h3">📚 Schulaufgaben von heute</div><div class="f-info">Jede geschaffte Schulaufgabe verkürzt auf dem Hof alle laufenden Arbeiten, wachsenden Felder und Betriebe. Je mehr du <b>beim ersten Versuch richtig</b> hast, desto mehr – <b>bei allem richtig wird alles sofort fertig!</b> Jede Aufgabe zählt einmal am Tag. ' +
          (okN ? 'Heute schon <b>' + summe + ' Minuten</b> gespart.' : 'Mach eine Aufgabe in der Lern-App und komm zurück!') + '</div>';
        plan.forEach(x => {
          const gespart = belohnt[x.id];
          inhalt += '<div class="f-zeile"><div class="ico">' + (x.fertig ? '✅' : '📝') + '</div><div class="n">' + x.titel + '<small>' + (x.fertig ? (gespart ? '⏩ ' + (anteile[x.id] >= 0.999 ? 'alles sofort fertig' : 'mind. ' + gespart + ' Min + ' + Math.round((anteile[x.id] || 0) * 100) + ' % der Restzeit') + ' · ' + x.richtig + ' von ' + x.n + ' richtig' : 'Zeit wird gutgeschrieben …') : x.n + ' / ' + x.z + ' erledigt') + '</small></div></div>';
        });
      }
    } else if (dlg.tab === 'erfolge') {
      let abh = 0, geldAbh = 0;
      D.ERFOLGE.forEach(e => { const r = S.erfolge[e.id]; if (r && r.erreicht > r.abgeholt) { abh++; for (let i = r.abgeholt; i < r.erreicht; i++) geldAbh += e.stufen[i].geld; } });
      let gesamt = 0, erreicht = 0;
      D.ERFOLGE.forEach(e => { gesamt += e.stufen.length; erreicht += (S.erfolge[e.id] || { erreicht: 0 }).erreicht; });
      inhalt = '<div class="f-info">🏆 <b>' + erreicht + ' von ' + gesamt + '</b> Stufen geschafft' + (abh ? ' · ' + abh + ' Belohnung' + (abh > 1 ? 'en' : '') + ' zum Abholen' : '') + '</div>';
      if (abh) inhalt += '<div class="f-btnreihe"><button class="f-kauf gruen" data-a="erfAlle">🎁 Alle abholen · +' + fmt(geldAbh) + ' €</button></div>';
      let kat = '';
      D.ERFOLGE.forEach(e => {
        if (e.kat !== kat) { kat = e.kat; inhalt += '<div class="f-h3">' + kat + '</div>'; }
        const r = S.erfolge[e.id] || { erreicht: 0, abgeholt: 0 };
        const w = M.erfolgWert(e.wert);
        const next = e.stufen[r.erreicht];
        const letzte = r.erreicht ? e.stufen[r.erreicht - 1].ziel : 0;
        const proz = next ? Math.max(0, Math.min(100, Math.round((w - letzte) / (next.ziel - letzte) * 100))) : 100;
        const pips = e.stufen.map((x, i) => i < r.erreicht ? '★' : '<span style="opacity:.25">★</span>').join('');
        const claim = r.erreicht > r.abgeholt;
        let belohn = 0; for (let i = r.abgeholt; i < r.erreicht; i++) belohn += e.stufen[i].geld;
        inhalt += '<div class="f-zeile"><div class="ico">' + e.icon + '</div><div class="n">' + e.name + '<span class="f-pips">' + pips + '</span>' +
          '<small>' + e.text + ' · ' + (next ? wertText(Math.min(w, next.ziel), '') + ' / ' + wertText(next.ziel, e.einheit) : '<b>Alles geschafft!</b> ' + wertText(w, e.einheit)) + '</small>' +
          '<div class="f-bal ' + (next ? '' : '') + '"><div style="width:' + proz + '%"></div></div>' +
          (next ? '<small>Nächste Stufe: +' + fmt(next.geld) + ' €</small>' : '') + '</div>' +
          (claim ? '<button class="f-kauf gruen" data-a="erfAbholen" data-id="' + e.id + '">Abholen<br>+' + fmt(belohn) + ' €</button>' : '') + '</div>';
      });
    } else {
      const seiten = D.ALBUM.map(a => ({ a, st: M.albumSeite(a.id) }));
      const gesamtK = seiten.reduce((x, y) => x + y.st.karten.length, 0), gesamtG = seiten.reduce((x, y) => x + y.st.gesammelt, 0);
      inhalt = '<div class="f-info">📖 Du hast <b>' + gesamtG + ' von ' + gesamtK + '</b> Karten gesammelt. Vervollständige eine Seite für einen Bonus!</div>' +
        '<div class="f-tabs" style="padding:0 0 8px">' + seiten.map(x => '<button class="f-tab' + (x.a.id === dlg.seite ? ' an' : '') + '" data-a="albumSeite" data-id="' + x.a.id + '">' + x.a.icon + ' ' + x.a.name + ' ' + x.st.gesammelt + '/' + x.st.karten.length + (x.st.fertig && !x.st.bonusAbgeholt ? ' 🎁' : '') + '</button>').join('') + '</div>';
      const cur = seiten.find(x => x.a.id === dlg.seite) || seiten[0];
      const a = cur.a, st = cur.st;
      inhalt += '<div class="f-zeile"><div class="n">' + a.icon + ' ' + a.name + '<small>' + st.gesammelt + ' von ' + st.karten.length + ' Karten</small><div class="f-bal"><div style="width:' + Math.round(st.gesammelt / st.karten.length * 100) + '%"></div></div></div>' +
        (st.fertig ? (st.bonusAbgeholt ? '<span class="f-badge">Bonus abgeholt ✓</span>' : '<button class="f-kauf gruen" data-a="albumBonus" data-id="' + a.id + '">🎁 Bonus · +' + fmt(a.bonus.geld) + ' €</button>') : '<span class="f-chip">Seitenbonus: <b>' + fmt(a.bonus.geld) + ' €</b></span>') + '</div>';
      inhalt += '<div class="f-album" style="margin-top:10px">';
      st.karten.forEach(k => {
        let bild, text;
        if (a.kat === 'maschinen') {
          const d = D.def(k.def);
          bild = k.frei ? '<img src="' + vorschauBild(d) + '">' : '<div class="gr">❔</div>';
          text = k.frei ? D.MARKEN[d.marke].name + '<br>' + (d.ps ? d.ps + ' PS · bis ' + d.kmh + ' km/h' : d.art === 'ernter' ? 'Schneidwerk ' + meter(d.w) + ' · Tank ' + tonnen(d.tank) : meter(d.w) + ' breit · ab ' + d.ps + ' PS') : a.hinweis;
        } else {
          bild = '<div class="gr">' + (k.frei ? k.icon : '❔') + '</div>';
          text = k.frei ? k.fakt : a.hinweis;
        }
        inhalt += '<div class="f-card ' + (k.frei ? 'frei' : 'zu') + '">' + bild + '<b>' + (k.frei ? k.name : '???') + '</b><div class="s">' + text + '</div></div>';
      });
      inhalt += '</div>';
    }
    dialogAuf(kopf('Erfolge & Album', geldPille()) + '<div class="f-tabs">' + tabs.map(t => '<button class="f-tab' + (t[0] === dlg.tab ? ' an' : '') + '" data-a="sammlungTab" data-id="' + t[0] + '">' + t[1] + '</button>').join('') + '</div><div class="f-inhalt">' + inhalt + '</div>');
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
      (fern ? '' : '<button class="f-kauf sek" data-a="neu">🗑 Neu anfangen</button>') +
      '<button class="f-kauf sek" data-a="beenden">⬅ Hof verlassen</button></div>' +
      '<div class="f-info" style="margin-top:14px">Level ' + S.level + ' · ' + fmt(S.statistik.geerntet / 1000) + ' t geerntet · ' + fmt(S.statistik.verkauft) + ' € verkauft · ' + S.statistik.jobs + ' Arbeitsaufträge</div>' +
      (fern && fern.log.length ? '<div class="f-h3">Was zuletzt passiert ist</div><div class="f-info f-chronik">' + fern.log.slice().reverse().map(e => '<b>' + MITSPIELER[e.von] + '</b> ' + e.text).join('<br>') + '</div>' : '') +
      (tempoKlicks >= 5 && (!fern || fern.von === 'papa') ? '<div class="f-h3">Für Papa: Zeitraffer</div><div class="f-btnreihe">' + [1, 5, 20, 100].map(x => '<button class="f-kauf ' + (S.tempo === x ? 'gruen' : 'sek') + '" data-a="tempo" data-id="' + x + '">×' + x + '</button>').join('') + '</div><div class="f-info">Gilt für neu gestartete Arbeiten und Wachstum.</div>' : '') +
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
      '<li>Im <b>Händler</b> (🏪) kaufst du größere, schnellere Maschinen – und später <b>Fahrer</b>, die auf einem Feld die Routine (Kalken, Grubbern, Walzen) übernehmen – gegen Tageslohn.</li>' +
      '<li>Im <b>Tierhof</b> (🐔) leben Hühner, Bienen, Kühe und Schafe: Füttern, Eier/Milch/Wolle/Honig <b>einsammeln</b> – und in Käserei und Bäckerei veredeln.</li>' +
      '<li>Das <b>Wetter</b> ändert sich ständig: Regen lässt Pflanzen schneller wachsen, Hitze bremst sie. Mit der Wetterstation siehst du es voraus.</li>' +
      '<li>Jeden Tag gibt es <b>3 Tagesaufgaben</b> (📅): Schaffe alle für einen Bonus – und halte die Serie am Leben! Neue Aufgaben kommen um Mitternacht.</li>' +
      '<li>Auf einem Feld mit wachsender Saat gibt es die <b>Lernrunde</b> (📚): 5 Karten aus deinen schwächsten Bereichen – jede gewusste Karte lässt die Saat schneller reifen.</li>' +
      '<li>Unter 🏆 findest du <b>Erfolge</b> mit Belohnungen und dein <b>Album</b>: Sammle Karten von Maschinen, Früchten, Tieren, Waren, Betrieben und Wetter – mit Wissenswertem dazu.</li>' +
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
    konfetti();
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
      case 'sammlung': return dialogSammlung();
      case 'tagTab': return dialogSammlung('heute');
      case 'tagAbholen': { const r = M.tagAbholen(+id); if (ergebnis(r, r.ok ? '+' + fmt(r.geld) + ' € Tagesaufgabe!' : '', 'geld')) { zeichneSammlung(); speichern(); } return; }
      case 'tagBonus': { const r = M.tagBonusAbholen(jetzt()); if (ergebnis(r, r.ok ? '🎁 Tagesbonus: +' + fmt(r.geld) + ' €' + (r.serie > 1 ? ' (Serie ' + r.serie + ' Tage 🔥)' : '') : '', 'geld')) { zeichneSammlung(); speichern(); } return; }
      case 'sammlungTab': dlg.tab = id; return zeichneSammlung();
      case 'albumSeite': dlg.seite = id; return zeichneSammlung();
      case 'erfAbholen': { const r = M.erfolgAbholen(id); if (ergebnis(r, r.ok ? '+' + fmt(r.geld) + ' € abgeholt!' : '', 'geld')) { zeichneSammlung(); speichern(); } return; }
      case 'erfAlle': { let sum = 0; D.ERFOLGE.forEach(e => { const r = M.erfolgAbholen(e.id); if (r.ok) sum += r.geld; }); if (sum) { ergebnis({ ok: true }, '+' + fmt(sum) + ' € abgeholt!', 'geld'); zeichneSammlung(); speichern(); } return; }
      case 'albumBonus': { const r = M.albumBonusAbholen(id); if (ergebnis(r, r.ok ? 'Seitenbonus: +' + fmt(r.geld) + ' €!' : '', 'geld')) { zeichneSammlung(); speichern(); } return; }
      case 'wetter': return dialogWetter();
      case 'fuhrpark': return dialogFuhrpark();
      case 'shop': return dialogShop(id || 'traktor');
      case 'menue': return dialogMenue();
      case 'hilfe': return dialogHilfe();
      case 'hinweisZeigen': { const h = hinweisBerechnen(); if (h && h.feld) { const m = feldMitte(h.feld); fliegeZu(m.x, m.y, 0.85); } else if (h && h.tier) { const d = D.tier(h.tier); fliegeZu(d.haus.x + d.haus.w / 2, d.haus.y + 90, 0.8); } return; }
      case 'tempoKlick': tempoKlicks++; if (tempoKlicks === 5) dialogMenue(); return;
      case 'tempo': M.tempoSetzen(+id); toast('Zeitraffer ×' + id, 'gut', 'tempo'); return dialogMenue();
      case 'ton': S.ton = !S.ton; if (S.ton) tonStart(); return dialogMenue();
      case 'neu': bestaetigen('Wirklich alles löschen und neu anfangen?', () => { M.neu(jetzt()); M.simuliere(jetzt()); speichern(); dialogZu(); toast('Neuer Hof!', 'gut', 'neu'); }, 'Alles löschen'); return;
      case 'lernStart': {
        if (typeof FarmLernen === 'undefined' || !FarmLernen.verfuegbar()) { toast('Die Lernkarten gibt es nur am Tablet.', 'warn', 'lern'); return; }
        const karten = FarmLernen.waehle(D.LERN_KARTEN);
        if (!karten.length) { toast('Gerade sind keine Lernkarten da.', 'warn', 'lern'); return; }
        dlg.lern = { karten, i: 0, auf: false, richtig: 0, gewusst: [], ergebnis: null }; return zeichneFeldDialog();
      }
      case 'lernUm': dlg.lern.auf = true; return zeichneFeldDialog();
      case 'lernWeiss': case 'lernNicht': {
        const L = dlg.lern, ok = a === 'lernWeiss';
        FarmLernen.melde(L.karten[L.i], ok);
        L.gewusst[L.i] = ok; if (ok) L.richtig++;
        L.i++; L.auf = false;
        if (L.i >= L.karten.length) { L.ergebnis = M.lernBeschleunigen(dlg.id, L.richtig, jetzt()); if (L.ergebnis && L.ergebnis.ok) { piep(L.richtig ? 'level' : 'fehler'); speichern(); } }
        return zeichneFeldDialog();
      }
      case 'lernAbbruch': dlg.lern = null; return zeichneFeldDialog();
      case 'lernEnde': dlg.lern = null; return zeichneFeldDialog();
      case 'confJa': { const fn = bestaetigenFn; bestaetigenFn = null; confZu(); if (fn) fn(); return; }
      case 'confNein': bestaetigenFn = null; confZu(); return;
      case 'fernNochmal': return fernStartVersuch();
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
      case 'jobAbbruch': bestaetigen('Arbeit wirklich abbrechen? Die Kosten sind weg.', () => { M.arbeitAbbrechen(+id); dlg.sub = null; zeichneFeldDialog(); }, 'Abbrechen'); return;
      case 'autoAn': if (ergebnis(M.autoSetzen(dlg.id, id), 'Der Fahrer kümmert sich um die Routine auf dem Feld.')) zeichneFeldDialog(); return;
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
      case 'zukauf': { const p = id.split(':'); const r = M.zukaufen(p[0], +p[1], jetzt()); if (ergebnis(r, r.ok ? tonnen(r.kg) + ' ' + D.gut(p[0]).name + ' gekauft (−' + fmt(r.kosten) + ' €)' : '', 'geld')) { zeichneLager(); speichern(); } return; }
      case 'futterKauf': { const r = M.futterKaufen(id); if (ergebnis(r, r.ok ? tonnen(r.kg) + ' Futter gekauft (−' + fmt(r.kosten) + ' €)' : '', 'geld')) { zeichneTiere(); speichern(); } return; }
      case 'fuettern': { const r = M.fuettern(id); if (ergebnis(r, r.ok ? tonnen(r.kg) + ' Futter eingefüllt' : '', 'gut')) { zeichneTiere(); speichern(); } return; }
      case 'einsammeln': { const r = M.einsammeln(id); if (ergebnis(r, r.ok ? tonnen(r.kg) + ' ' + D.gut(r.gut).name + ' im Lager' + (r.ueber > 1 ? ' (Silo voll: Rest verkauft)' : '') : '', 'geld')) { zeichneTiere(); speichern(); } return; }
      case 'reparieren': if (ergebnis(M.maschineReparieren(+id), 'Repariert!')) zeichneFuhrpark(); return;
      case 'mverkauf': bestaetigen('Maschine wirklich verkaufen?', () => { if (ergebnis(M.maschineVerkaufen(+id), 'Verkauft.', 'geld')) zeichneFuhrpark(); }, 'Verkaufen'); return;
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
    for (const id of felder) { const f = S.felder[id]; if (!M.jobAufFeld(id) && f.phase === 'reif') return { t: D.feld(id).name + ' ist erntereif – tippe darauf zum Ernten!', feld: id }; }
    for (const id of felder) {
      const f = S.felder[id];
      if (M.jobAufFeld(id)) continue;
      if (f.phase === 'stoppel' && !f.auto) return { t: S.statistik.jobs === 0 ? 'Tippe auf dein Feld und starte das Grubbern.' : D.feld(id).name + ' wartet auf Bearbeitung – tippe darauf.', feld: id };
      if (f.phase === 'bearbeitet' || f.phase === 'gepfluegt') return { t: D.feld(id).name + ' ist bereit zum Säen – tippe darauf.', feld: id };
    }
    for (const d of D.TIERE) {
      const st = S.tiere[d.id];
      if (!st || !st.anzahl) continue;
      const ss = M.stallStand(d.id, now);
      if (d.futterKgH && !ss.laeuft) return { t: d.icon + ' ' + d.name + ' haben kein Futter mehr – ' + (ss.futterSilo ? 'füttere sie im 🐔 Tierhof.' : 'im Silo fehlt ' + d.futter.map(g => D.gut(g).name).join(' oder ') + ': ernte welches oder kaufe Futter im 🐔 Tierhof.'), feld: null, tier: d.id };
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
  function ereignisBehandeln(art, d) {
    if (!wurzel) return;
    if (typeof FarmMeldung !== 'undefined' && FarmMeldung.ereignis(art, d, stand().ton)) return;
    if (art === 'jobFertig') { toast(D.feld(d.job.feld).name + ': ' + D.SCHRITTE[d.job.schritt].name + ' fertig', 'gut', 'jf' + d.job.id); piep('fertig'); }
    else if (art === 'reif') { toast(D.feld(d.feld).name + ' ist erntereif! 🌾', 'gut', 'reif' + d.feld); piep('fertig'); }
    else if (art === 'ernte') toast(D.feld(d.feld).name + ': ' + tonnen(d.kg) + ' ' + D.gut(d.gut).name + ' geerntet' + (d.ueber > 1 ? ' (Silo voll: ' + tonnen(d.ueber) + ' verkauft)' : ''), 'geld', 'ernte' + d.feld);
    else if (art === 'level') { piep('level'); if (dlg && dlg.typ !== 'level') levelWarte.push({ level: d.level, bonus: d.bonus }); else dialogLevel(d.level, d.bonus); }
    else if (art === 'prodFertig') { toast(D.betrieb(d.betrieb).name + ': ' + tonnen(d.kg) + ' ' + D.gut(d.gut).name + ' fertig', 'gut', 'pf' + d.betrieb); piep('fertig'); }
    else if (art === 'auftragNeu') toast('Neuer Auftrag: ' + tonnen(d.auftrag.kg) + ' ' + D.gut(d.auftrag.gut).name, '', 'an');
    else if (art === 'anfangEnde') toast('Anfangsbonus vorbei – ab jetzt dauern Arbeiten so lange wie auf einem echten Hof!', '', 'ae');
    else if (art === 'wetter') { const x = D.WETTER[d.typ]; toast(x.icon + ' ' + x.name + ' – ' + x.text, '', 'wetter'); }
    else if (art === 'stallVoll') toast(D.tier(d.id).icon + ' ' + D.tier(d.id).stall + ' ist voll – einsammeln!', 'geld', 'sv' + d.id);
    else if (art === 'erfolg') {
      const n = d.neu;
      if (n.length === 1) toast('🏆 Erfolg: ' + n[0].name + ' (Stufe ' + n[0].stufe + ' von ' + n[0].von + ') – Belohnung unter 🏆 abholen!', 'geld', 'erfolg');
      else toast('🏆 ' + n.length + ' neue Erfolge – Belohnungen unter 🏆 abholen!', 'geld', 'erfolg');
      piep('level');
    }
    else if (art === 'tagNeu') toast('📅 Neue Tagesaufgaben warten auf dich!', '', 'tagneu');
    else if (art === 'tagFertig') { toast('📅 Tagesaufgabe geschafft – unter 📅 abholen!', 'geld', 'tagf'); piep('fertig'); }
    else if (art === 'tagAlle') { toast('🎉 Alle Tagesaufgaben geschafft – hol dir den Tagesbonus!' + (d.serie > 1 ? ' Serie: ' + d.serie + ' Tage 🔥' : ''), 'geld', 'taga'); piep('level'); }
    else if (art === 'karte') {
      const seite = D.ALBUM.find(a => a.kat === d.kat);
      const k = seite && seite.karten().find(x => x.id === d.id);
      if (k) { toast('📖 Neue Albumkarte: ' + k.name, 'gut', 'karte' + d.kat); piep('fertig'); }
    }
    else if (art === 'lohn') toast('👨‍🌾 Lohn ' + (d.nachgezahlt ? 'nachgezahlt' : 'für ' + d.fahrer + ' Fahrer') + ': −' + fmt(d.betrag) + ' €', 'geld', 'lohn');
    else if (art === 'lohnFehlt') toast('👨‍🌾 Kein Geld für den Lohn (' + fmt(d.betrag) + ' €) – die Fahrer streiken, bis er bezahlt ist!', 'warn', 'lohnfehlt');
    else if (art === 'umgebrochen') toast(D.feld(d.feld).name + ': Der Pflug hat die Pflanzen umgebrochen.', 'warn', 'ub');
  }

  // ----------------------------------------------------------------------------------------------
  // Hauptschleife
  // ----------------------------------------------------------------------------------------------
  function hudAktualisieren(dt) {
    const S = stand();
    if (geldLetzt != null && S.geld - geldLetzt >= 100) geldEffekt(S.geld - geldLetzt);
    geldLetzt = S.geld;
    geldAnzeige += (S.geld - geldAnzeige) * Math.min(1, dt * 8);
    if (Math.abs(S.geld - geldAnzeige) < 1) geldAnzeige = S.geld;
    R.geld.textContent = fmt(geldAnzeige) + ' €';
    timer.hud -= dt;
    if (timer.hud > 0) return;
    timer.hud = 0.3;
    R.lvl.textContent = 'Level ' + S.level;
    const wt = M.wetter(jetzt());
    R.wetter.textContent = wt.icon + ' ' + wt.name;
    M.wetterGesehen(wt.id);
    if (fern) {
      R.offline.style.display = fern.ok ? 'none' : 'block';
      const anderer = fern.von === 'papa' ? 'max' : 'papa';
      const da = fern.ok && fern.online[anderer];
      R.mit.style.display = da ? '' : 'none';
      if (da) R.mit.textContent = (anderer === 'papa' ? '👨 Papa' : '👦 Max') + ' spielt mit';
    }
    const tg = stand().tag;
    if (typeof FarmLernen !== 'undefined' && FarmLernen.tagesplan && R.schule) {
      const pl = FarmLernen.tagesplan();
      if (pl.length) { const ok = pl.filter(x => x.fertig).length; R.schule.style.display = ''; R.schule.textContent = '📚 Schule ' + ok + '/' + pl.length; R.schule.style.color = ok === pl.length ? '#9ff0a8' : ''; }
    }
    if (tg) { const fn = tg.aufgaben.filter(q => q.fertig).length, cl = tg.aufgaben.some(q => q.fertig && !q.abgeholt) || (tg.alle && !tg.bonusAbgeholt); R.tag.textContent = '📅 ' + fn + '/' + tg.aufgaben.length + (cl ? ' 🎁' : ''); R.tag.style.color = cl ? '#ffe27a' : ''; }
    const abh = M.abholbar();
    R.pktErf.style.display = abh ? 'flex' : 'none'; R.pktErf.textContent = abh;
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
    frameMs += (Math.min(dt, 0.1) * 1000 - frameMs) * 0.06; frameAb += dt;
    if (frameAb > 3 && frameMs > 27 && dprStufe < DPR_STUFEN.length - 1 && !document.hidden) { dprStufe++; frameAb = 0; groesse(); }
    dt = Math.min(dt, 0.1);
    tSpiel += dt;
    const now = jetzt();
    timer.sim += dt;
    if (timer.sim >= 0.25) { if (!fern) M.simuliere(now); timer.sim = 0; }
    timer.speicher += dt;
    if (timer.speicher >= 10) { speichern(); timer.speicher = 0; }
    if (fern) {
      timer.poll = (timer.poll || 0) + dt;
      const mitspieler = fern.online[fern.von === 'papa' ? 'max' : 'papa'];
      if (timer.poll >= (mitspieler ? 1.5 : 4)) { timer.poll = 0; fernPoll(); }
    }
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
    A.zeichneTageszeit(g, W, H, now);
    A.zeichneWetter(g, W, H, tSpiel, M.wetterTyp(now));
    A.zeichneBeschriftungen(g, cam, W, H, now, tSpiel);
    hudAktualisieren(dt);
    timer.dlg += dt;
    if (dlg && timer.dlg >= 1 && !dlgAnfasst && Date.now() - dlgAnfassEnde > 500) { timer.dlg = 0; dialogAktualisieren(true); }
  }
  // Offenen Dialog neu zeichnen (live=true: nur die Dialoge mit laufenden Werten)
  function dialogAktualisieren(live) {
    if (!dlg || !stand()) return;
    const t = dlg.typ;
    if (t === 'feld') zeichneFeldDialog();
    else if (t === 'auftraege') zeichneAuftraege();
    else if (t === 'betriebe') zeichneBetriebe();
    else if (t === 'felder') zeichneFelder();
    else if (t === 'tiere') zeichneTiere();
    else if (t === 'wetter') zeichneWetter();
    else if (!live) {
      if (t === 'shop') zeichneShop();
      else if (t === 'lager') zeichneLager();
      else if (t === 'fuhrpark') zeichneFuhrpark();
      else if (t === 'sammlung') zeichneSammlung();
    }
  }

  // ----------------------------------------------------------------------------------------------
  // Speichern / Start / Ende
  // ----------------------------------------------------------------------------------------------
  function speichern() {
    if (fern) {
      // Gemeinsamer Hof: der Server speichert. Max' Tablet haelt zusaetzlich eine Kopie - geht der Server-Stand je verloren, wird sie wieder hochgeladen.
      if (fern.von === 'max' && fern.ok && stand() && Date.now() - (fern.sicherung || 0) > 30000) {
        fern.sicherung = Date.now();
        try { localStorage.setItem(M.SPEICHER, M.speichern()); } catch (e) { /* Speicher voll/gesperrt */ }
      }
      return;
    }
    try { localStorage.setItem(M.SPEICHER, M.speichern()); } catch (e) { /* Speicher voll/gesperrt */ }
  }
  let hoererGesetzt = false;
  function oeffnen(beimSchliessen) {
    if (wurzel) return;
    ausgang = beimSchliessen || null;
    if (typeof FarmMeldung !== 'undefined') FarmMeldung.hofOffen(true);
    baueOberflaeche();
    if (!hoererGesetzt) { M.beiEreignis((a, d) => { if (!fern) ereignisBehandeln(a, d); }); hoererGesetzt = true; }
    if (fernKonfig) {
      fern = { basis: fernKonfig.basis || '', von: fernKonfig.von === 'papa' ? 'papa' : 'max', rev: -1, ev: -1, ok: false, offset: 0, inFlight: false, online: {}, logLetzte: -1, log: [], fehler: 0, orig: {} };
      fernStartVersuch();
      return;
    }
    lokalStarten();
  }
  function lokalStarten() {
    let roh = null;
    try { roh = localStorage.getItem(M.SPEICHER); } catch (e) { roh = null; }
    const erstes = !roh;
    const jetztMs = jetzt();
    if (!roh || !M.laden(roh, jetztMs)) { M.neu(jetztMs); M.simuliere(jetztMs); }
    spielStarten(erstes);
  }
  function spielStarten(erstes) {
    geldAnzeige = stand().geld; geldLetzt = null;
    cam.x = 1720; cam.y = 1500; cam.z = Math.min(1, Math.max(0.45, Math.min(W / 1500, H / 1000))); cam.ziel = null;
    tempoKlicks = 0; dlg = null;
    timer = { sim: 0, speicher: 0, hud: 0, dlg: 0, poll: 0 };
    laeuft = true; tLast = 0; tSpiel = 0;
    raf = requestAnimationFrame(frame);
    tonStart();
    if (erstes) dialogHilfe();
  }
  function schliessen() {
    laeuft = false; cancelAnimationFrame(raf);
    speichern();
    if (typeof FarmMeldung !== 'undefined') FarmMeldung.hofOffen(false);
    if (fern) fernAushaengen();
    if (ton) { try { ton.ac.close(); } catch (e) { /* egal */ } ton = null; }
    abbauen();
    fern = null;
    if (ausgang) ausgang();
    else if (typeof App !== 'undefined' && App.renderSpieleMenu) App.renderSpieleMenu();
  }

  // ----------------------------------------------------------------------------------------------
  // Gemeinsamer Hof (Fern-Modus)
  // ----------------------------------------------------------------------------------------------
  // Befehle, die zum Server gehen: Name -> Anzahl Argumente (Zeit-Argument wird nicht mitgeschickt)
  const FERN_BEFEHLE = {
    feldKaufen: 1, maschineKaufen: 1, maschineVerkaufen: 1, maschineReparieren: 1, lagerAusbauen: 0, fahrerKaufen: 0, autoSetzen: 2, futterKaufen: 1, zukaufen: 2,
    arbeitStarten: 3, arbeitAbbrechen: 1, produktionBauen: 1, produktionAusbauen: 1, produktionStarten: 3, auftragLiefern: 1, verkaufen: 2,
    stallBauen: 1, tierKaufen: 2, stallAusbauen: 1, automatKaufen: 1, fuettern: 1, einsammeln: 1, wetterstationKaufen: 0, beregnungKaufen: 1,
    erfolgAbholen: 1, albumBonusAbholen: 1, tagAbholen: 1, tagBonusAbholen: 0, wetterGesehen: 1, tempoSetzen: 1, lernBeschleunigen: 2
  };
  async function fernAnfrage(pfad, methode, body) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => { if (ctl) ctl.abort(); }, 9000);
    try {
      const r = await fetch(fern.basis + pfad, { method: methode, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal: ctl ? ctl.signal : undefined });
      if (r.status === 404) return { _status: 404 };
      const j = await r.json();
      j._status = r.status;
      return j;
    } finally { clearTimeout(t); }
  }
  function ladeAnzeige(titel, text, knopf) {
    const alt = wurzel && wurzel.querySelector('#f-lade'); if (alt) alt.parentNode.removeChild(alt);
    if (!wurzel) return;
    const d = document.createElement('div');
    d.className = 'f-lade'; d.id = 'f-lade';
    d.innerHTML = '<h2>' + titel + '</h2><p>' + text + '</p>' + (knopf ? '<button class="f-kauf gruen" data-a="fernNochmal" style="min-width:200px">' + knopf + '</button><button class="f-kauf sek" data-a="beenden" style="min-width:200px">Zurück</button>' : '<div class="f-bal" style="width:200px"><div style="width:60%"></div></div>');
    wurzel.appendChild(d);
  }
  function ladeWeg() { const l = wurzel && wurzel.querySelector('#f-lade'); if (l) l.parentNode.removeChild(l); }
  async function fernStartVersuch() {
    ladeAnzeige('Verbinde mit dem Hof …', 'Einen Moment, der gemeinsame Hof wird geladen.');
    let j = null;
    try { j = await fernPoll(true); } catch (e) { j = null; }
    if (!wurzel) return;
    if (!j && fern.nichtDa) { fern = null; ladeWeg(); lokalStarten(); return; }
    if (!j) { ladeAnzeige('Keine Verbindung', 'Der gemeinsame Hof liegt im Internet. Prüfe das WLAN und versuche es noch einmal.', 'Nochmal versuchen'); return; }
    if (!j.init) {
      if (fern.von === 'papa') { ladeAnzeige('Der Hof wartet auf Max', 'Max hat den gemeinsamen Hof noch nicht eröffnet. Er muss die Hof-Farm einmal am Tablet starten – dann kannst du mitspielen.', 'Nochmal prüfen'); return; }
      // Max: bisherigen Tablet-Hof uebernehmen oder neuen anlegen
      let roh = null;
      try { roh = localStorage.getItem(M.SPEICHER); } catch (e) { roh = null; }
      let r = null;
      try { r = roh ? await fernAnfrage('/api/farm/init', 'POST', { von: fern.von, state: roh }) : await fernAnfrage('/api/farm/neu', 'POST', { von: fern.von }); } catch (e) { r = null; }
      if (!r || !r.init) { ladeAnzeige('Das hat nicht geklappt', 'Der Hof konnte nicht angelegt werden. Versuche es noch einmal.', 'Nochmal versuchen'); return; }
      fern.erstes = !roh;
      fernAnwenden(r.state, r.rev);
      fern.ev = r.evLetzte; fern.ok = true;
    }
    if (!stand()) { ladeAnzeige('Das hat nicht geklappt', 'Der Hof konnte nicht geladen werden.', 'Nochmal versuchen'); return; }
    fernEinhaengen();
    ladeWeg();
    spielStarten(!!fern.erstes);
  }
  function fernAnwenden(zustand, rev) {
    if (!zustand) return;
    const ton = stand() ? stand().ton : true;
    M.laden(JSON.stringify(zustand), null);
    if (stand()) stand().ton = ton;
    fern.rev = rev;
  }
  // Pollt den Server: Stand (wenn neu), Ereignisse, Protokoll, Mitspieler-Anzeige. true = erster Abruf (ohne Ereignisse)
  async function fernPoll(erst) {
    if (fern.inFlight) return null;
    fern.inFlight = true;
    const t0 = Date.now();
    try {
      const j = await fernAnfrage('/api/farm?von=' + fern.von + '&rev=' + (erst ? -1 : fern.rev) + (fern.ev >= 0 && !erst ? '&ev=' + fern.ev : ''), 'GET');
      if (!fern) return null;
      if (j._status === 404) { fern.nichtDa = true; return null; }
      fern.ok = true; fern.fehler = 0;
      fern.offset = j.zeit - (t0 + Date.now()) / 2;
      fern.online = j.online || {};
      if (j.init) {
        if (j.state && j.rev >= fern.rev) { fernAnwenden(j.state, j.rev); if (!erst && !dlgAnfasst) dialogAktualisieren(false); }
        if (fern.ev >= 0 && j.ereignisse) j.ereignisse.forEach(e => ereignisBehandeln(e.art, e.daten));
        fern.ev = j.evLetzte;
        fernLog(j.log || []);
      }
      return j;
    } catch (e) {
      if (fern) { fern.fehler++; if (fern.fehler >= 2) fern.ok = false; }
      return null;
    } finally { if (fern) fern.inFlight = false; }
  }
  const MITSPIELER = { max: '👦 Max', papa: '👨 Papa' };
  function fernLog(liste) {
    fern.log = liste;
    const hoechste = liste.reduce((a, e) => Math.max(a, e.id), 0);
    if (fern.logLetzte < 0) { fern.logLetzte = hoechste; return; }
    liste.forEach(e => { if (e.id > fern.logLetzte && e.von !== fern.von) toast(MITSPIELER[e.von] + ' ' + e.text, 'gut', 'mit' + e.id); });
    fern.logLetzte = Math.max(fern.logLetzte, hoechste);
  }
  // Befehle abfangen: lokal sofort ausfuehren (damit die Anzeige direkt reagiert) UND zum Server schicken, der Server-Stand gewinnt
  function fernEinhaengen() {
    Object.keys(FERN_BEFEHLE).forEach(n => {
      const orig = M[n];
      fern.orig[n] = orig;
      M[n] = function () {
        const args = Array.prototype.slice.call(arguments, 0, FERN_BEFEHLE[n]);
        if (!fern || !fern.ok) return { ok: false, grund: 'Keine Verbindung zum Hof – bitte WLAN prüfen.' };
        if (n === 'wetterGesehen' && stand().album.wetter[args[0]]) return undefined;
        const r = orig.apply(M, arguments);
        if (r && r.ok === false) return r;
        fernSenden(n, args);
        return r;
      };
    });
  }
  function fernAushaengen() {
    Object.keys(fern.orig).forEach(n => { M[n] = fern.orig[n]; });
    fern.orig = {};
  }
  async function fernSenden(name, args) {
    try {
      const r = await fernAnfrage('/api/farm/befehl', 'POST', { von: fern.von, name, args });
      if (!fern) return;
      fern.ok = true;
      fern.offset = r.zeit - Date.now();
      if (r.state && r.rev >= fern.rev) fernAnwenden(r.state, r.rev);
      if (r.ok === false && r.grund) { toast(r.grund, 'warn', 'ferngrund'); piep('fehler'); }
      dialogAktualisieren(false);
      if (r.log) fernLog(r.log);
    } catch (e) {
      if (fern) { fern.ok = false; toast('Verbindung weg – die letzte Aktion wurde nicht gespeichert.', 'warn', 'ferngrund'); }
    }
  }

  function fortschrittText() {
    try {
      const raw = JSON.parse(localStorage.getItem(M.SPEICHER) || 'null');
      if (!raw || raw.v !== 2) return 'Neuer Hof';
      return 'Level ' + raw.level + ' · ' + Object.keys(raw.felder || {}).length + ' Felder';
    } catch (e) { return 'Neuer Hof'; }
  }

  return {
    oeffnen, schliessen, fortschrittText, konfig,
    _t: { M, A, aktion, dlg: () => dlg, dialogFeld, dialogShop, dialogLager, dialogAuftraege, dialogBetriebe, dialogFuhrpark, dialogFelder, dialogMenue, dialogHilfe, dialogTiere, dialogWetter, dialogSammlung, get fern() { return fern; }, fernPoll: () => fern && fernPoll(), hinweisBerechnen, cam, toast, speichern }
  };
})();
