import { lazy } from 'react'

export const routePages = [
  { path: '/', load: () => import('./App') },
  { path: '/curriculo', load: () => import('./pages/CurriculoPage') },
  { path: '/historico', load: () => import('./pages/HistoricoPage') },
  { path: '/privacidade', load: () => import('./pages/PrivacidadePage') },
  { path: '/guia-academico', load: () => import('./pages/GuiaAcademicoPage') },
  { path: '/recomendacoes', load: () => import('./pages/RecomendacoesPage') },
].map(route => ({ ...route, Page: lazy(route.load) }))
