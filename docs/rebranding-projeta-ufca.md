# Rebranding para Projeta UFCA

## Motivação e identidade

O antigo **Seu Horário UFCA** passou a abranger currículo, equivalências, histórico local, recomendações e guia acadêmico, além da montagem do horário. **Projeta UFCA** representa esse planejamento mais amplo.

| Elemento | Destino |
| --- | --- |
| Nome público | Projeta UFCA |
| Pacote | `projeta-ufca` |
| Repositório após renomeação | `IrlanBarros/projeta-ufca` |
| Projeto Pages desejado | `projetaufca` |
| Domínio desejado, ainda sem publicação confirmada | `https://projetaufca.pages.dev` |
| Autoria e copyright | Irlan Barros, desde 2026 |
| Licença | MIT, sem alteração |

O projeto continua independente, não oficial da Universidade Federal do Cariri. As expressões funcionais “Meu horário” e “Montar horário” continuam corretas. Não foram alterados scraper, dados públicos, IDs das turmas, algoritmos acadêmicos, schema do histórico ou termos da licença.

## Interface, metadados e exportações

A marca foi atualizada nos estados de carregamento/erro e cabeçalho principal, rodapé, privacidade, currículo, recomendações e explicação das recomendações. O rodapé mantém copyright com intervalo automático, autoria, MIT e aviso de independência; também dá acesso ao backup.

O HTML mantém `pt-BR`, favicon SVG e suporte a temas. Inclui título, descrição mais abrangente, `application-name`, `og:title`, `og:description` e `og:type`. `canonical` e `og:url` ficam **pendentes até confirmar a URL de produção**. Não se declara um endereço desejado como já publicado. A paleta existente suporta os dois temas; o calendário do favicon foi preservado e recebeu o novo título interno, sem símbolos oficiais. Não foi acrescentado `theme-color` fixo que contradiga o modo Sistema.

Os PDFs de horário e currículo mostram Projeta UFCA. Os nomes de download passam a ser:

- `projeta-ufca-horario-<curso>-<periodo>.pdf` e `.csv`;
- `projeta-ufca-estrutura-curricular-<curso>-<matriz>.pdf` e `.csv`;
- `projeta-ufca-meu-progresso-<curso>-<matriz>.pdf` e `.csv`.

Grade, salas, origens, disciplinas, paginação, regras curriculares, colunas, separadores, BOM UTF-8 e escapes permanecem iguais. O lockfile foi regenerado com `npm install --package-lock-only --ignore-scripts --offline --no-audit --no-fund`; somente os dois nomes raiz mudaram, sem atualizar dependências.

## Persistência na mesma origem

| Informação | Identificador anterior | Identificador atual |
| --- | --- | --- |
| Tema | `seu-horario-ufca:theme` | `projeta-ufca:theme` |
| Horários | `seu-horario-ufca:<periodo>:<cursoId>:turmas` | `projeta-ufca:<periodo>:<cursoId>:turmas` |
| IndexedDB | `seu-horario-perfil-academico` | `projeta-ufca-perfil-academico` |

### Tema e horários

A chave nova tem prioridade, inclusive quando contém uma seleção vazia. A ausência da chave nova permite ler a antiga, validar e copiar. As cópias antigas não são apagadas. Leituras repetidas são idempotentes. Uma chave nova inválida não é sobrescrita pelo legado: tema volta a Sistema, horários voltam a uma seleção vazia em memória, mantendo o registro para recuperação explícita.

Tema aceita apenas `light`, `dark` e `system`. O script executado no `head` aplica a mesma regra antes da interface e do CSS; falha de escrita não impede aplicar o tema legado nesta sessão. O modo Sistema acompanha o sistema operacional.

Horários continuam associados a período e curso principal, inclusive ofertas externas. Os IDs são preservados, deduplicados e validados como listas limitadas de strings não vazias. IDs fora da oferta atual permanecem salvos, embora não apareçam na grade. Falha de escrita permite recuperar o horário em memória; falha de leitura não apaga registros. A migração acontece ao consultar cada combinação; a exportação também reconhece combinações legadas que ainda não foram abertas.

### Perfil acadêmico e IndexedDB

