const App = (function () {
  const root = () => document.getElementById('app-root');

  function updateTopbar() {
    const s = Storage.getState();
    document.getElementById('stat-sterne').textContent = '⭐ ' + s.sterne;
    document.getElementById('stat-level').textContent = 'Level ' + Storage.level();
  }

  function updateAkkuAnzeige() {
    if (typeof AndroidBridge === 'undefined' || !AndroidBridge.getBatteryPercent) return;
    const prozent = AndroidBridge.getBatteryPercent();
    const el = document.getElementById('stat-akku');
    if (prozent < 0) { el.style.display = 'none'; return; }
    let symbol = '🔋';
    if (prozent <= 20) symbol = '🪫';
    el.textContent = symbol + ' ' + prozent + '%';
    el.style.display = '';
  }

  /** Nachbau der nativen 🔒/📅-Bedienung aus MainActivity.kt, NUR fuer die
   *  Browser-Vorschau ohne echtes Tablet (erkannt am fehlenden AndroidBridge-
   *  JS-Interface, das es nur in der echten Kiosk-WebView gibt) - auf dem
   *  echten Tablet erscheint das hier nie, dort gilt der native Button. Dient
   *  einzig dazu, App.oeffneEinstellungen() auch ohne Gerät testen zu können. */
  function initDevElternSimulation() {
    if (typeof AndroidBridge !== 'undefined') return;
    let entsperrt = false;
    const lockBtn = document.createElement('div');
    lockBtn.className = 'dev-sim-btn dev-sim-lock';
    lockBtn.textContent = '🔒';
    lockBtn.title = 'Nur Browser-Vorschau des nativen Eltern-Bereichs';
    const tagesplanBtn = document.createElement('div');
    tagesplanBtn.className = 'dev-sim-btn dev-sim-tagesplan';
    tagesplanBtn.textContent = '📅';
    tagesplanBtn.title = 'Tagesplan-Regeln (Vorschau)';
    tagesplanBtn.style.display = 'none';
    tagesplanBtn.onclick = () => oeffneEinstellungen();
    lockBtn.onclick = () => {
      entsperrt = !entsperrt;
      lockBtn.textContent = entsperrt ? '🔓' : '🔒';
      tagesplanBtn.style.display = entsperrt ? 'flex' : 'none';
    };
    document.body.appendChild(lockBtn);
    document.body.appendChild(tagesplanBtn);
  }

  let onLeaveScreen = null;
  function setOnLeaveScreen(fn) { onLeaveScreen = fn; }

  function render(html) {
    if (onLeaveScreen) {
      const fn = onLeaveScreen;
      onLeaveScreen = null;
      fn();
    }
    root().innerHTML = html;
    updateTopbar();
  }

  // Vier feste Einstiege quer durchs Programm (Schach bewusst ausgenommen -
  // eine Partie ist kein kurzer Zwischendurch-Shortcut). Ruft ausschließlich
  // bereits bestehende Fach-Funktionen auf, keine eigene Aufgabenlogik.
  // Mathe/Deutsch wechseln sich taeglich als "Heute dran" ab (Storage.getTagesFach,
  // per Regeln in App.oeffneEinstellungen einstellbar) - das jeweils andere Fach
  // bleibt trotzdem im Tagesplan, nur als "Extra" markiert, damit Max jederzeit
  // mehr üben kann, ohne dass ihm etwas gesperrt wird.
  const GESCHICHTEN_STATUS_PRAEFIX = { neu: 'Lesen: ', weiter: 'Weiterlesen: ', nochmal: 'Nochmal lesen: ' };

  function baueTagesplan() {
    const offen = Geschichten.naechsteOffene();
    const heuteFach = Storage.getTagesFach();
    const mathe = { fach: 'mathe', icon: 'tagesaufgabe', titel: 'Tagesaufgabe', fachName: 'Mathe', onclick: 'Mathe.starteTagesaufgabe()' };
    const deutsch = { fach: 'deutsch', icon: 'rechtschreibung', titel: 'Rechtschreibung üben', fachName: 'Deutsch', onclick: 'Deutsch.starteRechtschreibung()' };
    const [heute, extra] = heuteFach === 'mathe' ? [mathe, deutsch] : [deutsch, mathe];
    heute.badge = 'Heute dran';
    extra.badge = 'Extra';
    extra.extra = true;
    return [
      heute, extra,
      {
        fach: 'geschichten', icon: 'geschichten', fachName: 'Geschichten',
        titel: GESCHICHTEN_STATUS_PRAEFIX[offen.status] + offen.titel,
        onclick: `Geschichten.leseBuch('${offen.id}')`
      }
    ];
  }

  function gotoHome() {
    const streak = Storage.getTagesStreak();
    const streakText = streak.anzahl > 0
      ? `${streak.anzahl} ${streak.anzahl === 1 ? 'Tag' : 'Tage'} in Folge`
      : 'Leg heute los!';
    const geschichtenFortschritt = Storage.getGeschichtenFortschritt();

    const tagesplanHtml = baueTagesplan().map(t => `
      <div class="tagesplan-chip accent-${t.fach}" onclick="${t.onclick}">
        <span class="tagesplan-chip-icon icon-${t.fach}">${Icons.svg(t.icon)}</span>
        <span class="tagesplan-chip-text">
          <span class="tagesplan-chip-titel">${t.titel}</span>
          <span class="tagesplan-chip-fach">${t.fachName}</span>
          ${t.badge ? `<span class="tagesplan-chip-badge${t.extra ? ' tagesplan-chip-badge-extra' : ''}">${t.badge}</span>` : ''}
        </span>
      </div>
    `).join('');

    render(`
      <div class="home-greeting">
        <div class="home-avatar">M</div>
        <div>
          <div class="home-greeting-hallo">Hallo Max!</div>
          <div class="home-streak">${Icons.svg('streak')} ${streakText}</div>
        </div>
      </div>

      ${FernSync.zusatzaufgabenHtml()}

      <div class="tagesplan-banner">
        <div class="tagesplan-titel">Dein Tagesplan</div>
        <div class="tagesplan-liste">${tagesplanHtml}</div>
      </div>

      <div class="menu-grid">
        <div class="menu-card accent-mathe" onclick="Mathe.renderMenu()">
          <span class="menu-icon icon-mathe">${Icons.svg('mathe')}</span>
          <span class="menu-text"><span class="menu-label">Mathe</span><span class="menu-progress">${Storage.getFachFortschritt('mathe').geloest} Aufgaben gelöst</span></span>
        </div>
        <div class="menu-card accent-deutsch" onclick="Deutsch.renderMenu()">
          <span class="menu-icon icon-deutsch">${Icons.svg('deutsch')}</span>
          <span class="menu-text"><span class="menu-label">Deutsch</span><span class="menu-progress">${Storage.getFachFortschritt('deutsch').geloest} Aufgaben gelöst</span></span>
        </div>
        <div class="menu-card accent-geschichten" onclick="Geschichten.renderMenu()">
          <span class="menu-icon icon-geschichten">${Icons.svg('geschichten')}</span>
          <span class="menu-text"><span class="menu-label">Geschichten</span><span class="menu-progress">${geschichtenFortschritt.fertig} von ${geschichtenFortschritt.gesamt} gelesen</span></span>
        </div>
        <div class="menu-card accent-heimat" onclick="Heimatkunde.renderMenu()">
          <span class="menu-icon icon-heimat">${Icons.svg('heimat')}</span>
          <span class="menu-text"><span class="menu-label">Heimat &amp; Sachkunde</span><span class="menu-progress">${Storage.getFachFortschritt('heimat').geloest} Aufgaben gelöst</span></span>
        </div>
        <div class="menu-card accent-schach" onclick="Schach.renderMenu()">
          <span class="menu-icon icon-schach">${Icons.svg('schach')}</span>
          <span class="menu-text"><span class="menu-label">Schach</span><span class="menu-progress">${Schach.aktuelleStufeName()}</span></span>
        </div>
        <div class="menu-card accent-chat" onclick="Chat.starteAnsicht()">
          <span class="menu-icon icon-chat">${Icons.svg('chat')}</span>
          <span class="menu-text"><span class="menu-label">Chat mit Papa</span><span class="menu-progress">Nachricht schreiben</span></span>
        </div>
        <div class="menu-card accent-belohnung" onclick="Belohnungen.renderMenu()">
          <span class="menu-icon icon-belohnung">${Icons.svg('geschenk')}</span>
          <span class="menu-text"><span class="menu-label">Belohnungen</span><span class="menu-progress">${Storage.getGuthaben()} ⭐ gesammelt</span></span>
        </div>
      </div>
    `);
  }

  // ---------------------------------------------------------------------
  // Eltern-Regel-Editor: PIN-geschützt über den nativen Eltern-Bereich
  // erreichbar (🔒 entsperren → 📅-Button ruft App.oeffneEinstellungen()
  // per evaluateJavascript auf, siehe MainActivity.kt tagesplanButton).
  // ---------------------------------------------------------------------
  function formatDatum(iso) {
    const [j, m, t] = iso.split('-');
    return `${t}.${m}.${j}`;
  }

  function regelText(r) {
    const fachName = r.fach === 'mathe' ? 'Mathe' : 'Deutsch';
    if (r.typ === 'einzeltag') return `${formatDatum(r.datum)}: ${fachName}`;
    if (r.typ === 'zeitraum') return `${formatDatum(r.von)} – ${formatDatum(r.bis)}: ${fachName}`;
    return `Jedes Wochenende: ${fachName}`;
  }

  function fortschrittZeile(fach, label) {
    const s = Storage.getState().stats[fach] || { richtig: 0, falsch: 0 };
    const gesamt = s.richtig + s.falsch;
    const quote = gesamt > 0 ? Math.round((s.richtig / gesamt) * 100) : null;
    const werte = quote !== null ? `${s.richtig} richtig · ${s.falsch} falsch · ${quote}%` : 'noch nichts geübt';
    return `<div class="fortschritt-zeile"><span class="fortschritt-fach">${label}</span><span class="fortschritt-werte">${werte}</span></div>`;
  }

  const MATHE_KATEGORIE_NAMEN = {
    plusminus: 'Plus/Minus', einmaleins: 'Einmaleins', geteilt: 'Geteilt',
    textaufgaben: 'Textaufgaben', schriftlich: 'Schriftlich rechnen',
    zehnhundert: '10er/100er', teilervielfache: 'Teiler & Vielfache',
    diagramme: 'Diagramme lesen', aufgabenfamilien: 'Aufgabenfamilien'
  };

  function matheKategorienHtml() {
    const stats = Storage.getMatheKategorienStats();
    return Object.keys(MATHE_KATEGORIE_NAMEN)
      .map(k => ({ k, falsch: (stats[k] && stats[k].falsch) || 0 }))
      .sort((a, b) => b.falsch - a.falsch)
      .map(({ k, falsch }) => `
        <div class="kategorie-zeile">
          <span>${MATHE_KATEGORIE_NAMEN[k]}</span>
          <span>${falsch > 0 ? falsch + '× falsch' : 'noch keine Fehler'}</span>
        </div>
      `).join('');
  }

  // Duplizierte Klartext-Namen fuer die Schach-Tagesplan-Anzeige im Eltern-
  // Bereich - dieselben Schluessel wie in Storage.generiereSchachTagesplanSchritte
  // (schach.js hat eigene, identische Kopien fuer die "Los"-Buttons dort; hier
  // reicht reine Anzeige ohne Klick-Ziele).
  const SCHACH_TAKTIK_NAMEN = { fork: 'Gabeln', pin: 'Fesselungen', skewer: 'Spieße', discoveredAttack: 'Abzugsangriffe' };
  const SCHACH_KONZENTRATION_NAMEN = { koordinaten: 'Koordinaten finden', feldfarbe: 'Feldfarbe-Quiz', laeuferweg: 'Läufer-Weg merken' };
  const SCHACH_STRATEGIE_NAMEN = { eroeffnung: 'Eröffnungsprinzipien', material: 'Materialwerte', bauern: 'Bauernendspiel-Wissen' };

  function schachSchrittLabel(s) {
    if (s.typ === 'taktik') return 'Taktik: ' + (SCHACH_TAKTIK_NAMEN[s.thema] || s.thema);
    if (s.typ === 'konzentration') return 'Konzentration: ' + (SCHACH_KONZENTRATION_NAMEN[s.spiel] || s.spiel);
    return 'Strategie: ' + (SCHACH_STRATEGIE_NAMEN[s.quiz] || s.quiz);
  }

  function schachTagesplanHtml() {
    const plan = Storage.getSchachTagesplan();
    const erledigt = plan.schritte.filter(s => s.erledigt).length;
    const zeilen = plan.schritte.map(s => `
      <div class="kategorie-zeile"><span>${s.erledigt ? '✅' : '⬜'} ${schachSchrittLabel(s)}</span></div>
    `).join('');
    return `
      <div class="fortschritt-zeile"><span class="fortschritt-fach">Schach-Tagesplan</span><span class="fortschritt-werte">${erledigt} von ${plan.schritte.length} erledigt</span></div>
      ${zeilen}
    `;
  }

  // resetBestaetigung: zeigt statt des Reset-Buttons eine Ja/Abbrechen-Rueckfrage
  // direkt auf der Seite. KEIN natives confirm() - die Kiosk-WebView hat keinen
  // WebChromeClient eingerichtet, ohne den window.confirm()/alert() in Android
  // WebViews stillschweigend nichts tun und sofort false liefern (der Dialog
  // erscheint gar nicht) - der Reset wuerde also nie ausgefuehrt.
  // Nur hier (Eltern-Bereich) darf eine Belohnung tatsaechlich eingeloest
  // werden - Max sieht seinen Fortschritt auf der Belohnungen-Kachel
  // (belohnungen.js), kann dort aber nichts abbuchen.
  function belohnungenHtml() {
    const guthaben = Storage.getGuthaben();
    const liste = Storage.getBelohnungen();
    if (!liste.length) return '<div class="regel-leer">Noch keine Belohnungen eingetragen.</div>';
    return liste.map(b => {
      const erreicht = guthaben >= b.kosten;
      return `
        <div class="regel-zeile">
          <span>${b.name} — ${b.kosten} ⭐${erreicht ? ' ✅ einlösbar' : ''}</span>
          <span style="display:flex; align-items:center; gap:10px;">
            ${erreicht ? `<span class="btn-hilfe" style="margin:0; padding:6px 14px;" onclick="App.belohnungEinloesen('${b.id}')">Einlösen</span>` : ''}
            <span class="regel-loeschen" onclick="App.belohnungLoeschen('${b.id}')">${Icons.svg('loeschen')}</span>
          </span>
        </div>
      `;
    }).join('');
  }

  function belohnungsVerlaufHtml() {
    const verlauf = Storage.getBelohnungsVerlauf();
    if (!verlauf.length) return '';
    return `
      <div class="fortschritt-unterueberschrift">Verlauf</div>
      ${verlauf.map(v => `<div class="kategorie-zeile"><span>${formatDatum(v.datum)}: ${v.name}</span><span>−${v.kosten} ⭐</span></div>`).join('')}
    `;
  }

  function fuegeBelohnungHinzu() {
    const name = document.getElementById('belohnung-name').value.trim();
    const kosten = parseInt(document.getElementById('belohnung-kosten').value, 10);
    if (!name || !kosten || kosten <= 0) return;
    Storage.fuegeBelohnungHinzu(name, kosten);
    oeffneEinstellungen();
  }

  function belohnungLoeschen(id) {
    Storage.loescheBelohnung(id);
    oeffneEinstellungen();
  }

  function belohnungEinloesen(id) {
    Storage.loeseBelohnungEin(id);
    oeffneEinstellungen();
  }

  function oeffneEinstellungen(resetBestaetigung) {
    const regeln = Storage.getTagesplanRegeln();
    const regelnHtml = regeln.length
      ? regeln.map((r, i) => `
          <div class="regel-zeile">
            <span>${regelText(r)}</span>
            <span class="regel-loeschen" onclick="App.loescheRegel(${i})">${Icons.svg('loeschen')}</span>
          </div>
        `).join('')
      : '<div class="regel-leer">Noch keine Regeln – wechselt automatisch jeden Tag zwischen Mathe und Deutsch.</div>';

    render(`
      <div class="back-row"><span class="back-btn" onclick="App.gotoHome()">${Icons.svg('zurueck')} Zurück</span></div>

      <div class="welcome">Fortschritt</div>
      <div class="regel-karte">
        ${fortschrittZeile('mathe', 'Mathe')}
        ${fortschrittZeile('deutsch', 'Deutsch')}
        <div class="fortschritt-unterueberschrift">Mathe nach Bereich (öfter falsch steht oben)</div>
        ${matheKategorienHtml()}
        <div class="fortschritt-unterueberschrift">Schach heute</div>
        ${schachTagesplanHtml()}
      </div>

      <div class="welcome" style="margin-top:32px;">Tagesplan-Regeln</div>
      <div class="lese-text">Bestimme, an welchen Tagen Mathe oder Deutsch im Tagesplan als "Heute dran" hervorgehoben wird. Ohne Regeln wechselt es automatisch jeden Kalendertag ab. Das andere Fach bleibt für Max immer zusätzlich als "Extra" antippbar – nichts wird gesperrt.</div>

      <div class="regel-karte">
        <div class="regel-liste">${regelnHtml}</div>

        <div class="regel-formular">
          <select id="regel-typ" class="regel-input" onchange="App.aktualisiereRegelFormular()">
            <option value="einzeltag">Einzelner Tag</option>
            <option value="zeitraum">Zeitraum</option>
            <option value="wochenende">Jedes Wochenende</option>
          </select>
          <select id="regel-fach" class="regel-input">
            <option value="mathe">Mathe</option>
            <option value="deutsch">Deutsch</option>
          </select>
          <div id="regel-daten" class="regel-daten"><input type="date" id="regel-datum" class="regel-input"></div>
          <div class="btn-primary" onclick="App.fuegeRegelHinzu()">Regel hinzufügen</div>
        </div>
      </div>

      <div class="welcome" style="margin-top:32px;">Belohnungen</div>
      <div class="lese-text">Max' aktuelles Guthaben: <strong>${Storage.getGuthaben()} ⭐</strong>. Das Guthaben sinkt nur, wenn hier eine Belohnung eingelöst wird – am besten als kleines Ritual, z. B. am Ende der Woche. Die Kosten bewusst hoch genug ansetzen, damit es sich nach echter Anstrengung anfühlt.</div>
      <div class="regel-karte">
        <div class="regel-liste">${belohnungenHtml()}</div>
        <div class="regel-formular">
          <input type="text" id="belohnung-name" class="regel-input" placeholder="z.B. Kinobesuch">
          <input type="number" id="belohnung-kosten" class="regel-input" placeholder="Kosten in ⭐" min="1">
          <div class="btn-primary" onclick="App.fuegeBelohnungHinzu()">Belohnung hinzufügen</div>
        </div>
        ${belohnungsVerlaufHtml()}
      </div>

      <div class="welcome" style="margin-top:32px;">Fortschritt zurücksetzen</div>
      <div class="lese-text">Setzt Punkte, gelöste Aufgaben, Karteikarten-Fortschritt sowie gelesene Geschichten/Bücher komplett zurück (z. B. für einen echten Neustart). Tagesplan-Regeln und Malfolgen-Reihen bleiben erhalten. Das kann nicht rückgängig gemacht werden.</div>
      <div class="regel-karte">
        ${resetBestaetigung ? `
          <div class="hilfe-warnung">⚠️ Wirklich ALLES zurücksetzen? Das kann nicht rückgängig gemacht werden.</div>
          <div class="reset-aktionen">
            <div class="btn-gefahr" onclick="App.fortschrittWirklichZuruecksetzen()">Ja, zurücksetzen</div>
            <div class="btn-primary" style="background:var(--muted);color:var(--ink);margin-top:0;" onclick="App.oeffneEinstellungen()">Abbrechen</div>
          </div>
        ` : `
          <div class="btn-gefahr" onclick="App.oeffneEinstellungen(true)">Gesamten Fortschritt zurücksetzen</div>
        `}
      </div>
    `);
  }

  function fortschrittWirklichZuruecksetzen() {
    Storage.resetFortschritt();
    oeffneEinstellungen();
  }

  function aktualisiereRegelFormular() {
    const typ = document.getElementById('regel-typ').value;
    const container = document.getElementById('regel-daten');
    if (typ === 'einzeltag') {
      container.innerHTML = '<input type="date" id="regel-datum" class="regel-input">';
    } else if (typ === 'zeitraum') {
      container.innerHTML =
        '<input type="date" id="regel-von" class="regel-input"> <input type="date" id="regel-bis" class="regel-input">';
    } else {
      container.innerHTML = '';
    }
  }

  function fuegeRegelHinzu() {
    const typ = document.getElementById('regel-typ').value;
    const fach = document.getElementById('regel-fach').value;
    let regel;
    if (typ === 'einzeltag') {
      const datum = document.getElementById('regel-datum').value;
      if (!datum) return;
      regel = { typ, datum, fach };
    } else if (typ === 'zeitraum') {
      const von = document.getElementById('regel-von').value;
      const bis = document.getElementById('regel-bis').value;
      if (!von || !bis) return;
      regel = { typ, von, bis, fach };
    } else {
      regel = { typ: 'wochenende', fach };
    }
    const regeln = Storage.getTagesplanRegeln();
    regeln.push(regel);
    Storage.setTagesplanRegeln(regeln);
    oeffneEinstellungen();
  }

  function loescheRegel(i) {
    const regeln = Storage.getTagesplanRegeln();
    regeln.splice(i, 1);
    Storage.setTagesplanRegeln(regeln);
    oeffneEinstellungen();
  }

  function subMenuHtml(titel, karten) {
    // karten: [{icon, titel, onclick}] - icon ist ein Name aus Icons.svg()
    const cardsHtml = karten.map(k =>
      `<div class="sub-card" onclick="${k.onclick}"><span class="sub-icon">${Icons.svg(k.icon)}</span><span class="sub-label">${k.titel}</span></div>`
    ).join('');
    return `
      <div class="back-row"><span class="back-btn" onclick="App.gotoHome()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">${titel}</div>
      <div class="sub-grid">${cardsHtml}</div>
    `;
  }

  // ---- Generischer Quiz-Runner ----
  // fragen: Array von { typ: 'mc'|'numeric', lesetext?, frage, optionen?, richtigIndex?, antwort? }
  let session = null;

  function startQuizSession(fach, fragen, config) {
    session = {
      fach, fragen, index: 0, sessionSterne: 0, richtigCount: 0,
      onFinish: config && config.onFinish,
      // Lesbarer Titel fuer die Papa-Auswertung/Push-Meldung (siehe
      // renderErgebnis) - faellt auf den fach-Kuerzel zurueck, wenn keiner
      // mitgegeben wurde.
      titel: (config && config.titel) || fach,
      // Wenn true: falsch beantwortete Fragen werden ein paar Fragen spaeter
      // erneut eingereiht (Karteikarten-Prinzip), statt einfach zu verschwinden.
      wiederholeFalsche: !!(config && config.wiederholeFalsche)
    };
    renderQuestion();
  }

  // Zweiter Versuch + Hilfe-Button: nur Fragen mit eigenem f.hilfe (Erklaerung
  // mit einem ANDEREN Beispiel desselben Aufgabentyps) bekommen die neue
  // Ablauf-Logik. Fragen ohne hilfe (z.B. andere Faecher, die die hilfe noch
  // nicht eingepflegt haben) verhalten sich wie bisher: 1 Versuch, direkt fertig.
  let eingabe = '';
  let versuch = 1;
  let hilfeGenutzt = false;

  function renderQuestion() {
    const f = session.fragen[session.index];
    const total = session.fragen.length;
    const nr = session.index + 1;
    versuch = 1;
    hilfeGenutzt = false;

    let bodyHtml = '';
    if (f.lesetext) {
      bodyHtml += `<div class="lese-text">${f.lesetext}</div>`;
    }
    bodyHtml += `<div class="frage-text">${f.frage}</div>`;

    if (f.typ === 'numeric') {
      bodyHtml += `
        <div class="zahl-anzeige" id="zahl-anzeige">&nbsp;</div>
        <div class="keypad" id="keypad"></div>
      `;
    } else {
      bodyHtml += `<div class="optionen" id="optionen"></div>`;
    }
    bodyHtml += `<div class="feedback" id="feedback"></div>`;
    bodyHtml += `<div class="hilfe-bereich" id="hilfe-bereich"></div>`;

    render(`
      <div class="quiz-wrap">
        <div class="progress-row">
          <span>Frage ${nr} / ${total}</span>
          <span>${session.fach.toUpperCase()}</span>
        </div>
        <div class="frage-card">${bodyHtml}</div>
      </div>
    `);

    if (f.typ === 'numeric') {
      renderKeypad(f);
    } else {
      renderOptionen(f);
    }
  }

  function renderOptionen(f) {
    const wrap = document.getElementById('optionen');
    wrap.innerHTML = '';
    f.optionen.forEach((opt, i) => {
      const btn = document.createElement('div');
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.onclick = () => beantworteMC(i, f);
      wrap.appendChild(btn);
    });
  }

  function beantworteMC(i, f) {
    const buttons = document.querySelectorAll('#optionen .option-btn');
    buttons.forEach(b => b.onclick = null);
    const korrekt = i === f.richtigIndex;
    buttons[i].classList.add(korrekt ? 'richtig' : 'falsch');
    if (!korrekt) buttons[f.richtigIndex].classList.add('richtig');
    verarbeiteQuizAntwort(f, korrekt, undefined, () => renderOptionen(f));
  }

  function renderKeypad(f) {
    eingabe = '';
    const anzeige = document.getElementById('zahl-anzeige');
    const pad = document.getElementById('keypad');
    pad.innerHTML = '';
    anzeige.textContent = ' ';
    const tasten = ['1','2','3','4','5','6','7','8','9','⌫','0','OK'];
    tasten.forEach(t => {
      const btn = document.createElement('div');
      btn.className = 'key-btn' + (t === 'OK' ? ' ok' : t === '⌫' ? ' del' : '');
      btn.textContent = t;
      btn.onclick = () => {
        if (t === '⌫') {
          eingabe = eingabe.slice(0, -1);
        } else if (t === 'OK') {
          if (eingabe === '') return;
          document.querySelectorAll('.key-btn').forEach(b => b.onclick = null);
          const korrekt = parseInt(eingabe, 10) === f.antwort;
          verarbeiteQuizAntwort(f, korrekt, f.antwort, () => renderKeypad(f));
          return;
        } else if (eingabe.length < 6) {
          eingabe += t;
        }
        anzeige.textContent = eingabe === '' ? ' ' : eingabe;
      };
      pad.appendChild(btn);
    });
  }

  // Zentrale Weiche fuer JEDE Antwort (MC wie numerisch). neuerVersuch() baut
  // die Eingabe-UI (Keypad/Optionen) fuer den 2. Versuch frisch auf.
  function verarbeiteQuizAntwort(f, korrekt, richtigeAntwort, neuerVersuch) {
    const hatHilfe = typeof f.hilfe === 'string' && f.hilfe.length > 0;

    if (!korrekt && hatHilfe && versuch === 1) {
      versuch = 2;
      const fb = document.getElementById('feedback');
      fb.className = 'feedback nok';
      fb.textContent = '✘ Leider falsch. Versuch es noch einmal!';
      document.getElementById('hilfe-bereich').innerHTML =
        `<div class="btn-hilfe" id="btn-hilfe">💡 Hilfe anzeigen (dann keine ⭐ für diese Aufgabe)</div>`;
      document.getElementById('btn-hilfe').onclick = () => zeigeHilfe(f);
      neuerVersuch();
      return;
    }

    let faktor = 1;
    if (hatHilfe) {
      if (hilfeGenutzt) faktor = 0;
      else if (versuch >= 2) faktor = 0.5;
    }
    abschlussFrage(korrekt, richtigeAntwort, faktor);
  }

  function zeigeHilfe(f) {
    hilfeGenutzt = true;
    document.getElementById('hilfe-bereich').innerHTML = `
      <div class="hilfe-box">
        <div class="hilfe-warnung">⚠️ Für diese Aufgabe gibt es jetzt keine ⭐ mehr, auch wenn du sie danach richtig löst.</div>
        ${f.hilfe}
      </div>
    `;
  }

  function abschlussFrage(korrekt, richtigeAntwort, faktor) {
    if (faktor === undefined) faktor = 1;
    const gained = Storage.addAntwort(session.fach, korrekt, faktor);
    if (korrekt) session.richtigCount++;
    session.sessionSterne += gained;
    updateTopbar();

    const f = session.fragen[session.index];
    // Fuer die Kategorien-/Karteikarten-Gewichtung zaehlt nur ein sauberer
    // 1.-Versuch-Erfolg als "gewusst" - 2. Versuch oder Hilfe heisst: noch
    // nicht sicher, soll also weiterhin oefter drankommen.
    const giltAlsGewusst = korrekt && faktor >= 1;
    if (typeof f.aufAntwort === 'function') f.aufAntwort(giltAlsGewusst);
    if (!giltAlsGewusst && session.wiederholeFalsche) {
      const neuePosition = Math.min(session.fragen.length, session.index + 4);
      // Fragen mit neueVersion() (z.B. Tagesaufgabe) kommen mit NEUEN Zahlen
      // desselben Aufgabentyps zurueck, statt wortwoertlich identisch (bei den
      // Malfolgen-Fakten OHNE neueVersion bleibt es bewusst dieselbe Frage -
      // das ist dort ja genau die Karteikarte, die geuebt werden soll).
      const wiederholung = typeof f.neueVersion === 'function' ? f.neueVersion() : f;
      session.fragen.splice(neuePosition, 0, wiederholung);
    }

    const fb = document.getElementById('feedback');
    if (korrekt) {
      fb.className = 'feedback ok';
      if (faktor === 0) fb.textContent = '✔ Richtig! Aber keine ⭐ (Hilfe genutzt).';
      else if (faktor < 1) fb.textContent = `✔ Richtig! +${gained} ⭐ (halbe Punkte, 2. Versuch)`;
      else fb.textContent = '✔ Richtig! +' + gained + ' ⭐';
    } else {
      fb.className = 'feedback nok';
      fb.textContent = richtigeAntwort !== undefined
        ? '✘ Leider falsch. Richtig wäre: ' + richtigeAntwort
        : '✘ Leider falsch.';
    }
    document.getElementById('hilfe-bereich').innerHTML = '';

    setTimeout(() => {
      session.index++;
      if (session.index >= session.fragen.length) {
        renderErgebnis();
      } else {
        renderQuestion();
      }
    }, 1400);
  }

  function renderErgebnis() {
    const total = session.fragen.length;
    const quote = Math.round((session.richtigCount / total) * 100);
    let emoji = '🙂';
    if (quote >= 90) emoji = '🏆';
    else if (quote >= 70) emoji = '🎉';
    else if (quote >= 40) emoji = '👍';

    render(`
      <div class="result-card">
        <div class="result-emoji">${emoji}</div>
        <div class="result-title">${session.richtigCount} von ${total} richtig!</div>
        <div class="result-sterne">Du hast ${session.sessionSterne} ⭐ verdient</div>
        <div class="btn-primary" onclick="App.restartLast()">Nochmal üben</div>
        <div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);" onclick="App.gotoHome()">Zum Hauptmenü</div>
      </div>
    `);

    if (typeof session.onFinish === 'function') session.onFinish();
    FernSync.meldeLernsetErledigt(session.titel, `${session.richtigCount} von ${total} richtig`, session.sessionSterne);
  }

  let lastStarter = null;
  function setLastStarter(fn) { lastStarter = fn; }
  function restartLast() { if (lastStarter) lastStarter(); else gotoHome(); }

  // #app-root hat eine feste Hoehe (100% minus Topbar) und scrollt selbst -
  // die Kiosk-WebView passt diese "100%" beim Aufklappen der Bildschirm-
  // tastatur aber oft NICHT an (kein echtes Resize des Layout-Viewports),
  // wodurch Eingabefelder im unteren Bereich hinter der Tastatur verschwinden
  // koennen. window.visualViewport meldet die TATSAECHLICH sichtbare Hoehe
  // zuverlaessig - darauf reagieren wir, indem #app-root manuell nachgezogen
  // wird, damit sein Scrollbereich wieder zur echten sichtbaren Flaeche passt.
  function passeHoeheAnBildschirmtastaturAn() {
    if (!window.visualViewport) return;
    const anpassen = () => {
      const root = document.getElementById('app-root');
      if (!root) return;
      const topbar = document.getElementById('topbar');
      const topbarHoehe = topbar ? topbar.offsetHeight : 60;
      root.style.height = Math.max(0, window.visualViewport.height - topbarHoehe) + 'px';
    };
    window.visualViewport.addEventListener('resize', anpassen);
    anpassen();
  }

  function init() {
    document.getElementById('topbar-home').innerHTML = Icons.svg('home');
    gotoHome();
    updateAkkuAnzeige();
    setInterval(updateAkkuAnzeige, 60000);
    initDevElternSimulation();
    FernSync.init();
    passeHoeheAnBildschirmtastaturAn();
  }

  return {
    init, gotoHome, render, subMenuHtml, updateTopbar,
    startQuizSession, setLastStarter, restartLast, setOnLeaveScreen,
    oeffneEinstellungen, aktualisiereRegelFormular, fuegeRegelHinzu, loescheRegel,
    fortschrittWirklichZuruecksetzen,
    fuegeBelohnungHinzu, belohnungLoeschen, belohnungEinloesen
  };
})();
