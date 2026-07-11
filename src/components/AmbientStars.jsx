import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { starVertexShader, starFragmentShader } from '../shaders/starPoints'
import { SPADE_SHAPE, toWorld } from '../data/spadeShape'
import { useActiveVertical } from './Connections'
import { useThemeTint } from '../config/themeBus'

/**
 * AmbientStars — as estrelas que EXPLODEM: a cada troca de constelação elas
 * partem de um miolo apertado e se espalham pela tela inteira, onde ficam
 * cintilando. Presentes em TODAS as verticais; nunca se amontoam em borrão.
 */
export default function AmbientStars({ cfg }) {
  const materialRef = useRef()
  const vertical = useActiveVertical()

  const data = useMemo(() => {
    const count = cfg.count

    // nascimento explosivo PRA FORA: `position` é um miolo apertado no centro
    // da constelação; aPosB é o destino ESPALHADO pela tela inteira. O morph
    // do shader (uMorph 0→1) dispara a explosão — e as estrelas FICAM
    // espalhadas, cintilando pela tela toda (nunca se amontoam num borrão).
    const scattered = new Float32Array(count * 3)
    const finals = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const randoms = new Float32Array(count)
    const colorArr = new Float32Array(count * 3)
    const palette = cfg.colors.map((c) => new THREE.Color(c))
    const tmp = new THREE.Color()
    const center = toWorld(0, -0.19, 0) // centro visual do naipe

    for (let i = 0; i < count; i++) {
      // destino: elipsoide largo cobrindo a tela, com leve viés pro centro
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const rr = Math.pow(Math.random(), 0.6)
      finals[i * 3 + 0] = center.x + Math.sin(ph) * Math.cos(th) * rr * 14
      finals[i * 3 + 1] = center.y + Math.sin(ph) * Math.sin(th) * rr * 8.5
      finals[i * 3 + 2] = center.z + Math.cos(ph) * rr * 4 * SPADE_SHAPE.depth
      // origem: miolo apertado — daqui elas explodem pra fora
      scattered[i * 3 + 0] = center.x + (Math.random() * 2 - 1) * 1.2
      scattered[i * 3 + 1] = center.y + (Math.random() * 2 - 1) * 1.2
      scattered[i * 3 + 2] = center.z + (Math.random() * 2 - 1) * 0.8
      // poucas estrelas grandes ("heroínas"), muitas pequenas
      scales[i] = 0.7 + Math.pow(Math.random(), 2) * 2.8
      randoms[i] = Math.random()
      // brilho >1 estoura no bloom — é o que faz a estrela "explodir"
      tmp.copy(palette[(Math.random() * palette.length) | 0]).multiplyScalar(1.4)
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
  }, [vertical, cfg])

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
      uBurst: { value: 1.4 },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
    }),
    [cfg]
  )

  // as estrelas soltas mergulham na paleta da vertical
  useThemeTint(materialRef, 2.0)

  // a cada troca: explode do miolo pra tela toda (burst do shader no meio)
  useEffect(() => {
    const u = materialRef.current?.uniforms
    if (!u || !data) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    u.uShapeFrom.value = 0
    u.uShapeTo.value = 1
    u.uMorph.value = reduced ? 1 : 0
    u.uOpacity.value = 0
    const tweens = [
      gsap.to(u.uOpacity, { value: cfg.opacity, duration: 0.45, delay: 0.15, ease: 'power1.out' }),
      gsap.to(u.uMorph, { value: 1, duration: reduced ? 0 : 2.0, delay: 0.2, ease: 'power3.out' }),
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
