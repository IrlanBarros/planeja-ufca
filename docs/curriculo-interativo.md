# Currículo interativo

## Objetivo e arquitetura

A página `/curriculo?curso=<id>` preserva a matriz pública e oferece acompanhamento individual derivado do perfil já importado. Não há backend, autenticação, novo parser de histórico ou alteração dos catálogos públicos. A personalização e as exportações são inteiramente locais.

O fluxo é: catálogo público → resolução de curso/matriz → `analisarSituacao` → `elegibilidade` → apresentação visual e horas oficiais → modelo intermediário → PDF/CSV.

### Módulos criados

| Arquivo em `src/features/curriculo/` | Responsabilidade |
| --- | --- |
| `models/types.ts` | Modos, rótulos, situações visuais, indicadores e modelo de exportação |
| `services/progressoCurricular.ts` | Projeção dos estados do recomendador e validação das horas oficiais |
| `services/prepararExportacao.ts` | Verificação do vínculo, projeção de dados, agrupamento e nomes dos arquivos |
| `components/SeletorModoCurriculo.tsx` | Alternância por botões com `aria-pressed` |
| `components/ResumoProgresso.tsx` | Quatro indicadores, contagens separadas e advertências |
| `components/LegendaProgresso.tsx` | Explicações textuais e quatro cores, com incerteza neutra |
| `components/ComponenteCurriculoCard.tsx` | Detalhes com os elementos nativos `details`/`summary` |
| `components/ExportacaoCurriculo.tsx` | Downloads explícitos, carregamento e falhas; carregamento adiado do módulo PDF |
| `components/AcessoProgressoCurricular.tsx` | Resolução e acesso à matriz a partir do histórico |
| `exportacao/exportarCurriculoPdf.ts` | PDF A4 por períodos, com continuidade e rodapés |
| `exportacao/exportarCurriculoCsv.ts` | Tabela CSV protegida e download com Blob temporário |
| `fixtures.test-utils.ts` | Dados exclusivamente sintéticos para testes |
| `services/progressoCurricular.test.ts` | Classificação, requisitos, indicadores e integração com o recomendador |
| `exportacao/exportacao.test.ts` | Modelo, proteção de dados, CSV e PDF reais com jsPDF |

### Arquivos existentes modificados

- `src/pages/CurriculoPage.tsx`: consulta pública, seleção preferencial da matriz do histórico, dois modos, validação do vínculo e composição dos componentes.
- `src/pages/CurriculoPage.css`: interação, indicadores e apresentação responsiva com os tokens existentes.
- `src/features/historico/integracaoCurricular.ts`: identificação compartilhada de curso e matriz e construção da URL de progresso.
- `src/features/recomendacoes/hooks/useRecomendacoes.ts`: usa os mesmos resolvedores e preserva a exportação anterior de `identificarCurso`.
- `src/features/recomendacoes/services/situacaoCurricular.ts`: confirmação temporal compartilhada da matrícula, sem alterar os estados internos.
- `src/features/recomendacoes/services/recomendador.ts`: encaminha sua referência `agora` à análise compartilhada.
- `src/pages/HistoricoPage.tsx` e `src/pages/RecomendacoesPage.tsx`: acessos à matriz vinculada.
- `src/index.css`: tokens de sucesso verde nos dois temas.
- `src/theme/contrast.test.ts`: verifica contraste dos novos tokens e da apresentação neutra.
- `src/components/AppLayout.test.tsx`: monta o currículo com o provedor acadêmico, como na aplicação.
- `src/pages/CurriculoPage.test.tsx` (novo): fluxos de interface e integração.
- `README.md` e este documento: uso, decisões e limites.

Os exportadores de horários, o scraper Python, os JSON públicos e a licença MIT não foram modificados.

## Integração com o histórico e identificação

`useHistorico()` continua sendo a única fonte do perfil. A página não acessa diretamente o IndexedDB nem cria cópias persistentes. A confirmação de uma matriz ambígua guarda somente sua identificação e uma chave de versão do perfil em memória.

`identificarCurso` prioriza um ID informado. Um ID ausente do catálogo não é substituído por um nome parecido. Sem ID, utiliza a associação exata e única já adotada pelo recomendador, após remover os qualificadores oficiais de campus/modalidade. Múltiplos candidatos precisam de confirmação no fluxo existente; a página do currículo orienta a conferência do histórico. Nenhuma equivalência acadêmica é criada por nome.

`codigoEstruturaHistorico` reconhece o código do documento, inclusive o sufixo oficial de vigência. `identificarEstrutura` compara esse código exatamente, e não com o ID interno. Se houver mais de uma matriz candidata, o currículo só permite personalização após a confirmação explícita de um ID candidato. Um parâmetro na URL não substitui essa confirmação.

