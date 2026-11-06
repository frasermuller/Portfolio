import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import * as THREE from 'three'
import { BOARD, ground, hash, shots } from './terrain.js'

// The trail board: a routed-wood sign under a little snowy roof, the way resorts post their trail maps.
// Each row is a place to go. Up close, click a row and the snow sitting on it gets knocked off before you head
// there, and it stays knocked off, so the board shows where you've already been.

const ROWS = [
  { shot: 'about', name: 'About me', note: 'who I am', symbol: 'green' },
  { shot: 'projects', name: 'Projects', note: "things I've built", symbol: 'blue' },
  { shot: 'experience', name: 'Experience', note: "where I've worked", symbol: 'black' },
  { shot: 'contact', name: 'The lodge', note: 'come say hi', symbol: 'lodge' },
]

// The painted face is a canvas, 1000 pixels to a unit, so its layout and the 3D hit areas line up exactly.
const WIDTH = 1.2 // units
const HEIGHT = 0.8
const PX = 1000
const HEADER = 230 // px of the face taken by the header
const ROW = (HEIGHT * PX - HEADER) / ROWS.length
const PANEL_Y = 0.92 // the middle of the face, above the snow
const rowY = (i) => HEIGHT / 2 - (HEADER + ROW * (i + 0.5)) / PX // a row's middle, in the face's own units

const CREAM = '#f1e2c0'
const GROOVE = '#24140a'
const SYMBOLS = { green: '#2f9e5b', blue: '#2c6fd1', black: '#121318', lodge: '#c8452f' }

// Letters routed into the wood and painted: a dark groove peeking out below and right, the paint on top.
function carve(context, text, x, y) {
  context.fillStyle = GROOVE
  context.fillText(text, x + 3, y + 4)
  context.fillStyle = CREAM
  context.fillText(text, x, y)
}

function drawSymbol(context, symbol, x, y) {
  context.save()
  context.translate(x, y)
  context.fillStyle = GROOVE
  context.translate(3, 4)
  shape(context, symbol)
  context.translate(-3, -4)
  context.fillStyle = SYMBOLS[symbol]
  shape(context, symbol)
  context.restore()
}

function shape(context, symbol) {
  context.beginPath()
  if (symbol === 'green') context.arc(0, 0, 34, 0, Math.PI * 2)
  if (symbol === 'blue') context.rect(-32, -32, 64, 64)
  if (symbol === 'black') {
    context.moveTo(0, -44)
    context.lineTo(44, 0)
    context.lineTo(0, 44)
    context.lineTo(-44, 0)
  }
  if (symbol === 'lodge') {
    context.moveTo(-36, 34)
    context.lineTo(-36, -4)
    context.lineTo(0, -38)
    context.lineTo(36, -4)
    context.lineTo(36, 34)
  }
  context.closePath()
  context.fill()
}

