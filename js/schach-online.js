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
  const WS_URL = 'wss://max-tablet-api.paceforge-pi.co.uk/ws/schach';
  const MEINE_ROLLE = 'max';
  const RECONNECT_MS = 3000;

  const FIGUR_SYMBOL = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };
  const DATEIEN = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const FIGURWERT = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  function feldName(feld) {
    return DATEIEN[SchachEngine.fileOf(feld)] + (SchachEngine.rankOf(feld) + 1);
  }

  /** "schach" (Schach, aber noch kein Matt) ist ein eigener status-Wert von
   *  SchachEngine.spielstatus() - die Partie LAEUFT dabei ganz normal weiter,
   *  nur eben mit einer Schach-Anzeige. Frueher wurde hier nur auf genau
   *  status==='laeuft' geprueft, wodurch die Partie beim naechsten Schachgebot
   *  faelschlich wie beendet behandelt wurde: kein Zug mehr moeglich, Aktions-
   *  leiste zeigte "Neues Spiel" statt "Aufgeben" (13./14.08.2026 von Uli
   *  gemeldet: "war im Schach, konnte nicht mehr ziehen, Spiel auf einmal
   *  beendet"). schach.js (gegen den Computer) hat das schon immer richtig
   *  gemacht (`status !== 'laeuft' && status !== 'schach'`) - dieser Online-
   *  Modus hatte das nie nachgezogen. */
  function spielLaeuftNoch(status) {
    return status === 'laeuft' || status === 'schach';
  }

  function findeKoenigFeld(zust, farbe) {
    for (let i = 0; i < 64; i++) {
      const s = zust.board[i];
      if (s && s.typ === 'k' && s.farbe === farbe) return i;
    }
    return null;
  }

  /** Geschlagene Figuren + Materialvorteil aus der aktuellen Brettstellung
   *  (gleiche Logik wie in schach.js - Module teilen sich hier bewusst keinen
   *  Code, siehe Projektkonvention: jede Datei ist ein eigenstaendiges IIFE). */
  function materialUebersicht(zust) {
    const vorhanden = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
    for (const stein of zust.board) {
      if (stein && stein.typ !== 'k') vorhanden[stein.farbe][stein.typ]++;
    }
    const GRUNDANZAHL = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const geschlagenVon = { w: [], b: [] };
    let wertW = 0, wertB = 0;
    for (const typ of ['q', 'r', 'b', 'n', 'p']) {
      const fehlendSchwarz = GRUNDANZAHL[typ] - vorhanden.b[typ];
      for (let i = 0; i < fehlendSchwarz; i++) geschlagenVon.w.push(typ);
      const fehlendWeiss = GRUNDANZAHL[typ] - vorhanden.w[typ];
      for (let i = 0; i < fehlendWeiss; i++) geschlagenVon.b.push(typ);
      wertW += vorhanden.w[typ] * FIGURWERT[typ];
      wertB += vorhanden.b[typ] * FIGURWERT[typ];
    }
    return { geschlagenVon, vorteil: wertW - wertB };
  }

  function geschlagenHtml(figuren, farbeDerFiguren) {
    return figuren.map(t => FIGUR_SYMBOL[farbeDerFiguren][t]).join('');
  }

  /** Zugliste aus stand.zugHistorie (Server schickt nur von/nach/farbe, keine
   *  Figurentypen - daher einfache Koordinatennotation statt Kurzalgebraisch). */
  function zuglisteHtml(historie) {
    if (!historie || historie.length === 0) return '<div class="schach-zugliste-leer">Noch keine Züge.</div>';
    let rows = '';
    for (let i = 0; i < historie.length; i += 2) {
      const nr = i / 2 + 1;
      const weiss = historie[i] ? `${feldName(historie[i].von)}-${feldName(historie[i].nach)}` : '';
      const schwarz = historie[i + 1] ? `${feldName(historie[i + 1].von)}-${feldName(historie[i + 1].nach)}` : '';
      rows += `<div class="schach-zugliste-zeile"><span class="schach-zugliste-nr">${nr}.</span><span class="schach-zugliste-zug">${weiss}</span><span class="schach-zugliste-zug">${schwarz}</span></div>`;
    }
    return rows;
  }

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
    const schachKoenigFeld = stand.status === 'schach' || stand.status === 'matt'
      ? findeKoenigFeld(zustand, zustand.amZug) : null;
    const felderOrient = visuelleFelder();
    const zellen = felderOrient.map((feld) => {
      const rank = SchachEngine.rankOf(feld), file = SchachEngine.fileOf(feld);
      const hell = (rank + file) % 2 === 1;
      const stein = zustand.board[feld];
      let klassen = 'schach-feld ' + (hell ? 'schach-feld-hell' : 'schach-feld-dunkel');
      if (ausgewaehlt === feld) klassen += ' schach-feld-ausgewaehlt';
      if (ziele.some(z => z.nach === feld)) klassen += stein ? ' schach-feld-ziel-schlag' : ' schach-feld-ziel';
      if (feld === schachKoenigFeld) klassen += ' schach-feld-schach';
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
      } else if (stand.status === 'schach') {
        statusHtml = '<div class="schach-status schach-status-schach">Schach!</div>';
      }

      const infoText = !spielLaeuftNoch(stand.status)
        ? ''
        : (stand.zustand.amZug === farbe ? 'Du bist am Zug' : 'Papa ist am Zug …') +
          (stand.verbunden.papa ? '' : ' (Papa ist gerade offline, bekommt aber eine Benachrichtigung)');

      const gegnerFarbe = farbe === 'w' ? 'b' : 'w';
      const { geschlagenVon, vorteil } = materialUebersicht(stand.zustand);
      const spielerVorteil = farbe === 'w' ? vorteil : -vorteil;
      const spielerGeschlagenHtml = geschlagenHtml(geschlagenVon[farbe], gegnerFarbe);
      const gegnerGeschlagenHtml = geschlagenHtml(geschlagenVon[gegnerFarbe], farbe);

      html = `
        <div class="back-row"><span class="back-btn" onclick="Schach.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
        <div class="schach-wrap">
          <div class="schach-stufe">Online gegen Papa</div>
          <div class="schach-info">${infoText}</div>
          ${statusHtml}
          <div class="schach-spieler-leiste">
            <span class="schach-spieler-name">📱 Papa</span>
            <span class="schach-geschlagen">${gegnerGeschlagenHtml}${spielerVorteil < 0 ? `<span class="schach-materialvorteil">+${-spielerVorteil}</span>` : ''}</span>
          </div>
          ${brettHtml()}
          <div class="schach-spieler-leiste">
            <span class="schach-spieler-name">🙂 Du</span>
            <span class="schach-geschlagen">${spielerGeschlagenHtml}${spielerVorteil > 0 ? `<span class="schach-materialvorteil">+${spielerVorteil}</span>` : ''}</span>
          </div>
          <div class="schach-aktionsleiste">
            ${spielLaeuftNoch(stand.status)
              ? '<span class="schach-aktion-btn schach-aktion-btn-sekundaer" onclick="SchachOnline.aufgeben()">Aufgeben</span>'
              : '<span class="schach-aktion-btn" onclick="SchachOnline.starteNeueRunde()">Neues Spiel</span>'}
          </div>
          <div class="schach-zugliste">${zuglisteHtml(stand.zugHistorie)}</div>
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
    if (!stand || !spielLaeuftNoch(stand.status) || !ws || ws.readyState !== WebSocket.OPEN) return;
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
