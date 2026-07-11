import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { themeOf } from '../config/themeBus'
import { nebulaVertexShader, nebulaFragmentShader } from '../shaders/nebula'

/**
 * Atmosfera — skydome interno com nébula procedural (fbm noise).
 * Renderizado no BackSide para envolver a câmera. Discreto e lento.
 * Fica ao fundo (renderOrder baixo) e não escreve no depth buffer.
 */
export default function Atmosphere({ cfg }) {
  const materialRef = useRef()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: cfg.intensity },
      uColorA: { value: new THREE.Color(cfg.colorA) },
      uColorB: { value: new THREE.Color(cfg.colorB) },
      uColorC: { value: new THREE.Color(cfg.colorC) },
    }),
    [cfg]
  )

  // nébula muda de mundo junto com a vertical (azul/ouro → vinho → esmeralda)
  useEffect(() => {
    const onVertical = (e) => {
      const u = materialRef.current?.uniforms
      if (!u) return
      const t = themeOf(e.detail).nebula
      const d = { duration: 2.6, ease: 'power2.inOut', overwrite: 'auto' }
      const a = new THREE.Color(t.colorA)
      const b = new THREE.Color(t.colorB)
      const c = new THREE.Color(t.colorC)
      gsap.to(u.uColorA.value, { r: a.r, g: a.g, b: a.b, ...d })
      gsap.to(u.uColorB.value, { r: b.r, g: b.g, b: b.b, ...d })
      gsap.to(u.uColorC.value, { r: c.r, g: c.g, b: c.b, ...d })
    }
    window.addEventListener('constelacao:vertical', onVertical)
    return () => window.removeEventListener('constelacao:vertical', onVertical)
  }, [])

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta * (cfg.speed * 60)
    }
  })

  return (
    <mesh scale={cfg.radius} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={nebulaVertexShader}
        fragmentShader={nebulaFragmentShader}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
