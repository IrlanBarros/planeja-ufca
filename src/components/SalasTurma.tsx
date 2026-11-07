import type { Turma } from '../types'
import { descreverSalas } from '../utils/salas'

export default function SalasTurma({ turma }: { turma: Turma }) {
  return (
    <div className="salas-turma">
      {descreverSalas(turma).map((descricao, index) => (
        <span key={index}>{descricao}</span>
      ))}
    </div>
  )
}
