// Hof-Farm: Oberflaeche (Vollbild-Spiel), "Hof-Farm 2.0" im Stil B "Arena". Max faehrt nicht selbst - er kauft Maschinen und
// schickt sie als Auftraege auf die Felder. Logik: farm-modell.js, Welt: farm-ansicht.js, Daten: farm-daten.js, Grafik: farm-gfx.js,
// Stil/Icons/Fuchs/Effekte: farm-stil.js + farm-icons.js.
// Bewusst OHNE Anbindung an Sterne/Guthaben/Lernen (Uli 21.10.2026: "erstmal nur das Spiel spielen") - Schnittstelle spaeter.
// Regeln (Spielstand von Max!): Spielstand nur ueber M.<befehl>(...) zur Laufzeit aendern (nie Funktionsreferenzen halten,
// fernEinhaengen ersetzt sie), nie alte S-Objekte halten (immer frisch ueber stand()), FERN_BEFEHLE unveraendert.
const Farm = (function () {
  const D = FarmDaten, G = FarmGfx, M = FarmModell, A = FarmAnsicht, FS = FarmStil;

  let wurzel = null, cv = null, g = null, R = {};
  let W = 0, H = 0, dpr = 1;
  // Aufloesung passt sich der Geschwindigkeit des Geraets an (nur abwaerts, damit nichts hin- und herspringt).
  // Welt-DPR hoechstens 1,5 (Gutachten: schwache GPU des Tab S 8.4); HUD/Dialoge sind DOM und bleiben scharf.
  const DPR_STUFEN = [1.5, 1.25, 1, 0.8, 0.65];
  let dprStufe = 0, frameMs = 16, frameAb = 0;
  let laeuft = false, raf = 0, tLast = 0, tSpiel = 0;
  const cam = { x: 1750, y: 1450, z: 0.8, ziel: null };
  let schwung = null;             // Kamera-Nachlauf nach dem Loslassen { vx, vy } in Weltpixel/s
  let dlg = null;                 // { typ, ... } geoeffneter Dialog
  let dlgAnfasst = false, dlgAnfassEnde = 0;
  let timer = { sim: 0, speicher: 0, hud: 0, dlg: 0, poll: 0 };
  let ton = null;
  let vorschauCache = {};
  let ausgang = null;
  let geldAnzeige = 0, geldLetzt = null, geldUnterwegs = 0, geldHalten = false;
  let tempoKlicks = 0;
  let bestaetigenFn = null;
  let letzterTipp = null;         // { x, y, t } – Startpunkt fuer Muenzflug nach einem Knopfdruck
  const zeiger = {};
  const tippSperre = {};          // Doppeltipp-Sperre 300 ms je Knopf

  const fmt = n => Math.round(n).toLocaleString('de-DE');
  const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('de-DE');
  const tonnen = kg => (kg >= 100000 ? fmt(kg / 1000) : fmt1(kg / 1000)) + ' t';
  const meter = px => fmt1(px / D.PX_JE_M) + ' m';
  const I = (name, px, kl) => FS.icon(name, px, kl);
  const esc = t => String(t === undefined || t === null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const grob = ms => A.zeitGrob(ms);
  const istHandy = () => { try { return window.matchMedia('(max-width: 820px), (max-height: 480px)').matches; } catch (e) { return W <= 820 || H <= 480; } };
  const istHochHandy = () => { try { return window.matchMedia('(max-width: 820px)').matches; } catch (e) { return W <= 820; } };
  // Gemeinsamer Hof: Ist fernKonfig gesetzt ({ basis, von: 'max'|'papa' }), liegt der Spielstand auf dem Pi (backend/farm-server.js).
  // Dann rechnet NUR der Server die Zeit weiter; hier werden Befehle geschickt und der Stand per Poll geholt.
  let fernKonfig = null;
  let fern = null;
  function konfig(c) { fernKonfig = c && c.fern ? c.fern : null; }
  const jetzt = () => Date.now() + (fern ? fern.offset : 0);
  const stand = () => M.stand();

  // Icons zu Spiel-Dingen (Namen siehe farm-icons.js)
  const GERAET_NAME = { grubber: 'Grubber', pflug: 'Pflug', saeen: 'Sämaschine', duenger: 'Düngerstreuer', walze: 'Walze', spritze: 'Feldspritze', kalk: 'Kalkstreuer' };
  const GERAET_ICON = { grubber: 'grubbern', pflug: 'pfluegen', saeen: 'saeen', duenger: 'duengen', walze: 'walzen', spritze: 'spritzen', kalk: 'kalken' };
  const SCHRITT_KURZ = { grubbern: 'Grubbern', pfluegen: 'Pflügen', kalken: 'Kalken', saeen: 'Säen', duengen: 'Düngen', spritzen: 'Spritzen', walzen: 'Walzen', ernten: 'Ernten' };
  // Kurze Saetze (max. 8 Woerter); die langen Erklaerungen (D.SCHRITT_WARUM) stehen hinter dem i-Knopf
  const SCHRITT_SATZ = {
    grubbern: 'Lockert den Boden für die Saat', pfluegen: 'Dreht die Erde um: mehr Ertrag', kalken: 'Macht müden Boden wieder fit',
    saeen: 'Du bestimmst, was hier wächst', duengen: 'Futter für die Pflanzen: mehr Ertrag', spritzen: 'Hält Unkraut und Käfer fern',
    walzen: 'Drückt die Samen gut fest', ernten: 'Die Ernte kommt ins Silo'
  };
  function maschinenIcon(d) {
    if (!d) return 'traktor';
    if (d.art === 'traktor') return 'traktor';
    if (d.art === 'ernter') return d.typ === 'rodemaschine' ? 'roder' : 'maehdrescher';
    return GERAET_ICON[d.typ] || 'traktor';
  }
  function feldIcon(f) {
    if (!f) return 'felder';
    if ((f.phase === 'waechst' || f.phase === 'reif') && f.frucht) return f.frucht;
    return f.phase === 'stoppel' ? 'stoppel' : 'boden';
  }
  function stufeKlasse(x) { return 'fs-stufe-' + FS.stufe(x); }

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
    if (!ton || !stand() || !stand().ton) return;
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
  // Farm-spezifisches Layout-CSS (Komponenten kommen aus FarmStil: fs-*). Alles unter #farm.
  // Ebenen: Welt 0 · HUD 5 · Dock 3 · Dialog 40/41 · Level-Up 60 · Rundgang 65 · Rueckfrage 70 · Toasts 80 · offline 85 · Laden 90
  // ----------------------------------------------------------------------------------------------
  const CSS = `
  #farm{position:fixed;left:0;top:0;right:0;bottom:0;z-index:9000;background:#2c4a24;color:#fff;font-family:"Fredoka","Trebuchet MS",sans-serif;font-weight:600;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
  #farm canvas#farm-cv{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
  #farm button{font-family:inherit;color:inherit;cursor:pointer;-webkit-appearance:none;touch-action:manipulation;margin:0}
  #farm .f-hud{position:absolute;z-index:5;pointer-events:none}
  #farm .f-hud>*{pointer-events:auto}
  #farm .f-hud-links{left:12px;top:10px;display:flex;align-items:center;gap:6px}
  #farm .f-hud-links .fs-level{cursor:pointer}
  #farm .f-chips{left:14px;top:118px;display:flex;gap:12px;align-items:center}
  #farm .f-chips .fs-chip b .fi{width:24px;height:24px;vertical-align:-4px}
  #farm .fs-chip.fs-gruen{color:#fff;text-shadow:0 3px 0 #0A0D26,1.5px 1.5px 0 #0A0D26,-1.5px 1.5px 0 #0A0D26,1.5px -1.5px 0 #0A0D26,-1.5px -1.5px 0 #0A0D26}   /* weiss auf Hellgruen braucht Kontur (Kontrast) */
  #farm .f-ziel-platz{left:380px;right:180px;top:12px;display:flex;justify-content:center}
  #farm .f-ziel-platz>.fs-ziel{width:100%;max-width:540px;cursor:pointer}
  #farm .f-ziel-platz.f-weg,#farm .f-chips.f-weg{display:none}
  #farm .f-chips.f-verdeckt,#farm.f-panel-seite .f-hud-rechts,#farm.f-panel-seite .f-zoom,#farm.f-panel-seite .fs-dock{visibility:hidden}
  #farm .f-ziel-neu{animation:fs-auftauchen .5s var(--fs-pop) both}
  #farm .f-hud-rechts{right:14px;top:14px;display:flex;gap:12px}
  #farm .f-zoom{right:16px;bottom:96px;display:flex;flex-direction:column;gap:12px} /* unten rechts liegt am Tablet das Kiosk-Schloss der App */
  #farm .f-mit-ort{left:16px;bottom:26px}
  #farm .f-mit-ort .fs-chip{cursor:default}
  #farm .fs-dock{z-index:3}
  #farm .f-plus{position:absolute;z-index:6;pointer-events:none;font-family:var(--fs-titel);font-size:30px;color:#FFF07A;white-space:nowrap;animation:f-plus 1.5s var(--fs-aus) forwards}
  @keyframes f-plus{0%{transform:translate(-50%,6px) scale(.6);opacity:0}15%{transform:translate(-50%,0) scale(1.1);opacity:1}70%{opacity:1}100%{transform:translate(-50%,-26px) scale(1);opacity:0}}
  #farm .f-offline{position:absolute;left:50%;top:10px;z-index:85;transform:translateX(-50%);display:none;background:linear-gradient(#FF6B72,#C81E2E)}
  #farm .f-flug{position:fixed;left:0;top:0;width:44px;height:44px;z-index:99991;pointer-events:none;will-change:transform,opacity}
  #farm .f-flug>svg{width:100%;height:100%}
  /* Dialog-Rahmen: Panel rechts (Tablet) / Bottom-Sheet (Handy) / Vollbild-Panel */
  #farm .f-dlg{position:absolute;left:0;top:0;right:0;bottom:0;z-index:40;pointer-events:none}
  #farm .f-dlg>*{pointer-events:auto}
  @media (min-width:821px) and (min-height:481px){ #farm .fs-sheet.f-breit{width:812px} }
  #farm .fs-sheet-fuss:empty,#farm .f-vor:empty{display:none}
  #farm .f-vor{flex:0 0 auto;padding:0 18px 10px}
  #farm .fs-panel-kopf .fs-btn.fs-rund{flex:0 0 auto}
  #farm .fs-panel-kopf .f-kopf-extra{display:flex;gap:10px;align-items:center}
  #farm .fs-panel-kopf .f-titel-klein{font-size:30px;line-height:36px}
  #farm .f-geldziel{height:50px;padding:0 16px 0 6px}
  #farm .f-geldziel b{font-size:26px}
  /* Feldkarte */
  #farm .fs-weg{margin:0 0 16px}
  #farm .fs-sheet .fs-weg-schritt{height:84px}
  #farm .fs-sheet .fs-weg-schritt>.fi{width:42px;height:42px}
  #farm .f-abschnitt-weg{margin:0 0 10px}
  #farm .fs-weg-schritt .f-weg-haken{position:absolute;right:-9px;top:-9px;width:30px;height:30px;opacity:1}
  #farm .f-ringzeile{display:flex;align-items:center;gap:18px;margin:0 0 18px}
  #farm .f-stats{display:flex;flex-direction:column;gap:6px;min-width:0}
  #farm .f-aktion-kopf{display:flex;align-items:center;gap:12px;margin-bottom:12px}
  #farm .f-aktion-kopf>.fi{width:64px;height:64px}
  #farm .f-aktion-tx{flex:1 1 auto;min-width:0}
  #farm .fs-aktion .fs-btn.fs-gross{margin-top:2px}
  #farm .fs-aktion .fs-btn .fs-btn-zeile .fi{width:22px;height:22px;vertical-align:-4px}
  #farm .f-merk-zeile{margin:-4px 0 12px 76px}
  #farm .f-warum-box{margin-top:12px;padding:12px 16px;font-size:19px;line-height:26px;color:#fff;font-weight:600}
  #farm .f-kacheln{display:flex;flex-wrap:wrap;gap:16px 14px}
  #farm .f-kacheln .fs-kachel{width:96px}
  #farm .f-kacheln .fs-kachel .fs-badge{right:-12px;top:-12px;font-size:17px;padding:0 6px;display:flex;align-items:center;gap:1px}
  #farm .f-kacheln .fs-kachel .fs-badge .fi{width:18px;height:18px}
  #farm .f-zeile2{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:16px}
  #farm .f-zeile2>.fs-btn{flex:1 1 auto}
  #farm .f-fuchs-zeile{display:flex;align-items:center;gap:12px;font-size:21px;line-height:27px;margin:4px 0 14px}
  #farm .f-fuchs-zeile>svg{flex:0 0 auto}
  #farm .f-mehr{display:grid;grid-template-columns:44px 1fr auto;gap:10px 10px;align-items:center;padding:12px 14px;font-size:19px;margin-top:12px}
  #farm .f-mehr b{font-family:var(--fs-titel);font-weight:400;font-size:24px;color:#fff;white-space:nowrap}
  #farm .f-fahrer{display:flex;align-items:center;gap:12px;padding:10px 12px;margin-top:16px;font-size:19px;line-height:24px}
  #farm .f-fahrer>.fi{width:52px;height:52px}
  #farm .f-fahrer>div{flex:1 1 auto;min-width:0}
  #farm .f-job-text{font-size:21px;line-height:26px;color:#fff;font-weight:700;text-shadow:0 2px 0 #0F6A25}
  #farm .f-klein-btn{min-height:64px;font-size:20px;padding:4px 18px 8px}
  #farm .f-preis{display:inline-flex;align-items:center;gap:4px}
  /* Maschinenwahl */
  #farm .f-mrow{position:relative;display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:16px;border-radius:20px;background:linear-gradient(#27307E,#1A2163);border:3px solid #0A0D26;box-shadow:inset 0 2px 0 rgba(255,255,255,.15),0 5px 0 #0A0D26}
  #farm .f-mrow.f-gewaehlt{box-shadow:0 0 0 3px #FFC531,0 5px 0 3px #0A0D26}
  #farm .f-mrow img{flex:0 0 auto;width:112px;height:66px;object-fit:contain;border-radius:12px;background:linear-gradient(#4f8a3e,#335a2b);border:2px solid #0A0D26}
  #farm .f-mrow .f-m-tx{flex:1 1 auto;min-width:0}
  #farm .f-mrow .f-m-name{font-family:var(--fs-titel);font-size:24px;line-height:28px}
  #farm .f-mrow .f-m-zeile{font-size:18px;line-height:24px;color:#BCC5FF;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  #farm .f-mrow .f-m-zeile b{color:#fff}
  #farm .f-mrow .f-m-zeile .fi{width:24px;height:24px}
  #farm .f-mrow .fs-marke{position:absolute;right:12px;top:-14px}
  #farm .f-trak{display:inline-flex;align-items:center;gap:4px;min-height:64px;padding:0 10px;border-radius:12px;border:2px solid #0A0D26;background:#2F3A9A;color:#fff;font-size:18px;font-weight:700}
  #farm .f-trak .fi{width:26px;height:26px}
  /* Saatwahl */
  #farm .f-saat{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px 18px;padding:14px 4px 6px}
  #farm .f-saat .fs-karte>.fs-marke{position:absolute;left:12px;top:12px;z-index:2}
  #farm .f-saat .fs-karte .fs-karte-grund{color:#FFE6A8}
  #farm .f-saat-mehr{display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin-top:18px}
  #farm.f-level-offen .fs-toasts{bottom:auto;top:16px}
  #farm .f-saat-fuss{display:flex;align-items:center;gap:12px}
  #farm .f-saat-fuss>.fi{width:56px;height:56px}
  #farm .f-saat-fuss>div{flex:1 1 auto;min-width:0;font-size:19px;line-height:24px}
  #farm .f-saat-fuss b{font-family:var(--fs-titel);font-weight:400;font-size:22px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  /* Lernrunde */
  #farm .f-lern{display:flex;flex-direction:column;align-items:center;gap:16px;padding-top:6px}
  #farm .f-lern-punkte{display:flex;gap:10px}
  #farm .f-lern-punkte i{display:block;width:22px;height:22px;border-radius:11px;border:3px solid #0A0D26;background:#2B3589}
  #farm .f-lern-punkte i.ok{background:#4BE35F}#farm .f-lern-punkte i.nein{background:#FF8C8C}#farm .f-lern-punkte i.jetzt{background:#FFC61A;transform:scale(1.2)}
  #farm .f-lern-titel{font-size:20px;color:#BCC5FF}
  #farm .f-lk{position:relative;width:100%;max-width:760px;height:340px;perspective:1400px}
  #farm .f-lk-innen{position:absolute;left:0;top:0;width:100%;height:100%;transform-style:preserve-3d;transition:transform .55s var(--fs-aus)}
  #farm .f-lk.f-auf .f-lk-innen{transform:rotateY(180deg)}
  #farm .f-lk-seite{position:absolute;left:0;top:0;right:0;bottom:0;box-sizing:border-box;display:flex;flex-direction:column;padding:24px 28px;text-align:center;overflow-y:auto;-webkit-overflow-scrolling:touch;
    border-radius:28px;border:4px solid #0A0D26;-webkit-backface-visibility:hidden;backface-visibility:hidden;font-weight:700;line-height:1.25;color:#24124F;
    background:linear-gradient(180deg,#FFFFFF 0%,#F1EAFF 100%);box-shadow:inset 0 -8px 0 #CDBBF7,0 7px 0 #0A0D26,0 18px 26px rgba(0,0,0,.4)}
  #farm .f-lk-hinten{transform:rotateY(180deg);background:linear-gradient(180deg,#F4FFF0 0%,#DDF7D2 100%);box-shadow:inset 0 -8px 0 #A9E39A,0 7px 0 #0A0D26,0 18px 26px rgba(0,0,0,.4);color:#0F3A17}
  #farm .f-lk-text{margin:auto 0}  /* zentriert, solange es passt; laengere Antworten scrollen in der Karte */
  #farm .f-lk-seite small{display:block;font-size:20px;font-weight:600;color:#6A5AA8;margin-bottom:10px}
  #farm .f-lk-hinten small{color:#3E7A3A}
  #farm .f-lern-knoepfe{display:flex;gap:16px;width:100%;max-width:760px}
  #farm .f-lern-knoepfe>.fs-btn{flex:1 1 0}
  #farm .f-lern-tipp{font-size:20px;color:#BCC5FF;text-align:center}
  #farm .f-lern-erg{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
  #farm .f-lern-erg .f-gross-zahl{font-family:var(--fs-titel);font-size:48px;line-height:52px}
  #farm .f-lern-erg p{margin:0;font-size:22px;line-height:28px}
  #farm .f-lern-liste{font-size:19px;line-height:26px;color:#BCC5FF;max-width:640px}
  /* Ueberlagerungen: Level-Up, Rundgang, Rueckfrage */
  #farm .f-ueber{position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;flex-direction:column;box-sizing:border-box;padding:16px;overflow:hidden}
  #farm .f-schleier-dunkel{position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(7,10,31,.66);animation:fs-blende .18s ease-out both}
  #farm .f-level{z-index:60;background:radial-gradient(circle at 50% 36%,#7444E0 0%,#4A26B5 38%,#24166E 72%,#140C45 100%);animation:fs-blende .25s ease-out both}
  #farm .f-strahlen{position:absolute;left:50%;top:32%;width:512px;height:512px;margin:-256px 0 0 -256px;pointer-events:none;transform:scale(3.4)}
  #farm .f-strahlen>img{display:block;width:512px;height:512px;opacity:.5;animation:fs-drehen 60s linear infinite}
  #farm .f-level-inhalt{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;max-width:1200px}
  #farm .f-level-titel{font-family:var(--fs-titel);font-size:76px;line-height:80px;color:#FFE14D;letter-spacing:1px;transform:rotate(-2deg)}
  #farm .f-level-stern{position:relative;animation:fs-auftauchen .6s var(--fs-pop) both}
  #farm .f-level-stern .fs-level-zahl{font-family:var(--fs-level)}
  #farm .f-level-fuchs{position:absolute;left:-150px;bottom:-16px}
  #farm .f-lvl-karten{display:flex;flex-wrap:wrap;justify-content:center;gap:22px 18px;margin:8px 0 6px}
  #farm .f-lvl-k{position:relative;box-sizing:border-box;width:212px;padding:26px 10px 14px;border-radius:24px;border:4px solid var(--fs-rc);text-align:center;
    background:radial-gradient(circle at 50% 38%,var(--fs-rg) 0%,rgba(0,0,0,0) 62%),linear-gradient(180deg,#27307E 0%,#1A2163 100%);box-shadow:0 0 0 3px #0A0D26,0 7px 0 3px #0A0D26,0 16px 22px rgba(0,0,0,.35);animation:fs-auftauchen .5s var(--fs-pop) both}
  #farm .f-lvl-k>.fi{width:104px;height:104px}
  #farm .f-lvl-k img{display:block;width:150px;height:84px;margin:8px auto 10px;object-fit:contain}
  #farm .f-lvl-k .f-lvl-art{position:absolute;left:50%;top:-18px;transform:translateX(-50%);white-space:nowrap;height:32px;padding:0 12px;border-radius:12px;border:3px solid #0A0D26;background:var(--fs-rc);color:#0A0D26;font-family:var(--fs-titel);font-size:18px;line-height:26px}
  #farm .f-lvl-k .f-lvl-name{display:block;font-family:var(--fs-titel);font-size:26px;line-height:28px;margin-top:4px}
  #farm .f-lvl-k .f-lvl-text{display:block;font-size:18px;line-height:22px;color:#BCC5FF;margin-top:2px}
  #farm .f-lvl-karten.f-klein .f-lvl-k{width:168px;padding:22px 8px 10px}
  #farm .f-lvl-karten.f-klein .f-lvl-k>.fi{width:72px;height:72px}
  #farm .f-lvl-karten.f-klein .f-lvl-k img{width:120px;height:60px}
  #farm .f-lvl-karten.f-klein .f-lvl-name{font-size:21px;line-height:23px}
  #farm .f-lvl-karten.f-klein .f-lvl-text{font-size:18px;line-height:21px}
  #farm .f-rund{z-index:65}
  #farm .f-conf{z-index:70}
  #farm .f-kasten{position:relative;width:560px;max-width:100%;box-sizing:border-box;padding:24px 24px 22px;animation:fs-auftauchen .35s var(--fs-pop) both}
  #farm .f-kasten-kopf{display:flex;align-items:center;gap:14px;margin-bottom:12px}
  #farm .f-kasten-kopf>svg{flex:0 0 auto}
  #farm .f-kasten-titel{font-family:var(--fs-titel);font-size:36px;line-height:40px}
  #farm .f-kasten-text{font-size:23px;line-height:30px;margin:0 0 18px}
  #farm .f-kasten-knoepfe{display:flex;gap:14px}
  #farm .f-kasten-knoepfe>.fs-btn{flex:1 1 0}
  #farm .f-vn{display:flex;align-items:center;justify-content:center;gap:14px;margin:0 0 20px}
  #farm .f-vn-bild{display:flex;flex-direction:column;align-items:center;gap:4px;width:120px;padding:10px 6px;font-size:18px;color:#BCC5FF}
  #farm .f-vn-bild .fi{width:64px;height:64px}
  #farm .f-rund-text{font-family:var(--fs-titel);font-size:38px;line-height:44px;text-align:center;margin:10px 0 16px}
  #farm .f-rund-punkte{display:flex;justify-content:center;gap:10px;margin-bottom:18px}
  #farm .f-rund-punkte i{display:block;width:16px;height:16px;border-radius:8px;border:3px solid #0A0D26;background:#2B3589}
  #farm .f-rund-punkte i.an{background:#FFC61A}
  #farm .f-lade{z-index:90;background:#141A4D}
  #farm .f-lade .f-kasten{text-align:center}
  /* Menue */
  #farm .f-menue{display:flex;flex-direction:column;gap:14px}
  #farm .f-menue>.fs-btn{justify-content:flex-start}
  #farm .f-menue .fs-btn.fs-breit{display:flex}
  #farm .f-statzeile{font-size:19px;line-height:26px;color:#BCC5FF;padding:12px 14px;margin-top:6px}
  #farm .f-chronik{font-size:18px;line-height:26px;padding:12px 14px}
  #farm .f-chronik b{color:#FFF07A}
  #farm .f-tempo{display:flex;gap:10px;flex-wrap:wrap}
  /* ---- Dialog-Bausteine (Teil 2): Knopf-Zeilen, Zahl mit Icon, Reiter, Karten, Werte-Balken ---- */
  #farm .fs-btn.fs-navy .fs-btn-zeile,#farm .fs-btn.fs-aus .fs-btn-zeile,#farm .fs-btn.fs-violett .fs-btn-zeile{color:#D5DBFF}
  #farm .fs-btn .f-btn-titel{display:flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap}
  #farm .fs-btn .f-btn-titel>.fi{width:32px;height:32px}
  #farm .fs-btn.fs-gross .f-btn-titel>.fi{width:42px;height:42px}
  #farm .fs-btn .fs-btn-zeile{white-space:nowrap}
  #farm .fs-btn .fs-btn-zeile .fi{width:24px;height:24px;vertical-align:-5px}
  #farm .f-zi{display:inline-flex;align-items:center;gap:4px;height:46px;box-sizing:border-box;padding:0 12px 0 4px;border-radius:14px;background:#0F1442;border:2px solid #0A0D26;white-space:nowrap}
  #farm .f-zi>.fi{width:38px;height:38px}
  #farm .f-zi b{font-family:var(--fs-titel);font-weight:400;font-size:22px;color:#fff}
  #farm .f-zi b:empty{display:none}
  #farm .f-zi.f-fehlt{border-color:#F2424A;box-shadow:0 0 0 2px #F2424A}
  #farm .f-zi.f-aus-ware{background:#173F2A}
  #farm .f-reiter{display:flex;gap:12px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-x;padding:14px 4px 12px;margin:-12px -4px 0;scrollbar-width:none}
  #farm .f-reiter::-webkit-scrollbar{display:none}
  #farm .f-reiter>.fs-btn{flex:0 0 auto;min-height:64px;font-size:21px;padding:4px 18px 8px 10px;white-space:nowrap}
  #farm .f-reiter>.fs-btn>.fi{width:36px;height:36px}
  #farm .f-reiter>.fs-btn.f-an{box-shadow:inset 0 -7px 0 var(--fs-lip),inset 0 3px 0 rgba(255,255,255,.55),0 0 0 3px #fff,0 5px 0 3px #0A0D26}
  #farm .f-vor-zeile{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
  #farm .f-raster{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:24px 18px;padding:10px 2px 8px;align-items:start}
  #farm .f-raster.f-r2{grid-template-columns:repeat(auto-fill,minmax(400px,1fr))}
  #farm .f-raster.f-r3{grid-template-columns:repeat(auto-fill,minmax(360px,1fr))}
  #farm .f-k{position:relative;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;min-width:0;padding:14px;border-radius:22px;border:3px solid #0A0D26;
    background:linear-gradient(180deg,#27307E 0%,#1A2163 60%,#151B54 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.16),0 6px 0 #0A0D26,0 14px 20px rgba(0,0,0,.3)}
  #farm .f-k.f-fokus{box-shadow:0 0 0 4px #FFC531,0 6px 0 4px #0A0D26,0 14px 20px rgba(0,0,0,.3)}
  #farm .f-k.f-fertig{box-shadow:0 0 0 4px #4BE35F,0 6px 0 4px #0A0D26,0 14px 20px rgba(0,0,0,.3)}
  #farm .f-k.f-hunger,#farm .f-k.f-kaputt{box-shadow:0 0 0 4px #F2424A,0 6px 0 4px #0A0D26,0 14px 20px rgba(0,0,0,.3)}
  #farm .f-k.f-zu{background:linear-gradient(180deg,#1E2463 0%,#161B4F 100%)}
  #farm .f-k.f-zu .f-k-titel{color:#AEB6EC}
  #farm .f-k-kopf{display:flex;align-items:center;gap:12px;min-height:64px}
  #farm .f-k-kopf.f-k-kopf-klein{min-height:0}
  #farm .f-k-bild{position:relative;flex:0 0 68px;width:68px;height:68px;box-sizing:border-box;border-radius:18px;border:3px solid #0A0D26;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 50% 55%,var(--fs-rg,rgba(63,169,255,.5)) 0%,rgba(0,0,0,0) 70%),linear-gradient(#2E3893,#1B2266);box-shadow:0 0 0 3px var(--fs-rc,#3A47B0)}
  #farm .f-k-bild>.fi{width:52px;height:52px}
  #farm .f-k-bild>.fi.fs-ecke{width:32px;height:32px;right:-12px;top:-12px}
  #farm .f-zu .f-k-bild>.fi:not(.fs-ecke){opacity:.45}
  #farm .f-k-tx{flex:1 1 auto;min-width:0}
  #farm .f-k-titel{font-family:var(--fs-titel);font-weight:400;font-size:26px;line-height:30px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #farm .f-k-unter{font-size:19px;line-height:24px;color:#BCC5FF}
  #farm .f-k-unter .f-preis .fi{width:24px;height:24px;vertical-align:-5px}
  #farm .f-k-fuss{margin-top:auto;display:flex;gap:12px}
  #farm .f-k-fuss>.fs-btn{flex:1 1 0;min-width:0;padding-left:10px;padding-right:10px}
  #farm .f-info-rund.fs-btn.fs-rund{flex:0 0 auto;width:64px;height:64px}
  #farm .f-zeile2>.f-mehr-btn{flex:0 1 auto}
  #farm .f-abschnitt-zeile{display:flex;align-items:center;gap:12px;margin:18px 0 8px}
  #farm .f-abschnitt-zeile .fs-abschnitt{margin:0;flex:1 1 auto}
  #farm .f-chip-klein{height:48px;font-size:19px;cursor:default}
  #farm .f-pille-info{cursor:default}
  #farm .f-warn{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;background:#5A1424;border:3px solid #0A0D26;font-size:19px;line-height:24px}
  #farm .f-warn>.fi{width:36px;height:36px}
  #farm .f-mehr-knoepfe{display:flex;flex-wrap:wrap;gap:12px}
  #farm .f-mehr-knoepfe>.fs-btn{flex:1 1 200px}
  #farm .f-mehr-knoepfe>.fs-marke{height:44px;font-size:21px}
  #farm .f-k .f-fuchs-zeile{margin:0}
  /* Haendler + Meine Maschinen */
  #farm .f-foto{position:relative;height:132px;border-radius:16px;border:3px solid #0A0D26;overflow:hidden;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 50% 62%,rgba(150,220,110,.55) 0%,rgba(0,0,0,0) 65%),linear-gradient(180deg,#4f8a3e 0%,#335a2b 100%)}
  #farm .f-foto img{width:230px;height:124px;object-fit:contain}
  #farm .f-zu .f-foto img{opacity:.35}
  #farm .f-foto .fi.f-foto-schloss{position:absolute;left:50%;top:50%;width:60px;height:60px;margin:-30px 0 0 -30px}
  #farm .f-foto .f-marke{position:absolute;left:8px;top:8px;height:32px;font-size:18px}
  #farm .f-foto .f-foto-marke{position:absolute;right:8px;bottom:8px}
  #farm .f-werte{display:flex;flex-direction:column;gap:8px}
  #farm .f-wert{display:grid;grid-template-columns:34px 78px minmax(0,1fr) auto;align-items:center;gap:8px;font-size:19px;color:#BCC5FF}
  #farm .f-wert>.fi{width:34px;height:34px}
  #farm .f-wert b{font-family:var(--fs-titel);font-weight:400;font-size:21px;color:#fff;white-space:nowrap;min-width:62px;text-align:right}
  #farm .f-wert .fs-balken{height:20px}
  #farm .f-vorteile{display:flex;flex-direction:column;gap:4px}
  #farm .f-vorteil{display:flex;align-items:flex-start;gap:6px;font-size:19px;line-height:23px;color:#9BF57A}
  #farm .f-vorteil>.fi{width:24px;height:24px;flex:0 0 24px}
  #farm .f-mk .f-k-fuss .fs-btn{min-height:72px}
  #farm .f-mk .f-k-titel{white-space:normal;font-size:24px;line-height:27px}
  #farm .f-raster.f-mk-raster,#farm .f-raster.f-erf-raster{align-items:stretch}
  #farm .f-k-fuss.f-fuss-spalte{flex-direction:column}
  #farm .f-k-fuss.f-fuss-spalte>.fs-btn{flex:0 0 auto}
  #farm .f-mk .f-k-fuss .fs-btn.f-verk-btn{min-height:64px;font-size:21px}
  #farm .f-erfolg .f-k-titel{white-space:normal;font-size:24px;line-height:27px}
  #farm .f-mk .f-warum-box{margin-top:0}
  #farm .f-zum-feld{flex:0 0 auto}
  #farm .f-werte-gross{display:flex;align-items:center;gap:12px;font-size:19px;color:#BCC5FF}
  #farm .f-silo{flex-direction:row;flex-wrap:wrap;align-items:center}
  #farm .f-silo>.f-silo-zeile{flex:1 1 420px;display:flex;align-items:center;gap:14px;min-width:0}
  #farm .f-silo>.f-fuchs-zeile{flex:1 1 100%;order:3}
  #farm .f-silo>.f-k-fuss{flex:0 0 auto;margin:0}
  #farm .f-silo.f-silo-gross{flex-direction:column;align-items:stretch}
  #farm .f-silo.f-silo-gross>.f-silo-zeile{flex:0 0 auto}
  #farm .fi.f-silo-bild{width:84px;height:84px}
  #farm .f-silo-zahl{font-family:var(--fs-titel);font-weight:400;font-size:34px;line-height:40px;margin-bottom:6px;white-space:nowrap}
  #farm .f-silo-zahl span{font-size:22px;color:#BCC5FF}
  /* Lager & Markt */
  #farm .f-lager-liste{display:flex;flex-direction:column;gap:12px}
  #farm .f-lz{display:grid;grid-template-columns:60px minmax(0,1fr) 220px 230px 64px;grid-template-areas:"bild name preis knopf mehr" "extra extra extra extra extra";align-items:center;gap:0 14px;
    padding:10px 12px;border-radius:20px;border:3px solid #0A0D26;background:linear-gradient(180deg,#252E7A,#1A2163);box-shadow:0 4px 0 #0A0D26}
  #farm .fi.f-lz-bild{grid-area:bild;width:60px;height:60px}
  #farm .f-lz-name{grid-area:name;min-width:0}
  #farm .f-lz-name b{display:block;font-family:var(--fs-titel);font-weight:400;font-size:25px;line-height:29px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #farm .f-lz-name span{font-family:var(--fs-titel);font-size:23px;color:#FFF07A}
  #farm .f-lz-preis{grid-area:preis;display:flex;align-items:center;gap:8px}
  #farm .f-lz-preis b{display:flex;align-items:center;gap:2px;font-family:var(--fs-titel);font-weight:400;font-size:24px}
  #farm .f-lz-preis b .fi{width:28px;height:28px}
  #farm .f-lz-preis span{display:block;font-size:19px;color:#BCC5FF}
  #farm .f-lz-knopf{grid-area:knopf}
  #farm .f-lz-mehr.fs-btn.fs-rund{grid-area:mehr;width:64px;height:64px}
  #farm .f-lz-extra{grid-area:extra;display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end;padding-top:12px}
  #farm .f-zk-raster{grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
  #farm .f-zk .f-k-kopf>.fi{width:56px;height:56px}
  /* Auftragsbrett (Zettel) */
  #farm .f-brett{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:34px 20px;padding:24px 6px 8px;align-items:start}
  #farm .f-zettel{display:flex;flex-direction:column;gap:10px;padding:22px 14px 16px}
  #farm .f-brett>.f-zettel:nth-child(2n){transform:rotate(.7deg)}
  #farm .f-brett>.f-zettel:nth-child(2n+1){transform:rotate(-.5deg)}
  #farm .fi.f-zettel-haken{position:absolute;right:-16px;top:-16px;width:58px;height:58px;z-index:2}
  #farm .f-kunde{display:flex;align-items:center;gap:10px}
  #farm .f-kunde-bild{flex:0 0 56px;width:56px;height:56px;box-sizing:border-box;border-radius:14px;border:3px solid #0A0D26;background:#fff;display:flex;align-items:center;justify-content:center}
  #farm .f-kunde-bild .fi{width:44px;height:44px}
  #farm .f-kunde b{display:block;font-family:var(--fs-titel);font-weight:400;font-size:22px;line-height:25px;color:#3A2412}
  #farm .f-kunde span{display:block;font-size:19px;color:#7A5A3A}
  #farm .f-ware{display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:16px;background:#F3DFB0;border:2px solid #E3C98E}
  #farm .f-ware>.fi{width:76px;height:76px}
  #farm .f-ware b{display:block;font-family:var(--fs-titel);font-weight:400;font-size:40px;line-height:42px;color:#3A2412}
  #farm .f-ware span{display:block;font-size:20px;font-weight:700;color:#5A3A1A}
  #farm .f-im-lager{display:flex;align-items:center;justify-content:space-between;font-size:19px;color:#5A3A1A}
  #farm .f-im-lager span{display:flex;align-items:center;gap:4px}
  #farm .f-im-lager .fi{width:28px;height:28px}
  #farm .f-im-lager b{font-family:var(--fs-titel);font-weight:400;font-size:22px;color:#3A2412}
  #farm .f-zettel .fs-balken{height:22px}
  #farm .f-az-status{display:flex;align-items:center;gap:6px;font-size:21px;font-weight:700}
  #farm .f-az-status .fi{width:30px;height:30px}
  #farm .f-az-status.f-ok{color:#178A2B}
  #farm .f-az-status.f-fehlt{color:#C2410C}
  #farm .f-lohn{display:flex;align-items:center;justify-content:center;gap:6px;height:56px;box-sizing:border-box;padding:0 12px;border-radius:16px;background:linear-gradient(#2C3690,#1C2366);border:3px solid #0A0D26;color:#fff}
  #farm .f-lohn .fi{width:36px;height:36px}
  #farm .f-lohn b{font-family:var(--fs-titel);font-weight:400;font-size:26px;margin-right:8px}
  #farm .f-lohn b:last-child{margin-right:0}
  #farm .f-lohn.f-lohn-klein{height:48px}
  #farm .f-lohn.f-lohn-klein b{font-size:22px}
  #farm .f-lohn.f-lohn-klein .fi{width:30px;height:30px}
  #farm .f-az-zeit{display:flex;align-items:center;gap:6px;font-size:19px;color:#7A5A3A}
  #farm .f-az-zeit .fi{width:26px;height:26px}
  #farm .f-az-hinweis{display:flex;align-items:center;gap:6px;font-size:19px;font-weight:700;color:#2F6A12}
  #farm .f-az-hinweis .fi{width:28px;height:28px}
  #farm .f-az-fuss{display:flex;flex-direction:column;gap:8px}
  #farm .f-az-knoepfe{display:flex;gap:10px}
  #farm .f-az-knoepfe>.fs-btn{flex:1 1 0;min-width:0;padding-left:6px;padding-right:6px;font-size:21px}
  #farm .f-az-knopf.fs-btn{width:100%}
  #farm .f-brett-fuss{display:flex;align-items:center;gap:8px;justify-content:center;font-size:19px;color:#BCC5FF;margin-top:16px}
  #farm .f-brett-fuss .fi{width:34px;height:34px}
  /* Rezepte / Betriebe / Tierhof */
  #farm .f-gl{display:flex;align-items:center;flex-wrap:wrap;gap:6px}
  #farm .f-gl-pfeil .fi{width:30px;height:30px}
  #farm .f-gl-plus{font-family:var(--fs-titel);font-size:26px;color:#BCC5FF}
  #farm .f-rezept{display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:18px;background:#141A4D;border:2px solid #0A0D26}
  #farm .f-rezept-zeile{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  #farm .f-rezept-zeit{display:flex;align-items:center;gap:4px;font-family:var(--fs-titel);font-size:21px;color:#BCC5FF;margin-right:auto}
  #farm .f-rezept-zeit .fi{width:28px;height:28px}
  #farm .f-rezept-knoepfe{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
  #farm .f-rezept-knoepfe>.fs-btn{min-height:64px;font-size:21px;padding:4px 14px 8px}
  #farm .f-prod{display:flex;align-items:center;gap:14px}
  #farm .f-prod-titel{font-family:var(--fs-titel);font-size:24px;line-height:28px}
  #farm .f-prod-zeit{display:flex;align-items:center;gap:6px;font-size:20px;color:#E3E7FF}
  #farm .f-prod-zeit .fi{width:28px;height:28px}
  #farm .f-schlange{display:flex;align-items:center;gap:6px;margin-top:6px}
  #farm .f-schlange i{display:block;width:22px;height:22px;box-sizing:border-box;border-radius:7px;border:3px solid #0A0D26;background:#2B3589}
  #farm .f-schlange i.f-voll{background:#9A6BFF}
  #farm .f-schlange span{font-size:19px;color:#BCC5FF;margin-left:4px}
  #farm .f-futter-wahl{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:19px;color:#BCC5FF}
  #farm .f-futter-wahl .fi{width:30px;height:30px}
  #farm .f-futter-gut{display:inline-flex;align-items:center;gap:2px;white-space:nowrap}
  #farm .f-fuell{display:grid;grid-template-columns:44px minmax(0,1fr);gap:4px 10px;align-items:center}
  #farm .f-fuell>.fi{grid-row:1 / span 2;width:44px;height:44px}
  #farm .f-fuell-tx{display:flex;justify-content:space-between;gap:8px;font-size:19px;color:#BCC5FF}
  #farm .f-fuell-tx b{font-family:var(--fs-titel);font-weight:400;font-size:21px;color:#fff;white-space:nowrap}
  #farm .f-fuell-tx b.f-rot{color:#FF8C8C}
  #farm .f-auto{flex:0 0 auto}
  #farm .f-rate{display:block}
  #farm .f-rate .fi{vertical-align:-5px;margin-right:4px}
  /* Wetter */
  #farm .fi.f-wetter-gross{width:96px;height:96px}
  #farm .f-wirkung{display:grid;grid-template-columns:40px minmax(0,1fr) 30px auto;align-items:center;gap:10px;font-size:20px;color:#BCC5FF}
  #farm .f-wirkung>.fi:first-child{width:40px;height:40px}
  #farm .f-wirkung b{font-family:var(--fs-titel);font-weight:400;font-size:22px;color:#fff}
  #farm .f-vorhersage{display:flex;gap:12px;overflow-x:auto;padding:2px 2px 8px;touch-action:pan-x}
  #farm .f-vh{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:2px;width:108px;box-sizing:border-box;padding:10px 6px;border-radius:18px;background:#141A4D;border:3px solid #0A0D26;text-align:center}
  #farm .f-vh .fi{width:56px;height:56px}
  #farm .f-vh b{font-size:19px;line-height:22px}
  #farm .f-vh span{font-size:19px;color:#BCC5FF}
  #farm .f-wetter-alle{display:flex;flex-direction:column;gap:10px}
  #farm .f-wa{display:flex;align-items:center;gap:12px;font-size:19px;line-height:24px}
  #farm .f-wa .fi{width:48px;height:48px;flex:0 0 48px}
  #farm .f-wa b{display:block;font-family:var(--fs-titel);font-weight:400;font-size:22px}
  #farm .f-wa span{color:#BCC5FF}
  /* Sammlung */
  #farm .f-heute-kopf{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:18px;margin:6px 0 10px}
  #farm .f-serie,#farm .f-neu-in{flex-direction:row;align-items:center}
  #farm .fi.f-serie-bild{width:76px;height:76px;flex:0 0 76px}
  #farm .f-serie-zahl{font-family:var(--fs-titel);font-size:30px;line-height:34px}
  #farm .f-neu-in>.fi{width:56px;height:56px}
  #farm .f-neu-in b{display:block;font-family:var(--fs-titel);font-weight:400;font-size:28px;line-height:32px}
  #farm .f-neu-in span{font-size:19px;color:#BCC5FF}
  #farm .f-aufgaben{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
  #farm .f-aufgabe{align-items:center;text-align:center}
  #farm .f-aufgabe .fs-ring-inhalt>.fi,#farm .f-prod .fs-ring-inhalt>.fi{width:46px!important;height:46px!important}
  #farm .f-feld-ring .fs-ring-inhalt>.fi{width:38px;height:38px}
  #farm .f-aufgabe-text{font-size:22px;line-height:27px;font-weight:700;min-height:54px}
  #farm .f-aufgabe>.fs-btn{width:100%}
  #farm .f-fortschritt{display:flex;align-items:center;gap:4px;height:64px;font-family:var(--fs-titel);font-size:26px}
  #farm .f-fortschritt .fi{width:30px;height:30px}
  #farm .fs-marke.f-abgeholt{height:44px;font-size:21px}
  #farm .f-truhe{flex-direction:row;align-items:center;gap:16px;margin-top:22px}
  #farm .fi.f-truhe-bild{width:96px;height:96px;flex:0 0 96px}
  #farm .f-truhe>.fs-btn,#farm .f-truhe>.fs-marke{flex:0 0 auto}
  #farm .f-truhe .f-lohn{display:inline-flex;margin-top:6px}
  #farm .f-schul{display:flex;flex-direction:column;gap:8px}
  #farm .f-schul-z{display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:10px;padding:8px 12px;border-radius:16px;background:#141A4D;border:2px solid #0A0D26;font-size:19px}
  #farm .f-schul-z .fi{width:40px;height:40px}
  #farm .f-schul-z span{color:#BCC5FF}
  #farm .f-erf-kopf{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:20px;background:#141A4D;border:3px solid #0A0D26;margin-top:6px}
  #farm .f-erf-raster{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
  #farm .f-sterne{display:flex;gap:4px;justify-content:center}
  #farm .f-erf-fort{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px}
  #farm .f-erf-fort b{display:flex;align-items:center;gap:2px;font-family:var(--fs-titel);font-weight:400;font-size:20px;white-space:nowrap}
  #farm .f-erf-fort b .fi{width:26px;height:26px}
  #farm .f-erf-fort b.f-gold{color:#FFC531;grid-column:1 / span 2;justify-content:center;font-size:23px}
  #farm .f-naechste{display:flex;align-items:center;justify-content:center;gap:6px;font-size:19px;color:#BCC5FF}
  #farm .f-naechste .f-preis{font-family:var(--fs-titel);font-size:21px;color:#fff}
  #farm .f-naechste .f-preis .fi{width:26px;height:26px}
  #farm .f-seite-kopf{flex-direction:row;align-items:center;margin-top:4px}
  #farm .f-seite-kopf .f-erf-fort{margin-top:6px}
  #farm .f-bonus-zu{display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:16px;background:#141A4D;border:2px solid #0A0D26}
  #farm .f-bonus-zu>.fi{width:44px;height:44px;opacity:.7}
  #farm .f-bonus-zu span{display:block;font-size:19px;color:#BCC5FF}
  #farm .f-bonus-zu b{font-family:var(--fs-titel);font-weight:400;font-size:22px}
  #farm .f-bonus-zu b .fi{width:26px;height:26px;vertical-align:-6px}
  #farm .f-fakt{display:flex;align-items:center;gap:14px;padding:12px 14px;margin:14px 0 4px}
  #farm .f-fakt>.fi,#farm .f-fakt>img{width:84px;height:84px;flex:0 0 84px;object-fit:contain}
  #farm .f-fakt>div{flex:1 1 auto;min-width:0}
  #farm .f-fakt b{display:block;font-family:var(--fs-titel);font-weight:400;font-size:24px}
  #farm .f-fakt span{display:block;font-size:19px;line-height:25px}
  #farm .f-fakt>.fs-btn.fs-rund{flex:0 0 auto;width:64px;height:64px}
  #farm .f-album-tipp{display:flex;align-items:center;gap:8px;font-size:19px;color:#BCC5FF;margin:14px 0 2px}
  #farm .f-album-raster{grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:22px 16px}
  #farm .f-ak .fs-karte-bild img{width:170px;height:92px;object-fit:contain}
  #farm .f-ak-zu .fs-karte-bild img,#farm .f-ak-zu .fs-karte-bild>.fi:not(.fs-schloss){opacity:.14}
  #farm .f-ak .fs-karte-name{font-size:24px;line-height:28px;text-align:center}
  #farm .f-ak-text{font-size:19px;line-height:23px;color:#BCC5FF;text-align:center;padding:0 4px}
  #farm .f-ak.f-ak-an{box-shadow:0 0 0 3px #fff,0 7px 0 3px #0A0D26,0 14px 20px rgba(0,0,0,.35)}
  /* Felder, Hilfe, Chronik, Menue */
  #farm .f-felder{grid-template-columns:repeat(auto-fill,minmax(520px,1fr))}
  #farm .f-feldz{flex-direction:row;align-items:center}
  #farm .f-feldz-marken{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap}
  #farm .f-feldz-marken:empty{display:none}
  #farm .f-feldz-knoepfe{display:flex;gap:10px;flex:0 0 auto}
  #farm .f-hilfe{grid-template-columns:repeat(3,minmax(0,1fr))}
  #farm .f-hilfe-k{flex-direction:row;align-items:center;gap:14px;font-size:21px;line-height:27px;font-weight:700}
  #farm .fi.f-hilfe-bild{width:76px;height:76px;flex:0 0 76px}
  #farm .f-hilfe-los{display:flex;justify-content:center;margin-top:20px}
  #farm .f-hilfe-los>.fs-btn{min-width:320px}
  #farm .f-chronik-liste{display:flex;flex-direction:column;gap:10px}
  #farm .f-chronik-z{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:16px;background:#141A4D;border:2px solid #0A0D26;font-size:19px;line-height:24px}
  #farm .f-chronik-z .fi{width:44px;height:44px;flex:0 0 44px}
  #farm .f-chronik-z b{display:block;color:#FFF07A;font-family:var(--fs-titel);font-weight:400;font-size:21px}
  #farm .f-stat-zeile{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
  /* Handy: Hochformat */
  @media (max-width:820px){
    #farm .f-hud-links{left:8px;top:8px;gap:4px}
    #farm .f-hud-links .fs-geld{height:52px;font-size:28px;padding:0 14px 0 54px}
    #farm .f-hud-links .fs-geld>.fi{width:48px;height:48px;left:3px;top:-1px}
    #farm .f-hud-rechts{right:8px;top:8px;gap:8px}
    #farm .f-hud-rechts .fs-btn.fs-rund{width:58px;height:58px}
    #farm .f-ziel-platz{left:8px;right:8px;top:82px}
    #farm .f-ziel-platz>.fs-ziel{max-width:none}
    #farm .f-chips{left:8px;top:172px;gap:10px}
    #farm .f-chip-schule{display:none!important}
    #farm .f-zoom{right:8px;bottom:120px;gap:10px}
    #farm .f-mit-ort{left:8px;bottom:122px}
    #farm .f-saat{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 14px}
    #farm .f-saat .fs-karte>.fs-marke{top:66px;left:8px}
    #farm .f-saat-fuss>div{font-size:17px;line-height:21px}
    #farm .f-mrow img{width:84px;height:54px}
    #farm .f-mrow .f-m-name{font-size:21px}
    #farm .f-level-titel{font-size:52px;line-height:56px}
    #farm .f-level-fuchs{display:none}
    #farm .f-lvl-k{width:160px}
    #farm .f-level-inhalt{max-height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 0 8px;gap:8px}
    #farm .f-lvl-karten.f-klein{gap:20px 8px}
    #farm .f-lvl-karten.f-klein .f-lvl-k{width:120px;padding:20px 5px 8px}
    #farm .f-lvl-karten.f-klein .f-lvl-k>.fi{width:56px;height:56px}
    #farm .f-lvl-karten.f-klein .f-lvl-k img{width:96px;height:46px;margin:6px auto}
    #farm .f-lvl-karten.f-klein .f-lvl-name{font-size:19px;line-height:21px}
    #farm .f-lvl-karten.f-klein .f-lvl-text{font-size:16px;line-height:19px}
    #farm .f-lvl-k .f-lvl-art{font-size:16px;padding:0 8px}
    #farm .f-lk{height:300px}
    #farm .f-kasten{padding:18px 16px 16px}
    #farm .f-kasten-titel{font-size:30px;line-height:34px}
    #farm .f-kasten-text{font-size:21px;line-height:27px}
    #farm .f-rund-text{font-size:30px;line-height:36px}
    #farm .fs-toasts{bottom:118px;left:6px;right:78px}
    /* Dialoge (Teil 2) auf dem Handy: eine Spalte, Reiter wischbar, Geld oben im HUD statt im Kopf */
    #farm .f-raster,#farm .f-raster.f-r2,#farm .f-raster.f-r3,#farm .f-felder,#farm .f-aufgaben,#farm .f-erf-raster,#farm .f-brett,#farm .f-hilfe,#farm .f-zk-raster{grid-template-columns:minmax(0,1fr)}
    #farm .f-album-raster{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}
    #farm .f-ak .fs-karte-bild img{width:130px;height:72px}
    #farm .f-ak .fs-karte-name{font-size:20px;line-height:24px}
    #farm .f-geldziel{display:none}
    #farm .f-pille-info{display:none}
    #farm .f-reiter{gap:10px}
    #farm .f-reiter>.fs-btn{font-size:19px;padding:4px 14px 8px 8px}
    #farm .f-reiter>.fs-btn>.fi{width:32px;height:32px}
    #farm .f-k{padding:12px}
    #farm .f-k-titel{font-size:23px;line-height:27px}
    #farm .f-k-bild{flex-basis:60px;width:60px;height:60px}
    #farm .f-k-bild>.fi{width:46px;height:46px}
    #farm .f-wert{grid-template-columns:30px 70px minmax(0,1fr) auto;gap:6px}
    #farm .f-lz{grid-template-columns:48px minmax(0,1fr) 156px;grid-template-areas:"bild name knopf" "preis preis mehr" "extra extra extra";gap:6px 10px}
    #farm .fi.f-lz-bild{width:48px;height:48px}
    #farm .f-lz-name b{font-size:22px;line-height:26px}
    #farm .f-lz-name span{font-size:20px}
    #farm .f-lz-mehr.fs-btn.fs-rund{justify-self:end;width:64px;height:64px}
    #farm .f-lz-knopf.fs-btn{padding-left:6px;padding-right:6px}
    #farm .f-heute-kopf{grid-template-columns:minmax(0,1fr);gap:14px}
    #farm .f-truhe,#farm .f-seite-kopf,#farm .f-erf-kopf,#farm .f-feldz{flex-wrap:wrap}
    #farm .f-truhe>.fs-btn,#farm .f-erf-kopf>.fs-btn,#farm .f-seite-kopf>.fs-btn{flex:1 1 100%}
    #farm .fi.f-truhe-bild{width:72px;height:72px;flex-basis:72px}
    #farm .f-feldz-knoepfe{flex:1 1 100%;justify-content:flex-end}
    #farm .f-silo>.f-silo-zeile{flex-basis:100%}
    #farm .f-silo>.f-k-fuss{flex:1 1 100%}
    #farm .fi.f-silo-bild{width:64px;height:64px}
    #farm .f-silo-zahl{font-size:28px;line-height:34px}
    #farm .f-silo-zahl span{font-size:19px}
    #farm .f-hilfe-los>.fs-btn{min-width:0;width:100%}
    #farm .f-ware b{font-size:34px;line-height:38px}
    #farm .f-brett{gap:28px 0;padding:20px 8px 8px}
    #farm .f-wirkung{grid-template-columns:36px minmax(0,1fr) 30px auto}
  }
  @media (max-height:480px){ #farm .f-chips{display:none} }
  @media (max-width:1180px) and (min-width:821px){ #farm .f-mit-ort{bottom:134px} #farm .f-ziel-platz{left:360px;right:170px} }
  `;

  function baueOberflaeche() {
    FS.einbauen();
    wurzel = document.createElement('div');
    wurzel.id = 'farm';
    wurzel.innerHTML = `
      <style>${CSS}</style>
      <canvas id="farm-cv"></canvas>
      <div class="f-hud f-hud-links"><span id="f-lvl" data-a="sammlung" data-id="erfolge"></span><div class="fs-geld" id="f-geld">${I('muenze')}<span class="fs-geld-zahl" id="f-geldzahl">0</span></div></div>
      <div class="f-hud f-chips" id="f-chips">
        <span class="fs-chip" id="f-wetter" data-a="wetter"></span>
        <span class="fs-chip" id="f-tag" data-a="tagTab"></span>
        <span class="fs-chip f-chip-schule" id="f-schule" data-a="tagTab" style="display:none"></span>
      </div>
      <div class="f-hud f-ziel-platz f-weg" id="f-ziel-platz"><div class="fs-ziel" id="f-ziel" data-a="ziel"><div class="fs-ziel-fuchs" id="f-ziel-fuchs"></div>
        <div class="fs-ziel-text"><span class="fs-ziel-label">Nächstes Ziel</span><span class="fs-ziel-satz" id="f-ziel-satz"></span></div>
        <button class="fs-btn fs-gelb" data-a="ziel" aria-label="Los">${I('weiter')}</button></div></div>
      <div class="f-hud f-hud-rechts">
        <button class="fs-btn fs-navy fs-rund" data-a="sammlung" aria-label="Erfolge">${I('pokal')}<span class="fs-badge" id="f-pkt-erf" style="display:none"></span></button>
        <button class="fs-btn fs-navy fs-rund" data-a="menue" aria-label="Menü">${I('menue')}</button>
      </div>
      <div class="f-hud f-zoom"><button class="fs-btn fs-navy fs-rund" data-a="zoom+" aria-label="Näher">${I('plus')}</button><button class="fs-btn fs-navy fs-rund" data-a="zoom-" aria-label="Weiter weg">${I('minus')}</button></div>
      <div class="f-hud f-mit-ort"><span class="fs-chip" id="f-mit" style="display:none"></span></div>
      <div class="fs-dock" id="f-dock">
        <button class="fs-dock-knopf" data-a="shop">${I('haendler')}<span>Händler</span></button>
        <button class="fs-dock-knopf" data-a="lager" id="f-dock-lager">${I('silo')}<span class="fs-lang">Lager &amp; Markt</span><span class="fs-kurz">Lager</span><span class="fs-badge fs-rot" id="f-pkt-lager" style="display:none">!</span></button>
        <button class="fs-dock-knopf" data-a="auftraege">${I('auftrag')}<span>Aufträge</span><span class="fs-badge fs-gruen" id="f-pkt-auf" style="display:none"></span></button>
        <button class="fs-dock-knopf" data-a="tiere" id="f-dock-tiere">${I('tierhof')}<span class="fs-lang">Tierhof</span><span class="fs-kurz">Tiere</span><span class="fs-badge" id="f-pkt-tiere" style="display:none">!</span></button>
        <button class="fs-dock-knopf" data-a="betriebe" id="f-dock-betriebe">${I('betriebe')}<span>Betriebe</span><span class="fs-badge" id="f-pkt-betr" style="display:none"></span></button>
      </div>
      <div class="fs-pille f-offline" id="f-offline" style="padding:6px 18px;font-size:19px;font-weight:700">${I('warnung', 30)} Keine Verbindung zum Hof</div>
      <div class="fs-toasts" id="f-toasts"></div>`;
    document.body.appendChild(wurzel);
    cv = wurzel.querySelector('#farm-cv');
    g = cv.getContext('2d');
    const q = s => wurzel.querySelector(s);
    R = {
      lvl: q('#f-lvl'), geld: q('#f-geld'), geldZahl: q('#f-geldzahl'), chips: q('#f-chips'), wetter: q('#f-wetter'), tag: q('#f-tag'), schule: q('#f-schule'),
      zielPlatz: q('#f-ziel-platz'), ziel: q('#f-ziel'), zielFuchs: q('#f-ziel-fuchs'), zielSatz: q('#f-ziel-satz'), pktErf: q('#f-pkt-erf'),
      mit: q('#f-mit'), dock: q('#f-dock'), dockLager: q('#f-dock-lager'), pktAuf: q('#f-pkt-auf'), pktTiere: q('#f-pkt-tiere'), pktBetr: q('#f-pkt-betr'), pktLager: q('#f-pkt-lager'),
      offline: q('#f-offline'), toasts: q('#f-toasts'), hudLinks: q('.f-hud-links'), hudRechts: q('.f-hud-rechts')
    };
    hudCache = {};
    FS.anwenden(wurzel);
    wurzel.addEventListener('click', klick);
    wurzel.addEventListener('pointerdown', e => { dlgAnfasst = true; letzterTipp = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
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
    try { A.markiere(null); } catch (e) { /* egal */ }
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
    hudCache.lvl = null;
    zoneAktualisieren();
  }

  // ----------------------------------------------------------------------------------------------
  // Sichere Zone fuer Blasen/Schilder (nicht unter HUD, Ziel-Banner, Dock, Panel) + Platz des Ziel-Banners
  // ----------------------------------------------------------------------------------------------
  let zoneLetzte = '';
  function zoneAktualisieren() {
    if (!wurzel || !W) return;
    const handyHoch = istHochHandy();
    const unterkante = el => (el && el.offsetParent !== null) ? el.offsetTop + el.offsetHeight : 0;
    // Ziel-Banner: auf dem Tablet zwischen Geld und Panel einpassen, sonst ausblenden, wenn ein Panel es verdeckt
    const sheet = wurzel.querySelector('#f-dlg .fs-sheet');
    let zielSichtbar = !!(R.zielPlatz && R.zielPlatz.getAttribute('data-hat') === '1');
    if (sheet && zielSichtbar) {
      const mitte = sheet.classList.contains('fs-mitte');
      if (mitte) zielSichtbar = false;
      else if (handyHoch || H <= 480) zielSichtbar = false;   // Handy: Sheet offen -> Platz fuer das Feld oberhalb
      else {
        const frei = sheet.offsetLeft - 16 - (R.hudLinks.offsetLeft + R.hudLinks.offsetWidth + 24);
        zielSichtbar = frei >= 470;
        R.zielPlatz.style.right = zielSichtbar ? (W - sheet.offsetLeft + 16) + 'px' : '';
      }
    } else if (R.zielPlatz) R.zielPlatz.style.right = '';
    if (R.zielPlatz) R.zielPlatz.classList.toggle('f-weg', !zielSichtbar);
    const chipsWeg = !!(sheet && handyHoch && !sheet.classList.contains('fs-mitte'));
    if (R.chips && R.chips.classList.contains('f-weg') !== chipsWeg) R.chips.classList.toggle('f-weg', chipsWeg);
    // Tablet: Panel rechts offen -> Pokal/Menue, Zoom und Dock ausblenden (wie Mockup B); Chips nur, wenn das Panel sie anschneidet
    const seite = !!(sheet && !sheet.classList.contains('fs-mitte') && !handyHoch && H > 480);
    if (wurzel.classList.contains('f-panel-seite') !== seite) wurzel.classList.toggle('f-panel-seite', seite);
    const chipsVerdeckt = !!(seite && R.chips && R.chips.offsetParent !== null && sheet.offsetLeft < R.chips.offsetLeft + R.chips.offsetWidth + 12);
    if (R.chips && R.chips.classList.contains('f-verdeckt') !== chipsVerdeckt) R.chips.classList.toggle('f-verdeckt', chipsVerdeckt);
    let oben = Math.max(unterkante(R.hudLinks), unterkante(R.hudRechts), zielSichtbar ? unterkante(R.zielPlatz) : 0);
    oben = Math.max(oben, unterkante(R.chips));   // Blasen nie unter den Chips (Wetter, Heute, Schule)
    let unten = R.dock ? H - R.dock.offsetTop : 120;
    let rechts = 12;
    if (sheet && !sheet.classList.contains('fs-mitte')) {
      if (handyHoch || H <= 480) unten = Math.max(unten, sheet.offsetHeight);
      else rechts = Math.max(rechts, W - sheet.offsetLeft);
    }
    const z = { oben: Math.round(oben + 8), unten: Math.round(unten + 6), links: 12, rechts: Math.round(rechts + 8) };
    const k = JSON.stringify(z);
    if (k !== zoneLetzte) { zoneLetzte = k; try { A.sichereZone(z); } catch (e) { /* aeltere Ansicht */ } }
    return z;
  }
  // Sichtbarer Weltausschnitt (Bildschirmmitte der freien Flaeche)
  function freieMitte() {
    let z = null;
    try { z = A.sichereZone(); } catch (e) { z = null; }
    if (!z) return { x: W / 2, y: H / 2 };
    return { x: (z.links + W - z.rechts) / 2, y: (z.oben + H - z.unten) / 2 };
  }

  // ----------------------------------------------------------------------------------------------
  // Kamera: Ziehen (mit Nachlauf), Zoomen um die Fingermitte, Antippen
  // ----------------------------------------------------------------------------------------------
  function klemmen() {
    cam.z = Math.max(0.3, Math.min(1.8, cam.z));
    cam.x = Math.max(0, Math.min(D.WELT.b, cam.x));
    cam.y = Math.max(0, Math.min(D.WELT.h, cam.y));
  }
  // Zoom so aendern, dass der Weltpunkt unter (sx,sy) [Bildschirm] dort bleibt
  function zoomUm(faktor, sx, sy) {
    const wx = cam.x + (sx - W / 2) / cam.z, wy = cam.y + (sy - H / 2) / cam.z;
    cam.z = Math.max(0.3, Math.min(1.8, cam.z * faktor));
    cam.x = wx - (sx - W / 2) / cam.z; cam.y = wy - (sy - H / 2) / cam.z;
    klemmen();
  }
  function kamera(el) {
    let start = null, v = { x: 0, y: 0, t: 0 }, pinch = false;
    const lokal = e => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); tonStart();
      try { el.setPointerCapture(e.pointerId); } catch (x) { /* egal */ }
      zeiger[e.pointerId] = lokal(e);
      const n = Object.keys(zeiger).length;
      if (n === 1) { start = { x: e.clientX, y: e.clientY, t: Date.now(), bewegt: false }; pinch = false; }
      else { start = null; pinch = true; }
      v = { x: 0, y: 0, t: Date.now() };
      cam.ziel = null; schwung = null;
    });
    el.addEventListener('pointermove', e => {
      const p = zeiger[e.pointerId];
      if (!p) return;
      const ids = Object.keys(zeiger);
      const neu = lokal(e);
      if (ids.length >= 2) {
        const a = zeiger[ids[0]], b = zeiger[ids[1]];
        const m0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d0 = Math.hypot(a.x - b.x, a.y - b.y);
        p.x = neu.x; p.y = neu.y;
        const m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d1 = Math.hypot(a.x - b.x, a.y - b.y);
        // Weltpunkt unter der alten Fingermitte bleibt unter der neuen Fingermitte
        const wx = cam.x + (m0.x - W / 2) / cam.z, wy = cam.y + (m0.y - H / 2) / cam.z;
        if (d0 > 10) cam.z = Math.max(0.3, Math.min(1.8, cam.z * d1 / d0));
        cam.x = wx - (m1.x - W / 2) / cam.z; cam.y = wy - (m1.y - H / 2) / cam.z;
        klemmen();
        return;
      }
      const dx = neu.x - p.x, dy = neu.y - p.y;
      p.x = neu.x; p.y = neu.y;
      if (start && !start.bewegt && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) start.bewegt = true;
      if (start && start.bewegt) {
        cam.x -= dx / cam.z; cam.y -= dy / cam.z; klemmen();
        const t = Date.now(), dtm = Math.max(1, t - v.t);
        const k = Math.min(1, dtm / 60);
        v = { x: v.x * (1 - k) + (dx / dtm) * k, y: v.y * (1 - k) + (dy / dtm) * k, t };
      }
    });
    const ende = e => {
      if (!zeiger[e.pointerId]) return;
      delete zeiger[e.pointerId];
      const rest = Object.keys(zeiger).length;
      if (start && !start.bewegt && !pinch && Date.now() - start.t < 600 && rest === 0) { const l = lokal(e); antippen(l.x, l.y); }
      else if (start && start.bewegt && !pinch && rest === 0 && Date.now() - v.t < 90) {
        const sp = Math.hypot(v.x, v.y);   // px/ms
        if (sp > 0.25 && !FS.effekteWenig()) schwung = { vx: -v.x * 1000 / cam.z * 0.9, vy: -v.y * 1000 / cam.z * 0.9 };
      }
      if (rest === 0) { start = null; pinch = false; }
      else if (rest === 1) { start = null; }
    };
    el.addEventListener('pointerup', ende); el.addEventListener('pointercancel', ende);
    el.addEventListener('wheel', e => { e.preventDefault(); const l = lokal(e); schwung = null; cam.ziel = null; zoomUm(e.deltaY < 0 ? 1.12 : 1 / 1.12, l.x, l.y); }, { passive: false });
  }
  function nachlauf(dt) {
    if (!schwung) return;
    cam.x += schwung.vx * dt; cam.y += schwung.vy * dt; klemmen();
    const k = Math.exp(-dt * 4.5);
    schwung.vx *= k; schwung.vy *= k;
    if (Math.hypot(schwung.vx, schwung.vy) * cam.z < 20) schwung = null;
  }
  // Tipp in die Welt: zuerst Status-Blasen (A.trefferBei liefert sie zuerst), dann Felder/Gebaeude/Staelle
  function antippen(sx, sy) {
    if (!stand()) return;
    if (gesperrt('welt', 300)) return;
    const wx = cam.x + (sx - W / 2) / cam.z, wy = cam.y + (sy - H / 2) / cam.z;
    const t = A.trefferBei(wx, wy, stand());
    if (dlg && dlg.lern) return;
    if (!t) { if (dlg && dlg.art !== 'mitte') dialogZu(); return; }
    letzterTipp = { x: sx, y: sy, t: Date.now() };
    if (t.typ === 'blase') return blaseAusfuehren(t, sx, sy);
    if (t.art === 'feld') dialogFeld(t.id);
    else if (t.art === 'betrieb') dialogBetriebe(t.id);
    else if (t.art === 'stall') dialogTiere(t.id);
    else if (t.id === 'handel' || t.id === 'silo') dialogLager();
    else if (t.id === 'haendler') dialogShop('traktor');
    else if (t.id === 'halle') dialogFuhrpark();
    else if (t.id === 'haus') dialogMenue();
  }
  // Blase: ernten -> sofort mit bester Erntemaschine; arbeit -> Feldkarte; einsammeln/fuettern -> direkt; oeffnen -> Dialog
  function blaseAusfuehren(t, sx, sy) {
    const z = t.ziel || { art: t.art, id: t.id };
    if (z.art === 'feld') {
      if (t.aktion === 'ernten') { if (!ernteSofort(z.id, { x: sx, y: sy })) dialogFeld(z.id); return; }
      return dialogFeld(z.id);
    }
    if (z.art === 'stall') {
      if (t.aktion === 'einsammeln') return einsammelnMitEffekt(z.id, { x: sx, y: sy });
      if (t.aktion === 'fuettern') return fuetternMitEffekt(z.id, { x: sx, y: sy });
      return dialogTiere(z.id);
    }
    if (z.art === 'betrieb') return dialogBetriebe(z.id);
    if (z.art === 'silo') return dialogLager();
    if (t.aktion === 'abholen') return dialogSammlung();
  }
  function fliegeZu(x, y, z) { schwung = null; cam.ziel = { x, y, z: z || cam.z }; }
  function feldMitte(id) { const f = D.feld(id); return { x: f.x + f.c * D.ZELLE / 2, y: f.y + f.r * D.ZELLE / 2 }; }
  // Feld in die Mitte der FREIEN Flaeche fliegen (neben dem Panel / ueber dem Bottom-Sheet)
  function fliegeZuFeld(id, zWunsch) {
    const m = feldMitte(id);
    const z = Math.max(0.6, Math.min(1.25, zWunsch || cam.z));
    const fm = freieMitte();
    fliegeZu(m.x - (fm.x - W / 2) / z, m.y - (fm.y - H / 2) / z, z);
  }
  function fliegeZuPunkt(x, y, zWunsch) {
    const z = Math.max(0.6, Math.min(1.25, zWunsch || cam.z));
    const fm = freieMitte();
    fliegeZu(x - (fm.x - W / 2) / z, y - (fm.y - H / 2) / z, z);
  }
  function weltZuBildschirm(x, y) { return { x: (x - cam.x) * cam.z + W / 2, y: (y - cam.y) * cam.z + H / 2 }; }
  function gesperrt(key, ms) {
    const t = Date.now();
    if (tippSperre[key] && t - tippSperre[key] < (ms || 300)) return true;
    tippSperre[key] = t;
    return false;
  }

  // ----------------------------------------------------------------------------------------------
  // Rueckmeldungen (Toasts liegen ueber Dialogen: z-index 80). Icon + max. 8 Woerter.
  // typ: 'gut' (gruen) | 'warn' (rot) | 'geld' (gelb) | '' (navy). key: gleiche Meldung ersetzt sich.
  // ----------------------------------------------------------------------------------------------
  const toastTimer = {};
  const TOAST_FARBE = { gut: 'fs-gruen', warn: 'fs-rot', geld: 'fs-gelb' };
  const TOAST_ICON = { gut: 'haken', warn: 'warnung', geld: 'muenze' };
  function toast(text, typ, key, icon) {
    if (!R.toasts || !text) return;
    let el = key ? R.toasts.querySelector('[data-k="' + key + '"]') : null;
    if (!el) {
      el = document.createElement('div');
      if (key) el.setAttribute('data-k', key);
      R.toasts.appendChild(el);
      while (R.toasts.children.length > 3) R.toasts.removeChild(R.toasts.firstChild);
    }
    el.className = 'fs-toast' + (TOAST_FARBE[typ] ? ' ' + TOAST_FARBE[typ] : '');
    el.innerHTML = I(icon || TOAST_ICON[typ] || 'info', 44) + '<span>' + esc(text) + '</span>';
    const id = key || String(Math.random());
    clearTimeout(toastTimer[id]);
    toastTimer[id] = setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); delete toastTimer[id]; }, typ === 'warn' ? 4200 : 3200);
  }

  // ----------------------------------------------------------------------------------------------
  // Belohnungseffekte: Muenzflug in die Geld-Pille (Zaehler zaehlt beim Auftreffen), Icon-Flug (Ernte/Eier ins Lager)
  // ----------------------------------------------------------------------------------------------
  function geldZielEl() {
    const imDialog = wurzel && wurzel.querySelector('#f-dlg .fs-sheet.fs-mitte .f-geldziel');
    return imDialog && imDialog.offsetParent !== null ? imDialog : R.geld;
  }
  function geldEffekt(plus, von) {
    if (!wurzel || !R.geld || plus <= 0) return;
    const zu = geldZielEl();
    const quelle = von || (letzterTipp && Date.now() - letzterTipp.t < 2500 ? { x: letzterTipp.x, y: letzterTipp.y } : { x: W / 2, y: H * 0.55 });
    const n = plus >= 20000 ? 12 : plus >= 5000 ? 10 : plus >= 800 ? 8 : plus >= 150 ? 6 : 5;
    geldUnterwegs += plus;
    let bezahlt = 0, treffN = 0;
    plusZeigen(plus);
    FS.muenzFlug(quelle, zu, n, {
      treffer: (i, k) => { treffN++; const teil = treffN >= k ? plus - bezahlt : Math.min(plus - bezahlt, Math.round(plus / k)); bezahlt += teil; geldUnterwegs = Math.max(0, geldUnterwegs - teil); },
      fertig: () => { geldUnterwegs = Math.max(0, geldUnterwegs - (plus - bezahlt)); bezahlt = plus; }
    });
    piep('geld');
  }
  function plusZeigen(plus) {
    if (!R.geld || FS.effekteWenig()) return;
    const r = R.geld.getBoundingClientRect(), w = wurzel.getBoundingClientRect();
    const t = document.createElement('div'); t.className = 'f-plus fs-kontur';
    t.textContent = '+' + fmt(plus);
    t.style.left = (r.left - w.left + r.width / 2 + 20) + 'px'; t.style.top = (r.bottom - w.top + 4) + 'px';
    wurzel.appendChild(t); setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 1600);
  }
  // Kleiner Flug von Icons (z. B. Koerner vom Feld ins Lager). Nur transform/opacity; bei "Effekte: wenig" aus.
  function iconFlug(icon, von, zuEl, n) {
    if (!wurzel || FS.effekteWenig() || !von || !zuEl || typeof Element === 'undefined' || !Element.prototype.animate) return;
    const r = zuEl.getBoundingClientRect(); if (!r.width) return;
    const zx = r.left + r.width / 2, zy = r.top + r.height / 2;
    n = Math.max(1, Math.min(8, n || 5));
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div'); el.className = 'f-flug'; el.innerHTML = I(icon);
      el.style.left = (von.x - 22) + 'px'; el.style.top = (von.y - 22) + 'px';
      wurzel.appendChild(el);
      const sx = (Math.random() - 0.5) * 70, sy = -30 - Math.random() * 40;
      const dx = zx - von.x, dy = zy - von.y;
      let an = null;
      try {
        an = el.animate([
          { transform: 'translate(0px,0px) scale(.4)', opacity: 0 },
          { transform: 'translate(' + sx.toFixed(0) + 'px,' + sy.toFixed(0) + 'px) scale(1.1)', opacity: 1, offset: 0.25 },
          { transform: 'translate(' + (dx * 0.5 + sx).toFixed(0) + 'px,' + (Math.min(sy, dy) - 80).toFixed(0) + 'px) scale(.95)', opacity: 1, offset: 0.6 },
          { transform: 'translate(' + dx.toFixed(0) + 'px,' + dy.toFixed(0) + 'px) scale(.55)', opacity: 0.9 }
        ], { duration: 820, delay: i * 45, easing: 'ease-in-out', fill: 'forwards' });
      } catch (e) { an = null; }
      const weg = () => { if (el.parentNode) el.parentNode.removeChild(el); };
      if (an) { an.onfinish = weg; an.oncancel = weg; }
      setTimeout(weg, 1400 + i * 45);
    }
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog-Rahmen: Panel rechts (Tablet) / Bottom-Sheet (Handy, ueber farm-stil) / Vollbild-Panel fuer grosse Listen.
  // Aktualisieren ohne Neuaufbau: der neue Inhalt wird mit dem alten verglichen (angleichen) – geaendert werden nur
  // Texte, Attribute (Ring/Balken per style) und Teilbaeume, deren Aufbau sich wirklich geaendert hat.
  // cfg: { art:'rechts'|'breit'|'mitte', ansicht, kopf, vor, inhalt, fuss }
  // ----------------------------------------------------------------------------------------------
  function knotenAngleichen(a, b) {
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName ||
      (a.nodeType === 1 && a.getAttribute('data-key') !== b.getAttribute('data-key'))) { a.parentNode.replaceChild(b, a); return; }
    if (a.nodeType === 3 || a.nodeType === 8) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    if (a.nodeType !== 1) return;
    const ba = b.attributes;
    for (let i = 0; i < ba.length; i++) { const at = ba[i]; if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value); }
    const aa = a.attributes;
    for (let i = aa.length - 1; i >= 0; i--) { const n = aa[i].name; if (!b.hasAttribute(n)) a.removeAttribute(n); }
    kinderAngleichen(a, b);
  }
  function kinderAngleichen(a, b) {
    const ak = Array.prototype.slice.call(a.childNodes), bk = Array.prototype.slice.call(b.childNodes);
    if (ak.length !== bk.length) {
      while (a.firstChild) a.removeChild(a.firstChild);
      bk.forEach(k => a.appendChild(k));
      return;
    }
    for (let i = 0; i < bk.length; i++) knotenAngleichen(ak[i], bk[i]);
  }
  function teilSetzen(el, html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    kinderAngleichen(el, tmp);
  }
  function rahmen(cfg) {
    if (!wurzel) return;
    let d = wurzel.querySelector('#f-dlg');
    const neu = !d;
    if (!d) { d = document.createElement('div'); d.className = 'f-dlg'; d.id = 'f-dlg'; wurzel.appendChild(d); }
    const art = cfg.art || 'rechts';
    const mitSchleier = art === 'mitte';
    let schl = d.querySelector('.fs-schleier');
    if (mitSchleier && !schl) { schl = document.createElement('div'); schl.className = 'fs-schleier'; schl.setAttribute('data-a', 'zu'); d.insertBefore(schl, d.firstChild); }
    else if (!mitSchleier && schl) schl.parentNode.removeChild(schl);
    let sh = d.querySelector('.fs-sheet');
    const klasse = 'fs-sheet' + (art === 'mitte' ? ' fs-mitte' : art === 'breit' ? ' f-breit' : '');
    let ansichtNeu = false;
    if (!sh) {
      sh = document.createElement('div');
      sh.innerHTML = '<div class="fs-panel-kopf"></div><div class="f-vor"></div><div class="fs-sheet-inhalt"></div><div class="fs-sheet-fuss"></div>';
      d.appendChild(sh);
      ansichtNeu = true;
    }
    if (sh.className !== klasse) sh.className = klasse;
    if (sh.getAttribute('data-ansicht') !== (cfg.ansicht || '')) { sh.setAttribute('data-ansicht', cfg.ansicht || ''); ansichtNeu = true; }
    const teile = sh.children;
    teilSetzen(teile[0], cfg.kopf);
    teilSetzen(teile[1], cfg.vor);
    teilSetzen(teile[2], cfg.inhalt);
    teilSetzen(teile[3], cfg.fuss);
    if (ansichtNeu) teile[2].scrollTop = 0;
    if (dlg) dlg.art = art;
    if (!dlg || dlg.typ !== 'feld') { try { A.markiere(null); } catch (e) { /* egal */ } }
    if (neu || ansichtNeu) zoneAktualisieren();
    return sh;
  }
  // Kopf: { icon, stufe, titel, unter, zurueck:[aktion,id,text], info:aktion, extra:html }
  function kopfHtml(o) {
    let h = '';
    if (o.zurueck) h += '<button class="fs-btn fs-navy ' + (o.zurueck[2] ? 'f-klein-btn' : 'fs-rund') + '" data-a="' + o.zurueck[0] + '"' + (o.zurueck[1] !== undefined && o.zurueck[1] !== null ? ' data-id="' + esc(o.zurueck[1]) + '"' : '') + ' aria-label="Zurück">' + I('zurueck') + (o.zurueck[2] ? esc(o.zurueck[2]) : '') + '</button>';
    if (o.icon) h += '<div class="fs-kopf-bild ' + (o.stufe ? 'fs-stufe-' + o.stufe : '') + '">' + I(o.icon) + '</div>';
    h += '<div class="fs-kopf-text"><span class="fs-kopf-titel' + (o.klein ? ' f-titel-klein' : '') + '">' + o.titel + '</span>' + (o.unter ? '<span class="fs-kopf-unter">' + o.unter + '</span>' : '') + '</div>';
    if (o.extra) h += '<div class="f-kopf-extra">' + o.extra + '</div>';
    if (o.info) h += '<button class="fs-btn fs-cyan fs-rund" data-a="' + o.info + '" aria-label="Info">' + I('info') + '</button>';
    h += '<button class="fs-btn fs-rot fs-rund" data-a="zu" aria-label="Schließen">' + I('schliessen') + '</button>';
    return h;
  }
  // "Zurueck zum Feld" fuer Dialoge, die aus der Feldkarte geoeffnet wurden
  let rueckFeld = null;
  function zurueckKnopf() { return dlg && dlg.rueck ? ['zumFeld', null, 'Zum Feld'] : null; }
  const geldPille = () => '<span class="fs-chip f-geldziel">' + I('muenze') + '<b>' + fmt(stand().geld) + '</b></span>';
  function vorschauBild(d) {
    if (!vorschauCache[d.id]) {
      let url = G.vorschau(d, 170, 92);
      // als Blob-URL ablegen: kurze src-Strings, damit das sekuendliche Angleichen der Dialoge keine 30-KB-Texte vergleicht
      try {
        if (url.indexOf('data:image/png;base64,') === 0 && typeof Blob !== 'undefined' && window.URL && URL.createObjectURL) {
          const bin = atob(url.slice(22)), arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          url = URL.createObjectURL(new Blob([arr], { type: 'image/png' }));
        }
      } catch (e) { /* data-URL bleibt */ }
      vorschauCache[d.id] = url;
    }
    return vorschauCache[d.id];
  }
  const gutName = id => D.gut(id).name;
  const sekText = sek => A.zeitText(sek * 1000);
  const einText = r => r.ein.map(z => (z.kg / 1000) + ' t ' + D.gut(z.gut).name).join(' + ');
  const levelWarte = [];
  function dialogZu() {
    const d = wurzel && wurzel.querySelector('#f-dlg');
    if (d) d.parentNode.removeChild(d);
    dlg = null;
    try { A.markiere(null); } catch (e) { /* egal */ }
    zoneAktualisieren();
    levelNaechstes();
  }

  // ----------------------------------------------------------------------------------------------
  // Eigene Rueckfrage (window.confirm geht in den WebViews nicht). opt: { titel, vorher:[icon,text], nachher:[icon,text], neinText }
  // ----------------------------------------------------------------------------------------------
  function bestaetigen(text, ja, jaText, opt) {
    opt = opt || {};
    confZu();
    const d = document.createElement('div');
    d.className = 'f-ueber f-conf'; d.id = 'f-conf';
    const vn = opt.vorher && opt.nachher ? '<div class="f-vn"><div class="f-vn-bild fs-mulde">' + I(opt.vorher[0]) + esc(opt.vorher[1]) + '</div>' + I('weiter', 44) +
      '<div class="f-vn-bild fs-mulde">' + I(opt.nachher[0]) + esc(opt.nachher[1]) + '</div></div>' : '';
    d.innerHTML = '<div class="f-schleier-dunkel" data-a="confNein"></div><div class="fs-panel f-kasten"><div class="f-kasten-kopf">' + FS.fuchs('gruebelt', 96) +
      '<div class="f-kasten-titel fs-kontur">' + esc(opt.titel || 'Bist du sicher?') + '</div></div><p class="f-kasten-text">' + esc(text) + '</p>' + vn +
      '<div class="f-kasten-knoepfe"><button class="fs-btn fs-navy" data-a="confNein">' + esc(opt.neinText || 'Lieber nicht') + '</button><button class="fs-btn fs-rot" data-a="confJa">' + esc(jaText || 'Ja') + '</button></div></div>';
    wurzel.appendChild(d);
    bestaetigenFn = ja;
  }
  function confZu() { const c = wurzel && wurzel.querySelector('#f-conf'); if (c) c.parentNode.removeChild(c); }

  // ----------------------------------------------------------------------------------------------
  // Level-Up (Vollbild): LEVEL UP!, Abzeichen mit Zahl, JEDE Freischaltung als Karte, Bonus-Karte, Fuchs jubelt, "Super!"
  // ----------------------------------------------------------------------------------------------
  let strahlenBild = null;
  function strahlen() {
    if (strahlenBild) return strahlenBild;
    try {
      const c = document.createElement('canvas'); c.width = c.height = 512;
      const x = c.getContext('2d');
      x.translate(256, 256);
      for (let i = 0; i < 18; i++) {
        x.rotate(Math.PI * 2 / 18);
        x.fillStyle = i % 2 ? 'rgba(255,255,255,0.22)' : 'rgba(255,230,140,0.16)';
        x.beginPath(); x.moveTo(0, 0); x.lineTo(-24, -256); x.lineTo(24, -256); x.closePath(); x.fill();
      }
      strahlenBild = c.toDataURL('image/png');
    } catch (e) { strahlenBild = ''; }
    return strahlenBild;
  }
  function freischaltungen(level) {
    const neu = [];
    const S = stand();
    D.FRUECHTE.forEach(x => { if (x.lvl === level) neu.push({ art: 'Neue Frucht', icon: x.id, name: x.name, text: x.ernte === 'wurzel' ? 'Braucht einen Roder' : 'Reif nach ' + grob(x.dauer * 1000 / M.tempoFaktor()), stufe: FS.stufe(x.id) }); });
    D.TRAKTOREN.concat(D.GERAETE, D.ERNTER).forEach(x => { if (x.lvl === level) neu.push({ art: x.art === 'traktor' ? 'Neuer Traktor' : x.art === 'ernter' ? 'Neue Erntemaschine' : 'Neues Gerät', bild: x.art === 'geraet' ? '' : vorschauBild(x), icon: maschinenIcon(x), name: x.name, text: x.art === 'traktor' ? x.ps + ' PS' : x.art === 'ernter' ? (x.typ === 'rodemaschine' ? 'Roder' : 'Mähdrescher') : GERAET_NAME[x.typ], stufe: 'blau' }); });
    D.FELDER.forEach(x => { if (x.lvl === level) neu.push({ art: 'Neues Feld', icon: 'felder', name: x.name, text: fmt1(x.ha) + ' ha zu kaufen', stufe: 'gruen' }); });
    D.PRODUKTION.forEach(x => { if (x.lvl === level) { const r = x.rezepte[0]; neu.push({ art: 'Neuer Betrieb', icon: x.id, name: x.name, text: D.gut(r.ein[0].gut).name + ' wird ' + D.gut(r.aus).name, stufe: 'lila' }); } });
    D.TIERE.forEach(x => { if (x.lvl === level) neu.push({ art: 'Neuer Stall', icon: x.id, name: x.stall, text: x.name + ' liefern ' + D.gut(x.gut).name, stufe: 'lila' }); });
    D.FAHRER.forEach((x, i) => { if (x.lvl === level) neu.push({ art: 'Fahrer', icon: 'fahrer', name: 'Fahrer Nr. ' + (i + 1), text: 'Hilft auf einem Feld', stufe: 'gruen' }); });
    D.WETTERSTATION.forEach(x => { if (x.lvl === level) neu.push({ art: 'Wetter', icon: 'wetterstation', name: x.name, text: 'Zeigt ' + x.slots + ' Std voraus', stufe: 'blau' }); });
    if (level === D.BEREGNUNG_LVL) neu.push({ art: 'Für Felder', icon: 'beregnung', name: 'Beregnung', text: 'Hilft bei Hitze', stufe: 'blau' });
    return S ? neu : neu;
  }
  let levelOffen = null;
  function levelZeigen(level, bonus) {
    if (!wurzel) return;
    if (levelOffen || (dlg && dlg.lern && !dlg.lern.ergebnis)) { levelWarte.push({ level, bonus }); return; }
    const S = stand();
    geldHalten = true;
    const neu = freischaltungen(level);
    const karte = (k, i) => '<div class="f-lvl-k fs-stufe-' + k.stufe + '" style="animation-delay:' + (0.25 + i * 0.12).toFixed(2) + 's"><span class="f-lvl-art">' + esc(k.art) + '</span>' +
      (k.bild ? '<img src="' + k.bild + '" alt="">' : I(k.icon)) + '<span class="f-lvl-name">' + esc(k.name) + '</span><span class="f-lvl-text">' + esc(k.text) + '</span></div>';
    const alle = [{ art: 'Bonus', icon: 'muenze', name: fmt(bonus), text: 'Münzen', stufe: 'gold' }].concat(neu);
    const d = document.createElement('div');
    d.className = 'f-ueber f-level'; d.id = 'f-level';
    const sb = strahlen();
    d.innerHTML = (sb && !FS.effekteWenig() ? '<div class="f-strahlen"><img src="' + sb + '" alt=""></div>' : '') +
      '<div class="f-level-inhalt"><div class="f-level-titel fs-kontur-dick">LEVEL UP!</div>' +
      '<div class="f-level-stern">' + FS.levelAbzeichen(level, 0, istHandy() ? 150 : 190) + '<div class="f-level-fuchs">' + FS.fuchs('jubelt', 150) + '</div></div>' +
      '<div class="f-lvl-karten' + (alle.length > 4 ? ' f-klein' : '') + '">' + alle.map(karte).join('') + '</div>' +
      '<button class="fs-btn fs-gelb fs-gross" data-a="levelZu" style="min-width:300px">Super!</button></div>';
    wurzel.appendChild(d);
    levelOffen = { level, bonus, el: d };
    wurzel.classList.add('f-level-offen');
    FS.konfetti(12);
    piep('level');
    void S;
  }
  function levelZu() {
    if (!levelOffen) return;
    const bonusEl = levelOffen.el.querySelector('.f-lvl-k');
    const von = bonusEl ? (() => { const r = bonusEl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })() : null;
    levelOffen.el.parentNode.removeChild(levelOffen.el);
    levelOffen = null;
    wurzel.classList.remove('f-level-offen');
    geldHalten = false;
    geldNachholen(von);
    hudCache.lvl = null;
    levelNaechstes();
  }
  function levelNaechstes() {
    if (levelOffen || !levelWarte.length || (dlg && dlg.lern && !dlg.lern.ergebnis)) return;
    const n = levelWarte.shift();
    levelZeigen(n.level, n.bonus);
  }

  // ----------------------------------------------------------------------------------------------
  // "Was ist neu" – einmaliger Kurzrundgang mit Fritz (3 Karten, je max. 8 Woerter), gemerkt in FarmStil.ui()
  // ----------------------------------------------------------------------------------------------
  const RUNDGANG = [
    { pose: 'jubelt', text: 'Hallo, ich bin Fritz! Ich helfe dir.' },
    { pose: 'zeigt', text: 'Oben steht immer dein nächstes Ziel.' },
    { pose: 'neutral', text: 'Tipp auf Blasen und Felder. Gelb = los!' }
  ];
  const RUNDGANG_KEY = 'hof2';
  let rundgangSchritt = -1;
  function rundgangNoetig() {
    try { const u = FS.ui(); return !(u.neuGesehen && u.neuGesehen[RUNDGANG_KEY]); } catch (e) { return false; }
  }
  function rundgangZeigen(i) {
    if (!wurzel) return;
    rundgangSchritt = i;
    let d = wurzel.querySelector('#f-rund');
    if (i >= RUNDGANG.length) {
      if (d) d.parentNode.removeChild(d);
      rundgangSchritt = -1;
      try { const u = FS.ui(); const ng = Object.assign({}, u.neuGesehen || {}); ng[RUNDGANG_KEY] = Date.now(); FS.uiSetzen({ neuGesehen: ng }); } catch (e) { /* egal */ }
      return;
    }
    if (!d) { d = document.createElement('div'); d.className = 'f-ueber f-rund'; d.id = 'f-rund'; wurzel.appendChild(d); }
    const k = RUNDGANG[i], letzte = i === RUNDGANG.length - 1;
    d.innerHTML = '<div class="f-schleier-dunkel"></div><div class="fs-panel f-kasten" data-key="r' + i + '" style="text-align:center">' + FS.fuchs(k.pose, istHandy() ? 130 : 170) +
      '<div class="f-rund-text fs-kontur">' + esc(k.text) + '</div><div class="f-rund-punkte">' + RUNDGANG.map((x, j) => '<i class="' + (j === i ? 'an' : '') + '"></i>').join('') + '</div>' +
      '<button class="fs-btn fs-gelb fs-gross fs-breit" data-a="rundWeiter">' + (letzte ? 'Los geht\'s!' : 'Weiter') + '</button></div>';
  }

  // ----------------------------------------------------------------------------------------------
  // Maschinen-Wahl (Logik). Standard = Wahl des Modells (M.optionen: nach Arbeitsdauer sortiert, je Geraet der
  // schwaechste passende Traktor – so bleiben starke Traktoren fuer schwere Geraete frei). "Maschine aendern"
  // ueberschreibt sie fuer diesen Feld-Dialog (dlg.manuell[schritt]).
  // Dauer wie im Modell (starteIntern): arbeitsSek x Verschleiss(Traktor) x Verschleiss(Geraet) x Wetter / Tempo / Zugreserve.
  // Verschleiss/Zugreserve exportiert das Modell nicht – dieselbe Formel hier NUR fuer die Anzeige (Test vergleicht mit o.sek).
  // ----------------------------------------------------------------------------------------------
  const verschleiss = m => m.zustand >= 50 ? 1 : 1 + (50 - m.zustand) / 50 * 0.6;
  const zugreserve = (td, gd) => gd ? 1 + Math.min(0.30, Math.max(0, td.ps / gd.ps - 1) * 0.15) : 1;
  function dauerSek(feldId, schritt, geraetUid, traktorUid) {
    const gm = geraetUid ? M.maschine(geraetUid) : null, tm = M.maschine(traktorUid);
    if (!tm) return 0;
    const gd = gm ? D.def(gm.id) : null, td = D.def(tm.id);
    return M.arbeitsSek(schritt, feldId, gd, gd ? null : td) * verschleiss(tm) * (gm ? verschleiss(gm) : 1) / zugreserve(td, gd);
  }
  function ernterTypFuer(feldId, frucht) {
    const f = stand().felder[feldId], fr = D.frucht(frucht || (f && f.frucht));
    return fr && fr.ernte === 'wurzel' ? 'rodemaschine' : 'maehdrescher';
  }
  function besteWahl(feldId, schritt, frucht) {
    const opts = M.optionen(feldId, schritt, frucht).filter(o => o.traktor);
    const man = dlg && dlg.typ === 'feld' && dlg.id === feldId && dlg.manuell ? dlg.manuell[schritt] : null;
    if (man) {
      const o = opts.find(x => (x.geraet || 0) === (man.geraet || 0));
      if (o && (o.traktoren || [o.traktor]).indexOf(man.traktor) >= 0) return { geraet: man.geraet || null, traktor: man.traktor, manuell: true };
    }
    if (!opts.length) return null;
    return { geraet: opts[0].geraet || null, traktor: opts[0].traktor, manuell: false };
  }
  // Kann der Schritt jetzt starten? { ok, grund, loesung:'geraet'|'ernter'|'fuhrpark'|null, wahl, kosten, ms }
  function schrittStatus(feldId, schritt, frucht) {
    const S = stand(), now = jetzt(), st = D.SCHRITTE[schritt];
    const kosten = schritt === 'saeen' ? (frucht ? M.kostenFuer(feldId, 'saeen', frucht) : 0) : M.kostenFuer(feldId, schritt);
    const res = { schritt, ok: false, grund: '', loesung: null, wahl: null, kosten, ms: 0 };
    const erl = M.schrittErlaubt(feldId, schritt, now);
    if (!erl.ok) { res.grund = erl.grund; return res; }
    const wahl = besteWahl(feldId, schritt, frucht);
    if (!wahl) {
      const typ = st.geraet || ernterTypFuer(feldId, frucht);
      const name = st.geraet ? GERAET_NAME[st.geraet] : (typ === 'rodemaschine' ? 'Roder' : 'Mähdrescher');
      const eigene = S.flotte.filter(m => D.def(m.id).typ === typ);
      const alle = M.optionen(feldId, schritt, frucht);
      res.typ = typ;
      if (!eigene.length) { res.grund = 'Dir fehlt ein ' + name; res.loesung = st.geraet ? 'geraet' : 'ernter'; }
      else if (alle.length && alle[0].grund) res.grund = alle[0].grund;
      else if (eigene.every(m => !m.job && m.zustand < 15)) { res.grund = name + ' ist kaputt – reparieren!'; res.loesung = 'fuhrpark'; }
      else res.grund = name + ' arbeitet gerade';
      return res;
    }
    res.wahl = wahl;
    res.ms = dauerSek(feldId, schritt, wahl.geraet, wahl.traktor) * M.wetter(now).arbeit / M.tempoFaktor() * 1000;
    if (S.geld < kosten) { res.grund = 'Dir fehlen ' + fmt(kosten - S.geld) + ' Münzen'; return res; }
    res.ok = true;
    return res;
  }
  function wahlName(w) {
    if (!w) return '';
    const tm = M.maschine(w.traktor);
    return tm ? D.def(tm.id).name : '';
  }
  function starteSchritt(feldId, schritt, frucht) {
    const st = schrittStatus(feldId, schritt, frucht);
    if (!st.ok) { toast(st.grund, 'warn', 'erg'); piep('fehler'); return false; }
    const o = { geraet: st.wahl.geraet || null, traktor: st.wahl.traktor };
    if (frucht) o.frucht = frucht;
    const r = M.arbeitStarten(feldId, schritt, o, jetzt());
    if (!r || !r.ok) { toast((r && r.grund) || 'Das geht gerade nicht.', 'warn', 'erg'); piep('fehler'); return false; }
    toast((schritt === 'saeen' && frucht ? D.frucht(frucht).name + ' wird gesät!' : SCHRITT_KURZ[schritt] + ' startet!'), 'gut', 'erg', schritt === 'saeen' && frucht ? frucht : schritt);
    piep('fertig');
    speichern();
    if (dlg && dlg.typ === 'feld' && dlg.id === feldId) { dlg.sub = null; dlg.fokus = null; dlg.info = false; zeichneFeldDialog(); }
    return true;
  }
  // Sichel-Blase: Ernte sofort mit bester Erntemaschine. false = geht nicht (dann Feldkarte mit Loesung)
  function ernteSofort(feldId, von) {
    const f = stand().felder[feldId];
    if (!f || f.phase !== 'reif' || M.jobAufFeld(feldId)) return false;
    const st = schrittStatus(feldId, 'ernten');
    if (!st.ok) return false;
    const r = M.arbeitStarten(feldId, 'ernten', { geraet: null, traktor: st.wahl.traktor }, jetzt());
    if (!r || !r.ok) return false;
    toast('Ernte startet!', 'gut', 'erg', 'ernten');
    piep('fertig');
    iconFlug(f.frucht || 'weizen', von, R.dockLager, 6);
    speichern();
    if (dlg && dlg.typ === 'feld' && dlg.id === feldId) zeichneFeldDialog();
    return true;
  }
  function einsammelnMitEffekt(tierId, von) {
    const r = M.einsammeln(tierId);
    if (!r || !r.ok) { toast((r && r.grund) || 'Noch nichts zum Einsammeln.', 'warn', 'erg'); piep('fehler'); return; }
    toast(menge(r.kg) + ' ' + D.gut(r.gut).name + (r.ueber > 1 ? ' – Silo voll, Rest verkauft' : ' im Lager!'), 'gut', 'erg', r.gut);
    piep('geld');
    iconFlug(r.gut, von, R.dockLager, 6);
    speichern();
    if (dlg && dlg.typ === 'tiere') zeichneTiere();
  }
  function fuetternMitEffekt(tierId, von) {
    const ss = M.stallStand(tierId, jetzt());
    if (!ss || !ss.futterSilo) { toast('Kein Futter im Silo', 'warn', 'erg', 'futter'); dialogTiere(tierId); return; }
    const r = M.fuettern(tierId);
    if (!r || !r.ok) { toast((r && r.grund) || 'Das geht gerade nicht.', 'warn', 'erg'); piep('fehler'); return; }
    toast(menge(r.kg) + ' Futter eingefüllt', 'gut', 'erg', 'futter');
    piep('fertig');
    if (R.dockLager && von) { const q = R.dockLager.getBoundingClientRect(); const ziel = { getBoundingClientRect: () => ({ left: von.x - 1, top: von.y - 1, width: 2, height: 2 }) }; iconFlug('futter', { x: q.left + q.width / 2, y: q.top + q.height / 2 }, ziel, 4); }
    speichern();
    if (dlg && dlg.typ === 'tiere') zeichneTiere();
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Feld (Feldkarte, Saatwahl, Maschinenwahl, Lernrunde, laufende Arbeit, Feld kaufen)
  // ----------------------------------------------------------------------------------------------
  function dialogFeld(id, sub) {
    const gleich = dlg && dlg.typ === 'feld' && dlg.id === id;
    if (!gleich) dlg = { typ: 'feld', id, sub: null, wahl: {}, manuell: {}, fokus: null, info: false, mehr: false, alleFr: false, lern: null };
    if (sub !== undefined) { dlg.sub = sub || null; dlg.fokus = null; }
    zeichneFeldDialog();
    if (!gleich) {
      // Feld in die freie Flaeche holen, wenn es unter dem Panel/Sheet liegt
      const m = feldMitte(id), s = weltZuBildschirm(m.x, m.y);
      let z = null; try { z = A.sichereZone(); } catch (e) { z = null; }
      if (z && (s.x < z.links + 40 || s.x > W - z.rechts - 40 || s.y < z.oben + 30 || s.y > H - z.unten - 30)) fliegeZuFeld(id);
    }
  }
  function phasenText(f) {
    const fn = f.frucht && D.frucht(f.frucht) ? D.frucht(f.frucht).name : '';
    if (f.phase === 'stoppel') return 'Stoppelfeld';
    if (f.phase === 'bearbeitet') return 'Gegrubbert';
    if (f.phase === 'gepfluegt') return 'Gepflügt';
    if (f.phase === 'waechst') return fn + ' wächst';
    return fn + ' ist reif';
  }
  function zeichneFeldDialog() {
    if (!dlg || dlg.typ !== 'feld') return;
    const S = stand(), id = dlg.id, f = S.felder[id];
    try { A.markiere({ art: 'feld', id }); } catch (e) { /* egal */ }
    if (!f) return zeichneFeldKauf();
    if (dlg.lern) return zeichneLernrunde();
    const job = M.jobAufFeld(id);
    if (job) { dlg.sub = null; dlg.fokus = null; return zeichneJob(job); }
    if (dlg.sub && dlg.sub.schritt === 'saeen' && !dlg.sub.frucht && !dlg.sub.wahl) return zeichneSaatwahl();
    if (dlg.sub) return zeichneMaschinenwahl();
    return zeichneFeldkarte();
  }
  function feldKopf(f, unter, extra) {
    const d = D.feld(dlg.id);
    return kopfHtml({ icon: feldIcon(f), stufe: f && f.frucht && (f.phase === 'waechst' || f.phase === 'reif') ? FS.stufe(f.frucht) : 'blau', titel: esc(d.name), unter: unter || (phasenText(f) + ' · ' + fmt1(d.ha) + ' ha'), extra });
  }
  // "Dein Weg zur Ernte": Boden › Saeen › Wachsen › Ernten, aktueller Schritt gelb
  const PFEIL = '<svg class="fs-weg-pfeil" viewBox="0 0 14 28" aria-hidden="true"><path d="M3 4 L11 14 L3 24" stroke="#3A47B0" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function wegHtml(f, job) {
    const boden = f.phase === 'gepfluegt' || (job && job.schritt === 'pfluegen') ? 'pfluegen' : 'grubbern';
    const schritte = [[boden, SCHRITT_KURZ[boden]], ['saeen', 'Säen'], ['spross', 'Wachsen'], ['ernten', 'Ernten']];
    let jetztI = { stoppel: 0, bearbeitet: 1, gepfluegt: 1, waechst: 2, reif: 3 }[f.phase];
    if (job) { const j = { grubbern: 0, pfluegen: 0, saeen: 1, ernten: 3 }[job.schritt]; if (j !== undefined) jetztI = j; }
    return '<div class="fs-abschnitt f-abschnitt-weg">Dein Weg zur Ernte</div><div class="fs-weg">' + schritte.map((s, i) =>
      '<div class="fs-weg-schritt' + (i === jetztI ? ' fs-jetzt' : i < jetztI ? ' fs-erledigt' : '') + '">' + I(s[0]) + s[1] + (i < jetztI ? I('haken', 0, 'f-weg-haken') : '') + '</div>'
    ).join(PFEIL) + '</div>';
  }
  function ertragWert(id, f) {
    const kg = M.ertragsSchaetzungKg(id);
    return { kg, wert: kg / 1000 * M.grundPreis(f.frucht) };
  }
  function ringZeile(id, f, now) {
    const gr = istHandy() ? 112 : 128;
    const ew = ertragWert(id, f);
    if (f.phase === 'reif') {
      return '<div class="f-ringzeile">' + FS.ring(1, gr, { icon: 'reif', text: 'Reif!', farbe: 'gelb' }) + '<div class="f-stats">' +
        '<div class="fs-stat">' + I(f.frucht) + '<span class="fs-stat-zahl">' + tonnen(ew.kg) + '</span><span class="fs-stat-text">Ernte</span></div>' +
        '<div class="fs-stat">' + I('muenze') + '<span class="fs-stat-zahl">' + fmt(ew.wert) + '</span><span class="fs-stat-text">Wert</span></div></div></div>';
    }
    const w = M.fortschrittWachstum(f, now);
    return '<div class="f-ringzeile">' + FS.ring(w, gr, { icon: 'spross', text: Math.floor(w * 100) + ' %', klasse: 'f-live-ring' }) + '<div class="f-stats">' +
      '<div class="fs-stat">' + I('uhr') + '<span class="fs-stat-zahl" data-live="rest">' + grob(M.restWachsen(id, now)) + '</span><span class="fs-stat-text">bis reif</span></div>' +
      '<div class="fs-stat">' + I(f.frucht) + '<span class="fs-stat-zahl">' + tonnen(ew.kg) + '</span><span class="fs-stat-text">Ernte</span></div>' +
      '<div class="fs-stat">' + I('muenze') + '<span class="fs-stat-zahl">' + fmt(ew.wert) + '</span><span class="fs-stat-text">Wert</span></div></div></div>';
  }
  function lernMoeglich(f, now) {
    if (f.phase !== 'waechst' || typeof FarmLernen === 'undefined' || !FarmLernen.verfuegbar()) return { da: false };
    const uebrig = M.lernRundenUebrig(now);
    if (f.lern) return { da: true, ok: false, grund: 'Hier schon gelernt – nächste Saat wieder' };
    if (uebrig <= 0) return { da: true, ok: false, grund: 'Heute ' + D.LERN_MAX_TAG + ' Runden geschafft – morgen wieder!' };
    return { da: true, ok: true, uebrig };
  }
  // Was ist die EINE Hauptaktion?
  function hauptBestimmen(id, f, now) {
    if (dlg.fokus === 'beregnung') return { art: 'beregnung' };
    if (dlg.fokus && D.SCHRITTE[dlg.fokus]) return { art: dlg.fokus === 'saeen' ? 'saat' : 'schritt', schritt: dlg.fokus, fokus: true };
    if (f.phase === 'stoppel') return { art: 'schritt', schritt: 'grubbern' };
    if (f.phase === 'bearbeitet' || f.phase === 'gepfluegt') return { art: 'saat', schritt: 'saeen' };
    if (f.phase === 'reif') return { art: 'schritt', schritt: 'ernten' };
    const lm = lernMoeglich(f, now);
    if (lm.ok) return { art: 'lern' };
    // Ohne Lernrunde (Papa-Handy ohne FarmLernen, oder heute schon gelernt): Bonus-Schritt nur, wenn er sofort starten kann
    const bonus = ['duengen', 'spritzen', 'walzen'].find(s => M.schrittErlaubt(id, s, now).ok && schrittStatus(id, s).ok);
    if (bonus) return { art: 'schritt', schritt: bonus };
    return { art: 'wachsen' };
  }
  function infoKnopf(aktion) { return '<button class="fs-btn fs-cyan fs-rund" data-a="' + aktion + '" aria-label="Warum?">' + I('info') + '</button>'; }
  function zurueckKlein(aktion) { return '<button class="fs-btn fs-navy fs-rund" data-a="' + aktion + '" aria-label="Zurück">' + I('zurueck') + '</button>'; }
  function warumBox(text) { return dlg.info ? '<div class="fs-mulde f-warum-box">' + esc(text) + '</div>' : ''; }
  function knopfZeile(st) {
    const teile = [];
    if (st.ms) teile.push(grob(st.ms));
    if (st.wahl) teile.push(esc(wahlName(st.wahl)));
    if (st.kosten) teile.push('<span class="f-preis">' + I('muenze') + fmt(st.kosten) + '</span>');
    return teile.join(' · ');
  }
  function hauptHtml(h, id, f, now) {
    const S = stand();
    if (h.art === 'lern') {
      const lm = lernMoeglich(f, now);
      const rest = M.restWachsen(id, now), w = M.fortschrittWachstum(f, now);
      const maxMs = w < 1 ? rest * Math.min(1 - w, D.LERN_PRO_KARTE * D.LERN_KARTEN) / (1 - w) : 0;
      return '<div class="fs-aktion" data-live="haupt"><div class="f-aktion-kopf">' + I('lernen') + '<div class="f-aktion-tx"><div class="fs-aktion-titel">Schneller reif!</div><div class="fs-aktion-text">' + D.LERN_KARTEN + ' Karten · ' + grob(maxMs) + ' schneller</div></div>' + infoKnopf('feldInfo') + '</div>' +
        '<div class="f-merk-zeile"><span class="fs-merk">heute noch ' + lm.uebrig + ' Runde' + (lm.uebrig === 1 ? '' : 'n') + '</span></div>' +
        '<button class="fs-btn fs-gelb fs-gross fs-breit" data-a="lernStart">' + I('lernen', 40) + 'Lernrunde starten</button>' +
        warumBox('Du bekommst ' + D.LERN_KARTEN + ' Karten, die du am meisten üben solltest. Jede Karte, die du wirklich weißt, lässt die Saat schneller reif werden. Sei ehrlich: Nur „Gewusst“, wenn du es gewusst hast!') + '</div>';
    }
    if (h.art === 'wachsen') {
      return '<div class="f-fuchs-zeile">' + FS.fuchs('neutral', 72) + '<div>Wächst von allein. Schau bald wieder!</div></div>';
    }
    if (h.art === 'beregnung') {
      const preis = D.feld(id).ha * D.BEREGNUNG_PREIS_HA, kann = S.geld >= preis;
      return '<div class="fs-aktion fs-gruen" data-live="haupt"><div class="f-aktion-kopf">' + I('beregnung') + '<div class="f-aktion-tx"><div class="fs-aktion-titel">Beregnung</div><div class="fs-aktion-text">Bei Hitze wächst alles normal weiter</div></div>' + zurueckKlein('fokusWeg') + '</div>' +
        '<button class="fs-btn fs-gelb fs-gross fs-breit fs-spalte' + (kann ? '' : ' fs-aus') + '" data-a="beregnung"' + (kann ? '' : ' data-grund="Dir fehlen ' + fmt(preis - S.geld) + ' Münzen"') + '><span>Einbauen</span><span class="fs-btn-zeile"><span class="f-preis">' + I('muenze') + fmt(preis) + '</span></span></button></div>';
    }
    const s = h.schritt;
    const titel = SCHRITT_KURZ[s];
    const kopfH = '<div class="f-aktion-kopf">' + I(s) + '<div class="f-aktion-tx"><div class="fs-aktion-titel">' + titel + '</div><div class="fs-aktion-text">' + SCHRITT_SATZ[s] + '</div></div>' + (h.fokus ? zurueckKlein('fokusWeg') : '') + infoKnopf('feldInfo') + '</div>';
    let knopf;
    if (h.art === 'saat') {
      const st = schrittStatus(id, 'saeen');
      if (st.wahl || (!st.loesung && st.grund && st.grund.indexOf('fehlen') >= 0)) knopf = '<button class="fs-btn fs-gelb fs-gross fs-breit fs-spalte" data-a="saatwahl"><span>Frucht auswählen</span><span class="fs-btn-zeile">' + esc(wahlName(st.wahl)) + ' ist bereit</span></button>';
      else if (st.loesung) knopf = '<button class="fs-btn fs-gelb fs-gross fs-breit fs-spalte" data-a="zumHaendler" data-id="' + st.loesung + ':' + st.typ + '"><span>Zum Händler</span><span class="fs-btn-zeile">' + esc(st.grund) + '</span></button>';
      else knopf = '<button class="fs-btn fs-gelb fs-gross fs-breit fs-spalte fs-aus" data-a="saatwahl" data-grund="' + esc(st.grund) + '"><span>Frucht auswählen</span><span class="fs-btn-zeile">' + esc(st.grund) + '</span></button>';
    } else {
      const st = schrittStatus(id, s);
      const gefahr = s === 'pfluegen' && (f.phase === 'waechst' || f.phase === 'reif');
      if (st.ok) knopf = '<button class="fs-btn fs-gelb fs-gross fs-breit fs-spalte" data-a="' + (gefahr ? 'gefahr' : 'starte') + '" data-id="' + s + '"><span>' + titel + ' starten</span><span class="fs-btn-zeile">' + knopfZeile(st) + '</span></button>';
      else if (st.loesung === 'fuhrpark') knopf = '<button class="fs-btn fs-gelb fs-gross fs-breit fs-spalte" data-a="fuhrpark"><span>Zur Werkstatt</span><span class="fs-btn-zeile">' + esc(st.grund) + '</span></button>';
      else if (st.loesung) knopf = '<button class="fs-btn fs-gelb fs-gross fs-breit fs-spalte" data-a="zumHaendler" data-id="' + st.loesung + ':' + st.typ + '"><span>Zum Händler</span><span class="fs-btn-zeile">' + esc(st.grund) + '</span></button>';
      else knopf = '<button class="fs-btn fs-gelb fs-gross fs-breit fs-spalte fs-aus" data-a="starte" data-id="' + s + '" data-grund="' + esc(st.grund) + '"><span>' + titel + ' starten</span><span class="fs-btn-zeile">' + esc(st.grund) + '</span></button>';
    }
    return '<div class="fs-aktion fs-gruen" data-live="haupt">' + kopfH + knopf + warumBox(D.SCHRITT_WARUM[s]) + '</div>';
  }
  // Mehr-Ertrag eines Bonus-Schritts in Muenzen (nur Anzeige; Formel wie ertragsFaktor: Boni addieren sich)
  function bonusWert(id, f, s) {
    const st = D.SCHRITTE[s];
    if (!st.bonus || !f.frucht || (f.phase !== 'waechst' && f.phase !== 'reif')) return 0;
    const summe = D.BONUS.pf * f.bonus.pf + D.BONUS.dg * f.bonus.dg + D.BONUS.sp * f.bonus.sp + D.BONUS.wa * f.bonus.wa;
    return ertragWert(id, f).wert * D.BONUS[st.bonus] / (1 + summe);
  }
  function kachelnHtml(id, f, h, now) {
    const S = stand();
    const liste = M.moeglicheSchritte(id, now).filter(x => x.schritt !== h.schritt && x.schritt !== 'saeen' && x.schritt !== 'ernten');
    let k = '';
    liste.forEach(x => {
      const s = x.schritt, gefahr = s === 'pfluegen' && (f.phase === 'waechst' || f.phase === 'reif');
      const grund = x.erlaubt.ok ? '' : x.erlaubt.grund;
      const erledigt = /^Schon /.test(grund);
      let ecke = '', badge = '', aus = false, g = '';
      if (erledigt) ecke = I('haken', 0, 'fs-ecke');
      else if (!x.erlaubt.ok) { ecke = I('schloss', 0, 'fs-ecke'); aus = true; g = grund; }
      else if (gefahr) ecke = I('gefahr', 0, 'fs-ecke');
      else {
        const st = schrittStatus(id, s);
        if (!st.ok) { ecke = I('schloss', 0, 'fs-ecke'); aus = true; g = st.grund; }
        const bw = bonusWert(id, f, s);
        if (!aus && bw >= 1) badge = '<span class="fs-badge fs-gruen">+' + fmt(bw) + '</span>';
        else if (!aus && (s === 'duengen' || s === 'spritzen' || s === 'walzen' || s === 'pfluegen')) badge = '<span class="fs-badge fs-gruen">' + I('ertrag') + '</span>';
      }
      k += '<button class="fs-kachel' + (aus ? ' fs-aus' : '') + '" data-a="' + (gefahr ? 'gefahr' : erledigt ? 'erledigt' : 'kachel') + '" data-id="' + s + '"' + (aus ? ' data-grund="' + esc(g) + '"' : erledigt ? ' data-grund="' + esc(grund) + '"' : '') + '>' + I(s) + SCHRITT_KURZ[s] + ecke + badge + '</button>';
    });
    const lm = lernMoeglich(f, now);
    if (lm.da && !lm.ok) k += '<button class="fs-kachel fs-aus" data-a="kachel" data-id="lern" data-grund="' + esc(lm.grund) + '">' + I('lernen') + 'Lernen' + I('schloss', 0, 'fs-ecke') + '</button>';
    if (h.art !== 'beregnung') {
      if (f.beregnung) k += '<button class="fs-kachel" data-a="erledigt" data-grund="Beregnung ist schon eingebaut.">' + I('beregnung') + 'Regner' + I('haken', 0, 'fs-ecke') + '</button>';
      else if (S.level >= D.BEREGNUNG_LVL) k += '<button class="fs-kachel" data-a="kachel" data-id="beregnung">' + I('beregnung') + 'Regner</button>';
    }
    return k ? '<div class="fs-abschnitt">Auch möglich</div><div class="f-kacheln">' + k + '</div>' : '';
  }
  function fahrerHtml(f) {
    const S = stand();
    if (f.auto) return '<div class="fs-mulde f-fahrer">' + I('fahrer') + '<div>Ein Fahrer kümmert sich hier.' + (S.lohnOffen > 0 ? ' <b style="color:#FF9C9C">Lohn offen – er streikt!</b>' : '') + '</div><button class="fs-btn fs-navy f-klein-btn" data-a="autoAus">Abziehen</button></div>';
    if (S.fahrer > M.autoFelder().length) return '<div class="fs-mulde f-fahrer">' + I('fahrer') + '<div>Ein Fahrer ist frei!</div><button class="fs-btn fs-gruen f-klein-btn" data-a="autoAn" data-id="ja">Hier einsetzen</button></div>';
    return '';
  }
  function mehrHtml(id, f) {
    if (!dlg.mehr) return '';
    const vorher = f.vorher && f.vorher.length ? f.vorher.map(x => I(x, 32)).join('') : '–';
    let h = '<div class="fs-mulde f-mehr">' + I('boden', 40) + '<span>Boden</span><b>' + Math.round(f.boden) + ' %</b>' +
      I('stoppel', 40) + '<span>Vorher gewachsen</span><b>' + vorher + '</b>';
    if (f.phase === 'waechst' || f.phase === 'reif') h += I('ertrag', 40) + '<span>Ertrag ca.</span><b>' + tonnen(M.ertragsSchaetzungKg(id)) + '</b>';
    h += I('beregnung', 40) + '<span>Beregnung</span><b>' + (f.beregnung ? 'an' : 'keine') + '</b>';
    return h + '</div>';
  }
  function zeichneFeldkarte() {
    const S = stand(), id = dlg.id, f = S.felder[id], now = jetzt();
    let html = wegHtml(f, null);
    if (f.phase === 'waechst' || f.phase === 'reif') html += ringZeile(id, f, now);
    const h = hauptBestimmen(id, f, now);
    dlg.haupt = h;
    html += hauptHtml(h, id, f, now);
    if ((h.art === 'schritt' || h.art === 'saat') && M.optionen(id, h.schritt).some(o => o.traktor)) html += '<div class="f-zeile2"><button class="fs-btn fs-navy f-klein-btn" data-a="maschineAendern">' + I('traktor') + 'Maschine ändern</button></div>';
    html += kachelnHtml(id, f, h, now);
    html += fahrerHtml(f);
    html += '<div class="f-zeile2"><button class="fs-btn fs-navy f-klein-btn" data-a="mehr">' + I(dlg.mehr ? 'minus' : 'statistik') + (dlg.mehr ? 'Weniger zeigen' : 'Mehr über das Feld') + '</button></div>' + mehrHtml(id, f);
    rahmen({ art: 'rechts', ansicht: 'feld' + id, kopf: feldKopf(f), inhalt: html });
  }
  function zeichneJob(job) {
    const S = stand(), id = dlg.id, f = S.felder[id], now = jetzt();
    const st = M.jobStand(job, now), sch = D.SCHRITTE[job.schritt];
    const tm = M.maschine(job.traktor), gm = job.geraet ? M.maschine(job.geraet) : null;
    const td = tm ? D.def(tm.id) : null, gd = gm ? D.def(gm.id) : null;
    const gesamt = job.hin + job.arbeit + job.rueck;
    const p = Math.min(1, Math.max(0, (now - job.start) / gesamt));
    const teil = st.teil === 'hin' ? 'Fährt zum Feld …' : st.teil === 'rueck' ? 'Fertig! Fährt heim.' : 'Arbeitet – noch ' + grob(st.restMs);
    const name = (gd ? gd.name + ' + ' : '') + (td ? td.name : '');
    const html = wegHtml(f, job) +
      '<div class="fs-aktion fs-gruen" data-live="job"><div class="f-aktion-kopf">' + I(maschinenIcon(td)) + '<div class="f-aktion-tx"><div class="fs-aktion-titel">' + SCHRITT_KURZ[job.schritt] + ' läuft</div><div class="fs-aktion-text">' + esc(name) + '</div></div></div>' +
      '<div class="f-ringzeile" style="margin:4px 0 14px">' + FS.ring(p, istHandy() ? 118 : 136, { farbe: 'cyan', icon: job.schritt, klasse: 'f-live-ring' }) +
      '<div class="f-job-text"><span class="fs-stat-zahl" data-live="pct">' + Math.round(p * 100) + ' %</span><br><span data-live="teil">' + teil + '</span></div></div>' +
      '<button class="fs-btn fs-gelb fs-gross fs-breit" data-a="zeigen" data-id="' + job.feld + '">' + I('karte_zeigen', 40) + 'Auf der Karte zeigen</button></div>' +
      '<div class="f-zeile2"><button class="fs-btn fs-navy f-klein-btn" data-a="jobAbbruch" data-id="' + job.id + '">' + I('schliessen', 28) + 'Abbrechen</button></div>';
    void sch;
    rahmen({ art: 'rechts', ansicht: 'job' + job.id, kopf: feldKopf(f, SCHRITT_KURZ[job.schritt] + ' läuft · ' + fmt1(D.feld(id).ha) + ' ha'), inhalt: html });
  }
  function zeichneFeldKauf() {
    const S = stand(), d = D.feld(dlg.id);
    const gesperrt = S.level < d.lvl, kann = S.geld >= d.preis;
    const grund = gesperrt ? 'Gibt es ab Level ' + d.lvl : 'Dir fehlen ' + fmt(d.preis - S.geld) + ' Münzen';
    const html = '<div class="f-fuchs-zeile">' + FS.fuchs(gesperrt ? 'gruebelt' : 'zeigt', 80) + '<div>' + (gesperrt ? 'Dieses Feld kommt später dazu.' : 'Ein neues Feld für deinen Hof!') + '</div></div>' +
      '<div class="fs-mulde f-mehr">' + I('felder', 40) + '<span>Größe</span><b>' + fmt1(d.ha) + ' ha</b>' + I('muenze', 40) + '<span>Preis</span><b>' + fmt(d.preis) + '</b>' + I('level', 40) + '<span>Ab Level</span><b>' + d.lvl + '</b></div>' +
      '<div style="margin-top:18px"><button class="fs-btn fs-gelb fs-gross fs-breit fs-spalte' + (gesperrt || !kann ? ' fs-aus' : '') + '" data-a="feldkauf" data-id="' + d.id + '"' + (gesperrt || !kann ? ' data-grund="' + esc(grund) + '"' : '') + '>' +
      '<span>' + (gesperrt ? 'Noch gesperrt' : 'Feld kaufen') + '</span><span class="fs-btn-zeile">' + (gesperrt || !kann ? esc(grund) : '<span class="f-preis">' + I('muenze') + fmt(d.preis) + '</span>') + '</span></button></div>';
    rahmen({ art: 'rechts', ansicht: 'kauf' + d.id, kopf: kopfHtml({ icon: gesperrt ? 'schloss' : 'felder', stufe: 'gold', titel: esc(d.name), unter: 'Zu verkaufen · ' + fmt1(d.ha) + ' ha' }), inhalt: html });
  }
  // Maschinenwahl ("Maschine aendern")
  function zeichneMaschinenwahl() {
    const S = stand(), id = dlg.id, schritt = dlg.sub.schritt, f = S.felder[id];
    const st = D.SCHRITTE[schritt];
    const alle = M.optionen(id, schritt, dlg.sub.frucht);
    const opts = alle.filter(o => o.traktor);
    const aktuell = besteWahl(id, schritt, dlg.sub.frucht);
    let html = '';
    if (dlg.info) {
      const typen = {};
      opts.concat(alle).forEach(o => { if (o.geraet) { const gd = D.def(M.maschine(o.geraet).id); typen[gd.typ] = D.maschinenInfo(gd); } });
      if (!st.geraet) typen.ernter = D.MASCHINEN_INFO[ernterTypFuer(id, dlg.sub.frucht)];
      else typen.traktor = D.MASCHINEN_INFO.traktor;
      html += '<div class="fs-mulde f-warum-box" style="margin:0 0 16px">' + Object.keys(typen).map(k => esc(typen[k])).join('<br><br>') + '</div>';
    }
    if (!opts.length) {
      const ss = schrittStatus(id, schritt, dlg.sub.frucht);
      html += '<div class="f-fuchs-zeile">' + FS.fuchs('gruebelt', 80) + '<div>' + esc(ss.grund || 'Keine Maschine frei.') + '</div></div>' +
        '<button class="fs-btn fs-gelb fs-gross fs-breit" data-a="zumHaendler" data-id="' + (st.geraet ? 'geraet:' + st.geraet : 'ernter:' + ernterTypFuer(id, dlg.sub.frucht)) + '">' + I('haendler', 40) + 'Zum Händler</button>';
    }
    opts.forEach((o, i) => {
      const gm = o.geraet ? M.maschine(o.geraet) : null;
      const key = String(o.geraet || o.traktor);
      const liste = o.traktoren || [o.traktor];
      let tIdx = dlg.wahl[key];
      if (tIdx === undefined) { tIdx = 0; if (aktuell && (aktuell.geraet || 0) === (o.geraet || 0)) { const j = liste.indexOf(aktuell.traktor); if (j >= 0) tIdx = j; } }
      tIdx = Math.min(tIdx, liste.length - 1);
      const tm = M.maschine(liste[tIdx]), td = D.def(tm.id);
      const bild = D.def(gm ? gm.id : tm.id);
      const ms = dauerSek(id, schritt, o.geraet, tm.uid) * M.wetter(jetzt()).arbeit / M.tempoFaktor() * 1000;
      const kaputt = (gm && gm.zustand < 50) || tm.zustand < 50;
      const gewaehlt = aktuell && (aktuell.geraet || 0) === (o.geraet || 0) && aktuell.traktor === tm.uid;
      html += '<div class="f-mrow' + (gewaehlt ? ' f-gewaehlt' : '') + '">' + (gewaehlt ? '<span class="fs-marke fs-gelb">' + I('haken') + 'Gewählt</span>' : i === 0 ? '<span class="fs-marke">Am schnellsten</span>' : '') +
        '<img src="' + vorschauBild(bild) + '" alt=""><div class="f-m-tx"><div class="f-m-name">' + esc(bild.name) + '</div>' +
        '<div class="f-m-zeile">' + (gm ? (liste.length > 1 ? '<button class="f-trak" data-a="traktorWechsel" data-id="' + key + '">' + I('traktor') + esc(td.name) + '' + I('weiter', 22) + '</button>' : 'mit <b>' + esc(td.name) + '</b>') : 'fährt selbst') + '</div>' +
        '<div class="f-m-zeile">' + I('uhr') + '<b>' + grob(ms) + '</b>' + (kaputt ? I('warnung') + 'abgenutzt' : '') + '</div></div>' +
        '<button class="fs-btn fs-gruen f-klein-btn" data-a="nimm" data-id="' + (o.geraet || 0) + ':' + tm.uid + '">Nehmen</button></div>';
    });
    alle.filter(o => !o.traktor).forEach(o => {
      const gd = D.def(M.maschine(o.geraet).id);
      html += '<div class="f-mrow" style="opacity:.6"><img src="' + vorschauBild(gd) + '" alt=""><div class="f-m-tx"><div class="f-m-name">' + esc(gd.name) + '</div><div class="f-m-zeile">' + I('schloss') + esc(o.grund || 'nicht frei') + '</div></div></div>';
    });
    html += '<div class="f-zeile2">' + (opts.length ? '<button class="fs-btn fs-navy f-klein-btn" data-a="zumHaendler" data-id="' + (st.geraet ? 'geraet:' + st.geraet : 'ernter:' + ernterTypFuer(id, dlg.sub.frucht)) + '">' + I('haendler') + 'Neue kaufen</button>' : '') +
      '<button class="fs-btn fs-cyan f-klein-btn" data-a="feldInfo">' + I('info') + (dlg.info ? 'Info schließen' : 'Was macht sie?') + '</button></div>';
    rahmen({ art: 'rechts', ansicht: 'mwahl' + id + schritt, kopf: kopfHtml({ zurueck: ['feldzurueck'], titel: 'Welche Maschine?', klein: true, unter: SCHRITT_KURZ[schritt] + ' · ' + esc(D.feld(id).name) }), inhalt: html });
    void f;
  }
  // Saatwahl: hoechstens 6 Karten + "N weitere", ganze Karte = Start mit bester Saemaschine
  function saatListe(id) {
    const S = stand(), f = S.felder[id], ha = D.feld(id).ha;
    const liste = D.FRUECHTE.map(fr => {
      const ernter = M.ernterFehlt(fr.id);
      const kg = ha * fr.ertrag * 1000 * M.ertragsFaktor(f, fr.id);
      const wert = kg / 1000 * M.grundPreis(fr.id);
      const kosten = M.kostenFuer(id, 'saeen', fr.id);
      const hinweis = M.fruchtfolgeHinweis(id, fr.id);
      const gut = hinweis.indexOf('+') >= 0, schlecht = hinweis.indexOf('−') >= 0;
      const delta = gut ? wert - wert / 1.06 : schlecht ? wert - wert / 0.85 : 0;
      let grund = '', art = '';
      if (S.level < fr.lvl) { grund = 'ab Level ' + fr.lvl; art = 'level'; }
      else if (ernter) { grund = (fr.ernte === 'wurzel' ? 'Roder' : 'Mähdrescher') + ' fehlt'; art = 'ernter'; }
      else if (S.geld < kosten) { grund = 'Dir fehlen ' + fmt(kosten - S.geld); art = 'geld'; }
      return { fr, wert, kosten, delta, gut, schlecht, grund, art, frei: !grund };
    });
    const frei = liste.filter(x => x.frei).sort((a, b) => b.wert - a.wert);
    const tippKand = frei.filter(x => x.gut).length ? frei.filter(x => x.gut) : frei.filter(x => !x.schlecht);
    const tipp = tippKand.length ? tippKand[0] : null;
    if (tipp) { tipp.tipp = true; frei.splice(frei.indexOf(tipp), 1); frei.unshift(tipp); }
    const zu = liste.filter(x => !x.frei).sort((a, b) => (a.art === 'ernter' ? 0 : a.art === 'geld' ? 1 : 2) - (b.art === 'ernter' ? 0 : b.art === 'geld' ? 1 : 2) || a.fr.lvl - b.fr.lvl);
    const sichtbar = frei.slice(0, Math.max(5, 6 - zu.length)).concat(zu).slice(0, 6);
    const rest = frei.concat(zu).filter(x => sichtbar.indexOf(x) < 0);
    return { sichtbar, rest };
  }
  function saatKarte(x) {
    const fr = x.fr;
    let s = '<button class="fs-karte fs-stufe-' + FS.stufe(fr.id) + (x.frei ? '' : ' fs-gesperrt') + '" data-a="saat" data-id="' + fr.id + '">';
    if (x.frei && x.delta) s += '<span class="fs-marke' + (x.delta < 0 ? ' fs-rot' : '') + '">' + I('ertrag') + (x.delta > 0 ? '+' : '−') + fmt(Math.abs(x.delta)) + '</span>';
    if (x.tipp) s += '<span class="fs-wimpel">' + FS.fuchs('neutral', 40) + 'Tipp!</span>';
    s += '<div class="fs-karte-bild">' + I(fr.id) + (x.frei ? '' : I('schloss', 0, 'fs-schloss')) + '</div><div class="fs-karte-name">' + esc(fr.name) + '</div>';
    if (x.frei) s += '<div class="fs-karte-zeile"><span class="fs-karte-wert">' + I('uhr') + grob(fr.dauer * 1000 / M.tempoFaktor()) + '</span><span class="fs-karte-wert">' + I('muenze') + fmt(x.wert) + '</span></div>';
    else s += '<div class="fs-karte-grund">' + I(x.art === 'ernter' ? 'haendler' : 'schloss') + esc(x.grund) + '</div>';
    return s + '</button>';
  }
  function zeichneSaatwahl() {
    const S = stand(), id = dlg.id, f = S.felder[id], d = D.feld(id);
    const l = saatListe(id);
    const karten = dlg.alleFr ? l.sichtbar.concat(l.rest) : l.sichtbar;
    let html = '', infoBox = '';
    if (dlg.info) {
      const v0 = f.vorher[0] ? D.frucht(f.vorher[0]) : null;
      infoBox = '<div class="fs-mulde f-warum-box" style="margin:16px 0 0">' + (v0 ? 'Vorher wuchs hier ' + esc(v0.name) + '. ' : '') + 'Eine andere Pflanzenfamilie als vorher mag der Boden: mehr Ertrag (grünes Schild). Die gleiche Frucht noch einmal bringt weniger (rotes Schild). ' + esc(D.SCHRITT_WARUM.saeen) + '</div>';
    }
    html += '<div class="f-saat">' + karten.map(saatKarte).join('') + '</div>';
    html += '<div class="f-saat-mehr">' + (l.rest.length ? '<button class="fs-btn fs-navy f-klein-btn" data-a="saatMehr">' + (dlg.alleFr ? 'Weniger zeigen' : l.rest.length + ' weitere Früchte') + '</button>' : '') +
      '<button class="fs-btn fs-cyan f-klein-btn" data-a="feldInfo">' + I('info') + (dlg.info ? 'Info schließen' : 'Was heißt das Schild?') + '</button></div>' + infoBox;
    const st = schrittStatus(id, 'saeen');
    let fuss;
    if (st.wahl) {
      const w = st.wahl, gm = w.geraet ? M.maschine(w.geraet) : null;
      fuss = '<div class="f-saat-fuss">' + I('traktor') + '<div><b>' + esc(wahlName(w) + (gm ? ' + ' + D.def(gm.id).name : '')) + '</b><span class="fs-lang">Tipp auf eine Frucht – los geht\'s!</span><span class="fs-kurz">Tipp auf eine Frucht!</span></div><button class="fs-btn fs-navy f-klein-btn" data-a="saatMaschine">Maschine ändern</button></div>';
    } else if (st.loesung) fuss = '<div class="f-saat-fuss">' + I('warnung') + '<div><b>' + esc(st.grund) + '</b>Ohne Sämaschine wächst nichts.</div><button class="fs-btn fs-gelb f-klein-btn" data-a="zumHaendler" data-id="' + st.loesung + ':' + st.typ + '">Zum Händler</button></div>';
    else fuss = '<div class="f-saat-fuss">' + I('uhr') + '<div><b>' + esc(st.grund) + '</b>Warte kurz, dann geht es los.</div></div>';
    rahmen({ art: 'breit', ansicht: 'saat' + id, kopf: kopfHtml({ zurueck: ['feldzurueck'], titel: 'Was säen wir?', unter: esc(d.name) + ' · ' + phasenText(f).toLowerCase() + ' · ' + fmt1(d.ha) + ' ha' }), inhalt: html, fuss });
  }
  function saatGewaehlt(frId) {
    const id = dlg.id;
    const x = saatListe(id);
    const e = x.sichtbar.concat(x.rest).find(y => y.fr.id === frId);
    if (!e) return;
    if (e.art === 'level') { toast(e.fr.name + ' gibt es ab Level ' + e.fr.lvl, 'warn', 'erg', 'schloss'); piep('fehler'); return; }
    if (e.art === 'ernter') { toast(e.grund + ' – ab zum Händler!', 'warn', 'erg', 'haendler'); zumHaendler('ernter:' + (e.fr.ernte === 'wurzel' ? 'rodemaschine' : 'maehdrescher')); return; }
    if (e.art === 'geld') { toast(e.grund + ' Münzen', 'warn', 'erg', 'muenze'); piep('fehler'); return; }
    starteSchritt(id, 'saeen', frId);
  }
  // Aus der Feldkarte heraus geoeffnete Dialoge merken sich das Feld ("Zurueck zum Feld")
  function merkeFeld() { if (dlg && dlg.typ === 'feld') rueckFeld = { id: dlg.id, sub: dlg.sub, manuell: dlg.manuell }; }
  function zumHaendler(tab) {
    merkeFeld();
    dialogShop(tab || 'traktor');
  }

  // ----------------------------------------------------------------------------------------------
  // Lernrunde (Vollbild-Panel): Aufgabe riesig, Umdrehen (transform), Gewusst / Noch nicht
  // ----------------------------------------------------------------------------------------------
  function textGroesse(html) {
    const n = String(html || '').replace(/<[^>]*>/g, '').length;
    return n <= 14 ? 60 : n <= 32 ? 46 : n <= 70 ? 36 : n <= 140 ? 28 : n <= 240 ? 23 : 20;
  }
  function zeichneLernrunde() {
    const L = dlg.lern, d = D.feld(dlg.id);
    let html;
    if (L.ergebnis) {
      const r = L.ergebnis;
      if (!r.ok) html = '<div class="f-lern-erg">' + FS.fuchs('gruebelt', 140) + '<p>' + esc(r.grund) + '</p><button class="fs-btn fs-gelb fs-gross" data-a="lernEnde">Zurück zum Feld</button></div>';
      else {
        const falsch = L.karten.filter((k, i) => !L.gewusst[i]);
        html = '<div class="f-lern-erg">' + FS.fuchs(r.richtig >= 3 ? 'jubelt' : 'neutral', 150) +
          '<div class="f-gross-zahl fs-kontur">' + r.richtig + ' von ' + L.karten.length + ' gewusst!</div>' +
          (r.gespartMs > 0 ? '<p>Die Saat ist <b>' + grob(r.gespartMs) + '</b> schneller reif!</p>' : '<p>Nächstes Mal klappt es besser!</p>') +
          (r.reif ? '<p><b>Das Feld ist jetzt reif!</b></p>' : '') +
          (falsch.length ? '<div class="fs-mulde f-lern-liste" style="padding:12px 16px">Das üben wir noch:<br>' + falsch.map(k => '• ' + k.front).join('<br>') + '</div>' : '') +
          '<button class="fs-btn fs-gelb fs-gross" data-a="lernEnde" style="min-width:320px">Zurück zum Feld</button></div>';
      }
    } else {
      const k = L.karten[L.i];
      html = '<div class="f-lern"><div class="f-lern-punkte">' + L.karten.map((x, i) => '<i class="' + (i < L.i ? (L.gewusst[i] ? 'ok' : 'nein') : i === L.i ? 'jetzt' : '') + '"></i>').join('') + '</div>' +
        '<div class="f-lk' + (L.auf ? ' f-auf' : '') + '" data-key="k' + L.i + '"><div class="f-lk-innen">' +
        '<div class="f-lk-seite" style="font-size:' + textGroesse(k.front) + 'px"><small>Karte ' + (L.i + 1) + ' von ' + L.karten.length + (k.titel ? ' · ' + esc(k.titel) : '') + '</small><div class="f-lk-text">' + k.front + '</div></div>' +
        '<div class="f-lk-seite f-lk-hinten" style="font-size:' + textGroesse(k.back) + 'px"><small>Antwort</small><div class="f-lk-text">' + k.back + '</div></div></div></div>' +
        (L.auf ? '<div class="f-lern-knoepfe"><button class="fs-btn fs-gruen fs-gross" data-a="lernWeiss">' + I('haken', 44) + 'Gewusst</button><button class="fs-btn fs-navy fs-gross" data-a="lernNicht">Noch nicht</button></div>'
          : '<div class="f-lern-knoepfe"><button class="fs-btn fs-gelb fs-gross" data-a="lernUm">Umdrehen</button></div><div class="f-lern-tipp">Erst nachdenken, dann umdrehen!</div>') + '</div>';
    }
    rahmen({ art: 'mitte', ansicht: 'lern' + dlg.id, kopf: kopfHtml({ zurueck: L.ergebnis ? null : ['lernAbbruch'], icon: 'lernen', stufe: 'lila', titel: 'Lernrunde', unter: esc(d.name) + ' · schneller reif' }), inhalt: html });
  }

  // ----------------------------------------------------------------------------------------------
  // Bausteine fuer die Dialoge (Stil B): Knopf mit Grund, Zahl mit Icon, Reiter, Trend-Pfeil, Sterne, Werte-Balken
  // ----------------------------------------------------------------------------------------------
  // o: { a, id, farbe:'gruen'|'gelb'|'navy'|'cyan'|'rot'|'violett', text, zeile (html), icon, grund (=> gedimmt, antippbar, zeigt Grund),
  //      gross, breit, klein, puls, klasse }
  function knopf(o) {
    const aus = !!o.grund;
    const kl = 'fs-btn ' + (aus ? 'fs-navy fs-aus' : 'fs-' + (o.farbe || 'navy')) + (o.gross ? ' fs-gross' : '') + (o.breit ? ' fs-breit' : '') +
      (o.klein ? ' f-klein-btn' : '') + (o.zeile !== undefined ? ' fs-spalte' : '') + (o.puls && !aus && !FS.effekteWenig() ? ' fs-pulsieren' : '') + (o.klasse ? ' ' + o.klasse : '');
    let h = '<button class="' + kl + '" data-a="' + o.a + '"' + (o.id !== undefined && o.id !== null ? ' data-id="' + esc(o.id) + '"' : '') + (aus ? ' data-grund="' + esc(o.grund) + '"' : '') + '>';
    const ic = o.icon ? I(o.icon) : '';
    if (o.zeile !== undefined) h += '<span class="f-btn-titel">' + ic + esc(o.text) + '</span><span class="fs-btn-zeile">' + (aus ? esc(o.grund) : o.zeile) + '</span>';
    else h += ic + esc(o.text);
    return h + '</button>';
  }
  const zi = (icon, text, kl) => '<span class="f-zi' + (kl ? ' ' + kl : '') + '">' + I(icon) + '<b>' + text + '</b></span>';
  const muenzZeile = n => '<span class="f-preis">' + I('muenze') + fmt(n) + '</span>';
  const muenzPlus = n => '<span class="f-preis">' + I('muenze') + '+' + fmt(n) + '</span>';
  const fehltGeld = n => 'Dir fehlen ' + fmt(n) + ' Münzen';
  const menge = kg => kg >= 1000 ? tonnen(kg) : fmt(kg) + ' kg';
  // Reiter: [{ id, icon, lang, kurz, badge }]. Brechen nicht um: auf dem Handy waagerecht wischbar + kurze Namen.
  function reiter(liste, aktiv, a) {
    return '<div class="f-reiter">' + liste.map(t => '<button class="fs-btn ' + (t.id === aktiv ? 'fs-cyan f-an' : 'fs-navy') + '" data-a="' + a + '" data-id="' + t.id + '">' + I(t.icon) +
      (t.kurz ? '<span class="fs-lang">' + t.lang + '</span><span class="fs-kurz">' + t.kurz + '</span>' : '<span>' + t.lang + '</span>') +
      (t.badge ? '<span class="fs-badge fs-gruen">' + t.badge + '</span>' : '') + '</button>').join('') + '</div>';
  }
  // Preis-Trend als Pfeil (gruen hoch = gut verkaufen, rot runter = lieber warten)
  function trendArt(rel) { return rel > 1.12 ? 'hoch' : rel < 0.9 ? 'runter' : 'gleich'; }
  function trendPfeil(rel, px) {
    const art = trendArt(rel);
    const f = art === 'hoch' ? '#3FD447' : art === 'runter' ? '#F2424A' : '#8792D6';
    const pfad = art === 'hoch' ? 'M16 3 L29 17 H21 V29 H11 V17 H3 Z' : art === 'runter' ? 'M16 29 L29 15 H21 V3 H11 V15 H3 Z' : 'M3 11 H18 V4 L30 16 L18 28 V21 H3 Z';
    return '<svg class="fi f-trend" viewBox="0 0 32 32" width="' + (px || 34) + '" height="' + (px || 34) + '" aria-hidden="true"><path d="' + pfad + '" fill="' + f + '" stroke="#0A0D26" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<path d="M' + (art === 'gleich' ? '6 14 H14' : '14 9 L12 11') + '" stroke="#fff" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round"/></svg>';
  }
  function stern(an, px) {
    return '<svg class="fi" viewBox="0 0 48 48" width="' + px + '" height="' + px + '" aria-hidden="true"><path d="M24 4 L29.6 17.2 L44 18.4 L33 27.9 L36.4 42 L24 34.4 L11.6 42 L15 27.9 L4 18.4 L18.4 17.2 Z" fill="' +
      (an ? '#FFC531' : '#1F2766') + '" stroke="#0A0D26" stroke-width="3" stroke-linejoin="round"/>' + (an ? '<path d="M16 20 L21 19.4" stroke="#FFF3A6" stroke-width="3" stroke-linecap="round"/>' : '') + '</svg>';
  }
  // Werte-Balken wie Fahrzeug-Werte: Icon · Name · Balken · Zahl
  function wertZeile(icon, name, anteil, zahl, farbe) {
    return '<div class="f-wert">' + I(icon) + '<span>' + name + '</span>' + FS.balken(0.1 + 0.9 * Math.max(0, Math.min(1, anteil)), farbe || 'cyan') + '<b>' + zahl + '</b></div>';
  }
  function infoBox(text) { return '<div class="fs-mulde f-warum-box">' + text + '</div>'; }
  function fuchsZeile(pose, text, px) { return '<div class="f-fuchs-zeile">' + FS.fuchs(pose, px || 64) + '<div>' + text + '</div></div>'; }
  function offen(key) { return !!(dlg && dlg.offen && dlg.offen[key]); }
  function mehrKnopf(key, text) {
    const auf = offen(key);
    return '<button class="fs-btn fs-navy f-klein-btn f-mehr-btn" data-a="auf" data-id="' + esc(key) + '">' + I(auf ? 'minus' : 'plus') + (auf ? 'Weniger' : (text || 'Mehr')) + '</button>';
  }
  function dInfoKnopf(key) { return '<button class="fs-btn fs-cyan fs-rund f-info-rund" data-a="auf" data-id="' + esc(key) + '" aria-label="Info">' + I('info') + '</button>'; }
  // Wo bekomme ich ein Gut her? -> { art:'feld'|'tier'|'betrieb', id }
  function quelleVon(gut) {
    if (D.frucht(gut)) return { art: 'feld', id: gut };
    const t = D.TIERE.find(x => x.gut === gut);
    if (t) return { art: 'tier', id: t.id };
    const b = D.PRODUKTION.find(x => x.rezepte.some(r => r.aus === gut));
    if (b) return { art: 'betrieb', id: b.id };
    return null;
  }
  // Feld, auf dem die Frucht waechst (fuer "waechst auf ...")
  function waechstAuf(frucht) {
    const S = stand(), now = jetzt();
    const id = Object.keys(S.felder).map(Number).find(i => { const f = S.felder[i]; return f.frucht === frucht && (f.phase === 'waechst' || f.phase === 'reif'); });
    if (!id) return null;
    const f = S.felder[id];
    return { id, reif: f.phase === 'reif', ms: f.phase === 'waechst' ? M.restWachsen(id, now) : 0 };
  }
  // "Anbauen": passendes Feld oeffnen (gegrubbert -> Saatwahl, Stoppel -> Grubbern, sonst wo es schon waechst)
  function anbauen(frucht) {
    const S = stand(), fr = D.frucht(frucht);
    if (!fr) return;
    if (S.level < fr.lvl) { toast(fr.name + ' gibt es ab Level ' + fr.lvl, 'warn', 'erg', 'schloss'); return; }
    const ids = Object.keys(S.felder).map(Number).filter(i => !M.jobAufFeld(i));
    const bereit = ids.find(i => S.felder[i].phase === 'bearbeitet' || S.felder[i].phase === 'gepfluegt');
    const stoppel = ids.find(i => S.felder[i].phase === 'stoppel');
    const w = waechstAuf(frucht);
    let ziel = null, sub;
    if (bereit) { ziel = bereit; sub = { schritt: 'saeen' }; }
    else if (stoppel) ziel = stoppel;
    else if (w) { ziel = w.id; toast(fr.name + ' wächst schon auf ' + D.feld(w.id).name, 'gut', 'erg', frucht); }
    if (!ziel) { toast('Alle Felder sind gerade belegt', 'warn', 'erg', 'felder'); return dialogFelder(); }
    dlg = null;
    dialogFeld(ziel, sub);
    fliegeZuFeld(ziel, Math.max(0.8, cam.z));
  }
  function wegZuGut(gut) {
    const q = quelleVon(gut);
    if (!q) return dialogLager();
    if (q.art === 'feld') return anbauen(gut);
    if (q.art === 'tier') return dialogTiere(q.id);
    return dialogBetriebe(q.id);
  }
  // Silo-Fuellstand (Lager + Haendler)
  function siloHtml(gross) {
    const S = stand(), kap = M.siloKap(), mg = M.lagerMenge(), voll = mg / kap;
    const n = D.SILO_STUFEN[S.siloStufe + 1];
    const ausbau = n ? knopf({ a: 'siloKauf', farbe: 'navy', text: 'Silo ausbauen', icon: 'silo', zeile: 'auf ' + tonnen(n.kg) + ' · ' + muenzZeile(n.preis), grund: S.geld < n.preis ? fehltGeld(n.preis - S.geld) : '' })
      : '<span class="fs-marke fs-gelb">' + I('haken') + 'Voll ausgebaut</span>';
    return '<div class="f-k f-silo' + (gross ? ' f-silo-gross' : '') + '"><div class="f-silo-zeile">' + I('silo', 0, 'f-silo-bild') + '<div class="f-k-tx"><div class="f-silo-zahl fs-kontur">' + tonnen(mg) + ' <span>von ' + tonnen(kap) + '</span></div>' +
      FS.balken(voll, voll > 0.9 ? 'rot' : voll > 0.7 ? 'gelb' : 'gruen', 'fs-dick') + '</div></div>' +
      (voll > 0.85 ? fuchsZeile('gruebelt', 'Fast voll! Verkaufe etwas oder baue aus.', 56) : '') + '<div class="f-k-fuss">' + ausbau + '</div></div>';
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Haendler (Traktoren / Geraete / Erntemaschinen / Fahrer / Silo / Meine Maschinen)
  // ----------------------------------------------------------------------------------------------
  // tab 'geraet:saeen' / 'ernter:rodemaschine' -> markiert den gesuchten Typ ("Brauchst du!")
  function dialogShop(tab) {
    const rueck = rueckFeld; rueckFeld = null;
    const p = String(tab || 'traktor').split(':');
    dlg = { typ: 'shop', tab: p[0] || 'traktor', bedarf: p[1] || null, rueck, offen: {} };
    zeichneShop();
  }
  const SHOP_TABS = [
    { id: 'traktor', icon: 'traktor', lang: 'Traktoren', kurz: 'Traktoren' }, { id: 'geraet', icon: 'grubbern', lang: 'Geräte', kurz: 'Geräte' },
    { id: 'ernter', icon: 'maehdrescher', lang: 'Erntemaschinen', kurz: 'Ernter' }, { id: 'fahrer', icon: 'fahrer', lang: 'Fahrer', kurz: 'Fahrer' },
    { id: 'silo', icon: 'silo', lang: 'Silo', kurz: 'Silo' }, { id: 'fuhrpark', icon: 'fuhrpark', lang: 'Meine Maschinen', kurz: 'Meine' }
  ];
  function markeHtml(d) {
    const m = D.MARKEN[d.marke];
    return '<span class="fs-marke f-marke" style="background:' + m.c1 + '">' + esc(m.name) + '</span>';
  }
  function maxWert(liste, f) { return liste.reduce((a, x) => Math.max(a, f(x)), 1); }
  function maschinenWerte(d) {
    if (d.art === 'traktor') return wertZeile('ps', 'Kraft', d.ps / maxWert(D.TRAKTOREN, x => x.ps), d.ps + ' PS') + wertZeile('tempo', 'Tempo', d.kmh / maxWert(D.TRAKTOREN, x => x.kmh), d.kmh + ' km/h');
    if (d.art === 'geraet') {
      const gleich = D.GERAETE.filter(x => x.typ === d.typ);
      return wertZeile(GERAET_ICON[d.typ], 'Breite', d.w / maxWert(gleich, x => x.w), meter(d.w)) + wertZeile('ps', 'Braucht', d.ps / maxWert(D.TRAKTOREN, x => x.ps), d.ps + ' PS', 'gelb');
    }
    const gleich = D.ERNTER.filter(x => x.typ === d.typ);
    return wertZeile(d.typ === 'rodemaschine' ? 'roder' : 'maehdrescher', 'Breite', d.w / maxWert(gleich, x => x.w), meter(d.w)) + wertZeile('silo', 'Tank', d.tank / maxWert(D.ERNTER, x => x.tank), tonnen(d.tank)) +
      wertZeile('tempo', 'Tempo', d.kmh / maxWert(D.ERNTER, x => x.kmh), d.kmh + ' km/h');
  }
  function shopUnter(d) {
    if (d.art === 'traktor') return 'Traktor';
    if (d.art === 'geraet') return GERAET_NAME[d.typ];
    return d.typ === 'rodemaschine' ? 'Roder' : 'Mähdrescher';
  }
  function shopKarte(d, bedarfId) {
    const S = stand();
    const hab = S.flotte.filter(f => f.id === d.id).length, gesperrt = S.level < d.lvl;
    const grund = gesperrt ? 'Ab Level ' + d.lvl : S.geld < d.preis ? fehltGeld(d.preis - S.geld) : '';
    const vor = M.maschinenVorteile(d.id).filter(x => !/^Zugreserve/.test(x));
    const infoAuf = dlg.info === d.id;
    let h = '<div class="f-k f-mk' + (gesperrt ? ' f-zu' : '') + (bedarfId === d.id ? ' f-fokus' : '') + '">' +
      '<div class="f-foto">' + '<img src="' + vorschauBild(d) + '" alt="">' + (gesperrt ? I('schloss', 0, 'f-foto-schloss') : '') + markeHtml(d) +
      (bedarfId === d.id ? '<span class="fs-marke fs-gelb f-foto-marke">' + I('weiter') + 'Brauchst du!</span>' : hab ? '<span class="fs-marke f-foto-marke">' + I('haken') + hab + '× im Hof</span>' : '') + '</div>' +
      '<div class="f-k-kopf f-k-kopf-klein"><div class="f-k-tx"><div class="f-k-titel fs-kontur">' + esc(d.name) + '</div><div class="f-k-unter">' + shopUnter(d) + '</div></div>' +
      '<button class="fs-btn ' + (infoAuf ? 'fs-cyan' : 'fs-navy') + ' fs-rund f-info-rund" data-a="mInfo" data-id="' + d.id + '" aria-label="Was macht sie?">' + I('info') + '</button></div>' +
      '<div class="f-werte">' + maschinenWerte(d) + '</div>';
    if (vor.length) h += '<div class="f-vorteile">' + vor.map(x => '<div class="f-vorteil">' + I('haken') + esc(x) + '</div>').join('') + '</div>';
    if (infoAuf) {
      const zr = M.maschinenVorteile(d.id).filter(x => /^Zugreserve/.test(x));
      h += infoBox(esc(D.maschinenInfo(d)) + (zr.length ? '<br>' + esc(zr[0]) + '.' : ''));
    }
    h += '<div class="f-k-fuss">' + knopf({ a: 'kaufen', id: d.id, farbe: 'gruen', text: 'Kaufen', zeile: muenzZeile(d.preis), grund }) + '</div></div>';
    return h;
  }
  function fahrerHtmlShop() {
    const S = stand(), n = D.FAHRER[S.fahrer];
    const imEinsatz = M.autoFelder().length;
    let h = '<div class="f-raster f-r2">';
    h += '<div class="f-k"><div class="f-k-kopf"><div class="f-k-bild fs-stufe-gruen">' + I('fahrer') + '</div><div class="f-k-tx"><div class="f-k-titel fs-kontur">Deine Fahrer</div><div class="f-k-unter">' +
      S.fahrer + ' Fahrer · ' + imEinsatz + ' im Einsatz</div></div>' + dInfoKnopf('fahrerInfo') + '</div>' +
      fuchsZeile('zeigt', 'Fahrer helfen auf einem Feld. Säen machst du!', 60) +
      '<div class="f-werte-gross">' + zi('lohn', fmt(M.lohnProTag())) + '<span>Lohn pro Tag</span></div>' +
      (S.lohnOffen > 0 ? '<div class="f-warn">' + I('warnung') + '<div>Lohn offen: <b>' + fmt(S.lohnOffen) + ' Münzen</b>. Die Fahrer streiken!</div></div>' : '') +
      (offen('fahrerInfo') ? infoBox('Ein Fahrer übernimmt auf einem Feld alle Arbeiten außer Säen: kalken, grubbern, düngen, walzen, spritzen und ernten – mit freien Maschinen. Jeder Fahrer kostet jeden Tag Lohn (' +
        fmt(Math.round(D.FAHRER_LOHN_ANTEIL * 100)) + ' % seines Preises). Fehlt das Geld, streiken alle, bis der Lohn bezahlt ist. Einsetzen kannst du ihn in der Feldkarte: „Hier einsetzen“.') : '') + '</div>';
    if (n) {
      h += '<div class="f-k' + (S.level < n.lvl ? ' f-zu' : '') + '"><div class="f-k-kopf"><div class="f-k-bild fs-stufe-blau">' + I('fahrer') + (S.level < n.lvl ? I('schloss', 0, 'fs-ecke') : '') + '</div><div class="f-k-tx"><div class="f-k-titel fs-kontur">Fahrer Nr. ' + (S.fahrer + 1) +
        '</div><div class="f-k-unter">Hilft auf einem Feld</div></div></div><div class="f-werte-gross">' + zi('lohn', fmt(M.fahrerLohn(S.fahrer))) + '<span>Lohn pro Tag</span></div>' +
        '<div class="f-k-fuss">' + knopf({ a: 'fahrerKauf', farbe: 'gruen', text: 'Einstellen', icon: 'fahrer', zeile: muenzZeile(n.preis), grund: S.level < n.lvl ? 'Ab Level ' + n.lvl : S.geld < n.preis ? fehltGeld(n.preis - S.geld) : '' }) + '</div></div>';
    } else h += '<div class="f-k">' + fuchsZeile('jubelt', 'Alle Fahrer sind da. Super Hof!', 80) + '</div>';
    return h + '</div>';
  }
  function fuhrparkKarte(m) {
    const S = stand(), d = D.def(m.id), job = m.job ? S.jobs.find(j => j.id === m.job) : null;
    const kaputt = m.zustand < 15, kosten = M.reparaturKosten(m);
    const status = job ? '<span class="fs-marke fs-gelb f-foto-marke">' + I(job.schritt) + SCHRITT_KURZ[job.schritt] + '</span>' :
      kaputt ? '<span class="fs-marke fs-rot f-foto-marke">' + I('warnung') + 'Kaputt</span>' : '<span class="fs-marke f-foto-marke">' + I('haken') + 'Bereit</span>';
    const repGrund = job ? 'Sie arbeitet gerade' : m.zustand >= 99.5 ? 'Sie ist in Topform' : S.geld < kosten ? fehltGeld(kosten - S.geld) : '';
    const verkGrund = job ? 'Sie arbeitet gerade' : '';
    return '<div class="f-k f-mk' + (kaputt ? ' f-kaputt' : '') + '"><div class="f-foto"><img src="' + vorschauBild(d) + '" alt="">' + markeHtml(d) + status + '</div>' +
      '<div class="f-k-kopf f-k-kopf-klein"><div class="f-k-tx"><div class="f-k-titel fs-kontur">' + esc(d.name) + '</div><div class="f-k-unter">' +
      (job ? esc(D.feld(job.feld).name) : shopUnter(d) + (d.ps && d.art === 'traktor' ? ' · ' + d.ps + ' PS' : '')) + '</div></div></div>' +
      '<div class="f-werte">' + wertZeile('zustand', 'Zustand', m.zustand / 100, Math.round(m.zustand) + ' %', m.zustand < 30 ? 'rot' : m.zustand < 60 ? 'gelb' : 'gruen') + '</div>' +
      '<div class="f-k-fuss f-fuss-spalte">' + knopf({ a: 'reparieren', id: m.uid, farbe: m.zustand < 50 ? 'gruen' : 'navy', icon: 'reparieren', text: 'Reparieren', zeile: m.zustand >= 99.5 ? 'top' : muenzZeile(kosten), grund: repGrund }) +
      knopf({ a: 'mverkauf', id: m.uid, farbe: 'navy', icon: 'verkaufen', text: 'Verkaufen · +' + fmt(M.verkaufswert(m)), grund: verkGrund, klasse: 'f-verk-btn' }) + '</div></div>';
  }
  function zeichneShop() {
    const S = stand(), tab = dlg.tab;
    let inhalt = '';
    if (tab === 'traktor' || tab === 'geraet' || tab === 'ernter') {
      let liste = tab === 'traktor' ? D.TRAKTOREN.slice() : tab === 'geraet' ? D.GERAETE.slice() : D.ERNTER.slice();
      let bedarfId = null;
      if (dlg.bedarf) {
        // gesuchter Typ nach vorne; die guenstigste kaufbare Maschine davon bekommt "Brauchst du!"
        liste = liste.filter(d => d.typ === dlg.bedarf).concat(liste.filter(d => d.typ !== dlg.bedarf));
        const b = liste.find(d => d.typ === dlg.bedarf && S.level >= d.lvl);
        if (b) bedarfId = b.id;
      }
      inhalt = '<div class="f-raster f-mk-raster">' + liste.map(d => shopKarte(d, bedarfId)).join('') + '</div>';
    } else if (tab === 'fahrer') inhalt = fahrerHtmlShop();
    else if (tab === 'silo') inhalt = '<div class="f-raster f-r2">' + siloHtml(true) + '<div class="f-k">' + fuchsZeile('zeigt', 'Mehr Platz für deine Ernte!', 70) +
      infoBox('Die Ernte kommt ins Silo. Ist es voll, wird der Rest sofort verkauft – aber nur zu 80 % des Preises.') + '</div></div>';
    else {
      const reihenfolge = { traktor: 0, geraet: 1, ernter: 2 };
      const liste = S.flotte.slice().sort((a, b) => (a.zustand < 15 ? -1 : 0) - (b.zustand < 15 ? -1 : 0) || reihenfolge[D.def(a.id).art] - reihenfolge[D.def(b.id).art] || D.def(a.id).preis - D.def(b.id).preis);
      const abgenutzt = liste.filter(m => m.zustand < 50 && !m.job).length;
      inhalt = (abgenutzt ? fuchsZeile('gruebelt', abgenutzt === 1 ? 'Eine Maschine ist abgenutzt. Reparieren!' : abgenutzt + ' Maschinen sind abgenutzt. Reparieren!', 64) : '') +
        '<div class="f-raster f-mk-raster">' + liste.map(fuhrparkKarte).join('') + '</div>';
    }
    const zurueck = dlg.rueck ? '<button class="fs-btn ' + (dlg.gekauft ? 'fs-gelb' : 'fs-navy') + ' f-klein-btn f-zum-feld" data-a="zumFeld" aria-label="Zurück zum Feld">' + I('zurueck') + '<span class="fs-lang">Zurück zum Feld</span><span class="fs-kurz">Zum Feld</span></button>' : '';
    rahmen({ art: 'mitte', ansicht: 'shop' + tab, kopf: kopfHtml({ icon: 'haendler', stufe: 'gold', titel: 'Händler', unter: 'Maschinen, Fahrer und Silo', extra: geldPille() }),
      vor: (zurueck ? '<div class="f-vor-zeile">' + zurueck + '</div>' : '') + reiter(SHOP_TABS.map(t => Object.assign({}, t, { badge: t.id === 'fuhrpark' ? S.flotte.filter(m => !m.job && m.zustand < 15).length || '' : '' })), tab, 'shoptab'),
      inhalt });
  }
  function dialogFuhrpark() { dialogShop('fuhrpark'); }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Lager und Markt (Silo gross, je Gut: Icon + Menge + Preis-Trend + EIN Verkaufen-Knopf; Haelfte/Zukaufen unter "Mehr")
  // ----------------------------------------------------------------------------------------------
  function dialogLager() { const rueck = rueckFeld; rueckFeld = null; dlg = { typ: 'lager', rueck, offen: {} }; zeichneLager(); }
  function zukaufKnopf(id, kg, text) {
    const S = stand(), fr = D.frucht(id), now = jetzt();
    const kosten = Math.round(kg / 1000 * M.zukaufPreisProT(id)), rest = M.zukaufRestKg(now), frei = M.siloKap() - M.lagerMenge();
    const grund = S.level < fr.lvl ? 'Ab Level ' + fr.lvl : rest < kg ? (rest < 100 ? 'Heute nichts mehr zu kaufen' : 'Heute nur noch ' + tonnen(rest)) : frei < kg ? 'Im Silo ist kein Platz' : S.geld < kosten ? fehltGeld(kosten - S.geld) : '';
    return knopf({ a: 'zukauf', id: id + ':' + kg, farbe: 'navy', icon: 'zukaufen', text: text || ('+' + menge(kg) + ' kaufen'), zeile: muenzZeile(kosten), grund });
  }
  function lagerZeile(id) {
    const S = stand(), x = D.gut(id), p = M.preis(id), rel = S.preise[id] || 1, lager = S.silo[id] || 0;
    const art = trendArt(rel);
    const auf = offen('g:' + id);
    let h = '<div class="f-lz' + (auf ? ' f-lz-auf' : '') + '" data-key="lz' + id + '">' + I(id, 0, 'f-lz-bild') + '<div class="f-lz-name"><b class="fs-kontur">' + esc(x.name) + '</b><span>' + menge(lager) + '</span></div>' +
      '<div class="f-lz-preis">' + trendPfeil(rel) + '<div><b>' + I('muenze') + fmt(p) + '</b><span>je t · ' + (art === 'hoch' ? 'gut!' : art === 'runter' ? 'niedrig' : 'normal') + '</span></div></div>' +
      knopf({ a: 'verkauf', id: id + ':all', farbe: 'gruen', text: 'Verkaufen', zeile: '+' + fmt(lager / 1000 * p), klasse: 'f-lz-knopf' }) +
      '<button class="fs-btn fs-navy fs-rund f-lz-mehr" data-a="auf" data-id="g:' + id + '" aria-label="Mehr">' + I(auf ? 'minus' : 'plus') + '</button>';
    if (auf) {
      h += '<div class="f-lz-extra">' + knopf({ a: 'verkauf', id: id + ':half', farbe: 'navy', icon: 'verkaufen', text: 'Hälfte verkaufen', zeile: '+' + fmt(lager / 2000 * p) });
      if (D.frucht(id)) h += zukaufKnopf(id, 1000);
      h += '</div>';
    }
    return h + '</div>';
  }
  function zeichneLager() {
    const S = stand(), now = jetzt();
    const ids = D.alleGueter().filter(id => (S.silo[id] || 0) >= 1).sort((a, b) => (S.silo[b] || 0) / 1000 * M.preis(b) - (S.silo[a] || 0) / 1000 * M.preis(a));
    let html = siloHtml(false);
    html += '<div class="f-abschnitt-zeile"><span class="fs-abschnitt">Deine Waren</span>' + dInfoKnopf('lagerInfo') + '</div>';
    if (offen('lagerInfo')) html += infoBox('Die Preise schwanken. Grüner Pfeil: jetzt verkaufen lohnt sich! Roter Pfeil: lieber warten. In Betrieben wird aus Rohstoffen mehr Geld, und Aufträge zahlen extra. Zur Not kannst du Früchte zukaufen – fast doppelt so teuer, höchstens ' + (D.ZUKAUF_MAX_TAG_KG / 1000) + ' t am Tag.');
    html += ids.length ? '<div class="f-lager-liste">' + ids.map(lagerZeile).join('') + '</div>' : fuchsZeile('neutral', 'Dein Lager ist leer. Ernte etwas!', 72);
    // Zukaufen (versteckt unter "Mehr")
    html += '<div class="f-zeile2">' + mehrKnopf('zukaufListe', 'Früchte zukaufen') + '</div>';
    if (offen('zukaufListe')) {
      const fr = D.FRUECHTE.filter(f => S.level >= f.lvl);
      html += '<div class="fs-mulde f-warum-box">Teuer! Heute noch ' + tonnen(M.zukaufRestKg(now)) + ' möglich.</div><div class="f-raster f-zk-raster">' +
        fr.map(f => '<div class="f-k f-zk">' + '<div class="f-k-kopf f-k-kopf-klein">' + I(f.id, 56) + '<div class="f-k-tx"><div class="f-k-titel fs-kontur">' + esc(f.name) + '</div><div class="f-k-unter">im Lager: ' + menge(S.silo[f.id] || 0) + '</div></div></div>' +
          zukaufKnopf(f.id, 1000, '+1 t') + '</div>').join('') + '</div>';
    }
    rahmen({ art: 'mitte', ansicht: 'lager', kopf: kopfHtml({ icon: 'silo', stufe: 'blau', titel: 'Lager & Markt', unter: tonnen(M.lagerMenge()) + ' von ' + tonnen(M.siloKap()) + ' belegt', extra: geldPille() }),
      vor: dlg.rueck ? '<div class="f-vor-zeile"><button class="fs-btn fs-navy f-klein-btn" data-a="zumFeld">' + I('zurueck') + 'Zurück zum Feld</button></div>' : '', inhalt: html });
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Auftragsbrett (Zettel-Karten, ohne Zeitdruck; nur der erste lieferbare "Liefern" pulsiert)
  // ----------------------------------------------------------------------------------------------
  function dialogAuftraege() { const rueck = rueckFeld; rueckFeld = null; dlg = { typ: 'auftraege', rueck, offen: {} }; zeichneAuftraege(); }
  // Kunde nur zur Anzeige (das Modell kennt keine Kunden): aus Gut + Auftrags-Nr. abgeleitet
  function kundeFuer(a) {
    const g = a.gut, fr = D.frucht(g), n = a.id % 2;
    if (fr) {
      if (fr.familie === 'getreide') return n ? ['Mühle Lindner', 'muehle', 'mahlt Mehl'] : ['Futterhof Wiesner', 'tierhof', 'füttert Tiere'];
      if (fr.familie === 'oel') return ['Ölmühle Gelbblüte', 'oelmuehle', 'presst Öl'];
      if (g === 'ruebe') return ['Zuckerfabrik Süß', 'zuckerfabrik', 'macht Zucker'];
      if (g === 'kartoffel') return ['Chips-Fabrik Knusper', 'chipsfabrik', 'macht Chips'];
      return n ? ['Gemüsehof Frisch', 'haendler', 'für den Markt'] : ['Futterhof Wiesner', 'tierhof', 'füttert Tiere'];
    }
    if (['brot', 'kuchen', 'roggenbrot', 'honigkuchen', 'mehl', 'roggenmehl'].indexOf(g) >= 0) return ['Bäckerei Krume', 'baeckerei', 'backt Brot'];
    if (['eier', 'enteneier', 'milch', 'ziegenmilch', 'kaese', 'ziegenkaese', 'butter', 'joghurt', 'honig'].indexOf(g) >= 0) return ['Hofladen Lindner', 'lager', 'für den Markt'];
    if (['wolle', 'alpakawolle', 'wollstoff', 'alpakastoff'].indexOf(g) >= 0) return ['Strickstube Flausch', 'weberei', 'strickt Pullis'];
    return ['Dorfmarkt', 'haendler', 'für den Markt'];
  }
  function auftragZettel(a, ersterOk) {
    const S = stand(), now = jetzt(), x = D.gut(a.gut), hab = S.silo[a.gut] || 0, ok = hab >= a.kg, fehl = Math.max(0, a.kg - hab);
    const k = kundeFuer(a);
    let h = '<div class="fs-zettel f-zettel' + (ok ? ' fs-ok' : '') + '" data-key="az' + a.id + '">' + (ok ? I('haken', 0, 'f-zettel-haken') : '') +
      '<div class="f-kunde"><div class="f-kunde-bild">' + I(k[1]) + '</div><div><b>' + k[0] + '</b><span>' + k[2] + '</span></div></div>' +
      '<div class="f-ware">' + I(a.gut) + '<div><b>' + menge(a.kg) + '</b><span>' + esc(x.name) + '</span></div></div>' +
      '<div class="f-im-lager"><span>' + I('silo') + 'Im Lager</span><b>' + menge(hab) + '</b></div>' + FS.balken(Math.min(1, hab / a.kg), ok ? 'gruen' : 'gelb') +
      (ok ? '<div class="f-az-status f-ok">' + I('haken') + 'Alles da!</div>' : '<div class="f-az-status f-fehlt">Es fehlen ' + menge(fehl) + '</div>') +
      '<div class="f-lohn">' + I('muenze') + '<b>' + fmt(a.lohn) + '</b>' + I('xp') + '<b>' + a.xp + '</b></div>';
    // dezente Restzeit (das Modell laesst Auftraege ablaufen) - ohne Sekunden-Countdown
    // Restzeit nur kurz vor dem Ablauf und ohne Countdown-Druck (Uli: freie Hand, 28.10.2026) - sonst verschwaende ein Zettel ohne Vorwarnung.
    if (a.bis && a.bis - now < 2 * 3600e3) h += '<div class="f-az-zeit">' + I('uhr') + 'Bald weg · ' + grob(Math.max(0, a.bis - now)) + '</div>';
    h += '<div class="f-az-fuss">';
    if (ok) h += knopf({ a: 'liefern', id: a.id, farbe: 'gruen', icon: 'lkw', text: 'Liefern', puls: ersterOk, klasse: 'f-az-knopf' });
    else {
      const q = quelleVon(a.gut);
      if (q && q.art === 'feld') {
        const w = waechstAuf(a.gut);
        if (w) h += '<div class="f-az-hinweis">' + I('spross') + esc(D.feld(w.id).name) + ': ' + (w.reif ? 'reif!' : grob(w.ms)) + '</div>';
        const fr = D.frucht(a.gut);
        h += '<div class="f-az-knoepfe">' + knopf({ a: 'anbauen', id: a.gut, farbe: 'navy', icon: 'saeen', text: 'Anbauen', grund: S.level < fr.lvl ? 'Ab Level ' + fr.lvl : '' });
        if (fehl <= D.ZUKAUF_MAX_TAG_KG) h += zukaufKnopf(a.gut, Math.max(100, Math.ceil(fehl / 100) * 100), 'Kaufen');
        h += '</div>';
      } else if (q && q.art === 'tier') h += knopf({ a: 'zumTier', id: q.id, farbe: 'navy', icon: q.id, text: 'Zum Tierhof', klasse: 'f-az-knopf' });
      else if (q) h += knopf({ a: 'herstellen', id: q.id, farbe: 'navy', icon: q.id, text: 'Herstellen', klasse: 'f-az-knopf' });
    }
    return h + '</div></div>';
  }
  function zeichneAuftraege() {
    const S = stand();
    const lieferbar = S.auftraege.filter(a => (S.silo[a.gut] || 0) >= a.kg);
    const liste = lieferbar.concat(S.auftraege.filter(a => lieferbar.indexOf(a) < 0));
    let html;
    if (!liste.length) html = fuchsZeile('neutral', 'Gerade keine Aufträge. Bald kommen neue!', 90);
    else html = '<div class="f-brett">' + liste.map((a, i) => auftragZettel(a, i === 0 && lieferbar.length > 0)).join('') + '</div>' +
      '<div class="f-brett-fuss">' + I('lkw') + 'Nach jeder Lieferung kommt bald ein neuer Auftrag.</div>';
    const pille = lieferbar.length ? '<span class="fs-chip fs-gruen f-pille-info">' + I('lkw') + '<span class="fs-lang">' + lieferbar.length + ' kannst du liefern!</span><span class="fs-kurz">' + lieferbar.length + ' bereit</span></span>' : '';
    const vor = (dlg.rueck ? '<button class="fs-btn fs-navy f-klein-btn" data-a="zumFeld">' + I('zurueck') + 'Zurück zum Feld</button>' : '') +
      (lieferbar.length >= 2 ? knopf({ a: 'alleLiefern', farbe: 'gelb', icon: 'lkw', text: 'Alle ' + lieferbar.length + ' liefern', klasse: 'f-klein-btn' }) : '');
    rahmen({ art: 'mitte', ansicht: 'auftraege', kopf: kopfHtml({ icon: 'auftrag', stufe: 'gruen', titel: 'Aufträge', unter: 'Liefern bringt extra Münzen', extra: pille + geldPille() }),
      vor: vor ? '<div class="f-vor-zeile">' + vor + '</div>' : '', inhalt: html });
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Tierhof (je Stall eine Karte: Fuellstaende als Balken, EINE Hauptaktion je Zustand, Rest unter "Mehr")
  // ----------------------------------------------------------------------------------------------
  function dialogTiere(fokus) { const rueck = rueckFeld; rueckFeld = null; dlg = { typ: 'tiere', fokus: fokus || null, rueck, offen: {} }; zeichneTiere(); }
  function stundenText(h) { return h >= 48 ? Math.floor(h / 24) + ' Tage' : h >= 1 ? Math.round(h) + ' Std' : Math.max(0, Math.round(h * 60)) + ' Min'; }
  function stallKarte(d) {
    const S = stand(), now = jetzt(), st = S.tiere[d.id];
    const fokus = dlg.fokus === d.id ? ' f-fokus' : '';
    if (!st) {
      const gesperrt = S.level < d.lvl;
      return '<div class="f-k' + (gesperrt ? ' f-zu' : '') + fokus + '" data-key="st' + d.id + '"><div class="f-k-kopf"><div class="f-k-bild fs-stufe-' + FS.stufe(d) + '">' + I(d.id) + (gesperrt ? I('schloss', 0, 'fs-ecke') : '') + '</div>' +
        '<div class="f-k-tx"><div class="f-k-titel fs-kontur">' + esc(d.stall) + '</div><div class="f-k-unter">' + esc(d.name) + ' geben ' + esc(D.gut(d.gut).name) + '</div></div></div>' +
        '<div class="f-gl">' + zi(d.id, '') + '<span class="f-gl-pfeil">' + I('weiter') + '</span>' + zi(d.gut, esc(D.gut(d.gut).name)) + '</div>' +
        (d.futterKgH ? '<div class="f-futter-wahl">' + I('futter') + 'frisst ' + d.futter.map(g => '<span class="f-futter-gut">' + I(g, 30) + esc(D.gut(g).name) + '</span>').join(' oder ') + '</div>' : '<div class="f-futter-wahl">' + I('haken') + 'Braucht kein Futter</div>') +
        '<div class="f-k-fuss">' + knopf({ a: 'stallBau', id: d.id, farbe: 'gruen', icon: 'tierhof', text: 'Bauen', zeile: muenzZeile(d.bau), grund: gesperrt ? 'Ab Level ' + d.lvl : S.geld < d.bau ? fehltGeld(d.bau - S.geld) : '' }) + '</div></div>';
    }
    const ss = M.stallStand(d.id, now);
    const frei = ss.kap - st.anzahl;
    const futterA = ss.futterKap > 0 ? st.futter / ss.futterKap : 1;
    const lagerA = ss.lagerKap > 0 ? st.lager / ss.lagerKap : 0;
    const hunger = d.futterKgH && st.anzahl > 0 && !ss.laeuft;
    const kaufN = Math.max(1, Math.min(10, frei));
    const tierGrund = frei < 1 ? 'Der Stall ist voll – ausbauen!' : S.geld < d.tierPreis ? fehltGeld(d.tierPreis - S.geld) : '';
    const futterPreis = Math.round(M.futterPreisProT(d));
    // EINE Hauptaktion je Zustand
    let haupt = '';
    if (!st.anzahl) haupt = knopf({ a: 'tierKauf', id: d.id + ':' + kaufN, farbe: 'gruen', gross: true, breit: true, icon: d.id, text: kaufN + ' ' + (kaufN === 1 ? d.tier : d.name) + ' kaufen', zeile: muenzZeile(d.tierPreis * kaufN), grund: tierGrund });
    else if (lagerA >= 0.8 && st.lager >= 1) haupt = knopf({ a: 'einsammeln', id: d.id, farbe: 'gruen', gross: true, breit: true, icon: 'einsammeln', text: 'Einsammeln', zeile: '+' + menge(st.lager) + ' ' + esc(D.gut(d.gut).name) });
    else if (hunger) haupt = ss.futterSilo > 0 ? knopf({ a: 'fuettern', id: d.id, farbe: 'gruen', gross: true, breit: true, icon: 'futter', text: 'Füttern', zeile: 'aus dem Silo' })
      : knopf({ a: 'futterKauf', id: d.id, farbe: 'gruen', gross: true, breit: true, icon: 'zukaufen', text: 'Futter kaufen', zeile: muenzZeile(futterPreis) + ' je t', grund: S.geld < futterPreis / 1000 ? fehltGeld(Math.ceil(futterPreis / 1000 - S.geld)) : '' });
    else if (st.lager >= 1) haupt = knopf({ a: 'einsammeln', id: d.id, farbe: 'gruen', gross: true, breit: true, icon: 'einsammeln', text: 'Einsammeln', zeile: '+' + menge(st.lager) + ' ' + esc(D.gut(d.gut).name) });
    else if (d.futterKgH && futterA < 0.98 && ss.futterSilo > 0) haupt = knopf({ a: 'fuettern', id: d.id, farbe: 'gruen', gross: true, breit: true, icon: 'futter', text: 'Füttern', zeile: 'aus dem Silo' });
    const hauptArt = haupt.indexOf('data-a="fuettern"') >= 0 ? 'fuettern' : haupt.indexOf('data-a="futterKauf"') >= 0 ? 'futterKauf' : '';
    let h = '<div class="f-k f-stall' + fokus + (hunger ? ' f-hunger' : '') + '" data-key="st' + d.id + '"><div class="f-k-kopf"><div class="f-k-bild fs-stufe-' + FS.stufe(d) + '">' + I(d.id) + '</div>' +
      '<div class="f-k-tx"><div class="f-k-titel fs-kontur">' + esc(d.stall) + '</div><div class="f-k-unter">' + st.anzahl + ' von ' + ss.kap + ' ' + esc(d.name) + ' · Stufe ' + (st.stufe + 1) + '</div></div>' +
      (st.auto ? '<span class="fs-marke f-auto">' + I('futter') + 'Automat</span>' : '') + '</div>';
    if (d.futterKgH) {
      h += '<div class="f-fuell">' + I('futter') + '<div class="f-fuell-tx"><span>Futter</span><b' + (hunger ? ' class="f-rot"' : '') + '>' + (hunger ? 'leer!' : 'reicht ' + stundenText(ss.futterStunden)) + '</b></div>' +
        FS.balken(futterA, futterA < 0.2 ? 'rot' : futterA < 0.5 ? 'gelb' : 'gruen', 'fs-dick') + '</div>';
      if (hunger && !ss.futterSilo) h += '<div class="f-futter-wahl">' + I('warnung') + 'Im Silo fehlt ' + d.futter.map(g => '<span class="f-futter-gut">' + I(g, 30) + esc(D.gut(g).name) + '</span>').join(' oder ') + '</div>';
    } else h += '<div class="f-futter-wahl">' + I('haken') + 'Braucht kein Futter</div>';
    h += '<div class="f-fuell">' + I(d.gut) + '<div class="f-fuell-tx"><span>' + esc(D.gut(d.gut).name) + '</span><b>' + menge(st.lager) + ' von ' + menge(ss.lagerKap) + '</b></div>' +
      FS.balken(lagerA, lagerA > 0.9 ? 'rot' : lagerA > 0.6 ? 'gelb' : 'cyan', 'fs-dick') + '</div>';
    h += haupt ? '<div class="f-k-fuss">' + haupt + '</div>' : fuchsZeile('jubelt', st.anzahl ? 'Alles bestens hier!' : 'Kauf ein paar Tiere!', 56);
    // Mehr: alles andere
    h += '<div class="f-zeile2">' + mehrKnopf('t:' + d.id) + '</div>';
    if (offen('t:' + d.id)) {
      h += '<div class="f-mehr-knoepfe">';
      if (d.futterKgH && hauptArt !== 'fuettern') h += knopf({ a: 'fuettern', id: d.id, farbe: 'navy', icon: 'futter', text: 'Füttern', zeile: 'aus dem Silo', grund: futterA >= 0.98 ? 'Der Trog ist voll' : !ss.futterSilo ? 'Kein Futter im Silo' : !st.anzahl ? 'Noch keine Tiere' : '' });
      if (d.futterKgH && hauptArt !== 'futterKauf') h += knopf({ a: 'futterKauf', id: d.id, farbe: 'navy', icon: 'zukaufen', text: 'Futter kaufen', zeile: muenzZeile(futterPreis) + ' je t', grund: futterA >= 0.98 ? 'Der Trog ist voll' : !st.anzahl ? 'Noch keine Tiere' : '' });
      if (st.anzahl) h += knopf({ a: 'tierKauf', id: d.id + ':1', farbe: 'navy', icon: 'plus', text: '1 ' + d.tier, zeile: muenzZeile(d.tierPreis), grund: tierGrund }) +
        knopf({ a: 'tierKauf', id: d.id + ':10', farbe: 'navy', icon: 'plus', text: '10 ' + d.name, zeile: muenzZeile(d.tierPreis * Math.min(10, Math.max(1, frei))), grund: tierGrund });
      if (d.automat && !st.auto) h += knopf({ a: 'automat', id: d.id, farbe: 'navy', icon: 'futter', text: 'Futterautomat', zeile: muenzZeile(d.automat), grund: S.geld < d.automat ? fehltGeld(d.automat - S.geld) : '' });
      const ausK = d.ausbau[st.stufe + 1];
      if (ausK !== undefined) h += knopf({ a: 'stallAus', id: d.id, farbe: 'navy', icon: 'tierhof', text: 'Ausbau: ' + d.kap[st.stufe + 1] + ' Plätze', zeile: muenzZeile(ausK), grund: S.geld < ausK ? fehltGeld(ausK - S.geld) : '' });
      h += '</div><div class="f-k-unter f-rate">' + I('uhr', 26) + (ss.rateH >= 1 ? fmt1(ss.rateH) + ' kg' : fmt(ss.rateH * 1000) + ' g') + ' ' + esc(D.gut(d.gut).name) + ' pro Stunde' + (d.text ? '<br>' + esc(d.text) : '') + '</div>';
    }
    return h + '</div>';
  }
  function zeichneTiere() {
    const S = stand(), now = jetzt();
    const w = D.WETTER[M.wetterTyp(now)];
    const gebaut = D.TIERE.filter(d => S.tiere[d.id]), frei = D.TIERE.filter(d => !S.tiere[d.id] && S.level >= d.lvl), zu = D.TIERE.filter(d => !S.tiere[d.id] && S.level < d.lvl);
    let html = '<div class="f-abschnitt-zeile"><span class="fs-abschnitt">Deine Ställe</span>' + (w.tiere !== 1 ? '<span class="fs-chip f-chip-klein">' + I(w.id) + esc(w.name) + ': Tiere ' + (w.tiere < 1 ? 'langsamer' : 'schneller') + '</span>' : '') + dInfoKnopf('tierInfo') + '</div>';
    if (offen('tierInfo')) html += infoBox('Tiere brauchen Futter aus deinem Silo und liefern Eier, Milch, Wolle oder Honig. Sammle alles ein, bevor der Stall voll ist (24 Stunden Vorrat). Ein Futterautomat füllt den Trog von allein nach.');
    html += gebaut.length ? '<div class="f-raster f-r3">' + gebaut.map(stallKarte).join('') + '</div>' : fuchsZeile('zeigt', 'Bau deinen ersten Stall!', 72);
    if (frei.length || zu.length) html += '<div class="fs-abschnitt">Neue Ställe</div><div class="f-raster f-r3">' + frei.concat(zu.slice(0, 2)).map(stallKarte).join('') + '</div>';
    rahmen({ art: 'mitte', ansicht: 'tiere', kopf: kopfHtml({ icon: 'tierhof', stufe: 'gruen', titel: 'Tierhof', unter: 'Füttern und einsammeln', extra: geldPille() }),
      vor: dlg.rueck ? '<div class="f-vor-zeile"><button class="fs-btn fs-navy f-klein-btn" data-a="zumFeld">' + I('zurueck') + 'Zurück zum Feld</button></div>' : '', inhalt: html });
    if (dlg.fokus && !dlg.fokusGescrollt) { dlg.fokusGescrollt = true; fokusZeigen(); }
  }
  function fokusZeigen() {
    setTimeout(() => { const el = wurzel && wurzel.querySelector('#f-dlg .f-fokus'); if (el && el.scrollIntoView) { try { el.scrollIntoView({ block: 'center' }); } catch (e) { el.scrollIntoView(); } } }, 60);
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Betriebe (Rezept als Gleichung, Produktion als Ring, Starten x1 / so viele wie moeglich, Grund + Weg)
  // ----------------------------------------------------------------------------------------------
  function dialogBetriebe(fokus) { const rueck = rueckFeld; rueckFeld = null; dlg = { typ: 'betriebe', fokus: fokus || null, rueck, offen: {} }; zeichneBetriebe(); }
  function gleichung(r, S) {
    const pfeil = '<span class="f-gl-pfeil">' + I('weiter') + '</span>';
    return '<div class="f-gl">' + r.ein.map(z => zi(z.gut, menge(z.kg), S && (S.silo[z.gut] || 0) < z.kg ? 'f-fehlt' : '')).join('<span class="f-gl-plus">+</span>') + pfeil + zi(r.aus, menge(r.ausKg), 'f-aus-ware') + '</div>';
  }
  function rezeptZeile(b, p, r) {
    const S = stand();
    const moeglich = Math.min.apply(null, r.ein.map(z => Math.floor((S.silo[z.gut] || 0) / z.kg)));
    const platz = 6 - p.queue.length;
    const fehlt = r.ein.find(z => (S.silo[z.gut] || 0) < z.kg);
    const ms = r.sek * 1000 / D.PROD_STUFEN[p.stufe].faktor / M.tempoFaktor();
    const grund = platz < 1 ? 'Die Schlange ist voll' : fehlt ? 'Dir fehlt ' + menge(fehlt.kg - (S.silo[fehlt.gut] || 0)) + ' ' + D.gut(fehlt.gut).name : '';
    const n = Math.min(moeglich, platz);
    let h = '<div class="f-rezept" data-key="rz' + r.id + '">' + gleichung(r, S) + '<div class="f-rezept-zeile"><span class="f-rezept-zeit">' + I('uhr') + grob(ms) + '</span>' +
      '<div class="f-rezept-knoepfe">' + knopf({ a: 'prod', id: b.id + ':' + r.id + ':1', farbe: 'gruen', icon: r.aus, text: 'Starten', grund });
    if (!grund && n >= 2) h += knopf({ a: 'prod', id: b.id + ':' + r.id + ':' + n, farbe: 'navy', text: n + '×', klasse: 'f-alle-btn' });
    if (fehlt && platz >= 1) h += knopf({ a: 'holen', id: fehlt.gut, farbe: 'navy', icon: fehlt.gut, text: 'Holen', klasse: 'f-holen-btn' });
    return h + '</div></div></div>';
  }
  function betriebKarte(b) {
    const S = stand(), now = jetzt(), p = S.produktion[b.id];
    const fokus = dlg.fokus === b.id ? ' f-fokus' : '';
    if (!p) {
      const gesperrt = S.level < b.lvl;
      return '<div class="f-k' + (gesperrt ? ' f-zu' : '') + fokus + '" data-key="b' + b.id + '"><div class="f-k-kopf"><div class="f-k-bild fs-stufe-' + FS.stufe(b) + '">' + I(b.id) + (gesperrt ? I('schloss', 0, 'fs-ecke') : '') + '</div>' +
        '<div class="f-k-tx"><div class="f-k-titel fs-kontur">' + esc(b.name) + '</div><div class="f-k-unter">' + (gesperrt ? 'Ab Level ' + b.lvl : 'Noch nicht gebaut') + '</div></div></div>' +
        b.rezepte.map(r => gleichung(r, null)).join('') +
        '<div class="f-k-fuss">' + knopf({ a: 'bauen', id: b.id, farbe: 'gruen', icon: 'betriebe', text: 'Bauen', zeile: muenzZeile(b.preis), grund: gesperrt ? 'Ab Level ' + b.lvl : S.geld < b.preis ? fehltGeld(b.preis - S.geld) : '' }) + '</div></div>';
    }
    const q0 = p.queue[0], laeuft = q0 && q0.start != null;
    let status;
    if (laeuft) {
      const r = b.rezepte.find(x => x.id === q0.rez), anteil = Math.min(1, Math.max(0, (now - q0.start) / q0.dauer));
      status = '<div class="f-prod">' + FS.ring(anteil, istHandy() ? 84 : 96, { icon: r.aus, farbe: 'violett' }) + '<div class="f-k-tx"><div class="f-prod-titel">' + esc(D.gut(r.aus).name) + '</div><div class="f-prod-zeit">' + I('uhr') + 'noch ' + grob(q0.start + q0.dauer - now) + '</div>' +
        '<div class="f-schlange">' + [0, 1, 2, 3, 4, 5].map(i => '<i class="' + (i < p.queue.length ? 'f-voll' : '') + '"></i>').join('') + '<span>' + p.queue.length + ' von 6</span></div></div></div>';
    } else status = fuchsZeile('gruebelt', 'Hat nichts zu tun. Starte etwas!', 60);
    const n = D.PROD_STUFEN[p.stufe + 1];
    let h = '<div class="f-k f-betrieb' + fokus + '" data-key="b' + b.id + '"><div class="f-k-kopf"><div class="f-k-bild fs-stufe-' + FS.stufe(b) + '">' + I(b.id) + '</div><div class="f-k-tx"><div class="f-k-titel fs-kontur">' + esc(b.name) + '</div>' +
      '<div class="f-k-unter">Stufe ' + (p.stufe + 1) + (D.PROD_STUFEN[p.stufe].faktor > 1 ? ' · ×' + fmt1(D.PROD_STUFEN[p.stufe].faktor) + ' schneller' : '') + '</div></div></div>' + status +
      b.rezepte.map(r => rezeptZeile(b, p, r)).join('');
    h += '<div class="f-zeile2">' + mehrKnopf('b:' + b.id) + '</div>';
    if (offen('b:' + b.id)) {
      h += '<div class="f-mehr-knoepfe">' + (n ? knopf({ a: 'prodAus', id: b.id, farbe: 'navy', icon: 'betriebe', text: 'Ausbauen: ×' + fmt1(n.faktor) + ' schneller', zeile: muenzZeile(Math.round(b.preis * n.preis)), grund: S.geld < Math.round(b.preis * n.preis) ? fehltGeld(Math.round(b.preis * n.preis) - S.geld) : '' })
        : '<span class="fs-marke fs-gelb">' + I('haken') + 'Voll ausgebaut</span>') + '</div>';
      const fakt = D.ALBUM.find(a => a.kat === 'betriebe');
      const k = fakt ? fakt.karten().find(x => x.id === b.id) : null;
      if (k && k.fakt) h += infoBox(esc(k.fakt));
    }
    return h + '</div>';
  }
  function zeichneBetriebe() {
    const S = stand();
    const gebaut = D.PRODUKTION.filter(b => S.produktion[b.id]);
    const frei = D.PRODUKTION.filter(b => !S.produktion[b.id] && S.level >= b.lvl);
    const zu = D.PRODUKTION.filter(b => !S.produktion[b.id] && S.level < b.lvl).sort((a, b) => a.lvl - b.lvl);
    let html = '<div class="f-abschnitt-zeile"><span class="fs-abschnitt">Deine Betriebe</span>' + dInfoKnopf('betrInfo') + '</div>';
    if (offen('betrInfo')) html += infoBox('In Betrieben wird aus Rohstoffen aus deinem Lager mehr Geld: Weizen wird Mehl, Mehl wird Brot, Raps wird Öl. Bis zu 6 Aufträge warten in der Schlange. Die fertige Ware landet im Lager.');
    html += gebaut.length ? '<div class="f-raster f-r3">' + gebaut.map(betriebKarte).join('') + '</div>' : fuchsZeile('zeigt', 'Bau deinen ersten Betrieb!', 72);
    if (frei.length || zu.length) html += '<div class="fs-abschnitt">Neue Betriebe</div><div class="f-raster f-r3">' + frei.concat(zu.slice(0, 2)).map(betriebKarte).join('') + '</div>';
    rahmen({ art: 'mitte', ansicht: 'betriebe', kopf: kopfHtml({ icon: 'betriebe', stufe: 'lila', titel: 'Betriebe', unter: 'Aus Rohstoffen wird mehr Geld', extra: geldPille() }),
      vor: dlg.rueck ? '<div class="f-vor-zeile"><button class="fs-btn fs-navy f-klein-btn" data-a="zumFeld">' + I('zurueck') + 'Zurück zum Feld</button></div>' : '', inhalt: html });
    if (dlg.fokus && !dlg.fokusGescrollt) { dlg.fokusGescrollt = true; fokusZeigen(); }
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Wetter (aktuell + Vorhersage als Icons, Wetterstation, Beregnung-Tipp)
  // ----------------------------------------------------------------------------------------------
  function dialogWetter() { dlg = { typ: 'wetter', offen: {} }; zeichneWetter(); }
  function wirkungZeile(icon, name, f, hochGut) {
    // f > 1: mehr / laenger. hochGut: ist "mehr" gut? (Arbeitszeit: mehr = schlecht)
    const art = Math.abs(f - 1) < 0.001 ? 'gleich' : (f > 1) === hochGut ? 'hoch' : 'runter';
    const text = art === 'gleich' ? 'normal' : hochGut ? (f > 1 ? 'schneller' : 'langsamer') : (f > 1 ? 'langsamer' : 'schneller');
    return '<div class="f-wirkung">' + I(icon) + '<span>' + name + '</span>' + trendPfeil(art === 'hoch' ? 1.2 : art === 'runter' ? 0.8 : 1, 30) + '<b>' + text + '</b></div>';
  }
  function zeichneWetter() {
    const S = stand(), now = jetzt();
    const w = M.wetter(now);
    const saison = { fruehling: 'Frühling', sommer: 'Sommer', herbst: 'Herbst', winter: 'Winter' }[M.jahreszeit(now)];
    const slotMs = D.WETTER_SLOT_MS, bis = (Math.floor(now / slotMs) + 1) * slotMs;
    let html = '<div class="f-k f-wetter-jetzt"><div class="f-k-kopf">' + I(w.id, 0, 'f-wetter-gross') + '<div class="f-k-tx"><div class="f-k-titel fs-kontur">' + esc(w.name) + '</div><div class="f-k-unter">' + saison + ' · wechselt in ' + grob(bis - now) + '</div></div></div>' +
      wirkungZeile('spross', 'Pflanzen', w.wachs, true) + wirkungZeile('traktor', 'Maschinen', w.arbeit, false) + wirkungZeile('huehner', 'Tiere', w.tiere, true) + '</div>';
    const vor = M.wetterVorschau(now);
    html += '<div class="fs-abschnitt">Vorhersage</div>';
    if (vor.length) html += '<div class="f-vorhersage">' + vor.map(v => { const x = D.WETTER[v.typ]; return '<div class="f-vh">' + I(x.id) + '<b>' + esc(x.name) + '</b><span>in ' + grob(v.von - now) + '</span></div>'; }).join('') + '</div>';
    else html += fuchsZeile('gruebelt', 'Ohne Wetterstation siehst du nicht voraus.', 56);
    const n = D.WETTERSTATION[S.wetterstation];
    if (n) html += '<div class="f-k"><div class="f-k-kopf"><div class="f-k-bild fs-stufe-blau">' + I('wetterstation') + '</div><div class="f-k-tx"><div class="f-k-titel fs-kontur">' + esc(n.name) + '</div><div class="f-k-unter">Zeigt ' + n.slots + ' Stunden voraus</div></div></div>' +
      knopf({ a: 'stationKauf', farbe: 'gruen', icon: 'wetterstation', text: 'Bauen', zeile: muenzZeile(n.preis), breit: true, grund: S.level < n.lvl ? 'Ab Level ' + n.lvl : S.geld < n.preis ? fehltGeld(n.preis - S.geld) : '' }) + '</div>';
    const hitzeKommt = w.id === 'hitze' || vor.some(v => v.typ === 'hitze');
    html += '<div class="fs-abschnitt">Tipp</div>' + (hitzeKommt ? fuchsZeile('zeigt', 'Hitze! Beregnung schützt deine Felder.', 60) : fuchsZeile('neutral', 'Regen lässt Pflanzen schneller wachsen.', 60));
    html += '<div class="f-zeile2">' + mehrKnopf('wetterAlle', 'Alle Wetter') + '</div>';
    if (offen('wetterAlle')) html += '<div class="f-wetter-alle">' + Object.keys(D.WETTER).map(id => { const x = D.WETTER[id]; return '<div class="f-wa">' + I(id) + '<div><b>' + esc(x.name) + '</b><span>' + esc(x.text) + '</span></div></div>'; }).join('') +
      infoBox('Beregnung baust du in der Feldkarte ein (ab Level ' + D.BEREGNUNG_LVL + '). Dann wächst das Feld auch bei Hitze normal weiter.') + '</div>';
    rahmen({ art: 'rechts', ansicht: 'wetter', kopf: kopfHtml({ icon: w.id, stufe: 'blau', titel: 'Wetter', unter: esc(w.name) + ' · ' + saison }), inhalt: html });
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Sammlung (Pokal) - Heute / Erfolge / Album
  // ----------------------------------------------------------------------------------------------
  const TAG_ICON = { ernte: 'ernten', jobs: 'traktor', saeen: 'saeen', gruen: 'duengen', verkauft: 'verkaufen', eingesammelt: 'einsammeln', gefuettert: 'futter', produziert: 'betriebe', auftraege: 'auftrag', lernen: 'lernen' };
  const TAG_TEXT = { ernte: 'Ernte {ziel} t', jobs: 'Starte {ziel} Arbeiten', saeen: 'Säe {ziel}× aus', gruen: 'Düngen, spritzen oder walzen: {ziel}×', verkauft: 'Verkaufe für {ziel} Münzen',
    eingesammelt: 'Sammle {ziel}× bei den Tieren ein', gefuettert: 'Füttere deine Tiere', produziert: 'Stelle {ziel}× etwas her', auftraege: 'Liefere einen Auftrag', lernen: 'Mach eine Lernrunde' };
  const ERFOLG_ICON = { ernte: 'ernten', jobs: 'traktor', gruen: 'duengen', pflug: 'pfluegen', fruechte: 'mais', felder: 'felder', maschinen: 'fuhrpark', kraft: 'ps', repariert: 'reparieren', fahrer: 'fahrer',
    verkauft: 'verkaufen', geld: 'muenze', auftraege: 'auftrag', prod: 'betriebe', betriebe: 'muehle', tiere: 'huehner', tierarten: 'tierhof', eingesammelt: 'einsammeln', wetter: 'wetterstation', level: 'level', lernen: 'lernen', tage: 'heute' };
  const ALBUM_ICON = { traktoren: 'traktor', geraete: 'grubbern', ernter: 'maehdrescher', fruechte: 'weizen', tiere: 'tierhof', waren: 'mehl', betriebe: 'betriebe', wetter: 'sonnig' };
  function dialogSammlung(tab, seite) {
    const gleich = dlg && dlg.typ === 'sammlung';
    dlg = { typ: 'sammlung', tab: tab || (gleich ? dlg.tab : 'heute'), seite: seite || (gleich ? dlg.seite : 'traktoren'), karte: gleich ? dlg.karte : null, offen: gleich ? dlg.offen : {} };
    zeichneSammlung();
  }
  function wertText(wert, einheit) {
    const t = wert >= 100 ? fmt(wert) : fmt1(wert);
    return t + (einheit && einheit !== '€' ? ' ' + einheit : '');
  }
  function sammlungZaehler() {
    const S = stand();
    return {
      heute: S.tag ? S.tag.aufgaben.filter(q => q.fertig && !q.abgeholt).length + (S.tag.alle && !S.tag.bonusAbgeholt ? 1 : 0) : 0,
      erfolge: D.ERFOLGE.filter(e => { const r = S.erfolge[e.id]; return r && r.erreicht > r.abgeholt; }).length,
      album: D.ALBUM.filter(a => !S.albumBonus[a.id] && M.albumSeite(a.id).fertig).length
    };
  }
  function heuteHtml() {
    const S = stand(), now = jetzt(), t = S.tag;
    if (!t) return fuchsZeile('neutral', 'Gleich gibt es neue Aufgaben!', 80);
    const serie = M.serieAktuell(now);
    let erste = true;
    let h = '<div class="f-heute-kopf"><div class="f-k f-serie">' + I('serie', 0, 'f-serie-bild') + '<div class="f-k-tx"><div class="f-serie-zahl fs-kontur">' + serie + ' Tag' + (serie === 1 ? '' : 'e') + ' Serie</div>' +
      '<div class="f-k-unter">Pause? Kein Problem – deine Serie bleibt.</div></div></div>' +
      '<div class="f-k f-neu-in">' + I('uhr') + '<div><b>' + grob(M.naechsterTag(now) - now) + '</b><span>bis neue Aufgaben</span></div></div></div>';
    h += '<div class="f-raster f-aufgaben">' + t.aufgaben.map((q, i) => {
      const a = M.tagArt(q.art), w = Math.min(M.tagWert(q), q.ziel), anteil = w / q.ziel;
      const text = (TAG_TEXT[q.art] || a.text).replace('{ziel}', fmt(q.ziel));
      let fuss;
      if (q.abgeholt) fuss = '<span class="fs-marke f-abgeholt">' + I('haken') + 'Abgeholt</span>';
      else if (q.fertig) { fuss = knopf({ a: 'tagAbholen', id: i, farbe: 'gruen', icon: 'geschenk', text: 'Abholen', puls: erste, breit: true }); erste = false; }
      else fuss = '<span class="f-fortschritt">' + (a.einheit === '€' ? I('muenze') : '') + wertText(w, '') + ' / ' + wertText(q.ziel, a.einheit) + '</span>';
      return '<div class="f-k f-aufgabe' + (q.fertig && !q.abgeholt ? ' f-fertig' : '') + '" data-key="tg' + i + '">' + FS.ring(q.fertig ? 1 : anteil, 96, { icon: TAG_ICON[q.art] || 'heute', farbe: q.fertig ? 'gelb' : 'gruen' }) +
        '<div class="f-aufgabe-text">' + esc(text) + '</div><div class="f-lohn f-lohn-klein">' + I('muenze') + '<b>' + fmt(q.geld) + '</b>' + I('xp') + '<b>' + q.xp + '</b></div>' + fuss + '</div>';
    }).join('') + '</div>';
    const b = M.tagBonus(now), fertigN = t.aufgaben.filter(q => q.fertig).length;
    h += '<div class="f-k f-truhe' + (t.alle && !t.bonusAbgeholt ? ' f-fertig' : '') + '">' + I('geschenk', 0, 'f-truhe-bild') + '<div class="f-k-tx"><div class="f-k-titel fs-kontur">Tagesbonus</div>' +
      '<div class="f-k-unter">Alle 3 geschafft = Truhe!' + (serie > 1 ? ' Serie gibt extra.' : '') + '</div><div class="f-lohn f-lohn-klein">' + I('muenze') + '<b>' + fmt(b.geld) + '</b>' + I('xp') + '<b>' + b.xp + '</b></div></div>' +
      (t.bonusAbgeholt ? '<span class="fs-marke f-abgeholt">' + I('haken') + 'Abgeholt</span>' :
        knopf({ a: 'tagBonus', farbe: 'gelb', icon: 'geschenk', text: 'Truhe öffnen', gross: true, grund: t.alle ? '' : 'Noch ' + (t.aufgaben.length - fertigN) + ' Aufgabe' + (t.aufgaben.length - fertigN === 1 ? '' : 'n') })) + '</div>';
    // Schulaufgaben (nur Tablet: FarmLernen/FarmMeldung gibt es auf dem Papa-Handy nicht)
    const plan = (typeof FarmLernen !== 'undefined' && FarmLernen.tagesplan) ? FarmLernen.tagesplan() : [];
    if (plan.length) {
      const belohnt = M.schulHeute(now), anteile = M.schulAnteileHeute(now), okN = plan.filter(x => x.fertig).length;
      const summe = Object.keys(belohnt).reduce((a, k) => a + belohnt[k], 0);
      h += '<div class="f-abschnitt-zeile"><span class="fs-abschnitt">Schulaufgaben ' + okN + '/' + plan.length + '</span>' + dInfoKnopf('schulInfo') + '</div>';
      if (offen('schulInfo')) h += infoBox('Jede geschaffte Schulaufgabe macht auf dem Hof alles schneller: Arbeiten, Felder und Betriebe. Je mehr beim ersten Versuch richtig ist, desto mehr. Alles richtig: alles sofort fertig! Jede Aufgabe zählt einmal am Tag.');
      h += (okN ? fuchsZeile('jubelt', 'Heute schon ' + summe + ' Minuten gespart!', 56) : fuchsZeile('zeigt', 'Mach eine Schulaufgabe – der Hof wird schneller!', 56)) +
        '<div class="f-schul">' + plan.map(x => {
          const gespart = belohnt[x.id];
          const st = x.fertig ? (gespart ? (anteile[x.id] >= 0.999 ? 'Alles sofort fertig!' : gespart + ' Min schneller') : 'wird gutgeschrieben …') : x.n + ' / ' + x.z;
          return '<div class="f-schul-z">' + I(x.fertig ? 'haken' : 'schule') + '<b>' + esc(x.titel) + '</b><span>' + st + '</span></div>';
        }).join('') + '</div>';
    }
    return h;
  }
  function erfolgeHtml() {
    const S = stand();
    let abh = 0, geldAbh = 0, gesamt = 0, erreicht = 0;
    D.ERFOLGE.forEach(e => {
      const r = S.erfolge[e.id] || { erreicht: 0, abgeholt: 0 };
      gesamt += e.stufen.length; erreicht += r.erreicht;
      if (r.erreicht > r.abgeholt) { abh++; for (let i = r.abgeholt; i < r.erreicht; i++) geldAbh += e.stufen[i].geld; }
    });
    let h = '<div class="f-erf-kopf">' + stern(true, 56) + '<div class="f-k-tx"><div class="f-k-titel fs-kontur">' + erreicht + ' von ' + gesamt + ' Sternen</div><div class="f-k-unter">' +
      (abh ? abh + ' Belohnung' + (abh > 1 ? 'en' : '') + ' warten!' : 'Weiter so!') + '</div></div>' +
      (abh ? knopf({ a: 'erfAlle', farbe: 'gelb', icon: 'geschenk', text: 'Alle abholen', zeile: muenzPlus(geldAbh) }) : '') + '</div>';
    let kat = '', offenRaster = false;
    D.ERFOLGE.forEach(e => {
      if (e.kat !== kat) { if (offenRaster) h += '</div>'; kat = e.kat; h += '<div class="fs-abschnitt">' + esc(kat) + '</div><div class="f-raster f-erf-raster">'; offenRaster = true; }
      const r = S.erfolge[e.id] || { erreicht: 0, abgeholt: 0 };
      const w = M.erfolgWert(e.wert), next = e.stufen[r.erreicht];
      const letzte = r.erreicht ? e.stufen[r.erreicht - 1].ziel : 0;
      const anteil = next ? Math.max(0, Math.min(1, (w - letzte) / (next.ziel - letzte))) : 1;
      let belohn = 0; for (let i = r.abgeholt; i < r.erreicht; i++) belohn += e.stufen[i].geld;
      const claim = r.erreicht > r.abgeholt;
      h += '<div class="f-k f-erfolg' + (claim ? ' f-fertig' : '') + '" data-key="e' + e.id + '"><div class="f-k-kopf f-k-kopf-klein"><div class="f-k-bild fs-stufe-' + (r.erreicht >= e.stufen.length ? 'gold' : 'blau') + '">' + I(ERFOLG_ICON[e.id] || 'pokal') + '</div>' +
        '<div class="f-k-tx"><div class="f-k-titel fs-kontur">' + esc(e.name) + '</div><div class="f-k-unter">' + esc(e.text) + '</div></div></div>' +
        '<div class="f-sterne">' + e.stufen.map((x, i) => stern(i < r.erreicht, 38)).join('') + '</div>' +
        (next ? '<div class="f-erf-fort">' + FS.balken(anteil, 'gelb') + '<b>' + (e.einheit === '€' ? I('muenze') : '') + wertText(Math.min(w, next.ziel), '') + ' / ' + wertText(next.ziel, e.einheit) + '</b></div>' : '<div class="f-erf-fort"><b class="f-gold">Alles geschafft!</b></div>') +
        (claim ? knopf({ a: 'erfAbholen', id: e.id, farbe: 'gruen', icon: 'geschenk', text: 'Abholen', zeile: muenzPlus(belohn), breit: true }) :
          next ? '<div class="f-naechste">Nächster Stern: ' + muenzZeile(next.geld) + '</div>' : '') + '</div>';
    });
    if (offenRaster) h += '</div>';
    return h;
  }
  function albumHtml() {
    const S = stand();
    const seiten = D.ALBUM.map(a => ({ a, st: M.albumSeite(a.id) }));
    let h = reiter(seiten.map(x => ({ id: x.a.id, icon: ALBUM_ICON[x.a.id] || 'album', lang: esc(x.a.name) + ' ' + x.st.gesammelt + '/' + x.st.karten.length, kurz: x.st.gesammelt + '/' + x.st.karten.length,
      badge: x.st.fertig && !x.st.bonusAbgeholt ? '!' : '' })), dlg.seite, 'albumSeite');
    const cur = seiten.find(x => x.a.id === dlg.seite) || seiten[0];
    const a = cur.a, st = cur.st;
    h += '<div class="f-k f-seite-kopf"><div class="f-k-bild fs-stufe-gold">' + I(ALBUM_ICON[a.id] || 'album') + '</div><div class="f-k-tx"><div class="f-k-titel fs-kontur">' + esc(a.name) + '</div>' +
      '<div class="f-erf-fort">' + FS.balken(st.gesammelt / st.karten.length, 'gelb') + '<b>' + st.gesammelt + ' von ' + st.karten.length + '</b></div></div>' +
      (st.fertig ? (st.bonusAbgeholt ? '<span class="fs-marke f-abgeholt">' + I('haken') + 'Bonus abgeholt</span>' : knopf({ a: 'albumBonus', id: a.id, farbe: 'gelb', icon: 'geschenk', text: 'Bonus abholen', zeile: muenzPlus(a.bonus.geld) }))
        : '<div class="f-bonus-zu">' + I('geschenk') + '<div><span>Seitenbonus</span><b>' + muenzZeile(a.bonus.geld) + '</b></div></div>') + '</div>';
    const gewaehlt = dlg.karte ? st.karten.find(k => k.id === dlg.karte && k.frei) : null;
    if (gewaehlt) {
      let text;
      if (a.kat === 'maschinen') { const d = D.def(gewaehlt.def); text = D.MARKEN[d.marke].name + ' · ' + shopUnter(d) + '. ' + D.maschinenInfo(d); }
      else text = gewaehlt.fakt || '';
      h += '<div class="fs-mulde f-fakt">' + (a.kat === 'maschinen' ? '<img src="' + vorschauBild(D.def(gewaehlt.def)) + '" alt="">' : I(gewaehlt.id)) + '<div><b>' + esc(gewaehlt.name) + '</b><span>' + esc(text) + '</span></div>' +
        '<button class="fs-btn fs-navy fs-rund" data-a="albumKarte" data-id="" aria-label="Schließen">' + I('schliessen') + '</button></div>';
    } else h += '<div class="f-album-tipp">' + I('info', 30) + 'Tipp auf eine Karte: Wissen!</div>';
    h += '<div class="f-raster f-album-raster">' + st.karten.map(k => {
      const stufeX = a.kat === 'maschinen' ? FS.stufe(D.def(k.def)) : a.kat === 'tiere' ? FS.stufe(D.tier(k.id)) : a.kat === 'betriebe' ? FS.stufe(D.betrieb(k.id)) : a.kat === 'wetter' ? 'blau' : FS.stufe(k.id);
      const bild = a.kat === 'maschinen' ? '<img src="' + vorschauBild(D.def(k.def)) + '" alt="">' : I(k.id);
      if (!k.frei) return '<button class="fs-karte fs-gesperrt f-ak f-ak-zu" data-a="albumZu" data-grund="' + esc(a.hinweis) + '"><div class="fs-karte-bild">' + bild + I('fragezeichen', 0, 'fs-schloss') + '</div><div class="fs-karte-name">???</div><div class="f-ak-text">' + esc(a.hinweis) + '</div></button>';
      return '<button class="fs-karte fs-stufe-' + stufeX + ' f-ak' + (dlg.karte === k.id ? ' f-ak-an' : '') + '" data-a="albumKarte" data-id="' + esc(k.id) + '"><div class="fs-karte-bild">' + bild + '</div><div class="fs-karte-name">' + esc(k.name) + '</div></button>';
    }).join('') + '</div>';
    return h;
  }
  function zeichneSammlung() {
    const z = sammlungZaehler();
    const tabs = [{ id: 'heute', icon: 'heute', lang: 'Heute', badge: z.heute || '' }, { id: 'erfolge', icon: 'pokal', lang: 'Erfolge', badge: z.erfolge || '' }, { id: 'album', icon: 'album', lang: 'Album', badge: z.album || '' }];
    const inhalt = dlg.tab === 'heute' ? heuteHtml() : dlg.tab === 'erfolge' ? erfolgeHtml() : albumHtml();
    rahmen({ art: 'mitte', ansicht: 'sammlung' + dlg.tab + (dlg.tab === 'album' ? dlg.seite : ''), kopf: kopfHtml({ icon: 'pokal', stufe: 'gold', titel: 'Erfolge & Album', unter: 'Belohnungen abholen', extra: geldPille() }),
      vor: reiter(tabs, dlg.tab, 'sammlungTab'), inhalt });
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Meine Felder (Liste mit Ring/Status, Kaufen)
  // ----------------------------------------------------------------------------------------------
  function dialogFelder() { dlg = { typ: 'felder', offen: {} }; zeichneFelder(); }
  function zeichneFelder() {
    const S = stand(), now = jetzt();
    let html = '<div class="f-raster f-felder">';
    D.FELDER.forEach(d => {
      const f = S.felder[d.id];
      if (!f) return;
      const job = M.jobAufFeld(d.id);
      let anteil = 0, text, ringIcon = feldIcon(f), farbe = 'gruen', marke = '';
      if (job) { const st = M.jobStand(job, now); anteil = st.teil === 'arbeit' ? st.p : st.teil === 'rueck' ? 1 : 0; farbe = 'cyan'; ringIcon = job.schritt; text = SCHRITT_KURZ[job.schritt] + (st.teil === 'arbeit' ? ' · noch ' + grob(st.restMs) : st.teil === 'hin' ? ' · fährt hin' : ' · fertig'); }
      else if (f.phase === 'waechst') { anteil = M.fortschrittWachstum(f, now); text = phasenText(f) + ' · ' + grob(M.restWachsen(d.id, now)); }
      else if (f.phase === 'reif') { anteil = 1; farbe = 'gelb'; text = phasenText(f); marke = '<span class="fs-marke fs-gelb">' + I('ernten') + 'Ernten!</span>'; }
      else { text = phasenText(f) + ' · wartet auf dich'; marke = '<span class="fs-marke">' + I('ausrufe') + 'Arbeit</span>'; }
      html += '<div class="f-k f-feldz" data-key="fz' + d.id + '">' + FS.ring(anteil, 76, { icon: ringIcon, farbe, klasse: 'f-feld-ring' }) +
        '<div class="f-k-tx"><div class="f-k-titel fs-kontur">' + esc(d.name) + '</div><div class="f-k-unter">' + fmt1(d.ha) + ' ha · ' + esc(text) + '</div>' +
        '<div class="f-feldz-marken">' + marke + (f.auto ? '<span class="fs-marke">' + I('fahrer') + 'Fahrer</span>' : '') + '</div></div>' +
        '<div class="f-feldz-knoepfe"><button class="fs-btn fs-navy fs-rund" data-a="zeigen" data-id="' + d.id + '" aria-label="Auf der Karte zeigen">' + I('karte_zeigen') + '</button>' +
        knopf({ a: 'feldoeffnen', id: d.id, farbe: 'gruen', text: 'Öffnen' }) + '</div></div>';
    });
    html += '</div>';
    const frei = D.FELDER.filter(d => !S.felder[d.id]).sort((a, b) => a.lvl - b.lvl || a.preis - b.preis);
    if (frei.length) {
      html += '<div class="fs-abschnitt">Zu kaufen</div><div class="f-raster f-felder">' + frei.slice(0, 6).map(d => {
        const zu = S.level < d.lvl;
        return '<div class="f-k f-feldz' + (zu ? ' f-zu' : '') + '"><div class="f-k-bild fs-stufe-gold">' + I(zu ? 'schloss' : 'felder') + '</div><div class="f-k-tx"><div class="f-k-titel fs-kontur">' + esc(d.name) + '</div>' +
          '<div class="f-k-unter">' + fmt1(d.ha) + ' ha · ' + (zu ? 'ab Level ' + d.lvl : muenzZeile(d.preis)) + '</div></div>' +
          '<div class="f-feldz-knoepfe"><button class="fs-btn fs-navy fs-rund" data-a="zeigen" data-id="' + d.id + '" aria-label="Auf der Karte zeigen">' + I('karte_zeigen') + '</button>' +
          knopf({ a: 'feldoeffnen', id: d.id, farbe: 'navy', text: 'Ansehen' }) + '</div></div>';
      }).join('') + '</div>';
    }
    rahmen({ art: 'mitte', ansicht: 'felder', kopf: kopfHtml({ icon: 'felder', stufe: 'gruen', titel: 'Meine Felder', unter: Object.keys(S.felder).length + ' Felder', extra: geldPille() }), inhalt: html });
  }

  // ----------------------------------------------------------------------------------------------
  // Dialog: Menue / Chronik (Fern) / Hilfe
  // ----------------------------------------------------------------------------------------------
  function dialogMenue() { dlg = { typ: 'menue' }; zeichneMenue(); }
  function zeichneMenue() {
    if (!dlg || dlg.typ !== 'menue') dlg = { typ: 'menue' };
    const S = stand(), wenig = FS.effekteWenig();
    let h = '<div class="f-menue">' +
      '<button class="fs-btn fs-gelb fs-breit" data-a="zu">' + I('weiter') + 'Weiterspielen</button>' +
      '<button class="fs-btn fs-navy fs-breit" data-a="felder">' + I('felder') + 'Meine Felder</button>' +
      '<button class="fs-btn fs-navy fs-breit" data-a="fuhrpark">' + I('fuhrpark') + 'Meine Maschinen</button>' +
      '<button class="fs-btn fs-navy fs-breit" data-a="wetter">' + I(M.wetter(jetzt()).id) + 'Wetter</button>' +
      '<button class="fs-btn fs-navy fs-breit" data-a="hilfe">' + I('fragezeichen') + 'So geht\'s</button>' +
      (fern && fern.log.length ? '<button class="fs-btn fs-navy fs-breit" data-a="chronik">' + I('chronik') + 'Was zuletzt passiert ist</button>' : '') +
      '<button class="fs-btn fs-navy fs-breit" data-a="ton">' + I(S.ton ? 'ton_an' : 'ton_aus') + 'Töne: ' + (S.ton ? 'an' : 'aus') + '</button>' +
      '<button class="fs-btn fs-navy fs-breit" data-a="effekte">' + I('effekte') + 'Effekte: ' + (wenig ? 'wenig' : 'voll') + '</button>' +
      '<button class="fs-btn fs-rot fs-breit" data-a="beenden">' + I('zurueck') + 'Hof verlassen</button></div>' +
      '<div class="f-stat-zeile">' + zi('level', 'Level ' + S.level) + zi('ernten', fmt(S.statistik.geerntet / 1000) + ' t') + zi('traktor', fmt(S.statistik.jobs)) + '</div>';
    // Papa-Geste: 5x auf "Menü" tippen
    if (tempoKlicks >= 5 && (!fern || fern.von === 'papa')) {
      h += '<div class="fs-abschnitt">Für Papa: Zeitraffer</div><div class="f-tempo">' + [1, 5, 20, 100].map(x => '<button class="fs-btn ' + (S.tempo === x ? 'fs-gruen' : 'fs-navy') + '" data-a="tempo" data-id="' + x + '">×' + x + '</button>').join('') + '</div>' +
        '<div class="fs-mulde f-statzeile">Gilt für neu gestartete Arbeiten und Wachstum.</div>';
      if (!fern) h += '<div class="f-zeile2"><button class="fs-btn fs-rot f-klein-btn" data-a="neu">' + I('warnung') + 'Neu anfangen</button></div>';
    }
    rahmen({ art: 'rechts', ansicht: 'menue', kopf: '<div class="fs-kopf-bild">' + I('menue') + '</div><div class="fs-kopf-text"><span class="fs-kopf-titel" data-a="tempoKlick">Menü</span><span class="fs-kopf-unter">Hof-Farm</span></div><button class="fs-btn fs-rot fs-rund" data-a="zu" aria-label="Schließen">' + I('schliessen') + '</button>', inhalt: h });
  }
  // Chronik (gemeinsamer Hof): was Max und Papa zuletzt gemacht haben. testLog nur fuer Tests (ohne Fern-Verbindung).
  function dialogChronik(testLog) { dlg = { typ: 'chronik', testLog: testLog || null }; zeichneChronik(); }
  function zeichneChronik() {
    const liste = (fern && fern.log) ? fern.log : (dlg.testLog || []);
    const html = liste.length ? '<div class="f-chronik-liste">' + liste.slice().reverse().map(e => '<div class="f-chronik-z">' + I(e.von === 'papa' ? 'papa' : 'fahrer') + '<div><b>' + (MITSPIELER[e.von] || esc(e.von)) + '</b><span>' + esc(e.text) + '</span></div></div>').join('') + '</div>'
      : fuchsZeile('neutral', 'Noch ist nichts passiert.', 72);
    rahmen({ art: 'rechts', ansicht: 'chronik', kopf: kopfHtml({ zurueck: ['menue'], icon: 'chronik', stufe: 'blau', titel: 'Chronik', unter: 'Was zuletzt passiert ist' }), inhalt: html });
  }
  const HILFE = [
    ['felder', 'Tipp aufs Feld. Gelb ist der nächste Schritt.'],
    ['traktor', 'Maschinen fahren allein – auch wenn du weg bist.'],
    ['ernten', 'Reif? Tipp auf die Sichel-Blase!'],
    ['silo', 'Die Ernte kommt ins Lager. Verkaufen oder liefern!'],
    ['lernen', 'Lernrunde: Wissen macht die Saat schneller.'],
    ['pokal', 'Beim Pokal holst du Belohnungen ab.']
  ];
  const HILFE_MEHR = [
    ['duengen', 'Düngen, Spritzen, Walzen: mehr Ernte.'],
    ['betriebe', 'Betriebe machen aus Weizen Mehl und Brot.'],
    ['tierhof', 'Tiere füttern, dann Eier und Milch einsammeln.'],
    ['haendler', 'Beim Händler gibt es größere Maschinen und Fahrer.'],
    ['sonnig', 'Regen lässt wachsen, Hitze bremst.'],
    ['heute', 'Jeden Tag 3 Aufgaben. Pause? Serie bleibt.'],
    ['level', 'Neues Level: neue Felder, Früchte, Maschinen.'],
    ['auftrag', 'Aufträge zahlen mehr als der Markt.']
  ];
  function dialogHilfe() { dlg = { typ: 'hilfe', offen: {} }; zeichneHilfe(); }
  function zeichneHilfe() {
    const karte = x => '<div class="f-k f-hilfe-k">' + I(x[0], 0, 'f-hilfe-bild') + '<div>' + esc(x[1]) + '</div></div>';
    let html = fuchsZeile('jubelt', 'Ich bin Fritz! Oben steht dein nächstes Ziel.', 84) + '<div class="f-raster f-hilfe">' + HILFE.map(karte).join('') + '</div>' +
      '<div class="f-zeile2">' + mehrKnopf('hilfeMehr', 'Mehr Tipps') + '</div>';
    if (offen('hilfeMehr')) html += '<div class="f-raster f-hilfe">' + HILFE_MEHR.map(karte).join('') + '</div>' +
      infoBox('Am Anfang laufen die Arbeiten extra schnell – bis du deine erste Ernte verkauft hast.');
    html += '<div class="f-hilfe-los">' + knopf({ a: 'zu', farbe: 'gelb', gross: true, text: 'Los geht\'s!' }) + '</div>';
    rahmen({ art: 'mitte', ansicht: 'hilfe', kopf: kopfHtml({ icon: 'fragezeichen', stufe: 'blau', titel: 'So geht\'s', unter: 'Dein Hof in 6 Bildern' }), inhalt: html });
  }

  // ----------------------------------------------------------------------------------------------
  // Aktionen (Klicks). Gedimmte Knoepfe (.fs-aus) sind antippbar und zeigen ihren Grund. 300 ms Doppeltipp-Sperre je Knopf.
  // ----------------------------------------------------------------------------------------------
  function klick(e) {
    const el = e.target.closest('[data-a]');
    if (!el || !wurzel || !wurzel.contains(el) || el.disabled) return;
    const a = el.getAttribute('data-a'), id = el.getAttribute('data-id');
    if (a !== 'tempoKlick' && a !== 'zoom+' && a !== 'zoom-' && gesperrt('k|' + a + '|' + (id || ''), 300)) return;
    if (el.classList.contains('fs-aus') && el.hasAttribute('data-grund')) { toast(el.getAttribute('data-grund'), 'warn', 'grund', 'schloss'); piep('fehler'); return; }
    aktion(a, id, el);
  }
  function ergebnis(r, okText, typ, icon) {
    if (r && r.ok) { if (okText) toast(okText, typ || 'gut', 'erg', icon); piep(typ === 'geld' ? 'geld' : 'fertig'); return true; }
    toast((r && r.grund) || 'Das geht gerade nicht.', 'warn', 'erg'); piep('fehler');
    return false;
  }
  function aktion(a, id, el) {
    const S = stand();
    switch (a) {
      case 'zu': return dialogZu();
      case 'zoom+': { const fm = freieMitte(); schwung = null; cam.ziel = null; return zoomUm(1.25, fm.x, fm.y); }
      case 'zoom-': { const fm = freieMitte(); schwung = null; cam.ziel = null; return zoomUm(1 / 1.25, fm.x, fm.y); }
      case 'felder': return dialogFelder();
      case 'auftraege': return dialogAuftraege();
      case 'lager': return dialogLager();
      case 'betriebe': return dialogBetriebe();
      case 'tiere': return dialogTiere();
      case 'sammlung': return dialogSammlung(id || undefined);
      case 'tagTab': return dialogSammlung('heute');
      case 'tagAbholen': { const r = M.tagAbholen(+id); if (ergebnis(r, r.ok ? '+' + fmt(r.geld) + ' Münzen!' : '', 'geld', 'heute')) { zeichneSammlung(); speichern(); } return; }
      case 'tagBonus': { const r = M.tagBonusAbholen(jetzt()); if (ergebnis(r, r.ok ? 'Truhe: +' + fmt(r.geld) + ' Münzen!' : '', 'geld', 'geschenk')) { FS.konfetti(12); zeichneSammlung(); speichern(); } return; }
      case 'sammlungTab': dlg.tab = id; dlg.karte = null; return zeichneSammlung();
      case 'albumSeite': dlg.seite = id; dlg.karte = null; return zeichneSammlung();
      case 'albumKarte': dlg.karte = id && dlg.karte !== id ? id : null; return zeichneSammlung();
      case 'albumZu': toast((el && el.getAttribute('data-grund')) || 'Noch nicht gesammelt', '', 'grund', 'fragezeichen'); return;
      case 'erfAbholen': { const r = M.erfolgAbholen(id); if (ergebnis(r, r.ok ? '+' + fmt(r.geld) + ' Münzen abgeholt!' : '', 'geld', 'pokal')) { zeichneSammlung(); speichern(); } return; }
      case 'erfAlle': { let sum = 0; D.ERFOLGE.forEach(e => { const r = M.erfolgAbholen(e.id); if (r.ok) sum += r.geld; }); if (sum) { ergebnis({ ok: true }, '+' + fmt(sum) + ' Münzen abgeholt!', 'geld', 'pokal'); FS.konfetti(10); zeichneSammlung(); speichern(); } return; }
      case 'albumBonus': { const r = M.albumBonusAbholen(id); if (ergebnis(r, r.ok ? 'Seitenbonus: +' + fmt(r.geld) + ' Münzen!' : '', 'geld', 'album')) { FS.konfetti(10); zeichneSammlung(); speichern(); } return; }
      case 'wetter': return dialogWetter();
      case 'fuhrpark': merkeFeld(); return dialogShop('fuhrpark');
      case 'shop': return dialogShop(id || 'traktor');
      case 'menue': return dialogMenue();
      case 'hilfe': return dialogHilfe();
      case 'chronik': return dialogChronik();
      case 'auf': if (!dlg) return; dlg.offen = dlg.offen || {}; dlg.offen[id] = !dlg.offen[id]; return dialogAktualisieren(false);
      case 'ziel': case 'hinweisZeigen': return zielAusfuehren();
      case 'tempoKlick': tempoKlicks++; if (tempoKlicks === 5) zeichneMenue(); return;
      case 'tempo': M.tempoSetzen(+id); toast('Zeitraffer ×' + id, 'gut', 'tempo', 'tempo'); return zeichneMenue();
      case 'ton': S.ton = !S.ton; if (S.ton) tonStart(); return zeichneMenue();
      case 'effekte': FS.effekteSetzen(!FS.effekteWenig()); FS.anwenden(wurzel); return zeichneMenue();
      case 'neu': bestaetigen('Dann ist der ganze Hof weg. Wirklich alles löschen?', () => { M.neu(jetzt()); M.simuliere(jetzt()); speichern(); dialogZu(); geldLetzt = null; toast('Neuer Hof!', 'gut', 'neu'); }, 'Alles löschen', { titel: 'Neu anfangen?' }); return;
      case 'levelZu': return levelZu();
      case 'rundWeiter': return rundgangZeigen(rundgangSchritt + 1);
      // ---- Feldkarte ----
      case 'starte': if (dlg && dlg.typ === 'feld') starteSchritt(dlg.id, id); return;
      case 'gefahr': {
        if (!dlg || dlg.typ !== 'feld') return;
        const f = S.felder[dlg.id], fid = dlg.id;
        bestaetigen('Der Pflug macht alle Pflanzen auf dem Feld kaputt.', () => { if (dlg && dlg.typ === 'feld' && dlg.id === fid) starteSchritt(fid, 'pfluegen'); }, 'Ja, pflügen',
          { titel: 'Achtung!', vorher: [f.frucht || 'spross', f.phase === 'reif' ? 'reif' : 'wächst'], nachher: ['boden', 'alles weg'], neinText: 'Nein, stopp!' });
        return;
      }
      case 'kachel': if (!dlg || dlg.typ !== 'feld') return; dlg.fokus = id; dlg.info = false; return zeichneFeldDialog();
      case 'erledigt': toast((el && el.getAttribute('data-grund')) || 'Schon erledigt!', 'gut', 'grund', 'haken'); return;
      case 'fokusWeg': dlg.fokus = null; dlg.info = false; return zeichneFeldDialog();
      case 'feldInfo': dlg.info = !dlg.info; return zeichneFeldDialog();
      case 'mehr': dlg.mehr = !dlg.mehr; return zeichneFeldDialog();
      case 'maschineAendern': { const h = dlg.haupt || {}; dlg.sub = h.art === 'saat' ? { schritt: 'saeen', wahl: true, von: 'karte', fokusVorher: dlg.fokus } : { schritt: h.schritt, fokusVorher: dlg.fokus }; dlg.info = false; return zeichneFeldDialog(); }
      case 'saatMaschine': dlg.sub = { schritt: 'saeen', wahl: true, von: 'saat' }; dlg.info = false; return zeichneFeldDialog();
      case 'nimm': {
        const p = id.split(':'), s = dlg.sub;
        dlg.manuell[s.schritt] = { geraet: +p[0] || null, traktor: +p[1] };
        dlg.info = false;
        if (s.von === 'saat') dlg.sub = { schritt: 'saeen' };
        else { dlg.sub = null; dlg.fokus = s.fokusVorher !== undefined ? s.fokusVorher : null; }
        toast('Maschine gewählt!', 'gut', 'erg', 'haken');
        return zeichneFeldDialog();
      }
      case 'traktorWechsel': {
        const o = M.optionen(dlg.id, dlg.sub.schritt, dlg.sub.frucht).find(x => String(x.geraet || x.traktor) === String(id));
        const liste = o ? (o.traktoren || [o.traktor]) : [];
        if (!liste.length) return;
        let cur = dlg.wahl[id];
        if (cur === undefined) { const w = besteWahl(dlg.id, dlg.sub.schritt, dlg.sub.frucht); cur = w && (w.geraet || 0) === (o.geraet || 0) ? Math.max(0, liste.indexOf(w.traktor)) : 0; }
        dlg.wahl[id] = (cur + 1) % liste.length;
        return zeichneFeldDialog();
      }
      case 'feldzurueck': {
        const s = dlg.sub; dlg.info = false;
        if (s && s.wahl && s.von === 'saat') dlg.sub = { schritt: 'saeen' };
        else { dlg.sub = null; if (s && s.fokusVorher !== undefined) dlg.fokus = s.fokusVorher; }
        return zeichneFeldDialog();
      }
      case 'saatwahl': dlg.sub = { schritt: 'saeen' }; dlg.info = false; return zeichneFeldDialog();
      case 'saat': return saatGewaehlt(id);
      case 'saatMehr': dlg.alleFr = !dlg.alleFr; return zeichneFeldDialog();
      case 'zumHaendler': return zumHaendler(id);
      case 'zumFeld': {
        const r = dlg && dlg.rueck;
        if (!r) return dialogZu();
        dlg = null;
        dialogFeld(r.id);
        if (dlg && dlg.typ === 'feld') { dlg.sub = r.sub || null; dlg.manuell = r.manuell || {}; zeichneFeldDialog(); }
        return;
      }
      case 'lernStart': {
        if (typeof FarmLernen === 'undefined' || !FarmLernen.verfuegbar()) { toast('Lernkarten gibt es nur am Tablet.', 'warn', 'lern', 'lernen'); return; }
        const karten = FarmLernen.waehle(D.LERN_KARTEN);
        if (!karten.length) { toast('Gerade sind keine Lernkarten da.', 'warn', 'lern', 'lernen'); return; }
        dlg.info = false;
        dlg.lern = { karten, i: 0, auf: false, richtig: 0, gewusst: [], ergebnis: null }; return zeichneFeldDialog();
      }
      case 'lernUm': if (dlg.lern) dlg.lern.auf = true; return zeichneFeldDialog();
      case 'lernWeiss': case 'lernNicht': {
        const L = dlg.lern, ok = a === 'lernWeiss';
        if (!L || L.ergebnis || !L.auf) return;
        FarmLernen.melde(L.karten[L.i], ok);
        L.gewusst[L.i] = ok; if (ok) L.richtig++;
        L.i++; L.auf = false;
        if (L.i >= L.karten.length) {
          L.ergebnis = M.lernBeschleunigen(dlg.id, L.richtig, jetzt());
          if (L.ergebnis && L.ergebnis.ok) { piep(L.richtig ? 'level' : 'fehler'); speichern(); if (L.richtig >= 4) FS.konfetti(10); }
        }
        return zeichneFeldDialog();
      }
      case 'lernAbbruch': case 'lernEnde': dlg.lern = null; zeichneFeldDialog(); levelNaechstes(); return;
      case 'confJa': { const fn = bestaetigenFn; bestaetigenFn = null; confZu(); if (fn) fn(); return; }
      case 'confNein': bestaetigenFn = null; confZu(); return;
      case 'fernNochmal': return fernStartVersuch();
      case 'beenden': return schliessen();
      case 'jobAbbruch': {
        const fid = dlg && dlg.id;
        bestaetigen('Dann sind die Kosten weg. Das Feld bleibt, wie es ist.', () => { M.arbeitAbbrechen(+id); speichern(); if (dlg && dlg.typ === 'feld' && dlg.id === fid) { dlg.sub = null; zeichneFeldDialog(); } }, 'Abbrechen', { titel: 'Arbeit abbrechen?', neinText: 'Weiterarbeiten' });
        return;
      }
      case 'autoAn': if (ergebnis(M.autoSetzen(dlg.id, id), 'Der Fahrer hilft jetzt hier!', 'gut', 'fahrer')) { zeichneFeldDialog(); speichern(); } return;
      case 'autoAus': M.autoSetzen(dlg.id, null); zeichneFeldDialog(); speichern(); return;
      case 'zeigen': {
        const fid = +id;
        if (istHochHandy() || !dlg || dlg.typ !== 'feld') { dialogZu(); const m = feldMitte(fid); fliegeZu(m.x, m.y, Math.max(cam.z, 0.8)); }
        else fliegeZuFeld(fid, Math.max(cam.z, 0.8));
        return;
      }
      case 'feldoeffnen': return dialogFeld(+id);
      case 'feldkauf': { const r = M.feldKaufen(+id); if (ergebnis(r, D.feld(+id).name + ' gehört jetzt dir!', 'gut', 'felder')) { FS.konfetti(8); dialogFeld(+id); speichern(); } return; }
      case 'beregnung': if (ergebnis(M.beregnungKaufen(dlg.id), 'Beregnung eingebaut!', 'gut', 'beregnung')) { dlg.fokus = null; zeichneFeldDialog(); speichern(); } return;
      case 'shoptab': dlg.tab = id; dlg.info = null; return zeichneShop();
      case 'mInfo': dlg.info = dlg.info === id ? null : id; return zeichneShop();
      case 'kaufen': { const r = M.maschineKaufen(id); if (ergebnis(r, D.def(id).name + ' gekauft!', 'gut', maschinenIcon(D.def(id)))) { if (dlg && dlg.typ === 'shop' && dlg.rueck) dlg.gekauft = true; FS.konfetti(8); zeichneShop(); speichern(); } return; }
      case 'fahrerKauf': if (ergebnis(M.fahrerKaufen(), 'Fahrer eingestellt!', 'gut', 'fahrer')) { zeichneShop(); speichern(); } return;
      case 'siloKauf': if (ergebnis(M.lagerAusbauen(), 'Das Silo ist größer!', 'gut', 'silo')) { dialogAktualisieren(false); speichern(); } return;
      case 'verkauf': {
        const p = id.split(':'), had = S.silo[p[0]] || 0, kg = p[1] === 'half' ? had / 2 : had;
        const r = M.verkaufen(p[0], kg);
        if (ergebnis(r, r.ok ? '+' + fmt(r.erloes) + ' Münzen verkauft' : '', 'geld')) { zeichneLager(); speichern(); }
        return;
      }
      case 'liefern': { const r = M.auftragLiefern(+id); if (ergebnis(r, r.ok ? 'Geliefert! +' + fmt(r.lohn) + ' Münzen' : '', 'geld', 'lkw')) { zeichneAuftraege(); speichern(); } return; }
      case 'alleLiefern': {
        const ids = S.auftraege.filter(x => (S.silo[x.gut] || 0) >= x.kg).map(x => x.id);
        let sum = 0, n = 0;
        ids.forEach(i => { const r = M.auftragLiefern(i); if (r && r.ok) { sum += r.lohn; n++; } });
        if (n) { ergebnis({ ok: true }, n + ' geliefert! +' + fmt(sum) + ' Münzen', 'geld', 'lkw'); FS.konfetti(8); }
        else ergebnis({ ok: false, grund: 'Im Lager fehlt noch etwas.' });
        zeichneAuftraege(); speichern();
        return;
      }
      case 'anbauen': return anbauen(id);
      case 'holen': return wegZuGut(id);
      case 'zumTier': return dialogTiere(id);
      case 'herstellen': return dialogBetriebe(id);
      case 'bauen': if (ergebnis(M.produktionBauen(id), D.betrieb(id).name + ' gebaut!', 'gut', id)) { FS.konfetti(8); zeichneBetriebe(); speichern(); } return;
      case 'prodAus': if (ergebnis(M.produktionAusbauen(id), 'Betrieb ausgebaut!', 'gut', id)) { zeichneBetriebe(); speichern(); } return;
      case 'prod': { const p = id.split(':'); const r = M.produktionStarten(p[0], p[1], +p[2], jetzt()); if (ergebnis(r, r.ok ? r.anzahl + '× ' + D.gut(p[1]).name + ' in Arbeit' : '', 'gut', p[1])) { zeichneBetriebe(); speichern(); } return; }
      case 'stationKauf': if (ergebnis(M.wetterstationKaufen(), 'Wetterstation gebaut!', 'gut', 'wetterstation')) { zeichneWetter(); speichern(); } return;
      case 'stallBau': if (ergebnis(M.stallBauen(id), D.tier(id).stall + ' gebaut!', 'gut', id)) { FS.konfetti(8); zeichneTiere(); speichern(); } return;
      case 'tierKauf': { const p = id.split(':'); const r = M.tierKaufen(p[0], +p[1]); if (ergebnis(r, r.ok ? r.anzahl + ' ' + (r.anzahl === 1 ? D.tier(p[0]).tier : D.tier(p[0]).name) + ' gekauft!' : '', 'gut', p[0])) { zeichneTiere(); speichern(); } return; }
      case 'stallAus': if (ergebnis(M.stallAusbauen(id), 'Stall ausgebaut!', 'gut', id)) { zeichneTiere(); speichern(); } return;
      case 'automat': if (ergebnis(M.automatKaufen(id), 'Futterautomat eingebaut!', 'gut', 'futter')) { zeichneTiere(); speichern(); } return;
      case 'zukauf': { const p = id.split(':'); const r = M.zukaufen(p[0], +p[1], jetzt()); if (ergebnis(r, r.ok ? menge(r.kg) + ' ' + D.gut(p[0]).name + ' gekauft' : '', 'gut', p[0])) { dialogAktualisieren(false); speichern(); } return; }
      case 'futterKauf': { const r = M.futterKaufen(id); if (ergebnis(r, r.ok ? menge(r.kg) + ' Futter gekauft' : '', 'gut', 'futter')) { zeichneTiere(); speichern(); } return; }
      case 'fuettern': return fuetternMitEffekt(id, letzterTipp ? { x: letzterTipp.x, y: letzterTipp.y } : null);
      case 'einsammeln': return einsammelnMitEffekt(id, letzterTipp ? { x: letzterTipp.x, y: letzterTipp.y } : null);
      case 'reparieren': if (ergebnis(M.maschineReparieren(+id), 'Repariert – wie neu!', 'gut', 'reparieren')) { zeichneShop(); speichern(); } return;
      case 'mverkauf': {
        const m = M.maschine(+id);
        if (!m) return;
        const d = D.def(m.id);
        bestaetigen('Dann ist ' + d.name + ' weg.', () => { if (ergebnis(M.maschineVerkaufen(+id), d.name + ' verkauft.', 'geld')) { dialogAktualisieren(false); speichern(); } }, 'Verkaufen',
          { titel: 'Verkaufen?', vorher: [maschinenIcon(d), d.name], nachher: ['muenze', '+' + fmt(M.verkaufswert(m))], neinText: 'Behalten' });
        return;
      }

      default: return;
    }
  }
  function taste(e) {
    if (!wurzel) return;
    const k = (e.key || '').toLowerCase();
    if (k === 'escape') { if (wurzel.querySelector('#f-conf')) aktion('confNein'); else if (levelOffen) levelZu(); else if (dlg) dialogZu(); else dialogMenue(); }
    else if (k === '+' || k === '=') aktion('zoom+');
    else if (k === '-') aktion('zoom-');
    else if (!dlg && (k === 'arrowleft' || k === 'a')) { cam.x -= 60 / cam.z; klemmen(); }
    else if (!dlg && (k === 'arrowright' || k === 'd')) { cam.x += 60 / cam.z; klemmen(); }
    else if (!dlg && (k === 'arrowup' || k === 'w')) { cam.y -= 60 / cam.z; klemmen(); }
    else if (!dlg && (k === 'arrowdown' || k === 's')) { cam.y += 60 / cam.z; klemmen(); }
  }

  // ----------------------------------------------------------------------------------------------
  // Ziel-Logik (naechster sinnvoller Schritt, Fuchs-Banner). Reihenfolge laut SPEC:
  // reif > Belohnung > Auftrag lieferbar > Feld braucht Arbeit/Saat > Tiere > Betrieb leer > Maschine kaputt > Lohn offen >
  // Lager fast voll > Feld kaufbar > sonst Lernrunde / laufende Arbeit / Lob
  // ----------------------------------------------------------------------------------------------
  function hinweisBerechnen() {
    const S = stand(), now = jetzt();
    if (!S) return null;
    const felder = Object.keys(S.felder).map(Number);
    const fn = id => D.feld(id).name;
    for (const id of felder) { if (!M.jobAufFeld(id) && S.felder[id].phase === 'reif') return { t: fn(id) + ' ist reif – ernten!', pose: 'zeigt', feld: id, art: 'reif' }; }
    const abh = M.abholbar();
    if (abh) return { t: abh === 1 ? 'Belohnung abholen!' : 'Belohnungen abholen!', pose: 'jubelt', dialog: 'sammlung', art: 'belohnung' };
    const lf = S.auftraege.filter(x => (S.silo[x.gut] || 0) >= x.kg).length;
    if (lf) return { t: lf === 1 ? 'Auftrag liefern!' : lf + ' Aufträge liefern!', pose: 'zeigt', dialog: 'auftraege', art: 'auftrag' };
    for (const id of felder) {
      const f = S.felder[id];
      if (M.jobAufFeld(id)) continue;
      if (f.phase === 'stoppel' && !f.auto) return { t: S.statistik.jobs === 0 ? 'Tipp aufs Feld und grubbere es!' : fn(id) + ' grubbern!', pose: 'zeigt', feld: id, art: 'arbeit' };
      if (f.phase === 'bearbeitet' || f.phase === 'gepfluegt') return { t: fn(id) + ': jetzt säen!', pose: 'zeigt', feld: id, art: 'saat' };
    }
    for (const d of D.TIERE) {
      const st = S.tiere[d.id];
      if (!st || !st.anzahl) continue;
      const ss = M.stallStand(d.id, now);
      if (d.futterKgH && !ss.laeuft) return { t: d.name + ' haben Hunger – füttern!', pose: 'gruebelt', tier: d.id, art: 'futter' };
      if (ss.lagerKap > 0 && st.lager >= ss.lagerKap * 0.8) return { t: D.gut(d.gut).name + ' einsammeln!', pose: 'zeigt', tier: d.id, art: 'einsammeln' };
    }
    for (const b of D.PRODUKTION) { const p = S.produktion[b.id]; if (p && !p.queue.length) return { t: b.name + ' hat nichts zu tun.', pose: 'gruebelt', betrieb: b.id, art: 'betrieb' }; }
    const kaputt = S.flotte.find(m => !m.job && m.zustand < 15);
    if (kaputt) return { t: D.def(kaputt.id).name + ' ist kaputt – reparieren!', pose: 'gruebelt', dialog: 'fuhrpark', art: 'kaputt' };
    if (S.lohnOffen > 0) return { t: 'Fahrer warten auf Lohn.', pose: 'gruebelt', dialog: 'shop', tab: 'fahrer', art: 'lohn' };
    if (M.lagerMenge() > M.siloKap() * 0.85) return { t: 'Lager fast voll – verkaufen!', pose: 'zeigt', dialog: 'lager', art: 'lager' };
    const nf = D.FELDER.find(d => !S.felder[d.id] && S.level >= d.lvl);
    if (nf && S.geld >= nf.preis) return { t: nf.name + ' kaufen?', pose: 'zeigt', feld: nf.id, art: 'kauf' };
    const w = felder.filter(id => S.felder[id].phase === 'waechst' && !M.jobAufFeld(id));
    const lernFeld = w.find(id => lernMoeglich(S.felder[id], now).ok);
    if (lernFeld) return { t: 'Lernen macht ' + fn(lernFeld) + ' schneller!', pose: 'zeigt', feld: lernFeld, art: 'lern' };
    if (S.jobs.length) { const j = S.jobs[0], st = M.jobStand(j, now); return { t: SCHRITT_KURZ[j.schritt] + ' läuft – ' + (st.teil === 'rueck' ? 'gleich fertig' : 'noch ' + grob(st.restMs)), pose: 'neutral', feld: j.feld, art: 'warten' }; }
    if (w.length) { const id = w.sort((a, b) => M.restWachsen(a, now) - M.restWachsen(b, now))[0]; return { t: fn(id) + ' wächst – noch ' + grob(M.restWachsen(id, now)), pose: 'neutral', feld: id, art: 'warten' }; }
    return { t: 'Alles läuft! Schau dir das Album an.', pose: 'jubelt', dialog: 'sammlung', tab: 'album', art: 'lob' };
  }
  // Tipp aufs Ziel: Kamera fliegt hin UND der passende Dialog oeffnet sich (die Feldkarte zeigt die Hauptaktion gelb)
  function zielAusfuehren() {
    const h = hinweisBerechnen();
    if (!h) return;
    if (h.feld) { dialogFeld(h.feld); if (h.art === 'lern' && dlg && dlg.typ === 'feld') { dlg.fokus = null; zeichneFeldDialog(); } fliegeZuFeld(h.feld, Math.max(0.8, cam.z)); return; }
    if (h.tier) { const d = D.tier(h.tier); fliegeZuPunkt(d.haus.x + d.haus.w / 2, d.haus.y + 90, 0.8); return dialogTiere(h.tier); }
    if (h.betrieb) { const b = D.betrieb(h.betrieb); fliegeZuPunkt(b.x + b.w / 2, b.y + b.h / 2, 0.8); return dialogBetriebe(h.betrieb); }
    if (h.dialog === 'sammlung') {
      const S = stand();
      let tab = h.tab || 'heute';
      if (!h.tab) {
        const tagC = S.tag && (S.tag.aufgaben.some(q => q.fertig && !q.abgeholt) || (S.tag.alle && !S.tag.bonusAbgeholt));
        const erfC = D.ERFOLGE.some(e => { const r = S.erfolge[e.id]; return r && r.erreicht > r.abgeholt; });
        tab = tagC ? 'heute' : erfC ? 'erfolge' : 'album';
      }
      return dialogSammlung(tab);
    }
    if (h.dialog === 'auftraege') return dialogAuftraege();
    if (h.dialog === 'fuhrpark') return dialogFuhrpark();
    if (h.dialog === 'lager') return dialogLager();
    if (h.dialog === 'shop') return dialogShop(h.tab || 'traktor');
  }

  // ----------------------------------------------------------------------------------------------
  // Ereignisse aus der Logik (Toasts: Icon + max. 8 Woerter)
  // ----------------------------------------------------------------------------------------------
  const WETTER_KURZ = { sonnig: 'Bestes Arbeitswetter', bewoelkt: 'Ganz normales Wetter', regen: 'Pflanzen wachsen schneller', gewitter: 'Arbeit geht zäh voran', hitze: 'Pflanzen wachsen langsamer', nebel: 'Arbeit dauert etwas länger', schnee: 'Es wächst kaum etwas' };
  function ereignisBehandeln(art, d) {
    if (!wurzel) return;
    if (typeof FarmMeldung !== 'undefined' && FarmMeldung.ereignis(art, d, stand().ton)) return;
    if (art === 'jobFertig') { toast(D.feld(d.job.feld).name + ': ' + SCHRITT_KURZ[d.job.schritt] + ' fertig!', 'gut', 'jf' + d.job.id, d.job.schritt); piep('fertig'); }
    else if (art === 'reif') { const f = stand().felder[d.feld]; toast(D.feld(d.feld).name + ' ist reif!', 'geld', 'reif' + d.feld, f && f.frucht ? f.frucht : 'reif'); piep('fertig'); }
    else if (art === 'ernte') {
      toast('+' + tonnen(d.kg) + ' ' + D.gut(d.gut).name + (d.ueber > 1 ? ' – Silo voll, Rest verkauft' : ' im Silo'), 'geld', 'ernte' + d.feld, d.gut);
      const m = feldMitte(d.feld), s = weltZuBildschirm(m.x, m.y);
      if (s.x > 0 && s.x < W && s.y > 0 && s.y < H) { const r = wurzel.getBoundingClientRect(); iconFlug(d.gut, { x: s.x + r.left, y: s.y + r.top }, R.dockLager, 6); }
    }
    else if (art === 'level') levelZeigen(d.level, d.bonus);
    else if (art === 'prodFertig') { toast(D.betrieb(d.betrieb).name + ': ' + tonnen(d.kg) + ' ' + D.gut(d.gut).name + ' fertig', 'gut', 'pf' + d.betrieb, d.gut); piep('fertig'); }
    else if (art === 'auftragNeu') toast('Neuer Auftrag: ' + tonnen(d.auftrag.kg) + ' ' + D.gut(d.auftrag.gut).name, '', 'an', 'auftrag');
    else if (art === 'anfangEnde') toast('Ab jetzt dauert alles wie echt!', '', 'ae', 'uhr');
    else if (art === 'wetter') { const x = D.WETTER[d.typ]; toast(x.name + ': ' + (WETTER_KURZ[d.typ] || x.text), '', 'wetter', d.typ); }
    else if (art === 'stallVoll') toast(D.tier(d.id).stall + ' ist voll – einsammeln!', 'geld', 'sv' + d.id, d.id);
    else if (art === 'erfolg') {
      const n = d.neu;
      if (n.length === 1) toast('Neuer Erfolg: ' + n[0].name + '!', 'geld', 'erfolg', 'pokal');
      else toast(n.length + ' neue Erfolge – beim Pokal abholen!', 'geld', 'erfolg', 'pokal');
      piep('level');
    }
    else if (art === 'tagNeu') toast('Neue Tagesaufgaben warten!', '', 'tagneu', 'heute');
    else if (art === 'tagFertig') { toast('Tagesaufgabe geschafft – abholen!', 'geld', 'tagf', 'heute'); piep('fertig'); }
    else if (art === 'tagAlle') { toast('Alle geschafft – Tagesbonus abholen!', 'geld', 'taga', 'geschenk'); piep('level'); }
    else if (art === 'karte') {
      const seite = D.ALBUM.find(a => a.kat === d.kat);
      const k = seite && seite.karten().find(x => x.id === d.id);
      if (k) { toast('Neue Albumkarte: ' + k.name, 'gut', 'karte' + d.kat, 'album'); piep('fertig'); }
    }
    else if (art === 'lohn') toast('Lohn ' + (d.nachgezahlt ? 'nachgezahlt' : 'bezahlt') + ': −' + fmt(d.betrag), 'geld', 'lohn', 'lohn');
    else if (art === 'lohnFehlt') toast('Kein Geld für Lohn – Fahrer streiken!', 'warn', 'lohnfehlt', 'lohn');
    else if (art === 'umgebrochen') toast(D.feld(d.feld).name + ': Pflanzen umgepflügt.', 'warn', 'ub', 'gefahr');
  }

  // ----------------------------------------------------------------------------------------------
  // HUD (feste Elemente; nur Text/Ring/Badges werden aktualisiert)
  // ----------------------------------------------------------------------------------------------
  let hudCache = {};
  let geldAufgeschoben = 0;
  function setzeText(el, key, txt) { if (el && hudCache[key] !== txt) { hudCache[key] = txt; el.textContent = txt; } }
  function setzeHtml(el, key, html) { if (el && hudCache[key] !== html) { hudCache[key] = html; el.innerHTML = html; } }
  function zeige(el, an) { if (el) { const v = an ? '' : 'none'; if (el.style.display !== v) el.style.display = v; } }
  function badge(el, n, text) { if (!el) return; zeige(el, !!n); if (n) setzeText(el, el.id, text !== undefined ? text : String(n)); }
  // Geld, das (z. B. waehrend des Level-Ups) zurueckgehalten wurde, jetzt einfliegen lassen
  function geldNachholen(von) {
    if (geldAufgeschoben <= 0) return;
    const x = geldAufgeschoben; geldAufgeschoben = 0;
    geldEffekt(x, von);
  }
  function hudAktualisieren(dt) {
    const S = stand();
    if (geldLetzt === null) { geldLetzt = S.geld; geldAnzeige = S.geld; geldUnterwegs = 0; geldAufgeschoben = 0; }
    const dg = S.geld - geldLetzt;
    geldLetzt = S.geld;
    if (dg >= 100) { if (geldHalten) geldAufgeschoben += dg; else geldEffekt(dg); }
    const ziel = S.geld - geldUnterwegs - geldAufgeschoben;
    geldAnzeige += (ziel - geldAnzeige) * Math.min(1, dt * 9);
    if (Math.abs(ziel - geldAnzeige) < 1) geldAnzeige = ziel;
    setzeText(R.geldZahl, 'geld', fmt(geldAnzeige));
    timer.hud -= dt;
    if (timer.hud > 0) return;
    timer.hud = 0.3;
    const now = jetzt();
    // Level-Abzeichen (Stern + XP-Ring + Zahl)
    const handy = istHandy();
    const xpA = S.xp / D.xpFuerLevel(S.level);
    const lk = S.level + '|' + handy;
    if (hudCache.lvl !== lk) { hudCache.lvl = lk; R.lvl.innerHTML = FS.levelAbzeichen(S.level, xpA, handy ? 60 : 96); }
    else FS.ringSetzen(R.lvl.firstChild, xpA);
    // Wetter
    const wt = M.wetter(now);
    setzeHtml(R.wetter, 'wetter', I(wt.id) + esc(wt.name));
    M.wetterGesehen(wt.id);
    // Heute n/3 (+ Serie)
    const tg = S.tag;
    if (tg) {
      const fertig = tg.aufgaben.filter(q => q.fertig).length, cl = tg.aufgaben.some(q => q.fertig && !q.abgeholt) || (tg.alle && !tg.bonusAbgeholt);
      const serie = M.serieAktuell(now);
      setzeHtml(R.tag, 'tag', I(cl ? 'geschenk' : 'heute') + 'Heute <b>' + fertig + '/' + tg.aufgaben.length + '</b>' + (serie > 1 ? '<b>' + I('serie') + serie + '</b>' : ''));
      if (R.tag.classList.contains('fs-gruen') !== !!cl) R.tag.classList.toggle('fs-gruen', !!cl);
    }
    // Schule n/N (nur wenn Lern-App-Meldungen da sind; Papa-Handy laedt FarmLernen/FarmMeldung nicht)
    let plan = [];
    if (typeof FarmMeldung !== 'undefined' && typeof FarmLernen !== 'undefined' && FarmLernen.tagesplan) { try { plan = FarmLernen.tagesplan() || []; } catch (e) { plan = []; } }
    zeige(R.schule, plan.length > 0);
    if (plan.length) { const ok = plan.filter(x => x.fertig).length; setzeHtml(R.schule, 'schule', I('schule') + 'Schule <b>' + ok + '/' + plan.length + '</b>'); }
    // Gemeinsamer Hof: offline-Hinweis + "Papa/Max ist da"
    if (fern) {
      zeige(R.offline, !fern.ok);
      const anderer = fern.von === 'papa' ? 'max' : 'papa';
      const da = fern.ok && fern.online[anderer];
      zeige(R.mit, !!da);
      if (da) setzeHtml(R.mit, 'mit', I('papa') + (anderer === 'papa' ? 'Papa' : 'Max') + ' ist da <i class="fs-punkt"></i>');
    } else { zeige(R.offline, false); zeige(R.mit, false); }
    // Badges: Pokal (abholbar), Auftraege (lieferbar), Tierhof (braucht etwas), Betriebe (leer), Lager (fast voll)
    badge(R.pktErf, M.abholbar());
    badge(R.pktAuf, S.auftraege.filter(a => (S.silo[a.gut] || 0) >= a.kg).length);
    let tiereN = 0;
    D.TIERE.forEach(d => { const st = S.tiere[d.id]; if (!st || !st.anzahl) return; const ss = M.stallStand(d.id, now); if ((d.futterKgH && !ss.laeuft) || (ss.lagerKap > 0 && st.lager >= ss.lagerKap * 0.8)) tiereN++; });
    badge(R.pktTiere, tiereN, '!');
    badge(R.pktBetr, D.PRODUKTION.filter(b => S.produktion[b.id] && !S.produktion[b.id].queue.length).length);
    badge(R.pktLager, M.lagerMenge() > M.siloKap() * 0.85 ? 1 : 0, '!');
    // Ziel-Banner mit Fuchs
    zielSetzen(hinweisBerechnen());
  }
  function zielSetzen(h) {
    const hat = h ? '1' : '0';
    if (R.zielPlatz.getAttribute('data-hat') !== hat) { R.zielPlatz.setAttribute('data-hat', hat); zoneAktualisieren(); }
    if (!h) return;
    setzeText(R.zielSatz, 'zielT', h.t);
    const art = (h.art || '') + '|' + (h.feld || h.tier || h.betrieb || h.dialog || '');
    if (hudCache.zielArt !== art) {
      const erstes = hudCache.zielArt === undefined;
      hudCache.zielArt = art;
      if (!erstes && !FS.effekteWenig()) { R.ziel.classList.remove('f-ziel-neu'); void R.ziel.offsetWidth; R.ziel.classList.add('f-ziel-neu'); }
    }
    const pk = h.pose + '|' + istHandy();
    if (hudCache.zielPose !== pk) { hudCache.zielPose = pk; R.zielFuchs.innerHTML = FS.fuchs(h.pose, istHandy() ? 94 : 110, true); }
  }

  // ----------------------------------------------------------------------------------------------
  // Hauptschleife
  // ----------------------------------------------------------------------------------------------
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
    nachlauf(dt);
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
    if (timer.dlg >= 1 && !dlgAnfasst && Date.now() - dlgAnfassEnde > 500) { timer.dlg = 0; dialogAktualisieren(true); zoneAktualisieren(); }
  }
  // Offenen Dialog angleichen (live=true: nur Dialoge mit laufenden Werten). Kein Neuaufbau: rahmen() gleicht nur Geaendertes an.
  function dialogAktualisieren(live) {
    if (!dlg || !stand() || !wurzel) return;
    const t = dlg.typ;
    if (t === 'feld') zeichneFeldDialog();
    else if (t === 'auftraege') zeichneAuftraege();
    else if (t === 'betriebe') zeichneBetriebe();
    else if (t === 'felder') zeichneFelder();
    else if (t === 'tiere') zeichneTiere();
    else if (t === 'wetter') zeichneWetter();
    else if (t === 'shop') zeichneShop();
    else if (t === 'lager') zeichneLager();
    else if (t === 'sammlung') zeichneSammlung();
    else if (t === 'chronik') zeichneChronik();
    else if (!live) {
      if (t === 'menue') zeichneMenue();
      else if (t === 'hilfe') zeichneHilfe();
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
    geldAnzeige = stand().geld; geldLetzt = null; geldUnterwegs = 0; geldAufgeschoben = 0; geldHalten = false;
    cam.x = 1720; cam.y = 1500; cam.z = Math.min(1, Math.max(0.45, Math.min(W / 1500, H / 1000))); cam.ziel = null; schwung = null;
    tempoKlicks = 0; dlg = null; levelOffen = null; levelWarte.length = 0;
    timer = { sim: 0, speicher: 0, hud: 0, dlg: 0, poll: 0 };
    laeuft = true; tLast = 0; tSpiel = 0;
    raf = requestAnimationFrame(frame);
    tonStart();
    zoneAktualisieren();
    if (erstes) dialogHilfe();
    if (rundgangNoetig()) rundgangZeigen(0);
  }
  function schliessen() {
    laeuft = false; cancelAnimationFrame(raf);
    speichern();
    if (typeof FarmMeldung !== 'undefined') FarmMeldung.hofOffen(false);
    if (fern) fernAushaengen();
    if (ton) { try { ton.ac.close(); } catch (e) { /* egal */ } ton = null; }
    abbauen();
    fern = null;
    dlg = null; levelOffen = null;
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
    d.className = 'f-ueber f-lade'; d.id = 'f-lade';
    d.innerHTML = '<div class="fs-panel f-kasten"><div style="display:flex;justify-content:center">' + FS.fuchs(knopf ? 'gruebelt' : 'neutral', 120) + '</div><div class="f-kasten-titel fs-kontur" style="margin:8px 0 6px">' + titel + '</div><p class="f-kasten-text">' + text + '</p>' +
      (knopf ? '<div class="f-kasten-knoepfe"><button class="fs-btn fs-navy" data-a="beenden">Zurück</button><button class="fs-btn fs-gelb" data-a="fernNochmal">' + knopf + '</button></div>' : FS.balken(0.6, 'cyan')) + '</div>';
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
  const MITSPIELER = { max: 'Max', papa: 'Papa' };
  function fernLog(liste) {
    fern.log = liste;
    const hoechste = liste.reduce((a, e) => Math.max(a, e.id), 0);
    if (fern.logLetzte < 0) { fern.logLetzte = hoechste; return; }
    liste.forEach(e => { if (e.id > fern.logLetzte && e.von !== fern.von) toast(MITSPIELER[e.von] + ' ' + e.text, 'gut', 'mit' + e.id, 'papa'); });
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
      if (r.ok === false && r.grund) { toast(r.grund, 'warn', 'ferngrund', 'warnung'); piep('fehler'); }
      dialogAktualisieren(false);
      if (r.log) fernLog(r.log);
    } catch (e) {
      if (fern) { fern.ok = false; toast('Verbindung weg – nicht gespeichert!', 'warn', 'ferngrund', 'warnung'); }
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
    _t: {
      M, A, aktion, dlg: () => dlg, dialogFeld, dialogShop, dialogLager, dialogAuftraege, dialogBetriebe, dialogFuhrpark, dialogFelder, dialogMenue, dialogHilfe, dialogTiere, dialogWetter, dialogSammlung,
      get fern() { return fern; }, fernPoll: () => fern && fernPoll(), hinweisBerechnen, cam, toast, speichern,
      // Hof-Farm 2.0
      zielAusfuehren, antippen, blaseAusfuehren, ernteSofort, schrittStatus, besteWahl, dauerSek, saatListe, bestaetigen, levelZeigen, levelZu,
      rundgangZeigen, rundgangNoetig, zoneAktualisieren, freieMitte, dialogAktualisieren, zoomUm, weltZuBildschirm, FERN_BEFEHLE, get levelOffen() { return levelOffen; },
      // Teil 2
      dialogChronik, anbauen, wegZuGut, quelleVon, kundeFuer, sammlungZaehler, hudTakt: () => hudAktualisieren(0.016)
    }
  };
})();
