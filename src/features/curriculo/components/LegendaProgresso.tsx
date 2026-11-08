import { EXPLICACOES_ESTADO, ROTULOS_ESTADO } from '../models/types'
import type { EstadoVisual } from '../models/types'

export default function LegendaProgresso() {
  return <section className="curriculo-legenda" aria-label="Legenda das situações">
    <h3>Como ler seu currículo</h3>
    <ul>{(Object.keys(ROTULOS_ESTADO) as EstadoVisual[]).map(estado => <li key={estado}>
      <span className={`curriculo-situacao estado-${estado}`}>{ROTULOS_ESTADO[estado]}</span> {EXPLICACOES_ESTADO[estado]}
    </li>)}</ul>
  </section>
}