O schema permanece 1, store `perfil`, chave `ativo`, versão do banco 1. Se o banco atual não possui perfil nem marcador de migração concluída, o perfil legado é lido, validado pela lista de campos acadêmicos permitidos e copiado numa transação. A transação revalida a ausência do perfil atual e do marcador para não substituir uma escolha concorrente. Uma nova leitura confirma a integridade da cópia. O banco legado permanece disponível; não há exclusão automática.

Consultar um banco legado inexistente aborta sua criação, evitando deixar bancos vazios. Schema inválido, versão incompatível, bloqueio, quota e falha de transação produzem erro, preservando os dados anteriores. O usuário ainda pode usar um perfil na sessão pelo fluxo existente.

Salvar um novo perfil ou apagar explicitamente o perfil registra `migracao-legada-concluida`. Assim, uma cópia antiga não ressuscita após exclusão ou substituição por sessão. A exclusão explícita remove também o registro do banco legado quando acessível, respeitando a intenção de apagar informações acadêmicas. Se a exclusão falhar, o fluxo existente informa a limitação e permite nova tentativa. Não se utiliza `localStorage.clear()` na aplicação.

## Transferência entre domínios

`seuhorarioufca.pages.dev` e `projetaufca.pages.dev` têm armazenamentos separados. A migração de nomes acima funciona apenas dentro da mesma origem. Não existe transferência automática entre os sites.

Em **Privacidade e dados locais → Transferir dados locais**, acessível pelo rodapé:

1. No endereço antigo, exportar o backup JSON antes de desativá-lo.
2. Marcar separadamente a autorização para incluir o perfil estruturado, se desejado. Sem essa escolha, o backup contém somente tema e horários. Um perfil temporário também pode ser incluído por escolha explícita.
3. Guardar o arquivo localmente e abrir o novo endereço confirmado.
4. Selecionar o JSON, conferir tema, períodos, cursos, número de turmas e presença de perfil.
5. Confirmar a substituição dos dados indicados e acionar a restauração.
6. A aplicação recarrega após o sucesso; conferir tema, histórico e horários. Dados mantidos somente na sessão e preferências transitórias de planejamento são descartados nessa recarga, conforme o aviso apresentado.
7. Apagar o arquivo se não desejar mantê-lo. Ele pode conter notas, frequências e outras informações acadêmicas pessoais.

O formato `projeta-ufca-backup`, versão 1, limita arquivos a 8 MB, até 500 horários, até 5.000 IDs por horário e os limites do schema acadêmico existente. Campos desconhecidos não entram na cópia validada. PDF, texto integral, identificadores civis, nome completo do estudante, matrícula, tokens e credenciais não fazem parte do formato permitido. IDs de turmas mantêm as informações públicas necessárias à sua identificação, inclusive docentes.

O processamento não faz requisições externas, usa JSON como dados e apresenta strings via React, sem execução de conteúdo. Versões incompatíveis, registros incompletos, horários duplicados para a mesma combinação e formatos inválidos são recusados antes de qualquer escrita. Não é necessário consultar o SIGAA para validar o arquivo; a resolução dos IDs usa a oferta pública já utilizada pela aplicação.

A importação só substitui o tema, horários listados e perfil presente no arquivo. Ausência de perfil mantém o perfil **salvo** atual; outros horários são preservados. Listas vazias são escolhas explícitas. Não há mesclagem silenciosa.

Antes de escrever, a restauração captura os valores atuais das chaves afetadas. Escritas de localStorage vêm primeiro e a transação atômica do perfil vem por último. Falhas restauram as chaves alteradas; uma falha do perfil aborta a transação. Como localStorage e IndexedDB não compartilham uma transação, feche outras abas durante o procedimento. Interrupção do navegador no meio da operação ou bloqueio do próprio rollback impede garantir atomicidade absoluta; o erro informa essa limitação quando detectada. Guarde o backup até concluir a conferência e repita a restauração se necessário.

## GitHub

A inspeção inicial encontrou `origin` apontando para `git@github.com:IrlanBarros/seu-horario-ufca.git`. O remoto não foi alterado antes da operação administrativa. Não foram feitos commits, pushes, criação de outro repositório ou edição de arquivos internos de `.git`.

Procedimento autorizado a executar pelo proprietário no painel:

