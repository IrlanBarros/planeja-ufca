# Rebranding para Planeja UFCA

## 1. Resumo e motivação

**Planeja UFCA** substitui Seu Horário UFCA e a identidade intermediária Projeta UFCA. A aplicação passou a oferecer planejamento curricular, equivalências, histórico local, recomendações e guia acadêmico, além do horário. O nome Projeta foi abandonado por existir outro projeto universitário com esse nome.

O projeto permanece independente, não oficial da Universidade Federal do Cariri, desenvolvido por **Irlan Barros**, com copyright desde 2026 e licença MIT inalterada. Expressões funcionais como “Meu horário” foram preservadas. Scraper, dados SIGAA, IDs das turmas, schema acadêmico e algoritmos de recomendações, equivalências e conflitos não foram alterados.

| Elemento | Identidade definitiva |
| --- | --- |
| Nome público | Planeja UFCA |
| Pacote | `planeja-ufca` |
| Repositório desejado | `IrlanBarros/planeja-ufca` |
| Projeto Cloudflare Pages desejado | `planejaufca` |
| Domínio desejado, publicação pendente | `https://planejaufca.pages.dev` |
| Branch local encontrada | `chore/rebrand-planeja-ufca` |

## 2. Estado observado antes da migração

Inspeção em **08/11/2026**: a árvore de trabalho estava limpa, a interface/pacote usavam Projeta UFCA, havia backup JSON local e compatibilidade com a marca original. Não foram encontrados arquivos AGENTS.md aplicáveis nem configuração Wrangler/Functions no repositório. A aplicação usa Vite/React e `BrowserRouter`, build `npm run build`, saída `dist`.

`git remote -v` e a consulta ao GitHub confirmaram `git@github.com:IrlanBarros/projeta-ufca.git`, branch remota padrão `main`, repositório público de ID `1358454711`. O conector disponível consulta metadados, mas não oferece renomeação; o CLI `gh` informou autenticação inválida. Não houve alteração administrativa nem mudança antecipada de `origin`.

| Endereço consultado | Resultado observado |
| --- | --- |
| `https://seuhorarioufca.pages.dev` | DNS não resolveu na consulta externa |
| `https://projetaufca.pages.dev` | HTTP 403; conteúdo e tipo do projeto não confirmados |
| `https://projeta-ufca.irlanbarros100.workers.dev` | HTTP 403; conteúdo não confirmado |
| `https://planejaufca.pages.dev` | DNS não resolveu; publicação e disponibilidade do nome pendentes |

Esses resultados não provam que os projetos inexistem, pertencem à conta ou que um nome pode ser reservado. Não havia sessão de painel Cloudflare nem ferramenta de administração Cloudflare disponível. Antes de publicar, o responsável deve inventariar projetos, domínios, configurações de build, variáveis, integração Git, controle de acesso e últimos deploys no painel. Confirmar quais origens foram efetivamente usadas por estudantes; incluir todas elas na transição, inclusive o Worker legado se utilizado.

## 3. Identidade visual, metadados, pacote e exportações

Nome atualizado nos estados de carregamento/erro e cabeçalho principal, rodapé, privacidade, currículo, recomendações e explicação da heurística. O rodapé preserva autoria, copyright com intervalo automático, licença, independência e links de privacidade/backup.

`index.html` mantém `lang="pt-BR"`, favicon e tema antes da pintura; apresenta título, descrição abrangente, `application-name`, `og:title`, `og:description`, `og:type` e `color-scheme`. `canonical` e `og:url` continuam ausentes até a confirmação do domínio final. Um `theme-color` fixo não foi acrescentado, para preservar a coerência com os temas. O SVG mantém o calendário e a paleta que funciona nos dois temas; somente o título interno mudou, sem símbolos oficiais.

PDFs identificam Planeja UFCA, mantendo grade, lista completa, cursos de oferta, salas, legendas, classificação curricular, progresso e paginação. Nomes de PDF/CSV:

