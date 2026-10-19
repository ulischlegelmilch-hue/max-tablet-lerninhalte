// Fernsteuerung vom Handy aus: pollt das kleine Max-Tablet-Backend (siehe
// backend/server.js) periodisch per fetch() direkt aus der WebView - bewusst
// KEINE native Kotlin-Aenderung noetig, das Backend erlaubt CORS von ueberall
// (Access-Control-Allow-Origin: *), genau wie beim Wichtel-Max-Backend schon
// erprobt. Scheitert der Abruf (kein Internet, Backend schlaeft/Cold-Start,
// URL noch nicht gesetzt), bleibt einfach der zuletzt bekannte Stand erhalten -
// nichts an der App haengt vom Erfolg dieses Polls ab.
const FernSync = (function () {
  const BACKEND_URL = 'https://max-tablet-api.paceforge-pi.co.uk';
  // War 5 Minuten - auf 1 Minute verkuerzt (13.08.2026), seit Chat-Nachrichten
  // von Papa hierueber erkannt werden (Badge+Ton, siehe pruefeNeueChatNachricht):
  // echte Push-Benachrichtigungen sind auf diesem Geraet nicht moeglich (Google
  // Play Services bewusst entfernt, FCM braucht das zwingend), der Poll ist
  // deshalb der EINZIGE Weg, wie Max eine neue Nachricht ueberhaupt bemerkt -
  // 1 Minute wirkt fast wie Echtzeit, ohne staendig Netzwerk/Akku zu belasten.
  const POLL_INTERVAL_MS = 30 * 1000;
  const FETCH_TIMEOUT_MS = 10000;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

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
  // Geraete-Info fuer Papas Dashboard ("Tablet zuletzt online, App-/Inhalts-Version,
  // ungelesene Nachricht") - hilft zu sehen, ob das Tablet wirklich die neue Version hat
  // und nach dem Aufwachen den Server erreicht.
  function geraeteInfoQuery() {
    try {
      const app = typeof AndroidBridge !== 'undefined' && AndroidBridge.getAppVersion ? AndroidBridge.getAppVersion() : '';
      const inhalt = typeof AndroidBridge !== 'undefined' && AndroidBridge.getContentVersion ? AndroidBridge.getContentVersion() : '';
      const letzte = Storage.getLetzteChatVonPapa();
      const ungelesen = Storage.chatUngelesen();
      return '?tablet=1&app=' + encodeURIComponent(app) + '&inhalt=' + encodeURIComponent(inhalt) + '&ungelesen=' + (ungelesen ? 1 : 0);
    } catch (e) { return ''; }
  }

  // Ereignisprotokoll des Launchers (Neustarts, Abstuerze, WebView-Abbruch, Wach-/Schlafwechsel)
  // an den Server geben - dort sieht Papa, WANN das Tablet haengt/neu startet. Bei Erfolg geleert.
  async function meldeDiagnose() {
    try {
      if (typeof AndroidBridge === 'undefined' || !AndroidBridge.getDiagnose) return;
      const text = AndroidBridge.getDiagnose();
      if (!text) return;
      const r = await fetchMitTimeout(BACKEND_URL + '/api/tablet-diagnose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zeilen: text.split('\n').slice(-60) })
      });
      if (r.ok) AndroidBridge.loescheDiagnose();
    } catch (e) { /* naechster Poll */ }
  }

  async function pollEinmal() {
    if (!BACKEND_URL) return true;
    try {
      const r = await fetchMitTimeout(BACKEND_URL + '/api/state' + geraeteInfoQuery());
      if (!r.ok) return false;
      const stand = await r.json();
      const vorherIds = new Set(Storage.getFernZusatzaufgaben().map(a => a.id));
      const hatteStand = vorherIds.size > 0;
      Storage.setFernstand(stand.regeln, stand.zusatzaufgaben);
      pruefeNeueChatNachricht(stand.letzteChatVonPapa);
      pruefeSpielAnfrage(stand.spielAnfrage);
      const neueAufgaben = (stand.zusatzaufgaben || []).filter(a => !a.erledigt && !vorherIds.has(a.id));
      if (hatteStand && neueAufgaben.length) {
        spieleBenachrichtigungston();
        zeigeBanner('📋 Neue Aufgabe von Papa!', () => App.gotoHome(), 30000);
        try { Hinweise.zeigePopup('📋', 'Neue Aufgabe von Papa', neueAufgaben[0].text || '', [{ text: 'OK', primaer: true }]); } catch (e) { /* optional */ }
      }
      // Internet+Backend sind gerade nachweislich erreichbar - guter Moment,
      // um evtl. liegengebliebene Lernset-Meldungen nachzureichen (siehe
      // sendeOffeneLernsetMeldungen).
      sendeOffeneLernsetMeldungen();
      meldeDiagnose();
      // Storage hat sich gerade veraendert (Zusatzaufgaben und/oder Chat-
      // Ungelesen-Status) - falls Max GERADE auf dem Startbildschirm sitzt,
      // muss der neu gerendert werden, sonst bleibt z.B. das Chat-Badge trotz
      // korrekt aktualisierter Daten unsichtbar, bis er zufaellig woanders
      // hin- und wieder zurueck navigiert (13.08.2026 per Live-Test am
      // Geraet gefunden: Storage war korrekt, nur die DOM blieb stehen).
      // Sitzt Max GERADE WOANDERS (z.B. mitten in einer Aufgabenfolge), tut
      // aktualisiereHomeFallsAktiv() bewusst NICHTS - kein erzwungener
      // Ruecksprung zum Startbildschirm.
      App.aktualisiereHomeFallsAktiv();
      aktualisiereChatBanner(); // NACH dem Neu-Rendern: auf der Startseite genuegt die Karte
      try { Hinweise.badgeAktualisieren(); } catch (e) { /* optional */ }
      return true;
    } catch (e) {
      // Kein Internet / Backend nicht erreichbar - naechster Versuch in POLL_INTERVAL_MS.
      return false;
    }
  }

  // Direkt nach dem Einschalten/Aufwecken ist das WLAN oft noch nicht wieder
  // verbunden - ein einzelner Poll scheitert dann und der naechste kaeme erst
  // nach POLL_INTERVAL_MS. Deshalb bei Fehlschlag kurz hintereinander
  // nachfassen (3 s, 10 s, 25 s, 60 s), damit neue Nachrichten/Aufgaben gleich
  // erscheinen, sobald das Netz da ist. Laufende Wiederholungsketten werden
  // nicht verdoppelt.
  // Nach dem Einschalten dauert das WLAN manchmal laenger: erst schnelle Versuche, dann
  // alle 15 s bis ca. 10 Minuten (danach uebernimmt der normale 30-s-Poll).
  const WIEDERHOLUNGEN_MS = [3000, 5000, 10000, 15000].concat(Array(38).fill(15000));
  let pollLaeuft = false;
  async function poll() {
    if (pollLaeuft) return;
    pollLaeuft = true;
    try {
      for (let i = 0; i <= WIEDERHOLUNGEN_MS.length; i++) {
        if (await pollEinmal()) return;
        if (i < WIEDERHOLUNGEN_MS.length) await new Promise(res => setTimeout(res, WIEDERHOLUNGEN_MS[i]));
      }
    } finally {
      pollLaeuft = false;
    }
  }

  // ---- Sichtbares Banner (11.10.2026): neue Nachricht/Aufgabe von Papa soll
  // nach dem Einschalten sofort auffallen, auf JEDEM Bildschirm (nicht nur als
  // Badge auf der Startseite). Tippen oeffnet Chat bzw. Startseite. ----
  let bannerTimer = null;
  function zeigeBanner(text, beiTipp, ausblendenNachMs) {
    let el = document.getElementById('neu-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'neu-banner';
      el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:64px;z-index:9999;' +
        'background:#ffb300;color:#222;font-weight:700;font-size:18px;padding:12px 22px;border-radius:14px;' +
        'box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer;max-width:90%;text-align:center;';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.display = '';
    el.onclick = () => { verstecke(); beiTipp(); };
    clearTimeout(bannerTimer);
    if (ausblendenNachMs) bannerTimer = setTimeout(verstecke, ausblendenNachMs);
  }
  function verstecke() {
    const el = document.getElementById('neu-banner');
    if (el) el.style.display = 'none';
    clearTimeout(bannerTimer);
  }

  /** Banner "Neue Nachricht von Papa" solange ungelesen - verschwindet, sobald
   *  Max den Chat geoeffnet hat (Storage.setLetzteGeseheneChatId in chat.js). */
  function aktualisiereChatBanner() {
    try { aktualisiereChatBannerOhneFang(); } catch (e) { /* Anzeige darf den Poll nie abbrechen */ }
  }

  function aktualisiereChatBannerOhneFang() {
    const letzte = Storage.getLetzteChatVonPapa();
    const ungelesen = Storage.chatUngelesen();
    // Auf der Startseite zeigt die grosse Karte "Papa hat dir geschrieben!" (app.js
    // chatHinweisHtml) die Nachricht schon - dann kein zusaetzliches Banner.
    if (ungelesen && document.querySelector('.chat-hinweis')) { verstecke(); return; }
    if (ungelesen) zeigeBanner('💬 Papa schreibt' + (letzte.text ? ': ' + letzte.text.slice(0, 60) : '!'), () => Chat.starteAnsicht(), 0);
    else if (document.getElementById('neu-banner') && /Papa schreibt|Nachricht/.test(document.getElementById('neu-banner').textContent)) verstecke();
  }

  /** Ungelesen-Badge (siehe app.js gotoHome) + Ton als Absicherung UNABHAENGIG
   *  von der nativen Push-Zustellung (Max ist z.B. gerade in Mathe statt im
   *  Chat, oder die Push kam aus irgendeinem Grund nicht durch) - erkennt eine
   *  neue Papa-Nachricht am naechsten Poll (bis zu 1 Min. Verzoegerung, siehe
   *  POLL_INTERVAL_MS) und spielt den Ton NUR einmal pro tatsaechlich neuer
   *  Nachricht (Vergleich gegen den zuletzt per Poll bekannten Stand, nicht
   *  gegen "gesehen" - sonst wuerde bei jedem Poll erneut getoent, solange
   *  Max die Nachricht noch nicht geoeffnet hat). Beim allerersten Poll nach
   *  Installation/Reset (kein bekannter Vorstand) bewusst KEIN Ton, sonst
   *  wuerde jede App-Neuinstallation fuer eine laengst alte Nachricht toenen. */
  function pruefeNeueChatNachricht(letzte) {
    if (!letzte) return;
    const bekannt = Storage.getLetzteChatVonPapa();
    const istNeu = bekannt && (letzte.ts || 0) > (bekannt.ts || 0);
    Storage.setLetzteChatVonPapa(letzte);
    if (istNeu) {
      spieleBenachrichtigungston();
      try { Hinweise.nachrichtPopup(letzte.text); } catch (e) { /* Popup ist optional */ }
    }
  }

  /** Papa hat eine Partie gestartet (Schach/Schiffe/Mau-Mau): eigener Ton + Banner.
   *  Bei ausgeschaltetem Bildschirm uebernimmt das der native Hintergrund-Poll
   *  (BackgroundPoll.kt); hat der schon geklingelt, hier nicht noch mal. */
  function pruefeSpielAnfrage(anfrage) {
    if (!anfrage || !anfrage.ts) return;
    let bekannt = null;
    try { bekannt = parseInt(localStorage.getItem('spielAnfrageTs') || '', 10); } catch (e) { /* ohne Speicher */ }
    try { localStorage.setItem('spielAnfrageTs', String(anfrage.ts)); } catch (e) { /* egal */ }
    if (!bekannt || anfrage.ts <= bekannt) return; // erster Poll nach Installation: kein Ton
    let schonGeklingelt = false;
    try {
      schonGeklingelt = typeof AndroidBridge !== 'undefined' && AndroidBridge.spielAnfrageSchonGemeldet
        && AndroidBridge.spielAnfrageSchonGemeldet(String(anfrage.ts));
    } catch (e) { /* aeltere APK */ }
    if (!schonGeklingelt) spieleSpielton();
    const name = { schach: 'Schach', schiffe: 'Schiffe versenken', maumau: 'Mau-Mau' }[anfrage.art] || 'ein Spiel';
    zeigeBanner('🎮 Papa möchte ' + name + ' spielen!', () => App.gotoHome(), 60000);
    try { Hinweise.spielPopup(name); } catch (e) { /* Popup ist optional */ }
  }

  function spieleSpielton() {
    try {
      if (typeof AndroidBridge !== 'undefined' && AndroidBridge.playGameSound) { AndroidBridge.playGameSound(); return; }
    } catch (e) { /* aeltere APK */ }
    try {
      const a = new Audio('sounds/spiel.wav');
      a.volume = 1.0;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* Banner zeigt es trotzdem */ }
  }

  // Auffaelliger, lauter Hinweiston (Uli 11.10.2026: "sehr leise und nicht markant genug").
  // Bevorzugt NATIV (AndroidBridge.playAlertSound: Alarm-Lautstaerke, unabhaengig von der
  // Medien-Lautstaerke, ab App-Version 2.7). Fallback Web Audio: dreimal ein
  // aufsteigendes Vier-Ton-Motiv mit Rechteckwellen (deutlich lauter/penetranter
  // als die fruehere leise Sinus-/Dreieck-Zweiton-Melodie), ueber einen Kompressor.
  function spieleBenachrichtigungston() {
    try {
      if (typeof AndroidBridge !== 'undefined' && AndroidBridge.playAlertSound) {
        AndroidBridge.playAlertSound();
        return;
      }
    } catch (e) { /* aeltere APK - Web-Audio-Fallback */ }
    // Fallback 1: die mitgelieferte Klingelton-Datei per Audio-Element (Lautstaerke 1.0)
    try {
      const a = new Audio('sounds/benachrichtigung.wav');
      a.volume = 1.0;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => spieleWebAudioMotiv());
      return;
    } catch (e) { /* weiter mit Web Audio */ }
    spieleWebAudioMotiv();
  }

  function spieleWebAudioMotiv() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const komp = ctx.createDynamicsCompressor();
      const master = ctx.createGain();
      master.gain.value = 1.0;
      komp.connect(master);
      master.connect(ctx.destination);
      const ton = (frequenz, start, dauer) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = frequenz;
        o.connect(g);
        g.connect(komp);
        const t0 = ctx.currentTime + start;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.9, t0 + 0.01);
        g.gain.setValueAtTime(0.9, t0 + dauer * 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
        o.start(t0);
        o.stop(t0 + dauer + 0.05);
      };
      const motiv = [784, 988, 1175, 1568]; // G5 H5 D6 G6
      for (let wdh = 0; wdh < 3; wdh++) {
        motiv.forEach((f, i) => ton(f, wdh * 1.1 + i * 0.16, 0.2));
      }
    } catch (e) {
      // Web Audio evtl. blockiert - das Banner/Badge zeigt die Nachricht trotzdem an.
    }
  }

  // Beim Aufwachen/Einschalten: nachsehen UND - falls eine Nachricht von Papa
  // ungelesen ist - Banner + Ton (hoechstens alle 20 s, damit mehrere
  // Aufwach-Signale nicht mehrfach toenen).
  let letzterAufwachTon = 0;
  async function beiAufwachen() {
    // Akku zuerst: die Warnung soll sofort kommen, nicht erst wenn das WLAN wieder da ist
    try { Hinweise.akkuPruefen('aufwachen'); } catch (e) { /* optional */ }
    await poll();
    aktualisiereChatBanner();
    const letzte = Storage.getLetzteChatVonPapa();
    const ungelesen = Storage.chatUngelesen();
    if (ungelesen && Date.now() - letzterAufwachTon > 20000) {
      letzterAufwachTon = Date.now();
      spieleBenachrichtigungston();
      try { Hinweise.nachrichtPopup(letzte && letzte.text); } catch (e) { /* Popup ist optional */ }
    }
    try { Hinweise.badgeAktualisieren(); } catch (e) { /* optional */ }
  }

  /** Zusatzaufgaben-Karte fuers Startbild - leerer String, wenn nichts da ist,
   *  damit App.gotoHome() sie einfach immer mit einbauen kann. */
  function zusatzaufgabenHtml() {
    const aufgaben = Storage.getFernZusatzaufgaben();
    if (!aufgaben.length) return '';
    const zeilenHtml = aufgaben.map(a => `
      <div class="fernaufgabe-zeile${a.erledigt ? ' fernaufgabe-erledigt' : ''}">
        <span>${a.erledigt ? '✅' : '⬜'} ${escapeHtml(a.text)}</span>
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

  /** Einmaliger Umzug alter, rein lokaler Tagesplan-Regeln (siehe
   *  Storage.getTagesplanRegeln - vor 28.08.2026 die einzige Ablage fuer
   *  Ulis Wochenplan) in die gemeinsame Fern-Regel-Liste, damit Tablet und
   *  Elternapp danach dieselbe Konfiguration sehen/bearbeiten (Uli-Wunsch:
   *  "das zukuenftig sowohl auf dem tablet ... als auch in der elternapp ...
   *  gleich haben"). Best-effort wie der Rest dieser Datei: schlaegt es
   *  mangels Internet fehl, bleibt die lokale Liste unveraendert stehen und
   *  der naechste App-Start (Kiosk-Tablet wacht/startet haeufig neu) versucht
   *  es einfach wieder - kein dedizierter Retry-Mechanismus noetig. Die
   *  lokale Liste wird ERST nach bestaetigt erfolgreichem Hochladen geleert,
   *  damit bei einem Abbruch mittendrin nichts verloren geht.
   */
  async function migriereLokaleTagesplanRegelnFallsNoetig() {
    const lokal = Storage.getTagesplanRegeln();
    if (!lokal.length || !BACKEND_URL) return;
    try {
      const r = await fetchMitTimeout(BACKEND_URL + '/api/state');
      if (!r.ok) return;
      const stand = await r.json();
      const kombiniert = (stand.regeln || []).concat(lokal);
      const antwort = await fetchMitTimeout(BACKEND_URL + '/api/regeln', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regeln: kombiniert })
      });
      if (!antwort.ok) return;
      const json = await antwort.json();
      Storage.setFernstand(json.regeln, stand.zusatzaufgaben);
      Storage.setTagesplanRegeln([]);
    } catch (e) {
      // Kein Internet gerade - lokale Liste bleibt bestehen, naechster App-Start versucht es erneut.
    }
  }

  /** Speichert die komplette Fach-Tagesregeln-Liste (Wochentabelle + Ausnahmen,
   *  siehe App.oeffneEinstellungen) - ersetzt IMMER die gesamte Liste, wie es
   *  das Backend erwartet (siehe backend/webapp/index.html speichereRegeln,
   *  gleiches Muster). Liefert true/false statt fire-and-forget, damit der
   *  Eltern-Bereich bei fehlendem Internet eine ehrliche Fehlermeldung zeigen
   *  kann statt eine Aenderung nur zu simulieren, die serverseitig nie ankam. */
  async function speichereRegeln(regeln) {
    if (!BACKEND_URL) return false;
    try {
      const r = await fetchMitTimeout(BACKEND_URL + '/api/regeln', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regeln })
      });
      if (!r.ok) return false;
      const json = await r.json();
      Storage.setFernstand(json.regeln, Storage.getFernZusatzaufgaben());
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Expliziter, sofortiger Abruf des Server-Stands (statt auf den naechsten
   *  Poll-Zyklus zu warten) - genutzt beim OEFFNEN des Eltern-Bereichs, damit
   *  dort keine bis zu 1 Minute alte Regel-Liste angezeigt wird (siehe
   *  POLL_INTERVAL_MS). Liefert die Regeln oder null (kein Internet - Aufrufer
   *  faellt dann auf den zuletzt bekannten Cache zurueck, siehe getFernRegeln). */
  async function holeRegelnFrisch() {
    if (!BACKEND_URL) return null;
    try {
      const r = await fetchMitTimeout(BACKEND_URL + '/api/state');
      if (!r.ok) return null;
      const stand = await r.json();
      Storage.setFernstand(stand.regeln, stand.zusatzaufgaben);
      return stand.regeln;
    } catch (e) {
      return null;
    }
  }

  function init() {
    migriereLokaleTagesplanRegelnFallsNoetig();
    poll();
    setInterval(poll, POLL_INTERVAL_MS);
    // Sofort nachsehen, wenn das Tablet aufwacht/der Bildschirm wieder an ist
    // oder das Netz zurueckkommt - unabhaengig vom nativen onResume-Aufruf.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { aktualisiereChatBanner(); beiAufwachen(); } });
    window.addEventListener('online', poll);
    window.addEventListener('focus', beiAufwachen);
  }

  /** Meldet ein abgeschlossenes Uebungs-/Quiz-Set an Papas Backend - loest dort
   *  sofort eine Push-Benachrichtigung aus UND landet in der Auswertung. Fire-
   *  and-forget wie meldeErledigt: schlaegt der Versuch fehl (kein Internet),
   *  bleibt einfach keine Meldung dieses Mals aus, nichts an der App haengt
   *  davon ab. titel/zusammenfassung sind schon fertig lesbarer Text (z.B.
   *  "Mathe-Tagesaufgabe" / "8 von 10 richtig"), damit das Backend keine
   *  Detailkenntnis der einzelnen Uebungsarten braucht. fach gruppiert den
   *  Eintrag in Papas Auswertung (z.B. 'mathe'/'malfolgen'/'deutsch'/'heimat'/
   *  'schach'). Schickt zusaetzlich IMMER den aktuellen Storage-Schnappschuss
   *  der Malfolgen-/Mathe-Kategorien-Statistik mit (klein genug, um das bei
   *  jedem Set einfach mitzuschicken) - damit Papas "Wo hat er noch Probleme"-
   *  Ansicht nach JEDEM Set aktuell ist, nicht nur nach Malfolgen-Sitzungen. */
  // verlauf (optional): [{frage, ergebnis}] - einzelne Aufgaben-Ergebnisse
  // dieser Aufgabenfolge (siehe App.startQuizSession/abschlussFrage bzw.
  // Mathe.bewerteMalfolgenKarte), macht den Eintrag in Papas Auswertung
  // anklickbar (Uli-Wunsch 22.08.2026). Nur mitgeschickt, wenn vorhanden -
  // Faecher/Uebungen ohne Protokoll (z.B. Schach) bleiben unveraendert.
  function sendeLernsetMeldung(body) {
    return fetchMitTimeout(BACKEND_URL + '/api/lernset-erledigt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => { if (!r.ok) throw new Error('http ' + r.status); });
  }

  function meldeLernsetErledigt(titel, zusammenfassung, sterne, fach, verlauf, text) {
    if (!BACKEND_URL) return;
    const body = {
      titel, zusammenfassung, sterne, fach,
      malfolgenStats: Storage.getMalfolgenStats(),
      matheKategorienStats: Storage.getMatheKategorienStats()
    };
    // Stand des automatischen Kartenaufbaus (Malfolgen-Reihen, Radfahr-Stapel) - das Backend
    // vergleicht mit dem letzten Stand und fuehrt daraus den Aufbau-Verlauf in Papas Auswertung.
    try {
      body.aufbau = {
        malfolgen: typeof Mathe !== 'undefined' && Mathe.aufbauInfo ? Mathe.aufbauInfo() : undefined,
        hsk: typeof Heimatkunde !== 'undefined' && Heimatkunde.aufbauInfo ? Heimatkunde.aufbauInfo() : undefined
      };
      if (typeof Deutsch !== 'undefined' && Deutsch.faelleStufen) body.faelleStufen = Deutsch.faelleStufen();
    } catch (e) { /* Aufbau-Info ist optional */ }
    if (Array.isArray(verlauf) && verlauf.length) body.verlauf = verlauf;
    if (typeof text === 'string' && text) body.text = text; // z.B. abgetippter Schreibtext (siehe schreiben.js)
    sendeLernsetMeldung(body).catch(() => {
      // Kein Internet gerade / Backend nicht erreichbar (z.B. Render-Cold-
      // Start, siehe fetchMitTimeout-Timeout) - NICHT wie frueher einfach
      // verwerfen, sonst verschwindet eine ganze abgeschlossene Aufgabenfolge
      // stillschweigend aus Papas Auswertung (24.08.2026 von Uli gemeldet).
      // Stattdessen fuer den naechsten erfolgreichen Poll vormerken.
      Storage.pushOffeneLernsetMeldung(body);
    });
  }

  /** Arbeitet die Warteschlange nicht zugestellter Lernset-Meldungen ab -
   *  wird nach jedem erfolgreich beantworteten Poll aufgerufen (= Internet
   *  ist gerade nachweislich da). Bricht beim ERSTEN Fehlschlag ab (haelt die
   *  Reihenfolge ein UND vermeidet sinnloses Dauerfeuern, falls das Backend
   *  doch noch nicht bereit ist) - der naechste Poll versucht es einfach
   *  wieder. */
  async function sendeOffeneLernsetMeldungen() {
    const liste = Storage.getOffeneLernsetMeldungen();
    while (liste.length) {
      try {
        await sendeLernsetMeldung(liste[0]);
        Storage.entferneErsteOffeneLernsetMeldung();
      } catch (e) {
        break;
      }
    }
  }

  return { init, poll, beiAufwachen, zusatzaufgabenHtml, meldeErledigt, meldeLernsetErledigt, speichereRegeln, holeRegelnFrisch };
})();
