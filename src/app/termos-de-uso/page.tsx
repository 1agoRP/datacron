'use client';

import Link from 'next/link';
import '@/styles/landing.css';

export default function TermsOfUse() {
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
          <h1 className="section-title">Termos de <em>Uso</em></h1>
          <p className="section-sub" style={{ marginBottom: '3rem' }}>Última atualização: 24 de Abril de 2026</p>

          <div style={{ color: 'var(--text2)', lineHeight: '1.8', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h2 style={{ color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-head)' }}>1. Aceitação dos Termos</h2>
              <p>Ao acessar e utilizar a plataforma Datacron, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deve utilizar o serviço.</p>
            </div>

            <div>
              <h2 style={{ color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-head)' }}>2. Descrição do Serviço</h2>
              <p>O Datacron fornece uma solução de RPA (Robotic Process Automation) para automação de coleta, leitura e processamento de faturas de concessionárias para administradoras de condomínios.</p>
            </div>

            <div>
              <h2 style={{ color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-head)' }}>3. Responsabilidades do Usuário</h2>
              <p>O usuário é responsável por:</p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Fornecer credenciais de acesso válidas para as caixas de e-mail.</li>
                <li>Garantir a veracidade dos dados cadastrais dos condomínios.</li>
                <li>Manter o sigilo de sua senha de acesso à plataforma.</li>
                <li>Utilizar o sistema em conformidade com as leis brasileiras.</li>
              </ul>
            </div>

            <div>
              <h2 style={{ color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-head)' }}>4. Limitação de Responsabilidade</h2>
              <p>O Datacron envidará seus melhores esforços para garantir a precisão do OCR (extração de dados), porém, recomendamos a conferência periódica dos dados processados. Não nos responsabilizamos por falhas decorrentes de instabilidades nos servidores das concessionárias ou provedores de e-mail.</p>
            </div>

            <div>
              <h2 style={{ color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-head)' }}>5. Propriedade Intelectual</h2>
              <p>Todo o conteúdo, algoritmos, design e software da plataforma Datacron são de propriedade exclusiva da nossa empresa e protegidos por leis de direitos autorais e propriedade intelectual.</p>
            </div>

            <div>
              <h2 style={{ color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-head)' }}>6. Modificações nos Termos</h2>
              <p>Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas serão notificadas aos usuários através do dashboard ou e-mail cadastrado.</p>
            </div>

            <div>
              <h2 style={{ color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-head)' }}>7. Foro</h2>
              <p>Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer questões relativas a este instrumento.</p>
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
          <Link href="/politica-de-privacidade">Política de Privacidade</Link>
        </div>
      </footer>
    </div>
  );
}
