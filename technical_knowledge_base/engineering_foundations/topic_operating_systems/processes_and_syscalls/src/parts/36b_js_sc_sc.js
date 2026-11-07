// ---- Scene, Fig. 2 (section 2): one os.read(fd, 4096) crossing from user space down to the kernel and back (renderer v2) ----
// Three modes on one call, each its own step list (sx-sc-ok, sx-sc-err, sx-sc-trace): the open fd (27 bytes), the closed fd (EBADF), and the same call under strace.
// Real instructions and kernel functions (glibc 2.36 disassembly, Linux v6.12 entry code); counts of strace's own calls from PD.strace_meta;
// costs from PD.sysc (getppid through glibc and under strace, src/runs/c/sysc.c). Register values are the root's 27-byte hello.txt.
(function(){
  if(!document.getElementById('stg-sc')||!window.PD)return;const {mix,cl,lerp3}=S3;
  const YU=2.4;
  // where the call is: on the user plate (Python, CPython, glibc, strace), at the door, or on the kernel's floor (entry, sys_read)
  const LOC={py:[-3.3,YU+.55,0],cpy:[-1.6,YU+.55,0],glibc:[.1,YU+.55,0],door:[.1,YU,0],entry:[.1,.5,0],sys:[-2.6,.5,0],strace:[3.3,YU+.55,-.5]};
  const TM=PD.strace_meta,tcalls=TM.wait4+TM.ptrace+TM.write;
  // each step: where the call ends, the registers it sets, and what it adds to the counters (x mode switches, s tracer stops, t strace's own calls)
  const head=[{at:'cpy'},{at:'glibc',r:{x0:'3',x1:'buf',x2:'4096'}},{at:'door',r:{x8:'63'},d:{x:1}},{at:'entry'}];
  const M={ok:head.concat([{at:'sys',data:1},{at:'door',r:{x0:'27'},d:{x:1},up:1},{at:'glibc'},{at:'py',done:'data: 27 bytes'}]),
    err:head.concat([{at:'sys',bad:1},{at:'door',r:{x0:'-9'},d:{x:1},up:1},{at:'glibc',r:{x0:'-1'},errno:1},{at:'py',done:'OSError: [Errno 9]',bad:1}]),
    trace:head.concat([{at:'strace',d:{s:1,t:tcalls/2},say:'read(3, '},{at:'sys',data:1},{at:'strace',d:{s:1,t:tcalls/2},say:'... = 27'},{at:'py',r:{x0:'27'},d:{x:1},up:1,done:'about '+Math.round(PD.sysc.strace_ns/1000)+' µs a call'}])};
  let mode='ok';
  const where=(S,k)=>k<0?LOC.py:LOC[S[k].at];
  function regs(S,k){const R={x0:'?',x1:'?',x2:'?',x8:'?'},ch={};for(let i=0;i<=k;i++)Object.assign(R,S[i].r||{});Object.assign(ch,S[k].r||{});return [R,ch]}
  function cnt(S,k){const c={x:0,s:0,t:0};for(let i=0;i<=k;i++){const d=S[i].d||{};c.x+=d.x||0;c.s+=d.s||0;c.t+=d.t||0}return c}
  function draw(R,k,e){const P=R.P,S=M[mode],st=S[k],nar=R.W<520,tr=mode==='trace';R.grid(-5.6,5.6,-2.2,2.2,.5);
    // the kernel's floor and the user plate
    R.quad([[-4.8,0,-1.3],[4.8,0,-1.3],[4.8,0,1.3],[-4.8,0,1.3]],{fill:P.paper,edge:true,ea:.35,dz:200});
    R.label([4.8,0,1.3],'kernel mode (EL1)',{al:'right',dy:13,fs:12.5,b:1,c:P.c5});
    R.glass([-4.8,YU,-1.5],[9.6,0,0],[0,0,3.0],{c:P.c1,nu:12,nv:4,a:.36,dz:60,th:.02});
    R.label([4.8,YU,1.5],'user mode (EL0)',{al:'right',dy:12,fs:12.5,b:1,c:P.c1});
    const hot=n=>st.at===n;
    const obj=(n,c,s,fill,lab,sub,a)=>{a=a==null?1:a;const on=hot(n);R.box(c,s,{fill:on?mix(P.paper,P.c2,.45):fill,a});
      R.label([c[0],c[1]+s[1],c[2]],nar?lab.replace(' read()',''):lab,{fs:12.5,b:1,dy:-11,a:Math.max(a,.5),c:on?P.ink:P.mute,mono:true});if(sub&&!nar)R.label([c[0],c[1],c[2]+s[2]/2],sub,{fs:12,dy:12,a:Math.max(a,.5)*.9,c:P.mute})};
    obj('py',[-3.3,YU,0],[1.4,.5,1],mix(P.paper,P.c1,.2),'Python','os.read(fd, 4096)');
    obj('cpy',[-1.6,YU,0],[1.4,.5,1],mix(P.paper,P.c1,.2),'CPython','os_read_impl');
    obj('glibc',[.1,YU,0],[1.4,.5,1],mix(P.paper,P.c1,.2),'glibc read()','svc #0 inside');
    obj('entry',[.1,0,0],[1.5,.45,1],mix(P.paper,P.c5,.3),'el0_svc','pt_regs saved');
    obj('sys',[-2.6,0,0],[1.6,.45,1],mix(P.paper,P.c5,.3),'sys_read','fd table, page cache');
    // the system-call table: a glass plate standing between entry and sys_read, row 63 marked when it is used
    R.glass([-1.25,.05,-.5],[0,1.1,0],[0,0,1],{c:P.c5,nu:8,nv:4,a:hot('sys')?.9:.45});
    if(!nar)R.label([-1.25,1.15,0],'sys_call_table[63]',{fs:12,mono:true,dy:-10,c:P.c5,a:hot('sys')?1:.6});
    if(tr)obj('strace',[3.3,YU,-.5],[1.6,.5,1],mix(P.paper,P.c4,.25),'strace','another process');
    // the door on the plate
    R.glow(LOC.door,.5,{c:P.c2,a:hot('door')?.9:.35});
    // registers: four plinths, the ones this step sets in orange
    const [rg,ch]=regs(S,k);['x0','x1','x2','x8'].forEach((n,i)=>{const c=[1.55+i*.82,YU,.95],on=n in ch;if(nar&&!on)return;
      R.box(c,[.5,.18,.42],{fill:on?mix(P.paper,P.c2,.55):P.paper,shadow:false});R.label([c[0],c[1]+.18,c[2]],n+' '+rg[n],{fs:12.5,mono:true,b:on,dy:-10,c:on?P.c2:P.ink})});
    // the call moving: a ball from the last place to this one, with a stream along its path
    const a0=where(S,k-1),a1=where(S,k),hgt=a0[1]===a1[1]?.5:.15,pos=R.arcPt(a0,a1,hgt,e);
    if(k>0||e<1){const pts=[];for(let i=0;i<=20;i++)pts.push(R.arcPt(a0,a1,hgt,i/20));R.flow(pts,{c:st.at==='strace'?P.c4:P.c2,r:.065,n:6,speed:1.4})}
    R.ball(pos,.13,{c:st.bad&&e>.5?P.bad:P.c2,top:1});
    // what moves or is set at this step
    if(st.data){R.flow([[-2.6,.5,.3],[-2.2,1.6,.4],[-1.6,YU+.5,.3]],{c:P.c6,r:.06,n:7,a:e});R.label([-2.1,1.5,.4],'27 bytes',{fs:12.5,b:1,c:P.c6,al:'left',dx:8,a:e})}
    if(st.bad&&st.at==='sys')R.label([-2.6,.45,0],'-EBADF = -9',{fs:13,b:1,mono:true,dy:-34,c:P.bad,a:e});
    if(st.errno)R.label([.1,YU+.5,0],'errno = 9, return -1',{fs:13,b:1,mono:true,dy:-34,c:P.bad,a:e});
    if(st.say)R.label([3.3,YU+.5,-.5],st.say,{fs:13,b:1,mono:true,dy:-34,c:P.c4,a:e});
    if(st.done)R.label([-3.3,YU+.5,0],st.done,{fs:13,b:1,mono:true,dy:-34,c:st.bad?P.bad:P.c6,a:e});
    // counters, upper right
    const c=cnt(S,k),lines=['mode switches '+c.x].concat(tr?['tracer stops '+c.s,'strace calls '+c.t]:[]);
    lines.forEach((t,i)=>R.label([-4.8,YU+1.35,-1.5],t,{al:'left',fs:12.5,mono:true,b:1,dy:i*17,c:i?P.c4:P.c2}));
  }
  const full={cam:[.14,.4],bounds:[[-4.8,0,-1.4],[4.8,YU+1.4,1.4]]};
  const st=S3.stage({id:'stg-sc',list:'sx-sc-ok',fig:'Fig. 2 · one os.read(), user mode to kernel mode and back',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1300,hold:4800,draw,
    margin:w=>w<520?[16,8,22,8]:[20,14,24,14]});
  RD.seg(document.getElementById('rd-sc-mode'),m=>{mode=m;['ok','err','trace'].forEach(x=>{document.getElementById('sx-sc-'+x).hidden=x!==m});st.list('sx-sc-'+m)});
})();
