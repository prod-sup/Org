/**
 * Organograma REAL do Grupo Suprema — cada área vive como um aglomerado
 * (cluster) dentro do naipe de espadas (♠), com o coordenador no centro
 * e o time orbitando ao redor.
 *
 * Estrutura de cada nó:
 *   { id, name, role, department, levelIndex, level, pos, managerId, vacant }
 *
 * É memoizado: todos os componentes compartilham a MESMA instância.
 */

import { SPADE_SHAPE, insideSpade, toWorld as shapeToWorld } from './spadeShape.js'

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

// ---- Níveis: peso visual por hierarquia ------------------------------------
// size = raio do núcleo (mundo). brightness multiplica a cor (>1 = estoura no bloom).
// pulse = respiração da estrela: quanto mais alto o nível, mais lenta e ampla
export const LEVELS = [
  { key: 'CEO',         label: 'CEO',          size: 0.30,  core: '#ffedc9', halo: '#ffd27a', brightness: 2.8, haloScale: 4.0, pulse: { speed: 0.45, amp: 0.11 } },
  { key: 'Diretor',     label: 'Diretoria',    size: 0.225, core: '#ffe6b8', halo: '#ffcf7a', brightness: 2.3, haloScale: 3.4, pulse: { speed: 0.6, amp: 0.09 } },
  { key: 'Coordenador', label: 'Coordenação',  size: 0.175, core: '#ffdfa6', halo: '#f2b968', brightness: 1.9, haloScale: 3.0, pulse: { speed: 0.8, amp: 0.075 } },
  { key: 'Analista',    label: 'Analistas & Líderes', size: 0.115, core: '#f0d497', halo: '#d9a85e', brightness: 1.35, haloScale: 2.4, pulse: { speed: 1.15, amp: 0.06 } },
  { key: 'Assistente',  label: 'Assistentes',  size: 0.09,  core: '#e0c28a', halo: '#a8834e', brightness: 1.0, haloScale: 2.0, pulse: { speed: 1.5, amp: 0.05 } },
]
const LI = { CEO: 0, Diretor: 1, Coordenador: 2, Analista: 3, Assistente: 4 }

