import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return <main className="container">
    <h1>Página não encontrada</h1>
    <p>O endereço solicitado não corresponde a uma página do Planeja UFCA.</p>
    <p><Link to="/">Acessar horários e ferramentas acadêmicas</Link></p>
  </main>
}
