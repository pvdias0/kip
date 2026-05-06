export const TERMS_OF_SERVICE_VERSION = "2026-05-06";
export const PRIVACY_POLICY_VERSION = "2026-05-06";
export const LEGAL_LAST_UPDATED_LABEL = "6 de maio de 2026";

type LegalSection = {
  heading: string;
  paragraphs: string[];
  items?: string[];
};

type LegalDocument = {
  title: string;
  shortTitle: string;
  version: string;
  effectiveDateLabel: string;
  intro: string[];
  sections: LegalSection[];
};

export const privacyPolicyDocument: LegalDocument = {
  title: "Politica de Privacidade",
  shortTitle: "Politica",
  version: PRIVACY_POLICY_VERSION,
  effectiveDateLabel: LEGAL_LAST_UPDATED_LABEL,
  intro: [
    "Esta Politica de Privacidade descreve como o KIP coleta, utiliza, armazena e protege os dados pessoais tratados na plataforma de organizacao financeira.",
    "Ao criar uma conta ou utilizar o sistema, o usuario declara que leu este documento e compreendeu como seus dados sao tratados para viabilizar as funcionalidades do produto.",
  ],
  sections: [
    {
      heading: "1. Dados coletados",
      paragraphs: [
        "O KIP coleta dados fornecidos diretamente pelo usuario, como nome, email, senha criptografada, categorias criadas, transacoes financeiras, formas de pagamento e contas de pagamento cadastradas.",
        "Tambem podem ser registrados dados tecnicos e operacionais ligados ao uso do sistema, como token de recuperacao de senha, eventos de autenticacao, identificadores de sessao, endereco IP e user agent quando necessario para seguranca, auditoria e cumprimento regulatorio.",
      ],
    },
    {
      heading: "2. Finalidades do tratamento",
      paragraphs: [
        "Os dados sao utilizados para criar e administrar a conta, autenticar o usuario, disponibilizar o painel financeiro, gerar estatisticas, enviar emails de verificacao e recuperacao de senha, manter a integridade do sistema e prevenir uso indevido.",
        "O KIP tambem utiliza os dados para viabilizar sincronizacao em tempo real, melhorar a experiencia de uso, investigar incidentes e cumprir obrigacoes legais ou ordens validas de autoridades competentes.",
      ],
    },
    {
      heading: "3. Base de armazenamento e seguranca",
      paragraphs: [
        "As informacoes sao armazenadas em infraestrutura controlada pelo projeto, com uso de senha criptografada, validacoes de acesso, autenticacao via token e controles tecnicos razoaveis para reduzir risco de acesso nao autorizado.",
        "Nenhum sistema e absolutamente imune a falhas. Por isso, o usuario tambem deve adotar boas praticas de seguranca, manter credenciais sob sigilo e comunicar suspeitas de uso indevido assim que identificadas.",
      ],
    },
    {
      heading: "4. Compartilhamento de dados",
      paragraphs: [
        "O KIP nao comercializa dados pessoais. O compartilhamento pode ocorrer apenas com operadores e fornecedores estritamente necessarios para a prestacao do servico, como infraestrutura, envio de email e suporte tecnico, sempre dentro do limite funcional do produto.",
        "Dados tambem podem ser revelados para atendimento de obrigacoes legais, exercicio regular de direitos ou protecao da plataforma contra fraude, abuso ou ameacas a seguranca.",
      ],
    },
    {
      heading: "5. Retencao e exclusao",
      paragraphs: [
        "Os dados permanecem armazenados enquanto a conta estiver ativa ou enquanto forem necessarios para cumprimento das finalidades descritas nesta politica, observadas exigencias legais, regulatorias e de defesa em processos.",
        "Quando houver solicitacao valida de exclusao ou encerramento da conta, os dados poderao ser eliminados ou anonimizados, exceto quando a retencao for obrigatoria ou justificavel por seguranca, auditoria ou cumprimento de lei.",
      ],
    },
    {
      heading: "6. Direitos do titular",
      paragraphs: [
        "O usuario pode solicitar confirmacao sobre tratamento, acesso, correcao de dados, atualizacao cadastral e informacoes gerais sobre o uso de seus dados pessoais, respeitadas as limitacoes tecnicas e legais aplicaveis.",
      ],
      items: [
        "acesso aos dados vinculados a sua conta",
        "correcao de informacoes desatualizadas ou inexatas",
        "solicitacao de exclusao, quando juridicamente cabivel",
        "revogacao de consentimento para futuras versoes destes documentos",
      ],
    },
    {
      heading: "7. Cookies e tecnologias correlatas",
      paragraphs: [
        "O sistema pode utilizar armazenamento local do navegador e mecanismos equivalentes para manter sessao autenticada, preferencia de tema e estado operacional necessario ao funcionamento da aplicacao.",
      ],
    },
    {
      heading: "8. Atualizacoes desta politica",
      paragraphs: [
        "Esta politica pode ser atualizada para refletir alteracoes legais, tecnicas ou de produto. Quando isso ocorrer, uma nova versao podera ser apresentada ao usuario e um novo aceite podera ser exigido antes do uso continuado da plataforma.",
      ],
    },
  ],
};

