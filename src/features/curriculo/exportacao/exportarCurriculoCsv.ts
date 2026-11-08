import type { ExportacaoCurriculo } from '../models/types'
import { nomeArquivoCurriculo } from '../services/prepararExportacao'

function campoCsv(valor: string | number | null) {
  let texto = String(valor ?? '').replace(/\r\n|\r|\n/g, '\n').replace(/\p{Cc}/gu, c => ['\n', '\t'].includes(c) ? c : '')
  // As aspas CSV não impedem a execução de fórmulas em planilhas.
  if (typeof valor === 'string' && (/^\s*[=+@-]/.test(texto) || /^[\t\r\n]/.test(texto))) texto = `'${texto}`
  return `"${texto.replace(/"/g, '""')}"`
}

export function gerarCurriculoCsv(dados: ExportacaoCurriculo): string {
  const cabecalho = ['Curso', 'ID do curso', 'Estrutura', 'ID da estrutura', 'Ano da matriz', 'Código', 'Componente', 'Tipo', 'Período recomendado', 'Carga horária', 'Pré-requisitos', 'Correquisitos', 'Equivalências']
  if (dados.modo === 'progresso') cabecalho.push('Situação acadêmica', 'Detalhes da situação', 'Emissão do histórico', 'Período de referência (oferta pública)')
  const linhas = dados.linhas.map(({ componente: c, situacao }) => {
    const campos: (string | number | null)[] = [dados.curso.nome, dados.curso.id, dados.estrutura.codigo, dados.estrutura.id, dados.estrutura.ano,
      c.codigo, c.nome, c.tipo === 'obrigatoria' ? 'Obrigatória' : 'Optativa', c.nivel, c.carga_horaria,
      c.pre_requisitos_expressao ?? c.pre_requisitos_codigos.join(', '), c.co_requisitos_expressao ?? c.co_requisitos_codigos.join(', '), c.equivalencias_expressao ?? c.equivalencias_codigos.join(', ')]
    if (dados.modo === 'progresso') campos.push(situacao?.rotulo ?? 'Situação a verificar', situacao?.detalhes ?? 'Situação não identificada.', dados.emitidoEm, dados.periodoReferencia)
    return campos
  })
  return '\uFEFF' + [cabecalho, ...linhas].map(l => l.map(campoCsv).join(';')).join('\r\n') + '\r\n'
}

export function exportarCurriculoCsv(dados: ExportacaoCurriculo) {
  const url = URL.createObjectURL(new Blob([gerarCurriculoCsv(dados)], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url; link.download = nomeArquivoCurriculo(dados, 'csv')
  document.body.appendChild(link)
  link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
