// Reine Schiffe-versenken-Spiellogik (keine Oberflaeche, kein Storage) - analog
// zu schach-engine.js: Feld-Mathematik, Platzierungsregeln, Zufalls-Flotte.
// Wird von schiffeversenken.js (gegen Computer) UND schiffeversenken-online.js
// (gegen Papa) geteilt, genau wie schach-engine.js von schach.js/schach-
// online.js geteilt wird - die Oberflaechen-/Interaktionslogik bleibt trotzdem
// je Screen eigenstaendig (Projektkonvention).
//
// Klassische deutsche Regeln (recherchiert, siehe spielregeln.de): 10x10-Meer,
// 1 Schlachtschiff (5 Felder), 2 Kreuzer (4), 3 Zerstoerer (3), 4 U-Boote (2) -
// macht zusammen 10 Schiffe, 30 belegte Felder. Schiffe duerfen sich nicht
// beruehren, auch nicht ueber Eck.
const SchiffeEngine = (function () {
  const BREITE = 10;
  const GESAMT = BREITE * BREITE;

  const SCHIFF_TYPEN = [
    { typ: 'schlachtschiff', name: 'Schlachtschiff', laenge: 5, anzahl: 1 },
    { typ: 'kreuzer', name: 'Kreuzer', laenge: 4, anzahl: 2 },
    { typ: 'zerstoerer', name: 'Zerstörer', laenge: 3, anzahl: 3 },
    { typ: 'uboot', name: 'U-Boot', laenge: 2, anzahl: 4 }
  ];
  // Reihenfolge fuers manuelle Platzieren: groesstes Schiff zuerst (am
  // schwersten unterzubringen, solange das Brett noch leer ist).
  const PLATZIERUNGS_REIHENFOLGE = SCHIFF_TYPEN.flatMap(def =>
    Array.from({ length: def.anzahl }, () => ({ typ: def.typ, name: def.name, laenge: def.laenge }))
  );
  const SCHIFFE_GESAMT = PLATZIERUNGS_REIHENFOLGE.length;

  function idx(zeile, spalte) { return zeile * BREITE + spalte; }
  function zeileVon(i) { return Math.floor(i / BREITE); }
  function spalteVon(i) { return i % BREITE; }
  function inBrett(zeile, spalte) { return zeile >= 0 && zeile < BREITE && spalte >= 0 && spalte < BREITE; }

  function berechneZellen(startIdx, laenge, ausrichtung) {
    const z = zeileVon(startIdx), s = spalteVon(startIdx);
    const zellen = [];
    for (let i = 0; i < laenge; i++) {
      const zz = ausrichtung === 'v' ? z + i : z;
      const ss = ausrichtung === 'h' ? s + i : s;
      if (!inBrett(zz, ss)) return null;
      zellen.push(idx(zz, ss));
    }
    return zellen;
  }

  /** Alle Zellen, die ein Schiff auf `zellen` fuer ein NEUES Schiff sperrt -
   *  die eigenen Felder plus alle 8 Nachbarn (auch diagonal), denn Schiffe
   *  duerfen sich nicht beruehren. */
  function gesperrteNachbarn(zellen) {
    const gesperrt = new Set();
    for (const z of zellen) {
      const zeile = zeileVon(z), spalte = spalteVon(z);
      for (let dz = -1; dz <= 1; dz++) {
        for (let ds = -1; ds <= 1; ds++) {
          const nz = zeile + dz, ns = spalte + ds;
          if (inBrett(nz, ns)) gesperrt.add(idx(nz, ns));
        }
      }
    }
    return gesperrt;
  }

  function kannPlatzieren(vorhandeneSchiffe, zellen) {
    if (!zellen) return false;
    for (const schiff of vorhandeneSchiffe) {
      const gesperrt = gesperrteNachbarn(schiff.zellen);
      if (zellen.some(z => gesperrt.has(z))) return false;
    }
    return true;
  }

  function neuesSchiff(def, zellen) {
    return { typ: def.typ, name: def.name, laenge: def.laenge, zellen, treffer: new Array(def.laenge).fill(false) };
  }

  /** Wuerfelt zufaellige, regelkonforme Positionen fuer `restlicheDefs` dazu zu
   *  den schon vorhandenen `vorhandeneSchiffe` - fuer eine komplett neue Flotte
   *  (leeres vorhandeneSchiffe) UND fuer "Automatisch platzieren" (nur die noch
   *  fehlenden Schiffe). Reiner Neuversuch statt Backtracking: bei 30 von 100
   *  belegten Feldern klappt das praktisch immer im ersten oder zweiten Anlauf. */
  function versucheZufaelligPlatzieren(vorhandeneSchiffe, restlicheDefs) {
    for (let gesamtVersuch = 0; gesamtVersuch < 300; gesamtVersuch++) {
      const schiffe = vorhandeneSchiffe.map(s => Object.assign({}, s));
      let erfolgreich = true;
      for (const def of restlicheDefs) {
        let platziert = false;
        for (let versuch = 0; versuch < 400; versuch++) {
          const ausrichtung = Math.random() < 0.5 ? 'h' : 'v';
          const start = Math.floor(Math.random() * GESAMT);
          const zellen = berechneZellen(start, def.laenge, ausrichtung);
          if (zellen && kannPlatzieren(schiffe, zellen)) {
            schiffe.push(neuesSchiff(def, zellen));
            platziert = true;
            break;
          }
        }
        if (!platziert) { erfolgreich = false; break; }
      }
      if (erfolgreich) return schiffe;
    }
    return null; // praktisch nie erreicht bei nur 30/100 Feldern belegt
  }

  function zufaelligeFlotte() {
    return versucheZufaelligPlatzieren([], PLATZIERUNGS_REIHENFOLGE);
  }

  /** Welches Schiff (falls ueberhaupt eines) belegt Feld `ziel`. */
  function schiffAnFeld(schiffe, ziel) {
    return schiffe.find(s => s.zellen.includes(ziel)) || null;
  }

  function schiffVersenkt(schiff) {
    return schiff.treffer.every(t => t);
  }

  function flotteBesiegt(schiffe) {
    return schiffe.every(schiffVersenkt);
  }

  return {
    BREITE, GESAMT, SCHIFF_TYPEN, PLATZIERUNGS_REIHENFOLGE, SCHIFFE_GESAMT,
    idx, zeileVon, spalteVon, inBrett, berechneZellen, gesperrteNachbarn, kannPlatzieren,
    neuesSchiff, versucheZufaelligPlatzieren, zufaelligeFlotte, schiffAnFeld, schiffVersenkt, flotteBesiegt
  };
})();
