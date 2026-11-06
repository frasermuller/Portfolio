import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const COUNT = 2500
const BOX = 80 // flakes live in an 80-unit box that travels with the camera
const HALF = BOX / 2
const FALL = 3 // units per second

// Keep a value inside the box around the camera: a flake that drifts out one side comes back in the other.
const wrap = (value, center) => ((((value - center + HALF) % BOX) + BOX) % BOX) - HALF + center

// Made once when the file loads, not on every render.
const startPositions = new Float32Array(COUNT * 3).map(() => (Math.random() - 0.5) * BOX)

export default function Snow() {
  const ref = useRef()

  useFrame(({ camera, clock }, delta) => {
    const time = clock.elapsedTime
    const positions = ref.current.geometry.attributes.position.array
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3
      // Flakes stay put in the world, so when the camera moves you fly through them.
      positions[i3] = wrap(positions[i3] + Math.sin(time * 0.6 + i) * 0.4 * delta, camera.position.x)
      positions[i3 + 1] = wrap(positions[i3 + 1] - FALL * delta, camera.position.y)
      positions[i3 + 2] = wrap(positions[i3 + 2], camera.position.z)
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    // Flakes move far from where they started, so never let three.js skip drawing them.
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[startPositions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.3} transparent opacity={0.85} depthWrite={false} />
    </points>
  )
}
