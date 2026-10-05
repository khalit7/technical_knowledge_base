// ---- Reading s3: one quadrant's scheduler hiding memory latency (2 warps, 16 warps, 16 warps with 4 loads in flight) ----
// Port of hide_sim in src/recompute.py (greedy-then-oldest); the page's utilisation must equal window.GA.hide.
(function(){
  const G=window.GA,$=id=>document.getElementById(id);
  const MODES=[{W:2,n:1,C:8},{W:16,n:1,C:8},{W:16,n:4,C:32}];
  const LAT=G.hide[0].lat,T=G.hide[0].T,S=G.hide[0].steady_from,STEP=100,N=T/STEP+1;
  function sim(m){
    const W=m.W,prog=[];for(let i=0;i<m.n;i++)prog.push('L');for(let i=0;i<m.C;i++)prog.push('C');
    const pc=new Array(W).fill(0),ra=new Array(W).fill(0),st=[];let cur=0,iss=0,steady=0;const issuedAt=new Uint8Array(T);
    for(let w=0;w<W;w++)st.push(new Uint8Array(T)); // 0 ready-not-picked, 1 waiting on memory, 2 issue arith, 3 issue load
    const cum=new Int32Array(T+1),ar=new Int32Array(T+1);let arith=0;
    for(let t=0;t<T;t++){
      for(let w=0;w<W;w++)st[w][t]=ra[w]>t?1:0;
      let pick=-1;
      if(ra[cur]<=t)pick=cur;else{for(let w=0;w<W;w++)if(ra[w]<=t){pick=w;break}}
      if(pick>=0){cur=pick;const op=prog[pc[pick]];iss++;issuedAt[t]=1;if(t>=S)steady++;
        if(op==='L'){st[pick][t]=3;ra[pick]=(pc[pick]===m.n-1)?t+LAT:t+1}else{st[pick][t]=2;arith++;ra[pick]=t+1}
        pc[pick]=(pc[pick]+1)%prog.length}
      cum[t+1]=iss;ar[t+1]=arith;
    }
    // runs per warp
    const runs=st.map(a=>{const r=[];let s0=0;for(let t=1;t<=T;t++){if(t===T||a[t]!==a[s0]){r.push([s0,t,a[s0]]);s0=t}}return r});
    const sr=[];{let s0=0;for(let t=1;t<=T;t++){if(t===T||issuedAt[t]!==issuedAt[s0]){sr.push([s0,t,issuedAt[s0]]);s0=t}}}
    return {W,st,runs,sr,cum,ar,util:iss/T,steady:steady/(T-S)};
  }
  const R=MODES.map(sim);
  // self-check against the Python reference
  R.forEach((r,i)=>{if(Math.abs(r.steady-G.hide[i].util_steady)>1e-3||r.cum[T]!==G.hide[i].issued)window.__jsErr&&window.__jsErr('latency sim mismatch, mode '+i)});
  let mode=0;
  const COL=['var(--c5)','var(--dim)','var(--c1)','var(--c2)'];
  function draw(i){
    const r=R[mode],box=$('ga-hideSvg'),W=Math.min(860,RD.width(box)),lw=W<480?44:60,pw=W-lw-6;
    const rh=r.W>4?Math.max(8,Math.min(12,200/r.W)):18,y0=40,tc=Math.min(T,i*STEP),X=t=>lw+t/T*pw;
    let g=RD.t(2,12,'cycle',{fs:10,fill:'var(--mute)'});
    for(let t=0;t<=T;t+=500)g+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="16" y2="'+(y0+r.W*rh+4)+'" stroke="var(--line)"/>'+RD.t(X(t),12,t,{a:t===T?'end':'middle',fs:10,fill:'var(--mute)'});
    g+=RD.t(2,30,'issue',{fs:10,w:600});
    r.sr.forEach(s=>{if(s[0]>=tc)return;const e=Math.min(s[1],tc);if(s[2])g+='<rect x="'+X(s[0])+'" y="20" width="'+Math.max(.6,X(e)-X(s[0]))+'" height="12" fill="var(--c3)"/>'});
    for(let w=0;w<r.W;w++){const y=y0+w*rh;
      if(r.W<=4||w%2===0||rh>=10)g+=RD.t(2,y+rh-2,'warp '+w,{fs:Math.min(10,rh-1),fill:'var(--mute)'});
      r.runs[w].forEach(s=>{if(s[0]>=tc)return;const e=Math.min(s[1],tc);g+='<rect x="'+X(s[0])+'" y="'+(y+1)+'" width="'+Math.max(.6,X(e)-X(s[0]))+'" height="'+(rh-2)+'" fill="'+COL[s[2]]+'"'+(s[2]===0?' opacity=".5"':'')+'/>'})}
    const yb=y0+r.W*rh+6;
    g+='<line x1="'+X(tc)+'" x2="'+X(tc)+'" y1="16" y2="'+yb+'" stroke="var(--ink)" stroke-width="1.5"/>';
    const leg=[['var(--c3)','scheduler issued'],['var(--c2)','load issued'],['var(--c1)','arithmetic issued'],['var(--dim)','waiting on memory'],['var(--c5)','ready, not picked']];
    let lx=lw,ly=yb+16;leg.forEach(l=>{const tw=l[1].length*5.6+22;if(lx+tw>W){lx=lw;ly+=15}g+='<rect x="'+lx+'" y="'+(ly-9)+'" width="10" height="10" fill="'+l[0]+'"/>'+RD.t(lx+14,ly,l[1],{fs:10});lx+=tw});
    box.innerHTML=RD.svg(W,ly+6,g,'Scheduler timeline');
    const used=tc?r.cum[tc]/tc:0,waiting=tc<T?r.st.filter(a=>a[tc]===1).length:r.st.filter(a=>a[T-1]===1).length;
    $('ga-hideOut').innerHTML=RD.stat('Cycle',tc.toLocaleString('en-US'),'of '+T.toLocaleString('en-US'))+RD.stat('Issue slots used so far',(used*100).toFixed(1)+'%',r.cum[tc].toLocaleString('en-US')+' instructions')+
      RD.stat('Arithmetic done',r.ar[tc].toLocaleString('en-US'),'instructions')+RD.stat('Steady state (cycles 1,000 to 2,000)',tc>=T?(r.steady*100).toFixed(1)+'%':'at the end','issue-slot utilisation')+RD.stat('Warps waiting on memory now',waiting+' of '+r.W,'');
    let c;
    if(i===0)c=['Two warps. Each issues its load, then has nothing to do for 466 cycles.','All 16 warp slots filled. Each warp issues its one load as soon as the scheduler reaches it, then waits.','16 warps, each issuing 4 independent loads back to back before it needs any of them, then 32 arithmetic instructions.'][mode];
    else if(tc>=T)c=['Two warps keep the scheduler busy only '+(r.steady*100).toFixed(1)+'% of the time: almost every cycle is wasted.','Even the maximum number of warps fills only '+(r.steady*100).toFixed(0)+'% of the issue slots: 16 warps x 9 instructions cannot cover 466 cycles of waiting.','The scheduler issues every cycle in the steady state ('+(r.steady*100).toFixed(0)+'%): more work per load, not more warps, closed the gap.'][mode];
    else c='Cycle '+tc+': '+waiting+' of '+r.W+' warps are waiting on memory; the scheduler has issued in '+(used*100).toFixed(1)+'% of cycles so far.'+(mode===2&&tc>=500&&tc<=700?' The first loads are returning while later warps still have arithmetic queued: the gaps start to close.':'');
    $('ga-hideCap').textContent=c;
  }
  const an=RD.anim({card:'ga-hideCard',ctl:'ga-hideCtl',n:N,draw,ms:900,label:'Cycle step'});
  RD.seg($('ga-hideSeg'),m=>{mode=+m;an.reset(N);an.play()});
  RD.onResize(()=>an.redraw());
})();
