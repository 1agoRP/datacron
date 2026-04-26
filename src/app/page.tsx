'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  X,
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
        <p className="section-sub">Administradoras perdem horas preciosas todo mês fazendo manualmente o que o Datacron faz em segundos — com mais precisão e total rastreabilidade.</p>

        <div className="compare-grid">
          <div className="compare-card bad">
            <div className="compare-head bad-head">✕ Sem o Datacron</div>
            <ul className="compare-list">
              <li><div className="ico ico-bad">✕</div>Varredura manual de dezenas de e-mails por dia</li>
              <li><div className="ico ico-bad">✕</div>Digitação linha a linha no Excel — horas perdidas</li>
              <li><div className="ico ico-bad">✕</div>Dias gastos fechando caixas de condomínio</li>
              <li><div className="ico ico-bad">✕</div>Risco alto de erros, multas por atraso e retrabalho</li>
              <li><div className="ico ico-bad">✕</div>Zero visibilidade sobre variações abusivas de consumo</li>
            </ul>
          </div>
          <div className="compare-card good">
            <div className="compare-head good-head">✓ Com o Datacron</div>
            <ul className="compare-list">
              <li><div className="ico ico-good">✓</div>Robôs varrem centenas de inboxes automaticamente</li>
              <li><div className="ico ico-good">✓</div>Extração OCR com 99.9% de precisão comprovada</li>
              <li><div className="ico ico-good">✓</div>Exportação instantânea pronta para o seu ERP</li>
              <li><div className="ico ico-good">✓</div>Auditoria inteligente: bloqueia faturas com variação anormal</li>
              <li><div className="ico ico-good">✓</div>Dashboard em tempo real com alertas configuráveis</li>
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
            <p className="module-desc">Um agente monitora sua caixa IMAP/POP3 a cada 5 minutos. Identifica faturas de ENEL, SABESP, COMGÁS, CPFL e outras automaticamente.</p>
            <div className="module-tags"><span className="tag">IMAP/POP3</span><span className="tag">Multi-inbox</span></div>
          </div>
          <div className="module-card">
            <div className="module-icon">🔓</div>
            <div className="module-title">Desbloqueio Automático</div>
            <p className="module-desc">Faturas protegidas por senha? O Datacron realiza a quebra automática baseada no CNPJ do condomínio.</p>
            <div className="module-tags"><span className="tag">PDF Unlock</span><span className="tag">Seguro</span></div>
          </div>
          <div className="module-card">
            <div className="module-icon">🔍</div>
            <div className="module-title">OCR de Precisão</div>
            <p className="module-desc">Modelos treinados para extrair valores, vencimentos e código de barras com 99.9% de acurácia.</p>
            <div className="module-tags"><span className="tag">99.9% OCR</span><span className="tag">Inteligência</span></div>
          </div>
          <div className="module-card">
            <div className="module-icon">🚨</div>
            <div className="module-title">Alertas Inteligentes</div>
            <p className="module-desc">Variações acima do limiar configurado disparam alertas imediatos. Também avisa faturas em falta.</p>
            <div className="module-tags"><span className="tag">Anti-fraude</span><span className="tag">Configurável</span></div>
          </div>
          <div className="module-card">
            <div className="module-icon">🗄️</div>
            <div className="module-title">Banco de Dados Unificado</div>
            <p className="module-desc">PostgreSQL arquitetado para milhões de faturas. Exportações em XLSX e API REST pronta para seu ERP.</p>
            <div className="module-tags"><span className="tag">PostgreSQL</span><span className="tag">API REST</span></div>
          </div>
          <div className="module-card">
            <div className="module-icon">📊</div>
            <div className="module-title">Dashboard & Relatórios</div>
            <p className="module-desc">Visibilidade total em tempo real: consumo histórico, comparativos por período e ranking de concessionárias.</p>
            <div className="module-tags"><span className="tag">Real-time</span><span className="tag">Analytics</span></div>
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
            <div className="flow-title">Monitoramento contínuo</div>
            <p className="flow-desc">O agente monitora inboxes a cada 5 minutos, identificando e baixando faturas automaticamente.</p>
          </div>
          <div className="flow-step">
            <div className="flow-num">02</div>
            <div className="flow-title">Extração e desbloqueio</div>
            <p className="flow-desc">Senhas são quebradas automaticamente. O OCR extrai dados com precisão de 99.9%.</p>
          </div>
          <div className="flow-step">
            <div className="flow-num">03</div>
            <div className="flow-title">Auditoria e alertas</div>
            <p className="flow-desc">O motor de regras compara o consumo com o histórico. Variações disparam alertas imediatos.</p>
          </div>
          <div className="flow-step">
            <div className="flow-num">04</div>
            <div className="flow-title">Exportação e integração</div>
            <p className="flow-desc">Dados validados são gravados e disponibilizados via API ou XLSX para seu ERP.</p>
          </div>
        </div>
      </section>

      {/* ── ALERTS SECTION ── */}
      <section className="lp-section" style={{ background: 'var(--bg2)' }}>
        <div className="section-label">Sistema de Alertas</div>
        <h2 className="section-title">Nunca mais seja surpreendido<br />por uma fatura <em>fora do padrão</em></h2>
        <div className="alerts-layout">
          <div>
            <p className="section-sub" style={{ marginBottom: '2rem' }}>O Datacron monitora ativamente variações absurdas de consumo e o não recebimento de faturas nas datas previstas.</p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '0.9rem', color: 'var(--text2)' }}>
                <span style={{ color: 'var(--accent3)', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>✓</span>
                Limiar de variação configurável por condomínio
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '0.9rem', color: 'var(--text2)' }}>
                <span style={{ color: 'var(--accent3)', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>✓</span>
                Alertas por e-mail e notificação no dashboard
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '0.9rem', color: 'var(--text2)' }}>
                <span style={{ color: 'var(--accent3)', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>✓</span>
                Aviso antecipado de faturas não recebidas
              </li>
            </ul>
          </div>
          <div>
            <div className="alert-card">
              <div className="alert-card-icon icon-danger">🚨</div>
              <div className="alert-card-body">
                <div className="alert-card-title" style={{ color: 'var(--danger)' }}>Variação crítica detectada</div>
                <div className="alert-card-desc">COMGÁS · Torre Business · Consumo <strong style={{ color: 'var(--danger)' }}>47% acima</strong> da média dos últimos 3 meses.</div>
                <div className="alert-time">Detectado agora · Agente RPA</div>
              </div>
            </div>
            <div className="alert-card">
              <div className="alert-card-icon icon-warn">⏰</div>
              <div className="alert-card-body">
                <div className="alert-card-title" style={{ color: 'var(--warn)' }}>Fatura não recebida</div>
                <div className="alert-card-desc">ENEL-SP · Residencial Laranjeiras · Previsão dia 15 <strong style={{ color: 'var(--warn)' }}>ainda não chegou</strong>.</div>
                <div className="alert-time">Alerta automático · 08:14</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="lp-section">
        <div className="section-label">Quem usa o Datacron</div>
        <h2 className="section-title">Administradoras que <em>recuperaram</em><br />horas de trabalho todo mês</h2>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <p className="testimonial-text">"Antes gastávamos 2 dias inteiros fechando as caixas dos condomínios. Com o Datacron isso é feito automaticamente."</p>
            <div className="testimonial-author">
              <div className="author-avatar">RS</div>
              <div>
                <div className="author-name">Ricardo S.</div>
                <div className="author-role">Diretor · Adm. Síntese</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <p className="testimonial-text">"O alerta de variação nos salvou de um pagamento indevido de quase R$ 4 mil. O sistema sinalizou na hora."</p>
            <div className="testimonial-author">
              <div className="author-avatar">MC</div>
              <div>
                <div className="author-name">Mariana C.</div>
                <div className="author-role">Gestora · CondoMais</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <p className="testimonial-text">"A integração com nosso ERP foi surpreendentemente simples. Em uma semana já tínhamos tudo funcionando."</p>
            <div className="testimonial-author">
              <div className="author-avatar">FP</div>
              <div>
                <div className="author-name">Felipe P.</div>
                <div className="author-role">TI · Grupo Patrimonial</div>
              </div>
            </div>
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
            <p className="plan-desc">Ideal para administradoras iniciando a automação.</p>
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
            <p className="plan-desc">Para administradoras com operação média a grande.</p>
            <ul className="plan-features">
              <li>Até 50 condomínios</li>
              <li>Múltiplas caixas</li>
              <li>Alertas configuráveis</li>
              <li>Dashboard em tempo real</li>
              <li>API REST Ready</li>
            </ul>
            <a href="#contato" className="plan-cta cta-primary">Solicitar Proposta</a>
          </div>
          <div className="pricing-card">
            <div className="plan-name">Enterprise</div>
            <div className="plan-price">Personalizado</div>
            <p className="plan-desc">Para grandes grupos com necessidades específicas.</p>
            <ul className="plan-features">
              <li>Condomínios ilimitados</li>
              <li>Suporte dedicado</li>
              <li>Integração dedicada</li>
              <li>Customizações sob demanda</li>
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
            { q: 'O Datacron funciona com qualquer provedor de e-mail?', a: 'Sim. O Datacron utiliza protocolo IMAP/POP3, compatível com Gmail, Outlook, Yahoo e qualquer servidor corporativo.' },
            { q: 'Quais concessionárias são suportadas?', a: 'Suportamos ENEL, SABESP, COMGÁS, CPFL, Light, Copel e as principais do país.' },
            { q: 'Como funciona o desbloqueio de faturas com senha?', a: 'O sistema utiliza o CNPJ cadastrado do condomínio para realizar o desbloqueio automático do PDF.' },
            { q: 'Como o sistema me avisa quando uma fatura não chega?', a: 'Você cadastra o calendário esperado e o Datacron envia alertas automáticos se a fatura atrasar.' },
            { q: 'Os dados ficam seguros?', a: 'Sim, utilizamos criptografia em repouso e em trânsito, em total conformidade com a LGPD.' },
          ].map((item, i) => (
            <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
              <div className="faq-q" onClick={() => toggleFaq(i)}>
                {item.q}
                <div className="faq-toggle"><ChevronDown size={20} style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} /></div>
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
            <p style={{ color: 'var(--text2)', marginBottom: '2rem' }}>Fale com nosso time e descubra como eliminar o trabalho manual. Respondemos em até 2 horas úteis.</p>
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
                  <span style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>Segunda a sexta · 9h às 18h</span>
                </div>
              </li>
            </ul>
          </div>
          <div className="contact-form">
            <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>Solicite uma Demonstração</h3>
            <div className="form-group">
              <label className="form-label">Nome completo</label>
              <input type="text" className="form-input" placeholder="Seu nome" />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail corporativo</label>
              <input type="email" className="form-input" placeholder="seu@email.com" />
            </div>
            <button className="form-submit" onClick={() => alert('Obrigado! Entraremos em contato em breve.')}>Solicitar Demonstração Gratuita →</button>
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