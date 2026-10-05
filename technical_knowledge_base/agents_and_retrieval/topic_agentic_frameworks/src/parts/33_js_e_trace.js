// ---- Production stack (t-ops): trace viewer and cost attribution ----
(function(){
  const D=window.OPS,U=window.OPU,esc=U.esc;if(!D||!U||!document.getElementById('ops-trf'))return;
  const V=window.OPS_V=window.OPS_V||{};
  const TR=[{id:'manual',l:'Our loop: spans written by hand',sp:D.loop_manual,res:D.loop_manual_res},
    {id:'auto',l:'Our loop: auto-instrumentation only',sp:D.loop_auto,res:D.loop_auto_res},
    {id:'cc',l:'Claude Code\'s own trace',sp:D.cc_spans}].filter(t=>t.sp&&t.sp.length);
  let cur=TR[0],sel=null;
  function tree(sp){const by={},roots=[];sp.forEach(s=>{by[s.id]=Object.assign({kids:[]},s)});
    Object.values(by).forEach(s=>{if(s.p&&by[s.p])by[s.p].kids.push(s);else roots.push(s)});
    const out=[];const walk=(s,d)=>{out.push([s,d]);s.kids.sort((a,b)=>a.t0-b.t0).forEach(k=>walk(k,d+1))};roots.sort((a,b)=>a.t0-b.t0).forEach(r=>walk(r,0));return out}
  const isModel=s=>/^chat |llm_request/.test(s.n);
  const isTool=s=>/^execute_tool|claude_code\.tool$/.test(s.n);
  const tin=s=>+(s.a['gen_ai.usage.input_tokens']||s.a.input_tokens||0)+(+(s.a.cache_read_tokens||0))+(+(s.a.cache_creation_tokens||0));
  const tout=s=>+(s.a['gen_ai.usage.output_tokens']||s.a.output_tokens||0);
  function col(s){return isModel(s)?'var(--c1)':isTool(s)?'var(--c2)':/blocked_on_user/.test(s.n)?'var(--c5)':/execution/.test(s.n)?'var(--c3)':'var(--c4)'}
  function render(){
    const sp=cur.sp,rows=tree(sp),T=Math.max(...sp.map(s=>s.t1),0.001);
    const el=document.getElementById('ops-tree');
    el.innerHTML=rows.map(([s,d],k)=>{const l=s.t0/T*100,w=Math.max(0.3,(s.t1-s.t0)/T*100);
      return '<div class="r'+(sel===s.id?' sel':'')+'" data-id="'+s.id+'" title="'+esc(s.n)+', '+(s.t1-s.t0).toFixed(2)+' s"><div class="nm" style="padding-left:'+(d*10)+'px">'+esc(s.n)+'</div><div class="bar"><span style="left:'+l+'%;width:'+w+'%;background:'+col(s)+(s.st&&/ERROR|2/.test(String(s.st))?';outline:2px solid var(--bad)':'')+'"></span></div></div>'}).join('')+
      '<div class="r" style="cursor:default"><div class="nm mute">0 to '+T.toFixed(1)+' s</div><div class="small mute">bars to scale; click a span for its attributes</div></div>';
    const m=sp.filter(isModel),t=sp.filter(isTool);
    const roots=sp.filter(s=>!s.p||!sp.some(x=>x.id===s.p));
    document.getElementById('ops-trcnt').innerHTML=U.stat('Spans',sp.length,roots.length+' root'+(roots.length>1?'s (no common parent)':''))+
      U.stat('Model-call spans',m.length,'')+U.stat('Tool-call spans',t.length,t.length?'':'tools are invisible')+
      U.stat('Tokens in / out',U.fmt(m.reduce((a,s)=>a+tin(s),0))+' / '+U.fmt(m.reduce((a,s)=>a+tout(s),0)),cur.id==='cc'?'input includes cache reads and writes':'')+
      U.stat('Wall time',U.sec(T),cur.res&&cur.res.turns?cur.res.turns+' turns, tests '+(/0 failed/.test(cur.res.tests||'')?'pass':'fail'):'');
    const s=sp.find(x=>x.id===sel)||null;
    document.getElementById('ops-trattr').innerHTML=s?'<div class="ops-attrs"><div><span class="k">name</span><span>'+esc(s.n)+'</span></div><div><span class="k">kind / status</span><span>'+esc(s.k)+' / '+esc(s.st)+'</span></div><div><span class="k">duration</span><span>'+(s.t1-s.t0).toFixed(3)+' s</span></div>'+
      Object.entries(s.a).map(([k,v])=>'<div><span class="'+(/^gen_ai\./.test(k)?'g':'k')+'">'+esc(k)+'</span><span>'+esc(typeof v==='object'?JSON.stringify(v):v)+'</span></div>').join('')+
      (s.ev&&s.ev.length?'<div><span class="k">events</span><span>'+esc(s.ev.map(e=>e.name+(Object.keys(e.attrs||{}).length?' '+JSON.stringify(e.attrs):'')).join('; ')).slice(0,1500)+'</span></div>':'')+'</div><p class="small mute">Green keys are GenAI semantic-convention attributes; the rest are the emitter\'s own.</p>':'<p class="small mute">Click a span to see its attributes.</p>';
  }
  const pk=document.getElementById('ops-trpick');
  pk.innerHTML=TR.map((t,k)=>'<button data-k="'+k+'"'+(t===cur?' class="on"':'')+'>'+t.l+'</button>').join('');
  pk.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=TR[+b.dataset.k];sel=null;pk.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));render()});
  document.getElementById('ops-tree').addEventListener('click',e=>{const r=e.target.closest('.r[data-id]');if(!r)return;sel=r.dataset.id;render()});
  render();
  // ---------- findings ----------
  const M=D.loop_manual||[],A=D.loop_auto||[],C=D.cc_spans||[];
  const cnt=(sp,f)=>sp.filter(f).length;
  const chatM=M.filter(isModel),costs=chatM.map(s=>+(s.a['litellm.response_cost']||0));
  const fbs=chatM.filter(s=>+(s.a['litellm.attempted_fallbacks']||0)>0).length;
  Object.assign(V,{'tr.m.spans':String(M.length),'tr.a.spans':String(A.length),'tr.c.spans':String(C.length)});
  const ccNames={};C.forEach(s=>ccNames[s.n]=(ccNames[s.n]||0)+1);
  const blocked=C.filter(s=>/blocked_on_user/.test(s.n)),blockedT=blocked.reduce((a,s)=>a+s.t1-s.t0,0);
  const toolT=C.filter(s=>/tool\.execution/.test(s.n)).reduce((a,s)=>a+s.t1-s.t0,0),llmT=C.filter(isModel).reduce((a,s)=>a+s.t1-s.t0,0);
  const ccRoot=C.find(s=>!s.p);
  document.getElementById('ops-trfind').innerHTML='<h3>What the three traces show</h3><ul>'+
    '<li><b>Written by hand:</b> '+M.length+' spans in one tree: one <code>invoke_agent</code> root, '+cnt(M,isModel)+' <code>chat</code> spans and '+cnt(M,isTool)+' <code>execute_tool</code> spans, so you can see which tool result led to which model call. The gateway\'s response headers were copied onto each chat span: '+fbs+' of '+chatM.length+' calls were answered by the fallback, and the gateway priced them at '+U.usd(costs.reduce((a,b)=>a+b,0))+' in all at the illustrative price.</li>'+
    (A.length?'<li><b>Auto-instrumentation only:</b> '+A.length+' spans, every one a separate root: the package sees each HTTP call to the model and nothing else. No agent span ties them together and the tools, where the time often goes, are invisible. Auto-instrumentation is the floor; the agent and tool spans are yours to add (the conventions say so: "Application developers are encouraged to follow this semantic convention for tools invoked by their own code").</li>':'')+
    '<li><b>Claude Code:</b> '+C.length+' spans under one <code>claude_code.interaction</code> root: '+Object.entries(ccNames).map(([k,v])=>v+' <code>'+esc(k)+'</code>').join(', ')+'. Each tool has a child for the time spent waiting on a permission decision ('+blocked.length+' spans, '+blockedT.toFixed(2)+' s in all here, with edits auto-accepted) and one for the execution itself ('+toolT.toFixed(1)+' s); model calls took '+llmT.toFixed(1)+' s of the '+(ccRoot?(ccRoot.t1-ccRoot.t0).toFixed(1):'?')+' s. Its names are its own (<code>claude_code.*</code>) with a few GenAI attributes added (<code>gen_ai.system</code>, <code>gen_ai.request.model</code>, <code>gen_ai.response.finish_reasons</code>). Tracing is beta and needs <code>CLAUDE_CODE_ENABLE_TELEMETRY=1</code> plus <code>CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1</code> and an OTLP endpoint; prompt text and tool content are redacted unless you opt in ({{Claude Code monitoring docs|https://code.claude.com/docs/en/monitoring-usage}}).</li></ul>'.replace(/\{\{([^|{}]+)\|([^{}]+)\}\}/g,(m,t,u)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>');
  // ---------- cost attribution (Claude Code run) ----------
  const PR={in:1,cw:2,cr:0.1,out:5};
  const L=C.filter(isModel).sort((a,b)=>a.t0-b.t0).map((s,k)=>{const a=s.a,c={in:+a.input_tokens||0,cw:+a.cache_creation_tokens||0,cr:+a.cache_read_tokens||0,out:+a.output_tokens||0};
    c.cost=(c.in*PR.in+c.cw*PR.cw+c.cr*PR.cr+c.out*PR.out)/1e6;c.k=k+1;return c});
  const tot=L.reduce((a,c)=>a+c.cost,0),rep=D.cc_result?D.cc_result.total_cost_usd:null;
  const evCost=(D.cc_events||[]).filter(e=>e.attrs['event.name']==='api_request').reduce((a,e)=>a+(+e.attrs.cost_usd||0),0);
  window.OPS_COST={tot,rep,evCost,n:L.length};
  function costDraw(){const el=document.getElementById('ops-cost');if(!el)return;const W=U.width(el),lw=W<480?54:70,pw=W-lw-70,bh=18,H=L.length*(bh+4)+10;const mx=Math.max(...L.map(c=>c.cost));
    let s='';L.forEach((c,i)=>{const y=6+i*(bh+4);let x0=lw;
      [['in','var(--c1)'],['cw','var(--c2)'],['cr','var(--c3)'],['out','var(--c4)']].forEach(([k,colr])=>{const v=c[k]*PR[k]/1e6,w=v/mx*pw;s+='<rect x="'+x0+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+bh+'" fill="'+colr+'"><title>'+k+': '+c[k]+' tokens, '+U.usd(v)+'</title></rect>';x0+=w});
      s+='<text x="4" y="'+(y+13)+'" font-size="11">call '+c.k+'</text><text x="'+(x0+4)+'" y="'+(y+13)+'" font-size="11">'+U.usd(c.cost)+'</text>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'">'+s+'</svg>'}
  costDraw();U.onRender(costDraw);
  const share=k=>L.reduce((a,c)=>a+c[k]*PR[k]/1e6,0)/tot*100;
  document.getElementById('ops-costnote').innerHTML='<p class="small mute" style="margin:2px 0">One bar per model call, split by token type and priced at Haiku 4.5 list prices.</p><div class="ops-leg"><span><i style="background:var(--c1)"></i>fresh input</span><span><i style="background:var(--c2)"></i>cache write</span><span><i style="background:var(--c3)"></i>cache read</span><span><i style="background:var(--c4)"></i>output</span></div>'+
    '<p>The '+L.length+' model calls add up to <b>'+U.usd(tot)+'</b>; the run\'s result record says '+(rep!=null?U.usd(rep):'?')+' and Claude Code\'s own <code>api_request</code> events say '+U.usd(evCost)+(rep!=null&&Math.abs(tot-rep)<1e-6?' (all three agree to the cent, so the per-span attribution is exact)':' (they differ by '+U.usd(Math.abs(tot-(rep||0)))+')')+'. Output was '+share('out').toFixed(0)+'% of the cost, cache writes '+share('cw').toFixed(0)+'%, cache reads '+share('cr').toFixed(0)+'%, fresh input '+share('in').toFixed(1)+'%: on a cached agent the expensive tokens are the ones the model writes and the prefix it writes to the cache, not the long history it rereads. These are API-price equivalents; the run was paid by a subscription.</p>';
})();
