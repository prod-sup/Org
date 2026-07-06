/**
 * Fonte única de verdade para todos os parâmetros ajustáveis da experiência.
 * Etapa 1: atmosfera / starfield / câmera / pós-processamento.
 * As etapas seguintes (organograma, conexões...) vão ler daqui também.
 */

export const CONFIG = {
  // ---------------------------------------------------------------------------
  // CENA
  // ---------------------------------------------------------------------------
  scene: {
    background: '#02030a',        // preto profundo com leve azul
    fogColor: '#02030a',
    fogDensity: 0.014,            // neblina exponencial suave (profundidade)
  },

  // ---------------------------------------------------------------------------
  // CÂMERA
  // ---------------------------------------------------------------------------
  camera: {
    fov: 42,
    near: 0.1,
    far: 400,
    start: [0, 0, 60],           // posição inicial (longe — reveal cinematográfico)
    base: [0, 0, 34],            // posição de repouso: naipe ♠ inteiro visível
    introDuration: 3.6,          // segundos do reveal de entrada
    introEase: 'power3.out',
    // parallax pelo mouse
    parallaxStrength: 2.8,
    parallaxDamping: 0.045,      // menor = mais inércia / mais suave
    // flutuação idle (respiração)
    floatAmplitude: 0.5,
    floatSpeed: 0.16,
  },

  // ---------------------------------------------------------------------------
  // STARFIELD — poeira cósmica (camada fria, discreta)
  // ---------------------------------------------------------------------------
  dust: {
    count: 11000,
    radius: 60,                  // raio do volume
    flatten: 0.42,               // achatamento no eixo Y (sensação de disco/galáxia)
    coreBias: 1.9,               // >1 concentra mais partículas no centro
    size: 1.5,                   // tamanho base do ponto
    sizeVariance: 2.2,
    opacity: 0.55,
    twinkleSpeed: 0.6,
    driftAmplitude: 0.9,         // oscilação lenta individual
    driftSpeed: 0.08,
    colors: ['#8fb2ff', '#cfe0ff', '#a9c4ff', '#6f89c7', '#e8f0ff'],
  },

  // ---------------------------------------------------------------------------
  // STARFIELD — partículas douradas (camada quente, brilhante, com halo)
  // ---------------------------------------------------------------------------
  gold: {
    count: 4000,
    radius: 42,
    flatten: 0.5,
    coreBias: 2.6,
    size: 2.6,
    sizeVariance: 3.4,
    opacity: 0.9,
    twinkleSpeed: 0.9,
    driftAmplitude: 0.6,
    driftSpeed: 0.1,
    colors: ['#ffd27a', '#ffbf55', '#ffe6b0', '#f5a623', '#fff3d6'],
  },

  // ---------------------------------------------------------------------------
  // NÉBULA / ATMOSFERA (skydome com fbm noise, discreta)
  // ---------------------------------------------------------------------------
  nebula: {
    radius: 200,
    intensity: 0.32,
    colorA: '#0a1030',           // azul profundo
    colorB: '#2a1246',           // roxo
    colorC: '#3a2a10',           // dourado apagado
    speed: 0.012,
  },

  // ---------------------------------------------------------------------------
  // PÓS-PROCESSAMENTO
  // ---------------------------------------------------------------------------
  post: {
    bloom: {
      intensity: 0.9,
      luminanceThreshold: 0.12,
      luminanceSmoothing: 0.35,
      mipmapBlur: true,
      radius: 0.7,
    },
    vignette: {
      offset: 0.28,
      darkness: 0.85,
    },
    noise: {
      opacity: 0.035,            // grão de filme sutil
    },
    chromatic: {
      offset: 0.0006,            // aberração cromática discreta nas bordas
    },
  },
}

export default CONFIG
