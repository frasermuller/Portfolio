import * as THREE from 'three'

// One mountain, laid out on purpose: a long climb from a frozen lake and village to a summit platform,
// one main run snaking down the face, a few cliff bands, and ranges around it. 1 unit is about 2 m.
const HALF = 500 // the world is 1000 x 1000 units
const SEGMENTS = 360 // ~2.8 units per triangle

export const LAKE = { x: 30, z: 330, radius: 90, level: 3 }
const PEAK = { x: 0, z: -160, height: 200 }

// Pseudo-random 0..1 from a grid point. Same input, same output, so nothing reshuffles between reloads.
export function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

// Value noise: random heights on a grid, smoothly blended between grid points.
function noise(x, y) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

// Big bumps plus smaller and smaller ones on top. Each layer is twice as fine and turned ~37°,
// otherwise the noise's square grid shows through as features running dead straight along x and z.
function layered(x, y, octaves, shape) {
  let total = 0
  let amplitude = 0.5
  for (let i = 0; i < octaves; i++) {
    total += shape(noise(x, y)) * amplitude
    const nx = 1.6 * x - 1.2 * y
    y = 1.2 * x + 1.6 * y
    x = nx
    amplitude *= 0.5
  }
  return total
}

export const fbm = (x, y) => layered(x, y, 4, (n) => n)

// Folding each layer (1 - |2n - 1|) turns smooth hills into knife-edge ridges.
export const ridged = (x, y) => layered(x, y, 5, (n) => 1 - Math.abs(2 * n - 1))

export const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// The closest spot on a polyline of [x, z] points, ignoring height: how far away it is, how far along the line (0 to 1),
// and `across`, the same distance but negative on one side of the line.
function closest(points, x, z) {
  let distance = Infinity
  let along = 0
  let across = 0
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i]
    const [bx, bz] = points[i + 1]
    const dx = bx - ax
    const dz = bz - az
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t)
    if (d < distance) {
      distance = d
      along = (i + t) / (points.length - 1)
      across = dx * (z - az) - dz * (x - ax) < 0 ? -d : d
    }
  }
  return { distance, along, across }
}
const distanceToLine = (points, x, z) => closest(points, x, z).distance

// The top platform, where the lift arrives (with the board and the bench), just under the summit.
export const TOP = { x: 14, z: -118, radius: 16 }

// The main run: a lazy S down the south face, from beside the platform to the village by the lake.
export const RUN_WIDTH = 13
const runCurve = new THREE.CatmullRomCurve3(
  [[-8, -112], [-30, -60], [-10, -10], [-36, 45], [-14, 100], [-34, 160], [-14, 212]].map(
    ([x, z]) => new THREE.Vector3(x, 0, z),
  ),
)
export const RUN_SPOTS = runCurve.getSpacedPoints(70).map((p) => [p.x, p.z])
// Far from the run (well past where it shapes the ground) we skip the search.
const runAt = (x, z) => (x < -110 || x > 60 ? { distance: 100, along: 0, across: 100 } : closest(RUN_SPOTS, x, z))
export const distanceToRun = (x, z) => runAt(x, z).distance

// Cliff bands, placed by hand: [from x, from z, to x, to z, drop]. The first crosses right under the lift.
export const CLIFFS = [
  [4, 52, 62, 64, 9],
  [-110, -10, -62, -32, 11],
  [52, -50, 104, -28, 10],
  [-120, 120, -74, 104, 8],
]

