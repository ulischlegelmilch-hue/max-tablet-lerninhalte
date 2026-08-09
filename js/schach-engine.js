// Reine Schach-Spiellogik (keine Oberflaeche): Zuggenerierung, Schach/Matt/Patt-
// Erkennung, einfache Gegner-KI (Minimax mit Alpha-Beta). Felder sind 0..63,
// Index = Reihe*8+Linie, Reihe 0 = die 1. Reihe (weisse Grundreihe), Linie 0 = a.
const SchachEngine = (function () {
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const KOENIG_RICHTUNGEN = DIAG.concat(ORTHO);
  const SPRUNG_RITTER = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const WERTE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

  function rankOf(i) { return Math.floor(i / 8); }
  function fileOf(i) { return i % 8; }
  function idx(rank, file) { return rank * 8 + file; }
  function innerhalb(rank, file) { return rank >= 0 && rank < 8 && file >= 0 && file < 8; }

  function anfangsstellung() {
    const board = new Array(64).fill(null);
    const grundreihe = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let f = 0; f < 8; f++) {
      board[idx(0, f)] = { typ: grundreihe[f], farbe: 'w' };
      board[idx(1, f)] = { typ: 'p', farbe: 'w' };
      board[idx(6, f)] = { typ: 'p', farbe: 'b' };
      board[idx(7, f)] = { typ: grundreihe[f], farbe: 'b' };
    }
    return {
      board,
      amZug: 'w',
      rochade: { wK: true, wD: true, bK: true, bD: true },
      enPassantZiel: null,
      letzterZug: null
    };
  }

  /** Baut einen Spielzustand aus einer FEN-Stellung (z.B. aus der Lichess-
   *  Puzzle-Datenbank) statt der festen Startaufstellung - fuer Taktik-Puzzles,
   *  die mit einer beliebigen Stellung starten. */
  function ausFen(fen) {
    const [platzierung, amZugZeichen, rochadeStr, epStr] = fen.trim().split(/\s+/);
    const board = new Array(64).fill(null);
    const fenReihen = platzierung.split('/');
    for (let r = 0; r < 8; r++) {
      const boardRank = 7 - r;
      let file = 0;
      for (const ch of fenReihen[r]) {
        if (ch >= '1' && ch <= '8') { file += Number(ch); continue; }
        const farbe = ch === ch.toUpperCase() ? 'w' : 'b';
        board[idx(boardRank, file)] = { typ: ch.toLowerCase(), farbe };
        file++;
      }
    }
    const rochade = {
      wK: rochadeStr.includes('K'), wD: rochadeStr.includes('Q'),
      bK: rochadeStr.includes('k'), bD: rochadeStr.includes('q')
    };
    let enPassantZiel = null;
    if (epStr && epStr !== '-') {
      enPassantZiel = idx(Number(epStr[1]) - 1, epStr.charCodeAt(0) - 97);
    }
    return { board, amZug: amZugZeichen === 'b' ? 'b' : 'w', rochade, enPassantZiel, letzterZug: null };
  }

  /** Loest einen UCI-Zugstring (z.B. "b3d4" oder "e7e8q", Format der Lichess-
   *  Puzzle-Datenbank) zum passenden legalen Zugobjekt auf - baut dafuer NICHT
   *  selbst ein Zugobjekt, sondern sucht unter den echten legalen Zuegen, damit
   *  Rochade-/En-Passant-/Schlag-Flags garantiert korrekt gesetzt sind. Die
   *  Zuggenerierung erzeugt bei Umwandlung immer Dame (siehe generierePseudoZuege) -
   *  ein abweichender Umwandlungsbuchstabe aus der UCI-Notation wird deshalb
   *  nachtraeglich uebernommen. Gibt null zurueck, wenn kein legaler Zug passt. */
  function zugAusUci(zustand, uci) {
    const von = idx(Number(uci[1]) - 1, uci.charCodeAt(0) - 97);
    const nach = idx(Number(uci[3]) - 1, uci.charCodeAt(2) - 97);
    const zug = generiereLegaleZuege(zustand, von).find(z => z.nach === nach);
    if (!zug) return null;
    if (uci.length > 4) return Object.assign({}, zug, { promotion: uci[4] });
    return zug;
  }

  function angriffsFelder(zustand, von) {
    const stein = zustand.board[von];
    if (!stein) return [];
    const rank = rankOf(von), file = fileOf(von);
    const felder = [];

    function gleiten(richtungen) {
      for (const [dr, df] of richtungen) {
        let r = rank + dr, f = file + df;
        while (innerhalb(r, f)) {
          const ziel = idx(r, f);
          felder.push(ziel);
          if (zustand.board[ziel]) break;
          r += dr; f += df;
        }
      }
    }

    if (stein.typ === 'b') gleiten(DIAG);
    else if (stein.typ === 'r') gleiten(ORTHO);
    else if (stein.typ === 'q') gleiten(KOENIG_RICHTUNGEN);
    else if (stein.typ === 'n') {
      for (const [dr, df] of SPRUNG_RITTER) {
        const r = rank + dr, f = file + df;
        if (innerhalb(r, f)) felder.push(idx(r, f));
      }
    } else if (stein.typ === 'k') {
      for (const [dr, df] of KOENIG_RICHTUNGEN) {
        const r = rank + dr, f = file + df;
        if (innerhalb(r, f)) felder.push(idx(r, f));
      }
    } else if (stein.typ === 'p') {
      const richtung = stein.farbe === 'w' ? 1 : -1;
      for (const df of [-1, 1]) {
        const r = rank + richtung, f = file + df;
        if (innerhalb(r, f)) felder.push(idx(r, f));
      }
    }
    return felder;
  }

  function istFeldBedroht(zustand, feld, vonFarbe) {
    for (let i = 0; i < 64; i++) {
      const stein = zustand.board[i];
      if (stein && stein.farbe === vonFarbe && angriffsFelder(zustand, i).includes(feld)) {
        return true;
      }
    }
    return false;
  }

  function generierePseudoZuege(zustand, von) {
    const stein = zustand.board[von];
    if (!stein) return [];
    const zuege = [];
    const rank = rankOf(von), file = fileOf(von);
    const farbe = stein.farbe;
    const gegner = farbe === 'w' ? 'b' : 'w';

    function fuegeHinzu(nach, extra) {
      zuege.push(Object.assign({ von, nach, stein }, extra || {}));
    }

    function gleiten(richtungen) {
      for (const [dr, df] of richtungen) {
        let r = rank + dr, f = file + df;
        while (innerhalb(r, f)) {
          const ziel = idx(r, f);
          const belegt = zustand.board[ziel];
          if (!belegt) {
            fuegeHinzu(ziel);
          } else {
            if (belegt.farbe === gegner) fuegeHinzu(ziel, { schlag: true });
            break;
          }
          r += dr; f += df;
        }
      }
    }

    if (stein.typ === 'b') gleiten(DIAG);
    else if (stein.typ === 'r') gleiten(ORTHO);
    else if (stein.typ === 'q') gleiten(KOENIG_RICHTUNGEN);
    else if (stein.typ === 'n') {
      for (const [dr, df] of SPRUNG_RITTER) {
        const r = rank + dr, f = file + df;
        if (!innerhalb(r, f)) continue;
        const ziel = idx(r, f);
        const belegt = zustand.board[ziel];
        if (!belegt) fuegeHinzu(ziel);
        else if (belegt.farbe === gegner) fuegeHinzu(ziel, { schlag: true });
      }
    } else if (stein.typ === 'k') {
      for (const [dr, df] of KOENIG_RICHTUNGEN) {
        const r = rank + dr, f = file + df;
        if (!innerhalb(r, f)) continue;
        const ziel = idx(r, f);
        const belegt = zustand.board[ziel];
        if (!belegt) fuegeHinzu(ziel);
        else if (belegt.farbe === gegner) fuegeHinzu(ziel, { schlag: true });
      }
      const heimReihe = farbe === 'w' ? 0 : 7;
      if (rank === heimReihe && file === 4) {
        const kRecht = farbe === 'w' ? zustand.rochade.wK : zustand.rochade.bK;
        const dRecht = farbe === 'w' ? zustand.rochade.wD : zustand.rochade.bD;
        if (kRecht &&
            !zustand.board[idx(heimReihe, 5)] && !zustand.board[idx(heimReihe, 6)] &&
            !istFeldBedroht(zustand, idx(heimReihe, 4), gegner) &&
            !istFeldBedroht(zustand, idx(heimReihe, 5), gegner) &&
            !istFeldBedroht(zustand, idx(heimReihe, 6), gegner)) {
          fuegeHinzu(idx(heimReihe, 6), { rochade: 'K' });
        }
        if (dRecht &&
            !zustand.board[idx(heimReihe, 3)] && !zustand.board[idx(heimReihe, 2)] && !zustand.board[idx(heimReihe, 1)] &&
            !istFeldBedroht(zustand, idx(heimReihe, 4), gegner) &&
            !istFeldBedroht(zustand, idx(heimReihe, 3), gegner) &&
            !istFeldBedroht(zustand, idx(heimReihe, 2), gegner)) {
          fuegeHinzu(idx(heimReihe, 2), { rochade: 'D' });
        }
      }
    } else if (stein.typ === 'p') {
      const richtung = farbe === 'w' ? 1 : -1;
      const startReihe = farbe === 'w' ? 1 : 6;
      const promoReihe = farbe === 'w' ? 7 : 0;
      if (innerhalb(rank + richtung, file)) {
        const einSchritt = idx(rank + richtung, file);
        if (!zustand.board[einSchritt]) {
          if (rankOf(einSchritt) === promoReihe) fuegeHinzu(einSchritt, { promotion: 'q' });
          else fuegeHinzu(einSchritt);
          if (rank === startReihe) {
            const zweiSchritt = idx(rank + 2 * richtung, file);
            if (!zustand.board[zweiSchritt]) fuegeHinzu(zweiSchritt, { doppelzug: true });
          }
        }
      }
      for (const df of [-1, 1]) {
        const f2 = file + df;
        if (!innerhalb(rank + richtung, f2)) continue;
        const zielIdx = idx(rank + richtung, f2);
        const belegt = zustand.board[zielIdx];
        if (belegt && belegt.farbe === gegner) {
          if (rankOf(zielIdx) === promoReihe) fuegeHinzu(zielIdx, { schlag: true, promotion: 'q' });
          else fuegeHinzu(zielIdx, { schlag: true });
        } else if (zustand.enPassantZiel === zielIdx) {
          fuegeHinzu(zielIdx, { schlag: true, enPassant: true });
        }
      }
    }

    return zuege;
  }

  function zugAusfuehren(zustand, zug) {
    const board = zustand.board.slice();
    const stein = board[zug.von];
    const farbe = stein.farbe;
    const neueRochade = Object.assign({}, zustand.rochade);
    let neuesEnPassantZiel = null;

    if (zug.enPassant) {
      const geschlagenesFeld = idx(rankOf(zug.von), fileOf(zug.nach));
      board[geschlagenesFeld] = null;
    }

    board[zug.von] = null;
    board[zug.nach] = zug.promotion ? { typ: zug.promotion, farbe } : stein;

    if (zug.rochade === 'K') {
      const heimReihe = rankOf(zug.von);
      board[idx(heimReihe, 5)] = board[idx(heimReihe, 7)];
      board[idx(heimReihe, 7)] = null;
    } else if (zug.rochade === 'D') {
      const heimReihe = rankOf(zug.von);
      board[idx(heimReihe, 3)] = board[idx(heimReihe, 0)];
      board[idx(heimReihe, 0)] = null;
    }

    if (stein.typ === 'k') {
      if (farbe === 'w') { neueRochade.wK = false; neueRochade.wD = false; }
      else { neueRochade.bK = false; neueRochade.bD = false; }
    }
    if (zug.von === idx(0, 0) || zug.nach === idx(0, 0)) neueRochade.wD = false;
    if (zug.von === idx(0, 7) || zug.nach === idx(0, 7)) neueRochade.wK = false;
    if (zug.von === idx(7, 0) || zug.nach === idx(7, 0)) neueRochade.bD = false;
    if (zug.von === idx(7, 7) || zug.nach === idx(7, 7)) neueRochade.bK = false;

    if (zug.doppelzug) {
      neuesEnPassantZiel = idx((rankOf(zug.von) + rankOf(zug.nach)) / 2, fileOf(zug.von));
    }

    return {
      board,
      amZug: farbe === 'w' ? 'b' : 'w',
      rochade: neueRochade,
      enPassantZiel: neuesEnPassantZiel,
      letzterZug: zug
    };
  }

  function findeKoenig(zustand, farbe) {
    for (let i = 0; i < 64; i++) {
      const s = zustand.board[i];
      if (s && s.typ === 'k' && s.farbe === farbe) return i;
    }
    return -1;
  }

  function istImSchach(zustand, farbe) {
    const kFeld = findeKoenig(zustand, farbe);
    if (kFeld === -1) return false;
    const gegner = farbe === 'w' ? 'b' : 'w';
    return istFeldBedroht(zustand, kFeld, gegner);
  }

  function generiereLegaleZuege(zustand, von) {
    const stein = zustand.board[von];
    if (!stein || stein.farbe !== zustand.amZug) return [];
    const pseudo = generierePseudoZuege(zustand, von);
    return pseudo.filter(zug => !istImSchach(zugAusfuehren(zustand, zug), stein.farbe));
  }

  function alleLegalenZuege(zustand, farbe) {
    const alle = [];
    for (let i = 0; i < 64; i++) {
      const s = zustand.board[i];
      if (s && s.farbe === farbe) alle.push(...generiereLegaleZuege(zustand, i));
    }
    return alle;
  }

  function nurKoenigeUebrig(zustand) {
    const figuren = zustand.board.filter(s => s);
    if (figuren.length > 3) return false;
    const typen = figuren.map(s => s.typ).filter(t => t !== 'k');
    if (typen.length === 0) return true;
    if (typen.length === 1 && (typen[0] === 'n' || typen[0] === 'b')) return true;
    return false;
  }

  function spielstatus(zustand) {
    const farbe = zustand.amZug;
    const zuege = alleLegalenZuege(zustand, farbe);
    const schach = istImSchach(zustand, farbe);
    if (zuege.length === 0) return schach ? 'matt' : 'patt';
    if (nurKoenigeUebrig(zustand)) return 'remis';
    return schach ? 'schach' : 'laeuft';
  }

  function bewerten(zustand) {
    let summe = 0;
    for (let i = 0; i < 64; i++) {
      const s = zustand.board[i];
      if (!s) continue;
      summe += s.farbe === 'w' ? WERTE[s.typ] : -WERTE[s.typ];
    }
    return summe;
  }

  function minimax(zustand, tiefe, alpha, beta, maximiert) {
    const status = spielstatus(zustand);
    if (status === 'matt') return maximiert ? -100000 - tiefe : 100000 + tiefe;
    if (status === 'patt' || status === 'remis') return 0;
    if (tiefe === 0) return bewerten(zustand);

    const zuege = alleLegalenZuege(zustand, zustand.amZug);
    let bester = maximiert ? -Infinity : Infinity;
    for (const zug of zuege) {
      const nachher = zugAusfuehren(zustand, zug);
      const wert = minimax(nachher, tiefe - 1, alpha, beta, !maximiert);
      if (maximiert) {
        bester = Math.max(bester, wert);
        alpha = Math.max(alpha, bester);
      } else {
        bester = Math.min(bester, wert);
        beta = Math.min(beta, bester);
      }
      if (beta <= alpha) break;
    }
    return bester;
  }

  function waehleKiZug(zustand, tiefe) {
    const farbe = zustand.amZug;
    const zuege = alleLegalenZuege(zustand, farbe);
    if (zuege.length === 0) return null;
    let besterWert = farbe === 'w' ? -Infinity : Infinity;
    let kandidaten = [];
    for (const zug of zuege) {
      const nachher = zugAusfuehren(zustand, zug);
      const wert = minimax(nachher, tiefe - 1, -Infinity, Infinity, farbe !== 'w');
      if (farbe === 'w' ? wert > besterWert : wert < besterWert) {
        besterWert = wert;
        kandidaten = [zug];
      } else if (wert === besterWert) {
        kandidaten.push(zug);
      }
    }
    return kandidaten[Math.floor(Math.random() * kandidaten.length)];
  }

  /** Wie waehleKiZug, aber mit einer Chance, statt des besten Zugs einen
   *  zufaelligen legalen Zug zu spielen - simuliert Anfaenger-Fehler fuer
   *  niedrige Schwierigkeitsstufen. zufallsChance 0..1. */
  function waehleKiZugMitSchwierigkeit(zustand, tiefe, zufallsChance) {
    const zuege = alleLegalenZuege(zustand, zustand.amZug);
    if (zuege.length === 0) return null;
    if (zufallsChance && Math.random() < zufallsChance) {
      return zuege[Math.floor(Math.random() * zuege.length)];
    }
    return waehleKiZug(zustand, tiefe);
  }

  return {
    idx, rankOf, fileOf,
    anfangsstellung,
    ausFen,
    zugAusUci,
    generiereLegaleZuege,
    alleLegalenZuege,
    zugAusfuehren,
    istImSchach,
    spielstatus,
    waehleKiZug,
    waehleKiZugMitSchwierigkeit
  };
})();
