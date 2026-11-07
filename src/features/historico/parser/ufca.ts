import { ErroHistorico } from './errors'
import { novoHistorico } from '../models/types'
import type { HistoricoAcademico, TentativaComponente } from '../models/types'
import { codigoPlausivel, validarHistorico } from '../validation/profile'
import { juntar, normalizar, numeroOficial, reconstruirLinhas } from './layout'
import type { ElementoTexto, LinhaTexto, PaginaTexto } from './layout'

type Secao = 'identificacao' | 'componentes' | 'legenda' | 'atividades' | 'horas' | 'pendentes' | 'equivalencias'
const tipos: Record<string, string> = { '*': 'optativo', '#': 'eletivo', e: 'equivalente a obrigatório', '&': 'equivalente a optativo', '@': 'atividade obrigatória', '§': 'atividade optativa', '%': 'equivalente a complementar' }

function secaoDaLinha(texto: string): Secao | null {
  const t = normalizar(texto)
  if (/COMPONENTES CURRICULARES.*PENDENTES/.test(t)) return 'pendentes'
  if (/COMPONENTES CURRICULARES.*CURSAD/.test(t)) return 'componentes'
  if (/CARGA HORARIA INTEGRALIZADA/.test(t)) return 'horas'
  if (/ATIVIDADES AUTONOMAS/.test(t)) return 'atividades'
  if (/^EQUIVALENCIAS\s*:/.test(t)) return 'equivalencias'
  if (/^LEGENDA$/.test(t)) return 'legenda'
  return null
}

function cabecalhoOuRodape(texto: string) {
  return /HISTORICO ESCOLAR|UNIVERSIDADE FEDERAL|SISTEMA INTEGRADO|SIGAA|PAGINA|AUTENTIC|VERIFICAR|CODIGO DE VERIFICA|MATRICULA:|NOME:|FAVOR, LER|HTTPS?:|EMITIDO EM/.test(normalizar(texto))
}

function dataEmissao(texto: string): string | null {
  const m = texto.match(/Emitido em:\s*(\d{2})\/(\d{2})\/(\d{4})/i)
  if (!m) return null
  const iso = `${m[3]}-${m[2]}-${m[1]}`
  const d = new Date(`${iso}T12:00:00Z`)
  return Number.isFinite(d.getTime()) && d.toISOString().startsWith(iso) ? iso : null
}

function extrairIdentificacao(pagina: PaginaTexto, h: HistoricoAcademico) {
  const linhas = reconstruirLinhas(pagina.elementos)
  for (const l of linhas) {
    h.emitidoEm ??= dataEmissao(l.texto)
    for (const chave of ['mc', 'mcn', 'iech', 'iepl', 'iea'] as const) {
      const m = l.texto.match(new RegExp(`\\b${chave}:\\s*(-?\\d+(?:[.,]\\d+)?)`, 'i'))
      if (m) h.indicesOficiais[chave] = numeroOficial(m[1])
    }
    const esquerda = juntar(l.elementos.filter(e => e.x < pagina.largura * 0.64))
    const t = normalizar(esquerda)
    if (/^ESTRUTURA CURRICULAR:/.test(t)) h.curso.estruturaCurricular = esquerda.split(':').slice(1).join(':').trim() || null
    if (/^STATUS:|^SITUACAO:/.test(t)) h.vinculo.situacao = esquerda.split(':')[1]?.trim() || null
    if (/ANO\s*\/\s*PERIODO LETIVO INICIAL:/.test(t)) h.vinculo.periodoIngresso = esquerda.match(/\d{4}\.\d/)?.[0] ?? null
    if (/^PERIODO LETIVO ATUAL:/.test(t)) h.vinculo.periodoAtual = esquerda.match(/ATUAL:\s*(\d+(?:\.\d)?)/i)?.[1] ?? null
    const prazos = l.texto.match(/Prazo para Conclusão.*?:\s*(\d{4}\.\d)\s*\/\s*(\d{4}\.\d)/i)
    if (prazos) [h.vinculo.prazoPadrao, h.vinculo.prazoMaximo] = [prazos[1], prazos[2]]
    if (/^SUSPENSOES:/.test(t)) h.vinculo.suspensoes = esquerda.split(':')[1]?.trim() || null
  }
  // O nome do curso pode começar acima da etiqueta Curso e ocupar várias linhas.
  const etiqueta = pagina.elementos.find(e => /^Curso:\s*$/.test(e.texto) && e.x < pagina.largura * 0.1)
  const fim = pagina.elementos.find(e => /^Status:|^Situação:/i.test(e.texto) && etiqueta && e.y > etiqueta.y)
  if (etiqueta && !h.curso.nome) {
    const itens = pagina.elementos.filter(e => e.x > etiqueta.x + etiqueta.largura + 5 && e.x < pagina.largura * 0.64 && e.y >= etiqueta.y - 8 && e.y < (fim?.y ?? etiqueta.y + 20))
    h.curso.nome = reconstruirLinhas(itens).map(l => l.texto).join(' ').trim() || null
  }
}

