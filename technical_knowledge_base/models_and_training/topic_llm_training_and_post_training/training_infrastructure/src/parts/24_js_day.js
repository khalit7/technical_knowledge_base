// ---- Reading, One day four ways: the same seeded failures through four recovery designs ----
(function(){
  const host=document.getElementById('dy-svg');if(!host)return;
  const ORDER=['sync','async','mem','ft'];
  const SIM={};ORDER.forEach(k=>SIM[k]=IM.simulate(IM.D[k],IM.FAILS));
  window.IM.SIM=SIM; // read by check_page.mjs
  const F=IM.FAILS;
  const COL={train:'var(--good)',lost:'var(--bad)',stall:'var(--c5)',down:'var(--dim)',grp:'var(--c4)'};
  // steps: start, each failure (shown 25 minutes after it hits), end of day
  const TGT=[0].concat(F.map(f=>Math.min(1440,f[0]+25))).concat([1440]);
  let cur=0,raf=0,step=0;
  // what has happened by wall time T
  function upTo(k,T){const s=SIM[k];let useful=0,lost=0,stall=0,down=0;
    if(k==='ft'){s.segs.forEach(g=>{const a=g.a,b=Math.min(g.b,T);if(b<=a)return;if(g.k==='grp')down+=(b-a)/IM.D.ft.group});useful=T-down;return {useful,lost,stall,down}}
    s.segs.forEach(g=>{const a=g.a,b=Math.min(g.b,T);if(b<=a)return;const d=b-a;
      if(g.k==='train')useful+=d;else if(g.k==='lost'){if(g.f<=T)lost+=d;else useful+=d}else if(g.k==='stall')stall+=d;else if(g.k==='down')down+=d});
    return {useful,lost,stall,down}}
  function svg(T,W,win){ // win: [a,b] minutes shown
    const a0=win[0],a1=win[1],pad=8,x=m=>pad+(m-a0)/(a1-a0)*(W-2*pad);
    const laneH=15,lab=15,gap=7,top=4;let y=top,o='';
    ORDER.forEach(k=>{const d=IM.D[k],s=SIM[k];
      let label=d.name;
      if(win.zoom){const p=s.per.find(q=>Math.abs(q.t-win.zoom)<1e-6);
        label+=p?(k==='ft'?': one group down '+IM.fmtMin(p.down*IM.D.ft.group):': loses '+IM.fmtMin(p.lost)+' of work, down '+IM.fmtMin(p.down)):': already down when it hit'}
      o+='<text x="'+pad+'" y="'+(y+11)+'" fill="var(--ink)">'+RD.esc(label)+'</text>';y+=lab;
      o+='<rect x="'+x(a0)+'" y="'+y+'" width="'+(x(a1)-x(a0))+'" height="'+laneH+'" fill="var(--soft)" stroke="var(--line)"/>';
      s.segs.forEach(g=>{let a=Math.max(g.a,a0),b=Math.min(g.b,T,a1);if(b<=a)return;let kk=g.k;if(kk==='lost'&&g.f>T)kk='train';
        if(k==='ft'&&kk==='grp'){o+='<rect x="'+x(a)+'" y="'+(y+laneH-6)+'" width="'+Math.max(2,x(b)-x(a))+'" height="6" fill="'+COL.grp+'"/>';return}
        o+='<rect x="'+x(a)+'" y="'+y+'" width="'+Math.max(kk==='stall'?1.2:0.4,x(b)-x(a))+'" height="'+laneH+'" fill="'+COL[kk]+'"/>'});
      y+=laneH+gap});
    // failures
    F.forEach((f,i)=>{if(f[0]<a0||f[0]>a1||f[0]>T)return;const X=x(f[0]);
      o+='<line x1="'+X+'" x2="'+X+'" y1="'+(top+lab-2)+'" y2="'+(y-gap+2)+'" stroke="var(--bad)" stroke-dasharray="3 2"/>';
      o+='<text x="'+X+'" y="'+(y+9)+'" text-anchor="middle" fill="var(--bad)" font-weight="600">'+(i+1)+'</text>'});
    // axis
    const ax=y+14;const span=a1-a0,stepT=span>600?(W<500?360:180):span>100?30:15;
    for(let m=Math.ceil(a0/stepT)*stepT;m<=a1+1e-9;m+=stepT){const X=x(m);const anchor=X<pad+14?'start':X>W-pad-14?'end':'middle';
      o+='<line x1="'+X+'" x2="'+X+'" y1="'+(ax-4)+'" y2="'+(ax-1)+'" stroke="var(--mute)"/><text x="'+X+'" y="'+(ax+9)+'" text-anchor="'+anchor+'" fill="var(--mute)">'+IM.clock(m)+'</text>'}
    if(T>a0&&T<a1)o+='<line x1="'+x(T)+'" x2="'+x(T)+'" y1="'+top+'" y2="'+(y-gap)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    return '<svg width="'+W+'" height="'+(ax+14)+'" viewBox="0 0 '+W+' '+(ax+14)+'" role="img" aria-label="Four recovery designs over one day">'+o+'</svg>'}
  function render(){const W=Math.max(280,RD.width(host));host.innerHTML=svg(cur,W,[0,1440]);
    // zoom on the failure of the current step
    const z=document.getElementById('dy-zoom');
    if(step>=1&&step<=F.length){const tf=F[step-1][0],a=Math.max(0,tf-75),b=Math.min(1440,tf+30);const w=[a,b];w.zoom=tf;
      z.innerHTML='<div class="small mute" style="margin-top:6px">Zoom: '+IM.clock(a)+' to '+IM.clock(b)+' around failure '+step+'</div>'+svg(Math.max(cur,b),W,w)}
    else z.innerHTML='';
    // counters
    document.getElementById('dy-cnt').innerHTML=ORDER.map(k=>{const u=upTo(k,cur),el=Math.max(cur,1e-9);
      return RD.stat(IM.D[k].name,(cur>0?(100*u.useful/el).toFixed(1):'100.0')+'%','lost '+IM.fmtMin(u.lost)+' · paused '+IM.fmtMin(u.stall)+' · down '+IM.fmtMin(u.down))}).join('')}
  function caption(i){const T=document.getElementById('dy-t'),C=document.getElementById('dy-c');
    if(i===0){T.textContent='00:00, the run is healthy';
      C.innerHTML='Four copies of the same 16,384-GPU job. Their checkpoint intervals differ because each is √(2 · pause · MTBF) for its own pause: '+ORDER.filter(k=>IM.D[k].I).map(k=>IM.D[k].name+' every '+IM.fmtMin(IM.D[k].I)).join(', ')+'; the replica-group design keeps no checkpoints at all. MTBF is 185.6 minutes, Llama 3\'s 54 × 1440 / 419.';return}
    if(i===TGT.length-1){T.textContent='24:00, the day in total';
      C.innerHTML=ORDER.map(k=>IM.D[k].name+' '+(100*SIM[k].useful/1440).toFixed(1)+'%').join('; ')+' of the day was training that counts. The formula expects '+ORDER.map(k=>ettr(k).toFixed(1)+'%').join(', ')+'. Going from synchronous to in-memory recovery buys back about '+Math.round((SIM.mem.useful-SIM.sync.useful)/60)+' GPU-hours per GPU per day, or about '+Math.round((SIM.mem.useful-SIM.sync.useful)/60*IM.GPUS/1000)+' thousand H100-hours a day across the job.';return}
    const f=F[i-1],tf=f[0];const per=k=>SIM[k].per.find(q=>Math.abs(q.t-tf)<1e-6);
    T.textContent='Failure '+i+' at '+IM.clock(tf)+': '+f[1];
    const ps=per('sync'),pa=per('async'),pm=per('mem');
    let s='Root cause drawn from Table 5. ';
    s+=ps?'Synchronous: last durable checkpoint at '+IM.clock(ps.from)+', so '+IM.fmtMin(ps.lost)+' of work is redone after '+IM.fmtMin(ps.down)+' down. ':'Synchronous: still restarting from the previous failure. ';
    if(pa){const ckBefore=(SIM.async.ckTimes||[]).filter(t=>t<=tf).pop();
      const unsaved=ckBefore!==undefined&&tf-ckBefore<IM.D.async.P;
      s+='Asynchronous: '+IM.fmtMin(pa.lost)+' redone'+(unsaved?' (the checkpoint paused at '+IM.clock(ckBefore)+' was still being written, so it falls back one further)':'')+', same 20-minute restart. '}
    if(pm)s+='In memory: '+IM.fmtMin(pm.lost)+' redone, '+IM.fmtMin(pm.down)+' down. ';
    s+='Replica groups: the other 15 groups keep training.';C.innerHTML=s}
  const ettr=k=>{const d=IM.D[k];return d.group?100*(1-IM.D.ft.u/IM.MTBF/d.group):100*IM.ettr(IM.MTBF,d.w,d.u,d.I)};
  function draw(i){step=i;caption(i);const to=TGT[i];cancelAnimationFrame(raf);
    if(RD.RM||to<=cur||!host.offsetParent){cur=to;render();return}
    const from=cur,t0=performance.now(),dur=900;
    const fr=now=>{const p=Math.min(1,(now-t0)/dur);cur=from+(to-from)*(p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2);render();if(p<1)raf=requestAnimationFrame(fr)};raf=requestAnimationFrame(fr)}
  // inputs table
  const src={sync:'Meta assumes w ≈ 5 min and u0 ≈ 5 to 20 min (Kokolis et al.); top of the range',async:'10 s: Meta\'s target; IBM measured 6.3 s at 7B. Background write 5 min. Same restart',mem:'Copy in peer host memory (Gemini SOSP, ByteRobust); hot spare; u0 at the bottom of Meta\'s range',ft:'torchft: only 1 of 16 groups restarts; weights from a peer; no checkpoint'};
  document.querySelector('#dy-tbl tbody').innerHTML=ORDER.map(k=>{const d=IM.D[k];return '<tr><td>'+d.name+'</td><td class="num">'+(d.w?IM.fmtMin(d.w):'none')+'</td><td class="num">'+(d.I?IM.fmtMin(d.I):'none')+'</td><td class="num">'+IM.fmtMin(d.u)+(d.group?' (1 group)':'')+'</td><td class="small">'+src[k]+'</td></tr>'}).join('');
  RD.anim({card:'dy-card',ctl:'dy-ctl',n:TGT.length,draw,ms:3600,label:'Failure'});
  addEventListener('resize',()=>{if(host.offsetParent)render()});
})();
