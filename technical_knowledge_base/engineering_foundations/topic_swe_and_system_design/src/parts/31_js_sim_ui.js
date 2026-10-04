// ---- Scale simulator: the page (state, presets, controls, bars, fix panel). Model in 31_js_sim_model.js; diagram in 31_js_sim_dia.js.
(function(){
const SM=window.SM;if(!SM)return;
const $=id=>document.getElementById(id);
const root=$('t-sim');if(!root)return;
const D=SM.D;
const NAMES={app:'App servers',cache:'Cache',prim:'DB primary',rep:'DB read replicas',work:'Queue workers',gpu:'GPU pool'};
const B=SM.BASE;const mk=o=>Object.assign({},B,o);
const PRESETS=[
 {id:'p1',lab:'1 user',st:mk({users:1,idx:false}),cap:'Step 1, one server. One app server, one small database and one GPU replica (two H100s). Every bar is near zero, yet the bill is already thousands of dollars a month: GPU capacity comes in whole replicas.'},
 {id:'p2',lab:'1k users',st:mk({users:1000,idx:false}),cap:'Step 1, the first wall. Still nothing above a few per cent busy. The suggested fix is not about speed: a single server is a single point of failure, so a second one goes behind a load balancer.'},
 {id:'p3',lab:'100k users',st:mk({users:1e5,app_n:2,idx:false,gpu_r:8}),cap:'Step 2, the database. The messages table has no index, so every read scans all stored messages: reads grow with users and so does the table, and the work grows with users squared. (GPU pool pre-sized here; its story is the last preset.)'},
 {id:'p4',lab:'1M users',st:mk({users:1e6,app_n:2,idx:true,gpu_r:80}),cap:'Step 3, slow work leaves the request. The per-message jobs (a moderation check, search indexing) run inside the request, and every read reaches the database. Press "Apply the fix" again and again: queue, cache, a bigger database, more app servers.'},
 {id:'p5',lab:'10M users',st:mk({users:1e7,app_n:3,idx:true,db_size:2,cache_n:1,async:true,workers_n:5,gpu_r:800}),cap:'Steps 2 to 4 at scale: the 1M design under ten times the load. Writes swamp a single primary however large it is, so the data is split into shards. The pre-sized GPU pool is almost the whole bill.'},
 {id:'p6',lab:'GPU-heavy launch',st:mk({users:1e6,app_n:3,idx:true,db_size:2,cache_n:1,async:true,workers_n:5,gpu_r:80,isl:8000,osl:1500}),cap:'Step 5, the GPU layer. A new feature reads long documents (8,000 input tokens) and writes long answers (1,500). Same users as the 1M design, but each stream now needs so much KV-cache memory that the batch is capped, and the GPU pool saturates.'}
];
let cur=Object.assign({},PRESETS[0].st),hist=[],view='now',presetId='p1',fix=null,oNow=null,oAfter=null;
// ---- number formatting
const fmtN=x=>{if(!isFinite(x))return '&infin;';const a=Math.abs(x);if(a>=1e9)return (x/1e9).toFixed(a>=1e10?0:1)+'B';if(a>=1e6)return (x/1e6).toFixed(a>=1e7?0:1)+'M';if(a>=1e4)return Math.round(x/1e3)+'k';if(a>=1000)return (x/1e3).toFixed(1)+'k';if(a>=100)return Math.round(x)+'';if(a>=10)return x.toFixed(1);return x.toFixed(2)};
const fmtUsers=u=>u>=1e6?(u/1e6).toFixed(u>=1e7?0:1).replace(/\.0$/,'')+' million':u>=1000?Math.round(u).toLocaleString('en-US'):Math.round(u)+'';
const fmtT=s=>{if(!isFinite(s))return 'unbounded';if(s<1e-3)return (s*1e6).toFixed(0)+' &micro;s';if(s<1)return (s*1e3).toFixed(s<0.01?1:0)+' ms';if(s<60)return s.toFixed(s<10?2:1)+' s';return (s/60).toFixed(1)+' min'};
const fmtUSD=x=>{if(x>=1e6)return '$'+(x/1e6).toFixed(x>=1e7?1:2)+'M';if(x>=1e4)return '$'+Math.round(x/1e3)+'k';if(x>=1000)return '$'+(x/1e3).toFixed(1)+'k';if(x>=10)return '$'+Math.round(x);return '$'+x.toFixed(2)};
const pct=r=>r===null||r===undefined?'':(!isFinite(r)?'&infin;':r>=10?Math.round(r*100).toLocaleString('en-US')+'%':(r*100).toFixed(r<0.1?1:0)+'%');
const col=r=>r>=1?'var(--bad)':r>=SM.HOT?'var(--c5)':'var(--good)';
window.SM_UI={fmtN,fmtT,pct,col,NAMES};
// ---- what breaks next: the user count at which each component reaches 80%
function usersAt(st,k,target){
  const val=u=>SM.hotValue(SM.evaluate(Object.assign({},st,{users:u}),false),k);
  if(val(st.users)>=target)return st.users;
  let lo=Math.log10(Math.max(1,st.users)),hi=10;if(val(1e10)<target)return Infinity;
  for(let i=0;i<40;i++){const m=(lo+hi)/2;if(val(10**m)>=target)hi=m;else lo=m}
  return 10**hi;
}
function nextLine(st,o){
  const rows=SM.KEYS.filter(k=>o[k]).map(k=>({k,r:o[k].rho,h:SM.hotValue(o,k)}));
  const broken=rows.filter(x=>x.h>=1).sort((a,b)=>b.h-a.h);
  const w=o.work;
  let wnote='';
  if(w&&w.rho>=1&&w.rho_avg<1)wnote=` Queue workers are behind in the busy hour (${pct(w.rho)} of capacity) but keep up over the day (${pct(w.rho_avg)}): the queue holds the backlog, about ${fmtN((o.rates.jobs-w.c/w.S)*3600)} jobs per busy hour, and drains later. That is the queue's job.`;
  if(broken.length){const b=broken[0];
    return{cls:'bad',html:`<b>Broken now: ${NAMES[b.k]} at ${pct(b.r)}.</b> Requests arrive faster than it can serve them, so its queue grows until requests time out; latency is unbounded.`+(broken.length>1?` Also over capacity: ${broken.slice(1).map(x=>NAMES[x.k]+' ('+pct(x.r)+')').join(', ')}.`:'')+wnote}}
  const hot=rows.filter(x=>x.h>=SM.HOT).sort((a,b)=>b.h-a.h);
  if(hot.length){const b=hot[0];return{cls:'warn',html:`<b>Running hot: ${NAMES[b.k]} at ${pct(b.r)}.</b> Waits grow like 1/(1 &minus; &rho;): from here, 10% more traffic adds far more than 10% more waiting.`+wnote}}
  let best=null;for(const x of rows){const u=usersAt(st,x.k,0.8);if(!best||u<best.u)best={k:x.k,u}}
  if(!best||!isFinite(best.u))return{cls:'ok',html:'<b>Nothing is near its limit.</b>'+wnote};
  return{cls:'ok',html:`<b>Nothing is near its limit.</b> Next to break: <b>${NAMES[best.k]}</b>, which reaches 80% at about <b>${fmtUsers(best.u)}</b> users with this design.`+wnote};
}
SM.nextLine=nextLine;
// ---- what the fix does, in words
function fixText(f,st){
  if(!f||!f.st)return 'Nothing to fix: every component is under 70% busy. Push the users slider to the right.';
  const s=f.st;const sz=D.db.sizes;
  const T={
   avail:`Add a second app server behind a <b>load balancer</b>. Not for speed (look at the bars): one server is a single point of failure, and with two you can also deploy or restart one at a time. Works because the servers are <b>stateless</b>: any server can answer any request, since sessions and data live in the database.`,
   idx:`Add an <b>index</b> on the column the reads filter by (the conversation id). A lookup then reads a few pages of a sorted tree instead of every stored message; the cost is a little extra work on every write and some disk.`,
   cache:`Put a <b>cache</b> in front of the database (cache-aside: look in the cache first, on a miss read the database and store the answer): ${s.cache_n} node${s.cache_n>1?'s':''}, ${Math.round(s.hit*100)}% of reads answered from memory. The cost: cached data can be stale until it expires or is invalidated.`,
   replicas:`Add <b>read replicas</b>, copies of the database that serve reads (${s.replicas} per shard). The primary still takes every write; the cost is replication lag, so a read can briefly miss a write that just happened.`,
   db_size:`<b>Scale the database up</b> to db.r7g.${sz[s.db_size][0]} (${sz[s.db_size][1]} vCPUs): vertical scaling, the simplest fix. The price doubles with each size and there is a largest machine, so it buys time rather than solving growth.`,
   shards:`<b>Shard</b> the database into ${s.shards} pieces by user id: each shard holds 1/${s.shards} of the users and takes 1/${s.shards} of the writes. The cost: queries across users get hard, and moving data between shards later is real work.`,
   async:`Move the per-message jobs onto a <b>queue</b> processed by ${s.workers_n} worker machine${s.workers_n>1?'s':''}. The user no longer waits for them, and the workers can be sized for the day's average because the queue absorbs the busy hour. The cost: the work happens later (seconds to minutes), and every job must be safe to run twice, since queues deliver at least once.`,
   app_n:`Add app servers (<b>horizontal scaling</b>): ${s.app_n} behind the load balancer.`,
   cache_n:`Add cache nodes: ${s.cache_n}, each holding part of the keys.`,
   workers_n:`Add queue workers: ${s.workers_n} machines, sized for the day's average job rate.`,
   gpu_r:`Add GPU replicas: ${s.gpu_r.toLocaleString('en-US')} (each two H100s). It is the expensive lever; the cheaper ones are a smaller model for easy requests, shorter answers, and caching repeated prompt prefixes.`};
  return T[f.what]||'';
}
SM.PRESETS=PRESETS;
// ---- controls
const logMap=(min,max)=>({to:p=>Math.max(min,Math.min(max,Math.round(min*Math.pow(max/min,p/1000)))),from:x=>Math.round(1000*Math.log(Math.max(min,x)/min)/Math.log(max/min))});
const CT=[
 {g:'Traffic',h:'how uneven the day is',items:[
  {k:'peak',t:'num',min:1,max:6,step:0.5,lab:'Busy-hour factor',help:'busiest hour / daily average (illustrative; the Reading uses 2)',f:x=>x+'\u00d7'}]},
 {g:'App tier',h:'stateless API servers behind a load balancer',items:[
  {k:'app_n',t:'log',min:1,max:20000,lab:'App servers',help:'m7i.xlarge, 4 vCPUs each; 5 ms of CPU per request (illustrative)'}]},
 {g:'Database and cache',h:'PostgreSQL on RDS, with an optional Redis cache',items:[
  {k:'idx',t:'chk',lab:'Index on the messages table',help:'without it every read scans the whole table'},
  {k:'db_size',t:'sel',lab:'Instance size (each node)',opts:D.db.sizes.map((x,i)=>[i,'db.r7g.'+x[0]+' ('+x[1]+' vCPUs)'])},
  {k:'replicas',t:'int',min:0,max:5,lab:'Read replicas per shard',help:'copies that serve reads; the primary takes writes'},
  {k:'shards',t:'sel',lab:'Shards',opts:[1,2,4,8,16,32,64,128,256,512,1024].map(x=>[x,x+''])},
  {k:'cache_n',t:'logz',min:1,max:1024,lab:'Cache nodes (0 = no cache)',help:'cache.r7g.large, about 100,000 operations/s each'},
  {k:'hit',t:'num',min:0.5,max:0.99,step:0.01,lab:'Cache hit rate',help:'share of reads answered by the cache',f:x=>Math.round(x*100)+'%'}]},
 {g:'Queue and workers',h:'slow per-message jobs',items:[
  {k:'async',t:'chk',lab:'Run jobs on a queue (asynchronously)',help:'off: the request does them before replying'},
  {k:'workers_n',t:'log',min:1,max:20000,lab:'Worker machines',help:'m7i.xlarge, one job per vCPU'}]},
 {g:'GPU pool',h:'Llama 3.3 70B FP8, two H100s per replica',items:[
  {k:'gpu_r',t:'log',min:1,max:20000,lab:'Replicas',help:'two H100 SXM each, $7.98/hour'},
  {k:'batch',t:'int',min:1,max:512,lab:'Batch limit (streams per replica)',help:'more streams: more tokens/s per GPU, slower per user'},
  {k:'isl',t:'log',min:100,max:32000,lab:'Input tokens per request',help:'prompt plus conversation history'},
  {k:'osl',t:'log',min:50,max:4000,lab:'Output tokens per reply'}]}
];
function buildCtls(){
  const host=$('sm-ctls');let h='';
  CT.forEach((g,gi)=>{h+=`<details class="sm-grp"${gi<2?' open':''}><summary>${g.g} <span>${g.h}</span></summary><div class="sm-ctl">`;
   g.items.forEach(it=>{const id='sm-c-'+it.k;
    if(it.t==='chk')h+=`<label><input type="checkbox" id="${id}" data-k="${it.k}"> ${it.lab}<span class="h">${it.help||''}</span></label>`;
    else if(it.t==='sel')h+=`<label>${it.lab}<select id="${id}" data-k="${it.k}">${it.opts.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select></label>`;
    else{const mn=it.t==='log'||it.t==='logz'?0:it.min,mx=it.t==='log'||it.t==='logz'?1000:it.max,stp=it.step||1;
     h+=`<label>${it.lab}: <b id="${id}-v"></b><input type="range" id="${id}" data-k="${it.k}" min="${mn}" max="${mx}" step="${stp}" aria-label="${it.lab}"><span class="h">${it.help||''}</span></label>`}
   });h+='</div></details>'});
  host.innerHTML=h;
  CT.forEach(g=>g.items.forEach(it=>{const el=$('sm-c-'+it.k);
   const L=it.t==='log'?logMap(it.min,it.max):it.t==='logz'?logMap(it.min,it.max):null;it.L=L;
   el.addEventListener('input',()=>{let x;
    if(it.t==='chk')x=el.checked;else if(it.t==='sel')x=+el.value;else if(it.t==='log')x=L.to(+el.value);else if(it.t==='logz')x=+el.value===0?0:L.to(+el.value);else x=+el.value;
    if(cur[it.k]===x)return;pushHist();cur=Object.assign({},cur,{[it.k]:x});presetId=null;view='now';schedule()});
  }));
}
function syncCtls(st){
  CT.forEach(g=>g.items.forEach(it=>{const el=$('sm-c-'+it.k),x=st[it.k];if(!el)return;
   if(it.t==='chk')el.checked=!!x;else if(it.t==='sel')el.value=String(x);
   else if(it.t==='log')el.value=it.L.from(x);else if(it.t==='logz')el.value=x===0?0:Math.max(1,it.L.from(x));else el.value=x;
   const lv=$('sm-c-'+it.k+'-v');
   if(lv){let s=it.f?it.f(x):(it.k==='cache_n'&&x===0?'off':Number(x).toLocaleString('en-US'));
    if(it.k==='batch'){const g=SM.gpuConsts(st);if(g.bmax<x)s+=` <span class="mute">(memory allows ${g.bmax})</span>`}
    lv.innerHTML=s}
   if(it.k==='workers_n')el.disabled=!st.async;
  }));
}
function pushHist(){hist.push(cur);if(hist.length>60)hist.shift()}
SM.UI_STATE={get cur(){return cur},get view(){return view},get oNow(){return oNow},get oAfter(){return oAfter},get fix(){return fix}};
// ---- render
let pending=false;
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;render()})}
function barsHTML(o){
  let h='';
  SM.KEYS.forEach(k=>{const x=o[k];
   if(!x){h+=`<div class="row"><span class="nm">${NAMES[k]}<small>not used</small></span><span class="track"></span><span class="val mute">off</span></div>`;return}
   const r=x.rho,w=Math.min(1,r/1.5)*100;
   const detail=k==='gpu'?`${fmtN(x.lam)} msg/s; ${x.n_eff.toFixed(0)} of ${x.B} slots in use`:k==='work'?`peak ${pct(r)}, day ${pct(x.rho_avg)}`:`${fmtN(x.lam)}/s per node, ${x.c} server${x.c>1?'s':''}`;
   const avg=k==='work'?`<span class="avg" style="left:calc(${Math.min(1,x.rho_avg/1.5)*100}% - 1px)" title="daily average"></span>`:'';
   h+=`<div class="row${r>=1?' hl':''}"><span class="nm">${NAMES[k]}<small>${detail}</small></span><span class="track"><span class="fill" style="width:${w}%;background:${col(r)}"></span><span class="lim" style="left:66.67%"></span>${avg}</span><span class="val">${pct(r)}<small>${isFinite(x.Lq)?fmtN(x.Lq)+' waiting':'queue grows'}</small></span></div>`});
  return h+'<div class="small mute" style="margin-top:2px">Bars run to 150%; the dashed line is 100% (capacity). Under each name: arrival rate per node and number of parallel servers. Right: utilisation and L<sub>q</sub>, requests waiting on average.'+(o.work?' The black tick on the workers bar is the daily average.':'')+'</div>';
}
function statsHTML(o,st){
  const L=o.lat,g=o.gpu,c=o.cost;
  const kvGB=g.kv_used/1e9;
  const it=[
   ['Time to first token',`${fmtT(L.ttft50)} <span class="mute" style="font-size:13px">p50</span>`,`p99 ${fmtT(L.ttft99)}`],
   ['Full reply ('+st.osl.toLocaleString('en-US')+' tokens)',`${fmtT(L.rep50)} <span class="mute" style="font-size:13px">p50</span>`,`p99 ${fmtT(L.rep99)}; ${g.speed.toFixed(0)} tokens/s per user`],
   ['Cost per month',fmtUSD(c.total),`GPU ${Math.min(c.gpu<c.total?99:100,Math.round(100*c.gpu/c.total))}% of it; ${fmtUSD(c.total/Math.max(1,st.users))} per user`],
   ['GPU replica',`${fmtN(g.tps_rep)} tok/s`,`at full batch (${g.B}); KV memory in use ${kvGB.toFixed(1)} of ${(o.gc.kv_avail/1e9).toFixed(1)} GB`],
   ['Messages per second',fmtN(o.rates.msg),`busy hour; ${fmtN(o.rates.req)} API requests/s`]];
  return it.map(x=>`<div class="stat"><div class="k">${x[0]}</div><div class="v">${x[1]}</div><div class="d">${x[2]}</div></div>`).join('');
}
function cmpHTML(a,b,f){
  if(!b)return '';
  const rows=[['Bottleneck',o=>{let k=SM.KEYS[0];SM.KEYS.forEach(q=>{if(SM.hotValue(o,q)>SM.hotValue(o,k))k=q});return NAMES[k]+' '+pct(o[k].rho)},null],
   ['p50 time to first token',o=>o.lat.ttft50,fmtT],['p99 time to first token',o=>o.lat.ttft99,fmtT],['p99 full reply',o=>o.lat.rep99,fmtT],['Cost per month',o=>o.cost.total,fmtUSD]];
  let h='<tr><th>Same load</th><th class="num">Before</th><th class="num">After the fix</th></tr>';
  rows.forEach(r=>{const x=r[1](a),y=r[1](b);
   if(!r[2]){h+=`<tr><td>${r[0]}</td><td class="num">${x}</td><td class="num">${y}</td></tr>`;return}
   const better=r[0].startsWith('Cost')?y<x:(y<x);const cl=x===y?'':(r[0].startsWith('Cost')?(y>x?'worse':'better'):(better?'better':'worse'));
   h+=`<tr><td>${r[0]}</td><td class="num">${r[2](x)}</td><td class="num ${cl}">${r[2](y)}</td></tr>`});
  return h;
}
function render(){
  oNow=SM.evaluate(cur);
  fix=SM.suggestFix(cur);
  oAfter=fix.st?SM.evaluate(fix.st):null;
  if(view==='after'&&!oAfter)view='now';
  const st=view==='after'?fix.st:cur,o=view==='after'?oAfter:oNow;
  $('sm-uv').textContent=fmtUsers(cur.users);
  $('sm-u').value=Math.round(100*Math.log10(Math.max(1,cur.users)));
  document.querySelectorAll('#sm-presets button').forEach(b=>b.classList.toggle('on',b.dataset.p===presetId));
  const P=PRESETS.find(p=>p.id===presetId);$('sm-cap').innerHTML=P?P.cap:'Your own settings. Pick a preset to return to a step of the Reading.';
  const nl=nextLine(st,o);const nx=$('sm-next');nx.className='sm-next '+nl.cls;nx.innerHTML=(view==='after'?'<b>After the fix.</b> ':'')+nl.html;
  $('sm-bars').innerHTML=barsHTML(o);
  $('sm-stats').innerHTML=statsHTML(o,st);
  $('sm-fixtext').innerHTML=fixText(fix,cur);
  $('sm-cmp').innerHTML=cmpHTML(oNow,oAfter,fix);
  $('sm-apply').disabled=!fix.st;$('sm-undo').disabled=!hist.length;
  document.querySelectorAll('#sm-view button').forEach(b=>{b.classList.toggle('on',b.dataset.v===view);if(b.dataset.v==='after')b.disabled=!fix.st});
  $('sm-viewlab').textContent=view==='after'?'After the fix':'Now';
  syncCtls(st);
  if(window.SM_DIA)window.SM_DIA.update(st,o);
}
function buildSources(){
  const rows=[];const v=SM.v;const W=D.workload,G=D.gpu;
  const kind=k=>{const c=/fitted/.test(k)?'fit':/derived/.test(k)?'der':/illustrative/.test(k)?'ill':'pub';const l=/fitted/.test(k)?'fitted':/derived/.test(k)?'derived':/illustrative/.test(k)?'illustrative':(/vendor/.test(k)?'published (vendor)':'published');return `<span class="kind ${c}">${l}</span>`};
  const a=(u,t)=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`;
  const add=(n,val,k,note,src)=>rows.push(`<tr><td>${n}</td><td class="num">${val}</td><td>${kind(k)}</td><td>${note||''}${src?' ('+src+')':''}</td></tr>`);
  add('Messages per user per day',v(W.msgs_per_user_day),'illustrative',W.msgs_per_user_day.note);
  add('Other API calls per message',v(W.api_per_msg),'illustrative',W.api_per_msg.note);
  add('Busy-hour factor (default)',v(W.peak_factor)+'&times;','illustrative',W.peak_factor.note);
  add('Database reads per API call',v(W.reads_per_req),'illustrative','');
  add('Database writes per message',v(W.writes_per_msg),'illustrative',W.writes_per_msg.note);
  add('Jobs per message, CPU each',v(W.jobs_per_msg)+', '+v(W.job_cpu_s)*1000+' ms','illustrative',W.jobs_per_msg.note);
  add('App server CPU per request',v(D.app.cpu_per_req_s)*1000+' ms','illustrative','4 vCPUs give 800 requests/s per server');
  add('App server price','$'+D.app.price_h+'/h','published','m7i.xlarge on demand, us-east-1, from the AWS price list via',a(D.app.price_src,'Vantage'));
  add('Load balancer','$'+D.lb.price_h+'/h + $'+D.lb.lcu_h+'/LCU-h','published','one LCU = 25 new connections/s; estimated as one connection per request (an upper bound)',a(D.lb.src,'AWS'));
  add('DB read, write, replica replay',v(D.db.read_cpu_s)*1000+', '+v(D.db.write_cpu_s)*1000+', '+v(D.db.replica_apply_cpu_s)*1000+' ms CPU','illustrative','indexed read; insert with index and log upkeep; a replica replaying a write');
  add('Scan without an index',fmtN(v(D.db.scan_rows_per_s))+' rows/s/core, '+v(D.db.rows_per_user)+' rows per user','illustrative','order of magnitude for a sequential scan');
  add('DB price','$'+D.db.price_per_vcpu_h+' per vCPU-hour','published',D.db.price_note,a(D.db.price_src[0],'large')+', '+a(D.db.price_src[1],'2xlarge')+', '+a(D.db.price_src[2],'16xlarge'));
  add('Cache throughput per node',fmtN(v(D.cache.ops_per_s))+' ops/s','published (rounded)',D.cache.ops_per_s.note,a(D.cache.ops_per_s.src,'redis.io'));
  add('Cache price, hit rate','$'+D.cache.price_h+'/h, '+v(D.cache.hit_rate)*100+'%','published',`cache.r7g.large on demand; the hit rate is illustrative`,a(D.cache.price_src,'Vantage'));
  add('Queue price','$'+D.queue.price_per_million+' per million calls','published','SQS standard, first million free each month; 3 calls per job',a(D.queue.src,'AWS price list, 2026-09-11'));
  add('GPU throughput',G.published_tps_per_gpu.v.toLocaleString('en-US')+' tok/s per GPU','published (vendor)',G.published_tps_per_gpu.note+'; a vendor maximum-load figure, not an independent measurement',a(G.published_tps_per_gpu.src,'TensorRT-LLM, file of 2026-09-11'));
  add('H100 SXM','80 GB, 3.35 TB/s, 1,979 TFLOPS FP8 dense','published',G.hw_note,a(G.hw_src,'NVIDIA'));
  add('Model weights, KV layout','72.7 GB; 80 layers, 8 KV heads of 128, FP8','published','checkpoint size and config',a('https://huggingface.co/nvidia/Llama-3.3-70B-Instruct-FP8','Hugging Face'));
  add('KV memory share',v(G.kv_mem_fraction)*100+'% of free memory','published',G.kv_mem_fraction.note,a(G.kv_mem_fraction.src,'TensorRT-LLM'));
  add('Prefill efficiency',v(G.prefill_mfu)*100+'% of FP8 peak','illustrative','');
  add('GPU price','$'+v(G.price_gpu_h)+' per GPU-hour','published',G.price_gpu_h.note,a(G.price_gpu_h.src,'Lambda'));
  add('Step time a, b','10.8 ms, 0.092 ms','derived','a from bandwidth; b fitted to the throughput above (see the text)');
  $('sm-src').innerHTML='<tr><th>Default</th><th class="num">Value</th><th>Kind</th><th>Note and source</th></tr>'+rows.join('');
}
function init(){
  if(init.done){render();return}init.done=true;
  $('sm-presets').innerHTML=PRESETS.map(p=>`<button type="button" data-p="${p.id}">${p.lab}</button>`).join('');
  document.querySelectorAll('#sm-presets button').forEach(b=>b.addEventListener('click',()=>{const p=PRESETS.find(x=>x.id===b.dataset.p);pushHist();cur=Object.assign({},p.st);presetId=p.id;view='now';schedule()}));
  $('sm-u').addEventListener('input',()=>{const u=Math.round(10**(+$('sm-u').value/100));if(u===cur.users)return;cur=Object.assign({},cur,{users:u});presetId=null;view='now';schedule()});
  $('sm-u').addEventListener('change',()=>{});
  document.querySelectorAll('#sm-view button').forEach(b=>b.addEventListener('click',()=>{if(b.disabled)return;view=b.dataset.v;render()}));
  $('sm-apply').addEventListener('click',()=>{if(!fix||!fix.st)return;pushHist();cur=fix.st;presetId=null;view='now';render()});
  $('sm-undo').addEventListener('click',()=>{if(!hist.length)return;cur=hist.pop();presetId=null;view='now';render()});
  buildCtls();buildSources();render();
}
(window.TAB_RENDER=window.TAB_RENDER||{})['t-sim']=(window.TAB_RENDER['t-sim']||[]).concat([init]);
})();
