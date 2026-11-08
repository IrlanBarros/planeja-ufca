# SEO técnico e desempenho — Planeja UFCA

Auditoria e implementação em 08/11/2026. O código está preparado para publicação; esta tarefa não publicou uma nova versão, não realizou commits/pushes e não cadastrou o site no Search Console.

## 1. Diagnóstico inicial

- React 19.2.8, React Router 7.18.3 e Vite 8.2.2. As seis páginas eram importadas diretamente no roteador.
- Um único HTML vazio no `#root`, com título e descrição genéricos. As rotas recebiam os mesmos metadados e dependiam do JavaScript para apresentar conteúdo.
- Ausência de canonical, `og:url`, Twitter Cards, JSON-LD, sitemap e robots.txt. Não foram encontradas restrições de indexação no código ou cabeçalhos de produção que precisassem ser removidas.
- Links reais já existiam, mas os atalhos principais dependiam da abertura da ferramenta de horários. `/curriculo` sem parâmetros apresentava um erro, em vez de oferecer uma entrada pública útil.
- O início comunicava apenas a marca, sem explicar o conjunto das ferramentas. Os títulos das disciplinas estavam no mesmo nível da seção que os continha.
- Não existia rota de recurso não encontrado. A consulta pública a uma URL inexistente retornou HTTP 200 com o HTML inicial, pelo fallback de SPA.
- `jsPDF` era importado estaticamente pela exportação de horários. A exportação curricular e o PDF.js já utilizavam importações dinâmicas; essas estratégias foram preservadas.
- Consultas de oferta, índice e arquivos curriculares se repetiam entre páginas e hooks, sem reaproveitamento das respostas e do parsing.
- O CSS utilizava fontes de sistema; não havia fonte externa ou imagem principal bloqueando a renderização. Assets de demonstração sem importação não entram no build.

### Domínio e infraestrutura observados

`https://planejaufca.pages.dev` foi confirmado com HTTP 200 e HTML que identifica o Planeja UFCA. A oferta pública respondeu com `Content-Encoding: br`, `ETag` e `Cache-Control: public, max-age=0, must-revalidate`. A página inicial e o guia também responderam 200. A consulta atual a `projetaufca.pages.dev` não resolveu DNS.

Isso verifica o serviço público, mas não revela as configurações administrativas, domínios próprios associados ou a propriedade dos projetos antigos. Não foi acessada a conta Cloudflare. Os registros anteriores de migração são históricos; não confirmam o estado atual desses projetos.

## 2. Metadados e política de indexação

`src/seo/config.ts` concentra a origem pública confirmada. `VITE_SITE_URL` permite substituí-la por um domínio próprio confirmado antes do build. A validação exige HTTPS e rejeita caminhos, parâmetros, fragmentos, credenciais, portas não padrão, endereços locais, IPs, domínios de teste e subdomínios de preview do Pages. Uma configuração inválida interrompe o build com erro explícito. Não se usa `window.location.origin` nem `CF_PAGES_URL` para inventar uma origem canônica.

`routes.ts` define títulos e descrições exclusivos das seis páginas. `Seo.tsx` utiliza o suporte nativo do React 19 a `title`, `meta` e `link`, sem dependência adicional de gerenciamento de head. O mesmo componente é usado no HTML estático e na navegação. O template original mantém somente metadados gerais e o bootstrap de tema, evitando tags concorrentes.

Cada página possui description, canonical absoluto, Open Graph (`title`, `description`, `url`, `type`, `locale`, `site_name`), Twitter Card `summary` e diretiva de indexação. O idioma permanece `pt-BR`. Não foi criada uma imagem social: não existe uma peça editorial apropriada no projeto; `summary` funciona sem inventar esse recurso.

| Rota canônica | Conteúdo entregue no HTML | Indexação |
| --- | --- | --- |
| `/` | Apresentação do planejamento acadêmico, acesso às ferramentas e estado inicial da consulta | `index, follow` |
| `/curriculo` | Apresentação da consulta de matrizes e orientação para escolha de curso | `index, follow` |
| `/historico` | Explicação pública da importação, conferência e privacidade | `index, follow` |
| `/recomendacoes` | Explicação pública dos critérios e requisitos do planejamento | `index, follow` |
| `/guia-academico` | Guia existente completo, com exemplos, fórmulas, dúvidas, âncoras e fontes oficiais | `index, follow` |
| `/privacidade` | Política existente e controles de dados locais | `index, follow` |
| Demais caminhos | Página não encontrada | `noindex, follow`, sem canonical |

