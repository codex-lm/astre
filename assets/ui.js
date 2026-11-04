/*
 * Astre — contrôleur : boucle à pas fixe (accumulateur + garde-fou), entrées
 * clavier et tactiles, écrans, pause, hook QA.
 */
(function () {
  'use strict';
  var E = window.AstreEngine, I18N = window.AstreI18n, AU = window.AstreAudio;

  var SAVE_KEY = 'astre.save.v1';
  var save = { lang: 'en', sound: true, best: 0 };
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      var p = JSON.parse(raw);
      save = { lang: p.lang || 'en', sound: p.sound !== false, best: p.best || 0 };
    }
  } catch (e) {}
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  function t(k) { return I18N.get(save.lang, k); }
  window.__astreLang = save.lang;
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function show(node, on) { node.classList.toggle('hidden', !on); }

  var canvas = $('game-canvas');
  var renderer = window.AstreRender.create(canvas);
  var g = null;
  var running = false, paused = false;
  var input = { left: false, right: false, thrust: false, fire: false, dash: false };
  var touchAim = null;        // {angle, force} du stick
  var acc = 0, last = 0;
  var watchdog = null;

  // ---------------------------------------------------------------- écrans
  function renderTexts() {
    window.__astreLang = save.lang;
    document.documentElement.lang = save.lang;
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    $('tagline').textContent = t('tagline');
    $('btn-play').textContent = t('play');
    $('btn-howto').textContent = t('howTo');
    $('btn-sound').textContent = (save.sound ? '♪ ' : '✕ ') + t(save.sound ? 'soundOn' : 'soundOff');
    $('hud-best').textContent = t('best') + ' ' + save.best;
    renderLangPills();
  }

  function renderLangPills() {
    var box = $('langs');
    box.textContent = '';
    I18N.langs.forEach(function (code) {
      var b = el('button', 'pill' + (save.lang === code ? ' active' : ''), code.toUpperCase());
      b.addEventListener('click', function () {
        save.lang = code; persist(); AU.ui(); renderTexts();
      });
      box.appendChild(b);
    });
  }

  function startGame() {
    var seed = (Date.now() & 0xffffffff) >>> 0;
    g = E.createGame({ seed: seed });
    g.__thrusting = false;
    running = true; paused = false;
    show($('home'), false);
    show($('game'), true);
    closeOverlay();
    last = performance.now();
    acc = 0;
    resize();
  }

  function gameOver() {
    running = false;
    AU.thrust(false);
    var isBest = g.score > save.best;
    if (isBest) { save.best = g.score; persist(); }
    var box = el('div', 'modal');
    box.appendChild(el('h2', 'go-title', t('gameOver')));
    if (isBest) box.appendChild(el('p', 'newbest', t('newBest')));
    box.appendChild(el('p', 'big', t('finalScore') + ' : ' + g.score));
    box.appendChild(el('p', null, t('best') + ' : ' + save.best + ' · ' + t('wave') + ' ' + g.wave));
    var again = el('button', 'primary big', t('replay'));
    again.addEventListener('click', function () { AU.ui(); startGame(); });
    box.appendChild(again);
    var menu = el('button', null, t('menu'));
    menu.addEventListener('click', function () { AU.ui(); goMenu(); });
    box.appendChild(menu);
    overlay(box);
  }

  function goMenu() {
    running = false; g = null;
    show($('game'), false);
    show($('home'), true);
    closeOverlay();
    renderTexts();
  }

  // ---------------------------------------------------------------- overlays
  function overlay(content) {
    var card = $('overlay-card');
    card.textContent = '';
    card.appendChild(content);
    show($('overlay'), true);
  }
  function closeOverlay() { show($('overlay'), false); }

  function showRules() {
    var box = el('div', 'rules');
    box.appendChild(el('h2', null, t('rulesTitle')));
    [1, 2, 3, 4, 5].forEach(function (n) { box.appendChild(el('p', null, t('rule' + n))); });
    var btn = el('button', 'primary', t('gotIt'));
    btn.addEventListener('click', function () { AU.ui(); closeOverlay(); if (paused) showPause(); });
    box.appendChild(btn);
    overlay(box);
  }

  function showPause() {
    var box = el('div', 'modal');
    box.appendChild(el('h2', null, t('paused')));
    var r = el('button', 'primary big', t('resume'));
    r.addEventListener('click', function () {
      AU.ui(); closeOverlay(); paused = false; last = performance.now();
    });
    box.appendChild(r);
    var q = el('button', null, t('menu'));
    q.addEventListener('click', function () { AU.ui(); paused = false; goMenu(); });
    box.appendChild(q);
    overlay(box);
  }

  // ---------------------------------------------------------------- boucle
  function applyTouchAim() {
    if (!touchAim || touchAim.force < 0.25) return;
    var want = touchAim.angle;
    var cur = g.ship.angle;
    var d = want - cur;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    input.left = d < -0.12;
    input.right = d > 0.12;
    input.thrust = touchAim.force > 0.55;
  }

  var hbT = 0; // heartbeat : s'accélère quand il reste peu de rochers

  function snap(g) {
    return {
      ship: { x: g.ship.x, y: g.ship.y },
      bullets: g.bullets.map(function (b) { return [b.x, b.y]; }),
      ebullets: g.ebullets.map(function (b) { return [b.x, b.y]; }),
      drones: g.drones.map(function (d) { return [d.x, d.y]; }),
      powerUps: g.powerUps.map(function (p) { return [p.x, p.y]; })
    };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!running || paused || !g) return;
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (touchAim) applyTouchAim();
    g.__thrusting = input.thrust;
    AU.thrust(input.thrust && !g.ship.gone);
    acc += dt;
    var steps = 0;
    var prev = null;
    while (acc >= E.DT && steps < 4) {
      prev = snap(g);
      var events = E.step(g, input);
      input.dash = false; // dash = front unique
      for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        renderer.onEvent(ev, t);
        if (ev.type === 'shoot') AU.shoot(ev.triple);
        else if (ev.type === 'boom') AU.boom(ev.size);
        else if (ev.type === 'clink') AU.clink();
        else if (ev.type === 'dash') AU.dash();
        else if (ev.type === 'shipHit') AU.shipHit();
        else if (ev.type === 'shieldHit') AU.shieldHit();
        else if (ev.type === 'pickup') AU.pickup(ev.kind);
        else if (ev.type === 'droneShoot') AU.droneShoot();
        else if (ev.type === 'droneDown') AU.droneDown();
        else if (ev.type === 'extraLife') AU.extraLife();
        else if (ev.type === 'comboUp') AU.comboUp(ev.combo);
        else if (ev.type === 'comboMax') AU.comboMax();
        else if (ev.type === 'wave') AU.wave();
        else if (ev.type === 'gameOver') setTimeout(gameOver, 900);
      }
      acc -= E.DT;
      steps++;
    }
    // heartbeat discret, plus rapide quand il reste peu de rochers
    hbT -= dt;
    if (hbT <= 0 && !g.over) {
      AU.heartbeat(0.55 + 0.5 * Math.min(g.rocks.length, 6) / 6);
      hbT = 0.55 + 0.5 * Math.min(g.rocks.length, 6) / 6;
    }
    var alpha = Math.min(1, acc / E.DT);
    renderer.draw(g, dt, { wave: t('wave') }, alpha, prev);
  }

  // garde-fou : si le rAF est étranglé (onglet caché), un minuteur avance peu ;
  // on choisit de mettre en pause plutôt que d'accumuler.
  watchdog = setInterval(function () {
    if (running && !paused && document.hidden) {
      paused = true;
      AU.thrust(false);
      showPause();
    }
  }, 800);

  function resize() {
    var wrap = $('canvas-wrap');
    var w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.resize(w, h);
  }
  window.addEventListener('resize', function () { if (g) resize(); });

  // ---------------------------------------------------------------- entrées
  document.addEventListener('keydown', function (ev) {
    // rejeu instantané : Espace/Entrée relance depuis l'écran de fin
    if (!running && g && !document.getElementById('overlay').classList.contains('hidden') &&
        (ev.key === ' ' || ev.key === 'Enter')) {
      ev.preventDefault();
      startGame();
      return;
    }
    if (!running) return;
    var k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'q') { input.left = true; ev.preventDefault(); }
    if (k === 'ArrowRight' || k === 'd') { input.right = true; ev.preventDefault(); }
    if (k === 'ArrowUp' || k === 'w' || k === 'z') { input.thrust = true; ev.preventDefault(); }
    if (k === ' ') { input.fire = true; ev.preventDefault(); AU.unlock(); }
    if (k === 'Shift') { input.dash = true; ev.preventDefault(); }
    if (k === 'p') {
      paused = !paused;
      if (paused) { AU.thrust(false); showPause(); } else { last = performance.now(); closeOverlay(); }
    }
  });
  document.addEventListener('keyup', function (ev) {
    var k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'q') input.left = false;
    if (k === 'ArrowRight' || k === 'd') input.right = false;
    if (k === 'ArrowUp' || k === 'w' || k === 'z') input.thrust = false;
    if (k === ' ') input.fire = false;
  });

  // joystick tactile gauche : le stick pilote le cap (asservi) + poussée
  var stick = $('stick'), knob = $('stick-knob');
  var stickId = null, stickCx = 0, stickCy = 0;
  function stickMove(x, y) {
    var dx = x - stickCx, dy = y - stickCy;
    var d = Math.min(1, Math.hypot(dx, dy) / 46);
    var a = Math.atan2(dy, dx);
    touchAim = { angle: a, force: d };
    knob.style.transform = 'translate(' + Math.cos(a) * d * 34 + 'px,' + Math.sin(a) * d * 34 + 'px)';
  }
  function stickEnd() {
    stickId = null; touchAim = null;
    input.left = input.right = input.thrust = false;
    knob.style.transform = 'translate(0,0)';
  }
  stick.addEventListener('touchstart', function (ev) {
    ev.preventDefault();
    AU.unlock();
    var to = ev.changedTouches[0];
    stickId = to.identifier;
    var r = stick.getBoundingClientRect();
    stickCx = r.left + r.width / 2; stickCy = r.top + r.height / 2;
    stickMove(to.clientX, to.clientY);
  }, { passive: false });
  document.addEventListener('touchmove', function (ev) {
    if (stickId === null) return;
    for (var i = 0; i < ev.changedTouches.length; i++)
      if (ev.changedTouches[i].identifier === stickId) {
        ev.preventDefault();
        stickMove(ev.changedTouches[i].clientX, ev.changedTouches[i].clientY);
      }
  }, { passive: false });
  document.addEventListener('touchend', function (ev) {
    for (var i = 0; i < ev.changedTouches.length; i++)
      if (ev.changedTouches[i].identifier === stickId) stickEnd();
  });

  function holdButton(id, on, off) {
    var b = $(id);
    b.addEventListener('touchstart', function (e) { e.preventDefault(); AU.unlock(); on(); }, { passive: false });
    b.addEventListener('touchend', function (e) { e.preventDefault(); off(); }, { passive: false });
    b.addEventListener('mousedown', on);
    b.addEventListener('mouseup', off);
    b.addEventListener('mouseleave', off);
  }
  holdButton('btn-fire', function () { input.fire = true; }, function () { input.fire = false; });
  holdButton('btn-dash', function () { input.dash = true; }, function () { input.dash = false; });

  // afficher les contrôles tactiles sur écran tactile
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    document.body.classList.add('touch');
  window.addEventListener('touchstart', function () { document.body.classList.add('touch'); }, { once: true, passive: true });

  // ---------------------------------------------------------------- boutons
  $('btn-play').addEventListener('click', function () { AU.ui(); AU.unlock(); startGame(); });
  $('btn-howto').addEventListener('click', function () { AU.ui(); showRules(); });
  $('btn-sound').addEventListener('click', function () {
    save.sound = !save.sound; persist();
    AU.setEnabled(save.sound);
    renderTexts();
    if (save.sound) AU.ui();
  });
  $('overlay').addEventListener('click', function (ev) {
    if (ev.target === $('overlay') && !paused) closeOverlay();
  });

  // hook QA (?debug=1) : piloter le moteur sans dépendre du rAF
  if (location.search.indexOf('debug=1') !== -1) {
    window.__astre = {
      g: function () { return g; },
      engine: E,
      input: input,
      start: startGame,
      step: function (n, inp) {
        var saved = {};
        for (var k in input) { saved[k] = input[k]; if (inp && k in inp) input[k] = inp[k]; }
        var all = [];
        for (var i = 0; i < (n || 1); i++) all = all.concat(E.step(g, input));
        for (var k2 in saved) input[k2] = saved[k2];
        renderer.draw(g, 1 / 60, { wave: t('wave') }, 1, null);
        return all;
      },
      draw: function () { if (g) renderer.draw(g, 1 / 60, { wave: t('wave') }, 1, null); },
      gameOver: gameOver,
      save: save
    };
  }

  // ---------------------------------------------------------------- départ
  AU.setEnabled(save.sound);
  renderTexts();
  show($('home'), true);
  resize();
  requestAnimationFrame(frame);
})();
