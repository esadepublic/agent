# Agent PUBLIC · EsadeGov

Agent de gestió pública basat en els continguts del butlletí electrònic **PUBLIC** d'EsadeGov. Disponible en català, castellà i anglès.

## Arquitectura

```
Navegador
    │
    │  POST /api/chat  (només missatges, sense clau d'API)
    ▼
Next.js API Route  ◄── ANTHROPIC_API_KEY (variable d'entorn segura)
    │
    │  Bucle agèntic amb web_search
    ▼
API Anthropic  ──►  Cerca a esadepublic.esade.edu/posts
    │
    ▼
Resposta amb fonts i enllaços
```

La clau d'API **mai** arriba al navegador de l'usuari.

---

## Desplegament a Vercel (recomanat)

### Pas 1 — Crea el repositori

```bash
git init
git add .
git commit -m "first commit"
```

Puja el codi a GitHub, GitLab o Bitbucket.

### Pas 2 — Connecta amb Vercel

1. Ves a [vercel.com](https://vercel.com) i crea un compte gratuït
2. Fes clic a **Add New → Project**
3. Importa el repositori que acabes de crear
4. Vercel detectarà automàticament que és un projecte Next.js

### Pas 3 — Afegeix la clau d'API

A la pantalla de configuració del projecte a Vercel:

1. Ves a **Settings → Environment Variables**
2. Afegeix:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** la teva clau (comença per `sk-ant-...`)
   - **Environment:** Production, Preview, Development
3. Fes clic a **Save**

Obtén la teva clau a: https://console.anthropic.com/settings/keys

### Pas 4 — Desplega

Fes clic a **Deploy**. En 1-2 minuts l'agent estarà en línia a una URL del tipus:
```
https://public-agent-xxxx.vercel.app
```

Per afegir el teu domini propi (p. ex. `agent.esadepublic.esade.edu`):
1. Ves a **Settings → Domains**
2. Afegeix el domini
3. Configura el registre DNS que t'indica Vercel

---

## Desenvolupament local

### Requisits

- Node.js 18 o superior
- Una clau d'API d'Anthropic

### Instal·lació

```bash
# Installa les dependències
npm install

# Copia el fitxer d'entorn i afegeix la teva clau
cp .env.example .env.local
# Edita .env.local i substitueix el valor de ANTHROPIC_API_KEY

# Inicia el servidor de desenvolupament
npm run dev
```

Obre [http://localhost:3000](http://localhost:3000) al navegador.

### Estructura del projecte

```
public-agent/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # ← Backend segur (Node.js)
│   ├── globals.css           # Estètica del butlletí PUBLIC
│   ├── layout.tsx            # Metadades SEO
│   └── page.tsx              # Pàgina principal
├── components/
│   ├── Header.tsx            # Capçalera + selector CA/ES/EN
│   ├── MessageList.tsx       # Àrea de missatges
│   ├── SuggestedQuestions.tsx
│   └── ChatInput.tsx
├── lib/
│   ├── i18n.ts               # Traduccions i system prompts
│   ├── renderMarkdown.ts     # Convertidor Markdown → HTML
│   └── useChat.ts            # Hook de gestió del xat
├── .env.example              # Plantilla de variables d'entorn
├── .gitignore
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Personalització

### Afegir més preguntes suggerides

Edita `lib/i18n.ts` i modifica el camp `questions` de cada idioma.

### Canviar el model d'IA

A `app/api/chat/route.ts`, modifica:
```typescript
model: "claude-sonnet-4-20250514",
```

### Canviar els colors

A `app/globals.css`, modifica les variables CSS:
```css
:root {
  --blue:      #003865;  /* blau corporatiu Esade */
  --blue-hover:#002a4d;
}
```

---

## Costos estimats

- **Vercel:** gratuït per a projectes personals i institucionals petits
- **Anthropic API:** ~0,003 $ per pregunta (Claude Sonnet). Per a 1.000 consultes/mes ≈ 3 $

---

## Llicència

© EsadeGov · Esade Business School
