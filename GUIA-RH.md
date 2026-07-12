# Guia do RH — mantendo a Constelação sem programar

A Constelação (o organograma 3D) pode ser mantida de **dois jeitos**. Escolha um.

---

## Opção A — Editar o arquivo `equipe.json` (simples, mas exige publicar)

O arquivo `public/equipe.json` tem todas as pessoas e áreas. Cada pessoa é uma
linha assim:

```json
{ "dept": "Produtos", "name": "Maria Silva", "role": "Analista", "level": "Analista", "lead": 0, "vertical": ["Poker"] }
```

Campos por pessoa:

| campo | obrigatório | o que é |
|-------|-------------|---------|
| `dept` | sim | área (tem que existir em `departments`) |
| `name` | sim | nome completo |
| `role` | sim | cargo |
| `level` | sim | `CEO`, `Diretor`, `Coordenador`, `Analista` ou `Assistente` |
| `nick` | não | apelido — aparece como "Nome (Apelido)" |
| `lead` | não | posição (0,1,2…) do gestor **dentro da mesma área**; vazio = reporta ao CEO |
| `vertical` | não | `["Poker"]`, `["SX"]`, `["Bet"]` ou combinações; vazio = todas |
| `vacant` | não | `true` para vaga em aberto (estrela apagada) |
| `photo` | não | ex. `"fotos/maria.jpg"` — suba a imagem na pasta `public/fotos/` |
| `email` | não | e-mail corporativo (senão é gerado de `nome.sobrenome@dominio`) |
| `teams` | não | link de chat do Teams (senão é gerado do e-mail) |
| `since` | não | ano de entrada — vira "Na Suprema desde 2023" |
| `bio` | não | frase curta sobre a pessoa |
| `local` | não | cidade/unidade |

Depois de editar, é preciso **publicar** (o Brian faz `git commit` + `git push`,
ou roda `npm run build`). O site atualiza em ~1 min.

---

## Opção B — Manter numa planilha Google (o RH atualiza sozinho, sem publicar)

Assim o RH edita uma **planilha comum** e o site atualiza sozinho — sem código,
sem deploy. Configuração única (~10 min):

1. Crie uma planilha Google com as abas **Pessoas** e **Areas** (e, opcional,
   **Config**). Os nomes das colunas estão no topo do arquivo
   `apps-script/Code.gs` — as 4 primeiras de "Pessoas" (dept, name, role, level)
   são obrigatórias; o resto é opcional.
2. Na planilha: **Extensões → Apps Script**, apague o conteúdo, cole o
   `apps-script/Code.gs` e **Salve**.
3. **Implantar → Nova implantação → App da web**:
   - *Executar como:* você
   - *Quem pode acessar:* **Qualquer pessoa**
   - Implante e **copie a URL** (termina em `/exec`).
4. Abra `public/equipe.json` e preencha só esta linha:
   ```json
   "fonte_remota": "https://script.google.com/macros/s/SEU_ID/exec"
   ```
   Publique uma vez. **Pronto.** A partir daí, mudanças na planilha aparecem no
   site sem publicar nada.

Se a planilha ficar fora do ar, o site volta sozinho para o `equipe.json` local —
nunca quebra.

---

## Dicas

- **Fotos** são o maior salto visual. Três formas no campo `photo`:
  1. **Link do Google Drive** (mais fácil): suba a foto no Drive, clique em
     Compartilhar → "Qualquer pessoa com o link", copie o link e cole na
     coluna `photo`. O site converte sozinho. Nenhum dev necessário.
  2. Qualquer **URL de imagem** (`https://…/foto.jpg`).
  3. Arquivo local em `public/fotos/maria.jpg` (exige publicar).
- **Novos na equipe**: preencha a coluna `since` (ex. `2025-01` ou `2025`).
  Quem entrou nos últimos 6 meses ganha um selo "novo" brilhante.
- **Insights**: o botão de gráfico (topo) mostra headcount por área/nível,
  nº de novos e tempo médio de casa (este último precisa da coluna `since`).
- **Telão/recepção**: o site se atualiza sozinho quando a planilha muda
  (checa a cada 5 min e recarrega quando está ocioso) — deixe numa TV e pronto.
- **Link direto**: `…/?p=maria-silva` abre o site já focado na pessoa;
  `…/?v=sx` abre direto na vertical SX. Ótimo para compartilhar no Teams.
- **Modo lista** (botão ☰ de linhas no topo) mostra um diretório imprimível
  (Ctrl+P gera um PDF limpo) e acessível a leitores de tela.