// The mountain itself: a big body, spurs and bowls, a summit, two side peaks and the ranges around.
// `rough` scales the small-scale lumpiness: groomed runs get much less of it.
function shape(x, z, rough) {
  const dx = x - PEAK.x
  const dz = z - PEAK.z
  // The south face (toward the lake, +z) is stretched into a long climb; the back drops away faster.
  const d = Math.hypot(dx * 0.95, dz / (dz > 0 ? 1.7 : 0.9))
  // An exponent of 1.5 keeps the top rounded enough to ski, and the bottom eases out into the valley.
  const body = Math.exp(-((d / 175) ** 1.5)) * (1 - 0.75 * smoothstep(140, 330, z))
  const spurs = 0.8 + 0.35 * ridged(x * 0.0075 + 3.1, z * 0.0075 - 1.7) * (0.4 + 0.6 * rough)
  let h = PEAK.height * body * spurs
  h += 26 * Math.exp(-((Math.hypot(dx, dz) / 34) ** 1.3)) // the summit
  h += 36 * Math.exp(-((Math.hypot(x + 175, z + 110) / 60) ** 1.3)) // west peak
  h += 30 * Math.exp(-((Math.hypot(x - 185, z + 90) / 55) ** 1.3)) // east peak
  h += fbm(x * 0.01, z * 0.01) * 12 // rolling valley floor
  h += 150 * ridged(x * 0.004 + 7, z * 0.004 - 3) ** 1.7 * smoothstep(300, 470, Math.hypot(x, z)) // ranges
  return h
}

// Each cliff band: a sharp step down on its downhill side, with the slope below easing back up over ~40 units,
// so there's a drop and a landing. Fades out at both ends so it doesn't slice the mountain in a straight line.
function cliffs(h, x, z) {
  for (const [ax, az, bx, bz, drop] of CLIFFS) {
    const dx = bx - ax
    const dz = bz - az
    const length = Math.hypot(dx, dz)
    const along = ((x - ax) * dx + (z - az) * dz) / (length * length)
    if (along < -0.3 || along > 1.3) continue
    const across = ((z - az) * dx - (x - ax) * dz) / length // positive on the downhill (south) side
    const ends = smoothstep(-0.25, 0.1, along) * smoothstep(1.25, 0.9, along)
    h -= drop * (smoothstep(-1.2, 1.2, across) - smoothstep(4, 45, across)) * ends
  }
  return h
}

const PLATFORM_HEIGHT = shape(TOP.x, TOP.z, 1)

// The main run has its own profile, top to bottom: steepest just under the platform (~35°), easing off
// as it goes (~30° in the middle) and running out flat into the village. A slope that eases off like that
// is also what lets you see the whole thing from the top; one that steepens rolls away out of sight.
const RUN_TOP = PLATFORM_HEIGHT
const RUN_BOTTOM = LAKE.level + 7
const runFloor = (along) => RUN_BOTTOM + (RUN_TOP - RUN_BOTTOM) * (1 - along) ** 1.3
const RUN_VALLEY = 55 // how far either side the run pulls the ground toward its own line

// Ground height at any world (x, z). The camera, lift, trees and rocks all use this to sit on the slope.
export function heightAt(x, z) {
  const { distance, along } = runAt(x, z)
  const run = 1 - smoothstep(RUN_WIDTH * 0.5, RUN_WIDTH * 1.5, distance)
  let h = cliffs(shape(x, z, 1 - 0.85 * run), x, z)
  // Scoop out the lake and flatten its bed.
  h += (LAKE.level - 2 - h) * smoothstep(LAKE.radius + 80, LAKE.radius - 10, Math.hypot(x - LAKE.x, z - LAKE.z))
  // Lay the run into the mountain along its profile; the ground either side leans into it like a wide gully.
  h += (runFloor(along) - h) * smoothstep(RUN_VALLEY, RUN_WIDTH * 0.6, distance)
  // Flatten the top platform.
  // A wide apron eases the platform into the slope, so skiing off it isn't a sudden drop.
  h += (PLATFORM_HEIGHT - h) * smoothstep(TOP.radius + 14, TOP.radius - 4, Math.hypot(x - TOP.x, z - TOP.z))
  // Small lumps the big shapes are too smooth to have (smoothed away on the run).
  return h + (fbm(x * 0.08, z * 0.08) - 0.5) * 1.4 * (1 - run)
}

