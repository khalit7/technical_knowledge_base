// ---- Scene: Stage 2, SA-MRPO's four steps on one real batch of the toy (renderer v2: one white plinth per group, rewards on it giving way to
// the per-objective advantages as signed bars, the two saturation gauges as glass filled to s, flows from every group into the gauges and back as weights,
// the final advantage with GDPO's on the same batch as outlines) ----
// Data: TOYSTAGE (stage_batch.mjs): the graded-length toy, SA-MRPO γ = 0.5, seed 1, the batch it trained on at step 80, read through the
// engine's onBatch hook; four of its 32 groups, the first of each kind. Saturations, weights and Eq. 1 are over the whole batch of 256 answers.
(function(){
  if(!document.getElementById('stg-batch')||!window.TOYSTAGE)return;const {at,off,lerp,mix}=S3;
  const D=TOYSTAGE,Gs=D.groups,nA=D.G;
  const X=j=>(j-(nA-1)/2)*.82,Z=g=>2.7-g*1.8,YA=.95,AS=.3,RS=.75,XGc=-.95,XGl=.95,ZG=-4.5,HG=1.7;
  const sg=v=>(Math.abs(v)<.005?'0.00':(v>0?'+':'−')+Math.abs(v).toFixed(2));
  // the answer whose sign the reweighting reverses: a correct answer that ran long, in the group where both objectives vary
  const LG=Gs.findIndex(g=>g.kind==='cl'),LJ=Gs[LG].al.indexOf(Math.min(...Gs[LG].al));
  // one white plinth per group; rewards stand on it first, then the advantages that replace them (positive up, negative hanging below)
  function plinth(R,z,a){if(a<=.01)return;R.box([0,YA-.04,z],[X(nA-1)-X(0)+.7,.04,.42],{a,shadow:false});[X(0)-.25,X(nA-1)+.25].forEach(x=>R.box([x,0,z],[.03,YA-.04,.03],{a:a*.7}))}
  function sbar(R,x,z,v,col,a,w){if(a<=.01||Math.abs(v)<1e-6)return;const h=Math.max(.01,Math.abs(v)*AS);
    R.box([x,v>=0?YA:YA-.04-h,z],[w,h,.22],{fill:v>=0?col:mix(R.P.paper,col,.45),a,shadow:false,lw:.6})}
  function draw(R,k,e){const P=R.P;R.grid(-4.2,4.2,-5.2,3.6,.5);
    const tw=k<3?0:k===3?e:1,wc=lerp(1,D.w[0],tw),wl=lerp(1,D.w[1],tw);
    Gs.forEach((g,gi)=>{const z=Z(gi);plinth(R,z,1);
      R.label([X(0)-.4,YA,z],'group '+(gi+1)+' · '+g.name,{al:'right',dx:-6,fs:12,c:P.ink,grp:'rows'});
      // 1. rewards on the plinth: correctness (teal, 0 or 1) and length (orange, graded); 2. they give way to the per-objective advantages
      const ra=k===0?1:k===1?1-e:0;
      if(ra>0)for(let j=0;j<nA;j++){R.box([X(j)-.15,YA,z],[.28,Math.max(.012,g.rc[j]*RS),.22],{fill:P.c3,a:ra,shadow:false,lw:.6});R.box([X(j)+.15,YA,z],[.28,Math.max(.012,g.rl[j]*RS),.22],{fill:P.c2,a:ra,shadow:false,lw:.6})}
      const pa=k===0?0:k===1?e:k===2?.4:k===3?1:lerp(1,.22,e);
      for(let j=0;j<nA;j++){sbar(R,X(j)-.15,z,g.ac[j]*wc,P.c3,pa,.28);sbar(R,X(j)+.15,z,g.al[j]*wl,P.c2,pa,.28)}
      if(gi===LG&&(k===1||k===3)){const v=g.al[LJ]*wl;R.glow([X(LJ)+.15,YA-.04-Math.abs(v)*AS/2,z],.45,{c:P.c2,a:(k===1?e:1)*.5});
        R.label([X(LJ)+.15,YA-.04-Math.abs(v)*AS,z],k===1?'one long answer: loud':'length '+sg(v),{mono:true,fs:12,b:1,dy:13,c:P.c2,a:k===1?e:1})}
      if(k===1&&g.kind==='')R.label([0,YA,z],'silent: no spread',{mono:true,fs:12,dy:-10,c:P.mute,a:e,wide:1});
      // 5. the final advantage (after Eq. 1) in blue, GDPO's on the same batch as an outline beside it
      if(k===4){for(let j=0;j<nA;j++){const v=g.sa[j],u=g.gdpo[j];
          if(Math.abs(u)>1e-6){const h=Math.abs(u)*AS;R.box([X(j)+.2,u>=0?YA:YA-.04-h,z],[.16,h,.16],{fill:P.paper,fa:.12,a:e,shadow:false,lw:1,ec:P.mute})}
          if(Math.abs(v)>1e-6){const h=Math.abs(v)*AS;R.box([X(j)-.06,v>=0?YA:YA-.04-h,z],[.32,h,.26],{fill:v>=0?P.c1:mix(P.paper,P.c1,.45),a:e,shadow:false,lw:.7})}
          if(Math.abs(v)>1e-6)R.flowArc([X(j)-.13,YA+.15,z],[X(j)-.06,YA+.05+Math.max(0,v)*AS,z],.25,{c:P.c1,a:e*.6,r:.04,n:2})}
        if(gi===LG){const v=g.sa[LJ],u=g.gdpo[LJ];R.glow([X(LJ),YA,z],.55,{c:P.c1,a:e*.45});R.label([X(LJ),YA+Math.max(0,v)*AS,z],sg(v)+' (GDPO '+sg(u)+')',{mono:true,fs:12,b:1,al:'left',dx:-6,dy:-14,c:P.c1,a:e})}}
    });
    // 3. the saturation gauges: every group's rewards flow in (the whole batch's mean, over all 256 answers); 4. the weights flow back out
    if(k>=2){const ga=k===2?e:1;
      [[XGc,D.s[0],D.w[0],P.c3,'correctness'],[XGl,D.s[1],D.w[1],P.c2,'length']].forEach(([x,s,w,c,nm])=>{const z=ZG;
        R.glass([x-.35,0,z],[.7,0,0],[0,HG,0],{c,a:ga*.9,nu:2,nv:10});R.box([x,0,z+.02],[.58,Math.max(.02,s*HG*(k===2?e:1)),.14],{fill:c,a:ga*.85,shadow:false});
        R.label([x,HG,z],nm,{fs:12.5,b:1,dy:-26,c,a:ga,wide:1});R.label([x,HG,z],'s = '+s.toFixed(2),{mono:true,fs:12,dy:-10,c,a:ga});
        if(k>=3)R.label([x+(x<0?-.4:.4),HG*.55,z],'w = '+w.toFixed(2),{al:x<0?'right':'left',dx:x<0?-6:6,mono:true,fs:12.5,b:1,c,a:k===3?e:1})});
      if(k===2)Gs.forEach((g,gi)=>{R.flowArc([XGc*1.8,YA+.1,Z(gi)],[XGc,HG*.85,ZG],.4,{c:P.c3,a:e*.7,r:.055,n:5});R.flowArc([XGl*1.8,YA+.1,Z(gi)],[XGl,HG*.85,ZG],.4,{c:P.c2,a:e*.7,r:.055,n:5})});
      if(k===3)Gs.forEach((g,gi)=>{R.flowArc([XGc,HG,ZG],[XGc*1.8,YA+.15,Z(gi)],.35,{c:P.c3,a:e*.75,r:.055,n:Math.round(2+4*D.w[0])});R.flowArc([XGl,HG,ZG],[XGl*1.8,YA+.15,Z(gi)],.35,{c:P.c2,a:e*.75,r:.055,n:Math.round(2+4*D.w[1])})})}
  }
  const full={cam:[.12,.72],bounds:[[-3.7,0,-4.8],[3.7,1.9,3.1]]};
  S3.stage({id:'stg-batch',list:'sx-batch',fig:'Stage 2 · the four steps on one batch of the toy',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1400,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,14,210],
    // step 2 moves in on the first three groups (where each reward speaks or is silent); the other steps show the whole batch and the gauges
    view:k=>k===1?{cam:[.12,.66],bounds:[[-3.7,0,-1.6],[3.6,1.9,3.1]]}:full});
})();
