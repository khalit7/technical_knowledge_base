// ---- Reading section 6: one block's scheduler nodes fused round by round, then the kernels; C++ against Triton ----
(function(){
  const {$,esc}=TU,I=TCP.ind;if(!$('tcp-fuse-card'))return;
  const kindCol={reduction:'var(--c1)',pointwise:'var(--c3)',extern:'var(--c2)'};
  // five steps (2026-11-12): the 16 nodes; the three fusions that make each LayerNorm one node (grouped by LayerNorm; the log interleaves them);
  // round 2; codegen. The step list #sx-fuse explains each; the counters below the nodes follow the step.
  const states=[];let groups=I.nodes.map(n=>({id:n.name,members:[n]}));const pos=g=>I.nodes.findIndex(n=>n.name===g.members[0].name);
  states.push({groups:groups.map(g=>({...g})),f:0});
  let made=0;
  function fuse(ids){const hot=[];ids.forEach(k=>{const [a,b]=I.fusions[k],ga=groups.find(g=>g.id===a),gb=groups.find(g=>g.id===b);
      const m={id:a+'_'+b,members:ga.members.concat(gb.members)};groups=groups.filter(g=>g!==ga&&g!==gb);groups.push(m);made++;hot.push(m.id)});
    groups.sort((x,y)=>pos(x)-pos(y));states.push({groups:groups.map(g=>({...g,hot:hot.includes(g.id)})),f:made})}
  const lnOf=k=>I.nodes.find(n=>n.name===I.fusions[k][0].split('_')[0]).origins.some(o=>/_1|_2/.test(o))?2:1;
  fuse(I.fusions.map((_,k)=>k).filter(k=>lnOf(k)===1));fuse(I.fusions.map((_,k)=>k).filter(k=>lnOf(k)===2));
  states.push({groups:groups.map(g=>({...g})),f:made});
  const fused=I.launches.filter(l=>l.kind==='fused').map(l=>l.name);
  states.push({groups:groups.map(g=>({...g})),f:made,code:true});
  const box=$('tcp-fuse-nodes'),cnt=$('tcp-fuse-cnt');
  function draw(i){const S=states[i];let fi=0;
    box.innerHTML=S.groups.map(g=>{const k=g.members.some(m=>m.kind==='reduction')?'reduction':g.members[0].kind;
      const name=S.code&&k!=='extern'?fused[fi++]:g.id;
      const org=[...new Set(g.members.flatMap(m=>m.origins))].slice(0,6).join(', ');
      return '<span class="'+(g.hot?'g':'')+'" style="--sc:'+kindCol[k]+'" title="'+esc(org)+'">'+esc(name)+(g.members.length>1?' <b>('+g.members.length+')</b>':'')+(org?'<br><small class="mute">'+esc(org)+'</small>':'')+'</span>'}).join('');
    cnt.innerHTML=TU.stat('Scheduler nodes',S.groups.length)+TU.stat('Fusions made',S.f)+TU.stat('Generated kernels',S.code?fused.length:'not yet');
  }
  RD.anim({card:'tcp-fuse-card',ctl:'tcp-fuse-ctl',n:states.length,draw,ms:4600,label:'Fusion step',list:'sx-fuse'});
  // C++ against Triton against the wrapper
  const pre=$('tcp-code-pre'),note=$('tcp-code-note');
  RD.seg($('tcp-code-seg'),m=>{
    if(m==='cpp'){pre.textContent=I.cpp;note.textContent='cpp_fused_gelu_view_2 as written by Inductor on this Mac (torch 2.14.1, 4 threads); compiled and run.'}
    else if(m==='triton'){pre.textContent=I.triton.replace(/^@triton_heuristics[\s\S]*?\n\)\n/m,'@triton_heuristics.pointwise(...)   # autotuning metadata cut\n');note.textContent='triton_poi_fused_gelu_view_2, generated in the kb-gpu-lab-cs7:1 Docker image (torch 2.14.1+cpu, Triton '+I.triton_ver+') with cpu_backend="triton" and a stand-in driver answering sm_90; never compiled to a GPU binary nor run. All four kernels: '+I.triton_names.join(', ')+'.'}
    else{pre.textContent=I.wrap;note.textContent='The Python wrapper Inductor generated for the block forward: buffer allocation, reuse ("# reuse"), size asserts, the kernel and library calls in order.'}});
  pre.textContent=I.cpp;note.textContent='cpp_fused_gelu_view_2 as written by Inductor on this Mac (torch 2.14.1, 4 threads); compiled and run.';
})();
