/**
 * Fonte única de verdade para todos os parâmetros ajustáveis da experiência.
 * Etapa 1: atmosfera / starfield / câmera / pós-processamento.
 * As etapas seguintes (organograma, conexões...) vão ler daqui também.
 */

// ---------------------------------------------------------------------------
// TEMAS POR VERTICAL — cada constelação é um MUNDO: color grade próprio em
// fundo, névoa, nébula, luz, partículas, bloom e UI. A troca de vertical
// faz a cena inteira "revelar" a nova paleta (GSAP tweena tudo ao vivo).
//   Poker ♠  Meia-noite dourada (a identidade original)
//   SX    ♦  Rubi — carmim profundo, quente e afiado
//   Bet   ♣  Esmeralda — verde feltro vivo, esportivo
// tint multiplica a cor das partículas do naipe (1,1,1 = neutro).
// ---------------------------------------------------------------------------
export const THEMES = {
  Poker: {
    accent: '#d8b56d',
    accentBright: '#ffd98f',
    background: '#060a1a',
    light: '#ffdca0',
    tint: [1, 1, 1],
    flowColor: '#ffd98f',
    webColor: '#c9a45e',
    nebula: { colorA: '#121c4e', colorB: '#3a1a66', colorC: '#54390f' },
    bloom: 0.52,
  },
  SX: {
    accent: '#5d8bff',
    accentBright: '#a3c0ff',
    background: '#050c24',
    light: '#8fb2ff',
    tint: [0.6, 0.8, 1.4],
    flowColor: '#9db9ff',
    webColor: '#4a6fd4',
    nebula: { colorA: '#0a1650', colorB: '#142a6e', colorC: '#0a3450' },
    bloom: 0.6,
  },
  Bet: {
    accent: '#3ee08b',
    accentBright: '#a4ffd0',
    background: '#051810',
    light: '#8affc4',
    tint: [0.55, 1.2, 0.78],
    flowColor: '#7dffb8',
    webColor: '#3f9e6b',
    nebula: { colorA: '#0a3826', colorB: '#125438', colorC: '#2a5416' },
    bloom: 0.6,
  },
}

