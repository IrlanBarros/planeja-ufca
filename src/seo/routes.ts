export interface RouteSeo {
  path: string
  title: string
  description: string
}

export const publicRoutes: RouteSeo[] = [
  { path: '/', title: 'Planeja UFCA — Monte seu Horário e Planeje sua Graduação', description: 'Organize seus horários na UFCA, consulte disciplinas e estruturas curriculares, acompanhe sua graduação e receba recomendações acadêmicas personalizadas.' },
  { path: '/curriculo', title: 'Estruturas Curriculares da UFCA — Planeja UFCA', description: 'Consulte matrizes curriculares da UFCA, conheça disciplinas e pré-requisitos e acompanhe seu progresso acadêmico de forma personalizada.' },
  { path: '/historico', title: 'Histórico Acadêmico da UFCA — Planeja UFCA', description: 'Importe seu histórico acadêmico da UFCA diretamente no navegador e acompanhe sua trajetória acadêmica com privacidade.' },
  { path: '/recomendacoes', title: 'Recomendações de Disciplinas da UFCA — Planeja UFCA', description: 'Descubra disciplinas para considerar no próximo semestre com recomendações baseadas em currículo, pré-requisitos e oferta acadêmica.' },
  { path: '/guia-academico', title: 'MC, MCN, IECH, IEPL e IEA: Índices da UFCA — Planeja UFCA', description: 'Entenda os principais índices acadêmicos da UFCA, suas fórmulas, exemplos e interpretações com explicações simples.' },
  { path: '/privacidade', title: 'Privacidade e Dados Locais — Planeja UFCA', description: 'Entenda como o Planeja UFCA processa históricos acadêmicos localmente e como você pode controlar seus dados.' },
]

export const notFoundSeo: RouteSeo = {
  path: '/404', title: 'Página não encontrada — Planeja UFCA',
  description: 'Esta página não foi encontrada. Acesse as ferramentas de planejamento acadêmico do Planeja UFCA.',
}

export function findRouteSeo(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/'
  return publicRoutes.find(route => route.path === path)
}
