# Turmas equivalentes e de outros cursos

## Objetivo e escopo

Permitir planejar um único horário com ofertas de diferentes cursos da UFCA, preservando seleção, identificação, salas, conflitos, persistência e exportações existentes. Não cria backend, autenticação, rotas de abas, armazenamento remoto ou dependências.

A presença de uma turma em outro curso **não garante disponibilidade de vaga nem autorização de matrícula**. A inclusão no horário também não garante aproveitamento curricular, optativa ou atividade complementar.

## Arquitetura

`App.tsx` continua carregando `cursos-atual.json`, controlando o curso principal e chamando `useHorario`. O catálogo global derivado fornece as turmas canônicas ao hook. A grade e a seção Meu horário continuam acima da seleção.

| Módulo | Responsabilidade |
| --- | --- |
| `features/horarios/catalogo.ts` | Deduplicação, procedência por ID, busca normalizada e correspondências curriculares |
| `features/horarios/referenciaCurricular.ts` | Resolução pura da matriz pública ou da matriz do histórico compatível |
| `features/horarios/useReferenciaCurricular.ts` | Consulta GET dos currículos, cancelamento e escolha local da referência |
| `features/horarios/SelecaoTurmas.tsx` | Abas, busca, filtros, seletor de origem, grupos e exibição progressiva |
| `features/horarios/TurmaCard.tsx` | Card com estilo existente, procedência, fundamento e advertências |
| `features/horarios/context.ts`, `HorariosProvider.tsx`, `selecao.ts` | Seleção e persistência existentes, sem alteração de seus contratos |
| `features/recomendacoes/services/equivalencias.ts` | Interpretação conservadora compartilhada e distinção entre matriz e cumprimento passado |

Não há inferência da procedência pelo prefixo do código. Os JSONs públicos, scraper, parser do histórico, licença e sistema de temas não foram modificados.

## Estrutura das abas

**Meu curso** é o padrão e mostra somente turmas associadas ao ID do curso principal. Preserva a listagem completa, busca, filtros e identificação comprovada de optativas. Turmas externas selecionadas ficam em Meu horário.

**Equivalentes** mostra turmas externas com correspondência segura na matriz de referência. A lista é agrupada pelo primeiro componente correspondente da matriz; o card informa todos os componentes atendidos. Uma mesma turma física nunca é repetida entre grupos. Várias turmas de um componente continuam sendo alternativas separadas, com seus respectivos horários e docentes.

**Outros cursos** permite qualquer oferta externa válida, sem exigir histórico ou relação curricular. Na consulta inicial, omite as correspondências já organizadas em Equivalentes. Busca não vazia ou seleção explícita de curso inclui também essas correspondências. Assim, qualquer turma externa pode ser encontrada por código ou curso. Uma turma compartilhada com o agrupamento principal permanece em Meu curso.

As abas usam estado React, `tablist`, `tab`, `tabpanel`, `aria-selected`, `aria-controls`, `aria-labelledby` e roving tabindex. Setas esquerda/direita navegam circularmente e ativam a aba; Home/End vão à primeira/última. Tab entra no painel ativo e seus controles. Painéis inativos ficam ocultos. A aba ativa tem peso e sublinhado, além da cor.

Ao trocar de aba, busca, filtro, origem e limite são reiniciados e avisos anteriores são fechados. As seleções, o curso principal e a estrutura de referência permanecem. Ao trocar curso principal, a seleção de abas volta ao padrão. Filtros, busca e escolha de referência são estado de consulta, sem novas chaves persistidas.

## Identificação dos cursos

Curso principal e curso de oferta são conceitos diferentes. Os seletores utilizam `curso.id`; nomes repetidos recebem o ID no rótulo. Todos os cursos presentes no catálogo podem ser consultados, inclusive um curso sem turmas, que produz estado vazio. Nenhuma quantidade de cursos, semestre ou total de registros é fixado no código.

## Identificação das turmas

Permanece o contrato legado de `gerarIdTurma`:

```text
codigo|turma|docente|horario_sigaa
```

Procedência não participa da identidade e não requer migração. O catálogo em memória acrescenta `id`, `turma`, `cursos: { id, nome }[]` e `divergente` sem alterar `Turma` ou os dados de origem.

