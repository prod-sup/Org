/**
 * GLSL das linhas de conexão.
 * Cada vértice sabe sua progressão ao longo da linha (aProgress 0→1) e uma
 * fase aleatória por linha (aSeed). O fragment faz um shimmer lento que
 * percorre a linha — orgânico, nunca "circuito eletrônico".
 */

export const lineVertexShader = /* glsl */ `
  attribute float aProgress;
  attribute float aSeed;
  attribute float aStrength;
  attribute vec3  aColor;

  varying float vProgress;
  varying float vSeed;
  varying float vStrength;
  varying float vDepth;
  varying vec3  vColor;

  void main() {
    vProgress = aProgress;
    vSeed = aSeed;
    vStrength = aStrength;
    vColor = aColor;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

export const lineFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;

  varying float vProgress;
  varying float vSeed;
  varying float vStrength;
  varying float vDepth;
  varying vec3  vColor;

  void main() {
    // shimmer lento viajando pela linha; ligações fortes pulsam mais rápido
    float speed = 0.55 + 0.45 * vStrength;
    float wave = sin(vProgress * 6.2831 - uTime * speed + vSeed * 6.2831);
    float shimmer = 0.55 + 0.45 * wave;

    // pontas suavemente apagadas — a linha "nasce" das estrelas
    float ends = smoothstep(0.0, 0.12, vProgress) * smoothstep(1.0, 0.88, vProgress);

    // atenuação com a distância (profundidade)
    float depthFade = clamp(60.0 / (vDepth + 20.0), 0.25, 1.0);

    float alpha = uOpacity * vStrength * ends * shimmer * depthFade;
    gl_FragColor = vec4(vColor, alpha);
  }
`
