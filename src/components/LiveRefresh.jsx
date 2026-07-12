import { useEffect } from 'react'
import { hasRemoteUpdate } from '../data/organization'

/**
 * LiveRefresh — mantém um telão/kiosk sempre atual: de tempos em tempos
 * verifica se a planilha mudou e, se mudou, recarrega a página. Só age com
 * a aba visível E ninguém interagindo há um tempo (não interrompe quem
 * está explorando). Sem fonte remota, fica inerte.
 */
const CHECK_EVERY = 5 * 60 * 1000 // 5 min
const IDLE_BEFORE_RELOAD = 45 * 1000 // 45 s sem interação

export default function LiveRefresh() {
  useEffect(() => {
    let lastInteraction = Date.now()
    const touch = () => (lastInteraction = Date.now())
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']
    events.forEach((ev) => window.addEventListener(ev, touch, { passive: true }))

    const id = setInterval(async () => {
      if (document.hidden) return
      const changed = await hasRemoteUpdate()
      if (!changed) return
      // espera um momento de ociosidade para não recarregar no meio de um clique
      const waitIdle = setInterval(() => {
        if (Date.now() - lastInteraction >= IDLE_BEFORE_RELOAD && !document.hidden) {
          clearInterval(waitIdle)
          location.reload()
        }
      }, 5000)
    }, CHECK_EVERY)

    return () => {
      clearInterval(id)
      events.forEach((ev) => window.removeEventListener(ev, touch))
    }
  }, [])

  return null
}
