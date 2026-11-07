// ---- Scene, Fig. 4 (section 4): execve replaces the program's memory and keeps the process (renderer v2) ----
// Driven by the page's recorded run (PD.execkeep, src/runs/c/exec_keep.c and showself.c): the PID before and after, the descriptors before
// (fd 5 without O_CLOEXEC, fd 6 with it) and after ("open fds"), and the three masks the new program printed (SigBlk, SigIgn, SigCgt).
(function(){
  if(!document.getElementById('stg-exec')||!window.PD)return;const {at,off,mix,cl,lerp}=S3;
  const T=PD.execkeep,pid=+T.match(/before exec: pid (\d+)/)[1],pid2=+T.match(/after exec: pid (\d+)/)[1];
  const after=T.match(/open fds: ([\d ]+)/)[1].trim().split(' ').map(Number);
  const cx=+T.match(/fd (\d+) \(CLOEXEC\)/)[1],keep=+T.match(/fd (\d+) \(no CLOEXEC\)/)[1];
  const before=[0,1,2,keep,cx];
  const mask=n=>parseInt(T.match(new RegExp(n+':\\s*([0-9a-f]+)'))[1],16);
  const blk=mask('SigBlk'),ign=mask('SigIgn'),cgt=mask('SigCgt'),bit=(m,s)=>!!(m&(1<<(s-1)));
  const YU=2.2;
  const OLD=[['exec_keep: code',.42],['heap',.36],['stack',.32]],NEW=[['showself: code',.4],['ld.so, libc',.4],['stack',.32]];
  const FX=n=>.9+n*.75,SG=[['SIGUSR1',10,'handler','handled'],['SIGUSR2',12,'ignored','ignored'],['SIGHUP',1,'blocked','blocked']];
  function slabs(R,list,a,y0,hl){const P=R.P;let y=y0;list.forEach(([nm,h],i)=>{R.box([-1.9,y,-.7],[2.6,h,1.3],{fill:mix(P.paper,hl,.25+.12*i),a,shadow:false});
    R.label([-.6,y+h/2,-.05],nm,{fs:12.5,mono:true,b:i===0,al:'left',dx:10,a,c:P.ink});y+=h})}
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-5,5,-2.2,2.2,.5);
    R.quad([[-3.6,0,-.2],[4.2,0,-.2],[4.2,0,2.4],[-3.6,0,2.4]],{fill:P.paper,edge:true,ea:.35,dz:200});
    R.label([-3.6,0,2.4],nar?'kernel':'kernel: the process record',{al:'left',dy:13,fs:12.5,b:1,c:P.c5});
    R.glass([-3.6,YU,-1.6],[7.8,0,0],[0,0,1.9],{c:P.c1,nu:10,nv:4,a:.36,dz:60,th:.02});
    R.label([4.2,YU,.3],nar?'user space':'user space: the program',{al:'right',dy:12,fs:12.5,b:1,c:P.c1});
    // the memory image: the old program until execve drops it, then the new one
    const oa=k<1?1:k===1?1-e:0,na=k<2?0:k===2?e:1;
    if(oa>0)slabs(R,OLD,oa,YU+(k===1?-.5*e:0),P.c1);
    if(na>0)slabs(R,NEW,na,YU+(k===2?.5*(1-e):0),P.c3);
    // the crossing: execve goes down and never comes back to the old code
    if(k===1){R.flow([[-1.9,YU+.2,0],[-1.2,1.2,.6],[-1.9,.5,1.0]],{c:P.c2,r:.07,n:7,a:e});R.label([-1.2,1.2,.6],'execve("showself")',{fs:12.5,mono:true,b:1,c:P.c2,al:'left',dx:10,a:e})}
    // the record: PID, descriptor table, signal state
    const pa=k===5?1:.85;R.box([-1.9,0,1.2],[1.3,.5,.9],{fill:mix(P.paper,P.c5,.45),a:pa});
    R.label([-1.9,.5,1.2],'PID '+(k===5?pid2:pid),{fs:13,b:1,dy:-11,c:k===5?P.c3:P.ink});
    // descriptors: each cell an fd; fd 6 (close-on-exec) closes at step 4
    if(!nar)R.label([FX(0)-.45,0,.45],'fd table',{al:'right',fs:12.5,b:1,dx:-6,c:P.c5});
    before.forEach((f,i)=>{const gone=f===cx,a=gone?(k<3?1:k===3?1-e:0):1,hot=k===3&&(gone||after.includes(f));
      R.box([FX(i),0,.45],[.55,.3,.55],{fill:gone?mix(P.paper,P.bad,.35):hot?mix(P.paper,P.c3,.45):P.paper,a});
      R.label([FX(i),.3,.45],String(f),{fs:13,b:1,mono:true,dy:-10,a:Math.max(a,0),c:gone?P.bad:P.ink});
      if(gone&&k<3&&!nar)R.label([FX(i),0,.73],'CLOEXEC',{fs:12,mono:true,dy:11,c:P.bad,a})});
    if(k===3)R.label([FX(4),.3,.45],'closed by execve',{fs:12.5,b:1,dy:-30,c:P.bad,a:e,al:'right',dx:20});
    // signal state: three rows; the handler points into the old program's memory, so execve resets it
    SG.forEach(([nm,s,was],i)=>{const x=FX(.6),z=1.25+i*.5,reset=nm==='SIGUSR1';
      const now=k<4?was:reset?(bit(cgt,s)?'handled':'default'):bit(ign,s)?'ignored':bit(blk,s)?'blocked':'default';
      const hot=k===4,col=now==='default'?P.bad:now==='handled'?P.c4:P.c3;
      R.box([x,0,z],[1.0,.2,.36],{fill:hot?mix(P.paper,col,.4):mix(P.paper,P.c4,.15)});
      R.label([x+.5,.1,z],nm+': '+now,{fs:12.5,mono:true,b:hot,al:'left',dx:8,c:hot?col:P.ink});
      if(reset&&k<4){const a=k===1?1-e:k>=2?0:1;R.line([[x,.2,z],[x-1.2,1.4,.2],[-1.9,YU+.3,-.1]],{c:P.c4,w:1.5,a:a*.9,dash:[4,3]});
        if(!nar)R.label([x-1.2,1.4,.2],'handler address',{fs:12,c:P.c4,a,al:'left',dx:6})}});
    if(k===4&&!nar)R.label([FX(2),0,2.4],'SigCgt '+cgt.toString(16)+' · SigIgn 0x'+ign.toString(16)+' · SigBlk 0x'+blk.toString(16),{fs:12.5,mono:true,b:1,c:P.c4,a:e});
    if(k===5){R.label([-1.9,YU+.9,-.7],'open fds: '+after.join(' '),{fs:13,mono:true,b:1,c:P.c3,a:e});R.flow([[-1.9,.55,1.2],[-1.9,YU-.05,-.1]],{c:P.c3,r:.06,n:5,a:e})}
  }
  const full={cam:[.12,.72],bounds:[[-3.6,0,-1.6],[4.2,YU+1.1,2.4]]};
  S3.stage({id:'stg-exec',list:'sx-exec',fig:'Fig. 4 · execve: new program, same process',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1400,hold:5000,draw,
    margin:w=>w<520?[16,8,24,8]:[20,14,26,14]});
})();