function paint(canvas) {
  const context = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height

  // Four planks, each its own shade of brown, with wavy grain and a dark seam between them.
  const browns = ['#7d5032', '#875a39', '#74482c', '#81553a']
  for (let p = 0; p < 4; p++) {
    const top = (H / 4) * p
    context.fillStyle = browns[p]
    context.fillRect(0, top, W, H / 4)
    context.lineWidth = 2
    for (let g = 0; g < 18; g++) {
      context.strokeStyle = `rgba(35, 18, 8, ${0.08 + hash(p, g) * 0.14})`
      const y = top + hash(g, p + 3) * (H / 4)
      context.beginPath()
      for (let x = 0; x <= W; x += 40) {
        context.lineTo(x, y + Math.sin(x * 0.004 + g + p * 2) * 7 + Math.sin(x * 0.013 + g) * 2)
      }
      context.stroke()
    }
    // A couple of knots in each plank.
    for (let k = 0; k < 2; k++) {
      context.strokeStyle = 'rgba(35, 18, 8, 0.35)'
      context.beginPath()
      context.ellipse(hash(p, k + 9) * W, top + 30 + hash(k, p + 9) * (H / 4 - 60), 16, 8, 0, 0, Math.PI * 2)
      context.stroke()
    }
    context.fillStyle = 'rgba(20, 10, 4, 0.7)'
    context.fillRect(0, top, W, 4)
  }

  // Header: where you are.
  context.textBaseline = 'middle'
  context.textAlign = 'center'
  context.font = '150px Anton, Impact, sans-serif'
  carve(context, 'SUMMIT', W / 2, 105)
  context.font = '600 30px "Work Sans Variable", system-ui, sans-serif'
  carve(context, 'ELEV 2,186 M  ·  PICK YOUR RUN', W / 2, 186)

  // One carved row per place, separated by grooves: the trail symbol, the name, a little note, and an arrow.
  ROWS.forEach((row, i) => {
    const middle = HEADER + ROW * (i + 0.5)
    context.fillStyle = GROOVE
    context.fillRect(40, HEADER + ROW * i - 2, W - 80, 4)
    drawSymbol(context, row.symbol, 110, middle)
    context.textAlign = 'left'
    context.font = '78px Anton, Impact, sans-serif'
    const name = row.name.toUpperCase()
    carve(context, name, 180, middle - 10)
    const after = 180 + context.measureText(name).width + 26
    context.font = 'italic 500 30px "Work Sans Variable", system-ui, sans-serif'
    carve(context, row.note, after, middle + 6)
    // The arrow, routed in the same way.
    context.save()
    context.translate(W - 110, middle)
    for (const [dx, dy, color] of [[3, 4, GROOVE], [0, 0, CREAM]]) {
      context.fillStyle = color
      context.beginPath()
      context.moveTo(-46 + dx, -12 + dy)
      context.lineTo(4 + dx, -12 + dy)
      context.lineTo(4 + dx, -30 + dy)
      context.lineTo(44 + dx, 0 + dy)
      context.lineTo(4 + dx, 30 + dy)
      context.lineTo(4 + dx, 12 + dy)
      context.lineTo(-46 + dx, 12 + dy)
      context.closePath()
      context.fill()
    }
    context.restore()
  })
}

function makeFace() {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH * PX
  canvas.height = HEIGHT * PX
  paint(canvas)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  // Repaint once the real fonts have loaded (the first paint uses whatever's there).
  Promise.all([document.fonts.load('150px Anton'), document.fonts.load('30px "Work Sans Variable"')]).then(() => {
    paint(canvas)
    texture.needsUpdate = true
  })
  return texture
}

const BARK = '#5a3a26'
const TRIM = '#3d2516'
const SNOW = '#f4f6fb'

// Hover shows a pointer; a click only counts if the mouse barely moved (so dragging to look around never "clicks").
const pointer = (setHover) => ({
  onPointerOver: (e) => {
    e.stopPropagation()
    setHover(true)
    document.body.style.cursor = 'pointer'
  },
  onPointerOut: () => {
    setHover(false)
    document.body.style.cursor = ''
  },
})

