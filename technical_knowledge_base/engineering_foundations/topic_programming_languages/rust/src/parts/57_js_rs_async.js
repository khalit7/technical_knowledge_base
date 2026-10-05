// ---- Part 3 (rs): Async replay tab: measured traces of jobs A, B, C on tokio, asyncio and Node ----
(function(){
  const D=window.RS_DATA,host=document.getElementById('rs-as-svg');if(!D||!host)return;
  const MODES={seq:{rs:'sequential',py:'sequential',js:'sequential',t:'awaited one after another'},
    conc:{rs:'join',py:'gathered',js:'Promise.all',t:'concurrently: tokio::join!, asyncio.gather, Promise.all'},
    block:{rs:'join_blocking',py:'gathered_blocking',js:'Promise.all, B blocks',t:'concurrently, but B blocks the thread (std::thread::sleep, time.sleep, a busy loop)'},
    off:{rs:'join_offload',py:'gathered_thread',js:null,t:'B moved to a thread: spawn_blocking, asyncio.to_thread'},
    multi:{rs:'spawn_blocking_multi',py:null,js:null,t:'tokio::spawn on a 4-worker runtime, B blocks one worker'}};
  const RT=[['rs','tokio (Rust)',D.trace_rs],['py','asyncio (Python)',D.trace_py],['js','Node (JavaScript)',D.trace_js]];
  let mode='conc',a,steps=[];
  function rows(){return RT.map(([k,name,tr])=>{const m=MODES[mode][k];return {k,name,m,tr:m&&tr?tr[m]:null}})}
  function spans(ev){ // per job: list of {kind,a,b}
    const J={};ev.forEach(e=>{const [who,what,t]=e;(J[who]=J[who]||{ev:[]}).ev.push([what,t,e[4]])});
    Object.values(J).forEach(j=>{j.sp=[];let wait=null,blk=null;j.ev.forEach(([w,t])=>{
      if(w==='start')j.start=t;if(w==='await')wait=t;if(w==='resume'&&wait!==null){j.sp.push({k:'wait',a:wait,b:t});wait=null}
      if(w==='block')blk=t;if(w==='done'){if(blk!==null){j.sp.push({k:'block',a:blk,b:t});blk=null}j.done=t}})});
    return J;
  }
  function build(){
    const R=rows(),tmax=Math.max(...R.filter(r=>r.tr).map(r=>r.tr.total_ms));
    steps=[];for(let t=0;t<=tmax+10;t+=10)steps.push(t);
    return steps.length;
  }
  function caption(t){
    const lines=[];rows().forEach(r=>{if(!r.tr)return;r.tr.events.forEach(e=>{if(e[2]>t-10&&e[2]<=t){
      const verb={start:'starts',await:'reaches .await and suspends'+(e[3]?' ('+e[3]+')':''),resume:'is resumed',done:'finishes',block:'blocks the thread'+(e[3]?' ('+e[3]+')':'')}[e[1]]||e[1];
      lines.push('<b>'+r.name.split(' ')[0]+'</b> '+e[2].toFixed(1)+' ms: '+e[0]+' '+verb+(e[4]&&r.k==='rs'&&mode==='multi'?' on '+e[4]:''))}})});
    if(lines.length)return lines.slice(0,6).join('<br>')+(lines.length>6?'<br>...':'');
    const st=rows().filter(r=>r.tr).map(r=>{const J=spans(r.tr.events);return '<b>'+r.name.split(' ')[0]+'</b>: '+['A','B','C'].map(n=>{const j=J[n];if(!j||j.start===undefined||j.start>t)return n+' not started';if(j.done!==undefined&&j.done<=t)return n+' done';
      if(j.sp.some(p=>p.k==='block'&&p.a<=t&&t<p.b))return n+' <b style="color:var(--bad)">blocking the thread</b>';if(j.sp.some(p=>p.k==='wait'&&p.a<=t&&t<p.b))return n+' waiting';return n+' ready, waiting for the thread'}).join(', ')});
    return '<span class="mute">t = '+t+' ms, no new event.</span> '+st.join('; ');
  }
  function draw(i){
    const t=steps[i]||0,R=rows(),w=RD.width(host),lw=Math.min(128,w*0.32),pad=10,x0=lw,x1=w-pad;
    const tmax=Math.max(320,...R.filter(r=>r.tr).map(r=>r.tr.total_ms))*1.04,X=v=>x0+(x1-x0)*v/tmax;
    const lh=16,gap=16;let y=18,s='';
    for(let v=0;v<=tmax;v+=100)s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="12" y2="9999" stroke="var(--line)"/>'+RD.t(X(v),10,v+' ms',{a:'middle',fs:10,fill:'var(--mute)'});
    R.forEach(r=>{
      s+=RD.t(4,y+12,r.name,{fs:11.5,w:600});
      if(!r.tr){s+=RD.t(x0,y+12,'not recorded for this mode'+(r.k==='js'&&mode==='off'?' (Node would need a worker thread)':mode==='multi'?' (one thread per event loop)':''),{fs:11,fill:'var(--mute)'});y+=lh+gap;return}
      s+=RD.t(x1,y+12,'total '+r.tr.total_ms.toFixed(0)+' ms',{a:'end',fs:11,fill:t>=r.tr.total_ms?'var(--ink)':'var(--mute)'});y+=lh+2;
      const J=spans(r.tr.events);['A','B','C'].forEach(n=>{const j=J[n];if(!j)return;
        s+=RD.t(x0-6,y+11,n,{a:'end',fs:11});
        if(j.start!==undefined&&j.start<=t)s+='<rect x="'+(X(j.start)-1.5)+'" y="'+(y+1)+'" width="3" height="'+(lh-4)+'" fill="var(--c1)"/>';
        j.sp.forEach(p=>{if(p.a>t)return;const b=Math.min(p.b,t);const wd=Math.max(1,X(b)-X(p.a));
          s+=p.k==='wait'?'<rect x="'+X(p.a)+'" y="'+(y+2)+'" width="'+wd+'" height="'+(lh-6)+'" fill="var(--acc2)" stroke="var(--c1)" stroke-width="1"/>':'<rect x="'+X(p.a)+'" y="'+(y+1)+'" width="'+wd+'" height="'+(lh-4)+'" fill="var(--bad)"/>'});
        if(j.done!==undefined&&j.done<=t)s+='<circle cx="'+X(j.done)+'" cy="'+(y+lh/2-1)+'" r="4" fill="var(--c3)"/>';
        y+=lh});
      y+=gap});
    s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="12" y2="'+(y-gap+4)+'" stroke="var(--acc)" stroke-width="1.5"/>';
    host.innerHTML=RD.svg(w,y,s.replace(/y2="9999"/g,'y2="'+(y-gap+4)+'"'),'Measured timelines of jobs A, B and C');
    document.getElementById('rs-as-cap').innerHTML=caption(t);
    document.getElementById('rs-as-cnt').innerHTML=R.filter(r=>r.tr).map(r=>{const n=r.tr.events.filter(e=>e[1]==='done'&&e[2]<=t).length;return '<span>'+r.name.split(' ')[0]+': <b>'+n+'/3</b> done</span>'}).join('')+'<span>clock <b>'+t+' ms</b></span>';
  }
  a=RD.anim({card:'rs-as-card',ctl:'rs-as-ctl',n:build(),ms:120,label:'Time',draw});
  RD.seg(document.getElementById('rs-as-mode'),m=>{mode=m;a.reset(build());document.getElementById('rs-as-notes').textContent='Mode: '+MODES[m].t+'.';a.play()});
  document.getElementById('rs-as-notes').textContent='Mode: '+MODES[mode].t+'.';
  RS.reg('t-rs-async',()=>a.redraw());RS.onResize('t-rs-async',()=>a.redraw());
})();
