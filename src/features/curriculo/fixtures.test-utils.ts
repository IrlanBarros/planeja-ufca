import { componente, entrada, perfilSintetico, tentativa } from '../recomendacoes/fixtures.test-utils'
import type { ModoCurriculo } from './models/types'
import { prepararExportacao } from './services/prepararExportacao'

export const cursoTeste = { id: 'curso', nome: 'CURSO SINTÉTICO', modalidade: 'Presencial', disponivel: true, arquivo: 'curso.json' }
export function dadosCurriculoTeste() {
  const perfil = perfilSintetico([tentativa('ABC0001', 'APR'), tentativa('XYZ0001', 'APRN'), tentativa('ABC0003', 'MATR', '2026.2')])
  perfil.cargaHoraria = {
    obrigatorias: { exigida: 200, integralizada: 100, pendente: 100 },
    optativas: { exigida: 100, integralizada: 20, pendente: 80 },
    complementares: { exigida: 100, integralizada: 80, pendente: 20 },
    total: { exigida: 400, integralizada: 200, pendente: 200 },
  }
  const { estrutura, oferta } = entrada([
    componente('ABC0001'), componente('ABC0002', { equivalencias_codigos: ['XYZ0001'] }), componente('ABC0003'),
    componente('ABC0004', { nivel: 2 }), componente('ABC0005', { nivel: null }),
    componente('ABC0006', { tipo: 'optativa', nivel: null }),
  ], [], perfil)
  return { perfil, estrutura, oferta, curso: cursoTeste, cursos: [cursoTeste], estruturas: [estrutura], periodoReferencia: '2026.2', agora: new Date('2026-11-07T12:00:00Z') }
}
export function exportacaoTeste(modo: ModoCurriculo = 'original') { return prepararExportacao({ ...dadosCurriculoTeste(), modo }) }
