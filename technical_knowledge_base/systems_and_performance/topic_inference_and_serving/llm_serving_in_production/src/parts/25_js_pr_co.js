// ---- Reading tab, section 7: the same 5-second stall seen by a closed-loop and an open-loop generator (before/after animation) ----
(function(){
  const svgEl=document.getElementById('pr-co-svg');if(!svgEl||!window.PRD||!PRD.co)return;
  const CO=PRD.co,cap=document.getElementById('pr-co-cap'),cnt=document.getElementById('pr-co-cnt');
  let mode='closed';
  const run=m=>CO.runs[m+'_yes'].find(r=>r.rep===1),req=m=>CO.req[m+'_yes'];
  const T=Math.ceil(Math.max(...['closed','poisson'].map(m=>Math.max(...req(m).map(r=>r[0]+r[1])))));
  const N=Math.ceil(T/1)+1;
  function pct(xs,q){if(!xs.length)return 0;const s=xs.slice().sort((a,b)=>a-b),k=(s.length-1)*q,f=Math.floor(k),c=Math.min(f+1,s.length-1);return s[f]+(s[c]-s[f])*(k-f)}
  function draw(i){
    const R=req(mode),st=run(mode).stall_s,w=RD.width(svgEl),L=38,h=220,t=i,x=v=>L+(w-L-10)*v/T,lo=Math.log10(0.1),hi=Math.log10(10),y=v=>10+(h-40)*(1-(Math.log10(Math.max(0.1,Math.min(10,v)))-lo)/(hi-lo));
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
    const nm=mode==='closed'?'Closed loop (2 users)':'Open loop (Poisson, 3 per second)';
    let p;
    if(t<st[0])p=mode==='closed'?'Two users, each waiting for an answer before the next question: about '+run('closed').req_s.toFixed(1)+' requests a second while the server is healthy.':'Requests arrive at random, 3 a second on average, whatever the server is doing.';
    else if(t<=st[1])p=mode==='closed'?'The server is frozen. Both users are stuck waiting, so the generator sends nothing: the requests real users would have sent now are never made.':'The server is frozen, but requests keep arriving and pile up; each will record the time it waited.';
    else p=mode==='closed'?'The two stuck requests record about 5 s each; everything after is fast again. Two slow samples out of '+R.length+' barely move the p99.':'Every request that arrived during the freeze, and those queued behind them, record seconds of latency. This is what users saw.';
    cap.innerHTML='<div class="t">'+nm+', second '+t+'</div><p>'+p+'</p>';
    cnt.innerHTML=RD.stat('Requests sent so far',done.length+flying.length,'')+RD.stat('Sent while frozen',inSt,'')+RD.stat('Recorded above 1 s',lat.filter(v=>v>1).length,'')+RD.stat('p99 of what was recorded',lat.length?pct(lat,0.99).toFixed(2)+' s':'none yet','');
  }
  const A=RD.anim({card:'pr-co-card',ctl:'pr-co-ctl',n:N,draw,ms:420,label:'Second'});
  RD.seg(document.getElementById('pr-co-mode'),v=>{mode=v;A.reset(N);A.play()});
  RD.onResize(()=>A.redraw());
})();
