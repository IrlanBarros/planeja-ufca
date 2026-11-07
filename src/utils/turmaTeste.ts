import type { Turma } from '../types'

// Dados ilustrativos, usados somente pelos testes.
export function turmaTeste(alteracoes: Partial<Turma> = {}): Turma {
  return {
    codigo: 'CC0024',
    disciplina: 'Redes de Computadores',
    turma: '01',
    docente: 'Docente de teste',
    vagas_reservadas: 40,
    horario_sigaa: '24T46',
    periodo: '2026.2',
    horarios: [
      { dia: 2, dia_nome: 'segunda-feira', inicio: '14:00', fim: '16:00' },
      { dia: 4, dia_nome: 'quarta-feira', inicio: '14:00', fim: '16:00' },
    ],
    ...alteracoes,
  }
}
