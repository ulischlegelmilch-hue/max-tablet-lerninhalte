// Auto-Quartett: HTML-Bausteine (ohne eigenen Zustand). Wird vom Tablet (quartett.js,
// quartett-online.js) und von der Eltern-App (backend/webapp) genutzt - Kopie unter backend/webapp
// erzeugt tools/export_quartett.js, nur hier aendern.
//
// ns = Name des globalen Objekts, dessen Methoden die Klicks bekommen:
//   waehle(key), weiter(), tipp(), aufgeben(), neuesSpiel()
const QuartettUI = (function () {
  const E = QuartettEngine;
  let bildBasis = 'img/'; // + Satz-Ordner + '/' + Dateiname

  function setzeBildBasis(b) { bildBasis = b; }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /** opt: { ns, klickbar, tipp (key), markiert: { key: 'sieg'|'niederlage'|'gleich' }, wahl (key) } */
  function karteHtml(id, opt) {
    const o = opt || {};
    const a = E.auto(id);
    if (!a) return '';
    const zeilen = E.werte(a.satz).map((w) => {
      const klassen = ['qz-wert'];
      if (o.markiert && o.markiert[w.key]) klassen.push('qz-' + o.markiert[w.key]);
      if (o.wahl === w.key) klassen.push('qz-gewaehlt');
      if (o.tipp === w.key) klassen.push('qz-tipp');
      if (o.klickbar) klassen.push('qz-klickbar');
      const klick = o.klickbar ? ` onclick="${o.ns}.waehle('${w.key}')"` : '';
      const zusatz = o.klickbar ? `<small>${esc(w.hinweis)}</small>` : '';
      return `<li class="${klassen.join(' ')}"${klick}><span class="qz-label">${esc(w.label)}${zusatz}</span><b>${E.formatWert(a.satz, w.key, a[w.key])}</b></li>`;
    }).join('');
    return `<article class="qz-karte">
      <div class="qz-bild"><span class="qz-gruppe">${esc(a.gruppe)}</span><span class="qz-marke">${esc(a.marke)}</span>
        <img src="${bildBasis}${esc(E.satz(a.satz).ordner)}/${esc(a.foto)}" alt="${esc(a.marke + ' ' + a.name)}"></div>
      <div class="qz-name">${esc(a.name)}</div>${a.zusatz ? `<div class="qz-zusatz">${esc(a.zusatz)}</div>` : ''}
      <ul class="qz-werte">${zeilen}</ul>
    </article>`;
  }

  function rueckseiteHtml(text) {
    return `<div class="qz-rueck"><div class="qz-rueck-logo">🏁</div><div>${esc(text || '')}</div></div>`;
  }

  function zaehlerHtml(meine, mitte, gegner, gegnerName, runde, maxRunden) {
    return `<div class="qz-zaehler">
      <span><b>${meine}</b> Du</span>
      <span class="qz-mitte">${mitte > 0 ? `Mitte: ${mitte}` : ''}<small>Runde ${Math.min(runde + 1, maxRunden)} von ${maxRunden}</small></span>
      <span>${esc(gegnerName)} <b>${gegner}</b></span>
    </div>`;
  }

  /** Aufgedeckte Runde aus Sicht der Rolle `ich`. */
  function aufdeckHtml(stand, ich, namen, ns) {
    const r = stand.letzteRunde;
    const gegnerRolle = r.wahlVon === ich ? Object.keys(r.karten).find((k) => k !== ich) : r.wahlVon;
    const meinId = r.karten[ich], seinId = r.karten[gegnerRolle];
    const mein = E.auto(meinId), sein = E.auto(seinId);
    const v = E.vergleiche(mein, sein, r.wahl);
    const mm = {}, sm = {};
    mm[r.wahl] = v > 0 ? 'sieg' : v < 0 ? 'niederlage' : 'gleich';
    sm[r.wahl] = v > 0 ? 'niederlage' : v < 0 ? 'sieg' : 'gleich';
    const info = E.wertInfo(stand.satz, r.wahl);
    const wahlName = r.wahlVon === ich ? 'Du hast' : namen.gegner + ' hat';
    let urteil;
    if (v > 0) urteil = `<div class="qz-urteil qz-urteil-sieg">🏆 Punkt für dich!</div>`;
    else if (v < 0) urteil = `<div class="qz-urteil qz-urteil-niederlage">${esc(namen.gegner)} gewinnt diese Runde</div>`;
    else urteil = `<div class="qz-urteil qz-urteil-gleich">Gleichstand – die Karten liegen in der Mitte</div>`;
    const bonus = r.mitgenommen > 0 && r.gewinner
      ? `<div class="qz-hinweis">${r.gewinner === ich ? 'Du nimmst' : esc(namen.gegner) + ' nimmt'} auch die ${r.mitgenommen} Karten aus der Mitte mit!</div>` : '';
    const ende = stand.status === 'beendet';
    return `<div class="qz-aufdecken">
      <div class="qz-hinweis">${wahlName} <strong>${esc(info.label)}</strong> gewählt (${esc(info.hinweis)}).</div>
      <div class="qz-paar">
        <div class="qz-seite"><div class="qz-seitenname">Du</div>${karteHtml(meinId, { markiert: mm })}</div>
        <div class="qz-seite"><div class="qz-seitenname">${esc(namen.gegner)}</div>${karteHtml(seinId, { markiert: sm })}</div>
      </div>
      ${urteil}${bonus}
      <div class="qz-aktionen"><span class="qz-btn" onclick="${ns}.weiter()">${ende ? 'Ergebnis ansehen' : 'Weiter'}</span></div>
    </div>`;
  }

  function endeHtml(stand, ich, namen, ns) {
    let text, klasse;
    if (stand.aufgegebenVon) {
      if (stand.aufgegebenVon === ich) { text = 'Du hast aufgegeben.'; klasse = 'niederlage'; }
      else { text = `${namen.gegner} hat aufgegeben – du gewinnst!`; klasse = 'sieg'; }
    } else if (!stand.gewinner) { text = 'Unentschieden!'; klasse = 'gleich'; }
    else if (stand.gewinner === ich) { text = `🏆 Du hast gewonnen! ${stand.meineAnzahl} zu ${stand.gegnerAnzahl} Karten.`; klasse = 'sieg'; }
    else { text = `${namen.gegner} gewinnt mit ${stand.gegnerAnzahl} zu ${stand.meineAnzahl} Karten.`; klasse = 'niederlage'; }
    return `<div class="qz-ende"><div class="qz-urteil qz-urteil-${klasse}">${text}</div>
      <div class="qz-aktionen"><span class="qz-btn" onclick="${ns}.neuesSpiel()">Neues Spiel</span></div></div>`;
  }

  /** Haupt-Ansicht. stand = QuartettEngine.standFuerRolle(...) (+ optional gesehenNr). */
  function spielHtml(stand, ich, namen, ns, opt) {
    const o = opt || {};
    const kopf = zaehlerHtml(stand.meineAnzahl, stand.mitteGroesse, stand.gegnerAnzahl, namen.gegner, stand.runden, stand.maxRunden);
    if (stand.letzteRunde && stand.rundenNr > (o.gesehenNr || 0)) {
      return `<div class="qz-wrap">${kopf}${aufdeckHtml(stand, ich, namen, ns)}</div>`;
    }
    if (stand.status === 'beendet') return `<div class="qz-wrap">${kopf}${endeHtml(stand, ich, namen, ns)}</div>`;
    const eigenerZug = stand.amZug === ich;
    const infoText = eigenerZug
      ? 'Du bist dran: tippe auf einen Wert, bei dem deine Karte stark ist.'
      : `${namen.gegner} sucht einen Wert aus …`;
    const tippKey = o.tippAktiv && eigenerZug ? E.besterWert(stand.meineKarte) : null;
    const tippBtn = eigenerZug && o.tippErlaubt
      ? `<span class="qz-btn qz-btn-sekundaer" onclick="${ns}.tipp()">💡 Tipp</span>` : '';
    return `<div class="qz-wrap">${kopf}
      <div class="qz-info">${infoText}</div>
      <div class="qz-eigene">${stand.meineKarte ? karteHtml(stand.meineKarte, { ns, klickbar: eigenerZug, tipp: tippKey }) : ''}</div>
      ${o.tippText && eigenerZug ? `<div class="qz-hinweis">${o.tippText}</div>` : ''}
      <div class="qz-aktionen">${tippBtn}<span class="qz-btn qz-btn-sekundaer" onclick="${ns}.aufgeben()">Aufgeben</span></div>
    </div>`;
  }

  return { setzeBildBasis, karteHtml, rueckseiteHtml, spielHtml, aufdeckHtml, endeHtml, esc };
})();
