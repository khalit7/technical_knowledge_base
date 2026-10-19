// ---- Append-only simulator (preserved thinking and prompt caching rules) ----
(function(){
  // the conversation before request 4; tokens are illustrative
  const B=[
    {k:'tools',l:'tools',t:2000},{k:'sys',l:'system prompt',t:3000},{k:'user',l:'user: the task',t:1000},
    {k:'think',l:'thinking 1',t:800,n:1},{k:'tu',l:'tool_use',t:100},{k:'tr',l:'tool_result 1',t:6000},
    {k:'think',l:'thinking 2',t:900,n:2},{k:'tu',l:'tool_use',t:100},{k:'tr',l:'tool_result 2',t:4000},
    {k:'think',l:'thinking 3',t:700,n:3},{k:'tu',l:'tool_use',t:100}];
  const NEW={k:'tr',l:'tool_result 3 (new)',t:5000};
  const A={
    append:{edit:-1,add:null,txt:'The normal case: the history is byte-for-byte what the API saw last time, so every thinking block stays valid and everything up to the new tool result is read from the cache.'},
    sys:{edit:1,add:null,txt:'Editing the system prompt changes the prefix of every block after it. All three thinking blocks fail the prefix check, and the cache stops matching at the system prompt, so almost the whole history is written again at 1.25 times the input price.'},
    midsys:{edit:-1,add:{k:'sysm',l:'system message (new)',t:150},txt:'A mid-conversation system message is appended at the end: the earlier prefix is untouched, so the reasoning and the cache both survive. Same instruction, no damage.'},
    tool:{edit:0,add:null,txt:'Adding a tool to the tools array changes the very first block. Every thinking block is invalid, and tool definitions sit first in the cache hierarchy (tools, then system, then messages), so the entire cache is lost.'},
    tooladd:{edit:-1,add:{k:'sysm',l:'tool_addition block (new)',t:300},txt:'A tool_addition block (beta) declares the new tool at the end of the conversation instead: nothing earlier changes.'},
    trim:{edit:5,add:null,txt:'Shortening an old tool result in place, a common way to save context, edits the middle of the history: thinking 2 and 3 come after it and are invalid; thinking 1 survives. Server-side context editing (clear_tool_uses) does this without breaking the check, because the check compares what you sent.'},
    eff:{edit:-1,add:null,cache:2,txt:'Effort is a request parameter, outside system, tools and messages, so the prefix check passes. But effort is rendered into the prompt, so a top-level change always invalidates the message cache (and on some models the tools and system cache too).'},
    effmsg:{edit:-1,add:{k:'sysm',l:'effort-only system message',t:10},txt:'A per-message effort change (beta, on Fable 5.1, Mythos 5.1, Opus 5.5, Opus 5 and Sonnet 5.5) is an empty system message carrying output_config.effort: appended, so reasoning and cache survive.'},
    up:{edit:-1,add:null,model:'Fable 5.1',cache:0,txt:'Switching up to Fable 5.1: it reads every earlier model\'s thinking blocks, so the reasoning carries over. Caches belong to one model, so the whole history is written again, at Fable 5.1\'s prices.'},
    down:{edit:-1,add:null,model:'Opus 5.5',drop:true,cache:0,from:'Fable 5.1',txt:'Switching down from Fable 5.1 to Opus 5.5: Opus 5.5 cannot read Fable blocks, so the API drops them silently and does not bill them, whatever the mismatch setting. The model may think more to rebuild the reasoning. The cache starts over on the new model.'}};
  function draw(){
    const a=A[$('simA').value],beh=$('simB').value;const rows=B.slice();if(a.add)rows.push(a.add);rows.push(NEW);
    const model=a.model||'Opus 5.5',p=PBY(model);
    const cacheStop=a.cache!=null?a.cache:(a.edit>=0?a.edit:B.length); // index from which the cached prefix no longer matches
    let read=0,write=0,inv=0,drop=0,html='<div class="simrows">';
    rows.forEach((b,ix)=>{
      const isOld=ix<B.length,edited=ix===a.edit;let st,cls;
      const thinkBad=b.k==='think'&&a.edit>=0&&ix>a.edit;const dropped=b.k==='think'&&(a.drop||(thinkBad&&beh==='drop'));
      if(b.k==='think'&&dropped){st='dropped, not billed';cls='dr';drop++}
      else if(thinkBad){st='invalid: 400';cls='bad';inv++}
      else if(isOld&&ix<cacheStop){st='cache read';cls='rd';read+=b.t}
      else if(isOld||ix<rows.length-1||true){st=isOld?'re-written to cache':'written to cache';cls='wr';write+=b.t}
      if(b.k==='think'&&!dropped&&!thinkBad)st+=', reasoning kept';
      if(edited)st='edited in place; '+st;
      html+='<div class="sr"><span class="nm">'+b.l+'</span><span class="bar"><span class="'+cls+(edited?' ed':'')+'" style="width:'+Math.max(1.2,100*b.t/6000).toFixed(1)+'%"></span></span><span class="st">'+st+'</span></div>'});
    html+='</div>';$('simView').innerHTML=html;
    const rejected=inv>0&&beh==='error';
    const cost=(read*p.c+write*1.25*p.i)/1e6,base=((B.reduce((s,b)=>s+b.t,0))*PBY('Opus 5.5').c+NEW.t*1.25*PBY('Opus 5.5').i)/1e6;
    $('simOut').innerHTML=stat('Request 4',rejected?'<span style="color:var(--bad)">400 error</span>':'accepted',rejected?'the error names the first failing block':(drop?drop+' thinking block(s) dropped':'all reasoning kept'))+
      stat('Thinking blocks the model can use',rejected?'none (rejected)':(3-inv-drop)+' of 3',inv&&!rejected?'':'')+
      stat('Input tokens read from cache',fmt(read),'at '+usd(p.c,2)+' per 1M ('+model+')')+
      stat('Input tokens written to cache',fmt(write),'at '+usd(1.25*p.i,2)+' per 1M')+
      stat('Input cost of request 4',rejected?'·':usd(cost,4),rejected?'nothing billed':'appending on Opus 5.5: '+usd(base,4));
    $('simOut').insertAdjacentHTML('beforeend','<div class="q" style="grid-column:1/-1">'+a.txt+(a.edit>=0&&beh==='drop'?' With "drop_block" the invalid blocks are removed instead and the request runs; they are listed in input_transformations.':'')+' Accounts created before 31 August 2026 enforce the prefix check only when the request sets the mismatch behaviour.</div>');
  }
  $('simA').addEventListener('change',draw);$('simB').addEventListener('change',draw);draw();
})();

