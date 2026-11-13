// ---- Scene: Evolution, what the creator saw against what it never saw (renderer v2: score bars, the noise band as a grey glass slab, flowing task runs, signed gains on plinths) ----
// Steps 1 to 3: the Qwen 3.7 Max self-runtime lineage version by version, its feedback pair and held-out-630 scores as this page decoded them
// from Figures 7 and 8 (window.PAPER.rc.derived.lineages). Steps 4 to 6: all nine lineages, declared version minus H0 on the feedback pair and on
// held-out-630, and the best held-out version (Table 6 as printed: fbgain, hogain, gap). window.HDEVO exposes the numbers for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-evo'))return;const {at,off,lerp,mix}=S3;
  const LIN=window.PAPER.rc.derived.lineages,T6=window.PAPER.tables.T6.rows,NOISE=4.75;
  const Q=LIN.find(l=>l.setting==='Self'&&/^Qwen/.test(l.creator)),n=Q.n;
  const short=c=>c.replace(' 3.1 Pro','').replace(' V4 Pro','').replace(' 3.7 Max','').replace(' 4.8','');
  const G=T6.map(r=>({self:r.setting==='Self',name:short(r.creator),fb:parseFloat(r.fbgain),ho:parseFloat(r.hogain),gap:r.gap,fbp:r.fbgain,hop:r.hogain.replace('-','−')}));
  const t6q=T6.find(r=>r.setting==='Self'&&/^Qwen/.test(r.creator));
  window.HDEVO={lineage:{creator:Q.creator,n,declared:Q.declared,best_ho:Q.best_ho,pair:Q.pair,ho:Q.ho,ho630:Q.ho630},qwen:t6q,gains:G,
    inside:G.filter(g=>Math.abs(g.fb)<=NOISE).length,bestIsDeclared:G.filter(g=>g.gap===0).length,selfMeanHo:G.filter(g=>g.self).reduce((a,g)=>a+g.ho,0)/5};
  // one lineage: versions along x, the feedback pair in front (blue), held-out-630 behind (orange)
  const VX=i=>(i-(n-1)/2)*.9,HV=2.6/100,ZF=.25,ZH=-.3,FB=[0,0,1.85],HO=[0,0,-1.95];
  // nine lineages: self-runtime on the left, fixed-Gemini on the right; signed gains on plinths at height YP
  const GX=j=>-3.9+j*.92+(j>=5?.55:0),YP=.9,SG=.075;
  function src(R,p,text,c,a){R.box(p,[2.6,.14,.5],{fill:mix(R.P.paper,c,.35),a});const back=p[2]<0;R.label([p[0]+(back?1.35:-1.35),.07,p[2]],text,{al:back?'left':'right',dx:back?8:-8,mono:true,fs:12,c,a,wide:1})}
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-4.8,5,-2.6,2.6,.5);
    // steps 1 to 3 fade out completely during the first half of step 4, then the nine lineages arrive
    const la=k<=2?1:k===3?Math.max(0,1-2*e):0,ga=k<3?0:k===3?Math.max(0,2*e-1):1;
    if(la>.01){
      src(R,FB,'100 SWE-Pro + 89 Terminal tasks',P.c1,la*(k===0?1:.45));
      const h0=Q.pair[0];R.box([0,(h0-NOISE)*HV,ZF],[n*.9+.2,2*NOISE*HV,.5],{fill:P.mute,fa:.18,ea:.35,shadow:false,a:la});
      if(k===0)R.label([VX(0)-.55,h0*HV,ZF],'H0 ± 4.75',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:e,wide:1});
      for(let i=0;i<n;i++){const g=k===0?Math.min(1,Math.max(0,e*(n+1)-i)):1,dec=i===Q.declared,foc=k===0?1:k===1?(dec?1:.35):1;
        const hv=Q.pair[i]*HV*g;if(g>.01)R.box([VX(i),0,ZF],[.36,Math.max(.02,hv),.36],{fill:mix(P.paper,P.c1,dec&&k>=1?.75:.5),a:la*foc});
        if(k===0&&g>0&&g<1)R.flowArc([FB[0]+(i-(n-1)/2)*.2,.14,FB[2]],[VX(i),hv,ZF],.5,{c:P.c1,a:la,r:.05,n:4,speed:1.6});
        R.label([VX(i),0,.55],'H'+i,{mono:true,fs:12,dy:12,c:dec&&k>=1?P.c1:P.mute,b:dec&&k>=1,a:la});
        if(k===1&&dec){R.glow([VX(i),hv+.05,ZF],.45,{c:P.c1,a:.6*e});R.label([VX(i),hv,ZF],'declared · '+t6q.fbgain,{mono:true,fs:12.5,b:1,dy:-14,c:P.c1,a:e})}
        // held-out-630, behind, from step 3
        const ha=k===2?Math.min(1,Math.max(0,e*(n+1)-i)):k>2?1:0;
        if(ha>.01){const hh=Q.ho[i]*HV*ha,best=i===Q.best_ho;R.box([VX(i),0,ZH],[.36,Math.max(.02,hh),.36],{fill:mix(P.paper,P.c2,best||dec||i===3?.75:.45),a:la});
          if(k===2&&ha>0&&ha<1)R.flowArc([HO[0]+(i-(n-1)/2)*.2,.14,HO[2]],[VX(i),hh,ZH],.5,{c:P.c2,a:la,r:.05,n:4,speed:1.6});
          if(k===2&&ha>=1){if(dec)R.label([VX(i),hh,ZH],t6q.hogain,{mono:true,fs:12,b:1,dy:-30,c:P.c2,a:e});
            if(i===3)R.label([VX(i),hh,ZH],Q.ho630[i]+'/630',{mono:true,fs:12,b:1,dy:-12,c:P.bad,a:e});
            if(best){R.glow([VX(i),hh+.05,ZH],.4,{c:P.c2,a:.6*e});R.label([VX(i),hh,ZH],'best',{mono:true,fs:12,b:1,dy:-12,c:P.c2,a:e})}}}}
      if(k>=2)src(R,HO,'630 held-out SWE-Pro, never shown',P.c2,la*(k===2?1:.45));
      R.label([VX(0)-.4,1.55,ZF],'Qwen 3.7 Max, its own runtime',{al:'left',mono:true,fs:12.5,b:1,c:P.ink,a:la,wide:1})}
    if(ga>.01){
      // the noise band around zero gain, and the two sources
      R.box([(GX(0)+GX(8))/2,YP-NOISE*SG,0],[GX(8)-GX(0)+1.0,2*NOISE*SG,1.0],{fill:P.mute,fa:.16,ea:.3,shadow:false,a:ga});
      src(R,FB,'feedback pair',P.c1,ga*(k===3?1:.4));if(k>=4)src(R,HO,'held-out-630',P.c2,ga*(k===4?1:.4));
      G.forEach((g,j)=>{const x=GX(j);
        R.box([x,YP-.04,0],[.8,.04,.9],{fill:P.paper,a:ga,shadow:false});[-1,1].forEach(s=>R.box([x+s*.36,0,0],[.03,YP-.05,.03],{a:ga*.9}));
        R.label([x,0,.5],g.name,{fs:12.5,b:1,dy:14,c:g.self?P.ink:P.mute,a:ga,wide:1});
        const vf=g.fb*SG*(k===3?Math.max(0,2*e-1):1);R.box([x,YP,.2],[.3,Math.max(.01,vf),.3],{fill:mix(P.paper,P.c1,.6),a:ga,shadow:false});
        R.label([x,YP+vf,.2],g.fbp,{mono:true,fs:12,b:1,dy:-10,dx:-12,c:P.c1,a:k===3?ga:0,wide:j===2?0:1});
        if(k===3)R.flowArc([FB[0]+(j-4)*.25,.14,FB[2]],[x,YP+vf,.2],.45,{c:P.c1,a:ga,r:.045,n:4,speed:1.5});
        if(k>=4){const s=k===4?e:1,vh=g.ho*SG*s,neg=vh<0;R.box([x,neg?YP-.04+vh:YP,-.22],[.3,Math.max(.01,Math.abs(vh)),.3],{fill:mix(P.paper,P.c2,.65),a:ga,shadow:false});
          R.label([x,neg?YP-.04+vh:YP+vh,-.22],g.hop,{mono:true,fs:12,b:1,dy:neg?12:-10,dx:12,c:neg?P.bad:P.c2,a:k===4?e:0,wide:j===2||j===8?0:1});
          if(k===4)R.flowArc([HO[0]+(j-4)*.25,.14,HO[2]],[x,YP+Math.max(0,vh),-.22],.45,{c:P.c2,a:1,r:.045,n:4,speed:1.5})}
        // step 6: the best held-out version as an outline, from the plinth to its gain (declared gain plus the final gap)
        if(k===5){const b=(g.ho+g.gap)*SG,top=Math.max(b,0),bot=Math.min(b,0);
          if(g.gap>0){R.box([x,YP+bot,-.22],[.42,Math.max(.02,top-bot),.42],{fill:P.c2,fa:.08,ea:.9,ec:P.c2,a:e,shadow:false});
            if(g.gap>10)R.label([x,YP+top,-.22],'+'+g.gap.toFixed(2)+' passed over',{mono:true,fs:12,b:1,dy:-12,c:P.c2,a:e})}
          else{R.glow([x,YP+Math.max(.1,g.ho*SG),-.22],.4,{c:P.good,a:.7*e});R.label([x,YP+g.ho*SG,-.22],'best',{mono:true,fs:12,b:1,dy:-24,c:P.good,a:e})}}});
      R.label([(GX(0)+GX(4))/2,YP+1.4,-.5],'creator runs its own harness',{mono:true,fs:12,b:1,c:P.ink,a:ga,wide:1});
      R.label([(GX(5)+GX(8))/2,YP+1.4,-.5],'Gemini 3.1 Pro runs it',{mono:true,fs:12,b:1,c:P.mute,a:ga,wide:1});
      R.label([GX(0)-.5,YP,0],'± 4.75',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:ga,wide:1})}
  }
  const one={cam:[.3,.5],bounds:[[-4.3,0,-2.3],[4.6,1.7,2.3]]},all={cam:[.3,.5],bounds:[[-4.6,0,-2.3],[4.9,2.4,2.3]]};
  S3.stage({id:'stg-evo',list:'sx-evo',fig:'3D · visible against held-out, Evolution',cam:one.cam,bounds:one.bounds,aspect:.62,dur:1900,hold:5000,draw,
    margin:w=>w<520?[16,10,24,10]:[20,16,28,16],
    view:k=>{const v=k>=3?all:one;return innerWidth<520?{cam:[.3,.78],bounds:v.bounds}:v}});
})();
