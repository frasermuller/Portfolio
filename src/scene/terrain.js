import * as THREE from 'three'

// The whole world is one big patch of ground. It's far bigger than the camera ever sees, so the fog hides the edges.
const SIZE = 1000
const SEGMENTS = 220 // ~4.5 units per triangle: big chunky facets up close, the cute low-poly look
export const PEAK = 110

// Pseudo-random 0..1 from a grid point. Same input, same output, so the mountain never changes between reloads.
function hash(x, y) {
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

// Big bumps plus smaller and smaller ones on top.
function fbm(x, y) {
  let total = 0
  let amplitude = 0.5
  for (let i = 0; i < 4; i++) {
    total += noise(x, y) * amplitude
    x *= 2
    y *= 2
    amplitude *= 0.5
  }
  return total
}

// Same idea, but each layer is folded (1 - |2n - 1|) so smooth hills become knife-edge ridges.
function ridged(x, y) {
  let total = 0
  let amplitude = 0.5
  for (let i = 0; i < 4; i++) {
    total += (1 - Math.abs(2 * noise(x, y) - 1)) * amplitude
    x *= 2
    y *= 2
    amplitude *= 0.5
  }
  return total
}

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
  // A ring of far-off peaks, so there's always something behind the fog.
  const range = 70 * ridged(x * 0.005 + 7, z * 0.005 - 3) * smoothstep(260, 420, Math.hypot(x, z))
  // A sharp horn on top, so the summit reads as a peak and not a lump.
  const horn = 38 * Math.exp(-((Math.hypot(x - 10, z - 28) / 26) ** 1.2))
  const bumps = fbm(x * 0.04, z * 0.04) * 3
  return mountain + range + horn + bumps
}

const SNOW = new THREE.Color('#f6f3fb')
const ROCK = [new THREE.Color('#6f6f9c'), new THREE.Color('#5d5d8a')]
const a = new THREE.Vector3()
const b = new THREE.Vector3()
const c = new THREE.Vector3()

export function buildTerrain() {
  // Lay the plane flat first, then lift every point to its height.
  // Non-indexed: every triangle owns its 3 corners, so each one can get its own flat colour.
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS).rotateX(-Math.PI / 2).toNonIndexed()
  const position = geometry.attributes.position
  const colors = []

  for (let i = 0; i < position.count; i++) {
    position.setY(i, heightAt(position.getX(i), position.getZ(i)))
  }

  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i)
    b.fromBufferAttribute(position, i + 1)
    c.fromBufferAttribute(position, i + 2)
    const height = (a.y + b.y + c.y) / 3
    // How flat is this triangle? 1 = flat, 0 = a cliff. Snow only sticks to the flatter faces.
    const flatness = Math.abs(b.sub(a).cross(c.sub(a)).normalize().y)
    const isSnow = flatness > 0.66 || (height > 60 && flatness > 0.5)
    const color = isSnow ? SNOW : ROCK[hash(i, 3) > 0.5 ? 0 : 1]
    for (let k = 0; k < 3; k++) colors.push(color.r, color.g, color.b)
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

// Pine trees on the gentle lower slopes, placed the same way every load.
export function treeSpots(max = 900) {
  const spots = []
  for (let i = 0; i < 6000 && spots.length < max; i++) {
    const angle = hash(i, 1) * Math.PI * 2
    const radius = 110 + hash(i, 2) * 230
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = heightAt(x, z)
    const slope = Math.hypot(heightAt(x + 1, z) - heightAt(x - 1, z), heightAt(x, z + 1) - heightAt(x, z - 1)) / 2
    if (y < 34 && slope < 0.55) spots.push({ x, y, z, scale: 0.7 + hash(i, 4) * 0.8 })
  }
  return spots
}

// The highest point, found by checking heightAt around the middle (see the plan's notes on tuning).
export const SUMMIT = new THREE.Vector3(10, heightAt(10, 28), 28)

// A spot on the snow, described from the summit: compass angle, distance out, and height above the ground.
export function around(angle, distance, up) {
  const radians = THREE.MathUtils.degToRad(angle)
  const x = SUMMIT.x + Math.cos(radians) * distance
  const z = SUMMIT.z + Math.sin(radians) * distance
  return new THREE.Vector3(x, heightAt(x, z) + up, z)
}

// The chairlift line: straight up the south ridge from the valley floor to a knoll with a clear view of the peak.
const LIFT_ANGLE = 100
export const liftLine = new THREE.CatmullRomCurve3(
  Array.from({ length: 24 }, (_, i) => {
    const t = i / 23
    // Low over the snow at the bottom, rising to the top station.
    return around(LIFT_ANGLE, THREE.MathUtils.lerp(240, 100, t), THREE.MathUtils.lerp(8, 25, t ** 3))
  }),
)

// Each place the camera can go: where it sits, and what it looks at.
export const shots = {
  // Aim below the tip so the peak sits high in the frame, towering over you.
  top: { camera: liftLine.getPointAt(1), look: SUMMIT.clone().setY(SUMMIT.y - 30) },
  about: { camera: around(115, 215, 12), look: around(105, 175, 2) },
  projects: { camera: around(30, 130, 25), look: around(20, 60, 10) },
  experience: { camera: around(340, 150, 35), look: around(350, 35, 0) },
  contact: { camera: around(85, 235, 10), look: around(95, 205, 3) },
}