// ---- Session animation: the same session turn by turn, with and without prompt caching ----
(function(){
  const card=$('sa');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const P=100000,N=5000,O=2000,TURNS=16,DUR=2600,MOVE=0.8,U=1000; // one square = 1,000 tokens
  const st={m:'cache',mod:'Opus 5.5',k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:-1,lm:''};
  const cl=v=>v<0?0:v>1?1:v,ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v);
  // per-turn bill for turn t (1-based) in the two modes (page's growing-context model)
  function turn(t,m,p){const w=1.25*p.i;if(P+(t-1)*(N+O)+N>p.win)return {read:0,write:0,inp:0,out:0,cost:0,over:true};
    if(m==='none')return {read:0,write:0,inp:P+(t-1)*(N+O)+N,out:O,cost:((P+(t-1)*(N+O)+N)*p.i+O*p.o)/1e6};
    if(t===1)return {read:0,write:P+N,inp:0,out:O,cost:((P+N)*w+O*p.o)/1e6};
    const r=P+(t-2)*(N+O)+N;return {read:r,write:O+N,inp:0,out:O,cost:(r*p.c+(O+N)*w+O*p.o)/1e6}}
  const cum=(k,m,p)=>{let s=0;for(let t=1;t<=k;t++)s+=turn(t,m,p).cost;return s};
  function caption(k,m,p){const t=k+1,c=turn(t,m,p),ctx=P+(t-1)*(N+O)+N,win=p.win;
    if(ctx>win)return 'Turn '+t+': the request would hold '+fmt(ctx)+' tokens, more than '+(p.s||p.n)+'\'s '+fmt(win)+'-token window. The session cannot continue without compaction or a model with a larger window.';
    if(m==='none'){if(t===1)return 'Turn 1: the whole request, 100,000 tokens of prefix plus 5,000 new, is billed at the full input price, and the model writes 2,000 tokens of output (thinking included), billed at the output price.';
      if(t===2)return 'Turn 2: with no cache, everything is sent and billed again at the full input price: the prefix, last turn\'s input and last turn\'s output, which is now part of the history. The bill per turn grows with the context.';
      return 'Turn '+t+': '+fmt(ctx)+' tokens re-billed at '+usd(p.i,2)+' per million, '+usd(c.cost,3)+' this turn. Every turn pays again for everything before it.'}
    if(t===1)return 'Turn 1: the prefix and the first input are written to the cache at 1.25 times the input price ('+fmt(P+N)+' tokens), and the model writes 2,000 tokens of output. Writing costs more than sending once; it pays back on the first read.';
    if(t===2)return 'Turn 2: everything already cached is read at '+usd(p.c,2)+' per million (green). Only what is new since the last request, last turn\'s output and this turn\'s input (7,000 tokens), is written (amber). Thinking stays in context on current models, so it is re-read like the rest.';
    if(t===TURNS)return 'Turn '+t+': '+fmt(c.read)+' tokens read from the cache. Cached, the 16 turns cost '+usd(cum(TURNS,'cache',p),2)+'; the same session with no cache, '+usd(cum(TURNS,'none',p),2)+'. Output is now the largest line that effort, not the price list, controls.';
    return 'Turn '+t+': '+fmt(c.read)+' tokens read from the cache, 7,000 written, 2,000 output: '+usd(c.cost,3)+' this turn.'}
  function draw(){
    const p=PBY(st.mod),m=st.m,k=st.k,e=RM?1:ease(cl(st.t/MOVE)),t=k+1;
    const narrow=card.clientWidth<560,cols=narrow?28:40,pitch=narrow?11.5:15.5,cs=pitch-2,W=Math.max(cols*pitch+20,narrow?340:660),winSq=p.win/U,rowsN=Math.ceil(Math.max(winSq<=200?winSq+20:0,P/U+TURNS*(N+O)/U)/cols)+0;
    const H=rowsN*pitch+52+(narrow?14:0);let s='';
    const ctxBefore=P+(t-1)*(N+O),prevOutStart=(P+(t-2)*(N+O)+N)/U; // squares
    const ph1=cl(e/0.35),ph2=cl((e-0.35)/0.3),ph3=cl((e-0.65)/0.35);
    const nIn=N/U,nOut=O/U,base=ctxBefore/U;
    const col={rd:'var(--good)',wr:'var(--c5)',in:'var(--c1)',out:'var(--c4)',old:'var(--dim)',over:'var(--bad)'};
    let d={};
    const cell=(i,c,op)=>{const x=10+(i%cols)*pitch,y=30+Math.floor(i/cols)*pitch;(d[c+'|'+(op||1)]=d[c+'|'+(op||1)]||[]).push('M'+x+' '+y+'h'+cs+'v'+cs+'h-'+cs+'z')};
    const ext=(P+(TURNS-1)*(N+O)+N+O)/U;let ghost='';for(let i=0;i<ext;i++){const x=10+(i%cols)*pitch,y=30+Math.floor(i/cols)*pitch;ghost+='M'+(x+.5)+' '+(y+.5)+'h'+(cs-1)+'v'+(cs-1)+'h-'+(cs-1)+'z'}
    s+='<path d="'+ghost+'" fill="none" stroke="var(--line)"/>';
    for(let i=0;i<base;i++){let c=col.old;
      if(m==='none')c=ph1>i/base?col.in:col.old;
      else if(t>1){c=i>=prevOutStart?(ph1>0?col.wr:col.old):(ph1>i/base?col.rd:col.old)}
      else c=col.old;
      if(t===1)c=m==='none'?(ph1>i/base?col.in:col.old):(ph1>i/base?col.wr:col.old);
      if(i>=winSq)c=col.over;cell(i,c)}
    for(let j=0;j<nIn;j++)if(ph2>j/nIn)cell(base+j,base+j>=winSq?col.over:(m==='none'?col.in:col.wr));
    for(let j=0;j<Math.ceil(nOut);j++)if(ph3>j/nOut)cell(base+nIn+j,base+nIn+j>=winSq?col.over:col.out);
    Object.entries(d).forEach(([kk,arr])=>{const [c,op]=kk.split('|');s+='<path d="'+arr.join('')+'" fill="'+c+'" fill-opacity="'+op+'"/>'});
    if(winSq<=cols*rowsN){const wi=winSq,x=10+(wi%cols)*pitch-1,y=30+Math.floor(wi/cols)*pitch;s+='<path d="M'+x+' '+(y-2)+'v'+(pitch+2)+'" stroke="var(--bad)" stroke-width="2"/><text x="'+x+'" y="'+(y-4)+'" font-size="10.5" fill="var(--bad)" text-anchor="'+(x<120?'start':'middle')+'">'+(p.s||p.n)+' window, '+fmt(p.win)+'</text>'}
    s+='<text x="10" y="18" font-size="11" fill="var(--mute)">'+(narrow?'Context, 1 square = 1,000 tokens. Turn '+t+'/'+TURNS:'The request\'s context, one square per 1,000 tokens, to scale. Turn '+t+' of '+TURNS+'.')+'</text>';
    const leg=m==='none'?[['in','billed as input'],['out','output (thinking included)']]:[['rd','read from cache'],['wr','written to cache'],['out','output (thinking included)']];
    let lx=10,ly2=H-14-(narrow?14:0);leg.forEach(([c,l])=>{const lw=l.length*5.6+24;if(lx+lw>W){lx=10;ly2+=14}s+='<rect x="'+lx+'" y="'+ly2+'" width="10" height="10" rx="2" fill="'+col[c]+'"/><text x="'+(lx+14)+'" y="'+(ly2+9)+'" font-size="10.5" fill="var(--mute)">'+l+'</text>';lx+=lw});
    $('saSvg').innerHTML=svgEl(W,H,s,'Context of an agent session at turn '+t);
    if(st.lk!==k||st.lm!==m+st.mod){$('saStep').textContent='Turn '+t+' of '+TURNS+(m==='none'?', no caching':', prompt caching');$('saCap').innerHTML=caption(k,m,p);st.lk=k;st.lm=m+st.mod}
    const c=turn(t,m,p),done=e>=1?t:t-1,cu=cum(done,m,p),other=cum(done,m==='none'?'cache':'none',p);
    $('saCnt').innerHTML=stat('This turn',c.over?'rejected':usd(c.cost,3),c.over?'over the context window':(m==='none'?fmt(c.inp)+' input, '+fmt(c.out)+' output':fmt(c.read)+' read, '+fmt(c.write)+' written, '+fmt(c.out)+' output'))+
      stat('Session so far ('+done+' turns)',usd(cu,2),(p.s||p.n)+', '+(m==='none'?'no caching':'prompt caching'))+
      stat(m==='none'?'Same turns with caching':'Same turns without caching',usd(other,2),done?(m==='none'?'caching costs '+Math.round(100*cum(done,'cache',p)/cu)+'% of this':'this mode costs '+Math.round(100*cu/other)+'% of that'):'')+
      stat('Context sent this turn',fmt(P+(t-1)*(N+O)+N),'tokens; window '+fmt(p.win));
    const sc=$('saScrub');sc.max=TURNS*100;sc.value=Math.round((k+st.t)*100);
    const pb=$('saPlay'),end=k===TURNS-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;if(st.t>=1){if(st.k<TURNS-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('saPlay').addEventListener('click',()=>{if(st.play){pause()}else{if(st.k===TURNS-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<TURNS-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $('saFwd').addEventListener('click',()=>{pause();st.k=Math.min(TURNS-1,st.k+1);st.t=1;draw()});
  $('saBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('saScrub').addEventListener('input',e=>{pause();const v=+e.target.value;st.k=Math.min(TURNS-1,Math.floor(v/100));st.t=cl(v/100-st.k);draw()});
  $('saSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  $('saMod').addEventListener('change',e=>{st.mod=e.target.value;st.lk=-1;draw()});
  const seg=$('saM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab('t-read',()=>{draw();kick()});
  draw();
})();