// nível → índice, tolerante a espaços, acentos, gênero e sinônimos vindos da
// planilha ("Analista ", "Diretora", "Líder", "Coord."). Desconhecido = Assistente.
const LEVEL_ALIAS = {
  ceo: 0, ceo_sx: 0, presidente: 0,
  diretor: 1, diretora: 1, diretoria: 1, director: 1,
  coordenador: 2, coordenadora: 2, coordenacao: 2, coord: 2, gestor: 2, gestora: 2,
  analista: 3, lider: 3, leader: 3, especialista: 3, pleno: 3, senior: 3,
  assistente: 4, assistant: 4, estagiario: 4, estagiaria: 4, junior: 4, trainee: 4,
}
function levelIndexOf(raw) {
  const k = String(raw || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
  if (LEVEL_ALIAS[k] !== undefined) return LEVEL_ALIAS[k]
  // pega a primeira palavra conhecida (ex.: "coordenador de produtos")
  for (const w of k.split(/\s+/)) if (LEVEL_ALIAS[w] !== undefined) return LEVEL_ALIAS[w]
  return 4
}

// ---- Departamentos: cor + posição do aglomerado no naipe --------------------
// anchor em coordenadas normalizadas do naipe (x ±1.13 · y de −1.38 a 1.0)
export const DEPARTMENTS = [
  { key: 'Executivo',   color: '#ffe9b8', anchor: [0.0, 0.68],   radius: 0.15 },
  { key: 'Produtos',    color: '#ffd27a', anchor: [-0.55, -0.42], radius: 0.32 },
  { key: 'Security',    color: '#7fa4ff', anchor: [0.50, 0.05],  radius: 0.20 },
  { key: 'Comercial',   color: '#f5a05a', anchor: [-0.50, 0.05], radius: 0.19 },
  { key: 'Marketing',   color: '#c39be0', anchor: [0.58, -0.48], radius: 0.26 },
  { key: 'RH',          color: '#8fd6a8', anchor: [0.0, 0.30],   radius: 0.14 },
  { key: 'Atendimento', color: '#7fd6d0', anchor: [0.0, -0.18],  radius: 0.20 },
  { key: 'Compliance',  color: '#e89aa4', anchor: [0.0, -1.00],  radius: 0.13 },
]

// ---- Pessoas reais ----------------------------------------------------------
// lead: índice (dentro do dept) do gestor direto. null = reporta ao Executivo.
const PEOPLE = [
  // Executivo — os três CEOs no ápice do naipe
  { dept: 'Executivo', name: 'Vasco Tavares',    role: 'CEO', level: 'CEO', vertical: ['Poker'] },
  { dept: 'Executivo', name: 'Rafael Silva',     nick: 'Rafa', role: 'CEO', level: 'CEO', vertical: ['Poker'] },
  { dept: 'Executivo', name: 'Eber Coutinho',    role: 'CEO', level: 'CEO', vertical: ['Poker'] },
  // Suprema SX — liderança própria da vertical ♦
  { dept: 'Executivo', name: 'Lanza',             role: 'CEO SX', level: 'CEO', vertical: ['SX'] },
  { dept: 'Executivo', name: 'Fábio Makoto',     role: 'Diretor SX', level: 'Diretor', lead: 3, vertical: ['SX'] },

  // Produtos
  { dept: 'Produtos', name: 'Bruno Larotonda',  nick: 'Lala', role: 'Coordenador de Produtos', level: 'Coordenador', vertical: ['Poker'] },
  { dept: 'Produtos', name: 'Felipe Augusto',   role: 'Analista de Produtos',   level: 'Analista',   lead: 0, vertical: ['Poker'] },
  { dept: 'Produtos', name: 'Brian Laureano',   role: 'Assistente de Produtos', level: 'Assistente', lead: 0, vertical: ['Poker'] },
  { dept: 'Produtos', name: 'Kelly Souza',      role: 'Assistente de Produtos', level: 'Assistente', lead: 0, vertical: ['Poker'] },
  { dept: 'Produtos', name: 'Matheus Menassi',  role: 'Assistente de Produtos', level: 'Assistente', lead: 0, vertical: ['Poker'] },
  { dept: 'Produtos', name: 'Isabela Uguetto',  role: 'Assistente de Produtos', level: 'Assistente', lead: 0, vertical: ['Poker'] },
  { dept: 'Produtos', name: 'Thalia Candido',   role: 'Assistente de Produtos', level: 'Assistente', lead: 0, vertical: ['Poker'] },
  { dept: 'Produtos', name: 'Gabriele Risquini',role: 'Assistente de Produtos', level: 'Assistente', lead: 0, vertical: ['Poker'] },
  { dept: 'Produtos', name: 'Lidia Ferreira',   role: 'Assistente de Produtos', level: 'Assistente', lead: 0, vertical: ['Poker'] },
  { dept: 'Produtos', name: 'Vitoria Polisel',  role: 'Assistente de Produtos', level: 'Assistente', lead: 0, vertical: ['Poker'] },
  { dept: 'Produtos', name: 'Thainã Martins',   role: 'Assistente de Produtos', level: 'Assistente', lead: 0, vertical: ['Poker'] },
  { dept: 'Produtos', name: 'Gabriel Carlos',   role: 'Assistente de Produtos', level: 'Assistente', lead: 0, vertical: ['Poker'] },

  // Security
  { dept: 'Security', name: 'Frederyk Matos',   nick: 'Fred', role: 'Coordenador de Security', level: 'Coordenador', vertical: ['Poker'] },
  { dept: 'Security', name: 'Douglas Ferreira', role: 'Analista de Dados Security', level: 'Analista', lead: 0, vertical: ['Poker'] },
  { dept: 'Security', name: 'Jose Wolff',       role: 'Analista de Security', level: 'Analista', lead: 0, vertical: ['Poker'] },
  { dept: 'Security', name: 'Bruno Padilha',    nick: 'Zang', role: 'Analista de Security', level: 'Analista', lead: 0, vertical: ['Poker'] },
  { dept: 'Security', name: 'Harles Henrique',  role: 'Analista de Security', level: 'Analista', lead: 0, vertical: ['Poker'] },

  // Comercial
  { dept: 'Comercial', name: 'Marcelo Ascenção', role: 'Coordenador Comercial', level: 'Coordenador', vertical: ['Poker'] },
  { dept: 'Comercial', name: 'Wellington Alves', role: 'Analista de Dados Comercial', level: 'Analista', lead: 0, vertical: ['Poker'] },
  { dept: 'Comercial', name: 'Karen Lopes',      role: 'Analista Comercial', level: 'Analista', lead: 0, vertical: ['Poker'] },
  { dept: 'Comercial', name: 'Talles Lima',      role: 'Assistente Comercial', level: 'Assistente', lead: 0, vertical: ['Poker'] },

  // Marketing
  { dept: 'Marketing', name: 'Julia Gonçalves',  role: 'Diretora de Criação', level: 'Diretor', vertical: ['Poker'] },
  { dept: 'Marketing', name: 'Rafaella Correa',  role: 'Coordenadora de Marketing', level: 'Coordenador', lead: 0, vertical: ['Poker'] },
  { dept: 'Marketing', name: 'Debora Bresqui',   role: 'Analista de Marketing', level: 'Analista', lead: 1, vertical: ['Poker'] },
  { dept: 'Marketing', name: 'Cristian Brisola', role: 'Designer Gráfico', level: 'Analista', lead: 1, vertical: ['Poker'] },
  { dept: 'Marketing', name: 'Gustavo Gebaili',  role: 'Designer Pleno', level: 'Analista', lead: 1, vertical: ['Poker'] },
  { dept: 'Marketing', name: 'Caroline Manfré',  role: 'Redatora', level: 'Analista', lead: 1, vertical: ['Poker'] },
  { dept: 'Marketing', name: 'Rayssa Riordana',  role: 'Social Media', level: 'Analista', lead: 1, vertical: ['Poker'] },

  // RH
  { dept: 'RH', name: 'Marcus Alves',     role: 'Coordenador de RH', level: 'Coordenador', vertical: ['Poker'] },
  { dept: 'RH', name: 'Daniela Siqueira', role: 'Analista de RH', level: 'Analista', lead: 0, vertical: ['Poker'] },
  { dept: 'RH', name: 'Karina Teodoro',   role: 'Assistente de RH', level: 'Assistente', lead: 0, vertical: ['Poker'] },

  // Atendimento
  { dept: 'Atendimento', name: 'Roberto Proença',  role: 'Coordenador de Atendimento', level: 'Coordenador', vertical: ['Poker'] },
  { dept: 'Atendimento', name: 'Lindsey Nomina',   role: 'Líder de Atendimento', level: 'Analista', lead: 0, vertical: ['Poker'] },
  { dept: 'Atendimento', name: 'Felipe Bernardes', role: 'Líder de Atendimento', level: 'Analista', lead: 0, vertical: ['Poker'] },
  { dept: 'Atendimento', name: 'Maria Clara',      role: 'Assistente de Atendimento', level: 'Assistente', lead: 1, vertical: ['Poker'] },
  { dept: 'Atendimento', name: 'Julia Lais',       role: 'Assistente de Atendimento', level: 'Assistente', lead: 2, vertical: ['Poker'] },

  // Compliance
  { dept: 'Compliance', name: 'Bruna Roque',    role: 'Coordenadora de Compliance', level: 'Coordenador', vertical: ['Poker'] },
  { dept: 'Compliance', name: 'Camila Ladeira', role: 'Analista de Compliance', level: 'Analista', lead: 0, vertical: ['Poker'] },
]

// ---- Layout: aglomerado por departamento ------------------------------------
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

function clampInside(x, y, ax, ay) {
  // recua em direção à âncora até cair dentro do naipe
  for (let k = 0; k < 24; k++) {
    if (insideSpade(x, y)) return [x, y]
    x = ax + (x - ax) * 0.88
    y = ay + (y - ay) * 0.88
  }
  return [ax, ay]
}

// e-mail corporativo: usa o campo "email" da pessoa; sem ele, gera
// primeiro.ultimo@dominio (dominio_email do equipe.json)
function emailFor(p, domain) {
  if (p.email) return p.email
  const parts = p.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const user = parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0]
  return `${user}@${domain}`
}

