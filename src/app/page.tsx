'use client';

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  ArrowRight,
  Layers,
  Database,
  Lock,
  X,
  FileSpreadsheet,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Mail
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import '@/styles/globals.css';
import '@/styles/app.css';

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
    try {
      await login({ email, senha: password });
      router.push('/dashboard');
      setIsLoading(false);
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        console.warn('Network error during login, retrying silently in 2s...');
        setTimeout(() => handleLogin(), 2000);
        return;
      }
      setError(err.message || 'Falha na autenticação');
      setIsLoading(false);
    }
  };

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const stagger: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif", color: '#0f172a' }}>
      
      {/* ─── NAV BARR ─── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 3rem',
        borderBottom: '1px solid #e2e8f0',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em', color: '#1e293b' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: '#eff6ff', border: '1px solid #bfdbfe',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb'
          }}>
            <Layers size={20} />
          </div>
          DATACRON
        </div>
        <button
          className="dc-btn dc-btn-primary"
          style={{ gap: 8 }}
          onClick={() => setIsLoginView(true)}
        >
          <Lock size={15} /> Acesso Restrito
        </button>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '6rem 2rem', textAlign: 'center' }}>
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeInUp} style={{ marginBottom: '1.5rem' }}>
            <span style={{
              background: '#eff6ff', color: '#2563eb', padding: '0.4rem 1rem', borderRadius: 20,
              fontSize: '0.8rem', fontWeight: 600, border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: 6
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
              SISTEMA OPERACIONAL RPA v2 ONLINE
            </span>
          </motion.div>
          <motion.h1 variants={fadeInUp} style={{
            fontSize: 'clamp(2.5rem, 5vw, 4.2rem)', fontWeight: 800, letterSpacing: '-0.03em',
            lineHeight: 1.1, color: '#0f172a', marginBottom: '1.5rem', maxWidth: 900, margin: '0 auto'
          }}>
            Do Caos das Planilhas ao <span style={{ color: '#2563eb' }}>Controle Absoluto.</span>
          </motion.h1>
          <motion.p variants={fadeInUp} style={{
            fontSize: '1.15rem', color: '#475569', maxWidth: 650, margin: '1.5rem auto 3rem', lineHeight: 1.6
          }}>
            O Datacron automatiza a captura, leitura e inteligência de faturas de todas as suas concessionárias. 
            Sem digitação manual, sem erros, apenas resultados processados em milissegundos.
          </motion.p>
          <motion.div variants={fadeInUp} style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button className="dc-btn dc-btn-primary" style={{ padding: '0 2rem', height: 50, fontSize: '1rem' }} onClick={() => setIsLoginView(true)}>
              Acessar Sistema <ArrowRight size={18} />
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── FROM CHAOS TO CONTROL (COMPARISON) ─── */}
      <section style={{ background: '#0f172a', padding: '6rem 2rem', color: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Sua operação antes e depois do Datacron</h2>
            <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>A diferença entre dias de trabalho e segundos de processamento.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* O Caos */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '2.5rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem', color: '#f87171' }}>
                <FileSpreadsheet size={28} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>O Caos do Passado</h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {['Varredura manual de e-mails', 'Digitação linha a linha no Excel', 'Dias perdidos por mês fechando caixas', 'Risco alto de erros de digitação e multas'].map((txt, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, color: '#cbd5e1' }}>
                    <X size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                    {txt}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* O Controle */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', border: '1px solid #3b82f6', borderRadius: 16, padding: '2.5rem', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.1 }}>
                <Zap size={200} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem', color: '#bfdbfe', position: 'relative', zIndex: 1 }}>
                <CheckCircle2 size={28} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>O Controle Datacron</h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 1 }}>
                {['Robôs varrem centenas de inboxes 24/7', 'Extração OCR com 99.9% de precisão óptica', 'Exportação automática com ERP Ready', 'Auditoria inteligente: bloqueia faturas abusivas ao detectar variações absurdos'].map((txt, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, color: '#e0f2fe' }}>
                    <CheckCircle2 size={20} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
                    {txt}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── BENTO GRID FEATURES ─── */}
      <section style={{ maxWidth: 1200, margin: '6rem auto', padding: '0 2rem' }}>
        <div style={{ textAlign: 'left', marginBottom: '3rem' }}>
          <span style={{ color: '#2563eb', fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.85rem' }}>MÓDULOS DE ALTA PERFORMANCE</span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>Uma suíte completa para administradoras.</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
          {/* Card 1 */}
          <div className="dc-card" style={{ gridColumn: 'span 8', padding: '2.5rem', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
            <div style={{ width: 48, height: 48, background: '#eff6ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: '1.5rem' }}>
              <Mail size={24} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Varredura Serverless</h3>
            <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6, maxWidth: 500 }}>
              Um agente Python de altíssima velocidade monitora suas caixas de e-mail IMAP a cada 5 minutos. Ele sabe exatamente o que é uma fatura da Enel, Sabesp ou Comgás, descartando lixo e capturando apenas os PDFs vitais.
            </p>
          </div>

          {/* Card 2 */}
          <div className="dc-card" style={{ gridColumn: 'span 4', padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: 48, height: 48, background: '#fef2f2', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '1.5rem' }}>
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Alertas Anti-Fraude</h3>
            <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6 }}>
              Variações superiores a 30% no consumo de água ou energia disparam red-flags autônomas, prevenindo pagamentos cegas de vazamentos estruturais.
            </p>
          </div>

          {/* Card 3 */}
          <div className="dc-card" style={{ gridColumn: 'span 4', padding: '2.5rem' }}>
             <div style={{ width: 48, height: 48, background: '#fef3c7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', marginBottom: '1.5rem' }}>
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>OCR Preciso</h3>
            <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6 }}>
              Modelos treinados para ler referências de instalação, vencimentos e código de barras, com quebra automática de senhas com base no CNPJ do condomínio.
            </p>
          </div>

          {/* Card 4 */}
          <div className="dc-card" style={{ gridColumn: 'span 8', padding: '2.5rem' }}>
             <div style={{ width: 48, height: 48, background: '#f0fdf4', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', marginBottom: '1.5rem' }}>
              <Database size={24} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>PostgreSQL Unificado</h3>
            <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6, maxWidth: 500 }}>
              Um banco relacional arquitetado para milhões de faturas. Exportações com relatórios XLSX e integrações de API ultra-rápidas para a contabilidade.
            </p>
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section style={{ maxWidth: 1000, margin: '0 auto 6rem', padding: '4rem 2rem', textAlign: 'center', background: '#2563eb', borderRadius: 24, color: '#fff' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Pronto para escalar sua operação?</h2>
        <p style={{ color: '#bfdbfe', fontSize: '1.1rem', marginBottom: '2rem', maxWidth: 600, margin: '0 auto 2rem' }}>
          Deixe o Datacron trabalhar por você enquanto sua equipe foca em relacionamento e estratégia.
        </p>
        <button 
          onClick={() => setIsLoginView(true)}
          style={{ background: '#fff', color: '#2563eb', border: 'none', padding: '1rem 2.5rem', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          Autenticar no Sistema <ArrowRight size={18} />
        </button>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: '1px solid #e2e8f0', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#0f172a' }}>
          <Layers size={18} color="#2563eb"/> DATACRON RPA
        </div>
        <div>
          © 2026 Todos os direitos reservados.
        </div>
      </footer>

      {/* ─── LOGIN MODAL ─── */}
      <AnimatePresence>
        {isLoginView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLoginView(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
              exit={{ scale: 0.95, opacity: 0, y: 20, transition: { duration: 0.2 } }}
              onClick={e => e.stopPropagation()}
              className="dc-card"
              style={{
                width: '100%', maxWidth: 400,
                padding: '2.5rem',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
            >
              <button
                onClick={() => setIsLoginView(false)}
                style={{
                  position: 'absolute', top: '1.25rem', right: '1.25rem',
                  background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <Lock size={24} />
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                  Acesso Restrito
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
                  Insira suas credenciais operacionais.
                </p>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {error && (
                  <div style={{ background: '#fef2f2', color: '#ef4444', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', border: '1px solid #fca5a5' }}>
                    {error}
                  </div>
                )}

                <div className="dc-form-group" style={{ margin: 0 }}>
                  <label>E-mail Corporativo</label>
                  <input
                    type="email"
                    className="dc-form-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="dc-form-group" style={{ margin: 0 }}>
                  <label>Senha de Acesso</label>
                  <input
                    type="password"
                    className="dc-form-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="dc-btn dc-btn-primary"
                  disabled={isLoading}
                  style={{ width: '100%', height: 44, marginTop: '0.5rem', fontSize: '0.95rem' }}
                >
                  {isLoading ? (
                    <><div className="dc-loading-spinner" style={{width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent'}} /> Autenticando...</>
                  ) : 'Entrar no Sistema'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}