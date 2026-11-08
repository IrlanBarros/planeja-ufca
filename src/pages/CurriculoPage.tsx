import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { CursoIndiceCurriculo, DadosCursos, DadosCurriculoCurso, IndiceCurriculos } from '../types'
import { useHistorico } from '../features/historico/hooks/context'
import { identificarCurso, identificarEstrutura } from '../features/historico/integracaoCurricular'
import { calcularProgresso } from '../features/curriculo/services/progressoCurricular'
import { agruparComponentes, prepararExportacao } from '../features/curriculo/services/prepararExportacao'
import type { ModoCurriculo } from '../features/curriculo/models/types'
import SeletorModoCurriculo from '../features/curriculo/components/SeletorModoCurriculo'
import ResumoProgresso from '../features/curriculo/components/ResumoProgresso'
import LegendaProgresso from '../features/curriculo/components/LegendaProgresso'
import ComponenteCurriculoCard from '../features/curriculo/components/ComponenteCurriculoCard'
import ExportacaoCurriculo from '../features/curriculo/components/ExportacaoCurriculo'
import '../App.css'
import './CurriculoPage.css'
import { carregarJsonPublico } from '../data/publicJson'

interface Catalogo {
  cursoId: string
  curso?: CursoIndiceCurriculo
  cursos?: CursoIndiceCurriculo[]
  dados?: DadosCurriculoCurso
  periodo?: string | null
  erro?: string
}

