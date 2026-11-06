import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CLIFFS, RUN_SPOTS, RUN_WIDTH, SUMMIT, distanceToLift, distanceToRun, fbm, hash, heightAt, slopeAt } from './terrain.js'

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

// Rocks are placed where real rock would be, not sprinkled everywhere:
// a line along each cliff band, outcrops around the summit, a few on the steepest ridges,
// and small boulder groups beside the run.
function rockSpots() {
  const spots = []
  const add = (x, z, size, seed) => {
    if (distanceToLift(x, z) < 5) return
    spots.push({ x, y: heightAt(x, z) - size * 0.35, z, size, turn: hash(seed, 3) * Math.PI * 2, shape: Math.floor(hash(seed, 7) * SHAPES.length) })
  }

  // Along each cliff band, just below the edge, in a slightly ragged double row.
  CLIFFS.forEach(([ax, az, bx, bz], c) => {
    const length = Math.hypot(bx - ax, bz - az)
    const across = [-(bz - az) / length, (bx - ax) / length] // points downhill
    for (let along = 0.06; along < 0.94; along += 2.4 / length) {
      const seed = c * 1000 + Math.round(along * 1000)
      const offset = 1 + hash(seed, 1) * 2.5
      add(ax + (bx - ax) * along + across[0] * offset, az + (bz - az) * along + across[1] * offset, 1.4 + hash(seed, 2) * 1.8, seed)
    }
  })

  // Outcrops on the steep ground around the summit, and on the steepest ridges further out, in clumps.
  for (let x = -260; x <= 260; x += 4) {
    for (let z = -300; z <= 200; z += 4) {
      const nearSummit = Math.hypot(x - SUMMIT.x, z - SUMMIT.z) < 60
      const clump = fbm(x * 0.03 + 5, z * 0.03 - 2)
      const keep = nearSummit ? hash(x, z) < 0.35 : clump > 0.6 && hash(x, z) < 0.25
      if (!keep || distanceToRun(x, z) < RUN_WIDTH || slopeAt(x, z) < (nearSummit ? 0.85 : 1)) continue
      add(x + (hash(z, x) - 0.5) * 3, z + (hash(x + 1, z) - 0.5) * 3, 1.3 + hash(x, z + 5) * 2.2, x * 31 + z)
    }
  }

  // Boulder groups of 3-4 sitting just off the edge of the run.
  for (let g = 0; g < 9; g++) {
    const point = RUN_SPOTS[Math.floor((g + 0.5) * (RUN_SPOTS.length / 9))]
    const side = g % 2 ? 1 : -1
    const cx = point[0] + side * (RUN_WIDTH + 4 + hash(g, 1) * 4)
    const cz = point[1] + (hash(g, 2) - 0.5) * 6
    for (let k = 0; k < 3 + (g % 2); k++) {
      add(cx + (hash(g, k + 3) - 0.5) * 6, cz + (hash(k + 3, g) - 0.5) * 6, 0.8 + hash(g, k + 9) * 1.4, g * 50 + k)
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
