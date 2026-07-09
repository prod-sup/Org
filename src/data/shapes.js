/**
 * As 3 constelações da Suprema Gaming — uma forma por vertical:
 *   0  Poker  ♠  (spadeShape.js — a forma original)
 *   1  SX     ♦  (losango de cantos afiados e lados levemente convexos)
 *   2  Bet    ♣  (trevo de três lóbulos + cauda trompete)
 *
 * Todas no MESMO sistema normalizado do naipe de espadas (x ±1.13,
 * y de −1.38 a 1.0), então compartilham toWorld/scale e o morph é 1:1
 * por índice de partícula.
 */

import {
  sampleOutline as spadeOutline,
  sampleInside as spadeInside,
} from './spadeShape.js'

// ---- ♦ SX — superelipse pontuda (o "diamante" dos naipes) -------------------
const D = { a: 0.86, b: 1.14, cy: -0.13, n: 1.25 }

function diamondPoint(t) {
  const th = t * Math.PI * 2
  const c = Math.cos(th)
  const s = Math.sin(th)
  return {
    x: D.a * Math.sign(c) * Math.pow(Math.abs(c), 2 / D.n),
    y: D.cy + D.b * Math.sign(s) * Math.pow(Math.abs(s), 2 / D.n),
  }
}

function diamondInside(x, y) {
  return (
    Math.pow(Math.abs(x / D.a), D.n) + Math.pow(Math.abs((y - D.cy) / D.b), D.n) <= 1
  )
}

// ---- ♣ Bet — três círculos + cauda ------------------------------------------
const C = {
  r: 0.46,
  lobes: [
    [0, 0.5],      // topo
    [-0.5, -0.24], // esquerda
    [0.5, -0.24],  // direita
  ],
  tailTop: -0.45,
  tailBottom: -1.38,
  tailHalfWidth: 0.55,
}

function clubTailHalfWidth(y) {
  const t = (C.tailTop - y) / (C.tailTop - C.tailBottom)
  return 0.03 + Math.pow(t, 1.8) * C.tailHalfWidth
}

function clubInside(x, y) {
  for (const [cx, cy] of C.lobes) {
    if ((x - cx) ** 2 + (y - cy) ** 2 <= C.r * C.r) return true
  }
  if (y <= C.tailTop && y >= C.tailBottom) return Math.abs(x) <= clubTailHalfWidth(y)
  return false
}

function clubOutline(n, rand = Math.random) {
  const pts = []
  const perLobe = Math.floor((n * 0.8) / 3)
  for (const [cx, cy] of C.lobes) {
    let guard = 0
    let placed = 0
    while (placed < perLobe && guard < perLobe * 30) {
      guard++
      const th = rand() * Math.PI * 2
      const x = cx + Math.cos(th) * C.r
      const y = cy + Math.sin(th) * C.r
      // só o arco EXTERNO (fora dos outros lóbulos) — dá o recorte do trevo
      const insideOther = C.lobes.some(
        ([ox, oy]) => (ox !== cx || oy !== cy) && (x - ox) ** 2 + (y - oy) ** 2 < C.r * C.r * 0.98
      )
      if (insideOther) continue
      pts.push({ x, y })
      placed++
    }
  }
  // cauda: laterais côncavas + base
  const rest = n - pts.length
  const nSide = Math.floor(rest * 0.38)
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < nSide; i++) {
      const y = C.tailTop + (C.tailBottom - C.tailTop) * (i / Math.max(1, nSide - 1))
      pts.push({ x: s * clubTailHalfWidth(y), y })
    }
  }
  const nBase = rest - nSide * 2
  const w = clubTailHalfWidth(C.tailBottom)
  for (let i = 0; i < Math.max(0, nBase); i++) {
    pts.push({ x: -w + (2 * w * i) / Math.max(1, nBase - 1), y: C.tailBottom })
  }
  return pts
}

// ---- S do logo Suprema — dois "raios" triangulares em simetria de ponto -----
// A metade superior é um polígono traçado do logo; a inferior é a mesma
// rotacionada 180° em torno do centro. Juntas desenham o S da marca.
const S_CENTER_Y = -0.19 // alinha o S ao centro visual dos naipes
const S_SCALE = 1.02

// metade superior em coordenadas do logo (y pra cima), sentido horário
const S_TOP = [
  [-0.97, -0.15], // ponta inferior-esquerda
  [-0.27, 0.92],  // ápice
  [0.43, 0.28],   // ombro direito
  [1.01, 0.14],   // ponta da barra do meio
  [0.25, 0.02],   // retorno da barra
  [-0.14, 0.49],  // vértice do recorte interno
  [-0.44, 0.02],  // base do recorte
].map(([x, y]) => [x * S_SCALE, y * S_SCALE + S_CENTER_Y])

const S_BOTTOM = S_TOP.map(([x, y]) => [-x, 2 * S_CENTER_Y - y])

function pointInPoly(poly, x, y) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function supremaInside(x, y) {
  return pointInPoly(S_TOP, x, y) || pointInPoly(S_BOTTOM, x, y)
}

// contorno: caminha pelos perímetros dos dois polígonos, denso por comprimento
function polyPerimeterPoints(poly, n, rand) {
  const edges = []
  let total = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    edges.push({ a, b, len })
    total += len
  }
  const pts = []
  for (const e of edges) {
    const k = Math.max(1, Math.round((e.len / total) * n))
    for (let i = 0; i < k; i++) {
      const t = (i + rand() * 0.9) / k
      pts.push({ x: e.a[0] + (e.b[0] - e.a[0]) * t, y: e.a[1] + (e.b[1] - e.a[1]) * t })
    }
  }
  return pts
}

function supremaOutline(n, rand = Math.random) {
  const half = Math.floor(n / 2)
  return [
    ...polyPerimeterPoints(S_TOP, half, rand),
    ...polyPerimeterPoints(S_BOTTOM, n - half, rand),
  ]
}

// ---- amostragem interna genérica por rejeição --------------------------------
function insideSampler(test) {
  return (n, rand = Math.random) => {
    const pts = []
    let guard = 0
    while (pts.length < n && guard < n * 400) {
      guard++
      const x = (rand() * 2 - 1) * 1.15
      const y = rand() * (1.0 + 1.38) - 1.38
      if (test(x, y)) pts.push({ x, y })
    }
    return pts
  }
}

function outlineFromParam(pointAt) {
  return (n, rand = Math.random) => {
    const pts = []
    for (let i = 0; i < n; i++) pts.push(pointAt(i / n + rand() * 0.001))
    return pts
  }
}

// ---- registro das formas ------------------------------------------------------
export const SHAPES = [
  { key: 'Poker', symbol: '♠', sampleOutline: spadeOutline, sampleInside: spadeInside },
  { key: 'SX', symbol: '♦', sampleOutline: outlineFromParam(diamondPoint), sampleInside: insideSampler(diamondInside) },
  { key: 'Bet', symbol: '♣', sampleOutline: clubOutline, sampleInside: insideSampler(clubInside) },
  // visão de grupo: ♠♦♣ juntos formam o S da Suprema; `all` = mostra todo mundo
  { key: 'Suprema', symbol: 'S', all: true, sampleOutline: supremaOutline, sampleInside: insideSampler(supremaInside) },
]
