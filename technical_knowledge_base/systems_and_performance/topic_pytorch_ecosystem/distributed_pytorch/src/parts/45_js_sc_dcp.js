// ---- Scene, Fig. 5 (2026-11-12, renderer v2): a distributed checkpoint saved from 4 FSDP2 ranks and read back two ways.
// Files and bytes are window.DPT.dcp.convert (the .metadata and four .distcp files as written, the single .pt of dcp_to_torch_save);
// the HSDP read-back is DPT.dcp.reshard (placements (R, S(0)), local block weight 512 x 256, largest difference 0, next loss equal).
// Three columns, left to right: the ranks that saved, the checkpoint directory, what reads it. File heights are to scale by bytes; the .pt has
// four times a shard file's footprint, so its volume is to scale. Which files each HSDP rank reads is drawn from the layouts (shard s of a block
// weight is FSDP quarters 2s and 2s + 1). Steps are #sx-dcp on the left. ----
(function(){
  if(!document.getElementById('stg-dcp')||!window.S3||!window.DPT)return;const {mix}=S3,D=window.DPT,U=window.DU;
  const cv=D.dcp.convert,rs=D.dcp.reshard,F=cv.dcp_files,meta=F.find(f=>f[0]==='.metadata'),dc=F.filter(f=>f[0]!=='.metadata');
  const Z=[-1.35,-.45,.45,1.35],XS=-2.7,XF=0,XH=2.7,ZM=-2.25,MAXB=Math.max(...dc.map(f=>f[1])),HF=.55,fh=b=>Math.max(.03,HF*b/MAXB);
  const ptH=HF*cv.pt_bytes/MAXB/4;
  function draw(R,k,e){const P=R.P;R.grid(-3.8,3.8,-2.7,2,.5);const ein=Math.min(1,e*1.3),TP=[0,0,ZM-.45];
    // left: the four FSDP2 ranks, each with its quarter
    Z.forEach((z,r)=>{R.box([XS,0,z],[1,.12,.66],{fill:P.paper});R.glass([XS-.25,.13,z],[.5,0,0],[0,.3,0],{c:P.c3,nu:1,nv:4,th:.03});
      R.label([XS-.5,.1,z],(R.W<520?'':'FSDP2 ')+'rank '+r,{al:'right',dx:-8,mono:true,fs:12,c:P.c3})});
    // middle: the checkpoint directory, four shard files and the map
    if(k>=1){const g=k===1?ein:1;
      dc.forEach((f,r)=>{const h=fh(f[1])*(k===1?ein:1);R.box([XF,0,Z[r]],[.62,Math.max(.01,h),.5],{fill:mix(P.paper,P.c3,.35)});
        R.label([XF+.33,fh(f[1])*.5,Z[r]],f[0]+' · '+(f[1]/1e6).toFixed(2)+' MB',{al:'left',dx:8,fs:12,mono:true,a:g,wide:1});
        if(k===1)R.flowArc([XS+.3,.35,Z[r]],[XF-.2,fh(f[1])*.7,Z[r]],.3,{c:P.c3,r:.06,n:8,speed:1.2})});
      R.box([XF,0,ZM],[.4,fh(meta[1]),.4],{fill:mix(P.paper,P.acc,.6)});R.label([XF+.25,0,ZM],R.W<520?'.metadata':'.metadata · '+U.comma(meta[1])+' B, the map',{al:'left',dx:8,fs:12,mono:true,b:1,c:P.acc,a:g});
      if(k===1)R.flowArc([XS+.3,.3,Z[0]],[XF-.1,.05,ZM],.25,{c:P.acc,r:.045,n:5,speed:1.1})}
    // right: read back as 2 x 2 HSDP, each rank reading the files that hold its half (located through the map)
    if(k===2){const lab=['replica 0 · shard 0','replica 0 · shard 1','replica 1 · shard 0','replica 1 · shard 1'];
      Z.forEach((z,r)=>{const s=r%2;R.box([XH,0,z],[1,.12,.66],{fill:P.paper,a:ein});R.glass([XH-.3,.13,z],[.6,0,0],[0,.45,0],{c:P.c4,a:ein,nu:1,nv:8,th:.03});
        R.label([XH+.5,.1,z],lab[r],{al:'left',dx:8,mono:true,fs:12,c:P.c4,a:ein,grp:'h'});
        [2*s,2*s+1].forEach(f=>R.flowArc([XF+.3,fh(dc[f][1])*.7,Z[f]],[XH-.3,.4,z],.35,{c:P.c4,r:.05,n:6,speed:1.2,a:ein}));
        R.flowArc([XF+.2,.04,ZM],[XH-.3,.5,z],.2,{c:P.acc,r:.035,n:3,speed:1,a:ein*.7})});
      R.label(TP,(R.W<520?'HSDP: local ':'HSDP (Replicate(), Shard(0)): local block weight ')+rs.local_shape.join(' × '),{fs:13,b:1,c:P.c4,mono:true,dy:-34});
      R.label(TP,(R.W<520?'difference ':'largest difference ')+rs.max_abs_param_diff.toFixed(1)+' · next loss '+rs.next_loss_hsdp.toFixed(7)+(R.W<520?'':' on both'),{fs:12.5,mono:true,dy:-16})}
    // or one plain file
    if(k===3){const h=ptH*ein;R.box([XH,0,0],[1.24,Math.max(.01,h),1.24],{fill:mix(P.paper,P.c5,.45)});
      dc.forEach((f,r)=>R.flowArc([XF+.3,fh(f[1])*.7,Z[r]],[XH-.5,h*.8,0],.3,{c:P.c5,r:.05,n:6,speed:1.2}));
      R.label([XH,0,.75],'one .pt · '+U.comma(cv.pt_bytes)+' B',{fs:13,b:1,mono:true,c:P.c5,dy:18,a:ein});
      R.label(TP,R.W<520?'dcp_to_torch_save':'dcp_to_torch_save: no process group needed',{fs:13,b:1,mono:true,c:P.c5,dy:-24})}
    if(k===0)R.label(TP,R.W<520?'each rank holds a quarter':'trained under FSDP2: each rank holds a quarter',{fs:13,b:1,mono:true,c:P.c3,dy:-24});
    if(k===1)R.label(TP,R.W<520?'dcp.save: one file per rank':'dcp.save: every rank writes its own file, nothing gathered',{fs:13,b:1,mono:true,c:P.c3,dy:-24})}
  S3.stage({id:'stg-dcp',list:'sx-dcp',fig:'Fig. 5 · a checkpoint from 4 ranks, read two ways',cam:[0,1.12],bounds:[[-3.6,0,-2.7],[3.9,1,1.8]],aspect:.62,dur:1400,hold:5000,draw,
    margin:w=>w<520?[20,8,12,8]:[24,16,14,16]});
})();
