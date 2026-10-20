// Auto-Quartett online gegen Papa. Der Server ist der Kartengeber (kennt beide Stapel) und schickt
// jedem nur die eigene oberste Karte + die Kartenanzahl des Gegners (siehe backend/server.js quartettWss).
// Dieses Modul zeigt nur an, was der Server zuletzt geschickt hat. onLeaveScreen-Kniff wie in maumau-online.js.
const QuartettOnline = (function () {
  const E = QuartettEngine;
  const WS_URL = 'wss://max-tablet-api.paceforge-pi.co.uk/ws/quartett';
  const ICH = 'max';
  const NS = 'QuartettOnline';
  const NAMEN = { gegner: 'Papa' };
  const RECONNECT_MS = 3000;

  let ws = null, aktiv = false, ersteAnzeige = true, verbindungsStatus = 'verbindet';
  let satzId = 'autos', satzWahlOffen = false;
  let stand = null, reconnectTimer = null, gesehenNr = 0, belohntFuer = null, ersterStand = true;

  function verbinden() {
    aktiv = true; verbindungsStatus = 'verbindet'; zeichne();
    try { ws = new WebSocket(WS_URL); } catch (e) {
      verbindungsStatus = 'getrennt'; zeichne(); reconnectTimer = setTimeout(verbinden, RECONNECT_MS); return;
    }
    ws.onopen = () => ws.send(JSON.stringify({ typ: 'beitreten', rolle: ICH }));
    ws.onmessage = (event) => {
      let msg; try { msg = JSON.parse(event.data); } catch (e) { return; }
      if (msg.typ !== 'stand') return;
      // Beim ersten Stand nach dem Verbinden keine alte Aufdeck-Ansicht nachholen
      if (ersterStand || (stand && stand.spielId !== msg.spielId)) gesehenNr = msg.rundenNr;
      ersterStand = false;
      stand = msg; verbindungsStatus = 'verbunden'; zeichne();
    };
    ws.onclose = () => {
      ws = null; if (!aktiv) return;
      verbindungsStatus = 'getrennt'; zeichne(); reconnectTimer = setTimeout(verbinden, RECONNECT_MS);
    };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* egal */ } };
  }

  function trennen() {
    aktiv = false;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (ws) { ws.onclose = null; ws.onmessage = null; ws.onerror = null; try { ws.close(); } catch (e) { /* egal */ } ws = null; }
  }

  function starteAnsicht() {
    E.setzeSaetze(QuartettSaetze);
    QuartettUI.setzeBildBasis('img/');
    satzWahlOffen = false;
    ersteAnzeige = true; stand = null; ersterStand = true; gesehenNr = 0;
    verbinden();
  }

  function seite(inhalt) {
    return `<div class="back-row"><span class="back-btn" onclick="Quartett.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>${inhalt}`;
  }

  function zeichne() {
    if (!ersteAnzeige) App.setOnLeaveScreen(() => {});
    let html;
    if (verbindungsStatus !== 'verbunden' || !stand) {
      html = seite(`<div class="qz-wrap"><div class="qz-info">${verbindungsStatus === 'verbindet' ? 'Verbinde mit Papa …' : 'Verbindung verloren – verbinde neu …'}</div></div>`);
    } else if (stand.status === 'kein_spiel' || satzWahlOffen) {
      html = seite(`<div class="qz-wrap buehne-marker"><div class="qz-info">Online gegen Papa</div>
        <div class="qz-menue-hinweis">${stand.verbunden && stand.verbunden.papa ? 'Papa ist gerade online! ' : 'Papa ist gerade nicht online, aber du kannst trotzdem starten – er bekommt eine Benachrichtigung. '}Wer startet, darf auch den ersten Wert aussuchen.</div>
        <div class="qz-info">Welche Karten?</div>
        <div class="qz-stufen">${E.satzListe().map((s) => `<span class="qz-stufe${s.id === satzId ? ' qz-aktiv' : ''}" onclick="${NS}.waehleSatz('${s.id}')">${QuartettUI.esc(s.name)}</span>`).join('')}</div>
        <div class="qz-aktionen"><span class="qz-btn" onclick="${NS}.starte()">Spiel starten</span></div></div>`);
    } else {
      const spielHtml = QuartettUI.spielHtml(stand, ICH, NAMEN, NS, { gesehenNr });
      const offline = stand.status === 'laeuft' && stand.verbunden && !stand.verbunden.papa ? '<div class="qz-hinweis">Papa ist gerade nicht online – er bekommt eine Benachrichtigung.</div>' : '';
      html = seite(spielHtml + offline);
    }
    App.render(html);
    App.setOnLeaveScreen(trennen);
    ersteAnzeige = false;
  }

  function senden(obj) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); }

  function waehle(key) {
    if (!stand || stand.status !== 'laeuft' || stand.amZug !== ICH || gesehenNr < stand.rundenNr) return;
    senden({ typ: 'waehlen', wert: key });
  }

  function weiter() {
    if (!stand) return;
    gesehenNr = stand.rundenNr;
    if (stand.status === 'beendet' && belohntFuer !== stand.spielId && !stand.aufgegebenVon) {
      belohntFuer = stand.spielId;
      const gewonnen = stand.gewinner === ICH;
      Storage.meldeQuartettPartie(gewonnen);
      if (gewonnen) { Storage.addSterne(20); App.updateTopbar(); }
    }
    zeichne();
  }

  function aufgeben() { senden({ typ: 'aufgeben' }); }
  function neuesSpiel() { satzWahlOffen = true; zeichne(); }
  function waehleSatz(id) { satzId = id; zeichne(); }
  function starte() { satzWahlOffen = false; senden({ typ: 'neues_spiel', satz: satzId }); }

  return { starteAnsicht, waehle, weiter, aufgeben, neuesSpiel, waehleSatz, starte };
})();
