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

- **Mountain:** a new one built from scratch (Silver Star's real data looked like a hill). One continuous climb from a frozen lake and village up to a sharp summit you ride to, with cliff bands, spurs, bowls and faceted rock. Inspired by Grand Mountain Adventure, Lonely Mountains: Snow Riders and Steep, with a Tomb Raider-style summit vista over a sea of distant peaks.
- **Look:** smooth white snow with real shadows, chunky low-poly rocks pushing through it, scattered snowy trees of several kinds (denser low, sparse up high), golden-hour light.
- **Chairlift:** bright retro double, with red-orange chairs that pop against the snow.
- **Camera:** first person on the lift (skis at your feet, look around), third person skiing (follow your little skier down the run).
- **Ride:** rides on its own (~25s), drag to look around, hold a button or Space to fast-forward, plus Skip.
- **Clouds:** a soft, semi-see-through fluffy bank. Too dense to see through, so you ride into it and break out on top.
- **Type:** a routed-wood slab serif for signs and headings, plus a clean text face.
- **Scale:** it doesn't need to be huge. Unique shots and life matter more.

## The experience, start to finish

You go up on the lift and come down on the runs. Everything on the mountain is placed on purpose (runs, cliffs, rock bands, forest edges), not scattered at random.

1. **Lift ticket (entry screen).** Your name and role on a ski ticket, doubling as the loading screen. *Board with sound* or *Board quietly*. That click also unlocks audio.
2. **The ride up, first person.** The ride is smooth and high, climbing through the low cloud. Look around, look down at your skis, hold to fast-forward. Below you, a run goes down under the lift, and the action is scripted like a short film:
   - A skier hits the cliff band under the lift and sends it off the drop (a trick, a clean landing).
   - A couple of other skiers carve down. One of them wipes out and ragdolls.
3. **The top station.** You get off facing out across the summit platform:
   - **On the right, the wooden board** (snow-capped trail sign). Click it and you move in close and it becomes the menu. Clicking a section knocks the snow off and sends your skier toward it.
   - **On the left, the view.** "Enjoy the view" walks you to a bench at the edge. You sit and look around: the main run dropping away below with skiers on it, the valley and lake, ranges fading into the distance, and the low sun coming through. Click a skier to make them wipe out.
4. **Ski down a run** in third person, with powder spraying behind you, to where each section lives. The content panel springs up there.
5. **Back up** on a quick, sped-up lift ride.
6. **When nothing's happening,** the camera drifts slowly like a film shot and the skiers keep coming.

**Look of the world:** steep enough to feel like a real mountain, gentle enough to obviously ski. Detail fades gradually into the distance: crisp foreground, softer mid-range peaks, hazy far ranges.

**UI (redo later):** the current pink-and-navy button stack and fonts are placeholder. They'll be replaced with in-world signage (the board) and a few small, distinctive controls instead of a big overlay.

## Your feedback (Nov 6) and what we're doing about it

- **View from the top:** keep the run going down (you liked it), but fade the landscape in more layers, with real visible sky instead of fog and cloud. → Layered ranges, each one hazier, and a clear golden-hour sky up top.
- **The mountain:** real peaks, cliffs and cliff sides with textured rock walls, not one soft blob. Medium poly is fine, enough detail that it doesn't look cheap. → Faceted rock shading with strata on steep ground, chunky rock walls on the cliff bands, a proper rocky summit.
- **The top area:** more than flat white snow. Things up there that make it feel like a real summit. → Lift top station, summit crag, rocks, drifts, props.
- **The arrival view:** see the board, the bench and the landscape (ranges and sky) together.
- **The trail board:** full redo. Way more detail, real content on it, and no tilting the whole board on hover. → A routed-wood sign with a roof, carved rows for each section, snow on each row that you knock off.
- **The ride:** feels choppy and too quick, and the hop off at the top isn't great. → A smooth cable line, a slower ride (hold to speed up), and a proper unload: slow into the station, stand up, glide off and turn to face the view.
- **Still missing:** the chairlift itself and your character (legs, skis). That's the Blender phase, next.
- **Later:** redo the buttons and type so they look like part of the world, not an overlay.

**From the Blender + Claude guide** ([vagon.io](https://vagon.io/blog/how-to-use-blender-with-claude)): build models with Python scripts, not by hand (no sculpting or vertex pushing). Ask for a plan first, use named collections, check the viewport after every step, work in a test file, and keep Poly Haven (CC0 textures and HDRIs) switched off unless we need it. We already have the official Blender MCP connected, so the chairlift gets built that way.

## Roadmap

Each phase is a few small commits. Claude builds, explains how it works, and the code is commented so you can read along. You review each step and we iterate.

0. ✅ **Fresh start.** Vite 8, the packages, fonts and palette.
1. ✅ **First scene.** Canvas, lights, the first mountain.
2. ✅ **Big mountain, camera on rails.** The whiteout intro ride and preset shots.
3. ✅ **The world, first pass.** The sunset sky, weather by altitude, a cloud sea, snowy pines.
4. 🟡 **Lock in the mountain** (second pass, waiting on your review):
   - A new mountain from scratch (`src/scene/terrain.js`): a long climb from the lake to the summit, cliff bands, spurs, side peaks and a ring of ranges.
   - Faceted rocks on the cliffs (`Rocks.jsx`), real shadows, golden-hour light, a far backdrop of peaks (`Backdrop.jsx`), and five tree types.
   - The lift runs from the lakeside village (under low cloud) to just under the summit. You turn around at the top to look back down the valley.
5. **Forests and runs.** Forest everywhere with real variety (spruce, fir, snow ghosts, dead snags, young trees), and runs cut through as white ribbons. A terrain park with jumps and rails.
6. **Soft clouds.** Replace the chunky puffs with a soft fluffy bank you ride through.
7. ✅ **The chairlift (Blender).** A bright retro double with towers, cable and stations, plus your legs, boots and skis for the first-person view. Source in `blender/chairlift.blend` (the build script is in its `lift_helpers.py` text block), exported to `public/models/chairlift.glb`.
8. 🟡 **First-person ride.** Done: look around, hold to speed up, unloading at the top, the chairs moving with you. Still to do: a little jolt passing each tower, and the chair swinging.
9. **Skiers.** One cute low-poly skier with swappable jacket and pants colours. Scripted moments: the cliff jump under the lift, carving with powder trails, park tricks, ragdoll wipeouts, and click-to-wipe-out from the bench.
10. **Top station.** The board menu (right) and the bench view (left), snow shaking off the board, your third-person skier skiing to each section.
11. **Sound.** Wind, lift creaks and tower clunks, snow crunch, soft music (or your own whistling). Uses three.js positional audio. Free sources: [freesound.org](https://freesound.org) (CC0) and [Pixabay Music](https://pixabay.com/music/).
12. **Content, words and UI.** The lift ticket, your real projects, experience and about-me text. New type and controls to replace the placeholder overlay.
13. **Cinematic polish.** Idle drift, a subtle vignette and sun glow, loading, the phone layout, reduce-motion, 60fps checks.
14. **Ship it.** Vercel, an optional custom domain, the LinkedIn post.

## Research notes (Nov 5)

- **Skiers:** animate in code, not physics. Each skier is a few rigid body parts, drawn as one instanced mesh per part with per-skier jacket and pants colours. Lean comes from the run's curvature, jumps are a parabola plus a spin, and wipeouts are a scripted tumble. Physics (Rapier, 15 MB) only if the click-to-wipe-out needs it, loaded just for that skier.
- **Chairlift:** model one tower, one chair and the stations in Blender via `bpy` (bevel modifier, flat shading, named materials for recolourable parts). Export with `export_apply=True`, then run gltfjsx with `--keepmeshes --keepnames` so parts stay separate. Towers and the sagging cable get laid out in code along the lift line.
- **First-person seat:** cable pivot, then a swinging hanger, the seat (skis attached), the head, the camera. Drag sets head yaw and pitch (clamped) and eases back. Each tower gives a little bump.
- **Powder and spindrift:** one shared pool of camera-facing particles, moved in the shader.
- **Blender skills to consider:** [EL4CTEO/blender-skills](https://github.com/EL4CTEO/blender-skills) (MIT, includes a web GLB export preset). It has executable scripts, so read them before using.

## Still need from you (whenever)

- **Your one-liner** for the lift ticket: your role, where you're studying or working, and what you're into.
- **Music vibe,** or record a whistle.

## Tools added

- **three.js skills** ([CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills), MIT): reference guides for R3F, shaders, geometry, lighting, postprocessing, performance and the asset pipeline, written for our exact versions (three r186+, R3F 9.8, drei 10.7). Plain docs, no scripts.
- **gltfjsx** (pmndrs, run with `npx` when needed): turns a Blender `.glb` into a React component and compresses it (`npx gltfjsx model.glb --transform`).
- **Blender extensions** we may use: Sapling Tree Gen (parametric trees) and Real Snow (piles snow onto objects). Both are free on extensions.blender.org. We'll try them during the Blender phase.
