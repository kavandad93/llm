# 🤖 Kadad AI

Cloudflare Worker AI agent powered by OpenRouter.

## Features

- 💬 OpenRouter chat
- 🔎 Real-time web search
- 🌐 Web page fetching
- 🐙 Public GitHub repository/file inspection
- 🖼️ Image generation
- 📎 File upload endpoint
- ☁️ Cloudflare Workers deployment
- 🔐 API key stored as a Worker secret

## API

### POST /api/chat

```json
{
  "messages": [
    { "role": "user", "content": "آخرین اخبار هوش مصنوعی را جستجو کن" }
  ]
}
```

Optional `model` overrides `DEFAULT_MODEL`.

### POST /api/file

Use `multipart/form-data` with a field named `file`. Text files are extracted as UTF-8; binary files are returned as a data URL. Maximum upload size is 8 MB.

### GET /api/health

Returns Worker health and enabled features.

## OpenRouter API key

Create an OpenRouter API key and store it as a Cloudflare Worker secret:

```bash
npx wrangler secret put OPENROUTER_API_KEY
```

Never put the key in source code, `wrangler.json`, frontend code, or Git.

## Deploy

```bash
npm install
npx wrangler login
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler deploy
```

## Architecture

```
Browser
   ↓
Cloudflare Worker
   ↓
OpenRouter
   ├── LLM
   ├── Web Search
   ├── Web Fetch
   └── Image Generation

Cloudflare Worker
   └── GitHub public fetch
```

## Planned next layer

- R2 persistent file storage
- PDF/DOCX extraction
- Generated PDF/DOCX/CSV/ZIP files
- Video and music provider adapters
- Authentication and quotas
- Durable Objects memory
- Streaming responses
- Deeper GitHub repository crawling

OpenRouter's current server tools include web search, web fetch, and image generation. The model can invoke these tools during a request.
