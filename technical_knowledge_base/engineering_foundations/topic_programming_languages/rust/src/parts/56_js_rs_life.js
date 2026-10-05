// ---- Part 3 (rs): a request's life on 2 async workers, counting inline vs spawn_blocking ----
(function(){
  const D=window.RS_DATA,host=document.getElementById('rs-life-svg');if(!D||!host)return;
  const inl=D.benchB.runs.filter(r=>r.mode==='inline'),off=D.benchB.runs.filter(r=>r.mode==='spawn_blocking');
  // cost of one 3.9 MB count: 2 workers busy all the time in inline mode, so C = 2 / throughput
  const C=2000/RS.med(inl.map(r=>r.bg_rps));
  const H=0.04*C; // a /health request: drawn short (its real cost is microseconds)
  const REQ=['L1','H1','L2','H2','L3','H3'];
  function plan(mode){
    const seg=[],done={};
    if(mode==='inline'){
      seg.push({lane:0,r:'L1',a:0,b:C,k:'cpu'},{lane:1,r:'H1',a:0,b:H,k:'io'},{lane:1,r:'L2',a:H,b:H+C,k:'cpu'},
               {lane:0,r:'H2',a:C,b:C+H,k:'io'},{lane:0,r:'L3',a:C+H,b:2*C+H,k:'cpu'},{lane:1,r:'H3',a:H+C,b:2*H+C,k:'io'});
    }else{
      let t=0;const d=H/2;
      [['L1',0],['H1',1],['L2',0],['H2',1],['L3',0],['H3',1]].forEach(([r,l],i)=>{const a=Math.floor(i/2)*d;seg.push({lane:l,r,a,b:a+d,k:r[0]==='L'?'hand':'io'})});
      ['L1','L2','L3'].forEach((r,i)=>{const a=(i+1)*d;seg.push({lane:2+i,r,a,b:a+C,k:'cpu'})});
    }
    seg.forEach(s=>{done[s.r]=Math.max(done[s.r]||0,s.b)});
    return {seg,done};
  }
  const LANES=['async worker 1','async worker 2','blocking pool 1','blocking pool 2','blocking pool 3'];
  const T=[0,0.02,0.25,0.5,0.75,1,1.06,1.5,2.05].map(f=>f*C);
  let mode='inline',a;
  function cap(t){
    const s=t/C;
    if(mode==='inline'){
      if(s<0.01)return 'Six requests arrive together: three heavy /count_log (L) and three tiny /health (H). Two async workers take them in arrival order.';
      if(s<0.2)return 'Worker 1 starts counting L1 inline. Worker 2 answers H1 at once, then picks up L2 and starts counting it too.';
      if(s<0.99)return 'Both workers are inside a counting loop with no .await: H2 and H3 sit in the queue although each needs microseconds. Nothing preempts a running task.';
      if(s<1.1)return 'At about '+C.toFixed(0)+' ms the workers come back: H2 and H3 are answered '+C.toFixed(0)+' ms late. L3 only now starts.';
      return 'L3 finishes at about twice the cost of one count. Under steady load this queueing is what the measured p50 below shows.';
    }
    if(s<0.01)return 'The same six requests. This time a handler reaching the counting calls spawn_blocking and awaits it.';
    if(s<0.2)return 'Each L handler hands its counting to the blocking pool and suspends at the .await: the worker is free again within microseconds, so H1, H2, H3 are answered at once.';
    if(s<0.99)return 'Three blocking-pool threads count in parallel on other cores; the two async workers sit idle, ready for any new request.';
    return 'The counts finish together; each L handler is woken, resumes on a free worker and sends its response.';
  }
  function draw(i){
    const t=T[i],P=plan(mode),w=RD.width(host),lw=Math.min(118,w*0.3),pad=8,x0=lw,x1=w-pad,tmax=2.1*C;
    const lanes=mode==='inline'?2:5,lh=26,top=22,h=top+lanes*lh+26;
    const X=v=>x0+(x1-x0)*v/tmax;let s='';
    for(let k=0;k<=4;k++){const v=k*tmax/4;s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(top-4)+'" y2="'+(top+lanes*lh)+'" stroke="var(--line)"/>'+RD.t(X(v),top+lanes*lh+14,v.toFixed(0)+' ms',{a:'middle',fs:10,fill:'var(--mute)'})}
    for(let l=0;l<lanes;l++){s+=RD.t(4,top+l*lh+16,LANES[l],{fs:11})}
    P.seg.forEach(g=>{if(g.a>t)return;const b=Math.min(g.b,t),y=top+g.lane*lh+4;const col=g.k==='cpu'?'var(--bad)':g.k==='hand'?'var(--c4)':'var(--good)';
      const wd=Math.max(2,X(b)-X(g.a));s+='<rect x="'+X(g.a)+'" y="'+y+'" width="'+wd+'" height="'+(lh-8)+'" rx="2" fill="'+col+'" opacity="'+(g.k==='cpu'?0.85:1)+'"/>';
      if(wd>22)s+=RD.t(X(g.a)+4,y+13,g.r,{fs:10.5,fill:'var(--bg)',w:600})});
    // queue: requests that arrived but have not started
    const started=new Set(P.seg.filter(g=>g.a<=t).map(g=>g.r)),q=REQ.filter(r=>!started.has(r));
    s+=RD.t(x0,12,'t = '+t.toFixed(1)+' ms    waiting in the queue: '+(q.length?q.join(', '):'none'),{fs:11,fill:'var(--mute)'});
    s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+(top-6)+'" y2="'+(top+lanes*lh)+'" stroke="var(--acc)" stroke-width="1.5"/>';
    host.innerHTML=RD.svg(w,h,s,'Timeline of six requests on two async workers');
    document.getElementById('rs-life-cap').textContent=cap(t);
    const hs=['H1','H2','H3'].filter(r=>P.done[r]<=t+1e-9).map(r=>P.done[r]);
    const rows=mode==='inline'?inl:off,mm=f=>RS.med(rows.map(r=>r[f]));
    document.getElementById('rs-life-cnt').innerHTML='<span>model: /health answered <b>'+hs.length+'/3</b>'+(hs.length?', slowest after <b>'+Math.max(...hs).toFixed(1)+' ms</b>':'')+'</span>'+
      '<span>one count C = 2 / '+RS.fmt(RS.med(inl.map(r=>r.bg_rps)),0)+' req/s = <b>'+C.toFixed(1)+' ms</b></span>'+
      '<span><span class="rs-meas">measured</span> /health p50 <b>'+RS.fmt(mm('p50_ms'),2)+' ms</b>, p99 <b>'+RS.fmt(mm('p99_ms'),1)+' ms</b>, /count_log <b>'+RS.fmt(mm('bg_rps'),0)+'</b> req/s</span>';
  }
  a=RD.anim({card:'rs-life',ctl:'rs-life-ctl',n:T.length,ms:1500,label:'Time step',draw});
  RD.seg(document.getElementById('rs-life-mode'),m=>{mode=m;a.reset(T.length);a.play()});
  RS.reg('t-rs-read',()=>a.redraw());RS.onResize('t-rs-read',()=>a.redraw());
})();
