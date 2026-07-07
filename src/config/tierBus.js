/**
 * tierBus — o degrau de qualidade atual, compartilhado sem re-render.
 *
 * A troca de degrau NÃO reconstrói buffer nenhum: cada camada de partículas
 * aloca o total UMA vez e só ajusta geometry.setDrawRange (quantos vértices
 * a GPU desenha). Trocar de degrau custa zero — nada de engasgo na troca,
 * que era justamente o que o sistema anti-engasgo causava.
 *
 * Pré-requisito: os buffers são escritos em ordem ALEATÓRIA, então qualquer
 * prefixo é uma subamostra uniforme da nuvem (StarField já nasce aleatório;
 * SpadeDust e ConstellationWeb embaralham na escrita).
 */
import { useEffect } from 'react'
import { TIERS } from './constants'

let _tier = 0
const _subs = new Set()

export const getTier = () => _tier

export function setTier(t) {
  _tier = t
  _subs.forEach((fn) => fn(t))
}

export function onTier(fn) {
  _subs.add(fn)
  return () => _subs.delete(fn)
}

/**
 * Hook: mantém o drawRange do objeto (Points/LineSegments) proporcional ao
 * degrau. `even` arredonda para baixo em pares (LineSegments exige 2 em 2).
 */
export function useTierDrawRange(objRef, { even = false } = {}) {
  useEffect(() => {
    const apply = (t) => {
      const geo = objRef.current?.geometry
      if (!geo?.attributes?.position) return
      const total = geo.attributes.position.count
      let n = Math.floor(total * TIERS[Math.max(0, Math.min(TIERS.length - 1, t))].counts)
      if (even) n -= n % 2
      geo.setDrawRange(0, n)
    }
    apply(getTier())
    return onTier(apply)
  }, [objRef, even])
}
