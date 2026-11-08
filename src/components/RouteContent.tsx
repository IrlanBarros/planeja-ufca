import { Component, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'

class RouteErrorBoundary extends Component<{ children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false }
  static getDerivedStateFromError() { return { falhou: true } }
  render() {
    if (this.state.falhou) return <main className="container route-loading">
      <h1>Não foi possível abrir esta página</h1>
      <p role="alert">Confira sua conexão e recarregue a página para tentar novamente.</p>
      <button type="button" onClick={() => window.location.reload()}>Recarregar página</button>
    </main>
    return this.props.children
  }
}

export default function RouteContent() {
  return <RouteErrorBoundary><Suspense fallback={<main className="container route-loading" aria-busy="true"><p role="status">Carregando página…</p></main>}><Outlet /></Suspense></RouteErrorBoundary>
}