- `planeja-ufca-horario-<curso>-<periodo>.pdf` / `.csv`;
- `planeja-ufca-estrutura-curricular-<curso>-<matriz>.pdf` / `.csv`;
- `planeja-ufca-meu-progresso-<curso>-<matriz>.pdf` / `.csv`.

Colunas, BOM UTF-8, separadores, escapes e regras acadêmicas permanecem iguais. `package.json` usa `planeja-ufca`; o lockfile foi atualizado com `npm install --package-lock-only --ignore-scripts --offline --no-audit --no-fund`. Somente os nomes da raiz e de `packages[""]` mudaram, sem atualização de dependências. O documento intermediário permanece como registro histórico, com aviso de que foi substituído por este procedimento.

## 4. Persistência na mesma origem

| Dados | Definitivo | Intermediário | Original |
| --- | --- | --- | --- |
| Tema | `planeja-ufca:theme` | `projeta-ufca:theme` | `seu-horario-ufca:theme` |
| Horários | `planeja-ufca:<periodo>:<cursoId>:turmas` | `projeta-ufca:<periodo>:<cursoId>:turmas` | `seu-horario-ufca:<periodo>:<cursoId>:turmas` |
| IndexedDB | `planeja-ufca-perfil-academico` | `projeta-ufca-perfil-academico` | `seu-horario-perfil-academico` |

### Tema e horários

A primeira chave existente na ordem definitivo → intermediário → original tem prioridade. Uma chave definitiva existente nunca é substituída por uma cópia legada, inclusive seleção vazia. O valor encontrado é validado antes da cópia. Uma chave existente inválida é preservada para recuperação explícita, sem recorrer silenciosamente a dados de menor prioridade: o tema usa Sistema e o horário usa uma lista vazia em memória.

Tema aceita apenas `light`, `dark` e `system`. O bootstrap do HTML e React aplicam a mesma precedência e validação; a preferência legada vale na sessão mesmo se a escrita falhar. O modo Sistema continua acompanhando o sistema operacional. Isso evita o primeiro quadro com um tema diferente do que será aplicado por React.

Horários mantêm a associação por período/curso e os IDs originais, inclusive de ofertas externas. IDs são strings limitadas e não vazias; duplicações são removidas. As cópias legadas não são apagadas. A migração é idempotente e ocorre quando cada combinação é aberta. A exportação também encontra combinações ainda não abertas, escolhendo a maior prioridade independentemente da ordem de inserção das chaves. IDs de ofertas antigas permanecem armazenados, embora possam não aparecer no catálogo atual. Falha de leitura/escrita não apaga registros.

### IndexedDB

Versão do banco 1, schema acadêmico 1, store `perfil`, chave `ativo`. Um perfil definitivo existente é validado e tem prioridade, mesmo que algum legado tenha data posterior. Registro definitivo inválido/incompatível produz erro e é preservado para substituição explícita.

Na ausência de perfil definitivo e do marcador `migracao-legada-concluida`, os dois bancos legados são consultados. Perfis são decodificados pela lista de campos permitidos, que descarta campos extras. Entre candidatos válidos, vence `importadoEm` mais recente; em empate, vence o intermediário. Essa data é a data de importação disponível, não um registro de cada edição posterior. Não se mesclam perfis. Legado inválido permanece intacto; havendo outro candidato válido, ele pode ser migrado. Sem candidato válido, o erro é apresentado.

Uma exclusão/substituição por sessão registrada no banco intermediário, sem perfil ativo, impede recuperar o original. O marcador é transferido para o banco definitivo. A escrita revalida perfil e marcador dentro da transação, para não substituir uma gravação concorrente. A cópia é relida e comparada para confirmar integridade. Bancos legados ausentes têm sua criação abortada; bancos existentes nunca são eliminados automaticamente. Falhas de abertura, schema, quota, leitura, transação ou confirmação preservam os legados.

