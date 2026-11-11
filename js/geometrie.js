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
  function zweiGeraden(art, mitWinkel = false, grad = rnd(-30, 30), namen = ['g', 'h']) {
    const [n1, n2] = namen;
    let inhalt;
    if (art === 'senkrecht') {
      inhalt = strich(-200, 130, 600, 130) + strich(200, -300, 200, 600) + schrift(345, 112, n1) + schrift(218, 30, n2) +
        (mitWinkel ? winkel(200, 130, [1, 0], [0, -1]) : '');
    } else if (art === 'parallel') {
      inhalt = strich(-200, 85, 600, 85) + strich(-200, 165, 600, 165) + schrift(345, 67, n1) + schrift(345, 147, n2);
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

  // ---------------------------------------------------------------- Lernkarten (Tablet + Eltern-App)

  // 11.11.2026 (Uli: "Vorbereitung für Geometrie ändern – Lernkarten wie in meiner Eltern-App, aber gute"):
  // Die alten 22 Abhör-Karten fragten fast nur Definitionen ab ("Was ist ...?", Bild erst auf der Rückseite).
  // Neu nach Lehrplan Thüringen Klasse 4 (zeigen, benennen, beschreiben, unterscheiden, mit dem Geodreieck
  // zeichnen und prüfen) und Fachdidaktik (Kinder erkennen Figuren am typischen Aussehen):
  //  - Erkennen: Bild vorn, Name hinten, Figuren auch gedreht/hochkant/kopfüber
  //  - Ja oder nein: knapp daneben liegende Figuren, die Rückseite nennt das eine fehlende Merkmal
  //  - ein Merkmal je Karte statt ganzer Definitionen
  //  - Prüfen (Geodreieck, Abstand messen) und Tun (im Heft zeichnen, Rückseite "So kann es aussehen")
  // Alle Bilder ohne Zufall, damit Statistik (Karte = Stapel + Nummer) und Export stabil bleiben.
  // WICHTIG: jede Vorderseite hat einen eigenen Wortlaut – die Eltern-App findet Karten über den Text wieder.
  const GEO = '#5BC0EB';
  const flaeche = (e) => `<polygon points="${e.map(p => p.join(',')).join(' ')}" fill="rgba(255,107,107,0.08)" stroke="${FARBE}" stroke-width="3" stroke-linejoin="round"/>`;
  /** Zeichen für den rechten Winkel an Ecke i eines beliebig gedrehten Vierecks. */
  function eckWinkel(e, i) {
    const p = e[i], n = e[(i + 1) % e.length], v = e[(i + e.length - 1) % e.length];
    const ein = (q) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); return [(q[0] - p[0]) / d, (q[1] - p[1]) / d]; };
    return winkel(p[0], p[1], ein(n), ein(v));
  }
  const alleWinkel = (e) => e.map((_, i) => eckWinkel(e, i)).join('');
  /** Gerade g waagerecht und h durch die Mitte im Winkel grad dazu. */
  function gUndH(grad) {
    const w = grad * Math.PI / 180, dx = Math.cos(w) * 400, dy = -Math.sin(w) * 400;
    return strich(-200, 150, 600, 150) + strich(200 - dx, 150 - dy, 200 + dx, 150 + dy) + schrift(350, 132, 'g') +
      schrift(200 + Math.cos(w) * 100 + 18, 150 - Math.sin(w) * 100, 'h');
  }
  /** Geodreieck: lange Kante unten auf Höhe y, Mittellinie senkrecht darüber bei x. */
  function geodreieck(x, y, w = 130) {
    let s = `<polygon points="${x - w},${y} ${x + w},${y} ${x},${y - w}" fill="rgba(91,192,235,0.16)" stroke="${GEO}" stroke-width="2.5" stroke-linejoin="round"/>`;
    for (let i = -6; i <= 6; i++) s += strich(x + i * 20, y, x + i * 20, y - (i % 2 === 0 ? 12 : 7), GEO, 1.2);
    s += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - w}" stroke="${GEO}" stroke-width="2" stroke-dasharray="6 4"/>`;
    return s;
  }
  const abstand = (x, y1, y2, t) => `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${AKZENT}" stroke-width="2" stroke-dasharray="5 4"/>` + schrift(x + 34, (y1 + y2) / 2, t, AKZENT, 16);
  const heftAuftrag = (t) => `<span style="font-size:0.85em;opacity:0.8;">✏️ Zeichne ins Heft:</span><br>${t}`;
  const soKannEs = (b, inhalt, pruefe) => `So kann es aussehen:${b(inhalt)}<strong>Prüfe:</strong> ${pruefe}`;

  /** Alle Stapel; b(inhalt) macht aus der Zeichnung das fertige Bild (dunkel fürs Tablet, hell für die Eltern-App). */
  function kartenstapel(b, zufall = false) {
    const k = (front, back) => ({ front, back });
    // Zeichen-Karten (11.11.2026, Uli: "jedes Mal andere Zeichenwerte"): am Tablet werden Längen, Abstände, Namen und Lage
    // bei jedem Start neu gewürfelt; der Export für die Eltern-App nimmt immer den festen Beispielwert (zweites Argument).
    const z = (liste, fest) => (zufall ? waehle(liste) : fest);
    const cm = (x) => komma(x) + ' cm';
    const zeichenKarten = () => {
      const [e1, e2] = z([['A', 'B'], ['C', 'D'], ['E', 'F'], ['P', 'Q']], ['A', 'B']);
      const lang = z([3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8], 5);
      const xa = 200 - lang * CM / 2, xb = 200 + lang * CM / 2;
      const pn = z(['A', 'B', 'P', 'Q'], 'A'), gn = z(['g', 'h', 'k', 'm'], 'g'), m = z([-0.3, -0.14, 0.14, 0.3], -0.14);
      const hn = z(['M', 'A', 'S', 'P'], 'M'), nachRechts = z([true, false], true);
      const sn = z([['g', 'h'], ['a', 'b'], ['k', 'l']], ['g', 'h']), sgrad = z([-20, -10, 0, 10, 20], 0);
      const pa = z([['g', 'h'], ['a', 'b'], ['k', 'l']], ['g', 'h']), d = z([1, 1.5, 2, 2.5, 3, 3.5, 4], 2), y1 = 120 - d * CM / 2, y2 = 120 + d * CM / 2;
      const qn = z(['P', 'A', 'Q'], 'P'), g2 = z(['g', 'h', 'k'], 'g'), oben = z([true, false], true), px = z([130, 190, 260], 190), gy = oben ? 180 : 70, py = oben ? 80 : 175;
      const ra = z([4, 5, 6, 7], 5), rb = z([2, 2.5, 3, 3.5], 3), w = ra * CM / 2, h = rb * CM / 2;
      const rEcken = [[200 - w, 120 + h], [200 + w, 120 + h], [200 + w, 120 - h], [200 - w, 120 - h]];
      const qs = z([2, 2.5, 3, 3.5, 4, 4.5], 3);
      return [
        k(heftAuftrag(`eine Strecke mit den Endpunkten ${e1} und ${e2}. Sie soll ${cm(lang)} lang sein.`),
          soKannEs(b, strich(xa, 120, xb, 120) + kreuz(xa, 120, e1) + kreuz(xb, 120, e2) + schrift(200, 160, `${e1}${e2} = ${cm(lang)}`, AKZENT, 18), `Miss nach. Sind es genau ${cm(lang)}?`)),
        k(heftAuftrag(`einen Punkt ${pn} und eine Gerade ${gn} durch den Punkt ${pn}.`),
          soKannEs(b, strich(-50, 125 - 250 * m, 450, 125 + 250 * m) + kreuz(200, 125, pn, -4, -24) + schrift(360, 125 + 160 * m - 22, gn), `Geht die Gerade auf <strong>beiden</strong> Seiten über ${pn} hinaus?`)),
        k(heftAuftrag(`eine Halbgerade mit dem Anfangspunkt ${hn}.`),
          soKannEs(b, nachRechts ? strich(90, 130, 600, 130) + kreuz(90, 130, hn) : strich(310, 130, -200, 130) + kreuz(310, 130, hn), `Fängt sie bei ${hn} an und geht nur in <strong>eine</strong> Richtung weiter?`)),
        k(heftAuftrag(`zwei Geraden ${sn[0]} und ${sn[1]}, die senkrecht zueinander sind. Zeichne das Zeichen für den rechten Winkel ein.`),
          soKannEs(b, zweiGeraden('senkrecht', true, sgrad, sn), 'Lege das Geodreieck an. Stimmt der rechte Winkel?')),
        k(heftAuftrag(`zwei Geraden ${pa[0]} und ${pa[1]}, die parallel zueinander sind. Ihr Abstand soll ${cm(d)} sein.`),
          soKannEs(b, strich(-50, y1, 450, y1) + strich(-50, y2, 450, y2) + schrift(350, y1 - 18, pa[0]) + schrift(350, y2 + 18, pa[1]) + abstand(120, y1, y2, cm(d)), `Miss den Abstand an zwei Stellen. Sind es beide Male ${cm(d)}?`)),
        k(heftAuftrag(`eine Gerade ${g2} und einen Punkt ${qn}, der nicht auf ${g2} liegt. Zeichne durch ${qn} eine Senkrechte zu ${g2}.`),
          soKannEs(b, strich(-50, gy, 450, gy) + schrift(370, gy - 18, g2) + strich(px, -50, px, 300) + kreuz(px, py, qn, 20, 0) + winkel(px, gy, [1, 0], [0, -1]), `Geht die neue Gerade durch ${qn}? Ist der Winkel ein rechter Winkel?`)),
        k(heftAuftrag(`ein Rechteck ABCD. Es soll ${cm(ra)} lang und ${cm(rb)} breit sein. Zeichne die rechten Winkel ein.`),
          soKannEs(b, viereck('Rechteck', true, rEcken) + schrift(200, 120, `${cm(ra)} lang, ${cm(rb)} breit`, AKZENT, 15), `Miss nach: ${cm(ra)} und ${cm(rb)}. Hat es 4 rechte Winkel?`)),
        k(heftAuftrag(`ein Quadrat ABCD. Jede Seite soll ${cm(qs)} lang sein.`),
          soKannEs(b, viereck('Quadrat', true, quadratEcken(qs)) + schrift(200, 120, cm(qs), AKZENT, 16), 'Miss alle 4 Seiten nach.'))
      ];
    };
    const ueber = (t) => `<span style="text-decoration:overline">${t}</span>`;
    const Q_SPITZE = [[200, 205], [285, 120], [200, 35], [115, 120]];
    const R_HOCH = [[150, 215], [250, 215], [250, 25], [150, 25]];
    const P_LINKS = [[140, 175], [320, 175], [260, 65], [80, 65]];
    const T_KOPF = [[140, 175], [250, 175], [320, 65], [80, 65]];
    const P_FAST = [[95, 170], [295, 170], [325, 70], [125, 70]];
    const R_FAST = [[120, 180], [280, 180], [280, 60], [120, 60]];
    const V_ALLG = [[90, 180], [300, 165], [270, 60], [150, 90]];
    const rechteck = VIERECKE.Rechteck(), trapez = VIERECKE.Trapez(), parallelogramm = VIERECKE.Parallelogramm();
    const paar = (e, i, j, farbe = AKZENT) => strich(e[i][0], e[i][1], e[(i + 1) % 4][0], e[(i + 1) % 4][1], farbe, 5) + strich(e[j][0], e[j][1], e[(j + 1) % 4][0], e[(j + 1) % 4][1], farbe, 5);
    const streckeSchraeg = strich(90, 180, 300, 70) + kreuz(90, 180, 'A', -16, 14) + kreuz(300, 70, 'B', 16, -14);
    const halbgerade = strich(300, 70, -100, 270) + kreuz(300, 70, 'M', 16, -14);
    return [
      { id: 'geo_erkennen', titel: 'Linien erkennen', karten: [
        k('Was ist das?' + b(streckeSchraeg), 'Eine <strong>Strecke</strong>. Sie hat <strong>zwei Endpunkte</strong>: A und B.'),
        k('Wie heißt diese Linie?' + b(strich(110, 320, 300, -80) + schrift(262, 50, 'g')), 'Eine <strong>Gerade</strong>. Sie hat <strong>keinen Anfang und kein Ende</strong>.'),
        k('Was siehst du hier?' + b(halbgerade), 'Eine <strong>Halbgerade</strong>. Sie fängt bei <strong>M</strong> an und geht in eine Richtung immer weiter.'),
        k('Ist das eine Gerade?' + b(FIGUREN['krumme Linie']()), '<strong>Nein.</strong> Sie ist krumm. Das ist nur eine <strong>Linie</strong>.'),
        k('Wie nennt man das?' + b(kreuz(200, 120, 'P')), 'Einen <strong>Punkt</strong>. Er heißt P.'),
        k('Welche Linie ist hier gezeichnet?' + b(strich(200, 55, 200, 185) + kreuz(200, 55, 'C', 20, 0) + kreuz(200, 185, 'D', 20, 0)), 'Eine <strong>Strecke</strong>. Auch wenn sie nach oben zeigt: <strong>zwei Endpunkte</strong>, C und D.')
      ] },
      { id: 'geo_lage', titel: 'Senkrecht oder parallel?', karten: [
        k('Wie liegen g und h zueinander?' + b(zweiGeraden('senkrecht', false, 25)), '<strong>Senkrecht.</strong> Sie schneiden sich im <strong>rechten Winkel</strong>.' + b(zweiGeraden('senkrecht', true, 25))),
        k('Wie liegen diese beiden Geraden zueinander?' + b(strich(-50, 200, 450, -100) + strich(-50, 290, 450, -10) + schrift(96, 84, 'g') + schrift(330, 96, 'h')), '<strong>Parallel.</strong> Sie haben überall den <strong>gleichen Abstand</strong> und treffen sich nie.'),
        k('Sind g und h senkrecht zueinander?' + b(gUndH(72)), '<strong>Nein.</strong> Sie schneiden sich, aber <strong>nicht im rechten Winkel</strong>. Mit dem Geodreieck siehst du es genau.'),
        k('Sind g und h parallel?' + b(strich(-50, 70, 450, 92) + strich(-50, 172, 450, 136) + schrift(345, 70, 'g') + schrift(345, 162, 'h')), '<strong>Nein.</strong> Der Abstand wird <strong>kleiner</strong>. Irgendwann treffen sie sich.'),
        k('Sind die Strecken a und b parallel?' + b(strich(60, 80, 340, 80) + strich(150, 165, 250, 165) + schrift(330, 62, 'a') + schrift(262, 150, 'b')), '<strong>Ja.</strong> Sie haben überall den gleichen Abstand. Wie <strong>lang</strong> sie sind, ist egal.'),
        k('Wie prüfst du mit dem Geodreieck, ob zwei Geraden senkrecht zueinander sind?', 'Lege die <strong>Mittellinie</strong> genau auf die eine Gerade. Die <strong>lange Kante</strong> muss dann genau auf der anderen liegen.' +
          b(strich(-50, 190, 450, 190) + strich(200, -50, 200, 300) + geodreieck(200, 190) + schrift(352, 172, 'g') + schrift(218, 28, 'h'))),
        k('Wie prüfst du, ob zwei Geraden parallel sind?', 'Miss den <strong>Abstand an zwei Stellen</strong>. Ist er beide Male gleich, sind sie parallel.' +
          b(strich(-50, 80, 450, 80) + strich(-50, 160, 450, 160) + abstand(110, 80, 160, '2 cm') + abstand(270, 80, 160, '2 cm') + schrift(360, 62, 'g') + schrift(360, 142, 'h'))),
        k('Wie sieht das Zeichen für den rechten Winkel aus?', 'Ein <strong>Viertelkreis</strong> mit einem <strong>Punkt</strong> darin.' + b(zweiGeraden('senkrecht', true, 0)))
      ] },
      { id: 'geo_vierecke', titel: 'Vierecke erkennen', karten: [
        k('Welches Viereck ist das?' + b(flaeche(Q_SPITZE) + alleWinkel(Q_SPITZE)), 'Ein <strong>Quadrat</strong> – auch wenn es auf der Spitze steht. <strong>4 gleich lange Seiten</strong> und <strong>4 rechte Winkel</strong>.'),
        k('Wie heißt dieses Viereck?' + b(flaeche(R_HOCH) + alleWinkel(R_HOCH)), 'Ein <strong>Rechteck</strong>. Es hat <strong>4 rechte Winkel</strong> – egal, ob es liegt oder steht.'),
        k('Welchen Namen hat dieses Viereck?' + b(flaeche(P_LINKS)), 'Ein <strong>Parallelogramm</strong>. Es hat <strong>2 Paare</strong> parallele Seiten.' + b(flaeche(P_LINKS) + paar(P_LINKS, 0, 2) + paar(P_LINKS, 1, 3, GEO))),
        k('Was für ein Viereck ist das?' + b(flaeche(T_KOPF)), 'Ein <strong>Trapez</strong>. Es hat <strong>1 Paar</strong> parallele Seiten.' + b(flaeche(T_KOPF) + paar(T_KOPF, 0, 2))),
        k('Ist das ein Rechteck?' + b(flaeche(P_FAST)), '<strong>Nein.</strong> Die Ecken sind <strong>keine rechten Winkel</strong>. Es ist ein Parallelogramm.'),
        k('Ist das ein Quadrat?' + b(flaeche(R_FAST) + alleWinkel(R_FAST)), '<strong>Nein.</strong> Die Seiten sind <strong>nicht alle gleich lang</strong>. Es ist ein Rechteck.'),
        k('Ist das ein Trapez?' + b(flaeche(V_ALLG)), '<strong>Nein.</strong> Hier sind <strong>keine</strong> zwei Seiten parallel. Es ist einfach ein Viereck.')
      ] },
      { id: 'geo_merkmale', titel: 'Merkmale', karten: [
        k('Wie viele Endpunkte hat eine Strecke?', '<strong>2</strong>' + b(FIGUREN.Strecke(0))),
        k('Wie viele Endpunkte hat eine Gerade?', '<strong>Keinen.</strong> Sie geht auf beiden Seiten immer weiter.' + b(FIGUREN.Gerade(-10))),
        k('Wie viele rechte Winkel hat ein Rechteck?', '<strong>4</strong>' + b(flaeche(rechteck) + alleWinkel(rechteck))),
        k('Was ist beim Quadrat anders als beim Rechteck?', 'Beim Quadrat sind <strong>alle 4 Seiten gleich lang</strong>.'),
        k('Wie viele Paare paralleler Seiten hat ein Trapez?', '<strong>1 Paar</strong>' + b(flaeche(trapez) + paar(trapez, 0, 2))),
        k('Wie viele Paare paralleler Seiten hat ein Parallelogramm?', '<strong>2 Paare</strong>' + b(flaeche(parallelogramm) + paar(parallelogramm, 0, 2) + paar(parallelogramm, 1, 3, GEO))),
        k('Wie schneiden sich senkrechte Geraden?', 'Im <strong>rechten Winkel</strong>.' + b(zweiGeraden('senkrecht', true, 0)))
      ] },
      { id: 'geo_schreiben', titel: 'Aufschreiben und messen', karten: [
        k('Wie zeichnet und benennt man einen Punkt?', 'Als <strong>Kreuz</strong> mit einem <strong>Großbuchstaben</strong>, z. B. A.' + b(kreuz(200, 120, 'A'))),
        k('Wie benennt man eine Gerade?', 'Mit einem <strong>kleinen Buchstaben</strong>, z. B. g.' + b(FIGUREN.Gerade(-10))),
        k('Wie schreibt man auf, dass die Strecke von C nach D 5,2 cm lang ist?', `${ueber('CD')} = 5,2 cm<br>(mit einem <strong>Strich über CD</strong>)`),
        k('Wie lang ist die Strecke CD?' + b(linealMitStrecke(5.2)), '<strong>5,2 cm</strong>: 5 ganze Zentimeter und 2 kleine Striche.'),
        k('Lies die Länge der Strecke ab.' + b(linealMitStrecke(3.7)), '<strong>3,7 cm</strong>: 3 ganze Zentimeter und 7 kleine Striche.'),
        k('Wo legst du das Lineal an, wenn du eine Strecke misst?', 'Genau bei der <strong>0</strong> – nicht am Rand des Lineals.')
      ] },
      { id: 'geo_zeichnen', titel: 'Im Heft zeichnen', karten: zeichenKarten() }
    ];
  }

  /** Karten für die Eltern-App (tools/export_lernkarten.js): dieselben Stapel, Farben passend zum hellen Design. */
  function lernkartenFuerExport() {
    clipNr = 0;
    return kartenstapel((inhalt) => bild(inhalt, 300).replace(/#E9ECF5/g, 'currentColor').replace(/rgba\(233,236,245,0\.10\)/g, 'rgba(128,128,128,0.22)'));
  }

  /** Karten eines Stapels fürs Tablet (Heimatkunde-Lernkarten, Gruppe 'geo'). */
  let tabletStapel = null;
  function lernkartenTablet(id) {
    const dunkel = (inhalt) => bild(inhalt, 440);
    // Zeichen-Karten bei jedem Start mit neuen Werten; eine unterbrochene Sitzung behält ihre Werte (liegt gespeichert vor)
    if (id === 'geo_zeichnen') return kartenstapel(dunkel, true).find(x => x.id === id).karten;
    if (!tabletStapel) tabletStapel = kartenstapel(dunkel);
    const s = tabletStapel.find(x => x.id === id);
    return s ? s.karten : [];
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

  return { starteTagesTraining, starteTraining, genRunde, lernkartenFuerExport, lernkartenTablet, _HEFT: HEFT, _ANTIPPEN: ANTIPPEN };
})();
