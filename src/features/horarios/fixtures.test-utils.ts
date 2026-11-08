import type { Curso, DadosCursos, DadosCurriculoCurso } from '../../types'
import { componente, entrada, turma } from '../recomendacoes/fixtures.test-utils'

export function ofertaSintetica() {
  const base = entrada([
    componente('CC0001'),
    componente('CC0063', { nome: 'Álgebra Linear', equivalencias_expressao: '( MC0006 OU EM0010 )', equivalencias_codigos: ['MC0006', 'EM0010'] }),
    componente('CC0003', { tipo: 'optativa' }),
    componente('CC0004', { equivalencias_expressao: '( X E Y ) OU Z', equivalencias_codigos: ['X', 'Y', 'Z'] }),
  ], [turma('CC0001'), turma('CC0003', 5)])
  base.oferta.cursos[0].nome = 'CIÊNCIA DA COMPUTAÇÃO'
  base.perfil.curso.nome = 'CIÊNCIA DA COMPUTAÇÃO'
  const externo: Curso = {
    ...base.oferta.cursos[0], id: 'materiais', nome: 'ENGENHARIA DE MATERIAIS', quantidade_turmas: 4,
    turmas: [
      { ...turma('EM0010', 3), disciplina: 'Álgebra Linear', docente: 'João de Teste', sala: 'Lab; "A"' },
      turma('EM0010', 4, '10:00', '12:00', '02'),
      turma('CC0003', 6),
      turma('X', 6, '14:00', '16:00'),
    ],
  }
  const administracao: Curso = {
    ...externo, id: 'adm1', nome: 'ADMINISTRAÇÃO', quantidade_turmas: 3,
    turmas: [turma('ADM0001', 4), turma('ADMCONFLITO'), turma('COMPARTILHADA', 6, '18:00', '20:00')],
  }
  const administracao2: Curso = { ...administracao, id: 'adm2', quantidade_turmas: 1, turmas: [administracao.turmas[2]] }
  const vazio: Curso = { ...externo, id: 'vazio', nome: 'CURSO SEM TURMAS', quantidade_turmas: 0, turmas: [] }
  const oferta: DadosCursos = { ...base.oferta, cursos: [...base.oferta.cursos, externo, administracao, administracao2, vazio], quantidade_cursos: 5, quantidade_turmas: 10 }
  const antiga = { ...base.estrutura, id: 'antiga', codigo: 'AB000', ano_criacao: 2010, componentes: [componente('ANTIGA', { equivalencias_codigos: ['ADM0001'] })] }
  const curriculo: DadosCurriculoCurso = { curso_id: 'curso', quantidade_estruturas: 2, estruturas: [base.estrutura, antiga] }
  const indice = { quantidade_cursos: 5, quantidade_disponiveis: 1, quantidade_indisponiveis: 4, cursos: oferta.cursos.map(c => ({ id: c.id, nome: c.nome, modalidade: c.modalidade, disponivel: c.id === 'curso', arquivo: c.id === 'curso' ? 'curso.json' : null })) }
  return { ...base, oferta, curriculo, indice }
}