function extrairTentativas(pagina: PaginaTexto, elementos: ElementoTexto[], h: HistoricoAcademico) {
  const w = pagina.largura
  const linhas = reconstruirLinhas(elementos)
  const header = linhas.find(l => l.texto.includes('Turma') && /Média|Media/.test(l.texto))
  const nomes = ['CH', 'Turma', 'Freq', 'Média', 'Situação']
  const centros = nomes.map(n => {
    const e = header?.elementos.find(e => e.texto === n || e.texto.startsWith(n + ' '))
    return e ? (e.x + e.largura / 2) / w : null
  })
  const padrao = [0.724, 0.765, 0.815, 0.863, 0.917]
  const cols = centros.map((v, i) => v ?? padrao[i])
  if (!header) h.validacao.advertencias.push(`Página ${pagina.numero}: cabeçalho de colunas ausente; confira os resultados.`)
  const anchors = elementos.filter(e => e.x < w * 0.18 && /^\d{4}[.]\d$/.test(e.texto.trim())).sort((a, b) => a.y - b.y)
  const usados = new Set<ElementoTexto>()
  for (const [i, a] of anchors.entries()) {
    const prev = anchors[i - 1], next = anchors[i + 1]
    const row = elementos.filter(e => Math.abs(e.y - a.y) < Math.max(2.5, a.altura * 0.35))
    const codeItem = row.find(e => e.x >= w * 0.18 && e.x < w * 0.29 && codigoPlausivel(e.texto.trim()))
    if (!codeItem) {
      h.validacao.camposNaoReconhecidos.push(`Página ${pagina.numero}, tentativa ${i + 1}: código ausente.`)
      continue
    }
    usados.add(codeItem)
    const celula = (idx: number) => juntar(row.filter(e => {
      const x = (e.x + e.largura / 2) / w
      const left = idx ? (cols[idx - 1] + cols[idx]) / 2 : cols[0] - 0.022
      const right = idx < 4 ? (cols[idx] + cols[idx + 1]) / 2 : 1
      return x >= left && x < right
    }))
    const inicio = prev ? (prev.y + a.y) / 2 : a.y - Math.max(12, a.altura * 2)
    const fim = next ? (a.y + next.y) / 2 : a.y + Math.max(6, a.altura)
    // SIGAA usa fonte menor para docentes; somente a faixa de título é aceita.
    const candidatos = elementos.filter(e => e.x >= w * 0.28 && e.x < w * (cols[0] - 0.025) && e.y > inicio && e.y < fim)
    const titulo = candidatos.filter(e => e.y <= a.y + 1 && e.altura >= a.altura * 0.65 && !/\(\s*\d+\s*h\s*\)|\b(?:Prof|Dr|Dra|MSc)\./i.test(e.texto))
    const nome = reconstruirLinhas(titulo).map(l => l.texto).join(' ') || null
    const marcadores = row.filter(e => e.x >= w * 0.18 && e.x < codeItem.x && e.texto.trim()).flatMap(e => [...e.texto.trim()].filter(c => c.trim()))
    const c: TentativaComponente = {
      id: `p${pagina.numero}-r${i + 1}`, periodo: a.texto.trim(), codigo: codeItem.texto.trim(), nome,
      cargaHoraria: numeroOficial(celula(0)), turma: celula(1).replace(/^--$/, '') || null,
      frequencia: numeroOficial(celula(2)), media: numeroOficial(celula(3)), situacao: celula(4).trim() || null,
      marcadores, tipo: marcadores.map(m => tipos[m] ?? 'desconhecido').join(', ') || null,
    }
    for (const idx of [0, 2, 3]) {
      const valor = celula(idx)
      if (valor && valor !== '--' && numeroOficial(valor) === null) h.validacao.camposNaoReconhecidos.push(`Página ${pagina.numero}, tentativa ${i + 1}: valor numérico não reconhecido.`)
    }
    h.componentesCursados.push(c)
  }
  const orfaos = elementos.filter(e => e.x >= w * 0.18 && e.x < w * 0.29 && codigoPlausivel(e.texto.trim()) && !usados.has(e))
  if (orfaos.length) h.validacao.camposNaoReconhecidos.push(`Página ${pagina.numero}: ${orfaos.length} códigos sem período reconhecido. Confira o PDF.`)
}

