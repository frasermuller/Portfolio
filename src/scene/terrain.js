import * as THREE from 'three'

// The whole world is one big patch of ground, far bigger than the camera ever sees.
const HALF = 500
const SEGMENTS = 360 // ~2.8 units per triangle: still chunky and low-poly, but with enough detail to read as a real mountain
export const PEAK = 110

// Pseudo-random 0..1 from a grid point. Same input, same output, so the mountain never changes between reloads.
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
// otherwise the noise's square grid shows through as ridges running dead straight along x and z.
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
const ridged = (x, y) => layered(x, y, 5, (n) => 1 - Math.abs(2 * n - 1))

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// Ground height at any world (x, z). The camera, the lift and the trees all use this to sit on the slope.
export function heightAt(x, z) {
  const d = Math.hypot(x * 1.1, z * 0.85)
  // An exponent below 2 gives a pointy summit instead of a rounded dome.
  const massif = PEAK * Math.exp(-((d / 95) ** 1.4))
  const mountain = massif * (0.45 + 0.75 * ridged(x * 0.011, z * 0.011))
  // A sharp horn on top, so the summit reads as a peak and not a lump.
  const horn = 38 * Math.exp(-((Math.hypot(x - 10, z - 28) / 26) ** 1.2))
  // A ring of big far-off ranges, so the mountain sits in a real landscape instead of on its own.
  const range = 120 * ridged(x * 0.004 + 7, z * 0.004 - 3) ** 1.5 * smoothstep(250, 400, Math.hypot(x, z))
  const bumps = fbm(x * 0.04, z * 0.04) * 3
  return mountain + range + horn + bumps
}

const SNOW = new THREE.Color('#f6f3fb')
const ROCK = [new THREE.Color('#6f6f9c'), new THREE.Color('#5d5d8a')]
const color = new THREE.Color()
const a = new THREE.Vector3()
const b = new THREE.Vector3()
const c = new THREE.Vector3()

export function buildTerrain() {
  // Lay a flat grid down, then lift every point to its height (on the shared corners, before splitting them up).
  const plane = new THREE.PlaneGeometry(HALF * 2, HALF * 2, SEGMENTS, SEGMENTS).rotateX(-Math.PI / 2)
  const grid = plane.attributes.position
  for (let i = 0; i < grid.count; i++) {
    grid.setY(i, heightAt(grid.getX(i), grid.getZ(i)))
  }

  // Non-indexed: every triangle owns its 3 corners, so each one can get its own flat colour.
  const geometry = plane.toNonIndexed()
  const position = geometry.attributes.position
  const colors = []

  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i)
    b.fromBufferAttribute(position, i + 1)
    c.fromBufferAttribute(position, i + 2)
    const height = (a.y + b.y + c.y) / 3
    // How flat is this triangle? 1 = flat, 0 = a cliff. Snow only sticks to the flatter faces.
    const flatness = Math.abs(b.sub(a).cross(c.sub(a)).normalize().y)
    const isSnow = flatness > 0.66 || (height > 60 && flatness > 0.5)
    if (isSnow) {
      // Each snow facet a hair brighter or darker than its neighbours, like wind-packed powder.
      color.copy(SNOW).multiplyScalar(0.94 + hash(i, 7) * 0.06)
    } else {
      color.copy(ROCK[hash(i, 3) > 0.5 ? 0 : 1])
    }
    for (let k = 0; k < 3; k++) colors.push(color.r, color.g, color.b)
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

// The highest point: check every spot around the horn and keep the tallest, so tweaking the noise never leaves this stale.
export const SUMMIT = new THREE.Vector3(0, -Infinity, 0)
for (let x = -30; x <= 50; x++) {
  for (let z = -10; z <= 70; z++) {
    const y = heightAt(x, z)
    if (y > SUMMIT.y) SUMMIT.set(x, y, z)
  }
}

// A spot on the snow, described from the summit: compass angle, distance out, and height above the ground.
export function around(angle, distance, up) {
  const radians = THREE.MathUtils.degToRad(angle)
  const x = SUMMIT.x + Math.cos(radians) * distance
  const z = SUMMIT.z + Math.sin(radians) * distance
  return new THREE.Vector3(x, heightAt(x, z) + up, z)
}

// The chairlift line: straight up the south ridge from the valley floor to a knoll with a clear view of the peak.
const LIFT_ANGLE = 100
const LIFT_BOTTOM = around(LIFT_ANGLE, 240, 0)
const LIFT_TOP = around(LIFT_ANGLE, 100, 0)
export const liftLine = new THREE.CatmullRomCurve3(
  Array.from({ length: 24 }, (_, i) => {
    const t = i / 23
    // Low over the snow at the bottom, rising to the top station.
    return around(LIFT_ANGLE, THREE.MathUtils.lerp(240, 100, t), THREE.MathUtils.lerp(8, 25, t ** 3))
  }),
)

// How far a point is from the lift line, ignoring height. Used to keep a clear cut through the forest.
function distanceToLift(x, z) {
  const dx = LIFT_TOP.x - LIFT_BOTTOM.x
  const dz = LIFT_TOP.z - LIFT_BOTTOM.z
  const t = THREE.MathUtils.clamp(((x - LIFT_BOTTOM.x) * dx + (z - LIFT_BOTTOM.z) * dz) / (dx * dx + dz * dz), 0, 1)
  return Math.hypot(x - (LIFT_BOTTOM.x + dx * t), z - (LIFT_BOTTOM.z + dz * t))
}

// Pines in forest patches that climb the lower mountain, placed the same way every load.
export function treeSpots(max = 1800) {
  const spots = []
  for (let i = 0; i < 14000 && spots.length < max; i++) {
    const angle = hash(i, 1) * Math.PI * 2
    const radius = 55 + hash(i, 2) * 300
    const x = SUMMIT.x + Math.cos(angle) * radius
    const z = SUMMIT.z + Math.sin(angle) * radius
    const y = heightAt(x, z)
    const slope = Math.hypot(heightAt(x + 1, z) - heightAt(x - 1, z), heightAt(x, z + 1) - heightAt(x, z - 1)) / 2
    // Big slow noise decides where the forests are, leaving open glades between them.
    const forest = fbm(x * 0.022 + 3, z * 0.022)
    if (y < 62 && slope < 0.8 && forest > 0.48 && distanceToLift(x, z) > 9) {
      spots.push({ x, y, z, scale: 0.6 + hash(i, 4) * 0.9, variant: Math.floor(hash(i, 5) * 3) })
    }
  }
  return spots
}

// Each place the camera can go: where it sits, and what it looks at.
// Cameras sit either under the cloud layer (cosy whiteout) or above it (sunset), never inside it.
export const shots = {
  // Aim below the tip so the peak sits high in the frame, towering over you.
  top: { camera: liftLine.getPointAt(1), look: SUMMIT.clone().setY(SUMMIT.y - 30) },
  about: { camera: around(115, 215, 12), look: around(105, 175, 2) },
  projects: { camera: around(30, 130, 45), look: around(20, 60, 10) },
  experience: { camera: around(340, 150, 45), look: around(350, 35, 0) },
  contact: { camera: around(85, 235, 10), look: around(95, 205, 3) },
}
