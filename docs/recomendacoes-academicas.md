# Recomendações acadêmicas

O planejador em `/recomendacoes` combina o histórico já conferido, a matriz correspondente ao estudante, a oferta pública e preferências para sugerir disciplinas. O algoritmo é determinístico e executado no navegador. Não usa IA generativa, notas ou índices para julgar capacidade acadêmica. Não calcula índices, flexibilizações ou datas de formatura.

## Uso

1. Em **Meu Histórico Acadêmico**, importe e confira um PDF digital do SIGAA. Ative o perfil somente na sessão ou salve no dispositivo pelos controles existentes.
2. Abra **Planejar meu próximo semestre** na página principal ou no histórico.
3. Confira curso, matriz, período da oferta, data do documento e advertências. Se houver ambiguidade de curso ou de ID da matriz, confirme explicitamente a opção correspondente.
4. Ajuste carga pretendida, dias, turnos e estratégia; pressione **Gerar recomendações**.
5. Consulte as justificativas, tentativas, turmas alternativas e fontes de cada disciplina.
6. Adicione uma turma elegível ou o conjunto sugerido. Correquisitos ainda pendentes só entram com seu conjunto compatível.
7. Em **Ver e exportar meu horário**, continue utilizando a grade e as exportações existentes. É possível remover turmas normalmente, inclusive no planejador.

A ferramenta é independente da UFCA. Uma turma constar na oferta não comprova vaga livre ou autorização de matrícula.

## Arquitetura e arquivos

| Arquivo ou diretório em `src/` | Responsabilidade |
| --- | --- |
| `features/recomendacoes/models/types.ts` | Preferências, avaliação em três estados, situação, oferta, fatores e resultado |
| `features/recomendacoes/services/situacaoCurricular.ts` | Classificação acadêmica considerando todas as tentativas |
| `features/recomendacoes/services/equivalencias.ts` | Tipos de conclusão, evidências e equivalências direcionais |
| `features/recomendacoes/services/requisitos.ts` | Validação da árvore, avaliação recursiva E/OU e correquisitos conservadores |
| `features/recomendacoes/services/dependencias.ts` | Dependentes diretos/indiretos e simulação de desbloqueios |
| `features/recomendacoes/services/elegibilidade.ts` | Condições acadêmicas, cobertura de exigências, duplicações e carga curricular |
| `features/recomendacoes/services/disponibilidade.ts` | Cruzamento da oferta completa e compatibilidade com horários/preferências |
| `features/recomendacoes/services/pontuacao.ts` | Pesos centralizados e fatores explicáveis |
| `features/recomendacoes/services/recomendador.ts` | Coordenação e seleção gulosa de um conjunto compatível |
| `features/recomendacoes/services/planejamento.ts` | Revalidação pura de inclusão explícita, inclusive matrícula conjunta |
| `features/recomendacoes/hooks/useRecomendacoes.ts` | Consulta GET dos catálogos, associação e estados de carregamento/erro |
| `features/recomendacoes/components/` | Formulário, resumo, cards e explicações |
| `features/horarios/selecao.ts` | Identificação legada, leitura defensiva e validação de adição |
| `features/horarios/context.ts`, `HorariosProvider.tsx` | Seleção compartilhada e uma única operação de persistência |
| `pages/RecomendacoesPage.tsx`, `.css` | Página responsiva com cores do tema existente |

A lógica acadêmica fica nos serviços puros; React apresenta resultados e encaminha ações. `gerarRecomendacoes` recebe inclusive `agora` explicitamente para permitir testes reproduzíveis.

Arquivos existentes alterados: `App.tsx`, `AppRoutes.tsx`, `components/AppLayout.tsx`, `features/historico/integracaoCurricular.ts`, `pages/HistoricoPage.tsx`, `pages/PrivacidadePage.tsx` e `README.md`. Os testes novos estão em `features/recomendacoes/services/academico.test.ts`, `recomendador.test.ts`, `features/recomendacoes/fixtures.test-utils.ts` e `pages/RecomendacoesPage.test.tsx`.

Não foram alterados o parser, o esquema do perfil, o coletor Python, os JSON públicos, as exportações, a licença ou a identidade geral do projeto.

## Fontes, entrada e saída

Entradas:

- Perfil de `useHistorico()`, em memória ou recuperado pelo IndexedDB existente.
- Índice `/data/curriculos/index.json` e arquivo do curso indicado pelo índice.
- Estrutura pelo **código do histórico**, distinguindo-o do ID interno.
- `/data/cursos-atual.json`, incluindo todos os agrupamentos de cursos e o campo `periodo`.
- Horário atual, preferências e data da análise.