// "entrou há pouco?" — interpreta since ("2024", "2024-03", "03/2024",
// "2024-03-15", "15/03/2024") e marca quem entrou nos últimos ~180 dias.
function parseSince(since) {
  if (!since) return null
  const s = String(since).trim()
  let d = null
  let m
  if ((m = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/))) d = new Date(+m[1], +m[2] - 1, +(m[3] || 1))
  else if ((m = s.match(/^(\d{1,2})\/(\d{4})$/))) d = new Date(+m[2], +m[1] - 1, 1)
  else if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) d = new Date(+m[3], +m[2] - 1, +m[1])
  else if ((m = s.match(/^(\d{4})$/))) d = new Date(+m[1], 0, 1)
  return d && !isNaN(d) ? d : null
}
function isRecent(since, days = 180) {
  const d = parseSince(since)
  if (!d) return false
  const diff = (Date.now() - d.getTime()) / 86400000
  return diff >= 0 && diff <= days
}

// tempo de casa em anos (para o painel de insights); null se não há data
export function tenureYears(since) {
  const d = parseSince(since)
  if (!d) return null
  return Math.max(0, (Date.now() - d.getTime()) / (365.25 * 86400000))
}

// assinatura leve dos dados — para detectar mudança na planilha (auto-refresh)
function signatureOf(people) {
  let h = 0
  const str = (people || [])
    .map((p) => `${p.dept}|${p.name}|${p.role}|${p.level}|${p.vacant ? 1 : 0}`)
    .join('~')
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return `${(people || []).length}:${h}`
}

