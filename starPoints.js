/**
 * Shader das partículas (poeira cósmica e douradas).
 * Renderiza pontos com halo suave, atenuação por profundidade,
 * cintilação (twinkle), oscilação lenta e fade pela névoa.
 */

export const starVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uTwinkleSpeed;
  uniform float uDriftAmplitude;
  uniform float uDriftSpeed;

  attribute float aScale;    // multiplicador de tamanho por partícula
  attribute float aRandom;   // semente aleatória por partícula
  attribute vec3  aColor;

  varying vec3  vColor;
  varying float vTwinkle;

  void main() {
    vec3 pos = position;

    // Oscilação lenta e orgânica (cada partícula com fase própria)
    float t = uTime * uDriftSpeed;
    float phase = aRandom * 6.28318530718;
    pos.x += sin(t + phase) * uDriftAmplitude * aRandom;
    pos.y += cos(t * 0.8 + phase) * uDriftAmplitude * aRandom;
    pos.z += sin(t * 0.6 + phase * 0.5) * uDriftAmplitude * 0.6 * aRandom;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Tamanho com atenuação por distância (partículas distantes menores)
    float size = uSize * aScale * uPixelRatio;
    gl_PointSize = size * (320.0 / -mvPosition.z);

    // Cintilação
    vTwinkle = 0.55 + 0.45 * sin(uTime * uTwinkleSpeed * (0.6 + aRandom) + phase * 3.0);
    vColor = aColor;
  }
`

export const starFragmentShader = /* glsl */ `
  precision highp float;

  varying vec3  vColor;
  varying float vTwinkle;

  void main() {
    // Distância radial ao centro do ponto
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);

    // Núcleo nítido + halo suave (glow)
    float core = 1.0 - smoothstep(0.0, 0.5, d);
    float glow = pow(core, 3.0);
    float alpha = glow * vTwinkle;

    if (alpha < 0.001) discard;

    // Um leve realce no núcleo dá brilho para o bloom captar
    vec3 color = vColor * (0.7 + 0.6 * pow(core, 6.0));

    gl_FragColor = vec4(color, alpha);
  }
`
