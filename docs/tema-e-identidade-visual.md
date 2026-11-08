# Tema e identidade visual

## 1. Resumo

Implementados um sistema global com os modos Claro, Escuro e Sistema, um favicon SVG próprio e um rodapé reutilizável. As duas rotas preservam a navegação, os formulários e a organização das páginas. Não foram adicionadas dependências.

A análise inicial identificou CSS compartilhado em `App.css`, CSS da página curricular, informações de salas nos cards e na grade, um diálogo nativo de detalhes e persistência de turmas por curso e período. Esses elementos foram contemplados sem alterar o posicionamento das aulas ou as regras acadêmicas.

## 2. Arquitetura do tema

`ThemeProvider` envolve o roteador e mantém uma única preferência em memória. `useTheme` oferece a preferência, o tema efetivo e a função de alteração. O seletor usa um elemento `select` nativo, com label visível e opções Claro, Escuro e Sistema.

A chave atual `planeja-ufca:theme` aceita somente `light`, `dark` e `system`. Na ausência da chave definitiva, são consultadas as duas identidades anteriores na ordem documentada ao final. Sem preferência recuperável, ou com o primeiro valor existente inválido/inacessível, o tema resulta em Sistema. A leitura e a escrita têm tratamento de exceções. A escolha explícita é persistida imediatamente; quando o navegador bloqueia a escrita, a preferência continua funcionando em memória.

`useSyncExternalStore` observa a consulta `(prefers-color-scheme: dark)` e remove o listener ao desmontar. Mudanças do sistema afetam o tema efetivo quando a preferência é Sistema. As escolhas Claro e Escuro têm prioridade sobre o sistema.

O tema é aplicado a `document.documentElement.dataset.theme` e à propriedade `color-scheme`. Um script pequeno no `head` aplica a preferência antes do carregamento da interface; o provider mantém o resultado sincronizado antes da pintura das atualizações do React. Testes executam o script real do HTML para verificar sua consistência com a resolução usada pelo provider.

`AppLayout`, uma rota pai com `Outlet`, concentra o seletor e o rodapé. As páginas mantêm seus elementos `main`. Assim, os controles globais também aparecem nos retornos de carregamento, erro e ausência de dados, inclusive em acessos diretos a `/curriculo`.

Os acessos existentes ao armazenamento de turmas receberam apenas proteção contra exceções. As chaves por curso/período e o conteúdo armazenado foram preservados.

## 3. Identidade visual e acessibilidade

As cores estão centralizadas em variáveis semânticas em `src/index.css`. `App.css` e `CurriculoPage.css` consomem essas variáveis sem duplicar seus layouts por tema.

| Uso | Claro | Escuro |
| --- | --- | --- |
| Fundo | `#f6f7f9` | `#101826` |
| Superfície | `#ffffff` | `#182334` |
| Superfície secundária | `#f8fafc` | `#202d40` |
| Texto principal | `#1a1a1a` | `#e2e8f0` |
| Ação principal | `#2563eb` | `#2563eb` |
| Links | `#2563eb` | `#93c5fd` |
| Blocos da grade | `#dbeafe` | `#19345a` |

Azul identifica ações, seleção e aulas; vermelho identifica conflitos e erros; âmbar identifica optativas. Os cards optativos selecionados recebem a borda e o fundo de seleção, mantendo o badge textual. Cards com conflito conservam a sinalização vermelha mesmo quando também são optativos.

Salas, horários, pré-requisitos, campos, placeholders, estados vazios, botões, filtros e o diálogo da grade usam a paleta global. Os textos e limites das aulas mantêm contraste com o fundo. As cores do jsPDF continuam definidas exclusivamente pelo exportador, preservando o PDF claro em qualquer tema.

O foco de teclado recebe contorno visível. O seletor possui label associado, e os filtros expõem a seleção com `aria-pressed`. Seleção, optativas e conflitos também têm identificação textual. A preferência por movimento reduzido desativa as transições existentes.

Testes de contraste calculam a luminância das cores reais do CSS: 17 pares de texto por tema atingem pelo menos 4,5:1, e o contorno dos campos atinge pelo menos 3:1. Essa verificação cobre a paleta, sem representar uma auditoria completa de acessibilidade.

## 4. Favicon e HTML

`public/favicon.svg` foi substituído por um calendário azul com folhas claras e pequenos blocos que representam uma grade de horários. A composição usa `viewBox="0 0 32 32"`, formas simples e bordas arredondadas; não utiliza símbolos institucionais.

A referência `/favicon.svg` foi mantida no HTML. Não foi necessário adicionar PNG ou bibliotecas. `index.html` agora declara `lang="pt-BR"`, inclui uma descrição da aplicação e informa suporte a esquemas claro/escuro. O título atual é **Planeja UFCA**.

## 5. Rodapé

Conteúdo em 2026:

> **Planeja UFCA**
> © 2026 Irlan Barros · Autoria e desenvolvimento · Licença MIT  
> Projeto independente, não oficial da Universidade Federal do Cariri.

