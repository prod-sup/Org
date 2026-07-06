import { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getOrganization, LEVELS } from '../data/organization'

const dummy = new THREE.Object3D()
const tmpColor = new THREE.Color()

/**
 * Organization — renderiza os 150 colaboradores como dois InstancedMesh:
 *   • cores  : núcleo nítido, cor por nível (brilho >1 estoura no bloom)
 *   • halos  : esfera maior, aditiva e translúcida → glow suave
 *
 * O peso visual (tamanho + brilho) vem de LEVELS, então o CEO se destaca
 * apenas pela composição. Cada nó tem uma flutuação individual muito lenta.
 *
 * Um único draw call por camada. Frustum culling desligado (a cena é compacta
 * e sempre visível). Raycast dos cores fica pronto para o hover da Etapa 4.
 */
export default function Organization() {
  const org = useMemo(() => getOrganization(), [])
  const coresRef = useRef()
  const halosRef = useRef()

  // Dados por instância (posições base, escalas, cores, fases de flutuação)
  const inst = useMemo(() => {
    const n = org.list.length
    const basePos = new Float32Array(n * 3)
    const coreScale = new Float32Array(n)
    const haloScale = new Float32Array(n)
    const coreColor = []
    const haloColor = []
    const phase = new Float32Array(n)

    org.list.forEach((node, i) => {
      const lvl = LEVELS[node.levelIndex]
      basePos[i * 3 + 0] = node.pos[0]
      basePos[i * 3 + 1] = node.pos[1]
      basePos[i * 3 + 2] = node.pos[2]
      coreScale[i] = lvl.size
      haloScale[i] = lvl.size * lvl.haloScale

      // cor do núcleo multiplicada pelo brilho do nível (pode passar de 1.0)
      coreColor.push(new THREE.Color(lvl.core).multiplyScalar(lvl.brightness))
      haloColor.push(new THREE.Color(lvl.halo))
      phase[i] = Math.random() * Math.PI * 2
    })

    return { n, basePos, coreScale, haloScale, coreColor, haloColor, phase }
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

  // Flutuação individual muito lenta (sensação de constelação viva)
  useFrame((state) => {
    const cores = coresRef.current
    const halos = halosRef.current
    if (!cores || !halos) return
    const t = state.clock.elapsedTime

    for (let i = 0; i < inst.n; i++) {
      const x = inst.basePos[i * 3 + 0]
      const y = inst.basePos[i * 3 + 1]
      const z = inst.basePos[i * 3 + 2]
      const bob = Math.sin(t * 0.25 + inst.phase[i]) * 0.06

      dummy.position.set(x, y + bob, z)
      dummy.scale.setScalar(inst.coreScale[i])
      dummy.updateMatrix()
      cores.setMatrixAt(i, dummy.matrix)

      dummy.scale.setScalar(inst.haloScale[i])
      dummy.updateMatrix()
      halos.setMatrixAt(i, dummy.matrix)
    }
    cores.instanceMatrix.needsUpdate = true
    halos.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      {/* HALOS — glow suave por trás dos núcleos */}
      <instancedMesh
        ref={halosRef}
        args={[undefined, undefined, inst.n]}
        frustumCulled={false}
        renderOrder={1}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>

      {/* CORES — núcleos nítidos (alvo do raycast na Etapa 4) */}
      <instancedMesh
        ref={coresRef}
        args={[undefined, undefined, inst.n]}
        frustumCulled={false}
        renderOrder={2}
      >
        <icosahedronGeometry args={[1, 3]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
