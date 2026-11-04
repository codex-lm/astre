/*
 * Astre — moteur de jeu pur (sans DOM), déterministe : pas fixe + RNG seedé.
 * Asteroids remis au goût du jour : champ unique toroïdal, vaisseau à inertie,
 * astéroïdes qui se fragmentent, dash contrôlé, combo multiplicateur,
 * drones à patterns, méga-astéroïde boss. Testable sous Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AstreEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var W = 800, H = 600;
  var DT = 1 / 60;
  var ROT = 3.8;            // rad/s
  var THRUST = 300;         // u/s²
  var DAMP = 0.995;         // amortissement par pas (léger, goût du jour)
  var BULLET_SPEED = 520, BULLET_LIFE = 1.1, FIRE_CD = 0.22;
  var DASH_SPEED = 380, DASH_CD = 2.5, DASH_INV = 0.3;
  var RESPAWN_INV = 2.5;
  var ROCK_R = { 1: 16, 2: 30, 3: 52, 4: 92 };
  var ROCK_SCORE = { 1: 100, 2: 50, 3: 20, 4: 500 };
  var DRONE_SCORE = { big: 200, small: 350 };
  var COMBO_MAX = 8, COMBO_WINDOW = 2.0, SLOWMO_T = 0.45, SLOWMO_SCALE = 0.35;
  var SAFE_SPAWN = 220, SAFE_RESPAWN = 140;
  var PU_LIFE = 10.0, PU_R = 20;
  var TRIPLE_T = 8.0, SLOWFX_T = 4.0, SLOWFX_SCALE = 0.45;

  var PU_DROPRATE = { rock: { 3: 0.16, 2: 0.13, 1: 0.10 }, drone: { big: 0.25, small: 0.30 } };

  function makePowerUp(g, x, y) {
    var r = rng(g);
    var type = r < 0.34 ? 'triple' : r < 0.61 ? 'shield' : r < 0.90 ? 'slow' : 'life';
    var a = rng(g) * Math.PI * 2;
    return { type: type, x: x, y: y,
             vx: Math.cos(a) * 22, vy: Math.sin(a) * 22, life: PU_LIFE, age: 0 };
  }

  // RNG mulberry32 à état sérialisable
  function rndNext(s) {
    s = (s + 0x6d2b79f5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return { s: s, v: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
  }

  function wrap(v, max) { v = v % max; if (v < 0) v += max; return v; }

  function createGame(opts) {
    opts = opts || {};
    var g = {
      W: W, H: H, t: 0,
      rngS: (opts.seed >>> 0) || 20261103,
      ship: { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, invuln: 2.0, lives: 3, fireCd: 0, dashCd: 0, gone: false },
      bullets: [], ebullets: [], rocks: [], drones: [], powerUps: [],
      fx: { triple: 0, slow: 0 }, shield: false, hitStop: 0, deathSlow: 0,
      score: 0, wave: 0, waveBreak: 1.2, combo: 0, comboT: 0,
      nextLifeAt: 10000, over: false, slowmo: 0, droneT: 8, kills: 0,
      events: []
    };
    spawnWave(g, 1);
    return g;
  }

  function rng(g) {
    var r = rndNext(g.rngS);
    g.rngS = r.s;
    return r.v;
  }

  function makeRock(g, size, x, y, vx, vy) {
    var n = 9 + Math.floor(rng(g) * 5);
    var shape = [];
    for (var i = 0; i < n; i++) shape.push(0.72 + rng(g) * 0.38);
    var speed = size === 4 ? 26 : (size === 3 ? 46 : size === 2 ? 78 : 118);
    if (vx === undefined) {
      var a = rng(g) * Math.PI * 2;
      var m = speed * (0.6 + rng(g) * 0.7);
      vx = Math.cos(a) * m; vy = Math.sin(a) * m;
    }
    return { x: x, y: y, vx: vx, vy: vy, r: ROCK_R[size], size: size,
             ang: rng(g) * Math.PI * 2, angV: (rng(g) - 0.5) * 1.6,
             shape: shape, hp: size === 4 ? 12 : 1, age: 0 };
  }

  function spawnWave(g, wave) {
    g.wave = wave;
    var n = Math.min(3 + wave, 8);
    for (var i = 0; i < n; i++) {
      var x, y, tries = 0;
      do {
        x = rng(g) * W; y = rng(g) * H; tries++;
      } while (tries < 60 && dist2(x, y, g.ship.x, g.ship.y) < SAFE_SPAWN * SAFE_SPAWN);
      g.rocks.push(makeRock(g, 3, x, y));
    }
    if (wave % 4 === 0) g.rocks.push(makeRock(g, 4, rng(g) * W, rng(g) < 0.5 ? 40 : H - 40));
    g.events.push({ type: 'wave', wave: wave });
  }

  function dist2(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  function fragment(g, rock) {
    if (rock.size <= 1) return;
    for (var k = 0; k < 2; k++) {
      var a = rng(g) * Math.PI * 2;
      var m = 60 + rng(g) * 70;
      g.rocks.push(makeRock(g, rock.size - 1,
        rock.x + Math.cos(a) * rock.r * 0.4, rock.y + Math.sin(a) * rock.r * 0.4,
        rock.vx + Math.cos(a) * m, rock.vy + Math.sin(a) * m));
    }
  }

  function addScore(g, base) {
    var mult = Math.max(1, g.combo);
    g.score += base * mult;
    if (g.score >= g.nextLifeAt) {
      g.ship.lives++;
      // première vie à 10 000, puis une tous les 15 000 : la tension tient
      g.nextLifeAt += 15000;
      g.events.push({ type: 'extraLife', lives: g.ship.lives });
    }
  }

  function killCombo(g) {
    g.kills++;
    if (g.comboT > 0) g.combo = Math.min(COMBO_MAX, g.combo + 1);
    else g.combo = 1;
    g.comboT = COMBO_WINDOW;
    if (g.combo === COMBO_MAX && g.slowmo <= 0) { g.slowmo = SLOWMO_T; g.events.push({ type: 'comboMax' }); }
    else g.events.push({ type: 'comboUp', combo: g.combo });
  }

  // un power-up tombe-t-il de cette destruction ?
  function maybeDrop(g, kind, size, x, y) {
    var rate = PU_DROPRATE[kind][size];
    if (rate === undefined || rng(g) >= rate) return;
    g.powerUps.push(makePowerUp(g, x, y));
  }

  // un coup reçu : le bouclier l'absorbe, sinon une vie part
  function applyHit(g, x, y) {
    var sh = g.ship;
    if (g.shield) {
      g.shield = false;
      sh.invuln = 1.2;
      g.hitStop = 3;
      g.events.push({ type: 'shieldHit', x: x, y: y });
      return;
    }
    sh.lives--;
    g.combo = 0; g.comboT = 0;
    g.hitStop = 4;
    g.deathSlow = 0.45;
    g.events.push({ type: 'shipHit', x: sh.x, y: sh.y, lives: sh.lives });
    if (sh.lives < 0) {
      g.over = true;
      g.events.push({ type: 'gameOver', score: g.score });
    } else {
      sh.gone = true;
      g.respawnT = 0.9;
    }
  }

  function respawnShip(g) {
    var spots = [[W / 2, H / 2]];
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4;
      spots.push([W / 2 + Math.cos(a) * 180, H / 2 + Math.sin(a) * 180]);
    }
    for (var s = 0; s < spots.length; s++) {
      var ok = true;
      for (var r = 0; r < g.rocks.length && ok; r++)
        if (dist2(spots[s][0], spots[s][1], g.rocks[r].x, g.rocks[r].y) < SAFE_RESPAWN * SAFE_RESPAWN) ok = false;
      if (ok) { g.ship.x = wrap(spots[s][0], W); g.ship.y = wrap(spots[s][1], H); break; }
    }
    g.ship.vx = 0; g.ship.vy = 0;
    g.ship.invuln = RESPAWN_INV;
    g.ship.gone = false;
  }

  function spawnDrone(g) {
    var big = rng(g) < 0.55;
    var fromLeft = rng(g) < 0.5;
    g.drones.push({
      x: fromLeft ? -30 : W + 30, y: 60 + rng(g) * (H - 120),
      vx: (fromLeft ? 1 : -1) * (big ? 70 : 110), vy: 0,
      big: big, hp: big ? 2 : 1, phase: rng(g) * Math.PI * 2, fireT: 1.2
    });
  }

  /*
   * Un pas de simulation. input = { left, right, thrust, fire, dash }.
   * Renvoie les événements du pas (sons/particules côté rendu).
   */
  function step(g, input) {
    g.events = [];
    if (g.over) return g.events;
    // hit-stop : gel bref (steps entiers) sur les gros impacts
    if (g.hitStop > 0) { g.hitStop--; return g.events; }
    var scale = g.slowmo > 0 ? SLOWMO_SCALE : (g.deathSlow > 0 ? 0.3 : 1);
    var dt = DT * scale;
    g.t += dt;
    if (g.slowmo > 0) g.slowmo -= DT;
    if (g.deathSlow > 0) g.deathSlow -= DT;
    var sh = g.ship;
    var rockDt = dt * (g.fx.slow > 0 ? SLOWFX_SCALE : 1);

    // ---- vaisseau
    if (!sh.gone) {
      if (input.left) sh.angle -= ROT * dt;
      if (input.right) sh.angle += ROT * dt;
      if (input.thrust) {
        sh.vx += Math.cos(sh.angle) * THRUST * dt;
        sh.vy += Math.sin(sh.angle) * THRUST * dt;
      }
      if (input.dash && sh.dashCd <= 0) {
        sh.vx += Math.cos(sh.angle) * DASH_SPEED;
        sh.vy += Math.sin(sh.angle) * DASH_SPEED;
        sh.dashCd = DASH_CD;
        sh.invuln = Math.max(sh.invuln, DASH_INV);
        g.events.push({ type: 'dash' });
      }
      sh.dashCd = Math.max(0, sh.dashCd - DT);
      sh.invuln = Math.max(0, sh.invuln - DT);
      sh.fireCd = Math.max(0, sh.fireCd - DT);
      if (input.fire && sh.fireCd <= 0) {
        sh.fireCd = FIRE_CD;
        var spread = g.fx.triple > 0 ? [-0.16, 0, 0.16] : [0];
        spread.forEach(function (off) {
          g.bullets.push({
            x: sh.x + Math.cos(sh.angle) * 18, y: sh.y + Math.sin(sh.angle) * 18,
            vx: sh.vx + Math.cos(sh.angle + off) * BULLET_SPEED,
            vy: sh.vy + Math.sin(sh.angle + off) * BULLET_SPEED,
            life: BULLET_LIFE
          });
        });
        g.events.push({ type: 'shoot', triple: spread.length === 3 });
      }
      sh.vx *= DAMP; sh.vy *= DAMP;
      sh.x = wrap(sh.x + sh.vx * dt, W);
      sh.y = wrap(sh.y + sh.vy * dt, H);
    }

    // ---- projectiles
    for (var b = g.bullets.length - 1; b >= 0; b--) {
      var bu = g.bullets[b];
      bu.life -= dt;
      bu.x = wrap(bu.x + bu.vx * dt, W);
      bu.y = wrap(bu.y + bu.vy * dt, H);
      if (bu.life <= 0) g.bullets.splice(b, 1);
    }
    for (var e = g.ebullets.length - 1; e >= 0; e--) {
      var eb = g.ebullets[e];
      eb.life -= dt;
      eb.x = wrap(eb.x + eb.vx * rockDt, W);
      eb.y = wrap(eb.y + eb.vy * rockDt, H);
      if (eb.life <= 0) g.ebullets.splice(e, 1);
    }

    // ---- astéroïdes (ralentis par le power-up slow)
    for (var r = 0; r < g.rocks.length; r++) {
      var rk = g.rocks[r];
      rk.x = wrap(rk.x + rk.vx * rockDt, W);
      rk.y = wrap(rk.y + rk.vy * rockDt, H);
      rk.ang += rk.angV * rockDt;
      rk.age += dt;
    }

    // ---- drones (ralentis par slow)
    for (var d = 0; d < g.drones.length; d++) {
      var dr = g.drones[d];
      dr.phase += dt * 2.2;
      dr.x += dr.vx * rockDt;
      dr.y = wrap(dr.y + Math.sin(dr.phase) * 60 * rockDt, H);
      dr.fireT -= dt;
      if (dr.fireT <= 0 && !sh.gone) {
        dr.fireT = dr.big ? 1.7 : 1.1;
        var aim = Math.atan2(sh.y - dr.y, sh.x - dr.x);
        aim += (rng(g) - 0.5) * (dr.big ? 0.7 : 0.24);
        g.ebullets.push({ x: dr.x, y: dr.y, vx: Math.cos(aim) * 300, vy: Math.sin(aim) * 300, life: 3.0 });
        g.events.push({ type: 'droneShoot' });
      }
    }
    // drones sortis de l'écran (marge large)
    for (var d2 = g.drones.length - 1; d2 >= 0; d2--)
      if (g.drones[d2].x < -80 || g.drones[d2].x > W + 80) g.drones.splice(d2, 1);

    // ---- drones : apparition
    g.droneT -= dt;
    if (g.droneT <= 0 && g.wave >= 2 && g.drones.length < 2 && g.waveBreak <= 0) {
      spawnDrone(g);
      g.droneT = 11 + rng(g) * 5;
      g.events.push({ type: 'droneIn' });
    }

    // ---- collisions projectiles joueur → astéroïdes
    for (var b2 = g.bullets.length - 1; b2 >= 0; b2--) {
      var bu2 = g.bullets[b2];
      for (var r2 = g.rocks.length - 1; r2 >= 0; r2--) {
        var rk2 = g.rocks[r2];
        if (dist2(bu2.x, bu2.y, rk2.x, rk2.y) < rk2.r * rk2.r) {
          g.bullets.splice(b2, 1);
          rk2.hp--;
          if (rk2.hp <= 0) {
            g.rocks.splice(r2, 1);
            fragment(g, rk2);
            killCombo(g);
            addScore(g, ROCK_SCORE[rk2.size]);
            if (rk2.size >= 3) g.hitStop = 3;
            maybeDrop(g, 'rock', rk2.size, rk2.x, rk2.y);
            g.events.push({ type: 'boom', x: rk2.x, y: rk2.y, size: rk2.size, score: ROCK_SCORE[rk2.size] * Math.max(1, g.combo) });
          } else {
            g.events.push({ type: 'clink', x: rk2.x, y: rk2.y });
          }
          break;
        }
      }
    }

    // ---- projectiles joueur → drones
    for (var b3 = g.bullets.length - 1; b3 >= 0; b3--) {
      var bu3 = g.bullets[b3];
      for (var d3 = g.drones.length - 1; d3 >= 0; d3--) {
        var dr3 = g.drones[d3];
        var rr = dr3.big ? 26 : 18;
        if (dist2(bu3.x, bu3.y, dr3.x, dr3.y) < rr * rr) {
          g.bullets.splice(b3, 1);
          dr3.hp--;
          if (dr3.hp <= 0) {
            g.drones.splice(d3, 1);
            killCombo(g);
            addScore(g, DRONE_SCORE[dr3.big ? 'big' : 'small']);
            g.hitStop = 3;
            maybeDrop(g, 'drone', dr3.big ? 'big' : 'small', dr3.x, dr3.y);
            g.events.push({ type: 'droneDown', x: dr3.x, y: dr3.y, big: dr3.big });
          }
          break;
        }
      }
    }

    // ---- power-ups : dérive, expiration, ramassage
    for (var p = g.powerUps.length - 1; p >= 0; p--) {
      var pu = g.powerUps[p];
      pu.life -= dt;
      pu.age += dt;
      pu.x = wrap(pu.x + pu.vx * dt, W);
      pu.y = wrap(pu.y + pu.vy * dt, H);
      if (pu.life <= 0) { g.powerUps.splice(p, 1); continue; }
      if (!sh.gone && dist2(sh.x, sh.y, pu.x, pu.y) < (PU_R + 16) * (PU_R + 16)) {
        g.powerUps.splice(p, 1);
        if (pu.type === 'triple') g.fx.triple = TRIPLE_T;
        else if (pu.type === 'shield') g.shield = true;
        else if (pu.type === 'slow') g.fx.slow = SLOWFX_T;
        else if (pu.type === 'life') sh.lives++;
        g.events.push({ type: 'pickup', x: pu.x, y: pu.y, kind: pu.type });
      }
    }
    g.fx.triple = Math.max(0, g.fx.triple - DT);
    g.fx.slow = Math.max(0, g.fx.slow - DT);

    // ---- vaisseau ← astéroïdes
    if (!sh.gone && sh.invuln <= 0) {
      for (var r3 = 0; r3 < g.rocks.length; r3++) {
        var rk3 = g.rocks[r3];
        var reach = rk3.r + 12;
        if (dist2(sh.x, sh.y, rk3.x, rk3.y) < reach * reach) {
          g.rocks.splice(r3, 1);
          fragment(g, rk3);
          applyHit(g, rk3.x, rk3.y);
          break;
        }
      }
      // vaisseau ← drones / tirs ennemis
      for (var d4 = 0; d4 < g.drones.length && !sh.gone && !g.over; d4++) {
        var dr4 = g.drones[d4];
        var rr4 = dr4.big ? 30 : 22;
        if (dist2(sh.x, sh.y, dr4.x, dr4.y) < rr4 * rr4) {
          g.drones.splice(d4, 1);
          applyHit(g, dr4.x, dr4.y);
        }
      }
      for (var e2 = 0; e2 < g.ebullets.length && !sh.gone && !g.over; e2++) {
        var eb2 = g.ebullets[e2];
        if (dist2(sh.x, sh.y, eb2.x, eb2.y) < 14 * 14) {
          g.ebullets.splice(e2, 1);
          applyHit(g, eb2.x, eb2.y);
        }
      }
    }

    // respawn différé
    if (sh.gone && !g.over) {
      g.respawnT -= DT;
      if (g.respawnT <= 0) respawnShip(g);
    }

    // ---- combo : fenêtre
    if (g.comboT > 0) {
      g.comboT -= dt;
      if (g.comboT <= 0) g.combo = 0;
    }

    // ---- fin de vague
    if (g.rocks.length === 0 && g.drones.length === 0 && g.waveBreak <= 0 && !g.over) {
      g.waveBreak = 2.0;
    }
    if (g.waveBreak > 0) {
      g.waveBreak -= DT;
      if (g.waveBreak <= 0 && g.rocks.length === 0 && g.drones.length === 0) {
        spawnWave(g, g.wave + 1);
      }
    }

    return g.events;
  }

  return { W: W, H: H, DT: DT, createGame: createGame, step: step,
           wrap: wrap, dist2: dist2, ROCK_R: ROCK_R, spawnWave: spawnWave,
           makeRock: makeRock, respawnShip: respawnShip, COMBO_MAX: COMBO_MAX };
});
