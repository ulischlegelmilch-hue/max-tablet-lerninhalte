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
      { icon: 'tagesaufgabe', titel: 'Kinderrechte & Schule', onclick: 'Heimatkunde.starteSchulkunde()' }
    ]));
  }

  // ===========================================================================
  // LK-Vorbereitung 02.09.2026 (Arbeit am 09.09.2026): "weiterführende Schule
  // und Kinderrechte". Uli-Wunsch aus der Deutsch-Vorbereitung vom selben Tag
  // gilt auch hier: freie Eingabe statt Multiple Choice (typ:'text'/'numeric',
  // kein typ:'mc'). Die 10 Kinderrechte stammen 1:1 (Nummer+Wortlaut) von dem
  // eingeklebten UNICEF-Zettel auf dem Foto - klar lesbar, hohe Sicherheit.
  // Die Schulpflicht-Fakten stammen aus Max' eigener Mitschrift zur
  // "weiterführenden Schule"-Seite - dort war ein großer Teil der Handschrift
  // nicht sicher zu entziffern, daher BEWUSST nur die zwei Fakten uebernommen,
  // bei denen die Mitschrift eindeutig war (Schulpflicht seit ~100 Jahren,
  // Gleichbehandlung aller Kinder). Der Rest der Seite (Reflexionsfragen wie
  // "Warum ist Lernen wichtig fuer dich?") ist bewusst NICHT als Quiz-Frage
  // umgesetzt - das sind persoenliche Meinungsfragen ohne eine einzelne
  // "richtige" Antwort, dafuer ist der Freitext-Exakt-Vergleich ungeeignet.
  // ===========================================================================
  const KINDERRECHTE = [
    { nr: 1, recht: 'einen Namen', stichwort: 'Namen' },
    { nr: 2, recht: 'Gesundheit und eine saubere Umwelt', stichwort: 'Gesundheit', stichwortAlt: ['Umwelt'] },
    { nr: 3, recht: 'Bildung', stichwort: 'Bildung' },
    { nr: 4, recht: 'Spiele und Freizeit', stichwort: 'Freizeit', stichwortAlt: ['Spielen', 'Spiele'] },
    { nr: 5, recht: 'Information und Beteiligung', stichwort: 'Beteiligung', stichwortAlt: ['Information', 'Informationen'] },
    { nr: 6, recht: 'Schutz vor Gewalt und Privatsphäre', stichwort: 'Gewalt', stichwortAlt: ['Privatsphäre'] },
    { nr: 7, recht: 'ein sicheres Zuhause', stichwort: 'Zuhause' },
    { nr: 8, recht: 'Schutz vor Ausbeutung', stichwort: 'Ausbeutung' },
    { nr: 9, recht: 'Schutz im Krieg und auf der Flucht', stichwort: 'Krieg', stichwortAlt: ['Flucht'] },
    { nr: 10, recht: 'besondere Rechte bei Behinderung', stichwort: 'Behinderung' }
  ];

  // Nummer -> Stichwort: freie Texteingabe, mehrere Stichworte pro Recht
  // erlaubt (antwortAlternativen, siehe app.js textAntwortKorrekt), da z.B.
  // "Umwelt" genauso richtig ist wie "Gesundheit" fuer Kinderrecht 2. Als
  // weitere Alternative auch der volle Wortlaut (recht) selbst zugelassen.
  function genKinderrechtStichwortFreitext() {
    const eintrag = pickN(KINDERRECHTE, 1)[0];
    const hilfeEintrag = pickN(KINDERRECHTE.filter(k => k !== eintrag), 1)[0];
    return {
      typ: 'text',
      frage: `Wie lautet Kinderrecht Nummer <strong>${eintrag.nr}</strong>? (Ein Stichwort reicht)`,
      antwort: eintrag.stichwort,
      antwortAlternativen: [...(eintrag.stichwortAlt || []), eintrag.recht],
      hilfe: `<strong>Beispiel:</strong> Kinderrecht Nummer ${hilfeEintrag.nr} ist das Recht auf <strong>${hilfeEintrag.recht}</strong>.`
    };
  }

  // Stichwort -> Nummer: nutzt das bestehende Ziffern-Keypad (typ:'numeric'),
  // keine eigene Logik noetig.
  function genKinderrechtNummerFreitext() {
    const eintrag = pickN(KINDERRECHTE, 1)[0];
    const hilfeEintrag = pickN(KINDERRECHTE.filter(k => k !== eintrag), 1)[0];
    return {
      typ: 'numeric',
      frage: `Welche Nummer hat das Kinderrecht auf <strong>${eintrag.recht}</strong>?`,
      antwort: eintrag.nr,
      hilfe: `<strong>Beispiel:</strong> Das Recht auf ${hilfeEintrag.recht} ist Kinderrecht Nummer <strong>${hilfeEintrag.nr}</strong>.`
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
      frage: 'Wer durfte früher, bevor es die Schulpflicht gab, vor allem zur Schule gehen?',
      antwort: 'reiche Leute',
      antwortAlternativen: ['die Reichen', 'Reiche'],
      hilfe: '<strong>Früher:</strong> Bevor es die Schulpflicht gab, durften vor allem <strong>reiche Leute</strong> zur Schule gehen.'
    },
    {
      typ: 'text',
      frage: 'Was sollte Schule laut deinem Heft sein, damit auch arme Kinder hingehen können? (ein Wort)',
      antwort: 'kostenlos',
      hilfe: '<strong>Kostenlos:</strong> Schule soll <strong>kostenlos</strong> sein, damit auch arme Kinder hingehen können.'
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
    }
  ];

  function genSchuleFaktenFreitext() {
    return pickN(SCHULE_FAKTEN, 1)[0];
  }

  const HEIMATKUNDE_LK_BEREICHE = [
    { kategorie: 'kinderrecht-stichwort', gen: genKinderrechtStichwortFreitext },
    { kategorie: 'kinderrecht-stichwort', gen: genKinderrechtStichwortFreitext },
    { kategorie: 'kinderrecht-nummer', gen: genKinderrechtNummerFreitext },
    { kategorie: 'schule-fakten', gen: genSchuleFaktenFreitext }
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

  return { renderMenu, starteVerkehrszeichen, starteQuiz, starteSchulkunde };
})();
