import * as THREE from "three"
import { offThread } from "./worker"

/**
 * A tiling 3D noise volume for the smoke: four octaves of smooth value noise summed into one channel.
 * Built once on the CPU, in a worker, so the raymarch only has to read a texture.
 */
export async function buildNoise3D(size = 128, seed = 7): Promise<THREE.Data3DTexture> {
  const data = await offThread(noiseBytes, size, seed)
  const tex = new THREE.Data3DTexture(data, size, size, size)
  tex.format = THREE.RedFormat
  tex.type = THREE.UnsignedByteType
  tex.minFilter = tex.magFilter = THREE.LinearFilter
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping
  tex.unpackAlignment = 1
  tex.needsUpdate = true
  return tex
}

/**
 * The volume's bytes. Each octave is a lattice of random values blended smoothly (a quintic fade) along x, then y,
 * then z: done one axis at a time over the whole volume, which is the same sums in the same order as blending the
 * eight corners for every voxel, many times quicker. Self-contained (it runs in a worker as its own source).
 */
function noiseBytes(size: number, seed: number): Uint8Array {
  let a = seed
  const rand = () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (p: number, q: number, t: number) => p + (q - p) * t
  const data = new Uint8Array(size * size * size)
  const acc = new Float32Array(size * size * size)
  const octaves: [period: number, weight: number][] = [[4, 0.5], [8, 0.25], [16, 0.15], [32, 0.1]]
  // where each voxel falls in a lattice cell, and how far across it
  const cell = new Int32Array(size)
  const frac = new Float64Array(size)

  for (const [period, weight] of octaves) {
    const lattice = new Float32Array(period * period * period).map(() => rand())
    const scale = period / size
    for (let i = 0; i < size; i++) {
      const f = i * scale
      cell[i] = Math.floor(f)
      frac[i] = fade(f - cell[i])
    }
    // along x, for every row of the lattice: X[(lz * period + ly) * size + x]
    const X = new Float64Array(period * period * size)
    for (let lz = 0; lz < period; lz++)
      for (let ly = 0; ly < period; ly++) {
        const row = (lz * period + ly) * period
        const out = (lz * period + ly) * size
        for (let x = 0; x < size; x++) {
          const ix = cell[x]
          X[out + x] = lerp(lattice[row + (ix % period)], lattice[row + ((ix + 1) % period)], frac[x])
        }
      }
    // then y, for every plane of the lattice: Y[(lz * size + y) * size + x]
    const Y = new Float64Array(period * size * size)
    for (let lz = 0; lz < period; lz++)
      for (let y = 0; y < size; y++) {
        const iy = cell[y]
        const r0 = (lz * period + (iy % period)) * size
        const r1 = (lz * period + ((iy + 1) % period)) * size
        const out = (lz * size + y) * size
        const ty = frac[y]
        for (let x = 0; x < size; x++) Y[out + x] = lerp(X[r0 + x], X[r1 + x], ty)
      }
    // then z, into the volume
    for (let z = 0; z < size; z++) {
      const iz = cell[z]
      const p0 = (iz % period) * size * size
      const p1 = ((iz + 1) % period) * size * size
      const tz = frac[z]
      const out = z * size * size
      for (let i = 0; i < size * size; i++) acc[out + i] += weight * lerp(Y[p0 + i], Y[p1 + i], tz)
    }
  }
  // stretch to the full byte range
  let lo = Infinity, hi = -Infinity
  for (let i = 0; i < acc.length; i++) { const v = acc[i]; if (v < lo) lo = v; if (v > hi) hi = v }
  for (let i = 0; i < acc.length; i++) data[i] = Math.round(((acc[i] - lo) / (hi - lo)) * 255)
  return data
}
