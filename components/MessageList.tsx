// components/MessageList.tsx
"use client";

import { useEffect, useRef } from "react";
import { type Message } from "@/lib/useChat";
import { type Lang, UI } from "@/lib/i18n";
import { renderMarkdown } from "@/lib/renderMarkdown";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  searchStatus: string;
  error: string | null;
  lang: Lang;
}

export default function MessageList({
  messages,
  loading,
  searchStatus,
  error,
  lang,
}: MessageListProps) {
  const t = UI[lang];
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="msgs">
      {messages.map((msg, i) => (
        <div key={i} className="msg-block">
          <div className={`msg-role${msg.role === "assistant" ? " agent-role" : ""}`}>
            {msg.role === "assistant" ? t.roleAgent : t.roleUser}
          </div>
          <div
            className={`msg-body${msg.role === "user" ? " user-body" : ""}`}
            dangerouslySetInnerHTML={{
              __html:
                msg.role === "assistant"
                  ? renderMarkdown(msg.content)
                  : msg.content,
            }}
          />
        </div>
      ))}

      {loading && (
        <div className="searching">
          <div className="search-label">{t.roleAgent}</div>
          <div className="search-status">
            <div className="dots">
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
            </div>
            <span>{searchStatus}</span>
          </div>
        </div>
      )}

      {error && <div className="err">{error}</div>}
      <div ref={endRef} />
    </div>
  );
}
