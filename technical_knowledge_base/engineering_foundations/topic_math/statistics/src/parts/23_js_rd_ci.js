// ---- Reading s5: 100 repetitions of one experiment, each with its 95% interval (data: SD.anim, seeded draws from sims.py) ----
ST.ivals=function(key,meth){
  const sc=SD.anim[key],n=sc.n,c=meth==='t'?SD.tcrit[String(n)]:1.96;
  return sc.x.map(r=>{let m=0;r.forEach(v=>m+=v);m/=n;let ss=0;r.forEach(v=>ss+=(v-m)*(v-m));const s=Math.sqrt(ss/(n-1)),h=c*s/Math.sqrt(n);
    return {m:m,s:s,lo:m-h,hi:m+h,cov:m-h<=sc.mu&&sc.mu<=m+h,low:m+h<sc.mu}});
};
ST.ivalCount=(key,meth)=>{const iv=ST.ivals(key,meth);return {cov:iv.filter(v=>v.cov).length,low:iv.filter(v=>v.low).length,high:iv.filter(v=>!v.cov&&!v.low).length}};
(function(){
  const card=document.getElementById('rd-ci-card');if(!card)return;
  const GK={normal30:['normal','30'],tiny30:['tiny','30'],lognormal5:['lognormal','5']};
  let key='normal30',meth='t',iv=ST.ivals(key,meth);
  // fixed axis per population (intervals running past it are cut at the edge)
  const RANGE={normal30:[0.3,1.4],tiny30:[0.3,1.4],lognormal5:[-1,5]};
  function range(){return RANGE[key]}
  function frame(k){
    const sc=SD.anim[key],el=document.getElementById('rd-ci-svg'),W=RD.width(el),L=10,R=10,T=34,rowH=2.6,H=T+100*rowH+26,pw=W-L-R;
    const [lo,hi]=range(),X=x=>L+(Math.min(hi,Math.max(lo,x))-lo)/(hi-lo)*pw;
    let s='';
    // the current sample's draws
    if(k>0){const r=sc.x[k-1],v=iv[k-1];r.forEach(x=>{if(x<lo||x>hi)return;s+='<circle cx="'+X(x).toFixed(1)+'" cy="14" r="3" style="fill:var(--c1);opacity:.55"/>'});
      s+='<line x1="'+X(v.m)+'" x2="'+X(v.m)+'" y1="5" y2="23" style="stroke:var(--ink);stroke-width:2"/>'+RD.t(L,31,'experiment '+k+': '+sc.n+' draws (dots, those on the axis), their mean (bar)',{fs:10,fill:'var(--mute)'})}
    else s+=RD.t(L,18,'Each step runs the experiment more times',{fs:11,fill:'var(--mute)'});
    // the rows still to come, as a faint band, so the card's layout is whole from the first step
    if(k<100){const y0=T+k*rowH-1,h=(100-k)*rowH+2;s+='<rect x="'+L+'" y="'+y0.toFixed(1)+'" width="'+pw+'" height="'+h.toFixed(1)+'" rx="4" style="fill:var(--soft);stroke:var(--line);stroke-dasharray:4 4"/>';if(h>40)s+=RD.t(L+pw/2,y0+h/2+4,(100-k)+' experiments still to run',{fs:12,a:'middle',fill:'var(--mute)'}).replace('<text ','<text style="paint-order:stroke;stroke:var(--soft);stroke-width:5px;stroke-linejoin:round" ')}
    // (the truth line is drawn after the rows, so the band's label sits under it)
    for(let i=0;i<k;i++){const v=iv[i],y=T+i*rowH+1;s+='<line x1="'+X(v.lo).toFixed(1)+'" x2="'+X(v.hi).toFixed(1)+'" y1="'+y+'" y2="'+y+'" style="stroke:'+(v.cov?'var(--dim)':'var(--bad)')+';stroke-width:'+(i===k-1?2.4:1.6)+'"/>'+
      '<circle cx="'+X(v.m).toFixed(1)+'" cy="'+y+'" r="'+(i===k-1?2.4:1.3)+'" style="fill:'+(v.cov?'var(--mute)':'var(--bad)')+'"/>'}
    s+='<line x1="'+X(sc.mu)+'" x2="'+X(sc.mu)+'" y1="'+(T-4)+'" y2="'+(T+100*rowH)+'" style="stroke:var(--good);stroke-width:1.5"/>'+RD.t(X(sc.mu)+3,H-14,'true mean '+sc.mu.toFixed(3),{fs:10.5,fill:'var(--good)'});
    s+=RD.t(L,H-2,ST.fmt(lo,1),{fs:10,fill:'var(--mute)'})+RD.t(W-R,H-2,ST.fmt(hi,1),{fs:10,fill:'var(--mute)',a:'end'});
    el.innerHTML=RD.svg(W,H,s,'Confidence intervals from repeated experiments');
    const sh=iv.slice(0,k),cov=sh.filter(v=>v.cov).length,low=sh.filter(v=>v.low).length,high=k-cov-low;
    const g=SD.grid.dists[GK[key][0]].by_n[GK[key][1]][meth].cov;
    document.getElementById('rd-ci-cnt').innerHTML=RD.stat('intervals drawn',k,'')+RD.stat('caught the truth',cov,k?ST.pct(cov/k,0):'')+RD.stat('missed below / above',low+' / '+high,'')+RD.stat('long-run coverage',ST.pct(g),'5,000 repetitions');
  }
  // six explained stretches of the 100 experiments (the long-replay rule): each step of the list plays its stretch, one experiment per frame
  const CI_STEPS=[0,1,10,25,50,100],RMc=matchMedia('(prefers-reduced-motion: reduce)').matches;let ciI=0,ciRaf=0;
  function draw(i){if(ciRaf){cancelAnimationFrame(ciRaf);ciRaf=0}
    const from=CI_STEPS[ciI],to=CI_STEPS[i],r=card.getBoundingClientRect(),onScreen=r.bottom>0&&r.top<innerHeight&&card.offsetParent!==null;
    const fwd=i===ciI+1&&card.classList.contains('rd-fwd');ciI=i;if(!fwd||RMc||!onScreen){frame(to);return}
    const t0=performance.now(),D=Math.min(2600,300+120*(to-from));const run=now=>{const u=Math.min(1,(now-t0)/D),k=Math.round(from+(to-from)*u);frame(k);ciRaf=u<1?requestAnimationFrame(run):0};ciRaf=requestAnimationFrame(run)}
  const LIST={normal30:'sx-ci-normal30',tiny30:'sx-ci-tiny30',lognormal5:'sx-ci-lognormal5'};
  const A=RD.anim({card:'rd-ci-card',ctl:'rd-ci-ctl',n:CI_STEPS.length,draw:draw,ms:5000,label:'Stretch of experiments',list:LIST.normal30});
  RD.seg(document.getElementById('rd-ci-seg'),m=>{key=m;iv=ST.ivals(key,meth);Object.keys(LIST).forEach(k=>{const l=document.getElementById(LIST[k]);if(l)l.hidden=k!==m});ciI=0;A.reset(CI_STEPS.length,LIST[m])});
  RD.seg(document.getElementById('rd-ci-meth'),m=>{meth=m;iv=ST.ivals(key,meth);frame(CI_STEPS[A.i])});
  RD.onResize(()=>frame(CI_STEPS[A.i]));
})();
