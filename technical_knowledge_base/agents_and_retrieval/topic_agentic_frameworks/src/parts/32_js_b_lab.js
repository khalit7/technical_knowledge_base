// ---- Orchestration lab (t-orch): helpers, the pattern replay, results ----
window.OU=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-orch']=window.TAB_RENDER['t-orch']||[]).push(f)};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(880,(document.documentElement.clientWidth||900)-60))};
  const fmt=n=>Math.round(n).toLocaleString('en-GB');
  const sec=n=>(n<10?n.toFixed(1):Math.round(n).toString())+' s';
  const usd=n=>'$'+(n<0.1?n.toFixed(3):n.toFixed(2));
  // step animation: o {card, ctl, n, draw(i), delay(i) ms before leaving step i, label}
  function anim(o){
    const card=document.getElementById(o.card),ctl=document.getElementById(o.ctl);
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label>';
    const $=s=>document.getElementById(pid+s);
    function show(){const sc=$('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    const dl=()=>(o.delay?o.delay(st.i):1200)/st.spd;
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}
      st.timer=setTimeout(tick,dl())}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,dl());else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;$('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    $('p').addEventListener('click',()=>setPlay(!st.play));
    $('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    $('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    $('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    $('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},get i(){return st.i}};
  }
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  let rt=0;addEventListener('resize',()=>{const t=document.getElementById('t-orch');if(!t||t.hidden)return;clearTimeout(rt);rt=setTimeout(()=>(window.TAB_RENDER['t-orch']||[]).forEach(f=>{try{f()}catch(e){}}),80)});
  return {RM,esc,stat,onRender,width,fmt,sec,usd,anim,seg};
})();

