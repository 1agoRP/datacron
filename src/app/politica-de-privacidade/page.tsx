'use client';

import Link from 'next/link';
import '@/styles/landing.css';

export default function PrivacyPolicy() {
  return (
    <div className="landing-page-root" style={{ background: 'var(--bg)' }}>
      <nav className="lp-nav">
        <Link href="/" className="nav-logo">DATA<span>CRON</span></Link>
        <div className="nav-cta">
          <Link href="/" className="btn-outline">Voltar para Home</Link>
        </div>
      </nav>

      <section className="lp-section" style={{ paddingTop: '120px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 className="section-title">Política de <em>Privacidade</em></h1>
          <p className="section-sub" style={{ marginBottom: '3rem' }}>Última atualização: 24 de Abril de 2026</p>

          <div style={{ color: 'var(--text2)', lineHeight: '1.8', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h2 style={{ color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-head)' }}>1. Introdução</h2>
              <p>O Datacron ("nós", "nosso") está comprometido em proteger sua privacidade. Esta Política de Privacidade explica como coletamos, usamos e protegemos suas informações quando você utiliza nossa plataforma de automação de faturas.</p>
            </div>

            <div>
              <h2 style={{ color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-head)' }}>2. Informações que Coletamos</h2>
              <p>Coletamos informações necessárias para a prestação dos nossos serviços, incluindo:</p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><strong>Dados de Acesso:</strong> Credenciais IMAP/POP3 (criptografadas) para varredura de e-mails.</li>
                <li><strong>Dados de Faturas:</strong> Valores, consumos, códigos de barras e vencimentos extraídos via OCR.</li>
                <li><strong>Dados Cadastrais:</strong> CNPJ do condomínio, nome da administradora e contatos dos usuários.</li>
              </ul>
            </div>

            <div>
              <h2 style={{ color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-head)' }}>3. Uso das Informações</h2>
              <p>Utilizamos os dados coletados exclusivamente para:</p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Automatizar a leitura e organização de faturas.</li>
                <li>Gerar alertas de variação de consumo e não recebimento.</li>
                <li>Integrar dados com sistemas de ERP indicados pelo cliente.</li>
                <li>Melhorar a precisão dos nossos modelos de OCR.</li>
              </ul>
            </div>

            <div>
              <h2 style={{ color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-head)' }}>4. Segurança dos Dados</h2>
              <p>Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito e em repouso. O acesso aos dados é restrito a funcionários autorizados e necessário para a manutenção do serviço.</p>
            </div>

            <div>
              <h2 style={{ color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-head)' }}>5. Compartilhamento com Terceiros</h2>
              <p>Não vendemos ou alugamos seus dados. O compartilhamento ocorre apenas com provedores de infraestrutura (como serviços de nuvem) necessários para a operação, todos em conformidade com a LGPD.</p>
            </div>

            <div>
              <h2 style={{ color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-head)' }}>6. Seus Direitos</h2>
              <p>Você tem o direito de acessar, corrigir ou solicitar a exclusão de seus dados pessoais a qualquer momento, conforme garantido pela Lei Geral de Proteção de Dados (LGPD).</p>
            </div>

            <div>
              <h2 style={{ color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-head)' }}>7. Contato</h2>
              <p>Para dúvidas sobre esta política, entre em contato através do e-mail: <strong>privacidade@datacron.com.br</strong></p>
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div>
          <div className="footer-logo">DATA<span>CRON</span></div>
          <p className="footer-copy">© 2026 Datacron RPA · Todos os direitos reservados.</p>
        </div>
        <div className="footer-links">
          <Link href="/">Home</Link>
          <Link href="/termos-de-uso">Termos de Uso</Link>
        </div>
      </footer>
    </div>
  );
}