export const termsOfServiceDocument: LegalDocument = {
  title: "Termos de Servico",
  shortTitle: "Termos",
  version: TERMS_OF_SERVICE_VERSION,
  effectiveDateLabel: LEGAL_LAST_UPDATED_LABEL,
  intro: [
    "Estes Termos de Servico regulam o acesso e o uso da plataforma KIP. O servico e destinado ao controle financeiro pessoal e depende da aceitacao integral destas regras.",
    "Ao prosseguir com o cadastro, login ou aceite posterior, o usuario concorda em utilizar o sistema de forma licita, pessoal e compativel com a finalidade da aplicacao.",
  ],
  sections: [
    {
      heading: "1. Objeto do servico",
      paragraphs: [
        "O KIP disponibiliza funcionalidades para registro de receitas e despesas, organizacao por categorias, acompanhamento por formas de pagamento e visualizacao de indicadores financeiros.",
      ],
    },
    {
      heading: "2. Elegibilidade e conta",
      paragraphs: [
        "O usuario e responsavel por fornecer informacoes verdadeiras, manter seus dados atualizados e proteger suas credenciais de acesso. O compartilhamento indevido de conta e vedado.",
        "A confirmacao de email e parte obrigatoria do processo de ativacao da conta. Sem ela, o acesso autenticado nao e liberado.",
      ],
    },
    {
      heading: "3. Uso permitido",
      paragraphs: [
        "O usuario deve utilizar a plataforma apenas para finalidades legitimas e dentro dos limites tecnicos disponibilizados.",
      ],
      items: [
        "nao tentar violar a seguranca do sistema",
        "nao automatizar acessos de forma abusiva",
        "nao inserir conteudo ilicito, fraudulento ou que viole direitos de terceiros",
        "nao interferir no funcionamento da infraestrutura ou dos dados de outros usuarios",
      ],
    },
    {
      heading: "4. Responsabilidades do usuario",
      paragraphs: [
        "Os dados financeiros inseridos no sistema sao de exclusiva responsabilidade do usuario. O KIP nao responde por classificacoes incorretas, lancamentos indevidos ou decisoes financeiras tomadas com base em informacoes incompletas ou erradas fornecidas pelo proprio usuario.",
      ],
    },
    {
      heading: "5. Disponibilidade e melhorias",
      paragraphs: [
        "O projeto busca disponibilidade razoavel, mas pode realizar manutencoes, correcoes, atualizacoes e alteracoes funcionais sem aviso previo quando necessario para seguranca, estabilidade ou evolucao do produto.",
        "Recursos podem ser modificados, descontinuados ou expandidos conforme a estrategia do projeto e as necessidades operacionais identificadas.",
      ],
    },
    {
      heading: "6. Suspensao e encerramento",
      paragraphs: [
        "O acesso pode ser suspenso ou encerrado em caso de violacao destes termos, tentativa de fraude, uso abusivo, imposicao legal ou risco relevante a operacao da plataforma e de terceiros.",
      ],
    },
    {
      heading: "7. Propriedade intelectual",
      paragraphs: [
        "A interface, o software, os fluxos, a identidade visual e demais elementos do sistema pertencem ao projeto KIP ou a seus respectivos titulares, sendo vedado reproduzir, distribuir ou explorar esses elementos fora das hipoteses permitidas por lei ou autorizadas expressamente.",
      ],
    },
    {
      heading: "8. Limitacao de responsabilidade",
      paragraphs: [
        "O KIP e fornecido no estado em que se encontra, com esforco razoavel de qualidade e seguranca, sem garantia absoluta de disponibilidade ininterrupta ou ausencia total de falhas.",
        "Na maxima extensao permitida pela legislacao aplicavel, a responsabilidade da plataforma fica limitada aos danos diretos comprovadamente causados por conduta imputavel ao servico, excluidos lucros cessantes, danos indiretos e decisoes financeiras pessoais do usuario.",
      ],
    },
    {
      heading: "9. Atualizacoes destes termos",
      paragraphs: [
        "Versoes futuras destes termos podem substituir a presente redacao. Quando a mudanca impactar o uso do servico, o usuario podera ser obrigado a registrar novo aceite antes de continuar utilizando as funcionalidades protegidas.",
      ],
    },
  ],
};
