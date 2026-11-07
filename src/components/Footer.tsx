export default function Footer() {
  const initialYear = 2026
  const currentYear = Math.max(initialYear, new Date().getFullYear())
  const years = currentYear === initialYear
    ? String(initialYear)
    : `${initialYear}–${currentYear}`

  return (
    <footer className="site-footer">
      <div className="site-footer-content">
        <strong>Seu Horário UFCA</strong>
        <p>© {years} Irlan Barros · Autoria e desenvolvimento · Licença MIT</p>
        <p>Projeto independente, não oficial da Universidade Federal do Cariri.</p>
      </div>
    </footer>
  )
}