// One row's hit area and the lump of snow sitting on the ledge above it.
const LYING = Math.PI / 2 // a capsule stands up by default; this lays it along the ledge
function Row({ index, active, knocked, onKnock }) {
  const [hover, setHover] = useState(false)
  const snow = useRef()
  const y = rowY(index)
  const lump = useMemo(() => ({ x: (hash(index, 4) - 0.5) * 0.5, length: 0.25 + hash(index, 7) * 0.35 }), [index])

  // Knocked off: it drops, tumbles and shrinks away. Already gone when you come back.
  useEffect(() => {
    if (!knocked || !snow.current) return
    const tween = gsap.timeline()
      .to(snow.current.position, { y: snow.current.position.y - 1.1, z: 0.25, duration: 0.6, ease: 'power2.in' })
      .to(snow.current.rotation, { z: '+=1.5', duration: 0.6, ease: 'power1.in' }, 0)
      .to(snow.current.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25, ease: 'power1.in' }, 0.4)
    return () => tween.kill()
  }, [knocked])

  // While you hover a row it gets a warm glow, and its snow shivers like it's about to go.
  useEffect(() => {
    const lump = snow.current
    if (!hover || knocked || !lump) return
    const shiver = gsap.fromTo(lump.rotation, { z: LYING - 0.04 }, { z: LYING + 0.04, duration: 0.07, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    return () => {
      shiver.kill()
      lump.rotation.z = LYING
    }
  }, [hover, knocked])

  return (
    <group>
      {/* The ledge above the row, and the snow on it. */}
      <mesh position={[0, y + ROW / PX / 2, 0.035]} castShadow>
        <boxGeometry args={[WIDTH, 0.016, 0.03]} />
        <meshStandardMaterial color={TRIM} />
      </mesh>
      <mesh ref={snow} position={[lump.x, y + ROW / PX / 2 + 0.014, 0.042]} rotation-z={LYING} scale={[0.6, 1, 1]}>
        <capsuleGeometry args={[0.018, lump.length, 4, 8]} />
        <meshStandardMaterial color={SNOW} />
      </mesh>
      {active && (
        <mesh
          position={[0, y, 0.05]}
          {...pointer(setHover)}
          onClick={(e) => {
            e.stopPropagation()
            if (e.delta < 6) onKnock()
          }}
        >
          <planeGeometry args={[WIDTH - 0.04, ROW / PX - 0.02]} />
          <meshBasicMaterial color="#ffd9a0" transparent opacity={hover ? 0.16 : 0} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

export default function TrailBoard({ active, onOpen, onPick }) {
  const face = useMemo(() => makeFace(), [])
  const [hover, setHover] = useState(false)
  const [knocked, setKnocked] = useState([])
  const base = ground(BOARD.x, BOARD.z)
  const turn = Math.atan2(shots.top.camera.x - BOARD.x, shots.top.camera.z - BOARD.z)

  const knock = (row) => {
    setKnocked((done) => (done.includes(row.shot) ? done : [...done, row.shot]))
    // Give the snow a moment to fall before flying off.
    setTimeout(() => onPick(row.shot), 380)
  }

  return (
    <group
      position={base}
      rotation-y={turn}
      // From a distance the whole board is one button that walks you over to it.
      {...(active ? {} : pointer(setHover))}
      onClick={(e) => {
        if (active) return
        e.stopPropagation()
        if (e.delta < 6) onOpen()
      }}
    >
      {/* Two log posts. */}
      {[-0.68, 0.68].map((x) => (
        <mesh key={x} position={[x, 0.78, -0.04]} castShadow>
          <cylinderGeometry args={[0.055, 0.065, 1.56, 7]} />
          <meshStandardMaterial color={BARK} />
        </mesh>
      ))}
      {/* The face, in a dark frame. It warms up a little when you hover it from a distance. */}
      <group position={[0, PANEL_Y, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[WIDTH + 0.08, HEIGHT + 0.08, 0.05]} />
          <meshStandardMaterial color={TRIM} />
        </mesh>
        <mesh position={[0, 0, 0.026]}>
          <planeGeometry args={[WIDTH, HEIGHT]} />
          {/* A touch of its own glow, so it stays readable with the low sun behind it (more when you hover). */}
          <meshStandardMaterial map={face} roughness={0.85} emissive="#ffffff" emissiveMap={face} emissiveIntensity={hover ? 0.6 : 0.4} />
        </mesh>
        {ROWS.map((row, i) => (
          <Row key={row.shot} index={i} active={active} knocked={knocked.includes(row.shot)} onKnock={() => knock(row)} />
        ))}
      </group>
      {/* A little gable roof with a thick layer of snow on it. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 1.5, side * 0.13]} rotation-x={side * 0.55}>
          <mesh castShadow>
            <boxGeometry args={[1.62, 0.035, 0.32]} />
            <meshStandardMaterial color={TRIM} />
          </mesh>
          <mesh position={[0, 0.05, 0]} castShadow>
            <boxGeometry args={[1.58, 0.07, 0.31]} />
            <meshStandardMaterial color={SNOW} />
          </mesh>
        </group>
      ))}
      {/* Snow banked up around the foot of the posts. */}
      {[-0.68, 0.68].map((x) => (
        <mesh key={x} position={[x, 0.02, 0]} scale={[0.32, 0.14, 0.26]}>
          <sphereGeometry args={[1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={SNOW} />
        </mesh>
      ))}
    </group>
  )
}
