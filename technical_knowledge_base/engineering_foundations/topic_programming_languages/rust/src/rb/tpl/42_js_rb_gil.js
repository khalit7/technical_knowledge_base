// ---- Part 2 Reading, section 8: four Python threads calling Rust, real timelines (code/c7_gil.py), GIL held vs released vs free-threaded ----
(function(){
  const X=window.RBX,RB=X.RB,fmt=X.fmt;if(!RB.gil314||!document.getElementById('rb-gil-card'))return;
  const MODES={
    serial:{d:RB.gil314.serial,lanes:1,gil:'held',name:'One Python thread calls Rust four times, one quarter each (CPython 3.14, GIL held).'},
    held:{d:RB.gil314.held,lanes:4,gil:'held',name:'Four Python threads each call tally_bytes on one quarter. The GIL stays held during the Rust work (CPython 3.14).'},
    detached:{d:RB.gil314.detached,lanes:4,gil:'free',name:'Four Python threads each call tally_bytes_detached: py.detach releases the GIL during the Rust work (CPython 3.14).'},
    ft:{d:RB.gil314t.held,lanes:4,gil:'none',name:'The GIL-holding function again, on free-threaded CPython 3.14t: there is no GIL to wait for.'}};
  const TMAX=Math.max(...Object.values(MODES).map(m=>m.d.wall_ms))*1.04;const N=49;
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
  let mode='serial';const box=document.getElementById('rb-gil-svg'),stats=document.getElementById('rb-gil-stats'),cap=document.getElementById('rb-gil-cap');
  function owner(sp,t){for(let i=0;i<sp.length;i++)if(t>=sp[i][0]&&t<sp[i][1])return i;return -1}
  function draw(i){
    const m=MODES[mode],sp=m.d.spans,t=Math.min(i/(N-1)*TMAX,TMAX);
    const W=Math.max(280,Math.min(860,RD.width(box))),L=78,R=12,lane=26,top=36;const lanes=m.lanes;const H=top+lanes*lane+22;
    const x=v=>L+(W-L-R)*v/TMAX;let s='';
    // axis
    const stT=W<520?50:20;for(let k=0;k<=TMAX;k+=stT){s+='<line x1="'+x(k)+'" x2="'+x(k)+'" y1="'+(top-6)+'" y2="'+(top+lanes*lane)+'" stroke="var(--line)"/>'+RD.t(x(k),top+lanes*lane+14,k+' ms',{a:'middle',fs:10,fill:'var(--mute)'})}
    // GIL lane
    s+=RD.t(4,top-12,'GIL',{fs:11,w:600});
    if(m.gil==='held'){sp.forEach((p,j)=>{const a=p[0],b=Math.min(p[1],t);if(b>a)s+='<rect x="'+x(a)+'" y="'+(top-22)+'" width="'+Math.max(0,x(b)-x(a))+'" height="12" rx="2" fill="'+COL[j]+'" opacity=".55"/>'})}
    else s+=RD.t(x(0)+4,top-12,m.gil==='free'?'released during the Rust work':'none (free-threaded)',{fs:10.5,fill:'var(--mute)'});
    // thread lanes
    for(let ln=0;ln<lanes;ln++){const y=top+ln*lane;s+=RD.t(4,y+17,lanes===1?'thread 1':'thread '+(ln+1),{fs:11});
      s+='<rect x="'+x(0)+'" y="'+(y+5)+'" width="'+(x(TMAX)-x(0))+'" height="16" fill="var(--soft)"/>'}
    sp.forEach((p,j)=>{const ln=lanes===1?0:j,y=top+ln*lane;const a=p[0],b=Math.min(p[1],t);
      if(t>a){s+='<rect x="'+x(a)+'" y="'+(y+5)+'" width="'+Math.max(1,x(b)-x(a))+'" height="16" rx="2" fill="'+COL[j]+'"/>';
        if(x(b)-x(a)>40)s+=RD.t(x(a)+4,y+17,'quarter '+(j+1),{fs:10,fill:'var(--bg)'})}});
    // cursor
    s+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="'+(top-24)+'" y2="'+(top+lanes*lane)+'" stroke="var(--ink)" stroke-dasharray="3 2"/>';
    box.innerHTML=RD.svg(W,H,s,'Timeline of four Rust calls');
    const done=sp.filter(p=>p[1]<=t).length,work=sp.reduce((a,p)=>a+Math.max(0,Math.min(t,p[1])-p[0])/(p[1]-p[0]),0)/sp.length;
    const run=sp.filter(p=>t>=p[0]&&t<p[1]).length;
    stats.innerHTML=RD.stat('Elapsed',fmt(Math.min(t,m.d.wall_ms),0)+' ms')+RD.stat('Calls finished',done+' of 4')+RD.stat('Running right now',String(run))+RD.stat('Work done',fmt(work*100,0)+'%','total '+fmt(m.d.wall_ms,0)+' ms');
    const own=owner(sp,t);
    cap.textContent=m.name+' '+(t>=m.d.wall_ms?'Finished after '+fmt(m.d.wall_ms,0)+' ms.':
      m.gil==='held'?(own>=0?'Thread '+(lanes===1?1:own+1)+' holds the GIL, so it is the only one running; '+(lanes===1?'the next quarter waits for this call to return.':'the other threads are blocked waiting for the GIL (their bars have not started yet).'):'Between calls.'):
      run+' calls running at the same time.')}
  const an=RD.anim({card:'rb-gil-card',ctl:'rb-gil-ctl',n:N,ms:140,draw,label:'Time'});
  RD.seg(document.getElementById('rb-gil-mode'),v=>{mode=v;an.reset(N);an.play()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-rb-read']=window.TAB_RENDER['t-rb-read']||[]).push(()=>an.redraw());
  let rt=0;addEventListener('resize',()=>{const r=document.getElementById('t-rb-read');if(!r||r.hidden)return;clearTimeout(rt);rt=setTimeout(()=>an.redraw(),80)});
})();
