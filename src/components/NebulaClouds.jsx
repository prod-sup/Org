import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { themeOf } from '../config/themeBus'

/**
 * NebulaClouds — as nuvens de cor do fundo, versão BARATA que roda em
 * qualquer PC (a nébula procedural por pixel só existe em T0/T1; estas
 * nuvens garantem que o fundo nunca fique preto e estático nos degraus
 * baixos). Poucos billboards aditivos com textura radial, à deriva lenta,
 * respirando e mudando de cor com o mundo ativo.
 */
function softTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,0.75)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.28)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// posições fixas (composição): cantos e diagonais, sempre atrás da cena
const CLOUDS = [
  { pos: [-34, 16, -46], scale: 52, slot: 'A', op: 0.20, drift: 0.9 },
  { pos: [30, 20, -52], scale: 44, slot: 'B', op: 0.16, drift: 1.3 },
  { pos: [38, -16, -44], scale: 48, slot: 'C', op: 0.18, drift: 0.7 },
  { pos: [-28, -20, -50], scale: 40, slot: 'B', op: 0.15, drift: 1.1 },
  { pos: [2, 26, -58], scale: 56, slot: 'A', op: 0.14, drift: 0.6 },
  { pos: [8, -28, -56], scale: 50, slot: 'C', op: 0.13, drift: 0.8 },
]

export default function NebulaClouds({ lite = false }) {
  // PC fraco: metade das nuvens — quads grandes são puro fill-rate
  const clouds = useMemo(() => (lite ? CLOUDS.slice(0, 3) : CLOUDS), [lite])
  const texture = useMemo(softTexture, [])
  const groupRef = useRef()
  const matRefs = useRef([])

  useEffect(() => () => texture.dispose(), [texture])

  // cores por slot: A/B saem da nébula do tema, C do accent — variedade real
  useEffect(() => {
    const apply = (detail, duration) => {
      const t = themeOf(detail)
      const bySlot = {
        A: new THREE.Color(t.nebula.colorB),
        B: new THREE.Color(t.nebula.colorA),
        C: new THREE.Color(t.nebula.colorC),
      }
      clouds.forEach((c, i) => {
        const mat = matRefs.current[i]
        if (!mat) return
        const col = bySlot[c.slot]
        gsap.to(mat.color, { r: col.r, g: col.g, b: col.b, duration, ease: 'power2.inOut' })
      })
    }
    apply(null, 0)
    const onVertical = (e) => apply(e.detail, 2.6)
    window.addEventListener('constelacao:vertical', onVertical)
    return () => window.removeEventListener('constelacao:vertical', onVertical)
  }, [clouds])

  // deriva + respiração + parallax do mouse: cada nuvem vive no próprio ritmo
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const g = groupRef.current
    if (!g) return
    const px = state.pointer.x
    const py = state.pointer.y
    g.children.forEach((mesh, i) => {
      const c = clouds[i]
      const depth = 1 + i * 0.25 // nuvens "mais longe" reagem menos
      mesh.rotation.z = t * 0.008 * c.drift * (i % 2 ? 1 : -1)
      mesh.position.x =
        c.pos[0] + Math.sin(t * 0.03 * c.drift + i * 1.7) * 3.5 - (px * 4) / depth
      mesh.position.y =
        c.pos[1] + Math.cos(t * 0.024 * c.drift + i * 2.3) * 2.5 - (py * 3) / depth
      const mat = matRefs.current[i]
      if (mat) mat.opacity = c.op * (0.8 + 0.25 * Math.sin(t * 0.05 * c.drift + i))
    })
  })

  return (
    <group ref={groupRef}>
      {clouds.map((c, i) => (
        <mesh key={i} position={c.pos} scale={c.scale} renderOrder={-9} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={(m) => (matRefs.current[i] = m)}
            map={texture}
            transparent
            opacity={c.op}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}
