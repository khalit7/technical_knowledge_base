// ---- Scene (Figure 1 of the paper, in 3D): one GPU's model states per ZeRO stage, stacked to scale, and what each GPU sends per step (renderer v2) ----
// Rows in depth are the four stages (baseline DP at the back, ZeRO-3 at the front); along each row, towers are GPUs (four drawn of N_d), each a stack of
// three slabs: fp16 parameters 2Ψ, fp16 gradients 2Ψ, fp32 optimiser states KΨ with K = 12, in bytes, from zParts() in 12_js_zero.js (§5.1 to §5.3).
// At the end of each row, unit cubes count the volume one GPU sends per step in Ψ elements (zComm(), §7): blue an all-gather of parameters, orange a
// reduce-scatter of gradients. Each step brings in one stage: its row appears at the previous stage's heights and the slab it partitions shrinks to
// its 1/N_d share; flows run round the ring of drawn GPUs for each collective. The purple glass is a 32 GB V100, the paper's GPU. Model and N_d are
// chosen under the step list (#f1M, #f1N); the numbers in the list follow them (window.ZF1 is read by check_stages.mjs).
(function(){
  if(!document.getElementById('stg-f1'))return;const {at,lerp,mix}=S3;
  const ZR=[-2.4,-.8,.8,2.4],XS=[-2.3,-1.4,-.5,.8],TW=.62,TOP=2.4,CAP=32e9,XC=1.85,CU=.36;
  const KIND={dp:['g','p'],os:['g','p'],os_g:['g','p'],os_g_p:['p','p','g']};
  let psi=7.5e9,nd=64;
  const parts=st=>zParts(psi,nd,st),tot=st=>parts(st).reduce((a,b)=>a+b,0);
  const u=()=>TOP/Math.max(16*psi,CAP);
  const nDrawn=()=>Math.min(4,nd),slot=i=>nd>4&&i===3?nd-1:i;
  const C=P=>({p:P.c1,g:P.c2,o:P.c3});
  // heights of row r at step k, progress e: it appears at the previous stage's heights, then the slab it partitions shrinks
  function rowVals(r,k,e){const now=parts(STAGES[r]);if(r===0||k>r)return now;const was=parts(STAGES[r-1]),t=Math.max(0,Math.min(1,(e-.3)/.7));return now.map((v,i)=>lerp(was[i],v,t))}
  function rowAlpha(r,k,e){if(k<r)return 0;if(k===4)return 1;if(r===k)return r===0?Math.max(.05,e):Math.min(1,e*3);return .28}
  function draw(R,k,e){const P=R.P,col=C(P),U=u();R.grid(-3.8,3.6,-3.4,3.4,.5);
    // the V100's 32 GB: a glass plane over every row
    const yC=CAP*U;R.glass([-2.75,yC,-3.0],[4.0,0,0],[0,0,6.0],{c:P.c4,a:.2,nu:8,nv:8});
    R.label([-2.75,yC,3.0],'V100 · 32 GB',{mono:true,fs:12.5,b:1,c:P.c4,al:'right',dx:-6,grp:'slab'});
    STAGES.forEach((st,r)=>{const a=rowAlpha(r,k,e);if(a<=.01)return;const z=ZR[r],v=rowVals(r,k,e),live=k===r&&k<4,n=nDrawn();
      // the towers: parameters at the bottom, then gradients, then optimiser states
      for(let i=0;i<n;i++){const x=XS[i];let y=0;
        [['p',v[0]],['g',v[1]],['o',v[2]]].forEach(([q,b],j)=>{const h=b*U;if(h>.002)R.box([x,y,z],[TW,h,TW],{fill:mix(P.paper,col[q],.68),a,shadow:j===0&&(live||k===4)&&a>.5,lw:.8});y+=h});
        // the copy this stage no longer keeps: a faint outline of the previous stage's tower while the slab shrinks
        if(live&&r>0){const h0=tot(STAGES[r-1])*U;R.box([x,0,z],[TW+.04,h0,TW+.04],{fill:P.paper,fa:.03,ea:.45*(1-e*.5),a,shadow:false,lw:.6})}
        // the V100's 32 GB as a dashed ring round each tower of the active row
        if(live){const m=TW/2+.07;R.line([[x-m,yC,z-m],[x+m,yC,z-m],[x+m,yC,z+m],[x-m,yC,z+m],[x-m,yC,z-m]],{c:P.c4,w:1.6,dash:[5,3],top:true,a:e})}}
      if(nd>4)R.label([.15,.12,z],'…',{fs:15,b:1,c:P.mute,a:Math.max(.4,a)});
      // GPU names under the active row (the front row at the summary)
      if(live||(k===4&&r===3))for(let i=0;i<n;i++)R.label([XS[i],0,z+TW/2+.05],'GPU '+slot(i),{mono:true,fs:12,c:P.mute,dy:12,wide:1});
      // what one GPU sends per step, in Ψ: unit cubes on a white plinth at the end of the row
      R.box([XC,0,z],[CU+.22,.05,CU+.22],{a,shadow:a>.5});
      KIND[st].forEach((q,j)=>R.box([XC,.05+j*(CU+.03),z],[CU,CU,CU],{fill:mix(P.paper,col[q],.7),a:a*(live?Math.min(1,e*2+(j===0?.5:0)):1),shadow:false,lw:.8}));
      R.label([XC+CU/2+.12,.05+KIND[st].length*(CU+.03)/2,z],SSHORT[st]+' · '+gb(tot(st))+' GB · '+zComm(st)+'Ψ',{mono:true,fs:12.5,b:1,al:'left',dx:6,c:P.ink,a:live||k===4?1:0,grp:'rows'});
      // on the active row: the stack's total above GPU 0, its slabs named on the left, and the collectives flowing round the ring
      if(live){const top=(v[0]+v[1]+v[2])*U;
        // wide screens: a column of names on the left of GPU 0 (total, then the slabs top down); a phone gets the total only, above the tower
        if(R.W<520)R.label([XS[0],top,z],gb(v[0]+v[1]+v[2])+' GB',{mono:true,fs:13,b:1,dy:-12,a:e});
        R.label([XS[0]-TW/2,top+.12,z],'GPU 0 · '+gb(v[0]+v[1]+v[2])+' GB',{mono:true,fs:12.5,b:1,al:'right',dx:-8,grp:'slab',a:e});
        let y=0;[['parameters',v[0],'p'],['gradients',v[1],'g'],['optimiser states',v[2],'o']].forEach(([nm,b,q])=>{const h=b*U;R.label([XS[0]-TW/2,y+h/2,z],nm,{mono:true,fs:12,c:col[q],al:'right',dx:-8,grp:'slab',a:e});y+=h});
        if(n>1)KIND[st].forEach((q,j)=>{const hh=.32+.26*j,fa=Math.min(1,e*2);
          for(let i=0;i<n;i++){const i2=(i+1)%n;if(i2===0&&n<3)continue;const ya=(v[0]+v[1]+v[2])*U+.04,A=[XS[i],ya,z],B=[XS[i2],ya,z];
            R.flowArc(A,B,i2===0?hh+.35:hh,{c:col[q],a:fa*.9,r:.055,n:i2===0?7:4,speed:1.2})}})}
    })}
  function fill(){const T=STAGES.map(st=>tot(st)),def=psi===7.5e9&&nd===64,r0=T[0]/CAP;
    const F={nd:fmt(nd),psi:psiTxt(psi),drawn:nd>4?'four drawn':'all drawn',m0:gb(T[0]),x0:r0>=1?fmt(r0,1)+' times':fmt(100*r0,0)+'% of',m1:gb(T[1]),
      v1:T[1]>CAP?'still over the 32 GB':T[1]>.75*CAP?'just under the 32 GB, with almost nothing left for activations':'well under the 32 GB',
      m2:gb(T[2]),m3:gb(T[3]),m3n:def?' (Figure 1 prints 1.9)':'',all:T.map(t=>gb(t)).join(', ')};
    document.querySelectorAll('#sx-f1 [data-f1]').forEach(el=>{const x=F[el.dataset.f1];if(x!=null)el.textContent=x});
    $('f1Nv').textContent=fmt(nd);
    $('f1Rep').innerHTML='Per GPU: '+STAGES.map((st,i)=>SSHORT[st]+' '+gb(T[i])+' GB').join(', ')+'. '+(def?'<b>Defaults reproduce Figure 1</b> (120, 31.4, 16.6 and 1.9 GB) independently, from the formulas.':'Figure 1 is 7.5B at N<sub>d</sub> = 64.')+' Heights are to scale within a model; a slab under a pixel thick is still drawn.';
    window.ZF1={psi,nd,gb:T.map(t=>t/1e9),comm:STAGES.map(zComm),cubes:STAGES.map(st=>KIND[st].length)}}
  const full={cam:[.5,.5],bounds:[[-2.9,0,-3.1],[2.3,TOP+.25,3.1]]};
  const rowView=k=>{const U=u(),z=ZR[k],prev=k>0?tot(STAGES[k-1]):tot(STAGES[0]),yt=k===0?TOP+.3:Math.max(prev,CAP)*U*1.12+.3;
    return {cam:[.42,.42],bounds:[[-2.9,0,z-.8],[2.3,yt,z+.8]]}};
  const stg=S3.stage({id:'stg-f1',list:'sx-f1',fig:'Figure 1 · model states per GPU, to scale',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1600,hold:5200,draw,
    // each stage's step moves the camera onto its row (closer as the towers shrink); the last step pulls back to all four rows
    view:k=>k<4?rowView(k):full,
    margin:w=>w<520?[16,10,14,10]:[18,175,16,130]});
  const upd=()=>{psi=+$('f1M').value*1e9;nd=ND_STEPS[+$('f1N').value];fill();if(stg)stg.draw()};
  ['f1M','f1N'].forEach(id=>{$(id).addEventListener('input',upd);$(id).addEventListener('change',upd)});
  upd();
})();
