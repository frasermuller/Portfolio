import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { LIFT_BOTTOM, LIFT_TOP, TOWERS, heightAt, liftLine } from './terrain.js'
import { EYE, ride } from './lift.js'

// The chairlift, modelled in Blender (blender/chairlift.blend) and laid out here along the lift line:
// a tower on every TOWERS spot, two cables, a station at each end, and chairs going up and down.
// Your own chair (with your legs, boots and skis) rides along under the camera.

const URL = `${import.meta.env.BASE_URL}models/chairlift.glb`
const SCALE = 0.5 // the model is in metres; 1 unit is 2 m
const LINE_GAP = 2.4 // units between the up and down cables
const WHEEL_TOP = 0.535 // how far above the top of a pole the cable sits on the wheels
const SPACING = 14 // units between chairs
const COLORS = ['#e0483a', '#f2b630', '#2f7fd0', '#1fb3a3'].map((c) => new THREE.Color(c))

// Which way is up the line, and the turn that points a model's forward (-Z) that way.
const heading = new THREE.Vector3(LIFT_TOP.x - LIFT_BOTTOM.x, 0, LIFT_TOP.z - LIFT_BOTTOM.z).normalize()
const TURN = Math.atan2(-heading.x, -heading.z)
const across = new THREE.Vector3(-heading.z, 0, heading.x) // the model's +X (right, facing up the line)
// From your eye to the grip, and from the up cable over to the down cable, in world terms.
const toGrip = across.clone().multiplyScalar(-EYE.x).add(new THREE.Vector3(0, -EYE.y, 0)).addScaledVector(heading, EYE.z)
const toDown = across.clone().multiplyScalar(-LINE_GAP)

const UP = new THREE.Vector3() // the up cable runs right through the grips
const gripAt = (u, target) => liftLine.getPointAt(u, target).add(toGrip)

// A node from the file as a list of meshes (one per material).
const parts = (node) => (node.isMesh ? [node] : node.children.filter((child) => child.isMesh))

// The cables: tubes following the ride line, lifted up to the grips.
function Cable({ offset }) {
  const geometry = useMemo(() => {
    const points = Array.from({ length: 240 }, (_, i) => gripAt(i / 239, new THREE.Vector3()).add(offset))
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 600, 0.025, 5, false)
  }, [offset])
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#2b2e33" roughness={0.6} />
    </mesh>
  )
}

function Towers({ nodes }) {
  return TOWERS.map((tower, i) => {
    // The tower stands between the two cables, under the up cable's height at that spot.
    const cable = new THREE.Vector3(tower.x, tower.ground + tower.height, tower.z).add(toGrip)
    const middle = cable.clone().addScaledVector(across, -LINE_GAP / 2)
    const ground = heightAt(middle.x, middle.z)
    const top = cable.y - WHEEL_TOP
    return (
      <group key={i} position={[middle.x, 0, middle.z]} rotation-y={TURN}>
        <primitive object={nodes.TowerFooting.clone()} position-y={ground} scale={SCALE} />
        {/* The pole is a metre tall in the file; stretch it to reach the cable. */}
        <primitive object={nodes.TowerPole.clone()} position-y={ground} scale={[SCALE, top - ground, SCALE]} />
        <primitive object={nodes.TowerHead.clone()} position-y={top} scale={SCALE} />
      </group>
    )
  })
}

// A station at each end. The top one faces up the line (chairs arrive on the up cable); the bottom one is turned
// round, so the chairs coming down arrive into it.
function Stations({ nodes }) {
  const top = gripAt(1, new THREE.Vector3())
  const bottom = gripAt(0, new THREE.Vector3()).add(toDown)
  return [
    [top, TURN],
    [bottom, TURN + Math.PI],
  ].map(([at, turn], i) => (
    <primitive key={i} object={nodes.Terminal.clone()} position={[at.x, heightAt(at.x, at.z), at.z]} rotation-y={turn} scale={SCALE} />
  ))
}

// Every other chair on the cable: one instanced mesh per material, all moved together each frame.
// They follow your chair, so they keep exactly the same spacing from it as you ride.
const COUNT = Math.floor(liftLine.getLength() / SPACING)
const dummy = new THREE.Object3D()
const spot = new THREE.Vector3()

