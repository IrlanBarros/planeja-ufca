import { absoluteUrl, siteOrigin } from './config'
import { publicRoutes } from './routes'

export function structuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': absoluteUrl('/#website'), name: 'Planeja UFCA', url: `${siteOrigin}/`, inLanguage: 'pt-BR', description: publicRoutes[0].description },
      { '@type': 'WebApplication', '@id': absoluteUrl('/#application'), name: 'Planeja UFCA', url: `${siteOrigin}/`, inLanguage: 'pt-BR', applicationCategory: 'EducationalApplication', operatingSystem: 'Web', isAccessibleForFree: true, description: 'Projeto independente, não oficial da UFCA, para consultar turmas, montar horários e planejar a graduação com processamento local do histórico.' },
    ],
  }
}

export const serializeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')
