import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CursoIndiceCurriculo, IndiceCurriculos } from '../types'
import type { HistoricoAcademico } from '../features/historico/models/types'
import { useHistorico } from '../features/historico/hooks/context'
import { associarCurso } from '../features/historico/integracaoCurricular'
import { importarPdf, LIMITES_PDF } from '../features/historico/parser/importarPdf'
import { documentoDesatualizado } from '../features/historico/validation/profile'
import ResumoHistorico from '../features/historico/components/ResumoHistorico'
import AcessoProgressoCurricular from '../features/curriculo/components/AcessoProgressoCurricular'
import '../App.css'
import './HistoricoPage.css'

export default function HistoricoPage() {
  const { perfil, salvo, carregando, erro: erroLocal, confirmar, apagar } = useHistorico()
  const [importando, setImportando] = useState(false)
  const [autorizado, setAutorizado] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [rascunho, setRascunho] = useState<HistoricoAcademico | null>(null)
  const [progresso, setProgresso] = useState({ pagina: 0, total: 0 })
  const [processando, setProcessando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [substituir, setSubstituir] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [cursos, setCursos] = useState<CursoIndiceCurriculo[]>([])
  const [indiceDisponivel, setIndiceDisponivel] = useState(true)
  const controlador = useRef<AbortController | null>(null)
  const inputArquivo = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/curriculos/index.json', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<IndiceCurriculos> }).then(i => setCursos(i.cursos)).catch(() => { if (!controller.signal.aborted) setIndiceDisponivel(false) })
    return () => { controller.abort(); controlador.current?.abort() }
  }, [])

  function limparImportacao() {
    controlador.current?.abort(); controlador.current = null
    setImportando(false); setAutorizado(false); setArquivo(null); setRascunho(null); setSubstituir(false); setProcessando(false); setErro(null)
    if (inputArquivo.current) inputArquivo.current.value = ''
  }
  async function processar() {
    if (!arquivo || !autorizado || processando) return
    const controller = new AbortController(); controlador.current = controller
    setProcessando(true); setErro(null); setProgresso({ pagina: 0, total: 0 })
    try {
      const novo = await importarPdf(arquivo, autorizado, controller.signal, (pagina, total) => setProgresso({ pagina, total }))
      if (!controller.signal.aborted) { setRascunho(associarCurso(novo, cursos)); setArquivo(null); if (inputArquivo.current) inputArquivo.current.value = '' }
    } catch (e) { if (!controller.signal.aborted) setErro(e instanceof Error ? e.message : 'Não foi possível importar o histórico.') }
    finally { if (controlador.current === controller) { setProcessando(false); controlador.current = null } }
  }
  async function usar(persistir: boolean) {
    if (!rascunho || ocupado) return
    setOcupado(true); setErro(null)
    try { await confirmar(rascunho, persistir, substituir); limparImportacao(); setMensagem(persistir ? 'Perfil acadêmico salvo neste dispositivo.' : 'Perfil ativo somente nesta sessão. Recarregar ou fechar a página apaga este perfil temporário.') }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível ativar o perfil. Tente novamente.') }
    finally { setOcupado(false) }
  }
  async function excluir() {
    setOcupado(true); setErro(null)
    try { await apagar(); limparImportacao(); setExcluindo(false); setMensagem('Dados acadêmicos locais apagados. Seus horários e preferências foram preservados.') }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível apagar os dados locais. Tente novamente.') }
    finally { setOcupado(false) }
  }
  const precisaSubstituir = !!perfil || !!erroLocal
  return <main className="container historico-page">
    <Link to="/">← Voltar aos horários</Link>
    <header><h1>Meu Histórico Acadêmico</h1><p>Importe, confira e controle seus dados acadêmicos neste navegador.</p></header>
    {mensagem && <p role="status" className="historico-aviso">{mensagem}</p>}
    {erro && <p role="alert" className="historico-erro">{erro}</p>}
    {erroLocal && <p role="alert" className="historico-erro">{erroLocal} Uma importação temporária pode ser usada sem alterar dados locais inacessíveis.</p>}
    {carregando ? <p role="status">Verificando dados acadêmicos neste dispositivo…</p> : <>
      {perfil && !importando && <section className="historico-card"><h2>Seu perfil acadêmico</h2><p>{salvo ? 'Salvo neste dispositivo (IndexedDB).' : 'Somente nesta sessão. Recarregar ou fechar a página apaga o perfil temporário.'}</p>
        {documentoDesatualizado(perfil.emitidoEm) && <p className="historico-aviso">Este histórico foi emitido em um período anterior. Algumas disciplinas podem ter mudado de situação desde então.</p>}
        <ResumoHistorico perfil={perfil} />
        <AcessoProgressoCurricular perfil={perfil} />
        <p><Link to="/recomendacoes">Planejar meu próximo semestre</Link></p>
      </section>}
      {!importando && <section className="historico-card">
        <h2>{perfil ? 'Atualizar histórico' : 'Nenhum histórico importado'}</h2><p>Use um histórico escolar digital emitido pelo SIGAA da UFCA. As outras ferramentas do site continuam disponíveis sem importar um histórico.</p>
        <div className="historico-acoes"><button className="historico-primario" onClick={() => { setImportando(true); setMensagem(null) }}>{perfil ? 'Importar versão atualizada' : 'Importar histórico acadêmico'}</button>
          {(perfil || erroLocal) && <button onClick={() => setExcluindo(true)}>Apagar meus dados acadêmicos</button>}</div>
      </section>}
      {excluindo && <section className="historico-card historico-erro" aria-labelledby="apagar-titulo"><h2 id="apagar-titulo">Apagar meus dados acadêmicos?</h2><p>O perfil ativo e os dados acadêmicos salvos neste navegador serão removidos. Horários montados e preferências de tema serão preservados.</p><div className="historico-acoes"><button disabled={ocupado} onClick={excluir}>Confirmar exclusão local</button><button disabled={ocupado} onClick={() => setExcluindo(false)}>Cancelar exclusão</button></div></section>}
      {importando && !autorizado && <section className="historico-card"><h2>Seus dados acadêmicos permanecem no seu dispositivo</h2>
        <p>Seu histórico acadêmico contém informações pessoais. Para analisar o documento, precisamos processar seu conteúdo diretamente neste navegador.</p>
        <p>O arquivo não será enviado para nossos servidores. Apenas as informações acadêmicas necessárias serão utilizadas. O PDF original e os identificadores pessoais serão descartados após a leitura.</p>
        <p>Depois de conferir os resultados, você poderá escolher entre usar os dados somente nesta sessão e salvá-los neste dispositivo. O uso é opcional e não afeta as demais ferramentas do site.</p>
        <p><Link to="/privacidade">Leia a política de privacidade</Link></p><div className="historico-acoes"><button onClick={limparImportacao}>Não autorizar</button><button className="historico-primario" onClick={() => setAutorizado(true)}>Autorizar processamento local</button></div>
      </section>}
      {importando && autorizado && !rascunho && <section className="historico-card"><h2>Selecionar histórico em PDF</h2><p>Selecione o histórico escolar digital emitido pelo SIGAA da UFCA. Até {LIMITES_PDF.bytes / 1024 / 1024} MB e {LIMITES_PDF.paginas} páginas. Documentos escaneados e PDFs com senha não são suportados.</p>
        <label className="historico-campo">Selecionar PDF<input ref={inputArquivo} type="file" accept=".pdf,application/pdf" disabled={processando} onChange={e => { setArquivo(e.target.files?.[0] ?? null); setErro(null) }} /></label>
        {arquivo && <p>{arquivo.name} · {(arquivo.size / 1024).toFixed(1)} KB</p>}
        {processando && <div role="status"><p>{progresso.total ? `Lendo página ${progresso.pagina} de ${progresso.total}…` : 'Iniciando leitura local…'}</p><progress aria-label="Progresso da leitura" max={progresso.total || 1} value={progresso.pagina} /></div>}
        <div className="historico-acoes"><button className="historico-primario" disabled={!arquivo || processando} onClick={processar}>Analisar PDF neste navegador</button><button onClick={limparImportacao}>Cancelar importação</button></div>
      </section>}
      {rascunho && <section className="historico-card"><h2>Confira o histórico antes de usar</h2><p>Nenhum perfil foi salvo com esta importação. Compare os dados com o PDF. Você pode corrigir campos e rejeitar registros; cada alteração será marcada como manual.</p>
        {documentoDesatualizado(rascunho.emitidoEm) && <p className="historico-aviso">Este histórico foi emitido em um período anterior. A importação preserva a situação registrada naquela data.</p>}
        {perfil && <p className="historico-aviso">Emissão atual: {perfil.emitidoEm ?? 'desconhecida'} · Nova emissão: {rascunho.emitidoEm ?? 'desconhecida'}.{perfil.emitidoEm && rascunho.emitidoEm && rascunho.emitidoEm < perfil.emitidoEm && ' Atenção: o novo documento é mais antigo que o perfil atual.'}</p>}
        <ResumoHistorico perfil={rascunho} alterar={setRascunho} />
        <label className="historico-campo">Associar a um curso do catálogo público (opcional)<select value={rascunho.curso.idCurso ?? ''} onChange={e => {
          const campo = 'curso.idCurso'
          setRascunho({ ...rascunho, curso: { ...rascunho.curso, idCurso: e.target.value || null }, correcoes: rascunho.correcoes.some(c => c.campo === campo) ? rascunho.correcoes : [...rascunho.correcoes, { campo, valorOriginal: rascunho.curso.idCurso }] })
        }}><option value="">Sem associação ao catálogo</option>{cursos.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.modalidade})</option>)}</select></label>
        {(!indiceDisponivel || !rascunho.curso.idCurso || !cursos.find(c => c.id === rascunho.curso.idCurso)?.disponivel) && <p className="historico-ajuda">Curso ou currículo não associado ao catálogo disponível. A importação pode continuar; integrações futuras dependem da estrutura correspondente.</p>}
        <p className="historico-ajuda">O código da estrutura do histórico é preservado. Nenhuma matriz mais recente será selecionada automaticamente.</p>
        {precisaSubstituir && <label className="historico-checkbox"><input type="checkbox" checked={substituir} onChange={e => setSubstituir(e.target.checked)} />Confirmo a substituição integral do perfil anterior, sem mesclar tentativas. Se eu escolher somente esta sessão, o perfil anterior salvo será apagado quando estiver acessível.</label>}
        <p>Usar somente nesta sessão mantém os dados em memória até fechar ou recarregar a página. Salvar neste dispositivo grava apenas o perfil estruturado no IndexedDB deste navegador.</p>
        <div className="historico-acoes"><button disabled={ocupado || (precisaSubstituir && !substituir)} onClick={() => usar(false)}>Usar somente nesta sessão</button><button className="historico-primario" disabled={ocupado || (precisaSubstituir && !substituir)} onClick={() => usar(true)}>Salvar neste dispositivo</button><button disabled={ocupado} onClick={limparImportacao}>Descartar resultado</button></div>
      </section>}
    </>}
    <p className="historico-ajuda"><Link to="/privacidade">Privacidade e controle dos dados</Link> · Projeto independente, não oficial da UFCA.</p>
  </main>
}
