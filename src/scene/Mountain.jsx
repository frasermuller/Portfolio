import { useMemo } from 'react'
import { RUN_WIDTH, buildTerrain } from './terrain.js'

const EDGE = (RUN_WIDTH * 0.8).toFixed(1) // how far either side of its middle the groomed run goes

// The groomed run is painted here rather than in the vertex colours, so its edges stay crisp however big the
// triangles are: each corner knows how far across the run it is, and every pixel in between works out whether
// it's on it. Up close you get corduroy, the stripes a groomer leaves, and a thin churned-up line along each edge.
function groom(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float across;\nvarying float vAcross;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAcross = across;')
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAcross;').replace(
    '#include <color_fragment>',
    `#include <color_fragment>
    float side = abs(vAcross);
    float blur = fwidth(vAcross);
    float groomed = 1.0 - smoothstep(${EDGE} - blur, ${EDGE} + blur, side);
    // Stripes every 0.6 units, faded out once they're too fine to draw without shimmering.
    float corduroy = (0.5 + 0.5 * cos(vAcross * 10.47)) * (1.0 - smoothstep(0.08, 0.25, blur));
    float berm = smoothstep(${EDGE}, ${EDGE} + 0.3 + blur, side) * (1.0 - smoothstep(${EDGE} + 0.8, ${EDGE} + 2.2 + blur, side));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), groomed * 0.75);
    diffuseColor.rgb *= 1.0 - 0.06 * corduroy * groomed - 0.2 * berm;`,
  )
}

export default function Mountain() {
  const geometry = useMemo(() => buildTerrain(), [])

  return (
    // Smooth shading (no flatShading) for the soft, snowy look.
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} onBeforeCompile={groom} />
    </mesh>
  )
}
