import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CursoIndiceCurriculo, DadosCursos, EstruturaCurricular, Turma } from '../types'
import type { HistoricoAcademico } from '../features/historico/models/types'
import { useHistorico } from '../features/historico/hooks/context'
import { useHorario } from '../features/horarios/context'
import { gerarIdTurma } from '../features/horarios/selecao'
import { PREFERENCIAS_INICIAIS } from '../features/recomendacoes/models/types'
import type { CategoriaRecomendacao } from '../features/recomendacoes/models/types'
import { useRecomendacoes } from '../features/recomendacoes/hooks/useRecomendacoes'
import { gerarRecomendacoes } from '../features/recomendacoes/services/recomendador'
import { validarInclusao } from '../features/recomendacoes/services/planejamento'
import PreferenciasPlanejamento from '../features/recomendacoes/components/PreferenciasPlanejamento'
import ResumoRecomendacoes from '../features/recomendacoes/components/ResumoRecomendacoes'
import RecomendacaoCard from '../features/recomendacoes/components/RecomendacaoCard'
import { fontes } from '../features/guia-academico/data/fontes'
import '../App.css'
import './RecomendacoesPage.css'

const CATEGORIAS: [CategoriaRecomendacao, string][] = [
  ['recomendadas', 'Recomendadas agora'], ['menor-prioridade', 'Disponíveis, mas com menor prioridade'],
  ['requisitos', 'Dependem de requisitos'], ['sem-oferta', 'Sem oferta identificada'], ['confirmacao', 'Precisam de confirmação'],
]

function PlanejamentoCarregado({ perfil, curso, estrutura, oferta }: { perfil: HistoricoAcademico; curso: CursoIndiceCurriculo; estrutura: EstruturaCurricular; oferta: DadosCursos }) {
  const [preferencias, setPreferencias] = useState(PREFERENCIAS_INICIAIS)
  const [agora] = useState(() => new Date())
  const [mensagem, setMensagem] = useState<string | null>(null)
  const { selecionadas, adicionar, remover } = useHorario(oferta.periodo, curso.id, oferta.cursos.flatMap(c => c.turmas))
  const perfilAssociado = { ...perfil, curso: { ...perfil.curso, idCurso: curso.id } }
  const resultado = gerarRecomendacoes({ perfil: perfilAssociado, estrutura, oferta, cursoId: curso.id, preferencias, selecionadas, agora })
  function incluir(novas: Turma[]) {
    const erro = validarInclusao(novas, selecionadas, perfilAssociado, estrutura, oferta.periodo, preferencias, resultado.itens) ?? adicionar(novas)
    setMensagem(erro ?? `${novas.length} turma(s) adicionada(s) ao seu horário de ${curso.nome}, ${oferta.periodo}.`)
  }
  return <>
    <ResumoRecomendacoes perfil={perfil} periodo={oferta.periodo} resultado={resultado} />
    {resultado.avisos.length > 0 && <aside className="planejador-aviso" aria-label="Limitações dos dados"><ul>{resultado.avisos.map(a => <li key={a}>{a}</li>)}</ul></aside>}
    <PreferenciasPlanejamento preferencias={preferencias} alterar={p => { setPreferencias(p); setMensagem('Recomendações atualizadas com suas preferências.') }} />
    <section className="planejador-painel" aria-labelledby="conjunto-titulo"><h2 id="conjunto-titulo">Seu conjunto sugerido</h2>
      <p>{resultado.plano.length} turma(s) para acrescentar · {resultado.cargaPlanejada}h identificadas no total, incluindo seu horário atual · Meta: {preferencias.cargaHoraria}h.</p>
      {resultado.plano.length ? <><ul>{resultado.plano.map(t => <li key={gerarIdTurma(t)}>{t.codigo} — {t.disciplina} · turma {t.turma}</li>)}</ul><button className="planejador-primario" onClick={() => incluir(resultado.plano)}>Adicionar conjunto sugerido ao meu horário</button></> : <p>Nenhum conjunto adicional compatível com as regras conhecidas e suas preferências. Consulte as categorias abaixo.</p>}
      <p className="planejador-ajuda">Seleção heurística sem conflitos, dentro da carga pretendida. Correquisitos pendentes são incluídos juntos quando há combinação compatível. A menor quantidade de dias não é garantida.</p>
    </section>
    <p role="status" aria-live="polite">{mensagem}</p>
    <section className="planejador-painel"><h2>Turmas já no seu horário</h2>
      {selecionadas.length ? <ul className="planejador-selecionadas">{selecionadas.map(t => <li key={gerarIdTurma(t)}><span>{t.codigo} — {t.disciplina} · turma {t.turma}</span><button onClick={() => { remover(t); setMensagem(`${t.codigo} removida do horário.`) }}>Remover {t.codigo}</button></li>)}</ul> : <p>Nenhuma turma selecionada para este curso e período.</p>}
      <Link to={`/?curso=${curso.id}`}>Ver e exportar meu horário</Link>
    </section>
    {CATEGORIAS.map(([categoria, titulo]) => {
      const itens = resultado.itens.filter(i => i.categoria === categoria)
      return <details className="planejador-categoria" key={categoria} open={categoria === 'recomendadas'}><summary>{titulo} ({itens.length})</summary>
        {categoria === 'menor-prioridade' && <p>Alternativas elegíveis fora do conjunto sugerido. Confira conflitos, carga e preferências antes de incluir.</p>}
        {itens.length ? <div className="planejador-lista">{itens.map(item => <RecomendacaoCard key={item.componente.codigo} item={item} adicionar={t => incluir([t])} />)}</div> : <p>Nenhum componente nesta categoria.</p>}
      </details>
    })}
  </>
}

