# Fixtures das consultas públicas de salas

Recortes do HTML público da UFCA consultado em **07/11/2026**, para **2026.2**:

- `turmas-cc-2026-2.html`: POST de `https://sig.ufca.edu.br/sigaa/public/curso/turmas.jsf?id=32652294&lc=pt_BR`, curso Ciência da Computação. Mantém `div#group_lt`, `table#table_lt` e as quatro ofertas de CC0020, CC0024 e CC0062.
- `salas-cct-2026-2.html`: POST de `https://sig.ufca.edu.br/sigaa/public/turmas/listar.jsf?aba=p-ensino`, nível G, unidade 62 (CCT), ano 2026 e período 2. Mantém a tabela `.listagem`, o cabeçalho Local, os grupos `.tituloDisciplina` e as linhas de CC0020, CC0024, CC0062, EM0081 e EM0121.

Foram removidos o restante da página, scripts, imagens, links, ações JSF e identificadores de sessão. As células das turmas e dos locais são reais. Elas cobrem local único, dias distintos, descrição livre por turno, local a definir e uma turma presente na consulta do curso sem correspondência na consulta geral.

Alterações feitas nos testes para simular espaços, duplicatas, falhas e outros docentes são cenários de teste, não dados publicados na aplicação. Os testes não acessam a internet.
