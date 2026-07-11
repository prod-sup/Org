import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { getOrganization, LEVELS } from '../data/organization'
import { SHAPES } from '../data/shapes'
import { cycleMode, getMode } from '../config/quality'

/** Badges ♠♦♣ — só quando a pessoa atua em verticais específicas. */
function VerticalBadges({ node }) {
  if (!node.verticals) return null
  return (
    <span className="v-badges">
      {SHAPES.filter((s) => node.verticals.includes(s.key)).map((s) => (
        <i key={s.key} title={s.key}>{s.symbol}</i>
      ))}
    </span>
  )
}

const MODE_LABEL = {
  auto: 'Qualidade automática (ajusta pelo FPS) — clique p/ modo leve',
  lite: 'Modo leve fixo — clique p/ qualidade máxima',
  high: 'Qualidade máxima fixa — clique p/ automático',
}

// normalização para o minimapa (coordenadas de mundo → SVG 120×132)
const mapX = (x) => 60 + (x / 7.2) * 50
const mapY = (y) => 62 - (y / 7.6) * 56

function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Avatar — foto (campo "photo" do equipe.json) ou iniciais na cor da área. */
function Avatar({ node, size = 44 }) {
  const [error, setError] = useState(false)
  const initials = node.name
    .split(' ')
    .filter((w) => w && w[0] === w[0].toUpperCase())
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
  const src = node.photo
    ? import.meta.env.BASE_URL + node.photo.replace(/^\//, '')
    : null
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.36, '--dept': node.color }}
    >
      {src && !error ? (
        <img src={src} alt="" loading="lazy" onError={() => setError(true)} />
      ) : (
        <b>{initials}</b>
      )}
    </span>
  )
}

const TOUR_INTERVAL = 8000 // ms por área no modo apresentação

// texto editorial de cada mundo (♠ ♦ ♣)
const LEDE = {
  Poker: ['Somos uma constelação de mentes,', 'conectadas por propósito', 'e unidas por uma visão.'],
  SX: ['O diamante da Suprema:', 'precisão, velocidade', 'e um novo jogo começando.'],
  Bet: ['O trevo da casa:', 'esporte, emoção', 'e a sorte do nosso lado.'],
}

/**
 * UI — camada editorial sobre o WebGL:
 * título serifado, legenda, stats, busca com fly-to, minimapa ♠,
 * cursor magnético, tooltip de hover e card fixado ao focar uma pessoa.
 */