function Planejamento({ perfil }: { perfil: HistoricoAcademico }) {
  const [cursoConfirmado, setCursoConfirmado] = useState<string | null>(null)
  const [estruturaConfirmada, setEstruturaConfirmada] = useState<string | null>(null)
  const dados = useRecomendacoes(perfil, cursoConfirmado, estruturaConfirmada)
  if (!dados) return <p role="status">Consultando a matriz do histórico e a oferta pública…</p>
  if (dados.erro) return <section className="planejador-painel"><h2>Confirme os dados do planejamento</h2><p role="alert">{dados.erro}</p>
    {dados.cursosAmbiguos?.map(c => <p key={c.id}><button onClick={() => setCursoConfirmado(c.id)}>Confirmar curso {c.nome} · {c.id} ({c.modalidade})</button></p>)}
    {dados.estruturasAmbiguas?.map(e => <p key={e.id}><button onClick={() => setEstruturaConfirmada(e.id)}>Confirmar matriz {e.codigo} · ID {e.id} · {e.ano_criacao}</button></p>)}
    <Link to="/historico">Conferir ou atualizar meu histórico</Link></section>
  if (!dados.curso || !dados.estrutura || !dados.oferta) return null
  return <PlanejamentoCarregado perfil={perfil} curso={dados.curso} estrutura={dados.estrutura} oferta={dados.oferta} />
}

export default function RecomendacoesPage() {
  const { perfil, carregando } = useHistorico()
  return <main className="container planejador-page"><Link to="/">← Voltar aos horários</Link>
    <header><span className="planejador-ajuda">Seu Horário · UFCA</span><h1>Recomendações para seu semestre</h1><p>Descubra quais disciplinas fazem mais sentido para sua trajetória acadêmica.</p></header>
    {carregando ? <p role="status">Verificando o perfil acadêmico…</p> : perfil ? <Planejamento key={perfil.importadoEm} perfil={perfil} /> : <section className="planejador-painel"><h2>Comece pelo seu histórico</h2><p>As recomendações personalizadas dependem de um histórico acadêmico importado e conferido. O processamento acontece neste navegador.</p><Link to="/historico">Importar meu histórico acadêmico</Link><p><Link to="/">Continuar consultando horários e currículos públicos</Link></p></section>}
    <aside className="planejador-ajuda"><p>A oferta consultada não confirma vagas livres. As sugestões não garantem matrícula, aprovação ou prazo de formatura. Este projeto é independente da UFCA.</p>
      <p>Procedimentos de flexibilização de pré-requisitos dependem da análise institucional. A ferramenta não concede essas autorizações. <a href={fontes.regulamento.url} target="_blank" rel="noreferrer">Regulamento da graduação, arts. 72–75</a>.</p>
      <p>Histórico, preferências e recomendações são analisados localmente. Somente os catálogos públicos são consultados por GET. <Link to="/privacidade">Privacidade e controle dos dados</Link>.</p>
    </aside>
  </main>
}
