// Geometrie (02.11.2026) - Stoff aus Max' Geometrieordner (Klasse 3, 15.9.-6.10.2026): Punkt, Linie, Gerade,
// Strecke, Halbgerade; Senkrechte (schneiden sich im rechten Winkel) und Parallele; Viereck, Trapez,
// Parallelogramm, Rechteck, Quadrat; Dreieck ABC; Strecken messen (z. B. CD = 5,2 cm).
// Uli: "nicht zu schwierig, so wie im Buch/Heft". Zwei Aufgabenarten, je zur Haelfte:
//  - zum Antippen (typ 'mc', mit Bild) - die App prueft selbst,
//  - im Heft zeichnen (typ 'heft', siehe App.renderHeft): ein Satz als Auftrag wie im Buch, nach "Fertig"
//    zeigt die App "So kann es aussehen". Gezeichnet wird bewusst NICHT auf dem Tablet.
const Geometrie = (function () {
  const FARBE = '#E9ECF5', AKZENT = '#FF6B6B', GITTER = 'rgba(233,236,245,0.10)';
  const B = 400, H = 240; // Zeichenflaeche (viewBox)

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const waehle = (liste) => liste[rnd(0, liste.length - 1)];
  function mische(liste) {
    const a = liste.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const komma = (x) => String(Math.round(x * 10) / 10).replace('.', ',');

  // ---------------------------------------------------------------- Zeichnen (SVG)

  let clipNr = 0;
  /** Zeichenflaeche mit zartem Karo wie im Heft; alles wird auf die Flaeche zugeschnitten. */
  function bild(inhalt, breite = 520) {
    const id = 'geo-clip-' + (++clipNr);
    let karo = '';
    for (let x = 20; x < B; x += 20) karo += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${GITTER}" stroke-width="1"/>`;
    for (let y = 20; y < H; y += 20) karo += `<line x1="0" y1="${y}" x2="${B}" y2="${y}" stroke="${GITTER}" stroke-width="1"/>`;
    return `<svg viewBox="0 0 ${B} ${H}" style="width:100%;max-width:${breite}px;display:block;margin:10px auto;" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><clipPath id="${id}"><rect x="0" y="0" width="${B}" height="${H}" rx="10"/></clipPath></defs>` +
      `<g clip-path="url(#${id})">${karo}${inhalt}</g></svg>`;
  }
  const strich = (x1, y1, x2, y2, farbe = FARBE, dicke = 3) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${farbe}" stroke-width="${dicke}" stroke-linecap="round"/>`;
  const schrift = (x, y, t, farbe = FARBE, gross = 20) =>
    `<text x="${x}" y="${y}" font-size="${gross}" font-style="italic" fill="${farbe}" text-anchor="middle" dominant-baseline="middle">${t}</text>`;
  /** Punkt wie im Heft: ein kleines Kreuz mit Grossbuchstaben daneben. */
  const kreuz = (x, y, name = '', dx = 0, dy = -20) =>
    strich(x - 7, y - 7, x + 7, y + 7, AKZENT, 2.5) + strich(x - 7, y + 7, x + 7, y - 7, AKZENT, 2.5) + (name ? schrift(x + dx, y + dy, name) : '');
  /** Zeichen fuer den rechten Winkel: Viertelkreis mit Punkt, zwischen den Richtungen u und v (Einheitsvektoren). */
  function winkel(x, y, u, v, r = 18) {
    const a = [x + u[0] * r, y + u[1] * r], b = [x + v[0] * r, y + v[1] * r];
    const kreuzprodukt = u[0] * v[1] - u[1] * v[0];
    const m = [x + (u[0] + v[0]) * r * 0.42, y + (u[1] + v[1]) * r * 0.42];
    return `<path d="M${a[0]} ${a[1]} A${r} ${r} 0 0 ${kreuzprodukt > 0 ? 1 : 0} ${b[0]} ${b[1]}" fill="none" stroke="${FARBE}" stroke-width="2"/>` +
      `<circle cx="${m[0]}" cy="${m[1]}" r="2.6" fill="${FARBE}"/>`;
  }
  /** Gedreht um die Bildmitte (die Geraden sind lang genug, um immer bis zum Rand zu reichen). */
  const gedreht = (grad, inhalt) => `<g transform="rotate(${grad} ${B / 2} ${H / 2})">${inhalt}</g>`;

  // Die fuenf Grundbegriffe aus dem Heft
  const FIGUREN = {
    Gerade: (grad = rnd(-25, 25)) => gedreht(grad, strich(-200, 120, 600, 120) + schrift(330, 100, 'g')),
    Strecke: (grad = rnd(-25, 25)) => gedreht(grad, strich(110, 120, 290, 120) + kreuz(110, 120, 'A') + kreuz(290, 120, 'B')),
    Halbgerade: (grad = rnd(-25, 25)) => gedreht(grad, strich(120, 120, 600, 120) + kreuz(120, 120, 'M')),
    'krumme Linie': () => `<path d="M40 150 C 100 60, 150 200, 210 110 S 320 60, 360 140" fill="none" stroke="${FARBE}" stroke-width="3" stroke-linecap="round"/>`,
    Punkt: (x = rnd(150, 250), y = rnd(100, 150)) => kreuz(x, y, 'P')
  };

  /** Zwei Geraden g und h: senkrecht, parallel oder schraeg. */
  function zweiGeraden(art, mitWinkel = false, grad = rnd(-30, 30)) {
    let inhalt;
    if (art === 'senkrecht') {
      inhalt = strich(-200, 130, 600, 130) + strich(200, -300, 200, 600) + schrift(345, 112, 'g') + schrift(218, 30, 'h') +
        (mitWinkel ? winkel(200, 130, [1, 0], [0, -1]) : '');
    } else if (art === 'parallel') {
      inhalt = strich(-200, 85, 600, 85) + strich(-200, 165, 600, 165) + schrift(345, 67, 'g') + schrift(345, 147, 'h');
    } else {
      const schraeg = waehle([35, 50, 130, 145]) * Math.PI / 180;
      const dx = Math.cos(schraeg) * 400, dy = -Math.sin(schraeg) * 400;
      inhalt = strich(-200, 130, 600, 130) + strich(200 - dx, 130 - dy, 200 + dx, 130 + dy) + schrift(345, 112, 'g') +
        schrift(200 + Math.cos(schraeg) * 105 + 16, 130 - Math.sin(schraeg) * 105, 'h');
    }
    return gedreht(grad, inhalt);
  }

  /** Vierecke aus dem Heft, Ecken A B C D gegen den Uhrzeigersinn ab unten links. */
  const VIERECKE = {
    Quadrat: () => [[140, 180], [260, 180], [260, 60], [140, 60]],
    Rechteck: () => [[100, 170], [300, 170], [300, 70], [100, 70]],
    Parallelogramm: () => [[80, 175], [260, 175], [320, 65], [140, 65]],
    Trapez: () => [[80, 175], [320, 175], [250, 65], [140, 65]]
  };
  // Massstab der Heft-Beispiele: 1 Karo = 0,5 cm wie im Heft, also 40 Einheiten = 1 cm
  const CM = 40;
  const quadratEcken = (cm) => { const h = cm * CM / 2; return [[200 - h, 120 + h], [200 + h, 120 + h], [200 + h, 120 - h], [200 - h, 120 - h]]; };
  function viereck(name, mitWinkeln = false, ecken = null) {
    const e = ecken || VIERECKE[name]();
    const pfad = `<polygon points="${e.map(p => p.join(',')).join(' ')}" fill="rgba(255,107,107,0.08)" stroke="${FARBE}" stroke-width="3" stroke-linejoin="round"/>`;
    const namen = ['A', 'B', 'C', 'D'].map((n, i) => schrift(e[i][0] + (i === 0 || i === 3 ? -16 : 16), e[i][1] + (i < 2 ? 16 : -14), n)).join('');
    let winkelz = '';
    if (mitWinkeln && (name === 'Quadrat' || name === 'Rechteck')) {
      winkelz = winkel(e[0][0], e[0][1], [1, 0], [0, -1]) + winkel(e[1][0], e[1][1], [0, -1], [-1, 0]) +
        winkel(e[2][0], e[2][1], [-1, 0], [0, 1]) + winkel(e[3][0], e[3][1], [0, 1], [1, 0]);
    }
    return pfad + winkelz + namen;
  }

  /** Lineal (0-10 cm, mm-Striche) mit einer Strecke darueber, die bei 0 beginnt. */
  function linealMitStrecke(laenge) {
    const x0 = 20, cm = 36;
    let s = `<rect x="${x0 - 12}" y="120" width="${10 * cm + 24}" height="72" rx="6" fill="rgba(233,236,245,0.10)" stroke="${FARBE}" stroke-width="1.5"/>`;
    for (let mm = 0; mm <= 100; mm++) {
      const x = x0 + mm * cm / 10;
      const lang = mm % 10 === 0 ? 22 : mm % 5 === 0 ? 15 : 9;
      s += strich(x, 120, x, 120 + lang, FARBE, mm % 10 === 0 ? 1.8 : 1);
      if (mm % 10 === 0) s += `<text x="${x}" y="164" font-size="15" fill="${FARBE}" text-anchor="middle">${mm / 10}</text>`;
    }
    s += `<text x="${x0 + 10 * cm - 2}" y="184" font-size="12" fill="${FARBE}" text-anchor="end">cm</text>`;
    const xe = x0 + laenge * cm;
    s += strich(x0, 90, xe, 90, AKZENT, 3.5) + kreuz(x0, 90, 'C', 0, -22) + kreuz(xe, 90, 'D', 0, -22);
    s += `<line x1="${xe}" y1="97" x2="${xe}" y2="120" stroke="${AKZENT}" stroke-width="1" stroke-dasharray="3 3"/>`;
    return s;
  }

  // ---------------------------------------------------------------- Aufgaben zum Antippen

  const HILFE_BEGRIFFE = '<strong>Gerade:</strong> kein Anfang und kein Ende.<br><strong>Strecke:</strong> zwei Endpunkte, z. B. A und B.<br>' +
    '<strong>Halbgerade:</strong> ein Anfangspunkt, dann geht sie in eine Richtung immer weiter.<br><strong>Linie:</strong> kann auch krumm sein.<br><strong>Punkt:</strong> ein Kreuz mit Großbuchstaben.';

  function mcFrage(frage, richtig, falsche, hilfe, verlaufText, neu) {
    const optionen = mische([richtig, ...falsche]);
    return { typ: 'mc', frage, optionen, richtigIndex: optionen.indexOf(richtig), hilfe, verlaufText, neueVersion: neu };
  }

  function genBegriff() {
    const name = waehle(['Gerade', 'Strecke', 'Halbgerade', 'Gerade', 'Strecke', 'Halbgerade', 'krumme Linie', 'Punkt']);
    const andere = mische(['Gerade', 'Strecke', 'Halbgerade', 'krumme Linie', 'Punkt'].filter(n => n !== name));
    const falsche = name === 'Punkt' || name === 'krumme Linie' ? andere.slice(0, 2) : ['Gerade', 'Strecke', 'Halbgerade'].filter(n => n !== name);
    return mcFrage(`Was ist das?${bild(FIGUREN[name]())}`, name, falsche, HILFE_BEGRIFFE, `Was ist das? (Bild: ${name})`, genBegriff);
  }

  function genSenkrechtParallel() {
    const art = waehle(['senkrecht', 'parallel', 'senkrecht', 'parallel', 'schräg']);
    const richtig = { senkrecht: 'senkrecht zueinander', parallel: 'parallel zueinander', 'schräg': 'keins von beiden' }[art];
    return mcFrage(`Wie liegen die Geraden g und h?${bild(zweiGeraden(art))}`, richtig,
      ['senkrecht zueinander', 'parallel zueinander', 'keins von beiden'].filter(o => o !== richtig),
      '<strong>Senkrecht:</strong> Sie schneiden sich im rechten Winkel (wie ein Plus-Zeichen).<br><strong>Parallel:</strong> Sie haben überall den gleichen Abstand und treffen sich nie.',
      `Wie liegen g und h? (Bild: ${richtig})`, genSenkrechtParallel);
  }

  function genViereckName() {
    const name = waehle(Object.keys(VIERECKE));
    return mcFrage(`Welches Viereck ist das?${bild(viereck(name))}`, name, Object.keys(VIERECKE).filter(n => n !== name),
      '<strong>Quadrat:</strong> 4 gleich lange Seiten, 4 rechte Winkel.<br><strong>Rechteck:</strong> 4 rechte Winkel, gegenüberliegende Seiten gleich lang.<br>' +
      '<strong>Parallelogramm:</strong> 2 Paare parallele Seiten, schief.<br><strong>Trapez:</strong> nur 1 Paar parallele Seiten.',
      `Welches Viereck ist das? (Bild: ${name})`, genViereckName);
  }

  function genMessen() {
    const laenge = rnd(20, 95) / 10; // 2,0 bis 9,5 cm
    const kandidaten = [laenge + 0.1, laenge - 0.1, laenge + 1, laenge - 1, laenge + 0.2]
      .filter(x => x >= 1 && x <= 10 && Math.abs(x - laenge) > 0.05);
    const falsche = mische(kandidaten).slice(0, 3).map(x => komma(x) + ' cm');
    const richtig = komma(laenge) + ' cm';
    return mcFrage(`Wie lang ist die Strecke CD?${bild(linealMitStrecke(laenge), 560)}`, richtig, falsche,
      'Die Strecke beginnt bei 0. Schau, bei welcher Zahl sie aufhört: Die großen Striche sind ganze Zentimeter, ' +
      'die kleinen Striche dazwischen sind Millimeter. 10 Millimeter sind 1 Zentimeter.<br>Beispiel: 5 ganze Zentimeter und 2 kleine Striche = <strong>5,2 cm</strong>.',
      `Strecke am Lineal ablesen (richtig: ${richtig})`, genMessen);
  }

  const MERKSAETZE = [
    ['Wie schneiden sich zwei Senkrechte?', 'im rechten Winkel', ['gar nicht', 'schräg']],
    ['Schneiden sich zwei parallele Geraden?', 'Nein, nie', ['Ja, immer', 'Ja, am Ende']],
    ['Wie viele Endpunkte hat eine Strecke?', '2', ['1', 'keinen']],
    ['Wie viele Endpunkte hat eine Gerade?', 'keinen', ['1', '2']],
    ['Wie viele Anfangspunkte hat eine Halbgerade?', '1', ['2', 'keinen']],
    ['Welche Linie hat einen Anfang und ein Ende?', 'die Strecke', ['die Gerade', 'die Halbgerade']],
    ['Wie viele rechte Winkel hat ein Rechteck?', '4', ['2', 'keinen']],
    ['Wie viele Ecken hat ein Viereck?', '4', ['3', '5']],
    ['Was ist beim Quadrat anders als beim Rechteck?', 'Alle Seiten sind gleich lang.', ['Es hat keine rechten Winkel.', 'Es hat 5 Ecken.']],
    ['Wie viele Paare paralleler Seiten hat ein Trapez?', '1', ['2', 'keins']],
    ['Wie viele Paare paralleler Seiten hat ein Parallelogramm?', '2', ['1', 'keins']],
    ['Wie schreibt man einen Punkt?', 'als Kreuz mit Großbuchstaben, z. B. A', ['als Kreis mit kleinem Buchstaben', 'als Strich mit einer Zahl']],
    ['Wie schreibt man die Länge der Strecke von C nach D?', 'CD = 5,2 cm', ['C + D = 5,2 cm', 'cd = 5,2']],
    ['Wie nennt man eine Gerade?', 'mit einem kleinen Buchstaben, z. B. g', ['mit einem großen Buchstaben, z. B. G', 'mit einer Zahl']]
  ];
  function genMerksatz() {
    const [frage, richtig, falsche] = waehle(MERKSAETZE);
    const f = mcFrage(frage, richtig, falsche, HILFE_BEGRIFFE + '<br><strong>Senkrechte</strong> schneiden sich im rechten Winkel. <strong>Parallele</strong> schneiden sich nie.',
      frage, genMerksatz);
    return f;
  }

  const ANTIPPEN = [genBegriff, genBegriff, genSenkrechtParallel, genSenkrechtParallel, genViereckName, genViereckName, genMessen, genMerksatz, genMerksatz];

  // ---------------------------------------------------------------- Aufgaben fuers Heft

  const HEFT = [
    () => ({ text: 'Zeichne einen Punkt und nenne ihn A.', bsp: kreuz(200, 130, 'A') }),
    () => ({ text: 'Zeichne einen Punkt A. Zeichne dann eine Gerade g durch den Punkt A.',
      bsp: strich(-50, 160, 450, 90) + kreuz(200, 125, 'A', -4, -24) + schrift(360, 85, 'g') }),
    () => {
      const cm = rnd(3, 8);
      return { text: `Zeichne eine Strecke mit den Endpunkten A und B. Sie soll ${cm} cm lang sein.`,
        bsp: strich(200 - cm * CM / 2, 120, 200 + cm * CM / 2, 120) + kreuz(200 - cm * CM / 2, 120, 'A') + kreuz(200 + cm * CM / 2, 120, 'B') +
          schrift(200, 160, `AB = ${cm} cm`, AKZENT, 18) };
    },
    () => ({ text: 'Zeichne eine Halbgerade mit dem Anfangspunkt M.', bsp: strich(90, 130, 600, 130) + kreuz(90, 130, 'M') }),
    () => ({ text: 'Zeichne eine krumme Linie und daneben eine Gerade.',
      bsp: `<path d="M30 160 C 70 70, 110 200, 170 110" fill="none" stroke="${FARBE}" stroke-width="3" stroke-linecap="round"/>` + strich(220, 190, 420, 50) + schrift(370, 60, 'g') }),
    () => ({ text: 'Zeichne zwei Geraden g und h, die senkrecht zueinander sind. Zeichne das Zeichen für den rechten Winkel ein.',
      bsp: zweiGeraden('senkrecht', true) }),
    () => ({ text: 'Zeichne zwei Geraden g und h, die parallel zueinander sind.', bsp: zweiGeraden('parallel') }),
    () => ({ text: 'Zeichne eine Gerade g und einen Punkt P, der nicht auf der Geraden liegt.',
      bsp: strich(-50, 170, 450, 170) + schrift(370, 150, 'g') + kreuz(190, 80, 'P') }),
    () => ({ text: 'Zeichne ein Rechteck ABCD. Zeichne die rechten Winkel ein.', bsp: viereck('Rechteck', true) }),
    () => {
      const cm = rnd(2, 5);
      return { text: `Zeichne ein Quadrat ABCD. Jede Seite soll ${cm} cm lang sein.`,
        bsp: viereck('Quadrat', true, quadratEcken(cm)) + schrift(330, 30, `jede Seite ${cm} cm`, AKZENT, 16) };
    },
    () => ({ text: 'Zeichne drei Punkte A, B und C. Verbinde sie zu einem Dreieck.',
      bsp: `<polygon points="80,180 320,180 230,60" fill="rgba(255,107,107,0.08)" stroke="${FARBE}" stroke-width="3" stroke-linejoin="round"/>` +
        kreuz(80, 180, 'A', -16, 16) + kreuz(320, 180, 'B', 16, 16) + kreuz(230, 60, 'C', 0, -20) }),
    () => ({ text: 'Zeichne eine Strecke CD. Miss sie mit dem Lineal und schreib die Länge dazu, zum Beispiel: CD = 5,2 cm.',
      bsp: strich(56, 130, 344, 130) + kreuz(56, 130, 'C') + kreuz(344, 130, 'D') + schrift(200, 165, 'CD = 7,2 cm', AKZENT, 18) })
  ];

  function heftFrage(macher) {
    const a = macher();
    return {
      typ: 'heft',
      frage: `<span style="font-size:0.85em;opacity:0.8;">✏️ In dein Heft – mit Lineal:</span><br>${a.text}`,
      beispiel: bild(a.bsp),
      verlaufText: `Heft: ${a.text}`,
      neueVersion: () => heftFrage(macher)
    };
  }

  // ---------------------------------------------------------------- Lernkarten fuer die Eltern-App

  /** Dieselben Inhalte als Abhoer-Karten fuer Papa (tools/export_lernkarten.js): Vorderseite Frage, Rueckseite
   *  Antwort mit Bild. Bilder ohne Zufall, damit jeder Export gleich bleibt; Farben passend zum hellen Eltern-App-Design. */
  function lernkartenFuerExport() {
    clipNr = 0;
    const hell = (inhalt) => bild(inhalt, 300).replace(/#E9ECF5/g, 'currentColor').replace(/rgba\(233,236,245,0\.10\)/g, 'rgba(128,128,128,0.22)');
    const k = (front, back) => ({ front, back });
    const ueber = (t) => `<span style="text-decoration:overline">${t}</span>`;
    return [
      { id: 'geo_linien', titel: 'Punkt, Linie, Gerade, Strecke, Halbgerade', karten: [
        k('Was ist ein Punkt? Wie zeichnet man ihn?', 'Man zeichnet ihn als <strong>Kreuz</strong> und nennt ihn mit einem <strong>Großbuchstaben</strong>, z. B. P.' + hell(FIGUREN.Punkt(200, 130))),
        k('Was ist eine Gerade?', 'Eine gerade Linie <strong>ohne Anfang und ohne Ende</strong>. Man nennt sie mit einem kleinen Buchstaben, z. B. g.' + hell(FIGUREN.Gerade(-10))),
        k('Was ist eine Strecke?', 'Die gerade Verbindung zwischen <strong>zwei Punkten</strong>. Sie hat zwei Endpunkte und eine Länge.' + hell(FIGUREN.Strecke(0))),
        k('Was ist eine Halbgerade?', 'Sie hat <strong>einen Anfangspunkt</strong> und geht in eine Richtung immer weiter.' + hell(FIGUREN.Halbgerade(-10))),
        k('Was ist der Unterschied zwischen einer Linie und einer Geraden?', 'Eine <strong>Linie</strong> kann auch krumm sein. Eine <strong>Gerade</strong> ist immer gerade.' + hell(FIGUREN['krumme Linie']())),
        k('Was ist das?' + hell(FIGUREN.Halbgerade(15)), 'Eine <strong>Halbgerade</strong>: Anfangspunkt M, dann geht sie immer weiter.'),
        k('Was ist das?' + hell(FIGUREN.Strecke(-15)), 'Eine <strong>Strecke</strong>: zwei Endpunkte A und B.')
      ] },
      { id: 'geo_senkrecht', titel: 'Senkrecht und parallel', karten: [
        k('Was bedeutet „senkrecht“?', 'Zwei Geraden schneiden sich im <strong>rechten Winkel</strong>.' + hell(zweiGeraden('senkrecht', true, 0))),
        k('Wie zeichnet man einen rechten Winkel ein?', 'Mit einem <strong>Viertelkreis</strong> und einem <strong>Punkt</strong> darin.' + hell(zweiGeraden('senkrecht', true, 20))),
        k('Was bedeutet „parallel“?', 'Die Geraden haben <strong>überall den gleichen Abstand</strong> und schneiden sich nie.' + hell(zweiGeraden('parallel', false, -10))),
        k('Schneiden sich zwei parallele Geraden?', '<strong>Nein, nie.</strong>'),
        k('Wie liegen g und h?' + hell(zweiGeraden('senkrecht', false, -20)), '<strong>Senkrecht</strong> zueinander, sie schneiden sich im rechten Winkel.')
      ] },
      { id: 'geo_vierecke', titel: 'Vierecke', karten: [
        k('Was ist ein Viereck?', 'Eine Figur mit <strong>4 Ecken</strong> und <strong>4 Seiten</strong>. Die Ecken heißen A, B, C, D.'),
        k('Was ist ein Quadrat?', '<strong>4 gleich lange Seiten</strong> und <strong>4 rechte Winkel</strong>.' + hell(viereck('Quadrat', true))),
        k('Was ist ein Rechteck?', '<strong>4 rechte Winkel</strong>. Gegenüberliegende Seiten sind gleich lang und parallel.' + hell(viereck('Rechteck', true))),
        k('Was ist ein Parallelogramm?', '<strong>2 Paare parallele Seiten</strong>, es ist „schief“.' + hell(viereck('Parallelogramm'))),
        k('Was ist ein Trapez?', 'Nur <strong>1 Paar parallele Seiten</strong>.' + hell(viereck('Trapez'))),
        k('Was ist beim Quadrat anders als beim Rechteck?', 'Beim Quadrat sind <strong>alle 4 Seiten gleich lang</strong>.')
      ] },
      { id: 'geo_messen', titel: 'Strecken messen', karten: [
        k('Wie schreibt man die Länge der Strecke von C nach D?', `${ueber('CD')} = 5,2 cm (mit Strich über CD)`),
        k('Wie viele Millimeter sind 1 Zentimeter?', '<strong>10 mm</strong>'),
        k('Wie liest man am Lineal ab, wie lang die Strecke ist?' + hell(linealMitStrecke(5.2)),
          'Die Strecke beginnt bei <strong>0</strong>. 5 ganze Zentimeter und 2 kleine Striche: <strong>5,2 cm</strong>.'),
        k('Worauf muss man beim Messen achten?', 'Das Lineal genau bei der <strong>0</strong> anlegen, nicht am Rand des Lineals.')
      ] }
    ];
  }

  // ---------------------------------------------------------------- Runden

  /** n Aufgaben, abwechselnd zum Antippen und fuers Heft; keine Heft-Aufgabe doppelt, nie zweimal dieselbe Art hintereinander. */
  function genRunde(n) {
    const heft = mische(HEFT);
    const fragen = [];
    let letzte = null;
    for (let i = 0; i < n; i++) {
      if (i % 2 === 1) { fragen.push(heftFrage(heft[(i >> 1) % heft.length])); continue; }
      let gen;
      do { gen = waehle(ANTIPPEN); } while (gen === letzte);
      letzte = gen;
      fragen.push(gen());
    }
    return fragen;
  }

  /** Punkt in der Auswahl auf der Startseite („Such dir heute etwas aus“): 10 Aufgaben, 5 antippen + 5 im Heft. */
  function starteTagesTraining() {
    const starter = () => App.starteFerienQuiz('mathe', n => genRunde(n), {
      titel: 'Geometrie', wiederholeFalsche: true, pensumFach: 'mathe', ferienItem: 'geometrie'
    });
    App.setLastStarter(starter);
    starter();
  }

  /** Freies Üben aus dem Mathe-Menü. */
  function starteTraining() {
    const starter = () => App.startQuizSession('mathe', genRunde(10), { titel: 'Geometrie', wiederholeFalsche: true, pensumFach: 'mathe' });
    App.setLastStarter(starter);
    starter();
  }

  return { starteTagesTraining, starteTraining, genRunde, lernkartenFuerExport, _HEFT: HEFT, _ANTIPPEN: ANTIPPEN };
})();
