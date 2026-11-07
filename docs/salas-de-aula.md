# Relatório técnico: salas de aula

## 1. Resumo da implementação

Coleta pública de locais em lotes por unidade acadêmica e exibição integrada nos cards, nas turmas selecionadas, nos blocos da grade, no PDF e no CSV. Os blocos da grade abrem um diálogo com o texto completo por clique, toque ou teclado; Escape fecha o diálogo. Textos extensos são quebrados nos cards e compactados na grade.

Na coleta real de **07/11/2026**, para **2026.2**, foram preservadas as **501 turmas de 22 cursos**, com locais para **466 turmas**. Em **13 turmas**, os locais puderam ser associados aos dias explicitamente informados. **35 turmas** ficaram com `sala: null` por ausência de local utilizável ou de correspondência confiável. A comparação dos JSONs, desconsiderando apenas os novos campos `sala`, confirmou que todos os dados anteriores permaneceram iguais.

## 2. Origem das informações e investigação

A [consulta por curso](https://sig.ufca.edu.br/sigaa/public/curso/turmas.jsf?id=32652294&lc=pt_BR) continua responsável por disciplinas, turmas, docentes, vagas, horários e período. O HTML real de `table#table_lt` tem cinco colunas e não fornece sala, atributos de localização ou um link para detalhes da turma. Os links nos títulos abrem detalhes do **componente curricular**; um deles foi consultado e não contém a alocação das salas das ofertas.

O [portal público do SIGAA](https://sig.ufca.edu.br/sigaa/public/home.jsf) oferece uma segunda consulta em Ensino → Turmas: [consulta geral por unidade](https://sig.ufca.edu.br/sigaa/public/turmas/listar.jsf?aba=p-ensino). Ela funciona **sem autenticação** e informa a coluna **Local**. A extração usa `table.listagem`, o índice do cabeçalho `Local`, `.tituloDisciplina`, `td.turma`, `td.anoPeriodo` e `td.nome`.

O scraper abre uma sessão pública, preserva o `javax.faces.ViewState` e o botão Buscar encontrado no formulário e consulta nível `G`, ano/período atuais e cada unidade acadêmica disponível. Na estrutura investigada, isso acrescenta **1 GET e 8 POSTs por execução**, compartilhados pelos cursos; não há requisições por turma. Programas de pós-graduação não são consultados. As consultas de cursos e a escolha do período permanecem inalteradas.

A associação exige igualdade de **código, número da turma, período e docente**. A única adaptação do docente remove os sufixos de carga horária, como `(64h)`, acrescentados pela listagem geral, além de normalizar espaços e caixa. Duplicatas com locais divergentes são rejeitadas. Não se escolhe uma sala pela semelhança entre disciplinas nem se reaproveita um semestre anterior.

Há diferenças entre as duas consultas: por exemplo, a turma 02 de CC0062 consta na consulta do curso, mas não tem correspondência no recorte da consulta geral. Ela permanece sem sala informada.

## 3. Arquivos modificados e adicionados

| Arquivo | Alteração |
| --- | --- |
| `scraper/salas.py` | Extração, normalização, associação conservadora e reconhecimento de locais explicitamente separados por dia. |
| `scraper/scraper.py` | Consulta em lotes, local ausente explícito e integração ao fluxo existente. |
| `public/data/cursos-atual.json` | Dados reais enriquecidos com as salas de 2026.2. |
| `src/types.ts` | Campos opcionais e anuláveis em `Turma` e `Horario`. |
| `src/utils/salas.ts` | Regra compartilhada de resolução do local e descrição por encontro. |
| `src/components/SalasTurma.tsx` | Apresentação reutilizada nos cards e na lista de selecionadas. |
| `src/App.tsx` | Integração das salas; horários por encontro sem repetição no card. |
| `src/components/GradeSemanal.tsx` | Local no bloco, modo compacto e diálogo acessível. |
| `src/App.css` | Quebra de textos, foco visível, diálogo e ajustes móveis. |
| `src/utils/exportarCsv.ts` | Coluna Sala por encontro, mantendo UTF-8 com BOM, separador e nomes de arquivos. |
| `src/utils/exportarPdf.ts` | Local na grade e na relação; medição de linhas e paginação; geração separada do download para permitir testes do PDF real. |
| `tests/test_salas.py` | Extração, identidade, dados antigos, ambiguidades, falhas, lotes e escrita do JSON. |
| `tests/fixtures/*.html` e `tests/fixtures/README.md` | Recortes reais offline e documentação de sua origem. |
| `src/utils/salas.test.tsx` | Renderização, locais por encontro, nomes extensos, dados antigos e conflitos. |
| `src/utils/exportarCsv.test.ts` | Conteúdo do Blob, escape, codificação, nome e download. |
| `src/utils/exportarPdf.test.ts` | Geração real das páginas, salas, blocos curtos e paginação extensa. |
| `src/utils/turmaTeste.ts` | Dados ilustrativos compartilhados apenas pelos testes. |
| `README.md` e este relatório | Descrição da funcionalidade, fonte, limites e validação. |

Não foram adicionadas dependências. Os parsers de horários e os algoritmos de conflitos permanecem inalterados.

## 4. Estrutura dos dados

Exemplo **real**, de CC0020, turma 01, consultado em 07/11/2026 (demais campos existentes omitidos aqui por brevidade):

```json
{
  "codigo": "CC0020",
  "turma": "01",
  "periodo": "2026.2",
  "horario_sigaa": "35M24",
  "sala": "TER SALA K04 E QUI.LAB. K02S",
  "horarios": [
    {
      "dia": 3,
      "dia_nome": "terça-feira",
      "inicio": "08:00",
      "fim": "10:00",
      "sala": "SALA K04"
    },
    {
      "dia": 5,
      "dia_nome": "quinta-feira",
      "inicio": "08:00",
      "fim": "10:00",
      "sala": "LAB. K02S"
    }
  ]
}
```

`Turma.sala` preserva o texto completo do campo público, inclusive bloco, laboratório e qualificadores. Quando existe somente um local geral, ele não é duplicado nos horários. `Horario.sala` é preenchido apenas quando há uma sequência explícita e reconhecida de dia seguido de SALA/LAB/LABORATÓRIO. Marcadores repetidos, alternativas com OU e textos que diferenciam turnos não são interpretados automaticamente.

## 5. Compatibilidade

- `Turma.sala` ausente, nula ou vazia: “Sala: Não informada” na interface e no PDF; campo vazio no CSV.
- `Horario.sala` ausente: usa o texto geral da turma.
- `Horario.sala` nula ou vazia: local daquele encontro desconhecido, sem herdar o local geral. Isso impede atribuir um local de terça a um encontro de quinta não mencionado.
- Descrição livre sem divisão segura: o texto original normalizado é preservado integralmente como informação geral; nenhum local é escolhido ou distribuído por suposição.
- Turmas sem encontros continuam exportadas no CSV e na relação detalhada do PDF.
- Os identificadores e as chaves do `localStorage` continuam baseados nos mesmos campos anteriores; a sala não faz parte da identidade da seleção.

## 6. Testes e validação

- `.venv/bin/python -m pytest -v`: **34 testes aprovados**, sem acesso à internet nos testes.
- `npm test`: **24 testes aprovados**, incluindo os cinco testes anteriores de conflitos.
- `npm run lint`: aprovado.
- `npm run build`: aprovado. O Vite informa um aviso de bundle acima de 500 kB; não impede o build.
- Coleta pública real: 22 cursos/501 turmas; 466 locais; 13 turmas com distribuição por dia; nenhum aviso de falha na coleta.
- Navegador integrado: locais distintos em terça/quinta, diálogo por clique e Enter, fechamento com Escape, seleções restauradas após recarregar e ausência de transbordamento horizontal em 390 e 320 pixels.
- PDF: geração e inspeção visual de todas as páginas de amostras reais e ilustrativas, incluindo blocos de 30/60 minutos e texto extenso com paginação; sem sobreposição ou texto fora dos blocos. As amostras são arquivos temporários de validação, não dados publicados.
- O teste do CSV confirma os bytes do BOM, caracteres acentuados, aspas, separador, uma linha por encontro e o acionamento do link de download. A captura do evento de download no navegador integrado excedeu o tempo disponível da ferramenta; a validação do arquivo foi feita pelo Blob nos testes. O PDF foi gerado diretamente pelo mesmo módulo da aplicação e renderizado com Poppler.

Os workflows `ci.yml` e `atualizar-turmas.yml` permanecem compatíveis: descobrem os novos testes automaticamente e continuam usando `python -m scraper.scraper` e as dependências existentes. O fluxo de coleta, enriquecimento e gravação foi executado localmente para o período conhecido; não foi disparada uma execução remota do GitHub Actions.

## 7. Limitações

O campo Local do SIGAA é texto livre e não fornece identificador de sala, tabela estruturada de encontros nem confirmação de que cada turma possui local definido. “A DEFINIR”, ausência e correspondência incerta produzem `null`. Descrições por turno, como a de EM0081, são mantidas sem transformação em locais de encontros.

A cobertura é parcial: **35 das 501 turmas não têm local confiável disponível nesta coleta**. A implementação não preenche esses casos artificialmente. Mudanças no HTML ou indisponibilidade da consulta adicional podem reduzir a cobertura; falhas de requisição ou formulário geram avisos e não impedem a coleta principal. As exportações usam apenas os dados locais, sem consultar o SIGAA.

## 8. Recomendações relacionadas

Ao alterar o reconhecimento de dias e locais, acrescentar primeiro um recorte real e um teste do novo formato. Acompanhar os avisos e a proporção de turmas com local nas atualizações, especialmente após mudanças na consulta pública. Manter a associação conservadora quando houver divergência entre as duas fontes.
