// Fernsteuerung vom Handy aus: pollt das kleine Max-Tablet-Backend (siehe
// backend/server.js) periodisch per fetch() direkt aus der WebView - bewusst
// KEINE native Kotlin-Aenderung noetig, das Backend erlaubt CORS von ueberall
// (Access-Control-Allow-Origin: *), genau wie beim Wichtel-Max-Backend schon
// erprobt. Scheitert der Abruf (kein Internet, Backend schlaeft/Cold-Start,
// URL noch nicht gesetzt), bleibt einfach der zuletzt bekannte Stand erhalten -
// nichts an der App haengt vom Erfolg dieses Polls ab.
const FernSync = (function () {
  const BACKEND_URL = 'https://max-tablet-backend.onrender.com';
  const POLL_INTERVAL_MS = 5 * 60 * 1000;
  const FETCH_TIMEOUT_MS = 10000;

  async function fetchMitTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
    } finally {
      clearTimeout(timer);
    }
  }

  // Rendert bewusst NICHT sofort neu, wenn der Poll fertig ist - Max koennte
  // gerade mitten in einem Quiz/einer Schachpartie sein, ein erzwungener
  // Ruecksprung zum Startbildschirm waere sehr stoerend. Storage.setFernstand
  // reicht: App.gotoHome() liest den Stand bei jedem Aufruf frisch aus Storage,
  // die Zusatzaufgaben-Karte zeigt neue Eintraege also automatisch beim naechsten
  // ganz normalen Rueckkehren zum Startbildschirm.
  async function poll() {
    if (!BACKEND_URL) return;
    try {
      const r = await fetchMitTimeout(BACKEND_URL + '/api/state');
      if (!r.ok) return;
      const stand = await r.json();
      Storage.setFernstand(stand.regeln, stand.zusatzaufgaben);
    } catch (e) {
      // Kein Internet / Backend nicht erreichbar - naechster Versuch in POLL_INTERVAL_MS.
    }
  }

  /** Zusatzaufgaben-Karte fuers Startbild - leerer String, wenn nichts da ist,
   *  damit App.gotoHome() sie einfach immer mit einbauen kann. */
  function zusatzaufgabenHtml() {
    const aufgaben = Storage.getFernZusatzaufgaben();
    if (!aufgaben.length) return '';
    const zeilenHtml = aufgaben.map(a => `
      <div class="fernaufgabe-zeile${a.erledigt ? ' fernaufgabe-erledigt' : ''}">
        <span>${a.erledigt ? '✅' : '⬜'} ${a.text}</span>
        ${a.erledigt ? '' : `<span class="btn-primary" style="padding:6px 14px;font-size:13px;" onclick="FernSync.meldeErledigt(${a.id})">Erledigt</span>`}
      </div>
    `).join('');
    return `
      <div class="fernaufgaben-banner">
        <div class="fernaufgaben-titel">Von Papa</div>
        ${zeilenHtml}
      </div>
    `;
  }

  function meldeErledigt(id) {
    Storage.markiereFernZusatzaufgabeLokalErledigt(id);
    App.gotoHome();
    if (!BACKEND_URL) return;
    fetchMitTimeout(BACKEND_URL + '/api/zusatzaufgabe/' + id + '/done', { method: 'POST' }).catch(() => {
      // Kein Internet gerade - der naechste erfolgreiche Poll gleicht das wieder ab.
    });
  }

  function init() {
    poll();
    setInterval(poll, POLL_INTERVAL_MS);
  }

  /** Meldet ein abgeschlossenes Uebungs-/Quiz-Set an Papas Backend - loest dort
   *  sofort eine Push-Benachrichtigung aus UND landet in der Auswertung. Fire-
   *  and-forget wie meldeErledigt: schlaegt der Versuch fehl (kein Internet),
   *  bleibt einfach keine Meldung dieses Mals aus, nichts an der App haengt
   *  davon ab. titel/zusammenfassung sind schon fertig lesbarer Text (z.B.
   *  "Mathe-Tagesaufgabe" / "8 von 10 richtig"), damit das Backend keine
   *  Detailkenntnis der einzelnen Uebungsarten braucht. */
  function meldeLernsetErledigt(titel, zusammenfassung, sterne) {
    if (!BACKEND_URL) return;
    fetchMitTimeout(BACKEND_URL + '/api/lernset-erledigt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titel, zusammenfassung, sterne })
    }).catch(() => {});
  }

  return { init, poll, zusatzaufgabenHtml, meldeErledigt, meldeLernsetErledigt };
})();
