const OPENROUTER_URL="https://openrouter.ai/api/v1/chat/completions";

const SYSTEM=`You are Kadad AI, a practical multilingual AI agent.
Use web search/fetch when current or page-specific information is needed.
Use GitHub fetch for public repositories. Use image generation when requested.
Never claim a tool result you did not receive.`;

const tools=[
 {type:"openrouter:web_search",parameters:{max_results:6,max_total_results:12}},
 {type:"openrouter:web_fetch"},
 {type:"openrouter:image_generation"},
 {type:"function",function:{name:"github_fetch",description:"Read a public GitHub repository, file, directory, issue, pull request, or API resource.",parameters:{type:"object",properties:{url:{type:"string"}},required:["url"],additionalProperties:false}}}
];

const CORS={"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"Content-Type, Authorization"};

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json;charset=utf-8",...CORS}})}

async function githubFetch(url){
 const u=new URL(url);
 if(!["github.com","api.github.com","raw.githubusercontent.com"].includes(u.hostname))throw new Error("Only public GitHub URLs are allowed.");
 const r=await fetch(url,{headers:{"Accept":"application/vnd.github+json","User-Agent":"Kadad-AI-Worker"}});
 return {status:r.status,url,content:(await r.text()).slice(0,120000)};
}

async function or(env,payload){
 if(!env.OPENROUTER_API_KEY)throw new Error("OPENROUTER_API_KEY is not configured.");
 const r=await fetch(OPENROUTER_URL,{method:"POST",headers:{"Authorization":`Bearer ${env.OPENROUTER_API_KEY}`,"Content-Type":"application/json","HTTP-Referer":env.SITE_URL||"https://llm.kavandadkhah.workers.dev","X-OpenRouter-Title":"Kadad AI"},body:JSON.stringify(payload)});
 const d=await r.json();
 if(!r.ok)throw new Error(d?.error?.message||`OpenRouter HTTP ${r.status}`);
 return d;
}

async function agent(env,messages,model){
 let history=[{role:"system",content:SYSTEM},...messages.slice(-30)];
 for(let i=0;i<6;i++){
  const d=await or(env,{model:model||env.DEFAULT_MODEL||"openrouter/free",messages:history,tools,tool_choice:"auto",temperature:.5});
  const m=d?.choices?.[0]?.message;if(!m)throw new Error("The model returned no message.");
  if(!m.tool_calls?.length)return {message:m,usage:d.usage||null};
  history.push(m);
  for(const call of m.tool_calls){
   if(call.function?.name!=="github_fetch")continue;
   let args={};try{args=JSON.parse(call.function.arguments||"{}")}catch{}
   let result;try{result=await githubFetch(args.url)}catch(e){result={error:e.message}};
   history.push({role:"tool",tool_call_id:call.id,content:JSON.stringify(result)});
  }
 }
 throw new Error("Agent tool loop exceeded its safety limit.");
}

async function chat(request,env){
 const b=await request.json();
 if(!Array.isArray(b.messages))return json({error:"messages must be an array"},400);
 const r=await agent(env,b.messages,b.model);
 return json({id:crypto.randomUUID(),model:b.model||env.DEFAULT_MODEL,message:r.message,usage:r.usage});
}

async function fileUpload(request){
 const form=await request.formData(),file=form.get("file");
 if(!(file instanceof File))return json({error:"file is required"},400);
 if(file.size>8*1024*1024)return json({error:"Maximum file size is 8 MB."},413);
 const bytes=new Uint8Array(await file.arrayBuffer()),type=file.type||"application/octet-stream",name=file.name||"file";
 const textLike=type.startsWith("text/")||/\.(txt|md|json|csv|xml|html|css|js|ts|py|php|java|c|cpp|h|hpp|yaml|yml|toml|sql)$/i.test(name);
 if(textLike)return json({name,type,size:file.size,kind:"text",content:new TextDecoder().decode(bytes).slice(0,200000)});
 let bin="";for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
 return json({name,type,size:file.size,kind:"binary",data_url:`data:${type};base64,${btoa(bin)}`});
}

const HTML=`<!doctype html>
<html lang="fa" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b1020">
<title>Kadad AI</title>
<style>
:root{color-scheme:dark;--panel:#10182a;--panel2:#151f34;--line:#293653;--text:#f5f7ff;--muted:#91a0ba;--accent:#79a9ff}
*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;background:radial-gradient(circle at top,#172542 0,#080c17 45%);color:var(--text)}
button,textarea,input{font:inherit}.app{width:min(1050px,100%);margin:auto;min-height:100vh;display:flex;flex-direction:column;padding:18px}
header{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:12px 4px 18px}.brand{display:flex;align-items:center;gap:12px}
.logo{width:46px;height:46px;display:grid;place-items:center;border:1px solid var(--line);border-radius:15px;background:linear-gradient(145deg,#243b67,#111a2d);font-size:25px;box-shadow:0 10px 35px #0004}
h1{font-size:20px;margin:0}.sub{font-size:12px;color:var(--muted);margin-top:3px}.status{font-size:12px;color:#9ee6b2;border:1px solid #28563b;border-radius:999px;padding:7px 10px;background:#102219}
.chat{flex:1;min-height:58vh;border:1px solid var(--line);border-radius:24px;background:#0c1322cc;backdrop-filter:blur(15px);padding:18px;overflow:auto;box-shadow:0 20px 70px #0004}
.welcome{min-height:50vh;display:grid;place-items:center;text-align:center;color:var(--muted)}.welcome strong{display:block;color:var(--text);font-size:25px;margin-bottom:8px}.welcome p{max-width:600px;line-height:1.9}
.m{max-width:85%;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.85;padding:13px 16px;border-radius:18px;margin:12px 0;border:1px solid var(--line)}.u{margin-right:auto;background:#1d3155;border-bottom-right-radius:5px}.a{margin-left:auto;background:var(--panel);border-bottom-left-radius:5px}
.composer{margin-top:12px;border:1px solid var(--line);border-radius:20px;background:var(--panel);padding:10px}textarea{width:100%;min-height:74px;max-height:220px;resize:vertical;border:0;outline:0;background:transparent;color:var(--text);padding:8px 10px}
.bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 3px 2px}.left{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.filelabel,.clear{cursor:pointer;border:1px solid var(--line);background:var(--panel2);color:var(--muted);border-radius:11px;padding:7px 10px;font-size:12px}.filelabel:hover,.clear:hover{color:var(--text)}
input[type=file]{display:none}.send{cursor:pointer;border:0;border-radius:12px;padding:9px 18px;background:var(--accent);color:#08101e;font-weight:700}.send:disabled{opacity:.5;cursor:not-allowed}
.filepill{display:none;border:1px dashed var(--line);border-radius:10px;padding:8px;color:var(--muted);font-size:12px}footer{text-align:center;color:#5f6c84;font-size:11px;padding:12px}
@media(max-width:650px){.app{padding:10px}.chat{min-height:62vh;padding:11px}.m{max-width:94%}.status{display:none}}
</style></head>
<body><div class="app">
<header><div class="brand"><div class="logo">🤖</div><div><h1>Kadad AI</h1><div class="sub">OpenRouter Agent · Web · GitHub · Files · Image Generation</div></div></div><div class="status">● آماده</div></header>
<section id="chat" class="chat"><div id="welcome" class="welcome"><div><strong>سلام 👋</strong><p>من Kadad AI هستم. می‌توانم با ابزارهای متصل جست‌وجوی وب انجام بدهم، صفحات را بررسی کنم، ریپوهای عمومی GitHub را بخوانم، فایل دریافت کنم و در صورت پشتیبانی مدل، تصویر تولید کنم.</p></div></div></section>
<form id="f" class="composer"><textarea id="q" autocomplete="off" placeholder="پیامت را بنویس... مثلا: ریپوی kavandad93/llm را بررسی کن"></textarea>
<div class="bar"><div class="left"><label class="filelabel">📎 فایل<input id="file" type="file"></label><button type="button" id="clear" class="clear">🗑 پاک کردن گفتگو</button><span id="filepill" class="filepill"></span></div><button id="send" class="send">ارسال</button></div></form>
<footer>Powered by OpenRouter · Hosted on Cloudflare Workers</footer></div>
<script>
const chat=document.querySelector("#chat"),welcome=document.querySelector("#welcome"),q=document.querySelector("#q"),send=document.querySelector("#send"),file=document.querySelector("#file"),filepill=document.querySelector("#filepill"),clear=document.querySelector("#clear");let messages=[];
function add(role,text){welcome?.remove();const d=document.createElement("div");d.className="m "+(role==="user"?"u":"a");d.textContent=text;chat.appendChild(d);chat.scrollTop=chat.scrollHeight;return d}
function setBusy(v){send.disabled=v;q.disabled=v}
document.querySelector("#f").onsubmit=async e=>{e.preventDefault();const text=q.value.trim();if(!text)return;add("user",text);messages.push({role:"user",content:text});q.value="";setBusy(true);const box=add("assistant","⏳ در حال پردازش...");
try{const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages})}),d=await r.json();if(!r.ok)throw Error(d.error||"خطا در اتصال");const answer=typeof d.message?.content==="string"?d.message.content:JSON.stringify(d.message?.content);box.textContent=answer;messages.push({role:"assistant",content:answer})}catch(e){box.textContent="❌ "+e.message}finally{setBusy(false);q.focus()}};
q.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();document.querySelector("#f").requestSubmit()}});
file.onchange=async e=>{const f=e.target.files[0];if(!f)return;filepill.style.display="inline-block";filepill.textContent="📎 "+f.name;const fd=new FormData();fd.append("file",f);
try{const r=await fetch("/api/file",{method:"POST",body:fd}),d=await r.json();if(d.error)throw Error(d.error);const preview=d.kind==="text"?d.content.slice(0,5000):"فایل دریافت شد.";add("assistant","📎 "+d.name+"\n"+preview);if(d.kind==="text")messages.push({role:"user",content:"فایل "+d.name+" را دریافت کردم. محتوای آن:\n"+d.content.slice(0,200000)})}catch(e){add("assistant","❌ "+e.message)}};
clear.onclick=()=>{messages=[];chat.innerHTML='<div id="welcome" class="welcome"><div><strong>گفتگو پاک شد 👋</strong><p>پیام جدیدت را بنویس.</p></div></div>';file.value="";filepill.style.display="none"};
</script></body></html>`;

export default{async fetch(request,env){
 const u=new URL(request.url);if(request.method==="OPTIONS")return new Response(null,{headers:CORS});
 try{
  if(u.pathname==="/api/health"&&request.method==="GET")return json({ok:true,name:"Kadad AI",version:"1.1.0",openrouter:Boolean(env.OPENROUTER_API_KEY),features:["chat","web-search","web-fetch","github-public","image-generation","file-upload","embedded-ui"]});
  if(u.pathname==="/api/chat"&&request.method==="POST")return chat(request,env);
  if(u.pathname==="/api/file"&&request.method==="POST")return fileUpload(request);
  if(u.pathname==="/"||u.pathname==="/index.html")return new Response(HTML,{headers:{"content-type":"text/html;charset=utf-8",...CORS}});
  return json({error:"Not found"},404);
 }catch(e){return json({error:e?.message||"Internal error"},500)}
}};