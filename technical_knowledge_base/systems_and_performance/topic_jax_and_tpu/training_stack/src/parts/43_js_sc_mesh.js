// ---- Scene, Fig. 3 (section 5): a sharded checkpoint saved on a (data 2, model 4) mesh of 8 simulated CPU devices and restored onto other layouts
// (TS.ckpt_mesh from src/runs/ts_ckpt_mesh.py; the re-sharding count from TS.mesh_det, src/runs/ts_mesh_det.py). Each device box carries its shard of
// fc1's kernel [128, 512] as a glass plate (width to scale with the shard's columns, recorded per layout) and a bias bar (a full copy under P(), a quarter
// under P('model',)). Steps are explained by #sx-mesh on the left. ----
(function(){
  if(!document.getElementById('stg-mesh')||!window.TSS||!window.TS||!TS.ckpt_mesh)return;const {at,off,lerp,mix}=S3,{lab,legs,tint}=TSS;
  const M=TS.ckpt_mesh,T=M.targets,DT=TS.mesh_det&&TS.mesh_det.sharding_changed_by_training,TK=Object.keys(T);
  const COL=['#4e79a7','#f28e2b','#59a14f','#b07aa1','#d4a72c','#76b7b2','#e15759','#9c755f'].map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)));
  const fmtE=v=>v===0?'0':v.toExponential(1).replace('e-0','e-');
  // a mesh of devices: rows along z (data), columns along x (model); returns each device's centre
  function mesh(c,r,cl,sp){const o=[];for(let i=0;i<r;i++)for(let j=0;j<cl;j++)o.push([c[0]+(j-(cl-1)/2)*sp,0,c[2]+(i-(r-1)/2)*sp*1.15]);return o}
  const SRC=mesh([-4.2,0,0],2,4,.78),STORE=[0,0,0];
  const TP=TK.map((k,i)=>[4.1,0,-2.6+i*1.3]);
  function dev(R,p,s,a,o){o=o||{};R.box(p,[s,.2,s],{fill:o.fill||R.P.paper,a,shadow:o.shadow!==false});}
  // a device's share of fc1's kernel [128, 512]: a glass plate whose width is the fraction of the 512 columns it holds, at that block's offset
  function shard(R,p,s,cols,blk,c,a){const f=cols/512,w=s*.92*f,x0=p[0]-s*.46+blk*w;R.glass([x0,.24,p[2]-s*.32],[w,0,0],[0,0,s*.64],{c,a,nu:Math.max(1,Math.round(f*8)),nv:3,th:.025})}
  function draw(R,k,e){const P=R.P,ph=R.W<520;R.grid(-6.4,6.4,-3.6,3.4,.5);
    // ---------- the saved mesh
    const sA=k<=2?1:k===3?.6:.35,S=.6;
    SRC.forEach((p,i)=>{const col=i%4,row=Math.floor(i/4);dev(R,p,S,sA);
      shard(R,p,S,128,col,COL[col],sA);
      // the fc1 bias: a full bar on every device under P(); after one step a quarter, at the device's own offset, under P('model',)
      const q=k===1?e:k>=2?1:0,w=lerp(S*.92,S*.23,q),x=lerp(p[0],p[0]-S*.345+col*S*.23,q);
      R.box([x,.27,p[2]+S*.28],[w,.06,.07],{fill:q>.5?COL[col]:P.c1,a:sA,shadow:false,lw:.5})});
    SRC.forEach((p,i)=>{if(i<4)lab(R,[p[0],.25,p[2]-.6],'model '+i,{mono:true,fs:12,dy:-8,c:P.mute,a:sA,grp:'mc',wide:1})});
    lab(R,[SRC[4][0]-.55,.1,SRC[4][2]],'data 1',{mono:true,fs:12,al:'right',dx:-6,c:P.mute,a:sA,wide:1});lab(R,[SRC[0][0]-.55,.1,SRC[0][2]],'data 0',{mono:true,fs:12,al:'right',dx:-6,c:P.mute,a:sA,wide:1});
    lab(R,[-4.2,0,1.35],'saved: (data 2, model 4)',{fs:13,b:1,dy:18,a:Math.max(.5,sA)});
    if(k===0)lab(R,[-4.2,.6,-1.2],'fc1 kernel P(None, \'model\'): [128, 128] each',{mono:true,fs:12,dy:-10,a:e,wide:1});
    if(k===1){lab(R,[-4.2,.6,-1.2],'bias '+M.bias_spec_fresh+' → '+M.bias_spec_saved,{mono:true,fs:12.5,b:1,dy:-10,c:P.c1,a:e});
      if(DT)lab(R,[-4.2,0,1.35],DT.n_changed+' of '+DT.n_leaves+' leaves re-sharded by the compiler',{fs:12.5,dy:40,c:P.c1,a:e,wide:1})}
    // ---------- the checkpoint: one OCDBT store per process
    const cA=k===2||k===3?1:.3;
    R.box(STORE,[1.1,.75,1.1],{fill:tint(P,P.c6,.3),a:cA});
    lab(R,[0,.75,0],(M.ocdbt_process_dirs||['ocdbt.process_0'])[0]+'/',{mono:true,fs:12.5,b:1,dy:-12,c:P.c6,a:Math.max(.45,cA)});
    lab(R,[0,0,.55],(M.files_bytes/1e6).toFixed(1)+' MB at step '+M.save_at,{mono:true,fs:12,dy:16,c:P.mute,a:Math.max(.4,cA),wide:1});
    if(k===2)SRC.forEach((p,i)=>R.flowArc([p[0],.3,p[2]],[-.5,.5,lerp(-.3,.3,Math.floor(i/4))],.5+.06*(i%4),{c:COL[i%4],r:.05,n:5,speed:1.1,a:Math.min(1,e*1.5)}));
    // ---------- the targets
    TK.forEach((key,ti)=>{const t=T[key],c=TP[ti],m=t.mesh==='saved'?[2,4]:t.mesh||[1,1],n=m[0]*m[1],sp=.32,s=.26;
      const tA=k<3?.18:k===3?Math.min(1,e*1.4+.1):1,res=k===4;
      for(let i=0;i<n;i++){const p=[c[0]+(i-(n-1)/2)*sp,0,c[2]];dev(R,p,s,tA,{shadow:false});shard(R,p,s,t.fc1_shard[1],(i%m[1])%(512/t.fc1_shard[1]),COL[(i%m[1])%8],tA)}
      const nm=key==='A, into the saved shardings'?'(2 x 4), saved shardings':key==='A (2 x 4)'?'(2 x 4), fresh':key;
      lab(R,[c[0]-1.4,.1,c[2]],nm,{mono:true,fs:12,al:'right',dx:-4,c:t.mesh==='saved'?P.good:P.ink,a:Math.max(.35,tA),grp:'tg'});
      if(k===3)R.flowArc([.55,.4,0],[c[0]-1.25,.25,c[2]],.6,{c:P.c6,r:.05,n:6,speed:1.2,a:e});
      if(k>=3){const ok=t.restored_bitwise;lab(R,[c[0]+1.4,.1,c[2]],res?(t.continued_bitwise_equal_ref?'bit-identical':'drift '+fmtE(t.param_maxdiff_vs_ref)):(ok?'restored exactly':'restore differs'),
        {mono:true,fs:12,al:'left',dx:4,b:res&&t.continued_bitwise_equal_ref,c:res?(t.continued_bitwise_equal_ref?P.good:P.c2):P.good,a:k===3?e:res?Math.min(1,e*1.5):1,grp:'tr',wide:1})}});
    if(k===4)lab(R,[4.1,0,3.3],ph?'continued to step '+M.total:'continued from step '+M.save_at+' to '+M.total,{fs:12.5,b:1,dy:10,a:e});
  }
  const full={cam:[.18,.72],bounds:[[-6.2,0,-3.3],[7.2,1.2,3.5]]};
  const V=[{cam:[.25,.62],bounds:[[-6.2,0,-1.6],[-2.2,1.0,1.8]]},{cam:[.25,.62],bounds:[[-6.2,0,-1.6],[-2.2,1.0,1.8]]},
    {cam:[.2,.66],bounds:[[-6.2,0,-1.6],[1.4,1.2,1.8]]},full,{cam:[.15,.7],bounds:[[1.0,0,-3.3],[7.0,.8,3.5]]}];
  const st=S3.stage({id:'stg-mesh',list:'sx-mesh',fig:'Fig. 3 · save on one mesh, restore onto another',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5000,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,14,30],view:k=>V[k]});
  (window.TSSTG=window.TSSTG||{})['stg-mesh']=st;
})();
