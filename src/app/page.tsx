'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  Clock,
  DatabaseZap,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MessageCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const globalStyles = `
  :root {
    --fox-bg: #070808;
    --fox-bg-2: #0f1113;
    --fox-panel: #151719;
    --fox-panel-2: #1b1e21;
    --fox-line: rgba(255, 255, 255, 0.1);
    --fox-line-strong: rgba(255, 255, 255, 0.18);
    --fox-orange: #ff6a00;
    --fox-orange-2: #ff9f1c;
    --fox-ink: #f7f3ed;
    --fox-muted: #a8adb3;
    --fox-soft: #6f7780;
    --fox-green: #35d07f;
    --fox-blue: #65a8ff;
    --fox-danger: #ff5c5c;
    --fox-shadow: 0 24px 70px rgba(0, 0, 0, 0.34);
    --font-head: 'Outfit', system-ui, sans-serif;
    --font-body: 'Outfit', system-ui, sans-serif;
  }

  html { scroll-behavior: smooth; }

  body {
    background: var(--fox-bg);
    color: var(--fox-ink);
    font-family: var(--font-body);
  }

  .fox-page {
    min-height: 100vh;
    background:
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(180deg, rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(180deg, #070808 0%, #0d0f11 44%, #080909 100%);
    background-size: 72px 72px, 72px 72px, auto;
    overflow-x: hidden;
  }

  .lp-nav {
    position: fixed;
    inset: 0 0 auto;
    z-index: 50;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 0 clamp(18px, 5vw, 72px);
    background: rgba(7, 8, 8, 0.82);
    border-bottom: 1px solid var(--fox-line);
    backdrop-filter: blur(18px);
  }

  .brand-mark {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    color: var(--fox-ink);
    text-decoration: none;
    font-weight: 800;
    letter-spacing: 0;
  }

  .brand-mark img { width: 58px; height: 58px; object-fit: contain; object-position: left center; }

  .brand-name { font-size: 1.08rem; }
  .brand-name span { color: var(--fox-orange-2); }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 28px;
    list-style: none;
  }

  .nav-links a {
    color: var(--fox-muted);
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .nav-links a:hover { color: var(--fox-ink); }

  .nav-actions { display: flex; align-items: center; gap: 10px; }

  .btn {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 8px;
    padding: 0 16px;
    font-family: var(--font-body);
    font-size: 0.92rem;
    font-weight: 700;
    line-height: 1;
    text-decoration: none;
    transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--fox-orange), var(--fox-orange-2));
    color: #171008;
    border: 1px solid rgba(255, 159, 28, 0.45);
    box-shadow: 0 14px 34px rgba(255, 106, 0, 0.22);
  }

  .btn-primary:hover { transform: translateY(-2px); }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.04);
    color: var(--fox-ink);
    border: 1px solid var(--fox-line-strong);
  }

  .btn-secondary:hover {
    border-color: rgba(255, 159, 28, 0.55);
    color: var(--fox-orange-2);
  }

  .hero {
    min-height: 82vh;
    display: grid;
    grid-template-columns: minmax(0, 0.86fr) minmax(360px, 1.14fr);
    align-items: center;
    gap: clamp(28px, 5vw, 76px);
    padding: 138px clamp(18px, 6vw, 86px) 76px;
    border-bottom: 1px solid var(--fox-line);
  }

  .hero-copy { max-width: 790px; }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    color: var(--fox-orange-2);
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .eyebrow::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--fox-green);
    box-shadow: 0 0 18px rgba(53, 208, 127, 0.75);
  }

  .hero h1 {
    max-width: 760px;
    margin: 0 0 22px;
    font-size: clamp(3rem, 7vw, 6.8rem);
    line-height: 0.92;
    letter-spacing: 0;
    font-weight: 800;
  }

  .hero h1 span { color: var(--fox-orange-2); }

  .hero-lead {
    max-width: 650px;
    margin: 0 0 30px;
    color: var(--fox-muted);
    font-size: clamp(1.04rem, 1.6vw, 1.24rem);
    line-height: 1.65;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 0;
  }

  .hero-art {
    position: relative;
    min-height: 420px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 106, 0, 0.2);
    border-radius: 8px;
    background:
      radial-gradient(circle at 50% 50%, rgba(255, 106, 0, 0.18), transparent 44%),
      rgba(255, 255, 255, 0.025);
    box-shadow: var(--fox-shadow);
    overflow: hidden;
  }

  .hero-art::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(180deg, rgba(7, 8, 8, 0) 58%, rgba(7, 8, 8, 0.18));
    pointer-events: none;
  }

  .hero-art img {
    width: 100%;
    height: 100%;
    min-height: 420px;
    object-fit: cover;
    object-position: center;
    filter: saturate(1.04) contrast(1.02);
  }

  .product-window {
    border: 1px solid var(--fox-line-strong);
    border-radius: 8px;
    background: rgba(21, 23, 25, 0.92);
    box-shadow: var(--fox-shadow);
    overflow: hidden;
  }

  .window-top {
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 0 14px;
    border-bottom: 1px solid var(--fox-line);
    background: rgba(255, 255, 255, 0.035);
  }

  .window-dots { display: flex; gap: 6px; }
  .window-dots span { width: 10px; height: 10px; border-radius: 999px; background: var(--fox-soft); }
  .window-dots span:nth-child(1) { background: var(--fox-danger); }
  .window-dots span:nth-child(2) { background: var(--fox-orange-2); }
  .window-dots span:nth-child(3) { background: var(--fox-green); }

  .window-live {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--fox-green);
    font-size: 0.74rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .window-live::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: currentColor;
  }

  .window-body { padding: 16px; }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }

  .metric {
    border: 1px solid var(--fox-line);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
    padding: 13px;
  }

  .metric strong {
    display: block;
    margin-bottom: 4px;
    color: var(--fox-ink);
    font-size: 1.25rem;
    line-height: 1;
  }

  .metric span {
    color: var(--fox-soft);
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .invoice-list {
    display: grid;
    gap: 8px;
  }

  .invoice-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 14px;
    min-height: 54px;
    padding: 10px 12px;
    border: 1px solid var(--fox-line);
    border-radius: 8px;
    background: rgba(7, 8, 8, 0.36);
  }

  .invoice-row b {
    display: block;
    color: var(--fox-ink);
    font-size: 0.9rem;
  }

  .invoice-row small {
    color: var(--fox-soft);
    font-size: 0.76rem;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 5px 9px;
    font-size: 0.72rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .status-ok { color: var(--fox-green); background: rgba(53, 208, 127, 0.1); }
  .status-watch { color: var(--fox-orange-2); background: rgba(255, 159, 28, 0.11); }
  .status-blue { color: var(--fox-blue); background: rgba(101, 168, 255, 0.12); }

  .section {
    padding: clamp(70px, 9vw, 112px) clamp(18px, 6vw, 86px);
    border-bottom: 1px solid var(--fox-line);
  }

  .section-heading {
    max-width: 760px;
    margin-bottom: 34px;
  }

  .section-heading.center {
    margin-inline: auto;
    text-align: center;
  }

  .section-heading h2 {
    margin: 0 0 14px;
    font-size: clamp(2rem, 4.2vw, 4rem);
    line-height: 1;
    letter-spacing: 0;
  }

  .section-heading p {
    margin: 0;
    color: var(--fox-muted);
    font-size: 1.04rem;
    line-height: 1.68;
  }

  .presentation-showcase {
    position: relative;
    margin-top: 34px;
    min-height: 640px;
    display: grid;
    align-items: end;
    padding: clamp(24px, 5vw, 62px);
    border: 1px solid rgba(255, 106, 0, 0.24);
    border-radius: 8px;
    background:
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(180deg, rgba(255,255,255,0.03) 1px, transparent 1px),
      radial-gradient(circle at 18% 18%, rgba(255, 106, 0, 0.26), transparent 34%),
      linear-gradient(135deg, rgba(255, 106, 0, 0.1), rgba(255,255,255,0.03) 46%, rgba(0,0,0,0.38));
    background-size: 58px 58px, 58px 58px, auto, auto;
    box-shadow: var(--fox-shadow);
    overflow: hidden;
  }

  .presentation-showcase::before {
    content: '';
    position: absolute;
    inset: auto -12% -28% 18%;
    height: 42%;
    background: radial-gradient(ellipse, rgba(255, 106, 0, 0.18), transparent 68%);
    pointer-events: none;
  }

  .device-stage {
    position: relative;
    width: min(980px, 100%);
    margin: 0 auto;
    padding: 40px 0 0;
  }

  .laptop-mock {
    position: relative;
    width: min(810px, 82%);
    min-height: 440px;
    margin: 0 auto;
    border: 2px solid rgba(255, 255, 255, 0.34);
    border-radius: 18px 18px 8px 8px;
    background: #070808;
    box-shadow: 0 34px 90px rgba(0, 0, 0, 0.55);
    padding: 18px;
  }

  .laptop-mock::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    width: 6px;
    height: 6px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.22);
  }

  .laptop-base {
    width: min(900px, 92%);
    height: 20px;
    margin: -1px auto 0;
    border-radius: 0 0 34px 34px;
    background: linear-gradient(180deg, #8b8c8d, #2a2b2d 70%, #0b0c0d);
    box-shadow: 0 24px 34px rgba(0, 0, 0, 0.36);
  }

  .screen-ui {
    height: 400px;
    display: grid;
    grid-template-columns: 138px 1fr;
    border: 1px solid var(--fox-line);
    border-radius: 8px;
    background: #0c0d0f;
    overflow: hidden;
  }

  .mock-sidebar {
    border-right: 1px solid var(--fox-line);
    background: rgba(255, 255, 255, 0.025);
    padding: 18px 14px;
  }

  .mock-brand {
    margin-bottom: 22px;
    color: var(--fox-ink);
    font-size: 0.9rem;
    font-weight: 900;
    letter-spacing: 0.16em;
  }

  .mock-brand span { color: var(--fox-orange-2); }

  .mock-nav {
    display: grid;
    gap: 8px;
  }

  .mock-nav span {
    height: 28px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    border-radius: 6px;
    color: var(--fox-muted);
    font-size: 0.68rem;
    font-weight: 700;
  }

  .mock-nav span:first-child {
    background: rgba(255, 106, 0, 0.16);
    color: var(--fox-orange-2);
  }

  .mock-content {
    padding: 18px;
    background:
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(180deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 38px 38px;
  }

  .mock-content-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .mock-content-header h3 {
    margin: 0;
    font-size: 0.9rem;
  }

  .mock-search {
    width: 150px;
    height: 24px;
    border: 1px solid var(--fox-line);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.04);
  }

  .mock-kpis {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }

  .mock-kpi,
  .mock-panel {
    border: 1px solid var(--fox-line);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.045);
  }

  .mock-kpi {
    padding: 11px;
  }

  .mock-kpi small {
    display: block;
    margin-bottom: 8px;
    color: var(--fox-soft);
    font-size: 0.58rem;
    font-weight: 800;
  }

  .mock-kpi strong {
    display: block;
    color: var(--fox-ink);
    font-size: 1rem;
    line-height: 1;
  }

  .mock-kpi em {
    display: block;
    margin-top: 7px;
    color: var(--fox-green);
    font-size: 0.56rem;
    font-style: normal;
    font-weight: 800;
  }

  .mock-dashboard-grid {
    display: grid;
    grid-template-columns: 1.4fr 0.8fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .mock-panel {
    min-height: 132px;
    padding: 13px;
  }

  .mock-panel-title {
    color: var(--fox-ink);
    font-size: 0.68rem;
    font-weight: 800;
    margin-bottom: 12px;
  }

  .line-chart {
    width: 100%;
    height: 82px;
    position: relative;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background:
      linear-gradient(180deg, transparent 24%, rgba(255,255,255,0.05) 25%, transparent 26%),
      linear-gradient(180deg, transparent 49%, rgba(255,255,255,0.05) 50%, transparent 51%),
      linear-gradient(180deg, transparent 74%, rgba(255,255,255,0.05) 75%, transparent 76%);
  }

  .line-chart svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .line-chart polyline {
    fill: none;
    stroke: var(--fox-orange);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 0 8px rgba(255, 106, 0, 0.45));
  }

  .donut-wrap {
    display: grid;
    place-items: center;
    height: 92px;
  }

  .donut {
    width: 78px;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: conic-gradient(var(--fox-orange) 0 74%, rgba(255,255,255,0.1) 74% 100%);
  }

  .donut::before {
    content: '74%';
    width: 48px;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: #101113;
    color: var(--fox-ink);
    font-size: 0.74rem;
    font-weight: 900;
  }

  .mock-bottom-grid {
    display: grid;
    grid-template-columns: 0.85fr 1fr;
    gap: 12px;
  }

  .mini-list {
    display: grid;
    gap: 8px;
  }

  .mini-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    color: var(--fox-muted);
    font-size: 0.64rem;
  }

  .mini-row span:last-child {
    color: var(--fox-ink);
    font-weight: 800;
  }

  .phone-mock {
    position: absolute;
    right: 0;
    bottom: 2px;
    width: 188px;
    min-height: 342px;
    border: 2px solid rgba(255,255,255,0.42);
    border-radius: 28px;
    background: #070808;
    padding: 11px;
    box-shadow: 0 28px 70px rgba(0,0,0,0.5);
  }

  .phone-mock::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    width: 48px;
    height: 5px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: rgba(255,255,255,0.16);
  }

  .phone-screen {
    min-height: 316px;
    border-radius: 20px;
    background: #0f1012;
    padding: 28px 12px 12px;
    overflow: hidden;
  }

  .phone-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    color: var(--fox-ink);
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.14em;
  }

  .phone-card {
    border: 1px solid var(--fox-line);
    border-radius: 8px;
    background: rgba(255,255,255,0.045);
    padding: 11px;
    margin-bottom: 10px;
  }

  .phone-card small {
    display: block;
    margin-bottom: 6px;
    color: var(--fox-soft);
    font-size: 0.58rem;
    font-weight: 800;
  }

  .phone-card strong {
    color: var(--fox-ink);
    font-size: 0.9rem;
  }

  .phone-donut {
    width: 98px;
    margin: 6px auto 10px;
  }

  .phone-actions {
    display: grid;
    gap: 7px;
  }

  .phone-action {
    display: flex;
    justify-content: space-between;
    color: var(--fox-muted);
    font-size: 0.62rem;
  }

  .phone-cta {
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--fox-orange), var(--fox-orange-2));
    color: #171008;
    font-size: 0.68rem;
    font-weight: 900;
  }

  .presentation-feature-row {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 1px;
    margin-top: 34px;
    border: 1px solid var(--fox-line);
    border-radius: 8px;
    background: var(--fox-line);
    overflow: hidden;
  }

  .presentation-feature {
    min-height: 126px;
    padding: 17px;
    background: rgba(7, 8, 8, 0.74);
  }

  .presentation-feature svg {
    width: 28px;
    height: 28px;
    margin-bottom: 12px;
    color: var(--fox-orange-2);
  }

  .presentation-feature strong {
    display: block;
    margin-bottom: 6px;
    color: var(--fox-ink);
    font-size: 0.82rem;
    text-transform: uppercase;
  }

  .presentation-feature span {
    color: var(--fox-muted);
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .modules-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .module-card {
    min-height: 225px;
    padding: 20px;
    border: 1px solid var(--fox-line);
    border-radius: 8px;
    background: rgba(21, 23, 25, 0.78);
  }

  .module-card svg {
    width: 34px;
    height: 34px;
    color: var(--fox-orange-2);
    margin-bottom: 18px;
  }

  .module-card h3 {
    margin: 0 0 9px;
    font-size: 1.05rem;
  }

  .module-card p {
    margin: 0;
    color: var(--fox-muted);
    font-size: 0.92rem;
    line-height: 1.58;
  }

  .flow-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1px;
    border: 1px solid var(--fox-line);
    border-radius: 8px;
    overflow: hidden;
    background: var(--fox-line);
  }

  .flow-step {
    min-height: 245px;
    padding: 24px;
    background: var(--fox-panel);
  }

  .flow-step span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    margin-bottom: 22px;
    border-radius: 8px;
    background: rgba(255, 106, 0, 0.14);
    color: var(--fox-orange-2);
    font-weight: 900;
  }

  .flow-step h3 { margin: 0 0 10px; font-size: 1rem; }
  .flow-step p { margin: 0; color: var(--fox-muted); font-size: 0.9rem; line-height: 1.58; }

  .security-band {
    display: grid;
    grid-template-columns: 0.78fr 1fr;
    gap: clamp(28px, 5vw, 70px);
    align-items: center;
  }

  .security-panel {
    border: 1px solid var(--fox-line-strong);
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(255, 106, 0, 0.08), rgba(255, 255, 255, 0.03));
    padding: clamp(24px, 4vw, 44px);
  }

  .security-panel img {
    display: block;
    width: min(360px, 78vw);
    height: auto;
    margin: 0 auto 26px;
    object-fit: contain;
  }

  .security-panel p {
    margin: 0;
    color: var(--fox-muted);
    text-align: center;
    line-height: 1.65;
  }

  .check-list {
    display: grid;
    gap: 14px;
  }

  .check-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    color: var(--fox-muted);
    line-height: 1.55;
  }

  .check-item svg {
    color: var(--fox-green);
    flex: 0 0 auto;
    margin-top: 2px;
  }

  .contact-section {
    display: grid;
    grid-template-columns: minmax(0, 0.86fr) minmax(420px, 1fr);
    gap: clamp(28px, 5vw, 64px);
    align-items: start;
  }

  .contact-copy {
    max-width: 760px;
  }

  .contact-copy h2 {
    margin: 0 0 22px;
    font-size: clamp(2.25rem, 5.2vw, 4.8rem);
    line-height: 1.02;
    letter-spacing: 0;
  }

  .contact-copy h2 span {
    color: var(--fox-orange-2);
  }

  .contact-copy p {
    margin: 0 0 30px;
    color: var(--fox-muted);
    font-size: 1rem;
    line-height: 1.72;
  }

  .contact-info-list {
    display: grid;
    gap: 18px;
    margin-bottom: 34px;
  }

  .contact-info-item {
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 12px;
    align-items: center;
  }

  .contact-info-icon {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 106, 0, 0.22);
    border-radius: 8px;
    background: rgba(255, 106, 0, 0.1);
    color: var(--fox-orange-2);
  }

  .contact-info-label {
    color: var(--fox-soft);
    font-size: 0.78rem;
    font-weight: 700;
    margin-bottom: 3px;
  }

  .contact-info-value,
  .contact-info-value a {
    color: var(--fox-ink);
    font-size: 0.96rem;
    font-weight: 800;
    text-decoration: none;
  }

  .contact-info-value a:hover {
    color: var(--fox-orange-2);
  }

  .compliance-box {
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 14px;
    padding: 22px;
    border: 1px solid var(--fox-line);
    border-radius: 8px;
    background: rgba(21, 23, 25, 0.78);
  }

  .compliance-box h3 {
    margin: 0 0 6px;
    font-size: 1rem;
  }

  .compliance-box p {
    margin: 0;
    color: var(--fox-muted);
    font-size: 0.9rem;
    line-height: 1.62;
  }

  .contact-form-card {
    border: 1px solid var(--fox-line-strong);
    border-radius: 8px;
    background: rgba(21, 23, 25, 0.82);
    box-shadow: var(--fox-shadow);
    padding: clamp(22px, 3.5vw, 34px);
  }

  .contact-form-card h3 {
    margin: 0 0 24px;
    font-size: 1.2rem;
  }

  .contact-form {
    display: grid;
    gap: 16px;
  }

  .contact-form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .contact-form label {
    display: grid;
    gap: 8px;
    color: var(--fox-muted);
    font-size: 0.85rem;
    font-weight: 750;
  }

  .contact-form input,
  .contact-form select {
    width: 100%;
    min-height: 46px;
    border: 1px solid var(--fox-line-strong);
    border-radius: 8px;
    background: rgba(7, 8, 8, 0.48);
    color: var(--fox-ink);
    padding: 0 14px;
    font: inherit;
    outline: none;
  }

  .contact-form input:focus,
  .contact-form select:focus {
    border-color: rgba(255, 159, 28, 0.75);
    box-shadow: 0 0 0 3px rgba(255, 106, 0, 0.12);
  }

  .contact-form select option {
    background: var(--fox-panel);
    color: var(--fox-ink);
  }

  .contact-submit {
    min-height: 50px;
    margin-top: 8px;
    border-radius: 8px;
    border: 1px solid rgba(255, 159, 28, 0.45);
    background: linear-gradient(135deg, var(--fox-orange), var(--fox-orange-2));
    color: #171008;
    font: inherit;
    font-weight: 900;
  }

  .contact-privacy {
    display: flex;
    justify-content: center;
    gap: 7px;
    color: var(--fox-soft);
    font-size: 0.78rem;
  }

  .contact-privacy svg {
    color: var(--fox-orange-2);
    flex: 0 0 auto;
  }

  .cta-section {
    padding: clamp(70px, 9vw, 118px) clamp(18px, 6vw, 86px);
    text-align: center;
  }

  .cta-inner {
    max-width: 1120px;
    margin: 0 auto;
    padding: clamp(54px, 7vw, 82px) clamp(20px, 5vw, 64px);
    border: 1px solid rgba(255, 106, 0, 0.24);
    border-radius: 8px;
    background:
      radial-gradient(circle at 50% 0%, rgba(255, 106, 0, 0.16), transparent 44%),
      rgba(21, 23, 25, 0.8);
    box-shadow: var(--fox-shadow);
  }

  .cta-inner img {
    width: 92px;
    height: auto;
    margin-bottom: 24px;
    object-fit: contain;
  }

  .cta-inner h2 {
    margin: 0 0 16px;
    font-size: clamp(2.2rem, 5vw, 4.8rem);
    line-height: 0.98;
  }

  .cta-inner h2 span {
    color: var(--fox-orange-2);
  }

  .cta-inner p {
    max-width: 610px;
    margin: 0 auto 28px;
    color: var(--fox-muted);
    font-size: 1.05rem;
    line-height: 1.68;
  }

  .lp-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 22px;
    padding: 32px clamp(18px, 6vw, 86px);
    border-top: 1px solid var(--fox-line);
    color: var(--fox-soft);
    font-size: 0.86rem;
  }

  .footer-links {
    display: flex;
    gap: 20px;
  }

  .footer-links a {
    color: var(--fox-soft);
    text-decoration: none;
  }

  .footer-links a:hover { color: var(--fox-ink); }

  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(0, 0, 0, 0.74);
    backdrop-filter: blur(12px);
  }

  .modal-box {
    width: min(430px, 100%);
    position: relative;
    border: 1px solid var(--fox-line-strong);
    border-radius: 8px;
    background: var(--fox-panel);
    box-shadow: var(--fox-shadow);
    padding: 30px;
  }

  .modal-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--fox-muted);
    border: 1px solid var(--fox-line);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
  }

  .modal-brand {
    text-align: center;
    margin-bottom: 24px;
  }

  .modal-brand img {
    width: 70px;
    height: auto;
    object-fit: contain;
    margin-bottom: 12px;
  }

  .modal-brand h3 { margin: 0 0 6px; font-size: 1.3rem; }
  .modal-brand p { margin: 0; color: var(--fox-muted); font-size: 0.9rem; }

  .login-form {
    display: grid;
    gap: 14px;
  }

  .form-group { display: grid; gap: 7px; }

  .form-label {
    color: var(--fox-muted);
    font-size: 0.84rem;
    font-weight: 700;
  }

  .form-input {
    width: 100%;
    min-height: 46px;
    border: 1px solid var(--fox-line-strong);
    border-radius: 8px;
    background: rgba(7, 8, 8, 0.52);
    color: var(--fox-ink);
    padding: 0 13px;
    font: inherit;
    outline: none;
  }

  .form-input:focus {
    border-color: rgba(255, 159, 28, 0.75);
    box-shadow: 0 0 0 3px rgba(255, 106, 0, 0.12);
  }

  .password-wrap { position: relative; }

  .password-toggle {
    position: absolute;
    right: 9px;
    top: 50%;
    transform: translateY(-50%);
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--fox-muted);
  }

  .form-submit {
    min-height: 46px;
    border-radius: 8px;
    border: 1px solid rgba(255, 159, 28, 0.45);
    background: linear-gradient(135deg, var(--fox-orange), var(--fox-orange-2));
    color: #171008;
    font: inherit;
    font-weight: 800;
  }

  .form-submit:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .error-box {
    display: flex;
    align-items: center;
    gap: 9px;
    border: 1px solid rgba(255, 92, 92, 0.25);
    border-radius: 8px;
    background: rgba(255, 92, 92, 0.09);
    color: #ff8c8c;
    padding: 11px 12px;
    font-size: 0.86rem;
  }

  .success-box {
    display: flex;
    align-items: center;
    gap: 9px;
    border: 1px solid rgba(53, 208, 127, 0.28);
    border-radius: 8px;
    background: rgba(53, 208, 127, 0.1);
    color: #16a34a;
    padding: 11px 12px;
    font-size: 0.86rem;
  }

  .forgot-password-link {
    justify-self: center;
    border: 0;
    background: transparent;
    color: var(--fox-orange);
    font: inherit;
    font-size: 0.86rem;
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .fox-page {
    --fox-bg: #fffaf4;
    --fox-bg-2: #fff4e8;
    --fox-panel: #ffffff;
    --fox-panel-2: #fff7ed;
    --fox-line: rgba(28, 25, 23, 0.1);
    --fox-line-strong: rgba(28, 25, 23, 0.18);
    --fox-ink: #18181b;
    --fox-muted: #374151;
    --fox-soft: #4b5563;
    --fox-green: #15803d;
    --fox-blue: #2563eb;
    --fox-danger: #dc2626;
    --fox-shadow: 0 24px 70px rgba(124, 45, 18, 0.12);
    background:
      linear-gradient(90deg, rgba(124, 45, 18, 0.045) 1px, transparent 1px),
      linear-gradient(180deg, rgba(124, 45, 18, 0.045) 1px, transparent 1px),
      linear-gradient(180deg, #fffaf4 0%, #fff7ed 48%, #ffffff 100%);
    background-size: 72px 72px, 72px 72px, auto;
  }

  .fox-page .lp-nav {
    background: rgba(255, 250, 244, 0.86);
    border-bottom-color: rgba(28, 25, 23, 0.1);
  }

  .fox-page .btn-secondary {
    background: rgba(255, 255, 255, 0.78);
    color: #1f2937;
    border-color: rgba(28, 25, 23, 0.14);
  }

  .fox-page .hero-art,
  .fox-page .presentation-showcase,
  .fox-page .module-card,
  .fox-page .security-panel,
  .fox-page .compliance-box,
  .fox-page .contact-form-card,
  .fox-page .cta-inner {
    background: rgba(255, 255, 255, 0.82);
    border-color: rgba(124, 45, 18, 0.16);
  }

  .fox-page .presentation-showcase {
    background:
      linear-gradient(90deg, rgba(124,45,18,0.045) 1px, transparent 1px),
      linear-gradient(180deg, rgba(124,45,18,0.045) 1px, transparent 1px),
      radial-gradient(circle at 18% 18%, rgba(255, 106, 0, 0.18), transparent 34%),
      linear-gradient(135deg, rgba(255, 237, 213, 0.9), rgba(255,255,255,0.82) 50%, rgba(255,247,237,0.92));
    background-size: 58px 58px, 58px 58px, auto, auto;
  }

  .fox-page .presentation-showcase .screen-ui,
  .fox-page .presentation-showcase .phone-mock,
  .fox-page .presentation-showcase .phone-screen {
    --fox-ink: #f7f3ed;
    --fox-muted: #a8adb3;
    --fox-soft: #6f7780;
    --fox-line: rgba(255, 255, 255, 0.1);
    --fox-line-strong: rgba(255, 255, 255, 0.18);
    --fox-green: #35d07f;
  }

  .fox-page .presentation-feature {
    background: rgba(255, 255, 255, 0.78);
  }

  .fox-page .nav-links a,
  .fox-page .brand-mark,
  .fox-page .hero h1,
  .fox-page .section-heading h2,
  .fox-page .contact-copy h2,
  .fox-page .cta-inner h2,
  .fox-page .hero-lead,
  .fox-page .section-heading p,
  .fox-page .module-card p,
  .fox-page .flow-step p,
  .fox-page .security-panel p,
  .fox-page .check-item,
  .fox-page .contact-copy p,
  .fox-page .contact-info-label,
  .fox-page .compliance-box p,
  .fox-page .contact-form label,
  .fox-page .contact-privacy,
  .fox-page .cta-inner p,
  .fox-page .footer-links a {
    color: #111827;
  }

  .fox-page .hero h1 {
    color: #000000;
    opacity: 1;
    text-shadow: none;
  }

  .fox-page .contact-info-value,
  .fox-page .contact-info-value a,
  .fox-page .module-card h3,
  .fox-page .flow-step h3,
  .fox-page .compliance-box h3,
  .fox-page .contact-form-card h3,
  .fox-page .presentation-feature strong {
    color: #111827;
  }

  .fox-page .presentation-feature span {
    color: #374151;
  }

  .fox-page .flow-grid,
  .fox-page .presentation-feature-row {
    background: rgba(28, 25, 23, 0.1);
  }

  .fox-page .flow-step {
    background: rgba(255, 255, 255, 0.82);
  }

  .fox-page .contact-form input,
  .fox-page .contact-form select,
  .fox-page .form-input {
    background: rgba(255, 255, 255, 0.88);
    color: var(--fox-ink);
  }

  .fox-page .contact-form select option {
    background: #ffffff;
    color: var(--fox-ink);
  }

  .fox-page .modal-overlay {
    background: rgba(28, 25, 23, 0.28);
  }

  .fox-page .modal-box {
    background: #ffffff;
    border-color: rgba(28, 25, 23, 0.14);
  }

  @media (max-width: 1040px) {
    .hero,
    .contact-section,
    .security-band {
      grid-template-columns: 1fr;
    }

    .hero { min-height: auto; }
    .hero-art {
      min-height: 360px;
      max-width: 760px;
    }
    .hero-art img { min-height: 360px; }
    .modules-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .flow-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .presentation-feature-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .laptop-mock { width: 100%; }
    .phone-mock {
      position: relative;
      right: auto;
      bottom: auto;
      margin: 22px auto 0;
    }
  }

  @media (max-width: 760px) {
    .lp-nav { height: 66px; }
    .nav-links { display: none; }
    .hero { padding-top: 108px; }
    .hero-art,
    .hero-art img {
      min-height: 280px;
    }
    .metric-grid,
    .mock-kpis,
    .mock-dashboard-grid,
    .mock-bottom-grid,
    .contact-form-row,
    .presentation-feature-row,
    .modules-grid,
    .flow-grid {
      grid-template-columns: 1fr;
    }
    .screen-ui { grid-template-columns: 1fr; height: auto; }
    .mock-sidebar { display: none; }
    .laptop-mock {
      min-height: auto;
      padding: 12px;
    }
    .presentation-showcase { min-height: auto; }
    .lp-footer {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (max-width: 460px) {
    .nav-actions .btn-secondary { display: none; }
    .btn { width: 100%; }
    .nav-actions .btn { width: auto; }
    .hero h1 { font-size: clamp(2.7rem, 18vw, 4.2rem); }
  }
`;

