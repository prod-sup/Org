/**
 * Geração determinística dos 150 colaboradores.
 * - Distribuição dentro da silhueta de um naipe de espadas (♠).
 * - Níveis atribuídos por altura (topo → base), formando a hierarquia visual.
 * - managerId por proximidade (nó mais próximo no nível acima) → árvore limpa
 *   e linhas curtas para a Etapa 3 (conexões).
 *
 * É memoizado: todos os componentes (Organization, Connections, HoverSystem...)
 * compartilham a MESMA instância de dados.
 */

// ---- PRNG determinístico (mulberry32) --------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---- Silhueta do naipe (validada em ASCII) ---------------------------------
const SPADE = {
  scale: 8.2,        // unidades de mundo por unidade normalizada
  yOffset: 0.277,    // centraliza o centroide no origin
  depth: 1.6,        // jitter em Z (profundidade)
  lobeR: 0.62,
  lobeCx: 0.52,
  lobeCy: -0.34,
  apex: [0, 1.25],
  shoulderX: 1.02,
  shoulderY: -0.3,
}

function inCircle(x, y, cx, cy, r) {
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const s = (x1, y1, x2, y2, x3, y3) =>
    (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3)
  const d1 = s(px, py, ax, ay, bx, by)
  const d2 = s(px, py, bx, by, cx, cy)
  const d3 = s(px, py, cx, cy, ax, ay)
  const neg = d1 < 0 || d2 < 0 || d3 < 0
  const pos = d1 > 0 || d2 > 0 || d3 > 0
  return !(neg && pos)
}

function inStem(x, y) {
  if (y > -0.28 || y < -1.5) return false
  const t = (-y - 0.28) / (1.5 - 0.28)
  const w = 0.05 + t * t * 0.52
  return Math.abs(x) <= w
}

function insideSpade(x, y) {
  if (inCircle(x, y, -SPADE.lobeCx, SPADE.lobeCy, SPADE.lobeR)) return true
  if (inCircle(x, y, SPADE.lobeCx, SPADE.lobeCy, SPADE.lobeR)) return true
  if (
    inTriangle(
      x, y,
      SPADE.apex[0], SPADE.apex[1],
      -SPADE.shoulderX, SPADE.shoulderY,
      SPADE.shoulderX, SPADE.shoulderY
    )
  )
    return true
  if (inStem(x, y)) return true
  return false
}

// ---- Níveis: peso visual por hierarquia ------------------------------------
// size = raio do núcleo (mundo). brightness multiplica a cor (>1 = estoura no bloom).
export const LEVELS = [
  { key: 'CEO',          label: 'CEO',          count: 1,  size: 0.62, core: '#fff6de', halo: '#ffd27a', brightness: 3.0, haloScale: 3.2 },
  { key: 'Diretor',      label: 'Diretoria',    count: 5,  size: 0.46, core: '#ffe9bc', halo: '#ffcf7a', brightness: 2.3, haloScale: 3.0 },
  { key: 'Gerente',      label: 'Gerência',     count: 15, size: 0.37, core: '#ffe2c4', halo: '#ffbf80', brightness: 1.9, haloScale: 2.8 },
  { key: 'Coordenador',  label: 'Coordenação',  count: 30, size: 0.30, core: '#e6ecff', halo: '#9fb6ff', brightness: 1.5, haloScale: 2.6 },
  { key: 'Especialista', label: 'Especialistas',count: 40, size: 0.24, core: '#d3dcf7', halo: '#8fa2d8', brightness: 1.2, haloScale: 2.4 },
  { key: 'Equipe',       label: 'Equipe',       count: 59, size: 0.19, core: '#c6d0ee', halo: '#7f93c9', brightness: 0.95, haloScale: 2.2 },
]

// ---- Vocabulário para nomes/cargos -----------------------------------------
const FIRST = [
  'Ana','Bruno','Carla','Diego','Eduarda','Felipe','Gabriela','Henrique','Isabela',
  'João','Karina','Lucas','Mariana','Nathan','Olívia','Pedro','Rafaela','Thiago',
  'Vanessa','Rodrigo','Beatriz','Gustavo','Larissa','Mateus','Priscila','Vinícius',
  'Camila','André','Juliana','Leonardo','Fernanda','Marcelo','Patrícia','Renato',
  'Sofia','Daniel','Aline','Ricardo','Letícia','Bernardo',
]
const LAST = [
  'Silva','Souza','Oliveira','Santos','Pereira','Costa','Almeida','Ferreira',
  'Rodrigues','Gomes','Martins','Araújo','Barbosa','Ribeiro','Carvalho','Lima',
  'Teixeira','Moreira','Nunes','Mendes','Cardoso','Rocha','Dias','Freitas',
]
const DEPARTMENTS = ['Operações', 'Torneios', 'Produto & Tech', 'Marketing', 'Dados & Suporte']

