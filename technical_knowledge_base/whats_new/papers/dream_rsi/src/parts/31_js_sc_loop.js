// ---- Scene (hero, Fig. 1): the Dream-RSI loop on the page's own replay simulator (renderer v2: bar fields, glass, flows, camera per step) ----
// Every number is computed here by SIM (14_js_simcore.js) on the page's default illustrative history: worlds with seeds 1, 2 and 3 (the
// Dream tab's default), the released λ = 0.05, W = 10. A world is a 10 branches × 11 attempts grid; a bar is one attempt, its height the
// recorded score (0 to 1, invented units), red a failed attempt. The "rewrites" are three settings of the toy's policy family standing in for
// the development agent's three rewrites; the winner is the dream sweep's winner over all 505 candidates. window.LOOPDATA exposes the numbers
// the step list states, so src/check_stages.mjs can compare them.
(function(){
  if(!document.getElementById('stg-loop')||typeof SIM==='undefined')return;const {at,off,mix}=S3;
  const LAM=.05,W=10,hist=[1,2,3].map(s=>SIM.world(s)),fresh=SIM.world(4);
  const res=SIM.dream(hist,{v:2,lam:LAM},W),win=SIM.pick(res),find=p=>res.find(r=>SIM.same(r.pol,p));
  const VER=[['current: fixed',SIM.FIXED],['rewrite a',{w:4,p:3,k:0,refill:true}],['rewrite b',{w:2,p:2,k:0,refill:true}],['rewrite c',win.pol]].map(([n,p])=>({n,V:find(p).V,win:SIM.same(p,win.pol)}));
  const rep=SIM.replay(hist[0],SIM.sched(win.pol,1),W),onl=SIM.replay(fresh,SIM.sched(win.pol,1),W);
  const cellOf=(wd,v)=>{let o=null;wd.s.forEach((r,b)=>r.forEach((x,j)=>{if(x===v&&!o)o=[b,j]}));return o};
  const bestCell=cellOf(hist[0],hist[0].best),repCell=cellOf(hist[0],rep.best);
  window.LOOPDATA={rep:{N:rep.N,k:rep.k,share:rep.best/hist[0].best,best:rep.best,recBest:hist[0].best,bestCell,repCell},onl:{N:onl.N,k:onl.k,share:onl.best/fresh.best},
    V:VER.map(v=>+v.V.toFixed(3)),winner:SIM.label(win.pol)};
  // layout: worlds side by side, branches across, attempts into the depth (attempt 1 in front, next to the root)
  const XW=[-6,-2,2,6],C=.34,bx=(X,b)=>X+(b-4.5)*C,bz=j=>1.7-j*C,hgt=v=>.04+1.2*v,AG=[0,0,-3.7],PL=[-6,0,-2.75];
  const fill=(P,v)=>v==null?P.bad:mix(P.paper,P.c1,.15+.85*v);
  function cell(R,X,wd,b,j,a,o){o=o||{};const v=wd.s[b][j],P=R.P,h=v==null?.03:hgt(v);
    R.box([bx(X,b),0,bz(j)],[.26,h,.26],{fill:o.fill||fill(P,v),a,shadow:false,lw:.6,ea:o.ea});return h}
  function plate(R,X,a,lab,o){const P=R.P;R.box([X,0,0],[3.62,.015,3.95],{fill:mix(P.paper,P.ink,.035),a,shadow:false,ea:.3});
    R.box([X,0,2.25],[.3,.12,.22],{fill:mix(P.paper,P.ink,.55),a,shadow:false});
    if(lab)R.label([X,0,2.55],lab,Object.assign({mono:true,fs:12,dy:14,c:P.mute,a:Math.max(a,.5)},o||{}))}
  // a full recorded world, its rows rising to row r (r = 11: all)
  function world(R,X,wd,a,r){for(let b=0;b<10;b++)for(let j=0;j<11;j++){const u=Math.max(0,Math.min(1,r-j));if(u>0)cell(R,X,wd,b,j,a*u)}}
  // a replay (or online run) as far as round kr: revealed cells solid, the rest ghosted (replay) or bare floor (online)
  function run(R,X,wd,T,kr,a,ghost){const seen={};T.rounds.forEach((Rd,i)=>{if(i<=kr)Rd.batch.forEach(([b,j])=>{seen[b+','+j]=i})});
    for(let b=0;b<10;b++)for(let j=0;j<11;j++){const i=seen[b+','+j];if(i!=null)cell(R,X,wd,b,j,a);else if(ghost)cell(R,X,wd,b,j,a*.13,{ea:.25})}
    return T.rounds[Math.max(0,Math.min(kr,T.rounds.length-1))]}
  const rnd=(T,e)=>Math.min(T.rounds.length-1,Math.floor(e*T.rounds.length));
  function batchFlows(R,X,T,kr,from,c,a,r,n){const Rd=T.rounds[kr];if(!Rd)return;Rd.batch.forEach(([b,j])=>R.flowArc(from,[bx(X,b),.35,bz(j)],.7,{c,a,r:r||.055,n:n||5,speed:1.5}))}
  function draw(R,k,e){const P=R.P;R.grid(-9,9,-4.6,4.6,.5);
    const agA=k===0||k===5?1:.3;R.box(AG,[1.3,.55,.7],{fill:mix(P.paper,P.c2,.3),a:agA});
    R.label([AG[0],.55,AG[2]],'coding agent + evaluator',{mono:true,fs:12,dy:-12,c:P.c2,a:agA<1?0:1,b:1});
    // 1. the online round: the starting policy grows world 1 row by row, every attempt a paid call
    if(k===0){const r=e*11;plate(R,XW[0],1,'world 1 · root in front');world(R,XW[0],hist[0],1,r);
      const row=Math.min(10,Math.floor(r));R.flowArc([AG[0]-.3,.55,AG[2]],[XW[0],.45,bz(row)],1.1,{c:P.c2,a:Math.min(1,e*3),r:.06,n:10,speed:1.6});
      R.label([XW[0],1.45,0],Math.min(110,Math.round(e*110))+' calls paid · 10 × 11',{mono:true,fs:13,b:1,c:P.ink})}
    // 2. the history: three recorded worlds
    if(k===1){[0,1,2].forEach(i=>{const a=i===0?1:e;plate(R,XW[i],a,'world '+(i+1),{grp:'w'});world(R,XW[i],hist[i],a,11)});
      R.label([XW[1],2.5,-.5],'history ℋ: 3 recorded worlds, 330 attempts',{mono:true,fs:13,b:1,c:P.ink,a:e})}
    // 3 and 4. dreaming on world 1: the winner's replay reveals only what it asks for; the other worlds wait
    if(k===2||k===3){[1,2].forEach(i=>{plate(R,XW[i],.3);world(R,XW[i],hist[i],.22,11)});plate(R,XW[0],1);
      const kr=k===2?rnd(rep,e):rep.rounds.length-1,Rd=run(R,XW[0],hist[0],rep,kr,1,true);
      const ga=k===2?Math.min(1,e*2):1;R.glass([PL[0]-1.1,.15,PL[2]],[2.2,0,0],[0,1.15,0],{c:P.c4,a:ga*(k===3?.45:1),nu:6,nv:4});
      R.label([PL[0],1.3,PL[2]],'policy code π (a rewrite)',{mono:true,fs:12,dy:-10,c:P.c4,a:ga*(k===3?.5:1)});
      if(k===2){batchFlows(R,XW[0],rep,kr,[PL[0],.75,PL[2]+.05],P.c4,ga,.075,7);
        R.label([XW[0],1.6,.4],Rd.N+' of 110 cells read · 0 calls',{mono:true,fs:13,b:1,c:P.ink})}
      if(k===3){const [b0,j0]=bestCell,[b1,j1]=repCell,hb=hgt(hist[0].best);
        R.glass([XW[0]-1.8,hb,-1.95],[3.6,0,0],[0,0,3.9],{c:P.c5,a:.5*e,nu:10,nv:11});
        cell(R,XW[0],hist[0],b0,j0,1,{fill:P.c5});R.glow([bx(XW[0],b0),hb,bz(j0)],.45,{c:P.c5,a:e});
        R.glow([bx(XW[0],b1),hgt(rep.best),bz(j1)],.4,{c:P.c1,a:e});
        R.label([bx(XW[0],b0),hb,bz(j0)],'recorded best '+(hist[0].best*100).toFixed(1)+' · the ceiling',{mono:true,fs:12.5,b:1,dy:-16,c:P.c5,a:e,al:'right'});
        R.label([bx(XW[0],b1),hgt(rep.best),bz(j1)],'replay best '+(rep.best*100).toFixed(1)+' = '+Math.round(100*rep.best/hist[0].best)+'%',{mono:true,fs:12.5,b:1,dy:18,c:P.c1,a:e,al:'left'})}}
    // 5. selection: every version replayed on every world at five budget preferences; one signed bar of average score per version
    if(k===4){[0,1,2].forEach(i=>{plate(R,XW[i],.35);world(R,XW[i],hist[i],.3,11)});
      const vmax=Math.max(...VER.map(v=>Math.abs(v.V))),ZP=3.35;
      VER.forEach((v,i)=>{const x=-6.6+2.6*i,y=.32,h=Math.max(.02,Math.abs(v.V)/vmax*1.25*e),c=v.win?P.good:v.V<0?P.bad:mix(P.paper,P.c1,.55);
        R.box([x,y-.05,ZP],[1.1,.05,.5],{shadow:false});[-1,1].forEach(sx=>R.box([x+sx*.5,0,ZP],[.04,y-.05,.04],{}));
        R.box([x,v.V>=0?y:y-.05-h,ZP],[.5,h,.3],{fill:c,shadow:false});
        if(v.win)R.glow([x,y+h,ZP],.55,{c:P.good,a:e});
        R.label([x,0,ZP+.3],v.n,{mono:true,fs:12,dy:14,c:v.win?P.good:P.mute,b:v.win});
        R.label([x,v.V>=0?y+h:y,ZP],(v.V<0?'−':'')+Math.abs(v.V).toFixed(3),{mono:true,fs:12.5,b:1,dy:-12-(i%2)*15,c:v.win?P.good:P.ink,a:Math.min(1,e*1.5)});
        [0,1,2].forEach(w=>R.flowArc([XW[w],.5,1.2],[x,y+.1,ZP],.6,{c:P.c4,a:.45*Math.min(1,e*2),r:.045,n:3,speed:1.2}))});
      R.label([-2.7,2.6,0],'V on the history (Eq. 1, v2): keep the best',{mono:true,fs:13,b:1,c:P.ink,a:e,wide:1})}
    // 6. redeploy: the winner runs the next online round on a new world; only what it asks for is generated and paid
    if(k===5){[0,1,2].forEach(i=>{plate(R,XW[i],.3);world(R,XW[i],hist[i],.25,11)});plate(R,XW[3],1,'world 4 · new');
      const kr=rnd(onl,e),Rd=run(R,XW[3],fresh,onl,kr,1,false);
      for(let b=0;b<10;b++)for(let j=0;j<11;j++)R.box([bx(XW[3],b),0,bz(j)],[.26,.006,.26],{fill:mix(P.paper,P.ink,.06),a:.6,shadow:false,ea:.15});
      batchFlows(R,XW[3],onl,kr,[AG[0]+.3,.55,AG[2]],P.c2,1);
      R.label([XW[3],1.75,.4],Rd.N+' calls · '+Math.round(100*Rd.best/fresh.best)+'% of its best',{mono:true,fs:13,b:1,c:P.ink});
      R.label([XW[1],1.25,0],'history → 4 worlds, next round',{mono:true,fs:12,c:P.mute,a:e,wide:1})}
  }
  const full={cam:[.3,.62],bounds:[[-8.2,0,-4],[4.2,1.5,2.7]]};
  S3.stage({id:'stg-loop',list:'sx-loop',fig:'Fig. 1 · the loop on this page\'s simulator · worlds illustrative',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[18,14,14,14],
    view:k=>k===0?{cam:[.42,.58],bounds:[[-8,0,-4],[.8,1.5,2.6]]}:k===2||k===3?{cam:[.36,.6],bounds:[[-8.3,0,-3.1],[-3.7,1.6,2.6]]}:k===4?{cam:[.3,.6],bounds:[[-8.2,0,-2.2],[4,1.7,3.9]]}:k===5?{cam:[.24,.6],bounds:[[-8,0,-4],[8,1.5,2.7]]}:full});
})();
