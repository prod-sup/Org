import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor, Preload } from '@react-three/drei'
import * as THREE from 'three'

import { deriveConfig } from '../config/constants'
import { getMode, initialTier, rememberTier } from '../config/quality'
import { setTier as broadcastTier } from '../config/tierBus'
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
 * Scene — dona do Canvas WebGL e da qualidade adaptativa.
 *
 * A qualidade sobe/desce em 4 degraus SEM recarregar a página:
 *   • degrau inicial: heurística de hardware (quality.js) ou escolha do ⚡
 *   • PerformanceMonitor (drei) mede o FPS real e ajusta ao vivo — desce
 *     quando engasga, sobe de volta quando sobra fôlego
 *   • o degrau estável fica salvo p/ a próxima visita já abrir certo
 * O primeiro corte é resolução (quase invisível); partículas só nos últimos.
 */
export default function Scene() {
  const [mode, setMode] = useState(getMode)
  const [tier, setTier] = useState(() => initialTier(getMode()))
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)

  // Aba oculta = rAF suspenso pelo navegador → o FPS despenca sem culpa da
  // máquina. O monitor é desmontado (e zera seus contadores) enquanto isso.
  useEffect(() => {
    const onVis = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // botão ⚡ da UI troca o modo ao vivo
  useEffect(() => {
    const onQuality = (e) => {
      const m = e.detail?.mode ?? 'auto'
      setMode(m)
      setTier(initialTier(m))
    }
    window.addEventListener('constelacao:quality', onQuality)
    return () => window.removeEventListener('constelacao:quality', onQuality)
  }, [])

  // memoriza o degrau estável (só no auto), aplica o drawRange nas camadas
  // de partículas (tierBus — sem rebuild) e avisa a UI (indicador do ⚡)
  useEffect(() => {
    if (mode === 'auto') rememberTier(tier)
    broadcastTier(tier)
    window.dispatchEvent(new CustomEvent('constelacao:tier', { detail: { tier, mode } }))
  }, [tier, mode])

  const cfg = useMemo(() => deriveConfig(tier), [tier])

  return (
    <Canvas
      dpr={cfg.tier.dpr}
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
        fov: cfg.camera.fov,
        near: cfg.camera.near,
        far: cfg.camera.far,
        position: cfg.camera.start,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(cfg.scene.background), 1)
      }}
    >
      {/* Monitor de FPS: ajusta o degrau ao vivo (apenas no modo auto, aba visível) */}
      {mode === 'auto' && pageVisible && (
        <PerformanceMonitor
          bounds={() => [40, 55]}
          flipflops={6}
          onDecline={() => setTier((t) => Math.min(3, t + 1))}
          onIncline={() => setTier((t) => Math.max(0, t - 1))}
          onFallback={() => setTier(3)}
        />
      )}

      {/* Fundo e névoa: profundidade e "neblina extremamente suave" */}
      <color attach="background" args={[cfg.scene.background]} />
      <fogExp2 attach="fog" args={[cfg.scene.fogColor, cfg.scene.fogDensity]} />

      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} intensity={1.2} distance={80} decay={2} color="#ffdca0" />

      <Suspense fallback={null}>
        {cfg.tier.nebula && <Atmosphere cfg={cfg.nebula} />}
        <StarField dust={cfg.dust} gold={cfg.gold} />
        {/* naipe deslocado à direita — o bloco editorial vive à esquerda */}
        <group position={[3.2, 0, 0]}>
          <SpadeDust outline={cfg.spadeOutline} fill={cfg.spadeFill} />
          <Organization />
          <ConstellationWeb cfg={cfg.web} />
          <Connections cfg={cfg.connections} />
          <ParticleFlow cfg={cfg.flow} />
          <Labels />
        </group>
        <Preload all />
      </Suspense>

      <CameraController cfg={cfg.camera} />
      <Effects cfg={cfg.post} fullPost={cfg.tier.fullPost} />

      {/* Performance: reduz DPR/eventos sob carga para segurar 60 FPS */}
      <AdaptiveDpr pixelated={false} />
      <AdaptiveEvents />
    </Canvas>
  )
}
