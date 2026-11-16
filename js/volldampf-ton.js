// VOLLDAMPF – Töne. Alles im Gerät erzeugt (Web Audio), keine Dateien, kein Netz.
// VolldampfTon.spiele('pfiff' | 'horn' | 'gong' | 'kasse' | 'bau' | 'fertig' | 'land' | 'glocke' | 'puff' | 'ding', { leise })
const VolldampfTon = (function () {
  let ac = null, aus = null, rauschPuffer = null;
  const letzte = {};

  function kontext() {
    if (ac) return ac;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ac = new C();
    aus = ac.createGain(); aus.gain.value = 0.55;
    // sanfter Begrenzer: mehrere Töne gleichzeitig sollen nicht scheppern
    const k = ac.createDynamicsCompressor ? ac.createDynamicsCompressor() : null;
    if (k) { aus.connect(k); k.connect(ac.destination); } else aus.connect(ac.destination);
    return ac;
  }
  function rauschen() {
    if (rauschPuffer) return rauschPuffer;
    const n = ac.sampleRate, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (rauschPuffer = b);
  }
  /** ein Ton mit weichem Ein- und Ausklang: f Hz (optional bis f2), ab t, Dauer d, Lautstärke v */
  function klang(f, t, d, v, typ, f2, an) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = typ || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.linearRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (an || 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(aus); o.start(t); o.stop(t + d + 0.05);
    return o;
  }
  /** gehaltener Ton (Pfeife, Horn): schnell an, steht, klingt kurz aus; optional durch einen Tiefpass */
  function halte(f, t, d, v, typ, filterHz) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = typ;
    o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.08);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.05);
    g.gain.setValueAtTime(v, t + d - 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    if (filterHz) { const fi = ac.createBiquadFilter(); fi.type = 'lowpass'; fi.frequency.value = filterHz; o.connect(fi); fi.connect(g); } else o.connect(g);
    g.connect(aus); o.start(t); o.stop(t + d + 0.05);
  }
  /** Rauschen (Dampf, Hammerschlag): Bandpass um hz */
  function zisch(t, d, v, hz, q) {
    const s = ac.createBufferSource(), fi = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = rauschen(); s.loop = true;
    fi.type = 'bandpass'; fi.frequency.value = hz; fi.Q.value = q || 0.8;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.03, d / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fi); fi.connect(g); g.connect(aus); s.start(t); s.stop(t + d + 0.05);
  }

  const KLANG = {
    // Dampfpfeife: Dreiklang mit Hauch von Dampf
    pfiff(t, v) { [523, 659, 784].forEach((f, i) => halte(f, t, 0.75, v * (i ? 0.045 : 0.06), 'triangle')); zisch(t, 0.8, v * 0.05, 2400, 0.6); },
    // Makrofon einer E- oder Diesellok: zwei tiefe Töne
    horn(t, v) { halte(311, t, 0.6, v * 0.07, 'sawtooth', 1400); halte(370, t, 0.6, v * 0.06, 'sawtooth', 1400); },
    // Bahnhofsgong vor der Durchsage
    gong(t, v) { [659, 523, 392].forEach((f, i) => { klang(f, t + i * 0.34, 1.3, v * 0.11, 'sine'); klang(f * 2, t + i * 0.34, 0.5, v * 0.02, 'sine'); }); },
    kasse(t, v) { klang(1319, t, 0.14, v * 0.09, 'triangle'); klang(1760, t + 0.07, 0.3, v * 0.09, 'triangle'); },
    // Bautrupp: drei Hammerschläge auf die Schiene
    bau(t, v) { [0, 0.16, 0.32].forEach(dt => { zisch(t + dt, 0.07, v * 0.2, 1900, 3); klang(1480, t + dt, 0.12, v * 0.035, 'sine'); }); },
    fertig(t, v) { klang(660, t, 0.16, v * 0.1, 'triangle'); klang(990, t + 0.12, 0.34, v * 0.1, 'triangle'); },
    // große Momente: kleine Fanfare
    land(t, v) { [392, 523, 659, 784].forEach((f, i) => klang(f, t + i * 0.11, i === 3 ? 0.9 : 0.3, v * 0.1, 'triangle')); klang(196, t, 1.1, v * 0.06, 'sine'); },
    // Zugtaufe: Glocke
    glocke(t, v) { [1, 2.76, 5.4].forEach((m, i) => klang(784 * m, t, 1.6 / (i + 1), v * 0.09 / (i + 1), 'sine', null, 0.005)); },
    // Dampflok hält an: zwei Dampfstöße
    puff(t, v) { zisch(t, 0.22, v * 0.1, 900, 0.5); zisch(t + 0.28, 0.3, v * 0.08, 700, 0.5); },
    // moderner Zug hält an: Türton
    ding(t, v) { klang(1047, t, 0.25, v * 0.05, 'sine'); klang(784, t + 0.18, 0.4, v * 0.05, 'sine'); }
  };

  /** opt.leise: halbe Lautstärke; opt.pause: frühestens nach so vielen ms wieder (gegen Dauerbeschallung) */
  function spiele(art, opt) {
    const o = opt || {};
    try {
      if (!KLANG[art] || !kontext()) return false;
      const jetzt = Date.now();
      if (o.pause && letzte[art] && jetzt - letzte[art] < o.pause) return false;
      letzte[art] = jetzt;
      if (ac.state === 'suspended' && ac.resume) ac.resume();
      KLANG[art](ac.currentTime + 0.01, o.leise ? 0.5 : 1);
      return true;
    } catch (e) { return false; }   // ohne Ton weiterspielen
  }
  return { spiele, ARTEN: Object.keys(KLANG) };
})();
if (typeof module !== 'undefined') module.exports = VolldampfTon;
