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

/* ─── Inline styles as a design system ──────────────────────────────────── */
const DS = {
  // Typography
  fontMono: `'IBM Plex Mono', 'Courier New', monospace`,
  fontDisplay: `'Syne', 'Bebas Neue', sans-serif`,
  fontBody: `'DM Sans', 'Helvetica Neue', sans-serif`,

  // Colors
  bg: '#080A0F',
  surface: '#0D1117',
  surfaceRaised: '#111820',
  border: 'rgba(255,255,255,0.07)',
  borderAccent: 'rgba(56,189,248,0.35)',
  accent: '#38BDF8',
  accentDim: 'rgba(56,189,248,0.15)',
  accentGlow: 'rgba(56,189,248,0.08)',
  gold: '#F59E0B',
  goldDim: 'rgba(245,158,11,0.12)',
  danger: '#EF4444',
  dangerDim: 'rgba(239,68,68,0.1)',
  green: '#22C55E',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#475569',
};

const gFonts = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&family=IBM+Plex+Mono:wght@300;400;500&display=swap');`;

/* ─── Keyframe helpers injected once ─────────────────────────────────────── */
const globalStyles = `
${gFonts}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: ${DS.bg}; }

@keyframes scan {
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-8px); }
}
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(56,189,248,0.4); }
  70%  { box-shadow: 0 0 0 12px rgba(56,189,248,0); }
  100% { box-shadow: 0 0 0 0 rgba(56,189,248,0); }
}
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes grid-fade {
  0%   { opacity: 0.03; }
  50%  { opacity: 0.065; }
  100% { opacity: 0.03; }
}
`;

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
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      <div style={{
        fontFamily: DS.fontBody,
        background: DS.bg,
        color: DS.textPrimary,
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* ── Background: dot grid ── */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          animation: 'grid-fade 6s ease-in-out infinite',
        }} />

        {/* ── Background: diagonal accent lines ── */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 80px,
            rgba(56,189,248,0.018) 80px,
            rgba(56,189,248,0.018) 81px
          )`,
        }} />

        {/* ── Radial glow top-left ── */}
        <div style={{
          position: 'fixed', top: '-20%', left: '-10%', width: '70vw', height: '70vw',
          borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(circle, rgba(56,189,248,0.055) 0%, transparent 60%)',
        }} />

        {/* ── Scan line ── */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.3), transparent)',
          zIndex: 1, pointerEvents: 'none',
          animation: 'scan 8s linear infinite',
        }} />

        <div style={{ position: 'relative', zIndex: 2 }}>

          {/* ═══════════════════════════ NAV ═══════════════════════════ */}
          <nav style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1.25rem 3rem',
            borderBottom: `1px solid ${DS.border}`,
            backdropFilter: 'blur(12px)',
            position: 'sticky', top: 0, zIndex: 50,
            background: 'rgba(8,10,15,0.85)',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontFamily: DS.fontDisplay, fontWeight: 700, fontSize: '1.2rem', letterSpacing: '0.04em' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: DS.accentDim,
                border: `1px solid ${DS.borderAccent}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: DS.accent,
                animation: 'pulse-ring 3s ease-out infinite',
              }}>
                <Layers size={18} />
              </div>
              <span style={{ background: `linear-gradient(90deg, ${DS.textPrimary}, ${DS.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                DATACRON
              </span>
              <span style={{
                fontFamily: DS.fontMono, fontSize: '0.55rem', fontWeight: 400,
                color: DS.accent, letterSpacing: '0.12em', border: `1px solid ${DS.borderAccent}`,
                padding: '2px 6px', borderRadius: 4, marginLeft: 4,
              }}>RPA v2</span>
            </div>

            {/* Nav CTA */}
            <button
              onClick={() => setIsLoginView(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontFamily: DS.fontMono, fontSize: '0.75rem', fontWeight: 500,
                letterSpacing: '0.1em', color: DS.accent,
                background: DS.accentDim, border: `1px solid ${DS.borderAccent}`,
                padding: '0.55rem 1.1rem', borderRadius: 8, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.22)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = DS.accentDim; }}
            >
              <Lock size={13} /> ACESSO PRIVADO
            </button>
          </nav>

          {/* ═══════════════════════════ HERO ═══════════════════════════ */}
          <header style={{ maxWidth: 1100, margin: '0 auto', padding: '7rem 3rem 5rem', position: 'relative' }}>

            {/* Corner decoration */}
            <div style={{
              position: 'absolute', top: '3rem', right: '3rem', width: 120, height: 120,
              border: `1px solid ${DS.border}`, borderRadius: 0,
              opacity: 0.4,
            }}>
              <div style={{
                position: 'absolute', bottom: -1, right: -1, width: 40, height: 40,
                borderBottom: `2px solid ${DS.accent}`, borderRight: `2px solid ${DS.accent}`,
              }} />
            </div>

            <motion.div initial="hidden" animate="visible" variants={staggerContainer}>

              {/* Badge */}
              <motion.div variants={fadeUp} style={{ marginBottom: '2rem' }}>
                <span style={{
                  fontFamily: DS.fontMono, fontSize: '0.7rem', letterSpacing: '0.2em',
                  color: DS.accent, background: DS.accentDim,
                  border: `1px solid ${DS.borderAccent}`,
                  padding: '0.35rem 0.85rem', borderRadius: 4,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: DS.green, display: 'inline-block', animation: 'pulse-ring 2s ease-out infinite' }} />
                  SISTEMA OPERACIONAL — ONLINE
                </span>
              </motion.div>

              {/* Title */}
              <motion.h1 variants={fadeUp} style={{
                fontFamily: DS.fontDisplay,
                fontSize: 'clamp(3.2rem, 7vw, 6rem)',
                fontWeight: 800,
                lineHeight: 1.0,
                letterSpacing: '-0.01em',
                marginBottom: '2rem',
                maxWidth: 820,
              }}>
                A inteligência que{' '}
                <span style={{
                  display: 'inline-block',
                  background: `linear-gradient(135deg, ${DS.accent} 0%, #818CF8 100%)`,
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'shimmer 4s linear infinite',
                }}>trabalha</span>
                {' '}por você.
              </motion.h1>

              {/* Subtitle */}
              <motion.p variants={fadeUp} style={{
                fontFamily: DS.fontBody, fontSize: '1.1rem', fontWeight: 300,
                color: DS.textSecondary, maxWidth: 580, lineHeight: 1.7, marginBottom: '3rem',
                borderLeft: `2px solid ${DS.accent}`, paddingLeft: '1rem',
              }}>
                Datacron é o exército invisível da sua administradora. Monitoramos, extraímos e classificamos faturas em milissegundos — com precisão absoluta. O fim das planilhas manuais.
              </motion.p>

              {/* CTAs */}
              <motion.div variants={fadeUp} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  onClick={() => setIsLoginView(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    fontFamily: DS.fontMono, fontSize: '0.8rem', fontWeight: 500,
                    letterSpacing: '0.08em', color: DS.bg,
                    background: DS.accent,
                    border: 'none', padding: '0.85rem 1.8rem', borderRadius: 8,
                    cursor: 'pointer', transition: 'all 0.2s',
                    animation: 'float 3s ease-in-out infinite',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                >
                  ACESSAR SISTEMA <ArrowRight size={16} />
                </button>
                <span style={{ fontFamily: DS.fontMono, fontSize: '0.7rem', color: DS.textMuted, letterSpacing: '0.1em' }}>
                  // PROTOCOLO SSL ATIVO
                </span>
              </motion.div>
            </motion.div>
          </header>

          {/* ═══════════════════════════ STATS RIBBON ═══════════════════════════ */}
          <div style={{
            borderTop: `1px solid ${DS.border}`,
            borderBottom: `1px solid ${DS.border}`,
            background: DS.surface,
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          }}>
            {[
              { val: '+4.5k', lbl: 'Faturas Lidas' },
              { val: '99.8%', lbl: 'Precisão Óptica' },
              { val: '10×', lbl: 'Tempo Economizado' },
              { val: '0', lbl: 'Erros de Digitação' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '2.5rem 2rem',
                borderRight: i < 3 ? `1px solid ${DS.border}` : 'none',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: i === 0 ? DS.accent : i === 1 ? '#818CF8' : i === 2 ? DS.gold : DS.green,
                }} />
                <div style={{
                  fontFamily: DS.fontDisplay, fontSize: '2.6rem', fontWeight: 800,
                  color: DS.textPrimary, lineHeight: 1,
                }}>
                  {s.val}
                </div>
                <div style={{
                  fontFamily: DS.fontMono, fontSize: '0.7rem', letterSpacing: '0.15em',
                  color: DS.textMuted, marginTop: '0.5rem', textTransform: 'uppercase',
                }}>
                  {s.lbl}
                </div>
              </div>
            ))}
          </div>

          {/* ═══════════════════════════ FEATURES / BENTO ═══════════════════════════ */}
          <section style={{ maxWidth: 1100, margin: '0 auto', padding: '6rem 3rem' }}>

            {/* Section header */}
            <div style={{ marginBottom: '3.5rem' }}>
              <div style={{
                fontFamily: DS.fontMono, fontSize: '0.7rem', letterSpacing: '0.25em',
                color: DS.accent, marginBottom: '1rem', textTransform: 'uppercase',
              }}>
                // MÓDULOS DO SISTEMA
              </div>
              <h2 style={{
                fontFamily: DS.fontDisplay, fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 800, letterSpacing: '-0.01em', maxWidth: 480,
              }}>
                Tecnologia de Alta Performance
              </h2>
              <p style={{ color: DS.textSecondary, fontWeight: 300, marginTop: '0.75rem', maxWidth: 400 }}>
                Os módulos que fazem o Datacron trabalhar enquanto você dorme.
              </p>
            </div>

            {/* Bento grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: 'auto auto',
              gap: '1px',
              background: DS.border,
              border: `1px solid ${DS.border}`,
              borderRadius: 16,
              overflow: 'hidden',
            }}>

              {/* Wide card: Email */}
              <FeatureCard
                colSpan="1 / 3"
                icon={<Mail size={20} />}
                iconColor={DS.accent}
                iconBg={DS.accentDim}
                iconBorder={DS.borderAccent}
                tag="MÓDULO 01"
                title="Carteiro Autônomo"
                subtitle="Varredura de Email"
                desc="Worker de background varre contas configuradas a cada 5 minutos, captura faturas em PDF vinculadas a palavras-chave (Enel, Comgás, Sabesp) e encaminha para o pipeline de OCR — sem intervenção humana."
                accent={DS.accent}
              />

              {/* Tall card: Shield */}
              <FeatureCard
                rowSpan="1 / 3"
                icon={<ShieldCheck size={20} />}
                iconColor="#EF4444"
                iconBg="rgba(239,68,68,0.1)"
                iconBorder="rgba(239,68,68,0.25)"
                tag="MÓDULO 03"
                title="Central Blindada"
                subtitle="Alertas Volumétricos"
                desc="Quando uma conta pula de R$1.000 → R$5.000 (vazamentos de água/gás), o Datacron bloqueia o lote automaticamente e levanta uma red-flag — prevenindo desastres financeiros."
                accent="#EF4444"
                alert={{ label: 'ALERTA DETECTADO', value: 'Variação +340% — Sabesp' }}
              />

              {/* OCR */}
              <FeatureCard
                icon={<Zap size={20} />}
                iconColor={DS.gold}
                iconBg={DS.goldDim}
                iconBorder="rgba(245,158,11,0.25)"
                tag="MÓDULO 02"
                title="OCR Smart"
                subtitle="Extração Inteligente"
                desc="Lê códigos de instalação e referências, aplica algoritmos customizados por concessionária e quebra senhas automáticas de condomínios e CNPJs."
                accent={DS.gold}
              />

              {/* Database */}
              <FeatureCard
                icon={<Database size={20} />}
                iconColor="#22C55E"
                iconBg="rgba(34,197,94,0.1)"
                iconBorder="rgba(34,197,94,0.25)"
                tag="MÓDULO 04"
                title="Arquitetura Escalável"
                subtitle="PostgreSQL + Supabase"
                desc="Onboarding inteligente de CSV com mil condomínios em 2 segundos. Banco de dados robusto, sem limites de escala."
                accent="#22C55E"
              />

              {/* Reports */}
              <FeatureCard
                icon={<BarChart size={20} />}
                iconColor="#A78BFA"
                iconBg="rgba(167,139,250,0.1)"
                iconBorder="rgba(167,139,250,0.25)"
                tag="MÓDULO 05"
                title="Relatórios Exportáveis"
                subtitle="Excel & ERP Ready"
                desc="Logs e painéis convertidos em Excel, prontos para injeção em ERPs de contabilidade e conciliação bancária."
                accent="#A78BFA"
              />
            </div>
          </section>

          {/* ═══════════════════════════ CTA BANNER ═══════════════════════════ */}
          <section style={{
            margin: '0 3rem 6rem',
            maxWidth: 1100,
            marginLeft: 'auto',
            marginRight: 'auto',
            padding: '4rem',
            borderRadius: 16,
            background: `linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(129,140,248,0.06) 100%)`,
            border: `1px solid ${DS.borderAccent}`,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Decorative corner */}
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: 200, height: 200,
              background: 'radial-gradient(circle at top right, rgba(56,189,248,0.12), transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              fontFamily: DS.fontMono, fontSize: '0.7rem', letterSpacing: '0.25em',
              color: DS.accent, marginBottom: '1.25rem',
            }}>// PRONTO PARA OPERAR</div>
            <h2 style={{
              fontFamily: DS.fontDisplay, fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
              fontWeight: 800, letterSpacing: '-0.01em', marginBottom: '1rem', maxWidth: 560,
            }}>
              Automatização nunca foi tão poderosa.
            </h2>
            <p style={{ color: DS.textSecondary, fontWeight: 300, maxWidth: 500, marginBottom: '2.5rem', lineHeight: 1.7 }}>
              Faça login hoje mesmo, gerencie milhares de contas mensais e dedique sua energia humana para estratégias que importam.
            </p>
            <button
              onClick={() => setIsLoginView(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                fontFamily: DS.fontMono, fontSize: '0.8rem', fontWeight: 500,
                letterSpacing: '0.08em', color: DS.bg,
                background: DS.accent,
                border: 'none', padding: '0.85rem 1.8rem', borderRadius: 8,
                cursor: 'pointer', transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              ACESSAR A PLATAFORMA <ArrowRight size={16} />
            </button>
          </section>

          {/* ═══════════════════════════ FOOTER ═══════════════════════════ */}
          <footer style={{
            borderTop: `1px solid ${DS.border}`,
            padding: '2rem 3rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: DS.fontMono, fontSize: '0.7rem', color: DS.textMuted }}>
              <Layers size={14} /> DATACRON RPA SOLUTIONS — © 2026
            </div>
            <div style={{ fontFamily: DS.fontMono, fontSize: '0.65rem', color: DS.textMuted, letterSpacing: '0.12em' }}>
              TODOS OS DIREITOS RESERVADOS
            </div>
          </footer>
        </div>
      </div>

      {/* ═══════════════════════════ LOGIN MODAL ═══════════════════════════ */}
      <AnimatePresence>
        {isLoginView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLoginView(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(4,6,10,0.85)',
              backdropFilter: 'blur(16px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ scale: 0.94, opacity: 0, y: 24, transition: { duration: 0.2 } }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 420,
                background: DS.surface,
                border: `1px solid ${DS.borderAccent}`,
                borderRadius: 16,
                padding: '2.5rem',
                position: 'relative',
                boxShadow: `0 0 60px rgba(56,189,248,0.08), 0 32px 64px rgba(0,0,0,0.5)`,
              }}
            >
              {/* Top accent line */}
              <div style={{
                position: 'absolute', top: 0, left: '20%', right: '20%', height: 2,
                background: `linear-gradient(90deg, transparent, ${DS.accent}, transparent)`,
                borderRadius: '0 0 2px 2px',
              }} />

              {/* Close */}
              <button
                onClick={() => setIsLoginView(false)}
                style={{
                  position: 'absolute', top: '1.25rem', right: '1.25rem',
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${DS.border}`,
                  borderRadius: 8, width: 32, height: 32, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: DS.textMuted, cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = DS.textPrimary; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = DS.textMuted; }}
              >
                <X size={16} />
              </button>

              {/* Logo */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  background: DS.accentDim, border: `1px solid ${DS.borderAccent}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: DS.accent,
                }}>
                  <Layers size={26} />
                </div>
              </div>

              {/* Title */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h3 style={{
                  fontFamily: DS.fontDisplay, fontSize: '1.6rem', fontWeight: 700,
                  letterSpacing: '0.02em', marginBottom: '0.4rem',
                }}>
                  ACESSO SEGURO
                </h3>
                <p style={{
                  fontFamily: DS.fontMono, fontSize: '0.7rem', letterSpacing: '0.15em',
                  color: DS.textMuted,
                }}>
                  INSIRA SUAS CHAVES DE ACESSO DATACRON
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.08)', color: '#FCA5A5',
                    padding: '0.75rem 1rem', borderRadius: 8,
                    border: '1px solid rgba(239,68,68,0.2)',
                    fontFamily: DS.fontMono, fontSize: '0.75rem', textAlign: 'center',
                  }}>
                    {error}
                  </div>
                )}

                <input
                  type="email"
                  placeholder="E-mail operacional"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '0.875rem 1rem',
                    background: DS.surfaceRaised, color: DS.textPrimary,
                    border: `1px solid ${DS.border}`, borderRadius: 8,
                    fontFamily: DS.fontMono, fontSize: '0.82rem',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = DS.borderAccent; }}
                  onBlur={e => { e.currentTarget.style.borderColor = DS.border; }}
                />

                <input
                  type="password"
                  placeholder="Senha de acesso"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '0.875rem 1rem',
                    background: DS.surfaceRaised, color: DS.textPrimary,
                    border: `1px solid ${DS.border}`, borderRadius: 8,
                    fontFamily: DS.fontMono, fontSize: '0.82rem',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = DS.borderAccent; }}
                  onBlur={e => { e.currentTarget.style.borderColor = DS.border; }}
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '100%', padding: '0.9rem',
                    background: isLoading ? 'rgba(56,189,248,0.5)' : DS.accent,
                    color: DS.bg, border: 'none', borderRadius: 8,
                    fontFamily: DS.fontMono, fontSize: '0.8rem', fontWeight: 500,
                    letterSpacing: '0.1em', cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s', marginTop: '0.25rem',
                  }}
                >
                  {isLoading ? 'AUTENTICANDO...' : 'AUTENTICAR →'}
                </button>
              </form>

              {/* SSL note */}
              <div style={{
                marginTop: '1.75rem', textAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: DS.fontMono, fontSize: '0.65rem', letterSpacing: '0.12em',
                color: DS.textMuted,
              }}>
                <Lock size={11} /> PROTOCOLO SSL DE TRANSMISSÃO ATIVO
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Feature Card Sub-component ────────────────────────────────────────── */
interface FeatureCardProps {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  iconBorder: string;
  tag: string;
  title: string;
  subtitle: string;
  desc: string;
  accent: string;
  colSpan?: string;
  rowSpan?: string;
  alert?: { label: string; value: string };
}

