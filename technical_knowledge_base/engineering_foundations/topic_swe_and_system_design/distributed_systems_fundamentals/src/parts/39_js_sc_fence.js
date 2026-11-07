// ---- Scene: Fig. 4, leases and fencing tokens (stg-fence): the same garbage-collection pause twice. A lock service hands out leases with
// tokens (33 and 34, Kleppmann's numbers); Worker 1 freezes inside a glass case while its lease runs out; Worker 2 takes the lease and writes;
// Worker 1 wakes and writes with its old token. Without a check the storage takes the stale write; with one it rejects it.
// Illustrative amounts (100 credits, charges of 10 and 60). Mode 0: lease only; mode 1: fencing token. ----
window.DSF_FENCE={start:100,c1:10,c2:60,t1:33,t2:34};
(function(){
  if(!document.getElementById('stg-fence')||!window.DSK)return;
  const {mix}=S3,{node,tag,cut,win,arcPts}=DSK,F=window.DSF_FENCE;
  const LS=[-3.3,0,0],W1=[0,0,-1.5],W2=[0,0,1.5],ST=[3.3,0,0];
  let mode=0;
  function draw(R,k,e){const P=R.P;R.grid(-4.6,4.6,-3,3,.5);
    const bal=k<3?F.start:k===3?(e>.6?F.start-F.c2:F.start):mode===0?(e>.55?F.start-F.c1:F.start-F.c2):F.start-F.c2;
    const maxTok=mode===1&&(k>3||(k===3&&e>.6))?F.t2:null;
    const paused=k>=1&&k<=3,w1lease=k===0||k>=1&&k<=1,exp=k>=2;
    node(R,LS,[1.2,.7,.9],P.c4,{lab:'lock service',sub:'TTL 10 s',subWide:1,a:k===3||k===4?.45:1});
    // Worker 1, and its glass case while it is paused
    node(R,W1,[1.1,.6,.8],paused?P.mute:P.acc,{lab:'Worker 1',subWide:1,sub:paused?'paused (GC)':k===4?'wakes up':'holds lease · charge 10',sc:paused?P.bad:P.mute,t:paused?.12:.34});
    if(paused){const a=k===1?e:1;R.box([W1[0],0,W1[2]],[1.5,1.05,1.15],{fill:mix(P.paper,P.c1,.35),fa:.18,a,shadow:false,lw:.8})}
    node(R,W2,[1.1,.6,.8],P.acc,{lab:'Worker 2',subWide:1,sub:k>=2?(k===4?'done':'holds lease · charge 60'):'waiting',a:k<2?.4:1});
    node(R,ST,[1.3,.75,1],P.c3,{lab:'storage · balance '+bal,sub:mode===1?'highest token seen: '+(maxTok||'none'):'tokens not checked',sc:mode===1?P.good:P.mute,lc:k===4&&mode===0?P.bad:P.ink});
    // leases: a glass plate under the worker that holds one; the old one turns red when it expires
    const lease=(p,c,a)=>R.glass([p[0]-.85,.012,p[2]-.62],[1.7,0,0],[0,0,1.24],{c,a,nu:2,nv:1,th:.02});
    lease(W1,exp?P.bad:P.c4,exp?.6:k===0?e:1);if(exp)R.label([W1[0]-.85,0,W1[2]+.62],'lease 33 expired',{fs:12,b:1,c:P.bad,al:'right',dx:-6,dy:8,wide:1});
    if(k>=2)lease(W2,P.c4,k===2?e:1);
    // tokens: from the lock service to the worker (a small tag on its lease plate), then riding with its write
    const tk=(p,t,a)=>tag(R,[p[0]+.62,.02,p[2]+.42],P.c4,'token '+t,a,{s:[.34,.14,.26],al:'left',dx:12,dy:6});
    const mid=(a0,b0,h,u)=>R.arcPt(a0,b0,h,u==null?.5:u);
    if(k===0){const a0=[LS[0]+.4,.7,LS[2]-.2],b0=[W1[0]-.4,.6,W1[2]];R.flow(arcPts(R,a0,b0,.6,20),{c:P.c4,a:1,r:.07,n:6});
      const c0=[ST[0]-.5,.6,ST[2]-.2],d0=[W1[0]+.5,.5,W1[2]];R.flow(arcPts(R,c0,d0,.5,20),{c:P.c3,a:.8*e,r:.06,n:5});R.label(mid(c0,d0,.5),'reads balance '+F.start,{fs:12.5,c:P.c3,b:1,a:e,dy:-14,wide:1})}
    if(k<=3)tk(W1,F.t1,k===0?e:1);
    if(k===2){R.flow(arcPts(R,[LS[0]+.4,.7,LS[2]+.2],[W2[0]-.4,.6,W2[2]],.6,20),{c:P.c4,a:1,r:.07,n:6})}
    if(k>=2)tk(W2,F.t2,k===2?e:1);
    if(k===3){const a0=[W2[0]+.5,.6,W2[2]],b0=[ST[0]-.5,.7,ST[2]+.2];R.flow(arcPts(R,a0,b0,.6,20),{c:P.good,a:1,r:.075,n:7});R.label(mid(a0,b0,.6),'balance = '+(F.start-F.c2)+' · token '+F.t2,{fs:12.5,b:1,mono:1,c:P.good,dy:16,wide:1})}
    if(k===4){const ok=mode===0,a0=[W1[0]+.5,.6,W1[2]],b0=[ST[0]-.55,.7,ST[2]-.2],pts=arcPts(R,a0,b0,.6,20);
      if(ok)R.flow(pts,{c:P.bad,a:1,r:.075,n:7});else{R.flow(pts.slice(0,15),{c:P.bad,a:1,r:.075,n:5});cut(R,pts[14],win(e,.3,.6),.22)}
      R.label(mid(a0,b0,.6,.42),'balance = '+(F.start-F.c1)+' · token '+F.t1,{fs:12.5,b:1,mono:1,c:P.bad,dy:22,wide:1});
      R.label([ST[0],0,ST[2]+.5],ok?'60-credit charge lost':'token 33 < 34: rejected',{fs:13,b:1,c:ok?P.bad:P.good,dy:16,a:win(e,.45,.8)})}
  }
  // on a phone (canvas under 520 px) the camera looks along the row of machines, so the long axis becomes depth and the scene fills the tall card
  let st=null;const narrow=()=>st&&st.R&&st.R.W<520;
  st=S3.stage({id:'stg-fence',list:'sx-fence-0',fig:'Fig. 4 · one pause, two storages',cam:[0,.66],bounds:[[-4.1,0,-2.1],[4.1,1.0,2.4]],aspect:.52,dur:1500,hold:4800,draw,
    margin:w=>w<520?[40,8,30,8]:[44,16,34,16],view:()=>narrow()?{cam:[1.3,.9]}:null});
  const seg=document.getElementById('fc-seg');
  if(seg&&st)seg.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    mode=+b.dataset.m;document.getElementById('sx-fence-0').hidden=mode!==0;document.getElementById('sx-fence-1').hidden=mode!==1;st.list('sx-fence-'+mode)});
})();
