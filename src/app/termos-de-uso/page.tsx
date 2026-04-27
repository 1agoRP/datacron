'use client';

import Link from 'next/link';

const pageStyles = `
  :root {
    --bg: #0a0b0f; --bg2: #0f1117; --card: #13151e;
    --border: rgba(255,255,255,0.07); --border-hover: rgba(255,255,255,0.14);
    --accent: #4f6ef7; --accent2: #6b84f8; --accent-glow: rgba(79,110,247,0.15);
    --text: #f0f1f5; --text2: #8b8fa8; --text3: #555870;
    --font-head: 'Sora', system-ui, sans-serif;
    --font-body: 'DM Sans', system-ui, sans-serif;
    --radius: 12px; --radius-lg: 18px;
  }
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); -webkit-font-smoothing: antialiased; }
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 clamp(1rem, 5vw, 3rem); height: 64px;
    background: rgba(10,11,15,0.9); backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
  }
  .nav-logo { font-family: var(--font-head); font-weight: 800; font-size: 1.3rem; letter-spacing: -0.02em; color: var(--text); text-decoration: none; }
  .nav-logo span { color: var(--accent); }
  .btn-ghost { background: none; border: 1px solid var(--border); color: var(--text2); padding: 0.4rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: var(--font-body); text-decoration: none; display: inline-flex; align-items: center; }
  .btn-ghost:hover { border-color: var(--border-hover); color: var(--text); }
  .legal-page { padding: 120px clamp(1rem, 6vw, 5rem) 80px; max-width: 860px; margin: 0 auto; }
  .page-eyebrow { display: inline-block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent2); background: var(--accent-glow); border: 1px solid rgba(79,110,247,0.2); padding: 4px 12px; border-radius: 100px; margin-bottom: 1.25rem; }
  .page-title { font-family: var(--font-head); font-size: clamp(2rem, 4vw, 2.8rem); font-weight: 800; line-height: 1.1; letter-spacing: -0.025em; margin-bottom: 0.75rem; }
  .page-title em { font-style: normal; background: linear-gradient(135deg, var(--accent) 0%, #818cf8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .page-meta { font-size: 0.8rem; color: var(--text3); margin-bottom: 3rem; font-family: monospace; }
  .legal-content { display: flex; flex-direction: column; gap: 0; }
  .legal-section { border-bottom: 1px solid var(--border); padding: 2rem 0; }
  .legal-section:last-child { border-bottom: none; }
  .legal-h2 { font-family: var(--font-head); font-size: 1rem; font-weight: 700; color: var(--text); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 10px; }
  .legal-num { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; background: var(--accent-glow); border: 1px solid rgba(79,110,247,0.2); border-radius: 6px; font-size: 0.72rem; font-weight: 700; color: var(--accent2); flex-shrink: 0; }
  .legal-p { color: var(--text2); font-size: 0.9rem; line-height: 1.8; }
  .legal-list { list-style: none; padding: 0; margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .legal-list li { display: flex; align-items: flex-start; gap: 10px; font-size: 0.875rem; color: var(--text2); line-height: 1.6; }
  .legal-list li::before { content: '→'; color: var(--accent2); flex-shrink: 0; font-weight: 600; margin-top: 1px; }
  .lp-footer { display: flex; justify-content: space-between; align-items: center; padding: 2rem clamp(1rem, 6vw, 5rem); border-top: 1px solid var(--border); background: var(--bg); flex-wrap: wrap; gap: 1rem; }
  .footer-logo { font-family: var(--font-head); font-weight: 800; font-size: 1.1rem; color: var(--text); }
  .footer-logo span { color: var(--accent); }
  .footer-copy { font-size: 0.78rem; color: var(--text3); margin-top: 4px; }
  .footer-links { display: flex; gap: 1.5rem; }
  .footer-links a { font-size: 0.8rem; color: var(--text3); text-decoration: none; transition: color 0.2s; }
  .footer-links a:hover { color: var(--text2); }
`;

export default function TermsOfUse() {
  const sections = [
    {
      title: 'Aceitação dos Termos',
      content: 'Ao acessar e utilizar a plataforma Datacron, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deve utilizar o serviço.',
    },
    {
      title: 'Descrição do Serviço',
      content: 'O Datacron fornece uma solução de RPA (Robotic Process Automation) para automação de coleta, leitura e processamento de faturas de concessionárias para administradoras de condomínios.',
    },
    {
      title: 'Responsabilidades do Usuário',
      content: 'O usuário é responsável por:',
      list: [
        'Fornecer credenciais de acesso válidas para as caixas de e-mail.',
        'Garantir a veracidade dos dados cadastrais dos condomínios.',
        'Manter o sigilo de sua senha de acesso à plataforma.',
        'Utilizar o sistema em conformidade com as leis brasileiras vigentes.',
      ],
    },
    {
      title: 'Limitação de Responsabilidade',
      content: 'O Datacron envidará seus melhores esforços para garantir a precisão do OCR. Recomendamos a conferência periódica dos dados processados. Não nos responsabilizamos por falhas decorrentes de instabilidades nos servidores das concessionárias ou provedores de e-mail.',
    },
    {
      title: 'Propriedade Intelectual',
      content: 'Todo o conteúdo, algoritmos, design e software da plataforma Datacron são de propriedade exclusiva da nossa empresa e protegidos por leis de direitos autorais e propriedade intelectual.',
    },
    {
      title: 'Modificações nos Termos',
      content: 'Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas serão notificadas aos usuários através do dashboard ou e-mail cadastrado com antecedência mínima de 15 dias.',
    },
    {
      title: 'Foro',
      content: 'Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer questões relativas a este instrumento.',
    },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <nav className="lp-nav">
          <Link href="/" className="nav-logo">DATA<span>CRON</span></Link>
          <Link href="/" className="btn-ghost">← Voltar para Home</Link>
        </nav>

        <div className="legal-page">
          <div className="page-eyebrow">Termos Legais</div>
          <h1 className="page-title">Termos de <em>Uso</em></h1>
          <p className="page-meta">Última atualização: 24 de Abril de 2026</p>

          <div className="legal-content">
            {sections.map((s, i) => (
              <div key={i} className="legal-section">
                <h2 className="legal-h2">
                  <span className="legal-num">{i + 1}</span>
                  {s.title}
                </h2>
                <p className="legal-p">{s.content}</p>
                {s.list && (
                  <ul className="legal-list">
                    {s.list.map((item, j) => <li key={j}>{item}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

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
    </>
  );
}