## Turmas compartilhadas e divergências

Registros de mesma identidade são apresentados uma só vez, acumulando todos os cursos associados. O card pode mostrar “Ofertada nos agrupamentos de”. O mapa de procedência preserva nomes e IDs também nas exportações.

Antes de consolidar, comparam-se disciplina, período, vagas reservadas, local geral e encontros, inclusive a diferença semântica entre sala ausente e sala explicitamente desconhecida. Metadados divergentes produzem aviso e impedem nova inclusão daquele registro pela consulta e pelo recomendador; não apagam seleções antigas.

Na inspeção dos dados de referência, `2026.2` continha 501 registros em 22 cursos, correspondendo a 500 identidades. A turma `FIL0105`, número `01`, docente WESLEY RENNYER MARTINS RABELO PORTO (nome público do catálogo), horário `6T468  6N0`, estava nos agrupamentos `628404` e `628348`, ambos Filosofia. Os metadados completos eram idênticos. Esses totais são apenas o registro da inspeção, sem uso na lógica.

## Consulta de equivalências

`correspondenciasCurriculares` verifica exclusivamente os componentes da estrutura de referência:

1. Mesmo código: badge **Mesmo componente**, com explicação de oferta em outro agrupamento.
2. Código individual seguro de `equivalentesCurriculares`: badge **Equivalente curricular**, com código/nome exigidos e indicação de previsão na matriz.

O código e o nome reais da turma ofertada permanecem intactos. Mesmo nome, mesma carga, prefixo semelhante ou pertencimento a outro curso não constituem prova de equivalência. Não se presume direção inversa ou reconhecimento em cadeia.

Optativa só recebe badge quando o **código da própria oferta** consta como optativa na matriz consultada. Uma alternativa externa de uma exigência optativa não é automaticamente classificada como optativa do curso principal.

## Interpretação das expressões

Reutiliza-se `alternativasSeguras`, centralizada em `equivalencias.ts`, agora também validando parênteses e consumo integral da expressão. Aceita código individual e disjunções `OU`, inclusive agrupamentos aninhados. Uma lista com múltiplos códigos sem expressão permanece ambígua. Expressão/lista incoerentes, operadores desconhecidos, parênteses inválidos e conjunções são rejeitados como alternativas individuais.

Conservadoramente, **qualquer expressão com `E` fica fora da classificação individual**, inclusive a alternativa `C` em `(A E B) OU C`. Não se implementa matrícula conjunta de equivalências nem análise parcial de ramos compostos nesta etapa. A interface informa a existência dessas regras; todas as ofertas continuam acessíveis na consulta geral.

## Integração com o histórico

Reutiliza `identificarCurso` e `identificarEstrutura`, de `historico/integracaoCurricular.ts`, sem modificar o parser. IDs explícitos não são substituídos por nomes. Só aplica dados individualizados quando curso e matriz correspondem ao vínculo importado.

Com histórico compatível, as opções do seletor limitam-se ao código da matriz do estudante. Uma versão única é identificada diretamente; versões homônimas exigem escolha explícita do ID. Código ausente não permite fallback para matriz mais recente. O usuário precisa conferir/corrigir o vínculo no histórico.

Sem histórico compatível, usa estruturas públicas do curso principal, ordenadas por ano e ID, sugerindo a mais recente com mensagem explícita de **sugestão**, e permitindo mudar pelo seletor. Arquivo com ID de curso divergente é recusado. Falta/falha de currículo é explicada e não impede Outros cursos.

Cumprimentos são obtidos pela análise acadêmica existente (`analisarSituacao`), incluindo conflitos entre cumprimento e pendência. Só estados com cumprimento confirmado recebem a informação discreta **Já cumprida**; isso não bloqueia seleção manual. Um registro histórico comprova aquele cumprimento e não cria autorização universal para futuras ofertas.

## Integração com a persistência

`useHorario`, `HorariosProvider`, `gerarIdTurma`, `gerarStorageKey` e `lerIdsHorario` permanecem com o contrato existente:

```text
planeja-ufca:<periodo>:<cursoIdPrincipal>:turmas
```

