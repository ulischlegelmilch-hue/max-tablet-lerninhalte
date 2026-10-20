// Auto-Quartett gegen den Computer (Supersportwagen-Karten). Regeln/Kartenlogik: quartett-engine.js,
// HTML-Bausteine: quartett-ui.js. Dieses Modul ist Menue + Computer-Gegner + Tipp.
// Wie bei Mau-Mau wird nichts zwischen Sitzungen gespeichert, nur der Sieg-Zaehler.
const Quartett = (function () {
  const E = QuartettEngine;
  const NS = 'Quartett';
  const NAMEN = { gegner: 'Computer' };
  const STUFEN = [
    { key: 'leicht', name: 'Leicht' },
    { key: 'normal', name: 'Normal' },
    { key: 'schlau', name: 'Schlau' }
  ];
  const MAX_TIPPS = 3;
  const SIEG_STERNE = 20;

  E.setzeSaetze(QuartettSaetze);
  QuartettUI.setzeBildBasis('img/');

  let sp = null;
  let stufe = 'normal';
  let satzId = 'autos';
  let gesehenNr = 0;
  let tippsUebrig = MAX_TIPPS;
  let tippAktiv = false;
  let belohnt = false;
  let kiHandle = null;

  function raeumeAuf() { if (kiHandle) { clearTimeout(kiHandle); kiHandle = null; } }

  function renderMenu() {
    App.render(App.subMenuHtml('Quartett', [
      { icon: 'quartett', titel: 'Neues Spiel', onclick: 'Quartett.renderStufe()' },
      { icon: 'online', titel: 'Online gegen Papa', onclick: 'QuartettOnline.starteAnsicht()' },
      { icon: 'schach', titel: 'Alle Karten ansehen', onclick: 'Quartett.renderSammlung()' },
      { icon: 'einstellungen', titel: 'Spielregeln', onclick: 'Quartett.renderRegeln()' }
    ]));
  }

  function renderStufe() {
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Quartett.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="qz-wrap buehne-marker">
        <div class="qz-info">Welche Karten möchtest du spielen?</div>
        ${satzWahlHtml('Quartett.waehleSatz')}
        <div class="qz-info">Wie schlau soll der Computer sein?</div>
        <div class="qz-stufen">${STUFEN.map((s) => `<span class="qz-stufe${s.key === stufe ? ' qz-aktiv' : ''}" onclick="Quartett.waehleStufe('${s.key}')">${s.name}</span>`).join('')}</div>
        <div class="qz-menue-hinweis">Leicht: wählt oft zufällig · Normal: meist den besten Wert · Schlau: immer den besten Wert</div>
        <div class="qz-aktionen"><span class="qz-btn" onclick="Quartett.starteSpiel()">Los geht's</span></div>
      </div>`);
  }

  function satzWahlHtml(fn) {
    return `<div class="qz-stufen">${E.satzListe().map((s) => `<span class="qz-stufe${s.id === satzId ? ' qz-aktiv' : ''}" onclick="${fn}('${s.id}')">${QuartettUI.esc(s.name)}</span>`).join('')}</div>`;
  }

  function waehleSatz(id) { satzId = id; renderStufe(); }
  function aktuellerSatz() { return satzId; }
  function waehleStufe(key) { stufe = key; renderStufe(); }

  function renderRegeln() {
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Quartett.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="qz-wrap">
        <div class="qz-info">Spielregeln</div>
        <div class="qz-hinweis" style="max-width:560px;text-align:left;font-size:15px;line-height:1.5;color:#eef1f5">
          <p>Es gibt zwei Kartensätze: Supersportwagen und Dampflokomotiven. Die Karten werden gleichmäßig verteilt, und jeder sieht nur seine oberste.</p>
          <p>Wer dran ist, tippt auf einen <strong>Wert</strong> seiner Karte, zum Beispiel die Höchstgeschwindigkeit. Dann werden beide Karten aufgedeckt. Wer den <strong>besseren Wert</strong> hat, bekommt beide Karten.</p>
          <p>Meistens gewinnt der größere Wert. Aber Vorsicht, manche Werte sind umgekehrt: Bei den Autos gewinnt bei <strong>0 auf 100</strong> und beim <strong>Gewicht</strong> der <strong>kleinere</strong> Wert und beim Baujahr das <strong>neuere</strong> Auto. Bei den Dampfloks gewinnt beim Baujahr die <strong>ältere</strong> Lok, bei den Rädern die Lok mit <strong>mehr</strong> Rädern. Auf jeder Karte steht unter dem Wert, wer gewinnt.</p>
          <p>Wer gewinnt, darf den nächsten Wert aussuchen. Bei Gleichstand bleiben die Karten in der Mitte liegen, und wer die nächste Runde gewinnt, nimmt sie mit.</p>
          <p>Wer alle Karten hat, gewinnt. Nach 60 Runden gewinnt, wer mehr Karten hat.</p>
        </div>
      </div>`);
  }

  function renderSammlung() {
    const karten = E.alleIds(satzId).map((id) => QuartettUI.karteHtml(id)).join('');
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Quartett.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="qz-wrap"><div class="qz-info">Alle ${E.alleIds(satzId).length} Karten</div>
        ${satzWahlHtml('Quartett.waehleSammlung')}
        <div class="qz-paar">${karten.split('</article>').filter(Boolean).map((k) => `<div class="qz-seite">${k}</article></div>`).join('')}</div>
        <div class="qz-hinweis">Fotos: Wikimedia Commons, Urheber in der Eltern-App.</div>
      </div>`);
  }

  function waehleSammlung(id) { satzId = id; renderSammlung(); }

  function starteSpiel() {
    raeumeAuf();
    sp = E.neuesSpiel('spieler', 'computer', null, satzId);
    gesehenNr = 0; tippsUebrig = MAX_TIPPS; tippAktiv = false; belohnt = false;
    zeichne();
  }

  function zeichne(extraInfo) {
    App.setOnLeaveScreen(null);
    const stand = E.standFuerRolle(sp, 'spieler');
    const tippKey = tippAktiv && stand.meineKarte ? E.besterWert(stand.meineKarte) : null;
    let tippText = '';
    if (tippKey && stand.meineKarte) {
      const w = E.wertInfo(sp.satz, tippKey);
      tippText = `💡 Hier ist deine Karte stark: <strong>${QuartettUI.esc(w.label)}</strong> (Platz ${E.platz(stand.meineKarte, tippKey)} von ${E.alleIds(sp.satz).length}, ${QuartettUI.esc(w.hinweis)}).`;
    }
    const html = QuartettUI.spielHtml(stand, 'spieler', NAMEN, NS, {
      gesehenNr, tippErlaubt: tippsUebrig > 0, tippAktiv, tippText
    });
    App.render(`
      <div class="back-row"><span class="back-btn" onclick="Quartett.renderMenu()">${Icons.svg('zurueck')} Zurück</span></div>
      ${html.replace(`onclick="${NS}.tipp()">💡 Tipp<`, `onclick="${NS}.tipp()">💡 Tipp (${tippsUebrig})<`)}`);
    App.setOnLeaveScreen(raeumeAuf);
  }

  function waehle(key) {
    if (!sp || sp.status !== 'laeuft' || sp.amZug !== 'spieler' || gesehenNr < sp.rundenNr) return;
    tippAktiv = false;
    E.spieleRunde(sp, 'spieler', key);
    zeichne();
  }

  function weiter() {
    if (!sp) return;
    gesehenNr = sp.rundenNr;
    if (sp.status === 'beendet') { belohne(); zeichne(); return; }
    zeichne();
    if (sp.amZug === 'computer') computerZug();
  }

  function computerZug() {
    raeumeAuf();
    // kurze Denkpause, damit Max den Zug des Computers nachvollziehen kann
    kiHandle = setTimeout(() => {
      kiHandle = null;
      if (!sp || sp.status !== 'laeuft' || sp.amZug !== 'computer') return;
      E.spieleRunde(sp, 'computer', E.computerWahl(E.obersteKarte(sp, 'computer'), stufe));
      zeichne();
    }, 1400);
  }

  function belohne() {
    if (belohnt || !sp || sp.aufgegebenVon === 'spieler') return;
    belohnt = true;
    const gewonnen = sp.gewinner === 'spieler';
    Storage.meldeQuartettPartie(gewonnen);
    if (gewonnen) { Storage.addSterne(SIEG_STERNE); App.updateTopbar(); }
  }

  function tipp() {
    if (!sp || sp.amZug !== 'spieler' || tippsUebrig <= 0 || tippAktiv) return;
    tippsUebrig--; tippAktiv = true; zeichne();
  }

  function aufgeben() {
    if (!sp || sp.status !== 'laeuft') return;
    E.aufgeben(sp, 'spieler');
    gesehenNr = sp.rundenNr;
    raeumeAuf();
    zeichne();
  }

  function neuesSpiel() { renderStufe(); }

  function fortschrittText() {
    const f = Storage.getQuartettFortschritt();
    return f.siege > 0 ? `${f.siege} ${f.siege === 1 ? 'Sieg' : 'Siege'}` : 'Noch nicht gespielt';
  }

  return { renderMenu, renderStufe, waehleStufe, waehleSatz, aktuellerSatz, waehleSammlung, satzWahlHtml, renderRegeln, renderSammlung, starteSpiel, waehle, weiter, tipp, aufgeben, neuesSpiel, fortschrittText, belohneOnline: null };
})();