Parâmetros de curso, estrutura, modo e fragmentos não entram nas URLs canônicas. Não foram criadas páginas individuais de índices: o guia já tem seções navegáveis suficientes, e dividir o conteúdo não justificaria novas URLs.

As ferramentas são indexáveis por suas apresentações públicas. Os resultados pessoais existem somente no navegador do estudante: não há URL de perfil, endpoint de histórico ou conteúdo pessoal no HTML gerado. Os metadados não recebem perfil, notas, seleção de turmas ou parâmetros de pesquisa. A indexação da introdução não transforma armazenamento local em conteúdo público; robots.txt não é usado como proteção de dados.

### Sitemap e robots.txt

O build gera `dist/sitemap.xml` com exatamente as seis URLs canônicas, usando a mesma origem e lista de rotas dos metadados. Não há parâmetros, fragmentos, previews, URLs inexistentes ou `lastmod` inventado.

`public/robots.txt` é um template que permite o rastreamento. O build acrescenta a referência absoluta ao sitemap em `dist/robots.txt`. Publique a saída completa do build; não copie apenas o template de `public/`. JavaScript, CSS, worker e dados públicos permanecem acessíveis.

### Dados estruturados

A página inicial contém JSON-LD com `WebSite` e `WebApplication`, nome, URL, idioma, descrição, categoria educacional, acesso gratuito e indicação de projeto independente. Não há avaliações, estrelas, organização institucional ou dados pessoais. A serialização escapa `<`.

