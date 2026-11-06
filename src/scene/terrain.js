import * as THREE from 'three'
import { SIZE as MAP_SIZE, AREA, DATA } from './heightmap.js'

// The world is the real 16 km square around Silver Star's summit, squeezed into 1000 units (16 m per unit).
const HALF = 500
const METRES_PER_UNIT = AREA / (HALF * 2)
const SEGMENTS = 360 // ~2.8 units (45 m) per triangle
// Real heights, stretched up 2.2x. Silver Star is a gentle dome; this makes it read as a proper mountain.
const VERTICAL = 2.2
const VALLEY_FLOOR = 384 // metres, the lowest point in the square (the Okanagan valley)

// The heightmap arrives as text (base64); unpack it into one height per grid point, in decimetres.
const heights = new Uint16Array(Uint8Array.from(atob(DATA), (c) => c.charCodeAt(0)).buffer)

// Real elevation in metres at any world (x, z), blending between the four nearest grid points.
function elevation(x, z) {
  const gx = THREE.MathUtils.clamp(((x + HALF) / (HALF * 2)) * MAP_SIZE - 0.5, 0, MAP_SIZE - 1.001)
  const gz = THREE.MathUtils.clamp(((z + HALF) / (HALF * 2)) * MAP_SIZE - 0.5, 0, MAP_SIZE - 1.001)
  const ix = Math.floor(gx)
  const iz = Math.floor(gz)
  const fx = gx - ix
  const fz = gz - iz
  const at = (i, j) => heights[j * MAP_SIZE + i] / 10
  const top = at(ix, iz) * (1 - fx) + at(ix + 1, iz) * fx
  const bottom = at(ix, iz + 1) * (1 - fx) + at(ix + 1, iz + 1) * fx
  return top * (1 - fz) + bottom * fz
}

// Turn real metres above sea level into world height (units above the valley floor).
export const toWorldHeight = (metres) => ((metres - VALLEY_FLOOR) / METRES_PER_UNIT) * VERTICAL

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
const ridged = (x, y) => layered(x, y, 5, (n) => 1 - Math.abs(2 * n - 1))

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// The horn: a Matterhorn-style peak rising out of Silver Star's summit. Real Silver Star is the ski hill below it.
function horn(x, z) {
  // Turn ~20° so the four ridges don't line up with north/south/east/west.
  const u = x * 0.94 - z * 0.34
  const v = x * 0.34 + z * 0.94
  // Halfway between a circle and a diamond: the diamond's corners become four sharp ridges.
  const d = 0.5 * (Math.abs(u) + Math.abs(v)) + 0.5 * Math.hypot(u, v)
  const body = Math.max(0, 1 - d / 125) ** 1.7
  // The very top leans off-centre, like the Matterhorn's hooked summit.
  const tip = Math.max(0, 1 - Math.hypot(x + 9, z + 6) / 45) ** 1.3
  // Gullies and buttresses down the faces, plus smaller knobbly rock on top of those.
  const crags = 0.8 + 0.4 * ridged(x * 0.045, z * 0.045)
  const knobs = body * 16 * (ridged(x * 0.11, z * 0.11) - 0.5)
  return (100 * body + 45 * tip) * crags + knobs
}

// Jagged ranges around the edge of the map, poking up through the sea of cloud.
function ranges(x, z) {
  return 130 * ridged(x * 0.0045 + 7, z * 0.0045 - 3) ** 1.6 * smoothstep(280, 430, Math.hypot(x, z))
}

// Ground height at any world (x, z): real Silver Star, the horn on top, the ranges around,
// plus a little lumpiness the 40 m data is too coarse to have.
export function heightAt(x, z) {
  return toWorldHeight(elevation(x, z)) + horn(x, z) + ranges(x, z) + (fbm(x * 0.08, z * 0.08) - 0.5) * 1.2
}

const SNOW = new THREE.Color('#f7f5fc')
const ROCK = new THREE.Color('#231f33') // dark rock on the horn
const LOW_ROCK = new THREE.Color('#7a7898') // softer grey for the odd outcrop on the ski hill
const rockColor = new THREE.Color()
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

  // Snow everywhere except the steepest faces, which fade to bare rock. Noise wobbles the edge so it's not a clean line.
  const colors = []
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    normal.fromBufferAttribute(geometry.attributes.normal, i)
    const wobble = (fbm(x * 0.15, z * 0.15) - 0.5) * 0.12
    // 0 on the ski hill, 1 high on the horn. Low down only real cliffs show rock; up high the wind strips the snow,
    // so rock shows through on gentler slopes and it's darker.
    const high = THREE.MathUtils.smoothstep(position.getY(i), 200, 290)
    const scoured = THREE.MathUtils.lerp(0.72, 0.95, high)
    const steep = THREE.MathUtils.smoothstep(scoured + wobble - normal.y, 0, 0.12)
    // Snow-filled gullies streaking straight down the steep faces, like the Matterhorn's couloirs.
    // Walking around a circle in noise-space (cos, sin) makes stripes that fan out from the summit, with no seam.
    const angle = Math.atan2(z - SUMMIT.z, x - SUMMIT.x)
    const distance = Math.hypot(x - SUMMIT.x, z - SUMMIT.z)
    const gully = THREE.MathUtils.smoothstep(ridged(Math.cos(angle) * 9 + distance * 0.012, Math.sin(angle) * 9), 0.7, 0.82)
    const rock = steep * (1 - gully)
    rockColor.copy(LOW_ROCK).lerp(ROCK, high)
    color.copy(SNOW).lerp(rockColor, rock)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geometry
}