const ROLE_POOL = {
  Especialista: ['Especialista', 'Analista Sênior', 'Especialista de Produto', 'Analista Pleno'],
  Equipe: ['Analista', 'Operador', 'Assistente', 'Analista Júnior'],
}

// ---- Geração ----------------------------------------------------------------
function build() {
  const rand = mulberry32(20260705)
  const pick = (arr) => arr[(rand() * arr.length) | 0]

  // 1) amostra 149 pontos dentro do naipe (o CEO vai no ápice, à parte)
  const pts = []
  let guard = 0
  while (pts.length < 149 && guard < 2_000_000) {
    guard++
    const x = (rand() * 2 - 1) * 1.5
    const y = rand() * (1.5 + 1.65) - 1.65
    if (insideSpade(x, y)) pts.push({ x, y })
  }
  // ordena do topo para a base → define a hierarquia por altura
  pts.sort((a, b) => b.y - a.y)

  // 2) monta a lista de níveis (CEO no ápice)
  const list = []
  const toWorld = (nx, ny) => ({
    x: nx * SPADE.scale,
    y: (ny + SPADE.yOffset) * SPADE.scale,
    z: (rand() * 2 - 1) * SPADE.depth,
  })

  // CEO
  {
    const p = toWorld(SPADE.apex[0], SPADE.apex[1] - 0.05)
    list.push({
      id: 0, levelIndex: 0, level: 'CEO',
      pos: [p.x, p.y, p.z],
      name: `${pick(FIRST)} ${pick(LAST)}`,
      role: 'CEO — Grupo Suprema',
      department: 'Executivo',
      team: 'Conselho',
      managerId: null,
    })
  }

  // demais níveis, consumindo os pontos ordenados por altura
  let cursor = 0
  for (let li = 1; li < LEVELS.length; li++) {
    const lvl = LEVELS[li]
    for (let k = 0; k < lvl.count; k++) {
      const np = pts[cursor++]
      const p = toWorld(np.x, np.y)
      list.push({
        id: list.length,
        levelIndex: li,
        level: lvl.key,
        pos: [p.x, p.y, p.z],
        name: `${pick(FIRST)} ${pick(LAST)}`,
        role: '',            // preenchido após departamentos
        department: '',
        team: '',
        managerId: -1,       // resolvido a seguir
      })
    }
  }

  // 3) índices por nível
  const byLevel = LEVELS.map((_, li) => list.filter((n) => n.levelIndex === li))

  // 4) managerId = nó mais próximo no nível imediatamente acima
  const dist2 = (a, b) => {
    const dx = a.pos[0] - b.pos[0]
    const dy = a.pos[1] - b.pos[1]
    return dx * dx + dy * dy
  }
  for (let li = 1; li < LEVELS.length; li++) {
    const above = byLevel[li - 1]
    for (const node of byLevel[li]) {
      let best = above[0]
      let bestD = Infinity
      for (const cand of above) {
        const d = dist2(node, cand)
        if (d < bestD) { bestD = d; best = cand }
      }
      node.managerId = best.id
    }
  }

  // 5) departamentos: diretores recebem um; descendentes herdam do gestor
  byLevel[1].forEach((dir, i) => {
    dir.department = DEPARTMENTS[i % DEPARTMENTS.length]
  })
  const byId = new Map(list.map((n) => [n.id, n]))
  for (let li = 2; li < LEVELS.length; li++) {
    for (const node of byLevel[li]) {
      const mgr = byId.get(node.managerId)
      node.department = mgr ? mgr.department : pick(DEPARTMENTS)
    }
  }

  // 6) cargos e times
  const ancestorOfLevel = (node, targetLi) => {
    let cur = node
    while (cur && cur.levelIndex > targetLi) cur = byId.get(cur.managerId)
    return cur
  }
  for (const node of list) {
    switch (node.level) {
      case 'CEO': break
      case 'Diretor':
        node.role = `Diretor(a) de ${node.department}`
        node.team = node.department
        break
      case 'Gerente':
        node.role = `Gerente de ${node.department}`
        node.team = node.department
        break
      case 'Coordenador':
        node.role = `Coordenador(a) — ${node.department}`
        node.team = `${node.department} · Coordenação`
        break
      case 'Especialista':
      case 'Equipe': {
        node.role = pick(ROLE_POOL[node.level])
        const coord = ancestorOfLevel(node, 3)
        node.team = coord ? `Time ${coord.name.split(' ')[0]}` : node.department
        break
      }
      default: break
    }
  }

  return { list, byLevel, byId, LEVELS, SPADE }
}

// ---- Memoização -------------------------------------------------------------
let _cache = null
export function getOrganization() {
  if (!_cache) _cache = build()
  return _cache
}

export default getOrganization
