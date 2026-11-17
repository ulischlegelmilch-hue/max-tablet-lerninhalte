// Musik (15.11.2026, Uli: „er muss wieder lernen, diesmal für Musik. Erstelle Lernkarten aus den gesendeten Fotos.
// Beachte aber, falls Max die Aufgaben nicht richtig gelöst hat.“)
// Quelle: Max' Musikheft „Notenlernen“ (ab 4.9.26: Metrum, Tante Ta und die Titis, Taktarten, Rhythmus, Notenwerte,
// Pausenwerte) und die Arbeitsblätter „Wir lernen Noten kennen“ (Aufbau einer Note, Notenwerte-Tabelle) und
// „Das Notenhaus“ (Taktstriche eintragen).
// Die Karten folgen dem Regeltext, NICHT Max' Antworten. Falsch in Max' Heft: „halbe Note 4 Schläge“ (richtig: 2) und
// in der Notenwerte-Tabelle sind halbe Note und Achtelnote vertauscht. Dafür gibt es den Stapel „Aufpassen: Verwechsler“.
// Die Karten laufen als Lernkarten-Gruppe 'musik' in heimatkunde.js (Selbstbewertung, Lernstand, Hof-Bonus 'musik_karten').
// Notenbilder sind SVG in currentColor: am Tablet hell auf dunkel, in der Eltern-App dunkel auf hell.
const Musik = (function () {
  const AKZENT = '#FF9F1C';

  // ------------------------------------------------------------------ Notenbilder
  // Alle Zeichen stehen auf EINER Notenlinie (wie in Max' Heft), y = Höhe der Linie, x = Mitte des Zeichens.
  const STRICH = 'stroke="currentColor" stroke-linecap="round"';
  function kopf(x, y, hohl) {
    return hohl
      ? `<ellipse cx="${x}" cy="${y}" rx="9.6" ry="6.6" transform="rotate(-22 ${x} ${y})" fill="none" ${STRICH} stroke-width="2.8"/>`
      : `<ellipse cx="${x}" cy="${y}" rx="9.6" ry="6.8" transform="rotate(-22 ${x} ${y})" fill="currentColor"/>`;
  }
  const hals = (x, y) => `<line x1="${x + 8.6}" y1="${y - 2}" x2="${x + 8.6}" y2="${y - 50}" ${STRICH} stroke-width="2.6"/>`;
  const faehnchen = (x, y) => {
    const sx = x + 8.6, t = y - 50;
    return `<path d="M${sx} ${t} C${sx + 1} ${t + 12} ${sx + 15} ${t + 15} ${sx + 12} ${t + 33}" fill="none" ${STRICH} stroke-width="3.4"/>`;
  };

  // breite = Platz auf der Linie; schlaege = Länge im 4/4-Takt; name/silbe für Texte
  const ZEICHEN = {
    ganz: { breite: 48, schlaege: 4, name: 'ganze Note', silbe: 'Taooo',
      svg: (x, y) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="7.2" fill="none" ${STRICH} stroke-width="3.4"/>` },
    halb: { breite: 46, schlaege: 2, name: 'halbe Note', silbe: 'Tao', svg: (x, y) => kopf(x, y, true) + hals(x, y) },
    viertel: { breite: 42, schlaege: 1, name: 'Viertelnote', silbe: 'Ta', svg: (x, y) => kopf(x, y) + hals(x, y) },
    achtel: { breite: 48, schlaege: 0.5, name: 'Achtelnote', silbe: 'Ti', svg: (x, y) => kopf(x, y) + hals(x, y) + faehnchen(x, y) },
    titi: { breite: 66, schlaege: 1, name: 'zwei Achtelnoten', silbe: 'Titi',
      svg: (x, y) => kopf(x - 14, y) + hals(x - 14, y) + kopf(x + 14, y) + hals(x + 14, y) +
        `<line x1="${x - 5.4}" y1="${y - 49}" x2="${x + 22.6}" y2="${y - 49}" stroke="currentColor" stroke-width="6.5"/>` },
    p_ganz: { breite: 46, schlaege: 4, name: 'ganze Pause', svg: (x, y) => `<rect x="${x - 11}" y="${y}" width="22" height="8.5" fill="currentColor"/>` },
    p_halb: { breite: 46, schlaege: 2, name: 'halbe Pause', svg: (x, y) => `<rect x="${x - 11}" y="${y - 8.5}" width="22" height="8.5" fill="currentColor"/>` },
    p_viertel: { breite: 40, schlaege: 1, name: 'Viertelpause',
      svg: (x, y) => `<path d="M${x - 4} ${y - 33} L${x + 5} ${y - 22} L${x - 3} ${y - 13} L${x + 5} ${y - 3} C${x - 3} ${y - 6} ${x - 6} ${y + 3} ${x + 1} ${y + 9}" fill="none" ${STRICH} stroke-width="3.8" stroke-linejoin="round"/>` },
    p_achtel: { breite: 40, schlaege: 0.5, name: 'Achtelpause',
      svg: (x, y) => `<circle cx="${x - 5}" cy="${y - 21}" r="3.8" fill="currentColor"/><path d="M${x - 6} ${y - 18} Q${x} ${y - 14} ${x + 6} ${y - 24} L${x - 2} ${y + 3}" fill="none" ${STRICH} stroke-width="2.6" stroke-linejoin="round"/>` },
    gleich: { breite: 34, schlaege: 0, svg: (x, y) => `<text x="${x}" y="${y - 14}" text-anchor="middle" font-size="30" font-weight="800" fill="${AKZENT}">=</text>` },
    strich: { breite: 24, schlaege: 0, svg: (x, y) => `<line x1="${x}" y1="${y - 24}" x2="${x}" y2="${y + 24}" stroke="currentColor" stroke-width="2.4"/>` },
    schluss: { breite: 24, schlaege: 0,
      svg: (x, y) => `<line x1="${x - 3}" y1="${y - 24}" x2="${x - 3}" y2="${y + 24}" stroke="currentColor" stroke-width="2"/><line x1="${x + 3}" y1="${y - 24}" x2="${x + 3}" y2="${y + 24}" stroke="currentColor" stroke-width="5"/>` }
  };

  const rahmen = (inhalt, b, h, max) =>
    `<svg viewBox="0 0 ${b} ${h}" style="width:100%;max-width:${max}px;display:block;margin:8px auto;" xmlns="http://www.w3.org/2000/svg">${inhalt}</svg>`;

  /** Zeichen nebeneinander auf einer Notenlinie. opt.takt = '4/4' zeigt die Taktangabe, opt.max = größte Breite in px. */
  function zeile(folge, opt = {}) {
    const y = 72;
    let x = 14, teile = '';
    if (opt.takt) {
      const [o, u] = opt.takt.split('/');
      const t = (ty, z) => `<text x="${x + 12}" y="${ty}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="29" font-weight="700" fill="currentColor">${z}</text>`;
      teile += t(y - 4, o) + t(y + 26, u);
      x += 30;
    }
    x += 12;
    folge.forEach(name => { const z = ZEICHEN[name]; teile += z.svg(x + z.breite / 2, y); x += z.breite; });
    x += 12;
    const b = x + 6;
    return rahmen(`<line x1="8" y1="${y}" x2="${x}" y2="${y}" stroke="currentColor" stroke-width="1.6"/>` + teile, b, 112, opt.max || Math.min(360, Math.round(b * 1.6)));
  }
  const einzeln = name => zeile([name], { max: 190 });

  /** Achtelnote groß mit den Nummern ①②③ (Arbeitsblatt „Der Aufbau einer Note“); namen = Beschriftung statt Nummern. */
  function aufbauBild(namen) {
    const k = 1.7, ox = 30, oy = 4;   // Note in eigenen Koordinaten bei (24, 70), dann vergrößert
    const p = (x, y) => [ox + x * k, oy + y * k];
    const note = `<g transform="translate(${ox} ${oy}) scale(${k})">${ZEICHEN.achtel.svg(24, 70)}</g>`;
    const marken = [
      { ziel: p(42, 34), pos: [170, 46], t: '1', name: 'Fähnchen' },
      { ziel: p(32.6, 46), pos: [26, 70], t: '2', name: 'Notenhals' },
      { ziel: p(17, 72), pos: [26, 128], t: '3', name: 'Notenkopf' }
    ];
    const m = marken.map(mk => {
      const [zx, zy] = mk.ziel, [px, py] = mk.pos;
      const linie = `<line x1="${px}" y1="${py}" x2="${zx}" y2="${zy}" stroke="${AKZENT}" stroke-width="1.8"/>`;
      if (namen) {
        const links = px < zx;
        return linie + `<text x="${px + (links ? -4 : 4)}" y="${py + 6}" text-anchor="${links ? 'end' : 'start'}" font-size="17" font-weight="700" fill="${AKZENT}">${mk.name}</text>`;
      }
      return linie + `<circle cx="${px}" cy="${py}" r="12" fill="none" stroke="${AKZENT}" stroke-width="2.2"/>` +
        `<text x="${px}" y="${py + 6}" text-anchor="middle" font-size="17" font-weight="800" fill="${AKZENT}">${mk.t}</text>`;
    }).join('');
    // mit Namen: links Platz für „Notenhals“/„Notenkopf“ (Text endet an der Marke), rechts für „Fähnchen“
    const vb = namen ? '-72 0 334 150' : '0 0 200 150';
    return `<svg viewBox="${vb}" style="width:100%;max-width:${namen ? 330 : 230}px;display:block;margin:8px auto;" xmlns="http://www.w3.org/2000/svg">${note}${m}</svg>`;
  }

  /** Wagen von „Tante Ta und die Titis“: 4 Sitzplätze = 4 Grundschläge; belegung = [[Silbe, Plätze], ...] */
  function wagen(belegung) {
    const x0 = 22, w = 58, y0 = 26, h = 50;
    let s = `<rect x="${x0 - 8}" y="${y0 - 8}" width="${4 * w + 16}" height="${h + 16}" rx="8" fill="none" stroke="currentColor" stroke-width="2.6"/>`;
    for (let i = 1; i < 4; i++) s += `<line x1="${x0 + i * w}" y1="${y0}" x2="${x0 + i * w}" y2="${y0 + h}" stroke="currentColor" stroke-opacity=".35" stroke-width="1.6" stroke-dasharray="4 4"/>`;
    for (let i = 0; i < 4; i++) s += `<path d="M${x0 + i * w + 18} ${y0 - 8} a11 9 0 0 1 22 0" fill="none" stroke="currentColor" stroke-width="2.2"/>`;
    s += `<circle cx="${x0 + 45}" cy="${y0 + h + 18}" r="10" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="${x0 + 4 * w - 45}" cy="${y0 + h + 18}" r="10" fill="none" stroke="currentColor" stroke-width="2.6"/>`;
    let platz = 0;
    belegung.forEach(([silbe, n]) => {
      const x = x0 + platz * w + 4, b = n * w - 8;
      s += `<rect x="${x}" y="${y0 + 6}" width="${b}" height="${h - 12}" rx="8" fill="${AKZENT}" fill-opacity=".22" stroke="${AKZENT}" stroke-width="2"/>` +
        `<text x="${x + b / 2}" y="${y0 + h / 2 + 6}" text-anchor="middle" font-size="${silbe.length > 4 ? 15 : 18}" font-weight="800" fill="currentColor">${silbe}</text>`;
      platz += n;
    });
    return rahmen(s, 4 * w + 44, 112, 330);
  }

  /** Das Notenhaus (Arbeitsblatt): 1 ganze = 2 halbe = 4 Viertel = 8 Achtel, ohne Notenlinie. */
  function notenhaus() {
    const x0 = 20, b = 320, hz = 62;
    let s = `<path d="M${x0 - 8} 64 L${x0 + b / 2} 8 L${x0 + b + 8} 64 Z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>`;
    s += ZEICHEN.ganz.svg(x0 + b / 2, 48);
    [['halb', 2], ['viertel', 4], ['achtel', 8]].forEach(([name, n], r) => {
      const y = 64 + r * hz, w = b / n;
      s += `<rect x="${x0}" y="${y}" width="${b}" height="${hz}" fill="none" stroke="currentColor" stroke-width="2"/>`;
      for (let i = 0; i < n; i++) {
        if (i) s += `<line x1="${x0 + i * w}" y1="${y}" x2="${x0 + i * w}" y2="${y + hz}" stroke="currentColor" stroke-width="1.4"/>`;
        s += ZEICHEN[name].svg(x0 + i * w + w / 2 - 4, y + hz - 8);
      }
    });
    return rahmen(s, b + 40, 64 + 3 * hz + 8, 340);
  }

  // Unsichtbarer Merktext: Bild-Karten bleiben im Verlauf/Eltern-App über den Wortlaut unterscheidbar (Bilder werden dort entfernt)
  const merk = t => `<span hidden> (${t})</span>`;
  const frage = (bild, text, merkText) => `${bild}${text}${merkText ? merk(merkText) : ''}`;
  const klein = t => `<div style="font-size:16px;font-weight:500;margin-top:8px;opacity:.85">${t}</div>`;

  // ------------------------------------------------------------------ Lernkarten
  const STAPEL = [
    { id: 'musik_metrum', titel: 'Metrum, Takt & Rhythmus', karten: () => [
      { front: 'Was ist das <b>Metrum</b>?', back: 'Das Metrum (auch <b>Puls</b>) ist der <b>gleichmäßige Grundschlag</b> in der Musik.' },
      { front: 'Was gibt das Metrum in einem Lied vor?', back: 'Das <b>Tempo</b>.' },
      { front: 'Womit kannst du das Metrum vergleichen?', back: 'Mit deinem <b>Herzschlag</b>: ein regelmäßig wiederkehrender Schlag (Impuls).' },
      { front: 'Was ist ein <b>Takt</b>?', back: 'Ein Takt teilt die Musik mithilfe des Grundschlags in <b>Abschnitte</b>.' },
      { front: 'Womit werden die Takte in einem Musikstück getrennt?', back: 'Mit <b>Taktstrichen</b>.' + zeile(['viertel', 'viertel', 'halb', 'strich', 'ganz', 'schluss'], { takt: '4/4', max: 340 }) },
      { front: 'Was bedeutet <b>4/4</b> (Viervierteltakt)?', back: 'Ein Takt besteht aus <b>4 Grundschlägen</b>.' },
      { front: 'Was bedeutet <b>3/4</b> (Dreivierteltakt)?', back: 'Ein Takt dauert <b>3 Grundschläge</b>.' },
      { front: 'In welchem Takt sind viele Lieder geschrieben?', back: 'Im <b>4/4-Takt</b> (Viervierteltakt).' },
      { front: 'Was ist der <b>Rhythmus</b>?', back: 'Ein <b>Muster</b> aus verschieden langen Notenwerten (Tönen).' },
      { front: 'Metrum oder Rhythmus: Was bleibt immer gleichmäßig?', back: 'Das <b>Metrum</b> (der Grundschlag). Der Rhythmus wechselt zwischen langen und kurzen Tönen.' }
    ] },
    { id: 'musik_aufbau', titel: 'Aufbau einer Note', karten: () => [
      { front: frage(aufbauBild(), 'Wie heißt Teil <b>1</b>?', 'Teil 1'), back: '<b>Fähnchen</b>' + aufbauBild(true) },
      { front: frage(aufbauBild(), 'Wie heißt Teil <b>2</b>?', 'Teil 2'), back: '<b>Notenhals</b>' + aufbauBild(true) },
      { front: frage(aufbauBild(), 'Wie heißt Teil <b>3</b>?', 'Teil 3'), back: '<b>Notenkopf</b>' + aufbauBild(true) },
      { front: 'Welche Note hat ein <b>Fähnchen</b>?', back: 'Die <b>Achtelnote</b>.' + einzeln('achtel') },
      { front: 'Welche Note hat <b>keinen Notenhals</b>?', back: 'Die <b>ganze Note</b>.' + einzeln('ganz') },
      { front: 'Womit schreibst du Noten?', back: 'Immer mit <b>Bleistift</b>!' }
    ] },
    { id: 'musik_noten', titel: 'Notenwerte', karten: () => [
      { front: 'Was sagt der <b>Notenwert</b>?', back: 'Wie <b>lang</b> eine Note ist. Wir rechnen mit dem 4/4-Takt.' },
      ...['ganz', 'halb', 'viertel', 'achtel', 'titi'].map(n => {
        const z = ZEICHEN[n];
        const lang = z.schlaege === 0.5 ? '½ Schlag' : n === 'titi' ? 'zusammen 1 Schlag' : `${z.schlaege} ${z.schlaege === 1 ? 'Schlag' : 'Schläge'}`;
        return { front: frage(einzeln(n), n === 'titi' ? 'Was ist das? Wie lang ist es zusammen?' : 'Wie heißt diese Note? Wie viele Schläge dauert sie?', z.name),
          back: `<b>${n === 'titi' ? 'Zwei Achtelnoten' : z.name.charAt(0).toUpperCase() + z.name.slice(1)}</b><br>${lang} · sprich: <b>${z.silbe}</b>` };
      }),
      ...[['ganz', 'hohler Kopf, <b>kein</b> Hals'], ['halb', 'hohler Kopf <b>mit</b> Hals'], ['viertel', 'ausgemalter Kopf mit Hals'], ['achtel', 'ausgemalter Kopf, Hals und <b>Fähnchen</b>']].map(([n, wie]) => ({
        front: `Wie sieht eine <b>${ZEICHEN[n].name}</b> aus?` + klein('Erst überlegen oder mit dem Finger in die Luft malen, dann umdrehen.'),
        back: einzeln(n) + wie
      }))
    ] },
    { id: 'musik_pausen', titel: 'Pausenwerte', karten: () => [
      ...['p_ganz', 'p_halb', 'p_viertel', 'p_achtel'].map(n => {
        const z = ZEICHEN[n];
        const lang = z.schlaege === 0.5 ? '½ Schlag' : `${z.schlaege} ${z.schlaege === 1 ? 'Schlag' : 'Schläge'}`;
        const extra = n === 'p_ganz' ? '<br>Sie <b>hängt</b> an der Linie.' : n === 'p_halb' ? '<br>Sie <b>sitzt</b> auf der Linie.' : '';
        return { front: frage(einzeln(n), 'Wie heißt diese Pause? Wie viele Schläge dauert sie?', z.name), back: `<b>${z.name.charAt(0).toUpperCase() + z.name.slice(1)}</b><br>${lang}${extra}` };
      }),
      { front: 'Ganze und halbe Pause sehen fast gleich aus. Wie erkennst du den Unterschied?', back: zeile(['p_ganz', 'p_halb'], { max: 230 }) + 'Die <b>ganze Pause hängt</b> unter der Linie (4 Schläge).<br>Die <b>halbe Pause sitzt</b> auf der Linie (2 Schläge).' },
      { front: 'Welche Pause dauert genauso lang wie eine Viertelnote?', back: 'Die <b>Viertelpause</b>: 1 Schlag.' + zeile(['viertel', 'p_viertel'], { max: 220 }) },
      { front: 'Welche Pause dauert genauso lang wie eine halbe Note?', back: 'Die <b>halbe Pause</b>: 2 Schläge.' + zeile(['halb', 'p_halb'], { max: 220 }) }
    ] },
    { id: 'musik_aufpassen', titel: 'Aufpassen: Verwechsler', karten: () => [
      { front: 'Wie viele Schläge dauert eine <b>halbe Note</b>?', back: '<b>2 Schläge</b> (Tao).' + klein('Nicht 4! 4 Schläge dauert nur die ganze Note. Die halbe Note ist halb so lang.') },
      { front: frage(einzeln('halb'), 'Halbe Note oder Achtelnote?', 'hohler Kopf mit Hals'), back: '<b>Halbe Note</b>: hohler Kopf, Hals, kein Fähnchen. 2 Schläge.' },
      { front: frage(einzeln('achtel'), 'Halbe Note oder Achtelnote?', 'ausgemalter Kopf mit Fähnchen'), back: '<b>Achtelnote</b>: ausgemalter Kopf, Hals und Fähnchen. ½ Schlag.' },
      { front: 'Ganze Note und halbe Note: Was ist der Unterschied?', back: zeile(['ganz', 'halb'], { max: 230 }) + 'Beide haben einen <b>hohlen Kopf</b>. Die halbe Note hat einen <b>Hals</b>.<br>Ganze Note 4 Schläge, halbe Note 2 Schläge.' },
      { front: 'Viertelnote und halbe Note: Was ist der Unterschied?', back: zeile(['viertel', 'halb'], { max: 230 }) + 'Die Viertelnote hat einen <b>ausgemalten</b> Kopf (1 Schlag), die halbe Note einen <b>hohlen</b> Kopf (2 Schläge).' },
      { front: 'Achtelnote und Viertelnote: Was ist der Unterschied?', back: zeile(['achtel', 'viertel'], { max: 230 }) + 'Die Achtelnote hat ein <b>Fähnchen</b> und dauert ½ Schlag. Die Viertelnote dauert 1 Schlag.' },
      { front: 'Ordne nach der Länge, von lang nach kurz: Viertelnote, ganze Note, Achtelnote, halbe Note.', back: 'Ganze Note (4) → halbe Note (2) → Viertelnote (1) → Achtelnote (½)' + zeile(['ganz', 'halb', 'viertel', 'achtel'], { max: 300 }) }
    ] },
    { id: 'musik_tante', titel: 'Tante Ta und die Titis', karten: () => [
      { front: 'Wie viele Sitzplätze hat ein Wagen im <b>4/4-Takt</b>?', back: '<b>4 Sitzplätze</b>: so viele wie Grundschläge.' + wagen([]) },
      { front: 'Wie viele Sitzplätze braucht <b>Ta</b> (Viertelnote)?', back: '<b>1 Sitzplatz</b>' + wagen([['Ta', 1], ['Ta', 1], ['Ta', 1], ['Ta', 1]]) },
      { front: 'Wie viele Sitzplätze brauchen die <b>Titis</b> (zwei Achtelnoten)?', back: 'Zusammen <b>1 Sitzplatz</b>' + wagen([['Titi', 1], ['Ta', 1], ['Titi', 1], ['Ta', 1]]) },
      { front: 'Wie viele Sitzplätze braucht <b>Tao</b> (halbe Note)?', back: '<b>2 Sitzplätze</b>' + wagen([['Tao', 2], ['Ta', 1], ['Ta', 1]]) },
      { front: 'Wie viele Sitzplätze braucht <b>Taooo</b> (ganze Note)?', back: '<b>4 Sitzplätze</b>: der ganze Wagen' + wagen([['Taooo', 4]]) },
      { front: 'Wie viele Sitzplätze braucht die kleine Pause (<b>Viertelpause</b>)?', back: '<b>1 Sitzplatz</b>' + wagen([['Ta', 1], ['Pause', 1], ['Ta', 1], ['Ta', 1]]) },
      { front: 'Wie sprichst du eine <b>einzelne Achtelnote</b>?', back: '<b>Ti</b>: ½ Schlag. Zwei Achtelnoten zusammen sind Titi.' }
    ] },
    { id: 'musik_notenhaus', titel: 'Das Notenhaus', karten: () => [
      { front: 'Wie viele <b>halbe Noten</b> dauern so lang wie eine ganze Note?', back: '<b>2</b>' + notenhaus() },
      { front: 'Wie viele <b>Viertelnoten</b> dauern so lang wie eine ganze Note?', back: '<b>4</b>' + notenhaus() },
      { front: 'Wie viele <b>Achtelnoten</b> dauern so lang wie eine ganze Note?', back: '<b>8</b>' + notenhaus() },
      { front: 'Wie viele <b>Viertelnoten</b> dauern so lang wie eine halbe Note?', back: '<b>2</b>' + zeile(['halb', 'gleich', 'viertel', 'viertel'], { max: 260 }) },
      { front: 'Wie viele <b>Achtelnoten</b> dauern so lang wie eine Viertelnote?', back: '<b>2</b> (Titi = Ta)' + zeile(['viertel', 'gleich', 'titi'], { max: 240 }) },
      { front: 'Wie viele <b>Achtelnoten</b> dauern so lang wie eine halbe Note?', back: '<b>4</b>' + zeile(['halb', 'gleich', 'titi', 'titi'], { max: 300 }) }
    ] },
    { id: 'musik_takte', titel: 'Takte zählen', karten: () => {
      const schlagText = folge => folge.map(n => (ZEICHEN[n].schlaege === 0.5 ? '½' : ZEICHEN[n].schlaege)).join(' + ');
      const summe = folge => folge.reduce((s, n) => s + ZEICHEN[n].schlaege, 0);
      const zaehl = (folge, merkText) => {
        const s = summe(folge);
        const urteil = s === 4 ? 'Passt genau in einen <b>4/4-Takt</b>.' : s < 4 ? `Zu wenig für einen 4/4-Takt${s === 3 ? ', passt aber genau in einen <b>3/4-Takt</b>' : ''}.` : `<b>Zu viel</b> für einen 4/4-Takt: nach 4 Schlägen kommt ein Taktstrich.`;
        return { front: frage(zeile(folge), 'Wie viele Schläge sind das? Passt es genau in einen 4/4-Takt?', merkText),
          back: `${schlagText(folge)} = <b>${s} Schläge</b><br>${urteil}` };
      };
      return [
        zaehl(['viertel', 'viertel', 'halb'], 'Ta Ta Tao'),
        zaehl(['titi', 'viertel', 'viertel', 'viertel'], 'Titi Ta Ta Ta'),
        zaehl(['halb', 'halb'], 'Tao Tao'),
        zaehl(['ganz'], 'Taooo'),
        zaehl(['viertel', 'viertel', 'viertel'], 'Ta Ta Ta'),
        zaehl(['halb', 'viertel', 'titi'], 'Tao Ta Titi'),
        zaehl(['viertel', 'p_viertel', 'viertel', 'viertel'], 'Ta Pause Ta Ta'),
        zaehl(['halb', 'halb', 'viertel'], 'Tao Tao Ta'),
        zaehl(['p_halb', 'halb'], 'halbe Pause, Tao'),
        zaehl(['achtel', 'achtel', 'halb', 'viertel'], 'Ti Ti Tao Ta'),
        { front: frage(zeile(['halb', 'viertel', 'viertel', 'ganz'], { takt: '4/4', max: 320 }), 'Immer 4 Schläge gehören in einen Takt. Wo kommt der <b>Taktstrich</b> hin?', 'Tao Ta Ta Taooo'),
          back: zeile(['halb', 'viertel', 'viertel', 'strich', 'ganz', 'schluss'], { takt: '4/4', max: 360 }) + 'Nach <b>Tao Ta Ta</b> sind 4 Schläge voll (2 + 1 + 1).' },
        { front: frage(zeile(['titi', 'titi', 'halb', 'viertel', 'viertel', 'halb'], { takt: '4/4', max: 360 }), 'Wo kommt der <b>Taktstrich</b> hin?', 'Titi Titi Tao Ta Ta Tao'),
          back: zeile(['titi', 'titi', 'halb', 'strich', 'viertel', 'viertel', 'halb', 'schluss'], { takt: '4/4', max: 400 }) + 'Nach <b>Titi Titi Tao</b> sind 4 Schläge voll (1 + 1 + 2).' }
      ];
    } }
  ];

  let cache = null;
  function alle() { if (!cache) cache = STAPEL.map(s => ({ id: s.id, titel: s.titel, karten: s.karten() })); return cache; }

  /** Karten eines Stapels fürs Tablet (Heimatkunde-Lernkarten, Gruppe 'musik'). */
  function lernkartenTablet(id) { const s = alle().find(x => x.id === id); return s ? s.karten : []; }
  /** Für tools/export_lernkarten.js (Eltern-App). */
  function lernkartenFuerExport() { return alle(); }

  function renderMenu() {
    App.render(App.subMenuHtml('Musik', [
      { icon: 'musik', titel: 'Lernkarten: Noten &amp; Pausen', onclick: "Heimatkunde.starteThemenwahl('musik')" },
      { icon: 'rechtschreibung', titel: 'Noten &amp; Pausen zeichnen', onclick: 'Musik.starteZeichnen()' },
      { icon: 'ziel', titel: 'Taktstriche setzen', onclick: 'Musik.starteTaktstriche()' }
    ]));
  }

  // ------------------------------------------------------------------ Zeichnen
  // Uli: „Er soll auch Übungen bekommen, bei denen er die Noten und Pausen zeichnen muss.“ (am Tablet, mit dem Finger)
  // Max zeichnet auf eine Notenlinie, tippt „Fertig“, sieht daneben das Vorbild mit „Darauf achten“ und bewertet sich
  // selbst. Nicht geschafft -> die Aufgabe kommt ein paar Aufgaben später noch einmal. Halbe Note und Achtelnote sind in
  // jeder Runde dabei (die hat Max im Heft verwechselt). Eine Runde zählt als Lernart 'musik_zeichnen' für den Hof.
  const ZEICHNEN = {
    ganz: { text: 'eine <b>ganze Note</b>', achten: ['ein hohler, ovaler Kopf auf der Linie', '<b>kein</b> Hals'] },
    halb: { text: 'eine <b>halbe Note</b>', achten: ['ein <b>hohler</b> Kopf auf der Linie', 'rechts am Kopf ein Hals nach oben', 'kein Fähnchen'] },
    viertel: { text: 'eine <b>Viertelnote</b>', achten: ['ein <b>ausgemalter</b> Kopf auf der Linie', 'rechts am Kopf ein Hals nach oben'] },
    achtel: { text: 'eine <b>Achtelnote</b>', achten: ['ein <b>ausgemalter</b> Kopf auf der Linie', 'rechts am Kopf ein Hals nach oben', 'oben am Hals ein <b>Fähnchen</b> nach rechts'] },
    titi: { text: '<b>Titi</b> (zwei Achtelnoten)', achten: ['zwei ausgemalte Köpfe mit Hals', 'oben ein <b>Balken</b>, der beide Hälse verbindet'] },
    p_ganz: { text: 'eine <b>ganze Pause</b>', achten: ['ein ausgemaltes Rechteck', 'es <b>hängt</b> unter der Linie'] },
    p_halb: { text: 'eine <b>halbe Pause</b>', achten: ['ein ausgemaltes Rechteck', 'es <b>sitzt</b> auf der Linie'] },
    p_viertel: { text: 'eine <b>Viertelpause</b>', achten: ['ein Zickzack von oben nach unten', 'unten ein kleiner Haken'] },
    p_achtel: { text: 'eine <b>Achtelpause</b>', achten: ['oben ein Punkt mit einem kleinen Bogen', 'dann ein schräger Strich nach unten'] }
  };
  const TAKTE = [
    { folge: ['halb', 'viertel', 'viertel'], silben: 'Tao Ta Ta' },
    { folge: ['viertel', 'viertel', 'titi', 'viertel'], silben: 'Ta Ta Titi Ta' },
    { folge: ['halb', 'halb'], silben: 'Tao Tao' },
    { folge: ['viertel', 'p_viertel', 'viertel', 'viertel'], silben: 'Ta Pause Ta Ta' },
    { folge: ['titi', 'halb', 'viertel'], silben: 'Titi Tao Ta' },
    { folge: ['p_halb', 'viertel', 'viertel'], silben: 'halbe Pause, Ta Ta' }
  ];
  const zufall = a => a[Math.floor(Math.random() * a.length)];
  function mische(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

  function aufgabeZeichen(name) {
    const z = ZEICHNEN[name];
    return { name, takt: false, text: `Zeichne ${z.text} auf die Linie.`, vorbild: zeile([name], { max: 200 }), achten: z.achten, merk: ZEICHEN[name].name };
  }
  function aufgabeTakt(t) {
    return { takt: true, text: `Fülle den 4/4-Takt: <b>${t.silben}</b>` + klein('Sprich leise mit, während du zeichnest. Am Ende kommt ein Taktstrich.'),
      vorbild: zeile([...t.folge, 'strich'], { takt: '4/4', max: 380 }),
      achten: ['die Noten in der richtigen Reihenfolge', 'zusammen genau <b>4 Schläge</b>', 'am Ende ein <b>Taktstrich</b>'], merk: '4/4-Takt ' + t.silben };
  }
  function aufgabeFrei() {
    return { takt: true, text: 'Erfinde selbst einen <b>4/4-Takt</b>: genau 4 Schläge, mit mindestens zwei verschiedenen Noten oder Pausen.' + klein('Zähl beim Zeichnen mit. Am Ende kommt ein Taktstrich.'),
      vorbild: zeile(['viertel', 'titi', 'halb', 'strich'], { takt: '4/4', max: 380 }) + klein('Nur ein Beispiel – deiner darf anders sein.'),
      achten: ['zähle nach: sind es genau <b>4 Schläge</b>?', 'jede Note und Pause richtig gezeichnet', 'am Ende ein <b>Taktstrich</b>'], merk: 'eigener 4/4-Takt' };
  }
  function runde() {
    const pausen = mische(['p_ganz', 'p_halb', 'p_viertel', 'p_achtel']);
    const liste = [aufgabeZeichen('halb'), aufgabeZeichen('achtel'), aufgabeZeichen(zufall(['ganz', 'viertel', 'titi'])),
      aufgabeZeichen(pausen[0]), aufgabeZeichen(pausen[1]), Math.random() < 0.3 ? aufgabeFrei() : aufgabeTakt(zufall(TAKTE))];
    // halbe Note und Achtelnote nicht direkt hintereinander (sonst wird abgeschrieben statt erinnert)
    let m;
    for (let v = 0; v < 20; v++) {
      m = mische(liste);
      const ih = m.findIndex(a => a.name === 'halb'), ia = m.findIndex(a => a.name === 'achtel');
      if (Math.abs(ih - ia) > 1) break;
    }
    return m;
  }

  let zs = null;
  function starteZeichnen() {
    zs = { aufgaben: runde(), index: 0, richtig: 0, sterne: 0, verlauf: [] };
    App.setLastStarter(starteZeichnen);
    zeigeAufgabe();
  }

  function zeigeAufgabe() {
    const a = zs.aufgaben[zs.index];
    zs.fertig = false; zs.bewertet = false;
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Musik.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="progress-row"><span>Aufgabe ${zs.index + 1} / ${zs.aufgaben.length}</span><span>NOTEN ZEICHNEN</span></div>
      <div class="mz-auftrag">${a.text}</div>
      <div class="mz-reihe">
        <div class="mz-blatt"><canvas id="mz-canvas"></canvas></div>
        <div class="mz-seite" id="mz-seite">
          <div class="btn-primary" onclick="Musik.zeichnenFertig()">Fertig ✓</div>
          <div class="mz-knoepfe">
            <span class="mz-klein" onclick="Musik.zeichnenRueckgaengig()">↶ Rückgängig</span>
            <span class="mz-klein" onclick="Musik.zeichnenLoeschen()">Alles löschen</span>
          </div>
          <div class="mz-tipp">Zeichne mit dem Finger. Wenn du fertig bist, tippst du auf „Fertig“ und vergleichst mit dem Vorbild.</div>
        </div>
      </div>`);
    blattStarten(a);
  }

  // ---- Zeichenblatt: Notenlinie (+ 4/4 bei Takt-Aufgaben), Striche mit dem Finger (Pointer Events)
  let blatt = null;
  function blattStarten(a) {
    const c = document.getElementById('mz-canvas');
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(280, c.parentElement.clientWidth), h = 300;
    c.style.width = w + 'px'; c.style.height = h + 'px';
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    blatt = { c, ctx, w, h, takt: a.takt, striche: [], aktiv: null };
    maleAlles();
    const punkt = e => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    c.onpointerdown = e => {
      if (zs.fertig) return;
      e.preventDefault();
      try { c.setPointerCapture(e.pointerId); } catch (x) { /* z. B. Testlauf */ }
      blatt.aktiv = [punkt(e)];
      blatt.striche.push(blatt.aktiv);
      maleStrich(blatt.aktiv);
    };
    c.onpointermove = e => {
      const s = blatt.aktiv;
      if (!s) return;
      e.preventDefault();
      s.push(punkt(e));
      const n = s.length;
      linie(s[n - 2], s[n - 1]);
    };
    c.onpointerup = c.onpointercancel = c.onpointerleave = () => { blatt.aktiv = null; };
  }
  function stift() { const x = blatt.ctx; x.strokeStyle = '#F3F1EA'; x.fillStyle = '#F3F1EA'; x.lineWidth = 5; x.lineCap = 'round'; x.lineJoin = 'round'; }
  function linie(p, q) { const x = blatt.ctx; stift(); x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]); x.stroke(); }
  function maleStrich(s) {
    const x = blatt.ctx; stift();
    if (s.length === 1) { x.beginPath(); x.arc(s[0][0], s[0][1], 2.5, 0, Math.PI * 2); x.fill(); return; }
    x.beginPath(); x.moveTo(s[0][0], s[0][1]); s.slice(1).forEach(p => x.lineTo(p[0], p[1])); x.stroke();
  }
  function maleAlles() {
    const { ctx: x, w, h } = blatt, y = Math.round(h * 0.62);
    x.clearRect(0, 0, w, h);
    x.strokeStyle = 'rgba(233,236,245,.8)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(14, y); x.lineTo(w - 14, y); x.stroke();
    if (blatt.takt) {
      x.fillStyle = 'rgba(233,236,245,.9)'; x.font = "bold 40px Georgia, 'Times New Roman', serif"; x.textAlign = 'center';
      x.fillText('4', 42, y - 6); x.fillText('4', 42, y + 38);
    }
    blatt.striche.forEach(maleStrich);
  }
  function zeichnenRueckgaengig() { if (!blatt || zs.fertig) return; blatt.striche.pop(); maleAlles(); }
  function zeichnenLoeschen() { if (!blatt || zs.fertig) return; blatt.striche = []; maleAlles(); }

  function zeichnenFertig() {
    if (!zs || zs.fertig) return;
    const a = zs.aufgaben[zs.index];
    if (blatt && !blatt.striche.length) { const t = document.querySelector('.mz-tipp'); if (t) { t.textContent = 'Zeichne zuerst etwas auf die Linie.'; t.classList.add('mz-tipp-warn'); } return; }
    zs.fertig = true;
    document.getElementById('mz-seite').innerHTML = `
      <div class="mz-vorbild-titel">So sieht es richtig aus:</div>
      <div class="mz-vorbild">${a.vorbild}</div>
      <div class="mz-achten-titel">Darauf achten:</div>
      <ul class="mz-achten">${a.achten.map(t => `<li>${t}</li>`).join('')}</ul>
      <div class="mz-frage">Hast du es richtig gezeichnet?</div>
      <div class="mz-bewertung">
        <div class="btn-bewertung btn-falsch" onclick="Musik.zeichnenBewerten(false)">✘ Noch nicht ganz</div>
        <div class="btn-bewertung btn-richtig" onclick="Musik.zeichnenBewerten(true)">✔ Richtig</div>
      </div>`;
  }

  function zeichnenBewerten(ok) {
    if (!zs || !zs.fertig || zs.bewertet) return;
    zs.bewertet = true;
    const a = zs.aufgaben[zs.index];
    if (!a._wdh) Ferientraining.melde('musik_zeichnen', ok);
    const gained = Storage.addAntwort('heimat', ok, 1);
    if (ok) { zs.richtig++; zs.sterne += gained; }
    zs.verlauf.push({ frage: 'Zeichnen: ' + a.merk, ergebnis: ok ? 'richtig' : 'falsch' });
    // noch nicht geschafft: drei Aufgaben später noch einmal (einmal)
    if (!ok && !a._wdh) zs.aufgaben.splice(Math.min(zs.aufgaben.length, zs.index + 3), 0, Object.assign({}, a, { _wdh: true }));
    App.updateTopbar();
    zs.index++;
    if (zs.index < zs.aufgaben.length) { zeigeAufgabe(); return; }
    Ferientraining.abschluss('musik_zeichnen');
    const n = zs.aufgaben.length;
    const emoji = zs.richtig === n ? '🏆' : zs.richtig / n >= 0.7 ? '🎉' : '🙂';
    App.render(`
      <div class="result-card">
        <div class="result-emoji">${emoji}</div>
        <div class="result-title">${zs.richtig} von ${n} richtig gezeichnet!</div>
        <div class="result-sterne">Du hast ${zs.sterne} ⭐ verdient</div>
        <div class="btn-primary" onclick="Musik.starteZeichnen()">Noch eine Runde</div>
        <div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);" onclick="Heimatkunde.starteThemenwahl('musik')">Musik-Lernkarten</div>
        <div class="btn-primary" style="background:var(--muted);color:var(--ink);" onclick="App.gotoHome()">Zum Hauptmenü</div>
      </div>`);
    FernSync.meldeLernsetErledigt('Noten zeichnen', `${zs.richtig} von ${n} richtig gezeichnet (selbst verglichen)`, zs.sterne, 'heimat', zs.verlauf);
  }

  // ------------------------------------------------------------------ Taktstriche setzen
  // Wie Max' Arbeitsblatt „Immer 4 Schläge gehören in einen Takt … Trage die fehlenden Taktstriche ein“ (Uli 15.11.: freie Hand):
  // drei Takte ohne Taktstriche, Max tippt in die Lücken, die App prüft. Richtig ist eine Lücke genau dort, wo die Schläge
  // zusammen 4, 8, … ergeben. „Hilfe: Schläge zeigen“ schreibt die Schläge über die Noten (wie Max im Heft) – dann gibt es
  // halbe Sterne und es zählt nicht als „beim ersten Versuch“. Lernart 'musik_taktstriche'.
  const TAKT_MUSTER = [
    ['halb', 'halb'], ['viertel', 'viertel', 'viertel', 'viertel'], ['halb', 'viertel', 'viertel'], ['viertel', 'viertel', 'halb'],
    ['titi', 'viertel', 'halb'], ['ganz'], ['titi', 'titi', 'viertel', 'viertel'], ['viertel', 'p_viertel', 'halb'], ['p_halb', 'viertel', 'viertel'],
    ['achtel', 'achtel', 'halb', 'viertel'], ['viertel', 'halb', 'viertel'], ['titi', 'viertel', 'titi', 'viertel'], ['halb', 'p_halb']
  ];
  const TS_RUNDE = 5;
  function taktAufgabe() {
    let takte;
    do {
      takte = [zufall(TAKT_MUSTER), zufall(TAKT_MUSTER), zufall(TAKT_MUSTER)];
    } while (takte[0] === takte[1] || takte[1] === takte[2] || takte.reduce((n, t) => n + t.length, 0) > 11);
    const folge = [].concat(...takte);
    const loesung = new Set();
    let summe = 0;
    folge.forEach((n, i) => { summe += ZEICHEN[n].schlaege; if (i < folge.length - 1 && summe % 4 === 0) loesung.add(i); });
    return { folge, loesung };
  }
  const schlagZahl = n => (ZEICHEN[n].schlaege === 0.5 ? '½' : String(ZEICHEN[n].schlaege));

  /** Notenreihe mit 4/4, Lücken zum Antippen (Lücke i = nach Zeichen i), Schlussstrich am Ende. */
  function taktBild() {
    const a = ts.aufgaben[ts.index], y = 92;
    let x = 14, teile = '', treffer = '';
    const t = (ty, z) => `<text x="${x + 12}" y="${ty}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="29" font-weight="700" fill="currentColor">${z}</text>`;
    teile += t(y - 4, '4') + t(y + 26, '4');
    x += 42;
    a.folge.forEach((n, i) => {
      const z = ZEICHEN[n], mx = x + z.breite / 2;
      teile += z.svg(mx, y);
      if (ts.hilfe || ts.geprueft) teile += `<text x="${n === 'titi' ? mx : mx + 4}" y="${y - 62}" text-anchor="middle" font-size="16" font-weight="800" fill="${AKZENT}">${schlagZahl(n)}</text>`;
      x += z.breite;
      if (i === a.folge.length - 1) return;
      const gx = x + 13, gesetzt = ts.gesetzt.has(i), richtig = a.loesung.has(i);
      if (ts.geprueft && (gesetzt || richtig)) {
        const farbe = gesetzt && richtig ? '#2FBF71' : gesetzt ? '#FF6B6B' : '#2FBF71';
        teile += `<line x1="${gx}" y1="${y - 26}" x2="${gx}" y2="${y + 26}" stroke="${farbe}" stroke-width="3.4"${gesetzt ? '' : ' stroke-dasharray="5 4"'}/>`;
      } else if (gesetzt) {
        teile += `<line x1="${gx}" y1="${y - 26}" x2="${gx}" y2="${y + 26}" stroke="currentColor" stroke-width="3"/>`;
      } else if (!ts.geprueft) {
        teile += `<circle cx="${gx}" cy="${y + 34}" r="2.4" fill="currentColor" fill-opacity=".35"/>`;
      }
      if (!ts.geprueft) treffer += `<rect x="${gx - 16}" y="${y - 70}" width="32" height="118" fill="transparent" style="cursor:pointer" onclick="Musik.taktTippe(${i})"/>`;
      x += 26;
    });
    x += 14;
    teile += ZEICHEN.schluss.svg(x, y);
    const b = x + 20;
    return `<svg viewBox="0 0 ${b} 132" style="width:100%;max-width:${Math.min(1050, Math.round(b * 1.75))}px;display:block;margin:6px auto;" xmlns="http://www.w3.org/2000/svg">` +
      `<line x1="8" y1="${y}" x2="${x}" y2="${y}" stroke="currentColor" stroke-width="1.6"/>${teile}${treffer}</svg>`;
  }

  let ts = null;
  function starteTaktstriche() {
    ts = { aufgaben: Array.from({ length: TS_RUNDE }, taktAufgabe), index: 0, richtig: 0, sterne: 0, verlauf: [] };
    App.setLastStarter(starteTaktstriche);
    zeigeTaktAufgabe();
  }
  function zeigeTaktAufgabe() {
    ts.gesetzt = new Set(); ts.geprueft = false; ts.hilfe = false;
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Musik.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="progress-row"><span>Aufgabe ${ts.index + 1} / ${ts.aufgaben.length}</span><span>TAKTSTRICHE SETZEN</span></div>
      <div class="mz-auftrag">Immer 4 Schläge gehören in einen Takt.<br>Tippe in die Lücken, wo ein <b>Taktstrich</b> hinkommt.</div>
      <div class="ts-bild" id="ts-bild">${taktBild()}</div>
      <div class="ts-unten" id="ts-unten">
        <div class="ts-knoepfe">
          <span class="mz-klein" id="ts-hilfe" onclick="Musik.taktHilfe()">💡 Hilfe: Schläge zeigen</span>
          <span class="btn-primary ts-pruefen" onclick="Musik.taktPruefen()">Prüfen ✓</span>
        </div>
        <div class="mz-tipp">Nochmal tippen nimmt einen Taktstrich wieder weg.</div>
      </div>`);
  }
  function taktTippe(i) {
    if (!ts || ts.geprueft) return;
    if (ts.gesetzt.has(i)) ts.gesetzt.delete(i); else ts.gesetzt.add(i);
    document.getElementById('ts-bild').innerHTML = taktBild();
  }
  function taktHilfe() {
    if (!ts || ts.geprueft || ts.hilfe) return;
    ts.hilfe = true;
    document.getElementById('ts-bild').innerHTML = taktBild();
    const h = document.getElementById('ts-hilfe');
    if (h) h.outerHTML = '<span class="mz-tipp">Zähle mit: Wo sind es zusammen 4?</span>';
  }
  function taktPruefen() {
    if (!ts || ts.geprueft) return;
    const a = ts.aufgaben[ts.index];
    const ok = a.loesung.size === ts.gesetzt.size && [...a.loesung].every(i => ts.gesetzt.has(i));
    ts.geprueft = true;
    if (!a._wdh) Ferientraining.melde('musik_taktstriche', ok && !ts.hilfe);
    const gained = Storage.addAntwort('heimat', ok, ts.hilfe ? 0.5 : 1);
    if (ok) { ts.richtig++; ts.sterne += gained; }
    ts.verlauf.push({ frage: 'Taktstriche setzen: ' + a.folge.map(n => ZEICHEN[n].silbe || ZEICHEN[n].name).join(' '), ergebnis: ok ? 'richtig' : 'falsch' });
    // nicht geschafft: dieselbe Reihe zwei Aufgaben später noch einmal (einmal)
    if (!ok && !a._wdh) ts.aufgaben.splice(Math.min(ts.aufgaben.length, ts.index + 3), 0, Object.assign({}, a, { _wdh: true }));
    App.updateTopbar();
    document.getElementById('ts-bild').innerHTML = taktBild();
    document.getElementById('ts-unten').innerHTML = `
      <div class="ts-meldung ${ok ? 'ts-ok' : 'ts-falsch'}">${ok ? 'Richtig! 🎉 Jeder Takt hat genau 4 Schläge.'
        : 'Noch nicht ganz. <span style="color:#2FBF71">Grün</span> = hier gehört ein Taktstrich hin' + (ts.gesetzt.size ? ', <span style="color:#FF6B6B">rot</span> = hier nicht' : '') + '. Die Zahlen zeigen die Schläge.'}</div>
      <div class="btn-primary" onclick="Musik.taktWeiter()">Weiter ➜</div>`;
  }
  function taktWeiter() {
    if (!ts || !ts.geprueft) return;
    ts.index++;
    if (ts.index < ts.aufgaben.length) { zeigeTaktAufgabe(); return; }
    Ferientraining.abschluss('musik_taktstriche');
    const n = ts.aufgaben.length;
    const emoji = ts.richtig === n ? '🏆' : ts.richtig / n >= 0.7 ? '🎉' : '🙂';
    App.render(`
      <div class="result-card">
        <div class="result-emoji">${emoji}</div>
        <div class="result-title">${ts.richtig} von ${n} richtig!</div>
        <div class="result-sterne">Du hast ${ts.sterne} ⭐ verdient</div>
        <div class="btn-primary" onclick="Musik.starteTaktstriche()">Noch eine Runde</div>
        <div class="btn-primary" style="background:var(--accent-soft);color:var(--accent-dark);" onclick="Musik.renderMenu()">Zur Musik</div>
        <div class="btn-primary" style="background:var(--muted);color:var(--ink);" onclick="App.gotoHome()">Zum Hauptmenü</div>
      </div>`);
    FernSync.meldeLernsetErledigt('Taktstriche setzen', `${ts.richtig} von ${n} richtig`, ts.sterne, 'heimat', ts.verlauf);
  }

  return { renderMenu, lernkartenTablet, lernkartenFuerExport, starteZeichnen, zeichnenFertig, zeichnenBewerten, zeichnenRueckgaengig, zeichnenLoeschen,
    starteTaktstriche, taktTippe, taktHilfe, taktPruefen, taktWeiter, _taktAufgabe: taktAufgabe,
    STAPEL_TITEL: STAPEL.map(s => [s.id, s.titel]), _ZEICHEN: ZEICHEN, _zeile: zeile, _runde: runde };
})();
