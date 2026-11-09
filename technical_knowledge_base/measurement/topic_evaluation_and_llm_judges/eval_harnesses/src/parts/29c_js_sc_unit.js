// ---- Scene: Fig. 2 (stg-unit, renderer v2): the two designs on this page's two real GSM8K runs (window.HX.runs, src/data/runs.json).
// Front lane, lm-eval 0.4.13: ten requests built before the model runs (slab length = prompt tokens), one batch to the model, ten outputs
// (slab length = output tokens, same scale), two filter chains as glass plates, a verdict cube per problem and filter (tall green: correct;
// low white: a number read but wrong; none: nothing extracted), one number per filter.
// Back lane, inspect-ai 0.3.276 + inspect_evals 0.23.0: a program per sample (Sample, system_message, prompt_template, generate(), scorer) whose
// state flows through the solvers while each step writes events into the sample's log (a stack of 20 plates: the recorded event count),
// then ten such programs in flight with match(numeric=True)'s verdict at the end of each. Counts published in window.HXN.unit for check_stages.mjs. ----
(function(){
  if(!document.getElementById('stg-unit')||!window.S3||!window.HX||!window.HX.runs)return;const {mix}=S3;
  const R0=window.HX.runs,IT=R0.items,S=R0.summary,n=IT.length;
  const lmP=IT.map(x=>x.lm.prompt_tokens),lmO=IT.map(x=>x.lm.output_tokens);
  const strictRead=IT.map(x=>x.lm['strict-match'].filtered!=='[invalid]'),strictOK=IT.map(x=>!!x.lm['strict-match'].exact_match),flexOK=IT.map(x=>!!x.lm['flexible-extract'].exact_match);
  const inOK=IT.map(x=>x['in'].score==='C'),ev=IT.map(x=>x['in'].events.length);
  const kb=b=>(b/1024).toFixed(1),mm=a=>[Math.min(...a),Math.max(...a)];
  const U={n,prompt:mm(lmP),out:mm(lmO),strictRead:strictRead.filter(Boolean).length,strictOK:strictOK.filter(Boolean).length,flexOK:flexOK.filter(Boolean).length,
    inOK:inOK.filter(Boolean).length,events:mm(ev),resKB:kb(S.lm.results_bytes),smpKB:kb(S.lm.samples_bytes),lmKB:mm(IT.map(x=>x.lm.record_bytes)).map(kb),inKB:mm(IT.map(x=>x['in'].record_bytes)).map(kb),
    em:[S.lm.results['exact_match,strict-match'],S.lm.results['exact_match,flexible-extract']]};
  (window.HXN=window.HXN||{}).unit=U;
  const TS=2.0/1100;                     // world units per token (prompt and output slabs share one scale)
  const ZL=1.35,XQ=-6.3,XM=-1.9,XO=-.3,XF=[1.5,2.2],XV=3.2,VS=.3;
  const ZI=-1.0,DZ=.34,XI=[-5.6,-3.8,-2.0,-.2,1.6],XL=3.0,XIV=2.45;
  const SOL=['Sample','system_message','prompt_template','generate()','scorer'];
  function draw(R,k,e){const P=R.P,ph=R.W<520;R.grid(-7.2,7.4,-4.6,2.6,.5);
    const lmA=k<=3?1:k===6?e:0,inA=k===4||k===5||k===6?1:k===3?0:0;
    // ---- lm-eval lane
    const qa=lmA*(k===0?e:1);
    IT.forEach((x,i)=>{const L=lmP[i]*TS;R.box([XQ+L/2,i*.13,ZL],[L,.1,.7],{fill:P.paper,a:qa*(k===0?Math.min(1,e*n-i+1):1),shadow:i===0,lw:.6})});
    if(qa>0&&!ph&&k<=1)R.label([XQ+1,n*.13,ZL],'10 requests · '+U.prompt[0]+' to '+U.prompt[1].toLocaleString('en-GB')+' tokens',{fs:12,dy:-14,a:qa,c:P.mute});
    const ma=lmA*(k===0?0:k===1?e:1);
    if(ma>0){R.box([XM,0,ZL],[1.1,.9,.9],{fill:mix(P.paper,P.c1,.35),a:ma});if((k===1||k===6)&&!ph)R.label([XM,.9,ZL],'model',{fs:12.5,b:1,dy:-12,a:ma})}
    if(k===1){IT.forEach((x,i)=>R.flow([[XQ+lmP[i]*TS,i*.13+.05,ZL],[XM-.55,.1+i*.075,ZL]],{c:P.c1,r:.05,n:3,speed:1.4,a:e}));
      IT.forEach((x,i)=>R.flow([[XM+.55,.1+i*.075,ZL],[XO,i*.13+.05,ZL]],{c:P.c2,r:.05,n:2,speed:1.2,a:e}))}
    const oa=lmA*(k===0?0:k===1?e:1);
    IT.forEach((x,i)=>{const L=lmO[i]*TS;R.box([XO+L/2,i*.13,ZL],[L,.1,.7],{fill:mix(P.paper,P.c2,.3),a:oa,shadow:i===0,lw:.6})});
    if(oa>0&&!ph&&(k===1||k===2))R.label([XO+.2,n*.13,ZL],'10 outputs · '+U.out[0]+' to '+U.out[1]+' tokens',{fs:12,dy:-14,a:oa,c:P.mute,al:'left'});
    const fa=lmA*(k<2?0:k===2?e:1);
    if(fa>0){['strict','flexible'].forEach((nm,j)=>{R.glass([XF[j],0,ZL-.55],[0,0,1.1],[0,1.1,0],{c:j?P.c6:P.c5,a:fa,nu:4,nv:5});
        if(!ph&&k<=3)R.label([XF[j],1.1,ZL],nm,{fs:12,mono:true,c:j?P.c6:P.c5,dy:-12-j*15,a:fa})});
      if(k===2){R.flow([[XO+.5,.6,ZL],[XF[0],.6,ZL],[XF[1],.6,ZL],[XV-.1,.2,ZL-.3]],{c:P.c5,r:.06,speed:1.3,a:e});R.flow([[XO+.5,.4,ZL],[XF[1]+.05,.4,ZL],[XV-.1,.15,ZL+.3]],{c:P.c6,r:.06,speed:1.3,a:e})}
      // verdict cubes: back row strict-match, front row flexible-extract
      [[strictRead,strictOK,ZL-.25],[IT.map(()=>true),flexOK,ZL+.25]].forEach(([rd,ok,z],j)=>IT.forEach((x,i)=>{const px=XV+i*VS;
        if(ok[i])R.box([px,0,z],[.24,.42,.3],{fill:P.good,a:fa,shadow:false});else if(rd[i])R.box([px,0,z],[.24,.09,.3],{fill:P.paper,a:fa,shadow:false});
        else R.quad([[px-.12,.005,z-.15],[px+.12,.005,z-.15],[px+.12,.005,z+.15],[px-.12,.005,z+.15]],{a:fa*.5,ec:P.mute,dash:[2,2]})}));
      const ea=k===2?0:k===3?e:lmA;
      if(ea>0&&!ph&&lmA>.5){R.label([XV+n*VS-.1,0,ZL-.25],'strict '+U.em[0].toFixed(1),{fs:12.5,mono:true,al:'left',b:1,c:P.c5,a:ea,dx:4});
        R.label([XV+n*VS-.1,0,ZL+.25],'flexible '+U.em[1].toFixed(1),{fs:12.5,mono:true,al:'left',b:1,c:P.c6,a:ea,dx:4})}
      if(k===3&&!ph){R.label([XV+1.4,0,ZL+.5],'results '+U.resKB+' KB · samples '+U.smpKB+' KB',{fs:12,dy:20,c:P.ink,a:e})}}
    if(!ph&&(k<=1||k===6))R.label([XQ-.1,0,ZL+.4],'lm-eval · requests',{fs:12.5,b:1,al:'left',dy:16,c:P.c1});
    // ---- Inspect lane: a program per sample
    if(inA>0){const rows=k===4?1:n,ra=k===4?e:1;
      for(let j=0;j<rows;j++){const z=ZI-j*DZ,a=(j===0?1:k===5?Math.min(1,e*1.6):1)*(k===6&&j>0?.6:1);
        XI.forEach((x,t)=>R.box([x,0,z],[1.25,.22,.24],{fill:t===3?mix(P.paper,P.c1,.35):t===4?mix(P.paper,P.c5,.3):P.paper,a:a*(j===0?ra:1),shadow:false,lw:.6}));
        // the sample's state moves through the solvers; each step writes events into its log
        if(k>=4){R.flow([[XI[0]-.6,.28,z],[XI[4]+.6,.28,z]],{c:P.c4,r:j?.04:.07,n:j?4:9,speed:1.2,a:a*(j===0?1:.7)})}
        const ok=inOK[j];if(k>=5||(k===4&&e>.8))R.box([XIV,0,z],[.18,ok?.34:.07,.2],{fill:ok?P.good:P.paper,a,shadow:false});
        const ne=k===4?Math.round(ev[j]*e):ev[j];for(let q=0;q<ne;q++)R.box([XL,q*.035,z],[.5,.025,.22],{fill:mix(P.paper,P.c4,.35),a:a*.9,shadow:false,lw:.4,edge:j===0})}
      if(k===4){XI.forEach((x,t)=>R.label([x,.22,ZI],SOL[t],{mono:true,fs:12,dy:-14,c:t===3?P.c1:P.ink,a:e,wide:1}));
        R.label([XL,ev[0]*.035,ZI],'log · '+ev[0]+' events',{fs:12,dy:-12,a:e,c:P.c4,b:1,wide:1})}
      if(k===5&&!ph){R.label([XIV,0,ZI+.15],'match: '+U.inOK+' of '+n,{fs:12.5,b:1,mono:true,c:P.good,dy:16,a:e});R.label([XL+.3,.7,ZI-(n-1)*DZ],'10 logs · '+U.inKB[0]+' to '+U.inKB[1]+' KB each',{fs:12,al:'left',dx:6,c:P.c4,a:e})}
      if(!ph&&k>=4)R.label([XI[0]-.6,.22,ZI],'Inspect · a program per sample',{fs:12.5,b:1,al:'left',dy:k===4?-36:-16,c:P.c4,a:k===4?e:1})}
    if(k===6&&!ph){R.label([XQ+1.2,0,ZL+.4],'kept per problem: '+U.lmKB[0]+' to '+U.lmKB[1]+' KB',{fs:12,dy:34,c:P.mute,a:e});
      R.label([XL,.7,ZI-(n-1)*DZ],'kept per problem: '+U.inKB[0]+' to '+U.inKB[1]+' KB',{fs:12,dy:-14,c:P.mute,a:e})}
  }
  const full={cam:[.28,.7],bounds:[[-6.8,0,-4.3],[7.6,1.4,2.3]]};
  const VW=[{cam:[.3,.55],bounds:[[-7.2,0,.4],[-3.2,1.5,2.4]]},{cam:[.25,.55],bounds:[[-6.8,0,.4],[2,1.5,2.4]]},{cam:[.22,.55],bounds:[[-.8,0,.4],[7.4,1.3,2.4]]},
    {cam:[.22,.58],bounds:[[-6.8,0,.3],[7.6,1.4,2.5]]},{cam:[.3,.5],bounds:[[-6.4,0,-1.6],[3.6,1.2,-.4]]},{cam:[.3,.62],bounds:[[-6.4,0,-4.3],[4.4,1.2,-.5]]},full];
  S3.stage({id:'stg-unit',list:'sxl-unit',fig:'Fig. 2 · requests built up front, or a program per sample',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4800,draw,view:k=>VW[k]});
})();
