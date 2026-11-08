import { useMemo, useRef, useState } from 'react'
import type { Curso, Turma } from '../../types'
import { encontrarConflitos, type ConflitoHorario } from '../../utils/conflitos'
import { alternativasSeguras } from '../recomendacoes/services/equivalencias'
import { analisarSituacao } from '../recomendacoes/services/situacaoCurricular'
import { duplicaExigencia } from '../recomendacoes/services/elegibilidade'
import { pertenceAoCurso, correspondeBusca, correspondenciasCurriculares, rotuloCurso, type TurmaCatalogo } from './catalogo'
import { gerarIdTurma } from './selecao'
import { type useReferenciaCurricular } from './useReferenciaCurricular'
import TurmaCard from './TurmaCard'

type Aba = 'meu-curso' | 'equivalentes' | 'outros-cursos'
type Filtro = 'todas' | 'disponiveis' | 'conflito' | 'selecionadas'
const ABAS: [Aba, string][] = [['meu-curso', 'Meu curso'], ['equivalentes', 'Equivalentes'], ['outros-cursos', 'Outros cursos']]
const FILTROS: [Filtro, string][] = [['todas', 'Todas'], ['disponiveis', 'Disponíveis'], ['conflito', 'Com conflito'], ['selecionadas', 'Selecionadas']]
const TAMANHO_PAGINA = 24

interface Props {
  cursoId: string
  periodo: string
  cursos: Curso[]
  catalogo: TurmaCatalogo[]
  selecionadas: Turma[]
  referencia: ReturnType<typeof useReferenciaCurricular>
  alternar: (turma: Turma, conflitos: ConflitoHorario[]) => void
  limparAviso: () => void
}

