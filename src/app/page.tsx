'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  ArrowRight,
  Lock,
  X,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import '@/styles/landing.css';

/* ─── ANIMATED COUNTER ─── */
function Counter({ end, suffix = '', duration = 2 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - startTime) / (duration * 1000), 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * end));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function LandingPage() {
  const [isLoginView, setIsLoginView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ email, senha: password });
      const searchParams = new URL(window.location.href).searchParams;
      const redirectPath = searchParams.get('redirect') || '/dashboard';
      window.location.href = redirectPath;
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação');
      setIsLoading(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="landing-page-root">
      {/* ── NAV ── */}
      <nav className="lp-nav">
        <Link href="/" className="nav-logo">DATA<span>CRON</span></Link>
        <ul className="nav-links">
          <li><a href="#funcionalidades">Funcionalidades</a></li>
          <li><a href="#como-funciona">Como funciona</a></li>
          <li><a href="#planos">Planos</a></li>
          <li><a href="#contato">Contato</a></li>
        </ul>
        <div className="nav-cta">
          <button className="btn-outline" onClick={() => setIsLoginView(true)}>Entrar</button>
          <a href="#contato" className="btn-primary">Fale Conosco</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">Automação para Condomínios · RPA Inteligente</div>
          <h1 className="hero-title">
            Controle <em>total</em> das faturas<br />
            <span className="line2">do seu condomínio</span>
          </h1>
          <p className="hero-desc">
            O Datacron monitora automaticamente sua caixa de entrada, reconhece faturas de concessionárias, realiza o desbloqueio, organiza, salva no banco de dados e alerta quando algo foge do padrão — 24 horas por dia, sem intervenção humana.
          </p>
          <div className="hero-actions">
            <a href="#contato" className="btn-hero">
              <ArrowRight />
              Solicitar Demonstração
            </a>
            <a href="https://wa.me/55XXXXXXXXXXX" className="btn-wpp" target="_blank" rel="noopener noreferrer">
              💬 Falar no WhatsApp
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="dashboard-mock">
            <div className="mock-topbar">
              <div className="mock-dots">
                <div className="mock-dot r"></div>
                <div className="mock-dot y"></div>
                <div className="mock-dot g"></div>
              </div>
              <div className="mock-title-bar">DATACRON · PAINEL DE FATURAS</div>
              <div className="mock-badge-live">AO VIVO</div>
            </div>
            <div className="mock-body">
              <div className="mock-stats">
                <div className="mock-stat">
                  <div className="mock-stat-val accent">247</div>
                  <div className="mock-stat-label">Faturas hoje</div>
                </div>
                <div className="mock-stat">
                  <div className="mock-stat-val success">99.9%</div>
                  <div className="mock-stat-label">Precisão OCR</div>
                </div>
                <div className="mock-stat">
                  <div className="mock-stat-val warn">3</div>
                  <div className="mock-stat-label">Alertas ativos</div>
                </div>
                <div className="mock-stat">
                  <div className="mock-stat-val">5min</div>
                  <div className="mock-stat-label">Ciclo varredura</div>
                </div>
              </div>
              <div className="mock-table-head">
                <span>Concessionária</span><span>Condomínio</span><span>Valor</span><span>Status</span>
              </div>
              <div className="mock-row">
                <span><div className="mock-tag">ENEL-SP</div></span>
                <span style={{ color: 'var(--text2)', fontSize: '0.75rem' }}>Edifício Alfa</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>R$ 2.840</span>
                <span><div className="mock-pill pill-ok">✓ Processada</div></span>
              </div>
              <div className="mock-row">
                <span><div className="mock-tag">SABESP</div></span>
                <span style={{ color: 'var(--text2)', fontSize: '0.75rem' }}>Cond. Primavera</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>R$ 1.120</span>
                <span><div className="mock-pill pill-ok">✓ Processada</div></span>
              </div>
              <div className="mock-row">
                <span><div className="mock-tag">COMGÁS</div></span>
                <span style={{ color: 'var(--text2)', fontSize: '0.75rem' }}>Torre Business</span>
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>R$ 892</span>
                <span><div className="mock-pill pill-alert">⚠ Alerta +47%</div></span>
              </div>
              <div className="mock-alert-banner">
                <div className="alert-icon">!</div>
                <div className="alert-text"><strong>Alerta de variação:</strong> COMGÁS · Torre Business com consumo 47% acima da média.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-num"><Counter end={99} suffix=".9%" /></div>
          <div className="stat-label">Precisão de leitura OCR</div>
        </div>
        <div className="stat-item">
          <div className="stat-num"><span>&lt;</span><Counter end={5} suffix="min" /></div>
          <div className="stat-label">Ciclo de varredura automática</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">24<span>/7</span></div>
          <div className="stat-label">Monitoramento contínuo</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">0</div>
          <div className="stat-label">Digitação manual necessária</div>
        </div>
      </div>

      {/* ── PROBLEMA / SOLUÇÃO ── */}
      <section className="lp-section" id="funcionalidades">
        <div className="section-label">O Problema que Resolvemos</div>
        <h2 className="section-title">Do caos da caixa de entrada<br />ao <em>controle absoluto</em></h2>
        <p className="section-sub">Administradoras perdem horas preciosas todo mês fazendo manualmente o que o Datacron faz em segundos.</p>

        <div className="compare-grid">
          <div className="compare-card bad">
            <div className="compare-head bad-head">✕ Sem o Datacron</div>
            <ul className="compare-list">
              <li><div className="ico ico-bad">✕</div>Varredura manual de dezenas de e-mails</li>
              <li><div className="ico ico-bad">✕</div>Digitação linha a linha no Excel</li>
              <li><div className="ico ico-bad">✕</div>Dias gastos fechando caixas</li>
              <li><div className="ico ico-bad">✕</div>Risco alto de erros e multas</li>
              <li><div className="ico ico-bad">✕</div>Zero visibilidade sobre variações</li>
            </ul>
          </div>
          <div className="compare-card good">
            <div className="compare-head good-head">✓ Com o Datacron</div>
            <ul className="compare-list">
              <li><div className="ico ico-good">✓</div>Robôs varrem centenas de inboxes</li>
              <li><div className="ico ico-good">✓</div>Extração OCR com 99.9% de precisão</li>
              <li><div className="ico ico-good">✓</div>Exportação instantânea para ERP</li>
              <li><div className="ico ico-good">✓</div>Auditoria inteligente e automática</li>
              <li><div className="ico ico-good">✓</div>Dashboard com alertas configuráveis</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── MÓDULOS ── */}
      <section className="lp-section" style={{ background: 'var(--bg2)' }}>
        <div className="section-label">Módulos da Plataforma</div>
        <h2 className="section-title">Uma suíte completa para<br />administradoras de <em>condomínio</em></h2>
        <div className="modules-grid">
          <div className="module-card">
            <div className="module-icon">📥</div>
            <div className="module-title">Varredura de Inbox</div>
            <p className="module-desc">Monitoramento IMAP/POP3 a cada 5 minutos. Identifica faturas automaticamente.</p>
            <div className="module-tags"><span className="tag">IMAP/POP3</span><span className="tag">Auto-Scan</span></div>
          </div>
          <div className="module-card">
            <div className="module-icon">🔓</div>
            <div className="module-title">Desbloqueio Automático</div>
            <p className="module-desc">Quebra automática de senhas baseada no CNPJ do condomínio.</p>
            <div className="module-tags"><span className="tag">PDF Unlock</span><span className="tag">Secure</span></div>
          </div>
          <div className="module-card">
            <div className="module-icon">🔍</div>
            <div className="module-title">OCR de Precisão</div>
            <p className="module-desc">Extração de valores, vencimentos e código de barras com 99.9% de acurácia.</p>
            <div className="module-tags"><span className="tag">99.9% OCR</span><span className="tag">Data Intelligence</span></div>
          </div>
          <div className="module-card">
            <div className="module-icon">🚨</div>
            <div className="module-title">Alertas Inteligentes</div>
            <p className="module-desc">Variações críticas disparam alertas imediatos via dashboard e e-mail.</p>
            <div className="module-tags"><span className="tag">Anti-Fraud</span><span className="tag">Thresholds</span></div>
          </div>
          <div className="module-card">
            <div className="module-icon">🗄️</div>
            <div className="module-title">Exportação ERP</div>
            <p className="module-desc">Dados estruturados em XLSX/CSV prontos para seu sistema de gestão.</p>
            <div className="module-tags"><span className="tag">PostgreSQL</span><span className="tag">API REST</span></div>
          </div>
          <div className="module-card">
            <div className="module-icon">📊</div>
            <div className="module-title">Dashboard Real-time</div>
            <p className="module-desc">Visibilidade total do consumo histórico e comparativos por período.</p>
            <div className="module-tags"><span className="tag">Analytics</span><span className="tag">Live Data</span></div>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="lp-section" id="como-funciona">
        <div className="section-label">Fluxo de Operação</div>
        <h2 className="section-title">Do recebimento ao dado estruturado<br />em <em>segundos</em></h2>
        <div className="flow">
          <div className="flow-step">
            <div className="flow-num">01</div>
            <div className="flow-title">Monitoramento</div>
            <p className="flow-desc">Agente monitora inboxes a cada 5 minutos e baixa PDFs.</p>
          </div>
          <div className="flow-step">
            <div className="flow-num">02</div>
            <div className="flow-title">Extração</div>
            <p className="flow-desc">Senhas são quebradas e o OCR processa os dados.</p>
          </div>
          <div className="flow-step">
            <div className="flow-num">03</div>
            <div className="flow-title">Auditoria</div>
            <p className="flow-desc">Motor de regras compara consumos e gera alertas.</p>
          </div>
          <div className="flow-step">
            <div className="flow-num">04</div>
            <div className="flow-title">Integração</div>
            <p className="flow-desc">Dados são disponibilizados via API ou XLSX.</p>
          </div>
        </div>
      </section>

      {/* ── PLANOS ── */}
      <section className="lp-section" id="planos" style={{ background: 'var(--bg2)' }}>
        <div className="section-label">Planos e Preços</div>
        <h2 className="section-title">Escolha o plano ideal<br />para sua <em>operação</em></h2>
        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="plan-name">Starter</div>
            <div className="plan-price">Sob consulta</div>
            <ul className="plan-features">
              <li>Até 5 condomínios</li>
              <li>1 caixa de e-mail</li>
              <li>OCR + Desbloqueio</li>
              <li>Exportação XLSX</li>
            </ul>
            <a href="#contato" className="plan-cta cta-secondary">Solicitar Proposta</a>
          </div>
          <div className="pricing-card featured">
            <div className="featured-badge">Mais Popular</div>
            <div className="plan-name">Professional</div>
            <div className="plan-price">Sob consulta</div>
            <ul className="plan-features">
              <li>Até 50 condomínios</li>
              <li>Múltiplas caixas</li>
              <li>Alertas configuráveis</li>
              <li>API REST Ready</li>
            </ul>
            <a href="#contato" className="plan-cta cta-primary">Solicitar Proposta</a>
          </div>
          <div className="pricing-card">
            <div className="plan-name">Enterprise</div>
            <div className="plan-price">Personalizado</div>
            <ul className="plan-features">
              <li>Ilimitados</li>
              <li>Suporte dedicado</li>
              <li>Integração dedicada</li>
              <li>SLA Garantido</li>
            </ul>
            <a href="#contato" className="plan-cta cta-secondary">Falar com Especialista</a>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lp-section">
        <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
          <div className="section-label">Perguntas Frequentes</div>
          <h2 className="section-title">Tudo que você<br />precisa <em>saber</em></h2>
        </div>
        <div className="faq-list">
          {[
            { q: 'O Datacron funciona com qualquer e-mail?', a: 'Sim, utiliza protocolo IMAP/POP3, compatível com Gmail, Outlook e servidores corporativos.' },
            { q: 'Quais concessionárias são suportadas?', a: 'Suportamos ENEL, SABESP, COMGÁS, CPFL, Light e as principais do país.' },
            { q: 'Como funciona o desbloqueio com senha?', a: 'O sistema utiliza o CNPJ cadastrado do condomínio para realizar o desbloqueio automático do PDF.' },
            { q: 'Os dados ficam seguros?', a: 'Sim, todos os dados são criptografados e seguimos as diretrizes da LGPD.' },
          ].map((item, i) => (
            <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
              <div className="faq-q" onClick={() => toggleFaq(i)}>
                {item.q}
                <div className="faq-toggle">{openFaq === i ? '−' : '+'}</div>
              </div>
              <div className="faq-a">{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTATO ── */}
      <section className="lp-section" id="contato" style={{ background: 'var(--bg2)' }}>
        <div className="section-label">Fale com a Gente</div>
        <h2 className="section-title">Pronto para <em>automatizar</em><br />sua operação?</h2>
        <div className="contact-layout">
          <div>
            <p style={{ color: 'var(--text2)', marginBottom: '2rem' }}>Respondemos seu contato em até 2 horas úteis.</p>
            <ul className="contact-info-list">
              <li>
                <div className="contact-ico">✉️</div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>E-mail</div>
                  <a href="mailto:contato@datacron.com.br" className="contact-link">contato@datacron.com.br</a>
                </div>
              </li>
              <li>
                <div className="contact-ico">⏱️</div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Atendimento</div>
                  <span style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>Seg a Sex · 9h às 18h</span>
                </div>
              </li>
            </ul>
          </div>
          <div className="contact-form">
            <div className="form-group">
              <label className="form-label">Nome completo</label>
              <input type="text" className="form-input" placeholder="Seu nome" />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail corporativo</label>
              <input type="email" className="form-input" placeholder="seu@email.com" />
            </div>
            <button className="form-submit" onClick={() => alert('Obrigado! Entraremos em contato.')}>Enviar Mensagem</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div>
          <div className="footer-logo">DATA<span>CRON</span></div>
          <p className="footer-copy">© 2026 Datacron RPA · Todos os direitos reservados.</p>
        </div>
        <div className="footer-links">
          <Link href="/politica-de-privacidade">Privacidade</Link>
          <Link href="/termos-de-uso">Termos de Uso</Link>
        </div>
      </footer>

      {/* ── LOGIN MODAL ── */}
      <AnimatePresence>
        {isLoginView && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setIsLoginView(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="modal-content"
              onClick={e => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setIsLoginView(false)}><X /></button>
              <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <div className="nav-logo" style={{ fontSize: '2rem', marginBottom: '1rem' }}>DATA<span>CRON</span></div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Acesso ao Sistema</h3>
                <p style={{ color: 'var(--text3)', marginTop: '0.5rem' }}>Insira suas credenciais para continuar</p>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {error && (
                  <div style={{ background: 'rgba(255,79,79,0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <AlertTriangle size={16} /> {error}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Senha</label>
                  <input
                    type="password"
                    className="form-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button type="submit" className="form-submit" disabled={isLoading} style={{ marginTop: '1rem' }}>
                  {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}