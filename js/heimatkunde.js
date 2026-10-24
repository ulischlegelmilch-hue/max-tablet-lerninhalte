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
  function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

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
      { icon: 'fahrrad', titel: 'Radfahrausbildung', onclick: "Heimatkunde.starteThemenwahl('rad')" }
    ]));
  }

  // ===========================================================================
  // Radfahrausbildung (24.09.2026): Max hat gerade die Radfahrausbildung
  // (Thueringen, Arbeitsheft "Die Radfahrausbildung" der Deutschen Verkehrswacht,
  // 3./4. Klasse + Sfb-Buchseite 76 "Auf dem Weg"). Karteikarten-Mechanik mit
  // Selbst-Bewertung (bewertung:true, siehe baueBewertetesKartendeck weiter
  // unten), eigene Themengruppe 'rad', ein Thema pro Heft-Doppelseite bzw.
  // Sachgebiet (Uli-Wunsch: nicht alles auf einmal).
  //
  // 27.09.2026, Uli-Wunsch: die LK-Vorbereitung "Kinderrechte & Schule" (die
  // urspruengliche Vorlage fuer diese bewertung:true-Mechanik, siehe Git-
  // Historie) ist abgeschlossen und wurde komplett entfernt (Themen
  // kinderrechte/schule/un/laender + eigener Menuepunkt). Die 1:1-Kopie im
  // Papa-Backend (backend/webapp/index.html, HSK_KARTEN_KINDERRECHTE/SCHULE/
  // UN/LAENDER) wurde im selben Zug mitentfernt.
  //
  // Inhalte sind 1:1 aus den Heftseiten S.5-21 + Sfb S.76 uebernommen. Bei den
  // Multiple-Choice-Aufgaben des Hefts ("Was ist richtig?") sind die Karten
  // aus dem Heft-/Regeltext abgeleitet, NICHT aus den (ggf. falschen) Kreuzen
  // in Max' Heft. Nicht uebernommen: reine Offene-Fragen/Diskussionen, das
  // Ei-/Melonen-Experiment, Foto-Zuordnungsaufgaben ohne Text-Kern und die
  // "Kann das passieren?"-Tabelle mit unklarer Loesung (nur eindeutige Zeilen).
  // ===========================================================================
  // Fuer Fortschritts-Uebersicht/Papa-Verlauf: Schild-Bilder aus dem Kartentext
  // durch ein Platzhalterwort ersetzen (dort wird nur Text angezeigt).
  function textOhneBild(html) { return html.replace(/<img[^>]*>(<br>)?/g, '(Schild) '); }

  function radImg(datei) {
    return `<img class="sign-img" style="width:84px;height:84px;" src="images/verkehrszeichen/${datei}" alt="Verkehrszeichen"><br>`;
  }

  // Heft S.6/7
  const LERNKARTEN_RAD_FAHRRAD = [
    { front: 'Welche Teile muss jedes Fahrrad haben, das im Straßenverkehr fährt?', back: 'Die <strong>Bremsen</strong> für Vorder- und Hinterrad, die <strong>Beleuchtung</strong>, die <strong>Reflektoren</strong> und eine <strong>Klingel</strong>.' },
    { front: 'Welche Teile sind nützlich, aber nicht vorgeschrieben?', back: 'Schutzbleche, Kettenschutz, Flickzeug, Gepäckträger, Luftpumpe und Fahrradständer sind <strong>sehr nützlich, aber nicht vorgeschrieben</strong>.' },
    { front: 'Wann haben Sattel und Lenker die richtige Höhe?', back: 'Wenn du mit beiden <strong>Fußspitzen</strong> noch den Boden erreichst.' },
    { front: 'Wie weit dürfen Sattel und Lenker herausgezogen werden?', back: 'Nur so weit, dass die <strong>Sicherheitsmarkierung</strong> noch nicht zu sehen ist.' },
    { front: 'Was gilt für das Gepäck auf dem Gepäckträger?', back: 'Dein Fahrrad ist <strong>kein Packesel</strong> - nimm nie zu schwere Sachen auf dem Gepäckträger mit.' },
    { front: 'Wie viele Bremsen braucht dein Rad mindestens?', back: 'Mindestens <strong>zwei unabhängige Bremsen</strong>: eine für vorne, eine für hinten.' },
    { front: 'Was ist noch besser als zwei Bremsen? (2 + 1 = 3)', back: '<strong>Drei Bremsen</strong>: zwei Handbremsen (je eine für Vorder- und Hinterrad) sowie eine <strong>Rücktrittbremse</strong>.' },
    { front: 'Wie müssen die Handbremshebel eingestellt sein?', back: 'Auch bei starkem Bremsen dürfen die Bremshebel den <strong>Lenkergriff nicht berühren</strong>.' },
    { front: 'Mit welchen Bremsklötzen darfst du nie fahren?', back: 'Fahre nie mit <strong>abgenutzten Bremsklötzen</strong>!' },
    { front: 'Ein Pkw setzt vor dir rückwärts aus einer Einfahrt aus. Du musst bremsen! Was ist am sichersten?', back: 'Ich benutze <strong>alle Bremsen gleichzeitig</strong>.' }
  ];

  // Heft S.8
  const LERNKARTEN_RAD_SICHT = [
    { front: 'Welche Teile müssen bei Dunkelheit immer an deinem Fahrrad sein und funktionieren?', back: '<strong>Licht:</strong> <strong>Vorderlicht</strong> (Scheinwerfer), <strong>rotes Rücklicht</strong>, <strong>Dynamo</strong> (auch Akku oder Batterie erlaubt).<br><strong>Reflektoren:</strong> <strong>Speichenrückstrahler</strong> (je 2 Stück pro Vorder- und Hinterrad) oder Leuchtstreifen oder Speichensticks, <strong>Pedalrückstrahler</strong>, <strong>weißer Reflektor</strong> vorne, <strong>großer roter Reflektor</strong> der Kategorie „Z“ hinten.' },
    { front: 'Wie viele Speichenrückstrahler gehören an ein Rad?', back: '<strong>Je 2 Stück</strong> pro Vorder- und Hinterrad (oder Leuchtstreifen oder Speichensticks).' },
    { front: 'Der Dynamo liefert den Strom fürs Licht. Was ist außerdem erlaubt?', back: 'Auch ein <strong>Akku</strong> oder eine <strong>Batterie</strong> ist erlaubt.' },
    { front: 'Rücklicht und roter Reflektor hinten: Können sie zusammen in einem Teil sein?', back: 'Ja, Rücklicht und Reflektor können <strong>integriert</strong> sein.' },
    { front: 'Dein Vorderlicht funktioniert nicht. „Egal, einmal kann ich schon ohne Licht fahren!“ Was sagst du dazu?', back: 'Falsch! <strong>Alle Lampen am Rad müssen funktionieren</strong> - nur so sehen dich Autofahrer im Dunkeln schon von Weitem.' },
    { front: 'Auf welche Entfernung sieht man einen dunkel gekleideten Fußgänger/Radfahrer im Dunkeln?', back: 'Erst auf <strong>25 bis 30 Meter</strong> - oft zu spät, um einen Unfall zu vermeiden. (Bremsweg bei 50 km/h = 40 Meter!)' },
    { front: 'Auf welche Entfernung erkennt man eine Person mit heller Kleidung?', back: 'Auf <strong>40 bis 50 Meter</strong>.' },
    { front: 'Auf welche Entfernung werden Kleidung mit Reflexmaterial und ein gut reflektierendes Fahrrad gesehen?', back: 'Schon auf <strong>130 bis 160 Meter</strong>.' },
    { front: 'Wie heißt der Merksatz zur Sichtbarkeit?', back: '<strong>Mehr Sichtbarkeit = mehr Sicherheit</strong>. Helle Kleidung mit Reflektoren ist schon von Weitem zu sehen.' }
  ];

  // Heft S.9 + S.10/11
  const LERNKARTEN_RAD_HELM = [
    { front: 'Um wie viel Prozent senkt ein Fahrradhelm das Risiko von Kopfverletzungen?', back: 'Um <strong>80 Prozent</strong> - ein Helm kann dein Leben retten. Deshalb immer einen Helm tragen!' },
    { front: 'Wie sitzt der Helm richtig? Nenne 4 Punkte.', back: '1. <strong>Waagerechter</strong> Sitz<br>2. Die beiden Riemen bilden ein <strong>Dreieck</strong><br>3. Kinnriemen <strong>stramm</strong> ziehen<br>4. <strong>Kopfring</strong> richtig einstellen' },
    { front: 'Wie soll der Helm auf deinem Kopf sitzen?', back: '<strong>Waagerecht</strong> - er muss fest sitzen, darf aber nicht drücken.' },
    { front: 'Welche Form bilden die beiden Riemen des Helms?', back: 'Ein <strong>Dreieck</strong>.' },
    { front: 'Wie sollst du den Kinnriemen ziehen?', back: '<strong>Stramm</strong> ziehen.' },
    { front: 'Woran erkennst du einen geprüften Helm?', back: 'An einem <strong>Prüfsiegel</strong> im Helm.' },
    { front: 'Was musst du beim Spielen mit dem Helm tun?', back: 'Der Helm schützt beim Radfahren. Beim Spielen musst du ihn immer <strong>abnehmen</strong>!' },
    { front: 'Was sollst du mit einem Helm nach einem Aufprall tun?', back: 'Ein Helm sollte nach einem Aufprall <strong>nicht mehr getragen</strong> werden.' },
    { front: 'Woran schließt du dein Fahrrad an?', back: 'Immer mit dem <strong>Rahmen</strong> an einen <strong>festen Gegenstand</strong>, z.B. Fahrradständer, Laternenmast oder festes Gitter.' },
    { front: 'Warum schließt du nie nur das Vorderrad an?', back: 'Das Vorderrad lässt sich oft mit <strong>zwei Handgriffen</strong> vom Fahrrad lösen - dann bleibt nur das Rad am Schloss.' },
    { front: 'Was raten Experten beim Schloss?', back: '<strong>Nicht am Schloss sparen!</strong> Geeignet ist ein stabiles Bügel- oder Panzerkabelschloss. Ganz billige Schlösser werden von Dieben schnell erkannt und leicht geknackt.' },
    { front: 'Wo lässt du dein Fahrrad nachts stehen?', back: 'Nie auf der Straße! Am besten mit einem Schloss gesichert in einem <strong>geschlossenen Raum</strong> (Keller, Garage).' },
    { front: 'Wo trägst du alle Angaben zu deinem Fahrrad ein?', back: 'In einen <strong>Fahrradpass</strong>.' }
  ];

  // Heft S.5
  const LERNKARTEN_RAD_GLEICHGEWICHT = [
    { front: 'Was musst du können, um sicher Fahrrad zu fahren?', back: 'Du musst selbst im <strong>Gleichgewicht</strong> sein, andere <strong>wahrnehmen</strong> und deine <strong>Absichten mitteilen</strong> können.' },
    { front: 'Welche Dinge musst du beim Radfahren gleichzeitig machen?', back: 'Aufsteigen, anfahren, treten, Handzeichen geben, bremsen oder in einer Gruppe fahren - und dich dabei auf den <strong>Straßenverkehr konzentrieren</strong>.' },
    { front: 'Womit ist das Gleichgewicht eng verbunden?', back: 'Das Gleichgewicht ist dein allumfassender Sinn und eng mit <strong>Augen und Ohren</strong> verbunden.' },
    { front: 'Nenne Beispiele, bei denen du dein Gleichgewicht beim Radfahren brauchst.', back: 'Schnell fahren, nach links und rechts schauen (Blick über die Schulter), geradeaus und Kurven fahren, <strong>Handzeichen geben</strong> („Fahren mit einer Hand“), auf unebenen oder nassen Wegen fahren, den Verkehr beobachten oder Geräusche hören.' },
    { front: 'Wie kannst du dein Gleichgewicht trainieren?', back: 'Beim <strong>Bewegen und beim Sport</strong>.' }
  ];

  // Heft S.12/13 - Regeln (Schilder siehe LERNKARTEN_RAD_SCHILDER)
  const LERNKARTEN_RAD_WEGE = [
    { front: 'Bis zu welchem Geburtstag MUSST du als Kind auf dem Gehweg fahren?', back: 'Bis zum <strong>8. Geburtstag</strong> musst du auf dem Gehweg fahren.' },
    { front: 'Bis zu welchem Geburtstag DARFST du als Kind auf dem Gehweg fahren?', back: 'Bis zum <strong>10. Geburtstag</strong> darfst du auf dem Gehweg fahren.' },
    { front: 'Was gilt für die Radfahrer auf dem Gehweg?', back: 'Die Radfahrer müssen <strong>Rücksicht auf Fußgänger</strong> nehmen.' },
    { front: 'Was gilt nach dem 10. Geburtstag? Wo musst du fahren?', back: 'Es gelten die <strong>normalen Regeln für Radfahrer</strong>: Ist ein Radweg da, musst du den Radweg auf der <strong>rechten Seite</strong> benutzen. Ist keiner da, musst du auf der <strong>Fahrbahn an der rechten Seite</strong> fahren.' },
    { front: 'Welche drei Arten von Wegen gibt es für Radfahrer?', back: '1. Wege, auf denen du fahren <strong>musst</strong><br>2. Wege, auf denen du fahren <strong>darfst</strong><br>3. Wege, auf denen du <strong>nicht</strong> fahren darfst' },
    { front: 'Azra schiebt ihr Rad über den Zebrastreifen. Ist das richtig?', back: 'Ja - sie muss <strong>absteigen</strong> und ihr Rad <strong>schieben</strong>.' }
  ];

  // Heft S.12/13 - Schilder (Bilder aus images/verkehrszeichen)
  const LERNKARTEN_RAD_SCHILDER = [
    { front: radImg('237_radweg.svg') + 'Was bedeutet dieses Schild für dich als Radfahrer?', back: 'Hier <strong>muss</strong> ich fahren: Ich muss den <strong>Radweg benutzen</strong> und darf nicht auf der Fahrbahn fahren.' },
    { front: radImg('241_getrennter_rad_gehweg.svg') + 'Was bedeutet dieses Schild?', back: '<strong>Getrennter Rad- und Gehweg</strong>: Radfahrer und Fußgänger benutzen nebeneinander ihre <strong>eigenen Spuren</strong>.' },
    { front: radImg('240_geh_radweg.svg') + 'Was bedeutet dieses Schild?', back: '<strong>Gemeinsamer Geh- und Radweg</strong>: Sie haben den gleichen Weg. Hier müssen Radfahrer <strong>besondere Rücksicht</strong> nehmen.' },
    { front: 'Was trennt Radfahrer auf der Fahrbahn von den Autos?', back: '<strong>Radfahrstreifen</strong> oder <strong>Schutzstreifen</strong> auf der Fahrbahn trennen die Radfahrer von den Autos.' },
    { front: radImg('244_fahrradstrasse.svg') + 'Was bedeutet dieses Schild?', back: '<strong>Fahrradstraße</strong> - eine Straße nur für Radfahrer. Hier dürfen sie immer nebeneinander fahren.' },
    { front: radImg('239_gehweg.svg') + 'Was bedeutet dieses Schild? Darfst du hier Rad fahren?', back: 'Der Gehweg ist <strong>ausschließlich für Fußgänger</strong> da. Ausnahme: <strong>Kinder bis zum 10. Lebensjahr</strong> dürfen hier Rad fahren.' },
    { front: 'Ein Gehweg hat das Zusatzschild „Radfahrer frei“. Darfst du hier fahren?', back: 'Ja, diesen Weg <strong>darf</strong> ich benutzen. Ich kann aber auch auf der Fahrbahn fahren. Oft sind solche Wege in einem schlechten Zustand.' },
    { front: 'Was erlaubt ein Zusatzschild „Radfahrer frei“ Radfahrern oft noch?', back: 'Radfahrern <strong>gegen die Fahrtrichtung der Einbahnstraße</strong>, <strong>in Fußgängerzonen</strong> und <strong>in eine Einfahrt</strong> (Einfahrtverbot) zu fahren.' },
    { front: radImg('242_fussgaengerzone.svg') + 'Darfst du in einer Fußgängerzone Rad fahren?', back: 'Auch in der Fußgängerzone ist Rad fahren <strong>verboten</strong> - außer ein Zusatzschild erlaubt es.' },
    { front: radImg('325_verkehrsberuhigt_beginn.svg') + 'Wer darf den verkehrsberuhigten Bereich benutzen?', back: '<strong>Alle Verkehrsteilnehmer</strong> dürfen ihn benutzen. Alle dürfen nur <strong>Schrittgeschwindigkeit</strong> fahren.' },
    { front: radImg('330_autobahn.svg') + radImg('331_kraftfahrstrasse.svg') + 'Dürfen Radfahrer hier fahren?', back: 'Nein - auf <strong>Autobahnen</strong> und <strong>Kraftfahrzeugstraßen</strong> dürfen Radfahrer nicht fahren.' },
    { front: radImg('250_verbot_alle_fahrzeuge.svg') + 'Was bedeutet dieses Schild?', back: '<strong>Verbot für alle Fahrzeuge</strong> - gilt auch für Radfahrer.' },
    { front: radImg('254_verbot_radfahrer.svg') + 'Was bedeutet dieses Schild?', back: '<strong>Verboten für Radfahrer</strong> - gilt ausschließlich für Radfahrer.' },
    { front: radImg('267_verbot_einfahrt.svg') + 'Was bedeutet dieses Schild?', back: '<strong>Einfahrtverbot für alle</strong> - gilt auch für Radfahrer.' }
  ];

  // Heft S.14-16
  const LERNKARTEN_RAD_RUECKSICHT = [
    { front: 'Du fährst Rad und kommst an einen Zebrastreifen. Fußgänger wollen die Straße überqueren. Was tust du?', back: 'Ich muss <strong>anhalten</strong> und die Fußgänger <strong>vorbeilassen</strong>.' },
    { front: 'An der Haltestelle warten Fußgänger auf die Bahn oder steigen aus. Was tust du als Radfahrer?', back: 'Ich <strong>halte an und warte</strong>, bis die Türen geschlossen sind. Als Radfahrer muss ich hier <strong>besonders Rücksicht</strong> nehmen.' },
    { front: 'Du fährst im verkehrsberuhigten Bereich. Was ist richtig?', back: 'Ich darf hier Rad fahren, muss aber <strong>auf Autos achten</strong> und <strong>Rücksicht</strong> auf die anderen Verkehrsteilnehmer nehmen.' },
    { front: 'Du fährst auf dem Gehweg an Geschäften, Restaurants und Eisdielen vorbei. Worauf achtest du?', back: 'Ich fahre <strong>nicht zu dicht an Hauseingängen</strong> vorbei. Besonders dort muss ich mit Leuten rechnen, die <strong>auf den Gehweg treten</strong>.' },
    { front: 'In Parks ist viel los. Ein Ball rollt über den Weg. Womit musst du rechnen?', back: 'Dass <strong>jemand hinterherläuft</strong>.' },
    { front: 'Was machen kleine Kinder in Parks oft?', back: 'Sie laufen <strong>plötzlich los</strong> und achten nicht auf Radfahrer.' },
    { front: 'Achten Spaziergänger immer auf Radfahrer?', back: 'Nein - Spaziergänger achten <strong>nicht immer</strong> auf Radfahrer.' },
    { front: 'Was ist bei Inline-Skatern zu beachten?', back: 'Sie sind sehr schnell, brauchen viel Platz, und ich kann sie <strong>nicht hören</strong>, wenn sie von hinten kommen.' },
    { front: 'Was ist bei Menschen mit Rollatoren zu beachten?', back: 'Sie <strong>bleiben öfter stehen</strong> und machen Pausen.' },
    { front: 'Was ist bei Fußgängern in einer Gruppe oft so?', back: 'Häufig stehen sie <strong>zusammen und versperren den Weg</strong>.' }
  ];

  // Heft S.17
  const LERNKARTEN_RAD_ANFAHREN = [
    { front: 'Warum ist das Losfahren in den fließenden Verkehr gefährlich?', back: 'Durch <strong>falsches Anfahren</strong> passieren jedes Jahr viele Unfälle.' },
    { front: 'Anfahren: Nenne die 4 Schritte in der richtigen Reihenfolge.', back: '1. Nach links und rechts sehen, Rücksicht nehmen und warten<br>2. Neben das Fahrrad stellen, Pedal oben<br>3. Prüfen, ob die Fahrbahn frei ist, Handzeichen geben<br>4. Beide Hände an den Lenker, zügig anfahren, in der Spur bleiben' },
    { front: 'Du willst von einem Grundstück oder Gehweg nach links fahren. Was musst du tun?', back: 'Du musst erst dein Fahrrad über den Gehweg und die Fahrbahn auf die <strong>andere Straßenseite schieben</strong>. Dort kannst du wie beschrieben losfahren.' }
  ];

  // ---------------------------------------------------------------------------
  // Sport: Erwaermung (24.10.2026, Uli-Wunsch): Max soll die Erwaermung fuer den Sportunterricht koennen und sagen koennen, welche
  // Muskelgruppen die Uebungen ansprechen. Fuenf Uebungen (Uli): Kniebeugen, Rumpfkreisen, Hampelmann, Armkreisen, Hueftheben (Krabbenstellung).
  // Wiederholungszahlen sind Vorschlaege (Uli hat sie nicht vorgegeben). Muskeln in Kindersprache mit Fachwort in Klammern. Mehrteiliges steht
  // auf EINER Karte (keine Teil-n-Splits, siehe Radfahr-Lernkarten).
  // Max soll die Erwaermung ANLEITEN koennen (Uli 24.10.2026): die Uebung erklaeren UND die angesprochenen Muskelpartien erklaeren.
  // Darum je Uebung drei Sichten (Ausfuehrung, Muskeln, Anleit-Text zum Vorsprechen) + Umkehrfragen + Reihenfolge.
  // Die Erwaermung dauert 3 Minuten: 5 Uebungen je 30 Sekunden + kurze Wechsel (Uli 24.10.2026). Fuer ein 9-jaehriges Kind kurz und einfach:
  // 3-4 kurze Schritte, je Uebung nur 2 Muskelpartien in Kindersprache (Fachwort in Klammern).
  // Eine Karte je Uebung: Ausfuehrung + Muskeln zum schnellen Erklaeren (Uli 24.10.2026).
  const LERNKARTEN_SPORT_UEBUNGEN = [
    { front: 'Kniebeugen: Erkläre die Übung und die Muskeln.', back: '1. Stell dich <strong>schulterbreit</strong> hin, Arme nach vorn.<br>2. Geh mit dem <strong>Po nach hinten unten</strong>, wie auf einen Stuhl.<br>3. Der Rücken bleibt <strong>gerade</strong>.<br>4. Steh wieder auf. <strong>30 Sekunden</strong> lang.<br><br><strong>Muskeln:</strong> <strong>Oberschenkel vorn</strong> (Quadrizeps) streckt das Knie, der <strong>Po</strong> richtet dich auf.' },
    { front: 'Rumpfkreisen: Erkläre die Übung und die Muskeln.', back: '1. Stell dich <strong>schulterbreit</strong> hin, <strong>Hände an die Hüfte</strong>.<br>2. Kreise mit der Hüfte <strong>große Kreise</strong>.<br>3. Erst <strong>rechts herum</strong>, dann <strong>links herum</strong>. <strong>30 Sekunden</strong> lang.<br><br><strong>Muskeln:</strong> <strong>Bauchmuskeln</strong> halten den Oberkörper ruhig, <strong>Rückenmuskeln</strong> helfen dabei.' },
    { front: 'Hampelmann: Erkläre die Übung und die Muskeln.', back: '1. Spring und mach <strong>Beine und Arme gleichzeitig auseinander</strong>.<br>2. Die Arme gehen über den Kopf.<br>3. Spring wieder zurück. <strong>30 Sekunden</strong> lang.<br><br><strong>Muskeln:</strong> <strong>Beine</strong> (Waden, Oberschenkel) springen, <strong>Schultern</strong> heben die Arme. Das <strong>Herz</strong> schlägt schneller.' },
    { front: 'Armkreisen: Erkläre die Übung und die Muskeln.', back: '1. Stell dich hin und streck die <strong>Arme zur Seite</strong>.<br>2. Kreise mit den Armen, erst <strong>vorwärts</strong>, dann <strong>rückwärts</strong>.<br>3. Zieh die Schultern nicht hoch. <strong>30 Sekunden</strong> lang.<br><br><strong>Muskeln:</strong> <strong>Schultermuskeln</strong> kreisen die Arme, der <strong>Nacken</strong> wird locker.' },
    { front: 'Hüftheben (Krabbenstellung): Erkläre die Übung und die Muskeln.', back: '1. Setz dich hin, <strong>Füße auf den Boden</strong>, <strong>Hände hinter dir</strong> aufgestützt.<br>2. <strong>Heb den Po an</strong>, bis der Bauch zur Decke zeigt, und setz ihn wieder ab.<br>3. Du gehst dabei nicht. <strong>30 Sekunden</strong> lang.<br><br><strong>Muskeln:</strong> Der <strong>Po</strong> (Gesäß) hebt dich hoch, der <strong>Oberarm hinten</strong> (Trizeps) stützt dich ab.' }
  ];
  const LERNKARTEN_SPORT_ABLAUF = [
    { front: 'Die Erwärmung dauert 3 Minuten. Nenne die 5 Übungen in der richtigen Reihenfolge.', back: '1. Kniebeugen<br>2. Rumpfkreisen<br>3. Hampelmann<br>4. Armkreisen<br>5. Hüftheben (Krabbenstellung)<br><br>Jede Übung dauert <strong>30 Sekunden</strong>.' }
  ];

  // Heft S.18
  const LERNKARTEN_RAD_RECHTS = [
    { front: 'Wo müssen alle auf Straßen und Radwegen fahren?', back: 'Alle müssen <strong>rechts</strong> fahren.' },
    { front: 'In welchen 3 Situationen musst oder darfst du die rechte Seite verlassen?', back: '1. Wenn du an einem <strong>Hindernis vorbeifahren</strong> musst<br>2. Wenn ihr <strong>zu zweit nebeneinander</strong> in einem verkehrsberuhigten Bereich oder auf einer Fahrradstraße fahren wollt<br>3. Wenn du dich zum <strong>Linksabbiegen links einordnen</strong> willst' },
    { front: 'Wie fahrt ihr zu zweit am sichersten?', back: '<strong>Hintereinander</strong>. Ausnahmen sind Spielstraßen und Fahrradstraßen.' },
    { front: 'Wie groß soll der Abstand zur Bordsteinkante sein?', back: '<strong>50 bis 100 cm</strong>, je nach Situation.' },
    { front: 'Wie viel Sicherheitsabstand hältst du zu jemandem vor dir?', back: 'So viel, dass du <strong>gut anhalten</strong> kannst, ohne aufzufahren. <strong>Drei Radlängen</strong> sind sicher.' },
    { front: 'Warum brauchst du Sicherheitsabstand?', back: 'Auffahren passiert schneller, als du denkst - etwa wenn der Vordermann eine <strong>Vollbremsung</strong> macht.' }
  ];

  // Heft S.19 (Reihenfolge der 5 Schritte gilt laut Uli 24.09.2026 nach dem HEFT, nicht nach
  // dem Buch S.76 - die Buch-Reihenfolge wurde bewusst entfernt)
  const LERNKARTEN_RAD_HINDERNIS = [
    { front: 'Ein parkendes Fahrzeug oder eine Baustelle versperrt den Weg. Was musst du beim Vorbeifahren tun?', back: 'Du musst beim Vorbeifahren deine <strong>Fahrspur verlassen</strong>.' },
    { front: 'Vorbeifahren am Hindernis: Nenne alle 5 Schritte in der richtigen Reihenfolge.', back: '1. <strong>Umschauen</strong><br>2. <strong>Handzeichen links</strong> geben<br>3. <strong>Links einordnen</strong>; bei Gegenverkehr Vorrang gewähren<br>4. <strong>Sicherheitsabstand</strong> halten<br>5. <strong>Handzeichen rechts</strong> geben und wieder rechts einordnen' },
    { front: 'Du musst beim Vorbeifahren auf die Gegenfahrbahn ausweichen und es kommt Gegenverkehr. Was tust du?', back: 'Du musst <strong>warten</strong> und den Gegenverkehr vorbeifahren lassen. Erst wenn niemand mehr kommt, darfst du fahren. Schau dich vor dem Losfahren <strong>unbedingt um</strong>, ob hinter dir jemand kommt.' },
    { front: 'Über welche Schulter machst du vor dem Ausweichen den Schulterblick?', back: 'Über die <strong>linke</strong> Schulter.' }
  ];

  // Heft S.20/21 + Sfb S.76 (Nr. 6/8)
  const LERNKARTEN_RAD_VORFAHRT = [
    { front: 'Wo gilt die Vorfahrtsregel „rechts vor links“?', back: 'An Kreuzungen oder <strong>Einmündungen</strong>, wo es <strong>keine Ampeln und keine Verkehrszeichen</strong> gibt.' },
    { front: 'Was bedeutet „rechts vor links“?', back: 'Wer von <strong>rechts</strong> kommt, hat Vorfahrt.' },
    { front: 'Was ist eine Einmündung?', back: 'Eine Stelle, an der eine Straße in eine andere Straße <strong>mündet</strong> (hineinführt).' },
    { front: 'Mehrere Fahrzeuge kommen gleichzeitig an eine Kreuzung. Wer darf zuerst fahren?', back: 'Der, der <strong>kein anderes Fahrzeug sieht</strong>, wenn er nach <strong>rechts</strong> schaut.' },
    { front: 'Du kommst an einer Kreuzung ohne Ampel und ohne Verkehrszeichen an. Ein Auto kommt von rechts. Wer hat Vorfahrt?', back: 'Das Auto von <strong>rechts</strong> hat Vorfahrt - du musst warten.' },
    { front: radImg('102_kreuzung_rechts.svg') + 'Was bedeutet dieses Schild?', back: 'Die Kreuzung ohne Ampel und Vorfahrtszeichen ist sehr gefährlich - auch hier gilt <strong>„rechts vor links“</strong>.' },
    { front: 'Wann gilt „rechts vor links“ NICHT? Nenne die Ausnahmen.', back: 'Bei <strong>Wald- oder Feldwegen</strong> sowie <strong>Einfahrten</strong>.' },
    { front: 'Niemals Vorfahrt hat, wer ...', back: '1. Wer aus einer Seitenstraße kommt, die über einen <strong>abgesenkten Bordstein</strong> führt, oder wer einen <strong>verkehrsberuhigten Bereich</strong> verlässt.<br>2. Wer aus <strong>Hofeinfahrten, Grundstücken, Parkplätzen oder Tankstellen</strong> auf die Fahrbahn fährt.<br>3. Wer aus einem <strong>Feldweg</strong> oder <strong>Park</strong> kommt.' },
    { front: 'Du hast Vorfahrt. Worauf musst du als Radfahrer trotzdem besonders achten?', back: 'Darauf, <strong>gesehen zu werden</strong>. Autofahrer übersehen dich manchmal: Halte dich immer <strong>bremsbereit</strong> und suche <strong>Blickkontakt</strong>, auch wenn du Vorfahrt hast!' },
    { front: 'Eine Straßenbahn hält an einer Haltestelle an. Was musst du als Radfahrer tun?', back: 'Du musst als Radfahrer auch <strong>stehen bleiben</strong>.' }
  ];

  // karten ist bei allen Themen eine FUNKTION (nicht das Array direkt) - bei
  // den meisten nur der Einheitlichkeit halber (liefern schlicht das feste
  // Array zurueck), bei rad_falsch aber echt noetig, damit sammleFalscheRad-
  // Karten() bei jedem Start frisch ueber die aktuellen Statistiken aller
  // anderen rad_*-Themen sammelt (siehe unten).
  //
  // bewertung:true (06.09.2026, Uli-Wunsch, urspruenglich fuer die
  // inzwischen entfernte LK-Vorbereitung eingefuehrt): Max markiert selbst
  // richtig/falsch (wie Mathes Malfolgen-Karteikarten), falsche Karten werden
  // dadurch in kuenftigen Sitzungen haeufiger vorgelegt (siehe
  // baueBewertetesKartendeck unten).
  const LERNTHEMEN = {
    rad_fahrrad: { gruppe: 'rad', titel: 'Verkehrssicheres Fahrrad', icon: 'fahrrad', karten: () => LERNKARTEN_RAD_FAHRRAD, bewertung: true },
    rad_sicht: { gruppe: 'rad', titel: 'Sehen & gesehen werden', icon: 'koordinaten', karten: () => LERNKARTEN_RAD_SICHT, bewertung: true },
    rad_helm: { gruppe: 'rad', titel: 'Helm & Schloss', icon: 'fahrrad', karten: () => LERNKARTEN_RAD_HELM, bewertung: true },
    rad_gleichgewicht: { gruppe: 'rad', titel: 'Gleichgewicht', icon: 'fahrrad', karten: () => LERNKARTEN_RAD_GLEICHGEWICHT, bewertung: true },
    rad_wege: { gruppe: 'rad', titel: 'Wo darf ich fahren?', icon: 'verkehrszeichen', karten: () => LERNKARTEN_RAD_WEGE, bewertung: true },
    rad_schilder: { gruppe: 'rad', titel: 'Schilder für Radfahrer', icon: 'verkehrszeichen', karten: () => LERNKARTEN_RAD_SCHILDER, bewertung: true },
    rad_ruecksicht: { gruppe: 'rad', titel: 'Rücksicht auf Fußgänger', icon: 'heimat', karten: () => LERNKARTEN_RAD_RUECKSICHT, bewertung: true },
    rad_anfahren: { gruppe: 'rad', titel: 'Anfahren', icon: 'fahrrad', karten: () => LERNKARTEN_RAD_ANFAHREN, bewertung: true },
    rad_rechts: { gruppe: 'rad', titel: 'Rechts fahren & Abstand', icon: 'verkehrszeichen', karten: () => LERNKARTEN_RAD_RECHTS, bewertung: true },
    rad_hindernis: { gruppe: 'rad', titel: 'Hindernis umfahren', icon: 'fahrrad', karten: () => LERNKARTEN_RAD_HINDERNIS, bewertung: true },
    rad_vorfahrt: { gruppe: 'rad', titel: 'Vorfahrt & Warten', icon: 'verkehrszeichen', karten: () => LERNKARTEN_RAD_VORFAHRT, bewertung: true },
    // 27.09.2026, Uli-Wunsch: eigenes Thema, das die aktuell falsch
    // markierten Karten AUS ALLEN anderen rad_*-Themen sammelt und haeufiger
    // abfragt - siehe sammleFalscheRadKarten/baueFalscheKartenDeck weiter
    // unten. karten() liefert hier absichtlich rohe {front,back,_quellThema,
    // _quellIdx}-Objekte statt eines festen Arrays; bewertung:true bleibt
    // gesetzt, damit starteThemenwahl/renderLernkarte es wie jedes andere
    // Thema behandeln (nur starteLernkarten hat unten einen Sonderfall fuer
    // den Deck-Aufbau, weil die Gewichtung sich auf die QUELL-Statistik
    // stuetzen muss, nicht auf eine eigene 'rad_falsch'-Statistik).
    rad_falsch: { gruppe: 'rad', titel: 'Falsche Karten wiederholen', icon: 'drehen', karten: sammleFalscheRadKarten, bewertung: true },
    sport_ablauf: { gruppe: 'sport', titel: 'Die Reihenfolge', icon: 'tagesaufgabe', karten: () => LERNKARTEN_SPORT_ABLAUF, bewertung: true },
    sport_uebungen: { gruppe: 'sport', titel: 'Die Übungen erklären', icon: 'sport', karten: () => LERNKARTEN_SPORT_UEBUNGEN, bewertung: true },
  };

  // ---- Gewichteter Kartendeck-Aufbau fuer die bewertung:true-Themen, 1:1
  // vom Prinzip aus Mathe.baueMalfolgenDeck/gewichtFuerStat/
  // mischeOhneNachbarWiederholung uebernommen (siehe dort fuer die
  // ausfuehrliche Begruendung) - Unterschied: die Heimatkunde-Themen haben
  // nur 5-16 Karten statt bis zu 100 Malfolgen-Fakten, ein sitzungs-
  // uebergreifendes Rest-Deck (Storage.malfolgenDeck-Pendant) ist dafuer nicht
  // noetig - pro Sitzungsstart wird einfach frisch anhand der bisherigen
  // Statistik gewichtet gemischt. ----
  function gewichtFuerLernkartenStat(stat) {
    if (!stat) return 3;
    const serieBonus = Math.min(stat.serie || 0, 4);
    return Math.max(1, 3 + (stat.falsch || 0) * 2 - serieBonus);
  }

  function mischeOhneNachbarWiederholung(arr) {
    const gruppen = new Map();
    for (const x of arr) gruppen.set(x, (gruppen.get(x) || 0) + 1);
    let eintraege = shuffle([...gruppen.entries()]);

    const ergebnis = [];
    let vorheriger = null;
    while (ergebnis.length < arr.length) {
      eintraege.sort((a, b) => b[1] - a[1]);
      const maxCount = eintraege[0][1];
      const kandidaten = eintraege.filter(([wert, anzahl]) => anzahl === maxCount && wert !== vorheriger);
      const pool = kandidaten.length > 0 ? kandidaten : eintraege.filter(([wert]) => wert !== vorheriger);
      const gewaehlt = pool.length > 0 ? pool[rnd(0, pool.length - 1)] : eintraege[0];
      const wert = gewaehlt[0];
      ergebnis.push(wert);
      vorheriger = wert;
      const eintrag = eintraege.find(e => e[0] === wert);
      eintrag[1]--;
      eintraege = eintraege.filter(e => e[1] > 0);
    }
    return ergebnis;
  }

  // Liefert die Session-Karten fuer ein bewertung:true-Thema: jede Karte
  // bekommt _idx (ihre feste Position im Original-Array, siehe
  // Storage.meldeLernkartenErgebnis) und schwache Karten (siehe
  // gewichtFuerLernkartenStat) kommen mehrfach (bis zu 5x) vor.
  function baueBewertetesKartendeck(thema, karten) {
    const stats = Storage.getLernkartenStats(thema);
    const indexDeck = [];
    karten.forEach((karte, i) => {
      const kopien = Math.min(5, Math.max(1, Math.round(gewichtFuerLernkartenStat(stats[i]) / 3)));
      for (let n = 0; n < kopien; n++) indexDeck.push(i);
    });
    return mischeOhneNachbarWiederholung(indexDeck).map(i => Object.assign({ _idx: i }, karten[i]));
  }

  // ---- "Falsche Karten wiederholen" (27.09.2026, Uli-Wunsch): Max arbeitet
  // die Radfahrausbildung-Themen einzeln durch, soll aber zusaetzlich EIN
  // Thema haben, in dem alle bislang falsch beantworteten Karten aus ALLEN
  // rad_*-Themen gesammelt und haeufiger abgefragt werden - ZUSAETZLICH zum
  // normalen (einfachen) Vorkommen in ihrem jeweiligen Herkunftsthema, nicht
  // als Ersatz dafuer. Deshalb ist rad_falsch keine eigene Kartenbank: es
  // liest nur die per-Thema-Statistik (Storage.getLernkartenStats), die
  // ohnehin schon durch das normale Lernen in den einzelnen Themen entsteht,
  // und merkt sich pro gesammelter Karte, aus welchem Thema/Index sie stammt
  // (_quellThema/_quellIdx). bewerteLernkarte() unten meldet ein Ergebnis
  // aus dieser Sitzung deshalb auch an die QUELL-Statistik zurueck (nicht an
  // eine eigene 'rad_falsch'-Statistik) - so wirkt sich richtiges Wiederholen
  // hier auch auf die Fortschritts-Uebersicht des Herkunftsthemas aus, und
  // eine Karte verschwindet aus rad_falsch, sobald sie dort wieder zwei Mal
  // in Folge sicher sitzt (siehe lernkartenStatus/serie-Schwelle).
  //
  // "Falsch" = mindestens einmal falsch markiert UND noch nicht wieder zwei
  // Mal in Folge richtig (dieselbe Schwelle wie lernkartenStatus 'uebung' vs.
  // 'sicher', nur zusaetzlich auf stat.falsch>0 eingeschraenkt - eine Karte,
  // die einfach noch nie falsch war, aber erst einmal richtig beantwortet
  // wurde, ist keine "falsche Karte").
  function sammleFalscheRadKarten() {
    const ergebnis = [];
    Object.keys(LERNTHEMEN).forEach(key => {
      const info = LERNTHEMEN[key];
      if (info.gruppe !== 'rad' || key === 'rad_falsch') return;
      const stats = Storage.getLernkartenStats(key);
      info.karten().forEach((karte, i) => {
        const stat = stats[i];
        if (stat && (stat.falsch || 0) > 0 && (stat.serie || 0) < 2) {
          ergebnis.push({ front: karte.front, back: karte.back, _quellThema: key, _quellIdx: i });
        }
      });
    });
    return ergebnis;
  }

  // Wie baueBewertetesKartendeck, aber die Gewichtung (wie oft eine Karte in
  // dieser Sitzung vorkommt) stuetzt sich auf die STATISTIK DES HERKUNFTS-
  // THEMAS (karte._quellThema/_quellIdx), nicht auf eine eigene 'rad_falsch'-
  // Statistik, die es bewusst nicht gibt (siehe Kommentar oben).
  function baueFalscheKartenDeck() {
    const karten = sammleFalscheRadKarten();
    const indexDeck = [];
    karten.forEach((karte, i) => {
      const stat = Storage.getLernkartenStats(karte._quellThema)[karte._quellIdx];
      const kopien = Math.min(5, Math.max(1, Math.round(gewichtFuerLernkartenStat(stat) / 3)));
      for (let n = 0; n < kopien; n++) indexDeck.push(i);
    });
    return mischeOhneNachbarWiederholung(indexDeck).map(i => Object.assign({ _idx: i }, karten[i]));
  }

  // Themenwahl VOR den Lernkarten - bewusst eigener Menuepunkt statt alles auf
  // einmal, damit Max sich immer nur EIN Themengebiet vornimmt (Uli-Wunsch).
  // Eigener back-row statt App.subMenuHtml, weil dessen Zurueck-Button fix
  // App.gotoHome() aufruft - hier soll Zurueck zur Heimatkunde-Startseite
  // fuehren (eine Ebene hoch), nicht ganz nach Hause.
  // Merkt sich die zuletzt gewaehlte Themengruppe, damit alle Zurueck-/
  // "Anderes Thema"-Buttons ohne Argument wieder dieselbe Gruppe zeigen.
  // Aktuell gibt es nur noch 'rad' (die LK-Vorbereitung mit Gruppe 'lk' wurde
  // 27.09.2026 entfernt) - GRUPPEN_INFO bleibt trotzdem ein Objekt statt
  // fixer Werte, falls spaeter eine weitere Themengruppe dazukommt.
  let themenGruppe = 'rad';
  const GRUPPEN_INFO = {
    rad: { titel: 'Radfahrausbildung', text: 'Wähl ein Thema aus - nach dem Umdrehen markierst du selbst, ob du es gewusst hast.', zurueck: 'Heimatkunde.renderMenu()' },
    sport: { titel: 'Sport: Erwärmung', text: 'Lerne die Erwärmung für den Sportunterricht - nach dem Umdrehen markierst du selbst, ob du es gewusst hast.', zurueck: 'App.gotoHome()' }
  };

  function starteThemenwahl(gruppe) {
    if (gruppe) themenGruppe = gruppe;
    const gi = GRUPPEN_INFO[themenGruppe];
    const karten = Object.keys(LERNTHEMEN).filter(key => LERNTHEMEN[key].gruppe === themenGruppe).map(key => {
      const t = LERNTHEMEN[key];
      return `<div class="sub-card" onclick="Heimatkunde.starteLernkarten('${key}')"><span class="sub-icon">${Icons.svg(t.icon)}</span><span class="sub-label">${t.titel}</span></div>`;
    }).join('');
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="${gi.zurueck}">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">${gi.titel}</div>
      <div class="lese-text">${gi.text}</div>
      <div class="sub-grid">${karten}</div>
    `);
  }

  // Reine Lernkarten (Umdrehen per Tap) - KEIN Eintippen, KEINE Auto-Bewertung.
  // Uli hoert Max die Fakten selbst ab, siehe ACHTUNG-Kommentar oben.
  let lkSession = null;
  let lkUmgedreht = false;

  // "heimatkunde-<thema>" als Storage.getOffeneSession-Schluessel (nur fuer
  // bewertung:true-Themen genutzt) - eigener Schluessel pro Thema, da die
  // rad_*-Themen unabhaengig voneinander unterbrochen/fortgesetzt werden
  // koennen.
  function aktivitaetFuerThema(thema) { return 'heimatkunde-' + thema; }

  // Setzt eine unterbrochene bewertung:true-Sitzung fort, WENN eine vom
  // selben Kalendertag existiert (siehe Storage.getOffeneSession - am
  // naechsten Tag wird bewusst neu angefangen, gleiches Prinzip wie bei
  // Mathe.starteMalfolgenKarten). Anders als dort wird hier nicht neu aus
  // einem Pool gezogen, sondern das GESAMTE damalige Kartendeck (inkl. der
  // durch Gewichtung mehrfach vorkommenden Karten) 1:1 weiterverwendet - bei
  // nur 5-16 Basiskarten pro Thema ist das einfacher und genauer als
  // Malfolgens Pool-Nachziehen, das fuer 100 Fakten gebaut wurde (06.09.2026,
  // Uli-Wunsch "Lernstand ... gespeichert").
  //
  // rad_falsch (27.09.2026) braucht denselben Fortsetzen-Mechanismus, aber
  // beim NEUEN Deck-Aufbau baueFalscheKartenDeck() statt baueBewertetesKarten-
  // deck(thema, ...) - siehe Kommentar dort. Zusaetzlich: hat Max aktuell gar
  // keine falschen Karten, gibt es keine sinnvolle Sitzung zu starten -
  // renderKeineFalschenKarten() zeigt dann eine freundliche Leer-Meldung statt
  // einer kaputten 0-Karten-Sitzung.
  // ---- Ferientraining-Tageskarten (11.10.2026, Uli-Wunsch): Max lernt jeden Tag
  // 30 Karten aus den AKTIVEN Radfahr-Stapeln. Aktiv sind zunaechst die ersten 4
  // Stapel (Reihenfolge = LERNTHEMEN); sobald Max ALLE Karten der aktiven Stapel
  // sicher kann (2x in Folge richtig, siehe lernkartenStatus), kommt der naechste
  // Stapel dazu, bis alle Stapel dran sind. Gewichtung wie sonst: schwache
  // Karten oefter. Ergebnisse gehen an die Statistik des Herkunftsstapels
  // (_quellThema/_quellIdx, wie bei rad_falsch). ----
  const START_STAPEL = 4;
  const TAGESKARTEN_THEMA = 'rad_tag';

  function radThemen() {
    return Object.keys(LERNTHEMEN).filter(k => LERNTHEMEN[k].gruppe === 'rad' && k !== 'rad_falsch');
  }

  // Karte "kann Max" = beim letzten Mal richtig (serie >= 1)
  function kartenKann(stat) { return !!(stat && (stat.serie || 0) >= 1); }
  const WEITER_ANTEIL = 0.8; // "die meisten": ab 80 % der aktiven Karten kommt der naechste Stapel

  function stapelZaehlung(keys) {
    let kann = 0, gesamt = 0;
    keys.forEach(key => {
      const stats = Storage.getLernkartenStats(key);
      LERNTHEMEN[key].karten().forEach((_, i) => { gesamt++; if (kartenKann(stats[i])) kann++; });
    });
    return { kann, gesamt };
  }

  // Mindestens so viele Stapel, dass der Kartenvorrat doppelt so gross ist wie die Tageskarten (23.10.2026, Uli: bei den vielen Karten
  // soll mehr Abwechslung sein) - bei 30 Karten am Tag also ca. 60 Karten statt der frueheren 4 Stapel mit 37 Karten.
  function startStapelAnzahl(liste) {
    let n = Math.min(START_STAPEL, liste.length), summe = 0;
    liste.slice(0, n).forEach(k => { summe += LERNTHEMEN[k].karten().length; });
    while (n < liste.length && summe < 2 * TAGESKARTEN_ANZAHL) { summe += LERNTHEMEN[liste[n]].karten().length; n++; }
    return n;
  }
  function aktiveStapel() {
    const liste = radThemen();
    let n = startStapelAnzahl(liste);
    while (n < liste.length) {
      const z = stapelZaehlung(liste.slice(0, n));
      if (z.gesamt === 0 || z.kann / z.gesamt < WEITER_ANTEIL) break;
      n++;
    }
    return liste.slice(0, n);
  }

  function stapelText() {
    const aktive = aktiveStapel();
    const z = stapelZaehlung(aktive);
    return `${aktive.length} von ${radThemen().length} Stapeln aktiv · ${z.kann} von ${z.gesamt} Karten gekonnt`;
  }

  /** Stand des Stapel-Aufbaus fuer Papas Verlaufs-Ansicht (siehe FernSync.meldeLernsetErledigt). */
  function aufbauInfo() {
    const aktive = aktiveStapel();
    const z = stapelZaehlung(aktive);
    return { stapel: aktive.map(k => LERNTHEMEN[k].titel), stapelGesamt: radThemen().length, kann: z.kann, gesamt: z.gesamt };
  }

  // n verschiedene Karten, gewichtet gezogen (ohne Zuruecklegen)
  // Tageskarten: 30 am Tag (Uli 23.10.2026: "belasse es bei 30"). Damit nicht jeden Tag dieselben kommen, gibt es mehr aktive Stapel (siehe
  // startStapelAnzahl) und jede Karte bekommt einen Abstands-Faktor nach dem Tag der letzten Abfrage (Storage-Rotation):
  // heute schon dran = nie wieder, gestern = selten, vorgestern = halbe Chance, danach/nie = volle Chance. Karten, die Max noch nicht
  // sicher kann (falsch markiert, Serie < 2), kommen frueher wieder.
  const TAGESKARTEN_ANZAHL = 30;
  function tagesNummer() { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000); }
  function abstandsFaktor(alter, schwach) {
    if (alter === Infinity) return 1.5;
    const f = alter <= 0 ? 0 : alter === 1 ? 0.12 : alter === 2 ? 0.5 : 1;
    return schwach ? Math.max(f, alter <= 0 ? 0 : 0.7) : f;
  }
  // Neue Karten kommen Stueck fuer Stueck dazu (Uli 23.10.2026: "er soll die neuen nach und nach mit den alten lernen"): "neu" = Max hat die
  // Karte noch nie gesehen (keine Statistik, nie als Tageskarte gezogen). Hoechstens NEU_PRO_TAG neue am Tag, der Rest sind Karten, die er
  // schon kennt (schwache und lange nicht gefragte zuerst). Neue kommen in der Reihenfolge der Stapel, damit Zusammengehoeriges beisammen bleibt.
  const NEU_PRO_TAG = 8;
  function baueTageskartenDeck(anzahl) {
    const alt = [], neu = [], heute = tagesNummer();
    aktiveStapel().forEach(key => {
      const stats = Storage.getLernkartenStats(key);
      LERNTHEMEN[key].karten().forEach((karte, i) => {
        const letzte = Storage.rotationWert('rad_tag', key + ':' + i);
        const s = stats[i];
        const eintrag = { karte: { front: karte.front, back: karte.back, _quellThema: key, _quellIdx: i }, key: key + ':' + i, w: 0 };
        if (!s && !letzte) { neu.push(eintrag); return; }
        const alter = letzte ? heute - letzte : Infinity;
        const schwach = !!(s && (s.falsch || 0) > 0 && (s.serie || 0) < 2);
        eintrag.w = Math.max(gewichtFuerLernkartenStat(s) * abstandsFaktor(alter, schwach), 0);
        alt.push(eintrag);
      });
    });
    const gezogen = [];
    const nimm = p => { gezogen.push(p.karte); Storage.rotationSetzeWert('rad_tag', p.key, heute); };
    // 1) neue Karten: heute noch freies Kontingent (zaehlt auch frueher am Tag eingefuehrte mit)
    if (Storage.rotationWert('rad_neu', 'tag') !== heute) { Storage.rotationSetzeWert('rad_neu', 'tag', heute); Storage.rotationSetzeWert('rad_neu', 'n', 0); }
    let neuHeute = Storage.rotationWert('rad_neu', 'n');
    // Gibt es zu wenige bekannte Karten, um den Tag zu fuellen, muessen mehr neue her (z.B. ganz am Anfang)
    const brauchtNeu = Math.max(0, anzahl - alt.length);
    const neuZiel = Math.min(neu.length, Math.max(NEU_PRO_TAG - neuHeute, brauchtNeu, 0), anzahl);
    for (let k = 0; k < neuZiel; k++) { nimm(neu[k]); neuHeute++; }
    Storage.rotationSetzeWert('rad_neu', 'n', neuHeute);
    // 2) bekannte Karten, gewichtet (Karten mit Gewicht 0 = heute schon dran, nur wenn sonst nichts uebrig ist)
    const pool = alt.slice();
    while (gezogen.length < anzahl && pool.length > 0) {
      const summe = pool.reduce((t, p) => t + p.w, 0);
      let idx;
      if (summe <= 0) idx = Math.floor(Math.random() * pool.length);
      else { let ziel = Math.random() * summe; idx = pool.findIndex(p => (ziel -= p.w) <= 0); if (idx < 0) idx = pool.length - 1; }
      nimm(pool.splice(idx, 1)[0]);
    }
    // 3) immer noch nicht voll (kaum bekannte Karten): mit weiteren neuen auffuellen
    for (let k = neuZiel; k < neu.length && gezogen.length < anzahl; k++) { nimm(neu[k]); neuHeute++; Storage.rotationSetzeWert('rad_neu', 'n', neuHeute); }
    return shuffle(gezogen);
  }

  function starteTagesLernkarten() {
    const aktivitaet = aktivitaetFuerThema(TAGESKARTEN_THEMA);
    const offen = Storage.getOffeneSession(aktivitaet);
    if (offen && Array.isArray(offen.karten) && offen.index > 0 && offen.index < offen.karten.length) {
      lkSession = {
        thema: TAGESKARTEN_THEMA, titel: 'Radfahren – Tageskarten', bewertung: true, karten: offen.karten, index: offen.index,
        richtig: offen.richtig || 0, sterne: offen.sterne || 0, verlauf: offen.verlauf || []
      };
    } else {
      const karten = baueTageskartenDeck(Ferientraining.restAnzahl('heimat_lernkarten', TAGESKARTEN_ANZAHL));
      lkSession = { thema: TAGESKARTEN_THEMA, titel: 'Radfahren – Tageskarten', bewertung: true, karten, index: 0, richtig: 0, sterne: 0, verlauf: [] };
    }
    App.setLastStarter(starteTagesLernkarten);
    renderLernkarte();
  }

  function starteLernkarten(thema) {
    if (thema === TAGESKARTEN_THEMA) { starteTagesLernkarten(); return; }
    const info = LERNTHEMEN[thema];
    if (info.bewertung) {
      const offen = Storage.getOffeneSession(aktivitaetFuerThema(thema));
      if (offen && Array.isArray(offen.karten) && offen.index > 0 && offen.index < offen.karten.length) {
        lkSession = {
          thema, titel: info.titel, bewertung: true, karten: offen.karten, index: offen.index,
          richtig: offen.richtig || 0, sterne: offen.sterne || 0, verlauf: offen.verlauf || []
        };
      } else {
        const karten = thema === 'rad_falsch' ? baueFalscheKartenDeck() : baueBewertetesKartendeck(thema, info.karten());
        if (karten.length === 0) {
          renderKeineFalschenKarten();
          return;
        }
        lkSession = { thema, titel: info.titel, bewertung: true, karten, index: 0, richtig: 0, sterne: 0, verlauf: [] };
      }
    } else {
      const karten = shuffle(info.karten());
      lkSession = { thema, titel: info.titel, bewertung: false, karten, index: 0, richtig: 0, sterne: 0, verlauf: [] };
    }
    App.setLastStarter(() => starteLernkarten(thema));
    renderLernkarte();
  }

  function renderKeineFalschenKarten() {
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Heimatkunde.starteThemenwahl()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Klasse! 🎉</div>
      <div class="lese-text">Du hast aktuell keine falschen Karten zum Wiederholen - mach einfach in den anderen Themen weiter.</div>
    `);
  }

  function renderLernkarte() {
    lkUmgedreht = false;
    const karte = lkSession.karten[lkSession.index];
    const nr = lkSession.index + 1;
    const total = lkSession.karten.length;
    const bewertungHtml = lkSession.bewertung
      ? `<div class="btn-bewertung btn-falsch" onclick="Heimatkunde.bewerteLernkarte(false)">✘ Nicht gewusst</div>
         <div class="btn-bewertung btn-richtig" onclick="Heimatkunde.bewerteLernkarte(true)">✔ Richtig gewusst</div>`
      : `<div class="btn-primary" onclick="Heimatkunde.naechsteLernkarte()">Weiter ➜</div>`;
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
            <div class="karteikarte-hinweis">Tippen: zurück zur Frage</div>
          </div>
        </div>
      </div>
      <div class="karteikarte-bewertung" id="karteikarte-bewertung">
        ${bewertungHtml}
      </div>
    `);
  }

  // Nach dem ersten Umdrehen erscheint die Bewertung; die Karte laesst sich danach beliebig oft hin- und herdrehen
  function karteUmdrehen() {
    const inner = document.getElementById('karteikarte-inner');
    if (!inner) return;
    if (lkUmgedreht) { inner.classList.toggle('umgedreht'); return; }
    lkUmgedreht = true;
    inner.classList.add('umgedreht');
    document.getElementById('karteikarte-bewertung').classList.add('sichtbar');
  }

  // Gemeinsamer "naechste Karte oder fertig"-Schritt fuer beide Lernkarten-
  // Arten (reines Umdrehen mit "Weiter"-Button vs. bewertung:true-Themen).
  function rueckeZurNaechstenKarteVor() {
    lkSession.index++;
    if (lkSession.index >= lkSession.karten.length) {
      renderLernkartenErgebnis();
    } else {
      renderLernkarte();
    }
  }

  function naechsteLernkarte() {
    if (!lkUmgedreht) return;
    rueckeZurNaechstenKarteVor();
  }

  // Nur fuer bewertung:true-Themen - Max markiert nach dem Umdrehen selbst
  // richtig/falsch, wie bei Mathe.bewerteMalfolgenKarte. Storage.melde-
  // LernkartenErgebnis wirkt sich erst in KUENFTIGEN Sitzungen aus
  // (haeufigere Wiedervorlage ueber baueBewertetesKartendeck), nicht sofort
  // in dieser Sitzung - gleiches Prinzip wie bei den Malfolgen. Zusaetzlich
  // wird nach jeder Karte der Zwischenstand gespeichert (siehe starteLern-
  // karten/aktivitaetFuerThema), damit ein unterbrochener Durchlauf (App zu,
  // Tablet gesperrt) an derselben Stelle weitergeht statt neu anzufangen.
  //
  // In rad_falsch (27.09.2026) tragen die Karten _quellThema/_quellIdx (siehe
  // sammleFalscheRadKarten) - das Ergebnis muss dann an die STATISTIK DES
  // HERKUNFTSTHEMAS gemeldet werden, nicht an eine eigene 'rad_falsch'-
  // Statistik, sonst wuerde die Fortschritts-Uebersicht des Herkunftsthemas
  // nichts von der Wiederholung hier erfahren und die Karte wuerde nie aus
  // rad_falsch verschwinden, egal wie oft Max sie hier richtig markiert.
  function bewerteLernkarte(korrekt) {
    if (!lkUmgedreht) return;
    const karte = lkSession.karten[lkSession.index];
    const zielThema = karte._quellThema || lkSession.thema;
    const zielIdx = karte._quellThema ? karte._quellIdx : karte._idx;
    Storage.meldeLernkartenErgebnis(zielThema, zielIdx, korrekt);
    if (lkSession.thema === TAGESKARTEN_THEMA && !karte._wiederholung) Ferientraining.melde('heimat_lernkarten', korrekt);
    const gained = Storage.addAntwort('heimat', korrekt, 1);
    if (korrekt) { lkSession.richtig++; lkSession.sterne += gained; }
    lkSession.verlauf.push({ frage: textOhneBild(karte.front), ergebnis: korrekt ? 'richtig' : 'falsch' });
    App.updateTopbar();
    // Tageskarten: fuer jede nicht gewusste Karte kommt eine weitere dazu (ein paar
    // Karten spaeter nochmal), wie bei den Quiz-Aufgaben (wiederholeFalsche).
    if (!korrekt && lkSession.thema === TAGESKARTEN_THEMA) {
      lkSession.karten.splice(Math.min(lkSession.karten.length, lkSession.index + 4), 0, Object.assign({}, karte, { _wiederholung: true }));
    }
    lkSession.index++;
    const aktivitaet = aktivitaetFuerThema(lkSession.thema);
    if (lkSession.index >= lkSession.karten.length) {
      Storage.loescheOffeneSession(aktivitaet);
      renderLernkartenErgebnis();
    } else {
      Storage.setOffeneSession(aktivitaet, {
        karten: lkSession.karten, index: lkSession.index,
        richtig: lkSession.richtig, sterne: lkSession.sterne, verlauf: lkSession.verlauf
      });
      renderLernkarte();
    }
  }

  function renderLernkartenErgebnis() {
    if (lkSession.thema === TAGESKARTEN_THEMA) Ferientraining.abschluss('heimat_lernkarten');
    if (!lkSession.bewertung) {
      App.render(`
        <div class="back-row"><span class="back-btn" onclick="Heimatkunde.starteThemenwahl()">${Icons.svg('zurueck')} Zurück</span></div>
        <div class="welcome">Geschafft! 🎉</div>
        <div class="lese-text">Du hast alle Karten zu "${lkSession.titel}" durchgesehen.</div>
        <div class="weiter-row">
          <span class="btn-primary" onclick="Heimatkunde.starteLernkarten('${lkSession.thema}')">Nochmal von vorne</span>
          <span class="btn-primary" style="margin-left:12px;" onclick="Heimatkunde.starteThemenwahl()">Anderes Thema</span>
        </div>
      `);
      return;
    }
    const total = lkSession.karten.length;
    const emoji = lkSession.richtig === total ? '🏆' : lkSession.richtig / total >= 0.7 ? '🎉' : '🙂';
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Heimatkunde.starteThemenwahl()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="result-card">
        <div class="result-emoji">${emoji}</div>
        <div class="result-title">${lkSession.richtig} von ${total} gewusst!</div>
        <div class="result-sterne">Du hast ${lkSession.sterne} ⭐ verdient</div>
        ${lkSession.thema === TAGESKARTEN_THEMA ? Ferientraining.rueckkehrButtonHtml() : ''}
        <div class="btn-primary" onclick="Heimatkunde.starteLernkarten('${lkSession.thema}')">Nochmal üben</div>
        ${lkSession.thema === TAGESKARTEN_THEMA ? '' : `<div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);" onclick="Heimatkunde.renderLernkartenUebersicht('${lkSession.thema}')">Fortschritt ansehen</div>`}
        <div class="btn-primary" style="background:var(--muted);color:var(--ink);" onclick="Heimatkunde.starteThemenwahl()">Anderes Thema</div>
      </div>
    `);
    FernSync.meldeLernsetErledigt(`${lkSession.titel} lernen`, `${lkSession.richtig} von ${total} gewusst`, lkSession.sterne, 'heimat', lkSession.verlauf);
  }

  // ---- Fortschritts-Uebersicht fuer bewertung:true-Themen, Pendant zu
  // Mathe.renderMalfolgenUebersicht: pro Karte ein farbiger Punkt je nachdem,
  // wie oft sie zuletzt in Folge richtig war (gleiche Status-Logik wie
  // malfolgenFaktStatus dort). Rein informativ, keine eigene Logik/Punkte. ----
  function lernkartenStatus(stat) {
    if (!stat) return 'neu';
    return (stat.serie || 0) >= 2 ? 'sicher' : 'uebung';
  }

  function renderLernkartenUebersicht(thema) {
    const info = LERNTHEMEN[thema];
    const karten = info.karten();
    let sicher = 0;
    // rad_falsch hat keine eigene Statistik (siehe sammleFalscheRadKarten) -
    // pro Karte wird stattdessen die Statistik ihres Herkunftsthemas
    // nachgeschlagen (_quellThema/_quellIdx).
    const zeilenHtml = karten.map((karte, i) => {
      const stat = karte._quellThema
        ? Storage.getLernkartenStats(karte._quellThema)[karte._quellIdx]
        : Storage.getLernkartenStats(thema)[i];
      const status = lernkartenStatus(stat);
      if (status === 'sicher') sicher++;
      return `<div class="uebersicht-heimat-zeile">
        <span class="uebersicht-punkt uebersicht-punkt-${status}"></span>
        <span class="uebersicht-heimat-text">${textOhneBild(karte.front)}</span>
      </div>`;
    }).join('');
    const gesamt = karten.length;
    const alleSicher = gesamt > 0 && sicher === gesamt;

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Heimatkunde.starteThemenwahl()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Dein Fortschritt bei "${info.titel}"</div>
      ${alleSicher ? `<div class="uebersicht-banner-fertig">🎉 Du kannst alles bei "${info.titel}" sicher!</div>` : ''}
      <div class="lese-text"><strong>${sicher} von ${gesamt}</strong> Karten sitzen sicher.</div>
      <div class="uebersicht-legende">
        <span><span class="uebersicht-punkt uebersicht-punkt-sicher"></span> sitzt sicher</span>
        <span><span class="uebersicht-punkt uebersicht-punkt-uebung"></span> wird noch geübt</span>
        <span><span class="uebersicht-punkt uebersicht-punkt-neu"></span> noch nie dran gewesen</span>
      </div>
      <div class="uebersicht-liste">${zeilenHtml}</div>
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

  /** Alle Radfahr-Lernthemen mit ihren Karten (ohne das Sammelthema rad_falsch) - fuer den Export in die
   *  Eltern-App (tools/export_lernkarten.js). */
  function lernthemenFuerExport(gruppe) {
    return Object.keys(LERNTHEMEN).filter(k => LERNTHEMEN[k].gruppe === (gruppe || 'rad') && k !== 'rad_falsch')
      .map(k => ({ id: k, titel: LERNTHEMEN[k].titel, karten: LERNTHEMEN[k].karten().map(c => ({ front: c.front, back: c.back })) }));
  }

  return { lernthemenFuerExport, renderMenu, starteVerkehrszeichen, starteQuiz, starteThemenwahl, starteLernkarten, karteUmdrehen, naechsteLernkarte, bewerteLernkarte, renderLernkartenUebersicht, starteTagesLernkarten, stapelText, aktiveStapel, aufbauInfo, TAGESKARTEN_ANZAHL };
})();
