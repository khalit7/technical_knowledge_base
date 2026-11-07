// ---- Scene, Fig. 2 (section 1): the same process seen from outside and inside: its nsproxy's eight pointers swing to new namespaces (renderer v2) ----
// Data: window.CT_DATA.mini, the measured run of section 0 (inode numbers from readlink /proc/self/ns/*, and what the process saw after each step).
(function(){
  if(!document.getElementById('stg-ns')||!window.CT_DATA)return;const {at,lerp,lerp3,mix,cl}=S3,M=window.CT_DATA.mini;
  const K=['mnt','uts','ipc','pid','net','user','cgroup','time'],NM={mnt:'mount',uts:'UTS',ipc:'IPC',pid:'PID',net:'network',user:'user',cgroup:'cgroup',time:'time'};
  // the build step (stage step) at which each kind's pointer moves; user and time never move
  const WHEN={uts:1,pid:1,cgroup:2,mnt:2,net:3,ipc:3},SH={mnt:'mnt',uts:'uts',ipc:'ipc',pid:'pid',net:'net',user:'usr',cgroup:'cg',time:'tm'}; // short names on a phone
  const m0=M[0].kv,m8=M[8].kv,diff=K.filter(k=>m0['ns_'+k]!==m8['ns_'+k]);
  {const n=document.getElementById('ct-ns-n'),w=['zero','one','two','three','four','five','six','seven','eight'];if(n)n.textContent=w[diff.length]+' of '+w[K.length]}
  const X=i=>(i-3.5)*1.2,ZH=-.9,ZN=1.0,BACK=[0,.55,-2.9],FRONT=[0,.6,3.0];
  function draw(R,k,e){const P=R.P;R.grid(-5.5,5.5,-4.2,4.2,.5);
    // the two processes: the outer container's (behind) and the one being built (in front)
    R.box([0,0,-2.9],[2.2,.55,.8],{fill:mix(P.paper,P.ink,.08),a:k===0?1:.55});
    R.label([0,.55,-2.9],'outer container\'s processes',{fs:12.5,b:1,dy:-11,c:P.mute});
    R.box([0,0,3.0],[2.2,.6,.8],{fill:mix(P.paper,P.c1,.45)});
    R.label([0,0,3.0],'the process being built',{fs:12.5,b:1,dy:16,c:P.c1});
    K.forEach((kd,i)=>{const x=X(i),w=WHEN[kd],moved=w!=null&&k>=w,now=w===k;
      // the outer namespace of this kind (shared until the pointer moves)
      R.box([x,0,ZH],[.95,.4,.7],{fill:mix(P.paper,P.c5,.3),a:moved&&!now?.55:1});
      // the new namespace, created at its step
      if(w!=null){const a=k<w?0:now?e:1;R.box([x,0,ZN],[.95,.4,.7],{fill:mix(P.paper,P.c1,.5),a,ec:now?P.c1:undefined,lw:now?1.6:.9});
        if(now)R.label([x,0,ZN+.35],m8['ns_'+kd],{mono:true,fs:12,dy:12,c:P.c1,b:1,a:e,wide:1})}
      R.label([x,.4,ZH],R.W<520?SH[kd]:NM[kd],{fs:12,mono:true,dy:-11,c:(w==null&&k===4)?P.bad:P.ink,b:w==null&&k===4});
      // pointers: the outer processes always point at the outer namespaces
      R.flowArc([BACK[0]+(i-3.5)*.22,.5,BACK[2]+.3],[x,.4,ZH],.5,{c:P.mute,a:k===0?.6:.14,r:.045,n:5,speed:.9});
      // the built process: at the step its pointer swings from the outer namespace to the new one
      const t=w==null||k<w?0:now?e:1,tgt=lerp3([x,.4,ZH],[x,.4,ZN],t),hot=now||(w==null&&k===4);
      R.flowArc([FRONT[0]+(i-3.5)*.22,.55,FRONT[2]-.3],tgt,lerp(1.05,.45,t),{c:hot?(w==null?P.bad:P.c1):mix(P.mute,P.c1,.4),a:hot?1:k===0?.75:.35,r:hot?.06:.045,n:hot?8:5,speed:1})});
    if(k===0)R.label([X(4),0,ZH+.35],'net:['+m0.ns_net+']',{mono:true,fs:12,dy:12,b:1,c:P.c5,wide:1});
    // what the process sees after the step (measured values)
    const v2=M[2].kv,v4=M[4].kv,v6=M[6].kv;
    const said=k===1?'hostname '+v2.hostname+' · PID '+v2.pid+', parent '+v2.ppid:k===2?'cgroup '+v4.cgroup+' · '+v4.mounts+' mounts · '+v4.procs_visible+' process':k===3?v6.net_ifaces.split(',').join(', ')+' · '+v6.sysv_shm_segments+' SysV segments':k===4?diff.length+' of '+K.length+' new · user and time shared':k===0?'one nsproxy, eight pointers':'';
    R.label([0,.6,3.0],said,{fs:12.5,b:1,dy:-14,c:k===4?P.bad:P.c1,a:k===0?1:e});
  }
  const full={cam:[.12,.66],bounds:[[-5,0,-3.3],[5,1.1,3.4]]};
  S3.stage({id:'stg-ns',list:'sx-ns',fig:'Fig. 2 · eight pointers, one process',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,8,20,8]:[18,16,22,16]});
})();