// How steep the ground is at (x, z): 0 flat, 1 is 45°, bigger is steeper.
export function slopeAt(x, z) {
  return Math.hypot(heightAt(x + 1, z) - heightAt(x - 1, z), heightAt(x, z + 1) - heightAt(x, z - 1)) / 2
}

const SNOW = new THREE.Color('#e1e7f1') // off-piste, a touch cooler than the bright groomed run
const DRIFT = new THREE.Color('#d2dae8') // wind-packed patches
const ROCK = new THREE.Color('#4d5a64') // dark slate, like the rock in Lonely Mountains
const color = new THREE.Color()
const normal = new THREE.Vector3()

export function buildTerrain() {
  // A flat grid, every point lifted to its height. Kept indexed (corners shared) so shading and colours blend smoothly.
  const geometry = new THREE.PlaneGeometry(HALF * 2, HALF * 2, SEGMENTS, SEGMENTS).rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    position.setY(i, heightAt(position.getX(i), position.getZ(i)))
  }
  geometry.computeVertexNormals()

  // Snow sticks to anything gentler than ~45°. Steeper than that is bare rock. Noise wobbles the edge.
  // The run itself is painted in Mountain's shader, from how far across it each corner is.
  const colors = []
  const across = []
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    normal.fromBufferAttribute(geometry.attributes.normal, i)
    const wobble = (fbm(x * 0.2, z * 0.2) - 0.5) * 0.1
    const rock = smoothstep(0.74 + wobble, 0.62 + wobble, normal.y)
    const drift = smoothstep(0.5, 0.7, fbm(x * 0.03 + 9, z * 0.03)) * 0.6
    color.copy(SNOW).lerp(DRIFT, drift).lerp(ROCK, rock)
    colors.push(color.r, color.g, color.b)
    across.push(runAt(x, z).across)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('across', new THREE.Float32BufferAttribute(across, 1))
  return geometry
}

// The real summit: check every spot near the peak and keep the tallest.
export const SUMMIT = new THREE.Vector3(0, -Infinity, 0)
for (let x = PEAK.x - 30; x <= PEAK.x + 30; x++) {
  for (let z = PEAK.z - 30; z <= PEAK.z + 30; z++) {
    const y = heightAt(x, z)
    if (y > SUMMIT.y) SUMMIT.set(x, y, z)
  }
}

// A point on the ground (plus some height above it).
export const ground = (x, z, up = 0) => new THREE.Vector3(x, heightAt(x, z) + up, z)

// The chairlift: straight up the face, from the village by the lake to the top platform.
export const LIFT_BOTTOM = ground(LAKE.x + 6, LAKE.z - LAKE.radius - 4)
export const LIFT_TOP = ground(TOP.x + 6, TOP.z + 8)
const liftAt = (t) => [THREE.MathUtils.lerp(LIFT_BOTTOM.x, LIFT_TOP.x, t), THREE.MathUtils.lerp(LIFT_BOTTOM.z, LIFT_TOP.z, t)]
export const liftLine = new THREE.CatmullRomCurve3(
  Array.from({ length: 40 }, (_, i) => {
    const t = i / 39
    const [x, z] = liftAt(t)
    // 7 units above the highest ground nearby, so the cable sails over the cliff band rather than dipping into it.
    const nearby = [-1, -0.5, 0, 0.5, 1].map((step) => heightAt(...liftAt(THREE.MathUtils.clamp(t + step / 39, 0, 1))))
    return new THREE.Vector3(x, Math.max(...nearby) + 7, z)
  }),
)
export const distanceToLift = (x, z) =>
  distanceToLine([[LIFT_BOTTOM.x, LIFT_BOTTOM.z], [LIFT_TOP.x, LIFT_TOP.z]], x, z)

