/**
 * GLSL das linhas de conexão.
 * Cada vértice sabe sua progressão ao longo da linha (aProgress 0→1), uma
 * fase aleatória por linha (aSeed) e um bitmask das verticais a que pertence
 * (aMask — Poker=1, SX=2, Bet=4). O fragment descarta o que não é da vertical
 * ativa (uVerticalBit): trocar de mundo não reconstrói geometria nenhuma.
 *
 * Movimento em três tempos:
 *   shimmer — respiração local da linha (onda estacionária, sutil)
 *   pulso   — um cometa de luz percorre a linha de ponta a ponta
 *   onda    — hover numa estrela propaga um anel de energia pela rede
 */

export const lineVertexShader = /* glsl */ `
  attribute float aProgress;
  attribute float aSeed;
  attribute float aStrength;
  attribute float aMask;
  attribute vec3  aColor;

  varying float vProgress;
  varying float vSeed;
  varying float vStrength;
  varying float vMask;
  varying float vDepth;
  varying vec3  vColor;
  varying vec3  vLocal; // posição no espaço do grupo (mesmo das estrelas)

  void main() {
    vProgress = aProgress;
    vSeed = aSeed;
    vStrength = aStrength;
    vMask = aMask;
    vColor = aColor;
    vLocal = position;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

export const lineFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3  uTint;        // color grade da vertical ativa
  uniform float uVerticalBit; // 1=Poker 2=SX 4=Bet
  uniform vec3  uHoverPos;    // estrela tocada (espaço do grupo)
  uniform float uHoverStart;  // uTime do toque; -1000 = sem onda

  varying float vProgress;
  varying float vSeed;
  varying float vStrength;
  varying float vMask;
  varying float vDepth;
  varying vec3  vColor;
  varying vec3  vLocal;

  void main() {
    // máscara de vertical: bit não presente → a linha não existe neste mundo
    float visible = mod(floor(vMask / uVerticalBit), 2.0);
    if (visible < 0.5) discard;

    // shimmer lento viajando pela linha; ligações fortes pulsam mais rápido
    float speed = 0.55 + 0.45 * vStrength;
    float wave = sin(vProgress * 6.2831 - uTime * speed + vSeed * 6.2831);
    float shimmer = 0.55 + 0.45 * wave;

    // PULSO: um cometa de luz percorre a linha de ponta a ponta. O shimmer
    // sozinho é uma onda estacionária — brilha, mas não SAI do lugar, e a
    // rede parece decorativa. Aqui o fract() faz a cabeça do pulso viajar e
    // dar a volta; o expoente alto deixa o núcleo curto com rastro atrás.
    // Cada linha tem velocidade e defasagem próprias (vSeed) — nunca marcham
    // juntas, então a rede parece conduzir informação, não piscar em bloco.
    float travel = fract(vProgress - uTime * (0.045 + vSeed * 0.055) + vSeed);
    float pulse = pow(1.0 - travel, 22.0);

    // ONDA DE HOVER: um anel de energia parte da estrela tocada e atravessa
    // a rede — exp(-|dist - raio|) é a casca esférica em expansão; o
    // envelope decai em ~2s e a rede volta ao ritmo de cruzeiro.
    float age = uTime - uHoverStart;
    float ring = distance(vLocal, uHoverPos);
    float shell = exp(-abs(ring - age * 7.0) * 1.1);
    float touch = shell * exp(-age * 1.3) * step(0.0, age);

    float energy = shimmer + pulse * 1.7 * vStrength + touch * 2.4;

    // pontas suavemente apagadas — a linha "nasce" das estrelas
    float ends = smoothstep(0.0, 0.12, vProgress) * smoothstep(1.0, 0.88, vProgress);

    // atenuação com a distância (profundidade)
    float depthFade = clamp(60.0 / (vDepth + 20.0), 0.25, 1.0);

    float alpha = uOpacity * vStrength * ends * energy * depthFade;

    // a cabeça do pulso e a onda de toque esquentam a cor (dourado →
    // champanhe) para o bloom pegá-las como faísca, não como linha opaca
    vec3 color = (vColor + vColor * (pulse * 0.9 + touch * 1.3)) * uTint;
    gl_FragColor = vec4(color, alpha);
  }
`