Todas as origens escrevem a mesma lista de IDs. Nenhuma chave é criada por aba, curso de origem ou matriz. O catálogo completo recupera turmas externas após recarregar. Navegar pelas páginas mantém o provedor compartilhado; recarregar recupera localStorage. Trocar curso principal consulta sua própria chave sem apagar a anterior. IDs antigos ou ausentes da oferta não são apagados por abrir ou filtrar a página.

## Integração com o recomendador e carga horária

`equivalentesCurriculares` delimita correspondências futuras pela matriz, enquanto `equivalentesPermitidos` e `cumprimentos` conservam evidências do passado. `localizarOfertas` reutiliza o catálogo deduplicado, preserva a preferência pela origem do curso principal e apresenta registros apenas históricos como necessitando confirmação, sem promovê-los ao plano. A pontuação não foi alterada.

`duplicaExigencia` utiliza as mesmas relações direcionais da matriz na consulta e no planejador. Na consulta manual, duplicação de exigência é **advertência**, permitindo comparar componentes; no conjunto recomendado, impede sugestão redundante. Nunca substitui ou remove turmas automaticamente. Conclusão prévia também não bloqueia a consulta manual. As regras técnicas permanecem iguais nas duas entradas.

`cargaDaTurma` só retorna carga curricular finita e positiva, diretamente identificada ou com valor único entre exigências equivalentes. Não estima horas por encontros semanais. Carga ausente, divergente, zero, negativa, NaN ou infinita é desconhecida. O horário permanece disponível e o planejador mostra a limitação, exibe somente o subtotal identificado e suspende inclusões que dependeriam de confirmar o total.

## Conflitos, busca e filtros

`encontrarConflitos` compara todas as turmas selecionadas independentemente da origem. `validarAdicao` mantém validações de período, uma turma por código e sobreposição, sem substituição silenciosa. A mesma turma física também não é duplicada.

Busca normaliza acentos, maiúsculas e espaços externos. Pesquisa código, nome, docente e nomes dos agrupamentos. Os filtros Todas, Disponíveis, Com conflito e Selecionadas atuam somente dentro da aba e das restrições de busca/origem atuais. **Disponíveis significa ausência de conflito conhecido, sem confirmar vagas livres.** Horários ausentes recebem advertência; compatibilidade desconhecida não é prometida.

Abas externas renderizam até 24 cards inicialmente e acrescentam 24 por ação explícita em Mostrar mais turmas. Busca, filtro, curso de oferta ou matriz reiniciam o limite. Meu curso mantém sua lista completa. Não há biblioteca de virtualização.

## Exportações

`exportarHorarioCsv`, `gerarHorarioPdf` e `exportarHorarioPdf` aceitam opcionalmente `Procedencias`, um mapa de ID de turma para cursos associados. Chamadores antigos de três parâmetros continuam válidos.

PDF mantém grade, detalhamento, horários, salas e paginação, acrescentando cursos/IDs conhecidos na relação detalhada, com quebra de linhas e continuação de páginas. CSV preserva as nove colunas anteriores; quando o mapa é fornecido, acrescenta Curso de oferta ao final, sem mudar BOM UTF-8, separador `;`, escape ou linhas por encontro. Origem desconhecida fica vazia no CSV e é omitida do detalhe PDF. Nenhuma turma é descartada por ser externa.

## Privacidade e apresentação

Somente GETs para `/data/cursos-atual.json`, `/data/curriculos/index.json` e o arquivo público curricular do curso. Nenhum perfil, histórico ou preferência é transmitido. O histórico continua temporário em memória ou opcionalmente em IndexedDB, segundo a autorização existente.

Reutiliza variáveis e classes CSS dos temas atuais, com ajustes locais para abas e procedência. Cards quebram nomes extensos, filtros permitem múltiplas linhas e seletores ocupam a largura disponível. A grade mantém sua rolagem interna já existente.

## Testes e validação

Fixtures sintéticas, sem SIGAA ou serviços externos:

- `src/features/horarios/catalogo.test.ts`: identidade, origens, homônimos, salas divergentes, busca, equivalências individuais/OU/E/compostas/inválidas/direcionais, ausência de simetria/transitividade, histórico contextual, matrizes compatíveis/ausentes/ambíguas e estabilidade da carga.
- `src/App.test.tsx`: três abas, teclado/foco/ARIA, temas, optativas, matrizes, regras compostas, filtros, estados vazios, curso sem turmas/currículo, curso homônimo, deduplicação, exibição progressiva, conflitos e duplicações entre cursos, preservação da chave, curso principal, navegação, recarga, remoção e argumentos das duas exportações.
- `src/utils/exportarCsv.test.ts` e `src/utils/exportarPdf.test.ts`: geração real com origens múltiplas/desconhecidas, salas e horários, BOM/escape, compatibilidade dos chamadores antigos e paginação extensa.
- Testes anteriores do recomendador e demais módulos continuam obrigatórios. O teste de acesso ao guia foi envolvido no contexto acadêmico vazio para refletir o contexto público disponível na aplicação.

Executar `npm run lint`, `npm test` e `npm run build`. O fluxo de integração adiciona oferta própria, equivalente e externa, exporta as três, navega, desmonta/remonta para simular recarga e remove só uma externa, validando a chave legada e os IDs remanescentes.

Resultado desta entrega: **373 testes em 22 arquivos aprovados**, lint aprovado, build de produção concluído e `git diff --check` sem problemas. O aviso não bloqueante de bundle acima de 500 kB já estava registrado nas entregas anteriores e permanece visível. Não há falhas de verificação pendentes.

A inspeção no navegador utilizou a oferta pública local, confirmou os seletores das matrizes de Computação, a identificação de EM0010 como alternativa para CC0063 e a procedência de Engenharia de Materiais, além da consulta por curso. Foram conferidos temas claro/escuro e largura útil de 325 px: `document.documentElement.scrollWidth` de 320 px, sem transbordamento da página. A grade conserva a rolagem interna. Não foram observados erros no console durante a inspeção.

## Arquivos criados ou modificados

```text
README.md
docs/recomendacoes-academicas.md
docs/turmas-outros-cursos.md
src/App.tsx
src/App.css
src/App.test.tsx
src/features/horarios/catalogo.ts
src/features/horarios/catalogo.test.ts
src/features/horarios/fixtures.test-utils.ts
src/features/horarios/referenciaCurricular.ts
src/features/horarios/useReferenciaCurricular.ts
src/features/horarios/SelecaoTurmas.tsx
src/features/horarios/TurmaCard.tsx
src/features/recomendacoes/services/equivalencias.ts
src/features/recomendacoes/services/disponibilidade.ts
src/features/recomendacoes/services/elegibilidade.ts
src/features/recomendacoes/services/planejamento.ts
src/features/recomendacoes/services/recomendador.ts
src/pages/RecomendacoesPage.tsx
src/pages/GuiaAcademicoPage.test.tsx
src/utils/exportarCsv.ts
src/utils/exportarCsv.test.ts
src/utils/exportarPdf.ts
src/utils/exportarPdf.test.ts
```

## Limitações e evoluções relacionadas

Catálogos públicos podem ter matrizes ausentes, códigos ambíguos, horários/locais desconhecidos e dados desatualizados. Ausência de conflito identificado não confirma matrícula, vagas ou aproveitamento. A grade semanal e seu intervalo de dias/horas permanecem os existentes; encontros fora desse intervalo continuam no detalhamento e exportação.

Ficam para trabalhos futuros: interpretação estruturada de ramos compostos com comprovação de vigência, detalhamento das diferenças entre registros públicos divergentes e manutenção explícita da referência de consulta entre sessões. Nenhuma dessas evoluções foi implementada.

## Compatibilidade após o rebranding

A marca pública é Planeja UFCA. Na ausência da chave definitiva, a aplicação consulta `projeta-ufca:<periodo>:<cursoId>:turmas` e depois `seu-horario-ufca:<periodo>:<cursoId>:turmas`. A primeira seleção existente é validada e copiada sem apagar o original; listas vazias também têm prioridade. Os IDs de turmas permanecem estáveis. Consulte [a migração](rebranding-planeja-ufca.md).