// slug estável a partir do nome (para o link direto ?p=brian-laureano)
function slugify(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// duas pessoas dividem alguma vertical? (sem campo = atua em todas)
function sharesVertical(a, b) {
  if (!a.verticals || !b.verticals) return true
  return a.verticals.some((v) => b.verticals.includes(v))
}

// valida o equipe.json em desenvolvimento e aponta erros comuns de quem
// edita o arquivo (dept inexistente, level inválido, lead fora da faixa).
// Silencioso em produção — nunca quebra a experiência.
function validate(src) {
  if (!import.meta.env.DEV) return
  const deptKeys = new Set(src.departments.map((d) => d.key))
  const LEVEL_KEYS = new Set(['CEO', 'Diretor', 'Coordenador', 'Analista', 'Assistente'])
  const VERTS = new Set(['Poker', 'SX', 'Bet'])
  const perDept = new Map()
  src.people.forEach((p) => perDept.set(p.dept, (perDept.get(p.dept) || 0) + 1))
  const warn = (msg) => console.warn(`[equipe.json] ${msg}`)
  src.people.forEach((p) => {
    if (!p.name) warn('pessoa sem "name"')
    if (!deptKeys.has(p.dept)) warn(`"${p.name}": dept "${p.dept}" não existe em departments`)
    if (!LEVEL_KEYS.has(p.level)) warn(`"${p.name}": level "${p.level}" inválido (use CEO/Diretor/Coordenador/Analista/Assistente)`)
    if (p.lead != null && (p.lead < 0 || p.lead >= (perDept.get(p.dept) || 0)))
      warn(`"${p.name}": lead ${p.lead} fora da faixa do dept "${p.dept}"`)
    if (Array.isArray(p.vertical))
      p.vertical.forEach((v) => { if (!VERTS.has(v)) warn(`"${p.name}": vertical "${v}" desconhecida (Poker/SX/Bet)`) })
  })
}

function build(src) {
  validate(src)
  const rand = mulberry32(20260706)
  const emailDomain = src.dominio_email || 'gruposuprema.com'
  const departments = src.departments
  const deptByKey = new Map(departments.map((d) => [d.key, d]))

  // agrupa por departamento preservando a ordem
  const groups = new Map()
  src.people.forEach((p) => {
    if (!groups.has(p.dept)) groups.set(p.dept, [])
    groups.get(p.dept).push(p)
  })

  const list = []
  const idOf = new Map() // pessoa → id global

  for (const [deptKey, members] of groups) {
    const dept = deptByKey.get(deptKey)
    const [ax, ay] = dept.anchor

    // líder do aglomerado (maior nível) fica no centro; demais em espiral áurea
    const sorted = [...members].map((p, i) => ({ p, i }))
    sorted.sort((a, b) => levelIndexOf(a.p.level) - levelIndexOf(b.p.level) || a.i - b.i)

    if (deptKey === 'Executivo') {
      // CEOs Poker em triângulo no ápice; liderança SX logo abaixo
      const slots = [[0, 0.10], [-0.11, -0.07], [0.11, -0.07], [-0.05, 0.22], [0.09, 0.22], [0, -0.20]]
      sorted.forEach(({ p, i }, k) => {
        const [dx, dy] = slots[k % slots.length]
        const [x, y] = clampInside(ax + dx, ay + dy, ax, ay)
        placeNode(p, i, x, y, 0.15)
      })
    } else {
      sorted.forEach(({ p, i }, k) => {
        if (k === 0) {
          placeNode(p, i, ax, ay, 0.35)
          return
        }
        const ring = Math.sqrt(k / (sorted.length - 1)) * dept.radius
        const angle = k * GOLDEN + rand() * 0.5
        let x = ax + Math.cos(angle) * ring
        let y = ay + Math.sin(angle) * ring * 0.92
        ;[x, y] = clampInside(x, y, ax, ay)
        placeNode(p, i, x, y, 0.45)
      })
    }

    function placeNode(p, localIndex, nx, ny, zJitter) {
      const w = shapeToWorld(nx, ny, (rand() * 2 - 1) * SPADE_SHAPE.depth * zJitter)
      const node = {
        id: list.length,
        levelIndex: levelIndexOf(p.level),
        level: LEVELS[levelIndexOf(p.level)].key, // canônico (CEO/Diretor/…)
        pos: [w.x, w.y, w.z],
        name: p.nick ? `${p.name} (${p.nick})` : p.name,
        role: p.role,
        department: deptKey,
        color: dept.color,
        vacant: !!p.vacant,
        photo: p.photo || null,
        // verticais em que atua (Poker/SX/Bet); null = todas
        verticals: Array.isArray(p.vertical) && p.vertical.length ? p.vertical : null,
        email: emailFor(p, emailDomain),
        teams: p.teams || `https://teams.microsoft.com/l/chat/0/0?users=${emailFor(p, emailDomain)}`,
        // campos ricos opcionais do equipe.json (aparecem no card se existirem)
        since: p.since || null,   // ano/data de entrada — vira "Na Suprema desde …"
        isNew: isRecent(p.since), // entrou nos últimos ~180 dias
        bio: p.bio || null,       // frase curta
        local: p.local || null,   // cidade/unidade
        slug: slugify(p.nick || p.name), // para link direto ?p=…
        managerId: -1,
        _lead: p.lead,
        _localIndex: localIndex,
      }
      list.push(node)
      idOf.set(`${deptKey}:${localIndex}`, node.id)
    }
  }

  // slugs únicos: nomes repetidos recebem -2, -3, … (link direto sem ambiguidade)
  const slugSeen = new Map()
  list.forEach((n) => {
    const base = n.slug || `pessoa-${n.id}`
    const count = (slugSeen.get(base) || 0) + 1
    slugSeen.set(base, count)
    n.slug = count === 1 ? base : `${base}-${count}`
  })

  // ---- gestores --------------------------------------------------------------
  const byId = new Map(list.map((n) => [n.id, n]))
  const vascoId = list.find((n) => n.name.startsWith('Vasco'))?.id ?? 0
  const ceoIds = list.filter((n) => n.level === 'CEO').map((n) => n.id)

  for (const node of list) {
    if (node.level === 'CEO') {
      node.managerId = null
      continue
    }
    if (node._lead !== undefined && node._lead !== null) {
      node.managerId = idOf.get(`${node.department}:${node._lead}`) ?? vascoId
    } else {
      // líderes de área reportam ao CEO mais próximo DA MESMA vertical
      let best = vascoId
      let bestD = Infinity
      for (const cid of ceoIds) {
        const c = byId.get(cid)
        if (!sharesVertical(c, node)) continue
        const d = (c.pos[0] - node.pos[0]) ** 2 + (c.pos[1] - node.pos[1]) ** 2
        if (d < bestD) { bestD = d; best = cid }
      }
      node.managerId = best
    }
    delete node._lead
    delete node._localIndex
  }

  // ---- conexões ---------------------------------------------------------------
  const links = []
  // hierarquia
  for (const node of list) {
    if (node.managerId !== null && node.managerId >= 0) {
      links.push({ a: node.managerId, b: node.id, type: 'hierarchy' })
    }
  }
  // os CEOs entre si (conselho) — tipo próprio, mais luminoso
  for (let i = 0; i < ceoIds.length; i++) {
    for (let j = i + 1; j < ceoIds.length; j++) {
      if (!sharesVertical(byId.get(ceoIds[i]), byId.get(ceoIds[j]))) continue
      links.push({ a: ceoIds[i], b: ceoIds[j], type: 'council' })
    }
  }
  // estratégicas: coordenadores/diretores de áreas diferentes, pares mais curtos
  {
    const heads = list.filter((n) => n.levelIndex === 1 || n.levelIndex === 2)
    const pairs = []
    for (let i = 0; i < heads.length; i++) {
      for (let j = i + 1; j < heads.length; j++) {
        if (heads[i].department === heads[j].department) continue
        if (!sharesVertical(heads[i], heads[j])) continue
        const d =
          (heads[i].pos[0] - heads[j].pos[0]) ** 2 +
          (heads[i].pos[1] - heads[j].pos[1]) ** 2
        pairs.push({ a: heads[i].id, b: heads[j].id, d })
      }
    }
    pairs.sort((p, q) => p.d - q.d)
    for (const p of pairs.slice(0, 10)) {
      links.push({ a: p.a, b: p.b, type: 'strategic' })
    }
  }

  const byLevel = LEVELS.map((_, li) => list.filter((n) => n.levelIndex === li))
  const deptWithMembers = departments
    .filter((d) => d.key !== 'Executivo')
    .map((d) => ({
      ...d,
      members: list.filter((n) => n.department === d.key),
    }))

  const bySlug = new Map(list.map((n) => [n.slug, n]))

  return {
    list, byLevel, byId, bySlug, links, LEVELS, SPADE: SPADE_SHAPE,
    departments: deptWithMembers, departmentsAll: departments, ceoIds,
  }
}

// ---- Carregamento -----------------------------------------------------------
// Os dados vivem em public/equipe.json (o RH edita lá, sem tocar em código).
// PEOPLE/DEPARTMENTS acima são o fallback caso o fetch falhe.
let _cache = null
let _sig = null       // assinatura dos dados em uso (auto-refresh)
let _remoteUrl = null // URL da planilha, se estiver alimentando o site

const isValid = (j) => j && Array.isArray(j.people) && Array.isArray(j.departments)

// ---- Leitura direta de uma planilha Google (sem Apps Script) ----------------
// Basta a planilha estar "Qualquer pessoa com o link · Leitor" e ter as abas
// "Pessoas" e "Areas" (colunas descritas no GUIA-RH.md). Lê via endpoint gviz
// (CSV) que aceita CORS; nenhuma publicação de script é necessária.

function isGoogleSheet(url) {
  return /docs\.google\.com\/spreadsheets\//.test(url)
}

// Conserta acentuação duplamente codificada ("FÃ¡bio" → "Fábio"): comum
// quando se cola texto UTF-8 numa planilha por um app que assume Windows-1252.
// Só age quando há a assinatura do erro E os bytes formam UTF-8 válido —
// texto já correto passa intacto.
function fixMojibake(s) {
  if (typeof s !== 'string' || !/[ÃÂ][\x80-\xBF]/.test(s)) return s
  try {
    const bytes = Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff)
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return s
  }
}

