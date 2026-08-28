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

  // Merkt sich, ob GERADE der Startbildschirm angezeigt wird - noetig, damit
  // FernSync nach einem Hintergrund-Poll (z.B. neue Chatnachricht von Papa)
  // das Ungelesen-Badge live nachtragen kann, OHNE Max von einem anderen
  // Bildschirm (z.B. mitten in einer Aufgabenfolge) zurueck nach Hause zu
  // reissen (siehe App.aktualisiereHomeFallsAktiv/FernSync.poll). Vorher
  // wurde chatUngelesen() nur EINMALIG beim Aufruf von gotoHome() ausgewertet -
  // ein Poll, der waehrend Max schon auf dem Startbildschirm sitzt (oder kurz
  // nach dem App-Start, bevor der erste Poll fertig ist) fertig wird, aendert
  // zwar Storage, aber ohne Neu-Rendern blieb das Badge unsichtbar.
  let istAufHomeBildschirm = false;

  function render(html) {
    istAufHomeBildschirm = false;
    if (onLeaveScreen) {
      const fn = onLeaveScreen;
      onLeaveScreen = null;
      fn();
    }
    root().innerHTML = html;
    updateTopbar();
  }

  function aktualisiereHomeFallsAktiv() {
    if (istAufHomeBildschirm) gotoHome();
  }

  // Ruft ausschließlich bereits bestehende Fach-Funktionen auf, keine eigene
  // Aufgabenlogik. Welche(s) Fach(-Faecher) heute Pflicht sind + mit wie
  // vielen Aufgaben, kommt aus Storage.getTagesPensum (per Regeln in
  // App.oeffneEinstellungen einstellbar, inkl. Wochentag-Regeln) - alle nicht
  // gelisteten Faecher bleiben trotzdem im Tagesplan, nur als "Extra"
  // markiert, damit Max jederzeit mehr üben kann, ohne dass ihm etwas
  // gesperrt wird.
  const GESCHICHTEN_STATUS_PRAEFIX = { neu: 'Lesen: ', weiter: 'Weiterlesen: ', nochmal: 'Nochmal lesen: ' };

  const TAGESPLAN_FACH_META = {
    mathe: { icon: 'tagesaufgabe', titel: 'Gemischte Aufgaben üben', fachName: 'Mathe', onclick: 'Mathe.starteTagesaufgabe()' },
    deutsch: { icon: 'rechtschreibung', titel: 'Rechtschreibung üben', fachName: 'Deutsch', onclick: 'Deutsch.starteRechtschreibung()' },
    heimat: { icon: 'verkehrszeichen', titel: 'Verkehrszeichen üben', fachName: 'Heimat & Sachkunde', onclick: 'Heimatkunde.starteQuiz()' }
  };

  // Ungelesen-Badge auf der Chat-Kachel (siehe fernsync.js pruefeNeueChatNachricht
  // fuers Aktualisieren von letzteChatVonPapa, chat.js fuers Loeschen beim
  // tatsaechlichen Oeffnen des Chats).
  function chatUngelesen() {
    const letzte = Storage.getLetzteChatVonPapa();
    return !!(letzte && letzte.id > Storage.getLetzteGeseheneChatId());
  }

  function baueTagesplan() {
    const offen = Geschichten.naechsteOffene();
    const pensum = Storage.getTagesPensum();
    const pensumFaecher = pensum.map(p => p.fach);

    const pflichtChips = pensum.map(p => {
      const erledigt = Storage.getTagesPensumErledigt(p.fach);
      const geschafft = erledigt >= p.anzahl;
      return Object.assign({ fach: p.fach }, TAGESPLAN_FACH_META[p.fach], {
        badge: geschafft ? '✅ Geschafft' : `${erledigt} von ${p.anzahl}`,
        geschafft
      });
    });
    const extraChips = Object.keys(TAGESPLAN_FACH_META)
      .filter(fach => !pensumFaecher.includes(fach))
      .map(fach => Object.assign({ fach }, TAGESPLAN_FACH_META[fach], { badge: 'Extra', extra: true }));

    return [
      ...pflichtChips, ...extraChips,
      {
        // Fest, jeden Tag im Tagesplan (kein Regel-gesteuertes Pflichtfach wie
        // oben, da Uli hierfuer keine Tages-/Wochentag-Differenzierung wollte,
        // nur "jeden Tag ueben") - eigenes Karteikarten-Deck sorgt schon fuer
        // Abdeckung ueber Tage hinweg, daher keine "X von Y"-Zielanzahl noetig.
        fach: 'mathe', icon: 'malfolgen', fachName: 'Mathe',
        titel: 'Malfolgen üben', onclick: 'Mathe.starteMalfolgenKarten()'
      },
      {
        fach: 'geschichten', icon: 'geschichten', fachName: 'Geschichten',
        titel: GESCHICHTEN_STATUS_PRAEFIX[offen.status] + offen.titel,
        onclick: `Geschichten.leseBuch('${offen.id}')`
      }
    ];
  }

  function gotoHome() {
    // Verlassen des Eltern-Bereichs verwirft einen unfertigen Tagesregeln-
    // Entwurf (siehe fuegeAusnahmeHinzu/loescheAusnahme/speichereTagesregeln) -
    // konsistent mit dem "Abbrechen" bei "Fortschritt zuruecksetzen" weiter
    // unten: nur ein expliziter Speichern-Klick persistiert etwas wirklich.
    regelnEntwurfAusnahmen = null;
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
          ${t.badge ? `<span class="tagesplan-chip-badge${t.extra ? ' tagesplan-chip-badge-extra' : ''}${t.geschafft ? ' tagesplan-chip-badge-geschafft' : ''}">${t.badge}</span>` : ''}
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
        <div class="menu-card accent-spiele" onclick="App.renderSpieleMenu()">
          <span class="menu-icon icon-spiele">${Icons.svg('spielen')}</span>
          <span class="menu-text"><span class="menu-label">Spiele</span><span class="menu-progress">Schach, Schiffe versenken &amp; Mau-Mau</span></span>
        </div>
        <div class="menu-card accent-chat" onclick="Chat.starteAnsicht()">
          <span class="menu-icon icon-chat">${Icons.svg('chat')}${chatUngelesen() ? '<span class="menu-badge"></span>' : ''}</span>
          <span class="menu-text"><span class="menu-label">Chat mit Papa</span><span class="menu-progress">${chatUngelesen() ? '🔴 Neue Nachricht!' : 'Nachricht schreiben'}</span></span>
        </div>
        <div class="menu-card accent-belohnung" onclick="Belohnungen.renderMenu()">
          <span class="menu-icon icon-belohnung">${Icons.svg('geschenk')}</span>
          <span class="menu-text"><span class="menu-label">Belohnungen</span><span class="menu-progress">${Storage.getGuthaben()} ⭐ gesammelt</span></span>
        </div>
      </div>
    `);
    istAufHomeBildschirm = true;
  }

  // Oberordner "Spiele" - buendelt alle eigenstaendigen Spiele-Module hinter
  // einer gemeinsamen Home-Kachel statt jedes einzeln auf der Startseite zu
  // zeigen (skaliert besser, je mehr Spiele dazukommen). Nutzt bewusst
  // dieselben .menu-grid/.menu-card-Klassen wie gotoHome() (nicht die
  // schlichteren .sub-card aus subMenuHtml), damit die Fortschrittsanzeige
  // je Spiel (Stufe/Siege) erhalten bleibt.
  function renderSpieleMenu() {
    render(`
      <div class="back-row"><span class="back-btn" onclick="App.gotoHome()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Spiele</div>
      <div class="menu-grid">
        <div class="menu-card accent-schach" onclick="Schach.renderMenu()">
          <span class="menu-icon icon-schach">${Icons.svg('schach')}</span>
          <span class="menu-text"><span class="menu-label">Schach</span><span class="menu-progress">${Schach.aktuelleStufeName()}</span></span>
        </div>
        <div class="menu-card accent-schiffe" onclick="Schiffeversenken.renderMenu()">
          <span class="menu-icon icon-schiffe">${Icons.svg('schiffe')}</span>
          <span class="menu-text"><span class="menu-label">Schiffe versenken</span><span class="menu-progress">${Schiffeversenken.fortschrittText()}</span></span>
        </div>
        <div class="menu-card accent-maumau" onclick="Maumau.renderMenu()">
          <span class="menu-icon icon-maumau">${Icons.svg('maumau')}</span>
          <span class="menu-text"><span class="menu-label">Mau-Mau</span><span class="menu-progress">${Maumau.fortschrittText()}</span></span>
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

  const REGEL_FACH_NAMEN = { mathe: 'Mathe', deutsch: 'Deutsch', heimat: 'Heimat & Sachkunde' };
  const WOCHENTAG_NAMEN = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  // Mo-So-Reihenfolge fuer die Wochentabelle (Storage/Date.getDay() zaehlt
  // Sonntag=0, fuer die Anzeige aber gewohnte Wochenreihenfolge Mo zuerst).
  const WOCHENTAGE_MO_SO = [
    { tag: 1, kurz: 'Mo' }, { tag: 2, kurz: 'Di' }, { tag: 3, kurz: 'Mi' }, { tag: 4, kurz: 'Do' },
    { tag: 5, kurz: 'Fr' }, { tag: 6, kurz: 'Sa' }, { tag: 0, kurz: 'So' }
  ];

  function regelText(r) {
    const fachName = REGEL_FACH_NAMEN[r.fach] || r.fach;
    const anzahlText = r.anzahl ? ` (${r.anzahl} Aufgaben)` : '';
    if (r.typ === 'einzeltag') return `${formatDatum(r.datum)}: ${fachName}${anzahlText}`;
    if (r.typ === 'zeitraum') return `${formatDatum(r.von)} – ${formatDatum(r.bis)}: ${fachName}${anzahlText}`;
    if (r.typ === 'wochentag') return `Jeden ${WOCHENTAG_NAMEN[r.tag]}: ${fachName}${anzahlText}`;
    return `Jedes Wochenende: ${fachName}${anzahlText}`;
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
  // Name+Kosten direkt bearbeitbar (statt loeschen+neu anlegen) - Storage.
  // aendereBelohnung() gab es intern schon, war hier aber noch nicht verdrahtet.
  // Wichtig fuer Uli: die Kosten sind Erfahrungswerte, die sich nach echtem
  // Test mit Max noch anpassen lassen muessen sollen, ohne den Verlauf/die
  // Reihenfolge zu verlieren.
  function belohnungenHtml() {
    const guthaben = Storage.getGuthaben();
    const liste = Storage.getBelohnungen();
    if (!liste.length) return '<div class="regel-leer">Noch keine Belohnungen eingetragen.</div>';
    return liste.map(b => {
      const erreicht = guthaben >= b.kosten;
      return `
        <div class="belohnung-edit-zeile">
          <input type="text" class="regel-input" id="bel-name-${b.id}" value="${b.name}">
          <input type="number" class="regel-input belohnung-edit-kosten" id="bel-kosten-${b.id}" value="${b.kosten}" min="1">
          <span class="btn-hilfe" style="margin:0; padding:8px 14px;" onclick="App.belohnungSpeichern('${b.id}')">Speichern</span>
          ${erreicht ? `<span class="btn-hilfe" style="margin:0; padding:8px 14px;" onclick="App.belohnungEinloesen('${b.id}')">Einlösen</span>` : ''}
          <span class="regel-loeschen" onclick="App.belohnungLoeschen('${b.id}')">${Icons.svg('loeschen')}</span>
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

  function belohnungSpeichern(id) {
    const name = document.getElementById('bel-name-' + id).value.trim();
    const kosten = parseInt(document.getElementById('bel-kosten-' + id).value, 10);
    if (!name || !kosten || kosten <= 0) return;
    Storage.aendereBelohnung(id, name, kosten);
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

  // Liefert die aktuell gueltigen Wochentag-Regeln entweder aus dem GERADE
  // sichtbaren Grid-DOM (wenn Max/Uli schon auf diesem Bildschirm ist und
  // z.B. eine Ausnahme hinzufuegt/loescht - siehe fuegeAusnahmeHinzu/
  // loescheAusnahme, sonst wuerden ungespeicherte Grid-Eingaben beim
  // Neuzeichnen verloren gehen) oder, falls das Grid noch gar nicht existiert
  // (allererstes Oeffnen), frisch aus dem zwischengespeicherten Server-Stand
  // (siehe Storage.getFernRegeln). Ein leeres NodeList unterscheidet zuverlaessig
  // beide Faelle, weil das Grid beim allerersten Oeffnen noch nicht im DOM ist.
  function wochentagRegelnAusDomOderStorage() {
    const felder = document.querySelectorAll('.regel-woche-zelle');
    if (felder.length === 0) return Storage.getFernRegeln().filter(r => r.typ === 'wochentag');
    const ergebnis = [];
    felder.forEach(input => {
      const wert = parseInt(input.value, 10);
      if (wert > 0) ergebnis.push({ typ: 'wochentag', tag: parseInt(input.dataset.tag, 10), fach: input.dataset.fach, anzahl: wert });
    });
    return ergebnis;
  }

  // Ungespeicherter Entwurf der Ausnahmen-Liste (Einzeltag/Zeitraum, siehe
  // fuegeAusnahmeHinzu/loescheAusnahme) - null = noch keine Aenderung seit dem
  // letzten Server-Stand, dann wird direkt aus Storage.getFernRegeln() gelesen.
  // Wird beim Verlassen des Eltern-Bereichs (gotoHome) und nach erfolgreichem
  // Speichern (speichereTagesregeln) wieder auf null zurueckgesetzt.
  let regelnEntwurfAusnahmen = null;

  function aktuelleAusnahmen() {
    return regelnEntwurfAusnahmen !== null
      ? regelnEntwurfAusnahmen
      : Storage.getFernRegeln().filter(r => r.typ !== 'wochentag');
  }

  // Fach x Wochentag-Raster statt "eine Regel nach der anderen hinzufuegen" -
  // Uli-Wunsch 28.08.2026: "einstellbar, wie gross das Pensum pro Fach pro Tag
  // ist. und das uebersichtlich, leicht verstaendlich". Eine leere Zelle
  // bedeutet "Standardwert" (siehe Storage.FAECHER_STANDARD_ANZAHL), keine
  // Zelle sperrt irgendetwas - nicht hervorgehobene Faecher bleiben fuer Max
  // weiterhin als "Extra" antippbar (siehe Storage.getTagesPensum).
  function wochentabelleHtml(wochentagRegeln) {
    function wertFuer(fach, tag) {
      const r = wochentagRegeln.find(x => x.fach === fach && x.tag === tag);
      return r ? r.anzahl : '';
    }
    const kopf = `<div class="regel-woche-zeile regel-woche-kopf">
      <div class="regel-woche-fach-label"></div>
      ${WOCHENTAGE_MO_SO.map(w => `<div class="regel-woche-tag-label">${w.kurz}</div>`).join('')}
    </div>`;
    const zeilen = Object.keys(REGEL_FACH_NAMEN).map(fach => `
      <div class="regel-woche-zeile">
        <div class="regel-woche-fach-label">${REGEL_FACH_NAMEN[fach]}</div>
        ${WOCHENTAGE_MO_SO.map(w => `<input type="number" min="1" class="regel-woche-zelle regel-input" data-fach="${fach}" data-tag="${w.tag}" value="${wertFuer(fach, w.tag)}" placeholder="Std.">`).join('')}
      </div>
    `).join('');
    return `<div class="regel-woche-tabelle">${kopf}${zeilen}</div>`;
  }

  function ausnahmenHtml(ausnahmen) {
    if (!ausnahmen.length) return '<div class="regel-leer">Keine Ausnahmen.</div>';
    return ausnahmen.map((r, i) => `
      <div class="regel-zeile">
        <span>${regelText(r)}</span>
        <span class="regel-loeschen" onclick="App.loescheAusnahme(${i})">${Icons.svg('loeschen')}</span>
      </div>
    `).join('');
  }

  function oeffneEinstellungen(resetBestaetigung) {
    const wochentagRegeln = wochentagRegelnAusDomOderStorage();
    const ausnahmen = aktuelleAusnahmen();

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

      <div class="welcome" style="margin-top:32px;">Fach-Tagesregeln</div>
      <div class="lese-text">Wie viele Aufgaben soll Max pro Fach an welchem Wochentag lösen? Zelle leer lassen = Standardwert. Diese Regeln gelten gleichermaßen auf dem Tablet und in Papas Handy-App – eine Änderung hier wirkt sich dort genauso aus (und umgekehrt), sobald beide Seiten wieder online sind. Nicht hervorgehobene Fächer bleiben für Max immer zusätzlich als "Extra" antippbar.</div>

      <div class="regel-karte">
        ${wochentabelleHtml(wochentagRegeln)}

        <div class="fortschritt-unterueberschrift" style="margin-top:20px;">Ausnahmen (z. B. Ferien)</div>
        <div class="regel-liste">${ausnahmenHtml(ausnahmen)}</div>
        <div class="regel-formular">
          <select id="regel-typ" class="regel-input" onchange="App.aktualisiereRegelFormular()">
            <option value="einzeltag">Einzelner Tag</option>
            <option value="zeitraum">Zeitraum</option>
          </select>
          <select id="regel-fach" class="regel-input">
            <option value="mathe">Mathe</option>
            <option value="deutsch">Deutsch</option>
            <option value="heimat">Heimat & Sachkunde</option>
          </select>
          <div id="regel-daten" class="regel-daten"><input type="date" id="regel-datum" class="regel-input"></div>
          <input type="number" id="regel-anzahl" class="regel-input" placeholder="Anzahl Aufgaben (leer = Standard)" min="1">
          <div class="btn-primary" style="background:var(--muted);color:var(--ink);" onclick="App.fuegeAusnahmeHinzu()">+ Ausnahme (noch nicht gespeichert)</div>
        </div>

        <div id="regeln-hinweis" class="reihen-hinweis"></div>
        <div class="btn-primary" onclick="App.speichereTagesregeln()">Tagesregeln speichern</div>
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

      ${versionInfoHtml()}
    `);
  }

  // Bisher gab es KEINE sichtbare Versionsanzeige irgendwo in der App (nur
  // Logcat/Toast waehrend eines Updates) - fuehrte wiederholt dazu, dass nach
  // einem App-Update unklar war, ob es wirklich angekommen ist (13.08.2026).
  // AndroidBridge existiert nur in der echten Kiosk-WebView, nicht in der
  // Browser-Vorschau (siehe initDevElternSimulation).
  function versionInfoHtml() {
    if (typeof AndroidBridge === 'undefined') return '';
    const appVersion = AndroidBridge.getAppVersion ? AndroidBridge.getAppVersion() : '?';
    const contentVersion = AndroidBridge.getContentVersion ? AndroidBridge.getContentVersion() : '';
    return `
      <div class="version-info">App-Version ${appVersion}${contentVersion ? ' · Inhalte ' + contentVersion : ''}</div>
    `;
  }

  function fortschrittWirklichZuruecksetzen() {
    Storage.resetFortschritt();
    oeffneEinstellungen();
  }

  // Nur noch Einzeltag/Zeitraum (Ausnahmen) - Wochentag/Wochenende werden
  // jetzt ueber die Wochentabelle abgedeckt (siehe wochentabelleHtml).
  function aktualisiereRegelFormular() {
    const typ = document.getElementById('regel-typ').value;
    const container = document.getElementById('regel-daten');
    if (typ === 'zeitraum') {
      container.innerHTML =
        '<input type="date" id="regel-von" class="regel-input"> <input type="date" id="regel-bis" class="regel-input">';
    } else {
      container.innerHTML = '<input type="date" id="regel-datum" class="regel-input">';
    }
  }

  // Fuegt eine Ausnahme NUR zum Entwurf hinzu (siehe regelnEntwurfAusnahmen) -
  // persistiert wird erst durch einen expliziten Klick auf "Tagesregeln
  // speichern" (App.speichereTagesregeln), damit ein Tippfehler nicht sofort
  // live auf dem Server landet und auch ungespeicherte Wochentabellen-
  // Eingaben beim Neuzeichnen nicht verloren gehen (siehe
  // wochentagRegelnAusDomOderStorage).
  function fuegeAusnahmeHinzu() {
    const typ = document.getElementById('regel-typ').value;
    const fach = document.getElementById('regel-fach').value;
    const anzahlRoh = parseInt(document.getElementById('regel-anzahl').value, 10);
    let regel;
    if (typ === 'zeitraum') {
      const von = document.getElementById('regel-von').value;
      const bis = document.getElementById('regel-bis').value;
      if (!von || !bis) return;
      regel = { typ, von, bis, fach };
    } else {
      const datum = document.getElementById('regel-datum').value;
      if (!datum) return;
      regel = { typ: 'einzeltag', datum, fach };
    }
    if (anzahlRoh > 0) regel.anzahl = anzahlRoh;
    regelnEntwurfAusnahmen = aktuelleAusnahmen().concat([regel]);
    oeffneEinstellungen();
  }

  function loescheAusnahme(i) {
    const neu = aktuelleAusnahmen().slice();
    neu.splice(i, 1);
    regelnEntwurfAusnahmen = neu;
    oeffneEinstellungen();
  }

  // Persistiert Wochentabelle + Ausnahmen zusammen als EINE neue Fern-Regel-
  // Liste (siehe FernSync.speichereRegeln/backend POST /api/regeln) - Server
  // ist die einzige Quelle der Wahrheit, sowohl Tablet als auch Papas Handy-
  // App lesen/schreiben dieselbe Liste (Uli-Wunsch 28.08.2026).
  async function speichereTagesregeln() {
    const regeln = wochentagRegelnAusDomOderStorage().concat(aktuelleAusnahmen());
    const hinweis = document.getElementById('regeln-hinweis');
    if (hinweis) hinweis.textContent = 'Speichert …';
    const erfolg = await FernSync.speichereRegeln(regeln);
    if (erfolg) {
      regelnEntwurfAusnahmen = null;
      oeffneEinstellungen();
    } else {
      const hinweisNeu = document.getElementById('regeln-hinweis');
      if (hinweisNeu) hinweisNeu.textContent = 'Keine Verbindung – nicht gespeichert. Bitte später erneut versuchen.';
    }
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
      fach, fragen, index: 0,
      sessionSterne: (config && config.startSessionSterne) || 0,
      richtigCount: (config && config.startRichtigCount) || 0,
      onFinish: config && config.onFinish,
      // Lesbarer Titel fuer die Papa-Auswertung/Push-Meldung (siehe
      // renderErgebnis) - faellt auf den fach-Kuerzel zurueck, wenn keiner
      // mitgegeben wurde.
      titel: (config && config.titel) || fach,
      // Wenn true: falsch beantwortete Fragen werden ein paar Fragen spaeter
      // erneut eingereiht (Karteikarten-Prinzip), statt einfach zu verschwinden.
      wiederholeFalsche: !!(config && config.wiederholeFalsche),
      // aktivitaet: Schluessel fuer Storage.setOffeneSession/getOffeneSession -
      // wenn gesetzt, wird der Fortschritt nach jeder Antwort gespeichert, damit
      // eine unterbrochene Aufgabenfolge (z.B. Max wechselt zwischendurch zum
      // Lesen) am selben Tag fortgesetzt werden kann, statt verloren zu gehen
      // (siehe Aufrufer wie Mathe.starteTagesaufgabe, die vor dem Start selbst
      // pruefen, ob eine offene Session existiert, und dann nur die FEHLENDEN
      // Fragen neu erzeugen). anzeigeOffset verschiebt "Frage X/Y" entsprechend,
      // damit die Nummerierung beim Fortsetzen weiterlaeuft statt neu bei 1
      // anzufangen.
      aktivitaet: config && config.aktivitaet,
      anzeigeOffset: (config && config.anzeigeOffset) || 0,
      // Wenn gesetzt: jede beantwortete Frage zaehlt in Storage.getTagesPensum-
      // Erledigt fuer dieses Fach mit (siehe abschlussFrage) - nur bei den
      // Pflicht-faehigen Tagesplan-Aktivitaeten (Mathe-Tagesaufgabe, Deutsch-
      // Rechtschreibung, Heimatkunde-Verkehrszeichen), nicht bei jeder Uebung.
      pensumFach: config && config.pensumFach,
      // Protokoll "welche Frage, welches Ergebnis" fuer Papas Auswertung (siehe
      // abschlussFrage/renderErgebnis) - macht eine abgeschlossene Aufgabenfolge
      // dort anklickbar, damit sichtbar wird, WELCHE Aufgaben Max richtig/falsch
      // hatte, statt nur einer Gesamtquote (Uli-Wunsch 22.08.2026). Bei einer
      // fortgesetzten Aufgabenfolge (siehe config.startVerlauf/aktivitaet) wird
      // der bisherige Teil uebernommen, statt beim Fortsetzen zu verschwinden.
      verlauf: (config && config.startVerlauf) || []
    };
    renderQuestion();
  }

  /** Rohe frage-HTML (kann <br>/<span> enthalten, siehe z.B. mathe.js) zu
   *  lesbarem Klartext fuer die Aufgaben-Verlaufsliste - keine echte HTML-
   *  Darstellung noetig, nur ein kurzer Wiedererkennungstext. */
  function klartextFrage(html) {
    return String(html || '').replace(/<br\s*\/?>/gi, ' – ').replace(/<[^>]+>/g, '').trim();
  }

  // Zweiter Versuch + Hilfe-Button: nur Fragen mit eigenem f.hilfe (Erklaerung
  // mit einem ANDEREN Beispiel desselben Aufgabentyps) bekommen die neue
  // Ablauf-Logik. Fragen ohne hilfe (z.B. andere Faecher, die die hilfe noch
  // nicht eingepflegt haben) verhalten sich wie bisher: 1 Versuch, direkt fertig.
  // Der Hilfe-Button ist von Anfang an sichtbar (nicht erst nach einer falschen
  // 1. Antwort, siehe renderQuestion) - Max soll bei Bedarf JEDERZEIT
  // nachschauen koennen, auch schon VOR dem ersten Versuch. Kostet wie bisher
  // die Punkte fuer diese eine Aufgabe (siehe zeigeHilfe/abschlussFrage).
  let eingabe = '';
  let versuch = 1;
  let hilfeGenutzt = false;
  // Was Max beim ALLERERSTEN Versuch dieser Frage falsch eingegeben/angetippt
  // hat (Uli-Wunsch 28.08.2026: "ich will genau sehen [...] welches falsche
  // Ergebnis er hatte", nicht nur eine richtig/falsch-Quote) - wird in
  // verarbeiteQuizAntwort gesetzt, bevor ein 2. Versuch die Eingabe ueberschreibt,
  // und landet als falscheAntwort im verlauf-Eintrag (siehe abschlussFrage).
  let ersteFalscheAntwort = null;
  // Bei MC-Fragen zusaetzlich der Index der zuerst angetippten (falschen)
  // Option - ermoeglicht es Papas Auswertung, die echten Antwort-Buttons mit
  // derselben richtig/falsch-Faerbung wie auf dem Tablet nachzubauen (siehe
  // aufgabenVerlaufHtml im Webapp-Code), statt nur Text zu zeigen.
  let ersterGegebenerIndex = null;

  function renderQuestion() {
    const f = session.fragen[session.index];
    const total = session.fragen.length + session.anzeigeOffset;
    const nr = session.index + session.anzeigeOffset + 1;
    versuch = 1;
    hilfeGenutzt = false;
    ersteFalscheAntwort = null;
    ersterGegebenerIndex = null;

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

    if (typeof f.hilfe === 'string' && f.hilfe.length > 0) {
      zeigeHilfeButton(f);
    }
  }

  function zeigeHilfeButton(f) {
    document.getElementById('hilfe-bereich').innerHTML =
      `<div class="btn-hilfe" id="btn-hilfe">💡 Hilfe anzeigen (dann keine ⭐ für diese Aufgabe)</div>`;
    document.getElementById('btn-hilfe').onclick = () => zeigeHilfe(f);
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
    verarbeiteQuizAntwort(f, korrekt, undefined, () => renderOptionen(f), f.optionen[i], i);
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
          verarbeiteQuizAntwort(f, korrekt, f.antwort, () => renderKeypad(f), eingabe);
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
  function verarbeiteQuizAntwort(f, korrekt, richtigeAntwort, neuerVersuch, gegebeneAntwort, gegebenerIndex) {
    const hatHilfe = typeof f.hilfe === 'string' && f.hilfe.length > 0;

    // Muss VOR dem 2.-Versuch-Abzweig passieren, sonst geht die Eingabe des
    // 1. (falschen) Versuchs verloren, sobald neuerVersuch() das Keypad/die
    // Optionen fuer den 2. Versuch neu aufbaut.
    if (!korrekt && versuch === 1) {
      ersteFalscheAntwort = gegebeneAntwort;
      ersterGegebenerIndex = gegebenerIndex;
    }

    if (!korrekt && hatHilfe && versuch === 1) {
      versuch = 2;
      const fb = document.getElementById('feedback');
      fb.className = 'feedback nok';
      fb.textContent = '✘ Leider falsch. Versuch es noch einmal!';
      // #hilfe-bereich bleibt unangetastet: neuerVersuch() baut nur Keypad/
      // Optionen neu auf. Stand dort schon der Hilfe-Button (siehe
      // zeigeHilfeButton in renderQuestion), bleibt er einfach stehen; wurde
      // die Hilfe schon VOR diesem 1. Versuch genutzt, bleibt die Erklaerung
      // stehen statt wieder durch den Button ersetzt zu werden.
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
    if (session.pensumFach) Storage.meldeTagespensumAntwort(session.pensumFach);
    updateTopbar();

    const f = session.fragen[session.index];
    // Fuer die Kategorien-/Karteikarten-Gewichtung zaehlt nur ein sauberer
    // 1.-Versuch-Erfolg als "gewusst" - 2. Versuch oder Hilfe heisst: noch
    // nicht sicher, soll also weiterhin oefter drankommen.
    const giltAlsGewusst = korrekt && faktor >= 1;
    if (typeof f.aufAntwort === 'function') f.aufAntwort(giltAlsGewusst);
    // Fuer die Aufgaben-Verlaufsliste in Papas Auswertung: EIN Eintrag pro
    // abgeschlossener Frage (auch bei "wiederholeFalsche"-Wiedervorlage
    // spaeter ein zweiter, das ist gewollt - zeigt ehrlich, dass sie beim
    // ersten Mal noch nicht sass). richtigeAntwort/falscheAntwort zusaetzlich
    // zum reinen richtig/falsch (Uli-Wunsch 28.08.2026), damit Papas
    // Auswertung nicht nur zeigt, DASS eine Aufgabe beim 1. Versuch nicht
    // sass, sondern auch WELCHE falsche Zahl/Option Max gegeben hat - nur bei
    // MC/numerischen Fragen sinnvoll befuellt (Malfolgen-Karteikarten haben
    // gar keine "Eingabe", siehe Mathe.bewerteMalfolgenKarte).
    // frageHtml/lesetextHtml/typ/optionen/richtigIndex/gegebenIndex zusaetzlich
    // seit 28.08.2026 (2. Uli-Wunsch am selben Tag: "die Aufgaben ... anklick-
    // bar machen, sodass ich [...] die Aufgabe so sehe wie Max" - die reine
    // Klartext-Zeile allein wirkte z.B. bei "(mit Übertrag)"/"(ohne Übertrag)"
    // ohne die echte Formatierung/Kontext verwirrend). frageHtml ist bewusst
    // NICHT klartextFrage(...), sondern die rohe Frage MIT <br>/<span>-
    // Formatierung, damit Papas Auswertung sie so darstellen kann wie auf dem
    // Tablet. Bei MC-Fragen kommen optionen/richtigIndex/gegebenIndex dazu,
    // damit dort echte Antwort-Buttons mit derselben Faerbung nachgebaut
    // werden koennen statt nur Text.
    const eintrag = {
      frage: klartextFrage(f.frage),
      ergebnis: !korrekt ? 'falsch' : hilfeGenutzt ? 'richtig_hilfe' : faktor < 1 ? 'richtig_2versuch' : 'richtig',
      richtigeAntwort: f.typ === 'mc' ? f.optionen[f.richtigIndex] : f.antwort,
      falscheAntwort: ersteFalscheAntwort,
      frageHtml: f.frage,
      typ: f.typ
    };
    if (f.lesetext) eintrag.lesetextHtml = f.lesetext;
    if (f.typ === 'mc') {
      eintrag.optionen = f.optionen;
      eintrag.richtigIndex = f.richtigIndex;
      if (typeof ersterGegebenerIndex === 'number') eintrag.gegebenIndex = ersterGegebenerIndex;
    }
    session.verlauf.push(eintrag);
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
      const fertig = session.index >= session.fragen.length;
      if (session.aktivitaet) {
        if (fertig) {
          Storage.loescheOffeneSession(session.aktivitaet);
        } else {
          Storage.setOffeneSession(session.aktivitaet, {
            index: session.index + session.anzeigeOffset,
            richtigCount: session.richtigCount,
            sessionSterne: session.sessionSterne,
            verlauf: session.verlauf
          });
        }
      }
      if (fertig) {
        renderErgebnis();
      } else {
        renderQuestion();
      }
    }, 1400);
  }

  function renderErgebnis() {
    const total = session.fragen.length + session.anzeigeOffset;
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
    FernSync.meldeLernsetErledigt(session.titel, `${session.richtigCount} von ${total} richtig`, session.sessionSterne, session.fach, session.verlauf);
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
    init, gotoHome, render, subMenuHtml, updateTopbar, renderSpieleMenu,
    startQuizSession, setLastStarter, restartLast, setOnLeaveScreen,
    oeffneEinstellungen, aktualisiereRegelFormular, fuegeAusnahmeHinzu, loescheAusnahme,
    speichereTagesregeln, fortschrittWirklichZuruecksetzen,
    fuegeBelohnungHinzu, belohnungSpeichern, belohnungLoeschen, belohnungEinloesen,
    aktualisiereHomeFallsAktiv
  };
})();
