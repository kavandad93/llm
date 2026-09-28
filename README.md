# Kavandad LLM

Kavandad LLM is a browser-based AI control panel with an HTTP API designed to run locally with Node.js or remotely as a Cloudflare Worker.

## ✨ Features

- 💬 Persian RTL browser chat panel
- ⚙️ Model name, temperature, max-token and system-prompt settings
- 🔌 OpenAI-style chat endpoint
- ❤️ Health endpoint
- 📦 Model listing endpoint
- ☁️ Cloudflare Workers + Static Assets support
- 🌐 Same URL for the web panel and API
- 💾 API URL and model settings saved in browser storage

## 🌐 Cloudflare deployment

The project is configured so one Cloudflare Worker can serve both the website and the API.

Recommended production URL:

`https://llm.kavandadkhah.workers.dev/`

Endpoints:

- `GET /` — web control panel
- `GET /health` — API health/status
- `GET /v1/models` — available model list
- `POST /v1/chat/completions` — chat completion API

The Worker uses Cloudflare Static Assets for the files in `public/` and an `ASSETS` binding to serve those files from `worker.js`. The Wrangler configuration enables Worker-first routing so API requests are handled by the Worker before static assets. This follows Cloudflare's current Static Assets/Workers configuration model. citeturn0search0turn0search1

### Deploy with Wrangler

Install dependencies:

```bash
npm install
```

Deploy:

```bash
npx wrangler deploy
```

Cloudflare deploys the Worker code and configured static assets together. citeturn0search3

## 💻 Local Node.js mode

For local development with the Node/Express server:

```bash
npm install
npm start
```

Then open:

- `http://127.0.0.1:3000/`
- `http://127.0.0.1:3000/health`
- `http://127.0.0.1:3000/v1/models`
- `http://127.0.0.1:3000/v1/chat/completions`

## 🏗️ Architecture

### Cloudflare

```
Browser
   │
   ▼
llm.kavandadkhah.workers.dev
   │
   ├── /health
   ├── /v1/models
   ├── /v1/chat/completions
   │
   └── / + static assets
        │
        └── public/
```

### Local

```
Browser → Node.js/Express → fallback responder
```

The browser does not perform model inference itself. It sends JSON requests to the API.

## 📁 Project structure

```
.
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── worker.js
├── wrangler.json
├── server.js
├── package.json
├── .gitignore
└── README.md
```

## 🤖 Current model status

The repository currently does **not** contain real model weights.

The API has a lightweight fallback responder so the panel and endpoints can be tested without a model file. It is **not** a real LLM inference engine.

The intended endpoint for a future inference backend is:

`POST /v1/chat/completions`

The frontend is already structured around this API, so a real inference engine can be connected behind the same endpoint later.

## 🔧 Configuration

### Browser settings

The panel stores these settings locally in the browser:

- API Base URL
- Model name
- Temperature
- Max tokens
- System prompt

If an old local API address such as `127.0.0.1:3000` is stored, the frontend automatically falls back to the current page origin when it detects that localhost address.

### Cloudflare Worker

Cloudflare configuration is stored in `wrangler.json`.

Important fields:

- `main: "./worker.js"`
- `assets.directory: "./public"`
- `assets.binding: "ASSETS"`
- `assets.run_worker_first: true`
- `assets.not_found_handling: "single-page-application"`

Cloudflare documents `assets.binding` as the binding used by Worker code to fetch static assets through `env.ASSETS`. citeturn0search1

## 🧪 API examples

### Health

```bash
curl https://llm.kavandadkhah.workers.dev/health
```

### Models

```bash
curl https://llm.kavandadkhah.workers.dev/v1/models
```

### Chat

```bash
curl -X POST https://llm.kavandadkhah.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kavandad-llm",
    "messages": [
      {
        "role": "user",
        "content": "سلام"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 256
  }'
```

## 📌 Notes

- The Cloudflare Worker and static assets must be deployed after repository changes for the production URL to use the new version.
- The web panel and API intentionally share one origin, which avoids the localhost/remote-browser problem.
- The current fallback responder is only for connectivity and UI testing; it should not be described as a trained LLM.
