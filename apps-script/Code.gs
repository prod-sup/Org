/**
 * Organograma Grupo Suprema — fonte de dados via Google Sheets
 * =============================================================
 * Publica a planilha como o JSON que o organograma consome, para o RH
 * editar numa planilha normal em vez de mexer no equipe.json.
 *
 * COMO USAR (uma vez só):
 * 1. Crie uma planilha Google com DUAS abas:
 *
 *    Aba "Pessoas" — colunas na linha 1 (use os que quiser; só as 4
 *    primeiras são obrigatórias):
 *      dept | name | role | level | nick | lead | vertical | vacant |
 *      photo | email | teams | since | bio | local
 *    - level: CEO, Diretor, Coordenador, Analista ou Assistente
 *    - lead: número da linha do gestor DENTRO do mesmo dept (0 = primeira
 *      pessoa daquele dept na planilha); vazio = reporta ao CEO mais próximo
 *    - vertical: "Poker", "SX", "Bet" ou combinações "Poker,Bet" (vazio = todas)
 *    - vacant: TRUE para vaga em aberto; photo: ex. fotos/brian.jpg
 *    - since/bio/local: opcionais, aparecem no card da pessoa
 *
 *    Aba "Areas" — colunas na linha 1:
 *      key | color | anchorX | anchorY | radius
 *    (copie os valores atuais do equipe.json para começar)
 *
 *    Aba "Config" (opcional) — pares chave/valor na coluna A/B:
 *      dominio_email | gruposuprema.com
 *
 * 2. Na planilha: Extensões → Apps Script → cole este arquivo → Salvar.
 * 3. Implantar → Nova implantação → tipo "App da web":
 *    - Executar como: você
 *    - Quem pode acessar: "Qualquer pessoa"
 *    → Implantar e copie a URL (termina em /exec).
 * 4. No repositório do organograma, edite docs/equipe.json e preencha:
 *      "fonte_remota": "https://script.google.com/macros/s/SEU_ID/exec"
 *    Pronto: o site passa a ler da planilha. Se a planilha falhar,
 *    ele volta sozinho para o equipe.json.
 */

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()

  const readSheet = (name) => {
    const sheet = ss.getSheetByName(name)
    if (!sheet) throw new Error('Aba não encontrada: ' + name)
    const rows = sheet.getDataRange().getValues()
    const headers = rows.shift().map((h) => String(h).trim())
    return rows
      .filter((r) => r.some((c) => c !== '' && c !== null))
      .map((r) => {
        const obj = {}
        headers.forEach((h, i) => {
          if (h && r[i] !== '' && r[i] !== null) obj[h] = r[i]
        })
        return obj
      })
  }

  const areas = readSheet('Areas').map((a) => ({
    key: String(a.key),
    color: String(a.color),
    anchor: [Number(a.anchorX), Number(a.anchorY)],
    radius: Number(a.radius),
  }))

  const people = readSheet('Pessoas').map((p) => {
    const person = {
      dept: String(p.dept),
      name: String(p.name),
      role: String(p.role),
      level: String(p.level),
    }
    if (p.nick) person.nick = String(p.nick)
    if (p.lead !== undefined && p.lead !== '') person.lead = Number(p.lead)
    if (p.vacant === true || String(p.vacant).toUpperCase() === 'TRUE') person.vacant = true
    if (p.photo) person.photo = String(p.photo)
    // vertical: coluna com "Poker", "SX", "Bet" ou combinações "Poker,Bet"
    if (p.vertical) {
      person.vertical = String(p.vertical)
        .split(/[,;/]/)
        .map((v) => v.trim())
        .filter(Boolean)
    }
    // campos ricos opcionais (aparecem no card)
    if (p.email) person.email = String(p.email)
    if (p.teams) person.teams = String(p.teams)
    if (p.since) person.since = String(p.since)
    if (p.bio) person.bio = String(p.bio)
    if (p.local) person.local = String(p.local)
    return person
  })

  const meta = {}
  try {
    const cfg = ss.getSheetByName('Config')
    if (cfg) {
      cfg.getDataRange().getValues().forEach((row) => {
        const k = String(row[0] || '').trim()
        if (k) meta[k] = row[1]
      })
    }
  } catch (e) {}

  return ContentService.createTextOutput(
    JSON.stringify({
      departments: areas,
      people: people,
      dominio_email: meta.dominio_email || undefined,
    })
  ).setMimeType(ContentService.MimeType.JSON)
}