A associação reutiliza `associarCurso`. Um ID disponível precisa corresponder ao catálogo; o recomendador não o troca por um nome semelhante. Na ausência do ID, só usa igualdade do nome normalizado. Remove qualificadores oficiais de modalidade, grau, turno e a forma unidade/campus do SIGAA, sem comparação aproximada. Candidatos múltiplos exigem escolha explícita. O campo bruto da estrutura pode vir como `AB001 - 2020.1`; `codigoEstruturaHistorico` reconhece somente o código completo e esse sufixo estritamente definido. Preserva o texto importado. Não usa prefixos arbitrários nem a matriz mais recente como substituta.

Saída `ResultadoRecomendacoes`:

- `itens`: componentes não concluídos com situação, tentativas, pré/correquisitos, ofertas, pontuação, fatores, prioridade, categoria, motivos, advertências e fontes.
- `plano`: turmas propostas para **acrescentar** ao horário atual.
- `cargaPlanejada`: carga curricular identificada, incluindo escolhas anteriores.
- `avisos`: atualidade, qualidade dos dados, correções e exigências não representadas na matriz.
- `pendentes`: exigências obrigatórias distintas não comprovadamente cumpridas.
- `elegiveis`: componentes com condições acadêmicas ordinárias conhecidas satisfeitas.
- `ofertados`: componentes candidatos com alguma oferta reconhecida.

Optativas são opções para completar a carga da categoria. Cada optativa não cursada não é contada como pendência obrigatória; quando o histórico informa carga optativa pendente igual a zero, essas opções deixam de compor as sugestões. Exigências administrativas fora da matriz, como ENADE, são sinalizadas separadamente.

## Situação curricular

| Códigos ou evidência | Tratamento |
| --- | --- |
| `APR`, `APRN` | Conclusão, preservando aprovação por média ou por nota |
| `DISP` | Conclusão por dispensa, com origem distinta |
| `TRANS`, `INCORP`, `CUMP` | Cumprimento por transferência, mobilidade ou curso anterior, com origem distinta |
| Equivalência expressamente registrada | Exigência cumprida por equivalência, com código utilizado e origem |
| `REP`, `REPF`, `REPMF`, `REPN`, `REPNF` | Reprovação anterior; pode voltar a ser recomendada se ainda pendente |
| `TRANC`, `CANC` | Trancamento/cancelamento; não comprovam aprovação |
| `MATR` no período da oferta | Matriculado; não recomendar novamente e não usar como aprovação de pré-requisito |
| `MATR` em outro período ou sem período | Indeterminado; pedir confirmação do resultado |
| `REC`, `PARCCUMP`, ausentes ou desconhecidos | Indeterminado, preservando o código original |
| Sem tentativa, em perfil não vazio | Pendente, salvo evidências de cumprimento ou ambiguidade |
| Histórico sem tentativas | Situação indeterminada para os componentes |
| Cumprimento e pendência contraditórios | Confirmação necessária; não presumir conclusão |

Nenhuma tentativa é descartada pelo recomendador. Uma aprovação comprovada prevalece sobre reprovações anteriores; elas continuam disponíveis na explicação. Registros de matrícula antigos nunca viram aprovação pelo decurso do tempo. Reprovação ou trancamento em equivalente reconhecido também ajudam a identificar uma retomada relevante.

Advertências do importador e campos não reconhecidos aparecem na página. A emissão anterior ao semestre civil da análise e matrículas de outro período geram aviso de desatualização. A data do documento fica sempre visível. O aviso por semestre civil é uma aproximação, não uma consulta do calendário acadêmico.

## Equivalências

Cada componente da matriz estabelece a direção **código exigido ← código utilizado**. O histórico pode também registrar explicitamente essa relação. O sistema preserva três origens: conclusão direta, cumprimento registrado no histórico e equivalência prevista na matriz.

Para regras curriculares sem árvore lógica, uma expressão contendo somente alternativas `OU`, ou uma lista com um único código, é interpretável com segurança. Uma conjunção, texto especial, expressão inconsistente ou lista múltipla sem operador permanece condicionada à confirmação. Essa verificação reconhece apenas a forma simples; não é outro parser de expressões acadêmicas.

