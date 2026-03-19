// lib/useChat.ts
// Hook que gestiona tota la lògica del xat:
// crida el backend propi (/api/chat) en lloc de l'API d'Anthropic directament.

import { useState, useCallback } from "react";
import { type Lang, UI } from "./i18n";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useChat(lang: Lang) {
  const t = UI[lang];
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t.welcome },
  ]);
  const [loading, setLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback((newLang: Lang) => {
    setMessages([{ role: "assistant", content: UI[newLang].welcome }]);
    setError(null);
    setSearchStatus("");
  }, []);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || loading) return;

      const newMessages: Message[] = [
        ...messages,
        { role: "user", content: userText },
      ];
      setMessages(newMessages);
      setLoading(true);
      setSearchStatus(t.searchMsg);
      setError(null);

      try {
        // Cridem el nostre backend segur, no l'API d'Anthropic directament
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages, lang }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.error) throw new Error(data.error);

        setMessages([
          ...newMessages,
          { role: "assistant", content: data.text || t.noAnswer },
        ]);
      } catch (err) {
        console.error(err);
        setError(t.errorMsg);
      } finally {
        setLoading(false);
        setSearchStatus("");
      }
    },
    [messages, loading, lang, t]
  );

  return { messages, loading, searchStatus, error, sendMessage, reset };
}
