// ---- Scene (Fig. 2, the Idea): Equation 3 on a real matrix, the toy's frozen Wv, the trained A and B, their product against the known edit, the merge (renderer v2) ----
// Data, all from the page's own files: the 8-bit base W0 = Wv (LORA_DATA.base), the kept adapter of task v4 (seed 1, r = 4, Wq and Wv adapted;
// LORA_DATA.adapters.v4['1']['4'].Wv, scale alpha/r = 2), the task's true edit dW* (LORA_DATA.teachers.v4, rank 4) and the sweep summary.
// Geometry, as h = W x reads: a matrix lies flat, its columns (inputs) along x and its rows (outputs) along z; x enters along the columns from the
// front, h leaves along the rows at the side. A (r x 32) sits in front of the update with its columns aligned, B (32 x r) beside it with its rows aligned,
// so BA lies exactly over the square they frame. Every bar is one weight (up positive, down negative), all matrices at one scale.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-lora')||!window.S3||!window.LORA||!window.LORA_DATA)return;const {at,off,lerp,mix}=S3;
  const E=window.LORA,LD=window.LORA_DATA,N=32,R=4;
  // ---- the numbers (also read by check_stages.mjs through window.LORA_SC) ----
  const base=E.loadBase(LD.base),W0=base.Wv,ad=LD.adapters.v4['1'][String(R)].Wv;
  const A=E.decode(ad.A,ad.sA,R*N),B=E.decode(ad.B,ad.sB,N*R),sc=ad.s;
  const dW=E.deltaW({full:false,lora:{Wv:{A,B,r:R,s:sc}}},'Wv');
  const T=E.loadTeacher(LD.teachers.v4),dT=E.deltaW({full:false,lora:{Wv:T}},'Wv');
  let dot=0;for(let i=0;i<N*N;i++)dot+=dW[i]*dT[i];
  const svL=Array.from(E.svd(dW,N,N).S).slice(0,R),svT=Array.from(E.svd(dT,N,N).S).slice(0,T.r);
  const sum=LD.summary.find(x=>x.task==='v4'&&x.method==='lora'&&x.targets==='Wq+Wv'&&x.r===R&&x.scaling==='r'&&x.mode==='tuned');
  const MG=new Float64Array(N*N);for(let i=0;i<N*N;i++)MG[i]=W0[i]+dW[i];
  const amax=a=>a.reduce((m,v)=>Math.max(m,Math.abs(v)),0),M=Math.max(amax(W0),amax(MG),amax(dT));
  const MA=amax(A),MB=amax(B),MU=Math.max(amax(dW),amax(dT));
  window.LORA_SC={n:N,r:R,scale:sc,frozen:N*N,trainable:R*N+N*R,svL,svT,cos:dot/E.fro(dW)/E.fro(dT),changed:sum?sum.changed:null,rankT:T.r,seed:1,steps:LD.cfg.steps};
  // ---- layout ----
  const c=.1,S=N*c,Y0=.62,HM=.55,bw=c*.62;
  const WX=-2.6,DX=2.3,HX=-.5,PZ=0,TZ=-3.95;                // W0, the update, h, the true edit behind
  const AZ=S/2+.3+R*c/2,BXc=DX-S/2-.3-R*c/2,XZ=S/2+.5;      // A in front of the update, B beside it, x in front of W0
  // a matrix as a glass plate with one signed bar per entry: centre (cx, cz), nr rows along z, nc columns along x
  function field(R3,cx,cz,vals,nr,nc,m,fill,a,gc,ga,hm){if(a<=.01)return;hm=hm||HM;
    R3.glass([cx-nc*c/2,Y0,cz-nr*c/2],[nc*c,0,0],[0,0,nr*c],{c:gc,a:(ga==null?a:ga)*.9,nu:Math.max(1,nc/4),nv:Math.max(1,nr/4),th:.03});
    if(!vals)return;for(let i=0;i<nr;i++)for(let j=0;j<nc;j++){const v=vals[i*nc+j],h=Math.max(.006,Math.abs(v)/m*hm),x=cx-nc*c/2+c*(j+.5),z=cz-nr*c/2+c*(i+.5);
      R3.box([x,v>=0?Y0:Y0-h,z],[bw,h,bw],{fill:typeof fill==='function'?fill(v):fill,a,shadow:false,lw:.35,ea:.3})}}
  // a vector as a white plinth (no values: the input is any token's)
  const plinth=(R3,c0,len,alongZ,a)=>R3.box([c0[0],Y0-.05,c0[2]],alongZ?[.16,.05,len]:[len,.05,.16],{a,shadow:false});
  function draw(R3,k,e){const P=R3.P;R3.grid(-5,4.6,-6,3.2,.5);
    const acc=mix(P.paper,P.acc,.62),xs=P.c6,gr=P.c3;
    // an update's bars coloured by sign and size (blue positive, orange negative), so the pattern of the learned and the true edit can be compared from above
    const dv=mu=>v=>mix(P.paper,v>=0?P.acc:P.c2,.2+.8*Math.min(1,Math.abs(v)/mu)),dU=dv(MU),dA=dv(MA),dB=dv(MB);
    const merged=k===4?e:0;
    // 1. the frozen matrix (its bars recede while the update is the subject; in step 5 they become W0 + dW)
    const wa=k===0?1:k===4?1:.22;
    let wv=W0;if(merged>0){wv=new Float64Array(N*N);for(let i=0;i<N*N;i++)wv[i]=W0[i]+merged*dW[i]}
    field(R3,WX,PZ,wa>.3?wv:null,N,N,M,merged>.5?mix(P.paper,P.acc,.3*merged):P.paper,Math.max(wa,.25),P.mute);
    R3.label([WX,Y0+.75,PZ-S/2],merged>.5?'W = W₀ + (α/r)BA · 32 × 32':'W₀ · 32 × 32 · frozen',{mono:true,fs:12.5,b:1,c:merged>.5?P.acc:P.ink,a:k===3?.25:1});
    // the input x along the columns, the output h along the rows
    const fa=k===3?.2:1;
    plinth(R3,[WX,0,XZ],S,false,fa);R3.label([WX-S/2,Y0,XZ],'x',{serif:true,fs:15,b:1,al:'right',dx:-8,c:xs,a:fa});
    plinth(R3,[HX,0,PZ],S,true,fa);R3.label([HX,Y0,PZ-S/2],'h',{serif:true,fs:15,b:1,dy:-12,c:xs,a:fa});
    const fl=k===0?Math.min(1,e*1.6):k===3?.15:1;
    for(let j=0;j<4;j++){const xx=WX-S/2+S*(j+.5)/4;R3.flowArc([xx,Y0,XZ],[xx,Y0+.05,PZ+S/2-.1],.35,{c:xs,a:fl,r:.05,speed:1.2,n:5})}
    for(let i=0;i<4;i++){const zz=PZ-S/2+S*(i+.5)/4;R3.flow([[WX+S/2-.05,Y0+.12,zz],[HX,Y0+.12,zz]],{c:xs,a:fl,r:.05,speed:1.1,n:3})}
    // 2. the side path: A (r x 32) in front of the update, B (32 x r) beside it, to scale; random A and zero B before training
    const la=k===0?0:k===1?Math.min(1,e*1.5):k===4?1-e:1,trained=k>=2?(k===2?e:1):0;
    if(la>.01){field(R3,DX,AZ,trained>0?A.map(v=>v*trained):null,R,N,MA,dA,la,P.acc,null,.3);
      field(R3,BXc,PZ,trained>0?B.map(v=>v*trained):null,N,R,MB,dB,la,P.acc,null,.3);
      R3.label([DX+S/2,Y0,AZ],'A · 4 × 32'+(k===1?' · random':''),{mono:true,fs:12,al:'left',dx:28,c:P.acc,a:la,wide:1});
      R3.label([BXc,Y0,PZ+S/2],'B · 32 × 4'+(k===1?' · zeros':''),{mono:true,fs:12,al:'right',dx:-6,dy:22,c:P.acc,a:la,wide:1});
      R3.flowArc([WX+S/2,Y0,XZ],[DX-S/2+.05,Y0+.05,AZ],.45,{c:xs,a:la*(k===3?.2:.9),r:.05,speed:1.3,n:9});
      R3.flow([[DX-S/2+.1,Y0+.08,AZ-R*c/2],[BXc,Y0+.08,PZ+S/2-.1]],{c:P.acc,a:la*(k===3?.2:1),r:.05,speed:1.1,n:3});
      if(k>=2)for(let i=0;i<3;i++){const zz=PZ-S/2+S*(i+.5)/3;R3.flow([[BXc-R*c/2,Y0+.1,zz],[HX,Y0+.1,zz]],{c:P.acc,a:la*(k===3?.2:1),r:.05,speed:1.1,n:3})}}
    // gradients flow back from the output into B and A only (step 3)
    if(k===2){const ga=Math.min(1,e*1.6);for(let i=0;i<3;i++){const zz=PZ-S/2+S*(i+.5)/3;R3.flow([[HX,Y0+.3,zz],[BXc,Y0+.3,zz]],{c:gr,a:ga,r:.055,speed:.9,n:3})}
      R3.flowArc([BXc,Y0+.2,PZ+S/2],[DX-S/2+.3,Y0+.2,AZ],.3,{c:gr,a:ga,r:.055,speed:.9,n:5});
      R3.label([HX+.2,Y0+1.1,PZ+.4],'gradients: A and B only',{mono:true,fs:12,c:gr,a:ga,wide:1})}
    // 3. the update: zero (a dashed square) until training, then (alpha/r) B A, the real trained one; in step 5 it slides into W0
    const da=k===0?0:k===1?Math.min(1,e*1.5):k===4?1-e:1,dx=k===4?lerp(DX,WX,e):DX;
    if(da>.01){if(k<2){R3.quad([[dx-S/2,Y0,PZ-S/2],[dx+S/2,Y0,PZ-S/2],[dx+S/2,Y0,PZ+S/2],[dx-S/2,Y0,PZ+S/2]],{ec:P.mute,ea:.8*da,dash:[5,4],lw:1.2});
        R3.label([dx,Y0+.2,PZ],'ΔW = (α/r)·BA = 0',{mono:true,fs:12.5,b:1,c:P.mute,a:da})}
      else{const g=k===2?e:1;field(R3,dx,PZ,g<1?dW.map(v=>v*g):dW,N,N,M,dU,da,P.acc);
        R3.label(k===3?[dx+S/2,Y0,PZ]:[dx,Y0+.75,PZ-S/2],R3.W<520?'ΔW · rank 4':k===3?'learned ΔW · rank 4':'ΔW = (α/r)·BA · 32 × 32 · rank 4',{mono:true,fs:12.5,b:1,c:P.acc,a:da,al:k===3?'left':'center',dx:k===3?10:0})}}
    // 4. the true edit that defines the task, behind the learned one, at the same scale
    const ta=k===3?Math.min(1,e*1.4):0;
    if(ta>.01){field(R3,DX,TZ,dT,N,N,M,dU,ta,P.c4);R3.label([DX,Y0+.75,TZ-S/2],R3.W<520?'true ΔW* · rank 4':'true edit ΔW* · rank 4 · unknown on GPT-3',{mono:true,fs:12.5,b:1,c:P.c4,a:ta});
      R3.label([DX+S/2,Y0,(TZ+PZ)/2],'cosine '+window.LORA_SC.cos.toFixed(2),{mono:true,fs:12.5,b:1,al:'left',dx:10,c:P.ink,a:ta})}
    // the parameter counts as two columns at the back (step 2): 1,024 frozen against 256 trained
    const pa=k===1?Math.min(1,e*1.4):0;
    if(pa>.01){const hF=1.4,hT=hF*(2*R*N)/(N*N),bx=4.55,bz=-1.1;
      R3.box([bx,0,bz],[.42,hF,.42],{fill:P.paper,a:pa});R3.box([bx+.65,0,bz],[.42,hT,.42],{fill:acc,a:pa});
      R3.label([bx,hF,bz],'1,024 frozen',{mono:true,fs:12,al:'right',dx:-6,dy:-4,c:P.ink,a:pa,wide:1});R3.label([bx+.65,hT,bz],'256 trained',{mono:true,fs:12,al:'left',dx:14,c:P.acc,a:pa,wide:1})}
  }
  const full={cam:[.18,.78],bounds:[[-4.5,0,-1.8],[5.2,1.1,2.5]]};
  S3.stage({id:'stg-lora',list:'sx-lora',fig:'Fig. 2 · LoRA on the toy\'s Wv: frozen W₀, trained A and B, the known edit',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,24,18,24],
    view:k=>k===0?{cam:[.2,.72],bounds:[[-4.6,0,-1.8],[.2,1.3,2.8]]}:k===3?{cam:[.12,1.0],bounds:[[.5,0,-5.8],[4.1,1,1.8]]}:k===4?{cam:[.18,.74],bounds:[[-4.6,0,-1.9],[.6,1.3,2.8]]}:full});
})();
