import * as THREE from 'three'
import { toWorldHeight } from './terrain.js'

// A winter inversion: cloud fills the valleys up to about 1450 m, like the real Okanagan.
// Below it: whiteout and heavy snow. Above it: a clear sunset.
export const CLOUD_BASE = toWorldHeight(1250)
export const CLOUD_TOP = toWorldHeight(1450)

// 0 when the camera is under the clouds, 1 once it's above them, blending in between.
export function clearness(y) {
  return THREE.MathUtils.smoothstep(y, CLOUD_BASE + 4, CLOUD_TOP + 8)
}

// The sun sits low behind the lift, so the face of the horn you ride toward glows pink (alpenglow).
export const SUN = new THREE.Vector3(0.87, 0.14, -0.5).normalize()

export const COLORS = {
  whiteout: '#d9d3e4',
  // Opposite the sunset, the sky gets a pink band at the horizon over deep blue. Real thing, it's called the Belt of Venus.
  horizon: '#f2c5c6',
  middle: '#b9a2cf',
  top: '#2b3466',
  sun: '#fff1d9',
}
