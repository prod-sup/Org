import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { starVertexShader, starFragmentShader } from '../shaders/starPoints'
import { useTierDrawRange } from '../config/tierBus'
import { useThemeTint } from '../config/themeBus'
import { useSyncPixelRatio } from '../config/pixelRatio'
import { useLayerLife } from '../config/sceneLife'

/**
 * Galaxy — a galáxia espiral que vive atrás da constelação.
 * Núcleo quente → braços frios, inclinada em perspectiva, girando devagar
 * e inclinando sutilmente na direção do mouse (nada aqui é estático).
 * Um único THREE.Points com o shader das estrelas (twinkle + drift + tint);
 * o tint faz a galáxia inteira mudar de humor junto com o mundo ativo.
 */
function buildGalaxy(cfg) {
  const { count, radius, branches, spin, randomness, randomnessPower } = cfg
  const positions = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  const randoms = new Float32Array(count)
  const colorArr = new Float32Array(count * 3)

  const inside = new THREE.Color(cfg.insideColor)
  const outside = new THREE.Color(cfg.outsideColor)
  const tmp = new THREE.Color()

  for (let i = 0; i < count; i++) {
    // densidade uniforme por área (√): o núcleo não engole os braços
    const r = radius * (0.1 + 0.9 * Math.sqrt(Math.random()))
    const branchAngle = ((i % branches) / branches) * Math.PI * 2
    const spinAngle = (r / radius) * spin * Math.PI * 2

    // dispersão que cresce com o raio (braços definidos no centro, difusos fora)
    const rand = () =>
      Math.pow(Math.random(), randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      randomness *
      r

    positions[i * 3 + 0] = Math.cos(branchAngle + spinAngle) * r + rand()
    positions[i * 3 + 1] = rand() * 0.35 // disco fino
    positions[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * r + rand()

    scales[i] = 0.4 + Math.random() * 1.6
    randoms[i] = Math.random()

    tmp
      .copy(inside)
      .lerp(outside, Math.pow(r / radius, 0.75))
      .multiplyScalar(cfg.brightness ?? 1)
    colorArr[i * 3 + 0] = tmp.r
    colorArr[i * 3 + 1] = tmp.g
    colorArr[i * 3 + 2] = tmp.b
  }
  return { positions, scales, randoms, colorArr }
}

// glow radial do núcleo (canvas → textura) — dá o "coração de luz" da galáxia
function coreTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.25, 'rgba(255,225,170,0.6)')
  g.addColorStop(0.6, 'rgba(255,200,120,0.18)')
  g.addColorStop(1, 'rgba(255,200,120,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export default function Galaxy({ cfg }) {
  const materialRef = useRef()
  const pointsRef = useRef()
  const groupRef = useRef()
  const coreRef = useRef()
  const data = useMemo(() => buildGalaxy(cfg), [cfg])
  const coreTex = useMemo(coreTexture, [])

  useTierDrawRange(pointsRef)
  useThemeTint(materialRef, 2.6)
  // sprite acompanha o DPR do degrau em vez de inchar quando a resolução cai
  useSyncPixelRatio(materialRef)

  // nasce cedo (é o fundo do palco) e recua bastante no focus
  const life = useLayerLife(materialRef, cfg.opacity, {
    introDelay: 0.2,
    introDuration: 3.4,
    spotlight: 0.3,
  })

  useEffect(() => () => coreTex.dispose(), [coreTex])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: cfg.size },
      uOpacity: { value: cfg.opacity },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uTwinkleSpeed: { value: cfg.twinkleSpeed },
      uDriftAmplitude: { value: cfg.driftAmplitude },
      uDriftSpeed: { value: cfg.driftSpeed },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
    }),
    [cfg]
  )

  useFrame((state, delta) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value += delta
    // o núcleo pulsa devagar — nunca estático
    if (coreRef.current) {
      const s = cfg.radius * 0.5 * (1 + Math.sin(state.clock.elapsedTime * 0.4) * 0.06)
      coreRef.current.scale.set(s, s, 1)
      // o núcleo (billboard próprio) acompanha a entrada e o spotlight
      coreRef.current.material.opacity = 0.7 * life.current.intro * life.current.spot
    }
    const g = groupRef.current
    if (!g) return
    // rotação eterna do disco + inclinação viva na direção do mouse
    g.rotation.y += delta * cfg.rotationSpeed
    const tx = cfg.tilt + state.pointer.y * 0.07
    const tz = cfg.roll + state.pointer.x * 0.05
    g.rotation.x += (tx - g.rotation.x) * 0.02
    g.rotation.z += (tz - g.rotation.z) * 0.02

    // parallax contra a deriva da câmera: a galáxia é o objeto mais fundo da
    // cena, então se desloca CONTRA o passeio — profundidade real, não cenário
    // pintado. Fator pequeno: ela mal anda, mas o cérebro registra a camada.
    const cam = state.camera.position
    g.position.x = cfg.position[0] - cam.x * 0.14
    g.position.y = cfg.position[1] - cam.y * 0.1
  })

  return (
    <group ref={groupRef} position={cfg.position} rotation={[cfg.tilt, 0, cfg.roll]}>
      {/* coração de luz do núcleo — encara a câmera (billboard no plano do disco) */}
      <mesh ref={coreRef} renderOrder={-8} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={coreTex}
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <points ref={pointsRef} frustumCulled={false} renderOrder={-8}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={data.positions.length / 3} array={data.positions} itemSize={3} />
          <bufferAttribute attach="attributes-aScale" count={data.scales.length} array={data.scales} itemSize={1} />
          <bufferAttribute attach="attributes-aRandom" count={data.randoms.length} array={data.randoms} itemSize={1} />
          <bufferAttribute attach="attributes-aColor" count={data.colorArr.length / 3} array={data.colorArr} itemSize={3} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={starVertexShader}
          fragmentShader={starFragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