O ano inicial permanece 2026. A partir de 2027, o componente apresenta o intervalo `2026–ano atual`. Um relógio incorreto anterior a 2026 não reduz o ano original. A licença MIT não foi modificada.

O rodapé usa `footer`, borda superior e conteúdo com a mesma largura das páginas. O elemento raiz é uma coluna Flexbox, com o `main` ocupando o espaço disponível. O rodapé fica ao final da janela em páginas curtas e acompanha o fluxo em páginas longas, sem posicionamento fixo. Os textos podem quebrar em telas pequenas. A autoria foi apresentada uma única vez, sem links pessoais adicionais.

## 6. Arquivos modificados e criados

| Arquivo | Finalidade |
| --- | --- |
| `index.html` | Idioma, metadados e aplicação antecipada do tema |
| `public/favicon.svg` | Calendário original em SVG |
| `src/main.tsx` | Integração do provider e da rota de layout |
| `src/index.css` | Paletas globais, foco, seletor, rodapé e layout Flexbox |
| `src/App.css` | Cores dos componentes, grade, salas, diálogo e estados semânticos |
| `src/App.tsx` | Proteção do armazenamento existente e estado acessível dos filtros |
| `src/pages/CurriculoPage.css` | Cores curriculares e proteção contra transbordamento dos cards |
| `src/pages/CurriculoPage.tsx` | Classe visual das optativas curriculares |
| `src/theme/theme.ts` | Tipos, contexto, hook, persistência e integração com o sistema |
| `src/theme/ThemeProvider.tsx` | Estado central e sincronização do documento |
| `src/components/ThemeSelector.tsx` | Seletor nativo de três opções |
| `src/components/Footer.tsx` | Rodapé semântico e ano dinâmico |
| `src/components/AppLayout.tsx` | Elementos compartilhados das rotas |
| `src/theme/theme.test.ts` | Preferências, bootstrap, armazenamento bloqueado e eventos do sistema |
| `src/theme/contrast.test.ts` | Contraste das paletas reais |
| `src/components/AppLayout.test.tsx` | Rodapé, datas, rotas, carregamento/erro e opção ativa |
| `README.md` | Documentação das funcionalidades e da preferência local |
| `docs/tema-e-identidade-visual.md` | Relatório técnico da entrega |

## 7. Validação

| Comando | Resultado |
| --- | --- |
| `npm run lint` | Passou |
| `npm test` | 83 testes passaram em 7 arquivos, incluindo os 24 testes anteriores |
| `npm run build` | Passou; aviso de bundle acima de 500 kB |

Testes automatizados verificam os três modos, valores ausentes/inválidos, leitura/escrita bloqueada, ausência de `matchMedia`, eventos de mudança do sistema, remoção de listeners, consistência do bootstrap, seleção acessível, ano inicial e intervalos futuros. Renderização estática verifica um único rodapé e seletor nas duas rotas, durante carregamento e erro.

A inspeção no navegador local verificou os dois temas nas páginas principal e curricular, preferência após recarga e navegação, acesso direto ao currículo, grade, salas e diálogo, filtros, seleção/remoção, cards e aviso de conflito, optativas e rodapé em página curta. Foram verificadas larguras móveis, incluindo 375 px, sem transbordamento da página; a grade conserva sua rolagem horizontal própria.

Scraper, JSONs, licença, algoritmos de conflitos, busca, chaves de horários e exportadores CSV/PDF permaneceram preservados. Não foram realizados commits ou pushes.

## 8. Limitações e verificações manuais

Mudanças do sistema e bloqueio de armazenamento foram simulados nos testes automatizados; não foi alterada a configuração do sistema operacional ou de privacidade do navegador do usuário. A prevenção do tema incorreto foi verificada pelo script inicial e por recargas, sem medição quadro a quadro em rede lenta.

O SVG é o único formato de favicon entregue. O cache e a aparência na aba em navegadores diferentes, especialmente em 16 px, ainda merecem conferência manual. A inspeção visual local não equivale a testes em aparelhos físicos ou em todos os navegadores.

O aviso do Vite sobre tamanho do bundle não impede a geração dos arquivos de produção; a divisão do bundle não fez parte desta tarefa.

## Atualização de identidade: Planeja UFCA

As verificações e decisões anteriores acima registram a implementação original do tema. O rebranding preserva a paleta e o desenho do calendário; atualiza o nome no título, favicon e rodapé. Na ausência da chave definitiva `planeja-ufca:theme`, a chave intermediária `projeta-ufca:theme` tem prioridade sobre a original `seu-horario-ufca:theme`. A primeira existente é validada e copiada; um registro existente inválido não é sobrescrito por uma cópia antiga e resulta em Sistema. O bootstrap do HTML segue a mesma precedência, inclusive se a escrita falhar, sem alterar o modo Sistema. Os horários também recebem chaves novas compatíveis. Detalhes em [Rebranding Planeja UFCA](rebranding-planeja-ufca.md).
