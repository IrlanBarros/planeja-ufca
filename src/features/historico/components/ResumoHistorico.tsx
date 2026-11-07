import type { HistoricoAcademico, TentativaComponente } from '../models/types'
import { validarHistorico } from '../validation/profile'

interface Props { perfil: HistoricoAcademico; alterar?: (perfil: HistoricoAcademico) => void }
const mostrar = (v: string | number | null) => v ?? 'Não identificado'

export default function ResumoHistorico({ perfil: h, alterar }: Props) {
  function corrigir(campo: string, original: string | number | null, aplicar: (copia: HistoricoAcademico) => void) {
    const copia = structuredClone(h)
    if (!copia.correcoes.some(c => c.campo === campo)) copia.correcoes.push({ campo, valorOriginal: original === null ? null : String(original) })
    aplicar(copia)
    alterar?.(copia)
  }
  function campo(label: string, path: string, valor: string | number | null, aplicar: (h: HistoricoAcademico, v: string) => void, numero = false) {
    const correcao = h.correcoes.find(c => c.campo === path)
    return <label className="historico-campo" key={path}>
      <span>{label}{correcao && <small className="historico-manual"> · Correção manual (extraído: {mostrar(correcao.valorOriginal)})</small>}</span>
      {alterar ? <input type={numero ? 'number' : 'text'} step={numero ? 'any' : undefined} maxLength={300} value={valor ?? ''} onChange={e => corrigir(path, valor, copia => aplicar(copia, e.target.value))} /> : <strong>{mostrar(valor)}</strong>}
    </label>
  }
  function campoRegistro(c: TentativaComponente, i: number, key: keyof Pick<TentativaComponente, 'periodo' | 'codigo' | 'nome' | 'cargaHoraria' | 'turma' | 'frequencia' | 'media' | 'situacao'>, label: string, numero = false) {
    return campo(label, `componentesCursados.${c.id}.${key}`, c[key], (p, v) => {
      if (key === 'cargaHoraria' || key === 'frequencia' || key === 'media') p.componentesCursados[i][key] = v === '' ? null : Number(v)
      else if (key === 'codigo') p.componentesCursados[i].codigo = v
      else p.componentesCursados[i][key] = v || null
    }, numero)
  }
  const avisos = [...new Set([...h.validacao.advertencias, ...h.validacao.camposNaoReconhecidos, ...validarHistorico(h)])]
  return <div className="historico-resumo">
    <div className="historico-grid">
      {campo('Curso', 'curso.nome', h.curso.nome, (p, v) => { p.curso.nome = v || null; p.curso.idCurso = null })}
      {campo('Estrutura curricular', 'curso.estruturaCurricular', h.curso.estruturaCurricular, (p, v) => { p.curso.estruturaCurricular = v || null })}
      {campo('Período letivo atual (conforme SIGAA)', 'vinculo.periodoAtual', h.vinculo.periodoAtual, (p, v) => { p.vinculo.periodoAtual = v || null })}
      <div><span>Documento emitido em</span><strong>{h.emitidoEm ? h.emitidoEm.split('-').reverse().join('/') : 'Não identificado'}</strong></div>
      <div><span>Situação do vínculo</span><strong>{mostrar(h.vinculo.situacao)}</strong></div>
      <div><span>Ingresso</span><strong>{mostrar(h.vinculo.periodoIngresso)}</strong></div>
      <div><span>Prazo padrão / máximo</span><strong>{mostrar(h.vinculo.prazoPadrao)} / {mostrar(h.vinculo.prazoMaximo)}</strong></div>
      <div><span>Suspensões</span><strong>{mostrar(h.vinculo.suspensoes)}</strong></div>
    </div>
    <h3>Índices oficiais do SIGAA</h3>
    <p className="historico-ajuda">Valores extraídos do documento, sem recálculo.</p>
    <dl className="historico-indices">{Object.entries(h.indicesOficiais).map(([k, v]) => <div key={k}><dt>{k.toUpperCase()}</dt><dd>{mostrar(v)}</dd></div>)}</dl>
    <h3>Carga horária oficial</h3>
    <div className="historico-tabela"><table><caption>Carga horária em horas, conforme o documento</caption><thead><tr><th>Categoria</th><th>Exigida</th><th>Integralizada</th><th>Pendente</th></tr></thead><tbody>
      {Object.entries(h.cargaHoraria).map(([k, v]) => <tr key={k}><th>{({ obrigatorias: 'Obrigatórias', optativas: 'Optativas', complementares: 'Complementares', total: 'Total' })[k]}</th><td>{mostrar(v.exigida)}</td><td>{mostrar(v.integralizada)}</td><td>{mostrar(v.pendente)}</td></tr>)}
    </tbody></table></div>
    {avisos.length > 0 && <section className="historico-aviso" aria-label="Advertências da importação"><h3>Confira as informações</h3><p>Algumas informações precisam de conferência. Campos desconhecidos foram mantidos sem estimativas. Os avisos da extração permanecem disponíveis após correções.</p><ul>{avisos.map(a => <li key={a}>{a}</li>)}</ul></section>}
    <details><summary>Componentes cursados ou em andamento · {h.componentesCursados.length} registros</summary>
      <p>Cada tentativa é mantida separadamente. MATR indica matrícula no documento e não confirma aprovação.</p>
      {h.componentesCursados.map((c, i) => <article className="historico-registro" key={c.id}>
        <h4>{c.periodo ?? 'Período desconhecido'} · {c.codigo} · {c.nome ?? 'Nome não identificado'}</h4>
        <p>{mostrar(c.cargaHoraria)} h · Turma {mostrar(c.turma)} · Frequência {mostrar(c.frequencia)} · Média {mostrar(c.media)} · Situação {mostrar(c.situacao)}</p>
        <p>Marcadores: {c.marcadores.join(' ') || 'Nenhum'}{c.tipo && ` · ${c.tipo}`}{h.correcoes.some(x => x.campo.startsWith(`componentesCursados.${c.id}.`)) && <strong className="historico-manual"> · Corrigido manualmente</strong>}</p>
        {alterar && <details><summary>Corrigir ou rejeitar registro {i + 1}</summary><div className="historico-grid">
          {campoRegistro(c, i, 'periodo', 'Período')}{campoRegistro(c, i, 'codigo', 'Código')}{campoRegistro(c, i, 'nome', 'Nome')}
          {campoRegistro(c, i, 'cargaHoraria', 'Carga horária', true)}{campoRegistro(c, i, 'turma', 'Turma')}{campoRegistro(c, i, 'frequencia', 'Frequência (%)', true)}
          {campoRegistro(c, i, 'media', 'Média', true)}{campoRegistro(c, i, 'situacao', 'Situação')}
        </div><button type="button" onClick={() => corrigir(`componentesCursados.${c.id}.rejeitado`, c.codigo, p => { p.componentesCursados.splice(i, 1) })}>Rejeitar este registro</button></details>}
      </article>)}
    </details>
    <details><summary>Componentes obrigatórios pendentes · {h.componentesPendentes.length}</summary><p>Uma disciplina matriculada pode continuar nesta relação oficial.</p><div className="historico-tabela"><table><thead><tr><th>Código</th><th>Nome</th><th>CH</th><th>Observação</th></tr></thead><tbody>{h.componentesPendentes.map((c, i) => <tr key={i}><td>{c.codigo}</td><td>{mostrar(c.nome)}</td><td>{mostrar(c.cargaHoraria)}</td><td>{c.observacao ?? '—'}</td></tr>)}</tbody></table></div></details>
    <details><summary>Equivalências registradas · {h.equivalencias.length}</summary><p>Relações direcionais do documento, sem presumir intercâmbio entre disciplinas.</p><ul>{h.equivalencias.map((e, i) => <li key={i}>Cumpriu {e.codigoExigido} — {e.nomeExigido} através de {e.codigoUtilizado} — {e.nomeUtilizado}.</li>)}</ul></details>
    <details><summary>Atividades autônomas · {h.atividadesAutonomas.length}</summary><ul>{h.atividadesAutonomas.map((a, i) => <li key={i}>{a.categoria}: {mostrar(a.cargaHoraria)} h</li>)}</ul></details>
    {h.correcoes.length > 0 && <details><summary>Alterações manuais · {h.correcoes.length}</summary><ul>{h.correcoes.map(c => <li key={c.campo}>{c.campo} · valor extraído: {mostrar(c.valorOriginal)}</li>)}</ul><p>Os demais valores são os extraídos do documento. Registros rejeitados não integram o perfil ativo.</p></details>}
  </div>
}
