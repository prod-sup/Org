import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { starVertexShader, starFragmentShader } from '../shaders/starPoints'
import { SPADE_SHAPE, toWorld } from '../data/spadeShape'
import { SHAPES } from '../data/shapes'
import { useTierDrawRange } from '../config/tierBus'
import { useThemeTint } from '../config/themeBus'
import { useSyncPixelRatio } from '../config/pixelRatio'
import { useLayerLife } from '../config/sceneLife'

/**
 * SpadeDust — as partículas que DESENHAM a constelação ativa:
 *   • outline : pontos densos na silhueta, com banda de ruído (espessura
 *     variável, falhas — nunca linha de régua)
 *   • fill    : pontos internos fracos que dão corpo/textura
 *
 * Cada partícula conhece sua posição nas TRÊS formas (♠ ♦ ♣); o evento
 * 'constelacao:vertical' dispara o morph no shader (GSAP anima uMorph) —
 * as partículas voam de uma constelação para a outra.
 */

// banda de ruído ao longo do contorno: espessura/brilho variáveis + falhas
function bandedOutline(shape, count) {
  const base = shape.sampleOutline(Math.floor(count * 1.7))
  const pts = []
  for (let i = 0; i < base.length; i++) {
    const f = i / base.length
    const band =
      0.55 +
      0.26 * Math.sin(f * 97.0 + 1.7) +
      0.21 * Math.sin(f * 23.0 + 4.2) +
      0.16 * Math.sin(f * 251.0 + 0.6)
    if (band < 0.34 && Math.random() > band * 1.8) continue
    pts.push({ x: base[i].x, y: base[i].y, band: Math.max(0.18, band) })
  }
  // reamostra para EXATAMENTE `count` pontos cobrindo o contorno inteiro —
  // sem isso, o final do traçado (a cauda!) ficava de fora do buffer
  const out = new Array(count)
  const step = pts.length / count
  for (let i = 0; i < count; i++) out[i] = pts[Math.floor(i * step) % pts.length]
  return out
}

function buildDust(cfg, kind) {
  const { count, colors } = cfg
  const positions = new Float32Array(count * 3) // forma 0 (♠)
  const posB = new Float32Array(count * 3)      // forma 1 (♦)
  const posC = new Float32Array(count * 3)      // forma 2 (♣)
  const scales = new Float32Array(count)
  const randoms = new Float32Array(count)
  const colorArr = new Float32Array(count * 3)

  const palette = colors.map((c) => new THREE.Color(c))
  const tmp = new THREE.Color()

  // pontos por forma (mesma contagem → morph 1:1 por índice)
  const perShape = SHAPES.map((shape) =>
    kind === 'outline' ? bandedOutline(shape, count) : shape.sampleInside(count)
  )

  const buffers = [positions, posB, posC]

  // slots embaralhados: o prefixo do buffer é uma subamostra uniforme do
  // desenho inteiro → o drawRange por degrau reduz densidade, não recorta
  const slot = new Uint32Array(count)
  for (let i = 0; i < count; i++) slot[i] = i
  for (let i = count - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    const tmpSlot = slot[i]
    slot[i] = slot[j]
    slot[j] = tmpSlot
  }

  for (let idx = 0; idx < count; idx++) {
    const i = slot[idx]
    const zJitter = (Math.random() * 2 - 1) * SPADE_SHAPE.depth * (kind === 'outline' ? 0.7 : 1.2)
    let band = 1

    for (let s = 0; s < SHAPES.length; s++) {
      const pts = perShape[s]
      const p = pts[idx % pts.length] // amostra sequencial; escrita no slot embaralhado
      if (s === 0) band = p.band ?? 1
      const spread =
        kind === 'outline'
          ? cfg.spread * (0.35 + (p.band ?? 1) * 2.1)
          : cfg.spread * 2.5
      const nx = p.x + (Math.random() * 2 - 1) * spread
      const ny = p.y + (Math.random() * 2 - 1) * spread
      const w = toWorld(nx, ny, zJitter)
      buffers[s][i * 3 + 0] = w.x
      buffers[s][i * 3 + 1] = w.y
      buffers[s][i * 3 + 2] = w.z
    }

    scales[i] = (0.35 + Math.random() * cfg.sizeVariance) * (0.5 + band * 0.9)
    randoms[i] = Math.random()

    tmp.copy(palette[(Math.random() * palette.length) | 0])
    colorArr[i * 3 + 0] = tmp.r
    colorArr[i * 3 + 1] = tmp.g
    colorArr[i * 3 + 2] = tmp.b
  }
  return { positions, posB, posC, scales, randoms, colorArr }
}

function DustLayer({ cfg, kind }) {
  const materialRef = useRef()
  const pointsRef = useRef()
  const shapeRef = useRef(0)
  const data = useMemo(() => buildDust(cfg, kind), [cfg, kind])

  // densidade por degrau de qualidade — via drawRange, sem rebuild
  useTierDrawRange(pointsRef)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: cfg.size },
      uOpacity: { value: cfg.opacity },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uTwinkleSpeed: { value: cfg.twinkleSpeed },
      uDriftAmplitude: { value: cfg.driftAmplitude },
      uDriftSpeed: { value: cfg.driftSpeed },
      uShapeFrom: { value: 0 },
      uShapeTo: { value: 0 },
      uMorph: { value: 0 },
      uBurst: { value: 1.7 }, // explosão generosa no voo entre naipes
      uTint: { value: new THREE.Vector3(1, 1, 1) },
    }),
    [cfg]
  )

  // color grade da vertical ativa acompanha o morph
  useThemeTint(materialRef, 2.4)

  // sprite acompanha o DPR do degrau em vez de inchar quando a resolução cai
  useSyncPixelRatio(materialRef)

  // ato do naipe: contorno se desenha primeiro, o miolo preenche depois;
  // no focus o preenchimento recua mais que o contorno (a forma permanece)
  useLayerLife(
    materialRef,
    cfg.opacity,
    kind === 'outline'
      ? { introDelay: 1.9, introDuration: 2.4, spotlight: 0.75 }
      : { introDelay: 2.5, introDuration: 2.6, spotlight: 0.5 }
  )

  // troca de vertical → morph GSAP entre a forma atual e a nova
  useEffect(() => {
    const onVertical = (e) => {
      const next = e.detail?.index ?? 0
      const u = materialRef.current?.uniforms
      if (!u || next === shapeRef.current) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      u.uShapeFrom.value = shapeRef.current
      u.uShapeTo.value = next
      shapeRef.current = next
      gsap.killTweensOf(u.uMorph)
      u.uMorph.value = 0
      gsap.to(u.uMorph, {
        value: 1,
        duration: reduced ? 0 : 2.4,
        ease: 'power2.inOut',
        onComplete: () => {
          u.uShapeFrom.value = next
          u.uMorph.value = 0
        },
      })
    }
    window.addEventListener('constelacao:vertical', onVertical)
    return () => window.removeEventListener('constelacao:vertical', onVertical)
  }, [])

  useFrame((_, delta) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value += delta
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={data.positions.length / 3} array={data.positions} itemSize={3} />
        <bufferAttribute attach="attributes-aPosB" count={data.posB.length / 3} array={data.posB} itemSize={3} />
        <bufferAttribute attach="attributes-aPosC" count={data.posC.length / 3} array={data.posC} itemSize={3} />
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
