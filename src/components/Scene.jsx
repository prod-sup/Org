import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr, AdaptiveEvents, Preload } from '@react-three/drei'
import * as THREE from 'three'

import CONFIG, { QUALITY } from '../config/constants'
import Atmosphere from './Atmosphere'
import StarField from './StarField'
import SpadeDust from './SpadeDust'
import Organization from './Organization'
import Connections from './Connections'
import ConstellationWeb from './ConstellationWeb'
import Labels from './Labels'
import ParticleFlow from './ParticleFlow'
import CameraController from './CameraController'
import Effects from './Effects'

/**
 * PerfGuard — mede o FPS real depois da intro (6s..9s). Se a máquina não
 * segura ~32 fps no modo 'high', salva 'lite' e recarrega UMA vez
 * (sessionStorage evita loop). Assim até a heurística errando, o site
 * se corrige sozinho em PCs fracos.
 */
function PerfGuard() {
  const frames = useRef(0)
  const start = useRef(null)

  useFrame((state) => {
    if (QUALITY !== 'high') return
    const t = state.clock.elapsedTime
    if (t < 6) return
    if (start.current === null) {
      start.current = t
      frames.current = 0
      return
    }
    frames.current++
    const span = t - start.current
    if (span < 3) return
    const fps = frames.current / span
    start.current = Infinity // mede uma única vez
    if (fps < 32 && !sessionStorage.getItem('constelacao-downgrade')) {
      sessionStorage.setItem('constelacao-downgrade', '1')
      localStorage.setItem('constelacao-perf', 'lite')
      window.location.reload()
    }
  })
  return null
}

/**
 * Scene — dona do Canvas WebGL e da composição da Etapa 1.
 * Configura tone mapping fílmico, color management, névoa exponencial
 * e o rig de iluminação. No modo 'lite' (PC fraco): DPR limitado e sem nébula.
 */
export default function Scene() {
  return (
    <Canvas
      dpr={QUALITY === 'lite' ? [1, 1.25] : [1, 2]}
      gl={{
        antialias: false, // SMAA cuida disso no composer
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{
        fov: CONFIG.camera.fov,
        near: CONFIG.camera.near,
        far: CONFIG.camera.far,
        position: CONFIG.camera.start,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(CONFIG.scene.background), 1)
      }}
    >
      {/* Fundo e névoa: profundidade e "neblina extremamente suave" */}
      <color attach="background" args={[CONFIG.scene.background]} />
      <fogExp2
        attach="fog"
        args={[CONFIG.scene.fogColor, CONFIG.scene.fogDensity]}
      />

      {/* Rig de iluminação — discreto agora, pronto para os nós/halos da Etapa 2 */}
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} intensity={1.2} distance={80} decay={2} color="#ffdca0" />

      <Suspense fallback={null}>
        {QUALITY !== 'lite' && <Atmosphere cfg={CONFIG.nebula} />}
        <StarField dust={CONFIG.dust} gold={CONFIG.gold} />
        {/* naipe deslocado à direita — o bloco editorial vive à esquerda */}
        <group position={[3.2, 0, 0]}>
          <SpadeDust outline={CONFIG.spadeOutline} fill={CONFIG.spadeFill} />
          <Organization />
          <ConstellationWeb cfg={CONFIG.web} />
          <Connections cfg={CONFIG.connections} />
          <ParticleFlow cfg={CONFIG.flow} />
          <Labels />
        </group>
        <Preload all />
      </Suspense>

      <CameraController cfg={CONFIG.camera} />
      <Effects cfg={CONFIG.post} />
      <PerfGuard />

      {/* Performance: reduz DPR/eventos sob carga para segurar 60 FPS */}
      <AdaptiveDpr pixelated={false} />
      <AdaptiveEvents />
    </Canvas>
  )
}
