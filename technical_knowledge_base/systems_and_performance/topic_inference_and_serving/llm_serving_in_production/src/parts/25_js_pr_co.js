// ---- Reading tab, section 8: the same 5-second stall seen by a closed-loop and an open-loop generator (before/after animation).
// Five explained stretches (the step lists sx-co-c and sx-co-o): the test, 0 s to the freeze, the freeze, ten seconds after it, the end;
// each forward step plays its stretch's seconds (long-replay rule a), back and the scrubber jump, reduced motion jumps. ----
(function(){
  const svgEl=document.getElementById('pr-co-svg');if(!svgEl||!window.PRD||!PRD.co)return;
  const CO=PRD.co,cap=document.getElementById('pr-co-cap'),cnt=document.getElementById('pr-co-cnt');
  let mode='closed';
  const run=m=>CO.runs[m+'_yes'].find(r=>r.rep===1),req=m=>CO.req[m+'_yes'];
  const T=Math.ceil(Math.max(...['closed','poisson'].map(m=>Math.max(...req(m).map(r=>r[0]+r[1])))));
  // the end of each stretch, in seconds of the run: the test (0), the freeze starts, it ends, ten seconds later, the end of the run
  const ENDS=m=>{const st=run(m).stall_s,R=req(m);return [0,st[0],st[1],st[1]+10,Math.max(...R.map(r=>r[0]+r[1]))]};
  let raf=0,shown=0;
  function pct(xs,q){if(!xs.length)return 0;const s=xs.slice().sort((a,b)=>a-b),k=(s.length-1)*q,f=Math.floor(k),c=Math.min(f+1,s.length-1);return s[f]+(s[c]-s[f])*(k-f)}
  function draw(i){
    const E=ENDS(mode),t1=E[i],card=document.getElementById('pr-co-card');cancelAnimationFrame(raf);
    if(card.classList.contains('rd-fwd')&&!RD.RM&&i>0){const t0=E[i-1],d=Math.min(3000,600+(t1-t0)*140),s0=performance.now();
      const f=now=>{const u=Math.min(1,(now-s0)/d);frame(t0+(t1-t0)*u);if(u<1)raf=requestAnimationFrame(f)};frame(t0);raf=requestAnimationFrame(f)}
    else frame(t1)}
  function frame(t){shown=t;
    const R=req(mode),st=run(mode).stall_s,w=RD.width(svgEl),L=38,h=220,x=v=>L+(w-L-10)*v/T,lo=Math.log10(0.1),hi=Math.log10(10),y=v=>10+(h-40)*(1-(Math.log10(Math.max(0.1,Math.min(10,v)))-lo)/(hi-lo));
    let s='<rect x="'+x(st[0])+'" y="10" width="'+(x(st[1])-x(st[0]))+'" height="'+(h-40)+'" fill="var(--hl)" opacity=".7"/>'+RD.t(x(st[0])+3,22,'server frozen',{fs:10,fill:'var(--mute)'});
    [0.1,0.3,1,3,10].forEach(v=>{s+='<line x1="'+L+'" x2="'+(w-10)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y(v)+4,v+' s',{a:'end',fs:10,fill:'var(--mute)'})});
    for(let v=0;v<=T;v+=10)s+=RD.t(x(v),h-16,v+' s',{a:'middle',fs:10,fill:'var(--mute)'});
    s+=RD.t(w-10,h-2,'time the request was sent',{a:'end',fs:10,fill:'var(--mute)'});
    const done=R.filter(r=>r[0]+r[1]<=t),flying=R.filter(r=>r[0]<=t&&r[0]+r[1]>t);
    done.forEach(r=>{s+='<circle cx="'+x(r[0]).toFixed(1)+'" cy="'+y(r[1]).toFixed(1)+'" r="2.6" fill="'+(r[1]>1?'var(--bad)':'var(--c1)')+'" opacity=".8"/>'});
    flying.forEach(r=>{s+='<circle cx="'+x(r[0]).toFixed(1)+'" cy="'+y(t-r[0]).toFixed(1)+'" r="2.6" fill="none" stroke="var(--mute)"/>'});
    if(t<T)s+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="10" y2="'+(h-30)+'" stroke="var(--ink)" stroke-dasharray="2 2"/>';
    svgEl.innerHTML=RD.svg(w,h,s,'Latency of each request against the time it was sent, '+mode+' loop, with a 5-second stall');
    const lat=done.map(r=>r[1]),inSt=R.filter(r=>r[0]>=st[0]&&r[0]<=st[1]&&r[0]<=t).length;
    cnt.innerHTML=RD.stat('Second of the run',t.toFixed(1)+' s','')+RD.stat('Requests sent so far',done.length+flying.length,'')+RD.stat('Sent while frozen',inSt,'')+RD.stat('Recorded above 1 s',lat.filter(v=>v>1).length,'')+RD.stat('p99 of what was recorded',lat.length?pct(lat,0.99).toFixed(2)+' s':'none yet','');
  }
  const A=RD.anim({card:'pr-co-card',ctl:'pr-co-ctl',n:5,draw,ms:4800,label:'Stretch of the run',list:'sx-co-c'});
  RD.seg(document.getElementById('pr-co-mode'),v=>{mode=v;const L=v==='closed'?'sx-co-c':'sx-co-o';['sx-co-c','sx-co-o'].forEach(id=>{document.getElementById(id).hidden=id!==L});A.reset(5,L)});
  RD.onResize(()=>{cancelAnimationFrame(raf);frame(shown)});
  window.PR_CO={ENDS};
})();
