import type { IndiceAcademico } from '../models/types'

export default function IndiceCard({ indice }: { indice: IndiceAcademico }) {
  return <article className="guia-card">
    <span className="guia-sigla">{indice.sigla}</span>
    <h3>{indice.nome}</h3>
    <p>{indice.resumo}</p>
    <a href={`#${indice.id}`} aria-label={`Entender melhor ${indice.sigla}`}>Entender melhor <span aria-hidden="true">→</span></a>
  </article>
}
