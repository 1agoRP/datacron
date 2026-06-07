/* =============================================================
   DATACRON — APP.JS
   1. Navbar glassmorphic ao rolar
   2. Menu mobile (abre/fecha/links)
   3. Reveal on scroll
   4. Contador animado (IntersectionObserver)
   5. Bento Glow (cursor nas cards)
   6. Simulador de automação
   7. Formulário com loader + fade-in
   8. Modais legais (Termos & Privacidade)
   9. Banner de consentimento de cookies (LGPD)
   ============================================================= */

document.addEventListener('DOMContentLoaded', () => {

    /* ── 8. MODAIS LEGAIS ──────────────────────────────── */
    window.openModal = function (id) {
        const overlay = document.getElementById(id);
        if (!overlay) return;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        // Foco acessível
        const closeBtn = overlay.querySelector('.modal-close');
        if (closeBtn) setTimeout(() => closeBtn.focus(), 100);
    };

    window.closeModal = function (id) {
        const overlay = document.getElementById(id);
        if (!overlay) return;
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    };

    // Fechar ao clicar no backdrop
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) window.closeModal(overlay.id);
        });
    });

    // Fechar com Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.open').forEach(o => {
                window.closeModal(o.id);
            });
        }
    });

    /* ── 9. BANNER DE COOKIES (LGPD) ────────────────────── */
    const cookieBanner = document.getElementById('cookie-banner');
    const cookieAccept = document.getElementById('cookie-accept');
    const cookieReject = document.getElementById('cookie-reject');
    const COOKIE_KEY = 'datacron_cookie_consent';

    function dismissCookieBanner(choice) {
        localStorage.setItem(COOKIE_KEY, choice);      // 'accepted' | 'rejected'
        if (cookieBanner) {
            cookieBanner.classList.remove('show');
            cookieBanner.classList.add('hide');
        }
    }

    if (cookieBanner && !localStorage.getItem(COOKIE_KEY)) {
        // Exibe após 1.2s para não bloquear a experiência inicial
        setTimeout(() => cookieBanner.classList.add('show'), 1200);
    }

    if (cookieAccept) cookieAccept.addEventListener('click', () => dismissCookieBanner('accepted'));
    if (cookieReject) cookieReject.addEventListener('click', () => dismissCookieBanner('rejected'));

    /* ── 1. NAVBAR GLASSMORPHIC AO ROLAR ─────────────────── */
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 40);
        });
    }

    /* ── 2. MENU MOBILE ──────────────────────────────────── */
    const mobileMenu = document.getElementById('mobile-menu');
    const menuToggle = document.getElementById('menu-toggle');
    const mobileClose = document.getElementById('mobile-close');

    function closeMobile() {
        if (mobileMenu) mobileMenu.classList.remove('open');
    }
    window.closeMobile = closeMobile; // expõe para onclick inline no HTML

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            if (mobileMenu) mobileMenu.classList.add('open');
        });
    }
    if (mobileClose) {
        mobileClose.addEventListener('click', closeMobile);
    }

    // Fecha o menu ao clicar em qualquer âncora interna do menu mobile
    if (mobileMenu) {
        mobileMenu.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', closeMobile);
        });
    }

    /* ── 3. REVEAL ON SCROLL ─────────────────────────────── */
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((e, i) => {
            if (e.isIntersecting) {
                setTimeout(() => e.target.classList.add('visible'), i * 80);
                observer.unobserve(e.target);
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    /* ── 4. CONTADOR ANIMADO (IntersectionObserver) ──────── */
    function animateCounter(el) {
        const target = parseInt(el.dataset.target, 10);
        if (isNaN(target)) return;
        const originalText = el.textContent;
        const suffix = originalText.replace(/[\d]/g, '');   // preserva "+", "%", "x" etc.
        let current = 0;
        const step = target / 60;
        const timer = setInterval(() => {
            current = Math.min(current + step, target);
            el.textContent = Math.floor(current) + suffix;
            if (current >= target) clearInterval(timer);
        }, 16);
    }

    const counterTargets = document.querySelectorAll('[data-target]');
    if (counterTargets.length > 0) {
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.6 });
        counterTargets.forEach(el => counterObserver.observe(el));
    }

    /* ── 5. BENTO GLOW (rastreamento de cursor nos cards) ── */
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
            card.style.setProperty('--my', `${e.clientY - rect.top}px`);
        });
    });

    /* ── 6. SIMULADOR DE AUTOMAÇÃO ───────────────────────── */
    const btnSim = document.getElementById('btn-sim');
    const btnText = document.getElementById('btn-sim-text');
    const consoleEl = document.getElementById('console');

    const steps = [
        {
            id: 'step-1', badge: 'badge-1', label: 'WhatsApp enviado', logs: [
                { type: 'info', msg: 'Lead capturado: João Silva — Empresa Ltda' },
                { type: 'info', msg: 'Iniciando pipeline de automação...' },
                { type: 'success', msg: '✓ WhatsApp enviado para João Silva (+55 11 91234-5678)' },
            ]
        },
        {
            id: 'step-2', badge: 'badge-2', label: 'CRM registrado', logs: [
                { type: 'info', msg: 'Conectando ao Google Sheets API...' },
                { type: 'success', msg: '✓ Lead registrado na planilha (linha 142)' },
                { type: 'success', msg: '✓ CRM atualizado — status: Novo Lead' },
            ]
        },
        {
            id: 'step-3', badge: 'badge-3', label: 'E-mail enviado', logs: [
                { type: 'info', msg: 'Preparando e-mail de proposta...' },
                { type: 'success', msg: '✓ E-mail enviado para joao@empresa.com.br' },
                { type: 'warn', msg: '→ Pipeline completo em 0.84s. Esteira encerrada.' },
            ]
        },
    ];

    function getTime() { return new Date().toLocaleTimeString('pt-BR'); }

    function addLog(type, msg) {
        if (!consoleEl) return;
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.innerHTML = `<span class="t">[${getTime()}]</span> <span class="msg">${msg}</span>`;
        consoleEl.appendChild(line);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    if (btnSim) {
        let running = false;
        btnSim.addEventListener('click', () => {
            if (running) return;
            running = true;
            btnSim.disabled = true;
            btnText.textContent = 'Executando...';

            [1, 2, 3].forEach(i => {
                document.getElementById(`step-${i}`).classList.remove('active', 'done');
                const b = document.getElementById(`badge-${i}`);
                b.textContent = 'Aguardando';
                b.className = 'ps-badge';
            });

            consoleEl.innerHTML = '<div class="log-line"><span class="t">[--:--:--]</span> <span class="msg" style="color:rgba(255,255,255,.3)">Sistema Datacron pronto. Aguardando disparo...</span></div>';

            let delay = 400;
            steps.forEach(step => {
                setTimeout(() => {
                    document.getElementById(step.id).classList.add('active');
                    const b = document.getElementById(step.badge);
                    b.textContent = 'Executando';
                    b.className = 'ps-badge running';
                }, delay);
                delay += 300;

                step.logs.forEach(log => {
                    setTimeout(() => addLog(log.type, log.msg), delay);
                    delay += 600;
                });

                setTimeout(() => {
                    const el = document.getElementById(step.id);
                    el.classList.remove('active');
                    el.classList.add('done');
                    const b = document.getElementById(step.badge);
                    b.textContent = step.label;
                    b.className = 'ps-badge done';
                }, delay);
                delay += 400;
            });

            setTimeout(() => {
                btnText.textContent = 'Disparar Novamente';
                btnSim.disabled = false;
                running = false;
            }, delay + 200);
        });
    }

    /* ── 7. FORMULÁRIO DE CONTATO com Loader + Fade-in ───── */
    const contactForm = document.getElementById('contact-form');
    const formSuccess = document.getElementById('form-success');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const submitBtn = contactForm.querySelector('[type="submit"]');
            const originalContent = submitBtn.innerHTML;

            // Mostra spinner no botão
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Enviando...
            `;

            // Simula envio em 1.6s
            setTimeout(() => {
                // Esconde formulário suavemente
                contactForm.style.transition = 'opacity 0.4s ease';
                contactForm.style.opacity = '0';
                contactForm.style.pointerEvents = 'none';

                setTimeout(() => {
                    contactForm.style.display = 'none';
                    if (formSuccess) {
                        formSuccess.classList.add('visible');
                    }
                    // Restaura botão para uso futuro (se o usuário inspecionar)
                    submitBtn.innerHTML = originalContent;
                    submitBtn.disabled = false;
                }, 400);
            }, 1600);
        });
    }

});