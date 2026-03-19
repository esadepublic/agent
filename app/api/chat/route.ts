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
 
// Llegeix un article de PUBLIC i retorna un bloc de text estructurat
// amb URL, títol, data, autors i contingut — tot extret del HTML real.
async function fetchArticle(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PublicAgent/1.0)",
        "Accept-Language": "ca,es;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
 
    const html = await res.text();
 
    // --- Extreu el text net eliminant scripts, styles i tags HTML ---
    const clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, "\n")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
 
    // --- Extreu el títol: és el primer h3 o el text del <title> ---
    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = titleTagMatch ? titleTagMatch[1] : "";
    // "Public :: Títol de l'article" → agafem la part després de "::"
    const title = rawTitle.includes("::")
      ? rawTitle.split("::")[1].trim()
      : rawTitle.trim();
 
    // --- Extreu data i autors ---
    // Estructura real del HTML net:
    //   [títol]
    //   [primer paràgraf de l'article]
    //   [imatge → text buit]
    //   ---
    //   [mes, dd yyyy]          ← DATA
    //   [autors]                ← AUTORS
    //   [N Comentaris]
    //   ---
    //   [resta del contingut]
    //
    // Busquem el patró: data → línia d'autors → "Comentaris/Comentarios/Comments"
 
    const mesos = "gener|febrer|març|abril|maig|juny|juliol|agost|setembre|octubre|novembre|desembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december";
 
    // Patró 1: "mes, dd yyyy" (format català/castellà del lloc)
    const datePattern1 = new RegExp(
      `((?:${mesos}),?\\s+\\d{1,2}\\s+\\d{4})\\s*\\n+\\s*([^\\n]+?)\\s*\\n+\\s*\\d+\\s*(?:Comentaris|Comentarios|Comments)`,
      "i"
    );
 
    // Patró 2: "dd-mm-yyyy" (format alternatiu)
    const datePattern2 = new RegExp(
      `(\\d{2}-\\d{2}-\\d{4})\\s*\\n+\\s*([^\\n]+?)\\s*\\n+\\s*\\d+\\s*(?:Comentaris|Comentarios|Comments)`,
      "i"
    );
 
    let date = "";
    let authors = "";
 
    const match1 = clean.match(datePattern1);
    const match2 = clean.match(datePattern2);
 
    if (match1) {
      date = match1[1].trim();
      authors = match1[2].trim();
    } else if (match2) {
      date = match2[1].trim();
      authors = match2[2].trim();
    }
 
    // Validació: si "authors" conté text típic de nav (Subscripcions, etc.), és fals
    const navKeywords = ["subscripcions", "identificar", "consell", "assessor", "partners"];
    if (navKeywords.some((k) => authors.toLowerCase().includes(k))) {
      authors = "";
    }
 
    // Si no hem trobat autors, posem "Redacció"
    if (!authors) authors = "Redacció";
 
    // --- Extreu el contingut principal ---
    // Comença al títol i acaba a "Compartir aquesta notícia" o "Compartir esta"
    const contentStart = title ? clean.indexOf(title) : 0;
    const contentEnd = clean.search(/Compartir (?:aquesta notícia|esta noticia|this)/i);
    const body =
      contentStart >= 0 && contentEnd > contentStart
        ? clean.slice(contentStart, contentEnd).trim()
        : clean.slice(0, 5000).trim();
 
    return [
      `URL: ${url}`,
      `TÍTOL: ${title}`,
      `DATA: ${date}`,
      `AUTORS: ${authors}`,
      `CONTINGUT:`,
      body.slice(0, 4500),
    ].join("\n");
  } catch {
    return "";
  }
}
 
// Extreu totes les URLs de PUBLIC d'un bloc de text
function extractPublicUrls(text: string): string[] {
  const matches = text.matchAll(
    /https?:\/\/esadepublic\.esade\.edu\/posts\/post\/[a-zA-Z0-9_-]+/g
  );
  return [...new Set([...matches].map((m) => m[0]))].slice(0, 5);
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
 
  // 3. Bucle agèntic
  const systemPrompt = UI[lang].systemPrompt;
  const tools: any[] = [
    { type: "web_search_20250305", name: "web_search" },
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
 
      // Recollim text de la resposta
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
 
        // Processem cada tool_use
        const toolResults = await Promise.all(
          toolUseBlocks.map(async (block: any) => {
            // Retornem sempre "Tool executed" — els resultats reals
            // els afegim com a context addicional just a continuació
            return {
              type: "tool_result" as const,
              tool_use_id: block.id,
              content: "Tool executed",
            };
          })
        );
 
        // Serialitzem tota la resposta per buscar-hi URLs de PUBLIC
        const responseText = JSON.stringify(response.content);
        const publicUrls = extractPublicUrls(responseText);
 
        // Llegim els articles trobats en paral·lel
        let articleContext = "";
        if (publicUrls.length > 0) {
          const articles = await Promise.all(publicUrls.map(fetchArticle));
          const validArticles = articles.filter((a) => a.length > 0);
          if (validArticles.length > 0) {
            articleContext =
              "\n\n[ARTICLES LLEGITS — usa els camps TÍTOL, DATA i AUTORS exactament tal com apareixen]\n\n" +
              validArticles.join("\n\n---\n\n");
          }
        }
 
        // Afegim el context dels articles al primer tool result
        const enrichedResults = toolResults.map((r, idx) =>
          idx === 0 ? { ...r, content: r.content + articleContext } : r
        );
 
        currentMessages = [
          ...currentMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: enrichedResults },
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
 
