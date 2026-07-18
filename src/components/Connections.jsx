import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { getOrganization } from '../data/organization'
import { lineVertexShader, lineFragmentShader } from '../shaders/connectionLines'
import { useThemeTint } from '../config/themeBus'

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
 * A geometria é construída UMA vez com TODAS as verticais: cada vértice leva
 * um bitmask (aMask) das constelações a que pertence e o fragment descarta o
 * que não é da vertical ativa (uVerticalBit). Trocar de mundo não reconstrói
 * nada — e ainda ganha o redesenho cênico: o drawRange anima de zero e as
 * linhas se DESENHAM das estrelas a cada chegada (entrada e troca).
 *
 * Hover numa estrela emite uma onda de energia que se propaga pelas linhas a
 * partir dela (uHoverPos/uHoverStart) — a rede reage ao toque.
 */
const SEGMENTS = 12
const VERTICALS = ['Poker', 'SX', 'Bet'] // bit 1, 2, 4

export default function Connections({ cfg }) {
  const materialRef = useRef()
  const org = useMemo(() => getOrganization(), [])
  const drawTween = useRef(null)
  const firstDraw = useRef(true)

  const geometry = useMemo(() => {
    const { byId } = org
    const links = org.links
    const vertsPerLink = SEGMENTS * 2 // pares de pontos (line segments)
    const positions = new Float32Array(links.length * vertsPerLink * 3)
    const progress = new Float32Array(links.length * vertsPerLink)
    const seeds = new Float32Array(links.length * vertsPerLink)
    const strengths = new Float32Array(links.length * vertsPerLink)
    const colors = new Float32Array(links.length * vertsPerLink * 3)
    const masks = new Float32Array(links.length * vertsPerLink)

    // cores SEM tint: o color grade da vertical entra via uTint no fragment
    // (tweenado pelo themeBus — a troca de mundo tinge as linhas ao vivo)
    const typeColors = Object.fromEntries(
      Object.entries(cfg.types).map(([k, v]) => [k, new THREE.Color(v.color)])
    )

    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const p = new THREE.Vector3()
    let v = 0

    links.forEach((link) => {
      const na = byId.get(link.a)
      const nb = byId.get(link.b)
      a.fromArray(na.pos)
      b.fromArray(nb.pos)
      // bitmask das verticais em que a relação existe (ambas as pontas)
      let mask = 0
      VERTICALS.forEach((vert, i) => {
        if (nodeInVertical(na, vert) && nodeInVertical(nb, vert)) mask += 1 << i
      })
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
          masks[v] = mask
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
    geo.setAttribute('aMask', new THREE.BufferAttribute(masks, 1))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [org, cfg])

  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: cfg.opacity },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
      uVerticalBit: { value: 1 }, // Poker
      uHoverPos: { value: new THREE.Vector3(0, 0, 0) },
      uHoverStart: { value: -1000 }, // sem onda ativa
    }),
    [cfg]
  )

  // linhas mergulham no color grade da vertical, como as partículas
  useThemeTint(materialRef, 2.4)

  // Draw-on: as linhas se desenham das estrelas, link a link (o drawRange
  // avança pelo buffer, e cada link é um trecho contíguo — stagger natural)
  const drawOn = (delay) => {
    const total = geometry.attributes.position.count
    drawTween.current?.kill()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      geometry.setDrawRange(0, total)
      return
    }
    geometry.setDrawRange(0, 0)
    const state = { n: 0 }
    drawTween.current = gsap.to(state, {
      n: total,
      duration: 2.6,
      delay,
      ease: 'power2.inOut',
      onUpdate: () => geometry.setDrawRange(0, Math.floor(state.n / 2) * 2),
    })
  }

  // entrada: desenha depois que as pessoas acenderam; troca de vertical:
  // troca a máscara e redesenha (a câmera está no dolly-out — cobre tudo)
  useEffect(() => {
    drawOn(firstDraw.current ? 3.0 : 0)
    firstDraw.current = false

    const bits = { Poker: 1, SX: 2, Bet: 4 }
    const onVertical = (e) => {
      const u = materialRef.current?.uniforms
      if (u) u.uVerticalBit.value = bits[e.detail?.key] ?? 1
      drawOn(0.45)
    }
    window.addEventListener('constelacao:vertical', onVertical)
    return () => {
      window.removeEventListener('constelacao:vertical', onVertical)
      drawTween.current?.kill()
    }
    // geometry é estável (org/cfg); o efeito re-arma só se ela rebuildar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry])

  // Onda de hover: nasce na estrela tocada e se propaga pela rede
  useEffect(() => {
    const onHover = (e) => {
      const u = materialRef.current?.uniforms
      if (!u || !e.detail?.node) return
      const p = e.detail.node.pos // mesmo espaço local do grupo
      u.uHoverPos.value.set(p[0], p[1], p[2])
      u.uHoverStart.value = u.uTime.value
    }
    window.addEventListener('constelacao:hover', onHover)
    return () => window.removeEventListener('constelacao:hover', onHover)
  }, [])

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
