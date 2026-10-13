// ---- Reading section 6: one block's scheduler nodes fused round by round, then the kernels; C++ against Triton ----
(function(){
  const {$,esc}=TU,I=TCP.ind;if(!$('tcp-fuse-card'))return;
  const kindCol={reduction:'var(--c1)',pointwise:'var(--c3)',extern:'var(--c2)'};
  // states: 0 = initial; one per fusion event; then round 2; then codegen
  const states=[];let groups=I.nodes.map(n=>({id:n.name,members:[n]}));
  states.push({groups:groups.map(g=>({...g})),t:'Lowering hands the scheduler 16 nodes',p:'Pointwise chains were already inlined during lowering: op3 alone holds LayerNorm\'s subtract, multiply, rsqrt and add; op14 is all of GELU. Extern nodes (orange) are library calls: addmm, attention.',f:0});
  I.fusions.forEach(([a,b],k)=>{
    const ga=groups.find(g=>g.id===a),gb=groups.find(g=>g.id===b);
    const merged={id:a+'_'+b,members:ga.members.concat(gb.members),hot:true};
    groups=groups.filter(g=>g!==ga&&g!==gb);groups.splice(Math.min(...[ga,gb].map(g=>I.nodes.findIndex(n=>n.name===g.members[0].name))),0,merged);
    groups.sort((x,y)=>I.nodes.findIndex(n=>n.name===x.members[0].name)-I.nodes.findIndex(n=>n.name===y.members[0].name));
    const ln=ga.members[0].model_line===105?'first':'second';
    states.push({groups:groups.map(g=>({...g,hot:g===merged})),t:'Round 1, fusion '+(k+1)+' of '+I.fusions.length+': '+a+' with '+b,p:'Both read the same activation row by row (the '+ln+' LayerNorm\'s statistics and normalisation), so one loop can do both and the intermediate never goes to memory.',f:k+1});
  });
  states.push({groups:groups.map(g=>({...g})),t:'Round 2: no more fusions; '+Object.values(I.rejects).reduce((a,b)=>a+b,0)+' pairs were rejected in all',p:'Every rejection had the same reason: "'+esc(Object.keys(I.rejects)[0])+'". For example a LayerNorm and the next one cannot share a loop, because the attention and matmuls (extern) must run between them.',f:I.fusions.length});
  const fused=I.launches.filter(l=>l.kind==='fused').map(l=>l.name);
  states.push({groups:groups.map(g=>({...g})),t:'Codegen: '+groups.length+' nodes become '+fused.length+' C++ kernels and '+I.launches.filter(l=>l.kind!=='fused').length+' library calls',p:'Each non-extern group is one kernel: '+fused.map(esc).join(', ')+'. The externs become 4 calls to extern_kernels.addmm (BLAS) and one call to the CPU flash-attention kernel; one extern node only unpacks the attention result.',f:I.fusions.length,code:true});
  const box=$('tcp-fuse-nodes'),cap=$('tcp-fuse-cap'),cnt=$('tcp-fuse-cnt');
  function draw(i){const S=states[i];let fi=0;
    box.innerHTML=S.groups.map(g=>{const k=g.members.some(m=>m.kind==='reduction')?'reduction':g.members[0].kind;
      const name=S.code&&k!=='extern'?fused[fi++]:g.id;
      const org=[...new Set(g.members.flatMap(m=>m.origins))].slice(0,6).join(', ');
      return '<span class="'+(g.hot?'g':'')+'" style="--sc:'+kindCol[k]+'" title="'+esc(org)+'">'+esc(name)+(g.members.length>1?' <b>('+g.members.length+')</b>':'')+(org?'<br><small class="mute">'+esc(org)+'</small>':'')+'</span>'}).join('');
    cap.innerHTML='<div class="t">'+S.t+'</div><p>'+S.p+'</p>';
    cnt.innerHTML=TU.stat('Scheduler nodes',S.groups.length)+TU.stat('Fusions made',S.f)+TU.stat('Generated kernels',S.code?fused.length:'not yet');
  }
  RD.anim({card:'tcp-fuse-card',ctl:'tcp-fuse-ctl',n:states.length,draw,ms:1700,label:'Fusion step'});
  // C++ against Triton against the wrapper
  const pre=$('tcp-code-pre'),note=$('tcp-code-note');
  RD.seg($('tcp-code-seg'),m=>{
    if(m==='cpp'){pre.textContent=I.cpp;note.textContent='cpp_fused_gelu_view_2 as written by Inductor on this Mac (torch 2.14.1, 4 threads); compiled and run.'}
    else if(m==='triton'){pre.textContent=I.triton.replace(/^@triton_heuristics[\s\S]*?\n\)\n/m,'@triton_heuristics.pointwise(...)   # autotuning metadata cut\n');note.textContent='triton_poi_fused_gelu_view_2, generated in the kb-gpu-lab-cs7:1 Docker image (torch 2.14.1+cpu, Triton '+I.triton_ver+') with cpu_backend="triton" and a stand-in driver answering sm_90; never compiled to a GPU binary nor run. All four kernels: '+I.triton_names.join(', ')+'.'}
    else{pre.textContent=I.wrap;note.textContent='The Python wrapper Inductor generated for the block forward: buffer allocation, reuse ("# reuse"), size asserts, the kernel and library calls in order.'}});
  pre.textContent=I.cpp;note.textContent='cpp_fused_gelu_view_2 as written by Inductor on this Mac (torch 2.14.1, 4 threads); compiled and run.';
})();
