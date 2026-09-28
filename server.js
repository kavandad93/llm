const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const MODEL_NAME = process.env.MODEL_NAME || "kavandad-llm";

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

function replyFor(messages) {
  const last = [...messages].reverse().find(m => m && m.role === "user");
  const text = String(last?.content || "").trim();

  if (!text) return "پیامت خالیه 🙂";
  if (/^(سلام|hello|hi|hey)\b/i.test(text)) {
    return "سلام! 👋 من مدل محلی Kavandad LLM هستم.";
  }
  if (text.includes("مدل") || /model/i.test(text)) {
    return "این API روی همین سیستم اجرا می‌شود و رابط وب فقط از API استفاده می‌کند.";
  }
  return "مدل محلی هنوز وزن‌های واقعی را بارگذاری نکرده است. API و پنل آماده‌اند؛ فایل وزن‌های مدل را می‌توان بعداً به موتور inference وصل کرد.";
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    model: MODEL_NAME,
    engine: "local",
    status: "ready",
    api: "/v1/chat/completions"
  });
});

app.get("/v1/models", (_req, res) => {
  res.json({
    object: "list",
    data: [{
      id: MODEL_NAME,
      object: "model",
      owned_by: "kavandad",
      ready: true
    }]
  });
});

app.post("/v1/chat/completions", (req, res) => {
  const {
    messages = [],
    temperature = 0.7,
    max_tokens = 256,
    model = MODEL_NAME
  } = req.body || {};

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: { message: "messages must be an array" } });
  }

  const content = replyFor(messages);

  res.json({
    id: "chatcmpl-local-" + Date.now(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: { role: "assistant", content },
      finish_reason: "stop"
    }],
    usage: {
      prompt_tokens: messages.reduce((n, m) => n + Math.ceil(String(m.content || "").length / 4), 0),
      completion_tokens: Math.min(Math.ceil(content.length / 4), Number(max_tokens) || 256),
      total_tokens: 0
    },
    settings: {
      temperature: Number(temperature),
      max_tokens: Number(max_tokens)
    }
  });
});

app.get("*splat", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`Kavandad LLM API: http://${HOST}:${PORT}`);
  console.log(`Web panel: http://${HOST}:${PORT}/`);
});
