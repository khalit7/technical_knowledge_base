// ---- Scene: Fig. 4, juries and robust pooling (stg-jury, renderer v2) ----
// Step 1 draws PoLL's published kappas with human labels on KILT Natural Questions (Verga et al. 2024: panel 0.763, Claude 3 Haiku 0.749,
// exact match 0.651, GPT-4 0.627): three judges from three families vote, the majority is the verdict. Steps 2 to 4 are illustrative
// (labelled on the page): five jurors score one item on a 1 to 5 scale (3.5, 3.75, 4, 4.25, 4.5), then one and two of them mode-collapse
// to 1; their scores flow into a mean pillar and a median pillar. Numbers for check_stages.mjs: window.LJS.jury.
(function(){
  if(!document.getElementById('stg-jury')||!window.S3)return;const {at,mix,lerp}=S3;
  const BASE=[3.5,3.75,4,4.25,4.5],SC=k=>BASE.map((v,j)=>(k>=2&&j===4)||(k>=3&&j===3)?1:v);
  const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[2]},mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
  window.LJS=window.LJS||{};LJS.jury=[1,2,3].map(k=>[mean(SC(k)).toFixed(2),med(SC(k)).toFixed(2)]);
  const POLL=[['panel',.763],['Haiku alone',.749],['exact match',.651],['GPT-4 alone',.627]];
  const XJ=j=>-3.2+j*1.05,ZJ=-1,H=.42,XM=2.5,XD=3.6,ZP=1.1;   // H: height per score point
  function draw(R,k,e){const P=R.P;R.grid(-4.6,5,-3,3,.5);
    if(k===0){['Command R','Claude 3 Haiku','GPT-3.5'].forEach((nm,j)=>{const x=-2.6+j*1.25;R.glass([x-.4,.05,ZJ],[.8,0,0],[0,1.1,0],{c:[P.c1,P.c6,P.c2][j],a:1,nu:3,nv:4});
        R.label([x,1.15,ZJ],nm,{fs:12.5,b:1,dy:-10,c:[P.c1,P.c6,P.c2][j],grp:'pj'});R.flowArc([x,.5,ZJ+.05],[0,.45,ZP],.4,{c:[P.c1,P.c6,P.c2][j],r:.06})});
      R.box([0,0,ZP],[1,.45,.6],{fill:mix(P.paper,P.acc,.35)});R.label([0,.45,ZP],'majority vote',{fs:12.5,b:1,dy:-11});R.flow([[.5,.25,ZP],[1.6,.25,ZP]],{c:P.acc,r:.06});
      POLL.forEach(([nm,v],j)=>{const x=1.9+j*.95,h=Math.max(.02,v*2*e),hi=j===0;R.box([x,0,ZP],[.42,h,.42],{fill:mix(P.paper,hi?P.good:j===3?P.bad:P.mute,hi?.75:.45)});
        R.label([x,h,ZP],v.toFixed(3),{fs:12,b:hi,dy:-10,c:hi?P.good:P.ink,a:e});R.label([x,0,ZP+.25],nm,{fs:12,dy:12,c:P.mute,a:e})});
      R.label([3.3,1.95,ZP],'κ with human labels',{fs:12.5,b:1,c:P.mute,a:e,wide:1});return}
    // the illustrative jury
    const s=SC(k),s0=SC(k-1),t=e,cur=s.map((v,j)=>lerp(s0[j],v,t));
    cur.forEach((v,j)=>{const bad=s[j]===1,c=bad?P.bad:P.c4;R.glass([XJ(j)-.38,.05,ZJ-.45],[.76,0,0],[0,1.9,0],{c,a:k===1?at(k,e,1)*.9+.1:1,nu:2,nv:3});
      R.box([XJ(j),0,ZJ],[.38,Math.max(.02,v*H),.38],{fill:mix(P.paper,c,bad?.75:.45)});R.label([XJ(j),v*H,ZJ],(Math.round(v*100)/100).toString(),{fs:12,b:bad,dy:-10,c:bad?P.bad:P.ink});
      R.label([XJ(j),0,ZJ+.3],'juror '+(j+1),{fs:12,dy:12,c:bad?P.bad:P.mute,wide:1});
      R.flowArc([XJ(j),v*H+.05,ZJ],[XM,mean(cur)*H,ZP],.4,{c:P.c2,r:.045,n:4,a:.7});R.flowArc([XJ(j),v*H+.05,ZJ],[XD,med(cur)*H,ZP],.6,{c:P.acc,r:.045,n:4,a:.7})});
    [[XM,mean(cur),P.c2,'mean'],[XD,med(cur),P.acc,'median']].forEach(([x,v,c,nm])=>{R.box([x,0,ZP],[.6,Math.max(.02,v*H),.6],{fill:mix(P.paper,c,.75)});
      R.label([x,v*H,ZP],nm+' '+v.toFixed(2),{fs:13,b:1,dy:-12,c})});
    R.label([XM+.55,0,ZP+.45],'illustrative scores',{fs:12,dy:14,c:P.mute,a:k===1?e:1})}
  S3.stage({id:'stg-jury',list:'sx-jury',fig:'Fig. 4 · pooling several judges',cam:[.12,.55],bounds:[[-3.9,0,-1.6],[4.3,2.3,2]],aspect:.6,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,10,14,10]:[18,14,16,30],
    view:k=>k===0?{cam:[.1,.45],bounds:[[-3.3,0,-1.4],[5.2,2,1.8]]}:{cam:[.12,.55],bounds:[[-3.9,0,-1.6],[4.3,2.3,2]]}});
})();
