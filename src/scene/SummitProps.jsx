import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { BOARD, DECK, SUMMIT, TOP, ground, heightAt, shots } from './terrain.js'

const WOOD = '#7a4b2f'
const DARK_WOOD = '#4e3121'
const RED = '#b8392c'
const SNOW = '#f4f6fb'
const ORANGE = '#ff6b1f'

// Which way something at (x, z) should turn to face a point.
const facing = (x, z, target) => Math.atan2(target.x - x, target.z - z)
// A spot on the platform: `angle` around its middle and `r` out from it.
const around = (angle, r) => ({ x: TOP.x + Math.cos(angle) * r, z: TOP.z + Math.sin(angle) * r })

// The ski patrol hut at the back of the platform: plank walls, a steep red tin roof under a thick layer of snow,
// a lit window and a red cross over the door. Sizes are in units (1 unit is about 2 m).
const HUT = around(2.98, 14.5)

function Hut() {
  const base = ground(HUT.x, HUT.z, -0.15)
  const pitch = 0.75 // roof angle, radians
  return (
    <group position={base} rotation-y={facing(HUT.x, HUT.z, shots.top.camera)}>
      {/* Walls, sitting on a dark plinth. */}
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.7, 2.2]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[2.7, 0.16, 2.3]} />
        <meshStandardMaterial color={DARK_WOOD} />
      </mesh>
      {/* Plank lines across the walls. */}
      {[0.35, 0.7, 1.05, 1.4].map((y) => (
        <mesh key={y} position={[0, y, 1.105]}>
          <boxGeometry args={[2.6, 0.03, 0.02]} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>
      ))}
      {/* Gable ends, so the roof has walls under it. */}
      {[-1.08, 1.08].map((z) => (
        <mesh key={z} position={[0, 1.7, z]} rotation-z={Math.PI / 4} scale={[1, 1, 0.02 / 2.2]} castShadow>
          <boxGeometry args={[1.84, 1.84, 2.2]} />
          <meshStandardMaterial color={WOOD} />
        </mesh>
      ))}
      {/* Red tin roof, two slopes, with snow piled on each. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.68, 2.33, 0]} rotation-z={-side * pitch}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.9, 0.08, 2.7]} />
            <meshStandardMaterial color={RED} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.13, 0]} castShadow>
            <boxGeometry args={[1.8, 0.18, 2.74]} />
            <meshStandardMaterial color={SNOW} />
          </mesh>
        </group>
      ))}
      {/* Door, a warm lit window, and the patrol cross on the gable. */}
      <mesh position={[-0.55, 0.62, 1.12]}>
        <boxGeometry args={[0.6, 1.1, 0.05]} />
        <meshStandardMaterial color={DARK_WOOD} />
      </mesh>
      <mesh position={[0.55, 0.95, 1.12]}>
        <boxGeometry args={[0.6, 0.45, 0.04]} />
        <meshStandardMaterial color="#ffcf87" emissive="#ffb85c" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0, 2.05, 1.13]}>
        <boxGeometry args={[0.36, 0.1, 0.03]} />
        <meshStandardMaterial color="#e23b30" />
      </mesh>
      <mesh position={[0, 2.05, 1.13]}>
        <boxGeometry args={[0.1, 0.36, 0.03]} />
        <meshStandardMaterial color="#e23b30" />
      </mesh>
      {/* A stovepipe, and a drift banked up against one side. */}
      <mesh position={[0.7, 2.75, -0.5]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#2c2f36" />
      </mesh>
      <mesh position={[1.45, 0.2, 0]} scale={[0.7, 0.45, 1.6]}>
        <sphereGeometry args={[1, 10, 6]} />
        <meshStandardMaterial color={SNOW} />
      </mesh>
    </group>
  )
}

// Orange rope on bamboo poles along the platform edge, either side of the deck, where it drops away.
const ROPE_ARCS = [
  [DECK.angle - 0.75, DECK.angle - 0.14],
  [DECK.angle + 0.14, DECK.angle + 0.62],
]
const ROPE_POSTS = ROPE_ARCS.map(([from, to]) =>
  Array.from({ length: 7 }, (_, i) => {
    const spot = around(from + ((to - from) * i) / 6, TOP.radius + 0.5)
    return ground(spot.x, spot.z, -0.1)
  }),
)

