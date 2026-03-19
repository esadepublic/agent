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
 
// Extreu data i autors del bloc HTML entre els <hr> que conté la data
function extractMeta(html: string): { date: string; authors: string } {
  const mesos =
    "gener|febrer|març|abril|maig|juny|juliol|agost|setembre|octubre|novembre|desembre|" +
    "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|" +
    "january|february|march|april|may|june|july|august|september|october|november|december";
  const dateRe = new RegExp(
    `(?:${mesos})[^<,]*,?\\s*\\d{1,2}\\s+\\d{4}|\\d{2}-\\d{2}-\\d{4}`,
    "i"
  );
 
  // Partim per <hr> i busquem el segment amb la data
  const segments = html.split(/<hr\s*\/?>/i);
  for (const seg of segments) {
    const dm = seg.match(dateRe);
    if (!dm) continue;
 
    const date = dm[0].trim();
 
    // Netegem el segment de tags HTML
    const clean = seg
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
 
    // Agafem el text que ve després de la data
    const afterDate = clean.slice(clean.indexOf(date) + date.length).trim();
 
    // Eliminem el comptador de comentaris i tot el que ve després
    const beforeComments = afterDate
      .replace(/\d+\s*(?:Comentaris|Comentarios|Comments)[\s\S]*/i, "")
      .trim();
 
    // Primera línia significativa = autors
    const authors = beforeComments
      .split(/\s{3,}/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 2)
      .filter((s: string) =>
        !["subscripcions", "identificar", "consell", "esade.edu", "http", "partners"]
          .some((w) => s.toLowerCase().includes(w))
      )[0] || "Redacció";
 
    return { date, authors };
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
 
    // Títol
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : "";
    const title = rawTitle.includes("::")
      ? rawTitle.split("::").slice(1).join("::").trim()
      : rawTitle.trim();
 
    // Data i autors
    const { date, authors } = extractMeta(html);
 
    // Contingut principal
    const startIdx = html.indexOf("<h3");
    const endIdx = html.search(/Compartir (?:aquesta|esta|this)/i);
    const bodyHtml =
      startIdx >= 0 && endIdx > startIdx
        ? html.slice(startIdx, endIdx)
        : html.slice(0, 20000);
 
    const body = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
 
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
 
// Extreu totes les URLs de PUBLIC d'un objecte (recursivament)
function extractPublicUrls(obj: any): string[] {
  const urls = new Set<string>();
  const urlRe = /https?:\/\/esadepublic\.esade\.edu\/posts\/post\/[a-zA-Z0-9_-]+/g;
 
  function walk(node: any) {
    if (!node) return;
    if (typeof node === "string") {
      for (const m of node.matchAll(urlRe)) urls.add(m[0]);
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (typeof node === "object") {
      Object.values(node).forEach(walk);
    }
  }
  walk(obj);
  return [...urls].slice(0, 5);
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
 
  // Acumulem totes les URLs trobades durant tot el bucle
  const allFoundUrls = new Set<string>();
 
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
 
      if (response.stop_reason === "end_turn") {
        // Última oportunitat: llegim els articles que hem acumulat durant el bucle
        // i els injectem com a missatge addicional d'usuari si l'agent no els ha llegit
        break;
      }
 
      if (response.stop_reason === "tool_use") {
        const toolUseBlocks = (response.content as any[]).filter(
          (b: any) => b.type === "tool_use"
        );
 
        // Cerquem URLs recursivament a tota la resposta
        const newUrls = extractPublicUrls(response.content);
        newUrls.forEach((u) => allFoundUrls.add(u));
 
        // Llegim els articles nous (que no hem llegit encara)
        const urlsToFetch = newUrls.filter((u) => !allFoundUrls.has(u + "_done"));
        let articleContext = "";
 
        if (urlsToFetch.length > 0) {
          const articles = await Promise.all(urlsToFetch.map(fetchArticle));
          urlsToFetch.forEach((u) => allFoundUrls.add(u + "_done"));
          const valid = articles.filter((a) => a.length > 0);
          if (valid.length > 0) {
            articleContext =
              "\n\n[ARTICLES LLEGITS PEL SERVIDOR — usa TÍTOL, DATA i AUTORS exactament]\n\n" +
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
 
    // Si l'agent ha generat text però hi ha URLs que no hem pogut llegir,
    // injectem els articles com a context per una darrera iteració
    if (allFoundUrls.size > 0 && finalText) {
      const unread = [...allFoundUrls]
        .filter((u) => !u.endsWith("_done"))
        .slice(0, 3);
 
      if (unread.length > 0) {
        const articles = await Promise.all(unread.map(fetchArticle));
        const valid = articles.filter((a) => a.length > 0);
 
        if (valid.length > 0) {
          // Demanem a l'agent que millori la resposta amb les metadades correctes
          const improvePrompt =
            `Millora la secció "📄 Articles consultats:" de la teva resposta anterior ` +
            `substituint qualsevol "Redacció" i "Sense data" per les dades correctes ` +
            `d'aquests articles:\n\n` +
            valid.join("\n\n---\n\n") +
            `\n\nTorna la resposta completa millorada.`;
 
          const improveResp: any = await (client.messages.create as any)({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            system: systemPrompt,
            tools: [],
            messages: [
              ...currentMessages,
              { role: "assistant", content: finalText },
              { role: "user", content: improvePrompt },
            ],
          });
 
          const improved = improveResp.content
            .filter((b: any) => b.type === "text")
            .map((b: any) => b.text)
            .join("\n");
          if (improved) finalText = improved;
        }
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
 
