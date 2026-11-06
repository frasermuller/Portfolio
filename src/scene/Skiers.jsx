import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { CLIFFS, RUN_SPOTS, RUN_WIDTH, hash, heightAt } from './terrain.js'

// Skiers on the mountain. Animated in code, no physics: each one carves S-turns down the main run, leaning into
// every turn and kicking up snow. Now and then someone wipes out (click one to make it happen), tumbles, lies there
// a moment and gets back up. And one show-off keeps sending the cliff band under the lift with a backflip.

const URL = `${import.meta.env.BASE_URL}models/skier.glb`
const SCALE = 0.65 // the model is in metres (1 unit is 2 m), drawn a bit bigger than life so you can pick them out from the top
const RUNNERS = 12
const JUMPER = RUNNERS // the cliff jumper uses the slot after the run skiers
const COUNT = RUNNERS + 1
const GRAVITY = 4.9 // units/s² (9.8 m/s²)
const BODY = 0.58 // height of a skier's middle, which they tumble and flip around

// Who wears what. Each skier picks a jacket, pants, helmet and skis from these.
const PALETTES = {
  SkierJacket: ['#e8463a', '#2f7fd0', '#f2b630', '#1fb3a3', '#8e5bd6', '#ff7a2f', '#f4f6fb', '#2b2e33'],
  SkierPants: ['#2b3650', '#1e2128', '#3d4a5c', '#f2b630', '#e8463a', '#f4f6fb'],
  SkierHelmet: ['#f4f6fb', '#1e2128', '#e8463a', '#2f7fd0', '#f2b630'],
  SkierSkis: ['#ff5a3c', '#1fb3a3', '#f2b630', '#2f7fd0', '#e8e8e8'],
}

// The main run as a smooth line, measured in units along it.
const run = new THREE.CatmullRomCurve3(RUN_SPOTS.map(([x, z]) => new THREE.Vector3(x, 0, z)))
const RUN_LENGTH = run.getLength()

const skiers = Array.from({ length: RUNNERS }, (_, i) => ({
  s: (i / RUNNERS) * RUN_LENGTH, // spread down the run to start with
  speed: 5.5 + hash(i, 1) * 3,
  amp: RUN_WIDTH * (0.25 + hash(i, 2) * 0.3), // how wide their turns are
  wave: 32 + hash(i, 3) * 22, // and how long
  phase: hash(i, 4) * Math.PI * 2,
  wipe: -1, // seconds into a wipeout, or -1 when skiing
  wait: 0, // seconds left at the top before setting off again
  spray: 0,
}))

// --- Where things are, built fresh each frame.
const up = new THREE.Vector3(0, 1, 0)
const point = new THREE.Vector3()
const tangent = new THREE.Vector3()
const side = new THREE.Vector3()
const forward = new THREE.Vector3()
const normal = new THREE.Vector3()
const right = new THREE.Vector3()
const back = new THREE.Vector3()
const base = new THREE.Matrix4()
const spin = new THREE.Matrix4()
const pivot = new THREE.Matrix4()
const unpivot = new THREE.Matrix4()
const scale = new THREE.Matrix4()
const hidden = new THREE.Matrix4().makeScale(0, 0, 0)

// The snow's tilt under (x, z), leaned partway back toward straight up: skiers stand square to the slope, mostly.
function groundNormal(x, z, target) {
  target.set(heightAt(x - 0.5, z) - heightAt(x + 0.5, z), 1, heightAt(x, z - 0.5) - heightAt(x, z + 0.5)).normalize()
  return target.lerp(up, 0.3).normalize()
}

// A skier at `at`, heading `heading`, leaning `lean` radians into a turn, plus an optional extra rotation
// (tumbling, flipping) around their middle. Writes the instance matrix into `out`.
function place(out, at, heading, lean, extra) {
  groundNormal(at.x, at.z, normal)
  forward.copy(heading).addScaledVector(normal, -heading.dot(normal)).normalize()
  right.crossVectors(forward, normal).normalize()
  back.copy(forward).negate()
  base.makeBasis(right, normal, back).setPosition(at)
  base.multiply(spin.makeRotationZ(-lean)) // the model faces -Z, so leaning is a turn around Z
  if (extra) base.multiply(pivot.makeTranslation(0, BODY, 0)).multiply(extra).multiply(unpivot.makeTranslation(0, -BODY, 0))
  out.copy(base).multiply(scale.makeScale(SCALE, SCALE, SCALE))
}

