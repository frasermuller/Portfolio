import * as THREE from 'three'

// Low cloud sits in the valley over the lake and village. Below it: whiteout and heavy snow.
// Above it: clear golden-hour light on the mountain.
export const CLOUD_BASE = 14
export const CLOUD_TOP = 40

// 0 when the camera is under the clouds, 1 once it's above them, blending in between.
export function clearness(y) {
  return THREE.MathUtils.smoothstep(y, CLOUD_BASE + 4, CLOUD_TOP + 8)
}

// Late golden hour: the sun is low in the west-southwest, glowing off to the side of the view from the bench
// and throwing long shadows across the south face.
export const SUN = new THREE.Vector3(-0.85, 0.2, 0.48).normalize()

export const COLORS = {
  whiteout: '#d9dce6',
  horizon: '#dbe4f0', // a cool haze that distant mountains fade into
  middle: '#7ea2dc', // clear blue a little way up
  top: '#2c529c', // deep blue overhead
  sun: '#fff1d9',
  glow: '#ffc58f', // the warm wash low in the sky around the sun
}
