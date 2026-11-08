import type { ModoCurriculo } from '../models/types'

export default function SeletorModoCurriculo({ modo, personalizadoDisponivel, alterar }: { modo: ModoCurriculo; personalizadoDisponivel: boolean; alterar: (modo: ModoCurriculo) => void }) {
  return <div className="curriculo-modos" role="group" aria-label="Modo de visualização">
    <button type="button" aria-pressed={modo === 'original'} onClick={() => alterar('original')}>Estrutura original</button>
    <button type="button" aria-pressed={modo === 'progresso'} disabled={!personalizadoDisponivel} aria-describedby={!personalizadoDisponivel ? 'curriculo-vinculo-aviso' : undefined} onClick={() => alterar('progresso')}>Meu progresso</button>
  </div>
}
