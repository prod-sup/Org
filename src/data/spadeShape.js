/**
 * Forma do naipe de espadas (♠) — fonte única usada pelo organograma,
 * SpadeDust e ConstellationWeb.
 *
 * O corpo é a curva cardióide clássica INVERTIDA (a mesma família de curvas
 * dos naipes de baralho impressos):
 *
 *   x(t) = 16·sin³t
 *   y(t) = −(13·cos t − 5·cos 2t − 2·cos 3t − cos 4t)      t ∈ [0, π]
 *
 * Isso dá um ápice afiado, descida suave, lóbulos cheios e perfeitamente
 * simétricos e fenda central elegante — sem os "calombos" de um polígono
 * desenhado à mão. A cauda é um trompete côncavo com base reta.
 *
 * Coordenadas normalizadas: ápice em y=1.0, fundo dos lóbulos em y≈−0.99,
 * meia-largura máxima 1.13, cauda até y=−1.38.
 */

export const SPADE_SHAPE = {
  scale: 6.2,        // unidades de mundo por unidade normalizada
  yOffset: 0.19,     // centraliza verticalmente (ápice 1.0, base da cauda −1.38)
  depth: 1.1,        // jitter em Z
  tailTop: -0.56,    // nasce logo abaixo da fenda central
  tailBottom: -1.38,
  tailHalfWidth: 0.6,
}

// ---- perfil do lado direito (ápice → fenda), pela curva paramétrica --------
const RIGHT_PROFILE = (() => {
  const N = 90
  const raw = []
  for (let i = 0; i <= N; i++) {
    const t = Math.PI * (1 - i / N) // t=π (ápice) → t=0 (fenda)
    const x = 16 * Math.pow(Math.sin(t), 3)
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
    raw.push([x, y])
  }
  // normaliza: ápice → 1.0, fundo dos lóbulos → −0.99, meia-largura → 1.13
  const maxY = raw[0][1]
  const minY = Math.min(...raw.map((p) => p[1]))
  const maxX = Math.max(...raw.map((p) => p[0]))
  const sy = (1.0 - -0.99) / (maxY - minY)
  return raw.map(([x, y]) => [(x / maxX) * 1.13, 1.0 + (y - maxY) * sy])
})()

// polígono fechado do corpo: lado direito + espelho do esquerdo (invertido)
const BODY_POLY = (() => {
  const right = RIGHT_PROFILE
  const left = right
    .slice(1, -1)
    .reverse()
    .map(([x, y]) => [-x, y])
  return right.concat(left)
})()

// comprimento acumulado do polígono (para amostragem equidistante)
const BODY_SEGMENTS = (() => {
  const segs = []
  let total = 0
  for (let i = 0; i < BODY_POLY.length; i++) {
    const a = BODY_POLY[i]
    const b = BODY_POLY[(i + 1) % BODY_POLY.length]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    segs.push({ a, b, start: total, len })
    total += len
  }
  return { segs, total }
})()

export function insideBody(x, y) {
  // ray casting no polígono do corpo
  let inside = false
  const n = BODY_POLY.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = BODY_POLY[i]
    const [xj, yj] = BODY_POLY[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function tailHalfWidthAt(y) {
  const { tailTop, tailBottom, tailHalfWidth } = SPADE_SHAPE
  const t = (tailTop - y) / (tailTop - tailBottom) // 0 no topo, 1 na base
  return 0.03 + Math.pow(t, 1.8) * tailHalfWidth
}

export function insideTail(x, y) {
  const { tailTop, tailBottom } = SPADE_SHAPE
  if (y > tailTop || y < tailBottom) return false
  return Math.abs(x) <= tailHalfWidthAt(y)
}

export function insideSpade(x, y) {
  return insideBody(x, y) || insideTail(x, y)
}

/** Ponto do contorno do corpo a uma fração `t` (0..1) do perímetro. */
export function bodyOutlineAt(t) {
  const target = ((t % 1) + 1) % 1 * BODY_SEGMENTS.total
  for (const s of BODY_SEGMENTS.segs) {
    if (target <= s.start + s.len) {
      const k = s.len === 0 ? 0 : (target - s.start) / s.len
      return { x: s.a[0] + (s.b[0] - s.a[0]) * k, y: s.a[1] + (s.b[1] - s.a[1]) * k }
    }
  }
  return { x: BODY_POLY[0][0], y: BODY_POLY[0][1] }
}

/**
 * Amostra `n` pontos ao longo de TODA a silhueta (corpo equidistante +
 * laterais côncavas e base reta da cauda).
 */
export function sampleOutline(n, rand = Math.random) {
  const pts = []
  const nBody = Math.floor(n * 0.74)
  const nSide = Math.floor(n * 0.08) // por lateral da cauda
  const nBase = n - nBody - nSide * 2

  for (let i = 0; i < nBody; i++) {
    pts.push(bodyOutlineAt(i / nBody + rand() * 0.001))
  }
  const { tailTop, tailBottom } = SPADE_SHAPE
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < nSide; i++) {
      const y = tailTop + (tailBottom - tailTop) * (i / (nSide - 1))
      pts.push({ x: s * tailHalfWidthAt(y), y })
    }
  }
  for (let i = 0; i < nBase; i++) {
    const w = tailHalfWidthAt(tailBottom)
    pts.push({ x: -w + (2 * w * i) / (nBase - 1), y: tailBottom })
  }
  return pts
}

/** Amostra `n` pontos DENTRO da forma (rejeição). */
export function sampleInside(n, rand = Math.random) {
  const pts = []
  let guard = 0
  while (pts.length < n && guard < n * 400) {
    guard++
    const x = (rand() * 2 - 1) * 1.15
    const y = rand() * (1.0 + 1.38) - 1.38
    if (insideSpade(x, y)) pts.push({ x, y })
  }
  return pts
}

/** Converte coordenada normalizada para mundo (com jitter opcional em Z). */
export function toWorld(nx, ny, z = 0) {
  return {
    x: nx * SPADE_SHAPE.scale,
    y: (ny + SPADE_SHAPE.yOffset) * SPADE_SHAPE.scale,
    z,
  }
}
