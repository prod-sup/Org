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
import { QUALITY } from '../config/constants'

/**
 * Effects — camada de pós-processamento premium.
 * Bloom dourado espalhado (nunca branco estourado), vignette, aberração
 * cromática sutil nas bordas e grão de filme quase imperceptível.
 *
 * DOF real foi testado e descartado: as partículas usam depthWrite:false,
 * então o depth buffer não as vê e o efeito borra a cena inteira. A sensação
 * de profundidade vem das camadas de partículas em Z + paralaxe + névoa.
 */
export default function Effects({ cfg }) {
  const chromaOffset = useMemo(
    () => new Vector2(cfg.chromatic.offset, cfg.chromatic.offset),
    [cfg.chromatic.offset]
  )

  // PC fraco: só o essencial — bloom (a alma do visual) + vignette.
  // Sem aberração cromática, grão e SMAA (cada um é um passe de tela cheia).
  if (QUALITY === 'lite') {
    return (
      <EffectComposer multisampling={0} disableNormalPass>
        <Bloom
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
