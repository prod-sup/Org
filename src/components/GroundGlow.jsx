import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { themeOf } from '../config/themeBus'

/**
 * GroundGlow — o "chão de luz" sob a constelação (referência do mock):
 * um halo elíptico suave que ancora o naipe no espaço, na cor do mundo
 * ativo. Um plano aditivo com textura radial gerada em canvas — 1 draw call.
 */
function radialTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export default function GroundGlow() {
  const matRef = useRef()
  const texture = useMemo(radialTexture, [])

  useEffect(() => () => texture.dispose(), [texture])

  // o halo acompanha o color grade da vertical
  useEffect(() => {
    const onVertical = (e) => {
      const mat = matRef.current
      if (!mat) return
      const c = new THREE.Color(themeOf(e.detail).accent)
      gsap.to(mat.color, { r: c.r, g: c.g, b: c.b, duration: 2.4, ease: 'power2.inOut' })
    }
    window.addEventListener('constelacao:vertical', onVertical)
    return () => window.removeEventListener('constelacao:vertical', onVertical)
  }, [])

  return (
    <mesh position={[0, -7.4, -2]} scale={[15, 4.2, 1]} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        color="#d8b56d"
        transparent
        opacity={0.16}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}
