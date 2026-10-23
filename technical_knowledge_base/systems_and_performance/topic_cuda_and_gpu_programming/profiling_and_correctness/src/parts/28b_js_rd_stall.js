// ---- Reading section 4: where a warp's cycles go, before and after the fix (Warp State and Occupancy sections of NVIDIA's reports) ----
(function(){
  const el=document.getElementById('rd-stall-svg');if(!el||!window.NCU)return;
  const f=MC.fmtN,leg=document.getElementById('rd-stall-leg'),cnt=document.getElementById('rd-stall-cnt');
  const COL={'Long Scoreboard':'var(--c1)','MIO Throttle':'var(--c2)','Barrier':'var(--c3)','Short Scoreboard':'var(--c4)','Tex Throttle':'var(--c5)','LG Throttle':'var(--c6)','Drain':'var(--bad)'};
  const sec=(r,n)=>r.sections.find(s=>s.name===n);
  function warp(r){const s=sec(r,'Warp State Statistics'),t0=s.tables[0].rows,t1=s.tables.find(t=>t.title==='Warp State (All Cycles)').rows;
    const v=l=>+t0.find(x=>x[0]===l)[2];const parts=t1.map(x=>({n:x[0].replace(/^Stall /,''),v:+x[2]}));
    const cpi=v('Warp Cycles Per Issued Instruction'),known=parts.reduce((a,p)=>a+p.v,0);
    return {cpi,ipc:v('Issued Warp Per Scheduler'),parts,other:Math.max(0,cpi-known)}}
  function occ(r){const rows=sec(r,'Occupancy').tables[0].rows,g=l=>+rows.find(x=>x[0]===l)[2];return {th:g('Theoretical Occupancy'),ach:g('Achieved Occupancy')}}
  let k=1;
  function draw(){
    const p=NCU.PAIRS[k],B=NCU.byStem(p.b),A=NCU.byStem(p.a),wb=warp(B),wa=warp(A),ob=occ(B),oa=occ(A);
    const W=RD.width(el),L=W<500?52:70,R=12,mx=Math.max(wb.cpi,wa.cpi),X=v=>v/mx*(W-L-R),bh=30;let s='';
    [[wb,'before',14],[wa,'after',14+bh+30]].forEach(([w,lab,y])=>{
      s+=RD.t(L-6,y+19,lab,{a:'end',fs:11,w:600});let x=L;
      const segs=w.parts.map(q=>({n:q.n,v:q.v,c:COL[q.n]||(q.n==='Selected'?'var(--good)':'var(--dim)')})).concat([{n:'other',v:w.other,c:'var(--dim)'}]);
      segs.forEach(q=>{const ww=X(q.v);if(ww<0.3)return;s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+ww.toFixed(1)+'" height="'+bh+'" style="fill:'+q.c+';opacity:.88;stroke:var(--bg);stroke-width:.6"><title>'+RD.esc(q.n)+': '+f(q.v,2)+' cycles</title></rect>';
        const lab2=q.n+' '+f(q.v,q.v>=10?0:1);if(ww>lab2.length*5.9+6)s+=RD.t(x+4,y+19,RD.esc(lab2),{fs:10.5,fill:q.c==='var(--dim)'?'var(--ink)':'var(--bg)'});x+=ww});
      s+=RD.t(Math.min(W-R,x+4),y+bh+13,f(w.cpi,w.cpi>=100?0:1)+' cycles per issued instruction',{a:x+200>W-R?'end':'start',fs:10.5,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,14+2*bh+30+18,s,'warp cycles per issued instruction by stall reason, before and after');
    const names=[...new Set(wb.parts.concat(wa.parts).map(q=>q.n))].filter(n=>COL[n]);
    leg.innerHTML=names.map(n=>'<span style="--sw:'+COL[n]+'">'+n+'</span>').join('')+'<span style="--sw:var(--good)">Selected (issuing)</span><span style="--sw:var(--dim)">other reasons</span>';
    cnt.innerHTML=RD.stat('Cycles per issued instruction',f(wb.cpi,1)+' &rarr; '+f(wa.cpi,1),'per warp')+RD.stat('Issued warp per scheduler',f(wb.ipc,2)+' &rarr; '+f(wa.ipc,2),'1.00 would issue every cycle')+
      RD.stat('Achieved occupancy',f(ob.ach,1)+'% &rarr; '+f(oa.ach,1)+'%','theoretical '+f(ob.th,0)+'% and '+f(oa.th,0)+'%')+RD.stat('Top stall before',RD.esc(wb.parts.filter(q=>q.n!=='Selected')[0].n),f(wb.parts[0].v,1)+' cycles');
  }
  RD.seg(document.getElementById('rd-stall-seg'),v=>{k=+v;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
