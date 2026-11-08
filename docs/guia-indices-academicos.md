# Guia dos índices acadêmicos da UFCA

## Objetivo e escopo

Oferecer explicações públicas, didáticas e neutras sobre os cinco indicadores do art. 109 e conceitos encontrados no histórico. Rota: `/guia-academico`. Não exige perfil, consentimento de importação ou PDF. Não calcula índices individuais, simula notas, recomenda disciplinas, altera planejamento ou prevê formatura.

## Fontes e verificação

Verificação realizada em **07/11/2026**, nas fontes institucionais abaixo:

- [Regulamento compilado até a Resolução nº 308/2026](https://documentos.ufca.edu.br/wp-folder/wp-content/uploads/2026/02/Regulamento-da-Graduação_Atualizado-até_res-308_2025-versão-compilada-1.pdf).
- [Versão com alterações marcadas](https://documentos.ufca.edu.br/wp-folder/wp-content/uploads/2026/02/Regulamento-da-Graduação_Atualizado-até_res-308_2025-versão-tachada.pdf), especialmente a redação do IECH dada pela Resolução nº 279, de 29/07/2025.
- [Resolução nº 308, de 30/01/2026](https://documentos.ufca.edu.br/wp-folder/wp-content/uploads/2026/01/Resolucao_nC2BA_308_2026_ad_referendum_alter._Regulamento_Graduacao_assinado.pdf).
- [Catálogo do Consuni](https://www.ufca.edu.br/instituicao/administrativo/estrutura-organizacional/orgaos-complementares/seods/consuni/): Resolução nº 313, de 04/03/2026, homologa a nº 308. Também foi identificada a suspensão do art. 183 pela nº 307/2026, homologada pela nº 312/2026, que não modifica os indicadores aqui tratados. As publicações disponíveis até a consulta não revelaram alteração posterior dos arts. 109–114 e Anexo I.

A base é a Resolução nº 157/2023. Há inconsistência institucional na data: a folha de histórico das versões consultadas menciona 22/07/2023, enquanto o catálogo apresenta 29/06/2023. O guia identifica a norma pelo número e ano, sem resolver essa divergência por suposição. O nome do arquivo compilado contém “2025”, mas sua folha de histórico registra a alteração de janeiro de 2026.

Foram lidos os arts. 109–114, Anexo I, art. 257, § 2º, glossário institucional e dispositivos sobre currículo, requisitos e avaliação. As páginas do Anexo I foram renderizadas para conferir fórmulas e distinguir trechos riscados. As duas versões disponibilizadas conservam no texto extraído o antigo parágrafo do denominador do IECH: vale a nova redação explicitamente atribuída à Resolução nº 279/2025, que exclui cancelamentos.

Não há atualização normativa automática nem garantia de vigência permanente. Em revisões futuras: consultar primeiro o catálogo, ler novas resoluções e homologações, conferir visualmente o Anexo I, atualizar `fontes.ts`, conteúdo, testes e esta data.

## Mapeamento e fórmulas

| Indicador | Fundamento | Fórmula educativa | Limites explícitos |
| --- | --- | --- | --- |
| MC — Média de Conclusão | Art. 110 e Anexo I, MC | soma(nota × horas) / soma(horas) | Sem faixa adicional atribuída pelo guia |
| MCN — Média de Conclusão Normalizada | Art. 111 e Anexo I, MCN | 500 + 100 × ((MC − μ) / σ) | 0 a 1000 |
| IECH — Índice de Eficiência em Carga Horária | Art. 112 e Anexo I, IECH, redação nº 279/2025 | soma das horas aprovadas elegíveis / soma das horas utilizadas elegíveis | Mínimo 0,3 |
| IEPL — Índice de Eficiência em Períodos Letivos | Art. 113 e Anexo I, IEPL | soma das horas acumuladas elegíveis / (P × CHM / DP) | 0,3 a 1,1 |
| IEA — Índice de Eficiência Acadêmica | Art. 114 e Anexo I, IEA | MC × IECH × IEPL | Não se aplica uma escala fixa de 0 a 10 |

As notações com somatórios e as variáveis aparecem em texto na interface, acompanhadas de uma leitura por extenso. Σ soma os componentes do conjunto; nᵢ é a nota; cᵢ são as horas; Nx, Np, Nm e Na identificam as quantidades de componentes elegíveis para cada soma. Na MCN, μ = soma(MCᵢ) / M e σ = raiz(soma((MCᵢ − μ)²) / (M − 1)), com M concluintes elegíveis. No IEPL, P contabiliza períodos conforme o Anexo I; CHM é a carga mínima e DP a duração padrão da estrutura.

## Critérios de interpretação e exclusões

- MC: componentes com êxito depois do início do curso, excluindo trancados, cancelados, reprovados, aproveitados, incorporados, dispensados e sem nota numérica. Reprovação não altera diretamente essa média.
- MCN: referência de concluintes do mesmo curso nos últimos cinco anos, excluindo insucessos e apenas apostilamento/certificação de ênfase. Estatísticas próprias para cursos com concluintes há pelo menos cinco anos **ou** em número superior a 100; caso contrário, valores médios do centro do curso ou do centro com maior similaridade. Turnos, habilitações e ênfases compartilham a referência do curso. 500 identifica a média antes dos limites, sem garantir mediana ou percentil.
- IECH: numerador de aprovações/integralizações após início, incluindo incorporações posteriores e excluindo aproveitados, anteriores ao início e dispensados. Denominador inclui matrículas elegíveis, incorporações posteriores, trancamentos e reprovações; exclui aproveitados, anteriores ao início, dispensados e cancelamentos. O piso não comprova que a razão original era 30%.
- IEPL: horas acumuladas após início, incluindo incorporações posteriores. P exclui suspensão, mobilidade em outra instituição e períodos contados no perfil inicial. O período atual e o total integralizado não substituem automaticamente as variáveis oficiais. Piso e teto podem ocultar a razão original.
- IEA: combina três fatores; MCN não participa. Não se criam faixas de julgamento nem uma equivalência a nota escolar.

Suspensão por trancamento total e trancamento parcial são distintos: o art. 257, § 2º, exclui os períodos de suspensão dos cálculos dos índices. Nenhuma explicação orienta decisões de cancelamento ou matrícula para aumentar um indicador.

## Exemplos hipotéticos

1. MC: A = 8,0 em 64 h; B = 9,0 em 32 h. Produtos 512 e 288; soma 800; horas 96; 800 / 96 ≈ **8,33**, e não 8,5.
2. MCN: MC 8,0, μ 7,5 e σ 0,5. Diferença 0,5; razão 1; 500 + 100 = **600**. Um desvio-padrão acima da média, sem atribuir posição percentual.
3. IECH: 128 h aprovadas, 64 h reprovadas e 64 h trancadas parcialmente; 128 / 256 = **0,5**.
4. IEPL: 3.200 h / oito semestres = 400 h por período; cinco períodos = 2.000 h esperadas; 1.600 / 2.000 = **0,8**.
5. IEA: 8 × 0,8 × 0,9 = **5,76**. O resultado não equivale a média escolar.

Nenhum exemplo utiliza dados pessoais. Os testes conferem os resultados por operações aritméticas independentes, sem funções de cálculo de índices na aplicação.

## Estrutura e interface

`src/features/guia-academico/models/types.ts` define os contratos; `data/indices.ts` centraliza explicações, variáveis, exemplos, limites, perguntas e referências; `data/fontes.ts` centraliza links e verificação; `data/glossario.ts` separa conceitos e códigos das situações. Os componentes `IndiceCard`, `ExplicacaoIndice` e `GlossarioAcademico` apresentam esses dados na página `GuiaAcademicoPage`.

São cinco cards com âncoras `#mc`, `#mcn`, `#iech`, `#iepl` e `#iea`. O conteúdo progride de conceito a exemplo, depois fórmula expansível; interpretação e limitações principais ficam visíveis. Dúvidas e glossário usam `details/summary` nativos. Títulos de destino recebem foco na navegação entre rotas. Os estilos usam tokens existentes, grade fluida, quebra de texto e foco visível. `AppRoutes.tsx` reúne as rotas reais e permite testar o acesso direto.

## Integração e privacidade

O `ResumoHistorico` usa os identificadores tipados do conteúdo para mostrar nome, sigla e link. O valor é lido diretamente de `indicesOficiais`, preservando precisão e `null` como “Não identificado”; zero permanece zero. As URLs contêm somente a rota e o identificador do índice.

O guia não importa o contexto acadêmico, parser ou armazenamento, não lê PDF, não faz requisições e funciona isoladamente sem provedor ou IndexedDB. O provedor global existente mantém seu comportamento de leitura inicial da aplicação; a página não adiciona leituras ou gravações. Ele permanece montado durante a navegação para preservar perfis temporários. Parser, schema, persistência, JSONs públicos e scraper não foram alterados.

## Glossário e limites documentais

Conceitos de carga horária, estrutura, requisitos e equivalências usam o regulamento e seu glossário. Equivalências podem ser direcionais e não transitivas. Prazos são referências institucionais, não previsões.

Os 16 códigos APR, APRN, REP, REPF, REPMF, REPN, REPNF, TRANC, MATR, CANC, DISP, TRANS, INCORP, CUMP, REC e PARCCUMP foram conferidos na legenda do histórico fornecido pelo usuário, somente em ambiente local. O PDF, seus trechos integrais, identificadores e valores pessoais não integram o repositório nem os testes. Não há link público para o documento particular.

Limitações explicitadas na página:

- As descrições de faixas de notas da legenda não coincidem com os critérios do art. 95 consultado. Preservam-se os nomes dos códigos, sem reproduzir essas faixas como regra vigente ou reclassificar registros. REC é descrito como reposição na legenda; não se presume aprovação.
- DISP usa uma descrição operacional de aproveitamento/dispensa na legenda; a dispensa normativa tem procedimento próprio. Código isolado não substitui a análise do ato acadêmico.
- A MCN não é reproduzível exatamente apenas pelo histórico. A norma consultada não esclarece o tratamento operacional de σ zero; nenhum comportamento foi inventado.
- Não se estima grupo de referência, perfil inicial, P ou elegibilidade individual de horas. Casos concretos exigem conferência com a Prograd/coordenação.

## Testes e manutenção

`indices.test.ts` confere cobertura, nomes, referências institucionais, limites, ressalvas da MCN, códigos e aritmética dos cinco exemplos. `GuiaAcademicoPage.test.tsx` testa as rotas reais, entrada pela página principal, ausência de acesso à rede/IndexedDB no guia isolado, temas, âncoras, foco, fórmulas, dúvidas, nulos e zero sem alteração de perfil. `HistoricoPage.test.tsx` inclui ida e volta ao guia com perfis temporários e persistidos e compara o armazenamento antes/depois.

Validação em 07/11/2026:

- `npm run lint`: passou.
- `npm test`: **158 testes em 14 arquivos, todos aprovados**.
- `npm run build`: passou, incluindo TypeScript. Há aviso não bloqueante de chunks acima de 500 kB; não se adicionaram dependências.
- `git diff --check`: passou.
- Navegador real: tema claro e escuro, âncora com foco no título, fórmula ativada por Enter e dúvida ativada por Espaço. Os 32 expansíveis foram abertos na largura de conteúdo de aproximadamente 320 px, sem rolagem horizontal da página. Também foram conferidos tablet (aproximadamente 768 px) e monitor (aproximadamente 1440 px).

O teste automatizado de interface usa clique em `summary`: jsdom não implementa sua ativação nativa por teclado. A verificação de Enter/Espaço e layout foi feita no navegador, sem substituir o comportamento nativo por manipuladores artificiais.

## Arquivos criados e alterados

Criados:

- `src/AppRoutes.tsx`.
- `src/pages/GuiaAcademicoPage.tsx`, `GuiaAcademicoPage.css` e `GuiaAcademicoPage.test.tsx`.
- `src/features/guia-academico/models/types.ts`.
- `src/features/guia-academico/data/fontes.ts`, `indices.ts`, `glossario.ts` e `indices.test.ts`.
- `src/features/guia-academico/components/IndiceCard.tsx`, `ExplicacaoIndice.tsx` e `GlossarioAcademico.tsx`.
- `docs/guia-indices-academicos.md`.

Alterados: `src/main.tsx` (rotas centralizadas), `src/App.tsx` (acesso), `src/features/historico/components/ResumoHistorico.tsx` (nomes e links), `src/pages/HistoricoPage.css` (acomodação dos nomes), `src/pages/HistoricoPage.test.tsx` (preservação de perfis) e `README.md`.

## Reutilização futura

Cards e explicações podem ser usados por um dashboard por identificador, mantendo os mesmos textos e fontes. Eventuais simuladores devem ser projetados separadamente, distinguir estimativas de registros oficiais e tratar referências institucionais ausentes. Nenhuma dessas funcionalidades foi implementada nesta etapa.
