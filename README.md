# Planeja UFCA

Planeja UFCA é uma plataforma independente de apoio ao planejamento acadêmico dos estudantes da Universidade Federal do Cariri. A ferramenta permite organizar horários, consultar disciplinas de diferentes cursos, acompanhar o progresso curricular e receber recomendações acadêmicas personalizadas. Não é uma plataforma oficial da universidade.

O sistema utiliza dados disponibilizados publicamente pelo SIGAA da UFCA e permite selecionar disciplinas, visualizar a grade semanal, identificar conflitos de horário, consultar matrizes curriculares, visualizar pré-requisitos, identificar disciplinas optativas e exportar o planejamento em CSV ou PDF.

O projeto foi desenvolvido com uma arquitetura sem backend permanente, mantendo a aplicação simples, rápida e de baixo custo.

## Acesso

Endereço público: [planejaufca.pages.dev](https://planejaufca.pages.dev). Em 08/11/2026, a consulta HTTP confirmou resposta 200 e o HTML do Planeja UFCA. As configurações administrativas e eventuais domínios próprios devem ser conferidos no painel Cloudflare.

Os endereços legados efetivamente utilizados devem permanecer acessíveis durante a transição para exportar os dados locais. Uma nova consulta em 08/11/2026 não resolveu `projetaufca.pages.dev`; o estado administrativo dos projetos antigos não foi verificado. A transferência entre domínios exige uma ação explícita; consulte o [procedimento de migração](docs/rebranding-planeja-ufca.md).

Repositório configurado no remoto `origin`: [IrlanBarros/planeja-ufca](https://github.com/IrlanBarros/planeja-ufca).

## Funcionalidades

### Montagem do horário

- Consulta automática das turmas no SIGAA da UFCA para os cursos do campus Juazeiro do Norte
- Conversão dos códigos de horário do SIGAA para dias e horários reais
- Seleção e remoção de turmas
- Detecção automática de conflitos de horário
- Bloqueio visual de turmas incompatíveis com o horário atual
- Exibição detalhada dos conflitos diretamente nos cards das disciplinas
- Identificação visual de disciplinas optativas
- Grade semanal de segunda a sexta
- Persistência do horário escolhido no navegador com `localStorage`
- Busca por código da disciplina, nome da disciplina e docente
- Filtros por todas as turmas, disponíveis, com conflito e selecionadas
- Exportação do horário em CSV
- Exportação do horário em PDF
- Salas nos cards, na grade, nas turmas selecionadas e nas exportações, incluindo locais por dia quando identificados explicitamente pelo SIGAA

Os detalhes da fonte pública, da modelagem, da compatibilidade e da validação estão no [relatório de salas de aula](docs/salas-de-aula.md).

### Turmas equivalentes e de outros cursos

A seleção de turmas tem três abas na mesma página:

- **Meu curso:** oferta do curso principal, com os cards, busca, optativas e filtros habituais.
- **Equivalentes:** ofertas externas do mesmo componente curricular ou de alternativas individuais explicitamente previstas na matriz. Cada card mostra o componente de referência, o fundamento da correspondência e o curso de oferta. As alternativas ficam agrupadas pelo componente da matriz; cada turma física aparece uma vez.
- **Outros cursos:** consulta livre da oferta pública dos demais cursos, mesmo sem histórico. Escolha o **Curso de oferta** ou pesquise código, disciplina, docente ou curso, ignorando acentos e maiúsculas. Cursos homônimos são diferenciados pelo ID. Nas abas externas, **Mostrar mais turmas** amplia a lista em blocos de 24.

Em **Equivalentes**, use **Estrutura curricular de referência** para escolher a matriz pública. Sem histórico compatível, a mais recente é apenas uma sugestão explicitamente identificada. Com histórico do curso principal, a consulta utiliza exclusivamente a matriz desse vínculo; versões com o mesmo código exigem confirmação do ID. Uma matriz ausente não é substituída por outra. Cumprimentos só aparecem com histórico compatível e não impedem a consulta manual.

Turmas externas reconhecidas ficam inicialmente em **Equivalentes**. Em **Outros cursos**, pesquisar ou escolher um curso também inclui essas turmas, permitindo encontrá-las por código. Regras com `E`, expressões compostas ou listas ambíguas não viram equivalências individuais; suas ofertas continuam acessíveis em **Outros cursos**. Não se presume simetria, transitividade, equivalência por nome ou por carga horária. Um cumprimento no histórico comprova apenas aquele contexto, sem autorizar automaticamente aproveitamentos futuros.

O botão **Adicionar ao horário** usa a seleção existente: todas as origens aparecem juntas em **Meu horário**, na grade, na lista de salas e nas exportações. Sobreposições são verificadas entre todos os cursos; duas turmas do mesmo código são impedidas. Possíveis duplicações acadêmicas comprovadas pela matriz são advertidas na consulta manual. **Disponíveis** significa compatibilidade conhecida de horário, sem confirmar vagas.

Trocar de aba limpa busca, filtros e avisos, preservando o curso principal, a matriz e as turmas selecionadas. O horário continua salvo localmente por **período e curso principal**, com os mesmos IDs e migração compatível das chaves anteriores, inclusive após recarregar ou navegar. Trocar o curso principal abre o horário daquele curso, preservando o anterior.

O PDF inclui grade e relação detalhada de todas as turmas, salas e cursos de oferta conhecidos. O CSV mantém BOM UTF-8, separador `;`, escapes e colunas anteriores, acrescentando **Curso de oferta** ao final. Uma disciplina externa sem carga curricular identificável permanece no horário; o planejador informa a limitação e suspende inclusões automáticas dependentes desse total.

A presença de uma turma em outro curso não garante vaga, autorização de matrícula ou aproveitamento curricular. A análise usa apenas catálogos públicos e perfil local; nenhum histórico é enviado a servidores. Detalhes em [Turmas de outros cursos](docs/turmas-outros-cursos.md).

### Aparência e identidade

- Temas Claro, Escuro e Sistema, disponíveis nas duas páginas
- Preferência de tema persistida no navegador; Sistema é o padrão
- Favicon próprio com um calendário e grade de horários
- Rodapé compartilhado com autoria, licença MIT e aviso de projeto independente

Os detalhes da implementação e da validação estão no [relatório de tema e identidade visual](docs/tema-e-identidade-visual.md).

### Estrutura curricular

- Página dedicada para consulta da estrutura curricular do curso
- Suporte a múltiplas estruturas curriculares do mesmo curso
- Seleção da matriz curricular por ano
- Identificação da estrutura mais nova como `Mais recente`
- Disciplinas obrigatórias organizadas por período
- Disciplinas optativas exibidas separadamente
- Exibição de código, nome e carga horária dos componentes
- Exibição dos pré-requisitos disponibilizados pelo SIGAA
- Suporte a expressões de pré-requisito com operadores `E` e `OU`
- Preservação da estrutura lógica dos pré-requisitos para uso futuro no frontend

### Automação e qualidade

- Atualização automática das turmas através do GitHub Actions
- Atualização automática das estruturas curriculares através do GitHub Actions
- Cache dos componentes curriculares para reduzir consultas repetidas ao SIGAA
- Reaproveitamento dos últimos dados curriculares válidos quando uma atualização falha
- Testes automatizados para o scraper, parser de horários, parser de pré-requisitos e lógica do frontend
- CI para validação de testes, lint e build

## Como funciona

A aplicação não utiliza um backend permanente.

Os dados são coletados das páginas públicas do SIGAA por scrapers escritos em Python e armazenados como arquivos JSON estáticos utilizados diretamente pelo frontend.

### Fluxo das turmas

```text
SIGAA UFCA
    |
    v
Scraper de turmas
    |
    v
Parser de horários
    |
    v
public/data/cursos-atual.json
    |
    v
React
    |
    v
Navegador do usuário
```

O scraper consulta as turmas disponíveis, converte os códigos de horário do SIGAA e gera um arquivo contendo os cursos e suas respectivas turmas.

O GitHub Actions atualiza os dados automaticamente e cria um novo commit apenas quando alguma informação realmente muda.

### Fluxo das estruturas curriculares

```text
SIGAA UFCA
    |
    v
Scraper de currículos
    |
    +--> Índice dos cursos
    |
    +--> Estruturas curriculares
    |
    +--> Componentes curriculares
    |
    +--> Pré-requisitos
    |
    v
public/data/curriculos/
    |
    +--> index.json
    |
    `--> <curso_id>.json
            |
            v
      React Router
            |
            v
      /curriculo?curso=<id>
```

Cada curso pode possuir mais de uma estrutura curricular. Essas estruturas são preservadas para permitir a consulta de matrizes antigas e atuais.

As consultas detalhadas dos componentes utilizam cache local durante a execução do scraper, evitando requisições desnecessárias ao SIGAA e permitindo retomar atualizações interrompidas com maior eficiência.

## Arquitetura

```text
planeja-ufca/
|
|-- .github/
|   `-- workflows/
|       |-- atualizar-curriculos.yml
|       |-- atualizar-turmas.yml
|       `-- ci.yml
|
|-- data/
|   `-- cache/
|       `-- cache-componentes.json
|
|-- public/
|   `-- data/
|       |-- cursos-atual.json
|       `-- curriculos/
|           |-- index.json
|           `-- <curso_id>.json
|
|-- scraper/
|   |-- __init__.py
|   |-- curricula.py
|   |-- requisite_parser.py
|   |-- schedule_parser.py
|   |-- scraper.py
|   `-- requirements.txt
|
|-- src/
|   |-- components/
|   |   `-- GradeSemanal.tsx
|   |
|   |-- pages/
|   |   |-- CurriculoPage.css
|   |   `-- CurriculoPage.tsx
|   |
|   |-- utils/
|   |   |-- conflitos.ts
|   |   |-- conflitos.test.ts
|   |   |-- exportarCsv.ts
|   |   `-- exportarPdf.ts
|   |
|   |-- App.tsx
|   |-- App.css
|   |-- index.css
|   |-- main.tsx
|   `-- types.ts
|
|-- tests/
|   |-- test_requisite_parser.py
|   `-- test_schedule_parser.py
|
|-- package.json
|-- package-lock.json
|-- tsconfig.json
|-- vite.config.ts
`-- README.md
```

## Tecnologias

### Frontend

- React
- React Router
- TypeScript
- Vite
- CSS
- jsPDF

### Coleta e processamento de dados

- Python
- Requests
- BeautifulSoup

### Testes

- Pytest
- Vitest

### Automação e CI

- GitHub Actions
- ESLint
- TypeScript
- Vite Build

## Interpretação dos horários do SIGAA

O SIGAA representa os horários através de códigos como:

```text
24T46
246M68
35M24
```

O projeto possui um parser responsável por transformar esses códigos em estruturas utilizáveis pelo frontend.

Por exemplo:

```text
24T46
```

é convertido para:

```text
segunda-feira: 14:00 - 16:00
quarta-feira: 14:00 - 16:00
```

Internamente:

```json
[
  {
    "dia": 2,
    "dia_nome": "segunda-feira",
    "inicio": "14:00",
    "fim": "16:00"
  },
  {
    "dia": 4,
    "dia_nome": "quarta-feira",
    "inicio": "14:00",
    "fim": "16:00"
  }
]
```

Essa representação é utilizada pela grade semanal e pelo detector de conflitos.

## Detecção de conflitos

Antes de adicionar uma turma, seus intervalos de horário são comparados com todas as turmas já selecionadas.

Por exemplo:

```text
Disciplina A
08:00 - 10:00

Disciplina B
09:00 - 11:00
```

Resultado:

```text
Conflito: 09:00 - 10:00
```

A turma incompatível passa a ser marcada visualmente e não pode ser adicionada enquanto o conflito existir.

Horários consecutivos não são considerados conflito:

```text
08:00 - 10:00
10:00 - 12:00
```

## Estruturas curriculares

A página de estrutura curricular é acessada a partir do curso selecionado na página principal.

A navegação utiliza uma rota no formato:

```text
/curriculo?curso=<id_do_curso>
```

A página carrega o índice de currículos e, em seguida, o arquivo correspondente ao curso selecionado.

Quando um curso possui múltiplas estruturas curriculares, a mais nova é selecionada por padrão e apresentada como:

```text
Mais recente
```

As estruturas anteriores são identificadas pelo ano de criação.

Cada estrutura pode conter:

- disciplinas obrigatórias;
- disciplinas optativas;
- período ou nível recomendado;
- carga horária;
- pré-requisitos;
- co-requisitos;
- equivalências.

No momento, o frontend apresenta principalmente a organização por período, as optativas e os pré-requisitos.

## Pré-requisitos

Os pré-requisitos são coletados das páginas públicas de detalhes dos componentes curriculares.

Expressões simples e compostas são preservadas.

Exemplo:

```text
( CAR0012 ) E ( ECI0025 OU ECI0097 )
```

Internamente, a expressão também pode ser representada de forma estruturada:

```json
{
  "operador": "E",
  "esquerda": {
    "codigo": "CAR0012"
  },
  "direita": {
    "operador": "OU",
    "esquerda": {
      "codigo": "ECI0025"
    },
    "direita": {
      "codigo": "ECI0097"
    }
  }
}
```

Essa representação permite que, futuramente, o sistema avalie automaticamente se o estudante atende aos requisitos necessários para cursar uma disciplina.

## Identificação de disciplinas optativas

Na página principal, as turmas correspondentes a componentes optativos são identificadas visualmente nos cards.

Para isso, o frontend consulta a estrutura curricular mais recente do curso selecionado e compara o código das turmas ofertadas com os componentes classificados como optativos.

Essa identificação é apenas informativa e não altera a lógica de seleção ou de conflitos.

## Persistência local

As disciplinas selecionadas são armazenadas no `localStorage` do navegador.

Isso significa que o usuário pode atualizar ou fechar a página sem perder o horário montado.

As seleções são armazenadas separadamente por período acadêmico e por curso.

A preferência visual usa a chave independente `planeja-ufca:theme`, com leitura de `projeta-ufca:theme` e depois `seu-horario-ufca:theme` apenas quando a chave definitiva não existe. Uma chave existente inválida é preservada e resulta no modo Sistema. Os valores aceitos são `light`, `dark` ou `system`. No modo Sistema, a interface acompanha as mudanças da preferência do sistema operacional. Se o armazenamento estiver bloqueado, o tema e a seleção de turmas continuam funcionando durante a sessão.

Nenhuma informação do estudante é enviada ou armazenada em um servidor.

## Atualização automática das turmas

O workflow:

```text
.github/workflows/atualizar-turmas.yml
```

é responsável por:

1. configurar o ambiente Python;
2. instalar as dependências;
3. executar os testes;
4. consultar o SIGAA;
5. gerar os dados atualizados;
6. verificar se houve alguma alteração real;
7. criar um commit automaticamente quando necessário.

Caso os dados permaneçam iguais, nenhum novo commit é criado.

O workflow também pode ser executado manualmente pela interface do GitHub Actions.

## Atualização automática das estruturas curriculares

O workflow:

```text
.github/workflows/atualizar-curriculos.yml
```

atualiza periodicamente as estruturas curriculares extraídas do SIGAA.

A execução automática ocorre uma vez por mês.

O processo:

1. configura o ambiente Python;
2. restaura o cache de componentes quando disponível;
3. instala as dependências;
4. executa os testes;
5. consulta as estruturas curriculares;
6. consulta os detalhes dos componentes necessários;
7. atualiza os arquivos em `public/data/curriculos/`;
8. cria um commit apenas quando os dados públicos realmente mudam.

Se a atualização de um curso falhar e já existir uma versão válida salva anteriormente, o sistema mantém os últimos dados disponíveis.

## Integração contínua

O projeto possui um workflow de CI executado em pushes e Pull Requests para a branch `main`.

As verificações incluem:

### Python

```bash
python -m pytest -v
```

### Frontend

```bash
npm test
npm run lint
npm run build
```

O objetivo é impedir que alterações que quebrem os parsers, a lógica de conflitos, o TypeScript ou o build da aplicação sejam incorporadas sem serem detectadas.

## Executando localmente

### Pré-requisitos

Recomenda-se possuir:

```text
Python 3.12+
Node.js 22+
npm
Git
```

### Clone o repositório

Após a renomeação no GitHub:

```bash
git clone git@github.com:IrlanBarros/planeja-ufca.git
cd planeja-ufca
```

### Configure o ambiente Python

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Instale as dependências:

```bash
pip install -r scraper/requirements.txt
```

### Execute os testes Python

```bash
python -m pytest -v
```

### Atualize os dados das turmas

```bash
python -m scraper.scraper
```

Os dados das turmas serão gerados em:

```text
public/data/cursos-atual.json
```

### Atualize as estruturas curriculares

```bash
python -m scraper.curricula
```

Os dados serão gerados em:

```text
public/data/curriculos/
```

### Instale as dependências do frontend

```bash
npm install
```

### Execute os testes do frontend

```bash
npm test
```

### Inicie o ambiente de desenvolvimento

```bash
npm run dev
```

O Vite exibirá no terminal o endereço local da aplicação, normalmente:

```text
http://localhost:5173
```

A página principal ficará disponível em:

```text
/
```

e as estruturas curriculares em:

```text
/curriculo?curso=<id_do_curso>
```

## Build de produção

Para gerar uma versão otimizada:

```bash
npm run build
```

Os arquivos serão gerados no diretório:

```text
dist/
```

O build pré-renderiza as seis rotas públicas com React 19, gera `sitemap.xml`, `robots.txt`, os metadados por página e um `404.html`. O diretório `dist-ssr/` é usado somente durante o build; publique apenas `dist/`.

O domínio é centralizado em `src/seo/config.ts`. Para um domínio próprio confirmado, defina `VITE_SITE_URL` com a origem HTTPS de produção antes do build; veja `.env.example`. Não use URLs de preview nessa variável.

No Cloudflare Pages, use **Build command: `npm run build`**, **Build output directory: `dist`** e Node.js 22 ou superior. Confirme esses valores no painel. O cache e a compressão padrões do Pages são preservados.

Para inspecionar o resultado localmente:

```bash
npm run preview -- --port 4173
# Em outro terminal:
npm run verify:http -- http://localhost:4173
npm run analyze:build
```

Após publicar, verifique as rotas, o HTTP 404, o sitemap e a ausência de bloqueios na origem de produção. A verificação de propriedade e o envio do sitemap ao Google Search Console exigem ação manual. Consulte o [relatório de SEO e desempenho](docs/seo-desempenho.md) para diagnóstico, métricas, decisões e instruções.

Para validar o código:

```bash
npm run lint
```

## Exportação

### CSV

A exportação CSV contém informações como:

```text
Código
Disciplina
Turma
Docente
Dia
Horário inicial
Horário final
Código de horário do SIGAA
Sala
```

Os arquivos de horário usam o prefixo `planeja-ufca-horario-`; as estruturas curriculares usam `planeja-ufca-estrutura-curricular-` ou `planeja-ufca-meu-progresso-`. Os formatos acadêmicos permanecem iguais.

O arquivo utiliza codificação UTF-8 e pode ser aberto em ferramentas como LibreOffice Calc e Microsoft Excel.

### PDF

O PDF é gerado diretamente no navegador e contém:

- período acadêmico;
- grade semanal;
- disciplinas selecionadas;
- turma;
- docente;
- horário;
- sala, com os locais completos na relação detalhada.

A grade é desenhada diretamente no documento, evitando depender de capturas de tela da interface.

## Backup e mudança de endereço

No rodapé, abra **Exportar ou importar dados locais**. A exportação JSON inclui tema e horários por curso/período; o perfil acadêmico estruturado só entra se você marcar sua autorização. O arquivo não contém PDF, texto integral, identificadores civis ou matrícula. Ele pode conter informações acadêmicas pessoais: guarde-o com cuidado e apague-o após a migração se não quiser mantê-lo.

Exporte no domínio antigo e importe no novo. Confira o resumo e confirme a substituição dos dados indicados; horários de outros períodos/cursos e o perfil salvo ausente do arquivo são preservados. Após a restauração, a página recarrega. Perfis temporários e outras preferências somente da sessão são descartados nessa recarga. Tudo ocorre no navegador, sem upload. Feche outras abas durante a restauração e mantenha o backup até conferir o resultado.

Novos backups usam o formato `planeja-ufca-backup`, versão 1. Arquivos compatíveis das identidades anteriores também são aceitos, com a mesma validação e confirmação.

As novas chaves são `planeja-ufca:<periodo>:<cursoId>:turmas` e `planeja-ufca:theme`; o banco é `planeja-ufca-perfil-academico`. O [relatório de rebranding](docs/rebranding-planeja-ufca.md) descreve a migração na mesma origem, os limites de recuperação e a publicação em fases.

## Privacidade

O projeto não possui autenticação ou backend para receber históricos. A importação opcional trata localmente dados pessoais acadêmicos fornecidos pelo estudante; isso é diferente de coleta remota.

O PDF é interpretado no navegador com PDF.js e um worker incluído no build, sem CDN, upload ou serviços externos de interpretação. O arquivo original, o texto integral e identificadores como nome, CPF e matrícula não integram o perfil salvo. Apenas o perfil acadêmico estruturado pode ser gravado em IndexedDB, mediante escolha explícita após a conferência. O processamento local não representa garantia absoluta de segurança ou conformidade jurídica.

As escolhas de turmas e o tema continuam armazenados separadamente em `localStorage`. A hospedagem pode processar informações técnicas de conexão necessárias ao acesso ao site. Consulte a página pública `/privacidade` para conhecer as diferenças e os controles disponíveis.

## Importação do histórico acadêmico

1. Abra **Meu Histórico Acadêmico** na página principal (`/historico`).
2. Leia o aviso e escolha **Autorizar processamento local**. Recusar mantém as demais ferramentas disponíveis.
3. Selecione o histórico escolar digital em PDF emitido pelo SIGAA da UFCA e escolha **Analisar PDF neste navegador**.
4. Compare os resultados com o documento. Corrija curso, estrutura, período e campos dos registros ou rejeite uma tentativa. Alterações manuais ficam identificadas e preservam o valor acadêmico originalmente extraído.
5. Escolha **Usar somente nesta sessão** (memória até fechar ou recarregar a página) ou **Salvar neste dispositivo** (IndexedDB, recuperado em visitas futuras no mesmo navegador).

O perfil contém vínculo acadêmico, cinco índices oficiais sem recálculo, todas as tentativas de disciplinas, marcadores, pendências, equivalências direcionais, atividades e cargas horárias oficiais. A associação ao catálogo de cursos é conservadora e opcional; o código da matriz do histórico é preservado sem selecionar uma matriz mais recente.

Para atualizar, escolha **Importar versão atualizada**, confira as datas de emissão e confirme a substituição integral. Um documento mais antigo gera aviso; não há fusão automática entre históricos. Para remover os dados, use **Apagar meus dados acadêmicos** e confirme. A exclusão preserva horários e tema.

São aceitos PDFs digitais reconhecíveis da UFCA/SIGAA, inicialmente até 15 MB, 80 páginas e 45 segundos de leitura. Os limites são configuráveis em `src/features/historico/parser/importarPdf.ts`. Não há OCR ou suporte a PDFs protegidos por senha ou páginas rotacionadas. Mudanças no layout institucional podem exigir ajustes; informações incertas geram advertências e devem ser conferidas. Navegadores podem bloquear ou eliminar o armazenamento local.

A importação prepara modelos e acesso compartilhado ao perfil, sem recalcular índices ou prever formatura. O planejamento por regras está disponível separadamente em `/recomendacoes`. Arquitetura, arquivos, testes e limitações estão em [docs/importacao-historico-lgpd.md](docs/importacao-historico-lgpd.md).

## Guia Acadêmico

A página pública `/guia-academico` explica **MC, MCN, IECH, IEPL e IEA**, com exemplos hipotéticos passo a passo, fórmulas expansíveis, fatores de influência, limites e dúvidas frequentes. O glossário distingue esses índices de carga horária, situações das disciplinas, estrutura curricular, equivalências, prazos e períodos.

Abra **Entenda seus índices acadêmicos** na página principal ou **Entenda este índice** no resumo do histórico para ir diretamente à explicação correspondente. O guia funciona sem PDF, perfil ou autorização de tratamento; seus componentes não acessam IndexedDB. A navegação preserva o perfil temporário ou salvo e os valores extraídos, inclusive ausentes, sem gravar informações ou colocá-las na URL.

O conteúdo é exclusivamente educativo: **não recalcula indicadores individuais**, simula notas, recomenda matrículas nem prevê formatura. Os dados tipados das explicações ficam separados dos dados pessoais. As fontes são o Regulamento dos Cursos de Graduação (Resolução Consuni nº 157/2023), suas alterações nº 279/2025 e nº 308/2026 e o catálogo do Consuni, incluindo a homologação nº 313/2026. Última verificação: **07/11/2026**, sem atualização normativa automática.

A MCN depende de estatísticas institucionais externas ao histórico individual. A legenda do SIGAA contém descrições de faixas de notas diferentes do art. 95 consultado; o guia explica os códigos sem publicar essas faixas como regra vigente. Confira os detalhes, as referências consultáveis e o procedimento de manutenção em [docs/guia-indices-academicos.md](docs/guia-indices-academicos.md).

## Fonte dos dados

As informações de estruturas curriculares, componentes, turmas, docentes, vagas, horários e salas são obtidas a partir das páginas públicas do SIGAA da Universidade Federal do Cariri.

Este projeto não possui vínculo oficial com a UFCA.

Os dados exibidos dependem das informações disponibilizadas pela instituição no SIGAA e podem sofrer alterações.

Para decisões acadêmicas oficiais, consulte sempre os sistemas e canais institucionais da UFCA.

## Status do projeto

O projeto possui atualmente uma versão funcional com:

- coleta automática das turmas;
- montagem do horário;
- detecção de conflitos;
- persistência local;
- busca e filtros;
- exportação em CSV e PDF;
- consulta de estruturas curriculares;
- suporte a múltiplas matrizes;
- importação local de histórico acadêmico, conferência e armazenamento opcional;
- recomendações determinísticas com equivalências, requisitos, dependências e preferências;
- integração das sugestões com o horário existente;
- exibição de pré-requisitos;
- identificação visual de disciplinas optativas;
- atualização automatizada dos dados.

Entre as possíveis evoluções futuras estão:

- planejamento de múltiplos semestres;
- análise de ofertas futuras e vigência das equivalências;
- otimização global de combinações de horários;
- priorização de horários com menos janelas;
- melhorias de acessibilidade;
- otimizações para dispositivos móveis.

## Licença

Este projeto é distribuído sob a licença MIT. Consulte o arquivo `LICENSE` para mais informações.

## Recomendações acadêmicas

Abra **Planejar meu próximo semestre** na página principal ou no histórico, ou acesse `/recomendacoes`. É necessário importar e conferir um histórico acadêmico pelos controles existentes; o perfil pode ser temporário ou salvo neste dispositivo.

O planejador identifica a matriz pelo código do documento e combina disciplinas cumpridas, equivalências direcionais, pré-requisitos E/OU, correquisitos, dependências curriculares e a oferta do período consultado. A priorização é determinística e explicável: considera obrigatoriedade, desbloqueios efetivos, nível curricular, retomadas, oferta e preferências. Não usa notas ou índices para julgar capacidade acadêmica.

Configure carga pretendida, dias, turnos e as estratégias **Equilibrado**, **Priorizar avanço** ou **Concentrar horários**, depois gere as sugestões. Cada card permite consultar motivos, tentativas, fontes e turmas alternativas. Adicione uma turma elegível ou o conjunto sugerido ao horário atual, preservando escolhas anteriores. Correquisitos pendentes precisam de inclusão conjunta compatível. As turmas continuam removíveis e exportáveis na página principal, com armazenamento por curso e período e migração compatível das chaves anteriores.

Dados incompletos, matrículas antigas e regras ambíguas são sinalizados para confirmação. A ferramenta não confirma vagas livres, autorizações de matrícula, limites oficiais de carga, aprovação ou prazo de formatura. É um projeto independente da UFCA e não substitui a análise oficial de matrícula.

Histórico, preferências e recomendações são analisados no navegador. Só os catálogos públicos são buscados por GET. Os resultados e as preferências do planejador não são persistidos; apagar o perfil invalida a personalização. Os horários possuem armazenamento independente.

Veja [arquitetura, critérios, pesos, fontes normativas, testes e limitações](docs/recomendacoes-academicas.md).

## Currículo interativo e progresso acadêmico

Na página de estrutura curricular, alterne entre **Estrutura original** e **Meu progresso**, sem recarregar a aplicação. A consulta pública e suas exportações continuam disponíveis sem histórico. O modo personalizado usa o mesmo perfil temporário ou salvo pelo fluxo de `/historico`; há atalhos para a matriz vinculada tanto no histórico quanto nas recomendações.

A identificação compartilha as regras do recomendador: ID do curso, associação exata e única do catálogo quando o ID estiver ausente, e código da matriz do documento. Nomes parecidos não criam associações. A matriz do histórico tem preferência sobre a mais recente; selecionar outra mantém somente a consulta pública. Matrizes com código repetido precisam de confirmação explícita do ID.

Os cards podem ser abertos com mouse, toque ou teclado e mostram carga horária, tipo, período recomendado, pré-requisitos, correquisitos e equivalências. No modo personalizado, acrescentam justificativa, requisitos avaliados, origem do cumprimento e tentativas registradas. As situações são:

- **Verde — Concluída:** aprovação, dispensa ou outro cumprimento reconhecido pela lógica existente, inclusive equivalência direcional comprovada. Equivalências usam o mesmo verde.
- **Azul — Cursando:** matrícula no período de referência da oferta pública, em histórico com emissão atual confirmável. Matrículas antigas ou sem referência ficam a verificar.
- **Amarelo — Disponível:** requisitos acadêmicos conhecidos satisfeitos. Não confirma oferta de turma nem vaga.
- **Vermelho — Bloqueada:** rótulo e contorno vermelhos indicam requisitos conhecidos pendentes, inclusive necessidade de matrícula conjunta em correquisito, na interface e no PDF.
- **Apresentação neutra — Situação a verificar:** registros incompletos, contraditórios, antigos ou regras sem interpretação segura. Não há uma quinta cor. Reprovações e trancamentos anteriores usam os requisitos atuais, sem estado visual próprio.

As quatro barras (geral, obrigatórias, optativas e complementares) usam a tabela **oficial de horas exigidas, integralizadas e pendentes do histórico**. Dados ausentes, negativos ou inconsistentes não geram porcentagens. Os totais de componentes são separados entre obrigatórias e catálogo de optativas, sem duplicar tentativas. Não é necessário concluir todas as optativas: o indicador usa a carga optativa oficialmente exigida. Obrigatórias sem período aparecem em **Outros componentes obrigatórios**.

Use **Baixar PDF** ou **Baixar CSV** para exportar o modo selecionado. Ambos recebem o mesmo modelo estruturado. O PDF agrupa períodos, componentes sem nível e optativas, trata textos longos e repete cabeçalhos e numeração nas páginas; o personalizado inclui legenda, situações e resumo oficial. O CSV mantém uma tabela única, com identificação da matriz em cada linha, UTF-8 com BOM, separador `;`, campos entre aspas, escape de aspas/quebras e proteção de textos contra fórmulas de planilha. No modo personalizado acrescenta situação, justificativa, emissão e período de referência. As barras e advertências gerais ficam na interface e no PDF, preservando o formato tabular do CSV.

Tudo é calculado no navegador. Somente os catálogos públicos são consultados por GET; o histórico e os arquivos gerados não são enviados a APIs. Não há armazenamento adicional do perfil, nem gravação automática de PDFs/CSVs. Atualizar o perfil atualiza as situações; apagar o histórico remove os indicadores e impede a exportação personalizada. O modo original sempre permanece disponível.

A plataforma **não substitui a validação curricular oficial realizada pela UFCA**. A carga horária integralizada não comprova sozinha todas as exigências institucionais. Regras e dados sem evidência suficiente dependem de confirmação. A referência temporal usa o período publicado na oferta e a atualidade semestral do documento, sem acesso a matrículas em tempo real. Veja [arquitetura, exportações, testes e limitações](docs/curriculo-interativo.md).

## Autor

Desenvolvido por **Irlan Barros**.

Transformando café em código e conflitos de horário em problema resolvido.
