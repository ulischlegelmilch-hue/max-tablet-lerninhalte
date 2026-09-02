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
      { icon: 'tagesaufgabe', titel: 'LK üben: Kinderrechte & Schule', onclick: 'Heimatkunde.starteThemenwahl()' }
    ]));
  }

  // ===========================================================================
  // LK-Vorbereitung 02.09.2026 (Arbeit am 09.09.2026): "weiterführende Schule
  // und Kinderrechte" (Sfb S.8-11 + S.24/25, Thüringen-Lehrwerk).
  //
  // GESCHICHTE DIESES ABSCHNITTS (mehrere Umbauten am selben Tag):
  // 1) Erst typ:'mc'-Multiple-Choice - auf Uli-Wunsch (siehe Deutsch-
  //    Vorbereitung vom selben Tag) verworfen zugunsten freier Eingabe.
  // 2) Dann typ:'text'/'numeric'-Lueckentext-Quiz mit "welche Nummer hat
  //    Kinderrecht X" - auf Uli-Feedback "es geht nicht darum, welches Recht
  //    an welcher Stelle kommt" die Nummer-Abfrage entfernt, Rest blieb
  //    Lueckentext.
  // 3) FINALER UMBAU (dieser Stand): Uli ist mit dem Lueckentext-Ausfuellen
  //    grundsaetzlich nicht zufrieden ("ich bin aber noch nicht zufrieden
  //    damit, dass Max die Lücken mit Wörtern füllen muss") - er will Max
  //    stattdessen selbst abhoeren ("ich höre ihn dann ab"). Die App soll nur
  //    noch reine LERNKARTEN (Umdrehen, kein Eintippen, keine Auto-Bewertung)
  //    anbieten, UND ausdruecklich nach Themengebiet GETRENNT ("trenne aber
  //    die Themengebiete, sodass er sie einzeln lernen kann und nicht so viel
  //    auf einmal") statt eines gemischten Pools. Das gesamte typ:'text'/
  //    'numeric'-Quiz (genKinderrechtFreitext, genSchuleFaktenFreitext,
  //    genKinderrechteKontextFreitext, genLaenderBildungFreitext,
  //    HEIMATKUNDE_LK_BEREICHE, genSchulkundeAufgabe, starteSchulkunde) wurde
  //    komplett entfernt statt nur ergaenzt - kein Grund, totes Quiz-Geruest
  //    parallel zu den Lernkarten zu behalten. Aus demselben Grund ist
  //    'heimat' jetzt NICHT mehr pensumFach-verknuepft mit diesem Bereich
  //    (siehe TAGESPLAN_FACH_META.heimat in app.js, wieder auf
  //    starteQuiz()/Verkehrszeichen zurueckgesetzt) - reines Lernkarten-
  //    Durchklicken ohne richtig/falsch laesst sich nicht sinnvoll als
  //    Tagespensum zaehlen.
  //
  // Alle vier Themen-Banken unten haben dieselbe Form {front, back} - front
  // ist der Lernkarten-Vorderseiten-Text (Frage/Luecke zum selbst Erinnern),
  // back die vollstaendige Antwort mit hervorgehobenem Kernbegriff.
  // ===========================================================================

  const LERNKARTEN_KINDERRECHTE = [
    { front: 'Jedes Kind hat das Recht auf einen ___.', back: 'Jedes Kind hat das Recht auf einen <strong>Namen</strong>.' },
    { front: 'Jedes Kind hat ein Recht auf Gesundheit und eine saubere ___.', back: 'Jedes Kind hat ein Recht auf Gesundheit und eine saubere <strong>Umwelt</strong>.' },
    { front: 'Jedes Kind hat ein Recht auf ___ (Schule und Lernen).', back: 'Jedes Kind hat ein Recht auf <strong>Bildung</strong>.' },
    { front: 'Jedes Kind hat ein Recht auf Spiele und ___.', back: 'Jedes Kind hat ein Recht auf Spiele und <strong>Freizeit</strong>.' },
    { front: 'Jedes Kind hat ein Recht auf Information und ___.', back: 'Jedes Kind hat ein Recht auf Information und <strong>Beteiligung</strong>.' },
    { front: 'Jedes Kind hat ein Recht auf Schutz vor Gewalt und ___.', back: 'Jedes Kind hat ein Recht auf Schutz vor Gewalt und <strong>Privatsphäre</strong>.' },
    { front: 'Jedes Kind hat ein Recht auf ein sicheres ___.', back: 'Jedes Kind hat ein Recht auf ein sicheres <strong>Zuhause</strong>.' },
    { front: 'Jedes Kind hat ein Recht auf Schutz vor ___.', back: 'Jedes Kind hat ein Recht auf Schutz vor <strong>Ausbeutung</strong>.' },
    { front: 'Jedes Kind hat ein Recht auf Schutz im Krieg und auf der ___.', back: 'Jedes Kind hat ein Recht auf Schutz im Krieg und auf der <strong>Flucht</strong>.' },
    { front: 'Kinder mit einer Behinderung haben ein Recht auf ___ Rechte.', back: 'Kinder mit einer Behinderung haben ein Recht auf <strong>besondere</strong> Rechte.' }
  ];

  const LERNKARTEN_SCHULE = [
    { front: 'Seit wie vielen Jahren gibt es in Deutschland ungefähr die Schulpflicht für alle Kinder?', back: 'In Deutschland müssen schon seit ungefähr <strong>100 Jahren</strong> alle Kinder zur Schule gehen.' },
    { front: 'Wer konnte früher, bevor es die Schulpflicht gab, oft nicht lesen, schreiben und rechnen?', back: 'Es gab schon Schulen und Privatlehrer, aber viele Menschen lernten nur voneinander - <strong>die armen Leute</strong> konnten oft nicht lesen, schreiben und rechnen.' },
    { front: 'Was gilt für den Schulbesuch in den staatlichen Schulen?', back: 'Der Besuch der Schule darf nichts <strong>kosten</strong> - in den staatlichen Schulen bezahlen die Eltern kein Geld.' },
    { front: 'Wie heißen Schulen, bei denen die Eltern Schulgeld bezahlen müssen?', back: 'Schulen, bei denen die Eltern Schulgeld bezahlen müssen, heißen <strong>Privatschulen</strong>.' },
    { front: 'Wie sollen Lehrer und Schüler miteinander umgehen?', back: 'Lehrer und Schüler gehen <strong>achtungsvoll</strong> miteinander um.' },
    { front: 'Werden in Deutschland heute alle Kinder in der Schule gleich behandelt?', back: 'In Deutschland gilt die Schulpflicht für <strong>ALLE</strong> Kinder gleich - niemand wird ausgeschlossen.' },
    { front: 'Wie nennt man das Recht auf Lernen?', back: 'Lernen ist ein <strong>Kinderrecht</strong>.' },
    { front: 'Wofür hilft dir das Lernen?', back: 'Lernen hilft dir, <strong>die Welt</strong> um dich herum zu verstehen.' },
    { front: 'Was machst du mit deinem Wissen und Können?', back: 'Mit deinem Wissen und Können machst du dich selbst <strong>stark</strong>.' },
    { front: 'Wozu brauchst du später als Erwachsener gutes Lernen?', back: 'Lernen ist wichtig, weil man damit später <strong>Geld</strong> verdient.' },
    { front: 'Welche Schulformen kann man in Thüringen nach der Grundschule besuchen?', back: 'Es geht z.B. weiter mit der <strong>Regelschule</strong>, der <strong>Gemeinschaftsschule</strong> oder dem <strong>Gymnasium</strong>.' },
    { front: 'Welche Schulform bereitet gut auf einen handwerklichen oder technischen Beruf vor?', back: 'Wer später einen handwerklichen, technischen oder praktischen Beruf lernen möchte, wird durch die <strong>Regelschule</strong> gut vorbereitet.' },
    { front: 'Ist ein Wechsel von der Regelschule auf ein Gymnasium möglich?', back: 'Ja - ein Wechsel von einer Regelschule an ein Gymnasium ist mit den <strong>entsprechenden Leistungen</strong> möglich. Lehrer und Eltern beraten dabei gut.' },
    { front: 'Was kannst du nach dem Abitur besuchen, um zu studieren?', back: 'Mit dem Abitur können Jugendliche die Fachhochschule oder die <strong>Universität</strong> besuchen.' },
    { front: 'Nach wie vielen Schuljahren macht man ungefähr das Abitur?', back: 'Das Abitur macht man nach <strong>12 oder 13</strong> Schuljahren.' },
    { front: 'Welche neuen Fächer bereitet dich der Sachunterricht ab Klasse 5 vor?', back: 'Der Sachunterricht bereitet dich z.B. auf <strong>Geografie</strong>, <strong>Geschichte</strong> und <strong>Mensch-Natur-Technik</strong> vor.' }
  ];

  const LERNKARTEN_UN = [
    { front: 'In welchem Jahr erklärten die Vereinten Nationen die Menschenrechte für alle Menschen?', back: 'In der Erklärung der Vereinten Nationen von <strong>1948</strong> heißt es: Alle Menschen sind gleich und frei.' },
    { front: 'Worauf hat laut der Menschenrechts-Erklärung jeder Mensch ein Recht?', back: 'Jeder hat das Recht auf <strong>Leben, Freiheit und Sicherheit</strong> der Person.' },
    { front: 'In welchem Jahr wurden die Vereinten Nationen (UN) gegründet?', back: 'Die UN wurden im Jahr <strong>1945</strong> von 50 Staaten gegründet.' },
    { front: 'Wie viele Staaten gehören heute ungefähr der UN an?', back: 'Heute gehören der UN über <strong>200</strong> Staaten an - fast alle Länder der Welt.' },
    { front: 'In welchem Jahr wurde die UN-Kinderrechtskonvention beschlossen?', back: 'Die Vereinten Nationen beschlossen das Übereinkommen über die Rechte des Kindes im Jahr <strong>1989</strong>.' },
    { front: 'Haben fast alle Staaten der Erde die Kinderrechtskonvention unterzeichnet?', back: 'Ja - <strong>fast alle Staaten</strong> der Erde haben den Vertrag über die Rechte der Kinder unterzeichnet. Trotzdem werden noch immer täglich Kinderrechte verletzt.' },
    { front: 'Wie heißt das Kinderhilfswerk der Vereinten Nationen?', back: 'Das Kinderhilfswerk der Vereinten Nationen heißt <strong>UNICEF</strong> - es hilft Kindern und Müttern in Notsituationen.' },
    { front: 'Nenne einen Beruf, den ausgebeutete Kinder laut deinem Buch ausüben müssen.', back: 'Im Buch arbeiten Kinder z.B. als <strong>Teppichweberin</strong> oder als <strong>Rikschafahrer</strong>.' }
  ];

  const LERNKARTEN_LAENDER = [
    { front: 'In welchem Land herrschte fast 30 Jahre Krieg, sodass viele Menschen nicht lesen und schreiben lernten?', back: 'In <strong>Angola</strong> herrschte fast 30 Jahre Krieg - viele Menschen lernten nicht lesen und schreiben.' },
    { front: 'Wie viele Jahre sollen Kinder in Angola jetzt mindestens die Schule besuchen?', back: 'Jetzt sollen alle Kinder in Angola mindestens <strong>6 Jahre</strong> eine Schule besuchen.' },
    { front: 'In welchem Land will die Regierung allen Schulkindern ein Tablet oder einen Computer mit kostenlosem Lernstoff geben?', back: '<strong>Indien</strong> will als erstes Land allen Schulkindern Computer/Tablets mit kostenlosem Zugang zu Lernstoff geben.' },
    { front: 'Wie viele Schülerinnen und Schüler sitzen in einer Klasse in China?', back: 'In China sitzen <strong>40</strong> Schülerinnen und Schüler in einer Klasse.' },
    { front: 'In welchem Land ist der Unterricht sehr streng geregelt und die Kinder lernen viel auswendig?', back: 'In <strong>China</strong> ist der Schulbesuch streng geregelt, die Klassen sind still, die Kinder lernen viel auswendig.' }
  ];

  const LERNTHEMEN = {
    kinderrechte: { titel: 'Kinderrechte', icon: 'geschichten', karten: LERNKARTEN_KINDERRECHTE },
    schule: { titel: 'Schule', icon: 'tagesaufgabe', karten: LERNKARTEN_SCHULE },
    un: { titel: 'Vereinte Nationen', icon: 'heimat', karten: LERNKARTEN_UN },
    laender: { titel: 'Bildung weltweit', icon: 'koordinaten', karten: LERNKARTEN_LAENDER }
  };

  // Themenwahl VOR den Lernkarten - bewusst eigener Menuepunkt statt alles auf
  // einmal, damit Max sich immer nur EIN Themengebiet vornimmt (Uli-Wunsch).
  // Eigener back-row statt App.subMenuHtml, weil dessen Zurueck-Button fix
  // App.gotoHome() aufruft - hier soll Zurueck zur Heimatkunde-Startseite
  // fuehren (eine Ebene hoch), nicht ganz nach Hause.
  function starteThemenwahl() {
    const karten = Object.keys(LERNTHEMEN).map(key => {
      const t = LERNTHEMEN[key];
      return `<div class="sub-card" onclick="Heimatkunde.starteLernkarten('${key}')"><span class="sub-icon">${Icons.svg(t.icon)}</span><span class="sub-label">${t.titel}</span></div>`;
    }).join('');
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Heimatkunde.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Welches Thema willst du lernen?</div>
      <div class="lese-text">Wähl ein Thema aus - danach hört Papa dich ab.</div>
      <div class="sub-grid">${karten}</div>
    `);
  }

  // Reine Lernkarten (Umdrehen per Tap) - KEIN Eintippen, KEINE Auto-Bewertung.
  // Uli hoert Max die Fakten selbst ab, siehe ACHTUNG-Kommentar oben.
  let lkSession = null;
  let lkUmgedreht = false;

  function starteLernkarten(thema) {
    const info = LERNTHEMEN[thema];
    lkSession = { thema, titel: info.titel, karten: shuffle(info.karten), index: 0 };
    App.setLastStarter(() => starteLernkarten(thema));
    renderLernkarte();
  }

  function renderLernkarte() {
    lkUmgedreht = false;
    const karte = lkSession.karten[lkSession.index];
    const nr = lkSession.index + 1;
    const total = lkSession.karten.length;
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Heimatkunde.starteThemenwahl()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="progress-row"><span>Karte ${nr} / ${total}</span><span>${lkSession.titel.toUpperCase()}</span></div>
      <div class="karteikarte" onclick="Heimatkunde.karteUmdrehen()">
        <div class="karteikarte-inner" id="karteikarte-inner">
          <div class="karteikarte-seite karteikarte-vorne">
            <div class="lernkarte-text">${karte.front}</div>
            <div class="karteikarte-hinweis">Tippen zum Umdrehen</div>
          </div>
          <div class="karteikarte-seite karteikarte-hinten">
            <div class="lernkarte-text">${karte.back}</div>
          </div>
        </div>
      </div>
      <div class="karteikarte-bewertung" id="karteikarte-bewertung">
        <div class="btn-primary" onclick="Heimatkunde.naechsteLernkarte()">Weiter ➜</div>
      </div>
    `);
  }

  function karteUmdrehen() {
    if (lkUmgedreht) return;
    lkUmgedreht = true;
    document.getElementById('karteikarte-inner').classList.add('umgedreht');
    document.getElementById('karteikarte-bewertung').classList.add('sichtbar');
  }

  function naechsteLernkarte() {
    if (!lkUmgedreht) return;
    lkSession.index++;
    if (lkSession.index >= lkSession.karten.length) {
      renderLernkartenErgebnis();
    } else {
      renderLernkarte();
    }
  }

  function renderLernkartenErgebnis() {
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Heimatkunde.starteThemenwahl()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Geschafft! 🎉</div>
      <div class="lese-text">Du hast alle Karten zu "${lkSession.titel}" durchgesehen.</div>
      <div class="weiter-row">
        <span class="btn-primary" onclick="Heimatkunde.starteLernkarten('${lkSession.thema}')">Nochmal von vorne</span>
        <span class="btn-primary" style="margin-left:12px;" onclick="Heimatkunde.starteThemenwahl()">Anderes Thema</span>
      </div>
    `);
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

  return { renderMenu, starteVerkehrszeichen, starteQuiz, starteThemenwahl, starteLernkarten, karteUmdrehen, naechsteLernkarte };
})();
