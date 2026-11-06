import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { treeSpots } from './terrain.js'

const NEEDLES = new THREE.Color('#2f5a4e')
const SNOW = new THREE.Color('#f3f0fa')
const TRUNK = new THREE.Color('#5a4036')

// Give every triangle one flat colour, picked from how high its middle sits.
function paint(geometry, pick) {
  const flat = geometry.toNonIndexed()
  const position = flat.attributes.position
  const colors = []
  for (let i = 0; i < position.count; i += 3) {
    const y = (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3
    const color = pick(y)
    for (let k = 0; k < 3; k++) colors.push(color.r, color.g, color.b)
  }
  flat.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return flat
}

// A pine is a trunk plus stacked cones. Each cone has snow sitting on its top third.
function pine(tiers) {
  const trunk = paint(new THREE.CylinderGeometry(0.35, 0.45, 1.6, 5).translate(0, 0.8, 0), () => TRUNK)
  const cones = tiers.map(([radius, height, base]) =>
    paint(new THREE.ConeGeometry(radius, height, 7, 3).translate(0, base + height / 2, 0), (y) =>
      y > base + height * 0.62 ? SNOW : NEEDLES,
    ),
  )
  return mergeGeometries([trunk, ...cones])
}

// Three kinds, so the forest doesn't look stamped out: [radius, height, where the tier starts].
const KINDS = [
  pine([[2.0, 3.6, 1.2], [1.5, 3.0, 3.4], [1.0, 2.6, 5.4]]), // tall skinny spruce
  pine([[2.8, 3.4, 1.0], [2.1, 3.0, 3.0], [1.3, 2.6, 4.8]]), // big round fir
  pine([[1.6, 2.6, 0.8], [1.0, 2.0, 2.2]]), // little one
]

function Forest({ geometry, spots }) {
  const ref = useRef()

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    spots.forEach((spot, i) => {
      dummy.position.set(spot.x, spot.y - 0.4, spot.z)
      dummy.scale.setScalar(spot.scale)
      dummy.rotation.y = spot.x // any number works, it just stops every tree facing the same way
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [spots])

  // One draw call per kind: an instanced mesh stamps the same tree out hundreds of times.
  return (
    <instancedMesh ref={ref} args={[geometry, null, spots.length]}>
      <meshStandardMaterial vertexColors flatShading roughness={1} />
    </instancedMesh>
  )
}

export default function Trees() {
  const spots = useMemo(() => treeSpots(), [])

  return KINDS.map((geometry, kind) => (
    <Forest key={kind} geometry={geometry} spots={spots.filter((spot) => spot.variant === kind)} />
  ))
}