Salvar um perfil registra o marcador no banco definitivo. **Somente uma exclusão explícita solicitada pelo usuário** remove também os registros dos dois bancos legados acessíveis e grava marcadores, impedindo ressurreição posterior. Se houver falha na exclusão entre bancos, a interface informa a limitação e permite nova tentativa; IndexedDB não oferece transação atômica entre bancos distintos. A aplicação não usa `localStorage.clear()`.

## 5. Migração de domínio e backup

Cada origem tem seu próprio localStorage/IndexedDB. Renomear chaves não transfere dados entre `pages.dev`, `workers.dev` ou navegadores. **A transferência exige ação explícita.**

O backup existente, acessível pelo rodapé em **Privacidade e dados locais → Transferir dados locais**, foi adaptado:

1. No endereço antigo, exportar o JSON enquanto ainda é possível acessá-lo.
2. Autorizar separadamente a inclusão do perfil acadêmico estruturado, se desejado. Sem essa autorização, entram apenas tema e horários. Perfil temporário também pode ser incluído por escolha explícita.
3. Abrir o destino confirmado, selecionar o JSON e conferir tema, períodos, cursos, total de turmas e presença de perfil.
4. Confirmar a substituição dos dados indicados e acionar a restauração. Importar o arquivo sozinho não grava nada.
5. Após recarregar, conferir os dados antes de apagar o backup. A recarga descarta dados que estavam apenas na sessão.

Novos arquivos usam `planeja-ufca-backup-AAAA-MM-DD.json`, formato `planeja-ufca-backup`, versão 1. Backups versão 1 identificados como `projeta-ufca-backup` ou `seu-horario-ufca-backup` também são aceitos e normalizados; isso não presume que ambos chegaram a ser publicados. Todas as identidades passam pela mesma validação de schema, versão, tema, horários, duplicação, IDs, perfil e limite de 8 MB. Campos extras não são exportados nem executados.

PDF original, texto integral, CPF, RG, matrícula, nome completo, tokens e credenciais não são incluídos. O arquivo pode conter dados acadêmicos pessoais: guardar com cuidado e apagar após a migração se não desejar mantê-lo. Não há upload, backend ou armazenamento remoto nesse fluxo.

Tema e horários listados substituem as escolhas correspondentes, inclusive listas vazias; outros horários são preservados. Um perfil nulo no backup preserva o perfil salvo atual. O resumo e a confirmação informam essas consequências. Uma transação falha do perfil mantém o perfil anterior; escritas parciais de localStorage são revertidas a partir do snapshot. Se o próprio navegador bloquear o rollback, a interface informa que algumas preferências podem precisar de recuperação. Fechar outras abas durante a restauração: não existe transação atômica entre IndexedDB e localStorage ou entre abas.

O exportador deve estar disponível em **cada origem antiga efetivamente utilizada antes de qualquer redirecionamento definitivo**. Resolver o 403/controle de acesso legítimo, se necessário, sem limpar dados do navegador. Se uma origem não puder ser recuperada, informar que seus dados não podem ser lidos pelo novo site e que pode ser necessário reimportar o histórico e remontar horários. Não apresentar isso como migração automática.

## 6. GitHub e diretório local

No repositório existente `IrlanBarros/projeta-ufca`, abrir **Settings → General → Repository name**, alterar para `planeja-ufca` e confirmar. Usar a renomeação nativa para manter histórico, branches, PRs, issues, tags, releases e configurações. Conferir esses recursos e Actions após a operação. Não criar outro repositório. O [procedimento oficial do GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository) descreve a renomeação e a atualização dos clones; não reutilizar os nomes antigos para outro repositório, pois isso pode interromper redirecionamentos.

Depois da confirmação administrativa:

```bash
git remote set-url origin git@github.com:IrlanBarros/planeja-ufca.git
git remote -v
```

