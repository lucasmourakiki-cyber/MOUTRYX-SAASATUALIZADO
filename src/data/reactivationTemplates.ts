export interface ReactivationMessageTemplateItem {
  id: string;
  title: string;
  category:
    | 'reativacao_natural'
    | 'nova_aplicacao'
    | 'organizacao_agenda'
    | 'cliente_prioritario'
    | 'periodo_safra'
    | 'follow_up'
    | 'relacionamento'
    | 'cliente_muito_antigo'
    | 'condicao_oportunidade'
    | 'clientes_regiao';
  categoryLabel: string;
  categoryIcon: string;
  tone: 'natural' | 'direta' | 'consultiva' | 'amigavel' | 'profissional' | 'objetiva' | 'oportunidade' | 'urgencia' | 'relacionamento';
  description: string;
  templateText: string;
  isActive: boolean;
  isCustom?: boolean;
}

export const REACTIVATION_CATEGORIES = [
  { id: 'reativacao_natural', label: 'Reativação Natural', icon: '🌱', description: 'Abordagens leves para retomar contato sem pressão de venda' },
  { id: 'nova_aplicacao', label: 'Nova Aplicação', icon: '🚜', description: 'Consultas sobre novas demandas de pulverização e manejo' },
  { id: 'organizacao_agenda', label: 'Organização de Agenda', icon: '📅', description: 'Uso da programação de voo e escala como motivo de contato' },
  { id: 'cliente_prioritario', label: 'Cliente Prioritário', icon: '🔥', description: 'Tratamento VIP e preferencial para clientes recorrentes' },
  { id: 'periodo_safra', label: 'Período de Safra', icon: '🌾', description: 'Mensagens conectadas ao momento fenológico e clima da lavoura' },
  { id: 'follow_up', label: 'Follow-up', icon: '💬', description: 'Retomadas cordiais para clientes que ainda não responderam' },
  { id: 'relacionamento', label: 'Relacionamento', icon: '🤝', description: 'Foco no histórico de parceria e acompanhamento de resultados' },
  { id: 'cliente_muito_antigo', label: 'Cliente Muito Antigo', icon: '🔄', description: 'Reconexão amigável com produtores há muito tempo sem contratar' },
  { id: 'condicao_oportunidade', label: 'Condição Especial', icon: '💰', description: 'Condições comerciais e oportunidades de pacote por hectare' },
  { id: 'clientes_regiao', label: 'Clientes da Região', icon: '📍', description: 'Avisos de equipes operando nas proximidades da fazenda' },
] as const;

