import { Link } from 'react-router-dom'
import type { ComponenteCurricular } from '../../../types'
import type { EstadoVisual, ProgressoCurricular } from '../models/types'
import { ROTULOS_ESTADO } from '../models/types'

export default function ResumoProgresso({ progresso, componentes, emitidoEm, periodoReferencia }: { progresso: ProgressoCurricular; componentes: ComponenteCurricular[]; emitidoEm: string | null; periodoReferencia: string | null }) {
  const unicos = [...new Map(componentes.map(c => [c.codigo, c])).values()]
  return <section className="curriculo-progresso" aria-labelledby="progresso-titulo">
    <h2 id="progresso-titulo">Progresso da graduação</h2>
    <p>Histórico emitido em {emitidoEm ?? 'data desconhecida'}. Referência temporal: {periodoReferencia ? `oferta pública ${periodoReferencia}` : 'oferta pública indisponível'}.</p>
    <div className="curriculo-indicadores">{progresso.indicadores.map(i => <div key={i.chave} className="curriculo-indicador">
      <h3>{i.rotulo}</h3>
      <strong>{i.percentual === null ? 'Percentual indisponível' : `${i.percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% concluído`}</strong>
      <p>{i.integralizada ?? 'Não informadas'}h integralizadas de {i.exigida ?? 'não informadas'}h exigidas · {i.pendente ?? 'não informadas'}h pendentes.</p>
      {i.percentual !== null && <progress aria-label={i.rotulo} value={i.integralizada!} max={i.exigida!}>{i.percentual}%</progress>}
      {i.aviso && <p>{i.aviso}</p>}
    </div>)}</div>
    <div className="curriculo-contagens">{(['obrigatoria', 'optativa'] as const).map(tipo => <div key={tipo}>
      <h3>{tipo === 'obrigatoria' ? 'Componentes obrigatórios' : 'Catálogo de optativas'}</h3>
      <ul>{(Object.keys(ROTULOS_ESTADO) as EstadoVisual[]).map(estado => <li key={estado}>{ROTULOS_ESTADO[estado]}: <strong>{unicos.filter(c => c.tipo === tipo && progresso.situacoes.get(c.codigo)?.estado === estado).length}</strong></li>)}</ul>
    </div>)}</div>
    <p>As quantidades representam exigências distintas da matriz, sem duplicar tentativas. Optativas são alternativas de escolha: seu progresso considera a carga horária oficial, sem exigir todas as opções.</p>
    {!!progresso.avisos.length && <aside className="curriculo-aviso" aria-label="Advertências do progresso"><ul>{progresso.avisos.map(aviso => <li key={aviso}>{aviso}</li>)}</ul><Link to="/historico">Conferir ou atualizar meu histórico</Link></aside>}
  </section>
}
