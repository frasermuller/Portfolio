# Portfolio plan

A small 3D world you can spin around and click into. Each part of the portfolio lives somewhere in the scene.

## Two concepts

**Picked: Trail Map.** Golf is kept below as the backup idea.

### A: Trail Map (ski hill)

A low-poly snowy mountain styled like the hand-painted trail maps at the bottom of every chairlift. Your fonts (Architects Daughter) become the hand-lettered run labels.

- **Runs are the nav.** Each section gets a run with a real difficulty sign:
  - 🟢 About Me (the bunny hill)
  - 🟦 Projects (one blue run, each project a sign along it)
  - ⬛ Work Experience
  - ⬛⬛ The hardest thing you've built
  - 🏠 The lodge at the base is Contact
- **Load-in:** the camera rides the chairlift up to the summit, then lets go and you can orbit.
- **Click a run sign:** the camera carves down that run, and a panel springs up with the content.
- **Life in the scene:** tiny skiers looping down runs, the lift turning, snow falling, a wind sock, smoke from the lodge chimney.
- **Easter eggs:** the summit sign shows "elevation" (years coding, commits, whatever is fun). Click a skier and they wipe out.

Why I'd pick it: the difficulty symbols explain the nav without words. Camera-on-a-path is very learnable (no physics needed). It launches in ski season.

### B: Front Nine (golf)

A floating island diorama of a golf course. Each hole is a section, and a scorecard is the menu.

- Drag back and release to putt the ball toward a hole, and the camera follows it to that section.
- Flags flutter, a cart drives the paths, the clubhouse is Contact.

It's fun, but the ball needs a physics engine and an aiming UI. That's more to build and harder to make feel good on a phone.

## The stack (and why each piece)

All checked on npm, Nov 2026. Rebuilt from a fresh Vite 8 scaffold (Rolldown is built in now, and `oxlint` replaced ESLint). The old Tailwind and font setup is gone. Plain CSS with tokens in `src/index.css` is enough for a few overlay panels.

| Piece | What it does | Why this one |
|---|---|---|
| Vite 8 + React 19 | Dev server and build | Standard for a single-page 3D site. Next.js would be overkill |
| Anton + Work Sans (`@fontsource`) | Condensed capitals like resort signs and old ski posters, plus a clean text face | Self-hosted, so there are no Google Fonts requests |
| `three` 0.187 | The 3D engine | Everything on the web uses it |
| `@react-three/fiber` 9.8 | Lets you write three.js as React components | Works with React 19, which you already have |
| `@react-three/drei` 10.7 | Ready-made helpers: controls, text, model loading, `<Html>` labels in 3D | Saves weeks |
| `camera-controls` (via drei `<CameraControls>`) | Smooth orbit plus "fly the camera to here" | Better than plain OrbitControls for click-to-zoom |
| `gsap` 3.15 + `@gsap/react` | Timelines for the camera rides and intro | Fully free since Webflow bought it, all plugins included (SplitText, Flip, etc.) |
| `motion` 14.9 | Spring physics for the 2D UI: panels, buttons, hovers | This is where the snappy, bubbly feel comes from |
| `@react-three/postprocessing` (later) | Outlines, bloom, a little grain | Turns a "default three.js" look into a stylized one |
| `leva` | Live sliders to tweak values | Dev only. Learn by dragging sliders |

**Palette:** dusk on the mountain. Navy sky `#1a2039`, alpenglow pink `#f9a3c0` for the type, snow `#f4f1fa`, rock `#4b4f73`. The real trail colours (green, blue, black) only appear on the run signs.

Skipped: Theatre.js (no release since 2024; GSAP covers it). Spline (fast, but heavy and looks like every other Spline site).

## Tools to hook up

These are all built by the library authors or the community, not Claude defaults.

1. **Blender** ✅ (5.2 LTS): we model the lodge, lift towers, trees and signs here, then export them as `.glb`.
2. **Blender connector** ✅: the official Blender MCP add-on (from Blender Lab) lets me drive Blender's Python API. You approve each script it runs. To reconnect, open Blender, press N in the 3D view, and check the MCP tab.
3. **GSAP's official skills** ✅ ([greensock/gsap-skills](https://github.com/greensock/gsap-skills)): written by the GSAP team, so the animation code follows their best practices.
4. **Already set up:** Context7 (live library docs, so no outdated APIs), the Figma connector (we can sketch the UI panels there first), the built-in browser (I screenshot and check the site as we go), and `design-taste-frontend` (an anti-generic design checklist built from studying award-winning sites).
5. **Free CC0 assets** for anything we don't model ourselves: [Kenney](https://kenney.nl/assets), [Quaternius](https://quaternius.com), [Poly Pizza](https://poly.pizza), and [Poly Haven](https://polyhaven.com) for sky/lighting maps.
6. **Hosting:** Vercel (free, deploys on every push to GitHub).

## Learning resources