export default function CurriculoPage() {
  const [params, setParams] = useSearchParams()
  const cursoId = params.get('curso')
  const { perfil, carregando: lendoPerfil } = useHistorico()
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [confirmacao, setConfirmacao] = useState<{ chavePerfil: string; estrutura: string } | null>(null)
  const [agora] = useState(() => new Date())

  useEffect(() => {
    const controller = new AbortController()
    const id = cursoId ?? ''
    const json = carregarJsonPublico
    async function carregar(): Promise<Catalogo> {
      if (!id) {
        const indice = await json<IndiceCurriculos>('/data/curriculos/index.json')
        return { cursoId: id, cursos: indice.cursos }
      }
      // A falha da oferta afeta somente a referência temporal, sem bloquear a matriz.
      const [indice, oferta] = await Promise.allSettled([
        json<IndiceCurriculos>('/data/curriculos/index.json'), json<DadosCursos>('/data/cursos-atual.json'),
      ])
      if (indice.status === 'rejected') throw indice.reason
      const curso = indice.value.cursos.find(c => c.id === id)
      if (!curso) throw new Error('Curso não encontrado.')
      if (!curso.disponivel || !curso.arquivo) return { cursoId: id, curso, erro: 'Estrutura curricular ainda não disponível para este curso.' }
      const dados = await json<DadosCurriculoCurso>(`/data/curriculos/${curso.arquivo}`)
      if (dados.curso_id !== id) throw new Error('O arquivo curricular não corresponde ao ID do curso. Confira o catálogo público.')
      return { cursoId: id, curso, cursos: indice.value.cursos, dados, periodo: oferta.status === 'fulfilled' && /^\d{4}\.[12]$/.test(oferta.value.periodo) ? oferta.value.periodo : null }
    }
    carregar().then(dados => { if (!controller.signal.aborted) setCatalogo(dados) }).catch(e => {
      if (!controller.signal.aborted) setCatalogo({ cursoId: id, erro: e instanceof Error ? e.message : 'Não foi possível carregar a estrutura curricular.' })
    })
    return () => controller.abort()
  }, [cursoId])

  const carregando = !!cursoId && catalogo?.cursoId !== cursoId
  const atual = !carregando ? catalogo : null
  const estruturas = [...(atual?.dados?.estruturas ?? [])].sort((a, b) => b.ano_criacao - a.ano_criacao)
  const cursoPerfil = perfil ? identificarCurso(perfil, atual?.cursos ?? []).curso : undefined
  const chavePerfil = perfil ? JSON.stringify([perfil.importadoEm, perfil.curso.idCurso, perfil.curso.estruturaCurricular]) : null
  const estruturaConfirmada = confirmacao?.chavePerfil === chavePerfil ? confirmacao?.estrutura ?? null : null
  const vinculo = perfil ? identificarEstrutura(perfil, estruturas, estruturaConfirmada) : null
  const proprioCurso = cursoPerfil?.id === cursoId
  const solicitada = params.get('estrutura')
  const estrutura = solicitada ? estruturas.find(e => e.id === solicitada) : (proprioCurso ? vinculo?.estrutura : undefined) ?? estruturas[0]
  const compativel = !!perfil && proprioCurso && !!vinculo?.estrutura && estrutura?.id === vinculo.estrutura.id
  const modo: ModoCurriculo = params.get('modo') === 'progresso' && compativel && !lendoPerfil ? 'progresso' : 'original'
  const perfilAssociado = perfil && cursoPerfil ? { ...perfil, curso: { ...perfil.curso, idCurso: cursoPerfil.id } } : null
  const progresso = modo === 'progresso' && perfilAssociado && estrutura ? calcularProgresso(perfilAssociado, estrutura, cursoId!, atual?.periodo ?? null, agora) : null
  const exportacao = estrutura && atual?.curso ? prepararExportacao({ modo, curso: atual.curso, cursos: atual.cursos ?? [], estrutura, estruturas, perfil, periodoReferencia: atual.periodo, estruturaConfirmada, agora }) : null

  function alterarModo(novo: ModoCurriculo) {
    const proximo = new URLSearchParams(params)
    proximo.set('modo', novo)
    if (estrutura) proximo.set('estrutura', estrutura.id)
    setParams(proximo, { replace: true })
  }
  function selecionarEstrutura(id: string) {
    const proximo = new URLSearchParams(params)
    proximo.set('estrutura', id); proximo.set('modo', 'original')
    setParams(proximo, { replace: true })
  }

  return <main className="container curriculo-page">
    <header className="curriculo-page-header"><div><span className="curriculo-page-eyebrow">Planeja UFCA</span><h1>Estrutura curricular</h1>
      {atual?.curso && <p className="curriculo-curso-nome">{atual.curso.nome}</p>}
    </div><Link className="link-voltar" to="/">Voltar para Meu Horário</Link></header>
    <p>Consulte as estruturas curriculares da UFCA, com disciplinas obrigatórias e optativas, cargas horárias e pré-requisitos. Você pode consultar e exportar a matriz original sem importar um histórico.</p>
    {!cursoId && <section aria-labelledby="escolher-curso"><h2 id="escolher-curso">Escolha seu curso</h2>
      <p>Selecione um curso para consultar suas matrizes. Com um histórico compatível, também é possível acompanhar seu progresso acadêmico localmente.</p>
      {!catalogo && <p role="status">Carregando cursos…</p>}
      <ul>{atual?.cursos?.filter(c => c.disponivel).map(c => <li key={c.id}><Link to={`/curriculo?curso=${encodeURIComponent(c.id)}`}>{c.nome} · ID {c.id}</Link></li>)}</ul>
      <Link to="/">Consultar turmas e montar meu horário</Link>
    </section>}
    {carregando && <p role="status">Carregando estrutura curricular…</p>}
    {atual?.erro && <p className="erro" role="alert">{atual.erro}</p>}
    {atual?.dados && !estrutura && <p role="alert">{solicitada ? 'A estrutura solicitada não foi encontrada neste curso.' : 'Nenhuma estrutura curricular disponível.'}</p>}
    {estrutura && atual?.curso && exportacao && <section className="estrutura-curricular">
      <div className="estrutura-curricular-cabecalho">
        <h2>Matriz curricular</h2>
        <div className="curriculo-controles">
          <div className="estrutura-selector"><label htmlFor="estrutura">Estrutura</label><select id="estrutura" value={estrutura.id} onChange={e => selecionarEstrutura(e.target.value)}>
            {estruturas.map((e, i) => <option key={e.id} value={e.id}>{e.codigo} · {e.ano_criacao} · ID {e.id}{i === 0 ? ' (mais recente)' : ''}</option>)}
          </select></div>
          <SeletorModoCurriculo modo={modo} personalizadoDisponivel={compativel && !lendoPerfil} alterar={alterarModo} />
        </div>
        <p>Matriz {estrutura.codigo} · criada em {estrutura.ano_criacao} · {estrutura.quantidade_obrigatorias} obrigatórias · {estrutura.quantidade_optativas} optativas</p>
        <ExportacaoCurriculo key={`${modo}-${estrutura.id}-${perfil?.importadoEm ?? 'publico'}`} dados={exportacao} />
      </div>
      {lendoPerfil ? <p role="status">Verificando perfil acadêmico neste navegador…</p> : !perfil ? <aside className="curriculo-aviso" id="curriculo-vinculo-aviso">
        <p>Importe seu histórico acadêmico para visualizar quais disciplinas você já concluiu e acompanhar seu progresso na graduação.</p><Link to="/historico">Importar meu histórico</Link>
      </aside> : !compativel && <aside className="curriculo-aviso" id="curriculo-vinculo-aviso">
        <p>{!proprioCurso ? 'O perfil não corresponde com segurança a este curso.' : vinculo?.candidatas.length === 0 ? 'A matriz registrada no histórico não foi encontrada neste catálogo.' : vinculo && vinculo.candidatas.length > 1 && !vinculo.estrutura ? 'Há mais de uma matriz com o código do histórico. Confirme explicitamente a estrutura vinculada ao documento.' : 'Esta estrutura é diferente da vinculada ao seu histórico.'} A consulta e a exportação originais continuam disponíveis.</p>
        {proprioCurso && vinculo && vinculo.candidatas.length > 1 && !vinculo.estrutura && vinculo.candidatas.map(e => <button key={e.id} type="button" onClick={() => { setConfirmacao({ chavePerfil: chavePerfil!, estrutura: e.id }); selecionarEstrutura(e.id) }}>Confirmar matriz {e.codigo} · ID {e.id} · {e.ano_criacao}</button>)}
        <Link to="/historico">Conferir meu histórico</Link>
      </aside>}
      {progresso && <><ResumoProgresso progresso={progresso} componentes={estrutura.componentes} emitidoEm={perfil!.emitidoEm} periodoReferencia={atual.periodo ?? null} /><LegendaProgresso /></>}
      <div className="niveis-curriculo">{agruparComponentes(exportacao.linhas).map(grupo => <section className="nivel-curriculo" key={grupo.titulo} aria-label={grupo.titulo}>
        <h3>{grupo.titulo}</h3>
        {grupo.titulo === 'Optativas' && <p>Alternativas de escolha. A carga horária optativa exigida é a registrada oficialmente no histórico; não é necessário cursar todas as opções.</p>}
        <div className="componentes-curriculo">{grupo.linhas.map(({ componente }) => <ComponenteCurriculoCard key={componente.codigo} componente={componente} situacao={progresso?.situacoes.get(componente.codigo)} />)}</div>
      </section>)}</div>
    </section>}
    <p className="curriculo-nota">Projeto independente. A plataforma não substitui a validação curricular oficial da UFCA. <Link to="/privacidade">Privacidade e controle dos dados</Link>.</p>
  </main>
}
