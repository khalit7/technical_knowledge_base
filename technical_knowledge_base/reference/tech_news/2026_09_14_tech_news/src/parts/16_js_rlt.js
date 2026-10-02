// ---- Depth across tokens: decoder-only Transformer against the Recurrent Looped Transformer (48 + 48) ----
(function(){
  const card=$('v-rlt');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const T=8,PR=5,R=16,LPR=6,UNIT=170; // tokens shown, prompt tokens, rows (6 layers each), ms per row
  // Each step is a list of units; a unit computes one row for a set of columns, in order
  const rows=(a,b,cols)=>{const u=[];for(let r=a;r<b;r++)u.push({r,cols});return u};
  const range=(a,b)=>Array.from({length:b-a},(_,i)=>a+i);
  const M={
    tf:{name:'Decoder-only Transformer',steps:[
      {t:'The prompt arrives',c:'Five prompt tokens, 96 layers each. Nothing has run yet.',u:[]},
      {t:'Prefill: every prompt token, one layer at a time',c:'All five tokens go through layer 1 together, then layer 2, and so on: 96 sequential layer steps for the whole prompt, however long it is. Tokens exchange information only through attention to each other\'s cached keys and values, sideways at the same layer.',u:rows(0,R,range(0,PR))},
      {t:'Generate token 6',c:'The new token runs all 96 layers. Its output depends on earlier tokens only through attention, so the longest chain of computation behind it is still 96 blocks: what token 5 computed at its top layer never feeds token 6\'s first layer.',u:rows(0,R,[5])},
      {t:'Generate tokens 7 and 8',c:'Each new token adds another 96 sequential layer steps of latency, but the depth behind any single output never grows past 96. Switch to RLT and run the same eight tokens.',u:rows(0,R,[6]).concat(rows(0,R,[7]))}]},
    rlt:{name:'RLT',steps:[
      {t:'The same prompt arrives',c:'Same five tokens, same 96 blocks per token, now split into a 48-layer causal encoder and a 48-layer recurrent decoder with shared weights.',u:[]},
      {t:'Encoder: the prompt in parallel',c:'The causal encoder runs over all known tokens together, like a normal Transformer, and builds the global key-value memory the decoder will read: 48 sequential layer steps.',u:rows(0,8,range(0,PR))},
      {t:'Decoder, token 1',c:'The decoder starts from a learned initial state and runs its 48 layers on token 1, reading the encoder memory. Its final output s1 is kept.',u:rows(8,R,[0])},
      {t:'Decoder, tokens 2 to 5: one after another',c:'Token 2\'s decoder input merges its own embedding with s1, token 3\'s with s2, and so on. The chain of computation now runs through every earlier token\'s full decoder: 48, 96, 144, 192, 240 blocks. The price is that this cannot run in parallel: the decoder walks the prompt token by token.',u:[2,3,4,5].reduce((a,t)=>a.concat(rows(8,R,[t-1])),[])},
      {t:'Generate token 6',c:'Generation looks as before: encode the new token, then run the decoder from s5. The deepest chain behind token 6\'s output is 6 x 48 = 288 decoder blocks, at the same 96 blocks of work per token.',u:rows(0,8,[5]).concat(rows(8,R,[5]))},
      {t:'Generate tokens 7 and 8',c:'After t tokens the chain is t x 48 decoder blocks while the work per token stays fixed. The report is candid that this is structural depth, not proven reasoning: gates may suppress long paths, and no trained model of this size has shown the gain.',u:rows(0,8,[6]).concat(rows(8,R,[6])).concat(rows(0,8,[7])).concat(rows(8,R,[7]))}]}};
  const st={m:'tf',k:0,t:RM?1:0,play:false,spd:1,vis:false,raf:0,last:0,P:1000};
  const cl=x=>Math.max(0,Math.min(1,x));
  function done(){ // cells computed so far and units completed
    const S=M[st.m].steps,cells={};let units=0;
    for(let k=0;k<=st.k;k++){const U=S[k].u,n=k<st.k?U.length:Math.floor(st.t*U.length+1e-9);
      for(let i=0;i<n;i++){U[i].cols.forEach(c=>cells[c+'|'+U[i].r]=1);units++}}
    return {cells,units}}
  function draw(){
    const mode=M[st.m],S=mode.steps,D=done(),box=$('rltSvg'),narrow=(box.clientWidth||340)<560;
    const W=narrow?Math.max(300,Math.round(box.clientWidth||340)):760,lw=narrow?46:62,cw=(W-lw-10)/T,rh=narrow?9:11,top=24,egap=st.m==='rlt'?6:0;
    const yr=r=>top+(R-1-r)*rh+(st.m==='rlt'&&r<8?egap:0),H0=top+R*rh+egap;
    let s='';
    for(let c=0;c<T;c++){const x=lw+c*cw;s+='<text x="'+(x+cw/2)+'" y="14" font-size="11" text-anchor="middle" fill="'+(c<PR?'var(--mute)':'var(--ink)')+'">'+(c<PR?'p':'g')+(c+1)+'</text>'}
    s+='<text x="'+(lw-6)+'" y="14" font-size="11" text-anchor="end" fill="var(--mute)">token</text>';
    const lab=st.m==='tf'?[[0,'1'],[7,'48'],[15,'96']]:[[0,'enc 1'],[7,'enc 48'],[8,'dec 1'],[15,'dec 48']];
    lab.forEach(([r,l])=>{s+='<text x="'+(lw-6)+'" y="'+(yr(r)+rh-1)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    for(let c=0;c<T;c++)for(let r=0;r<R;r++){const x=lw+c*cw+2,on=D.cells[c+'|'+r];
      const col=st.m==='tf'?'var(--acc)':(r<8?'var(--c3)':'var(--c4)');
      s+='<rect x="'+x+'" y="'+yr(r)+'" width="'+(cw-4)+'" height="'+(rh-1.5)+'" rx="1.5" fill="'+(on?col:'var(--soft)')+'" stroke="'+(on?'none':'var(--line)')+'"/>'}
    // longest chain behind the newest finished token
    let newest=-1;for(let c=T-1;c>=0;c--)if(D.cells[c+'|'+(R-1)]){newest=c;break}
    let depth=0;
    if(newest>=0){
      if(st.m==='tf'){const x=lw+newest*cw+cw/2;s+='<line x1="'+x+'" x2="'+x+'" y1="'+(yr(0)+rh)+'" y2="'+yr(R-1)+'" stroke="var(--c2)" stroke-width="3" stroke-linecap="round"/>';depth=96}
      else{let p='M'+(lw+cw/2)+' '+(yr(0)+rh);p+=' L'+(lw+cw/2)+' '+yr(R-1);
        for(let c=1;c<=newest;c++){const x0=lw+(c-1)*cw+cw/2,x1=lw+c*cw+cw/2;p+=' L'+x1+' '+(yr(8)+rh)+' L'+x1+' '+yr(R-1)}
        s+='<path d="'+p+'" fill="none" stroke="var(--c2)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>';depth=48*(newest+1)}}
    const H=H0+8;
    box.innerHTML=svgEl(W,H,s,'Eight tokens through '+mode.name);
    if(st.lk!==st.k||st.lm!==st.m){$('rltStep').textContent=mode.name+', step '+(st.k+1)+' of '+S.length+': '+S[st.k].t;$('rltCap').innerHTML=S[st.k].c;st.lk=st.k;st.lm=st.m}
    const seq=D.units*LPR,P=st.P;
    $('rltCnt').innerHTML=stat('Blocks run per token','96','the same in both')+
      stat('Sequential layer steps so far',fmt(seq),'one row = 6 layer steps')+
      stat('Longest chain behind the newest token',depth?fmt(depth)+' blocks':'none yet',st.m==='tf'?'never more than 96':'t x 48 decoder blocks')+
      stat('Sequential steps to prefill '+fmt(P)+' tokens',st.m==='tf'?'96':fmt(48+48*P),st.m==='tf'?'tokens run in parallel':'48 + 48 x '+fmt(P)+', derived');
    const sc=$('rltScrub');sc.max=S.length*100;sc.value=Math.round((st.k+st.t)*100);
    const end=st.k===S.length-1&&st.t>=1;const pb=$('rltPlay');pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const dur=()=>Math.max(1200,M[st.m].steps[st.k].u.length*UNIT);
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    const S=M[st.m].steps;st.t+=dt*st.spd/dur();if(st.t>=1){if(st.k<S.length-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('rltPlay').addEventListener('click',()=>{const S=M[st.m].steps;if(st.play){pause()}else{if(st.k===S.length-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<S.length-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $('rltFwd').addEventListener('click',()=>{pause();const S=M[st.m].steps;if(st.t>=1&&st.k<S.length-1)st.k++;st.t=1;draw()});
  $('rltBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('rltScrub').addEventListener('input',e=>{pause();const v=+e.target.value,S=M[st.m].steps;st.k=Math.min(S.length-1,Math.floor(v/100));st.t=cl(v/100-st.k);if(v>=S.length*100)st.t=1;draw()});
  $('rltSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  $('rltP').addEventListener('change',e=>{st.P=+e.target.value;draw()});
  const seg=$('rltM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,()=>{draw();kick()});
  draw();
})();
