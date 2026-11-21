// Testzeit (21.11.2026), Uli: „eine Art Timer … Arbeitsblätter, die er in einer gewissen Zeit lösen soll. Der Timer soll laufen,
// ohne dass der Bildschirm verdunkelt, und es sollte Sprachansagen geben, die ihn durch diese quasi Testarbeit führen und motivieren.“
// Geklärt: Uli startet den Timer selbst über die Kachel „Testzeit“ auf Max' Startseite (kein PIN), nur Titel + Minuten,
// kein „Blatt fertig“. Stimme „Mats“ (ElevenLabs, aus der Lauf-App), Ansagen liegen als MP3 in sounds/testzeit/
// (erzeugt mit tools/testzeit/ansagen.js). Bildschirm bleibt an über AndroidBridge.bildschirmAn (App ab 2.12).
//
// Der Stand liegt in localStorage (SPEICHER), damit ein Inhalts-Update oder ein Neustart der App mitten in der Testzeit
// nichts kaputt macht: App.init ruft Testzeit.fortsetzen() auf, die Uhr rechnet immer mit der echten Startzeit.
// Look: GLANZ (Leitstand-Stil wie VOLLDAMPF), unten rechts bleibt die Ecke fürs 🔒 frei.
const Testzeit = (function () {
  const SPEICHER = 'maxlernt_testzeit_v1';
  const MIN = 5, MAX = 120, SCHRITT = 5;
  const SCHNELL = [15, 20, 30, 45, 60];
  const TON = 'sounds/testzeit/';
  const MIN_MS = 60000;
  const VERPASST_MS = 45000;   // Ansagen, die beim Fortsetzen länger als das her sind, werden still übersprungen

  // Alle Ansagen, die es als Datei gibt (muss zu tools/testzeit/ansagen.js passen, prüft tests/testzeit_test.js)
  const START = []; for (let m = MIN; m <= MAX; m += SCHRITT) START.push('start_' + m);
  const VARIANTEN = {
    tipp: ['tipp_1', 'tipp_2'], halbzeit: ['halbzeit_1', 'halbzeit_2'],
    mut: ['mut_1', 'mut_2', 'mut_3', 'mut_4', 'mut_5', 'mut_6'],
    ende: ['ende_1', 'ende_2'], abgabe: ['abgabe_1', 'abgabe_2']
  };
  const ANSAGEN = START.concat(['noch_10', 'noch_5', 'noch_1', 'kontrolle'],
    ...Object.keys(VARIANTEN).map(k => VARIANTEN[k]));

  let S = null;          // { titel, minuten, start, plan:[{t, clips, art}], naechste, fertig:{art, ms}|null }
  let wurzel = null, takt = null, wachSperre = null, eingestellt = null;

  // ------------------------------------------------------------------ Plan (welche Ansage wann) – rein rechnerisch, testbar
  function zufall(liste, r) { return liste[Math.floor(r() * liste.length) % liste.length]; }
  /** Plan für eine Testzeit von `minuten`. r = Zufallsfunktion (für Tests fest). Zeiten in ms ab Start. */
  function planFuer(minuten, r) {
    r = r || Math.random;
    const D = minuten * MIN_MS;
    const fest = [{ t: 0, art: 'start', clips: ['start_' + minuten, zufall(VARIANTEN.tipp, r)] }];
    if (minuten >= 25) fest.push({ t: D - 10 * MIN_MS, art: 'noch_10', clips: ['noch_10'] });
    if (minuten >= 10) fest.push({ t: D - 5 * MIN_MS, art: 'noch_5', clips: ['noch_5'] });
    fest.push({ t: D - MIN_MS, art: 'noch_1', clips: ['noch_1'] });
    if (minuten >= 20) {
      const h = D / 2;
      if (!fest.some(a => a.t > 0 && Math.abs(a.t - h) < 2 * MIN_MS)) fest.push({ t: h, art: 'halbzeit', clips: [zufall(VARIANTEN.halbzeit, r)] });
    }
    // Mut machen: in festen Abständen, aber nicht kurz vor/nach einer anderen Ansage und nicht in den letzten 6 Minuten
    const abstand = (minuten <= 30 ? 8 : minuten <= 60 ? 10 : 15) * MIN_MS;
    const mutListe = VARIANTEN.mut.slice().sort(() => r() - 0.5);
    const plan = fest.slice();
    let i = 0;
    for (let t = abstand; t <= D - 6 * MIN_MS; t += abstand) {
      if (fest.some(a => Math.abs(a.t - t) < 4 * MIN_MS)) continue;
      plan.push({ t, art: 'mut', clips: [mutListe[i++ % mutListe.length]] });
    }
    plan.push({ t: D, art: 'ende', clips: [zufall(VARIANTEN.ende, r)] });
    return plan.sort((a, b) => a.t - b.t);
  }

  // ------------------------------------------------------------------ Speicher
  function lies() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SPEICHER) || 'null'); } catch (e) { s = null; }
    return s && s.start && s.minuten && Array.isArray(s.plan) ? s : null;
  }
  function laden() { S = lies(); return S; }
  function sichern() { try { if (S) localStorage.setItem(SPEICHER, JSON.stringify(S)); else localStorage.removeItem(SPEICHER); } catch (e) { /* voll/gesperrt */ } }
  function letzte() { try { return JSON.parse(localStorage.getItem(SPEICHER + '_letzte') || 'null'); } catch (e) { return null; } }
  function merkeLetzte() {
    try { localStorage.setItem(SPEICHER + '_letzte', JSON.stringify({ titel: S.titel, minuten: S.minuten, ms: S.fertig.ms, art: S.fertig.art, am: Date.now() })); } catch (e) { /* egal */ }
  }

  // ------------------------------------------------------------------ Ton
  const warteschlange = [];
  let spieler = null, spielt = false, clipSeit = 0;
  function sage(clips) {
    clips.forEach(c => warteschlange.push(c));
    // Sicherung: meldet das Tablet das Ende einer Ansage nie (Audio hängt), sollen die nächsten trotzdem kommen
    if (spielt && Date.now() - clipSeit > 15000) spielt = false;
    if (!spielt) weiter();
  }
  function weiter() {
    const c = warteschlange.shift();
    if (!c) { spielt = false; return; }
    spielt = true;
    clipSeit = Date.now();
    try {
      if (!spieler) {
        spieler = new Audio();
        spieler.addEventListener('ended', () => setTimeout(weiter, 350));
        spieler.addEventListener('error', () => setTimeout(weiter, 50));
      }
      spieler.src = TON + c + '.mp3';
      const p = spieler.play();
      if (p && p.catch) p.catch(() => setTimeout(weiter, 50));
    } catch (e) { setTimeout(weiter, 50); }
  }
  function stumm() { warteschlange.length = 0; spielt = false; try { if (spieler) spieler.pause(); } catch (e) { /* egal */ } }

  // ------------------------------------------------------------------ Bildschirm wach halten
  function appKannWach() { return typeof AndroidBridge !== 'undefined' && typeof AndroidBridge.bildschirmAn === 'function'; }
  function wach(an) {
    try { if (appKannWach()) { AndroidBridge.bildschirmAn(!!an); return; } } catch (e) { /* weiter mit Fallback */ }
    // Browser-Vorschau / ältere App-Version: Screen-Wake-Lock-API, falls vorhanden
    try {
      if (an && navigator.wakeLock && !wachSperre) navigator.wakeLock.request('screen').then(l => { wachSperre = l; }, () => {});
      if (!an && wachSperre) { wachSperre.release(); wachSperre = null; }
    } catch (e) { /* nicht unterstützt */ }
  }

  // ------------------------------------------------------------------ Darstellung
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const icon = n => (typeof Glanz !== 'undefined' ? Glanz.icon(n) : '');
  function uhr(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sek = s % 60;
    const zz = n => (n < 10 ? '0' : '') + n;
    return h ? h + ':' + zz(m) + ':' + zz(sek) : zz(Math.floor(s / 60)) + ':' + zz(sek);
  }
  const minText = ms => { const m = Math.max(1, Math.round(ms / MIN_MS)); return m + (m === 1 ? ' Minute' : ' Minuten'); };

  const CSS = `
#tz{position:fixed;top:0;left:0;right:0;bottom:0;z-index:9600;display:flex;flex-direction:column;background:var(--gz-bg0);overflow:hidden}
#tz .tz-kopf{display:flex;align-items:center;gap:14px;padding:22px 28px 0}
#tz .tz-kopf .gz-i{width:22px;height:22px;color:var(--gz-txt3)}
#tz .tz-kopf-text{flex:1;min-width:0}
#tz .tz-titel{display:block;margin-top:2px;font-family:var(--gz-titel);font-weight:600;font-size:26px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tz .tz-mitte{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 28px;min-height:0}
#tz .tz-noch{font-family:var(--gz-titel);font-weight:600;font-size:15px;letter-spacing:3px;text-transform:uppercase;color:var(--gz-txt3)}
#tz .tz-zeit{font-family:var(--gz-titel);font-weight:600;font-variant-numeric:tabular-nums;font-size:min(30vw,44vh);line-height:.95;letter-spacing:-2px;color:var(--gz-txt);transition:color .6s}
#tz .tz-zeit.tz-knapp{color:var(--gz-akzent)}
#tz .tz-von{margin-top:6px;font-size:15px;color:var(--gz-txt2)}
#tz .tz-leiste{position:relative;width:min(820px,100%);margin:34px auto 0;height:44px}
#tz .tz-bahn{position:absolute;left:0;right:0;top:0;height:4px;border-radius:2px;background:var(--gz-bg3);overflow:hidden}
#tz .tz-fuell{position:absolute;left:0;top:0;bottom:0;width:100%;background:var(--gz-txt2);transform-origin:0 50%;transform:scaleX(0)}
#tz .tz-knapp-fuell{background:var(--gz-akzent)}
#tz .tz-marke{position:absolute;top:-5px;width:1px;height:14px;background:var(--gz-linie3)}
#tz .tz-marke span{position:absolute;top:18px;left:50%;transform:translateX(-50%);white-space:nowrap;font-family:var(--gz-titel);font-weight:600;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:var(--gz-txt3)}
#tz .tz-marke.tz-vorbei span{color:var(--gz-txt2)}
/* „Noch 10“ endet an seinem Strich, „Noch 5“ beginnt an seinem – so stoßen sie auch bei 90 Minuten im Hochformat nicht zusammen */
#tz .tz-m-noch_10 span{left:auto;right:4px;transform:none}
#tz .tz-m-noch_5 span{left:4px;transform:none}
#tz .tz-fuss{display:flex;align-items:center;gap:14px;padding:0 28px 26px;min-height:96px}
#tz .tz-fuss-text{font-size:13.5px;color:var(--gz-txt3)}
#tz .tz-fuss .gz-btn{min-height:52px;padding:0 22px;font-size:16px}
/* Einstellen (für Papa) */
#tz .tz-form{width:min(560px,100%);margin:0 auto;padding:0 28px}
#tz .tz-feld{margin-top:26px}
#tz .tz-feld .gz-ueber{display:block;margin-bottom:10px}
#tz .tz-eingabe{width:100%;height:52px;padding:0 14px;border:1px solid var(--gz-linie2);border-radius:6px;background:var(--gz-bg2);color:var(--gz-txt);font:500 18px var(--gz-text);outline:none;-webkit-user-select:text;user-select:text}
#tz .tz-eingabe:focus{border-color:var(--gz-akzent)}
#tz .tz-minuten{display:flex;align-items:center;gap:14px}
#tz .tz-minuten .gz-btn-rund{width:52px;height:52px}
#tz .tz-min-wert{flex:1;text-align:center;font-family:var(--gz-titel);font-weight:600;font-size:56px;line-height:1;font-variant-numeric:tabular-nums}
#tz .tz-min-wert small{font-size:20px;margin-left:6px;color:var(--gz-txt2);letter-spacing:.5px}
#tz .tz-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
#tz .tz-chips .gz-btn{flex:1;min-width:64px}
#tz .tz-chips .tz-an{border-color:var(--gz-akzent);color:var(--gz-akzent);background:var(--gz-akzent-flaeche)}
#tz .tz-form .gz-notiz{margin-top:26px}
#tz .tz-start{margin-top:26px;min-height:58px;font-size:18px}
/* Rückfrage beim Abgeben */
#tz .tz-frage{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(4,5,7,.72);opacity:0;transition:opacity .2s}
#tz .tz-frage.tz-offen{opacity:1}
#tz .tz-frage-box{width:min(480px,100%);padding:26px 26px 22px;border:1px solid var(--gz-linie2);border-radius:10px;background:var(--gz-bg1);box-shadow:var(--gz-schatten)}
#tz .tz-frage-titel{font-family:var(--gz-titel);font-weight:600;font-size:28px;line-height:1.15}
#tz .tz-frage-text{margin-top:10px;font-size:15.5px;line-height:1.5;color:var(--gz-txt2)}
#tz .tz-frage-knoepfe{display:flex;gap:10px;margin-top:22px}
#tz .tz-frage-knoepfe .gz-btn{flex:1;min-height:52px;font-size:16px}
/* Ende */
#tz .tz-ende-titel{font-family:var(--gz-titel);font-weight:600;font-size:min(12vw,96px);line-height:1;text-align:center}
#tz .tz-ende-unter{margin-top:14px;font-size:17px;color:var(--gz-txt2);text-align:center}
#tz .tz-ende-daten{width:min(440px,100%);margin:30px auto 0}
#tz .tz-ende-daten .gz-daten dd{font-size:17px}
@media (orientation:portrait){#tz .tz-zeit{font-size:min(26vw,30vh)}}
`;

  function stilEinbauen() {
    if (document.getElementById('tz-stil')) return;
    const st = document.createElement('style');
    st.id = 'tz-stil';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  function bereit() {
    // GLANZ (Schrift, Farben, Knöpfe) über den VOLLDAMPF-Lader – der merkt sich, was schon geladen ist (nie doppelt laden).
    const p = typeof Glanz !== 'undefined' ? Promise.resolve()
      : (typeof VolldampfLader !== 'undefined' && VolldampfLader.skript ? VolldampfLader.skript('glanz') : Promise.reject(new Error('kein Lader')));
    return p.then(() => { try { Glanz.einbauen(); } catch (e) { /* ohne GLANZ geht es auch */ } }, () => {}).then(stilEinbauen);
  }
  function oeffneWurzel() {
    if (!wurzel || !wurzel.parentNode) {
      wurzel = document.createElement('div');
      wurzel.id = 'tz';
      wurzel.className = 'gz';
      document.body.appendChild(wurzel);
      wurzel.addEventListener('click', klick);
    }
    return wurzel;
  }
  function schliessen() {
    clearInterval(takt); takt = null;
    stumm();
    wach(false);
    if (wurzel && wurzel.parentNode) wurzel.parentNode.removeChild(wurzel);
    wurzel = null;
    if (typeof App !== 'undefined') App.gotoHome();
  }

  // ------------------------------------------------------------------ 1) Einstellen (Papa)
  function oeffnen() {
    if (laden()) { fortsetzen(); return; }
    bereit().then(() => {
      const l = letzte();
      eingestellt = eingestellt || { titel: (l && l.titel) || 'Arbeitsblätter', minuten: (l && l.minuten) || 30 };
      zeigeEinstellen();
    });
  }
  function zeigeEinstellen() {
    const w = oeffneWurzel();
    const m = eingestellt.minuten;
    const hinweisApp = typeof AndroidBridge !== 'undefined' && !appKannWach()
      ? (typeof Glanz !== 'undefined' ? Glanz.notiz('info', 'Der Bildschirm bleibt erst nach dem nächsten App-Update von selbst an. Bis dahin ab und zu antippen.', true) : '') : '';
    w.innerHTML =
      '<div class="tz-kopf">' + icon('uhr') + '<div class="tz-kopf-text"><span class="gz-ueber">Testzeit</span><span class="tz-titel">Neue Testzeit einstellen</span></div>' +
        '<button class="gz-zu" data-tz="zu" aria-label="Schließen">' + icon('schliessen') + '</button></div>' +
      '<div class="tz-mitte" style="justify-content:flex-start;overflow-y:auto"><div class="tz-form">' +
        '<div class="tz-feld"><span class="gz-ueber">Aufgabe</span><input class="tz-eingabe" id="tz-titel" maxlength="40" value="' + esc(eingestellt.titel) + '"></div>' +
        '<div class="tz-feld"><span class="gz-ueber">Zeit</span><div class="tz-minuten">' +
          '<button class="gz-btn gz-btn-rund" data-tz="weniger" aria-label="Weniger">' + icon('minus') + '</button>' +
          '<div class="tz-min-wert" id="tz-min">' + m + '<small>Min.</small></div>' +
          '<button class="gz-btn gz-btn-rund" data-tz="mehr" aria-label="Mehr">' + icon('plus') + '</button></div>' +
          '<div class="tz-chips">' + SCHNELL.map(s => '<button class="gz-btn gz-btn-klein' + (s === m ? ' tz-an' : '') + '" data-tz="setze" data-min="' + s + '">' + s + ' Min.</button>').join('') + '</div></div>' +
        (typeof Glanz !== 'undefined' ? Glanz.notiz('ton', 'Max hört eine Ansage zum Start, zur Halbzeit, bei noch 10, 5 und 1 Minute und am Ende, dazwischen ab und zu etwas Aufmunterndes. Der Bildschirm bleibt an, bis die Zeit um ist.') : '') +
        hinweisApp +
        '<button class="gz-btn gz-btn-primaer gz-btn-breit tz-start" data-tz="start">' + icon('pfeil') + '<span>Testzeit starten</span></button>' +
      '</div></div>' +
      '<div class="tz-fuss"></div>';
  }
  function minutenSetzen(m) {
    eingestellt.minuten = Math.max(MIN, Math.min(MAX, m));
    const t = document.getElementById('tz-titel');
    if (t) eingestellt.titel = t.value;
    zeigeEinstellen();
  }

  // ------------------------------------------------------------------ 2) Läuft (Max)
  function starten() {
    const t = document.getElementById('tz-titel');
    const titel = ((t && t.value) || '').trim() || 'Arbeitsblätter';
    eingestellt.titel = titel;
    S = { titel, minuten: eingestellt.minuten, start: Date.now(), plan: planFuer(eingestellt.minuten), naechste: 0, fertig: null };
    sichern();
    try { if (document.activeElement) document.activeElement.blur(); } catch (e) { /* Tastatur zu */ }
    zeigeLaeuft();
  }
  function fortsetzen() {
    if (!laden()) return false;
    bereit().then(() => { if (S.fertig) zeigeEnde(); else zeigeLaeuft(); });
    return true;
  }
  function zeigeLaeuft() {
    const w = oeffneWurzel();
    const D = S.minuten * MIN_MS;
    const marken = S.plan.filter(a => a.art === 'halbzeit' || a.art === 'noch_10' || a.art === 'noch_5')
      .map(a => '<div class="tz-marke tz-m-' + a.art + '" data-t="' + a.t + '" style="left:' + (a.t / D * 100).toFixed(2) + '%"><span>' +
        (a.art === 'halbzeit' ? 'Halbzeit' : a.art === 'noch_10' ? 'Noch 10' : 'Noch 5') + '</span></div>').join('');
    w.innerHTML =
      '<div class="tz-kopf">' + icon('uhr') + '<div class="tz-kopf-text"><span class="gz-ueber">Testzeit</span><span class="tz-titel">' + esc(S.titel) + '</span></div></div>' +
      '<div class="tz-mitte">' +
        '<div class="tz-noch">Noch</div>' +
        '<div class="tz-zeit" id="tz-zeit">' + uhr(D) + '</div>' +
        '<div class="tz-von">von ' + S.minuten + ' Minuten</div>' +
        '<div class="tz-leiste"><div class="tz-bahn"><div class="tz-fuell" id="tz-fuell"></div></div>' + marken + '</div>' +
      '</div>' +
      '<div class="tz-fuss"><button class="gz-btn gz-btn-dunkel" data-tz="abgeben">' + icon('haken') + '<span>Ich bin fertig</span></button></div>';
    wach(true);
    clearInterval(takt);
    takt = setInterval(tick, 250);
    tick();
  }
  function tick() {
    if (!S || S.fertig) return;
    const vergangen = Date.now() - S.start;
    const D = S.minuten * MIN_MS;
    // Ansagen: fällige der Reihe nach; verpasste (App war zu/neu geladen) still überspringen
    let geaendert = false;
    while (S.naechste < S.plan.length && S.plan[S.naechste].t <= vergangen) {
      const a = S.plan[S.naechste++];
      geaendert = true;
      if (a.art === 'ende') { beenden('zeit', D, vergangen - a.t < VERPASST_MS); return; }
      if (vergangen - a.t < VERPASST_MS) sage(a.clips);
    }
    if (geaendert) sichern();
    const rest = D - vergangen;
    const z = document.getElementById('tz-zeit');
    if (!z) return;
    const text = uhr(rest);
    if (z.textContent !== text) z.textContent = text;
    const knapp = rest <= 5 * MIN_MS;
    z.classList.toggle('tz-knapp', knapp);
    const f = document.getElementById('tz-fuell');
    if (f) { f.style.transform = 'scaleX(' + Math.min(1, vergangen / D).toFixed(4) + ')'; f.classList.toggle('tz-knapp-fuell', knapp); }
    const marken = wurzel ? wurzel.querySelectorAll('.tz-marke') : [];
    for (let i = 0; i < marken.length; i++) marken[i].classList.toggle('tz-vorbei', +marken[i].getAttribute('data-t') <= vergangen);
  }
  function frageAbgeben() {
    const rest = S.minuten * MIN_MS - (Date.now() - S.start);
    if (rest <= 2 * MIN_MS) { beenden('abgabe', Date.now() - S.start, true); return; }
    sage(['kontrolle']);
    const f = document.createElement('div');
    f.className = 'tz-frage';
    f.innerHTML = '<div class="tz-frage-box"><div class="tz-frage-titel">Schon fertig?</div>' +
      '<div class="tz-frage-text">Du hast noch ' + minText(rest) + ' Zeit. Hast du alles noch einmal kontrolliert?</div>' +
      '<div class="tz-frage-knoepfe"><button class="gz-btn gz-btn-dunkel" data-tz="weiterarbeiten">Weiterarbeiten</button>' +
      '<button class="gz-btn gz-btn-primaer" data-tz="abgeben-ja">' + icon('haken') + '<span>Abgeben</span></button></div></div>';
    wurzel.appendChild(f);
    requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add('tz-offen')));
  }
  function frageZu() {
    const f = wurzel && wurzel.querySelector('.tz-frage');
    if (f) f.parentNode.removeChild(f);
  }

  // ------------------------------------------------------------------ 3) Ende
  function beenden(art, ms, ansagen) {
    S.fertig = { art, ms: Math.min(ms, S.minuten * MIN_MS) };
    S.naechste = S.plan.length;
    sichern();
    merkeLetzte();
    clearInterval(takt); takt = null;
    stumm();
    if (ansagen) sage([zufall(art === 'zeit' ? VARIANTEN.ende : VARIANTEN.abgabe, Math.random)]);
    wach(false);
    zeigeEnde();
  }
  function zeigeEnde() {
    const w = oeffneWurzel();
    const D = S.minuten * MIN_MS;
    const frueher = D - S.fertig.ms;
    const daten = [['Aufgabe', esc(S.titel)], ['Vorgegeben', S.minuten + ' Min.', { zahl: true }], ['Gearbeitet', minText(S.fertig.ms).replace('Minuten', 'Min.').replace('Minute', 'Min.'), { zahl: true }]];
    if (S.fertig.art === 'abgabe' && frueher >= MIN_MS) daten.push(['Früher fertig', minText(frueher).replace('Minuten', 'Min.').replace('Minute', 'Min.'), { zahl: true, neu: true }]);
    w.innerHTML =
      '<div class="tz-kopf">' + icon('uhr') + '<div class="tz-kopf-text"><span class="gz-ueber">Testzeit</span><span class="tz-titel">' + esc(S.titel) + '</span></div></div>' +
      '<div class="tz-mitte">' +
        '<div class="tz-ende-titel">' + (S.fertig.art === 'zeit' ? 'Die Zeit ist um' : 'Abgegeben') + '</div>' +
        '<div class="tz-ende-unter">' + (S.fertig.art === 'zeit' ? 'Leg den Stift weg. Stark durchgehalten!' : 'Gut gemacht!') + '</div>' +
        '<div class="tz-ende-daten">' + (typeof Glanz !== 'undefined' ? Glanz.daten(daten)
          : daten.map(z => '<div>' + z[0] + ': ' + z[1] + '</div>').join('')) + '</div>' +
      '</div>' +
      '<div class="tz-fuss"><button class="gz-btn gz-btn-primaer" data-tz="fertig">' + icon('haken') + '<span>Fertig</span></button></div>';
  }

  // ------------------------------------------------------------------ Bedienung
  function klick(e) {
    const b = e.target.closest ? e.target.closest('[data-tz]') : null;
    if (!b) return;
    const was = b.getAttribute('data-tz');
    if (was === 'zu') { eingestellt = null; schliessen(); }
    else if (was === 'weniger') minutenSetzen(eingestellt.minuten - SCHRITT);
    else if (was === 'mehr') minutenSetzen(eingestellt.minuten + SCHRITT);
    else if (was === 'setze') minutenSetzen(+b.getAttribute('data-min'));
    else if (was === 'start') starten();
    else if (was === 'abgeben') frageAbgeben();
    else if (was === 'weiterarbeiten') { stumm(); frageZu(); }
    else if (was === 'abgeben-ja') { frageZu(); if (S && !S.fertig) beenden('abgabe', Date.now() - S.start, true); }
    else if (was === 'fertig') { S = null; sichern(); schliessen(); }
  }

  /** Untertitel der Kachel auf der Startseite */
  function kachelText() {
    const s = lies();
    if (s && !s.fertig) return 'Läuft · noch ' + minText(s.minuten * MIN_MS - (Date.now() - s.start));
    const l = letzte();
    if (l) return 'Zuletzt ' + Math.max(1, Math.round(l.ms / MIN_MS)) + ' von ' + l.minuten + ' Min.';
    return 'Uhr für Arbeitsblätter';
  }
  /** Testzeit-Bildschirm ist offen (oder öffnet gleich wieder, weil eine Testzeit gespeichert ist) – dann keine Fuchs-Popups. */
  function aktiv() { return !!(wurzel && wurzel.parentNode) || !!lies(); }

  return { oeffnen, fortsetzen, kachelText, aktiv, planFuer, ANSAGEN, uhr };
})();