Atualizar descrição para a apresentação do README, integrações externas, links e badges que existirem. Atualizar homepage somente depois de validar o domínio final. Os três workflows usam o repositório corrente via `actions/checkout`, sem marca ou remoto fixo, e não precisam de alteração por identidade. Conferir as permissões da integração GitHub da Cloudflare após a renomeação.

O checkout não foi movido. Depois de encerrar agentes, terminais e servidores que dependem do caminho antigo, renomear separadamente, a partir da pasta pai, apenas se o destino ainda não existir:

```bash
cd /home/irlan-barros/projetos
mv -T -n seu-horario-cc-ufca planeja-ufca
cd planeja-ufca
git status
git remote -v
```

Se a pasta ainda tiver outro nome, ajustar apenas o argumento de origem. Atualizar atalhos, ambientes virtuais que contenham caminhos absolutos, configuração do editor e projeto salvo no Codex. Não editar arquivos internos de `.git`. Não foram feitos commits nem pushes; mensagem sugerida para revisão posterior: `chore(branding): renomeia projeto para Planeja UFCA`.

## 7. Cloudflare Pages e redirecionamentos

Inventariar o painel antes de recriar configurações. O destino obrigatório é **Pages**, com projeto `planejaufca`, sujeito à disponibilidade. Abrir **Workers & Pages → Create application → Pages → Import an existing Git repository** e selecionar o repositório renomeado. Esse é o [fluxo oficial para React em Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/).

| Configuração | Valor esperado a conferir no painel |
| --- | --- |
| Repositório | `IrlanBarros/planeja-ufca` |
| Branch de produção | `main` |
| Diretório raiz | raiz do repositório |
| Build | `npm run build` |
| Saída | `dist` |
| Runtime | Node 22.13+ (22.14.0 validado localmente) ou 24+ |

Não é necessário configurar Worker, Functions ou backend para esta SPA. O subdomínio Pages pretendido exige um projeto com o nome apropriado; não presumir que editar um Worker ou uma etiqueta altera o endereço existente. Confirmar `planejaufca.pages.dev`, o tipo Pages e HTTPS no painel/deploy antes de anunciar a URL. Não excluir nenhum projeto antigo.

