// ---- Scene, Fig. 3 (section 3): fork copies the page tables, not the pages; a thread copies nothing; vfork and posix_spawn borrow (renderer v2) ----
// The parent's page-table size is the page's own run (PD.spawn, src/runs/c/spawn_cost.c: VmPTE with 1,024 MiB touched); the flags are the strace of
// os.fork, a thread and subprocess (PD.clones). Times are not drawn here: the chart after the drill shows them, so the prediction stays a prediction. The 16 page cubes stand for the 262,144 pages of 1 GiB.
(function(){
  if(!document.getElementById('stg-fork')||!window.PD)return;const {at,off,mix,cl,lerp}=S3;
  const sp=(mib,m)=>PD.spawn.find(r=>r.mib===mib&&r.m===m);
  const f1=sp(1024,'fork_exit');
  const XP=-2.7,XC=2.7,ZT=1.0,ZPT=.15,ZPG=-1.15;
  const PG=[];for(let j=0;j<2;j++)for(let i=0;i<8;i++)PG.push([-1.4+i*.4,0,ZPG-j*.42]);
  const W1=13; // the page the child writes at step 4
  function pt(R,x,a,lab,hl){const P=R.P;R.glass([x-.55,.04,ZPT],[1.1,0,0],[0,1.0,0],{c:P.c5,nu:6,nv:8,a:a*(hl?1:.7)});
    if(lab)R.label([x,1.05,ZPT],lab,{fs:12.5,b:1,dy:-10,c:P.c5,a})}
  function task(R,x,lab,a,c){const P=R.P;R.box([x,0,ZT],[.9,.45,.6],{fill:mix(P.paper,c||P.c1,.35),a});R.label([x,.45,ZT],lab,{fs:12.5,b:1,dy:-11,a:Math.max(a,.4)})}
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-5,5,-2.2,2.8,.5);
    R.label([-3.4,0,1.5],nar?'kernel':'kernel: the records fork works on',{al:'left',fs:12.5,b:1,c:P.c5,dy:14});
    const childA=k<1?0:k===1?e:k===2?1:k===3?1-e:0, thrA=k===3?e:k===4?1-e:0, vfA=k===4?e:0;
    // the pages: shared by everyone; read-only (copy-on-write) once a fork has happened
    const ro=k>=1&&k<=2?(k===1?e:1):k===3?1-e:0;
    PG.forEach((p,i)=>R.box(p,[.3,.3,.3],{fill:mix(P.paper,P.c2,.12+.35*ro),shadow:false}));
    R.label([0,.3,ZPG-.42],ro>.5?'pages: shared, read-only after fork':'pages (16 stand for 262,144 of 4 KiB)',{fs:12.5,b:1,dy:-14,c:ro>.5?P.c2:P.mute});
    // the parent: its task and its page tables, pointing at every page
    task(R,XP,'parent',k===4?1-.6*e:1);
    pt(R,XP,1,nar?'page tables':'page tables: VmPTE '+f1.pte_kib.toLocaleString('en-US')+' KiB',k===0);
    PG.forEach(p=>R.line([[XP,.55,ZPT],[p[0],.3,p[2]]],{c:P.c5,w:.8,a:.45}));
    R.line([[XP,.3,ZT-.3],[XP,.3,ZPT+.05]],{c:P.ink,w:1.2,a:.6});
    // fork: a new task, and a copy of the page tables streaming across; the child's entries point at the same pages
    if(childA>0){task(R,XC,'child',childA);const cp=k===1?e:1;pt(R,lerp(XP,XC,cp),childA,k>=1&&cp>.9?'copied page tables':null,k===1);
      if(k===1)R.flow([[XP+.5,.5,ZPT+.05],[0,.9,ZPT+.2],[XC-.5,.5,ZPT+.05]],{c:P.c5,r:.07,n:8,a:e});
      if(cp>.95)PG.forEach((p,i)=>{if(k===2&&i===W1)return;R.line([[XC,.55,ZPT],[p[0],.3,p[2]]],{c:P.c5,w:.8,a:.45*childA})});
      R.line([[XC,.3,ZT-.3],[XC,.3,ZPT+.05]],{c:P.ink,w:1.2,a:.6*childA})}
    // a write in the child: one page is copied and the child's entry moves to the copy
    if(k===2){const src=PG[W1],dst=[1.95,0,-1.95],pos=[lerp(src[0],dst[0],e),0,lerp(src[2],dst[2],e)];
      R.box(pos,[.3,.3,.3],{fill:mix(P.paper,P.c2,.75),a:.4+.6*e});R.line([[XC,.55,ZPT],[pos[0],.3,pos[2]]],{c:P.c2,w:1.6,a:.9});
      R.flowArc([XC,.45,ZT-.3],[pos[0],.3,pos[2]],.8,{c:P.c2,r:.06,n:6,a:e});
      R.label(dst,'write: one 4 KiB copy',{fs:12.5,b:1,dy:-14,c:P.c2,a:e,al:'left',dx:10})}
    // a thread: a new task in the same group, pointing at the parent's page tables; nothing copied
    if(thrA>0){const x=XP+1.25;task(R,x,'new thread',thrA,P.c4);R.line([[x,.3,ZT-.3],[XP+.3,.5,ZPT+.05]],{c:P.c4,w:1.6,a:thrA});
      if(!nar)R.label([0,1.4,ZT],'CLONE_VM | CLONE_FILES | CLONE_SIGHAND | CLONE_THREAD',{fs:12,mono:true,b:1,c:P.c4,a:thrA})}
    // vfork, posix_spawn: the child borrows the parent's memory; the parent waits until exec or _exit
    if(vfA>0){task(R,XC,'spawned child',vfA,P.c6);R.line([[XC,.3,ZT-.3],[XC-.4,.6,ZT-.25],[XP+.45,.6,ZPT+.05]],{c:P.c6,w:1.6,a:vfA});
      R.label([XP,.45,ZT],'suspended until exec or _exit',{fs:12.5,b:1,dy:24,c:P.bad,a:vfA});
}
  }
  const full={cam:[.08,.62],bounds:[[-3.4,0,-2.1],[3.4,1.2,1.5]]};
  S3.stage({id:'stg-fork',list:'sx-fork',fig:'Fig. 3 · fork copies the page tables, not the pages',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1400,hold:5000,draw,
    margin:w=>w<520?[16,8,24,8]:[20,14,26,14]});
})();
