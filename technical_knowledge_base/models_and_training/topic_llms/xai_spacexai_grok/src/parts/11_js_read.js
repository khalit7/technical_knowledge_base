// ---- Reading tab: Colossus build rates, Grok-1/2 parameter count, index panels, Terminal-Bench reporters, long-context cliff ----
function hbRows(rows,max,fmtv){return rows.map(r=>'<div class="hb'+(r.g?' grok':'')+'"><div class="nm">'+r.n+(r.s?'<small>'+r.s+'</small>':'')+'</div><div class="track"><div class="fill" style="width:'+Math.max(0.6,100*r.v/max).toFixed(1)+'%;background:'+(r.c||'var(--acc)')+'"></div></div><div class="val">'+fmtv(r.v)+'</div></div>').join('')}

// Colossus (S-1 figures)
(function(){
  const box=$('cxBars');if(!box)return;
  const C=[{n:'Colossus, first cluster',s:'~100,000 H100, ~130 MW, repurposed factory',mw:130,d:122,g:100000,c:'var(--c1)'},
    {n:'Colossus II, first cluster',s:'~110,000 GB200, ~210 MW',mw:210,d:91,g:110000,c:'var(--c1)'},
    {n:'Colossus II, second cluster',s:'110,000 GB300, 220 MW, existing site',mw:220,d:64,g:110000,c:'var(--c1)'},
    {n:'Industry benchmark',s:'100 MW greenfield site, ~2 years',mw:100,d:730,g:null,c:'var(--dim)'}];
  let m='rate';
  function draw(){let rows,max,f,note;
    if(m==='rate'){rows=C.map(c=>({n:c.n,s:c.s,v:c.mw/c.d,c:c.c,g:c.g}));f=v=>v.toFixed(2);note='Megawatts brought online per day = MW / days. The second Colossus II cluster ran at '+(220/64).toFixed(2)+' MW a day, '+Math.round((220/64)/(100/730))+' times the benchmark\'s '+(100/730).toFixed(2)+'.'}
    else if(m==='days'){rows=C.map(c=>({n:c.n,s:c.s,v:c.d,c:c.c,g:c.g}));f=v=>fmt(v);note='Days from start to online, as the S-1 states them. Shorter is faster; the benchmark\'s "approximately two years" is drawn as 730 days.'}
    else{rows=C.filter(c=>c.g).map(c=>({n:c.n,s:c.s,v:c.g/c.d,c:c.c,g:1}));f=v=>fmt(v);note='GPUs brought online per day = GPUs / days. The benchmark is quoted in megawatts only, so it has no GPU rate. GPU generations differ: one GB300 is not one H100.'}
    max=Math.max(...rows.map(r=>r.v));box.innerHTML=hbRows(rows,max,f);$('cxNote').innerHTML=note}
  segBind('cxM',v=>{m=v;draw()});draw();
})();