- [R3F docs](https://r3f.docs.pmnd.rs/), starting with "Your first scene"
- [Three.js Journey](https://threejs-journey.com/): the paid course most people in this space learned from. Worth it if you want to go deep.
- [Codrops](https://tympanus.net/codrops/): those "here's how to make this effect" tutorials with code. The 2023 camera fly-through one is close to what we're building.
- [Awwwards 3D sites](https://www.awwwards.com/websites/3d/): for taste, not to copy

## Decisions (Nov 5)

- **Mountain:** Silver Star, your home hill. Built from real public elevation data, with the heights exaggerated about 1.7x so it reads as dramatic. The real Okanagan valley cloud inversion becomes the cloud sea, and the real view east is the backdrop.
- **Look:** soft stylized. Mostly white snow with smooth blue shadows, rock only on cliffs and ridgelines, forest everywhere below the summit with white runs cut through it. Lots of tree variety, plus snow ghosts (fully rime-caked trees) up top.
- **Chairlift:** bright retro double, with red-orange chairs that pop against the snow.
- **Camera:** first person on the lift (skis at your feet, look around), third person skiing (follow your little skier down the run).
- **Ride:** rides on its own (~25s), drag to look around, hold a button or Space to fast-forward, plus Skip.
- **Clouds:** a soft, semi-see-through fluffy bank. Too dense to see through, so you ride into it and break out on top.
- **Type:** a routed-wood slab serif for signs and headings, plus a clean text face.
- **Scale:** it doesn't need to be huge. Unique shots and life matter more.

## The experience, start to finish

You go up on the lift and come down on the runs.

1. **Lift ticket (entry screen).** Your name and role on a ski ticket, doubling as the loading screen. *Board with sound* or *Board quietly*. That click also unlocks audio.
2. **The ride up, first person.** You sit on the double chair with the bar down and your skis dangling. Drag to look around, hold to fast-forward. The chair jolts at each tower. The lift runs above a run, so you look down and see skiers going under your feet. You pass the terrain park: jumps and rails where little skiers land tricks, or wipe out and ragdoll into the snow. You start under the clouds in heavy snow, ride up through the cloud bank, and come out on top into a sunset over a sea of cloud.
3. **Top station.** The bar lifts, you ski off, and the camera pulls back to third person. Your skier glides to…
4. **The wooden trail signpost.** It's snow-capped, and it *is* the menu. Hover makes a sign wiggle. Click and the snow shakes off it, then your skier heads left, right or past it toward that section. A small HTML trail-map button stays in the corner for keyboard and screen-reader users.
5. **Ski down a run** in third person, with powder spraying behind you, to where each section lives (About, Projects, Experience, Contact at the lodge). The content panel springs up there.
6. **Back up** on a quick, sped-up lift ride.
7. **When nothing's happening,** the camera drifts slowly like a film shot. Skiers keep coming down the runs with powder trails, and the park keeps going.

## Roadmap

Each phase is a few small commits. Claude builds, explains how it works, and the code is commented so you can read along. You review each step and we iterate.

0. ✅ **Fresh start.** Vite 8, the packages, fonts and palette.
1. ✅ **First scene.** Canvas, lights, the first mountain.
2. ✅ **Big mountain, camera on rails.** The whiteout intro ride and preset shots.
3. ✅ **The world, first pass.** The sunset sky, weather by altitude, a cloud sea, snowy pines.
4. 🟡 **Lock in the mountain** (first pass done, waiting on your review):
   - Real Silver Star terrain from elevation data (`scripts/heightmap.mjs`, heights ×2.2), with a Matterhorn-style horn rising from the summit and jagged ranges around the edge.
   - The soft snow look: smooth shading, rock only on cliffs and high on the horn, snow gullies down its faces.
   - The cloud inversion at 1250–1450 m. The lift runs from under the clouds to the foot of the horn, and the sun sits behind the lift for alpenglow.
5. **Forests and runs.** Forest everywhere with real variety (spruce, fir, snow ghosts, dead snags, young trees), and runs cut through as white ribbons. A terrain park with jumps and rails.
6. **Soft clouds.** Replace the chunky puffs with a soft fluffy bank you ride through.
7. **The chairlift (Blender).** A bright retro double with towers, cable and stations, plus your legs, boots and skis for the first-person view.
8. **First-person ride.** Look around, fast-forward, tower jolts, unloading at the top.
9. **Skiers.** One cute low-poly skier with swappable jacket and pants colours. Skiers carve down runs with powder trails, hit the park, land tricks or ragdoll wipeouts.
10. **Signpost and skiing.** The snow-capped wooden signpost menu, snow shaking off on click, your third-person skier skiing to each section.
11. **Sound.** Wind, lift creaks and tower clunks, snow crunch, soft music (or your own whistling). Uses three.js positional audio. Free sources: [freesound.org](https://freesound.org) (CC0) and [Pixabay Music](https://pixabay.com/music/).
12. **Content and words.** The lift ticket, your real projects, experience and about-me text. This replaces "Developer. Pick a run."
13. **Cinematic polish.** Idle drift, a subtle vignette and sun glow, loading, the phone layout, reduce-motion, 60fps checks.
14. **Ship it.** Vercel, an optional custom domain, the LinkedIn post.

## Still need from you (whenever)

- **Your one-liner** for the lift ticket: your role, where you're studying or working, and what you're into.
- **Music vibe,** or record a whistle.

## Tools added

- **three.js skills** ([CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills), MIT): reference guides for R3F, shaders, geometry, lighting, postprocessing, performance and the asset pipeline, written for our exact versions (three r186+, R3F 9.8, drei 10.7). Plain docs, no scripts.
- **gltfjsx** (pmndrs, run with `npx` when needed): turns a Blender `.glb` into a React component and compresses it (`npx gltfjsx model.glb --transform`).
- **Elevation data:** [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) (Mapzen). In Canada they come from NRCan's CDEM under the Open Government Licence – Canada. Needs a credit line on the site.
- **Blender extensions** we may use: Sapling Tree Gen (parametric trees) and Real Snow (piles snow onto objects). Both are free on extensions.blender.org. We'll try them during the Blender phase.
