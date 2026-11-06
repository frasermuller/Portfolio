import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { hash, heightAt, slopeAt, distanceToLift } from './terrain.js'

const ROCK = new THREE.Color('#4d5a64')
const SNOW = new THREE.Color('#f3f5fa')

// A chunky faceted rock: a ball with its corners pushed in and out at random, squashed a bit,
// with snow on every face that points up.
function rockShape(seed) {
  const geometry = new THREE.IcosahedronGeometry(1, 1)
  const position = geometry.attributes.position
  const corner = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    corner.fromBufferAttribute(position, i)
    // Same corner, same push, so the shared corners of neighbouring faces stay joined.
    const push = 0.7 + hash(Math.round(corner.x * 10) + seed, Math.round(corner.y * 10 + corner.z * 7)) * 0.55
    position.setXYZ(i, corner.x * push * 1.2, corner.y * push * 0.75, corner.z * push)
  }
  const flat = geometry.toNonIndexed()
  flat.computeVertexNormals()
  const normals = flat.attributes.normal
  const colors = []
  for (let i = 0; i < normals.count; i += 3) {
    const up = (normals.getY(i) + normals.getY(i + 1) + normals.getY(i + 2)) / 3
    const color = up > 0.55 ? SNOW : ROCK
    for (let k = 0; k < 3; k++) colors.push(color.r, color.g, color.b)
  }
  flat.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return flat
}

const SHAPES = [1, 2, 3, 4].map(rockShape)

// Rocks go on the cliff bands (anywhere steep), plus the odd boulder sitting out on the open snow.
function rockSpots() {
  const spots = []
  for (let x = -480; x <= 480; x += 5) {
    for (let z = -480; z <= 480; z += 5) {
      const r = hash(x, z)
      const slope = slopeAt(x, z)
      const onCliff = slope > 1.05 && r < 0.18
      const boulder = slope < 0.6 && r < 0.004
      if (!onCliff && !boulder) continue
      const y = heightAt(x, z)
      if (y < 12 || distanceToLift(x, z) < 12) continue
      spots.push({
        x: x + (hash(z, x) - 0.5) * 4,
        y: y - 1.5, // sunk in a little, so they look embedded in the slope rather than sitting on it
        z: z + (hash(x + 1, z) - 0.5) * 4,
        size: onCliff ? 1.5 + (r / 0.18) * 4 : 1.5 + hash(z, 9) * 2.5,
        turn: hash(x, z + 3) * Math.PI * 2,
        shape: Math.floor(hash(x + 7, z) * SHAPES.length),
      })
    }
  }
  return spots
}

function RockSet({ geometry, spots }) {
  const ref = useRef()

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    spots.forEach((spot, i) => {
      dummy.position.set(spot.x, spot.y, spot.z)
      dummy.scale.setScalar(spot.size)
      dummy.rotation.set(0, spot.turn, 0) // only spin around the vertical, so the snow stays on top
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [spots])

  return (
    <instancedMesh ref={ref} args={[geometry, null, spots.length]} castShadow receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={0.95} />
    </instancedMesh>
  )
}

export default function Rocks() {
  const spots = useMemo(() => rockSpots(), [])
  return SHAPES.map((geometry, i) => (
    <RockSet key={i} geometry={geometry} spots={spots.filter((spot) => spot.shape === i)} />
  ))
}
