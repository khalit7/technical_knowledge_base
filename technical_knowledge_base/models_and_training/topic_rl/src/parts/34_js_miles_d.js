// ---- Milestones and benchmarks: the climb, animated (headline medians; all 57 games) ----
(function(){
  const D=window.MS,U=window.MSU;if(!D||!U)return;
  const {$,esc,A}=U;
  const host=$('ms-an');
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const st={mode:'climb',i:0,playing:false,speed:1,shown:0,anim:null,onScreen:true};
  const C=D.CLIMB,PG=D.PG,RC=D.RC;
  const AG=[['apex','Ape-X','2018',RC.apex_a57,434.1,'22.8B frames','Distributed prioritized replay: 376 cores feed one learner on one GPU.'],
            ['r2d2','R2D2','2018',RC.r2d2_a57,1920.6,'37.5B frames','Recurrent replay: an LSTM agent learning from stored sequences, 256 actors.'],
            ['muzero','MuZero','2019',RC.muzero_own_with_a57_baselines,2041.1,'20.0B frames','Tree search inside a learned model of reward, value and policy.'],
            ['agent57','Agent57','2020',RC.agent57_h4,1933.49,'Skiing passed after 78B frames','Novelty bonus plus a bandit choosing how much to explore and how far ahead to look.']];
  // games below human for Ape-X, R2D2 and MuZero alike: the hard tail
  const HARD=new Set(PG.filter(g=>g.apex<100&&g.r2d2<100&&g.muzero<100).map(g=>g.g));
  const nice=g=>g.replace(/\b\w/g,c=>c.toUpperCase());
  const fmt=v=>(v>=100?v.toLocaleString('en-GB',{maximumFractionDigits:1}):v.toFixed(1))+'%';
  const nSteps=()=>st.mode==='climb'?C.length:AG.length;
  const med=a=>{const s=a.slice().sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};

  // ---------- geometry ----------
  function geo(){const W=Math.max(300,Math.round(host.clientWidth||600));return {W,narrow:W<520}}
  // climb: one row per agent, log axis 50% to 5,000%
  function drawClimb(t){
    const {W,narrow}=geo(),left=narrow?92:130,right=narrow?46:60,top=24,rh=narrow?22:24,H=top+C.length*rh+8;
    const lo=50,hi=5000,sx=v=>left+(Math.log10(Math.max(lo,Math.min(hi,v)))-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo))*(W-left-right);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Atari-57 median by agent, step by step">';
    [50,100,200,500,1000,2000,5000].forEach(v=>{const x=sx(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+(top-4)+'" y2="'+(H-6)+'" stroke="var(--line)"/><text x="'+x+'" y="'+(top-8)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(v>=1000?(v/1000)+'k':v)+'%</text>'});
    const xh=sx(100);s+='<line x1="'+xh+'" x2="'+xh+'" y1="'+(top-4)+'" y2="'+(H-6)+'" stroke="var(--ink)" stroke-dasharray="4 3" opacity="0.6"/>';
    C.forEach((c,j)=>{const y=top+j*rh,past=j<st.i,cur=j===st.i,fut=j>st.i;
      const f=cur?t:past?1:0;const x1=sx(lo)+(sx(c.med)-sx(lo))*f;
      s+='<text x="'+(left-6)+'" y="'+(y+rh/2+4)+'" font-size="'+(narrow?11:12)+'" text-anchor="end" fill="'+(fut?'var(--dim)':'var(--ink)')+'"'+(cur?' font-weight="700"':'')+'>'+esc(c.a)+'</text>';
      if(!fut){s+='<rect x="'+sx(lo)+'" y="'+(y+4)+'" width="'+Math.max(0,x1-sx(lo)).toFixed(1)+'" height="'+(rh-8)+'" rx="3" fill="'+(cur?'var(--acc)':'var(--c6)')+'" opacity="'+(cur?1:0.55)+'"/>';
        if(f>0.98)s+='<text x="'+(x1+4)+'" y="'+(y+rh/2+4)+'" font-size="11" fill="var(--ink)">'+fmt(c.med)+'</text>'}});
    s+='</svg>';host.innerHTML=s;
  }
  // all games: one dot per game, x = log HNS (1% to 100,000%), y = rank for the current agent
  let cur=null; // current positions {g:[x,y]}
  function target(k){
    const {W,narrow}=geo(),left=8,right=narrow?10:16,top=26,rh=narrow?4.4:5,H=top+57*rh+30;
    const lo=1,hi=100000,sx=v=>left+(Math.log10(Math.max(lo,Math.min(hi,v)))-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo))*(W-left-right);
    const key=AG[k][0],sorted=PG.slice().sort((a,b)=>b[key]-a[key]);
    const pos={};sorted.forEach((g,r)=>{pos[g.g]=[sx(g[key]),top+r*rh+rh/2]});
    return {W,H,top,rh,sx,pos,key,narrow};
  }
  function drawGames(t){
    const k=Math.min(st.i,AG.length-1),T=target(k);
    if(!cur||t>=1)cur=cur||T.pos;
    const from=cur,P={};PG.forEach(g=>{const a=from[g.g]||T.pos[g.g],b=T.pos[g.g];P[g.g]=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]});
    if(t>=1)cur=T.pos;
    const {W,H,top,sx}=T;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Human-normalised score of each of the 57 games">';
    [1,10,100,1000,10000,100000].forEach(v=>{const x=sx(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+(top-4)+'" y2="'+(H-22)+'" stroke="var(--line)"/><text x="'+Math.min(W-14,Math.max(12,x))+'" y="'+(H-8)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(v>=1000?(v/1000)+'k':v)+'%</text>'});
    const xh=sx(100);s+='<line x1="'+xh+'" x2="'+xh+'" y1="'+(top-4)+'" y2="'+(H-22)+'" stroke="var(--ink)" stroke-dasharray="4 3" opacity="0.6"/><text x="'+(xh-4)+'" y="'+(top-8)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">human</text>';
    const m=med(PG.map(g=>g[T.key])),xm=sx(m);
    s+='<line x1="'+xm+'" x2="'+xm+'" y1="'+(top-4)+'" y2="'+(H-22)+'" stroke="var(--acc)" stroke-width="2"/><text x="'+(xm+4)+'" y="'+(top-8)+'" font-size="10.5" fill="var(--acc)" font-weight="600">median</text>';
    PG.forEach(g=>{const p=P[g.g],h=HARD.has(g.g),v=g[T.key];
      s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="'+(h?3.6:2.8)+'" fill="'+(h?'var(--bad)':v>=100?'var(--c6)':'var(--mute)')+'" opacity="'+(h?1:0.8)+'"><title>'+esc(nice(g.g))+': '+fmt(v)+'</title></circle>'});
    s+='</svg>';host.innerHTML=s;
  }
  function caption(){
    const cap=$('ms-cap'),cnt=$('ms-acnt'),note=$('ms-annote');
    const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
    if(st.mode==='climb'){const c=C[st.i],T=D.T[c.tab];
      cap.innerHTML='<div class="t">'+(st.i+1)+' of '+C.length+': '+esc(c.a)+' ('+c.d+')</div><p>'+esc(c.fix)+'</p><p class="small mute">Median printed in '+A(T.u,esc(T.n))+'.</p>';
      const x=c.fr?c.fr/2e8:null;
      cnt.innerHTML=stat('Median, 57 games, no-op starts',fmt(c.med),st.i?((c.med>=C[st.i-1].med?'+':'')+(c.med-C[st.i-1].med).toFixed(1)+' points on the step before'):'the starting point')+
        stat('Training frames',esc(c.frl),x?(x===1?'the 200M-frame standard':(Math.round(x)+' times the 200M standard')):'no single budget stated')+
        stat('Games at or above human',c.ah==null?'not printed':c.ah+' of 57',c.a==='C51'?'printed ("> H.B.")':c.a==='Agent57'?'printed':c.ah==null?'':'derived from per-game scores');
      note.innerHTML='Each value is the first 57-game no-op median printed for that agent, from its own or the next paper\'s table (the bars view above shows each table whole). Same protocol, but seeds, snapshot rules and budgets differ, so the step from Rainbow to Ape-X also carries 114 times more experience, not only a better algorithm.';
    }else{const a=AG[st.i],r=a[3];
      const below=PG.filter(g=>g[a[0]]<100).sort((x,y)=>x[a[0]]-y[a[0]]);
      cap.innerHTML='<div class="t">'+(st.i+1)+' of '+AG.length+': '+a[1]+' ('+a[2]+'), '+esc(a[5])+'</div><p>'+esc(a[6])+'</p><p class="small">'+(below.length?'Below human: '+below.map(g=>esc(nice(g.g))+' '+fmt(g[a[0]])).join(', ')+'.':'No game below human.')+'</p>';
      cnt.innerHTML=stat('Median (derived)',fmt(r.median),'printed: '+fmt(a[4]))+stat('Mean (derived)',fmt(r.mean),'')+stat('Games at or above human',r.above_human+' of 57','orange dots: below human for Ape-X, R2D2 and MuZero alike')+stat('Capped mean (derived)',r.capped_mean.toFixed(1)+'%','each game capped at 100%; Agent57 prints 100.00');
      note.innerHTML='Per-game scores: Ape-X, R2D2 and MuZero as printed in '+A('https://arxiv.org/abs/1911.08265','MuZero Table S1')+', Agent57 from '+A('https://arxiv.org/abs/2003.13350','Agent57 App. H.4')+'; all normalised with Agent57\'s random and human scores. The derived medians reproduce the printed ones for Ape-X, MuZero and Agent57; R2D2 comes out '+(RC.r2d2_a57.median-1920.6).toFixed(1)+' points above its printed 1,920.6%.';
    }
    $('ms-scrub').max=nSteps()-1;$('ms-scrub').value=st.i;
  }
  function render(t){if(!host.offsetParent)return;st.mode==='climb'?drawClimb(t):drawGames(t)}
  function go(i,animate){
    st.i=Math.max(0,Math.min(nSteps()-1,i));caption();
    if(st.anim)cancelAnimationFrame(st.anim);
    if(!animate||reduce){render(1);return}
    const t0=performance.now(),dur=700/st.speed;
    const tick=now=>{const t=Math.min(1,(now-t0)/dur);render(1-Math.pow(1-t,3));if(t<1)st.anim=requestAnimationFrame(tick);else st.anim=null};
    st.anim=requestAnimationFrame(tick);
  }
  let timer=null;
  function setPlay(p){st.playing=p;$('ms-play').textContent=p?'Pause':'Play';clearTimeout(timer);if(p)loop()}
  function loop(){clearTimeout(timer);if(!st.playing)return;
    timer=setTimeout(()=>{if(!st.playing)return;
      if(!host.offsetParent||!st.onScreen){loop();return}
      if(st.i>=nSteps()-1){setPlay(false);return}
      go(st.i+1,true);loop()},2400/st.speed)}
  $('ms-play').addEventListener('click',()=>{if(!st.playing&&st.i>=nSteps()-1)go(0,false);setPlay(!st.playing)});
  $('ms-fwd').addEventListener('click',()=>{setPlay(false);go(st.i+1,true)});
  $('ms-back').addEventListener('click',()=>{setPlay(false);go(st.i-1,true)});
  $('ms-scrub').addEventListener('input',e=>{setPlay(false);go(+e.target.value,false)});
  $('ms-speed').addEventListener('change',e=>{st.speed=+e.target.value});
  document.querySelectorAll('#ms-mode button').forEach(b=>b.addEventListener('click',()=>{
    if(st.mode===b.dataset.v)return;st.mode=b.dataset.v;cur=null;setPlay(false);
    document.querySelectorAll('#ms-mode button').forEach(x=>x.classList.toggle('on',x===b));go(0,false)}));
  if('IntersectionObserver' in window)new IntersectionObserver(es=>es.forEach(e=>{st.onScreen=e.isIntersecting})).observe(host);
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-miles']=(window.TAB_RENDER['t-miles']||[]).concat([()=>render(1)]);
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(st.mode==='games')cur=null;render(1)},120)});
  go(0,false);
})();
