/*
 * Astre — rendu canvas « rétro 50s » : crème, tomate, menthe, encre.
 * Décor cosmétique uniquement : le gameplay vit dans engine.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.AstreRender = factory(root);
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  var COL = {
    cream: '#f3e9d2', creamDeep: '#e7d9b8', ink: '#2d2a26',
    tomato: '#d94f2b', tomatoDeep: '#b03a1e', mint: '#7fc8a9',
    beige: '#d9c9a8', chrome: '#f7f4ea', shadow: 'rgba(45,42,38,0.22)'
  };

  function create(canvas) {
    var ctx = canvas.getContext('2d');
    var stars = [], grain = null;
    for (var i = 0; i < 90; i++)
      stars.push({ x: Math.random(), y: Math.random(), s: Math.random() < 0.25 ? 2.4 : 1.4 });

    var particles = [];
    var shake = 0;
    var waveBanner = null;   // {text, t}
    var scaleX = 1, scaleY = 1, offX = 0, offY = 0;

    function resize(cssW, cssH) {
      var dpr = Math.min(root.devicePixelRatio || 1, 2);
      canvas.width = cssW * dpr; canvas.height = cssH * dpr;
      canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // letterbox du monde 800×600
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

    function addParticles(x, y, n, color, speed) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2;
        var m = (0.3 + Math.random() * 0.7) * speed;
        particles.push({ x: x, y: y, vx: Math.cos(a) * m, vy: Math.sin(a) * m,
                         life: 0.4 + Math.random() * 0.5, t: 0, color: color, r: 1.5 + Math.random() * 2.5 });
      }
    }

    function banner(text) { waveBanner = { text: text, t: 0 }; }

    function onEvent(ev, t) {
      if (ev.type === 'boom') {
        addParticles(ev.x, ev.y, 8 + ev.size * 4, ev.size >= 3 ? COL.tomato : COL.mint, 120);
        if (ev.size >= 3) shake = Math.min(10, shake + (ev.size === 4 ? 10 : 5));
      } else if (ev.type === 'shipHit') {
        addParticles(ev.x, ev.y, 20, COL.tomato, 160);
        shake = 12;
      } else if (ev.type === 'droneDown') {
        addParticles(ev.x, ev.y, 16, COL.mint, 150);
        shake = Math.min(9, shake + 5);
      } else if (ev.type === 'wave') {
        banner(t('wave') + ' ' + ev.wave);
      }
    }

    function t(key) { return (root.AstreI18n && root.AstreI18n.get(root.__astreLang || 'en', key)) || key; }

    function drawShip(g) {
      var sh = g.ship;
      if (sh.gone) return;
      // clignote pendant l'invulnérabilité
      if (sh.invuln > 0 && Math.floor(sh.invuln * 12) % 2 === 0) return;
      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.angle + Math.PI / 2);
      // flamme
      if (g.__thrusting) {
        ctx.fillStyle = COL.tomato;
        ctx.beginPath();
        ctx.moveTo(-4, 12); ctx.lineTo(4, 12); ctx.lineTo(0, 20 + Math.random() * 6);
        ctx.closePath(); ctx.fill();
      }
      // coque chrome
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = COL.ink;
      ctx.fillStyle = COL.chrome;
      ctx.beginPath();
      ctx.moveTo(0, -16); ctx.lineTo(11, 10); ctx.lineTo(5, 7);
      ctx.lineTo(0, 12); ctx.lineTo(-5, 7); ctx.lineTo(-11, 10);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // hublot
      ctx.fillStyle = COL.tomato;
      ctx.beginPath(); ctx.arc(0, -4, 3.2, 0, Math.PI * 2); ctx.fill();
      // recharge dash : arc autour
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
      // cratères (deterministes par indice)
      ctx.fillStyle = 'rgba(45,42,38,0.18)';
      for (var c = 0; c < Math.min(3, rk.size); c++) {
        var ca = (c * 2.4 + rk.r) % (Math.PI * 2);
        var cd = rk.r * 0.36;
        ctx.beginPath();
        ctx.arc(Math.cos(ca) * cd, Math.sin(ca) * cd, rk.r * 0.16 + 1, 0, Math.PI * 2);
        ctx.fill();
      }
      if (rk.size === 4) {
        // cœur du boss : compte de PV restant
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

    function drawDrone(dr) {
      ctx.save();
      ctx.translate(dr.x, dr.y);
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

    function draw(g, dtReal, labels) {
      var cssW = canvas.width / (Math.min(root.devicePixelRatio || 1, 2));
      var cssH = canvas.height / (Math.min(root.devicePixelRatio || 1, 2));
      ctx.save();
      // fond + grain + étoiles
      ctx.fillStyle = COL.cream;
      ctx.fillRect(0, 0, cssW, cssH);
      if (grain) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(grain, 0, 0, cssW, cssH);
        ctx.imageSmoothingEnabled = true;
      }
      ctx.fillStyle = COL.creamDeep;
      for (var s = 0; s < stars.length; s++) {
        var sx = stars[s].x * cssW, sy = stars[s].y * cssH;
        ctx.fillRect(sx, sy, stars[s].s, stars[s].s);
        if (stars[s].s > 2) {
          ctx.fillRect(sx - 2.4, sy + 0.5, 2.4, 1);
          ctx.fillRect(sx + stars[s].s + 0.2, sy + 0.5, 2.4, 1);
        }
      }
      // ralenti : vignette tomate légère
      if (g.slowmo > 0) {
        ctx.fillStyle = 'rgba(217,79,43,' + (0.10 * Math.min(1, g.slowmo / 0.45)) + ')';
        ctx.fillRect(0, 0, cssW, cssH);
      }

      // monde (letterbox + secousse)
      var shx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      var shy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      if (shake > 0) shake = Math.max(0, shake - dtReal * 34);
      ctx.translate(offX + shx, offY + shy);
      ctx.scale(scaleX, scaleY);
      ctx.strokeStyle = COL.ink;
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, 800, 600);

      g.rocks.forEach(drawRock);
      g.drones.forEach(drawDrone);
      // projectiles
      ctx.strokeStyle = COL.ink;
      ctx.lineWidth = 2.6;
      g.bullets.forEach(function (b) {
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
        ctx.stroke();
      });
      ctx.fillStyle = COL.tomato;
      g.ebullets.forEach(function (b) {
        ctx.beginPath(); ctx.arc(b.x, b.y, 3.4, 0, Math.PI * 2); ctx.fill();
      });
      drawShip(g);

      // particules
      for (var p = particles.length - 1; p >= 0; p--) {
        var pt = particles[p];
        pt.t += dtReal;
        if (pt.t >= pt.life) { particles.splice(p, 1); continue; }
        pt.x += pt.vx * dtReal; pt.y += pt.vy * dtReal;
        pt.vx *= 0.96; pt.vy *= 0.96;
        var alpha = 1 - pt.t / pt.life;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * alpha + 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // HUD in-canvas
      ctx.fillStyle = COL.ink;
      ctx.font = 'bold 26px Georgia';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(String(g.score).padStart(6, '0'), 14, 12);
      ctx.font = '13px Georgia';
      ctx.fillText(labels.wave + ' ' + g.wave, 14, 44);
      // vies : petites fusées
      for (var l = 0; l < Math.max(0, g.ship.lives); l++) {
        ctx.save();
        ctx.translate(760 - l * 24, 26);
        ctx.rotate(0);
        ctx.fillStyle = COL.tomato;
        ctx.beginPath();
        ctx.moveTo(0, -8); ctx.lineTo(6, 7); ctx.lineTo(0, 4); ctx.lineTo(-6, 7);
        ctx.closePath(); ctx.fill();
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
        ctx.roundRect ? ctx.roundRect(-wid / 2, -22, wid, 44, 10) : ctx.rect(-wid / 2, -22, wid, 44);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = COL.cream;
        ctx.fillText(txt, 0, 1);
        ctx.restore();
      }
      // bannière de vague
      if (waveBanner) {
        waveBanner.t += dtReal;
        var alpha = waveBanner.t < 0.3 ? waveBanner.t / 0.3 : Math.max(0, 1 - (waveBanner.t - 1.2) / 0.5);
        if (alpha <= 0) waveBanner = null;
        else {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = COL.ink;
          ctx.font = 'bold 54px Georgia';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.save();
          ctx.translate(400, 260); ctx.rotate(-0.04);
          ctx.fillStyle = COL.tomato;
          ctx.strokeStyle = COL.ink; ctx.lineWidth = 3;
          var w2 = ctx.measureText(waveBanner.text).width + 40;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(-w2 / 2, -40, w2, 80, 14) : ctx.rect(-w2 / 2, -40, w2, 80);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = COL.cream;
          ctx.fillText(waveBanner.text, 0, 2);
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    }

    return { resize: resize, draw: draw, onEvent: onEvent, banner: banner };
  }

  return { create: create, COL: COL };
});
