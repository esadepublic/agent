// app/api/chat/route.ts
// Backend segur — la clau ANTHROPIC_API_KEY mai arriba al navegador.

/* eslint-disable @typescript-eslint/no-explicit-any */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { UI, type Lang } from "@/lib/i18n";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  lang: Lang;
}

export async function POST(request: NextRequest) {
  // 1. Validació
  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petició invàlida" }, { status: 400 });
  }

  const { messages, lang } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Cal enviar missatges" }, { status: 400 });
  }
  if (!lang || !["ca", "es", "en"].includes(lang)) {
    return NextResponse.json({ error: "Idioma no vàlid" }, { status: 400 });
  }

  // 2. Eliminem el missatge de benvinguda
  const welcomeContent = UI[lang].welcome;
  const apiMessages = messages
    .filter((m) => m.content !== welcomeContent)
    .map((m) => ({ role: m.role, content: m.content }));

  if (apiMessages.length === 0) {
    return NextResponse.json({ error: "No hi ha missatges vàlids" }, { status: 400 });
  }

  // 3. System prompt reforçat per llegir contingut complet dels articles
  const systemPrompt = UI[lang].systemPrompt;

  // 4. Eines disponibles: web_search per cercar + web_fetch per llegir articles complets
  const tools: any[] = [
    {
      type: "web_search_20250305",
      name: "web_search",
    },
  ];

  let currentMessages: any[] = apiMessages;
  let finalText = "";

  try {
    for (let i = 0; i < 10; i++) {
      const response: any = await (client.messages.create as any)({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        tools,
        messages: currentMessages,
      });

      // Recollim text
      const textBlocks = (response.content as any[])
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n");

      if (textBlocks) finalText = textBlocks;
      if (response.stop_reason === "end_turn") break;

      if (response.stop_reason === "tool_use") {
        const toolUseBlocks = (response.content as any[]).filter(
          (b: any) => b.type === "tool_use"
        );

        // Processem cada tool_use: si és web_search, retornem els resultats
        // L'agent pot fer múltiples cerques i llegir múltiples pàgines
        const toolResults = await Promise.all(
          toolUseBlocks.map(async (block: any) => {
            // Per a web_fetch manual d'articles de PUBLIC
            if (
              block.name === "web_fetch" &&
              block.input?.url?.includes("esadepublic.esade.edu/posts/")
            ) {
              try {
                const res = await fetch(block.input.url, {
                  headers: { "User-Agent": "Mozilla/5.0" },
                });
                const html = await res.text();
                // Extreu el text principal eliminant HTML
                const text = html
                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                  .replace(/<[^>]+>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 8000); // Limitem per no superar el context
                return {
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: text,
                };
              } catch {
                return {
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: "Error llegint l'article",
                };
              }
            }

            // Per a web_search i altres eines, retornem confirmació
            return {
              type: "tool_result",
              tool_use_id: block.id,
              content: "Tool executed",
            };
          })
        );

        currentMessages = [
          ...currentMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ];
      } else {
        break;
      }
    }

    return NextResponse.json({ text: finalText });
  } catch (error) {
    console.error("Error API Anthropic:", error);
    return NextResponse.json(
      { error: "Error en connectar amb l'API" },
      { status: 500 }
    );
  }
}
