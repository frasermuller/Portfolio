import { useMemo } from 'react'
import { buildTerrain } from './terrain.js'

export default function Mountain() {
  const geometry = useMemo(() => buildTerrain(), [])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors flatShading roughness={0.95} />
    </mesh>
  )
}
