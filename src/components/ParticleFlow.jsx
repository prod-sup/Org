import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getOrganization } from '../data/organization'
import { flowVertexShader, flowFragmentShader } from '../shaders/flowPoints'
import { useTierDrawRange } from '../config/tierBus'

/**
 * ParticleFlow — informação circulando pela empresa.
 * Cada partícula pertence a uma conexão e viaja de aStart a aEnd em loop,
 * com fase/velocidade próprias. Tudo na GPU: um único THREE.Points.
 */
export default function ParticleFlow({ cfg }) {
  const materialRef = useRef()
  const pointsRef = useRef()
  const org = useMemo(() => getOrganization(), [])

  // menos partículas de fluxo nos degraus baixos (links já são aleatórios)
  useTierDrawRange(pointsRef)

  const geometry = useMemo(() => {
    const { links, byId } = org
    const n = cfg.count
    const positions = new Float32Array(n * 3) // exigido pelo three; real vem do shader
    const starts = new Float32Array(n * 3)
    const ends = new Float32Array(n * 3)
    const offsets = new Float32Array(n)
    const speeds = new Float32Array(n)
    const scales = new Float32Array(n)

    for (let i = 0; i < n; i++) {
      const link = links[(Math.random() * links.length) | 0]
      const a = byId.get(link.a).pos
      const b = byId.get(link.b).pos
      starts.set(a, i * 3)
      ends.set(b, i * 3)
      offsets[i] = Math.random()
      speeds[i] = cfg.speed * (0.6 + Math.random() * 0.8)
      scales[i] = 0.6 + Math.random() * 0.9
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aStart', new THREE.BufferAttribute(starts, 3))
    geo.setAttribute('aEnd', new THREE.BufferAttribute(ends, 3))
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1))
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
    return geo
  }, [org, cfg])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: cfg.size },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uCurvature: { value: cfg.curvature },
      uColor: { value: new THREE.Color(cfg.color) },
      uOpacity: { value: cfg.opacity },
    }),
    [cfg]
  )

  useFrame((_, delta) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value += delta
  })

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false} renderOrder={1}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={flowVertexShader}
        fragmentShader={flowFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