O arquivo público precisa ter `curso_id` igual ao curso solicitado. Ao entrar no próprio curso, a matriz única do histórico tem preferência. A seleção explícita de outra matriz leva ao modo original. Não se escolhe a matriz mais recente para resolver um vínculo desconhecido. Na ausência de perfil, a matriz pública mais recente continua sendo a seleção inicial, identificada como tal.

URLs de navegação usam apenas identificadores públicos: `curso`, `estrutura` e `modo=progresso`. Não incluem dados acadêmicos individuais. Se o perfil for apagado, mesmo essa URL apresenta a estrutura original. Atualizações do contexto recalculam os resultados sem nova importação ou armazenamento independente.

## Classificação acadêmica e consistência

`calcularProgresso` reutiliza `analisarSituacao`, que por sua vez usa `cumprimentos` e `equivalentesPermitidos`. Não há algoritmo paralelo de equivalências. Os estados internos do recomendador foram preservados.

| Evidência compartilhada | Situação apresentada | Apresentação |
| --- | --- | --- |
| `cumprido`, por aprovação direta ou equivalência | Concluída | Verde |
| `matriculado`, com referência temporal confirmável | Cursando | Azul |
| Componente não cumprido, pré e correquisitos satisfeitos | Disponível | Amarelo |
| Componente não cumprido, requisito conhecido pendente | Bloqueada | Rótulo e contorno vermelhos, na interface e no PDF |
| `indeterminado` ou requisito indeterminado | Situação a verificar | Neutra, sem quinta cor |

`APR`, `APRN`, `DISP`, `TRANS`, `INCORP` e `CUMP` seguem as conclusões reconhecidas pelo recomendador. A origem de equivalência aparece nos detalhes, usando o mesmo verde de uma aprovação direta. Registros contraditórios de cumprimento e pendência continuam indeterminados. `REP` e suas variantes, `TRANC` e `CANC` são componentes não cumpridos cuja apresentação depende dos requisitos atuais; não ganham estados próprios.

### Referência temporal

O período de referência é o de `/data/cursos-atual.json`, identificado como **oferta pública** na interface e nos arquivos personalizados. Sua ausência não bloqueia o catálogo nem as exportações originais. Também não confirma matrículas.

A análise compartilhada só retorna `matriculado` se os registros `MATR` aplicáveis corresponderem ao período público, a data de emissão for válida e não futura, e o documento não estiver desatualizado segundo a validação semestral existente (`documentoDesatualizado`). A referência também precisa corresponder ao semestre civil da emissão: um catálogo antigo não confirma uma matrícula antiga, e uma oferta futura não confirma andamento atual. Calendários acadêmicos deslocados do semestre civil ficam conservadoramente a verificar. Data desconhecida, matrícula antiga, períodos misturados ou documento antigo mantêm a situação indeterminada. Não se usa a data de importação para atualizar artificialmente a matrícula. Aprovações já comprovadas continuam reconhecidas.

O recomendador passa seu mesmo `agora` à análise. Assim, a regra temporal também se aplica às recomendações e à avaliação de correquisitos, sem manter duas interpretações da mesma matrícula. A ferramenta não consulta matrícula em tempo real; a data de emissão e a referência pública permanecem visíveis.

### Requisitos e correquisitos

`elegibilidade` chama `avaliarPreRequisitos` e `avaliarCoRequisitos`. As árvores E/OU e seus três resultados (`satisfeito`, `nao-satisfeito`, `indeterminado`) são preservados. Expressões sem árvore válida não são reduzidas a listas ou tratadas como bloqueio automático. As descrições incluem a avaliação das folhas dos requisitos compostos.

Um correquisito com necessidade de matrícula conjunta deixa o componente bloqueado **nas condições atualmente comprovadas**, com explicação da condição. A apresentação disponível exige os dois grupos de requisitos satisfeitos; conclusão ou matrícula concomitante confirmável seguem o avaliador existente. O planejador pode sugerir um conjunto incluindo correquisitos ainda pendentes; essa diferença é explícita, pois o currículo não simula a inclusão futura do conjunto.

Disponibilidade acadêmica não confirma turma ou vaga. Não se deriva elegibilidade da existência de uma oferta.

## Indicadores e optativas

Os quatro indicadores vêm diretamente de `perfil.cargaHoraria`: `total`, `obrigatorias`, `optativas` e `complementares`. O percentual é `integralizada / exigida * 100`, com todos os valores oficiais presentes, finitos e não negativos, exigida maior que zero e a igualdade entre integralizada + pendente e exigida (tolerância de 0,01h). Valores acima da exigida são sinalizados para conferência, sem presumir como aproveitar excedentes.

