// lib/renderMarkdown.ts
// Converteix el Markdown de les respostes de l'agent en HTML segur.
// Suporta: links [text](url), **negreta**, *cursiva*, llistes - item, separadors ---

export function renderMarkdown(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let inList = false;

  const applyInline = (line: string): string =>
    line
      // Links [text](url) — sempre primer per no interferir amb ** i *
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        (_, t, url) =>
          `<a href="${encodeURI(url)}" target="_blank" rel="noopener noreferrer" class="art-link">${t}</a>`
      )
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");

  for (const raw of lines) {
    // Separador horitzontal ---
    if (/^---+$/.test(raw.trim())) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push('<hr class="div" />');
      continue;
    }
    // Ítem de llista - text
    if (/^- /.test(raw)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${applyInline(raw.replace(/^- /, ""))}</li>`);
      continue;
    }
    // Tanca llista si cal
    if (inList) { out.push("</ul>"); inList = false; }
    // Línia buida
    if (raw.trim() === "") { out.push('<div class="gap"></div>'); continue; }
    // Paràgraf normal
    out.push(`<p>${applyInline(raw)}</p>`);
  }

  if (inList) out.push("</ul>");
  return out.join("");
}
