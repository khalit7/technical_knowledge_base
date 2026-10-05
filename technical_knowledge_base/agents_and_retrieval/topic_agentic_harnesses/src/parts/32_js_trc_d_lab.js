// ---- Trace and context lab: init panel, startup context, caching before/after, budget model, compaction, drills ----
(function(){
  const X=window.TRC;if(!X||!X.D.length)return;
  const {by,esc,n0,k1,usd,P,ctxOf,main,derived}=X;
  const $=id=>document.getElementById(id);

  // ---------- init record ----------
  function initPanel(){
    const el=$('trc-init'),r=by.std_haiku_2;if(!el||!r)return;
    el.innerHTML='<pre>'+esc(JSON.stringify({type:'system',subtype:'init',model:r.model,permissionMode:r.perm,tools:r.tools,agents:r.agents,claude_code_version:r.ccv,cwd:'/work'},null,1))+'</pre><div class="trc-cap">The init record of <i>'+esc(r.title)+'</i>, as kept after redaction (the raw record also lists the account\'s skills, plugins, slash commands and memory paths, removed here).</div>';
  }

  // ---------- startup context ----------
  function startup(){
    const el=$('trc-startup');if(!el)return;
    const rows=[['ctx_none','No tools'],['ctx_read','Read only'],['ctx_six','The six tools used here'],['ctx_six_noskills','Six tools, skills listing off'],['ctx_six_agent','Six tools + Agent'],['ctx_default','Every default tool']].filter(x=>by[x[0]]);
    const v=rows.map(x=>X.derived(by[x[0]]).first);const mx=Math.max(...v);
    const W=Math.min(860,X.width(el)),lw=Math.min(190,W*0.42),rh=24;let b='';
    rows.forEach((x,i)=>{const y=6+i*rh,w=(W-lw-70)*v[i]/mx;
      b+=X.T(lw-6,y+14,x[1],{a:'end',fs:11.5})+'<rect x="'+lw+'" y="'+(y+3)+'" width="'+w.toFixed(1)+'" height="'+(rh-8)+'" rx="2" fill="var(--c1)" fill-opacity="'+(i===2?1:.6)+'"/>'+X.T(lw+w+5,y+14,n0(v[i]),{fs:11,fill:'var(--mute)'})});
    el.innerHTML=X.svg(W,rows.length*rh+10,b,'First-call input tokens by tool set');
    const g=k=>X.derived(by[k]).first,nt=$('trc-startup-notes');
    if(nt&&by.ctx_none&&by.ctx_default)nt.innerHTML='<ul class="tight">'+
      '<li><b>'+n0(g('ctx_none'))+'</b> tokens with no tools at all: system prompt, environment block and the prompt. This is the harness before it can act.</li>'+
      '<li>The six tools add <b>'+n0(g('ctx_six')-g('ctx_none'))+'</b> (Read alone adds '+n0(g('ctx_read')-g('ctx_none'))+'). Tool definitions are text the model reads on every call: names, descriptions, JSON schemas, plus the tool-use system prompt the API adds (496 tokens for Haiku 4.5).</li>'+
      '<li>The Agent tool (subagents) adds <b>'+n0(g('ctx_six_agent')-g('ctx_six'))+'</b> by itself. Every default tool together: <b>'+n0(g('ctx_default'))+'</b>, '+n0(g('ctx_default')-g('ctx_six'))+' more than the six.</li>'+
      '<li>Turning the skills listing off changed the six-tool context by '+n0(g('ctx_six_noskills')-g('ctx_six'))+' tokens, which is to say nothing: with only these six tools there is no Skill tool to describe skills. The default set includes it.</li>'+
      '<li>Sonnet 5.5 received a shorter prefix for the same six tools: <b>'+n0(X.derived(by.std_sonnet_1).first)+'</b> tokens on its first call against '+n0(X.derived(by.std_haiku_1).first)+' for Haiku. Same harness, same tools, different prompt per model; the trace cannot say what differs.</li>'+
      '<li>Prefix sharing across sessions: most Haiku runs found the first <b>'+n0(by.std_haiku_2.calls[0][2])+'</b> tokens already cached by earlier sessions with the same setup and wrote only the rest; one run ('+esc(by.std_haiku_1.title)+') found all '+n0(by.std_haiku_1.calls[0][2])+' cached. The cache is keyed on the exact prefix, so changing the tool list (adding Agent) or the model starts from zero.</li></ul>';
  }

  // ---------- caching before/after ----------
  const C={run:'std_haiku_2',mode:'both',ctl:null};
  function cdraw(i){
    const el=$('trc-csvg'),r=by[C.run];if(!el||!r)return;
    const cs=main(r).slice(0,8),n=cs.length,p=P(r.model);
    const on=c=>c[0]+c[1]*(c[8]?1.25:2)+c[2]*0.1, off=c=>ctxOf(c);
    const modes=C.mode==='both'?['on','off']:[C.mode];
    let mxv=0;cs.forEach(c=>{mxv=Math.max(mxv,off(c),on(c))});
    const W=Math.min(860,X.width(el)),lw=58,rowH=modes.length*15+9,H=n*rowH+28;let b='';
    const sc=v=>(W-lw-60)*v/mxv;
    b+=X.T(lw,12,'billed input per call, base-input-token units',{fs:10.5,fill:'var(--mute)'});
    cs.forEach((c,j)=>{const y=20+j*rowH;const vis=j<i;b+=X.T(lw-6,y+11,'call '+(j+1),{a:'end',fs:10.5,fill:vis?'var(--ink)':'var(--dim)'});
      modes.forEach((m,k)=>{const yy=y+k*15;if(!vis){b+='<rect x="'+lw+'" y="'+yy+'" width="'+sc(off(c)).toFixed(1)+'" height="12" fill="none" stroke="var(--line)" stroke-dasharray="2 2"/>';return}
        if(m==='off'){b+='<rect x="'+lw+'" y="'+yy+'" width="'+sc(off(c)).toFixed(1)+'" height="12" fill="var(--trc-in)"/>'+X.T(lw+sc(off(c))+4,yy+10,k1(off(c))+(C.mode==='both'?' without':''),{fs:10,fill:'var(--mute)'})}
        else{let x=lw;[[c[2]*0.1,'var(--trc-cr)'],[c[1]*(c[8]?1.25:2),'var(--trc-cw)'],[c[0],'var(--trc-in)']].forEach(s=>{const w=sc(s[0]);if(w>0){b+='<rect x="'+x.toFixed(1)+'" y="'+yy+'" width="'+Math.max(.8,w).toFixed(1)+'" height="12" fill="'+s[1]+'"/>';x+=w}});
          b+=X.T(x+4,yy+10,k1(on(c))+(C.mode==='both'?' with':''),{fs:10,fill:'var(--mute)'})}});
    });
    el.innerHTML=X.svg(W,H,b,'Billed input per call with and without caching');
    const vis=cs.slice(0,i);
    const sum=f=>vis.reduce((s,c)=>s+f(c),0);
    const usdOn=sum(c=>X.callCost(c,r.model)),usdOff=sum(c=>X.callCostNoCache(c,r.model));
    const st=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
    $('trc-cstats').innerHTML=st('Input processed',n0(sum(ctxOf)),'same in both: the model reads it all')+st('Billed, with caching',n0(sum(on)),usd(usdOn)+' with output')+st('Billed, without',n0(sum(off)),usd(usdOff)+' with output')+st('Saving so far',vis.length?Math.round((1-usdOn/usdOff)*100)+'%':'none yet','on the dollar figure');
    const c=cs[i-1];
    const cap=i===0?'Eight calls of <i>'+esc(r.title)+'</i>. Press play: each step adds the next call. Dashed outlines show the full input each call will read.':
      i===1?'Call 1 reads '+n0(ctxOf(c))+' tokens: the startup context plus the prompt. '+n0(c[2])+' were already cached by an earlier session with the same prefix; '+n0(c[1])+' are written to the cache at '+(c[8]?'1.25x':'2x')+'. Without caching all of it is fresh input.':
      'Call '+i+' re-reads everything so far ('+n0(ctxOf(c))+' tokens) but only '+n0(c[1]+c[0])+' are new since call '+(i-1)+' (the previous output and tool result). The rest, '+n0(c[2])+' tokens, is a cache read at 0.1x: the blue sliver. Without caching the whole bar is paid again.';
    $('trc-ccap').innerHTML=cap;
  }
  function cinit(){
    const s=$('trc-crun');if(!s||s.options.length)return;
    ['std_haiku_2','std_haiku_1','ttl5m_haiku_1','std_sonnet_1','log_haiku_1'].filter(k=>by[k]).forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=by[k].title;s.appendChild(o)});
    s.value=C.run;s.addEventListener('change',()=>{C.run=s.value;C.ctl.reset(Math.min(8,main(by[C.run]).length)+1)});
    $('trc-cmode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;C.mode=b.dataset.m;$('trc-cmode').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));C.ctl.redraw()});
    C.ctl=X.anim({card:'trc-ccard',ctl:'trc-cctl',n:Math.min(8,main(by[C.run]).length)+1,draw:cdraw,label:'Call'});
  }

  // ---------- budget model ----------
  const PREV={'claude-haiku-4-5-20251001':8344,'claude-sonnet-5-5':4782}; // measured first-call cache reads (std runs)
  function model(o){ // returns per-call arrays and totals
    const p=P(o.m),wr=o.cache==='5m'?p.w5:p.w1;let cost=0,costOff=0,proc=0;const ctx=[];
    for(let i=1;i<=o.N;i++){const c=o.S+(i-1)*o.g;ctx.push(c);proc+=c;costOff+=(c*p.in+o.o*p.out)/1e6;
      if(o.cache==='off')cost+=(c*p.in+o.o*p.out)/1e6;
      else if(i===1){const pre=Math.min(o.pre,c);cost+=(pre*p.r+(c-pre)*wr+o.o*p.out)/1e6}
      else cost+=((c-o.g)*p.r+o.g*wr+o.o*p.out)/1e6}
    return {ctx,cost,costOff,proc};
  }
  const BM={};
  function bmRead(){return {m:$('trc-bm-model').value,cache:$('trc-bm-cache').value,S:+$('trc-bm-s').value,g:+$('trc-bm-g').value,o:+$('trc-bm-o').value,N:+$('trc-bm-n').value,W:+$('trc-bm-w').value,pre:$('trc-bm-pre').checked?PREV[$('trc-bm-model').value]:0}}
  function bm(){
    if(!$('trc-bm-s'))return;const o=bmRead();
    $('trc-bm-sv').textContent=n0(o.S);$('trc-bm-gv').textContent=n0(o.g);$('trc-bm-ov').textContent=n0(o.o);$('trc-bm-nv').textContent=o.N;$('trc-bm-prev').textContent=n0(PREV[o.m]);
    const r=model(o),full=o.g>0?Math.floor((o.W-o.S)/o.g)+1:Infinity;
    const st=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
    $('trc-bm-out').innerHTML=st('Context at the last call',k1(r.ctx[r.ctx.length-1]),Math.round(r.ctx[r.ctx.length-1]/o.W*100)+'% of the window')+st('Input processed',k1(r.proc),'N S + g N(N&minus;1)/2')+
      st('API-price equivalent',usd(r.cost),o.cache==='off'?'no caching':'with caching')+st('Same session, no caching',usd(r.costOff),o.cache==='off'?'':Math.round((1-r.cost/r.costOff)*100)+'% saved by caching')+
      st('Window full after',full>o.N?'more than '+o.N+' calls':full+' calls',full>o.N?'at call '+(isFinite(full)?full:'never'):'compaction would run here');
    // chart: context per call against the window; cumulative cost with and without caching
    const el=$('trc-bm-svg'),W=Math.min(860,X.width(el)),H=200,L=50,R=56,T0=12,B=26;
    const N=o.N,mxc=Math.max(o.W*1.02,r.ctx[N-1]);let cum=0,cumOff=0;const p=P(o.m);
    const cc=[],co=[];for(let i=1;i<=N;i++){const one=model(Object.assign({},o,{N:i}));cc.push(one.cost);co.push(one.costOff)}
    const mxu=Math.max(co[N-1],cc[N-1],1e-9);
    const x=i=>L+(W-L-R)*(N===1?0.5:(i)/(N-1)),y=v=>T0+(H-T0-B)*(1-v/mxc),yu=v=>T0+(H-T0-B)*(1-v/mxu);
    let b='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(o.W)+'" y2="'+y(o.W)+'" stroke="var(--bad)" stroke-dasharray="5 3"/>'+X.T(L+4,y(o.W)-4,'window '+k1(o.W),{fs:10,fill:'var(--bad)'});
    for(let gi=0;gi<=4;gi++){const v=mxc*gi/4;b+=X.T(L-4,y(v)+4,k1(v),{a:'end',fs:10,fill:'var(--mute)'});const u=mxu*gi/4;b+=X.T(W-R+4,yu(u)+4,'$'+u.toFixed(u<0.1?3:2),{fs:10,fill:'var(--mute)'})}
    const path=(arr,f)=>arr.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+f(v).toFixed(1)).join('');
    b+='<path d="'+path(r.ctx,y)+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    b+='<path d="'+path(co,yu)+'" fill="none" stroke="var(--trc-in)" stroke-width="1.5" stroke-dasharray="4 3"/>';
    if(o.cache!=='off')b+='<path d="'+path(cc,yu)+'" fill="none" stroke="var(--good)" stroke-width="1.5"/>';
    b+=X.T(L,H-6,'call 1',{fs:10,fill:'var(--mute)'})+X.T(W-R,H-6,'call '+N,{a:'end',fs:10,fill:'var(--mute)'});
    el.innerHTML=X.svg(W,H,b,'Context per call and cumulative cost')+'<div class="trc-leg"><span><i style="background:var(--c1)"></i>context per call (left axis)</span><span><i style="background:var(--good)"></i>cumulative cost with caching (right)</span><span><i style="background:var(--trc-in)"></i>cumulative cost without caching (right)</span></div>';
  }
  function bmVal(){
    const el=$('trc-bm-val');if(!el)return;
    const ids=['std_haiku_1','std_haiku_2','std_haiku_3','std_sonnet_1','std_sonnet_2','std_sonnet_3','md_haiku_1','md_haiku_2','md_haiku_3','log_haiku_1','log_sonnet_1','cli_sonnet_1','ttl5m_haiku_1'].filter(k=>by[k]);
    let h='<div class="tw"><table class="trc-t"><thead><tr><th>Run</th><th class="num">S</th><th class="num">g</th><th class="num">o</th><th class="num">N</th><th class="num">Predicted</th><th class="num">Reported</th><th class="num">Error</th></tr></thead><tbody>';
    BM.rows={};const errs=[];
    ids.forEach(k=>{const r=by[k],cs=main(r),N=cs.length,S=ctxOf(cs[0]),g=N>1?(ctxOf(cs[N-1])-S)/(N-1):0,o=r.u.out/N;
      const m=cs[0][7]||r.model,cache=cs[0][8]?'5m':'1h',pre=cs[0][2];
      const pr=model({m,cache,S,g,o,N,pre}).cost;BM.rows[k]={m,cache,S,g,o,N,pre};
      h+='<tr data-id="'+k+'"><td>'+esc(r.title)+'</td><td class="num">'+n0(S)+'</td><td class="num">'+n0(g)+'</td><td class="num">'+n0(o)+'</td><td class="num">'+N+'</td><td class="num">'+usd(pr)+'</td><td class="num">'+usd(r.cost)+'</td><td class="num">'+(function(e){const v=(e*100).toFixed(1);return (e>0?'+':'')+(v==='-0.0'?'0.0':v)+'%'})(pr/r.cost-1)+'</td></tr>';errs.push(Math.abs(pr/r.cost-1))});
    h+='</tbody></table></div><p><b>The four-number model lands within '+(Math.max(...errs)*100).toFixed(1)+'% of every one of these '+errs.length+' recorded costs</b> (by construction for S, g, o and N, which come from each run; independently for the caching arithmetic, which is the pricing page applied call by call). What it cannot predict is N: that is the agent\'s behaviour, and it varied by more than a factor of two across runs of the same task.</p><p class="trc-cap">S is the first call\'s input; g is (last call\'s input &minus; S) / (N &minus; 1); o is total output / N; the first call\'s cache read is taken from the recording. Sessions with parallel tool calls or uneven growth depart most; the residual is shown, not fitted away.</p>';
    el.innerHTML=h;
    el.querySelectorAll('tbody tr').forEach(tr=>tr.addEventListener('click',()=>{const q=BM.rows[tr.dataset.id];
      $('trc-bm-model').value=q.m;$('trc-bm-cache').value=q.cache;$('trc-bm-s').value=Math.round(q.S);$('trc-bm-g').value=Math.round(q.g);$('trc-bm-o').value=Math.round(q.o);$('trc-bm-n').value=q.N;$('trc-bm-pre').checked=q.pre>0;
      $('trc-bm-w').value=q.m.indexOf('sonnet')>=0?'1000000':'200000';bm()}));
  }

  // ---------- compaction ----------
  const K={run:'std_haiku_2',ctl:null};
  function kSeq(){ // blocks: startup, then growth per call (real); compaction applied on the right column
    const r=by[K.run],cs=main(r),S=ctxOf(cs[0]);const grow=[];for(let i=1;i<cs.length;i++)grow.push(Math.max(0,ctxOf(cs[i])-ctxOf(cs[i-1])));
    const rr=r.ev.find(e=>e.k==='res'&&e.n==='Read'&&/core\.py/.test((r.ev.find(t=>t.id===e.id&&t.k==='tool')||{}).s||''));
    const file=rr?Math.round(rr.len/3.5):400; // characters to tokens, about 3.5 characters per token for code (labelled estimate)
    return {S,grow,file};
  }
  function kdraw(i){
    const el=$('trc-kp-svg');if(!el)return;const q=kSeq(),Bud=+$('trc-kp-w').value,sum=+$('trc-kp-s').value;
    $('trc-kp-wv').textContent=n0(Bud);$('trc-kp-sv').textContent=n0(sum);
    // the history above the startup context, against a toy budget for history (window minus startup); right column compacts when the next call would exceed it
    const left=[],right=[];let compacted=0;const events=[];
    for(let j=0;j<i&&j<q.grow.length;j++){left.push(['call '+(j+2),q.grow[j]]);
      const tot=right.reduce((s,b)=>s+b[1],0);
      if(tot+q.grow[j]>Bud){compacted++;right.length=0;right.push(['summary',sum],['re-read core.py',q.file]);events.push(j+2)}
      right.push(['call '+(j+2),q.grow[j]])}
    const tl=left.reduce((s,b)=>s+b[1],0),tr=right.reduce((s,b)=>s+b[1],0),tot0=q.grow.reduce((a,b)=>a+b,0);
    const W=Math.min(860,X.width(el)),SH=26,H=270,T0=16,B=36,colW=Math.min(150,(W-120)/2),mx=Math.max(Bud*1.2,tot0,tl);
    const yv=v=>(H-T0-B-SH)*v/mx;let b='';
    const col=(blocks,x0,title,tot)=>{let y=H-B-SH;let s='<rect x="'+x0+'" y="'+y+'" width="'+colW+'" height="'+SH+'" fill="var(--dim)"/>'+X.T(x0+colW/2,y+16,'startup '+n0(q.S)+' (not to scale)',{a:'middle',fs:9.5});
      blocks.forEach((bl,k)=>{const h=yv(bl[1]);y-=h;
        const f=bl[0]==='summary'?'var(--c4)':bl[0].indexOf('re-read')===0?'var(--c5)':(k%2?'var(--c1)':'var(--c6)');
        s+='<rect x="'+x0+'" y="'+y.toFixed(1)+'" width="'+colW+'" height="'+Math.max(.6,h).toFixed(1)+'" fill="'+f+'" stroke="var(--bg)" stroke-width=".6"><title>'+bl[0]+': '+n0(bl[1])+' tokens</title></rect>';
        if(h>11&&(bl[0]==='summary'||bl[0].indexOf('re-read')===0))s+=X.T(x0+colW/2,y+h/2+4,bl[0],{a:'middle',fs:10,fill:'var(--bg)'})});
      s+=X.T(x0+colW/2,H-B+14,title,{a:'middle',fs:11,w:600})+X.T(x0+colW/2,H-B+27,'history '+n0(tot)+' tokens',{a:'middle',fs:10.5,fill:tot>Bud?'var(--bad)':'var(--mute)'});return s};
    const x1=Math.max(50,(W-2*colW)/3),x2=x1*2+colW,yw=(H-B-SH-yv(Bud)).toFixed(1);
    b+='<line x1="'+(x1-14)+'" x2="'+(x2+colW+14)+'" y1="'+yw+'" y2="'+yw+'" stroke="var(--bad)" stroke-dasharray="5 3"/>'+X.T(x1-16,+yw+4,'window',{a:'end',fs:10,fill:'var(--bad)'});
    b+=col(left,x1,'without compaction',tl)+col(right,x2,'with compaction',tr);
    el.innerHTML=X.svg(W,H,b,'Context growth with and without compaction');
    const n=q.grow.length;
    $('trc-kp-cap').innerHTML=i===0?'The startup context of <i>'+esc(by[K.run].title)+'</i> ('+n0(q.S)+' tokens) is drawn as a fixed slab: it reloads after compaction, so only the history above it can be squeezed. Each step appends what the next model call added ('+n0(Math.min(...q.grow))+' to '+n0(Math.max(...q.grow))+' tokens here).':
      (tl>Bud?'Without compaction the history is '+n0(tl)+' tokens, past the toy window: the next request would be rejected. ':'Without compaction: '+n0(tl)+' tokens of history, still inside the window. ')+
      (compacted?'With compaction it ran '+compacted+' time'+(compacted>1?'s':'')+' (before call '+events.join(', ')+'): the history became a '+n0(sum)+'-token summary plus a re-read of the modified file, '+n0(tr)+' tokens now. Anything not in the summary is gone, and the next call writes a new cache prefix.':'Compaction has not been needed yet.')+(i>=n?' End of the recorded session.':'');
  }
  function kinit(){
    const s=$('trc-kp-run');if(!s||s.options.length)return;
    ['std_haiku_2','md_haiku_1','cli_sonnet_1','log_sonnet_1'].filter(k=>by[k]).forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=by[k].title;s.appendChild(o)});
    s.value=K.run;s.addEventListener('change',()=>{K.run=s.value;K.ctl.reset(kSeq().grow.length+1)});
    ['trc-kp-w','trc-kp-s'].forEach(id=>$(id).addEventListener('input',()=>K.ctl.redraw()));
    K.ctl=X.anim({card:'trc-kp-card',ctl:'trc-kp-ctl',n:kSeq().grow.length+1,draw:kdraw,label:'Call',ms:1100});
  }

  // ---------- drills ----------
  function drills(){document.querySelectorAll('#t-trace .trc-drill').forEach(d=>{if(d.dataset.on)return;d.dataset.on=1;
    d.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{d.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.o===d.dataset.ans)x.classList.add('right')});
      if(b.dataset.o!==d.dataset.ans)b.classList.add('wrong');d.querySelector('.ans').hidden=false}))})}

  let once=false;
  function init(){
    if(!once){once=true;initPanel();cinit();kinit();drills();
      ['trc-bm-model','trc-bm-cache','trc-bm-s','trc-bm-g','trc-bm-o','trc-bm-n','trc-bm-w','trc-bm-pre'].forEach(id=>{const e=$(id);if(e)e.addEventListener(e.tagName==='SELECT'||e.type==='checkbox'?'change':'input',bm)});
      $('trc-bm-model').addEventListener('change',()=>{$('trc-bm-w').value=$('trc-bm-model').value.indexOf('sonnet')>=0?'1000000':'200000';bm()});
      bmVal()}
    startup();bm();
  }
  X.onRender(init);X.onResize(()=>{startup();bm();if(C.ctl)C.ctl.redraw();if(K.ctl)K.ctl.redraw()});
})();
