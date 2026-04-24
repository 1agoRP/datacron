'use client';

import React from 'react';
import Link from 'next/link';
import '@/styles/legal.css';

export default function TermsOfUse() {
  return (
    <div className="legal-container">
      <nav className="legal-nav">
        <Link href="/" className="nav-logo">DATA<span>CRON</span></Link>
        <Link href="/" className="nav-back">← Voltar ao site</Link>
      </nav>

      <div className="doc-hero">
        <div className="doc-label">Documentos Legais</div>
        <h1 className="doc-title">Termos de Uso</h1>
        <p className="doc-meta">Última atualização: Janeiro de 2026 &nbsp;·&nbsp; Versão 1.0</p>
      </div>

      <div className="doc-layout">
        <aside className="doc-nav">
          <div className="doc-nav-title">Sumário</div>
          <ul>
            <li><a href="#intro">Introdução</a></li>
            <li><a href="#definicoes">1. Definições</a></li>
            <li><a href="#aceite">2. Aceite e Modificações</a></li>
            <li><a href="#cadastro">3. Cadastro do Usuário</a></li>
            <li><a href="#funcionalidades">4. Funcionalidades</a></li>
            <li><a href="#responsabilidades">5. Responsabilidades do Usuário</a></li>
            <li><a href="#responsabilidades-dc">6. Responsabilidades do Datacron</a></li>
            <li><a href="#relacao">7. Relação com Concessionárias</a></li>
            <li><a href="#propriedade">8. Propriedade Intelectual</a></li>
            <li><a href="#limitacao">9. Limitação de Responsabilidade</a></li>
            <li><a href="#seguranca">10. Segurança e Credenciais</a></li>
            <li><a href="#dados">11. Tratamento de Dados</a></li>
            <li><a href="#cancelamento">12. Cancelamento</a></li>
            <li><a href="#suporte">13. Suporte</a></li>
            <li><a href="#legislacao">14. Legislação e Foro</a></li>
            <li><a href="#disposicoes">15. Disposições Finais</a></li>
          </ul>
        </aside>

        <main className="doc-content">
          <div id="intro">
            <div className="highlight-box">
              <p>Bem-vindo ao <strong>Datacron</strong>. Estes Termos de Uso regulam o acesso e a utilização da plataforma de automação de gestão de faturas de concessionárias para administradoras de condomínio. Ao utilizar o Datacron, você declara ter lido, compreendido e concordado integralmente com estes Termos.</p>
            </div>
            <div className="danger-box">
              <p><strong>Atenção:</strong> Caso não concorde com qualquer condição aqui prevista, não utilize a plataforma.</p>
            </div>
          </div>

          <h2 id="definicoes">1. Definições</h2>
          <p>Para fins destes Termos:</p>
          <ul>
            <li><strong>Datacron</strong> — Plataforma de automação RPA para monitoramento, extração, processamento e análise de faturas de concessionárias de serviços públicos destinadas a condomínios.</li>
            <li><strong>Usuário</strong> — Toda pessoa física ou jurídica (administradora, síndico ou gestor) que acessa ou utiliza a plataforma Datacron.</li>
            <li><strong>Administradora</strong> — Empresa contratante responsável pela gestão dos condomínios cadastrados na plataforma.</li>
            <li><strong>Condomínio</strong> — Empreendimento residencial ou comercial cadastrado pelo usuário para fins de monitoramento de faturas.</li>
            <li><strong>Concessionária</strong> — Empresa prestadora de serviços públicos (energia elétrica, água, gás, entre outros) cujas faturas são processadas pelo Datacron.</li>
            <li><strong>Fatura</strong> — Documento de cobrança emitido pela concessionária, em formato PDF, recebido por e-mail e processado automaticamente pela plataforma.</li>
            <li><strong>Agente RPA</strong> — Componente automatizado do Datacron responsável pelo monitoramento de caixas de e-mail, extração OCR e auditoria de faturas.</li>
          </ul>

          <h2 id="aceite">2. Aceite e Modificações</h2>
          <p>O uso do Datacron implica aceitação plena e irrestrita destes Termos, que podem ser alterados a qualquer momento para refletir mudanças na legislação, na plataforma ou nas condições comerciais.</p>
          <p>Alterações relevantes serão comunicadas com pelo menos 15 (quinze) dias de antecedência por e-mail ou notificação na plataforma. A continuidade do uso após a vigência das novas regras implica concordância com as mesmas.</p>

          <h2 id="cadastro">3. Cadastro do Usuário</h2>
          <p>Para acessar as funcionalidades do Datacron, o usuário deve realizar um cadastro fornecendo informações verdadeiras, completas e atualizadas. O usuário:</p>
          <ul>
            <li>É responsável pela veracidade e atualização dos dados informados</li>
            <li>Deve manter suas credenciais de acesso (login e senha) em sigilo absoluto</li>
            <li>Assume integral responsabilidade por atividades realizadas sob sua conta</li>
            <li>Deve notificar imediatamente o Datacron em caso de uso não autorizado de sua conta</li>
          </ul>
          <p>O Datacron poderá, a seu critério, recusar ou cancelar cadastros que violem estes Termos ou representem risco à plataforma ou a outros usuários.</p>

          <h2 id="funcionalidades">4. Funcionalidades da Plataforma</h2>
          <p>O Datacron oferece, sem limitação:</p>
          <ul>
            <li>Monitoramento automatizado de caixas de e-mail (IMAP/POP3) com varredura periódica</li>
            <li>Reconhecimento e captura automática de faturas de concessionárias</li>
            <li>Desbloqueio automático de PDFs protegidos por senha</li>
            <li>Extração OCR de campos críticos: instalação, valor, vencimento e código de barras</li>
            <li>Categorização e armazenamento estruturado em banco de dados</li>
            <li>Análise de variações de consumo e geração de alertas inteligentes</li>
            <li>Notificações em caso de não recebimento de faturas nas datas previstas</li>
            <li>Dashboard em tempo real e geração de relatórios</li>
            <li>Exportação em XLSX/CSV e integração via API REST</li>
          </ul>
          <p>O Datacron poderá alterar, incluir ou remover funcionalidades a seu critério, comunicando os usuários com razoável antecedência quando as mudanças forem relevantes.</p>

          <h2 id="responsabilidades">5. Responsabilidades do Usuário</h2>
          <p>Ao utilizar o Datacron, o usuário se compromete a:</p>
          <ul>
            <li>Utilizar a plataforma em conformidade com a legislação vigente e estes Termos</li>
            <li>Fornecer credenciais de e-mail apenas de caixas postais que possui autorização legal para monitorar</li>
            <li>Não utilizar a plataforma para fins ilícitos ou que violem direitos de terceiros</li>
            <li>Não tentar acessar sistemas ou dados além do escopo contratado</li>
            <li>Não realizar engenharia reversa, descompilar ou modificar a plataforma</li>
            <li>Manter atualizadas as configurações de calendário para correto funcionamento dos alertas</li>
            <li>Não inserir conteúdos falsos, ofensivos ou que violem direitos de terceiros</li>
          </ul>
          <div className="danger-box">
            <p><strong>Atenção:</strong> O descumprimento destas obrigações poderá resultar em suspensão ou encerramento imediato da conta, sem direito a reembolso proporcional, além de responsabilização civil e criminal cabível.</p>
          </div>

          <h2 id="responsabilidades-dc">6. Responsabilidades do Datacron</h2>
          <p>O Datacron se compromete a:</p>
          <ul>
            <li>Manter a plataforma disponível e funcional, conforme o SLA contratado</li>
            <li>Processar as faturas com o nível de precisão informado e aprimorar continuamente os modelos</li>
            <li>Proteger os dados do usuário conforme a Política de Privacidade e a LGPD</li>
            <li>Corrigir falhas e erros identificados no menor prazo possível</li>
            <li>Comunicar incidentes de segurança que possam afetar os usuários</li>
          </ul>
          <p>O Datacron <strong>não se responsabiliza</strong> por:</p>
          <ul>
            <li>Falhas, erros ou atrasos nos e-mails enviados pelas concessionárias</li>
            <li>Indisponibilidades causadas por terceiros (provedores de e-mail, concessionárias, infraestrutura de nuvem)</li>
            <li>Decisões tomadas pelo usuário com base nos dados e alertas gerados pela plataforma</li>
            <li>Informações incorretas inseridas pelo usuário no cadastro de condomínios ou configurações</li>
            <li>Perdas decorrentes de interrupções programadas de manutenção, com aviso prévio</li>
          </ul>

          <h2 id="relacao">7. Relação com Concessionárias</h2>
          <p>O Datacron atua como uma ferramenta tecnológica de automação e <strong>não possui qualquer relação comercial, contratual ou jurídica com as concessionárias de serviços públicos</strong> cujas faturas são processadas.</p>
          <p>A plataforma:</p>
          <ul>
            <li>Apenas processa documentos recebidos nos e-mails autorizados pelo usuário</li>
            <li>Não realiza pagamentos, negociações ou contato com as concessionárias em nome do usuário</li>
            <li>Não é responsável por eventuais cobranças indevidas, erros de faturamento ou disputas com concessionárias</li>
            <li>Não garante a conformidade ou autenticidade das faturas recebidas</li>
          </ul>
          <p>Eventuais conflitos com concessionárias devem ser tratados diretamente pelo usuário com a empresa responsável.</p>

          <h2 id="propriedade">8. Propriedade Intelectual</h2>
          <p>Todos os elementos da plataforma Datacron — incluindo código-fonte, algoritmos de OCR e RPA, modelos de inteligência artificial, interfaces, logotipos, textos, banco de dados e marca — são de propriedade exclusiva do Datacron ou licenciados adequadamente.</p>
          <p>É expressamente proibido:</p>
          <ul>
            <li>Copiar, reproduzir ou redistribuir qualquer componente da plataforma</li>
            <li>Realizar engenharia reversa dos algoritmos e modelos</li>
            <li>Criar produtos ou serviços derivados sem autorização expressa por escrito</li>
            <li>Utilizar a marca Datacron sem prévia autorização</li>
          </ul>
          <div className="warning-box">
            <p><strong>Aviso:</strong> A violação de direitos de propriedade intelectual poderá gerar responsabilidade civil e criminal, conforme a legislação brasileira.</p>
          </div>

          <h2 id="limitacao">9. Limitação de Responsabilidade</h2>
          <p>Na máxima extensão permitida pela legislação aplicável, o Datacron não será responsável por:</p>
          <ul>
            <li>Danos indiretos, incidentais ou consequenciais decorrentes do uso da plataforma</li>
            <li>Lucros cessantes ou perda de oportunidades de negócio</li>
            <li>Erros de leitura OCR em faturas com qualidade gráfica abaixo do mínimo necessário</li>
            <li>Falhas em alertas decorrentes de configurações incorretas pelo usuário</li>
            <li>Dados não processados em decorrência de alterações nos formatos de fatura das concessionárias</li>
          </ul>
          <p>Em nenhuma hipótese a responsabilidade total do Datacron excederá o valor pago pelo usuário nos últimos 3 (três) meses de serviço.</p>

          <h2 id="seguranca">10. Segurança e Credenciais de E-mail</h2>
          <p>Para o funcionamento do serviço, o usuário fornecerá credenciais de acesso às caixas de e-mail monitoradas. O usuário declara e garante que:</p>
          <ul>
            <li>Possui plena autorização para compartilhar essas credenciais com a plataforma</li>
            <li>As caixas de e-mail são de titularidade ou estão sob responsabilidade da administradora contratante</li>
            <li>Cumprirá com as políticas de uso aceitável do provedor de e-mail utilizado</li>
          </ul>
          <p>O Datacron armazena todas as credenciais de e-mail com criptografia de ponta e não as compartilha com terceiros. O acesso é realizado exclusivamente pelo Agente RPA para fins de monitoramento contratado.</p>

          <h2 id="dados">11. Tratamento de Dados Pessoais</h2>
          <p>O uso da plataforma Datacron envolve o tratamento de dados pessoais conforme detalhado na <strong>Política de Privacidade</strong>, que é parte integrante e inseparável destes Termos.</p>
          <p>Ao utilizar o Datacron, o usuário declara estar ciente e de acordo com o tratamento dos dados para as finalidades descritas na Política de Privacidade, em conformidade com a LGPD.</p>

          <h2 id="cancelamento">12. Cancelamento e Encerramento da Conta</h2>
          <p>O usuário pode solicitar o cancelamento do serviço a qualquer momento pelo canal de suporte.</p>
          <p>O Datacron poderá:</p>
          <ul>
            <li>Suspender ou encerrar contas que violem estes Termos, com ou sem aviso prévio conforme a gravidade</li>
            <li>Encerrar contas inativas por período superior a 12 (doze) meses</li>
            <li>Encerrar o serviço mediante aviso prévio de 30 (trinta) dias por motivo comercial</li>
          </ul>
          <p>Após o encerramento, os dados operacionais serão mantidos pelo prazo legal e então excluídos ou anonimizados, conforme a Política de Privacidade.</p>

          <h2 id="suporte">13. Suporte Técnico</h2>
          <p>O suporte ao usuário é oferecido por e-mail e WhatsApp, nos horários divulgados no site. O Datacron envidará esforços razoáveis para responder no menor prazo possível, observando as prioridades de atendimento por plano contratado.</p>
          <p>Usuários do plano Enterprise contam com gerente de conta dedicado e SLA de atendimento garantido em contrato.</p>

          <h2 id="legislacao">14. Legislação Aplicável e Foro</h2>
          <p>Estes Termos são regidos exclusivamente pelas leis da República Federativa do Brasil, incluindo a LGPD (Lei nº 13.709/2018) e o Marco Civil da Internet (Lei nº 12.965/2014).</p>
          <p>Para resolver eventuais conflitos decorrentes destes Termos, fica eleito o foro da comarca de <strong>São Paulo/SP</strong>, com renúncia expressa de qualquer outro foro, por mais privilegiado que seja.</p>

          <h2 id="disposicoes">15. Disposições Finais</h2>
          <ul>
            <li>A nulidade ou invalidade de qualquer cláusula não afeta a validade das demais</li>
            <li>O não exercício de qualquer direito pelo Datacron não implica renúncia ao mesmo</li>
            <li>Estes Termos constituem o acordo integral entre as partes sobre seu objeto</li>
            <li>A Política de Privacidade é parte integrante destes Termos</li>
          </ul>

          <div className="contact-box">
            <h3>Dúvidas sobre os Termos de Uso?</h3>
            <p>Nossa equipe está disponível para esclarecer qualquer dúvida sobre as condições de uso da plataforma.</p>
            <a href="mailto:contato@datacron.com.br" className="btn">contato@datacron.com.br</a>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text3)' }}>Veja também nossa <Link href="/politica-de-privacidade" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Política de Privacidade</Link></p>
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
