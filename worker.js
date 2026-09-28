const MODEL_NAME = "kavandad-llm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
  });
}

function replyFor(messages) {
  const last = [...messages].reverse().find(m => m && m.role === "user");
  const text = String(last?.content || "").trim();

  if (!text) return "پیامت خالیه 🙂";
  if (/^(سلام|hello|hi|hey)\b/i.test(text)) {
    return "سلام! 👋 من مدل Kavandad LLM هستم.";
  }
  if (text.includes("مدل") || /model/i.test(text)) {
    return "این API مستقیماً روی همین Worker در دسترس است.";
  }
  return "API آنلاین است؛ موتور inference واقعی هنوز به این Worker متصل نشده است.";
}

async function api(request, url) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  if (url.pathname === "/health" && request.method === "GET") {
    return json({ ok: true, model: MODEL_NAME, engine: "cloudflare-worker", status: "ready", api: "/v1/chat/completions" });
  }

  if (url.pathname === "/v1/models" && request.method === "GET") {
    return json({
      object: "list",
      data: [{ id: MODEL_NAME, object: "model", owned_by: "kavandad", ready: true }]
    });
  }

  if (url.pathname === "/v1/chat/completions" && request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: { message: "Invalid JSON body" } }, 400);
    }

    const messages = body?.messages ?? [];
    if (!Array.isArray(messages)) {
      return json({ error: { message: "messages must be an array" } }, 400);
    }

    const maxTokens = Number(body?.max_tokens ?? 256);
    const content = replyFor(messages);

    return json({
      id: "chatcmpl-worker-" + Date.now(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body?.model || MODEL_NAME,
      choices: [{
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop"
      }],
      usage: {
        prompt_tokens: messages.reduce((n, m) => n + Math.ceil(String(m?.content || "").length / 4), 0),
        completion_tokens: Math.min(Math.ceil(content.length / 4), maxTokens),
        total_tokens: 0
      }
    });
  }

  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const response = await api(request, url);
    if (response) return response;

    return env.ASSETS.fetch(request);
  }
};
