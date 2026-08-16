// Mau-Mau gegen Papa (Handy-App) ueber das Max-Tablet-Backend. ANDERS als bei
// Schach/Schiffe versenken lebt der Spielzustand NICHT clientseitig verifiziert -
// der Server ist hier bewusst der "Kartengeber" (kennt beide Haende, das ist
// bei einem Kartenspiel nicht zu vermeiden) und schickt jedem Client nur seine
// EIGENE Hand + die reine Kartenanzahl des Gegners. Dieses Modul zeigt nur an,
// was der Server zuletzt geschickt hat, und schickt eigene Aktionen dorthin -
// aehnlich wie schach-online.js, aber ohne eigene Legalitaetspruefung (die
// macht hier ausschliesslich der Server, siehe backend/server.js mauMauWss).
//
// onLeaveScreen-Kniff: siehe ausfuehrlicher Kommentar in schach-online.js.
const MaumauOnline = (function () {
  const E = MauMauEngine;
  const WS_URL = 'wss://max-tablet-backend.onrender.com/ws/maumau';
  const MEINE_ROLLE = 'max';
  const GEGNER_ROLLE = 'papa';
  const RECONNECT_MS = 3000;

  let ws = null;
  let aktiv = false;
  let ersteAnzeige = true;
  let verbindungsStatus = 'verbindet';
  let stand = null; // letzte 'stand'-Nachricht vom Server (nur die EIGENE Hand enthalten)
  let reconnectTimer = null;

  function verbinden() {
    aktiv = true;
    verbindungsStatus = 'verbindet';
    zeichne();
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      verbindungsStatus = 'getrennt';
      zeichne();
      reconnectTimer = setTimeout(verbinden, RECONNECT_MS);
      return;
    }
    ws.onopen = () => ws.send(JSON.stringify({ typ: 'beitreten', rolle: MEINE_ROLLE }));
    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch (e) { return; }
      if (msg.typ !== 'stand') return;
      stand = msg;
      verbindungsStatus = 'verbunden';
      zeichne();
    };
    ws.onclose = () => {
      ws = null;
      if (!aktiv) return;
      verbindungsStatus = 'getrennt';
      zeichne();
      reconnectTimer = setTimeout(verbinden, RECONNECT_MS);
    };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* egal */ } };
  }

  function trennen() {
    aktiv = false;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (ws) {
      ws.onclose = null; ws.onmessage = null; ws.onerror = null;
      try { ws.close(); } catch (e) { /* egal */ }
      ws = null;
    }
  }

  function starteAnsicht() {
    ersteAnzeige = true;
    stand = null;
    verbinden();
  }

  function karteHtml(karte, klassen, onclick) {
    const farbeKlasse = E.FARBROT[karte.farbe] ? 'karte-rot' : 'karte-schwarz';
    const klick = onclick ? ` onclick="${onclick}"` : '';
    return `<div class="maumau-karte ${farbeKlasse}${klassen ? ' ' + klassen : ''}"${klick}>
      <span class="maumau-karte-wert">${karte.wert}</span>
      <span class="maumau-karte-symbol">${E.FARBSYMBOL[karte.farbe]}</span>
    </div>`;
  }

  function zeichne() {
    let html;
    if (verbindungsStatus !== 'verbunden' || !stand) {
      html = `
        <div class="back-row"><span class="back-btn" onclick="Maumau.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
        <div class="maumau-wrap">
          <div class="schach-info">${verbindungsStatus === 'verbindet' ? 'Verbinde mit Papa …' : 'Verbindung verloren – verbinde neu …'}</div>
        </div>
      `;
      if (!ersteAnzeige) App.setOnLeaveScreen(() => {});
      App.render(html);
      App.setOnLeaveScreen(trennen);
      ersteAnzeige = false;
      return;
    }

    if (!ersteAnzeige) App.setOnLeaveScreen(() => {});

    if (stand.status === 'kein_spiel') {
      App.render(`
        <div class="back-row"><span class="back-btn" onclick="Maumau.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
        <div class="welcome">Online gegen Papa</div>
        <div class="lese-text">${stand.verbunden[GEGNER_ROLLE] ? 'Papa ist gerade online! ' : 'Papa ist gerade nicht online, aber du kannst trotzdem starten - er bekommt eine Benachrichtigung. '}Wer startet, ist auch gleich am Zug.</div>
        <div class="btn-primary" onclick="MaumauOnline.starteSpiel()">Neues Spiel starten</div>
      `);
    } else {
      renderSpiel();
    }
    App.setOnLeaveScreen(trennen);
    ersteAnzeige = false;
  }

  function renderSpiel() {
    const oben = stand.obenliegendeKarte;
    let statusHtml = '';
    if (stand.status === 'beendet') {
      if (stand.aufgegebenVon) {
        statusHtml = stand.aufgegebenVon === MEINE_ROLLE
          ? '<div class="schach-status schach-status-niederlage">Du hast aufgegeben.</div>'
          : '<div class="schach-status schach-status-sieg">Papa hat aufgegeben – du gewinnst!</div>';
      } else {
        statusHtml = stand.gewinner === MEINE_ROLLE
          ? '<div class="schach-status schach-status-sieg">🏆 Alle Karten losgeworden – du hast gewonnen!</div>'
          : '<div class="schach-status schach-status-niederlage">Papa war zuerst fertig.</div>';
      }
    }

    let infoText = '';
    if (stand.status === 'laeuft') {
      if (stand.farbwahlAusstehend) {
        infoText = stand.amZug === MEINE_ROLLE ? 'Wähle eine Farbe' : 'Papa wählt eine Farbe …';
      } else {
        infoText = stand.amZug === MEINE_ROLLE ? 'Du bist am Zug' : 'Papa ist am Zug …';
      }
      if (!stand.verbunden[GEGNER_ROLLE]) infoText += ' (Papa ist gerade nicht online)';
    }

    const ziehstrafeHtml = stand.ziehstrafe > 0
      ? `<div class="maumau-hinweis">🃏 Sieben-Kette: ${stand.ziehstrafe} Karten ziehen oder eine Sieben nachlegen</div>` : '';
    const farbwunschHtml = stand.gewuenschteFarbe
      ? `<div class="maumau-hinweis">Gewünschte Farbe: <span class="${E.FARBROT[stand.gewuenschteFarbe] ? 'karte-rot' : 'karte-schwarz'}">${E.FARBSYMBOL[stand.gewuenschteFarbe]} ${E.FARBNAME[stand.gewuenschteFarbe]}</span></div>` : '';

    const gegnerHandHtml = Array.from({ length: stand.gegnerAnzahl }).map(() => '<div class="maumau-kartenrueckseite"></div>').join('');

    const eigenerZug = stand.status === 'laeuft' && stand.amZug === MEINE_ROLLE && !stand.farbwahlAusstehend;
    const sortierteIndizes = E.sortiereHandIndizes(stand.meineHand);
    const spielerHandHtml = sortierteIndizes.map((i) => {
      const karte = stand.meineHand[i];
      const nurGezogeneSpielbar = false; // Server erlaubt karte_spielen mit jedem gueltigen Index, keine lokale "gerade gezogen"-Sperre noetig
      const passtRegulaer = !oben ? false : (stand.ziehstrafe > 0 ? karte.wert === '7' : E.istLegbar(karte, oben, stand.gewuenschteFarbe));
      const legbar = eigenerZug && passtRegulaer;
      const klassen = legbar ? '' : 'maumau-karte-gesperrt';
      return karteHtml(karte, klassen, legbar ? `MaumauOnline.karteGeklickt(${i})` : null);
    }).join('');

    const farbwahlHtml = stand.farbwahlAusstehend && stand.amZug === MEINE_ROLLE ? `
      <div class="maumau-farbwahl">
        ${E.FARBEN.map(f => `<span class="maumau-farbwahl-btn ${E.FARBROT[f] ? 'karte-rot' : 'karte-schwarz'}" onclick="MaumauOnline.waehleFarbe('${f}')">${E.FARBSYMBOL[f]}</span>`).join('')}
      </div>
    ` : '';

    const kannZiehen = eigenerZug && !stand.darfPassen;

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Maumau.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="maumau-wrap">
        <div class="welcome">Mau-Mau – gegen Papa</div>
        <div class="schach-info">${infoText}</div>
        ${statusHtml}
        <div class="maumau-computerhand">${gegnerHandHtml}</div>
        <div class="maumau-tischmitte">
          <div class="maumau-stapel-gruppe">
            <div class="maumau-kartenrueckseite maumau-nachziehstapel${kannZiehen ? '' : ' maumau-stapel-inaktiv'}"${kannZiehen ? ' onclick="MaumauOnline.ziehen()"' : ''}></div>
            <div class="maumau-stapel-label">${stand.nachziehstapelAnzahl} übrig</div>
          </div>
          <div class="maumau-stapel-gruppe">
            ${oben ? karteHtml(oben, '') : ''}
            <div class="maumau-stapel-label">Ablage</div>
          </div>
        </div>
        ${ziehstrafeHtml}
        ${farbwunschHtml}
        ${farbwahlHtml}
        <div class="maumau-spielerhand">${spielerHandHtml}</div>
        <div class="schach-aktionsleiste">
          ${stand.darfPassen && stand.amZug === MEINE_ROLLE ? '<span class="schach-aktion-btn schach-aktion-btn-sekundaer" onclick="MaumauOnline.passen()">Passen</span>' : ''}
          ${stand.status === 'laeuft'
            ? '<span class="schach-aktion-btn schach-aktion-btn-sekundaer" onclick="MaumauOnline.aufgeben()">Aufgeben</span>'
            : '<span class="schach-aktion-btn" onclick="MaumauOnline.starteSpiel()">Neues Spiel</span>'}
        </div>
      </div>
    `);
  }

  function starteSpiel() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ typ: 'neues_spiel' }));
  }

  function aufgeben() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ typ: 'aufgeben' }));
  }

  function karteGeklickt(index) {
    if (!stand || stand.status !== 'laeuft' || stand.amZug !== MEINE_ROLLE || stand.farbwahlAusstehend) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ typ: 'karte_spielen', index }));
  }

  function ziehen() {
    if (!stand || stand.status !== 'laeuft' || stand.amZug !== MEINE_ROLLE || stand.farbwahlAusstehend || stand.darfPassen) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ typ: 'karte_ziehen' }));
  }

  function passen() {
    if (!stand || !stand.darfPassen || stand.amZug !== MEINE_ROLLE) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ typ: 'passen' }));
  }

  function waehleFarbe(farbe) {
    if (!stand || !stand.farbwahlAusstehend || stand.amZug !== MEINE_ROLLE) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ typ: 'farbe_waehlen', farbe }));
  }

  return { starteAnsicht, starteSpiel, aufgeben, karteGeklickt, ziehen, passen, waehleFarbe };
})();
