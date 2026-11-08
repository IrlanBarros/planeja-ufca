import type { HistoricoAcademico } from '../historico/models/types'
import { decodificarPerfil } from '../historico/storage/schema'
import { salvarPerfil } from '../historico/storage/indexedDb'
import { gerarStorageKey, PREFIXO_HORARIO, PREFIXO_HORARIO_LEGADO, validarIdsHorario } from '../horarios/selecao'
import { readThemePreference, THEME_STORAGE_KEY, type ThemePreference } from '../../theme/theme'

export const LIMITE_BACKUP = 8 * 1024 * 1024
interface HorarioBackup { periodo: string; cursoId: string; turmas: string[] }
export interface BackupLocal {
  formato: 'projeta-ufca-backup'
  versao: 1
  tema: ThemePreference
  horarios: HorarioBackup[]
  perfil: HistoricoAcademico | null
}

function objeto(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('Arquivo de backup inválido.')
  return valor as Record<string, unknown>
}
function identificador(valor: unknown): string {
  if (typeof valor !== 'string' || !valor.trim() || valor.length > 200 || valor.includes(':') || [...valor].some(c => c.charCodeAt(0) < 32)) throw new Error('Período ou curso inválido no backup.')
  return valor
}
export function validarBackup(valor: unknown): BackupLocal {
  const b = objeto(valor)
  if (b.formato !== 'projeta-ufca-backup') throw new Error('Arquivo de backup inválido.')
  if (b.versao !== 1) throw new Error('Versão de backup incompatível.')
  if (b.tema !== 'light' && b.tema !== 'dark' && b.tema !== 'system') throw new Error('Preferência de tema inválida no backup.')
  if (!Array.isArray(b.horarios) || b.horarios.length > 500) throw new Error('Lista de horários inválida no backup.')
  const vistos = new Set<string>()
  const horarios = b.horarios.map(valor => {
    const h = objeto(valor)
    const periodo = identificador(h.periodo), cursoId = identificador(h.cursoId)
    const chave = gerarStorageKey(periodo, cursoId)
    if (vistos.has(chave)) throw new Error('O backup contém horários duplicados para o mesmo período e curso.')
    vistos.add(chave)
    return { periodo, cursoId, turmas: validarIdsHorario(h.turmas) }
  })
  if (b.perfil === undefined) throw new Error('O backup está incompleto.')
  return { formato: 'projeta-ufca-backup', versao: 1, tema: b.tema, horarios, perfil: b.perfil === null ? null : decodificarPerfil(b.perfil) }
}
export function interpretarBackup(texto: string): BackupLocal {
  if (new Blob([texto]).size > LIMITE_BACKUP) throw new Error('O backup excede o limite de 8 MB.')
  let valor: unknown
  try { valor = JSON.parse(texto) } catch { throw new Error('Selecione um arquivo JSON de backup válido.') }
  return validarBackup(valor)
}

export function coletarHorarios(): HorarioBackup[] {
  const encontrados = new Map<string, string>()
  for (let i = 0; i < localStorage.length; i++) {
    const chave = localStorage.key(i)!
    if (!chave.startsWith(PREFIXO_HORARIO) && !chave.startsWith(PREFIXO_HORARIO_LEGADO)) continue
    const partes = chave.match(/^(?:projeta-ufca|seu-horario-ufca):([^:]+):([^:]+):turmas$/)
    if (!partes) continue
    const nova = gerarStorageKey(partes[1], partes[2])
    // Não mesclar escolhas novas com cópias antigas que podem estar desatualizadas.
    if (!encontrados.has(nova) || chave.startsWith(PREFIXO_HORARIO)) encontrados.set(nova, chave)
  }
  return [...encontrados].map(([nova, chave]) => {
    const partes = nova.split(':')
    return { periodo: partes[1], cursoId: partes[2], turmas: validarIdsHorario(JSON.parse(localStorage.getItem(chave)!)) }
  })
}

/** O chamador só passa o perfil quando a inclusão foi autorizada explicitamente. */
export function criarBackup(perfil: HistoricoAcademico | null = null, tema = readThemePreference()): BackupLocal {
  try {
    return validarBackup({ formato: 'projeta-ufca-backup', versao: 1, tema, horarios: coletarHorarios(), perfil })
  } catch { throw new Error('Não foi possível ler todos os horários locais. Confira as permissões e os dados deste navegador antes de exportar.') }
}

export async function restaurarBackup(valor: unknown, confirmado: boolean) {
  const backup = validarBackup(valor)
  if (!confirmado) throw new Error('Confirme a restauração e a substituição dos dados incluídos no backup.')
  const entradas: [string, string][] = [
    [THEME_STORAGE_KEY, backup.tema],
    ...backup.horarios.map(h => [gerarStorageKey(h.periodo, h.cursoId), JSON.stringify(h.turmas)] as [string, string]),
  ]
  // Obtém o snapshot completo antes da primeira escrita. Não altera as chaves legadas.
  const anteriores = entradas.map(([chave]) => [chave, localStorage.getItem(chave)] as const)
  const alteradas: number[] = []
  try {
    entradas.forEach(([chave, conteudo], i) => { localStorage.setItem(chave, conteudo); alteradas.push(i) })
    // A transação do perfil é a última operação que pode falhar.
    if (backup.perfil) await salvarPerfil(backup.perfil)
  } catch {
    let falhaRollback = false
    for (const i of alteradas.reverse()) {
      const [chave, conteudo] = anteriores[i]
      try { if (conteudo === null) localStorage.removeItem(chave); else localStorage.setItem(chave, conteudo) }
      catch { falhaRollback = true }
    }
    throw new Error(falhaRollback
      ? 'A restauração falhou e o navegador bloqueou a recuperação de algumas preferências. Guarde seu backup e verifique as permissões antes de tentar novamente.'
      : 'Não foi possível restaurar o backup. Os dados anteriores foram preservados.')
  }
}

export function baixarBackup(backup: BackupLocal) {
  const conteudo = JSON.stringify(validarBackup(backup), null, 2)
  if (new Blob([conteudo]).size > LIMITE_BACKUP) throw new Error('O backup excede o limite de 8 MB.')
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }))
  const link = document.createElement('a')
  try {
    link.href = url
    link.download = `projeta-ufca-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link); link.click()
  } finally { link.remove(); URL.revokeObjectURL(url) }
}
