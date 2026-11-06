import { useState } from 'react'
import { BENCH, BOARD, ground, shots } from './terrain.js'

const WOOD = '#8a5a3b'
const DARK_WOOD = '#5e3b26'
const SNOW = '#f6f8fc'
const TRAIL = { green: '#2f9e5b', blue: '#2c6fd1', black: '#15161c' }

// Which way an object at (x, z) should turn to face a point.
const facing = (x, z, target) => Math.atan2(target.x - x, target.z - z)

// Hover shows a pointer; a click only counts if the mouse barely moved (so dragging to look around never "clicks").
function clickable(onSelect, setHover) {
  return {
    onPointerOver: (e) => {
      e.stopPropagation()
      setHover(true)
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      setHover(false)
      document.body.style.cursor = ''
    },
    onClick: (e) => {
      e.stopPropagation()
      if (e.delta < 6) onSelect()
    },
  }
}

// The wooden trail board, snow piled on top. Sizes are in units (1 unit is about 2 m).
function Board({ onSelect }) {
  const [hover, setHover] = useState(false)
  const base = ground(BOARD.x, BOARD.z)
  return (
    <group position={base} rotation-y={facing(BOARD.x, BOARD.z, shots.top.camera)} {...clickable(onSelect, setHover)}>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.55, 0]} castShadow>
          <boxGeometry args={[0.08, 1.1, 0.08]} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>
      ))}
      {/* The panel tips forward a touch when you hover, like it's inviting you over. */}
      <group position={[0, 0.78, 0.05]} rotation-x={hover ? -0.08 : 0}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.62, 0.06]} />
          <meshStandardMaterial color={WOOD} />
        </mesh>
        {/* Trail symbols on the face of the board: green circle, blue square, black diamond. */}
        <mesh position={[-0.38, 0, 0.04]}>
          <circleGeometry args={[0.09, 20]} />
          <meshStandardMaterial color={TRAIL.green} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[0.16, 0.16]} />
          <meshStandardMaterial color={TRAIL.blue} />
        </mesh>
        <mesh position={[0.38, 0, 0.04]} rotation-z={Math.PI / 4}>
          <planeGeometry args={[0.13, 0.13]} />
          <meshStandardMaterial color={TRAIL.black} />
        </mesh>
        {/* Snow sitting on the top edge, a little lumpy. */}
        <mesh position={[0, 0.35, 0]} rotation-z={Math.PI / 2} scale={[0.6, 1, 1]} castShadow>
          <capsuleGeometry args={[0.07, 1.22, 4, 8]} />
          <meshStandardMaterial color={SNOW} />
        </mesh>
      </group>
    </group>
  )
}

// A plain wooden bench at the edge of the platform, facing the view.
function Bench({ onSelect }) {
  const [, setHover] = useState(false)
  const base = ground(BENCH.x, BENCH.z)
  return (
    <group position={base} rotation-y={facing(BENCH.x, BENCH.z, shots.view.look)} {...clickable(onSelect, setHover)}>
      <mesh position={[0, 0.23, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.05, 0.3]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      <mesh position={[0, 0.42, -0.14]} rotation-x={-0.15} castShadow>
        <boxGeometry args={[1.1, 0.22, 0.04]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.11, 0]} castShadow>
          <boxGeometry args={[0.06, 0.22, 0.28]} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>
      ))}
      <mesh position={[0.15, 0.27, 0]} rotation-z={Math.PI / 2} scale={[0.4, 1, 1]}>
        <capsuleGeometry args={[0.06, 0.5, 4, 8]} />
        <meshStandardMaterial color={SNOW} />
      </mesh>
    </group>
  )
}

export default function TopStation({ onBoard, onBench }) {
  return (
    <>
      <Board onSelect={onBoard} />
      <Bench onSelect={onBench} />
    </>
  )
}
