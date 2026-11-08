import type { CategoriaGlossario } from '../models/types'

export const categoriasGlossario: CategoriaGlossario[] = [
  {
    id: 'carga-horaria', titulo: 'Carga horária', fonte: 'Regulamento: arts. 15–17, atividades complementares e glossário institucional.',
    termos: [
      { termo: 'Carga horária exigida', explicacao: 'Mínimo de horas que a estrutura exige em cada categoria para concluir o curso. Cumprir o total não substitui as exigências de cada categoria.' },
      { termo: 'Carga horária integralizada', explicacao: 'Horas reconhecidas oficialmente no cumprimento da sua estrutura curricular. Apenas estar matriculado ou ter cursado uma tentativa não garante essa integralização.' },
      { termo: 'Carga horária pendente', explicacao: 'Horas que ainda precisam ser reconhecidas na categoria correspondente. Consulte também os componentes obrigatórios pendentes: só o total de horas não descreve todas as exigências.' },
      { termo: 'Carga horária cursada', explicacao: 'Refere-se às horas dos componentes cursados. Reprovações e outras tentativas podem constar do histórico sem converter essas horas em integralização.' },
      { termo: 'Componentes obrigatórios', explicacao: 'Componentes cujo cumprimento é indispensável para integralizar a estrutura curricular vinculada ao estudante.' },
      { termo: 'Componentes optativos', explicacao: 'Componentes escolhidos entre as possibilidades do PPC, respeitando a quantidade de horas e as regras previstas. Optativo não significa que a exigência de horas da categoria é facultativa.' },
      { termo: 'Atividades complementares', explicacao: 'Experiências de formação reconhecidas segundo o PPC e as normas institucionais. O registro e a validação das horas seguem regras próprias; participação não significa crédito automático.' },
    ],
  },
  {
    id: 'estrutura-curricular', titulo: 'Estrutura curricular', fonte: 'Regulamento: arts. 9–17, 68–77 e glossário institucional.',
    termos: [
      { termo: 'Estrutura curricular', explicacao: 'Conjunto de componentes e regras que organiza a formação de uma matriz curricular. A versão vinculada ao estudante pode ser diferente da mais recente do curso.' },
      { termo: 'Período recomendado', explicacao: 'Posição sugerida de um componente na sequência da estrutura. Não comprova que o estudante está cursando aquele período nem substitui os requisitos de matrícula.' },
      { termo: 'Pré-requisitos', explicacao: 'Condições de aprendizagem prévia exigidas para matrícula em outro componente, conforme sua caracterização. Podem envolver componentes ou conjuntos de componentes.' },
      { termo: 'Correquisitos', explicacao: 'Condições que vinculam componentes a serem cursados simultaneamente, salvo quando o requisito já foi cumprido. A estrutura e as regras institucionais definem sua aplicação.' },
      { termo: 'Equivalências', explicacao: 'Relações institucionais que permitem usar um componente para cumprir a exigência de outro. Não são automaticamente simétricas ou transitivas: A valer para B não garante B para A, nem A para C.' },
      { termo: 'Aproveitamento, incorporação e dispensa', explicacao: 'São formas distintas de reconhecer o cumprimento curricular. Aproveitamento reconhece estudos anteriores; incorporação registra estudos em mobilidade; dispensa tem procedimento próprio. Integralizar horas por esses mecanismos não implica entrar em todos os índices.' },
    ],
  },
  {
    id: 'prazos-periodos', titulo: 'Prazos e períodos', fonte: 'Regulamento: duração no PPC, Anexo I, arts. 255–257 e 279–281.',
    termos: [
      { termo: 'Período letivo', explicacao: 'Intervalo acadêmico definido no calendário universitário. O código ano.semestre, o período atual exibido pelo SIGAA e o número de períodos considerados no IEPL são informações diferentes.' },
      { termo: 'Prazo padrão de conclusão', explicacao: 'Referência de duração prevista para a estrutura curricular. Não é uma previsão individual de formatura.' },
      { termo: 'Prazo máximo de conclusão', explicacao: 'Limite institucional de integralização aplicável ao vínculo, conforme PPC e regras de suspensão e prorrogação. Confira o prazo oficial no SIGAA e com a coordenação.' },
      { termo: 'Suspensão e mobilidade', explicacao: 'Suspensão interrompe as atividades do programa com manutenção do vínculo; mobilidade permite estudos em outra instituição. O Anexo I exclui esses períodos da contagem de P no IEPL.' },
      { termo: 'Perfil inicial', explicacao: 'É uma informação acadêmica utilizada no enquadramento inicial da trajetória. O Anexo I determina que os períodos nele contados não integrem P. Não é seguro deduzi-lo apenas pelo ano de ingresso.' },
    ],
  },
]