O resultado por equivalência consulta apenas conclusões **diretas** dos códigos utilizados. Não realimenta o reconhecimento em cadeia: A aceitar B e B aceitar C não faz A aceitar C. Também não cria a direção inversa nem associa por nomes ou cargas iguais. Um registro explícito de cumprimento no histórico é evidência própria, mesmo quando não existe tentativa correspondente no documento importado.

Na oferta futura, são aceitos o código exato e equivalentes individuais previstos na matriz pela direção correspondente (`equivalentesCurriculares`). Um cumprimento explicitamente registrado no histórico continua válido na análise do passado (`equivalentesPermitidos`/`cumprimentos`), mas, sozinho, não autoriza futuras ofertas: essas correspondências aparecem com advertência contextual e não entram no plano. Alternativas potenciais com expressão composta ou ambígua também exigem confirmação. A cobertura por exigência impede o planejador de incluir dois componentes que cumpririam a mesma exigência reconhecida. A [consulta manual de turmas externas](turmas-outros-cursos.md) informa a mesma duplicação como advertência, permitindo comparar alternativas; as validações técnicas de período, código e conflitos continuam compartilhadas.

## Pré-requisitos e correquisitos

A árvore `RegraRequisito` existente é validada antes da avaliação; ciclos estruturais, folhas ou operadores inválidos não são aceitos. O avaliador preserva a árvore e devolve `satisfeito`, `nao-satisfeito` ou `indeterminado`, incluindo descrições e resultados dos ramos.

- `E`: uma pendência conhecida bloqueia; todos satisfeitos satisfazem; nos demais casos há incerteza.
- `OU`: uma alternativa satisfeita basta; todas pendentes bloqueiam; nos demais casos há incerteza.
- Expressão/lista de pré-requisitos sem árvore válida: indeterminado.
- Código sem situação conhecida: indeterminado.
- Sem expressão, lista ou árvore: sem pré-requisito registrado.

O plano nunca trata outra sugestão do mesmo semestre como pré-requisito **aprovado**.

Correquisitos com forma simples e segura aceitam conclusão prévia, `MATR` comprovada no período consultado ou inclusão concomitante no mesmo conjunto. Uma matrícula de outro período não comprova concomitância. Um correquisito ainda pendente só gera conjunto proposto se ele próprio tiver pré-requisitos satisfeitos, oferta compatível, carga dentro da preferência e seus próprios correquisitos atendidos. Correquisitos recíprocos são tratados no mesmo pacote. Alternativas `OU` são consideradas sem exigir todas. Expressões complexas, inclusive conjunções sem árvore, ficam para confirmação; não se presume uma relação `E` apenas pela lista de códigos.

## Dependências

As arestas vêm das folhas das árvores válidas. Uma busca com conjunto de visitados encontra dependentes diretos e indiretos sem repetição ou ciclos infinitos. Componentes concluídos não contam como pendências dependentes.

Para estimar **desbloqueio imediato**, o algoritmo simula a conclusão de um único componente e reavalia os pré-requisitos completos de cada pendente, incluindo `E` e `OU`, além dos correquisitos conhecidos. Conta apenas quem passa a ter condições acadêmicas conhecidas satisfeitas. Um caminho `OU` já atendido não recebe um novo desbloqueio. A oferta futura e as preferências não são previstas por essa contagem.

Dependência direta/indireta e desbloqueio são expostos separadamente. Nenhum número é convertido em semestres economizados.

## Pontuação e estratégias

`PESOS` e `LIMITES_PRIORIDADE` ficam em `services/pontuacao.ts`. Cada fator é a quantidade observada multiplicada pelo peso abaixo; fatores zero não geram justificativa afirmativa.

| Critério | Equilibrado | Priorizar avanço | Concentrar horários |
| --- | ---: | ---: | ---: |
| Obrigatória ainda não cumprida | 80 | 110 | 65 |
| Por desbloqueio imediato | 25 | 40 | 20 |
| Por dependente direto | 5 | 7 | 4 |
| Por dependente indireto distinto | 2 | 3 | 1 |
| Por nível anterior ao planejamento estimado | 4 | 6 | 3 |
| Com oferta reconhecida | 15 | 15 | 15 |
| Retomada após reprovação ou trancamento | 6 | 6 | 6 |
| Com turma compatível | 15 | 10 | 20 |
| Por dia de uma alternativa já usado no horário atual | 2 | 0 | 15 |

O nível de planejamento é estimado pela distância entre ingresso e período da oferta, mais um. Não desconta suspensões ou mobilidade e não representa o enquadramento oficial no processamento de matrícula. Na ausência de períodos interpretáveis, esse fator fica zero. As notas e os índices oficiais não participam dos pesos.

