// Heimat- und Sachkunde. Vorerst: Verkehrszeichen lernen, passend zur
// Fahrradprüfung in der 3./4. Klasse. Grafiken sind die amtlichen StVO-
// Verkehrszeichen (gemeinfrei, von Wikimedia Commons), lokal eingebunden,
// damit die App komplett offline funktioniert.
const Heimatkunde = (function () {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pickN(arr, n) { return shuffle(arr).slice(0, n); }

  function img(datei) {
    return `<img class="sign-img" src="images/verkehrszeichen/${datei}" alt="Verkehrszeichen">`;
  }

  const zeichen = [
    { name: 'Stoppschild', bedeutung: 'Du musst vollständig anhalten, bevor du weiterfährst.', datei: '206_stop.svg' },
    { name: 'Vorfahrt gewähren', bedeutung: 'Du musst andere Fahrzeuge zuerst fahren lassen.', datei: '205_vorfahrt_gewaehren.svg' },
    { name: 'Vorfahrtstraße', bedeutung: 'Du hast hier Vorfahrt vor anderen.', datei: '306_vorfahrtstrasse.svg' },
    { name: 'Verbot der Einfahrt', bedeutung: 'Hier darfst du nicht hineinfahren.', datei: '267_verbot_einfahrt.svg' },
    { name: 'Achtung, Kinder', bedeutung: 'Hier spielen oder queren oft Kinder – besonders vorsichtig fahren.', datei: '136_kinder.svg' },
    { name: 'Achtung, Gefahrstelle', bedeutung: 'Sei besonders vorsichtig, es kann etwas Unerwartetes passieren.', datei: '101_gefahrstelle.svg' },
    { name: 'Fußgängerüberweg', bedeutung: 'Hier dürfen Fußgänger die Straße überqueren (Zebrastreifen).', datei: '350_fussgaengerueberweg.svg' },
    { name: 'Radweg', bedeutung: 'Hier musst du mit dem Fahrrad fahren.', datei: '237_radweg.svg' },
    { name: 'Kreisverkehr', bedeutung: 'Hier beginnt ein Kreisverkehr.', datei: '215_kreisverkehr.svg' },
    { name: 'Tempo 30', bedeutung: 'Du darfst hier höchstens 30 km/h fahren.', datei: '274_tempo30.svg' },
    { name: 'Halteverbot', bedeutung: 'Hier darfst du nicht halten oder parken.', datei: '283_halteverbot.svg' },
    { name: 'Bahnübergang', bedeutung: 'Hier kreuzt eine Bahnstrecke die Straße. Achtung, es könnte ein Zug kommen!', datei: '201_bahnuebergang.svg' },
    { name: 'Verkehrsberuhigter Bereich', bedeutung: 'Eine Spielstraße: Autos dürfen nur Schrittgeschwindigkeit fahren, du darfst sogar auf der Straße spielen.', datei: '325_verkehrsberuhigt_beginn.svg' },
    { name: 'Ende: Verkehrsberuhigter Bereich', bedeutung: 'Die Spielstraße ist hier zu Ende, jetzt gelten wieder die normalen Regeln.', datei: '325_verkehrsberuhigt_ende.svg' },
    { name: 'Einbahnstraße', bedeutung: 'Diese Straße darfst du nur in eine Richtung befahren.', datei: '220_einbahnstrasse.svg' },
    { name: 'Fußgängerzone', bedeutung: 'Hier dürfen nur Fußgänger gehen, mit dem Rad musst du absteigen und schieben.', datei: '242_fussgaengerzone.svg' },
    { name: 'Gemeinsamer Geh- und Radweg', bedeutung: 'Fußgänger und Radfahrer teilen sich hier denselben Weg - nimm Rücksicht.', datei: '240_geh_radweg.svg' },
    { name: 'Sackgasse', bedeutung: 'Diese Straße hat kein anderes Ende - hier kommst du nicht durch.', datei: '357_sackgasse.svg' },
    { name: 'Vorgeschriebene Fahrtrichtung: geradeaus', bedeutung: 'Hier darfst du nur geradeaus weiterfahren, nicht abbiegen.', datei: '209_geradeaus.svg' },
    { name: 'Vorfahrt von rechts', bedeutung: 'Achtung, hier gilt "rechts vor links" - Fahrzeuge von rechts haben Vorfahrt.', datei: '102_kreuzung_rechts.svg' }
  ];

  // Nicht alle Zeichen auf einmal abfragen (mittlerweile 20 Stück) - Standard
  // 10 pro Runde ist überschaubar für ein Kind, "Nochmal üben" mischt danach
  // neu. Von Uli im Eltern-Bereich einstellbar (Tagesplan-Regeln, siehe
  // Storage.getTagesPensumAnzahl).
  function anzahlProQuiz() { return Math.min(Storage.getTagesPensumAnzahl('heimat'), zeichen.length); }

  function renderMenu() {
    App.render(App.subMenuHtml('Heimat & Sachkunde', [
      { icon: 'verkehrszeichen', titel: 'Verkehrszeichen', onclick: 'Heimatkunde.starteVerkehrszeichen()' },
      { icon: 'geschichten', titel: 'Kinderrechte & Schule lernen', onclick: 'Heimatkunde.starteKinderrechteLernen()' },
      { icon: 'tagesaufgabe', titel: 'Kinderrechte & Schule üben', onclick: 'Heimatkunde.starteSchulkunde()' }
    ]));
  }

  // ===========================================================================
  // LK-Vorbereitung 02.09.2026 (Arbeit am 09.09.2026): "weiterführende Schule
  // und Kinderrechte". Uli-Wunsch aus der Deutsch-Vorbereitung vom selben Tag
  // gilt auch hier: freie Eingabe statt Multiple Choice (typ:'text'/'numeric',
  // kein typ:'mc'). Die 10 Kinderrechte stammen 1:1 vom eingeklebten
  // UNICEF-Zettel auf dem Foto - klar lesbar, hohe Sicherheit.
  //
  // WICHTIGE KORREKTUR (selber Tag): urspruenglich gab es zusaetzlich eine
  // "welche Nummer hat Kinderrecht X"-Abfrage. Uli-Feedback: "ich denke es
  // geht nicht darum, welches Recht an welcher Stelle kommt, sondern welche
  // Kinderrechte es ueberhaupt gibt" - die Nummerierung ist fuer die Arbeit
  // irrelevant, es zaehlt nur der INHALT. Deshalb komplett umgebaut: KEINE
  // Nummer-Abfrage mehr (genKinderrechtNummerFreitext entfernt), stattdessen
  // (1) ein reiner Lern-/Merk-Screen mit allen 10 Rechten zum Durchlesen
  // (starteKinderrechteLernen, Vorbild: starteVerkehrszeichen) UND (2) eine
  // Lueckentext-Abfrage zum tatsaechlichen WORTLAUT jedes Rechts (Vorbild:
  // Deutsch chWoerterBank-Luecken aus der Deutsch-Vorbereitung vom selben Tag).
  //
  // Die Schulpflicht-/Kontext-Fakten stammen teils aus Max' eigener Mitschrift,
  // teils (nach Korrektur) aus den echten fotografierten Lehrbuchseiten
  // (Sfb S.8-11 + S.24/25) - siehe SCHULE_FAKTEN/KINDERRECHTE_KONTEXT_FAKTEN
  // unten. Reflexionsfragen wie "Warum ist Lernen wichtig fuer dich?" sind
  // bewusst NICHT als Quiz-Frage umgesetzt - persoenliche Meinungsfragen ohne
  // eine einzelne "richtige" Antwort, dafuer ist der Freitext-Exakt-Vergleich
  // ungeeignet.
  // ===========================================================================
  const KINDERRECHTE = [
    { recht: 'einen Namen', satz: 'Jedes Kind hat das Recht auf einen ___.', antwort: 'Namen' },
    { recht: 'Gesundheit und eine saubere Umwelt', satz: 'Jedes Kind hat ein Recht auf Gesundheit und eine saubere ___.', antwort: 'Umwelt' },
    { recht: 'Bildung', satz: 'Jedes Kind hat ein Recht auf ___ (Schule und Lernen).', antwort: 'Bildung' },
    { recht: 'Spiele und Freizeit', satz: 'Jedes Kind hat ein Recht auf Spiele und ___.', antwort: 'Freizeit' },
    { recht: 'Information und Beteiligung', satz: 'Jedes Kind hat ein Recht auf Information und ___.', antwort: 'Beteiligung' },
    { recht: 'Schutz vor Gewalt und Privatsphäre', satz: 'Jedes Kind hat ein Recht auf Schutz vor Gewalt und ___.', antwort: 'Privatsphäre' },
    { recht: 'ein sicheres Zuhause', satz: 'Jedes Kind hat ein Recht auf ein sicheres ___.', antwort: 'Zuhause' },
    { recht: 'Schutz vor Ausbeutung', satz: 'Jedes Kind hat ein Recht auf Schutz vor ___.', antwort: 'Ausbeutung' },
    { recht: 'Schutz im Krieg und auf der Flucht', satz: 'Jedes Kind hat ein Recht auf Schutz im Krieg und auf der ___.', antwort: 'Flucht' },
    { recht: 'besondere Rechte bei Behinderung', satz: 'Kinder mit einer Behinderung haben ein Recht auf ___ Rechte.', antwort: 'besondere' }
  ];

  // Reiner Lern-/Merk-Screen (kein Quiz) - Max soll sich erst die 10 Rechte im
  // Wortlaut durchlesen koennen, bevor er sich abfragen laesst. Vorbild:
  // starteVerkehrszeichen unten (Karten-Uebersicht + "Zum Quiz"-Button).
  // Lern-/Merk-Screen fuer ALLES, was in starteSchulkunde() abgefragt wird
  // (Kinderrechte, Schulpflicht/-system-Fakten, UN-Kontext) - nicht nur die
  // Kinderrechte. Uli-Wunsch: "auch bei dem Rest muss er die Möglichkeit
  // haben, die Sachen erst zu lernen". Die SCHULE_FAKTEN/KINDERRECHTE_KONTEXT_
  // FAKTEN-hilfe-Texte sind bereits als vollstaendige Merksaetze formuliert
  // (siehe deren Definition unten) - hier direkt als Lernkarten wiederverwendet,
  // keine doppelte Datenhaltung noetig.
  function starteKinderrechteLernen() {
    // Bewusst KEINE Nummerierung ("Kinderrecht 1/2/3...") mehr auf den Karten -
    // exakt dasselbe Uli-Feedback wie bei der Quiz-Umstellung greift auch hier
    // ("es geht nicht darum, welches Recht an welcher Stelle kommt"), war beim
    // ersten Bau dieses Lern-Screens noch uebersehen worden. Jede Karte jetzt
    // ein eigenstaendiger, lesbarer Titel ("Recht auf ...") statt Index+Inhalt.
    const rechteCards = KINDERRECHTE.map(k =>
      `<div class="sign-card">
         <div class="sign-name">Recht auf ${k.recht}</div>
       </div>`
    ).join('');
    const schuleCards = SCHULE_FAKTEN.map(f => `<div class="sign-card"><div class="sign-bedeutung">${f.hilfe}</div></div>`).join('');
    const kontextCards = KINDERRECHTE_KONTEXT_FAKTEN.map(f => `<div class="sign-card"><div class="sign-bedeutung">${f.hilfe}</div></div>`).join('');

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Heimatkunde.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Lies dir die 10 Kinderrechte gut durch</div>
      <div class="sign-grid">${rechteCards}</div>
      <div class="welcome">Wissen über Schule</div>
      <div class="sign-grid">${schuleCards}</div>
      <div class="welcome">Wissen über die Vereinten Nationen</div>
      <div class="sign-grid">${kontextCards}</div>
      <div class="weiter-row"><span class="btn-primary" onclick="Heimatkunde.starteSchulkunde()">Zum Üben ➜</span></div>
    `);
  }

  // Lueckentext zum WORTLAUT jedes Rechts (nicht mehr zur Nummer/Reihenfolge -
  // siehe ACHTUNG-Kommentar oben). antwortAlternativen bewusst NICHT gesetzt:
  // jede Luecke hat genau ein eindeutiges Wort aus dem festen Satzmuster.
  function genKinderrechtFreitext() {
    const eintrag = pickN(KINDERRECHTE, 1)[0];
    const hilfeEintrag = pickN(KINDERRECHTE.filter(k => k !== eintrag), 1)[0];
    return {
      typ: 'text',
      frage: `Ergänze das Kinderrecht:<br>${eintrag.satz}`,
      antwort: eintrag.antwort,
      hilfe: `<strong>Beispiel:</strong> ${hilfeEintrag.satz.replace('___', `<strong>${hilfeEintrag.antwort}</strong>`)}`
    };
  }

  const SCHULE_FAKTEN = [
    {
      typ: 'numeric',
      frage: 'Seit wie vielen Jahren gibt es in Deutschland ungefähr die Schulpflicht für alle Kinder? (nur die Zahl)',
      antwort: 100,
      hilfe: '<strong>Schulpflicht:</strong> In Deutschland müssen schon seit ungefähr <strong>100 Jahren</strong> alle Kinder zur Schule gehen.'
    },
    {
      typ: 'text',
      frage: 'Wer konnte früher, bevor es die Schulpflicht gab, oft nicht lesen, schreiben und rechnen?',
      antwort: 'die armen Leute',
      antwortAlternativen: ['arme Leute', 'die Armen'],
      hilfe: '<strong>Früher:</strong> Es gab schon Schulen und Privatlehrer, aber viele Menschen lernten nur voneinander - <strong>die armen Leute</strong> konnten oft nicht lesen, schreiben und rechnen.'
    },
    {
      typ: 'text',
      frage: 'Was gilt laut deinem Buch für den Schulbesuch in den staatlichen Schulen? Er darf nichts ___',
      antwort: 'kosten',
      antwortAlternativen: ['kostenlos'],
      hilfe: '<strong>Kostenlos:</strong> Der Besuch der Schule darf nichts kosten - in den staatlichen Schulen bezahlen die Eltern kein Geld.'
    },
    {
      typ: 'text',
      frage: 'Wie heißen Schulen, bei denen die Eltern Schulgeld bezahlen müssen?',
      antwort: 'Privatschulen',
      hilfe: '<strong>Privatschulen:</strong> Bei Privatschulen zahlen die Eltern Schulgeld - anders als in staatlichen Schulen.'
    },
    {
      typ: 'text',
      frage: 'Wie sollen Lehrer und Schüler laut deinem Buch miteinander umgehen?',
      antwort: 'achtungsvoll',
      hilfe: '<strong>Miteinander umgehen:</strong> Lehrer und Schüler gehen laut deinem Buch <strong>achtungsvoll</strong> miteinander um.'
    },
    {
      typ: 'text',
      frage: 'Werden in Deutschland heute alle Kinder in der Schule gleich behandelt, egal ob arm oder reich? (Ja oder Nein)',
      antwort: 'Ja',
      hilfe: '<strong>Gleichbehandlung:</strong> In Deutschland gilt die Schulpflicht für ALLE Kinder gleich - niemand wird ausgeschlossen.'
    },
    {
      typ: 'text',
      frage: 'Wie nennt man das Recht auf Lernen? Lernen ist ein ___',
      antwort: 'Kinderrecht',
      hilfe: '<strong>Lernen ist ein Kinderrecht:</strong> Das Recht auf Lernen/Bildung ist eines der 10 Kinderrechte.'
    },
    {
      typ: 'text',
      frage: 'Was hilft dir das Lernen laut deinem Heft besser zu verstehen?',
      antwort: 'die Welt',
      antwortAlternativen: ['die Welt um dich herum', 'Welt'],
      hilfe: '<strong>Lernen hilft:</strong> Lernen hilft dir, <strong>die Welt</strong> um dich herum zu verstehen.'
    },
    {
      typ: 'text',
      frage: 'Was machst du laut deinem Heft mit deinem Wissen und Können?',
      antwort: 'stark',
      hilfe: '<strong>Stark werden:</strong> Mit deinem Wissen und Können machst du dich selbst <strong>stark</strong>.'
    },
    {
      typ: 'text',
      frage: 'Wozu brauchst du später als Erwachsener gutes Lernen, um im Job klarzukommen? (ein Wort)',
      antwort: 'Geld',
      antwortAlternativen: ['Geld verdienen'],
      hilfe: '<strong>Lernen und Beruf:</strong> Lernen ist wichtig, weil man damit später <strong>Geld</strong> verdient.'
    },
    // Ab hier: Fakten aus dem "Und wie geht es nach der Grundschule weiter?"-
    // Schaubild (Schulen und ihre Abschlüsse, Thüringen) und dem Sachunterricht-
    // Textabschnitt (Sfb S.10/11).
    {
      typ: 'text',
      frage: 'Nenne EINE Schulform, die man nach der Grundschule in Thüringen besuchen kann.',
      antwort: 'Gymnasium',
      antwortAlternativen: ['Regelschule', 'Gemeinschaftsschule'],
      hilfe: '<strong>Nach der Grundschule:</strong> Es geht z.B. weiter mit der <strong>Regelschule</strong>, der <strong>Gemeinschaftsschule</strong> oder dem <strong>Gymnasium</strong>.'
    },
    {
      typ: 'text',
      frage: 'Welche Schulform bereitet dich laut deinem Buch gut auf einen handwerklichen oder technischen Beruf vor?',
      antwort: 'Regelschule',
      hilfe: '<strong>Regelschule:</strong> Wer später einen handwerklichen, technischen oder praktischen Beruf lernen möchte, wird durch die <strong>Regelschule</strong> gut vorbereitet.'
    },
    {
      typ: 'text',
      frage: 'Was kannst du nach dem Abitur besuchen, um zu studieren?',
      antwort: 'Universität',
      antwortAlternativen: ['die Universität', 'Fachhochschule', 'die Fachhochschule'],
      hilfe: '<strong>Nach dem Abitur:</strong> Mit dem Abitur können Jugendliche die Fachhochschule oder die <strong>Universität</strong> besuchen.'
    },
    {
      typ: 'text',
      frage: 'Nach wie vielen Schuljahren macht man ungefähr das Abitur? (nur die Zahl)',
      antwort: '12',
      antwortAlternativen: ['13'],
      hilfe: '<strong>Abitur:</strong> Das Abitur macht man nach <strong>12 oder 13</strong> Schuljahren.'
    },
    {
      typ: 'text',
      frage: 'Nenne EINES der neuen Fächer, auf die dich der Sachunterricht ab Klasse 5 vorbereitet.',
      antwort: 'Geografie',
      antwortAlternativen: ['Geschichte', 'Mensch-Natur-Technik', 'Mensch, Natur, Technik'],
      hilfe: '<strong>Ab Klasse 5:</strong> Der Sachunterricht bereitet dich z.B. auf <strong>Geografie</strong>, Geschichte und Mensch-Natur-Technik vor.'
    }
  ];

  function genSchuleFaktenFreitext() {
    return pickN(SCHULE_FAKTEN, 1)[0];
  }

  // Fakten aus den Kinderrechte-Seiten (Sfb S.24/25: "Jedes Kind hat Rechte",
  // UN-Kinderrechtskonvention, UNICEF) - eigene kleine Bank, da inhaltlich
  // Kontextwissen UM die Kinderrechte herum, nicht die Rechte selbst (die
  // stehen schon in KINDERRECHTE oben).
  const KINDERRECHTE_KONTEXT_FAKTEN = [
    {
      typ: 'numeric',
      frage: 'In welchem Jahr wurde die UN-Kinderrechtskonvention (das Übereinkommen über die Rechte des Kindes) beschlossen?',
      antwort: 1989,
      hilfe: '<strong>UN-Kinderrechtskonvention:</strong> Die Vereinten Nationen beschlossen sie im Jahr <strong>1989</strong>.'
    },
    {
      typ: 'text',
      frage: 'Wie heißt das Kinderhilfswerk der Vereinten Nationen? (Abkürzung)',
      antwort: 'UNICEF',
      hilfe: '<strong>UNICEF:</strong> Das Kinderhilfswerk der Vereinten Nationen heißt <strong>UNICEF</strong> - es hilft Kindern und Müttern in Notsituationen.'
    },
    {
      typ: 'numeric',
      frage: 'In welchem Jahr wurden die Vereinten Nationen (UN) gegründet?',
      antwort: 1945,
      hilfe: '<strong>Vereinte Nationen:</strong> Die UN wurden im Jahr <strong>1945</strong> von 50 Staaten gegründet.'
    },
    {
      typ: 'numeric',
      frage: 'Wie viele Staaten gehören heute ungefähr der UN an? (die Zahl, ohne "über")',
      antwort: 200,
      hilfe: '<strong>Fast alle Länder:</strong> Heute gehören der UN über <strong>200</strong> Staaten an - fast alle Länder der Welt.'
    }
  ];

  function genKinderrechteKontextFreitext() {
    return pickN(KINDERRECHTE_KONTEXT_FAKTEN, 1)[0];
  }

  const HEIMATKUNDE_LK_BEREICHE = [
    { kategorie: 'kinderrecht', gen: genKinderrechtFreitext },
    { kategorie: 'kinderrecht', gen: genKinderrechtFreitext },
    { kategorie: 'kinderrecht', gen: genKinderrechtFreitext },
    { kategorie: 'schule-fakten', gen: genSchuleFaktenFreitext },
    { kategorie: 'schule-fakten', gen: genSchuleFaktenFreitext },
    { kategorie: 'kinderrechte-kontext', gen: genKinderrechteKontextFreitext }
  ];

  function genSchulkundeAufgabe(anzahl) {
    const fragen = [];
    for (let i = 0; i < anzahl; i++) {
      fragen.push(pickN(HEIMATKUNDE_LK_BEREICHE, 1)[0].gen());
    }
    return fragen;
  }

  function starteSchulkunde() {
    const AKTIVITAET = 'heimat-schulkunde';
    const starter = () => {
      const ANZAHL = Storage.getTagesPensumAnzahl('heimat');
      const offen = Storage.getOffeneSession(AKTIVITAET);
      const config = { titel: 'Kinderrechte & Schule', aktivitaet: AKTIVITAET, pensumFach: 'heimat' };
      if (offen && offen.index > 0 && offen.index < ANZAHL) {
        config.anzeigeOffset = offen.index;
        config.startRichtigCount = offen.richtigCount;
        config.startSessionSterne = offen.sessionSterne;
        config.startVerlauf = offen.verlauf || [];
        App.startQuizSession('heimat', genSchulkundeAufgabe(ANZAHL - offen.index), config);
      } else {
        App.startQuizSession('heimat', genSchulkundeAufgabe(ANZAHL), config);
      }
    };
    App.setLastStarter(starter); starter();
  }

  function starteVerkehrszeichen() {
    const cards = zeichen.map(z =>
      `<div class="sign-card">
         ${img(z.datei)}
         <div class="sign-name">${z.name}</div>
         <div class="sign-bedeutung">${z.bedeutung}</div>
       </div>`
    ).join('');

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Heimatkunde.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Schau dir die Verkehrszeichen gut an</div>
      <div class="sign-grid">${cards}</div>
      <div class="weiter-row"><span class="btn-primary" onclick="Heimatkunde.starteQuiz()">Zum Quiz ➜</span></div>
    `);
  }

  function genVerkehrszeichenFragen() {
    const ausgewaehlt = pickN(zeichen, Math.min(anzahlProQuiz(), zeichen.length));
    return ausgewaehlt.map(z => {
      const falscheNamen = zeichen.filter(x => x.name !== z.name).map(x => x.name);
      const distraktoren = pickN(falscheNamen, 2);
      const optionen = shuffle([z.name, ...distraktoren]);
      return {
        typ: 'mc',
        frage: img(z.datei) + '<div style="margin-top:10px;">Was bedeutet dieses Schild?</div>',
        optionen: optionen,
        richtigIndex: optionen.indexOf(z.name)
      };
    });
  }

  function starteQuiz() {
    // Fragen-Generierung MUSS innerhalb des Closures passieren, nicht davor -
    // sonst wuerde "Nochmal ueben" (App.restartLast) immer dieselbe bereits
    // berechnete Auswahl/Reihenfolge erneut abspielen statt neu zu mischen.
    const starter = () => App.startQuizSession('heimat', genVerkehrszeichenFragen(), { titel: 'Verkehrszeichen-Quiz', pensumFach: 'heimat' });
    App.setLastStarter(starter);
    starter();
  }

  return { renderMenu, starteVerkehrszeichen, starteQuiz, starteKinderrechteLernen, starteSchulkunde };
})();
