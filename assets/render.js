/*
 * Astre — rendu canvas « rétro 50s » : crème, tomate, menthe, moutarde, or.
 * Décor cosmétique uniquement : le gameplay vit dans engine.js.
 * v1.1.0 : interpolation, badges power-ups, points flottants, stickers combo,
 * trail du réacteur, soleil + étoiles colorées, flash bref, score animé,
 * plafond de particules (le juice ne cache jamais le gameplay).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.AstreRender = factory(root);
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  var COL = {
    cream: '#f3e9d2', creamDeep: '#e7d9b8', ink: '#2d2a26',
    tomato: '#d94f2b', tomatoDeep: '#b03a1e', mint: '#7fc8a9',
    beige: '#d9c9a8', chrome: '#f7f4ea', mustard: '#e3b341',
    gold: '#d9a441', shadow: 'rgba(45,42,38,0.22)'
  };
  var MAX_PARTICLES = 120;

  function create(canvas) {
    var ctx = canvas.getContext('2d');
    var stars = [], grain = null;
    for (var i = 0; i < 90; i++)
      stars.push({
        x: Math.random(), y: Math.random(),
        s: Math.random() < 0.25 ? 2.4 : 1.4,
        colored: Math.random() < 0.12,
        col: Math.random() < 0.5 ? COL.tomato : COL.mint,
        phase: Math.random() * Math.PI * 2
      });

    var particles = [];
    var floats = [];            // points flottants '+N'
    var stickers = [];          // {text, t, color}
    var trail = [];             // positions du vaisseau
    var shake = 0, flash = 0, flashCol = COL.cream;
    var waveBanner = null;
    var scoreShown = 0, scorePop = 0;
    var scaleX = 1, scaleY = 1, offX = 0, offY = 0;
    var clock = 0;

    function resize(cssW, cssH) {
      var dpr = Math.min(root.devicePixelRatio || 1, 2);
      canvas.width = cssW * dpr; canvas.height = cssH * dpr;
      canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var margin = 8;
      var s = Math.min((cssW - margin) / 800, (cssH - margin) / 600);
      scaleX = s; scaleY = s;
      offX = (cssW - 800 * s) / 2;
      offY = (cssH - 600 * s) / 2;
      buildGrain(cssW, cssH);
    }

    function buildGrain(w, h) {
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.floor(w / 3));
      c.height = Math.max(1, Math.floor(h / 3));
      var g = c.getContext('2d');
      g.fillStyle = COL.cream; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = 'rgba(45,42,38,0.05)';
      for (var i = 0; i < c.width * c.height / 34; i++)
        g.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 1);
      grain = c;
    }

    function addParticles(x, y, n, colors, speed) {
      for (var i = 0; i < n; i++) {
        if (particles.length >= MAX_PARTICLES) return; // le juice ne cache pas le jeu
        var a = Math.random() * Math.PI * 2;
        var m = (0.3 + Math.random() * 0.7) * speed;
        particles.push({ x: x, y: y, vx: Math.cos(a) * m, vy: Math.sin(a) * m,
                         life: 0.4 + Math.random() * 0.5, t: 0,
                         color: colors[Math.floor(Math.random() * colors.length)],
                         r: 1.5 + Math.random() * 2.5 });
      }
    }

    function banner(text) { waveBanner = { text: text, t: 0 }; }

    function onEvent(ev, t) {
      if (ev.type === 'boom') {
        addParticles(ev.x, ev.y, 8 + ev.size * 4,
          ev.size >= 3 ? [COL.tomato, COL.mustard, COL.ink] : [COL.mint, COL.tomato, COL.ink],
          ev.size >= 3 ? 150 : 110);
        floats.push({ x: ev.x, y: ev.y - 10, txt: '+' + ev.score, t: 0, color: COL.ink });
        if (ev.size >= 3) shake = Math.min(12, shake + (ev.size === 4 ? 12 : 6));
      } else if (ev.type === 'shipHit') {
        addParticles(ev.x, ev.y, 22, [COL.tomato, COL.ink, COL.mustard], 180);
        shake = 14; flash = 0.09; flashCol = COL.tomato;
      } else if (ev.type === 'shieldHit') {
        addParticles(ev.x, ev.y, 14, [COL.mint, COL.cream], 140);
        shake = 7; flash = 0.07; flashCol = COL.mint;
      } else if (ev.type === 'droneDown') {
        addParticles(ev.x, ev.y, 16, [COL.mint, COL.ink, COL.mustard], 160);
        shake = Math.min(10, shake + 6);
      } else if (ev.type === 'pickup') {
        addParticles(ev.x, ev.y, 16, [COL.mustard, COL.tomato, COL.mint, COL.cream], 120);
        flash = 0.05; flashCol = COL.cream;
      } else if (ev.type === 'comboUp' && (ev.combo === 4 || ev.combo === 6)) {
        stickers.push({ txt: t('hot'), t: 0, color: COL.tomato });
      } else if (ev.type === 'comboMax') {
        stickers.push({ txt: t('blaze'), t: 0, color: COL.tomato });
        flash = 0.07; flashCol = COL.cream;
      } else if (ev.type === 'wave') {
        banner(t('wave') + ' ' + ev.wave);
      }
    }

    function t(key) { return (root.AstreI18n && root.AstreI18n.get(root.__astreLang || 'en', key)) || key; }

    // easing back-out (pop)
    function backOut(p) {
      var c = 1.70158;
      p = p - 1;
      return 1 + (c + 1) * p * p * p + c * p * p;
    }

    // interpolation prev → cur (alpha = fraction de pas accumulée)
    function lerpPos(cur, prev, alpha) {
      if (prev === null || prev === undefined || !alpha) return cur;
      return prev + (cur - prev) * alpha;
    }

    function drawShip(g, prev, alpha) {
      var sh = g.ship;
      if (sh.gone) return;
      if (sh.invuln > 0 && sh.invuln > 0.35 && Math.floor(sh.invuln * 12) % 2 === 0) return;
      var x = lerpPos(sh.x, prev && prev.ship ? prev.ship.x : null, alpha);
      var y = lerpPos(sh.y, prev && prev.ship ? prev.ship.y : null, alpha);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(sh.angle + Math.PI / 2);
      if (g.__thrusting) {
        ctx.fillStyle = COL.tomato;
        ctx.beginPath();
        ctx.moveTo(-5, 12); ctx.lineTo(5, 12);
        ctx.lineTo(0, 22 + Math.random() * 7);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = COL.mustard;
        ctx.beginPath();
        ctx.moveTo(-3, 12); ctx.lineTo(3, 12);
        ctx.lineTo(0, 17 + Math.random() * 4);
        ctx.closePath(); ctx.fill();
      }
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = COL.ink;
      ctx.fillStyle = COL.chrome;
      ctx.beginPath();
      ctx.moveTo(0, -16); ctx.lineTo(11, 10); ctx.lineTo(5, 7);
      ctx.lineTo(0, 12); ctx.lineTo(-5, 7); ctx.lineTo(-11, 10);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = COL.tomato;
      ctx.beginPath(); ctx.arc(0, -4, 3.2, 0, Math.PI * 2); ctx.fill();
      if (g.shield) {
        ctx.strokeStyle = COL.mint;
        ctx.lineWidth = 3.5;
        ctx.globalAlpha = 0.65 + 0.3 * Math.sin(clock * 6);
        ctx.beginPath();
        ctx.arc(0, 0, 27 + Math.sin(clock * 6) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (sh.dashCd > 0) {
        ctx.strokeStyle = 'rgba(127,200,169,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + (1 - sh.dashCd / 2.5) * Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = COL.mint; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    function drawRock(rk) {
      ctx.save();
      ctx.translate(rk.x, rk.y);
      ctx.rotate(rk.ang);
      var pop = rk.age < 0.15 ? backOut(Math.max(0, rk.age) / 0.15) : 1;
      var pp = Math.max(0.05, pop);
      ctx.scale(pp, pp);
      var fill = rk.size === 4 ? COL.tomatoDeep : rk.size === 3 ? COL.beige : rk.size === 2 ? COL.tomato : COL.mint;
      ctx.fillStyle = fill;
      ctx.strokeStyle = COL.ink;
      ctx.lineWidth = rk.size >= 3 ? 3 : 2.6;
      ctx.beginPath();
      var n = rk.shape.length;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2;
        var rr = rk.r * rk.shape[i];
        var x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(45,42,38,0.18)';
      for (var c = 0; c < Math.min(3, rk.size); c++) {
        var ca = (c * 2.4 + rk.r) % (Math.PI * 2);
        var cd = rk.r * 0.36;
        ctx.beginPath();
        ctx.arc(Math.cos(ca) * cd, Math.sin(ca) * cd, rk.r * 0.16 + 1, 0, Math.PI * 2);
        ctx.fill();
      }
      if (rk.size === 4) {
        ctx.fillStyle = COL.cream;
        ctx.beginPath(); ctx.arc(0, 0, rk.r * 0.42, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = COL.ink; ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = COL.ink;
        ctx.font = 'bold ' + Math.round(rk.r * 0.4) + 'px Georgia';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(rk.hp), 0, 1);
      }
      ctx.restore();
    }

    function drawDrone(dr, px, py, alpha) {
      var x = lerpPos(dr.x, px, alpha), y = lerpPos(dr.y, py, alpha);
      ctx.save();
      ctx.translate(x, y);
      var w = dr.big ? 26 : 18;
      ctx.fillStyle = COL.mint;
      ctx.strokeStyle = COL.ink;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, w, w * 0.42, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -w * 0.25, w * 0.5, w * 0.32, 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = COL.chrome; ctx.fill(); ctx.stroke();
      ctx.fillStyle = COL.tomato;
      ctx.beginPath(); ctx.arc(0, 0, w * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // badge power-up « Googie » : silhouette d'abord, couleur ensuite
    function drawPowerUp(pu, px, py, alpha) {
      var x = lerpPos(pu.x, px, alpha);
      var y = lerpPos(pu.y, py, alpha) + Math.sin(clock * 3 + pu.x) * 3;
      var blink = pu.life < 2.5 && Math.floor(pu.life * 8) % 2 === 0;
      if (blink) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = COL.ink;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.lineDashOffset = -clock * 22;
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COL.cream;
      ctx.strokeStyle = COL.ink;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      var col = pu.type === 'triple' ? COL.tomato : pu.type === 'shield' ? COL.mint :
                pu.type === 'slow' ? COL.mustard : COL.gold;
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 3.2;
      if (pu.type === 'triple') {
        for (var k = -1; k <= 1; k++) {
          ctx.save(); ctx.rotate(k * 0.5);
          ctx.beginPath();
          ctx.moveTo(-2, -6); ctx.lineTo(4, 0); ctx.lineTo(-2, 6);
          ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      } else if (pu.type === 'shield') {
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, Math.PI * 2); ctx.fill();
      } else if (pu.type === 'slow') {
        ctx.beginPath();
        ctx.moveTo(-5, -7); ctx.lineTo(5, -7); ctx.lineTo(-5, 7); ctx.lineTo(5, 7);
        ctx.closePath(); ctx.stroke();
      } else { // life : étoile 4 branches or
        ctx.beginPath();
        for (var s = 0; s < 4; s++) {
          var a = s * Math.PI / 2 - Math.PI / 2;
          var a2 = a + Math.PI / 4;
          ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
          ctx.lineTo(Math.cos(a2) * 2.6, Math.sin(a2) * 2.6);
        }
        ctx.closePath(); ctx.fill();
      }
      if (pu.age < 0.25) {
        ctx.globalAlpha = 1 - pu.age / 0.25;
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 20 + pu.age * 90, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    function draw(g, dtReal, labels, alpha, prev) {
      clock += dtReal;
      alpha = Math.min(1, Math.max(0, alpha || 0));
      var cssW = canvas.width / (Math.min(root.devicePixelRatio || 1, 2));
      var cssH = canvas.height / (Math.min(root.devicePixelRatio || 1, 2));
      ctx.save();
      ctx.fillStyle = COL.cream;
      ctx.fillRect(0, 0, cssW, cssH);
      if (grain) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(grain, 0, 0, cssW, cssH);
        ctx.imageSmoothingEnabled = true;
      }
      // soleil rétro (coin haut droit)
      var sunX = cssW - 90, sunY = 84;
      ctx.strokeStyle = 'rgba(217,79,43,0.35)';
      ctx.lineWidth = 3;
      for (var ray = 0; ray < 12; ray++) {
        var ra = ray * Math.PI / 6 + clock * 0.08;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(ra) * 56, sunY + Math.sin(ra) * 56);
        ctx.lineTo(sunX + Math.cos(ra) * 72, sunY + Math.sin(ra) * 72);
        ctx.stroke();
      }
      ctx.fillStyle = '#eebf8f';
      ctx.beginPath(); ctx.arc(sunX, sunY, 44, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(176,58,30,0.5)'; ctx.lineWidth = 2.5;
      ctx.stroke();
      // étoiles (certaines colorées, scintillantes)
      for (var s = 0; s < stars.length; s++) {
        var st = stars[s];
        var tw = 0.75 + 0.25 * Math.sin(clock * 2.2 + st.phase);
        ctx.globalAlpha = tw;
        ctx.fillStyle = st.colored ? st.col : COL.creamDeep;
        var sx = st.x * cssW, sy = st.y * cssH;
        ctx.fillRect(sx, sy, st.s, st.s);
        if (st.s > 2) {
          ctx.fillRect(sx - 2.4, sy + 0.5, 2.4, 1);
          ctx.fillRect(sx + st.s + 0.2, sy + 0.5, 2.4, 1);
        }
        ctx.globalAlpha = 1;
      }
      if (g.slowmo > 0 || g.deathSlow > 0) {
        ctx.fillStyle = 'rgba(217,79,43,' + (0.10 * Math.min(1, (g.slowmo + g.deathSlow) / 0.45)) + ')';
        ctx.fillRect(0, 0, cssW, cssH);
      }

      // monde (letterbox + secousse + micro-rotation)
      var shx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      var shy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      var rot = shake > 0 ? (Math.random() - 0.5) * shake * 0.004 : 0;
      if (shake > 0) shake = Math.max(0, shake - dtReal * 34);
      ctx.translate(offX + shx, offY + shy);
      ctx.rotate(rot);
      ctx.scale(scaleX, scaleY);
      ctx.strokeStyle = COL.ink;
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, 800, 600);
      // anneaux planétaires décoratifs
      ctx.strokeStyle = 'rgba(107,152,177,0.16)';
      ctx.lineWidth = 10;
      ctx.beginPath(); ctx.ellipse(150, 470, 180, 34, -0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(660, 130, 130, 22, 0.25, 0, Math.PI * 2); ctx.stroke();

      // trail du réacteur
      if (!g.ship.gone) {
        trail.push({ x: g.ship.x, y: g.ship.y });
        if (trail.length > 14) trail.shift();
      }
      for (var tr = 0; tr < trail.length; tr++) {
        var tp = trail[tr];
        var k = tr / trail.length;
        ctx.globalAlpha = 0.28 * k * (g.__thrusting ? 1 : 0.4);
        ctx.fillStyle = COL.tomato;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 2 + k * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      g.rocks.forEach(drawRock);
      for (var d = 0; d < g.drones.length; d++)
        drawDrone(g.drones[d], prev && prev.drones && prev.drones[d] ? prev.drones[d][0] : null,
                                    prev && prev.drones && prev.drones[d] ? prev.drones[d][1] : null, alpha);
      for (var p = 0; p < g.powerUps.length; p++)
        drawPowerUp(g.powerUps[p], prev && prev.powerUps && prev.powerUps[p] ? prev.powerUps[p][0] : null,
                                             prev && prev.powerUps && prev.powerUps[p] ? prev.powerUps[p][1] : null, alpha);
      // projectiles
      ctx.strokeStyle = COL.ink;
      ctx.lineWidth = 2.6;
      for (var b = 0; b < g.bullets.length; b++) {
        var bu = g.bullets[b];
        var bx = lerpPos(bu.x, prev && prev.bullets && prev.bullets[b] ? prev.bullets[b][0] : null, alpha);
        var by = lerpPos(bu.y, prev && prev.bullets && prev.bullets[b] ? prev.bullets[b][1] : null, alpha);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - bu.vx * 0.016, by - bu.vy * 0.016);
        ctx.stroke();
      }
      // tirs ennemis : losanges encre à cœur tomate — jamais confondus avec les rochers
      for (var e = 0; e < g.ebullets.length; e++) {
        var eb = g.ebullets[e];
        var ex = lerpPos(eb.x, prev && prev.ebullets && prev.ebullets[e] ? prev.ebullets[e][0] : null, alpha);
        var ey = lerpPos(eb.y, prev && prev.ebullets && prev.ebullets[e] ? prev.ebullets[e][1] : null, alpha);
        ctx.beginPath();
        ctx.moveTo(ex, ey - 6); ctx.lineTo(ex + 4.4, ey);
        ctx.lineTo(ex, ey + 6); ctx.lineTo(ex - 4.4, ey);
        ctx.closePath();
        ctx.fillStyle = COL.tomato; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = COL.ink; ctx.stroke();
      }
      drawShip(g, prev, alpha);

      // particules
      for (var pa = particles.length - 1; pa >= 0; pa--) {
        var pc = particles[pa];
        pc.t += dtReal;
        if (pc.t >= pc.life) { particles.splice(pa, 1); continue; }
        pc.x += pc.vx * dtReal; pc.y += pc.vy * dtReal;
        pc.vx *= 0.96; pc.vy *= 0.96;
        var pal = 1 - pc.t / pc.life;
        ctx.globalAlpha = pal;
        ctx.fillStyle = pc.color;
        ctx.beginPath(); ctx.arc(pc.x, pc.y, pc.r * pal + 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // points flottants
      ctx.font = 'bold 17px Georgia';
      for (var fl = floats.length - 1; fl >= 0; fl--) {
        var fo = floats[fl];
        fo.t += dtReal;
        if (fo.t > 0.8) { floats.splice(fl, 1); continue; }
        ctx.globalAlpha = 1 - fo.t / 0.8;
        ctx.fillStyle = fo.color;
        ctx.textAlign = 'center';
        ctx.fillText(fo.txt, fo.x, fo.y - fo.t * 34);
        ctx.globalAlpha = 1;
      }

      // HUD : score animé + pop
      if (g.score !== scoreShown) {
        if (g.score > scoreShown) scorePop = 0.18;
        scoreShown += (g.score - scoreShown) * Math.min(1, dtReal * 9);
        if (Math.abs(g.score - scoreShown) < 1) scoreShown = g.score;
      }
      scorePop = Math.max(0, scorePop - dtReal);
      var scoreScale = 1 + scorePop * 1.4;
      ctx.save();
      ctx.translate(14, 12);
      ctx.scale(scoreScale, scoreScale);
      ctx.fillStyle = COL.ink;
      ctx.font = 'bold 26px Georgia';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(String(Math.round(scoreShown)).padStart(6, '0'), 0, 0);
      ctx.restore();
      ctx.fillStyle = COL.ink;
      ctx.font = '13px Georgia';
      ctx.fillText(labels.wave + ' ' + g.wave, 14, 44);
      for (var l = 0; l < Math.max(0, g.ship.lives); l++) {
        ctx.save();
        ctx.translate(760 - l * 24, 26);
        ctx.fillStyle = COL.tomato;
        ctx.beginPath();
        ctx.moveTo(0, -8); ctx.lineTo(6, 7); ctx.lineTo(0, 4); ctx.lineTo(-6, 7);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // badges power-ups actifs (icône + jauge)
      var badges = [];
      if (g.fx.triple > 0) badges.push(['triple', g.fx.triple / 8, COL.tomato]);
      if (g.shield) badges.push(['shield', 1, COL.mint]);
      if (g.fx.slow > 0) badges.push(['slow', g.fx.slow / 4, COL.mustard]);
      for (var bi = 0; bi < badges.length; bi++) {
        ctx.save();
        ctx.translate(706, 64 + bi * 38);
        ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.6;
        ctx.fillStyle = COL.cream;
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = badges[bi][2];
        ctx.fillStyle = badges[bi][2];
        if (badges[bi][0] === 'triple') {
          ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(3, 0); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
        } else if (badges[bi][0] === 'shield') {
          ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.beginPath(); ctx.moveTo(-3.5, -5); ctx.lineTo(3.5, -5); ctx.lineTo(-3.5, 5); ctx.lineTo(3.5, 5);
          ctx.closePath(); ctx.stroke();
        }
        ctx.strokeStyle = badges[bi][2];
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 15, -Math.PI / 2, -Math.PI / 2 + badges[bi][1] * Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // combo
      if (g.combo > 1) {
        var pulse = 1 + 0.08 * Math.sin(g.t * 10);
        ctx.save();
        ctx.translate(400, 70);
        ctx.scale(pulse, pulse);
        ctx.rotate(-0.05);
        ctx.fillStyle = COL.tomato;
        ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.5;
        ctx.font = 'bold 30px Georgia';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var txt = '×' + g.combo;
        var wid = ctx.measureText(txt).width + 22;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-wid / 2, -22, wid, 44, 10);
        else ctx.rect(-wid / 2, -22, wid, 44);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = COL.cream;
        ctx.fillText(txt, 0, 1);
        ctx.restore();
      }

      // stickers (CHAUD / EN FEU)
      for (var stI = stickers.length - 1; stI >= 0; stI--) {
        var stk = stickers[stI];
        stk.t += dtReal;
        if (stk.t > 1.1) { stickers.splice(stI, 1); continue; }
        var popS = stk.t < 0.25 ? backOut(stk.t / 0.25) : 1;
        ctx.save();
        ctx.translate(400, 140 - stk.t * 26);
        ctx.rotate(-0.06);
        ctx.scale(popS, popS);
        ctx.globalAlpha = stk.t > 0.8 ? Math.max(0, 1 - (stk.t - 0.8) / 0.3) : 1;
        ctx.font = 'bold 34px Georgia';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = stk.color;
        ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.5;
        ctx.strokeText(stk.txt, 0, 0);
        ctx.fillText(stk.txt, 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // bannière de vague
      if (waveBanner) {
        waveBanner.t += dtReal;
        var alphaW = waveBanner.t < 0.3 ? waveBanner.t / 0.3 : Math.max(0, 1 - (waveBanner.t - 1.2) / 0.5);
        if (alphaW <= 0) waveBanner = null;
        else {
          ctx.globalAlpha = alphaW;
          ctx.save();
          ctx.translate(400, 260); ctx.rotate(-0.04);
          ctx.font = 'bold 54px Georgia';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          var w2 = ctx.measureText(waveBanner.text).width + 40;
          ctx.fillStyle = COL.tomato;
          ctx.strokeStyle = COL.ink; ctx.lineWidth = 3;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(-w2 / 2, -40, w2, 80, 14);
          else ctx.rect(-w2 / 2, -40, w2, 80);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = COL.cream;
          ctx.fillText(waveBanner.text, 0, 2);
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      }

      // flash bref
      if (flash > 0) {
        ctx.globalAlpha = Math.min(0.5, flash * 5);
        ctx.fillStyle = flashCol;
        ctx.fillRect(-20, -20, 840, 640);
        ctx.globalAlpha = 1;
        flash -= dtReal;
      }
      ctx.restore();
    }

    return { resize: resize, draw: draw, onEvent: onEvent, banner: banner };
  }

  return { create: create, COL: COL };
});