Prioridade alta: pelo menos 120 pontos; média: pelo menos 65; baixa: abaixo de 65. A prioridade estratégica não elimina bloqueios acadêmicos. Desempates: pontuação decrescente, nível recomendado crescente (ausente ao final) e código crescente. Alternativas de turmas têm desempate por identificação legada.

O conjunto usa seleção gulosa nessa ordem. Reavalia horários contra escolhas existentes e sugestões anteriores; tenta as alternativas conhecidas e pacotes de correquisitos. Em **Concentrar horários**, prefere a alternativa que acrescenta menos dias ao conjunto em construção. Não é uma otimização exaustiva nem garante a menor quantidade global de dias.

## Oferta, horários e integração

A consulta considera todos os cursos de `cursos-atual.json`, filtrando as turmas pelo período desse arquivo. Não fixa semestre no código. Distingue componente da matriz, mesmo código em outro agrupamento e equivalente de outro curso. Duplicatas de uma mesma turma em agrupamentos diferentes são consolidadas pela identificação existente, preferindo a procedência do curso principal.

Horários são analisados com `encontrarConflitos()`. Não existe um segundo detector de sobreposição. Preferências verificam **todos** os encontros e todos os turnos atravessados: manhã antes das 12h, tarde das 12h às 18h e noite a partir das 18h. Essas faixas organizam o planejamento, sem alterar horários do SIGAA. Dias vazios ou turnos vazios não liberam turmas. Horários ausentes/inválidos não são considerados compatíveis.

O limite é a carga curricular identificada da turma, somando o horário existente e o conjunto novo. Se uma turma já selecionada não puder ser relacionada a uma carga na matriz, o plano automático é suspenso com aviso. Os horários existentes continuam acessíveis. Nenhuma carga escolhida valida limites oficiais de matrícula.

O provedor compartilhado fica no `AppLayout` e não realiza consultas extras. Mantém:

```text
ID: codigo|turma|docente|horario_sigaa
Chave: projeta-ufca:<periodo>:<cursoId>:turmas
Valor: array de IDs (compatível com os horários antigos)
```

Apenas uma operação compartilhada altera a seleção e persiste os IDs. Revalida duplicação e conflitos no momento da adição. A inclusão de um conjunto é atômica: se algum item falhar, nada é acrescentado. A validação acadêmica também é repetida antes de incluir. Não substitui ou remove escolhas anteriores.

Turmas equivalentes de outros cursos ficam no horário do **curso do estudante**. A página principal resolve IDs sobre a oferta completa e mostra também essas seleções, que continuam removíveis e exportáveis. `/?curso=<id>` abre o horário correspondente. Chaves de outros cursos ou períodos não são alteradas. Se localStorage estiver bloqueado, as escolhas continuam na sessão.

## Categorias e interface

- **Recomendadas agora:** fazem parte do conjunto compatível; correquisitos ainda pendentes estão claramente condicionados à inclusão conjunta.
- **Disponíveis, mas com menor prioridade:** academicamente elegíveis e ofertadas, fora do conjunto por prioridade, carga ou compatibilidade; alternativas incompatíveis ficam sem ação de inclusão.
- **Dependem de requisitos:** pendências conhecidas impedem matrícula isolada.
- **Sem oferta identificada:** condições acadêmicas conhecidas satisfeitas, sem turma reconhecida nessa oferta.
- **Precisam de confirmação:** matrículas sem conclusão, regras insuficientes, equivalências ambíguas ou outras incertezas relevantes.

Os cards mostram código, nome, tipo, nível, carga, prioridade, docentes, horários, salas e procedência. A explicação reúne fatores efetivamente calculados, expressão avaliada, tentativas preservadas e fontes. Categorias recolhíveis reduzem o volume da página. O CSS usa as variáveis existentes de temas claro/escuro/automático e reorganiza campos, cards e resumo em telas pequenas.

## Privacidade

Não há envio de histórico, notas, índices, preferências ou resultados a APIs externas. As únicas requisições do recomendador são GET dos arquivos públicos. Não existe backend, autenticação ou banco novo. Não persiste recomendações nem preferências de planejamento.

O perfil continua sob os controles existentes de sessão e IndexedDB. Ao apagar o perfil, a subárvore do planejador é desmontada, invalidando seus resultados e estados em memória. Não há cache global do perfil ou dos resultados derivados. A seleção dos horários contém somente IDs de turmas e é independente da exclusão acadêmica.