export default function UI() {
  const org = getOrganization()

  const rootRef = useRef(null)
  const [hover, setHover] = useState(null)
  const [focused, setFocused] = useState(null)
  const [query, setQuery] = useState('')
  const [areaKey, setAreaKey] = useState(null) // painel lateral de área
  const [tour, setTour] = useState(false)      // modo apresentação
  const [menuOpen, setMenuOpen] = useState(false) // painel de ajuda/atalhos
  const searchRef = useRef(null)
  const [perfMode, setPerfMode] = useState(getMode) // auto | lite | high
  const [perfTier, setPerfTier] = useState(null)    // degrau atual (0..3)
  const [vertical, setVertical] = useState(0)       // índice em SHAPES (♠ ♦ ♣ S)
  const [cam, setCam] = useState(null)              // câmera p/ o minimapa

  // a UI inteira muda de pele com a vertical (CSS lê data-vertical no :root)
  useEffect(() => {
    document.documentElement.dataset.vertical = SHAPES[vertical].key
  }, [vertical])

  // posição/zoom da câmera → indicador no minimapa; só re-renderiza quando
  // o movimento é perceptível (economia real em PC fraco)
  useEffect(() => {
    const onCam = (e) => {
      const d = e.detail
      setCam((prev) =>
        prev &&
        Math.abs(prev.x - d.x) < 0.06 &&
        Math.abs(prev.y - d.y) < 0.06 &&
        Math.abs(prev.z - d.z) < 0.15
          ? prev
          : d
      )
    }
    window.addEventListener('constelacao:camera', onCam)
    return () => window.removeEventListener('constelacao:camera', onCam)
  }, [])

  const switchVertical = (i) => {
    setVertical(i)
    // solta pessoa/área do contexto anterior — podem nem existir na nova vertical
    window.dispatchEvent(new CustomEvent('constelacao:focus', { detail: null }))
    window.dispatchEvent(new CustomEvent('constelacao:area', { detail: null }))
    window.dispatchEvent(
      new CustomEvent('constelacao:vertical', { detail: { index: i, key: SHAPES[i].key } })
    )
  }

  // pessoas visíveis na vertical ativa (sem campo "vertical" = atua em todas)
  const inVertical = (n) => !n.verticals || n.verticals.includes(SHAPES[vertical].key)
  const totalVertical = org.list.filter((n) => !n.vacant && inVertical(n)).length

  // áreas com gente na vertical ativa — legenda, painel, tour e stats usam isto
  const visibleDepts = useMemo(
    () =>
      org.departments
        .map((d) => ({ ...d, members: d.members.filter(inVertical) }))
        .filter((d) => d.members.length > 0),
    [org, vertical]
  )

  useEffect(() => {
    const onTier = (e) => setPerfTier(e.detail?.tier ?? null)
    window.addEventListener('constelacao:tier', onTier)
    return () => window.removeEventListener('constelacao:tier', onTier)
  }, [])
  const tourRef = useRef(false)
  tourRef.current = tour

  const area = areaKey ? visibleDepts.find((d) => d.key === areaKey) : null

  // isolamento visual acompanha o painel de área aberto
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('constelacao:dim', { detail: areaKey ? { dept: areaKey } : null })
    )
  }, [areaKey])

  // ---- modo recepção: tela parada por 75s inicia o tour sozinho ----------------
  const autoTourRef = useRef(false)
  useEffect(() => {
    let idleTimer
    const arm = () => {
      clearTimeout(idleTimer)
      // qualquer interação encerra um tour iniciado automaticamente
      if (autoTourRef.current) {
        autoTourRef.current = false
        setTour(false)
      }
      idleTimer = setTimeout(() => {
        if (tourRef.current) return
        autoTourRef.current = true
        setTour(true)
      }, 75000)
    }
    arm()
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']
    events.forEach((ev) => window.addEventListener(ev, arm, { passive: true }))
    return () => {
      clearTimeout(idleTimer)
      events.forEach((ev) => window.removeEventListener(ev, arm))
    }
  }, [])

  // ---- modo apresentação: voa de área em área (só as da vertical ativa),
  //      alterna a pessoa em destaque a cada volta e respira com uma visão
  //      geral da constelação antes de recomeçar --------------------------------
  useEffect(() => {
    if (!tour || !visibleDepts.length) return
    let i = 0
    let lap = 0
    const step = () => {
      const idx = i % (visibleDepts.length + 1)
      if (idx === visibleDepts.length) {
        // respiro: recua e mostra a constelação inteira
        window.dispatchEvent(new CustomEvent('constelacao:focus', { detail: null }))
        window.dispatchEvent(new CustomEvent('constelacao:area', { detail: null }))
        lap++
      } else {
        const dept = visibleDepts[idx]
        const members = [...dept.members].sort((a, b) => a.levelIndex - b.levelIndex)
        // 1ª volta destaca o líder; voltas seguintes percorrem o time
        const person = members[lap % members.length]
        window.dispatchEvent(new CustomEvent('constelacao:area', { detail: { dept: dept.key } }))
        if (person) window.dispatchEvent(new CustomEvent('constelacao:focus', { detail: { node: person } }))
      }
      i++
    }
    step()
    const id = setInterval(step, TOUR_INTERVAL)
    return () => {
      clearInterval(id)
      window.dispatchEvent(new CustomEvent('constelacao:focus', { detail: null }))
      window.dispatchEvent(new CustomEvent('constelacao:area', { detail: null }))
    }
  }, [tour, visibleDepts])

  // ---- busca -----------------------------------------------------------------
  const results = useMemo(() => {
    const q = normalize(query.trim())
    if (q.length < 2) return []
    return org.list
      .filter(
        (n) =>
          inVertical(n) &&
          (normalize(n.name).includes(q) ||
            normalize(n.role).includes(q) ||
            normalize(n.department).includes(q))
      )
      .slice(0, 6)
  }, [query, vertical])

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
      // atalhos globais (fora de campos de texto)
      const typing = e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA'
      if (!typing) {
        if (e.key === '1' || e.key === '2' || e.key === '3') {
          switchVertical(Number(e.key) - 1)
          return
        }
        if (e.key === 't' || e.key === 'T') {
          setTour((t) => !t)
          return
        }
        if (e.key === 'f' || e.key === 'F') {
          if (document.fullscreenElement) document.exitFullscreen()
          else document.documentElement.requestFullscreen()
          return
        }
        if (e.key === '/') {
          e.preventDefault()
          searchRef.current?.focus()
          return
        }
      }
      if (e.key !== 'Escape') return
      setMenuOpen(false)
      // ESC em camadas: para o tour, depois solta a pessoa, depois fecha o painel
      if (tourRef.current) {
        setTour(false)
        return
      }
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
          <span className="ui-search-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Explore — busque uma pessoa ou área"
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
          <a
            className="ui-round ui-os"
            href="https://prod-sup.github.io/painelpoker/hub.html"
            title="Voltar pro Suprema OS"
            aria-label="Voltar pro Suprema OS"
          >
            ♠
          </a>
          <button
            type="button"
            className={`ui-round ui-perf is-${perfMode}`}
            aria-label="Qualidade gráfica"
            title={`${MODE_LABEL[perfMode]}${perfTier !== null ? ` · degrau atual: T${perfTier}` : ''}`}
            onClick={() => setPerfMode(cycleMode())}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className={`ui-round ui-tour${tour ? ' is-on' : ''}`}
            aria-label={tour ? 'Parar tour' : 'Iniciar tour'}
            title={tour ? 'Parar tour (ESC)' : 'Tour pelas áreas'}
            onClick={() => setTour((t) => !t)}
          >
            {tour ? (
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              </svg>
            )}
          </button>
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
        <span className="ui-kicker">
          {SHAPES[vertical].symbol} SUPREMA {SHAPES[vertical].key.toUpperCase()}
        </span>
        <h1 className="ui-title">
          A <br />
          <em>Constelação</em>
        </h1>
        <p className="ui-lede" key={vertical}>
          {(LEDE[SHAPES[vertical].key] ?? LEDE.Poker).map((line, i) => (
            <span key={i} className="ui-lede-line" style={{ animationDelay: `${0.5 + i * 0.18}s` }}>
              {line}
              <br />
            </span>
          ))}
        </p>
        <p className="ui-cta">
          <i className="ui-cta-star" aria-hidden="true">✦</i> Passe o cursor sobre uma
          estrela — ou busque um nome.
        </p>
        <div className="ui-scroll">
          <span className="ui-scroll-icon" />
          <span>EXPLORE COM O CURSOR</span>
        </div>
      </div>

      <ul className="ui-legend ui-fade">
        {visibleDepts.map((d) => (
          <li key={d.key}>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('constelacao:area', { detail: areaKey === d.key ? null : { dept: d.key } })
                )
              }
              onMouseEnter={() =>
                window.dispatchEvent(new CustomEvent('constelacao:dim', { detail: { dept: d.key } }))
              }
              onMouseLeave={() =>
                window.dispatchEvent(
                  new CustomEvent('constelacao:dim', { detail: areaKey ? { dept: areaKey } : null })
                )
              }
            >
              <i style={{ background: d.color, color: d.color }} />
              {d.key}
            </button>
          </li>
        ))}
      </ul>

      {/* minimapa ♠ — estrelas da vertical ativa; a focada/hover pulsa;
          o anel dourado mostra onde a câmera está olhando (e quão perto) */}
      <div className="ui-minimap ui-fade" aria-hidden="true">
        <svg viewBox="0 0 120 132">
          {org.list.filter(inVertical).map((n) => {
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
          {cam && (
            <g
              className="mini-cam"
              transform={`translate(${Math.min(112, Math.max(8, mapX(cam.x)))} ${Math.min(124, Math.max(8, mapY(cam.y)))})`}
            >
              <circle className="mini-cam-ring" r={Math.min(46, Math.max(7, (cam.z - 6) * 1.15))} />
              <circle className="mini-cam-dot" r="1.7" />
            </g>
          )}
        </svg>
      </div>

      <footer className="ui-bottom">
        <div className="ui-stats ui-fade">
          <span>pessoas <strong>{totalVertical}</strong></span>
          <span className="ui-sep" />
          <span>áreas <strong>{visibleDepts.length}</strong></span>
          <span className="ui-sep" />
          <span>verticais <strong>3</strong></span>
        </div>

        <nav className="ui-nav ui-fade">
          {SHAPES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={vertical === i ? 'is-active' : undefined}
              onClick={() => switchVertical(i)}
            >
              <span className="ui-nav-suit">{s.symbol}</span> {s.key}
            </button>
          ))}
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
                    <Avatar node={m} size={34} />
                    <span>
                      <strong>{m.name} <VerticalBadges node={m} /></strong>
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
          <Avatar node={card} size={focused ? 56 : 44} />
          <span className="person-dept">
            {card.department} <VerticalBadges node={card} />
          </span>
          <strong className="person-name">{card.name}</strong>
          <span className="person-role">{card.role}</span>
          {card.email && (
            <span className="person-contact">
              {focused ? (
                <>
                  <a href={`mailto:${card.email}`} title="Enviar e-mail">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
                    {card.email}
                  </a>
                  <a href={card.teams} target="_blank" rel="noopener noreferrer" title="Abrir chat no Microsoft Teams">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>
                    Chamar no Teams
                  </a>
                </>
              ) : (
                <>
                  <span>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
                    {card.email}
                  </span>
                  <span>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>
                    Teams · clique na estrela p/ chamar
                  </span>
                </>
              )}
            </span>
          )}
          {focused && <span className="person-vacant">ESC para voltar à constelação</span>}
        </div>
      )}

      {/* cursor magnético */}
      <div ref={ringRef} className="cursor-ring" style={{ '--dept': hover?.node?.color ?? '#d8b56d' }} data-active={hover ? '1' : '0'} />
      <div ref={dotRef} className="cursor-dot" />
    </div>
  )
}
