'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, AlertTriangle, ChevronDown, Check, Zap, Shield, Bell, Database, BarChart3, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

/* ─── CSS VARIABLES ─── */
const globalStyles = `
  :root {
    --bg: #0a0b0f;
    --bg2: #0f1117;
    --bg3: #161820;
    --card: #13151e;
    --border: rgba(255,255,255,0.07);
    --border-hover: rgba(255,255,255,0.14);
    --accent: #4f6ef7;
    --accent2: #6b84f8;
    --accent-glow: rgba(79,110,247,0.15);
    --green: #22c55e;
    --green-bg: rgba(34,197,94,0.1);
    --amber: #f59e0b;
    --amber-bg: rgba(245,158,11,0.1);
    --danger: #ef4444;
    --danger-bg: rgba(239,68,68,0.1);
    --text: #f0f1f5;
    --text2: #8b8fa8;
    --text3: #555870;
    --font-head: 'Sora', 'DM Sans', system-ui, sans-serif;
    --font-body: 'DM Sans', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --radius: 12px;
    --radius-lg: 18px;
    --radius-xl: 24px;
  }

  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=JetBrains+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  /* ── NAV ── */
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 clamp(1rem, 5vw, 3rem);
    height: 64px;
    background: rgba(10,11,15,0.85);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
  }

  .nav-logo {
    font-family: var(--font-head);
    font-weight: 800;
    font-size: 1.3rem;
    letter-spacing: -0.02em;
    color: var(--text);
    text-decoration: none;
  }
  .nav-logo span { color: var(--accent); }

  .nav-links { display: flex; gap: 2rem; list-style: none; }
  .nav-links a {
    color: var(--text2);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: color 0.2s;
  }
  .nav-links a:hover { color: var(--text); }

  .nav-cta { display: flex; gap: 0.75rem; align-items: center; }

  .btn-ghost {
    background: none; border: 1px solid var(--border);
    color: var(--text2); padding: 0.4rem 1rem;
    border-radius: 8px; font-size: 0.875rem; font-weight: 500;
    cursor: pointer; transition: all 0.2s; font-family: var(--font-body);
    text-decoration: none; display: inline-flex; align-items: center;
  }
  .btn-ghost:hover { border-color: var(--border-hover); color: var(--text); }

  .btn-accent {
    background: var(--accent); color: #fff;
    padding: 0.4rem 1rem; border-radius: 8px;
    font-size: 0.875rem; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
    border: none; font-family: var(--font-body);
    text-decoration: none; display: inline-flex; align-items: center;
  }
  .btn-accent:hover { background: var(--accent2); transform: translateY(-1px); }

  /* ── HERO ── */
  .hero {
    min-height: 100vh;
    display: grid; grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 4rem;
    padding: 120px clamp(1rem, 6vw, 5rem) 80px;
    position: relative;
    overflow: hidden;
  }

  .hero::before {
    content: '';
    position: absolute; top: -200px; left: -100px;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(79,110,247,0.12) 0%, transparent 70%);
    pointer-events: none;
  }

  .hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--accent-glow);
    border: 1px solid rgba(79,110,247,0.3);
    color: var(--accent2);
    padding: 0.3rem 0.9rem;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 1.5rem;
  }

  .hero-badge::before {
    content: '';
    width: 6px; height: 6px;
    background: var(--green);
    border-radius: 50%;
    box-shadow: 0 0 8px var(--green);
    animation: pulse-dot 2s infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .hero-title {
    font-family: var(--font-head);
    font-size: clamp(2.4rem, 5vw, 3.8rem);
    font-weight: 800;
    line-height: 1.08;
    letter-spacing: -0.03em;
    color: var(--text);
    margin-bottom: 1.25rem;
  }

  .hero-title em {
    font-style: normal;
    background: linear-gradient(135deg, var(--accent) 0%, #818cf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-desc {
    color: var(--text2);
    font-size: 1.05rem;
    line-height: 1.7;
    max-width: 520px;
    margin-bottom: 2rem;
  }

  .hero-actions {
    display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;
    margin-bottom: 2rem;
  }

  .btn-hero-primary {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--accent);
    color: #fff; padding: 0.8rem 1.5rem;
    border-radius: 10px; font-size: 0.95rem; font-weight: 600;
    text-decoration: none; transition: all 0.2s;
    border: none; cursor: pointer; font-family: var(--font-body);
  }
  .btn-hero-primary:hover {
    background: var(--accent2);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(79,110,247,0.3);
  }

  .btn-hero-secondary {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border-hover);
    color: var(--text); padding: 0.8rem 1.5rem;
    border-radius: 10px; font-size: 0.95rem; font-weight: 500;
    text-decoration: none; transition: all 0.2s; font-family: var(--font-body);
  }
  .btn-hero-secondary:hover { background: rgba(255,255,255,0.08); }

  .hero-trust {
    display: flex; align-items: center; gap: 0.75rem;
    font-size: 0.8rem; color: var(--text3);
  }

  .hero-trust-avatars {
    display: flex;
  }
  .hero-trust-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--card); border: 2px solid var(--bg);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.65rem; font-weight: 700; color: var(--text2);
    margin-left: -8px;
  }
  .hero-trust-avatar:first-child { margin-left: 0; }

  .stars-mini { color: #f59e0b; font-size: 0.75rem; }

  /* ── DASHBOARD MOCK ── */
  .dashboard-mock {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    overflow: hidden;
    box-shadow: 0 40px 80px rgba(0,0,0,0.4);
    position: relative;
  }

  .dashboard-mock::before {
    content: '';
    position: absolute; top: -1px; left: 20%; right: 20%; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(79,110,247,0.5), transparent);
  }

  .mock-topbar {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid var(--border);
  }

  .mock-dots { display: flex; gap: 5px; }
  .mock-dot { width: 10px; height: 10px; border-radius: 50%; }
  .mock-dot.r { background: #ff5f57; }
  .mock-dot.y { background: #febc2e; }
  .mock-dot.g { background: #28c840; }

  .mock-title-bar {
    flex: 1; text-align: center;
    font-family: var(--font-mono); font-size: 0.65rem;
    color: var(--text3); letter-spacing: 0.08em;
  }

  .mock-live {
    display: flex; align-items: center; gap: 5px;
    font-size: 0.65rem; color: var(--green); font-weight: 600;
  }
  .mock-live::before {
    content: ''; width: 6px; height: 6px;
    background: var(--green); border-radius: 50%;
    animation: pulse-dot 1.5s infinite;
  }

  .mock-body { padding: 16px; }

  .mock-stats-row {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
    margin-bottom: 16px;
  }

  .mock-stat-box {
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 8px; padding: 10px;
  }

  .mock-stat-val {
    font-family: var(--font-head);
    font-size: 1.1rem; font-weight: 700; margin-bottom: 2px;
  }
  .mock-stat-val.accent { color: var(--accent2); }
  .mock-stat-val.green { color: var(--green); }
  .mock-stat-val.amber { color: var(--amber); }

  .mock-stat-lbl {
    font-size: 0.6rem; color: var(--text3); text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .mock-thead {
    display: grid; grid-template-columns: 1.2fr 1.4fr 0.8fr 1fr;
    padding: 6px 8px;
    font-size: 0.62rem; color: var(--text3);
    text-transform: uppercase; letter-spacing: 0.06em;
    border-bottom: 1px solid var(--border);
    margin-bottom: 4px;
  }

  .mock-trow {
    display: grid; grid-template-columns: 1.2fr 1.4fr 0.8fr 1fr;
    padding: 8px 8px;
    border-radius: 6px; transition: background 0.15s;
    align-items: center;
  }
  .mock-trow:hover { background: rgba(255,255,255,0.03); }

  .mock-tag {
    display: inline-block;
    background: var(--accent-glow); border: 1px solid rgba(79,110,247,0.25);
    color: var(--accent2); padding: 2px 7px;
    border-radius: 4px; font-size: 0.65rem; font-weight: 600;
    font-family: var(--font-mono);
  }

  .mock-condo { font-size: 0.72rem; color: var(--text2); }
  .mock-val { font-size: 0.78rem; font-weight: 600; color: var(--text); }
  .mock-val.danger { color: var(--danger); }

  .mock-pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 100px;
    font-size: 0.62rem; font-weight: 600;
  }
  .pill-ok { background: var(--green-bg); color: var(--green); }
  .pill-alert { background: var(--danger-bg); color: var(--danger); }

  .mock-alert {
    display: flex; align-items: flex-start; gap: 8px;
    background: var(--danger-bg);
    border: 1px solid rgba(239,68,68,0.2);
    border-radius: 8px; padding: 10px; margin-top: 12px;
    font-size: 0.72rem; color: var(--text2); line-height: 1.4;
  }
  .mock-alert-icon {
    width: 16px; height: 16px; border-radius: 50%;
    background: var(--danger); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.6rem; font-weight: 800; flex-shrink: 0; margin-top: 1px;
  }

  /* ── LOGOS / TRUST BAR ── */
  .trust-bar {
    padding: 1.5rem clamp(1rem, 6vw, 5rem);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    background: var(--bg2);
    display: flex; align-items: center; gap: 2rem; flex-wrap: wrap;
  }
  .trust-bar-label {
    font-size: 0.75rem; color: var(--text3);
    text-transform: uppercase; letter-spacing: 0.08em;
    flex-shrink: 0;
  }
  .trust-bar-logos { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: center; }
  .trust-logo {
    font-family: var(--font-mono); font-size: 0.8rem; font-weight: 600;
    color: var(--text3); letter-spacing: 0.06em;
    padding: 5px 12px; background: rgba(255,255,255,0.03);
    border: 1px solid var(--border); border-radius: 6px;
    transition: all 0.2s;
  }
  .trust-logo:hover { color: var(--text2); border-color: var(--border-hover); }

  /* ── STATS BAR ── */
  .stats-bar {
    display: grid; grid-template-columns: repeat(4, 1fr);
    background: var(--bg3); border-bottom: 1px solid var(--border);
  }
  .stat-item {
    padding: 2rem clamp(1rem, 3vw, 2.5rem);
    border-right: 1px solid var(--border);
    text-align: center;
  }
  .stat-item:last-child { border-right: none; }
  .stat-num {
    font-family: var(--font-head);
    font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 800;
    color: var(--accent2); margin-bottom: 0.25rem;
  }
  .stat-label { font-size: 0.8rem; color: var(--text3); }

  /* ── SECTION SHARED ── */
  .lp-section {
    padding: 100px clamp(1rem, 6vw, 5rem);
  }

  .section-eyebrow {
    display: inline-block;
    font-size: 0.72rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--accent2);
    background: var(--accent-glow);
    border: 1px solid rgba(79,110,247,0.2);
    padding: 4px 12px; border-radius: 100px;
    margin-bottom: 1.25rem;
  }

  .section-title {
    font-family: var(--font-head);
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 800; line-height: 1.1;
    letter-spacing: -0.025em;
    color: var(--text);
    margin-bottom: 1rem;
  }
  .section-title em {
    font-style: normal;
    background: linear-gradient(135deg, var(--accent) 0%, #818cf8 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }

  .section-sub {
    color: var(--text2); font-size: 1rem; line-height: 1.7;
    max-width: 600px;
  }

  /* ── COMPARE GRID ── */
  .compare-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 1.5rem; margin-top: 3rem;
  }

  .compare-card {
    background: var(--card);
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--border);
  }

  .compare-card.good { border-color: rgba(34,197,94,0.2); }

  .compare-head {
    padding: 1rem 1.5rem;
    font-family: var(--font-head); font-weight: 700; font-size: 0.85rem;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .compare-head.bad-head { background: var(--danger-bg); color: var(--danger); }
  .compare-head.good-head { background: var(--green-bg); color: var(--green); }

  .compare-list { list-style: none; padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .compare-list li {
    display: flex; align-items: flex-start; gap: 12px;
    font-size: 0.875rem; color: var(--text2); line-height: 1.5;
  }

  .ico { width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800; margin-top: 1px; }
  .ico-bad { background: var(--danger-bg); color: var(--danger); }
  .ico-good { background: var(--green-bg); color: var(--green); }

  /* ── MODULES GRID ── */
  .modules-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 3rem; }

  .module-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    transition: all 0.25s;
    position: relative; overflow: hidden;
  }
  .module-card:hover {
    border-color: var(--border-hover);
    transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.2);
  }
  .module-card.featured {
    border-color: rgba(79,110,247,0.3);
    background: linear-gradient(135deg, rgba(79,110,247,0.05) 0%, var(--card) 100%);
  }

  .module-icon-wrap {
    width: 42px; height: 42px; border-radius: 10px;
    background: var(--accent-glow); border: 1px solid rgba(79,110,247,0.2);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1rem; color: var(--accent2);
  }

  .module-title {
    font-family: var(--font-head); font-weight: 700;
    font-size: 1rem; color: var(--text);
    margin-bottom: 0.5rem;
  }

  .module-desc { font-size: 0.845rem; color: var(--text2); line-height: 1.6; margin-bottom: 1rem; }

  .module-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag {
    font-size: 0.68rem; font-weight: 600;
    font-family: var(--font-mono);
    color: var(--text3);
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    padding: 2px 8px; border-radius: 4px;
  }

  /* ── FLOW ── */
  .flow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin-top: 3rem; background: var(--border); border-radius: var(--radius-lg); overflow: hidden; }

  .flow-step {
    background: var(--card);
    padding: 2rem 1.5rem; position: relative;
  }

  .flow-step:first-child { border-radius: var(--radius-lg) 0 0 var(--radius-lg); }
  .flow-step:last-child { border-radius: 0 var(--radius-lg) var(--radius-lg) 0; }

  .flow-num {
    font-family: var(--font-head); font-weight: 800;
    font-size: 3rem; line-height: 1;
    color: rgba(79,110,247,0.15);
    margin-bottom: 1rem;
  }

  .flow-title {
    font-family: var(--font-head); font-weight: 700;
    font-size: 0.95rem; color: var(--text);
    margin-bottom: 0.5rem;
  }

  .flow-desc { font-size: 0.82rem; color: var(--text2); line-height: 1.6; }

  /* ── ALERTS SECTION ── */
  .alerts-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; margin-top: 3rem; }

  .alert-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem 1.25rem;
    display: flex; align-items: flex-start; gap: 1rem;
    margin-bottom: 0.75rem; transition: all 0.2s;
  }
  .alert-card:hover { border-color: var(--border-hover); }

  .alert-icon-box {
    width: 36px; height: 36px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-size: 1rem;
  }

  .alert-title { font-weight: 600; font-size: 0.875rem; margin-bottom: 0.25rem; }
  .alert-desc { font-size: 0.8rem; color: var(--text2); line-height: 1.5; }
  .alert-time { font-size: 0.7rem; color: var(--text3); margin-top: 6px; font-family: var(--font-mono); }

  .benefits-list { list-style: none; display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 2rem; }
  .benefits-list li {
    display: flex; align-items: flex-start; gap: 12px;
    font-size: 0.9rem; color: var(--text2); line-height: 1.5;
  }
  .check-ico { color: var(--green); flex-shrink: 0; margin-top: 2px; }

  /* ── TESTIMONIALS ── */
  .testimonials-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; margin-top: 3rem; }

  .testimonial-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
  }

  .stars { color: #f59e0b; font-size: 0.875rem; margin-bottom: 1rem; letter-spacing: 2px; }
  .testimonial-text { font-size: 0.9rem; color: var(--text2); line-height: 1.7; margin-bottom: 1.25rem; font-style: italic; }
  .testimonial-author { display: flex; align-items: center; gap: 12px; }
  .author-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: var(--accent-glow); border: 1px solid rgba(79,110,247,0.3);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-head); font-weight: 700;
    font-size: 0.75rem; color: var(--accent2); flex-shrink: 0;
  }
  .author-name { font-weight: 600; font-size: 0.875rem; }
  .author-role { font-size: 0.75rem; color: var(--text3); }

  /* ── PRICING ── */
  .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; margin-top: 3rem; }

  .pricing-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 2rem 1.5rem;
    position: relative;
    transition: border-color 0.2s;
  }
  .pricing-card.featured {
    border-color: rgba(79,110,247,0.4);
    background: linear-gradient(160deg, rgba(79,110,247,0.08) 0%, var(--card) 60%);
  }

  .featured-badge {
    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
    background: var(--accent); color: #fff;
    font-size: 0.7rem; font-weight: 700;
    padding: 4px 14px; border-radius: 100px; white-space: nowrap;
    letter-spacing: 0.04em; text-transform: uppercase;
  }

  .plan-name {
    font-family: var(--font-head); font-weight: 700;
    font-size: 1rem; color: var(--text); margin-bottom: 0.5rem;
  }

  .plan-price {
    font-family: var(--font-head); font-weight: 800;
    font-size: 1.6rem; color: var(--text); margin-bottom: 0.5rem;
  }
  .plan-price-note { font-size: 0.78rem; color: var(--text3); margin-bottom: 1.25rem; }

  .plan-features { list-style: none; display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.5rem; }
  .plan-features li {
    display: flex; align-items: center; gap: 10px;
    font-size: 0.855rem; color: var(--text2);
  }
  .plan-features li::before {
    content: '✓'; color: var(--green);
    font-weight: 700; font-size: 0.75rem; flex-shrink: 0;
  }

  .plan-cta {
    display: block; text-align: center; padding: 0.7rem 1rem;
    border-radius: 8px; font-weight: 600; font-size: 0.875rem;
    text-decoration: none; transition: all 0.2s;
  }
  .plan-cta.primary {
    background: var(--accent); color: #fff; border: none;
  }
  .plan-cta.primary:hover { background: var(--accent2); box-shadow: 0 4px 20px rgba(79,110,247,0.3); }
  .plan-cta.secondary {
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border-hover); color: var(--text2);
  }
  .plan-cta.secondary:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }

  /* ── FAQ ── */
  .faq-list { max-width: 720px; margin: 3rem auto 0; display: flex; flex-direction: column; gap: 0; }

  .faq-item {
    border-bottom: 1px solid var(--border);
  }

  .faq-q {
    display: flex; justify-content: space-between; align-items: center;
    padding: 1.25rem 0;
    font-weight: 600; font-size: 0.95rem; cursor: pointer;
    color: var(--text); transition: color 0.2s; gap: 1rem;
  }
  .faq-q:hover { color: var(--accent2); }

  .faq-toggle { flex-shrink: 0; color: var(--text3); transition: transform 0.25s; }
  .faq-item.open .faq-toggle { transform: rotate(180deg); color: var(--accent2); }

  .faq-a {
    max-height: 0; overflow: hidden;
    font-size: 0.875rem; color: var(--text2); line-height: 1.7;
    transition: max-height 0.3s ease, padding 0.3s;
  }
  .faq-item.open .faq-a { max-height: 200px; padding-bottom: 1.25rem; }

  /* ── CONTACT ── */
  .contact-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 4rem; align-items: start; margin-top: 3rem; }

  .contact-info-list { list-style: none; display: flex; flex-direction: column; gap: 1.25rem; margin-top: 2rem; }
  .contact-info-list li { display: flex; align-items: center; gap: 1rem; }
  .contact-ico {
    width: 40px; height: 40px; border-radius: 10px;
    background: var(--accent-glow); border: 1px solid rgba(79,110,247,0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; flex-shrink: 0;
  }
  .contact-link { color: var(--text); text-decoration: none; font-weight: 500; font-size: 0.9rem; }
  .contact-link:hover { color: var(--accent2); }

  .contact-form {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 2rem;
  }

  .form-group { margin-bottom: 1rem; }
  .form-label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text2); margin-bottom: 0.4rem; }
  .form-input {
    width: 100%; background: rgba(255,255,255,0.04);
    border: 1px solid var(--border); border-radius: 8px;
    padding: 0.65rem 0.9rem; color: var(--text);
    font-size: 0.9rem; font-family: var(--font-body);
    outline: none; transition: border-color 0.2s;
  }
  .form-input:focus { border-color: rgba(79,110,247,0.5); background: rgba(79,110,247,0.04); }
  .form-input::placeholder { color: var(--text3); }

  .form-input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

  .form-select {
    width: 100%; background: rgba(255,255,255,0.04);
    border: 1px solid var(--border); border-radius: 8px;
    padding: 0.65rem 0.9rem; color: var(--text2);
    font-size: 0.9rem; font-family: var(--font-body);
    outline: none; cursor: pointer;
    appearance: none; transition: border-color 0.2s;
  }
  .form-select:focus { border-color: rgba(79,110,247,0.5); }

  .form-submit {
    width: 100%; background: var(--accent);
    color: #fff; padding: 0.85rem 1rem;
    border-radius: 8px; font-size: 0.95rem; font-weight: 600;
    border: none; cursor: pointer; transition: all 0.2s;
    font-family: var(--font-body); margin-top: 0.5rem;
  }
  .form-submit:hover { background: var(--accent2); box-shadow: 0 4px 20px rgba(79,110,247,0.3); }

  .form-privacy-note {
    font-size: 0.72rem; color: var(--text3); text-align: center; margin-top: 0.75rem;
  }

  /* ── FOOTER ── */
  .lp-footer {
    display: flex; justify-content: space-between; align-items: center;
    padding: 2rem clamp(1rem, 6vw, 5rem);
    border-top: 1px solid var(--border);
    background: var(--bg);
  }
  .footer-logo { font-family: var(--font-head); font-weight: 800; font-size: 1.1rem; color: var(--text); }
  .footer-logo span { color: var(--accent); }
  .footer-copy { font-size: 0.78rem; color: var(--text3); margin-top: 4px; }
  .footer-links { display: flex; gap: 1.5rem; }
  .footer-links a { font-size: 0.8rem; color: var(--text3); text-decoration: none; transition: color 0.2s; }
  .footer-links a:hover { color: var(--text2); }

  /* ── MODAL ── */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center; padding: 1rem;
  }
  .modal-box {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 2.5rem; width: 100%; max-width: 420px;
    position: relative;
  }
  .modal-close {
    position: absolute; top: 1rem; right: 1rem;
    background: rgba(255,255,255,0.05); border: 1px solid var(--border);
    color: var(--text3); width: 32px; height: 32px;
    border-radius: 8px; cursor: pointer; display: flex;
    align-items: center; justify-content: center; transition: all 0.2s;
  }
  .modal-close:hover { color: var(--text); border-color: var(--border-hover); }

  /* ── CTA BANNER ── */
  .cta-banner {
    background: linear-gradient(135deg, rgba(79,110,247,0.15) 0%, rgba(129,140,248,0.08) 100%);
    border: 1px solid rgba(79,110,247,0.2);
    border-radius: var(--radius-xl);
    padding: 4rem; text-align: center;
    position: relative; overflow: hidden;
  }
  .cta-banner::before {
    content: ''; position: absolute; top: -100px; left: 50%; transform: translateX(-50%);
    width: 500px; height: 300px;
    background: radial-gradient(circle, rgba(79,110,247,0.1) 0%, transparent 70%);
    pointer-events: none;
  }

  /* ── STICKY BAR ── */
  .sticky-bar {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 99;
    background: rgba(13,15,23,0.95); backdrop-filter: blur(20px);
    border-top: 1px solid var(--border);
    padding: 1rem clamp(1rem, 6vw, 5rem);
    display: flex; justify-content: space-between; align-items: center;
    transform: translateY(100%); transition: transform 0.3s;
  }
  .sticky-bar.visible { transform: translateY(0); }
  .sticky-bar-text { font-size: 0.9rem; color: var(--text2); }
  .sticky-bar-text strong { color: var(--text); }

  @media (max-width: 1024px) {
    .hero { grid-template-columns: 1fr; text-align: center; }
    .hero-desc { margin: 0 auto 2rem; }
    .hero-actions { justify-content: center; }
    .hero-trust { justify-content: center; }
    .stats-bar { grid-template-columns: repeat(2, 1fr); }
    .compare-grid { grid-template-columns: 1fr; }
    .modules-grid { grid-template-columns: repeat(2, 1fr); }
    .flow { grid-template-columns: 1fr 1fr; }
    .flow-step:first-child, .flow-step:last-child { border-radius: 0; }
    .alerts-layout { grid-template-columns: 1fr; }
    .testimonials-grid { grid-template-columns: 1fr; }
    .pricing-grid { grid-template-columns: 1fr; }
    .contact-layout { grid-template-columns: 1fr; }
    .nav-links { display: none; }
    .hero-visual { order: -1; }
  }

  @media (max-width: 640px) {
    .stats-bar { grid-template-columns: 1fr 1fr; }
    .modules-grid { grid-template-columns: 1fr; }
    .flow { grid-template-columns: 1fr; }
  }
`;

