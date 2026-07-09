import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { getOrganization } from '../data/organization'
import { useActiveVertical, nodeInVertical } from './Connections'

/**
 * Labels — callouts de área (anel + linha-guia + texto), como na referência.
 * Ancorados no membro mais externo de cada aglomerado; o lado do texto segue
 * o lado do nó no naipe. Poucos elementos Html — custo irrisório.
 * Só as áreas com gente na vertical ativa aparecem.
 */
export default function Labels() {
  const vertical = useActiveVertical()
  const anchors = useMemo(() => {
    const org = getOrganization()
    const CY = 2.52 // centro vertical do naipe em coordenadas do grupo
    return org.departments.flatMap((dept) => {
      const members = dept.members.filter((m) => nodeInVertical(m, vertical))
      if (!members.length) return []
      const cx = members.reduce((s, n) => s + n.pos[0], 0) / members.length
      const cy = members.reduce((s, n) => s + n.pos[1], 0) / members.length
      const len = Math.hypot(cx, cy - CY) || 1
      const dx = cx / len
      const dy = (cy - CY) / len
      let anchor = members[0]
      let best = -Infinity
      for (const m of members) {
        const proj = m.pos[0] * dx + (m.pos[1] - CY) * dy
        if (proj > best) { best = proj; anchor = m }
      }
      const filled = members.filter((m) => !m.vacant).length
      return [{
        key: dept.key,
        pos: anchor.pos,
        color: dept.color,
        count: filled,
        side: anchor.pos[0] >= 0 ? 'right' : 'left',
      }]
    })
  }, [vertical])

  return (
    <group>
      {anchors.map((a, i) => (
        <Html
          key={a.key}
          position={a.pos}
          zIndexRange={[5, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`node-callout is-${a.side}`}
            style={{ animationDelay: `${3 + i * 0.3}s`, '--dept': a.color }}
          >
            <span className="callout-ring" />
            <span className="callout-leader" />
            <button
              type="button"
              className="callout-text"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('constelacao:area', { detail: { dept: a.key } })
                )
              }
            >
              <strong>{a.key}</strong>
              {a.count} {a.count === 1 ? 'pessoa' : 'pessoas'}
            </button>
          </div>
        </Html>
      ))}
    </group>
  )
}
