import { useEffect, useMemo, useState } from 'react'
import type {
  Curso,
  DadosCursos,
  Turma,
} from './types'
import {
  encontrarConflitos,
  type ConflitoHorario,
} from './utils/conflitos'
import './App.css'
import GradeSemanal from './components/GradeSemanal'
import SalasTurma from './components/SalasTurma'
import { exportarHorarioCsv } from './utils/exportarCsv'
import { exportarHorarioPdf } from './utils/exportarPdf'
import SelecaoTurmas from './features/horarios/SelecaoTurmas'
import { catalogarOferta, descreverProcedencia, pertenceAoCurso, rotuloCurso } from './features/horarios/catalogo'
import { useReferenciaCurricular } from './features/horarios/useReferenciaCurricular'
import { Link, useSearchParams } from 'react-router-dom'
import { useHorario } from './features/horarios/context'
import { gerarIdTurma } from './features/horarios/selecao'

function App() {
  const [dados, setDados] = useState<DadosCursos | null>(null)
  const [cursoSelecionadoId, setCursoSelecionadoId] =
  useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const cursoSolicitado = searchParams.get('curso')
  const [erroSelecao, setErroSelecao] = useState<string | null>(null)
  const [conflitos, setConflitos] =
  useState<ConflitoHorario[]>([])

  const [turmaComConflito, setTurmaComConflito] =
    useState<Turma | null>(null)

  const referencia = useReferenciaCurricular(cursoSelecionadoId ?? '')
  const catalogo = useMemo(() => dados ? catalogarOferta(dados) : [], [dados])
  const procedencias = useMemo(() => new Map(catalogo.map(item => [item.id, item.cursos])), [catalogo])

  const { selecionadas, adicionar, remover } = useHorario(
    dados?.periodo ?? '', cursoSelecionadoId ?? '', catalogo.map(item => item.turma),
  )

  useEffect(() => {
    const controller = new AbortController()
    async function carregarDados() {
      try {
        const response = await fetch('/data/cursos-atual.json', { signal: controller.signal })

        if (!response.ok) {
          throw new Error(
            `Erro ao carregar dados: ${response.status}`,
          )
        }

        const json: DadosCursos = await response.json()
        if (controller.signal.aborted) return

        setDados(json)

        const cursoPadrao =
          json.cursos.find(curso => curso.id === cursoSolicitado) ?? json.cursos.find(
            (curso) =>
              curso.nome
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase() ===
              'ciencia da computacao',
          ) ?? json.cursos[0]

        setCursoSelecionadoId(
          cursoPadrao?.id ?? null,
        )

      } catch (error) {
        if (controller.signal.aborted) return
        console.error(error)
        setErro(
          'Não foi possível carregar as turmas.',
        )
      }
    }

    carregarDados()
    return () => controller.abort()
  }, [cursoSolicitado])

  function turmaEstaSelecionada(turma: Turma) {
    const id = gerarIdTurma(turma)

    return selecionadas.some(
      (selecionada) =>
        gerarIdTurma(selecionada) === id,
    )
  }

  function alternarTurma(turma: Turma) {
    if (turmaEstaSelecionada(turma)) {
      remover(turma)
      setErroSelecao(null)

      setConflitos([])
      setTurmaComConflito(null)

      return
    }

    const conflitosEncontrados =
      encontrarConflitos(
        turma,
        selecionadas,
      )

    if (conflitosEncontrados.length > 0) {
      setConflitos(conflitosEncontrados)
      setTurmaComConflito(turma)

      return
    }

    setConflitos([])
    setTurmaComConflito(null)

    setErroSelecao(adicionar([turma]))
  }

  function tentarAdicionarTurma(
    turma: Turma,
    conflitosDaTurma: ConflitoHorario[],
  ) {
    if (conflitosDaTurma.length > 0) {
      setConflitos(conflitosDaTurma)
      setTurmaComConflito(turma)

      return
    }

    alternarTurma(turma)
  }

  function fecharAvisoConflito() {
    setConflitos([])
    setTurmaComConflito(null)
  }

  function trocarCurso(novoCursoId: string) {
    if (!dados) {
      return
    }

    const novoCurso = dados.cursos.find(
      (curso) => curso.id === novoCursoId,
    )

    if (!novoCurso) {
      return
    }

    setCursoSelecionadoId(novoCursoId)
    setErroSelecao(null)

    setConflitos([])
    setTurmaComConflito(null)
  }

  if (erro) {
    return (
      <main className="container">
        <h1>Projeta UFCA</h1>

        <p className="erro">
          {erro}
        </p>
      </main>
    )
  }

  if (!dados) {
    return (
      <main className="container">
        <h1>Projeta UFCA</h1>

        <p>
          Carregando turmas...
        </p>
      </main>
    )
  }

  const cursoSelecionado: Curso | undefined =
  dados.cursos.find(
    (curso) =>
      curso.id === cursoSelecionadoId,
  )
  
  if (!cursoSelecionado) {
    return (
      <main className="container">
        <p>Nenhum curso selecionado.</p>
      </main>
    )
  }

  return (
    <main className="container">
      <header>
        <h1>
          Projeta UFCA
        </h1>

          <div className="curso-selector">
            <label htmlFor="curso">
              Curso
            </label>

            <select
              id="curso"
              value={cursoSelecionadoId ?? ''}
              onChange={(event) =>
                trocarCurso(event.target.value)
              }
            >
              {dados.cursos.map((curso) => (
                <option
                  key={curso.id}
                  value={curso.id}
                >
                  {rotuloCurso(
                    curso,
                    dados.cursos,
                  )}
                </option>
              ))}
            </select>
          </div>

          <Link
            className="link-curriculo"
            to={
              `/curriculo?curso=` +
              `${cursoSelecionado.id}`
            }
          >
            Ver estrutura curricular
          </Link>

          <Link className="link-curriculo" to="/recomendacoes">
            Planejar meu próximo semestre
          </Link>
          <Link className="link-curriculo" to="/historico">
            Meu Histórico Acadêmico
          </Link>
          <Link className="link-curriculo" to="/guia-academico">
            Entenda seus índices acadêmicos
          </Link>

        <p>
          {cursoSelecionado.nome} • {dados.periodo}
        </p>

        <strong>
          {cursoSelecionado.quantidade_turmas} turmas disponíveis
        </strong>
      </header>

      {erroSelecao && <p role="alert" className="erro">{erroSelecao}</p>}
      {turmaComConflito && conflitos.length > 0 && (
        <section className="aviso-conflito">
          <div className="aviso-conflito-cabecalho">
            <div>
              <strong>
                Conflito de horário
              </strong>

              <p>
                Não foi possível adicionar{' '}
                <strong>
                  {turmaComConflito.disciplina}
                </strong>
                .
              </p>
            </div>

            <button
              type="button"
              onClick={fecharAvisoConflito}
              aria-label="Fechar aviso"
            >
              ×
            </button>
          </div>

          <ul>
            {conflitos.map((conflito, index) => (
              <li
                key={[
                  gerarIdTurma(conflito.turma),
                  conflito.dia,
                  conflito.inicio,
                  index,
                ].join('|')}
              >
                Conflito com{' '}
                <strong>
                  {conflito.turma.disciplina}
                </strong>{' '}
                na {conflito.diaNome}, das{' '}
                <strong>
                  {conflito.inicio} às {conflito.fim}
                </strong>
                .
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="meu-horario">
        <div className="meu-horario-cabecalho">
          <div>
            <h2>
              Meu horário
            </h2>

            <p>
              {selecionadas.length === 0
                ? 'Nenhuma turma selecionada.'
                : `${selecionadas.length} turma(s) selecionada(s).`}
            </p>
          </div>
        </div>

        {selecionadas.length > 0 && (
          <div className="acoes-exportacao">
            <button
              type="button"
              className="botao-exportar"
              onClick={() =>
                exportarHorarioCsv(
                  selecionadas,
                  dados.periodo,
                  cursoSelecionado.nome,
                  procedencias,
                )
              }
            >
              Exportar CSV
            </button>

            <button
              type="button"
              className="botao-exportar"
              onClick={() =>
                exportarHorarioPdf(
                  selecionadas,
                  dados.periodo,
                  cursoSelecionado.nome,
                  procedencias,
                )
              }
            >
              Exportar PDF
            </button>
          </div>
        )}

        {selecionadas.length > 0 && (
          <GradeSemanal turmas={selecionadas} />
        )}

        {selecionadas.length > 0 && (
          <div className="selecionadas">
            {selecionadas.map((turma) => (
              <div
                className="selecionada"
                key={gerarIdTurma(turma)}
              >
                <div>
                  <strong>
                    {turma.codigo} — {turma.disciplina}
                  </strong>

                  <span>Turma {turma.turma} · {turma.docente || 'Docente não informado'}</span>
                  <span>{turma.horario_sigaa}</span>
                  {catalogo.find(item => item.id === gerarIdTurma(turma) && !pertenceAoCurso(item, cursoSelecionado.id)) && (
                    <span>Curso de oferta: {descreverProcedencia(turma, procedencias)}</span>
                  )}
                  <SalasTurma turma={turma} />
                </div>

                <button
                  type="button"
                  className="botao-remover"
                  onClick={() => alternarTurma(turma)}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <SelecaoTurmas key={cursoSelecionado.id} cursoId={cursoSelecionado.id} periodo={dados.periodo} cursos={dados.cursos}
        catalogo={catalogo} selecionadas={selecionadas} referencia={referencia}
        alternar={(turma, conflitosDaTurma) => turmaEstaSelecionada(turma)
          ? alternarTurma(turma) : tentarAdicionarTurma(turma, conflitosDaTurma)}
        limparAviso={() => { fecharAvisoConflito(); setErroSelecao(null) }} />
    </main>
  )
}

export default App
