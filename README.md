# A Constelação · Grupo Suprema

Experiência WebGL premium onde o organograma da empresa nasce de uma constelação
viva. Cada estrela é uma pessoa; a organização inteira formará um enorme naipe de
espadas (♠) — mas isso só se revela conforme o usuário se aproxima.

Esta é a **Etapa 1**: atmosfera, starfield, iluminação, câmera e pós-processamento.

## Rodar

```bash
npm install
npm run dev
```

Abra o endereço que o Vite imprimir (padrão `http://localhost:5173`).

Build de produção:

```bash
npm run build      # gera /dist
npm run preview    # serve o build localmente
```

`base: './'` já está configurado no `vite.config.js` para deploy direto no
GitHub Pages (prod-sup).

## Arquitetura

Tudo desacoplado, pronto para receber as próximas etapas sem reescrever nada:

```
src/
├── main.jsx                 entry React
├── App.jsx                  compõe Scene (WebGL) + UI (overlay)
├── config/
│   └── constants.js         ← FONTE ÚNICA DE AJUSTES (mexa aqui)
├── shaders/
│   ├── starPoints.js        GLSL das partículas (halo, twinkle, drift)
│   └── nebula.js            GLSL da nébula (fbm noise)
├── components/
│   ├── Scene.jsx            Canvas, tone mapping, névoa, rig de luz
│   ├── Atmosphere.jsx       skydome de nébula procedural
│   ├── StarField.jsx        2 camadas de partículas GPU (poeira + dourado)
│   ├── CameraController.jsx intro GSAP + parallax com inércia + float idle
│   ├── Effects.jsx          bloom, vignette, aberração cromática, grão
│   └── UI.jsx               interface minimalista (fora do WebGL)
└── styles/
    └── index.css
```

Todo o rendering acontece em WebGL. Nada de Canvas 2D.

## Como ajustar o visual

Abra `src/config/constants.js`. Alguns pontos de partida:

- **Densidade / brilho das estrelas** → `dust.count`, `gold.count`, `*.size`, `*.opacity`
- **Concentração no centro** → `*.coreBias` (maior = mais denso no meio)
- **Achatamento (disco galáctico)** → `*.flatten`
- **Névoa / profundidade** → `scene.fogDensity`
- **Nébula ao fundo** → `nebula.intensity`, `nebula.colorA/B/C`
- **Entrada cinematográfica** → `camera.introDuration`, `camera.introEase`
- **Inércia da câmera** → `camera.parallaxDamping` (menor = mais suave)
- **Glow** → `post.bloom.intensity`, `post.bloom.luminanceThreshold`

## Performance

- Partículas em `THREE.Points` + `ShaderMaterial` (GPU, um único draw call por camada).
- `BufferGeometry` com atributos custom; oscilação/twinkle no vertex shader.
- `AdaptiveDpr` + `AdaptiveEvents` seguram os 60 FPS sob carga.
- Sem milhares de componentes React: 15.000 partículas = 2 componentes.

Acessibilidade: `prefers-reduced-motion` desliga a intro e a flutuação da câmera.

## Roadmap

- **Etapa 1 — Atmosfera** ✅ (esta entrega)
- **Etapa 2 — Organograma**: 150 nós (CEO → Equipe) distribuídos formando o ♠,
  via `InstancedMesh`, com tamanho/brilho por nível.
- **Etapa 3 — Conexões**: linhas douradas finas gestor↔subordinado + fluxo de partículas.
- **Etapa 4 — Interações**: hover, halo, destaque de conexões, card do colaborador.
- **Etapa 5 — Zoom inteligente**: poeira some ao aproximar, nós/detalhes emergem.
- **Etapa 6 — Polimento**: LOD, timing, direção de arte final.