// The summit: the tip of the horn, found by checking every spot near the middle and keeping the tallest.
export const SUMMIT = new THREE.Vector3(0, -Infinity, 0)
for (let x = -20; x <= 20; x++) {
  for (let z = -20; z <= 20; z++) {
    const y = heightAt(x, z)
    if (y > SUMMIT.y) SUMMIT.set(x, y, z)
  }
}

// A spot on the snow, described from the summit: compass angle, distance out, and height above the ground.
// Angle 0 points east (+x), 90 south (+z), 180 west, 270 north.
export function around(angle, distance, up) {
  const radians = THREE.MathUtils.degToRad(angle)
  const x = SUMMIT.x + Math.cos(radians) * distance
  const z = SUMMIT.z + Math.sin(radians) * distance
  return new THREE.Vector3(x, heightAt(x, z) + up, z)
}

// The chairlift: a straight line up the east-northeast side, from under the clouds
// to a knoll at the foot of the horn, so you finish looking up at the peak.
const LIFT_ANGLE = 330
const LIFT_FROM = 300
const LIFT_TO = 190
const LIFT_BOTTOM = around(LIFT_ANGLE, LIFT_FROM, 0)
const LIFT_TOP = around(LIFT_ANGLE, LIFT_TO, 0)
export const liftLine = new THREE.CatmullRomCurve3(
  Array.from({ length: 32 }, (_, i) => {
    const t = i / 31
    return around(LIFT_ANGLE, THREE.MathUtils.lerp(LIFT_FROM, LIFT_TO, t), 7)
  }),
)

// How far a point is from the lift line, ignoring height. Used to keep a clear cut through the forest.
function distanceToLift(x, z) {
  const dx = LIFT_TOP.x - LIFT_BOTTOM.x
  const dz = LIFT_TOP.z - LIFT_BOTTOM.z
  const t = THREE.MathUtils.clamp(((x - LIFT_BOTTOM.x) * dx + (z - LIFT_BOTTOM.z) * dz) / (dx * dx + dz * dz), 0, 1)
  return Math.hypot(x - (LIFT_BOTTOM.x + dx * t), z - (LIFT_BOTTOM.z + dz * t))
}

// Pines over most of the mountain, in patches with glades between, stopping at the treeline below the horn.
export function treeSpots(max = 3200) {
  const spots = []
  for (let i = 0; i < 20000 && spots.length < max; i++) {
    const angle = hash(i, 1) * Math.PI * 2
    const radius = 60 + Math.sqrt(hash(i, 2)) * 290
    const x = SUMMIT.x + Math.cos(angle) * radius
    const z = SUMMIT.z + Math.sin(angle) * radius
    const y = heightAt(x, z)
    const slope = Math.hypot(heightAt(x + 1, z) - heightAt(x - 1, z), heightAt(x, z + 1) - heightAt(x, z - 1)) / 2
    const forest = fbm(x * 0.03 + 3, z * 0.03)
    const aboveTreeline = y > toWorldHeight(1880)
    if (!aboveTreeline && slope < 1 && forest > 0.42 && distanceToLift(x, z) > 7) {
      // Smallish trees make the mountain feel bigger. tint varies each tree's shade a little.
      spots.push({ x, y, z, scale: 0.45 + hash(i, 4) * 0.55, tint: 0.88 + hash(i, 6) * 0.2, variant: Math.floor(hash(i, 5) * 3) })
    }
  }
  return spots
}

// A camera spot for a section: stand further out from the summit than the spot and look back toward it,
// level rather than up the slope, so the horizon stays in frame.
function view(angle, distance, back, up) {
  return { camera: around(angle, distance + back, up), look: around(angle, distance, up * 0.6) }
}

// Each place the camera can go. All sit above the cloud layer for now; the base areas come with the runs.
export const shots = {
  // Top of the lift: looking up at the horn, aimed below the tip so it towers over the frame.
  top: { camera: liftLine.getPointAt(1), look: SUMMIT.clone().setY(SUMMIT.y - 70) },
  about: view(200, 150, 50, 18),
  projects: view(80, 150, 50, 22),
  experience: view(330, 140, 50, 25),
  contact: view(250, 160, 40, 15),
}
