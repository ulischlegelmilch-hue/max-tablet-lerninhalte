// VOLLDAMPF: Spiel-Oberfläche (HUD, Aufträge, Blätter, Bühnen, Lernbonus) – verbindet Modell und Karte.
// Öffnen über VolldampfLader.oeffnen() (Spiele-Menü). Spielstand lokal (localStorage), Logik: volldampf-modell.js.
const Volldampf = (function () {
  const D = VolldampfDaten, M = VolldampfModell, A = VolldampfAnsicht, G = Glanz;
  const esc = G.esc;
  const geld = n => M.geld(n);
  let abtWahl = 'regional';                  // gewählte Abteilung im Laden
  let wurzel = null, laeuft = false, raf = 0, ausgang = null, hoererGesetzt = false, stumm = false;
  let tSim = 0, tHud = 0, tSpeicher = 0, tKohle = 0, tLern = 0, tFrame = 0, tGuide = 0;
  let blattAkt = null, modus = null;          // modus: { art:'bauen' } | { art:'linie', uid, von, weg }
  const buehnen = [];                          // Warteschlange großer Momente (Stufe, Land, Lieferung …)
  let buehneLaeuft = false;
  let hud = {};
  let aufgabenSig = '';
  let effekte = 0;
  const jetzt = () => Date.now();

  const STIL = `
#vd{position:fixed;top:0;left:0;right:0;bottom:0;z-index:5000;overflow:hidden;background:#0A0C0F}
/* ---------- Kopfleiste ---------- */
.vd-leiste{position:absolute;left:0;right:0;top:0;z-index:20;height:60px;display:flex;align-items:stretch;background:rgba(16,19,23,.97);border-bottom:1px solid var(--gz-linie2)}
.vd-leiste-knopf{width:60px;flex:none;display:flex;align-items:center;justify-content:center;border:0;border-right:1px solid var(--gz-linie);background:transparent;color:var(--gz-txt2);cursor:pointer;padding:0}
.vd-leiste-knopf.vd-rechts{border-right:0;border-left:1px solid var(--gz-linie)}
.vd-leiste-knopf .gz-i{width:22px;height:22px}
.vd-marke{display:flex;flex-direction:column;justify-content:center;padding:0 22px 0 18px;border-right:1px solid var(--gz-linie);flex:none}
.vd-marke b{font:700 19px/1 var(--gz-titel);letter-spacing:3.4px;color:var(--gz-txt)}
.vd-marke span{margin-top:5px;font:600 10.5px/1 var(--gz-titel);letter-spacing:1.5px;text-transform:uppercase;color:var(--gz-txt3);white-space:nowrap}
.vd-kz{display:flex;flex-direction:column;justify-content:center;gap:5px;padding:0 18px;border-right:1px solid var(--gz-linie);cursor:pointer;flex:none}
.vd-kz-label{display:flex;align-items:center;gap:6px;font:600 11px/1 var(--gz-titel);letter-spacing:1.5px;text-transform:uppercase;color:var(--gz-txt3);white-space:nowrap}
.vd-kz-label .gz-i{width:13px;height:13px}
.vd-kz-wert{display:flex;align-items:baseline;gap:6px;white-space:nowrap}
.vd-kz-wert b{font:600 22px/1 var(--gz-titel);font-variant-numeric:tabular-nums;letter-spacing:.2px;color:var(--gz-txt)}
.vd-kz-wert small{font:600 13px/1 var(--gz-titel);letter-spacing:.3px;color:var(--gz-txt3)}
.vd-kz-balken{display:inline-block;width:70px;height:4px;border-radius:2px;background:rgba(255,255,255,.09);overflow:hidden;align-self:center;margin-left:4px}
.vd-kz-balken i{display:block;height:100%;background:var(--gz-akzent);transform-origin:left center;transition:transform .5s}
.vd-leiste-rest{flex:1}
.vd-uhr{display:flex;align-items:center;gap:12px;padding:0 18px;border-left:1px solid var(--gz-linie);cursor:pointer;flex:none}
.vd-uhr svg{width:36px;height:36px}
.vd-uhr-zeiger{transform-origin:24px 24px}
.vd-uhr-text{display:flex;flex-direction:column;gap:4px}
.vd-uhr .gz-fb b{font-size:16px}
.vd-leiste-knopf:active,.vd-kz:active,.vd-uhr:active{background:var(--gz-bg2)}
/* ---------- Auftragsleiste rechts ---------- */
.vd-seite{position:absolute;right:0;top:60px;bottom:0;z-index:19;width:320px;display:flex;flex-direction:column;background:rgba(16,19,23,.97);border-left:1px solid var(--gz-linie2)}
.vd-seite-kopf{display:flex;align-items:baseline;justify-content:space-between;padding:16px 18px 12px 20px;border-bottom:1px solid var(--gz-linie)}
.vd-anzahl{font:600 13px/1 var(--gz-titel);letter-spacing:.5px;color:var(--gz-txt3)}
.vd-auftraege{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.vd-auftraege::-webkit-scrollbar{display:none}
.vd-auftrag{position:relative;padding:15px 16px 16px 20px;border-bottom:1px solid var(--gz-linie)}
.vd-auftrag:before{content:"";position:absolute;left:0;top:16px;width:3px;height:22px;border-radius:0 2px 2px 0;background:var(--lf)}
.vd-auftrag-kopf{display:flex;align-items:center;gap:8px}
.vd-auftrag-kopf .gz-ueber{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vd-auftrag-titel{margin-top:3px;font:600 20px/1.15 var(--gz-titel);letter-spacing:.2px;color:var(--gz-txt)}
.vd-auftrag-text{margin-top:4px;font-size:13.5px;line-height:1.4;color:var(--gz-txt2)}
.vd-auftrag .gz-balken{margin-top:10px}
.vd-auftrag-fuss{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:13px;min-height:36px}
.vd-lohn{display:flex;gap:12px;font:600 15px/1 var(--gz-titel);letter-spacing:.3px;color:var(--gz-txt2);font-variant-numeric:tabular-nums;white-space:nowrap}
.vd-lohn span{display:inline-flex;align-items:center;gap:5px}
.vd-lohn .gz-i{width:14px;height:14px;color:var(--gz-txt3)}
.vd-status{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--gz-txt2);white-space:nowrap}
.vd-status:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--gz-ok);flex:none}
.vd-status-warte:before{background:var(--gz-txt3)}
.vd-auftrag.vd-erfuellt{background:rgba(67,191,131,.06)}
.vd-auftrag.vd-erfuellt .vd-auftrag-kopf .gz-ueber{color:var(--gz-ok)}
.vd-mini{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid var(--gz-linie2);border-radius:5px;color:var(--gz-txt2);cursor:pointer;flex:none}
.vd-mini .gz-i{width:15px;height:15px}
.vd-mini:active{background:var(--gz-bg3)}
/* ---------- Werkzeugleiste unten ---------- */
.vd-dock{position:absolute;left:50%;bottom:16px;z-index:20;display:flex;gap:2px;align-items:center;padding:4px;border:1px solid var(--gz-linie2);border-radius:10px;background:rgba(16,19,23,.97);box-shadow:var(--gz-schatten);transform:translateX(-50%)}
.vd-werkzeug{position:relative;display:flex;align-items:center;gap:9px;height:46px;padding:0 18px;border:0;border-radius:7px;background:transparent;color:var(--gz-txt2);font:500 15px/1 var(--gz-text);cursor:pointer;white-space:nowrap}
.vd-werkzeug .gz-i{width:20px;height:20px}
.vd-werkzeug:active{background:var(--gz-bg3)}
.vd-werkzeug.gz-aktiv{background:var(--gz-bg3);color:var(--gz-txt)}
.vd-werkzeug.gz-aktiv:after{content:"";position:absolute;left:14px;right:14px;bottom:4px;height:2px;border-radius:1px;background:var(--gz-akzent)}
.vd-werkzeug.vd-nur-icon{padding:0 13px}
.vd-dock-trenner{width:1px;height:26px;background:var(--gz-linie2);margin:0 4px}
/* ---------- Volldampf (oben in der Seitenleiste) ---------- */
.vd-kessel{padding:16px 18px 16px 20px;border-bottom:1px solid var(--gz-linie2);background:var(--gz-bg1)}
.vd-kessel-kopf{display:flex;align-items:center;gap:6px}
.vd-kessel-kopf .gz-i{width:14px;height:14px;color:var(--gz-txt3)}
.vd-kessel-zeile{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;min-height:36px}
.vd-kessel-wert{display:flex;align-items:baseline;gap:7px;white-space:nowrap}
.vd-kessel-wert b{font:600 26px/1 var(--gz-titel);font-variant-numeric:tabular-nums;color:var(--gz-txt)}
.vd-kessel-wert small{font-size:12.5px;color:var(--gz-txt3)}
.vd-kessel .gz-balken{margin-top:10px}
.vd-kessel-hinweis{display:block;text-align:right;font-size:12px;line-height:1.35;color:var(--gz-txt3);cursor:pointer}
.vd-kessel-an{background:linear-gradient(180deg,rgba(226,166,59,.10),rgba(226,166,59,.03))}
.vd-kessel-an .vd-kessel-wert b,.vd-kessel-an .vd-kessel-kopf .gz-ueber,.vd-kessel-an .vd-kessel-kopf .gz-i{color:var(--gz-akzent)}
/* ---------- Modus-Banner ---------- */
.vd-modus{position:absolute;left:50%;top:76px;z-index:22;display:flex;align-items:center;gap:14px;padding:8px 8px 8px 16px;transform:translateX(-50%);border:1px solid var(--gz-linie2);border-radius:8px;
 background:rgba(21,25,30,.98);box-shadow:var(--gz-schatten);font-size:14.5px;line-height:1.4;max-width:92%}
.vd-modus>span{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.vd-modus>span>.gz-i{color:var(--gz-akzent)}
.vd-modus b{font-weight:600}
.vd-modus-zahl{font-family:var(--gz-titel);font-weight:600;font-size:15px;color:var(--gz-txt2);font-variant-numeric:tabular-nums}
.vd-mit-seite .vd-modus,.vd-mit-seite .vd-dock,.vd-mit-seite .gz-toasts{left:calc((100% - 320px) / 2)}
.vd-mit-seite .vd-modus{max-width:calc(100% - 360px)}
.vd-plus{position:absolute;left:0;top:0;z-index:18;pointer-events:none;font-family:var(--gz-titel);font-weight:600;font-size:14px;letter-spacing:.3px;color:var(--gz-akzent-hell);
 text-shadow:0 1px 3px rgba(0,0,0,.9);animation:vd-plus 1.4s ease-out forwards;white-space:nowrap;font-variant-numeric:tabular-nums}
@keyframes vd-plus{0%{transform:translate(var(--x),var(--y));opacity:0}15%{opacity:1;transform:translate(var(--x),calc(var(--y) - 6px))}100%{transform:translate(var(--x),calc(var(--y) - 34px));opacity:0}}
/* ---------- Blätter: Loks, Listen ---------- */
.vd-zeilen{display:flex;flex-direction:column}
.vd-lokkarte{display:flex;gap:16px;align-items:flex-start;padding:16px 0 18px;border-bottom:1px solid var(--gz-linie)}
.vd-lokkarte:first-child{padding-top:2px}
.vd-lokkarte-text{flex:1;min-width:0}
.vd-lokkarte-name{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font:600 19px/1.2 var(--gz-titel);letter-spacing:.2px}
.vd-lokkarte-name small{font:500 13px/1 var(--gz-text);color:var(--gz-txt2);letter-spacing:0}
.vd-lokkarte-info{font-size:13.5px;line-height:1.45;color:var(--gz-txt2);margin-top:4px}
.vd-lokkarte-knoepfe{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.vd-lokbild{width:150px;height:44px;flex:none;border-radius:6px;background:linear-gradient(180deg,#4F5862 0%,#3A424B 62%,#2B3138 100%);border:1px solid rgba(255,255,255,.07);display:block}
.vd-lokbild.vd-gold{box-shadow:0 0 0 1px var(--gz-akzent)}
.vd-lokbild-gross{width:100%!important;height:auto!important;aspect-ratio:190/56}
.vd-lokfoto{display:block;flex:none;width:144px;height:81px;object-fit:cover;border-radius:6px;background:#2B3138;border:1px solid rgba(255,255,255,.07)}
.vd-lokfoto.vd-gold{box-shadow:0 0 0 1px var(--gz-akzent)}
.vd-foto{margin:0}
.vd-lokfoto-gross{width:100%;height:auto;aspect-ratio:16/9}
.vd-foto figcaption{margin-top:6px;font-size:11px;line-height:1.35;color:var(--gz-txt3)}
.vd-lokfoto-album{width:100%;height:auto;aspect-ratio:16/9}
.vd-album-kachel.vd-zu .vd-lokfoto{filter:grayscale(1)}
.vd-werte{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px}
.vd-wert-zelle>span{display:block;font:600 10.5px/1 var(--gz-titel);letter-spacing:1.2px;text-transform:uppercase;color:var(--gz-txt3)}
.vd-wert-zelle>b{display:block;margin-top:5px;font:600 16px/1 var(--gz-titel);font-variant-numeric:tabular-nums;color:var(--gz-txt)}
.vd-wert-zelle>i{display:block;height:3px;margin-top:6px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden}
.vd-wert-zelle>i>i{display:block;height:100%;margin:0;background:var(--gz-txt2);transform-origin:left center}
.vd-gesperrt .vd-lokbild,.vd-gesperrt .vd-lokfoto,.vd-gesperrt .vd-lokkarte-name,.vd-gesperrt .vd-werte{opacity:.45}
.vd-tabs{display:flex;padding:0 22px;border-bottom:1px solid var(--gz-linie)}
.vd-tab{position:relative;height:46px;padding:0 2px;margin-right:24px;border:0;background:transparent;color:var(--gz-txt2);font:500 15px/1 var(--gz-text);cursor:pointer}
.vd-tab.gz-aktiv{color:var(--gz-txt)}
.vd-tab.gz-aktiv:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--gz-akzent)}
.vd-reihe{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.vd-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px}
.vd-chip{height:34px;padding:0 14px;border:1px solid var(--gz-linie2);border-radius:17px;background:transparent;color:var(--gz-txt2);font:500 14px/1 var(--gz-text);cursor:pointer}
.vd-chip.gz-aktiv{border-color:var(--gz-akzent);color:var(--gz-txt);background:rgba(226,166,59,.08)}
.vd-chip small{margin-left:6px;color:var(--gz-txt3);font-size:12px}
.vd-geb{display:flex;gap:14px;align-items:flex-start;padding:13px 0;border-bottom:1px solid var(--gz-linie)}
.vd-geb>.gz-i{width:20px;height:20px;flex:none;margin-top:2px;color:var(--gz-txt3)}
.vd-geb-text{flex:1;min-width:0;font-size:13.5px;line-height:1.45;color:var(--gz-txt2)}
.vd-geb-text b{display:block;margin-bottom:2px;font:600 16px/1.3 var(--gz-titel);letter-spacing:.2px;color:var(--gz-txt)}
.vd-geb .gz-btn{flex:none;align-self:center}
.vd-geb.vd-steht>.gz-i{color:var(--gz-ok)}
.vd-linienfarbe{display:inline-block;width:20px;height:5px;border-radius:3px;flex:none}
.vd-aktionen{display:flex;flex-direction:column;gap:8px;margin-top:20px}
.vd-wahl-text{font-size:15px;line-height:1.55;color:var(--gz-txt)}
.vd-leise{font-size:13.5px;line-height:1.5;color:var(--gz-txt2)}
.vd-punkt{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px;vertical-align:1px}
.vd-taufnamen{display:flex;flex-wrap:wrap;gap:8px}
.vd-taufnamen .vd-chip:disabled{opacity:.45}
.vd-route{display:flex;flex-wrap:wrap;align-items:center;gap:5px 0;font-size:12.5px;line-height:1.3;color:var(--gz-txt2)}
.vd-route span{white-space:nowrap}
.vd-route span.vd-r-an{color:var(--gz-txt)}
.vd-route i{width:18px;height:3px;margin:0 5px;border-radius:2px;background:var(--gz-linie2)}
.vd-route i.vd-r-ok{background:#8B939D}
.vd-route i.vd-r-ok.vd-r-strom{background:#8FB6DA}
.vd-kartenwahl{display:grid;gap:10px}
.vd-wahlkarte{display:flex;flex-direction:column;gap:9px;padding:14px;border:1px solid var(--gz-linie);border-top:2px solid var(--gz-akzent);border-radius:8px;background:var(--gz-bg2)}
.vd-wahlkarte>b{font-family:var(--gz-titel);font-size:19px;font-weight:600;line-height:1.15}
.vd-wahl-daten{display:flex;justify-content:space-between;gap:10px;font-size:13px;color:var(--gz-txt2)}
.vd-wahl-daten .gz-i{width:14px;height:14px;vertical-align:-2px;margin-right:4px}
.vd-zugwahl{display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;margin-top:6px;border:1px solid var(--gz-linie);border-radius:8px;background:var(--gz-bg2);color:inherit;font:inherit;text-align:left;cursor:pointer}
.vd-zugwahl:disabled{opacity:.45;cursor:default}
.vd-zugwahl span{display:flex;flex-direction:column;font-size:14px;line-height:1.25}
.vd-zugwahl b{font-weight:500}
.vd-zugwahl small{color:var(--gz-txt2);font-size:12px}
.vd-zugwahl-passt{border-color:var(--gz-akzent)}
.vd-zugwahl-passt small{color:var(--gz-akzent)}
.vd-bahnen{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.vd-bahn{display:flex;flex-direction:column;gap:9px;padding:11px 12px;border:1px solid var(--gz-linie);border-radius:8px;background:var(--gz-bg2);color:inherit;font:inherit;text-align:left;cursor:pointer}
.vd-bahn-name{display:flex;flex-direction:column;gap:2px;font-size:14px;line-height:1.25}
.vd-bahn-name b{font-weight:500}
.vd-bahn-name small{color:var(--gz-txt2);font-size:12px}
.vd-bahn-ok small{color:var(--gz-ok,#3FB37F)}
.vd-bahn-teile{display:grid;margin-top:14px;border-top:1px solid var(--gz-linie)}
.vd-bahn-teile>div{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--gz-linie);font-size:14px}
.vd-bahn-teile>div .gz-i{width:16px;height:16px;color:var(--gz-txt3)}
.vd-bahn-teile>div.vd-steht .gz-i{color:var(--gz-ok,#3FB37F)}
.vd-bahn-teile>div span{flex:1}
.vd-bahn-teile>div small{color:var(--gz-txt2);font-size:12px}
.vd-album{display:grid;grid-template-columns:repeat(auto-fill,minmax(122px,1fr));gap:8px}
.vd-album-kachel{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px 12px;border:1px solid var(--gz-linie);border-radius:8px;background:var(--gz-bg2);text-align:center;font-size:13px;line-height:1.3}
.vd-album-kachel b{font-weight:500}
.vd-album-kachel span{color:var(--gz-txt2)}
.vd-album-kachel .gz-i{width:22px;height:22px;color:var(--gz-txt2)}
.vd-album-kachel.vd-zu{opacity:.38}
.vd-umriss{width:60px;height:60px}
.vd-karte-umriss{position:absolute;right:20px;top:20px}
.vd-karte-umriss .vd-umriss{width:68px;height:68px}
.vd-kzreihe{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--gz-linie2);border-radius:8px;margin-top:14px}
.vd-kzreihe>div{padding:12px 14px;border-left:1px solid var(--gz-linie)}
.vd-kzreihe>div:first-child{border-left:0}
.vd-kzreihe span{display:flex;align-items:center;gap:6px;font:600 11px/1 var(--gz-titel);letter-spacing:1.4px;text-transform:uppercase;color:var(--gz-txt3)}
.vd-kzreihe span .gz-i{width:13px;height:13px}
.vd-kzreihe b{display:block;margin-top:6px;font:600 24px/1 var(--gz-titel);font-variant-numeric:tabular-nums;color:var(--gz-akzent)}
/* ---------- Einführung ---------- */
.vd-guide{position:absolute;left:16px;top:76px;z-index:60;width:min(410px,calc(100% - 32px));padding:14px 16px 16px;border:1px solid var(--gz-linie2);border-radius:10px;
 background:rgba(21,25,30,.98);box-shadow:var(--gz-schatten);font-size:14.5px;line-height:1.55;color:var(--gz-txt)}
.vd-guide-kopf{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}
.vd-guide-kopf .gz-ueber{color:var(--gz-akzent)}
.vd-guide-kopf button{background:none;border:0;color:var(--gz-txt3);font:500 13px/1 var(--gz-text);cursor:pointer;padding:6px 0 6px 10px}
.vd-guide-fort{display:flex;gap:3px;margin:0 0 12px}
.vd-guide-fort i{flex:1;height:2px;border-radius:1px;background:rgba(255,255,255,.1)}
.vd-guide-fort i.vd-an{background:var(--gz-akzent)}
.vd-guide b{font-weight:600}
.vd-guide-knoepfe{display:flex;justify-content:flex-end;margin-top:12px}
.vd-guide-ring{position:absolute;left:0;top:0;z-index:61;pointer-events:none;border:1.5px solid var(--gz-akzent);border-radius:8px;box-shadow:0 0 0 4px rgba(226,166,59,.15);transition:transform .25s,width .25s,height .25s}
.vd-guide-ring.vd-rund{border-radius:50%}
.vd-guide-ring:after{content:"";position:absolute;top:-1.5px;left:-1.5px;right:-1.5px;bottom:-1.5px;border:1.5px solid var(--gz-akzent);border-radius:inherit;animation:vd-ring 2s ease-out infinite}
@keyframes vd-ring{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.18);opacity:0}}
.vd-mit-guide .gz-toasts{top:auto;bottom:86px}
.vd-regeln{display:flex;flex-direction:column}
.vd-regel{display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--gz-linie);font-size:14px;line-height:1.5;color:var(--gz-txt2)}
.vd-regel>.gz-i{width:20px;height:20px;flex:none;margin-top:2px;color:var(--gz-txt3)}
.vd-regel b{display:block;margin-bottom:2px;font:600 16px/1.3 var(--gz-titel);letter-spacing:.2px;color:var(--gz-txt)}
.vd-laender{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:0 18px}
.vd-land-zeile{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gz-linie);font-size:14px}
.vd-land-zeile i{width:8px;height:8px;border-radius:50%;flex:none;border:1px solid rgba(255,255,255,.25)}
.vd-land-zeile span{flex:1;min-width:0}
.vd-land-zeile small{font:600 13px/1 var(--gz-titel);letter-spacing:.3px;color:var(--gz-txt3)}
.vd-land-zeile.vd-zu{color:var(--gz-txt3)}
@media (max-width:1180px){ .vd-marke{display:none} }
@media (max-width:980px) and (orientation: landscape){ .vd-kz{padding:0 12px} .vd-kz-label{letter-spacing:1px} .vd-kz-balken{width:44px} .vd-seite{width:290px} .vd-mit-seite .vd-modus,.vd-mit-seite .vd-dock,.vd-mit-seite .gz-toasts{left:calc((100% - 290px) / 2)} }
@media (orientation: portrait){
 .vd-marke,.vd-kz-label .gz-i{display:none}
 .vd-kz{padding:0 12px}
 .vd-uhr-text .gz-ueber{display:none}
 .vd-seite{top:auto;left:0;height:216px;width:auto;border-left:0;border-top:1px solid var(--gz-linie2);flex-direction:row}
 .vd-kessel{width:210px;flex:none;border-bottom:0;border-right:1px solid var(--gz-linie2)}
 .vd-kessel-zeile{flex-direction:column;align-items:flex-start}
 .vd-kessel-hinweis{text-align:left}
 .vd-seite-kopf{display:none}
 .vd-auftraege{display:flex;overflow-x:auto;overflow-y:hidden}
 .vd-auftrag{flex:none;width:300px;border-bottom:0;border-right:1px solid var(--gz-linie)}
 .vd-mit-seite .vd-modus,.vd-mit-seite .vd-dock,.vd-mit-seite .gz-toasts{left:50%}
 .vd-mit-seite .vd-modus{max-width:92%}
 .vd-dock{bottom:232px}
}
`;

  // ---------------------------------------------------------------- Öffnen / Schließen
  function oeffnen(beimSchliessen) {
    if (wurzel) return;
    ausgang = beimSchliessen || null;
    G.einbauen();
    if (!document.getElementById('vd-stil')) { const st = document.createElement('style'); st.id = 'vd-stil'; st.textContent = STIL; document.head.appendChild(st); }
    wurzel = document.createElement('div');
    wurzel.id = 'vd'; wurzel.className = 'gz';
    document.body.appendChild(wurzel);
    wurzel.addEventListener('click', klick);
    A.bauen(wurzel, { beiTipp: kartenTipp });
    if (!hoererGesetzt) { M.beiEreignis(ereignis); hoererGesetzt = true; }
    let roh = null;
    try { roh = localStorage.getItem(M.SPEICHER); } catch (e) { roh = null; }
    if (roh && M.laden(roh, null)) starten(true);
    else heimatWaehlen();
  }
  function schliessen() {
    if (!wurzel) return;
    laeuft = false; cancelAnimationFrame(raf);
    speichern();
    document.removeEventListener('visibilitychange', sichtbar);
    A.abbauen();
    if (wurzel.parentNode) wurzel.parentNode.removeChild(wurzel);
    wurzel = null; blattAkt = null; blattArt = ''; modus = null; buehnen.length = 0; buehneLaeuft = false; hud = {}; aufgabenSig = '';
    guideEl = null; ringEl = null; guideSig = ''; tippAktiv = null; guideAn = false;
    if (ausgang) ausgang();
    else if (typeof App !== 'undefined' && App.renderSpieleMenu) App.renderSpieleMenu();
  }
  function speichern() { try { if (M.zustand()) localStorage.setItem(M.SPEICHER, M.speichern()); } catch (e) { /* Speicher voll: beim nächsten Mal */ } }
  function sichtbar() { if (document.hidden) speichern(); }

  function starten(gespeichert) {
    const S = M.zustand(), t = jetzt();
    // „Während du weg warst“: vorher/nachher vergleichen
    const vor = { taler: S.statistik.taler, fahrten: S.statistik.fahrten, fahrgaeste: S.statistik.fahrgaeste, kisten: S.statistik.kisten, zeit: S.zeit };
    stumm = true;
    M.simuliere(t);
    stumm = false;
    oberflaecheBauen();
    A.zeichneNetz();
    kameraAufNetz(true);
    const weg = t - vor.zeit;
    if (gespeichert && weg > 120000 && S.statistik.fahrten > vor.fahrten) {
      buehneRein(() => berichtZeigen({ weg, taler: S.statistik.taler - vor.taler, fahrten: S.statistik.fahrten - vor.fahrten, fahrgaeste: S.statistik.fahrgaeste - vor.fahrgaeste, kisten: S.statistik.kisten - vor.kisten }), true);
    }
    lernLieferung();
    laeuft = true; tSim = tHud = tSpeicher = tKohle = tLern = 0;
    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', sichtbar);
    wurzel.addEventListener('pointerdown', eingabe, true);
    guideVorbereiten();
  }
  function kameraAufNetz(sofort) {
    const S = M.zustand(), ids = Object.keys(S.bahnhoefe);
    // kleines Netz: Nachbarn mit zeigen, damit Max sieht, wohin es gehen kann
    const mehr = ids.length < 6 ? ids.concat(...ids.map(c => M.NACH[c].map(n => n.n))) : ids;
    A.zeige(mehr, { sofort, rechts: istQuer() ? 340 : 0, unten: istQuer() ? 60 : 180, zMax: 2.6 });
  }
  const istQuer = () => window.innerWidth > window.innerHeight;

  // ---------------------------------------------------------------- Hauptschleife
  function frame(t) {
    if (!laeuft) return;
    raf = requestAnimationFrame(frame);
    if (t - tFrame < 30) return;          // ~30 Bilder/s reichen und schonen das alte Tablet
    tFrame = t;
    const j = jetzt();
    if (t - tSim > 250) { tSim = t; M.simuliere(j); }
    if (t - tKohle > 2000) { tKohle = t; M.autoKohle(j); }
    if (t - tHud > 400) { tHud = t; hudAktualisieren(j); }
    if (t - tLern > 20000) { tLern = t; lernLieferung(); }
    if (t - tGuide > 250) { tGuide = t; guideTick(); }
    if (t - tSpeicher > 10000) { tSpeicher = t; speichern(); }
    A.rahmen(j, t);
  }

  // ---------------------------------------------------------------- Ereignisse aus dem Modell
  function ereignis(art, d) {
    if (!wurzel) return;
    if (art === 'land') { buehneRein(() => landZeigen(d.land)); A.zeichneNetz(); return; }
    if (art === 'level') { buehneRein(() => stufeZeigen(d.level)); return; }
    if (art === 'bahn') { buehneRein(() => bahnZeigen(d.id, d.bonus)); return; }
    if (art === 'karte') { aufgabenSig = ''; A.linieZeigen(null); A.markieren([]); buehneRein(() => karteErfuellt(d)); return; }
    if (stumm) return;
    if (art === 'ankunft') { if (guideAn) guideFlag.fahrt = true; plusAnzeigen(d); const la = M.lok(d.uid); if (la && !blattAkt) ton(D.LOK[la.id].antrieb === 'dampf' ? 'puff' : 'ding', null, { leise: true, pause: 6000 }); return; }
    if (art === 'gebaut') { A.zeichneNetz(); aufgabenSig = ''; ton('fertig'); return; }
    if (art === 'stadt') {
      const s = D.STADT[d.stadt];
      G.toast(wurzel, '<b>' + esc(s.name) + '</b> ist angeschlossen. ' + esc(kurzFakt(s)), { icon: 'bahnhof', dauer: 4800, beiTipp: () => stadtBlatt(d.stadt) });
      return;
    }
    if (art === 'auftragFertig') { aufgabenSig = ''; ton('fertig'); return; }
    if (art === 'kohleLeer') { kohleWarnung(); return; }
    if (art === 'notration') { G.toast(wurzel, '<b>Notration:</b> Kasse und Energielager waren leer. Für heute reicht es noch für ein paar Fahrten. Mehr Energie gibt es für Lernrunden.', { icon: 'blitz', dauer: 6500 }); return; }
    if (['lok', 'linie', 'verkauft', 'ausbau', 'werk', 'volldampf', 'lernbonus', 'baustart', 'belohnung', 'gebaeude'].indexOf(art) >= 0) { aufgabenSig = ''; A.zeichneNetz(); }
  }
  function kurzFakt(s) { return s.ware ? 'Von hier kommt: ' + D.WAREN[s.ware].name + '.' : s.fakt.split('. ')[0] + (s.fakt.indexOf('. ') > 0 ? '.' : ''); }
  let kohleWarnZeit = 0;
  function kohleWarnung() {
    if (Date.now() - kohleWarnZeit < 60000) return;
    kohleWarnZeit = Date.now();
    G.toast(wurzel, '<b>Energie aufgebraucht.</b> Ein Zug wartet. Energie gibt es für Geld oder fürs Lernen.', { icon: 'blitz', dauer: 4500, beiTipp: kohleBlatt });
  }
  function plusAnzeigen(d) {
    if (effekte > 5 || G.weniger()) return;
    const p = A.schirmVonStadt(d.nach);
    const r = wurzel.getBoundingClientRect();
    if (!p || p[0] < 0 || p[1] < 70 || p[0] > r.width - (istQuer() ? 330 : 0) || p[1] > r.height) return;
    const e = document.createElement('div');
    e.className = 'vd-plus';
    e.style.setProperty('--x', (p[0] + 8).toFixed(0) + 'px'); e.style.setProperty('--y', (p[1] - 22).toFixed(0) + 'px');
    e.textContent = '+' + geld(d.taler);
    wurzel.appendChild(e); effekte++;
    setTimeout(() => { effekte--; if (e.parentNode) e.parentNode.removeChild(e); }, 1450);
    if (hud.taler) { hud.taler.classList.remove('gz-puls'); void hud.taler.offsetWidth; hud.taler.classList.add('gz-puls'); }
  }

  // ---------------------------------------------------------------- Oberfläche
  function kennzahl(aktion, icon, label, klasse, nach) {
    return '<div class="vd-kz" data-aktion="' + aktion + '"><span class="vd-kz-label">' + G.icon(icon) + label + '</span>' +
      '<span class="vd-kz-wert"><b class="' + klasse + '">0</b>' + (nach || '') + '</span></div>';
  }
  function oberflaecheBauen() {
    const S = M.zustand();
    let striche = '';
    for (let i = 0; i < 12; i++) {
      const w = i * 30 * Math.PI / 180, r1 = i % 3 ? 17.5 : 15.5;
      striche += '<path d="M' + (24 + Math.sin(w) * r1).toFixed(1) + ' ' + (24 - Math.cos(w) * r1).toFixed(1) + 'L' + (24 + Math.sin(w) * 20).toFixed(1) + ' ' + (24 - Math.cos(w) * 20).toFixed(1) + '" stroke="' + (i % 3 ? '#4A525C' : '#A1A9B3') + '" stroke-width="' + (i % 3 ? 1 : 1.6) + '"/>';
    }
    const uhr = '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22.5" fill="#0C0E11" stroke="rgba(255,255,255,.16)" stroke-width="1"/>' + striche +
      '<path class="vd-uhr-zeiger vd-uhr-h" d="M24 24V13.5" stroke="#E6E9ED" stroke-width="2.4" stroke-linecap="round"/><path class="vd-uhr-zeiger vd-uhr-m" d="M24 24V7.5" stroke="#E6E9ED" stroke-width="1.4" stroke-linecap="round"/>' +
      '<circle cx="24" cy="24" r="1.9" fill="#E2A63B"/></svg>';
    const div = document.createElement('div');
    div.innerHTML =
      '<div class="vd-leiste">' +
        '<button class="vd-leiste-knopf" data-aktion="schliessen" aria-label="Zurück">' + G.icon('zurueck') + '</button>' +
        '<div class="vd-marke"><b>VOLLDAMPF</b><span>Heimat ' + esc(D.STADT[S.heimat].name) + '</span></div>' +
        kennzahl('taler', 'muenze', 'Kasse', 'vd-taler') +
        kennzahl('kohle', 'blitz', 'Energie', 'vd-kohle', '<small class="vd-kohle-min"></small>') +
        kennzahl('gold', 'ticket', 'Goldtickets', 'vd-gold') +
        kennzahl('ziel', 'land', 'Bundesländer', 'vd-laender-zahl', '<small>/ 16</small>') +
        kennzahl('stufe', 'xp', 'Stufe', 'vd-stufe-zahl', '<span class="vd-kz-balken"><i class="vd-xp"></i></span>') +
        '<span class="vd-leiste-rest"></span>' +
        '<div class="vd-uhr" data-aktion="uhr">' + uhr + '<span class="vd-uhr-text"><span class="gz-ueber">Bahnzeit</span><span class="vd-uhr-digital"></span></span></div>' +
        '<button class="vd-leiste-knopf vd-rechts vd-hilfe" data-aktion="hilfe" aria-label="Spielziel und Anleitung">' + G.icon('hilfe') + '</button>' +
      '</div>' +
      '<aside class="vd-seite">' +
        '<div class="vd-kessel"><div class="vd-kessel-kopf">' + G.icon('volldampf') + '<span class="gz-ueber">Volldampf</span></div>' +
          '<div class="vd-kessel-zeile"><div class="vd-kessel-wert"><b class="vd-kessel-zahl">0</b><small class="vd-kessel-einheit"></small></div><span class="vd-kessel-knopf"></span></div>' + G.balken(0) + '</div>' +
        '<div class="vd-seite-kopf"><span class="gz-ueber">Aufträge</span><span class="vd-anzahl"></span></div><div class="vd-auftraege"></div></aside>' +
      '<div class="vd-dock">' +
        '<button class="vd-werkzeug vd-k-bauen" data-aktion="bauen">' + G.icon('gleis') + 'Bauen</button>' +
        '<button class="vd-werkzeug" data-aktion="loks">' + G.icon('schuppen') + 'Fuhrpark</button>' +
        '<button class="vd-werkzeug" data-aktion="album">' + G.icon('album') + 'Sammlung</button>' +
        '<span class="vd-dock-trenner"></span>' +
        '<button class="vd-werkzeug vd-nur-icon" data-aktion="zoomRaus" aria-label="Herauszoomen">' + G.icon('minus') + '</button>' +
        '<button class="vd-werkzeug vd-nur-icon" data-aktion="zoomRein" aria-label="Heranzoomen">' + G.icon('plus') + '</button>' +
        '<button class="vd-werkzeug vd-nur-icon" data-aktion="heimat" aria-label="Mein Netz zeigen">' + G.icon('zentrieren') + '</button>' +
      '</div>';
    while (div.firstChild) wurzel.appendChild(div.firstChild);
    wurzel.classList.add('vd-mit-seite');
    hud = {
      taler: wurzel.querySelector('.vd-taler'), kohle: wurzel.querySelector('.vd-kohle'), kohleMin: wurzel.querySelector('.vd-kohle-min'),
      gold: wurzel.querySelector('.vd-gold'), laender: wurzel.querySelector('.vd-laender-zahl'), stufe: wurzel.querySelector('.vd-stufe-zahl'), xp: wurzel.querySelector('.vd-xp'),
      uhrH: wurzel.querySelector('.vd-uhr-h'), uhrM: wurzel.querySelector('.vd-uhr-m'), uhrD: wurzel.querySelector('.vd-uhr-digital'),
      auftraege: wurzel.querySelector('.vd-auftraege'), anzahl: wurzel.querySelector('.vd-anzahl'),
      kessel: wurzel.querySelector('.vd-kessel'), kesselZahl: wurzel.querySelector('.vd-kessel-zahl'), kesselEinheit: wurzel.querySelector('.vd-kessel-einheit'),
      kesselBalken: wurzel.querySelector('.vd-kessel .gz-balken-fuell'), kesselKnopf: wurzel.querySelector('.vd-kessel-knopf'),
      bauen: wurzel.querySelector('.vd-k-bauen'), letzt: {}
    };
    hudAktualisieren(jetzt());
  }
  function setzeText(el, t) { if (el && el.textContent !== t) el.textContent = t; }
  function hudAktualisieren(j) {
    const S = M.zustand();
    if (!S || !hud.taler) return;
    setzeText(hud.taler, geld(S.taler));
    setzeText(hud.kohle, G.zahl(S.kohle));
    const min = M.kohleReichtMinuten();
    setzeText(hud.kohleMin, min == null ? '' : min > 600 ? '> 10 Std' : '≈ ' + min + ' Min');
    setzeText(hud.gold, String(S.gold));
    setzeText(hud.laender, String(Object.keys(S.laender).length));
    setzeText(hud.stufe, String(S.level));
    const a = M.xpFuer(S.level), b = M.xpFuer(S.level + 1);
    const anteil = S.level >= M.W.LEVEL_MAX ? 1 : (S.xp - a) / Math.max(1, b - a);
    const tf = 'scaleX(' + Math.max(0, Math.min(1, anteil)).toFixed(3) + ')';
    if (hud.xp.style.transform !== tf) hud.xp.style.transform = tf;
    // Bahnuhr
    const bz = M.bahnzeit(j);
    hud.uhrH.style.transform = 'rotate(' + ((bz % 720) / 2) + 'deg)';
    hud.uhrM.style.transform = 'rotate(' + ((bz % 60) * 6) + 'deg)';
    if (!hud.uhrD.firstChild || hud.letzt.uhr !== M.uhr(j)) { hud.letzt.uhr = M.uhr(j); hud.uhrD.innerHTML = G.fallblatt(M.uhr(j), { klappen: false }); }
    // Volldampf
    const v = S.volldampf, an = j < v.bis;
    const vorratMin = Math.round(v.vorrat / 60000);
    const restMs = Math.max(0, v.bis - j);
    hud.kessel.classList.toggle('vd-kessel-an', an);
    setzeText(hud.kesselZahl, an ? Math.floor(restMs / 60000) + ':' + String(Math.floor(restMs / 1000) % 60).padStart(2, '0') : String(vorratMin));
    setzeText(hud.kesselEinheit, an ? 'aktiv · doppeltes Tempo' : vorratMin ? 'Min verfügbar' : 'Min · Kessel leer');
    const ka = an ? Math.min(1, restMs / Math.max(restMs, 600000)) : Math.min(1, vorratMin / 60);
    const kf = 'scaleX(' + ka.toFixed(3) + ')';
    if (hud.kesselBalken.style.transform !== kf) hud.kesselBalken.style.transform = kf;
    const kSig = an ? 'an' : vorratMin > 0 ? 'bereit' : 'leer';
    if (hud.letzt.kessel !== kSig) {
      hud.letzt.kessel = kSig;
      hud.kesselKnopf.innerHTML = kSig === 'bereit' ? G.knopf('Volldampf geben', { art: 'primaer', klein: true, aktion: 'volldampf', icon: 'blitz' }) :
        kSig === 'an' ? '' : '<span class="vd-kessel-hinweis" data-aktion="volldampfInfo">Füllt sich mit<br>jeder Lernrunde</span>';
    }
    hud.bauen.classList.toggle('gz-aktiv', !!(modus && modus.art === 'bauen'));
    auftraegeZeichnen();
  }

  // ---------------------------------------------------------------- Aufträge (Liste rechts)
  function auftragText(a) {
    const s = D.STADT[a.ziel], land = D.LAENDER[s.land];
    if (a.art === 'anschluss') {
      const unter = land.hauptstadt === a.ziel ? 'Landeshauptstadt von ' + land.name : s.ware ? 'Ware vor Ort: ' + D.WAREN[s.ware].name : 'Rund ' + G.zahl(Math.round(s.einw / 1000) * 1000) + ' Einwohner';
      return { art: 'Anschluss · ' + land.name, farbe: land.farbe, titel: 'Verbinde ' + s.name, text: unter };
    }
    if (a.art === 'fracht') return { art: 'Fracht · ' + D.WAREN[a.ware].name, farbe: land.farbe, titel: D.WAREN[a.ware].name + ' nach ' + s.name, text: 'Ab ' + D.STADT[a.von].name + ' · ' + a.stand + ' von ' + a.menge + ' Kisten', anteil: a.stand / a.menge };
    return { art: 'Personenverkehr', farbe: land.farbe, titel: 'Fahrgäste nach ' + s.name, text: a.stand + ' von ' + a.menge + ' Fahrgästen', anteil: a.stand / a.menge };
  }
  function auftraegeZeichnen() {
    const S = M.zustand();
    const sig = JSON.stringify(S.auftraege.map(a => [a.aid, a.stand, a.fertig ? 1 : 0, M.auftragHilfe(a.aid).tun])) + '|' + Math.floor(S.taler / 50) + '|' + Object.keys(S.strecken).length + '|' + S.loks.length + '|' + JSON.stringify(M.kartenStand()) + S.loks.map(l => l.linie && l.linie.karte ? 1 : 0).join('') + Object.keys(S.strecken).filter(k => S.strecken[k].fertig).length + S.level;
    if (sig === aufgabenSig) return;
    aufgabenSig = sig;
    let h = kartePanel();
    S.auftraege.forEach(a => {
      const t = auftragText(a), hilfe = M.auftragHilfe(a.aid);
      let knopf = '';
      if (a.fertig) knopf = G.knopf('Abholen', { art: 'primaer', klein: true, aktion: 'abholen', wert: a.aid });
      else if (hilfe.tun === 'bauen') knopf = G.knopf(hilfe.preis ? 'Bauen · ' + geld(hilfe.preis) : 'Bauen · gratis', { art: hilfe.preis <= S.taler ? 'primaer' : null, aus: hilfe.preis > S.taler, klein: true, aktion: 'auftragBauen', wert: a.aid });
      else if (hilfe.tun === 'zug') knopf = G.knopf('Zug einsetzen', { art: 'primaer', klein: true, aktion: 'auftragZug', wert: a.aid });
      else if (hilfe.tun === 'laeuft') knopf = '<span class="vd-status">Zug unterwegs</span>';
      else knopf = '<span class="vd-status vd-status-warte">Netz noch zu weit weg</span>';
      h += '<div class="vd-auftrag' + (a.fertig ? ' vd-erfuellt' : '') + '" style="--lf:' + t.farbe + '">' +
        '<div class="vd-auftrag-kopf"><span class="gz-ueber">' + esc(a.fertig ? 'Erfüllt · ' + t.art : t.art) + '</span>' +
        '<span class="vd-mini" data-aktion="auftragZeigen" data-wert="' + a.aid + '" aria-label="Auf der Karte zeigen">' + G.icon('zentrieren') + '</span></div>' +
        '<div class="vd-auftrag-titel">' + esc(t.titel) + '</div><div class="vd-auftrag-text">' + esc(t.text) + '</div>' +
        (t.anteil != null && !a.fertig ? G.balken(t.anteil) : '') +
        '<div class="vd-auftrag-fuss"><span class="vd-lohn"><span>' + G.icon('muenze') + geld(a.taler) + '</span><span>' + G.icon('xp') + a.xp + '</span></span>' + knopf + '</div></div>';
    });
    hud.auftraege.innerHTML = h;
    setzeText(hud.anzahl, S.auftraege.length + (S.auftraege.length === 1 ? ' offen' : ' offen'));
  }

  // ---------------------------------------------------------------- Klicks (ein Zuhörer für alles)
  function klick(e) {
    const k = e.target.closest ? e.target.closest('[data-aktion]') : null;
    if (!k || k.getAttribute('aria-disabled') === 'true') return;
    const was = k.getAttribute('data-aktion'), wert = k.getAttribute('data-wert');
    const j = jetzt();
    switch (was) {
      case 'schliessen': schliessen(); break;
      case 'bauen': modus && modus.art === 'bauen' ? modusEnde() : bauModus(); break;
      case 'loks': lokBlatt(M.zustand().loks.length ? 'meine' : 'kaufen'); break;
      case 'zoomRein': case 'zoomRaus': A.zoomen(was === 'zoomRein' ? 1.8 : 1 / 1.8, (window.innerWidth - (istQuer() ? 320 : 0)) / 2, (window.innerHeight + 60) / 2); break;
      case 'abt': abtWahl = wert; blattZu(); lokBlatt('kaufen'); break;
      case 'gebaeude': {
        const [c, art] = wert.split(':'); const r = M.baueGebaeude(c, art, j);
        if (r.ok) { ton('bau'); blattZu(); G.toast(wurzel, '<b>' + esc(D.GEBAEUDE[art].name) + '</b> in ' + esc(D.STADT[c].name) + ' steht. Zoome heran, um es zu sehen.', { icon: D.GEBAEUDE[art].icon }); A.zeichneNetz(); A.zeige([c], { z: 9, zMax: 10, rechts: rechtsFrei() }); aufgabenSig = ''; }
        else G.toast(wurzel, esc(r.grund), { icon: 'info' });
        break;
      }
      case 'album': albumBlatt(); break;
      case 'bahnBlatt': bahnBlatt(wert); break;
      case 'kartenWahl': kartenWahlBlatt(); break;
      case 'tonUm': { const S = M.zustand(); S.ton = S.ton === false; if (S.ton) ton('gong'); zielBlatt(); break; }
      case 'taufBlatt': taufBlatt(+wert); break;
      case 'taufe': { const i = wert.indexOf(':'), uid = +wert.slice(0, i), name = wert.slice(i + 1); const r = M.taufe(uid, name, j); if (r.ok) { ton('glocke'); const l = M.lok(uid); G.toast(wurzel, lokName(l) + ' heißt jetzt <b>„' + esc(name) + '“</b>.', { icon: 'ticket', dauer: 4500 }); lokDetail(l); } else G.toast(wurzel, esc(r.grund), { icon: 'info' }); break; }
      case 'karteBlatt': karteBlatt(wert); break;
      case 'karteZeigen': karteStaedteZeigen(wert); break;
      case 'karteNehmen': { if (M.karteNehmen(wert).ok) { aufgabenSig = ''; const kk = M.karte(wert); if (kk.gebaut) karteBlatt(wert); else karteStaedteZeigen(wert); } break; }
      case 'karteZurueck': M.karteZurueck(); aufgabenSig = ''; A.linieZeigen(null); A.markieren([]); kartenWahlBlatt(); break;
      case 'karteFahren': { const r = M.karteFahren(+wert, j); if (r.ok) { blattZu(); ton('pfiff', M.lok(+wert).id); const l = M.lok(+wert); A.zeige(l.linie.weg, { rechts: istQuer() ? 340 : 0, zMax: 2.6 }); G.toast(wurzel, lokName(l) + ' startet zur <b>Eröffnungsfahrt</b>' + (r.passt ? ' – der Zug wie in echt.' : '.'), { icon: 'lok', dauer: 4500 }); } else G.toast(wurzel, esc(r.grund), { icon: r.strom ? 'blitz' : 'info', dauer: 5000 }); aufgabenSig = ''; break; }
      case 'bahnZeigen': { const B = M.bahn(wert); if (B) { const ids = {}; B.teile.forEach(x => { ids[x.a] = 1; ids[x.b] = 1; }); blattZu(); A.markieren(Object.keys(ids)); A.zeige(Object.keys(ids), { zMax: 2.6 }); if (B.teile.some(x => !x.fertig) && M.baubar().some(k => M.bahnVon(k.a, k.b).id === B.id)) bauModus(Object.keys(ids)); } break; }
      case 'heimat': kameraAufNetz(false); break;
      case 'kohle': kohleBlatt(); break;
      case 'taler': G.toast(wurzel, '<b>Kasse.</b> Geld verdienen deine Züge mit Fahrgästen und Waren. Davon baust du Strecken, Gebäude und kaufst Züge.', { icon: 'muenze' }); break;
      case 'gold': G.toast(wurzel, '<b>Goldtickets</b> gibt es für jede Lernrunde und jedes neue Bundesland. Damit holst du dir Dampfloks für Sonderfahrten, taufst Züge oder stellst Baustellen sofort fertig.', { icon: 'ticket', dauer: 5000 }); break;
      case 'stufe': stufeInfo(); break;
      case 'uhr': uhrInfo(); break;
      case 'volldampf': { const r = M.volldampfGeben(j); if (r.ok) { ton('pfiff'); G.toast(wurzel, '<b>Volldampf aktiv.</b> Alle Züge und Bautrupps arbeiten doppelt so schnell.', { icon: 'volldampf' }); hud.letzt.kessel = ''; } break; }
      case 'volldampfInfo': G.toast(wurzel, '<b>Volldampf</b> gibt es für jede Lernrunde in der Lern-App. Solange er läuft, fahren alle Züge doppelt so schnell.', { icon: 'volldampf', dauer: 5000 }); break;
      case 'abholen': abholen(+wert, k); break;
      case 'auftragBauen': { const h = M.auftragHilfe(+wert); if (h.tun === 'bauen') { A.zeige([h.a, h.b], { rechts: rechtsFrei(), zMax: 2.6 }); bauBlatt(M.baubar().find(x => x.id === h.id)); } break; }
      case 'auftragZug': { const r = M.auftragBedienen(+wert, j); if (r.ok) { const l = M.lok(r.uid); G.toast(wurzel, lokName(l) + ' fährt jetzt <b>' + esc(D.STADT[l.linie.von].name) + ' ⇄ ' + esc(D.STADT[l.linie.nach].name) + '</b>', { icon: 'lok' }); A.zeige(l.linie.weg, { rechts: istQuer() ? 340 : 0, zMax: 2.6 }); ton('pfiff', l.id); } else G.toast(wurzel, esc(r.grund || 'Das geht gerade nicht.'), { icon: 'info' }); aufgabenSig = ''; break; }
      case 'auftragZeigen': auftragZeigen(+wert); break;
      case 'bauenJa': { const r = M.baue(k.getAttribute('data-a'), k.getAttribute('data-b'), j); blattZu(); if (r.ok) { ton('bau'); A.zeichneNetz(); G.toast(wurzel, 'Der Bautrupp beginnt mit der Strecke.', { icon: 'kran' }); if (modus && modus.art === 'bauen' && !M.baubar().length) modusEnde(); } else G.toast(wurzel, esc(r.grund), { icon: 'info' }); aufgabenSig = ''; break; }
      case 'gleis2Ja': { const r = M.gleis2Bauen(k.getAttribute('data-a'), k.getAttribute('data-b'), j); if (r.ok) { ton('bau'); A.zeichneNetz(); G.toast(wurzel, 'Das zweite Gleis liegt. Jetzt passen hier ' + M.W.KAP_ZWEI + ' Züge.', { icon: 'gleis' }); streckeBlatt(k.getAttribute('data-a'), k.getAttribute('data-b')); } else G.toast(wurzel, esc(r.grund), { icon: 'info' }); aufgabenSig = ''; break; }
      case 'oberleitungJa': { const r = M.oberleitungBauen(k.getAttribute('data-a'), k.getAttribute('data-b'), j); blattZu(); if (r.ok) { ton('bau'); A.zeichneNetz(); G.toast(wurzel, 'Die Oberleitung hängt. Jetzt können hier auch E-Loks und ICEs fahren.', { icon: 'blitz' }); } else G.toast(wurzel, esc(r.grund), { icon: 'info' }); aufgabenSig = ''; break; }
      case 'sofort': { const r = M.sofortFertig(wert, j); blattZu(); if (!r.ok) G.toast(wurzel, esc(r.grund || 'Geht nicht.'), { icon: 'info' }); break; }
      case 'lokKaufen': { const r = M.kaufeLok(wert, j); if (r.ok) { ton('pfiff', wert); blattZu(); lokGekauft(r.uid); } else G.toast(wurzel, esc(r.grund), { icon: 'info' }); break; }
      case 'linie': { const ll = M.lok(+wert); if (ll && D.LOK[ll.id].antrieb === 'dampf') { sonderBlatt(+wert); break; } blattZu(); linienModus(+wert, null); break; }
      case 'sonderBlatt': sonderBlatt(+wert); break;
      case 'sonderFahren': { const i = wert.indexOf(':'), uid = +wert.slice(0, i), id = wert.slice(i + 1); const r = M.sonderFahren(uid, id, j); if (r.ok) { blattZu(); ton('pfiff', M.lok(uid).id); const l = M.lok(uid); A.zeige(l.linie.weg, { rechts: istQuer() ? 340 : 0, zMax: 2.6 }); G.toast(wurzel, lokName(l) + ' dampft los: <b>' + esc(D.LINIE[id].name) + '</b>', { icon: 'dampf', dauer: 4500 }); } else G.toast(wurzel, esc(r.grund), { icon: 'info', dauer: 5000 }); aufgabenSig = ''; break; }
      case 'depot': M.insDepot(+wert, j); blattZu(); lokBlatt('meine'); break;
      case 'verkaufen': { const r = M.verkaufeLok(+wert, j); blattZu(); if (r.ok) G.toast(wurzel, 'Verkauft für ' + geld(r.preis) + '.', { icon: 'muenze' }); else G.toast(wurzel, esc(r.grund), { icon: 'info' }); lokBlatt('meine'); break; }
      case 'werk': { const [uid, art] = wert.split(':'); const r = M.werkstatt(+uid, art, j); if (!r.ok) G.toast(wurzel, esc(r.grund), { icon: 'info' }); else { ton('bau'); blattZu(); lokBlatt('meine'); } break; }
      case 'tabMeine': blattZu(); lokBlatt('meine'); break;
      case 'tabKaufen': blattZu(); lokBlatt('kaufen'); break;
      case 'kohleKaufen': { const r = M.kaufeKohle(1e9, j); blattZu(); G.toast(wurzel, r.ok ? 'Energielager aufgefüllt: +' + G.zahl(r.menge) : esc(r.grund), { icon: 'blitz' }); break; }
      case 'ausbau': { const [art, stadt] = wert.split(':'); const r = M.ausbau(art, j, stadt); blattZu(); if (r.ok) { ton('bau'); G.toast(wurzel, art === 'bunker' ? 'Das Energielager ist jetzt größer!' : art === 'bautrupp' ? 'Ein neuer Bautrupp ist da!' : 'Der Bahnhof ist größer – mehr Fahrgäste!', { icon: art === 'bunker' ? 'blitz' : art === 'bautrupp' ? 'kran' : 'bahnhof' }); } else G.toast(wurzel, esc(r.grund), { icon: 'info' }); break; }
      case 'zugVonHier': { blattZu(); const uid = freieLok(); if (uid == null) { G.toast(wurzel, 'Du hast keinen freien Zug. Kauf einen neuen oder ändere eine Linie im Fuhrpark.', { icon: 'schuppen', beiTipp: () => lokBlatt('kaufen') }); break; } linienModus(uid, wert); break; }
      case 'stadtBauen': { blattZu(); const kk = M.baubar().find(x => x.id === wert); if (kk) bauBlatt(kk); break; }
      case 'linieLos': linieBestaetigen(); break;
      case 'modusEnde': modusEnde(); break;
      case 'heimatJa': heimatGewaehlt(wert); break;
      case 'stadtBlatt': blattZu(); stadtBlatt(wert); break;
      case 'ziel': case 'hilfe': zielBlatt(); break;
      case 'guideWeiter': { const sch = SCHRITTE[guideIndex()]; if (sch) guideFlag[sch.id] = true; aufgabenSig = ''; guideTick(); break; }
      case 'guideEnde': guideBeenden(); break;
      case 'guideNochmal': blattZu(); guideFlag = {}; guideAn = true; M.zustand().hilfe.guide = 0; guideTick(); break;
      case 'tippOk': tippAus(); break;
      default: break;
    }
  }
  function lokName(l) { return G.schild(lokNummer(l)); }
  function lokNummer(l) {
    const L = D.LOK[l.id];
    const nr = { t3: '89 6' + String(l.uid).padStart(3, '0'), br94: '94 1' + String(l.uid).padStart(3, '0'), hsb: '99 72' + String(30 + l.uid % 70), roland: '99 178' + (l.uid % 9 + 1),
      saxonia: 'SAXONIA', adler: 'ADLER', br18201: '18 201', br05: '05 00' + (l.uid % 3 + 1), br10: '10 00' + (l.uid % 2 + 1),
      svt877: 'SVT 877', icev: 'ICE V', tee: 'VT 11 5' + String(l.uid % 19 + 1).padStart(2, '0'), rs1: '650 ' + String(100 + l.uid), lint: '648 ' + String(100 + l.uid % 900), talent2: '442 ' + String(100 + l.uid % 900),
      dosto: '146 ' + String(100 + l.uid % 150), desirohc: '462 0' + String(10 + l.uid % 80), vectron: '193 ' + String(300 + l.uid % 600), ic2: '146 5' + String(50 + l.uid % 40),
      ice3neo: '408 0' + String(10 + l.uid % 80), flirt: 'ET 4' + String(10 + l.uid % 80), br423: '423 ' + String(100 + l.uid % 400),
      mireo: '463 5' + String(10 + l.uid % 80), ilint: '554 0' + String(10 + l.uid % 17),
      iceT: '411 0' + String(10 + l.uid % 60), ice1: '401 0' + String(10 + l.uid % 50), ice3: '403 0' + String(10 + l.uid % 37), ice4: '412 0' + String(10 + l.uid % 80) };
    return nr[l.id] || (L.name + ' ' + String(100 + l.uid).padStart(3, '0'));
  }
  /** Hat Max schon irgendwo eine fertige Strecke mit Oberleitung? */
  function stromImNetz() { const S = M.zustand(); return Object.keys(S.strecken).some(k => { const s = S.strecken[k]; return s.fertig && M.strom(s.a, s.b); }); }
  function freieLok() { const S = M.zustand(); const f = S.loks.find(l => !l.linie && D.LOK[l.id].antrieb !== 'dampf'); return f ? f.uid : null; }

  // ---------------------------------------------------------------- Karte antippen
  function kartenTipp(t) {
    if (buehneLaeuft) return;
    if (modus && modus.art === 'heimat') { if (t.art === 'stadt' && D.HEIMAT_AUSWAHL.indexOf(t.id) >= 0) heimatBlatt(t.id); return; }
    if (modus && modus.art === 'linie') { if (t.art === 'stadt') linieStadt(t.id); return; }
    if (t.art === 'kante') { bauBlatt(t.kante); return; }
    if (t.art === 'stadt') { stadtBlatt(t.id); return; }
    if (t.art === 'zug') { const l = M.lok(t.uid); if (l) lokDetail(l); return; }
    if (t.art === 'baustelle') { baustelleBlatt(t.id); return; }
    if (t.art === 'strecke') { streckeBlatt(t.a, t.b); return; }
  }

  // ---------------------------------------------------------------- Blätter
  function blattZu() { if (blattAkt) { blattAkt.zu(); blattAkt = null; blattArt = ''; } }
  let blattArt = '';
  /** Blatt öffnen – im Querformat immer als Seitenleiste rechts (überdeckt die Auftragsliste) */
  function blatt(html, opt) {
    blattZu();
    const o = Object.assign({ seite: seite() }, opt || {});
    const b = G.blatt(wurzel, html, Object.assign(o, { beimZu: () => { if (blattAkt === b) { blattAkt = null; blattArt = ''; } } }));
    blattAkt = b; blattArt = o.art || '';
    return b;
  }
  const seite = () => istQuer();
  const rechtsFrei = () => istQuer() ? 480 : 0;   // Platz für die Seitenleiste, wenn die Kamera etwas zeigt
  const einw = s => 'rund ' + G.zahl(s.einw >= 1e6 ? Math.round(s.einw / 1e5) * 1e5 : Math.round(s.einw / 1000) * 1000);
  const punkt = farbe => '<i class="vd-punkt" style="background:' + farbe + '"></i>';

  function bauModus(ziele) {
    modus = { art: 'bauen' };
    const z = {}; (ziele || []).forEach(c => { z[c] = 1; });
    A.modus('bauen', { ziele: z });
    modusBanner(G.icon('gleis') + '<b>Bauen</b> Tippe auf eine gestrichelte Strecke oder ihren Preis.', 'Fertig');
    if (!M.baubar().length) G.toast(wurzel, 'Hier gibt es gerade nichts zu bauen.', { icon: 'info' });
  }
  function modusBanner(html, knopf) {
    let b = wurzel.querySelector('.vd-modus');
    if (!b) { b = document.createElement('div'); b.className = 'vd-modus'; wurzel.appendChild(b); }
    b.innerHTML = '<span>' + html + '</span>' + (knopf ? G.knopf(knopf, { art: 'dunkel', klein: true, aktion: 'modusEnde' }) : '');
  }
  function modusEnde() {
    modus = null;
    A.modus('normal'); A.linieZeigen(null); A.markieren([]);
    const b = wurzel.querySelector('.vd-modus'); if (b) b.parentNode.removeChild(b);
  }
  function minText(ms) {   // Bahnzeit: 1 s = 1 Bahn-Minute
    const m = Math.round(ms / 1000);
    return m < 60 ? m + ' Min' : Math.floor(m / 60) + ' Std ' + String(m % 60).padStart(2, '0') + ' Min';
  }
  function echtZeit(ms) { const s = Math.ceil(ms / 1000); return s < 60 ? s + ' Sekunden' : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' Minuten'; }
  function bauBlatt(k) {
    if (!k) return;
    const S = M.zustand();
    const neu = M.angebunden(k.a) ? (M.angebunden(k.b) ? null : k.b) : k.a;
    const s = neu ? D.STADT[neu] : null;
    const fehlt = k.preis - Math.floor(S.taler);
    const voll = M.baustellen().length >= S.bautrupps;
    let h = G.kopf(D.STADT[k.a].name + ' – ' + D.STADT[k.b].name, esc(k.name || ('Luftlinie ' + k.km + ' km')), 'gleis', 'Neue Strecke') + '<div class="gz-inhalt">';
    const zeilen = [];
    if (s) {
      const land = D.LAENDER[s.land], landNeu = !S.laender[s.land];
      zeilen.push(['Neuer Bahnhof', esc(s.name)]);
      zeilen.push(['Bundesland', punkt(land.farbe) + esc(land.name) + (landNeu ? ' · neu' : ''), { neu: landNeu }]);
      if (land.hauptstadt === neu) zeilen.push(['Status', 'Landeshauptstadt']);
      zeilen.push(s.ware ? ['Ware', esc(D.WAREN[s.ware].name)] : ['Einwohner', einw(s)]);
    }
    zeilen.push(['Länge (Luftlinie)', k.km + ' km', { zahl: true }]);
    zeilen.push(['Oberleitung', k.strom ? 'ja – wie in echt' : 'nein – wie in echt']);
    zeilen.push(['Bauzeit', echtZeit(k.dauer)]);
    zeilen.push(['Kosten', k.preis ? geld(k.preis) : 'gratis', { zahl: true }]);
    h += G.daten(zeilen);
    h += bahnHinweis(k.a, k.b, true);
    { const ohneZug = Object.keys(S.strecken).filter(x => S.strecken[x].fertig && !M.auslastung(S.strecken[x].a, S.strecken[x].b)).length;
      if (ohneZug >= 3) h += '<div style="margin-top:14px">' + G.notiz('lok', 'Auf <b>' + ohneZug + ' deiner Strecken</b> fährt noch kein Zug. Geld verdienst du nur dort, wo Züge fahren.') + '</div>'; }
    if (k.info) h += '<div style="margin-top:14px">' + G.notiz('info', esc(k.info)) + '</div>';
    if (s && !S.laender[s.land]) h += '<div style="margin-top:14px">' + G.notiz('ticket', 'Ein neues Bundesland bringt <b>' + M.W.LAND_GOLD + ' Goldtickets</b>.', true) + '</div>';
    h += '<div class="vd-aktionen">';
    const reserve = M.zugReserve(), zugZuerst = k.preis > 0 && reserve > 0 && S.taler - k.preis < reserve;
    if (zugZuerst && fehlt <= 0) h += G.notiz('lok', '<b>Kauf zuerst einen Zug.</b> Ohne Zug verdienst du kein Geld. Nach diesem Bau könntest du dir keinen mehr leisten.', true) + G.knopf('Zum Fuhrpark', { art: 'primaer', icon: 'schuppen', aktion: 'loks', breit: true });
    else if (voll) h += '<div class="vd-leise">Alle Bautrupps arbeiten gerade. Warte, bis eine Strecke fertig ist' + (S.bautrupps < 3 ? ' – oder stelle im Fuhrpark einen weiteren Bautrupp ein.' : '.') + '</div>';
    else if (fehlt > 0) h += G.knopf('Es fehlen ' + geld(fehlt), { aus: true, breit: true });
    else h += '<button class="gz-btn gz-btn-primaer gz-btn-breit" data-aktion="bauenJa" data-a="' + k.a + '" data-b="' + k.b + '">' + G.icon('kran') + '<span class="gz-btn-text">' + (k.preis ? 'Strecke bauen · ' + geld(k.preis) : 'Gratis bauen') + '</span></button>';
    h += '</div></div>';
    blatt(h, { art: 'bau' });
  }
  function baustelleBlatt(id) {
    const S = M.zustand(), s = S.strecken[id];
    if (!s || s.fertig) return;
    const rest = Math.max(0, s.ende - jetzt()), anteil = Math.min(1, (jetzt() - s.start) / Math.max(1, s.ende - s.start));
    let h = G.kopf(D.STADT[s.a].name + ' – ' + D.STADT[s.b].name, 'Ein Bautrupp verlegt die Gleise.', 'kran', 'Baustelle') + '<div class="gz-inhalt">' +
      G.daten([['Restbauzeit', echtZeit(rest)], ['Fortschritt', Math.round(anteil * 100) + ' %', { zahl: true }]]) +
      '<div style="margin-top:12px">' + G.balken(anteil) + '</div>' +
      '<div class="vd-aktionen">' + G.knopf('Sofort fertigstellen · 1 Goldticket', { art: S.gold > 0 ? 'primaer' : null, aus: S.gold < 1, icon: 'ticket', aktion: 'sofort', wert: id, breit: true }) + '</div>' +
      '<div class="vd-leise" style="margin-top:14px">Mit Volldampf arbeiten alle Bautrupps doppelt so schnell.</div></div>';
    blatt(h);
  }
  /** Fertige Strecke: Name, Länge, Oberleitung – und Oberleitung nachrüsten */
  function streckeBlatt(a, b) {
    const ki = M.kante(a, b), S = M.zustand(), id = M.schl(a, b), st = S.strecken[id];
    if (!ki || !st || !st.fertig) return;
    const strom = M.strom(a, b), echt = ki.strom;
    const zuege = S.loks.filter(l => l.linie && l.linie.weg.some((c, i) => i > 0 && M.schl(l.linie.weg[i - 1], c) === id));
    let h = G.kopf(D.STADT[a].name + ' – ' + D.STADT[b].name, esc(ki.name), 'gleis', 'Strecke') + '<div class="gz-inhalt">';
    h += G.daten([['Länge (Luftlinie)', ki.km + ' km', { zahl: true }],
      ['Oberleitung', strom ? (echt ? 'ja – wie in echt' : 'ja – von dir nachgerüstet') : 'nein – wie in echt'],
      ['Gleise', M.zweigleisig(a, b) ? 'zweigleisig' : 'eingleisig'],
      ['Züge auf der Strecke', zuege.filter(l => D.LOK[l.id].antrieb !== 'dampf').length + ' von ' + M.kapazitaet(a, b) + (zuege.length ? ' · ' + zuege.map(l => esc(lokNummer(l)) + (D.LOK[l.id].antrieb === 'dampf' ? ' (Sonderzug)' : '')).join(', ') : ''), { neu: M.auslastung(a, b) >= M.kapazitaet(a, b) }]]);
    if (!M.zweigleisig(a, b)) {
      const g2 = M.gleis2Baubar(a, b), gp = M.gleis2Preis(a, b);
      h += '<div style="margin-top:14px">' + G.notiz('signal', 'Auf einem Gleis kommen sich Züge in die Quere: Hier passen nur <b>' + M.W.KAP_EIN + ' Züge</b>. Mit einem zweiten Gleis sind es ' + M.W.KAP_ZWEI + '.') + '</div><div class="vd-aktionen">' +
        (g2.ok ? '<button class="gz-btn' + (M.auslastung(a, b) >= M.kapazitaet(a, b) ? ' gz-btn-primaer' : '') + ' gz-btn-breit" data-aktion="gleis2Ja" data-a="' + a + '" data-b="' + b + '">' + G.icon('gleis') + '<span class="gz-btn-text">Zweites Gleis bauen · ' + geld(gp) + '</span></button>'
          : G.knopf(S.level < M.W.GLEIS2_LEVEL ? 'Zweites Gleis ab Stufe ' + M.W.GLEIS2_LEVEL : g2.grund, { aus: true, breit: true })) + '</div>';
    }
    h += bahnHinweis(a, b, false);
    if (ki.info) h += '<div style="margin-top:14px">' + G.notiz('info', esc(ki.info)) + '</div>';
    if (!strom) {
      const k = M.oberleitungBaubar(a, b), preis = M.oberleitungPreis(a, b);
      h += '<div style="margin-top:14px">' + G.notiz('blitz', 'Ohne Oberleitung fahren hier nur Dampfloks, Dieselzüge und der Wasserstoffzug. Mit Oberleitung auch E-Loks und ICEs.') + '</div><div class="vd-aktionen">';
      if (k.ok) h += '<button class="gz-btn gz-btn-primaer gz-btn-breit" data-aktion="oberleitungJa" data-a="' + a + '" data-b="' + b + '">' + G.icon('blitz') + '<span class="gz-btn-text">Oberleitung nachrüsten · ' + geld(preis) + '</span></button>';
      else h += G.knopf(S.level < M.W.OL_LEVEL ? 'Oberleitung ab Stufe ' + M.W.OL_LEVEL : k.grund, { aus: true, breit: true });
      h += '</div>';
    }
    h += '</div>';
    blatt(h);
  }
  function gebZeile(icon, titel, text, knopf, steht) {
    return '<div class="vd-geb' + (steht ? ' vd-steht' : '') + '">' + G.icon(steht ? 'haken' : icon) + '<div class="vd-geb-text"><b>' + titel + '</b>' + text + '</div>' + (knopf || '') + '</div>';
  }
  function stadtBlatt(c) {
    const S = M.zustand(), s = D.STADT[c], land = D.LAENDER[s.land], an = M.angebunden(c), b = S.bahnhoefe[c];
    const hs = land.hauptstadt === c;
    const STUFE = ['', 'Haltepunkt', 'Bahnhof', 'Hauptbahnhof'];
    if (an) ton('gong', null, { leise: true, pause: 8000 });
    let h = G.kopf(s.name, punkt(land.farbe) + esc(land.name) + (hs ? ' · Landeshauptstadt' : '') + (c === S.heimat ? ' · Heimatbahnhof' : ''), 'bahnhof', an ? STUFE[b.stufe] : 'Noch nicht angeschlossen') + '<div class="gz-inhalt">';
    const zeilen = [['Einwohner', einw(s)]];
    if (s.ware) zeilen.push(['Ware', esc(D.WAREN[s.ware].name)]);
    if (an) {
      zeilen.push(['Wartende Fahrgäste', G.zahl(Math.floor(b.wartend)), { zahl: true }]);
      if (s.ware) zeilen.push(['Im Lager', G.zahl(Math.floor(b.lager)) + ' Kisten', { zahl: true }]);
      const anS = M.NACH[c].filter(n => M.streckeFertig(c, n.n)), mitS = anS.filter(n => M.strom(c, n.n)).length;
      zeilen.push(['Oberleitung', !anS.length || !mitS ? 'nein' : mitS === anS.length ? 'ja' : mitS + ' von ' + anS.length + ' Strecken']);
    }
    h += G.daten(zeilen);
    h += '<div class="gz-abschnitt">Wissen</div>' + G.notiz('info', esc(s.fakt));
    if (s.ware) h += G.notiz('kiste', '<b>' + esc(D.WAREN[s.ware].name) + '.</b> ' + esc(D.WAREN[s.ware].fakt));
    if (an) {
      const taf = M.tafel(c, jetzt()).slice(0, 5);
      h += '<div class="gz-abschnitt">Abfahrt und Ankunft</div><div class="gz-tafel"><div class="gz-tafel-zeile gz-tafel-kopf"><span style="width:84px">Bahnzeit</span><span style="width:104px">Zug</span><span>Von / Nach</span></div>';
      if (!taf.length) h += '<div class="gz-tafel-zeile"><span class="gz-tafel-text" style="color:var(--gz-txt3)">Noch kein Zug hält hier.</span></div>';
      taf.forEach(x => {
        h += '<div class="gz-tafel-zeile">' + G.fallblatt(M.uhr(x.zeit), { klappen: true, gelb: x.art === 'an' }) + '<span style="width:104px">' + G.schild(lokNummer(M.lok(x.uid))) + '</span>' +
          '<span class="gz-tafel-text">' + (x.art === 'an' ? 'an aus ' : 'ab nach ') + esc(D.STADT[x.gegen].name) + (x.kohle ? ' · Energie fehlt' : ' · ' + minText(x.fahrzeit)) + '</span></div>';
      });
      h += '</div><div class="vd-leise" style="margin-top:8px">Gelb: Ankunft, weiß: Abfahrt. Eine Sekunde ist bei der Bahn eine Minute.</div>';
      h += '<div class="vd-aktionen">' + G.knopf('Zug von hier einsetzen', { art: 'primaer', icon: 'lok', aktion: 'zugVonHier', wert: c, breit: true }) + '</div>';
      // Bahnhof ausbauen + Gebäude (in der Nahansicht auf der Karte zu sehen)
      h += '<div class="gz-abschnitt">Bahnhof und Gebäude</div>';
      if (b.stufe < 3) {
        const p = M.W.BAHNHOF_PREIS[b.stufe + 1];
        h += gebZeile('bahnhof', 'Ausbau zum ' + STUFE[b.stufe + 1], b.stufe === 1 ? 'Mehr Gleise und ein größeres Empfangsgebäude: 40 % mehr Fahrgäste.' : 'Vier Gleise unter einer Bahnhofshalle: 80 % mehr Fahrgäste als am Haltepunkt.',
          G.knopf(geld(p), { art: S.taler >= p ? 'primaer' : null, aus: S.taler < p, klein: true, aktion: 'ausbau', wert: 'bahnhof:' + c }));
      } else h += gebZeile('bahnhof', 'Hauptbahnhof', 'Größter Ausbau: vier Gleise unter einer Bahnhofshalle.', '', true);
      Object.keys(D.GEBAEUDE).forEach(art => {
        const GB = D.GEBAEUDE[art], k = M.gebaeudeBaubar(c, art);
        if (!k.zeigen) return;
        const knopf = k.steht ? '' : k.max ? G.knopf('Schon ' + GB.max + '×', { aus: true, klein: true })
          : S.level < GB.level ? G.knopf('Ab Stufe ' + GB.level, { aus: true, klein: true, icon: 'schloss' })
          : G.knopf(geld(k.preis), { art: k.ok ? 'primaer' : null, aus: !k.ok, klein: true, aktion: 'gebaeude', wert: c + ':' + art });
        h += gebZeile(GB.icon, esc(GB.name) + (k.steht ? ' · steht' : ''), esc(GB.text), knopf, k.steht);
      });
    } else {
      const opt = M.baubar().filter(k => k.a === c || k.b === c);
      h += '<div class="gz-abschnitt">Anschluss</div>';
      if (!opt.length) h += '<div class="vd-leise">Dein Netz reicht noch nicht bis hierher. Baue in diese Richtung weiter.</div>';
      else {
        h += '<div class="vd-aktionen" style="margin-top:4px">';
        opt.forEach(k => { const von = k.a === c ? k.b : k.a; h += G.knopf('Strecke von ' + D.STADT[von].name + ' · ' + (k.preis ? geld(k.preis) : 'gratis'), { art: k.preis <= S.taler ? 'primaer' : null, aus: k.preis > S.taler, icon: 'gleis', aktion: 'stadtBauen', wert: k.id, breit: true }); });
        h += '</div>';
      }
    }
    h += '</div>';
    blatt(h);
  }

  // ---------------------------------------------------------------- Züge: Foto (Wikimedia Commons), sonst Seitenansicht (volldampf-bilder.js)
  // art: leer = Karte im Fuhrpark, 'gross' = Detail mit Bildnachweis, 'album' = Kachel in der Sammlung
  function LOK_ZEICHNUNG(L, art) {
    const F = typeof VolldampfFotos !== 'undefined' && VolldampfFotos[L.id];
    if (!F) return VolldampfBilder.zug(L, art === 'album' ? 112 : art);
    const img = '<img class="vd-lokfoto' + (art ? ' vd-lokfoto-' + art : '') + (L.gold ? ' vd-gold' : '') + '" src="img/volldampf/' + L.id + '.jpg" alt="Foto: ' + esc(L.name) + '" width="640" height="360" decoding="async">';
    return art === 'gross' ? '<figure class="vd-foto">' + img + '<figcaption>Foto: ' + esc(F.autor) + ' · ' + esc(F.lizenz) + ' · Wikimedia Commons</figcaption></figure>' : img;
  }
  function wertZelle(name, wert, einheit, max) {
    return '<div class="vd-wert-zelle"><span>' + name + '</span><b>' + wert + (einheit ? ' <small style="font-size:11px;color:var(--gz-txt3)">' + einheit + '</small>' : '') + '</b><i><i style="transform:scaleX(' + Math.min(1, Math.max(0, wert) / max).toFixed(2) + ')"></i></i></div>';
  }
  function lokBlatt(tab) {
    const S = M.zustand(), max = M.fuhrpark();
    const voll = M.belegt() >= max, dampfN = S.loks.length - M.belegt();
    const naechste = S.level + (S.level % 2 ? 1 : 2);
    let h = G.kopf('Fuhrpark', M.belegt() + ' von ' + max + ' Plätzen belegt' + (dampfN ? ' · dazu ' + dampfN + (dampfN === 1 ? ' Dampflok' : ' Dampfloks') : '') , 'schuppen', 'Züge') +
      '<div class="vd-tabs"><button class="vd-tab' + (tab === 'meine' ? ' gz-aktiv' : '') + '" data-aktion="tabMeine">Meine Züge</button><button class="vd-tab' + (tab === 'kaufen' ? ' gz-aktiv' : '') + '" data-aktion="tabKaufen">Züge kaufen</button></div>' +
      '<div class="gz-inhalt">';
    if (tab === 'meine') {
      const bt = M.betrieb();
      if (bt.personen + bt.gueter >= 2) h += '<div style="margin-bottom:12px">' + G.notiz(bt.ausgewogen ? 'haken' : 'kiste',
        '<b>' + bt.personen + (bt.personen === 1 ? ' Personenzug' : ' Personenzüge') + ' · ' + bt.gueter + (bt.gueter === 1 ? ' Güterzug' : ' Güterzüge') + '.</b> ' +
        (bt.ausgewogen ? 'Dein Betrieb ist ausgewogen: alle Einnahmen <b>+' + Math.round((bt.bonus - 1) * 100) + ' %</b>.'
          : bt.fehlt === 'gueter' ? 'Dir fehlen Güterzüge – in den Lagern stapeln sich die Kisten. Mit einem Güterzug je drei Personenzüge gibt es <b>+' + Math.round((bt.bonus - 1) * 100) + ' %</b> auf alle Einnahmen.'
          : 'Du hast mehr Güter- als Personenzüge – an den Bahnhöfen warten Fahrgäste. Im Gleichgewicht gibt es <b>+' + Math.round((bt.bonus - 1) * 100) + ' %</b> auf alle Einnahmen.'), bt.ausgewogen) + '</div>';
      h += '<div class="vd-zeilen">';
      if (!S.loks.length) h += G.notiz('schuppen', 'Du hast noch keinen Zug. Unter <b>Züge kaufen</b> findest du deinen ersten.', true);
      S.loks.forEach(l => {
        const L = D.LOK[l.id], w = M.lokWerte(l);
        const lin = l.linie ? (l.linie.sonder ? 'Sonderfahrt · ' : '') + esc(D.STADT[l.linie.von].name) + ' ⇄ ' + esc(D.STADT[l.linie.nach].name) + ' · ' + l.linie.km + ' km · ' + minText(M.fahrzeitMs(l.linie.km, w.kmh)) : L.antrieb === 'dampf' ? 'Wartet im Lokschuppen auf eine Sonderfahrt' : 'Steht im Depot, keine Linie';
        const st = !l.linie ? '' : l.status === 'kohle' ? ' · <span style="color:var(--gz-fehler)">Energie fehlt</span>' : l.status === 'faehrt' ? ' · fährt' : ' · hält';
        const farbe = l.linie ? '<i class="vd-linienfarbe" style="background:' + A.FARBEN[(l.f || 0) % A.FARBEN.length] + '"></i>' : '';
        h += '<div class="vd-lokkarte">' + LOK_ZEICHNUNG(L) + '<div class="vd-lokkarte-text"><div class="vd-lokkarte-name">' + farbe + G.schild(lokNummer(l), !!L.gold) + (l.name ? '<small>„' + esc(l.name) + '“</small>' : L.spitzname ? '<small>„' + esc(L.spitzname) + '“</small>' : '') + '</div>' +
          '<div class="vd-lokkarte-info">' + lin + st + '</div><div class="vd-lokkarte-info">' + esc(L.reihe) + ' · ' + l.stat.fahrten + ' Fahrten · ' + geld(l.stat.taler) + ' eingefahren</div>' +
          '<div class="vd-lokkarte-knoepfe">' + G.knopf(L.antrieb === 'dampf' ? 'Sonderfahrt wählen' : l.linie ? 'Linie ändern' : 'Linie wählen', { art: 'primaer', klein: true, aktion: 'linie', wert: l.uid }) +
          (l.linie ? G.knopf('Ins Depot', { klein: true, aktion: 'depot', wert: l.uid }) : '') +
          (!L.gold && S.loks.length > 1 ? G.knopf('Verkaufen · ' + geld(M.verkaufPreis(l)), { klein: true, aktion: 'verkaufen', wert: l.uid }) : '') +
          (M.werkOffen() && L.antrieb === 'dampf' ? ['kessel', 'wagen'].map(a => { const p = M.werkPreis(l, a); return p == null ? '' : G.knopf((a === 'kessel' ? 'Kessel +15 %' : 'Wagen +25 %') + ' · ' + geld(p), { aus: S.taler < p, klein: true, icon: 'werkstatt', aktion: 'werk', wert: l.uid + ':' + a }); }).join('') : '') +
          '</div></div></div>';
      });
      h += '</div>';
      if (!M.werkOffen() && S.loks.some(l => D.LOK[l.id].antrieb === 'dampf')) h += '<div style="margin-top:16px">' + G.notiz('werkstatt', 'Sobald <b>Meiningen</b> an deinem Netz hängt, macht das Dampflokwerk deine Dampfloks schneller und größer.') + '</div>';
      h += '<div class="gz-abschnitt">Betrieb ausbauen</div><div class="vd-aktionen" style="margin-top:4px">';
      const bp = M.W.BUNKER_PREIS[S.bunker + 1];
      if (bp) h += G.knopf('Energielager auf ' + G.zahl(M.W.BUNKER[S.bunker + 1]) + ' · ' + geld(bp), { aus: S.taler < bp, icon: 'blitz', aktion: 'ausbau', wert: 'bunker:', breit: true });
      const tp = M.W.BAUTRUPP_PREIS[S.bautrupps];
      if (tp) h += G.knopf('Bautrupp ' + (S.bautrupps + 1) + ' einstellen · ' + geld(tp), { aus: S.taler < tp, icon: 'kran', aktion: 'ausbau', wert: 'bautrupp:', breit: true });
      h += '</div>';
    } else {
      h += '<div class="vd-chips">';
      Object.keys(D.ABTEILUNG).forEach(a => {
        const frei = D.LOKS.filter(L => L.abt === a && S.level >= L.level).length, alle = D.LOKS.filter(L => L.abt === a).length;
        h += '<button class="vd-chip' + (abtWahl === a ? ' gz-aktiv' : '') + '" data-aktion="abt" data-wert="' + a + '">' + esc(D.ABTEILUNG[a]) + '<small>' + frei + '/' + alle + '</small></button>';
      });
      h += '</div>';
      if (abtWahl === 'dampf') h += '<div style="margin-bottom:12px">' + G.notiz('ticket', '<b>Dampfloks sind Belohnungen.</b> Du holst sie mit Goldtickets – die gibt es für neue Bundesländer, Linienkarten mit dem Zug wie in echt und komplette Bahnstrecken. Dampfloks fahren Sonderfahrten und brauchen keinen Platz im Fuhrpark.', true) + '</div>';
      if (voll && abtWahl !== 'dampf') h += '<div style="margin-bottom:12px">' + G.notiz('schuppen', '<b>Der Fuhrpark ist voll.</b> Verkaufe unter „Meine Züge“ einen Zug, baue ein Betriebswerk oder warte auf Stufe ' + naechste + '.', true) + '</div>';
      if (abtWahl === 'fern' && !stromImNetz()) h += '<div style="margin-bottom:12px">' + G.notiz('blitz', 'Fernzüge fahren elektrisch. Sie brauchen Strecken mit <b>Oberleitung</b> – die meisten Hauptstrecken haben eine, wie in echt.') + '</div>';
      h += '<div class="vd-zeilen">';
      // Reihenfolge: was Max jetzt holen kann (stärkste zuerst), dann Goldzüge, dann gesperrte (nächste zuerst)
      const rang = L => { const frei = S.level >= L.level; return (frei ? (L.gold ? 1e5 + L.gold * 100 : 0) - L.level : 2e5 + L.level); };
      D.LOKS.filter(L => L.abt === abtWahl).sort((a, b) => rang(a) - rang(b)).forEach(L => {
        const k = M.kaufbar(L.id);
        const einmal = L.gold && S.loks.some(l => l.id === L.id);
        let knopf;
        if (einmal) knopf = '<span class="vd-status">Im Fuhrpark</span>';
        else if (k.ok) knopf = G.knopf(L.preis ? 'Kaufen · ' + geld(L.preis) + (L.gold ? ' + ' + L.gold + ' Gold' : '') : 'Holen · ' + L.gold + (L.gold === 1 ? ' Goldticket' : ' Goldtickets'), { art: 'primaer', icon: L.gold ? 'ticket' : null, aktion: 'lokKaufen', wert: L.id, klein: true });
        else if (S.level < L.level) knopf = G.knopf('Ab Stufe ' + L.level, { aus: true, klein: true, icon: 'schloss' });
        else if (voll && !L.gold) knopf = G.knopf('Fuhrpark voll', { aus: true, klein: true });
        else if (L.gold && !L.preis) knopf = G.knopf(L.gold + (L.gold === 1 ? ' Goldticket' : ' Goldtickets'), { aus: true, klein: true, icon: 'ticket' });
        else knopf = G.knopf(k.grund.length > 34 ? k.grund.slice(0, 32) + '…' : k.grund, { aus: true, klein: true });
        const stoff = D.ANTRIEB[L.antrieb].kurz || D.ANTRIEB[L.antrieb].stoff;
        h += '<div class="vd-lokkarte' + (S.level < L.level ? ' vd-gesperrt' : '') + '">' + LOK_ZEICHNUNG(L) + '<div class="vd-lokkarte-text"><div class="vd-lokkarte-name">' + esc(L.reihe) + (L.spitzname ? '<small>„' + esc(L.spitzname) + '“</small>' : '') + '</div>' +
          '<div class="vd-lokkarte-info">' + (L.seit ? 'Im Einsatz seit ' : 'Baujahr ') + L.baujahr + (L.vmax ? ' · bis ' + L.vmax + ' km/h' : '') + (L.anzahl ? ' · ' + G.zahl(L.anzahl) + ' gebaut' : '') + ' · ' + D.ANTRIEB[L.antrieb].name + (L.gold ? ' · <span class="gz-akzent">Sonderfahrten</span>' : '') + '</div>' +
          '<div class="vd-lokkarte-info" style="color:var(--gz-txt)">' + esc(L.fakt) + '</div>' +
          '<div class="vd-werte">' + wertZelle('Tempo', L.kmh, 'km/h', 320) + wertZelle('Fahrgäste', L.plaetze, '', 900) + wertZelle('Kisten', L.ladung, '', 520) + wertZelle(stoff, L.kohle, '', 65) + '</div>' +
          (L.antrieb === 'elektro' ? '<div class="vd-lokkarte-info">Fährt nur auf Strecken mit Oberleitung.</div>' : '') +
          (L.bonus ? '<div class="vd-lokkarte-info gz-akzent">Bonus: ×' + L.bonus.faktor + ' Fahrgäste in ' + L.bonus.staedte.map(c => D.STADT[c].name).join(', ') + '</div>' : '') +
          '<div class="vd-lokkarte-knoepfe">' + knopf + '</div></div></div>';
      });
      h += '</div>';
    }
    h += '</div>';
    blatt(h, { art: 'loks' });
  }
  function lokDetail(l) {
    const L = D.LOK[l.id];
    let h = G.kopf(lokNummer(l) + (l.name ? ' „' + l.name + '“' : L.spitzname ? ' „' + L.spitzname + '“' : ''), esc(L.reihe), 'lok', 'Zug im Einsatz') + '<div class="gz-inhalt">' + LOK_ZEICHNUNG(L, 'gross') +
      '<div class="vd-wahl-text" style="margin:14px 0 4px">' + esc(L.fakt) + '</div>';
    const zeilen = [];
    if (l.linie) { zeilen.push(['Linie', '<i class="vd-linienfarbe" style="display:inline-block;margin-right:8px;vertical-align:middle;background:' + A.FARBEN[(l.f || 0) % A.FARBEN.length] + '"></i>' + esc(D.STADT[l.linie.von].name) + ' ⇄ ' + esc(D.STADT[l.linie.nach].name)]); zeilen.push(['Strecke', l.linie.km + ' km · ' + minText(M.fahrzeitMs(l.linie.km, M.lokWerte(l).kmh))]); }
    if (l.fahrt) { zeilen.push(['An Bord', l.fahrt.pax + ' Fahrgäste' + (l.fahrt.ware ? ' · ' + l.fahrt.menge + ' Kisten ' + esc(D.WAREN[l.fahrt.ware].name) : '')]); zeilen.push(['Ankunft', M.uhr(l.fahrt.ende) + ' Uhr in ' + esc(D.STADT[l.fahrt.nach].name)]); }
    zeilen.push(['Antrieb', D.ANTRIEB[L.antrieb].name + ' · ' + D.ANTRIEB[L.antrieb].stoff]);
    zeilen.push(['Bisher', l.stat.fahrten + ' Fahrten · ' + geld(l.stat.taler)]);
    h += '<div style="margin-top:12px">' + G.daten(zeilen) + '</div><div class="vd-aktionen">' + G.knopf(L.antrieb === 'dampf' ? 'Sonderfahrt wählen' : 'Linie ändern', { art: 'primaer', aktion: 'linie', wert: l.uid, breit: true }) +
      G.knopf(l.name ? 'Umtaufen · 1 Goldticket' : 'Zug taufen · 1 Goldticket', { icon: 'ticket', aktion: 'taufBlatt', wert: l.uid, breit: true }) + '</div></div>';
    blatt(h);
  }
  /** Zugtaufe: Namen ohne Tastatur wählen – Städte am eigenen Netz und erschlossene Länder, wie bei den echten ICE */
  function taufBlatt(uid) {
    const l = M.lok(uid); if (!l) return;
    const n = M.taufNamen(), S = M.zustand();
    let h = G.kopf('Zug taufen', lokName(l) + ' &nbsp;' + esc(D.LOK[l.id].reihe), 'ticket', 'Zugtaufe') + '<div class="gz-inhalt">' +
      G.notiz('info', 'Die Bahn tauft ihre ICE auf Namen von Städten, Ländern und Flüssen – zum Beispiel „Cottbus/Chóśebuz“ oder „Spree“. Such einen Namen aus deinem Netz aus. Jeden Namen gibt es nur einmal.');
    if (S.gold < M.W.TAUFE_GOLD) h += '<div style="margin-top:12px">' + G.notiz('ticket', 'Eine Zugtaufe kostet <b>1 Goldticket</b>. Die gibt es für neue Bundesländer, komplette Bahnstrecken und Linienkarten.', true) + '</div>';
    const chips = liste => '<div class="vd-taufnamen">' + liste.map(x => '<button class="vd-chip"' + (S.gold >= M.W.TAUFE_GOLD ? ' data-aktion="taufe" data-wert="' + uid + ':' + esc(x) + '"' : ' disabled') + '>' + esc(x) + '</button>').join('') + '</div>';
    if (n.staedte.length) h += '<div class="gz-abschnitt">Städte an deinem Netz</div>' + chips(n.staedte);
    if (n.laender.length) h += '<div class="gz-abschnitt">Deine Bundesländer</div>' + chips(n.laender);
    h += '</div>';
    blatt(h);
  }
  function lokGekauft(uid) {
    const l = M.lok(uid), L = D.LOK[l.id], S = M.zustand();
    const ohneStrom = L.antrieb === 'elektro' && !stromImNetz();
    buehneRein(() => G.buehne(wurzel, G.karte({ ueber: 'Neu im Fuhrpark', titel: esc(L.reihe), unter: G.schild(lokNummer(l), !!L.gold) + (L.spitzname ? ' &nbsp;„' + esc(L.spitzname) + '“' : ''),
      rumpf: LOK_ZEICHNUNG(L, 'gross') + '<div style="margin-top:14px">' + G.daten([[L.seit ? 'Im Einsatz seit' : 'Baujahr', String(L.baujahr)], ['Antrieb', D.ANTRIEB[L.antrieb].name], ['Tempo im Spiel', L.kmh + ' km/h'], ['Fahrgäste je Fahrt', String(L.plaetze)], ['Kisten je Fahrt', String(L.ladung)]]) + '</div>' +
        '<div style="margin-top:12px">' + G.notiz('info', esc(L.fakt)) + '</div>' +
        (ohneStrom ? G.notiz('blitz', 'Dieser Zug braucht <b>Oberleitung</b>. Baue eine Strecke, die schon eine hat (wie in echt) – oder rüste eine nach: Strecke antippen.', true) : '') }), 'Linie wählen')
      .then(() => { if (L.antrieb === 'dampf') sonderBlatt(uid); else linienModus(uid, null); }));
  }

  // ---------------------------------------------------------------- Linie wählen
  function linienModus(uid, von) {
    const l = M.lok(uid);
    if (!l) return;
    modus = { art: 'linie', uid, von: null, weg: null };
    A.modus('linie');
    const S = M.zustand();
    A.markieren(Object.keys(S.bahnhoefe));
    modusBanner(lokName(l) + ' <b>Linie wählen:</b> Tippe auf den Start-Bahnhof.', 'Abbrechen');
    if (von) linieStadt(von);
  }
  function linieStadt(c) {
    if (!M.angebunden(c)) { G.toast(wurzel, esc(D.STADT[c].name) + ' hängt noch nicht an deinem Netz.', { icon: 'info' }); return; }
    const l = M.lok(modus.uid);
    if (!modus.von || modus.weg) {
      modus.von = c; modus.weg = null; A.linieZeigen(null); A.markieren([c]);
      modusBanner(lokName(l) + ' Start <b>' + esc(D.STADT[c].name) + '</b> · Tippe jetzt auf das Ziel.', 'Abbrechen');
      return;
    }
    if (c === modus.von) return;
    const elektro = D.LOK[l.id].antrieb === 'elektro';
    const w = M.weg(modus.von, c, elektro, l.uid);
    if (!w) {
      const probe = M.setzeLinieProbe(l.uid, modus.von, c);
      if (probe && probe.voll) { G.toast(wurzel, esc(probe.grund), { icon: 'signal', dauer: 6500, beiTipp: () => streckeBlatt(probe.voll.a, probe.voll.b) }); A.markieren([probe.voll.a, probe.voll.b]); }
      else if (elektro && M.weg(modus.von, c)) G.toast(wurzel, 'Auf diesem Weg fehlt die <b>Oberleitung</b>. Tippe auf die Strecke ohne Oberleitung und rüste sie nach' + (M.zustand().level < M.W.OL_LEVEL ? ' (ab Stufe ' + M.W.OL_LEVEL + ').' : '.'), { icon: 'blitz', dauer: 5500 });
      else G.toast(wurzel, 'Zwischen ' + esc(D.STADT[modus.von].name) + ' und ' + esc(D.STADT[c].name) + ' gibt es noch keine Strecke.', { icon: 'info' });
      return;
    }
    modus.weg = w; modus.nach = c;
    A.linieZeigen(w.weg); A.markieren([modus.von, c]);
    const kmh = M.lokWerte(l).kmh;
    modusBanner(lokName(l) + ' <b>' + esc(D.STADT[modus.von].name) + ' ⇄ ' + esc(D.STADT[c].name) + '</b><span class="vd-modus-zahl">' + w.km + ' km · Fahrzeit ' + minText(M.fahrzeitMs(w.km, kmh)) + '</span>' +
      ' ' + G.knopf('Los', { art: 'primaer', aktion: 'linieLos', klein: true, icon: 'pfeil' }), 'Abbrechen');
  }
  function linieBestaetigen() {
    if (!modus || modus.art !== 'linie' || !modus.weg) return;
    const r = M.setzeLinie(modus.uid, modus.von, modus.nach, jetzt());
    if (!r.ok) { G.toast(wurzel, esc(r.grund), { icon: 'info' }); return; }
    ton('pfiff', (M.lok(modus.uid) || {}).id);
    modusEnde();
  }

  // ---------------------------------------------------------------- Aufträge
  function abholen(aid, knopfEl) {
    const r = M.auftragAbholen(aid, jetzt());
    if (!r.ok) return;
    ton('kasse');
    const rr = knopfEl.getBoundingClientRect(), w = wurzel.getBoundingClientRect();
    if (!G.weniger()) for (let i = 0; i < 4; i++) setTimeout(() => G.flug(wurzel, 'muenze', rr.left - w.left + rr.width / 2 + (Math.random() - 0.5) * 24, rr.top - w.top, hud.taler), i * 90);
    G.toast(wurzel, 'Auftrag abgerechnet: <b>+' + geld(r.taler) + '</b> · +' + r.xp + ' Erfahrung', { icon: 'muenze' });
    aufgabenSig = '';
  }
  function auftragZeigen(aid) {
    const a = M.zustand().auftraege.find(x => x.aid === aid);
    if (!a) return;
    const ids = a.art === 'fracht' ? [a.von, a.ziel] : [a.ziel];
    const S = M.zustand();
    // mit dem nächsten Bahnhof zeigen, damit Max sieht, wo es anschließt
    if (!M.angebunden(a.ziel)) { const nb = M.NACH[a.ziel].find(n => S.bahnhoefe[n.n]); if (nb) ids.push(nb.n); }
    A.markieren(ids);
    A.zeige(ids, { rechts: istQuer() ? 340 : 0, zMax: 2.4 });
    if (a.art === 'anschluss' && !M.angebunden(a.ziel)) bauModus([a.ziel]);
    setTimeout(() => { if (!modus) A.markieren([]); }, 6000);
  }

  // ---------------------------------------------------------------- Kohle, Stufe, Uhr, Sammlung
  function kohleBlatt() {
    const S = M.zustand(), min = M.kohleReichtMinuten(), preis = M.kohlePreis();
    let h = G.kopf('Energielager', G.zahl(S.kohle) + ' von ' + G.zahl(M.bunkerGroesse()) + ' Einheiten', 'blitz', 'Kohle · Diesel · Strom') + '<div class="gz-inhalt">' +
      '<div style="margin-bottom:14px">' + G.balken(S.kohle / Math.max(1, M.bunkerGroesse())) + '</div>' +
      G.daten([['Vorrat', G.zahl(S.kohle) + ' / ' + G.zahl(M.bunkerGroesse()), { zahl: true }],
        ['Verbrauch', min == null ? 'kein Zug unterwegs' : 'etwa ' + G.zahl(Math.round(M.kohleProMinute())) + ' pro Minute'],
        ['Reicht ohne dich', min == null ? '–' : 'etwa ' + min + ' Minuten'],
        ['Preis je Einheit', geld(preis) + (M.zechen() ? ' (Kohlereviere)' : '')]]) +
      '<div class="vd-leise" style="margin-top:12px">Solange du spielst, wird automatisch nachgekauft.</div>' +
      '<div class="vd-aktionen">' + G.knopf('Lager jetzt füllen', { art: 'primaer', icon: 'blitz', aktion: 'kohleKaufen', breit: true });
    const bp = M.W.BUNKER_PREIS[S.bunker + 1];
    if (bp) h += G.knopf('Größeres Lager · ' + geld(bp), { aus: S.taler < bp, aktion: 'ausbau', wert: 'bunker:', breit: true });
    h += '</div><div style="margin-top:16px">' + G.notiz('info', 'Dampfloks verbrennen Kohle, Dieselloks tanken Diesel, E-Loks fahren mit Strom, der Wasserstoffzug tankt Wasserstoff – alles kommt aus diesem Lager.') +
      G.notiz('volldampf', 'Jede Lernrunde bringt eine Energielieferung. Die Kohlereviere Essen, Cottbus und Saarbrücken machen Energie billiger.') + '</div></div>';
    blatt(h);
  }
  function stufeInfo() {
    const S = M.zustand(), naechste = D.LOKS.filter(L => L.level > S.level).sort((a, b) => a.level - b.level)[0];
    G.toast(wurzel, '<b>Stufe ' + S.level + '</b> · noch ' + Math.max(0, M.xpFuer(S.level + 1) - S.xp) + ' Erfahrung bis zur nächsten. ' +
      (naechste ? 'Ab Stufe ' + naechste.level + ' gibt es die ' + esc(naechste.reihe) + '.' : ''), { icon: 'xp', dauer: 5000 });
  }
  function uhrInfo() {
    G.toast(wurzel, '<b>Bahnzeit ' + M.uhr(jetzt()) + ' Uhr.</b> Bei der Bahn vergeht die Zeit 60-mal schneller: 1 Sekunde ist 1 Minute, ein Tag dauert 24 Minuten.', { icon: 'uhr', dauer: 6000 });
  }
  const umrissSpeicher = {};
  function umriss(land, farbe, an, px) {
    const k = land + farbe + an + px;
    if (!umrissSpeicher[k]) umrissSpeicher[k] = umrissBauen(land, farbe, an, px);
    return umrissSpeicher[k];
  }
  function umrissBauen(land, farbe, an, px) {
    // Umriss aus der Karte: Bounding-Box aus den Pfadzahlen
    const d = VolldampfKarte.laender[land], z = d.match(/-?\d+(\.\d+)?/g).map(Number);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < z.length; i += 2) { x0 = Math.min(x0, z[i]); x1 = Math.max(x1, z[i]); y0 = Math.min(y0, z[i + 1]); y1 = Math.max(y1, z[i + 1]); }
    const r = Math.max(x1 - x0, y1 - y0) * 0.06;
    return '<svg class="vd-umriss"' + (px ? ' style="width:' + px + 'px;height:' + px + 'px"' : '') + ' viewBox="' + (x0 - r) + ' ' + (y0 - r) + ' ' + (x1 - x0 + 2 * r) + ' ' + (y1 - y0 + 2 * r) + '"><path d="' + d + '" fill="' + (an ? farbe : '#262C34') + '" fill-opacity="' + (an ? '.85' : '1') + '" stroke="' + (an ? farbe : 'rgba(255,255,255,.18)') + '" stroke-width="' + (Math.max(x1 - x0, y1 - y0) / 90).toFixed(2) + '" stroke-linejoin="round"/></svg>';
  }
  function albumBlatt() {
    const S = M.zustand();
    const nL = Object.keys(S.laender).length, nS = Object.keys(S.album.staedte).length, nW = Object.keys(S.album.waren).length, nK = Object.keys(S.album.loks).length;
    let h = G.kopf('Sammlung', nL + '/16 Bundesländer · ' + nS + '/' + D.STAEDTE.length + ' Städte · ' + nK + '/' + D.LOKS.length + ' Züge', 'album', 'Archiv') + '<div class="gz-inhalt">';
    // Streckenalbum: angefangene zuerst (was fehlt noch?), dann komplette; unberührte nur als Zahl
    const bahnen = M.bahnen(), komplett = bahnen.filter(B => B.komplett), dran = bahnen.filter(B => !B.komplett && B.fertig > 0).sort((x, y) => y.fertig / y.anzahl - x.fertig / x.anzahl);
    h += '<div class="gz-abschnitt">Echte Bahnstrecken · ' + komplett.length + ' von ' + bahnen.length + ' komplett</div><div class="vd-bahnen">';
    dran.concat(komplett).forEach(B => { h += bahnZeile(B); });
    h += '</div>';
    const rest = bahnen.length - dran.length - komplett.length;
    if (rest) h += '<div class="vd-leise" style="margin-top:8px">' + rest + ' weitere Strecken warten noch. Tippe beim Bauen auf eine gestrichelte Strecke: Dort steht, zu welcher Bahnstrecke sie gehört.</div>';
    h += '<div class="gz-abschnitt">Bundesländer</div><div class="vd-album">';
    Object.keys(D.LAENDER).forEach(id => {
      const L = D.LAENDER[id], an = !!S.laender[id];
      h += '<div class="vd-album-kachel' + (an ? '' : ' vd-zu') + '"' + (an ? ' data-aktion="stadtBlatt" data-wert="' + L.hauptstadt + '"' : '') + '>' + umriss(id, L.farbe, an) + '<b>' + esc(L.name) + '</b><span>' + (an ? esc(D.STADT[L.hauptstadt].name) : 'noch offen') + '</span></div>';
    });
    h += '</div>';
    h += '<div class="gz-abschnitt">Züge</div><div class="vd-album">';
    D.LOKS.forEach(L => { const an = !!S.album.loks[L.id]; h += '<div class="vd-album-kachel' + (an ? '' : ' vd-zu') + '">' + LOK_ZEICHNUNG(L, 'album') + '<b>' + esc(L.name) + '</b><span>' + (L.spitzname ? '„' + esc(L.spitzname) + '“' : (L.seit ? 'seit ' : 'Baujahr ') + L.baujahr) + '</span></div>'; });
    h += '</div><div class="gz-abschnitt">Waren · ' + nW + ' von ' + Object.keys(D.WAREN).length + '</div><div class="vd-album">';
    Object.keys(D.WAREN).forEach(w => {
      const an = !!S.album.waren[w], von = D.STAEDTE.filter(s => s.ware === w).map(s => s.name);
      h += '<div class="vd-album-kachel' + (an ? '' : ' vd-zu') + '">' + G.icon('kiste') + '<b>' + esc(D.WAREN[w].name) + '</b><span>' + (an ? esc(von.join(', ')) : 'noch offen') + '</span></div>';
    });
    h += '</div></div>';
    blatt(h);
  }

  // ---------------------------------------------------------------- Linienkarten (echte Zuglinien als Ziel)
  function kartePanel() {
    const S = M.zustand(), ks = M.kartenStand();
    if (guideAn ? !guideFlag.ziel : !S.hilfe.guide) return '';   // in der Einführung erst am Ende zeigen (sonst lenkt die Karte vom ersten Auftrag ab)
    if (!ks.aktiv) {
      const an = M.kartenAngebot();
      if (!an.length) return '';
      return '<div class="vd-auftrag vd-lkarte" style="--lf:var(--gz-akzent)"><div class="vd-auftrag-kopf"><span class="gz-ueber">Linienkarte</span></div>' +
        '<div class="vd-auftrag-titel">Welche echte Linie baust du nach?</div><div class="vd-auftrag-text">' + an.length + ' Karten zur Wahl</div>' +
        '<div class="vd-auftrag-fuss"><span class="vd-lohn"><span>' + G.icon('ticket') + 'Goldticket</span></span>' + G.knopf('Karte wählen', { art: 'primaer', klein: true, aktion: 'kartenWahl' }) + '</div></div>';
    }
    const k = M.karte(ks.aktiv);
    const knopf = k.uid ? '<span class="vd-status">Eröffnungsfahrt läuft</span>'
      : k.gebaut ? G.knopf('Zug einsetzen', { art: 'primaer', klein: true, aktion: 'karteBlatt', wert: k.id })
      : G.knopf('Bauen', { art: 'primaer', klein: true, aktion: 'karteZeigen', wert: k.id });
    return '<div class="vd-auftrag vd-lkarte" style="--lf:var(--gz-akzent)" >' +
      '<div class="vd-auftrag-kopf"><span class="gz-ueber">Linienkarte · ' + esc(k.L.art) + '</span><span class="vd-mini" data-aktion="karteBlatt" data-wert="' + k.id + '" aria-label="Karte ansehen">' + G.icon('info') + '</span></div>' +
      '<div class="vd-auftrag-titel">' + esc(k.L.name) + '</div><div class="vd-auftrag-text">' + (k.gebaut ? 'Strecke fertig – jetzt fehlt der Zug' : k.fertig + ' von ' + k.anzahl + (k.anzahl === 1 ? ' Abschnitt' : ' Abschnitten') + ' gebaut') + '</div>' +
      G.balken(k.fertig / k.anzahl) +
      '<div class="vd-auftrag-fuss"><span class="vd-lohn"><span>' + G.icon('muenze') + geld(k.belohnung.taler) + '</span><span>' + G.icon('xp') + k.belohnung.xp + '</span></span>' + knopf + '</div></div>';
  }
  function passendText(Lk) {
    if (Lk.dampf && !Lk.zuege) return 'jede Dampflok';
    return Lk.zuege ? Lk.zuege.map(z => D.LOK[z].name).join(', ') : Lk.antrieb === 'dampf' ? 'jede Dampflok' : Lk.antrieb === 'diesel' ? 'jeder Dieselzug' : 'jeder Zug';
  }
  function karteRoute(k) {
    let h = '<div class="vd-route">';
    k.L.halte.forEach((c, i) => {
      if (i) { const t = k.teile[i - 1]; h += '<i class="' + (t.fertig ? 'vd-r-ok' : '') + (t.strom ? ' vd-r-strom' : '') + '"></i>'; }
      h += '<span class="' + (M.angebunden(c) ? 'vd-r-an' : '') + '">' + esc(D.STADT[c].name) + '</span>';
    });
    return h + '</div>';
  }
  function kartenWahlBlatt() {
    const an = M.kartenAngebot();
    let h = G.kopf('Linienkarten', 'Such dir eine echte Zuglinie aus und bau sie nach.', 'liste', 'Zur Wahl') + '<div class="gz-inhalt"><div class="vd-kartenwahl">';
    an.forEach(id => {
      const k = M.karte(id), S = M.zustand();
      h += '<div class="vd-wahlkarte"><span class="gz-ueber">' + esc(k.L.art) + '</span><b>' + esc(k.L.name) + '</b>' + karteRoute(k) +
        '<div class="vd-wahl-daten"><span>' + k.fertig + ' von ' + k.anzahl + ' gebaut · ' + k.km + ' km</span><span>' + G.icon('muenze') + geld(k.belohnung.taler) + '</span></div>' +
        '<div class="vd-leise">Wie in echt: ' + esc(passendText(k.L)) + (k.level > S.level ? ' (ab Stufe ' + k.level + ')' : '') + '</div>' +
        G.knopf('Diese Karte nehmen', { art: 'primaer', aktion: 'karteNehmen', wert: id, breit: true }) + '</div>';
    });
    h += '</div><div class="vd-leise" style="margin-top:14px">Du hast immer nur eine Karte. Gefällt sie dir nicht mehr, gibst du sie zurück – das kostet nichts.</div></div>';
    blatt(h);
  }
  function karteBlatt(id) {
    const k = M.karte(id), S = M.zustand();
    if (!k) return;
    let h = G.kopf(k.L.name, esc(k.L.art + ' · ' + k.anzahl + (k.anzahl === 1 ? ' Abschnitt' : ' Abschnitte') + ' · ' + k.km + ' km Luftlinie'), 'liste', 'Linienkarte') + '<div class="gz-inhalt">';
    h += karteRoute(k) + '<div class="vd-bahn-teile">';
    k.teile.forEach(t => { h += '<div class="' + (t.fertig ? 'vd-steht' : '') + '">' + G.icon(t.fertig ? 'haken' : 'gleis') + '<span>' + esc(D.STADT[t.a].name) + ' – ' + esc(D.STADT[t.b].name) + '</span><small>' + (t.fertig ? 'gebaut' : 'fehlt noch') + (t.strom ? '' : ' · ohne Oberleitung') + '</small></div>'; });
    h += '</div>';
    h += '<div style="margin-top:14px">' + G.daten([['Wie in echt fährt hier', esc(passendText(k.L))], ['Belohnung', geld(k.belohnung.taler), { zahl: true }], ['Mit dem Zug wie in echt', geld(k.belohnung.talerPasst) + ' und 1 Goldticket', { zahl: true }]]) + '</div>';
    if (k.L.info) h += '<div style="margin-top:14px">' + G.notiz('info', esc(k.L.info)) + '</div>';
    h += '<div class="vd-aktionen">';
    if (!k.aktiv) h += G.knopf('Diese Karte nehmen', { art: 'primaer', aktion: 'karteNehmen', wert: id, breit: true });
    else if (!k.gebaut) h += G.knopf('Fehlende Abschnitte zeigen', { art: 'primaer', icon: 'zentrieren', aktion: 'karteZeigen', wert: id, breit: true });
    else if (k.uid) h += '<div class="vd-leise">' + lokName(M.lok(k.uid)) + ' ist auf Eröffnungsfahrt. Kommt der Zug am anderen Ende an, ist die Karte erfüllt.</div>';
    else {
      // eigene Züge: passende zuerst; E-Züge nur, wenn überall Oberleitung hängt
      const ohneStrom = k.teile.some(t => !t.strom);
      const loks = S.loks.filter(l => M.karteErlaubt(k.L, l.id)).sort((x, y) => (M.kartePasst(k.L, y.id) ? 1 : 0) - (M.kartePasst(k.L, x.id) ? 1 : 0));
      h += '<div class="gz-abschnitt" style="margin-top:0">Welcher Zug fährt die Linie?</div>';
      if (!loks.length) h += '<div class="vd-leise">' + (k.L.dampf ? 'Für diese Sonderfahrt brauchst du eine Dampflok. Die gibt es im Fuhrpark für Goldtickets.' : 'Du hast noch keinen Zug. Kauf einen im Fuhrpark.') + '</div>';
      loks.slice(0, 8).forEach(l => {
        const L = D.LOK[l.id], passt = M.kartePasst(k.L, l.id), geht = !(L.antrieb === 'elektro' && ohneStrom);
        h += '<button class="vd-zugwahl' + (passt ? ' vd-zugwahl-passt' : '') + '"' + (geht ? ' data-aktion="karteFahren" data-wert="' + l.uid + '"' : ' disabled') + '>' + lokName(l) + '<span><b>' + esc(L.name) + '</b><small>' +
          (!geht ? 'braucht Oberleitung' : passt ? 'wie in echt · Bonus' : l.linie ? 'fährt gerade ' + esc(D.STADT[l.linie.von].name) + ' – ' + esc(D.STADT[l.linie.nach].name) : 'frei') + '</small></span></button>';
      });
      if (!loks.some(l => M.kartePasst(k.L, l.id))) h += '<div class="vd-leise" style="margin-top:8px">Den Zug wie in echt hast du noch nicht' + (k.level > S.level ? ' (ab Stufe ' + k.level + ')' : ' – es gibt ihn im Fuhrpark') + '. Jeder andere Zug erfüllt die Karte auch, nur ohne Bonus.</div>';
    }
    if (k.aktiv) h += G.knopf('Karte zurückgeben', { aktion: 'karteZurueck', breit: true });
    h += '</div></div>';
    blatt(h);
  }
  /** Dampflok: Sonderfahrt wählen. Gebaute Fahrten kann sie sofort fahren, die anderen zeigen, was fehlt (lenkt zum Bauen). */
  function sonderBlatt(uid) {
    const l = M.lok(uid); if (!l) return;
    const liste = M.sonderfahrten().sort((x, y) => (y.gebaut ? 1 : 0) - (x.gebaut ? 1 : 0) || (x.anzahl - x.fertig) - (y.anzahl - y.fertig));
    let h = G.kopf('Sonderfahrt wählen', lokName(l) + ' &nbsp;' + esc(D.LOK[l.id].reihe), 'dampf', 'Dampflok') + '<div class="gz-inhalt">' +
      G.notiz('info', 'Dampfloks fahren heute nur noch zu besonderen Anlässen: auf Museumsbahnen und als Sonderzüge von Eisenbahnvereinen. Ausflügler zahlen dafür gern mehr.') + '<div class="vd-kartenwahl" style="margin-top:12px">';
    liste.forEach(k => {
      const faehrt = M.zustand().loks.filter(x => x.linie && x.linie.sonder === k.id).length;
      h += '<div class="vd-wahlkarte"><span class="gz-ueber">' + esc(k.L.art) + '</span><b>' + esc(k.L.name) + '</b>' + karteRoute(k) +
        '<div class="vd-wahl-daten"><span>' + (k.gebaut ? 'Strecke fertig · ' + k.km + ' km' : k.fertig + ' von ' + k.anzahl + ' gebaut · ' + k.km + ' km') + (faehrt ? ' · ' + faehrt + (faehrt === 1 ? ' Dampflok' : ' Dampfloks') + ' unterwegs' : '') + '</span></div>' +
        (k.L.info ? '<div class="vd-leise">' + esc(k.L.info) + '</div>' : '') +
        (k.gebaut ? G.knopf('Hier fahren', { art: 'primaer', icon: 'dampf', aktion: 'sonderFahren', wert: uid + ':' + k.id, breit: true })
          : G.knopf('Fehlende Abschnitte zeigen', { icon: 'zentrieren', aktion: 'karteZeigen', wert: k.id, breit: true })) + '</div>';
    });
    h += '</div></div>';
    blatt(h);
  }
  function karteStaedteZeigen(id) {
    const k = M.karte(id); if (!k) return;
    blattZu(); A.linieZeigen(k.L.halte); A.markieren(k.L.halte); A.zeige(k.L.halte, { rechts: istQuer() ? 340 : 0, zMax: 2.6 });
    const fehlt = {}; k.teile.filter(t => !t.fertig).forEach(t => { fehlt[t.a] = 1; fehlt[t.b] = 1; });
    if (M.baubar().some(b => k.teile.some(t => !t.fertig && M.schl(t.a, t.b) === b.id))) bauModus(Object.keys(fehlt));
    else if (!k.gebaut) G.toast(wurzel, 'Die Linie ist noch nicht an deinem Netz. Bau zuerst in ihre Richtung.', { icon: 'info', dauer: 4500 });
  }
  function karteErfuellt(d) {
    const k = M.karte(d.id), l = M.lok(d.uid);
    ton('land');
    return G.buehne(wurzel, G.karte({ ueber: 'Linienkarte erfüllt · ' + esc(k.L.art), titel: esc(k.L.name), unter: (l ? lokName(l) + ' &nbsp;' : '') + (d.passt ? 'fährt hier wie in echt' : 'Eröffnungsfahrt geschafft'),
      rumpf: (k.L.info ? G.notiz('info', esc(k.L.info)) : '') + (d.passt ? '' : G.notiz('lok', 'In echt fährt hier: ' + esc(passendText(k.L)) + '.')) +
        '<div class="vd-kzreihe"><div><span>' + G.icon('muenze') + 'Belohnung</span><b>+' + geld(d.taler) + '</b></div><div><span>' + G.icon('ticket') + 'Goldtickets</span><b>' + (d.gold ? '+' + d.gold : '–') + '</b></div><div><span>' + G.icon('liste') + 'Linien</span><b>' + Object.keys(M.kartenStand().fertig).length + ' / ' + D.LINIEN.length + '</b></div></div>' }), 'Nächste Karte')
      .then(() => { if (M.kartenAngebot().length) kartenWahlBlatt(); });
  }

  // ---------------------------------------------------------------- Streckenalbum (echte Bahnstrecken aus mehreren Abschnitten)
  function bahnZeile(B) {
    return '<button class="vd-bahn' + (B.komplett ? ' vd-bahn-ok' : '') + '" data-aktion="bahnBlatt" data-wert="' + esc(B.id) + '"><span class="vd-bahn-name"><b>' + esc(B.name) + '</b>' +
      '<small>' + (B.komplett ? 'komplett' : B.fertig + ' von ' + B.anzahl + (B.anzahl === 1 ? ' Abschnitt' : ' Abschnitten')) + ' · ' + B.km + ' km</small></span>' + G.balken(B.fertig / B.anzahl, false, B.komplett) + '</button>';
  }
  /** Hinweis im Bau- und Streckenblatt: zu welcher echten Bahnstrecke gehört der Abschnitt, was fehlt noch? */
  function bahnHinweis(a, b, bau) {
    const B = M.bahnVon(a, b);
    if (!B || B.anzahl < 2) return '';
    const dann = B.fertig + (bau ? 1 : 0), letzter = bau && dann === B.anzahl;
    const text = B.komplett ? 'Teil der <b>' + esc(B.name) + '</b> – komplett in deinem Streckenalbum.'
      : letzter ? 'Der <b>letzte Abschnitt</b> der <b>' + esc(B.name) + '</b>! Damit ist sie komplett: ' + bonusText(B.bonus) + '.'
      : 'Teil der <b>' + esc(B.name) + '</b>: ' + (bau ? 'dann ' : '') + dann + ' von ' + B.anzahl + ' Abschnitten gebaut.';
    return '<div style="margin-top:14px" data-aktion="bahnBlatt" data-wert="' + esc(B.id) + '">' + G.notiz('album', text, letzter) + '</div>';
  }
  function bonusText(bo) { return geld(bo.taler) + (bo.gold ? ' und ' + bo.gold + ' Goldticket' : ''); }
  function bahnBlatt(id) {
    const B = M.bahn(id);
    if (!B) return;
    let h = G.kopf(B.name, esc(B.unter || (B.anzahl + (B.anzahl === 1 ? ' Abschnitt' : ' Abschnitte') + ' · ' + B.km + ' km Luftlinie')), 'album', B.komplett ? 'Streckenalbum · komplett' : 'Streckenalbum') + '<div class="gz-inhalt">';
    h += G.balken(B.fertig / B.anzahl, false, B.komplett) + '<div class="vd-bahn-teile">';
    B.teile.forEach(t => { h += '<div class="' + (t.fertig ? 'vd-steht' : '') + '">' + G.icon(t.fertig ? 'haken' : 'gleis') + '<span>' + esc(D.STADT[t.a].name) + ' – ' + esc(D.STADT[t.b].name) + '</span><small>' + (t.fertig ? 'gebaut' : 'fehlt noch') + ' · ' + t.km + ' km</small></div>'; });
    h += '</div>';
    if (!B.komplett) h += '<div style="margin-top:14px">' + G.notiz('ticket', 'Baust du alle Abschnitte, ist die Strecke komplett: <b>' + bonusText(B.bonus) + '</b>.', true) + '</div>';
    B.infos.forEach(i => { h += '<div style="margin-top:10px">' + G.notiz('info', esc(i)) + '</div>'; });
    h += '<div class="vd-aktionen">' + G.knopf('Auf der Karte zeigen', { art: B.komplett ? null : 'primaer', icon: 'zentrieren', aktion: 'bahnZeigen', wert: B.id, breit: true }) + '</div></div>';
    blatt(h);
  }
  function bahnZeigen(id, bo) {
    const B = M.bahn(id);
    ton('land');
    return G.buehne(wurzel, G.karte({ ueber: 'Streckenalbum · Strecke komplett', titel: esc(B.name), unter: esc((B.unter ? B.unter + ' · ' : B.anzahl > 1 ? B.anzahl + ' Abschnitte · ' : '') + B.km + ' km Luftlinie'),
      rumpf: B.infos.map(i => G.notiz('info', esc(i))).join('') +
        '<div class="vd-kzreihe"><div><span>' + G.icon('muenze') + 'Bonus</span><b>+' + geld(bo.taler) + '</b></div><div><span>' + G.icon('ticket') + 'Goldtickets</span><b>' + (bo.gold ? '+' + bo.gold : '–') + '</b></div><div><span>' + G.icon('album') + 'Strecken</span><b>' + Object.keys(M.zustand().album.bahnen).length + ' / ' + M.bahnen().length + '</b></div></div>' }), 'Weiter');
  }

  // ---------------------------------------------------------------- Große Momente (nacheinander)
  function buehneRein(fn, vorne) {
    if (vorne) buehnen.unshift(fn); else buehnen.push(fn);
    if (!buehneLaeuft) buehneWeiter();
  }
  function buehneWeiter() {
    const fn = buehnen.shift();
    if (!fn || !wurzel) { buehneLaeuft = false; return; }
    buehneLaeuft = true;
    Promise.resolve(fn()).then(() => setTimeout(buehneWeiter, 200), () => setTimeout(buehneWeiter, 200));
  }
  function landZeigen(id) {
    const L = D.LAENDER[id];
    ton('land');
    return G.buehne(wurzel, G.karte({ ueber: 'Neues Bundesland erschlossen', titel: esc(L.name), unter: 'Landeshauptstadt ' + esc(D.STADT[L.hauptstadt].name), farbe: L.farbe,
      kopfExtra: '<div class="vd-karte-umriss">' + umriss(id, L.farbe, true) + '</div>',
      rumpf: G.notiz('info', esc(L.fakt)) + '<div class="vd-kzreihe"><div><span>' + G.icon('ticket') + 'Goldtickets</span><b>+' + M.W.LAND_GOLD + '</b></div><div><span>' + G.icon('land') + 'Länder</span><b>' + Object.keys(M.zustand().laender).length + ' / 16</b></div><div><span>' + G.icon('bahnhof') + 'Bahnhöfe</span><b>' + Object.keys(M.zustand().bahnhoefe).length + '</b></div></div>' }), 'Weiter');
  }
  function stufeZeigen(level) {
    ton('land');
    const neu = D.LOKS.filter(L => L.level === level);
    const geb = Object.keys(D.GEBAEUDE).filter(a => D.GEBAEUDE[a].level === level);
    const platz = M.maxLoks(level) > M.maxLoks(level - 1);
    let r = '';
    if (platz) r += G.notiz('schuppen', 'Im Fuhrpark ist <b>ein Platz mehr</b> frei.');
    neu.forEach(L => { r += G.notiz('lok', 'Neu im Angebot: <b>' + esc(L.reihe) + '</b> · ' + esc(D.ABTEILUNG[L.abt]) + (L.gold ? ' (für Goldtickets)' : '')); });
    geb.forEach(a => { r += G.notiz(D.GEBAEUDE[a].icon, 'Neues Gebäude: <b>' + esc(D.GEBAEUDE[a].name) + '</b>. Tippe auf einen Bahnhof, um es zu bauen.'); });
    if (level === M.W.OL_LEVEL) r += G.notiz('blitz', 'Neu: <b>Oberleitung nachrüsten</b>. Tippe auf eine Strecke ohne Oberleitung.');
    if (!platz && !neu.length && !geb.length && level !== M.W.OL_LEVEL) r += '<div class="vd-leise">Deine Aufträge werden größer und bringen mehr Geld.</div>';
    return G.buehne(wurzel, G.karte({ ueber: 'Aufstieg', titel: 'Stufe ' + level, unter: 'Du hast genug Erfahrung gesammelt.', rumpf: r }), 'Weiter');
  }
  function berichtZeigen(b) {
    const S = M.zustand(), min = Math.round(b.weg / 60000);
    const wegTxt = min < 90 ? min + ' Minuten' : min < 60 * 36 ? Math.round(min / 60) + ' Stunden' : Math.round(min / 1440) + ' Tagen';
    const kohleLeer = S.loks.some(l => l.status === 'kohle');
    return G.buehne(wurzel, G.karte({ ueber: 'Betriebsbericht', titel: 'Willkommen zurück', unter: 'Seit deinem letzten Besuch sind ' + wegTxt + ' vergangen.',
      rumpf: G.daten([['Fahrten', G.zahl(b.fahrten), { zahl: true }], ['Fahrgäste', G.zahl(b.fahrgaeste), { zahl: true }], b.kisten ? ['Kisten', G.zahl(b.kisten), { zahl: true }] : null, ['Einnahmen', geld(b.taler), { zahl: true }]]) +
        (kohleLeer ? '<div style="margin-top:12px">' + G.notiz('blitz', 'Zwischendurch war die Energie alle. Ein größeres Energielager oder eine Lernrunde hilft.', true) + '</div>' : '') }), 'Weiter');
  }

  // ---------------------------------------------------------------- Lernbonus (Ferientraining = dieselben Lernrunden wie beim Hof)
  function lernLieferung() {
    if (typeof Ferientraining === 'undefined' || !Ferientraining.liste) return;
    const S = M.zustand();
    if (!S) return;
    const offen = Ferientraining.liste().filter(x => x.fertig && !(S.lern.datum && S.lern.ids[x.id] && S.lern.datum === heuteText()));
    if (!offen.length) return;
    const runden = offen.map(x => ({ id: x.id, quote: x.n > 0 ? Math.min(1, x.richtig / x.n) : 1, titel: x.titel }));
    const erg = M.lernBonus(runden, jetzt());
    if (!erg.runden) return;
    buehneRein(() => {
      ton('land');
      const zeilen = runden.map(r => [r.titel, r.quote >= 0.999 ? '<span style="color:var(--gz-ok)">alles richtig</span>' : Math.round(r.quote * 100) + ' % richtig']);
      return G.buehne(wurzel, G.karte({ ueber: 'Lieferung', titel: 'Lieferung fürs Lernen', unter: erg.runden === 1 ? '1 Lernrunde abgeschlossen' : erg.runden + ' Lernrunden abgeschlossen',
        rumpf: G.daten(zeilen) + '<div class="vd-kzreihe"><div><span>' + G.icon('blitz') + 'Energie</span><b>+' + G.zahl(erg.kohle) + '</b></div><div><span>' + G.icon('volldampf') + 'Volldampf</span><b>+' + erg.minuten + ' Min</b></div><div><span>' + G.icon('ticket') + 'Gold</span><b>+' + erg.gold + '</b></div></div>' }), 'Einladen')
        .then(() => { hud.letzt.kessel = ''; G.toast(wurzel, 'Volldampf ist geladen. Tippe unten links auf <b>Volldampf geben</b>.', { icon: 'volldampf' }); });
    });
  }
  function heuteText() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  // ---------------------------------------------------------------- Heimatbahnhof wählen (erster Start)
  function heimatWaehlen() {
    modus = { art: 'heimat' };
    A.markieren(D.HEIMAT_AUSWAHL);
    A.modus('heimat', { land: 'TH' });
    A.zeige(D.HEIMAT_AUSWAHL, { sofort: true, zMax: 3 });
    const b = document.createElement('div');
    b.className = 'vd-modus';
    b.innerHTML = '<span>' + G.icon('bahnhof') + '<b>Heimatbahnhof wählen</b> Tippe auf einen der markierten Bahnhöfe in Thüringen.</span>' +
      G.knopf('Zurück', { art: 'dunkel', klein: true, icon: 'zurueck', aktion: 'schliessen' });
    wurzel.appendChild(b);
  }
  function heimatBlatt(c) {
    const s = D.STADT[c];
    blatt(G.kopf(s.name, punkt(D.LAENDER.TH.farbe) + 'Thüringen · ' + einw(s) + ' Einwohner', 'bahnhof', 'Heimatbahnhof') + '<div class="gz-inhalt">' + G.notiz('info', esc(s.fakt)) +
      '<div class="vd-leise" style="margin-top:14px">Von hier aus baust du dein Netz. Die Wahl gilt für das ganze Spiel.</div>' +
      '<div class="vd-aktionen">' + G.knopf('Hier beginnt meine Bahn', { art: 'primaer', icon: 'pfeil', aktion: 'heimatJa', wert: c, breit: true }) + '</div></div>');
  }
  function heimatGewaehlt(c) {
    blattZu();
    const b = wurzel.querySelector('.vd-modus'); if (b) b.parentNode.removeChild(b);
    modus = null; A.markieren([]); A.modus('normal');
    M.neu(jetzt(), c);
    speichern();
    starten(false);
  }

  // ---------------------------------------------------------------- Einführung (Schritt für Schritt) + „Was jetzt?“-Tipp
  // Schritte sind zustandsbasiert: angezeigt wird immer der erste, der noch nicht erledigt ist. Geht Max einen Schritt
  // zurück (Blatt zu, Abbrechen), springt die Einführung von selbst mit. Ein Ring zeigt, was er antippen soll.
  let guideAn = false, guideFlag = {}, letzteAktion = Date.now(), tippAktiv = null, guideEl = null, ringEl = null, guideSig = '';
  const q = sel => wurzel && wurzel.querySelector(sel);
  const hatLinie = () => M.zustand().loks.some(l => l.linie);
  const hatZug = () => M.zustand().loks.length > 0;
  const hatStrecke = () => { const st = M.zustand().strecken; return Object.keys(st).some(k => st[k].fertig); };
  const imLinienModus = () => !!(modus && modus.art === 'linie');
  function guideZielStadt() {
    const S = M.zustand(), von = (modus && modus.von) || S.heimat;
    return Object.keys(S.bahnhoefe).filter(c => c !== von && M.weg(von, c)).sort((a, b) => (M.weg(von, a).km - M.weg(von, b).km))[0] || von;
  }
  const SCHRITTE = [
    { id: 'auftrag', text: () => 'Rechts stehen deine <b>Aufträge</b>. Sie zeigen dir immer, was als Nächstes dran ist. Tippe beim ersten Auftrag auf <b>Bauen</b>.',
      ziel: () => q('[data-aktion="auftragBauen"]') || q('.vd-k-bauen'), fertig: () => blattArt === 'bau' || M.baustellen().length > 0 || hatStrecke() },
    { id: 'bauJa', text: () => 'Die erste Strecke ist geschenkt. Tippe auf <b>Gratis bauen</b>.',
      ziel: () => q('[data-aktion="bauenJa"]'), fertig: () => M.baustellen().length > 0 || hatStrecke() },
    { id: 'bau', text: () => 'Der Bautrupp verlegt jetzt die Gleise. Am Kran steht, wie lange es noch dauert.',
      ziel: () => q('.vd-kran-in'), fertig: () => hatStrecke() },
    { id: 'abholen', text: () => 'Strecke fertig, Auftrag erfüllt. Tippe auf <b>Abholen</b>, um die Belohnung zu bekommen.',
      ziel: () => q('[data-aktion="abholen"]'), fertig: () => !M.zustand().auftraege.some(a => a.fertig) },
    { id: 'loks', text: () => 'Geld verdienen nur fahrende Züge – und noch hast du keinen. Öffne den <b>Fuhrpark</b>.',
      ziel: () => q('[data-aktion="loks"]'), fertig: () => hatZug() || blattArt === 'loks' || imLinienModus() },
    { id: 'kaufen', text: () => 'Kauf deinen ersten Zug. Für den Anfang passt der <b>Regio-Shuttle</b>: Er fährt auch in echt durch Bad Salzungen. Tippe bei ihm auf <b>Kaufen</b>.',
      ziel: () => q('[data-aktion="lokKaufen"][data-wert="rs1"]') || q('[data-aktion="abt"][data-wert="regional"]') || q('[data-aktion="tabKaufen"]'), fertig: () => hatZug() },
    { id: 'linie', text: () => 'Dein erster Zug steht bereit. Tippe auf <b>Linie wählen</b>.',
      ziel: () => q('[data-aktion="linie"]'), fertig: () => hatLinie() || imLinienModus() },
    { id: 'start', text: () => 'Tippe auf deinen Heimatbahnhof <b>' + esc(D.STADT[M.zustand().heimat].name) + '</b>. Dort beginnt die Linie.',
      stadt: () => M.zustand().heimat, fertig: () => hatLinie() || (imLinienModus() && !!modus.von) },
    { id: 'ende', text: () => 'Tippe jetzt auf <b>' + esc(D.STADT[guideZielStadt()].name) + '</b>. Zwischen beiden Bahnhöfen pendelt der Zug hin und her.',
      stadt: () => guideZielStadt(), fertig: () => hatLinie() || (imLinienModus() && !!modus.weg) },
    { id: 'los', text: () => 'Oben steht die Fahrzeit. Bei der Bahn vergeht die Zeit schneller: 1 Sekunde ist 1 Minute. Tippe auf <b>Los</b>.',
      ziel: () => q('[data-aktion="linieLos"]'), fertig: () => hatLinie() },
    { id: 'fahrt', text: () => 'Dein Zug fährt auf seiner farbigen Linie. Bei jeder Ankunft zahlen Fahrgäste und Händler – das Geld siehst du oben in der Kasse.',
      ziel: () => q('.vd-zug:not(.vd-wagen)'), rund: true, weiter: 'Weiter', fertig: () => !!guideFlag.fahrt },
    { id: 'zoom', text: () => 'Mit <b>+</b> und <b>−</b> (oder mit zwei Fingern) zoomst du. Ganz nah siehst du deine Bahnhöfe mit Gleisen und allen Gebäuden.',
      ziel: () => q('[data-aktion="zoomRein"]'), weiter: 'Weiter', fertig: () => !!guideFlag.zoom },
    { id: 'kohle', text: () => 'Züge brauchen <b>Energie</b>: Dieselzüge tanken Diesel, E-Loks nehmen Strom aus der Oberleitung. Solange du spielst, wird automatisch nachgekauft. Ist das Lager leer, bleiben die Züge stehen.',
      ziel: () => q('[data-aktion="kohle"]'), weiter: 'Weiter', fertig: () => !!guideFlag.kohle },
    { id: 'lernen', text: () => 'Jede <b>Lernrunde</b> in der Lern-App bringt eine Lieferung: Energie, Volldampf und Goldtickets. Mit Volldampf arbeiten alle Züge und Bautrupps doppelt so schnell.',
      ziel: () => q('.vd-kessel'), weiter: 'Weiter', fertig: () => !!guideFlag.lernen },
    { id: 'stufe', text: () => 'Aufträge, neue Städte und neue Bundesländer bringen <b>Erfahrung</b>. Mit jeder Stufe gibt es neue Züge und Gebäude – vom Regio-Shuttle bis zum ICE.',
      ziel: () => q('.vd-stufe'), weiter: 'Weiter', fertig: () => !!guideFlag.stufe },
    { id: 'ziel', text: () => 'Dein Ziel: ein Schienennetz durch <b>alle 16 Bundesländer</b>. Hier oben siehst du, wie weit du bist. Unter <b>?</b> ganz rechts kannst du alles nachlesen.',
      ziel: () => q('[data-aktion="ziel"]'), weiter: 'Weiter', fertig: () => !!guideFlag.ziel },
    { id: 'karte', text: () => 'Alle Strecken im Spiel gibt es wirklich. Mit einer <b>Linienkarte</b> baust du eine echte Zuglinie nach – such dir gleich eine aus. Baust du alle Abschnitte einer Bahnstrecke, kommt sie in dein Streckenalbum.',
      ziel: () => q('[data-aktion="kartenWahl"]') || q('.vd-lkarte'), weiter: 'Weiter', fertig: () => !!guideFlag.karte },
    { id: 'dampf', text: () => 'Für Linienkarten und neue Bundesländer gibt es <b>Goldtickets</b>. Damit holst du dir Dampfloks. Sie fahren wie heute in echt nur Sonderfahrten – zum Beispiel den Rodelblitz durch den Thüringer Wald.',
      ziel: () => q('[data-aktion="gold"]'), weiter: 'Los geht’s', fertig: () => !!guideFlag.dampf },
  ];
  const guideIndex = () => SCHRITTE.findIndex(s => !s.fertig());
  function guideVorbereiten() {
    const S = M.zustand();
    if (S.hilfe.guide) return;
    if (Object.keys(S.bahnhoefe).length > 6) { S.hilfe.guide = 1; return; }   // erfahrener Spielstand: keine Einführung
    buehneRein(() => G.buehne(wurzel, G.karte({ ueber: 'Volldampf', titel: 'Deine Eisenbahn', unter: 'Heimatbahnhof ' + esc(D.STADT[S.heimat].name),
      rumpf: '<p style="margin:0 0 14px">Du leitest eine Eisenbahn – vom Regionalzug bis zum ICE. <b>Dein Ziel:</b> ein Schienennetz durch alle 16 Bundesländer.</p>' +
        G.notiz('gleis', '<b>Strecken bauen</b> und Städte anschließen') + G.notiz('lok', '<b>Züge kaufen</b> und auf Linien schicken – jede Fahrt bringt Geld') +
        G.notiz('ticket', '<b>Aufträge erfüllen</b>, aufsteigen, neue Züge und Gebäude freischalten') +
        '<p class="vd-leise" style="margin:14px 0 0">Die Einführung führt dich durch die ersten Schritte. Ein Rahmen zeigt jeweils, was du antippen sollst.</p>' }), 'Einführung starten')
      .then(() => { guideAn = true; guideTick(); }));
  }
  function guideBeenden() {
    guideAn = false; M.zustand().hilfe.guide = 1; speichern(); guideZeigen(null);
  }
  function eingabe() { letzteAktion = Date.now(); if (tippAktiv) tippAus(); }
  function tippAus() { tippAktiv = null; guideZeigen(null); letzteAktion = Date.now(); }
  function guideTick() {
    if (!wurzel || !M.zustand()) return;
    if (buehneLaeuft) { guideZeigen(null); return; }
    if (guideAn) {
      const i = guideIndex();
      if (i < 0) { guideBeenden(); G.toast(wurzel, 'Einführung abgeschlossen. Oben rechts unter <b>?</b> kannst du alles nachlesen.', { icon: 'signal' }); return; }
      guideZeigen(SCHRITTE[i], i);
      return;
    }
    if (tippAktiv) { if (tippAktiv.fertig && tippAktiv.fertig()) tippAus(); else guideZeigen(tippAktiv); return; }
    if (Date.now() - letzteAktion > 25000 && !blattAkt && !modus && !buehnen.length) {
      letzteAktion = Date.now();
      const t = wasJetzt();
      if (t) { tippAktiv = t; guideZeigen(t); }
    }
  }
  /** „Was jetzt?“ – der sinnvollste nächste Schritt (nach der Einführung, wenn Max 25 s nichts tut) */
  function wasJetzt() {
    const S = M.zustand(), j = jetzt();
    if (!S.loks.length) return { text: () => 'Du hast noch keinen Zug. Kauf deinen ersten im <b>Fuhrpark</b>.', ziel: () => q('[data-aktion="loks"]') };
    if (S.auftraege.some(a => a.fertig)) return { text: () => 'Ein Auftrag ist erfüllt. Hol dir die Belohnung ab.', ziel: () => q('[data-aktion="abholen"]') };
    for (let i = 0; i < S.auftraege.length; i++) {
      const h = M.auftragHilfe(S.auftraege[i].aid);
      if (h.tun === 'zug') return { text: () => 'Für einen Auftrag fehlt nur noch ein Zug. Tippe auf <b>Zug einsetzen</b>.', ziel: () => q('[data-aktion="auftragZug"]') };
      if (h.tun === 'bauen' && h.preis <= S.taler && M.baustellen().length < S.bautrupps) return { text: () => 'Du hast genug Geld für die Strecke zu einem Auftrag. Tippe auf <b>Bauen</b>.', ziel: () => q('[data-aktion="auftragBauen"]:not([aria-disabled="true"])') };
    }
    if (S.loks.some(l => !l.linie)) return { text: () => 'Ein Zug steht ungenutzt im Depot. Gib ihm eine Linie.', ziel: () => q('[data-aktion="loks"]') };
    if (S.volldampf.vorrat > 0 && j >= S.volldampf.bis) return { text: () => 'Du hast Volldampf aus deinen Lernrunden. Damit fahren alle Züge doppelt so schnell.', ziel: () => q('[data-aktion="volldampf"]') };
    { const bt = M.betrieb(); if (bt.personen >= 3 && bt.fehlt === 'gueter' && D.LOKS.some(L => !L.gold && L.ladung > 0 && !L.plaetze && M.kaufbar(L.id).ok)) return { text: () => 'Dir fehlt ein <b>Güterzug</b>: In den Lagern warten Kisten, und ein ausgewogener Betrieb bringt ' + Math.round((bt.bonus - 1) * 100) + ' % mehr Geld.', ziel: () => q('[data-aktion="loks"]') }; }
    if (M.belegt() < M.fuhrpark() && D.LOKS.some(L => !L.gold && M.kaufbar(L.id).ok)) return { text: () => 'Im Fuhrpark ist ein Platz frei, und du kannst dir einen neuen Zug leisten.', ziel: () => q('[data-aktion="loks"]') };
    if (M.baustellen().length < S.bautrupps && M.baubar().some(k => k.preis <= S.taler)) return { text: () => 'Du kannst eine neue Strecke bauen. Jede neue Stadt bringt Fahrgäste, Waren und Erfahrung.', ziel: () => q('.vd-k-bauen') };
    return { text: () => 'Deine Züge verdienen gerade Geld. Für den nächsten Auftrag fehlt noch etwas – eine Lernrunde bringt Volldampf.', ziel: () => q('[data-aktion="taler"]') };
  }
  function guideZeigen(sch, i) {
    if (!wurzel) return;
    if (!sch) {
      if (guideEl) { guideEl.parentNode.removeChild(guideEl); guideEl = null; }
      if (ringEl) { ringEl.parentNode.removeChild(ringEl); ringEl = null; }
      guideSig = ''; wurzel.classList.remove('vd-mit-guide');
      return;
    }
    if (!guideEl) { guideEl = document.createElement('div'); guideEl.className = 'vd-guide'; wurzel.appendChild(guideEl); }
    if (!ringEl) { ringEl = document.createElement('div'); ringEl.className = 'vd-guide-ring'; wurzel.appendChild(ringEl); }
    wurzel.classList.add('vd-mit-guide');
    const text = sch.text(), istTipp = i == null;
    const sig = (istTipp ? 'tipp' : i) + '|' + text;
    if (sig !== guideSig) {
      guideSig = sig;
      let fort = '';
      if (!istTipp) for (let n = 0; n < SCHRITTE.length; n++) fort += '<i' + (n <= i ? ' class="vd-an"' : '') + '></i>';
      guideEl.innerHTML = '<div class="vd-guide-kopf"><span class="gz-ueber">' + (istTipp ? 'Tipp' : 'Einführung · ' + (i + 1) + ' / ' + SCHRITTE.length) + '</span>' +
        (istTipp ? '<button data-aktion="tippOk">Schließen</button>' : '<button data-aktion="guideEnde">Überspringen</button>') + '</div>' +
        (istTipp ? '' : '<div class="vd-guide-fort">' + fort + '</div>') +
        '<div>' + text + '</div>' + (sch.weiter ? '<div class="vd-guide-knoepfe">' + G.knopf(sch.weiter, { art: 'primaer', klein: true, aktion: 'guideWeiter', icon: 'pfeil' }) + '</div>' : '');
    }
    // Karte: links, wenn rechts ein Blatt offen ist; unter dem Modus-Banner, wenn eins da ist
    const w0 = wurzel.getBoundingClientRect(), mb = q('.vd-modus');
    guideEl.style.top = (mb && istQuer() ? Math.round(mb.getBoundingClientRect().bottom - w0.top + 10) : 76) + 'px';
    // Ring um das Ziel
    let r = null;
    if (sch.stadt) {
      const c = sch.stadt(), p = c && A.schirmVonStadt(c);
      if (p) r = { x: p[0] - 15, y: p[1] - 15, w: 30, h: 30, rund: true };
    } else if (sch.ziel) {
      const e = sch.ziel();
      if (e) { const b = e.getBoundingClientRect(); if (b.width || b.height) r = { x: b.left - w0.left - 4, y: b.top - w0.top - 4, w: b.width + 8, h: b.height + 8, rund: !!sch.rund }; }
    }
    if (r && r.x > -40 && r.y > -40 && r.x < w0.width && r.y < w0.height) {
      ringEl.style.display = '';
      ringEl.style.transform = 'translate(' + r.x.toFixed(0) + 'px,' + r.y.toFixed(0) + 'px)';
      ringEl.style.width = r.w.toFixed(0) + 'px'; ringEl.style.height = r.h.toFixed(0) + 'px';
      ringEl.classList.toggle('vd-rund', !!r.rund);
    } else ringEl.style.display = 'none';
  }
  /** Ziel + Spielanleitung (Chip „Länder“ oder ?) */
  function zielBlatt() {
    const S = M.zustand(), n = Object.keys(S.laender).length;
    let h = G.kopf('Spielziel', n + ' von 16 Bundesländern · ' + Object.keys(S.bahnhoefe).length + ' von ' + D.STAEDTE.length + ' Städten angeschlossen', 'land', 'Übersicht') +
      '<div class="gz-inhalt"><div style="margin:2px 0 16px">' + G.balken(n / 16) + '</div><div class="vd-laender">';
    Object.keys(D.LAENDER).sort((a, b) => D.LAENDER[a].name.localeCompare(D.LAENDER[b].name, 'de')).forEach(id => {
      const L = D.LAENDER[id], an = !!S.laender[id];
      h += '<div class="vd-land-zeile' + (an ? '' : ' vd-zu') + '"><i style="background:' + (an ? L.farbe : 'transparent') + '"></i><span>' + esc(L.name) + '</span><small>' + esc(D.STADT[L.hauptstadt].name) + '</small></div>';
    });
    const regel = (icon, titel, text) => '<div class="vd-regel">' + G.icon(icon) + '<div><b>' + titel + '</b>' + text + '</div></div>';
    h += '</div><div class="gz-abschnitt">So funktioniert Volldampf</div><div class="vd-regeln">' +
      regel('gleis', 'Strecken bauen', 'Neue Strecken schließen Städte an. Jede Stadt bringt Fahrgäste und oft eine Ware. Ein neues Bundesland bringt ' + M.W.LAND_GOLD + ' Goldtickets.') +
      regel('lok', 'Züge einsetzen', 'Kauf Züge im Fuhrpark: Regionalzüge, Güterloks und ICEs. Jeder Zug pendelt auf seiner farbigen Linie zwischen zwei Bahnhöfen. Fahrgäste und Waren zahlen bei jeder Ankunft, lange Strecken bringen mehr.') +
      regel('signal', 'Platz auf der Strecke', 'Auf einen Abschnitt passen nicht beliebig viele Züge: ' + M.W.KAP_EIN + ' auf einem Gleis, ' + M.W.KAP_ZWEI + ' auf zwei Gleisen. Hauptstrecken mit Oberleitung haben schon zwei Gleise. Verteile deine Züge im Netz – oder bau ein zweites Gleis (Strecke antippen). Dampfloks auf Sonderfahrt brauchen keinen eigenen Platz.') +
      regel('kiste', 'Personen und Güter', 'Eine gute Bahn fährt beides. Hast du mindestens einen Güterzug je drei Personenzüge (und nicht mehr Güter- als Personenzüge), bringt jede Fahrt ' + Math.round((M.W.GLEICHGEWICHT - 1) * 100) + ' % mehr Geld.') +
      regel('dampf', 'Dampfloks', 'Dampfloks sind etwas Besonderes: Du bekommst sie für Goldtickets, jede nur einmal. Wie heute in echt fahren sie keine normalen Linien mehr, sondern Sonderfahrten und Museumsbahnen – zum Beispiel den Rodelblitz durch den Thüringer Wald. Dort zahlen die Ausflügler mehr.') +
      regel('album', 'Echte Strecken und Linien', 'Jede Strecke im Spiel gibt es wirklich. Mit einer Linienkarte baust du eine echte Zuglinie nach und schickst einen Zug auf Eröffnungsfahrt – mit dem Zug wie in echt gibt es ein Goldticket. Im Streckenalbum (Sammlung) siehst du, welche Bahnstrecken du schon komplett hast.') +
      regel('liste', 'Aufträge erfüllen', 'Aufträge bringen viel Geld und Erfahrung. Mit Erfahrung steigst du auf und bekommst neue Züge, Gebäude und mehr Platz im Fuhrpark.') +
      regel('bahnhof', 'Bahnhöfe ausbauen', 'Tippe auf einen Bahnhof: Stellwerk, Gaststätte, Güterhalle und Betriebswerk machen ihn stärker. Zoome heran, dann siehst du sie.') +
      regel('blitz', 'Energie und Oberleitung', 'Dampfloks verbrennen Kohle, Dieselloks tanken Diesel, E-Loks und ICEs fahren mit Strom aus der Oberleitung. Welche Strecken eine haben, ist wie in echt (blaue Schiene, Masten) – ab Stufe ' + M.W.OL_LEVEL + ' kannst du fehlende nachrüsten: Strecke antippen. Der Wasserstoffzug macht seinen Strom selbst. Ohne dich reicht das Energielager nur eine Weile.') +
      regel('volldampf', 'Lernen', 'Jede Lernrunde in der Lern-App bringt Energie, Volldampf (doppeltes Tempo) und Goldtickets für besondere Züge.') +
      regel('uhr', 'Bahnzeit', 'Bei der Bahn vergeht die Zeit 60-mal schneller: 1 Sekunde ist 1 Minute, ein Tag dauert 24 Minuten.') +
      '</div><div class="vd-aktionen">' + G.knopf(M.zustand().ton === false ? 'Ton einschalten' : 'Ton ausschalten', { icon: 'ton', aktion: 'tonUm', breit: true }) + G.knopf('Einführung noch einmal', { aktion: 'guideNochmal', breit: true }) + '</div></div>';
    blatt(h, { art: 'ziel' });
  }

  // ---------------------------------------------------------------- Töne (WebAudio, ohne Dateien) – Ausbau in S3
  /** Ton abspielen. 'pfiff' mit Zug-Typ: Dampfloks pfeifen, alle anderen hupen. Abschaltbar im Hilfe-Blatt (S.ton). */
  function ton(art, lokId, opt) {
    const S = M.zustand();
    if ((S && S.ton === false) || typeof VolldampfTon === 'undefined') return;
    if (art === 'pfiff' && lokId && D.LOK[lokId] && D.LOK[lokId].antrieb !== 'dampf') art = 'horn';
    VolldampfTon.spiele(art, opt);
  }

  function fortschrittText() {
    let roh = null;
    try { roh = localStorage.getItem(M.SPEICHER); } catch (e) { roh = null; }
    if (!roh) return 'Neu: Eisenbahn quer durch Deutschland';
    try { const S = JSON.parse(roh); return 'Stufe ' + S.level + ' · ' + Object.keys(S.laender).length + ' von 16 Ländern'; } catch (e) { return ''; }
  }

  return { oeffnen, schliessen, fortschrittText, _t: { klick, kartenTipp, guideStand: () => { const i = guideIndex(), sc = SCHRITTE[i]; return { an: guideAn, i, n: SCHRITTE.length, id: sc ? sc.id : null, el: sc && sc.ziel ? sc.ziel() : null, stadt: sc && sc.stadt ? sc.stadt() : null, weiter: !!(sc && sc.weiter) }; }, sonderBlatt, lokBlatt, taufBlatt, lokDetail, kartenWahlBlatt, karteBlatt, karteErfuellt, bahnBlatt, bahnZeigen, bauBlatt, lernLieferung, heimatGewaehlt, lokNummer, landZeigen, stufeZeigen, stadtBlatt, albumBlatt, zielBlatt, kohleBlatt } };
})();