(function(){
  const D=window.ORCH,U=window.OU,esc=U.esc;if(!D)return;
  const P=D.patterns;
  const NAMES={chain:'Prompt chaining',route:'Routing',parallel:'Parallelisation',orch:'Orchestrator-workers',evalopt:'Evaluator-optimizer',agent:'Free agent'};
  const KEYS=['chain','route','parallel','orch','evalopt','agent'];
  const hidN=h=>h.filter(x=>x[1]).length;
  // agent: events from the message timestamps; the start is shifted so the run ends at the driver's wall time
  function agentEvents(A){
    const st=A.steps;const last=st.length?st[st.length-1].t:0;const off=Math.max(0,A.wall-last-0.2);const ev=[];
    let prev=0,ui=0,pend=null;
    st.forEach((s,k)=>{if(s.ui)ui+=s.ui;
      if(s.k==='tool'){ev.push({k:'llm',n:'model',l:'model turn',t0:off+prev,t1:off+s.t,i:ui,o:0,c:0});ui=0;pend={k:'tool',n:'tools',l:s.tool+': '+s.x,t0:off+s.t,t1:off+s.t,tool:s.tool,x:s.x}}
      else if(s.k==='result'&&pend){pend.t1=off+s.t;pend.res=s.x;pend.err=s.err;ev.push(pend);pend=null;prev=s.t}});
    ev.push({k:'llm',n:'model',l:'final answer',t0:off+prev,t1:off+last,i:ui,o:0,c:0});
    const e0={k:'code',n:'start',l:'CLI start-up and first model call (no per-message time before the first message)',t0:0,t1:off,d:''};
    return [e0].concat(ev);
  }
  const EV={};KEYS.forEach(k=>{EV[k]=k==='agent'?agentEvents(D.agent):P[k].ev});
  const WALL=k=>k==='agent'?D.agent.wall:P[k].wall;
  function totals(k){if(k==='agent'){const u=D.agent.usage;return {calls:D.agent.steps.filter(s=>s.ui).length,tok:u.i+u.cw+u.cr,out:u.o,cost:D.agent.cost,hid:hidN(D.agent.hidden),wall:D.agent.wall,th:u.th}}
    const ev=P[k].ev.filter(e=>e.k==='llm');return {calls:ev.length,tok:ev.reduce((a,e)=>a+e.i,0),out:ev.reduce((a,e)=>a+e.o,0),cost:ev.reduce((a,e)=>a+e.c,0),hid:hidN(P[k].hidden),wall:P[k].wall,th:ev.reduce((a,e)=>a+e.th,0)}}
  const TOT={};KEYS.forEach(k=>TOT[k]=totals(k));
  window.ORCH_TOT=TOT;
  // ---- values written into the prose ----
  const llmAll=[].concat(...['chain','route','parallel','orch','evalopt'].map(k=>P[k].ev.filter(e=>e.k==='llm')));
  const ov=llmAll.filter(e=>e.api).map(e=>e.t1-e.t0-e.api/1000);
  const V={date:D.date,'base.hidden':hidN(D.baseline.hidden)+' of 6',ccver:D.agent.version,lgver:D.versions.langgraph,lgsqlver:D.versions.langgraph_checkpoint_sqlite,
    emdash:String(D.emdash),'den.n':String(D.agent_denied.denials),ovh:Math.min(...ov).toFixed(1)+' to '+Math.max(...ov).toFixed(1)+' s'};
  {const e=P.chain.ev.find(x=>x.k==='llm');const rc=e.i*1e-6+e.o*5e-6;V.costchk=U.fmt(e.i)+' input and '+U.fmt(e.o)+' output tokens give $'+rc.toFixed(6)+'; the record says $'+e.c.toFixed(6)+(Math.abs(rc-e.c)<1e-7?' (exact)':' (differs)')}
  window.ORCH_V=V;
  function fillV(){document.querySelectorAll('#t-orch .orch-v').forEach(el=>{const v=(window.ORCH_V||{})[el.dataset.v];if(v!=null)el.textContent=v})}
  fillV();U.onRender(fillV);
  document.getElementById('orch-hidlist').innerHTML='<ol class="tight" style="margin-top:4px">'+D.baseline.hidden.map(h=>'<li>'+esc(h[0])+' <span class="'+(h[1]?'orch-ok':'orch-no')+'">'+(h[1]?'passes':'fails')+' before any fix</span></li>').join('')+'</ol>';
  // ---- graph layouts: s = stage (order), r = lane ----
  const G={
    chain:{n:[['diagnose','diagnose','llm',0,0],['gate','gate: both tests named?','code',1,0],['fix','write the fix','llm',2,0],['apply','write core.py','code',3,0],['test','tests + hidden','code',4,0]],e:[['diagnose','gate'],['gate','fix'],['fix','apply'],['apply','test']]},
    route:{n:[['router','router: classify','llm',0,.5],['dispatch','dispatch','code',1,.5],['h_text_parsing','parsing specialist','llm',2,0],['h_ordering','sorting specialist','llm',2,1],['merge','merge functions','code',3,.5],['test','tests + hidden','code',4,.5]],e:[['router','dispatch'],['dispatch','h_text_parsing'],['dispatch','h_ordering'],['h_text_parsing','merge'],['h_ordering','merge'],['merge','test']]},
    parallel:{n:[['w0','worker: test 1','llm',0,0],['w1','worker: test 2','llm',0,1],['merge','merge functions','code',1,.5],['test','tests + hidden','code',2,.5]],e:[['w0','merge'],['w1','merge'],['merge','test']]},
    orch:{n:[['orchestrator','orchestrator: plan','llm',0,.5],['plan','parse plan','code',1,.5],['w0','worker 1','llm',2,0],['w1','worker 2','llm',2,1],['merge','merge + tests','code',3,.5],['synth','orchestrator: check','llm',4,.5],['apply','apply','code',5,.5],['test','tests + hidden','code',6,.5]],e:[['orchestrator','plan'],['plan','w0'],['plan','w1'],['w0','merge'],['w1','merge'],['merge','synth'],['synth','apply'],['apply','test']]},
    evalopt:{n:[['generator','generator','llm',0,.5],['tests','run tests','code',1,.5],['evaluator','strict reviewer','llm',2,.5],['loop','feedback','code',3,.5],['test','tests + hidden','code',4,.5]],e:[['generator','tests'],['tests','evaluator'],['evaluator','loop'],['loop','generator',1],['evaluator','test']]},
    agent:{n:[['start','start-up','code',0,.5],['model','model (decides)','llm',1,.5],['tools','tools: Read, Edit, Bash...','tool',2,.5]],e:[['start','model'],['model','tools'],['tools','model',1]]}
  };
  const COL={llm:'var(--c1)',code:'var(--dim)',tool:'var(--c2)'};
  function drawGraph(key,T,W){
    const g=G[key],ev=EV[key];const ns=Math.max(...g.n.map(x=>x[3]))+1,nl=Math.max(...g.n.map(x=>x[4]))+1;
    const hor=W>=600,bw=hor?Math.min(132,W/ns-14):Math.min(170,(W-30)/Math.max(1,nl)-14),bh=hor?36:30;
    const H=hor?nl*54+18:ns*48+12;
    const pos={};g.n.forEach(n=>{const s=n[3],r=n[4];pos[n[0]]=hor?{x:(s+.5)*W/ns,y:22+r*54+bh/2-4}:{x:nl>1?(r+.5)*(W/nl):W/2,y:8+s*48+bh/2}});
    let s='';
    g.e.forEach(e=>{const a=pos[e[0]],b=pos[e[1]];if(e[2]){const dx=hor?0:bw/2+18,dy=hor?bh/2+14:0;
      s+='<path d="M'+(a.x+(hor?0:bw/2))+' '+(a.y+(hor?bh/2:0))+' C'+(a.x+dx+ (hor?0:20))+' '+(a.y+dy+(hor?10:0))+','+(b.x+dx+(hor?0:20))+' '+(b.y+dy+(hor?10:0))+','+(b.x+(hor?0:bw/2))+' '+(b.y+(hor?bh/2:0))+'" fill="none" stroke="var(--mute)" stroke-dasharray="4 3" marker-end="url(#orch-ar)"/>';return}
      const x1=hor?a.x+bw/2:a.x,y1=hor?a.y:a.y+bh/2,x2=hor?b.x-bw/2-3:b.x,y2=hor?b.y:b.y-bh/2-3;
      s+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" marker-end="url(#orch-ar)"/>'});
    g.n.forEach(n=>{const p=pos[n[0]],mine=ev.filter(e=>e.n===n[0]);const act=mine.some(e=>e.t0<=T&&T<e.t1)||mine.some(e=>e.t0===T&&e.t1===T);
      const done=mine.length&&mine.every(e=>e.t1<=T)&&!act;const runs=mine.filter(e=>e.t0<=T).length;
      const fill=act?COL[n[2]]:'var(--bg)',stroke=COL[n[2]],tc=act?'var(--bg)':'var(--ink)';
      s+='<rect x="'+(p.x-bw/2)+'" y="'+(p.y-bh/2)+'" width="'+bw+'" height="'+bh+'" rx="7" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(act?2.5:1.5)+'"'+(done?' opacity=".75"':'')+'/>';
      const lab=n[1].length*6>bw-8?n[1].slice(0,Math.max(4,Math.floor((bw-8)/6)-1))+'…':n[1];
      s+='<text x="'+p.x+'" y="'+(p.y+4)+'" text-anchor="middle" fill="'+tc+'" font-size="11">'+esc(lab)+'</text>';
      if(runs>1)s+='<text x="'+(p.x+bw/2-3)+'" y="'+(p.y-bh/2+10)+'" text-anchor="end" font-size="9.5" fill="'+tc+'">×'+runs+'</text>';
      if(done)s+='<text x="'+(p.x-bw/2+4)+'" y="'+(p.y-bh/2+10)+'" font-size="9.5" fill="var(--good)">✓</text>'});
    return '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(NAMES[key])+' graph"><defs><marker id="orch-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--mute)"/></marker></defs>'+s+'</svg>';
  }
  function drawLanes(keys,T,W){
    const tmax=Math.max(...keys.map(WALL));const lw=Math.min(118,W*.3),x0=lw+4,x1=W-10,sx=t=>x0+(x1-x0)*t/tmax;let y=4,s='';
    const tk=[];const step=tmax>150?60:tmax>40?10:5;for(let t=0;t<=tmax+1e-6;t+=step)tk.push(t);
    keys.forEach((k,ki)=>{const g=G[k],ev=EV[k];
      s+='<text x="0" y="'+(y+11)+'" font-size="11.5" font-weight="600">'+esc(NAMES[k])+' ('+U.sec(WALL(k))+')</text>';y+=16;
      const rows=g.n.map(n=>n[0]).filter(id=>ev.some(e=>e.n===id));
      rows.forEach(id=>{const nd=g.n.find(n=>n[0]===id);const lab=nd[1].length*5.6>lw-4?nd[1].slice(0,Math.floor((lw-4)/5.6)-1)+'…':nd[1];
        s+='<text x="0" y="'+(y+10)+'" font-size="10.5" fill="var(--mute)">'+esc(lab)+'</text>';
        s+='<line x1="'+x0+'" x2="'+x1+'" y1="'+(y+6)+'" y2="'+(y+6)+'" stroke="var(--line)"/>';
        ev.filter(e=>e.n===id).forEach(e=>{const a=sx(e.t0),b=Math.max(sx(e.t1),a+2);const c=e.k==='llm'?'var(--c1)':e.k==='tool'?'var(--c2)':'var(--dim)';
          const vis=e.t0<=T;const w=vis?(Math.min(sx(Math.min(e.t1,T)),b)-a):0;
          s+='<rect x="'+a+'" y="'+y+'" width="'+(b-a)+'" height="12" rx="2" fill="none" stroke="'+c+'" stroke-opacity=".6"/>';
          if(vis)s+='<rect x="'+a+'" y="'+y+'" width="'+Math.max(2,w)+'" height="12" rx="2" fill="'+c+'"/>'});
        y+=17});
      y+=8});
    s+='<line x1="'+x0+'" x2="'+x1+'" y1="'+y+'" y2="'+y+'" stroke="var(--mute)"/>';
    tk.forEach(t=>{s+='<line x1="'+sx(t)+'" x2="'+sx(t)+'" y1="'+y+'" y2="'+(y+4)+'" stroke="var(--mute)"/><text x="'+sx(t)+'" y="'+(y+15)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+t+' s</text>'});
    const px=sx(Math.min(T,tmax));s+='<line x1="'+px+'" x2="'+px+'" y1="0" y2="'+y+'" stroke="var(--bad)" stroke-width="1.5"/>';
    const H=y+20;return '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Timeline of the recorded run">'+s+'</svg>';
  }
  function describe(e,end){
    if(e.k==='llm'){if(!end)return 'starts <b>'+esc(e.l)+'</b>';
      if(e.n==='model')return '<b>'+esc(e.l)+'</b>: the model read '+U.fmt(e.i)+' tokens of context and chose its next move';
      return '<b>'+esc(e.l)+'</b> finished after '+U.sec(e.t1-e.t0)+': '+U.fmt(e.i)+' tokens in, '+U.fmt(e.o)+' out ('+U.fmt(e.th)+' of them thinking)'}
    if(e.k==='tool')return end?'tool <b>'+esc(e.tool)+'</b> returned'+(e.err?' an error':'')+': <code>'+esc((e.res||'').slice(0,90))+'</code>':'calls <b>'+esc(e.tool)+'</b>: <code>'+esc((e.x||'').slice(0,90))+'</code>';
    if(!end)return '';
    let d='';try{const o=JSON.parse(e.d||'{}');
      if('passed' in o&&o.hidden)d=': visible tests '+(o.passed?'<span class="orch-ok">pass</span>':'<span class="orch-no">fail</span>')+', hidden checks '+hidN(o.hidden)+'/6';
      else if('passed' in o)d=': tests '+(o.passed?'pass':'fail');
      else if('ok' in o)d=': '+(o.ok?'yes, continue':'no')+' (named '+o.named.length+' of '+o.failing.length+')';
      else if(o.routes)d=': '+o.routes.map(r=>r.test+' to '+r.category).join('; ');
      else if(o.plan)d=': '+o.plan.length+' subtasks, '+o.plan.map(p=>p.function).join(', ');
      else if(o.replaced)d=': replaced '+(o.replaced.join(', ')||'nothing');
    }catch(x){}
    return '<b>'+esc(e.l)+'</b>'+d}
  let A='chain',B='',an=null,bounds=[0];
  function makeBounds(){const ks=[A].concat(B?[B]:[]);const s=new Set([0]);ks.forEach(k=>EV[k].forEach(e=>{s.add(+e.t0.toFixed(3));s.add(+e.t1.toFixed(3))}));bounds=[...s].sort((a,b)=>a-b)}
  function counters(k,T){const ev=EV[k];let c=0,i=0,o=0,cost=0;ev.forEach(e=>{if(e.k==='llm'&&e.t1<=T){c++;i+=e.i;o+=e.o;cost+=e.c}});
    const end=T>=WALL(k)-1e-6;if(k==='agent'&&end){o=TOT.agent.out;cost=TOT.agent.cost}
    return {c,i,o,cost,end}}
  function draw(si){const T=bounds[si]||0;const W=U.width(document.getElementById('orch-graph'));
    document.getElementById('orch-graph').innerHTML=drawGraph(A,T,W)+(B?'<div class="small mute" style="margin-top:6px">compared with <b>'+esc(NAMES[B])+'</b></div>'+drawGraph(B,T,W):'');
    document.getElementById('orch-lanes').innerHTML=drawLanes([A].concat(B?[B]:[]),T,W);
    const cap=[];[A].concat(B?[B]:[]).forEach(k=>{EV[k].forEach(e=>{if(Math.abs(e.t1-T)<1e-3&&(e.t1>e.t0||e.k!=='code'||e.d))cap.push((B?NAMES[k]+': ':'')+describe(e,true));else if(Math.abs(e.t0-T)<1e-3&&e.t1>e.t0+0.01&&e.k!=='code')cap.push((B?NAMES[k]+': ':'')+describe(e,false))})});
    document.getElementById('orch-cap').innerHTML='<b>'+U.sec(T)+'</b> '+(si===0?'Press play, or step through. Each step is a moment when a call or code step starts or ends.':(cap.filter(Boolean).join('<br>')||'waiting on the model'));
    let h='';[A].concat(B?[B]:[]).forEach(k=>{const c=counters(k,T);const pre=B?NAMES[k]+': ':'';
      h+=U.stat(pre+'model calls done',c.c,'of '+TOT[k].calls)+U.stat(pre+'tokens processed',U.fmt(c.i),'input, cache writes and reads')+U.stat(pre+'tokens written',c.end||k!=='agent'?U.fmt(c.o):'(at the end)','includes thinking')+U.stat(pre+'cost equivalent',c.end||k!=='agent'?U.usd(c.cost):'(at the end)',c.end?'hidden checks '+TOT[k].hid+'/6':'')});
    document.getElementById('orch-cnt').innerHTML=h}
  function calls(){const el=document.getElementById('orch-calls');
    if(A==='agent'){const st=D.agent.steps;el.innerHTML='<div class="orch-steps">'+st.filter(s=>s.k!=='think').map(s=>'<div><span class="mute">'+s.t.toFixed(1)+' s</span><span>'+(s.k==='tool'?'<b>'+esc(s.tool)+'</b>':s.k==='result'?(s.err?'<span class="orch-no">error</span>':'result'):'says')+'</span><span class="x">'+esc(s.x)+'</span></div>').join('')+'</div><p class="small mute">The free agent has no separate calls: one Claude Code session, '+TOT.agent.calls+' model calls (distinct API messages; Claude Code\'s own count is '+D.agent.turns[0]+' turns). Times from message timestamps.</p>';return}
    el.innerHTML=P[A].ev.filter(e=>e.k==='llm').map(e=>'<details class="orch-call"><summary><b>'+esc(e.l)+'</b><span class="m">'+U.sec(e.t1-e.t0)+'</span><span class="m">'+U.fmt(e.i)+' in, '+U.fmt(e.o)+' out ('+U.fmt(e.th)+' thinking)</span><span class="m">'+U.usd(e.c)+'</span></summary><div class="h">System prompt</div><pre>'+esc(e.sys)+'</pre><div class="h">Instruction (end of a '+U.fmt(e.plen)+'-character prompt)</div><pre>'+esc(e.ask)+'</pre><div class="h">Reply (start)</div><pre>'+esc(e.rep)+'</pre></details>').join('')+
      '<details class="orch-call"><summary><b>Final textstats/core.py</b><span class="m">visible tests '+(P[A].passed?'pass':'fail')+', hidden '+hidN(P[A].hidden)+'/6</span></summary><pre>'+esc(P[A].core)+'</pre><div class="h">Hidden checks</div><pre>'+P[A].hidden.map(h=>(h[1]?'pass  ':'FAIL  ')+h[0]).join('\n')+'</pre></details>'}
  const T2=x=>U.sec(x);
  function note(){const p=P,t=TOT;const N={
    chain:'The diagnosis named both failing tests, so the code gate let it through; the fix call turned that diagnosis into a whole new file. Visible tests pass; the regex <code>[a-z\']+</code> also keeps quotes around a word, so one hidden check fails. Two calls, '+T2(t.chain.wall)+'.',
    route:'The router put <code>'+esc(p.route.routes[0].test)+'</code> in <b>'+esc(p.route.routes[0].category)+'</b> and <code>'+esc(p.route.routes[1].test)+'</code> in <b>'+esc(p.route.routes[1].category)+'</b>. The parsing specialist thought for '+U.fmt(p.route.ev.find(e=>e.n==='h_text_parsing').th)+' tokens and wrote <code>[a-z]+(?:\'[a-z]+)*</code>, which keeps apostrophes only between letters: 6 of 6 hidden checks. Fairness note: I wrote the specialist prompts knowing the bug classes, and the parsing one mentions "contractions, case and punctuation". That extra knowledge is what routing is for, and also a head start the other patterns did not get.',
    parallel:'Both calls ran at the same time, each seeing only one failing test and the code. Total '+T2(t.parallel.wall)+', against '+T2(p.parallel.ev.filter(e=>e.k==='llm').reduce((a,e)=>a+e.t1-e.t0,0))+' had they run one after the other. Fastest of the six, and the cheapest; same 5 of 6 hidden checks as the chain.',
    orch:'The orchestrator wrote its own plan: '+p.orch.plan.length+' subtasks, one per function, and its instruction for <code>tokenize</code> already said "Update the pattern to [a-z\']+". The workers did exactly that, and the orchestrator\'s check of the merged file replied "OK". A decision made once at the top flowed down unexamined: 5 of 6.',
    evalopt:'Round 1: the generator wrote <code>[a-z\']+</code>, the tests passed, and the strict reviewer, thinking for '+U.fmt(p.evalopt.ev.find(e=>e.l==='1b_review').th)+' tokens, found that a leading apostrophe ("\'Twas") would be kept. Round 2 fixed it and the reviewer said PASS: 6 of 6. The price: '+T2(t.evalopt.wall)+' and '+U.fmt(t.evalopt.out)+' tokens written, most of it the reviewer thinking.',
    agent:'Claude Code chose every step itself: list the files, try to Read a directory (an error it recovered from), Glob, read the tests, the code and the README, run the tests, two exact-string Edits, run the tests again, stop. '+D.agent.turns[0]+' turns in '+T2(t.agent.wall)+'. It is the only design here that checked its own work by running the tests; in the workflows my code did that. Most of its '+U.fmt(t.agent.tok)+' tokens processed are cache reads ('+U.fmt(D.agent.usage.cr)+'), the harness re-sending the same growing conversation each turn, billed at a tenth of the input price (<a href="https://platform.claude.com/docs/en/build-with-claude/prompt-caching" target="_blank" rel="noopener noreferrer">Anthropic prompt caching docs</a>). 5 of 6 hidden.'};
    document.getElementById('orch-note').innerHTML='<div class="co"><div class="t">What happened in this run</div>'+N[A]+'</div>'}
  function rebuild(){makeBounds();if(an)an.reset(bounds.length);else an=U.anim({card:'orch-rp',ctl:'orch-rc',n:bounds.length,label:'Replay step',draw,delay:i=>Math.max(380,Math.min(2200,((bounds[i+1]||0)-(bounds[i]||0))*260))});calls();note()}
  const pa=document.getElementById('orch-pa');pa.innerHTML=KEYS.map(k=>'<button data-m="'+k+'"'+(k===A?' class="on"':'')+'>'+NAMES[k]+'</button>').join('');
  pa.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;pa.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));A=b.dataset.m;if(B===A)B='';fillB();rebuild()});
  const pb=document.getElementById('orch-pb');
  function fillB(){pb.innerHTML='<option value="">nothing</option>'+KEYS.filter(k=>k!==A).map(k=>'<option value="'+k+'"'+(k===B?' selected':'')+'>'+NAMES[k]+'</option>').join('')}
  fillB();pb.addEventListener('change',()=>{B=pb.value;rebuild()});
  rebuild();
  // ---- results ----
  const M={wall:['Wall time',x=>U.sec(x.wall),x=>x.wall],tok:['Tokens processed',x=>U.fmt(x.tok),x=>x.tok],out:['Tokens written (incl. thinking)',x=>U.fmt(x.out),x=>x.out],cost:['Cost equivalent',x=>U.usd(x.cost),x=>x.cost],hid:['Hidden checks passed (of 6)',x=>x.hid+'/6',x=>x.hid]};
  let met='wall';
  function bars(){const m=M[met];const mx=Math.max(...KEYS.map(k=>m[2](TOT[k])),met==='hid'?6:0);
    document.getElementById('orch-bars').innerHTML=KEYS.map(k=>'<div class="row'+(k===A?' hl':'')+'"><span class="nm">'+NAMES[k]+'</span><span class="track"><span class="fill" style="width:'+(100*m[2](TOT[k])/mx).toFixed(1)+'%;background:'+(k==='agent'?'var(--c2)':'var(--c1)')+'"></span></span><span class="val">'+m[1](TOT[k])+'</span></div>').join('');
    document.getElementById('orch-barnote').textContent=met==='hid'?'All six pass the 3 visible tests. Before any fix, the code passes '+hidN(D.baseline.hidden)+' of the 6 hidden checks.':met==='tok'?'For the agent, almost all of this is cache reads: the conversation re-sent each turn.':'One recording per pattern.'}
  U.seg(document.getElementById('orch-mx'),m=>{met=m;bars()});bars();
  document.getElementById('orch-tab').innerHTML='<thead><tr><th>Pattern</th><th>Who picks the steps</th><th class="num">Model calls</th><th class="num">Wall</th><th class="num">Tokens processed</th><th class="num">Written (thinking)</th><th class="num">Cost eq.</th><th class="num">Visible</th><th class="num">Hidden</th></tr></thead><tbody>'+
    KEYS.map(k=>{const t=TOT[k];return '<tr><td><b>'+NAMES[k]+'</b></td><td>'+(k==='agent'?'the model':k==='orch'?'code, with a model-written plan':'code')+'</td><td class="num">'+t.calls+(k==='agent'?'*':'')+'</td><td class="num">'+U.sec(t.wall)+'</td><td class="num">'+U.fmt(t.tok)+'</td><td class="num">'+U.fmt(t.out)+' ('+U.fmt(t.th)+')</td><td class="num">'+U.usd(t.cost)+'</td><td class="num">3/3</td><td class="num">'+t.hid+'/6</td></tr>'}).join('')+'</tbody>';
  const fast=KEYS.slice().sort((a,b)=>TOT[a].wall-TOT[b].wall);const cheap=KEYS.slice().sort((a,b)=>TOT[a].cost-TOT[b].cost);
  document.getElementById('orch-find').innerHTML=[
    '<b>Every design fixed what the tests check.</b> Two bugs this small do not need orchestration; the differences are in cost and in what the tests do not check.',
    '<b>Fastest: '+NAMES[fast[0]]+'</b> ('+U.sec(TOT[fast[0]].wall)+'), because its two calls overlapped. <b>Slowest: '+NAMES[fast[5]]+'</b> ('+U.sec(TOT[fast[5]].wall)+'), '+(TOT[fast[5]].wall/TOT[fast[0]].wall).toFixed(0)+' times longer and '+(TOT[fast[5]].cost/TOT[cheap[0]].cost).toFixed(0)+' times the cost of the cheapest ('+NAMES[cheap[0]]+', '+U.usd(TOT[cheap[0]].cost)+').',
    '<b>Only the two designs that carried extra knowledge of "correct" passed all six hidden checks</b>: routing (a specialist prompt) and evaluator-optimizer (a reviewer asked to hunt edge cases). The other four wrote the same first-idea regex.',
    '<b>The free agent was competitive</b>: '+U.sec(TOT.agent.wall)+', '+U.usd(TOT.agent.cost)+', and it verified its own fix by running the tests. It processed far more tokens ('+U.fmt(TOT.agent.tok)+') because every turn re-sends the whole conversation, but '+Math.round(100*D.agent.usage.cr/TOT.agent.tok)+'% of them were cheap cache reads.',
    '<b>A permission gate changes behaviour.</b> In an earlier agent run the allow-list admitted <code>python3</code> but the model typed <code>python</code>: '+D.agent_denied.denials+' commands denied, and it edited the code without ever seeing a test run ('+U.sec(D.agent_denied.wall)+', '+U.usd(D.agent_denied.cost)+'). Workflows cannot fall into this; agents need their tools and permissions designed for how the model actually behaves.'
  ].map(x=>'<li>'+x+'</li>').join('');
  // prediction
  const pr=document.getElementById('orch-pr1');pr.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    pr.querySelectorAll('.opts button').forEach(x=>x.classList.toggle('right',x.dataset.a===fast[5]));if(b.dataset.a!==fast[5])b.classList.add('wrong');pr.classList.add('done');
    document.getElementById('orch-pr1a').innerHTML='<b>'+NAMES[fast[5]]+'</b>: '+U.sec(TOT[fast[5]].wall)+'. '+KEYS.filter(k=>k!==fast[5]).map(k=>NAMES[k]+' '+U.sec(TOT[k].wall)).join(', ')+'. The loop ran twice and each strict review thought for over 11,000 tokens: in this run a review cost more than the code it reviewed. The free agent, with no plan at all, finished in '+U.sec(TOT.agent.wall)+'.'});
  U.onRender(()=>{if(an)an.redraw();bars()});
})();
