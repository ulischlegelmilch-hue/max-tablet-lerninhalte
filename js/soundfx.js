// Kurze, per Web Audio API SYNTHETISIERTE Soundeffekte fuer Schiffe versenken
// - kein externes Audio-Asset noetig, passt damit zum Rest der App (reines
// Vanilla-JS ohne Abhaengigkeiten). "Platsch" bei Wasser, "Peng" bei Treffer,
// ein groesseres "Bumm" beim Versenken - fuer einen 9-Jaehrigen macht das
// Belohnungsgefuehl bei einem Treffer viel aus (Uli-Feedback 16.08.2026:
// "kein Sound im ganzen Spiel").
//
// AudioContext darf laut Browser-Regel erst nach einer echten Nutzer-Geste
// starten/fortgesetzt werden - das ist hier immer der Fall, da jeder Aufruf
// direkt aus einem Feld-Klick folgt.
const SoundFX = (function () {
  let ctx = null;

  function holeKontext() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function rauschPuffer(audioCtx, dauer) {
    const laenge = Math.max(1, Math.floor(audioCtx.sampleRate * dauer));
    const puffer = audioCtx.createBuffer(1, laenge, audioCtx.sampleRate);
    const daten = puffer.getChannelData(0);
    for (let i = 0; i < laenge; i++) daten[i] = Math.random() * 2 - 1;
    return puffer;
  }

  /** Wasser-Spritzer: gefiltertes Rauschen mit kurzer, abfallender Huelle. */
  function wasser() {
    const audioCtx = holeKontext();
    if (!audioCtx) return;
    const jetzt = audioCtx.currentTime;
    const quelle = audioCtx.createBufferSource();
    quelle.buffer = rauschPuffer(audioCtx, 0.35);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, jetzt);
    filter.frequency.exponentialRampToValueAtTime(300, jetzt + 0.3);
    filter.Q.value = 0.7;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, jetzt);
    gain.gain.exponentialRampToValueAtTime(0.35, jetzt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, jetzt + 0.35);
    quelle.connect(filter).connect(gain).connect(audioCtx.destination);
    quelle.start(jetzt);
    quelle.stop(jetzt + 0.35);
  }

  /** Treffer/Versenkt: absackender Ton + Rausch-"Krach", beim Versenken
   *  laenger und lauter fuer ein groesseres Erfolgsgefuehl. */
  function boom(gross) {
    const audioCtx = holeKontext();
    if (!audioCtx) return;
    const jetzt = audioCtx.currentTime;
    const dauer = gross ? 0.55 : 0.32;

    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(gross ? 160 : 220, jetzt);
    osc.frequency.exponentialRampToValueAtTime(40, jetzt + dauer);
    const oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(0.0001, jetzt);
    oscGain.gain.exponentialRampToValueAtTime(gross ? 0.5 : 0.35, jetzt + 0.015);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, jetzt + dauer);
    osc.connect(oscGain).connect(audioCtx.destination);
    osc.start(jetzt);
    osc.stop(jetzt + dauer);

    const rauschDauer = dauer * 0.6;
    const quelle = audioCtx.createBufferSource();
    quelle.buffer = rauschPuffer(audioCtx, rauschDauer);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, jetzt);
    filter.frequency.exponentialRampToValueAtTime(200, jetzt + rauschDauer);
    const rauschGain = audioCtx.createGain();
    rauschGain.gain.setValueAtTime(0.0001, jetzt);
    rauschGain.gain.exponentialRampToValueAtTime(gross ? 0.3 : 0.2, jetzt + 0.01);
    rauschGain.gain.exponentialRampToValueAtTime(0.0001, jetzt + rauschDauer);
    quelle.connect(filter).connect(rauschGain).connect(audioCtx.destination);
    quelle.start(jetzt);
    quelle.stop(jetzt + rauschDauer);
  }

  function treffer() { boom(false); }
  function versenkt() { boom(true); }

  return { wasser, treffer, versenkt };
})();
