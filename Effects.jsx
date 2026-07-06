import { useMemo } from 'react'
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

/**
 * Effects — camada de pós-processamento premium.
 * Bloom discreto (glow elegante), vignette para focar o olhar,
 * aberração cromática sutil nas bordas e grão de filme quase imperceptível.
 * multisampling=0 + SMAA para antialiasing sem custo pesado de MSAA no composer.
 */
export default function Effects({ cfg }) {
  const chromaOffset = useMemo(
    () => new Vector2(cfg.chromatic.offset, cfg.chromatic.offset),
    [cfg.chromatic.offset]
  )

  return (
    <EffectComposer multisampling={0} disableNormalPass>
      <Bloom
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
