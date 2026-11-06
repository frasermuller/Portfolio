import { useMemo } from 'react'
import * as THREE from 'three'
import { fbm, ridged, smoothstep } from './terrain.js'
import { COLORS, SUN } from './weather.js'

const SIZE = 4200
const SNOW = new THREE.Color('#eef1f7')
const ROCK = new THREE.Color('#56636d')
const haze = new THREE.Color(COLORS.horizon)
const color = new THREE.Color()
const normal = new THREE.Vector3()

// Ranges beyond the mountain, out to the horizon. Close in they're craggy and crisp; the further out they go,
// the more the small detail is smoothed away and the more they melt into the haze, like real distant mountains.
function buildBackdrop() {
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, 260, 260).rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const r = Math.hypot(x, z)
    // Its middle is sunk out of sight under the real terrain, then it rises fast just past the edge.
    const ring = smoothstep(520, 610, r)
    const crags = 1 - smoothstep(700, 1700, r) // fine detail fades out with distance
    const peaks =
      300 * ridged(x * 0.0022 + 2, z * 0.0022 + 9) ** 2 +
      70 * ridged(x * 0.008, z * 0.008) ** 1.8 +
      22 * ridged(x * 0.03, z * 0.03) * crags
    position.setY(i, ring * peaks - (1 - ring) * 80)
  }
  geometry.computeVertexNormals()

  // Snow with rock on the steep faces, lit once here (sunny side brighter), then washed toward the haze colour:
  // a fair bit even on the nearest ranges, almost completely at the horizon. Baking it in means the material needs no lighting or fog.
  const colors = []
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    normal.fromBufferAttribute(geometry.attributes.normal, i)
    const wobble = (fbm(x * 0.02, z * 0.02) - 0.5) * 0.15
    const rock = smoothstep(0.72 + wobble, 0.55 + wobble, normal.y)
    const sunlit = 0.7 + 0.3 * Math.max(normal.dot(SUN), 0)
    const distance = smoothstep(550, 1900, Math.hypot(x, z))
    color.copy(SNOW).lerp(ROCK, rock).multiplyScalar(sunlit).lerp(haze, 0.4 + 0.55 * distance)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geometry
}

export default function Backdrop() {
  const geometry = useMemo(() => buildBackdrop(), [])
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial vertexColors fog={false} />
    </mesh>
  )
}
