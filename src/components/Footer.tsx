import { Link } from 'react-router-dom'

export default function Footer() {
  const initialYear = 2026
  const currentYear = Math.max(initialYear, new Date().getFullYear())
  const years = currentYear === initialYear
    ? String(initialYear)
    : `${initialYear}–${currentYear}`

  return (
    <footer className="site-footer">
      <div className="site-footer-content">
        <strong>Planeja UFCA</strong>
        <p>© {years} Irlan Barros · Autoria e desenvolvimento · Licença MIT</p>
        <p>Projeto independente, não oficial da Universidade Federal do Cariri.</p>
        <p><Link to="/privacidade">Privacidade e dados locais</Link></p>
        <p><Link to="/privacidade#backup-titulo">Exportar ou importar dados locais</Link></p>
      </div>
    </footer>
  )
}