// Significados da legenda SIGAA/UFCA conferidos no histórico fornecido.
// Não reproduzir médias, nomes, matrícula ou qualquer outro dado pessoal do PDF.
export const situacoesDisciplinas = [
  { codigo: 'APR', nome: 'Aprovado por média', explicacao: 'Registro de aprovação por média no componente.' },
  { codigo: 'APRN', nome: 'Aprovado por nota', explicacao: 'Registro de aprovação por nota, conforme a forma de avaliação indicada pelo SIGAA.' },
  { codigo: 'REP', nome: 'Reprovado por média', explicacao: 'Registro de reprovação por rendimento na média.' },
  { codigo: 'REPF', nome: 'Reprovado por falta', explicacao: 'Não atendimento aos critérios de assiduidade.' },
  { codigo: 'REPMF', nome: 'Reprovado por média e falta', explicacao: 'Reprovação registrada tanto por média quanto por assiduidade.' },
  { codigo: 'REPN', nome: 'Reprovado por nota', explicacao: 'Registro de reprovação por nota, conforme a avaliação do componente.' },
  { codigo: 'REPNF', nome: 'Reprovado por nota e falta', explicacao: 'Reprovação registrada tanto por nota quanto por assiduidade.' },
  { codigo: 'TRANC', nome: 'Trancado', explicacao: 'Matrícula na turma trancada; não equivale a aprovação.' },
  { codigo: 'MATR', nome: 'Matriculado', explicacao: 'Matrícula na turma no momento da emissão; não confirma conclusão ou aprovação.' },
  { codigo: 'CANC', nome: 'Cancelado', explicacao: 'Matrícula na turma cancelada; não confundir com trancamento parcial nem com cancelamento do vínculo com o curso.' },
  { codigo: 'DISP', nome: 'Dispensado', explicacao: 'Componente registrado como dispensado. A legenda usa a expressão de aproveitamento e dispensa; a dispensa normativa tem procedimento próprio e é excluída da MC e do IECH.' },
  { codigo: 'TRANS', nome: 'Transferido', explicacao: 'Componente realizado em outra instituição e aproveitado na UFCA.' },
  { codigo: 'INCORP', nome: 'Incorporado', explicacao: 'Componente realizado durante mobilidade estudantil.' },
  { codigo: 'CUMP', nome: 'Cumpriu', explicacao: 'Componente feito na UFCA em outro curso anterior e aproveitado no curso atual.' },
  { codigo: 'REC', nome: 'Em recuperação', explicacao: 'Na legenda consultada, indica estudante que fará reposição. Não é um resultado final de aprovação.' },
  { codigo: 'PARCCUMP', nome: 'Parcialmente Cumprido', explicacao: 'Registro de cumprimento parcial do estágio no semestre; não significa conclusão integral do componente.' },
]

export const notaLegenda = 'Fonte dos códigos: legenda de histórico escolar emitido pelo SIGAA/UFCA, conferida localmente. As descrições de faixas de notas dessa legenda diferem dos critérios do art. 95 do regulamento consultado. Por isso, o guia preserva os nomes das situações sem reproduzir essas faixas como regras vigentes. Confira a regra aplicável ao seu registro com a coordenação ou a Prograd. Códigos não documentados não devem ser interpretados por suposição.'
