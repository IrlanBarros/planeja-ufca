const TTL_MS = 5 * 60 * 1000
const cache = new Map<string, { criadoEm: number; promise: Promise<unknown> }>()

// Cache exclusivamente dos catálogos públicos. Uma desmontagem não cancela a
// requisição compartilhada; cada consumidor descarta respostas pelo seu signal.
export function carregarJsonPublico<T>(url: string): Promise<T> {
  if (!/^\/data\/(?:cursos-atual\.json|curriculos\/[\w-]+\.json)$/.test(url)) {
    return Promise.reject(new Error('O cache aceita somente catálogos públicos locais.'))
  }
  const existente = cache.get(url)
  if (existente && Date.now() - existente.criadoEm < TTL_MS) return existente.promise as Promise<T>
  const promise = fetch(url, { cache: 'no-cache' }).then(response => {
    if (!response.ok) throw new Error('Não foi possível carregar os dados públicos. Tente novamente.')
    return response.json() as Promise<T>
  }).catch(error => {
    if (cache.get(url)?.promise === promise) cache.delete(url)
    throw error
  })
  cache.set(url, { criadoEm: Date.now(), promise })
  return promise
}

export function limparCachePublico() { cache.clear() }
