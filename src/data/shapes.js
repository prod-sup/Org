/**
 * As 3 constelações da Suprema Gaming:
 *   0  Poker  ♠  (spadeShape.js — o naipe desenhado)
 *   1  SX     ♦  nebulosa — campo ABERTO de estrelas, sem forma fechada
 *   2  Bet    ♣  nebulosa — outro campo aberto, com outra assinatura
 *
 * SX e Bet não desenham naipe nenhum: na troca, a poeira do ♠ EXPLODE e
 * fica flutuando livre como um céu estrelado. Cada vertical tem uma nuvem
 * própria (espalhamento/rotação diferentes) pra troca SX↔Bet também mover.
 *
 * Mesmo sistema normalizado do naipe (x ±1.13, y de −1.38 a 1.0; a nuvem
 * pode passar um pouco — toWorld é linear), então o morph é 1:1 por índice.
 */

import {
  sampleOutline as spadeOutline,
  sampleInside as spadeInside,
} from './spadeShape.js'

// ---- nebulosa: nuvem elíptica com viés pro centro ----------------------------
// bias < 1 espalha; > 1 concentra no miolo. tilt gira a elipse (assinatura).
function cloudSampler({ cx = 0, cy = -0.19, rx, ry, bias, tilt = 0 }) {
  const cos = Math.cos(tilt)
  const sin = Math.sin(tilt)
  return (n, rand = Math.random) => {
    const pts = []
    for (let i = 0; i < n; i++) {
      const th = rand() * Math.PI * 2
      const r = Math.pow(rand(), bias)
      let x = Math.cos(th) * r * rx
      let y = Math.sin(th) * r * ry
      pts.push({ x: cx + x * cos - y * sin, y: cy + x * sin + y * cos })
    }
    return pts
  }
}

// SX ♦ — nuvem larga, levemente inclinada; miolo mais denso
const sxInside = cloudSampler({ rx: 1.9, ry: 1.5, bias: 1.35, tilt: 0.22 })
const sxOutline = cloudSampler({ rx: 2.1, ry: 1.7, bias: 0.75, tilt: 0.22 })

// Bet ♣ — nuvem mais alta e compacta, inclinada pro outro lado
const betInside = cloudSampler({ rx: 1.4, ry: 1.9, bias: 1.35, tilt: -0.28 })
const betOutline = cloudSampler({ rx: 1.6, ry: 2.1, bias: 0.75, tilt: -0.28 })

// ---- registro das formas ------------------------------------------------------
export const SHAPES = [
  { key: 'Poker', symbol: '♠', sampleOutline: spadeOutline, sampleInside: spadeInside },
  { key: 'SX', symbol: '♦', sampleOutline: sxOutline, sampleInside: sxInside },
  { key: 'Bet', symbol: '♣', sampleOutline: betOutline, sampleInside: betInside },
]
