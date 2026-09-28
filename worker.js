const OPENROUTER_URL="https://openrouter.ai/api/v1/chat/completions";
const SYSTEM="You are Kadad AI, a practical multilingual AI agent. Use web search/fetch when current or page-specific information is needed. Use GitHub fetch for public repositories. Use image generation when requested. Never claim a tool result you did not receive.";

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
 const r=await fetch(OPENROUTER_URL,{method:"POST",headers:{
  "Authorization":`Bearer ${env.OPENROUTER_API_KEY}`,"Content-Type":"application/json",
  "HTTP-Referer":env.SITE_URL||"https://llm.kavandadkhah.workers.dev","X-OpenRouter-Title":"Kadad AI"
 },body:JSON.stringify(payload)});
 const d=await r.json();
 if(!r.ok)throw new Error(d?.error?.message||`OpenRouter HTTP ${r.status}`);
 return d;
}

async function agent(env,messages,model){
 let history=[{role:"system",content:SYSTEM},...messages.slice(-30)];
 for(let i=0;i<6;i++){
  const d=await or(env,{model:model||env.DEFAULT_MODEL||"openai/gpt-5.2",messages:history,tools,tool_choice:"auto",temperature:.5});
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

const HTML=`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kadad AI</title><style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#0b1020;color:#f5f7ff}main{max-width:950px;margin:auto;padding:24px}.sub{opacity:.65;margin-bottom:18px}.chat{min-height:55vh;border:1px solid #28334d;border-radius:18px;padding:14px;background:#11182a}.m{white-space:pre-wrap;line-height:1.8;padding:12px 15px;border-radius:15px;margin:10px 0}.u{background:#24385e}.a{background:#192238}form{display:flex;gap:8px;margin-top:12px}textarea{flex:1;resize:vertical;min-height:72px;border:1px solid #34415e;border-radius:13px;padding:12px;background:#0e1526;color:#fff;font:inherit}button{border:0;border-radius:13px;padding:0 20px;font:inherit;cursor:pointer;background:#6ea8fe;color:#07101f}.tools{margin-top:10px;display:flex;gap:10px;align-items:center}.tools input{max-width:260px}</style></head><body><main><h1>🤖 Kadad AI</h1><div class="sub">OpenRouter Agent · Web · GitHub · Files · Image Generation</div><div id="chat" class="chat"></div><form id="f"><textarea id="q" placeholder="مثلاً: آخرین اخبار هوش مصنوعی را جستجو کن..."></textarea><button>ارسال</button></form><div class="tools">📎 <input id="file" type="file"></div></main><script>
const chat=document.querySelector("#chat"),q=document.querySelector("#q");let messages=[];
function add(role,text){const d=document.createElement("div");d.className="m "+(role==="user"?"u":"a");d.textContent=text;chat.appendChild(d);chat.scrollTop=chat.scrollHeight;return d}
document.querySelector("#f").onsubmit=async e=>{e.preventDefault();const text=q.value.trim();if(!text)return;add("user",text);messages.push({role:"user",content:text});q.value="";const box=add("assistant","در حال پردازش…");try{const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages})}),d=await r.json();if(!r.ok)throw Error(d.error||"خطا");const answer=typeof d.message?.content==="string"?d.message.content:JSON.stringify(d.message?.content);box.textContent=answer;messages.push({role:"assistant",content:answer})}catch(e){box.textContent="❌ "+e.message}};
document.querySelector("#file").onchange=async e=>{const f=e.target.files[0];if(!f)return;const fd=new FormData();fd.append("file",f);try{const r=await fetch("/api/file",{method:"POST",body:fd}),d=await r.json();add("assistant",d.error?"❌ "+d.error:"📎 "+d.name+"\n"+(d.kind==="text"?d.content.slice(0,3000):"فایل دریافت شد."))}catch(e){add("assistant","❌ "+e.message)}};
</script></body></html>`;

export default{async fetch(request,env){
 const u=new URL(request.url);
 if(request.method==="OPTIONS")return new Response(null,{headers:CORS});
 try{
  if(u.pathname==="/api/health"&&request.method==="GET")return json({ok:true,name:"Kadad AI",version:"1.0.0",openrouter:Boolean(env.OPENROUTER_API_KEY),features:["chat","web-search","web-fetch","github-public","image-generation","file-upload"]});
  if(u.pathname==="/api/chat"&&request.method==="POST")return chat(request,env);
  if(u.pathname==="/api/file"&&request.method==="POST")return fileUpload(request);
  if(u.pathname==="/"||u.pathname==="/index.html")return new Response(HTML,{headers:{"content-type":"text/html;charset=utf-8",...CORS}});
  return json({error:"Not found"},404);
 }catch(e){return json({error:e?.message||"Internal error"},500)}
}};