export const INITIAL_REACTIVATION_TEMPLATES: ReactivationMessageTemplateItem[] = [
  // ==========================================
  // 1. 🌱 REATIVAÇÃO NATURAL (4 modelos)
  // ==========================================
  {
    id: 'tpl-nat-01',
    title: 'Abordagem Leve — Programação do Mês',
    category: 'reativacao_natural',
    categoryLabel: 'Reativação Natural',
    categoryIcon: '🌱',
    tone: 'natural',
    description: 'Contato suave perguntando sobre a programação da fazenda.',
    templateText: `Olá, [Nome]! Tudo certo?

Aqui é o [Nome da empresa de drones]. Estamos organizando nosso cronograma de aplicações para os próximos dias e queria saber como está a programação aí na [Fazenda].

Se estiver precisando de algum serviço de pulverização, podemos verificar uma data boa para atender vocês!`,
    isActive: true,
  },
  {
    id: 'tpl-nat-02',
    title: 'Revisão de Histórico e Rotina',
    category: 'reativacao_natural',
    categoryLabel: 'Reativação Natural',
    categoryIcon: '🌱',
    tone: 'amigavel',
    description: 'Relembra o último serviço de forma espontânea.',
    templateText: `Oi, [Nome]! Tudo bem por aí?

Estava dando uma olhada no nosso histórico aqui e lembrei das aplicações que fizemos com vocês. Como estão as lavouras na [Fazenda]?

Precisando de apoio com pulverização por drone nas próximas semanas, conta com a gente!`,
    isActive: true,
  },
  {
    id: 'tpl-nat-03',
    title: 'Check-in Agronômico Descontraído',
    category: 'reativacao_natural',
    categoryLabel: 'Reativação Natural',
    categoryIcon: '🌱',
    tone: 'consultiva',
    description: 'Pergunta sobre o desenvolvimento da cultura sem forçar venda.',
    templateText: `Fala, [Nome]! Tudo tranquilo?

Passando só para saber como foi o desenvolvimento da área depois do último manejo. Estão planejando alguma nova entrada por esses dias?

Se precisar de drone disponível, estamos à disposição. Um abraço!`,
    isActive: true,
  },
  {
    id: 'tpl-nat-04',
    title: 'Disponibilidade de Frota na Área',
    category: 'reativacao_natural',
    categoryLabel: 'Reativação Natural',
    categoryIcon: '🌱',
    tone: 'objetiva',
    description: 'Informa disponibilidade sem compromisso.',
    templateText: `Olá, [Nome]! Tudo bem?

Estamos com equipe e drones mobilizados atendendo a região de [Região]. Lembrei de vocês aí na [Fazenda] e queria saber se têm alguma previsão de dessecação ou fungicida para os próximos dias.

Qualquer coisa me avisa por aqui!`,
    isActive: true,
  },

  // ==========================================
  // 2. 🚜 NOVA APLICAÇÃO (4 modelos)
  // ==========================================
  {
    id: 'tpl-app-01',
    title: 'Consulta de Nova Janela de Aplicação',
    category: 'nova_aplicacao',
    categoryLabel: 'Nova Aplicação',
    categoryIcon: '🚜',
    tone: 'direta',
    description: 'Pergunta direta sobre a próxima entrada de pulverização.',
    templateText: `Olá, [Nome]! Tudo bem?

Estamos mapeando as demandas de pulverização aérea para esta semana. Como está a necessidade de aplicação de [Último serviço] aí na [Fazenda]?

Podemos reservar uma janela de atendimento para vocês. Consegue me atualizar se terão área para voar?`,
    isActive: true,
  },
  {
    id: 'tpl-app-02',
    title: 'Manejo de Baixeiro e Fungicida',
    category: 'nova_aplicacao',
    categoryLabel: 'Nova Aplicação',
    categoryIcon: '🚜',
    tone: 'consultiva',
    description: 'Foco na eficiência de penetração no baixeiro sem amassar.',
    templateText: `Olá, [Nome]! Tudo certo?

Sabemos que nessa fase da lavoura a penetração no baixeiro é fundamental para segurar doenças. A pulverização com drone garante cobertura uniforme e zero amassamento na [Fazenda].

Vocês estão programando alguma entrada de fungicida ou inseticida por agora?`,
    isActive: true,
  },
  {
    id: 'tpl-app-03',
    title: 'Dessecação e Pré-Plantio sem Rastro',
    category: 'nova_aplicacao',
    categoryLabel: 'Nova Aplicação',
    categoryIcon: '🚜',
    tone: 'profissional',
    description: 'Destaque para dessecação rápida e preservação do solo.',
    templateText: `Oi, [Nome]! Tudo bem?

Estamos com drones de alta capacidade prontos para dessecação rápida, garantindo que o solo não seja compactado e sem perdas por rastro.

Tem alguma área na [Fazenda] que vai precisar dessecar nos próximos dias? Posso separar a escala para vocês.`,
    isActive: true,
  },
  {
    id: 'tpl-app-04',
    title: 'Cotação Rápida de Hectares',
    category: 'nova_aplicacao',
    categoryLabel: 'Nova Aplicação',
    categoryIcon: '🚜',
    tone: 'objetiva',
    description: 'Convite direto para orçar talhões pontuais.',
    templateText: `Olá, [Nome]! [Nome da empresa de drones] por aqui.

Tem algum talhão na [Fazenda] precisando de pulverização rápida essa semana? Se quiser me passar a metragem dos hectares, já calculo o tempo de voo e te passo a previsão de atendimento hoje mesmo!`,
    isActive: true,
  },

  // ==========================================
  // 3. 📅 ORGANIZAÇÃO DE AGENDA (4 modelos)
  // ==========================================
  {
    id: 'tpl-agd-01',
    title: 'Montagem de Rota da Semana',
    category: 'organizacao_agenda',
    categoryLabel: 'Organização de Agenda',
    categoryIcon: '📅',
    tone: 'profissional',
    description: 'Avisa sobre o fechamento da rota semanal.',
    templateText: `Olá, [Nome]! Tudo bem?

Estamos fechando a grade de voos da nossa equipe para os próximos dias na região de [Região].

Como vocês já são nossos parceiros na [Fazenda], passei para verificar se vão precisar de aplicação antes de preenchermos todos os horários. Teriam alguma área prevista?`,
    isActive: true,
  },
  {
    id: 'tpl-agd-02',
    title: 'Pré-Reserva de Data sem Compromisso',
    category: 'organizacao_agenda',
    categoryLabel: 'Organização de Agenda',
    categoryIcon: '📅',
    tone: 'amigavel',
    description: 'Oferece segurar a data na escala de voo.',
    templateText: `Oi, [Nome]! Tudo certo?

Nossa agenda para a semana que vem está quase completa, mas consigo segurar um encaixe prioritário para a [Fazenda] se vocês tiverem aplicação programada.

Qual dia ficaria melhor para fazermos a operação?`,
    isActive: true,
  },
  {
    id: 'tpl-agd-03',
    title: 'Aviso de Planejamento de Escala',
    category: 'organizacao_agenda',
    categoryLabel: 'Organização de Agenda',
    categoryIcon: '📅',
    tone: 'direta',
    description: 'Comunicação executiva sobre escala de operadores e drones.',
    templateText: `Olá, [Nome]! Aqui é da [Nome da empresa de drones].

Estamos organizando o deslocamento dos nossos operadores e drones para atender os clientes da região. Gostaria de saber se vocês têm demanda de pulverização para os próximos 10 a 15 dias para já deixarmos alinhado no nosso cronograma.`,
    isActive: true,
  },
  {
    id: 'tpl-agd-04',
    title: 'Últimas Vagas de Voo no Mês',
    category: 'organizacao_agenda',
    categoryLabel: 'Organização de Agenda',
    categoryIcon: '📅',
    tone: 'oportunidade',
    description: 'Gera senso de organização e prioridade de atendimento.',
    templateText: `Olá, [Nome]! Tudo bem?

Estamos nas últimas confirmações da escala de voos deste mês para [Região]. Passando para garantir que a [Fazenda] seja atendida no prazo ideal sem fila de espera.

Você tem alguma previsão de aplicação para alinharmos?`,
    isActive: true,
  },

  // ==========================================
  // 4. 🔥 CLIENTE PRIORITÁRIO (4 modelos)
  // ==========================================
  {
    id: 'tpl-prio-01',
    title: 'Condição Especial para Conta VIP',
    category: 'cliente_prioritario',
    categoryLabel: 'Cliente Prioritário',
    categoryIcon: '🔥',
    tone: 'profissional',
    description: 'Valoriza a recorrência e o histórico do cliente.',
    templateText: `Olá, [Nome]! Tudo bem?

Você é um dos nossos clientes mais importantes na [Nome da empresa de drones] e queremos garantir que a [Fazenda] tenha prioridade máxima na nossa frota nesta safra.

Podemos marcar uma rápida conversa para alinhar suas próximas demandas com condições exclusivas?`,
    isActive: true,
  },
  {
    id: 'tpl-prio-02',
    title: 'Parceria Recorrente — Prioridade de Frota',
    category: 'cliente_prioritario',
    categoryLabel: 'Cliente Prioritário',
    categoryIcon: '🔥',
    tone: 'relacionamento',
    description: 'Agradece a confiança e oferece escala imediata.',
    templateText: `Oi, [Nome]! Tudo certo?

Revisando nosso histórico, vimos que já realizamos [Quantidade de serviços] trabalhos juntos com ótimos resultados. Por isso, a [Fazenda] tem canal direto e preferência de data com nossa equipe.

Quando planeja a próxima entrada por aí? Estamos prontos para atender!`,
    isActive: true,
  },
  {
    id: 'tpl-prio-03',
    title: 'Reserva Exclusiva de Drone Dedicado',
    category: 'cliente_prioritario',
    categoryLabel: 'Cliente Prioritário',
    categoryIcon: '🔥',
    tone: 'consultiva',
    description: 'Oferece equipe e drone dedicados para a safra.',
    templateText: `Olá, [Nome]! Tudo bem?

Para os clientes parceiros como a [Fazenda], separamos uma modalidade de atendimento rápido, com mobilização imediata de drones no momento exato em que o talhão pedir aplicação.

Vamos alinhar a programação das próximas semanas?`,
    isActive: true,
  },
  {
    id: 'tpl-prio-04',
    title: 'Condição por Volume para Parceiro',
    category: 'cliente_prioritario',
    categoryLabel: 'Cliente Prioritário',
    categoryIcon: '🔥',
    tone: 'oportunidade',
    description: 'Proposta com desconto progressivo para pacotes de talhões.',
    templateText: `Olá, [Nome]! Tudo certo?

Estamos montando condições diferenciadas por pacote de hectares para nossos parceiros de longa data. Como já atendemos vocês na [Fazenda], preparei uma proposta bem especial para as próximas aplicações.

Posso te enviar os valores para você avaliar?`,
    isActive: true,
  },

  // ==========================================
  // 5. 🌾 PERÍODO DE SAFRA (4 modelos)
  // ==========================================
  {
    id: 'tpl-saf-01',
    title: 'Janela Crítica de Desenvolvimento',
    category: 'periodo_safra',
    categoryLabel: 'Período de Safra',
    categoryIcon: '🌾',
    tone: 'consultiva',
    description: 'Alinhamento com o estágio da cultura.',
    templateText: `Olá, [Nome]! Tudo bem?

Estamos no pico da janela de manejo da safra e sabemos como o tempo é decisivo para não perder o controle de pragas e doenças.

Como está a situação dos talhões aí na [Fazenda]? Se precisar de socorro aéreo rápido, nossos drones estão em campo na região de [Região].`,
    isActive: true,
  },
  {
    id: 'tpl-saf-02',
    title: 'Manejo Pós-Chuva / Solo Úmido',
    category: 'periodo_safra',
    categoryLabel: 'Período de Safra',
    categoryIcon: '🌾',
    tone: 'direta',
    description: 'Solução para solo encharcado onde trator não entra.',
    templateText: `Oi, [Nome]! Tudo certo?

Com as chuvas recentes, o solo pesado costuma atrasar a entrada dos tratores e a janela de aplicação não espera. Com nossos drones, conseguimos pulverizar no dia certo sem atolar e sem amassar nada na [Fazenda].

Precisando de aplicação rápida, me avisa por aqui!`,
    isActive: true,
  },
  {
    id: 'tpl-saf-03',
    title: 'Fechamento de Ciclo e Maturação',
    category: 'periodo_safra',
    categoryLabel: 'Período de Safra',
    categoryIcon: '🌾',
    tone: 'natural',
    description: 'Abordagem para fases finais da lavoura.',
    templateText: `Olá, [Nome]! Como estão as coisas na [Fazenda]?

Estamos acompanhando o fechamento de ciclo das lavouras em [Região]. Caso estejam se preparando para dessecação ou aplicações finais, podemos programar a operação com antecedência para garantir a melhor data.

Um abraço!`,
    isActive: true,
  },
  {
    id: 'tpl-saf-04',
    title: 'Prevenção de Lagarta e Percevejo',
    category: 'periodo_safra',
    categoryLabel: 'Período de Safra',
    categoryIcon: '🌾',
    tone: 'profissional',
    description: 'Alerta técnico e prontidão operacional.',
    templateText: `Olá, [Nome]! Tudo bem?

Muitos produtores da região estão relatando pressão de pragas nos últimos dias. Nossa tecnologia de pulverização por drone garante gotas no alvo certo com excelente cobertura de folhagem.

Se identificar foco aí na [Fazenda], conte conosco para uma aplicação precisa!`,
    isActive: true,
  },

  // ==========================================
  // 6. 💬 FOLLOW-UP (4 modelos)
  // ==========================================
  {
    id: 'tpl-fol-01',
    title: 'Follow-up Simples e Gentil',
    category: 'follow_up',
    categoryLabel: 'Follow-up',
    categoryIcon: '💬',
    tone: 'amigavel',
    description: 'Retomada leve para mensagens sem resposta.',
    templateText: `Olá, [Nome]! Tudo bem?

Passando só para saber se conseguiu dar uma olhada na mensagem anterior. Sei que a rotina na [Fazenda] é corrida!

Quando tiver um minutinho, me avisa se ainda faz sentido planejarmos aquela aplicação. Abraço!`,
    isActive: true,
  },
  {
    id: 'tpl-fol-02',
    title: 'Retomada de Proposta / Orçamento',
    category: 'follow_up',
    categoryLabel: 'Follow-up',
    categoryIcon: '💬',
    tone: 'direta',
    description: 'Verifica o status de proposta enviada.',
    templateText: `Oi, [Nome]! Tudo certo?

Gostaria de saber se você teve tempo de avaliar as condições que conversamos para a pulverização na [Fazenda].

Ficou alguma dúvida ou quer que ajustemos a metragem da área? Fico à disposição!`,
    isActive: true,
  },
  {
    id: 'tpl-fol-03',
    title: 'Checagem Rápida de Prioridade',
    category: 'follow_up',
    categoryLabel: 'Follow-up',
    categoryIcon: '💬',
    tone: 'objetiva',
    description: 'Pergunta se a demanda ainda está de pé.',
    templateText: `Olá, [Nome]! Tudo bem?

Só para não deixar passar: vocês ainda pretendem realizar aquela aplicação por drone ou ficou para um próximo momento?

Assim consigo organizar a alocação dos nossos equipamentos aqui. Obrigado!`,
    isActive: true,
  },
  {
    id: 'tpl-fol-04',
    title: 'Reabertura de Contato Sem Pressão',
    category: 'follow_up',
    categoryLabel: 'Follow-up',
    categoryIcon: '💬',
    tone: 'natural',
    description: 'Demonstra disponibilidade sem ser insistente.',
    templateText: `Fala, [Nome]! Tudo bem?

Imagino que o dia a dia no campo esteja puxado. Caso surja qualquer necessidade de pulverização aérea na [Fazenda], meu contato continua sempre aberto por aqui!`,
    isActive: true,
  },

  // ==========================================
  // 7. 🤝 RELACIONAMENTO (4 modelos)
  // ==========================================
  {
    id: 'tpl-rel-01',
    title: 'Acompanhamento de Parceria e Resultados',
    category: 'relacionamento',
    categoryLabel: 'Relacionamento',
    categoryIcon: '🤝',
    tone: 'relacionamento',
    description: 'Fortalece o vínculo baseado na confiança mútua.',
    templateText: `Olá, [Nome]! Tudo bem?

Aqui é o [Nome da empresa de drones]. Valorizamos muito nossa parceria e queríamos saber como estão os resultados e o manejo aí na [Fazenda].

Estamos à disposição para somar com vocês sempre que precisarem de tecnologia e precisão no campo!`,
    isActive: true,
  },
  {
    id: 'tpl-rel-02',
    title: 'Visita Técnica ou Café na Fazenda',
    category: 'relacionamento',
    categoryLabel: 'Relacionamento',
    categoryIcon: '🤝',
    tone: 'amigavel',
    description: 'Propõe um encontro presencial para troca de ideias.',
    templateText: `Oi, [Nome]! Como estão as coisas por aí?

Estaremos passando pela região de [Região] nos próximos dias. Gostaria de dar um pulo na [Fazenda] para tomar um café, ver como estão as lavouras e trocar uma ideia sobre a safra.

Qual dia seria bom para você?`,
    isActive: true,
  },
  {
    id: 'tpl-rel-03',
    title: 'Apresentação de Novidades da Frota',
    category: 'relacionamento',
    categoryLabel: 'Relacionamento',
    categoryIcon: '🤝',
    tone: 'consultiva',
    description: 'Informa melhorias e novos equipamentos para o cliente.',
    templateText: `Olá, [Nome]! Tudo certo?

Atualizamos nossos equipamentos e rotinas operacionais para entregar ainda mais rendimento por hectare e precisão na deposição de calda.

Lembramos de vocês na [Fazenda] e seria um prazer apresentar essas melhorias para suas próximas aplicações!`,
    isActive: true,
  },
  {
    id: 'tpl-rel-04',
    title: 'Agradecimento e Prontidão Contínua',
    category: 'relacionamento',
    categoryLabel: 'Relacionamento',
    categoryIcon: '🤝',
    tone: 'natural',
    description: 'Mensagem de apreço e prontidão.',
    templateText: `Olá, [Nome]! Passando para mandar um abraço e agradecer pela confiança nos trabalhos que já realizamos juntos.

Se você ou a equipe da [Fazenda] precisarem de qualquer apoio operacional com drones, estamos sempre no radar!`,
    isActive: true,
  },

  // ==========================================
  // 8. 🔄 CLIENTE MUITO ANTIGO (4 modelos)
  // ==========================================
  {
    id: 'tpl-ant-01',
    title: 'Retomada Amigável após Longo Período',
    category: 'cliente_muito_antigo',
    categoryLabel: 'Cliente Muito Antigo',
    categoryIcon: '🔄',
    tone: 'amigavel',
    description: 'Quebra o gelo com naturalidade após meses sem contato.',
    templateText: `Olá, [Nome]! Quanto tempo, tudo bem?

Estava lembrando dos serviços que fizemos com vocês na [Fazenda] e resolvi mandar uma mensagem para saber como estão as coisas por aí.

Como está o ritmo da safra atual? Continuamos atendendo firme na região de [Região] com pulverização de alta performance!`,
    isActive: true,
  },
  {
    id: 'tpl-ant-02',
    title: 'Reconexão Comercial sem Constrangimento',
    category: 'cliente_muito_antigo',
    categoryLabel: 'Cliente Muito Antigo',
    categoryIcon: '🔄',
    tone: 'natural',
    description: 'Reestabelece a comunicação de forma profissional.',
    templateText: `Oi, [Nome]! Tudo bem? Aqui é da [Nome da empresa de drones].

Faz algum tempo que não nos falamos, mas gostaríamos de reestabelecer o contato e saber se a [Fazenda] tem alguma demanda de pulverização prevista para as próximas semanas.

Seria ótimo voltarmos a trabalhar juntos!`,
    isActive: true,
  },
  {
    id: 'tpl-ant-03',
    title: 'Novas Condições para Reativação',
    category: 'cliente_muito_antigo',
    categoryLabel: 'Cliente Muito Antigo',
    categoryIcon: '🔄',
    tone: 'oportunidade',
    description: 'Oferece condição especial de boas-vindas para retorno.',
    templateText: `Olá, [Nome]! Tudo certo?

Estamos revisitando produtores que já foram nossos parceiros e queremos muito ter a [Fazenda] de volta na nossa escala de atendimento.

Preparamos uma condição muito atrativa para novas áreas. Você teria interesse em receber uma cotação atualizada?`,
    isActive: true,
  },
  {
    id: 'tpl-ant-04',
    title: 'Demonstração de Nova Tecnologia em Campo',
    category: 'cliente_muito_antigo',
    categoryLabel: 'Cliente Muito Antigo',
    categoryIcon: '🔄',
    tone: 'consultiva',
    description: 'Convida para ver os novos drones em ação.',
    templateText: `Olá, [Nome]! Tudo bem?

Desde nosso último trabalho na [Fazenda], nossa operação evoluiu bastante em velocidade de voo e cobertura de gota.

Gostaria de propor uma aplicação teste ou uma nova rodada de serviço para vocês conferirem na prática. O que acha?`,
    isActive: true,
  },

  // ==========================================
  // 9. 💰 CONDIÇÃO/OPORTUNIDADE (4 modelos)
  // ==========================================
  {
    id: 'tpl-opp-01',
    title: 'Pacote Fechado por Hectare',
    category: 'condicao_oportunidade',
    categoryLabel: 'Condição Especial',
    categoryIcon: '💰',
    tone: 'oportunidade',
    description: 'Vantagem comercial para fechamento antecipado.',
    templateText: `Olá, [Nome]! Tudo bem?

Abrimos uma condição especial de pré-reserva para blocos de aplicação em [Região]. Clientes que programam suas áreas com antecedência garantem desconto exclusivo por hectare e trava de agenda.

Gostaria de simular essa condição para os talhões da [Fazenda]?`,
    isActive: true,
  },
  {
    id: 'tpl-opp-02',
    title: 'Isenção de Deslocamento em Rota',
    category: 'condicao_oportunidade',
    categoryLabel: 'Condição Especial',
    categoryIcon: '💰',
    tone: 'direta',
    description: 'Aproveitamento de frete/deslocamento já na região.',
    templateText: `Oi, [Nome]! Tudo certo?

Nossa equipe vai operar pertinho da [Fazenda] nos próximos dias. Como já estaremos com a estrutura montada no local, conseguimos isentar os custos de deslocamento para qualquer aplicação que vocês fizerem conosco nessa rota.

Tem alguma área precisando de voo?`,
    isActive: true,
  },
  {
    id: 'tpl-opp-03',
    title: 'Condição de Safra Cheia',
    category: 'condicao_oportunidade',
    categoryLabel: 'Condição Especial',
    categoryIcon: '💰',
    tone: 'profissional',
    description: 'Proposta para pacote completo de dessecação e fungicida.',
    templateText: `Olá, [Nome]! [Nome da empresa de drones] por aqui.

Estamos formatando pacotes completos de manejo (dessecação + aplicações foliares) com valores bem competitivos para a [Fazenda].

Podemos fazer uma conta rápida de economia para a sua área total?`,
    isActive: true,
  },
  {
    id: 'tpl-opp-04',
    title: 'Oportunidade para Talhões Pontuais',
    category: 'condicao_oportunidade',
    categoryLabel: 'Condição Especial',
    categoryIcon: '💰',
    tone: 'objetiva',
    description: 'Flexibilidade para áreas menores ou de difícil acesso.',
    templateText: `Olá, [Nome]! Tudo bem?

Se você tiver talhões com curvas de nível, áreas perto de matas ou partes onde as máquinas pesadas não operam com facilidade, temos condições muito práticas para pulverizar essas áreas pontuais.

Me passa a localização que calculamos rapidinho!`,
    isActive: true,
  },

  // ==========================================
  // 10. 📍 CLIENTES DA REGIÃO (4 modelos)
  // ==========================================
  {
    id: 'tpl-reg-01',
    title: 'Equipe em Operação na Sua Região',
    category: 'clientes_regiao',
    categoryLabel: 'Clientes da Região',
    categoryIcon: '📍',
    tone: 'direta',
    description: 'Informa presença física próxima para facilitar contratação.',
    templateText: `Olá, [Nome]! Tudo bem?

Nossa equipe da [Nome da empresa de drones] está hoje com drones em operação aí na região de [Região].

Como já estamos com o caminhão e geradores próximos da [Fazenda], conseguimos atender vocês com muita agilidade e sem taxa extra de deslocamento. Vocês teriam alguma aplicação para hoje ou amanhã?`,
    isActive: true,
  },
  {
    id: 'tpl-reg-02',
    title: 'Passagem Programada pelo Município',
    category: 'clientes_regiao',
    categoryLabel: 'Clientes da Região',
    categoryIcon: '📍',
    tone: 'amigavel',
    description: 'Convida para incluir a fazenda na rota de atendimento.',
    templateText: `Oi, [Nome]! Tudo certo?

Estaremos rodando fazendas vizinhas em [Região] durante esta semana. Queria checar com você se encaixamos a [Fazenda] na mesma passada para aproveitar a logística da equipe.

O que acha de alinharmos os talhões?`,
    isActive: true,
  },
  {
    id: 'tpl-reg-03',
    title: 'Ponto de Apoio Mobilizado Próximo',
    category: 'clientes_regiao',
    categoryLabel: 'Clientes da Região',
    categoryIcon: '📍',
    tone: 'objetiva',
    description: 'Destaca a rapidez de início do serviço.',
    templateText: `Olá, [Nome]! Tudo bem?

Montamos nossa base de recarga rápida bem perto da sua localização. Conseguimos iniciar aplicações na [Fazenda] em menos de 24 horas caso precisem de pulverização urgente.

Fico no aguardo se tiver demanda!`,
    isActive: true,
  },
  {
    id: 'tpl-reg-04',
    title: 'Atendimento Conjunto na Comunidade',
    category: 'clientes_regiao',
    categoryLabel: 'Clientes da Região',
    categoryIcon: '📍',
    tone: 'relacionamento',
    description: 'Comunica o volume de operações no polo agrícola.',
    templateText: `Olá, [Nome]! Aqui é da [Nome da empresa de drones].

Estamos finalizando um grande bloco de áreas em [Região] e queríamos estender essa mesma condição operacional para a [Fazenda].

Podemos checar sua previsão de pulverização para os próximos dias?`,
    isActive: true,
  },
];

// Alias export for backwards compatibility
export const REACTIVATION_TEMPLATES = INITIAL_REACTIVATION_TEMPLATES;