/* ─── ANIMATED COUNTER ─── */
function Counter({ end, suffix = '', prefix = '', duration = 2 }: { end: number; suffix?: string; prefix?: string; duration?: number }) {
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

  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

export default function LandingPage() {
  const [isLoginView, setIsLoginView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showSticky, setShowSticky] = useState(false);
  const [formData, setFormData] = useState({ nome: '', email: '', empresa: '', condomínios: '' });

  const { login } = useAuth();

  useEffect(() => {
    const handler = () => setShowSticky(window.scrollY > 500);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLogin = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login({ email, senha: password });
      const redirectPath = new URL(window.location.href).searchParams.get('redirect') || '/dashboard';
      window.location.href = redirectPath;
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação');
      setIsLoading(false);
    }
  };

  const faqs = [
    { q: 'O Datacron funciona com qualquer provedor de e-mail?', a: 'Sim. Utilizamos protocolo IMAP/POP3, compatível com Gmail, Outlook, Yahoo e qualquer servidor corporativo. A configuração leva menos de 10 minutos.' },
    { q: 'Quais concessionárias são suportadas atualmente?', a: 'Suportamos ENEL, SABESP, COMGÁS, CPFL, Light, Copel, Equatorial, Neoenergia e mais de 20 distribuidoras regionais. Novas integrações são adicionadas mensalmente.' },
    { q: 'Como funciona o desbloqueio automático de faturas com senha?', a: 'O sistema utiliza o CNPJ cadastrado do condomínio para realizar o desbloqueio automático do PDF — sem intervenção humana, com 100% de rastreabilidade.' },
    { q: 'Como o sistema avisa quando uma fatura não chega no prazo?', a: 'Você cadastra o calendário esperado de recebimento por concessionária. Se a fatura não chegar até o prazo configurado, o Datacron envia alertas por e-mail e notificação no dashboard.' },
    { q: 'Os dados ficam seguros? Atendem à LGPD?', a: 'Sim. Utilizamos criptografia AES-256 em repouso e TLS 1.3 em trânsito. Temos DPA disponível e estamos em total conformidade com a LGPD.' },
    { q: 'Em quanto tempo fica operacional após a contratação?', a: 'A maioria dos clientes está totalmente operacional em 48-72 horas. Nosso time de onboarding cuida de toda a configuração inicial.' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

        {/* ── NAV ── */}
        <nav className="lp-nav">
          <Link href="/" className="nav-logo">DATA<span>CRON</span></Link>
          <ul className="nav-links">
            <li><a href="#funcionalidades">Funcionalidades</a></li>
            <li><a href="#como-funciona">Como funciona</a></li>
            <li><a href="#planos">Planos</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
          <div className="nav-cta">
            <button className="btn-ghost" onClick={() => setIsLoginView(true)}>Entrar</button>
            <a href="#contato" className="btn-accent">Solicitar Demo →</a>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="hero">
          <div className="hero-content">
            <div className="hero-badge">RPA para Condomínios · Automação Total</div>
            <h1 className="hero-title">
              Faturas de concessionárias<br />
              <em>no automático.</em><br />
              Sem digitar nada.
            </h1>
            <p className="hero-desc">
              O Datacron monitora sua caixa de entrada, extrai dados com 99,9% de precisão, detecta anomalias e exporta para o seu ERP — 24h por dia, sem intervenção humana.
            </p>
            <div className="hero-actions">
              <a href="#contato" className="btn-hero-primary">
                <ArrowRight size={16} />
                Ver demonstração gratuita
              </a>
              <a href="#como-funciona" className="btn-hero-secondary">
                Como funciona →
              </a>
            </div>
            <div className="hero-trust">
              <div className="hero-trust-avatars">
                {['RS', 'MC', 'FP', 'AK', 'BL'].map(i => (
                  <div key={i} className="hero-trust-avatar">{i}</div>
                ))}
              </div>
              <span className="stars-mini">★★★★★</span>
              <span>+50 administradoras confiam no Datacron</span>
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
                <div className="mock-live">AO VIVO</div>
              </div>
              <div className="mock-body">
                <div className="mock-stats-row">
                  <div className="mock-stat-box">
                    <div className="mock-stat-val accent">247</div>
                    <div className="mock-stat-lbl">Faturas hoje</div>
                  </div>
                  <div className="mock-stat-box">
                    <div className="mock-stat-val green">99,9%</div>
                    <div className="mock-stat-lbl">Precisão OCR</div>
                  </div>
                  <div className="mock-stat-box">
                    <div className="mock-stat-val amber">3</div>
                    <div className="mock-stat-lbl">Alertas ativos</div>
                  </div>
                  <div className="mock-stat-box">
                    <div className="mock-stat-val">5min</div>
                    <div className="mock-stat-lbl">Ciclo varredura</div>
                  </div>
                </div>
                <div className="mock-thead">
                  <span>Concess.</span><span>Condomínio</span><span>Valor</span><span>Status</span>
                </div>
                {[
                  { tag: 'ENEL-SP', condo: 'Edifício Alfa', val: 'R$ 2.840', ok: true },
                  { tag: 'SABESP', condo: 'Cond. Primavera', val: 'R$ 1.120', ok: true },
                  { tag: 'COMGÁS', condo: 'Torre Business', val: 'R$ 892', ok: false },
                ].map((row, i) => (
                  <div key={i} className="mock-trow">
                    <span><div className="mock-tag">{row.tag}</div></span>
                    <span className="mock-condo">{row.condo}</span>
                    <span className={`mock-val ${row.ok ? '' : 'danger'}`}>{row.val}</span>
                    <span>
                      {row.ok
                        ? <span className="mock-pill pill-ok">✓ Processada</span>
                        : <span className="mock-pill pill-alert">⚠ Alerta</span>
                      }
                    </span>
                  </div>
                ))}
                <div className="mock-alert">
                  <div className="mock-alert-icon">!</div>
                  <div>
                    <strong style={{ color: 'var(--danger)' }}>Variação detectada:</strong>
                    {' '}COMGÁS · Torre Business com consumo 47% acima da média dos últimos 3 meses.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TRUST BAR (concessionárias) ── */}
        <div className="trust-bar">
          <div className="trust-bar-label">Integrado com</div>
          <div className="trust-bar-logos">
            {['ENEL-SP', 'SABESP', 'COMGÁS', 'CPFL', 'LIGHT', 'COPEL', 'EQUATORIAL', 'NEOENERGIA'].map(l => (
              <div key={l} className="trust-logo">{l}</div>
            ))}
          </div>
        </div>

        {/* ── STATS BAR ── */}
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-num"><Counter end={99} suffix=",9%" /></div>
            <div className="stat-label">Precisão de leitura OCR</div>
          </div>
          <div className="stat-item">
            <div className="stat-num"><span style={{ fontSize: '1.5rem', color: 'var(--text3)' }}>&lt;</span><Counter end={5} suffix="min" /></div>
            <div className="stat-label">Ciclo de varredura automática</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">24<span style={{ color: 'var(--text3)', fontSize: '1.5rem' }}>/7</span></div>
            <div className="stat-label">Monitoramento contínuo</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">0</div>
            <div className="stat-label">Digitação manual necessária</div>
          </div>
        </div>

        {/* ── PROBLEMA / SOLUÇÃO ── */}
        <section className="lp-section" id="funcionalidades">
          <div className="section-eyebrow">O Problema que Resolvemos</div>
          <h2 className="section-title">Do caos da caixa de entrada<br />ao <em>controle absoluto</em></h2>
          <p className="section-sub">Administradoras perdem dias todo mês fazendo manualmente o que o Datacron faz em segundos — com mais precisão e total rastreabilidade.</p>

          <div className="compare-grid">
            <div className="compare-card bad">
              <div className="compare-head bad-head">✕ Sem o Datacron</div>
              <ul className="compare-list">
                <li><div className="ico ico-bad">✕</div>Varredura manual de dezenas de e-mails por dia</li>
                <li><div className="ico ico-bad">✕</div>Digitação linha a linha no Excel — horas perdidas</li>
                <li><div className="ico ico-bad">✕</div>Dias gastos para fechar caixas de condomínio</li>
                <li><div className="ico ico-bad">✕</div>Risco alto de erros, multas por atraso e retrabalho</li>
                <li><div className="ico ico-bad">✕</div>Zero visibilidade sobre variações abusivas de consumo</li>
              </ul>
            </div>
            <div className="compare-card good">
              <div className="compare-head good-head">✓ Com o Datacron</div>
              <ul className="compare-list">
                <li><div className="ico ico-good">✓</div>Robôs varrem centenas de inboxes automaticamente</li>
                <li><div className="ico ico-good">✓</div>OCR extrai dados com 99,9% de precisão comprovada</li>
                <li><div className="ico ico-good">✓</div>Exportação instantânea pronta para o seu ERP</li>
                <li><div className="ico ico-good">✓</div>Auditoria inteligente: bloqueia faturas com variação anormal</li>
                <li><div className="ico ico-good">✓</div>Dashboard em tempo real com alertas configuráveis</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── MÓDULOS ── */}
        <section className="lp-section" style={{ background: 'var(--bg2)' }}>
          <div className="section-eyebrow">Módulos da Plataforma</div>
          <h2 className="section-title">Uma suíte completa para<br />administradoras de <em>condomínio</em></h2>

          <div className="modules-grid">
            {[
              { icon: <Mail size={18} />, title: 'Varredura de Inbox', desc: 'Agente monitora sua caixa IMAP/POP3 a cada 5 minutos. Identifica faturas de ENEL, SABESP, COMGÁS, CPFL e outras automaticamente.', tags: ['IMAP/POP3', 'Multi-inbox'], featured: false },
              { icon: <Shield size={18} />, title: 'Desbloqueio Automático', desc: 'Faturas protegidas por senha? O Datacron realiza a quebra automática via CNPJ do condomínio, sem intervenção humana.', tags: ['PDF Unlock', 'Seguro'], featured: false },
              { icon: <Zap size={18} />, title: 'OCR de Alta Precisão', desc: 'Modelos especializados extraem valores, vencimentos e código de barras com 99,9% de acurácia — sem revisão manual.', tags: ['99,9% OCR', 'IA Dedicada'], featured: true },
              { icon: <Bell size={18} />, title: 'Alertas Inteligentes', desc: 'Variações acima do limiar configurado disparam alertas imediatos. Também avisa faturas em falta antes do vencimento.', tags: ['Anti-fraude', 'Configurável'], featured: false },
              { icon: <Database size={18} />, title: 'Banco de Dados Unificado', desc: 'PostgreSQL projetado para milhões de faturas. Exportações em XLSX e API REST pronta para integração com seu ERP.', tags: ['PostgreSQL', 'API REST'], featured: false },
              { icon: <BarChart3 size={18} />, title: 'Dashboard & Relatórios', desc: 'Visibilidade total em tempo real: consumo histórico, comparativos por período e ranking de concessionárias.', tags: ['Real-time', 'Analytics'], featured: false },
            ].map((m, i) => (
              <div key={i} className={`module-card ${m.featured ? 'featured' : ''}`}>
                <div className="module-icon-wrap">{m.icon}</div>
                <div className="module-title">{m.title}</div>
                <p className="module-desc">{m.desc}</p>
                <div className="module-tags">{m.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── COMO FUNCIONA ── */}
        <section className="lp-section" id="como-funciona">
          <div className="section-eyebrow">Fluxo de Operação</div>
          <h2 className="section-title">Do e-mail ao dado estruturado<br />em <em>segundos</em></h2>

          <div className="flow">
            {[
              { n: '01', t: 'Monitoramento contínuo', d: 'O agente varre inboxes a cada 5 minutos, identificando e baixando faturas automaticamente.' },
              { n: '02', t: 'Extração e desbloqueio', d: 'Senhas quebradas via CNPJ. OCR extrai valores, vencimentos e códigos de barras.' },
              { n: '03', t: 'Auditoria inteligente', d: 'Motor de regras compara consumo com histórico. Desvios disparam alertas em tempo real.' },
              { n: '04', t: 'Exportação e integração', d: 'Dados validados vão para o banco e ficam disponíveis via API REST ou XLSX para o seu ERP.' },
            ].map((s, i) => (
              <div key={i} className="flow-step">
                <div className="flow-num">{s.n}</div>
                <div className="flow-title">{s.t}</div>
                <p className="flow-desc">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── ALERTS ── */}
        <section className="lp-section" style={{ background: 'var(--bg2)' }}>
          <div className="section-eyebrow">Sistema de Alertas</div>
          <h2 className="section-title">Nunca mais seja surpreendido<br />por uma fatura <em>fora do padrão</em></h2>

          <div className="alerts-layout">
            <div>
              <p className="section-sub" style={{ marginBottom: '2rem' }}>
                O Datacron monitora variações de consumo e o não recebimento de faturas, avisando você antes que o problema vire prejuízo.
              </p>
              <ul className="benefits-list">
                <li><Check size={16} className="check-ico" /><span>Limiar de variação configurável por condomínio</span></li>
                <li><Check size={16} className="check-ico" /><span>Alertas por e-mail e notificação no dashboard</span></li>
                <li><Check size={16} className="check-ico" /><span>Aviso antecipado de faturas não recebidas</span></li>
                <li><Check size={16} className="check-ico" /><span>Histórico completo de todas as ocorrências</span></li>
              </ul>
              <a href="#contato" className="btn-hero-primary" style={{ display: 'inline-flex', marginTop: '1rem' }}>
                Quero testar os alertas →
              </a>
            </div>
            <div>
              <div className="alert-card">
                <div className="alert-icon-box" style={{ background: 'var(--danger-bg)' }}>🚨</div>
                <div>
                  <div className="alert-title" style={{ color: 'var(--danger)' }}>Variação crítica detectada</div>
                  <div className="alert-desc">COMGÁS · Torre Business · Consumo <strong style={{ color: 'var(--danger)' }}>47% acima</strong> da média dos últimos 3 meses.</div>
                  <div className="alert-time">Detectado agora · Agente RPA</div>
                </div>
              </div>
              <div className="alert-card">
                <div className="alert-icon-box" style={{ background: 'var(--amber-bg)' }}>⏰</div>
                <div>
                  <div className="alert-title" style={{ color: 'var(--amber)' }}>Fatura não recebida</div>
                  <div className="alert-desc">ENEL-SP · Residencial Laranjeiras · Previsão dia 15 <strong style={{ color: 'var(--amber)' }}>ainda não chegou</strong>.</div>
                  <div className="alert-time">Alerta automático · 08:14</div>
                </div>
              </div>
              <div className="alert-card">
                <div className="alert-icon-box" style={{ background: 'var(--green-bg)' }}>✅</div>
                <div>
                  <div className="alert-title" style={{ color: 'var(--green)' }}>Lote processado com sucesso</div>
                  <div className="alert-desc">SABESP · 32 faturas processadas · Todas dentro do padrão histórico.</div>
                  <div className="alert-time">Concluído há 2 minutos · Ciclo automático</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="lp-section">
          <div style={{ textAlign: 'center' }}>
            <div className="section-eyebrow">Quem usa o Datacron</div>
            <h2 className="section-title">Administradoras que <em>recuperaram</em><br />horas de trabalho todo mês</h2>
          </div>

          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="stars">★★★★★</div>
              <p className="testimonial-text">"Antes gastávamos 2 dias inteiros fechando as caixas dos condomínios. Com o Datacron isso é feito automaticamente. A equipe ganhou tempo para focar no que importa."</p>
              <div className="testimonial-author">
                <div className="author-avatar">RS</div>
                <div>
                  <div className="author-name">Ricardo S.</div>
                  <div className="author-role">Diretor Operacional · Adm. Síntese</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="stars">★★★★★</div>
              <p className="testimonial-text">"O alerta de variação nos salvou de um pagamento indevido de quase R$ 4 mil. O sistema sinalizou na hora, antes mesmo de qualquer aprovação manual."</p>
              <div className="testimonial-author">
                <div className="author-avatar">MC</div>
                <div>
                  <div className="author-name">Mariana C.</div>
                  <div className="author-role">Gestora Financeira · CondoMais</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="stars">★★★★★</div>
              <p className="testimonial-text">"A integração com nosso ERP foi surpreendentemente simples. Em uma semana já tínhamos tudo funcionando e os primeiros relatórios prontos."</p>
              <div className="testimonial-author">
                <div className="author-avatar">FP</div>
                <div>
                  <div className="author-name">Felipe P.</div>
                  <div className="author-role">Gerente de TI · Grupo Patrimonial</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PLANOS ── */}
        <section className="lp-section" id="planos" style={{ background: 'var(--bg2)' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="section-eyebrow">Planos e Preços</div>
            <h2 className="section-title">Escolha o plano ideal<br />para sua <em>operação</em></h2>
            <p className="section-sub" style={{ margin: '0 auto 3rem' }}>Todos os planos incluem onboarding gratuito e suporte via e-mail.</p>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="plan-name">Starter</div>
              <div className="plan-price">Sob consulta</div>
              <div className="plan-price-note">Ideal para começar a automação</div>
              <ul className="plan-features">
                <li>Até 5 condomínios</li>
                <li>1 caixa de e-mail monitorada</li>
                <li>OCR + desbloqueio de PDF</li>
                <li>Exportação XLSX</li>
                <li>Alertas básicos de variação</li>
              </ul>
              <a href="#contato" className="plan-cta secondary">Solicitar Proposta</a>
            </div>
            <div className="pricing-card featured">
              <div className="featured-badge">MAIS POPULAR</div>
              <div className="plan-name">Professional</div>
              <div className="plan-price">Sob consulta</div>
              <div className="plan-price-note">Para operações médias a grandes</div>
              <ul className="plan-features">
                <li>Até 50 condomínios</li>
                <li>Múltiplas caixas de e-mail</li>
                <li>Alertas totalmente configuráveis</li>
                <li>Dashboard em tempo real</li>
                <li>API REST para integração ERP</li>
                <li>Suporte prioritário</li>
              </ul>
              <a href="#contato" className="plan-cta primary">Solicitar Proposta</a>
            </div>
            <div className="pricing-card">
              <div className="plan-name">Enterprise</div>
              <div className="plan-price">Personalizado</div>
              <div className="plan-price-note">Para grandes grupos e redes</div>
              <ul className="plan-features">
                <li>Condomínios ilimitados</li>
                <li>SLA garantido em contrato</li>
                <li>Integração dedicada</li>
                <li>Customizações sob demanda</li>
                <li>Gerente de conta exclusivo</li>
              </ul>
              <a href="#contato" className="plan-cta secondary">Falar com Especialista</a>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="lp-section" id="faq">
          <div style={{ textAlign: 'center' }}>
            <div className="section-eyebrow">Perguntas Frequentes</div>
            <h2 className="section-title">Tudo que você<br />precisa <em>saber</em></h2>
          </div>

          <div className="faq-list">
            {faqs.map((item, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
                <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {item.q}
                  <div className="faq-toggle"><ChevronDown size={18} /></div>
                </div>
                <div className="faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CONTATO ── */}
        <section className="lp-section" id="contato" style={{ background: 'var(--bg2)' }}>
          <div className="section-eyebrow">Fale com a Gente</div>
          <h2 className="section-title">Pronto para <em>automatizar</em><br />sua operação?</h2>

          <div className="contact-layout">
            <div>
              <p style={{ color: 'var(--text2)', marginBottom: '0.5rem', lineHeight: 1.7 }}>
                Fale com nosso time e descubra como eliminar o trabalho manual em menos de 1 semana. Respondemos em até 2 horas úteis.
              </p>
              <ul className="contact-info-list">
                <li>
                  <div className="contact-ico">✉️</div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '2px' }}>E-mail</div>
                    <a href="mailto:contato@datacron.com.br" className="contact-link">contato@datacron.com.br</a>
                  </div>
                </li>
                <li>
                  <div className="contact-ico">💬</div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '2px' }}>WhatsApp</div>
                    <a href="https://wa.me/5511999999999" className="contact-link" target="_blank" rel="noopener noreferrer">Falar agora →</a>
                  </div>
                </li>
                <li>
                  <div className="contact-ico">⏱️</div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '2px' }}>Horário</div>
                    <span style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>Seg–Sex · 9h às 18h (BRT)</span>
                  </div>
                </li>
              </ul>

              <div style={{
                marginTop: '2.5rem', padding: '1.25rem 1.5rem',
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', display: 'flex', gap: '1rem', alignItems: 'flex-start'
              }}>
                <div style={{ fontSize: '1.5rem' }}>🔒</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '4px' }}>Conformidade LGPD</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text2)', lineHeight: 1.6 }}>Todos os dados são tratados em conformidade com a Lei Geral de Proteção de Dados. DPA disponível sob solicitação.</div>
                </div>
              </div>
            </div>

            <div className="contact-form">
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.5rem' }}>Solicitar Demonstração Gratuita</h3>

              <div className="form-input-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome completo</label>
                  <input type="text" className="form-input" placeholder="João Silva"
                    value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">E-mail corporativo</label>
                  <input type="email" className="form-input" placeholder="joao@empresa.com"
                    value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Nome da administradora</label>
                <input type="text" className="form-input" placeholder="Adm. Exemplo Ltda."
                  value={formData.empresa} onChange={e => setFormData(p => ({ ...p, empresa: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Quantos condomínios você administra?</label>
                <select className="form-select"
                  value={formData.condomínios} onChange={e => setFormData(p => ({ ...p, condomínios: e.target.value }))}>
                  <option value="">Selecione...</option>
                  <option value="1-5">1 a 5</option>
                  <option value="6-20">6 a 20</option>
                  <option value="21-50">21 a 50</option>
                  <option value="50+">Mais de 50</option>
                </select>
              </div>

              <button className="form-submit" onClick={() => alert('Obrigado! Entraremos em contato em até 2 horas úteis.')}>
                Quero minha demonstração gratuita →
              </button>
              <p className="form-privacy-note">🔒 Sem spam. Seus dados são protegidos pela LGPD.</p>
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section className="lp-section">
          <div className="cta-banner">
            <div className="section-eyebrow" style={{ margin: '0 auto 1.25rem' }}>Comece hoje</div>
            <h2 className="section-title" style={{ marginBottom: '1rem' }}>Elimine o trabalho manual<br />em <em>menos de 1 semana</em></h2>
            <p style={{ color: 'var(--text2)', margin: '0 auto 2rem', maxWidth: 480, fontSize: '1rem', lineHeight: 1.7 }}>
              Onboarding guiado, sem migração complexa. Em 48–72 horas seu time já está operando no automático.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="#contato" className="btn-hero-primary">
                <ArrowRight size={16} />
                Solicitar demonstração gratuita
              </a>
              <a href="https://wa.me/5511999999999" className="btn-hero-secondary" target="_blank" rel="noopener noreferrer">
                💬 Falar no WhatsApp
              </a>
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
            <a href="mailto:contato@datacron.com.br">Contato</a>
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
                initial={{ scale: 0.92, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="modal-box"
                onClick={e => e.stopPropagation()}
              >
                <button className="modal-close" onClick={() => setIsLoginView(false)}><X size={14} /></button>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    DATA<span style={{ color: 'var(--accent)' }}>CRON</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>Acesso ao Sistema</h3>
                  <p style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>Insira suas credenciais para continuar</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {error && (
                    <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <AlertTriangle size={14} /> {error}
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">E-mail</label>
                    <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="exemplo@email.com" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Senha</label>
                    <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <button type="submit" className="form-submit" disabled={isLoading} style={{ marginTop: '0.5rem' }}>
                    {isLoading ? 'Autenticando...' : 'Entrar no Sistema →'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}