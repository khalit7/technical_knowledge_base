// ---- Scene, section 5 (Fig. 5): one MoE layer of DeepSeek-V3 under expert parallelism on four GPUs (DeepSeek's decode units use 144).
// Bytes from window.DDC.ep (recompute.py from DeepSeek-V3's config.json): hidden 7,168, 8 experts per token, FP8 dispatch, BF16 combine, 58 MoE layers.
// Which experts the token picks is illustrative (three of its eight trips drawn); the overlap step is DeepSeek's dual-batch overlap, drawn schematically. ----
(function(){
  if(!document.getElementById('stg-ep')||!window.DDS||!window.DDC)return;const {mix}=S3,{vis,gpu,lab,f0}=DDS,E=window.DDC.ep;
  const N={disp:f0(E.h),comb:f0(2*E.h),layer:f0(E.per_layer),tok:(E.per_token/1e6).toFixed(2),L:E.moeL,per:E.E/4,k:E.k};
  window.DD_EP=N; // checked by check_stages.mjs
  const X=[-3.3,-1.1,1.1,3.3],GS=[1.85,.22,1.5],YA=1.15,YB=1.5;
  const ex=(g,i)=>[X[g]-.6+(i%4)*.4,GS[1],-.3+Math.floor(i/4)*.5],PICK=[null,5,2,7];
  function draw(R,k,e,st){const P=R.P,v=f=>vis(k,e,st,f);R.grid(-5,5,-1.6,2.4,.5);
    const ov=v(q=>q===3);
    X.forEach((x,g)=>{gpu(R,[x,0,0],GS,{die:false});lab(R,[x,0,.75],'GPU '+g,{dy:15,fs:12,c:P.mute});
      // attention over the GPU's own users, with their cache
      R.glass([x-.7,YA,-.45],[1.4,0,0],[0,0,.9],{c:P.c1,a:k===3?.45:1,nu:4,nv:3});R.box([x+.85,GS[1],.45],[.22,.5,.22],{fill:mix(P.paper,P.c6,.6),a:.9,shadow:false,lw:.6});
      if(ov>0)R.glass([x-.7,YB,-.45],[1.4,0,0],[0,0,.9],{c:P.c1,a:ov,nu:4,nv:3});
      for(let i=0;i<8;i++){const hot=k>=1&&k<=2&&PICK[g]===i;R.box(ex(g,i),[.28,.26,.28],{fill:hot?mix(P.paper,P.c4,.8):mix(P.paper,P.c4,.22),lw:hot?1.6:.6,shadow:false})}
      lab(R,[x,GS[1]+.26,.25],'experts '+(g*N.per)+'-'+((g+1)*N.per-1),{dy:22,fs:12,c:P.c4,a:v(q=>q===0),wide:1})});
    let a=v(q=>q===0);
    if(a>0){lab(R,[X[0],YA,-.45],'attention · own users',{dy:-12,fs:12.5,b:1,c:P.c1,a});}
    // dispatch: the token's hidden state to its experts (FP8), then combine: the results back (BF16)
    const tok=[X[0],YA+.08,0];
    a=v(q=>q===1||q===2);if(a>0)R.ball(tok,.1,{c:P.acc,a});
    a=v(q=>q===1);
    if(a>0){for(let g=1;g<4;g++){const p=ex(g,PICK[g]);R.flowArc(tok,[p[0],.5,p[2]],.55,{c:P.c2,a,r:.07,n:7,speed:1.6})}
      lab(R,[X[2],1.25,0],N.disp+' bytes to each expert (FP8)',{dy:-14,b:1,c:P.c2,fs:13,a})}
    a=v(q=>q===2);
    if(a>0){for(let g=1;g<4;g++){const p=ex(g,PICK[g]);R.flowArc([p[0],.5,p[2]],tok,.8,{c:P.c4,a,r:.075,n:7,speed:1.4})}
      lab(R,[X[2],1.45,0],N.comb+' bytes back from each (BF16)',{dy:-14,b:1,c:P.c4,fs:13,a});lab(R,[X[2],1.45,0],N.tok+' MB per token over '+N.L+' layers',{dy:4,c:P.mute,fs:12,a})}
    // overlap: batch 1's tokens travel while batch 2 computes attention
    a=ov;
    if(a>0){for(let g=0;g<4;g++)for(let h=1;h<4;h++)if(h!==g){const p=ex(h,(g+h)%8);R.flowArc([X[g],YA+.05,.1],[p[0],.5,p[2]],.4,{c:P.c2,a:a*.7,r:.05,n:4,speed:1.5})}
      lab(R,[X[3]+.7,YB,0],'batch 2 · computing attention',{al:'left',dx:8,fs:12.5,b:1,c:P.c1,a,wide:1});lab(R,[X[3]+.7,YA,0],'batch 1 · tokens in flight',{al:'left',dx:8,fs:12.5,b:1,c:P.c2,a,wide:1});}
  }
  const st=S3.stage({id:'stg-ep',list:'sx-ep',fig:'Fig. 5 · one MoE layer under expert parallelism',cam:[.12,.62],bounds:[[-4.4,0,-1],[4.4,1.6,1.3]],aspect:.44,dur:1500,hold:4800,draw,
    view:k=>DDP('stg-ep',k===3?{cam:[.12,.55],bounds:[[-4.4,0,-1],[6.6,1.8,1.3]]}:null,[.12,.62]),margin:w=>w<520?[16,10,14,10]:[22,18,18,18]});
  (window.DDSTG=window.DDSTG||{})['stg-ep']=st;
})();
