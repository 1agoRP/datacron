<div align="center">

# ⚡ Datacron
### High-Performance Landing Page · Automation · Native Web

[![Live](https://img.shields.io/badge/Live%20Demo-datacron.com.br-00bcd4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://www.datacron.com.br)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Glossary/HTML5)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript%20ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![SEO](https://img.shields.io/badge/SEO-100%2F100-00c97a?style=for-the-badge&logo=google&logoColor=white)](#-performance--core-web-vitals)
[![Best Practices](https://img.shields.io/badge/Best%20Practices-100%2F100-00c97a?style=for-the-badge&logo=lighthouse&logoColor=white)](#-performance--core-web-vitals)

*A complete, production-grade marketing website built with zero frameworks.*  
*Every kilobyte is intentional. Every interaction is hand-crafted.*

</div>

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Live Demo & Screenshots](#-live-demo--screenshots)
3. [What Makes This a Portfolio Project](#-what-makes-this-a-portfolio-project)
4. [JavaScript Feature Map](#-javascript-feature-map-appjs)
5. [Performance & Core Web Vitals](#-performance--core-web-vitals)
6. [Accessibility & WCAG Compliance](#-accessibility--wcag-compliance)
7. [Project Structure](#-project-structure)
8. [Getting Started](#-getting-started)
9. [Author](#-author)

---

## Overview

**Datacron** is a production website for a Brazilian web development and automation agency. It presents services across web systems, high-conversion landing pages, and process automation — all through a highly interactive, single-page experience.

The project was built using **only native web technologies** (HTML5, CSS3, and Vanilla JavaScript ES6+), with no frameworks, no bundlers, and no build step. This was a deliberate architectural choice to demonstrate deep, framework-agnostic mastery of the platform itself.

> *"The best code is the code you understand completely."*

---

## 🖥️ Live Demo & Screenshots

**Live URL:** [https://www.datacron.com.br](https://www.datacron.com.br)

| Hero Section | Automation Simulator | Services |
|---|---|---|
| Dark navy gradient background with animated orbs | Interactive state-machine pipeline | Bento grid layout with mouse-glow cards |

---

## 💎 What Makes This a Portfolio Project

This isn't a template fill-in. Every line of CSS and every function in `app.js` was written to solve a real, thoughtful problem. Below are the decisions worth noticing.

### 🎨 CSS Architecture — Design Token System

Instead of hardcoding colors and sizes, the entire visual language is managed through a CSS custom property system (`--cyan`, `--text-muted`, `--shadow-lg`, etc.) defined in `:root`. This makes global redesigns trivial and keeps the codebase consistent at scale.

```css
:root {
    --navy:       #0d1b3e;
    --cyan:       #00bcd4;
    --cyan-dark:  #007b8b;   /* WCAG AA contrast on light backgrounds */
    --text-muted: #536690;   /* contrast ratio: 5.72:1 vs white */
    --shadow-lg:  0 20px 80px rgba(13, 27, 62, 0.14);
    --font:       'Outfit', sans-serif;
    --mono:       'JetBrains Mono', monospace;
}
```

### 🖱️ Real-Time Cursor Tracking (Bento Glow)

The service cards feature a spotlight gradient that follows your cursor in real time. This is achieved by using a `mousemove` listener that writes to inline CSS variables, which are then consumed directly by the card's `::before` pseudo-element — **zero layout reflow**, **zero extra DOM nodes**.

```js
card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    card.style.setProperty('--my', `${e.clientY - rect.top}px`);
});
```

### 🔢 Animated Counters with IntersectionObserver

Stats counters only start animating when they scroll into view, using the modern `IntersectionObserver` API (no `scroll` event polling). The animation preserves any suffix (`+`, `%`, `x`) parsed from the element's original text content.

```js
function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.textContent.replace(/[\d]/g, ''); // preserves "+", "%" etc.
    let current = 0;
    const step = target / 60;
    const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = Math.floor(current) + suffix;
        if (current >= target) clearInterval(timer);
    }, 16); // ~60fps
}
```

### 🍪 LGPD Cookie Consent (Brazilian GDPR)

A custom cookie consent banner is implemented using `localStorage` for persistence. It appears after a 1.2s delay (respecting the user's initial experience) and stores the user's choice ('accepted' | 'rejected') to avoid showing it again on return visits. No third-party consent library needed.

---

## 🕹️ JavaScript Feature Map (`app.js`)

The entire interactivity layer is organized into **9 self-contained modules** within a single `DOMContentLoaded` listener:

| # | Module | Technique |
|---|---|---|
| 1 | **Glassmorphic Navbar on Scroll** | `scroll` event + `classList.toggle` |
| 2 | **Mobile Menu** | Class toggling, `Escape` key close |
| 3 | **Reveal on Scroll** | `IntersectionObserver` + staggered `setTimeout` |
| 4 | **Animated Counters** | `IntersectionObserver` + 60fps `setInterval` |
| 5 | **Bento Glow (Cursor Tracking)** | `mousemove` → CSS variables (`--mx`, `--my`) |
| 6 | **Automation Pipeline Simulator** | Custom state machine with sequential `setTimeout` queue |
| 7 | **Contact Form with Loader** | `submit` interception, spinner injection, fade-out |
| 8 | **Legal Modals** | Focus-trap, `Escape` close, backdrop click |
| 9 | **LGPD Cookie Banner** | `localStorage` persistence, delayed reveal |

### 🤖 Automation Simulator — Deep Dive

The simulator is the centerpiece interactive demo. It's a **time-sequenced state machine** built entirely in Vanilla JS, without any reactive library:

```
[Trigger Click]
      │
      ▼
[Reset all steps]           ← clears visual state
      │
      ├── 400ms → Step 1 ACTIVE  ← WhatsApp dispatch simulation
      │    ├── 600ms → log: "info"   Lead captured
      │    ├── 600ms → log: "info"   Pipeline started
      │    └── 600ms → log: "success" WhatsApp sent ✓
      │                        └── 400ms → Step 1 DONE
      │
      ├── Step 2 ACTIVE       ← Google Sheets / CRM update
      │    └── logs...        └── Step 2 DONE
      │
      └── Step 3 ACTIVE       ← Email dispatch
           └── logs...        └── Step 3 DONE → Re-enable button
```

Each log message is appended to a DOM `<div>` that mimics a real terminal, with a live timestamp and color-coded severity classes (`info`, `success`, `warn`).

---

## ⚡ Performance & Core Web Vitals

Optimized against Google PageSpeed Insights (Desktop):

| Metric | Score | Status |
|---|---|---|
| **First Contentful Paint (FCP)** | 0.7s | 🟢 Excellent |
| **Speed Index** | 0.8s | 🟢 Excellent |
| **Largest Contentful Paint (LCP)** | 1.4s | 🟢 Excellent |
| **Total Blocking Time (TBT)** | 0ms | 🟢 Perfect |
| **SEO** | 100/100 | 🟢 Perfect |
| **Best Practices** | 100/100 | 🟢 Perfect |

### Key Optimizations Applied

- **WebP Logo Conversion:** Main logo (`LogoOficial.png`) was cropped, resized, and converted to WebP via a Python/Pillow pipeline — resulting in a **95.79% size reduction** (581 KiB → 24.49 KiB).
- **Non-blocking Fonts:** Google Fonts loaded asynchronously with `rel="preload" as="style"` + `onload` swap and a `<noscript>` fallback.
- **Explicit Image Dimensions:** All `<img>` tags have `width` and `height` attributes matching the actual asset aspect ratio, preventing Cumulative Layout Shift (CLS).
- **Lazy Loading:** Below-the-fold images use `loading="lazy"` to defer network requests.
- **Zero JavaScript Blocking:** All scripts use `defer`, guaranteeing TBT of 0ms.

---

## ♿ Accessibility & WCAG Compliance

Every interactive element was audited against WCAG 2.1 Level AA criteria:

- **Color Contrast:** A dedicated `--cyan-dark` token (`#007b8b`, ratio: 4.99:1) was created for teal text on light backgrounds. The base `--text-muted` was darkened to `#536690` (ratio: 5.72:1) to meet the 4.5:1 minimum.
- **Semantic Structure:** Full landmark hierarchy — `<header>`, `<main id="conteudo-principal">`, `<footer>` — allows screen readers to navigate by region.
- **Skip Link:** A visually hidden `.sr-only` "skip to main content" link is the first focusable element in the DOM.
- **Form Labels:** Every `<input>`, `<select>`, and `<textarea>` has a matching `<label>` connected via explicit `for`/`id` bindings.
- **Icon-only Buttons:** All SVG-only interactive elements (social links, mobile menu toggle) carry descriptive `aria-label` attributes.
- **Keyboard Navigation:** Modals trap focus correctly and close on `Escape`. Mobile menu closes on any internal anchor click.

---

## 📁 Project Structure

```
datacron/
├── index.html          # Full single-page application markup
├── styles.css          # ~2,600 lines of CSS (design tokens, components, animations)
├── app.js              # ~285 lines, 9 self-contained interaction modules
├── img/
│   ├── LogoOficial.webp          # Optimized transparent logo (24 KiB)
│   ├── LogoOficial.png           # Source logo (581 KiB, not loaded in production)
│   └── LogoOficialFundoBranco.png
└── assets/
    └── logo_*.png                # Additional logo variants
```

---

## 🚀 Getting Started

No build step. No dependencies. Just open a file.

```bash
# 1. Clone
git clone https://github.com/1agoRP/datacron.git
cd datacron

# 2. Serve (pick one)
python -m http.server 8000
# or
npx serve .
# or just open index.html directly in your browser

# 3. Visit
open http://localhost:8000
```

---

## 👨‍💻 Author

**Iago R. Prado Man** — Full-Stack Developer

I build performant, accessible, and visually refined web products with a strong focus on clean code and real-world results. Datacron is both a client project and a deliberate showcase of what modern native web development can achieve without a framework.

- 🌐 **Portfolio / Company:** [datacron.com.br](https://www.datacron.com.br)
- 💼 **GitHub:** [@1agoRP](https://github.com/1agoRP)
- 📧 **Email:** [contato@datacron.com.br](mailto:contato@datacron.com.br)

---

<div align="center">

*Built with intent. Shipped with precision.*

⭐ If this project impressed you, feel free to star it!

</div>