1. Abrir o repositório atual no GitHub.
2. Abrir **Settings → General → Repository name**.
3. Informar `projeta-ufca` e confirmar **Rename**.
4. Conferir branches, PRs, issues, tags, releases, permissões, secrets e execuções do Actions.
5. Atualizar descrição para “Plataforma independente de apoio ao planejamento acadêmico dos estudantes da UFCA”. Atualizar homepage somente após confirmar o novo deploy.
6. Atualizar integrações e links; não recriar um repositório com o nome antigo.
7. Atualizar cada clone local:

```bash
git remote set-url origin git@github.com:IrlanBarros/projeta-ufca.git
git remote -v
```

A [documentação do GitHub sobre renomeação](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository) explica os redirecionamentos do repositório e seus limites. Essa operação mantém o repositório existente e seu histórico. Os workflows locais usam checkout do próprio repositório, sem URL fixa da marca; seus comandos continuam válidos. Não se trata de uma Action distribuída com o nome do repositório.

### Diretório local

O checkout não foi movido para preservar o ambiente do agente. Depois de encerrar servidores e sair do diretório, executar a partir da pasta pai, verificando antes que `projeta-ufca` não exista:

```bash
cd /home/irlan-barros/projetos
mv seu-horario-cc-ufca projeta-ufca
cd projeta-ufca
git status
```

Reabrir o projeto no editor e atualizar atalhos externos. O README já usa o diretório novo e comandos de clone após a renomeação.

## Cloudflare Pages e produção

Não há configuração autenticada do painel Cloudflare disponível nesta implementação. O repositório confirma `npm run build` e saída `dist`; a configuração efetiva do projeto antigo (raiz, Node, variáveis, integração, branch, regras e domínios) precisa ser registrada no painel antes de ser reproduzida. A disponibilidade de `projetaufca.pages.dev` não foi confirmada.

