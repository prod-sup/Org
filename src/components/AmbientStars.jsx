import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { starVertexShader, starFragmentShader } from '../shaders/starPoints'
import { SPADE_SHAPE, toWorld } from '../data/spadeShape'
import { SHAPES } from '../data/shapes'
import { getOrganization } from '../data/organization'
import { useActiveVertical, nodeInVertical } from './Connections'

/**
 * AmbientStars — estrelas decorativas cintilando dentro da constelação ativa.
 * No ♠ as estrelas são as pessoas; na SX e no Bet o time ainda é pequeno,
 * então estas estrelas "anônimas" preenchem a forma com a mesma vida
 * (brilho estourando no bloom + twinkle forte = as estrelas que explodem).
 *
 * Quanto mais gente a vertical tem, menos estrelas decorativas aparecem —
 * quando o time crescer, elas cedem o lugar sozinhas.
 */
export default function AmbientStars({ cfg }) {
  const materialRef = useRef()
  const org = useMemo(() => getOrganization(), [])
  const vertical = useActiveVertical()

  const data = useMemo(() => {
    const people = org.list.filter((n) => !n.vacant && nodeInVertical(n, vertical)).length
    const count = Math.max(0, cfg.count - people * 3)
    if (!count) return null

    const shape = SHAPES.find((s) => s.key === vertical) ?? SHAPES[0]
    const pts = shape.sampleInside(count)
    // nascimento explosivo: `position` é o ponto DISPERSO (longe, espalhado);
    // aPosB é o lugar final na constelação. O morph do shader (uMorph 0→1)
    // faz cada estrela voar pra dentro com o burst de dispersão no meio.
    const scattered = new Float32Array(count * 3)
    const finals = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const randoms = new Float32Array(count)
    const colorArr = new Float32Array(count * 3)
    const palette = cfg.colors.map((c) => new THREE.Color(c))
    const tmp = new THREE.Color()

    for (let i = 0; i < count; i++) {
      const p = pts[i % pts.length]
      const w = toWorld(p.x, p.y, (Math.random() * 2 - 1) * SPADE_SHAPE.depth)
      finals[i * 3 + 0] = w.x
      finals[i * 3 + 1] = w.y
      finals[i * 3 + 2] = w.z
      // origem: mesma direção do ponto, mas empurrada pra fora (explosão)
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const r = 5 + Math.random() * 9
      scattered[i * 3 + 0] = w.x + Math.sin(ph) * Math.cos(th) * r
      scattered[i * 3 + 1] = w.y + Math.sin(ph) * Math.sin(th) * r
      scattered[i * 3 + 2] = w.z + Math.cos(ph) * r * 0.6
      // poucas estrelas grandes ("heroínas"), muitas pequenas
      scales[i] = 0.7 + Math.pow(Math.random(), 2) * 2.8
      randoms[i] = Math.random()
      // brilho >1 estoura no bloom — é o que faz a estrela "explodir"
      tmp.copy(palette[(Math.random() * palette.length) | 0]).multiplyScalar(1.8)
      colorArr[i * 3 + 0] = tmp.r
      colorArr[i * 3 + 1] = tmp.g
      colorArr[i * 3 + 2] = tmp.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(scattered, 3))
    geo.setAttribute('aPosB', new THREE.BufferAttribute(finals, 3))
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
    geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colorArr, 3))
    return geo
  }, [org, vertical, cfg])

  useEffect(() => () => data?.dispose(), [data])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: cfg.size },
      uOpacity: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uTwinkleSpeed: { value: cfg.twinkleSpeed },
      uDriftAmplitude: { value: cfg.driftAmplitude },
      uDriftSpeed: { value: cfg.driftSpeed },
      uShapeFrom: { value: 0 },
      uShapeTo: { value: 1 },
      uMorph: { value: 0 },
    }),
    [cfg]
  )

  // nascimento: as estrelas EXPLODEM pra dentro da constelação — o morph do
  // shader carrega o burst de dispersão no meio do voo
  useEffect(() => {
    const u = materialRef.current?.uniforms
    if (!u || !data) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    u.uShapeFrom.value = 0
    u.uShapeTo.value = 1
    u.uMorph.value = reduced ? 1 : 0
    u.uOpacity.value = 0
    const tweens = [
      gsap.to(u.uOpacity, { value: cfg.opacity, duration: 0.7, delay: 0.5, ease: 'power1.out' }),
      gsap.to(u.uMorph, { value: 1, duration: reduced ? 0 : 2.4, delay: 0.4, ease: 'power2.inOut' }),
    ]
    return () => tweens.forEach((t) => t.kill())
  }, [data, cfg.opacity])

  useFrame((_, delta) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value += delta
  })

  if (!data) return null

  return (
    <points geometry={data} frustumCulled={false} renderOrder={2}>
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
