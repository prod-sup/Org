import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

const GROUP_OFFSET_X = 3.2 // deslocamento do naipe na cena (Scene.jsx)

/**
 * CameraController
 * - Reveal cinematográfico na entrada (GSAP): de longe até a posição de repouso.
 * - Parallax pelo mouse com forte inércia (damping).
 * - Flutuação idle (respiração) muito lenta.
 * - Hover: a câmera aproxima alguns "pixels" com easing (emoção, não zoom).
 * - Focus ('constelacao:focus'): voa até a pessoa (busca/clique) e volta com null.
 * - Responsivo: em viewports estreitos recua até o naipe caber.
 * - Respeita prefers-reduced-motion.
 */
export default function CameraController({ cfg }) {
  const { camera, pointer } = useThree()

  const ready = useRef(false)
  const target = useRef(new THREE.Vector3(...cfg.base))
  const current = useRef(new THREE.Vector3(...cfg.start))
  const lookCur = useRef(new THREE.Vector3(0, 0, 0))
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0))
  const reduced = useRef(false)
  const zoom = useRef(0)          // zoom pedido pela UI (+/−)
  const hoverT = useRef({ v: 0 }) // 0→1 quando uma estrela está em hover
  const focus = useRef(null)      // Vector3 da pessoa focada (mundo) ou null
  const pull = useRef({ v: 0 })   // dolly-out cinematográfico durante o morph
  const wide = useRef({ v: 0 })   // recuo extra persistente na visão Suprema (S)
  const lastEmit = useRef(0)      // throttle do evento p/ o minimapa

  // Troca de constelação: a câmera recua enquanto as partículas voam
  // (dolly-out → dolly-in), e fica mais aberta na visão de grupo (S)
  useEffect(() => {
    const onVertical = (e) => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reduced) {
        gsap.killTweensOf(pull.current)
        gsap.to(pull.current, {
          v: 1,
          duration: 1.1,
          ease: 'power2.out',
          onComplete: () =>
            gsap.to(pull.current, { v: 0, duration: 1.6, ease: 'power2.inOut' }),
        })
      }
      gsap.to(wide.current, {
        v: e.detail?.key === 'Suprema' ? 1 : 0,
        duration: reduced ? 0 : 2.2,
        ease: 'power2.inOut',
      })
    }
    window.addEventListener('constelacao:vertical', onVertical)
    return () => window.removeEventListener('constelacao:vertical', onVertical)
  }, [])

  // Zoom da UI: aproxima/afasta a posição de repouso com a mesma inércia
  useEffect(() => {
    const onZoom = (e) => {
      zoom.current = THREE.MathUtils.clamp(zoom.current + e.detail, -14, 16)
    }
    window.addEventListener('constelacao:zoom', onZoom)
    return () => window.removeEventListener('constelacao:zoom', onZoom)
  }, [])

  // Hover cinematográfico: micro-aproximação com easing GSAP
  useEffect(() => {
    const onHover = (e) => {
      gsap.to(hoverT.current, {
        v: e.detail ? 1 : 0,
        duration: e.detail ? 1.4 : 1.0,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }
    window.addEventListener('constelacao:hover', onHover)
    return () => window.removeEventListener('constelacao:hover', onHover)
  }, [])

  // Focus: voa até uma pessoa (busca / clique na estrela); null = volta ao todo
  useEffect(() => {
    const onFocus = (e) => {
      const node = e.detail?.node
      focus.current = node
        ? new THREE.Vector3(node.pos[0] + GROUP_OFFSET_X, node.pos[1], node.pos[2])
        : null
    }
    window.addEventListener('constelacao:focus', onFocus)
    return () => window.removeEventListener('constelacao:focus', onFocus)
  }, [])

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

    // Responsivo: em viewports estreitos, recua até o naipe inteiro caber
    const aspect = state.size.width / state.size.height
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2)
    const fitZ = Math.max(cfg.base[2], 11 / (Math.tan(halfFov) * aspect))

    if (focus.current) {
      // Voo até a pessoa: para diante dela, com parallax reduzido (intimidade)
      const f = focus.current
      target.current.set(
        f.x * 0.82 + pointer.x * strength * 0.18,
        f.y * 0.82 + 0.3 + pointer.y * strength * 0.18,
        f.z + 8.5 + Math.sin(t * cfg.floatSpeed) * floatAmp * 0.3
      )
      lookTarget.current.copy(f)
    } else {
      // Repouso: base + parallax + respiração + micro-aproximação do hover
      target.current.set(
        cfg.base[0] + pointer.x * strength,
        cfg.base[1] + pointer.y * strength + Math.sin(t * cfg.floatSpeed) * floatAmp,
        fitZ - zoom.current - hoverT.current.v * 1.6 +
          pull.current.v * 6 + wide.current.v * 4 +
          Math.cos(t * cfg.floatSpeed * 0.7) * floatAmp * 0.5
      )
      lookTarget.current.set(0, 0, 0)
    }

    // Inércia: posição e olhar aproximam-se suavemente dos alvos
    current.current.lerp(target.current, cfg.parallaxDamping)
    lookCur.current.lerp(lookTarget.current, cfg.parallaxDamping * 1.4)
    camera.position.copy(current.current)
    camera.lookAt(lookCur.current)

    // minimapa: para onde a câmera olha (coordenadas do naipe) + distância
    if (t - lastEmit.current > 0.15) {
      lastEmit.current = t
      window.dispatchEvent(
        new CustomEvent('constelacao:camera', {
          // focado: o ponto exato da pessoa; livre: o passeio do parallax
          detail: focus.current
            ? {
                x: lookCur.current.x - GROUP_OFFSET_X,
                y: lookCur.current.y,
                z: current.current.z - lookCur.current.z,
              }
            : {
                x: (current.current.x - cfg.base[0]) * 1.4,
                y: (current.current.y - cfg.base[1]) * 1.4,
                z: current.current.z,
              },
        })
      )
    }
  })

  return null
}
