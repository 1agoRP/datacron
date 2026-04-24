'use client';

import React from 'react';
import Link from 'next/link';
import '@/styles/legal.css';

export default function PrivacyPolicy() {
  return (
    <div className="legal-container">
      <nav className="legal-nav">
        <Link href="/" className="nav-logo">DATA<span>CRON</span></Link>
        <Link href="/" className="nav-back">← Voltar ao site</Link>
      </nav>

      <div className="doc-hero">
        <div className="doc-label">Documentos Legais</div>
        <h1 className="doc-title">Política de Privacidade</h1>
        <p className="doc-meta">Última atualização: Janeiro de 2026 &nbsp;·&nbsp; Versão 1.0</p>
      </div>

      <div className="doc-layout">
        <aside className="doc-nav">
          <div className="doc-nav-title">Sumário</div>
          <ul>
            <li><a href="#intro">Introdução</a></li>
            <li><a href="#controlador">1. Controlador dos Dados</a></li>
            <li><a href="#dados">2. Dados que Coletamos</a></li>
            <li><a href="#finalidades">3. Finalidades do Tratamento</a></li>
            <li><a href="#bases">4. Bases Legais</a></li>
            <li><a href="#compartilhamento">5. Compartilhamento</a></li>
            <li><a href="#armazenamento">6. Armazenamento e Retenção</a></li>
            <li><a href="#seguranca">7. Segurança</a></li>
            <li><a href="#direitos">8. Seus Direitos (LGPD)</a></li>
            <li><a href="#cookies">9. Cookies</a></li>
            <li><a href="#internacional">10. Transferência Internacional</a></li>
            <li><a href="#alteracoes">11. Alterações</a></li>
            <li><a href="#contato-dpo">12. Contato</a></li>
          </ul>
        </aside>

        <main className="doc-content">
          <div id="intro">
            <div className="highlight-box">
              <p>O <strong>Datacron</strong> está comprometido com a privacidade e a proteção dos seus dados pessoais. Esta Política explica, de forma transparente, como coletamos, utilizamos, armazenamos e protegemos suas informações, em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD · Lei nº 13.709/2018)</strong>.</p>
            </div>
            <p>Ao utilizar a plataforma Datacron, você declara ter lido, compreendido e concordado com os termos desta Política. Caso não concorde, por favor, não utilize nossos serviços.</p>
          </div>

          <h2 id="controlador">1. Controlador dos Dados</h2>
          <p>O controlador responsável pelo tratamento das informações coletadas por meio da plataforma Datacron é a empresa responsável pelo serviço, com sede no Brasil, acessível em <strong>www.datacron.com.br</strong>.</p>
          <p>Para dúvidas relacionadas ao tratamento de dados, entre em contato pelo e-mail: <strong>privacidade@datacron.com.br</strong></p>

          <h2 id="dados">2. Dados que Coletamos</h2>

          <h3>2.1 Dados fornecidos diretamente pelo usuário</h3>
          <ul>
            <li>Nome completo do responsável e da administradora</li>
            <li>Endereço de e-mail</li>
            <li>Telefone e WhatsApp</li>
            <li>CNPJ da administradora e dos condomínios cadastrados</li>
            <li>Credenciais de acesso às caixas de e-mail (armazenadas com criptografia)</li>
            <li>Informações inseridas em formulários de contato ou configuração</li>
          </ul>

          <h3>2.2 Dados coletados automaticamente pela plataforma</h3>
          <ul>
            <li>Endereço IP e informações de dispositivo de acesso</li>
            <li>Dados de navegação e uso do sistema (logs de operação)</li>
            <li>Informações extraídas das faturas processadas (valores, vencimentos, instalações, consumos)</li>
            <li>Metadados dos e-mails monitorados (remetente, data, assunto)</li>
            <li>Cookies e tecnologias similares de sessão</li>
          </ul>

          <h3>2.3 Dados de terceiros</h3>
          <p>O Datacron pode receber dados contidos em faturas de concessionárias de serviços públicos (energia elétrica, água, gás) enviadas para as caixas de e-mail monitoradas, no âmbito da prestação do serviço contratado.</p>

          <h2 id="finalidades">3. Finalidades do Tratamento</h2>
          <p>Os dados pessoais são utilizados exclusivamente para:</p>
          <ul>
            <li>Criação, validação e manutenção da conta do usuário</li>
            <li>Operação das funcionalidades de monitoramento, extração OCR e processamento de faturas</li>
            <li>Geração de alertas, relatórios e exportações no âmbito do serviço contratado</li>
            <li>Envio de notificações operacionais e avisos relevantes ao serviço</li>
            <li>Melhoria contínua da plataforma e de suas funcionalidades</li>
            <li>Suporte técnico e atendimento ao cliente</li>
            <li>Cumprimento de obrigações legais e regulatórias</li>
            <li>Prevenção de fraudes e garantia da segurança da plataforma</li>
          </ul>
          <div className="warning-box">
            <p><strong>Importante:</strong> O Datacron <strong>não utiliza os dados das suas faturas para nenhuma finalidade além da prestação do serviço contratado</strong>. Informações de consumo, valores e CNPJs são tratados de forma estritamente confidencial.</p>
          </div>

          <h2 id="bases">4. Bases Legais Utilizadas</h2>
          <p>O tratamento de dados pessoais pelo Datacron é realizado com fundamento nas bases legais previstas na LGPD:</p>
          <ul>
            <li><strong>Execução de contrato</strong> — para operar as funcionalidades contratadas</li>
            <li><strong>Cumprimento de obrigação legal</strong> — para atender exigências regulatórias</li>
            <li><strong>Legítimo interesse do controlador</strong> — para aprimoramento e segurança da plataforma, sempre respeitando direitos e liberdades do titular</li>
            <li><strong>Consentimento</strong> — quando aplicável, como para comunicações de marketing</li>
          </ul>

          <h2 id="compartilhamento">5. Compartilhamento de Dados</h2>
          <p>O Datacron poderá compartilhar dados pessoais apenas com:</p>
          <ul>
            <li><strong>Provedores de infraestrutura tecnológica</strong> (hospedagem, banco de dados, processamento em nuvem), sob contrato de confidencialidade</li>
            <li><strong>Ferramentas de suporte e comunicação</strong> utilizadas internamente pela equipe Datacron</li>
            <li><strong>Autoridades públicas e judiciais</strong>, exclusivamente quando exigido por lei ou determinação judicial</li>
          </ul>
          <div className="highlight-box">
            <p><strong>Em nenhuma hipótese o Datacron vende, aluga ou comercializa dados pessoais ou informações de faturas dos seus usuários.</strong></p>
          </div>

          <h2 id="armazenamento">6. Armazenamento e Retenção</h2>
          <p>Os dados são armazenados em servidores seguros, com criptografia em repouso, e mantidos pelo prazo necessário para:</p>
          <ul>
            <li>Cumprimento das finalidades descritas nesta Política</li>
            <li>Atendimento a obrigações legais e fiscais</li>
            <li>Preservação de direitos do controlador em eventuais disputas</li>
          </ul>
          <p>Após o encerramento do contrato, os dados operacionais serão mantidos por até 5 (cinco) anos, conforme exigências legais, e então excluídos ou anonimizados de forma segura.</p>

          <h2 id="seguranca">7. Segurança da Informação</h2>
          <p>O Datacron adota medidas técnicas e administrativas para proteger os dados pessoais, incluindo:</p>
          <ul>
            <li>Criptografia de dados em repouso e em trânsito (TLS/SSL)</li>
            <li>Controle de acesso baseado em perfis de usuário com autenticação segura</li>
            <li>Armazenamento de credenciais de e-mail com criptografia de ponta</li>
            <li>Monitoramento contínuo de acessos e registros de auditoria</li>
            <li>Backups automáticos com redundância geográfica</li>
          </ul>
          <p>Entretanto, nenhum sistema é completamente inviolável. Em caso de incidente de segurança que afete dados pessoais, o Datacron notificará os usuários afetados e a ANPD conforme exigido pela LGPD.</p>

          <h2 id="direitos">8. Seus Direitos (LGPD)</h2>
          <p>Nos termos da Lei Geral de Proteção de Dados, você possui os seguintes direitos em relação aos seus dados pessoais:</p>
          <ul>
            <li><strong>Confirmação</strong> da existência de tratamento de dados</li>
            <li><strong>Acesso</strong> aos dados pessoais tratados</li>
            <li><strong>Correção</strong> de dados incompletos, inexatos ou desatualizados</li>
            <li><strong>Anonimização, bloqueio ou eliminação</strong> de dados desnecessários ou excessivos</li>
            <li><strong>Portabilidade</strong> dos dados a outro fornecedor de serviço</li>
            <li><strong>Eliminação</strong> dos dados tratados com base no consentimento</li>
            <li><strong>Informação</strong> sobre compartilhamento com terceiros</li>
            <li><strong>Revogação do consentimento</strong> a qualquer tempo</li>
          </ul>
          <p>Para exercer qualquer um desses direitos, entre em contato pelo e-mail <strong>privacidade@datacron.com.br</strong>. Responderemos em até 15 (quinze) dias úteis.</p>

          <h2 id="cookies">9. Cookies e Tecnologias de Rastreamento</h2>
          <p>O Datacron utiliza cookies e identificadores de sessão para:</p>
          <ul>
            <li>Manter a sessão autenticada do usuário</li>
            <li>Lembrar preferências de configuração da plataforma</li>
            <li>Analisar o uso e desempenho da plataforma</li>
          </ul>
          <p>Você pode gerenciar ou bloquear cookies nas configurações do seu navegador. Algumas funcionalidades da plataforma podem ser afetadas caso os cookies sejam desativados.</p>

          <h2 id="internacional">10. Transferência Internacional de Dados</h2>
          <p>Os dados podem ser armazenados ou processados em servidores fora do Brasil (por exemplo, em provedores de nuvem com infraestrutura nos EUA ou Europa). Quando isso ocorrer, o Datacron garante que os padrões adequados de proteção de dados são observados, em conformidade com a LGPD e as diretrizes da ANPD.</p>

          <h2 id="alteracoes">11. Alterações a Esta Política</h2>
          <p>O Datacron pode atualizar esta Política de Privacidade a qualquer momento para refletir mudanças legais, técnicas ou operacionais. Alterações relevante serão comunicadas ao usuário por meio da plataforma ou por e-mail com pelo menos 15 (quinze) dias de antecedência.</p>
          <p>A continuidade do uso da plataforma após a data de vigência das novas regras será interpretada como concordância com as alterações.</p>

          <h2 id="contato-dpo">12. Contato e Encarregado de Dados (DPO)</h2>
          <div className="contact-box">
            <h3>Dúvidas ou Solicitações sobre seus Dados?</h3>
            <p>Entre em contato com nosso time de privacidade. Respondemos todas as solicitações dentro do prazo legal.</p>
            <a href="mailto:privacidade@datacron.com.br">privacidade@datacron.com.br</a>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text3)' }}>Ou acesse: <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>www.datacron.com.br</Link></p>
          </div>
        </main>
      </div>

      <footer className="legal-footer">
        <span>© 2026 Datacron RPA · Todos os direitos reservados.</span>
        <div className="footer-links">
          <Link href="/">Início</Link>
          <Link href="/politica-de-privacidade">Política de Privacidade</Link>
          <Link href="/termos-de-uso">Termos de Uso</Link>
        </div>
      </footer>
    </div>
  );
}
