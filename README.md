# Astre

*Asteroids, back from 1979 — on a warm cream sky.*

An inertial rocket, rocks that split three ways, a field that wraps at every
edge. **Modern touches**: a **dash** you can trust (a quick burst along your
nose with a heartbeat of immunity — it replaces the old risky hyperspace),
**combo chains** up to ×8 with a slow-motion beat at the top, **hunting
drones** from wave 2, and a **mega-rock** to crack every fourth wave. Extra
life every 10 000 points.

## How to play

- **Arrow keys or WASD/ZQSD** steer; **Space** fires; **Shift** dashes;
  **P** pauses. **Space/Enter** restarts instantly after a game over.
- **Round badges drop from wrecks**: triple fire (three chevrons), a
  one-hit shield (target ring), slow rocks (hourglass) and a rare golden
  star (extra life). They fade — grab them fast.
- **On touch**: a left stick steers the rocket (push far to thrust), **FIRE**
  and **DASH** buttons on the right.
- The rocket keeps drifting — short bursts, calm hands. The sky wraps around
  at every edge.
- Big rocks split into mediums, mediums into smalls. Chain kills within two
  seconds to raise the combo.

Interface in **English** (default), **French** and **Spanish**.

## Run locally

Everything is static and self-contained (no network). `index.html` is the
published autonomous bundle required by LOB7 (all styles and scripts inlined);
it is **generated** from `index.src.html` + `assets/*` — never edit it by
hand. The build, the tests and the cover generator live in the Z Code
workshop.

```bash
python -m http.server 8143       # then open http://localhost:8143/
```

## Design notes

- The rules engine (`assets/engine.js`) is **pure and deterministic**: fixed
  1/60 steps, a seeded RNG, a wrap-around field, inertial flight, splitting
  rocks, drones that lead their shots, combos with a two-second window, a
  twelve-hit mega-rock. The renderer (`assets/render.js`) is cosmetic only.
- 24 Node tests cover inertia, wrapping, exact fragmentation, scoring with
  combo multipliers, ship hits with invulnerability, game over, wave
  progression, the mega-rock, the dash, extra lives, drone behaviour, safe
  spawns, the slow-motion beat, full replayability, and the v1.1.0 power-up
  system (drops, pickups, timed effects, shield absorption, hit-stop).
- v1.1.0 rendering interpolates between fixed steps (smooth 60 fps), adds
  hit-stop on big impacts, pop-fragmentation, floating scores, combo
  stickers, an animated retro sun, engine trail and power-up badges — with a
  hard particle cap so effects never hide the gameplay.
- Palette: **retro 1950s / atomic age** — cream sky, tomato and mint rocks by
  size, chrome rocket, sticker typography. A deliberate fourth step of the
  workshop's visual rotation, and the exact opposite of the original game's
  black vectors.

## Credits & license

A game by Cédric Bernadac, created with AI agents (ZCode & Kimi K3.1 Pro).
Code under the [MIT license](LICENSE). Produced automatically with Z Code in
the Z Code game workshop; see `LOB7-ATTRIBUTION.json` for contributions.
