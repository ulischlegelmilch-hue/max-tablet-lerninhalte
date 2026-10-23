const Deutsch = (function () {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pickN(arr, n) { return shuffle(arr).slice(0, n); }
  // Wie pickN, aber mit Gedaechtnis: was zuletzt dran war, kommt erst wieder, wenn der Rest des Topfes dran war (Uli 23.10.2026:
  // "es kommen immer dieselben dran"). keyFn liefert den Schluessel (z.B. das Wort); gleiche Schluessel zaehlen als dasselbe Wort.
  function pickRot(topf, arr, keyFn, n) {
    n = n || 1;
    const nachKey = new Map();
    arr.forEach(x => { const k = keyFn(x); if (!nachKey.has(k)) nachKey.set(k, x); });
    const keys = Storage.rotationOrdnen(topf, [...nachKey.keys()]).slice(0, n);
    keys.forEach(k => Storage.rotationMelde(topf, k));
    return keys.map(k => nachKey.get(k));
  }

  // 13.09.2026 Uli-Wunsch: "innerhalb des Deutschordners sollte es keine
  // Themenbereiche geben, ich möchte da nur eine Kategorie" - die bisherigen
  // getrennten Kacheln Rechtschreibung/Wortarten erkennen/Schularbeit üben
  // sind deshalb zu EINER Kachel "Gemischte Aufgaben üben" verschmolzen (siehe
  // DEUTSCH_UEBEN_BEREICHE/starteDeutschUeben unten - mischt alle drei Themen
  // plus die neuen Briefe-Themen in einem gemeinsamen Pool). "Lesen &
  // Verstehen" bleibt bewusst als EIGENE Kachel bestehen: es ist strukturell
  // etwas anderes (ein Lesetext mit mehreren Fragen zusammen statt einzelner
  // Quiz-Fragen) und laesst sich nicht einfach in denselben Frage-Pool mischen.
  function renderMenu() {
    App.render(App.subMenuHtml('Deutsch – was übst du?', [
      ...(typeof Grundbegriffe !== 'undefined' ? [Grundbegriffe.menueEintrag('deutsch')] : []),
      { icon: 'wortarten', titel: 'Das musst du wissen: Fälle & mehr', onclick: 'Deutsch.zeigeFaelleLernen()' },
      { icon: 'tagesaufgabe', titel: 'Gemischte Aufgaben üben', onclick: 'Deutsch.starteDeutschUeben()' },
      { icon: 'lesen', titel: 'Lesen & Verstehen', onclick: 'Deutsch.starteLesen()' }
    ]));
  }

  // Jede Aufgabe: Satz mit Lücke (___), Optionen, Index der richtigen Antwort
  const rechtschreibBank = [
    { satz: 'Ich glaube, ___ er heute kommt.', optionen: ['das', 'dass'], richtig: 1 },
    { satz: 'Das ist ___ Buch, das ich meine.', optionen: ['das', 'dass'], richtig: 0 },
    { satz: 'Der ___ bellt laut im Garten.', optionen: ['hund', 'Hund'], richtig: 1 },
    { satz: 'Wir gehen heute in die ___.', optionen: ['schule', 'Schule'], richtig: 1 },
    { satz: 'Die Straße ist sehr ___.', optionen: ['breit', 'braid'], richtig: 0 },
    { satz: 'Er isst einen ___ Apfel.', optionen: ['grosen', 'großen'], richtig: 1 },
    { satz: 'Sie ___ jeden Tag zur Schule.', optionen: ['läuft', 'laüft'], richtig: 0 },
    { satz: 'Der ___ fliegt hoch am Himmel.', optionen: ['Vogel', 'Fogel'], richtig: 0 },
    { satz: 'Wir haben ___ Kinder in der Klasse.', optionen: ['fiele', 'viele'], richtig: 1 },
    { satz: 'Das Wasser im See ist ___ kalt.', optionen: ['ziemlich', 'ziehmlich'], richtig: 0 },
    { satz: 'Die Katze sitzt auf dem ___.', optionen: ['Tisch', 'Disch'], richtig: 0 },
    { satz: 'Er hat ein neues ___ bekommen.', optionen: ['Fahrad', 'Fahrrad'], richtig: 1 },
    { satz: 'Im Winter ist es oft ___.', optionen: ['kalt', 'kald'], richtig: 0 },
    { satz: 'Die Sonne ___ am Morgen auf.', optionen: ['geht', 'geth'], richtig: 0 },
    { satz: 'Wir ___ heute im Garten.', optionen: ['spielen', 'spilen'], richtig: 0 },
    { satz: 'Das Kind ___ sehr müde.', optionen: ['ist', 'ihst'], richtig: 0 },
    { satz: 'Er kauft ein ___ Brot.', optionen: ['frisches', 'frischess'], richtig: 0 },
    { satz: 'Meine Schwester ___ gern Musik.', optionen: ['hört', 'hörd'], richtig: 0 },
    { satz: 'Der ___ ist heute sehr blau.', optionen: ['Himel', 'Himmel'], richtig: 1 },
    { satz: 'Sie ___ einen Brief an die Oma.', optionen: ['schreibt', 'schreipt'], richtig: 0 },
    { satz: 'Wir fahren mit dem ___ in den Urlaub.', optionen: ['Auto', 'Autoh'], richtig: 0 },
    { satz: 'Der Ball ist ganz ___.', optionen: ['rund', 'rundt'], richtig: 0 },
    { satz: 'Die Blume wächst im ___.', optionen: ['Garten', 'Gardten'], richtig: 0 },
    { satz: 'Ich habe ___ Hunger.', optionen: ['grosen', 'großen'], richtig: 1 },
    { satz: 'Er ___ das Fenster.', optionen: ['öffnet', 'öfnet'], richtig: 0 },
    { satz: 'Das Eis ___ in der Sonne.', optionen: ['schmilzt', 'schmiltzt'], richtig: 0 },
    { satz: 'Wir treffen ___ am Nachmittag.', optionen: ['uns', 'unss'], richtig: 0 },
    { satz: 'Die Vögel ___ im Frühling zurück.', optionen: ['kommen', 'komen'], richtig: 0 },
    { satz: 'Er trägt eine warme ___.', optionen: ['Jacke', 'Jake'], richtig: 0 },
    { satz: 'Das Baby ___ ganz friedlich.', optionen: ['schläft', 'schlaft'], richtig: 0 },
    { satz: 'Die Prüfung war ziemlich ___.', optionen: ['schwer', 'schwär'], richtig: 0 },
    { satz: 'Ich ___ mir die Zähne jeden Abend.', optionen: ['putze', 'putse'], richtig: 0 },
    { satz: 'Der Zug fährt ___ pünktlich ab.', optionen: ['imer', 'immer'], richtig: 1 },
    { satz: 'Wir ___ ein tolles Fußballspiel gesehen.', optionen: ['haben', 'habn'], richtig: 0 },
    { satz: 'Das ___ scheint heute den ganzen Tag.', optionen: ['Sonne', 'Sonne'], richtig: 0 }
  ];

  function genRechtschreibung(anzahl) {
    return pickN(rechtschreibBank, anzahl).map(item => ({
      typ: 'mc',
      frage: item.satz,
      optionen: item.optionen,
      richtigIndex: item.richtig
    }));
  }

  // Einzelfrage-Wrapper fuer den gemeinsamen Deutsch-Pool (DEUTSCH_UEBEN_BEREICHE
  // unten) - genRechtschreibung(anzahl) liefert normalerweise ein ganzes Array,
  // der Pool braucht aber pro Aufruf genau EINE Frage wie alle anderen gen-Funktionen.
  function genRechtschreibFrage() {
    return genRechtschreibung(1)[0];
  }

  // Lesetexte mit je 2 Verständnisfragen
  const leseBank = [
    {
      text: 'Lena und ihr Bruder Paul gehen jeden Samstag mit ihrem Hund Rocko in den Park. Dort spielen sie mit einem Ball und Rocko rennt fröhlich hinterher. Danach kaufen sie sich ein Eis am Kiosk.',
      fragen: [
        { frage: 'Wie heißt der Hund?', optionen: ['Rocko', 'Bello', 'Max'], richtig: 0 },
        { frage: 'Was kaufen sie am Kiosk?', optionen: ['Ein Buch', 'Ein Eis', 'Einen Ball'], richtig: 1 }
      ]
    },
    {
      text: 'In der Schule hat die Klasse 3b ein Aquarium mit bunten Fischen. Jeden Montag darf ein Kind die Fische füttern. Diese Woche ist Mia an der Reihe. Sie freut sich sehr darüber.',
      fragen: [
        { frage: 'Was steht in der Klasse?', optionen: ['Ein Aquarium', 'Ein Käfig', 'Ein Terrarium'], richtig: 0 },
        { frage: 'Wer darf diese Woche füttern?', optionen: ['Paul', 'Mia', 'Lena'], richtig: 1 }
      ]
    },
    {
      text: 'Im Herbst fallen die Blätter von den Bäumen. Die Kinder sammeln bunte Blätter und Kastanien auf dem Schulweg. Aus den Kastanien basteln sie später lustige Figuren.',
      fragen: [
        { frage: 'In welcher Jahreszeit spielt die Geschichte?', optionen: ['Sommer', 'Herbst', 'Winter'], richtig: 1 },
        { frage: 'Was sammeln die Kinder außer Blättern?', optionen: ['Kastanien', 'Steine', 'Muscheln'], richtig: 0 }
      ]
    },
    {
      text: 'Am Wochenende fährt Familie Berger an den See. Der Vater grillt Würstchen, während die Kinder im Wasser planschen. Am Abend sind alle müde, aber glücklich nach Hause.',
      fragen: [
        { frage: 'Wohin fährt die Familie?', optionen: ['An den See', 'In die Berge', 'In den Zoo'], richtig: 0 },
        { frage: 'Was macht der Vater?', optionen: ['Er schwimmt', 'Er grillt', 'Er liest'], richtig: 1 }
      ]
    },
    {
      text: 'Ein Igel lebt oft im Garten unter Laubhaufen. Im Winter hält er einen langen Winterschlaf. Erst wenn es wieder wärmer wird, wacht er auf und sucht nach Futter.',
      fragen: [
        { frage: 'Wo lebt der Igel oft?', optionen: ['Im Baum', 'Unter Laubhaufen', 'Im Fluss'], richtig: 1 },
        { frage: 'Was macht der Igel im Winter?', optionen: ['Er wandert', 'Er hält Winterschlaf', 'Er baut ein Nest'], richtig: 1 }
      ]
    },
    {
      text: 'Tom möchte Feuerwehrmann werden, wenn er groß ist. Deshalb besucht seine Klasse die Feuerwache in der Stadt. Dort darf er sogar in einem echten Feuerwehrauto sitzen.',
      fragen: [
        { frage: 'Was möchte Tom werden?', optionen: ['Feuerwehrmann', 'Arzt', 'Lehrer'], richtig: 0 },
        { frage: 'Was besucht die Klasse?', optionen: ['Die Feuerwache', 'Das Rathaus', 'Den Bahnhof'], richtig: 0 }
      ]
    },
    {
      text: 'Die Bäckerei in der Hauptstraße öffnet schon um sechs Uhr morgens. Der Duft von frischen Brötchen zieht durch die ganze Straße. Viele Leute kaufen dort ihr Frühstück.',
      fragen: [
        { frage: 'Wann öffnet die Bäckerei?', optionen: ['Um sechs Uhr', 'Um acht Uhr', 'Um zehn Uhr'], richtig: 0 },
        { frage: 'Was riecht man in der Straße?', optionen: ['Blumen', 'Frische Brötchen', 'Regen'], richtig: 1 }
      ]
    },
    {
      text: 'Im Zoo gibt es seit letzter Woche zwei kleine Löwenbabys. Viele Besucher kommen extra, um sie zu sehen. Die kleinen Löwen spielen den ganzen Tag miteinander.',
      fragen: [
        { frage: 'Welche Tiere sind neu im Zoo?', optionen: ['Löwenbabys', 'Elefanten', 'Affen'], richtig: 0 },
        { frage: 'Was machen die kleinen Löwen?', optionen: ['Sie schlafen nur', 'Sie spielen', 'Sie fressen Fisch'], richtig: 1 }
      ]
    }
  ];

  function genLesen(anzahlTexte) {
    const texte = pickN(leseBank, anzahlTexte);
    const fragen = [];
    texte.forEach(t => {
      t.fragen.forEach((f, idx) => {
        fragen.push({
          typ: 'mc',
          lesetext: idx === 0 ? t.text : null,
          frage: f.frage,
          optionen: f.optionen,
          richtigIndex: f.richtig
        });
      });
    });
    return fragen;
  }

  // Jeder Eintrag ein einfacher Satz (3./4.-Klasse-Niveau) mit genau EINEM
  // markierten Nomen/Verb/Adjektiv - bewusst nur je eins pro Wortart pro Satz
  // (auch wenn ein Satz z.B. mehrere Nomen enthaelt, siehe "Die Vögel singen
  // fröhlich im Baum" mit sowohl "Vögel" als auch "Baum"), damit die 3
  // Antwort-Optionen einer Frage immer eindeutig genau EIN richtiges Wort
  // haben. Die nicht markierten weiteren Nomen im Satz tauchen dadurch nie
  // als Ablenker-Option auf - das waere sonst verwirrend/unfair.
  const wortartenBank = [
    { satz: 'Der kleine Hund bellt laut.', nomen: 'Hund', verb: 'bellt', adjektiv: 'kleine' },
    { satz: 'Die Sonne scheint hell am Himmel.', nomen: 'Sonne', verb: 'scheint', adjektiv: 'hell' },
    { satz: 'Mein Bruder isst einen roten Apfel.', nomen: 'Apfel', verb: 'isst', adjektiv: 'roten' },
    { satz: 'Die Katze schläft auf dem weichen Kissen.', nomen: 'Kissen', verb: 'schläft', adjektiv: 'weichen' },
    { satz: 'Der Junge malt ein buntes Bild.', nomen: 'Bild', verb: 'malt', adjektiv: 'buntes' },
    { satz: 'Im Winter fällt oft weißer Schnee.', nomen: 'Schnee', verb: 'fällt', adjektiv: 'weißer' },
    { satz: 'Die Kinder spielen fröhlich im Garten.', nomen: 'Garten', verb: 'spielen', adjektiv: 'fröhlich' },
    { satz: 'Der alte Baum steht im Wald.', nomen: 'Baum', verb: 'steht', adjektiv: 'alte' },
    { satz: 'Sie backt einen leckeren Kuchen.', nomen: 'Kuchen', verb: 'backt', adjektiv: 'leckeren' },
    { satz: 'Der schnelle Zug fährt in den Bahnhof ein.', nomen: 'Zug', verb: 'fährt', adjektiv: 'schnelle' },
    { satz: 'Das kleine Baby schläft ruhig.', nomen: 'Baby', verb: 'schläft', adjektiv: 'kleine' },
    { satz: 'Der Bauer pflückt reife Äpfel.', nomen: 'Äpfel', verb: 'pflückt', adjektiv: 'reife' },
    { satz: 'Die Vögel singen fröhlich im Baum.', nomen: 'Baum', verb: 'singen', adjektiv: 'fröhlich' },
    { satz: 'Ein starker Wind weht über das Feld.', nomen: 'Wind', verb: 'weht', adjektiv: 'starker' },
    { satz: 'Die freundliche Frau hilft dem Kind.', nomen: 'Frau', verb: 'hilft', adjektiv: 'freundliche' },
    { satz: 'Der müde Wanderer sucht ein Hotel.', nomen: 'Wanderer', verb: 'sucht', adjektiv: 'müde' },
    { satz: 'Im Sommer blühen bunte Blumen.', nomen: 'Blumen', verb: 'blühen', adjektiv: 'bunte' },
    { satz: 'Der Lehrer erklärt eine schwierige Aufgabe.', nomen: 'Aufgabe', verb: 'erklärt', adjektiv: 'schwierige' },
    { satz: 'Die Feuerwehr löscht das brennende Haus.', nomen: 'Haus', verb: 'löscht', adjektiv: 'brennende' },
    { satz: 'Am Abend liest die Mutter eine spannende Geschichte.', nomen: 'Geschichte', verb: 'liest', adjektiv: 'spannende' }
  ];

  const WORTARTEN_LABEL = { nomen: 'Nomen (Namenwort)', verb: 'Verb (Tuwort)', adjektiv: 'Adjektiv (Wiewort)' };

  // Hilfe-Texte (2. Versuch, siehe app.js verarbeiteQuizAntwort/zeigeHilfe) -
  // bewusst ein FESTES, von der jeweiligen Frage UNABHAENGIGES Beispiel pro
  // Wortart (nicht der gerade gefragte Satz selbst), damit Max die Regel an
  // einem zweiten Fall nachvollziehen kann statt nur die Loesung vorgesagt
  // zu bekommen.
  const HILFE_WORTARTEN = {
    nomen: '<strong>Nomen (Namenwort):</strong> bezeichnet eine Person, ein Tier oder eine Sache. Du kannst fast immer "der/die/das" davorsetzen, und es wird großgeschrieben. <strong>Beispiel:</strong> Die kleine Maus läuft schnell. → <strong>Maus</strong> ist das Nomen.',
    verb: '<strong>Verb (Tuwort):</strong> sagt, was jemand tut oder was passiert. Du kannst es umstellen: ich …, du …, er/sie/es … . <strong>Beispiel:</strong> Die kleine Maus läuft schnell. → <strong>läuft</strong> ist das Verb.',
    adjektiv: '<strong>Adjektiv (Wiewort):</strong> beschreibt, wie etwas ist. Du kannst fragen: "Wie ist es?". <strong>Beispiel:</strong> Die kleine Maus läuft schnell. → <strong>kleine</strong> ist das Adjektiv.'
  };

  function genWortarten(anzahl) {
    const kombis = [];
    wortartenBank.forEach(eintrag => {
      ['nomen', 'verb', 'adjektiv'].forEach(wortart => kombis.push({ eintrag, wortart }));
    });
    return pickN(kombis, anzahl).map(({ eintrag, wortart }) => {
      const optionenWorte = shuffle([eintrag.nomen, eintrag.verb, eintrag.adjektiv]);
      return {
        typ: 'mc',
        frage: `„${eintrag.satz}“<br>Welches Wort ist ein <strong>${WORTARTEN_LABEL[wortart]}</strong>?`,
        optionen: optionenWorte,
        richtigIndex: optionenWorte.indexOf(eintrag[wortart]),
        hilfe: HILFE_WORTARTEN[wortart]
      };
    });
  }

  // Einzelfrage-Wrapper fuer den gemeinsamen Deutsch-Pool (DEUTSCH_UEBEN_BEREICHE
  // unten), gleiche Begruendung wie bei genRechtschreibFrage oben. Testet eine
  // andere Blickrichtung als genWortartFreitext (dort: "welche Wortart hat DIESES
  // Wort", hier: "welches Wort IST die genannte Wortart") - beide bleiben deshalb
  // nebeneinander im Pool fuer mehr Abwechslung.
  function genWortartenSucheFrage() {
    return genWortarten(1)[0];
  }

  // ===========================================================================
  // Schularbeit-Vorbereitung 02.09.2026 (Arbeit war am 08.09.2026): Wortarten,
  // Verben-Grundform, Praesens/Praeteritum/Perfekt, Woerter mit ch - seit
  // 13.09.2026 Teil von DEUTSCH_UEBEN_BEREICHE/starteDeutschUeben() weiter
  // unten (siehe dortiger Kommentar). Uli-Wunsch: "er sollte Arten dieser
  // Aufgaben loesen, aber kein Multiple Choice" - alle Generatoren hier nutzen
  // typ:'text' (freie Eingabe mit nativer Tastatur, siehe app.js
  // renderTextEingabe). AUSNAHME: genWortartFreitext nutzt seit 02.09.2026
  // (Uli-Folgewunsch) bewusst typ:'mc' mit den immer gleichen 3 Kategorien
  // als Antwortfelder - siehe Begruendung direkt bei der Funktion.
  // ===========================================================================

  // Wortart bestimmen: Uli-Feedback 02.09.2026 "umständlich, die Wortart zu
  // schreiben - wäre es nicht einfacher, verschiedene Antwortfelder zu
  // geben?" - bewusste AUSNAHME vom "kein Multiple Choice"-Prinzip oben, weil
  // die Kategorien (Nomen/Verb/Adjektiv) immer dieselben 3 sind und Max sie
  // laengst auswendig kennt - Antippen statt Tippen testet hier exakt dasselbe
  // Wissen (welche Wortart ist das Wort?), spart aber unnoetiges Eintippen.
  // Bei allen ANDEREN Generatoren (Verbformen, ch-Woerter) bleibt es bei
  // Freitext, da dort die moeglichen Antworten NICHT auf 3 feste Woerter
  // begrenzt sind und Multiple Choice das Raten erleichtern wuerde.
  function genWortartFreitext() {
    const eintrag = pickN(wortartenBank, 1)[0];
    const wortart = pickN(['nomen', 'verb', 'adjektiv'], 1)[0];
    const antwort = wortart === 'nomen' ? 'Nomen' : wortart === 'verb' ? 'Verb' : 'Adjektiv';
    const optionen = shuffle(['Nomen', 'Verb', 'Adjektiv']);
    return {
      typ: 'mc',
      frage: `„${eintrag.satz}“<br>Welche Wortart hat das Wort <strong>${eintrag[wortart]}</strong>?`,
      optionen,
      richtigIndex: optionen.indexOf(antwort),
      hilfe: HILFE_WORTARTEN[wortart]
    };
  }

  // Verben mit Grundform + Praesens/Praeteritum/Perfekt fuer zwei Personen
  // (er/sie/es und wir - bewusst nicht alle 6 Personen, siehe Projektnotiz:
  // damit jede Form von Hand gegen die Hausaufgaben-Fotos und die deutsche
  // Standard-Konjugation gegengeprueft werden kann statt eine Konjugations-
  // Automatik zu bauen, die grammatisch falsche Formen erzeugen koennte).
  // Bewusst eine Mischung aus regelmaessigen (-te/-t, z.B. "leuchten") und
  // unregelmaessigen/starken Verben (z.B. "gehen", "sprechen") sowie
  // haben- UND sein-Perfekt, da genau das der Kern der Arbeit ist.
  const verbFormenBank = [
    { grundform: 'gehen', formen: { er: { praesens: 'geht', praeteritum: 'ging', perfekt: 'ist gegangen' }, wir: { praesens: 'gehen', praeteritum: 'gingen', perfekt: 'sind gegangen' } } },
    { grundform: 'renovieren', formen: { er: { praesens: 'renoviert', praeteritum: 'renovierte', perfekt: 'hat renoviert' }, wir: { praesens: 'renovieren', praeteritum: 'renovierten', perfekt: 'haben renoviert' } } },
    { grundform: 'unterstützen', formen: { er: { praesens: 'unterstützt', praeteritum: 'unterstützte', perfekt: 'hat unterstützt' }, wir: { praesens: 'unterstützen', praeteritum: 'unterstützten', perfekt: 'haben unterstützt' } } },
    { grundform: 'helfen', formen: { er: { praesens: 'hilft', praeteritum: 'half', perfekt: 'hat geholfen' }, wir: { praesens: 'helfen', praeteritum: 'halfen', perfekt: 'haben geholfen' } } },
    { grundform: 'staunen', formen: { er: { praesens: 'staunt', praeteritum: 'staunte', perfekt: 'hat gestaunt' }, wir: { praesens: 'staunen', praeteritum: 'staunten', perfekt: 'haben gestaunt' } } },
    { grundform: 'sein', formen: { er: { praesens: 'ist', praeteritum: 'war', perfekt: 'ist gewesen' }, wir: { praesens: 'sind', praeteritum: 'waren', perfekt: 'sind gewesen' } } },
    { grundform: 'hängen', formen: { er: { praesens: 'hängt', praeteritum: 'hing', perfekt: 'hat gehangen' }, wir: { praesens: 'hängen', praeteritum: 'hingen', perfekt: 'haben gehangen' } } },
    { grundform: 'haben', formen: { er: { praesens: 'hat', praeteritum: 'hatte', perfekt: 'hat gehabt' }, wir: { praesens: 'haben', praeteritum: 'hatten', perfekt: 'haben gehabt' } } },
    { grundform: 'stehen', formen: { er: { praesens: 'steht', praeteritum: 'stand', perfekt: 'hat gestanden' }, wir: { praesens: 'stehen', praeteritum: 'standen', perfekt: 'haben gestanden' } } },
    { grundform: 'erhalten', formen: { er: { praesens: 'erhält', praeteritum: 'erhielt', perfekt: 'hat erhalten' }, wir: { praesens: 'erhalten', praeteritum: 'erhielten', perfekt: 'haben erhalten' } } },
    { grundform: 'gestalten', formen: { er: { praesens: 'gestaltet', praeteritum: 'gestaltete', perfekt: 'hat gestaltet' }, wir: { praesens: 'gestalten', praeteritum: 'gestalteten', perfekt: 'haben gestaltet' } } },
    { grundform: 'leuchten', formen: { er: { praesens: 'leuchtet', praeteritum: 'leuchtete', perfekt: 'hat geleuchtet' }, wir: { praesens: 'leuchten', praeteritum: 'leuchteten', perfekt: 'haben geleuchtet' } } },
    { grundform: 'sprechen', formen: { er: { praesens: 'spricht', praeteritum: 'sprach', perfekt: 'hat gesprochen' }, wir: { praesens: 'sprechen', praeteritum: 'sprachen', perfekt: 'haben gesprochen' } } },
    { grundform: 'wechseln', formen: { er: { praesens: 'wechselt', praeteritum: 'wechselte', perfekt: 'hat gewechselt' }, wir: { praesens: 'wechseln', praeteritum: 'wechselten', perfekt: 'haben gewechselt' } } },
    { grundform: 'zeichnen', formen: { er: { praesens: 'zeichnet', praeteritum: 'zeichnete', perfekt: 'hat gezeichnet' }, wir: { praesens: 'zeichnen', praeteritum: 'zeichneten', perfekt: 'haben gezeichnet' } } },
    { grundform: 'wachsen', formen: { er: { praesens: 'wächst', praeteritum: 'wuchs', perfekt: 'ist gewachsen' }, wir: { praesens: 'wachsen', praeteritum: 'wuchsen', perfekt: 'sind gewachsen' } } },
    { grundform: 'kriechen', formen: { er: { praesens: 'kriecht', praeteritum: 'kroch', perfekt: 'ist gekrochen' }, wir: { praesens: 'kriechen', praeteritum: 'krochen', perfekt: 'sind gekrochen' } } },
    { grundform: 'klingeln', formen: { er: { praesens: 'klingelt', praeteritum: 'klingelte', perfekt: 'hat geklingelt' }, wir: { praesens: 'klingeln', praeteritum: 'klingelten', perfekt: 'haben geklingelt' } } },
    { grundform: 'springen', formen: { er: { praesens: 'springt', praeteritum: 'sprang', perfekt: 'ist gesprungen' }, wir: { praesens: 'springen', praeteritum: 'sprangen', perfekt: 'sind gesprungen' } } },
    { grundform: 'bringen', formen: { er: { praesens: 'bringt', praeteritum: 'brachte', perfekt: 'hat gebracht' }, wir: { praesens: 'bringen', praeteritum: 'brachten', perfekt: 'haben gebracht' } } },
    { grundform: 'warten', formen: { er: { praesens: 'wartet', praeteritum: 'wartete', perfekt: 'hat gewartet' }, wir: { praesens: 'warten', praeteritum: 'warteten', perfekt: 'haben gewartet' } } },
    { grundform: 'begrüßen', formen: { er: { praesens: 'begrüßt', praeteritum: 'begrüßte', perfekt: 'hat begrüßt' }, wir: { praesens: 'begrüßen', praeteritum: 'begrüßten', perfekt: 'haben begrüßt' } } },
    { grundform: 'zeigen', formen: { er: { praesens: 'zeigt', praeteritum: 'zeigte', perfekt: 'hat gezeigt' }, wir: { praesens: 'zeigen', praeteritum: 'zeigten', perfekt: 'haben gezeigt' } } },
    { grundform: 'wünschen', formen: { er: { praesens: 'wünscht', praeteritum: 'wünschte', perfekt: 'hat gewünscht' }, wir: { praesens: 'wünschen', praeteritum: 'wünschten', perfekt: 'haben gewünscht' } } }
  ];

  const ZEITFORM_LABEL = { praesens: 'Präsens (Gegenwart)', praeteritum: 'Präteritum (1. Vergangenheit)', perfekt: 'Perfekt (2. Vergangenheit)' };
  const PERSON_LABEL = { er: 'er/sie/es', wir: 'wir' };
  const ZEITFORMEN = ['praesens', 'praeteritum', 'perfekt'];
  const PERSONEN = ['er', 'wir'];

  function genVerbGrundformFreitext() {
    const eintrag = pickN(verbFormenBank, 1)[0];
    const person = pickN(PERSONEN, 1)[0];
    const zeitform = pickN(ZEITFORMEN, 1)[0];
    const form = eintrag.formen[person][zeitform];
    const hilfeEintrag = pickN(verbFormenBank.filter(v => v !== eintrag), 1)[0];
    const hilfeForm = hilfeEintrag.formen[person][zeitform];
    return {
      typ: 'text',
      frage: `Wie heißt die Grundform (der Infinitiv) dieses Verbs?<br><strong>${PERSON_LABEL[person]} ${form}</strong>`,
      antwort: eintrag.grundform,
      hilfe: `<strong>Grundform finden:</strong> „${PERSON_LABEL[person]} ${hilfeForm}“ → die Grundform ist <strong>${hilfeEintrag.grundform}</strong> (frage dich: was tut er/sie/es bzw. was tun wir? → „…en“).`
    };
  }

  function genVerbZeitformFreitext() {
    const eintrag = pickN(verbFormenBank, 1)[0];
    const person = pickN(PERSONEN, 1)[0];
    const zeitform = pickN(ZEITFORMEN, 1)[0];
    const antwort = eintrag.formen[person][zeitform];
    const hilfeEintrag = pickN(verbFormenBank.filter(v => v !== eintrag), 1)[0];
    const hilfeForm = hilfeEintrag.formen[person][zeitform];
    return {
      typ: 'text',
      frage: `Schreibe die richtige Form von <strong>„${eintrag.grundform}“</strong> im <strong>${ZEITFORM_LABEL[zeitform]}</strong>:<br>${PERSON_LABEL[person]} ___`,
      antwort,
      hilfe: `<strong>${ZEITFORM_LABEL[zeitform]}</strong> von „${hilfeEintrag.grundform}“: ${PERSON_LABEL[person]} <strong>${hilfeForm}</strong>.`
    };
  }

  // Luecken-Saetze zu Woertern mit "ch" (Verben/Substantive/Adjektive aus den
  // Hausaufgaben-Fotos). Jeder Satz bewusst so formuliert, dass genau EIN
  // Wort eindeutig richtig ist (kein "koennte auch X sein").
  const chWoerterBank = [
    { satz: 'Der Radfahrer muss immer auf den Verkehr ___.', antwort: 'achten' },
    { satz: 'Wir wollen bei unserem Ausflug die alte Burg ___.', antwort: 'besichtigen' },
    { satz: 'Sie blieb stehen, um das Bild in Ruhe zu ___.', antwort: 'betrachten' },
    { satz: 'Der Wächter muss die ganze Nacht ___.', antwort: 'wachen' },
    { satz: 'Die Blumen im Garten ___ herrlich.', antwort: 'riechen' },
    { satz: 'Die Kinder ___ laut über den Witz.', antwort: 'lachen' },
    { satz: 'Mama will heute Abend Nudeln ___.', antwort: 'kochen' },
    { satz: 'Bitte ___ mir das Salz!', antwort: 'reichen' },
    { satz: 'Im Sommer möchte ich im See ___.', antwort: 'tauchen' },
    { satz: 'Wir ___ noch mehr Zeit für diese Aufgabe.', antwort: 'brauchen' },
    { satz: 'Der trockene Ast könnte bei dem Sturm leicht ___.', antwort: 'brechen' },
    { satz: 'Die wütende Katze fängt an zu ___.', antwort: 'fauchen' },
    { satz: 'Im Winter kann man auf die kalten Hände ___.', antwort: 'hauchen' },
    { satz: 'Die Hausaufgaben muss Max noch heute ___.', antwort: 'machen' },
    { satz: 'Max möchte ein Bild vom Wald ___.', antwort: 'zeichnen' },
    { satz: 'In der ersten Stunde haben wir das ___ Mathe.', antwort: 'Fach' },
    { satz: 'Der Fußballplatz hat eine große grüne ___.', antwort: 'Fläche' },
    { satz: 'Im alten Pullover war ein kleines ___.', antwort: 'Loch' },
    { satz: 'Unser ___ hat einen freundlichen Hund.', antwort: 'Nachbar' },
    { satz: 'Am Montag beginnt eine neue ___.', antwort: 'Woche' },
    { satz: 'Bei Regen bleiben wir unter dem ___ trocken.', antwort: 'Dach' },
    { satz: 'Im Herbst fliegt dieser Vogel rufend in einer V-Formation nach Süden: der ___.', antwort: 'Kranich' },
    { satz: 'Die Aufgabe war nicht schwer, sondern ganz ___.', antwort: 'einfach' },
    { satz: 'Pünktlichkeit ist mir sehr ___.', antwort: 'wichtig' },
    { satz: 'Die Kinder ___ im Wald nach bunten Pilzen.', antwort: 'suchen' }
  ];

  function genWoerterMitChFreitext() {
    const eintrag = pickN(chWoerterBank, 1)[0];
    const hilfeEintrag = pickN(chWoerterBank.filter(w => w !== eintrag), 1)[0];
    return {
      typ: 'text',
      frage: `Ergänze das fehlende Wort mit „ch“:<br>${eintrag.satz}`,
      antwort: eintrag.antwort,
      hilfe: `<strong>Beispiel:</strong> ${hilfeEintrag.satz.replace('___', hilfeEintrag.antwort)}`
    };
  }

  // Pool fuer starteDeutschUeben() (frueher starteSchularbeitUeben) - bewusst
  // OHNE Mathes Stats-Gewichtung (KATEGORIE_BASISGEWICHT/gewichtFuerStat,
  // siehe mathe.js): reine
  // Gleichverteilung reicht fuer dieses kurzfristige Feature.
  // ---- Anredepronomen Sie/Ihre/Ihnen (gross) vs. sie/ihre (klein) - Foto
  // "Briefe schreiben"/"Eine E-Mail schreiben", 12.09.2026, kein Klassenarbeits-
  // Termin diesmal, sondern aktueller Schulstoff. Saetze bewusst NICHT 1:1 aus
  // dem (teils schwer lesbaren, handschriftlich ueberklebten) Foto abgetippt,
  // sondern von den eindeutig gedruckten Vorbildern abgeleitet (MERKE-DIR-Kasten
  // "Wir bitten Sie um Ihre Hilfe. Ich wünsche Ihnen ein schönes Wochenende!"
  // sowie Max' eigene, bereits korrekt bewertete E-Mail-Luecken) - jeder Satz
  // hat dadurch eine sicher belegte, eindeutige Loesung.
  // f.grossKleinPruefen:true (siehe genAnredepronomenFrage) macht die Pruefung
  // in app.js case-sensitiv - hier IST die Gross-/Kleinschreibung die Aufgabe.
  const anredepronomenBank = [
    { satz: 'Wir bitten ___ um Ihre Hilfe.', antwort: 'Sie' },
    { satz: 'Wir bitten Sie um ___ Hilfe.', antwort: 'Ihre' },
    { satz: 'Ich wünsche ___ ein schönes Wochenende!', antwort: 'Ihnen' },
    { satz: 'Liebe Frau Müller, wir haben eine Frage an ___.', antwort: 'Sie' },
    { satz: 'Kommen ___ gut nach Hause, Herr Holz!', antwort: 'Sie' },
    { satz: 'Vielen Dank für ___ schnelle Antwort, Frau Müller.', antwort: 'Ihre' },
    { satz: 'Wir schreiben ___, weil wir eine Bitte haben.', antwort: 'Ihnen' },
    { satz: 'Viele Grüße, ___ Klasse 4a', antwort: 'Ihre' },
    { satz: 'Die Eltern haben ___ Unterstützung zugesagt.', antwort: 'ihre' },
    { satz: 'Die Schüler haben ___ Bücher mitgebracht.', antwort: 'ihre' },
    { satz: 'Max und Lena haben ___ Hausaufgaben schon fertig.', antwort: 'ihre' },
    { satz: 'Die Kinder haben ___ Spielzeug aufgeräumt.', antwort: 'ihre' }
  ];

  function genAnredepronomenFrage() {
    const eintrag = pickN(anredepronomenBank, 1)[0];
    const istGewoehnlichesPronomen = eintrag.antwort === eintrag.antwort.toLowerCase();
    return {
      typ: 'text',
      grossKleinPruefen: true,
      frage: `Setze das richtige Wort ein (auf Groß-/Kleinschreibung achten!):<br>${eintrag.satz}`,
      antwort: eintrag.antwort,
      hilfe: istGewoehnlichesPronomen
        ? `Hier ist von ANDEREN Leuten die Rede (nicht von der Person, die den Brief bekommt) - ein ganz normales Wort für "sie", deshalb klein: „${eintrag.antwort}"`
        : `Das ist ein ANREDEPRONOMEN - es spricht die Person direkt an, die den Brief/die Karte bekommt. Auf Karten und Briefen wird das IMMER großgeschrieben: „${eintrag.antwort}"`
    };
  }

  // ---- Persönlicher oder förmlicher Brief? (Foto "Persönlicher und förmlicher
  // Brief", 12.09.2026) - genau 2 feste Kategorien, deshalb bewusst typ:'mc'
  // statt Freitext (gleiche Ausnahme wie genWortartFreitext oben). Phrasen +
  // Zuordnung 1:1 von Max' eigenem, bereits korrigiertem Arbeitsblatt uebernommen
  // (gruen=persönlich/rot=förmlich markiert), keine eigene Einschaetzung noetig.
  const briefStilBank = [
    { phrase: 'Mit freundlichen Grüßen', stil: 'förmlich' },
    { phrase: 'Hey Madeleine!', stil: 'persönlich' },
    { phrase: 'Hallo Timo, ...', stil: 'persönlich' },
    { phrase: 'Ich freue mich auf deine Antwort.', stil: 'persönlich' },
    { phrase: 'Wie geht es dir?', stil: 'persönlich' },
    { phrase: 'Sehr geehrte Damen und Herren, ...', stil: 'förmlich' },
    { phrase: 'Hochachtungsvoll', stil: 'förmlich' },
    { phrase: 'Ich hoffe, es geht dir gut.', stil: 'persönlich' },
    { phrase: 'Ich schreibe Ihnen, weil ...', stil: 'förmlich' },
    { phrase: 'Hiermit möchte ich meinen Handyvertrag kündigen.', stil: 'förmlich' },
    { phrase: 'Liebe Sophie, ...', stil: 'persönlich' },
    { phrase: 'Ich habe mich sehr über deinen Brief gefreut!', stil: 'persönlich' },
    { phrase: 'Bitte senden Sie mir eine schriftliche Bestätigung zu.', stil: 'förmlich' },
    { phrase: 'Ich kann leider nicht zu deiner Geburtstagsparty kommen.', stil: 'persönlich' },
    { phrase: 'Sehr geehrte Frau Müller, ...', stil: 'förmlich' },
    { phrase: 'Ich wünsche dir einen schönen Tag.', stil: 'persönlich' },
    { phrase: 'Auf eine Einladung zu einem persönlichen Gespräch freue ich mich.', stil: 'förmlich' },
    { phrase: 'Melde dich bitte bei mir, falls du nicht kommen kannst.', stil: 'persönlich' },
    { phrase: 'Ich bitte Sie, mein Fehlen zu entschuldigen.', stil: 'förmlich' },
    { phrase: 'Bis bald!', stil: 'persönlich' }
  ];

  function genBriefStilFrage() {
    const eintrag = pickN(briefStilBank, 1)[0];
    const optionen = ['persönlich', 'förmlich'];
    return {
      typ: 'mc',
      frage: `Ist das persönlich oder förmlich?<br>„${eintrag.phrase}"`,
      optionen,
      richtigIndex: optionen.indexOf(eintrag.stil),
      hilfe: eintrag.stil === 'förmlich'
        ? `Das klingt höflich-distanziert und nutzt "Sie/Ihnen" oder feste Floskeln - typisch für einen Brief an Fremde/Aemter/Firmen: <strong>förmlich</strong>.`
        : `Das klingt wie zu einem Freund/einer Freundin gesprochen (Anrede mit "du") - typisch für persönliche Briefe/Nachrichten: <strong>persönlich</strong>.`
    };
  }

  // ============================================================
  // Die vier Faelle (11.10.2026, Fotos der Arbeitsblaetter "Der 1.-4. Fall",
  // Hundethema; Test "vier Faelle" am Do 29.10.2026 laut Uli-Kalender).
  // Die Saetze stammen von den Arbeitsblaettern; der Fall jedes Satzteils ist von
  // der Grammatik abgeleitet, NICHT von Max' Markierungen/Haekchen auf den Fotos
  // uebernommen. Nur eindeutige Satzteile sind markiert (Praepositionalgruppen wie
  // "mit dem Wohnmobil" bewusst nicht), damit jede Aufgabe genau eine Loesung hat.
  // Kuerzel: N = Nominativ, G = Genitiv, D = Dativ, A = Akkusativ.
  // ============================================================
  const FAELLE = {
    N: { nummer: 1, name: 'Nominativ', frage: 'Wer oder was?' },
    G: { nummer: 2, name: 'Genitiv', frage: 'Wessen?' },
    D: { nummer: 3, name: 'Dativ', frage: 'Wem?' },
    A: { nummer: 4, name: 'Akkusativ', frage: 'Wen oder was?' }
  };
  const FALL_KEYS = ['N', 'G', 'D', 'A'];
  const FALL_MERKKASTEN = '<strong>Merke dir die vier Fälle:</strong><br>1. Fall <strong>Nominativ</strong> – Wer oder was?<br>2. Fall <strong>Genitiv</strong> – Wessen?<br>3. Fall <strong>Dativ</strong> – Wem?<br>4. Fall <strong>Akkusativ</strong> – Wen oder was?';

  const FAELLE_SAETZE = [
    // Arbeitsblatt 2 (Nominativ)
    { s: 'Der Dalmatiner hat weißes Fell mit schwarzen Punkten.', p: [['Der Dalmatiner', 'N'], ['weißes Fell', 'A']] },
    { s: 'In Norwegen ziehen Huskies oft einen Schlitten.', p: [['Huskies', 'N'], ['einen Schlitten', 'A']] },
    { s: 'Seit 5 Jahren gehört der Dackel zur Familie.', p: [['der Dackel', 'N']] },
    { s: 'Das Körbchen des Hundes steht vor dem Kamin.', p: [['Das Körbchen', 'N'], ['des Hundes', 'G']] },
    { s: 'Im Park wirft der Junge seinem Hund die Frisbee zu.', p: [['der Junge', 'N'], ['seinem Hund', 'D'], ['die Frisbee', 'A']] },
    { s: 'Die Lehrerin erklärt den Kindern die Hunderegeln.', p: [['Die Lehrerin', 'N'], ['den Kindern', 'D'], ['die Hunderegeln', 'A']] },
    { s: 'Jeden Abend liest Lena ihrem Hund eine Geschichte vor.', p: [['Lena', 'N'], ['ihrem Hund', 'D'], ['eine Geschichte', 'A']] },
    { s: 'Der Polizeihund fängt den Dieb.', p: [['Der Polizeihund', 'N'], ['den Dieb', 'A']] },
    { s: 'In den Ferien fährt die Familie mit dem Wohnmobil nach Italien.', p: [['die Familie', 'N']] },
    { s: 'Am Morgen bringt der Labrador seinem Herrchen die Zeitung.', p: [['der Labrador', 'N'], ['seinem Herrchen', 'D'], ['die Zeitung', 'A']] },
    { s: 'Im Kunstunterricht basteln die Kinder verschiedene Hundespielzeuge.', p: [['die Kinder', 'N'], ['verschiedene Hundespielzeuge', 'A']] },
    { s: 'Das Fell des Hundes ist weiß.', p: [['Das Fell', 'N'], ['des Hundes', 'G']] },
    { s: 'Im Sommer schläft der Hund gerne unter dem Apfelbaum.', p: [['der Hund', 'N']] },
    { s: 'Der Junge gibt dem Hund ein Leckerli.', p: [['Der Junge', 'N'], ['dem Hund', 'D'], ['ein Leckerli', 'A']] },
    { s: 'Samstags muss der Welpe zur Hundeschule.', p: [['der Welpe', 'N']] },
    { s: 'Der Hundenapf ist schon wieder leer.', p: [['Der Hundenapf', 'N']] },
    { s: 'Vor großen, schwarzen Hunden hat das Mädchen Angst.', p: [['das Mädchen', 'N']] },
    { s: 'Meine Großeltern passen heute auf Felix auf.', p: [['Meine Großeltern', 'N'], ['Felix', 'A']] },
    { s: 'Zum Geburtstag bekommt der Hund ein neues Halsband.', p: [['der Hund', 'N'], ['ein neues Halsband', 'A']] },
    { s: 'Der Kater faucht den Hund böse an.', p: [['Der Kater', 'N'], ['den Hund', 'A']] },
    // Arbeitsblatt 4 (Genitiv)
    { s: 'Das Halsband des Hundes ist blau.', p: [['Das Halsband', 'N'], ['des Hundes', 'G']] },
    { s: 'Schnee bedeckt die Gipfel der Berge.', p: [['Schnee', 'N'], ['die Gipfel', 'A'], ['der Berge', 'G']] },
    { s: 'Die Augen der Kinder strahlen vor Freude.', p: [['Die Augen', 'N'], ['der Kinder', 'G']] },
    { s: 'Die Regeln des Spiels sind wirklich einfach.', p: [['Die Regeln', 'N'], ['des Spiels', 'G']] },
    { s: 'Die Hundefriseurin schneidet das Fell des Hundes kurz.', p: [['Die Hundefriseurin', 'N'], ['das Fell', 'A'], ['des Hundes', 'G']] },
    { s: 'Das Mädchen mistet den Stall des Pferdes aus.', p: [['Das Mädchen', 'N'], ['den Stall', 'A'], ['des Pferdes', 'G']] },
    { s: 'Die Pfoten der Hunde sind nass vom Regen.', p: [['Die Pfoten', 'N'], ['der Hunde', 'G']] },
    { s: 'Der Hund klaut die Kekse der Kinder.', p: [['Der Hund', 'N'], ['die Kekse', 'A'], ['der Kinder', 'G']] },
    { s: 'In den Ferien verschlafen wir die Hälfte des Tages.', p: [['die Hälfte', 'A'], ['des Tages', 'G']] },
    { s: 'Am Morgen bringt der Labrador die Socken des Herrchens.', p: [['der Labrador', 'N'], ['die Socken', 'A'], ['des Herrchens', 'G']] },
    { s: 'Im Sportunterricht erklärt der Lehrer die Aufgaben der Stationen.', p: [['der Lehrer', 'N'], ['die Aufgaben', 'A'], ['der Stationen', 'G']] },
    { s: 'Der Knochen des Hundes ist im Garten versteckt.', p: [['Der Knochen', 'N'], ['des Hundes', 'G']] },
    { s: 'Im Sommer liebt der Hund die Kälte der Fliesen.', p: [['der Hund', 'N'], ['die Kälte', 'A'], ['der Fliesen', 'G']] },
    { s: 'Die Hunde des Nachbarn bellen am Zaun.', p: [['Die Hunde', 'N'], ['des Nachbarn', 'G']] },
    { s: 'Lisa findet Mamas Kette sehr schön.', p: [['Lisa', 'N'], ['Mamas', 'G']] },
    { s: 'Das Haus der Familie wird von ihrem Schäferhund bewacht.', p: [['Das Haus', 'N'], ['der Familie', 'G']] },
    { s: 'Tom passt heute auf den Hund seines Freundes auf.', p: [['Tom', 'N'], ['den Hund', 'A'], ['seines Freundes', 'G']] },
    { s: 'Majas Geschirr wird langsam zu klein.', p: [['Majas', 'G'], ['Geschirr', 'N']] },
    { s: 'Opas Hund macht komische Geräusche.', p: [['Opas', 'G'], ['Hund', 'N'], ['komische Geräusche', 'A']] },
    { s: 'Der Dalmatiner frisst manchmal das Futter der Katze.', p: [['Der Dalmatiner', 'N'], ['das Futter', 'A'], ['der Katze', 'G']] },
    // Arbeitsblatt 6 (Dativ)
    { s: 'Der Tierarzt gibt dem Hund eine Spritze.', p: [['Der Tierarzt', 'N'], ['dem Hund', 'D'], ['eine Spritze', 'A']] },
    { s: 'Papa schenkt Mama eine Schachtel Pralinen.', p: [['Papa', 'N'], ['Mama', 'D'], ['eine Schachtel Pralinen', 'A']] },
    { s: 'Der Jäger gibt dem Jagdhund ein Kommando.', p: [['Der Jäger', 'N'], ['dem Jagdhund', 'D'], ['ein Kommando', 'A']] },
    { s: 'Dem Chihuahua ist es im Winter zu kalt.', p: [['Dem Chihuahua', 'D']] },
    { s: 'Der Hund klaut der Katze ihr Spielzeug.', p: [['Der Hund', 'N'], ['der Katze', 'D'], ['ihr Spielzeug', 'A']] },
    { s: 'Zum Abschied bellt der Hund den Kindern hinterher.', p: [['der Hund', 'N'], ['den Kindern', 'D']] },
    { s: 'Das Mädchen schenkt den Hunden im Tierheim ihre Kuscheltiere.', p: [['Das Mädchen', 'N'], ['den Hunden', 'D'], ['ihre Kuscheltiere', 'A']] },
    { s: 'Der Hund leckt dem Baby einmal durchs Gesicht.', p: [['Der Hund', 'N'], ['dem Baby', 'D']] },
    { s: 'An Weihnachten backen wir dem Weihnachtsmann Kekse.', p: [['dem Weihnachtsmann', 'D'], ['Kekse', 'A']] },
    { s: 'Die Kinder bauen den Vögeln ein Häuschen.', p: [['Die Kinder', 'N'], ['den Vögeln', 'D'], ['ein Häuschen', 'A']] },
    { s: 'Im Deutschunterricht erklärt der Lehrer dem Schüler die Aufgabe.', p: [['der Lehrer', 'N'], ['dem Schüler', 'D'], ['die Aufgabe', 'A']] },
    { s: 'Ich rufe dem Postboten noch schnell hinterher.', p: [['dem Postboten', 'D']] },
    { s: 'Mila schreibt Oma eine Postkarte aus dem Urlaub.', p: [['Mila', 'N'], ['Oma', 'D'], ['eine Postkarte', 'A']] },
    { s: 'Der Junge gibt dem Pudel einen Kuss.', p: [['Der Junge', 'N'], ['dem Pudel', 'D'], ['einen Kuss', 'A']] },
    { s: 'Mama gibt Papa ein Kuchenstück.', p: [['Mama', 'N'], ['Papa', 'D'], ['ein Kuchenstück', 'A']] },
    { s: 'Die Fee erfüllt der Prinzessin einen Wunsch.', p: [['Die Fee', 'N'], ['der Prinzessin', 'D'], ['einen Wunsch', 'A']] },
    { s: 'Tom vertraut dem Hund seinen Fußball an.', p: [['Tom', 'N'], ['dem Hund', 'D'], ['seinen Fußball', 'A']] },
    { s: 'Der Opa sitzt neben dem Dackel auf dem Sofa.', p: [['Der Opa', 'N']] },
    { s: 'Lisa bringt dem Pferd ein neues Kunststück bei.', p: [['Lisa', 'N'], ['dem Pferd', 'D'], ['ein neues Kunststück', 'A']] },
    { s: 'Die Schwester leiht dem Bruder eine Schere.', p: [['Die Schwester', 'N'], ['dem Bruder', 'D'], ['eine Schere', 'A']] },
    // Arbeitsblatt 8 (Akkusativ)
    { s: 'Der Hund bekommt heute eine Wurmkur.', p: [['Der Hund', 'N'], ['eine Wurmkur', 'A']] },
    { s: 'Papa gibt Mama einen Kuss.', p: [['Papa', 'N'], ['Mama', 'D'], ['einen Kuss', 'A']] },
    { s: 'Der Husky zieht den Schlitten durch den Schnee.', p: [['Der Husky', 'N'], ['den Schlitten', 'A']] },
    { s: 'Der Hund frisst gerne Käse.', p: [['Der Hund', 'N'], ['Käse', 'A']] },
    { s: 'Der Junge schießt den Ball zu seinem Hund.', p: [['Der Junge', 'N'], ['den Ball', 'A']] },
    { s: 'Die Lehrerin zeigt den Kindern einen Film.', p: [['Die Lehrerin', 'N'], ['den Kindern', 'D'], ['einen Film', 'A']] },
    { s: 'Das Mädchen malt ein Kaninchen auf das Bild.', p: [['Das Mädchen', 'N'], ['ein Kaninchen', 'A']] },
    { s: 'Der Mann kauft seinem Hund ein Würstchen.', p: [['Der Mann', 'N'], ['seinem Hund', 'D'], ['ein Würstchen', 'A']] },
    { s: 'Heute gibt es die Leckerlis im Sonderangebot.', p: [['die Leckerlis', 'A']] },
    { s: 'Felix bastelt ein Geschenk für seinen Hund.', p: [['Felix', 'N'], ['ein Geschenk', 'A']] },
    { s: 'Die Katze fängt auf der Wiese eine Maus.', p: [['Die Katze', 'N'], ['eine Maus', 'A']] },
    { s: 'Der Hund sucht den Ball unter der Hecke.', p: [['Der Hund', 'N'], ['den Ball', 'A']] },
    { s: 'Esma schreibt ihrer Tante einen Brief.', p: [['Esma', 'N'], ['ihrer Tante', 'D'], ['einen Brief', 'A']] },
    { s: 'Die Hausaufgaben hat das Mädchen leider vergessen.', p: [['Die Hausaufgaben', 'A'], ['das Mädchen', 'N']] },
    { s: 'Die Schwester klaut ihrem Bruder das Handy.', p: [['Die Schwester', 'N'], ['ihrem Bruder', 'D'], ['das Handy', 'A']] },
    { s: 'Meine Mutter kauft sich ein Buch in der Buchhandlung.', p: [['Meine Mutter', 'N'], ['ein Buch', 'A']] },
    { s: 'Die Katze leckt sich das Fell sauber.', p: [['Die Katze', 'N'], ['das Fell', 'A']] },
    { s: 'Opa verkauft das Auto an den Nachbarn.', p: [['Opa', 'N'], ['das Auto', 'A']] },
    { s: 'Paul bringt dem Hund einen Trick bei.', p: [['Paul', 'N'], ['dem Hund', 'D'], ['einen Trick', 'A']] },
    { s: 'Maja bekommt zum Geburtstag ein Halsband.', p: [['Maja', 'N'], ['ein Halsband', 'A']] },
    // Arbeitsblatt g ("Verbinde mit dem richtigen Napf")
    { s: 'Der Hund träumt von einer Salami.', p: [['Der Hund', 'N']] },
    { s: 'Im Sommer geht der Labrador gerne schwimmen.', p: [['der Labrador', 'N']] },
    { s: 'Timo wirft den Ball.', p: [['Timo', 'N'], ['den Ball', 'A']] },
    { s: 'Das Halsband des Dalmatiners ist rot.', p: [['Das Halsband', 'N'], ['des Dalmatiners', 'G']] },
    { s: 'Heute juckt dem Hund das Fell.', p: [['dem Hund', 'D'], ['das Fell', 'N']] },
    { s: 'Karim bringt dem Schulhund einen Trick bei.', p: [['Karim', 'N'], ['dem Schulhund', 'D'], ['einen Trick', 'A']] },
    { s: 'Der Tierarzt gibt dem Hund eine Impfung.', p: [['Der Tierarzt', 'N'], ['dem Hund', 'D'], ['eine Impfung', 'A']] },
    { s: 'Hunde hören besser als Menschen.', p: [['Hunde', 'N']] },
    { s: 'Das Fell des Hundes ist braun.', p: [['Das Fell', 'N'], ['des Hundes', 'G']] },
    { s: 'Den Kindern gefiel der neue Hundefilm.', p: [['Den Kindern', 'D'], ['der neue Hundefilm', 'N']] },
    { s: 'Der Junge gibt dem Hund ein Stück Käse.', p: [['Der Junge', 'N'], ['dem Hund', 'D'], ['ein Stück Käse', 'A']] },
    { s: 'Maja gibt das Pfötchen.', p: [['Maja', 'N'], ['das Pfötchen', 'A']] },
    { s: 'Der Hund versteckt die Schuhe des Vaters.', p: [['Der Hund', 'N'], ['die Schuhe', 'A'], ['des Vaters', 'G']] },
    // Arbeitsblaetter 1/3/5/7 ("Erfrage den ...")
    { s: 'Buddy ist ein Dalmatiner.', p: [['Buddy', 'N']] },
    { s: 'Gestern vergrub der Hund seinen Knochen im Garten.', p: [['der Hund', 'N'], ['seinen Knochen', 'A']] },
    { s: 'Im Park spielt die Hündin mit ihrem Tennisball.', p: [['die Hündin', 'N']] },
    { s: 'Die Hundeleine ist aus Leder.', p: [['Die Hundeleine', 'N']] },
    { s: 'Der Vater hat dem Hund eine Hundehütte gebaut.', p: [['Der Vater', 'N'], ['dem Hund', 'D'], ['eine Hundehütte', 'A']] },
    { s: 'Der Ball des Dackels ist gelb.', p: [['Der Ball', 'N'], ['des Dackels', 'G']] },
    { s: 'Im Herbst verfärben sich die Blätter der Bäume.', p: [['die Blätter', 'N'], ['der Bäume', 'G']] },
    { s: 'Max genießt die Strahlen der Sonne auf seinem Fell.', p: [['Max', 'N'], ['die Strahlen', 'A'], ['der Sonne', 'G']] },
    { s: 'Der Schwanz des Hundes wedelt vor Freude.', p: [['Der Schwanz', 'N'], ['des Hundes', 'G']] },
    { s: 'Der Hund klaut das Spielzeug der Katze.', p: [['Der Hund', 'N'], ['das Spielzeug', 'A'], ['der Katze', 'G']] },
    { s: 'Ich gebe dem Hund ein Stück Schinken.', p: [['dem Hund', 'D'], ['ein Stück Schinken', 'A']] },
    { s: 'Der Apfel schmeckt dem Pferd sehr gut.', p: [['Der Apfel', 'N'], ['dem Pferd', 'D']] },
    { s: 'Klara krault dem Kätzchen die Ohren.', p: [['Klara', 'N'], ['dem Kätzchen', 'D'], ['die Ohren', 'A']] },
    { s: 'Der Polizeihund hilft dem Polizisten den Dieb zu fangen.', p: [['Der Polizeihund', 'N'], ['dem Polizisten', 'D'], ['den Dieb', 'A']] },
    { s: 'Der Hund klaut Mama die Hausschuhe.', p: [['Der Hund', 'N'], ['Mama', 'D'], ['die Hausschuhe', 'A']] },
    { s: 'Ich liebe den Hund sehr.', p: [['den Hund', 'A']] },
    { s: 'Oma backt eine Geburtstagstorte für mich.', p: [['Oma', 'N'], ['eine Geburtstagstorte', 'A']] },
    { s: 'Pelle versteckt den Knochen in der Mülltonne.', p: [['Pelle', 'N'], ['den Knochen', 'A']] },
    { s: 'Das Mädchen streichelt das Pferd am Hals.', p: [['Das Mädchen', 'N'], ['das Pferd', 'A']] },
    { s: 'Der Hund zieht heute einen Regenmantel an.', p: [['Der Hund', 'N'], ['einen Regenmantel', 'A']] }
  ];

  // Satz mit hervorgehobenem Satzteil (unterstrichen wie auf dem Arbeitsblatt)
  function satzMitMarkierung(satz, phrase) {
    const i = satz.indexOf(phrase);
    return satz.slice(0, i) + '<u><strong>' + phrase + '</strong></u>' + satz.slice(i + phrase.length);
  }

  function fallOptionen() { return FALL_KEYS.map(k => FAELLE[k].name); }

  // ---- Stufen (Uli 19.10.2026): Max soll die Fragewoerter SELBST abrufen, keine Dauerhilfe.
  // Stufe 1 (Serie des Falls < 3): Zwischenschritt "Welche Frage passt?" vor der Aufgabe.
  // Stufe 2 (3 in Folge auf Anhieb inkl. Zwischenschritt): nur die Aufgabe. Nach einem Fehler
  // gilt wieder Stufe 1. Nach einem falschen 1. Versuch kommt eine Rueckfrage statt der Loesung.
  const FALL_STUFE_SERIE = 3;
  function fallStufe(fall) { return Storage.getFaelleSerie()[fall] >= FALL_STUFE_SERIE ? 2 : 1; }
  function fragewortVorfrage(fall, text) {
    return { frage: text, optionen: FALL_KEYS.map(k => FAELLE[k].frage), richtigIndex: FALL_KEYS.indexOf(fall) };
  }
  function mitFallStufe(f, fall, vorfrageText) {
    f.fall = fall;
    f.stufe = fallStufe(fall);
    if (f.stufe === 1) f.vorfrage = fragewortVorfrage(fall, vorfrageText);
    f.aufAntwort = ok => Storage.meldeFallErgebnis(fall, ok && f._vorfrageRichtig !== false);
    return f;
  }

  // ---- 1) "In welchem Fall steht der unterstrichene Satzteil?" (Napf-Blatt) ----
  // Fall zuerst gleichverteilt wuerfeln, damit Genitiv/Dativ (seltener) nicht untergehen.
  function genFallBestimmenFrage() {
    const fall = FALL_KEYS[Math.floor(Math.random() * 4)];
    const saetze = FAELLE_SAETZE.filter(e => e.p.some(([, f]) => f === fall));
    const e = pickN(saetze, 1)[0];
    const phrase = pickN(e.p.filter(([, f]) => f === fall), 1)[0][0];
    const optionen = fallOptionen();
    return mitFallStufe({
      typ: 'mc',
      frage: `In welchem Fall steht der unterstrichene Satzteil?<br>${satzMitMarkierung(e.s, phrase)}`,
      verlaufText: `Fall bestimmen: „${phrase}“ in „${e.s}“`.slice(0, 190),
      optionen,
      richtigIndex: FALL_KEYS.indexOf(fall),
      rueckfrage: `Stelle die Frage zum Satzteil „${phrase}“: Wer oder was? · Wessen? · Wem? · Wen oder was? – welche passt?`,
      hilfe: `${FALL_MERKKASTEN}<br><br>Frage nach dem Satzteil: Passt <strong>${FAELLE[fall].frage}</strong> dazu? Hier: „${phrase}“ → <strong>${FAELLE[fall].name}</strong> (${FAELLE[fall].nummer}. Fall).`
    }, fall, `Mit welcher Frage findest du den Fall von „${phrase}“ heraus?`);
  }

  // ---- 2) "Welcher Satzteil steht im Dativ?" (Unterstreiche-Blaetter) ----
  function genSatzteilImFallFrage() {
    for (let versuch = 0; versuch < 200; versuch++) {
      const fall = FALL_KEYS[Math.floor(Math.random() * 4)];
      const e = pickN(FAELLE_SAETZE, 1)[0];
      const ziel = e.p.filter(([, f]) => f === fall);
      const andere = e.p.filter(([, f]) => f !== fall);
      if (ziel.length !== 1 || andere.length < 1) continue;
      const phrasen = shuffle([ziel[0][0], ...pickN(andere, 2).map(([t]) => t)]);
      return mitFallStufe({
        typ: 'mc',
        frage: `Welcher Satzteil steht im <strong>${FAELLE[fall].name}</strong> (${FAELLE[fall].nummer}. Fall)?<br>${e.s}`,
        verlaufText: `Welcher Satzteil im ${FAELLE[fall].name}? „${e.s}“`.slice(0, 190),
        optionen: phrasen,
        richtigIndex: phrasen.indexOf(ziel[0][0]),
        rueckfrage: `Überlege: Mit welcher Frage fragst du nach dem ${FAELLE[fall].name}? Probiere die Frage im Satz aus.`,
        hilfe: `${FALL_MERKKASTEN}<br><br>Der ${FAELLE[fall].name} antwortet auf die Frage <strong>${FAELLE[fall].frage}</strong>. Hier passt: <strong>${ziel[0][0]}</strong>.`
      }, fall, `Mit welcher Frage fragst du nach dem <strong>${FAELLE[fall].name}</strong>?`);
    }
    return genFallBestimmenFrage();
  }

  // ---- 3) Mit welchem Fragewort fragst du nach einem Satzteil? ("Erfrage den ...") ----
  function genFragewortFuerSatzteilFrage() {
    const fall = FALL_KEYS[Math.floor(Math.random() * 4)];
    const saetze = FAELLE_SAETZE.filter(e => e.p.some(([, f]) => f === fall));
    const e = pickN(saetze, 1)[0];
    const phrase = pickN(e.p.filter(([, f]) => f === fall), 1)[0][0];
    const optionen = FALL_KEYS.map(k => FAELLE[k].frage);
    return {
      typ: 'mc',
      frage: `Mit welchem Fragewort erfragst du den unterstrichenen Satzteil?<br>${satzMitMarkierung(e.s, phrase)}`,
      verlaufText: `Fragewort für „${phrase}“ in „${e.s}“`.slice(0, 190),
      optionen,
      richtigIndex: FALL_KEYS.indexOf(fall),
      hilfe: `${FALL_MERKKASTEN}<br><br>„${phrase}“ steht im <strong>${FAELLE[fall].name}</strong> – man fragt: <strong>${FAELLE[fall].frage}</strong>`
    };
  }

  // ---- 4) Fall-Wissen: Nummer, Name, Fragewort ----
  function genFallWissenFrage() {
    const k = FALL_KEYS[Math.floor(Math.random() * 4)];
    const art = Math.floor(Math.random() * 3);
    const hilfe = FALL_MERKKASTEN;
    if (art === 0) {
      return { typ: 'mc', frage: `Wie heißt der <strong>${FAELLE[k].nummer}. Fall</strong>?`, optionen: fallOptionen(), richtigIndex: FALL_KEYS.indexOf(k), hilfe };
    }
    if (art === 1) {
      return { typ: 'mc', frage: `Mit welchem Fragewort fragst du nach dem <strong>${FAELLE[k].name}</strong>?`, optionen: FALL_KEYS.map(x => FAELLE[x].frage), richtigIndex: FALL_KEYS.indexOf(k), hilfe };
    }
    return { typ: 'mc', frage: `Welcher Fall gehört zur Frage <strong>„${FAELLE[k].frage}“</strong>?`, optionen: fallOptionen(), richtigIndex: FALL_KEYS.indexOf(k), hilfe };
  }

  // ---- 5) Tabelle ausfuellen (Arbeitsblatt 10): Wortform in einem anderen Fall schreiben ----
  // Formen: [Nominativ, Genitiv, Dativ, Akkusativ], mehrere erlaubte Schreibweisen als Array.
  const FORMEN = [
    { n: 'Hund', f: ['der Hund', ['des Hundes', 'des Hunds'], 'dem Hund', 'den Hund'] },
    { n: 'Ball', f: ['der Ball', ['des Balls', 'des Balles'], 'dem Ball', 'den Ball'] },
    { n: 'Baum', f: ['der Baum', ['des Baumes', 'des Baums'], 'dem Baum', 'den Baum'] },
    { n: 'Wald', f: ['der Wald', ['des Waldes', 'des Walds'], 'dem Wald', 'den Wald'] },
    { n: 'Knochen', f: ['der Knochen', 'des Knochens', 'dem Knochen', 'den Knochen'] },
    { n: 'Napf', f: ['der Napf', ['des Napfes', 'des Napfs'], 'dem Napf', 'den Napf'] },
    { n: 'Garten', f: ['der Garten', 'des Gartens', 'dem Garten', 'den Garten'] },
    { n: 'Pferd', f: ['das Pferd', ['des Pferdes', 'des Pferds'], 'dem Pferd', 'das Pferd'] },
    { n: 'Fell', f: ['das Fell', ['des Fells', 'des Felles'], 'dem Fell', 'das Fell'] },
    { n: 'Fenster', f: ['das Fenster', 'des Fensters', 'dem Fenster', 'das Fenster'] },
    { n: 'Haus', f: ['das Haus', 'des Hauses', 'dem Haus', 'das Haus'] },
    { n: 'Spiel', f: ['das Spiel', ['des Spiels', 'des Spieles'], 'dem Spiel', 'das Spiel'] },
    { n: 'Katze', f: ['die Katze', 'der Katze', 'der Katze', 'die Katze'] },
    { n: 'Blume', f: ['die Blume', 'der Blume', 'der Blume', 'die Blume'] },
    { n: 'Pfote', f: ['die Pfote', 'der Pfote', 'der Pfote', 'die Pfote'] },
    { n: 'Sonne', f: ['die Sonne', 'der Sonne', 'der Sonne', 'die Sonne'] },
    { n: 'Leine', f: ['die Leine', 'der Leine', 'der Leine', 'die Leine'] },
    { n: 'Spur', f: ['die Spur', 'der Spur', 'der Spur', 'die Spur'] },
    { n: 'Kinder', f: ['die Kinder', 'der Kinder', 'den Kindern', 'die Kinder'] },
    { n: 'Sterne', f: ['die Sterne', 'der Sterne', 'den Sternen', 'die Sterne'] },
    { n: 'Eltern', f: ['die Eltern', 'der Eltern', 'den Eltern', 'die Eltern'] }
  ];
  const erlaubt = (x) => (Array.isArray(x) ? x : [x]);

  function genFormInFallFrage() {
    const w = pickN(FORMEN, 1)[0];
    for (let versuch = 0; versuch < 50; versuch++) {
      const von = FALL_KEYS[Math.floor(Math.random() * 4)];
      const nach = FALL_KEYS[Math.floor(Math.random() * 4)];
      const vonText = erlaubt(w.f[FALL_KEYS.indexOf(von)])[0];
      const nachListe = erlaubt(w.f[FALL_KEYS.indexOf(nach)]);
      if (von === nach || vonText === nachListe[0]) continue; // Formen sind gleich -> keine sinnvolle Aufgabe
      const zeile = FALL_KEYS.map((k, i) => `${FAELLE[k].name}: ${erlaubt(w.f[i])[0]}`).join('<br>');
      return {
        typ: 'text',
        frage: `Schreibe im <strong>${FAELLE[nach].name}</strong>:<br>„${vonText}“ (${FAELLE[von].name})`,
        verlaufText: `Tabelle: „${vonText}“ (${FAELLE[von].name}) → ${FAELLE[nach].name}`,
        antwort: nachListe[0],
        antwortAlternativen: nachListe.slice(1),
        hilfe: `So sieht die Tabelle für <strong>${w.n}</strong> aus:<br>${zeile}`
      };
    }
    return genFallWissenFrage();
  }

  // ---- Buchseite "Satzglieder" (SF S.17/18): Frage beantworten / Substantiv mit Artikel in den
  // passenden Fall setzen. f = Satzteil mit Artikel (mehrere Schreibweisen als Array). ----
  const SATZGLIEDER = [
    { aufg: 'Setze das Substantiv <strong>Eichhörnchen</strong> mit dem Artikel ein:', s: 'Die Kinder beobachten ___.', fall: 'A', f: ['das Eichhörnchen'] },
    { aufg: 'Setze das Substantiv <strong>Eichhörnchen</strong> mit dem Artikel ein:', s: '___ springt flink von Baum zu Baum.', fall: 'N', f: ['das Eichhörnchen'] },
    { aufg: 'Setze das Substantiv <strong>Eichhörnchen</strong> mit dem Artikel ein:', s: 'Der Schwanz ___ bewegt sich hin und her.', fall: 'G', f: ['des Eichhörnchens'] },
    { aufg: 'Setze das Substantiv <strong>Eichhörnchen</strong> mit dem Artikel ein:', s: 'Gespannt sehen die Kinder ___ zu.', fall: 'D', f: ['dem Eichhörnchen'] },
    { q: 'Mit wem ist das Muli verwandt?', s: 'Das Muli ist mit ___ verwandt.', fall: 'D', f: ['dem Esel'] },
    { q: 'Wessen Backen sind prall gefüllt?', s: 'Die Backen ___ sind prall gefüllt.', fall: 'G', f: ['des Hamsters'] },
    { q: 'Wen frisst der Kuckuck?', s: 'Der Kuckuck frisst ___.', fall: 'A', f: ['die Raupe'] },
    { q: 'Wem schmeckt der Klee besonders gut?', s: 'Klee schmeckt ___ besonders gut.', fall: 'D', f: ['dem Hasen'] },
    { q: 'Wessen Schwanz ist lang und buschig?', s: 'Der Schwanz ___ ist lang und buschig.', fall: 'G', f: ['des Fuchses'] },
    { q: 'Wen beobachtet der Förster beim Fressen?', s: 'Der Förster beobachtet ___ beim Fressen.', fall: 'A', f: ['das Wildschwein'] },
    // weitere Aufgaben im gleichen Stil
    { q: 'Wessen Fell ist braun?', s: 'Das Fell ___ ist braun.', fall: 'G', f: ['des Bären'] },
    { q: 'Wem gibt der Förster Futter?', s: 'Der Förster gibt ___ Futter.', fall: 'D', f: ['dem Reh'] },
    { q: 'Wen jagt der Fuchs?', s: 'Der Fuchs jagt ___.', fall: 'A', f: ['den Hasen'] },
    { q: 'Wessen Nest ist hoch oben im Baum?', s: 'Das Nest ___ ist hoch oben im Baum.', fall: 'G', f: ['des Storches', 'des Storchs'] },
    { q: 'Wer schläft den ganzen Winter?', s: '___ schläft den ganzen Winter.', fall: 'N', f: ['der Igel'] },
    { q: 'Wem folgt der kleine Welpe?', s: 'Der kleine Welpe folgt ___.', fall: 'D', f: ['dem Hund'] },
    { q: 'Wen sieht der Wolf im Wald?', s: 'Der Wolf sieht ___ im Wald.', fall: 'A', f: ['den Förster'] },
    { q: 'Wessen Fell ist weich?', s: 'Das Fell ___ ist weich.', fall: 'G', f: ['des Hasen'] }
  ];

  function genSatzgliedFrage() {
    const e = pickN(SATZGLIEDER, 1)[0];
    const bsp = pickN(SATZGLIEDER.filter(x => x !== e && x.fall === e.fall), 1)[0] || pickN(SATZGLIEDER, 1)[0];
    const kopf = e.aufg || `Beantworte die Frage und schreibe den Satzteil mit Artikel auf:<br><em>${e.q}</em>`;
    const satzMitLuecke = e.s;
    return {
      typ: 'text',
      frage: `${kopf}<br>${satzMitLuecke}`,
      verlaufText: `${(e.q || 'Substantiv einsetzen')}: ${satzMitLuecke}`.slice(0, 190),
      antwort: e.f[0],
      antwortAlternativen: e.f.slice(1),
      hilfe: `${FALL_MERKKASTEN}<br><br>Hier fragt man <strong>${FAELLE[e.fall].frage}</strong> – das ist der <strong>${FAELLE[e.fall].name}</strong>.` +
        (bsp && bsp.q ? `<br>Beispiel: ${bsp.q} – ${bsp.s.replace('___', '<strong>' + bsp.f[0] + '</strong>')}` : '')
    };
  }

  const FAELLE_BEREICHE = [
    { kategorie: 'faelle', gen: genSatzgliedFrage },
    { kategorie: 'faelle', gen: genSatzgliedFrage },
    { kategorie: 'faelle', gen: genFallBestimmenFrage },
    { kategorie: 'faelle', gen: genFallBestimmenFrage },
    { kategorie: 'faelle', gen: genSatzteilImFallFrage },
    { kategorie: 'faelle', gen: genSatzteilImFallFrage },
    { kategorie: 'faelle', gen: genFragewortFuerSatzteilFrage },
    { kategorie: 'faelle', gen: genFormInFallFrage },
    { kategorie: 'faelle', gen: genFormInFallFrage },
    { kategorie: 'faelle', gen: genFallWissenFrage }
  ];

  // ============================================================
  // Zusammengesetzte Adjektive + Woerter mit doppelten Mitlauten (11.10.2026) -
  // zweiter und dritter Teil von Ulis Kalender-Notiz zum Test am 29.10.2026
  // ("Test vier Faelle ... zusammengesetzte Adjektive und Woerter mit doppelten
  // Mitlauten mitlernen"). Es gab dazu keine Fotos des Stoffs - die Beispiele sind
  // gaengige Schulwoerter, nur sicher richtig geschriebene Formen.
  // ============================================================
  // so ... wie ... -> zusammengesetztes Adjektiv (Nomen + Adjektiv)
  const ADJ_SOWIE = [
    // Arbeitsbuch "Zusammengesetzte Adjektive" (SF S.19), Aufgaben 1-3 + Sternchenaufgabe
    { satz: 'so grün wie das Gras', a: 'grasgrün', alt: ['grasgruen'] },
    { satz: 'so süß wie Honig', a: 'honigsüß', alt: ['honigsuess'] },
    { satz: 'so blau wie der Himmel', a: 'himmelblau' },
    { satz: 'so schwarz wie der Rabe', a: 'rabenschwarz' },
    { satz: 'so still wie ein Mäuschen', a: 'mäuschenstill', alt: ['maeuschenstill'] },
    { satz: 'so rot wie das Feuer', a: 'feuerrot' },
    { satz: 'so gelb wie die Sonne', a: 'sonnengelb' },
    { satz: 'so klar wie Glas', a: 'glasklar' },
    { satz: 'so grün wie die Tanne', a: 'tannengrün', alt: ['tannengruen'] },
    { satz: 'so rot wie Wein', a: 'weinrot' },
    { satz: 'so grün wie Salbei', a: 'salbeigrün', alt: ['salbeigruen'] },
    { satz: 'so schnell wie ein Blitz', a: 'blitzschnell' },
    { satz: 'so leicht wie eine Feder', a: 'federleicht' },
    { satz: 'so kalt wie Eis', a: 'eiskalt' },
    { satz: 'so hart wie Stein', a: 'steinhart' },
    { satz: 'so weich wie Butter', a: 'butterweich' },
    { satz: 'so süß wie Zucker', a: 'zuckersüß', alt: ['zuckersuess'] },
    { satz: 'so schwarz wie Pech', a: 'pechschwarz' },
    { satz: 'so weiß wie Schnee', a: 'schneeweiß', alt: ['schneeweiss'] },
    { satz: 'so rot wie Blut', a: 'blutrot' },
    { satz: 'so hoch wie ein Haus', a: 'haushoch' },
    { satz: 'so müde wie ein Hund', a: 'hundemüde', alt: ['hundemuede'] },
    { satz: 'so stark wie ein Bär', a: 'bärenstark', alt: ['baerenstark'] },
    { satz: 'so flink wie ein Wiesel', a: 'wieselflink' },
    { satz: 'so glatt wie Eis', a: 'eisglatt' },
    { satz: 'so klar wie Kristall', a: 'kristallklar' },
    // 23.10.2026: mehr Woerter, damit nicht immer dieselben drankommen
    { satz: 'so rot wie eine Tomate', a: 'tomatenrot' },
    { satz: 'so rot wie ein Rubin', a: 'rubinrot' },
    { satz: 'so gelb wie eine Zitrone', a: 'zitronengelb' },
    { satz: 'so weiß wie Milch', a: 'milchweiß', alt: ['milchweiss'] },
    { satz: 'so schwer wie Blei', a: 'bleischwer' },
    { satz: 'so trocken wie Staub', a: 'staubtrocken' },
    { satz: 'so nass wie ein Pudel', a: 'pudelnass' },
    { satz: 'so stark wie ein Löwe', a: 'löwenstark', alt: ['loewenstark'] },
    { satz: 'so scharf wie ein Messer', a: 'messerscharf' },
    { satz: 'so gerade wie eine Kerze', a: 'kerzengerade' },
    { satz: 'so neu wie ein Nagel', a: 'nagelneu' },
    { satz: 'so heiß wie das Feuer', a: 'feuerheiß', alt: ['feuerheiss'] },
    { satz: 'so alt wie Stein', a: 'steinalt' },
    { satz: 'so blau wie das Meer', a: 'meerblau' },
    { satz: 'so grau wie eine Maus', a: 'mausgrau' }
  ];
  // Adjektiv + Adjektiv
  const ADJ_ADJ = [
    // Buch SF S.19, Aufgabe 3 (Adjektiv und Adjektiv)
    { t: ['nass', 'kalt'], a: 'nasskalt' }, { t: ['gelb', 'grün'], a: 'gelbgrün', alt: ['gelbgruen'] },
    { t: ['süß', 'sauer'], a: 'süßsauer', alt: ['suesssauer', 'süsssauer'] }, { t: ['hell', 'wach'], a: 'hellwach' },
    { t: ['bitter', 'böse'], a: 'bitterböse', alt: ['bitterboese'] },
    { t: ['hell', 'blau'], a: 'hellblau' }, { t: ['dunkel', 'grün'], a: 'dunkelgrün', alt: ['dunkelgruen'] },
    { t: ['dunkel', 'rot'], a: 'dunkelrot' }, { t: ['hell', 'gelb'], a: 'hellgelb' },
    { t: ['blau', 'grün'], a: 'blaugrün', alt: ['blaugruen'] }, { t: ['rot', 'braun'], a: 'rotbraun' },
    { t: ['schwarz', 'weiß'], a: 'schwarzweiß', alt: ['schwarzweiss'] }, { t: ['dunkel', 'blau'], a: 'dunkelblau' },
    { t: ['hell', 'grün'], a: 'hellgrün', alt: ['hellgruen'] }, { t: ['grau', 'blau'], a: 'graublau' },
    { t: ['hell', 'rot'], a: 'hellrot' }, { t: ['dunkel', 'braun'], a: 'dunkelbraun' }, { t: ['hell', 'braun'], a: 'hellbraun' },
    { t: ['hell', 'grau'], a: 'hellgrau' }, { t: ['dunkel', 'grau'], a: 'dunkelgrau' }, { t: ['bitter', 'süß'], a: 'bittersüß', alt: ['bittersuess', 'bittersüss'] },
    { t: ['feucht', 'warm'], a: 'feuchtwarm' }, { t: ['grün', 'gelb'], a: 'grüngelb', alt: ['gruengelb'] }, { t: ['blau', 'grau'], a: 'blaugrau' }
  ];
  const ADJ_HILFE = '<strong>Merke:</strong> Zusammengesetzte Adjektive schreibt man <strong>zusammen</strong> und <strong>klein</strong>. Das letzte Wort sagt, wie etwas ist, das erste Wort sagt genauer, wie sehr oder woran man es erkennt (<em>eiskalt</em> = kalt wie Eis).';

  function genAdjSoWieFrage() {
    const e = pickRot('adjwort', ADJ_SOWIE, x => x.a)[0];
    const bsp = pickN(ADJ_SOWIE.filter(x => x.a !== e.a), 1)[0];
    return {
      typ: 'text',
      frage: `Bilde ein zusammengesetztes Adjektiv:<br><strong>${e.satz}</strong> = ?`,
      antwort: e.a,
      antwortAlternativen: e.alt || [],
      hilfe: `${ADJ_HILFE}<br>Beispiel: ${bsp.satz} = <strong>${bsp.a}</strong>`
    };
  }

  function genAdjAdjFrage() {
    const e = pickRot('adjwort', ADJ_ADJ, x => x.a)[0];
    const bsp = pickN(ADJ_ADJ.filter(x => x.a !== e.a), 1)[0];
    return {
      typ: 'text',
      frage: `Schreibe als ein Wort:<br><strong>${e.t[0]} + ${e.t[1]}</strong> = ?`,
      antwort: e.a,
      antwortAlternativen: e.alt || [],
      hilfe: `${ADJ_HILFE}<br>Beispiel: ${bsp.t[0]} + ${bsp.t[1]} = <strong>${bsp.a}</strong>`
    };
  }

  // Buch SF S.19, Aufgabe 3: "Ordne die Adjektive richtig zu" - genau 2 feste Kategorien (MC)
  const ADJ_ARTEN = [
    ['sonnengelb', 'Sonne + gelb', 'sub'], ['windstill', 'Wind + still', 'sub'], ['federleicht', 'Feder + leicht', 'sub'],
    ['blitzschnell', 'Blitz + schnell', 'sub'], ['glasklar', 'Glas + klar', 'sub'], ['rabenschwarz', 'Rabe + schwarz', 'sub'],
    ['feuerrot', 'Feuer + rot', 'sub'], ['himmelblau', 'Himmel + blau', 'sub'],
    ['nasskalt', 'nass + kalt', 'adj'], ['gelbgrün', 'gelb + grün', 'adj'], ['süßsauer', 'süß + sauer', 'adj'],
    ['hellwach', 'hell + wach', 'adj'], ['bitterböse', 'bitter + böse', 'adj'], ['hellblau', 'hell + blau', 'adj'],
    ['dunkelgrün', 'dunkel + grün', 'adj'],
    ['zitronengelb', 'Zitrone + gelb', 'sub'], ['steinhart', 'Stein + hart', 'sub'], ['butterweich', 'Butter + weich', 'sub'],
    ['bärenstark', 'Bär + stark', 'sub'], ['eiskalt', 'Eis + kalt', 'sub'], ['schneeweiß', 'Schnee + weiß', 'sub'],
    ['hellrot', 'hell + rot', 'adj'], ['dunkelbraun', 'dunkel + braun', 'adj'], ['bittersüß', 'bitter + süß', 'adj'], ['hellgrau', 'hell + grau', 'adj']
  ];
  function genAdjArtFrage() {
    const [wort, teile, art] = pickRot('adjwort', ADJ_ARTEN, x => x[0])[0];
    const optionen = ['Substantiv + Adjektiv', 'Adjektiv + Adjektiv'];
    return {
      typ: 'mc',
      frage: `Woraus ist das Wort zusammengesetzt?<br><strong>${wort}</strong>`,
      optionen,
      richtigIndex: art === 'sub' ? 0 : 1,
      hilfe: `${ADJ_HILFE}<br>Untersuche das Wort genau: ${wort} = <strong>${teile}</strong>. Ist der erste Teil ein Ding/Tier (Substantiv) oder wieder ein Adjektiv?`
    };
  }

  // "Erklaere, was sie bedeuten" (Aufgabe 2): grasgruen = gruen wie das Gras
  function genAdjBedeutungFrage() {
    const e = pickRot('adjwort', ADJ_SOWIE, x => x.a)[0];
    const bedeutung = x => x.satz.replace(/^so /, '');
    // "<Adjektiv> wie <Nomen mit Artikel>" zerlegen, damit die falschen Antworten NICHT offensichtlich falsch sind: gleiches Adjektiv mit
    // anderem Nomen (rot wie Blut statt rot wie das Feuer) und gleiches Nomen mit anderem Adjektiv (heiß wie das Feuer)
    const teile = x => { const m = /^so (\S+) wie (.+)$/.exec(x.satz); return { adj: m[1], nomen: m[2] }; };
    const te = teile(e), andere = ADJ_SOWIE.filter(x => x.a !== e.a);
    const gleichesAdj = andere.filter(x => teile(x).adj === te.adj && teile(x).nomen !== te.nomen);
    const gleichesNomen = andere.filter(x => teile(x).nomen === te.nomen && teile(x).adj !== te.adj);
    const adjsAndere = [...new Set(andere.map(x => teile(x).adj).filter(a => a !== te.adj))];
    const nomenAndere = [...new Set(andere.map(x => teile(x).nomen).filter(n => n !== te.nomen))];
    const falsche = [];
    const nimm = t => { if (t && t !== bedeutung(e) && falsche.indexOf(t) < 0) falsche.push(t); };
    // 1) gleiches Adjektiv, anderes Nomen (aus echten Woertern, sonst gebaut)
    nimm(gleichesAdj.length ? bedeutung(pickN(gleichesAdj, 1)[0]) : `${te.adj} wie ${pickN(nomenAndere, 1)[0]}`);
    // 2) gleiches Nomen, anderes Adjektiv
    nimm(gleichesNomen.length ? bedeutung(pickN(gleichesNomen, 1)[0]) : `${pickN(adjsAndere, 1)[0]} wie ${te.nomen}`);
    // 3) auffuellen, falls etwas doppelt war
    let guard = 0;
    while (falsche.length < 2 && guard++ < 20) nimm(`${pickN(adjsAndere, 1)[0]} wie ${pickN(nomenAndere, 1)[0]}`);
    const optionen = shuffle([bedeutung(e), ...falsche.slice(0, 2)]);
    return {
      typ: 'mc',
      frage: `Was bedeutet <strong>${e.a}</strong>?`,
      optionen,
      richtigIndex: optionen.indexOf(bedeutung(e)),
      hilfe: `${ADJ_HILFE}<br>Zerlege das Wort: ${e.a} = <strong>${bedeutung(e)}</strong>.`
    };
  }

  function genAdjSchreibweiseFrage() {
    const e = pickRot('adjwort', [...ADJ_SOWIE.map(x => x.a), ...ADJ_ADJ.map(x => x.a)], x => x)[0];
    const getrennt = e.replace(/^(.{3,6}?)(blau|grün|rot|gelb|braun|weiß|kalt|schnell|leicht|hart|weich|süß|schwarz|hoch|müde|stark|flink|glatt|klar)$/, '$1 $2');
    const gross = e.charAt(0).toUpperCase() + e.slice(1);
    const optionen = shuffle([e, getrennt === e ? e.slice(0, 4) + ' ' + e.slice(4) : getrennt, gross]);
    return {
      typ: 'mc',
      frage: 'Welche Schreibweise ist richtig?',
      optionen,
      richtigIndex: optionen.indexOf(e),
      hilfe: ADJ_HILFE
    };
  }

  // Woerter mit doppelten Mitlauten: Doppelmitlaut + Beispielsatz
  const DOPPEL_WOERTER = [
    ['Ball', 'll', 'Wir spielen im Garten mit dem Ball.'], ['Brille', 'll', 'Opa liest die Zeitung mit seiner Brille.'],
    ['Welle', 'll', 'Die Welle rollt an den Strand.'], ['Wolle', 'll', 'Aus Wolle strickt Oma einen Schal.'],
    ['Stall', 'll', 'Das Pferd steht im Stall.'], ['Rolle', 'll', 'Im Theaterstück spielt Max die Rolle des Königs.'],
    ['Sommer', 'mm', 'Im Sommer gehen wir schwimmen.'], ['Hammer', 'mm', 'Papa schlägt den Nagel mit dem Hammer in die Wand.'],
    ['Himmel', 'mm', 'Am Himmel scheint die Sonne.'], ['Zimmer', 'mm', 'Mein Zimmer ist aufgeräumt.'],
    ['Lamm', 'mm', 'Das kleine Lamm blökt auf der Wiese.'], ['Kamm', 'mm', 'Ich kämme mir die Haare mit dem Kamm.'],
    ['Tanne', 'nn', 'Im Wald wächst eine hohe Tanne.'], ['Sonne', 'nn', 'Die Sonne scheint hell.'],
    ['Kanne', 'nn', 'Mama gießt den Tee aus der Kanne.'], ['Spinne', 'nn', 'Die Spinne baut ein Netz.'],
    ['Tonne', 'nn', 'Der Müll kommt in die Tonne.'], ['Mann', 'nn', 'Der Mann liest die Zeitung.'],
    ['Suppe', 'pp', 'Zum Mittagessen gibt es Suppe.'], ['Puppe', 'pp', 'Maja spielt mit ihrer Puppe.'],
    ['Treppe', 'pp', 'Wir gehen die Treppe hinauf.'], ['Mappe', 'pp', 'Die Hefte stecken in der Mappe.'],
    ['Klappe', 'pp', 'Mach bitte die Klappe zu.'], ['Lippe', 'pp', 'Ich beiße mir auf die Lippe.'],
    ['Herr', 'rr', 'Herr Müller ist unser Nachbar.'], ['Geschirr', 'rr', 'Nach dem Essen spülen wir das Geschirr.'],
    ['Tasse', 'ss', 'Papa trinkt Kaffee aus einer Tasse.'], ['Wasser', 'ss', 'Ich trinke ein Glas Wasser.'],
    ['Messer', 'ss', 'Mit dem Messer schneide ich das Brot.'], ['Kasse', 'ss', 'Im Supermarkt bezahlen wir an der Kasse.'],
    ['Fluss', 'ss', 'Die Brücke führt über den Fluss.'], ['Kuss', 'ss', 'Mama gibt mir einen Kuss.'],
    ['Bett', 'tt', 'Abends gehe ich ins Bett.'], ['Blatt', 'tt', 'Im Herbst fällt jedes Blatt vom Baum.'],
    ['Butter', 'tt', 'Ich esse Brot mit Butter.'], ['Mutter', 'tt', 'Meine Mutter kocht das Abendessen.'],
    ['Zettel', 'tt', 'Auf dem Zettel steht die Einkaufsliste.'], ['Kette', 'tt', 'Sie trägt eine goldene Kette.'],
    ['Mitte', 'tt', 'Der Tisch steht in der Mitte des Raumes.'], ['Bitte', 'tt', 'Ich habe eine Bitte an dich.'],
    ['Schatten', 'tt', 'Im Sommer sitzen wir im Schatten.'], ['Koffer', 'ff', 'Ich packe meinen Koffer für den Urlaub.'],
    ['Löffel', 'ff', 'Die Suppe esse ich mit dem Löffel.'], ['Affe', 'ff', 'Im Zoo klettert der Affe auf den Baum.'],
    ['Schiff', 'ff', 'Das große Schiff fährt über das Meer.'], ['Stoff', 'ff', 'Aus buntem Stoff näht Oma ein Kleid.'],
    ['Kaffee', 'ff', 'Papa trinkt jeden Morgen Kaffee.'], ['Krabbe', 'bb', 'Die Krabbe läuft seitwärts über den Sand.'],
    ['Ebbe', 'bb', 'Bei Ebbe ist das Wasser weit draußen.'], ['Robbe', 'bb', 'Die Robbe liegt am Strand.'],
    // 23.10.2026: mehr Woerter, damit nicht immer dieselben drankommen
    ['Pfanne', 'nn', 'Mama brät die Eier in der Pfanne.'], ['Wanne', 'nn', 'Abends sitze ich in der Wanne.'],
    ['Kinn', 'nn', 'Der Opa streicht sich über das Kinn.'], ['Rennen', 'nn', 'Max gewinnt das Rennen.'],
    ['Teller', 'll', 'Auf dem Teller liegt ein Brot.'], ['Keller', 'll', 'Die Kartoffeln liegen im Keller.'],
    ['Quelle', 'll', 'Das Wasser sprudelt aus der Quelle.'], ['Müll', 'll', 'Den Müll bringen wir zur Tonne.'],
    ['Schloss', 'ss', 'Das alte Schloss steht auf dem Berg.'], ['Nuss', 'ss', 'Das Eichhörnchen knackt eine Nuss.'],
    ['Kissen', 'ss', 'Auf dem Sofa liegt ein weiches Kissen.'], ['Sessel', 'ss', 'Opa sitzt im Sessel.'],
    ['Pfeffer', 'ff', 'Ich streue Pfeffer auf die Suppe.'], ['Waffel', 'ff', 'Zum Nachtisch gibt es eine Waffel.'],
    ['Flamme', 'mm', 'Die Flamme der Kerze flackert.'], ['Trommel', 'mm', 'Der Junge schlägt die Trommel.'],
    ['Klammer', 'mm', 'Die Wäsche hängt mit einer Klammer an der Leine.'], ['Stamm', 'mm', 'Der Stamm der Eiche ist dick.'],
    ['Schlitten', 'tt', 'Im Winter fahren wir mit dem Schlitten.'], ['Gitter', 'tt', 'Der Tiger sitzt hinter dem Gitter.'],
    ['Futter', 'tt', 'Der Hund bekommt sein Futter.'], ['Gewitter', 'tt', 'Nach dem Gewitter kommt die Sonne.'],
    ['Sattel', 'tt', 'Ich sitze fest im Sattel.'], ['Ritter', 'tt', 'Der Ritter reitet auf seinem Pferd.'],
    ['Karre', 'rr', 'Opa schiebt die Karre in den Garten.'], ['Narr', 'rr', 'Der Narr macht Späße am Hof des Königs.'],
    ['Bagger', 'gg', 'Der Bagger gräbt ein tiefes Loch.'], ['Flagge', 'gg', 'Die Flagge weht im Wind.'],
    ['Roggen', 'gg', 'Aus Roggen backt der Bäcker dunkles Brot.'], ['Widder', 'dd', 'Der Widder steht auf der Weide.'],
    ['Paddel', 'dd', 'Mit dem Paddel lenken wir das Boot.'], ['Pappe', 'pp', 'Aus Pappe bastle ich ein Haus.'],
    ['Mittag', 'tt', 'Zu Mittag gibt es Nudeln.'], ['Hummel', 'mm', 'Die Hummel brummt über die Blume.']
  ];
  const DOPPEL_HILFE = '<strong>Merke:</strong> Nach einem <strong>kurzen Selbstlaut</strong> (a, e, i, o, u) steht oft ein <strong>doppelter Mitlaut</strong>. Sprich das Wort in Silben: Der Mitlaut steht an der Silbengrenze zweimal.';

  function silben(wort, dbl) { return wort.replace(dbl, dbl[0] + '-' + dbl[1]); }

  function genDoppelLueckeFrage() {
    const [wort, dbl, satz] = pickRot('doppel', DOPPEL_WOERTER, x => x[0])[0];
    const luecke = wort.replace(dbl, '__');
    return {
      typ: 'text',
      frage: `Welche zwei gleichen Mitlaute fehlen?<br>${satz.replace(wort, luecke)}`,
      verlaufText: `Doppelter Mitlaut: ${luecke}`,
      antwort: dbl,
      hilfe: `${DOPPEL_HILFE}<br>Das Wort heißt <strong>${wort}</strong> (${silben(wort, dbl)}).`
    };
  }

  function genDoppelWahlFrage() {
    const [wort, dbl] = pickRot('doppel', DOPPEL_WOERTER, x => x[0])[0];
    const falsch = wort.replace(dbl, dbl[0]);
    const optionen = shuffle([wort, falsch]);
    return {
      typ: 'mc',
      frage: 'Welches Wort ist richtig geschrieben?',
      optionen,
      richtigIndex: optionen.indexOf(wort),
      hilfe: `${DOPPEL_HILFE}<br>Richtig: <strong>${wort}</strong> (${silben(wort, dbl)}).`
    };
  }

  const ADJ_BEREICHE = [
    { kategorie: 'zusadjektive', gen: genAdjSoWieFrage },
    { kategorie: 'zusadjektive', gen: genAdjSoWieFrage },
    { kategorie: 'zusadjektive', gen: genAdjAdjFrage },
    { kategorie: 'zusadjektive', gen: genAdjSchreibweiseFrage },
    { kategorie: 'zusadjektive', gen: genAdjArtFrage },
    { kategorie: 'zusadjektive', gen: genAdjBedeutungFrage }
  ];
  const DOPPEL_BEREICHE = [
    { kategorie: 'doppelmitlaute', gen: genDoppelWahlFrage },
    { kategorie: 'doppelmitlaute', gen: genDoppelWahlFrage },
    { kategorie: 'doppelmitlaute', gen: genDoppelLueckeFrage },
    { kategorie: 'doppelmitlaute', gen: genDoppelLueckeFrage }
  ];

  // Tagesaufgaben Deutsch im Ferientraining: Faelle (50 %), zusammengesetzte Adjektive
  // (25 %), doppelte Mitlaute (25 %); falsch beantwortete Aufgaben kommen mit neuem
  // Satz derselben Art spaeter noch einmal (neueVersion).
  const DEUTSCH_FERIEN_BEREICHE = [...FAELLE_BEREICHE, ...ADJ_BEREICHE, ...DOPPEL_BEREICHE];
  function genFaelleAufgabe() {
    const b = pickN(DEUTSCH_FERIEN_BEREICHE, 1)[0];
    const f = b.gen();
    f.neueVersion = () => genFaelleAufgabe();
    return f;
  }

  // ---- Lernseite "Das musst du wissen" (Uli 11.10.2026: "Er muss auch lernen, was Genitiv
  // usw. ist") - erklaert die vier Faelle, zusammengesetzte Adjektive und doppelte Mitlaute,
  // am Ende der Knopf zum Ueben. Farben wie beim Unterstreichen in der Schule:
  // Nominativ blau, Genitiv gelb, Dativ gruen, Akkusativ lila. ----
  const FALL_FARBE = {
    N: { fill: '#D3E5F8', rand: '#2F6FE0' }, G: { fill: '#FBEFB8', rand: '#C79A00' },
    D: { fill: '#D6EEDB', rand: '#2E7D46' }, A: { fill: '#E7DAF3', rand: '#7B3FA0' }
  };
  const FALL_ERKLAERUNG = {
    N: { art: 'der · die · das', satz: '<mark class="fm-N">Der Hund</mark> bellt.', frage: 'Wer bellt? <strong>Der Hund.</strong>', tipp: 'Das ist der „Wer-Fall“: Wer oder was macht etwas?' },
    G: { art: 'des · der · des', satz: 'Das Halsband <mark class="fm-G">des Hundes</mark> ist rot.', frage: 'Wessen Halsband ist rot? <strong>Das Halsband des Hundes.</strong>', tipp: 'Zeigt, wem etwas gehört. Bei Wörtern mit <em>der</em> und <em>das</em> bekommt das Nomen oft ein <strong>-s</strong> oder <strong>-es</strong>: <em>des Hund<strong>es</strong></em>, <em>des Spiel<strong>s</strong></em>.' },
    D: { art: 'dem · der · dem', satz: 'Ich gebe <mark class="fm-D">dem Hund</mark> einen Knochen.', frage: 'Wem gebe ich einen Knochen? <strong>Dem Hund.</strong>', tipp: 'Der „Wem-Fall“: Wem gibst, schenkst oder hilfst du? In der Mehrzahl kommt oft ein -n dazu: <em>den Kinder<strong>n</strong></em>.' },
    A: { art: 'den · die · das', satz: 'Ich sehe <mark class="fm-A">den Hund</mark>.', frage: 'Wen sehe ich? <strong>Den Hund.</strong>', tipp: 'Der „Wen-Fall“: Wen oder was sieht, hört oder holt jemand? Nur bei <em>der</em> ändert sich der Artikel: der → <strong>den</strong>.' }
  };

  function zeigeFaelleLernen() {
    const kasten = k => {
      const f = FAELLE[k], e = FALL_ERKLAERUNG[k], c = FALL_FARBE[k];
      return `<div class="fall-karte" style="border-left:6px solid ${c.rand};background:${c.fill}33;">
        <div class="fall-kopf"><span class="fall-nr" style="background:${c.rand}">${f.nummer}</span><strong>${f.nummer}. Fall – ${f.name}</strong></div>
        <div class="fall-frage">Frage: <strong>${f.frage}</strong></div>
        <div>Artikel: ${e.art}</div>
        <div class="fall-bsp">${e.satz}<br><span class="fall-sub">${e.frage}</span></div>
        <div class="fall-tipp">${e.tipp}</div>
      </div>`;
    };
    const zeile = (k, w) => `<tr><th style="background:${FALL_FARBE[k].fill};">${FAELLE[k].name}</th>${w.map(x => `<td>${x}</td>`).join('')}</tr>`;
    const tabelle = `<table class="fall-tabelle">
      <tr><th></th><th>der Hund</th><th>die Katze</th><th>das Pferd</th><th>die Kinder</th></tr>
      ${zeile('N', ['der Hund', 'die Katze', 'das Pferd', 'die Kinder'])}
      ${zeile('G', ['des Hundes', 'der Katze', 'des Pferdes', 'der Kinder'])}
      ${zeile('D', ['dem Hund', 'der Katze', 'dem Pferd', 'den Kindern'])}
      ${zeile('A', ['den Hund', 'die Katze', 'das Pferd', 'die Kinder'])}
    </table>`;
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="App.gotoHome()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Das musst du wissen</div>
      <div class="lese-text">Jedes Nomen steht in einem von <strong>vier Fällen</strong>. Den Fall findest du mit einer Frage. Beim Unterstreichen nimmst du diese Farben: <mark class="fm-N">blau</mark> <mark class="fm-G">gelb</mark> <mark class="fm-D">grün</mark> <mark class="fm-A">lila</mark>.</div>
      <div class="regel-karte" style="margin-bottom:16px;"><strong>Die vier Fälle und ihre Fragen:</strong><div style="margin-top:8px;line-height:1.8;">
        1. <mark class="fm-N">Nominativ</mark> – Wer oder was?<br>2. <mark class="fm-G">Genitiv</mark> – Wessen?<br>3. <mark class="fm-D">Dativ</mark> – Wem?<br>4. <mark class="fm-A">Akkusativ</mark> – Wen oder was?</div></div>
      ${kasten('N')}${kasten('G')}${kasten('D')}${kasten('A')}
      <div class="regel-karte" style="margin-bottom:16px;"><strong>Alle Artikel auf einen Blick:</strong><div style="margin-top:8px;overflow-x:auto;">${tabelle}</div></div>
      <div class="regel-karte" style="margin-bottom:16px;"><strong>So findest du den Fall:</strong><div style="margin-top:8px;line-height:1.7;">
        1. Lies den Satz und suche das Nomen mit seinem Artikel.<br>
        2. Stelle die Frage: <em>Wer oder was?</em> – <em>Wessen?</em> – <em>Wem?</em> – <em>Wen oder was?</em><br>
        3. Die Frage, auf die das Nomen die Antwort ist, verrät den Fall.</div></div>
      <div class="regel-karte" style="margin-bottom:16px;"><strong>Zusammengesetzte Adjektive</strong><div style="margin-top:8px;line-height:1.7;">
        Zwei Wörter werden zu <strong>einem</strong> Adjektiv. Man schreibt sie <strong>zusammen</strong> und <strong>klein</strong>.<br>
        <em>Substantiv + Adjektiv:</em> Gras + grün = <strong>grasgrün</strong> (grün wie das Gras), Feuer + rot = <strong>feuerrot</strong>.<br>
        <em>Adjektiv + Adjektiv:</em> hell + blau = <strong>hellblau</strong>, süß + sauer = <strong>süßsauer</strong>.</div></div>
      <div class="regel-karte" style="margin-bottom:16px;"><strong>Wörter mit doppelten Mitlauten</strong><div style="margin-top:8px;line-height:1.7;">
        Nach einem <strong>kurzen Selbstlaut</strong> (a, e, i, o, u) steht oft ein <strong>doppelter Mitlaut</strong>. Sprich das Wort in Silben und achte darauf, wo die Silben sich trennen:<br>
        Kof-<strong>f</strong>er → <strong>Koffer</strong>, Mut-<strong>t</strong>er → <strong>Mutter</strong>, Tas-<strong>s</strong>e → <strong>Tasse</strong>, Som-<strong>m</strong>er → <strong>Sommer</strong>.</div></div>
      <div class="weiter-row"><span class="btn-primary" onclick="Deutsch.starteFerienDeutsch()">Jetzt üben ➜ (10 Aufgaben)</span></div>
    `);
  }

  function starteFerienDeutsch() {
    const starter = () => {
      App.starteFerienQuiz('deutsch', anzahl => {
        const fragen = [];
        for (let i = 0; i < anzahl; i++) fragen.push(genFaelleAufgabe());
        return fragen;
      }, {
        titel: 'Deutsch-Tagesaufgaben',
        wiederholeFalsche: true,
        pensumFach: 'deutsch',
        ferienItem: 'deutsch_tag'
      });
    };
    App.setLastStarter(starter); starter();
  }

  // 13.09.2026: Alle bisher getrennten Themenbereiche (Rechtschreibung,
  // Wortarten erkennen, Schularbeit-Vorbereitung) zu EINEM gemeinsamen Pool
  // verschmolzen (siehe renderMenu oben - Uli wollte keine Themenbereiche mehr,
  // nur eine Kategorie). anredepronomen/briefstil (Foto "Briefe schreiben",
  // 12.09.2026) bleiben als Schwerpunkt mehrfach gelistet, alle aelteren Themen
  // (Rechtschreibung, Adjektive/Substantive/Verben aus wortarten/verbformen,
  // Perfekt/Praesens/Praeteritum aus verbzeitform, ch-Woerter) sind weiterhin
  // mit dabei, nur seltener.
  const DEUTSCH_UEBEN_BEREICHE = [
    { kategorie: 'rechtschreibung', gen: genRechtschreibFrage },
    { kategorie: 'wortarten', gen: genWortartFreitext },
    { kategorie: 'wortarten', gen: genWortartenSucheFrage },
    { kategorie: 'verbgrundform', gen: genVerbGrundformFreitext },
    { kategorie: 'verbzeitform', gen: genVerbZeitformFreitext },
    { kategorie: 'verbzeitform', gen: genVerbZeitformFreitext },
    { kategorie: 'chwoerter', gen: genWoerterMitChFreitext },
    { kategorie: 'anredepronomen', gen: genAnredepronomenFrage },
    { kategorie: 'anredepronomen', gen: genAnredepronomenFrage },
    { kategorie: 'anredepronomen', gen: genAnredepronomenFrage },
    { kategorie: 'briefstil', gen: genBriefStilFrage },
    { kategorie: 'briefstil', gen: genBriefStilFrage },
    { kategorie: 'briefstil', gen: genBriefStilFrage },
    // Neu 11.10.2026: Die vier Faelle (Test 29.10.) - Schwerpunkt, mehrfach gelistet
    ...FAELLE_BEREICHE, ...FAELLE_BEREICHE,
    // Ebenfalls Test 29.10.: zusammengesetzte Adjektive, Woerter mit doppelten Mitlauten
    ...ADJ_BEREICHE, ...DOPPEL_BEREICHE
  ];

  function genDeutschUebenAufgabe(anzahl) {
    const fragen = [];
    for (let i = 0; i < anzahl; i++) {
      fragen.push(pickN(DEUTSCH_UEBEN_BEREICHE, 1)[0].gen());
    }
    return fragen;
  }

  // aktivitaet-Schluessel fuer Storage.getOffeneSession/setOffeneSession -
  // ermoeglicht Fortsetzen einer unterbrochenen Aufgabenfolge am selben Tag
  // (siehe App.startQuizSession und Mathe.starteTagesaufgabe fuers Vorbild).
  // Ersetzt seit 13.09.2026 die drei fruaheren getrennten Start-Funktionen
  // starteRechtschreibung/starteWortarten/starteSchularbeitUeben (siehe
  // renderMenu oben) - ist jetzt auch die taegliche Pflicht-Kachel auf dem
  // Home-Screen (siehe TAGESPLAN_FACH_META.deutsch in app.js).
  function starteDeutschUeben() {
    const AKTIVITAET = 'deutsch-ueben';
    const starter = () => {
      const ANZAHL = Storage.getTagesPensumAnzahl('deutsch');
      const offen = Storage.getOffeneSession(AKTIVITAET);
      const config = { titel: 'Gemischte Aufgaben üben', aktivitaet: AKTIVITAET, pensumFach: 'deutsch' };
      if (offen && offen.index > 0 && offen.index < ANZAHL) {
        config.anzeigeOffset = offen.index;
        config.startRichtigCount = offen.richtigCount;
        config.startSessionSterne = offen.sessionSterne;
        config.startVerlauf = offen.verlauf || [];
        App.startQuizSession('deutsch', genDeutschUebenAufgabe(ANZAHL - offen.index), config);
      } else {
        App.startQuizSession('deutsch', genDeutschUebenAufgabe(ANZAHL), config);
      }
    };
    App.setLastStarter(starter); starter();
  }

  function starteLesen() {
    const AKTIVITAET = 'deutsch-lesen';
    // 4 Texte a 2 Fragen = 8 Fragen gesamt - beim Fortsetzen wird in TEXTEN
    // (nicht Fragen) nachgezogen, dann auf die noch fehlende Fragenzahl
    // gekuerzt, da genLesen() textweise erzeugt.
    const ANZAHL_TEXTE = 4;
    const ANZAHL = ANZAHL_TEXTE * 2;
    const starter = () => {
      const offen = Storage.getOffeneSession(AKTIVITAET);
      const config = { titel: 'Lesen & Verstehen', aktivitaet: AKTIVITAET };
      if (offen && offen.index > 0 && offen.index < ANZAHL) {
        const fehlend = ANZAHL - offen.index;
        config.anzeigeOffset = offen.index;
        config.startRichtigCount = offen.richtigCount;
        config.startSessionSterne = offen.sessionSterne;
        config.startVerlauf = offen.verlauf || [];
        App.startQuizSession('deutsch', genLesen(Math.ceil(fehlend / 2)).slice(0, fehlend), config);
      } else {
        App.startQuizSession('deutsch', genLesen(ANZAHL_TEXTE), config);
      }
    };
    App.setLastStarter(starter); starter();
  }

  /** Stufen je Fall fuer Papas Auswertung (siehe FernSync.meldeLernsetErledigt). */
  function faelleStufen() {
    const s = Storage.getFaelleSerie();
    const out = {};
    FALL_KEYS.forEach(k => { out[k] = { name: FAELLE[k].name, serie: s[k], stufe: s[k] >= FALL_STUFE_SERIE ? 2 : 1 }; });
    return out;
  }

  return { renderMenu, starteDeutschUeben, starteLesen, starteFerienDeutsch, zeigeFaelleLernen, faelleStufen };
})();