// Grok-1 / Grok 2 parameter and memory calculator (from run.py/model.py and config.json)
(function(){
  if(!$('g1Card'))return;
  const M={g1:{n:'Grok-1',d:6144,L:64,nq:48,nkv:8,hd:128,E:8,k:2,f:32768,V:131072,dense:0,ctx:8192,pub:'xAI: 314B, 25% active'},
           g2:{n:'Grok 2',d:8192,L:64,nq:64,nkv:8,hd:128,E:8,k:2,f:16384,V:131072,dense:32768,ctx:131072,pub:'xAI publishes no count'}};
  let m='g1';
  function count(c){const attn=2*c.d*c.nq*c.hd+2*c.d*c.nkv*c.hd,exp=3*c.d*c.f,dense=c.dense?3*c.d*c.dense:0,router=c.d*c.E,emb=2*c.V*c.d;
    return {tot:c.L*(attn+c.E*exp+dense+router)+emb,act:c.L*(attn+c.k*exp+dense+router)+emb,exp:c.L*c.E*exp,attn:c.L*attn,dense:c.L*dense,emb,router:c.L*router}}
  function draw(){const c=M[m],r=count(c),bp=+$('g1P').value,ctx=2**(+$('g1C').value);
    $('g1Cv').textContent=fmt(ctx);
    const kvTok=2*c.L*c.nkv*c.hd*2,kv=kvTok*ctx,kvMha=2*c.L*c.nq*c.hd*2*ctx,w=r.tot*bp;
    $('g1X').innerHTML=Array.from({length:8},(_,i)=>'<span class="'+(i<c.k?'on':'')+'">E'+(i+1)+'</span>').join('');
    $('g1Out').innerHTML=stat('Total parameters',(r.tot/1e9).toFixed(1)+'B',c.pub)+
      stat('Active per token',(r.act/1e9).toFixed(1)+'B',(100*r.act/r.tot).toFixed(1)+'% of total; 2 of 8 experts = 25%')+
      stat('Weights in memory',fmtBytes(w),($('g1P').selectedOptions[0].text)+'; '+fmt(r.tot/1e9,1)+'B × '+bp+' bytes')+
      stat('KV cache, one sequence',fmtBytes(kv),fmt(kvTok/1024)+' KiB a token × '+fmt(ctx)+'; all '+c.nq+' heads: '+fmtBytes(kvMha));
    const parts=[['Experts',r.exp,'var(--c1)'],['Dense FFN',r.dense,'var(--c4)'],['Attention',r.attn,'var(--c2)'],['Embeddings and head',r.emb,'var(--c3)']].filter(p=>p[1]>0);
    $('g1Bar').innerHTML='<div class="pstack">'+parts.map(p=>'<span title="'+p[0]+': '+(p[1]/1e9).toFixed(1)+'B" style="width:'+(100*p[1]/r.tot).toFixed(2)+'%;background:'+p[2]+'"></span>').join('')+'</div><div class="leg">'+parts.map(p=>'<span><i style="background:'+p[2]+'"></i>'+p[0]+' '+(p[1]/1e9).toFixed(1)+'B ('+(100*p[1]/r.tot).toFixed(1)+'%)</span>').join('')+'</div>';
    $('g1Note').innerHTML=(ctx>c.ctx?'<span class="ill">Beyond the model\'s '+fmt(c.ctx)+'-token context:</span> the cache is shown for the arithmetic only. ':'')+(m==='g1'?'Grok-1 runs with a context of 8,192 tokens in the released code. ':'Grok 2: 128K positions, bf16 weights, a residual dense feed-forward beside 8 experts of width 16,384. ')+'The router is '+(r.router/1e6).toFixed(1)+'M parameters, too small to see.'}
  segBind('g1M',v=>{m=v;draw()});['g1P','g1C'].forEach(id=>$(id).addEventListener('input',draw));
  draw();
})();

// Index versions, side by side (never joined)
(function(){
  const box=$('ixPanels');if(!box)return;
  const pre=[{n:'Claude Fable 5',v:62},{n:'Grok 4.6',v:61,g:1},{n:'GPT-5.6 Sol',v:61}];
  const pick=s=>AA.find(r=>r.m.startsWith(s));
  const v43=[['Grok 4.7 (xhigh)','Grok 4.7'],['GPT-5.6 Sol (max)','GPT-5.6 Sol'],['Grok 4.6 (high)','Grok 4.6'],['Kimi K3','Kimi K3']].map(([s,n])=>{const r=pick(s);return r?{n:n,s:r.m,v:r.ix,g:/Grok/.test(n)}:null}).filter(Boolean).sort((a,b)=>b.v-a.v);
  const col=r=>Object.assign(r,{c:r.g?'var(--c2)':'var(--dim)'});
  box.innerHTML='<div><h4>Launch scale, before v4.2 (12 August 2026)</h4><div class="q">Grok 4.6 level with GPT-5.6 Sol, one behind Fable 5; Kimi K3 behind, value not stated ('+A('https://siliconangle.com/2026/08/12/spacexai-releases-flagship-grok-4-6-model-advanced-reasoning-capabilities/','SiliconANGLE')+')</div>'+hbRows(pre.map(col),70,v=>fmt(v))+'</div>'+
   '<div><h4>v4.3, methodology 4.3.2 (read 1 October 2026)</h4><div class="q">GPT-5.6 Sol '+(47.0-44.3).toFixed(1)+' points ahead of Grok 4.6; Grok 4.7 '+(46.4-44.3).toFixed(1)+' above it ('+A('https://artificialanalysis.ai/leaderboards/models','Artificial Analysis')+')</div>'+hbRows(v43.map(col),70,v=>v.toFixed(1))+'</div>';
})();