const modules = [
  {
    icon: Building2,
    title: 'Condomínios',
    text: 'Cadastro operacional com unidades, documentos, fornecedores e histórico centralizado.',
  },
  {
    icon: DatabaseZap,
    title: 'Faturas',
    text: 'Organização por competência, status, concessionária e trilha completa de processamento.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    text: 'Visão gerencial para consumo, custos, recorrência e desvios que pedem ação.',
  },
  {
    icon: ShieldCheck,
    title: 'Auditoria',
    text: 'Rastreabilidade para saber quem alterou, quando alterou e o que mudou no sistema.',
  },
];

const flow = [
  {
    title: 'Captura',
    text: 'FOX acompanha os canais de recebimento e identifica novos documentos de cobrança.',
  },
  {
    title: 'Processamento',
    text: 'O sistema interpreta arquivos, cruza cadastros e organiza a informação por contrato.',
  },
  {
    title: 'Validação',
    text: 'Regras de variação, prazos e duplicidade apontam somente o que merece revisão.',
  },
  {
    title: 'Gestão',
    text: 'Dashboards, relatórios e histórico deixam a rotina financeira clara e auditável.',
  },
];

export default function LandingPage() {
  const [isLoginView, setIsLoginView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordView, setIsForgotPasswordView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contactData, setContactData] = useState({
    nome: '',
    email: '',
    administradora: '',
    condominios: '',
  });
  const { login } = useAuth();

  const handleLogin = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login({ email, senha: password });
      let redirectPath = new URL(window.location.href).searchParams.get('redirect');

      if (!redirectPath) {
        const operacaoRoles = ['concessionarias', 'contabilidade', 'emissao', 'orcamento', 'orçamento'];
        redirectPath = operacaoRoles.includes(user.role) ? '/condominios' : '/dashboard';
      }

      window.location.href = redirectPath;
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setForgotSuccess(null);
    setIsLoading(true);

    try {
      const result = await api.forgotPassword(forgotEmail || email);
      setForgotSuccess(result.message || 'Se o e-mail estiver cadastrado, uma nova senha sera enviada em instantes.');
    } catch (err: any) {
      setError(err.message || 'Falha ao solicitar nova senha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSubmit = (e: FormEvent) => {
    e.preventDefault();
    alert('Obrigado! Entraremos em contato em até 2 horas úteis.');
    setContactData({ nome: '', email: '', administradora: '', condominios: '' });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <main className="fox-page">
        <nav className="lp-nav" aria-label="Navegacao principal">
          <a className="brand-mark" href="#top" aria-label="FOX">
            <Image src="/fox-logo-header.png" alt="FOX" width={150} height={150} priority />
          </a>
          <ul className="nav-links">
            <li><a href="#sistema">Sistema</a></li>
            <li><a href="#recursos">Recursos</a></li>
            <li><a href="#operacao">Operação</a></li>
            <li><a href="#seguranca">Segurança</a></li> 
          </ul>
          <div className="nav-actions">
            <a className="btn btn-secondary" href="#recursos">Conhecer</a>
            <button className="btn btn-primary" onClick={() => setIsLoginView(true)}>
              Entrar <ArrowRight size={16} />
            </button>
          </div>
        </nav>

        <section className="hero" id="top">
          <div className="hero-copy">
            <div className="eyebrow">Sistema de gestão automatizada</div>
            <h1>FOX para controlar faturas com mais <span>precisão</span>.</h1>
            <p className="hero-lead">
              Uma plataforma profissional para recebimento, leitura, validação e acompanhamento de faturas em operações condominiais e financeiras.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => setIsLoginView(true)}>
                Acessar sistema <ArrowRight size={17} />
              </button>
              <a className="btn btn-secondary" href="#sistema">
                Ver apresentação
              </a>
            </div>
          </div>
          <div className="hero-art">
            <Image
              src="/fox-hero-final.png"
              alt="FOX com painéis de segurança, alertas, rastreabilidade e indicadores operacionais"
              width={1672}
              height={927}
              sizes="(max-width: 1040px) 100vw, 52vw"
              priority
            />
          </div>
        </section>

        <section className="section" id="sistema">
          <div className="section-heading center">
            <div className="eyebrow">Apresentação</div>
            <h2>Automação inteligente. Controle total.</h2>
            <p>Uma visão institucional do FOX para gestão de condomínios, concessionárias, contas e relatórios em tempo real.</p>
          </div>
          <div className="presentation-showcase" aria-label="Apresentação visual do sistema FOX">
            <div className="device-stage">
              <div className="laptop-mock">
                <div className="screen-ui">
                  <aside className="mock-sidebar">
                    <div className="mock-brand">F<span>O</span>X</div>
                    <div className="mock-nav">
                      <span>Dashboard</span>
                      <span>Condomínios</span>
                      <span>Contas</span>
                      <span>Relatórios</span>
                      <span>Configurações</span>
                    </div>
                  </aside>
                  <div className="mock-content">
                    <div className="mock-content-header">
                      <h3>Dashboard</h3>
                      <div className="mock-search" />
                    </div>
                    <div className="mock-kpis">
                      <div className="mock-kpi"><small>Recebido no mês</small><strong>R$ 128.750</strong><em>+12,9%</em></div>
                      <div className="mock-kpi"><small>Pendências</small><strong>R$ 18.230</strong><em>-5,3%</em></div>
                      <div className="mock-kpi"><small>Condomínios</small><strong>128</strong><em>ativas</em></div>
                      <div className="mock-kpi"><small>Faturas</small><strong>R$ 45.600</strong><em>23 pendentes</em></div>
                    </div>
                    <div className="mock-dashboard-grid">
                      <div className="mock-panel">
                        <div className="mock-panel-title">Evolução de recebimento</div>
                        <div className="line-chart">
                          <svg viewBox="0 0 420 90" aria-hidden="true">
                            <polyline points="0,72 34,66 68,70 102,58 136,62 170,44 204,50 238,32 272,42 306,26 340,34 374,18 420,24" />
                          </svg>
                        </div>
                      </div>
                      <div className="mock-panel">
                        <div className="mock-panel-title">Resumo financeiro</div>
                        <div className="donut-wrap"><div className="donut" /></div>
                      </div>
                    </div>
                    <div className="mock-bottom-grid">
                      <div className="mock-panel">
                        <div className="mock-panel-title">Status de progresso</div>
                        <div className="donut-wrap"><div className="donut" /></div>
                      </div>
                      <div className="mock-panel">
                        <div className="mock-panel-title">Próximos vencimentos</div>
                        <div className="mini-list">
                          <div className="mini-row"><span>Água - Bloco A</span><span>R$ 1.250</span></div>
                          <div className="mini-row"><span>Energia - Área comum</span><span>R$ 2.350</span></div>
                          <div className="mini-row"><span>Gás - Bloco B</span><span>R$ 980</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="laptop-base" />

              <div className="phone-mock" aria-hidden="true">
                <div className="phone-screen">
                  <div className="phone-top"><span>FOX</span><span>Menu</span></div>
                  <div className="phone-card">
                    <small>Resumo geral</small>
                    <strong>R$ 86.450</strong>
                    <div className="donut phone-donut" />
                  </div>
                  <div className="phone-card">
                    <div className="phone-actions">
                      <div className="phone-action"><span>Contas em aberto</span><strong>128</strong></div>
                      <div className="phone-action"><span>Vencidas</span><strong>23</strong></div>
                      <div className="phone-action"><span>A vencer</span><strong>45</strong></div>
                    </div>
                  </div>
                  <div className="phone-cta">Nova conta</div>
                </div>
              </div>
            </div>

            <div className="presentation-feature-row">
              <div className="presentation-feature">
                <DatabaseZap />
                <strong>Automação de contas</strong>
                <span>Leitura automática e conciliação inteligente.</span>
              </div>
              <div className="presentation-feature">
                <Building2 />
                <strong>Concessionárias</strong>
                <span>Água, energia, gás, internet e contratos.</span>
              </div>
              <div className="presentation-feature">
                <BarChart3 />
                <strong>Relatórios avançados</strong>
                <span>Indicadores em tempo real para decisão.</span>
              </div>
              <div className="presentation-feature">
                <Check />
                <strong>Alertas inteligentes</strong>
                <span>Notificações de vencimentos e pendências.</span>
              </div>
              <div className="presentation-feature">
                <ShieldCheck />
                <strong>Segurança</strong>
                <span>Dados protegidos e operação rastreável.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="recursos">
          <div className="section-heading center">
            <div className="eyebrow">Recursos essenciais</div>
            <h2>O que o sistema entrega na rotina.</h2>
            <p>Sem excesso de tela e sem promessa espalhafatosa: apenas os blocos que sustentam uma operação financeira organizada.</p>
          </div>
          <div className="modules-grid">
            {modules.map((item) => (
              <div className="module-card" key={item.title}>
                <item.icon />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="operacao">
          <div className="section-heading">
            <div className="eyebrow">Fluxo operacional</div>
            <h2>Da chegada do documento até a decisão.</h2>
            <p>FOX organiza o percurso da informação para que a equipe acompanhe o que está normal, o que está pendente e o que exige intervenção.</p>
          </div>
          <div className="flow-grid">
            {flow.map((item, index) => (
              <div className="flow-step" key={item.title}>
                <span>{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="seguranca">
          <div className="security-band">
            <div className="security-panel">
              <Image src="/fox-logo-security.png" alt="FOX" width={640} height={640} />
              <p>Uma identidade simples para um sistema objetivo: controle, alerta e confiabilidade no centro da operação.</p>
            </div>
            <div>
              <div className="section-heading">
                <div className="eyebrow">Segurança e controle</div>
                <h2>Governança para crescer sem perder visibilidade.</h2>
                <p>As rotinas sensíveis precisam deixar evidências. Por isso o FOX combina permissão, histórico, validação e organização dos dados.</p>
              </div>
              <div className="check-list">
                <div className="check-item"><Check size={19} /> Controle de acesso por credenciais e perfis operacionais.</div>
                <div className="check-item"><Check size={19} /> Histórico de faturas, ocorrências, contratos e alterações relevantes.</div>
                <div className="check-item"><Check size={19} /> Alertas para faturas ausentes, duplicadas ou fora do comportamento esperado.</div>
                <div className="check-item"><Check size={19} /> Base preparada para relatórios e acompanhamento gerencial.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="contato">
          <div className="contact-section">
            <div className="contact-copy">
              <div className="eyebrow">Fale com a gente</div>
              <h2>Pronto para <span>automatizar</span> sua operação?</h2>
              <p>
                Fale com nosso time e descubra como eliminar o trabalho manual em menos de 1 semana.
                Respondemos em até 2 horas úteis.
              </p>

              <div className="contact-info-list">
                <div className="contact-info-item">
                  <div className="contact-info-icon"><Mail size={18} /></div>
                  <div>
                    <div className="contact-info-label">E-mail</div>
                    <div className="contact-info-value">
                      <a href="mailto:contato@foxapp.com.br">contato@foxapp.com.br</a>
                    </div>
                  </div>
                </div>
                <div className="contact-info-item">
                  <div className="contact-info-icon"><MessageCircle size={18} /></div>
                  <div>
                    <div className="contact-info-label">WhatsApp</div>
                    <div className="contact-info-value">
                      <a href="https://wa.me/5511930050306" target="_blank" rel="noopener noreferrer">Falar agora →</a>
                    </div>
                  </div>
                </div>
                <div className="contact-info-item">
                  <div className="contact-info-icon"><Clock size={18} /></div>
                  <div>
                    <div className="contact-info-label">Horário</div>
                    <div className="contact-info-value">Seg-Sex · 9h às 18h (BRT)</div>
                  </div>
                </div>
              </div>

              <div className="compliance-box">
                <div className="contact-info-icon"><LockKeyhole size={18} /></div>
                <div>
                  <h3>Conformidade LGPD</h3>
                  <p>Todos os dados são tratados em conformidade com a Lei Geral de Proteção de Dados. DPA disponível sob solicitação.</p>
                </div>
              </div>
            </div>

            <div className="contact-form-card">
              <h3>Solicitar demonstração gratuita</h3>
              <form className="contact-form" onSubmit={handleContactSubmit}>
                <div className="contact-form-row">
                  <label>
                    Nome completo
                    <input
                      type="text"
                      placeholder="João Silva"
                      value={contactData.nome}
                      onChange={(e) => setContactData((data) => ({ ...data, nome: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    E-mail corporativo
                    <input
                      type="email"
                      placeholder="joao@empresa.com"
                      value={contactData.email}
                      onChange={(e) => setContactData((data) => ({ ...data, email: e.target.value }))}
                      required
                    />
                  </label>
                </div>
                <label>
                  Nome da administradora
                  <input
                    type="text"
                    placeholder="Adm. Exemplo Ltda."
                    value={contactData.administradora}
                    onChange={(e) => setContactData((data) => ({ ...data, administradora: e.target.value }))}
                  />
                </label>
                <label>
                  Quantos condomínios você administra?
                  <select
                    value={contactData.condominios}
                    onChange={(e) => setContactData((data) => ({ ...data, condominios: e.target.value }))}
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="1-5">1 a 50</option>
                    <option value="6-20">51 a 100</option>
                    <option value="21-50">101 a 200</option>
                    <option value="50+">Mais de 200</option>
                  </select>
                </label>
                <button type="submit" className="contact-submit">
                  Quero minha demonstração gratuita →
                </button>
                <div className="contact-privacy">
                  <LockKeyhole size={13} />
                  <span>Sem spam. Seus dados são protegidos pela LGPD.</span>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-inner">
            <div className="eyebrow">Comece hoje</div>
            <h2>Elimine o trabalho manual em <span>menos de 1 semana</span></h2>
            <p>Onboarding guiado, sem migração complexa. Em 48-72 horas seu time já está operando no automático.</p>
            <div className="hero-actions" style={{ justifyContent: 'center', marginBottom: 0 }}>
              <a className="btn btn-primary" href="#contato">
                Solicitar demonstração gratuita <ArrowRight size={17} />
              </a>
              <a className="btn btn-secondary" href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </section>

        <footer className="lp-footer">
          <div className="brand-mark">
            <Image src="/fox-logo.png" alt="" width={52} height={52} />
          </div>
          <div className="footer-links">
            <Link href="/politica-de-privacidade">Privacidade</Link>
            <Link href="/termos-de-uso">Termos de uso</Link>
          </div>
        </footer>
      </main>

      <AnimatePresence>
        {isLoginView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => {
              setIsLoginView(false);
              setIsForgotPasswordView(false);
              setForgotSuccess(null);
              setError(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="modal-box"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => {
                  setIsLoginView(false);
                  setIsForgotPasswordView(false);
                  setForgotSuccess(null);
                  setError(null);
                }}
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
              <div className="modal-brand">
                <Image src="/fox-logo.png" alt="FOX" width={120} height={120} />
                <h3>{isForgotPasswordView ? 'Recuperar senha' : 'Acesso FOX'}</h3>
                <p>{isForgotPasswordView ? 'Informe seu e-mail cadastrado para receber uma nova senha.' : 'Insira suas credenciais para continuar.'}</p>
              </div>

              <form className="login-form" onSubmit={isForgotPasswordView ? handleForgotPassword : handleLogin}>
                {error && (
                  <div className="error-box">
                    <AlertTriangle size={16} /> {error}
                  </div>
                )}
                {forgotSuccess && (
                  <div className="success-box">
                    <Check size={16} /> {forgotSuccess}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input
                    type="email"
                    className="form-input"
                    value={isForgotPasswordView ? forgotEmail : email}
                    onChange={(e) => {
                      if (isForgotPasswordView) {
                        setForgotEmail(e.target.value);
                      } else {
                        setEmail(e.target.value);
                      }
                    }}
                    placeholder="exemplo@email.com"
                    required
                  />
                </div>
                {!isForgotPasswordView && (
                  <div className="form-group">
                    <label className="form-label">Senha</label>
                    <div className="password-wrap">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="********"
                        style={{ paddingRight: '46px' }}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                )}
                <button type="submit" className="form-submit" disabled={isLoading}>
                  {isForgotPasswordView
                    ? (isLoading ? 'Enviando...' : 'Enviar nova senha')
                    : (isLoading ? 'Autenticando...' : 'Entrar')}
                </button>
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => {
                    setIsForgotPasswordView((value) => {
                      const next = !value;
                      setError(null);
                      setForgotSuccess(null);
                      setForgotEmail(email);
                      return next;
                    });
                  }}
                >
                  {isForgotPasswordView ? 'Voltar ao login' : 'Esqueci minha senha'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
