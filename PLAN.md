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

All checked on npm, Nov 2026.

| Piece | What it does | Why this one |
|---|---|---|
| `three` 0.187 | The 3D engine | Everything on the web uses it |
| `@react-three/fiber` 9.8 | Lets you write three.js as React components | Works with React 19, which you already have |
| `@react-three/drei` 10.7 | Ready-made helpers: controls, text, model loading, `<Html>` labels in 3D | Saves weeks |
| `camera-controls` (via drei `<CameraControls>`) | Smooth orbit plus "fly the camera to here" | Better than plain OrbitControls for click-to-zoom |
| `gsap` 3.15 + `@gsap/react` | Timelines for the camera rides and intro | Fully free since Webflow bought it, all plugins included (SplitText, Flip, etc.) |
| `motion` 14.9 | Spring physics for the 2D UI: panels, buttons, hovers | This is where the snappy, bubbly feel comes from |
| `@react-three/postprocessing` | Outlines, bloom, a little grain | Turns a "default three.js" look into a stylized one |
| `leva` + `r3f-perf` | Live sliders to tweak values, plus an FPS meter | Dev only. Learn by dragging sliders |
| Golf only: `@react-three/rapier` | Physics | Skipped for ski |

Skipped: Theatre.js (no release since 2024; GSAP covers it). Spline (fast, but heavy and looks like every other Spline site).

## Tools to hook up

These are all built by the library authors or the community, not Claude defaults.

1. **Blender** (free, [blender.org](https://www.blender.org/download/)): **you install it.** We model the lodge, lift towers, trees and signs here, then export them as `.glb`.
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

## Milestones

Each milestone is a few small commits. I explain the concept and set up the scaffolding, you write the marked `// YOU:` parts, then we commit.

0. **Clean the starter.** Your fonts aren't loading yet: the paths point at `/assets/...`, but the files are in `src/assets/fonts/`, and Tailwind v4 ignores `tailwind.config.js` (v4 reads fonts from an `@theme` block in CSS). There's also a stray `\` in `bg-white\`. Good first fix for you.
1. **First canvas.** R3F `<Canvas>`, one box, orbit controls. Learn: scene, camera, renderer, the render loop.
2. **The mountain.** A flat plane pushed up with noise, flat shading, and snow color by height. Learn: geometry, vertices, noise. You: tune the noise until it looks like your mountain.
3. **The look.** Toon lighting, fog, sky gradient, outlines, falling snow. Learn: materials, lights, postprocessing, particles.
4. **Blender pass.** Model the lodge, lift, trees and signs, export `.glb`, and turn them into components with `gltfjsx`. Learn: the 3D asset pipeline.
5. **Interaction.** Hover and click run signs, the camera flies down the run (GSAP), and a panel springs in (Motion). Learn: raycasting, timelines, springs.
6. **Life.** Skiers on curved paths, the turning chairlift, chimney smoke. Learn: curves, `useFrame`, instancing.
7. **Content.** Your real projects, experience and about-me text.
8. **Polish.** Loading screen, a lighter version for phones, respecting "reduce motion", a plain-text nav for screen readers, and 60fps checks.
9. **Ship it.** Deploy, custom domain (optional), post it on LinkedIn.
