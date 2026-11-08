import type { Recomendacao } from '../models/types'

export default function ExplicacaoRecomendacao({ item }: { item: Recomendacao }) {
  return <details className="planejador-explicacao"><summary>Por que esta disciplina foi recomendada ou classificada?</summary>
    <p>Pré-requisitos: {item.preRequisitos.descricao}</p><p>Correquisitos: {item.coRequisitos.descricao}</p>
    <ul>{item.fatores.map(f => <li key={f.criterio}>{f.motivo} (+{f.pontos})</li>)}</ul>
    <p>Pontuação interna: {item.pontuacao}. Heurística do Planeja UFCA, sem caráter institucional.</p>
    <p>Dependentes diretos: {item.dependencias.diretas.join(', ') || 'nenhum'}. Indiretos: {item.dependencias.indiretas.join(', ') || 'nenhum'}. Desbloqueios imediatos estimados: {item.dependencias.desbloqueios.join(', ') || 'nenhum'}.</p>
    <p>Situação: {item.situacao.estado}. {item.situacao.origem}</p>
    {item.situacao.tentativas.length > 0 && <ul aria-label="Tentativas preservadas">{item.situacao.tentativas.map((t, i) => <li key={`${t.id}-${i}`}>{t.codigo} · {t.periodo ?? 'período desconhecido'} · {t.situacao ?? 'situação desconhecida'}</li>)}</ul>}
    <p className="planejador-ajuda">Fontes: {item.fontes.join(' · ')}.</p>
  </details>
}
