import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
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
