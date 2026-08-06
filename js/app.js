const App = (function () {
  const root = () => document.getElementById('app-root');

  function updateTopbar() {
    const s = Storage.getState();
    document.getElementById('stat-sterne').textContent = '⭐ ' + s.sterne;
    document.getElementById('stat-level').textContent = 'Level ' + Storage.level();
  }

  function updateAkkuAnzeige() {
    if (typeof AndroidBridge === 'undefined' || !AndroidBridge.getBatteryPercent) return;
    const prozent = AndroidBridge.getBatteryPercent();
    const el = document.getElementById('stat-akku');
    if (prozent < 0) { el.style.display = 'none'; return; }
    let symbol = '🔋';
    if (prozent <= 20) symbol = '🪫';
    el.textContent = symbol + ' ' + prozent + '%';
    el.style.display = '';
  }

  let onLeaveScreen = null;
  function setOnLeaveScreen(fn) { onLeaveScreen = fn; }

  function render(html) {
    if (onLeaveScreen) {
      const fn = onLeaveScreen;
      onLeaveScreen = null;
      fn();
    }
    root().innerHTML = html;
    updateTopbar();
  }

  function gotoHome() {
    render(`
      <div class="welcome">Hallo Max! Was möchtest du heute lernen?</div>
      <div class="menu-grid">
        <div class="menu-card card-mathe" onclick="Mathe.renderMenu()">
          <span class="emoji">🔢</span> Mathe
        </div>
        <div class="menu-card card-deutsch" onclick="Deutsch.renderMenu()">
          <span class="emoji">📖</span> Deutsch
        </div>
        <div class="menu-card card-geschichten" onclick="Geschichten.renderMenu()">
          <span class="emoji">📚</span> Geschichten
        </div>
        <div class="menu-card card-heimat" onclick="Heimatkunde.renderMenu()">
          <span class="emoji">🚦</span> Heimat & Sachkunde
        </div>
      </div>
    `);
  }

  function subMenuHtml(titel, karten) {
    // karten: [{emoji, titel, onclick}]
    const cardsHtml = karten.map(k =>
      `<div class="sub-card" onclick="${k.onclick}"><span class="emoji">${k.emoji}</span>${k.titel}</div>`
    ).join('');
    return `
      <div class="back-row"><span class="back-btn" onclick="App.gotoHome()">⬅ Zurück</span></div>
      <div class="welcome">${titel}</div>
      <div class="sub-grid">${cardsHtml}</div>
    `;
  }

  // ---- Generischer Quiz-Runner ----
  // fragen: Array von { typ: 'mc'|'numeric', lesetext?, frage, optionen?, richtigIndex?, antwort? }
  let session = null;

  function startQuizSession(fach, fragen, config) {
    session = {
      fach, fragen, index: 0, sessionSterne: 0, richtigCount: 0,
      onFinish: config && config.onFinish
    };
    renderQuestion();
  }

  function renderQuestion() {
    const f = session.fragen[session.index];
    const total = session.fragen.length;
    const nr = session.index + 1;

    let bodyHtml = '';
    if (f.lesetext) {
      bodyHtml += `<div class="lese-text">${f.lesetext}</div>`;
    }
    bodyHtml += `<div class="frage-text">${f.frage}</div>`;

    if (f.typ === 'numeric') {
      bodyHtml += `
        <div class="zahl-anzeige" id="zahl-anzeige">&nbsp;</div>
        <div class="keypad" id="keypad"></div>
      `;
    } else {
      bodyHtml += `<div class="optionen" id="optionen"></div>`;
    }
    bodyHtml += `<div class="feedback" id="feedback"></div>`;

    render(`
      <div class="quiz-wrap">
        <div class="progress-row">
          <span>Frage ${nr} / ${total}</span>
          <span>${session.fach.toUpperCase()}</span>
        </div>
        <div class="frage-card">${bodyHtml}</div>
      </div>
    `);

    if (f.typ === 'numeric') {
      renderKeypad(f);
    } else {
      renderOptionen(f);
    }
  }

  function renderOptionen(f) {
    const wrap = document.getElementById('optionen');
    f.optionen.forEach((opt, i) => {
      const btn = document.createElement('div');
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.onclick = () => beantworteMC(i, f);
      wrap.appendChild(btn);
    });
  }

  function beantworteMC(i, f) {
    const buttons = document.querySelectorAll('#optionen .option-btn');
    buttons.forEach(b => b.onclick = null);
    const korrekt = i === f.richtigIndex;
    buttons[i].classList.add(korrekt ? 'richtig' : 'falsch');
    if (!korrekt) buttons[f.richtigIndex].classList.add('richtig');
    abschlussFrage(korrekt);
  }

  let eingabe = '';
  function renderKeypad(f) {
    eingabe = '';
    const anzeige = document.getElementById('zahl-anzeige');
    const pad = document.getElementById('keypad');
    const tasten = ['1','2','3','4','5','6','7','8','9','⌫','0','OK'];
    tasten.forEach(t => {
      const btn = document.createElement('div');
      btn.className = 'key-btn' + (t === 'OK' ? ' ok' : t === '⌫' ? ' del' : '');
      btn.textContent = t;
      btn.onclick = () => {
        if (t === '⌫') {
          eingabe = eingabe.slice(0, -1);
        } else if (t === 'OK') {
          if (eingabe === '') return;
          document.querySelectorAll('.key-btn').forEach(b => b.onclick = null);
          const korrekt = parseInt(eingabe, 10) === f.antwort;
          abschlussFrage(korrekt, f.antwort);
          return;
        } else if (eingabe.length < 6) {
          eingabe += t;
        }
        anzeige.textContent = eingabe === '' ? ' ' : eingabe;
      };
      pad.appendChild(btn);
    });
  }

  function abschlussFrage(korrekt, richtigeAntwort) {
    const gained = Storage.addAntwort(session.fach, korrekt);
    if (korrekt) session.richtigCount++;
    session.sessionSterne += gained;
    updateTopbar();

    const fb = document.getElementById('feedback');
    if (korrekt) {
      fb.className = 'feedback ok';
      fb.textContent = '✔ Richtig! +' + gained + ' ⭐';
    } else {
      fb.className = 'feedback nok';
      fb.textContent = richtigeAntwort !== undefined
        ? '✘ Leider falsch. Richtig wäre: ' + richtigeAntwort
        : '✘ Leider falsch.';
    }

    setTimeout(() => {
      session.index++;
      if (session.index >= session.fragen.length) {
        renderErgebnis();
      } else {
        renderQuestion();
      }
    }, 1400);
  }

  function renderErgebnis() {
    const total = session.fragen.length;
    const quote = Math.round((session.richtigCount / total) * 100);
    let emoji = '🙂';
    if (quote >= 90) emoji = '🏆';
    else if (quote >= 70) emoji = '🎉';
    else if (quote >= 40) emoji = '👍';

    render(`
      <div class="result-card">
        <div class="result-emoji">${emoji}</div>
        <div class="result-title">${session.richtigCount} von ${total} richtig!</div>
        <div class="result-sterne">Du hast ${session.sessionSterne} ⭐ verdient</div>
        <div class="btn-primary" onclick="App.restartLast()">Nochmal üben</div>
        <div class="btn-primary" style="background:#dbe9f7;color:#2E6DA4;" onclick="App.gotoHome()">Zum Hauptmenü</div>
      </div>
    `);

    if (typeof session.onFinish === 'function') session.onFinish();
  }

  let lastStarter = null;
  function setLastStarter(fn) { lastStarter = fn; }
  function restartLast() { if (lastStarter) lastStarter(); else gotoHome(); }

  function init() {
    gotoHome();
    updateAkkuAnzeige();
    setInterval(updateAkkuAnzeige, 60000);
  }

  return {
    init, gotoHome, render, subMenuHtml, updateTopbar,
    startQuizSession, setLastStarter, restartLast, setOnLeaveScreen
  };
})();
