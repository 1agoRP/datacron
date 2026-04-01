'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  ArrowRight,
  Database,
  Lock,
  X,
  FileSpreadsheet,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Mail,
  ChevronDown,
  Cpu,
  BarChart3,
  Globe,
  AlertTriangle,
  Activity,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import '@/styles/globals.css';
import '@/styles/app.css';

/* ─── INLINE STYLES & KEYFRAMES ─── */
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --blue-900: #0a1628;
    --blue-800: #0d1f3c;
    --blue-700: #1a3660;
    --blue-600: #1e4a8a;
    --blue-500: #2563eb;
    --blue-400: #3b82f6;
    --blue-300: #60a5fa;
    --blue-200: #bfdbfe;
    --blue-100: #dbeafe;
    --blue-50:  #eff6ff;
    --slate-900: #0f172a;
    --slate-800: #1e293b;
    --slate-700: #334155;
    --slate-600: #475569;
    --slate-400: #94a3b8;
    --slate-300: #cbd5e1;
    --slate-200: #e2e8f0;
    --slate-100: #f1f5f9;
    --slate-50:  #f8fafc;
    --white: #ffffff;
    --red-500: #ef4444;
    --green-500: #22c55e;
    --amber-500: #f59e0b;
    --font-display: 'Syne', sans-serif;
    --font-body: 'Space Grotesk', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }

  html { scroll-behavior: smooth; }

  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  @keyframes marquee {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }

  .lp-nav { 
    display: flex; align-items: center; justify-content: space-between;
    padding: 1.1rem 3rem; border-bottom: 1px solid rgba(226,232,240,0.7);
    background: rgba(248,250,252,0.85); backdrop-filter: blur(20px);
    position: sticky; top: 0; z-index: 50;
  }
  .lp-logo-text {
    font-family: var(--font-display); font-size: 1.4rem; font-weight: 800;
    letter-spacing: -0.01em; color: var(--slate-900);
    display: flex; align-items: center; gap: 0.75rem;
  }
  .lp-logo-icon {
    width: 38px; height: 38px; border-radius: 10px;
    background: var(--blue-50); border: 1px solid var(--blue-200);
    display: flex; align-items: center; justify-content: center; color: var(--blue-500);
  }
  .lp-btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--blue-500); color: var(--white);
    border: none; border-radius: 10px; padding: 0.65rem 1.4rem;
    font-family: var(--font-body); font-size: 0.9rem; font-weight: 600;
    cursor: pointer; transition: all 0.2s ease; letter-spacing: -0.01em;
  }
  .lp-btn-primary:hover { background: var(--blue-600); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.35); }
  .lp-btn-ghost {
    display: inline-flex; align-items: center; gap: 8px;
    background: transparent; color: var(--slate-600);
    border: 1px solid var(--slate-200); border-radius: 10px; padding: 0.65rem 1.4rem;
    font-family: var(--font-body); font-size: 0.9rem; font-weight: 600;
    cursor: pointer; transition: all 0.2s ease; letter-spacing: -0.01em;
  }
  .lp-btn-ghost:hover { border-color: var(--blue-300); color: var(--blue-500); background: var(--blue-50); }
  .lp-card {
    background: var(--white); border: 1px solid var(--slate-200);
    border-radius: 16px; transition: all 0.3s ease;
  }
  .lp-card:hover { border-color: var(--blue-200); box-shadow: 0 12px 40px rgba(37,99,235,0.08); transform: translateY(-2px); }
  .lp-form-input {
    width: 100%; padding: 0.75rem 1rem;
    background: var(--slate-50); border: 1.5px solid var(--slate-200);
    border-radius: 10px; font-family: var(--font-body); font-size: 0.95rem;
    color: var(--slate-900); outline: none; transition: all 0.2s;
  }
  .lp-form-input:focus { border-color: var(--blue-400); background: var(--white); box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
  .lp-form-label { font-size: 0.82rem; font-weight: 600; color: var(--slate-700); margin-bottom: 0.4rem; display: block; letter-spacing: 0.01em; }
  .lp-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .lp-tag {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--blue-50); color: var(--blue-500);
    border: 1px solid var(--blue-200); border-radius: 20px;
    padding: 0.35rem 0.9rem; font-size: 0.78rem; font-weight: 700;
    letter-spacing: 0.05em; font-family: var(--font-mono);
  }
  .lp-tag-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--blue-400); animation: pulse-ring 1.5s infinite; }
  .marquee-track { display: flex; gap: 3rem; animation: marquee 25s linear infinite; width: max-content; }
  .marquee-item { display: flex; align-items: center; gap: 0.6rem; font-family: var(--font-mono); font-size: 0.8rem; color: var(--slate-400); white-space: nowrap; font-weight: 500; }

  .stat-card { 
    background: var(--white); border: 1px solid var(--slate-200); border-radius: 16px;
    padding: 2rem; display: flex; flex-direction: column; gap: 0.5rem;
    transition: all 0.3s ease;
  }
  .stat-card:hover { border-color: var(--blue-200); box-shadow: 0 8px 32px rgba(37,99,235,0.1); transform: translateY(-2px); }
  .stat-number { font-family: var(--font-display); font-size: 2.8rem; font-weight: 800; color: var(--slate-900); letter-spacing: -0.04em; line-height: 1; }
  .stat-label { font-size: 0.9rem; color: var(--slate-500); font-weight: 500; line-height: 1.4; }
  .stat-delta { display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; font-weight: 700; color: var(--green-500); font-family: var(--font-mono); }

  .process-step { display: flex; gap: 1.5rem; align-items: flex-start; padding: 1.75rem; border-radius: 14px; transition: background 0.2s; }
  .process-step:hover { background: rgba(255,255,255,0.03); }
  .step-num { 
    font-family: var(--font-display); font-size: 1rem; font-weight: 800; 
    color: var(--blue-500); width: 36px; height: 36px; background: var(--blue-50);
    border: 1.5px solid var(--blue-200); border-radius: 10px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    letter-spacing: -0.02em;
  }

  .feat-icon { 
    width: 48px; height: 48px; border-radius: 13px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1.25rem; flex-shrink: 0;
  }

  .compare-row { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.6rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .compare-row:last-child { border-bottom: none; }

  @media (max-width: 768px) {
    .lp-nav { padding: 1rem 1.25rem; }
    .bento-grid { grid-template-columns: 1fr !important; }
    .hero-btns { flex-direction: column; }
    .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .process-grid { grid-template-columns: 1fr !important; }
    .compare-grid { grid-template-columns: 1fr !important; }
    .hero-grid { grid-template-columns: 1fr !important; }
  }
`;

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

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    // 60-second absolute timeout for cold starts on free tiers
    const timeout = setTimeout(() => {
      setError('Tempo limite excedido (60s). Verifique sua conexão e tente novamente.');
      setIsLoading(false);
    }, 60000);

    // 5-second gentle warning
    const warningTimeout = setTimeout(() => {
      setError('O servidor está acordando (Render Free). Isso pode levar até 50 segundos. Por favor, aguarde...');
    }, 5000);

    try {
      await login({ email, senha: password });
      clearTimeout(timeout);
      clearTimeout(warningTimeout);
      router.push('/dashboard');
    } catch (err: any) {
      clearTimeout(timeout);
      clearTimeout(warningTimeout);
      if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        setError('Servidor indisponível. Verifique sua conexão e tente novamente.');
      } else {
        setError(err.message || 'Falha na autenticação');
      }
      setIsLoading(false);
    }
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 28 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22,1,0.36,1], delay: i * 0.1 } })
  };

  const marqueeItems = [
    { icon: <Zap size={14} />, label: 'ENEL AUTOMAÇÃO' },
    { icon: <Activity size={14} />, label: 'SABESP OCR' },
    { icon: <Database size={14} />, label: 'COMGÁS RPA' },
    { icon: <Globe size={14} />, label: 'CPFL MONITOR' },
    { icon: <BarChart3 size={14} />, label: 'RELATÓRIOS ERP' },
    { icon: <ShieldCheck size={14} />, label: 'ANTI-FRAUDE AI' },
    { icon: <Cpu size={14} />, label: 'PROCESSAMENTO 24/7' },
    { icon: <Mail size={14} />, label: 'INBOX SCANNER' },
  ];

  /* Use logo from public if it exists, otherwise show icon */
  const LogoElement = ({ size = 38 }: { size?: number }) => (
    <div className="lp-logo-icon" style={{ width: size, height: size }}>
      <Layers size={size * 0.55} />
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      <div style={{ background: 'var(--slate-50)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>

        {/* ─── NAV ─── */}
        <nav className="lp-nav">
          <div className="lp-logo-text">
            <LogoElement />
            DATACRON
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span className="lp-tag" style={{ display: 'flex' }}>
              <span className="lp-tag-dot" />
              v2 ONLINE
            </span>
            <button className="lp-btn-primary" onClick={() => setIsLoginView(true)}>
              <Lock size={14} /> Acesso Restrito
            </button>
          </div>
        </nav>

        {/* ─── HERO ─── */}
        <section style={{
          maxWidth: 1200, margin: '0 auto', padding: '7rem 2rem 4rem',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center',
        }} className="hero-grid">
          {/* Left */}
          <motion.div initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <motion.div variants={fadeUp} custom={0}>
              <span className="lp-tag">
                <span className="lp-tag-dot" />
                SISTEMA OPERACIONAL RPA
              </span>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(2.6rem, 4vw, 3.8rem)',
              fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--slate-900)'
            }}>
              Do Caos das Planilhas ao{' '}
              <span style={{
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Controle Absoluto.
              </span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} style={{
              fontSize: '1.1rem', color: 'var(--slate-500)', lineHeight: 1.7, maxWidth: 480,
              fontWeight: 400,
            }}>
              O Datacron automatiza a captura, leitura e inteligência de faturas de todas as suas concessionárias.
              Sem digitação manual, sem erros — apenas resultados processados em milissegundos.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="hero-btns" style={{ display: 'flex', gap: '0.875rem' }}>
              <button className="lp-btn-primary" style={{ padding: '0.8rem 1.75rem', fontSize: '0.95rem' }} onClick={() => setIsLoginView(true)}>
                Acessar Sistema <ArrowRight size={16} />
              </button>
              <button className="lp-btn-ghost" style={{ padding: '0.8rem 1.75rem', fontSize: '0.95rem' }}
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                Ver Módulos <ChevronDown size={16} />
              </button>
            </motion.div>
            {/* Mini stats row */}
            <motion.div variants={fadeUp} custom={4} style={{
              display: 'flex', gap: '2rem', paddingTop: '0.5rem',
              borderTop: '1px solid var(--slate-200)',
            }}>
              {[
                { n: '99.9', s: '%', label: 'Precisão OCR' },
                { n: '5', s: 'min', label: 'Ciclo de varredura' },
                { n: '24', s: '/7', label: 'Monitoramento' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)', letterSpacing: '-0.03em' }}>
                    {stat.n}<span style={{ color: 'var(--blue-500)' }}>{stat.s}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', fontWeight: 500 }}>{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — dashboard mockup */}
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.3, ease: [0.22,1,0.36,1] }}
            style={{ position: 'relative' }}>
            <div style={{
              background: 'var(--white)', border: '1px solid var(--slate-200)', borderRadius: 20,
              overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.1), 0 0 0 1px rgba(226,232,240,0.5)',
              animation: 'float 4s ease-in-out infinite',
            }}>
              {/* Mockup header */}
              <div style={{ background: 'var(--slate-900)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {['#ef4444','#f59e0b','#22c55e'].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                ))}
                <div style={{ marginLeft: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 6, padding: '0.25rem 0.75rem', flex: 1, maxWidth: 200 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--slate-400)' }}>datacron.app/dashboard</span>
                </div>
              </div>
              {/* Mockup body */}
              <div style={{ padding: '1.5rem', background: 'var(--slate-50)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-900)' }}>Faturas Processadas Hoje</span>
                  <span className="lp-tag" style={{ fontSize: '0.68rem', padding: '0.2rem 0.6rem' }}>
                    <span className="lp-tag-dot" /> AO VIVO
                  </span>
                </div>
                {/* Fake chart bars */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80, marginBottom: '1rem' }}>
                  {[40,65,50,80,70,90,85,100,78,92,88,95].map((h, i) => (
                    <div key={i} style={{
                      flex: 1, height: `${h}%`, borderRadius: 4,
                      background: `linear-gradient(to top, #2563eb, #60a5fa)`,
                      opacity: i === 11 ? 1 : 0.4 + (i / 20),
                    }} />
                  ))}
                </div>
                {/* Fake rows */}
                {[
                  { conc: 'ENEL-SP', valor: 'R$ 2.840,00', status: 'ok' },
                  { conc: 'SABESP', valor: 'R$ 1.120,00', status: 'ok' },
                  { conc: 'COMGÁS', valor: 'R$ 892,00', status: 'warn' },
                  { conc: 'CPFL', valor: 'R$ 3.410,00', status: 'ok' },
                ].map((row) => (
                  <div key={row.conc} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem', borderRadius: 8, marginBottom: 4,
                    background: 'var(--white)', border: '1px solid var(--slate-100)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: row.status === 'ok' ? '#22c55e' : '#f59e0b' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700)' }}>{row.conc}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 500 }}>{row.valor}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, duration: 0.4 }}
              style={{
                position: 'absolute', bottom: -16, left: -16,
                background: 'var(--white)', border: '1px solid var(--slate-200)',
                borderRadius: 12, padding: '0.75rem 1rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} color="#22c55e" />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-900)' }}>247 faturas</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--slate-400)', fontWeight: 500 }}>processadas hoje</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.0, duration: 0.4 }}
              style={{
                position: 'absolute', top: 60, right: -20,
                background: 'var(--white)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 12, padding: '0.75rem 1rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={18} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-900)' }}>Alerta Variação</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--red-500)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>+47% COMGÁS</div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ─── MARQUEE TICKER ─── */}
        <div style={{ background: 'var(--slate-900)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.85rem 0', overflow: 'hidden' }}>
          <div className="marquee-track">
            {[...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, i) => (
              <div key={i} className="marquee-item">
                <span style={{ color: 'var(--blue-400)' }}>{item.icon}</span>
                {item.label}
                <span style={{ color: 'rgba(255,255,255,0.1)', marginLeft: '1.5rem' }}>◆</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── STATS ─── */}
        <section style={{ maxWidth: 1200, margin: '5rem auto', padding: '0 2rem' }}>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
            {[
              { n: 99.9, s: '%', label: 'Precisão de leitura OCR', delta: '+0.2% vs v1', icon: <Cpu size={20} color="#2563eb" /> },
              { n: 5, s: 'min', label: 'Ciclo máximo de varredura', delta: '-8min vs manual', icon: <Activity size={20} color="#22c55e" /> },
              { n: 30, s: '%', label: 'Limiar de alerta de variação', delta: 'Configurável', icon: <AlertTriangle size={20} color="#f59e0b" /> },
              { n: 100, s: '%', label: 'Uptime do agente RPA', delta: '↑ SLA garantido', icon: <ShieldCheck size={20} color="#8b5cf6" /> },
            ].map((s) => (
              <motion.div key={s.label} className="stat-card"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                <div style={{ marginBottom: '0.25rem' }}>{s.icon}</div>
                <div className="stat-number"><Counter end={s.n} suffix={s.s} /></div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-delta">↗ {s.delta}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── BEFORE / AFTER ─── */}
        <section style={{ background: 'var(--slate-900)', padding: '6rem 2rem' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <span className="lp-tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--blue-300)', borderColor: 'rgba(59,130,246,0.3)', marginBottom: '1rem', display: 'inline-flex' }}>
                COMPARATIVO OPERACIONAL
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3vw, 2.8rem)', fontWeight: 800, color: 'var(--white)', marginTop: '1rem', letterSpacing: '-0.03em' }}>
                Sua operação antes e depois do Datacron
              </h2>
              <p style={{ color: 'var(--slate-400)', fontSize: '1.05rem', marginTop: '0.75rem' }}>A diferença entre dias de trabalho e segundos de processamento.</p>
            </motion.div>

            <div className="compare-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Caos */}
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileSpreadsheet size={22} color="#ef4444" />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--white)' }}>O Caos do Passado</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>Processo manual e ineficiente</div>
                  </div>
                </div>
                {[
                  'Varredura manual de dezenas de e-mails por dia',
                  'Digitação linha a linha no Excel por horas',
                  'Dias perdidos por mês fechando caixas de condomínio',
                  'Alto risco de erros, multas e retrabalho',
                  'Zero visibilidade sobre variações abusivas',
                ].map((txt) => (
                  <div key={txt} className="compare-row">
                    <X size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: 'var(--slate-400)', fontSize: '0.92rem', lineHeight: 1.5 }}>{txt}</span>
                  </div>
                ))}
              </motion.div>

              {/* Controle */}
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
                style={{
                  background: 'linear-gradient(135deg, rgba(30,58,138,0.6) 0%, rgba(37,99,235,0.25) 100%)',
                  border: '1px solid rgba(59,130,246,0.4)', borderRadius: 18, padding: '2.5rem',
                  position: 'relative', overflow: 'hidden',
                }}>
                <div style={{ position: 'absolute', top: -40, right: -40, opacity: 0.04 }}>
                  <Zap size={220} color="white" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(37,99,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={22} color="#60a5fa" />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--white)' }}>O Controle Datacron</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--blue-300)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>Automação total e inteligente</div>
                  </div>
                </div>
                {[
                  'Robôs varrem centenas de inboxes 24/7 automaticamente',
                  'Extração OCR com 99.9% de precisão óptica comprovada',
                  'Exportação instantânea ERP-Ready com um clique',
                  'Auditoria inteligente: bloqueia faturas com variação anormal',
                  'Dashboard em tempo real com alertas configuráveis',
                ].map((txt) => (
                  <div key={txt} className="compare-row" style={{ position: 'relative', zIndex: 1 }}>
                    <CheckCircle2 size={16} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: 'var(--blue-100)', fontSize: '0.92rem', lineHeight: 1.5 }}>{txt}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── FEATURES BENTO ─── */}
        <section id="features" style={{ maxWidth: 1200, margin: '6rem auto', padding: '0 2rem' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ marginBottom: '3.5rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue-500)', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.78rem' }}>
              MÓDULOS DE ALTA PERFORMANCE
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3vw, 2.8rem)', fontWeight: 800, color: 'var(--slate-900)', marginTop: '0.6rem', letterSpacing: '-0.03em', maxWidth: 600 }}>
              Uma suíte completa para administradoras de imóveis.
            </h2>
          </motion.div>

          <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.25rem' }}>
            {/* Big card — Varredura */}
            <motion.div className="lp-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
              style={{ gridColumn: 'span 7', padding: '2.5rem' }}>
              <div className="feat-icon" style={{ background: '#eff6ff' }}>
                <Mail size={24} color="#2563eb" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.6rem', letterSpacing: '-0.02em' }}>
                Varredura Serverless de E-mail
              </h3>
              <p style={{ color: 'var(--slate-500)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: 460 }}>
                Um agente Python de alta velocidade monitora suas caixas IMAP a cada 5 minutos. Ele identifica automaticamente faturas de Enel, Sabesp, Comgás e outras concessionárias, descartando spam e capturando apenas os PDFs essenciais.
              </p>
              <div style={{ marginTop: '1.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {['IMAP / POP3', 'Multi-inbox', 'PDF Detector', 'Senha Auto'].map(tag => (
                  <span key={tag} style={{ background: 'var(--blue-50)', color: 'var(--blue-600)', border: '1px solid var(--blue-200)', borderRadius: 8, padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Anti-Fraude */}
            <motion.div className="lp-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
              style={{ gridColumn: 'span 5', padding: '2.5rem' }}>
              <div className="feat-icon" style={{ background: '#fef2f2' }}>
                <ShieldCheck size={24} color="#ef4444" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.6rem', letterSpacing: '-0.02em' }}>
                Alertas Anti-Fraude
              </h3>
              <p style={{ color: 'var(--slate-500)', fontSize: '0.95rem', lineHeight: 1.7 }}>
                Variações superiores a 30% no consumo disparam red-flags autônomas, prevenindo pagamentos de vazamentos estruturais ocultos.
              </p>
              <div style={{ marginTop: '1.5rem', background: 'var(--slate-50)', borderRadius: 10, padding: '0.875rem', border: '1px solid var(--slate-100)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--slate-500)' }}>Variação detectada</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>+47%</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'var(--slate-200)', overflow: 'hidden' }}>
                  <div style={{ width: '47%', height: '100%', background: 'linear-gradient(90deg, #ef4444, #f87171)', borderRadius: 99 }} />
                </div>
              </div>
            </motion.div>

            {/* OCR */}
            <motion.div className="lp-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }}
              style={{ gridColumn: 'span 5', padding: '2.5rem' }}>
              <div className="feat-icon" style={{ background: '#fef3c7' }}>
                <Zap size={24} color="#d97706" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.6rem', letterSpacing: '-0.02em' }}>
                OCR de Alta Precisão
              </h3>
              <p style={{ color: 'var(--slate-500)', fontSize: '0.95rem', lineHeight: 1.7 }}>
                Modelos treinados para extrair referências de instalação, vencimentos e código de barras — com quebra automática de senhas baseada no CNPJ do condomínio.
              </p>
            </motion.div>

            {/* PostgreSQL */}
            <motion.div className="lp-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
              style={{ gridColumn: 'span 7', padding: '2.5rem' }}>
              <div className="feat-icon" style={{ background: '#f0fdf4' }}>
                <Database size={24} color="#16a34a" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.6rem', letterSpacing: '-0.02em' }}>
                PostgreSQL Unificado & ERP Ready
              </h3>
              <p style={{ color: 'var(--slate-500)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: 480 }}>
                Um banco relacional arquitetado para milhões de faturas. Exportações inteligentes em XLSX e integrações de API ultra-rápidas prontas para conectar à sua contabilidade.
              </p>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem' }}>
                {[{ label: 'Exportação', v: 'XLSX / CSV' }, { label: 'API', v: 'REST Ready' }, { label: 'Backup', v: 'Automático' }].map(item => (
                  <div key={item.label}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-900)' }}>{item.v}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)', marginTop: 2 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section style={{ background: 'var(--slate-900)', padding: '6rem 2rem' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <span className="lp-tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--blue-300)', borderColor: 'rgba(59,130,246,0.3)', marginBottom: '1rem', display: 'inline-flex' }}>
                FLUXO DE OPERAÇÃO
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3vw, 2.8rem)', fontWeight: 800, color: 'var(--white)', marginTop: '1rem', letterSpacing: '-0.03em' }}>
                Como o Datacron funciona
              </h2>
              <p style={{ color: 'var(--slate-400)', fontSize: '1rem', marginTop: '0.75rem', maxWidth: 500, margin: '0.75rem auto 0' }}>
                Do recebimento da fatura ao dado estruturado em segundos — sem intervenção humana.
              </p>
            </motion.div>

            <div className="process-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {[
                { n: '01', title: 'Recebimento Automático', desc: 'O agente IMAP monitora as caixas de e-mail cadastradas a cada 5 minutos, identificando e baixando PDFs de faturas de concessionárias automaticamente.', icon: <Mail size={18} color="#60a5fa" /> },
                { n: '02', title: 'Extração OCR', desc: 'Modelos de visão computacional extraem campos críticos: referência de instalação, valor, vencimento, código de barras e consumo com 99.9% de precisão.', icon: <Cpu size={18} color="#34d399" /> },
                { n: '03', title: 'Auditoria Inteligente', desc: 'O motor de regras compara o consumo atual com o histórico. Variações acima do limiar configurado disparam alertas imediatos para o gestor.', icon: <AlertTriangle size={18} color="#fbbf24" /> },
                { n: '04', title: 'Exportação & Integração', desc: 'Os dados validados são escritos no PostgreSQL e disponibilizados via API REST ou exportação XLSX para integração direta com seu ERP ou contabilidade.', icon: <BarChart3 size={18} color="#a78bfa" /> },
              ].map((step) => (
                <motion.div key={step.n} className="process-step" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
                  <div className="step-num">{step.n}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
                      {step.icon}
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 800, color: 'var(--white)', letterSpacing: '-0.02em' }}>{step.title}</h3>
                    </div>
                    <p style={{ color: 'var(--slate-400)', fontSize: '0.9rem', lineHeight: 1.65 }}>{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA BANNER ─── */}
        <section style={{ maxWidth: 1100, margin: '6rem auto', padding: '0 2rem' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
              borderRadius: 24, padding: '4.5rem 3rem', textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
            <div style={{ position: 'absolute', top: -80, right: -80, opacity: 0.07 }}>
              <Zap size={300} color="white" />
            </div>
            <div style={{ position: 'absolute', bottom: -60, left: -60, opacity: 0.05 }}>
              <Database size={240} color="white" />
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <span className="lp-tag" style={{ background: 'rgba(255,255,255,0.15)', color: 'var(--white)', borderColor: 'rgba(255,255,255,0.3)', marginBottom: '1.5rem', display: 'inline-flex' }}>
                PRONTO PARA ESCALAR
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 800, color: 'var(--white)', marginBottom: '1rem', letterSpacing: '-0.03em' }}>
                Deixe o Datacron trabalhar por você.
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', marginBottom: '2.5rem', maxWidth: 540, margin: '0 auto 2.5rem' }}>
                Sua equipe foca em relacionamento e estratégia enquanto o RPA cuida de cada fatura — 24 horas por dia.
              </p>
              <button
                onClick={() => setIsLoginView(true)}
                style={{
                  background: 'var(--white)', color: 'var(--blue-600)',
                  border: 'none', padding: '1rem 2.25rem', borderRadius: 12,
                  fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
              >
                Autenticar no Sistema <ArrowRight size={17} />
              </button>
            </div>
          </motion.div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer style={{ borderTop: '1px solid var(--slate-200)', padding: '2rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--slate-400)', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoElement size={28} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--slate-800)', fontSize: '0.95rem' }}>DATACRON RPA</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)' }}>© 2026 Todos os direitos reservados.</div>
        </footer>

        {/* ─── LOGIN MODAL ─── */}
        <AnimatePresence>
          {isLoginView && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsLoginView(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
              }}
            >
              <motion.div
                initial={{ scale: 0.93, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
                exit={{ scale: 0.93, opacity: 0, y: 24, transition: { duration: 0.2 } }}
                onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', maxWidth: 420,
                  background: 'var(--white)', borderRadius: 20,
                  border: '1px solid var(--slate-200)',
                  boxShadow: '0 32px 64px rgba(0,0,0,0.2)',
                  overflow: 'hidden', position: 'relative',
                }}
              >
                {/* Modal top accent */}
                <div style={{ height: 4, background: 'linear-gradient(90deg, #2563eb, #60a5fa)' }} />
                <div style={{ padding: '2.5rem' }}>
                  <button onClick={() => setIsLoginView(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: 4, borderRadius: 8, transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate-100)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <X size={18} />
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
                    <LogoElement size={64} />
                  </div>

                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)', letterSpacing: '-0.02em' }}>
                      Acesso Restrito
                    </h3>
                    <p style={{ color: 'var(--slate-400)', fontSize: '0.88rem', marginTop: '0.4rem' }}>
                      Insira suas credenciais operacionais para continuar.
                    </p>
                  </div>

                  <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {error && (
                      <div style={{ background: '#fef2f2', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        <AlertTriangle size={15} /> {error}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label className="lp-form-label">E-mail Corporativo</label>
                      <input type="email" className="lp-form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="seuemail@empresa.com" required />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label className="lp-form-label">Senha de Acesso</label>
                      <input type="password" className="lp-form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        width: '100%', height: 46, marginTop: '0.5rem',
                        background: isLoading ? 'var(--blue-300)' : 'var(--blue-500)',
                        color: 'var(--white)', border: 'none', borderRadius: 11,
                        fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 700,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'all 0.2s', letterSpacing: '-0.01em',
                      }}
                    >
                      {isLoading ? (
                        <><div className="lp-spinner" /> Autenticando...</>
                      ) : (
                        <><Lock size={15} /> Entrar no Sistema</>
                      )}
                    </button>
                  </form>

                  <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--slate-300)' }}>
                      Acesso monitorado · Datacron RPA v2
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}