// ---- Reading: same votes, two raters (online Elo against Bradley-Terry), on the real 2024 vote sample (ids rd-elo-) ----
(function(){
  const S=window.HPD.lab,D=HP.decode(S),F=window.HPD.fits.boards.overall.rows;
  const full={};F.forEach(r=>full[r.m]=r);
  const meanBT=S.models.reduce((s,m)=>s+full[m].bt,0)/S.models.length;
  const bt=HP.points(HP.fit(HP.rowsFor(D,[...Array(D.n).keys()],[],'half'),D.m,0,0).r,meanBT);
  const ORD={time:[...Array(D.n).keys()],rev:[...Array(D.n).keys()].reverse(),shuf:HP.shuffled(D.n,7)};
  const finals={};Object.keys(ORD).forEach(k=>finals[k]=HP.elo(D,ORD[k],4).map(v=>v-1000+meanBT));
  // six explained steps (the long-replay rule, 2026-11-06): three stretches of the time-ordered votes, then the same votes reversed and shuffled.
  // A forward step plays its stretch (the vote count, or the move to another order's finals) over about 1.6 s; back, the scrubber and reduced motion jump.
  const NV=[0,500,2000,D.n,D.n,D.n],MODE=['time','time','time','time','rev','shuf'],RM=matchMedia('(prefers-reduced-motion: reduce)').matches,card=document.getElementById('rd-elo-card');
  const byBT=[...Array(D.m).keys()].sort((a,b)=>bt[b]-bt[a]);
  let lo=Math.min(...bt,meanBT),hi=Math.max(...bt,meanBT);Object.values(finals).forEach(f=>f.forEach(v=>{lo=Math.min(lo,v);hi=Math.max(hi,v)}));
  lo=Math.floor((lo-10)/20)*20;hi=Math.ceil((hi+10)/20)*20;
  const short=m=>m.replace('-instruct','').replace('-20240620','').replace('-2024-05-13','').replace('-2024-07-18','').replace('-api-0514','').replace('-20240229','').replace('-20240307','').replace('-it','');
  const fmtDate=t=>new Date(t*1000).toISOString().slice(0,10);
  document.getElementById('rd-elo-note').innerHTML='Sample: '+D.n.toLocaleString('en-US')+' votes among ten models, '+fmtDate(S.first)+' to '+fmtDate(S.last)+', drawn at random (seed 20240826) from the anonymous, de-duplicated votes of the public log of 26 August 2024 (@@LOG@@). Bradley-Terry here is fitted on the sample alone and Elo (K = 4, as in FastChat) is shifted by a constant so both have the same mean as the full-data ratings of these ten models <i class="nl d">derived</i>.'.replace('@@LOG@@','<a href="https://storage.googleapis.com/arena_external_data/public/clean_battle_20240826_public.json" target="_blank" rel="noopener noreferrer">LMArena public battle log</a>');
  const at=(s,t)=>{ // the Elo dots at step s, t of the way from step s-1
    if(s<=3){const n=Math.round(lerp(s?NV[s-1]:0,NV[s],t));return {n,cur:HP.elo(D,ORD.time,4,n).map(v=>v-1000+meanBT)}}
    const a=finals[MODE[s-1]],b=finals[MODE[s]];return {n:D.n,cur:a.map((v,i)=>lerp(v,b[i],t))}};
  const lerp=(a,b,t)=>a+(b-a)*t;let raf=0;
  function render(s,t){
    const {n,cur}=at(s,t),mode=MODE[s];
    const el=document.getElementById('rd-elo-svg');const W=Math.max(300,Math.min(860,RD.width(el)));
    const L=W<480?96:150,R=W-14,rowH=24,top=22,H=top+rowH*D.m+24;
    const x=v=>L+(v-lo)/(hi-lo)*(R-L);
    let b='';
    for(let tk=lo;tk<=hi;tk+=20){b+='<line x1="'+x(tk)+'" x2="'+x(tk)+'" y1="'+(top-6)+'" y2="'+(H-20)+'" stroke="var(--line)"/>';if((tk-lo)%40===0)b+=RD.t(x(tk),H-6,tk,{a:'middle',fs:11,fill:'var(--mute)'})}
    byBT.forEach((i,k)=>{const y=top+k*rowH+rowH/2;
      b+=RD.t(L-6,y+4,short(S.models[i]),{a:'end',fs:W<480?11:12});
      if(s>=4)b+='<circle cx="'+x(finals.time[i])+'" cy="'+y+'" r="4.5" fill="none" stroke="var(--c2)" stroke-opacity=".55" stroke-dasharray="2 2"/>';
      b+='<line x1="'+x(bt[i])+'" x2="'+x(cur[i])+'" y1="'+y+'" y2="'+y+'" stroke="var(--c2)" stroke-opacity=".45" stroke-width="2"/>';
      b+='<rect x="'+(x(bt[i])-1.5)+'" y="'+(y-8)+'" width="3" height="16" fill="var(--c1)"/>';
      b+='<circle cx="'+x(cur[i])+'" cy="'+y+'" r="5" fill="var(--c2)"/>';
    });
    b+=RD.t(L,12,'Arena-style points'+(s>=4?' · dashed rings: the time-order finals':''),{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Online Elo against Bradley-Terry ratings for ten models');
    const rho=HP.spearman(cur,bt);let mx=0;cur.forEach((v,i)=>mx=Math.max(mx,Math.abs(v-bt[i])));
    const dep=Math.max(...[...Array(D.m).keys()].map(i=>{const v=Object.values(finals).map(f=>f[i]);return Math.max(...v)-Math.min(...v)}));
    const ordName={time:'time order',rev:'reversed',shuf:'shuffled'}[mode];
    document.getElementById('rd-elo-cnt').innerHTML=RD.stat('Votes processed',n.toLocaleString('en-US'),'of '+D.n.toLocaleString('en-US')+', '+ordName)+RD.stat('Rank agreement (Spearman)',n?rho.toFixed(3):'-','Elo now against Bradley-Terry')+RD.stat('Largest gap',mx.toFixed(1)+' pts','Elo now against Bradley-Terry')+RD.stat('Order effect on final Elo',dep.toFixed(1)+' pts','largest spread across the three orders');
  }
  function draw(s){cancelAnimationFrame(raf);
    if(s>0&&card.classList.contains('rd-fwd')&&!RM){const t0=performance.now(),go=now=>{const t=Math.min(1,(now-t0)/1600);render(s,t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2);if(t<1)raf=requestAnimationFrame(go)};raf=requestAnimationFrame(go)}
    else render(s,1)}
  const A=RD.anim({card:'rd-elo-card',ctl:'rd-elo-ctl',n:NV.length,draw,ms:4600,label:'Step',list:'sx-elo'});
  RD.onResize(()=>A.redraw());
  window.HP_CHECK=window.HP_CHECK||{};window.HP_CHECK.elo={bt,finals};
})();
