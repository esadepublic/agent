// app/api/chat/route.ts
// Aquest endpoint s'executa al SERVIDOR (Node.js).
// La clau ANTHROPIC_API_KEY mai arriba al navegador de l'usuari.

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { UI, type Lang } from "@/lib/i18n";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // Variable d'entorn segura
});

// Tipus de missatge que acceptem del frontend
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  lang: Lang;
}

export async function POST(request: NextRequest) {
  // ── 1. Validació de la petició ─────────────────────────────────────────────
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

  // ── 2. Neteja dels missatges — eliminem el missatge de benvinguda ──────────
  const welcomeContent = UI[lang].welcome;
  const apiMessages = messages
    .filter((m) => m.content !== welcomeContent)
    .map((m) => ({ role: m.role, content: m.content }));

  if (apiMessages.length === 0) {
    return NextResponse.json({ error: "No hi ha missatges vàlids" }, { status: 400 });
  }

  // ── 3. Bucle agèntic amb web_search ───────────────────────────────────────
  // Executem fins a 8 iteracions per permetre que l'agent busqui i llegeixi
  // articles de PUBLIC abans de generar la resposta final.
  const systemPrompt = UI[lang].systemPrompt;
  const tools: Anthropic.Tool[] = [
    {
      // @ts-expect-error — tipus web_search no inclòs al SDK encara
      type: "web_search_20250305",
      name: "web_search",
    },
  ];

  let currentMessages: Anthropic.MessageParam[] = apiMessages;
  let finalText = "";
  const MAX_ITERATIONS = 8;

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: systemPrompt,
        // @ts-expect-error — tools inclou web_search_20250305
        tools,
        messages: currentMessages,
      });

      // Recollim els blocs de text
      const textBlocks = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      if (textBlocks) finalText = textBlocks;

      // Si l'agent ha acabat, sortim
      if (response.stop_reason === "end_turn") break;

      // Si l'agent vol usar una eina, construïm la resposta i continuem
      if (response.stop_reason === "tool_use") {
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
        );

        const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((block) => ({
          type: "tool_result",
          tool_use_id: block.id,
          content: "Tool executed",
        }));

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
