import { useMemo, useRef, useLayoutEffect, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getOrganization, LEVELS } from '../data/organization'

const dummy = new THREE.Object3D()
const tmpColor = new THREE.Color()

/**
 * Organization — as pessoas reais do Grupo Suprema como dois InstancedMesh:
 *   • cores  : núcleo nítido, champanhe tingido pela cor da área
 *   • halos  : esfera maior, aditiva e translúcida → glow suave na cor da área
 *
 * O peso visual (tamanho + brilho) vem de LEVELS. Vagas em aberto aparecem
 * como estrelas apagadas ("adormecidas"). Hover no núcleo dispara o evento
 * 'constelacao:hover' com { node, x, y } — o tooltip vive na camada de UI.
 */
const GROUP_OFFSET_X = 3.2 // deslocamento do grupo na cena (Scene.jsx)
const projVec = new THREE.Vector3()

export default function Organization() {
  const org = useMemo(() => getOrganization(), [])
  const coresRef = useRef()
  const halosRef = useRef()
  const hoveredRef = useRef(-1)
  const dimDeptRef = useRef(null)     // área em destaque ('constelacao:dim')
  const dimVerticalRef = useRef('Poker') // vertical ativa (Poker/SX/Bet; null = todas)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  // Trilha do time: hover na legenda / painel / vertical acende só quem pertence
  useEffect(() => {
    const onDim = (e) => {
      dimDeptRef.current = e.detail?.dept ?? null
      if (e.detail && 'vertical' in e.detail) dimVerticalRef.current = e.detail.vertical
      if (!e.detail) dimDeptRef.current = null
    }
    const onVertical = (e) => {
      // 'Suprema' é a visão de grupo: sem filtro, todo mundo aceso
      dimVerticalRef.current =
        e.detail?.key && e.detail.key !== 'Suprema' ? e.detail.key : null
    }
    window.addEventListener('constelacao:dim', onDim)
    window.addEventListener('constelacao:vertical', onVertical)
    return () => {
      window.removeEventListener('constelacao:dim', onDim)
      window.removeEventListener('constelacao:vertical', onVertical)
    }
  }, [])

  // Dados por instância (posições base, escalas, cores, fases de flutuação)
  const inst = useMemo(() => {
    const n = org.list.length
    const basePos = new Float32Array(n * 3)
    const coreScale = new Float32Array(n)
    const haloScale = new Float32Array(n)
    const coreColor = []
    const haloColor = []
    const phase = new Float32Array(n)
    const freq = new Float32Array(n)   // frequência de respiração própria
    const amp = new Float32Array(n)    // amplitude de respiração própria
    const bob = new Float32Array(n)    // amplitude de flutuação vertical
    const boost = new Float32Array(n)  // hover suavizado por nó

    org.list.forEach((node, i) => {
      const lvl = LEVELS[node.levelIndex]
      basePos[i * 3 + 0] = node.pos[0]
      basePos[i * 3 + 1] = node.pos[1]
      basePos[i * 3 + 2] = node.pos[2]
      coreScale[i] = lvl.size
      haloScale[i] = lvl.size * lvl.haloScale

      // núcleo champanhe puxado sutilmente para a cor da área
      const dept = new THREE.Color(node.color)
      const core = new THREE.Color(lvl.core).lerp(dept, 0.3)
      const halo = new THREE.Color(lvl.halo).lerp(dept, 0.65)
      if (node.vacant) {
        // vaga em aberto: estrela adormecida
        core.multiplyScalar(0.32)
        halo.multiplyScalar(0.25)
      } else {
        core.multiplyScalar(lvl.brightness)
      }
      coreColor.push(core)
      haloColor.push(halo)
      phase[i] = Math.random() * Math.PI * 2
      // movimento orgânico: cada estrela respira com ritmo e amplitude próprios
      freq[i] = lvl.pulse.speed * (0.75 + Math.random() * 0.5)
      amp[i] = lvl.pulse.amp * (0.7 + Math.random() * 0.6)
      bob[i] = 0.035 + Math.random() * 0.05
    })

    const dim = new Float32Array(n).fill(1) // fator de isolamento suavizado
    return { n, basePos, coreScale, haloScale, coreColor, haloColor, phase, freq, amp, bob, boost, dim }
  }, [org])

  // Inicializa matrizes e cores das instâncias
  useLayoutEffect(() => {
    const cores = coresRef.current
    const halos = halosRef.current
    if (!cores || !halos) return

    for (let i = 0; i < inst.n; i++) {
      const x = inst.basePos[i * 3 + 0]
      const y = inst.basePos[i * 3 + 1]
      const z = inst.basePos[i * 3 + 2]

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(inst.coreScale[i])
      dummy.updateMatrix()
      cores.setMatrixAt(i, dummy.matrix)
      cores.setColorAt(i, inst.coreColor[i])

      dummy.scale.setScalar(inst.haloScale[i])
      dummy.updateMatrix()
      halos.setMatrixAt(i, dummy.matrix)
      halos.setColorAt(i, inst.haloColor[i])
    }

    cores.instanceMatrix.needsUpdate = true
    halos.instanceMatrix.needsUpdate = true
    if (cores.instanceColor) cores.instanceColor.needsUpdate = true
    if (halos.instanceColor) halos.instanceColor.needsUpdate = true
  }, [inst])

  // Respiração individual (freq/amp próprios) + hover com easing suave
  useFrame((state, delta) => {
    const cores = coresRef.current
    const halos = halosRef.current
    if (!cores || !halos) return
    const t = state.clock.elapsedTime
    const hovered = hoveredRef.current
    const ease = Math.min(1, delta * 7) // suavização do destaque
    const dimEase = Math.min(1, delta * 4) // isolamento entra/sai mais lento
    const dimDept = dimDeptRef.current

    for (let i = 0; i < inst.n; i++) {
      const x = inst.basePos[i * 3 + 0]
      const y = inst.basePos[i * 3 + 1]
      const z = inst.basePos[i * 3 + 2]
      const bob = Math.sin(t * (0.18 + inst.freq[i] * 0.12) + inst.phase[i]) * inst.bob[i]
      const breathe = 1 + Math.sin(t * inst.freq[i] + inst.phase[i]) * inst.amp[i]

      // hover: cresce e decai com inércia (nunca "pisca")
      inst.boost[i] += ((i === hovered ? 1 : 0) - inst.boost[i]) * ease
      const scaleBoost = 1 + inst.boost[i] * 0.85
      const haloBoost = 1 + inst.boost[i] * 1.6

      // isolamento: fora da área em destaque a estrela adormece (Executivo
      // fica como referência); fora da vertical ativa ela SOME — cada
      // constelação só mostra o próprio time
      const node = org.list[i]
      const foraDaArea =
        dimDept && node.department !== dimDept && node.department !== 'Executivo'
      const foraDaVertical =
        dimVerticalRef.current &&
        node.verticals &&
        !node.verticals.includes(dimVerticalRef.current)
      const dimTarget = foraDaVertical ? 0 : foraDaArea ? 0.1 : 1
      inst.dim[i] += (dimTarget - inst.dim[i]) * dimEase
      const f = inst.dim[i]

      tmpColor.copy(inst.coreColor[i]).multiplyScalar(f)
      cores.setColorAt(i, tmpColor)
      tmpColor.copy(inst.haloColor[i]).multiplyScalar(f)
      halos.setColorAt(i, tmpColor)

      dummy.position.set(x, y + bob, z)
      dummy.scale.setScalar(inst.coreScale[i] * breathe * scaleBoost * (0.75 + f * 0.25))
      dummy.updateMatrix()
      cores.setMatrixAt(i, dummy.matrix)

      dummy.scale.setScalar(inst.haloScale[i] * breathe * haloBoost * (0.6 + f * 0.4))
      dummy.updateMatrix()
      halos.setMatrixAt(i, dummy.matrix)
    }
    cores.instanceMatrix.needsUpdate = true
    halos.instanceMatrix.needsUpdate = true
    if (cores.instanceColor) cores.instanceColor.needsUpdate = true
    if (halos.instanceColor) halos.instanceColor.needsUpdate = true
  })

  const emitHover = useCallback(
    (node, e) => {
      let detail = null
      if (node) {
        // posição da estrela em pixels de tela — para o cursor magnético
        projVec.set(node.pos[0] + GROUP_OFFSET_X, node.pos[1], node.pos[2]).project(camera)
        detail = {
          node,
          x: e.nativeEvent?.clientX ?? 0,
          y: e.nativeEvent?.clientY ?? 0,
          sx: (projVec.x * 0.5 + 0.5) * size.width,
          sy: (-projVec.y * 0.5 + 0.5) * size.height,
        }
      }
      window.dispatchEvent(new CustomEvent('constelacao:hover', { detail }))
    },
    [camera, size]
  )

  return (
    <group>
      {/* HALOS — glow suave por trás dos núcleos */}
      <instancedMesh
        ref={halosRef}
        args={[undefined, undefined, inst.n]}
        frustumCulled={false}
        renderOrder={1}
        raycast={() => null}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>

      {/* CORES — núcleos nítidos (alvo do raycast/hover) */}
      <instancedMesh
        ref={coresRef}
        args={[undefined, undefined, inst.n]}
        frustumCulled={false}
        renderOrder={2}
        onPointerMove={(e) => {
          e.stopPropagation()
          const id = e.instanceId
          if (id === undefined || id === hoveredRef.current) return
          if (inst.dim[id] < 0.2) return // invisível na vertical ativa
          hoveredRef.current = id
          emitHover(org.list[id], e)
        }}
        onPointerOut={(e) => {
          hoveredRef.current = -1
          emitHover(null, e)
        }}
        onClick={(e) => {
          e.stopPropagation()
          const id = e.instanceId
          if (id === undefined || inst.dim[id] < 0.2) return
          window.dispatchEvent(
            new CustomEvent('constelacao:focus', { detail: { node: org.list[id] } })
          )
        }}
      >
        {/* detalhe 2 = 320 triângulos/nó (era 1280) — invisível com bloom, 4× mais leve */}
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
