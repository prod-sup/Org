import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * UI — interface minimalista sobreposta ao canvas (fora do WebGL).
 * Aparece suavemente após a entrada. Puramente decorativa na Etapa 1;
 * o card de colaborador entra na Etapa 4.
 */
export default function UI() {
  const rootRef = useRef(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      gsap.from('.ui-fade', {
        autoAlpha: 0,
        y: 12,
        duration: reduced ? 0 : 1.4,
        ease: 'power2.out',
        stagger: 0.15,
        delay: reduced ? 0 : 2.6,
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={rootRef} className="ui-layer">
      <header className="ui-top ui-fade">
        <span className="ui-mark">♠</span>
        <span className="ui-brand">GRUPO&nbsp;SUPREMA</span>
      </header>

      <div className="ui-center ui-fade">
        <h1 className="ui-title">A Constelação</h1>
        <p className="ui-subtitle">Cada estrela, uma pessoa. Aproxime-se.</p>
      </div>

      <footer className="ui-bottom ui-fade">
        <span className="ui-hint">Mova o cursor · Etapa 1 — Atmosfera</span>
      </footer>
    </div>
  )
}
