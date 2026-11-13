// ---- Scene: Fig. 1 (stg-halves, renderer v2): one SciFact claim through both halves, first with BM25, then with the hybrid.
// Data: window.RDATA.case54 (src/gen_case.py): claim 54, the top 3 of each run, the labelled abstract's rank in every run, Qwen2.5-1.5B-Instruct's two answers.
// The claim flows through a retriever plate into a ranked stack of abstracts; the top 3 (above the cut) flow through the generator plate into the answer;
// then the end-to-end verdict, the retrieval half (the labelled abstract below the cut) and the generation half (no support for the answer) are lit one at a time;
// then the hybrid re-ranks the stack and the bug moves to the generator. Rank 4 of the BM25 run is not stored, so it is drawn unlabelled.
// What the scene computes is published in window.RRES.halves for check_stages.mjs. ----
(function(){
  if(!document.getElementById('stg-halves')||!window.S3||!window.RDATA)return;
  const {at,off,lerp,mix,cl}=S3,C=RDATA.case54,G=C.gold[0],SY=RDATA.sys;
  const rk=s=>G[2+SY.indexOf(s)],bR=rk('bm25_lucene'),hR=rk('hybrid_rrf');
  const B=C.runs.bm25_lucene.ids,H=C.runs.hybrid_rrf.ids,gid=G[0];
  // short names for the abstracts (their full titles are in the step list and in RDATA.case54.runs[*].titles)
  const NM={'3973445':'JAK1 · AMPK','3419709':'fatty liver','7005276':'acetic acid'};NM[gid]='metformin · lung';
  // the stack: BM25's ranks 1..bR (rank 4 not stored), then where each lands under the hybrid (only its top 3 are stored)
  const items=B.map(id=>({id}));for(let r=B.length+1;r<bR;r++)items.push({id:'r'+r});items.push({id:gid});
  items.forEach((o,i)=>{o.b=i+1;const h=H.indexOf(o.id);o.h=h>=0?h+1:null});
  let below=H.length;items.forEach(o=>{if(o.h===null)o.h=++below});   // drawn below the cut, unnumbered: their hybrid ranks are not stored
  const bHit=B.slice(0,3).includes(gid)?1:0,hHit=H.slice(0,3).includes(gid)?1:0;
  (window.RRES=window.RRES||{}).halves={bm25rank:bR,hybrank:hR,bHit,hHit,hPrec:H.slice(0,3).filter(x=>x===gid).length+'/3',hRR:'1/'+(H.indexOf(gid)+1)};
  const XQ=-6.9,XR=-5.1,XS=-1.5,XG=1.55,XA=3.75,SH=.42,TH=.27,N=items.length,yOf=r=>(N-r)*SH,CUT=yOf(3)-.05;
  function draw(R,k,e){const P=R.P,cQ=P.c2,cR=P.c6,cG=P.c4,ph=R.W<520;R.grid(-7.2,4.8,-1.6,1.6,.5);
    const hyb=k>=5,mv=k===5?e:hyb?1:0;
    // steps 1 and 4 move the camera in close, so labels of what is out of view fade out (labels are clamped inside the canvas, they would pile up at its edge)
    const sv=hid=>hid(k)?(hid(k-1)?0:cl(1-2*e,0,1)):(k>0&&hid(k-1)?cl(2*e-1,0,1):1),vL=sv(j=>j===3),vR=sv(j=>j===0||j===3);
    const mL=.1+.9*vL,mR=.1+.9*vR; // the side plates out of a close-up's view fade with their labels, so none sits cut at the card's edge
    // composition: the part a step is about at full strength, the rest receding
    const aQ=k===0||k===5?1:.3,aS=k===0||k===3||k===5?1:k===1||k===4||k===6?.75:.35,aGn=k===1||k===4||k===6?1:.3,aA=k===1||k===2||k===4||k===6?1:.35;
    // the claim and the retriever
    R.box([XQ,0,0],[.95,1.5,.08],{fill:mix(P.paper,cQ,.45),a:aQ*mL});
    R.label([XQ,1.5,0],'claim 54',{fs:12.5,b:1,c:cQ,dy:-10,wide:1,a:vL*Math.max(.55,aQ)});
    R.glass([XR-.5,.06,0],[1,0,0],[0,1.6,0],{c:cR,a:(aQ*.9+.1)*mL,nu:5,nv:6});
    R.label([XR,1.66,0],hyb?'hybrid (RRF)':'BM25',{fs:12.5,b:1,c:cR,dy:-10,wide:1,a:vL*Math.max(.6,aQ)});
    if(k===0||k===5){const a=k===0?Math.min(1,e*1.6):Math.min(1,e*1.6);R.flow([[XQ+.5,.75,0],[XR-.5,.8,0]],{c:cQ,a,r:.06,n:5,speed:1.2});
      R.flowArc([XR+.5,.8,0],[XS-.8,yOf(1)+.1,-.3],.6,{c:cR,a,r:.06,n:7,speed:1.2})}
    // the ranked stack, the cut above rank 4, the labelled abstract lit from step 4
    const lit=k>=3,gA=lit?1:0;
    items.forEach(o=>{const r=lerp(o.b,o.h,mv),y=yOf(r),isG=o.id===gid,inTop=r<=3.01,
        fill=isG&&lit?mix(P.paper,P.good,.75):inTop?mix(P.paper,cR,.35):P.paper,a=aS*(o.h>3&&hyb&&!isG?.55:1);
      R.box([XS,y,0],[1.6,TH,1],{fill,a,shadow:r>=N-.01});
      const nm=NM[o.id],num=hyb&&o.h>3?'':(Math.round(r)+' · ');
      R.label([XS-.85,y+TH/2,0],nm?num+nm:(hyb?'':num+'not stored'),{fs:12.5,mono:!nm,al:'right',dx:-4,c:isG&&lit?P.good:P.ink,b:isG&&lit,a:Math.max(.45,a),grp:'ps'})});
    R.glass([XS-.95,CUT,-.65],[1.9,0,0],[0,0,1.3],{c:P.acc,a:k===1||k===3||k===5?.9:.35,nu:4,nv:3,th:.02});
    R.label([XS+.95,CUT,.65],'cut · top 3',{fs:12,al:'left',dx:6,c:P.acc,a:k===1||k===3||k===5?1:.45,wide:1});
    // the generator and the answer
    R.glass([XG-.5,.06,0],[1,0,0],[0,1.6,0],{c:cG,a:(aGn*.9+.1)*mR,nu:5,nv:6});
    R.label([XG,1.66,0],'Qwen2.5-1.5B',{fs:12.5,b:1,c:cG,dy:-10,wide:1,a:vR*Math.max(.6,aGn)});
    const ansA=k>=1?(k===1?cl(e*2-1,0,1):1):0,wrong=k>=2;
    R.box([XA,0,0],[1.15,1.2,.08],{fill:wrong?mix(P.paper,P.bad,.55):mix(P.paper,cG,.3),a:ansA*Math.max(.45,aA)*mR});
    R.label([XA,.6,.08],'"Supported"',{fs:13,b:1,c:P.ink,a:(ph&&k===5?0:vR)*ansA*Math.max(.5,aA)});
    if(k===1||k===6){const a=k===1?Math.min(1,e*1.5):Math.min(1,e*1.5);[1,2,3].forEach(r=>{const o=items.find(x=>Math.round(hyb?x.h:x.b)===r);const y=yOf(r)+TH/2;
        R.flowArc([XS+.8,y,0],[XG-.5,.85,0],.25,{c:o&&o.id===gid&&hyb?P.good:cR,a,r:.055,n:5,speed:1.2})});
      R.flow([[XG+.5,.8,0],[XA-.58,.7,0]],{c:cG,a,r:.065,n:5,speed:1.2})}
    // the three verdicts, each lit at its own step and kept afterwards
    const vt=(s,txt,good,p,o,v)=>{const a=(v==null?1:v)*(k===s?Math.min(1,e*1.6):k>s&&!ph?.85:0);if(a>0)R.label(p,txt,Object.assign({fs:13,b:1,c:good?P.good:P.bad,a},o||{}))};
    vt(2,'end to end: wrong',false,[XA,1.2,0],{dy:-12},vR);
    if(k<5)vt(3,'retrieval: failed · hit@3 = '+bHit,false,[XS,yOf(1)+TH,0],{dy:-18});
    else R.label([XS,yOf(1)+TH,0],'retrieval: passed · hit@3 = '+hHit,{fs:13,b:1,c:P.good,dy:-18,a:k===5?Math.min(1,e*1.6):ph?0:.85});
    vt(4,'generation: failed',false,[XG,1.66,0],{dy:-30},vR);
    if(ph&&k===6)R.label([XG,1.66,0],'generation: failed',{fs:13,b:1,c:P.bad,dy:-30,a:Math.min(1,e*1.6)});
    // the generation half: the answer's claim of support has nothing under it in the three abstracts it was given (step 5);
    // after the fix it cites the labelled abstract and reads it backwards (step 7)
    if(k===4){[1,2,3].forEach(r=>R.line([[XA-.58,.7,0],[XS+.81,yOf(r)+TH/2,0]],{c:P.bad,w:1.6,dash:[5,5],a:.85*e}));
      R.label([XA,0,.06],'no passage supports it',{fs:12,c:P.bad,b:1,dy:14,a:cl(2*e-1,0,1),wide:1})}
    if(k===6){const o=items.find(x=>x.id===gid),y=yOf(o.h)+TH/2;R.line([[XA-.58,.8,0],[XS+.81,y,0]],{c:P.bad,w:2,a:e});
      R.label([XA,0,.06],'cites it, reads it backwards',{fs:12,c:P.bad,b:1,dy:14,a:cl(2*e-1,0,1),wide:1})}
  }
  const full={cam:[.24,.34],bounds:[[-7.5,0,-.7],[4.4,2.0,.7]]};
  S3.stage({id:'stg-halves',list:'sx-halves',fig:'Fig. 1 · SciFact claim 54 through both halves',cam:full.cam,bounds:full.bounds,aspect:.38,dur:1500,hold:5200,draw,
    margin:w=>w<520?[34,10,26,10]:[44,20,26,20],
    view:k=>innerWidth<520?[{cam:[.2,.34],bounds:[[-7.5,0,-.7],[-.5,2.0,.7]]},full,{cam:[.2,.34],bounds:[[.6,0,-.7],[4.5,2.0,.7]]},{cam:[.2,.36],bounds:[[-2.6,0,-.7],[-.3,2.0,.7]]},{cam:[.2,.34],bounds:[[-2.4,0,-.7],[4.5,2.0,.7]]},{cam:[.2,.36],bounds:[[-5.8,0,-.7],[-.3,2.0,.7]]},{cam:[.2,.34],bounds:[[-2.4,0,-.7],[4.5,2.0,.7]]}][k]:k===0?{cam:[.22,.32],bounds:[[-7.5,0,-.7],[-.5,2.0,.7]]}:k===3?{cam:[.18,.36],bounds:[[-4.7,0,-.7],[.6,2.0,.7]]}:full});
})();