function extrairPendentes(linhas: LinhaTexto[], w: number, h: HistoricoAcademico) {
  for (const l of linhas) {
    if (cabecalhoOuRodape(l.texto)) continue
    const code = l.elementos.find(e => e.x < w * 0.22 && codigoPlausivel(e.texto.trim()))
    if (code) {
      const obs = l.elementos.filter(e => e.x >= w * 0.69 && e.x < w * 0.87)
      const horas = juntar(l.elementos.filter(e => e.x >= w * 0.87))
      h.componentesPendentes.push({ codigo: code.texto.trim(), nome: juntar(l.elementos.filter(e => e.x > code.x + code.largura && e.x < w * 0.69)) || null, cargaHoraria: numeroOficial(horas), observacao: juntar(obs) || null })
    } else if (h.componentesPendentes.length && l.elementos.every(e => e.x > w * 0.15 && e.x < w * 0.69) && !/Componente Curricular|Código/.test(l.texto)) {
      const ultimo = h.componentesPendentes.at(-1)!
      ultimo.nome = [ultimo.nome, l.texto].filter(Boolean).join(' ')
    } else if (/^[A-Z]+\d+/.test(l.texto)) h.validacao.camposNaoReconhecidos.push('Uma linha da tabela de pendências não foi reconhecida.')
  }
}

function extrairEquivalencias(linhas: LinhaTexto[], h: HistoricoAcademico) {
  let buffer = ''
  const flush = () => {
    if (!buffer) return
    const m = buffer.match(/^Cumpriu\s+([A-Z]+\d+)\s*-\s*(.*?)\s*(?:\(\d+\s*h\))?\s+através de\s+([A-Z]+\d+)\s*-\s*(.*?)(?:\s*\(\d+\s*h\))?$/i)
    if (m) h.equivalencias.push({ codigoExigido: m[1], nomeExigido: m[2], codigoUtilizado: m[3], nomeUtilizado: m[4] })
    else h.validacao.camposNaoReconhecidos.push('Relação de equivalência não reconhecida. Confira o documento.')
  }
  for (const l of linhas) {
    if (cabecalhoOuRodape(l.texto)) continue
    if (/^Cumpriu\s/i.test(l.texto)) { flush(); buffer = l.texto }
    else if (buffer && !secaoDaLinha(l.texto)) buffer += ' ' + l.texto
    if (/através de.*\(\d+\s*h\)\s*$/i.test(buffer)) { flush(); buffer = '' }
  }
  flush()
}

