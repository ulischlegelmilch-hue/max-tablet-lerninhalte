const Mathe = (function () {
  function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rnd(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generierePlusMinus(anzahl) {
    const fragen = [];
    for (let i = 0; i < anzahl; i++) {
      const plus = Math.random() < 0.5;
      let a, b, frage, antwort;
      if (plus) {
        a = rnd(10, 500); b = rnd(10, 500);
        frage = `${a} + ${b} = ?`;
        antwort = a + b;
      } else {
        a = rnd(10, 500); b = rnd(10, a);
        frage = `${a} − ${b} = ?`;
        antwort = a - b;
      }
      fragen.push({ typ: 'numeric', frage, antwort });
    }
    return fragen;
  }

  function genEinmaleins(anzahl) {
    const fragen = [];
    for (let i = 0; i < anzahl; i++) {
      const a = rnd(1, 10), b = rnd(1, 10);
      fragen.push({ typ: 'numeric', frage: `${a} × ${b} = ?`, antwort: a * b });
    }
    return fragen;
  }

  function genGeteilt(anzahl) {
    const fragen = [];
    for (let i = 0; i < anzahl; i++) {
      const b = rnd(1, 10), erg = rnd(1, 10);
      const a = b * erg;
      fragen.push({ typ: 'numeric', frage: `${a} : ${b} = ?`, antwort: erg });
    }
    return fragen;
  }

  const textVorlagen = [
    () => { const a = rnd(3, 20), b = rnd(2, 15);
      return { frage: `Anna hat ${a} Äpfel. Sie bekommt ${b} weitere geschenkt. Wie viele Äpfel hat sie jetzt?`, antwort: a + b }; },
    () => { const a = rnd(10, 40), b = rnd(2, a - 1);
      return { frage: `Tim hat ${a} Bonbons. Er verschenkt ${b} davon. Wie viele Bonbons hat er noch?`, antwort: a - b }; },
    () => { const a = rnd(2, 9), b = rnd(2, 9);
      return { frage: `Im Regal stehen ${a} Kisten mit je ${b} Flaschen. Wie viele Flaschen sind das insgesamt?`, antwort: a * b }; },
    () => { const b = rnd(2, 9), erg = rnd(2, 9); const a = b * erg;
      return { frage: `${a} Kekse werden gleichmäßig auf ${b} Teller verteilt. Wie viele Kekse liegen auf jedem Teller?`, antwort: erg }; },
    () => { const a = rnd(5, 30), b = rnd(5, 30);
      return { frage: `Ein Bus fährt mit ${a} Personen los. An der Haltestelle steigen ${b} weitere Personen ein. Wie viele Personen sind jetzt im Bus?`, antwort: a + b }; },
    () => { const a = rnd(20, 60), b = rnd(5, 19);
      return { frage: `Max hat ${a} Euro Taschengeld gespart. Er kauft ein Spielzeug für ${b} Euro. Wie viel Geld hat er noch?`, antwort: a - b }; },
    () => { const a = rnd(2, 12), min = rnd(2, 8);
      return { frage: `Eine Klassenfahrt dauert ${a} Tage. Jeden Tag gibt es ${min} Stunden Programm. Wie viele Stunden Programm sind das insgesamt?`, antwort: a * min }; },
    () => { const a = rnd(30, 100), b = rnd(2, 10);
      return { frage: `${a} Kinder sollen in Gruppen zu je ${b} Kindern aufgeteilt werden. Es geht nicht ganz auf – wie viele volle Gruppen zu ${b} Kindern gibt es?`, antwort: Math.floor(a / b) }; }
  ];

  function genTextaufgaben(anzahl) {
    const fragen = [];
    for (let i = 0; i < anzahl; i++) {
      const t = textVorlagen[rnd(0, textVorlagen.length - 1)]();
      fragen.push({ typ: 'numeric', frage: t.frage, antwort: t.antwort });
    }
    return fragen;
  }

  // ---- Schriftlich Rechnen: 3-stellig Plus/Minus, Rechenketten, fehlende Ziffer, Stimmt-das ----
  function genAddSubFrage() {
    const plus = Math.random() < 0.5;
    if (plus) {
      const a = rnd(100, 600), b = rnd(100, 999 - a);
      return { typ: 'numeric', frage: `${a} + ${b} = ?`, antwort: a + b };
    }
    const a = rnd(200, 950), b = rnd(100, a - 10);
    return { typ: 'numeric', frage: `${a} − ${b} = ?`, antwort: a - b };
  }

  function genRechenketteFrage() {
    const start = rnd(100, 400);
    let wert = start;
    const schritte = [];
    const anzahlSchritte = rnd(3, 4);
    for (let i = 0; i < anzahlSchritte; i++) {
      const plus = Math.random() < 0.5;
      let delta = rnd(50, 250);
      if (!plus && delta > wert - 20) delta = rnd(10, Math.max(10, wert - 20));
      if (plus) { wert += delta; schritte.push(`+ ${delta}`); }
      else { wert -= delta; schritte.push(`− ${delta}`); }
    }
    return { typ: 'numeric', frage: `${start} ${schritte.join(' ')} = ?`, antwort: wert };
  }

  function genFehlendeZifferFrage() {
    const a = rnd(10, 89);
    const b = rnd(10, 89);
    const summe = a + b;
    const bZiffern = String(b).padStart(2, '0').split('');
    const pos = rnd(0, 1);
    const versteckt = bZiffern[pos];
    bZiffern[pos] = '▢';
    return {
      typ: 'numeric',
      frage: `${a} + ${bZiffern.join('')} = ${summe}.<br>Welche Ziffer fehlt?`,
      antwort: parseInt(versteckt, 10)
    };
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

  function genDiagrammFragen(anzahlRunden) {
    const fragen = [];
    for (let r = 0; r < anzahlRunden; r++) {
      const d = genRegentageDiagramm();
      const chartHtml = htmlBalkenDiagramm(d);

      const idxA = rnd(0, d.kategorien.length - 1);
      let idxB = rnd(0, d.kategorien.length - 1);
      while (idxB === idxA) idxB = rnd(0, d.kategorien.length - 1);
      fragen.push({
        typ: 'numeric',
        lesetext: chartHtml,
        frage: `Wie viele ${d.einheitMehrzahl} gab es in ${d.kategorien[idxA]} und ${d.kategorien[idxB]} zusammen?`,
        antwort: d.werte[idxA] + d.werte[idxB]
      });

      const maxWert = Math.max(...d.werte);
      const maxIdx = d.werte.indexOf(maxWert);
      const uebrige = shuffle(d.kategorien.map((_, i) => i).filter(i => i !== maxIdx));
      const gewaehlt = shuffle([maxIdx, ...uebrige.slice(0, 3)]);
      fragen.push({
        typ: 'mc',
        lesetext: chartHtml,
        frage: `In welchem Monat gab es die meisten ${d.einheitMehrzahl}?`,
        optionen: gewaehlt.map(i => d.kategorien[i]),
        richtigIndex: gewaehlt.indexOf(maxIdx)
      });
    }
    return fragen;
  }

  // ---- Tagespensum: fester Mix aus allen Aufgabentypen, keine Sparten-Auswahl.
  // Ist er durch, generiert "Nochmal üben" per Zufall ein frisches Pensum -
  // dadurch unterscheidet sich auch das Pensum von einem Tag zum naechsten. ----
  const einzelGeneratoren = [
    () => generierePlusMinus(1)[0],
    () => genEinmaleins(1)[0],
    () => genGeteilt(1)[0],
    () => genTextaufgaben(1)[0],
    genAddSubFrage,
    genRechenketteFrage,
    genFehlendeZifferFrage,
    genStimmtDasFrage,
    genZehnHundertFrage,
    genZehnerzahlenFrage,
    genVielfachesFrage,
    genTeilerFrage
  ];

  function genTagesaufgabe(anzahl) {
    const fragen = [];
    while (fragen.length < anzahl) {
      if (Math.random() < 0.12 && fragen.length <= anzahl - 2) {
        fragen.push(...genDiagrammFragen(1));
      } else {
        fragen.push(einzelGeneratoren[rnd(0, einzelGeneratoren.length - 1)]());
      }
    }
    return fragen;
  }

  function starteTagesaufgabe() {
    const starter = () => App.startQuizSession('mathe', genTagesaufgabe(20));
    App.setLastStarter(starter); starter();
  }

  return { starteTagesaufgabe };
})();
