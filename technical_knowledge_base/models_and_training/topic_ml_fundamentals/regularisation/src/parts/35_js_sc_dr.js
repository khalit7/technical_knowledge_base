// ---- Scene (section 4, Fig. 4): dropout as thinned networks, in 3D (renderer v2) ----
// The page's own network (train_digits.py, seed 0 with dropout; 64-96-96-10 ReLU, keep 0.8 of the pixels and 0.5 of each hidden layer), on test digit 242
// (labelled 4; the most ambiguous test digit by the thinned networks' disagreement). Every unit is a column whose height is its activation; a dropped
// unit is a flat grey tile. The masks are the first three of the 2D explorer's 30 (RG.rng(1000 + digit)), so the numbers agree with it; the last step
// averages all 30 thinned networks' outputs and marks the weight-scaled network's (plain forward pass) on the same bars.
// Flows: the five strongest surviving units of each layer stream into the next layer's five strongest; the last stream goes to the winning digit.
// The step list's numbers are static spans (data-dr); check_stages.mjs compares them.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-dr')||!window.S3||!window.RG||!window.DIG)return;const {at,off,lerp,mix}=S3;
  const L=RG.mlp(DIG.model),KEEP=DIG.model.keep,DG=242,K=30,lab=+DIG.labels[DG];
  const x0=[...DIG.digits.slice(DG*64,DG*64+64)].map(c=>parseInt(c,17)/16);
  const ws=RG.fwd(L,x0,[1,1,1]),r=RG.rng(1000+DG),runs=[];
  for(let k=0;k<K;k++){const masks=[];const o=RG.fwd(L,x0,KEEP,r,masks);runs.push({p:o.p,acts:o.acts,masks})}
  const avg=new Array(10).fill(0);runs.forEach(o=>o.p.forEach((v,c)=>avg[c]+=v/K));
  const arg=p=>p.indexOf(Math.max(...p)),pc=v=>Math.round(100*v)+'%',kept=(o,l)=>o.masks[l].filter(Boolean).length;
  const votes=new Array(10).fill(0);runs.forEach(o=>votes[arg(o.p)]++);
  const FMT={lab:()=>String(lab),ws:()=>String(arg(ws.p)),wsp:()=>pc(Math.max(...ws.p)),avg:()=>String(arg(avg)),avgp:()=>pc(Math.max(...avg)),vt:()=>String(votes[arg(votes)]),vtd:()=>String(arg(votes))};
  [0,1,2].forEach(m=>{const o=runs[m];FMT['m'+m]=()=>String(arg(o.p));FMT['m'+m+'p']=()=>pc(Math.max(...o.p));FMT['m'+m+'k0']=()=>String(kept(o,0));FMT['m'+m+'k1']=()=>String(kept(o,1));FMT['m'+m+'k2']=()=>String(kept(o,2))});
  document.querySelectorAll('[data-dr]').forEach(e=>{const f=FMT[e.dataset.dr];if(f)e.textContent=f()});
  window.RG_DR={FMT,avg,ws:ws.p,runs};
  const mxA=[0,1].map(l=>Math.max(...ws.acts[l],...runs.slice(0,3).flatMap(o=>o.acts[l]))*1.02);
  // layers in depth, the data flowing towards the reader: pixels at the back (8 x 8), hidden layers 12 (x) by 8 (z), the 10 outputs in front
  const LZ=[-6.4,-2.9,.6,3.7],PT=.32,OX=.44;
  const pos=(l,i)=>l===0?[((i%8)-3.5)*PT,0,LZ[0]+((i/8|0)-3.5)*PT]:l===3?[(i-4.5)*OX,0,LZ[3]]:[((i%12)-5.5)*PT,0,LZ[l]+((i/12|0)-3.5)*PT];
  // the state drawn at step k: the full network (0), thinned networks 1 to 3, the average (4)
  function state(k){if(k===0)return {act:ws.acts,mask:null,p:ws.p,x:x0};if(k===4)return {act:ws.acts,mask:null,p:avg,x:x0,avg:1};const o=runs[k-1];
    return {act:o.acts,mask:o.masks,p:o.p,x:x0.map((v,i)=>o.masks[0][i]?v:0)}}
  function layer(R,l,S,a,col){const P=R.P,nU=l===0?64:96;
    for(let i=0;i<nU;i++){const pp=pos(l,i);const on=!S.mask||S.mask[l][i];
      if(l===0){const v=S.x[i];if(!on){R.box(pp,[PT*.8,.02,PT*.8],{fill:P.soft,a:a*.6,shadow:false,ea:.25});continue}
        R.box(pp,[PT*.8,.04+.5*v,PT*.8],{fill:mix(P.paper,P.ink,.12+.7*v),a,shadow:false,lw:.6});continue}
      const v=S.act[l-1][i];
      // the units this layer passes on: a hidden unit's output is dropped by the next layer's input mask
      const drop=S.mask&&!S.mask[l][i];
      if(drop){R.box(pp,[PT*.8,.02,PT*.8],{fill:P.soft,a:a*.6,shadow:false,ea:.25});continue}
      const h=Math.max(.02,1.7*v/mxA[l-1]);R.box(pp,[PT*.8,h,PT*.8],{fill:v>0?mix(P.paper,col,.25+.6*Math.min(1,v/mxA[l-1])):P.paper,a,shadow:false,lw:.6})}}
  // the five strongest units a layer passes on (after its mask)
  function top5(l,S){const nU=l===0?64:96,vals=[];for(let i=0;i<nU;i++){if(S.mask&&!S.mask[l][i])continue;vals.push([l===0?S.x[i]:S.act[l-1][i],i])}
    return vals.sort((a,b)=>b[0]-a[0]).slice(0,5).filter(q=>q[0]>0).map(q=>q[1])}
  function hgt(l,i,S){return l===0?.04+.5*S.x[i]:Math.max(.02,1.7*S.act[l-1][i]/mxA[l-1])}
  let curK=0,la5=1; // the close-up on the outputs (step 5) needs no room for the layer labels on the left
  function draw(R,k,e){const P=R.P,c=P.c1,hl=P.c3;R.grid(-3.6,3.6,-8,4.6,.5);
    // a new mask fades in: the previous state recedes during the first part of the step
    const S=state(k),a=k===0?1:Math.min(1,.25+e*1.2);la5=Math.max(0,Math.min(1,(e-.5)*2)); // step 5's marks and labels arrive once the camera has settled
    for(let l=0;l<3;l++)layer(R,l,S,S.avg?Math.max(0,1-e*2.5):a,c);
    // output bars: probability; the true label in the highlight colour
    const pr=S.p,win=arg(pr);
    for(let cI=0;cI<10;cI++){const pp=pos(3,cI),h=Math.max(.02,3*pr[cI]);R.box(pp,[.32,h,.32],{fill:mix(P.paper,cI===lab?hl:c,.75),a});
      R.label([pp[0],0,pp[2]+.2],String(cI),{fs:12.5,mono:true,dy:10,c:cI===lab?hl:P.mute,b:cI===lab});
      if(S.avg&&ws.p[cI]>.01){const hw=3*ws.p[cI],d=.25;R.line([[pp[0]-d,hw,pp[2]-d],[pp[0]+d,hw,pp[2]-d],[pp[0]+d,hw,pp[2]+d],[pp[0]-d,hw,pp[2]+d],[pp[0]-d,hw,pp[2]-d]],{c:P.ink,w:2.2,a:la5,top:1})}}
    R.label([pos(3,win)[0],3*Math.max(pr[win],S.avg?ws.p[win]:0)+.1,LZ[3]],(S.avg?'average says ':'says ')+win+' · '+pc(pr[win]),{fs:13,b:1,dy:-12,c:win===lab?hl:c,a:S.avg?la5:a});
    if(S.avg)R.label([pos(3,7)[0],3*ws.p[7]+.12,LZ[3]],'black squares: weight-scaled pass',{fs:12,mono:true,dy:-22,c:P.ink,a:la5,wide:1});
    // flows through the surviving units only
    if(!S.avg)for(let l=0;l<3;l++){const A=top5(l,S),B=l<2?top5(l+1,S):[win];
      A.forEach((i,j)=>{const b=B[j%B.length];if(b==null)return;const pa=pos(l,i),pb=pos(l+1,b);
        R.flowArc([pa[0],hgt(l,i,S)+.05,pa[2]],[pb[0],(l<2?hgt(l+1,b,S):3*pr[b])+.05,pb[2]],.5,{c:l===2?(b===lab?hl:c):c,a:a*.85,r:.055,speed:1.4,n:5})})}
    const nm=['input · 64 pixels · keep 0.8','hidden 1 · 96 ReLU · keep 0.5','hidden 2 · 96 ReLU · keep 0.5','output · 10 digits'];
    nm.forEach((t,l)=>k<4&&R.label([l===3?-2.5:l===0?-1.6:-2.3,.1,LZ[l]],t,{fs:12,mono:true,al:'right',dx:-8,c:P.mute,grp:'lay'}));
    const ttl=k===0?'the full network':k===4?'average of 30 thinned networks':'thinned network '+k;
    if(k<4)R.label([0,1.9,LZ[0]-1.6],ttl,{fs:13.5,b:1,c:P.ink});
  }
  S3.stage({id:'stg-dr',list:'sx-dr',fig:'Fig. 4 · one ambiguous test digit through the page’s dropout network',cam:[.42,.6],bounds:[[-2.6,0,-7.8],[2.6,1.9,4]],aspect:.78,dur:1400,hold:4800,draw,
    // the last step moves in close on the outputs, where the average and the weight-scaled pass are compared
    view:k=>k===4?{cam:[.3,.5],bounds:[[-2.3,0,3.1],[2.3,1,4.2]]}:null,
    margin:w=>w<520||curK===4?[14,10,14,10]:[18,18,22,190],onStep:k=>{curK=k}});
})();
