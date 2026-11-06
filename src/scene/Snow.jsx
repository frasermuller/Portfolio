import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clearness } from './weather.js'

const COUNT = 7000
const BOX = 80 // flakes live in an 80-unit box that travels with the camera
const HALF = BOX / 2
const FALL = 3 // units per second

// Keep a value inside the box around the camera: a flake that drifts out one side comes back in the other.
const wrap = (value, center) => ((((value - center + HALF) % BOX) + BOX) % BOX) - HALF + center

// Made once when the file loads, not on every render.
const startPositions = new Float32Array(COUNT * 3).map(() => (Math.random() - 0.5) * BOX)

// A soft round dot, drawn on a tiny canvas, so flakes aren't hard squares.
function makeFlake() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const context = canvas.getContext('2d')
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.85)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(canvas)
}
const flake = makeFlake()

export default function Snow() {
  const ref = useRef()
  const material = useRef()

  useFrame(({ camera, clock }, delta) => {
    const time = clock.elapsedTime
    const positions = ref.current.geometry.attributes.position.array
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3
      // Flakes stay put in the world, so when the camera moves you fly through them.
      // (i % 7) gives each flake one of a few speeds, so they don't fall in lockstep.
      positions[i3] = wrap(positions[i3] + Math.sin(time * 0.6 + i) * 0.5 * delta, camera.position.x)
      positions[i3 + 1] = wrap(positions[i3 + 1] - FALL * (0.7 + (i % 7) * 0.1) * delta, camera.position.y)
      positions[i3 + 2] = wrap(positions[i3 + 2], camera.position.z)
    }
    ref.current.geometry.attributes.position.needsUpdate = true
    // Heavy snow under the clouds, just a few stray flakes up in the sunset.
    material.current.opacity = THREE.MathUtils.lerp(0.95, 0.12, clearness(camera.position.y))
  })

  return (
    // Flakes move far from where they started, so never let three.js skip drawing them.
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[startPositions, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={material} map={flake} color="#ffffff" size={0.45} transparent depthWrite={false} />
    </points>
  )
}