A [limitação documentada do subdomínio Pages](https://developers.cloudflare.com/pages/platform/known-issues/) exige outro projeto para obter outro `pages.dev`. Manter o projeto antigo durante a transição.

Criar **Workers & Pages → Create application → Pages → Connect to Git**, selecionando o repositório renomeado. Conforme o [guia oficial de integração Git](https://developers.cloudflare.com/pages/get-started/git-integration/), configurar:

| Campo | Valor esperado, após comparar com a configuração atual |
| --- | --- |
| Nome | `projetaufca`, sujeito à disponibilidade |
| Repositório | `IrlanBarros/projeta-ufca` |
| Produção | `main` |
| Raiz | raiz do repositório, se confirmar a configuração atual |
| Build | `npm run build` |
| Saída | `dist` |
| Node | versão compatível com as dependências; ver CI Node 22 e PDF.js 22.13+ |

Manter JSONs públicos, `favicon.svg`, `icons.svg` e o worker PDF.js gerado localmente em `dist/assets`. Não introduzir CDN para o worker. O projeto é estático e não requer backend, autenticação ou secrets de alunos.

O [fallback SPA nativo do Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/) serve a aplicação nas rotas sem um arquivo estático correspondente quando não há `404.html` raiz. O build preserva essa condição; não é necessário um redirecionamento dentro do React. Confirmar em produção cada acesso direto, com recarga:

```text
/
/curriculo?curso=<id-real-do-catalogo>
/historico
/recomendacoes
/guia-academico
/privacidade
```

Validar também `/curriculo` sem parâmetro, consultas a `/data/cursos-atual.json`, `/data/curriculos/index.json` e ao JSON de um curso; servir o worker como JavaScript, sem HTML de fallback. Testar um PDF sintético, temas, seleção externa, equivalências, conflitos, histórico, progresso, recomendações e exportações. HTTPS, integração GitHub e publicação automática só podem ser confirmados após o deploy e uma publicação controlada aprovada pelo proprietário.

## Transição e redirecionamento

Primeiro publicar o rebranding e o exportador **no projeto antigo**. Manter o acesso e divulgar o procedimento de backup. Depois criar e validar o destino, mantendo ambos durante um período de transição escolhido pelo responsável. Não instalar redirecionamento definitivo enquanto houver necessidade de recuperar dados locais antigos.

Após a transição, preferir um redirecionamento HTTP 301 no projeto antigo. A opção escolhida é um artefato de redirecionamento separado, implantado somente no projeto antigo, com `_redirects` em sua raiz de saída:

```text
/* https://projetaufca.pages.dev/:splat 301
```

**Esse arquivo não foi adicionado a `public/`**: se o mesmo build alimentar os dois projetos, o destino passaria a redirecionar para si mesmo. Usar uma branch/artefato exclusivo do projeto antigo, preservando o último deploy com exportador para rollback. Revalidar a URL efetiva do destino antes de criar a regra.

As [regras oficiais de `_redirects`](https://developers.cloudflare.com/pages/configuration/redirects/) documentam splats, prioridade e limites. A regra acima conserva o caminho; query strings devem ser verificadas com `curl -I 'https://seuhorarioufca.pages.dev/curriculo?curso=ID'`, conferindo `Location`, código e ausência de loop. O formato não oferece regras de correspondência por parâmetro de consulta. Se a configuração escolhida não conservar as consultas, usar [Bulk Redirects para Pages](https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/), com preservação de query string, caminho e sufixo, e validar o resultado antes de tornar o redirecionamento permanente.

Antes de trocar a publicação do projeto antigo, desabilitar suas publicações automáticas de produção e previews ou vinculá-las exclusivamente à branch de transição. Os [controles de deploy por branch](https://developers.cloudflare.com/pages/configuration/branch-build-controls/) permitem separar esse ciclo. Deixar o projeto novo ligado à `main`; novos commits de dados do scraper também acionam a integração, portanto conferir ambos os projetos. Não excluir o projeto antigo.

## Rollback

- Preservar o identificador do último deploy funcional e do deploy com exportador em cada projeto.
- Se o novo site falhar, manter/restaurar o projeto antigo com o rebranding e exportador, retirando o redirecionamento e reativando os controles adequados de build.
- Preferir rollback para a versão que entende as novas chaves. Versões anteriores ao rebranding podem mostrar cópias legadas desatualizadas; não sincronizar inversamente sem confirmação. Usar o JSON para recuperar escolhas recentes na versão compatível.
- Dados são separados por origem; rollback de arquivos não move nem apaga dados do navegador. Não limpar o armazenamento dos usuários para resolver uma falha de deploy.
- Evitar 301 até a decisão definitiva: caches de navegador podem manter um redirecionamento antigo mesmo depois de removido. Conferir com perfil limpo e cache desabilitado ao validar o rollback.
- Renomeação inversa do GitHub, se necessária, exige atualizar integrações e remotos pelo painel; não recriar repositórios nem reescrever histórico.

## Testes e limitações

Os testes de compatibilidade cobrem preferência antiga/nova, precedência e falhas no bootstrap, deduplicação e isolamento de horários, migração repetida, perfis antigos e novos, schema inválido, falhas de leitura/escrita e prevenção de ressurreição. Testes de backup exercitam autorização, confirmação, cancelamento, formato/versão, privacidade por lista de campos, ausência de rede, restauração parcial seletiva e rollback de falhas. Todos os exemplos de perfil são sintéticos.

A suíte existente continua cobrindo cursos, turmas, ofertas externas, equivalências, conflitos, parser de histórico/PDF, currículo interativo, recomendações, guia, temas e exportações. Isso não substitui a conferência do painel ou os testes HTTPS no novo domínio. Ver resultados locais e inventário de arquivos ao final deste documento.

## Checklist operacional, em ordem

1. [ ] Revisar o diff e os resultados locais; manter backup do deploy atual e registrar configurações do Pages antigo.
2. [ ] Fazer commit/push manualmente após revisão; publicar primeiro no projeto antigo, ainda sem redirecionamento.
3. [ ] No domínio antigo, testar chaves legadas, IndexedDB legado e exportação com/sem perfil; conferir JSON sem identificadores do estudante.
4. [ ] Renomear o repositório existente no GitHub para `projeta-ufca`; conferir histórico, PRs, issues, tags, releases e Actions; atualizar remotos e integração Cloudflare.
5. [ ] Confirmar disponibilidade e criar o projeto `projetaufca`, repositório renomeado, `main`, build e saída conforme painel antigo.
6. [ ] Confirmar HTTPS, assets, JSONs, worker e acesso direto às seis rotas no novo endereço.
7. [ ] Transferir um backup sintético do endereço antigo para o novo; confirmar dados atuais, substituição, recarga e repetição.
8. [ ] Validar as funcionalidades integradas e a publicação automática do projeto novo.
9. [ ] Só então atualizar homepage, links públicos, `canonical` e `og:url` para o destino confirmado; repetir validação no build final.
10. [ ] Manter o projeto antigo com exportador acessível durante a transição e informar usuários; escolher prazo e canal de comunicação fora desta implementação.
11. [ ] Congelar/separar builds automáticos do projeto antigo; preparar artefato exclusivo de redirecionamento sem afetar `main` ou o destino.
12. [ ] Após confirmar recuperação dos dados, aplicar 301 no projeto antigo e validar caminhos, consultas, ausência de loop e rollback; manter o projeto antigo existente.
13. [ ] Renomear o diretório local separadamente, se desejado; atualizar atalhos e documentação externa.

## Pendências externas

Renomeação administrativa do GitHub, atualização de `origin`, homepage, integração e criação do Pages, confirmação de disponibilidade, HTTPS, publicação automática, verificação no domínio novo, prazo de transição e eventual redirecionamento permanecem operacionais. Nenhuma dessas ações foi declarada concluída. Nenhuma mensagem a usuários foi enviada. Não foram efetuados commits ou pushes.

## Resultado da validação local

- `npm ci --offline --no-audit --no-fund`: concluído com o lockfile, 293 pacotes instalados do cache local, sem mudar versões.
- `npm run lint`: aprovado.
- `npm test`: 420 testes aprovados em 26 arquivos.
- `npm run build`: TypeScript e Vite aprovados; `dist` regenerado, incluindo worker PDF.js. Permanece o aviso de chunks maiores que 500 kB; não impede o build.
- `python -m pytest -v`: 34 testes aprovados.
- `git diff --check`: aprovado.
- Navegador no build de produção local: título e rodapé novos nas seis rotas por navegação direta, currículo com e sem curso, carregamento dos catálogos, temas claro/escuro e importação de JSON sintético com resumo, confirmação obrigatória e tema restaurado após recarga. Download JSON real também conferido no diretório Downloads, com formato/versão corretos e sem perfil. Nenhum erro ou aviso de console foi observado nesse fluxo.
- Workflows inspecionados: sem referências à marca ou ao repositório antigo; os comandos de CI continuam compatíveis e foram executados localmente. Não houve execução remota de Actions.
- Busca final: as marcas legadas restantes são exclusivamente compatibilidade, testes, histórico e instruções de transição. Expressões funcionais de horário foram preservadas.

## Inventário completo de arquivos desta implementação

35 arquivos alterados ou criados. Não estão incluídos artefatos ignorados de build, cache e dependências.

### Alterados

- `README.md`
- `docs/importacao-historico-lgpd.md`
- `docs/recomendacoes-academicas.md`
- `docs/tema-e-identidade-visual.md`
- `docs/turmas-outros-cursos.md`
- `index.html`
- `package-lock.json`
- `package.json`
- `public/favicon.svg`
- `src/App.tsx`
- `src/components/Footer.tsx`
- `src/features/curriculo/exportacao/exportacao.test.ts`
- `src/features/curriculo/exportacao/exportarCurriculoPdf.ts`
- `src/features/curriculo/services/prepararExportacao.ts`
- `src/features/historico/storage/indexedDb.test.ts`
- `src/features/historico/storage/indexedDb.ts`
- `src/features/horarios/selecao.ts`
- `src/features/recomendacoes/components/ExplicacaoRecomendacao.tsx`
- `src/features/recomendacoes/services/recomendador.test.ts`
- `src/pages/CurriculoPage.tsx`
- `src/pages/PrivacidadePage.tsx`
- `src/pages/RecomendacoesPage.tsx`
- `src/theme/theme.test.ts`
- `src/theme/theme.ts`
- `src/utils/exportarCsv.test.ts`
- `src/utils/exportarCsv.ts`
- `src/utils/exportarPdf.test.ts`
- `src/utils/exportarPdf.ts`

### Criados

- `docs/rebranding-projeta-ufca.md`
- `src/features/backup/BackupLocal.test.tsx`
- `src/features/backup/BackupLocal.tsx`
- `src/features/backup/backup.test.ts`
- `src/features/backup/backup.ts`
- `src/features/horarios/selecao.test.ts`
- `src/rebranding.test.tsx`
