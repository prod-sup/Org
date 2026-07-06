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
    count: 7500,
    innerRadius: 13,             // miolo vazio: o organograma respira no centro
    radius: 60,                  // raio do volume
    flatten: 0.42,               // achatamento no eixo Y (sensação de disco/galáxia)
    coreBias: 0.85,              // >1 concentra no centro; <1 espalha para fora
    size: 1.15,                  // tamanho base do ponto
    sizeVariance: 1.6,
    opacity: 0.32,
    twinkleSpeed: 0.6,
    driftAmplitude: 0.9,         // oscilação lenta individual
    driftSpeed: 0.08,
    colors: ['#8fb2ff', '#cfe0ff', '#a9c4ff', '#6f89c7', '#e8f0ff'],
  },

  // ---------------------------------------------------------------------------
  // STARFIELD — partículas douradas (camada quente, brilhante, com halo)
  // ---------------------------------------------------------------------------
  gold: {
    count: 1600,
    innerRadius: 15,
    radius: 42,
    flatten: 0.5,
    coreBias: 0.9,
    size: 1.7,
    sizeVariance: 2.0,
    opacity: 0.42,
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
    intensity: 0.44,
    colorA: '#0a1030',           // azul profundo
    colorB: '#2a1246',           // roxo
    colorC: '#3a2a10',           // dourado apagado
    speed: 0.012,
  },

  // ---------------------------------------------------------------------------
  // SPADE DUST — partículas decorativas que desenham o naipe ♠
  // ---------------------------------------------------------------------------
  spadeOutline: {
    count: 3000,
    spread: 0.030,               // espessura média — varia por trecho (banda)
    size: 1.6,
    sizeVariance: 1.8,
    opacity: 0.8,
    twinkleSpeed: 0.7,
    driftAmplitude: 0.06,
    driftSpeed: 0.1,
    colors: ['#ffd98f', '#f5c76a', '#ffedc2', '#e0a94f', '#fff3d6'],
  },
  spadeFill: {
    count: 7800,
    spread: 0.02,
    size: 1.1,
    sizeVariance: 1.3,
    opacity: 0.35,
    twinkleSpeed: 0.55,
    driftAmplitude: 0.1,
    driftSpeed: 0.08,
    colors: ['#caa45f', '#8f7440', '#e3c088', '#6f5c38', '#f0d7a4'],
  },

  // ---------------------------------------------------------------------------
  // TEIA — malha decorativa fina que preenche o interior do naipe
  // ---------------------------------------------------------------------------
  web: {
    points: 850,
    linkDistance: 1.15,          // distância máxima (mundo) para ligar vizinhos
    maxLinks: 3,
    color: '#c9a45e',
    opacity: 0.12,               // quase subliminar — só "tecido"
  },

  // ---------------------------------------------------------------------------
  // CONEXÕES — linhas douradas finas entre gestores e subordinados
  // ---------------------------------------------------------------------------
  connections: {
    opacity: 0.28,               // extremamente discretas
    strategicStrength: 0.45,     // ligações entre departamentos são mais tênues
    curvature: 0.045,            // arco vertical sutil (0 = linha reta)
    // cor e presença por tipo de relação
    types: {
      hierarchy: { color: '#f5c76a', strength: 1.0 },  // gestor ↔ time (dourado)
      council:   { color: '#ffe9b8', strength: 1.25 }, // CEO ↔ CEO (champanhe)
      strategic: { color: '#8fa7e8', strength: 0.45 }, // entre áreas (azul frio)
    },
  },

  // ---------------------------------------------------------------------------
  // FLUXO — partículas percorrendo as conexões (informação circulando)
  // ---------------------------------------------------------------------------
  flow: {
    count: 540,
    size: 2.2,
    speed: 0.042,                // percursos muito lentos (~24s por conexão)
    curvature: 0.045,            // deve acompanhar connections.curvature
    color: '#ffd98f',
    opacity: 0.75,
  },

  // ---------------------------------------------------------------------------
  // PÓS-PROCESSAMENTO
  // ---------------------------------------------------------------------------
  post: {
    bloom: {
      intensity: 0.52,           // menor e mais espalhado — dourado, não branco
      luminanceThreshold: 0.26,
      luminanceSmoothing: 0.4,
      mipmapBlur: true,
      radius: 0.95,
    },
    dof: {
      worldFocusRange: 22,       // faixa nítida em volta do plano do naipe
      bokehScale: 2.4,           // bokeh sutil nas partículas fora de foco
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
