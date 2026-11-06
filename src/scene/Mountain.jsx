import { useMemo } from 'react'
import { buildTerrain } from './terrain.js'

export default function Mountain() {
  const geometry = useMemo(() => buildTerrain(), [])

  return (
    // Smooth shading (no flatShading) for the soft, snowy look.
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  )
}
