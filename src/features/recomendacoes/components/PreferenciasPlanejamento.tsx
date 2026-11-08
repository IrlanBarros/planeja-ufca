import { useState } from 'react'
import type { PreferenciasPlanejamento as Preferencias, Turno } from '../models/types'

const DIAS = [[1, 'Domingo'], [2, 'Segunda'], [3, 'Terça'], [4, 'Quarta'], [5, 'Quinta'], [6, 'Sexta'], [7, 'Sábado']] as const
const TURNOS: [Turno, string][] = [['manha', 'Manhã'], ['tarde', 'Tarde'], ['noite', 'Noite']]
export default function PreferenciasPlanejamento({ preferencias, alterar }: { preferencias: Preferencias; alterar: (p: Preferencias) => void }) {
  const [rascunho, setRascunho] = useState(preferencias)
  return <form className="planejador-painel" onSubmit={e => { e.preventDefault(); alterar(rascunho) }}>
    <h2>Como você quer planejar?</h2>
    <div className="planejador-campos">
      <label>Carga horária semestral pretendida (h)<input type="number" min="0" step="1" required value={Number.isFinite(rascunho.cargaHoraria) ? rascunho.cargaHoraria : ''} onChange={e => setRascunho({ ...rascunho, cargaHoraria: e.target.valueAsNumber })} /></label>
      <label>Estratégia de planejamento<select value={rascunho.estrategia} onChange={e => setRascunho({ ...rascunho, estrategia: e.target.value as Preferencias['estrategia'] })}>
        <option value="equilibrado">Equilibrado</option><option value="avanco">Priorizar avanço</option><option value="concentrar">Concentrar horários</option>
      </select></label>
    </div>
    <fieldset><legend>Dias disponíveis</legend><div className="planejador-opcoes">{DIAS.map(([dia, nome]) => <label key={dia}><input type="checkbox" checked={rascunho.dias.includes(dia)} onChange={e => setRascunho({ ...rascunho, dias: e.target.checked ? [...rascunho.dias, dia] : rascunho.dias.filter(d => d !== dia) })} />{nome}</label>)}</div></fieldset>
    <fieldset><legend>Turnos disponíveis</legend><div className="planejador-opcoes">{TURNOS.map(([turno, nome]) => <label key={turno}><input type="checkbox" checked={rascunho.turnos.includes(turno)} onChange={e => setRascunho({ ...rascunho, turnos: e.target.checked ? [...rascunho.turnos, turno] : rascunho.turnos.filter(t => t !== turno) })} />{nome}</label>)}</div></fieldset>
    <p className="planejador-ajuda">Manhã: antes das 12h; tarde: 12h–18h; noite: a partir das 18h. A carga é uma preferência, sujeita aos limites oficiais do curso. Inclui as turmas já selecionadas. Preferências usadas somente nesta página.</p>
    <button className="planejador-primario" type="submit">Gerar recomendações</button>
  </form>
}
