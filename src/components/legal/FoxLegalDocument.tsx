import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';

export type LegalSection = {
  title: string;
  content: ReactNode;
  list?: ReactNode[];
  note?: ReactNode;
};

type FoxLegalDocumentProps = {
  eyebrow: string;
  title: ReactNode;
  updatedAt: string;
  badge?: string;
  sections: LegalSection[];
  alternateHref: string;
  alternateLabel: string;
};

const legalStyles = `
  :root {
    --fox-bg: #070808;
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
    --font-head: 'Outfit', system-ui, sans-serif;
    --font-body: 'Outfit', system-ui, sans-serif;
  }

  body {
    background: var(--fox-bg);
    color: var(--fox-ink);
    font-family: var(--font-body);
  }

  .legal-shell {
    min-height: 100vh;
    background:
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(180deg, rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(180deg, #070808 0%, #0d0f11 46%, #080909 100%);
    background-size: 72px 72px, 72px 72px, auto;
  }

  .legal-nav {
    position: fixed;
    inset: 0 0 auto;
    z-index: 50;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 0 clamp(18px, 5vw, 72px);
    background: rgba(7, 8, 8, 0.84);
    border-bottom: 1px solid var(--fox-line);
    backdrop-filter: blur(18px);
  }

  .legal-brand,
  .legal-back,
  .legal-footer-brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--fox-ink);
    text-decoration: none;
    font-weight: 800;
    letter-spacing: 0;
  }

  .legal-brand img,
  .legal-footer-brand img {
    width: 38px;
    height: 38px;
    object-fit: contain;
  }

  .legal-brand span span,
  .legal-footer-brand span span {
    color: var(--fox-orange-2);
  }

  .legal-back {
    min-height: 42px;
    padding: 0 14px;
    border: 1px solid var(--fox-line-strong);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--fox-muted);
    font-size: 0.9rem;
    font-weight: 700;
    transition: border-color 0.2s ease, color 0.2s ease;
  }

  .legal-back:hover {
    border-color: rgba(255, 159, 28, 0.55);
    color: var(--fox-orange-2);
  }

  .legal-main {
    width: min(1120px, calc(100% - 36px));
    margin: 0 auto;
    padding: 124px 0 78px;
  }

  .legal-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    gap: clamp(28px, 6vw, 70px);
    align-items: center;
    padding: 0 0 clamp(34px, 5vw, 58px);
    border-bottom: 1px solid var(--fox-line);
  }

  .legal-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
    color: var(--fox-orange-2);
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .legal-eyebrow::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--fox-green);
    box-shadow: 0 0 18px rgba(53, 208, 127, 0.75);
  }

  .legal-title {
    max-width: 760px;
    margin: 0 0 16px;
    font-size: clamp(2.5rem, 6vw, 5.4rem);
    line-height: 0.96;
    letter-spacing: 0;
    font-weight: 800;
  }

  .legal-title em {
    color: var(--fox-orange-2);
    font-style: normal;
  }

  .legal-meta {
    margin: 0;
    color: var(--fox-soft);
    font-size: 0.92rem;
    font-weight: 650;
  }

  .legal-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 18px;
    padding: 8px 12px;
    border: 1px solid rgba(53, 208, 127, 0.28);
    border-radius: 8px;
    background: rgba(53, 208, 127, 0.09);
    color: var(--fox-green);
    font-size: 0.88rem;
    font-weight: 750;
  }

  .legal-hero-logo {
    display: grid;
    place-items: center;
    min-height: 220px;
  }

  .legal-hero-logo img {
    width: min(220px, 56vw);
    height: auto;
    object-fit: contain;
    filter: drop-shadow(0 22px 32px rgba(255, 106, 0, 0.18));
  }

  .legal-layout {
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr);
    gap: clamp(28px, 5vw, 62px);
    padding-top: clamp(34px, 5vw, 58px);
  }

  .legal-toc {
    position: sticky;
    top: 96px;
    align-self: start;
    border: 1px solid var(--fox-line);
    border-radius: 8px;
    background: rgba(21, 23, 25, 0.78);
    padding: 18px;
  }

  .legal-toc-title {
    margin-bottom: 12px;
    color: var(--fox-soft);
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .legal-toc ol {
    display: grid;
    gap: 8px;
    list-style: none;
  }

  .legal-toc a {
    display: block;
    padding: 8px 10px;
    border-radius: 8px;
    color: var(--fox-muted);
    font-size: 0.86rem;
    font-weight: 650;
    line-height: 1.35;
    text-decoration: none;
  }

  .legal-toc a:hover {
    background: rgba(255, 106, 0, 0.1);
    color: var(--fox-orange-2);
  }

  .legal-content {
    display: grid;
    gap: 14px;
  }

  .legal-section {
    scroll-margin-top: 96px;
    border: 1px solid var(--fox-line);
    border-radius: 8px;
    background: rgba(21, 23, 25, 0.78);
    padding: clamp(20px, 3vw, 28px);
  }

  .legal-h2 {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 12px;
    font-size: 1.06rem;
    line-height: 1.35;
  }

  .legal-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex: 0 0 auto;
    border-radius: 8px;
    background: rgba(255, 106, 0, 0.14);
    color: var(--fox-orange-2);
    font-size: 0.82rem;
    font-weight: 900;
  }

  .legal-p {
    margin: 0;
    color: var(--fox-muted);
    font-size: 1rem;
    line-height: 1.72;
  }

  .legal-p a {
    color: var(--fox-orange-2);
    font-weight: 750;
    text-decoration: none;
  }

  .legal-p a:hover { text-decoration: underline; }

  .legal-list {
    display: grid;
    gap: 10px;
    margin: 16px 0 0;
    padding: 0;
    list-style: none;
  }

  .legal-list li {
    display: grid;
    grid-template-columns: 20px 1fr;
    gap: 10px;
    color: var(--fox-muted);
    font-size: 0.96rem;
    line-height: 1.6;
  }

  .legal-list li::before {
    content: '';
    width: 7px;
    height: 7px;
    margin-top: 9px;
    border-radius: 999px;
    background: var(--fox-orange-2);
  }

  .legal-list strong {
    color: var(--fox-ink);
    font-weight: 750;
  }

  .legal-note {
    display: flex;
    gap: 12px;
    margin-top: 18px;
    padding: 14px;
    border: 1px solid rgba(255, 159, 28, 0.28);
    border-radius: 8px;
    background: rgba(255, 106, 0, 0.08);
    color: var(--fox-muted);
    font-size: 0.94rem;
    line-height: 1.62;
  }

  .legal-note svg {
    color: var(--fox-orange-2);
    flex: 0 0 auto;
    margin-top: 2px;
  }

  .legal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 22px;
    padding: 32px clamp(18px, 6vw, 86px);
    border-top: 1px solid var(--fox-line);
    color: var(--fox-soft);
    font-size: 0.86rem;
  }

  .legal-footer-copy {
    margin-top: 4px;
    color: var(--fox-soft);
  }

  .legal-footer-links {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }

  .legal-footer-links a {
    color: var(--fox-soft);
    text-decoration: none;
  }

  .legal-footer-links a:hover { color: var(--fox-ink); }

  @media (max-width: 900px) {
    .legal-hero,
    .legal-layout {
      grid-template-columns: 1fr;
    }

    .legal-toc {
      position: static;
    }

    .legal-hero-logo {
      min-height: 150px;
      justify-content: start;
    }
  }

  @media (max-width: 640px) {
    .legal-nav { height: 66px; }
    .legal-brand > span { display: none; }
    .legal-back { padding: 0 12px; font-size: 0.84rem; }
    .legal-main { padding-top: 104px; }
    .legal-title { font-size: clamp(2.25rem, 14vw, 3.8rem); }
    .legal-footer {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`;

