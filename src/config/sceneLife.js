/**
 * sceneLife — dois fatores globais de "vida" que cada camada multiplica na
 * própria opacidade:
 *
 *   intro  0→1  ENTRADA EM ATOS: cada camada nasce no seu instante (delay
 *               próprio) — escuridão → nuvens de cor → cosmos → naipe →
 *               pessoas → conexões se desenhando → fluxo. A constelação
 *               NASCE diante do usuário em vez de já estar toda acesa
 *               quando a câmera chega.
 *   spot   1→x  SPOTLIGHT DO FOCUS: ao voar até uma pessoa, o fundo recua
 *               (camadas distantes escurecem) — a empresa vira cenário e a
 *               pessoa vira o assunto. Volta a 1 ao sair do focus.
 *
 * Custo zero de GPU: é um número multiplicado num uniform já existente.
 * prefers-reduced-motion: sem intro (nasce acesa); o spotlight (não é
 * movimento) continua.
 */
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'

/** Fator {intro, spot} tweenado por GSAP. Ler em useFrame: f.current.intro. */
export function useLifeFactor({ introDelay = 0, introDuration = 2.2, spotlight = 1 } = {}) {
  const f = useRef({ intro: 1, spot: 1 })

  useEffect(() => {
    const obj = f.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduced) {
      obj.intro = 0
      gsap.to(obj, {
        intro: 1,
        duration: introDuration,
        delay: introDelay,
        ease: 'power2.inOut',
      })
    }

    let onFocus = null
    if (spotlight < 1) {
      onFocus = (e) => {
        gsap.to(obj, {
          spot: e.detail?.node ? spotlight : 1,
          duration: 1.5,
          ease: 'power2.inOut',
          overwrite: 'auto',
        })
      }
      window.addEventListener('constelacao:focus', onFocus)
    }

    return () => {
      gsap.killTweensOf(obj)
      if (onFocus) window.removeEventListener('constelacao:focus', onFocus)
    }
    // opções são fixas por ponto de uso — mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return f
}

/**
 * Aplica o fator ao uniform de opacidade do material (uOpacity por padrão).
 * Escreve todo frame — sobrevive à recriação de uniforms na troca de tier.
 * Retorna o fator para a camada usar em outros materiais (ex.: núcleo da galáxia).
 */
export function useLayerLife(materialRef, baseOpacity, opts = {}) {
  const { uniform = 'uOpacity', ...factorOpts } = opts
  const f = useLifeFactor(factorOpts)
  const base = useRef(baseOpacity)
  base.current = baseOpacity

  useFrame(() => {
    const u = materialRef.current?.uniforms?.[uniform]
    if (u) u.value = base.current * f.current.intro * f.current.spot
  })

  return f
}
