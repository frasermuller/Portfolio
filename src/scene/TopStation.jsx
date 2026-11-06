import { useState } from 'react'
import { BENCH, DECK, alongDeck, heightAt } from './terrain.js'

const WOOD = '#8a5a3b'
const LIGHT_WOOD = '#9a6a47'
const DARK_WOOD = '#5e3b26'
const SNOW = '#f6f8fc'

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

// The lookout: a plank deck on timber legs, sticking out past the edge of the platform over the drop.
// Railings down the sides only, so nothing stands between the bench at the end and the view.
const start = alongDeck(DECK.from)
const end = alongDeck(DECK.to)
const LENGTH = DECK.to - DECK.from
const SIDE = DECK.width / 2 - 0.12
// In the deck's own frame: x across, z out along it. This turns a spot in that frame into world x, z.
const toWorld = (x, z) => [
  start.x + Math.cos(DECK.angle) * z + Math.sin(DECK.angle) * x,
  start.z + Math.sin(DECK.angle) * z - Math.cos(DECK.angle) * x,
]
const PLANKS = Array.from({ length: Math.floor(LENGTH / 0.42) }, (_, i) => 0.21 + i * 0.42)
// Legs where the ground has dropped away under the deck, on both sides.
const LEGS = [4, 7.5, 11, LENGTH - 0.3]
  .flatMap((z) => [-SIDE, SIDE].map((x) => ({ x, z, height: DECK.height - 0.12 - heightAt(...toWorld(x, z)) })))
  .filter((leg) => leg.height > 0.1)
const RAIL_POSTS = Array.from({ length: 7 }, (_, i) => 1 + (i * (LENGTH - 1.1)) / 6)

function Deck() {
  return (
    <group position={[start.x, DECK.height, start.z]} rotation-y={facing(start.x, start.z, end)}>
      {PLANKS.map((z, i) => (
        <mesh key={z} position={[0, -0.05, z]} castShadow receiveShadow>
          <boxGeometry args={[DECK.width, 0.1, 0.38]} />
          <meshStandardMaterial color={i % 3 ? WOOD : LIGHT_WOOD} />
        </mesh>
      ))}
      {[-SIDE, SIDE].map((x) => (
        <group key={x}>
          {/* The beam each side that the planks sit on. */}
          <mesh position={[x, -0.16, LENGTH / 2]} castShadow>
            <boxGeometry args={[0.16, 0.14, LENGTH]} />
            <meshStandardMaterial color={DARK_WOOD} />
          </mesh>
          {/* Railing: posts, a top rail, and a strip of snow along it. */}
          {RAIL_POSTS.map((z) => (
            <mesh key={z} position={[x, 0.28, z]} castShadow>
              <boxGeometry args={[0.07, 0.56, 0.07]} />
              <meshStandardMaterial color={DARK_WOOD} />
            </mesh>
          ))}
          <mesh position={[x, 0.57, (LENGTH + 0.9) / 2]} castShadow>
            <boxGeometry args={[0.09, 0.05, LENGTH - 0.9]} />
            <meshStandardMaterial color={WOOD} />
          </mesh>
          <mesh position={[x, 0.61, (LENGTH + 0.9) / 2]} rotation-x={Math.PI / 2} scale={[1, 1, 0.5]}>
            <capsuleGeometry args={[0.05, LENGTH - 1, 4, 8]} />
            <meshStandardMaterial color={SNOW} />
          </mesh>
        </group>
      ))}
      {LEGS.map(({ x, z, height }) => (
        <mesh key={`${x},${z}`} position={[x, -0.12 - height / 2, z]} castShadow>
          <boxGeometry args={[0.18, height, 0.18]} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>
      ))}
      {/* A low kerb across the open end, so the bench doesn't look like it's about to slide off. */}
      <mesh position={[0, 0.05, LENGTH - 0.05]} castShadow>
        <boxGeometry args={[DECK.width, 0.1, 0.1]} />
        <meshStandardMaterial color={DARK_WOOD} />
      </mesh>
    </group>
  )
}

// A plain wooden bench at the very end of the deck, facing out.
function Bench({ onSelect }) {
  const [, setHover] = useState(false)
  const base = [BENCH.x, DECK.height, BENCH.z]
  return (
    <group position={base} rotation-y={facing(BENCH.x, BENCH.z, end)} {...clickable(onSelect, setHover)}>
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

export default function TopStation({ onBench }) {
  return (
    <>
      <Deck />
      <Bench onSelect={onBench} />
    </>
  )
}
