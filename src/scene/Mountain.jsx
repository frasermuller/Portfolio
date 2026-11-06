import { useMemo } from 'react'
import * as THREE from 'three'
import { RUN_WIDTH, TOP, buildTerrain } from './terrain.js'

const EDGE = (RUN_WIDTH * 0.8).toFixed(1) // how far either side of its middle the groomed run goes

// Slate rock, like Lonely Mountains: a dark and a light shade that the layers and chipped faces swing between.
// (THREE.Color stores linear values, which is what the shader works in.)
const glsl = (hex) => {
  const c = new THREE.Color(hex)
  return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`
}
const ROCK_DARK = glsl('#333d47')
const ROCK_LIGHT = glsl('#6e7a85')

// Two things the plain material can't do, added to its shader:
// - Rock. Any triangle steeper than ~47° turns to rock and is drawn faceted (one flat normal per triangle),
//   with horizontal layers and every face chipped a slightly different shade, so cliffs read as hard rock walls
//   while the snow around them stays soft and smooth.
// - The groomed run, painted from how far across the run each corner is, so its edges stay crisp however big
//   the triangles are. Up close you get corduroy, and a thin churned-up line along each edge.
function sculpt(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float across;\nvarying float vAcross;\nvarying vec3 vWorld;')
    // The terrain sits at the origin, so its positions already are world positions.
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAcross = across;\nvWorld = position;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vAcross;\nvarying vec3 vWorld;')
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float side = abs(vAcross);
      float blur = fwidth(vAcross);
      float groomed = 1.0 - smoothstep(${EDGE} - blur, ${EDGE} + blur, side);
      // Stripes every 0.6 units, faded out once they're too fine to draw without shimmering.
      float corduroy = (0.5 + 0.5 * cos(vAcross * 10.47)) * (1.0 - smoothstep(0.08, 0.25, blur));
      // The top platform is groomed too, in straight passes heading for the run.
      float pass = dot(vWorld.xz, vec2(0.6, -0.8));
      float platform = 1.0 - smoothstep(${TOP.radius - 1}.0, ${TOP.radius + 1}.0, length(vWorld.xz - vec2(${TOP.x}.0, ${TOP.z}.0)));
      float passBlur = fwidth(pass);
      corduroy = mix(corduroy, (0.5 + 0.5 * cos(pass * 10.47)) * (1.0 - smoothstep(0.08, 0.25, passBlur)), platform);
      groomed = max(groomed, platform);
      float berm = smoothstep(${EDGE}, ${EDGE} + 0.3 + blur, side) * (1.0 - smoothstep(${EDGE} + 0.8, ${EDGE} + 2.2 + blur, side));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), groomed * 0.75);
      diffuseColor.rgb *= 1.0 - (0.06 + 0.04 * platform) * corduroy * groomed - 0.2 * berm;`,
    )
    .replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      // This triangle's own flat normal, from how the surface changes across the pixel.
      vec3 facet = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
      float steep = dot(facet, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz)); // 1 flat, 0 a wall
      float wobble = 0.05 * sin(vWorld.x * 0.31 + 2.0 * sin(vWorld.z * 0.23)) + 0.04 * sin(vWorld.z * 0.53 + vWorld.x * 0.17);
      float rock = 1.0 - smoothstep(0.66, 0.7, steep + wobble);
      normal = normalize(mix(normal, facet, rock));
      // Layers that wander up and down across the face, and a per-face shade so it looks chipped.
      float tilt = vWorld.y + 4.0 * sin(vWorld.x * 0.045) + 3.0 * sin(vWorld.z * 0.06);
      float layers = 0.6 * sin(tilt * 1.7) + 0.4 * sin(tilt * 0.63 + 1.3);
      float chip = fract(sin(dot(floor(facet * 30.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
      vec3 stone = mix(${ROCK_DARK}, ${ROCK_LIGHT}, clamp(0.45 + 0.13 * layers + 0.4 * (chip - 0.5), 0.0, 1.0));
      // Snow clings to the tops of the gentler rock faces.
      stone = mix(stone, diffuseColor.rgb, smoothstep(0.5, 0.68, steep + wobble) * 0.6);
      diffuseColor.rgb = mix(diffuseColor.rgb, stone, rock);`,
    )
}

export default function Mountain() {
  const geometry = useMemo(() => buildTerrain(), [])

  return (
    // Smooth shading (no flatShading) for the soft, snowy look; the shader flattens just the rock.
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} onBeforeCompile={sculpt} />
    </mesh>
  )
}
