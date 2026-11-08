import type { Turma } from '../../types'
import SalasTurma from '../../components/SalasTurma'
import { encontrarConflitos, type ConflitoHorario } from '../../utils/conflitos'
import { possuiSalasPorEncontro } from '../../utils/salas'
import { gerarIdTurma } from './selecao'
import { type CorrespondenciaCurricular, type TurmaCatalogo } from './catalogo'

interface Props {
  item: TurmaCatalogo
  selecionadas: Turma[]
  optativa: boolean
  mostrarOrigem: boolean
  correspondencias?: CorrespondenciaCurricular[]
  cumpridas: Map<string, string>
  duplicacao: boolean
  alternar: (turma: Turma, conflitos: ConflitoHorario[]) => void
}

export default function TurmaCard({ item, selecionadas, optativa, mostrarOrigem, correspondencias = [], cumpridas, duplicacao, alternar }: Props) {
  const { turma, id } = item
  const selecionada = selecionadas.some(t => gerarIdTurma(t) === id)
  const conflitos = selecionada ? [] : encontrarConflitos(turma, selecionadas)
  const bloqueada = !selecionada && (conflitos.length > 0 || item.divergente)
  return <article aria-label={`${turma.codigo} — ${turma.disciplina} · turma ${turma.turma}`} className={[
    'turma-card', optativa && 'optativa-card', selecionada && 'selecionada-card', conflitos.length > 0 && 'conflito-card',
  ].filter(Boolean).join(' ')}>
    <div className="turma-cabecalho">
      <div className="turma-identificacao"><span className="codigo">{turma.codigo}</span>
        {optativa && <span className="badge-optativa">Optativa</span>}
        {mostrarOrigem && <span className="badge-origem">Outro curso</span>}
      </div><span>Turma {turma.turma}</span>
    </div>
    <h3>{turma.disciplina}</h3>
    {mostrarOrigem && <p><strong>{item.cursos.length > 1 ? 'Ofertada nos agrupamentos de:' : 'Curso de oferta:'}</strong>{' '}
      {item.cursos.map(c => `${c.nome} (${c.id})`).join(' / ')}</p>}
    {correspondencias.length > 0 && <div className="correspondencias-turma"><strong>{correspondencias.every(c => c.tipo === 'mesmo-componente') ? 'Componente da matriz:' : 'Equivalente a:'}</strong>
      <ul>{correspondencias.map(({ componente, tipo }) => <li key={componente.codigo}>
        {componente.codigo} — {componente.nome}{' '}
        <span className="badge-origem">{tipo === 'mesmo-componente' ? 'Mesmo componente' : 'Equivalente curricular'}</span>
        <small>{tipo === 'mesmo-componente' ? 'Mesmo código curricular ofertado em outro agrupamento.' : 'Equivalência individual prevista na matriz selecionada.'}</small>
        {cumpridas.has(componente.codigo) && <small>Já cumprida: {cumpridas.get(componente.codigo)}. Consulta manual, sem recomendação de cursar novamente.</small>}
      </li>)}</ul>
    </div>}
    <p><strong>Docente:</strong> {turma.docente || 'Não informado'}</p>
    <p><strong>Horário:</strong> {turma.horario_sigaa || 'Não informado'}</p>
    {!possuiSalasPorEncontro(turma) && <div className="horarios">{turma.horarios.map((h, i) =>
      <span className="horario" key={`${h.dia}|${h.inicio}|${h.fim}|${i}`}>{h.dia_nome}: {h.inicio}–{h.fim}</span>)}</div>}
    <SalasTurma turma={turma} />
    {!turma.horarios.length && <p className="selecao-ajuda">Horário não informado; confirme a compatibilidade antes da matrícula.</p>}
    {duplicacao && !selecionada && <p className="selecao-ajuda">Possível duplicação acadêmica: uma turma já selecionada contempla a mesma exigência pela matriz. A seleção manual permite consultar ambas.</p>}
    {item.divergente && <p className="erro">Os dados desta turma divergem entre agrupamentos. A inclusão depende de correção do catálogo público.</p>}
    {conflitos.length > 0 && <div className="conflito-card-aviso"><strong>⚠ Conflito de horário</strong>
      {conflitos.map((c, i) => <p key={`${gerarIdTurma(c.turma)}|${i}`}>Conflita com <strong>{c.turma.disciplina}</strong> na {c.diaNome}, das {c.inicio} às {c.fim}.</p>)}
    </div>}
    <button type="button" className={selecionada ? 'botao-remover' : bloqueada ? 'botao-bloqueado' : 'botao-adicionar'}
      aria-disabled={bloqueada} onClick={() => { if (!item.divergente || selecionada) alternar(turma, conflitos) }}>
      {selecionada ? 'Remover do horário' : item.divergente ? 'Dados divergentes' : conflitos.length ? 'Indisponível por conflito' : 'Adicionar ao horário'}
    </button>
  </article>
}
