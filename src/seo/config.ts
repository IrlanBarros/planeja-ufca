// Confirmado por HTTP 200 e pelo HTML público do Planeja UFCA em 08/11/2026.
export const VERIFIED_PRODUCTION_ORIGIN = 'https://planejaufca.pages.dev'

export function validateSiteUrl(value: string): string {
  const error = 'VITE_SITE_URL deve ser uma origem HTTPS pública de produção, sem caminho, porta, parâmetros ou fragmentos.'
  let url: URL
  try { url = new URL(value) } catch { throw new Error(error) }
  const host = url.hostname
  if (url.protocol !== 'https:' || url.username || url.password || url.port
    || url.pathname !== '/' || url.search || url.hash
    || !host.includes('.') || /^(?:\d+\.){3}\d+$/.test(host) || host.includes(':')
    || /(?:^|\.)(?:localhost|local|test|invalid|example)$/.test(host)
    || host.endsWith('.workers.dev')
    || (host.endsWith('.pages.dev') && host.split('.').length !== 3)) throw new Error(error)
  return url.origin
}

export const siteOrigin = validateSiteUrl(import.meta.env?.VITE_SITE_URL ?? VERIFIED_PRODUCTION_ORIGIN)
export const absoluteUrl = (path: string) => new URL(path, `${siteOrigin}/`).href
