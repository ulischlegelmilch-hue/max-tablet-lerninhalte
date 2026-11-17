/* ZENIT – Mondlandung (Auftrag 3, Apollo 11). Seitenansicht, flacher Mondboden, x in Metern in Flugrichtung.
 * Wie 1969 im halbautomatischen Modus: Der Bordcomputer regelt Schub und Lage, damit die Fähre so schnell sinkt
 * und seitwärts fliegt, wie der Kommandant es vorgibt. Max gibt Sinken und Seitwärts vor, der Computer hält es.
 * Belegte Werte (QUELLEN.md): Abstiegstriebwerk 45,04 kN, regelbar ab 10 %, Isp 311 s; Breite mit Beinen 9,4 m;
 * Fühler 1,7 m. Mondschwerkraft 1,62 m/s² (rund ein Sechstel der Erde). Gelände, Startpunkt, Treibstoff = Spielwerte. */
(function (wurzel) {
  const G = 1.62, G0 = 9.80665;
  const DPS = { tmax: 45040, min: 0.1, isp: 311 };
  const LEER = 6830;              // kg: Aufstiegsstufe voll (4,7 t) + Abstiegsstufe leer (rund 2,1 t)
  const BREITE = 9.4, FUSS = 4.3, FUEHLER = 1.7;
  const NEIG_MAX = 30 * Math.PI / 180, NEIG_RATE = 22 * Math.PI / 180;
  const GLEIT = 30 * Math.PI / 180;   // Anflugwinkel des Computers
  const UEBERNAHME = 210;             // m: hier übernimmt der Kommandant
  const START = { h: 2000, treib: 950 };

  // ---------- Gelände (fest, damit man es lernen kann)
  let saat = 7;
  const zufall = () => { saat = (saat * 16807) % 2147483647; return saat / 2147483647; };
  const KRATER = [
    { x: -720, r: 26, d: 7 }, { x: -520, r: 14, d: 4 }, { x: -385, r: 9, d: 2.5 }, { x: -300, r: 20, d: 5 },
    { x: 0, r: 45, d: 14, gross: true },                 // der große Krater (1969: „West“), umgeben von Felsbrocken
    { x: 488, r: 17, d: 5 }, { x: 548, r: 9, d: 2.5 }, { x: 700, r: 24, d: 6 }, { x: 905, r: 12, d: 3 },
  ];
  const ZONEN = [                       // Felsbrocken: Bereich, Abstand, Größe
    { von: -1400, bis: -720, ab: 13, r0: .12, r1: .55 },
    { von: -720, bis: -170, ab: 4.2, r0: .3, r1: 1.2 },   // hier will der Computer hin: übersät mit Brocken
    { von: -170, bis: 175, ab: 2.6, r0: .35, r1: 1.9 },   // Brockenfeld um den großen Krater
    { von: 175, bis: 232, ab: 8, r0: .15, r1: .6 },
    { von: 232, bis: 425, ab: 15, r0: .06, r1: .25 },     // flach und frei
    { von: 425, bis: 1400, ab: 11, r0: .1, r1: .6 },
  ];
  const STEINE = [];
  for (const z of ZONEN) for (let x = z.von; x < z.bis; x += z.ab * (.5 + zufall())) {
    const k = KRATER.find(k => !k.gross && Math.abs(x - k.x) < k.r * .85); if (k) continue;     // nicht in kleinen Kratern (im großen liegt Geröll)
    STEINE.push({ x, r: z.r0 + (z.r1 - z.r0) * Math.pow(zufall(), 1.6) });
  }
  function hoehe(x) {
    let h = 1.2 * Math.sin(x / 37) + .8 * Math.sin(x / 91 + 1) + .45 * Math.sin(x / 13 + 2);
    for (const k of KRATER) {
      const dx = Math.abs(x - k.x), e = .12 * k.d;
      if (dx < k.r) h += -k.d + (k.d + e) * (dx / k.r) ** 2;
      else if (dx < 2 * k.r) h += e * (1 - (dx - k.r) / k.r) ** 2;
    }
    return h;
  }
  /** Taugt der Boden bei x zum Landen? Neigung zwischen den Füßen und größter Stein unter der Fähre */
  function platz(x) {
    const neig = Math.atan(Math.abs(hoehe(x + FUSS) - hoehe(x - FUSS)) / (2 * FUSS)) * 180 / Math.PI;
    let stein = 0; for (const s of STEINE) if (Math.abs(s.x - x) < BREITE / 2 + s.r) stein = Math.max(stein, s.r);
    const grund = stein > .35 ? 'stein' : neig > 8 ? 'steil' : 'frei';
    return { ok: grund === 'frei', grund, neig, stein };
  }

  // ---------- Fähre
  function neu() {
    const dHor = (START.h - UEBERNAHME) / Math.tan(GLEIT) + UEBERNAHME / Math.tan(GLEIT);
    const S = { x: -dHor, y: START.h, vx: 0, vy: 0, a: 0, treib: START.treib, seitSoll: 0, sinkSoll: 0, schub: 0,
      t: 0, auto: true, kontakt: false, unten: false, leer: false };
    computerSoll(S); S.vx = S.seitSoll; S.vy = -S.sinkSoll; S.a = -.3;
    return S;
  }
  const klon = S => JSON.parse(JSON.stringify(S));
  const masse = S => LEER + S.treib;
  const radar = S => S.y - hoehe(S.x);
  const verbrauch = N => N / (DPS.isp * G0);
  /** Treibstoff in Sekunden Schweben (wie die Anzeige 1969 in Sekunden zählte) */
  const restSek = S => S.treib / verbrauch(masse(S) * G);
  /** Computer im Anflug: auf geradem Gleitpfad zum Ziel bei x = 0, mitten ins Brockenfeld */
  function computerSoll(S) {
    const h = Math.max(0, radar(S)), dist = Math.hypot(h, Math.max(0, -S.x));
    const v = Math.max(3, Math.min(55, .028 * dist));
    S.seitSoll = v * Math.cos(GLEIT); S.sinkSoll = v * Math.sin(GLEIT);
  }
  function schritt(S, dt) {
    if (S.unten) return S;
    if (S.auto) computerSoll(S);
    const m = masse(S);
    // gewünschte Beschleunigung aus den Vorgaben, daraus Lage und Schub
    const ax = .6 * (S.seitSoll - S.vx), ay = 1.1 * (-S.sinkSoll - S.vy) + G;
    const aSoll = Math.max(-NEIG_MAX, Math.min(NEIG_MAX, Math.atan2(ax, Math.max(.3, ay))));
    S.a += Math.max(-NEIG_RATE * dt, Math.min(NEIG_RATE * dt, aSoll - S.a));
    let N = m * ay / Math.cos(S.a);
    N = Math.max(DPS.min * DPS.tmax, Math.min(DPS.tmax, N));
    if (S.treib <= 0) { N = 0; S.leer = true; }
    S.schub = N;
    S.treib = Math.max(0, S.treib - verbrauch(N) * dt);
    S.vx += N * Math.sin(S.a) / m * dt; S.vy += (N * Math.cos(S.a) / m - G) * dt;
    S.x += S.vx * dt; S.y += S.vy * dt; S.t += dt;
    const r = radar(S);
    if (!S.kontakt && r <= FUEHLER) S.kontakt = true;          // Fühler berührt den Boden: Kontaktlicht
    if (r <= 0) { S.unten = true; S.y = hoehe(S.x); S.schub = 0; S.aufsetz = { vSink: -S.vy, vSeit: S.vx, a: S.a }; }
    return S;
  }
  function weiter(S, dauer, dt = .02) { let t = 0; while (t < dauer - 1e-9 && !S.unten) { const h = Math.min(dt, dauer - t); schritt(S, h); t += h; } return S; }
  /** Ergebnis der Landung: sanft, hart oder kaputt – und warum */
  function landung(S) {
    const A = S.aufsetz, p = platz(S.x);
    if (!A) return null;
    const vS = A.vSink, vQ = Math.abs(A.vSeit), neig = Math.abs(A.a) * 180 / Math.PI;
    let grund = null;
    if (vS > 3) grund = 'zuSchnell'; else if (vQ > 1.5) grund = 'seitwaerts'; else if (neig > 10) grund = 'schief';
    else if (p.grund === 'stein') grund = 'stein'; else if (p.grund === 'steil') grund = 'steil';
    return { ok: !grund, grund, sanft: !grund && vS <= 1.2 && vQ <= .6, vSink: vS, vSeit: vQ, neig, platz: p, restSek: restSek(S), x: S.x };
  }

  const API = { G, G0, DPS, LEER, BREITE, FUSS, FUEHLER, NEIG_MAX, UEBERNAHME, START, KRATER, STEINE, hoehe, platz,
    neu, klon, masse, radar, restSek, computerSoll, schritt, weiter, landung };
  if (typeof module !== 'undefined') module.exports = API; else wurzel.Mond = API;
})(this);