O PDF fornecido para desenvolvimento foi conferido localmente, sem ser incorporado ao repositório. Os testes versionados usam exclusivamente dados sintéticos.

## Referências normativas e limites

Consulta em 07/11/2026:

- [Regulamento compilado até a Resolução Consuni nº 308/2026](https://documentos.ufca.edu.br/wp-folder/wp-content/uploads/2026/02/Regulamento-da-Graduação_Atualizado-até_res-308_2025-versão-compilada-1.pdf).
- [Resolução Consuni nº 308, de 30/01/2026](https://documentos.ufca.edu.br/wp-folder/wp-content/uploads/2026/01/Resolucao_nC2BA_308_2026_ad_referendum_alter._Regulamento_Graduacao_assinado.pdf).
- [Catálogo de resoluções do Consuni](https://www.ufca.edu.br/instituicao/administrativo/estrutura-organizacional/orgaos-complementares/seods/consuni/).
- [Documentos da Prograd](https://www.ufca.edu.br/instituicao/administrativo/estrutura-organizacional/pro-reitorias/prograd/documentos/).

Os arts. 72–77 fundamentam a separação entre pré-requisitos, correquisitos e equivalências. O art. 73 prevê procedimentos de flexibilização, que esta implementação não concede nem simula como aprovação. Os arts. 197–198 remetem os limites de carga ao curso e às decisões competentes. O art. 202 trata do processamento oficial de vagas; a pontuação da aplicação não reproduz essa prioridade. A versão compilada registra alterações de 2025 e 2026. A busca nos catálogos não identificou redação posterior dos dispositivos usados; isso não substitui confirmação institucional ou acompanhamento normativo contínuo.

Limitações explícitas:

- Regras complexas sem árvore, relações com vigência não informada e equivalências ambíguas exigem confirmação.
- Não carrega requisitos próprios da matriz de um curso externo: a elegibilidade é avaliada para a exigência na matriz do estudante. A matrícula em equivalentes ofertados em outro curso permanece sujeita à análise oficial desse componente.
- Não conhece vagas livres, limites específicos de carga, ofertas futuras ou decisões excepcionais.
- Não presume o resultado de uma matrícula antiga e não completa dados ausentes do documento.
- A seleção gulosa pode deixar de encontrar uma combinação melhor ou um pacote viável por outro caminho. Não apresenta inviabilidade global como conclusão oficial.
- Remover uma turma do horário é uma ação de planejamento, sem qualquer alteração no SIGAA. Ao retirar correquisitos, revise também as disciplinas que dependem da matrícula conjunta.

## Validação e evolução

Verificações previstas para esta entrega:

```bash
npm run lint
npm test
npm run build
python3 -m pytest tests
```

Os testes novos exercitam situações oficiais/desconhecidas, tentativas múltiplas, equivalências direcionais/ambíguas, ausência de transitividade/simetria, árvores E/OU compostas e inválidas, ciclos, dependentes e desbloqueios distintos, pesos, determinismo, preferências, correquisitos conjuntos, múltiplas turmas, duplicações, conflitos, carga, curso/matriz incorretos ou ambíguos, associação com qualificadores, importação sintética, perfil temporário/salvo, integração com horários existentes e invalidação após exclusão. Há validação manual da importação com PDF sintético e da apresentação responsiva no navegador.

Validação realizada: 232 testes do Vitest e 34 testes Python passaram; lint e build concluídos. A checagem local do PDF de referência também passou, sem incorporar o documento aos testes versionados. O build conclui com aviso de chunk principal acima de 500 kB; o pacote inclui o suporte a PDF. A validação visual incluiu o tema escuro e uma largura útil de 387 pixels sem transbordamento horizontal, além dos temas claro/escuro/automático nos testes da interface.

Evoluções possíveis, fora desta implementação: planejamento de múltiplos semestres, oferta histórica/futura, interpretação de correquisitos estruturados, verificação de vigência das equivalências, otimização global de horários e projeções de conclusão com dados e regras adequados. Nenhuma dessas projeções é implementada aqui.

## Compatibilidade após o rebranding

A marca pública é Projeta UFCA. As antigas chaves `seu-horario-ufca:<periodo>:<cursoId>:turmas` são lidas quando a nova chave não existe e copiadas sem apagar o original. Os IDs de turmas permanecem estáveis. Consulte [a migração](rebranding-projeta-ufca.md).
