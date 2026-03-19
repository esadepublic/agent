// components/SuggestedQuestions.tsx
"use client";

import { type Lang, UI } from "@/lib/i18n";

interface SuggestedQuestionsProps {
  lang: Lang;
  onSelect: (q: string) => void;
}

export default function SuggestedQuestions({ lang, onSelect }: SuggestedQuestionsProps) {
  const t = UI[lang];

  return (
    <div className="suggs">
      <div className="suggs-label">{t.suggsLabel}</div>
      <div className="suggs-grid">
        {t.questions.map((q, i) => (
          <button key={i} className="sugg" onClick={() => onSelect(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
