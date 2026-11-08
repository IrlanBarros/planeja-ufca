import { categoriasGlossario, notaLegenda, situacoesDisciplinas } from '../data/glossario'
import { fontes } from '../data/fontes'

export default function GlossarioAcademico() {
  return <section className="guia-glossario" aria-labelledby="glossario">
    <h2 id="glossario" tabIndex={-1}>Outras informações acadêmicas</h2>
    <p>Este glossário reúne conceitos do histórico. Eles não são outros índices oficiais de rendimento.</p>
    {categoriasGlossario.map(c => <details key={c.id}>
      <summary>{c.titulo}</summary>
      <dl>{c.termos.map(t => <div key={t.termo}><dt>{t.termo}</dt><dd>{t.explicacao}</dd></div>)}</dl>
      <p className="guia-fonte"><a href={fontes.regulamento.url}>{c.fonte}</a></p>
    </details>)}
    <details>
      <summary>Situação das disciplinas — legenda do histórico</summary>
      <p>{notaLegenda}</p>
      <dl>{situacoesDisciplinas.map(s => <div key={s.codigo}><dt>{s.codigo} — {s.nome}</dt><dd>{s.explicacao}</dd></div>)}</dl>
    </details>
  </section>
}
