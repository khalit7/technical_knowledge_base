// ---- Scene, Fig. 4 (section 8): two nested vmaps of a dot product becoming one dot_general (JC.vm.nested, run_vmap.py: q f32[6,32], k f32[7,32],
// output f32[6,7], the printed jaxpr). Vectors are drawn as bars by shape only (no values); the per-pair operations are small glass plates above the
// output grid that merge, first along a row (vmap over keys), then over the rows (vmap over queries), into one batched plate.
// Steps are explained by #sx-vmap on the left. ----
(function(){
  if(!document.getElementById('stg-vmap')||!window.JCS||!window.JC)return;const {at,off,lerp,mix}=S3,{lab,tint}=JCS;
  const N=JC.vm.nested,M=N.shape[0],K=N.shape[1];                                      // 6 queries, 7 keys
  const dimOf=s=>{const m=N.jaxpr.match(new RegExp(s+':f32\\[([0-9,]+)\\]'));return m?m[1]:''};
  const D=+(dimOf('a').split(',')[1]||32);                                               // 32, the vector length
  const CS=.52,xj=j=>(j-(K-1)/2)*CS,zi=i=>(i-(M-1)/2)*CS,YP=1.15,LQ=2.6,QX=xj(0)-CS/2-.35-LQ/2,KZ=zi(0)-CS/2-.35-LQ/2;
  function draw(R,k,e){const P=R.P,ph=R.W<520;R.grid(-5,2.6,-4.4,2.2,.5);   // ph: a phone-width canvas gets the short form of the long labels
    // which pairs are being computed at this step
    const rowsOn=k===0?[0]:k===1?[0]:Array.from({length:M},(_,i)=>i),colsOn=k===0?[0]:Array.from({length:K},(_,j)=>j);
    // q: one bar per query, along x, left of the grid; k: one bar per key, along z, behind it
    for(let i=0;i<M;i++){const on=rowsOn.includes(i),a=on?1:k===1?.3:.22;R.box([QX,0,zi(i)],[LQ,.12,.15],{fill:tint(P,P.q,on?.7:.35),a,shadow:false});}
    for(let j=0;j<K;j++){const on=colsOn.includes(j),a=on?1:.22;R.box([xj(j),0,KZ],[.15,.12,LQ],{fill:tint(P,P.k,on?.7:.35),a,shadow:false});}
    lab(R,[QX,0,zi(M-1)+.2],'q · f32['+M+','+D+']',{mono:true,fs:12.5,b:1,dy:15,c:P.q});
    lab(R,[xj(K-1)+.2,0,KZ],'k · f32['+K+','+D+']',{mono:true,fs:12.5,b:1,al:'left',dx:8,c:P.k});
    // the output grid: empty slots, filled as the pairs are computed
    for(let i=0;i<M;i++)for(let j=0;j<K;j++){const on=rowsOn.includes(i)&&colsOn.includes(j),done=k===3||(k===2)||(k===1&&i===0)||(k===0&&i===0&&j===0);
      const g=on&&k<3?Math.min(1,e*1.4):1;
      if(done)R.box([xj(j),0,zi(i)],[CS*.78,.3*g+.01,CS*.78],{fill:tint(P,P.acc,.55),a:on||k===3?1:.5,shadow:false});
      else R.box([xj(j),0,zi(i)],[CS*.78,.01,CS*.78],{fill:P.paper,a:.5,fa:.2,shadow:false})}
    // flows: each query along its row, each key along its column, into the cells being computed
    rowsOn.forEach(i=>{const x1=k===0?xj(0):xj(K-1);R.flow([[QX+LQ/2,.08,zi(i)],[x1,.2,zi(i)]],{c:P.q,r:.06,a:k===3?.5:e,n:Math.max(3,Math.round((x1-QX)*1.3))})});
    colsOn.forEach(j=>{const z1=k===0||k===1?zi(0):zi(M-1);R.flow([[xj(j),.08,KZ+LQ/2],[xj(j),.2,z1]],{c:P.k,r:.06,a:k===3?.5:e,n:Math.max(3,Math.round((z1-KZ)*1.3))})});
    // the operations as glass plates above the grid
    const pc=P.acc,w=CS*.8;
    if(k===0){R.glass([xj(0)-w/2,YP,zi(0)-w/2],[w,0,0],[0,0,w],{c:pc,a:e,nu:1,nv:1});lab(R,[xj(0),YP,zi(0)-w/2],(ph?'dot → f32[]':'dot: f32['+D+'] · f32['+D+'] → f32[]'),{mono:true,fs:12.5,b:1,dy:-12,c:pc,a:e})}
    if(k===1){const t=Math.max(0,Math.min(1,e*1.8-.6));
      // seven per-pair plates close up into one plate over the row
      for(let j=0;j<K;j++){const x0=lerp(xj(j)-w/2,xj(0)-CS/2+.02+j*CS*(1-0)/1,t),ww=lerp(w,CS,t);R.glass([x0,YP,zi(0)-w/2],[ww,0,0],[0,0,w],{c:pc,a:Math.min(1,e*2)*(1-.4*t),nu:1,nv:1,th:.04})}
      if(t>.6)lab(R,[0,YP,zi(0)-w/2],(ph?'one dot_general → f32['+K+']':'one dot_general: f32['+D+'] × f32['+K+','+D+'] → f32['+K+']'),{mono:true,fs:12.5,b:1,dy:-12,c:pc,a:(t-.6)/.4});
      else lab(R,[0,YP,zi(0)-w/2],(ph?K+' per-pair dots':K+' per-pair dots, if it were a loop'),{fs:12.5,b:1,dy:-12,c:P.mute,a:Math.min(1,e*2)})}
    if(k===2){const t=Math.max(0,Math.min(1,e*1.8-.6)),wr=K*CS;
      for(let i=0;i<M;i++){const z0=lerp(zi(i)-w/2,zi(0)-CS/2+i*CS,t),d=lerp(w,CS,t),y=YP+(1-t)*(i*.05);R.glass([xj(0)-CS/2,y,z0],[wr,0,0],[0,0,d],{c:pc,a:Math.min(1,e*2)*(1-.35*t),nu:K,nv:1,th:.04})}
      lab(R,[0,YP,zi(0)-CS/2],t>.6?(ph?'one dot_general → f32['+M+','+K+']':'one dot_general: f32['+M+','+D+'] × f32['+K+','+D+'] → f32['+M+','+K+']'):M+' row plates, one per query',{mono:true,fs:12.5,b:1,dy:-12,c:t>.6?pc:P.mute})}
    if(k===3){R.glass([xj(0)-CS/2,YP,zi(0)-CS/2],[K*CS,0,0],[0,0,M*CS],{c:pc,a:1,nu:K,nv:M,th:.05});
      lab(R,[0,YP,zi(0)-CS/2],(ph?'one dot_general, no loop':'dot_general · contracting dims ([1], [1]) · no loop'),{mono:true,fs:12.5,b:1,dy:-12,c:pc,a:1});
      lab(R,[xj(K-1)+CS/2,0,zi(M-1)],'f32['+M+','+K+']',{mono:true,fs:12.5,b:1,al:'left',dx:8,c:P.acc})}
  }
  const full={cam:[.55,.72],bounds:[[-5,0,-4.2],[2.4,1.4,1.9]]};
  const st=S3.stage({id:'stg-vmap',list:'sx-vmap',fig:'Fig. 4 · nested vmaps of a dot product (shapes from the run)',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1700,hold:5000,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,18,16],
    view:k=>k===0?{cam:[.5,.62],bounds:[[-3.6,0,-2.6],[1,1.4,1.2]]}:full});
  (window.JCSTG=window.JCSTG||{})['stg-vmap']=st;
})();
