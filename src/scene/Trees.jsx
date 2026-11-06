import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { treeSpots } from './terrain.js'

const HEIGHT = 7

// One draw call for every tree: an instanced mesh is the same cone stamped out hundreds of times.
export default function Trees() {
  const ref = useRef()
  const spots = useMemo(() => treeSpots(), [])

  useLayoutEffect(() => {
    const matrix = new THREE.Object3D()
    spots.forEach((spot, i) => {
      matrix.position.set(spot.x, spot.y + (HEIGHT / 2) * spot.scale - 0.5, spot.z)
      matrix.scale.setScalar(spot.scale)
      matrix.rotation.y = spot.x // any number works, it just stops every tree facing the same way
      matrix.updateMatrix()
      ref.current.setMatrixAt(i, matrix.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [spots])

  return (
    <instancedMesh ref={ref} args={[null, null, spots.length]}>
      <coneGeometry args={[2.2, HEIGHT, 5]} />
      <meshStandardMaterial color="#2f4a52" flatShading roughness={1} />
    </instancedMesh>
  )
}