export default function SelecaoTurmas({ cursoId, periodo, cursos, catalogo, selecionadas, referencia, alternar, limparAviso }: Props) {
  const [aba, setAba] = useState<Aba>('meu-curso')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [cursoOferta, setCursoOferta] = useState('')
  const [limite, setLimite] = useState(TAMANHO_PAGINA)
  const botoes = useRef<(HTMLButtonElement | null)[]>([])
  const { estrutura, perfilCompativel } = referencia
  const cumpridas = useMemo(() => perfilCompativel && estrutura
    ? new Map([...analisarSituacao(perfilCompativel, estrutura.componentes, periodo)]
      .filter(([, situacao]) => situacao.cumprido).map(([codigo, situacao]) => [codigo, situacao.origem ?? 'Cumprimento registrado']))
    : new Map<string, string>(), [perfilCompativel, estrutura, periodo])
  const correspondencias = useMemo(() => new Map(catalogo.map(item => [item.id, correspondenciasCurriculares(item.turma, estrutura)])), [catalogo, estrutura])
  const idsSelecionadas = new Set(selecionadas.map(gerarIdTurma))
  const externas = catalogo.filter(item => !pertenceAoCurso(item, cursoId))
  const base = aba === 'meu-curso' ? catalogo.filter(item => pertenceAoCurso(item, cursoId))
    : aba === 'equivalentes' ? externas.filter(item => correspondencias.get(item.id)!.length > 0)
      : externas.filter(item => (!cursoOferta || pertenceAoCurso(item, cursoOferta))
        && (busca.trim() || cursoOferta || !correspondencias.get(item.id)!.length))
  const filtradas = base.filter(item => {
    if (!correspondeBusca(item, busca)) return false
    const selecionada = idsSelecionadas.has(item.id)
    const conflito = !selecionada && encontrarConflitos(item.turma, selecionadas).length > 0
    return filtro === 'disponiveis' ? !selecionada && !conflito && !item.divergente
      : filtro === 'conflito' ? conflito : filtro === 'selecionadas' ? selecionada : true
  })
  const visiveis = aba === 'meu-curso' ? filtradas : filtradas.slice(0, limite)
  // Cada turma física aparece uma vez, mesmo quando corresponde a várias exigências.
  const grupos = new Map<string, { titulo?: string; itens: TurmaCatalogo[] }>()
  for (const item of visiveis) {
    const principal = aba === 'equivalentes' ? correspondencias.get(item.id)?.[0]?.componente : undefined
    const chave = principal?.codigo ?? 'geral'
    const grupo = grupos.get(chave) ?? { titulo: principal ? `${principal.nome} — ${principal.codigo}` : undefined, itens: [] }
    grupo.itens.push(item)
    grupos.set(chave, grupo)
  }
  const compostas = estrutura?.componentes.filter(c => alternativasSeguras(c.equivalencias_expressao, c.equivalencias_codigos) === null).length ?? 0

  function atualizarResultados(operacao: () => void) {
    operacao()
    setLimite(TAMANHO_PAGINA)
    limparAviso()
  }
  function trocarAba(nova: Aba) {
    atualizarResultados(() => { setAba(nova); setBusca(''); setFiltro('todas'); setCursoOferta('') })
  }

  return <section aria-labelledby="turmas-titulo">
    <div className="turmas-titulo"><div><h2 id="turmas-titulo">Turmas disponíveis</h2></div></div>
    <div role="tablist" aria-label="Origem das turmas" className="abas-turmas">
      {ABAS.map(([id, nome], indice) => <button key={id} id={`aba-${id}`} role="tab" type="button"
        aria-selected={aba === id} aria-controls={`painel-${id}`} tabIndex={aba === id ? 0 : -1}
        ref={elemento => { botoes.current[indice] = elemento }} onClick={() => trocarAba(id)}
        onKeyDown={event => {
          const destino = event.key === 'ArrowRight' ? (indice + 1) % ABAS.length
            : event.key === 'ArrowLeft' ? (indice + ABAS.length - 1) % ABAS.length
              : event.key === 'Home' ? 0 : event.key === 'End' ? ABAS.length - 1 : null
          if (destino === null) return
          event.preventDefault()
          trocarAba(ABAS[destino][0]); botoes.current[destino]?.focus()
        }}>{nome}</button>)}
    </div>
    {ABAS.map(([id]) => <div key={id} role="tabpanel" id={`painel-${id}`} aria-labelledby={`aba-${id}`} hidden={aba !== id} tabIndex={0}>
      {aba === id && <>
        {aba === 'equivalentes' && <div className="referencia-curricular">
          <p role="status">{referencia.mensagem}</p>
          {referencia.opcoes.length > 0 && <div className="curso-selector"><label htmlFor="estrutura-oferta">Estrutura curricular de referência</label>
            <select id="estrutura-oferta" value={estrutura?.id ?? ''} onChange={e => atualizarResultados(() => referencia.escolher(e.target.value))}>
              {!estrutura && <option value="">Selecione o ID da matriz do histórico</option>}
              {referencia.opcoes.map(e => <option key={e.id} value={e.id}>{e.codigo} · {e.ano_criacao} · ID {e.id} · {e.status}</option>)}
            </select>
          </div>}
          <p className="selecao-ajuda">Correspondências da matriz para consulta, sem garantia de aproveitamento ou matrícula. Não são recomendações de pendências.</p>
          {compostas > 0 && <p className="selecao-ajuda">{compostas} regra(s) composta(s) ou ambígua(s) não são exibidas como equivalências individuais. Consulte essas ofertas em Outros cursos.</p>}
          {perfilCompativel?.equivalencias.length ? <p className="selecao-ajuda">Cumprimentos registrados no histórico valem naquele contexto; não autorizam automaticamente novos aproveitamentos.</p> : null}
        </div>}
        {aba === 'outros-cursos' && <>
          <p className="selecao-ajuda">Disciplinas de outros cursos podem ser adicionadas ao seu horário para planejamento. A inclusão no horário não garante autorização de matrícula nem aproveitamento na sua estrutura curricular.</p>
          <div className="curso-selector"><label htmlFor="curso-oferta">Curso de oferta</label>
            <select id="curso-oferta" value={cursoOferta} onChange={e => atualizarResultados(() => setCursoOferta(e.target.value))}>
              <option value="">Todos os cursos</option>
              {cursos.filter(c => c.id !== cursoId).map(c => <option key={c.id} value={c.id}>{rotuloCurso(c, cursos)}</option>)}
            </select>
          </div>
          <p className="selecao-ajuda">Equivalências identificadas ficam na aba Equivalentes. Pesquisar ou escolher um curso também as inclui nesta consulta.</p>
        </>}
        <div className="busca-container"><input type="search" className="campo-busca" aria-label="Buscar turmas"
          placeholder={aba === 'meu-curso' ? 'Buscar por código, disciplina ou docente...' : 'Buscar por código, disciplina, docente ou curso...'}
          value={busca} onChange={e => atualizarResultados(() => setBusca(e.target.value))} /></div>
        <div className="filtros-turmas">{FILTROS.map(([valor, nome]) => <button type="button" key={valor}
          className={filtro === valor ? 'filtro-ativo' : ''} aria-pressed={filtro === valor}
          onClick={() => atualizarResultados(() => setFiltro(valor))}>{nome}</button>)}</div>
        <p className="selecao-ajuda">Disponíveis indica ausência de conflito de horário conhecido; não confirma vagas livres.</p>
        <p role="status">{filtradas.length} de {base.length} turma(s) · {visiveis.length} exibida(s)</p>
        {filtradas.length === 0 && !(aba === 'equivalentes' && referencia.carregando) && <div className="nenhum-resultado">
          <strong>Nenhuma turma encontrada</strong><p>{aba === 'equivalentes' && !estrutura ? 'Consulte a situação da estrutura acima ou explore Outros cursos.' : 'Tente outro código, disciplina, docente, curso ou filtro.'}</p>
        </div>}
        {[...grupos].map(([chave, grupo]) => <div className="grupo-equivalencias" key={chave}>
          {grupo.titulo && <h3>{grupo.titulo}</h3>}
          <div className="lista-turmas">{grupo.itens.map(item => <TurmaCard key={item.id} item={item}
            selecionadas={selecionadas} mostrarOrigem={aba !== 'meu-curso'}
            optativa={estrutura?.componentes.some(c => c.codigo === item.turma.codigo && c.tipo === 'optativa') ?? false}
            correspondencias={aba === 'equivalentes' ? correspondencias.get(item.id) : undefined} cumpridas={cumpridas}
            duplicacao={estrutura ? duplicaExigencia(item.turma, selecionadas, estrutura.componentes) : false} alternar={alternar} />)}</div>
        </div>)}
        {aba !== 'meu-curso' && filtradas.length > limite && <button className="botao-exportar mostrar-mais" type="button" onClick={() => setLimite(limite + TAMANHO_PAGINA)}>Mostrar mais turmas ({filtradas.length - limite} restantes)</button>}
      </>}
    </div>)}
  </section>
}
