/*
 * Astre — mini-synthé WebAudio : tirs, explosions, thrust, dash, combos.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.AstreAudio = factory(root);
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  var ctx = null, enabled = true, noiseBuf = null, thrustNode = null;

  function ensure() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noise(c) {
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate);
      var data = noiseBuf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  function tone(freq, dur, type, gain, when, slideTo) {
    if (!enabled) return;
    try {
      var c = ensure();
      if (!c) return;
      var t = c.currentTime + (when || 0);
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain || 0.1, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* silence */ }
  }

  function boomNoise(dur, freq, gain) {
    if (!enabled) return;
    try {
      var c = ensure();
      if (!c) return;
      var src = c.createBufferSource();
      src.buffer = noise(c);
      var f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(freq, c.currentTime);
      f.frequency.exponentialRampToValueAtTime(80, c.currentTime + dur);
      var g = c.createGain();
      g.gain.setValueAtTime(gain, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start(); src.stop(c.currentTime + dur + 0.05);
    } catch (e) { /* silence */ }
  }

  return {
    setEnabled: function (v) {
      enabled = !!v;
      if (!v && thrustNode) this.thrust(false);
    },
    isEnabled: function () { return enabled; },
    unlock: function () { ensure(); },
    shoot: function () { tone(760, 0.07, 'square', 0.045, 0, 240); },
    clink: function () { tone(1250, 0.05, 'triangle', 0.05); },
    boom: function (size) {
      var f = size === 4 ? 900 : size === 3 ? 700 : size === 2 ? 500 : 380;
      boomNoise(size === 4 ? 0.5 : 0.28, f, size === 4 ? 0.22 : 0.14);
    },
    droneShoot: function () { tone(320, 0.08, 'sawtooth', 0.035, 0, 180); },
    droneDown: function () { boomNoise(0.35, 800, 0.16); tone(520, 0.12, 'square', 0.05); },
    dash: function () { tone(240, 0.22, 'sine', 0.09, 0, 720); },
    shipHit: function () { boomNoise(0.6, 500, 0.2); tone(300, 0.5, 'sawtooth', 0.07, 0, 60); },
    extraLife: function () { [660, 880, 1100].forEach(function (f, i) { tone(f, 0.14, 'square', 0.06, i * 0.09); }); },
    comboUp: function (n) { tone(500 + n * 90, 0.07, 'square', 0.05); },
    comboMax: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.16, 'sine', 0.07, i * 0.05); }); },
    wave: function () { tone(392, 0.14, 'triangle', 0.08); tone(523, 0.2, 'triangle', 0.08, 0.14); },
    gameOver: function () { [330, 262, 196, 131].forEach(function (f, i) { tone(f, 0.35, 'triangle', 0.09, i * 0.22); }); },
    ui: function () { tone(700, 0.05, 'sine', 0.05); },
    thrust: function (on) {
      if (!enabled) on = false;
      try {
        var c = ensure();
        if (!c) return;
        if (on && !thrustNode) {
          var src = c.createBufferSource();
          src.buffer = noise(c); src.loop = true;
          var f = c.createBiquadFilter();
          f.type = 'bandpass'; f.frequency.value = 220; f.Q.value = 0.6;
          var g = c.createGain();
          g.gain.setValueAtTime(0.0001, c.currentTime);
          g.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 0.05);
          src.connect(f); f.connect(g); g.connect(c.destination);
          src.start();
          thrustNode = { src: src, g: g };
        } else if (!on && thrustNode) {
          var tn = thrustNode; thrustNode = null;
          tn.g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.1);
          setTimeout(function () { try { tn.src.stop(); } catch (e) {} }, 200);
        }
      } catch (e) { thrustNode = null; }
    }
  };
});
