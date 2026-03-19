// components/Header.tsx
"use client";

import { type Lang, UI } from "@/lib/i18n";

interface HeaderProps {
  lang: Lang;
  onLangChange: (l: Lang) => void;
}

const LANGS: Lang[] = ["ca", "es", "en"];
const NEWSLETTER_URL = "https://esadepublic.esade.edu/newsletter";

export default function Header({ lang, onLangChange }: HeaderProps) {
  const t = UI[lang];

  return (
    <header className="hdr">
      <div className="hdr-top">
        <a href={NEWSLETTER_URL} target="_blank" rel="noopener noreferrer" className="pub-logo">
          <div className="pub-logo-bar" />
          <span className="pub-logo-text">Public</span>
        </a>

        <div className="hdr-subtitle">
          <span>{t.agentLabel}</span>
          <span>{t.orgLabel}</span>
        </div>

        <div className="hdr-right">
          {/* Selector CA / ES / EN — igual que el butlletí */}
          <nav className="lang-switch" aria-label="Selecció d'idioma">
            {LANGS.map((l, i) => (
              <span key={l} style={{ display: "flex", alignItems: "center" }}>
                <button
                  className={`lang-btn${lang === l ? " active" : ""}`}
                  onClick={() => onLangChange(l)}
                  aria-current={lang === l ? "true" : undefined}
                >
                  {l.toUpperCase()}
                </button>
                {i < LANGS.length - 1 && (
                  <span className="lang-sep" aria-hidden="true">|</span>
                )}
              </span>
            ))}
          </nav>

          <a
            href={NEWSLETTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hdr-link"
          >
            {t.newsletterLink}
          </a>
        </div>
      </div>
    </header>
  );
}
