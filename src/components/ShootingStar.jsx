import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'

/**
 * ShootingStar — de tempos em tempos, uma estrela cadente risca o céu.
 * Um único plano esticado com gradiente (cabeça brilhante → cauda),
 * animado por GSAP em trajetos aleatórios. Invisível fora do voo:
 * custo zero em repouso, 1 draw call durante ~1s. Roda em qualquer PC.
 */
function trailTexture() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 16
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 128, 0)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.75, 'rgba(255,244,220,0.55)')
  g.addColorStop(0.94, 'rgba(255,255,255,0.95)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 16)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export default function ShootingStar() {
  const meshRef = useRef()
  const matRef = useRef()
  const texture = useMemo(trailTexture, [])

  useEffect(() => () => texture.dispose(), [texture])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer

    const fly = () => {
      const mesh = meshRef.current
      const mat = matRef.current
      if (!mesh || !mat) {
        schedule()
        return
      }
      // trajeto: nasce num canto alto e cruza em diagonal
      const fromX = -30 + Math.random() * 24
      const fromY = 12 + Math.random() * 8
      const dx = 16 + Math.random() * 14
      const dy = -(6 + Math.random() * 8)
      const angle = Math.atan2(dy, dx)
      const z = -20 - Math.random() * 18

      mesh.position.set(fromX, fromY, z)
      mesh.rotation.z = angle
      mesh.visible = true
      mat.opacity = 0

      const dur = 0.9 + Math.random() * 0.5
      gsap.to(mesh.position, { x: fromX + dx, y: fromY + dy, duration: dur, ease: 'power1.in' })
      gsap.to(mat, { opacity: 0.9, duration: dur * 0.25, ease: 'power1.out' })
      gsap.to(mat, {
        opacity: 0,
        duration: dur * 0.45,
        delay: dur * 0.55,
        ease: 'power1.in',
        onComplete: () => {
          mesh.visible = false
          schedule()
        },
      })
    }

    const schedule = () => {
      timer = setTimeout(fly, 5000 + Math.random() * 9000)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  return (
    <mesh ref={meshRef} visible={false} scale={[7, 0.55, 1]} renderOrder={-7}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}
