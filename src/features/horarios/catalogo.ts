import type { ComponenteCurricular, Curso, DadosCursos, EstruturaCurricular, Turma } from '../../types'
import { equivalentesCurriculares } from '../recomendacoes/services/equivalencias'
import { gerarIdTurma } from './selecao'

export type CursoOferta = Pick<Curso, 'id' | 'nome'>
export type Procedencias = ReadonlyMap<string, readonly CursoOferta[]>
export interface TurmaCatalogo {
  id: string
  turma: Turma
  cursos: CursoOferta[]
  divergente: boolean
}
export interface CorrespondenciaCurricular {
  componente: ComponenteCurricular
  tipo: 'mesmo-componente' | 'equivalente'
}

export function normalizarTexto(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function rotuloCurso(curso: CursoOferta, cursos: readonly CursoOferta[]) {
  return cursos.filter(c => normalizarTexto(c.nome) === normalizarTexto(curso.nome)).length > 1
    ? `${curso.nome} (${curso.id})` : curso.nome
}

function metadados(turma: Turma) {
  return JSON.stringify([
    turma.disciplina, turma.periodo, turma.vagas_reservadas, turma.sala ?? null,
    turma.horarios.map(h => [h.dia, h.dia_nome, h.inicio, h.fim, h.sala === undefined ? ['ausente'] : h.sala]).sort(),
  ])
}

/** A procedência é derivada; nunca faz parte do ID nem do JSON público. */
export function catalogarOferta(dados: DadosCursos): TurmaCatalogo[] {
  const catalogo = new Map<string, TurmaCatalogo>()
  for (const curso of dados.cursos) for (const turma of curso.turmas) {
    const id = gerarIdTurma(turma)
    const anterior = catalogo.get(id)
    if (anterior) {
      if (!anterior.cursos.some(c => c.id === curso.id)) anterior.cursos.push({ id: curso.id, nome: curso.nome })
      // Não liberar inclusão com horários ou locais conflitantes sob o mesmo ID.
      anterior.divergente ||= metadados(anterior.turma) !== metadados(turma)
    } else catalogo.set(id, { id, turma, cursos: [{ id: curso.id, nome: curso.nome }], divergente: false })
  }
  return [...catalogo.values()]
}

export function pertenceAoCurso(item: TurmaCatalogo, cursoId: string) {
  return item.cursos.some(c => c.id === cursoId)
}

export function correspondenciasCurriculares(turma: Turma, estrutura?: EstruturaCurricular): CorrespondenciaCurricular[] {
  return estrutura?.componentes.flatMap<CorrespondenciaCurricular>(componente => turma.codigo === componente.codigo
    ? [{ componente, tipo: 'mesmo-componente' as const }]
    : equivalentesCurriculares(componente).includes(turma.codigo)
      ? [{ componente, tipo: 'equivalente' as const }] : []) ?? []
}

export function correspondeBusca(item: TurmaCatalogo, busca: string) {
  const termo = normalizarTexto(busca)
  return !termo || [item.turma.codigo, item.turma.disciplina, item.turma.docente, ...item.cursos.map(c => c.nome)]
    .some(texto => normalizarTexto(texto).includes(termo))
}

export function descreverProcedencia(turma: Turma, procedencias?: Procedencias) {
  return procedencias?.get(gerarIdTurma(turma))?.map(c => `${c.nome} (${c.id})`).join(' / ') ?? ''
}
