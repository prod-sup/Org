import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, AdaptiveEvents, Preload } from '@react-three/drei'
import * as THREE from 'three'

import CONFIG from '../config/constants'
import Atmosphere from './Atmosphere'
import StarField from './StarField'
import CameraController from './CameraController'
import Effects from './Effects'

/**
 * Scene — dona do Canvas WebGL e da composição da Etapa 1.
 * Configura tone mapping fílmico, color management, névoa exponencial
 * e o rig de iluminação (ambiente já preparado para os nós da Etapa 2).
 */
export default function Scene() {
  return (
    <Canvas
      dpr={[1, 2]}
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
        <Atmosphere cfg={CONFIG.nebula} />
        <StarField dust={CONFIG.dust} gold={CONFIG.gold} />
        <Preload all />
      </Suspense>

      <CameraController cfg={CONFIG.camera} />
      <Effects cfg={CONFIG.post} />

      {/* Performance: reduz DPR/eventos sob carga para segurar 60 FPS */}
      <AdaptiveDpr pixelated={false} />
      <AdaptiveEvents />
    </Canvas>
  )
}