// --- The cliff jumper's line: skiing down toward cliff 0 a little east of the lift, off the lip, and on down.
const jump = (() => {
  const [ax, az, bx, bz] = CLIFFS[0]
  const along = new THREE.Vector2(bx - ax, bz - az).normalize()
  const downhill = new THREE.Vector3(-along.y, 0, along.x) // square to the cliff, pointing down it
  const start = new THREE.Vector3(36, 0, 60).addScaledVector(downhill, -40)
  // Find the lip: walking down the line, the first place the ground suddenly drops away.
  let lip = 0
  for (let d = 0; d < 70; d += 0.5) {
    const a = start.clone().addScaledVector(downhill, d)
    const b = start.clone().addScaledVector(downhill, d + 1.5)
    if (heightAt(a.x, a.z) - heightAt(b.x, b.z) > 2.2) {
      lip = d
      break
    }
  }
  // Fly off it with a little pop upward, until the snow comes back up to meet you. Gravity is turned up for this
  // one (cartoon physics): it's a big drop, and real gravity would leave them floating for nearly four seconds.
  const takeoff = start.clone().addScaledVector(downhill, lip)
  takeoff.y = heightAt(takeoff.x, takeoff.z)
  const SPEED = 7.5
  const POP = 2.5
  const G = 12
  let air = 0.1
  for (; air < 4; air += 0.02) {
    const p = takeoff.clone().addScaledVector(downhill, SPEED * air)
    if (takeoff.y + POP * air - 0.5 * G * air * air <= heightAt(p.x, p.z)) break
  }
  return { start, downhill, lip, takeoff, SPEED, POP, G, air, approach: lip / SPEED }
})()

// Dev only: poke the skiers from the browser console (ski.skiers[0].wipe = 0 to knock one over).
if (import.meta.env.DEV) window.ski = { skiers, jump }

// --- Snow puffs: one shared pool of little white lumps, flung out and shrinking away.
const PUFFS = 220
const puffs = Array.from({ length: PUFFS }, () => ({ life: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), size: 0 }))
let nextPuff = 0
function burst(at, count, power, size = 0.18) {
  for (let i = 0; i < count; i++) {
    const p = puffs[nextPuff++ % PUFFS]
    p.life = 0.6 + Math.random() * 0.5
    p.size = size * (0.6 + Math.random() * 0.8)
    p.pos.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.1, (Math.random() - 0.5) * 0.4))
    p.vel.set((Math.random() - 0.5) * power, Math.random() * power * 0.8, (Math.random() - 0.5) * power)
  }
}

function Puffs() {
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    puffs.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= dt
        p.vel.y -= GRAVITY * 0.5 * dt
        p.vel.multiplyScalar(1 - 2.5 * dt) // air drag: they puff out then hang
        p.pos.addScaledVector(p.vel, dt)
      }
      dummy.position.copy(p.pos)
      dummy.scale.setScalar(p.life > 0 ? p.size * Math.min(1, p.life * 2) : 0)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, PUFFS]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#ffffff" flatShading roughness={1} />
    </instancedMesh>
  )
}

const parts = (node) => (node.isMesh ? [node] : node.children.filter((child) => child.isMesh))
const tumble = new THREE.Matrix4()
const tilt = new THREE.Matrix4()
const matrix = new THREE.Matrix4()
const feet = new THREE.Vector3()
const middle = new THREE.Vector3()
const heading = new THREE.Vector3()