Ausência de dados ou inconsistência produz **Percentual indisponível**, com explicação. Nenhum campo ausente é substituído pela soma dos cards. Quando todas as categorias e o total têm dados consistentes mas divergem entre si, o percentual geral é omitido até confirmação. Uma categoria oficialmente zerada não recebe um percentual arbitrário.

As barras nativas `progress` têm identificação acessível e horas e percentuais textuais. As contagens são por códigos distintos da matriz e separadas em obrigatórias e catálogo de optativas. Uma tentativa repetida não aumenta o total, nem uma equivalência adiciona um novo card à exigência cumprida.

Optativas não cursadas permanecem alternativas de escolha, sem exigir a conclusão de todo o catálogo ou somar sua carga como exigência. O progresso optativo usa somente as horas oficiais. Componentes externos não são inseridos na matriz nem recebem equivalências inferidas; sua existência é advertida e a tabela oficial de horas é preservada.

Obrigatórias continuam agrupadas por período recomendado, em ordem numérica. As que têm nível nulo aparecem em **Outros componentes obrigatórios**. Optativas mantêm uma seção própria. A ordem original dentro de cada grupo é preservada.

## Interação e acessibilidade

Cards usam `details`/`summary`, com expansão nativa por Enter/Espaço, mouse e toque. Incluem todos os dados públicos e, no modo personalizado, situação, justificativa, avaliações dos requisitos, origem de cumprimento, tentativas e advertências. Não exibem identificadores pessoais. As cores têm rótulos de texto, foco visível e tokens adaptados aos temas claro, escuro e automático. Os controles de ação têm altura mínima de 44px, e a grade e os indicadores se ajustam à largura disponível.

## Modelo intermediário e exportações

`prepararExportacao` valida novamente curso, catálogo de cursos, código e ID da matriz antes de preparar qualquer modelo personalizado. O modo original ignora integralmente o perfil, mesmo quando disponível.

`ExportacaoCurriculo` contém identificação pública do curso e matriz, data de geração, referência temporal, componentes e, quando compatível, a projeção de situações e indicadores. Não carrega o perfil completo, nomes das tentativas, valores de correções, identificadores pessoais ou advertências textuais arbitrárias da importação. Advertências gerais são construídas com textos fixos. Uma linha representa uma exigência distinta da matriz.

Ambos os exportadores recebem esse mesmo modelo; não reclassificam os componentes. `agruparComponentes` é compartilhado pela página e pelo PDF. Os nomes normalizam acentos e removem caracteres problemáticos, por exemplo `estrutura-curricular-ciencia-da-computacao-CC002.pdf` e `meu-progresso-ciencia-da-computacao-CC002.csv`.

### PDF

Usa jsPDF, sem imagem do DOM e sem depender do tema do site. Páginas A4 têm margens de 15mm, cabeçalho do projeto, curso, código/ID/ano da matriz e data de geração. O personalizado acrescenta emissão e período público, quatro indicadores com barras quando calculáveis, legenda e advertências.

Cada componente inclui código, nome completo, carga horária, tipo, período e regras públicas; o personalizado acrescenta rótulo e justificativa. Há quebra de texto, continuidade de componentes maiores que uma página, repetição do cabeçalho e do período em continuação e numeração `Página X de Y`. Não há truncamento de nomes ou descarte de componentes. O rodapé indica o caráter independente e a necessidade de validação oficial.

### CSV

Uma tabela única, sem linhas de resumo de formato diferente. Cada linha preserva:

1. Curso, ID do curso, estrutura, ID da estrutura e ano da matriz.
2. Código, componente, tipo, período recomendado e carga horária.
3. Pré-requisitos, correquisitos e equivalências.
4. Somente no personalizado: situação acadêmica, detalhes, emissão do histórico e período de referência da oferta pública.

O arquivo usa UTF-8 com BOM, delimitador `;`, terminação CRLF dos registros e campos sempre entre aspas. Aspas internas são duplicadas; quebras de linha de campos são normalizadas e preservadas dentro das aspas. Caracteres de controle desnecessários são removidos. Textos que possam iniciar fórmulas (`=`, `+`, `-`, `@`, inclusive após espaços/controles) ou começar com tabulação/quebra recebem prefixo de apóstrofo, sem alterar os dados em memória. Horas e períodos numéricos não são convertidos em fórmulas. A formatação é compatível com importação em Excel e LibreOffice; não foi feito teste nos aplicativos nativos.

