/* Shared site shell: nav + footer on every page, plus Home/About/Team/Contact/Terms/Privacy,
   all driven by Google Sheet tabs. Edit a cell in the Sheet -> the site updates. */
(function(){
// ====== CONFIG: paste each new tab's gid (the number after "gid=" in its published link) ======
const SHEET="https://docs.google.com/spreadsheets/d/e/2PACX-1vSnzz7ZtIZdVOzq9FJLG0x1Hz2Y6XYNkTsveYm_sJheBoPIP-jhL27SBGl57CLMJirXvzjSQ4X-CMmB/pub";
const GIDS={ledger:"0",settings:"2125262912",nav:"763580476",pages:"1940886012",team:"2027713606",highlights:"1687804525"};
// Until a gid is filled in, the built-in defaults below are used, so the site works on day one.

const DEF={
settings:{site_name:"Useful Startups",tagline:"India's startup ledger and news, in one place.",
 hero_eyebrow:"Vol. 01 — Live Feed",hero_title:"Know who is building",hero_accent:"India's next.",
 hero_subtext:"A living register of Indian startups, who backs them, and the news that moves them.",
 cta1_label:"Explore the Ledger",cta1_url:"ledger.html",cta2_label:"Read the news",cta2_url:"news.html",
 about_title:"About us",about_intro:"Why this exists and what we believe.",
 team_title:"The team",team_intro:"The people behind the ledger.",
 contact_title:"Get in touch",contact_intro:"Questions, corrections or partnerships — we read everything.",
 terms_title:"Terms of Use",terms_intro:"The rules for using this website.",
 privacy_title:"Privacy Policy",privacy_intro:"What we collect and why.",
 legal_updated:"",contact_email:"hello@example.com",contact_phone:"",address:"",
 linkedin:"",twitter:"",instagram:"",youtube:"",contact_form_url:"",logo_url:"",
 footer_blurb:"Tracking India's startups, one row at a time.",copyright:"© 2026 Useful Startups. All rights reserved."},
nav:[{Label:"Home",URL:"index.html",Location:"header",Order:1},{Label:"Ledger",URL:"ledger.html",Location:"both",Order:2},
 {Label:"News",URL:"news.html",Location:"both",Order:3},{Label:"About",URL:"about.html",Location:"both",Order:4},
 {Label:"Team",URL:"team.html",Location:"both",Order:5},{Label:"Contact",URL:"contact.html",Location:"both",Order:6},
 {Label:"Terms",URL:"terms.html",Location:"footer",Order:7},{Label:"Privacy",URL:"privacy.html",Location:"footer",Order:8}],
highlights:[{Value:"auto:startups",Label:"Startups tracked",Order:1},{Value:"Hourly",Label:"News refresh",Order:2},{Value:"100%",Label:"Free to browse",Order:3}],
team:[{Name:"Founder Name",Role:"Founder",Bio:"Edit this in the Team tab of your Google Sheet.",Order:1}],
pages:[
 {Page:"home",Order:1,Heading:"The Active Ledger",Body:"Search, filter and compare startups by sector, tech and investors.",Link:"ledger.html"},
 {Page:"home",Order:2,Heading:"The Runway",Body:"Fresh startup and business news, refreshed every hour.",Link:"news.html"},
 {Page:"home",Order:3,Heading:"Suggest a startup",Body:"Know one that belongs here? Send it in for review.",Link:"ledger.html"},
 {Page:"about",Order:1,Heading:"Our mission",Body:"Replace this text from the Pages tab of your Google Sheet.\n\nSeparate paragraphs with a blank line. Use **bold**, [links](https://example.com) and\n- bullet lists."},
 {Page:"terms",Order:1,Heading:"1. Acceptance",Body:"By using this website you agree to these terms. Replace this placeholder with your reviewed legal text."},
 {Page:"privacy",Order:1,Heading:"1. What we collect",Body:"Replace this placeholder with your reviewed privacy policy."}]
};

// ====== helpers ======
const $=(s,r)=>(r||document).querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const url=u=>/^\s*(javascript|data|vbscript):/i.test(u)?"#":u;
const clean=v=>{v=(v||"").trim();return v==="-"?"":v};
const vis=r=>!/^(no|false|0|hide)$/i.test((r.Visible||"").trim());
const by=(a,b)=>(parseFloat(a.Order)||99)-(parseFloat(b.Order)||99);
const inline=s=>esc(s).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(m,t,u)=>`<a href="${url(u)}">${t}</a>`);
function md(t){const o=[];let ul=false;String(t||"").split(/\r?\n/).forEach(l=>{l=l.trim();
 if(/^[-•]\s+/.test(l)){if(!ul){o.push("<ul>");ul=true}o.push("<li>"+inline(l.replace(/^[-•]\s+/,""))+"</li>")}
 else{if(ul){o.push("</ul>");ul=false}if(/^##\s+/.test(l))o.push("<h3>"+inline(l.slice(3))+"</h3>");else if(l)o.push("<p>"+inline(l)+"</p>")}});
 if(ul)o.push("</ul>");return o.join("")}
function drive(u){u=clean(u);if(!u)return"";const m=u.match(/\/d\/([\w-]+)/)||u.match(/id=([\w-]+)/);return m?`https://drive.google.com/thumbnail?id=${m[1]}&sz=w600`:u}
const initials=n=>String(n||"?").split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase();
function loadScript(src){return new Promise((res,rej)=>{if(window.Papa)return res();const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}

function tab(name){
 const gid=GIDS[name],def=DEF[name],ck="ul_tab_"+name;
 if(gid==="")return Promise.resolve(null);
 return loadScript("https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js")
  .then(()=>fetch(`${SHEET}?gid=${gid}&single=true&output=csv`,{cache:"no-store"}))
  .then(r=>{if(!r.ok)throw 0;return r.text()})
  .then(t=>{const d=Papa.parse(t,{header:true,skipEmptyLines:true}).data;try{localStorage.setItem(ck,JSON.stringify(d))}catch(e){}return d})
  .catch(()=>{try{return JSON.parse(localStorage.getItem(ck))}catch(e){return null}});
}
async function get(name){const d=await tab(name);return d&&d.length?d:null}
async function getSettings(){const d=await get("settings");const s=Object.assign({},DEF.settings);
 if(d)d.forEach(r=>{const k=clean(r.Key);if(k&&clean(r.Value))s[k]=r.Value.trim()});return s}

// ====== shell ======
function head(){
 const add=(tag,attrs)=>{const e=document.createElement(tag);Object.assign(e,attrs);document.head.appendChild(e)};
 add("link",{rel:"stylesheet",href:"site.css"});
 add("link",{rel:"stylesheet",href:"https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"});
}
function shell(S,nav){
 const here=location.pathname.split("/").pop()||"index.html";
 const items=nav.filter(vis).sort(by);
 const link=(r,cls)=>{const u=clean(r.URL)||"#";const on=u.split("/").pop()===here||(here==="index.html"&&(u==="/"||u==="index.html"));
  return `<a href="${esc(url(u))}"${/^https?:/.test(u)&&!u.includes(location.host)?' target="_blank" rel="noopener"':""} class="${on?"on":""}">${esc(r.Label)}</a>`};
 const loc=(r,w)=>{const l=(r.Location||"header").toLowerCase();return l==="both"||l===w};
 const mark=S.logo_url?`<img src="${esc(drive(S.logo_url))}" alt="">`:esc(initials(S.site_name).charAt(0));
 const brand=`<a class="ul-brand" href="index.html"><span class="ul-mark">${mark}</span><span>${esc(S.site_name)}</span></a>`;
 const nv=document.createElement("div");nv.className="ul-nav";
 nv.innerHTML=`<div class="ul-nav-in">${brand}<nav class="ul-links" id="ulLinks">${items.filter(r=>loc(r,"header")).map(link).join("")}</nav><button class="ul-burger" aria-label="Menu" id="ulBurger">☰</button></div>`;
 document.body.insertBefore(nv,document.body.firstChild);
 $("#ulBurger").onclick=()=>$("#ulLinks").classList.toggle("open");
 const soc=[["linkedin","LinkedIn"],["twitter","X / Twitter"],["instagram","Instagram"],["youtube","YouTube"]].filter(x=>S[x[0]]).map(x=>`<a href="${esc(url(S[x[0]]))}" target="_blank" rel="noopener">${x[1]}</a>`).join("");
 const ft=document.createElement("div");ft.className="ul-foot";
 ft.innerHTML=`<div class="ul-foot-in"><div>${brand}<p>${esc(S.footer_blurb)}</p></div>
 <div><h4>Explore</h4>${items.filter(r=>loc(r,"footer")&&!/terms|privacy/i.test(r.URL)).map(link).join("")}</div>
 <div><h4>Legal &amp; Social</h4>${items.filter(r=>loc(r,"footer")&&/terms|privacy/i.test(r.URL)).map(link).join("")}${soc}</div></div>
 <div class="ul-copy"><span>${esc(S.copyright)}</span><span>${S.contact_email?`<a style="display:inline" href="mailto:${esc(S.contact_email)}">${esc(S.contact_email)}</a>`:""}</span></div>`;
 document.body.appendChild(ft);
 const h=nv.offsetHeight;if(h)document.documentElement.style.setProperty("--ul-nav-h",h+"px");
}

// ====== pages ======
const sections=(rows,p)=>rows.filter(r=>(r.Page||"").toLowerCase()===p&&vis(r)).sort(by);
function pageHead(S,k){return `<div class="ul-pagehead"><div class="ul-aurora"></div><div class="ul-wrap"><div class="ul-eyebrow">${esc(S.site_name)}</div><h1>${esc(S[k+"_title"])}</h1><p class="ul-lead">${esc(S[k+"_intro"])}</p></div></div>`}
function textPage(k,S,P){
 const rows=sections(P,k);const upd=S.legal_updated&&(k==="terms"||k==="privacy")?`<p style="font:12px var(--mono);color:var(--gold2)">Last updated: ${esc(S.legal_updated)}</p>`:"";
 return pageHead(S,k)+`<div class="ul-doc">${upd}${rows.map(r=>`<section class="rv">${clean(r.Heading)?`<h2>${esc(r.Heading)}</h2>`:""}${md(r.Body)}</section>`).join("")||"<p>No content yet.</p>"}</div>`;
}
function teamPage(S,T){
 const m=T.filter(vis).sort(by);
 return pageHead(S,"team")+`<div class="ul-wrap ul-team" style="padding-bottom:90px"><div class="ul-grid">${m.map(r=>{const ph=drive(r.Photo||r["Photo URL"]);
  return `<div class="ul-card tilt rv"><div class="ul-photo">${ph?`<img src="${esc(ph)}" alt="${esc(r.Name)}" onerror="this.remove()">`:esc(initials(r.Name))}</div><div class="ul-body"><h3>${esc(r.Name)}</h3><div class="ul-role">${esc(r.Role)}</div><p>${inline(r.Bio)}</p>${clean(r.LinkedIn)?`<a class="ul-more" href="${esc(url(r.LinkedIn))}" target="_blank" rel="noopener">LinkedIn →</a>`:""}</div></div>`}).join("")}</div></div>`;
}
function contactPage(S){
 const row=(l,v)=>v?`<div><label>${l}</label>${v}</div>`:"";
 return pageHead(S,"contact")+`<div class="ul-wrap"><div class="ul-contact"><div class="ul-info rv">
 ${row("Email",S.contact_email&&`<a href="mailto:${esc(S.contact_email)}">${esc(S.contact_email)}</a>`)}${row("Phone",esc(S.contact_phone))}${row("Address",esc(S.address))}
 ${row("Follow",["linkedin","twitter","instagram","youtube"].filter(k=>S[k]).map(k=>`<a href="${esc(url(S[k]))}" target="_blank" rel="noopener">${k}</a>`).join(" · "))}</div>
 <form class="ul-form rv" id="ulForm"><label>Your name</label><input name="fname" required><label>Your email</label><input type="email" name="femail" required>
 <label>Message</label><textarea name="fmsg" required></textarea><div class="ul-hp"><input name="hp" tabindex="-1" autocomplete="off"></div>
 <button class="ul-btn" type="submit">Send message</button><div class="ul-status" id="ulStatus"></div></form></div></div>`;
}
function wireForm(S){
 const f=$("#ulForm");if(!f)return;const st=$("#ulStatus");const t0=Date.now();
 const ok=()=>{st.style.color="#6fbf73";st.textContent="Thanks — your message has been sent.";f.reset()};
 const bad=()=>{st.style.color="#C1543C";st.textContent="Couldn't send that. Please email us directly."};
 f.onsubmit=e=>{e.preventDefault();if(f.hp.value)return ok();if(Date.now()-t0<2500){st.style.color="#C1543C";st.textContent="Please take a moment to fill out the form.";return}
  const d={formType:"contact",name:f.fname.value.trim(),email:f.femail.value.trim(),message:f.fmsg.value.trim()};
  if(S.contact_form_url){st.textContent="Sending…";fetch(S.contact_form_url,{method:"POST",body:JSON.stringify(d),headers:{"Content-Type":"text/plain;charset=utf-8"}}).then(r=>r.json()).then(j=>j.ok?ok():bad()).catch(bad)}
  else location.href="mailto:"+S.contact_email+"?subject="+encodeURIComponent("Message from "+d.name)+"&body="+encodeURIComponent(d.message+"\n\n"+d.email);};
}

async function homePage(S,P,H){
 const cards=sections(P,"home");
 const stats=H.filter(vis).sort(by);
 const out=`<section class="ul-hero"><div class="ul-aurora"></div><div class="ul-wrap"><div class="ul-eyebrow">${esc(S.hero_eyebrow)}</div>
 <h1>${esc(S.hero_title)} <em>${esc(S.hero_accent)}</em></h1><p class="ul-lead">${esc(S.hero_subtext)}</p>
 <div class="ul-cta"><a class="ul-btn" href="${esc(url(S.cta1_url))}">${esc(S.cta1_label)}</a>${S.cta2_label?`<a class="ul-btn ghost" href="${esc(url(S.cta2_url))}">${esc(S.cta2_label)}</a>`:""}</div></div></section>
 <div class="ul-wrap" style="padding-top:60px"><div class="ul-stats rv" id="ulStats">${stats.map(r=>`<div class="ul-stat"><b data-v="${esc(r.Value)}">${/^auto:/.test(r.Value)?"…":esc(r.Value)}</b><span>${esc(r.Label)}</span></div>`).join("")}</div></div>
 <section class="ul-sec"><div class="ul-wrap"><div class="ul-eyebrow">Explore</div><h2>Everything in one place</h2><div class="ul-grid">${cards.map(r=>`<a class="ul-card rv" href="${esc(url(clean(r.Link)||"#"))}"><h3>${esc(r.Heading)}</h3><p>${inline(r.Body)}</p><span class="ul-more">Open →</span></a>`).join("")}</div></div></section>
 <section class="ul-sec" id="ulFeat" hidden><div class="ul-wrap"><div class="ul-head"><div><div class="ul-eyebrow">Featured</div><h2>From the Ledger</h2></div><a class="ul-link" href="ledger.html">View all →</a></div><div class="ul-grid" id="ulFeatGrid"></div></div></section>
 <section class="ul-sec" id="ulNews" hidden><div class="ul-wrap"><div class="ul-head"><div><div class="ul-eyebrow">Latest</div><h2>From The Runway</h2></div><a class="ul-link" href="news.html">All stories →</a></div><div class="ul-grid" id="ulNewsGrid"></div></div></section>`;
 return out;
}
async function homeData(){
 let rows=[];
 try{await loadScript("https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js");
  const t=await fetch(`${SHEET}?gid=${GIDS.ledger}&single=true&output=csv`,{cache:"no-store"}).then(r=>r.text());
  rows=Papa.parse(t,{header:true,skipEmptyLines:true}).data.filter(r=>clean(r["Startup Name"]))}catch(e){}
 document.querySelectorAll("#ulStats b[data-v='auto:startups']").forEach(b=>{b.dataset.v=rows.length?String(rows.length):"—"; b.textContent=b.dataset.v});
 const f=rows.filter(r=>clean(r.Featured).toLowerCase()==="yes").slice(0,3);
 if(f.length){$("#ulFeat").hidden=false;$("#ulFeatGrid").innerHTML=f.map(r=>`<a class="ul-card rv" href="ledger.html"><span class="ul-meta">${esc(clean(r.Sector))} · ${esc(clean(r.Headquarters))}</span><h3>${esc(r["Startup Name"])}</h3><p>${esc(r["Tagline / Description"])}</p><span class="ul-more">${esc(clean(r["Funding Amount"])||"Undisclosed")} · ${esc(clean(r["Funding Stage"]))}</span></a>`).join("")}
 try{if(typeof SUPABASE_URL!=="undefined"){const a=await fetch(`${SUPABASE_URL}/rest/v1/articles?select=title,link,source,summary&order=published_at.desc&limit=3`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+SUPABASE_ANON_KEY}}).then(r=>r.json());
  if(Array.isArray(a)&&a.length){$("#ulNews").hidden=false;$("#ulNewsGrid").innerHTML=a.map(x=>`<a class="ul-card rv" href="${esc(url(x.link))}" target="_blank" rel="noopener"><span class="ul-meta">${esc(x.source)}</span><h3 style="font-size:18px">${esc(x.title)}</h3><p>${esc((x.summary||"").slice(0,120))}</p></a>`).join("")}}}catch(e){}
}
function fx(){
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);e.target.querySelectorAll&&e.target.querySelectorAll("b[data-v]").forEach(count)}}),{threshold:.12});
 const watch=()=>document.querySelectorAll(".rv:not(.in)").forEach(el=>io.observe(el));watch();new MutationObserver(watch).observe(document.body,{childList:true,subtree:true});
 document.addEventListener("mousemove",e=>{const c=e.target.closest&&e.target.closest(".ul-card,.ul-hero,.ul-pagehead");if(!c)return;const r=c.getBoundingClientRect();
  const a=c.classList.contains("ul-card")?c:c.querySelector(".ul-aurora")||c;a.style.setProperty("--mx",(e.clientX-r.left)+"px");a.style.setProperty("--my",(e.clientY-r.top)+"px")});
}
function count(el){const v=el.dataset.v||"";const m=v.match(/^(\D*)([\d.,]+)(.*)$/);if(!m||/^auto:/.test(v)){el.textContent=v;return}
 const n=parseFloat(m[2].replace(/,/g,""));let t0;const f=t=>{t0=t0||t;const p=Math.min((t-t0)/1200,1);el.textContent=m[1]+Math.round(n*(1-Math.pow(1-p,3))).toLocaleString("en-IN")+m[3];if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)}

// ====== boot ======
async function boot(){
 head();
 const [S,nav,pages,team,hl]=await Promise.all([getSettings(),get("nav"),get("pages"),get("team"),get("highlights")]);
 const NAV=nav||DEF.nav,P=pages||DEF.pages;
 shell(S,NAV);
 const key=document.body.dataset.page;if(!key)return;
 document.body.classList.add("ul-page");
 const root=$("#ul-root");
 const T=key==="home"?S.site_name:(S[key+"_title"]||key)+" — "+S.site_name;document.title=T;
 if(key==="home"){root.innerHTML=await homePage(S,P,hl||DEF.highlights);fx();homeData()}
 else if(key==="team"){root.innerHTML=teamPage(S,team||DEF.team);fx()}
 else if(key==="contact"){root.innerHTML=contactPage(S);wireForm(S);fx()}
 else{root.innerHTML=textPage(key,S,P);fx()}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
