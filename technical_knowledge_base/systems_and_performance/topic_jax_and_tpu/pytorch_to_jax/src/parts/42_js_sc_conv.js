// ---- Scene, Fig. 2 (section 3): converting a checkpoint. Four of the running example's tensors (shapes from PJ.convert.tensors, pj_convert.py)
// as glass plates sized by shape: PyTorch's flat dict at the back, the NNX state's slots in front. The rule maps names to paths, fc1 turns from
// [512, 128] to [128, 512], the real 6 x 8 corner of blocks.0.attn.wq.weight after 500 steps (PJ.convert.tile) moves bar by bar (row r becomes
// column r), the rest is copied, the checks pass, and GPT-2's real Conv1D corner (PJ.gpt2.tile) crosses unturned. Steps: #sx-conv. ----
(function(){
  if(!document.getElementById('stg-conv')||!window.PJS||!window.PJ)return;const {at,off,lerp,lerp3,mix}=S3,{lab,plate,slot,tint}=PJS;
  const C=PJ.convert,G=PJ.gpt2,TS={};C.tensors.forEach(t=>TS[t.torch]=t);
  const K=.8/128,ZB=-.9,ZF=.9,Y=.2;
  // the four tensors shown: [torch name, short torch label, short NNX label, x centre]
  const IT=[['tok_emb.weight','tok_emb.weight','tok_emb/embedding',-3.3],['blocks.0.attn.wq.weight','attn.wq.weight','attn/wq/kernel',-1.75],
    ['blocks.0.ln1.weight','ln1.weight','ln1/scale',-.45],['blocks.0.mlp.fc1.weight','mlp.fc1.weight','mlp/fc1/kernel',1.85]].map(([n,a,b,x])=>{const t=TS[n];return {t,a,b,x,
      ts:t.torch_shape,ns:t.nnx_shape,tr:t.transpose,
      // a matrix [a, b] is drawn a along x and b along z; a vector [n] as a thin bar along x
      tw:t.torch_shape[0]*K,td:t.torch_shape.length>1?t.torch_shape[1]*K:.07,nw:t.nnx_shape[0]*K,nd:t.nnx_shape.length>1?t.nnx_shape[1]*K:.07}});
  const back=it=>[it.x,Y,ZB-it.td/2],front=it=>[it.x,Y,ZF+it.nd/2];
  const shp=s=>'['+s.join(', ')+']';
  // a plate turned by th about the vertical axis (th = pi/2 turns its x extent into z)
  function turned(R,c,w,d,th,o){const U=[Math.cos(th)*w/2,0,Math.sin(th)*w/2],V=[-Math.sin(th)*d/2,0,Math.cos(th)*d/2];
    R.glass([c[0]-U[0]-V[0],c[1],c[2]-U[2]-V[2]],[2*U[0],0,2*U[2]],[2*V[0],0,2*V[2]],o)}
  function vec(R,c,w,a,col){R.box([c[0],c[1]-.03,c[2]],[w,.06,.07],{fill:col,a,shadow:false})}
  function item(R,it,where,a,o){o=o||{};const P=R.P,c=where==='back'?back(it):front(it);if(it.ts.length===1){vec(R,c,it.tw,a,tint(P,P.c1,.6));return}
    const w=where==='back'?it.tw:it.nw,d=where==='back'?it.td:it.nd;plate(R,c,w,d,{c:o.c||P.c1,a,nu:Math.max(2,Math.round(w/.2)),nv:Math.max(2,Math.round(d/.2))})}
  // the real corner of a weight as signed bars: positive up (orange), negative hanging (blue)
  const TL=C.tile.torch_corner,GT=G.tile.stored_corner,S=.3,TY=.55;
  function bars(R,tile,pos,a){const P=R.P,m=Math.max(...tile.flat().map(Math.abs));
    tile.forEach((row,r)=>row.forEach((v,c)=>{const p=pos(r,c),h=Math.max(.012,Math.abs(v)/m*.6);
      R.box([p[0],v>=0?p[1]:p[1]-h,p[2]],[S*.62,h,S*.62],{fill:v>=0?tint(P,P.c2,.75):tint(P,P.c1,.75),a,shadow:false,lw:.6})}))}
  const T0=[-1.7,TY,-.6],T1=[1.7,TY,.6];
  // stored [out, in] = 6 x 8: row r along x, column c along z; the kernel [in, out] = 8 x 6: column c along x, row r along z
  const pT=(r,c)=>[T0[0]+(r-2.5)*S,T0[1],T0[2]+(c-3.5)*S],pN=(r,c)=>[T1[0]+(c-3.5)*S,T1[1],T1[2]+(r-2.5)*S],pG=(r,c)=>[T1[0]+(r-2.5)*S,T1[1],T1[2]+(c-3.5)*S];
  function draw(R,k,e){const P=R.P;R.grid(-4.6,4.4,-3,3.6,.5);
    const tileStep=k===3||k===6,bg=tileStep?0:1;
    // ---- the four tensors: PyTorch's at the back, the NNX slots in front
    IT.forEach((it,i)=>{const fc1=i===3;
      // fc1 crosses at step 3, the others at step 5 (wq's turn is shown in close-up at step 4); the checkpoint stays behind as a faint copy
      const crossAt=fc1?2:4,rec=k===2&&!fc1?.3:k===4&&fc1?.35:1;
      item(R,it,'back',bg*(k<crossAt?rec:.3));
      if(k<=crossAt)slot(R,[front(it)[0],Y,front(it)[2]],it.nw,Math.max(.1,it.nd),bg*.8*rec);
      if(k>crossAt)item(R,it,'front',bg*rec,{c:k===5?mix(P.c1,P.good,.55):P.c1});
      // labels: dotted names at the back, paths in front
      const la=tileStep?0:k===2&&!fc1?.35:k===4&&fc1?.4:1;
      lab(R,[it.x,Y,ZB-it.td],it.a,{mono:true,fs:12,b:1,dy:-24,a:la});lab(R,[it.x,Y,ZB-it.td],shp(it.ts),{mono:true,fs:12,c:P.mute,dy:-10,a:la});
      lab(R,[it.x,Y,ZF+Math.max(.1,it.nd)],it.b,{mono:true,fs:12,b:1,dy:12,a:la,c:P.acc});lab(R,[it.x,Y,ZF+Math.max(.1,it.nd)],shp(it.ns)+(it.tr?' (turned)':''),{mono:true,fs:12,c:P.mute,dy:26,a:la});
      // the rule: one arc per tensor, from its name to its slot
      if(k===1)R.arc([it.x,Y+.05,ZB],[it.x,Y+.05,ZF],.45,{c:it.tr?P.c2:P.mute,w:1.8,t:Math.min(1,e*1.3),head:6});
      if(k===1&&e>.6)lab(R,[it.x,Y+.5,0],it.tr?'transpose':'copy',{fs:12.5,b:1,c:it.tr?P.c2:P.mute,a:Math.min(1,(e-.6)*3)});
      // crossing: fc1 turns on its way (step 3); tok_emb, ln1 and wq cross as they are (step 5; wq's turn was shown in close-up)
      if(k===crossAt&&!tileStep){const b0=back(it),f0=front(it),t=Math.min(1,e*1.15),c=lerp3(b0,f0,t),lift=Math.sin(Math.PI*t)*.55;
        if(it.ts.length===1)vec(R,[c[0],c[1]+lift,c[2]],it.tw,1,tint(P,P.c1,.6));
        else turned(R,[c[0],c[1]+lift,c[2]],it.tw,it.td,it.tr&&fc1?t*Math.PI/2:it.tr?Math.PI/2:0,{c:P.c1,nu:6,nv:6});
        R.flowArc([b0[0],Y+.1,ZB],[f0[0],Y+.1,ZF],.5,{c:it.tr?P.c2:P.c1,r:.06,n:6,a:.8})}});
    if(k===2)lab(R,[IT[3].x+.75,Y+.3,1.9],'[512, 128] turns into [128, 512]',{fs:13,b:1,al:'left',c:P.c2,a:e});
    if(k===4){lab(R,[-4.1,0,3.5],C.n_transposed+' Linear kernels turn;',{fs:13,b:1,al:'left',a:e});lab(R,[-4.1,0,3.5],'the other '+(C.n_tensors-C.n_transposed)+' tensors are copied',{fs:13,b:1,al:'left',dy:18,a:e})}
    // ---- the check, and the trip back
    if(k===5){IT.forEach(it=>{R.flowArc([it.x+.15,Y+.1,ZF],[it.x+.15,Y+.1,ZB],.35,{c:P.good,r:.055,n:5,a:e})});
      lab(R,[-4.1,0,3.5],'every name once, every shape asserted,',{fs:13,b:1,al:'left',c:P.good,a:e});lab(R,[-4.1,0,3.5],'back to PyTorch bit for bit',{fs:13,b:1,al:'left',dy:18,c:P.good,a:e})}
    // ---- close-up on a real corner: wq (moves bar by bar), then GPT-2's Conv1D (crosses unturned)
    if(tileStep){const P0=k===3?TL:GT,lab0=k===3?'blocks.0.attn.wq.weight[:6, :8]':'h.0.attn.c_proj.weight[:6, :8]',lab1=k===3?'kernel[:8, :6]':'used as stored';
      plate(R,[T0[0],TY,T0[2]],6*S+.1,8*S+.1,{c:P.c1,a:.45,nu:6,nv:8});
      plate(R,[T1[0],TY,T1[2]],(k===3?8:6)*S+.1,(k===3?6:8)*S+.1,{c:k===3?P.c1:P.c5,a:.45,nu:k===3?8:6,nv:k===3?6:8});
      lab(R,[T0[0],TY,T0[2]-4*S],lab0,{mono:true,fs:12,b:1,dy:-14});lab(R,[T0[0],TY,T0[2]-4*S],k===3?'as stored: [out, in]':'as stored: [in, out]',{mono:true,fs:12,c:P.mute,dy:0});
      lab(R,[T1[0],TY,T1[2]+(k===3?3:4)*S],lab1,{mono:true,fs:12,b:1,dy:16,c:P.acc});lab(R,[T1[0],TY,T1[2]+(k===3?3:4)*S],'JAX needs [in, out]',{mono:true,fs:12,c:P.mute,dy:30});
      // each bar leaves when its row's turn comes (row by row), keeping its height: only its position changes
      bars(R,P0,(r,c)=>{const t0=r/(P0.length+2),t=Math.max(0,Math.min(1,(e-t0)/.35)),a=pT(r,c),b=k===3?pN(r,c):pG(r,c),m=lerp3(a,b,t);return [m[0],m[1]+Math.sin(Math.PI*t)*.5,m[2]]},1);
      R.flowArc([T0[0]+.6,TY+.3,T0[2]],[T1[0]-.6,TY+.3,T1[2]],.6,{c:k===3?P.c2:P.c5,r:.06,n:7,a:.7})}
  }
  const full={cam:[.28,.72],bounds:[[-4.1,0,-2.3],[3.8,.9,3.8]]};
  const st=S3.stage({id:'stg-conv',list:'sx-conv',fig:'Fig. 2 · a checkpoint converted by a rule',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,22,16],
    // step 3 looks at fc1; steps 4 and 7 move in on the corner of one weight
    view:k=>k===2?{cam:[.5,.62],bounds:[[-.3,0,-2.2],[4,1.2,4.3]]}:k===3||k===6?{cam:[.2,.78],bounds:[[-3.2,0,-2.3],[3.2,1.2,2.4]]}:full});
  (window.PJSTG=window.PJSTG||{})['stg-conv']=st;
})();