function Chairs({ nodes }) {
  const meshes = useMemo(() => parts(nodes.Chair), [nodes])
  const group = useRef()
  const cable = useRef(0)

  // Paint each chair one of the retro colours (only the cushions take the colour).
  useLayoutEffect(() => {
    for (const mesh of group.current.children) {
      if (mesh.material.name !== 'ChairPaint') continue
      for (let i = 0; i < COUNT * 2; i++) mesh.setColorAt(i, COLORS[i % COLORS.length])
      mesh.instanceColor.needsUpdate = true
    }
  }, [meshes])

  useFrame(({ clock }, delta) => {
    // While you ride, the cable moves with you. Once you're off, it keeps running on its own.
    cable.current = ride.t < 1 ? ride.t : cable.current + delta / 40
    const time = clock.elapsedTime
    for (let i = 0; i < COUNT * 2; i++) {
      const up = i < COUNT
      const k = up ? i : i - COUNT
      const u = (cable.current + (k + (up ? 0 : 0.5)) / COUNT) % 1
      if (up) gripAt(u, spot)
      else gripAt(1 - u, spot).add(toDown)
      dummy.position.copy(spot)
      // Hide the chair you're sitting in (it's drawn with you in it, below).
      dummy.scale.setScalar(up && k === 0 && ride.t < 1 ? 0 : SCALE)
      // A gentle swing on each one, out of step with the others.
      dummy.rotation.set(Math.sin(time * 1.3 + i * 1.7) * 0.03, TURN + (up ? 0 : Math.PI), 0, 'YXZ')
      dummy.updateMatrix()
      for (const mesh of group.current.children) mesh.setMatrixAt(i, dummy.matrix)
    }
    group.current.children.forEach((mesh) => mesh.instanceMatrix.needsUpdate = true)
  })

  return (
    <group ref={group}>
      {meshes.map((part) => (
        <instancedMesh key={part.uuid} args={[part.geometry, part.material, COUNT * 2]} frustumCulled={false} />
      ))}
    </group>
  )
}

// Your chair, with you in it, right under the camera while you ride.
function MyChair({ nodes }) {
  const group = useRef()
  const rider = useMemo(() => nodes.Rider.clone(), [nodes])
  // Its own copy of the cushion paint (the shared one is white, tinted per chair on the cable): you ride a red one.
  const chair = useMemo(() => {
    const copy = nodes.Chair.clone()
    copy.traverse((child) => {
      if (child.material?.name === 'ChairPaint') child.material = child.material.clone()
      if (child.material?.name === 'ChairPaint') child.material.color.copy(COLORS[0])
    })
    return copy
  }, [nodes])

  useFrame(() => {
    group.current.visible = ride.t < 1
    if (group.current.visible) gripAt(ride.t, group.current.position)
  })

  return (
    <group ref={group} rotation-y={TURN} scale={SCALE}>
      <primitive object={chair} />
      <primitive object={rider} />
    </group>
  )
}

export default function Chairlift() {
  const { nodes, materials } = useGLTF(URL)
  const shadowsRedrawn = useRef(false)

  useLayoutEffect(() => {
    // No shiny metal: there's no sky reflection map in this scene, so metal would just look black.
    for (const material of Object.values(materials)) material.metalness = 0
    // The chair cushions get their colour per chair, so their base colour is plain white.
    materials.ChairPaint.color.set('#ffffff')
    // Static parts cast shadows. The shadow map is only drawn once, and this loads after that, so redraw it.
    for (const name of ['TowerPole', 'TowerHead', 'TowerFooting', 'Terminal']) {
      nodes[name].traverse((child) => (child.castShadow = child.receiveShadow = true))
    }
  }, [nodes, materials])
  useFrame(({ gl }) => {
    if (shadowsRedrawn.current) return
    gl.shadowMap.needsUpdate = true
    shadowsRedrawn.current = true
  })

  return (
    <>
      <Towers nodes={nodes} />
      <Stations nodes={nodes} />
      <Cable offset={UP} />
      <Cable offset={toDown} />
      <Chairs nodes={nodes} />
      <MyChair nodes={nodes} />
    </>
  )
}

useGLTF.preload(URL)
