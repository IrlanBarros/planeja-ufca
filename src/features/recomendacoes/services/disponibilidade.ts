import type { ComponenteCurricular, DadosCursos, Turma } from '../../../types'
import type { HistoricoAcademico } from '../../historico/models/types'
import { encontrarConflitos } from '../../../utils/conflitos'
import { gerarIdTurma } from '../../horarios/selecao'
import type { OfertaComponente, PreferenciasPlanejamento } from '../models/types'
import { equivalentesPermitidos } from './equivalencias'

const minutos = (hora: string) => { const [h, m] = hora.split(':').map(Number); return h * 60 + m }
export function motivosIncompatibilidade(turma: Turma, preferencias: PreferenciasPlanejamento, selecionadas: Turma[]): string[] {
  const motivos: string[] = []
  if (!turma.horarios.length) motivos.push('Horários não informados; confirme a disponibilidade.')
  for (const h of turma.horarios) {
    if (!Number.isInteger(h.dia) || h.dia < 1 || h.dia > 7 || !/^\d{2}:\d{2}$/.test(h.inicio) || !/^\d{2}:\d{2}$/.test(h.fim) || !Number.isFinite(minutos(h.inicio)) || minutos(h.inicio) < 0 || minutos(h.fim) > 1440 || minutos(h.inicio) >= minutos(h.fim) || Number(h.inicio.slice(3)) >= 60 || Number(h.fim.slice(3)) >= 60) {
      motivos.push('Horário inválido; confirme os dados da turma.')
      continue
    }
    if (!preferencias.dias.includes(h.dia)) motivos.push(`${h.dia_nome} fora dos dias disponíveis.`)
    const inicio = minutos(h.inicio), fim = minutos(h.fim)
    if ((inicio < 720 && !preferencias.turnos.includes('manha')) || (inicio < 1080 && fim > 720 && !preferencias.turnos.includes('tarde')) || (fim > 1080 && !preferencias.turnos.includes('noite'))) motivos.push('Horário fora dos turnos disponíveis.')
  }
  if (selecionadas.some(t => t.codigo === turma.codigo)) motivos.push('Uma turma deste componente já está no horário.')
  for (const conflito of encontrarConflitos(turma, selecionadas)) motivos.push(`Conflito com ${conflito.turma.codigo}, ${conflito.diaNome}, ${conflito.inicio}–${conflito.fim}.`)
  return [...new Set(motivos)]
}

export function localizarOfertas(c: ComponenteCurricular, perfil: HistoricoAcademico, oferta: DadosCursos, cursoId: string, preferencias: PreferenciasPlanejamento, selecionadas: Turma[]): OfertaComponente[] {
  const permitidos = equivalentesPermitidos(c, perfil)
  const potenciais = c.equivalencias_codigos.filter(codigo => !permitidos.includes(codigo))
  const encontrados = new Map<string, OfertaComponente>()
  // O agrupamento principal vem primeiro, preservando a procedência sem duplicar turmas.
  const cursos = [...oferta.cursos].sort((a, b) => Number(b.id === cursoId) - Number(a.id === cursoId) || a.id.localeCompare(b.id))
  for (const curso of cursos) for (const turma of curso.turmas) {
    if (turma.periodo !== oferta.periodo || ![c.codigo, ...permitidos, ...potenciais].includes(turma.codigo)) continue
    const id = gerarIdTurma(turma)
    if (encontrados.has(id)) continue
    const confirmada = turma.codigo === c.codigo || permitidos.includes(turma.codigo)
    const motivos = motivosIncompatibilidade(turma, preferencias, selecionadas)
    if (!confirmada) motivos.push('Equivalência potencial com expressão ambígua; exige confirmação institucional.')
    encontrados.set(id, { turma, cursoId: curso.id, cursoNome: curso.nome, origem: turma.codigo !== c.codigo ? 'equivalente' : curso.id === cursoId ? 'matriz' : 'outro-agrupamento', confirmada, compativel: !motivos.length, motivos })
  }
  return [...encontrados.values()].sort((a, b) => Number(b.compativel) - Number(a.compativel) || gerarIdTurma(a.turma).localeCompare(gerarIdTurma(b.turma)))
}