function FeatureCard({ icon, iconColor, iconBg, iconBorder, tag, title, subtitle, desc, accent, colSpan, rowSpan, alert }: FeatureCardProps) {
  return (
    <div style={{
      background: '#0D1117',
      gridColumn: colSpan,
      gridRow: rowSpan,
      padding: '2rem',
      display: 'flex', flexDirection: 'column', gap: '1rem',
      position: 'relative', overflow: 'hidden',
      transition: 'background 0.25s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#111820'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#0D1117'; }}
    >
      {/* Top colored accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, ${accent}, transparent)`,
      }} />

      {/* Tag */}
      <div style={{
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: '0.6rem', letterSpacing: '0.2em', color: iconColor, opacity: 0.7,
      }}>
        {tag}
      </div>

      {/* Icon + Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: iconBg, border: `1px solid ${iconBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: iconColor,
        }}>
          {icon}
        </div>
        <div>
          <div style={{
            fontFamily: `'Syne', sans-serif`,
            fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2,
            color: '#F1F5F9',
          }}>
            {title}
          </div>
          <div style={{
            fontFamily: `'IBM Plex Mono', monospace`,
            fontSize: '0.68rem', letterSpacing: '0.1em',
            color: iconColor, opacity: 0.8, marginTop: 2,
          }}>
            {subtitle}
          </div>
        </div>
      </div>

      {/* Description */}
      <p style={{
        fontFamily: `'DM Sans', sans-serif`,
        fontSize: '0.875rem', fontWeight: 300, lineHeight: 1.65,
        color: '#94A3B8',
        flexGrow: alert ? 0 : 1,
      }}>
        {desc}
      </p>

      {/* Optional alert widget */}
      {alert && (
        <div style={{
          marginTop: 'auto',
          padding: '0.875rem 1rem',
          background: 'rgba(239,68,68,0.07)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8,
        }}>
          <div style={{
            fontFamily: `'IBM Plex Mono', monospace`,
            fontSize: '0.65rem', letterSpacing: '0.15em',
            color: '#FCA5A5', fontWeight: 500, marginBottom: 4,
          }}>
            ⚠ {alert.label}
          </div>
          <div style={{ color: '#FEE2E2', fontSize: '0.85rem', fontWeight: 400 }}>
            {alert.value}
          </div>
        </div>
      )}
    </div>
  );
} 