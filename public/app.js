const $ = s => document.querySelector(s);

const savedApiUrl = localStorage.apiUrl || "";
const defaultApiUrl =
  !savedApiUrl ||
  /^(https?:\\/\\/)?(127\\.0\\.0\\.1|localhost)(:\\d+)?$/i.test(savedApiUrl)
    ? window.location.origin
    : savedApiUrl.replace(/\\/$/, "");

const state = {
  messages: [],
  settings: {
    apiUrl: defaultApiUrl,
    model: localStorage.model || "kavandad-llm",
    temperature: Number(localStorage.temperature ?? 0.7),
    maxTokens: Number(localStorage.maxTokens ?? 256),
    systemPrompt: localStorage.systemPrompt || "You are a helpful local AI assistant."
  }
};

$("#apiUrl").value = state.settings.apiUrl;
$("#model").value = state.settings.model;
$("#temperature").value = state.settings.temperature;
$("#tempOut").value = state.settings.temperature.toFixed(2);
$("#maxTokens").value = state.settings.maxTokens;
$("#systemPrompt").value = state.settings.systemPrompt;
$("#modelBadge").textContent = state.settings.model;

document.querySelectorAll(".nav").forEach(button => {
  button.onclick = () => {
    document.querySelectorAll(".nav").forEach(x => x.classList.remove("active"));
    button.classList.add("active");

    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    $("#" + button.dataset.tab).classList.add("active");

    $("#title").textContent = {
      chat: "چت با مدل",
      settings: "تنظیمات مدل",
      api: "اتصال API"
    }[button.dataset.tab];
  };
});

$("#temperature").oninput = event => {
  $("#tempOut").value = Number(event.target.value).toFixed(2);
};

$("#saveSettings").onclick = () => {
  const apiUrl = $("#apiUrl").value.trim().replace(/\\/$/, "") || window.location.origin;

  state.settings = {
    apiUrl,
    model: $("#model").value.trim() || "kavandad-llm",
    temperature: Number($("#temperature").value),
    maxTokens: Number($("#maxTokens").value) || 256,
    systemPrompt: $("#systemPrompt").value
  };

  Object.assign(localStorage, {
    apiUrl: state.settings.apiUrl,
    model: state.settings.model,
    temperature: state.settings.temperature,
    maxTokens: state.settings.maxTokens,
    systemPrompt: state.settings.systemPrompt
  });

  $("#modelBadge").textContent = state.settings.model;
  $("#apiUrl").value = state.settings.apiUrl;
  alert("تنظیمات ذخیره شد ✓");
};

function add(role, text) {
  $(".welcome")?.remove();

  const element = document.createElement("div");
  element.className = "bubble " + role;
  element.textContent = text;

  $("#messages").appendChild(element);
  $("#messages").scrollTop = $("#messages").scrollHeight;
}

async function request(path, options = {}) {
  const base = (state.settings.apiUrl || window.location.origin).replace(/\\/$/, "");
  const response = await fetch(base + path, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : {};

  if (!response.ok) {
    throw new Error(data?.error?.message || `HTTP ${response.status}`);
  }

  return data;
}

$("#chatForm").onsubmit = async event => {
  event.preventDefault();

  const input = $("#input");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  add("user", text);
  state.messages.push({ role: "user", content: text });

  try {
    const data = await request("/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model: state.settings.model,
        messages: [
          { role: "system", content: state.settings.systemPrompt },
          ...state.messages
        ],
        temperature: state.settings.temperature,
        max_tokens: state.settings.maxTokens
      })
    });

    const answer =
      data?.choices?.[0]?.message?.content ||
      "پاسخی دریافت نشد.";

    state.messages.push({ role: "assistant", content: answer });
    add("assistant", answer);
  } catch (error) {
    add("assistant", "❌ خطا در اتصال به API: " + error.message);
  }
};

$("#clearBtn").onclick = () => {
  state.messages = [];
  $("#messages").innerHTML =
    '<div class="welcome"><div class="big">🤖</div><h2>چت پاک شد</h2><p>پیام جدیدت را بفرست.</p></div>';
};

async function health() {
  try {
    const data = await request("/health");
    $("#dot").style.background = "#7ee787";
    $("#statusText").textContent = "API متصل • " + data.model;
  } catch (error) {
    $("#dot").style.background = "#f85149";
    $("#statusText").textContent = "API قطع است";
  }
}

$("#testBtn").onclick = async () => {
  try {
    $("#apiResult").textContent =
      JSON.stringify(await request("/health"), null, 2);
  } catch (error) {
    $("#apiResult").textContent = "ERROR: " + error.message;
  }
};

$("#modelsBtn").onclick = async () => {
  try {
    $("#apiResult").textContent =
      JSON.stringify(await request("/v1/models"), null, 2);
  } catch (error) {
    $("#apiResult").textContent = "ERROR: " + error.message;
  }
};

health();