function RopeLine({ posts }) {
  return (
    <group>
      {posts.map((p, i) => (
        <group key={i}>
          <mesh position={[p.x, p.y + 0.5, p.z]} castShadow>
            <cylinderGeometry args={[0.03, 0.035, 1, 5]} />
            <meshStandardMaterial color={i % 2 ? '#22252e' : ORANGE} />
          </mesh>
          {posts[i + 1] && <Rope from={p} to={posts[i + 1]} />}
        </group>
      ))}
    </group>
  )
}

// A rope between two post tops, sagging a little in the middle.
function Rope({ from, to }) {
  const a = from.clone().setY(from.y + 0.85)
  const b = to.clone().setY(to.y + 0.85)
  const middle = a.clone().lerp(b, 0.5).setY((a.y + b.y) / 2 - 0.12)
  const curve = new THREE.QuadraticBezierCurve3(a, middle, b)
  return (
    <mesh>
      <tubeGeometry args={[curve, 8, 0.015, 4, false]} />
      <meshStandardMaterial color={ORANGE} />
    </mesh>
  )
}

// Three pairs of skis stuck upright in the snow next to the board, like someone's stopped to read it.
const SKIS = [
  { dx: -1.0, dz: 0.5, color: '#e8463a', tilt: 0.08 },
  { dx: -1.35, dz: 0.2, color: '#2bb3a3', tilt: -0.06 },
  { dx: -1.65, dz: 0.6, color: '#f2c230', tilt: 0.12 },
]

function Skis() {
  const turn = facing(BOARD.x, BOARD.z, shots.top.camera)
  return SKIS.map(({ dx, dz, color, tilt }) => {
    // Offsets are in the board's own frame, so the skis stay beside it however it's turned.
    const x = BOARD.x + Math.cos(turn) * dx + Math.sin(turn) * dz
    const z = BOARD.z - Math.sin(turn) * dx + Math.cos(turn) * dz
    return (
      <group key={color} position={ground(x, z, -0.12)} rotation={[tilt, turn + 0.4, tilt * 0.5]}>
        {/* Real size: about 1.7 m long, so 0.85 units. */}
        {[-0.035, 0.035].map((side) => (
          <mesh key={side} position={[side, 0.42, 0]} castShadow>
            <boxGeometry args={[0.05, 0.85, 0.014]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
        ))}
        {/* Upturned tips. */}
        {[-0.035, 0.035].map((side) => (
          <mesh key={side} position={[side, 0.86, 0.01]} rotation-x={-0.5}>
            <boxGeometry args={[0.05, 0.07, 0.014]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
        ))}
      </group>
    )
  })
}

// Soft wind drifts piled around the platform edge, so it isn't one flat sheet of white.
// Kept clear of the deck and of the way down to the run (and the hut beside it).
const near = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.35
const DRIFTS = Array.from({ length: 14 }, (_, i) => {
  const angle = 0.3 + i * 0.45
  const spot = around(angle, TOP.radius - 1 + (i % 3))
  return { ...spot, y: heightAt(spot.x, spot.z) - 0.2, turn: angle, size: 0.8 + (i % 4) * 0.35 }
}).filter((d) => !near(d.turn, DECK.angle) && !near(d.turn, 2.9))

function Drifts() {
  const ref = useRef()
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    DRIFTS.forEach((d, i) => {
      dummy.position.set(d.x, d.y, d.z)
      dummy.rotation.set(0, d.turn, 0)
      dummy.scale.set(d.size * 2.2, d.size * 0.55, d.size)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[null, null, DRIFTS.length]} receiveShadow>
      <sphereGeometry args={[1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={SNOW} />
    </instancedMesh>
  )
}

// A little flag on the very top of the summit crag, so you can spot the top from the lift.
function SummitFlag() {
  return (
    <group position={SUMMIT}>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 2.4, 5]} />
        <meshStandardMaterial color="#d9d9d9" />
      </mesh>
      <mesh position={[0.45, 2.1, 0]}>
        <boxGeometry args={[0.9, 0.5, 0.02]} />
        <meshStandardMaterial color={RED} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export default function SummitProps() {
  return (
    <>
      <Hut />
      {ROPE_POSTS.map((posts, i) => (
        <RopeLine key={i} posts={posts} />
      ))}
      <Skis />
      <Drifts />
      <SummitFlag />
    </>
  )
}
