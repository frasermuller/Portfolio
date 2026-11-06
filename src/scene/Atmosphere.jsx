import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COLORS, SUN, clearness } from './weather.js'

const whiteout = new THREE.Color(COLORS.whiteout)
const horizon = new THREE.Color(COLORS.horizon)
const lerp = THREE.MathUtils.lerp

// Fog and light follow the camera's altitude, so every shot gets the right weather without setting it by hand.
export default function Atmosphere() {
  const sun = useRef()
  const sky = useRef()

  useFrame(({ camera, scene }) => {
    const clear = clearness(camera.position.y)
    // Thick fog under the clouds. Above them, just enough haze to fade the far ranges into the horizon.
    scene.fog.density = lerp(0.017, 0.0032, clear)
    scene.fog.color.lerpColors(whiteout, horizon, clear)
    // Under the clouds the light is flat and grey. Above, the low sun takes over.
    sun.current.intensity = lerp(0.4, 2.4, clear)
    sky.current.intensity = lerp(1.5, 1.0, clear)
  })

  return (
    <>
      <fogExp2 attach="fog" args={[COLORS.whiteout, 0.017]} />
      <hemisphereLight ref={sky} args={['#e4e0ff', '#5a6290', 1.5]} />
      <directionalLight ref={sun} position={SUN.clone().multiplyScalar(300)} color="#ffb59e" intensity={0.4} />
    </>
  )
}
