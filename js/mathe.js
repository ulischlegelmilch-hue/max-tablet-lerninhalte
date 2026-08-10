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

  function renderMenu() {
    App.render(App.subMenuHtml('Mathe', [
      { icon: 'tagesaufgabe', titel: 'Tagesaufgabe', onclick: 'Mathe.starteTagesaufgabe()' },
      { icon: 'malfolgen', titel: 'Malfolgen üben', onclick: 'Mathe.starteMalfolgen()' },
      { icon: 'einstellungen', titel: 'Reihen wählen', onclick: 'Mathe.renderReihenwahl()' }
    ]));
  }

  // Frei zugaenglich (kein Eltern-PIN) - Max soll selbst entscheiden koennen,
  // welche 1x1-Reihen er bei "Malfolgen üben" trainiert (z.B. klein anfangen
  // mit nur der 2er- und 5er-Reihe, spaeter erweitern).
  function renderReihenwahl() {
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
        <div id="reihen-hinweis" class="reihen-hinweis"></div>
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
    renderReihenwahl();
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
  // ============================================================

  // ---- Schriftlich Addieren/Subtrahieren (3-stellig) ----
  function genAddSubFrage() {
    const plus = Math.random() < 0.5;
    if (plus) {
      const a = rnd(100, 600), b = rnd(100, 999 - a);
      return { typ: 'numeric', frage: `${a} + ${b} = ?`, antwort: a + b };
    }
    const a = rnd(200, 950), b = rnd(100, a - 10);
    return { typ: 'numeric', frage: `${a} − ${b} = ?`, antwort: a - b };
  }

  // Zerlegt eine 3-stellige Zahl in [H, Z, E]-Ziffern.
  function ziffern3(n) { return String(n).padStart(3, '0').split('').map(Number); }

  // Subtraktion OHNE Uebertrag: jede Ziffer des Subtrahenden ist <= der
  // entsprechenden Ziffer des Minuenden, es muss also nirgends geliehen werden.
  function genSubtraktionOhneUebertrag() {
    const h1 = rnd(2, 9), z1 = rnd(0, 9), e1 = rnd(0, 9);
    const h2 = rnd(1, h1), z2 = rnd(0, z1), e2 = rnd(0, e1);
    const a = h1 * 100 + z1 * 10 + e1;
    const b = h2 * 100 + z2 * 10 + e2;
    return { typ: 'numeric', frage: `${a} − ${b} = ?<br><span class="aufgaben-hinweis">(ohne Übertrag)</span>`, antwort: a - b };
  }

  // Subtraktion MIT Uebertrag: mind. eine Ziffer des Subtrahenden ist groesser
  // als die entsprechende Ziffer des Minuenden - es muss geliehen werden.
  function genSubtraktionMitUebertrag() {
    let a, b;
    do {
      a = rnd(200, 950);
      b = rnd(100, a - 10);
    } while (!brauchtUebertrag(a, b));
    return { typ: 'numeric', frage: `${a} − ${b} = ?<br><span class="aufgaben-hinweis">(mit Übertrag)</span>`, antwort: a - b };
  }

  function brauchtUebertrag(a, b) {
    const [ah, az, ae] = ziffern3(a);
    const [bh, bz, be] = ziffern3(b);
    return ae < be || az < bz || ah < bh;
  }

  function genFehlendeZifferAddition() {
    const a = rnd(100, 700);
    const b = rnd(100, 899 - a);
    const summe = a + b;
    const bZiffern = ziffern3(b).map(String);
    const pos = rnd(0, 2);
    const versteckt = bZiffern[pos];
    bZiffern[pos] = '▢';
    return {
      typ: 'numeric',
      frage: `${a} + ${bZiffern.join('')} = ${summe}.<br>Welche Ziffer fehlt?`,
      antwort: parseInt(versteckt, 10)
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
    return {
      typ: 'numeric',
      frage: `${a} − ${bZiffern.join('')} = ${differenz}.<br>Welche Ziffer fehlt?`,
      antwort: parseInt(versteckt, 10)
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
    return { typ: 'numeric', frage: `${start} ${schritte.join(' ')} = ?`, antwort: wert };
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
    return {
      typ: 'mc',
      frage: `Stimmt diese Rechnung?<br>${a} ${zeichen} ${b} = ${angezeigt}`,
      optionen: ['Ja, stimmt', 'Nein, falsch'],
      richtigIndex: stimmt ? 0 : 1
    };
  }

  // ---- Sachaufgaben zu Subtraktion (Minuend/Subtrahend/Differenz) ----
  const sachaufgabenSubtraktion = [
    () => { const a = rnd(400, 980), b = rnd(100, a - 20);
      return `Subtrahiere ${b} von ${a}.`; },
    () => { const a = rnd(400, 980), b = rnd(100, a - 20);
      return `Der Minuend heißt ${a}, der Subtrahend ${b}. Berechne die Differenz.`; },
    () => { const a = rnd(400, 980), b = rnd(100, a - 20);
      return `Berechne die Differenz von ${a} und ${b}.`; }
  ];

  function genSachaufgabeSubtraktion() {
    const vorlage = sachaufgabenSubtraktion[rnd(0, sachaufgabenSubtraktion.length - 1)]();
    const zahlen = vorlage.match(/\d+/g).map(Number);
    const a = Math.max(zahlen[0], zahlen[1]);
    const b = Math.min(zahlen[0], zahlen[1]);
    return { typ: 'numeric', frage: vorlage, antwort: a - b };
  }

  // ---- Einkaufen: mehrere Preise zusammenzählen ----
  const einkaufsArtikel = ['ein Kleid', 'eine Hose', 'ein Paar Schuhe', 'ein Buch', 'ein Ball', 'eine Jacke', 'eine Mütze', 'ein Rucksack'];

  function genEinkaufSumme() {
    const anzahl = rnd(2, 3);
    const gewaehlt = shuffle(einkaufsArtikel.slice()).slice(0, anzahl);
    const preise = gewaehlt.map(() => rnd(15, 130));
    const teile = gewaehlt.map((art, i) => `${art} kostet ${preise[i]} €`);
    const summe = preise.reduce((s, p) => s + p, 0);
    return {
      typ: 'numeric',
      frage: `${teile.join(', ')}. Wie viel bezahlst du insgesamt?`,
      antwort: summe
    };
  }

  // ---- 10er & 100er: ×10/×100/:10/:100 und Zehnerzahlen ----
  function genZehnHundertFrage() {
    const typ = rnd(1, 4);
    if (typ === 1) {
      const a = rnd(2, 99);
      return { typ: 'numeric', frage: `${a} · 10 = ?`, antwort: a * 10 };
    }
    if (typ === 2) {
      const a = rnd(2, 9);
      return { typ: 'numeric', frage: `${a} · 100 = ?`, antwort: a * 100 };
    }
    if (typ === 3) {
      const erg = rnd(2, 99);
      return { typ: 'numeric', frage: `${erg * 10} : 10 = ?`, antwort: erg };
    }
    const erg = rnd(2, 9);
    return { typ: 'numeric', frage: `${erg * 100} : 100 = ?`, antwort: erg };
  }

  function genZehnerzahlenFrage() {
    if (Math.random() < 0.5) {
      const a = rnd(2, 9), b = rnd(2, 9) * 10;
      return { typ: 'numeric', frage: `${a} · ${b} = ?`, antwort: a * b };
    }
    const b = rnd(2, 9) * 10, erg = rnd(2, 9);
    return { typ: 'numeric', frage: `${b * erg} : ${b} = ?`, antwort: erg };
  }

  // ---- Aufgabenfamilien: aus einer bekannten Malaufgabe (z. B. 60 · 9 = 540)
  // eine der drei verwandten Aufgaben ableiten (Tauschaufgabe oder Umkehraufgabe) ----
  function genAufgabenfamilieFrage() {
    const a = rnd(2, 9), b = rnd(2, 9) * 10, produkt = a * b;
    const variante = rnd(1, 3);
    if (variante === 1) {
      return { typ: 'numeric', frage: `${a} · ${b} = ${produkt}.<br>Wie lautet die Tauschaufgabe? ${b} · ${a} = ?`, antwort: produkt };
    }
    if (variante === 2) {
      return { typ: 'numeric', frage: `${a} · ${b} = ${produkt}.<br>Wie lautet die Umkehraufgabe? ${produkt} : ${a} = ?`, antwort: b };
    }
    return { typ: 'numeric', frage: `${a} · ${b} = ${produkt}.<br>Wie lautet die Umkehraufgabe? ${produkt} : ${b} = ?`, antwort: a };
  }

  // Vergleiche zwei Rechnungen mit <, = oder >
  function genVergleichRechnungFrage() {
    const a = rnd(2, 9), b = rnd(2, 9) * 10;
    const links = a * b;
    let rechts, rechtsText;
    if (Math.random() < 0.4) {
      // rechte Seite: bloße Zahl, manchmal absichtlich daneben
      rechts = links + (Math.random() < 0.4 ? 0 : (rnd(1, 5) * 10 * (Math.random() < 0.5 ? 1 : -1)));
      rechtsText = `${rechts}`;
    } else {
      const c = rnd(2, 9), d = rnd(2, 9) * 10;
      rechts = c * d;
      rechtsText = `${c} · ${d}`;
    }
    const zeichen = links < rechts ? '<' : links > rechts ? '>' : '=';
    return {
      typ: 'mc',
      frage: `${a} · ${b} ___ ${rechtsText}`,
      optionen: ['<', '=', '>'],
      richtigIndex: ['<', '=', '>'].indexOf(zeichen)
    };
  }

  // Zahl in ein Produkt mit einer Zehnerzahl zerlegen: 420 = ▢ · 60
  function genZahlZerlegenFrage() {
    const faktorKlein = rnd(2, 9), faktorZehn = rnd(2, 9) * 10;
    const produkt = faktorKlein * faktorZehn;
    return {
      typ: 'numeric',
      frage: `${produkt} = ▢ · ${faktorZehn}.<br>Welche Zahl fehlt?`,
      antwort: faktorKlein
    };
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
    return { typ: 'mc', frage: `Welche Zahl ist ein Vielfaches von ${n}?`, optionen: alle, richtigIndex: alle.indexOf(richtig) };
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
    return { typ: 'mc', frage: `Welche Zahl ist ein Teiler von ${ziel}?`, optionen: alle, richtigIndex: alle.indexOf(richtig) };
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
      richtigIndex: alle.indexOf(richtig)
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
      antwort: d
    };
  }

  // ---- Diagramme lesen: generiertes Balkendiagramm + Fragen dazu ----
  const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  function genRegentageDiagramm() {
    const indices = [];
    while (indices.length < 5) {
      const i = rnd(0, 11);
      if (!indices.includes(i)) indices.push(i);
    }
    indices.sort((a, b) => a - b);
    return {
      titel: 'Regentage im Monat',
      einheitMehrzahl: 'Regentage',
      kategorien: indices.map(i => monate[i]),
      werte: indices.map(() => rnd(2, 16))
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

  function genSummenFrage(d, chartHtml) {
    const idxA = rnd(0, d.kategorien.length - 1);
    let idxB = rnd(0, d.kategorien.length - 1);
    while (idxB === idxA) idxB = rnd(0, d.kategorien.length - 1);
    return {
      typ: 'numeric',
      lesetext: chartHtml,
      frage: `Wie viele ${d.einheitMehrzahl} gab es in ${d.kategorien[idxA]} und ${d.kategorien[idxB]} zusammen?`,
      antwort: d.werte[idxA] + d.werte[idxB]
    };
  }

  function genMaxMonatFrage(d, chartHtml) {
    const maxWert = Math.max(...d.werte);
    const maxIdx = d.werte.indexOf(maxWert);
    const uebrige = shuffle(d.kategorien.map((_, i) => i).filter(i => i !== maxIdx));
    const gewaehlt = shuffle([maxIdx, ...uebrige.slice(0, 3)]);
    return {
      typ: 'mc',
      lesetext: chartHtml,
      frage: `In welchem Monat gab es die meisten ${d.einheitMehrzahl}?`,
      optionen: gewaehlt.map(i => d.kategorien[i]),
      richtigIndex: gewaehlt.indexOf(maxIdx)
    };
  }

  // Wie viele Monate lagen über einer bestimmten Schwelle?
  function genMehrAlsFrage(d, chartHtml) {
    const sortiert = d.werte.slice().sort((a, b) => a - b);
    const schwelle = sortiert[Math.floor(sortiert.length / 2)];
    const anzahl = d.werte.filter(w => w > schwelle).length;
    return {
      typ: 'numeric',
      lesetext: chartHtml,
      frage: `Wie viele Monate hatten mehr als ${schwelle} ${d.einheitMehrzahl}?`,
      antwort: anzahl
    };
  }

  // Vergleiche zwei Werte aus dem Diagramm mit <, = oder >
  function genDiagrammVergleichFrage(d, chartHtml) {
    const idxA = rnd(0, d.kategorien.length - 1);
    let idxB = rnd(0, d.kategorien.length - 1);
    while (idxB === idxA) idxB = rnd(0, d.kategorien.length - 1);
    const wa = d.werte[idxA], wb = d.werte[idxB];
    const zeichen = wa < wb ? '<' : wa > wb ? '>' : '=';
    return {
      typ: 'mc',
      lesetext: chartHtml,
      frage: `Vergleiche: ${d.kategorien[idxA]} ___ ${d.kategorien[idxB]}`,
      optionen: ['<', '=', '>'],
      richtigIndex: ['<', '=', '>'].indexOf(zeichen)
    };
  }

  // Eine Frage pro Diagramm (statt fest zusammengehoerendem Paar) - so passt die
  // Diagramm-Kategorie zum gleichen "eine Frage pro Auswahl"-Schema wie alle
  // anderen Bereiche der Tagesaufgabe (siehe AUFGABEN_BEREICHE).
  function genDiagrammFrage() {
    const d = genRegentageDiagramm();
    const chartHtml = htmlBalkenDiagramm(d);
    const varianten = [genSummenFrage, genMaxMonatFrage, genMehrAlsFrage, genDiagrammVergleichFrage];
    return varianten[rnd(0, varianten.length - 1)](d, chartHtml);
  }

  // ---- Streifendiagramm/Tabelle: Mädchen/Jungen pro Schuljahr, eine fehlende
  // Zelle (Summe je Schuljahr oder Summe je Zeile) muss berechnet werden. ----
  const schuljahre = ['1. Schuljahr', '2. Schuljahr', '3. Schuljahr', '4. Schuljahr'];

  function genStreifentabelleFrage() {
    const maedchen = schuljahre.map(() => rnd(14, 30));
    const jungen = schuljahre.map(() => rnd(14, 30));

    function tabelleHtml(versteckterTyp, versteckterIndex) {
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

    const i = rnd(0, 3);
    if (Math.random() < 0.5) {
      // "zusammen" fuer ein Schuljahr fehlt
      return {
        typ: 'numeric',
        lesetext: tabelleHtml('zusammen', i),
        frage: `Wie viele Kinder waren insgesamt im ${schuljahre[i]}?`,
        antwort: maedchen[i] + jungen[i]
      };
    }
    // eine Jungen-Zahl fehlt, "zusammen" ist bekannt
    return {
      typ: 'numeric',
      lesetext: tabelleHtml('jungen', i),
      frage: `Im ${schuljahre[i]} waren insgesamt ${maedchen[i] + jungen[i]} Kinder, davon ${maedchen[i]} Mädchen. Wie viele Jungen waren es?`,
      antwort: jungen[i]
    };
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

  function waehleGewichtet(pool, anzahl) {
    const kopie = pool.slice();
    const ausgewaehlt = [];
    for (let i = 0; i < anzahl && kopie.length > 0; i++) {
      const gesamtgewicht = kopie.reduce((s, x) => s + x.gewicht, 0);
      let ziel = Math.random() * gesamtgewicht;
      let idx = 0;
      for (; idx < kopie.length - 1; idx++) {
        ziel -= kopie[idx].gewicht;
        if (ziel <= 0) break;
      }
      ausgewaehlt.push(kopie[idx]);
      kopie.splice(idx, 1);
    }
    return ausgewaehlt;
  }

  function genMalfolgenSession(anzahl) {
    const stats = Storage.getMalfolgenStats();
    const pool = malfolgenAlleFakten().map(fakt => ({ fakt, gewicht: gewichtFuerStat(stats[fakt]) }));
    return waehleGewichtet(pool, anzahl).map(({ fakt }) => {
      const [a, b] = fakt.split('x').map(Number);
      return {
        typ: 'numeric',
        frage: `${a} × ${b} = ?`,
        antwort: a * b,
        aufAntwort: (korrekt) => Storage.meldeMalfolgenErgebnis(fakt, korrekt)
      };
    });
  }

  function starteMalfolgen() {
    const starter = () => App.startQuizSession('mathe', genMalfolgenSession(15), { titel: 'Malfolgen üben', wiederholeFalsche: true });
    App.setLastStarter(starter); starter();
  }

  // ---- Tagespensum: Mix aus allen Aufgabenbereichen, keine Sparten-Auswahl durch
  // Max. Pro Bereich merkt sich Storage.getMatheKategorienStats(), wie oft er dort
  // falsch lag (gleiches Karteikarten-Prinzip wie bei den Malfolgen) - dadurch
  // bekommt Max in kuenftigen Tagesaufgaben automatisch mehr Aufgaben aus seinen
  // Schwaeche-Bereichen, ohne dass er selbst etwas auswaehlen muss. Innerhalb eines
  // Bereichs mit mehreren Generatoren (z. B. "schriftlich") wird gleichverteilt
  // zufaellig einer davon benutzt - nur der Bereich selbst wird gewichtet. ----
  const AUFGABEN_BEREICHE = [
    { kategorie: 'schriftlich', gen: genAddSubFrage },
    { kategorie: 'schriftlich', gen: genSubtraktionOhneUebertrag },
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
    { kategorie: 'aufgabenfamilien', gen: genAufgabenfamilieFrage }
  ];

  function waehleKategorieGewichtet(bereicheProKategorie, stats) {
    const kategorien = Object.keys(bereicheProKategorie);
    const gesamtgewicht = kategorien.reduce((s, k) => s + gewichtFuerStat(stats[k]), 0);
    let ziel = Math.random() * gesamtgewicht;
    for (const k of kategorien) {
      ziel -= gewichtFuerStat(stats[k]);
      if (ziel <= 0) return k;
    }
    return kategorien[kategorien.length - 1];
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
      const frage = generatoren[rnd(0, generatoren.length - 1)]();
      frage.aufAntwort = (korrekt) => Storage.meldeMatheKategorieErgebnis(kategorie, korrekt);
      fragen.push(frage);
    }
    return fragen;
  }

  function starteTagesaufgabe() {
    const starter = () => App.startQuizSession('mathe', genTagesaufgabe(20), { titel: 'Mathe-Tagesaufgabe' });
    App.setLastStarter(starter); starter();
  }

  return { renderMenu, starteTagesaufgabe, starteMalfolgen, renderReihenwahl, speichereMalfolgenReihen };
})();
