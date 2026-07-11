import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { themeOf } from '../config/themeBus'

/**
 * ThemeConductor — o maestro do color grade. Na troca de vertical, tweena
 * fundo, névoa e a luz central para o mundo da constelação ativa:
 * ♠ meia-noite dourada · ♦ rubi · ♣ esmeralda. Tudo por uniform/cor viva —
 * zero rebuild, zero custo por frame extra.
 */
export default function ThemeConductor() {
  const scene = useThree((s) => s.scene)
  const lightRef = useRef()

  useEffect(() => {
    const onVertical = (e) => {
      const t = themeOf(e.detail)
      const bg = new THREE.Color(t.background)
      const lc = new THREE.Color(t.light)
      const d = { duration: 2.4, ease: 'power2.inOut', overwrite: 'auto' }
      if (scene.background?.isColor) gsap.to(scene.background, { r: bg.r, g: bg.g, b: bg.b, ...d })
      if (scene.fog) gsap.to(scene.fog.color, { r: bg.r, g: bg.g, b: bg.b, ...d })
      if (lightRef.current) gsap.to(lightRef.current.color, { r: lc.r, g: lc.g, b: lc.b, ...d })
    }
    window.addEventListener('constelacao:vertical', onVertical)
    return () => window.removeEventListener('constelacao:vertical', onVertical)
  }, [scene])

  return (
    <pointLight
      ref={lightRef}
      position={[0, 0, 0]}
      intensity={1.2}
      distance={80}
      decay={2}
      color="#ffdca0"
    />
  )
}
