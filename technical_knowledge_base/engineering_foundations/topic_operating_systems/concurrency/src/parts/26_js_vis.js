// ---- Reading visuals added in the 2026-10-24 rebuild: hero, lost-update stepper, deadlock cycle, GIL vs free-threaded, choosing tree ----
// Every figure is drawn at the measured width (RD.width) and redrawn on resize; nothing moves before the reader acts.
(function(){
  const V=(window.CD&&window.CD.v)||{},T=RD.t;
  const rect=(x,y,w,h,f,s,r)=>'<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+h+'" rx="'+(r==null?6:r)+'" fill="'+f+'" stroke="'+s+'"/>';
  const mk='<defs><marker id="rd-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker>'+
    '<marker id="rd-ahb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--bad)"/></marker></defs>';

  // ---- hero: the two kernel queues every wait ends in ----
  (function(){const el=document.getElementById('rd-hero');if(!el)return;
    const P=[{t:'Waiting for another thread',s:'lock, condition variable, queue, barrier, GIL',
        u:'lock word w: 0 free, 1 held, 2 waiters',un:'fast path: one CAS, '+(V['lk.S1.mutex.wall']||'10.1')+' ns, no system call',
        d:'↓ futex_wait(w, 2): sleep only if still 2',up:'↑ unlock that saw 2: futex_wake(w, 1)',
        k:'futex queue for w: B, C asleep, 0% CPU',kn:'wake-up: '+(V['pp.1cpu.futex.half']||'1.7')+' µs same CPU, '+(V['pp.2cpu.futex.half']||'23.5')+' across'},
      {t:'Waiting for I/O',s:'sockets, pipes, files',
        u:'one event-loop thread, many sockets',un:'reads only ready sockets (O_NONBLOCK)',
        d:'↓ epoll_ctl(ADD): each socket once',up:'↑ epoll_wait: returns only the ready ones',
        k:'interest list (tree) → ready list: [5]',kn:(V['ev.10000.epoll']||'352')+' ns per wait at 10,000 watched'}];
    function panel(x,y,pw,p){let s='';
      s+=T(x+2,y+14,p.t,{w:600,fs:12.5,fill:'var(--acc)'})+T(x+2,y+29,p.s,{fs:11,fill:'var(--mute)'});
      s+=rect(x,y+36,pw,62,'var(--soft)','var(--line)',8)+T(x+pw-8,y+92,'user space',{a:'end',fs:11,fill:'var(--mute)'});
      s+=rect(x+8,y+42,pw-16,20,'var(--bg)','var(--ink)',4)+T(x+14,y+56,p.u,{fs:11.5,w:600});
      s+=T(x+10,y+78,p.un,{fs:11,fill:'var(--good)',w:600});
      s+=T(x+10,y+116,p.d,{fs:11})+T(x+10,y+132,p.up,{fs:11});
      s+=rect(x,y+140,pw,64,'var(--acc2)','var(--acc)',8)+T(x+pw-8,y+198,'kernel',{a:'end',fs:11,fill:'var(--mute)'});
      s+=rect(x+8,y+146,pw-16,20,'var(--bg)','var(--acc)',4)+T(x+14,y+160,p.k,{fs:11.5,w:600});
      s+=T(x+10,y+182,p.kn,{fs:11});
      return s}
    function draw(){const W=Math.min(900,RD.width(el)),wide=W>=660;let s='',H;
      if(wide){const pw=(W-24)/2;s+=panel(4,0,pw,P[0])+panel(pw+20,0,pw,P[1]);H=208}
      else{const pw=W-8;s+=panel(4,0,pw,P[0])+panel(4,222,pw,P[1]);H=430}
      el.innerHTML=RD.svg(W,H,s,'Two kernel queues: futex wait queues for threads, the epoll ready list for I/O');}
    RD.onRender(draw);RD.onResize(draw);draw();})();

  // ---- section 2: the lost update as an interleaving (stepper, before/after) ----
  (function(){const card=document.getElementById('rd-race-card');if(!card)return;const el=document.getElementById('rd-race-svg'),cap=document.getElementById('rd-race-cap');
    const SEQ={plain:[{th:1,op:'load',r:41,m:41},{th:2,op:'load',r:41,m:41},{th:1,op:'add',r:42,m:41},{th:1,op:'store',r:42,m:42},{th:2,op:'add',r:42,m:42},{th:2,op:'store',r:42,m:42}],
      atomic:[{th:1,op:'ldadd',r:41,m:42},{th:2,op:'ldadd',r:42,m:43}]};
    const CAP={plain:['count = 41 in memory. Both threads run count = count + 1: load into a register, add 1, store back. Predict the final count, then step.',
        'T1 loads 41 into its register.','T2 runs before T1 stores (on another core, or the scheduler switched threads): it also loads 41.',
        'T1 adds 1 in its register: 42. Memory still says 41.','T1 stores 42.','T2 adds 1 to the 41 it loaded: 42.',
        'T2 stores 42 over T1’s 42. Two increments, and count rose by one: a lost update. It needs exactly this interleaving, which is why it passes tests and fails in production.'],
      atomic:['count = 41. Each thread now runs one atomic fetch-and-add (ldadd on arm64, lock xadd on x86-64).',
        'T1’s ldadd reads 41 and writes 42 as one indivisible step: no other core can touch the word in between (the register gets the old value, 41).',
        'T2’s ldadd waits for the cache line, then reads 42 and writes 43. Correct in every order; it cost '+(V['lk.S1.atomic.wall']||'8.3')+' ns per update here, uncontended.']};
    let mode='plain';
    function draw(i){const seq=SEQ[mode],W=Math.min(760,RD.width(el)),lw=62,ncol=6,cw=(W-lw-8)/ncol,H=168;let s='';
      const rows=[['T1',22,'var(--c1)'],['T2',72,'var(--c2)']];
      rows.forEach(([n,y,c])=>{s+=T(4,y+22,n,{w:600,fs:12,fill:c})+'<line x1="'+lw+'" x2="'+(W-4)+'" y1="'+(y+18)+'" y2="'+(y+18)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'});
      s+=T(4,146,'count',{w:600,fs:12})+T(4,160,'in memory',{fs:11,fill:'var(--mute)'});
      s+=T(lw,12,'time → (one column per instruction)',{fs:11,fill:'var(--mute)'});
      for(let k=0;k<seq.length;k++){const o=seq[k],x=lw+k*cw,y=o.th===1?22:72,on=k<i,cur=k===i-1;
        s+=rect(x+3,y,cw-6,38,on?(cur?'var(--acc2)':'var(--bg)'):'none',on?(o.th===1?'var(--c1)':'var(--c2)'):'var(--line)',5);
        if(on){s+=T(x+cw/2,y+15,o.op,{a:'middle',fs:11.5,w:600})+T(x+cw/2,y+31,'r='+o.r,{a:'middle',fs:11})}
        const lost=mode==='plain'&&k===seq.length-1&&on;
        if(on)s+=T(x+cw/2,150,String(o.m),{a:'middle',fs:13,w:600,fill:lost?'var(--bad)':(k>0&&seq[k-1].m===o.m?'var(--mute)':'var(--ink)')});}
      if(i===0)s+=T(lw+6,150,'41',{fs:13,w:600});
      const fin=i===seq.length;
      if(fin)s+=T(W-6,128,mode==='plain'?'expected 43, got 42':'43, as expected',{a:'end',fs:12,w:600,fill:mode==='plain'?'var(--bad)':'var(--good)'});
      el.innerHTML=RD.svg(W,H,s,'Interleaving of two threads incrementing one counter');
      cap.innerHTML='<div class="t">Step '+i+' of '+seq.length+'</div><p>'+RD.esc(CAP[mode][i])+'</p>';}
    const A=RD.anim({card:'rd-race-card',ctl:'rd-race-ctl',n:SEQ.plain.length+1,ms:1500,label:'Step through the interleaving',draw});
    RD.seg(document.getElementById('rd-race-mode'),m=>{mode=m;A.reset(SEQ[m].length+1)});
    RD.onResize(()=>A.redraw());})();

  // ---- section 6: the deadlock cycle (static) ----
  (function(){const el=document.getElementById('rd-dl-svg');if(!el)return;
    function draw(){const W=Math.min(520,RD.width(el)),H=200,xl=46,xr=W-46,yt=40,yb=160;let s=mk;
      const lock=(x,y,n)=>rect(x-22,y-18,44,36,'var(--soft)','var(--ink)',4)+T(x,y+5,'lock '+n,{a:'middle',fs:11.5,w:600});
      const thr=(x,y,n,c)=>'<circle cx="'+x+'" cy="'+y+'" r="20" fill="var(--bg)" stroke="'+c+'" stroke-width="2"/>'+T(x,y+5,n,{a:'middle',fs:12,w:600,fill:c});
      const ar=(x1,y1,x2,y2,red)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(red?'var(--bad)':'var(--mute)')+'" stroke-width="'+(red?2:1.5)+'" marker-end="url(#'+(red?'rd-ahb':'rd-ah')+')"/>';
      s+=ar(xl+24,yt,xr-24,yt)+T((xl+xr)/2,yt-8,'held by',{a:'middle',fs:11});
      s+=ar(xr,yt+22,xr,yb-20)+T(xr-8,(yt+yb)/2+4,'waits for',{a:'end',fs:11});
      s+=ar(xr-24,yb,xl+22,yb)+T((xl+xr)/2,yb+26,'held by',{a:'middle',fs:11});
      s+=ar(xl,yb-22,xl,yt+20,true)+T(xl+8,(yt+yb)/2+4,'waits for',{fs:11,fill:'var(--bad)',w:600});
      s+=lock(xl,yt,'A')+thr(xr,yt,'T1','var(--c1)')+lock(xr,yb,'B')+thr(xl,yb,'T2','var(--c2)');
      s+=T((xl+xr)/2,(yt+yb)/2-4,'circular wait:',{a:'middle',fs:11.5,w:600,fill:'var(--bad)'})+T((xl+xr)/2,(yt+yb)/2+12,'nobody can move',{a:'middle',fs:11,fill:'var(--bad)'});
      el.innerHTML=RD.svg(W,H,s,'Wait-for cycle: T1 holds A and waits for B, T2 holds B and waits for A');}
    RD.onRender(draw);RD.onResize(draw);draw();})();

  // ---- section 7: GIL build against free-threaded build, same job (before/after) ----
  (function(){const el=document.getElementById('rd-ft-svg');if(!el)return;const cap=document.getElementById('rd-ft-cap');
    const GIL=0.99,FT=0.37;let mode='gil';
    function draw(){const W=Math.min(760,RD.width(el)),lw=40,pw=W-lw-10,rh=26,H=4*rh+44;let s='';
      const x=t=>lw+t/GIL*pw,cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
      for(let k=0;k<4;k++){const y=8+k*rh;s+=T(4,y+15,'T'+(k+1),{w:600,fs:12,fill:cols[k]});
        s+='<line x1="'+lw+'" x2="'+(lw+pw)+'" y1="'+(y+rh/2-2)+'" y2="'+(y+rh/2-2)+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
        if(mode==='gil'){const sl=GIL/24;for(let j=0;j<24;j++)if(j%4===k)s+=rect(x(j*sl),y+2,x(sl)-lw-0.5,rh-10,cols[k],'none',1)}
        else s+=rect(x(0),y+2,x(FT)-lw,rh-10,cols[k],'none',2);}
      const end=mode==='gil'?GIL:FT,ye=8+4*rh;
      s+='<line x1="'+x(end)+'" x2="'+x(end)+'" y1="4" y2="'+(ye+2)+'" stroke="var(--ink)" stroke-width="1.2"/>';
      s+=T(Math.min(x(end)+4,W-4),ye+16,end.toFixed(2)+' s',{a:x(end)+60>W?'end':'start',fs:12,w:600});
      s+=T(lw,ye+30,mode==='gil'?'one thread holds the GIL at a time; others wait on gil_cond':'all four run Python at once on four cores',{fs:11,fill:'var(--mute)'});
      el.innerHTML=RD.svg(W,H,s,'Four threads counting primes under each build');
      cap.innerHTML=mode==='gil'?'Same job, four threads counting primes: under the GIL they take turns (slices drawn schematically; the real hand-over follows the switch interval), so four threads took 0.99 s against 0.96 s serially. Totals to scale, from the Python page’s measurement (Python 3.14.8, 10 CPUs).':
        'Free-threaded 3.14t: no interpreter lock. dict, list and set take internal per-object locks, reference counts are biased to the owning thread, and constants are immortal; four threads took 0.37 s against 0.94 s serially (a busy laptop, so not a clean 4x). Your own shared data still needs a lock.';}
    RD.seg(document.getElementById('rd-ft-mode'),m=>{mode=m;draw()});
    RD.onRender(draw);RD.onResize(draw);draw();})();

  // ---- section 9: choosing, as a tree ----
  (function(){const el=document.getElementById('rd-ch-svg');if(!el)return;
    const R=[[0,'What does the work wait on?','q'],[1,'I/O: thousands of connections, async libraries?','q'],[2,'yes: one event loop (asyncio, uvloop, tokio)','a'],[2,'no: a thread pool (blocking libraries)','a'],
      [1,'CPU: is the hot loop Python?','q'],[2,'yes: processes, or free-threaded threads','a'],[2,'no (NumPy, PyTorch drop the GIL): threads','a']];
    function draw(){const W=Math.min(760,RD.width(el)),rh=26,ind=W<460?16:26,H=R.length*rh+6;let s='';
      R.forEach(([d,t,k],i)=>{const y=4+i*rh,x=6+d*ind;
        if(d>0){let p=i-1;while(p>=0&&R[p][0]>=d)p--;const px=6+(d-1)*ind+6,py=4+p*rh+rh-6;
          s+='<path d="M'+px+' '+py+' V'+(y+rh/2-2)+' H'+(x-2)+'" fill="none" stroke="var(--mute)"/>';}
        if(k==='a')s+=rect(x,y+2,Math.min(W-x-4,t.length*6.6+16),rh-6,'var(--acc2)','var(--acc)',5);
        s+=T(x+(k==='a'?8:0),y+17,t,{fs:k==='q'?12:11.5,w:k==='q'?600:400});});
      el.innerHTML=RD.svg(W,H,s,'Decision tree: threads, processes or an event loop');}
    RD.onRender(draw);RD.onResize(draw);draw();})();
})();
