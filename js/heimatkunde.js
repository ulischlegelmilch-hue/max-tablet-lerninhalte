// Heimat- und Sachkunde. Verkehrszeichen lernen (passend zur Fahrradpruefung in
// der 3./4. Klasse) und die Sport-Erwaermung. Grafiken sind die amtlichen StVO-
// Verkehrszeichen (gemeinfrei, von Wikimedia Commons), lokal eingebunden, damit
// die App komplett offline funktioniert.
//
// 04.11.2026 (Uli-Wunsch "freie Hand"): Die komplette home-built "Radfahr-
// ausbildung" (Gruppe 'rad': ~80 Lernkarten in 13 Themen, Tageskarten,
// "Falsche Karten wiederholen") wurde entfernt - Max uebt das jetzt ueber das
// offizielle Portal die-radfahrausbildung.de (QR/Code im Heft); unter HSK gibt
// es dafuer die Kachel "Radfahrausbildung" (zeigeRadfahrPortal): Adresse + QR
// zum Abscannen mit dem Elternhandy, KEIN klickbarer Link (Kiosk/lock-task,
// file://, ein Link wuerde Max aus der App werfen). Mitentfernt:
// die Radfahr-Karten als Quelle fuers Hof-Farm-Abfragelernen (farm-lernen.js),
// der HSK-Aufbau-Verlauf in der Papa-App (fernsync.js) und der Abhoer-Stapel
// "Radfahrausbildung (HSK)" (tools/export_lernkarten.js -> lernkarten.json).
// Geblieben: Verkehrszeichen (Quiz) + Sport-Erwaermung, die sich die
// Karteikarten-Mechanik (bewertung:true) weiterhin teilen.
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
      { icon: 'fahrrad', titel: 'Radfahrausbildung', onclick: 'Heimatkunde.zeigeRadfahrPortal()' }
    ]));
  }

  // Fuer Fortschritts-Uebersicht/Papa-Verlauf: Bilder aus dem Kartentext durch
  // ein Platzhalterwort ersetzen (dort wird nur Text angezeigt).
  function textOhneBild(html) { return html.replace(/<img[^>]*>(<br>)?/g, '(Schild) '); }

  // ===========================================================================
  // Sport: Erwaermung (24.10.2026, Uli-Wunsch): Max soll die Erwaermung fuer den
  // Sportunterricht koennen und sie ANLEITEN koennen - die Uebung erklaeren UND
  // die angesprochenen Muskelpartien (Kindersprache). Eine Karte je Uebung, kurz
  // und einfach fuer ein 9-jaehriges Kind. Fuenf Uebungen (Uli): Kniebeugen,
  // Rumpfkreisen, Hampelmann, Armkreisen, Hueftheben (Krabbenstellung).
  // ===========================================================================
  const LERNKARTEN_SPORT_UEBUNGEN = [
    { front: 'Kniebeugen, 10-mal: Erkläre die Übung und die Muskeln.', back: '<strong>10-mal</strong>.<br>1. Stell dich <strong>schulterbreit</strong> hin, Arme nach vorn.<br>2. Geh mit dem <strong>Po nach hinten unten</strong>, wie auf einen Stuhl.<br>3. Der Rücken bleibt <strong>gerade</strong>.<br>4. Steh wieder auf.<br><br><strong>Muskeln:</strong> die <strong>Oberschenkelmuskeln</strong> und die <strong>Po-Muskeln</strong>.' },
    { front: 'Rumpfkreisen, je 10-mal: Erkläre die Übung und die Muskeln.', back: '<strong>Je 10-mal</strong> rechts und links herum.<br>1. Stell dich <strong>schulterbreit</strong> hin, <strong>Hände an die Hüfte</strong>.<br>2. Kreise mit der Hüfte <strong>große Kreise</strong>.<br>3. Erst <strong>rechts herum</strong>, dann <strong>links herum</strong>.<br><br><strong>Muskeln:</strong> die <strong>Bauchmuskeln</strong> und die <strong>Rückenmuskeln</strong>.' },
    { front: 'Hampelmann, 20-mal: Erkläre die Übung und die Muskeln.', back: '<strong>20-mal</strong>.<br>1. Spring und mach <strong>Beine und Arme gleichzeitig auseinander</strong>.<br>2. Die Arme gehen über den Kopf.<br>3. Spring wieder zurück.<br><br><strong>Muskeln:</strong> die <strong>Beinmuskeln</strong> und die <strong>Schultermuskeln</strong>. Das Herz schlägt schneller.' },
    { front: 'Armkreisen, je 10-mal: Erkläre die Übung und die Muskeln.', back: '<strong>Je 10-mal</strong> vorwärts und rückwärts.<br>1. Stell dich hin und streck die <strong>Arme zur Seite</strong>.<br>2. Kreise mit den Armen, erst <strong>vorwärts</strong>, dann <strong>rückwärts</strong>.<br>3. Zieh die Schultern nicht hoch.<br><br><strong>Muskeln:</strong> die <strong>Schultermuskeln</strong> und die <strong>Nackenmuskeln</strong>.' },
    { front: 'Hüftheben (Krabbenstellung), 12-mal: Erkläre die Übung und die Muskeln.', back: '<strong>12-mal</strong>.<br>1. Setz dich hin, <strong>Füße auf den Boden</strong>, <strong>Hände hinter dir</strong> aufgestützt.<br>2. <strong>Heb den Po an</strong>, bis der Bauch zur Decke zeigt, und setz ihn wieder ab.<br>3. Du gehst dabei nicht.<br><br><strong>Muskeln:</strong> die <strong>Po-Muskeln</strong> und die <strong>Armmuskeln</strong> (hinten am Oberarm).' }
  ];
  const LERNKARTEN_SPORT_ABLAUF = [
    { front: 'Erwärmung (3 Minuten): Welche Übung ist die 1.?', back: '<strong>Kniebeugen</strong>, 10-mal.' },
    { front: 'Erwärmung (3 Minuten): Welche Übung ist die 2.?', back: '<strong>Rumpfkreisen</strong>, je 10-mal rechts und links.' },
    { front: 'Erwärmung (3 Minuten): Welche Übung ist die 3.?', back: '<strong>Hampelmann</strong>, 20-mal.' },
    { front: 'Erwärmung (3 Minuten): Welche Übung ist die 4.?', back: '<strong>Armkreisen</strong>, je 10-mal vorwärts und rückwärts.' },
    { front: 'Erwärmung (3 Minuten): Welche Übung ist die 5.?', back: '<strong>Hüftheben</strong> (Krabbenstellung), 12-mal.' }
  ];

  // karten ist bei allen Themen eine FUNKTION (nicht das Array direkt), der
  // Einheitlichkeit halber.
  //
  // bewertung:true (06.09.2026, Uli-Wunsch): Max markiert selbst richtig/falsch
  // (wie Mathes Malfolgen-Karteikarten), falsche Karten werden dadurch in
  // kuenftigen Sitzungen haeufiger vorgelegt (siehe baueBewertetesKartendeck).
  // geordnet:true: feste Reihenfolge (die Sport-Erwaermung wird so abgearbeitet).
  const LERNTHEMEN = {
    sport_ablauf: { gruppe: 'sport', titel: 'Die Reihenfolge', icon: 'tagesaufgabe', karten: () => LERNKARTEN_SPORT_ABLAUF, bewertung: true, geordnet: true },
    sport_uebungen: { gruppe: 'sport', titel: 'Die Übungen erklären', icon: 'sport', karten: () => LERNKARTEN_SPORT_UEBUNGEN, bewertung: true, geordnet: true },
  };

  // ---- Gewichteter Kartendeck-Aufbau fuer die bewertung:true-Themen, 1:1 vom
  // Prinzip aus Mathe.baueMalfolgenDeck/gewichtFuerStat/mischeOhneNachbar-
  // Wiederholung uebernommen - pro Sitzungsstart wird frisch anhand der
  // bisherigen Statistik gewichtet gemischt. ----
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

  // Liefert die Session-Karten fuer ein bewertung:true-Thema: jede Karte bekommt
  // _idx (ihre feste Position im Original-Array, siehe Storage.meldeLernkarten-
  // Ergebnis); schwache Karten (siehe gewichtFuerLernkartenStat) kommen mehrfach
  // (bis zu 5x) vor.
  function baueBewertetesKartendeck(thema, karten) {
    const stats = Storage.getLernkartenStats(thema);
    const indexDeck = [];
    karten.forEach((karte, i) => {
      const kopien = Math.min(5, Math.max(1, Math.round(gewichtFuerLernkartenStat(stats[i]) / 3)));
      for (let n = 0; n < kopien; n++) indexDeck.push(i);
    });
    // geordnet: feste Reihenfolge (Sport-Erwaermung: so wird sie abgearbeitet)
    if (LERNTHEMEN[thema] && LERNTHEMEN[thema].geordnet) return karten.map((k, i) => Object.assign({ _idx: i }, k));
    return mischeOhneNachbarWiederholung(indexDeck).map(i => Object.assign({ _idx: i }, karten[i]));
  }

  // Themenwahl VOR den Lernkarten - bewusst eigener Menuepunkt, damit Max sich
  // immer nur EIN Themengebiet vornimmt (Uli-Wunsch). Eigener back-row statt
  // App.subMenuHtml, weil dessen Zurueck-Button fix App.gotoHome() aufruft.
  // Merkt sich die zuletzt gewaehlte Themengruppe. Aktuell gibt es nur noch
  // 'sport' (die Gruppen 'rad' und 'lk' wurden entfernt) - GRUPPEN_INFO bleibt
  // trotzdem ein Objekt, falls spaeter eine weitere Themengruppe dazukommt.
  let themenGruppe = 'sport';
  const GRUPPEN_INFO = {
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

  // Reine Lernkarten (Umdrehen per Tap) - KEIN Eintippen. Uli hoert Max die
  // Fakten selbst ab.
  let lkSession = null;
  let lkUmgedreht = false;

  // "heimatkunde-<thema>" als Storage.getOffeneSession-Schluessel - eigener
  // Schluessel pro Thema, damit Themen unabhaengig unterbrochen/fortgesetzt
  // werden koennen (am naechsten Kalendertag wird bewusst neu angefangen,
  // gleiches Prinzip wie bei Mathe.starteMalfolgenKarten).
  function aktivitaetFuerThema(thema) { return 'heimatkunde-' + thema; }

  function starteLernkarten(thema) {
    const info = LERNTHEMEN[thema];
    if (info.bewertung) {
      const offen = Storage.getOffeneSession(aktivitaetFuerThema(thema));
      if (offen && Array.isArray(offen.karten) && offen.index > 0 && offen.index < offen.karten.length) {
        lkSession = {
          thema, titel: info.titel, bewertung: true, karten: offen.karten, index: offen.index,
          richtig: offen.richtig || 0, sterne: offen.sterne || 0, verlauf: offen.verlauf || []
        };
      } else {
        const karten = baueBewertetesKartendeck(thema, info.karten());
        lkSession = { thema, titel: info.titel, bewertung: true, karten, index: 0, richtig: 0, sterne: 0, verlauf: [] };
      }
    } else {
      const karten = shuffle(info.karten());
      lkSession = { thema, titel: info.titel, bewertung: false, karten, index: 0, richtig: 0, sterne: 0, verlauf: [] };
    }
    App.setLastStarter(() => starteLernkarten(thema));
    renderLernkarte();
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
  // richtig/falsch (wie Mathe.bewerteMalfolgenKarte). Storage.meldeLernkarten-
  // Ergebnis wirkt sich erst in KUENFTIGEN Sitzungen aus (haeufigere
  // Wiedervorlage ueber baueBewertetesKartendeck), nicht sofort in dieser
  // Sitzung. Zusaetzlich wird nach jeder Karte der Zwischenstand gespeichert
  // (siehe starteLernkarten/aktivitaetFuerThema), damit ein unterbrochener
  // Durchlauf an derselben Stelle weitergeht statt neu anzufangen.
  function bewerteLernkarte(korrekt) {
    if (!lkUmgedreht) return;
    const karte = lkSession.karten[lkSession.index];
    Storage.meldeLernkartenErgebnis(lkSession.thema, karte._idx, korrekt);
    const gained = Storage.addAntwort('heimat', korrekt, 1);
    if (korrekt) { lkSession.richtig++; lkSession.sterne += gained; }
    lkSession.verlauf.push({ frage: textOhneBild(karte.front), ergebnis: korrekt ? 'richtig' : 'falsch' });
    App.updateTopbar();
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
        <div class="btn-primary" onclick="Heimatkunde.starteLernkarten('${lkSession.thema}')">Nochmal üben</div>
        <div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);" onclick="Heimatkunde.renderLernkartenUebersicht('${lkSession.thema}')">Fortschritt ansehen</div>
        <div class="btn-primary" style="background:var(--muted);color:var(--ink);" onclick="Heimatkunde.starteThemenwahl()">Anderes Thema</div>
      </div>
    `);
    FernSync.meldeLernsetErledigt(`${lkSession.titel} lernen`, `${lkSession.richtig} von ${total} gewusst`, lkSession.sterne, 'heimat', lkSession.verlauf);
  }

  // ---- Fortschritts-Uebersicht fuer bewertung:true-Themen, Pendant zu
  // Mathe.renderMalfolgenUebersicht: pro Karte ein farbiger Punkt je nachdem,
  // wie oft sie zuletzt in Folge richtig war. Rein informativ. ----
  function lernkartenStatus(stat) {
    if (!stat) return 'neu';
    return (stat.serie || 0) >= 2 ? 'sicher' : 'uebung';
  }

  function renderLernkartenUebersicht(thema) {
    const info = LERNTHEMEN[thema];
    const karten = info.karten();
    let sicher = 0;
    const zeilenHtml = karten.map((karte, i) => {
      const stat = Storage.getLernkartenStats(thema)[i];
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

  // "Radfahrausbildung" verweist aufs offizielle Portal der Deutschen
  // Verkehrswacht. Das Tablet laeuft als gepinnter Kiosk (lock-task) und laedt
  // seinen Inhalt aus einer lokalen Datei - ein echter Link wuerde die WebView
  // aus der App werfen, ohne Weg zurueck. Darum KEIN klickbarer Link, sondern
  // Adresse + QR-Code zum Abscannen mit dem Elternhandy (04.11.2026, Uli-Wunsch).
  function zeigeRadfahrPortal() {
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Heimatkunde.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Radfahrausbildung – üben im Internet</div>
      <div class="lese-text">Für die Radfahrausbildung gibt es Übungen, Lernwege und Testbögen im Internet – auf <strong>die-radfahrausbildung.de</strong>.</div>
      <div style="background:#fff;border-radius:16px;padding:18px 18px 14px;max-width:300px;margin:14px auto;text-align:center;">
        <img src="images/qr-radfahrausbildung.svg" alt="QR-Code zu die-radfahrausbildung.de" style="width:220px;height:220px;display:block;margin:0 auto;">
        <div style="margin-top:10px;font-weight:700;color:#1b2733;letter-spacing:.2px;">die-radfahrausbildung.de</div>
      </div>
      <div class="lese-text">👉 Scann den QR-Code mit dem Handy von <strong>Mama oder Papa</strong>. Deinen <strong>Zugangs-Code</strong> findest du vorne in deinem Heft.</div>
    `);
  }

  /** Lernthemen einer Gruppe mit ihren Karten - fuer den Export in die Eltern-App
   *  (tools/export_lernkarten.js). Aktuell nur noch 'sport'. */
  function lernthemenFuerExport(gruppe) {
    return Object.keys(LERNTHEMEN).filter(k => LERNTHEMEN[k].gruppe === (gruppe || 'sport'))
      .map(k => ({ id: k, titel: LERNTHEMEN[k].titel, geordnet: !!LERNTHEMEN[k].geordnet, karten: LERNTHEMEN[k].karten().map(c => ({ front: c.front, back: c.back })) }));
  }

  return { lernthemenFuerExport, renderMenu, starteVerkehrszeichen, starteQuiz, zeigeRadfahrPortal, starteThemenwahl, starteLernkarten, karteUmdrehen, naechsteLernkarte, bewerteLernkarte, renderLernkartenUebersicht };
})();
