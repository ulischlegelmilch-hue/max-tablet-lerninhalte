const Mathe = (function () {
  function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rnd(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function ggt(a, b) { return b === 0 ? a : ggt(b, a % b); }

  // Verhindert, dass innerhalb kurzer Distanz dieselbe Variante/Vorlage
  // nochmal drankommt (z.B. immer wieder dasselbe Diagramm-Thema oder dieselbe
  // Sachaufgaben-Geschichte in einem 20er-Set) - Uli-Feedback 13.08.2026:
  // "er hat jetzt in einem Set vielfach diese Aufgabe [...] gehabt". Reines
  // unabhaengiges Wuerfeln liess das zu oft passieren. Merkt sich pro "topf"
  // (Schluessel) die zuletzt verwendeten Indizes ueber den Modul-Scope hinweg
  // (bleibt bis zum naechsten Seiten-/App-Neuladen bestehen - ausreichend, das
  // muss keine Session ueberdauern) und wuerfelt bei einem Treffer neu.
  const zuletztVerwendet = {};
  function waehleOhneWiederholung(topf, anzahlOptionen, merkTiefe) {
    if (!zuletztVerwendet[topf]) zuletztVerwendet[topf] = [];
    const kuerzlich = zuletztVerwendet[topf];
    let idx, versuche = 0;
    do {
      idx = rnd(0, anzahlOptionen - 1);
      versuche++;
    } while (kuerzlich.includes(idx) && versuche < 20 && anzahlOptionen > merkTiefe);
    kuerzlich.push(idx);
    if (kuerzlich.length > merkTiefe) kuerzlich.shift();
    return idx;
  }

  function renderMenu() {
    App.render(App.subMenuHtml('Mathe', [
      { icon: 'tagesaufgabe', titel: 'Gemischte Aufgaben', onclick: 'Mathe.starteTagesaufgabe()' },
      { icon: 'malfolgen', titel: 'Malfolgen üben', onclick: 'Mathe.starteMalfolgenKarten()' },
      { icon: 'taktik', titel: 'Malfolgen-Fortschritt', onclick: 'Mathe.renderMalfolgenUebersicht()' },
      { icon: 'einstellungen', titel: 'Reihen wählen', onclick: 'Mathe.renderReihenwahl()' }
    ]));
  }

  // Frei zugaenglich (kein Eltern-PIN) - Max soll selbst entscheiden koennen,
  // welche 1x1-Reihen er bei "Malfolgen üben" trainiert (z.B. klein anfangen
  // mit nur der 2er- und 5er-Reihe, spaeter erweitern).
  function renderReihenwahl(bestaetigt) {
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Mathe.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Welche Reihen willst du üben?</div>
      <div class="lese-text">Wähl die 1×1-Reihen aus, die bei "Malfolgen üben" drankommen sollen.</div>
      <div class="regel-karte">
        <div class="reihen-grid">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `
            <label class="reihen-check">
              <input type="checkbox" class="reihen-checkbox" value="${n}"${Storage.getMalfolgenReihen().includes(n) ? ' checked' : ''}>
              ${n}er-Reihe
            </label>
          `).join('')}
        </div>
        <div id="reihen-hinweis" class="reihen-hinweis${bestaetigt ? ' reihen-hinweis-erfolg' : ''}">${bestaetigt ? '✔ Gespeichert!' : ''}</div>
        <div class="btn-primary" onclick="Mathe.speichereMalfolgenReihen()">Speichern</div>
      </div>
    `);
  }

  function speichereMalfolgenReihen() {
    const boxen = document.querySelectorAll('.reihen-checkbox:checked');
    const reihen = Array.from(boxen).map(b => parseInt(b.value, 10));
    if (reihen.length === 0) {
      document.getElementById('reihen-hinweis').textContent = 'Bitte mindestens eine Reihe auswählen.';
      return;
    }
    Storage.setMalfolgenReihen(reihen);
    renderReihenwahl(true);
  }

  // ============================================================
  // Aufgaben-Bereiche fuer die Tagesaufgabe - Stand 10.08.2026,
  // ausgerichtet an Max' tatsaechlichen Schulaufgaben (siehe von Uli
  // geschickte Fotos: schriftliches Addieren/Subtrahieren mit/ohne
  // Uebertrag, Rechenketten, fehlende Ziffern, Fehlersuche, Sach-
  // aufgaben, Diagramme/Tabellen lesen, Teiler & Vielfache, Malfolgen/
  // Geteiltfolgen mit 10/100/Zehnerzahlen, Vergleiche, Zahlzerlegung).
  // Jeder Generator erzeugt bei JEDEM Aufruf neue Zufallszahlen, daher
  // liefert "Nochmal üben" automatisch immer wieder frische Aufgaben.
  // Wenn Uli neue Foto-Beispiele schickt, werden die Generatoren hier
  // ersetzt statt die alten zu behalten.
  //
  // JEDER Generator liefert zusaetzlich ein Feld "hilfe" (HTML-String):
  // eine vorgerechnete, ANDERE Beispielaufgabe desselben Typs. Der
  // Hilfe-Button in app.js (verarbeiteQuizAntwort/zeigeHilfe) erscheint
  // nur beim 2. Versuch nach einer falschen Antwort und kostet die
  // Punkte fuer diese Aufgabe. Bei neuen Aufgabentypen IMMER eine
  // passende hilfe mit einpflegen (siehe erklaerungAddition/-Subtraktion
  // als wiederverwendbare Bausteine fuer schriftliches Rechnen).
  // ============================================================

  // Zerlegt eine 3-stellige Zahl in [H, Z, E]-Ziffern.
  function ziffern3(n) { return String(n).padStart(3, '0').split('').map(Number); }

  // Baut eine Ziffernfolge fester Breite fuer die Spaltenanzeige - fuehrende
  // Stellen ohne Ziffer bleiben leer (kein "0" davor), damit z.B. eine
  // 2-stellige Zahl neben einer 3-stelligen sauber rechtsbuendig steht.
  function spalteZiffern(n, breite) {
    const s = String(n);
    return Array(breite - s.length).fill('').concat(s.split(''));
  }

  // Gemeinsamer Rahmen fuer beide Rechenarten: Ziffern rechtsbuendig in
  // Spalten, ein Strich, das Ergebnis darunter - statt einer Satz-Erklaerung
  // Stelle fuer Stelle (dieser Text-Stil war fuer Max verwirrend, weil er
  // nicht dem gewohnten Rechenweg auf Papier entspricht). zeilenHtml enthaelt
  // die beiden Operanden-Zeilen (inkl. evtl. Merk-Zahlen) und kommt aus
  // htmlAdditionsZeilen/htmlSubtraktionsZeilen weiter unten.
  function htmlSpaltenRahmen(breite, zeilenHtml, ergebnis) {
    const spaltenStil = `grid-template-columns: 26px repeat(${breite}, 1fr);`;
    const zelle = (inhalt, klasse) => `<div class="${klasse}">${inhalt}</div>`;
    const zeile = (zeichen, ziffern, klasse) =>
      `<div class="sr-zeile" style="${spaltenStil}">${zelle(zeichen, 'sr-zeichen')}` +
      `${ziffern.map(d => zelle(d, klasse)).join('')}</div>`;
    return '<div class="sr-rechnung">' + zeilenHtml +
      `<div class="sr-strich" style="margin-left:26px;"></div>` +
      zeile('', spalteZiffern(ergebnis, breite), 'sr-ziffer sr-ergebnis') +
      '</div>';
  }

  // Uebertrag bei der Addition: entsteht in einer Spalte, wird bei BEIDEN
  // Ziffern der naechsten (linken) Spalte addiert - deshalb eine eigene
  // kleine Zeile darueber, in der Spalte, in der addiert wird.
  // digitsA/digitsB (nullgepolstert) dienen nur der Rechnung, anzeigeA/
  // anzeigeB (leer statt "0" bei fuehrenden Stellen) sind fuer die Darstellung.
  function htmlAdditionsZeilen(digitsA, digitsB, anzeigeA, anzeigeB, breite, spaltenStil) {
    const hinweisZeile = Array(breite).fill('');
    let uebertrag = 0;
    for (let i = breite - 1; i >= 0; i--) {
      const s = digitsA[i] + digitsB[i] + uebertrag;
      uebertrag = s >= 10 ? 1 : 0;
      if (uebertrag && i > 0) hinweisZeile[i - 1] = '+1';
    }
    const zelle = (inhalt, klasse) => `<div class="${klasse}">${inhalt}</div>`;
    const zeile = (zeichen, ziffern, klasse) =>
      `<div class="sr-zeile" style="${spaltenStil}">${zelle(zeichen, 'sr-zeichen')}` +
      `${ziffern.map(d => zelle(d, klasse)).join('')}</div>`;
    let html = '';
    if (hinweisZeile.some(h => h)) html += zeile('', hinweisZeile, 'sr-hinweis');
    html += zeile('', anzeigeA, 'sr-ziffer');
    html += zeile('+', anzeigeB, 'sr-ziffer');
    return html;
  }

  // Subtraktion nach dem Ergaenzungsverfahren (so rechnet Max im Heft): pro
  // Spalte wird ermittelt, was zur unteren Ziffer dazugezaehlt werden muss,
  // um auf die obere zu kommen. Reicht das nicht ohne den naechsten Zehner,
  // wird eine Eins gemerkt - die kommt DIREKT NEBEN die untere Ziffer der
  // naechsten (naechst-linken) Spalte (nicht in eine eigene Zeile darueber,
  // und nicht als Abzug von der oberen Zahl wie beim Entbuendelungsverfahren).
  // Beispiel 437 − 238: von 8 bis 7 sind 9, merke 1 → die 1 kommt neben die
  // untere 3 (naechste Spalte); von 4 (3+1) bis 3 sind 9, merke 1 → die 1
  // kommt neben die 2 (naechste Spalte).
  function htmlSubtraktionsZeilen(digitsA, digitsB, anzeigeA, anzeigeB, breite, spaltenStil) {
    const bPlusEins = Array(breite).fill(false);
    let merkeEins = 0;
    for (let i = breite - 1; i >= 0; i--) {
      if (merkeEins) bPlusEins[i] = true;
      const bEffektiv = digitsB[i] + merkeEins;
      merkeEins = digitsA[i] < bEffektiv ? 1 : 0;
    }
    const zelle = (inhalt, klasse) => `<div class="${klasse}">${inhalt}</div>`;
    const aZellen = anzeigeA.map(d => zelle(d, 'sr-ziffer')).join('');
    const bZellen = anzeigeB.map((d, i) => {
      // Falls die Merk-Eins in eine Spalte faellt, in der b (Anzeige) leer
      // waere (fuehrende Stelle): trotzdem "0" zeigen, sonst haengt das "+1"
      // scheinbar in der Luft.
      const anzeige = bPlusEins[i] && d === '' ? '0' : d;
      return `<div class="sr-ziffer">${anzeige}${bPlusEins[i] ? '<span class="sr-carry-inline">+1</span>' : ''}</div>`;
    }).join('');
    return `<div class="sr-zeile" style="${spaltenStil}">${zelle('', 'sr-zeichen')}${aZellen}</div>` +
      `<div class="sr-zeile" style="${spaltenStil}">${zelle('−', 'sr-zeichen')}${bZellen}</div>`;
  }

  function htmlSpaltenRechnung(a, b, operator, ergebnis) {
    const breite = Math.max(String(a).length, String(b).length, String(ergebnis).length);
    const digitsA = String(a).padStart(breite, '0').split('').map(Number);
    const digitsB = String(b).padStart(breite, '0').split('').map(Number);
    const anzeigeA = spalteZiffern(a, breite);
    const anzeigeB = spalteZiffern(b, breite);
    const spaltenStil = `grid-template-columns: 26px repeat(${breite}, 1fr);`;
    const zeilenHtml = operator === '+'
      ? htmlAdditionsZeilen(digitsA, digitsB, anzeigeA, anzeigeB, breite, spaltenStil)
      : htmlSubtraktionsZeilen(digitsA, digitsB, anzeigeA, anzeigeB, breite, spaltenStil);
    return htmlSpaltenRahmen(breite, zeilenHtml, ergebnis);
  }

  // Schritt-fuer-Schritt-Beispiel einer schriftlichen Addition (mit Uebertrag),
  // dargestellt genau so, wie es untereinander gerechnet wird.
  function erklaerungAddition(a, b) {
    const summe = a + b;
    return `<strong>Beispiel:</strong> ${a} + ${b} = ?` +
      htmlSpaltenRechnung(a, b, '+', summe) +
      `<strong>Ergebnis: ${summe}</strong>`;
  }

  // Schritt-fuer-Schritt-Beispiel einer schriftlichen Subtraktion nach dem
  // Ergaenzungsverfahren, dargestellt genau so, wie es untereinander gerechnet wird.
  function erklaerungSubtraktion(a, b) {
    const differenz = a - b;
    return `<strong>Beispiel:</strong> ${a} − ${b} = ?` +
      htmlSpaltenRechnung(a, b, '−', differenz) +
      `<strong>Ergebnis: ${differenz}</strong>`;
  }

  // ---- Schriftlich Addieren/Subtrahieren (3-stellig) ----
  // Die Aufgabe selbst wird als normale Fliesstext-Frage gestellt ("437 + 238
  // = ?"), NICHT im Spalten-Layout - die Spaltenansicht (untereinander wie im
  // Heft) gibt es bewusst nur in der Hilfe (siehe erklaerungAddition/
  // erklaerungSubtraktion), auf Ulis ausdruecklichen Wunsch (12.08.2026: eine
  // fruehere Version zeigte die Frage selbst schon in Spalten, das sollte
  // wieder normale Aufgabenanzeige werden).
  function genAddSubFrage() {
    const plus = Math.random() < 0.5;
    if (plus) {
      const a = rnd(100, 600), b = rnd(100, 999 - a);
      const a2 = rnd(100, 600), b2 = rnd(100, 999 - a2);
      return { typ: 'numeric', frage: `${a} + ${b} = ?`, antwort: a + b, hilfe: erklaerungAddition(a2, b2) };
    }
    const a = rnd(200, 950), b = rnd(100, a - 10);
    const a2 = rnd(200, 950), b2 = rnd(100, a2 - 10);
    return { typ: 'numeric', frage: `${a} − ${b} = ?`, antwort: a - b, hilfe: erklaerungSubtraktion(a2, b2) };
  }

  // Erzeugt ein Zahlenpaar OHNE Uebertrag: jede Ziffer des 2. Werts <= der des 1.
  function beispielOhneUebertrag() {
    const h1 = rnd(2, 9), z1 = rnd(0, 9), e1 = rnd(0, 9);
    const h2 = rnd(1, h1), z2 = rnd(0, z1), e2 = rnd(0, e1);
    return { a: h1 * 100 + z1 * 10 + e1, b: h2 * 100 + z2 * 10 + e2 };
  }

  function brauchtUebertrag(a, b) {
    const [ah, az, ae] = ziffern3(a);
    const [bh, bz, be] = ziffern3(b);
    return ae < be || az < bz || ah < bh;
  }

  // Erzeugt ein Zahlenpaar MIT Uebertrag (mind. eine Stelle muss geliehen werden).
  function beispielMitUebertrag() {
    let a, b;
    do {
      a = rnd(200, 950);
      b = rnd(100, a - 10);
    } while (!brauchtUebertrag(a, b));
    return { a, b };
  }

  function genSubtraktionOhneUebertrag() {
    const { a, b } = beispielOhneUebertrag();
    const bsp = beispielOhneUebertrag();
    return {
      typ: 'numeric',
      frage: `${a} − ${b} = ?<br><span class="aufgaben-hinweis">(ohne Übertrag)</span>`,
      antwort: a - b,
      hilfe: erklaerungSubtraktion(bsp.a, bsp.b)
    };
  }

  function genSubtraktionMitUebertrag() {
    const { a, b } = beispielMitUebertrag();
    const bsp = beispielMitUebertrag();
    return {
      typ: 'numeric',
      frage: `${a} − ${b} = ?<br><span class="aufgaben-hinweis">(mit Übertrag)</span>`,
      antwort: a - b,
      hilfe: erklaerungSubtraktion(bsp.a, bsp.b)
    };
  }

  function genFehlendeZifferAddition() {
    const a = rnd(100, 700);
    const b = rnd(100, 899 - a);
    const summe = a + b;
    const bZiffern = ziffern3(b).map(String);
    const pos = rnd(0, 2);
    const versteckt = bZiffern[pos];
    bZiffern[pos] = '▢';
    const a2 = rnd(100, 700), b2 = rnd(100, 899 - a2);
    return {
      typ: 'numeric',
      frage: `${a} + ${bZiffern.join('')} = ${summe}.<br>Welche Ziffer fehlt?`,
      antwort: parseInt(versteckt, 10),
      hilfe: `${erklaerungAddition(a2, b2)}<br>So rechnest du Stelle für Stelle - auch wenn eine Ziffer versteckt ist, findest du sie, indem du die anderen Stellen ganz normal ausrechnest.`
    };
  }

  function genFehlendeZifferSubtraktion() {
    const a = rnd(300, 899);
    const b = rnd(100, a - 10);
    const differenz = a - b;
    const bZiffern = ziffern3(b).map(String);
    const pos = rnd(0, 2);
    const versteckt = bZiffern[pos];
    bZiffern[pos] = '▢';
    const a2 = rnd(300, 899), b2 = rnd(100, a2 - 10);
    return {
      typ: 'numeric',
      frage: `${a} − ${bZiffern.join('')} = ${differenz}.<br>Welche Ziffer fehlt?`,
      antwort: parseInt(versteckt, 10),
      hilfe: `${erklaerungSubtraktion(a2, b2)}<br>So rechnest du Stelle für Stelle - auch wenn eine Ziffer versteckt ist, findest du sie, indem du die anderen Stellen ganz normal ausrechnest.`
    };
  }

  function genRechenketteFrage() {
    const start = rnd(100, 400);
    let wert = start;
    const schritte = [];
    const anzahlSchritte = rnd(3, 4);
    for (let i = 0; i < anzahlSchritte; i++) {
      // Bei zu wenig Rest zwingend addieren, sonst koennte das Ergebnis negativ werden.
      const plus = wert <= 30 ? true : Math.random() < 0.5;
      if (plus) {
        const delta = rnd(50, 250);
        wert += delta;
        schritte.push(`+ ${delta}`);
      } else {
        const delta = rnd(10, Math.min(250, wert - 20));
        wert -= delta;
        schritte.push(`− ${delta}`);
      }
    }
    return { typ: 'numeric', frage: `${start} ${schritte.join(' ')} = ?`, antwort: wert, hilfe: hilfeRechenkette() };
  }

  function hilfeRechenkette() {
    const s0 = rnd(50, 200);
    const d1 = rnd(20, 100), d2 = rnd(10, Math.max(10, s0 + d1 - 30));
    const s1 = s0 + d1;
    const s2 = s1 - d2;
    return `<strong>Beispiel:</strong> ${s0} + ${d1} − ${d2} = ?<br>` +
      `Rechne Schritt für Schritt von links nach rechts:<br>` +
      `${s0} + ${d1} = ${s1}<br>${s1} − ${d2} = ${s2}<br><strong>Ergebnis: ${s2}</strong>`;
  }

  function genStimmtDasFrage() {
    const plus = Math.random() < 0.5;
    const a = rnd(200, 700);
    const b = plus ? rnd(100, 999 - a) : rnd(100, a - 10);
    const echtesErgebnis = plus ? a + b : a - b;
    const stimmt = Math.random() < 0.5;
    let angezeigt = echtesErgebnis;
    if (!stimmt) {
      const abweichung = rnd(1, 9) * (Math.random() < 0.5 ? 10 : 1);
      angezeigt = echtesErgebnis + (Math.random() < 0.5 ? abweichung : -abweichung);
    }
    const zeichen = plus ? '+' : '−';
    const a2 = rnd(200, 700), b2 = plus ? rnd(100, 999 - a2) : rnd(100, a2 - 10);
    const erklaerung2 = plus ? erklaerungAddition(a2, b2) : erklaerungSubtraktion(a2, b2);
    return {
      typ: 'mc',
      frage: `Stimmt diese Rechnung?<br>${a} ${zeichen} ${b} = ${angezeigt}`,
      optionen: ['Ja, stimmt', 'Nein, falsch'],
      richtigIndex: stimmt ? 0 : 1,
      hilfe: `Rechne die Aufgabe selbst nach und vergleiche mit dem Ergebnis:<br>${erklaerung2}<br>Stimmt dein eigenes Ergebnis nicht mit dem in der Aufgabe überein, ist die Rechnung falsch.`
    };
  }

  // ---- Sachaufgaben zu Subtraktion (Minuend/Subtrahend/Differenz) ----
  // Die ersten drei Vorlagen ueben bewusst die Fach-Vokabeln Minuend/Subtrahend/
  // Differenz (aus Max' tatsaechlichen Schulaufgaben, siehe Foto-Beispiele) -
  // die weiteren sind echte kleine Geschichten mit wechselndem Kontext, damit
  // sich nicht nur die Zahlen, sondern auch der TEXT von Aufgabe zu Aufgabe
  // unterscheidet (frueher wiederholten sich effektiv nur 3 immer gleiche
  // Satzmuster mit anderen Zahlen).
  const sachaufgabenSubtraktion = [
    () => { const a = rnd(400, 980), b = rnd(100, a - 20);
      return `Subtrahiere ${b} von ${a}.`; },
    () => { const a = rnd(400, 980), b = rnd(100, a - 20);
      return `Der Minuend heißt ${a}, der Subtrahend ${b}. Berechne die Differenz.`; },
    () => { const a = rnd(400, 980), b = rnd(100, a - 20);
      return `Berechne die Differenz von ${a} und ${b}.`; },
    () => { const a = rnd(20, 32), b = rnd(3, 15);
      return `In Max' Klasse sind ${a} Schüler. ${b} von ihnen sind heute krank. Wie viele Schüler sind da?`; },
    () => { const a = rnd(30, 90), b = rnd(5, 25);
      return `Auf dem Schulhof spielen ${a} Kinder. ${b} gehen zurück ins Klassenzimmer. Wie viele Kinder spielen noch auf dem Schulhof?`; },
    () => { const a = rnd(200, 500), b = rnd(30, 150);
      return `Ein Zug hat ${a} Plätze. ${b} davon sind schon besetzt. Wie viele Plätze sind noch frei?`; },
    () => { const a = rnd(40, 200), b = rnd(5, 30);
      return `Im Parkhaus stehen ${a} Autos. ${b} Autos fahren weg. Wie viele Autos stehen noch im Parkhaus?`; },
    () => { const a = rnd(30, 90), b = rnd(4, 20);
      return `Ein Bauer hat ${a} Hühner. Er verkauft ${b} davon auf dem Markt. Wie viele Hühner hat er jetzt noch?`; },
    () => { const a = rnd(150, 600), b = rnd(20, 90);
      return `In der Schulbücherei gibt es ${a} Bücher. ${b} davon sind gerade ausgeliehen. Wie viele Bücher stehen noch im Regal?`; },
    () => { const a = rnd(25, 80), b = rnd(5, 18);
      return `${a} Vögel sitzen auf einem Baum. ${b} von ihnen fliegen weg. Wie viele Vögel sitzen noch auf dem Baum?`; },
    () => { const a = rnd(15, 30), b = rnd(2, 12);
      return `Bei der Klassenfahrt sind ${a} Kinder dabei. ${b} davon fahren mit dem ersten Bus, der Rest mit dem zweiten. Wie viele Kinder sind im zweiten Bus?`; }
  ];

  function genSachaufgabeSubtraktion() {
    const vorlageIdx = waehleOhneWiederholung('sachaufgabe-subtraktion-vorlage', sachaufgabenSubtraktion.length, 5);
    const vorlage = sachaufgabenSubtraktion[vorlageIdx]();
    const zahlen = vorlage.match(/\d+/g).map(Number);
    const a = Math.max(zahlen[0], zahlen[1]);
    const b = Math.min(zahlen[0], zahlen[1]);
    const a2 = rnd(400, 980), b2 = rnd(100, a2 - 20);
    return {
      typ: 'numeric',
      frage: vorlage,
      antwort: a - b,
      hilfe: `<strong>Wörter:</strong> Minuend = die Zahl, von der abgezogen wird. Subtrahend = die Zahl, die abgezogen wird. Differenz = das Ergebnis.<br>` +
        `"Subtrahiere ${b2} von ${a2}" heißt: ${a2} − ${b2}.<br>${erklaerungSubtraktion(a2, b2)}`
    };
  }

  // ---- Einkaufen: mehrere Preise zusammenzählen ----
  const einkaufsArtikel = ['ein Kleid', 'eine Hose', 'ein Paar Schuhe', 'ein Buch', 'ein Ball', 'eine Jacke', 'eine Mütze', 'ein Rucksack'];

  function genEinkaufSumme() {
    const anzahl = rnd(2, 3);
    const gewaehlt = shuffle(einkaufsArtikel.slice()).slice(0, anzahl);
    const preise = gewaehlt.map(() => rnd(15, 130));
    const teile = gewaehlt.map((art, i) => `${art} kostet ${preise[i]} €`);
    const summe = preise.reduce((s, p) => s + p, 0);
    const p1 = rnd(15, 130), p2 = rnd(15, 130);
    return {
      typ: 'numeric',
      frage: `${teile.join(', ')}. Wie viel bezahlst du insgesamt?`,
      antwort: summe,
      hilfe: `<strong>Beispiel:</strong> ein Buch kostet ${p1} €, ein Ball kostet ${p2} €. Was bezahlst du insgesamt?<br>` +
        `Addiere einfach alle Preise: ${erklaerungAddition(p1, p2)}`
    };
  }

  // ---- 10er & 100er: ×10/×100/:10/:100 und Zehnerzahlen ----
  function genZehnHundertFrage() {
    const typ = rnd(1, 4);
    if (typ === 1) {
      const a = rnd(2, 99);
      return { typ: 'numeric', frage: `${a} · 10 = ?`, antwort: a * 10, hilfe: hilfeZehnHundert(1) };
    }
    if (typ === 2) {
      const a = rnd(2, 9);
      return { typ: 'numeric', frage: `${a} · 100 = ?`, antwort: a * 100, hilfe: hilfeZehnHundert(2) };
    }
    if (typ === 3) {
      const erg = rnd(2, 99);
      return { typ: 'numeric', frage: `${erg * 10} : 10 = ?`, antwort: erg, hilfe: hilfeZehnHundert(3) };
    }
    const erg = rnd(2, 9);
    return { typ: 'numeric', frage: `${erg * 100} : 100 = ?`, antwort: erg, hilfe: hilfeZehnHundert(4) };
  }

  function hilfeZehnHundert(typ) {
    if (typ === 1) { const a = rnd(2, 99); return `<strong>Beispiel:</strong> ${a} · 10 = ?<br>Beim Malnehmen mit 10 hängst du einfach eine 0 an die Zahl an.<br><strong>Ergebnis: ${a * 10}</strong>`; }
    if (typ === 2) { const a = rnd(2, 9); return `<strong>Beispiel:</strong> ${a} · 100 = ?<br>Beim Malnehmen mit 100 hängst du zwei Nullen an die Zahl an.<br><strong>Ergebnis: ${a * 100}</strong>`; }
    if (typ === 3) { const erg = rnd(2, 99); return `<strong>Beispiel:</strong> ${erg * 10} : 10 = ?<br>Beim Teilen durch 10 streichst du eine 0 am Ende der Zahl.<br><strong>Ergebnis: ${erg}</strong>`; }
    const erg = rnd(2, 9); return `<strong>Beispiel:</strong> ${erg * 100} : 100 = ?<br>Beim Teilen durch 100 streichst du zwei Nullen am Ende der Zahl.<br><strong>Ergebnis: ${erg}</strong>`;
  }

  function genZehnerzahlenFrage() {
    if (Math.random() < 0.5) {
      const a = rnd(2, 9), b = rnd(2, 9) * 10;
      return { typ: 'numeric', frage: `${a} · ${b} = ?`, antwort: a * b, hilfe: hilfeZehnerzahlenMal() };
    }
    const b = rnd(2, 9) * 10, erg = rnd(2, 9);
    return { typ: 'numeric', frage: `${b * erg} : ${b} = ?`, antwort: erg, hilfe: hilfeZehnerzahlenGeteilt() };
  }

  function hilfeZehnerzahlenMal() {
    const a = rnd(2, 9), zehnerFaktor = rnd(2, 9);
    const b = zehnerFaktor * 10;
    return `<strong>Beispiel:</strong> ${a} · ${b} = ?<br>Rechne erst ohne die 0: ${a} · ${zehnerFaktor} = ${a * zehnerFaktor}<br>Dann hänge die 0 wieder an: ${a * zehnerFaktor}0<br><strong>Ergebnis: ${a * b}</strong>`;
  }

  function hilfeZehnerzahlenGeteilt() {
    const zehnerFaktor = rnd(2, 9), erg = rnd(2, 9);
    const b = zehnerFaktor * 10;
    return `<strong>Beispiel:</strong> ${b * erg} : ${b} = ?<br>Streiche bei beiden Zahlen eine 0: ${zehnerFaktor * erg} : ${zehnerFaktor} = ${erg}<br><strong>Ergebnis: ${erg}</strong>`;
  }

  // ---- Aufgabenfamilien: aus einer bekannten Malaufgabe (z. B. 60 · 9 = 540)
  // eine der drei verwandten Aufgaben ableiten (Tauschaufgabe oder Umkehraufgabe) ----
  function genAufgabenfamilieFrage() {
    const a = rnd(2, 9), b = rnd(2, 9) * 10, produkt = a * b;
    const variante = rnd(1, 3);
    const a2 = rnd(2, 9), b2 = rnd(2, 9) * 10, produkt2 = a2 * b2;
    const hilfe = `<strong>Beispiel:</strong> ${a2} · ${b2} = ${produkt2}.<br>Daraus lassen sich alle diese Aufgaben ableiten:<br>` +
      `${a2} · ${b2} = ${produkt2}<br>${b2} · ${a2} = ${produkt2} (Tauschaufgabe)<br>` +
      `${produkt2} : ${a2} = ${b2} (Umkehraufgabe)<br>${produkt2} : ${b2} = ${a2} (Umkehraufgabe)`;
    if (variante === 1) {
      return { typ: 'numeric', frage: `${a} · ${b} = ${produkt}.<br>Wie lautet die Tauschaufgabe? ${b} · ${a} = ?`, antwort: produkt, hilfe };
    }
    if (variante === 2) {
      return { typ: 'numeric', frage: `${a} · ${b} = ${produkt}.<br>Wie lautet die Umkehraufgabe? ${produkt} : ${a} = ?`, antwort: b, hilfe };
    }
    return { typ: 'numeric', frage: `${a} · ${b} = ${produkt}.<br>Wie lautet die Umkehraufgabe? ${produkt} : ${b} = ?`, antwort: a, hilfe };
  }

  // Vergleiche zwei Rechnungen mit <, = oder > - es gibt ZWEI Varianten
  // (rechts eine fertige Zahl ODER rechts nochmal eine Rechnung), die
  // unterschiedlich viel Rechenarbeit brauchen. Die Hilfe muss zur jeweils
  // GESTELLTEN Variante passen: steht rechts schon eine Zahl, muss (und darf)
  // nur die linke Seite ausgerechnet werden - eine Hilfe, die trotzdem zeigt,
  // wie man "beide Seiten" ausrechnet, waere fuer genau diese Variante falsch
  // bzw. verwirrend (zeigt mehr Arbeit, als die Aufgabe verlangt).
  function genVergleichRechnungFrage() {
    const a = rnd(2, 9), b = rnd(2, 9) * 10;
    const links = a * b;
    const zahlRechts = Math.random() < 0.4;
    let rechts, rechtsText, hilfe;
    if (zahlRechts) {
      // rechte Seite: bloße Zahl, manchmal absichtlich daneben
      rechts = links + (Math.random() < 0.4 ? 0 : (rnd(1, 5) * 10 * (Math.random() < 0.5 ? 1 : -1)));
      rechtsText = `${rechts}`;
      hilfe = hilfeVergleichMitZahl();
    } else {
      const c = rnd(2, 9), d = rnd(2, 9) * 10;
      rechts = c * d;
      rechtsText = `${c} · ${d}`;
      hilfe = hilfeVergleichMitRechnung();
    }
    const zeichen = links < rechts ? '<' : links > rechts ? '>' : '=';
    return {
      typ: 'mc',
      frage: `${a} · ${b} ___ ${rechtsText}`,
      optionen: ['<', '=', '>'],
      richtigIndex: ['<', '=', '>'].indexOf(zeichen),
      hilfe
    };
  }

  // Rechts steht schon eine fertige Zahl - nur die linke Seite muss gerechnet werden.
  function hilfeVergleichMitZahl() {
    const a = rnd(2, 9), b = rnd(2, 9) * 10;
    const links = a * b;
    const rechts = links + (Math.random() < 0.4 ? 0 : (rnd(1, 5) * 10 * (Math.random() < 0.5 ? 1 : -1)));
    const zeichen = links < rechts ? '<' : links > rechts ? '>' : '=';
    return `<strong>Beispiel:</strong> ${a} · ${b} ___ ${rechts}<br>` +
      `Rechts steht schon eine fertige Zahl - du musst nur die linke Seite ausrechnen: ${a} · ${b} = ${links}<br>` +
      `Jetzt vergleiche direkt mit der Zahl rechts: ${links} ${zeichen} ${rechts}<br><strong>Richtiges Zeichen: ${zeichen}</strong>`;
  }

  // Rechts steht nochmal eine Rechnung - hier muessen wirklich BEIDE Seiten
  // ausgerechnet werden, bevor man vergleichen kann.
  function hilfeVergleichMitRechnung() {
    const a = rnd(2, 9), b = rnd(2, 9) * 10, c = rnd(2, 9), d = rnd(2, 9) * 10;
    const links = a * b, rechts = c * d;
    const zeichen = links < rechts ? '<' : links > rechts ? '>' : '=';
    return `<strong>Beispiel:</strong> ${a} · ${b} ___ ${c} · ${d}<br>Hier stehen auf beiden Seiten Rechnungen - du musst BEIDE ausrechnen: ${a} · ${b} = ${links}, ${c} · ${d} = ${rechts}<br>Jetzt vergleiche die Zahlen: ${links} ${zeichen} ${rechts}<br><strong>Richtiges Zeichen: ${zeichen}</strong>`;
  }

  // Zahl in ein Produkt mit einer Zehnerzahl zerlegen: 420 = ▢ · 60
  function genZahlZerlegenFrage() {
    const faktorKlein = rnd(2, 9), faktorZehn = rnd(2, 9) * 10;
    const produkt = faktorKlein * faktorZehn;
    return {
      typ: 'numeric',
      frage: `${produkt} = ▢ · ${faktorZehn}.<br>Welche Zahl fehlt?`,
      antwort: faktorKlein,
      hilfe: hilfeZahlZerlegen()
    };
  }

  function hilfeZahlZerlegen() {
    const faktorKlein = rnd(2, 9), faktorZehn = rnd(2, 9) * 10;
    const produkt = faktorKlein * faktorZehn;
    return `<strong>Beispiel:</strong> ${produkt} = ▢ · ${faktorZehn}.<br>Rechne rückwärts mit Teilen: ${produkt} : ${faktorZehn} = ${faktorKlein}<br><strong>Fehlende Zahl: ${faktorKlein}</strong>`;
  }

  // ---- Zehnerzahl mal Zehnerzahl (20 · 30, 50 · 10, ...) - eigener Bereich,
  // da genZehnerzahlenFrage oben nur "einstellig · Zehnerzahl" abdeckt.
  // Ergaenzt am 28.08.2026 fuer die Mathearbeit ueber "Multiplizieren und
  // Dividieren" (siehe Hausaufgaben-Foto: 20·30=600, 30·30=900, 50·10=500 ...).
  function genRundeZehnerMalFrage() {
    const aZehn = rnd(2, 9) * 10, bZehn = rnd(2, 9) * 10;
    return { typ: 'numeric', frage: `${aZehn} · ${bZehn} = ?`, antwort: aZehn * bZehn, hilfe: hilfeRundeZehnerMal() };
  }

  function hilfeRundeZehnerMal() {
    const aZehn = rnd(2, 9) * 10, bZehn = rnd(2, 9) * 10;
    const a = aZehn / 10, b = bZehn / 10;
    return `<strong>Beispiel:</strong> ${aZehn} · ${bZehn} = ?<br>Rechne erst ohne die Nullen: ${a} · ${b} = ${a * b}<br>Dann hänge beide Nullen wieder an: ${a * b}00<br><strong>Ergebnis: ${aZehn * bZehn}</strong>`;
  }

  // ---- Fehlender Faktor (42 · ▢ = 420, ▢ · 30 = 900, ...) - ein Faktor ist
  // eine "nette" zweistellige Zahl, der andere eine Zehnerzahl, beide
  // Positionen koennen fehlen (siehe Hausaufgaben-Foto, Aufgabe 2).
  const NETTE_ZWEISTELLIGE = [10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27, 28, 30, 32, 35, 36, 40, 42, 45, 48, 49, 50, 54, 56, 60, 63, 64, 70, 72, 80, 81, 90, 99];

  function genFehlenderFaktorFrage() {
    const bekannterFaktor = NETTE_ZWEISTELLIGE[rnd(0, NETTE_ZWEISTELLIGE.length - 1)];
    const fehlenderFaktor = rnd(2, 9) * 10;
    const produkt = bekannterFaktor * fehlenderFaktor;
    const ersterFehlt = Math.random() < 0.5;
    const frageText = ersterFehlt ? `▢ · ${bekannterFaktor} = ${produkt}` : `${bekannterFaktor} · ▢ = ${produkt}`;
    return { typ: 'numeric', frage: `${frageText}.<br>Welche Zahl fehlt?`, antwort: fehlenderFaktor, hilfe: hilfeFehlenderFaktor() };
  }

  function hilfeFehlenderFaktor() {
    const bekannterFaktor = NETTE_ZWEISTELLIGE[rnd(0, NETTE_ZWEISTELLIGE.length - 1)];
    const fehlenderFaktor = rnd(2, 9) * 10;
    const produkt = bekannterFaktor * fehlenderFaktor;
    return `<strong>Beispiel:</strong> ${bekannterFaktor} · ▢ = ${produkt}.<br>Rechne rückwärts mit Teilen: ${produkt} : ${bekannterFaktor} = ${fehlenderFaktor}<br><strong>Fehlende Zahl: ${fehlenderFaktor}</strong>`;
  }

  // ---- Einfache Geteiltaufgaben (81 : 9, 63 : 7, ...) - kleines Einmaleins
  // rueckwaerts, ergaenzt die Malfolgen-Karteikarten um die Umkehrung.
  function genGeteiltEinfachFrage() {
    const teiler = rnd(2, 9), quotient = rnd(2, 9);
    const dividend = teiler * quotient;
    return { typ: 'numeric', frage: `${dividend} : ${teiler} = ?`, antwort: quotient, hilfe: hilfeGeteiltEinfach() };
  }

  function hilfeGeteiltEinfach() {
    const teiler = rnd(2, 9), quotient = rnd(2, 9);
    const dividend = teiler * quotient;
    return `<strong>Beispiel:</strong> ${dividend} : ${teiler} = ?<br>Überlege: ${teiler} · ? = ${dividend}. Das kennst du aus dem kleinen Einmaleins: ${teiler} · ${quotient} = ${dividend}<br><strong>Ergebnis: ${quotient}</strong>`;
  }

  // ---- Fehlender Teiler/Dividend (360 : ▢ = 6, ▢ : 80 = 3, ...) - der
  // Quotient ist immer bekannt, Teiler ODER Dividend fehlt (Foto, Aufgabe 4).
  const TEILER_OPTIONEN = [2, 3, 4, 5, 6, 7, 8, 9, 20, 30, 40, 50, 60, 70, 80, 90];

  function genFehlenderTeilerDividendFrage() {
    const teiler = TEILER_OPTIONEN[rnd(0, TEILER_OPTIONEN.length - 1)];
    const quotient = rnd(2, 9);
    const dividend = teiler * quotient;
    const dividendFehlt = Math.random() < 0.5;
    const frageText = dividendFehlt ? `▢ : ${teiler} = ${quotient}` : `${dividend} : ▢ = ${quotient}`;
    return { typ: 'numeric', frage: `${frageText}.<br>Welche Zahl fehlt?`, antwort: dividendFehlt ? dividend : teiler, hilfe: hilfeFehlenderTeilerDividend() };
  }

  function hilfeFehlenderTeilerDividend() {
    const teiler = TEILER_OPTIONEN[rnd(0, TEILER_OPTIONEN.length - 1)];
    const quotient = rnd(2, 9);
    const dividend = teiler * quotient;
    return `<strong>Beispiel:</strong> ${dividend} : ▢ = ${quotient}.<br>Rechne rückwärts mit Malnehmen: ${quotient} · ${teiler} = ${dividend}, also ist die fehlende Zahl ${teiler}.<br><strong>Fehlende Zahl: ${teiler}</strong>`;
  }

  // ---- Rechenkette mit Malnehmen/Teilen (56 ·10 :8 ·3 :70 = ?) - wie
  // genRechenketteFrage, aber mit ×/÷ statt +/− (Foto, Aufgabe 5).
  function genMalGeteiltKetteFrage() {
    const start = rnd(2, 90);
    let wert = start;
    const schritte = [];
    const anzahlSchritte = rnd(3, 4);
    for (let i = 0; i < anzahlSchritte; i++) {
      const moeglichkeiten = [];
      for (const k of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        if (wert * k <= 2000) moeglichkeiten.push({ text: `· ${k}`, neu: wert * k });
      }
      for (let k = 2; k <= 10; k++) {
        if (wert % k === 0 && wert / k >= 2) moeglichkeiten.push({ text: `: ${k}`, neu: wert / k });
      }
      const wahl = moeglichkeiten[rnd(0, moeglichkeiten.length - 1)];
      schritte.push(wahl.text);
      wert = wahl.neu;
    }
    return { typ: 'numeric', frage: `${start} ${schritte.join(' ')} = ?`, antwort: wert, hilfe: hilfeMalGeteiltKette() };
  }

  function hilfeMalGeteiltKette() {
    const s0 = rnd(2, 9), s1 = s0 * 10, s2 = s1 / 2;
    return `<strong>Beispiel:</strong> ${s0} · 10 : 2 = ?<br>Rechne Schritt für Schritt von links nach rechts:<br>${s0} · 10 = ${s1}<br>${s1} : 2 = ${s2}<br><strong>Ergebnis: ${s2}</strong>`;
  }

  // ---- Doppeltes/Hälfte von Produkt/Quotient (Foto, Aufgabe 6) ----
  function genDoppeltHaelfteFrage() {
    const doppelt = Math.random() < 0.5;
    if (doppelt) {
      const a = rnd(2, 9) * 10, b = rnd(2, 9);
      const produkt = a * b;
      return { typ: 'numeric', frage: `Welche Zahl ist das Doppelte des Produktes aus ${a} und ${b}?`, antwort: produkt * 2, hilfe: hilfeDoppeltHaelfte() };
    }
    const b = rnd(2, 9) * 10, q = rnd(2, 9) * 2;
    const a = b * q;
    return { typ: 'numeric', frage: `Welche Zahl ist die Hälfte des Quotienten aus ${a} und ${b}?`, antwort: q / 2, hilfe: hilfeDoppeltHaelfte() };
  }

  function hilfeDoppeltHaelfte() {
    if (Math.random() < 0.5) {
      const a = rnd(2, 9) * 10, b = rnd(2, 9), produkt = a * b;
      return `<strong>Beispiel:</strong> Doppeltes des Produktes aus ${a} und ${b}?<br>Erst das Produkt ausrechnen: ${a} · ${b} = ${produkt}<br>Dann verdoppeln (·2): ${produkt} · 2 = ${produkt * 2}<br><strong>Ergebnis: ${produkt * 2}</strong>`;
    }
    const b = rnd(2, 9) * 10, q = rnd(2, 9) * 2, a = b * q;
    return `<strong>Beispiel:</strong> Hälfte des Quotienten aus ${a} und ${b}?<br>Erst den Quotienten ausrechnen: ${a} : ${b} = ${q}<br>Dann halbieren (:2): ${q} : 2 = ${q / 2}<br><strong>Ergebnis: ${q / 2}</strong>`;
  }

  // ---- Teiler & Vielfache ----
  function genVielfachesFrage() {
    const n = rnd(3, 9);
    const richtig = n * rnd(2, 9);
    const falsche = [];
    while (falsche.length < 3) {
      const kandidat = rnd(Math.max(2, richtig - 15), richtig + 15);
      if (kandidat > 0 && kandidat % n !== 0 && kandidat !== richtig && !falsche.includes(kandidat)) {
        falsche.push(kandidat);
      }
    }
    const alle = shuffle([richtig, ...falsche]);
    return {
      typ: 'mc',
      frage: `Welche Zahl ist ein Vielfaches von ${n}?`,
      optionen: alle,
      richtigIndex: alle.indexOf(richtig),
      hilfe: hilfeVielfaches()
    };
  }

  function hilfeVielfaches() {
    const n = rnd(3, 9);
    const reihe = [1, 2, 3, 4, 5, 6].map(f => n * f);
    return `<strong>Beispiel:</strong> Vielfache von ${n} sind alle Zahlen aus der ${n}er-Reihe:<br>${reihe.join(', ')}, ... (immer wieder ${n} dazuzählen)<br>Eine Zahl ist ein Vielfaches von ${n}, wenn sie sich ohne Rest durch ${n} teilen lässt.`;
  }

  function genTeilerFrage() {
    const teilerPool = [24, 36, 45, 56, 60, 72, 48, 63, 42, 54, 30, 40, 18, 28];
    const ziel = teilerPool[rnd(0, teilerPool.length - 1)];
    const echteTeiler = [];
    for (let t = 2; t < ziel; t++) if (ziel % t === 0) echteTeiler.push(t);
    const richtig = echteTeiler[rnd(0, echteTeiler.length - 1)];
    const falsche = [];
    while (falsche.length < 3) {
      const kandidat = rnd(2, ziel - 1);
      if (ziel % kandidat !== 0 && !falsche.includes(kandidat)) falsche.push(kandidat);
    }
    const alle = shuffle([richtig, ...falsche]);
    return {
      typ: 'mc',
      frage: `Welche Zahl ist ein Teiler von ${ziel}?`,
      optionen: alle,
      richtigIndex: alle.indexOf(richtig),
      hilfe: hilfeTeiler()
    };
  }

  function hilfeTeiler() {
    const teilerPool = [24, 36, 45, 56, 60, 72, 48, 63, 42, 54, 30, 40, 18, 28];
    const ziel = teilerPool[rnd(0, teilerPool.length - 1)];
    const echteTeiler = [];
    for (let t = 1; t <= ziel; t++) if (ziel % t === 0) echteTeiler.push(t);
    return `<strong>Beispiel:</strong> Teiler von ${ziel} findest du, indem du testest, welche Zahlen ${ziel} ohne Rest teilen:<br>${echteTeiler.join(', ')}<br>Das sind alle Teiler von ${ziel}.`;
  }

  // Welche Zahl ist Vielfaches von 2 UND 3 (also von 6)?
  function genGemeinsamesVielfachesFrage() {
    const richtig = 6 * rnd(1, 8);
    const falsche = [];
    while (falsche.length < 3) {
      const kandidat = rnd(4, 55);
      const passtNicht = kandidat % 6 !== 0;
      if (passtNicht && !falsche.includes(kandidat) && kandidat !== richtig) falsche.push(kandidat);
    }
    const alle = shuffle([richtig, ...falsche]);
    return {
      typ: 'mc',
      frage: 'Welche Zahl ist ein Vielfaches von 2 UND von 3?',
      optionen: alle,
      richtigIndex: alle.indexOf(richtig),
      hilfe: `<strong>Beispiel:</strong> Vielfache von 2: 2, 4, 6, 8, 10, 12, 14, 16, 18 ...<br>Vielfache von 3: 3, 6, 9, 12, 15, 18 ...<br>` +
        `Zahlen, die in BEIDEN Reihen vorkommen (6, 12, 18, ...), sind Vielfache von 2 UND 3.`
    };
  }

  // "Die gesuchte Zahl ist Teiler von A und B. Sie ist größer als N." -
  // A und B werden so konstruiert, dass ggT(A,B) = d und die Antwort eindeutig ist.
  function genTeilerRaetselFrage() {
    const d = rnd(3, 9);
    let x, y;
    do {
      x = rnd(2, 9); y = rnd(2, 9);
    } while (x === y || ggt(x, y) !== 1);
    const a = d * x, b = d * y;
    const n = d - 2;
    return {
      typ: 'numeric',
      frage: `Die gesuchte Zahl ist Teiler von ${a} und ${b}.<br>Sie ist größer als ${n}. Welche Zahl ist gesucht?`,
      antwort: d,
      hilfe: hilfeTeilerRaetsel()
    };
  }

  function hilfeTeilerRaetsel() {
    const d = rnd(3, 9);
    let x, y;
    do { x = rnd(2, 9); y = rnd(2, 9); } while (x === y || ggt(x, y) !== 1);
    const a = d * x, b = d * y, n = d - 2;
    const teilerA = []; for (let t = 1; t <= a; t++) if (a % t === 0) teilerA.push(t);
    const teilerB = []; for (let t = 1; t <= b; t++) if (b % t === 0) teilerB.push(t);
    const gemeinsame = teilerA.filter(t => teilerB.includes(t));
    return `<strong>Beispiel:</strong> Gesucht: Teiler von ${a} und ${b}, größer als ${n}.<br>` +
      `Teiler von ${a}: ${teilerA.join(', ')}<br>Teiler von ${b}: ${teilerB.join(', ')}<br>` +
      `Gemeinsame Teiler: ${gemeinsame.join(', ')}<br>Davon größer als ${n}: nur die <strong>${d}</strong>.`;
  }

  // ---- Diagramme lesen: generiertes Balkendiagramm + Fragen dazu ----
  const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  // Mehrere Themen statt immer nur "Regentage" - frueher war JEDES Diagramm
  // thematisch dasselbe (Uli-Feedback 13.08.2026: "er hat jetzt in einem Set
  // vielfach diese Aufgabe mit den Regentagen gehabt"), obwohl sich die
  // FRAGE (Summe/Maximum/Vergleich/Schwelle) schon abwechselte.
  const DIAGRAMM_THEMEN = [
    { titel: 'Regentage im Monat', einheitMehrzahl: 'Regentage', min: 2, max: 16 },
    { titel: 'Sonnenstunden im Monat', einheitMehrzahl: 'Sonnenstunden', min: 3, max: 14 },
    { titel: 'Verkaufte Eis am Kiosk', einheitMehrzahl: 'verkaufte Eis', min: 20, max: 90 },
    { titel: 'Gelesene Bücher in der Klasse', einheitMehrzahl: 'gelesene Bücher', min: 2, max: 18 },
    { titel: 'Fahrräder auf dem Schulhof', einheitMehrzahl: 'Fahrräder', min: 5, max: 40 },
    { titel: 'Ausgeliehene Spiele in der Pause', einheitMehrzahl: 'ausgeliehene Spiele', min: 3, max: 20 }
  ];

  function genDiagrammDaten() {
    const themaIdx = waehleOhneWiederholung('diagramm-thema', DIAGRAMM_THEMEN.length, 3);
    const thema = DIAGRAMM_THEMEN[themaIdx];
    const indices = [];
    while (indices.length < 5) {
      const i = rnd(0, 11);
      if (!indices.includes(i)) indices.push(i);
    }
    indices.sort((a, b) => a - b);
    // Werte MUESSEN sich alle unterscheiden - sonst kann "In welchem Monat gab
    // es die meisten X?" (siehe genMaxMonatFrage) einen echten Gleichstand
    // haben, bei dem mehrere Monate denselben Hoechstwert zeigen, aber nur
    // EINER als richtig gilt (indexOf findet nur den ersten Treffer). Bei 5
    // unabhaengig gewuerfelten Werten kam das frueher in ca. 15% der Faelle
    // vor - bei Max real aufgetreten (12.08.2026).
    const werte = [];
    while (werte.length < 5) {
      const w = rnd(thema.min, thema.max);
      if (!werte.includes(w)) werte.push(w);
    }
    return {
      titel: thema.titel,
      einheitMehrzahl: thema.einheitMehrzahl,
      kategorien: indices.map(i => monate[i]),
      werte
    };
  }

  function htmlBalkenDiagramm(d) {
    const max = Math.max(...d.werte);
    const zeilen = d.kategorien.map((k, i) => {
      const wert = d.werte[i];
      const breite = Math.max(10, Math.round((wert / max) * 100));
      return `<div class="balken-zeile"><div class="balken-label">${k}</div>` +
        `<div class="balken-spur"><div class="balken-fuellung" style="width:${breite}%">${wert}</div></div></div>`;
    }).join('');
    return `<div class="balken-chart"><div class="balken-titel">${d.titel}</div>${zeilen}</div>`;
  }

  // Kleines, eigenstaendiges Beispieldiagramm nur fuer die Hilfe-Erklaerungen
  // (bewusst ANDERS als das gerade angezeigte, echte Diagramm der Frage).
  function hilfeBeispielDiagramm() {
    const d = { titel: 'Sonnenstunden im Monat', einheitMehrzahl: 'Sonnenstunden',
      kategorien: ['März', 'April', 'Mai'], werte: [rnd(3, 6), rnd(5, 9), rnd(8, 12)] };
    return { d, chart: htmlBalkenDiagramm(d) };
  }

  function genSummenFrage(d, chartHtml) {
    const idxA = rnd(0, d.kategorien.length - 1);
    let idxB = rnd(0, d.kategorien.length - 1);
    while (idxB === idxA) idxB = rnd(0, d.kategorien.length - 1);
    const bsp = hilfeBeispielDiagramm();
    return {
      typ: 'numeric',
      lesetext: chartHtml,
      frage: `Wie viele ${d.einheitMehrzahl} gab es in ${d.kategorien[idxA]} und ${d.kategorien[idxB]} zusammen?`,
      antwort: d.werte[idxA] + d.werte[idxB],
      hilfe: `<strong>Beispiel:</strong>${bsp.chart}Wie viele ${bsp.d.einheitMehrzahl} gab es in ${bsp.d.kategorien[0]} und ${bsp.d.kategorien[2]} zusammen?<br>` +
        `Lies beide Balkenwerte ab und zähle sie zusammen: ${bsp.d.werte[0]} + ${bsp.d.werte[2]} = ${bsp.d.werte[0] + bsp.d.werte[2]}<br><strong>Ergebnis: ${bsp.d.werte[0] + bsp.d.werte[2]}</strong>`
    };
  }

  function genMaxMonatFrage(d, chartHtml) {
    const maxWert = Math.max(...d.werte);
    const maxIdx = d.werte.indexOf(maxWert);
    const uebrige = shuffle(d.kategorien.map((_, i) => i).filter(i => i !== maxIdx));
    const gewaehlt = shuffle([maxIdx, ...uebrige.slice(0, 3)]);
    const bsp = hilfeBeispielDiagramm();
    const bspMaxIdx = bsp.d.werte.indexOf(Math.max(...bsp.d.werte));
    return {
      typ: 'mc',
      lesetext: chartHtml,
      frage: `In welchem Monat gab es die meisten ${d.einheitMehrzahl}?`,
      optionen: gewaehlt.map(i => d.kategorien[i]),
      richtigIndex: gewaehlt.indexOf(maxIdx),
      hilfe: `<strong>Beispiel:</strong>${bsp.chart}Suche den längsten/höchsten Balken - das ist der Monat mit den meisten ${bsp.d.einheitMehrzahl}.<br>` +
        `Hier ist das <strong>${bsp.d.kategorien[bspMaxIdx]}</strong> mit ${bsp.d.werte[bspMaxIdx]}.`
    };
  }

  // Wie viele Monate lagen über einer bestimmten Schwelle?
  function genMehrAlsFrage(d, chartHtml) {
    const sortiert = d.werte.slice().sort((a, b) => a - b);
    const schwelle = sortiert[Math.floor(sortiert.length / 2)];
    const anzahl = d.werte.filter(w => w > schwelle).length;
    const bsp = hilfeBeispielDiagramm();
    const bspSchwelle = bsp.d.werte[1];
    const bspAnzahl = bsp.d.werte.filter(w => w > bspSchwelle).length;
    return {
      typ: 'numeric',
      lesetext: chartHtml,
      frage: `Wie viele Monate hatten mehr als ${schwelle} ${d.einheitMehrzahl}?`,
      antwort: anzahl,
      hilfe: `<strong>Beispiel:</strong>${bsp.chart}Wie viele Monate hatten mehr als ${bspSchwelle} ${bsp.d.einheitMehrzahl}?<br>` +
        `Gehe jeden Balken durch und zähle, bei welchen der Wert größer als ${bspSchwelle} ist.<br><strong>Ergebnis: ${bspAnzahl}</strong>`
    };
  }

  // Vergleiche zwei Werte aus dem Diagramm mit <, = oder >
  function genDiagrammVergleichFrage(d, chartHtml) {
    const idxA = rnd(0, d.kategorien.length - 1);
    let idxB = rnd(0, d.kategorien.length - 1);
    while (idxB === idxA) idxB = rnd(0, d.kategorien.length - 1);
    const wa = d.werte[idxA], wb = d.werte[idxB];
    const zeichen = wa < wb ? '<' : wa > wb ? '>' : '=';
    const bsp = hilfeBeispielDiagramm();
    const bspZeichen = bsp.d.werte[0] < bsp.d.werte[1] ? '<' : bsp.d.werte[0] > bsp.d.werte[1] ? '>' : '=';
    return {
      typ: 'mc',
      lesetext: chartHtml,
      frage: `Vergleiche: ${d.kategorien[idxA]} ___ ${d.kategorien[idxB]}`,
      optionen: ['<', '=', '>'],
      richtigIndex: ['<', '=', '>'].indexOf(zeichen),
      hilfe: `<strong>Beispiel:</strong>${bsp.chart}Vergleiche: ${bsp.d.kategorien[0]} ___ ${bsp.d.kategorien[1]}<br>` +
        `Lies beide Werte ab (${bsp.d.werte[0]} und ${bsp.d.werte[1]}) und vergleiche die Zahlen.<br><strong>Richtiges Zeichen: ${bspZeichen}</strong>`
    };
  }

  // Eine Frage pro Diagramm (statt fest zusammengehoerendem Paar) - so passt die
  // Diagramm-Kategorie zum gleichen "eine Frage pro Auswahl"-Schema wie alle
  // anderen Bereiche der Tagesaufgabe (siehe AUFGABEN_BEREICHE).
  function genDiagrammFrage() {
    const d = genDiagrammDaten();
    const chartHtml = htmlBalkenDiagramm(d);
    const varianten = [genSummenFrage, genMaxMonatFrage, genMehrAlsFrage, genDiagrammVergleichFrage];
    const idx = waehleOhneWiederholung('diagramm-variante', varianten.length, 2);
    return varianten[idx](d, chartHtml);
  }

  // ---- Streifendiagramm/Tabelle: Mädchen/Jungen pro Schuljahr, eine fehlende
  // Zelle (Summe je Schuljahr oder Summe je Zeile) muss berechnet werden. ----
  const schuljahre = ['1. Schuljahr', '2. Schuljahr', '3. Schuljahr', '4. Schuljahr'];

  function tabelleHtmlBauen(maedchen, jungen, versteckterTyp, versteckterIndex) {
    function zelle(typ, i) {
      if (typ === versteckterTyp && i === versteckterIndex) return '<td class="tab-luecke">?</td>';
      if (typ === 'maedchen') return `<td>${maedchen[i]}</td>`;
      if (typ === 'jungen') return `<td>${jungen[i]}</td>`;
      return `<td>${maedchen[i] + jungen[i]}</td>`;
    }
    const kopf = schuljahre.map(s => `<th>${s}</th>`).join('');
    const zeileMaedchen = schuljahre.map((_, i) => zelle('maedchen', i)).join('');
    const zeileJungen = schuljahre.map((_, i) => zelle('jungen', i)).join('');
    const zeileZusammen = schuljahre.map((_, i) => zelle('zusammen', i)).join('');
    return `<table class="daten-tabelle"><tr><th></th>${kopf}</tr>` +
      `<tr><th>Mädchen</th>${zeileMaedchen}</tr>` +
      `<tr><th>Jungen</th>${zeileJungen}</tr>` +
      `<tr><th>zusammen</th>${zeileZusammen}</tr></table>`;
  }

  function genStreifentabelleFrage() {
    const maedchen = schuljahre.map(() => rnd(14, 30));
    const jungen = schuljahre.map(() => rnd(14, 30));
    const i = rnd(0, 3);

    if (Math.random() < 0.5) {
      // "zusammen" fuer ein Schuljahr fehlt
      return {
        typ: 'numeric',
        lesetext: tabelleHtmlBauen(maedchen, jungen, 'zusammen', i),
        frage: `Wie viele Kinder waren insgesamt im ${schuljahre[i]}?`,
        antwort: maedchen[i] + jungen[i],
        hilfe: hilfeStreifentabelle('zusammen')
      };
    }
    // eine Jungen-Zahl fehlt, "zusammen" ist bekannt
    return {
      typ: 'numeric',
      lesetext: tabelleHtmlBauen(maedchen, jungen, 'jungen', i),
      frage: `Im ${schuljahre[i]} waren insgesamt ${maedchen[i] + jungen[i]} Kinder, davon ${maedchen[i]} Mädchen. Wie viele Jungen waren es?`,
      antwort: jungen[i],
      hilfe: hilfeStreifentabelle('jungen')
    };
  }

  function hilfeStreifentabelle(art) {
    const m = rnd(14, 25), j = rnd(14, 25);
    if (art === 'zusammen') {
      return `<strong>Beispiel:</strong> Im Beispiel-Schuljahr sind ${m} Mädchen und ${j} Jungen.<br>` +
        `"Zusammen" heißt: beide Zahlen addieren.<br>${erklaerungAddition(m, j)}`;
    }
    const summe = m + j;
    return `<strong>Beispiel:</strong> Insgesamt sind ${summe} Kinder da, davon ${m} Mädchen. Wie viele Jungen?<br>` +
      `Rechne "zusammen" minus "Mädchen": ${erklaerungSubtraktion(summe, m)}`;
  }

  // ---- Rechenvorteile bei 3 Zahlen (430+50+70, 755-36-15, ...) - ergaenzt
  // am 28.08.2026 fuer die Mathearbeit (Wiederholungsblatt "Klasse 3").
  // Plus-Variante: zwei der drei Zahlen ergeben absichtlich einen glatten
  // Zehner/Hunderter (der eigentliche "Vorteil"). Minus-Variante: beide
  // abgezogenen Zahlen zuerst addieren, dann nur einmal abziehen.
  function genRechenvorteilFrage() {
    const plus = Math.random() < 0.5;
    if (plus) {
      const teil = rnd(1, 9) * 10;
      const partner = 100 - teil;
      const dritte = rnd(20, 500);
      const zahlen = shuffle([teil, partner, dritte]);
      return { typ: 'numeric', frage: `${zahlen[0]} + ${zahlen[1]} + ${zahlen[2]} = ?`, antwort: teil + partner + dritte, hilfe: hilfeRechenvorteil() };
    }
    const start = rnd(500, 990);
    const b = rnd(10, 90), c = rnd(10, Math.max(10, Math.min(90, start - b - 10)));
    return { typ: 'numeric', frage: `${start} − ${b} − ${c} = ?`, antwort: start - b - c, hilfe: hilfeRechenvorteil() };
  }

  function hilfeRechenvorteil() {
    if (Math.random() < 0.5) {
      const teil = rnd(1, 9) * 10, partner = 100 - teil, dritte = rnd(20, 500);
      return `<strong>Beispiel:</strong> ${teil} + ${partner} + ${dritte} = ?<br>Suche zwei Zahlen, die zusammen einen glatten Zehner/Hunderter ergeben: ${teil} + ${partner} = ${teil + partner}<br>Dann die dritte Zahl dazu: ${teil + partner} + ${dritte} = ${teil + partner + dritte}<br><strong>Ergebnis: ${teil + partner + dritte}</strong>`;
    }
    const start = rnd(500, 990), b = rnd(10, 90), c = rnd(10, Math.max(10, Math.min(90, start - b - 10)));
    return `<strong>Beispiel:</strong> ${start} − ${b} − ${c} = ?<br>Rechenvorteil: addiere zuerst beide Zahlen, die abgezogen werden: ${b} + ${c} = ${b + c}<br>Dann einmal abziehen: ${start} − ${b + c} = ${start - (b + c)}<br><strong>Ergebnis: ${start - (b + c)}</strong>`;
  }

  // ---- Zahlenfolge fortsetzen (110, 111, 220, 222, ...) - vereinfacht auf
  // eine gleichbleibende Schrittweite (Regel finden + fortsetzen).
  function genZahlenfolgeFrage() {
    const schritt = rnd(2, 25), start = rnd(1, 30);
    const folge = [start, start + schritt, start + 2 * schritt, start + 3 * schritt];
    return { typ: 'numeric', frage: `${folge.join(', ')}, ?<br>Wie geht die Zahlenfolge weiter?`, antwort: start + 4 * schritt, hilfe: hilfeZahlenfolge() };
  }

  function hilfeZahlenfolge() {
    const schritt = rnd(2, 20), start = rnd(1, 20);
    const folge = [start, start + schritt, start + 2 * schritt];
    return `<strong>Beispiel:</strong> ${folge.join(', ')}, ?<br>Finde die Regel: von einer Zahl zur nächsten wird immer ${schritt} dazugezählt.<br>Wende die Regel nochmal an: ${folge[2]} + ${schritt} = ${folge[2] + schritt}<br><strong>Nächste Zahl: ${folge[2] + schritt}</strong>`;
  }

  // ---- Vergleiche mit </=/> bei Additions-/Subtraktionsaufgaben (366+34 ? 400,
  // 170+90 ? 60+210, ...) - wie genVergleichRechnungFrage, aber fuer +/− statt ×.
  function genVergleichAddSubFrage() {
    const plus = Math.random() < 0.5;
    const a = rnd(100, 700);
    const b = plus ? rnd(10, 400) : rnd(10, a - 10);
    const links = plus ? a + b : a - b;
    const zahlRechts = Math.random() < 0.5;
    let rechts, rechtsText;
    if (zahlRechts) {
      rechts = links + (Math.random() < 0.3 ? 0 : (rnd(1, 8) * 10 * (Math.random() < 0.5 ? 1 : -1)));
      rechtsText = `${rechts}`;
    } else {
      const plus2 = Math.random() < 0.5;
      const c = rnd(100, 700), d = plus2 ? rnd(10, 400) : rnd(10, c - 10);
      rechts = plus2 ? c + d : c - d;
      rechtsText = `${c} ${plus2 ? '+' : '−'} ${d}`;
    }
    const zeichen = links < rechts ? '<' : links > rechts ? '>' : '=';
    return {
      typ: 'mc',
      frage: `${a} ${plus ? '+' : '−'} ${b} ___ ${rechtsText}`,
      optionen: ['<', '=', '>'],
      richtigIndex: ['<', '=', '>'].indexOf(zeichen),
      hilfe: hilfeVergleichAddSub()
    };
  }

  function hilfeVergleichAddSub() {
    const a = rnd(100, 700), b = rnd(10, 400);
    const links = a + b;
    const rechts = links + rnd(1, 5) * 10;
    const zeichen = links < rechts ? '<' : links > rechts ? '>' : '=';
    return `<strong>Beispiel:</strong> ${a} + ${b} ___ ${rechts}<br>Rechne die linke Seite aus: ${a} + ${b} = ${links}<br>Vergleiche mit der Zahl rechts: ${links} ${zeichen} ${rechts}<br><strong>Richtiges Zeichen: ${zeichen}</strong>`;
  }

  // ---- Malfolgen üben: Karteikarten-Prinzip. Falsch beantwortete Aufgaben
  // kommen (dank App.startQuizSession-Option wiederholeFalsche) noch in
  // derselben Sitzung wieder dran; ueber Storage.getMalfolgenStats() merkt
  // sich die App zusaetzlich ueber Tage hinweg, welche Fakten oft falsch waren,
  // und legt genau die in kuenftigen Sitzungen haeufiger vor. ----
  function malfolgenAlleFakten() {
    const reihen = Storage.getMalfolgenReihen();
    const fakten = [];
    for (const a of reihen) {
      for (let b = 1; b <= 10; b++) fakten.push(`${a}x${b}`);
    }
    return fakten;
  }

  // Je oefter etwas falsch war (und je laenger keine Erfolgsserie danach lief),
  // desto hoeher das Gewicht - so kommen schwache Fakten/Bereiche haeufiger dran.
  // Genutzt sowohl fuer einzelne Malfolgen-Fakten als auch fuer die Tagesaufgabe-
  // Bereiche (siehe waehleKategorieGewichtet).
  function gewichtFuerStat(stat) {
    if (!stat) return 3;
    const serieBonus = Math.min(stat.serie || 0, 4);
    return Math.max(1, 3 + (stat.falsch || 0) * 2 - serieBonus);
  }

  // Baut ein frisch gemischtes "Kartendeck" aus ALLEN aktuell ausgewaehlten
  // Fakten (siehe Storage.getMalfolgenReihen) - schwache Fakten (hohes
  // gewichtFuerStat) kommen mehrfach rein, jeder Fakt aber MINDESTENS einmal.
  // Das Deck wird in Storage.malfolgenDeck persistiert und von
  // ziehMalfolgenFakten() Session fuer Session von VORNE abgebaut (nicht bei
  // jeder Session neu gewuerfelt) - dadurch ist garantiert, dass jeder Fakt
  // im Deck einmal drankommt, bevor irgendeiner ein zweites Mal drankommt.
  // gewichtFuerStat liefert bei "neutral" (keine Fehler) 3, ein Fakt braucht
  // also im Schnitt 3 Gewichtspunkte pro Deck-Kopie - eine 1x1-Fehlerserie
  // (gewicht 9) landet dadurch ca. 3x im Deck statt nur 1x.
  // Wie shuffle(), verhindert zusaetzlich, dass ein und derselbe Fakt (bei
  // schwachen Fakten stecken mehrere Kopien im Deck) direkt hintereinander
  // zweimal vorkommt - reines Fisher-Yates-Mischen laesst das gelegentlich zu,
  // was sich nicht "zufaellig" anfuehlt (13.08.2026 Uli-Wunsch: "Malfolgen
  // sollten in Zufallswiedergabe angezeigt werden", aehnlich Musik-Shuffle).
  // Klassisches "Reorganize String"-Verfahren: verteilt bei jedem Schritt
  // eine zufaellig gewaehlte Gruppe unter den jeweils HAEUFIGSTEN noch
  // uebrigen Werten (die nicht der zuletzt gesetzte Wert ist) - das
  // garantiert (wenn ueberhaupt moeglich) keine zwei gleichen Werte direkt
  // nebeneinander, anders als "mischen + hinterher reparieren", das bei
  // dichteren Wiederholungen nicht zuverlaessig konvergiert.
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

  function baueMalfolgenDeck() {
    const stats = Storage.getMalfolgenStats();
    const deck = [];
    for (const fakt of malfolgenAlleFakten()) {
      // Obergrenze 5 Kopien: gewichtFuerStat waechst mit der Fehlerzahl
      // unbegrenzt (kein Deckel), ein staendig falsch beantworteter Fakt
      // koennte sonst so viele Kopien bekommen, dass sich Nachbar-
      // Wiederholungen bei wenigen ausgewaehlten Reihen gar nicht mehr
      // vermeiden lassen (Schubfachprinzip: bei 5 Kopien unter mind. 9
      // Karten kein Problem, bei mehr Kopien in kleinen Decks schon).
      const kopien = Math.min(5, Math.max(1, Math.round(gewichtFuerStat(stats[fakt]) / 3)));
      for (let i = 0; i < kopien; i++) deck.push(fakt);
    }
    return mischeOhneNachbarWiederholung(deck);
  }

  // Zieht `anzahl` Fakten vom Deck-Rest (siehe baueMalfolgenDeck) - wird das
  // Deck dabei leer, wird sofort ein frisches gemischt und weitergezogen
  // (garantiert IMMER exakt `anzahl` Fakten, auch bei wenigen ausgewaehlten
  // Reihen). Der Rest wird zurueck in Storage gespeichert, damit die naechste
  // Session (auch nach App-Neustart) an derselben Stelle im Deck weitermacht.
  function ziehMalfolgenFakten(anzahl) {
    let deck = Storage.getMalfolgenDeck();
    const gezogen = [];
    while (gezogen.length < anzahl) {
      if (deck.length === 0) deck = baueMalfolgenDeck();
      gezogen.push(deck.shift());
    }
    Storage.setMalfolgenDeck(deck);
    return gezogen;
  }

  // ---- Malfolgen als Karteikarten: Vorderseite zeigt die Aufgabe, Antippen
  // dreht die Karte um und zeigt das Ergebnis - Max sagt danach SELBST, ob er
  // es richtig gewusst hat (zwei Buttons), statt eine Zahl einzutippen. Kein
  // Wiederholen-innerhalb-der-Session mehr (das gehoerte zum alten Zahlen-
  // Eingabe-Quiz) - ueber Tage hinweg lenkt Storage.meldeMalfolgenErgebnis die
  // Deck-Gewichtung trotzdem weiter Richtung schwacher Fakten.
  let mfSession = null;
  let mfUmgedreht = false;

  // Wie AKTIVITAET_GEMISCHT oben: ermoeglicht das Fortsetzen einer
  // unterbrochenen Karteikarten-Runde am selben Tag statt sie zu verwerfen.
  const AKTIVITAET_MALFOLGEN = 'malfolgen';
  const ANZAHL_MALFOLGEN = 30;

  function starteMalfolgenKarten() {
    const offen = Storage.getOffeneSession(AKTIVITAET_MALFOLGEN);
    if (offen && offen.index > 0 && offen.index < ANZAHL_MALFOLGEN) {
      const fakten = ziehMalfolgenFakten(ANZAHL_MALFOLGEN - offen.index);
      mfSession = {
        fakten, index: 0,
        richtig: offen.richtigCount || 0,
        sterne: offen.sessionSterne || 0,
        anzeigeOffset: offen.index,
        verlauf: offen.verlauf || []
      };
    } else {
      const fakten = ziehMalfolgenFakten(ANZAHL_MALFOLGEN);
      mfSession = { fakten, index: 0, richtig: 0, sterne: 0, anzeigeOffset: 0, verlauf: [] };
    }
    App.setLastStarter(starteMalfolgenKarten);
    renderMalfolgenKarte();
  }

  function renderMalfolgenKarte() {
    mfUmgedreht = false;
    const fakt = mfSession.fakten[mfSession.index];
    const [a, b] = fakt.split('x').map(Number);
    const nr = mfSession.index + mfSession.anzeigeOffset + 1;
    const total = mfSession.fakten.length + mfSession.anzeigeOffset;
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Mathe.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="progress-row"><span>Karte ${nr} / ${total}</span><span>MALFOLGEN</span></div>
      <div class="karteikarte" onclick="Mathe.karteUmdrehen()">
        <div class="karteikarte-inner" id="karteikarte-inner">
          <div class="karteikarte-seite karteikarte-vorne">
            <div class="karteikarte-frage">${a} × ${b}</div>
            <div class="karteikarte-hinweis">Tippen zum Umdrehen</div>
          </div>
          <div class="karteikarte-seite karteikarte-hinten">
            <div class="karteikarte-ergebnis">${a * b}</div>
          </div>
        </div>
      </div>
      <div class="karteikarte-bewertung" id="karteikarte-bewertung">
        <div class="btn-bewertung btn-falsch" onclick="Mathe.bewerteMalfolgenKarte(false)">✘ Nicht gewusst</div>
        <div class="btn-bewertung btn-richtig" onclick="Mathe.bewerteMalfolgenKarte(true)">✔ Richtig gewusst</div>
      </div>
    `);
  }

  function karteUmdrehen() {
    if (mfUmgedreht) return;
    mfUmgedreht = true;
    document.getElementById('karteikarte-inner').classList.add('umgedreht');
    document.getElementById('karteikarte-bewertung').classList.add('sichtbar');
  }

  function bewerteMalfolgenKarte(korrekt) {
    if (!mfUmgedreht) return; // erst umdrehen, dann bewerten
    const fakt = mfSession.fakten[mfSession.index];
    Storage.meldeMalfolgenErgebnis(fakt, korrekt);
    const gained = Storage.addAntwort('mathe', korrekt, 1);
    if (korrekt) { mfSession.richtig++; mfSession.sterne += gained; }
    // Fuer die Aufgaben-Verlaufsliste in Papas Auswertung, siehe App.js
    // abschlussFrage fuers Vorbild bei den anderen Faechern.
    mfSession.verlauf.push({ frage: fakt.replace('x', ' × '), ergebnis: korrekt ? 'richtig' : 'falsch' });
    App.updateTopbar();
    mfSession.index++;
    const fertig = mfSession.index >= mfSession.fakten.length;
    if (fertig) {
      Storage.loescheOffeneSession(AKTIVITAET_MALFOLGEN);
      renderMalfolgenErgebnis();
    } else {
      Storage.setOffeneSession(AKTIVITAET_MALFOLGEN, {
        index: mfSession.index + mfSession.anzeigeOffset,
        richtigCount: mfSession.richtig,
        sessionSterne: mfSession.sterne,
        verlauf: mfSession.verlauf
      });
      renderMalfolgenKarte();
    }
  }

  function renderMalfolgenErgebnis() {
    const total = mfSession.fakten.length + mfSession.anzeigeOffset;
    const quote = Math.round((mfSession.richtig / total) * 100);
    let emoji = '🙂';
    if (quote >= 90) emoji = '🏆';
    else if (quote >= 70) emoji = '🎉';
    else if (quote >= 40) emoji = '👍';

    App.render(`
      <div class="result-card">
        <div class="result-emoji">${emoji}</div>
        <div class="result-title">${mfSession.richtig} von ${total} gewusst!</div>
        <div class="result-sterne">Du hast ${mfSession.sterne} ⭐ verdient</div>
        <div class="btn-primary" onclick="App.restartLast()">Nochmal üben</div>
        <div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);" onclick="Mathe.renderMalfolgenUebersicht()">Fortschritt ansehen</div>
        <div class="btn-primary" style="background:var(--muted);color:var(--ink);" onclick="App.gotoHome()">Zum Hauptmenü</div>
      </div>
    `);
    FernSync.meldeLernsetErledigt('Malfolgen üben', `${mfSession.richtig} von ${total} gewusst`, mfSession.sterne, 'malfolgen', mfSession.verlauf);
  }

  // ---- Fortschritts-Uebersicht: zeigt pro ausgewaehlter Reihe UND pro
  // einzelner Aufgabe (Fakt), wie weit Max ist - basierend auf denselben
  // Daten wie das Karteikarten-Deck (Storage.getMalfolgenStats fuer den
  // Sitzt-Status je Fakt, Storage.getMalfolgenDeck fuer "kommt in dieser
  // Runde noch dran"). Rein informativ, keine eigene Logik/Punkte.
  function malfolgenFaktStatus(stat) {
    if (!stat) return 'neu';
    return (stat.serie || 0) >= 2 ? 'sicher' : 'uebung';
  }

  function renderMalfolgenUebersicht() {
    const reihen = Storage.getMalfolgenReihen();
    const stats = Storage.getMalfolgenStats();
    const restDeck = new Set(Storage.getMalfolgenDeck());

    let gesamtSicher = 0;
    const reihenHtml = reihen.map(a => {
      let sicher = 0;
      const chipsHtml = Array.from({ length: 10 }, (_, i) => i + 1).map(b => {
        const fakt = `${a}x${b}`;
        const status = malfolgenFaktStatus(stats[fakt]);
        if (status === 'sicher') sicher++;
        const offenKlasse = restDeck.has(fakt) ? ' uebersicht-chip-offen' : '';
        return `<div class="uebersicht-chip uebersicht-chip-${status}${offenKlasse}" title="${a} × ${b} = ${a * b}">${b}</div>`;
      }).join('');
      gesamtSicher += sicher;
      return `
        <div class="uebersicht-reihe">
          <div class="uebersicht-reihe-kopf"><span>${a}er-Reihe</span><span>${sicher === 10 ? '✅ alle sicher!' : sicher + ' von 10 sicher'}</span></div>
          <div class="uebersicht-chips">${chipsHtml}</div>
        </div>
      `;
    }).join('');

    const gesamtAnzahl = reihen.length * 10;
    const alleSicher = gesamtAnzahl > 0 && gesamtSicher === gesamtAnzahl;

    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Mathe.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Dein Fortschritt bei den Malfolgen</div>
      ${alleSicher ? `<div class="uebersicht-banner-fertig">🎉 Du kannst alle ausgewählten Reihen sicher!</div>` : ''}
      <div class="lese-text">Insgesamt <strong>${gesamtSicher} von ${gesamtAnzahl}</strong> Aufgaben sitzen sicher. In der aktuellen Karten-Runde kommen noch <strong>${restDeck.size}</strong> Aufgaben dran, bevor sich alles wiederholt.</div>
      <div class="uebersicht-legende">
        <span><span class="uebersicht-punkt uebersicht-punkt-sicher"></span> sitzt sicher</span>
        <span><span class="uebersicht-punkt uebersicht-punkt-uebung"></span> wird noch geübt</span>
        <span><span class="uebersicht-punkt uebersicht-punkt-neu"></span> noch nie dran gewesen</span>
        <span><span class="uebersicht-punkt uebersicht-punkt-offen"></span> kommt in dieser Runde noch dran</span>
      </div>
      <div class="uebersicht-liste">${reihenHtml}</div>
    `);
  }

  // ---- Tagespensum: Mix aus allen Aufgabenbereichen, keine Sparten-Auswahl durch
  // Max. Pro Bereich merkt sich Storage.getMatheKategorienStats(), wie oft er dort
  // falsch lag (gleiches Karteikarten-Prinzip wie bei den Malfolgen) - dadurch
  // bekommt Max in kuenftigen Tagesaufgaben automatisch mehr Aufgaben aus seinen
  // Schwaeche-Bereichen, ohne dass er selbst etwas auswaehlen muss. Innerhalb eines
  // Bereichs mit mehreren Generatoren (z. B. "schriftlich") wird gleichverteilt
  // zufaellig einer davon benutzt - nur der Bereich selbst wird gewichtet. ----
  const AUFGABEN_BEREICHE = [
    // genAddSubFrage/genSubtraktionOhneUebertrag/genSubtraktionMitUebertrag
    // (echtes "Plus/Minus untereinander", als normale Aufgabe gestellt -
    // die Spaltenansicht gibt es nur in der Hilfe) bewusst mehrfach gelistet:
    // innerhalb der Kategorie "schriftlich" wird gleich-
    // verteilt zufaellig EIN Eintrag gewaehlt, mehr Eintraege = haeufiger dran,
    // ohne die anderen schriftlich-Aufgabentypen (Rechenkette, Fehlende Ziffer,
    // Stimmt-das, Sachaufgaben) ganz zu verdraengen.
    { kategorie: 'schriftlich', gen: genAddSubFrage },
    { kategorie: 'schriftlich', gen: genAddSubFrage },
    { kategorie: 'schriftlich', gen: genAddSubFrage },
    { kategorie: 'schriftlich', gen: genSubtraktionOhneUebertrag },
    { kategorie: 'schriftlich', gen: genSubtraktionOhneUebertrag },
    { kategorie: 'schriftlich', gen: genSubtraktionMitUebertrag },
    { kategorie: 'schriftlich', gen: genSubtraktionMitUebertrag },
    { kategorie: 'schriftlich', gen: genRechenketteFrage },
    { kategorie: 'schriftlich', gen: genFehlendeZifferAddition },
    { kategorie: 'schriftlich', gen: genFehlendeZifferSubtraktion },
    { kategorie: 'schriftlich', gen: genStimmtDasFrage },
    { kategorie: 'schriftlich', gen: genSachaufgabeSubtraktion },
    { kategorie: 'schriftlich', gen: genEinkaufSumme },
    { kategorie: 'zehnhundert', gen: genZehnHundertFrage },
    { kategorie: 'zehnhundert', gen: genZehnerzahlenFrage },
    { kategorie: 'zehnhundert', gen: genVergleichRechnungFrage },
    { kategorie: 'zehnhundert', gen: genZahlZerlegenFrage },
    { kategorie: 'teilervielfache', gen: genVielfachesFrage },
    { kategorie: 'teilervielfache', gen: genTeilerFrage },
    { kategorie: 'teilervielfache', gen: genGemeinsamesVielfachesFrage },
    { kategorie: 'teilervielfache', gen: genTeilerRaetselFrage },
    { kategorie: 'diagramme', gen: genDiagrammFrage },
    { kategorie: 'diagramme', gen: genStreifentabelleFrage },
    { kategorie: 'aufgabenfamilien', gen: genAufgabenfamilieFrage },
    // Neu am 28.08.2026 fuer die Mathearbeit "Multiplizieren und Dividieren"
    // (siehe Hausaufgaben-Fotos) - genRundeZehnerMalFrage/genFehlenderFaktorFrage/
    // genFehlenderTeilerDividendFrage mehrfach gelistet, da sie den Kern des
    // Uebungsblatts treffen; genMalGeteiltKetteFrage/genDoppeltHaelfteFrage
    // (Zusatzaufgaben auf dem Blatt) je einmal.
    { kategorie: 'multdivrund', gen: genRundeZehnerMalFrage },
    { kategorie: 'multdivrund', gen: genRundeZehnerMalFrage },
    { kategorie: 'multdivrund', gen: genFehlenderFaktorFrage },
    { kategorie: 'multdivrund', gen: genFehlenderFaktorFrage },
    { kategorie: 'multdivrund', gen: genGeteiltEinfachFrage },
    { kategorie: 'multdivrund', gen: genFehlenderTeilerDividendFrage },
    { kategorie: 'multdivrund', gen: genFehlenderTeilerDividendFrage },
    { kategorie: 'multdivrund', gen: genMalGeteiltKetteFrage },
    { kategorie: 'multdivrund', gen: genDoppeltHaelfteFrage },
    // Aus dem Wiederholungsblatt "Klasse 3" (Rechenvorteile/Zahlenfolgen/Vergleiche).
    { kategorie: 'rechenvorteile', gen: genRechenvorteilFrage },
    { kategorie: 'rechenvorteile', gen: genZahlenfolgeFrage },
    { kategorie: 'rechenvorteile', gen: genVergleichAddSubFrage }
  ];

  // Basis-Multiplikator pro Kategorie (vor der Fehler-Gewichtung aus
  // gewichtFuerStat) - "schriftlich" (Plus/Minus untereinander u.a., siehe
  // AUFGABEN_BEREICHE) bewusst hoeher, auf Ulis Wunsch, dass Max vermehrt
  // schriftlich rechnen uebt statt nur gleichverteilt ueber alle Bereiche.
  // "multdivrund" am 28.08.2026 ebenfalls hoeher gewichtet, weil das genau
  // das Thema von Max' Mathearbeit naechste Woche ist (siehe Hausaufgaben-
  // Fotos) - nach der Arbeit kann dieser Wert wieder auf 1 zurueckgesetzt werden.
  const KATEGORIE_BASISGEWICHT = { schriftlich: 1.8, multdivrund: 2 };

  function waehleKategorieGewichtet(bereicheProKategorie, stats) {
    const kategorien = Object.keys(bereicheProKategorie);
    const gewicht = k => gewichtFuerStat(stats[k]) * (KATEGORIE_BASISGEWICHT[k] || 1);
    const gesamtgewicht = kategorien.reduce((s, k) => s + gewicht(k), 0);
    let ziel = Math.random() * gesamtgewicht;
    for (const k of kategorien) {
      ziel -= gewicht(k);
      if (ziel <= 0) return k;
    }
    return kategorien[kategorien.length - 1];
  }

  // Erzeugt eine Frage aus einem bestimmten Generator UND merkt sich, wie sie
  // bei Bedarf spaeter mit NEUEN Zahlen desselben Typs neu erzeugt werden kann
  // (f.neueVersion) - genutzt von app.js, wenn eine falsch beantwortete Frage
  // dank wiederholeFalsche ein paar Fragen spaeter noch einmal drankommt: Max
  // soll dieselbe Art Aufgabe nochmal ueben, nicht wortwoertlich dieselben
  // Zahlen auswendig lernen (siehe Karteikarten-Prinzip, aber mit variablem Inhalt).
  function erzeugeFrage(kategorie, gen) {
    const frage = gen();
    frage.aufAntwort = (korrekt) => Storage.meldeMatheKategorieErgebnis(kategorie, korrekt);
    frage.neueVersion = () => erzeugeFrage(kategorie, gen);
    return frage;
  }

  function genTagesaufgabe(anzahl) {
    const stats = Storage.getMatheKategorienStats();
    const bereicheProKategorie = {};
    AUFGABEN_BEREICHE.forEach(b => {
      (bereicheProKategorie[b.kategorie] = bereicheProKategorie[b.kategorie] || []).push(b.gen);
    });

    const fragen = [];
    while (fragen.length < anzahl) {
      const kategorie = waehleKategorieGewichtet(bereicheProKategorie, stats);
      const generatoren = bereicheProKategorie[kategorie];
      const gen = generatoren[rnd(0, generatoren.length - 1)];
      fragen.push(erzeugeFrage(kategorie, gen));
    }
    return fragen;
  }

  // aktivitaet-Schluessel fuer Storage.getOffeneSession/setOffeneSession -
  // ermoeglicht das Fortsetzen einer unterbrochenen Aufgabenfolge am selben
  // Tag (siehe App.startQuizSession), statt sie bei jedem Neuaufruf zu
  // verwerfen (z.B. wenn Max zwischendurch etwas anderes macht wie lesen).
  const AKTIVITAET_GEMISCHT = 'mathe-gemischt';

  function starteTagesaufgabe() {
    const starter = () => {
      // Von Uli im Eltern-Bereich einstellbar (Tagesplan-Regeln, siehe
      // Storage.getTagesPensumAnzahl) - ohne Regel Standard 20, egal ob der
      // Einstieg ueber den Tagesplan-Chip oder das Mathe-Menue erfolgt.
      const ANZAHL_GEMISCHT = Storage.getTagesPensumAnzahl('mathe');
      const offen = Storage.getOffeneSession(AKTIVITAET_GEMISCHT);
      const config = {
        titel: 'Gemischte Aufgaben',
        // Karteikarten-Prinzip wie bei den Malfolgen: eine falsch beantwortete
        // Aufgabe (1. Versuch nicht sauber richtig) kommt ein paar Fragen
        // spaeter noch einmal dran - dank f.neueVersion() mit neuen Zahlen,
        // nicht identisch wiederholt.
        wiederholeFalsche: true,
        aktivitaet: AKTIVITAET_GEMISCHT,
        pensumFach: 'mathe'
      };
      if (offen && offen.index > 0 && offen.index < ANZAHL_GEMISCHT) {
        // Fortsetzen: nur die NOCH FEHLENDEN Fragen neu erzeugen, Zaehler
        // (richtig/Sterne) und Frage-Nummerierung setzen dort fort, wo Max
        // aufgehoert hat.
        config.anzeigeOffset = offen.index;
        config.startRichtigCount = offen.richtigCount;
        config.startSessionSterne = offen.sessionSterne;
        config.startVerlauf = offen.verlauf || [];
        App.startQuizSession('mathe', genTagesaufgabe(ANZAHL_GEMISCHT - offen.index), config);
      } else {
        App.startQuizSession('mathe', genTagesaufgabe(ANZAHL_GEMISCHT), config);
      }
    };
    App.setLastStarter(starter); starter();
  }

  return {
    renderMenu, starteTagesaufgabe, renderReihenwahl, speichereMalfolgenReihen,
    starteMalfolgenKarten, karteUmdrehen, bewerteMalfolgenKarte, renderMalfolgenUebersicht
  };
})();
