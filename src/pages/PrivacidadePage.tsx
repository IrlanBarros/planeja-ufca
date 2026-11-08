import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BackupLocal from '../features/backup/BackupLocal'
import '../App.css'
import './HistoricoPage.css'

export default function PrivacidadePage() {
  const { hash } = useLocation()
  useEffect(() => {
    if (hash === '#backup-titulo') document.getElementById('backup-titulo')?.scrollIntoView?.()
  }, [hash])
  return <main className="container historico-page"><Link to="/">← Voltar aos horários</Link><header><h1>Privacidade e dados locais</h1><p>Projeta UFCA · Projeto independente, não oficial da Universidade Federal do Cariri.</p></header>
    <section className="historico-card"><h2>Finalidade e dados públicos</h2><p>O site permite consultar turmas, montar horários e visualizar currículos com informações públicas do SIGAA. Cursos, turmas, docentes, salas e matrizes são arquivos públicos consultados pelo navegador. Não há contas ou autenticação.</p>
      <h2>Importação opcional do histórico</h2><p>O histórico escolar contém dados pessoais, inclusive identificadores civis e institucionais. Após sua autorização, o PDF é lido neste navegador com o PDF.js e um worker servido pelo próprio site. O arquivo e seu conteúdo não são enviados a servidores, APIs de inteligência artificial, analytics ou serviços de OCR pelo fluxo de importação.</p>
      <p>O perfil utiliza curso, estrutura curricular, vínculo, períodos, prazos, suspensões, índices oficiais, tentativas de disciplinas, situações, notas, frequências, cargas horárias, pendências, equivalências e atividades autônomas. Correções manuais ficam identificadas com o valor acadêmico extraído originalmente.</p>
      <p>Nome completo, matrícula, CPF, RG, nascimento, nacionalidade, naturalidade e código de verificação não integram o perfil. O texto bruto e o PDF ficam temporariamente em memória durante a leitura e suas referências são liberadas após o processamento. O PDF original não é salvo.</p>
      <h2>Você escolhe se deseja salvar</h2><p>Autorizar a análise não autoriza a gravação permanente. Depois da conferência, “Usar somente nesta sessão” mantém o perfil na memória da aplicação durante a navegação; recarregar ou fechar a página o descarta. “Salvar neste dispositivo” grava o perfil estruturado em IndexedDB neste navegador para visitas futuras. Esse armazenamento é diferente do cache de arquivos do navegador.</p>
      <p>O armazenamento local não é uma conta, cópia de segurança ou sincronização entre dispositivos. O navegador pode bloquear ou eliminar dados locais. Quem tem acesso ao seu dispositivo, perfil de navegador ou extensões com permissões suficientes poderá acessar informações locais. Em dispositivos compartilhados, prefira somente a sessão e feche a página ao terminar.</p>
      <h2>Atualização e exclusão</h2><p>Em <Link to="/historico">Meu Histórico Acadêmico</Link>, importe uma versão atualizada, confira as datas e confirme a substituição integral. Não há mesclagem automática de documentos. “Apagar meus dados acadêmicos” pede confirmação e remove o perfil salvo e o perfil em memória. Horários e tema são preservados. Você também pode limpar os dados deste site nas configurações do navegador.</p>
      <h2>Preferências e hospedagem</h2><p>O tema e os horários escolhidos são guardados separadamente em localStorage. O site é hospedado no Cloudflare Pages; o acesso a páginas e arquivos pode envolver tratamento de informações técnicas de conexão pela infraestrutura de hospedagem, como endereço IP e registros de acesso. Isso é distinto do processamento local do histórico.</p>
      <h2>Limites e escolhas</h2><p>A funcionalidade é opcional. Recusar a análise não bloqueia as ferramentas públicas. As recomendações acadêmicas usam o perfil conferido, a matriz correspondente, a oferta pública e preferências de planejamento, com regras determinísticas executadas neste navegador. Os resultados não são persistidos; apagar o perfil invalida as recomendações. As preferências de planejamento ficam na memória desta página. Não há OCR nem cálculo de novos índices. Confira os dados com o documento e consulte a UFCA para decisões oficiais. A arquitetura local não constitui garantia jurídica de conformidade; a avaliação de base legal e a documentação jurídica definitiva são etapas separadas.</p>
    </section><BackupLocal /><Link to="/historico">Acessar Meu Histórico Acadêmico</Link>
  </main>
}
