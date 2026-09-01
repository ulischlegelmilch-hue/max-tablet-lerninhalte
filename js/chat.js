// Chat mit Papa (Handy-App) ueber das Max-Tablet-Backend, technisch fast
// identisch zu schach-online.js (WebSocket-Relay, gleicher onLeaveScreen-
// Kniff), aber eigener /ws/chat-Pfad mit eigenem Lebenszyklus - Chat und
// Online-Schach lassen sich unabhaengig voneinander oeffnen/schliessen.
const Chat = (function () {
  const WS_URL = 'wss://max-tablet-api.paceforge-pi.co.uk/ws/chat';
  const MEINE_ROLLE = 'max';
  const RECONNECT_MS = 3000;

  let ws = null;
  let aktiv = false;
  let ersteAnzeige = true;
  let verbindungsStatus = 'verbindet'; // 'verbindet' | 'verbunden' | 'getrennt'
  let nachrichten = [];
  let verbunden = { papa: false, max: false };
  let reconnectTimer = null;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    ws.onopen = () => ws.send(JSON.stringify({ typ: 'beitreten', rolle: MEINE_ROLLE }));
    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch (e) { return; }
      if (msg.typ !== 'stand') return;
      nachrichten = msg.nachrichten;
      verbunden = msg.verbunden;
      verbindungsStatus = 'verbunden';
      // Chat ist gerade offen -> alles bisher von Papa Geschickte gilt als
      // gesehen (loescht das Ungelesen-Badge im Hauptmenue, siehe app.js
      // gotoHome/Storage.getLetzteGeseheneChatId).
      const hoechstePapaId = nachrichten.filter(n => n.von === 'papa').reduce((m, n) => Math.max(m, n.id), 0);
      if (hoechstePapaId > 0) Storage.setLetzteGeseheneChatId(hoechstePapaId);
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
    nachrichten = [];
    verbinden();
  }

  function nachrichtenHtml() {
    if (!nachrichten.length) return '<div class="lese-text">Noch keine Nachrichten – schreib Papa doch mal!</div>';
    return nachrichten.map(n => `
      <div class="chat-blase ${n.von === MEINE_ROLLE ? 'chat-blase-eigene' : 'chat-blase-fremd'}">
        <div>${escapeHtml(n.text)}</div>
        <div class="chat-blase-zeit">${new Date(n.ts).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</div>
      </div>
    `).join('');
  }

  function zeichne() {
    // Aktuell eingetippten, noch nicht gesendeten Text ueber den Re-Render
    // hinweg retten - sonst wuerde eine eingehende Nachricht von Papa (loest
    // ein Update aus) alles loeschen, was Max gerade tippt.
    let bisherigerText = '';
    try { bisherigerText = document.getElementById('chat-eingabe').value; } catch (e) { /* noch nicht vorhanden */ }

    const info = verbindungsStatus !== 'verbunden'
      ? (verbindungsStatus === 'verbindet' ? 'Verbinde mit Papa …' : 'Verbindung verloren – verbinde neu …')
      : (verbunden.papa ? 'Papa ist gerade online' : 'Papa ist gerade nicht online, bekommt deine Nachricht aber trotzdem');

    // Eingabezeile bewusst OBEN, nicht unten unter der Nachrichtenliste: die
    // Bildschirmtastatur der Kiosk-WebView verdeckt den unteren Bereich, ohne
    // dass die Seite ihre Hoehe zuverlaessig anpasst - oben ist sie garantiert
    // nie im Weg, egal wie sich die Tastatur verhaelt.
    const html = `
      <div class="back-row"><span class="back-btn" onclick="App.gotoHome()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Chat mit Papa</div>
      <div class="lese-text">${info}</div>
      <div class="chat-eingabe-zeile">
        <input type="text" id="chat-eingabe" class="chat-eingabe" placeholder="Nachricht schreiben …"
               value="${escapeHtml(bisherigerText)}"
               onkeydown="if(event.key==='Enter'){Chat.sendeNachricht();}"
               onfocus="this.scrollIntoView({block:'center'})">
        <button class="chat-senden-btn" onclick="Chat.sendeNachricht()">Senden</button>
      </div>
      <div class="chat-liste" id="chat-liste">${nachrichtenHtml()}</div>
    `;

    if (!ersteAnzeige) App.setOnLeaveScreen(() => {});
    App.render(html);
    App.setOnLeaveScreen(trennen);
    ersteAnzeige = false;

    // Ans Ende der Liste scrollen, damit die neueste Nachricht sichtbar ist.
    const liste = document.getElementById('chat-liste');
    if (liste) liste.scrollTop = liste.scrollHeight;
  }

  function sendeNachricht() {
    const input = document.getElementById('chat-eingabe');
    if (!input) return;
    const text = input.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ typ: 'nachricht', text }));
    input.value = '';
  }

  return { starteAnsicht, sendeNachricht };
})();
