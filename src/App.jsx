import { useEffect, useState } from 'react'
import Scene from './components/Scene'
import UI from './components/UI'
import { loadOrganization } from './data/organization'
import './styles/index.css'

/**
 * App — raiz da experiência.
 * Aguarda o carregamento de public/equipe.json (dados editáveis pelo RH)
 * antes de montar o WebGL; o fundo escuro segura o primeiro frame.
 */
export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadOrganization().then(() => setReady(true))
  }, [])

  // dissolve o splash (♠ pulsando do index.html) quando a cena monta
  useEffect(() => {
    if (!ready) return
    const splash = document.getElementById('splash')
    if (!splash) return
    splash.classList.add('done')
    const t = setTimeout(() => splash.remove(), 1000)
    return () => clearTimeout(t)
  }, [ready])

  if (!ready) return <div className="app-root" />

  return (
    <div className="app-root">
      <Scene />
      <UI />
    </div>
  )
}
