import type { Turma } from '../../../types'
import SalasTurma from '../../../components/SalasTurma'
import { gerarIdTurma } from '../../horarios/selecao'
import type { Recomendacao } from '../models/types'
import ExplicacaoRecomendacao from './ExplicacaoRecomendacao'

export default function RecomendacaoCard({ item, adicionar }: { item: Recomendacao; adicionar: (turma: Turma) => void }) {
  const c = item.componente
  const podeAdicionar = ['recomendadas', 'menor-prioridade'].includes(item.categoria) && item.coRequisitos.estado === 'satisfeito'
  return <article className="planejador-card" aria-label={`${c.codigo} — ${c.nome}`}>
    <div className="planejador-card-topo"><span className="planejador-etiqueta">{c.tipo === 'obrigatoria' ? 'Obrigatória' : 'Optativa'}</span><span>Prioridade {item.prioridade.toLowerCase()}</span></div>
    <h3>{c.codigo} — {c.nome}</h3><p>{c.carga_horaria}h · {c.nivel ? `${c.nivel}º nível recomendado` : 'Nível não informado'}</p>
    <ul>{item.fatores.slice(0, 3).map(f => <li key={f.criterio}>{f.motivo}</li>)}</ul>
    {item.advertencias.map(a => <p className="planejador-aviso" key={a}>{a}</p>)}
    {!item.ofertas.length && <p>Sem turma identificada nesta oferta.</p>}
    {item.ofertas.length > 0 && <details open={item.categoria === 'recomendadas'}><summary>{item.ofertas.length} alternativa(s) de turma</summary>
      {item.ofertas.map(o => <div className="planejador-turma" key={gerarIdTurma(o.turma)}>
        <strong>{o.turma.codigo} · Turma {o.turma.turma}</strong><p>{o.turma.docente}</p>
        <p>{o.origem === 'equivalente' ? 'Equivalente previsto para esta exigência' : o.origem === 'outro-agrupamento' ? 'Mesmo componente em outro agrupamento' : 'Componente da matriz'} · {o.cursoNome}</p>
        {o.turma.horarios.map((h, i) => <p key={i}>{h.dia_nome}, {h.inicio}–{h.fim}</p>)}<SalasTurma turma={o.turma} />
        {o.motivos.map(m => <p className="planejador-ajuda" key={m}>{m}</p>)}
        <button disabled={!podeAdicionar || !o.compativel} onClick={() => adicionar(o.turma)}>Adicionar {o.turma.codigo} · turma {o.turma.turma} ao meu horário</button>
      </div>)}
    </details>}
    <ExplicacaoRecomendacao item={item} />
  </article>
}
