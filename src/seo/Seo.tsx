import { useLocation } from 'react-router-dom'
import { absoluteUrl } from './config'
import { findRouteSeo, notFoundSeo } from './routes'
import { serializeJsonLd, structuredData } from './structuredData'

// React 19 move title/meta/link para o head, inclusive na pré-renderização.
// Somente textos públicos constantes: nunca recebe perfil, seleção ou parâmetros.
export default function Seo() {
  const { pathname } = useLocation()
  const route = findRouteSeo(pathname)
  const { title, description } = route ?? notFoundSeo
  const canonical = route ? absoluteUrl(route.path) : null
  return <>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta name="robots" content={route ? 'index, follow' : 'noindex, follow'} />
    {canonical && <link rel="canonical" href={canonical} />}
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    {canonical && <meta property="og:url" content={canonical} />}
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:site_name" content="Planeja UFCA" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    {route?.path === '/' && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData()) }} />}
  </>
}
