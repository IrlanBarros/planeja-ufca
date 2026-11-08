# Importação local do histórico acadêmico da UFCA

## Entrega e arquitetura existente

A funcionalidade adiciona `/historico` e `/privacidade` ao React Router existente. Ambas usam `AppLayout`, seletor de tema, tipografia e rodapé compartilhados. O acesso ao histórico fica ao lado do link de currículo na página principal. O CSS da funcionalidade é isolado por classes `historico-*` e utiliza as variáveis de tema existentes.

O projeto continua sendo um frontend estático para Cloudflare Pages. Não foram criados endpoints, autenticação, funções de servidor ou armazenamento remoto. Scraper, JSON públicos, seleção de turmas, detecção de conflitos e exportações CSV/PDF permanecem com a implementação anterior. Tema e horários continuam em localStorage. O perfil acadêmico tem contexto e banco próprios.

## Fluxo e divisão de responsabilidades

1. O estudante inicia uma importação e recebe um aviso de privacidade. Uma ação afirmativa habilita a seleção; o leitor também exige a autorização em sua API.
2. O arquivo passa por verificação de tamanho, tipo/extensão e assinatura `%PDF-`.
3. O PDF.js recebe um `Uint8Array` local, sem URL do documento. Um worker da mesma distribuição é servido junto do build.
4. Cada página tem seus itens textuais extraídos com coordenadas, dimensões e número da página. O progresso é informado página a página.
5. O parser reconhece a instituição, o tipo de documento e a origem SIGAA; reconstrói linhas, separa seções e interpreta tabelas.
6. O validador aponta campos ausentes, situações desconhecidas, números não reconhecidos, faixas inesperadas e possíveis duplicações. Nenhuma tentativa é eliminada automaticamente.
7. A conferência apresenta resumo e listas expansíveis. Curso, matriz, período e campos das tentativas podem ser corrigidos; cada correção mantém a referência ao valor extraído. Registros podem ser rejeitados.
8. A escolha entre memória e IndexedDB é independente da autorização de leitura. Selecionar ou interpretar outro documento não substitui o perfil atual.
9. A substituição exige confirmação explícita, informa ambas as datas, avisa quando a nova emissão é mais antiga e substitui integralmente, sem mesclagem.
10. Cancelamento, erro e conclusão destroem a tarefa do PDF.js e liberam as referências ao texto bruto e ao arquivo. Navegar para outra rota durante a leitura também cancela a tarefa.

O contexto envolve o roteador: o perfil temporário permanece disponível entre rotas. O link da política no rodapé usa navegação interna e não recarrega a aplicação.

## Biblioteca e integração

Foi adicionada `pdfjs-dist` 6.5.438, com Vite 8.2.2. A biblioteca principal e a URL `pdfjs-dist/build/pdf.worker.min.mjs?url` são importadas dinamicamente ao iniciar a análise. Vite copia o worker para `dist/assets` com nome versionado pelo conteúdo; não há CDN. O worker deve sempre vir da mesma versão que a biblioteca.

`getDocument` recebe bytes locais, `verbosity: 0`, `useWorkerFetch: false`, `useWasm: false`, `disableFontFace: true`, `useSystemFonts: false` e `stopAtErrors: true`. A aplicação não renderiza páginas, executa scripts embutidos ou consulta links/anexos do PDF. Não fornece URLs de fontes, CMaps ou outros recursos externos. Documentos que necessitem de recursos não disponíveis podem falhar ou gerar campos desconhecidos e precisam de conferência.

