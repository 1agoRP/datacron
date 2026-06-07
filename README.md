# ⚡ Datacron — High-Performance Automation & Web Solutions

[![HTML5 Badge](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Glossary/HTML5)
[![CSS3 Badge](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript Badge](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![PageSpeed Score](https://img.shields.io/badge/PageSpeed-Green-success?style=for-the-badge&logo=googlechrome&logoColor=white)](https://pagespeed.web.dev/)

A premium, high-performance static website for **Datacron**, presenting custom web systems, high-conversion landing pages, and process automation solutions. Built purely with native web technologies (HTML5, Vanilla CSS3, and ES6+ JavaScript), this project demonstrates clean coding standards, advanced CSS animations, and rigorous performance and accessibility optimizations.

🚀 **Live Preview:** [datacron.com.br](https://www.datacron.com.br)

---

## 💎 Project Highlights & Portfolio Value

This codebase serves as a showcase of software engineering best practices applied to front-end development, specifically focusing on **native performance** and **accessibility (WCAG AA)**.

### 1. ⚡ Performance Optimization & Web Vitals
Optimized using Google PageSpeed Insights parameters to guarantee a fast and smooth user experience:
* **Asset Optimization:** Converted heavy graphics to WebP with custom lossy compression, achieving a **95% size reduction** (from 581 KiB to 24 KiB) for the main logo assets.
* **Layout Stability (CLS):** Defined explicit aspect-ratio dimensions on all images to guarantee **Cumulative Layout Shift (CLS) < 0.1**.
* **Non-Blocking Font Rendering:** Implemented asynchronous font loading with preloading and fallback font-display styling to speed up **First Contentful Paint (FCP)**.

### 2. ♿ Accessibility & Search Engine Optimization (SEO)
Compliant with WCAG AA accessibility standards and SEO indexing criteria:
* **Color Contrast:** Curated color tokens (e.g. `--text-muted` and `--cyan-dark`) optimized for a **contrast ratio > 4.5:1** on light backgrounds.
* **Semantic Landmark Structure:** Entire page layout is organized inside `<header>`, `<main id="conteudo-principal">`, and `<footer>` elements for screen readers.
* **Interactive Elements:** Added skip-to-content links, explicit `id`/`for` bindings on form labels, and detailed `aria-label` tags on icon-only buttons.
* **100/100 SEO & Best Practices:** Properly structured heading hierarchies, meta descriptions, open graph tags, and clean, error-free console outputs.

### 3. 🎨 Advanced UI/UX & Micro-Animations
* **Dynamic Mouse-Tracking Cards:** Implemented a hardware-accelerated spotlight gradient effect on service cards. Custom JS calculates the cursor's coordinates relative to the card and binds them to CSS variables (`--mx`, `--my`) in real-time.
* **Glassmorphism Header:** A smooth transition on scroll that applies background blur (`backdrop-filter`) and border shifts as the user scrolls.

---

## 🕹️ Technical Feature Showcase: Automation Simulator

One of the project's highlights is the **Automation Pipeline Simulator**. It is a custom state machine built in Vanilla JavaScript that replicates a real-world pipeline execution (Lead Capture ➔ Google Sheets Integration ➔ Email Dispatch).

```
[User triggers Pipeline] ➔ [Step 1: Whatsapp Alert] ➔ [Step 2: CRM Update] ➔ [Step 3: Email proposal]
```

### Behind the Scenes (State & DOM manipulation):
* Tracks execution flow sequentially through timing functions.
* Dynamically appends log messages to a simulated console box with color-coded severity levels (`info`, `success`, `warn`).
* Toggles active states, loading spinners, and layout classes dynamically using clean DOM APIs.

---

## 🛠️ Technology Stack

* **Structure:** HTML5 (Semantic and fully accessible).
* **Styling:** Vanilla CSS3 (CSS Variables, Flexbox, Grid, Keyframes, Custom Transitions).
* **Interactions:** Vanilla JavaScript (ES6 Modules, DOM Manipulation, Event Listeners).
* **Tooling:** PIL/Pillow (Python) for automated graphic cropping and WebP compilation.

---

## 🚀 How to Run Locally

Since this is a lightweight static application, it doesn't require complex build setups or heavy `node_modules` dependencies.

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/1agoRP/datacron.git
   cd datacron
   ```

2. **Serve Locally:**
   You can serve the files using any lightweight static server:

   * **Using Python:**
     ```bash
     python -m http.server 8000
     ```
   * **Using Node.js:**
     ```bash
     npx http-server -p 8000
     ```

3. Open your browser and navigate to `http://localhost:8000`.

---

## 👨‍💻 Author

**Iago R. Prado Man**
* GitHub: [@1agoRP](https://github.com/1agoRP)
* LinkedIn: [Iago Prado](https://linkedin.com/in/iagoprado) *(Optional: Replace with your link)*
* Email: [contato@datacron.com.br](mailto:contato@datacron.com.br)
