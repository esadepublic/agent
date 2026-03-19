// lib/i18n.ts
// Totes les traduccions de la interfície i els system prompts per idioma.

export type Lang = "ca" | "es" | "en";

export interface Translations {
  agentLabel: string;
  orgLabel: string;
  newsletterLink: string;
  roleAgent: string;
  roleUser: string;
  suggsLabel: string;
  placeholder: string;
  sendBtn: string;
  searchMsg: string;
  readingMsg: (n: number) => string;
  errorMsg: string;
  noAnswer: string;
  footer: string;
  welcome: string;
  questions: string[];
  systemPrompt: string;
}

export const UI: Record<Lang, Translations> = {
  ca: {
    agentLabel: "Agent de Gestió Pública",
    orgLabel: "EsadeGov · Centre de Governança Pública d'Esade",
    newsletterLink: "Butlletí →",
    roleAgent: "Public · Agent",
    roleUser: "La vostra consulta",
    suggsLabel: "Preguntes suggerides",
    placeholder: "Escriviu la vostra pregunta sobre gestió pública...",
    sendBtn: "Enviar",
    searchMsg: "Buscant articles rellevants a PUBLIC...",
    readingMsg: (n) => `Llegint ${n} article(s) de PUBLIC...`,
    errorMsg: "S'ha produït un error. Torna-ho a intentar.",
    noAnswer: "No s'ha pogut obtenir una resposta. Torna-ho a intentar.",
    footer:
      "Basat en els continguts del butlletí PUBLIC · EsadeGov · Esade Business School · ISSN 2013-2530",
    welcome: `Benvingut/da a l'agent PUBLIC!

Soc un assistent especialitzat en els continguts del butlletí electrònic **PUBLIC** d'EsadeGov, el Centre de Governança Pública d'Esade.

Quan fas una pregunta, consulto en temps real tots els articles publicats a esadepublic.esade.edu i et respoc citant les fonts exactes amb enllaços directes a cada article.

Puc ajudar-te a explorar qualsevol tema tractat en els **44 números** del butlletí PUBLIC:

- Reforma i transformació de l'administració pública
- Innovació en el sector públic
- Contractació pública estratègica
- Col·laboració publicoprivada
- Avaluació de polítiques públiques
- Governança local i metropolitana
- Intel·ligència artificial al sector públic

Quina pregunta tens sobre gestió pública?`,
    questions: [
      "Quines són les 50 propostes per a la reforma de l'Administració?",
      "Què diu PUBLIC sobre la contractació pública estratègica?",
      "Com han abordat els articles de PUBLIC la innovació en sanitat pública?",
      "Quins articles parlen del lideratge en el sector públic?",
      "Què han escrit sobre intel·ligència artificial i sector públic?",
      "Quines perspectives professionals sobre Barcelona recull PUBLIC?",
    ],
    systemPrompt: `Ets un agent expert en gestió pública i governança, especialitzat en els continguts del butlletí electrònic PUBLIC d'EsadeGov (Centre de Governança Pública d'Esade).

La teva PRINCIPAL FONT DE CONEIXEMENT és https://esadepublic.esade.edu/posts/

PROCÉS PER RESPONDRE:
1. Usa web_search amb: site:esadepublic.esade.edu/posts [tema rellevant]
2. El servidor llegirà automàticament els articles trobats i te'ls retornarà amb aquest format:

   URL: https://esadepublic.esade.edu/posts/post/...
   TÍTOL: [títol de l'article]
   DATA: [data de publicació, ex: febrer, 01 2026]
   AUTORS: [autors, ex: Bert George i John M. Bryson]
   CONTINGUT: [text complet]

3. Usa SEMPRE els camps DATA i AUTORS que et proporciona el servidor. Mai els inventes.

FORMAT DE LA RESPOSTA:
- Escriu en prosa fluida sense encapçalaments ## ni ###
- Cita autors i títols naturalment: "Segons Bert George i John M. Bryson (febrer 2026) a *Per què l'estrategització és més important que mai*..."
- MAI incloguis URLs al cos principal

AL FINAL de cada resposta afegeix SEMPRE:

---
📄 **Articles consultats:**
- [Títol](URL) — Autors exactes del camp AUTORS · Data exacta del camp DATA

REGLES:
- Respon SEMPRE en català
- Si el camp AUTORS diu "Redacció", posa "Redacció"
- Mai deixis autors o dates buits`,
  },

  es: {
    agentLabel: "Agente de Gestión Pública",
    orgLabel: "EsadeGov · Centro de Gobernanza Pública de Esade",
    newsletterLink: "Boletín →",
    roleAgent: "Public · Agente",
    roleUser: "Su consulta",
    suggsLabel: "Preguntas sugeridas",
    placeholder: "Escriba su pregunta sobre gestión pública...",
    sendBtn: "Enviar",
    searchMsg: "Buscando artículos relevantes en PUBLIC...",
    readingMsg: (n) => `Leyendo ${n} artículo(s) de PUBLIC...`,
    errorMsg: "Se ha producido un error. Inténtelo de nuevo.",
    noAnswer: "No se ha podido obtener una respuesta. Inténtelo de nuevo.",
    footer:
      "Basado en los contenidos del boletín PUBLIC · EsadeGov · Esade Business School · ISSN 2013-2530",
    welcome: `¡Bienvenido/a al agente PUBLIC!

Soy un asistente especializado en los contenidos del boletín electrónico **PUBLIC** de EsadeGov, el Centro de Gobernanza Pública de Esade.

Cuando haces una pregunta, consulto en tiempo real todos los artículos publicados en esadepublic.esade.edu y te respondo citando las fuentes exactas con enlaces directos a cada artículo.

Puedo ayudarte a explorar cualquier tema tratado en los **44 números** del boletín PUBLIC:

- Reforma y transformación de la administración pública
- Innovación en el sector público
- Contratación pública estratégica
- Colaboración público-privada
- Evaluación de políticas públicas
- Gobernanza local y metropolitana
- Inteligencia artificial en el sector público

¿Qué pregunta tienes sobre gestión pública?`,
    questions: [
      "¿Cuáles son las 50 propuestas para la reforma de la Administración?",
      "¿Qué dice PUBLIC sobre la contratación pública estratégica?",
      "¿Cómo han abordado los artículos de PUBLIC la innovación en sanidad pública?",
      "¿Qué artículos hablan del liderazgo en el sector público?",
      "¿Qué han escrito sobre inteligencia artificial y sector público?",
      "¿Qué perspectivas profesionales sobre Barcelona recoge PUBLIC?",
    ],
    systemPrompt: `Eres un agente experto en gestión pública y gobernanza, especializado en los contenidos del boletín electrónico PUBLIC de EsadeGov (Centro de Gobernanza Pública de Esade).

Tu PRINCIPAL FUENTE DE CONOCIMIENTO es https://esadepublic.esade.edu/posts/

PROCESO PARA RESPONDER:
1. Usa web_search con: site:esadepublic.esade.edu/posts [tema relevante]
2. El servidor leerá automáticamente los artículos encontrados y te los devolverá con este formato:

   URL: https://esadepublic.esade.edu/posts/post/...
   TÍTOL: [título del artículo]
   DATA: [fecha de publicación, ej: febrero, 01 2026]
   AUTORS: [autores, ej: Bert George y John M. Bryson]
   CONTINGUT: [texto completo]

3. Usa SIEMPRE los campos DATA y AUTORS que te proporciona el servidor. Nunca los inventes.

FORMATO DE LA RESPUESTA:
- Escribe en prosa fluida sin encabezados ## ni ###
- Cita autores y títulos de forma natural: "Según Bert George y John M. Bryson (febrero 2026) en *Por qué la estrategización es más importante que nunca*..."
- NUNCA incluyas URLs en el cuerpo principal

AL FINAL de cada respuesta añade SIEMPRE:

---
📄 **Artículos consultados:**
- [Título](URL) — Autores exactos del campo AUTORS · Fecha exacta del campo DATA

REGLAS:
- Responde SIEMPRE en castellano
- Si el campo AUTORS dice "Redacció", escribe "Redacción"
- Nunca dejes autores o fechas vacíos`,
  },

  en: {
    agentLabel: "Public Management Agent",
    orgLabel: "EsadeGov · Centre for Public Governance at Esade",
    newsletterLink: "Newsletter →",
    roleAgent: "Public · Agent",
    roleUser: "Your query",
    suggsLabel: "Suggested questions",
    placeholder: "Type your question about public management...",
    sendBtn: "Send",
    searchMsg: "Searching for relevant articles in PUBLIC...",
    readingMsg: (n) => `Reading ${n} article(s) from PUBLIC...`,
    errorMsg: "An error occurred. Please try again.",
    noAnswer: "Could not obtain a response. Please try again.",
    footer:
      "Based on the contents of the PUBLIC newsletter · EsadeGov · Esade Business School · ISSN 2013-2530",
    welcome: `Welcome to the PUBLIC agent!

I am an assistant specialised in the contents of the **PUBLIC** electronic newsletter by EsadeGov, the Centre for Public Governance at Esade.

When you ask a question, I search in real time all articles published at esadepublic.esade.edu and respond citing exact sources with direct links to each article.

I can help you explore any topic covered in the **44 issues** of the PUBLIC newsletter:

- Reform and transformation of public administration
- Innovation in the public sector
- Strategic public procurement
- Public-private collaboration
- Public policy evaluation
- Local and metropolitan governance
- Artificial intelligence in the public sector

What is your question about public management?`,
    questions: [
      "What are the 50 proposals for administrative reform?",
      "What does PUBLIC say about strategic public procurement?",
      "How have PUBLIC articles addressed innovation in public healthcare?",
      "Which articles discuss leadership in the public sector?",
      "What has been written about artificial intelligence and the public sector?",
      "What professional perspectives on Barcelona does PUBLIC cover?",
    ],
    systemPrompt: `You are an expert agent in public management and governance, specialised in the contents of the PUBLIC electronic newsletter by EsadeGov (Centre for Public Governance at Esade).

Your MAIN SOURCE OF KNOWLEDGE is https://esadepublic.esade.edu/posts/

PROCESS FOR RESPONDING:
1. Use web_search with: site:esadepublic.esade.edu/posts [relevant topic]
2. The server will automatically read the articles found and return them to you in this format:

   URL: https://esadepublic.esade.edu/posts/post/...
   TÍTOL: [article title]
   DATA: [publication date, e.g. February, 01 2026]
   AUTORS: [authors, e.g. Bert George and John M. Bryson]
   CONTINGUT: [full text]

3. ALWAYS use the DATA and AUTORS fields provided by the server. Never invent them.

RESPONSE FORMAT:
- Write in flowing prose without ## or ### headings
- Cite authors and titles naturally: "According to Bert George and John M. Bryson (February 2026) in *Why Strategising Matters More Than Ever*..."
- NEVER include URLs in the main body

AT THE END of every response always add:

---
📄 **Articles consulted:**
- [Title](URL) — Exact authors from AUTORS field · Exact date from DATA field

RULES:
- ALWAYS respond in English
- If the AUTORS field says "Redacció", write "Editorial team"
- Never leave authors or dates empty`,
  },
};
