import { Component } from 'react'

/**
 * ErrorBoundary — rede de segurança: se o WebGL crashar (GPU antiga, driver,
 * contexto perdido), em vez de tela preta o usuário vê um cartão elegante
 * com o naipe e um botão de recarregar. Numa demo pro RH, isso é o que
 * separa "que pena, travou" de "deu um probleminha, recarregue".
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(err) {
    console.error('[Constelação] falha na cena 3D:', err)
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="fatal">
          <span className="fatal-mark">♠</span>
          <h1>A constelação não pôde abrir aqui</h1>
          <p>
            Seu navegador ou placa de vídeo não conseguiu iniciar a experiência 3D.
            Tente atualizar o navegador, ativar a aceleração de hardware ou abrir
            em outro dispositivo.
          </p>
          <button type="button" onClick={() => location.reload()}>
            Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
