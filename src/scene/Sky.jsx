import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COLORS, SUN, clearness } from './weather.js'

// A huge sphere around the camera, painted from the inside by a small shader.
const material = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    uTop: { value: new THREE.Color(COLORS.top) },
    uMiddle: { value: new THREE.Color(COLORS.middle) },
    uHorizon: { value: new THREE.Color(COLORS.horizon) },
    uSun: { value: new THREE.Color(COLORS.sun) },
    uSunDir: { value: SUN },
    uFog: { value: new THREE.Color(COLORS.whiteout) },
    uOvercast: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = position; // the sphere is centred on the camera, so a point on it is also the direction you're looking
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uTop, uMiddle, uHorizon, uSun, uSunDir, uFog;
    uniform float uOvercast;
    varying vec3 vDir;
    void main() {
      vec3 dir = normalize(vDir);
      // Blend horizon -> middle -> top by how far up you're looking.
      vec3 color = mix(uHorizon, uMiddle, smoothstep(0.0, 0.18, dir.y));
      color = mix(color, uTop, smoothstep(0.18, 0.75, dir.y));
      // The sun: a tight bright disc, a soft glow, and a wide warm wash on that side of the sky.
      float s = max(dot(dir, uSunDir), 0.0);
      color += uSun * (pow(s, 900.0) * 2.0 + pow(s, 40.0) * 0.6 + pow(s, 5.0) * 0.25);
      // Under the clouds there's no sky, just whiteout.
      color = mix(color, uFog, uOvercast);
      gl_FragColor = vec4(color, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
})

export default function Sky() {
  const ref = useRef()

  useFrame(({ camera, scene }) => {
    ref.current.position.copy(camera.position)
    material.uniforms.uOvercast.value = 1 - clearness(camera.position.y)
    material.uniforms.uFog.value.copy(scene.fog.color)
  })

  return (
    // Drawn first and never in front of anything, so it's always the backdrop.
    <mesh ref={ref} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[2200, 32, 16]} />
    </mesh>
  )
}
