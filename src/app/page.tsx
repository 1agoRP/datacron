'use client';

import { FormEvent, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Building2,
  CalendarCheck,
  Check,
  ChevronDown,
  ClipboardCheck,
  DatabaseZap,
  Eye,
  EyeOff,
  FileSearch,
  Gauge,
  LockKeyhole,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
  Workflow,
  X,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const globalStyles = `
  :root {
    --page-bg: #10110f;
    --surface: #181a16;
    --surface-2: #20231d;
    --surface-3: #f7f3ea;
    --line: rgba(255, 255, 255, 0.12);
    --line-dark: rgba(16, 17, 15, 0.12);
    --text: #f8f5ed;
    --muted: #b7b0a3;
    --ink: #171914;
    --ink-soft: #5f6258;
    --green: #83d27a;
    --green-dark: #2f7d4a;
    --cyan: #72d7d1;
    --amber: #f1bd63;
    --red: #f07878;
    --font-main: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    background: var(--page-bg);
    color: var(--text);
    font-family: var(--font-main);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  button,
  input,
  select {
    font: inherit;
  }

  .landing-shell {
    min-height: 100vh;
    background:
      linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      var(--page-bg);
    background-size: 64px 64px;
    overflow: hidden;
  }

  .lp-nav {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 50;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 0 40px;
    background: rgba(16, 17, 15, 0.78);
    border-bottom: 1px solid var(--line);
    backdrop-filter: blur(18px);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--text);
    text-decoration: none;
    font-weight: 800;
    font-size: 1.02rem;
  }

  .brand-mark {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: inline-grid;
    place-items: center;
    color: #0e1712;
    background: var(--green);
    font-weight: 900;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 28px;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .nav-links a {
    color: var(--muted);
    font-size: 0.9rem;
    font-weight: 650;
    text-decoration: none;
  }

  .nav-links a:hover {
    color: var(--text);
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .btn,
  .nav-login {
    min-height: 42px;
    border-radius: 8px;
    border: 1px solid transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 0 16px;
    color: inherit;
    text-decoration: none;
    font-weight: 760;
    cursor: pointer;
    transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
    white-space: nowrap;
  }

  .btn:hover,
  .nav-login:hover {
    transform: translateY(-1px);
  }

  .btn-primary {
    background: var(--green);
    color: #10110f;
  }

  .btn-dark {
    background: var(--ink);
    color: var(--surface-3);
  }

  .btn-secondary,
  .nav-login {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--line);
    color: var(--text);
  }

  .hero {
    position: relative;
    min-height: 96vh;
    display: grid;
    grid-template-columns: minmax(0, 0.94fr) minmax(480px, 1.06fr);
    align-items: center;
    gap: 42px;
    padding: 132px 40px 56px;
  }

  .hero-copy {
    position: relative;
    z-index: 3;
    max-width: 680px;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid rgba(131, 210, 122, 0.34);
    color: var(--green);
    background: rgba(131, 210, 122, 0.1);
    font-size: 0.78rem;
    font-weight: 780;
    text-transform: uppercase;
  }

  .hero h1,
  .section-title,
  .lead-card h2 {
    margin: 0;
    letter-spacing: 0;
    line-height: 1.03;
    font-weight: 900;
  }

  .hero h1 {
    margin-top: 24px;
    font-size: 4rem;
    max-width: 760px;
  }

  .hero h1 span {
    color: var(--green);
  }

  .hero-subtitle {
    margin: 22px 0 0;
    max-width: 620px;
    color: var(--muted);
    font-size: 1.12rem;
  }

  .hero-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 32px;
  }

  .trust-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 34px;
    max-width: 620px;
  }

  .trust-item {
    min-height: 86px;
    padding: 14px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.055);
  }

  .trust-number {
    display: block;
    color: var(--text);
    font-size: 1.18rem;
    font-weight: 880;
  }

  .trust-label {
    display: block;
    margin-top: 4px;
    color: var(--muted);
    font-size: 0.82rem;
  }

  .product-stage {
    position: relative;
    min-height: 610px;
    z-index: 2;
  }

  .dashboard-canvas {
    position: absolute;
    inset: 0 -40px 0 0;
    display: grid;
    grid-template-columns: 88px minmax(0, 1fr);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px 0 0 8px;
    background: #f7f3ea;
    box-shadow: 0 34px 90px rgba(0, 0, 0, 0.42);
  }

  .app-rail {
    background: #151713;
    padding: 18px 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .rail-dot,
  .rail-icon {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    background: rgba(255, 255, 255, 0.08);
    color: var(--muted);
  }

  .rail-dot {
    background: var(--green);
    color: #0f1410;
    font-weight: 900;
  }

  .rail-spacer {
    flex: 1;
  }

  .app-screen {
    color: var(--ink);
    padding: 28px;
    background:
      linear-gradient(rgba(16, 17, 15, 0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(16, 17, 15, 0.06) 1px, transparent 1px),
      #f7f3ea;
    background-size: 42px 42px;
  }

  .screen-top {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
  }

  .screen-top h2 {
    margin: 0;
    font-size: 1.45rem;
    letter-spacing: 0;
    line-height: 1.12;
  }

  .screen-top p {
    margin: 8px 0 0;
    color: var(--ink-soft);
    font-size: 0.92rem;
  }

  .live-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 12px;
    border-radius: 8px;
    background: #d9f3d3;
    color: #235d34;
    font-size: 0.78rem;
    font-weight: 820;
  }

  .live-badge::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 99px;
    background: #32a95a;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-top: 26px;
  }

  .metric-card {
    min-height: 102px;
    border-radius: 8px;
    padding: 14px;
    border: 1px solid var(--line-dark);
    background: rgba(255, 255, 255, 0.64);
  }

  .metric-card strong {
    display: block;
    margin-top: 11px;
    font-size: 1.34rem;
    color: var(--ink);
  }

  .metric-card span {
    display: block;
    margin-top: 4px;
    color: var(--ink-soft);
    font-size: 0.78rem;
    font-weight: 650;
  }

  .pipeline {
    display: grid;
    grid-template-columns: 1.25fr 0.75fr;
    gap: 14px;
    margin-top: 18px;
  }

  .table-panel,
  .insight-panel,
  .activity-panel {
    border-radius: 8px;
    border: 1px solid var(--line-dark);
    background: rgba(255, 255, 255, 0.72);
    overflow: hidden;
  }

  .panel-head {
    min-height: 48px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--line-dark);
    font-size: 0.84rem;
    font-weight: 820;
  }

  .table-row {
    display: grid;
    grid-template-columns: 1fr 1fr 0.8fr 0.9fr;
    gap: 10px;
    min-height: 54px;
    align-items: center;
    padding: 0 14px;
    border-bottom: 1px solid rgba(16, 17, 15, 0.08);
    font-size: 0.8rem;
  }

  .table-row:last-child {
    border-bottom: 0;
  }

  .status {
    min-height: 28px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 9px;
    font-weight: 760;
    font-size: 0.72rem;
  }

  .status-ok {
    background: #dff5d9;
    color: #246335;
  }

  .status-warn {
    background: #fff0cc;
    color: #805116;
  }

  .insight-list {
    display: grid;
    gap: 10px;
    padding: 14px;
  }

  .insight {
    border-radius: 8px;
    background: rgba(16, 17, 15, 0.05);
    padding: 12px;
    font-size: 0.78rem;
    color: var(--ink-soft);
  }

  .insight strong {
    display: block;
    color: var(--ink);
    margin-bottom: 4px;
  }

  .activity-panel {
    margin-top: 14px;
  }

  .activity-flow {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    padding: 14px;
  }

  .activity-step {
    min-height: 88px;
    border-radius: 8px;
    background: rgba(16, 17, 15, 0.05);
    padding: 12px;
    color: var(--ink-soft);
    font-size: 0.76rem;
  }

  .activity-step svg {
    color: var(--green-dark);
    margin-bottom: 8px;
  }

  .logo-strip {
    padding: 22px 40px;
    border-block: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.045);
  }

  .logo-strip-inner {
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 170px 1fr;
    align-items: center;
    gap: 22px;
  }

  .logo-strip span {
    color: var(--muted);
    font-weight: 750;
    font-size: 0.88rem;
  }

  .logo-cloud {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .logo-cloud b {
    min-height: 36px;
    border-radius: 8px;
    border: 1px solid var(--line);
    padding: 8px 12px;
    display: inline-flex;
    align-items: center;
    color: var(--text);
    font-size: 0.78rem;
  }

  .section {
    padding: 96px 40px;
  }

  .section.light {
    background: var(--surface-3);
    color: var(--ink);
  }

  .section-inner {
    max-width: 1180px;
    margin: 0 auto;
  }

  .section-kicker {
    color: var(--green);
    font-size: 0.78rem;
    font-weight: 850;
    text-transform: uppercase;
  }

  .section.light .section-kicker {
    color: var(--green-dark);
  }

  .section-title {
    margin-top: 12px;
    font-size: 2.75rem;
    max-width: 800px;
  }

  .section-title.center,
  .section-sub.center {
    text-align: center;
    margin-left: auto;
    margin-right: auto;
  }

  .section-sub {
    margin: 18px 0 0;
    max-width: 680px;
    color: var(--muted);
    font-size: 1.02rem;
  }

  .section.light .section-sub {
    color: var(--ink-soft);
  }

  .pain-grid,
  .feature-grid,
  .proof-grid,
  .pricing-grid {
    display: grid;
    gap: 16px;
    margin-top: 36px;
  }

  .pain-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .feature-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .proof-grid {
    grid-template-columns: 0.8fr 1.2fr;
  }

  .pricing-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .pain-card,
  .feature-card,
  .price-card,
  .faq-item {
    border-radius: 8px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.055);
    padding: 20px;
  }

  .section.light .pain-card,
  .section.light .feature-card,
  .section.light .price-card,
  .section.light .faq-item {
    background: rgba(255, 255, 255, 0.72);
    border-color: var(--line-dark);
  }

  .card-icon {
    width: 42px;
    height: 42px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    background: rgba(131, 210, 122, 0.14);
    color: var(--green);
  }

  .section.light .card-icon {
    color: var(--green-dark);
    background: #dff2d6;
  }

  .pain-card h3,
  .feature-card h3,
  .price-card h3 {
    margin: 18px 0 8px;
    font-size: 1rem;
    letter-spacing: 0;
  }

  .pain-card p,
  .feature-card p,
  .price-card p {
    margin: 0;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .section.light .pain-card p,
  .section.light .feature-card p,
  .section.light .price-card p {
    color: var(--ink-soft);
  }

  .proof-panel {
    border-radius: 8px;
    padding: 28px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.055);
  }

  .proof-panel strong {
    display: block;
    font-size: 3rem;
    line-height: 1;
    color: var(--green);
  }

  .proof-panel p {
    color: var(--muted);
    margin: 12px 0 0;
  }

  .process-list {
    display: grid;
    gap: 12px;
  }

  .process-row {
    display: grid;
    grid-template-columns: 54px 1fr;
    gap: 14px;
    align-items: start;
    padding: 18px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.055);
  }

  .step-number {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    background: var(--green);
    color: #11150f;
    font-weight: 900;
  }

  .process-row h3 {
    margin: 0 0 6px;
    font-size: 1rem;
  }

  .process-row p {
    margin: 0;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .lead-section {
    padding: 96px 40px 116px;
    background: var(--surface-3);
    color: var(--ink);
  }

  .lead-card {
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 0.85fr 1.15fr;
    gap: 34px;
    align-items: stretch;
  }

  .lead-copy {
    border-radius: 8px;
    padding: 34px;
    background: #171914;
    color: var(--text);
  }

  .lead-copy h2 {
    font-size: 2.4rem;
  }

  .lead-copy p {
    color: var(--muted);
    margin: 18px 0 0;
  }

  .lead-list {
    display: grid;
    gap: 13px;
    margin: 26px 0 0;
    padding: 0;
    list-style: none;
  }

  .lead-list li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    color: var(--text);
    font-weight: 650;
  }

  .lead-form {
    border-radius: 8px;
    border: 1px solid var(--line-dark);
    background: rgba(255, 255, 255, 0.78);
    padding: 28px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .form-group {
    display: grid;
    gap: 7px;
  }

  .form-group.full {
    grid-column: 1 / -1;
  }

  .form-label {
    color: inherit;
    font-size: 0.82rem;
    font-weight: 780;
  }

  .form-input,
  .form-select {
    width: 100%;
    height: 46px;
    border-radius: 8px;
    border: 1px solid rgba(16, 17, 15, 0.16);
    background: #fffdf8;
    color: var(--ink);
    padding: 0 13px;
    outline: none;
  }

  .modal-box .form-input {
    border-color: var(--line);
    background: rgba(255, 255, 255, 0.06);
    color: var(--text);
  }

  .form-input:focus,
  .form-select:focus {
    border-color: var(--green-dark);
    box-shadow: 0 0 0 3px rgba(47, 125, 74, 0.15);
  }

  .form-submit {
    width: 100%;
    height: 50px;
    margin-top: 18px;
    border: 0;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    cursor: pointer;
    background: var(--green-dark);
    color: white;
    font-weight: 820;
  }

  .form-note,
  .success-note {
    margin: 12px 0 0;
    color: var(--ink-soft);
    font-size: 0.82rem;
  }

  .success-note {
    color: var(--green-dark);
    font-weight: 760;
  }

  .price-card.featured {
    background: #171914;
    color: var(--text);
    border-color: rgba(131, 210, 122, 0.38);
  }

  .price-tag {
    display: inline-flex;
    height: 30px;
    align-items: center;
    padding: 0 10px;
    border-radius: 8px;
    background: rgba(131, 210, 122, 0.16);
    color: var(--green);
    font-size: 0.75rem;
    font-weight: 850;
  }

  .feature-list {
    display: grid;
    gap: 10px;
    padding: 0;
    margin: 20px 0 0;
    list-style: none;
  }

  .feature-list li {
    display: flex;
    gap: 9px;
    align-items: flex-start;
    color: inherit;
    font-size: 0.9rem;
  }

  .faq-list {
    display: grid;
    gap: 12px;
    margin: 36px auto 0;
    max-width: 880px;
  }

  .faq-question {
    width: 100%;
    border: 0;
    background: transparent;
    color: inherit;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    cursor: pointer;
    text-align: left;
    font-weight: 850;
  }

  .faq-answer {
    margin: 13px 0 0;
    color: var(--ink-soft);
    font-size: 0.95rem;
  }

  .footer {
    padding: 30px 40px;
    border-top: 1px solid var(--line);
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: center;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .footer a {
    color: var(--text);
    text-decoration: none;
    margin-left: 18px;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(0, 0, 0, 0.72);
    backdrop-filter: blur(12px);
  }

  .modal-box {
    width: min(420px, 100%);
    border-radius: 8px;
    border: 1px solid var(--line);
    background: #181a16;
    padding: 28px;
    color: var(--text);
    position: relative;
    box-shadow: 0 34px 90px rgba(0, 0, 0, 0.45);
  }

  .modal-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.06);
    color: var(--text);
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .login-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 12px;
    border-radius: 8px;
    color: #ffd5d5;
    background: rgba(240, 120, 120, 0.12);
    border: 1px solid rgba(240, 120, 120, 0.25);
    font-size: 0.86rem;
  }

  .password-toggle {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 32px;
    height: 32px;
    border: 0;
    color: var(--muted);
    background: transparent;
    cursor: pointer;
    display: grid;
    place-items: center;
  }

  @media (max-width: 1120px) {
    .hero {
      grid-template-columns: 1fr;
      min-height: auto;
    }

    .product-stage {
      min-height: 560px;
    }

    .dashboard-canvas {
      inset: 0;
      border-radius: 8px;
    }

    .pain-grid,
    .feature-grid,
    .pricing-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 820px) {
    .lp-nav {
      padding: 0 18px;
    }

    .nav-links {
      display: none;
    }

    .nav-actions .btn-primary {
      display: none;
    }

    .hero,
    .section,
    .lead-section,
    .logo-strip,
    .footer {
      padding-left: 18px;
      padding-right: 18px;
    }

    .hero h1 {
      font-size: 2.45rem;
    }

    .section-title {
      font-size: 2rem;
    }

    .trust-row,
    .metric-grid,
    .pipeline,
    .proof-grid,
    .lead-card,
    .form-grid,
    .activity-flow,
    .logo-strip-inner,
    .pain-grid,
    .feature-grid,
    .pricing-grid {
      grid-template-columns: 1fr;
    }

    .product-stage {
      min-height: 660px;
    }

    .dashboard-canvas {
      grid-template-columns: 1fr;
    }

    .app-rail {
      display: none;
    }

    .app-screen {
      padding: 18px;
    }

    .screen-top {
      flex-direction: column;
    }

    .table-row {
      grid-template-columns: 1fr;
      align-items: start;
      padding-block: 12px;
    }

    .footer {
      align-items: flex-start;
      flex-direction: column;
    }

    .footer a {
      display: inline-block;
      margin: 6px 14px 0 0;
    }
  }
`;

const painPoints = [
  {
    icon: TimerReset,
    title: 'Dias presos em faturas',
    text: 'Seu time deixa de atuar estrategicamente porque precisa baixar, abrir, conferir e lançar arquivos manualmente.',
  },
  {
    icon: BellRing,
    title: 'Atrasos viram urgência',
    text: 'Uma fatura que não chegou no prazo só aparece quando já está perto do vencimento.',
  },
  {
    icon: FileSearch,
    title: 'Pouca rastreabilidade',
    text: 'Sem histórico claro, fica difícil provar quando a fatura chegou, quem tratou e o que foi validado.',
  },
  {
    icon: TrendingUp,
    title: 'Variações passam batido',
    text: 'Consumos fora do padrão podem gerar pagamentos indevidos antes de alguém perceber.',
  },
];

const features = [
  {
    icon: Mail,
    title: 'Captura automática',
    text: 'Monitora caixas de e-mail, identifica concessionárias e organiza anexos por condomínio.',
  },
  {
    icon: DatabaseZap,
    title: 'Dados prontos para operação',
    text: 'Extrai valores, vencimentos, códigos de barras e competência para consulta, exportação e integração.',
  },
  {
    icon: BellRing,
    title: 'Alertas antes do problema',
    text: 'Avisa faturas ausentes, variações de consumo e pendências que precisam de ação.',
  },
  {
    icon: Building2,
    title: 'Visão por condomínio',
    text: 'Centraliza documentos, histórico, status e indicadores por carteira de condomínios.',
  },
  {
    icon: ClipboardCheck,
    title: 'Conferência operacional',
    text: 'Cria uma trilha de auditoria para reduzir retrabalho e manter o fechamento previsível.',
  },
  {
    icon: ShieldCheck,
    title: 'Controle com segurança',
    text: 'Permissões por perfil, acesso autenticado e base preparada para LGPD.',
  },
];

const process = [
  ['01', 'Conectar', 'Você cadastra condomínios, concessionárias e caixas de e-mail usadas na operação.'],
  ['02', 'Capturar', 'O Datacron varre a entrada, localiza faturas e organiza arquivos automaticamente.'],
  ['03', 'Validar', 'O sistema extrai dados, confere padrões e sinaliza divergências antes do lançamento.'],
  ['04', 'Acompanhar', 'Sua equipe acompanha status, alertas, histórico e exportações em um painel único.'],
];

const faqs = [
  {
    q: 'O Datacron substitui meu ERP?',
    a: 'Não. Ele atua antes do ERP: captura, organiza, valida e estrutura as informações para reduzir trabalho manual e facilitar integração.',
  },
  {
    q: 'Funciona para administradoras pequenas?',
    a: 'Sim. A proposta é começar com uma carteira enxuta e escalar conforme a quantidade de condomínios e caixas monitoradas cresce.',
  },
  {
    q: 'Como vocês lidam com faturas que não chegam?',
    a: 'O sistema usa regras de previsão por condomínio e concessionária. Quando o documento esperado não aparece, um alerta é gerado.',
  },
  {
    q: 'A implantação exige troca de processo?',
    a: 'A implantação é gradual. O objetivo é manter o fluxo conhecido pela equipe e automatizar as etapas repetitivas primeiro.',
  },
];

export default function LandingPage() {
  const [isLoginView, setIsLoginView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [leadSent, setLeadSent] = useState(false);
  const [lead, setLead] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    empresa: '',
    condominios: '',
  });

  const { login } = useAuth();

  const whatsappLink = useMemo(() => {
    const message = `Olá, quero conhecer o Datacron. Nome: ${lead.nome || '-'} | Empresa: ${lead.empresa || '-'} | Condomínios: ${lead.condominios || '-'}`;
    return `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;
  }, [lead.nome, lead.empresa, lead.condominios]);

  const handleLogin = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login({ email, senha: password });
      let redirectPath = new URL(window.location.href).searchParams.get('redirect');

      if (!redirectPath) {
        const operacaoRoles = ['concessionarias', 'contabilidade', 'emissao', 'orçamento'];
        redirectPath = operacaoRoles.includes(user.role) ? '/condominios' : '/dashboard';
      }

      window.location.href = redirectPath;
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação');
      setIsLoading(false);
    }
  };

  const handleLeadSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLeadSent(true);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      <main className="landing-shell">
        <nav className="lp-nav">
          <Link href="/" className="brand" aria-label="Datacron">
            <span className="brand-mark">D</span>
            <span>Datacron</span>
          </Link>
          <ul className="nav-links">
            <li><a href="#produto">Produto</a></li>
            <li><a href="#como-funciona">Como funciona</a></li>
            <li><a href="#planos">Planos</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
          <div className="nav-actions">
            <button className="nav-login" type="button" onClick={() => setIsLoginView(true)}>
              Entrar
            </button>
            <a className="btn btn-primary" href="#diagnostico">
              Diagnóstico grátis
            </a>
          </div>
        </nav>

        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={15} />
              Microsaas para administradoras de condomínios
            </span>
            <h1>
              Datacron: automação financeira para condomínios <span>sem trabalho manual</span>
            </h1>
            <p className="hero-subtitle">
              Capture faturas, acompanhe pendências, detecte variações e tenha uma operação mais previsível para todos os condomínios da sua carteira.
            </p>

            <div className="hero-actions">
              <a className="btn btn-primary" href="#diagnostico">
                Quero gerar economia
                <ArrowRight size={18} />
              </a>
              <a className="btn btn-secondary" href="#produto">
                Ver plataforma
              </a>
            </div>

            <div className="trust-row" aria-label="Indicadores do Datacron">
              <div className="trust-item">
                <span className="trust-number">24h</span>
                <span className="trust-label">monitorando faturas e pendências</span>
              </div>
              <div className="trust-item">
                <span className="trust-number">0 planilhas</span>
                <span className="trust-label">para controlar recebimento manualmente</span>
              </div>
              <div className="trust-item">
                <span className="trust-number">1 painel</span>
                <span className="trust-label">para síndico, financeiro e operação</span>
              </div>
            </div>
          </div>

          <div className="product-stage" aria-label="Prévia visual da plataforma">
            <div className="dashboard-canvas">
              <aside className="app-rail">
                <div className="rail-dot">D</div>
                <div className="rail-icon"><Building2 size={19} /></div>
                <div className="rail-icon"><FileSearch size={19} /></div>
                <div className="rail-icon"><BellRing size={19} /></div>
                <div className="rail-icon"><BarChart3 size={19} /></div>
                <div className="rail-spacer" />
                <div className="rail-icon"><LockKeyhole size={19} /></div>
              </aside>

              <div className="app-screen">
                <div className="screen-top">
                  <div>
                    <h2>Central de faturas e alertas</h2>
                    <p>Carteira ativa: 86 condomínios · Maio de 2026</p>
                  </div>
                  <span className="live-badge">Operação ativa</span>
                </div>

                <div className="metric-grid">
                  <div className="metric-card">
                    <Gauge size={18} color="#2f7d4a" />
                    <strong>312</strong>
                    <span>faturas localizadas</span>
                  </div>
                  <div className="metric-card">
                    <CalendarCheck size={18} color="#2f7d4a" />
                    <strong>94%</strong>
                    <span>dentro do prazo</span>
                  </div>
                  <div className="metric-card">
                    <BellRing size={18} color="#9b641c" />
                    <strong>7</strong>
                    <span>alertas de atenção</span>
                  </div>
                  <div className="metric-card">
                    <Workflow size={18} color="#21756f" />
                    <strong>18h</strong>
                    <span>economizadas na semana</span>
                  </div>
                </div>

                <div className="pipeline">
                  <div className="table-panel">
                    <div className="panel-head">
                      <span>Últimas faturas</span>
                      <span>Hoje</span>
                    </div>
                    {[
                      ['SABESP', 'Ed. Monte Alto', 'R$ 1.284,90', 'Validada'],
                      ['ENEL', 'Villa Jardim', 'R$ 3.420,18', 'Pendente'],
                      ['COMGÁS', 'Parque Central', 'R$ 874,22', 'Validada'],
                      ['CPFL', 'Portal das Flores', 'R$ 2.113,50', 'Validada'],
                    ].map((row) => (
                      <div className="table-row" key={`${row[0]}-${row[1]}`}>
                        <strong>{row[0]}</strong>
                        <span>{row[1]}</span>
                        <span>{row[2]}</span>
                        <span className={`status ${row[3] === 'Validada' ? 'status-ok' : 'status-warn'}`}>
                          {row[3]}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="insight-panel">
                    <div className="panel-head">
                      <span>Prioridades</span>
                    </div>
                    <div className="insight-list">
                      <div className="insight">
                        <strong>Fatura ausente</strong>
                        ENEL do Villa Jardim prevista para hoje.
                      </div>
                      <div className="insight">
                        <strong>Consumo fora do padrão</strong>
                        Água 31% acima da média no Ed. Monte Alto.
                      </div>
                      <div className="insight">
                        <strong>Contrato sem aceite</strong>
                        Atualização pendente em 2 condomínios.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="activity-panel">
                  <div className="activity-flow">
                    <div className="activity-step"><Mail size={18} />Captura no e-mail</div>
                    <div className="activity-step"><FileSearch size={18} />Leitura e validação</div>
                    <div className="activity-step"><BellRing size={18} />Alerta operacional</div>
                    <div className="activity-step"><DatabaseZap size={18} />Dados centralizados</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="logo-strip">
          <div className="logo-strip-inner">
            <span>Preparado para rotinas com</span>
            <div className="logo-cloud">
              {['ENEL', 'SABESP', 'COMGÁS', 'CPFL', 'Light', 'Neoenergia', 'Equatorial'].map((item) => (
                <b key={item}>{item}</b>
              ))}
            </div>
          </div>
        </div>

        <section className="section light" id="produto">
          <div className="section-inner">
            <span className="section-kicker">Por que vender agora</span>
            <h2 className="section-title">Administradoras crescem, mas a rotina financeira continua manual demais.</h2>
            <p className="section-sub">
              A landing agora posiciona o Datacron como economia de tempo, controle e previsibilidade operacional, os três motivos que movem a conversa comercial.
            </p>

            <div className="pain-grid">
              {painPoints.map((item) => {
                const Icon = item.icon;
                return (
                  <article className="pain-card" key={item.title}>
                    <div className="card-icon"><Icon size={20} /></div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-inner">
            <span className="section-kicker">Plataforma</span>
            <h2 className="section-title">Um painel para transformar faturas em decisões.</h2>
            <p className="section-sub">
              O Datacron organiza a operação por condomínio, reduz lançamentos manuais e mostra o que precisa de atenção antes do fechamento.
            </p>

            <div className="feature-grid">
              {features.map((item) => {
                const Icon = item.icon;
                return (
                  <article className="feature-card" key={item.title}>
                    <div className="card-icon"><Icon size={20} /></div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section" id="como-funciona">
          <div className="section-inner">
            <div className="proof-grid">
              <div className="proof-panel">
                <span className="section-kicker">Implantação guiada</span>
                <strong>7 dias</strong>
                <p>Uma primeira rotina pode ser configurada em poucos dias, começando pelos condomínios com maior volume de faturas.</p>
              </div>

              <div className="process-list">
                {process.map(([number, title, text]) => (
                  <div className="process-row" key={number}>
                    <div className="step-number">{number}</div>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="lead-section" id="diagnostico">
          <div className="lead-card">
            <div className="lead-copy">
              <span className="eyebrow">
                <MessageCircle size={15} />
                Captação de lead qualificado
              </span>
              <h2>Receba um diagnóstico da sua rotina de faturas.</h2>
              <p>
                Conte quantos condomínios administra e veja onde o Datacron pode reduzir atrasos, retrabalho e perda de visibilidade.
              </p>
              <ul className="lead-list">
                <li><Check size={18} color="#83d27a" /> Mapeamento de gargalos atuais</li>
                <li><Check size={18} color="#83d27a" /> Estimativa de horas economizadas</li>
                <li><Check size={18} color="#83d27a" /> Sugestão de implantação por prioridade</li>
              </ul>
            </div>

            <form className="lead-form" onSubmit={handleLeadSubmit}>
              <div className="form-grid">
                <label className="form-group">
                  <span className="form-label">Nome</span>
                  <input
                    className="form-input"
                    value={lead.nome}
                    onChange={(e) => setLead((current) => ({ ...current, nome: e.target.value }))}
                    placeholder="Seu nome"
                    required
                  />
                </label>
                <label className="form-group">
                  <span className="form-label">E-mail corporativo</span>
                  <input
                    className="form-input"
                    type="email"
                    value={lead.email}
                    onChange={(e) => setLead((current) => ({ ...current, email: e.target.value }))}
                    placeholder="voce@empresa.com.br"
                    required
                  />
                </label>
                <label className="form-group">
                  <span className="form-label">WhatsApp</span>
                  <input
                    className="form-input"
                    value={lead.whatsapp}
                    onChange={(e) => setLead((current) => ({ ...current, whatsapp: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </label>
                <label className="form-group">
                  <span className="form-label">Administradora</span>
                  <input
                    className="form-input"
                    value={lead.empresa}
                    onChange={(e) => setLead((current) => ({ ...current, empresa: e.target.value }))}
                    placeholder="Nome da empresa"
                    required
                  />
                </label>
                <label className="form-group full">
                  <span className="form-label">Condomínios administrados</span>
                  <select
                    className="form-select"
                    value={lead.condominios}
                    onChange={(e) => setLead((current) => ({ ...current, condominios: e.target.value }))}
                    required
                  >
                    <option value="">Selecione uma faixa</option>
                    <option value="1 a 10">1 a 10</option>
                    <option value="11 a 30">11 a 30</option>
                    <option value="31 a 80">31 a 80</option>
                    <option value="Mais de 80">Mais de 80</option>
                  </select>
                </label>
              </div>

              <button className="form-submit" type="submit">
                Quero meu diagnóstico
                <ArrowRight size={18} />
              </button>
              <p className="form-note">
                Também pode chamar direto pelo WhatsApp: <a href={whatsappLink} target="_blank" rel="noreferrer">abrir conversa</a>.
              </p>
              {leadSent && (
                <p className="success-note">
                  Interesse registrado na página. Para captação automática em CRM, conecte este formulário a um endpoint de leads.
                </p>
              )}
            </form>
          </div>
        </section>

        <section className="section light" id="planos">
          <div className="section-inner">
            <span className="section-kicker">Planos</span>
            <h2 className="section-title">Entrada simples para vender rápido e expandir depois.</h2>
            <p className="section-sub">A estrutura comercial prioriza diagnóstico, implantação e evolução por volume de condomínios.</p>

            <div className="pricing-grid">
              <article className="price-card">
                <span className="price-tag">Starter</span>
                <h3>Primeira carteira</h3>
                <p>Para validar automação em um grupo inicial de condomínios.</p>
                <ul className="feature-list">
                  <li><Check size={16} /> Captura de faturas</li>
                  <li><Check size={16} /> Painel operacional</li>
                  <li><Check size={16} /> Exportação básica</li>
                </ul>
              </article>
              <article className="price-card featured">
                <span className="price-tag">Mais indicado</span>
                <h3>Operação ativa</h3>
                <p>Para administradoras que querem controle recorrente e alertas por carteira.</p>
                <ul className="feature-list">
                  <li><Check size={16} /> Alertas de ausência e variação</li>
                  <li><Check size={16} /> Múltiplas caixas monitoradas</li>
                  <li><Check size={16} /> Relatórios e auditoria</li>
                </ul>
              </article>
              <article className="price-card">
                <span className="price-tag">Enterprise</span>
                <h3>Alto volume</h3>
                <p>Para grupos com integrações, permissões e regras operacionais específicas.</p>
                <ul className="feature-list">
                  <li><Check size={16} /> Integração dedicada</li>
                  <li><Check size={16} /> Parametrizações avançadas</li>
                  <li><Check size={16} /> Acompanhamento próximo</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="section light" id="faq">
          <div className="section-inner">
            <span className="section-kicker">FAQ</span>
            <h2 className="section-title center">Perguntas que destravam a decisão.</h2>
            <p className="section-sub center">Respostas diretas para quem precisa entender implantação, uso e encaixe no processo atual.</p>

            <div className="faq-list">
              {faqs.map((item, index) => (
                <article className="faq-item" key={item.q}>
                  <button
                    className="faq-question"
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    {item.q}
                    <ChevronDown size={18} />
                  </button>
                  {openFaq === index && <p className="faq-answer">{item.a}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>

        <footer className="footer">
          <div>
            <strong>Datacron</strong>
            <span> · Automação financeira para condomínios</span>
          </div>
          <div>
            <a href="mailto:contato@datacron.com.br">Contato</a>
            <Link href="/politica-de-privacidade">Privacidade</Link>
            <Link href="/termos-de-uso">Termos</Link>
          </div>
        </footer>

        <AnimatePresence>
          {isLoginView && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginView(false)}
            >
              <motion.div
                className="modal-box"
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.96 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button className="modal-close" type="button" onClick={() => setIsLoginView(false)} aria-label="Fechar">
                  <X size={16} />
                </button>

                <div style={{ marginBottom: 24 }}>
                  <div className="brand" style={{ marginBottom: 16 }}>
                    <span className="brand-mark">D</span>
                    <span>Datacron</span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', letterSpacing: 0 }}>Acesso ao sistema</h2>
                  <p style={{ margin: '7px 0 0', color: 'var(--muted)', fontSize: '0.92rem' }}>
                    Entre para continuar sua operação.
                  </p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'grid', gap: 14 }}>
                  {error && (
                    <div className="login-error">
                      <AlertTriangle size={16} />
                      {error}
                    </div>
                  )}
                  <label className="form-group">
                    <span className="form-label">E-mail</span>
                    <input
                      className="form-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemplo@email.com"
                      required
                    />
                  </label>
                  <label className="form-group">
                    <span className="form-label">Senha</span>
                    <span style={{ position: 'relative', display: 'block' }}>
                      <input
                        className="form-input"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sua senha"
                        style={{ paddingRight: 46 }}
                        required
                      />
                      <button
                        className="password-toggle"
                        type="button"
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </span>
                  </label>
                  <button className="form-submit" type="submit" disabled={isLoading} style={{ marginTop: 4 }}>
                    {isLoading ? 'Autenticando...' : 'Entrar no sistema'}
                    {!isLoading && <ArrowRight size={18} />}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}
