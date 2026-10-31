// Otium auf dem Lernfuchs (31.10.2026): Max sieht auf der Startseite, wann Mama und Papa arbeiten, welche Termine
// und Geburtstage anstehen, und darf etwas auf die Einkaufsliste schreiben – mehr nicht. Die Ansicht berechnen die
// Otium-Handys der Eltern (Sammlung "view" auf dem Familien-Server, ausgeblendete Termine fehlen dort schon); das
// Tablet liest sie nur mit dem Kind-Code, den die Eltern im Eltern-Bereich eintragen. Alles bleibt in eigenen
// localStorage-Schlüsseln und geht nicht ins Lernfuchs-Backend.
const Familie = (function () {
  const API_STANDARD = 'https://familie-api.paceforge-pi.co.uk';
  const K_CODE = 'otium_kindcode', K_EINST = 'otium_einst_v1', K_CACHE = 'otium_cache_v1';
  const K_FUEHRUNG = 'otium_fuehrung_v1';
  const STANDARD = {
    dienste: true, termine: true, geburtstage: true, einkauf: true, einkaufSchreiben: true,
    tageDienste: 7, tageTermine: 14, namen: { A: '', B: '' }
  };
  const MAX_TAGE = 27;
  const MIN_ABSTAND_MS = 60 * 1000, POLL_MS = 5 * 60 * 1000, TIMEOUT_MS = 10000;
  const WTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  let status = 'leer'; // leer | laedt | ok | code-falsch | offline
  let letzterVersuch = 0;
  let laufend = null;
  let einkaufHinweis = '';

  // ---------------- Speicher ----------------
  function lies(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function schreib(key, wert) { try { localStorage.setItem(key, JSON.stringify(wert)); } catch (e) { /* voll */ } }
  function code() { try { return localStorage.getItem(K_CODE) || ''; } catch (e) { return ''; } }
  function einst() {
    const e = Object.assign({}, STANDARD, lies(K_EINST, {}));
    e.namen = Object.assign({}, STANDARD.namen, e.namen || {});
    return e;
  }
  function cache() { return lies(K_CACHE, null); }
  // nur für Tests: anderer Server (lokal), sonst der echte
  function api() { try { return localStorage.getItem('otium_api') || API_STANDARD; } catch (e) { return API_STANDARD; } }

  // ---------------- Zeit (Tablet-Uhr kann falsch gehen: Storage kennt die Pi-Zeit) ----------------
  function jetzt() { try { return Storage.jetztKorrigiert(); } catch (e) { return new Date(); } }
  function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function plusTage(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function ausIso(s) { const [j, m, t] = s.split('-').map(Number); return new Date(j, m - 1, t); }
  function hm(d) { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  function kurzDatum(s) { const d = ausIso(s); return `${WTAG[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`; }
  function tagName(s) {
    const heute = iso(jetzt());
    if (s === heute) return 'Heute';
    if (s === iso(plusTage(jetzt(), 1))) return 'Morgen';
    return kurzDatum(s);
  }
  /** "08:00" -> "8", "16:30" -> "16:30" */
  function uhr(t) { const [h, m] = t.split(':').map(Number); return m ? `${h}:${String(m).padStart(2, '0')}` : `${h}`; }
  function esc(t) { return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // ---------------- Laden ----------------
  async function holen(pfad, optionen) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
    try {
      return await fetch(api() + pfad, Object.assign({}, optionen, ctrl ? { signal: ctrl.signal } : {}));
    } finally { if (t) clearTimeout(t); }
  }

  /** Holt Ansicht + Einkaufsliste; [sofort] übergeht die Mindestpause (Einstellungen, Familie-Seite). */
  function laden(sofort) {
    const c = code();
    if (!c) { status = 'leer'; return Promise.resolve(); }
    if (laufend) return laufend;
    if (!sofort && Date.now() - letzterVersuch < MIN_ABSTAND_MS) return Promise.resolve();
    letzterVersuch = Date.now();
    if (!cache()) status = 'laedt';
    laufend = (async () => {
      try {
        const r = await holen('/v1/kid/view', { headers: { Authorization: `Bearer ${c}` } });
        if (r.status === 401) { status = 'code-falsch'; return; }
        if (!r.ok) { status = 'offline'; return; }
        const j = await r.json();
        schreib(K_CACHE, { view: j.view, items: j.items || [], geholt: Date.now() });
        status = 'ok';
      } catch (e) {
        status = 'offline';
      } finally {
        laufend = null;
        neuZeichnen();
      }
    })();
    return laufend;
  }

  function neuZeichnen() {
    const karte = document.getElementById('familie-karte');
    if (karte) karte.outerHTML = homeKarteHtml(true) || '<div id="familie-karte"></div>';
    if (document.getElementById('familie-seite')) zeichneSeite();
    pruefeFuehrung();
  }

  // ---------------- Der Fuchs zeigt die Neuerung (einmal, sobald die Karte mit Daten auf der Startseite steht) ----------------
  let folie = 0;

  function folien() {
    const a = name('A'), b = name('B'), e = einst();
    const liste = [
      { emoji: '🦊', titel: 'Neu: Familie!', text: `Max, ich habe etwas Neues für dich! Auf deiner Startseite steht jetzt die Karte <b>Familie</b>. Da siehst du, was bei euch zu Hause los ist.` },
    ];
    if (e.dienste) liste.push({ emoji: '👷', titel: 'Wer arbeitet wann?', text: `Du siehst, ob <b>${esc(a)}</b> und <b>${esc(b)}</b> heute arbeiten – und wann sie wieder heimkommen. Auch für die nächsten Tage!` });
    if (e.termine || e.geburtstage) liste.push({ emoji: '🎂', titel: 'Termine und Geburtstage', text: `Ich zeige dir, welche Termine anstehen${e.geburtstage ? ' und wer bald <b>Geburtstag</b> hat. So vergisst du keinen!' : '.'}` });
    if (e.einkauf && e.einkaufSchreiben) liste.push({ emoji: '🛒', titel: 'Fehlt etwas?', text: `Schreib es auf die <b>Einkaufsliste</b>! ${esc(a)} und ${esc(b)} sehen es sofort auf ihrem Handy.` });
    liste.push({ emoji: '👉', titel: 'Probier es aus!', text: `Tipp auf die Karte <b>Familie</b> – dann siehst du alles auf einen Blick.` });
    return liste;
  }

  function pruefeFuehrung() {
    try {
      if (localStorage.getItem(K_FUEHRUNG)) return;
      const c = cache();
      if (!c || !c.view || !document.getElementById('familie-karte')) return;
      if (typeof App !== 'undefined' && App.istStartSichtbar && !App.istStartSichtbar()) return;
      // nicht über ein anderes Fuchs-Fenster legen – beim nächsten Besuch der Startseite klappt es
      if (document.getElementById('hinweis-popup') || document.getElementById('fuchs-vorstellung') || document.getElementById('familie-fuehrung')) return;
      folie = 0;
      zeichneFolie();
    } catch (e) { /* optional */ }
  }

  function zeichneFolie() {
    const liste = folien(), f = liste[folie], letzte = folie === liste.length - 1;
    let el = document.getElementById('familie-fuehrung');
    if (!el) {
      el = document.createElement('div');
      el.id = 'familie-fuehrung';
      el.style.cssText = 'position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;' +
        'background:radial-gradient(900px 600px at 50% 0%, #2b3659 0%, #161c31 55%, #0a0e1b 100%);';
      document.body.appendChild(el);
    }
    el.innerHTML = `
      <div class="fuchs-folie">
        <div class="fuchs-folie-emoji">${f.emoji}</div>
        <div class="fuchs-folie-titel">${esc(f.titel)}</div>
        <div class="fuchs-folie-text">${f.text}</div>
        <div class="fuchs-punkte">${liste.map((_, i) => `<span class="${i === folie ? 'an' : ''}"></span>`).join('')}</div>
        <div class="fuchs-folie-knoepfe">
          <div class="weg-weiter-knopf" id="fam-fuehrung-weiter" style="background:linear-gradient(180deg,#FFC35C,#F59E0B);color:#2a1503;">${letzte ? 'Zeig mir die Karte ▶' : 'Weiter ▶'}</div>
        </div>
      </div>`;
    document.getElementById('fam-fuehrung-weiter').onclick = () => {
      if (!letzte) { folie++; zeichneFolie(); return; }
      beendeFuehrung();
    };
  }

  function beendeFuehrung() {
    try { localStorage.setItem(K_FUEHRUNG, String(Date.now())); } catch (e) { /* voll */ }
    const el = document.getElementById('familie-fuehrung');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    const karte = document.getElementById('familie-karte');
    if (karte) {
      karte.scrollIntoView({ block: 'center', behavior: 'smooth' });
      karte.classList.add('fam-hervor');
      setTimeout(() => { const k = document.getElementById('familie-karte'); if (k) k.classList.remove('fam-hervor'); }, 4500);
    }
  }

  // ---------------- Dienste in Kindersprache ----------------
  function schicht(m, tag) {
    const v = (cache() || {}).view;
    return v && v.shifts && v.shifts[m] ? v.shifts[m].find(s => s.d === tag) || null : null;
  }
  function ueberNacht(s) { return s.s && s.e && s.e <= s.s; }
  function name(m) {
    const e = einst(), v = (cache() || {}).view;
    return (e.namen[m] || '').trim() || (v && v.names && v.names[m]) || (m === 'A' ? 'Elternteil 1' : 'Elternteil 2');
  }

  /** Was ein Elternteil an [tag] macht (Wochenliste). art: dienst | bereit | weg | frei */
  function tagText(m, tag) {
    const s = schicht(m, tag);
    if (!s || s.k === 'FREI') return { art: 'frei', text: 'frei' };
    if (s.k === 'ABWESEND') return { art: 'weg', text: s.l || 'nicht da' };
    const zeit = s.s && s.e ? (ueberNacht(s) ? ` ab ${uhr(s.s)} Uhr, zurück am ${WTAG[plusTage(ausIso(tag), 1).getDay()]} um ${uhr(s.e)} Uhr` : ` von ${uhr(s.s)} bis ${uhr(s.e)} Uhr`) : '';
    if (s.k === 'BEREITSCHAFT') return { art: 'bereit', text: (s.l || 'Bereitschaft') + zeit };
    return { art: 'dienst', text: 'arbeitet' + zeit };
  }

  /** Was ein Elternteil gerade macht (Startseite). */
  function jetztText(m) {
    const n = jetzt(), heute = iso(n), jetztHm = hm(n);
    const g = schicht(m, iso(plusTage(n, -1)));
    if (g && g.k === 'DIENST' && ueberNacht(g) && jetztHm < g.e) return { art: 'dienst', text: `ist auf Arbeit, kommt um ${uhr(g.e)} Uhr heim` };
    const s = schicht(m, heute);
    if (!s || s.k === 'FREI') return { art: 'frei', text: 'hat heute frei' };
    if (s.k === 'ABWESEND') return { art: 'weg', text: s.l ? `hat ${s.l}` : 'ist heute nicht da' };
    if (s.k === 'BEREITSCHAFT') return { art: 'bereit', text: `hat heute ${s.l || 'Bereitschaft'}` };
    if (!s.s || !s.e) return { art: 'dienst', text: 'arbeitet heute' };
    if (jetztHm < s.s) {
      return { art: 'dienst', text: ueberNacht(s) ? `arbeitet heute ab ${uhr(s.s)} Uhr bis morgen ${uhr(s.e)} Uhr` : `arbeitet heute von ${uhr(s.s)} bis ${uhr(s.e)} Uhr` };
    }
    if (ueberNacht(s)) return { art: 'dienst', text: `ist auf Arbeit bis morgen ${uhr(s.e)} Uhr` };
    if (jetztHm < s.e) return { art: 'dienst', text: `ist auf Arbeit bis ${uhr(s.e)} Uhr` };
    return { art: 'frei', text: 'hat Feierabend' };
  }

  // ---------------- Termine ----------------
  /** Termine/Geburtstage ab heute für [tage] Tage, laufende mehrtägige eingeschlossen; nach den Schaltern gefiltert. */
  function termine(tage) {
    const v = (cache() || {}).view, e = einst();
    if (!v || !v.events) return [];
    const heute = iso(jetzt()), bis = iso(plusTage(jetzt(), tage - 1));
    return v.events.filter(t => (t.to || t.d) >= heute && t.d <= bis && (t.bday ? e.geburtstage : e.termine));
  }
  function terminText(t) {
    if (t.bday) return t.age ? `${t.title} wird ${t.age}` : `${t.title} hat Geburtstag`;
    return t.title;
  }
  function terminZeit(t) {
    const heute = iso(jetzt());
    if (t.to) return t.d < heute ? `bis ${tagName(t.to)}` : `${tagName(t.d)} bis ${kurzDatum(t.to)}`;
    return tagName(t.d) + (t.t ? `, ${uhr(t.t)}${t.te ? '–' + uhr(t.te) : ''} Uhr` : '');
  }

  // ---------------- Startseite ----------------
  function homeKarteHtml(ohneLaden) {
    try {
      if (!code()) return '';
      if (!ohneLaden) setTimeout(() => laden(false), 0);
      const e = einst(), c = cache();
      const kopf = `<div class="fam-kopf"><span>🏠 Familie</span><small>${esc(tagName(iso(jetzt())))}, ${esc(kurzDatum(iso(jetzt())))}</small><span class="fam-los">Mehr ›</span></div>`;
      if (!c || !c.view) {
        const text = status === 'code-falsch' ? 'Der Code stimmt nicht – Mama oder Papa muss ihn neu eintragen.'
          : status === 'offline' ? 'Gerade keine Verbindung.' : 'Wird geladen …';
        return `<div class="fam-karte" id="familie-karte">${kopf}<div class="fam-leer">${text}</div></div>`;
      }
      const eltern = e.dienste ? ['A', 'B'].map(m => {
        const j = jetztText(m);
        return `<div class="fam-person"><span class="fam-avatar fam-avatar-${m}">${esc(name(m).charAt(0).toUpperCase())}</span>
          <span class="fam-person-text"><b>${esc(name(m))}</b><small class="fam-${j.art}">${esc(j.text)}</small></span></div>`;
      }).join('') : '';
      const naechste = termine(Math.min(e.tageTermine, 7)).slice(0, 3).map(t =>
        `<div class="fam-termin"><span>${t.bday ? '🎂' : '📅'}</span><span><b>${esc(terminZeit(t))}</b> · ${esc(terminText(t))}</span></div>`).join('');
      if (!ohneLaden) setTimeout(pruefeFuehrung, 600);
      return `<div class="fam-karte" id="familie-karte" onclick="Familie.oeffnen()">${kopf}
        ${eltern ? `<div class="fam-eltern">${eltern}</div>` : ''}
        ${naechste ? `<div class="fam-termine">${naechste}</div>` : ''}</div>`;
    } catch (err) { return ''; }
  }

  // ---------------- Familie-Seite ----------------
  function oeffnen() {
    App.render('<div id="familie-seite"></div>');
    zeichneSeite();
    laden(true);
  }

  function zeichneSeite() {
    const seite = document.getElementById('familie-seite');
    if (!seite) return;
    const e = einst(), c = cache();
    const teile = [];
    if (!c || !c.view) {
      teile.push(`<div class="fam-block"><div class="fam-leer">${status === 'offline' ? 'Gerade keine Verbindung – versuch es gleich nochmal.' : 'Wird geladen …'}</div></div>`);
    } else {
      if (e.dienste) {
        const tage = Array.from({ length: Math.min(e.tageDienste, MAX_TAGE) }, (_, i) => iso(plusTage(jetzt(), i)));
        teile.push(`<div class="fam-block"><div class="fam-block-titel">Wer arbeitet wann?</div>
          ${tage.map(t => `<div class="fam-tag${t === iso(jetzt()) ? ' fam-heute' : ''}"><div class="fam-tag-name">${esc(tagName(t))}</div>
            ${['A', 'B'].map(m => { const x = tagText(m, t); return `<div class="fam-tag-person"><b>${esc(name(m))}</b> <span class="fam-${x.art}">${esc(x.text)}</span></div>`; }).join('')}
          </div>`).join('')}</div>`);
      }
      if (e.termine || e.geburtstage) {
        const liste = termine(e.tageTermine);
        teile.push(`<div class="fam-block"><div class="fam-block-titel">${e.termine && e.geburtstage ? 'Termine &amp; Geburtstage' : e.termine ? 'Termine' : 'Geburtstage'}</div>
          ${liste.length ? liste.map(t => `<div class="fam-eintrag"><span class="fam-eintrag-icon">${t.bday ? '🎂' : '📅'}</span>
            <span class="fam-eintrag-text"><b>${esc(terminText(t))}</b><small>${esc(terminZeit(t))}${t.loc ? ' · ' + esc(t.loc) : ''}</small></span></div>`).join('')
            : `<div class="fam-leer">In den nächsten ${e.tageTermine} Tagen steht nichts an.</div>`}</div>`);
      }
    }
    if (e.einkauf) {
      const items = (c && c.items) || [];
      teile.push(`<div class="fam-block"><div class="fam-block-titel">🛒 Einkaufsliste</div>
        ${items.length ? items.map(i => `<div class="fam-einkauf">• ${esc(i.text)}</div>`).join('') : '<div class="fam-leer">Die Liste ist leer.</div>'}
        ${e.einkaufSchreiben ? `<div class="fam-dazu"><input id="fam-einkauf-text" class="regel-input" maxlength="80" placeholder="Was fehlt? z. B. Milch">
          <div class="btn-primary" onclick="Familie.einkaufDazu()">Dazuschreiben</div></div>
          <div class="fam-hinweis">${esc(einkaufHinweis)}</div>` : ''}</div>`);
    }
    const stand = c && c.geholt ? `Stand: ${new Date(c.geholt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : '';
    seite.innerHTML = `
      <div class="back-row"><span class="back-btn" onclick="App.gotoHome()">${Icons.svg('zurueck')} Zurück</span></div>
      <div class="welcome">Familie</div>
      ${teile.join('')}
      <div class="fam-stand">${esc(stand)}${status === 'offline' ? ' · gerade keine Verbindung' : ''}</div>`;
  }

  async function einkaufDazu() {
    const feld = document.getElementById('fam-einkauf-text');
    const text = feld ? feld.value.replace(/\s+/g, ' ').trim() : '';
    if (!text) return;
    if (!einst().einkaufSchreiben) return;
    einkaufHinweis = 'Wird gespeichert …';
    zeichneSeite();
    try {
      const r = await holen('/v1/kid/item', {
        method: 'POST',
        headers: { Authorization: `Bearer ${code()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 80) })
      });
      einkaufHinweis = r.ok ? `✓ „${text}“ steht jetzt auf der Liste.` : r.status === 429 ? 'Für heute ist genug dazugeschrieben.' : 'Das hat nicht geklappt.';
      if (r.ok) await laden(true);
    } catch (e) {
      einkaufHinweis = 'Keine Verbindung – versuch es gleich nochmal.';
    }
    zeichneSeite();
  }

  // ---------------- Eltern-Bereich ----------------
  function einstellungenHtml() {
    const e = einst(), c = code();
    const schalter = (id, an, text) => `<label class="fam-schalter"><input type="checkbox" id="${id}"${an ? ' checked' : ''}> ${text}</label>`;
    const zahl = (id, wert, text) => `<label class="fam-zahl">${text} <input type="number" id="${id}" class="regel-input" min="1" max="${MAX_TAGE}" value="${wert}"></label>`;
    const v = (cache() || {}).view;
    const original = m => (v && v.names && v.names[m]) || (m === 'A' ? 'Elternteil 1' : 'Elternteil 2');
    return `
      <div class="welcome" style="margin-top:32px;">Otium (Familienkalender)</div>
      <div class="lese-text">Max sieht auf der Startseite, wann ihr arbeitet, welche Termine und Geburtstage anstehen, und kann etwas auf die Einkaufsliste schreiben. Termine, die ihr in Otium für Max ausblendet, kommen gar nicht erst aufs Tablet. Den Code gibt es in Otium unter <strong>Mehr → Familien-Sync → „Lernfuchs-Code für Max“</strong>. Max kann hier nichts ändern – diese Seite ist nur nach der PIN erreichbar.</div>
      <div class="regel-karte">
        <input id="otium-code" class="regel-input fam-code" placeholder="Code, z. B. ABCD-EFGH-JKLM" value="${esc(c ? c.match(/.{1,4}/g).join('-') : '')}" autocapitalize="characters" autocomplete="off">
        <div class="fortschritt-unterueberschrift">Was Max sieht</div>
        ${schalter('otium-dienste', e.dienste, 'Wann ihr arbeitet')}
        ${schalter('otium-termine', e.termine, 'Termine')}
        ${schalter('otium-geburtstage', e.geburtstage, 'Geburtstage')}
        ${schalter('otium-einkauf', e.einkauf, 'Einkaufsliste')}
        ${schalter('otium-schreiben', e.einkaufSchreiben, 'Max darf auf die Einkaufsliste schreiben')}
        <div class="fortschritt-unterueberschrift">Wie weit im Voraus</div>
        ${zahl('otium-tage-dienste', e.tageDienste, 'Dienste: Tage')}
        ${zahl('otium-tage-termine', e.tageTermine, 'Termine &amp; Geburtstage: Tage')}
        <div class="fortschritt-unterueberschrift">So nennt Max euch</div>
        <label class="fam-zahl">${esc(original('A'))} heißt <input type="text" id="otium-name-a" class="regel-input" maxlength="20" placeholder="z. B. Papa" value="${esc(e.namen.A)}"></label>
        <label class="fam-zahl">${esc(original('B'))} heißt <input type="text" id="otium-name-b" class="regel-input" maxlength="20" placeholder="z. B. Mama" value="${esc(e.namen.B)}"></label>
        <div id="otium-hinweis" class="reihen-hinweis"></div>
        <div class="btn-primary" onclick="Familie.speichereEinstellungen()">Speichern und testen</div>
      </div>`;
  }

  async function speichereEinstellungen() {
    const wert = id => document.getElementById(id);
    const an = id => !!(wert(id) && wert(id).checked);
    const tage = (id, f) => Math.min(MAX_TAGE, Math.max(1, parseInt(wert(id) && wert(id).value, 10) || f));
    const neuerCode = ((wert('otium-code') || {}).value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const alterCode = code();
    try { if (neuerCode) localStorage.setItem(K_CODE, neuerCode); else localStorage.removeItem(K_CODE); } catch (e) { /* voll */ }
    if (neuerCode !== alterCode) { try { localStorage.removeItem(K_CACHE); } catch (e) { /* egal */ } }
    schreib(K_EINST, {
      dienste: an('otium-dienste'), termine: an('otium-termine'), geburtstage: an('otium-geburtstage'),
      einkauf: an('otium-einkauf'), einkaufSchreiben: an('otium-schreiben'),
      tageDienste: tage('otium-tage-dienste', STANDARD.tageDienste), tageTermine: tage('otium-tage-termine', STANDARD.tageTermine),
      namen: { A: ((wert('otium-name-a') || {}).value || '').trim(), B: ((wert('otium-name-b') || {}).value || '').trim() }
    });
    const hinweis = wert('otium-hinweis');
    const zeige = (t, gut) => { if (hinweis) { hinweis.textContent = t; hinweis.style.color = gut ? '#7CF0A8' : '#FFB4A0'; } };
    if (!neuerCode) { zeige('Gespeichert. Ohne Code bleibt die Familie-Karte aus.', true); return; }
    zeige('Gespeichert – teste die Verbindung …', true);
    await laden(true);
    const v = (cache() || {}).view;
    if (status === 'ok') zeige(v ? `✓ Verbunden. Max sieht die Dienste von ${name('A')} und ${name('B')}.` : '✓ Code stimmt. Otium auf einem Eltern-Handy einmal öffnen, dann erscheinen die Daten.', true);
    else if (status === 'code-falsch') zeige('✗ Diesen Code kennt der Server nicht. Bitte in Otium nachsehen.');
    else zeige('Gespeichert, aber gerade keine Verbindung. Das Tablet versucht es später wieder.');
  }

  // regelmäßig auffrischen, solange das Tablet an ist (pausiert ohnehin bei Bildschirm aus)
  setInterval(() => {
    if (!code() || (typeof document !== 'undefined' && document.hidden)) return;
    laden(false);
  }, POLL_MS);

  return { homeKarteHtml, oeffnen, einkaufDazu, einstellungenHtml, speichereEinstellungen, laden, istEingerichtet: () => !!code(), zeigeFuehrung: () => { folie = 0; zeichneFolie(); } };
})();
