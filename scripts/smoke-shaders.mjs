/**
 * Smoke test de shaders — o `vite build` NÃO compila GLSL: erro de shader só
 * aparece em runtime (tela preta). Este script abre a página num Chromium
 * headless e FALHA se o console acusar erro de compilação/linkagem WebGL.
 *
 * Uso:
 *   npm run dev            (num terminal)
 *   npm run smoke          (noutro; ou `node scripts/smoke-shaders.mjs <url>`)
 *
 * Requer playwright:  npm i -D playwright && npx playwright install chromium
 */
let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.error(
    'playwright não instalado.\n  npm i -D playwright && npx playwright install chromium'
  )
  process.exit(2)
}

const url = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })

const errors = []
page.on('console', (msg) => {
  const t = msg.text()
  if (/THREE\.WebGLProgram|Shader Error|VALIDATE_STATUS|Invalid uniform|WebGL: INVALID/i.test(t)) {
    errors.push(t)
  }
})
page.on('pageerror', (e) => errors.push(`pageerror: ${e}`))

console.log(`abrindo ${url} …`)
await page.goto(url, { waitUntil: 'networkidle' })

// deixa a intro rodar e exercita os caminhos de shader: hover (onda nas
// linhas), troca de vertical (morph/máscara/burst) e volta
await page.waitForTimeout(11000)
await page.mouse.move(700, 450)
await page.mouse.move(950, 480, { steps: 20 })
await page.waitForTimeout(800)
for (const label of ['SX', 'BET', 'POKER']) {
  const btn = page.getByRole('button', { name: new RegExp(label, 'i') }).first()
  if (await btn.count()) await btn.click()
  await page.waitForTimeout(2200)
}

await browser.close()
if (errors.length) {
  console.error('✗ ERROS DE SHADER/WEBGL:\n' + errors.map((e) => `  ${e}`).join('\n'))
  process.exit(1)
}
console.log('✓ smoke ok — nenhum erro de shader/WebGL no console')
