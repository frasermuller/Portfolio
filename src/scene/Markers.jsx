import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { RUN_SPOTS, RUN_WIDTH, TOP, heightAt } from './terrain.js'

const ORANGE = new THREE.Color('#ff6b1f')
const TIP = new THREE.Color('#22252e')

// One pole: orange with a dark tip, about 2.6 m tall. Painted per face, by height, like the trees.
const pole = new THREE.CylinderGeometry(0.05, 0.06, 1.3, 6, 5).translate(0, 0.65, 0).toNonIndexed()
const colors = []
for (let i = 0; i < pole.attributes.position.count; i += 3) {
  const y = (pole.attributes.position.getY(i) + pole.attributes.position.getY(i + 1) + pole.attributes.position.getY(i + 2)) / 3
  const color = y > 1.04 ? TIP : ORANGE
  for (let k = 0; k < 3; k++) colors.push(color.r, color.g, color.b)
}
pole.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

// Marker poles down both edges of the run every ~10 units, the way resorts mark a piste,
// so you can follow it down from the top. None up on the platform.
const EDGE = RUN_WIDTH * 0.8 + 0.8
const spots = []
for (let i = 1; i < RUN_SPOTS.length - 1; i += 2) {
  const [x, z] = RUN_SPOTS[i]
  const [ax, az] = RUN_SPOTS[i - 1]
  const [bx, bz] = RUN_SPOTS[i + 1]
  const length = Math.hypot(bx - ax, bz - az)
  for (const side of [-1, 1]) {
    // Square to the way the run is heading.
    const px = x + ((bz - az) / length) * EDGE * side
    const pz = z - ((bx - ax) / length) * EDGE * side
    if (Math.hypot(px - TOP.x, pz - TOP.z) > TOP.radius + 8) spots.push([px, heightAt(px, pz) - 0.1, pz])
  }
}

export default function Markers() {
  const ref = useRef()

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    spots.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={ref} args={[pole, null, spots.length]} castShadow>
      <meshStandardMaterial vertexColors roughness={0.7} />
    </instancedMesh>
  )
}
