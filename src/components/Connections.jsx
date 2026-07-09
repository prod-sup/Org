import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getOrganization } from '../data/organization'
import { lineVertexShader, lineFragmentShader } from '../shaders/connectionLines'

/** Vertical ativa ('Poker' | 'SX' | 'Bet'). */
export function useActiveVertical() {
  const [vertical, setVertical] = useState('Poker')
  useEffect(() => {
    const onVertical = (e) => setVertical(e.detail?.key ?? 'Poker')
    window.addEventListener('constelacao:vertical', onVertical)
    return () => window.removeEventListener('constelacao:vertical', onVertical)
  }, [])
  return vertical
}

export function nodeInVertical(node, vertical) {
  return !node.verticals || node.verticals.includes(vertical)
}

/**
 * Connections — as ~250 relações da empresa como linhas douradas.
 * Cada linha é subdividida (SEGMENTS) para que o shimmer possa viajar por ela
 * e para dar uma curvatura vertical sutil (catenária invertida) — orgânico,
 * nunca reto demais. Um único LineSegments = um draw call.
 *
 * Ligações hierárquicas são um pouco mais presentes; estratégicas, mais tênues.
 */
const SEGMENTS = 12

export default function Connections({ cfg }) {
  const materialRef = useRef()
  const org = useMemo(() => getOrganization(), [])
  const vertical = useActiveVertical()

  const geometry = useMemo(() => {
    const { byId } = org
    // só as relações da vertical ativa: nada de linhas do Poker na SX/Bet
    const links = org.links.filter(
      (l) => nodeInVertical(byId.get(l.a), vertical) && nodeInVertical(byId.get(l.b), vertical)
    )
    const vertsPerLink = SEGMENTS * 2 // pares de pontos (line segments)
    const positions = new Float32Array(links.length * vertsPerLink * 3)
    const progress = new Float32Array(links.length * vertsPerLink)
    const seeds = new Float32Array(links.length * vertsPerLink)
    const strengths = new Float32Array(links.length * vertsPerLink)
    const colors = new Float32Array(links.length * vertsPerLink * 3)

    const typeColors = Object.fromEntries(
      Object.entries(cfg.types).map(([k, v]) => [k, new THREE.Color(v.color)])
    )

    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const p = new THREE.Vector3()
    let v = 0

    links.forEach((link) => {
      a.fromArray(byId.get(link.a).pos)
      b.fromArray(byId.get(link.b).pos)
      const seed = Math.random()
      const type = cfg.types[link.type] ?? cfg.types.hierarchy
      const color = typeColors[link.type] ?? typeColors.hierarchy
      const sag = a.distanceTo(b) * cfg.curvature

      const at = (t) => {
        p.lerpVectors(a, b, t)
        p.y += Math.sin(t * Math.PI) * sag // arco vertical muito sutil
        return p
      }

      for (let s = 0; s < SEGMENTS; s++) {
        const t0 = s / SEGMENTS
        const t1 = (s + 1) / SEGMENTS
        for (const t of [t0, t1]) {
          const q = at(t)
          positions[v * 3 + 0] = q.x
          positions[v * 3 + 1] = q.y
          positions[v * 3 + 2] = q.z
          progress[v] = t
          seeds[v] = seed
          strengths[v] = type.strength
          colors[v * 3 + 0] = color.r
          colors[v * 3 + 1] = color.g
          colors[v * 3 + 2] = color.b
          v++
        }
      }
    })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geo.setAttribute('aStrength', new THREE.BufferAttribute(strengths, 1))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [org, cfg, vertical])

  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: cfg.opacity },
    }),
    [cfg]
  )

  useFrame((_, delta) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value += delta
  })

  return (
    <lineSegments geometry={geometry} frustumCulled={false} renderOrder={0}>
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
