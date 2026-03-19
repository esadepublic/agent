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
 
// Llegeix un article de PUBLIC i retorna les seves metadades estructurades
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
 
    // Títol des de <title>Public :: TÍTOL</title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : "";
    const title = rawTitle.includes("::")
      ? rawTitle.split("::").slice(1).join("::").trim()
      : rawTitle.trim();
 
    // Data i autors: estan en el segment HTML entre dos <hr>
    // Estructura: <hr> → data → autors → "N Comentaris" → <hr>
    const mesos =
      "gener|febrer|març|abril|maig|juny|juliol|agost|setembre|octubre|novembre|desembre|" +
      "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|" +
      "january|february|march|april|may|june|july|august|september|october|november|december";
    const dateRe = new RegExp(
      `((?:${mesos})[^<,]*,?\\s*\\d{1,2}\\s+\\d{4}|\\d{2}-\\d{2}-\\d{4})`,
      "i"
    );
 
    let date = "";
    let authors = "Redacció";
 
    const segments = html.split(/<hr\s*\/?>/i);
    for (const seg of segments) {
      const dm = seg.match(dateRe);
      if (!dm) continue;
      date = dm[1].trim();
 
      const clean = seg
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
 
      const afterDate = clean.slice(clean.indexOf(date) + date.length).trim();
      const beforeComments = afterDate
        .replace(/\d+\s*(?:Comentaris|Comentarios|Comments)[\s\S]*/i, "")
        .trim();
 
      const candidate = beforeComments
        .split(/\s{3,}/)
        .map((s: string) => s.trim())
        .filter(
          (s: string) =>
            s.length > 2 &&
            !["subscripcions", "identificar", "consell", "esade.edu", "http", "partners"].some(
              (w) => s.toLowerCase().includes(w)
            )
        )[0];
 
      if (candidate) authors = candidate;
      break;
    }
 
    // Contingut principal (sense capçalera ni peu)
    const startIdx = html.indexOf("<h3");
    const endIdx = html.search(/Compartir (?:aquesta|esta|this)/i);
    const bodyHtml =
      startIdx >= 0 && endIdx > startIdx ? html.slice(startIdx, endIdx) : html;
 
    const body = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);
 
    return [`URL: ${url}`, `TÍTOL: ${title}`, `DATA: ${date || "no disponible"}`, `AUTORS: ${authors}`, `CONTINGUT: ${body}`].join("\n");
  } catch {
    return "";
  }
}
 
// Extreu totes les URLs de PUBLIC recursivament de qualsevol objecte
function extractPublicUrls(obj: any): string[] {
  const urls = new Set<string>();
  const re = /https?:\/\/esadepublic\.esade\.edu\/posts\/post\/[a-zA-Z0-9_-]+/g;
  function walk(node: any) {
    if (!node) return;
    if (typeof node === "string") {
      for (const m of node.matchAll(re)) urls.add(m[0]);
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (typeof node === "object") {
      Object.values(node).forEach(walk);
    }
  }
  walk(obj);
  return [...urls];
}
 
export async function POST(request: NextRequest) {
  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petició invàlida" }, { status: 400 });
  }
 
  const { messages, lang } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0)
    return NextResponse.json({ error: "Cal enviar missatges" }, { status: 400 });
  if (!lang || !["ca", "es", "en"].includes(lang))
    return NextResponse.json({ error: "Idioma no vàlid" }, { status: 400 });
 
  const welcomeContent = UI[lang].welcome;
  const apiMessages = messages
    .filter((m) => m.content !== welcomeContent)
    .map((m) => ({ role: m.role, content: m.content }));
  if (apiMessages.length === 0)
    return NextResponse.json({ error: "No hi ha missatges vàlids" }, { status: 400 });
 
  const systemPrompt = UI[lang].systemPrompt;
  const tools: any[] = [{ type: "web_search_20250305", name: "web_search" }];
  let currentMessages: any[] = apiMessages;
  let finalText = "";
 
  // Acumulem totes les URLs trobades durant el bucle
  const allUrls = new Set<string>();
  const fetchedUrls = new Set<string>();
 
  try {
    for (let i = 0; i < 12; i++) {
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
 
        // Extraiem URLs noves de tota la resposta
        const newUrls = extractPublicUrls(response.content).filter(
          (u) => !fetchedUrls.has(u)
        );
        newUrls.forEach((u) => allUrls.add(u));
 
        // Llegim tots els articles nous en paral·lel
        let articleContext = "";
        if (newUrls.length > 0) {
          const articles = await Promise.all(
            newUrls.slice(0, 8).map(async (u) => {
              fetchedUrls.add(u);
              return fetchArticle(u);
            })
          );
          const valid = articles.filter((a) => a.length > 0);
          if (valid.length > 0) {
            articleContext =
              "\n\n[ARTICLES LLEGITS — usa TÍTOL, DATA i AUTORS exactament com apareixen]\n\n" +
              valid.join("\n\n---\n\n");
          }
        }
 
        const toolResults = toolUseBlocks.map((block: any, idx: number) => ({
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: idx === 0 ? "Tool executed" + articleContext : "Tool executed",
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
 
