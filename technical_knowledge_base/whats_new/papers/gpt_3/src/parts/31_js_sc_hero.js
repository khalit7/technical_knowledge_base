// ---- Scene: Fig. 1, the hero (renderer v2): the eight GPT-3 sizes as stacks, to scale, with zero- and few-shot accuracy in front of each ----
// Every number is the page's own: layers and d_model from Table 2.1 (RC.params, 13B at its printed 5,140), the mean accuracy over the 41 accuracy
// rows of Table H.1 in zero- and few-shot (RC.agg, recompute.py) and the gap between them (RC.agg_gap). Height of a stack is its layers, width and
// depth its d_model, so its volume is proportional to 12 x layers x d_model^2, the non-embedding parameters. Bars to scale from 0%.
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,mix}=S3;
  const M=RC.params,AG=RC.agg,GAP=RC.agg_gap,n=M.length;
  const WS=1.5/12288,HS=.035,BS=.032,ZS=-1.8,ZB=1.2,BW=.27;               // width per unit of d_model, height per layer, height per accuracy point
  const X=[];{let x=-5.4;for(let i=0;i<n;i++){const w=M[i].d*WS;if(i===n-1)x+=.55;X.push(i<n-1?x:x+w/2-.3);x+=1.02}}
  const nm=i=>SZ[i],f1=v=>v.toFixed(1);
  function stack(R,i,a){const P=R.P,w=M[i].d*WS,h=M[i].L*HS,x=X[i];
    R.box([x,0,ZS],[w,h,w],{fill:mix(P.paper,P.c1,.1),a});
    // one line per layer on the front face
    const zf=ZS+w/2+.002;for(let j=1;j<M[i].L;j++)R.line([[x-w/2,j*HS,zf],[x+w/2,j*HS,zf]],{c:P.edge,w:.6,a:a*(M[i].L>48?.22:.45),dz:-.05})}
  function bar(R,x,v,col,a){if(a<=.01)return;R.box([x,.06,ZB],[BW,Math.max(.01,v*BS),BW],{fill:col,a,shadow:false})}
  function draw(R,k,e){const P=R.P;R.grid(-6.4,5.6,-3.4,2.6,.5);
    const show=i=>R.W>=520||i===0||i===4||i===6||i===7;                           // on a phone only four sizes are labelled; the step text gives all eight
    const sa=k===2||k===3?.55:1;                                                // the stacks recede while the bars are read
    for(let i=0;i<n;i++){const ai=k===1&&i===n-1?.18:sa;stack(R,i,ai);
      if(show(i))R.label(k<=1?[X[i],0,ZS+M[i].d*WS/2]:[X[i],0,ZB+.3],nm(i),{fs:12.5,b:1,dy:14,a:k<=1?Math.max(.5,ai):.9})}
    if(k<=1){R.label([X[n-1]+.8,M[n-1].L*HS*.6,ZS],M[n-1].L+' layers × '+fmt(M[n-1].d),{al:'left',dx:6,fs:12.5,b:1,c:P.c1,a:k===0?e:0,wide:1});
      R.label([X[0],M[0].L*HS,ZS],M[0].L+' × '+fmt(M[0].d),{fs:12,dy:-12,c:P.c1,a:k===1?e:k===0?.8*e:0,mono:true});
      if(k===1)[2,4,6].forEach(i=>R.label([X[i],M[i].L*HS,ZS],M[i].L+' × '+fmt(M[i].d),{fs:12,dy:-12,c:P.c1,a:e,mono:true}))}
    // plinths and bars in front of each stack: zero-shot (orange) then few-shot (blue)
    const pa=at(k,e,2);
    for(let i=0;i<n;i++){const x=X[i];if(pa>0)R.box([x,0,ZB],[.74,.06,.42],{a:pa});
      bar(R,x-.16,AG.z[i],P.c2,pa*(k===4?.45:1));
      if(k===2&&show(i))R.label([x-.16,.06+AG.z[i]*BS*e,ZB],f1(AG.z[i]),{fs:12,mono:true,c:P.c2,dy:-11,a:e});
      if(k>=3){const fa=at(k,e,3);
        if(k===3){bar(R,x+.16,AG.f[i]*e,P.c1,1);if(show(i))R.label([x+.16,.06+AG.f[i]*BS*e,ZB],f1(AG.f[i]),{fs:12,mono:true,b:1,c:P.c1,dy:-11,a:e})}
        else{bar(R,x+.16,AG.z[i],mix(P.paper,P.c1,.3),fa);R.box([x+.16,.06+AG.z[i]*BS,ZB],[BW,GAP[i]*BS,BW],{fill:P.c1,shadow:false});
          R.line([[x-.3,.06+AG.z[i]*BS,ZB+.2],[x+.3,.06+AG.z[i]*BS,ZB+.2]],{c:P.c2,w:1.2,dash:[3,3],a:e});
          if(show(i))R.label([x+.16,.06+AG.f[i]*BS,ZB],'+'+f1(GAP[i]),{fs:12.5,mono:true,b:1,c:P.c1,dy:-11,a:e})}}}
    // step 4: the demonstrations stream into every model's context, the same for each size; the weights do not change
    if(k===3)for(let i=0;i<n;i++){const w=M[i].d*WS,h=M[i].L*HS;R.flowArc([X[i]+.16,.25,ZB-.25],[X[i],Math.min(h*.5,.6),ZS+w/2+.02],.35,{c:P.c1,a:Math.min(1,e*1.6),n:6,r:.06,speed:1.2})}
    if(k>=2)R.label([X[0]-.45,.06+AG.z[0]*BS*.5,ZB],k===2?'zero-shot':k===3?'zero · few':'gap = few − zero',{al:'right',dx:-6,fs:12.5,b:1,c:k===2?P.c2:P.c1,grp:'side'})}
  const full={cam:[.3,.62],bounds:[[-5.9,0,-2.7],[4.2,3.4,1.7]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · eight sizes, one recipe',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4600,draw,
    margin:w=>w<520?[16,8,18,8]:[22,14,22,90],
    // step 2 moves in close on the seven smaller models; the others show all eight
    view:k=>k===1?{cam:[.3,.5],bounds:[[-5.9,0,-2.4],[1.2,1.5,-.9]]}:full});
})();
