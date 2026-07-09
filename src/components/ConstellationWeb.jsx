import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { lineVertexShader, lineFragmentShader } from '../shaders/connectionLines'
import { SPADE_SHAPE, toWorld } from '../data/spadeShape'
import { SHAPES } from '../data/shapes'
import { useTierDrawRange } from '../config/tierBus'
import { useActiveVertical } from './Connections'

/**
 * ConstellationWeb — a teia fina dourada que preenche o interior da
 * constelação ativa (♠ ♦ ♣). Pontos internos + amostra do contorno,
 * conectados aos vizinhos próximos. Puramente decorativa.
 *
 * Um único LineSegments; o shimmer do shader das conexões dá vida à malha.
 * Na troca de vertical a teia se refaz na nova forma (fade-out → fade-in).
 */
export default function ConstellationWeb({ cfg }) {
  const materialRef = useRef()
  const linesRef = useRef()
  const vertical = useActiveVertical()

  // densidade da teia por degrau (drawRange em pares de vértices)
  useTierDrawRange(linesRef, { even: true })

  const geometry = useMemo(() => {
    const shape = SHAPES.find((s) => s.key === vertical) ?? SHAPES[0]
    const inner = shape.sampleInside(cfg.points)
    const edge = shape.sampleOutline(Math.floor(cfg.points * 0.35))
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

    // embaralha os SEGMENTOS (pares) — o prefixo do drawRange vira uma
    // subamostra uniforme da teia, não um recorte de região
    for (let k = segs.length / 2 - 1; k > 0; k--) {
      const j = (Math.random() * (k + 1)) | 0
      for (let e = 0; e < 2; e++) {
        const tmpIdx = segs[k * 2 + e]
        segs[k * 2 + e] = segs[j * 2 + e]
        segs[j * 2 + e] = tmpIdx
      }
    }

    const n = segs.length
    const positions = new Float32Array(n * 3)
    const progress = new Float32Array(n)
    const seeds = new Float32Array(n)
    const strengths = new Float32Array(n)
    const colors = new Float32Array(n * 3)
    const webColor = new THREE.Color(cfg.color)
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
        colors[(k + e) * 3 + 0] = webColor.r
        colors[(k + e) * 3 + 1] = webColor.g
        colors[(k + e) * 3 + 2] = webColor.b
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geo.setAttribute('aStrength', new THREE.BufferAttribute(strengths, 1))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [cfg, vertical])

  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: cfg.opacity },
    }),
    [cfg]
  )

  // a teia se refaz na nova forma; o fade cobre o instante da reconstrução
  useEffect(() => {
    const u = materialRef.current?.uniforms
    if (!u) return
    u.uOpacity.value = 0
    const tween = gsap.to(u.uOpacity, {
      value: cfg.opacity,
      duration: 1.6,
      delay: 0.9, // espera as partículas chegarem na nova constelação
      ease: 'power2.out',
    })
    return () => tween.kill()
  }, [geometry, cfg.opacity])

  useFrame((_, delta) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value += delta * 0.5
  })

  return (
    <lineSegments ref={linesRef} geometry={geometry} frustumCulled={false} renderOrder={0}>
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
