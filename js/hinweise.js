// Hinweise auf dem Tablet (19.10.2026): Popups fuer neue Nachricht / Spieleinladung /
// Akku fast leer sowie ein kleines Chat-Fenster, das sich ueber JEDEN Bildschirm legt
// (auch waehrend eines Spiels), geoeffnet ueber den Chat-Knopf in der Kopfzeile.
const Hinweise = (function () {
  const WS_URL = 'wss://max-tablet-api.paceforge-pi.co.uk/ws/chat';
  const AKKU_SCHWELLE = 10; // Prozent
  const AKKU_POPUP_ABSTAND_MS = 15 * 60 * 1000;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---- Popup ----
  let popupEl = null;
  function schliessePopup() {
    if (popupEl && popupEl.parentNode) popupEl.parentNode.removeChild(popupEl);
    popupEl = null;
  }
  /** knoepfe: [{ text, primaer, aktion }] - jeder Knopf schliesst das Popup und fuehrt danach aktion aus. */
  function zeigePopup(icon, titel, text, knoepfe, art) {
    schliessePopup();
    const el = document.createElement('div');
    el.id = 'hinweis-popup';
    el.dataset.art = art || '';
    el.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:10000;background:rgba(0,0,0,.45);' +
      'display:flex;align-items:center;justify-content:center;padding:20px;';
    const karte = document.createElement('div');
    karte.style.cssText = 'background:#fff;color:#222;border-radius:20px;padding:24px 26px;max-width:480px;width:100%;' +
      'text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.35);font-family:inherit;';
    karte.innerHTML = `<div style="font-size:44px;line-height:1.1;">${icon}</div>
      <div style="font-size:21px;font-weight:700;margin:8px 0 6px;">${esc(titel)}</div>
      <div style="font-size:17px;line-height:1.4;margin-bottom:16px;word-break:break-word;">${esc(text)}</div>`;
    const reihe = document.createElement('div');
    reihe.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;';
    (knoepfe || [{ text: 'OK', primaer: true }]).forEach(k => {
      const b = document.createElement('div');
      b.textContent = k.text;
      b.style.cssText = 'padding:12px 22px;border-radius:12px;font-size:17px;font-weight:700;cursor:pointer;' +
        (k.primaer ? 'background:#2f6f4f;color:#fff;' : 'background:#e8e6e0;color:#222;');
      b.onclick = () => { schliessePopup(); if (k.aktion) k.aktion(); };
      reihe.appendChild(b);
    });
    karte.appendChild(reihe);
    el.appendChild(karte);
    document.body.appendChild(el);
    popupEl = el;
  }

  function nachrichtPopup(text) {
    // Chat-Fenster oder voller Chat ist schon offen: dort sieht Max die Nachricht ja direkt
    if (offen || document.getElementById('chat-eingabe')) return;
    zeigePopup('💬', 'Papa schreibt', text || 'Du hast eine neue Nachricht.', [
      { text: 'Antworten', primaer: true, aktion: () => chatOeffnen() },
      { text: 'OK' }
    ], 'nachricht');
  }

  function spielPopup(name) {
    zeigePopup('🎮', 'Papa möchte spielen', 'Papa möchte ' + name + ' spielen!', [{ text: 'OK', primaer: true }], 'spiel');
  }

  // ---- Akku fast leer ----
  let letztesAkkuPopup = 0;
  function akkuProzent() {
    try { if (typeof AndroidBridge !== 'undefined' && AndroidBridge.getBatteryPercent) return AndroidBridge.getBatteryPercent(); } catch (e) { /* aeltere APK */ }
    return -1;
  }
  function laedt() {
    try { if (typeof AndroidBridge !== 'undefined' && AndroidBridge.isCharging) return !!AndroidBridge.isCharging(); } catch (e) { /* aeltere APK */ }
    return false;
  }
  function spieleAkkuton() {
    try { if (typeof AndroidBridge !== 'undefined' && AndroidBridge.playAkkuSound) { AndroidBridge.playAkkuSound(); return; } } catch (e) { /* aeltere APK */ }
    try { const a = new Audio('sounds/akku.wav'); a.volume = 0.4; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* egal */ }
  }
  /** grund 'aufwachen': Ton + Popup bei JEDEM Einschalten, solange Akku <= 10 % und nicht am Strom.
   *  grund 'timer': nur alle 15 Minuten (laeuft waehrend Max das Tablet benutzt). */
  function akkuPruefen(grund) {
    const p = akkuProzent();
    if (p < 0 || p > AKKU_SCHWELLE || laedt()) {
      if (popupEl && popupEl.dataset.art === 'akku') schliessePopup(); // Ladegeraet dran / wieder genug Akku
      return;
    }
    const jetzt = Date.now();
    if (grund !== 'aufwachen' && jetzt - letztesAkkuPopup < AKKU_POPUP_ABSTAND_MS) return;
    letztesAkkuPopup = jetzt;
    spieleAkkuton();
    zeigePopup('🔋', 'Akku fast leer', `Nur noch ${p} %. Bitte häng das Tablet an den Strom!`, [{ text: 'Mach ich', primaer: true }], 'akku');
  }
  setInterval(() => akkuPruefen('timer'), 60 * 1000);

  // Haenger-Waechter: laeuft die Oberflaeche sichtbar, sollte dieser Takt jede Sekunde ticken. Steht
  // sie > 8 s still (blockiert), geht das ins Diagnose-Protokoll (zusammen mit den Wach-/Schlafzeilen
  // des Launchers sieht man dann, ob das Tablet nur schlief oder wirklich hing).
  let letzterTick = Date.now();
  setInterval(() => {
    const jetzt = Date.now(), luecke = jetzt - letzterTick;
    letzterTick = jetzt;
    if (luecke > 8000 && document.visibilityState !== 'hidden') {
      try { if (typeof AndroidBridge !== 'undefined' && AndroidBridge.logDiagnose) AndroidBridge.logDiagnose('Oberflaeche stand ' + Math.round(luecke / 1000) + ' s still (Haenger oder Schlaf)'); } catch (e) { /* optional */ }
    }
  }, 1000);

  // ---- Chat-Fenster ueber jedem Bildschirm ----
  let ws = null, nachrichten = [], verbunden = { papa: false }, status = 'verbindet', chatEl = null, reconnect = null, offen = false;

  function chatNachrichtenHtml() {
    const letzte = nachrichten.slice(-8);
    if (!letzte.length) return '<div style="color:#666;">Noch keine Nachrichten – schreib Papa doch mal!</div>';
    return letzte.map(n => `<div style="margin:6px 0;display:flex;justify-content:${n.von === 'max' ? 'flex-end' : 'flex-start'};">
      <div style="max-width:80%;padding:8px 12px;border-radius:14px;background:${n.von === 'max' ? '#d8efe2' : '#eceae4'};font-size:16px;word-break:break-word;">${esc(n.text)}
      <div style="font-size:11px;color:#777;margin-top:2px;">${new Date(n.ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div></div></div>`).join('');
  }

  function chatZeichne() {
    if (!chatEl) return;
    const feld = document.getElementById('hinweis-chat-eingabe');
    const bisher = feld ? feld.value : '';
    const info = status !== 'verbunden' ? 'Verbinde mit Papa …' : (verbunden.papa ? 'Papa ist gerade online' : 'Papa ist gerade nicht online, bekommt deine Nachricht aber trotzdem');
    chatEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="flex:1;font-weight:700;font-size:17px;">💬 Chat mit Papa</div>
        <div id="hinweis-chat-zu" style="padding:6px 14px;border-radius:10px;background:#e8e6e0;cursor:pointer;font-weight:700;">Schließen</div>
      </div>
      <div style="font-size:13px;color:#666;margin-bottom:8px;">${info}</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <input id="hinweis-chat-eingabe" type="text" placeholder="Nachricht schreiben …" value="${esc(bisher)}"
          style="flex:1;font-size:17px;padding:10px;border-radius:10px;border:1px solid #bbb;min-width:0;">
        <div id="hinweis-chat-senden" style="padding:10px 16px;border-radius:10px;background:#2f6f4f;color:#fff;font-weight:700;cursor:pointer;">Senden</div>
      </div>
      <div id="hinweis-chat-liste" style="max-height:38vh;overflow-y:auto;">${chatNachrichtenHtml()}</div>`;
    document.getElementById('hinweis-chat-zu').onclick = chatSchliessen;
    document.getElementById('hinweis-chat-senden').onclick = chatSenden;
    const neuesFeld = document.getElementById('hinweis-chat-eingabe');
    neuesFeld.onkeydown = e => { if (e.key === 'Enter') chatSenden(); };
    if (bisher) { try { neuesFeld.focus(); neuesFeld.setSelectionRange(bisher.length, bisher.length); } catch (e) { /* egal */ } }
    const liste = document.getElementById('hinweis-chat-liste');
    if (liste) liste.scrollTop = liste.scrollHeight;
  }

  function chatVerbinden() {
    status = 'verbindet';
    try { ws = new WebSocket(WS_URL); } catch (e) { status = 'getrennt'; chatZeichne(); reconnect = setTimeout(() => { if (offen) chatVerbinden(); }, 3000); return; }
    ws.onopen = () => ws.send(JSON.stringify({ typ: 'beitreten', rolle: 'max' }));
    ws.onmessage = ev => {
      let msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.typ !== 'stand') return;
      nachrichten = msg.nachrichten; verbunden = msg.verbunden; status = 'verbunden';
      const papa = nachrichten.filter(n => n.von === 'papa');
      const ts = papa.reduce((m, n) => Math.max(m, n.ts || 0), 0);
      const id = papa.reduce((m, n) => Math.max(m, n.id || 0), 0);
      if (ts > 0) Storage.setLetzteGeseheneChatTs(ts);
      if (id > 0) Storage.setLetzteGeseheneChatId(id);
      const nb = document.getElementById('neu-banner');
      if (nb && /Papa schreibt|Nachricht/.test(nb.textContent)) nb.style.display = 'none';
      badgeAktualisieren();
      chatZeichne();
    };
    ws.onclose = () => { ws = null; if (!offen) return; status = 'getrennt'; chatZeichne(); reconnect = setTimeout(() => { if (offen) chatVerbinden(); }, 3000); };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* egal */ } };
  }

  function chatOeffnen() {
    // Ist der volle Chat-Bildschirm schon offen, dort einfach ins Feld springen
    const voll = document.getElementById('chat-eingabe');
    if (voll) { voll.focus(); return; }
    if (offen) return;
    offen = true;
    schliessePopup();
    chatEl = document.createElement('div');
    chatEl.id = 'hinweis-chat';
    chatEl.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:64px;width:min(560px,94vw);z-index:9998;' +
      'background:#fff;color:#222;border-radius:16px;padding:14px 16px;box-shadow:0 8px 30px rgba(0,0,0,.35);';
    document.body.appendChild(chatEl);
    nachrichten = [];
    chatZeichne();
    chatVerbinden();
    setTimeout(() => { const f = document.getElementById('hinweis-chat-eingabe'); if (f) f.focus(); }, 100);
  }

  function chatSchliessen() {
    offen = false;
    if (reconnect) { clearTimeout(reconnect); reconnect = null; }
    if (ws) { ws.onclose = null; ws.onmessage = null; ws.onerror = null; try { ws.close(); } catch (e) { /* egal */ } ws = null; }
    if (chatEl && chatEl.parentNode) chatEl.parentNode.removeChild(chatEl);
    chatEl = null;
  }

  function chatSenden() {
    const f = document.getElementById('hinweis-chat-eingabe');
    if (!f) return;
    const text = f.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ typ: 'nachricht', text }));
    f.value = '';
  }

  /** Roter Punkt am Chat-Knopf in der Kopfzeile, solange eine Nachricht von Papa ungelesen ist. */
  function badgeAktualisieren() {
    try {
      const dot = document.getElementById('topbar-chat-dot');
      if (dot) dot.style.display = Storage.chatUngelesen() ? 'block' : 'none';
    } catch (e) { /* Anzeige ist optional */ }
  }

  return { nachrichtPopup, spielPopup, akkuPruefen, chatOeffnen, chatSchliessen, badgeAktualisieren, zeigePopup, schliessePopup };
})();