function sheetId(url) {
  return url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || null
}

// Lê uma aba pelo endpoint gviz JSON. `headers=1` é ESSENCIAL: sem ele o
// gviz adivinha quantas linhas são cabeçalho e às vezes engole as primeiras
// pessoas (nomes que "parecem" cabeçalho). O JSON é tipado e sem as
// ambiguidades de aspas/vírgula do CSV.
async function fetchTab(id, tab) {
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(tab)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`aba "${tab}" inacessível (${res.status})`)
  const text = await res.text()
  const s = text.indexOf('{')
  const e = text.lastIndexOf('}')
  if (s < 0 || e < 0) throw new Error(`resposta inesperada da aba "${tab}"`)
  const data = JSON.parse(text.slice(s, e + 1))
  const cols = (data.table?.cols || []).map((c) => fixMojibake(String(c.label || c.id || '').trim()))
  const cell = (v) => {
    if (v == null) return ''
    return typeof v === 'string' ? fixMojibake(v.trim()) : v
  }
  return (data.table?.rows || [])
    .map((r) => {
      const o = {}
      ;(r.c || []).forEach((c, i) => {
        const h = cols[i]
        const v = c ? cell(c.v) : ''
        if (h && v !== '' && v != null) o[h] = v
      })
      return o
    })
    .filter((o) => Object.keys(o).length > 0)
}

