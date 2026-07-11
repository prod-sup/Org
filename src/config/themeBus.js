import { useEffect } from 'react'
import gsap from 'gsap'
import { THEMES } from './constants'

/** Tema da vertical do evento (fallback: Poker). */
export function themeOf(detail) {
  return THEMES[detail?.key] ?? THEMES.Poker
}

/**
 * Tweena o uniform uTint (vec3) do material para o color grade da vertical
 * ativa — as partículas do naipe "mergulham" na paleta nova sem rebuild.
 */
export function useThemeTint(materialRef, duration = 2.0, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const onVertical = (e) => {
      const u = materialRef.current?.uniforms?.uTint
      if (!u) return
      const [x, y, z] = themeOf(e.detail).tint
      gsap.to(u.value, { x, y, z, duration, ease: 'power2.inOut', overwrite: 'auto' })
    }
    window.addEventListener('constelacao:vertical', onVertical)
    return () => window.removeEventListener('constelacao:vertical', onVertical)
  }, [materialRef, duration, enabled])
}
