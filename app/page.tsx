// app/page.tsx
"use client";

import { useState } from "react";
import { type Lang, UI } from "@/lib/i18n";
import { useChat } from "@/lib/useChat";
import Header from "@/components/Header";
import MessageList from "@/components/MessageList";
import SuggestedQuestions from "@/components/SuggestedQuestions";
import ChatInput from "@/components/ChatInput";

export default function Page() {
  const [lang, setLang] = useState<Lang>("ca");
  const { messages, loading, searchStatus, error, sendMessage, reset } =
    useChat(lang);
  const [input, setInput] = useState("");

  const t = UI[lang];

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    setInput("");
    reset(newLang);
  };

  const handleSend = (text?: string) => {
    const msg = text ?? input;
    if (!msg.trim()) return;
    sendMessage(msg);
    setInput("");
  };

  // Mostra les preguntes suggerides només quan hi ha el missatge de benvinguda
  const showSuggestions = messages.length <= 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header lang={lang} onLangChange={handleLangChange} />

      <div className="wrap">
        <MessageList
          messages={messages}
          loading={loading}
          searchStatus={searchStatus}
          error={error}
          lang={lang}
        />

        {showSuggestions && (
          <SuggestedQuestions lang={lang} onSelect={(q) => handleSend(q)} />
        )}

        <ChatInput
          lang={lang}
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          disabled={loading}
        />

        <footer className="foot">{t.footer}</footer>
      </div>
    </div>
  );
}
