import type { ElementoTexto, PaginaTexto } from './layout'

/** Somente exemplos inventados. Nenhum trecho de histórico real. */
export const el = (texto: string, x: number, y: number, altura = 8): ElementoTexto => ({ texto, x, y, altura, largura: texto.length * altura * 0.4 })
export function linha(texto: string, y: number, x = 30) { return el(texto, x, y) }
export function cabecalhoTabela(y = 280) {
  return [el('CH', 426, y), el('Turma', 445, y), el('Freq %', 474, y), el('Média', 504, y), el('Situação', 531, y)]
}
export function tentativa(y: number, codigo = 'ABC0001', situacao = 'APR', marcador = '', periodo = '2025.1') {
  return [el(periodo, 42, y), el(marcador, 110, y), el(codigo, 130, y), el('TÓPICOS SINTÉTICOS', 170, y - 3, 6), el('Docente Inventado (64h)', 170, y + 3, 4), el('64', 427, y), el('01', 451, y), el(situacao === 'MATR' ? '--' : '98,5', 477, y), el(situacao === 'MATR' ? '--' : '8.7', 508, y), el(situacao, 538, y)]
}
export function pagina(numero: number, elementos: ElementoTexto[]): PaginaTexto { return { numero, largura: 595, altura: 842, elementos } }
export function sintetico(): PaginaTexto[] {
  return [pagina(1, [
    linha('Universidade Federal do Cariri', 30), linha('SIGAA', 45), linha('Histórico Escolar - Emitido em: 15/08/2026', 60),
    linha('Nome: PESSOA FICTÍCIA', 80), linha('CPF: 000.000.000-00', 95), linha('Matrícula: FICTICIA', 110),
    el('Curso:', 34, 140), el('CURSO SINTÉTICO - BACHARELADO - PRESENCIAL - MTN', 89, 137),
    linha('Status: ATIVO', 163), linha('Estrutura Curricular: AB001 - 2020.1', 180),
    linha('Ano / Período Letivo Inicial: 2020.1', 197), linha('Período Letivo Atual: 8', 214),
    linha('Prazo para Conclusão (Padrão / Máximo): 2026.2 / 2028.2', 230),
    linha('MC: 8,1234 MCN: 400.1234 IECH: 0,7 IEPL: 0.8 IEA: 4.55', 245),
    linha('Componentes Curriculares Cursados/Cursando', 265), ...cabecalhoTabela(),
    ...tentativa(310, 'ABC0001', 'REP'), ...tentativa(340, 'ABC0001', 'APR', 'e', '2025.2'),
    ...tentativa(370, 'ABC0002', 'TRANC', '*'), ...tentativa(400, 'ABC0003', 'MATR', '#'),
  ]), pagina(2, [
    linha('Histórico Escolar - Emitido em: 15/08/2026', 40), linha('Componentes Curriculares Cursados/Cursando', 70), ...cabecalhoTabela(90),
    ...tentativa(120, 'ABC0004', 'NOVO', '&'),
    linha('Legenda', 150), linha('APR Aprovado por média', 170), linha('MATR Matriculado', 185),
    linha('Atividades Autônomas do Discente', 210), el('EXTENSÃO SINTÉTICA', 30, 235), el('120,0', 530, 235),
    linha('Carga Horária Integralizada/Pendente', 265),
    linha('Obrigatórias Optativos Complementares Total', 285),
    linha('Exigido 1000 h 300 h 200 h 1500 h', 310), linha('Integralizado 500 h 100 h 120 h 720 h', 335), linha('Pendente 500 h 200 h 80 h 780 h', 360),
    linha('Componentes Curriculares Obrigatórios Pendentes: 2', 400),
    el('ABC0003', 40, 430), el('DISCIPLINA SINTÉTICA', 110, 430), el('Matriculado', 465, 430), el('64 h', 530, 430),
  ]), pagina(3, [
    linha('Histórico Escolar - Emitido em: 15/08/2026', 40), linha('Nome: PESSOA FICTÍCIA', 65),
    el('ABC0005', 40, 100), el('DISCIPLINA PENDENTE', 110, 100), el('96 h', 530, 100),
    linha('Equivalências:', 140), linha('Cumpriu ABC0006 - NOME EXIGIDO (64h) através de ABC0001 - NOME CURSADO (64h)', 160),
  ])]
}
