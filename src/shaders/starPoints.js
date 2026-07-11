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

  // Morph entre as constelações (♠ ♦ ♣): 0=position, 1=aPosB, 2=aPosC.
  // Camadas sem morph (StarField) deixam os uniforms em 0 → pos = position.
  uniform float uShapeFrom;
  uniform float uShapeTo;
  uniform float uMorph;
  uniform float uBurst; // força da dispersão no meio do voo (0 = desliga)

  attribute float aScale;    // multiplicador de tamanho por partícula
  attribute float aRandom;   // semente aleatória por partícula
  attribute vec3  aColor;
  attribute vec3  aPosB;     // posição na forma 1 (♦)
  attribute vec3  aPosC;     // posição na forma 2 (♣)

  varying vec3  vColor;
  varying float vTwinkle;
  varying float vNearFade;

  vec3 shapePos(float s) {
    if (s < 0.5) return position;
    if (s < 1.5) return aPosB;
    return aPosC;
  }

  void main() {
    vec3 pos = shapePos(uShapeFrom);

    // morph escalonado: cada partícula parte num instante próprio (organico,
    // nunca em bloco) e se dispersa levemente no meio do voo (explosão suave)
    if (uMorph > 0.0) {
      float k = smoothstep(0.0, 1.0, clamp(uMorph * 1.45 - aRandom * 0.45, 0.0, 1.0));
      vec3 target = shapePos(uShapeTo);
      pos = mix(pos, target, k);
      float burst = sin(k * 3.14159265) * max(uBurst, 0.001);
      pos.x += sin(aRandom * 39.0) * burst * (0.6 + aRandom * 1.8);
      pos.y += cos(aRandom * 57.0) * burst * (0.6 + aRandom * 1.8);
      pos.z += sin(aRandom * 73.0) * burst * (0.9 + aRandom * 2.2);
    }

    // Oscilação lenta e orgânica (cada partícula com fase própria)
    float t = uTime * uDriftSpeed;
    float phase = aRandom * 6.28318530718;
    pos.x += sin(t + phase) * uDriftAmplitude * aRandom;
    pos.y += cos(t * 0.8 + phase) * uDriftAmplitude * aRandom;
    pos.z += sin(t * 0.6 + phase * 0.5) * uDriftAmplitude * 0.6 * aRandom;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Tamanho com atenuação por distância (partículas distantes menores),
    // com teto — perto demais da câmera nunca vira um "borrão" gigante
    float size = uSize * aScale * uPixelRatio;
    gl_PointSize = min(size * (320.0 / -mvPosition.z), 13.0 * uPixelRatio);

    // Partículas coladas na câmera se dissolvem em vez de estourar
    vNearFade = smoothstep(5.0, 16.0, -mvPosition.z);

    // Cintilação
    vTwinkle = 0.55 + 0.45 * sin(uTime * uTwinkleSpeed * (0.6 + aRandom) + phase * 3.0);
    vColor = aColor;
  }
`

export const starFragmentShader = /* glsl */ `
  precision mediump float;

  uniform float uOpacity;
  uniform vec3  uTint; // color grade da vertical ativa (1,1,1 = neutro)

  varying vec3  vColor;
  varying float vTwinkle;
  varying float vNearFade;

  void main() {
    // Distância radial ao centro do ponto
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);

    // Núcleo nítido + halo suave (glow)
    float core = 1.0 - smoothstep(0.0, 0.5, d);
    float glow = pow(core, 3.0);
    float alpha = glow * vTwinkle * vNearFade * uOpacity;

    if (alpha < 0.001) discard;

    // Um leve realce no núcleo dá brilho para o bloom captar
    vec3 color = vColor * uTint * (0.7 + 0.6 * pow(core, 6.0));

    gl_FragColor = vec4(color, alpha);
  }
`
