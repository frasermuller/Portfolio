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

## The experience, start to finish

This is how someone moves through the site. It also answers how the chairlift connects to everything else: **you go up on the lift and come down on the runs.**

1. **Lift ticket (entry screen).** A ski lift ticket with your name and role on it doubles as the loading screen. Two buttons: *Board with sound* and *Board quietly*. The click also unlocks audio, since browsers block sound until someone clicks.
2. **The ride up, first person.** You're sitting on a double chair with the safety bar down. Look down and you see your legs and skis dangling. Drag or move the mouse to turn your head (limited range, and it eases back). The chair jolts a little at each tower. You start under the clouds in heavy snow and whiteout, ride up through the cloud layer, and come out above it into a sunset, with a sea of clouds below and the peak glowing pink.
3. **Unload at the top station.** The bar lifts, the chair tips you off, and the camera glides onto the deck and turns to face…
4. **The wooden trail signpost.** A 3D post with a sign for each section, and it *is* the menu. Signs wiggle on hover. A small HTML trail-map button stays in the corner for keyboard and screen-reader users, and for anyone who wants to jump straight somewhere.
5. **Ski down a run.** Clicking a sign skis you down that run in first person, carving turns, to where that section lives: the bunny hill for About, the blue run for Projects, the black diamond for Experience, the lodge for Contact. The content panel springs up there.
6. **Back up.** "Ride the lift" takes you back up to the signpost on a quick, sped-up ride.
7. **When nothing's happening,** the camera never sits frozen. It drifts slowly like a film shot, and skiers keep coming down the runs.

## Roadmap

Each phase is a few small commits. Claude builds, explains how it works, and the code is commented so you can read along. You review each step and we iterate.

0. ✅ **Fresh start.** Vite 8, the packages, fonts and palette.
1. ✅ **First scene.** Canvas, lights, the first mountain.
2. ✅ **Big mountain, camera on rails.** A horned summit, forests, the whiteout intro ride, and preset shots (`src/scene/terrain.js`, `CameraRig.jsx`).
3. ✅ **The world.** Done in a first pass. Runs and other details come in later phases:
   - A bit more detail: smaller triangles near the mountain, bigger ones far away.
   - Weather by altitude: whiteout and heavy snow under the clouds, a clear sunset above.
   - A sunset sky, a low-poly sea of clouds, and taller distant ranges so it feels like a real place and not a lone mountain.
   - Tiered snowy pines in a few shapes, in forest patches that climb the mountain.
4. **The chairlift (Blender)** (next). A retro double chair, either bright chairs that pop against the snow or a rustic old double (your call). Towers, cable, bottom and top stations, plus the skier's legs, boots and skis for the first-person view.
5. **First-person ride.** Sit in the chair, look around, tower jolts, unloading at the top.
6. **Signpost and runs.** The 3D wooden signpost menu. Runs groomed through the trees (lighter snow, no trees in the lane). Skiing down a run to each section.
7. **Life.** Little skiers on the runs, the lift turning, chimney smoke at the lodge, wind-blown snow off the ridges.
8. **Sound.** Wind, the lift's creak and the clunk at each tower, snow crunch, and quiet music. Sounds come from three.js's built-in audio, positioned in 3D so the tower clunk comes from the tower. Free sources: [freesound.org](https://freesound.org) (filter by CC0) and [Pixabay Music](https://pixabay.com/music/). Better idea: record yourself whistling or humming. That's as personal as it gets.
9. **Content and words.** The lift ticket, your real projects, experience and about-me text. This replaces "Developer. Pick a run."
10. **Cinematic polish.** Idle camera drift, a subtle vignette and glow on the sun (postprocessing), loading, the phone layout (the peak's tip currently hides behind the title on tall screens), reduce-motion, and 60fps checks.
11. **Ship it.** Deploy to Vercel, add a custom domain (optional), post it on LinkedIn.

## Questions for you (whenever)

- **Which mountain do you actually ski?** We can shape the peak after your home hill. That's much more personal than a generic Matterhorn.
- **Chairlift style:** bright and poppy, or rustic old double?
- **Your one-liner:** your role, where you're based or studying, and what you're into. This goes on the lift ticket.
- **Music:** any vibe or tracks you like? Or record that whistle.

## Tools added

- **three.js skills** ([CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills), MIT): reference guides for R3F, shaders, geometry, lighting, postprocessing, performance and the asset pipeline, written for our exact versions (three r186+, R3F 9.8, drei 10.7). Plain docs, no scripts.
- **gltfjsx** (pmndrs, run with `npx` when needed): turns a Blender `.glb` into a React component and compresses it (`npx gltfjsx model.glb --transform`).
- **Blender extensions** we may use: Sapling Tree Gen (parametric trees) and Real Snow (piles snow onto objects). Both are free on extensions.blender.org. We'll try them during the Blender phase.
