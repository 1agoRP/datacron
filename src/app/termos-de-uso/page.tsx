import { FoxLegalDocument, type LegalSection } from '@/components/legal/FoxLegalDocument';

export default function TermsOfUse() {
  const sections: LegalSection[] = [
    {
      title: 'Aceitação dos termos',
      content: 'Ao acessar e utilizar a plataforma FOX, você concorda em cumprir estes Termos de Uso. Caso não concorde com qualquer condição aqui descrita, não utilize o sistema.',
    },
    {
      title: 'Descrição do serviço',
      content: 'A FOX fornece uma solução para recebimento, leitura, organização, validação e acompanhamento de faturas, contratos, alertas, relatórios e rotinas operacionais relacionadas à gestão financeira e condominial.',
    },
    {
      title: 'Responsabilidades do usuário',
      content: 'O usuário é responsável por manter o uso adequado da plataforma e das informações inseridas no sistema:',
      list: [
        'Fornecer dados cadastrais verdadeiros, completos e atualizados.',
        'Manter sigilo de credenciais, senhas e acessos concedidos.',
        'Garantir que possui autorização para cadastrar, consultar e processar os dados inseridos.',
        'Utilizar a plataforma em conformidade com leis brasileiras, contratos e políticas internas aplicáveis.',
      ],
    },
    {
      title: 'Uso permitido',
      content: 'A FOX deve ser utilizada exclusivamente para finalidades lícitas, profissionais e compatíveis com a operação contratada. É proibido tentar acessar áreas não autorizadas, interferir no funcionamento da plataforma, explorar falhas, copiar indevidamente componentes ou utilizar o sistema para atividades ilícitas.',
    },
    {
      title: 'Precisão das informações',
      content: 'A plataforma automatiza etapas de leitura, organização e validação, mas o usuário deve revisar informações críticas antes de tomar decisões financeiras, realizar pagamentos, aprovar lançamentos ou executar ações externas ao sistema.',
      note: 'Alertas, relatórios e indicadores existem para apoiar a decisão operacional, não para substituir a conferência responsável quando houver exceções relevantes.',
    },
    {
      title: 'Disponibilidade e suporte',
      content: 'Empregamos esforços razoáveis para manter a plataforma disponível e funcional. Ainda assim, podem ocorrer interrupções por manutenção, instabilidade de provedores, falhas de conexão, indisponibilidade de terceiros ou eventos fora do controle da FOX.',
    },
    {
      title: 'Propriedade intelectual',
      content: 'A marca FOX, o software, a interface, os fluxos, os algoritmos, a documentação e demais elementos da plataforma são protegidos por direitos de propriedade intelectual. Nenhuma licença de uso implica cessão, venda ou transferência desses direitos.',
    },
    {
      title: 'Proteção de dados',
      content: 'O tratamento de dados pessoais relacionado ao uso da plataforma segue a Política de Privacidade da FOX e a legislação aplicável, incluindo a Lei Geral de Proteção de Dados.',
    },
    {
      title: 'Alterações dos termos',
      content: 'A FOX poderá atualizar estes Termos de Uso para refletir mudanças legais, técnicas, comerciais ou operacionais. Alterações relevantes serão comunicadas por canais apropriados, quando exigido ou recomendável.',
    },
    {
      title: 'Foro',
      content: 'Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro competente conforme contrato aplicável ou, na ausência de disposição específica, o foro da comarca de São Paulo/SP.',
    },
  ];

  return (
    <FoxLegalDocument
      eyebrow="Termos legais"
      title={<>Termos de <em>Uso</em></>}
      updatedAt="28 de maio de 2026"
      sections={sections}
      alternateHref="/politica-de-privacidade"
      alternateLabel="Política de privacidade"
    />
  );
}
