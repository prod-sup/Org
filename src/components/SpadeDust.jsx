import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { starVertexShader, starFragmentShader } from '../shaders/starPoints'
import { SPADE_SHAPE, sampleOutline, sampleInside, toWorld } from '../data/spadeShape'

/**
 * SpadeDust — as partículas decorativas que DESENHAM o naipe ♠:
 *   • outline : milhares de pontos densos e brilhantes na silhueta (com um
 *     leve espalhamento para não parecer "traçado a régua")
 *   • fill    : pontos internos fracos que dão corpo/textura ao interior
 *
 * Reusa o shader do StarField (twinkle, drift, halo). Um draw call por camada.
 */
function buildDust(cfg, kind) {
  const { count, colors } = cfg
  const positions = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  const randoms = new Float32Array(count)
  const colorArr = new Float32Array(count * 3)

  const palette = colors.map((c) => new THREE.Color(c))
  const tmp = new THREE.Color()

  // Outline IMPERFEITO: uma "banda" de ruído ao longo do contorno controla
  // espessura, densidade e brilho de cada trecho. Vales viram falhas —
  // nada de linha contínua traçada a régua.
  let pts
  if (kind === 'outline') {
    const base = sampleOutline(Math.floor(count * 1.7))
    pts = []
    for (let i = 0; i < base.length; i++) {
      const f = i / base.length
      const band =
        0.55 +
        0.26 * Math.sin(f * 97.0 + 1.7) +
        0.21 * Math.sin(f * 23.0 + 4.2) +
        0.16 * Math.sin(f * 251.0 + 0.6)
      if (band < 0.34 && Math.random() > band * 1.8) continue // falha no traço
      pts.push({ x: base[i].x, y: base[i].y, band: Math.max(0.18, band) })
    }
  } else {
    pts = sampleInside(count).map((p) => ({ ...p, band: 1 }))
  }

  for (let i = 0; i < count; i++) {
    const p = pts[i % pts.length]
    // espessura variável: trechos "cheios" espalham mais, vales ficam finos
    const spread =
      kind === 'outline' ? cfg.spread * (0.35 + p.band * 2.1) : cfg.spread * 2.5
    const nx = p.x + (Math.random() * 2 - 1) * spread
    const ny = p.y + (Math.random() * 2 - 1) * spread
    const w = toWorld(nx, ny, (Math.random() * 2 - 1) * SPADE_SHAPE.depth * (kind === 'outline' ? 0.7 : 1.2))

    positions[i * 3 + 0] = w.x
    positions[i * 3 + 1] = w.y
    positions[i * 3 + 2] = w.z

    // brilho irregular: o tamanho acompanha a banda do trecho
    scales[i] = (0.35 + Math.random() * cfg.sizeVariance) * (0.5 + p.band * 0.9)
    randoms[i] = Math.random()

    tmp.copy(palette[(Math.random() * palette.length) | 0])
    colorArr[i * 3 + 0] = tmp.r
    colorArr[i * 3 + 1] = tmp.g
    colorArr[i * 3 + 2] = tmp.b
  }
  return { positions, scales, randoms, colorArr }
}

function DustLayer({ cfg, kind }) {
  const materialRef = useRef()
  const data = useMemo(() => buildDust(cfg, kind), [cfg, kind])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: cfg.size },
      uOpacity: { value: cfg.opacity },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uTwinkleSpeed: { value: cfg.twinkleSpeed },
      uDriftAmplitude: { value: cfg.driftAmplitude },
      uDriftSpeed: { value: cfg.driftSpeed },
    }),
    [cfg]
  )

  useFrame((_, delta) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value += delta
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={data.positions.length / 3} array={data.positions} itemSize={3} />
        <bufferAttribute attach="attributes-aScale" count={data.scales.length} array={data.scales} itemSize={1} />
        <bufferAttribute attach="attributes-aRandom" count={data.randoms.length} array={data.randoms} itemSize={1} />
        <bufferAttribute attach="attributes-aColor" count={data.colorArr.length / 3} array={data.colorArr} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function SpadeDust({ outline, fill }) {
  return (
    <group>
      <DustLayer cfg={outline} kind="outline" />
      <DustLayer cfg={fill} kind="fill" />
    </group>
  )
}