Pages oferece fallback de SPA quando não existe `404.html` na raiz, conforme a [documentação de roteamento](https://developers.cloudflare.com/pages/configuration/serving-pages/). O build atual preserva esse comportamento. No novo domínio, abrir diretamente `/`, `/curriculo`, `/historico`, `/recomendacoes`, `/guia-academico` e `/privacidade`; verificar também cursos, turmas, currículos JSON, CSS, favicon e worker PDF.js. Prévia Vite local não comprova roteamento ou integrações da hospedagem.

Publicar primeiro esta versão nas origens antigas, com backup e nova marca. Criar/validar o destino e manter ambos durante o período de transição. Escolher o prazo conforme a recuperação dos dados dos usuários. Só então ativar 301 na infraestrutura antiga.

Para um projeto **Pages antigo**, preparar um artefato exclusivo de redirecionamento com `_redirects` em sua raiz de saída:

```text
/* https://planejaufca.pages.dev/:splat 301
```

**Não colocar essa regra no `public/` compartilhado com o novo projeto**, pois isso causaria loop no destino. Separar a branch/artefato antigo e guardar o último deploy com exportador. `_redirects` é uma opção de Pages, conforme as [regras oficiais](https://developers.cloudflare.com/pages/configuration/redirects/); não presumir que esse arquivo configura um Worker legado. Para `workers.dev`, revisar o mecanismo da implantação antiga e preparar o redirecionamento HTTP na infraestrutura dela, mantendo caminho e consulta. Não foi criado Worker novo nesta tarefa.

Verificar `Location`, código, caminho e query string com `curl -I 'https://<origem-antiga>/curriculo?curso=ID'`, além de testar o navegador e ausência de loop. A correspondência por parâmetros de consulta não é suportada em `_redirects`; a preservação efetiva da consulta deve ser validada. Se a regra não atender, avaliar a alternativa oficial apropriada à origem, como [Bulk Redirects](https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/) quando aplicável ao domínio controlado, com preservação de caminho e query string. Não presumir controle de zona sobre `workers.dev`/`pages.dev`.

Antes de implantar o artefato antigo, desabilitar seus builds automáticos ou isolá-los numa branch de transição, incluindo previews. Usar os [controles de branches de Pages](https://developers.cloudflare.com/pages/configuration/branch-build-controls/). Commits de dados dos workflows também podem disparar builds; não permitir que sobrescrevam o exportador ou o redirecionamento. O destino continua acompanhando `main`.

## 8. Rollback e limitações

Guardar IDs do último deploy funcional e do deploy com exportador, além das configurações de integração e builds. Se o novo site falhar, manter/restaurar o antigo com esta versão compatível, retirar o redirecionamento e revalidar o exportador. Um rollback de arquivos não transfere nem apaga dados do navegador.

Preferir uma versão que entenda `planeja-ufca` e backups das marcas anteriores. Voltar ao código anterior pode mostrar apenas cópias legadas desatualizadas. Não copiar inversamente sem confirmação; usar o backup para recuperação numa versão compatível. Não limpar o armazenamento dos estudantes. Evitar 301 antes de a mudança ser definitiva, pois navegadores podem mantê-lo em cache. Guardar opção de restaurar a versão compatível mesmo após a transição.

Persistem limites de quota/permissões, bloqueio por outras abas, diferenças entre navegadores e perda de armazenamento por limpeza do navegador. Testes sintéticos não comprovam migração de dados reais em origens externas. A inspeção pública não confirmou quais projetos pertencem à conta Cloudflare. Criação/renomeação de serviços, HTTPS, integração e testes em produção continuam pendentes.

## 9. Testes

- `npm ci --offline --no-audit --no-fund`: aprovado, 293 pacotes do lockfile, sem alterar versões.
- `npm run lint`: aprovado na revisão final.
- `npm test`: **444 testes aprovados em 26 arquivos** na revisão final, incluindo os novos cenários das três identidades, gravação do marcador e download JSON.
- `python -m pytest -v`: 34 testes aprovados.
- `npm run build`: aprovado; `dist` regenerado, incluindo worker PDF.js. Permanece o aviso de chunks acima de 500 kB, sem falha de build.
- Navegador na prévia de produção: título e rodapé definitivos nas seis rotas por acesso direto, sem marcas antigas visíveis; catálogos carregados na principal; backup Projeta sintético reconhecido, resumo e confirmação obrigatória conferidos, restauração concluída e tema claro aplicado após recarga; retorno ao tema escuro e página principal sem erros/avisos de console. A exportação exibiu sucesso na interface, mas a captura automatizada do evento de download expirou e não confirmou o arquivo no disco. Conteúdo JSON, nome definitivo, criação e revogação da URL local foram verificados por teste automatizado; conferir também o download no navegador de produção.
- `git diff --check`: aprovado. Comparação estrutural do lockfile com a versão anterior confirmou dependências intactas. Busca final encontrou marcas antigas somente em compatibilidade, testes, histórico e transição.
- Workflows CI/atualização de dados revisados: sem referências fixas à identidade antiga. As verificações equivalentes de Python, frontend, lint e build foram executadas localmente; Actions remotas não foram acionadas.

Os testes cobrem marca pública, favicon, pacote/lockfile, exportações, bootstrap e React, precedência das três chaves, seleções vazias, IDs duplicados, isolamento por curso/período, falhas de armazenamento, idempotência, bancos legados, data dos perfis, exclusão intermediária, schema, backup legado/atual, consentimento, cancelamento, confirmação, rollback, ausência de rede e descarte de campos privados extras. A suíte preexistente cobre os algoritmos e fluxos acadêmicos preservados, incluindo PDF sintético, currículo, equivalências, recomendações, conflitos, guia e ofertas externas. Não foram usados dados pessoais reais.

## 10. Checklist de publicação, em ordem

1. [ ] Revisar diff, testes e inventário de serviços no painel; salvar configurações e IDs dos deploys atuais.
2. [ ] Fazer commit/push manualmente após revisão; publicar esta versão compatível em todas as origens antigas efetivamente usadas, sem redirecionamento.
3. [ ] Resolver acesso legítimo às origens com 403 e validar recuperação local das duas marcas, backup com/sem perfil e importação de JSON sintético.
4. [ ] Renomear o repositório existente para `planeja-ufca`; conferir histórico, branches, PRs, issues, tags, releases, Actions e integrações; atualizar `origin`.
5. [ ] Confirmar disponibilidade e criar/configurar **Cloudflare Pages `planejaufca`**, com repositório renomeado, `main`, `npm run build` e `dist`.
6. [ ] Validar HTTPS, assets, JSONs, worker PDF.js e acesso direto às seis rotas no novo domínio.
7. [ ] Transferir backup sintético de cada origem antiga para o novo Pages; conferir tema, horários, perfil, confirmação, recarga, repetição e preservação de dados existentes.
8. [ ] Conferir consulta de cursos/turmas, ofertas externas, equivalências, conflitos, histórico, currículo, recomendações, guia, temas e exportações; conferir build automático do destino.
9. [ ] Só após confirmar produção, atualizar homepage, links de divulgação, `canonical` e `og:url`; validar o build resultante. Os testes de metadados deverão passar a verificar a URL confirmada quando esses campos forem adicionados.
10. [ ] Manter cada origem antiga acessível com exportador durante a transição; definir prazo e comunicação aos usuários separadamente.
11. [ ] Separar/congelar builds antigos e preparar o artefato de redirecionamento exclusivo apropriado a cada infraestrutura.
12. [ ] Só depois da validação da recuperação, ativar 301 e conferir caminhos, consultas, ausência de loops e rollback. Manter os projetos antigos existentes.
13. [ ] Encerrar processos e renomear o diretório local separadamente, se desejado; atualizar atalhos, ambiente e projeto salvo no editor.

As ações externas acima não foram executadas ou declaradas concluídas. Nenhum projeto foi excluído; nenhum commit/push foi realizado.

## Inventário de arquivos

34 arquivos alterados ou criados. Artefatos ignorados de build, dependências e caches não integram o inventário.

- `README.md`
- `docs/importacao-historico-lgpd.md`
- `docs/rebranding-planeja-ufca.md` (novo)
- `docs/rebranding-projeta-ufca.md`
- `docs/recomendacoes-academicas.md`
- `docs/tema-e-identidade-visual.md`
- `docs/turmas-outros-cursos.md`
- `index.html`
- `package-lock.json`
- `package.json`
- `public/favicon.svg`
- `src/App.tsx`
- `src/components/Footer.tsx`
- `src/features/backup/backup.test.ts`
- `src/features/backup/backup.ts`
- `src/features/curriculo/exportacao/exportacao.test.ts`
- `src/features/curriculo/exportacao/exportarCurriculoPdf.ts`
- `src/features/curriculo/services/prepararExportacao.ts`
- `src/features/historico/storage/indexedDb.test.ts`
- `src/features/historico/storage/indexedDb.ts`
- `src/features/horarios/selecao.test.ts`
- `src/features/horarios/selecao.ts`
- `src/features/recomendacoes/components/ExplicacaoRecomendacao.tsx`
- `src/features/recomendacoes/services/recomendador.test.ts`
- `src/pages/CurriculoPage.tsx`
- `src/pages/PrivacidadePage.tsx`
- `src/pages/RecomendacoesPage.tsx`
- `src/rebranding.test.tsx`
- `src/theme/theme.test.ts`
- `src/theme/theme.ts`
- `src/utils/exportarCsv.test.ts`
- `src/utils/exportarCsv.ts`
- `src/utils/exportarPdf.test.ts`
- `src/utils/exportarPdf.ts`
