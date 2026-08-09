// Live-Schach gegen Papa (Handy-App) ueber das Max-Tablet-Backend (WebSocket-
// Relay, siehe backend/server.js). Anders als beim Spielen gegen die KI lebt
// der Spielzustand NICHT hier, sondern auf dem Server - dieses Modul zeigt nur
// an, was der Server zuletzt geschickt hat, und schickt eigene Zuege dorthin.
//
// onLeaveScreen-Kniff: Diese Ansicht rendert sich selbst wiederholt neu (jeder
// Zug von Papa loest ein Update aus) - App.setOnLeaveScreen feuert aber beim
// NAECHSTEN render()-Aufruf, egal von wem. Ohne Gegenmassnahme wuerde also
// bereits unser eigener zweiter zeichne()-Aufruf die Verbindung wieder
// trennen. Loesung: vor jedem SELBST ausgeloesten Render kurz einen No-Op
// einsetzen (verbraucht sich harmlos), NUR beim allerersten Render dieser
// Ansicht das evtl. von der VORHERIGEN Ansicht gesetzte echte Callback normal
// feuern lassen. Nach jedem Render wird trennen() frisch scharf gemacht -
// das feuert dann zuverlaessig beim naechsten ECHTEN Verlassen (Zurueck-
// Button, Home-Symbol, ...), ganz ohne dass diese Wege selbst etwas wissen
// muessen.
const SchachOnline = (function () {
  const WS_URL = 'wss://max-tablet-backend.onrender.com/ws/schach';
  const MEINE_ROLLE = 'max';
  const RECONNECT_MS = 3000;

  const FIGUR_SYMBOL = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };
  const DATEIEN = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  function koordLeisten(felderOrient) {
    let rang = '', datei = '';
    for (let i = 0; i < 8; i++) {
      rang += `<div>${SchachEngine.rankOf(felderOrient[i * 8]) + 1}</div>`;
      datei += `<div>${DATEIEN[SchachEngine.fileOf(felderOrient[56 + i])]}</div>`;
    }
    return { rang, datei };
  }

  let ws = null;
  let aktiv = false;
  let ersteAnzeige = true;
  let verbindungsStatus = 'verbindet'; // 'verbindet' | 'verbunden' | 'getrennt'
  let stand = null; // letzte 'stand'-Nachricht vom Server (zustand, spieler, status, gewinner, zugHistorie, verbunden)
  let ausgewaehlt = null;
  let ziele = [];
  let reconnectTimer = null;

  function meineFarbe() {
    if (!stand || !stand.spieler) return null;
    if (stand.spieler.w === MEINE_ROLLE) return 'w';
    if (stand.spieler.b === MEINE_ROLLE) return 'b';
    return null;
  }

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
    ws.onopen = () => {
      ws.send(JSON.stringify({ typ: 'beitreten', rolle: MEINE_ROLLE }));
    };
    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch (e) { return; }
      if (msg.typ !== 'stand') return;
      stand = msg;
      verbindungsStatus = 'verbunden';
      ausgewaehlt = null;
      ziele = [];
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
      ws.onclose = null;
      ws.onmessage = null;
      ws.onerror = null;
      try { ws.close(); } catch (e) { /* egal */ }
      ws = null;
    }
  }

  function starteAnsicht() {
    ersteAnzeige = true;
    stand = null;
    ausgewaehlt = null;
    ziele = [];
    verbinden();
  }

  function visuelleFelder() {
    const farbe = meineFarbe() || 'w';
    const felder = [];
    for (let visRow = 0; visRow < 8; visRow++) {
      for (let visCol = 0; visCol < 8; visCol++) {
        const rank = farbe === 'w' ? 7 - visRow : visRow;
        const file = farbe === 'w' ? visCol : 7 - visCol;
        felder.push(SchachEngine.idx(rank, file));
      }
    }
    return felder;
  }

  function brettHtml() {
    const zustand = stand.zustand;
    const letzterZug = zustand.letzterZug;
    const felderOrient = visuelleFelder();
    const zellen = felderOrient.map((feld) => {
      const rank = SchachEngine.rankOf(feld), file = SchachEngine.fileOf(feld);
      const hell = (rank + file) % 2 === 1;
      const stein = zustand.board[feld];
      let klassen = 'schach-feld ' + (hell ? 'schach-feld-hell' : 'schach-feld-dunkel');
      if (ausgewaehlt === feld) klassen += ' schach-feld-ausgewaehlt';
      if (ziele.some(z => z.nach === feld)) klassen += ' schach-feld-ziel';
      if (letzterZug && (feld === letzterZug.von || feld === letzterZug.nach)) klassen += ' schach-feld-letzter-zug';
      const symbol = stein ? FIGUR_SYMBOL[stein.farbe][stein.typ] : '';
      return `<div class="${klassen}" onclick="SchachOnline.feldGeklickt(${feld})">${symbol}</div>`;
    }).join('');
    const { rang, datei } = koordLeisten(felderOrient);
    return `
      <div class="schach-rahmen">
        <div class="schach-brett-zeile">
          <div class="schach-rang-leiste">${rang}</div>
          <div class="schach-brett">${zellen}</div>
        </div>
        <div class="schach-datei-zeile">
          <div class="schach-rang-spacer"></div>
          <div class="schach-datei-leiste">${datei}</div>
        </div>
      </div>
    `;
  }

  function zeichne() {
    let html;
    if (verbindungsStatus !== 'verbunden' || !stand) {
      html = `
        <div class="back-row"><span class="back-btn" onclick="Schach.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
        <div class="schach-wrap">
          <div class="schach-info">${verbindungsStatus === 'verbindet' ? 'Verbinde mit Papa …' : 'Verbindung verloren – verbinde neu …'}</div>
        </div>
      `;
    } else if (stand.status === 'kein_spiel') {
      html = `
        <div class="back-row"><span class="back-btn" onclick="Schach.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
        <div class="welcome">Online gegen Papa</div>
        <div class="lese-text">${stand.verbunden.papa ? 'Papa ist gerade online! ' : 'Papa ist gerade nicht online, aber du kannst trotzdem starten - er bekommt eine Benachrichtigung. '}Wer startet, spielt Weiß und zieht zuerst.</div>
        <div class="btn-primary" onclick="SchachOnline.starteSpiel()">Neues Spiel starten</div>
      `;
    } else {
      const farbe = meineFarbe();
      let statusHtml = '';
      if (stand.status === 'matt') {
        const gewonnen = stand.gewinner === farbe;
        statusHtml = gewonnen
          ? '<div class="schach-status schach-status-sieg">🏆 Schachmatt! Du hast gewonnen!</div>'
          : '<div class="schach-status schach-status-niederlage">Schachmatt! Papa hat gewonnen.</div>';
      } else if (stand.status === 'patt' || stand.status === 'remis') {
        statusHtml = '<div class="schach-status">Unentschieden.</div>';
      } else if (stand.status === 'aufgegeben') {
        statusHtml = stand.gewinner === farbe
          ? '<div class="schach-status schach-status-sieg">Papa hat aufgegeben – du gewinnst!</div>'
          : '<div class="schach-status schach-status-niederlage">Die Partie wurde aufgegeben.</div>';
      }

      const infoText = stand.status !== 'laeuft'
        ? ''
        : (stand.zustand.amZug === farbe ? 'Du bist am Zug' : 'Papa ist am Zug …') +
          (stand.verbunden.papa ? '' : ' (Papa ist gerade offline, bekommt aber eine Benachrichtigung)');

      html = `
        <div class="back-row"><span class="back-btn" onclick="Schach.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
        <div class="schach-wrap">
          <div class="schach-stufe">Online gegen Papa</div>
          <div class="schach-info">${infoText}</div>
          ${statusHtml}
          ${brettHtml()}
          ${stand.status === 'laeuft'
            ? '<div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);margin-top:16px;" onclick="SchachOnline.aufgeben()">Aufgeben</div>'
            : '<div class="btn-primary" style="margin-top:16px;" onclick="SchachOnline.starteNeueRunde()">Neues Spiel</div>'}
        </div>
      `;
    }

    if (!ersteAnzeige) App.setOnLeaveScreen(() => {});
    App.render(html);
    App.setOnLeaveScreen(trennen);
    ersteAnzeige = false;
  }

  function starteNeueRunde() {
    stand = Object.assign({}, stand, { status: 'kein_spiel' });
    zeichne();
  }

  function starteSpiel() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ typ: 'neues_spiel' }));
  }

  function aufgeben() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ typ: 'aufgeben' }));
  }

  function feldGeklickt(feld) {
    if (!stand || stand.status !== 'laeuft' || !ws || ws.readyState !== WebSocket.OPEN) return;
    const farbe = meineFarbe();
    if (!farbe || stand.zustand.amZug !== farbe) return;
    const stein = stand.zustand.board[feld];

    if (ausgewaehlt !== null) {
      const zug = ziele.find(z => z.nach === feld);
      if (zug) {
        const zustandNachher = SchachEngine.zugAusfuehren(stand.zustand, zug);
        const status = SchachEngine.spielstatus(zustandNachher);
        ws.send(JSON.stringify({ typ: 'zug', von: zug.von, nach: zug.nach, zustandNachher, status }));
        // Optimistisch sofort anzeigen - die Server-Bestaetigung (naechste
        // "stand"-Nachricht) ueberschreibt das gleich wieder, meist unsichtbar schnell.
        stand = Object.assign({}, stand, {
          zustand: zustandNachher,
          status,
          gewinner: status === 'matt' ? farbe : stand.gewinner
        });
        ausgewaehlt = null;
        ziele = [];
        zeichne();
        return;
      }
    }

    if (stein && stein.farbe === farbe) {
      ausgewaehlt = feld;
      ziele = SchachEngine.generiereLegaleZuege(stand.zustand, feld);
    } else {
      ausgewaehlt = null;
      ziele = [];
    }
    zeichne();
  }

  return { starteAnsicht, starteNeueRunde, starteSpiel, aufgeben, feldGeklickt };
})();
