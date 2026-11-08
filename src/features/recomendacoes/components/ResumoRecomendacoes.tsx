import type { HistoricoAcademico } from '../../historico/models/types'
import type { ResultadoRecomendacoes } from '../models/types'

export default function ResumoRecomendacoes({ perfil, periodo, resultado }: { perfil: HistoricoAcademico; periodo: string; resultado: ResultadoRecomendacoes }) {
  return <section className="planejador-painel" aria-labelledby="resumo-planejamento"><h2 id="resumo-planejamento">Seu planejamento acadêmico</h2>
    <p>{perfil.curso.nome} · Matriz {perfil.curso.estruturaCurricular} · Oferta {periodo}</p>
    <p>Baseado no histórico emitido em {perfil.emitidoEm ? perfil.emitidoEm.split('-').reverse().join('/') : 'data não identificada'}.</p>
    <dl className="planejador-resumo">
      <div><dt>Exigências obrigatórias não concluídas</dt><dd>{resultado.pendentes}</dd></div>
      <div><dt>Componentes com requisitos conhecidos satisfeitos</dt><dd>{resultado.elegiveis}</dd></div>
      <div><dt>Componentes com oferta identificada</dt><dd>{resultado.ofertados}</dd></div>
      <div><dt>Componentes no conjunto sugerido</dt><dd>{resultado.itens.filter(i => i.categoria === 'recomendadas').length}</dd></div>
    </dl><p className="planejador-ajuda">Optativas são oportunidades de escolha para cumprir a carga exigida; cada opção não é uma pendência obrigatória.</p>
  </section>
}
