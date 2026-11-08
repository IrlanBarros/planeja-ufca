import { useRef, useState } from 'react'
import { useHistorico } from '../historico/hooks/context'
import { useTheme } from '../../theme/theme'
import { baixarBackup, criarBackup, interpretarBackup, LIMITE_BACKUP, restaurarBackup, type BackupLocal as DadosBackup } from './backup'

export default function BackupLocal() {
  const { perfil, carregando, erro: erroPerfil } = useHistorico()
  const { preference } = useTheme()
  const [incluirPerfil, setIncluirPerfil] = useState(false)
  const [backup, setBackup] = useState<DadosBackup | null>(null)
  const [confirmado, setConfirmado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const leitura = useRef(0)

  function exportar() {
    setErro(''); setMensagem('')
    try { baixarBackup(criarBackup(incluirPerfil ? perfil : null, preference)); setMensagem('Backup gerado neste dispositivo.') }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível gerar o backup.') }
  }
  async function selecionar(file?: File) {
    const atual = ++leitura.current
    setBackup(null); setConfirmado(false); setErro(''); setMensagem('')
    if (!file) return
    try {
      if (file.size > LIMITE_BACKUP) throw new Error('O backup excede o limite de 8 MB.')
      const dados = interpretarBackup(await file.text())
      if (leitura.current === atual) setBackup(dados)
    } catch (e) { if (leitura.current === atual) setErro(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.') }
  }
  async function restaurar() {
    if (!backup || !confirmado || ocupado) return
    setOcupado(true); setErro('')
    try {
      await restaurarBackup(backup, confirmado)
      setMensagem('Dados restaurados. Recarregando para aplicar as preferências e o perfil…')
      window.location.reload()
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível restaurar o backup.'); setOcupado(false) }
  }

  return <section className="historico-card" aria-labelledby="backup-titulo">
    <h2 id="backup-titulo">Transferir dados locais</h2>
    <p>Para mudar de endereço ou navegador, exporte um backup aqui e importe o arquivo no outro endereço. Cada domínio possui seu próprio armazenamento. A transferência acontece somente por sua ação, neste dispositivo, sem enviar o arquivo a servidores.</p>
    <p>O backup pode conter informações acadêmicas pessoais. Guarde-o com cuidado e apague-o após a migração se não desejar mantê-lo. Ele não inclui o PDF, texto integral, nome completo, CPF, RG, matrícula ou credenciais.</p>
    <label className="historico-checkbox"><input type="checkbox" checked={incluirPerfil} disabled={!perfil || carregando || ocupado} onChange={e => setIncluirPerfil(e.target.checked)} />Autorizo incluir meu perfil acadêmico estruturado no backup.</label>
    {erroPerfil && <p className="historico-aviso">O perfil salvo não pôde ser recuperado. O backup poderá conter somente tema e horários. Recupere o perfil antes de migrá-lo.</p>}
    <button type="button" onClick={exportar} disabled={ocupado || carregando}>Exportar backup local</button>
    <p><label className="historico-campo">Importar backup JSON<input type="file" accept=".json,application/json" disabled={ocupado || carregando} onChange={e => { void selecionar(e.target.files?.[0]); e.target.value = '' }} /></label></p>
    {backup && <div>
      <h3>Confira a restauração</h3>
      <ul><li>Tema: {({ light: 'Claro', dark: 'Escuro', system: 'Sistema' })[backup.tema]}.</li>
        <li>{backup.horarios.length} horário(s), com {backup.horarios.reduce((total, h) => total + h.turmas.length, 0)} turma(s).</li>
        {backup.horarios.map(h => <li key={`${h.periodo}:${h.cursoId}`}>Período {h.periodo} · Curso {h.cursoId} · {h.turmas.length} turma(s).</li>)}
        <li>{backup.perfil ? 'Perfil acadêmico: será salvo neste dispositivo e substituirá o perfil atual.' : 'Sem perfil acadêmico no arquivo: o perfil já salvo será preservado.'}</li></ul>
      <p>O tema e os horários dos períodos e cursos listados substituirão as escolhas atuais correspondentes, inclusive listas vazias. Os demais horários serão preservados. Turmas de ofertas antigas ou indisponíveis permanecem guardadas pelos seus IDs e podem não aparecer na oferta atual. Ao concluir, a página será recarregada; dados mantidos somente na sessão serão descartados.</p>
      <label className="historico-checkbox"><input type="checkbox" checked={confirmado} disabled={ocupado} onChange={e => setConfirmado(e.target.checked)} />Confirmo a restauração e a substituição dos dados indicados acima.</label>
      <div className="historico-acoes"><button type="button" className="historico-primario" disabled={!confirmado || ocupado || carregando} onClick={() => void restaurar()}>Restaurar dados confirmados</button>
        <button type="button" disabled={ocupado} onClick={() => { setBackup(null); setConfirmado(false); leitura.current++ }}>Cancelar importação</button></div>
    </div>}
    {erro && <p role="alert" className="historico-erro">{erro}</p>}
    {mensagem && <p role="status">{mensagem}</p>}
  </section>
}