function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function FoxLegalDocument({
  eyebrow,
  title,
  updatedAt,
  badge,
  sections,
  alternateHref,
  alternateLabel,
}: FoxLegalDocumentProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: legalStyles }} />
      <div className="legal-shell">
        <nav className="legal-nav" aria-label="Navegação legal">
          <Link href="/" className="legal-brand" aria-label="FOX">
            <Image src="/fox-logo.png" alt="" width={76} height={76} priority />
            <span>F<span>O</span>X</span>
          </Link>
          <Link href="/" className="legal-back">
            <ArrowLeft size={16} /> Voltar para Home
          </Link>
        </nav>

        <main className="legal-main">
          <header className="legal-hero">
            <div>
              <div className="legal-eyebrow">{eyebrow}</div>
              <h1 className="legal-title">{title}</h1>
              <p className="legal-meta">Última atualização: {updatedAt}</p>
              {badge && (
                <div className="legal-badge">
                  <ShieldCheck size={17} /> {badge}
                </div>
              )}
            </div>
            <div className="legal-hero-logo" aria-hidden="true">
              <Image src="/fox-logo.png" alt="" width={260} height={260} priority />
            </div>
          </header>

          <div className="legal-layout">
            <aside className="legal-toc" aria-label="Sumário">
              <div className="legal-toc-title">Nesta página</div>
              <ol>
                {sections.map((section, index) => (
                  <li key={section.title}>
                    <a href={`#${slugify(section.title)}`}>{index + 1}. {section.title}</a>
                  </li>
                ))}
              </ol>
            </aside>

            <div className="legal-content">
              {sections.map((section, index) => (
                <section className="legal-section" id={slugify(section.title)} key={section.title}>
                  <h2 className="legal-h2">
                    <span className="legal-num">{index + 1}</span>
                    {section.title}
                  </h2>
                  <div className="legal-p">{section.content}</div>
                  {section.list && (
                    <ul className="legal-list">
                      {section.list.map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {section.note && (
                    <div className="legal-note">
                      <Check size={18} />
                      <div>{section.note}</div>
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>
        </main>

        <footer className="legal-footer">
          <div>
            <div className="legal-footer-brand">
              <Image src="/fox-logo.png" alt="" width={52} height={52} />
              <span>F<span>O</span>X</span>
            </div>
            <div className="legal-footer-copy">© 2026 FOX. Todos os direitos reservados.</div>
          </div>
          <div className="legal-footer-links">
            <Link href="/">Home</Link>
            <Link href={alternateHref}>{alternateLabel}</Link>
          </div>
        </footer>
      </div>
    </>
  );
}
