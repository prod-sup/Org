import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { lineVertexShader, lineFragmentShader } from '../shaders/connectionLines'
import { SPADE_SHAPE, sampleInside, sampleOutline, toWorld } from '../data/spadeShape'

/**
 * ConstellationWeb — a teia fina dourada que preenche o interior do ♠
 * (o "tecido" da referência). Pontos internos + amostra do contorno,
 * conectados aos vizinhos próximos. Puramente decorativa.
 *
 * Um único LineSegments; o shimmer do shader das conexões dá vida à malha.
 */
export default function ConstellationWeb({ cfg }) {
  const materialRef = useRef()

  const geometry = useMemo(() => {
    const inner = sampleInside(cfg.points)
    const edge = sampleOutline(Math.floor(cfg.points * 0.35))
    const pts = inner.concat(edge).map((p) => {
      const w = toWorld(p.x, p.y, (Math.random() * 2 - 1) * SPADE_SHAPE.depth * 0.6)
      return [w.x, w.y, w.z]
    })

    // vizinhos próximos (limite por ponto para a teia respirar)
    const maxD2 = cfg.linkDistance * cfg.linkDistance
    const degree = new Uint8Array(pts.length)
    const segs = []
    for (let i = 0; i < pts.length; i++) {
      if (degree[i] >= cfg.maxLinks) continue
      for (let j = i + 1; j < pts.length; j++) {
        if (degree[i] >= cfg.maxLinks) break
        if (degree[j] >= cfg.maxLinks) continue
        const dx = pts[i][0] - pts[j][0]
        const dy = pts[i][1] - pts[j][1]
        const dz = pts[i][2] - pts[j][2]
        if (dx * dx + dy * dy + dz * dz > maxD2) continue
        segs.push(i, j)
        degree[i]++
        degree[j]++
      }
    }

    const n = segs.length
    const positions = new Float32Array(n * 3)
    const progress = new Float32Array(n)
    const seeds = new Float32Array(n)
    const strengths = new Float32Array(n)
    for (let k = 0; k < n; k += 2) {
      const seed = Math.random()
      for (let e = 0; e < 2; e++) {
        const p = pts[segs[k + e]]
        positions[(k + e) * 3 + 0] = p[0]
        positions[(k + e) * 3 + 1] = p[1]
        positions[(k + e) * 3 + 2] = p[2]
        progress[k + e] = e
        seeds[k + e] = seed
        strengths[k + e] = 0.6 + Math.random() * 0.4
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geo.setAttribute('aStrength', new THREE.BufferAttribute(strengths, 1))
    return geo
  }, [cfg])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(cfg.color) },
      uOpacity: { value: cfg.opacity },
    }),
    [cfg]
  )

  useFrame((_, delta) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value += delta * 0.5
  })

  return (
    <lineSegments geometry={geometry} frustumCulled={false} renderOrder={0}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={lineVertexShader}
        fragmentShader={lineFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  )
}
