// Builds src/scene/heightmap.js from real elevation data around Silver Star's summit.
// Run once with: node scripts/heightmap.mjs
//
// Data: AWS Terrain Tiles (Mapzen), "terrarium" PNGs where each pixel's colour encodes a height.
// In Canada the source is NRCan's CDEM (Open Government Licence – Canada).
import { inflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import assert from 'node:assert'

const ZOOM = 12
const RESORT = { lat: 50.3597, lon: -119.0581 } // Silver Star Mountain Resort
const AREA = 16000 // metres across the square we keep
const OUT = 384 // samples per side in the output

// Which tile (and where inside it) a lat/lon falls in, in Web Mercator.
function tileCoords({ lat, lon }) {
  const n = 2 ** ZOOM
  const rad = (lat * Math.PI) / 180
  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  }
}

// A tiny PNG reader: enough for 8-bit RGB/RGBA, non-interlaced, which is what these tiles are.
function decodePng(buffer) {
  let pos = 8
  let header
  const idat = []
  while (pos < buffer.length) {
    const length = buffer.readUInt32BE(pos)
    const type = buffer.toString('ascii', pos + 4, pos + 8)
    const data = buffer.subarray(pos + 8, pos + 8 + length)
    if (type === 'IHDR') {
      header = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] }
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos += 12 + length
  }
  assert(header.depth === 8 && header.interlace === 0 && (header.color === 2 || header.color === 6), 'unexpected PNG format')
  const bpp = header.color === 6 ? 4 : 3
  const stride = header.width * bpp
  const raw = inflateSync(Buffer.concat(idat))
  const out = Buffer.alloc(header.height * stride)
  // Each row is stored as the difference from its neighbours (a PNG "filter"); undo that.
  for (let y = 0; y < header.height; y++) {
    const filter = raw[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0
      const b = y > 0 ? out[(y - 1) * stride + x] : 0
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0
      let value = raw[y * (stride + 1) + 1 + x]
      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      out[y * stride + x] = value & 255
    }
  }
  return { ...header, bpp, pixels: out }
}

// Stitch a 4x4 block of tiles around the resort into one big height grid (metres).
const centre = tileCoords(RESORT)
const x0 = Math.floor(centre.x) - 1
const y0 = Math.floor(centre.y) - 1
const TILES = 4
const GRID = TILES * 256
const grid = new Float32Array(GRID * GRID)

for (let ty = 0; ty < TILES; ty++) {
  for (let tx = 0; tx < TILES; tx++) {
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${ZOOM}/${x0 + tx}/${y0 + ty}.png`
    const response = await fetch(url)
    assert(response.ok, `${url} -> ${response.status}`)
    const png = decodePng(Buffer.from(await response.arrayBuffer()))
    for (let py = 0; py < 256; py++) {
      for (let px = 0; px < 256; px++) {
        const i = (py * 256 + px) * png.bpp
        const [r, g, b] = [png.pixels[i], png.pixels[i + 1], png.pixels[i + 2]]
        grid[(ty * 256 + py) * GRID + tx * 256 + px] = r * 256 + g + b / 256 - 32768
      }
    }
  }
}

const sample = (gx, gy) => {
  const ix = Math.floor(gx)
  const iy = Math.floor(gy)
  const fx = gx - ix
  const fy = gy - iy
  const at = (x, y) => grid[Math.min(GRID - 1, Math.max(0, y)) * GRID + Math.min(GRID - 1, Math.max(0, x))]
  const top = at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx
  const bottom = at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx
  return top * (1 - fy) + bottom * fy
}

// Centre on the actual summit: the highest point within ~3 km of the resort.
const metresPerPixel = (156543.03 * Math.cos((RESORT.lat * Math.PI) / 180)) / 2 ** ZOOM
const resortPx = { x: (centre.x - x0) * 256, y: (centre.y - y0) * 256 }
let summit = { x: 0, y: 0, height: -Infinity }
const search = Math.round(3000 / metresPerPixel)
for (let dy = -search; dy <= search; dy++) {
  for (let dx = -search; dx <= search; dx++) {
    const height = grid[Math.round(resortPx.y + dy) * GRID + Math.round(resortPx.x + dx)]
    if (height > summit.height) summit = { x: resortPx.x + dx, y: resortPx.y + dy, height }
  }
}

// Resample the square around the summit down to OUT x OUT, stored in decimetres.
const half = AREA / 2 / metresPerPixel
assert(summit.x - half >= 0 && summit.x + half < GRID && summit.y - half >= 0 && summit.y + half < GRID, 'area runs off the tiles')
const heights = new Uint16Array(OUT * OUT)
let min = Infinity
for (let j = 0; j < OUT; j++) {
  for (let i = 0; i < OUT; i++) {
    const metres = sample(summit.x - half + ((i + 0.5) / OUT) * 2 * half, summit.y - half + ((j + 0.5) / OUT) * 2 * half)
    heights[j * OUT + i] = Math.round(metres * 10)
    min = Math.min(min, metres)
  }
}

// Sanity check: Silver Star's summit is 1915 m.
assert(summit.height > 1850 && summit.height < 1980, `summit came out at ${summit.height} m`)

const base64 = Buffer.from(heights.buffer).toString('base64')
writeFileSync(
  new URL('../src/scene/heightmap.js', import.meta.url),
  `// Generated by scripts/heightmap.mjs from AWS Terrain Tiles (NRCan CDEM). Don't edit by hand.
// ${OUT}x${OUT} heights in decimetres, ${AREA} m across, centred on Silver Star's summit (north is -z).
export const SIZE = ${OUT}
export const AREA = ${AREA}
export const DATA = '${base64}'
`,
)
console.log(`summit ${summit.height.toFixed(0)} m, lowest ${min.toFixed(0)} m, ${(base64.length / 1024).toFixed(0)} KB`)
