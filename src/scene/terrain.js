import * as THREE from 'three'

// One big mountain, built from scratch: a long climb from a frozen lake and village up to a sharp summit,
// with cliff bands, spurs and bowls on the way, and a ring of ranges around it.
const HALF = 500 // the world is 1000 x 1000 units
const SEGMENTS = 360 // ~2.8 units per triangle

export const LAKE = { x: 40, z: 300, radius: 95, level: 3 }

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

const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// Where the summit sits, before the noise moves it around a little (SUMMIT below is the real top).
const PEAK = { x: 0, z: -110, height: 270 }

// The mountain itself, without the cliff steps.
function shape(x, z) {
  const dx = x - PEAK.x
  const dz = z - PEAK.z
  // The south face (toward the lake, +z) is stretched out into a long climb; the back drops away faster.
  const d = Math.hypot(dx * 0.95, dz / (dz > 0 ? 1.45 : 0.85))
  const body = Math.exp(-((d / 150) ** 1.25))
  // Spurs, bowls and gullies running down the faces.
  const spurs = 0.72 + 0.55 * ridged(x * 0.0075 + 3.1, z * 0.0075 - 1.7)
  let h = PEAK.height * body * spurs
  // A sharp summit you can actually stand under, plus two lower peaks on the ridge either side.
  h += 55 * Math.exp(-((Math.hypot(dx, dz) / 38) ** 1.3))
  h += 45 * Math.exp(-((Math.hypot(x + 165, z + 70) / 60) ** 1.3))
  h += 38 * Math.exp(-((Math.hypot(x - 175, z + 45) / 55) ** 1.3))
  // Gentle rolling ground across the valley floor.
  h += fbm(x * 0.01, z * 0.01) * 14
  // Jagged ranges around the edge of the map.
  h += 150 * ridged(x * 0.004 + 7, z * 0.004 - 3) ** 1.7 * smoothstep(300, 470, Math.hypot(x, z))
  return h
}

// Cliff bands: in patches, the slope is squashed into flat steps with steep risers between them.
// The risers are where the rock shows (and where the rock chunks get placed).
function cliffs(h, x, z) {
  const patch = smoothstep(0.5, 0.64, fbm(x * 0.014 + 11, z * 0.014 - 5)) * smoothstep(25, 60, h)
  if (patch === 0) return h
  const STEP = 13
  const t = h / STEP
  const stepped = (Math.floor(t) + smoothstep(0.62, 1, t - Math.floor(t))) * STEP
  return h + (stepped - h) * patch
}

// Ground height at any world (x, z). The camera, lift, trees and rocks all use this to sit on the slope.
export function heightAt(x, z) {
  let h = cliffs(shape(x, z), x, z)
  // Scoop out the lake and flatten its bed.
  const lake = smoothstep(LAKE.radius + 40, LAKE.radius - 10, Math.hypot(x - LAKE.x, z - LAKE.z))
  h += (LAKE.level - 2 - h) * lake
  // Small lumps the big shapes are too smooth to have.
  return h + (fbm(x * 0.08, z * 0.08) - 0.5) * 1.4
}

// How steep the ground is at (x, z): 0 flat, 1 is 45°, bigger is steeper.
export function slopeAt(x, z) {
  return Math.hypot(heightAt(x + 1, z) - heightAt(x - 1, z), heightAt(x, z + 1) - heightAt(x, z - 1)) / 2
}

const SNOW = new THREE.Color('#f3f5fa')
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
    normal.fromBufferAttribute(geometry.attributes.normal, i)
    const wobble = (fbm(position.getX(i) * 0.2, position.getZ(i) * 0.2) - 0.5) * 0.1
    const rock = smoothstep(0.74 + wobble, 0.62 + wobble, normal.y)
    color.copy(SNOW).lerp(ROCK, rock)
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

// The chairlift: straight up the south face, from the village by the lake to a top station just under the summit.
export const LIFT_BOTTOM = ground(LAKE.x - 22, LAKE.z - LAKE.radius - 2)
export const LIFT_TOP = ground(SUMMIT.x + 6, SUMMIT.z + 26)
export const liftLine = new THREE.CatmullRomCurve3(
  Array.from({ length: 40 }, (_, i) => {
    const t = i / 39
    return ground(THREE.MathUtils.lerp(LIFT_BOTTOM.x, LIFT_TOP.x, t), THREE.MathUtils.lerp(LIFT_BOTTOM.z, LIFT_TOP.z, t), 7)
  }),
)

// How far a point is from the lift line, ignoring height. Used to keep a clear cut through the trees.
export function distanceToLift(x, z) {
  const dx = LIFT_TOP.x - LIFT_BOTTOM.x
  const dz = LIFT_TOP.z - LIFT_BOTTOM.z
  const t = THREE.MathUtils.clamp(((x - LIFT_BOTTOM.x) * dx + (z - LIFT_BOTTOM.z) * dz) / (dx * dx + dz * dz), 0, 1)
  return Math.hypot(x - (LIFT_BOTTOM.x + dx * t), z - (LIFT_BOTTOM.z + dz * t))
}

// Trees: dense in the valley, thinning out up the face into scattered clumps, none above the treeline.
export function treeSpots(max = 2600) {
  const spots = []
  for (let i = 0; i < 30000 && spots.length < max; i++) {
    const x = (hash(i, 1) - 0.5) * 760
    const z = (hash(i, 2) - 0.5) * 760 + 40
    const y = heightAt(x, z)
    if (y < LAKE.level + 1 || y > 165 || slopeAt(x, z) > 0.85 || distanceToLift(x, z) < 7) continue
    // Higher up, only the strongest clumps survive, so the forest breaks up into scattered trees.
    const clump = fbm(x * 0.035 + 3, z * 0.035)
    if (clump < 0.4 + (y / 165) * 0.22) continue
    spots.push({ x, y, z, scale: 0.5 + hash(i, 4) * 0.7, tint: 0.85 + hash(i, 6) * 0.25, variant: Math.floor(hash(i, 5) * 5) })
  }
  return spots
}

// A camera spot: where it sits and what it looks at.
const shot = (camera, look) => ({ camera, look })

export const shots = {
  // The top: just under the summit, looking back down the whole mountain to the lake, with the range on either side.
  top: shot(liftLine.getPointAt(1), new THREE.Vector3(LAKE.x - 60, 140, LAKE.z + 60)),
  about: shot(ground(-120, 150, 18), ground(-60, 80, 10)),
  projects: shot(ground(150, 120, 25), ground(80, 30, 15)),
  experience: shot(ground(-60, -10, 30), ground(10, -80, 25)),
  contact: shot(ground(110, 270, 14), ground(40, 230, 8)),
}
