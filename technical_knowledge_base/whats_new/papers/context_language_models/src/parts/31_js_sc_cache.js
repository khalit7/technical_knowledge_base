// ---- Scene: one trajectory, call by call, under a prefix cache and under Suffix Cache Reuse (renderer v2) ----
// Every row is one model call's prompt, to scale along x (32,768 tokens wide), calls in order from the back (call 1) to the front.
// The data is the Replay tab's engine (CLMR.simulate in 23_js_run.js, the same algorithm as recompute.py) at its defaults with
// "CLM keeps the newest 1 turn verbatim"; each call priced with Eq. 9 for Qwen3.6-27B. The trajectory is illustrative; the pricing is the paper's.
// Cached blocks lie flat; blocks the server must compute stand up. The bar at the head of each row is that call's FLOPs.
(function(){
  if(!document.getElementById('stg-cache')||!window.CLMR||!CLMR.simulate)return;const {at,off,lerp,mix,cl}=S3;
  const D=Object.assign({},CLMR.DEF,{clm_keep:1}),RUN=CLMR.simulate('clm',D),SUM=CLMR.simulate('summary',CLMR.DEF);
  const W=9,X0=-4.5,sx=W/D.window,X=t=>X0+t*sx,XB=-5.15,DZ=.42,N=Math.max(RUN.steps.length,SUM.steps.length),z=i=>(i-(N-1)/2)*DZ,HB=.3; // HB: bar height per 10^14 FLOPs
  const DEP=DZ*.7,HLO=.04,HHI=.3;
  // a row as message blocks [x0,x1,state,label]; far rows merge neighbours of the same state
  function blocks(s,merge,scr){const out=[];let x=0;s.blocks.forEach(b=>{let st=b[2];if(scr&&b[3])st='scr';const x0=x,x1=x+b[0];x=x1;
      const L=out[out.length-1];if(merge&&L&&L[2]===st)L[1]=x1;else out.push([x0,x1,st,b[4]])});
    if(s.G)out.push([x,x+s.G,'gen',s.kind==='edit'?'edit command':s.kind==='compact'?'summary':'command']);return out}
  function fill(P,st){return st==='hit'?mix(P.paper,P.c1,.38):st==='re'?P.bad:st==='scr'?P.c6:st==='gen'?P.c4:P.c3}
  function row(R,run,i,a,scr,close,fo){if(a<=.01)return;const P=R.P,s=run.steps[i];if(!s||s.kind==='stop')return;
    blocks(s,!close,scr).forEach(([t0,t1,st])=>{const h=st==='hit'||st==='scr'?HLO:HHI,w=Math.max(.012,(t1-t0)*sx-(close?.025:.008));
      R.box([X((t0+t1)/2),0,z(i)],[w,h,DEP],{fill:fill(P,st),a,shadow:false,lw:.6})});
    const f=fo!=null?fo:scr?s.f_scr:s.f_std;R.box([XB,0,z(i)],[.34,Math.max(.01,f/1e14*HB),DEP],{fill:scr&&s.reloc?mix(P.paper,P.c6,.7):mix(P.paper,P.acc,.55),a,shadow:false,lw:.6})}
  const post=(run,i)=>i>0&&run.steps[i-1]&&(run.steps[i-1].kind==='edit'||run.steps[i-1].kind==='compact');
  const midOf=(s,lab)=>{let x=0;for(const b of s.blocks){if(b[4]===lab)return x+b[0]/2;x+=b[0]}return null};
  // where the spans SCR relocates sit in this call and sat in the call before: [old middle, new middle] in tokens
  const moved=(run,i)=>{const s=run.steps[i],p=run.steps[i-1];let x=0,a=0,b=0,n=0;s.blocks.forEach(bk=>{if(bk[3]){const m=midOf(p,bk[4]);if(m!=null){a+=m;b+=x+bk[0]/2;n++}}x+=bk[0]});return n?[a/n,b/n]:null};
  const E5=4,E6=5; // call 5 (the first edit) and call 6 (the first call after it), 0-based
  function draw(R,k,e){const P=R.P,last=k===0?E5-1:k===1?E5:k<=3?E6:N-1;R.grid(-6.4,4.2,z(0)-.8,z(last)+.8,.5);
    const yb=.55,zA=z(0)-.3,zL=z(last)-z(0)+.6,clmA=k===6?1-Math.min(1,e*2):1,sumA=k===6?Math.max(0,e*2-1):0;
    // the budget as a glass wall, and the 75% trigger on the floor
    const wa=k===0?0:k===1?e:1; // the budget comes in when the context reaches it
    R.glass([X(D.budget),0,zA],[0,0,zL],[0,yb,0],{c:P.bad,a:.55*wa,nu:1,nv:2});
    R.line([[X(D.clm_at*D.budget),.002,zA],[X(D.clm_at*D.budget),.002,zA+zL]],{c:P.mute,w:1.2,dash:[4,4],a:.8*wa});
    R.label([X(D.budget),0,zA+zL],'budget 28,672',{mono:true,fs:12,c:P.bad,dy:14,a:wa});
    R.label([X(D.clm_at*D.budget),0,zA],'75%',{mono:true,fs:12,c:P.mute,dy:-10,wide:1,a:wa});
    R.label([XB,0,zA-.35],'FLOPs',{mono:true,fs:12,c:P.mute,dy:-12,wide:1});
    // the CLM run
    const nShow=k===0?E5:k<=3?(k===1?E5+1:E6+1):RUN.steps.length;
    for(let i=0;i<nShow;i++){let a=1;
      if(k===0)a=cl(e*E5*1.15-i,0,1);
      else if(k===1)a=i===E5?e:.28;
      else if(k===2||k===3)a=i===E6?(k===2?e:1):i===E5?.55:.22;
      else if(k===4||k===5)a=i<=E6?1:cl(k===4?e*(RUN.steps.length-E6)*1.1-(i-E6):1,0,1);
      const scr=(k===3&&i===E6&&e>.5)||k>=5,s=RUN.steps[i];
      row(R,RUN,i,a*clmA,scr,k<=3,k===3&&i===E6?lerp(s.f_std,s.f_scr,e):null)}
    // flows: the cache carrying over between appended calls (step 1)
    if(k===0)for(let i=1;i<E5;i++){const s=RUN.steps[i],a=cl(e*E5*1.15-i,0,1);if(a>.3)R.flow([[X(s.R/2),.09,z(i-1)],[X(s.R/2),.09,z(i)]],{c:P.c1,a,r:.05,n:3,speed:.6})}
    // step 2: the edit command acts on the turns it folds
    if(k===1){const s=RUN.steps[E5],xe=X(s.P+s.G/2);['search 1','search 2','doc 3'].forEach(l=>{const m=midOf(s,l);if(m!=null)R.flowArc([xe,HHI,z(E5)],[X(m),HLO,z(E5)],.5,{c:P.c4,a:e,r:.05,speed:1.2})})}
    // step 3: folded turns become notes in the next call; step 4: SCR moves the kept turn's cache to its new place
    if(k===2||k===3){const s5=RUN.steps[E5],s6=RUN.steps[E6];
      if(k===2)[['search 1','note 1'],['search 2','note 2'],['doc 3','note 3']].forEach(([a0,b0])=>R.flowArc([X(midOf(s5,a0)),HLO,z(E5)],[X(midOf(s6,b0)),HHI,z(E6)],.35,{c:P.c3,a:.9*e,r:.05,speed:1}));
      else{const m=moved(RUN,E6);R.flowArc([X(m[0]),HHI,z(E5)],[X(m[1]),HLO,z(E6)],.45,{c:P.c6,a:e,r:.06,n:9,speed:1.1})}}
    if(k===5)RUN.steps.forEach((s,i)=>{if(post(RUN,i)&&s.reloc){const m=moved(RUN,i);if(m)R.flowArc([X(m[0]),HHI,z(i-1)],[X(m[1]),HLO,z(i)],.25,{c:P.c6,a:.85,r:.045,n:4,speed:.8})}});
    // step 7: the Summary run replaces the CLM rows
    if(sumA>0){for(let i=0;i<SUM.steps.length;i++)row(R,SUM,i,sumA,false,false);
      SUM.steps.forEach((s,i)=>{if(s.kind==='compact')R.flowArc([X(s.P/2),HLO,z(i)],[X(1800+s.G/2),HHI,z(i+1)],.3,{c:P.c4,a:sumA*.8,r:.045,n:4,speed:.8})})}
    // labels: the calls being discussed and the parts of the prompt in the close-up steps
    const lab=(i,t,o)=>R.label([XB-.9,0,z(i)],t,Object.assign({al:'right',mono:true,fs:12,c:P.mute,grp:'rows'},o||{}));
    if(k===0){[0,1,2,3].forEach(i=>lab(i,'call '+(i+1),{a:cl(e*E5*1.15-i,0,1)}));
      R.label([X(900),HLO,z(0)],'task',{fs:12,dy:-10,wide:1});R.label([X(7400+3150),HHI,z(3)],'new: cmd 3 + doc 3',{fs:12,dy:-12,c:P.c3,wide:1,a:e});
      R.label([X(6500),HLO,z(3)],'cached prefix',{fs:12,dy:14,c:P.mute,wide:1,a:e})}
    if(k>=1&&k<=3){lab(E5,'call 5 (edit)');if(k>=2)lab(E6,'call 6')}
    if(k===1){const s=RUN.steps[E5];R.label([X(s.P+s.G/2),HHI,z(E5)],'edit command',{fs:12,dy:-12,c:P.c4,a:e});R.label([X(s.P),0,z(E5)],fmt(s.P)+' tokens',{mono:true,fs:12,dy:16,al:'left',dx:8,a:e,wide:1})}
    if(k===2||k===3){const s=RUN.steps[E6];
      R.label([X(midOf(s,'note 2')),HHI,z(E6)],'notes',{fs:12,dy:-12,c:P.c3,wide:1});
      R.label([X(midOf(s,'search 4')),0,z(E6)],k===3&&e>.5?'turn 4: cache reused':'turn 4: re-prefilled',{fs:12,dy:16,c:k===3&&e>.5?P.c6:P.bad});
      const f=k===3?lerp(s.f_std,s.f_scr,e):s.f_std*e;R.label([XB,f/1e14*HB,z(E6)],(f/1e14).toFixed(2)+' × 10¹⁴',{mono:true,fs:12,dy:-11,b:1,al:'right',dx:-6});
}
    if(k===4||k===5){lab(0,'call 1');lab(RUN.steps.length-1,'call '+RUN.steps.length);
      R.label([X(0),0,z(RUN.steps.length-1)],(k===5?RUN.pflops_scr:RUN.pflops_std).toFixed(2)+' PFLOPs in all',{mono:true,fs:12.5,b:1,dy:30,al:'left',c:k===5?P.c6:P.ink,a:k===4?e:1})}
    if(sumA>0){lab(0,'call 1',{a:sumA});lab(SUM.steps.length-1,'call '+SUM.steps.length,{a:sumA});
      R.label([X(0),0,z(SUM.steps.length-1)],'Summary: '+SUM.pflops_std.toFixed(2)+' PFLOPs',{mono:true,fs:12.5,b:1,dy:30,al:'left',c:P.c4,a:sumA})}
  }
  const full={cam:[.5,.84],bounds:[[-7,0,z(0)-.4],[3.8,1.5,z(N-1)+.4]]};
  const near=(a,b,x1,y)=>({cam:[.5,.72],bounds:[[-7,0,z(a)-.4],[x1,y||1.2,z(b)+.4]]});
  S3.stage({id:'stg-cache',list:'sx-cache',fig:'One trajectory, call by call · illustrative episode, the paper\'s pricing',cam:full.cam,bounds:full.bounds,aspect:.58,
    margin:w=>w<520?[16,10,14,10]:[22,14,18,24],dur:1700,hold:4800,draw,
    view:k=>{const v=k===0?near(0,3,X(20000)):k<=3?near(E5-1,E6,3.7):full,ph=.5;return innerWidth<520?{cam:[v.cam[0]+ph,v.cam[1]],bounds:v.bounds}:v}}); // phones: the camera turned so the long rows run into depth and the blocks are larger
})();