export function interpretarUfca(paginas: PaginaTexto[]): HistoricoAcademico {
  if (!paginas.some(p => p.elementos.some(e => e.texto.trim()))) throw new ErroHistorico('Este PDF não possui texto extraível. Use um histórico digital do SIGAA; documentos digitalizados como imagem ainda não são suportados.')
  const inicio = normalizar(paginas.slice(0, 2).flatMap(p => reconstruirLinhas(p.elementos).map(l => l.texto)).join(' '))
  if (!inicio.includes('UNIVERSIDADE FEDERAL DO CARIRI') || !inicio.includes('HISTORICO ESCOLAR') || !/SIGAA|SISTEMA INTEGRADO DE GESTAO DE ATIVIDADES ACADEMICAS/.test(inicio)) throw new ErroHistorico('O documento não foi reconhecido como histórico escolar digital da UFCA emitido pelo SIGAA.')
  const h = novoHistorico()
  let secao: Secao = 'identificacao'
  let equivalencias: LinhaTexto[] = []
  let tabelaEncontrada = false
  for (const pagina of paginas) {
    extrairIdentificacao(pagina, h)
    const blocos: { secao: Secao; linhas: LinhaTexto[] }[] = []
    for (const l of reconstruirLinhas(pagina.elementos)) {
      const nova = secaoDaLinha(l.texto)
      if (nova) { secao = nova; blocos.push({ secao, linhas: [] }); continue }
      if (cabecalhoOuRodape(l.texto)) continue
      if (!blocos.length) blocos.push({ secao, linhas: [] })
      blocos.at(-1)!.linhas.push(l)
    }
    for (const b of blocos) {
      if (b.secao === 'componentes') { tabelaEncontrada = true; extrairTentativas(pagina, b.linhas.flatMap(l => l.elementos), h) }
      if (b.secao === 'pendentes') extrairPendentes(b.linhas, pagina.largura, h)
      if (b.secao === 'equivalencias') equivalencias = equivalencias.concat(b.linhas)
      if (b.secao === 'horas') for (const l of b.linhas) {
        const chave = /^Exigido/i.test(l.texto) ? 'exigida' : /^Integralizado/i.test(l.texto) ? 'integralizada' : /^Pendente/i.test(l.texto) ? 'pendente' : null
        if (!chave) continue
        const valores = [...l.texto.matchAll(/(-?\d+(?:[.,]\d+)?)\s*h\b/g)].map(m => numeroOficial(m[1]))
        if (valores.length === 4) (['obrigatorias', 'optativas', 'complementares', 'total'] as const).forEach((k, i) => { h.cargaHoraria[k][chave] = valores[i] })
        else h.validacao.camposNaoReconhecidos.push('Uma linha de carga horária não foi reconhecida.')
      }
      if (b.secao === 'atividades') for (const l of b.linhas) {
        if (/Categoria da Atividade|CH Total/.test(l.texto)) continue
        const carga = juntar(l.elementos.filter(e => e.x >= pagina.largura * 0.85))
        const categoria = juntar(l.elementos.filter(e => e.x < pagina.largura * 0.85))
        if (categoria && numeroOficial(carga) !== null) h.atividadesAutonomas.push({ categoria, cargaHoraria: numeroOficial(carga) })
        else if (categoria) h.validacao.camposNaoReconhecidos.push('Uma atividade autônoma não foi reconhecida com segurança.')
      }
    }
  }
  if (!tabelaEncontrada) throw new ErroHistorico('O histórico foi reconhecido, mas a tabela de componentes não foi encontrada. Este formato ainda não é suportado.')
  extrairEquivalencias(equivalencias, h)
  h.validacao.advertencias.push(...validarHistorico(h))
  return h
}
