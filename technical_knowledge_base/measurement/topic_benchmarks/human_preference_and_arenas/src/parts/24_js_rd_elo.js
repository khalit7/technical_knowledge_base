// ---- Reading: same votes, two raters (online Elo against Bradley-Terry), on the real 2024 vote sample (ids rd-elo-) ----
(function(){
  const S=window.HPD.lab,D=HP.decode(S),F=window.HPD.fits.boards.overall.rows;
  const full={};F.forEach(r=>full[r.m]=r);
  const meanBT=S.models.reduce((s,m)=>s+full[m].bt,0)/S.models.length;
  const bt=HP.points(HP.fit(HP.rowsFor(D,[...Array(D.n).keys()],[],'half'),D.m,0,0).r,meanBT);
  const ORD={time:[...Array(D.n).keys()],rev:[...Array(D.n).keys()].reverse(),shuf:HP.shuffled(D.n,7)};
  const finals={};Object.keys(ORD).forEach(k=>finals[k]=HP.elo(D,ORD[k],4).map(v=>v-1000+meanBT));
  const STEPS=13;let mode='time';
  const byBT=[...Array(D.m).keys()].sort((a,b)=>bt[b]-bt[a]);
  let lo=Math.min(...bt,meanBT),hi=Math.max(...bt,meanBT);Object.values(finals).forEach(f=>f.forEach(v=>{lo=Math.min(lo,v);hi=Math.max(hi,v)}));
  lo=Math.floor((lo-10)/20)*20;hi=Math.ceil((hi+10)/20)*20;
  const short=m=>m.replace('-instruct','').replace('-20240620','').replace('-2024-05-13','').replace('-2024-07-18','').replace('-api-0514','').replace('-20240229','').replace('-20240307','').replace('-it','');
  const fmtDate=t=>new Date(t*1000).toISOString().slice(0,10);
  document.getElementById('rd-elo-note').innerHTML='Sample: '+D.n.toLocaleString('en-US')+' votes among ten models, '+fmtDate(S.first)+' to '+fmtDate(S.last)+', drawn at random (seed 20240826) from the anonymous, de-duplicated votes of the public log of 26 August 2024 (@@LOG@@). Bradley-Terry here is fitted on the sample alone and Elo (K = 4, as in FastChat) is shifted by a constant so both have the same mean as the full-data ratings of these ten models <i class="nl d">derived</i>.'.replace('@@LOG@@','<a href="https://storage.googleapis.com/arena_external_data/public/clean_battle_20240826_public.json" target="_blank" rel="noopener noreferrer">LMArena public battle log</a>');
  function draw(s){
    const n=Math.round(s/(STEPS-1)*D.n);
    const cur=HP.elo(D,ORD[mode],4,n).map(v=>v-1000+meanBT);
    const el=document.getElementById('rd-elo-svg');const W=Math.max(300,Math.min(860,RD.width(el)));
    const L=W<480?96:150,R=W-14,rowH=24,top=22,H=top+rowH*D.m+24;
    const x=v=>L+(v-lo)/(hi-lo)*(R-L);
    let b='';
    for(let t=lo;t<=hi;t+=20){b+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="'+(top-6)+'" y2="'+(H-20)+'" stroke="var(--line)"/>';if((t-lo)%40===0)b+=RD.t(x(t),H-6,t,{a:'middle',fs:10,fill:'var(--mute)'})}
    byBT.forEach((i,k)=>{const y=top+k*rowH+rowH/2;
      b+=RD.t(L-6,y+4,short(S.models[i]),{a:'end',fs:W<480?10:11.5});
      b+='<line x1="'+x(bt[i])+'" x2="'+x(cur[i])+'" y1="'+y+'" y2="'+y+'" stroke="var(--c2)" stroke-opacity=".45" stroke-width="2"/>';
      b+='<rect x="'+(x(bt[i])-1.5)+'" y="'+(y-8)+'" width="3" height="16" fill="var(--c1)"/>';
      b+='<circle cx="'+x(cur[i])+'" cy="'+y+'" r="5" fill="var(--c2)"/>';
    });
    b+=RD.t(L,12,'Arena-style points',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Online Elo against Bradley-Terry ratings for ten models');
    const rho=HP.spearman(cur,bt);let mx=0;cur.forEach((v,i)=>mx=Math.max(mx,Math.abs(v-bt[i])));
    const dep=Math.max(...[...Array(D.m).keys()].map(i=>{const v=Object.values(finals).map(f=>f[i]);return Math.max(...v)-Math.min(...v)}));
    document.getElementById('rd-elo-cnt').innerHTML=RD.stat('Votes processed',n.toLocaleString('en-US'),'of '+D.n.toLocaleString('en-US'))+RD.stat('Rank agreement (Spearman)',n?rho.toFixed(3):'-','Elo now against Bradley-Terry')+RD.stat('Largest gap',mx.toFixed(1)+' pts','Elo now against Bradley-Terry')+RD.stat('Order effect on final Elo',dep.toFixed(1)+' pts','largest spread across the three orders');
    const ordName={time:'in the order they were cast',rev:'in reverse order',shuf:'in a shuffled order'}[mode];
    let cap;
    if(s===0)cap=['Start: every model at the same rating','Online Elo starts all models level and updates two of them after each vote. Bradley-Terry (blue ticks) has already used every vote at once: its ratings are where the sample says the models are.'];
    else if(s<STEPS-1)cap=['After '+n.toLocaleString('en-US')+' votes, '+ordName,'Each vote moves the two models by at most 4 points. Early votes have pulled the orange dots part of the way; models that happened to meet strong opponents early lag behind.'];
    else cap=['All '+D.n.toLocaleString('en-US')+' votes, '+ordName,'Elo ends near Bradley-Terry but not on it, and where it ends depends on the order: switch the order above and the dots land elsewhere while the blue ticks stay put. That order dependence is why the arena moved to Bradley-Terry.'];
    document.getElementById('rd-elo-cap').innerHTML='<div class="t">'+cap[0]+'</div><p>'+cap[1]+'</p>';
  }
  const A=RD.anim({card:'rd-elo-card',ctl:'rd-elo-ctl',n:STEPS,draw,ms:900,label:'Votes processed'});
  RD.seg(document.getElementById('rd-elo-seg'),m=>{mode=m;A.reset(STEPS);A.go(STEPS-1)});
  RD.onResize(()=>A.redraw());
  window.HP_CHECK=window.HP_CHECK||{};window.HP_CHECK.elo={bt,finals};
})();
