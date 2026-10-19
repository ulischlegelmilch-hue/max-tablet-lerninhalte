// Schachfiguren als SVG-Bilder (Satz "Chessnut" von Alexis Luengas, Apache-2.0-Lizenz, aus dem
// Lichess-Projekt) statt Schriftzeichen - ueberall dort, wo bisher FIGUR_SYMBOL[farbe][typ]
// als Text eingesetzt wurde, steht jetzt ein <img>.
const SchachFiguren = (function () {
  const m = { w: {}, b: {} };
  ['w', 'b'].forEach(f => ['k', 'q', 'r', 'b', 'n', 'p'].forEach(t => {
    m[f][t] = `<img class="fig" src="images/figuren/${f}${t.toUpperCase()}.svg" alt="" draggable="false">`;
  }));
  return m;
})();
