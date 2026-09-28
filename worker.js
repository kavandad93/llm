const MODEL_NAME = "kavandad-llm";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS
    }
  });
}

function options() {
  return new Response(null, { status: 204, headers: CORS });
}

function replyFor(messages) {
  const last = [...messages].reverse().find(m => m && m.role === "user");
  const text = String(last?.content ?? "").trim();

  if (!text) return "پیامت خالیه 🙂";
  if (/^(سلام|hello|hi|hey)(\s|!|؟|\?|$)/i.test(text)) {
    return "سلام! 👋 من مدل Kavandad LLM هستم.";
  }
  if (text.includes("مدل") || /\bmodel\b/i.test(text)) {
    return "این API روی همان آدرس پنل Kavandad LLM اجرا می‌شود.";
  }
  return "API آنلاین است؛ موتور inference واقعی هنوز به این Worker متصل نشده است.";
}

async function handleApi(request, url) {
  if (request.method === "OPTIONS") return options();

  if (url.pathname === "/health") {
    if (request.method !== "GET") return json({ error: { message: "Method Not Allowed" } }, 405);
    return json({
      ok: true,
      model: MODEL_NAME,
      engine: "cloudflare-worker",
      status: "ready",
      api: "/v1/chat/completions"
    });
  }

  if (url.pathname === "/v1/models") {
    if (request.method !== "GET") return json({ error: { message: "Method Not Allowed" } }, 405);
    return json({
      object: "list",
      data: [{
        id: MODEL_NAME,
        object: "model",
        owned_by: "kavandad",
        ready: true
      }]
    });
  }

  if (url.pathname === "/v1/chat/completions") {
    if (request.method !== "POST") return json({ error: { message: "Method Not Allowed" } }, 405);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: { message: "Invalid JSON body" } }, 400);
    }

    const messages = body?.messages;
    if (!Array.isArray(messages)) {
      return json({ error: { message: "messages must be an array" } }, 400);
    }

    const maxTokens = Math.max(1, Number(body?.max_tokens ?? 256) || 256);
    const content = replyFor(messages);

    const promptTokens = messages.reduce(
      (n, m) => n + Math.ceil(String(m?.content ?? "").length / 4),
      0
    );
    const completionTokens = Math.min(
      Math.ceil(content.length / 4),
      maxTokens
    );

    return json({
      id: "chatcmpl-worker-" + crypto.randomUUID(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: String(body?.model || MODEL_NAME),
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content
        },
        finish_reason: "stop"
      }],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    });
  }

  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const apiResponse = await handleApi(request, url);
    if (apiResponse) return apiResponse;

    return env.ASSETS.fetch(request);
  }
};
