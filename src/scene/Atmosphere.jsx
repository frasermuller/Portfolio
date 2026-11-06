import { useLayoutEffect, useRef } from 'react'
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

  // The sun's shadows cover the whole mountain: a 900-unit box looking down the sun's direction.
  useLayoutEffect(() => {
    const shadow = sun.current.shadow
    shadow.mapSize.set(4096, 4096)
    Object.assign(shadow.camera, { left: -450, right: 450, top: 450, bottom: -450, near: 1, far: 1600 })
    shadow.camera.updateProjectionMatrix()
    // Nudge the shadows off the surface they're cast from, so slopes don't speckle themselves (shadow acne).
    shadow.bias = -0.0004
    shadow.normalBias = 0.6
  }, [])

  useFrame(({ camera, scene }) => {
    const clear = clearness(camera.position.y)
    // Thick fog under the clouds. Above them, just enough haze to soften the far side of the mountain.
    scene.fog.density = lerp(0.017, 0.0013, clear)
    scene.fog.color.lerpColors(whiteout, horizon, clear)
    // Under the clouds the light is flat and grey. Above, the low sun takes over.
    sun.current.intensity = lerp(0.5, 2.6, clear)
    sky.current.intensity = lerp(1.6, 1.5, clear)
  })

  return (
    <>
      <fogExp2 attach="fog" args={[COLORS.whiteout, 0.017]} />
      {/* Blue from the sky above fills in the shadows, so shaded snow goes cool blue instead of grey. */}
      <hemisphereLight ref={sky} args={['#bfd0f5', '#7d8aa8', 1.6]} />
      <directionalLight ref={sun} position={SUN.clone().multiplyScalar(700)} color="#ffe0c2" intensity={0.5} castShadow />
    </>
  )
}
