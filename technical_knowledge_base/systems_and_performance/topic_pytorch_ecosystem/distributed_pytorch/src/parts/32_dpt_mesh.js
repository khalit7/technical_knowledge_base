// ---- Mesh explorer (t-dpt-mesh) ----
(function(){
  const D=window.DPT,U=window.DU,$=U.$;
  const C=['var(--c1)','var(--c3)','var(--c2)'];
  // shape: mesh dims (names, sizes); data: per-rank records; group names as recorded (flight-recorder pg labels)
  const L={
    ddp4:{name:'DDP, 4',dims:[['world',4]],pg:{world:'world'},recs:D.mesh.ddp4.ranks,
      desc:'Every rank holds the whole model and its own batch; gradients are averaged by bucket all-reduces over all 4 ranks. One group: the world.'},
    fsdp4:{name:'FSDP2, 4',dims:[['shard',4]],pg:{world:'shard'},recs:D.mesh.fsdp4.ranks,
      desc:'One mesh dimension of 4: every parameter Shard(0) over all ranks. All-gathers before each block\'s forward and backward, one gradient reduction per unit, all over the world group (a 1-D mesh over all ranks reuses the default group).'},
    hsdp:{name:'HSDP, 2 &times; 2',dims:[['replicate',2],['shard',2]],pg:{replicate:'replicate',shard:'shard'},recs:D.mesh.hsdp.ranks,
      desc:'Mesh (replicate 2, shard 2): parameters (Replicate(), Shard(0)). Gathers and gradient reductions stay inside the shard pair; one all-reduce per unit crosses to the other replica.'},
    raf2:{name:'FSDP2, reshard to 2',dims:[['shard',4]],extra:'post-forward pairs',pg:{world:'shard',mesh_dim_1:'post-forward pairs'},recs:D.mesh.raf2.ranks,
      desc:'FSDP2 over 4 with <code>reshard_after_forward=2</code>: after each forward the weights stay sharded over pairs '+JSON.stringify((D.mesh.raf2.pfm||{}).mesh||[])+', so the backward all-gathers run inside a pair.'},
    fsdp_tp:{name:'FSDP2 &times; TP, 2 &times; 2',dims:[['dp',2],['tp',2]],pg:{dp:'dp',tp:'tp'},recs:D.mesh.fsdp_tp.ranks,
      desc:'Mesh (dp 2, tp 2): TP inside each block over the tp pair (the 16-all-reduce plan of the Reading tab, section 6), then fully_shard over dp. The two tp ranks of a replica see the same batch.'},
    c3:{name:'PP &times; FSDP &times; TP, 2 &times; 2 &times; 2',dims:[['pp',2],['dp',2],['tp',2]],pg:{pp:'pp',dp:'dp',tp:'tp'},recs:D.c3,
      desc:'Eight processes: two pipeline stages (pp), FSDP2 over dp, TP over tp, composed in torchtitan\'s order (Reading tab, section 10). Stage 0 holds the embeddings and blocks 0 and 1, stage 1 blocks 2 and 3, ln_f and the head; the tied embedding and head are summed over pp.'}};
  let lay='fsdp4',rank=0;
  const coords=(dims,r)=>{const c=[];let rem=r;for(let i=dims.length-1;i>=0;i--){c[i]=rem%dims[i][1];rem=Math.floor(rem/dims[i][1])}return c};
  const nRanks=dims=>dims.reduce((a,d)=>a*d[1],1);
  function groupOf(dims,r,k){const c=coords(dims,r);const out=[];for(let q=0;q<nRanks(dims);q++){const cq=coords(dims,q);if(cq.every((v,i)=>i===k||v===c[i]))out.push(q)}return out}
  function pairsOf(r){return r<2?[0,1]:[2,3]}
  $('dm-lay').innerHTML=Object.keys(L).map(k=>'<button data-m="'+k+'"'+(k===lay?' class="on"':'')+'>'+L[k].name+'</button>').join('');
  U.seg($('dm-lay'),m=>{lay=m;rank=0;draw()});
  $('dm-grid').addEventListener('click',e=>{const b=e.target.closest('[data-r]');if(!b)return;rank=+b.dataset.r;draw()});
  function draw(){
    const l=L[lay],dims=l.dims,n=nRanks(dims);if(rank>=n)rank=0;
    const myG=dims.map((d,k)=>groupOf(dims,rank,k));
    if(l.extra)myG.push(pairsOf(rank));
    const gnames=dims.map(d=>d[0]).concat(l.extra?[l.extra]:[]);
    $('dm-desc').innerHTML=l.desc;
    // grid: last dim across, second-to-last down, first of three as planes
    const planes=dims.length===3?dims[0][1]:1,rows=dims.length>=2?dims[dims.length-2][1]:1,cols=dims[dims.length-1][1];
    let h='';
    for(let p=0;p<planes;p++){
      h+='<div class="dm-plane">'+(planes>1?'<b>'+dims[0][0]+' = '+p+(lay==='c3'?(p?' (stage 1)':' (stage 0)'):'')+'</b>':'')+'<div class="dm-grid" style="grid-template-columns:repeat('+cols+',auto)">';
      for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const r=p*rows*cols+i*cols+j;
        const dots=myG.map((g,k)=>g.includes(r)&&r!==rank?'<i style="background:'+C[k%3]+(k===3||l.extra&&k===dims.length?';outline:1px dashed var(--ink)':'')+'"></i>':'').join('');
        h+='<button class="dm-cell'+(r===rank?' sel':'')+'" data-r="'+r+'" aria-label="rank '+r+'"><span class="r">'+r+'</span><div class="small mute">('+coords(dims,r).join(',')+')</div><div class="dots">'+dots+'</div></button>'}
      h+='</div></div>'}
    $('dm-grid').innerHTML=h;
    $('dm-leg').innerHTML=gnames.map((g,k)=>'<span><i style="background:'+C[k%3]+'"></i>same '+g+' group as rank '+rank+': '+myG[k].join(', ')+'</span>').join('')+'<span>coordinates ('+dims.map(d=>d[0]).join(', ')+')</span>';
    const rec=l.recs[rank];
    // collectives by group
    const pgName=g=>l.pg[g]||g;
    const shardG={fsdp4:'world',raf2:'world',hsdp:'shard',fsdp_tp:'dp',c3:'dp'}[lay];
    const rows2=rec.coll.map(c=>[c[0]==='all_reduce'&&c[1]===shardG?'gradient reduce-scatter <span class="small mute">(run as all-reduce on gloo)</span>':U.opName(c[0]),'<b>'+pgName(c[1])+'</b>',c[2],U.comma(c[3]),c[4],U.comma(c[3]*c[4])]);
    $('dm-coll').innerHTML=U.table(['Collective','Group (mesh dimension)','dtype','Bytes in, each','Count','Bytes in, total'],rows2)+
      '<tfoot><tr><td><b>Total</b></td><td></td><td></td><td></td><td><b>'+rec.coll.reduce((a,c)=>a+c[4],0)+'</b></td><td><b>'+U.comma(rec.coll.reduce((a,c)=>a+c[3]*c[4],0))+'</b></td></tr></tfoot>';
    // parameters
    $('dm-par').innerHTML=U.table(['Parameter','Global shape','Local shape on rank '+rank,'Placements'],rec.params.map(p=>{
      const pls=lay==='c3'?p[4]:p[3];const mesh=lay==='c3'&&p[3]?' on ('+p[3].join(', ')+')':'';
      return ['<code>'+p[0]+'</code>',JSON.stringify(p[1]),JSON.stringify(p[2]),pls==='plain'?'plain tensor (whole)':(Array.isArray(pls)?pls.map(U.pl).join(', '):U.pl(pls))+mesh]}));
    // key numbers
    let kv='';
    if(lay==='c3'){kv=RD.stat('Weights held',U.mb(rec.local),'of '+U.mb(rec.full)+' ('+(rec.full/rec.local).toFixed(1)+'&times; less)')+
        RD.stat('Losses (micro-batches)',rec.losses.length?rec.losses.map(v=>v.toFixed(3)).join(', '):'first stage: none','reference, one process: '+rec.ref.toFixed(4))+
        RD.stat('Gradients vs one process',U.sci(rec.gd),'max abs difference, after the tied all-reduce')}
    else{kv=RD.stat('Weights held',U.mb(rec.state.params),'of 12.75 MB')+RD.stat('AdamW state',U.mb(rec.state.opt_state),'')+
        RD.stat('Step peak above persistent',U.mb(rec.peak,1),'memory profiler, one step')+RD.stat('Losses, steps 0 to 2',rec.losses.map(v=>v.toFixed(4)).join(', '),'this rank\'s batch')}
    $('dm-kv').innerHTML=kv;
    $('dm-foot').innerHTML=lay==='raf2'?'The group recorded as <code>mesh_dim_1</code> is the post-forward pair FSDP2 builds for <code>reshard_after_forward=2</code>.':lay==='ddp4'?'DDP\'s two small broadcasts rebuild the buckets at the start of step 1 (Reading tab, section 3; the lab tab, section 3).':'';
  }
  U.onTab('t-dpt-mesh',draw);
})();
