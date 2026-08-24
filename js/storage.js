// Punkte-, Level- und Statistik-Verwaltung (localStorage)
const Storage = (function () {
  const KEY = 'maxlernt_state_v1';

  function defaultState() {
    return {
      sterne: 0,
      streak: 0,
      stats: {
        mathe: { richtig: 0, falsch: 0 },
        deutsch: { richtig: 0, falsch: 0 },
        lesen: { richtig: 0, falsch: 0 },
        heimat: { richtig: 0, falsch: 0 }
      },
      leseFortschritt: {},
      malfolgen: {},
      malfolgenDeck: [],
      matheKategorien: {},
      schach: { stufe: 0, siege: 0 },
      // Schiffe versenken (siehe schiffeversenken.js) - bewusst kein Schwierigkeits-
      // Fortschritt wie beim Schach, nur ein einfacher Sieg-Zaehler fuer die
      // Menuekachel, das Spiel selbst hat aktuell nur eine Schwierigkeitsstufe.
      schiffeversenken: { siege: 0 },
      maumau: { siege: 0 },
      // Laufende Online-Flottenaufstellung fuer Schiffe versenken - rein
      // lokal (NIE an den Server geschickt), damit ein Reload/App-Neustart
      // waehrend der Platzierungsphase die schon gesetzten Schiffe nicht
      // verwirft (von Uli am 16.08.2026 gemeldet: "Schiffsanordnung wird
      // nicht gemerkt, kam oefters vor"). Siehe getSchiffeOnlinePlatzierung.
      schiffeOnlinePlatzierung: null,
      // Kalendertag-Streak fuer den Startbildschirm ("X Tage in Folge dabei") -
      // bewusst ein eigenes Feld, nicht zu verwechseln mit `streak` oben, das nur
      // aufeinanderfolgende RICHTIGE ANTWORTEN innerhalb einer Sitzung zaehlt.
      tagesStreak: { anzahl: 0, letzterAktivTag: null },
      // Von Uli manuell gesetzte Ausnahmen fuer "welches(e) Fach(-Faecher) ist/
      // sind heute Pflicht + wieviele Aufgaben" (siehe getTagesPensum/
      // getTagesPensumAnzahl) - jeder Eintrag, `anzahl` optional (fehlt sie,
      // gilt FAECHER_STANDARD_ANZAHL):
      // { typ: 'einzeltag', datum: 'YYYY-MM-DD', fach, anzahl? } |
      // { typ: 'zeitraum', von: 'YYYY-MM-DD', bis: 'YYYY-MM-DD', fach, anzahl? } |
      // { typ: 'wochentag', tag: 0-6 (So=0..Sa=6), fach, anzahl? } |
      // { typ: 'wochenende', fach, anzahl? }
      // Pro Kalendertag kann JEDES Fach (mathe/deutsch/heimat) eine eigene
      // Regel haben - mehrere Faecher koennen also am selben Tag Pflicht sein.
      tagesplanRegeln: [],
      // Wie viele Aufgaben Max HEUTE schon je Fach beantwortet hat (siehe
      // meldeTagespensumAntwort/getTagesPensumErledigt) - fuer die "X von Y"-
      // Anzeige im Tagesplan-Banner. datum steuert den taeglichen Reset,
      // aehnlich wie bei schachTagesplan/tagesStreak.
      tagespensumFortschritt: { datum: null, erledigt: {} },
      // Welche 1er-10er-Reihen bei den Malfolgen abgefragt werden (Uli kann
      // das im Eltern-Bereich einschränken, damit Max klein anfangen kann) -
      // standardmäßig alle, damit sich am Verhalten nichts ändert, solange
      // niemand etwas einstellt.
      malfolgenReihen: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      // Fortschritt im Taktik-Puzzletrainer, ein Eintrag pro Thema (siehe
      // TAKTIK_REIHENFOLGE) - rating steuert die adaptive Puzzle-Auswahl
      // (naeher am eigenen Rating = passende Schwierigkeit), zuletztGeloest
      // vermeidet, dass dieselben paar Puzzles direkt wiederholt werden.
      taktik: {},
      // Bestzeiten/Statistik fuers Konzentrationstraining (siehe konzentration.js).
      // koordinatenBestzeitMs: schnellste absolvierte 10er-Runde "Koordinaten
      // finden" in Millisekunden, null solange keine Runde beendet wurde.
      konzentration: { koordinatenBestzeitMs: null },
      // Schach-eigener Tagesplan (Taktik + Konzentration + evtl. Strategie,
      // siehe generiereSchachTagesplanSchritte) - unabhaengig vom allgemeinen
      // Tagesplan-Banner auf dem Startbildschirm (tagesplanRegeln oben), der
      // ist fuer Mathe/Deutsch. datum steuert, wann ein neuer Plan noetig ist.
      schachTagesplan: { datum: null, schritte: [] },
      // Vom Handy aus gesetzter Stand (siehe fernsync.js) - rein clientseitig
      // gecacht, wird bei jedem erfolgreichen Poll gegen das Max-Tablet-Backend
      // komplett ersetzt.
      fernstand: { regeln: [], zusatzaufgaben: [] },
      // Ungelesen-Badge/Ton fuers Chat mit Papa (siehe fernsync.js, chat.js,
      // app.js gotoHome): letzteChatVonPapa ist der letzte per Poll bekannte
      // Stand ({id, ts}), letzteGeseheneChatId der hoechste von Max tatsaechlich
      // GESEHENE (Chat-Screen war offen). Ungelesen = letzteChatVonPapa.id >
      // letzteGeseheneChatId. Absichtlich getrennte Felder statt eines simplen
      // Bool-Flags, damit auch nach einem App-Neustart korrekt verglichen wird.
      letzteChatVonPapa: null,
      letzteGeseheneChatId: 0,
      // Fortschritt in bildbasierten Buechern (Lesemodus, siehe lesemodus.js) -
      // eigenes Feld statt leseFortschritt, weil Buecher seitenbasiert sind
      // (Seitenzahl statt scrollTop) und keine Verstaendnisfragen haben.
      buchFortschritt: {},
      // Welches Buch Max zuletzt geoeffnet hat (siehe Lesemodus.starteBuch) -
      // steuert, welches Buch der "Weiterlesen"-Chip im Tagesplan zeigt
      // (Geschichten.naechsteOffene). Ohne dieses Feld zeigte der Chip IMMER
      // das erste unfertige Buch in fester Listenreihenfolge, auch wenn Max
      // gerade ein ANDERES Buch liest (13.08.2026 von Uli gemeldet).
      zuletztGeoeffnetesBuch: null,
      // Belohnungssystem (siehe belohnungen.js): guthaben ist ein Parallel-
      // zaehler zu sterne, der bei JEDER Punktevergabe (addAntwort/addSterne)
      // mitzaehlt, aber - anders als sterne - beim Einloesen einer Belohnung
      // wieder ABNIMMT. sterne selbst bleibt dadurch unangetastet als reine
      // Lifetime-Anzeige fuers Level, damit Einloesen nicht wie ein Level-
      // Verlust wirkt. belohnungen ist der von den Eltern editierbare Katalog,
      // belohnungsVerlauf ein Log bereits eingeloester Belohnungen.
      guthaben: 0,
      // Kosten bewusst hoch angesetzt (12.08.2026 erste Version war mit 450/1200
      // deutlich zu leicht verdient, Uli-Feedback nach echtem Test mit Max) -
      // bei ca. 10-15 ⭐ pro richtiger Antwort braucht Filmabend jetzt mehrere
      // Tage, Übernachtung bei Papa ungefaehr eine volle Woche Uebung.
      belohnungen: [
        { id: 'filmabend', name: 'Filmabend', kosten: 1200 },
        { id: 'uebernachtung-papa', name: 'Übernachtung bei Papa', kosten: 3000 }
      ],
      belohnungsVerlauf: [],
      // Zwischenspeicher fuer unterbrochene Aufgabenfolgen (siehe App.
      // startQuizSession/getOffeneSession) - falls Max z.B. mitten in der
      // Mathe-Uebung zum Lesen wechselt, soll der Stand fuer HEUTE erhalten
      // bleiben statt beim naechsten Start einer Uebung verloren zu gehen.
      // Ein Eintrag pro "aktivitaet"-Schluessel (z.B. 'mathe-gemischt'),
      // gilt nur fuer den Tag, an dem er gespeichert wurde.
      offeneSessions: {},
      // Warteschlange fuer Lernset-Meldungen ans Backend (siehe FernSync.
      // meldeLernsetErledigt), die NICHT sofort zugestellt werden konnten
      // (kein Internet gerade, Render-Backend im Cold-Start-Schlaf, Timeout) -
      // ohne das verschwand eine ganze abgeschlossene Aufgabenfolge
      // STILLSCHWEIGEND aus Papas Auswertung, weil der urspruengliche POST
      // reines Fire-and-Forget war (24.08.2026 von Uli gemeldet: Max' zweite
      // 5er-Mathe-Runde tauchte nie auf, obwohl er sie gemacht hat). Jeder
      // Eintrag ist der komplette, schon fertig zusammengebaute Request-Body.
      // Wird bei jedem erfolgreichen Poll abgearbeitet (siehe FernSync.
      // sendeOffeneLernsetMeldungen).
      offeneLernsetMeldungen: []
    };
  }

  // Reihenfolge, in der die Taktik-Themen freigeschaltet werden (siehe
  // getTaktikFreigeschaltet) - folgt der paedagogischen Empfehlung
  // Gabel -> Fesselung -> Spieß -> Abzugsangriff (Gabeln sind fuer Kinder am
  // leichtesten zu erkennen, Abzugsangriffe am schwersten).
  const TAKTIK_REIHENFOLGE = ['fork', 'pin', 'skewer', 'discoveredAttack'];
  const TAKTIK_START_RATING = 700;
  // Ab wie vielen geloesten Aufgaben mit welcher Mindest-Trefferquote ein
  // Thema als "sitzt gut genug" gilt, um das naechste freizuschalten -
  // bewusst grosszuegig (70%), da "Genauigkeit vor Geschwindigkeit" das Ziel
  // ist, nicht Perfektion.
  const TAKTIK_FREISCHALT_MIN_VERSUCHE = 15;
  const TAKTIK_FREISCHALT_MIN_QUOTE = 0.7;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      return defaultState();
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  let state = load();

  function level() {
    return Math.floor(state.sterne / 100) + 1;
  }

  function heutigesDatum(versatzTage) {
    const d = new Date();
    if (versatzTage) d.setDate(d.getDate() + versatzTage);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /** Zaehlt den heutigen Kalendertag als "aktiv" fuer den Tages-Streak - wird
   *  bewusst erst bei einer ECHTEN Lernaktion aufgerufen (erste beantwortete
   *  Frage oder erster Schachsieg des Tages), nicht schon beim bloßen Oeffnen
   *  der App, damit der Streak wirklich "gelernt" statt nur "Tablet an" misst. */
  function registriereAktivenTag() {
    if (!state.tagesStreak) state.tagesStreak = { anzahl: 0, letzterAktivTag: null };
    const heute = heutigesDatum();
    if (state.tagesStreak.letzterAktivTag === heute) return;
    const gestern = heutigesDatum(-1);
    state.tagesStreak.anzahl = state.tagesStreak.letzterAktivTag === gestern ? state.tagesStreak.anzahl + 1 : 1;
    state.tagesStreak.letzterAktivTag = heute;
    save(state);
  }

  function getTagesStreak() {
    if (!state.tagesStreak) state.tagesStreak = { anzahl: 0, letzterAktivTag: null };
    return state.tagesStreak;
  }

  function getTagesplanRegeln() {
    if (!state.tagesplanRegeln) state.tagesplanRegeln = [];
    return state.tagesplanRegeln;
  }

  function setTagesplanRegeln(regeln) {
    state.tagesplanRegeln = regeln;
    save(state);
  }

  // Standard-Aufgabenzahl je Fach, falls keine Regel eine eigene `anzahl`
  // vorgibt - entspricht den bisherigen fest verdrahteten Werten (Mathe
  // ANZAHL_GEMISCHT=20, Deutsch-Rechtschreibung ANZAHL=10, Heimatkunde
  // anzahlProQuiz()=10), damit sich am Verhalten ohne Regeln nichts aendert.
  const FAECHER_STANDARD_ANZAHL = { mathe: 20, deutsch: 10, heimat: 10 };

  /** Sucht in EINER Regelliste alle heute zutreffenden Regeln und liefert sie
   *  als { fach: regel }-Objekt - pro Fach gewinnt die erste passende Regel in
   *  der Prioritaet Einzeltag > Zeitraum > Wochentag > Wochenende. Mehrere
   *  Faecher koennen so gleichzeitig am selben Tag Pflicht sein. Ausgelagert,
   *  damit sowohl die lokalen als auch die vom Handy synchronisierten
   *  Fern-Regeln (siehe getFernRegeln) mit derselben Logik geprueft werden. */
  function findeZutreffendeRegelnHeute(regeln, heute, heuteIso) {
    const heuteTag = heute.getDay();
    const passt = r => {
      if (r.typ === 'einzeltag') return r.datum === heuteIso;
      if (r.typ === 'zeitraum') return r.von <= heuteIso && heuteIso <= r.bis;
      if (r.typ === 'wochentag') return r.tag === heuteTag;
      if (r.typ === 'wochenende') return heuteTag === 0 || heuteTag === 6;
      return false;
    };
    const prioritaet = { einzeltag: 0, zeitraum: 1, wochentag: 2, wochenende: 3 };
    const treffer = regeln.filter(passt).sort((a, b) => prioritaet[a.typ] - prioritaet[b.typ]);
    const ergebnis = {};
    treffer.forEach(r => { if (!(r.fach in ergebnis)) ergebnis[r.fach] = r; });
    return ergebnis;
  }

  /** Kombiniert Fern- (Vorrang) und lokale Regeln zu einem { fach: regel }-
   *  Objekt fuer heute. */
  function findeHeutigeRegelnKombiniert() {
    const heute = new Date();
    const heuteIso = heutigesDatum();
    const lokal = findeZutreffendeRegelnHeute(getTagesplanRegeln(), heute, heuteIso);
    const fern = findeZutreffendeRegelnHeute(getFernRegeln(), heute, heuteIso);
    return Object.assign({}, lokal, fern);
  }

  /** Wie viele Aufgaben umfasst eine Runde des angegebenen Fachs HEUTE? Gilt
   *  unabhaengig davon, ob Max ueber den Tagesplan-Chip oder das Fach-Menue
   *  selbst startet, damit "eine Runde X" immer gleich lang ist. Ohne
   *  passende Regel gilt der Standardwert (siehe FAECHER_STANDARD_ANZAHL). */
  function getTagesPensumAnzahl(fach) {
    const regel = findeHeutigeRegelnKombiniert()[fach];
    return (regel && regel.anzahl) || FAECHER_STANDARD_ANZAHL[fach];
  }

  /** Welche(s) Fach/Faecher sind heute im Tagesplan als Pflicht hervorgehoben,
   *  inklusive Soll-Anzahl? Ohne JEDE passende Regel (weder fern noch lokal)
   *  faellt es auf eine feste taegliche Abwechslung zwischen Mathe und Deutsch
   *  zurueck (gerader Tag im Jahr = Mathe, ungerader = Deutsch), damit ohne
   *  jede Regel trotzdem taeglich gewechselt wird - wie bisher. Alle nicht
   *  gelisteten Faecher bleiben fuer Max trotzdem zusaetzlich als "Extra"
   *  antippbar (siehe App.baueTagesplan) - diese Funktion sperrt nichts. */
  function getTagesPensum() {
    const kombiniert = findeHeutigeRegelnKombiniert();
    const faecher = Object.keys(kombiniert);
    if (faecher.length === 0) {
      const heute = new Date();
      const jahresanfang = new Date(heute.getFullYear(), 0, 1);
      const tagDesJahres = Math.floor((heute - jahresanfang) / 86400000);
      const fach = tagDesJahres % 2 === 0 ? 'mathe' : 'deutsch';
      return [{ fach, anzahl: FAECHER_STANDARD_ANZAHL[fach] }];
    }
    return faecher.map(fach => ({ fach, anzahl: kombiniert[fach].anzahl || FAECHER_STANDARD_ANZAHL[fach] }));
  }

  /** Heutiger Beantwortet-Zaehler je Fach fuer die "X von Y"-Anzeige im
   *  Tagesplan-Banner - resettet automatisch bei Kalendertagwechsel. */
  function getTagespensumFortschritt() {
    const heute = heutigesDatum();
    if (!state.tagespensumFortschritt || state.tagespensumFortschritt.datum !== heute) {
      state.tagespensumFortschritt = { datum: heute, erledigt: {} };
      save(state);
    }
    return state.tagespensumFortschritt;
  }

  function getTagesPensumErledigt(fach) {
    return getTagespensumFortschritt().erledigt[fach] || 0;
  }

  /** Wird einmal pro fertig beantworteter Frage einer Pflicht-faehigen Aktivitaet
   *  aufgerufen (siehe App.abschlussFrage) - zaehlt bewusst JEDE beantwortete
   *  Frage (auch falsch beantwortete/Wiederholungen), nicht nur richtige, da
   *  "Aufgaben loesen" hier das Bearbeiten meint, nicht die Trefferquote
   *  (die wird getrennt in stats[fach] gefuehrt). */
  function meldeTagespensumAntwort(fach) {
    const stand = getTagespensumFortschritt();
    stand.erledigt[fach] = (stand.erledigt[fach] || 0) + 1;
    save(state);
  }

  /** Vom Handy aus (ueber das Max-Tablet-Backend) gesetzte Regeln + freie
   *  Zusatzaufgaben - siehe fernsync.js. Rein clientseitig gecached, wird bei
   *  jedem erfolgreichen Poll komplett ueberschrieben (Server ist die Quelle
   *  der Wahrheit); ohne Internet/Backend bleibt einfach der letzte Stand. */
  function getFernRegeln() {
    if (!state.fernstand) state.fernstand = { regeln: [], zusatzaufgaben: [] };
    return state.fernstand.regeln;
  }

  function getFernZusatzaufgaben() {
    if (!state.fernstand) state.fernstand = { regeln: [], zusatzaufgaben: [] };
    return state.fernstand.zusatzaufgaben;
  }

  function setFernstand(regeln, zusatzaufgaben) {
    state.fernstand = { regeln: regeln || [], zusatzaufgaben: zusatzaufgaben || [] };
    save(state);
  }

  function getLetzteChatVonPapa() {
    return state.letzteChatVonPapa || null;
  }

  function setLetzteChatVonPapa(eintrag) {
    state.letzteChatVonPapa = eintrag;
    save(state);
  }

  function getLetzteGeseheneChatId() {
    return state.letzteGeseheneChatId || 0;
  }

  function setLetzteGeseheneChatId(id) {
    if (id <= (state.letzteGeseheneChatId || 0)) return;
    state.letzteGeseheneChatId = id;
    save(state);
  }

  /** Optimistisches lokales Abhaken direkt nach dem Antippen, bevor die
   *  Server-Bestaetigung (per POST, siehe fernsync.js) zurueck ist - damit sich
   *  der Haken beim Antippen sofort und nicht erst nach dem naechsten Poll zeigt. */
  function markiereFernZusatzaufgabeLokalErledigt(id) {
    if (!state.fernstand) return;
    const a = state.fernstand.zusatzaufgaben.find(x => x.id === id);
    if (a) { a.erledigt = true; save(state); }
  }

  // faktor steuert den Punkteanteil: 1 = voller Erfolg (1. Versuch), 0.5 = halbe
  // Punkte (2. Versuch ohne Hilfe), 0 = keine Punkte (Hilfe angesehen) - siehe
  // App.verarbeiteQuizAntwort in app.js. korrekt && faktor<=0 zaehlt bewusst wie
  // "falsch" fuer Streak/Statistik, weil ohne Hilfe noch nicht sicher gekonnt.
  function addAntwort(fach, korrekt, faktor) {
    if (faktor === undefined) faktor = 1;
    registriereAktivenTag();
    if (!state.stats[fach]) state.stats[fach] = { richtig: 0, falsch: 0 };
    let gained = 0;
    if (korrekt && faktor > 0) {
      state.streak++;
      const bonus = Math.min(state.streak, 5);
      gained = Math.round((10 + bonus) * faktor);
      state.sterne += gained;
      state.guthaben = (state.guthaben || 0) + gained;
      state.stats[fach].richtig++;
    } else {
      state.streak = 0;
      state.stats[fach].falsch++;
    }
    save(state);
    return gained;
  }

  function getState() {
    return state;
  }

  function saveLeseFortschritt(index, scrollTop) {
    if (!state.leseFortschritt) state.leseFortschritt = {};
    const bestehend = state.leseFortschritt[index];
    state.leseFortschritt[index] = {
      scrollTop: scrollTop,
      fertig: bestehend ? bestehend.fertig : false
    };
    save(state);
  }

  function getLeseFortschritt(index) {
    return (state.leseFortschritt && state.leseFortschritt[index]) || null;
  }

  function markGeschichteFertig(index) {
    if (!state.leseFortschritt) state.leseFortschritt = {};
    if (!state.leseFortschritt[index]) state.leseFortschritt[index] = { scrollTop: 0 };
    state.leseFortschritt[index].fertig = true;
    save(state);
  }

  /** Fortschritt in einem Lesemodus-Buch (siehe lesemodus.js) - buchId ist ein
   *  fester String-Schluessel (z.B. "enzo"), nicht wie bei Geschichten ein Index. */
  function getBuchFortschritt(buchId) {
    return (state.buchFortschritt && state.buchFortschritt[buchId]) || null;
  }

  function saveBuchSeite(buchId, seite) {
    if (!state.buchFortschritt) state.buchFortschritt = {};
    const bestehend = state.buchFortschritt[buchId];
    state.buchFortschritt[buchId] = { seite, fertig: bestehend ? bestehend.fertig : false };
    save(state);
  }

  function getZuletztGeoeffnetesBuch() {
    return state.zuletztGeoeffnetesBuch || null;
  }

  function setZuletztGeoeffnetesBuch(buchId) {
    state.zuletztGeoeffnetesBuch = buchId;
    save(state);
  }

  function markBuchFertig(buchId) {
    if (!state.buchFortschritt) state.buchFortschritt = {};
    if (!state.buchFortschritt[buchId]) state.buchFortschritt[buchId] = { seite: 0 };
    const warSchonFertig = state.buchFortschritt[buchId].fertig;
    state.buchFortschritt[buchId].fertig = true;
    save(state);
    return !warSchonFertig; // true, wenn dies das erste Mal ist (fuer Sterne-Vergabe)
  }

  /** Karteikarten-Statistik pro Malfolge (z. B. "3x7"): wie oft falsch beantwortet
   *  und wie viele Male in Folge zuletzt richtig - dient dazu, schwache Fakten
   *  in kuenftigen Malfolgen-Sitzungen haeufiger vorzulegen. */
  function getMalfolgenStats() {
    if (!state.malfolgen) state.malfolgen = {};
    return state.malfolgen;
  }

  function meldeMalfolgenErgebnis(fakt, korrekt) {
    if (!state.malfolgen) state.malfolgen = {};
    const stat = state.malfolgen[fakt] || { falsch: 0, serie: 0 };
    if (korrekt) {
      stat.serie = (stat.serie || 0) + 1;
    } else {
      stat.falsch = (stat.falsch || 0) + 1;
      stat.serie = 0;
    }
    state.malfolgen[fakt] = stat;
    save(state);
  }

  /** Welche 1er-10er-Reihen bei den Malfolgen abgefragt werden - siehe
   *  defaultState fuer den Hintergrund. Mindestens eine Reihe bleibt immer
   *  aktiv (leeres Array wuerde die Malfolgen-Uebung funktionslos machen). */
  function getMalfolgenReihen() {
    if (!state.malfolgenReihen || state.malfolgenReihen.length === 0) {
      state.malfolgenReihen = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }
    return state.malfolgenReihen;
  }

  function setMalfolgenReihen(reihen) {
    if (!reihen || reihen.length === 0) return;
    state.malfolgenReihen = reihen;
    // Reihen-Auswahl geaendert -> das Karten-Deck (siehe getMalfolgenDeck/
    // setMalfolgenDeck) bezieht sich noch auf die ALTE Auswahl und muss beim
    // naechsten Uben frisch gemischt werden, sonst blieben Fakten aus nicht
    // mehr gewaehlten Reihen im Deck bzw. neu dazugewaehlte Reihen kaemen
    // gar nicht rein, bis das alte Deck zufaellig aufgebraucht ist.
    state.malfolgenDeck = [];
    save(state);
  }

  /** Rest-"Kartendeck" fuers Malfolgen-Karteikarten-Uben (siehe mathe.js
   *  starteMalfolgenKarten): ein einmal durchgemischtes Deck aus allen
   *  aktuell ausgewaehlten Fakten (schwache Fakten mehrfach drin, siehe
   *  mathe.js baueMalfolgenDeck), das Session fuer Session von VORNE
   *  abgebaut wird, statt bei jeder Session neu (unabhaengig) gewuerfelt zu
   *  werden. Das garantiert echte Abdeckung: jeder Fakt im Deck kommt
   *  mindestens einmal dran, bevor irgendeiner ein zweites Mal drankommt -
   *  reines gewichtetes Wuerfeln (auch mit Zuruecklegen) wuerde das NICHT
   *  sicherstellen, v.a. bei vielen ausgewaehlten Reihen (z.B. alle 10
   *  Reihen = 100 Fakten, aber nur 15 Karten pro Session). */
  function getMalfolgenDeck() {
    if (!state.malfolgenDeck) state.malfolgenDeck = [];
    return state.malfolgenDeck;
  }

  function setMalfolgenDeck(deck) {
    state.malfolgenDeck = deck;
    save(state);
  }

  function leererTaktikEintrag() {
    return { rating: TAKTIK_START_RATING, richtig: 0, falsch: 0, zuletztGeloest: [] };
  }

  /** Fortschritt je Taktik-Thema (fork/pin/skewer/discoveredAttack): Rating
   *  (steuert die Puzzle-Auswahl im Trainer), Trefferstatistik, zuletzt
   *  geloeste Puzzle-IDs. */
  function getTaktikStats() {
    if (!state.taktik) state.taktik = {};
    for (const thema of TAKTIK_REIHENFOLGE) {
      if (!state.taktik[thema]) state.taktik[thema] = leererTaktikEintrag();
    }
    return state.taktik;
  }

  /** Nach jedem geloesten (oder falsch geloesten) Taktik-Puzzle: passt das
   *  Rating fuers Thema leicht an (naeher an "gerade richtige Schwierigkeit"
   *  statt hartem Stufensystem) und merkt sich die Puzzle-ID, damit der
   *  Trainer sie in der naechsten Auswahl meidet. */
  function meldeTaktikErgebnis(thema, korrekt, puzzleId) {
    registriereAktivenTag();
    const stats = getTaktikStats();
    const stat = stats[thema];
    if (korrekt) {
      stat.richtig++;
      stat.rating = Math.min(1100, stat.rating + 25);
    } else {
      stat.falsch++;
      stat.rating = Math.max(500, stat.rating - 15);
    }
    stat.zuletztGeloest.push(puzzleId);
    if (stat.zuletztGeloest.length > 15) stat.zuletztGeloest.shift();
    save(state);
    return stat;
  }

  /** Welche Taktik-Themen sind schon anklickbar? Immer das erste
   *  (TAKTIK_REIHENFOLGE[0]), jedes weitere erst wenn das vorherige Thema
   *  genug (und gut genug) geuebt wurde - siehe TAKTIK_FREISCHALT_*. */
  function getTaktikFreigeschaltet() {
    const stats = getTaktikStats();
    const freigeschaltet = [TAKTIK_REIHENFOLGE[0]];
    for (let i = 1; i < TAKTIK_REIHENFOLGE.length; i++) {
      const vorher = stats[TAKTIK_REIHENFOLGE[i - 1]];
      const versuche = vorher.richtig + vorher.falsch;
      const quote = versuche > 0 ? vorher.richtig / versuche : 0;
      if (versuche >= TAKTIK_FREISCHALT_MIN_VERSUCHE && quote >= TAKTIK_FREISCHALT_MIN_QUOTE) {
        freigeschaltet.push(TAKTIK_REIHENFOLGE[i]);
      } else {
        break;
      }
    }
    return freigeschaltet;
  }

  const KONZENTRATION_SPIELE = ['koordinaten', 'feldfarbe', 'laeuferweg'];
  const STRATEGIE_QUIZZES = ['eroeffnung', 'material', 'bauern'];

  function tagDesJahres(datum) {
    return Math.floor((datum - new Date(datum.getFullYear(), 0, 1)) / 86400000);
  }

  /** Baut die 2-3 Schritte des heutigen Schach-Tagesplans: immer 1 Taktik-Puzzle-
   *  Runde zum aktuell am weitesten fortgeschrittenen (nicht zwingend gemeisterten)
   *  Thema, immer 1 Konzentrationsuebung (taeglich rotierend durch alle drei, fuer
   *  Abwechslung), und nur an jedem dritten Tag zusaetzlich 1 Strategie-Quiz -
   *  haelt den Plan an den meisten Tagen kurz (15-20 Minuten Zielrahmen). */
  function generiereSchachTagesplanSchritte() {
    const heute = new Date();
    const tag = tagDesJahres(heute);
    const frei = getTaktikFreigeschaltet();
    const schritte = [
      { typ: 'taktik', thema: frei[frei.length - 1], erledigt: false },
      { typ: 'konzentration', spiel: KONZENTRATION_SPIELE[tag % KONZENTRATION_SPIELE.length], erledigt: false }
    ];
    if (tag % 3 === 0) {
      schritte.push({ typ: 'strategie', quiz: STRATEGIE_QUIZZES[Math.floor(tag / 3) % STRATEGIE_QUIZZES.length], erledigt: false });
    }
    return schritte;
  }

  /** Liefert den Schach-Tagesplan fuer heute - erzeugt automatisch einen neuen,
   *  sobald sich das Kalenderdatum seit dem letzten Aufruf geaendert hat. */
  function getSchachTagesplan() {
    if (!state.schachTagesplan) state.schachTagesplan = { datum: null, schritte: [] };
    const heute = heutigesDatum();
    if (state.schachTagesplan.datum !== heute) {
      state.schachTagesplan = { datum: heute, schritte: generiereSchachTagesplanSchritte() };
      save(state);
    }
    return state.schachTagesplan;
  }

  /** Hakt den ersten noch offenen Schritt vom Typ `typ` im heutigen Schach-
   *  Tagesplan ab - wird von JEDER Taktik-/Konzentrations-/Strategie-Uebung beim
   *  Abschluss aufgerufen, unabhaengig davon ob sie ueber den Tagesplan-Button
   *  oder direkt ueber das jeweilige Menue gestartet wurde (Hauptsache, geuebt
   *  wurde). Kein Fehler, wenn kein passender offener Schritt existiert. */
  function meldeTagesplanSchrittErledigt(typ) {
    const plan = getSchachTagesplan();
    const schritt = plan.schritte.find(s => s.typ === typ && !s.erledigt);
    if (schritt) {
      schritt.erledigt = true;
      save(state);
    }
  }

  function getKonzentrationBestzeit() {
    if (!state.konzentration) state.konzentration = { koordinatenBestzeitMs: null };
    return state.konzentration.koordinatenBestzeitMs;
  }

  /** Meldet die Zeit einer abgeschlossenen "Koordinaten finden"-Runde (in ms) -
   *  aktualisiert die Bestzeit nur, wenn die neue Runde schneller war. */
  function meldeKoordinatenZeit(zeitMs) {
    registriereAktivenTag();
    if (!state.konzentration) state.konzentration = { koordinatenBestzeitMs: null };
    const bisherige = state.konzentration.koordinatenBestzeitMs;
    const istNeuerRekord = bisherige === null || zeitMs < bisherige;
    if (istNeuerRekord) state.konzentration.koordinatenBestzeitMs = zeitMs;
    save(state);
    return { istNeuerRekord, bestzeitMs: state.konzentration.koordinatenBestzeitMs };
  }

  /** Wie getMalfolgenStats/meldeMalfolgenErgebnis, nur pro Aufgaben-Bereich der
   *  Tagesaufgabe (z. B. "einmaleins", "textaufgaben") statt pro Einzelfakt -
   *  damit sich die taegliche Mischung automatisch an Max' Schwaechen anpasst. */
  function getMatheKategorienStats() {
    if (!state.matheKategorien) state.matheKategorien = {};
    return state.matheKategorien;
  }

  function meldeMatheKategorieErgebnis(kategorie, korrekt) {
    if (!state.matheKategorien) state.matheKategorien = {};
    const stat = state.matheKategorien[kategorie] || { falsch: 0, serie: 0 };
    if (korrekt) {
      stat.serie = (stat.serie || 0) + 1;
    } else {
      stat.falsch = (stat.falsch || 0) + 1;
      stat.serie = 0;
    }
    state.matheKategorien[kategorie] = stat;
    save(state);
  }

  /** Generische Sternevergabe fuer Erfolge außerhalb des Quiz-Systems (z. B. eine
   *  gewonnene Schachpartie). */
  function addSterne(betrag) {
    state.sterne += betrag;
    state.guthaben = (state.guthaben || 0) + betrag;
    save(state);
  }

  /** Aktuell verfuegbares Guthaben zum Einloesen von Belohnungen (siehe
   *  belohnungen.js) - im Unterschied zu sterne NICHT die Lifetime-Summe,
   *  sinkt beim Einloesen wieder. */
  function getGuthaben() {
    return state.guthaben || 0;
  }

  function getBelohnungen() {
    if (!state.belohnungen) state.belohnungen = [];
    return state.belohnungen;
  }

  /** Nur ueber den PIN-geschuetzten Eltern-Bereich aufrufbar - Max soll den
   *  Katalog/die Kosten sehen, aber nicht selbst festlegen koennen. */
  function fuegeBelohnungHinzu(name, kosten) {
    if (!state.belohnungen) state.belohnungen = [];
    const id = 'b' + Date.now() + Math.floor(Math.random() * 1000);
    state.belohnungen.push({ id, name, kosten });
    save(state);
  }

  function aendereBelohnung(id, name, kosten) {
    const b = getBelohnungen().find(x => x.id === id);
    if (!b) return;
    b.name = name;
    b.kosten = kosten;
    save(state);
  }

  function loescheBelohnung(id) {
    state.belohnungen = getBelohnungen().filter(b => b.id !== id);
    save(state);
  }

  function getBelohnungsVerlauf() {
    if (!state.belohnungsVerlauf) state.belohnungsVerlauf = [];
    return state.belohnungsVerlauf;
  }

  /** Zieht die Kosten vom Guthaben ab und protokolliert die Einloesung - nur
   *  aus dem Eltern-Bereich aufrufbar (siehe App.oeffneEinstellungen), damit
   *  Max nicht selbst "auf Kredit" einloesen kann. Liefert false, wenn das
   *  Guthaben nicht (mehr) reicht (z.B. Doppelklick). */
  function loeseBelohnungEin(id) {
    const b = getBelohnungen().find(x => x.id === id);
    if (!b || getGuthaben() < b.kosten) return false;
    state.guthaben -= b.kosten;
    getBelohnungsVerlauf().unshift({ name: b.name, kosten: b.kosten, datum: heutigesDatum() });
    if (state.belohnungsVerlauf.length > 20) state.belohnungsVerlauf.length = 20;
    save(state);
    return true;
  }

  /** Liefert den gespeicherten Zwischenstand einer unterbrochenen Aufgaben-
   *  folge - oder null, wenn keiner existiert ODER er von einem frueheren
   *  Kalendertag stammt (bewusst: "erst am naechsten Tag zuruecksetzen",
   *  siehe App.startQuizSession). */
  function getOffeneSession(aktivitaet) {
    if (!state.offeneSessions) state.offeneSessions = {};
    const eintrag = state.offeneSessions[aktivitaet];
    if (!eintrag || eintrag.datum !== heutigesDatum()) return null;
    return eintrag;
  }

  function setOffeneSession(aktivitaet, daten) {
    if (!state.offeneSessions) state.offeneSessions = {};
    state.offeneSessions[aktivitaet] = Object.assign({ datum: heutigesDatum() }, daten);
    save(state);
  }

  function loescheOffeneSession(aktivitaet) {
    if (!state.offeneSessions) return;
    delete state.offeneSessions[aktivitaet];
    save(state);
  }

  /** Warteschlange nicht zugestellter Lernset-Meldungen - siehe defaultState. */
  function getOffeneLernsetMeldungen() {
    if (!state.offeneLernsetMeldungen) state.offeneLernsetMeldungen = [];
    return state.offeneLernsetMeldungen;
  }

  function pushOffeneLernsetMeldung(body) {
    const liste = getOffeneLernsetMeldungen();
    liste.push(body);
    // Deckelt die Warteschlange - bei einem laenger anhaltenden Ausfall
    // sollen lieber die AELTESTEN Meldungen wegfallen als der gespeicherte
    // Zustand unbegrenzt wachsen.
    if (liste.length > 30) liste.splice(0, liste.length - 30);
    save(state);
  }

  function entferneErsteOffeneLernsetMeldung() {
    const liste = getOffeneLernsetMeldungen();
    liste.shift();
    save(state);
  }

  /** Fortschritt auf der Schach-Schwierigkeitsleiter: aktuelle Stufe (Index)
   *  und Siege auf dieser Stufe seit dem letzten Aufstieg. */
  function getSchachFortschritt() {
    if (!state.schach) state.schach = { stufe: 0, siege: 0 };
    return state.schach;
  }

  function meldeSchachSieg() {
    registriereAktivenTag();
    if (!state.schach) state.schach = { stufe: 0, siege: 0 };
    state.schach.siege++;
    save(state);
    return state.schach;
  }

  function getSchiffeFortschritt() {
    if (!state.schiffeversenken) state.schiffeversenken = { siege: 0 };
    return state.schiffeversenken;
  }

  function meldeSchiffeSieg() {
    registriereAktivenTag();
    if (!state.schiffeversenken) state.schiffeversenken = { siege: 0 };
    state.schiffeversenken.siege++;
    save(state);
    return state.schiffeversenken;
  }

  function getSchiffeOnlinePlatzierung() {
    return state.schiffeOnlinePlatzierung || null;
  }

  function setSchiffeOnlinePlatzierung(schiffe, bereitGesendet) {
    state.schiffeOnlinePlatzierung = { schiffe, bereitGesendet: !!bereitGesendet };
    save(state);
  }

  function loescheSchiffeOnlinePlatzierung() {
    state.schiffeOnlinePlatzierung = null;
    save(state);
  }

  function getMauMauFortschritt() {
    if (!state.maumau) state.maumau = { siege: 0 };
    return state.maumau;
  }

  function meldeMauMauSieg() {
    registriereAktivenTag();
    if (!state.maumau) state.maumau = { siege: 0 };
    state.maumau.siege++;
    save(state);
    return state.maumau;
  }

  /** Fortschritt fuer eine einfache Fach-Kachel (Mathe/Deutsch/Heimat): Anzahl
   *  richtig geloester Aufgaben. Geschichten und Schach haben eigene Anzeigen
   *  (siehe getGeschichtenFortschritt/getSchachFortschritt), da dort "Aufgaben
   *  geloest" nicht die passende Kennzahl ist. */
  function getFachFortschritt(fach) {
    return { geloest: (state.stats[fach] && state.stats[fach].richtig) || 0 };
  }

  /** Anzahl fertig gelesener Buecher von insgesamt 2 - die 2 ist an die Anzahl
   *  der Eintraege in geschichten.js `buecher` gekoppelt und muss synchron
   *  gehalten werden, bis es dafuer eine gemeinsame Konstante gibt. Zaehlt
   *  bewusst NUR noch Buecher (buchFortschritt), nicht mehr leseFortschritt -
   *  die textbasierten Kapitelgeschichten (frueher in geschichten.js `bank`)
   *  wurden entfernt, die Buecherei besteht nur noch aus Buechern. */
  function getGeschichtenFortschritt() {
    const eintraege = state.buchFortschritt ? Object.values(state.buchFortschritt) : [];
    const fertig = eintraege.filter(e => e.fertig).length;
    return { fertig, gesamt: 2 };
  }

  function schachStufeAufsteigen() {
    if (!state.schach) state.schach = { stufe: 0, siege: 0 };
    state.schach.stufe++;
    state.schach.siege = 0;
    save(state);
  }

  /** Max waehlt die Stufe fuer die naechste Partie selbst - unabhaengig vom
   *  Sieg-Zaehler, der nur noch fuer den "Stufe geschafft"-Hinweis mitlaeuft. */
  function setSchachStufe(stufe) {
    if (!state.schach) state.schach = { stufe: 0, siege: 0 };
    state.schach.stufe = stufe;
    state.schach.siege = 0;
    save(state);
  }

  /** Setzt Max' kompletten Lernfortschritt zurueck (Punkte, gelöste Aufgaben
   *  je Fach, Karteikarten-Gewichtung, Lese-/Buch-Fortschritt, Schach-/Taktik-/
   *  Konzentrations-Stand, Tages-Streak, Belohnungs-Guthaben+Verlauf) - fuer
   *  einen echten Neustart, z. B. wenn ein neues Kind das Tablet uebernimmt.
   *  Bewusst NICHT zurueckgesetzt: tagesplanRegeln, malfolgenReihen und der
   *  Belohnungs-KATALOG selbst (Ulis Eltern-Einstellungen bleiben erhalten)
   *  sowie fernstand (wird beim naechsten Poll vom Backend eh ueberschrieben).
   *  Nur ueber den PIN-geschuetzten Eltern-Bereich aufrufbar (siehe
   *  App.oeffneEinstellungen), da unwiderruflich. */
  function resetFortschritt() {
    state.sterne = 0;
    state.streak = 0;
    state.stats = {
      mathe: { richtig: 0, falsch: 0 },
      deutsch: { richtig: 0, falsch: 0 },
      lesen: { richtig: 0, falsch: 0 },
      heimat: { richtig: 0, falsch: 0 }
    };
    state.leseFortschritt = {};
    state.buchFortschritt = {};
    state.zuletztGeoeffnetesBuch = null;
    state.malfolgen = {};
    state.malfolgenDeck = [];
    state.matheKategorien = {};
    state.schach = { stufe: 0, siege: 0 };
    state.schiffeversenken = { siege: 0 };
    state.maumau = { siege: 0 };
    state.schiffeOnlinePlatzierung = null;
    state.taktik = {};
    state.konzentration = { koordinatenBestzeitMs: null };
    state.schachTagesplan = { datum: null, schritte: [] };
    state.tagesStreak = { anzahl: 0, letzterAktivTag: null };
    state.guthaben = 0;
    state.belohnungsVerlauf = [];
    state.offeneSessions = {};
    save(state);
  }

  return {
    addAntwort, getState, level, saveLeseFortschritt, getLeseFortschritt, markGeschichteFertig,
    getMalfolgenStats, meldeMalfolgenErgebnis, getMalfolgenReihen, setMalfolgenReihen,
    getMatheKategorienStats, meldeMatheKategorieErgebnis, addSterne,
    getSchachFortschritt, meldeSchachSieg, schachStufeAufsteigen, setSchachStufe,
    getSchiffeFortschritt, meldeSchiffeSieg,
    getSchiffeOnlinePlatzierung, setSchiffeOnlinePlatzierung, loescheSchiffeOnlinePlatzierung,
    getMauMauFortschritt, meldeMauMauSieg,
    getTagesStreak, getFachFortschritt, getGeschichtenFortschritt,
    getTagesplanRegeln, setTagesplanRegeln,
    getTagesPensum, getTagesPensumAnzahl, getTagesPensumErledigt, meldeTagespensumAntwort,
    getTaktikStats, meldeTaktikErgebnis, getTaktikFreigeschaltet,
    getKonzentrationBestzeit, meldeKoordinatenZeit,
    getSchachTagesplan, meldeTagesplanSchrittErledigt,
    getFernRegeln, getFernZusatzaufgaben, setFernstand, markiereFernZusatzaufgabeLokalErledigt,
    getLetzteChatVonPapa, setLetzteChatVonPapa, getLetzteGeseheneChatId, setLetzteGeseheneChatId,
    getBuchFortschritt, saveBuchSeite, markBuchFertig, resetFortschritt,
    getZuletztGeoeffnetesBuch, setZuletztGeoeffnetesBuch,
    getGuthaben, getBelohnungen, fuegeBelohnungHinzu, aendereBelohnung, loescheBelohnung,
    getBelohnungsVerlauf, loeseBelohnungEin,
    getMalfolgenDeck, setMalfolgenDeck,
    getOffeneSession, setOffeneSession, loescheOffeneSession,
    getOffeneLernsetMeldungen, pushOffeneLernsetMeldung, entferneErsteOffeneLernsetMeldung
  };
})();
