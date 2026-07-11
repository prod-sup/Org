import { useEffect, useMemo, useRef } from 'react'
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ChromaticAberration,
  SMAA,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'
import gsap from 'gsap'
import { themeOf } from '../config/themeBus'

/** Flash de bloom na troca de vertical: sobe forte e assenta no nível do tema. */
function useBloomPulse(bloomRef, base) {
  useEffect(() => {
    const onVertical = (e) => {
      const fx = bloomRef.current
      const target = themeOf(e.detail).bloom ?? base
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (fx) {
        gsap.killTweensOf(fx)
        if (reduced) {
          fx.intensity = target
        } else {
          gsap.to(fx, { intensity: target + 0.55, duration: 0.9, ease: 'power2.out' })
          gsap.to(fx, { intensity: target, duration: 1.8, delay: 0.9, ease: 'power2.inOut' })
        }
      }
    }
    window.addEventListener('constelacao:vertical', onVertical)
    return () => window.removeEventListener('constelacao:vertical', onVertical)
  }, [bloomRef, base])
}

/**
 * Effects — camada de pós-processamento premium.
 * Bloom dourado espalhado (nunca branco estourado), vignette, aberração
 * cromática sutil nas bordas e grão de filme quase imperceptível.
 *
 * DOF real foi testado e descartado: as partículas usam depthWrite:false,
 * então o depth buffer não as vê e o efeito borra a cena inteira. A sensação
 * de profundidade vem das camadas de partículas em Z + paralaxe + névoa.
 */
export default function Effects({ cfg, fullPost = true }) {
  const bloomRef = useRef()
  const chromaOffset = useMemo(
    () => new Vector2(cfg.chromatic.offset, cfg.chromatic.offset),
    [cfg.chromatic.offset]
  )

  useBloomPulse(bloomRef, cfg.bloom.intensity)

  // PC fraco: só o essencial — bloom (a alma do visual) + vignette.
  // Sem aberração cromática, grão e SMAA (cada um é um passe de tela cheia).
  if (!fullPost) {
    return (
      <EffectComposer multisampling={0} disableNormalPass>
        <Bloom
          ref={bloomRef}
          intensity={cfg.bloom.intensity}
          luminanceThreshold={cfg.bloom.luminanceThreshold}
          luminanceSmoothing={cfg.bloom.luminanceSmoothing}
          mipmapBlur={cfg.bloom.mipmapBlur}
          radius={cfg.bloom.radius}
        />
        <Vignette
          offset={cfg.vignette.offset}
          darkness={cfg.vignette.darkness}
          eskil={false}
        />
      </EffectComposer>
    )
  }

  return (
    <EffectComposer multisampling={0} disableNormalPass>
      <Bloom
        ref={bloomRef}
        intensity={cfg.bloom.intensity}
        luminanceThreshold={cfg.bloom.luminanceThreshold}
        luminanceSmoothing={cfg.bloom.luminanceSmoothing}
        mipmapBlur={cfg.bloom.mipmapBlur}
        radius={cfg.bloom.radius}
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={chromaOffset}
        radialModulation
        modulationOffset={0.3}
      />
      <Vignette
        offset={cfg.vignette.offset}
        darkness={cfg.vignette.darkness}
        eskil={false}
      />
      <Noise
        opacity={cfg.noise.opacity}
        blendFunction={BlendFunction.OVERLAY}
        premultiply
      />
      <SMAA />
    </EffectComposer>
  )
}
