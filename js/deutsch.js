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

  function renderMenu() {
    App.render(App.subMenuHtml('Deutsch – was übst du?', [
      { icon: 'rechtschreibung', titel: 'Rechtschreibung', onclick: 'Deutsch.starteRechtschreibung()' },
      { icon: 'lesen', titel: 'Lesen & Verstehen', onclick: 'Deutsch.starteLesen()' },
      { icon: 'wortarten', titel: 'Wortarten erkennen', onclick: 'Deutsch.starteWortarten()' },
      { icon: 'tagesaufgabe', titel: 'Schularbeit üben', onclick: 'Deutsch.starteSchularbeitUeben()' }
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

  // ===========================================================================
  // Schularbeit-Vorbereitung 02.09.2026 (Arbeit am 08.09.2026): Wortarten,
  // Verben-Grundform, Praesens/Praeteritum/Perfekt, Woerter mit ch - siehe
  // starteSchularbeitUeben() unten. Uli-Wunsch: "er sollte Arten dieser
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

  // Pool fuer starteSchularbeitUeben() - bewusst OHNE Mathes Stats-Gewichtung
  // (KATEGORIE_BASISGEWICHT/gewichtFuerStat, siehe mathe.js): reine
  // Gleichverteilung reicht fuer dieses kurzfristige Feature.
  // verbzeitform doppelt gelistet, da Praesens/Praeteritum/Perfekt das
  // groesste Thema der Arbeit ist.
  const DEUTSCH_SCHULARBEIT_BEREICHE = [
    { kategorie: 'wortarten', gen: genWortartFreitext },
    { kategorie: 'verbgrundform', gen: genVerbGrundformFreitext },
    { kategorie: 'verbzeitform', gen: genVerbZeitformFreitext },
    { kategorie: 'verbzeitform', gen: genVerbZeitformFreitext },
    { kategorie: 'chwoerter', gen: genWoerterMitChFreitext }
  ];

  function genSchularbeitAufgabe(anzahl) {
    const fragen = [];
    for (let i = 0; i < anzahl; i++) {
      fragen.push(pickN(DEUTSCH_SCHULARBEIT_BEREICHE, 1)[0].gen());
    }
    return fragen;
  }

  // aktivitaet-Schluessel fuer Storage.getOffeneSession/setOffeneSession -
  // ermoeglicht Fortsetzen einer unterbrochenen Aufgabenfolge am selben Tag
  // (siehe App.startQuizSession und Mathe.starteTagesaufgabe fuers Vorbild).
  function starteRechtschreibung() {
    const AKTIVITAET = 'deutsch-rechtschreibung';
    const starter = () => {
      // Von Uli im Eltern-Bereich einstellbar (Tagesplan-Regeln, siehe
      // Storage.getTagesPensumAnzahl) - ohne Regel Standard 10.
      const ANZAHL = Storage.getTagesPensumAnzahl('deutsch');
      const offen = Storage.getOffeneSession(AKTIVITAET);
      const config = { titel: 'Rechtschreibung', aktivitaet: AKTIVITAET, pensumFach: 'deutsch' };
      if (offen && offen.index > 0 && offen.index < ANZAHL) {
        config.anzeigeOffset = offen.index;
        config.startRichtigCount = offen.richtigCount;
        config.startSessionSterne = offen.sessionSterne;
        config.startVerlauf = offen.verlauf || [];
        App.startQuizSession('deutsch', genRechtschreibung(ANZAHL - offen.index), config);
      } else {
        App.startQuizSession('deutsch', genRechtschreibung(ANZAHL), config);
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

  // Bewusst NICHT pensumFach-verknuepft (wie schon Lesen & Verstehen) - eine
  // freiwillige Zusatzuebung, keine Tagesplan-Pflicht.
  function starteWortarten() {
    const AKTIVITAET = 'deutsch-wortarten';
    const ANZAHL = 10;
    const starter = () => {
      const offen = Storage.getOffeneSession(AKTIVITAET);
      const config = { titel: 'Wortarten erkennen', aktivitaet: AKTIVITAET };
      if (offen && offen.index > 0 && offen.index < ANZAHL) {
        config.anzeigeOffset = offen.index;
        config.startRichtigCount = offen.richtigCount;
        config.startSessionSterne = offen.sessionSterne;
        config.startVerlauf = offen.verlauf || [];
        App.startQuizSession('deutsch', genWortarten(ANZAHL - offen.index), config);
      } else {
        App.startQuizSession('deutsch', genWortarten(ANZAHL), config);
      }
    };
    App.setLastStarter(starter); starter();
  }

  // pensumFach:'deutsch' verknuepft (wie Rechtschreibung) - siehe ACHTUNG-
  // Kommentar bei TAGESPLAN_FACH_META.deutsch in app.js: bis zur Arbeit am
  // 08.09.2026 ist DIES die taegliche Pflicht-Kachel auf dem Home-Screen.
  function starteSchularbeitUeben() {
    const AKTIVITAET = 'deutsch-schularbeit';
    const starter = () => {
      const ANZAHL = Storage.getTagesPensumAnzahl('deutsch');
      const offen = Storage.getOffeneSession(AKTIVITAET);
      const config = { titel: 'Schularbeit üben', aktivitaet: AKTIVITAET, pensumFach: 'deutsch' };
      if (offen && offen.index > 0 && offen.index < ANZAHL) {
        config.anzeigeOffset = offen.index;
        config.startRichtigCount = offen.richtigCount;
        config.startSessionSterne = offen.sessionSterne;
        config.startVerlauf = offen.verlauf || [];
        App.startQuizSession('deutsch', genSchularbeitAufgabe(ANZAHL - offen.index), config);
      } else {
        App.startQuizSession('deutsch', genSchularbeitAufgabe(ANZAHL), config);
      }
    };
    App.setLastStarter(starter); starter();
  }

  return { renderMenu, starteRechtschreibung, starteLesen, starteWortarten, starteSchularbeitUeben };
})();
