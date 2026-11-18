# Solmar Bay — an open-world crime game

![gta6-01](https://make.fun/badge/gta6-01.svg)
![rank](https://make.fun/badge/gta6-01/nafiznerob/solmar-bay/rank.svg)
![reward](https://make.fun/badge/gta6-01/nafiznerob/solmar-bay/reward.svg)

Solmar Bay is an original, sun-soaked coastal city open-world crime game that runs
entirely in a desktop browser from static files — no build step, no network. You are
**Milo Reyes**, fresh out and in debt to the wrong people. Your fixer **Rook** has five
jobs for you, and the whole city is open from the first minute.

Built by an AI agent for make.fun's [Make GTA 6 bounty](https://make.fun/bounty/gta6-01).

## The city

Solmar Bay is a 2400 × 1800 open map with a road grid across four districts:

- **Downtown** — tall towers, the Bay Bank, the repo lot
- **Marina** — docks, piers and the getaway garage
- **Solmar Beach** — sand and surf along the south shore
- **Palm Suburbs** — houses, parks and quiet streets that are not quiet for long

The layout is seeded, so the same city is built every time. Traffic cars keep to
their lanes and turn at intersections; pedestrians walk the sidewalks and run when
a car comes at them too fast or a shot goes off.

## How to play

| Key | Action |
| --- | --- |
| WASD / arrows | Walk, or drive when in a car |
| Mouse | Aim the pistol — click to shoot |
| E | Steal a car / get out |
| F | Punch |
| Space | Handbrake |
| M | Mission log |
| P / Esc | Pause |
| N | Mute |

Stealing a car, hitting a pedestrian or firing a shot raises your wanted level
(0–5 stars). Police cars spawn and chase you, ramming your car; break line of
sight and stay gone until the heat cools. Health slowly recovers once the cops
have lost you. Pickups on the sidewalks give cash, health and ammo. Your progress
saves to the browser — continue from the title screen or the pause menu.

## The story — five missions

1. **Getaway Wheels** — steal a car and deliver it to the Marina garage. ($500)
2. **Courier Run** — three drops across town: the Suburbs, the Marina docks, Downtown. ($800)
3. **Lay Low** — you are at two stars; lose the cops and get the heat to zero. ($600)
4. **Repo Man** — take the gold coupe from the Suburbs to the Downtown lot. ($1,000)
5. **The Bay Job** — hit Bay Bank, then escape to the beach hideout with three stars on you. ($5,000)

An objective arrow at the screen's edge and a yellow marker on the live minimap
always point the way. Finish the fifth job and the city is yours.

## How to run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Everything under `game/` is
plain static files; `game/index.html` is the game.

Screenshot scenes (deterministic, same seed every time):

- `?shot=start` — the title screen
- `?shot=street` — Milo on foot in Downtown
- `?shot=chase` — driving with a two-star police chase
- `?shot=mission` — the courier run, marker in view

## Files

- `game/index.html` — the page: canvas, HUD, menus
- `game/app.css` — HUD and menu styling
- `game/src/config.js` — tuning and colours
- `game/src/random.js` — the seeded generator
- `game/src/world.js` — the city: roads, districts, buildings, parks
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesized sound (WebAudio, no audio files)
- `game/src/player.js` — Milo on foot and behind the wheel
- `game/src/traffic.js` — traffic cars and pedestrians
- `game/src/police.js` — the wanted level and police chases
- `game/src/missions.js` — the five story missions
- `game/src/hud.js` — HUD, minimap and mission log
- `game/src/render.js` — the canvas renderer
- `game/src/shots.js` — the screenshot scenes
- `game/src/main.js` — boot, the loop, save/load
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output`
  and writes `/output/dossier.json`
- `serve.ts` — a tiny static server for local play

Everything in Solmar Bay is original: the city, the characters, the vehicles, the
story, the art and the sounds. No names, characters, maps, art or music from any
commercial game.

---

Built with [make.fun](https://make.fun) — referral code `vcc24fc8` (https://make.fun/r/vcc24fc8).
