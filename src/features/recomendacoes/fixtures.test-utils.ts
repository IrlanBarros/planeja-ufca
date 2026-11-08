import type { ComponenteCurricular, DadosCursos, EstruturaCurricular, RegraRequisito, Turma } from '../../types'
import { novoHistorico } from '../historico/models/types'
import type { HistoricoAcademico, TentativaComponente } from '../historico/models/types'
import { PREFERENCIAS_INICIAIS } from './models/types'

export const codigo = (codigo: string): RegraRequisito => ({ codigo })
export const e = (esquerda: RegraRequisito, direita: RegraRequisito): RegraRequisito => ({ operador: 'E', esquerda, direita })
export const ou = (esquerda: RegraRequisito, direita: RegraRequisito): RegraRequisito => ({ operador: 'OU', esquerda, direita })
export function componente(codigo: string, extras: Partial<ComponenteCurricular> = {}): ComponenteCurricular {
  return { codigo, nome: `Componente ${codigo}`, id: codigo, carga_horaria: 64, tipo: 'obrigatoria', nivel: 1, pre_requisitos_expressao: null, pre_requisitos_codigos: [], pre_requisitos_regra: null, co_requisitos_expressao: null, co_requisitos_codigos: [], equivalencias_expressao: null, equivalencias_codigos: [], ...extras }
}
export function tentativa(codigo: string, situacao: string | null, periodo: string | null = '2025.2'): TentativaComponente {
  return { id: `${codigo}-${situacao}-${periodo}`, codigo, situacao, periodo, nome: `Componente ${codigo}`, cargaHoraria: 64, turma: '01', frequencia: null, media: null, marcadores: [], tipo: null }
}
export function perfilSintetico(tentativas: TentativaComponente[] = [tentativa('BASE', 'APR')]): HistoricoAcademico {
  const p = novoHistorico()
  p.importadoEm = '2026-11-07T12:00:00Z'; p.emitidoEm = '2026-10-01'
  p.curso = { nome: 'CURSO SINTÉTICO', idCurso: 'curso', estruturaCurricular: 'AB001' }
  p.vinculo.periodoIngresso = '2023.1'
  p.componentesCursados = tentativas
  return p
}
export function turma(codigo: string, dia = 2, inicio = '08:00', fim = '10:00', numero = '01'): Turma {
  return { codigo, disciplina: `Componente ${codigo}`, turma: numero, docente: 'Docente sintético', vagas_reservadas: 20, horario_sigaa: `${dia}-${inicio}-${fim}`, horarios: [{ dia, dia_nome: `Dia ${dia}`, inicio, fim }], periodo: '2026.2', sala: 'Sala de exemplo' }
}
export function entrada(componentes = [componente('A')], turmas = [turma('A')], perfil = perfilSintetico()) {
  const estrutura: EstruturaCurricular = { id: 'id-interno', codigo: 'AB001', ano_criacao: 2020, status: 'ATIVA', quantidade_componentes: componentes.length, quantidade_obrigatorias: componentes.filter(c => c.tipo === 'obrigatoria').length, quantidade_optativas: componentes.filter(c => c.tipo === 'optativa').length, componentes }
  const oferta: DadosCursos = { periodo: '2026.2', quantidade_cursos: 1, quantidade_turmas: turmas.length, cursos: [{ id: 'curso', nome: 'CURSO SINTÉTICO', sede: 'EXEMPLO', modalidade: 'Presencial', quantidade_turmas: turmas.length, turmas }] }
  return { perfil, estrutura, oferta, cursoId: 'curso', preferencias: { ...PREFERENCIAS_INICIAIS }, selecionadas: [] as Turma[], agora: new Date('2026-11-07T12:00:00Z') }
}
