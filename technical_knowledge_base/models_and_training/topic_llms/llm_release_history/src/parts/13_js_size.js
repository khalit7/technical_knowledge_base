// ---- Sizes: published size against date, total and active, with a quarter-by-quarter time-lapse ----
(function(){
  const R=ROWS.filter(r=>r.t!=null),esc=RH.esc,card=$('spCard');
  const T0=Date.UTC(2023,0,1),T1=Date.UTC(2026,9,1),NQ=15,SC=1500;
  const qEnd=q=>Date.UTC(2023+Math.floor((q+1)/4),((q+1)%4)*3,1);   // first ms after quarter q
  const qOf=t=>Math.min(NQ-1,Math.max(0,(new Date(t).getUTCFullYear()-2023)*4+Math.floor(new Date(t).getUTCMonth()/3)));
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const st={m:'both',closed:true,v:SC,play:false,raf:0,last:0,vis:false,spd:1,sel:null,started:false};
  const med=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
  const act=r=>r.a!=null?r.a:r.t;   // dense: active = total
  const tAt=v=>T0+(T1-T0)*v/SC;
  // trailing four-quarter median of active size of open releases, at the end of quarter q
  const trail=(q,tc)=>{const lo=qEnd(q-4),hi=Math.min(qEnd(q),tc+1);const a=R.filter(r=>r.o&&r.ts>=lo&&r.ts<hi).map(act);return {m:med(a),n:a.length}};
  const W=900,H=430,pl=58,pr=18,pt=16,pb=40;
  const X=t=>pl+(W-pl-pr)*(t-T0)/(T1-T0);
  const lg=Math.log10,Y0=1,Y1=5000;
  const Yl=v=>pt+(H-pt-pb)*(1-(lg(v)-lg(Y0))/(lg(Y1)-lg(Y0)));
  const S1=36,Ys=v=>pt+(H-pt-pb)*(1-v/S1);
  function frame(){let s='';const sp=st.m==='sp';
    const yt=sp?[[1,'1'],[5,'5'],[10,'10'],[15,'15'],[20,'20'],[25,'25'],[30,'30'],[35,'35']]:[[1,'1B'],[3,'3B'],[10,'10B'],[30,'30B'],[100,'100B'],[300,'300B'],[1000,'1T'],[3000,'3T']];
    const Y=sp?Ys:Yl;
    yt.forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    for(let y=2023;y<=2026;y++){const x=X(Date.UTC(y,0,1));s+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)" stroke-dasharray="2 3"/><text x="'+(x+4)+'" y="'+(H-pb+16)+'" font-size="11" fill="var(--mute)">'+y+'</text>'}
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-6)+'" font-size="11.5" text-anchor="middle" fill="var(--mute)">release date</text>';
    s+='<text x="14" y="'+((pt+H-pb)/2)+'" font-size="11.5" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 14 '+((pt+H-pb)/2)+')">'+(sp?'sparsity, total ÷ active (linear)':'parameters, billions (log scale)')+'</text>';
    return s}
  function draw(){
    const tc=tAt(st.v),q=qOf(Math.min(tc,T1-1)),sp=st.m==='sp';
    const vis=R.filter(r=>r.ts<=tc&&(r.o||st.closed));
    const fresh=r=>tc-r.ts<40*864e5&&st.v<SC;
    let s=frame();
    // record line (open totals) and trailing median of active
    if(!sp){let mx=0,pts=[];R.filter(r=>r.o&&r.ts<=tc).sort((a,b)=>a.ts-b.ts).forEach(r=>{if(r.t>mx){if(mx)pts.push([X(r.ts),Yl(mx)]);mx=r.t;pts.push([X(r.ts),Yl(mx)])}});
      if(pts.length){pts.push([X(tc),pts[pts.length-1][1]]);if(st.m!=='a')s+='<polyline points="'+pts.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="var(--c1)" stroke-width="1.6" stroke-dasharray="5 3" opacity=".8"/>'}
      const mp=[];for(let k=0;k<=q;k++){const e=Math.min(qEnd(k),tc);const lo=qEnd(k-4);const a=R.filter(r=>r.o&&r.ts>=lo&&r.ts<=e).map(act);if(a.length)mp.push([X(e),Yl(med(a))])}
      if(mp.length&&st.m!=='t')s+='<polyline points="'+mp.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="var(--c2)" stroke-width="9" stroke-linejoin="round" opacity=".18"/><polyline points="'+mp.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="var(--c2)" stroke-width="1.6"/>'}
    else{const mp=[];for(let k=0;k<=q;k++){const e=Math.min(qEnd(k),tc);const a=R.filter(r=>r.o&&r.moe&&r.ts<=e).map(r=>r.sp);if(a.length)mp.push([X(e),Ys(med(a))])}
      if(mp.length)s+='<polyline points="'+mp.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="var(--c3)" stroke-width="1.8"/>'}
    // marks
    let lab='';
    vis.forEach(r=>{const x=X(r.ts),f=fresh(r),rad=f?6.5:4,c=r.i===st.sel?' stroke="var(--ink)" stroke-width="2"':'';
      const fillT=r.o?'var(--c1)':'none',fillA=r.o?(r.da?'none':'var(--c2)'):'none';
      const g='<g data-i="'+r.i+'" style="cursor:pointer"><title>'+esc(r.m)+', '+r.d+': '+esc(r.sz)+(r.moe?' (sparsity '+r.sp.toFixed(1)+')':'')+(r.o?'':' (closed weights)')+'</title>';
      if(sp){if(!r.moe)return;s+=g+'<circle cx="'+x+'" cy="'+Ys(r.sp)+'" r="'+rad+'" fill="'+(r.o?'var(--c3)':'none')+'" stroke="var(--c3)" stroke-width="1.5"'+c+'/></g>';return}
      const yT=Yl(r.t),yA=Yl(act(r));
      if(st.m==='both'){s+=g+(r.moe?'<line x1="'+x+'" x2="'+x+'" y1="'+yT+'" y2="'+yA+'" stroke="var(--mute)" stroke-width="1.2" opacity=".6"/>':'')+
        '<circle cx="'+x+'" cy="'+yT+'" r="'+rad+'" fill="'+fillT+'" stroke="var(--c1)" stroke-width="1.5"'+c+'/>'+
        (r.moe?'<circle cx="'+x+'" cy="'+yA+'" r="'+rad+'" fill="'+fillA+'" stroke="var(--c2)" stroke-width="1.5"'+c+'/>':'')+'<rect x="'+(x-6)+'" y="'+(yT-6)+'" width="12" height="'+(yA-yT+12)+'" fill="transparent"/></g>'}
      else if(st.m==='t')s+=g+'<circle cx="'+x+'" cy="'+yT+'" r="'+rad+'" fill="'+fillT+'" stroke="var(--c1)" stroke-width="1.5"'+c+'/></g>';
      else s+=g+'<circle cx="'+x+'" cy="'+yA+'" r="'+rad+'" fill="'+(r.moe?fillA:(r.o?'var(--c2)':'none'))+'" stroke="var(--c2)" stroke-width="1.5"'+c+'/></g>'});
    // label the open records
    if(st.m==='both'||st.m==='t'){let mx=0,k=0;R.filter(r=>r.o&&r.ts<=tc).sort((a,b)=>a.ts-b.ts).forEach(r=>{if(r.t>mx){mx=r.t;const x=X(r.ts),y=Yl(r.t);lab+='<text x="'+(x-7)+'" y="'+(y-8-(k++%2)*11)+'" font-size="10.5" text-anchor="end" fill="var(--c1)">'+esc(r.m)+(r.m.includes(RH.fB(r.t))?'':' '+RH.fB(r.t))+'</text>'}})}
    if(sp){const top=R.filter(r=>r.moe&&r.ts<=tc&&(r.o||st.closed)).sort((a,b)=>b.sp-a.sp)[0];if(top)lab+='<text x="'+(X(top.ts)-8)+'" y="'+(Ys(top.sp)+4)+'" font-size="10.5" text-anchor="end" fill="var(--c3)">'+esc(top.m)+' '+top.sp.toFixed(1)+'</text>'}
    // now line
    if(st.v<SC)s+='<line x1="'+X(tc)+'" x2="'+X(tc)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--acc)" stroke-width="1.5"/>';
    const leg=sp?'<tspan fill="var(--c3)">● MoE release</tspan>  <tspan fill="var(--c3)">▬ median so far, open MoE</tspan>':
      (st.m!=='a'?'<tspan fill="var(--c1)">● total</tspan>  ':'')+(st.m!=='t'?'<tspan fill="var(--c2)">● active</tspan>  ':'')+(st.m!=='a'?'<tspan fill="var(--c1)">- - largest open total so far</tspan>  ':'')+(st.m!=='t'?'<tspan fill="var(--c2)">▬ trailing 4-quarter median active, open</tspan>':'');
    s+=lab+'<text x="'+(pl+8)+'" y="'+(pt+12)+'" font-size="11">'+leg+'</text>';
    $('spPlot').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="min-width:600px" role="img" aria-label="Published parameter counts against release date">'+s+'</svg>';
    $('spPlot').querySelectorAll('g[data-i]').forEach(g=>g.addEventListener('click',()=>{st.sel=+g.dataset.i;$('spDet').innerHTML=RH.detail(ROWS[st.sel]);draw()}));
    // caption and counters
    const inQ=ROWS.filter(r=>r.q===q&&r.ts<=tc),inQs=inQ.filter(r=>r.t!=null&&r.o);
    const op=R.filter(r=>r.o&&r.ts<=tc);let rec=null;op.forEach(r=>{if(!rec||r.t>rec.t)rec=r});
    const prev=R.filter(r=>r.o&&r.ts<qEnd(q-1));let pm=0;prev.forEach(r=>{if(r.t>pm)pm=r.t});
    const newRec=inQs.filter(r=>r.t>pm).sort((a,b)=>b.t-a.t)[0];
    const tr=trail(q,tc),moes=op.filter(r=>r.moe);
    $('spStep').textContent=RH.qName(q)+(st.v<SC?'':' (end of the table, 30 September 2026)');
    $('spCap').innerHTML=inQ.length+' release'+(inQ.length===1?'':'s')+' in the table this quarter'+(st.v<SC&&qEnd(q)>tc?' so far':'')+', '+inQs.length+' open with a published size'+
      (inQs.length?': '+inQs.slice(0,6).map(r=>esc(r.m)+' ('+esc(r.sz)+')').join(', ')+(inQs.length>6?' and '+(inQs.length-6)+' more':''):'')+'. '+
      (newRec?'<b>New open record: '+esc(newRec.m)+' at '+RH.fB(newRec.t)+'</b>'+(newRec.moe?', computing each token with '+RH.fB(newRec.a):', dense')+'.':(rec?'Largest open total stays '+esc(rec.m)+' ('+RH.fB(rec.t)+').':''));
    $('spCnt').innerHTML=stat('Open sized releases so far',op.length,'of '+R.filter(r=>r.o).length+' by the end')+stat('Largest open total',rec?RH.fB(rec.t):'none',rec?esc(rec.m):'')+
      stat('Median active, trailing 4 quarters',tr.m!=null?RH.fB(tr.m):'none',tr.n+' open releases')+stat('Median sparsity, open MoE so far',moes.length?med(moes.map(r=>r.sp)).toFixed(1):'none',moes.length+' MoE releases');
    $('spScrub').value=st.v;card.dataset.frames=(+card.dataset.frames||0)+1}
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play)return;if(!live())return;
    if(st.last)st.v=Math.min(SC,st.v+(now-st.last)/1000*50*st.spd);st.last=now;
    if(st.v>=SC){st.v=SC;setPlay(false)}draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  function setPlay(p){st.play=p;$('spPlay').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('spPlay').setAttribute('aria-label',p?'Pause':'Play');if(p&&st.v>=SC)st.v=0;kick()}
  const vOfQ=q=>Math.round(SC*(Math.min(qEnd(q),T1)-T0)/(T1-T0));
  $('spPlay').addEventListener('click',()=>setPlay(!st.play));
  $('spFwd').addEventListener('click',()=>{setPlay(false);const q=qOf(tAt(Math.min(st.v,SC-1)));st.v=st.v>=vOfQ(q)-1?vOfQ(Math.min(NQ-1,q+1)):vOfQ(q);draw()});
  $('spBack').addEventListener('click',()=>{setPlay(false);const q=qOf(tAt(Math.max(0,st.v-1)));st.v=q>0?vOfQ(q-1):0;draw()});
  $('spScrub').addEventListener('input',e=>{setPlay(false);st.v=+e.target.value;draw()});
  $('spSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  segBind('spM',m=>{st.m=m;draw()});
  $('spClosed').addEventListener('change',e=>{st.closed=e.target.checked;draw()});
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  onTab('t-size',()=>{if(!st.started){st.started=true;if(!RM){st.v=0;setPlay(true)}}draw();kick()});
  window.__sp={st,draw,setPlay};
})();
