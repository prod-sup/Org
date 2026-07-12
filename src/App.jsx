import { useEffect, useMemo, useState } from 'react'
import Scene from './components/Scene'
import UI from './components/UI'
import ErrorBoundary from './components/ErrorBoundary'
import LiveRefresh from './components/LiveRefresh'
import { loadOrganization } from './data/organization'
import './styles/index.css'

/** WebGL disponível nesta máquina? (sem isso, o Canvas montaria e crasharia) */
function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

/**
 * App — raiz da experiência.
 * Aguarda o carregamento de public/equipe.json (dados editáveis pelo RH)
 * antes de montar o WebGL; o fundo escuro segura o primeiro frame.
 * Se não houver WebGL, mostra um fallback em vez de tela preta.
 */
export default function App() {
  const [ready, setReady] = useState(false)
  const webglOk = useMemo(hasWebGL, [])

  useEffect(() => {
    loadOrganization().then(() => setReady(true))
  }, [])

  // dissolve o splash (♠ pulsando do index.html) quando a cena monta
  useEffect(() => {
    if (!ready && webglOk) return
    const splash = document.getElementById('splash')
    if (!splash) return
    splash.classList.add('done')
    const t = setTimeout(() => splash.remove(), 1000)
    return () => clearTimeout(t)
  }, [ready, webglOk])

  if (!webglOk) {
    return (
      <div className="fatal">
        <span className="fatal-mark">♠</span>
        <h1>A constelação precisa de aceleração 3D</h1>
        <p>
          Este navegador está sem WebGL. Ative a aceleração de hardware nas
          configurações do navegador ou abra em outro dispositivo para explorar
          a constelação do Grupo Suprema.
        </p>
      </div>
    )
  }

  if (!ready) return <div className="app-root" />

  return (
    <ErrorBoundary>
      <div className="app-root">
        <Scene />
        <UI />
        <LiveRefresh />
      </div>
    </ErrorBoundary>
  )
}
