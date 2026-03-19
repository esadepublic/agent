// components/ChatInput.tsx
"use client";

import { useRef, KeyboardEvent, ChangeEvent } from "react";
import { type Lang, UI } from "@/lib/i18n";

interface ChatInputProps {
  lang: Lang;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export default function ChatInput({ lang, value, onChange, onSend, disabled }: ChatInputProps) {
  const t = UI[lang];
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // Auto-expand
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = Math.min(ref.current.scrollHeight, 120) + "px";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="inp-area">
      <div className="inp-row">
        <textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t.placeholder}
          disabled={disabled}
          rows={1}
          aria-label={t.placeholder}
        />
        <button
          className="send"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label={t.sendBtn}
        >
          {t.sendBtn}
        </button>
      </div>
    </div>
  );
}
