// ---- Scene: Fig. 1, the write path and the read path sharing one index (renderer v2). Every number on a label is this page's:
// time to first token from the end-to-end run (PRD.e2e.summary, p50 of 40 claims x 3 passes), cost per query from cost_model.py's
// defaults at the published prices of section 9 (PRD.costdef). Station sizes and positions are layout only. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.PRD||!PRD.e2e||!PRD.costdef)return;const {at,off,lerp,mix}=S3;
  const S=PRD.e2e.summary,d=PRD.costdef;
  // cost per query by stage, the same formulas as cost_model.py (and the section 9 bar)
  const cE=d.q_tok*d.p_embed/1e6,cR=(d.q_tok*d.K+d.K*d.chunk_tok)*d.p_rerank/1e6,sc=d.sys_cached?d.sys_tok:0,
    cG=((d.sys_tok-sc+d.k*d.chunk_tok+d.q_tok)*d.p_in+sc*d.p_cached+d.out_tok*d.p_out)/1e6,
    cM=(d.n_chunks*d.chunk_tok*d.churn*d.p_embed/1e6+d.n_chunks*d.dims*4/1e9*d.p_gb_month)/d.queries_month,cT=cE+cR+cG+cM;
  const pc=x=>{const v=100*x/cT;return v<.1?'under 0.1%':Math.round(v)+'%'},usd=x=>'$'+(x>=1e-4?x.toPrecision(2):x.toFixed(7));
  const ms=x=>(x<10?x.toFixed(1):Math.round(x).toLocaleString('en-US'))+' ms';
  const ZR=1.15,ZW=-1.45,XI=-.9,ZI=-.15,BW=1.15,BH=.3,BD=.72;
  const RX=[-4.6,-2.75,-.9,.95,2.8,4.65],WX=[-4.6,-2.75];
  const RN=['question + user','embed','search','rerank','generate','answer'];
  // time (ms, p50) and cost (USD) per read-path station; null where the station has none
  const T=[null,S.embed.p50,S.search.p50,S.rerank.p50,S.ttft.p50,null],C=[null,cE,null,cR,cG,null];
  const tH=2.3/S.ttft.p50,cH=2.3/cG;
  function station(R,x,z,lab,o){const P=R.P;R.box([x,0,z],[BW,BH,BD],{fill:o.fill||P.paper,a:o.a});if(o.lab)R.label([x,BH,z-BD/2],lab,{fs:12.5,b:1,dy:-12,a:o.a,c:o.c,wide:1})}
  function draw(R,k,e){const P=R.P;R.grid(-5.6,5.6,-2.4,2.2,.5);
    const COL=[P.ink,P.c1,P.acc,P.c4,P.c2,P.ink];
    // write path: the back lane
    const wa=k===0?1:.28;
    station(R,WX[0],ZW,'source changes',{a:wa,lab:k===0});station(R,WX[1],ZW,'chunk, hash, embed',{a:wa,lab:k===0,fill:mix(P.paper,P.c1,.25)});
    if(k===0){R.flowArc([WX[0]+.45,BH,ZW],[WX[1]-.45,BH,ZW],.35,{c:P.c1,a:e,n:6,speed:1.3});R.flowArc([WX[1]+.45,BH,ZW],[XI-.3,.4,ZI-.3],.45,{c:P.c1,a:e,n:8,speed:1.3});
      R.label([WX[0],0,ZW+BD/2+.05],'minutes per changed document',{fs:12,mono:true,dy:14,c:P.mute,a:e,wide:1});
      R.label([XI+1.2,.2,ZW],'freshness lag · §2',{al:'left',fs:12.5,c:P.c1,a:e,grp:'w'});R.label([XI+1.2,.2,ZW],'model upgrade · §3',{al:'left',fs:12.5,c:P.c1,a:e,grp:'w'});R.label([XI+1.2,.2,ZW],'deletes reach every copy · §4',{al:'left',fs:12.5,c:P.c1,a:e,grp:'w'})}
    // the shared index: a glass slab holding one bar per vector
    const ia=k===0||k===1||k===2?1:.35;
    R.glass([XI-.75,.02,ZI-.5],[1.5,0,0],[0,0,1.0],{c:P.c1,a:ia,nu:6,nv:4});
    for(let j=0;j<8;j++)R.box([XI-.6+j*.17,.03,ZI],[.06,.55,.06],{fill:P.c1,a:ia*.9,shadow:false});
    if(k===0)R.label([XI,.6,ZI],'one index · one model',{fs:12.5,b:1,dy:-10,c:P.c1,al:'center'});
    // read path: the front lane
    const ra=k===0?.14:1;
    RX.forEach((x,i)=>{const lit=k===1||(k===2&&i===2)||(k===2&&i===4)||(k>=3);
      station(R,x,ZR,RN[i],{a:k===0?.14:k===2&&i!==2&&i!==4?.4:1,lab:k===1,fill:i===2&&k>=2?mix(P.paper,P.acc,.25):i>0&&i<5?mix(P.paper,COL[i],.18):P.paper,c:k===1&&i===2?P.acc:P.ink})});
    if(k===1){for(let i=0;i<5;i++)R.flowArc([RX[i]+.5,BH,ZR],[RX[i+1]-.5,BH,ZR],.3,{c:COL[i+1],a:e,n:5,speed:1.4});
      R.flowArc([XI,.6,ZI+.3],[RX[2],BH+.05,ZR-.2],.25,{c:P.c1,a:e,n:5,speed:1.2});
      R.label([RX[0],0,ZR+BD/2+.05],'seconds per question',{fs:12,mono:true,dy:14,c:P.mute,a:e,wide:1})}
    // the access filter inside the search, and the untrusted text entering the prompt
    if(k===2){R.glass([RX[2]-.72,.62,ZR-.5],[1.44,0,0],[0,0,1.0],{c:P.acc,a:e,nu:6,nv:4});R.glass([RX[2]-.72,0,ZR+.5],[1.44,0,0],[0,.62,0],{c:P.acc,a:e*.8,nu:6,nv:3});
      R.flowArc([XI,.6,ZI+.3],[RX[2],.7,ZR-.3],.25,{c:P.acc,a:e,n:5,speed:1.2});
      R.label([RX[2],0,ZR+.55],'access filter inside the search · §5, §6',{fs:12.5,b:1,dy:16,c:P.acc,a:e});
      R.flowArc([RX[2]+.5,BH,ZR],[RX[4]-.5,BH,ZR],.45,{c:P.bad,a:e,n:7,speed:1.2});
      R.label([RX[4],BH,ZR+BD/2],'retrieved text is untrusted · §11',{fs:12.5,dy:16,c:P.bad,a:e})}
    // time to first token by stage, then cost per query by stage, as towers on the read-path stations
    if(k>=3){const tt=k===3?e:1,ct=k===4?e:0;
      RX.forEach((x,i)=>{if(T[i]==null&&C[i]==null)return;const h0=T[i]==null?0:T[i]*tH,h1=C[i]==null?0:C[i]*cH,h=lerp(h0,h1,ct)*(k===3?tt:1);
        R.box([x,BH,ZR],[.62,Math.max(.012,h),.5],{fill:COL[i],a:.95,shadow:false});
        const lab=k===3?ms(T[i]):(C[i]==null?null:usd(C[i])+' · '+pc(C[i]));
        R.label([x,BH+h,ZR],lab,{mono:true,fs:12.5,dy:-12,b:i===4,c:COL[i]===P.ink?P.ink:COL[i],a:k===3?e:1,wide:i<3?1:0})});
      if(k===4){const h=cM*cH*e;R.box([XI,.6,ZI],[.62,Math.max(.012,h),.5],{fill:P.c5,a:.95,shadow:false});
        R.label([XI-.3,.6+h,ZI],'storage + re-embedding · '+pc(cM),{mono:true,fs:12.5,dy:-12,al:'right',c:P.c5,a:e,wide:1})}
      R.label([RX[0]-.5,2.3,ZR],k===3?'first token at '+ms(S.wall_to_first_token.p50)+' (p50, measured)':usd(cT)+' per query (published prices)',{al:'left',fs:13,b:1,dy:-4,a:k===3?e:1,wide:1})}
  }
  const full={cam:[.28,.62],bounds:[[-5.4,0,-2.0],[5.4,1.2,1.7]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · two paths share one index',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,8,12,8]:[26,18,26,18],
    // the camera follows the step: the write lane, the read lane, the search and the prompt, then the towers of time and money
    view:k=>k===0?{cam:[.3,.68],bounds:[[-5.3,0,-2.0],[1.2,.9,.2]]}:k===1?full:k===2?{cam:[.3,.62],bounds:[[-3.8,0,-1.2],[4.0,1.0,2.1]]}:{cam:[.25,.45],bounds:[[-5.3,0,-.8],[5.4,2.6,1.7]]}});
})();