// Terminal-Bench 4.0 by reporter and harness
(function(){
  const box=$('tbBars');if(!box)return;
  const REP={x:['xAI launch table','var(--c2)'],aa:['Artificial Analysis, Grok Build','var(--c3)'],an:['Anthropic table','var(--c1)'],oa:['OpenAI, via Anthropic\'s table','var(--c5)']};
  const R=[{m:'Grok 4.7',n:'Grok 4.7',s:'xhigh, xAI',v:38.0,r:'x',g:1},{m:'Grok 4.7',n:'Grok 4.7',s:'xhigh, in Grok Build',v:33,r:'aa',g:1},
    {m:'Grok 4.6',n:'Grok 4.6',s:'high, xAI',v:20.3,r:'x',g:1},{m:'Grok 4.6',n:'Grok 4.6',s:'xhigh, in Grok Build',v:18,r:'aa',g:1},
    {m:'Opus 5.5',n:'Claude Opus 5.5',s:'xhigh, Anthropic, ±2.6',v:66.4,r:'an'},
    {m:'Fable 5.1',n:'Claude Fable 5.1',s:'Anthropic\'s own figure',v:55.8,r:'an'},{m:'Fable 5.1',n:'Claude Fable 5.1',s:'max, as copied in xAI\'s table',v:57.9,r:'x'},
    {m:'Opus 5',n:'Claude Opus 5',s:'Anthropic',v:52.3,r:'an'},
    {m:'GPT-6 Astra',n:'GPT-6 Astra',s:'high, as reported by OpenAI',v:57.9,r:'oa'},
    {m:'GPT-5.6 Sol',n:'GPT-5.6 Sol',s:'as reported by OpenAI',v:37.3,r:'oa'},{m:'GPT-5.6 Sol',n:'GPT-5.6 Sol',s:'max, xAI\'s table',v:37.3,r:'x'}];
  $('tbLeg').innerHTML=Object.values(REP).map(([l,c])=>'<span><i style="background:'+c+';height:8px"></i>'+l+'</span>').join('');
  let mode='model';
  function draw(){const src=mode==='score'?R.slice().sort((a,b)=>b.v-a.v):R,rows=src.map(r=>({n:r.n,s:r.s,v:r.v,c:REP[r.r][1],g:r.g}));let i=0;box.innerHTML=hbRows(rows,70,v=>{const r=src[i++];return v.toFixed(r.r==='aa'?0:1)+'%'})}
  segBind('tbM',v=>{mode=v;draw()});draw();
})();

