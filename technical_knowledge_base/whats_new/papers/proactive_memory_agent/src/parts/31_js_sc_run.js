// ---- Scene: one released run with the memory agent beside it (renderer v2: glass plates, flowing dots, camera per step) ----
// Driven by the page's own trace data (window.TRACES from mk_traces.py, the five example runs released with the paper) and recompute.py
// (PAPER.rc: characters per token, per-run and five-run totals). Columns are turns, left to right. Back lane: the action agent's prompt
// at each turn, as logged. Middle row: Phase 2 at the memory step that ran just before that turn (a coloured tile when it reminded, coloured
// by this page's label; grey when it returned the no-op). Front lane: the memory bank after Phase 1 (knowledge entries teal, procedural gold).
// Step 6 adds, in front, the memory agent's own input per step, estimated (two phases, each sent the bank and the window). Step 7 switches to the
// git-multibranch run. window.PMRUN exposes what the scene draws, for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-run'))return;const {at,off,lerp,mix,cl}=S3;
  const TR=window.TRACES,RCP=PAPER.rc,CPT=RCP.chars_per_token.median,A='sqlite-with-gcov',B='git-multibranch',FOC=3,WIN=8;
  function prep(name){const T=TR[name],N=T.m.length,W=10.8,dx=W/N,maxA=Math.max(...T.m.map(r=>r[0]));
    return {name,T,N,dx,x:i=>-W/2+dx*(i+.5),sc:3.0/maxA,maxA,trig:T.t,inj:T.t.filter(t=>t.i).length,
      memIn:T.t.map(t=>2*t.q/CPT),bankMax:Math.max(...T.t.map(t=>t.k+t.p)),pMax:Math.max(...T.t.map(t=>t.p))}}
  // lanes in depth: the bank in front (short stacks), Phase 2 in the middle, the actor's taller bars behind
  const SA=prep(A),SB=prep(B),ZA=-.9,ZP=0,ZM=.9,ZI=2.1,SL=.075;
  const LC=P=>({recall:P.c3,diagnose:P.c2,check:P.c4});
  const f3=SA.trig[FOC],b3=SA.trig[FOC-1],R3=RCP.traces[A],TT=RCP.traces_total;
  const labs=S=>{const c={recall:0,diagnose:0,check:0};S.trig.forEach(t=>{if(t.i)c[t.l]++});return c};
  window.PMRUN={steps:7,task:A,turns:SA.N,first:SA.T.m[0][0],max:SA.maxA,triggers:SA.trig.length,inject:SA.inj,labels:labs(SA),
    remindTurns:SA.trig.filter(t=>t.i).map(t=>t.s+1),bankMax:SA.bankMax,
    focus:{turn:FOC+1,prompt:SA.T.m[FOC][0],before:[b3.k,b3.p],after:[f3.k,f3.p],ops:f3.o.map(o=>o[0]),chars:f3.n,tokens:Math.round(f3.n/CPT),label:f3.l,window:Math.min(WIN,FOC)},
    memIn:Math.round(SA.memIn.reduce((a,b)=>a+b,0)),memInRc:Math.round(R3.mem_in_est),actorIn:R3.mem_prompt,
    other:{task:B,turns:SB.N,triggers:SB.trig.length,inject:SB.inj,pMax:SB.pMax,cleared:SB.trig.findIndex((t,i)=>i>0&&t.p===0&&SB.trig[i-1].p>=SB.pMax)+1},
    total:{triggers:TT.triggers,inject:TT.inject,recall:TT.lab_recall,diagnose:TT.lab_diagnose,check:TT.lab_check,ratio:TT.mem_over_act_in,cost:TT.cost_ratio,share:TT.mem_share_cost},cpt:CPT};
  // one run's lanes; a: overall alpha; kk: what to show (see draw)
  function lanes(R,S,o){const P=R.P,a=o.a;if(a<=.01)return;const L=LC(P),w=S.dx*.62;
    // the action agent's prompts
    S.T.m.forEach((r,i)=>{const g=o.grow==null?1:cl(o.grow*S.N-i,0,1);if(g<=0)return;const h=Math.max(.02,r[0]*S.sc*g),ai=a*(o.actA?o.actA(i):1);
      R.box([S.x(i),0,ZA],[w,h,.55],{fill:mix(P.paper,P.c1,o.hiA&&o.hiA(i)?.75:.5),a:ai,shadow:S.N<20})});
    // memory steps up to o.upto (fractional while a stretch plays)
    S.trig.forEach((t,j)=>{const s=t.s,g=o.upto==null?0:cl((o.upto-j)*1.5,0,1);if(g<=0)return;const xs=S.x(s),am=a*g*(o.memA?o.memA(j):1);
      const kk=o.bank&&o.bank(j)?o.bank(j):[t.k,t.p];let y=0;
      for(let q=0;q<kk[0]+kk[1];q++){R.box([xs,y,ZM],[w,SL*.86,.5],{fill:mix(P.paper,q<kk[0]?P.c6:P.c5,.62),a:am,shadow:q===0&&S.N<20});y+=SL}
      const p2=typeof o.phase2==='function'?o.phase2(j):o.phase2!==false;
      if(p2){if(t.i){R.box([xs,0,ZP],[w*.9,.05,.36],{fill:L[t.l],a:am,shadow:false});
          const top=S.T.m[s]?S.T.m[s][0]*S.sc:0,cap=Math.max(.045,t.n/CPT*S.sc);R.box([xs,top,ZA],[w,cap,.55],{fill:L[t.l],a:am,shadow:false})}
        else R.box([xs,0,ZP],[w*.9,.02,.36],{fill:mix(P.paper,P.mute,.45),a:am*.8,shadow:false})}
      if(o.flowAt&&o.flowAt(j)){const top=S.T.m[s]?S.T.m[s][0]*S.sc:0;R.flowArc([xs,y+.02,ZM],[xs,top+.06,ZA],.45+top*.15,{c:L[t.l]||P.mute,a:am*o.flowAt(j),r:.06,n:6,speed:1.1})}
      if(o.inp){const h=S.memIn[j]*S.sc*o.inp;R.box([xs,0,ZI],[w,Math.max(.01,h),.5],{fill:mix(P.paper,P.c4,.45),fa:.4,a:a,shadow:false});
        if(j%2===0&&o.inp>.3){const s0=Math.max(0,s-WIN);R.flowArc([S.x(Math.max(s0,s-1)),.1,ZA],[xs,.1,ZI],.5,{c:P.c4,a:a*.35,r:.04,n:3,speed:1.2})}}});
    if(o.lab){R.label([S.x(0)-S.dx*.8,.15,ZA],'actor · Sonnet 4.5 · prompt',{al:'right',dx:-6,mono:true,fs:12,c:P.c1,a,grp:'lane'});
      R.label([S.x(0)-S.dx*.8,.05,ZP],'Phase 2 · remind or no-op',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a,grp:'lane'});
      R.label([S.x(0)-S.dx*.8,.15,ZM],'memory agent · Opus 4.6 · bank',{al:'right',dx:-6,mono:true,fs:12,c:P.ink,a,grp:'lane'})}}
  function draw(R,k,e){const P=R.P,S=SA,L=LC(P),xF=S.x(FOC);R.grid(-7,6.5,-1.8,2.8,.5);
    if(k===0){lanes(R,S,{a:1,grow:e,lab:1,upto:-1});
      R.label([S.x(S.N-1),SA.maxA*S.sc*e,ZA],'turn '+S.N+' · '+fmt(SA.maxA)+' tokens',{mono:true,fs:12,dy:-12,c:P.c1,a:e});return}
    if(k<=3){// the close-up on memory step 4 (before turn 4)
      const s0=Math.max(0,FOC-WIN),inWin=i=>i>=s0&&i<FOC;
      // memory steps 1 to 4 drawn, the earlier ones faint; this step's bank is the one before Phase 1 until the new entry drops in (step 3), its Phase 2 shows from step 4
      lanes(R,S,{a:1,lab:1,upto:FOC+1,actA:i=>i===FOC||inWin(i)?1:.22,hiA:i=>k===1?inWin(i):k===2?i===FOC-1:i===FOC,memA:j=>j===FOC?1:.25,
        bank:j=>j===FOC&&k<=2?[b3.k,b3.p]:null,phase2:j=>j!==FOC||k===3,flowAt:j=>j===FOC&&k===3?1:0});
      if(k===1){R.glass([S.x(s0)-S.dx/2,.012,ZA-.36],[S.dx*(FOC-s0),0,0],[0,0,.72],{c:P.c1,a:e,nu:FOC-s0,nv:1});
        for(let i=s0;i<FOC;i++)R.flowArc([S.x(i),S.T.m[i][0]*S.sc+.05,ZA],[xF,(b3.k+b3.p)*SL+.05,ZM],.55+.08*(FOC-i),{c:P.c1,a:e,r:.06,n:6,speed:1.2});
        const TK=[S.x(1),0,ZM+1.1];R.box(TK,[.8,.3,.5],{fill:mix(P.paper,P.c6,.3),a:e});R.label(TK,'task',{mono:true,fs:12,dy:14,c:P.ink,a:e});
        R.flowArc([TK[0],.31,TK[2]],[xF,(b3.k+b3.p)*SL+.05,ZM],.5,{c:P.c6,a:e,r:.06,n:7,speed:1.2});
        R.label([S.x(FOC-1),.1,ZA+.35],'window · turns 1 to '+FOC,{mono:true,fs:12,dy:16,c:P.c1,a:e,wide:1});
        R.label([xF,(b3.k+b3.p)*SL,ZM],'bank · '+b3.k+' knowledge, '+b3.p+' procedural',{al:'left',dx:10,mono:true,fs:12,b:1,c:P.ink,a:e})}
      if(k===2){const top=(f3.k+f3.p)*SL,drop=lerp(.9,0,e);R.box([xF,top-SL+drop,ZM],[S.dx*.62,SL*.86,.5],{fill:P.c5,a:1,shadow:false});R.glow([xF,top+drop,ZM],.35,{c:P.c5,a:.6});
        R.glass([xF-.45,top+.32,ZM-.3],[.9,0,0],[0,0,.6],{c:P.mute,a:e,nu:2,nv:2});R.label([xF+.45,top+.32,ZM],'status · private',{al:'left',dx:8,mono:true,fs:12,c:P.mute,a:e});
        R.label([xF,top,ZM],'+ procedural: gcov comes with gcc',{al:'left',dx:10,dy:14,mono:true,fs:12,b:1,c:P.ink,a:e});
        R.label([S.x(FOC-1),S.T.m[FOC-1][0]*S.sc+.3,ZA],'turn 3 · E: Unable to locate package gcov',{mono:true,fs:12,dy:-14,c:P.ink,a:e,wide:1})}
      if(k===3){const top=S.T.m[FOC][0]*S.sc,cap=Math.max(.045,f3.n/CPT*S.sc);R.glow([xF,top+cap,ZA],.35,{c:L[f3.l],a:.7*e});
        R.label([xF,top+cap,ZA],'turn 4 · '+fmt(S.T.m[FOC][0])+' + '+Math.round(f3.n/CPT)+' tokens',{mono:true,fs:12.5,b:1,dy:-14,c:L[f3.l],a:e});
}
      return}
    if(k===4){const up=lerp(FOC+1,S.trig.length,e)-.001;
      lanes(R,S,{a:1,lab:1,upto:up,flowAt:j=>S.trig[j].i&&up-j>0&&up-j<2.5?1:0});
      R.label([S.x(S.N-1)+S.dx*.4,0,ZM+.4],Math.min(S.inj,S.trig.filter((t,j)=>t.i&&j<=up).length)+' of '+Math.min(S.trig.length,Math.ceil(up))+' spoke',{al:'right',dy:18,mono:true,fs:12.5,b:1,c:P.ink});return}
    if(k===5){lanes(R,S,{a:1,lab:1,upto:99,memA:()=>.35,inp:e});
      R.label([S.x(0)-S.dx*.8,.15,ZI],'its input per step · estimated',{al:'right',dx:-6,mono:true,fs:12,c:P.c4,grp:'lane'});
      R.label([S.x(S.N-1)+S.dx/2,.3,ZI],'≈ '+Math.round(PMRUN.memIn/1000)+'k tokens',{al:'left',dx:8,mono:true,fs:12.5,b:1,c:P.c4,a:e});
      R.label([S.x(S.N-1)+S.dx/2,.3,ZA],fmt(Math.round(PMRUN.actorIn/1000))+'k tokens',{al:'left',dx:8,mono:true,fs:12.5,b:1,c:P.c1,a:e});return}
    // k===6: the whole picture changes, so the first run fades out fully before the second appears
    const fo=cl(1-2*e,0,1),fi=cl(2*e-1,0,1);
    if(fo>0)lanes(R,S,{a:fo,lab:1,upto:99});
    if(fi>0){lanes(R,SB,{a:fi,lab:1,upto:99*fi,grow:1});
      R.label([SB.x(SB.N-1)+SB.dx*.4,0,ZM+.4],SB.inj+' of '+SB.trig.length+' spoke',{al:'right',dy:18,mono:true,fs:12.5,b:1,c:P.ink,a:fi});
      R.label([SB.x(SB.N-1),SB.maxA*SB.sc,ZA],B+' · turn '+SB.N,{mono:true,fs:12,dy:-12,c:P.c1,a:fi});
      const c=PMRUN.other.cleared-1;R.label([SB.x(SB.trig[c-1].s),SB.pMax*SL+SB.trig[c-1].k*SL,ZM],SB.pMax+' procedural, then deleted',{mono:true,fs:12,dy:-10,c:P.c5,a:fi})}}
  // on a phone the camera looks further down, so the lanes spread over the card's height instead of a thin band
  const nar=()=>innerWidth<520,full=()=>({cam:[.1,nar()?.66:.45],bounds:[[-6.2,0,-1.3],[5.8,3.1,1.3]]});
  S3.stage({id:'stg-run',list:'sx-run',fig:'3D · one released run, sqlite-with-gcov',cam:full().cam,bounds:full().bounds,aspect:.42,dur:1500,hold:5200,draw,
    margin:w=>w<520?[16,8,16,8]:[22,16,18,190],
    // steps 2 to 4 move in close on memory step 4 (before turn 4); step 6 looks further down to take in the front lane it adds
    view:k=>k>=1&&k<=3?{cam:[.22,.5],bounds:[[-6.7,0,-1.2],[SA.x(FOC)+2.4,1.2,2.2]]}:k===5?{cam:[.1,.6],bounds:[[-6.2,0,-1.3],[5.8,3.1,2.5]]}:full(),
    onStep:k=>{const f=document.querySelector('#stg-run .stg-top span');if(f)f.textContent=k===6?'3D · a second released run, git-multibranch':'3D · one released run, sqlite-with-gcov'}});
})();