async function loadFromSheet(url) {
  const id = sheetId(url)
  if (!id) throw new Error('URL de planilha inválida')
  const [pessoas, areasRaw] = await Promise.all([
    fetchTab(id, 'Pessoas'),
    fetchTab(id, 'Areas').catch(() => null), // Areas é opcional
  ])
  const truthy = (v) => v === true || /^(true|sim|x|1)$/i.test(String(v).trim())
  const people = pessoas.map((p) => {
    const person = { dept: String(p.dept), name: String(p.name), role: String(p.role), level: String(p.level) }
    if (p.nick) person.nick = String(p.nick)
    if (p.lead !== undefined && String(p.lead).trim() !== '') person.lead = Number(p.lead)
    if (truthy(p.vacant)) person.vacant = true
    if (p.photo) person.photo = String(p.photo)
    if (p.vertical) person.vertical = String(p.vertical).split(/[,;/]/).map((v) => v.trim()).filter(Boolean)
    ;['email', 'teams', 'since', 'bio', 'local'].forEach((k) => { if (p[k]) person[k] = String(p[k]) })
    return person
  })
  // O layout visual (posição/cor/tamanho de cada área) mora no código; a aba
  // Areas apenas SOBREPÕE o que estiver preenchido. Assim o RH não precisa
  // mexer em coordenadas — e células vazias herdam o padrão embutido.
  const embedded = new Map(DEPARTMENTS.map((d) => [d.key, d]))
  const num = (v, fb) => {
    const n = Number(String(v).replace(',', '.')) // aceita vírgula decimal (pt-BR)
    return Number.isFinite(n) ? n : fb
  }
  // a aba Areas define a ORDEM/quais áreas aparecem; se não houver aba válida,
  // usa as áreas embutidas. Áreas citadas por pessoas mas ausentes entram no fim.
  const validAreas = Array.isArray(areasRaw)
    ? areasRaw.filter((a) => a.key && (a.color || embedded.has(fixMojibake(String(a.key)))))
    : []
  const departments = []
  const seenDept = new Set()
  const pushDept = (key, a) => {
    const k = fixMojibake(String(key)).trim()
    if (!k || seenDept.has(k)) return
    seenDept.add(k)
    const base = embedded.get(k) || { color: '#c9a45e', anchor: [0, 0], radius: 0.2 }
    departments.push({
      key: k,
      color: (a && a.color) ? String(a.color) : base.color,
      anchor: a
        ? [num(a.anchorX, base.anchor[0]), num(a.anchorY, base.anchor[1])]
        : base.anchor,
      radius: a ? num(a.radius, base.radius) : base.radius,
    })
  }
  if (validAreas.length) validAreas.forEach((a) => pushDept(a.key, a))
  else DEPARTMENTS.forEach((d) => pushDept(d.key, null))
  // garante que toda área citada por alguém exista (nunca quebra o build)
  people.forEach((p) => { if (!seenDept.has(String(p.dept).trim())) pushDept(p.dept, null) })

  return { departments, people }
}

