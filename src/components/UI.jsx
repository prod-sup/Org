import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { getOrganization, LEVELS } from '../data/organization'

// normalização para o minimapa (coordenadas de mundo → SVG 120×132)
const mapX = (x) => 60 + (x / 7.2) * 50
const mapY = (y) => 62 - (y / 7.6) * 56

function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * UI — camada editorial sobre o WebGL:
 * título serifado, legenda, stats, busca com fly-to, minimapa ♠,
 * cursor magnético, tooltip de hover e card fixado ao focar uma pessoa.
 */
export default function UI() {
  const org = getOrganization()
  const TOTAL = org.list.filter((n) => !n.vacant).length
  const AREAS = org.departments.length

  const rootRef = useRef(null)
  const [hover, setHover] = useState(null)
  const [focused, setFocused] = useState(null)
  const [query, setQuery] = useState('')
  const [areaKey, setAreaKey] = useState(null) // painel lateral de área

  const area = areaKey ? org.departments.find((d) => d.key === areaKey) : null

  // ---- busca -----------------------------------------------------------------
  const results = useMemo(() => {
    const q = normalize(query.trim())
    if (q.length < 2) return []
    return org.list
      .filter(
        (n) =>
          normalize(n.name).includes(q) ||
          normalize(n.role).includes(q) ||
          normalize(n.department).includes(q)
      )
      .slice(0, 6)
  }, [query])

  const focusNode = (node) => {
    setQuery('')
    window.dispatchEvent(new CustomEvent('constelacao:focus', { detail: node ? { node } : null }))
  }

  // ---- eventos globais ---------------------------------------------------------
  useEffect(() => {
    const onHover = (e) => setHover(e.detail)
    const onFocus = (e) => setFocused(e.detail?.node ?? null)
    const onArea = (e) => setAreaKey(e.detail?.dept ?? null)
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      // ESC em camadas: primeiro solta a pessoa, depois fecha o painel de área
      setFocused((f) => {
        if (f) {
          window.dispatchEvent(new CustomEvent('constelacao:focus', { detail: null }))
          return null
        }
        setAreaKey(null)
        return f
      })
    }
    window.addEventListener('constelacao:hover', onHover)
    window.addEventListener('constelacao:focus', onFocus)
    window.addEventListener('constelacao:area', onArea)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('constelacao:hover', onHover)
      window.removeEventListener('constelacao:focus', onFocus)
      window.removeEventListener('constelacao:area', onArea)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // ---- cursor magnético ---------------------------------------------------------
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const hoverRef = useRef(null)
  hoverRef.current = hover

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    document.body.classList.add('has-custom-cursor')

    const pos = { x: innerWidth / 2, y: innerHeight / 2 }
    const dot = { x: pos.x, y: pos.y }
    const ring = { x: pos.x, y: pos.y }
    const onMove = (e) => {
      pos.x = e.clientX
      pos.y = e.clientY
    }
    window.addEventListener('pointermove', onMove)

    let raf
    const tick = () => {
      const h = hoverRef.current
      // magnetismo: com uma estrela em hover, o cursor é atraído para ela
      const tx = h?.sx !== undefined ? pos.x + (h.sx - pos.x) * 0.55 : pos.x
      const ty = h?.sy !== undefined ? pos.y + (h.sy - pos.y) * 0.55 : pos.y
      dot.x += (tx - dot.x) * 0.35
      dot.y += (ty - dot.y) * 0.35
      ring.x += (tx - ring.x) * 0.14
      ring.y += (ty - ring.y) * 0.14
      if (dotRef.current)
        dotRef.current.style.transform = `translate(${dot.x}px, ${dot.y}px)`
      if (ringRef.current)
        ringRef.current.style.transform = `translate(${ring.x}px, ${ring.y}px)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.body.classList.remove('has-custom-cursor')
    }
  }, [])

  // ---- entrada GSAP --------------------------------------------------------------
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      gsap.from('.ui-fade', {
        autoAlpha: 0,
        y: 14,
        duration: reduced ? 0 : 1.3,
        ease: 'power2.out',
        stagger: 0.12,
        delay: reduced ? 0 : 2.2,
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  const card = focused ?? hover?.node ?? null

  return (
    <div ref={rootRef} className="ui-layer">
      <header className="ui-top">
        <div className="ui-top-left ui-fade">
          <span className="ui-mark">♠</span>
          <span className="ui-brand">GRUPO&nbsp;SUPREMA</span>
        </div>

        {/* busca — digite um nome e a câmera voa até a pessoa */}
        <div className="ui-search ui-fade">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            placeholder="Buscar pessoa ou área…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) focusNode(results[0])
            }}
          />
          {results.length > 0 && (
            <ul className="ui-search-results">
              {results.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => focusNode(n)}>
                    <i style={{ background: n.color }} />
                    <span>
                      <strong>{n.name}</strong>
                      {n.role} · {n.department}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ui-top-right ui-fade">
          <button
            type="button"
            className="ui-round"
            aria-label="Tela cheia"
            title="Tela cheia"
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen()
              else document.documentElement.requestFullscreen()
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
          <button type="button" className="ui-round" aria-label="Menu" title="Menu">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      <div className="ui-zoom ui-fade">
        <button
          type="button"
          className="ui-round"
          aria-label="Aproximar"
          onClick={() => window.dispatchEvent(new CustomEvent('constelacao:zoom', { detail: 4 }))}
        >
          +
        </button>
        <span className="ui-zoom-track">
          <i /><i /><i />
        </span>
        <button
          type="button"
          className="ui-round"
          aria-label="Afastar"
          onClick={() => window.dispatchEvent(new CustomEvent('constelacao:zoom', { detail: -4 }))}
        >
          −
        </button>
      </div>

      <div className="ui-left ui-fade">
        <h1 className="ui-title">
          A <br />
          <em>Constelação</em>
        </h1>
        <p className="ui-lede">
          Somos uma constelação de mentes,
          <br />
          conectadas por propósito
          <br />e unidas por uma visão.
        </p>
        <p className="ui-cta">Passe o cursor sobre uma estrela — ou busque um nome.</p>
        <div className="ui-scroll">
          <span className="ui-scroll-icon" />
          <span>EXPLORE COM O CURSOR</span>
        </div>
      </div>

      <ul className="ui-legend ui-fade">
        {org.departments.map((d) => (
          <li key={d.key}>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('constelacao:area', { detail: areaKey === d.key ? null : { dept: d.key } })
                )
              }
            >
              <i style={{ background: d.color, color: d.color }} />
              {d.key}
            </button>
          </li>
        ))}
      </ul>

      {/* minimapa ♠ — todas as estrelas; a focada/hover pulsa */}
      <div className="ui-minimap ui-fade" aria-hidden="true">
        <svg viewBox="0 0 120 132">
          {org.list.map((n) => {
            const active = card?.id === n.id
            return (
              <circle
                key={n.id}
                cx={mapX(n.pos[0])}
                cy={mapY(n.pos[1])}
                r={active ? 3 : n.levelIndex <= 1 ? 1.9 : 1.1}
                fill={n.color}
                opacity={active ? 1 : 0.55}
                className={active ? 'is-active' : undefined}
              />
            )
          })}
        </svg>
      </div>

      <footer className="ui-bottom">
        <div className="ui-stats ui-fade">
          <span><strong>{TOTAL}</strong> pessoas</span>
          <span className="ui-sep" />
          <span><strong>{AREAS}</strong> áreas</span>
          <span className="ui-sep" />
          <span><strong>3</strong> CEOs</span>
        </div>

        <nav className="ui-nav ui-fade">
          <button type="button">Universo</button>
          <button type="button" className="is-active">Organização</button>
          <button type="button">Legado</button>
        </nav>

        <button type="button" className="ui-story ui-fade">
          Nossa História <span className="ui-story-arrow">→</span>
        </button>
      </footer>

      {/* painel de área — abre pelo callout ou pela legenda */}
      {area && (
        <aside className="area-panel" style={{ '--dept': area.color }}>
          <header className="area-head">
            <span className="area-kicker">Área</span>
            <h2 className="area-title">{area.key}</h2>
            <span className="area-count">
              {area.members.filter((m) => !m.vacant).length} pessoas
            </span>
            <button type="button" className="person-close" onClick={() => setAreaKey(null)} aria-label="Fechar">
              ✕
            </button>
          </header>
          <ul className="area-list">
            {[...area.members]
              .sort((a, b) => a.levelIndex - b.levelIndex || a.name.localeCompare(b.name))
              .map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className={focused?.id === m.id ? 'is-current' : undefined}
                    onClick={() => focusNode(m)}
                  >
                    <i className={`area-star lv-${m.levelIndex}`} />
                    <span>
                      <strong>{m.name}</strong>
                      {m.role}
                    </span>
                    <em>{LEVELS[m.levelIndex].key}</em>
                  </button>
                </li>
              ))}
          </ul>
        </aside>
      )}

      {/* card de pessoa: segue o cursor no hover; fixa ao focar (busca/clique).
          Com o painel de área aberto, a pessoa focada aparece destacada no painel. */}
      {card && !(focused && area) && (
        <div
          className={`person-card${focused ? ' is-pinned' : ''}`}
          style={
            focused
              ? { '--dept': card.color }
              : { left: hover.x, top: hover.y, '--dept': card.color }
          }
        >
          {focused && (
            <button type="button" className="person-close" onClick={() => focusNode(null)} aria-label="Fechar">
              ✕
            </button>
          )}
          <span className="person-dept">{card.department}</span>
          <strong className="person-name">{card.name}</strong>
          <span className="person-role">{card.role}</span>
          {focused && <span className="person-vacant">ESC para voltar à constelação</span>}
        </div>
      )}

      {/* cursor magnético */}
      <div ref={ringRef} className="cursor-ring" style={{ '--dept': hover?.node?.color ?? '#d8b56d' }} data-active={hover ? '1' : '0'} />
      <div ref={dotRef} className="cursor-dot" />
    </div>
  )
}
