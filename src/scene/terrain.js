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

// Closest distance from (x, z) to a polyline of [x, z] points, ignoring height.
function distanceToLine(points, x, z) {
  let best = Infinity
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i]
    const [bx, bz] = points[i + 1]
    const dx = bx - ax
    const dz = bz - az
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t))
  }
  return best
}

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
export const distanceToRun = (x, z) => (x < -70 || x > 30 ? 100 : distanceToLine(RUN_SPOTS, x, z))

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
    const across = ((x - ax) * dz - (z - az) * dx) / length // positive on the downhill (south) side
    const ends = smoothstep(-0.25, 0.1, along) * smoothstep(1.25, 0.9, along)
    h -= drop * (smoothstep(-1.2, 1.2, across) - smoothstep(4, 45, across)) * ends
  }
  return h
}

const PLATFORM_HEIGHT = shape(TOP.x, TOP.z, 1)

// Ground height at any world (x, z). The camera, lift, trees and rocks all use this to sit on the slope.
export function heightAt(x, z) {
  const run = 1 - smoothstep(RUN_WIDTH * 0.5, RUN_WIDTH * 1.5, distanceToRun(x, z))
  let h = cliffs(shape(x, z, 1 - 0.85 * run), x, z)
  // Flatten the top platform.
  // A wide apron eases the platform into the slope, so skiing off it isn't a sudden drop.
  h += (PLATFORM_HEIGHT - h) * smoothstep(TOP.radius + 30, TOP.radius - 4, Math.hypot(x - TOP.x, z - TOP.z))
  // Scoop out the lake and flatten its bed.
  h += (LAKE.level - 2 - h) * smoothstep(LAKE.radius + 80, LAKE.radius - 10, Math.hypot(x - LAKE.x, z - LAKE.z))
  // Small lumps the big shapes are too smooth to have (smoothed away on the run).
  return h + (fbm(x * 0.08, z * 0.08) - 0.5) * 1.4 * (1 - run)
}

// How steep the ground is at (x, z): 0 flat, 1 is 45°, bigger is steeper.
export function slopeAt(x, z) {
  return Math.hypot(heightAt(x + 1, z) - heightAt(x - 1, z), heightAt(x, z + 1) - heightAt(x, z - 1)) / 2
}

const SNOW = new THREE.Color('#eef1f7') // off-piste
const GROOMED = new THREE.Color('#fbfcff') // the run, a touch brighter
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
  const colors = []
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    normal.fromBufferAttribute(geometry.attributes.normal, i)
    const wobble = (fbm(x * 0.2, z * 0.2) - 0.5) * 0.1
    const rock = smoothstep(0.74 + wobble, 0.62 + wobble, normal.y)
    const groomed = 1 - smoothstep(RUN_WIDTH * 0.6, RUN_WIDTH, distanceToRun(x, z))
    color.copy(SNOW).lerp(GROOMED, groomed).lerp(ROCK, rock)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
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
export const liftLine = new THREE.CatmullRomCurve3(
  Array.from({ length: 40 }, (_, i) => {
    const t = i / 39
    return ground(THREE.MathUtils.lerp(LIFT_BOTTOM.x, LIFT_TOP.x, t), THREE.MathUtils.lerp(LIFT_BOTTOM.z, LIFT_TOP.z, t), 7)
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
const shot = (camera, look) => ({ camera, look })
const onPlatform = (dx, dz, up) => ground(TOP.x + dx, TOP.z + dz, up)

// Where the board and bench stand on the platform (the scene places them, the camera visits them).
// Seen from where you get off the lift (looking west), the board is front-right and the bench is front-left.
export const BOARD = { x: TOP.x - 16, z: TOP.z - 2 }
export const BENCH = { x: TOP.x - 14, z: TOP.z + 7 }

export const shots = {
  // Off the lift and a few steps across the platform, facing west: the board on the right,
  // the edge, the bench and the view (with the low sun) on the left.
  top: shot(onPlatform(-6, 2, 0.85), new THREE.Vector3(TOP.x - 60, PLATFORM_HEIGHT - 3, TOP.z + 8)),
  // In front of the board, reading it.
  board: shot(onPlatform(-13, -0.5, 0.85), ground(BOARD.x, BOARD.z, 0.75)),
  // Sitting on the bench, looking down the main run to the valley and the lake (drag right for the sun).
  view: shot(ground(BENCH.x, BENCH.z + 0.1, 0.62), new THREE.Vector3(-25, 95, 110)),
  about: shot(ground(-80, 150, 12), ground(-30, 110, 6)),
  projects: shot(ground(90, 60, 20), ground(20, 20, 10)),
  experience: shot(ground(-70, -40, 18), ground(-15, -60, 12)),
  contact: shot(ground(80, 260, 10), ground(30, 230, 5)),
}