// Trees: a jittered grid (even but not rows), thick forest down low, glades where the noise dips,
// thinning into clumps toward a wavy treeline. None on the run, the lift line, the platform or the lake.
export function treeSpots() {
  const spots = []
  const STEP = 6
  for (let gx = -340; gx <= 340; gx += STEP) {
    for (let gz = -260; gz <= 440; gz += STEP) {
      const ix = Math.round(gx / STEP)
      const iz = Math.round(gz / STEP)
      const x = gx + (hash(ix, iz) - 0.5) * STEP * 0.9
      const z = gz + (hash(iz, ix) - 0.5) * STEP * 0.9
      if (distanceToRun(x, z) < RUN_WIDTH + 2 || distanceToLift(x, z) < 6) continue
      if (Math.hypot(x - TOP.x, z - TOP.z) < TOP.radius + 8) continue
      const y = heightAt(x, z)
      if (y < LAKE.level + 1.5 || slopeAt(x, z) > 0.8) continue
      const treeline = 120 + (fbm(x * 0.01, z * 0.01) - 0.5) * 40
      const density = smoothstep(treeline + 12, treeline - 30, y) * smoothstep(0.33, 0.5, fbm(x * 0.02 + 3, z * 0.02))
      if (hash(ix + 5, iz + 9) > density) continue
      spots.push({ x, y, z, scale: 0.55 + hash(ix, iz + 4) * 0.6, tint: 0.85 + hash(ix + 6, iz) * 0.25, variant: Math.floor(hash(ix + 2, iz + 7) * 5) })
    }
  }
  return spots
}

// Camera spots: where it sits and what it looks at. Eye height is ~0.85 units (1.7 m).
// fov is how wide the view is, in degrees up and down (the bench gets a wider one, to take it all in).
const shot = (camera, look, fov = 48) => ({ camera, look, fov })
const onPlatform = (dx, dz, up) => ground(TOP.x + dx, TOP.z + dz, up)

// The platform, seen from where you stop after getting off the lift (looking south-west, down the mountain):
// the trail board close by on the right, and on the left a wooden deck running out over the drop with a bench
// at its end. From the platform itself the slope rolls away and hides the run; out on the deck you see all of it.
const OFF = onPlatform(1.4, 3.8, 0.85)
export const BOARD = { x: TOP.x - 4.2, z: TOP.z + 5.8 }
// The deck points out along `angle` from the platform's middle, `from` and `to` units out.
export const DECK = { angle: 2, from: TOP.radius - 2, to: TOP.radius + 11, width: 3.2, height: PLATFORM_HEIGHT + 0.2 }
export const alongDeck = (r) => ({ x: TOP.x + Math.cos(DECK.angle) * r, z: TOP.z + Math.sin(DECK.angle) * r })
// Right at the end: any further back and the deck itself would hide the steep slope just below.
export const BENCH = alongDeck(DECK.to - 0.3)
const seat = alongDeck(DECK.to - 0.4)
const seated = new THREE.Vector3(seat.x, DECK.height + 0.62, seat.z)

export const shots = {
  // Off the lift, facing south-west: the deck leading out to the view just left of centre, the board close on the right
  // with the low sun above it.
  top: shot(OFF, new THREE.Vector3(OFF.x - 42, PLATFORM_HEIGHT - 2, OFF.z + 42)),
  // A couple of steps over to the board, reading it.
  board: shot(
    ground(THREE.MathUtils.lerp(BOARD.x, OFF.x, 0.3), THREE.MathUtils.lerp(BOARD.z, OFF.z, 0.3), 0.85),
    ground(BOARD.x, BOARD.z, 0.75),
  ),
  // Sitting on the bench at the end of the deck, looking out a touch right and tipped down ~21°: the main run, the valley
  // and the lake, the ranges, and the low sun up in the right corner (drag to look around).
  view: shot(seated, seated.clone().add(new THREE.Vector3(Math.cos(DECK.angle + 0.1), -0.38, Math.sin(DECK.angle + 0.1)).multiplyScalar(100)), 62),
  about: shot(ground(-80, 150, 12), ground(-30, 110, 6)),
  projects: shot(ground(90, 60, 20), ground(20, 20, 10)),
  experience: shot(ground(-70, -40, 18), ground(-15, -60, 12)),
  contact: shot(ground(80, 260, 10), ground(30, 230, 5)),
}
