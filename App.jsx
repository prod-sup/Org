import Scene from './components/Scene'
import UI from './components/UI'
import './styles/index.css'

/**
 * App — raiz da experiência.
 * WebGL (Scene) preenche a tela; a UI minimalista fica por cima.
 */
export default function App() {
  return (
    <div className="app-root">
      <Scene />
      <UI />
    </div>
  )
}
