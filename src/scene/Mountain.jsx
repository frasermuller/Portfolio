import { useMemo } from 'react'
import * as THREE from 'three'

const SIZE = 30 // width of the whole patch of ground, in world units
const SEGMENTS = 48 // fewer segments = bigger triangles = more low-poly
const PEAK = 10 // summit height
const SNOWLINE = 4.2 // triangles above this height turn white

// Pseudo-random 0..1 from a grid point. Same input, same output, so the mountain never changes between reloads.
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

// Value noise: random heights on a grid, smoothly blended between grid points.
function noise(x, y) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

// Fractal noise: big bumps plus smaller and smaller ones on top (ridges, then rocks).
function fbm(x, y) {
  let total = 0
  let amplitude = 0.5
  for (let i = 0; i < 4; i++) {
    // Folding the noise (1 - |2n - 1|) turns smooth bumps into sharp ridges.
    total += (1 - Math.abs(2 * noise(x, y) - 1)) * amplitude
    x *= 2
    y *= 2
    amplitude *= 0.5
  }
  return total
}

function heightAt(x, y) {
  const distance = Math.hypot(x, y) / (SIZE / 2)
  const falloff = Math.max(0, 1 - distance) ** 2.2 // tall in the middle, flat at the edges
  return PEAK * falloff * (0.35 + fbm(x * 0.22, y * 0.22)) + fbm(x * 0.5, y * 0.5) * 0.3
}

const snow = new THREE.Color('#f4f1fa')
const rock = new THREE.Color('#4b4f73')

function buildGeometry() {
  // Non-indexed: every triangle owns its 3 corners, so each one can get its own flat colour.
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS).toNonIndexed()
  const position = geometry.attributes.position
  const colors = []

  for (let i = 0; i < position.count; i++) {
    position.setZ(i, heightAt(position.getX(i), position.getY(i)))
  }

  for (let i = 0; i < position.count; i += 3) {
    const avg = (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3
    // Snow on top and on the flat valley floor, exposed rock on the slopes between.
    const color = avg > SNOWLINE || avg < 1 ? snow : rock
    for (let k = 0; k < 3; k++) colors.push(color.r, color.g, color.b)
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

export default function Mountain() {
  const geometry = useMemo(() => buildGeometry(), [])

  return (
    // The plane is built standing up (XY), so tip it over to lie flat with Z pointing to the sky.
    <mesh geometry={geometry} rotation-x={-Math.PI / 2}>
      <meshStandardMaterial vertexColors flatShading roughness={0.9} />
    </mesh>
  )
}
