/**
 * Qualidade adaptativa — o site entrega o MÁXIMO que cada máquina aguenta.
 *
 * Em vez de um modo binário (alta/leve), há 4 degraus (tiers) de qualidade:
 *   T0  dpr 2.0   tudo ligado                 (máquina forte)
 *   T1  dpr 1.5   tudo ligado                 (perda quase invisível)
 *   T2  dpr 1.2   sem nébula/grão/aberração, 60% das partículas
 *   T3  dpr 1.0   só bloom+vignette, 35% das partículas (PC bem fraco)
 *
 * O degrau inicial vem da heurística de hardware (CPU/RAM/GPU); depois o
 * PerformanceMonitor (drei) mede o FPS REAL e sobe/desce degraus ao vivo,
 * sem recarregar. O último degrau estável fica salvo para a próxima visita.
 *
 * O botão ⚡ da UI alterna: auto → leve (trava T3) → máxima (trava T0) → auto.
 */

const MODE_KEY = 'constelacao-modo'
const TIER_KEY = 'constelacao-tier'

export function getMode() {
  try {
    const param = new URLSearchParams(window.location.search).get('perf')
    if (param === 'low' || param === 'lite') return 'lite'
    if (param === 'high') return 'high'
    const saved = localStorage.getItem(MODE_KEY)
    return saved === 'lite' || saved === 'high' ? saved : 'auto'
  } catch {
    return 'auto'
  }
}

/** auto → lite → high → auto (botão ⚡). Aplica ao vivo, sem reload. */
export function cycleMode() {
  const next = { auto: 'lite', lite: 'high', high: 'auto' }[getMode()]
  try {
    if (next === 'auto') localStorage.removeItem(MODE_KEY)
    else localStorage.setItem(MODE_KEY, next)
  } catch {}
  window.dispatchEvent(new CustomEvent('constelacao:quality', { detail: { mode: next } }))
  return next
}

/** Degrau inicial para o modo dado (antes do monitor de FPS agir). */
export function initialTier(mode) {
  if (mode === 'lite') return 3
  if (mode === 'high') return 0

  try {
    // último degrau estável desta máquina
    const saved = parseInt(localStorage.getItem(TIER_KEY), 10)
    if (saved >= 0 && saved <= 3) return saved

    // heurística de hardware para a primeira visita
    let score = 0
    const cores = navigator.hardwareConcurrency || 8
    if (cores <= 2) score += 3
    else if (cores <= 4) score += 2
    if (navigator.deviceMemory && navigator.deviceMemory <= 4) score += 2
    if (window.matchMedia('(pointer: coarse)').matches) score += 1

    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return 3
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = String(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    )
    if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return 3
    if (/intel(?!.*arc)|hd graphics|uhd graphics|iris|mali|adreno [1-5]\d\d|videocore|radeon r[2-5]|vega [2-8](?!\d)/i.test(renderer)) {
      score += 2
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext()

    if (score >= 5) return 3
    if (score >= 3) return 2
    return 0 // forte: começa no topo; o monitor desce se precisar
  } catch {
    return 2
  }
}

/** Persiste o degrau estável (só faz sentido no modo auto). */
export function rememberTier(tier) {
  try {
    localStorage.setItem(TIER_KEY, String(tier))
  } catch {}
}
