import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { starVertexShader, starFragmentShader } from '../shaders/starPoints'

/**
 * Gera as posições e atributos de uma camada de partículas.
 * Distribuição em elipsoide achatado com concentração no centro (coreBias),
 * dando a sensação de disco galáctico com profundidade.
 */
function buildLayer(cfg) {
  const { count, radius, flatten, coreBias, size, sizeVariance, colors, innerRadius = 0 } = cfg

  const positions = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  const randoms = new Float32Array(count)
  const colorArr = new Float32Array(count * 3)

  const palette = colors.map((c) => new THREE.Color(c))
  const tmp = new THREE.Color()

  for (let i = 0; i < count; i++) {
    // Raio com viés para o centro (Math.pow concentra amostras próximas de 0),
    // respeitando um miolo vazio (innerRadius) reservado ao organograma
    const r = innerRadius + Math.pow(Math.random(), coreBias) * (radius - innerRadius)

    // Direção esférica uniforme
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.sin(phi) * Math.sin(theta) * flatten // achatamento vertical
    const z = r * Math.cos(phi)

    positions[i * 3 + 0] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    // aScale é um MULTIPLICADOR (uSize já carrega o tamanho base no shader)
    scales[i] = 0.5 + Math.random() * (sizeVariance / size)
    randoms[i] = Math.random()

    tmp.copy(palette[(Math.random() * palette.length) | 0])
    colorArr[i * 3 + 0] = tmp.r
    colorArr[i * 3 + 1] = tmp.g
    colorArr[i * 3 + 2] = tmp.b
  }

  return { positions, scales, randoms, colorArr }
}

/**
 * Camada reutilizável de partículas em WebGL puro (THREE.Points + ShaderMaterial).
 */
function ParticleLayer({ cfg }) {
  const materialRef = useRef()

  const { positions, scales, randoms, colorArr } = useMemo(
    () => buildLayer(cfg),
    [cfg]
  )

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
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
    }
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScale"
          count={scales.length}
          array={scales}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={randoms.length}
          array={randoms}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={colorArr.length / 3}
          array={colorArr}
          itemSize={3}
        />
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

/**
 * StarField — compõe a poeira cósmica (fria) e as partículas douradas (quentes).
 * Recebe as configs de cada camada; nada aqui está acoplado ao organograma.
 */
export default function StarField({ dust, gold }) {
  return (
    <group>
      <ParticleLayer cfg={dust} />
      <ParticleLayer cfg={gold} />
    </group>
  )
}
