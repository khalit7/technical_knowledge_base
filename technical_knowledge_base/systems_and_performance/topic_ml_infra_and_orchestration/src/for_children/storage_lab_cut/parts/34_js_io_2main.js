// ---- Storage lab: measured tiers, checkpoint anatomy, scale table, write layouts, numbers in the prose ----
(function(){
  const H=window.IO_H,D=window.IO_D;if(!H||!D||!H.$('t-io'))return;const $=H.$;
  const fS=s=>s>=1?s.toFixed(s>=10?1:2)+' s':(s*1e3).toFixed(s>=0.1?0:1)+' ms';
  const fMB=b=>(b/1e6).toFixed(b>=1e8?0:b>=1e7?1:2)+' MB';
  const set=(id,v)=>{const e=$(id);if(e)e.innerHTML=v};
  const T=D.tiers;
  const NAMES={host_ssd:'Mac SSD, native',ctr_layer:'Container layer',ctr_volume:'Docker volume',ctr_hostdir:'Host folder shared into the VM',ctr_s3:'S3 store, from a container',host_s3:'S3 store, from the Mac'};
  const COL={host_ssd:'var(--c3)',ctr_layer:'var(--c6)',ctr_volume:'var(--c1)',ctr_hostdir:'var(--c2)',ctr_s3:'var(--c4)',host_s3:'var(--c5)'};
  // numbers quoted in the prose
  const lv=T.ctr_volume.l.write_s,lb=T.ctr_hostdir.l.write_s;
  set('io-n-l-vol',fS(lv));set('io-n-l-bind',fS(lb));set('io-n-l-ratio',Math.round(lb/lv)+' times');
  set('io-n-k8s-ratio',Math.round(D.clusters.k8s.median_s/D.clusters.slurm.median_s)+' times');
  const blk=(tr)=>{const b=tr.steps.filter(s=>s[2]>0).map(s=>s[2]).sort((x,y)=>x-y);return (b[1]+b[2])/2};// median of 4
  set('io-n-sync',fS(blk(D.slow_bind.train.sync)));set('io-n-async',fS(blk(D.slow_bind.train.async)));
  window.IO_BLK=blk;

  // --- tiers bars ---
  let op='write',sz='l';
  function tiers(){
    const keys=Object.keys(NAMES).filter(k=>T[k]&&T[k][sz]);
    const v=keys.map(k=>T[k][sz][op+'_s']);
    const lo=Math.log10(Math.min(...v))-0.35,hi=Math.log10(Math.max(...v))+0.05;
    $('io-tiers-bars').innerHTML=keys.map((k,i)=>{const r=T[k][sz],w=Math.max(2,(Math.log10(v[i])-lo)/(hi-lo)*100);
      return '<div class="row"><span class="nm">'+NAMES[k]+'</span><span class="track"><span class="fill" style="width:'+w.toFixed(1)+'%;background:'+COL[k]+'"></span></span><span class="val">'+fS(v[i])+'</span></div>'}).join('');
    const r0=T[keys[0]][sz];
    set('io-tiers-note','Median of '+r0.n+' runs each; bar length on a log scale. Throughput: '+keys.map(k=>NAMES[k]+' '+T[k][sz][op+'_MBps']+' MB/s').join(', ')+
      '. Size '+fMB(r0.bytes)+' ('+r0.params.toLocaleString('en-US')+' parameters; the S3 copies are a few hundred bytes smaller because torch.save names the archive differently when writing to memory). Range of '+(op==='write'?'writes':'reads')+' for the slowest target: '+fS(T[keys[v.indexOf(Math.max(...v))]][sz][op+'_min'])+' to '+fS(T[keys[v.indexOf(Math.max(...v))]][sz][op+'_max'])+'. Measured on Apple M1 Pro, Docker Desktop VM / native, shared machine.');
  }
  H.seg($('io-tiers-op'),m=>{op=m;tiers()});H.seg($('io-tiers-sz'),m=>{sz=m;tiers()});tiers();
  const C=D.clusters;
  set('io-tiers-text','<b>Reading it.</b> The Docker volume, the container layer and the Mac SSD are all a local disk underneath, and land within a factor of two or three of each other. The <b>shared host folder</b> is the slowest by far ('+T.ctr_hostdir.l.write_MBps+' MB/s writing 304 MB, against '+T.ctr_volume.l.write_MBps+' MB/s for the volume) because every write crosses the VM boundary as a separate request: the same shape as a network file system, where each operation is a round trip. The <b>S3 store</b>, though it speaks HTTP, writes '+T.ctr_s3.l.write_MBps+' MB/s from inside the VM, since boto3 uploads 8 MiB parts on 10 threads in parallel; from the Mac it falls to '+T.host_s3.l.write_MBps+' MB/s through Docker Desktop’s port forwarding. The running example’s own checkpoints in the setup’s recorded runs (train.py, no fsync) show the same split: median <b>'+fS(C.slurm.median_s)+'</b> on Slurm and '+fS(C.ray.median_s)+' on Ray, both a Docker volume, against <b>'+fS(C.k8s.median_s)+'</b> on Kubernetes, whose <code>/shared</code> is a host folder.');
  set('io-pr1-ans','The shared folder: '+fS(T.ctr_hostdir.l.write_s)+' to write and '+fS(T.ctr_hostdir.l.read_s)+' to read, against '+fS(T.ctr_s3.l.write_s)+' and '+fS(T.ctr_s3.l.read_s)+' for S3 from the same container. A path that looks local can hide a network round trip per operation; the object store moves big parts in parallel. The lesson carries to clusters: measure the mount, do not trust the path.');

  // --- anatomy ---
  const A=D.anatomy;
  const parts=[['Weights (fp32)',A.model_fp32_bytes,'var(--c1)'],['AdamW moments (2 x fp32)',A.adamw_moments_bytes,'var(--c2)'],
    ['Pickle (structure)',A.pickle_bytes,'var(--c4)'],['Zip headers and alignment',A.zip_overhead_bytes+A.other_entries_bytes+A.adamw_step_tensors_bytes,'var(--c5)']];
  function anat(){
    const el=$('io-anat-bar'),W=H.width(el),h=34;let x=0,b='';
    parts.forEach(p=>{const w=p[1]/A.file_bytes*W;b+=H.rect(x,0,w,h,p[2],{rx:0});if(w>46)b+=H.t(x+w/2,21,(100*p[1]/A.file_bytes).toFixed(1)+'%',{a:'middle',fill:'var(--bg)',fs:12,w:600});x+=w});
    el.innerHTML=H.svg(W,h,b,'Checkpoint bytes by kind');
  }
  $('io-anat-leg').innerHTML=parts.map(p=>'<span><i style="background:'+p[2]+'"></i>'+p[0]+': '+p[1].toLocaleString('en-US')+' B</span>').join('');
  set('io-anat-text','<b>'+A.file_bytes.toLocaleString('en-US')+' bytes</b> for '+A.params.toLocaleString('en-US')+' parameters: '+A.bytes_per_param+' bytes per parameter <span class="io-tag io-measured">measured</span>. '+A.zip_entries+' zip entries, '+A.tensor_entries+' of them tensors (30 weight tensors, and for each an exp_avg, an exp_avg_sq and a 4-byte step counter). The moments are exactly twice the weights ('+A.adamw_moments_bytes.toLocaleString('en-US')+' = 2 x '+A.model_fp32_bytes.toLocaleString('en-US')+'). The zip headers and 64-byte alignment padding are '+(100*(A.zip_overhead_bytes)/A.file_bytes).toFixed(1)+'%: noticeable only because the tensors are tiny.');
  H.onRender(anat);anat();

  // --- scale table (derived) ---
  const MOD=[['Running example',112577,4],['8B model',8e9,64],['70B model',70e9,1024],['Llama 3 405B',405e9,16384],['DeepSeek-V3',671e9,2048]];
  const fB=b=>b>=1e12?(b/1e12).toFixed(2)+' TB':b>=1e9?(b/1e9).toFixed(1)+' GB':b>=1e6?(b/1e6).toFixed(2)+' MB':(b/1e3).toFixed(0)+' kB';
  $('io-scale-rows').innerHTML=MOD.map(m=>'<tr><td>'+m[0]+'</td><td class="num">'+(m[1]>=1e9?(m[1]/1e9).toFixed(m[1]<1e10?2:1)+'B':m[1].toLocaleString('en-US'))+'</td><td class="num">'+fB(14*m[1])+'</td><td class="num">'+fB(14*m[1]/m[2])+' <span class="mute">/ '+m[2].toLocaleString('en-US')+'</span></td><td class="num">'+fB(2*m[1])+'</td></tr>').join('');

  // --- write layouts (4 ranks) ---
  const LN={ddp_rank0:'DDP, rank 0 writes',ddp_every:'DDP, every rank writes',fsdp_full:'FSDP, gather to rank 0, one file',fsdp_dcp:'FSDP, DCP: each rank its shard',ddp_dcp:'DDP, DCP: de-duplicated'};
  let tgt='slow_bind';
  function lay(){
    const L=D[tgt].layouts,keys=Object.keys(LN).filter(k=>L[k]);const el=$('io-lay-svg'),W=H.width(el);
    const mx=Math.max(...keys.map(k=>L[k].wall_s));const lab=16,lane=7,gap=3,blockH=lab+4*(lane+gap)+10;const x0=0,x1=W-58;let b='';
    keys.forEach((k,i)=>{const y=i*blockH,r=L[k];
      b+=H.t(0,y+12,LN[k]+'  ·  '+fMB(r.total_bytes)+' in '+r.nfiles+' file'+(r.nfiles>1?'s':''),{fs:11.5,w:600});
      for(let q=0;q<4;q++){const yy=y+lab+q*(lane+gap),g=r.gather_s[q],w=r.rank_s[q];
        b+=H.rect(x0,yy,(r.wall_s/mx)*(x1-x0),lane,'var(--soft)',{stroke:'var(--line)',rx:1});
        if(g>0.002)b+=H.rect(x0,yy,(g/mx)*(x1-x0),lane,'var(--c4)',{rx:1});
        if(w-g>0.0005)b+=H.rect(x0+(g/mx)*(x1-x0),yy,((w-g)/mx)*(x1-x0),lane,'var(--c1)',{rx:1});}
      b+=H.t(x1+4,y+lab+2*(lane+gap)+3,fS(r.wall_s),{fs:11.5,w:600});});
    el.innerHTML=H.svg(W,keys.length*blockH,b,'Checkpoint write time per rank for five layouts');
    const e=L.ddp_every,r0=L.ddp_rank0,fc=L.fsdp_full,fd=L.fsdp_dcp;
    set('io-lay-text','Four lanes per layout, one per rank, median of 3 runs. Every rank writing: '+fMB(e.total_bytes)+' in '+fS(e.wall_s)+', against '+fMB(r0.total_bytes)+' in '+fS(r0.wall_s)+' for rank 0 alone ('+(e.wall_s/r0.wall_s).toFixed(1)+' times the time for 4 times the bytes). FSDP consolidated: '+fS(fc.gather_s[0])+' of gathering, then rank 0 writes ('+fS(fc.wall_s)+' in all); FSDP sharded: '+fS(fd.wall_s)+', the ranks writing at once. '+(tgt==='slow_bind'?'On this single slow pipe, sharding does not beat consolidating: the four ranks share it.':'On the fast volume, gathering is the larger part of the consolidated save, and sharding wins.'));
  }
  H.seg($('io-lay-tgt'),m=>{tgt=m;lay()});H.onRender(lay);lay();
  H.drills($('t-io'));
})();