export const CONFIG = {
  // ---------------------------------------------------------------------------
  // CENA
  // ---------------------------------------------------------------------------
  scene: {
    background: '#060a1a',        // azul-meia-noite (nunca preto chapado)
    fogColor: '#060a1a',
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
    // DERIVA CINEMATOGRÁFICA — a câmera nunca fica ancorada. Frequências
    // incomensuráveis (razão áurea) fazem o passeio não repetir: o olho nunca
    // reconhece o ciclo. É daqui que vem a sensação de estar DENTRO da cena —
    // ao transladar, as camadas em Z (galáxia -14, naipe 0, poeira 60) se
    // deslocam uma contra a outra e o espaço ganha volume de verdade.
    driftX: 3.4,                 // curso horizontal (o que mais faltava)
    driftY: 1.3,
    driftZ: 2.2,                 // aproxima/afasta muito lentamente
    driftSpeed: 0.031,           // ~3 min por volta — quase subliminar
    lookDrift: 1.15,             // o ALVO também passeia: reenquadra, não só move
    roll: 0.028,                 // inclinação sutil do horizonte (radianos)
  },

  // ---------------------------------------------------------------------------
  // STARFIELD — poeira cósmica (camada fria, discreta)
  // ---------------------------------------------------------------------------
  dust: {
    count: 8500,
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
    count: 1800,
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
  // GALÁXIA — a espiral que vive atrás da constelação. Núcleo quente,
  // braços frios; gira sempre e inclina com o mouse. O uTint do tema
  // esfria/esquenta a galáxia inteira a cada mundo.
  // ---------------------------------------------------------------------------
  galaxy: {
    count: 14000,
    radius: 15,
    branches: 3,
    spin: 2.4,
    randomness: 0.14,
    randomnessPower: 3.0,
    insideColor: '#ffd08a',
    outsideColor: '#7d9bff',
    brightness: 1.15,            // >1 acende os braços no bloom
    size: 1.15,
    opacity: 0.8,
    twinkleSpeed: 0.5,
    driftAmplitude: 0.1,
    driftSpeed: 0.05,
    rotationSpeed: 0.02,
    tilt: -1.15,   // bem de frente, leve perspectiva
    roll: 0.3,
    position: [-13.5, 7, -14], // objeto celeste no canto sup. esquerdo
  },

  // ---------------------------------------------------------------------------
  // AURA — poeira colorida que respira na cor do MUNDO ativo (tema).
  // É ela que tira o fundo do preto chapado: ouro no ♠, azul na ♦, verde no ♣.
  // ---------------------------------------------------------------------------
  aura: {
    count: 2200,
    innerRadius: 9,
    radius: 38,
    flatten: 0.55,
    coreBias: 0.7,
    size: 2.1,
    sizeVariance: 2.6,
    opacity: 0.5,
    twinkleSpeed: 1.1,
    driftAmplitude: 1.6,
    driftSpeed: 0.14,
    colors: ['#fff6e6', '#ffe2b0', '#e8ecff', '#ffffff'],
  },

  // ---------------------------------------------------------------------------
  // NÉBULA / ATMOSFERA (skydome com fbm noise, discreta)
  // ---------------------------------------------------------------------------
  nebula: {
    radius: 200,
    intensity: 0.62,
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
    size: 1.85,
    sizeVariance: 1.9,
    opacity: 0.95,
    twinkleSpeed: 0.7,
    driftAmplitude: 0.06,
    driftSpeed: 0.1,
    colors: ['#ffd98f', '#f5c76a', '#ffedc2', '#e0a94f', '#fff3d6'],
  },
  spadeFill: {
    count: 7800,
    spread: 0.02,
    size: 1.15,
    sizeVariance: 1.4,
    opacity: 0.48,
    twinkleSpeed: 0.55,
    driftAmplitude: 0.1,
    driftSpeed: 0.08,
    colors: ['#caa45f', '#8f7440', '#e3c088', '#6f5c38', '#f0d7a4'],
  },

  // ---------------------------------------------------------------------------
  // ESTRELAS AMBIENTE — estrelas decorativas que preenchem a constelação
  // quando a vertical tem pouca gente (SX/Bet). Cores das áreas + champanhe;
  // brilho e twinkle fortes pro bloom fazê-las "explodir".
  // ---------------------------------------------------------------------------
  ambientStars: {
    count: 64,                   // estrelas soltas espalhadas pela tela
    size: 5.0,
    opacity: 0.95,
    twinkleSpeed: 1.7,
    driftAmplitude: 0.16,
    driftSpeed: 0.12,
    colors: ['#ffd27a', '#7fa4ff', '#c39be0', '#8fd6a8', '#7fd6d0', '#ffe9b8', '#f5a05a'],
  },

  // ---------------------------------------------------------------------------
  // TEIA — malha decorativa fina que preenche o interior do naipe
  // ---------------------------------------------------------------------------
  web: {
    points: 1200,
    linkDistance: 1.25,          // distância máxima (mundo) para ligar vizinhos
    maxLinks: 4,
    color: '#c9a45e',
    opacity: 0.2,                // tecido denso e visível (referência do mock)
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

// ---------------------------------------------------------------------------
// QUALIDADE ADAPTATIVA — 4 degraus. O primeiro corte é sempre RESOLUÇÃO
// (fill rate é o gargalo real de partículas aditivas em GPU fraca; cortar
// DPR preserva o visual). Partículas só caem nos últimos degraus.
// ---------------------------------------------------------------------------
export const TIERS = [
  { dpr: [1, 2.0], counts: 1.0,  nebula: true,  fullPost: true  }, // T0 máquina forte
  { dpr: [1, 1.5], counts: 1.0,  nebula: true,  fullPost: true  }, // T1 só corta resolução
  { dpr: [1, 1.1], counts: 0.5,  nebula: false, fullPost: false }, // T2 integrada/notebook
  { dpr: [1, 0.9], counts: 0.25, nebula: false, fullPost: false }, // T3 PC bem fraco
]

/**
 * Deriva o CONFIG para um degrau. As CONTAGENS não mudam aqui — os buffers
 * são alocados uma vez no total e o corte por degrau acontece via
 * geometry.setDrawRange (tierBus.js). Assim trocar de degrau não reconstrói
 * nada: zero engasgo na própria troca. As seções de partículas mantêm a
 * MESMA identidade de objeto para os useMemo não recriarem geometria.
 */
export function deriveConfig(tier) {
  const t = TIERS[Math.max(0, Math.min(TIERS.length - 1, tier))]
  return {
    ...CONFIG,
    tier: { ...t, index: tier },
    post: {
      ...CONFIG.post,
      bloom: {
        ...CONFIG.post.bloom,
        radius: t.fullPost ? CONFIG.post.bloom.radius : 0.75,
      },
    },
  }
}

export default CONFIG
