import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { heightAt } from './terrain.js'
import { CLOUD_BASE, CLOUD_TOP } from './weather.js'

const CLUSTERS = 320
const PUFFS_PER_CLUSTER = 5

// A sea of chunky low-poly puffs. Each cluster is a few squashed balls bunched together, like a cartoon cumulus.
function buildPuffs() {
  const puffs = []
  for (let i = 0; i < CLUSTERS; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 40 + Math.sqrt(Math.random()) * 480 // sqrt spreads them evenly instead of crowding the middle
    const cx = Math.cos(angle) * radius
    const cz = Math.sin(angle) * radius
    const cy = CLOUD_BASE + Math.random() * (CLOUD_TOP - CLOUD_BASE - 6)
    if (heightAt(cx, cz) > cy + 6) continue // buried inside a mountain, nobody would see it
    for (let k = 0; k < PUFFS_PER_CLUSTER; k++) {
      const size = 7 + Math.random() * 13
      puffs.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + Math.random() * 5,
        z: cz + (Math.random() - 0.5) * 40,
        size,
      })
    }
  }
  return puffs
}

// Made once when the file loads, so they don't reshuffle on every render.
const puffs = buildPuffs()

export default function Clouds() {
  const ref = useRef()

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    puffs.forEach((puff, i) => {
      dummy.position.set(puff.x, puff.y, puff.z)
      dummy.scale.set(puff.size, puff.size * 0.45, puff.size)
      dummy.rotation.y = puff.x
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [])

  // The whole sea turns very slowly around the mountain (one lap every half hour or so).
  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.004
  })

  return (
    <instancedMesh ref={ref} args={[null, null, puffs.length]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
      {/* A little glow of their own, so the undersides stay soft grey instead of going dark. */}
      <meshStandardMaterial color="#fbf7ff" emissive="#c9c2dc" emissiveIntensity={0.45} flatShading roughness={1} />
    </instancedMesh>
  )
}
