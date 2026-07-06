import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

/**
 * CameraController
 * - Reveal cinematográfico na entrada (GSAP): de longe até a posição de repouso.
 * - Parallax pelo mouse com forte inércia (damping).
 * - Flutuação idle (respiração) muito lenta.
 * - Respeita prefers-reduced-motion.
 *
 * Não usa OrbitControls de propósito: o movimento é dirigido, nunca solto.
 * O zoom "inteligente" entra na Etapa 5 e vai apenas ajustar `base.z`.
 */
export default function CameraController({ cfg }) {
  const { camera, pointer } = useThree()

  const ready = useRef(false)
  const target = useRef(new THREE.Vector3(...cfg.base))
  const current = useRef(new THREE.Vector3(...cfg.start))
  const reduced = useRef(false)

  useEffect(() => {
    reduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    camera.position.set(...cfg.start)
    camera.lookAt(0, 0, 0)
    current.current.set(...cfg.start)

    if (reduced.current) {
      camera.position.set(...cfg.base)
      current.current.set(...cfg.base)
      ready.current = true
      return
    }

    const ctx = gsap.context(() => {
      gsap.to(camera.position, {
        x: cfg.base[0],
        y: cfg.base[1],
        z: cfg.base[2],
        duration: cfg.introDuration,
        ease: cfg.introEase,
        onUpdate: () => current.current.copy(camera.position),
        onComplete: () => {
          ready.current = true
        },
      })
    })

    return () => ctx.revert()
  }, [camera, cfg])

  useFrame((state) => {
    // Durante a intro o GSAP controla a câmera; só garantimos o olhar no centro.
    if (!ready.current) {
      camera.lookAt(0, 0, 0)
      return
    }

    const t = state.clock.elapsedTime
    const strength = reduced.current ? 0 : cfg.parallaxStrength
    const floatAmp = reduced.current ? 0 : cfg.floatAmplitude

    // Alvo = base + parallax (mouse) + flutuação idle
    target.current.set(
      cfg.base[0] + pointer.x * strength,
      cfg.base[1] + pointer.y * strength + Math.sin(t * cfg.floatSpeed) * floatAmp,
      cfg.base[2] + Math.cos(t * cfg.floatSpeed * 0.7) * floatAmp * 0.5
    )

    // Inércia: aproxima suavemente a posição atual do alvo
    current.current.lerp(target.current, cfg.parallaxDamping)
    camera.position.copy(current.current)
    camera.lookAt(0, 0, 0)
  })

  return null
}
