import type { ComponenteCurricular } from '../../../types'
import type { AvaliacaoRegra } from '../../recomendacoes/models/types'
import type { SituacaoVisual } from '../models/types'
import { ROTULOS_ESTADO } from '../models/types'

function DetalheRequisito({ titulo, avaliacao }: { titulo: string; avaliacao: AvaliacaoRegra }) {
  const rotulos = { satisfeito: 'Satisfeito', 'nao-satisfeito': 'Pendente', indeterminado: 'A verificar' }
  return <div><dt>{titulo} — {rotulos[avaliacao.estado]}</dt><dd>{avaliacao.descricao}</dd></div>
}

export default function ComponenteCurriculoCard({ componente: c, situacao }: { componente: ComponenteCurricular; situacao?: SituacaoVisual }) {
  return <details className={`componente-curricular${situacao ? ` estado-${situacao.estado}` : c.tipo === 'optativa' ? ' componente-curricular-optativa' : ''}`}>
    <summary>
      <span className="curriculo-card-titulo"><strong>{c.codigo} — {c.nome}</strong><span>{c.carga_horaria}h</span></span>
      {situacao && <span className={`curriculo-situacao estado-${situacao.estado}`}>{ROTULOS_ESTADO[situacao.estado]}</span>}
      {c.pre_requisitos_expressao && <span className="curriculo-card-pre">Pré-requisitos: {c.pre_requisitos_expressao}</span>}
      <span className="curriculo-card-acao">Consultar detalhes</span>
    </summary>
    <div className="curriculo-card-detalhes">
      <dl>
        <div><dt>Tipo curricular</dt><dd>{c.tipo === 'obrigatoria' ? 'Obrigatória' : 'Optativa — alternativa de escolha'}</dd></div>
        <div><dt>Período recomendado</dt><dd>{c.nivel === null ? 'Não definido' : `${c.nivel}º período`}</dd></div>
        <div><dt>Pré-requisitos registrados</dt><dd>{c.pre_requisitos_expressao ?? (c.pre_requisitos_codigos.join(', ') || 'Nenhum registrado')}</dd></div>
        <div><dt>Correquisitos registrados</dt><dd>{c.co_requisitos_expressao ?? (c.co_requisitos_codigos.join(', ') || 'Nenhum registrado')}</dd></div>
        <div><dt>Equivalências disponíveis</dt><dd>{c.equivalencias_expressao ?? (c.equivalencias_codigos.join(', ') || 'Nenhuma registrada')}</dd></div>
        {situacao && <>
          <div><dt>Situação acadêmica: {ROTULOS_ESTADO[situacao.estado]}</dt><dd>{situacao.justificativa}</dd></div>
          <DetalheRequisito titulo="Pré-requisitos" avaliacao={situacao.preRequisitos} />
          <DetalheRequisito titulo="Correquisitos" avaliacao={situacao.coRequisitos} />
          {situacao.academica.origem && <div><dt>Origem do cumprimento</dt><dd>{situacao.academica.origem}</dd></div>}
        </>}
      </dl>
      {situacao && !!situacao.academica.tentativas.length && <div><h4>Tentativas registradas</h4><ul>{situacao.academica.tentativas.map((t, i) => <li key={`${t.id}-${i}`}>
        {t.codigo} · {t.periodo ?? 'Período desconhecido'} · {t.situacao ?? 'Situação desconhecida'}{t.media !== null ? ` · média ${t.media}` : ''}
      </li>)}</ul></div>}
      {situacao && !!situacao.academica.advertencias.length && <ul aria-label="Advertências do componente">{situacao.academica.advertencias.map(a => <li key={a}>{a}</li>)}</ul>}
    </div>
  </details>
}
