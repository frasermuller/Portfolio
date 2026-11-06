import * as THREE from 'three'

// The cloud layer sits across the valleys. Below it: whiteout and heavy snow. Above it: a clear sunset.
export const CLOUD_BASE = 30
export const CLOUD_TOP = 46

// 0 when the camera is under the clouds, 1 once it's above them, blending in between.
export function clearness(y) {
  return THREE.MathUtils.smoothstep(y, CLOUD_BASE + 4, CLOUD_TOP + 8)
}

// The sun sits low in the west-southwest, behind the lift, so it lights the peak pink (alpenglow).
export const SUN = new THREE.Vector3(-1, 0.12, 0.3).normalize()

export const COLORS = {
  whiteout: '#d9d3e4',
  // Opposite the sunset, the sky gets a pink band at the horizon over deep blue. Real thing, it's called the Belt of Venus.
  horizon: '#f2c5c6',
  middle: '#b9a2cf',
  top: '#2b3466',
  sun: '#fff1d9',
}
