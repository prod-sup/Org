import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getOrganization } from '../data/organization'
import { SHAPES } from '../data/shapes'
import { toWorld } from '../data/spadeShape'
import { flowVertexShader, flowFragmentShader } from '../shaders/flowPoints'
import { useTierDrawRange } from '../config/tierBus'
import { useActiveVertical, nodeInVertical } from './Connections'

/**
 * ParticleFlow — informação circulando pela empresa.
 * Cada partícula pertence a uma conexão e viaja de aStart a aEnd em loop,
 * com fase/velocidade próprias. Tudo na GPU: um único THREE.Points.
 *
 * Por vertical: só os links daquela constelação. Onde há poucos links
 * (SX/Bet), as partículas viram faíscas correndo pelo CONTORNO da forma —
 * toda constelação tem energia viva, mesmo com o time pequeno.
 */
export default function ParticleFlow({ cfg }) {
  const materialRef = useRef()
  const pointsRef = useRef()
  const org = useMemo(() => getOrganization(), [])
  const vertical = useActiveVertical()

  // menos partículas de fluxo nos degraus baixos (links já são aleatórios)
  useTierDrawRange(pointsRef)

  const geometry = useMemo(() => {
    const { byId } = org
    const links = org.links.filter(
      (l) => nodeInVertical(byId.get(l.a), vertical) && nodeInVertical(byId.get(l.b), vertical)
    )
    const n = cfg.count
    const positions = new Float32Array(n * 3) // exigido pelo three; real vem do shader
    const starts = new Float32Array(n * 3)
    const ends = new Float32Array(n * 3)
    const offsets = new Float32Array(n)
    const speeds = new Float32Array(n)
    const scales = new Float32Array(n)

    // faíscas de contorno: pares de pontos vizinhos na silhueta da forma ativa
    const shape = SHAPES.find((s) => s.key === vertical) ?? SHAPES[0]
    const rim = shape.sampleOutline(256)
    const rimPair = (i3) => {
      const k = (Math.random() * rim.length) | 0
      const j = (k + 2 + ((Math.random() * 6) | 0)) % rim.length
      const za = (Math.random() * 2 - 1) * 0.5
      const a = toWorld(rim[k].x, rim[k].y, za)
      const b = toWorld(rim[j].x, rim[j].y, za + (Math.random() * 2 - 1) * 0.3)
      starts.set([a.x, a.y, a.z], i3)
      ends.set([b.x, b.y, b.z], i3)
    }

    // com poucos links, a maior parte do fluxo vira faísca de contorno
    const linkShare =
      vertical === 'Suprema' ? 0.6 : links.length >= 12 ? 1 : links.length > 0 ? 0.45 : 0

    for (let i = 0; i < n; i++) {
      if (links.length && Math.random() < linkShare) {
        const link = links[(Math.random() * links.length) | 0]
        starts.set(byId.get(link.a).pos, i * 3)
        ends.set(byId.get(link.b).pos, i * 3)
      } else {
        rimPair(i * 3)
      }
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
  }, [org, cfg, vertical])

  useEffect(() => () => geometry.dispose(), [geometry])

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
