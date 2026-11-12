// ---- Scene, Fig. 2 (section 1): one training step's FLOPs built up as a volume, Llama 3.1 8B (renderer v2).
// The floor is what each token multiplies against: every weight of the model, one square unit per billion (projections, MLP, output head;
// the input embedding is a lookup, so it lies flat), and for attention the keys and values each query meets, 2 x L x T x h numbers.
// The height is the FLOPs spent per number per token: 2 forward (a multiply and an add), 4 more backward (the input's gradient and the weight's),
// and for FlashAttention's core 5 backward (it recomputes the scores). Volume is FLOPs per token. Numbers from window.PMD (the counted
// ledger_l8 at 8,192 and 131,072 tokens, l8_P, l8_emb, l8_matmulN) and the config (h 4,096, 32 layers, 8 KV heads of 128, MLP 14,336, vocabulary 128,256).
// Step 1 draws one 4,096 x 4,096 weight larger than the model's scale (said in its step). Positions are illustrative; areas and heights are to scale.
(function(){
  if(!document.getElementById('stg-flops')||!window.PMD)return;const {at,off,mix,lerp}=S3;
  const D=window.PMD,G=1e9,h=4096,L=32,Lg=D.ledger_l8,A=Lg['8192'],B=Lg['131072'];
  const NP=A.proj/6,NM=A.mlp/6,NH=A.head/6,NE=D.l8_emb,NA8=2*L*8192*h,NA128=2*L*131072*h;
  const n=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  window.PM_FLOPS={np:NP,nm:NM,nh:NH,ne:NE,na8:NA8,na128:NA128,fwd:2*(NP+NM+NH),six_mm:A.six_n_matmul,six_n:A.six_n,tot8:A.traced_total,tot128:B.traced_total,
    att8:A.core_fwd+A.core_bwd_flash,att128:B.core_fwd+B.core_bwd_flash,mm1:2*h*h,mm8k:2*8192*h*h}; // checked by check/check_stages.mjs
  const DZ=1.6,HU=.3,GAP=.22,X0=-3.0;
  const parts=[['projections',NP,'c1'],['MLP',NM,'c1'],['head',NH,'c1'],['embedding',NE,null]];let x=X0;
  parts.forEach(p=>{p.x0=x;p.len=p[1]/G/DZ;x+=p.len+GAP});
  const AX0=x+.35;
  function slabs(R,x0,len,dz,h0,hs,cols,a){let y=h0;hs.forEach((hh,i)=>{if(hh>.002)R.box([x0+len/2,y,0],[len,hh,dz],{fill:cols[i],a,shadow:y===0,lw:.6});y+=hh});return y}
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-4,10,-3.4,3.4,.5);
    const cF=mix(P.paper,P.c1,.5),cBi=mix(P.paper,P.c4,.45),cBw=mix(P.paper,P.c4,.7),cA=mix(P.paper,P.c5,.5),cAb=mix(P.paper,P.c5,.75);
    // 1. one matmul, drawn large: a token's 4,096 numbers through a 4,096 x 4,096 weight, 2 FLOPs per weight
    const ma=k===0?1:k===1?Math.max(0,1-e*2):0;
    if(ma>.01){const C=[-.4,0,0],S=2;
      R.glass([C[0]-S/2,.03,C[2]-S/2],[S,0,0],[0,0,S],{c:P.c1,a:ma,nu:8,nv:8,th:.03});
      R.box([C[0]-S/2-.3,0,C[2]],[.14,.14,S],{fill:cF,a:ma});
      for(let i=1;i<=6;i++)R.box([C[0]-S/2-.3-i*.22,0,C[2]],[.12,.12,S],{fill:cF,a:ma*(.55-i*.07),shadow:false});
      R.box([C[0],0,C[2]+S/2+.32],[S,.14,.14],{fill:mix(P.paper,P.c1,.75),a:ma*(k===0?e:1)});
      R.box([C[0],.04,C[2]],[S,2*HU,S],{fill:cF,a:ma*.35*(k===0?e:1),shadow:false});
      [-.7,-.2,.3,.8].forEach((z,i)=>{const xe=C[0]-.75+i*.5;R.flow([[C[0]-S/2-.3,.18,z],[xe,.18,z],[xe,.18,C[2]+S/2+.3]],{c:P.c1,a:ma,r:.06,n:7,speed:1.2})});
      lab([C[0]-S/2,.03,C[2]-S/2],'W · 4,096 × 4,096',{al:'right',dx:-8,b:1,c:P.c1,a:ma});
      lab([C[0]-S/2-.3,.14,C[2]+S/2],'x · one token',{dy:16,al:'right',dx:-4,fs:12,a:ma});
      lab([C[0]-S/2-1.4,.1,C[2]-S/2],'8,192 tokens',{dy:-10,fs:12,c:P.mute,a:ma});
      lab([C[0]+S/2,.14,C[2]+S/2+.32],'y = x W',{al:'left',dx:10,dy:-14,fs:12,a:ma*(k===0?e:1)});
      lab([C[0]-S/2,0,C[2]+S/2+.32],'2 FLOPs per weight: '+n(2*h*h/1e6,1)+' MFLOP per token',{al:'left',dy:26,b:1,a:ma*(k===0?e:1)});
      lab([C[0]-S/2,0,C[2]+S/2+.32],'× 8,192 tokens = '+n(2*8192*h*h/G,0)+' GFLOP',{al:'left',dy:44,fs:12,a:ma*(k===0?e:1)})}
    // 2 to 5: the whole model's floor, one square unit per billion numbers; height = FLOPs per number per token
    const fa=k===1?Math.max(0,e*2-1):k>=1?1:0;
    if(fa>.01){const hf=k===1?2*HU*Math.max(0,e*2-1):2*HU,hb=k===2?4*HU*e:k>2?4*HU:0,dim=k>=3?.45:1;
      parts.forEach((p,i)=>{if(!p[2]){R.quad([[p.x0,.01,-DZ/2],[p.x0+p.len,.01,-DZ/2],[p.x0+p.len,.01,DZ/2],[p.x0,.01,DZ/2]],{fill:mix(P.paper,P.ink,.12),ec:P.mute,a:fa});
          if(k===2)R.box([p.x0+p.len/2,0,0],[p.len,6*HU*e,DZ],{fill:P.paper,fa:.05,ec:P.bad,a:.8,shadow:false});return}
        slabs(R,p.x0,p.len,DZ,0,[hf,hb/2,hb/2],[cF,cBi,cBw],fa*dim)});
      // the token's activations move forward through the parts, then the gradient comes back
      if(k===1)R.flow([[X0,hf+.12,.3],[parts[2].x0+parts[2].len,hf+.12,.3]],{c:P.c1,a:fa,r:.07,speed:1.4});
      if(k===2)R.flow([[parts[2].x0+parts[2].len,2*HU+hb+.12,-.3],[X0,2*HU+hb+.12,-.3]],{c:P.c4,a:e,r:.07,speed:1.4});
      parts.forEach((p,i)=>{if(k<4||i===1)lab([p.x0+p.len/2,0,DZ/2],p[0]+' '+n(p[1]/G,2)+'B',{dy:16,fs:12,c:p[2]?P.ink:P.mute,a:fa*(k>=3?.6:1),grp:i===2||i===3?'nm':undefined})});
      if(k===1)lab([parts[1].x0+parts[1].len/2,hf,0],'forward 2N: '+n(2*(NP+NM+NH)/G,1)+' GFLOP per token',{dy:-26,b:1,c:P.c1,a:fa});
      if(k===2){lab([parts[1].x0+parts[1].len/2,6*HU,0],'6N: '+n(A.six_n_matmul/G,1)+' GFLOP per token',{dy:-30,b:1,c:P.c4,a:e});
        lab([parts[3].x0+parts[3].len/2,6*HU,-DZ/2],'6N also counts these: '+n(A.six_n/G,2),{dy:-14,fs:12,c:P.bad,a:e})}
      if(k<4)lab([X0,HU,-DZ/2],'forward ×2',{al:'right',dx:-8,fs:12,c:P.c1,a:fa*(k>=3?.5:1),grp:'h'});
      if(k===2||k===3)lab([X0,4*HU,-DZ/2],'backward ×4',{al:'right',dx:-8,fs:12,c:P.c4,a:k===2?e:.5,grp:'h'})}
    // 4 and 5: attention has no weights but each query meets every earlier key and value: 2LTh numbers, 2 FLOPs forward, 5 backward
    if(k>=3){const s8=Math.sqrt(NA8/G),s=k===3?s8*Math.min(1,e*1.4):lerp(s8,Math.sqrt(NA128/G),e),aa=k===3?Math.min(1,e*1.6):1;
      R.box([AX0+s/2,0,0],[s,2*HU,s],{fill:cA,a:aa,lw:.6});R.box([AX0+s/2,2*HU,0],[s,5*HU,s],{fill:cAb,a:aa,shadow:false,lw:.6});
      R.flowArc([AX0+s*.3,7*HU+.05,0],[parts[0].x0+parts[0].len/2,6*HU*.45+.1,0],1.1,{c:P.c5,a:aa,r:.07,n:10,speed:1.4});
      const T=k===3?8192:131072,tot=k===3?A.traced_total:B.traced_total,att=k===3?A.core_fwd+A.core_bwd_flash:lerp(A.core_fwd+A.core_bwd_flash,B.core_fwd+B.core_bwd_flash,e);
      lab([AX0+s/2,7*HU,0],'attention · '+n((k===3?NA8:lerp(NA8,NA128,e))/G,2)+'B keys and values · '+n(att/G,1)+' GFLOP',{dy:-16,b:1,c:P.c5,a:aa});
      lab([AX0+s,3.5*HU,0],'2 forward + 5 backward',{al:'left',dx:10,fs:12,c:P.c5,a:aa*.9});
      lab([parts[1].x0+parts[1].len/2,6*HU,0],(k===3?n(A.traced_total/G,2)+' GFLOP per token = '+n(A.traced_total/A.six_n,2)+' × 6N':n(B.traced_total/G,1)+' GFLOP per token = '+n(B.traced_total/B.six_n,1)+' × 6N'),{dy:-30,b:1,a:k===4?e:aa})}
  }
  const views=[{cam:[.5,.62],bounds:[[-3.2,0,-1.2],[1,1,2.2]]},{cam:[.36,.6],bounds:[[-3.2,0,-1],[3.1,1.2,1.2]]},{cam:[.36,.6],bounds:[[-3.2,0,-1],[3.1,2,1.2]]},
    {cam:[.32,.62],bounds:[[-3.2,0,-1.2],[5,2.2,1.2]]},{cam:[.36,.7],bounds:[[-3.2,0,-3],[9.6,2.2,3]]}];
  const st=S3.stage({id:'stg-flops',list:'sx-flops',fig:'Fig. 2 · one training step’s FLOPs as a volume, Llama 3.1 8B',cam:views[1].cam,bounds:views[1].bounds,aspect:.6,dur:1600,hold:5200,draw,
    view:k=>views[k]||views[1],margin:w=>w<520?[16,10,16,10]:[28,24,28,110]});
  (window.PMSTG=window.PMSTG||{})['stg-flops']=st;
})();
