// app/api/chat/route.ts
// Backend segur — la clau ANTHROPIC_API_KEY mai arriba al navegador.
// Llegeix els articles de PUBLIC directament i extreu autors i data.
 
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
 
// Llegeix un article de PUBLIC i retorna el contingut net amb metadades
async function fetchArticle(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "ca" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return `Error llegint ${url}`;
    const html = await res.text();
 
    // Extreu el títol
    const titleMatch = html.match(/<h3[^>]*>\s*<a[^>]*>([^<]+)<\/a>\s*<\/h3>/);
    const title = titleMatch ? titleMatch[1].trim() : "";
 
    // Extreu data i autors: apareixen entre el segon "---" i el tercer "---"
    // Estructura real: ... <img...> --- [data] [autors] [comentaris] ---
    // En el HTML, data i autors estan en un bloc separat per <hr> tags
    
    // Data: format "febrer, 01 2026" o "01-02-2026"
    const dateMatch = html.match(
      /(\d{2}-\d{2}-\d{4})|((gener|febrer|març|abril|maig|juny|juliol|agost|setembre|octubre|novembre|desembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december),?\s+\d{1,2}\s+\d{4})/i
    );
    const date = dateMatch ? dateMatch[0].trim() : "";
 
    // Autors: apareixen just després de la data i abans de "Comentaris/Comentarios/Comments"
    // En el HTML net (sense tags), la seqüència és: [data]\n\n[autors]\n\n[X Comentaris]
    const cleanText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
 
    // Busquem la seqüència: data → autors → comentaris
    const authorMatch = cleanText.match(
      /(?:(?:\d{2}-\d{2}-\d{4})|(?:(?:gener|febrer|març|abril|maig|juny|juliol|agost|setembre|octubre|novembre|desembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)[^\n]+\d{4}))\s*\n+\s*([^\n]+)\s*\n+\s*\d+\s*(?:Comentaris|Comentarios|Comments)/i
    );
    const authors = authorMatch ? authorMatch[1].trim() : "";
 
    // Extreu el contingut principal (entre el primer i l'últim separador de contingut)
    // Eliminem capçalera, peu i botons
    const bodyStart = cleanText.indexOf(title || "");
    const bodyEnd = cleanText.indexOf("Compartir aquesta");
    const body = bodyStart >= 0 && bodyEnd > bodyStart
      ? cleanText.slice(bodyStart, bodyEnd).trim()
      : cleanText.slice(0, 6000);
 
    return `URL: ${url}
TÍTOL: ${title}
DATA: ${date}
AUTORS: ${authors || "Redacció"}
CONTINGUT:
${body.slice(0, 5000)}`;
 
  } catch {
    return `Error llegint l'article: ${url}`;
  }
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
 
        const toolResults = await Promise.all(
          toolUseBlocks.map(async (block: any) => {
            // Si l'agent demana llegir un article de PUBLIC, el llegim nosaltres
            // i li retornem el contingut amb autors i data ben extrets
            if (
              block.name === "web_search" &&
              typeof block.input?.query === "string" &&
              block.input.query.includes("esadepublic.esade.edu/posts")
            ) {
              // Deixem que web_search funcioni normalment
              return {
                type: "tool_result",
                tool_use_id: block.id,
                content: "Tool executed",
              };
            }
 
            // Per a qualsevol altra eina
            return {
              type: "tool_result",
              tool_use_id: block.id,
              content: "Tool executed",
            };
          })
        );
 
        // Detectem si la resposta de cerca conté URLs de PUBLIC
        // i les llegim proactivament per afegir metadades
        const searchResultsText = (response.content as any[])
          .filter((b: any) => b.type === "tool_use" && b.name === "web_search")
          .map((b: any) => JSON.stringify(b.input))
          .join(" ");
 
        // Extraiem URLs de PUBLIC dels resultats (les passarem a l'agent)
        const publicUrls = [
          ...new Set(
            [...(searchResultsText.matchAll(/https:\/\/esadepublic\.esade\.edu\/posts\/post\/[a-z0-9-]+/g))]
              .map((m) => m[0])
              .slice(0, 4) // Màxim 4 articles per no superar el temps
          ),
        ];
 
        // Si hem trobat URLs, les llegim i injectem el contingut com a context addicional
        let articleContext = "";
        if (publicUrls.length > 0) {
          const articleContents = await Promise.all(
            publicUrls.map((url) => fetchArticle(url))
          );
          articleContext =
            "\n\n[CONTINGUT DELS ARTICLES LLEGITS AL SERVIDOR]\n" +
            articleContents.join("\n\n---\n\n");
        }
 
        // Afegim el context dels articles als tool results
        const enrichedResults = toolResults.map((r: any, idx: number) => {
          if (idx === 0 && articleContext) {
            return { ...r, content: "Tool executed" + articleContext };
          }
          return r;
        });
 
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
 