// Long-context price cliff
(function(){
  if(!$('lcCard'))return;
  const P=[{n:'Grok 4.7 or 4.6',i:2,c:0.5,o:6,win:500000},{n:'Grok 4.5',i:2,c:0.3,o:6,win:500000},{n:'Grok 4.3',i:1.25,c:0.2,o:2.5,win:1000000},{n:'Grok Build 0.1',i:1,c:0.2,o:2,win:256000}];
  const cost=(p,pr,cs,out)=>{const k=pr>=200000?2:1;return ((pr*(1-cs))*p.i*k+pr*cs*p.c*k+out*p.o*k)/1e6};
  function draw(){const p=P[+$('lcMod').value],pr=+$('lcP').value,cs=+$('lcC').value/100,out=+$('lcO').value;
    $('lcPv').textContent=fmt(pr);$('lcCv').textContent=Math.round(cs*100)+'%';$('lcOv').textContent=fmt(out);
    const nar=$('lcCard').clientWidth<560,W=nar?360:640,H=nar?200:220,pl=nar?44:52,pr2=14,pt=14,pb=34,xmax=500000;
    const ymax=cost(p,xmax,cs,out)*1.08||1;const X=v=>pl+(W-pl-pr2)*v/xmax,Y=v=>pt+(H-pt-pb)*(1-v/ymax);
    let s='';for(let k=0;k<=4;k++){const v=ymax*k/4;s+='<line x1="'+pl+'" x2="'+(W-pr2)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">$'+v.toFixed(v<1?2:1)+'</text>'}
    (nar?[0,200000,400000]:[0,100000,200000,300000,400000,500000]).forEach(v=>{s+='<text x="'+X(v)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(v/1000)+'K</text>'});
    s+='<text x="'+((pl+W-pr2)/2)+'" y="'+(H-3)+'" font-size="11" text-anchor="middle" fill="var(--mute)">Prompt tokens</text>';
    const lim=Math.min(xmax,p.win);
    s+='<path d="M'+X(0)+' '+Y(cost(p,0,cs,out))+'L'+X(199999)+' '+Y(cost(p,199999,cs,out))+'M'+X(200000)+' '+Y(cost(p,200000,cs,out))+'L'+X(lim)+' '+Y(cost(p,lim,cs,out))+'" stroke="var(--acc)" stroke-width="2.2" fill="none"/>';
    s+='<line x1="'+X(200000)+'" x2="'+X(200000)+'" y1="'+Y(cost(p,199999,cs,out))+'" y2="'+Y(cost(p,200000,cs,out))+'" stroke="var(--bad)" stroke-width="1.5" stroke-dasharray="3 3"/><text x="'+(X(200000)+5)+'" y="'+(Y(cost(p,200000,cs,out))-6)+'" font-size="10.5" fill="var(--bad)">'+(nar?'200K cliff':'200K: whole request re-priced')+'</text>';
    if(p.win<xmax)s+='<rect x="'+X(p.win)+'" y="'+pt+'" width="'+(X(xmax)-X(p.win))+'" height="'+(H-pt-pb)+'" fill="var(--soft)"/><text x="'+((X(p.win)+X(xmax))/2)+'" y="'+(pt+14)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">over its window</text>';
    const over=pr>p.win,c=cost(p,pr,cs,out);
    if(!over)s+='<circle cx="'+X(pr)+'" cy="'+Y(c)+'" r="5" fill="var(--c2)" stroke="var(--bg)" stroke-width="1.5"/>';
    $('lcSvg').innerHTML=svgEl(W,H,s,'Request cost against prompt length');
    const lo=cost(p,Math.min(pr,199999),cs,out),hi=cost(p,Math.max(pr,200000),cs,out);
    $('lcOut').innerHTML=over?stat('This request','rejected','prompt longer than '+p.n+'\'s '+fmt(p.win)+'-token window'):
      stat('This request',usd(c,3),pr>=200000?'higher row: every token at 2x':'standard row')+
      stat('Just below 200K',usd(lo,3),'same output, prompt '+fmt(Math.min(pr,199999)))+
      stat('At or above 200K',usd(hi,3),'prompt '+fmt(Math.max(pr,200000))+'; '+(hi/lo).toFixed(2)+'x')}
  ['lcMod','lcP','lcC','lcO'].forEach(id=>$(id).addEventListener('input',draw));
  onTab('t-read',draw);let rw=$('lcCard').clientWidth<560;addEventListener('resize',()=>{const w=$('lcCard').clientWidth<560;if(w!==rw){rw=w;draw()}});draw();
})();
