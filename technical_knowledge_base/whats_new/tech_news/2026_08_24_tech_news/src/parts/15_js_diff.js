// ---- One token at a time against a 256-token block: AR, speculative decoding and DiffusionGemma on one clock ----
(function(){
  const card=$('v-diff');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const C=256,TPS_D=1479,TPS_M=303,P0=12; // report: canvas 256, about 12 passes, 1,479 and 303 tokens per second
  const msPassD=1000*C/TPS_D/P0; // derived: 14.4 ms per diffusion pass (decode only)
  const st={clk:'pass',c:0,play:!RM,spd:1,vis:false,raf:0,last:0,tpf:4.5,P:12};
  // illustrative per-cell order: rank in [0,1) decides when a cell settles; a few cells get a provisional token first and are revised later
  const rnd=mulberry32(20260820),rank=[],rev=[];for(let i=0;i<C;i++){rank.push(rnd());rev.push(rnd()<0.07)}
  const settled=(p,P)=>{if(p<=0)return 0;if(p>=P)return 1;const x=p/P;return x*x*(3-2*x)};
  const lanes=[
    {id:'ar',h:'Autoregressive',sm:'one token per forward pass',c:'var(--c2)'},
    {id:'mtp',h:'Speculative decoding',sm:'a draft of 8, about 3 to 6 kept per pass',c:'var(--c1)'},
    {id:'dg',h:'DiffusionGemma',sm:'all 256 refined in parallel, settling the most certain first',c:'var(--c3)'}];
  $('dgLanes').innerHTML=lanes.map(l=>'<div class="dg-lane" id="dgL_'+l.id+'"><h4 style="color:'+l.c+'">'+l.h+'</h4><div class="sm">'+l.sm+'</div><div id="dgG_'+l.id+'"></div><div class="st" id="dgS_'+l.id+'"></div></div>').join('');
  const msPassM=()=>1000*st.tpf/TPS_M; // derived from 303 tok/s at the chosen tokens per pass
  const passesM=()=>Math.ceil(C/st.tpf);
  const maxClock=()=>st.clk==='pass'?C:Math.max(1000*C/TPS_M,st.P*msPassD)*1.04;
  function passesAt(id){ // forward passes completed by each lane at the current clock
    if(st.clk==='pass')return st.c;
    if(id==='ar')return null;
    return st.c/(id==='mtp'?msPassM():msPassD)}
  function grid(id,p){
    const cs=13,g=1,n=16,W=n*(cs+g)+2;let d={};const put=(i,col,op)=>{const x=1+(i%n)*(cs+g),y=1+Math.floor(i/n)*(cs+g);const k=col+'|'+op;(d[k]=d[k]||[]).push('M'+x+' '+y+'h'+cs+'v'+cs+'h-'+cs+'z')};
    let done=0,prov=0,revised=0;const col=lanes.find(l=>l.id===id).c;
    if(id==='dg'){const P=st.P,f=settled(p,P),fPrev=settled(Math.floor(p)-1,P);
      for(let i=0;i<C;i++){
        if(p>=P){put(i,col,1);done++;if(rev[i])revised++;continue}
        if(f>rank[i]){ // settled
          if(rev[i]&&f<rank[i]+0.35){put(i,col,.45);prov++} // provisional, will be revised
          else{put(i,col,1);done++;if(rev[i])revised++}}
        else put(i,'var(--dim)',(0.35+0.5*((i*7919)%13)/13).toFixed(2))}} // random tokens of the starting canvas
    else{const k=id==='ar'?Math.min(C,Math.floor(p)):Math.min(C,Math.floor(p*st.tpf));const last=id==='ar'?1:Math.round(st.tpf);
      for(let i=0;i<C;i++){if(i<k){put(i,col,i>=k-last&&k<C?.6:1);done++}else put(i,'var(--soft)',1)}}
    let s='';Object.entries(d).forEach(([kk,a])=>{const [c,op]=kk.split('|');s+='<path d="'+a.join('')+'" fill="'+c+'" fill-opacity="'+op+'"/>'});
    s+='<rect x=".5" y=".5" width="'+(W-1)+'" height="'+(W-1)+'" fill="none" stroke="var(--line)"/>';
    return {svg:svgEl(W,W,s,id+' block of 256 tokens'),done,prov,revised}}
  function draw(){
    const mc=maxClock();if(st.c>mc)st.c=mc;
    $('dgTv').textContent=st.tpf.toFixed(1)+' (passes for 256: '+passesM()+')';$('dgPv').textContent=st.P+(st.P===12?' (the report\'s average)':st.P===48?' (the sampler\'s maximum)':'');
    const info={};
    lanes.forEach(l=>{const p=passesAt(l.id),el=$('dgL_'+l.id);
      if(p==null){el.classList.add('na');$('dgG_'+l.id).innerHTML=grid(l.id,0).svg;$('dgS_'+l.id).innerHTML='no measured speed in the report, so no time clock';info[l.id]=null;return}
      el.classList.remove('na');
      const need=l.id==='ar'?C:l.id==='mtp'?passesM():st.P;const pc=Math.min(Math.floor(p+1e-9),need);const g=grid(l.id,pc);
      $('dgG_'+l.id).innerHTML=g.svg;
      const passes=Math.floor(pc+1e-9),fin=pc>=need-1e-9;
      const ms=l.id==='ar'?null:(st.clk==='time'?Math.min(st.c,need*(l.id==='mtp'?msPassM():msPassD)):Math.min(p,need)*(l.id==='mtp'?msPassM():msPassD));
      $('dgS_'+l.id).innerHTML='passes <b>'+fmt(passes)+'</b> · final tokens <b>'+fmt(g.done)+'</b>/256'+(l.id==='dg'&&!fin?' · provisional '+g.prov:'')+(l.id==='dg'?' · revised '+g.revised:'')+
        '<br>tokens per pass '+(passes?(g.done/passes).toFixed(1):'0')+(ms!=null?' · '+fmt(ms,0)+' ms'+(st.clk==='pass'?' at measured speed':''):'')+(fin?' · <b>done</b>':'');
      info[l.id]={passes,done:g.done,fin,need}});
    // caption
    let t,c;const P=st.P,pm=passesM();
    if(st.clk==='pass'){const k=Math.floor(st.c);
      t='Forward pass '+k+' of the clock';
      if(k===0)c='Nothing is decoded yet. The diffusion block starts as 256 random tokens (grey); the other two start empty.';
      else if(k<P)c='After '+k+' passes the autoregressive lane has '+k+' tokens and speculative decoding about '+fmt(Math.min(C,Math.floor(k*st.tpf)))+'. The diffusion lane has settled '+info.dg.done+' of 256; pale cells hold a provisional token that a later pass will revise (uniform diffusion lets earlier choices change within the block).';
      else if(k<pm)c='The diffusion block finished at pass '+P+' (adaptive stopping ends it once the canvas stops changing). Speculative decoding needs '+pm+' passes for the same 256 tokens at '+st.tpf.toFixed(1)+' per pass; autoregressive decoding needs all 256. Try 16x.';
      else if(k<C)c='Speculative decoding finished at pass '+pm+'; autoregressive decoding is at '+k+' of 256. In passes: 256 against '+pm+' against '+P+'. But a diffusion pass processes a whole block, so it costs more: switch the clock to milliseconds.';
      else c='All three are done: 256, '+pm+' and '+P+' passes. Fewer passes is not the same as faster: switch the clock to milliseconds at the measured speed.'}
    else{const ms=st.c;t=fmt(ms,0)+' ms of decoding';
      const dDone=P*msPassD,mDone=1000*C/TPS_M;
      c='At the measured speeds a diffusion pass takes about '+msPassD.toFixed(1)+' ms (derived: 256 / 1,479 tokens per second / 12 passes) and a speculative pass about '+msPassM().toFixed(1)+' ms (derived from 303 tokens per second at '+st.tpf.toFixed(1)+' tokens per pass). The diffusion block is done at '+fmt(dDone,0)+' ms, speculative decoding at '+fmt(mDone,0)+' ms: '+(mDone/dDone).toFixed(1)+' times faster'+(P===12?', the report\'s 1,479 against 303 tokens per second (4.9x)':'')+', from '+(pm/P).toFixed(1)+' times fewer passes.'+(P!==12?' Assumes a pass costs the same whatever the number of passes; the report measured the average.':'')}
    $('dgStep').textContent=t;$('dgCap').textContent=c;
    const sc=$('dgScrub');sc.value=Math.round(1000*st.c/mc);
    const end=st.c>=mc-1e-9;const pb=$('dgPlay');pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const rate=()=>st.clk==='pass'?4:70; // clock units per real second at 1x
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.c+=dt/1000*rate()*st.spd;const mc=maxClock();if(st.c>=mc){st.c=mc;st.play=false}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  const stepU=()=>st.clk==='pass'?1:10;
  $('dgPlay').addEventListener('click',()=>{if(st.play)pause();else{if(st.c>=maxClock()-1e-9)st.c=0;st.play=true;kick()}draw()});
  $('dgFwd').addEventListener('click',()=>{pause();st.c=Math.min(maxClock(),Math.floor(st.c/stepU()+1e-9)*stepU()+stepU());draw()});
  $('dgBack').addEventListener('click',()=>{pause();st.c=Math.max(0,Math.ceil(st.c/stepU()-1e-9)*stepU()-stepU());draw()});
  $('dgScrub').addEventListener('input',e=>{pause();st.c=maxClock()*(+e.target.value)/1000;draw()});
  $('dgSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  $('dgT').addEventListener('input',e=>{st.tpf=+e.target.value;draw()});
  $('dgP').addEventListener('input',e=>{st.P=+e.target.value;draw()});
  const seg=$('dgClk');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.clk=b.dataset.m;st.c=0;if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  onTab(card.closest('.tab').id,()=>{draw();kick()});
  draw();
})();
