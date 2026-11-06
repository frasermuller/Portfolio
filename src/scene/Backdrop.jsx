import { useMemo } from 'react'
import * as THREE from 'three'
import { ridged } from './terrain.js'
import { COLORS, SUN } from './weather.js'

const SIZE = 3600
const SNOW = new THREE.Color('#eef1f7')
const ROCK = new THREE.Color('#56636d')
const haze = new THREE.Color(COLORS.horizon)
const color = new THREE.Color()
const normal = new THREE.Vector3()

// A sea of big jagged peaks far beyond the mountain, so the view from the top goes on forever.
// It's one huge, coarse sheet: its middle is sunk out of sight under the real terrain.
function buildBackdrop() {
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, 180, 180).rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    // Rises fast just past the edge of the real terrain, so there's no long empty ramp up to the peaks.
    const ring = THREE.MathUtils.smoothstep(Math.hypot(x, z), 640, 720)
    const peaks = 260 * ridged(x * 0.0024 + 2, z * 0.0024 + 9) ** 2 + 45 * ridged(x * 0.009, z * 0.009) ** 2
    position.setY(i, ring * peaks - (1 - ring) * 80)
  }
  geometry.computeVertexNormals()

  // Snowy peaks with rock on the steep faces, lit once here (sunny side brighter), then washed toward the haze
  // colour like real distant mountains. Baking the light in means the material doesn't need lighting at all.
  const colors = []
  for (let i = 0; i < position.count; i++) {
    normal.fromBufferAttribute(geometry.attributes.normal, i)
    const sunlit = 0.72 + 0.28 * Math.max(normal.dot(SUN), 0)
    color.copy(SNOW).lerp(ROCK, THREE.MathUtils.smoothstep(normal.y, 0.7, 0.5)).multiplyScalar(sunlit).lerp(haze, 0.5)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geometry
}

export default function Backdrop() {
  const geometry = useMemo(() => buildBackdrop(), [])
  // Unlit, and fog off: at this distance the fog would hide them completely. The haze is painted into their colours instead.
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial vertexColors fog={false} />
    </mesh>
  )
}
