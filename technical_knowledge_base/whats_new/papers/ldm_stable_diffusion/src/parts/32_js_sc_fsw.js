// ---- Scene: Fig. 4, the paper's f sweep as tensors to scale (renderer v2: glass faces, flowing dots, camera per step) ----
// One 256 x 256 x 3 image and its latent at each factor f of Section 4.1, every box drawn with one length per number on all three axes
// (side h = 256 / f, height c channels), so volume is proportional to the count of numbers. Shapes: Table 13 (PAPER.rc.derived.latent,
// recomputed in src/recompute.py, the LDM-32 misprint corrected); the step list quotes Table 8's reconstruction FIDs;
// batch size on one A100: Table 13 (PAPER.rc.derived.t13_batch). The last step stands each batch size beside its tensor as a white column.
(function(){
  if(!document.getElementById('stg-fsw')||!window.S3||!window.PAPER)return;const {at,mix}=S3;
  const RC=PAPER.rc.derived,FS=[1,2,4,8,16,32],L=RC.latent,B=RC.t13_batch,K=1/64;  // 64 numbers per world unit on every axis
  // positions along x: each tensor centred in its own slot, small gaps
  const XS=[];{let x=-5.3;FS.forEach(f=>{const s=L[f].shape[0]*K;XS.push(x+s/2);x+=s+.55})}
  const fmtN=n=>n.toLocaleString('en-GB');
  function tensor(R,i,a,hi){const f=FS[i],[h,w,c]=L[f].shape,P=R.P,s=h*K,ht=c*K,x=XS[i],col=f===1?mix(P.paper,P.c5,.35):mix(P.paper,hi?P.c2:P.c1,.35);
    R.box([x,0,0],[s,ht,s],{fill:col,a,shadow:a>.5});
    const n=Math.min(h,32);R.glass([x-s/2,ht+.002,-s/2],[s,0,0],[0,0,s],{c:f===1?P.c5:P.c1,a:a*.8,nu:n,nv:n,th:.004})}
  function draw(R,k,e){const P=R.P;R.grid(-5.6,5.6,-3,2.4,.5);
    const cur=k<6?k:-1;
    FS.forEach((f,i)=>{if(i>k&&k<6)return;const a=k===6?1:i===cur?(i===k?Math.max(.15,e):1):.28,hi=f===4||f===8;
      tensor(R,i,i===k&&k<6?e:a,k===6&&hi);
      const [h,w,c]=L[f].shape,nm=f===1?'LDM-1':'f = '+f;
      if(i===cur){R.label([XS[i],c*K,h*K/2],nm+' · '+h+' × '+w+' × '+c,{mono:true,fs:12,b:1,c:P.ink,dy:16});
        R.label([XS[i],c*K+.05,0],fmtN(L[f].numbers)+' numbers'+(f>1?' · '+L[f].ratio+'× fewer':''),{mono:true,fs:12.5,b:1,c:P.ink,dy:-14})}
      else if(k<6&&i===0)R.label([XS[i],c*K,h*K/2],nm,{mono:true,fs:12,c:P.mute,dy:16})});
    // the encoder squeezing the image into the current latent
    if(k>=1&&k<6){const s0=256*K,xi=XS[k],s=L[FS[k]].shape[0]*K;[-.35,0,.35].forEach(dz=>R.flowArc([XS[0]+s0*.3,.06,dz*s0],[xi,L[FS[k]].shape[2]*K+.02,dz*s],.5+.08*k,{c:P.c1,a:e,r:.05,speed:1.4,n:7}))}
    // the last step: the batch each LDM trained with on one A100 (Table 13), to scale, as a row of white columns behind the tensors, evenly spaced
    if(k===6)FS.forEach((f,i)=>{const b=B[f].batch,hh=b/112*2,hi=f===4||f===8,x=-4+i*1.6;
      R.box([x,0,-2.6],[.5,Math.max(.01,hh*e),.3],{fill:hi?mix(P.paper,P.c2,.55):P.paper});R.label([x,hh*e,-2.6],''+b,{mono:true,fs:12.5,b:1,c:hi?P.c2:P.ink,dy:-10,a:e});R.label([x,0,-2.45],f===1?'LDM-1':'f = '+f,{mono:true,fs:12,c:hi?P.c2:P.mute,dy:12,a:e,wide:1});
      if(i===0)R.label([x-.4,.3,-2.6],'batch on one A100',{mono:true,fs:12,al:'right',dx:-4,c:P.mute,a:e,wide:1})})}
  const full={cam:[.18,.5],bounds:[[-5.4,0,-2.9],[5.4,2.2,2.1]]};
  const v=i=>{const s=L[FS[i]].shape[0]*K,r=Math.max(.45,s*.75);return {cam:[.3,.6],bounds:[[XS[i]-r,0,-r],[XS[i]+r,Math.max(.5,L[FS[i]].shape[2]*K+.25),r]]}};
  S3.stage({id:'stg-fsw',list:'sx-fsw',fig:'Fig. 4 · the f sweep, tensors to scale',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1600,hold:4600,draw,
    view:k=>k===0?{cam:[.25,.62],bounds:[[XS[0]-2.2,0,-2.2],[XS[0]+2.2,.4,2.2]]}:k>=1&&k<=3?{cam:[.22,.58],bounds:[[XS[0]-2.1,0,-2.1],[XS[k]+L[FS[k]].shape[0]*K/2+.3,1,2.1]]}:k<6?v(k):full,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,16]});
})();