// constrói com blindagem: qualquer erro (dado remoto malformado, dept
// desconhecido, etc.) volta para o fallback embutido em vez de quebrar a tela
function buildSafe(src, label) {
  try {
    return build(src)
  } catch (e) {
    console.warn(`[Constelação] falha ao montar ${label} — usando dados embutidos:`, e?.message || e)
    return build({ departments: DEPARTMENTS, people: PEOPLE })
  }
}

export async function loadOrganization() {
  if (_cache) return _cache
  let local = null
  let remote = null
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}equipe.json`, { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      if (isValid(json)) local = json

      // fonte remota — se configurada e válida, tem prioridade; qualquer
      // falha cai de volta para o equipe.json local (nunca quebra):
      //   • URL de planilha Google  → lida direto (abas Pessoas/Areas)
      //   • URL /exec do Apps Script → JSON já pronto
      if (json?.fonte_remota) {
        if (isGoogleSheet(json.fonte_remota)) _remoteUrl = json.fonte_remota
        try {
          const rjson = isGoogleSheet(json.fonte_remota)
            ? await loadFromSheet(json.fonte_remota)
            : await (await fetch(json.fonte_remota, { cache: 'no-store' })).json()
          // só assume a fonte remota se ela realmente tiver gente — uma
          // planilha válida porém VAZIA (só cabeçalho) não pode apagar o time
          if (isValid(rjson) && rjson.people.length > 0) remote = rjson
          else if (isGoogleSheet(json.fonte_remota))
            console.warn('[Constelação] planilha sem linhas de dados — usando equipe.json local')
        } catch (e) {
          console.warn('[Constelação] fonte remota indisponível — usando equipe.json local:', e?.message || e)
        }
      }
    }
  } catch {
    // sem rede/arquivo — usa os dados embutidos
  }

  // tenta a planilha; se o build dela falhar, cai pro local; se esse também
  // falhar, cai pros dados embutidos — a tela NUNCA fica presa no splash
  if (remote) {
    try {
      _cache = build(remote)
      _sig = signatureOf(remote.people)
      return _cache
    } catch (e) {
      console.warn('[Constelação] planilha malformada — usando equipe.json local:', e?.message || e)
    }
  }
  const used = local ?? { departments: DEPARTMENTS, people: PEOPLE }
  _cache = buildSafe(used, 'equipe.json')
  _sig = signatureOf(used.people)
  return _cache
}

// auto-refresh do kiosk: a planilha mudou desde o carregamento?
// Retorna false silenciosamente se não há fonte remota ou se falhar.
export async function hasRemoteUpdate() {
  if (!_remoteUrl || !_sig) return false
  try {
    const rjson = await loadFromSheet(_remoteUrl)
    if (!isValid(rjson) || rjson.people.length === 0) return false
    return signatureOf(rjson.people) !== _sig
  } catch {
    return false
  }
}

export function getOrganization() {
  if (!_cache) throw new Error('getOrganization() antes de loadOrganization() — App.jsx aguarda o carregamento')
  return _cache
}

export default getOrganization
