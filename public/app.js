const $=s=>document.querySelector(s);
const state={messages:[],settings:{apiUrl:localStorage.apiUrl||"http://127.0.0.1:3000",model:localStorage.model||"kavandad-llm",temperature:Number(localStorage.temperature??0.7),maxTokens:Number(localStorage.maxTokens??256),systemPrompt:localStorage.systemPrompt||"You are a helpful local AI assistant."}};

$("#apiUrl").value=state.settings.apiUrl;$("#model").value=state.settings.model;$("#temperature").value=state.settings.temperature;$("#tempOut").value=state.settings.temperature.toFixed(2);$("#maxTokens").value=state.settings.maxTokens;$("#systemPrompt").value=state.settings.systemPrompt;

document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));$("#"+b.dataset.tab).classList.add("active");$("#title").textContent={chat:"چت با مدل",settings:"تنظیمات مدل",api:"اتصال API"}[b.dataset.tab]});

$("#temperature").oninput=e=>$("#tempOut").value=Number(e.target.value).toFixed(2);

$("#saveSettings").onclick=()=>{state.settings={apiUrl:$("#apiUrl").value.replace(/\/$/,""),model:$("#model").value.trim()||"kavandad-llm",temperature:Number($("#temperature").value),maxTokens:Number($("#maxTokens").value)||256,systemPrompt:$("#systemPrompt").value};Object.assign(localStorage,{apiUrl:state.settings.apiUrl,model:state.settings.model,temperature:state.settings.temperature,maxTokens:state.settings.maxTokens,systemPrompt:state.settings.systemPrompt});$("#modelBadge").textContent=state.settings.model;alert("تنظیمات ذخیره شد ✓")};
$("#modelBadge").textContent=state.settings.model;

function add(role,text){$(".welcome")?.remove();const d=document.createElement("div");d.className="bubble "+role;d.textContent=text;$("#messages").appendChild(d);$("#messages").scrollTop=$("#messages").scrollHeight}
async function request(path,options={}){const r=await fetch(state.settings.apiUrl+path,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.error?.message||"API error");return data}

$("#chatForm").onsubmit=async e=>{e.preventDefault();const input=$("#input"),text=input.value.trim();if(!text)return;input.value="";add("user",text);state.messages.push({role:"user",content:text});try{const data=await request("/v1/chat/completions",{method:"POST",body:JSON.stringify({model:state.settings.model,messages:[{role:"system",content:state.settings.systemPrompt},...state.messages],temperature:state.settings.temperature,max_tokens:state.settings.maxTokens})});const answer=data.choices?.[0]?.message?.content||"پاسخی دریافت نشد.";state.messages.push({role:"assistant",content:answer});add("assistant",answer)}catch(err){add("assistant","❌ خطا در اتصال به API: "+err.message)}};

$("#clearBtn").onclick=()=>{state.messages=[];$("#messages").innerHTML='<div class="welcome"><div class="big">🤖</div><h2>چت پاک شد</h2><p>پیام جدیدت را بفرست.</p></div>'};

async function health(){try{const d=await request("/health");$("#dot").style.background="#7ee787";$("#statusText").textContent="API متصل • "+d.model}catch(e){$("#dot").style.background="#f85149";$("#statusText").textContent="API قطع است"}}
$("#testBtn").onclick=async()=>{try{$("#apiResult").textContent=JSON.stringify(await request("/health"),null,2)}catch(e){$("#apiResult").textContent="ERROR: "+e.message}};
$("#modelsBtn").onclick=async()=>{try{$("#apiResult").textContent=JSON.stringify(await request("/v1/models"),null,2)}catch(e){$("#apiResult").textContent="ERROR: "+e.message}};
health();
