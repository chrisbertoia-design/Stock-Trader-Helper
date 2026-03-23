(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))a(r);new MutationObserver(r=>{for(const n of r)if(n.type==="childList")for(const i of n.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function o(r){const n={};return r.integrity&&(n.integrity=r.integrity),r.referrerPolicy&&(n.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?n.credentials="include":r.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function a(r){if(r.ep)return;r.ep=!0;const n=o(r);fetch(r.href,n)}})();const He="modulepreload",Be=function(t){return"/Stock-Trader-Helper/"+t},Jt={},Ue=function(e,o,a){let r=Promise.resolve();if(o&&o.length>0){document.getElementsByTagName("link");const i=document.querySelector("meta[property=csp-nonce]"),d=(i==null?void 0:i.nonce)||(i==null?void 0:i.getAttribute("nonce"));r=Promise.allSettled(o.map(s=>{if(s=Be(s),s in Jt)return;Jt[s]=!0;const l=s.endsWith(".css"),c=l?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${s}"]${c}`))return;const p=document.createElement("link");if(p.rel=l?"stylesheet":He,l||(p.as="script"),p.crossOrigin="",p.href=s,d&&p.setAttribute("nonce",d),document.head.appendChild(p),l)return new Promise((u,g)=>{p.addEventListener("load",u),p.addEventListener("error",()=>g(new Error(`Unable to preload CSS for ${s}`)))})}))}function n(i){const d=new Event("vite:preloadError",{cancelable:!0});if(d.payload=i,window.dispatchEvent(d),!d.defaultPrevented)throw i}return r.then(i=>{for(const d of i||[])d.status==="rejected"&&n(d.reason);return e().catch(n)})},ve=`s_${Date.now().toString(36)}`,at={DEBUG:0,INFO:1,WARN:2,ERROR:3};let nt=null,ge=at.DEBUG,M=[],pt=!1,ut=!1;function ye({sheetsWriter:t,minLevel:e="DEBUG"}){nt=t,ge=at[e]??at.DEBUG,st("INFO","LOGGER",`Logger initialized — session ${ve}`),he()}function st(t,e,o,a=null){if((at[t]??at.DEBUG)<ge)return;const n={timestamp:new Date().toISOString(),level:t,category:e,message:o,details:a?typeof a=="string"?a:JSON.stringify(a):"",session_id:ve},i={DEBUG:"color: #555",INFO:"color: #8a8",WARN:"color: #ca8",ERROR:"color: #c77; font-weight: bold"};console.log(`%c[${t}] [${e}]%c ${o}`,i[t]||"","color: inherit",a??""),nt?je(n):(M.push(n),M.length>200&&M.shift())}const m=(t,e,o)=>st("DEBUG",t,e,o),v=(t,e,o)=>st("INFO",t,e,o),w=(t,e,o)=>st("WARN",t,e,o),G=(t,e,o)=>st("ERROR",t,e,o);async function he(){if(pt||ut||!nt||M.length===0)return;pt=!0;const t=[...M];M=[];try{await nt(t),console.log(`[LOGGER] Flushed ${t.length} buffered log entries`)}catch(e){console.error("[LOGGER] Failed to flush buffer:",e),M=[...t,...M]}pt=!1}async function je(t){if(ut){M.push(t);return}ut=!0;try{await nt([t])}catch(e){console.error("[LOGGER] Sheets write failed:",e,t),M.push(t)}finally{ut=!1,M.length>0&&!pt&&he()}}const y="GSHEETS",It={config:["key","value","description","last_modified"],log:["timestamp","level","category","message","details","session_id"],watchlist:["id","name","party","chamber","state","mirror","tier","category","active","notes","date_added"],disclosures:["id","politician_id","politician_name","party","ticker","action","amount_low","amount_high","transaction_date","disclosed_date","fetched_at","sp500","raw_json"],consensus:["id","signal_date","party","tickers","member_count","party_total","pct_of_party","window_days","tier","notified","ai_summary","created_at"],recommendations:["id","source_disclosure_ids","tickers","action","signal_type","ai_reasoning","positions_context","sp500_eligible","created_at","status"],my_decisions:["id","recommendation_id","decision","invest_amount","slice_count","decided_at","revisit_date","notes"],my_allocations:["id","decision_id","ticker","allocation_amount","is_sp500","executed","executed_date","notes"],my_positions:["ticker","quantity","avg_cost","mkt_value","gain_loss","gain_loss_pct","last_csv_upload","source"]},Ot={config:"D",log:"F",watchlist:"K",disclosures:"M",consensus:"L",recommendations:"J",my_decisions:"H",my_allocations:"H",my_positions:"H"},Ge=[["consensus_tier1_pct","0.08","Elevated: 8%+ of party traded same ticker (seen 1-3x/yr)",""],["consensus_tier2_pct","0.12","Strong: 12%+ of party (rare, <5x/yr)",""],["consensus_tier3_pct","0.18","Near-unanimous: 18%+ (almost never — would be major signal)",""],["consensus_window_days","14","Days to cluster trades for consensus detection",""],["ai_provider","ollama","Primary AI provider: ollama | gemini",""],["ai_model","","Model name. Empty = provider default",""],["ollama_base_url","http://localhost:11434","Ollama API base URL",""],["ollama_fallback_model","llama3.2","Model if ai_model is blank and provider=ollama",""],["gemini_api_key","","Gemini API key (leave blank if not using)",""],["gemini_fallback_model","gemini-2.0-flash","Model if ai_model is blank and provider=gemini",""],["ntfy_topic","","ntfy.sh topic slug for push notifications",""],["ntfy_base_url","https://ntfy.sh","ntfy.sh server URL",""],["notify_on_tier","1","Minimum consensus tier to trigger notification (1|2|3)",""],["sp500_last_update","","ISO date of last S&P 500 list refresh",""],["party_roster_d","213","Number of Democrats in House (update after elections)",""],["party_roster_r","222","Number of Republicans in House (update after elections)",""],["log_level","DEBUG","Minimum log level: DEBUG | INFO | WARN | ERROR",""],["log_max_rows","2000","Max rows to keep in log tab before trimming",""]];let B=null,qt=null;async function We(t,e){var r,n;m(y,"initSheets called",{spreadsheetId:t}),B=t,qt=e;const[o,a]=await Promise.allSettled([to(),oo()]);o.status==="rejected"&&w(y,`_ensureAllTabs failed (non-fatal): ${(r=o.reason)==null?void 0:r.message}`),a.status==="rejected"&&w(y,`_ensureDefaultConfig failed (non-fatal): ${(n=a.reason)==null?void 0:n.message}`),v(y,"Google Sheets initialized",{spreadsheetId:t})}function be(){return B}function Ve(t){B=t}function Ye(t){qt=t}async function Ke(){m(y,"readConfig — reading config tab");const t=await it("config"),e={};for(const o of t)o[0]&&(e[o[0]]=o[1]??"");return v(y,`Config loaded — ${Object.keys(e).length} keys`,e),e}async function Je(t,e){m(y,"writeConfigKey",{key:t,value:e}),await Xe({[t]:e}),v(y,`Config key updated: ${t} = ${e}`)}async function Xe(t){if(!Object.keys(t).length)return;m(y,`writeConfigBatch — ${Object.keys(t).length} keys`);const e=await it("config"),o=new Date().toISOString(),a=[],r=[];for(const[n,i]of Object.entries(t)){const d=e.findIndex(s=>s[0]===n);if(d===-1)r.push([n,String(i),"",o]);else{const s=d+2;a.push({range:`config!B${s}`,majorDimension:"ROWS",values:[[String(i)]]}),a.push({range:`config!D${s}`,majorDimension:"ROWS",values:[[o]]})}}a.length>0&&await ht(()=>Ct("values:batchUpdate",{valueInputOption:"RAW",data:a})),r.length>0&&await xt("config",r),v(y,`writeConfigBatch complete — ${a.length/2} updated, ${r.length} appended`)}async function it(t,e=null){const o=e??(Ot[t]?`${t}!A:${Ot[t]}`:`${t}!A:ZZ`);m(y,`readTab: ${o}`);const r=((await _e(`values/${encodeURIComponent(o)}`)).values??[]).slice(1);return m(y,`readTab ${t} — ${r.length} data rows`),r}async function xt(t,e){e.length&&(m(y,`appendRows to ${t}`,{count:e.length}),await ht(()=>Ct(`values/${encodeURIComponent(t+"!A1")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,{values:e})))}async function Qe(t){m(y,`clearTab: ${t}`);const e=Ot[t];await Ct(`values/${encodeURIComponent(`${t}!A2:${e}`)}:clear`,{}),v(y,`clearTab: ${t} data rows cleared`)}async function Ze(t){if(!B||!t.length)return;const e=t.map(o=>[o.timestamp,o.level,o.category,o.message,o.details,o.session_id]);await xt("log",e)}async function to(){m(y,"Checking all tabs exist...");const t=await eo(),e=Object.keys(It),o=e.filter(s=>!t.includes(s));if(o.length>0){v(y,`Creating missing tabs: ${o.join(", ")}`);const s=o.map(l=>({addSheet:{properties:{title:l}}}));await ao({requests:s})}const a=e.filter(s=>It[s]),r=a.map(s=>`${s}!A1`);m(y,`batchGet to check existing headers for ${a.length} tabs`);const i=(await ht(()=>_e(`values:batchGet?${r.map(s=>`ranges=${encodeURIComponent(s)}`).join("&")}`),2)).valueRanges??[],d=a.map((s,l)=>{var p,u;const c=(u=(p=i[l])==null?void 0:p.values)==null?void 0:u[0];return c&&c.length>0?null:{range:`${s}!A1`,majorDimension:"ROWS",values:[It[s]]}}).filter(Boolean);d.length>0?(v(y,`Writing headers for ${d.length} tab(s) (skipped ${a.length-d.length} already-populated)`),await ht(()=>Ct("values:batchUpdate",{valueInputOption:"RAW",data:d}),2),v(y,"Tab headers written")):m(y,"All tab headers already present — skipping write")}async function eo(){return((await ro()).sheets??[]).map(e=>e.properties.title)}async function oo(){const t=await it("config"),e=new Set(t.map(a=>a[0])),o=Ge.filter(([a])=>!e.has(a));if(o.length===0){m(y,"Config defaults already present");return}v(y,`Seeding ${o.length} default config keys`),await xt("config",o)}const kt="https://sheets.googleapis.com/v4/spreadsheets",Xt=1e4;function $t(){return{Authorization:`Bearer ${qt}`,"Content-Type":"application/json"}}async function St(t,e={}){const o=new AbortController,a=setTimeout(()=>o.abort(),Xt);try{return await fetch(t,{...e,signal:o.signal})}catch(r){throw r.name==="AbortError"?new Error(`Sheets request timed out (${Xt/1e3}s)`):r}finally{clearTimeout(a)}}async function _e(t){const e=`${kt}/${B}/${t}`;m(y,`GET ${t}`);const o=await St(e,{headers:$t()});if(!o.ok){const a=await o.text();throw G(y,`GET ${t} failed ${o.status}`,a),(o.status===401||o.status===403)&&sessionStorage.removeItem("sth_auth"),new Error(`Sheets GET ${t}: ${o.status} ${a}`)}return o.json()}async function ro(){const t=`${kt}/${B}?fields=sheets.properties.title`,e=await St(t,{headers:$t()});if(!e.ok)throw new Error(`Sheets meta GET: ${e.status}`);return e.json()}async function Ct(t,e){const o=`${kt}/${B}/${t}`;m(y,`POST ${t}`);const a=await St(o,{method:"POST",headers:$t(),body:JSON.stringify(e)});if(!a.ok){const r=await a.text();throw G(y,`POST ${t} failed ${a.status}`,r),(a.status===401||a.status===403)&&sessionStorage.removeItem("sth_auth"),new Error(`Sheets POST ${t}: ${a.status} ${r}`)}return a.json()}async function ht(t,e=5){var a,r;let o=500;for(let n=1;n<=e;n++)try{return await t()}catch(i){if(!(((a=i.message)==null?void 0:a.includes("429"))||((r=i.message)==null?void 0:r.includes("RATE_LIMIT")))||n===e)throw i;w(y,`429 rate limit — retry ${n}/${e} in ${o}ms`),await new Promise(s=>setTimeout(s,o)),o=Math.min(o*2,3e4)}}async function ao(t){const e=`${kt}/${B}:batchUpdate`;m(y,"batchUpdate",t);const o=await St(e,{method:"POST",headers:$t(),body:JSON.stringify(t)});if(!o.ok){const a=await o.text();throw G(y,`batchUpdate failed ${o.status}`,a),new Error(`Sheets batchUpdate: ${o.status} ${a}`)}return o.json()}const Dt="CONFIG";let j={},we=!1,J=null;async function no(){return J||(m(Dt,"loadConfig()"),J=Ke().then(t=>(j=t,we=!0,J=null,v(Dt,`Config loaded — ${Object.keys(j).length} keys`),j)),J)}function Ft(){return j}function bt(t,e=""){return we?j[t]??e:e}async function et(t,e){m(Dt,`set(${t}, ${e})`),j[t]=e,await Je(t,e)}function so(){return{...j}}function Nt(){return{D:parseInt(bt("party_roster_d","213"))||213,R:parseInt(bt("party_roster_r","222"))||222}}const io={TER:{ticker:"TER",qty:.1597,price:286.42,mkt_val:45.74,cost_basis:15.48,avg_cost:96.93,gl_pct:195.48},GM:{ticker:"GM",qty:.7957,price:72.39,mkt_val:57.6,cost_basis:40.31,avg_cost:50.66,gl_pct:42.89},AMGN:{ticker:"AMGN",qty:.0596,price:366.21,mkt_val:21.83,cost_basis:15.69,avg_cost:263.26,gl_pct:39.13},NOC:{ticker:"NOC",qty:.1667,price:733.71,mkt_val:122.31,cost_basis:91.83,avg_cost:550.87,gl_pct:33.19},SCHW:{ticker:"SCHW",qty:5.0829,price:93.06,mkt_val:473.01,cost_basis:367.7,avg_cost:72.35,gl_pct:28.64},ABBV:{ticker:"ABBV",qty:.345,price:219.68,mkt_val:75.79,cost_basis:62.66,avg_cost:181.62,gl_pct:20.95},WBD:{ticker:"WBD",qty:.3333,price:27.14,mkt_val:9.05,cost_basis:7.5,avg_cost:22.5,gl_pct:20.67},LYV:{ticker:"LYV",qty:.1155,price:153.97,mkt_val:17.78,cost_basis:15,avg_cost:129.87,gl_pct:18.53},AAPL:{ticker:"AAPL",qty:.1487,price:250.12,mkt_val:37.19,cost_basis:32.6,avg_cost:219.24,gl_pct:14.08},GRMN:{ticker:"GRMN",qty:.0735,price:233.52,mkt_val:17.16,cost_basis:15.24,avg_cost:207.35,gl_pct:12.6},JOBY:{ticker:"JOBY",qty:17,price:9.7,mkt_val:164.9,cost_basis:148.24,avg_cost:8.72,gl_pct:11.24},TSLA:{ticker:"TSLA",qty:.0626,price:391.2,mkt_val:24.49,cost_basis:22.88,avg_cost:365.66,gl_pct:7.04},UBFO:{ticker:"UBFO",qty:4.2678,price:10.14,mkt_val:43.28,cost_basis:41.15,avg_cost:9.64,gl_pct:5.18},MU:{ticker:"MU",qty:.0242,price:426.13,mkt_val:10.31,cost_basis:9.97,avg_cost:411.98,gl_pct:3.41},NVDA:{ticker:"NVDA",qty:.2481,price:180.25,mkt_val:44.72,cost_basis:44.33,avg_cost:178.68,gl_pct:.88},LDOS:{ticker:"LDOS",qty:.1798,price:173.43,mkt_val:31.18,cost_basis:31.25,avg_cost:173.81,gl_pct:-.22},GOOGL:{ticker:"GOOGL",qty:.0706,price:302.28,mkt_val:21.34,cost_basis:21.4,avg_cost:303.12,gl_pct:-.28},MOH:{ticker:"MOH",qty:.143,price:149.2,mkt_val:21.34,cost_basis:21.42,avg_cost:149.79,gl_pct:-.37},HII:{ticker:"HII",qty:.0748,price:415.71,mkt_val:31.1,cost_basis:31.23,avg_cost:417.51,gl_pct:-.42},IBM:{ticker:"IBM",qty:.1258,price:246.28,mkt_val:30.98,cost_basis:31.23,avg_cost:248.25,gl_pct:-.8},GD:{ticker:"GD",qty:.0881,price:351.52,mkt_val:30.97,cost_basis:31.25,avg_cost:354.71,gl_pct:-.9},LMT:{ticker:"LMT",qty:.0478,price:646,mkt_val:30.88,cost_basis:31.2,avg_cost:652.72,gl_pct:-1.03},RTX:{ticker:"RTX",qty:.1505,price:204.52,mkt_val:30.78,cost_basis:31.24,avg_cost:207.62,gl_pct:-1.47},LHX:{ticker:"LHX",qty:.0854,price:358.96,mkt_val:30.66,cost_basis:31.23,avg_cost:365.69,gl_pct:-1.83},TXT:{ticker:"TXT",qty:.3367,price:91.05,mkt_val:30.66,cost_basis:31.25,avg_cost:92.82,gl_pct:-1.89},HON:{ticker:"HON",qty:.1302,price:234.5,mkt_val:30.53,cost_basis:31.23,avg_cost:239.86,gl_pct:-2.24},ON:{ticker:"ON",qty:.1669,price:58.55,mkt_val:9.77,cost_basis:10,avg_cost:59.92,gl_pct:-2.3},AXON:{ticker:"AXON",qty:.081,price:496.18,mkt_val:40.19,cost_basis:41.2,avg_cost:508.64,gl_pct:-2.45},BA:{ticker:"BA",qty:.145,price:209.89,mkt_val:30.43,cost_basis:31.23,avg_cost:215.38,gl_pct:-2.56},AMZN:{ticker:"AMZN",qty:.287,price:207.67,mkt_val:59.6,cost_basis:61.39,avg_cost:213.91,gl_pct:-2.92},TDG:{ticker:"TDG",qty:.0249,price:1214.66,mkt_val:30.25,cost_basis:31.16,avg_cost:1251.41,gl_pct:-2.92},PLTR:{ticker:"PLTR",qty:.3445,price:150.95,mkt_val:52,cost_basis:54.15,avg_cost:157.18,gl_pct:-3.97},HWM:{ticker:"HWM",qty:.1237,price:236.75,mkt_val:29.29,cost_basis:31.23,avg_cost:252.46,gl_pct:-6.21},VST:{ticker:"VST",qty:.1257,price:158.95,mkt_val:19.98,cost_basis:21.42,avg_cost:170.41,gl_pct:-6.72},GE:{ticker:"GE",qty:.0965,price:299.69,mkt_val:28.92,cost_basis:31.25,avg_cost:323.83,gl_pct:-7.46},MSFT:{ticker:"MSFT",qty:.0852,price:395.55,mkt_val:33.7,cost_basis:36.92,avg_cost:433.33,gl_pct:-8.72},META:{ticker:"META",qty:.0593,price:613.18,mkt_val:36.36,cost_basis:39.87,avg_cost:672.34,gl_pct:-8.8},ABT:{ticker:"ABT",qty:.6766,price:108.03,mkt_val:73.09,cost_basis:82.05,avg_cost:121.27,gl_pct:-10.92},LULU:{ticker:"LULU",qty:.1196,price:157.78,mkt_val:18.85,cost_basis:21.41,avg_cost:179.01,gl_pct:-11.96},QCOM:{ticker:"QCOM",qty:.0662,price:129.82,mkt_val:8.59,cost_basis:9.99,avg_cost:150.91,gl_pct:-14.01},DIS:{ticker:"DIS",qty:.4081,price:99.29,mkt_val:40.52,cost_basis:47.85,avg_cost:117.25,gl_pct:-15.32},NFLX:{ticker:"NFLX",qty:.353,price:95.31,mkt_val:33.64,cost_basis:39.84,avg_cost:112.86,gl_pct:-15.56},GLAD:{ticker:"GLAD",qty:.2486,price:17.51,mkt_val:4.35,cost_basis:7.3,avg_cost:29.37,gl_pct:-40.41},NOW:{ticker:"NOW",qty:.016,price:113.62,mkt_val:1.82,cost_basis:1.82,avg_cost:113.75,gl_pct:0},WDAY:{ticker:"WDAY",qty:.0659,price:133.09,mkt_val:8.77,cost_basis:15.41,avg_cost:233.84,gl_pct:-43.09},IAU:{ticker:"IAU",qty:2,price:94.38,mkt_val:188.76,cost_basis:166.5,avg_cost:83.25,gl_pct:13.37},QYLD:{ticker:"QYLD",qty:4.0762,price:17.45,mkt_val:71.13,cost_basis:72.08,avg_cost:17.68,gl_pct:-1.32}},lo={account:"Joint Tenant ...805"},R="POSITIONS_STORE";let C=null,H=!1,X=null,Z=0;function co(t){if(!t)return"";if(typeof t=="string"&&/^\d{4}-\d{2}-\d{2}/.test(t))return t.slice(0,10);const e=Number(t);return!isNaN(e)&&e>4e4&&e<6e4?new Date((e-25569)*86400*1e3).toISOString().slice(0,10):String(t).slice(0,10)}function Y(){const t={};for(const[e,o]of Object.entries(io)){const a=o.mkt_val??0,r=o.cost_basis??0,n=+(a-r).toFixed(2);t[e]={ticker:e,quantity:o.qty??0,avg_cost:o.avg_cost??0,mkt_value:a,gain_loss:n,gain_loss_pct:o.gl_pct??0,last_csv_upload:"",source:"mock"}}return t}function Ht(){return H&&C!==null?(m(R,"loadPositions() — already loaded, returning cached"),Promise.resolve(C)):X?(m(R,"loadPositions() — joining in-flight request"),X):(X=po().finally(()=>{X=null}),X)}async function po(){m(R,"_doLoadPositions()");const t=Z;if(!be())return w(R,"No spreadsheetId — using MOCK_POSITIONS"),Z===t&&(C=Y(),H=!0),C??Y();try{const e=await it("my_positions");if(Z!==t)return m(R,"_doLoadPositions() discarding stale fetch — setPositions() was called during load"),C;if(!e.length)return w(R,"my_positions tab is empty — using MOCK_POSITIONS"),C=Y(),H=!0,C;const o={};for(const a of e){const r=a[0];r&&(o[r]={ticker:r,quantity:parseFloat(a[1])||0,avg_cost:parseFloat(a[2])||0,mkt_value:parseFloat(a[3])||0,gain_loss:parseFloat(a[4])||0,gain_loss_pct:parseFloat(a[5])||0,last_csv_upload:co(a[6]),source:a[7]??""})}return C=o,H=!0,v(R,`Positions loaded — ${Object.keys(C).length} tickers`),C}catch(e){return w(R,`loadPositions failed (${e.message}) — using MOCK_POSITIONS`),Z===t&&(C=Y(),H=!0),C??Y()}}function lt(){return C===null?(m(R,"getPositions() called before loadPositions() — returning normalized MOCK_POSITIONS"),Y()):C}function xe(t){m(R,`setPositions() — ${Object.keys(t).length} tickers`),Z++,C=t,H=!0}function ke(){H=!1}function Bt(){const t=lt(),e=Object.values(t);let o=0,a=0,r=0,n="";for(const s of e)o+=s.mkt_value??0,a+=s.gain_loss??0,(s.ticker==="CASH"||s.ticker==="$")&&(r=s.mkt_value??0),!n&&s.last_csv_upload&&(n=s.last_csv_upload);const i=o-a,d=i!==0?a/i*100:0;return{account_total:+o.toFixed(2),total_gl:+a.toFixed(2),total_gl_pct:+d.toFixed(2),cash:+r.toFixed(2),position_count:e.filter(s=>s.ticker!=="CASH"&&s.ticker!=="$").length,last_csv_upload:n}}function uo(){return H}const mo=Object.freeze(Object.defineProperty({__proto__:null,getPositions:lt,getPositionsSummary:Bt,invalidatePositionsCache:ke,isLoaded:uo,loadPositions:Ht,setPositions:xe},Symbol.toStringTag,{value:"Module"})),T="CONGRESSIONAL_API",$e="congressional_cache",fo=60*60*1e3,Qt=1e4,vo=3e4,Zt=180,te="/Stock-Trader-Helper/congressional-trades.json";let Q=null;async function ct({forceRefresh:t=!1}={}){if(!t){const e=Ce();if(e)return m(T,`Cache hit — ${e.data.length} transactions, age ${Math.round((Date.now()-e.ts)/6e4)}m`),e.data}return Q?(m(T,"Congressional fetch already in flight — joining existing request"),Q):(Q=go().finally(()=>{Q=null}),Q)}function Se(t,e,{daysBack:o=30}={}){const a=new Set(e.map(n=>n.toLowerCase())),r=Date.now()-o*864e5;return t.filter(n=>!(!a.has(n.politician_name.toLowerCase())||n.transaction_ts<r))}function Ut(t,{config:e,partyRoster:o}){const a=parseFloat(e.consensus_tier1_pct||.08),r=parseFloat(e.consensus_tier2_pct||.12),n=parseFloat(e.consensus_tier3_pct||.18),i=parseInt(e.consensus_window_days||14),d=Date.now()-i*864e5;m(T,"computeConsensusSignals",{tier1:a,tier2:r,tier3:n,days:i});const s={};for(const c of t){if(c.transaction_ts<d)continue;const p=`${c.party}::${c.ticker}`;s[p]||(s[p]={traders:new Set,transactions:[]}),s[p].traders.add(c.politician_name),s[p].transactions.push(c)}const l=[];for(const[c,p]of Object.entries(s)){const[u,g]=c.split("::"),f=o[u]||1,_=p.traders.size/f;if(_<a)continue;const k=_>=n?3:_>=r?2:1;l.push({id:`sig_${Date.now()}_${Math.random().toString(36).slice(2)}`,signal_date:new Date().toISOString().slice(0,10),party:u,tickers:g,member_count:p.traders.size,party_total:f,pct_of_party:_,window_days:i,tier:k,notified:"N",ai_summary:"",created_at:new Date().toISOString()})}return v(T,`Computed ${l.length} consensus signals`),l.sort((c,p)=>p.pct_of_party-c.pct_of_party)}async function go(){var o,a;v(T,`Fetching congressional trades from ${te}`);const t=new AbortController,e=setTimeout(()=>t.abort(),Qt);try{const r=await fetch(te,{signal:t.signal});if(clearTimeout(e),!r.ok)throw new Error(`congressional-trades.json HTTP ${r.status}`);const n=await r.text();let i="unknown";try{const c=JSON.parse(n);i=c.generated_at||"unknown",v(T,"Raw API response received",{generated_at:i,trade_count:((o=c.trades)==null?void 0:o.length)??0,sample_tickers:(a=c.trades)==null?void 0:a.slice(0,3).map(p=>p.ticker)})}catch{}v(T,"Offloading JSON normalization to Web Worker...");const d=await new Promise((c,p)=>{const u=new Worker(new URL("/Stock-Trader-Helper/assets/congressional-parser.worker-JC6-ZyHM.js",import.meta.url),{type:"module"}),g=setTimeout(()=>{u.terminate(),p(new Error("Worker parse timeout"))},vo);u.onmessage=f=>{clearTimeout(g),u.terminate(),f.data.error?p(new Error(f.data.error)):c(f.data.trades)},u.onerror=f=>{clearTimeout(g),u.terminate(),p(new Error(f.message||"Worker error"))},u.postMessage(n)});v(T,`Worker returned ${d.length} normalized records — trimming to ${Zt} days`);const s=Date.now()-Zt*864e5,l=d.filter(c=>c.transaction_ts>=s);v(T,`Congressional trades ready — ${l.length} records cached`),yo(l);try{const c=l.reduce((p,u)=>u.transaction_date>p?u.transaction_date:p,"");await Promise.all([et("congressional_last_fetch",new Date().toISOString()),et("congressional_last_response_date",c),et("congressional_last_record_count",String(l.length))]),m(T,"Fetch metadata written to config",{mostRecentDate:c,count:l.length})}catch(c){w(T,"Config metadata write failed — data still cached",c.message)}return l}catch(r){clearTimeout(e);const n=r.name==="AbortError"?`Congressional trades fetch timed out after ${Qt/1e3}s`:r.message;console.error("[CONGRESSIONAL_API] fetch failed:",n),G(T,"Congressional fetch failed",n);const i=Ce({ignoreExpiry:!0});if(i)return w(T,`Falling back to stale cache (${Math.round((Date.now()-i.ts)/36e5)}h old)`),i.data;throw new Error(n)}}function Ce({ignoreExpiry:t=!1}={}){try{const e=localStorage.getItem($e);if(!e)return null;const o=JSON.parse(e);return!t&&Date.now()-o.ts>fo?null:o}catch{return null}}function yo(t){try{localStorage.setItem($e,JSON.stringify({ts:Date.now(),data:t}))}catch(e){w(T,"Cache write failed (quota exceeded?) — data not cached",e.message)}}const Te=[{id:"pelosi_n",name:"Nancy Pelosi",party:"D",chamber:"House",state:"CA",mirror:"Y",tier:1,category:"named",active:"Y",notes:"Historically high-conviction tech trades"},{id:"johnson_m",name:"Mike Johnson",party:"R",chamber:"House",state:"LA",mirror:"Y",tier:1,category:"named",active:"Y",notes:"Speaker; Gang of 8"},{id:"schumer_c",name:"Chuck Schumer",party:"D",chamber:"Senate",state:"NY",mirror:"Y",tier:1,category:"named",active:"Y",notes:"Senate Majority Leader; Gang of 8"},{id:"jefferies_h",name:"Hakeem Jefferies",party:"D",chamber:"House",state:"NY",mirror:"Y",tier:1,category:"named",active:"Y",notes:"House Minority Leader; Gang of 8"},{id:"warner_m",name:"Mark Warner",party:"D",chamber:"Senate",state:"VA",mirror:"Y",tier:1,category:"gang8",active:"Y",notes:"Senate Intel Committee Chair"},{id:"cotton_t",name:"Tom Cotton",party:"R",chamber:"Senate",state:"AR",mirror:"Y",tier:1,category:"gang8",active:"Y",notes:"Senate Intel Ranking Member"},{id:"turner_m",name:"Mike Turner",party:"R",chamber:"House",state:"OH",mirror:"Y",tier:1,category:"gang8",active:"Y",notes:"House Intel Committee Chair"},{id:"himes_j",name:"Jim Himes",party:"D",chamber:"House",state:"CT",mirror:"Y",tier:1,category:"gang8",active:"Y",notes:"House Intel Ranking Member"},{id:"mcconnell_m",name:"Mitch McConnell",party:"R",chamber:"Senate",state:"KY",mirror:"Y",tier:1,category:"gang8",active:"Y",notes:"Senate Minority Leader; Gang of 8"},{id:"tuberville_t",name:"Tommy Tuberville",party:"R",chamber:"Senate",state:"AL",mirror:"Y",tier:1,category:"auto",active:"Y",notes:"Most prolific Senate trader; energy & defense heavy"},{id:"gottheimer_j",name:"Josh Gottheimer",party:"D",chamber:"House",state:"NJ",mirror:"Y",tier:1,category:"auto",active:"Y",notes:"100+ trades/yr; tech-sector focus; pre-AI-boom pattern"},{id:"khanna_r",name:"Ro Khanna",party:"D",chamber:"House",state:"CA",mirror:"Y",tier:1,category:"auto",active:"Y",notes:"Silicon Valley seat; semiconductor trades ahead of CHIPS Act"},{id:"mccaul_m",name:"Michael McCaul",party:"R",chamber:"House",state:"TX",mirror:"Y",tier:1,category:"auto",active:"Y",notes:"Consistent tech/defense gains; long-tenure pattern"},{id:"greene_m",name:"Marjorie Taylor Greene",party:"R",chamber:"House",state:"GA",mirror:"Y",tier:1,category:"auto",active:"Y",notes:"High-volume disclosure filer; aggressive buyer"}];function ho(){const t=lt(),e=Object.values(t);return e.length?e.every(o=>o.source==="mock"):!0}function bo(){const t=new Date().getHours();return t<12?"Good morning":t<17?"Good afternoon":"Good evening"}function _o(){return new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}function wo(t){return t>=1e6?`$${(t/1e6).toFixed(2)}M`:t>=1e3?`$${(t/1e3).toFixed(1)}k`:`$${t.toFixed(0)}`}function xo(t){if(!t)return"unknown";const e=new Date(t+"T12:00:00");if(isNaN(e))return"unknown";const o=Math.floor((Date.now()-e)/864e5);return o===0?"today":o===1?"yesterday":`${o}d ago`}async function ko(t,e){const o="background:linear-gradient(90deg,var(--bg-raised) 25%,var(--bg-elevated) 50%,var(--bg-raised) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;";t.innerHTML=`
    <div class="home-wrapper">
      <div class="home-greet-block">
        <div style="height:20px;width:140px;border-radius:var(--r2);${o}"></div>
        <div style="height:14px;width:100px;border-radius:var(--r2);margin-top:var(--s2);${o}"></div>
      </div>
      <div class="home-cards">
        ${Array(4).fill("").map(()=>`
          <div class="home-card" style="pointer-events:none;">
            <div style="height:14px;width:60%;border-radius:var(--r2);${o}"></div>
            <div style="height:20px;width:40%;border-radius:var(--r2);margin-top:var(--s3);${o}"></div>
            <div style="height:12px;width:75%;border-radius:var(--r2);margin-top:var(--s2);${o}"></div>
          </div>
        `).join("")}
      </div>
    </div>
  `;let a={newCount:0,topTrade:null},r=null;try{const[,h]=await Promise.all([Ht().catch(()=>null),ct()]);if(e!=null&&e.aborted)return;const b=Te.filter($=>$.active==="Y").map($=>$.name),q=Se(h,b,{daysBack:90});if(a.newCount=q.length,q.length>0){const $=q[0];a.topTrade={politician:$.politician_name,ticker:$.ticker,action:$.action,when:xo($.transaction_date)}}const P=Nt(),Yt=Ut(h,{config:{...Ft(),consensus_window_days:30},partyRoster:P});if(Yt.length>0){const $={};for(const A of Yt){const S=A.tickers;$[S]||($[S]={ticker:S,parties:new Set,memberCount:0,tier:0,maxPct:0}),$[S].parties.add(A.party),$[S].memberCount+=A.member_count,$[S].tier=Math.max($[S].tier,A.tier),$[S].maxPct=Math.max($[S].maxPct,A.pct_of_party)}const Kt=Object.values($).sort((A,S)=>S.memberCount-A.memberCount||S.tier-A.tier);if(Kt.length>0){const A=Kt[0],S=Array.from(A.parties).sort(),Mt=S.length>1?"R + D":S[0],Ne=Mt==="R + D"?"of party":Mt==="D"?"of Dems":"of Reps";r={ticker:A.ticker,tier:A.tier,flags:Mt,stat:`${Math.round(A.maxPct*100)}% ${Ne} buying · last 30 days`}}}}catch{}const n=(()=>{try{return JSON.parse(localStorage.getItem("sth_trade_decisions")||"{}")}catch{return{}}})(),i=Object.values(n).filter(h=>h==="followed").length,d=Bt(),s=ho(),l=d.account_total||0,c=d.total_gl_pct||0,p=d.position_count||0,u=d.last_csv_upload,g=u?new Date(u+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}):null,f=c>=0?"+":"",_=c>=0?"var(--buy)":"var(--sell)",{newCount:k,topTrade:x}=a,W=(r==null?void 0:r.ticker)??"—",O=(r==null?void 0:r.tier)??0,V=(r==null?void 0:r.flags)??"",Vt=(r==null?void 0:r.stat)??"Loading signal data…",Et=O>=3?"tier-bright":O===2?"tier-accent":"tier-subtle";t.innerHTML=`
    <div class="home-wrapper">
      <div class="home-greet-block">
        <div class="home-greeting">${bo()}</div>
        <div class="home-date">${_o()}</div>
      </div>

      <div class="home-cards">

        <!-- What's New -->
        <button class="home-card" onclick="window._navigate('feed')">
          <div class="home-card-header">
            <span class="home-card-title">
              What's New
              ${k>0?'<span class="new-badge"></span>':""}
            </span>
            <span class="home-card-chevron">›</span>
          </div>
          <div class="home-card-value">${k} trade${k!==1?"s":""} since your last visit</div>
          ${x?`<div class="home-card-sub">${x.politician} · ${x.ticker} · ${x.action} · ${x.when}</div>`:'<div class="home-card-sub" style="color:var(--text-tertiary);">No recent trades on watchlist</div>'}
        </button>

        <!-- Top Signal -->
        <button class="home-card" onclick="window._navigate('topSignal')">
          <div class="home-card-header">
            <span class="home-card-title">Top Signal</span>
            <span class="home-card-chevron">›</span>
          </div>
          ${r?`
          <div class="home-card-value">
            <span style="font-family:var(--font-mono);font-weight:700;">${W}</span>
            <span class="tier-badge ${Et}">Tier ${O}</span>
            <span style="color:var(--text-secondary);">· ${V}</span>
          </div>
          <div class="home-card-sub">${Vt} · stocks by member activity</div>
          `:`
          <div class="home-card-value" style="font-size:15px;color:var(--text-secondary);">—</div>
          <div class="home-card-sub" style="color:var(--text-tertiary);">No signals in last 30 days</div>
          `}
        </button>

        <!-- My Portfolio -->
        <button class="home-card" onclick="window._navigate('positions')">
          <div class="home-card-header">
            <span class="home-card-title">My Portfolio</span>
            <span class="home-card-chevron">›</span>
          </div>
          ${l>0?`
          <div class="home-card-value">
            <span style="font-weight:700;">${wo(l)}</span>
            <span style="color:${_};font-size:14px;margin-left:6px;">${f}${c.toFixed(1)}%</span>
            ${s?'<span style="font-size:11px;color:var(--text-tertiary);margin-left:6px;">sample data</span>':""}
          </div>
          <div class="home-card-sub">${p} positions</div>
          <div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">
            ${g?`Updated ${g}`:"No data uploaded"}
          </div>
          `:`
          <div class="home-card-value" style="font-size:15px;color:var(--text-secondary);">—</div>
          <div class="home-card-sub" style="color:var(--text-tertiary);">Upload CSV to see your real portfolio</div>
          `}
        </button>

        <!-- What to Buy -->
        <button class="home-card" onclick="window._navigate('whatToBuy')">
          <div class="home-card-header">
            <span class="home-card-title">What to Buy</span>
            <span class="home-card-chevron">›</span>
          </div>
          <div class="home-card-value">Ready to invest?</div>
          <div class="home-card-sub">Enter an amount to get slice picks</div>
        </button>

        <!-- My Decisions -->
        <button class="home-card" onclick="window._navigate('decisionsHistory')">
          <div class="home-card-header">
            <span class="home-card-title">My Decisions</span>
            <span class="home-card-chevron">›</span>
          </div>
          <div class="home-card-value">${i} followed</div>
          <div class="home-card-sub">Your trade follow history</div>
        </button>

      </div>
    </div>
  `}function I(t,e=3e3){const o=document.getElementById("toast-container");if(!o)return;const r=typeof e=="string"?e==="error"?6e3:3e3:e,n=document.createElement("div");n.className="toast",e==="error"&&n.classList.add("toast-error"),e==="success"&&n.classList.add("toast-success"),n.textContent=t,o.appendChild(n),setTimeout(()=>{n.classList.add("leaving"),n.addEventListener("animationend",()=>n.remove(),{once:!0}),setTimeout(()=>n.remove(),600)},r)}const F="FEED_VIEW";let mt=null,U=5,Rt=[],tt=!1;const $o=[{id:"1",politician_name:"Nancy Pelosi",party:"D",ticker:"NVDA",action:"buy",amount_low:250001,amount_high:5e5,transaction_date:"2026-03-11",disclosed_date:"2026-03-13"},{id:"2",politician_name:"Dan Crenshaw",party:"R",ticker:"MSFT",action:"buy",amount_low:15001,amount_high:5e4,transaction_date:"2026-03-10",disclosed_date:"2026-03-12"},{id:"3",politician_name:"Ro Khanna",party:"D",ticker:"AAPL",action:"sell",amount_low:50001,amount_high:1e5,transaction_date:"2026-03-08",disclosed_date:"2026-03-11"},{id:"4",politician_name:"Tommy Tuberville",party:"R",ticker:"AMD",action:"buy",amount_low:100001,amount_high:25e4,transaction_date:"2026-03-07",disclosed_date:"2026-03-10"},{id:"5",politician_name:"Nancy Pelosi",party:"D",ticker:"TSM",action:"buy",amount_low:500001,amount_high:1e6,transaction_date:"2026-03-05",disclosed_date:"2026-03-09"}],So={1:"Pelosi has traded NVDA 3x in the past 6 months. This buy follows recent AI chip export policy discussions. The timing aligns closely with committee briefings on semiconductor regulation. Insider timing pattern.",2:"Crenshaw added MSFT ahead of a defense cloud contract renewal cycle. Microsoft holds several Pentagon contracts. Relatively modest position — could be routine portfolio rebalancing.",3:"Khanna trimmed AAPL after publicly raising antitrust concerns about Big Tech. The sell reduces potential conflict-of-interest optics ahead of upcoming tech hearings.",4:"Tuberville entered AMD during a period of increased GPU demand discourse in Congress. AMD has benefited from NVDA export restrictions. Agriculture committee member, limited direct oversight.",5:"Pelosi made her largest TSM position in over a year. Taiwan Semiconductor is a focal point in US chip supply chain legislation. This trade preceded key CHIPS Act implementation discussions."};function Co(t){if(!t)return"unknown date";const e=new Date(t);if(isNaN(e.getTime()))return"unknown date";const o=Math.floor((Date.now()-e.getTime())/864e5);return o===0?"today":o===1?"yesterday":`${o} days ago`}function To(t,e){const o=a=>a>=1e6?`$${(a/1e6).toFixed(0)}M`:`$${(a/1e3).toFixed(0)}k`;return`${o(t)}–${o(e)}`}function ee(t){return new Date(t+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}function Ao(t){return`<span style="display:inline-flex;align-items:center;padding:1px 7px;border-radius:100px;font-size:11px;font-weight:600;letter-spacing:0.04em;border:1px solid;${{D:"color:#6b9bd2;background:rgba(107,155,210,0.14);border-color:rgba(107,155,210,0.25)",R:"color:#c47b6e;background:rgba(196,123,110,0.14);border-color:rgba(196,123,110,0.25)"}[t]||"color:var(--text-tertiary);background:var(--bg-elevated);border-color:var(--border-soft)"}">${t||"U"}</span>`}function Ae(t){const e=t.action==="buy"?"var(--buy)":"var(--sell)",o=t.action.toUpperCase(),a=To(t.amount_low,t.amount_high),r=Co(t.transaction_date),n=ee(t.disclosed_date),i=ee(t.transaction_date),d=So[t.id]||"No summary available.";return`
<div class="card trade-card"
     data-trade-id="${t.id}"
     style="cursor:pointer;transition:opacity 300ms ease,max-height 300ms ease,margin 300ms ease,padding 300ms ease;overflow:hidden;">

  <!-- Collapsed body — always visible -->
  <div class="trade-card-body" data-expand-target="${t.id}">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--s3);">
      <div style="display:flex;align-items:center;gap:var(--s2);flex-wrap:wrap;min-width:0;">
        ${Ao(t.party)}
        <span style="font-size:14px;font-weight:500;color:var(--text-primary);white-space:nowrap;">${t.politician_name}</span>
      </div>
      <span style="font-size:12px;color:var(--text-tertiary);white-space:nowrap;flex-shrink:0;">${r}</span>
    </div>

    <div style="display:flex;align-items:baseline;gap:var(--s3);margin-top:var(--s2);">
      <span style="font-family:var(--font-mono);font-size:18px;font-weight:700;color:var(--text-primary);letter-spacing:-0.01em;">${t.ticker}</span>
      <span style="font-size:13px;font-weight:600;color:${e};">${o}</span>
      <span style="font-size:13px;color:var(--text-secondary);">${a}</span>
    </div>
  </div>

  <!-- Expanded section — hidden by default -->
  <div class="trade-card-expanded" data-expanded-id="${t.id}"
       style="display:none;margin-top:var(--s4);">
    <div style="
      background:var(--bg-elevated);
      border:1px solid var(--border-subtle);
      border-radius:var(--r2);
      padding:var(--s3) var(--s4);
      font-size:13px;
      color:var(--text-secondary);
      line-height:1.65;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.09em;color:var(--text-tertiary);margin-bottom:var(--s2);font-weight:600;">AI Summary</div>
      ${d}
    </div>
    <div style="margin-top:var(--s3);font-size:12px;color:var(--text-tertiary);">
      Disclosed: ${n} &nbsp;·&nbsp; Traded: ${i}
    </div>
  </div>

  <!-- Action buttons -->
  <div class="decision-row" style="margin-top:var(--s4);">
    <button class="btn trade-follow-btn"
            data-action="follow"
            data-trade-id="${t.id}"
            style="background:rgba(127,184,131,0.12);color:var(--buy);border:1px solid rgba(127,184,131,0.2);">
      Follow
    </button>
    <button class="btn btn-ghost trade-ignore-btn"
            data-action="ignore"
            data-trade-id="${t.id}">
      Ignore
    </button>
  </div>
</div>
`}const Ee="sth_trade_decisions";function Me(){try{return JSON.parse(localStorage.getItem(Ee)||"{}")}catch{return{}}}function _t(t,e){const o=Me();o[t]=e,localStorage.setItem(Ee,JSON.stringify(o))}function Eo(){const t=`background: linear-gradient(90deg, var(--bg-raised) 25%, var(--bg-elevated) 50%, var(--bg-raised) 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;`;return`
    <div style="margin-bottom:var(--s5);">
      <div style="font-size:18px;font-weight:600;color:var(--text-primary);letter-spacing:-0.01em;">Recent Trades</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:var(--s1);">Loading congressional trades…</div>
    </div>
    ${Array(6).fill("").map(()=>`
      <div class="card" style="padding:var(--s4);">
        <div style="height:18px;width:65%;border-radius:var(--r2);${t}"></div>
        <div style="height:14px;width:45%;border-radius:var(--r2);margin-top:var(--s2);${t}"></div>
        <div style="height:13px;width:55%;border-radius:var(--r2);margin-top:var(--s2);${t}"></div>
      </div>
    `).join("")}
  `}async function jt(t,e,{forceRefresh:o=!1}={}){t.innerHTML=Eo();let a=$o,r=!1,n=null;try{m(F,`Fetching congressional transactions (forceRefresh=${o})`);const f=await ct({forceRefresh:o});m(F,`Congressional API returned ${f.length} transactions`);let _=Te.filter(x=>x.active==="Y").map(x=>x.name);try{const W=(await it("watchlist")).filter(O=>{var V;return((V=O[8])==null?void 0:V.toUpperCase())==="Y"}).map(O=>O[1]).filter(Boolean);W.length>0?(_=W,m(F,`Watchlist from Sheets: ${_.length} active members`)):m(F,`Sheets watchlist empty — using seed (${_.length} members)`)}catch(x){w(F,`Watchlist load failed: ${x.message} — using seed watchlist`)}const k=Se(f,_,{daysBack:180});m(F,`Filtered to ${k.length} trades in last 180 days`),k.length===0?(w(F,"No trades found for watchlist in past 30 days — using mock"),r=!0):a=k}catch(f){n=f.message,w(F,`Congressional fetch failed: ${f.message} — using mock data`),console.error("[FEED_VIEW] fetch failed:",f.message),I("Could not load live trades — showing sample data","error"),r=!0}if(e!=null&&e.aborted||!t.isConnected)return;const i=Me(),d=a.filter(f=>i[f.id]!=="ignored");U=5,Rt=d,tt=!1;const s=d.length,l=bt("congressional_last_fetch",""),c=l?` · updated ${Ie(Date.now()-new Date(l).getTime())} ago`:"",p=r?"Sample data — connect Google to load live trades":`${s} disclosure${s!==1?"s":""} · last 6 months${c}`,u='<button id="feed-refresh-btn" class="btn btn-ghost" style="font-size:11px;padding:2px 10px;margin-top:var(--s2);">↺ Refresh</button>';if(d.length===0){t.innerHTML=`
      <div style="margin-bottom:var(--s5);">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:18px;font-weight:600;color:var(--text-primary);letter-spacing:-0.01em;">Recent Trades</div>
          ${u}
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:var(--s1);">${p}</div>
      </div>
      <div style="padding:var(--s6) var(--s4);text-align:center;color:var(--text-tertiary);font-size:13px;line-height:1.6;">
        No recent disclosures found for your watchlist.<br>
        <span style="font-size:12px;">All trades may have been dismissed, or your watchlist may be empty.</span>
      </div>
    `,oe(t,e);return}const g=d.slice(0,U);t.innerHTML=`
    <div style="margin-bottom:var(--s5);">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:18px;font-weight:600;color:var(--text-primary);letter-spacing:-0.01em;">Recent Trades</div>
        ${u}
      </div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:var(--s1);">${p}</div>
      ${r?`<div style="font-size:11px;color:var(--accent);margin-top:4px;">Using sample data${n?` · ${n.slice(0,80)}`:""}</div>`:""}
    </div>
    <div id="feed-cards">${g.map(Ae).join("")}</div>
    ${Mo(d.length)}
  `,g.forEach(f=>{i[f.id]==="followed"&&Tt(t,f.id)}),Do(t,d,i,e),oe(t,e),Io(t,i,e)}function Mo(t){const e=t-U;return e<=0?"":`<button id="feed-show-more" class="btn btn-ghost"
    style="width:100%;margin-top:var(--s3);font-size:13px;">
    Show more (${e} remaining)
  </button>`}function Io(t,e,o){const a=t.querySelector("#feed-show-more");a&&a.addEventListener("click",()=>{if(tt)return;tt=!0;const r=t.querySelector("#feed-cards");if(!r){tt=!1;return}const n=Rt.slice(U,U+5);U+=n.length;const i=document.createDocumentFragment();n.forEach(s=>{const l=document.createElement("div");l.innerHTML=Ae(s);const c=l.firstElementChild;i.appendChild(c)}),r.appendChild(i),n.forEach(s=>{e[s.id]==="followed"&&Tt(t,s.id)}),Lo(t,n,e,o);const d=Rt.length-U;d<=0?a.remove():a.textContent=`Show more (${d} remaining)`,tt=!1},o?{signal:o}:{})}function Lo(t,e,o,a){const r=new Map(Object.entries(o)),n=a?{signal:a}:{};e.forEach(i=>{const d=t.querySelector(`.trade-follow-btn[data-trade-id="${i.id}"]`);d&&d.addEventListener("click",l=>{l.stopPropagation();const c=d.dataset.tradeId;r.get(c)!=="followed"&&(r.set(c,"followed"),_t(c,"followed"),Tt(t,c))},n);const s=t.querySelector(`.trade-ignore-btn[data-trade-id="${i.id}"]`);s&&s.addEventListener("click",l=>{l.stopPropagation();const c=s.dataset.tradeId;if(r.get(c)==="ignored")return;r.set(c,"ignored"),_t(c,"ignored");const p=t.querySelector(`.trade-card[data-trade-id="${c}"]`);if(!p)return;p.style.transition="opacity 300ms ease, max-height 300ms ease, margin-top 300ms ease, padding 300ms ease",p.style.opacity="0",p.style.maxHeight=p.getBoundingClientRect().height+"px",p.offsetHeight;const u=requestAnimationFrame(()=>{p.style.maxHeight="0",p.style.marginTop="0",p.style.paddingTop="0",p.style.paddingBottom="0",p.style.overflow="hidden"}),g=setTimeout(()=>{p.parentElement&&p.remove()},320);a==null||a.addEventListener("abort",()=>{cancelAnimationFrame(u),clearTimeout(g)},{once:!0})},n)})}function Ie(t){const e=t/36e5;if(e<1)return"< 1h";if(e<24)return`${Math.floor(e)}h`;const o=Math.floor(e/24);return`${o} day${o!==1?"s":""}`}function Oo(t,e,o){const a=document.getElementById("feed-refresh-modal");a&&a.remove();const r=document.createElement("div");r.id="feed-refresh-modal",r.style.cssText="position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;justify-content:center;padding:var(--s4);",r.innerHTML=`
    <div style="background:var(--bg-raised);border:1px solid var(--border-soft);border-radius:var(--r3);padding:var(--s5);width:100%;max-width:420px;">
      <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:var(--s2);">Data refreshed ${o} ago</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:var(--s5);line-height:1.5;">Fetching again uses your network quota. Refresh anyway?</div>
      <div style="display:flex;gap:var(--s3);">
        <button id="feed-modal-cancel" class="btn btn-ghost" style="flex:1;">Cancel</button>
        <button id="feed-modal-confirm" class="btn" style="flex:1;background:var(--accent);color:#fff;border:none;">Yes, Refresh</button>
      </div>
    </div>
  `,document.body.appendChild(r);const n=e?{signal:e}:{},i=()=>r.remove();r.addEventListener("click",d=>{d.target===r&&i()},n),r.querySelector("#feed-modal-cancel").addEventListener("click",i,n),r.querySelector("#feed-modal-confirm").addEventListener("click",()=>{i(),mt=Date.now();const d=t.querySelector("#feed-refresh-btn");d&&(d.textContent="↺ Refreshing…",d.disabled=!0),jt(t,e,{forceRefresh:!0})},n),e==null||e.addEventListener("abort",i,{once:!0})}function oe(t,e){const o=t.querySelector("#feed-refresh-btn");o&&o.addEventListener("click",()=>{const a=mt?Date.now()-mt:1/0;a<864e5?Oo(t,e,Ie(a)):(mt=Date.now(),o.textContent="↺ Refreshing…",o.disabled=!0,jt(t,e,{forceRefresh:!0}))},e?{signal:e}:{})}function Tt(t,e){const o=t.querySelector(`.trade-follow-btn[data-trade-id="${e}"]`);o&&(o.textContent="✓ Follow",o.style.background="rgba(127,184,131,0.22)",o.style.color="var(--buy)",o.style.borderColor="rgba(127,184,131,0.4)");const a=t.querySelector(`.trade-card[data-trade-id="${e}"]`);a&&(a.style.borderLeftWidth="3px",a.style.borderLeftColor="var(--buy)")}function Do(t,e,o,a){const r=new Map(Object.entries(o)),n=a?{signal:a}:{};t.querySelectorAll(".trade-follow-btn").forEach(i=>{i.addEventListener("click",d=>{d.stopPropagation();const s=i.dataset.tradeId;e.find(c=>c.id===s)&&r.get(s)!=="followed"&&(r.set(s,"followed"),_t(s,"followed"),Tt(t,s))},n)}),t.querySelectorAll(".trade-ignore-btn").forEach(i=>{i.addEventListener("click",d=>{d.stopPropagation();const s=i.dataset.tradeId;if(!e.find(g=>g.id===s)||r.get(s)==="ignored")return;r.set(s,"ignored"),_t(s,"ignored");const c=t.querySelector(`.trade-card[data-trade-id="${s}"]`);if(!c)return;c.style.transition="opacity 300ms ease, max-height 300ms ease, margin-top 300ms ease, padding 300ms ease",c.style.opacity="0",c.style.maxHeight=c.getBoundingClientRect().height+"px",c.offsetHeight;const p=requestAnimationFrame(()=>{c.style.maxHeight="0",c.style.marginTop="0",c.style.paddingTop="0",c.style.paddingBottom="0",c.style.overflow="hidden"}),u=setTimeout(()=>{c.parentElement&&c.remove()},320);a==null||a.addEventListener("abort",()=>{cancelAnimationFrame(p),clearTimeout(u)},{once:!0})},n)}),t.addEventListener("click",i=>{const d=i.target.closest("[data-expand-target]");if(!d)return;const s=d.dataset.expandTarget,l=t.querySelector(`.trade-card[data-trade-id="${s}"]`),c=t.querySelector(`[data-expanded-id="${s}"]`);if(!l||!c)return;l.dataset.expanded==="true"?(c.style.display="none",l.dataset.expanded="false"):(c.style.display="block",l.dataset.expanded="true")},n)}const z="SCHWAB_PARSER",re={"33813J106":"IAU","46435G103":"IVV","78462F103":"SPY","46090E103":"QQQ","81369Y605":"GLD","36467W109":"GDX","46137V357":"IJR",464287655:"IWM","78468R103":"QYLD"};function Le(t){return t&&(/^[A-Z0-9]{9}$/.test(t)&&re[t]?re[t]:t)}const Ro=new Set(["buy","sell","reinvest sha","reinvest shares","qual div reir","qualified dividend reinvestment","reinvest dividend","stock split"]);function zo(t){t=t.replace(/^\uFEFF/,""),m(z,"parseTransactionsCsv — parsing CSV");const e=t.trim().split(`
`).map(n=>n.trim()).filter(Boolean);if(e.length<2)throw new Error("CSV appears empty or has no data rows");const o=e.findIndex(n=>/^date,action,symbol/i.test(n.replace(/"/g,"")));if(o===-1)throw new Error("Could not find header row (Date,Action,Symbol,...)");const a=e.slice(o+1);m(z,`Found ${a.length} data rows`);const r=[];for(const n of a)try{const i=Fo(n);i&&r.push(i)}catch(i){w(z,`Skipped unparseable line: ${n.slice(0,60)}`,i.message)}return v(z,`Parsed ${r.length} transactions from CSV`),r._txCount=r.length,r}function Po(t){m(z,`derivePositions from ${t.length} transactions`);const e={};for(const a of t){if(!Ro.has(a.action_normalized)||!a.symbol)continue;const r=a.symbol.toUpperCase();e[r]||(e[r]={ticker:r,quantity:0,cost_basis:0,tx_count:0});const n=a.action_normalized==="stock split",i=a.action_normalized==="sell"?-a.quantity:a.quantity;e[r].quantity+=i,n||(e[r].cost_basis+=a.amount_abs),e[r].tx_count+=1}const o={};for(const[a,r]of Object.entries(e))Math.abs(r.quantity)<.001||(o[a]={ticker:a,quantity:Math.round(r.quantity*1e4)/1e4,avg_cost:r.quantity>0?Math.round(r.cost_basis/r.quantity*100)/100:0,mkt_value:0,gain_loss:0,gain_loss_pct:0,last_csv_upload:new Date().toISOString().slice(0,10),source:"schwab_csv"});return v(z,`Derived ${Object.keys(o).length} positions`),o}function qo(t){t=t.replace(/^\uFEFF/,""),m(z,"parsePositionsCsv");const e=t.trim().split(`
`).map(s=>s.trim()).filter(Boolean),o=e.findIndex(s=>/symbol/i.test(s)&&/quantity/i.test(s));if(o===-1)throw new Error("Could not find positions header row");const a=ft(e[o]).map(s=>s.replace(/"/g,"").toLowerCase().replace(/[^a-z0-9]/g,"_")),r=ft(e[o]).map(s=>s.replace(/"/g,"").toLowerCase()),n={symbol:a.findIndex(s=>s==="symbol"),quantity:a.findIndex(s=>s.includes("qty")||s.includes("quantity")),price:a.findIndex(s=>s==="price"),mkt_value:a.findIndex(s=>s.includes("market_value")||s.includes("mkt_value")||s.includes("value")&&!s.includes("day")),avg_cost_direct:a.findIndex(s=>s.includes("average_cost")||s.includes("cost_basis_per_share")||s.includes("avg_cost")),cost_basis_total:a.findIndex(s=>s==="cost_basis"),gain_loss:r.findIndex(s=>(s.includes("gain")||s.includes("unrealized"))&&s.includes("$")&&!s.includes("%")),gl_pct:r.findIndex(s=>(s.includes("gain")||s.includes("unrealized"))&&s.includes("%")&&!s.includes("$"))};m(z,"colIdx map",JSON.stringify(n));const i=e.slice(o+1),d={};for(const s of i)try{const l=ft(s);if(l.length<3)continue;const c=Le((n.symbol>=0?l[n.symbol]:"").replace(/"/g,"").trim().toUpperCase());if(!c||c.startsWith("ACCOUNT"))continue;if(c.startsWith("CASH")||c==="$"){const k=D(n.mkt_value>=0?l[n.mkt_value]:"0");d.CASH={ticker:"CASH",quantity:0,avg_cost:0,mkt_value:k,gain_loss:0,gain_loss_pct:0,last_csv_upload:new Date().toISOString().slice(0,10),source:"schwab_csv"};continue}const p=D(n.quantity>=0?l[n.quantity]:"0"),u=D(n.mkt_value>=0?l[n.mkt_value]:"0"),g=D(n.gain_loss>=0?l[n.gain_loss]:"0"),f=D(n.gl_pct>=0?l[n.gl_pct]:"0");let _=0;if(n.avg_cost_direct>=0)_=D(l[n.avg_cost_direct]);else if(n.cost_basis_total>=0){const k=D(l[n.cost_basis_total]);_=p>0?Math.round(k/p*100)/100:0}d[c]={ticker:c,quantity:p,avg_cost:_,mkt_value:u,gain_loss:g,gain_loss_pct:f,last_csv_upload:new Date().toISOString().slice(0,10),source:"schwab_csv"}}catch(l){w(z,`Positions parse error on line: ${s.slice(0,60)}`,l.message)}return v(z,`Parsed ${Object.keys(d).length} positions from positions CSV`),d}function Fo(t){var c,p,u,g;const e=ft(t);if(e.length<4)return null;const o=(c=e[0])==null?void 0:c.trim(),a=(p=e[1])==null?void 0:p.trim(),r=Le(((u=e[2])==null?void 0:u.trim().toUpperCase())||""),n=(g=e[3])==null?void 0:g.trim(),i=D(e[4]||"0"),d=D(e[5]||"0"),s=D(e[6]||"0"),l=No(e[7]||"0");return!o||!a?null:{date:o,action_raw:a,action_normalized:a.toLowerCase().trim(),symbol:r,description:n,quantity:Math.abs(i),price:d,fees:Math.abs(s),amount:l,amount_abs:Math.abs(l)}}function ft(t){const e=[];let o="",a=!1;for(const r of t){if(r==='"'){a=!a;continue}if(r===","&&!a){e.push(o),o="";continue}o+=r}return e.push(o),e}function No(t){const e=t.replace(/[$,\s]/g,""),o=e.startsWith("(")&&e.endsWith(")"),a=parseFloat(e.replace(/[()]/g,""));return isNaN(a)?0:o?-a:a}function D(t){if(!t)return 0;const e=parseFloat(t.replace(/[$,%\s,]/g,""));return isNaN(e)?0:e}const E="POSITIONS_VIEW";function ot(t){return"$"+(t??0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}function Ho(t){return t==null?"0":t<1?t.toFixed(4):Number.isInteger(t)?String(t):Math.abs(t-Math.round(t))<5e-5?String(Math.round(t)):t.toFixed(4)}function Oe(t){return t==null||isNaN(t)?"—":(t>=0?"+":"")+t.toFixed(2)+"%"}function Bo(){const t=`background: linear-gradient(90deg, var(--bg-raised) 25%, var(--bg-elevated) 50%, var(--bg-raised) 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;`;return`
    <div style="margin-bottom:var(--s5);">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:var(--s4);">
        <div>
          <h2 style="font-size:15px; font-weight:500; margin-bottom:var(--s1);">My Positions</h2>
          <div style="font-size:12px; color:var(--text-tertiary);">Loading positions...</div>
        </div>
      </div>
    </div>
    ${Array(5).fill("").map(()=>`
      <div class="card" style="padding:var(--s4);">
        <div style="height:20px; width:60%; border-radius:var(--r2); ${t}"></div>
        <div style="height:14px; width:40%; border-radius:var(--r2); margin-top:var(--s2); ${t}"></div>
      </div>
    `).join("")}
  `}function Uo(t){const e=t.ticker==="CASH"||t.ticker==="$",o=t.mkt_value??0,a=t.quantity??0,r=t.gain_loss_pct??0,n=r>=0;return e?`
      <div class="card" style="padding:var(--s4); border-left:3px solid var(--accent);">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <span style="font-family:var(--font-mono); font-size:15px; font-weight:600; color:var(--accent);">CASH</span>
          </div>
          <div style="text-align:right;">
            <div style="font-size:14px; font-weight:500;">${ot(o)}</div>
          </div>
        </div>
      </div>
    `:`
    <div class="card" style="padding:var(--s4);">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div>
          <span style="font-family:var(--font-mono); font-size:15px; font-weight:600;">${t.ticker}</span>
          <span style="font-size:12px; color:var(--text-tertiary); margin-left:var(--s2);">${Ho(a)} shares</span>
        </div>
        <div style="text-align:right;">
          <div style="font-size:14px; font-weight:500;">${o?ot(o):"—"}</div>
          ${r!==0?`<div style="font-size:11px; color:${n?"var(--buy)":"var(--sell)"}">
            ${Oe(r)}
          </div>`:""}
        </div>
      </div>
      ${t.avg_cost?`<div style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">avg cost ${ot(t.avg_cost)}</div>`:""}
    </div>
  `}function jo(t,e){const o=t.querySelector("#csv-upload");if(!o)return;const a=e?{signal:e}:{},r=t.querySelector("#csv-upload-label");r&&r.addEventListener("click",()=>o.click(),a),o.addEventListener("change",async n=>{var p;const i=(p=n.target.files)==null?void 0:p[0];if(!i)return;m(E,`CSV file selected: ${i.name} (${i.size} bytes)`);const d=t.querySelector("#csv-upload-label"),s=(u,g)=>{d&&(d.textContent=u,d.disabled=g,d.style.opacity=g?"0.5":"")};s("Parsing…",!0);const l=new FileReader,c=setTimeout(()=>{s("Upload CSV",!1),I("File read timed out — please try again","error")},15e3);e==null||e.addEventListener("abort",()=>clearTimeout(c),{once:!0}),l.onload=async u=>{if(e!=null&&e.aborted||!t.isConnected)return;clearTimeout(c);const g=u.target.result;let f=null;try{await new Promise(h=>setTimeout(h,30));const _=/date[",\s]+action[",\s]+symbol/i.test(g.slice(0,500));let k=0;if(_){m(E,"Detected transactions CSV format");const h=zo(g);if(k=h.length,await new Promise(b=>setTimeout(b,0)),f=Po(h),!f||Object.keys(f).length===0)throw new Error("No positions derived from transactions CSV");v(E,`Derived ${Object.keys(f).length} positions from transactions CSV`)}else{if(m(E,"Detected positions CSV format"),f=qo(g),!f||Object.keys(f).length===0)throw new Error("No positions found in positions CSV");v(E,`Parsed positions CSV — ${Object.keys(f).length} tickers`)}const x=Object.keys(f).length,W=Object.values(f).reduce((h,b)=>h+(b.mkt_value||0),0),O=h=>h>=1e6?`$${(h/1e6).toFixed(2)}M`:h>=1e3?`$${(h/1e3).toFixed(1)}k`:`$${h.toFixed(0)}`,V=Object.values(f).sort((h,b)=>(b.mkt_value||0)-(h.mkt_value||0)).slice(0,8);if(!await new Promise(h=>{const b=document.createElement("div");b.style.cssText="position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;justify-content:center;padding:var(--s4);",b.innerHTML=`
            <div style="background:var(--bg-raised);border:1px solid var(--border-soft);border-radius:var(--r3);padding:var(--s5);width:100%;max-width:480px;max-height:80vh;overflow-y:auto;">
              <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:var(--s1);">Preview: ${x} positions · ${O(W)}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-bottom:var(--s4);">${_?"Derived from transactions CSV":"From positions export"}</div>
              <div style="margin-bottom:var(--s4);">
                ${V.map(P=>`
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--s2) 0;border-bottom:1px solid var(--border-subtle);">
                    <span style="font-family:var(--font-mono);font-size:13px;font-weight:600;">${P.ticker}</span>
                    <span style="font-size:13px;color:var(--text-secondary);">${P.mkt_value?O(P.mkt_value):"—"}</span>
                  </div>
                `).join("")}
                ${x>8?`<div style="font-size:12px;color:var(--text-tertiary);padding-top:var(--s2);">…and ${x-8} more</div>`:""}
              </div>
              <div style="display:flex;gap:var(--s3);">
                <button id="preview-cancel" class="btn btn-ghost" style="flex:1;">Cancel</button>
                <button id="preview-confirm" class="btn" style="flex:1;background:var(--accent);color:var(--bg-primary);border:none;">Upload ${x} positions</button>
              </div>
            </div>
          `,document.body.appendChild(b);const q=P=>{b.remove(),h(P)};b.addEventListener("click",P=>{P.target===b&&q(!1)}),b.querySelector("#preview-cancel").addEventListener("click",()=>q(!1)),b.querySelector("#preview-confirm").addEventListener("click",()=>q(!0)),e==null||e.addEventListener("abort",()=>q(!1),{once:!0})})){s("Upload CSV",!1),o.value="";return}if(e!=null&&e.aborted||!t.isConnected)return;if(xe(f),be())try{s("Saving…",!0),await Qe("my_positions");const h=Object.values(f).map(b=>[b.ticker,b.quantity,b.avg_cost,b.mkt_value,b.gain_loss,b.gain_loss_pct,b.last_csv_upload,b.source]);if(await xt("my_positions",h),e!=null&&e.aborted||!t.isConnected)return;v(E,`Wrote ${h.length} positions to Sheets my_positions tab`)}catch(h){w(E,`Sheets write failed (${h.message}) — positions updated in-memory only`),I("Sheets save failed — positions shown but will reset on refresh","error")}const Et=_?`${x} positions derived from ${k} transactions`:`${x} positions loaded from positions export`;if(I(Et,"success"),ke(),!(e!=null&&e.aborted)&&t.isConnected&&await De(t,e,{skipLoad:!0}),e!=null&&e.aborted||!t.isConnected)return}catch(_){G(E,`CSV parse failed: ${_.message}`,_);const k=/401|403|auth/i.test(_.message);I(k?"Auth error — try reconnecting Google":"Could not parse CSV — use a Schwab transactions export","error"),s("Upload CSV",!1)}o.value=""},l.onerror=()=>{clearTimeout(c),G(E,"FileReader error reading CSV"),I("Could not read file","error"),s("Upload CSV",!1),o.value=""},l.readAsText(i)})}async function De(t,e,{skipLoad:o=!1}={}){if(o||(t.innerHTML=Bo()),!o)try{await Ht()}catch(p){w(E,`loadPositions failed: ${p.message}`)}if(e!=null&&e.aborted||!t.isConnected)return;const a=lt(),r=Bt(),n=Object.values(a).some(p=>p.source==="mock"),d=Object.values(a).filter(p=>p.ticker==="CASH"||p.ticker==="$"||Math.abs(p.quantity||0)>=.001).sort((p,u)=>{const g=p.ticker==="CASH"||p.ticker==="$",f=u.ticker==="CASH"||u.ticker==="$";return g&&!f?1:!g&&f?-1:(u.mkt_value||0)-(p.mkt_value||0)}),s=[];n?s.push("Sample data"):s.push(lo.account),r.last_csv_upload&&s.push(`Updated ${r.last_csv_upload}`);const l=(()=>{const p=r.last_csv_upload;return p?Math.floor((Date.now()-new Date(p+"T12:00:00").getTime())/864e5):0})(),c=!n&&l>7?`<div style="color:#f0a500; font-size:12px; margin-top:4px;">⚠ Data is ${l} days old — upload a fresh CSV</div>`:"";t.innerHTML=`
    <div class="positions-header" style="margin-bottom:var(--s5);">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:var(--s4);">
        <div>
          <h2 style="font-size:15px; font-weight:500; margin-bottom:var(--s1);">My Positions</h2>
          <div style="font-size:12px; color:var(--text-tertiary);">
            ${s.join(" · ")}
          </div>
          ${n?'<div style="font-size:11px; color:var(--accent); margin-top:4px;">Using sample data — upload CSV to see your real positions</div>':""}
          ${c}
        </div>
        <input type="file" accept=".csv" id="csv-upload" style="display:none" />
        <button class="btn btn-ghost" id="csv-upload-label" style="font-size:12px; min-height:44px;">
          Upload CSV
        </button>
      </div>

      <div class="stat-row">
        <div class="stat">
          <span class="stat-value">${ot(r.account_total)}</span>
          <span class="stat-label">Account Total</span>
        </div>
        <div class="stat">
          <span class="stat-value" style="color:${r.total_gl_pct>=0?"var(--buy)":"var(--sell)"}">
            ${Oe(r.total_gl_pct)}
          </span>
          <span class="stat-label">Total G/L</span>
        </div>
        <div class="stat">
          <span class="stat-value">${d.length}</span>
          <span class="stat-label">Positions</span>
        </div>
        <div class="stat">
          <span class="stat-value">${ot(r.cash)}</span>
          <span class="stat-label">Cash</span>
        </div>
      </div>
    </div>

    <div id="positions-list">
      ${d.length===0?`<div style="padding:var(--s6) var(--s4); text-align:center; color:var(--text-tertiary); font-size:13px; line-height:1.6;">
            No positions to display.<br>
            <span style="font-size:12px;">Upload a Schwab <strong>Positions</strong> CSV (not Transactions) to see your holdings.</span>
           </div>`:d.map(p=>Uo(p)).join("")}
    </div>
  `,jo(t,e),v(E,`Rendered ${d.length} positions (mock=${n})`)}const Lt="SETTINGS_VIEW",Go={consensus_tier1_pct:"0.05",consensus_tier2_pct:"0.10",consensus_tier3_pct:"0.25",consensus_window_days:"14",ai_provider:"gemini",ai_model:"",ollama_base_url:"http://localhost:11434",ollama_fallback_model:"llama3.2",gemini_api_key:"",gemini_fallback_model:"gemini-2.0-flash",ntfy_topic:"",ntfy_base_url:"https://ntfy.sh",notify_on_tier:"2",log_level:"INFO",log_max_rows:"500"},Wo=[{title:"Consensus Thresholds",note:"Fraction of a party (0–1) that must trade the same ticker within the window to trigger a signal. Research-backed defaults — adjust if too noisy.",fields:[{key:"consensus_tier1_pct",label:"Tier 1 — Elevated",type:"number",step:"0.01",min:"0.01",max:"1"},{key:"consensus_tier2_pct",label:"Tier 2 — Strong",type:"number",step:"0.01",min:"0.01",max:"1"},{key:"consensus_tier3_pct",label:"Tier 3 — Near-Unanimous",type:"number",step:"0.01",min:"0.01",max:"1"},{key:"consensus_window_days",label:"Window (days)",type:"number",step:"1",min:"7",max:"90"}]},{title:"AI Provider",note:"Ollama runs locally (laptop only). Gemini works on all devices. Model field is optional — leave blank to use provider default.",fields:[{key:"ai_provider",label:"Provider",type:"select",options:["ollama","gemini"]},{key:"ai_model",label:"Model Override",type:"text",placeholder:"blank = use provider default"},{key:"ollama_base_url",label:"Ollama Base URL",type:"text",placeholder:"http://localhost:11434"},{key:"ollama_fallback_model",label:"Ollama Default Model",type:"text",placeholder:"llama3.2"},{key:"gemini_api_key",label:"Gemini API Key",type:"password"},{key:"gemini_fallback_model",label:"Gemini Default Model",type:"text",placeholder:"gemini-2.0-flash"}]},{title:"Notifications",note:"ntfy.sh sends push to your phone. Subscribe to your topic in the ntfy app. Leave blank to disable push.",fields:[{key:"ntfy_topic",label:"ntfy.sh Topic Slug",type:"text",placeholder:"your-private-topic-xyz"},{key:"ntfy_base_url",label:"ntfy Server URL",type:"text",placeholder:"https://ntfy.sh"},{key:"notify_on_tier",label:"Notify from Tier",type:"select",options:["1","2","3"]}]},{title:"Debug & Logging",note:'Logs are written to the "log" tab in your Google Sheet. DEBUG is verbose — switch to INFO for quieter operation.',fields:[{key:"log_level",label:"Log Level",type:"select",options:["DEBUG","INFO","WARN","ERROR"]},{key:"log_max_rows",label:"Max Log Rows",type:"number",step:"100",min:"100"}]}];async function Vo(t,e){const o=so(),a={...Go,...o},r={...a};t.innerHTML=`
    <div style="max-width: 560px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--s5);">
        <h2 style="font-size:15px; font-weight:500;">Settings</h2>
        <button class="btn btn-primary" id="save-settings">Save All</button>
      </div>
      ${Wo.map(d=>Yo(d,a)).join("")}

      <div style="margin-top:var(--s6); padding-top:var(--s4); border-top:1px solid var(--border-subtle);">
        <div style="font-size:12px; color:var(--text-tertiary);">
          Settings are stored in the <span style="font-family:var(--font-mono)">config</span> tab of your Google Sheet.
          Changes save automatically on blur or Enter.
        </div>
      </div>
    </div>
  `;const n=e?{signal:e}:{};async function i(d,s){if(s===r[d])return;const c=["api_key","password","secret","token"].some(p=>d.toLowerCase().includes(p))?"***":s;m(Lt,`Saving config key: ${d} = ${c}`),r[d]=s;try{await et(d,s),I("Saved")}catch(p){w(Lt,`Failed to save ${d}: ${p.message}`),I("Save failed","error")}}t.querySelectorAll("input[data-key]").forEach(d=>{d.addEventListener("blur",()=>{i(d.dataset.key,d.value)},n),d.addEventListener("keypress",s=>{s.key==="Enter"&&(s.preventDefault(),d.blur())},n)}),t.querySelectorAll("select[data-key]").forEach(d=>{d.addEventListener("change",()=>{i(d.dataset.key,d.value)},n)}),t.querySelector("#save-settings").addEventListener("click",async()=>{const d=t.querySelectorAll("[data-key]");let s=0,l=0;for(const c of d){const p=c.dataset.key,u=c.value;if(u!==r[p]){r[p]=u;try{await et(p,u),s++}catch(g){w(Lt,`Failed to save ${p}: ${g.message}`),l++}}}l>0?I(`Save failed for ${l} field(s)`,"error"):s>0?I("Saved"):I("No changes to save")},n)}function Yo(t,e){return`
    <div class="card" style="margin-bottom:var(--s3);">
      <div style="margin-bottom:var(--s4);">
        <div style="font-size:13px; font-weight:500; margin-bottom:var(--s1);">${t.title}</div>
        <div style="font-size:12px; color:var(--text-tertiary); line-height:1.6;">${t.note}</div>
      </div>
      ${t.fields.map(o=>Ko(o,e[o.key]??"")).join("")}
    </div>
  `}function Ko(t,e){const o=`
    width:100%; padding:var(--s2) var(--s3);
    background:var(--bg-base); border:1px solid var(--border-soft);
    border-radius:var(--r2); color:var(--text-primary);
    font-family:var(--font-sans); font-size:13px;
    outline:none; transition: border-color var(--fast) var(--ease);
  `;let a;return t.type==="select"?a=`<select data-key="${t.key}" style="${o}">
      ${t.options.map(r=>`<option value="${r}" ${e===r?"selected":""}>${r}</option>`).join("")}
    </select>`:a=`<input
      type="${t.type==="password"?"password":t.type||"text"}"
      data-key="${t.key}"
      value="${t.type!=="password"&&e||""}"
      placeholder="${t.placeholder||""}"
      ${t.step?`step="${t.step}"`:""}
      ${t.min?`min="${t.min}"`:""}
      ${t.max?`max="${t.max}"`:""}
      style="${o}"
    />`,`
    <div style="display:grid; grid-template-columns:180px 1fr; align-items:center; gap:var(--s3); margin-bottom:var(--s3);">
      <label style="font-size:12px; color:var(--text-secondary);">${t.label}</label>
      ${a}
    </div>
  `}const ae=[{ticker:"NVDA",pct:.22,rationale:"Pelosi + 14% of Congress buying. AI chip tailwind.",followed:!0,owned:2800,alignment:"aligned"},{ticker:"MSFT",pct:.18,rationale:"Crenshaw bought recently. Strong enterprise AI demand.",followed:!1,owned:0,alignment:"gap"},{ticker:"AAPL",pct:.14,rationale:"Bipartisan buying pattern. Modest add recommended.",followed:!1,owned:4200,alignment:"aligned"},{ticker:"AMD",pct:.12,rationale:"9 members bought in last 30 days. AI inference play alongside NVDA.",followed:!1,owned:0,alignment:"gap"},{ticker:"GOOGL",pct:.1,rationale:"Republican + Democrat overlap. Search + cloud AI moat.",followed:!1,owned:1100,alignment:"aligned"},{ticker:"META",pct:.09,rationale:"Highest conviction buy in tech this quarter. Ad revenue momentum.",followed:!1,owned:0,alignment:"gap"},{ticker:"AMZN",pct:.07,rationale:"AWS demand driving 7 recent buys. Cloud infrastructure pick.",followed:!1,owned:3200,alignment:"aligned"},{ticker:"JPM",pct:.04,rationale:"Financial sector rotation — 5 members bought post rate decision.",followed:!1,owned:0,alignment:"gap"},{ticker:"LLY",pct:.02,rationale:"GLP-1 tailwind. Healthcare committee members buying steadily.",followed:!1,owned:800,alignment:"aligned"},{ticker:"UNH",pct:.02,rationale:"Defensive hold. 3 members added to existing positions.",followed:!1,owned:0,alignment:"gap"},{ticker:"NOC",pct:.02,rationale:"Defense committee buying. Budget cycle tailwind.",followed:!1,owned:8900,alignment:"aligned"},{ticker:"RTX",pct:.02,rationale:"4 members bought. Missile defense demand up.",followed:!1,owned:0,alignment:"gap"},{ticker:"LMT",pct:.02,rationale:"Bipartisan defense buys. F-35 production ramp.",followed:!1,owned:3100,alignment:"aligned"},{ticker:"GE",pct:.01,rationale:"Aerospace recovery play. 3 Senate buys last month.",followed:!1,owned:2900,alignment:"aligned"},{ticker:"PLTR",pct:.01,rationale:"Gov AI contracts. 6 members across both parties.",followed:!1,owned:5200,alignment:"aligned"},{ticker:"CRM",pct:.01,rationale:"Enterprise SaaS. Bought by 4 tech committee members.",followed:!1,owned:0,alignment:"gap"},{ticker:"TSLA",pct:.01,rationale:"EV + energy storage. Mixed signals — 3 buys, 1 sell.",followed:!1,owned:2500,alignment:"aligned"},{ticker:"BA",pct:.01,rationale:"Boeing recovery. Defense + commercial backlog.",followed:!1,owned:3e3,alignment:"aligned"},{ticker:"SCHW",pct:.01,rationale:"Financial sector. 2 Senate banking committee buys.",followed:!1,owned:47300,alignment:"aligned"},{ticker:"IBM",pct:.01,rationale:"AI + cloud pivot. 3 members bought Q1.",followed:!1,owned:3100,alignment:"aligned"},{ticker:"JOBY",pct:.01,rationale:"eVTOL. FAA cert progress. 2 transportation committee buys.",followed:!1,owned:16490,alignment:"aligned"},{ticker:"MU",pct:.01,rationale:"Memory chip cycle upturn. CHIPS Act beneficiary.",followed:!1,owned:1e3,alignment:"aligned"},{ticker:"ABBV",pct:.01,rationale:"Healthcare. 2 committee buys. Humira replacement pipeline.",followed:!1,owned:7579,alignment:"aligned"},{ticker:"WMT",pct:.01,rationale:"Defensive consumer. 3 members holding or adding.",followed:!1,owned:0,alignment:"gap"},{ticker:"V",pct:.01,rationale:"Payments infrastructure. Consistent congressional buying.",followed:!1,owned:0,alignment:"gap"},{ticker:"UPS",pct:.01,rationale:"Logistics. 2 commerce committee buys post-rate decision.",followed:!1,owned:0,alignment:"gap"},{ticker:"NEE",pct:.01,rationale:"Clean energy. 4 members across energy committee.",followed:!1,owned:0,alignment:"gap"},{ticker:"AXON",pct:.01,rationale:"Law enforcement tech. 3 judiciary committee buys.",followed:!1,owned:4e3,alignment:"aligned"},{ticker:"TER",pct:.01,rationale:"Semiconductor test equipment. CHIPS Act play.",followed:!1,owned:4570,alignment:"aligned"}],ne=150,Jo=[150,250,500,1e3],se=50,ie=1e4,wt=3,Gt=30;function Re(t,e){t.innerHTML=Zo(),t.querySelector("#amount-pills").addEventListener("click",o=>{const a=o.target.closest("[data-amount]");if(!a)return;t.querySelector("#amount-input").value=a.dataset.amount;const r=t.querySelector("#amount-error");r&&r.remove(),dt(t)},e?{signal:e}:{}),t.querySelector("#amount-input").addEventListener("input",()=>{const o=t.querySelector("#amount-error");o&&o.remove(),dt(t)},e?{signal:e}:{}),t.querySelector("#pick-decrement").addEventListener("click",()=>{const o=t.querySelector("#pick-count-display"),a=Math.max(1,parseInt(o.textContent,10)-1);o.textContent=a,dt(t)},e?{signal:e}:{}),t.querySelector("#pick-increment").addEventListener("click",()=>{const o=t.querySelector("#pick-count-display"),a=Math.min(Gt,parseInt(o.textContent,10)+1);o.textContent=a,dt(t)},e?{signal:e}:{}),t.querySelector("#get-picks-btn").addEventListener("click",()=>le(t,e).catch(console.error),e?{signal:e}:{}),t.querySelector("#amount-input").addEventListener("keypress",o=>{o.key==="Enter"&&le(t,e).catch(console.error)},e?{signal:e}:{})}function dt(t){var n,i;const e=parseInt((n=t.querySelector("#pick-count-display"))==null?void 0:n.textContent,10)||wt,o=parseInt((i=t.querySelector("#amount-input"))==null?void 0:i.value,10)||0,a=t.querySelector("#get-picks-btn");a&&(a.textContent=`Get ${e} Pick${e!==1?"s":""} →`);const r=t.querySelector("#slice-warning");if(r&&r.remove(),o>0&&e>0&&o/e<5){const d=document.createElement("div");d.id="slice-warning",d.style.cssText="color:var(--sell);font-size:12px;margin-top:var(--s2);",d.textContent="Minimum $5 per slice — reduce picks or increase amount.",t.querySelector("#get-picks-btn").after(d)}}async function le(t,e){const o=t.querySelector("#amount-input"),a=t.querySelector("#pick-count-display"),r=parseInt(o.value,10),n=Math.min(Math.max(parseInt(a==null?void 0:a.textContent,10)||wt,1),Gt),i=t.querySelector("#amount-error");if(i&&i.remove(),!r||r===0){ce(o,"Enter an amount to continue");return}if(r<se||r>ie){ce(o,`Enter an amount between $${se.toLocaleString()} and $${ie.toLocaleString()}`);return}t.innerHTML=Xo(r);let d=[],s=!1;try{const[l,c]=await Promise.all([ct(),Promise.resolve(lt())]);if(e!=null&&e.aborted)return;const p=Nt(),u=Ut(l,{config:Ft(),partyRoster:p});d=Qo(u,c||{},n),d.length||(s=!0,d=ae.slice(0,n))}catch{s=!0,d=ae.slice(0,n)}e!=null&&e.aborted||(t.innerHTML=tr(r,d,s),t.querySelector("#change-amount-link").addEventListener("click",l=>{l.preventDefault(),Re(t,e)},e?{signal:e}:{}))}function Xo(t){return`
    <div style="max-width:480px; margin:0 auto;">
      <div class="card" style="padding:var(--s5);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--s5);">
          <span style="color:var(--text-tertiary); font-size:13px;">← Change amount</span>
          <span style="font-size:18px; font-weight:600; color:var(--text-primary); font-family:var(--font-mono);">$${t.toLocaleString()}</span>
        </div>
        <div style="color:var(--text-tertiary); font-size:13px; text-align:center; padding:var(--s6) 0;">
          Loading congressional signals…
        </div>
      </div>
    </div>
  `}function Qo(t,e,o){const a=new Map;for(const s of t){const l=s.tickers;a.has(l)||a.set(l,{ticker:l,partyD:0,partyR:0,memberCount:0,tier:s.tier});const c=a.get(l);s.party==="D"?c.partyD=s.member_count:s.party==="R"&&(c.partyR=s.member_count),c.memberCount=c.partyD+c.partyR,s.tier>c.tier&&(c.tier=s.tier)}const n=Array.from(a.values()).sort((s,l)=>l.memberCount-s.memberCount||l.tier-s.tier).slice(0,o);if(!n.length)return[];const i={3:3,2:2,1:1},d=n.reduce((s,l)=>s+(i[l.tier]||1),0);return n.map((s,l)=>{const c=i[s.tier]||1,p=Math.round(c/d*100)/100,u=e[s.ticker],f=(u?u.quantity>.001:!1)?"aligned":"gap";return{ticker:s.ticker,name:"",pct:p,alignment:f,rationale:"",followed:!1,owned:u&&u.mkt_value||0,tier:s.tier,memberCount:s.memberCount,partyD:s.partyD,partyR:s.partyR,rank:l+1}})}function Zo(){return`
    <div style="max-width:480px; margin:0 auto;">
      <div class="card" style="padding:var(--s5);">
        <div style="margin-bottom:var(--s5);">
          <h2 style="font-size:15px; font-weight:500; margin-bottom:var(--s4); color:var(--text-primary);">How much are you investing?</h2>

          <!-- Amount input row -->
          <div style="display:flex; align-items:center; gap:var(--s2); margin-bottom:var(--s3);">
            <span style="font-size:18px; color:var(--text-secondary);">$</span>
            <input
              id="amount-input"
              type="number"
              value="${ne}"
              placeholder="${ne}"
              style="
                flex:1;
                min-width:0;
                background:var(--bg-primary);
                border:1px solid var(--border-soft);
                border-radius:var(--r2);
                padding:var(--s3) var(--s4);
                font-size:18px;
                color:var(--text-primary);
                font-family:var(--font-mono);
                transition:border-color var(--fast) var(--ease);
              "
              onfocus="this.style.borderColor='var(--accent)'"
              onblur="this.style.borderColor='var(--border-soft)'"
            />
          </div>

          <!-- Pick count stepper row -->
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--s4);">
            <span style="font-size:13px; color:var(--text-secondary);"># of picks</span>
            <div style="display:flex; align-items:center; gap:var(--s2);">
              <button id="pick-decrement" style="
                width:44px; height:44px;
                background:var(--bg-elevated);
                border:1px solid var(--border-soft);
                border-radius:var(--r2);
                color:var(--text-secondary);
                font-size:20px; cursor:pointer;
              ">−</button>
              <span id="pick-count-display" style="
                width:32px;
                text-align:center;
                font-size:18px;
                font-family:var(--font-mono);
                font-weight:600;
                color:var(--text-primary);
              ">${wt}</span>
              <button id="pick-increment" style="
                width:44px; height:44px;
                background:var(--bg-elevated);
                border:1px solid var(--border-soft);
                border-radius:var(--r2);
                color:var(--text-secondary);
                font-size:20px; cursor:pointer;
              ">+</button>
              <span style="font-size:12px; color:var(--text-tertiary); margin-left:var(--s2);">up to ${Gt} picks</span>
            </div>
          </div>

          <div id="amount-pills" style="display:flex; gap:var(--s2); flex-wrap:wrap; margin-bottom:var(--s5);">
            ${Jo.map(t=>`
              <button
                data-amount="${t}"
                style="
                  padding:var(--s2) var(--s4);
                  background:var(--bg-elevated);
                  border:1px solid var(--border-soft);
                  border-radius:var(--r2);
                  color:var(--text-secondary);
                  font-size:13px;
                  cursor:pointer;
                  min-height:36px;
                "
              >
                $${t.toLocaleString()}
              </button>
            `).join("")}
          </div>

          <button
            id="get-picks-btn"
            class="btn btn-primary"
            style="width:100%; padding:var(--s4); font-size:14px;"
          >
            Get ${wt} Picks →
          </button>
        </div>

        <div style="
          padding-top:var(--s4);
          border-top:1px solid var(--border-subtle);
          font-size:12px;
          color:var(--text-tertiary);
          line-height:1.6;
        ">
          Based on congressional signals, your followed trades, and current positions.
        </div>
      </div>
    </div>
  `}function tr(t,e,o=!1){if(!e.length)return'<div style="padding:var(--s6);text-align:center;color:var(--text-tertiary);">No picks available.</div>';const a=Math.round(t/e.length/25)*25;return e=e.map((r,n)=>({...r,rank:n+1,allocAmount:a})),`
    <div style="max-width:480px; margin:0 auto;">
      <div class="card" style="padding:var(--s5);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--s5);">
          <a id="change-amount-link" href="#" style="
            color:var(--text-secondary);
            text-decoration:none;
            font-size:13px;
            cursor:pointer;
          ">
            ← Change amount
          </a>
          <span style="
            font-size:18px;
            font-weight:600;
            color:var(--text-primary);
            font-family:var(--font-mono);
          ">
            $${t.toLocaleString()}
          </span>
        </div>

        ${o?`
          <div style="
            background:rgba(196,140,50,0.15);
            border:1px solid rgba(196,140,50,0.35);
            border-radius:var(--r2);
            padding:var(--s3) var(--s4);
            margin-bottom:var(--s4);
            font-size:12px;
            color:#c48c32;
          ">
            Using sample data — no live signals available yet
          </div>
        `:""}

        <div style="margin-bottom:var(--s5);">
          <h2 style="font-size:15px; font-weight:500; margin-bottom:var(--s1); color:var(--text-primary);">Recommended Slices</h2>
          <div style="font-size:12px; color:var(--text-tertiary); margin-bottom:var(--s2);">
            ${e.length} pick${e.length!==1?"s":""} · based on recent signals
          </div>
          <div style="font-size:11px; color:var(--text-secondary); margin-bottom:var(--s4);">
            Portfolio match: ${rr(e)}
          </div>
        </div>

        ${e.map(r=>er(r)).join("")}

        <!-- Summary table -->
        <div style="margin-top:var(--s5); border-top:1px solid var(--border-subtle); padding-top:var(--s5);">
          <div style="font-size:12px; font-weight:600; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:var(--s3);">Order Summary</div>
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="color:var(--text-tertiary); font-size:11px; text-transform:uppercase; letter-spacing:0.06em;">
                <th style="text-align:left; padding:var(--s2) 0; font-weight:500;">Symbol</th>
                <th style="text-align:center; padding:var(--s2) 0; font-weight:500;">Action</th>
                <th style="text-align:right; padding:var(--s2) 0; font-weight:500;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${e.map(r=>`
                <tr style="border-top:1px solid var(--border-subtle);">
                  <td style="padding:var(--s3) 0; font-family:var(--font-mono); font-weight:600; color:var(--text-primary);">${r.ticker}</td>
                  <td style="padding:var(--s3) 0; text-align:center; color:var(--buy); font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.05em;">BUY</td>
                  <td style="padding:var(--s3) 0; text-align:right; font-family:var(--font-mono); color:var(--text-primary); font-weight:500;">$${r.allocAmount.toLocaleString()}</td>
                </tr>
              `).join("")}
              <tr style="border-top:1px solid var(--border-soft);">
                <td colspan="2" style="padding:var(--s3) 0; color:var(--text-tertiary); font-size:12px;">Total</td>
                <td style="padding:var(--s3) 0; text-align:right; font-family:var(--font-mono); font-weight:600; color:var(--text-primary);">$${e.reduce((r,n)=>r+n.allocAmount,0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `}function er(t){return`
    <div class="card" style="
      padding:var(--s4);
      margin-bottom:var(--s3);
      background:var(--bg-secondary);
      border-color:var(--border-subtle);
    ">
      <div style="display:flex; gap:var(--s4); margin-bottom:var(--s3);">
        <div style="
          flex-shrink:0;
          font-family:var(--font-mono);
          font-size:20px;
          font-weight:600;
          color:var(--text-secondary);
        ">
          #${t.rank}
        </div>
        <div style="flex:1;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--s1);">
            <span style="
              font-family:var(--font-mono);
              font-size:15px;
              font-weight:600;
              color:var(--text-primary);
            ">
              ${t.ticker}
            </span>
            <span style="
              font-size:14px;
              font-weight:500;
              color:var(--text-primary);
            ">
              $${t.allocAmount.toLocaleString()} <span style="color:var(--text-tertiary);font-size:12px;">(${(t.pct*100).toFixed(0)}%)</span>
            </span>
          </div>
          <div style="
            font-size:12px;
            color:var(--text-secondary);
            line-height:1.5;
            margin-bottom:var(--s2);
          ">
            ${t.rationale}
          </div>
          ${t.followed?`
            <div style="font-size:11px; color:var(--buy); font-weight:500;">✓ You followed this trade</div>
          `:""}
          ${!t.followed&&t.owned===0?`
            <div style="font-size:11px; color:var(--text-tertiary);">Gap: you own $0</div>
          `:""}
          ${!t.followed&&t.owned>0?`
            <div style="font-size:11px; color:var(--text-tertiary);">You own $${t.owned.toLocaleString()} — small add.</div>
          `:""}
          ${or(t.alignment)}
        </div>
      </div>
    </div>
  `}function or(t){const e={aligned:{icon:"✅",label:"Aligned with your portfolio",color:"var(--buy)"},gap:{icon:"🔵",label:"You don't own this yet — gap opportunity",color:"var(--accent)"},diverged:{icon:"⚠️",label:"Signal conflicts with your holdings",color:"var(--sell)"}},{icon:o,label:a,color:r}=e[t]||e.gap;return`<div style="margin-top:8px; font-size:11px; color:${r}; font-weight:500;">${o} ${a}</div>`}function rr(t){const e=t.filter(n=>n.alignment==="aligned").length,o=t.filter(n=>n.alignment==="gap").length,a=t.filter(n=>n.alignment==="diverged").length,r=[];return e&&r.push(`<span style="color:var(--buy)">${e} aligned</span>`),o&&r.push(`<span style="color:var(--accent)">${o} gap${o>1?"s":""}</span>`),a&&r.push(`<span style="color:var(--sell)">${a} conflict${a>1?"s":""}</span>`),r.join(" · ")}function ce(t,e){const o=document.createElement("div");o.id="amount-error",o.style.cssText=`
    color:var(--sell);
    font-size:12px;
    margin-top:var(--s2);
    padding:var(--s2) var(--s3);
    background:rgba(196,123,110,0.12);
    border:1px solid rgba(196,123,110,0.2);
    border-radius:var(--r2);
  `,o.textContent=e,t.parentElement.appendChild(o)}let vt=null;const zt=[{ticker:"NVDA",name:"NVIDIA Corp",memberCount:19,partyD:11,partyR:8,buyCount:17,sellCount:2,tier:3,windowDays:14,lastTrade:"1 day ago",topTrader:"Pelosi"},{ticker:"MSFT",name:"Microsoft Corp",memberCount:12,partyD:5,partyR:7,buyCount:10,sellCount:2,tier:2,windowDays:14,lastTrade:"2 days ago",topTrader:"Crenshaw"},{ticker:"AAPL",name:"Apple Inc",memberCount:10,partyD:6,partyR:4,buyCount:8,sellCount:2,tier:2,windowDays:14,lastTrade:"3 days ago",topTrader:"Pelosi"},{ticker:"AMZN",name:"Amazon.com Inc",memberCount:8,partyD:3,partyR:5,buyCount:7,sellCount:1,tier:2,windowDays:14,lastTrade:"4 days ago",topTrader:"Collins"},{ticker:"META",name:"Meta Platforms",memberCount:6,partyD:4,partyR:2,buyCount:5,sellCount:1,tier:1,windowDays:30,lastTrade:"6 days ago",topTrader:"Schiff"},{ticker:"GOOGL",name:"Alphabet Inc",memberCount:5,partyD:2,partyR:3,buyCount:3,sellCount:2,tier:1,windowDays:30,lastTrade:"8 days ago",topTrader:"McCaul"},{ticker:"WMT",name:"",memberCount:6,partyD:2,partyR:4,buyCount:2,sellCount:7,tier:2,windowDays:14,lastTrade:"3 days ago",topTrader:"Collins"}],ar=[{key:"all",label:"All"},{key:"D",label:"Dem"},{key:"R",label:"Rep"}],nr=[{key:"all",label:"All"},{key:"buy",label:"Buys"},{key:"sell",label:"Sells"}],sr=[{key:"14",label:"14d"},{key:"30",label:"30d"},{key:"90",label:"90d"}];let gt="all",yt="all",N=90,K=null,rt=!1;function ir(t){const e=new Date(t),o=Math.floor((Date.now()-e.getTime())/864e5);return o===0?"today":o===1?"1 day ago":`${o} days ago`}function lr(t){return t>=3?{label:"Strong",dots:"●●●",color:"var(--buy)"}:t===2?{label:"Moderate",dots:"●●○",color:"var(--accent)"}:{label:"Weak",dots:"●○○",color:"var(--text-tertiary)"}}function cr(t,e){const o=new Map;for(const r of t){const n=r.tickers;o.has(n)||o.set(n,{ticker:n,partyD:0,partyR:0,tier:r.tier,pctMax:0});const i=o.get(n);r.party==="D"?i.partyD=r.member_count:r.party==="R"&&(i.partyR=r.member_count),i.tier=r.tier>i.tier?r.tier:i.tier,r.pct_of_party>i.pctMax&&(i.pctMax=r.pct_of_party)}const a=[];for(const[r,n]of o){const i=e.filter(l=>l.ticker===r);n.memberCount=n.partyD+n.partyR,n.buyCount=i.filter(l=>l.action==="buy").length,n.sellCount=i.filter(l=>l.action==="sell").length,n.windowDays=i.length>0?Math.round((Date.now()-Math.min(...i.map(l=>l.transaction_ts)))/864e5):90;const d=i.length>0?Math.max(...i.map(l=>l.transaction_ts)):null;n.lastTrade=d?ir(new Date(d).toISOString()):"—";const s=i.reduce((l,c)=>!l||c.amount_high>l.amount_high?c:l,null);n.topTrader=s?s.politician_name:"—",n.name="",a.push(n)}return a.sort((r,n)=>n.memberCount-r.memberCount||n.tier-r.tier),a}function dr(){const t=`background: linear-gradient(90deg, var(--bg-raised) 25%, var(--bg-elevated) 50%, var(--bg-raised) 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;`;return`
    <div style="max-width:480px; margin:0 auto;">
      <div style="margin-bottom:var(--s4);">
        <div style="height:16px;width:55%;border-radius:var(--r2);${t}"></div>
        <div style="height:13px;width:40%;border-radius:var(--r2);margin-top:var(--s2);${t}"></div>
      </div>
      ${Array(3).fill("").map(()=>`
        <div class="card" style="padding:var(--s4);margin-bottom:var(--s3);">
          <div style="height:18px;width:30%;border-radius:var(--r2);${t}"></div>
          <div style="height:14px;width:55%;border-radius:var(--r2);margin-top:var(--s3);${t}"></div>
          <div style="height:12px;width:45%;border-radius:var(--r2);margin-top:var(--s2);${t}"></div>
        </div>
      `).join("")}
    </div>
  `}async function At(t,e,{forceRefresh:o=!1}={}){if(!(e!=null&&e.aborted)){t.innerHTML=dr();try{const a=await ct({forceRefresh:o});if(e!=null&&e.aborted)return;const r=N,n=Nt(),i=Ut(a,{config:{...Ft(),consensus_window_days:r},partyRoster:n}),d=Date.now()-r*864e5,s=a.filter(l=>l.transaction_ts>=d);K=cr(i,s),K.length===0?(K=zt,rt=!0):rt=!1}catch{K=zt,rt=!0}e!=null&&e.aborted||Pt(t,e)}}async function pr(t,e){gt="all",yt="all",N=90,K=null,rt=!1,!(e!=null&&e.aborted)&&await At(t,e)}function de(t,e,o,a){return`<button
    ${a}="${t}"
    style="
      padding:var(--s2) var(--s3);
      border-radius:var(--r2);
      border:1px solid ${e?"var(--accent)":"var(--border-soft)"};
      background:${e?"rgba(201,177,135,0.12)":"var(--bg-elevated)"};
      color:${e?"var(--accent)":"var(--text-secondary)"};
      font-size:12px; cursor:pointer; min-height:36px;
    "
  >${o}</button>`}function ze(t){const e=t/36e5;if(e<1)return"< 1h";if(e<24)return`${Math.floor(e)}h`;const o=Math.floor(e/24);return`${o} day${o!==1?"s":""}`}function ur(t,e,o){const a=document.getElementById("signal-refresh-modal");a&&a.remove();const r=document.createElement("div");r.id="signal-refresh-modal",r.style.cssText="position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;justify-content:center;padding:var(--s4);",r.innerHTML=`
    <div style="background:var(--bg-raised);border:1px solid var(--border-soft);border-radius:var(--r3);padding:var(--s5);width:100%;max-width:420px;">
      <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:var(--s2);">Data refreshed ${o} ago</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:var(--s5);line-height:1.5;">Fetching again uses your network quota. Refresh anyway?</div>
      <div style="display:flex;gap:var(--s3);">
        <button id="signal-modal-cancel" class="btn btn-ghost" style="flex:1;">Cancel</button>
        <button id="signal-modal-confirm" class="btn" style="flex:1;background:var(--accent);color:#fff;border:none;">Yes, Refresh</button>
      </div>
    </div>
  `,document.body.appendChild(r);const n=e?{signal:e}:{},i=()=>r.remove();r.addEventListener("click",d=>{d.target===r&&i()},n),r.querySelector("#signal-modal-cancel").addEventListener("click",i,n),r.querySelector("#signal-modal-confirm").addEventListener("click",()=>{i(),vt=Date.now(),At(t,e,{forceRefresh:!0})},n),e==null||e.addEventListener("abort",i,{once:!0})}function mr(t,e){const o=t.querySelector("#signal-refresh-btn");o&&o.addEventListener("click",()=>{const a=vt?Date.now()-vt:1/0;a<864e5?ur(t,e,ze(a)):(vt=Date.now(),At(t,e,{forceRefresh:!0}))},e?{signal:e}:{})}function Pt(t,e){if(e!=null&&e.aborted)return;const o=fr(K??zt,gt,yt),a=bt("congressional_last_fetch",""),r=a?` · updated ${ze(Date.now()-new Date(a).getTime())} ago`:"",n=rt?`<div data-testid="mock-banner" style="background:#7c4a00;color:#ffcc80;padding:8px 12px;border-radius:6px;font-size:13px;margin-bottom:12px;">
         Using sample data — live signal computation unavailable
       </div>`:"";t.innerHTML=`
    <div style="max-width:480px; margin:0 auto;">

      ${n}

      <!-- Filter rows -->
      <div style="display:flex; flex-direction:column; gap:var(--s2); margin-bottom:var(--s4);">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div id="party-filters" style="display:flex; gap:var(--s2);">
            ${ar.map(c=>de(c.key,gt===c.key,c.label,"data-party")).join("")}
          </div>
          <div id="window-filters" style="display:flex; gap:var(--s1);">
            ${sr.map(c=>`
              <button data-window="${c.key}" style="
                padding:var(--s1) var(--s3);
                border-radius:var(--r2);
                border:1px solid ${String(N)===c.key?"var(--accent)":"var(--border-subtle)"};
                background:${String(N)===c.key?"rgba(201,177,135,0.08)":"transparent"};
                color:${String(N)===c.key?"var(--accent)":"var(--text-tertiary)"};
                font-size:11px; cursor:pointer; min-height:28px;
              ">${c.label}</button>
            `).join("")}
          </div>
        </div>
        <div id="action-filters" style="display:flex; gap:var(--s2);">
          ${nr.map(c=>de(c.key,yt===c.key,c.label,"data-action")).join("")}
        </div>
      </div>

      <!-- Signal count + refresh -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s3);">
        <div style="font-size:12px;color:var(--text-tertiary);">
          ${o.length} stock${o.length!==1?"s":""} with congressional activity · last ${N}d${r}
        </div>
        <button id="signal-refresh-btn" class="btn btn-ghost" style="font-size:11px;padding:2px 10px;">↺ Refresh</button>
      </div>

      <!-- Signal cards -->
      <div id="signal-list">
        ${o.length===0?`<div class="empty-state">
               <div class="empty-state-title">No signals</div>
               <div class="empty-state-sub">No trades match this filter in the selected window.</div>
             </div>`:o.map((c,p)=>vr(c,p+1)).join("")}
      </div>

    </div>
  `;const i=e?{signal:e}:{},d=t.querySelector("#party-filters");d&&d.addEventListener("click",c=>{const p=c.target.closest("[data-party]");p&&(gt=p.dataset.party,Pt(t,e))},i);const s=t.querySelector("#action-filters");s&&s.addEventListener("click",c=>{const p=c.target.closest("[data-action]");p&&(yt=p.dataset.action,Pt(t,e))},i);const l=t.querySelector("#window-filters");l&&l.addEventListener("click",c=>{const p=c.target.closest("[data-window]");if(!p)return;const u=parseInt(p.dataset.window,10);u!==N&&(N=u,At(t,e))},i),mr(t,e)}function fr(t,e,o){let a=t;return e==="D"&&(a=a.filter(r=>r.partyD>r.partyR)),e==="R"&&(a=a.filter(r=>r.partyR>r.partyD)),o==="buy"&&(a=a.filter(r=>r.buyCount>r.sellCount)),o==="sell"&&(a=a.filter(r=>r.sellCount>r.buyCount)),a}function vr(t,e){const o=t.tier>=3?"tier-bright":t.tier===2?"tier-accent":"tier-subtle",a=Math.round(t.buyCount/(t.buyCount+t.sellCount)*100),r=t.partyD>0&&t.partyR>0,n=Math.round(t.partyD/t.memberCount*100),i=100-n,d=lr(t.tier);return`
    <div class="card" style="padding:var(--s4); margin-bottom:var(--s3);">

      <!-- Row 1: rank + ticker + tier + action button -->
      <div style="display:flex; align-items:flex-start; gap:var(--s3); margin-bottom:var(--s3);">
        <div style="
          flex-shrink:0;
          font-family:var(--font-mono);
          font-size:16px;
          font-weight:600;
          color:var(--text-tertiary);
          min-width:24px;
          padding-top:2px;
        ">#${e}</div>

        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:var(--s2); margin-bottom:2px;">
            <span style="font-family:var(--font-mono); font-size:16px; font-weight:700; color:var(--text-primary);">${t.ticker}</span>
            <span class="tier-badge ${o}">Tier ${t.tier}</span>
            ${r?'<span style="font-size:10px; color:var(--text-tertiary); background:var(--bg-elevated); padding:1px 6px; border-radius:var(--r1); border:1px solid var(--border-subtle);">Bipartisan</span>':""}
          </div>
          ${t.name?`<div style="font-size:12px; color:var(--text-secondary);">${t.name}</div>`:""}
        </div>

        <button
          onclick="window._navigate('whatToBuy')"
          style="
            flex-shrink:0;
            padding:var(--s2) var(--s3);
            background:var(--accent);
            color:var(--bg-primary);
            border:none;
            border-radius:var(--r2);
            font-size:12px;
            font-weight:600;
            cursor:pointer;
            min-height:32px;
          "
        >Buy →</button>
      </div>

      <!-- Row 2: member count + buy/sell ratio -->
      <div style="display:flex; gap:var(--s5); margin-bottom:var(--s3);">
        <div>
          <div style="font-size:18px; font-weight:700; color:var(--text-primary); font-family:var(--font-mono);">${t.memberCount}</div>
          <div style="font-size:11px; color:var(--text-tertiary);">members trading</div>
        </div>
        <div>
          <div style="font-size:18px; font-weight:700; color:var(--buy); font-family:var(--font-mono);">${a}%</div>
          <div style="font-size:11px; color:var(--text-tertiary);">${t.buyCount}B · ${t.sellCount}S</div>
        </div>
        <div>
          <div style="font-size:13px; font-weight:500; color:var(--text-secondary);">${t.topTrader}</div>
          <div style="font-size:11px; color:var(--text-tertiary);">top trader · ${t.lastTrade}</div>
        </div>
      </div>

      <!-- Row 3: party bar + signal strength -->
      <div style="display:flex; align-items:center; gap:var(--s4);">
        <div style="flex:1;">
          <div style="font-size:10px; color:var(--text-tertiary); margin-bottom:4px; display:flex; justify-content:space-between;">
            <span>D ${t.partyD}</span>
            <span>R ${t.partyR}</span>
          </div>
          <div style="display:flex; height:4px; border-radius:2px; overflow:hidden; background:var(--bg-elevated);">
            <div style="width:${n}%; background:#4a90d9; border-radius:2px 0 0 2px;"></div>
            <div style="width:${i}%; background:#d94a4a; border-radius:0 2px 2px 0;"></div>
          </div>
        </div>
        <div style="font-size:12px; color:${d.color}; font-weight:500; white-space:nowrap;">
          ${d.dots} ${d.label}
        </div>
      </div>

    </div>
  `}const pe="DECISIONS_VIEW",gr="sth_trade_decisions";function yr(){try{return JSON.parse(localStorage.getItem(gr)||"{}")}catch{return{}}}function hr(t,e){const o=a=>a>=1e6?`$${(a/1e6).toFixed(0)}M`:`$${(a/1e3).toFixed(0)}k`;return`${o(t)}–${o(e)}`}function br(t){if(!t)return"—";const e=Math.floor((Date.now()-new Date(t).getTime())/864e5);return e===0?"today":e===1?"yesterday":`${e} days ago`}function _r(t){return`<span style="display:inline-flex;align-items:center;padding:1px 7px;border-radius:100px;font-size:11px;font-weight:600;letter-spacing:0.04em;border:1px solid;${{D:"color:#6b9bd2;background:rgba(107,155,210,0.14);border-color:rgba(107,155,210,0.25)",R:"color:#c47b6e;background:rgba(196,123,110,0.14);border-color:rgba(196,123,110,0.25)"}[t]||"color:var(--text-tertiary);background:var(--bg-elevated);border-color:var(--border-soft)"}">${t||"U"}</span>`}function wr(){const t="background:linear-gradient(90deg,var(--bg-raised) 25%,var(--bg-elevated) 50%,var(--bg-raised) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;";return`
    <div style="margin-bottom:var(--s5);">
      <div style="font-size:18px;font-weight:600;color:var(--text-primary);letter-spacing:-0.01em;">My Decisions</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:var(--s1);">Loading…</div>
    </div>
    ${Array(3).fill("").map(()=>`
      <div class="card" style="padding:var(--s4);">
        <div style="height:18px;width:65%;border-radius:var(--r2);${t}"></div>
        <div style="height:14px;width:45%;border-radius:var(--r2);margin-top:var(--s2);${t}"></div>
      </div>
    `).join("")}
  `}async function xr(t,e){t.innerHTML=wr();const o=yr(),a=Object.entries(o).filter(([,l])=>l==="followed").map(([l])=>l),r=Object.entries(o).filter(([,l])=>l==="ignored").map(([l])=>l);let n=[];if(a.length>0)try{m(pe,`Loading ${a.length} followed trades from congressional data`);const l=await ct();if(e!=null&&e.aborted)return;const c=new Map(l.map(p=>[p.id,p]));for(const p of a){const u=c.get(p);u?n.push(u):n.push({id:p,_stub:!0})}n.sort((p,u)=>(u.transaction_ts||0)-(p.transaction_ts||0))}catch(l){w(pe,`Failed to load congressional data: ${l.message}`)}if(e!=null&&e.aborted||!t.isConnected)return;const i=a.length+r.length,d=i===0?"No decisions recorded yet":`${a.length} followed · ${r.length} ignored`;if(i===0){t.innerHTML=`
      <div style="margin-bottom:var(--s5);">
        <div style="font-size:18px;font-weight:600;color:var(--text-primary);letter-spacing:-0.01em;">My Decisions</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:var(--s1);">${d}</div>
      </div>
      <div style="padding:var(--s6) var(--s4);text-align:center;color:var(--text-tertiary);font-size:13px;line-height:1.6;">
        No decisions yet.<br>
        <span style="font-size:12px;">Follow or ignore trades in the Feed to build your history.</span>
      </div>
    `;return}const s=a.length===0?'<div style="padding:var(--s4);text-align:center;color:var(--text-tertiary);font-size:13px;">No followed trades yet. Follow trades in the Feed to see them here.</div>':n.length===0?'<div style="padding:var(--s4);text-align:center;color:var(--text-tertiary);font-size:13px;">Followed trades are outside the 6-month data window.</div>':n.map(l=>{if(l._stub)return`
            <div class="card" style="padding:var(--s4);border-left:3px solid var(--buy);">
              <div style="font-size:12px;color:var(--text-tertiary);">Trade ID: ${l.id}</div>
              <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px;">Details unavailable — trade is outside the 6-month window</div>
            </div>
          `;const c=l.action==="buy"?"var(--buy)":"var(--sell)";return`
          <div class="card" style="padding:var(--s4);border-left:3px solid var(--buy);">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--s3);">
              <div style="display:flex;align-items:center;gap:var(--s2);flex-wrap:wrap;">
                ${_r(l.party)}
                <span style="font-size:14px;font-weight:500;color:var(--text-primary);">${l.politician_name}</span>
              </div>
              <span style="font-size:12px;color:var(--text-tertiary);white-space:nowrap;flex-shrink:0;">${br(l.transaction_date)}</span>
            </div>
            <div style="display:flex;align-items:baseline;gap:var(--s3);margin-top:var(--s2);">
              <span style="font-family:var(--font-mono);font-size:18px;font-weight:700;color:var(--text-primary);">${l.ticker}</span>
              <span style="font-size:13px;font-weight:600;color:${c};">${l.action.toUpperCase()}</span>
              <span style="font-size:13px;color:var(--text-secondary);">${hr(l.amount_low,l.amount_high)}</span>
            </div>
            <div style="margin-top:var(--s2);font-size:11px;color:var(--buy);font-weight:500;">✓ Followed</div>
          </div>
        `}).join("");t.innerHTML=`
    <div style="margin-bottom:var(--s5);">
      <div style="font-size:18px;font-weight:600;color:var(--text-primary);letter-spacing:-0.01em;">My Decisions</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:var(--s1);">${d}</div>
    </div>
    <div style="font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:var(--s3);">Followed trades</div>
    ${s}
    ${r.length>0?`
      <div style="margin-top:var(--s5);padding-top:var(--s4);border-top:1px solid var(--border-subtle);">
        <div style="font-size:13px;color:var(--text-tertiary);">${r.length} trade${r.length!==1?"s":""} ignored (not shown)</div>
      </div>
    `:""}
  `}const ue="APP_SHELL";function kr({spreadsheetId:t}){v(ue,"Rendering app shell"),document.getElementById("app").innerHTML=`
    <div class="app-shell">
      <header class="app-header" id="app-header">
        <div class="header-left">
          <button class="back-btn hidden" id="back-btn" aria-label="Back">←</button>
          <span class="app-wordmark">STH</span>
          <span style="font-size:10px; color:var(--text-tertiary); font-family:var(--font-mono); margin-left:var(--s2); letter-spacing:0.03em;">v0323.1128</span>
        </div>
        <div class="header-right">
          <div id="sync-status" class="sync-dot"></div>
          <button class="settings-btn btn btn-ghost" id="settings-btn" aria-label="Settings">⚙</button>
        </div>
      </header>
      <main class="app-content" id="view-content"></main>
    </div>
    <div id="toast-container"></div>
  `;const e=document.getElementById("view-content"),o=document.getElementById("back-btn"),a=document.getElementById("settings-btn");let r=null,n=null;async function i(l){if(l===r)return;r=l,n&&n.abort(),n=new AbortController;const{signal:c}=n;v(ue,`Navigate: ${l}`),$r(l);const p=l==="home"?"#/":`#/${l}`;try{history.pushState({view:l},"",p)}catch{}o.classList.toggle("hidden",l==="home"),a.classList.toggle("hidden",l==="settings"),e.innerHTML="";try{l==="home"?await ko(e,c):l==="feed"?await jt(e,c):l==="positions"?await De(e,c):l==="settings"?await Vo(e,c):l==="whatToBuy"?await Re(e,c):l==="topSignal"?await pr(e,c):l==="decisionsHistory"&&await xr(e,c)}catch(u){if(u.name==="AbortError")return;console.error("[APP] render error:",u),e.innerHTML=`
        <div class="empty-state">
          <div class="empty-state-title">Something went wrong</div>
          <div class="empty-state-sub">${u.message}</div>
        </div>`}}window._navigate=i,window.addEventListener("popstate",l=>{var p;const c=((p=l.state)==null?void 0:p.view)||"home";i(c)}),o.addEventListener("click",()=>i("home")),a.addEventListener("click",()=>i("settings"));const s=window.location.hash.replace(/^#\/?/,"")||""||sessionStorage.getItem("sth_last_view")||"home";i(s)}function $r(t){try{sessionStorage.setItem("sth_last_view",t)}catch{}}const L="OAUTH",Sr="https://www.googleapis.com/auth/spreadsheets",me="Stock Trader Helper",Pe="sth_auth";async function fe(){v(L,"startOAuthFlow()");const t=Lr();Ar(t)}async function Cr(){const t=Wt();if(!(t!=null&&t.emailHint)||!(t!=null&&t.clientId))return null;m(L,`trySilentRefresh — hint: ${t.emailHint}`);try{const e=await qe(t.clientId,{hint:t.emailHint,prompt:""});return Fe({...t,accessToken:e,tokenTs:Date.now()}),v(L,"Silent token refresh succeeded"),e}catch(e){return w(L,"Silent refresh failed — user must sign in",e.message),null}}function Tr(){return Wt()}function Ar(t){const e=document.createElement("div");e.id="oauth-overlay",e.style.cssText=`
    position:fixed; inset:0;
    background: var(--bg-base);
    display:flex; align-items:center; justify-content:center;
    z-index:999; flex-direction:column; gap:var(--s4);
  `,e.innerHTML=`
    <div style="max-width:320px; text-align:center; padding: var(--s5);">
      <div style="font-size:13px; font-weight:600; letter-spacing:0.14em;
        color:var(--accent); margin-bottom:var(--s6);">STH</div>

      <div style="font-size:22px; font-weight:600; letter-spacing:-0.02em;
        color:var(--text-primary); margin-bottom:var(--s2);">
        Stock Trader Helper
      </div>
      <div style="font-size:14px; color:var(--text-secondary); line-height:1.6;
        margin-bottom:var(--s7);">
        Mirror congressional trades.<br>Intelligently.
      </div>

      <button id="google-signin-btn" style="
        display:flex; align-items:center; justify-content:center; gap:var(--s3);
        width:100%; padding:var(--s3) var(--s5);
        background:var(--bg-raised); border:1px solid var(--border-soft);
        border-radius:var(--r3); color:var(--text-primary);
        font-size:14px; font-weight:500; font-family:var(--font-sans);
        cursor:pointer; transition:all var(--fast) var(--ease);
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>

      <div id="signin-status" style="margin-top:var(--s4); font-size:12px;
        color:var(--text-tertiary); min-height:18px;"></div>
    </div>
  `,document.body.appendChild(e);const o=document.getElementById("google-signin-btn"),a=document.getElementById("signin-status");o.addEventListener("mouseenter",()=>{o.style.borderColor="var(--border-hard)",o.style.background="var(--bg-elevated)"}),o.addEventListener("mouseleave",()=>{o.style.borderColor="var(--border-soft)",o.style.background="var(--bg-raised)"}),o.addEventListener("click",async()=>{o.disabled=!0,o.style.opacity="0.6",a.textContent="Opening Google sign-in…";try{const r=await qe(t,{prompt:"select_account"});a.textContent="Signed in. Setting up your sheet…",v(L,"OAuth token received");const n=await Mr(r),i=await Er(r,n);Fe({clientId:t,accessToken:r,spreadsheetId:i,emailHint:n,tokenTs:Date.now()}),v(L,`Auth complete — sheet: ${i}`),e.remove(),window.location.reload()}catch(r){G(L,"Sign-in failed",r.message),a.style.color="var(--sell)",a.textContent=r.message==="popup_closed_by_user"?"Sign-in cancelled.":`Error: ${r.message}`,o.disabled=!1,o.style.opacity="1"}})}async function Er(t,e){const o=Wt();if(o!=null&&o.spreadsheetId)return m(L,`Using existing spreadsheet: ${o.spreadsheetId}`),o.spreadsheetId;v(L,`Creating new spreadsheet: "${me}"`);const a=await fetch("https://sheets.googleapis.com/v4/spreadsheets",{method:"POST",headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json"},body:JSON.stringify({properties:{title:me},sheets:[{properties:{title:"feed",index:0}},{properties:{title:"config",index:1}},{properties:{title:"log",index:2}},{properties:{title:"watchlist",index:3}},{properties:{title:"disclosures",index:4}},{properties:{title:"consensus",index:5}},{properties:{title:"recommendations",index:6}},{properties:{title:"my_decisions",index:7}},{properties:{title:"my_allocations",index:8}},{properties:{title:"my_positions",index:9}}]})});if(!a.ok){const i=await a.text();throw new Error(`Sheet creation failed (${a.status}): ${i}`)}const n=(await a.json()).spreadsheetId;return v(L,`Spreadsheet created: ${n}`),n}async function Mr(t){try{const e=await fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{Authorization:`Bearer ${t}`}});if(!e.ok)return"";const o=await e.json();return m(L,`Signed in as: ${o.email}`),o.email||""}catch{return""}}function qe(t,{hint:e="",prompt:o="select_account"}={}){return new Promise((a,r)=>{Ir().then(()=>{window.google.accounts.oauth2.initTokenClient({client_id:t,scope:Sr,hint:e,prompt:o,callback:i=>{i.error?r(new Error(i.error)):a(i.access_token)}}).requestAccessToken()}).catch(r)})}function Ir(){var t,e;return(e=(t=window.google)==null?void 0:t.accounts)!=null&&e.oauth2?Promise.resolve():new Promise((o,a)=>{const r=document.createElement("script");r.src="https://accounts.google.com/gsi/client",r.onload=o,r.onerror=()=>a(new Error("Failed to load Google Identity Services")),document.head.appendChild(r)})}function Lr(){return"224476184723-p8gb9gsb5p2pmbj3c891ctn7o35ghr7q.apps.googleusercontent.com"}function Fe(t){sessionStorage.setItem(Pe,JSON.stringify(t))}function Wt(){try{const t=sessionStorage.getItem(Pe);return t?JSON.parse(t):null}catch{return null}}const Or=50*60*1e3;async function Dr(){ye({sheetsWriter:null,minLevel:"DEBUG"}),v("BOOT","App starting");const t=Tr();if(!(t!=null&&t.spreadsheetId)){v("BOOT","No auth stored — showing sign-in"),fe();return}let{accessToken:e,spreadsheetId:o,tokenTs:a}=t;const r=Date.now()-(a||0);if(r>Or){v("BOOT",`Token age ${Math.round(r/6e4)}min — attempting silent refresh`);const n=await Cr();if(n)e=n;else{v("BOOT","Silent refresh failed — showing sign-in"),fe();return}}Ve(o),Ye(e),v("BOOT","Rendering app (Sheets connecting in background)"),kr({spreadsheetId:o}),Rr(o,e)}async function Rr(t,e){var o,a;try{await We(t,e),ye({sheetsWriter:r=>Ze(r),minLevel:"DEBUG"}),await no();try{const{loadPositions:r}=await Ue(async()=>{const{loadPositions:n}=await Promise.resolve().then(()=>mo);return{loadPositions:n}},void 0);await r(),v("BOOT","Positions loaded")}catch(r){w("BOOT",`Positions load failed (will use mock): ${r.message}`)}v("BOOT","Sheets connected + config loaded")}catch(r){w("BOOT",`Sheets unavailable (app continues with defaults): ${r.message}`),((o=r.message)!=null&&o.includes("401")||(a=r.message)!=null&&a.includes("403"))&&(v("BOOT","Auth error — clearing stored credentials"),sessionStorage.removeItem("sth_auth"))}}Dr();