Em 08/11/2026, o trecho público foi submetido ao [validador oficial do Schema.org](https://validator.schema.org/): **2 itens, 0 erros, 0 avisos**. A validade semântica não implica elegibilidade aos resultados enriquecidos de aplicativos do Google, que possuem requisitos próprios. Não foram inventadas propriedades para obter esse resultado.

## 3. Pré-renderização, navegação e 404

Foi adotada geração estática em tempo de build, com as APIs instaladas do React 19 e um segundo build Vite para Node. Não há SSR por requisição, servidor persistente, Pages Function, Worker ou migração de framework.

O build carrega o módulo da rota antes de renderizá-la. O tamanho progressivo do renderer estático é configurado para manter também o guia extenso no HTML visível, sem segmentos ocultos de streaming. A validação falha se houver fallback de rota ou segmentos que dependam de scripts para revelar o conteúdo.

São gerados `index.html`, `curriculo.html`, `historico.html`, `recomendacoes.html`, `guia-academico.html`, `privacidade.html` e `404.html`. O Pages resolve os arquivos nas URLs sem extensão. O 404 só foi introduzido depois de dar um arquivo real a cada rota pública; portanto o acesso direto deixa de depender do fallback genérico de SPA. `_redirects` é gerado apenas para normalizar a barra final das cinco rotas internas, preservando parâmetros. Não existe regra coringa que intercepte recursos estáticos.

O cliente conserva o HTML enquanto carrega o módulo da primeira página e usa `hydrateRoot`. Em desenvolvimento, com raiz vazia, utiliza `createRoot`. As demais rotas usam `React.lazy` e `Suspense`, com mensagem acessível e recuperação de erros de carregamento. Os providers continuam acima das rotas, preservando perfis em memória e horários durante a navegação.

O tema salvo é aplicado pelo bootstrap antes do CSS. Durante a hidratação, o seletor mantém uma representação inicial determinística, sem sobrescrever o tema já aplicado. Depois, a preferência local assume o controle. Os testes cobrem a hidratação com tema escuro salvo.

`npm run preview` utiliza modo estático, normalização de URLs e resposta 404 local. Isso permite verificar o build por HTTP, mas não substitui a inspeção do deployment real. O servidor de pré-visualização não é publicado em `dist/`.

## 4. Otimizações de desempenho

- Divisão por rota com preloads e CSS somente da página inicial solicitada e das suas dependências estáticas. As outras ferramentas são carregadas na navegação.
- `jsPDF` da exportação de horários é importado somente ao clicar em Exportar PDF. O botão informa o processamento, impede cliques repetidos e apresenta erro recuperável. O conteúdo do PDF permanece o mesmo.
- Exportação curricular e PDF.js continuam sob demanda. O worker com hash permanece local. O verificador do build rejeita preloads dessas bibliotecas nas páginas públicas.
- Cache em memória exclusivamente para os JSON públicos, com compartilhamento da mesma Promise durante consultas simultâneas e reaproveitamento do objeto parseado. O prazo é de cinco minutos; a próxima consulta após o prazo revalida via HTTP. Uma nova sessão começa vazia. Falhas são removidas para permitir nova tentativa.
- Uma desmontagem não aborta uma requisição compartilhada: cada consumidor usa seu sinal para descartar respostas obsoletas. Não há escrita desse cache no IndexedDB ou localStorage.
- Reutilização memoizada da lista de turmas derivada do catálogo na página inicial, sem recalcular esse mapeamento em cada alteração de seleção.
- CSS separado pelo Vite por rota; o layout básico foi movido para o CSS global para funcionar também no carregamento e no 404. As cores, fontes de sistema e estilos dos temas foram preservados. O fallback tem espaço reservado, sem adicionar imagens ou fontes externas.

Não foram alterados algoritmos acadêmicos, regras de equivalência, IDs de turmas, scraper ou dados SIGAA. Não foi acrescentada memoização generalizada, debounce ou virtualização: não houve evidência medida que justificasse mexer nos cálculos e interações existentes.

## 5. Comparação antes e depois

Ambiente local Linux, Node.js 22.14.0, Vite 8.2.2, build de produção. Valores em kB decimais. JavaScript inicial significa a soma do script de entrada e dos `modulepreload` presentes no HTML daquela rota, incluindo dependências compartilhadas. Não significa todo o JavaScript gerado nem quantidade de código executado. A estimativa gzip usa nível 9; não é o tamanho Brotli observado na rede do Cloudflare.

O [registro anterior](seo-baseline.json) contém o commit auditado e os tamanhos dos chunks. O [registro posterior](seo-build-atual.json) lista todos os recursos considerados por rota. Reproduza a análise com `npm run analyze:build`.

| Indicador da página inicial | Antes | Depois |
| --- | ---: | ---: |
| JavaScript inicial sem compressão | 799,9 kB | 285,1 kB |
| JavaScript inicial, estimativa gzip | 252,1 kB | 92,9 kB |
| Arquivos JavaScript indicados no HTML | 2 | 6 |
| CSS indicado no HTML | 32,6 kB em 1 arquivo | 14,6 kB em 2 arquivos |
| HTML | 2,3 kB, raiz vazia | 5,7 kB, apresentação pública |
| jsPDF no carregamento inicial | Sim | Sob demanda |

Redução de **64,4% nos bytes de JavaScript inicial sem compressão**. A divisão aumenta a quantidade de arquivos; os preloads antecipam as dependências da rota. Não se afirma redução do tempo de carregamento sem medição correspondente.

| Rota | JS inicial | Estimativa gzip do JS | Arquivos JS | CSS | HTML |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 285,1 kB | 92,9 kB | 6 | 14,6 kB | 5,7 kB |
| `/curriculo` | 283,9 kB | 92,1 kB | 5 | 23,1 kB | 5,4 kB |
| `/historico` | 303,1 kB | 98,1 kB | 5 | 18,1 kB | 5,5 kB |
| `/recomendacoes` | 291,1 kB | 95,0 kB | 7 | 18,3 kB | 6,4 kB |
| `/guia-academico` | 283,5 kB | 91,1 kB | 5 | 6,5 kB | 40,5 kB |
| `/privacidade` | 262,3 kB | 84,7 kB | 3 | 18,1 kB | 9,2 kB |

Os bundles de jsPDF (~399 kB), PDF.js (~445 kB) e worker (~1.272 kB) continuam disponíveis na distribuição para suas funcionalidades, fora da carga inicial. O HTML maior do guia contém o texto antes ausente no HTML original.

Os dados originais foram mantidos: oferta de 303.029 bytes (~18.328 bytes em gzip local), índice de 3.766 bytes (~658 em gzip) e currículo de Ciência da Computação de 117.796 bytes (~7.437 em gzip). A infraestrutura pública já comprime a oferta com Brotli. Não houve minificação ou transformação do formato dos dados. A redução de consultas repetidas é verificada nos testes do cache; latência e parsing não foram cronometrados.

### Métricas indisponíveis

Não havia Lighthouse ou um executável Chrome/Chromium de teste disponível no ambiente de comandos. O navegador integrado permitiu inspeção funcional e visual, mas não foi usado para inventar uma execução Lighthouse. **LCP, FCP, INP, CLS, TBT, tempo de execução de JS, tempo de carregamento dos currículos e total de requisições de rede em uma sessão não foram medidos antes/depois.** Não há dados reais de usuários nem coleta nova de telemetria.

Os objetivos LCP ≤ 2,5 s, INP ≤ 200 ms e CLS ≤ 0,1 continuam como referências de experiência real no percentil 75, não resultados alcançados. Após publicar, faça medições repetidas em condições comparáveis e consulte os dados de campo quando disponíveis.

## 6. Validação

- Linha de base: **444 testes em 26 arquivos**.
- Resultado: **480 testes em 29 arquivos**, incluindo metadados durante navegação, privacidade dos parâmetros, configuração de origem, cache, falhas de exportação e hidratação das seis páginas.
- A suíte existente continua cobrindo persistência/migração, grade, conflitos, equivalências, recomendações, temas, exportações PDF/CSV e importação de PDF sintético com PDF.js real. Nenhum documento pessoal foi utilizado.
- `npm run lint`: aprovado.
- `.venv/bin/python -m pytest -q`: **34 testes aprovados**; scraper e parsers existentes preservados.
- `npm run build`: aprovado; inclui TypeScript, os dois builds Vite, pré-renderização e validação dos arquivos resultantes.
- `npm run verify:build`: valida unicidade de tags, idioma, canonical, OG/Twitter, títulos, conteúdo visível, links de entrada para todas as rotas, recursos existentes, JSON-LD, sitemap XML, robots e 404.
- `npm run verify:http -- http://127.0.0.1:4180`: seis respostas 200 com HTML específico; cinco normalizações 301 preservando parâmetros; respostas 404 para página e recurso inexistentes; sitemap, robots e oferta acessíveis sem serem substituídos por HTML.
- Inspeção no navegador integrado: página inicial e guia funcionando sem erros no console; apresentação responsiva e tema escuro preservados. A validação automatizada de hidratação inclui navegação subsequente e ausência de metadados duplicados.
- Schema.org: 2 itens reconhecidos, 0 erros e 0 avisos no validador oficial.

## 7. Cloudflare Pages e migração

Confirme no painel: repositório/branch corretos, comando **`npm run build`**, saída **`dist`** e Node.js 22 ou superior. Não publique `dist-ssr`. O build precisa das devDependencies, como já era necessário para Vite/TypeScript; a validação usa também o jsdom já instalado no projeto.

Não foi criado `_headers`: os padrões de compressão, revalidação e cache do Pages já atendem esta versão. Não há cache imutável de HTML ou dados de oferta. Não configure regras globais de cache que contrariem esses padrões.

As implantações de preview do Pages possuem proteção de indexação por cabeçalho definida pela plataforma; ela não deve ser removida. Confirme depois do deploy que a origem de produção não tem `X-Robots-Tag: noindex`, e que os previews continuam protegidos.

Publique e repita a verificação HTTP usando a origem definitiva. Confira também os códigos 200/301/404, parâmetros públicos, caminho sem extensão, ausência de erros de hidratação e resposta dos arquivos estáticos. A configuração local não prova que as regras foram aplicadas na conta Cloudflare.

Domínios antigos exigem ajustes na hospedagem de origem. Preserve acesso à exportação de backups durante a migração; IndexedDB e localStorage pertencem à origem e não migram por um redirecionamento. Só depois da recuperação dos dados configure redirecionamentos permanentes que preservem os caminhos e apontem para o domínio definitivo. Nenhum redirecionamento de domínio legado foi ativado por esta implementação. As chaves legadas de armazenamento foram preservadas.

## 8. Google Search Console — ações manuais

1. Abra o [Google Search Console](https://search.google.com/search-console/). Adicione uma propriedade de **prefixo de URL** para `https://planejaufca.pages.dev/`, ou para o domínio próprio definitivo. Propriedade de domínio exige controle de DNS e não se aplica ao domínio `pages.dev` inteiro.
2. Siga a verificação oferecida. Para arquivo HTML, salve exatamente o arquivo fornecido em `public/` e faça novo build/deploy. Para metatag, acrescente ao `<head>` de `index.html` o token real fornecido pelo Google; o template é preservado na geração das páginas. Não invente tokens nem inclua credenciais no repositório.
3. Após comprovar a propriedade e publicar esta versão, envie `https://planejaufca.pages.dev/sitemap.xml` na seção Sitemaps. Ajuste o domínio se necessário.
4. Inspecione a URL inicial e as páginas públicas, confira o HTML rastreado, a canonical escolhida e o teste da URL publicada. Solicite indexação quando apropriado.
5. Acompanhe relatórios de indexação de páginas, motivos de exclusão, erros de rastreamento e estatísticas de rastreamento. A ausência imediata de indexação não prova defeito no código.
6. Consulte Core Web Vitals e o relatório de desempenho para cliques, impressões e consultas. Os relatórios de campo podem não ter dados suficientes para um site pequeno ou recém-publicado.

O cadastro, a verificação e o envio do sitemap não foram executados nesta tarefa. Essas operações não garantem indexação ou posicionamento.

## 9. Limitações e próximos passos

- Executar Lighthouse móvel/desktop após o deploy, com várias amostras, condições reproduzíveis e dados exclusivamente públicos. Investigar CPU/rede com trace antes de propor novas otimizações de cálculos.
- Confirmar o comportamento real das regras do Pages, domínios próprios, previews e implantações antigas com acesso administrativo.
- Criar uma imagem social apropriada caso haja necessidade editorial e validar a apresentação dos links nas plataformas de compartilhamento.
- Revalidar o JSON-LD quando seu conteúdo mudar. O teste do Schema.org não equivale a aprovação de rich results pelo Google.
- O catálogo de cursos e as matrizes detalhadas continuam carregando no cliente. As apresentações públicas e o guia estão no HTML estático; não se geraram centenas de páginas parametrizadas com conteúdo repetido.
- Não se introduziu coleta de métricas reais, analytics ou transmissão de históricos. Qualquer proposta futura desse tipo exige análise específica de privacidade.

## 10. Arquivos criados e alterados

Criados:

```text
.env.example
public/robots.txt
scripts/prerender.mjs
scripts/verify-build.mjs
scripts/verify-http.mjs
scripts/analyze-build.mjs
src/entry-server.tsx
src/routePages.ts
src/components/Apresentacao.tsx
src/components/RouteContent.tsx
src/pages/NotFoundPage.tsx
src/data/publicJson.ts
src/data/publicJson.test.ts
src/seo/config.ts
src/seo/routes.ts
src/seo/Seo.tsx
src/seo/structuredData.ts
src/seo/seo.test.tsx
src/seo/hydration.test.tsx
docs/seo-baseline.json
docs/seo-build-atual.json
docs/seo-desempenho.md
```

Alterados:

```text
README.md
index.html
package.json
vite.config.ts
src/App.tsx
src/App.css
src/App.test.tsx
src/AppRoutes.tsx
src/main.tsx
src/index.css
src/components/AppLayout.tsx
src/components/AppLayout.test.tsx
src/components/Footer.tsx
src/features/horarios/TurmaCard.tsx
src/features/curriculo/components/AcessoProgressoCurricular.tsx
src/features/horarios/useReferenciaCurricular.ts
src/features/recomendacoes/hooks/useRecomendacoes.ts
src/pages/CurriculoPage.tsx
src/pages/CurriculoPage.test.tsx
src/pages/HistoricoPage.tsx
src/pages/HistoricoPage.test.tsx
src/pages/RecomendacoesPage.tsx
src/pages/RecomendacoesPage.test.tsx
src/pages/GuiaAcademicoPage.test.tsx
src/rebranding.test.tsx
src/theme/ThemeProvider.tsx
```

`dist/` e `dist-ssr/` são saídas ignoradas pelo Git. Não houve dependência nova, alteração da licença MIT, remoção de créditos ou modificação dos dados acadêmicos públicos.

## 11. Referências técnicas consultadas

- [Google Search Central: SEO com JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics): HTML significativo, links navegáveis, canonical e tratamento de erros.
- [Google: criar e enviar sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- [Cloudflare Pages: resolução de páginas, 404, SPA, compressão e cache](https://developers.cloudflare.com/pages/configuration/serving-pages/).
- [Cloudflare Pages: cabeçalhos](https://developers.cloudflare.com/pages/configuration/headers/).
- [React: geração estática](https://react.dev/reference/react-dom/static/prerender) e [hidratação](https://react.dev/reference/react-dom/client/hydrateRoot), com as APIs conferidas nos pacotes instalados.
- [web.dev: Core Web Vitals](https://web.dev/articles/vitals).
- [Schema.org: WebApplication](https://schema.org/WebApplication) e [Google: requisitos de aplicativos em resultados enriquecidos](https://developers.google.com/search/docs/appearance/structured-data/software-app).
- [Search Console: adicionar e verificar uma propriedade](https://support.google.com/webmasters/answer/34592).
