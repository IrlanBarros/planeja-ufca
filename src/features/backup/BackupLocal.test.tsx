// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeContext } from '../../theme/theme'
import { HistoricoContext } from '../historico/hooks/context'
import { novoHistorico } from '../historico/models/types'
import BackupLocal from './BackupLocal'
import * as servico from './backup'

const p = novoHistorico()
function montar() {
  return render(<ThemeContext value={{ preference: 'system', resolvedTheme: 'light', setPreference: vi.fn() }}>
    <HistoricoContext value={{ perfil: p, salvo: false, carregando: false, erro: null, confirmar: vi.fn(), apagar: vi.fn() }}><BackupLocal /></HistoricoContext>
  </ThemeContext>)
}
function arquivo(texto: string) {
  const file = new File([texto], 'backup.json', { type: 'application/json' })
  Object.defineProperty(file, 'text', { value: async () => texto })
  fireEvent.change(screen.getByLabelText('Importar backup JSON'), { target: { files: [file] } })
}
beforeEach(() => { localStorage.clear(); vi.stubGlobal('fetch', vi.fn()) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('backup local na interface', () => {
  it('só inclui o perfil mediante autorização separada e não transmite dados', async () => {
    const download = vi.spyOn(servico, 'baixarBackup').mockImplementation(() => {})
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Exportar backup local' }))
    expect(download.mock.calls[0][0].perfil).toBeNull()
    await userEvent.click(screen.getByLabelText('Autorizo incluir meu perfil acadêmico estruturado no backup.'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar backup local' }))
    expect(download.mock.calls[1][0].perfil).toEqual(p)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('resume os dados, exige confirmação, permite cancelar e só restaura após ação explícita', async () => {
    const restaurar = vi.spyOn(servico, 'restaurarBackup').mockRejectedValue(new Error('Falha simulada; dados preservados.'))
    montar()
    const json = JSON.stringify({ ...servico.criarBackup(p), horarios: [{ periodo: '2026.2', cursoId: 'sintetico', turmas: ['ABC|01|Público|24T46'] }] })
    arquivo(json)
    await screen.findByRole('heading', { name: 'Confira a restauração' })
    expect(screen.getByText('Período 2026.2 · Curso sintetico · 1 turma(s).')).toBeTruthy()
    expect(screen.getByText(/Perfil acadêmico: será salvo/)).toBeTruthy()
    const botao = screen.getByRole('button', { name: 'Restaurar dados confirmados' }) as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    expect(restaurar).not.toHaveBeenCalled()
    await userEvent.click(screen.getByLabelText('Confirmo a restauração e a substituição dos dados indicados acima.'))
    expect(botao.disabled).toBe(false)
    await userEvent.click(botao)
    expect(restaurar).toHaveBeenCalledOnce()
    expect((await screen.findByRole('alert')).textContent).toContain('preservados')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar importação' }))
    expect(screen.queryByRole('heading', { name: 'Confira a restauração' })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('recusa arquivo inválido antes de oferecer a confirmação', async () => {
    montar(); arquivo('{"versao":99}')
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Restaurar dados confirmados' })).toBeNull()
    expect(localStorage.length).toBe(0)
  })
})
