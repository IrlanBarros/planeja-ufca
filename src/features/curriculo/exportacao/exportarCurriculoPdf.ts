import { jsPDF } from 'jspdf'
import type { EstadoVisual, ExportacaoCurriculo } from '../models/types'
import { EXPLICACOES_ESTADO, ROTULOS_ESTADO } from '../models/types'
import { agruparComponentes, nomeArquivoCurriculo } from '../services/prepararExportacao'

const CORES: Record<EstadoVisual, { fundo: [number, number, number]; borda: [number, number, number]; texto?: [number, number, number] }> = {
  concluida: { fundo: [240, 253, 244], borda: [21, 128, 61] },
  cursando: { fundo: [239, 246, 255], borda: [37, 99, 235] },
  disponivel: { fundo: [255, 251, 235], borda: [180, 119, 0] },
  bloqueada: { fundo: [243, 244, 246], borda: [220, 38, 38], texto: [153, 27, 27] },
  verificar: { fundo: [255, 255, 255], borda: [209, 213, 219] },
}
const textoPdf = (texto: string) => texto.replace(/[–—]/g, '-').replace(/\p{Cc}/gu, c => ['\n', '\r', '\t'].includes(c) ? c : '')

export function gerarCurriculoPdf(dados: ExportacaoCurriculo): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const margem = 15, largura = 180, limite = 277, entrelinha = 4.4
  const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dados.geradoEm))
  let y = 0
  let inicioConteudo = 0
  let grupoAtual = ''
  function cabecalho() {
    pdf.setTextColor(20, 35, 55); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13)
    pdf.text('Planeja UFCA', margem, 17)
    pdf.setFontSize(11)
    pdf.text(dados.modo === 'original' ? 'Estrutura Curricular' : 'Minha Estrutura Curricular - Progresso Acadêmico', margem, 24)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
    const linhas = [dados.curso.nome,
      `Matriz ${dados.estrutura.codigo} - ID ${dados.estrutura.id} - criação ${dados.estrutura.ano} - Gerado em ${data}`,
      ...(dados.modo === 'progresso' ? [`Histórico emitido em ${dados.emitidoEm ?? 'data desconhecida'} - Referência: ${dados.periodoReferencia ? `oferta pública ${dados.periodoReferencia}` : 'indisponível'}`] : []),
    ].flatMap(t => pdf.splitTextToSize(textoPdf(t), largura) as string[])
    linhas.forEach((linha, i) => pdf.text(linha, margem, 31 + i * entrelinha))
    y = 35 + linhas.length * entrelinha
    inicioConteudo = y
    pdf.setDrawColor(195); pdf.line(margem, y - 2, margem + largura, y - 2)
  }
  function tituloGrupo(titulo: string) {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(25, 45, 65)
    pdf.text(textoPdf(titulo), margem, y + 4); y += 11
  }
  function novaPagina(repetirGrupo = false) {
    pdf.addPage(); cabecalho()
    if (repetirGrupo && grupoAtual) tituloGrupo(`${grupoAtual} (continuação)`)
  }
  function paragrafo(texto: string, negrito = false, corTexto: [number, number, number] = [35, 35, 35]) {
    pdf.setFont('helvetica', negrito ? 'bold' : 'normal'); pdf.setFontSize(9)
    const linhas = pdf.splitTextToSize(textoPdf(texto), largura) as string[]
    for (const linha of linhas) {
      if (y + entrelinha > limite) novaPagina()
      pdf.setFont('helvetica', negrito ? 'bold' : 'normal'); pdf.setFontSize(9); pdf.setTextColor(...corTexto)
      pdf.text(linha, margem, y + 3); y += entrelinha
    }
    y += 3
  }
  cabecalho()
  if (dados.modo === 'progresso') {
    paragrafo('Progresso da graduação - carga horária oficial', true)
    for (const i of dados.indicadores) {
      paragrafo(`${i.rotulo}: ${i.percentual === null ? 'percentual indisponível' : `${i.percentual.toFixed(1).replace('.', ',')}% concluído`}. ${i.integralizada ?? 'Não informadas'}h integralizadas de ${i.exigida ?? 'não informadas'}h exigidas; ${i.pendente ?? 'não informadas'}h pendentes.${i.aviso ? ` ${i.aviso}` : ''}`)
      if (i.percentual !== null) {
        if (y + 8 > limite) novaPagina()
        pdf.setFillColor(230, 230, 230); pdf.rect(margem, y, largura, 2.5, 'F')
        pdf.setFillColor(21, 128, 61); pdf.rect(margem, y, largura * i.percentual / 100, 2.5, 'F'); y += 8
      }
    }
    paragrafo('Legenda das situações', true)
    for (const estado of Object.keys(ROTULOS_ESTADO) as EstadoVisual[]) {
      const cor = CORES[estado]
      if (y + 17 > limite) novaPagina()
      pdf.setFillColor(...cor.borda); pdf.rect(margem, y, 2, 3, 'F')
      paragrafo(`    ${ROTULOS_ESTADO[estado]}: ${EXPLICACOES_ESTADO[estado]}`, false, cor.texto)
    }
    paragrafo('Optativas: alternativas de escolha; não é necessário concluir todos os componentes do catálogo.')
    for (const aviso of dados.avisos) paragrafo(`Atenção: ${aviso}`)
  }
  for (const grupo of agruparComponentes(dados.linhas)) {
    grupoAtual = grupo.titulo
    if (y + 35 > limite) novaPagina()
    tituloGrupo(grupo.titulo)
    for (const { componente: c, situacao } of grupo.linhas) {
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal')
      const linhas = [`${c.codigo} - ${c.nome}`,
        `${c.tipo === 'obrigatoria' ? 'Obrigatória' : 'Optativa'} - ${c.carga_horaria}h - Período recomendado: ${c.nivel ?? 'não definido'}`,
        `Pré-requisitos: ${c.pre_requisitos_expressao ?? (c.pre_requisitos_codigos.join(', ') || 'nenhum registrado')}`,
        `Correquisitos: ${c.co_requisitos_expressao ?? (c.co_requisitos_codigos.join(', ') || 'nenhum registrado')}`,
        `Equivalências: ${c.equivalencias_expressao ?? (c.equivalencias_codigos.join(', ') || 'nenhuma registrada')}`,
      ].map(texto => ({ texto, destacar: false }))
      if (situacao) linhas.push({ texto: `Situação: ${situacao.rotulo}`, destacar: situacao.estado === 'bloqueada' }, { texto: situacao.detalhes, destacar: false })
      const linhasQuebradas = linhas.flatMap(({ texto, destacar }) => (pdf.splitTextToSize(textoPdf(texto), largura - 10) as string[]).map(texto => ({ texto, destacar })))
      const cor = situacao ? CORES[situacao.estado] : CORES.verificar
      // Mantém o componente junto quando cabe; textos maiores que uma página são continuados.
      const alturaTotal = linhasQuebradas.length * entrelinha + 8
      const alturaPagina = limite - inicioConteudo - 11
      if (y + (alturaTotal <= alturaPagina ? alturaTotal : 65) > limite) novaPagina(true)
      while (linhasQuebradas.length) {
        const capacidade = Math.floor((limite - y - 8) / entrelinha)
        if (capacidade < 1) { novaPagina(true); continue }
        const trecho = linhasQuebradas.splice(0, capacidade)
        const altura = trecho.length * entrelinha + 6
        pdf.setFillColor(...cor.fundo)
        pdf.setDrawColor(...(situacao?.estado === 'bloqueada' ? cor.borda : [210, 210, 210] as [number, number, number]))
        pdf.rect(margem, y, largura, altura, 'FD')
        pdf.setFillColor(...cor.borda); pdf.rect(margem, y, 1.2, altura, 'F')
        pdf.setTextColor(25); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
        trecho.forEach(({ texto, destacar }, i) => {
          pdf.setTextColor(...(destacar && cor.texto ? cor.texto : [25, 25, 25] as [number, number, number]))
          pdf.text(texto, margem + 5, y + 5 + i * entrelinha)
        })
        y += altura + 4
        if (linhasQuebradas.length) novaPagina(true)
      }
    }
    y += 3
  }
  const total = pdf.getNumberOfPages()
  for (let pagina = 1; pagina <= total; pagina++) {
    pdf.setPage(pagina); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(85)
    pdf.text('Projeto independente. Não substitui a validação curricular oficial da UFCA.', margem, 287)
    pdf.text(`Página ${pagina} de ${total}`, 195, 292, { align: 'right' })
  }
  return pdf
}

export function exportarCurriculoPdf(dados: ExportacaoCurriculo) {
  gerarCurriculoPdf(dados).save(nomeArquivoCurriculo(dados, 'pdf'))
}