As APIs foram conferidas nos tipos da versão instalada e na [documentação do PDF.js](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html). O empacotamento segue a [importação de assets por URL do Vite](https://vite.dev/guide/assets#explicit-url-imports).

O PDF.js requer Node 22.13+ ou 24+ para ferramentas que o executem no Node, além de navegador moderno com módulos e Web Workers. O processamento da aplicação ocorre no navegador; a versão Node é usada no teste do PDF sintético. As dependências de testes adicionadas são Testing Library, user-event, jsdom e fake-indexeddb; nenhuma integra a aplicação entregue no build.

## Modelo TypeScript

`models/types.ts` define `HistoricoAcademico` com `schemaVersion: 1` e:

| Campo | Conteúdo |
| --- | --- |
| `importadoEm`, `emitidoEm` | Instante de importação e data reconhecida de emissão |
| `curso` | Nome acadêmico, ID público opcional e código/ano da estrutura indicado no PDF |
| `vinculo` | Situação, ingresso, período atual do SIGAA, prazos padrão/máximo e suspensões |
| `indicesOficiais` | MC, MCN, IECH, IEPL e IEA, numéricos ou nulos |
| `cargaHoraria` | Obrigatórias, optativas, complementares e total; exigida, integralizada e pendente |
| `componentesCursados` | ID da tentativa, período, código, nome, CH, turma, frequência, média, situação e marcadores |
| `componentesPendentes` | Código, nome, CH e observação do documento |
| `equivalencias` | Componente exigido e componente utilizado, com direção preservada |
| `atividadesAutonomas` | Categoria e carga reconhecida, separadas da tabela de integralização |
| `validacao` | Advertências e referências genéricas a campos não reconhecidos, sem trechos brutos |
| `correcoes` | Caminho acadêmico corrigido e valor extraído originalmente; rejeições ficam identificadas |

Informações ausentes ficam nulas. Situações são strings extensíveis; códigos desconhecidos não recebem classificação. O período atual pode ser o número sequencial informado pelo SIGAA, não necessariamente `ano.semestre`. Não se deduz um período atual a partir da data ou da última tentativa.

Não há cálculo de índices ou integralização. O perfil corrigido é distinguível do documento por `correcoes`; as demais informações mantêm a origem de extração, sem promessa de exatidão automática.

## Estratégia do parser

`layout.ts` trabalha com pontos e origem no canto superior esquerdo, agrupando itens por proximidade vertical e ordenando por coordenada horizontal. A divisão em seções evita que legenda, equivalências e autenticação sejam tratadas como disciplinas. O estado de seção atravessa quebras de página; cabeçalhos e rodapés conhecidos são ignorados.

Nas tentativas, período e código ancoram cada registro na faixa esquerda. As colunas de CH, turma, frequência, média e situação são delimitadas pelos centros dos cabeçalhos. Na ausência de um cabeçalho reconhecido, o layout UFCA conhecido é utilizado com advertência explícita. Essa recuperação precisa ser conferida pelo estudante.

No formato de referência, o título da disciplina fica acima da linha dos resultados e o docente usa fonte menor abaixo do título. A faixa geométrica, a altura da fonte e a posição vertical selecionam somente o título; informações de docentes não integram o modelo. A identificação é conservadora: um nome não reconhecido fica nulo em vez de copiar texto de docência.

Pendências utilizam as faixas de código, nome, observação e CH. Continuação de nomes e de tabelas é preservada entre páginas. Equivalências são lidas como exigência cumprida através de outro componente; não viram relações simétricas. Valores oficiais são normalizados de ponto ou vírgula decimal, sem soma ou substituição por valores derivados.

O curso é relacionado ao índice público por ID estável ou por nome normalizado exato, removendo sufixos conhecidos de modalidade, grau e turno. Mais de um candidato impede associação automática. A associação manual é opcional e registrada como correção. A estrutura curricular do PDF é preservada; nenhum currículo mais recente é escolhido. A existência da matriz exata não é afirmada nesta etapa.

## Validação e erros

Limites iniciais centralizados em `LIMITES_PDF`:

| Proteção | Limite |
| --- | --- |
| Tamanho | 15 MiB |
| Páginas | 80 |
| Itens textuais | 150.000 |
| Caracteres extraídos | 3.000.000 |
| Tempo da tarefa PDF.js | 45 segundos |

A leitura é sequencial, limpa recursos de cada página e cede a execução entre páginas. Os limites reduzem consumo de recursos; não constituem uma quota rígida de memória do navegador. O parser posicional trabalha sobre o conteúdo já limitado.

São tratados arquivo vazio, extensão/MIME incompatíveis, assinatura falsa, senha, corrupção, excesso de páginas/conteúdo/tempo, ausência de texto, instituição/formato não reconhecido, rotação de páginas, cancelamento e falha ao carregar o módulo. Documentos como imagem recebem orientação para usar o histórico digital; não existe OCR.

Erros internos do PDF.js não chegam à interface, console ou causas encadeadas. Somente mensagens fixas revisadas de `ErroHistorico` são exibidas. Resultados incompletos apresentam advertências persistentes de extração; campos corrigidos não apagam o registro de que houve incerteza.

## Persistência e recuperação

O banco IndexedDB `planeja-ufca-perfil-academico`, versão 1, possui a store `perfil` e a chave `ativo`. Cada escrita troca integralmente esse único registro em uma transação. A interface só informa sucesso após a conclusão da transação.

`storage/schema.ts` valida tipos, estrutura, limites de listas/textos, números finitos e versão. A lista de campos permitidos reconstrói o objeto nas leituras e escritas, descartando propriedades extras inclusive dentro de objetos aninhados. Versões incompatíveis e objetos inválidos não são migrados nem removidos silenciosamente: a aplicação informa a limitação e preserva o dado até uma exclusão/substituição explícita.

Indisponibilidade do IndexedDB, bloqueio por outra aba, erros de abertura, leitura, escrita e quota produzem mensagens fixas. Se o armazenamento não estiver disponível, ainda é possível ativar o perfil em memória. Dados anteriores inacessíveis permanecem preservados e a interface informa que podem reaparecer em outro carregamento.

Substituir um perfil salvo por um temporário remove o antigo registro quando o banco está acessível; a nova versão não é gravada. Apagar os dados exige confirmação e remove somente a chave acadêmica e o perfil em memória. Não é utilizado `localStorage.clear()` no código da funcionalidade. Tema, horários e outras preferências não são alterados.

Se o banco ficar inacessível durante a exclusão, o perfil em memória ainda é apagado. A interface informa explicitamente que a exclusão persistente falhou, permite repetir a operação e orienta a remover os dados do site nas configurações do navegador. Não há mensagem falsa de exclusão completa.

## Privacidade

Durante a análise, o `File`, bytes e texto posicional existem transitoriamente na memória da página/worker. O estado compartilhado recebe somente o objeto acadêmico permitido. Após a leitura, a página elimina a referência ao arquivo, limpa o input e destrói a tarefa. Cancelamento, descarte e saída da rota também liberam o material temporário. A liberação física de memória fica sob responsabilidade do navegador.

O perfil permitido pode conter informações pessoais acadêmicas, como notas e situações. Não inclui nome completo, CPF, RG, nascimento, nacionalidade, naturalidade, matrícula institucional, código de verificação, PDF original ou texto integral. Não há serialização do arquivo, inclusão de informações do histórico em URLs ou envio do documento por HTTP.

Requisições envolvidas: código/worker estáticos da própria origem e `GET /data/curriculos/index.json` para catálogo público. O processamento não envia o PDF nem resultados a servidores. Não há POST, API de interpretação, OCR, analytics ou monitoramento de erros no fluxo. O carregamento de assets não significa envio do arquivo. A hospedagem pode tratar metadados técnicos de acesso independentemente dessa funcionalidade.

A autorização de leitura é apresentada antes da seleção; a escolha de persistência ocorre após a conferência, por dois botões distintos, sem opção de gravação previamente marcada. A recusa não bloqueia o site. `/privacidade` está disponível antes e depois da importação, inclusive no rodapé. O aviso descreve riscos de dispositivos compartilhados e extensões; não promete segurança absoluta ou conformidade jurídica garantida. A avaliação jurídica de base legal permanece separada da implementação técnica.

## Interface e acessibilidade

`HistoricoPage` cobre ausência de perfil, aviso, autorização/recusa, seleção, progresso, cancelamento, erros, conferência/correção, descarte, ativação temporária, gravação, recuperação, atualização e exclusão. Os detalhes incluem todas as tentativas e seções adicionais.

Campos possuem labels; ações usam botões nativos, detalhes expansíveis, indicador de progresso nomeado, mensagens com `role=status`/`alert`, foco visível e confirmação de substituição desmarcada. Tabelas têm rolagem própria em telas estreitas; a grade de campos e os botões se adaptam ao espaço disponível. Os três modos de tema usam os tokens existentes.

## Testes e validação

Os testes usam somente dados inventados. `fixtures.test-utils.ts` gera itens posicionais; `pdfIntegration.test.ts` gera um PDF sintético em memória com jsPDF e usa PDF.js real. Nenhum histórico pessoal foi copiado para fixture, snapshot, build ou repositório.

Cobertura: múltiplas páginas, vínculo, índices, horas, situações conhecidas/desconhecidas, todas as tentativas, marcadores, nomes extensos, docente excluído, pendências entre páginas, equivalência com direção, dados ausentes, códigos órfãos, duplicações, arquivo inválido/sem texto, autorização obrigatória, bytes sem upload, worker local, limites, senha, erro sem vazamento, cancelamento, timeout, persistência, substituição, exclusão, schema inválido/incompatível, indisponibilidade e falhas de escrita. A interface é exercitada com Testing Library e o armazenamento com fake-indexeddb.

O documento de referência foi utilizado em validação privada local. As seções acadêmicas alvo foram reconhecidas. Houve advertência de cabeçalho da tabela de componentes, com recuperação pelas posições conhecidas; esse resultado exige conferência. O arquivo, identificadores e valores acadêmicos reais não integram fixtures, snapshots ou este relatório. Essa validação não substitui testes de outros layouts nem a conferência do estudante.

No navegador, um PDF sintético completou a leitura real com worker e chegou à conferência. Foram revisados Claro, Escuro, Sistema e viewport estreita. O exemplo foi descartado sem gravação. Não foram realizadas decisões acadêmicas ou envio do histórico real pelo navegador automatizado.

Validações de entrega: `npm run lint`, `npm test` e `npm run build`. O build emite aviso de chunk acima de 500 kB, incluindo código já existente de exportação; o PDF.js é carregado sob demanda e o worker está em arquivo local separado. Os resultados consolidados estão abaixo.

| Comando | Resultado |
| --- | --- |
| `npm run lint` | Sem erros ou avisos |
| `npm test` | 147 testes em 12 arquivos, incluindo 64 testes novos da funcionalidade |
| `npm run build` | Concluído; aviso de tamanho de chunk |
| `git diff --check` | Sem erros de whitespace |

Inspeção adicional de dependências: `npm audit --json` informou 17 pacotes com avisos na árvore (12 moderados, 4 altos e 1 crítico), todos já presentes no lockfile anterior. Não apontou o PDF.js ou as novas dependências diretas de teste. Não foi executado `audit fix --force` ou atualização ampla fora desta tarefa; os avisos existentes, inclusive o de DOMPurify utilizado pela exportação prévia, exigem avaliação própria.

## Limitações e evolução

- Reconhece o layout textual UFCA/SIGAA utilizado como referência. Novos layouts, fontes, colunas ou formatos de metadados podem precisar de ajustes e sempre exigem conferência.
- O fallback posicional de colunas é sinalizado; não significa que todo PDF com o mesmo cabeçalho será interpretado corretamente.
- Nomes de disciplinas que atravessam páginas ou usam a mesma faixa/fonte de docentes podem não ser reconhecidos integralmente. Não há OCR nem leitura de páginas rotacionadas.
- Índices, horas, equivalências e pendências são exibidos para conferência e descarte do resultado; o editor simplificado concentra correções em curso, matriz, período e tentativas.
- A associação ao catálogo não confirma disponibilidade da matriz exata e não busca automaticamente uma matriz mais recente.
- Memória temporária não é backup. IndexedDB é local, sem criptografia adicional, sincronização ou garantia de permanência; extensões e pessoas com acesso ao navegador precisam ser consideradas.
- O documento representa a situação da emissão. Uma matrícula antiga não é convertida em aprovação com a passagem do tempo.

Futuras funcionalidades podem consumir `useHistorico()` e os modelos versionados, sem reinterpretar o PDF: índices podem ser calculados separadamente e comparados aos oficiais; acompanhamento pode relacionar tentativas, pendências e matriz exata; equivalências precisam manter direção; recomendações e planejamento devem considerar todas as tentativas e distinguir correções manuais. Nenhum desses algoritmos foi implementado agora.

## Arquivos criados ou alterados

Alterados: `package.json`, `package-lock.json`, `README.md`, `src/main.tsx`, `src/App.tsx`, `src/components/Footer.tsx` e `src/components/AppLayout.test.tsx`.

Criados:

- `docs/importacao-historico-lgpd.md`
- `src/pages/HistoricoPage.tsx`, `src/pages/HistoricoPage.css`, `src/pages/HistoricoPage.test.tsx`
- `src/pages/PrivacidadePage.tsx`
- `src/features/historico/models/types.ts`
- `src/features/historico/parser/layout.ts`, `errors.ts`, `ufca.ts`, `importarPdf.ts`
- `src/features/historico/parser/fixtures.test-utils.ts`, `ufca.test.ts`, `importarPdf.test.ts`, `pdfIntegration.test.ts`
- `src/features/historico/validation/profile.ts`
- `src/features/historico/storage/schema.ts`, `indexedDb.ts`, `indexedDb.test.ts`
- `src/features/historico/hooks/context.ts`, `HistoricoProvider.tsx`
- `src/features/historico/integracaoCurricular.ts`
- `src/features/historico/components/ResumoHistorico.tsx`

Nenhum commit ou push é realizado como parte desta entrega.

## Compatibilidade após o rebranding

Planeja UFCA mantém o schema acadêmico 1. Os bancos legados `projeta-ufca-perfil-academico` e `seu-horario-perfil-academico` são consultados somente na migração para o banco definitivo. Entre perfis legados válidos, vence a data `importadoEm` mais recente; em empate, vence o intermediário. Um perfil definitivo já existente sempre tem prioridade. A cópia é validada, gravada em transação e relida, sem eliminar os originais automaticamente. Uma exclusão registrada na versão intermediária impede ressuscitar o perfil original. A exclusão explícita do perfil também remove o registro legado; um marcador impede sua recuperação indevida posterior. O backup opcional em `/privacidade` permite transferir tema, horários e perfil estruturado entre domínios, com autorização separada para incluir o perfil e confirmação de restauração. O arquivo pode conter dados acadêmicos pessoais; não contém PDF, texto integral ou identificadores civis. Veja [o procedimento e as limitações](rebranding-planeja-ufca.md).
