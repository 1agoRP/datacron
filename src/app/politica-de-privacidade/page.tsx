import { FoxLegalDocument, type LegalSection } from '@/components/legal/FoxLegalDocument';

export default function PrivacyPolicy() {
  const sections: LegalSection[] = [
    {
      title: 'Introdução',
      content: 'A FOX está comprometida em proteger sua privacidade. Esta Política de Privacidade explica como coletamos, usamos e protegemos informações quando você utiliza nossa plataforma de recebimento, leitura e controle automatizado de faturas.',
    },
    {
      title: 'Informações que coletamos',
      content: 'Coletamos apenas as informações necessárias para a prestação dos serviços contratados:',
      list: [
        <><strong>Dados de acesso:</strong> credenciais e configurações necessárias para autenticação e operação do sistema.</>,
        <><strong>Dados de faturas:</strong> valores, consumos, códigos de barras, vencimentos e demais informações extraídas dos documentos processados.</>,
        <><strong>Dados cadastrais:</strong> CNPJ, razão social, dados de condomínios, fornecedores, concessionárias, contratos e contatos de usuários autorizados.</>,
      ],
    },
    {
      title: 'Uso das informações',
      content: 'Utilizamos os dados coletados exclusivamente para operar, melhorar e dar suporte à plataforma FOX:',
      list: [
        'Automatizar recebimento, leitura, organização e validação de faturas.',
        'Gerar alertas de variação, não recebimento, duplicidade ou inconsistência.',
        'Disponibilizar dashboards, relatórios, auditoria e histórico operacional.',
        'Prestar suporte técnico, corrigir falhas e aprimorar a precisão dos processos automatizados.',
      ],
    },
    {
      title: 'Segurança dos dados',
      content: 'Adotamos medidas técnicas e organizacionais para proteger os dados tratados na plataforma:',
      list: [
        'Controle de acesso por credenciais e perfis de usuário.',
        'Registro de eventos relevantes para auditoria e rastreabilidade.',
        'Proteção das comunicações e armazenamento seguro das informações operacionais.',
        'Acesso restrito a pessoas autorizadas e conforme necessidade de suporte ou operação.',
      ],
      note: 'A FOX foi desenhada para manter evidências de operação, apoiar auditorias e reduzir exposição desnecessária de dados sensíveis.',
    },
    {
      title: 'Compartilhamento com terceiros',
      content: 'Não vendemos nem alugamos dados pessoais. O compartilhamento pode ocorrer apenas com provedores necessários para infraestrutura, hospedagem, suporte técnico, integração ou cumprimento de obrigação legal, sempre observando requisitos de segurança e confidencialidade.',
    },
    {
      title: 'Direitos dos titulares',
      content: 'Nos termos da Lei Geral de Proteção de Dados, você pode solicitar:',
      list: [
        'Confirmação da existência de tratamento de dados pessoais.',
        'Acesso, correção ou atualização de dados incompletos, inexatos ou desatualizados.',
        'Exclusão, anonimização ou bloqueio de dados desnecessários ou tratados em desconformidade.',
        'Informações sobre compartilhamento e critérios de tratamento.',
        'Revogação de consentimento, quando aplicável.',
      ],
    },
    {
      title: 'Retenção e exclusão',
      content: 'Mantemos dados pelo período necessário para execução dos serviços, cumprimento de obrigações legais, auditoria, prevenção a fraudes, resolução de conflitos e preservação de direitos. Solicitações de exclusão serão analisadas conforme a legislação aplicável e obrigações contratuais.',
    },
    {
      title: 'Contato',
      content: (
        <>
          Para exercer direitos, esclarecer dúvidas ou tratar de assuntos de privacidade, entre em contato pelo e-mail <a href="mailto:privacidade@fox.com.br">privacidade@fox.com.br</a>.
        </>
      ),
    },
  ];

  return (
    <FoxLegalDocument
      eyebrow="Privacidade e dados"
      title={<>Política de <em>Privacidade</em></>}
      updatedAt="28 de maio de 2026"
      badge="Em conformidade com a LGPD"
      sections={sections}
      alternateHref="/termos-de-uso"
      alternateLabel="Termos de uso"
    />
  );
}
