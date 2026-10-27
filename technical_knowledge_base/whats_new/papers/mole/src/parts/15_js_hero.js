// ---- Hero figure (light pass, 2026-10-25): the 45 completed harms of the GPT-5.3 single-day test period, and how many
// land in the daily top 10 for a random queue and four monitors. Counts from recompute.json (Figure 4 as k of 45, and
// the random queue's expectation, 10 / active accounts per day averaged over the test days). Static: nothing moves.
(function(){const el=$('heroSvg');if(!el)return;
  const f4={};RC.f4.forEach(r=>{f4[r.m]=r});
  const rows=[['random queue',RC.random_r10*45,'var(--dim)','expected'],['GPT-4.1-nano',f4['GPT-4.1-nano'].k,'var(--c1)'],['FACADE (counts)',f4['FACADE'].k,'var(--c5)'],['GPT-5.5',f4['GPT-5.5'].k,'var(--c1)'],['Claude Opus 4.7',f4['Claude Opus 4.7'].k,'var(--c1)']];
  fit(el,w=>{const narrow=w<520,lw=narrow?104:132,cw=narrow?44:92,pl=lw+8,iw=w-pl-cw,cell=iw/45,rh=narrow?24:26,pt=20,H=pt+rows.length*rh+30;let s='';
    s+=tx(pl,12,narrow?'45 completed harms, one square each':'45 completed harms in the 15 test days, one square each',{fs:11,c:'var(--mute)'});
    rows.forEach((r,i)=>{const y=pt+i*rh,k=r[1],whole=Math.floor(k+1e-9);
      s+=tx(lw,y+rh/2+3,r[0],{fs:11,a:'end',c:'var(--ink)'});
      for(let j=0;j<45;j++){const on=j<whole||(r[3]&&j<Math.round(k));s+=rc(pl+j*cell+.5,y+4,Math.max(1,cell-1.2),rh-10,on?r[2]:'var(--soft)',{r:1.5,s:on?null:'var(--line)',sw:.8})}
      s+=tx(w-cw+6,y+rh/2+3,(r[3]?'≈'+k.toFixed(1):k)+(narrow?'':' caught'),{fs:11,w:600,c:'var(--ink)'})});
    const yb=pt+rows.length*rh+6,x24=pl+24*cell;
    s+=ln2(x24,pt+(rows.length-1)*rh+2,x24,yb+2,'var(--bad)',{da:'3 3'});
    s+=tx(Math.min(x24+4,w-cw-120),yb+16,narrow?'21 missed by the best':'21 missed by the best monitor',{fs:11,c:'var(--bad)'});
    el.innerHTML=svgW(w,H,s,'Completed harms caught in the daily top 10 by a random queue and four monitors')})})();
