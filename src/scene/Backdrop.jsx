import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fbm, ridged, smoothstep } from './terrain.js'
import { COLORS, SUN, clearness } from './weather.js'

const SIZE = 2600
const SNOW = new THREE.Color('#eef1f7')
const ROCK = new THREE.Color('#56636d')
const haze = new THREE.Color(COLORS.horizon)
const glow = new THREE.Color('#f6dcc4') // haze on the side of the sky the sun is on is warmer
const color = new THREE.Color()
const normal = new THREE.Vector3()
const sunAround = new THREE.Vector2(SUN.x, SUN.z).normalize()

// The nearest ring of ranges, just past the mountain: real 3D peaks with snow, rock and sunlight baked in.
function buildNearRanges() {
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, 260, 260).rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const r = Math.hypot(x, z)
    // Its middle is sunk out of sight under the real terrain, it rises fast just past the edge,
    // and it sinks away again past ~1100 where the flat layers take over.
    const ring = smoothstep(520, 610, r) * (1 - smoothstep(950, 1200, r))
    const crags = 1 - smoothstep(700, 1100, r) // fine detail fades out with distance
    // Kept lowish, so from the top the layers behind still show over them.
    const peaks =
      190 * ridged(x * 0.0022 + 2, z * 0.0022 + 9) ** 2 +
      55 * ridged(x * 0.008, z * 0.008) ** 1.8 +
      22 * ridged(x * 0.03, z * 0.03) * crags
    position.setY(i, ring * peaks - (1 - ring) * 80)
  }
  // Faceted: every triangle gets its own flat normal and one colour, so ridges read as crisp rock and snow
  // instead of soft white blobs (which from far away look like cloud).
  const faceted = geometry.toNonIndexed()
  faceted.computeVertexNormals()
  const flat = faceted.attributes.position

  // Snow on the gentler faces, rock on the steep ones, lit once here (sunny side brighter), then washed toward
  // the haze colour, more the further out. Baking it in means the material needs no lighting or fog.
  const colors = []
  for (let i = 0; i < flat.count; i += 3) {
    const x = (flat.getX(i) + flat.getX(i + 1) + flat.getX(i + 2)) / 3
    const z = (flat.getZ(i) + flat.getZ(i + 1) + flat.getZ(i + 2)) / 3
    normal.fromBufferAttribute(faceted.attributes.normal, i)
    const wobble = (fbm(x * 0.02, z * 0.02) - 0.5) * 0.15
    const rock = smoothstep(0.78 + wobble, 0.66 + wobble, normal.y)
    const sunlit = 0.62 + 0.38 * Math.max(normal.dot(SUN), 0)
    const distance = smoothstep(550, 1150, Math.hypot(x, z))
    color.copy(SNOW).lerp(ROCK, rock).multiplyScalar(sunlit).lerp(haze, 0.22 + 0.45 * distance)
    for (let k = 0; k < 3; k++) colors.push(color.r, color.g, color.b)
  }
  faceted.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return faceted
}

// Further out, ranges are flat silhouettes in rings around everything, like layers in a painting:
// each one paler and bluer than the one in front, its foot lost in valley haze, its snowy tops catching the light.
// They're far enough away that you never see they're flat. Each one stands a bit higher than the one in front,
// so from the top you see ridge behind ridge behind ridge.
const LAYERS = [
  { radius: 1250, base: 190, height: 170, seed: 3, body: '#58709a', fade: 0.12 },
  { radius: 1650, base: 235, height: 200, seed: 11, body: '#7a93bb', fade: 0.3 },
  { radius: 2050, base: 280, height: 230, seed: 23, body: '#9fb3d2', fade: 0.48 },
]
const AROUND = 1024 // points around each ring
const ROWS = 4

function buildLayer({ radius, base, height, seed, body, fade }) {
  const positions = []
  const colors = []
  const bodyColor = new THREE.Color(body)
  for (let i = 0; i <= AROUND; i++) {
    const angle = (i / AROUND) * Math.PI * 2
    const cx = Math.cos(angle)
    const cz = Math.sin(angle)
    // Noise read around a circle, so the skyline joins up seamlessly where it meets itself.
    // Big ranges, then craggy shoulders on them, then a little jaggedness along every ridge.
    const peak =
      ridged(cx * 2.2 + seed, cz * 2.2 - seed) ** 2 * 0.62 +
      ridged(cx * 7 + seed, cz * 7) ** 1.5 * 0.28 +
      ridged(cx * 30, cz * 30 + seed) * 0.12
    const top = base + height * peak
    // Toward the sun the haze is warmer and brighter.
    const sunward = Math.max(cx * sunAround.x + cz * sunAround.y, 0) ** 3
    const tint = haze.clone().lerp(glow, sunward * 0.7)
    // Rows down the band: a snowy cap on the high peaks, the body, and the foot fading into haze.
    const snow = smoothstep(0.3, 0.6, peak)
    const cap = bodyColor.clone().lerp(SNOW, 0.75 * snow).lerp(tint, fade)
    const rows = [
      [top, cap],
      [top - height * 0.07, cap],
      [top - height * 0.12, bodyColor.clone().lerp(tint, fade)],
      [base - 160, tint],
    ]
    for (const [y, c] of rows) {
      positions.push(cx * radius, y, cz * radius)
      colors.push(c.r, c.g, c.b)
    }
  }
  const index = []
  for (let i = 0; i < AROUND; i++) {
    for (let row = 0; row < ROWS - 1; row++) {
      const a = i * ROWS + row
      const b = (i + 1) * ROWS + row
      index.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(index)
  return geometry
}

// One material for all of it. It ignores fog (the haze is baked in), so instead it fades out by itself
// when you're down in the whiteout, where you shouldn't see any distant mountains at all.
const material = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide, transparent: true })

export default function Backdrop() {
  const near = useMemo(() => buildNearRanges(), [])
  const layers = useMemo(() => LAYERS.map(buildLayer), [])

  useFrame(({ camera }) => {
    material.opacity = clearness(camera.position.y)
    material.visible = material.opacity > 0.01
  })

  return (
    <>
      {/* Farthest first, so each layer is drawn over the ones behind it, and all before the clouds. */}
      {layers.toReversed().map((geometry, i) => (
        <mesh key={i} geometry={geometry} material={material} frustumCulled={false} renderOrder={i - 10} />
      ))}
      <mesh geometry={near} material={material} renderOrder={LAYERS.length - 10} />
    </>
  )
}
