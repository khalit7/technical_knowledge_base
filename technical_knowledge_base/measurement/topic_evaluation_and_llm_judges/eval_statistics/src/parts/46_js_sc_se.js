// ---- Scene: Fig. 1, a score is an estimate (stg-se, renderer v2) ----
// Qwen2.5-0.5B-Instruct's greedy answers to the 1,311 RACE-H questions of this page's run (window.EST.race). The clouds are 200 seeded bootstrap
// re-draws (with replacement) of 100, 400 and all 1,311 questions from that set, computed here and labelled so; the bands are the formula
// 1.96·√(p(1 − p)/m) at the set's own score p. What the scene computes is published in window.ESS.se for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-se')||!window.S3||!window.ESK)return;const {mix,lerp}=S3,K=ESK,S=EST;
  const g=S.race.g[0],n=g.length,right=g.reduce((s,x)=>s+x,0),p=right/n,ZF=.45+K.D/2,R0=.065;
  const ROWS=[[100,-1.05],[400,-2.65],[n,-4.25]],ZX=-5.5,lo=45,hi=75,SX=v=>-4.2+(v-lo)/(hi-lo)*8.4;
  const rng=S.rng(20261109),clouds=ROWS.map(([m])=>{const v=[];for(let b=0;b<200;b++){let s=0;for(let i=0;i<m;i++)s+=g[(rng()*n)|0];v.push(100*s/m)}return v});
  // the one re-draw shown on its own in step 2 is the first re-draw of 100, recomputed with the same seed so its questions can be lit
  const r1=S.rng(20261109),drawn=new Uint8Array(n);let s1=0;for(let i=0;i<100;i++){const j=(r1()*n)|0;drawn[j]=1;s1+=g[j]}const one=s1;
  const hw=ROWS.map(([m])=>100*S.Z95*Math.sqrt(p*(1-p)/m)),piles=clouds.map(v=>K.pile(v.map(x=>Math.max(lo,Math.min(hi,x))),SX,R0,4));
  window.ESS=window.ESS||{};ESS.se={n,right,p:+(100*p).toFixed(1),one,hw:hw.map(h=>+h.toFixed(h<3?2:1)),boot:clouds.map(v=>+(S.Z95*K.sd(v)).toFixed(2)),distinct:drawn.reduce((s,x)=>s+x,0)};
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-5.4,ZF+K.D/2+.3,.5);
    const cG=mix(P.paper,P.good,.72),cW=mix(P.paper,P.mute,.42),fa=k===0?1:k===1?1:lerp(.55,.22,k===2?e:1);
    // the field: every question, coloured by whether the model got it right; in step 2 the 100 re-drawn ones lift and the rest recede
    for(let i=0;i<n;i++){const q=K.pos[i],pz=[q[0],0,q[2]+ZF],d=drawn[i]&&k>=1,lift=d?(k===1?.14*e:.14):0,a=k===1?(d?1:1-.82*e):d?Math.max(fa,.5):fa;
      K.tile(R,pz,lift,K.TS,g[i]?cG:cW,a)}
    if(k===0){R.label([0,0,ZF+K.D/2+.1],(R.W<520?'':'400 passages · ')+n.toLocaleString('en-US')+' questions · '+right+' right ('+(100*p).toFixed(1)+'%)',{fs:12.5,dy:16,c:P.ink,b:1});
      R.label([-K.W/2-.1,0,ZF],'one passage = one cell',{al:'right',dx:-6,fs:12,c:P.mute,wide:1})}
    if(k>=1){const aa=k===1?e:1;K.axis(R,P,SX,lo,hi,5,ZX,aa,v=>v+'%');
      R.line([[SX(100*p),0,-.3],[SX(100*p),0,ZX]],{c:P.ink,w:1,dash:[4,4],a:aa*.6});R.label([SX(100*p),0,-.3],'the set: '+(100*p).toFixed(1)+'%',{fs:12.5,b:1,c:P.ink,dy:12,a:aa})}
    // step 2: one re-draw of 100 questions flows to its score
    if(k===1){const t=[SX(one),.12,ROWS[0][1]];R.flowArc([0,.2,ZF-K.D/2+.3],t,.6,{c:P.c1,a:.8*e,r:.05});R.ball(t,.07,{c:P.c1,a:e});
      R.label(t,'this re-draw: '+one+'%',{fs:12.5,b:1,c:P.c1,dy:-16,a:e})}
    // steps 3 to 5: 200 re-draws at each size pile up into a cloud; the formula's band sits under it
    ROWS.forEach(([m,z],r)=>{if(k<r+2)return;const cur=k===r+2,t=cur?e:1,aa=k>r+2?.45:1,col=[P.c1,P.c4,P.c5][r],pts=piles[r],nb=Math.round(pts.length*t);
      K.band(R,P,SX,100*p,hw[r],z,col,(cur?Math.min(1,e*1.6):1)*aa,'±'+hw[r].toFixed(hw[r]<3?2:1),SX(hi)+.2);
      for(let b=0;b<nb;b++){const q=pts[b];R.ball([q[0],q[1],z+q[2]],R0,{c:col,a:.9*aa})}
      if(cur)R.flowArc([0,.2,ZF-K.D/2+.3],[SX(100*p),.2,z],.5+.25*r,{c:col,a:.7,r:.05,n:10});
      R.label([SX(lo),0,z],'200 re-draws of '+m.toLocaleString('en-US'),{al:'right',dx:-6,fs:12,c:col,a:Math.max(.6,aa),grp:'cl'})});
  }
  const full={cam:[0,.92],bounds:[[-4.6,0,ZX-.2],[4.9,.6,ZF+K.D/2+.2]]};
  S3.stage({id:'stg-se',list:'sx-se',fig:'Fig. 1 · RACE-H, one model, 1,311 questions',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,40,16,8]:[18,80,18,120],
    view:k=>k===0?{cam:[0,1.05],bounds:[[-K.W/2-.2,0,ZF-K.D/2-.1],[K.W/2+.2,.3,ZF+K.D/2+.4]]}:k>=2?{cam:[0,.85],bounds:[[-4.4,0,ZX-.1],[4.4,.9,.4]]}:full});
})();
