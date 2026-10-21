// Hof-Farm (Aufbau-/Management-Spiel im Stil von Farming Simulator + Hay Day): reine Daten, keine Logik.
// Max faehrt NICHT selbst: er kauft Landmaschinen und schickt sie als Auftraege auf die Felder; alles laeuft in
// Echtzeit weiter (auch bei geschlossener App). Alle Marken/Modelle sind frei erfunden (Anlehnung an echte Maschinen).
// Weltmasse in Pixeln: 1 Feldzelle = 20 x 20 px = 0,01 ha; 28 px = 1 m (nur fuer Anzeige).
const FarmDaten = (function () {
  const ZELLE = 20;
  const HA_JE_ZELLE = 0.01;
  const PX_JE_M = 28;
  const WELT = { b: 4400, h: 3900 };
  const PREISFAKTOR = 1.6;           // Verkaufspreise (Fruechte/Produkte) gegenueber dem Grundwert

  // ---- Marken (Lackierung) ----
  const MARKEN = {
    hirsch: { name: 'Grünhirsch', c1: '#2e8b3c', c2: '#f1c40f', dach: '#e8ece6' },
    stier: { name: 'Rotstier', c1: '#c0272d', c2: '#222a30', dach: '#e8e4e0' },
    stahl: { name: 'Blaustahl', c1: '#1d5fb0', c2: '#e6ecf2', dach: '#e6ecf2' },
    kron: { name: 'Kronfeld', c1: '#86c13d', c2: '#3a3f44', dach: '#e9efe0' },
    fuchs: { name: 'Orangefuchs', c1: '#f06a1a', c2: '#252a2e', dach: '#ecebe8' },
    wolf: { name: 'Silberwolf', c1: '#aab3bb', c2: '#d4202a', dach: '#eceff1' }
  };

  // ---- Fruechte ----
  // dauer = Sekunden bis zur Reife (Echtzeit), ertrag = t/ha, preis = EUR/t (Grundpreis), saat = EUR/ha, lvl = ab Level
  const FRUECHTE = [
    { id: 'weizen', name: 'Weizen', ernte: 'korn', familie: 'getreide', lvl: 1, dauer: 45 * 60, ertrag: 8.0, preis: 210, saat: 150, farben: { jung: '#7ec850', hoch: '#5fae3a', reif: '#e3b94b', reihe: '#c99a2e' } },
    { id: 'gerste', name: 'Gerste', ernte: 'korn', familie: 'getreide', lvl: 3, dauer: 40 * 60, ertrag: 7.2, preis: 190, saat: 140, farben: { jung: '#82cf56', hoch: '#63b43e', reif: '#e8c65a', reihe: '#cfa63a' } },
    { id: 'raps', name: 'Raps', ernte: 'korn', familie: 'oel', lvl: 5, dauer: 60 * 60, ertrag: 3.8, preis: 480, saat: 100, farben: { jung: '#76c24e', hoch: '#7cc43f', reif: '#f2d21e', reihe: '#d7b30c' } },
    { id: 'mais', name: 'Mais', ernte: 'korn', familie: 'hack', lvl: 7, dauer: 70 * 60, ertrag: 11.0, preis: 170, saat: 170, farben: { jung: '#8bd24e', hoch: '#4fa82e', reif: '#c9b53a', reihe: '#a99422' } },
    { id: 'sonnenblume', name: 'Sonnenblumen', ernte: 'korn', familie: 'oel', lvl: 9, dauer: 55 * 60, ertrag: 3.0, preis: 400, saat: 110, farben: { jung: '#7dc94f', hoch: '#4c9a2c', reif: '#f4b30f', reihe: '#6b4a1c' } },
    { id: 'soja', name: 'Soja', ernte: 'korn', familie: 'huelsen', lvl: 11, dauer: 50 * 60, ertrag: 3.5, preis: 420, saat: 180, farben: { jung: '#86cf5a', hoch: '#56ac3a', reif: '#c9a870', reihe: '#a78650' } },
    { id: 'kartoffel', name: 'Kartoffeln', ernte: 'wurzel', familie: 'hack', lvl: 12, dauer: 65 * 60, ertrag: 38.0, preis: 110, saat: 700, farben: { jung: '#7ccb55', hoch: '#3f9a3a', reif: '#6f9c3c', reihe: '#4f7a28' } },
    { id: 'ruebe', name: 'Zuckerrüben', ernte: 'wurzel', familie: 'hack', lvl: 15, dauer: 80 * 60, ertrag: 75.0, preis: 48, saat: 250, farben: { jung: '#84cd58', hoch: '#3c9633', reif: '#2f8a3a', reihe: '#1f6a2a' } }
  ];

  // ---- Traktoren ----  ps, kmh = Hoechstgeschwindigkeit
  const TRAKTOREN = [
    { id: 't1', lvl: 1, marke: 'hirsch', name: 'Hirsch 5075', ps: 75, kmh: 30, preis: 18000 },
    { id: 't2', lvl: 3, marke: 'fuchs', name: 'Fuchs M95', ps: 95, kmh: 32, preis: 32000 },
    { id: 't3', lvl: 5, marke: 'stier', name: 'Rotstier 105', ps: 105, kmh: 40, preis: 44000 },
    { id: 't4', lvl: 7, marke: 'stahl', name: 'Blaustahl T5.110', ps: 110, kmh: 40, preis: 52000 },
    { id: 't5', lvl: 10, marke: 'hirsch', name: 'Hirsch 6120', ps: 120, kmh: 40, preis: 72000 },
    { id: 't6', lvl: 13, marke: 'kron', name: 'Kronfeld Ares 145', ps: 145, kmh: 50, preis: 96000 },
    { id: 't7', lvl: 17, marke: 'stier', name: 'Rotstier 165 Vario', ps: 165, kmh: 50, preis: 126000 },
    { id: 't8', lvl: 21, marke: 'stahl', name: 'Blaustahl T6.175', ps: 175, kmh: 50, preis: 146000 },
    { id: 't9', lvl: 26, marke: 'hirsch', name: 'Hirsch 6195R', ps: 195, kmh: 50, preis: 176000 },
    { id: 't10', lvl: 31, marke: 'wolf', name: 'Silberwolf 724', ps: 240, kmh: 60, preis: 224000 },
    { id: 't11', lvl: 36, marke: 'stier', name: 'Rotstier Magnum 260', ps: 260, kmh: 50, preis: 260000 },
    { id: 't12', lvl: 42, marke: 'hirsch', name: 'Hirsch 7R 310', ps: 310, kmh: 50, preis: 328000 },
    { id: 't13', lvl: 48, marke: 'wolf', name: 'Silberwolf 939', ps: 390, kmh: 60, preis: 418000 },
    { id: 't14', lvl: 55, marke: 'kron', name: 'Kronfeld Xerion 480', ps: 480, kmh: 50, preis: 540000 },
    { id: 't15', lvl: 63, marke: 'stier', name: 'Rotstier Quad 540', ps: 540, kmh: 40, preis: 650000 },
    { id: 't16', lvl: 72, marke: 'hirsch', name: 'Hirsch 9R 620', ps: 620, kmh: 40, preis: 780000 }
  ].map(t => {
    const f = Math.min(1, (t.ps - 75) / 545);
    return Object.assign(t, { art: 'traktor', l: Math.round(80 + 52 * f), b: Math.round(44 + 28 * f), achs: Math.round(48 + 32 * f) });
  });

  // ---- Geraete (am Traktor) ----  w = Arbeitsbreite px, ps = benoetigte PS, kmh = Arbeitstempo
  const GERAETE = [
    { id: 'g1', lvl: 1, typ: 'grubber', marke: 'fuchs', name: 'Grubber Kompakt 3 m', w: 84, ps: 60, kmh: 15, preis: 6000 },
    { id: 'g2', lvl: 4, typ: 'grubber', marke: 'stahl', name: 'Grubber 4 m', w: 110, ps: 85, kmh: 15, preis: 10500 },
    { id: 'g3', lvl: 9, typ: 'grubber', marke: 'kron', name: 'Grubber 5,5 m', w: 150, ps: 130, kmh: 16, preis: 19000 },
    { id: 'g4', lvl: 18, typ: 'grubber', marke: 'hirsch', name: 'Grubber 7,5 m', w: 200, ps: 190, kmh: 16, preis: 34000 },
    { id: 'g5', lvl: 34, typ: 'grubber', marke: 'wolf', name: 'Grubber 10 m', w: 270, ps: 280, kmh: 18, preis: 62000 },
    { id: 'p1', lvl: 2, typ: 'pflug', marke: 'stier', name: 'Drehpflug 3-schar', w: 72, ps: 75, kmh: 9, preis: 9000 },
    { id: 'p2', lvl: 6, typ: 'pflug', marke: 'hirsch', name: 'Drehpflug 4-schar', w: 96, ps: 110, kmh: 9, preis: 15000 },
    { id: 'p3', lvl: 14, typ: 'pflug', marke: 'kron', name: 'Drehpflug 6-schar', w: 140, ps: 165, kmh: 10, preis: 28000 },
    { id: 'p4', lvl: 27, typ: 'pflug', marke: 'stahl', name: 'Drehpflug 8-schar', w: 190, ps: 240, kmh: 10, preis: 47000 },
    { id: 's1', lvl: 1, typ: 'saeen', marke: 'fuchs', name: 'Sämaschine 3 m', w: 84, ps: 60, kmh: 12, preis: 9500 },
    { id: 's2', lvl: 5, typ: 'saeen', marke: 'stier', name: 'Sämaschine 4 m', w: 110, ps: 85, kmh: 13, preis: 16000 },
    { id: 's3', lvl: 11, typ: 'saeen', marke: 'kron', name: 'Sämaschine 6 m', w: 160, ps: 130, kmh: 14, preis: 31000 },
    { id: 's4', lvl: 22, typ: 'saeen', marke: 'hirsch', name: 'Sämaschine 9 m', w: 240, ps: 200, kmh: 15, preis: 58000 },
    { id: 's5', lvl: 40, typ: 'saeen', marke: 'wolf', name: 'Sämaschine 12 m', w: 310, ps: 300, kmh: 16, preis: 95000 },
    { id: 'd1', lvl: 3, typ: 'duenger', marke: 'stahl', name: 'Düngerstreuer 12 m', w: 170, ps: 70, kmh: 18, preis: 5500 },
    { id: 'd2', lvl: 9, typ: 'duenger', marke: 'kron', name: 'Düngerstreuer 18 m', w: 250, ps: 110, kmh: 20, preis: 11000 },
    { id: 'd3', lvl: 20, typ: 'duenger', marke: 'hirsch', name: 'Düngerstreuer 28 m', w: 380, ps: 180, kmh: 22, preis: 24000 },
    { id: 'w1', lvl: 3, typ: 'walze', marke: 'stier', name: 'Walze 4 m', w: 110, ps: 70, kmh: 14, preis: 7000 },
    { id: 'w2', lvl: 12, typ: 'walze', marke: 'kron', name: 'Walze 6 m', w: 160, ps: 110, kmh: 15, preis: 14000 },
    { id: 'w3', lvl: 25, typ: 'walze', marke: 'wolf', name: 'Walze 9 m', w: 240, ps: 180, kmh: 16, preis: 28000 },
    { id: 'k1', lvl: 4, typ: 'kalk', marke: 'fuchs', name: 'Kalkstreuer 8 m', w: 230, ps: 90, kmh: 14, preis: 9000 },
    { id: 'k2', lvl: 15, typ: 'kalk', marke: 'hirsch', name: 'Kalkstreuer 12 m', w: 340, ps: 140, kmh: 16, preis: 21000 },
    { id: 'sp1', lvl: 5, typ: 'spritze', marke: 'stahl', name: 'Feldspritze 12 m', w: 340, ps: 80, kmh: 16, preis: 12000 },
    { id: 'sp2', lvl: 16, typ: 'spritze', marke: 'kron', name: 'Feldspritze 24 m', w: 480, ps: 140, kmh: 18, preis: 30000 },
    { id: 'sp3', lvl: 32, typ: 'spritze', marke: 'wolf', name: 'Feldspritze 36 m', w: 640, ps: 220, kmh: 20, preis: 60000 }
  ].map(g => Object.assign(g, { art: 'geraet', len: ({ grubber: 54, pflug: 66, saeen: 58, duenger: 42, walze: 46, kalk: 44, spritze: 40 })[g.typ] }));

  // ---- Erntemaschinen (selbstfahrend) ----  w = Schneidwerksbreite px, tank = kg
  const ERNTER = [
    { id: 'h1', lvl: 1, typ: 'maehdrescher', marke: 'kron', name: 'Kronfeld Erntehelfer 1000', w: 100, tank: 7000, kmh: 20, preis: 55000, l: 120, b: 60 },
    { id: 'h2', lvl: 8, typ: 'maehdrescher', marke: 'hirsch', name: 'Hirsch W440', w: 140, tank: 10000, kmh: 24, preis: 105000, l: 136, b: 68 },
    { id: 'h3', lvl: 19, typ: 'maehdrescher', marke: 'stier', name: 'Rotstier Axial 6130', w: 190, tank: 14000, kmh: 26, preis: 190000, l: 150, b: 76 },
    { id: 'h4', lvl: 33, typ: 'maehdrescher', marke: 'kron', name: 'Kronfeld Lexor 780', w: 250, tank: 20000, kmh: 28, preis: 320000, l: 166, b: 84 },
    { id: 'h5', lvl: 50, typ: 'maehdrescher', marke: 'wolf', name: 'Silberwolf Giganto 9', w: 320, tank: 28000, kmh: 30, preis: 520000, l: 182, b: 92 },
    { id: 'r1', lvl: 12, typ: 'rodemaschine', marke: 'fuchs', name: 'Fuchs Roder 2-reihig', w: 60, tank: 8000, kmh: 12, preis: 70000, l: 128, b: 58 },
    { id: 'r2', lvl: 24, typ: 'rodemaschine', marke: 'stahl', name: 'Blaustahl Roder 4-reihig', w: 110, tank: 14000, kmh: 14, preis: 160000, l: 146, b: 70 },
    { id: 'r3', lvl: 38, typ: 'rodemaschine', marke: 'hirsch', name: 'Hirsch Roder 6-reihig', w: 170, tank: 22000, kmh: 16, preis: 300000, l: 168, b: 82 }
  ].map(h => Object.assign(h, { art: 'ernter', achs: Math.round(h.l * 0.62) }));

  // ---- Arbeitsschritte ----
  // geraet = benoetigter Geraetetyp (null = Erntemaschine), von = erlaubte Feldphasen, eff = Arbeitsleistung gegenueber
  // Grundformel, kosten = EUR je Hektar, xp = XP je Hektar. bonus = Ertragsbonus (Feldfeld "bonus")
  const SCHRITTE = {
    grubbern: { id: 'grubbern', name: 'Grubbern', icon: '🌀', geraet: 'grubber', von: ['stoppel'], nach: 'bearbeitet', eff: 1.0, kosten: 0, xp: 30, text: 'Lockert den Boden – danach kann gesät werden.' },
    pfluegen: { id: 'pfluegen', name: 'Pflügen', icon: '⛏', geraet: 'pflug', von: ['stoppel', 'bearbeitet', 'waechst', 'reif'], nach: 'gepfluegt', eff: 1.0, kosten: 0, xp: 40, bonus: 'pf', text: 'Tiefe Bearbeitung: +8 % Ertrag. Auf bewachsenen Feldern bricht der Pflug alles um!' },
    kalken: { id: 'kalken', name: 'Kalken', icon: '⚪', geraet: 'kalk', von: ['stoppel', 'bearbeitet', 'gepfluegt'], nach: null, eff: 1.0, kosten: 180, xp: 25, text: 'Verbessert die Bodenqualität (+25 %).' },
    saeen: { id: 'saeen', name: 'Säen', icon: '🌱', geraet: 'saeen', von: ['bearbeitet', 'gepfluegt'], nach: 'waechst', eff: 1.0, kosten: 0, xp: 35, text: 'Saatgut kostet Geld – je nach Frucht.' },
    duengen: { id: 'duengen', name: 'Düngen', icon: '🧪', geraet: 'duenger', von: ['bearbeitet', 'gepfluegt', 'waechst'], nach: null, eff: 1.0, kosten: 250, xp: 20, bonus: 'dg', text: '+22 % Ertrag.' },
    spritzen: { id: 'spritzen', name: 'Pflanzenschutz', icon: '💧', geraet: 'spritze', von: ['waechst'], nach: null, eff: 1.0, kosten: 120, xp: 20, bonus: 'sp', text: 'Schützt vor Unkraut und Schädlingen: +10 % Ertrag.' },
    walzen: { id: 'walzen', name: 'Walzen', icon: '🛢', geraet: 'walze', von: ['waechst'], nach: null, eff: 1.0, kosten: 40, xp: 15, bonus: 'wa', maxAnteil: 0.5, text: 'Festigt den Boden (nur in der ersten Wachstumshälfte): +6 % Ertrag.' },
    ernten: { id: 'ernten', name: 'Ernten', icon: '🌾', geraet: null, von: ['reif'], nach: 'stoppel', eff: 0.5, kosten: 0, xp: 70, text: 'Der Ertrag kommt ins Silo.' }
  };
  const BONUS = { pf: 0.08, dg: 0.22, sp: 0.10, wa: 0.06 };
  const SCHRITT_REIHENFOLGE = ['grubbern', 'pfluegen', 'kalken', 'saeen', 'duengen', 'spritzen', 'walzen', 'ernten'];
  const ARBEIT_K = 6000;      // Zeitkonstante: Sekunden * (m * km/h) je Hektar
  const ANFANGS_TEMPO = 6;    // erste Arbeiten sind schneller, bis die erste Ernte verkauft ist

  // ---- Felder: x,y in px (Vielfache von 20), c/r = Spalten/Zeilen, lvl = ab Level ----
  const FELD_ROHDATEN = [
    [1500, 1080, 22, 16, 0, 1], [1000, 1080, 22, 16, 5200, 2], [500, 1080, 22, 16, 5000, 2],
    [1500, 640, 22, 20, 5600, 3], [1000, 640, 22, 20, 5400, 4], [500, 640, 22, 20, 5100, 5],
    [1500, 160, 26, 22, 6100, 6], [900, 160, 26, 22, 5900, 8], [300, 160, 26, 22, 5000, 10],
    [2400, 160, 30, 22, 6400, 12], [3100, 160, 30, 22, 6000, 14], [2400, 660, 30, 24, 6600, 16],
    [3100, 660, 30, 24, 6300, 18], [3800, 660, 22, 24, 5700, 20], [200, 1700, 32, 26, 5500, 23],
    [200, 2300, 32, 28, 5200, 26], [1000, 2400, 30, 28, 6500, 29], [1700, 2400, 20, 28, 6900, 32],
    [2400, 2100, 30, 26, 6200, 35], [3100, 2100, 34, 26, 5800, 38], [2400, 2700, 30, 22, 6800, 41],
    [3100, 2700, 34, 22, 6000, 44], [3100, 1700, 34, 18, 5400, 47], [3850, 1700, 24, 18, 5100, 50]
  ];
  const FELDER = FELD_ROHDATEN.map((f, i) => ({
    id: i + 1, name: 'Feld ' + (i + 1), x: f[0], y: f[1], c: f[2], r: f[3], preisHa: f[4], lvl: f[5],
    ha: Math.round(f[2] * f[3] * HA_JE_ZELLE * 10) / 10,
    preis: Math.round(f[2] * f[3] * HA_JE_ZELLE * f[4] / 100) * 100
  }));

  // ---- Strassen / Hof / Gebaeude ----
  const STRASSEN = [
    { x: 0, y: 1500, w: 4400, h: 90 },
    { x: 2150, y: 0, w: 90, h: 3900 }
  ];
  const TIERHOF = { x: 2260, y: 3260, w: 1780, h: 600 };
  const HOF = { x: 1000, y: 1620, w: 1100, h: 640 };
  const PLATZ_LANDHANDEL = { x: 2260, y: 1600, w: 520, h: 200 };
  const GEBAEUDE = [
    { art: 'halle', x: 1040, y: 1650, w: 360, h: 150, dach: '#9a3b2e', name: 'Maschinenhalle' },
    { art: 'haus', x: 1830, y: 1670, w: 170, h: 120, dach: '#b0452f', name: 'Wohnhaus' },
    { art: 'handel', x: 2300, y: 1810, w: 420, h: 150, dach: '#53708a', name: 'Landhandel' },
    { art: 'haendler', x: 2300, y: 1290, w: 460, h: 160, dach: '#d9dde0', name: 'Traktor-Händler' }
  ];
  const SILOS = [{ x: 1580, y: 1720, r: 58 }, { x: 1700, y: 1720, r: 58 }];
  const HOF_TOR = { x: 1800, y: 1620 };   // Ausfahrt Hof -> Strasse
  const STRASSE_Y = 1545;                 // Mitte der Querstrasse

  // ---- Produkte / Verarbeitung ----
  // Guete: Fruechte plus verarbeitete Waren. preis = EUR/t Grundpreis (ohne PREISFAKTOR)
  const WAREN = {
    mehl: { id: 'mehl', name: 'Mehl', icon: '🥣', preis: 380 },
    brot: { id: 'brot', name: 'Brot', icon: '🍞', preis: 950 },
    rapsoel: { id: 'rapsoel', name: 'Rapsöl', icon: '🫒', preis: 1300 },
    sonnenoel: { id: 'sonnenoel', name: 'Sonnenblumenöl', icon: '🌻', preis: 1250 },
    chips: { id: 'chips', name: 'Kartoffelchips', icon: '🥔', preis: 950 },
    zucker: { id: 'zucker', name: 'Zucker', icon: '🍬', preis: 700 },
    eier: { id: 'eier', name: 'Eier', icon: '🥚', preis: 3000 },
    milch: { id: 'milch', name: 'Milch', icon: '🥛', preis: 1300 },
    wolle: { id: 'wolle', name: 'Wolle', icon: '🧶', preis: 9000 },
    honig: { id: 'honig', name: 'Honig', icon: '🍯', preis: 14000 },
    kaese: { id: 'kaese', name: 'Käse', icon: '🧀', preis: 14000 },
    kuchen: { id: 'kuchen', name: 'Kuchen', icon: '🎂', preis: 1200 }
  };
  // Betriebe: Position (Bauplatz), Preis, Level, Rezepte {ein, einKg, aus, ausKg, sek}
  const PRODUKTION = [
    { id: 'muehle', name: 'Mühle', icon: '🌬', lvl: 7, preis: 60000, x: 2820, y: 1630, w: 110, h: 110, dach: '#a77b4f',
      rezepte: [{ id: 'mehl', ein: [{ gut: 'weizen', kg: 1000 }], aus: 'mehl', ausKg: 750, sek: 10 * 60 }] },
    { id: 'baeckerei', name: 'Bäckerei', icon: '🥖', lvl: 10, preis: 90000, x: 2950, y: 1630, w: 110, h: 110, dach: '#c07a4a',
      rezepte: [{ id: 'brot', ein: [{ gut: 'mehl', kg: 500 }], aus: 'brot', ausKg: 450, sek: 15 * 60 },
        { id: 'kuchen', ein: [{ gut: 'mehl', kg: 400 }, { gut: 'eier', kg: 100 }], aus: 'kuchen', ausKg: 600, sek: 20 * 60 }] },
    { id: 'oelmuehle', name: 'Ölmühle', icon: '🫗', lvl: 12, preis: 110000, x: 2820, y: 1770, w: 110, h: 110, dach: '#6f8a4a',
      rezepte: [{ id: 'rapsoel', ein: [{ gut: 'raps', kg: 1000 }], aus: 'rapsoel', ausKg: 380, sek: 20 * 60 }, { id: 'sonnenoel', ein: [{ gut: 'sonnenblume', kg: 1000 }], aus: 'sonnenoel', ausKg: 420, sek: 20 * 60 }] },
    { id: 'chipsfabrik', name: 'Chips-Fabrik', icon: '🍟', lvl: 16, preis: 140000, x: 2950, y: 1770, w: 110, h: 110, dach: '#c9a227',
      rezepte: [{ id: 'chips', ein: [{ gut: 'kartoffel', kg: 2000 }], aus: 'chips', ausKg: 500, sek: 25 * 60 }] },
    { id: 'zuckerfabrik', name: 'Zuckerfabrik', icon: '🏭', lvl: 20, preis: 180000, x: 2820, y: 1910, w: 110, h: 110, dach: '#8a8fa0',
      rezepte: [{ id: 'zucker', ein: [{ gut: 'ruebe', kg: 3000 }], aus: 'zucker', ausKg: 450, sek: 30 * 60 }] },
    { id: 'kaeserei', name: 'Käserei', icon: '🧀', lvl: 14, preis: 120000, x: 2950, y: 1910, w: 110, h: 110, dach: '#d8b04a',
      rezepte: [{ id: 'kaese', ein: [{ gut: 'milch', kg: 1000 }], aus: 'kaese', ausKg: 120, sek: 20 * 60 }] }
  ];
  const PROD_STUFEN = [{ faktor: 1, preis: 0 }, { faktor: 1.5, preis: 0.5 }, { faktor: 2.2, preis: 1.2 }]; // preis = Anteil des Bau-Preises

  // ---- Tiere ----
  // kap = Plaetze je Ausbaustufe, ausbau = Preis der Stufe, kgH = Ertrag je Tier und Stunde, futterKgH = Futter je Tier und Stunde
  // (futter = geeignete Fruechte aus dem Silo). Lager fuer Futter/Ertrag: 36 h bzw. 24 h Produktion.
  const TIERE = [
    { id: 'huehner', name: 'Hühner', tier: 'Huhn', icon: '🐔', stall: 'Hühnerstall', lvl: 6, bau: 8000, tierPreis: 80, kap: [20, 50, 120, 300], ausbau: [0, 6000, 15000, 40000],
      gut: 'eier', kgH: 0.30, futterKgH: 0.12, futter: ['weizen', 'gerste'], automat: 15000,
      haus: { x: 2300, y: 3300, w: 150, h: 110, dach: '#b9783f' }, auslauf: { x: 2300, y: 3430, w: 330, h: 210 } },
    { id: 'bienen', name: 'Bienen', tier: 'Bienenvolk', icon: '🐝', stall: 'Bienenhaus', lvl: 9, bau: 12000, tierPreis: 300, kap: [4, 10, 24, 60], ausbau: [0, 8000, 20000, 50000],
      gut: 'honig', kgH: 0.06, futterKgH: 0, futter: [], automat: 0,
      haus: { x: 3700, y: 3300, w: 110, h: 100, dach: '#d8a93a' }, auslauf: { x: 3700, y: 3420, w: 290, h: 210 },
      text: 'Bienen brauchen kein Futter – und bestäuben Raps und Sonnenblumen: mehr Ertrag!' },
    { id: 'kuehe', name: 'Kühe', tier: 'Kuh', icon: '🐄', stall: 'Kuhstall', lvl: 13, bau: 40000, tierPreis: 1800, kap: [8, 20, 45, 100], ausbau: [0, 30000, 80000, 200000],
      gut: 'milch', kgH: 3.0, futterKgH: 2.0, futter: ['mais', 'gerste'], automat: 30000,
      haus: { x: 2700, y: 3300, w: 330, h: 150, dach: '#8a4a3a' }, auslauf: { x: 2700, y: 3470, w: 450, h: 310 } },
    { id: 'schafe', name: 'Schafe', tier: 'Schaf', icon: '🐑', stall: 'Schafstall', lvl: 17, bau: 30000, tierPreis: 500, kap: [10, 25, 60, 140], ausbau: [0, 15000, 40000, 100000],
      gut: 'wolle', kgH: 0.12, futterKgH: 0.5, futter: ['gerste', 'mais'], automat: 22000,
      haus: { x: 3250, y: 3300, w: 190, h: 120, dach: '#7d6a58' }, auslauf: { x: 3250, y: 3440, w: 390, h: 290 } }
  ];
  const TIER_BY_ID = {};
  TIERE.forEach(t => { TIER_BY_ID[t.id] = t; });
  const BIENEN_BONUS = 0.004;   // Ertragsbonus je Bienenvolk fuer Oelfruechte (max. 12 %)
  const STALL_LAGER_H = 24, FUTTER_LAGER_H = 36;

  // ---- Wetter ----
  // Das Wetter ist eine reine Funktion der Zeit (Stundenbloecke) - so rechnet es auch offline nach und laesst sich vorhersagen.
  // wachs = Wachstumstempo der Pflanzen, arbeit = Dauer-Faktor der Feldarbeit, tiere = Tier-Ertrag
  const WETTER_SLOT_MS = 3600000;
  const WETTER = {
    sonnig: { id: 'sonnig', name: 'Sonnig', icon: '☀️', wachs: 1.0, arbeit: 0.95, tiere: 1.0, text: 'Bestes Wetter zum Arbeiten.' },
    bewoelkt: { id: 'bewoelkt', name: 'Bewölkt', icon: '⛅', wachs: 1.0, arbeit: 1.0, tiere: 1.0, text: 'Ganz normales Wetter.' },
    regen: { id: 'regen', name: 'Regen', icon: '🌧️', wachs: 1.3, arbeit: 1.2, tiere: 1.0, text: 'Die Pflanzen wachsen schneller, Maschinen arbeiten langsamer.' },
    gewitter: { id: 'gewitter', name: 'Gewitter', icon: '⛈️', wachs: 1.15, arbeit: 1.45, tiere: 0.95, text: 'Viel Regen – die Arbeit geht nur zäh voran.' },
    hitze: { id: 'hitze', name: 'Hitze', icon: '🔥', wachs: 0.7, arbeit: 1.0, tiere: 0.85, text: 'Die Pflanzen wachsen langsamer, Tiere geben weniger. Mit Beregnung bleibt das Feld fit!' },
    nebel: { id: 'nebel', name: 'Nebel', icon: '🌫️', wachs: 1.0, arbeit: 1.15, tiere: 1.0, text: 'Schlechte Sicht – die Arbeit dauert etwas länger.' },
    schnee: { id: 'schnee', name: 'Frost & Schnee', icon: '❄️', wachs: 0.55, arbeit: 1.25, tiere: 0.9, text: 'Es wächst kaum etwas, die Arbeit ist mühsam.' }
  };
  // Gewichte je Jahreszeit (nach echtem Kalendermonat)
  const WETTER_GEWICHTE = {
    fruehling: { sonnig: 30, bewoelkt: 22, regen: 28, gewitter: 7, hitze: 2, nebel: 8, schnee: 3 },
    sommer: { sonnig: 42, bewoelkt: 15, regen: 12, gewitter: 10, hitze: 18, nebel: 3, schnee: 0 },
    herbst: { sonnig: 18, bewoelkt: 27, regen: 28, gewitter: 4, hitze: 0, nebel: 22, schnee: 1 },
    winter: { sonnig: 15, bewoelkt: 30, regen: 8, gewitter: 0, hitze: 0, nebel: 15, schnee: 32 }
  };
  const WETTERSTATION = [{ preis: 8000, lvl: 5, slots: 3, name: 'Wetterstation' }, { preis: 35000, lvl: 15, slots: 8, name: 'Wetterstation Pro' }];
  const BEREGNUNG_PREIS_HA = 1500, BEREGNUNG_LVL = 8;

  // ---- Erfolge ----
  // wert = Name der Fortschrittsgroesse (siehe FarmModell.erfolgWert), einheit nur fuer die Anzeige.
  // Stufen: ziel erreicht -> Belohnung (geld, xp) kann abgeholt werden.
  const st3 = (z, g) => z.map((ziel, i) => ({ ziel, geld: g[i], xp: Math.round(g[i] / 20) }));
  const ERFOLGE = [
    { id: 'ernte', kat: 'Anbau', icon: '🌾', name: 'Erntehelfer', text: 'Ernte insgesamt', wert: 'ernteT', einheit: 't', stufen: st3([10, 100, 1000, 10000], [1500, 8000, 40000, 200000]) },
    { id: 'jobs', kat: 'Anbau', icon: '🚜', name: 'Fleißige Maschinen', text: 'Arbeitsaufträge erledigt', wert: 'jobs', einheit: '', stufen: st3([5, 50, 250, 1000], [1500, 8000, 40000, 200000]) },
    { id: 'gruen', kat: 'Anbau', icon: '🧪', name: 'Grüner Daumen', text: 'Düngen, Spritzen und Walzen', wert: 'gruen', einheit: '', stufen: st3([5, 25, 100, 400], [1500, 6000, 25000, 100000]) },
    { id: 'pflug', kat: 'Anbau', icon: '⛏', name: 'Tiefgründig', text: 'Felder gepflügt', wert: 'pflug', einheit: '', stufen: st3([3, 20, 60], [1500, 8000, 30000]) },
    { id: 'fruechte', kat: 'Anbau', icon: '🥕', name: 'Bunter Anbau', text: 'Verschiedene Früchte geerntet', wert: 'fruechte', einheit: '', stufen: st3([2, 4, 6, 8], [2000, 8000, 25000, 80000]) },
    { id: 'felder', kat: 'Hof', icon: '🏞', name: 'Landbesitzer', text: 'Felder besitzen', wert: 'felder', einheit: '', stufen: st3([2, 5, 10, 24], [2000, 10000, 50000, 300000]) },
    { id: 'maschinen', kat: 'Hof', icon: '🚛', name: 'Fuhrpark', text: 'Maschinen besitzen', wert: 'maschinen', einheit: '', stufen: st3([5, 10, 20, 40], [2000, 10000, 50000, 250000]) },
    { id: 'kraft', kat: 'Hof', icon: '💪', name: 'Kraftprotz', text: 'PS des stärksten Traktors', wert: 'kraft', einheit: 'PS', stufen: st3([120, 240, 390, 620], [3000, 15000, 70000, 300000]) },
    { id: 'repariert', kat: 'Hof', icon: '🔧', name: 'Werkstatt-Profi', text: 'Maschinen repariert', wert: 'repariert', einheit: '', stufen: st3([1, 10, 50], [500, 4000, 20000]) },
    { id: 'fahrer', kat: 'Hof', icon: '👨‍🌾', name: 'Der Chef', text: 'Fahrer eingestellt', wert: 'fahrer', einheit: '', stufen: st3([1, 3, 6], [3000, 25000, 120000]) },
    { id: 'verkauft', kat: 'Handel', icon: '💶', name: 'Händler', text: 'Verkauft für insgesamt', wert: 'verkauft', einheit: '€', stufen: st3([10000, 100000, 1000000, 10000000], [2000, 10000, 60000, 400000]) },
    { id: 'geld', kat: 'Handel', icon: '🏦', name: 'Reich!', text: 'Höchster Kontostand', wert: 'maxGeld', einheit: '€', stufen: st3([100000, 1000000, 10000000], [5000, 40000, 300000]) },
    { id: 'auftraege', kat: 'Handel', icon: '📋', name: 'Zuverlässiger Lieferant', text: 'Aufträge erfüllt', wert: 'auftraege', einheit: '', stufen: st3([3, 15, 50, 150], [2000, 10000, 40000, 150000]) },
    { id: 'prod', kat: 'Handel', icon: '🏭', name: 'Hofmanufaktur', text: 'Chargen produziert', wert: 'prod', einheit: '', stufen: st3([3, 25, 100], [2500, 15000, 60000]) },
    { id: 'betriebe', kat: 'Handel', icon: '🏗', name: 'Unternehmer', text: 'Betriebe gebaut', wert: 'betriebe', einheit: '', stufen: st3([1, 3, 6], [3000, 20000, 100000]) },
    { id: 'tiere', kat: 'Tiere', icon: '🐾', name: 'Tierfreund', text: 'Tiere auf dem Hof', wert: 'tiere', einheit: '', stufen: st3([10, 50, 200, 800], [1500, 8000, 40000, 200000]) },
    { id: 'tierarten', kat: 'Tiere', icon: '🦓', name: 'Ganzer Zoo', text: 'Verschiedene Tierarten', wert: 'tierarten', einheit: '', stufen: st3([2, 3, 4], [4000, 20000, 60000]) },
    { id: 'eingesammelt', kat: 'Tiere', icon: '🧺', name: 'Frühstücksservice', text: 'Mal Tierprodukte eingesammelt', wert: 'eingesammelt', einheit: '', stufen: st3([5, 30, 100], [1500, 8000, 30000]) },
    { id: 'wetter', kat: 'Natur', icon: '🌦', name: 'Wetterfrosch', text: 'Verschiedene Wetterlagen erlebt', wert: 'wetter', einheit: '', stufen: st3([3, 5, 7], [2000, 10000, 40000]) },
    { id: 'level', kat: 'Natur', icon: '⭐', name: 'Aufsteiger', text: 'Level erreicht', wert: 'level', einheit: '', stufen: st3([5, 15, 30, 50, 70], [2000, 10000, 40000, 150000, 400000]) },
    { id: 'tage', kat: 'Natur', icon: '📅', name: 'Treuer Landwirt', text: 'Verschiedene Tage gespielt', wert: 'tage', einheit: '', stufen: st3([3, 7, 14, 30, 60], [2000, 6000, 15000, 50000, 150000]) }
  ];

  // ---- Sammelalbum ----
  // Jede Seite hat Karten; eine Karte wird freigeschaltet, sobald man das Ding das erste Mal hat/erlebt (siehe FarmModell.album*).
  // fakt = Wissenstext (fuer Max, 4. Klasse); hinweis = wie man die Karte bekommt.
  const FAKTEN = {
    weizen: 'Aus Weizen wird Mehl für Brot, Brötchen und Nudeln. In Deutschland ist er das wichtigste Getreide.',
    gerste: 'Gerste wird vor allem als Futter für Tiere angebaut. Aus manchen Sorten macht man Malz – für Bier.',
    raps: 'Rapsfelder leuchten im Frühling knallgelb. Aus den Körnern wird Öl gepresst – zum Kochen und für Margarine.',
    mais: 'Mais kann bis zu drei Meter hoch werden! Er wird als Futter, für Biogas und als Gemüse angebaut.',
    sonnenblume: 'Junge Sonnenblumen drehen ihre Blüten mit der Sonne mit. Aus den Kernen wird Öl gemacht.',
    soja: 'Soja ist eine Hülsenfrucht. Aus den Bohnen macht man Tofu, Sojamilch und Tierfutter.',
    kartoffel: 'Kartoffeln wachsen unter der Erde. Aus den Knollen werden Pommes, Chips und Salzkartoffeln.',
    ruebe: 'Aus Zuckerrüben wird Zucker gewonnen – bei uns kommt der meiste Haushaltszucker aus Rüben.',
    huehner: 'Eine Henne legt bis zu 300 Eier im Jahr. Hühner scharren gern im Boden nach Futter.',
    bienen: 'Ein Bienenvolk hat im Sommer bis zu 50.000 Bienen. Sie bestäuben Blüten – ohne sie gäbe es viel weniger Obst.',
    kuehe: 'Eine Kuh frisst am Tag bis zu 50 Kilo Futter und gibt etwa 25 Liter Milch.',
    schafe: 'Schafe werden einmal im Jahr geschoren. Aus der Wolle entstehen Pullover, Socken und Decken.',
    sonnig: 'Sonnenschein ist gut für Pflanzen: Sie bauen daraus mit ihren Blättern Zucker und wachsen.',
    bewoelkt: 'Wolken bestehen aus winzigen Wassertröpfchen. Sie halten die Sonne ein bisschen zurück.',
    regen: 'Regen versorgt die Felder mit Wasser. Zu viel Nässe macht den Boden aber matschig für schwere Maschinen.',
    gewitter: 'Beim Gewitter blitzt und donnert es. Den Donner hörst du später als den Blitz, weil Licht schneller ist als Schall.',
    hitze: 'Bei großer Hitze verdunstet viel Wasser. Pflanzen und Tiere brauchen dann besonders viel zu trinken.',
    nebel: 'Nebel ist eine Wolke direkt am Boden. Er entsteht oft in kühlen Nächten und am Morgen.',
    schnee: 'Schnee besteht aus gefrorenem Wasser. Bei Frost ruht die Natur – Pflanzen wachsen kaum.',
    mehl: 'Mehl entsteht, wenn Körner in der Mühle ganz fein gemahlen werden.',
    brot: 'In Deutschland gibt es über 3000 verschiedene Brotsorten – ein Weltrekord.',
    rapsoel: 'Rapsöl ist ein beliebtes Speiseöl. Es wird aus den kleinen schwarzen Rapskörnern gepresst.',
    sonnenoel: 'Sonnenblumenöl ist hellgelb und wird gern zum Braten und für Salate benutzt.',
    chips: 'Für Chips werden Kartoffeln in hauchdünne Scheiben geschnitten und knusprig gebacken.',
    zucker: 'Zucker aus Rüben sieht genauso aus und schmeckt genauso wie Zucker aus Zuckerrohr.',
    eier: 'Die Farbe der Eierschale hängt von der Hühnerrasse ab – nicht davon, wie gesund das Ei ist.',
    milch: 'Aus Milch macht man Käse, Joghurt, Butter und Quark.',
    wolle: 'Wolle wärmt so gut, weil zwischen den feinen Fasern viel Luft steckt.',
    honig: 'Für ein Glas Honig fliegen Bienen viele tausend Kilometer von Blüte zu Blüte.',
    kaese: 'Käse entsteht aus Milch, die dick wird und reift. Es gibt weit über 1000 Sorten.',
    kuchen: 'Für Kuchen werden Mehl, Eier und Zucker zu einem Teig verrührt und gebacken.',
    muehle: 'In einer Mühle zerkleinern Mahlsteine oder Walzen das Korn zu Mehl.',
    baeckerei: 'Bäcker stehen sehr früh auf, damit das Brot frisch zum Frühstück beim Kunden ist.',
    oelmuehle: 'In der Ölmühle werden Samen gepresst. Das Öl fließt heraus, der Rest wird Tierfutter.',
    chipsfabrik: 'In der Chips-Fabrik werden Kartoffeln gewaschen, geschält, in Scheiben geschnitten und gebacken.',
    zuckerfabrik: 'In der Zuckerfabrik werden Rüben gewaschen, zerschnitten und mit heißem Wasser ausgelaugt – so entsteht der Zuckersaft.',
    kaeserei: 'In der Käserei wird Milch erwärmt, dick gelegt und zu Käse geformt.'
  };
  const ALBUM = [
    { id: 'traktoren', kat: 'maschinen', name: 'Traktoren', icon: '🚜', bonus: { geld: 60000, xp: 3000 }, hinweis: 'Kaufe diesen Traktor im Händler.', karten: () => TRAKTOREN.map(t => ({ id: t.id, name: t.name, def: t.id })) },
    { id: 'geraete', kat: 'maschinen', name: 'Geräte', icon: '🔧', bonus: { geld: 60000, xp: 3000 }, hinweis: 'Kaufe dieses Gerät im Händler.', karten: () => GERAETE.map(t => ({ id: t.id, name: t.name, def: t.id })) },
    { id: 'ernter', kat: 'maschinen', name: 'Erntemaschinen', icon: '🌾', bonus: { geld: 40000, xp: 2000 }, hinweis: 'Kaufe diese Erntemaschine im Händler.', karten: () => ERNTER.map(t => ({ id: t.id, name: t.name, def: t.id })) },
    { id: 'fruechte', kat: 'fruechte', name: 'Früchte', icon: '🥕', bonus: { geld: 25000, xp: 1500 }, hinweis: 'Ernte diese Frucht zum ersten Mal.', karten: () => FRUECHTE.map(f => ({ id: f.id, name: f.name, icon: f.ernte === 'wurzel' ? '🥔' : '🌾', fakt: FAKTEN[f.id] })) },
    { id: 'tiere', kat: 'tiere', name: 'Tiere', icon: '🐾', bonus: { geld: 20000, xp: 1500 }, hinweis: 'Kaufe diese Tierart im Tierhof.', karten: () => TIERE.map(t => ({ id: t.id, name: t.name, icon: t.icon, fakt: FAKTEN[t.id] })) },
    { id: 'waren', kat: 'waren', name: 'Waren', icon: '📦', bonus: { geld: 30000, xp: 2000 }, hinweis: 'Stelle diese Ware her oder sammle sie ein.', karten: () => Object.keys(WAREN).map(id => ({ id, name: WAREN[id].name, icon: WAREN[id].icon, fakt: FAKTEN[id] })) },
    { id: 'betriebe', kat: 'betriebe', name: 'Betriebe', icon: '🏭', bonus: { geld: 40000, xp: 2000 }, hinweis: 'Baue diesen Betrieb.', karten: () => PRODUKTION.map(b => ({ id: b.id, name: b.name, icon: b.icon, fakt: FAKTEN[b.id] })) },
    { id: 'wetter', kat: 'wetter', name: 'Wetter', icon: '🌦', bonus: { geld: 15000, xp: 1000 }, hinweis: 'Erlebe dieses Wetter, während du spielst.', karten: () => Object.keys(WETTER).map(id => ({ id, name: WETTER[id].name, icon: WETTER[id].icon, fakt: FAKTEN[id] })) }
  ];

  // ---- Lager / Fahrer ----
  const SILO_STUFEN = [{ kg: 40000, preis: 0 }, { kg: 80000, preis: 15000 }, { kg: 150000, preis: 40000 }, { kg: 300000, preis: 90000 },
    { kg: 600000, preis: 200000 }, { kg: 1200000, preis: 450000 }, { kg: 2500000, preis: 900000 }];
  const FAHRER = [{ preis: 12000, lvl: 8 }, { preis: 30000, lvl: 14 }, { preis: 65000, lvl: 22 }, { preis: 130000, lvl: 32 },
    { preis: 260000, lvl: 44 }, { preis: 520000, lvl: 58 }];

  // ---- Start ----
  const STARTGELD = 30000;
  const STARTFLOTTE = ['t1', 'g1', 's1', 'h1'];
  const STARTFELDER = [1];
  const PREIS_MIN = 0.72, PREIS_MAX = 1.38;

  // ---- Level ----
  function xpFuerLevel(l) { return 120 + 60 * l; }   // XP von Level l nach l+1

  const BY_ID = {};
  [].concat(TRAKTOREN, GERAETE, ERNTER).forEach(d => { BY_ID[d.id] = d; });
  const FRUCHT_BY_ID = {};
  FRUECHTE.forEach(f => { FRUCHT_BY_ID[f.id] = f; });
  const PROD_BY_ID = {};
  PRODUKTION.forEach(p => { PROD_BY_ID[p.id] = p; });

  function def(id) { return BY_ID[id]; }
  function frucht(id) { return FRUCHT_BY_ID[id]; }
  function feld(id) { return FELDER[id - 1]; }
  function betrieb(id) { return PROD_BY_ID[id]; }
  function tier(id) { return TIER_BY_ID[id]; }
  // Gut (Frucht oder Ware): { id, name, icon, preis }
  function gut(id) {
    if (FRUCHT_BY_ID[id]) { const f = FRUCHT_BY_ID[id]; return { id, name: f.name, icon: f.ernte === 'wurzel' ? '🥔' : '🌾', preis: f.preis }; }
    return WAREN[id] || { id, name: id, icon: '📦', preis: 100 };
  }
  function alleGueter() { return FRUECHTE.map(f => f.id).concat(Object.keys(WAREN)); }

  return {
    ZELLE, HA_JE_ZELLE, PX_JE_M, WELT, PREISFAKTOR, MARKEN, FRUECHTE, TRAKTOREN, GERAETE, ERNTER, SCHRITTE, SCHRITT_REIHENFOLGE, BONUS,
    ARBEIT_K, ANFANGS_TEMPO, FELDER, STRASSEN, HOF, PLATZ_LANDHANDEL, GEBAEUDE, SILOS, HOF_TOR, STRASSE_Y, WAREN, PRODUKTION, PROD_STUFEN,
    ERFOLGE, ALBUM, TIERHOF, TIERE, BIENEN_BONUS, STALL_LAGER_H, FUTTER_LAGER_H, WETTER_SLOT_MS, WETTER, WETTER_GEWICHTE, WETTERSTATION, BEREGNUNG_PREIS_HA, BEREGNUNG_LVL,
    SILO_STUFEN, FAHRER, STARTGELD, STARTFLOTTE, STARTFELDER, PREIS_MIN, PREIS_MAX, xpFuerLevel,
    def, frucht, feld, betrieb, gut, alleGueter, tier
  };
})();
