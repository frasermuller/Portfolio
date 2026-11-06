import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Cloud, Clouds as CloudGroup } from '@react-three/drei'
import * as THREE from 'three'
import { hash, heightAt } from './terrain.js'
import { CLOUD_BASE, CLOUD_TOP } from './weather.js'

// One soft puff, drawn on a canvas: a few overlapping fuzzy circles so the edge isn't a perfect disc.
// drei's clouds are built from many of these as camera-facing cards, stacked and faded together.
function makePuff() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')
  for (const [x, y, r] of [[64, 70, 50], [44, 60, 30], [84, 58, 32], [64, 46, 30]]) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, r)
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 128, 128)
  }
  return canvas.toDataURL()
}
const puff = makePuff()

// Where the cloud banks sit: over the valleys, anywhere the ground is below the top of the cloud layer.
const banks = []
for (let i = 0; banks.length < 80 && i < 3000; i++) {
  const angle = hash(i, 11) * Math.PI * 2
  const radius = 70 + Math.sqrt(hash(i, 12)) * 420
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius
  if (heightAt(x, z) < CLOUD_TOP - 12) banks.push({ x, z, seed: i })
}

export default function Clouds() {
  const ref = useRef()

  // The whole sea turns very slowly around the mountain (one lap every half hour or so).
  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.004
  })

  return (
    <group ref={ref}>
      <CloudGroup texture={puff} limit={1400} material={THREE.MeshLambertMaterial}>
        {banks.map((bank) => (
          <Cloud
            key={bank.seed}
            seed={bank.seed}
            position={[bank.x, (CLOUD_BASE + CLOUD_TOP) / 2, bank.z]}
            bounds={[75, (CLOUD_TOP - CLOUD_BASE) / 3, 75]}
            segments={16}
            volume={45}
            smallestVolume={0.4}
            growth={3}
            speed={0.05}
            opacity={0.85}
            fade={60}
            color="#ffffff"
          />
        ))}
      </CloudGroup>
    </group>
  )
}
