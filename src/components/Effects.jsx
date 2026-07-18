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

/**
 * Bloom vivo: flash na troca de vertical (sobe forte, assenta no nível do
 * tema) + realce no focus (a pessoa focada ganha um palco mais luminoso).
 * baseRef guarda o nível de repouso ATUAL — os dois efeitos compõem sem
 * brigar pelo mesmo número.
 */
function useBloomLife(bloomRef, base) {
  const baseRef = useRef(base)
  useEffect(() => {
    baseRef.current = base
  }, [base])

  useEffect(() => {
    const onVertical = (e) => {
      const fx = bloomRef.current
      const target = themeOf(e.detail).bloom ?? baseRef.current
      baseRef.current = target
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
    // focus: o fundo recua (sceneLife) e o brilho sobe — spotlight completo
    const onFocus = (e) => {
      const fx = bloomRef.current
      if (!fx) return
      gsap.killTweensOf(fx)
      gsap.to(fx, {
        intensity: baseRef.current + (e.detail?.node ? 0.2 : 0),
        duration: 1.4,
        ease: 'power2.inOut',
      })
    }
    window.addEventListener('constelacao:vertical', onVertical)
    window.addEventListener('constelacao:focus', onFocus)
    return () => {
      window.removeEventListener('constelacao:vertical', onVertical)
      window.removeEventListener('constelacao:focus', onFocus)
    }
  }, [bloomRef])
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

  useBloomLife(bloomRef, cfg.bloom.intensity)

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
