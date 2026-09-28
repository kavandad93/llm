# Kavandad LLM

Local LLM project with a browser control panel and an OpenAI-compatible chat endpoint.

## Run

```bash
npm install
npm start
```

Then open:

- http://127.0.0.1:3000/
- API: http://127.0.0.1:3000/v1/chat/completions
- Health: http://127.0.0.1:3000/health

## Architecture

Browser -> HTTP API -> local model engine

The browser does not execute model inference. It only sends JSON requests to the API.

## Important

The repository does not contain model weights yet. The current server includes a small fallback responder so the UI/API can be tested immediately. The next step is to connect a real local inference engine and its model weights behind `/v1/chat/completions`.