Os indicadores globais e as advertências gerais permanecem na interface/PDF; não se misturam tabelas de estruturas diferentes no CSV. As exportações de horários mantêm o comportamento anterior.

## Privacidade e ciclo de vida

Todos os cálculos, geração de PDF e criação de Blob ocorrem no navegador. As únicas consultas são GETs dos JSON públicos, sem corpo com dados acadêmicos. Não há nova importação, reinterpretação do PDF do histórico, IndexedDB adicional, localStorage de progresso ou envio a APIs. Downloads só começam por ação explícita. URLs temporárias do CSV são revogadas; não se guardam cópias automáticas dos arquivos.

Apagar o perfil invalida a personalização, remove as barras e legendas individuais e volta ao modelo público. Atualizar o histórico atualiza as classificações. Se um download PDF ainda estiver aguardando seu módulo e a visualização for desmontada, o download anterior é cancelado. Arquivos já baixados manualmente ficam sob controle do estudante no dispositivo.

## Testes e validação

As fixtures são exclusivamente sintéticas. Não há históricos reais no repositório.

- Classificação: aprovações, dispensa, equivalências explícitas e da matriz, matrícula atual/antiga/sem data, reprovação, trancamento, cancelamento, E/OU compostos, requisitos incertos, correquisitos, histórico vazio e incompatibilidade.
- Consistência: um componente cumprido no currículo fica fora das pendências do recomendador; ambos compartilham o estado acadêmico e a regra temporal.
- Horas: percentuais oficiais por categoria, ausência, inconsistência, negativos, total divergente, optativas, equivalências e ausência de duplicação.
- PDF real: original/personalizado, legenda, resumo, grupos sem nível, optativas, matriz com 120 componentes adicionais, nomes maiores que uma página, cabeçalhos repetidos, paginação e ausência de identificadores privados.
- CSV real: BOM UTF-8, cabeçalhos, separador, colunas consistentes, aspas, acentos, quebras de linha, fórmulas e ausência de dados pessoais.
- Interface: perfis temporários e persistidos, importação, modos, seleção de outra matriz, confirmação de ambiguidades, detalhes, barras, legendas, downloads, falhas de catálogo/exportação, mudanças do contexto, exclusão e navegação pelo histórico e pelas recomendações.
- Temas: claro, escuro, automático e contraste dos tokens.

Executar `npm run lint`, `npm test` e `npm run build`. A validação visual complementa os testes; não é substituída pela simples existência de texto no PDF. O aviso de tamanho de bundle do Vite não é suprimido.

Resultado desta entrega: lint aprovado, **310 testes em 20 arquivos aprovados** e build de produção concluído. O Vite emite aviso de bundle maior que 500kB, sem impedir o build. `git diff --check` também passou.

A revisão complementar usou a matriz pública CC002, com 104 componentes, e exclusivamente um histórico sintético. Os dois CSVs foram lidos com um parser independente: 104 linhas de componentes, com 13 colunas no original e 17 no personalizado. Os PDFs geraram 16 e 24 páginas respectivamente; a leitura independente não encontrou caracteres fora das margens, e foram revisadas visualmente as páginas iniciais, uma continuação e a página final. No navegador foram conferidos importação real com PDF.js, identificação da matriz, quatro estados coloridos e casos neutros, teclado, temas, ausência de transbordamento em largura móvel de 346px, matriz incompatível, acionamento dos quatro exportadores e exclusão do perfil sintético, preservando a matriz pública sem barras individuais. O observador de downloads do navegador integrado não retornou o arquivo salvo; as mensagens de geração foram confirmadas e os conteúdos dos exportadores foram verificados separadamente. Não se afirma teste de salvamento nos aplicativos nativos de planilha ou de download em todos os navegadores.

## Limitações e evoluções possíveis

O histórico é uma fotografia da emissão. Atualidade semestral e período público não equivalem a uma consulta ao sistema institucional. A ferramenta sinaliza incertezas e não presume aprovação ou aproveitamento de componentes externos. Regras especiais, equivalências sem interpretação segura, informações contraditórias e excedentes de carga dependem de conferência. A integralização de horas não garante conclusão de todas as exigências institucionais.

A plataforma não substitui a validação curricular oficial realizada pela UFCA. Planejamento de múltiplos semestres, simulação de índices e projeção de formatura estão fora desta entrega. Uma evolução futura pode reutilizar este modelo para planejamento de vários semestres e análise de cenários de conclusão, após incorporar regras institucionais verificadas e indicação explícita das incertezas; nenhuma dessas funcionalidades foi implementada agora.
