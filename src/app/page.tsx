'use client';

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  ArrowRight,
  Layers,
  Mail,
  Database,
  ShieldCheck,
  Zap,
  BarChart,
  Lock,
  X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import '@/styles/globals.css';
import '@/styles/landing.css';

export default function LandingPage() {
  const [isLoginView, setIsLoginView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ email, senha: password });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação');
    } finally {
      setIsLoading(false);
    }
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="landing-root">
      <div className="landing-grid"></div>
      <div className="landing-bg"></div>

      <div className="landing-content">
        {/* Navbar */}
        <nav className="landing-nav">
          <div className="landing-logo">
            <span className="landing-logo-icon">
              <Layers size={22} />
            </span>
            Datacron
          </div>
          <div>
            <button className="cta-sec" onClick={() => setIsLoginView(true)} style={{ padding: '0.625rem 1.25rem', fontSize: '0.95rem' }}>
              Acesso Privado <Lock size={16} />
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="landing-hero">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={fadeUp}>
              <div className="hero-badge">
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', boxShadow: '0 0 10px #60a5fa' }}></span>
                Plataforma RPA
              </div>
            </motion.div>

            <motion.h1 variants={fadeUp} className="hero-title">
              A inteligência artificial que recebe, controla organiza por <span className="hero-title-gradient">você.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="hero-subtitle">
              Datacron é o exército invisível da sua administradora. Monitoramos e extraímos senhas, concessionárias e valores em milissegundos, com precisão absoluta. O fim das planilhas manuais.
            </motion.p>

            <motion.div variants={fadeUp} className="hero-actions">
              <button className="cta-pri" onClick={() => setIsLoginView(true)}>
                Acessar Sistema <ArrowRight size={20} />
              </button>
            </motion.div>
          </motion.div>
        </header>

        {/* Stats Ribbon */}
        <div className="stats-ribbon">
          <div className="stat-item">
            <span className="stat-val">+4.5k</span>
            <span className="stat-lbl">Faturas Lidas</span>
          </div>
          <div className="stat-item">
            <span className="stat-val">99.8%</span>
            <span className="stat-lbl">Precisão Óptica</span>
          </div>
          <div className="stat-item">
            <span className="stat-val">10x</span>
            <span className="stat-lbl">Tempo Economizado</span>
          </div>
          <div className="stat-item">
            <span className="stat-val">0</span>
            <span className="stat-lbl">Erros de Digitação</span>
          </div>
        </div>

        {/* Bento Grid Features */}
        <section className="bento-section">
          <div className="bento-header">
            <h2>Tecnologia de Alta Performance</h2>
            <p>Os módulos que fazem o Datacron trabalhar enquanto você dorme.</p>
          </div>

          <div className="bento-grid">
            <div className="bento-card bento-wide">
              <div className="bento-icon">
                <Mail size={24} />
              </div>
              <h3 className="bento-title">Carteiro Autônomo (Varredura de Email)</h3>
              <p className="bento-desc" style={{ maxWidth: '80%' }}>
                Não perca tempo abrindo e-mails. Nosso Worker de background varre contas configuradas a cada 5 minutos, captura faturas em PDF conectadas a palavras-chave (Enel, Comgás, Sabesp) e encaminha para pipeline de OCR.
              </p>
            </div>

            <div className="bento-card">
              <div className="bento-icon" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#facc15', borderColor: 'rgba(234, 179, 8, 0.2)' }}>
                <Zap size={24} />
              </div>
              <h3 className="bento-title">OCR Smart</h3>
              <p className="bento-desc">
                Inteligência capaz de ler códigos de instalação e referências, aplicando algoritmos customizados por concessionária e quebrando senhas automáticas de Condomínios e CNPJs.
              </p>
            </div>

            <div className="bento-card bento-tall">
              <div className="bento-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <ShieldCheck size={24} />
              </div>
              <h3 className="bento-title">Central Operacional Blindada</h3>
              <p className="bento-desc" style={{ marginBottom: '1.5rem' }}>
                Sistema nativamente equipado com alertas volumétricos. Se uma conta pular de R$1.000 para R$5.000 (vazamentos de água/gás), o Datacron bloqueia o lote e levanta uma red-flag, prevenindo desastres financeiros no caixa do condomínio.
              </p>
              <div style={{ padding: '1rem', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '12px', width: '100%', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.8rem', color: '#fca5a5', fontWeight: 700, display: 'block', marginBottom: 4 }}>Alerta Detectado</span>
                <span style={{ color: '#fef2f2', fontSize: '0.9rem' }}>Variação de +340% (Sabesp)</span>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
                <Database size={24} />
              </div>
              <h3 className="bento-title">Arquitetura Escalável</h3>
              <p className="bento-desc">
                Bancos de dados rodando em PostgreSQL com Supabase, com suporte instantâneo para onboarding inteligente de CSV com mil condomínios em 2 segundos.
              </p>
            </div>

            <div className="bento-card">
              <div className="bento-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.2)' }}>
                <BarChart size={24} />
              </div>
              <h3 className="bento-title">Relatórios Exportáveis</h3>
              <p className="bento-desc">
                Extrações imediatas de logs e painéis convertidos em Excel e conciliação bancária pronto para injeção em ERPs de contabilidade.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="cta-banner">
          <h2>Automatização nunca foi tão poderosa.</h2>
          <p>Faça login hoje mesmo, gerencie milhares de contas mensais e dedique sua energia humana para estratégias que importam.</p>
          <button className="cta-pri" style={{ color: '#2563eb' }} onClick={() => setIsLoginView(true)}>
            Acessar a Plataforma <ArrowRight size={20} />
          </button>
        </section>

        <footer style={{ textAlign: 'center', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#64748b', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Layers size={16} /> Datacron RPA Solutions
          </div>
          &copy; 2026 Todos os direitos reservados.
        </footer>
      </div>

      {/* Modern Login Modal */}
      <AnimatePresence>
        {isLoginView && (
          <motion.div
            className="modern-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLoginView(false)}
          >
            <motion.div
              className="login-popup"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-btn" onClick={() => setIsLoginView(false)}>
                <X size={20} />
              </button>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div className="landing-logo-icon">
                  <Layers size={32} />
                </div>
              </div>

              <h3 className="login-popup-title">Acesso Seguro</h3>
              <p className="login-popup-desc">Insira suas chaves de acesso Datacron</p>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', fontSize: '0.9rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {error}
                  </div>
                )}

                <div>
                  <input
                    type="email"
                    className="login-input"
                    placeholder="E-mail Operacional (iago@...)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <input
                    type="password"
                    className="login-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="login-btn" disabled={isLoading}>
                  {isLoading ? 'Autenticando...' : 'Autenticar'}
                </button>
              </form>

              <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <Lock size={12} />
                Protocolo SSL de Transmissão Ativo
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