export default function Skiers({ clickable }) {
  const { nodes } = useGLTF(URL)
  const meshes = useMemo(() => parts(nodes.Skier), [nodes])
  const group = useRef()
  const hits = useRef()
  const jumper = useRef({ t: -1, idle: 3 })

  // Everyone gets their own colours on the recolourable parts.
  useLayoutEffect(() => {
    for (const mesh of group.current.children) {
      const palette = PALETTES[mesh.material.name]
      if (!palette) continue
      mesh.material.color.set('#ffffff')
      mesh.material.metalness = 0
      for (let i = 0; i < COUNT; i++) {
        const pick = i === JUMPER ? 0 : Math.floor(hash(i, mesh.material.name.length) * palette.length)
        mesh.setColorAt(i, new THREE.Color(palette[pick]))
      }
      mesh.instanceColor.needsUpdate = true
    }
  }, [meshes])

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05)
    const matrices = []

    skiers.forEach((skier, i) => {
      if (skier.wait > 0) {
        skier.wait -= dt
        matrices.push(hidden)
        return
      }
      let extra = null
      if (skier.wipe >= 0) {
        // A wipeout: tumble for a second (sliding to a stop), lie there, then get back up.
        skier.wipe += dt
        const w = skier.wipe
        skier.s += skier.speed * Math.max(0, 1 - w / 1.3) * dt
        const roll = w < 1.2 ? (w / 1.2) ** 0.6 * Math.PI * 4.5 : w < 2.6 ? Math.PI * 4.5 : Math.PI * 4.5 + (w - 2.6) / 0.8 * (Math.PI * 1.5)
        extra = tumble.makeRotationZ(-roll).multiply(tilt.makeRotationX(Math.sin(w * 7) * 0.4 * Math.max(0, 1 - w)))
        if (w > 3.4) skier.wipe = -1
      } else {
        skier.s += skier.speed * dt
        // Every so often someone just eats it.
        if (Math.random() < dt / 150) wipe(i)
      }
      if (skier.s > RUN_LENGTH - 4) {
        // At the bottom: back up to the top for another lap (after a breather).
        skier.s = 0
        skier.wait = 2 + hash(i, Math.floor(performance.now() / 1000)) * 6
        matrices.push(hidden)
        return
      }
      // Along the run, swinging side to side across it.
      const u = skier.s / RUN_LENGTH
      run.getPointAt(u, point)
      run.getTangentAt(u, tangent)
      side.set(-tangent.z, 0, tangent.x)
      const k = (Math.PI * 2) / skier.wave
      const angle = skier.s * k + skier.phase
      const offset = skier.amp * Math.sin(angle)
      const drift = skier.amp * k * Math.cos(angle) // sideways per unit forward
      const bend = -skier.amp * k * k * Math.sin(angle) // how hard they're turning
      feet.copy(point).addScaledVector(side, offset)
      feet.y = heightAt(feet.x, feet.z)
      heading.copy(tangent).addScaledVector(side, drift).normalize()
      // Lean into the turn (how much the speed and the turn would really throw them, toned down a bit).
      const lean = skier.wipe >= 0 ? 0 : 0.6 * Math.atan((skier.speed * skier.speed * bend) / GRAVITY)
      place(matrix, feet, heading, lean, extra)
      matrices.push(matrix.clone())
      // Carving hard kicks up snow off the downhill edge of the skis.
      skier.spray -= dt
      if (skier.wipe < 0 && Math.abs(bend) > 0.04 && skier.spray <= 0) {
        skier.spray = 0.08
        burst(feet, 2, 2.2, 0.12)
      }
      if (skier.wipe >= 0 && skier.wipe < 1.2 && Math.random() < 0.5) burst(feet, 2, 2.5, 0.16)
    })

    // The cliff jumper. Goes whenever you're riding past (or every few seconds anyway).
    const j = jumper.current
    const near = camera.position.distanceTo(jump.takeoff) < 90
    if (j.t < 0) {
      j.idle -= dt
      if (j.idle <= 0 || (near && j.idle < 2.5)) j.t = 0
      matrices.push(hidden)
    } else {
      j.t += dt
      const { start, downhill, takeoff, SPEED, POP, G, air, approach } = jump
      let extra = null
      if (j.t < approach) {
        // Skiing in, crouching lower as the lip gets close.
        feet.copy(start).addScaledVector(downhill, SPEED * j.t)
        feet.y = heightAt(feet.x, feet.z)
      } else if (j.t < approach + air) {
        // In the air: a parabola, with a full backflip.
        const a = j.t - approach
        feet.copy(takeoff).addScaledVector(downhill, SPEED * a)
        feet.y = takeoff.y + POP * a - 0.5 * G * a * a
        const flip = THREE.MathUtils.smootherstep(a / air, 0.1, 0.85) * Math.PI * 2
        extra = tumble.makeRotationX(flip)
        if (a + dt >= air) burst(feet, 16, 4, 0.22) // the landing
      } else {
        // Landed: ride it out down the slope, slowing, then gone till next time.
        const a = j.t - approach - air
        feet.copy(takeoff).addScaledVector(downhill, SPEED * air + SPEED * a * Math.max(0.3, 1 - a / 4))
        feet.y = heightAt(feet.x, feet.z)
        if (a > 3.5) {
          j.t = -1
          j.idle = 6 + Math.random() * 4
        }
      }
      if (j.t >= 0) {
        place(matrix, feet, downhill, 0, extra)
        matrices.push(matrix.clone())
      } else matrices.push(hidden)
    }

    for (const mesh of group.current.children) {
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
      mesh.instanceMatrix.needsUpdate = true
    }
    // Invisible click targets, a bit bigger than the skiers so they're easy to hit from the bench.
    matrices.forEach((m, i) => {
      middle.setFromMatrixPosition(m)
      const show = m !== hidden && i < RUNNERS && skiers[i].wipe < 0
      hits.current.setMatrixAt(i, show ? matrix.makeTranslation(middle.x, middle.y + BODY, middle.z) : hidden)
    })
    hits.current.instanceMatrix.needsUpdate = true
    hits.current.boundingSphere = null // they've moved, so clicks need a fresh outline to test against
  })

  // Make a skier wipe out (from a click, or bad luck).
  function wipe(i) {
    const skier = skiers[i]
    if (skier.wipe >= 0 || skier.wait > 0) return
    skier.wipe = 0
  }

  return (
    <>
      <group ref={group}>
        {meshes.map((part) => (
          <instancedMesh key={part.uuid} args={[part.geometry, part.material, COUNT]} frustumCulled={false} />
        ))}
      </group>
      <instancedMesh
        ref={hits}
        args={[null, null, COUNT]}
        frustumCulled={false}
        onPointerOver={(e) => clickable && (e.stopPropagation(), (document.body.style.cursor = 'pointer'))}
        onPointerOut={() => (document.body.style.cursor = '')}
        onClick={(e) => {
          if (!clickable || e.delta >= 6) return
          e.stopPropagation()
          wipe(e.instanceId)
        }}
      >
        <sphereGeometry args={[1.3, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </instancedMesh>
      <Puffs />
    </>
  )
}

useGLTF.preload(URL)
