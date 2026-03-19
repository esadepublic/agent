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
 
// Extreu data i autors del bloc HTML entre els dos <hr> de metadades.
// Estructura real del lloc:
//   <hr>
//   febrer, 01 2026        ← DATA
//   Bert George i John M. Bryson  ← AUTORS
//   0 Comentaris
//   <hr>
function extractMeta(html: string): { date: string; authors: string } {
  // Agafem tot el contingut entre els <hr> tags
  // Hi ha múltiples <hr> a la pàgina; el que ens interessa és el que conté la data
  const mesos = "gener|febrer|març|abril|maig|juny|juliol|agost|setembre|octubre|novembre|desembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december";
  const dateRe = new RegExp(`(?:${mesos})[^<]*\\d{4}|\\d{2}-\\d{2}-\\d{4}`, "i");
 
  // Partim l'HTML per <hr> i busquem el fragment que conté la data
  const segments = html.split(/<hr\s*\/?>/i);
 
  for (const segment of segments) {
    const dateMatch = segment.match(dateRe);
    if (!dateMatch) continue;
 
    // Hem trobat el segment amb la data. Netegem els tags HTML.
    const clean = segment
      .replace(/<[^>]+>/g, "\n")
      .replace(/\s+/g, " ")
      .trim();
 
    // La data és el primer match del patró de data
    const date = dateMatch[0].trim();
 
    // Els autors: text que ve just després de la data i abans de "Comentari/Comment"
    // Separem per la data i agafem el que ve a continuació
    const afterDate = clean.slice(clean.indexOf(date) + date.length).trim();
 
    // Eliminem el comptador de comentaris (ex: "0 Comentaris" o "0 Comments")
    const authorsRaw = afterDate
      .replace(/\d+\s*(?:Comentaris|Comentarios|Comments)[^]*/i, "")
      .trim();
 
    // Quedem-nos amb la primera línia no buida
    const authors = authorsRaw
      .split(/\s{2,}|\n/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)[0] || "";
 
    // Validació: si sembla text de navegació, descartem
    const navWords = ["subscripcions", "identificar", "consell", "partners", "esade.edu", "http"];
    if (navWords.some((w) => authors.toLowerCase().includes(w))) continue;
 
    return { date, authors: authors || "Redacció" };
  }
 
  return { date: "", authors: "Redacció" };
}
 
// Llegeix un article de PUBLIC i retorna un bloc estructurat
async function fetchArticle(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PublicAgent/1.0)",
        "Accept-Language": "ca,es;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return "";
 
    const html = await res.text();
 
    // Títol: de <title>Public :: TÍTOL</title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : "";
    const title = rawTitle.includes("::")
      ? rawTitle.split("::").slice(1).join("::").trim()
      : rawTitle.trim();
 
    // Data i autors: dels tags <hr>
    const { date, authors } = extractMeta(html);
 
    // Contingut principal: text net entre el títol i "Compartir"
    const bodyHtml = (() => {
      const start = html.indexOf("<h3");
      const end = html.search(/Compartir (?:aquesta|esta|this)/i);
      return start >= 0 && end > start ? html.slice(start, end) : html;
    })();
 
    const body = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
 
    if (!title && !date) return "";
 
    return [
      `URL: ${url}`,
      `TÍTOL: ${title}`,
      `DATA: ${date || "no disponible"}`,
      `AUTORS: ${authors}`,
      `CONTINGUT:`,
      body,
    ].join("\n");
  } catch {
    return "";
  }
}
 
// Extreu URLs de PUBLIC d'un text
function extractPublicUrls(text: string): string[] {
  const matches = text.matchAll(
    /https?:\/\/esadepublic\.esade\.edu\/posts\/post\/[a-zA-Z0-9_-]+/g
  );
  return [...new Set([...matches].map((m) => m[0]))].slice(0, 5);
}
 
export async function POST(request: NextRequest) {
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
 
  const welcomeContent = UI[lang].welcome;
  const apiMessages = messages
    .filter((m) => m.content !== welcomeContent)
    .map((m) => ({ role: m.role, content: m.content }));
 
  if (apiMessages.length === 0) {
    return NextResponse.json({ error: "No hi ha missatges vàlids" }, { status: 400 });
  }
 
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
 
        const toolResults = toolUseBlocks.map((block: any) => ({
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: "Tool executed",
        }));
 
        // Cerquem URLs de PUBLIC a tota la resposta
        const responseText = JSON.stringify(response.content);
        const publicUrls = extractPublicUrls(responseText);
 
        let articleContext = "";
        if (publicUrls.length > 0) {
          const articles = await Promise.all(publicUrls.map(fetchArticle));
          const valid = articles.filter((a) => a.length > 0);
          if (valid.length > 0) {
            articleContext =
              "\n\n[ARTICLES LLEGITS — usa els camps TÍTOL, DATA i AUTORS exactament tal com apareixen aquí]\n\n" +
              valid.join("\n\n---\n\n");
          }
        }
 
        const enrichedResults = toolResults.map((r: any, idx: number) =>
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
 
