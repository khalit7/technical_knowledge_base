// ---- Event loop lab: the same arrivals through five designs, and the measured costs scaled up ----
(function(){const card=document.getElementById('ev-card');if(!card)return;
  const N=8,ARR=[2,5,2,7];
  // frames: {conn: highlighted connection, scan: kernel checks these, uscan: program scans these, ready: ready list, awake: thread index,
  //          sq/cq: ring contents, cap: caption, d: counter increments {sys, kchk, uscan, ctx}}
  function frames(mode){const F=[];const c0={sys:0,kchk:0,uscan:0,ctx:0};
    const add=(f,d)=>F.push(Object.assign({scan:[],uscan:[],ready:[],sq:[],cq:[],awake:-1,conn:-1},f,{d:Object.assign({},c0,d||{})}));
    const all=[...Array(N).keys()];
    if(mode==='threads'){add({cap:'Setup: one thread per connection, each blocked in recv() in the kernel. 8 threads, 8 stacks of 8 MiB address space each.'},{sys:8});
      ARR.forEach(c=>{add({conn:c,cap:'Data arrives on connection '+c+'. The kernel puts it in the socket buffer and wakes the one thread sleeping on it.'});
        add({conn:c,awake:c,cap:'Thread '+c+' is scheduled (a context switch), its recv() returns the data, it handles it.'},{ctx:1});
        add({conn:c,awake:c,cap:'Thread '+c+' calls recv() again and sleeps. The other 7 threads never woke.'},{sys:1,ctx:1});});}
    else if(mode==='select'||mode==='poll'){const nm=mode+'()';add({cap:'Setup: one thread, the 8 descriptors made non-blocking.'});
      ARR.forEach(c=>{add({scan:all,cap:'The thread calls '+nm+' with all 8 descriptors. The kernel copies the list in, checks each one (none ready), registers a wait on each, and sleeps.'},{sys:1,kchk:8});
        add({conn:c,scan:all,cap:'Data arrives on connection '+c+'. The wait wakes the thread; the kernel checks all 8 again to build the answer and removes the 8 waits.'},{kchk:8,ctx:1});
        add({conn:c,uscan:all,cap:nm+' returns "1 ready". The program scans its whole list to find which one: '+c+'.'},{uscan:8});
        add({conn:c,cap:'read() on connection '+c+' (a second system call), then handle it.'},{sys:1});});}
    else if(mode==='epoll'){add({cap:'Setup: epoll_create1, then epoll_ctl(ADD) once per descriptor: the interest list lives in the kernel (a red-black tree).'},{sys:9});
      ARR.forEach(c=>{add({cap:'The thread calls epoll_wait. The ready list is empty, so it sleeps.'},{sys:1});
        add({conn:c,ready:[c],cap:'Data arrives on connection '+c+'. Its wait-queue callback (ep_poll_callback) appends it to the ready list: one item, whatever N is.'},{kchk:1,ctx:1});
        add({conn:c,ready:[c],uscan:[c],cap:'epoll_wait returns exactly [connection '+c+']. Level-triggered: it stays on the ready list until the data is read.'});
        add({conn:c,cap:'read() on connection '+c+' (a second system call), then handle it.'},{sys:1});});}
    else{const sq=[];add({sq:all.slice(),cap:'Setup: io_uring_setup maps two rings shared with the kernel. The program writes 8 read requests (SQEs) into the submission ring and submits them with one io_uring_enter.'},{sys:2});
      ARR.forEach((c,i)=>{const pend=all.slice();add({sq:pend,cap:'The program calls io_uring_enter to wait for at least one completion (with SQPOLL and busy rings this call is not needed).'},{sys:1});
        add({conn:c,cq:[c],sq:pend.filter(x=>x!==c),cap:'Data arrives on connection '+c+'. The kernel performs the read itself, into the program\'s buffer, and writes a completion (CQE) into the completion ring.'},{kchk:1,ctx:1});
        add({conn:c,uscan:[c],sq:pend.filter(x=>x!==c),cap:'The program reads the CQE from shared memory (no system call): the data is already in its buffer. No read() call.'});
        add({conn:c,sq:pend,cap:'It writes a fresh read SQE for connection '+c+' into the submission ring; it goes to the kernel with the next io_uring_enter.'});});}
    return F;}
  const svgEl=document.getElementById('ev-svg'),cap=document.getElementById('ev-cap'),cnt=document.getElementById('ev-cnt');
  let mode='threads',F=frames(mode);
  function draw(i){const f=F[i],W=RD.width(svgEl),H=206,bw=Math.min(64,(W-20)/N-6),gap=(W-20-bw*N)/(N-1);let s='';
    const X=k=>10+k*(bw+gap);
    s+=RD.t(10,13,'connections (sockets)',{fs:11,fill:'var(--mute)'});
    for(let k=0;k<N;k++){const on=f.conn===k;s+='<rect x="'+X(k)+'" y="18" width="'+bw+'" height="26" rx="5" fill="'+(on?'var(--acc2)':'var(--bg)')+'" stroke="'+(on?'var(--acc)':'var(--line)')+'" stroke-width="'+(on?2:1)+'"/>'+RD.t(X(k)+bw/2,36,String(k),{a:'middle',fs:12,w:on?600:400})}
    // kernel band
    s+='<rect x="4" y="54" width="'+(W-8)+'" height="74" rx="8" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(12,68,'kernel',{fs:11,fill:'var(--mute)'});
    if(mode==='threads'){for(let k=0;k<N;k++){const aw=f.awake===k;s+='<circle cx="'+(X(k)+bw/2)+'" cy="96" r="11" fill="'+(aw?'var(--c3)':'var(--dim)')+'"/>'+RD.t(X(k)+bw/2,100,aw?'run':'zz',{a:'middle',fs:10,fill:aw?'var(--bg)':'var(--ink)'})}
      s+=RD.t(12,122,'one sleeping thread per connection (blocked in recv)',{fs:10.5,fill:'var(--mute)'});}
    else if(mode==='select'||mode==='poll'){for(let k=0;k<N;k++){const sc=f.scan.includes(k);s+='<rect x="'+X(k)+'" y="82" width="'+bw+'" height="22" rx="4" fill="'+(sc?'var(--c2)':'none')+'" stroke="var(--line)" opacity="'+(sc?0.85:1)+'"/>'+RD.t(X(k)+bw/2,97,sc?'check':'',{a:'middle',fs:10,fill:'var(--bg)'})}
      s+=RD.t(12,122,'the whole list is passed in and checked on every call',{fs:10.5,fill:'var(--mute)'});}
    else if(mode==='epoll'){s+=RD.t(12,88,'interest list (tree): all 8, registered once',{fs:10.5});s+=RD.t(12,108,'ready list: ['+f.ready.join(', ')+']',{fs:12,w:600,fill:f.ready.length?'var(--c3)':'var(--ink)'});}
    else{s+=RD.t(12,88,'submission ring (SQ, pending reads): '+(f.sq.length?f.sq.join(' '):'empty'),{fs:11});s+=RD.t(12,110,'completion ring (CQ): '+(f.cq.length?'[read on '+f.cq.join(', ')+' done]':'empty'),{fs:12,w:600,fill:f.cq.length?'var(--c3)':'var(--ink)'});s+=RD.t(12,124,'both rings are memory shared by program and kernel',{fs:10,fill:'var(--mute)'});}
    // program band
    s+='<rect x="4" y="136" width="'+(W-8)+'" height="64" rx="8" fill="var(--bg)" stroke="var(--line)"/>'+RD.t(12,150,'your program'+(mode==='threads'?' (8 threads)':' (one thread)'),{fs:11,fill:'var(--mute)'});
    if(f.uscan.length&&mode!=='threads'){for(let k=0;k<N;k++){const u=f.uscan.includes(k);s+='<rect x="'+X(k)+'" y="160" width="'+bw+'" height="22" rx="4" fill="'+(u?'var(--c4)':'none')+'" stroke="'+(u?'var(--c4)':'var(--line)')+'" opacity="'+(u?0.8:0.5)+'"/>'+RD.t(X(k)+bw/2,175,u?'look':'',{a:'middle',fs:10,fill:'var(--bg)'})}}
    svgEl.innerHTML=RD.svg(W,H,s,'Connections, kernel and program');
    cap.innerHTML='<div class="t">Step '+(i+1)+' of '+F.length+'</div><p>'+RD.esc(f.cap)+'</p>';
    const sum={sys:0,kchk:0,uscan:0,ctx:0};for(let j=0;j<=i;j++)for(const k in sum)sum[k]+=F[j].d[k];
    cnt.innerHTML=RD.stat('system calls',String(sum.sys),'including setup')+RD.stat('descriptors the kernel checked',String(sum.kchk),'')+RD.stat('entries the program scanned',String(sum.uscan),'')+RD.stat('thread wake-ups',String(sum.ctx),'context switches into a thread');}
  const A=RD.anim({card:'ev-card',ctl:'ev-ctl',n:F.length,ms:1600,label:'Step through the arrivals',draw,tab:'t-ev'});
  RD.seg(document.getElementById('ev-mode'),m=>{mode=m;F=frames(m);A.reset(F.length);A.play()});
  RD.onResize(()=>A.redraw(),'t-ev');

  // ---- scale up with measured costs ----
  const E=window.CD.ev,C=window.CD.conns;
  function interp(n,k){const pts=E.filter(e=>e[k]!=null);if(n>pts[pts.length-1].n)return null;
    for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];if(n>=a.n&&n<=b.n){const t=(Math.log(n)-Math.log(a.n))/(Math.log(b.n)-Math.log(a.n));return Math.exp(Math.log(a[k])+t*(Math.log(b[k])-Math.log(a[k])))}}return pts[0][k]}
  const fmt=x=>x>=1e6?(x/1e6).toFixed(2)+' ms':x>=1e3?(x/1e3).toFixed(1)+' µs':Math.round(x)+' ns';
  function upd(){const n=Math.max(1,Math.round(Math.pow(10,+document.getElementById('ev-n').value))),r=Math.round(Math.pow(10,+document.getElementById('ev-r').value));
    document.getElementById('ev-n-l').textContent=n.toLocaleString('en-US');document.getElementById('ev-r-l').textContent=r.toLocaleString('en-US');
    const p=interp(n,'poll'),e=interp(n,'epoll'),sl=n<=500?interp(n,'select'):null;
    const cpu=x=>{if(x==null)return '';const f=x*r/1e9*100;return f.toFixed(f<10?2:0)+'% of one CPU at '+r.toLocaleString('en-US')+' messages/s'+(f>100?': one thread cannot keep up':'')};
    const thrRss=C.threads.rss_added/2000,thrV=C.threads.vsz/2000;
    document.getElementById('ev-out').innerHTML=RD.stat('select, per question',sl!=null?fmt(sl):n>=1024?'impossible':'not measured',sl!=null?cpu(sl):n>=1024?'a descriptor number would exceed 1023':'measured up to 500 (descriptor numbers reached 1001)')+
      RD.stat('poll, per question',fmt(p),cpu(p))+RD.stat('epoll_wait, per question',fmt(e),cpu(e))+
      RD.stat('thread per connection',n.toLocaleString('en-US')+' threads',(n*thrV/1024).toFixed(n*thrV<1024?2:1)+' GiB address space, about '+Math.round(n*thrRss)+' MiB resident');
    document.getElementById('ev-note').textContent='Readings off the measured curve (N pipe read ends watched, one ready). Real servers also pay for the read and write calls themselves, which every readiness design needs and io_uring batches.';}
  ['ev-n','ev-r'].forEach(id=>document.getElementById(id).addEventListener('input',upd));upd();
})();
