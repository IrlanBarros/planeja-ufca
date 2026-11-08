import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import IndiceCard from '../features/guia-academico/components/IndiceCard'
import ExplicacaoIndice from '../features/guia-academico/components/ExplicacaoIndice'
import GlossarioAcademico from '../features/guia-academico/components/GlossarioAcademico'
import { indices } from '../features/guia-academico/data/indices'
import { fontes, verificacaoNormativa } from '../features/guia-academico/data/fontes'
import './GuiaAcademicoPage.css'

export default function GuiaAcademicoPage() {
  const { hash } = useLocation()
  // React Router não rola até âncoras após montar a página de destino.
  useEffect(() => {
    const alvo = document.getElementById(hash.slice(1))
    if (alvo) { alvo.scrollIntoView?.(); alvo.focus({ preventScroll: true }) }
  }, [hash])

  return <main className="container guia-page">
    <Link to="/">← Voltar aos horários</Link>
    <header>
      <p className="guia-etiqueta">Para entender sua trajetória</p>
      <h1>Guia Acadêmico da UFCA</h1>
      <p>Entenda seus índices acadêmicos e descubra o que cada informação do seu histórico realmente significa.</p>
    </header>
    <aside className="guia-introducao" aria-label="Sobre este guia">
      <p>Você pode consultar todo o guia sem importar um histórico. As explicações e os exemplos são educativos; os valores individuais continuam sendo os oficiais extraídos do SIGAA, sem recálculo.</p>
      <p>Índices descrevem partes da trajetória, mas não definem sua capacidade nem preveem sua formatura. Para decisões acadêmicas, confira as normas e os canais institucionais.</p>
    </aside>
    <nav className="guia-atalhos" aria-label="Seções do guia">
      <a href="#indices">Índices oficiais</a><a href="#glossario">Glossário acadêmico</a><a href="#fontes">Fontes e verificação</a>
    </nav>
    <section aria-labelledby="indices">
      <h2 id="indices" tabIndex={-1}>Índices oficiais de rendimento acadêmico</h2>
      <p>Comece pela pergunta que você quer responder. Cada índice observa uma dimensão diferente.</p>
      <div className="guia-cards">{indices.map(x => <IndiceCard key={x.id} indice={x} />)}</div>
    </section>
    {indices.map(x => <ExplicacaoIndice key={x.id} indice={x} />)}
    <GlossarioAcademico />
    <section className="guia-fontes" aria-labelledby="fontes">
      <h2 id="fontes" tabIndex={-1}>Fontes oficiais e última verificação</h2>
      <p>Normas verificadas em <time dateTime={verificacaoNormativa.data}>{verificacaoNormativa.exibicao}</time>. O conteúdo não é atualizado automaticamente e pode precisar de revisão após novas normas.</p>
      <ul>{Object.values(fontes).map(f => <li key={f.url}><a href={f.url}>{f.titulo}</a></li>)}</ul>
      <p>A base é a Resolução Consuni nº 157/2023, com as alterações nº 279/2025 e nº 308/2026. A nº 308 foi homologada pela nº 313/2026. Foram consultados os arts. 109–114 e o Anexo I nas versões compilada e com alterações marcadas.</p>
      <p>A consulta ao catálogo do Consuni não identificou alteração posterior desses dispositivos. A suspensão do art. 183 pela Resolução nº 307/2026, homologada pela nº 312/2026, trata de outro dispositivo e não altera as fórmulas apresentadas.</p>
      <p>Os significados das situações foram conferidos na legenda de histórico do SIGAA/UFCA. Há diferenças entre a legenda e o regulamento quanto às descrições de faixas de notas; veja a observação no glossário. Não se deduzem regras para códigos desconhecidos.</p>
      <p><Link to="/historico">Consultar meu histórico acadêmico</Link></p>
    </section>
  </main>
}
