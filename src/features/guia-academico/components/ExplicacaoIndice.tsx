import { fontes } from '../data/fontes'
import type { IndiceAcademico } from '../models/types'

export default function ExplicacaoIndice({ indice: x }: { indice: IndiceAcademico }) {
  return <article className="guia-explicacao" aria-labelledby={x.id}>
    <h2 id={x.id} tabIndex={-1}>{x.sigla} — {x.nome}</h2>
    <h3>O que significa?</h3>
    {x.explicacao.map(p => <p key={p}>{p}</p>)}
    <h3>Para que serve?</h3><p>{x.finalidade}</p>
    <section className="guia-exemplo" aria-label={`Exemplo hipotético de ${x.sigla}`}>
      <h3>Como funciona? Um exemplo hipotético</h3>
      <p>{x.exemplo.contexto}</p>
      <ol>{x.exemplo.etapas.map(etapa => <li key={etapa}>{etapa}</li>)}</ol>
      <p><strong>{x.exemplo.conclusao}</strong></p>
    </section>
    <details className="guia-formula">
      <summary>Como é calculado? Ver fórmula e detalhes técnicos de {x.sigla}</summary>
      <p className="guia-notacao">{x.formula}</p>
      <p>{x.leituraFormula}</p>
      <dl className="guia-variaveis">{x.variaveis.map(v => <div key={v.simbolo}><dt>{v.simbolo}</dt><dd>{v.significado}</dd></div>)}</dl>
      <h3>Regras de inclusão e exclusão</h3>
      {x.detalhes.map(p => <p key={p}>{p}</p>)}
    </details>
    <h3>O que influencia o índice?</h3>
    <ul>{x.fatores.map(f => <li key={f}>{f}</li>)}</ul>
    <h3>Como interpretar?</h3>
    {x.interpretacao.map(p => <p key={p}>{p}</p>)}
    <h3>Dúvidas frequentes sobre {x.sigla}</h3>
    <div className="guia-duvidas">{x.duvidas.map(d => <details key={d.pergunta}><summary>{d.pergunta}</summary><p>{d.resposta}</p></details>)}</div>
    <p className="guia-fonte"><strong>Fonte oficial:</strong> <a href={fontes.regulamento.url}>Regulamento, art. {x.fonte.artigo} e Anexo I — {x.fonte.secao}</a>. Os cinco indicadores estão listados no art. 109.</p>
    <a href="#indices">Voltar aos cinco índices</a>
  </article>
}
