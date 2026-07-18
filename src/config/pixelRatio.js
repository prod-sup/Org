/**
 * pixelRatio — mantém o uPixelRatio das camadas de partículas colado no DPR
 * REAL de renderização.
 *
 * gl_PointSize é medido em pixels do FRAMEBUFFER. Se o uniform ficar preso em
 * window.devicePixelRatio (o DPR do monitor) enquanto o canvas renderiza no DPR
 * do degrau, o sprite sai proporcionalmente maior na tela — num notebook DPR
 * 1.5 que desce para o T3 (0.9), cada partícula ocupa 1.7× o tamanho pretendido
 * e ~2.8× o custo de fill. Isso anula justamente o corte de resolução, que é o
 * primeiro degrau de economia do sistema de qualidade.
 *
 * Lendo o DPR do renderer a cada quadro o tamanho aparente fica constante em
 * pixels de CSS: o degrau baixa a resolução e a partícula acompanha, em vez de
 * inchar. Vale também para o AdaptiveDpr, que mexe no DPR sem passar por React.
 */
import { useFrame } from '@react-three/fiber'

/** Sincroniza materialRef.current.uniforms.uPixelRatio com o DPR do renderer. */
export function useSyncPixelRatio(materialRef) {
  useFrame(({ gl }) => {
    const u = materialRef.current?.uniforms?.uPixelRatio
    if (!u) return
    const dpr = gl.getPixelRatio()
    if (u.value !== dpr) u.value = dpr
  })
}
