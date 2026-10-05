// ---- Memory lab tab (t-lab): measured M1 Pro GPU and SSD ----
(function(){
  const D=MEMD,M=D.meas;
  const reg=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(f)};
  const live=()=>{const t=document.getElementById('t-lab');return t&&!t.hidden};
  document.getElementById('lab-meta').innerHTML=RD.stat('Device',M.meta.device,'GPU '+M.meta.arch+', 16 GB unified')+RD.stat('Software','MLX '+M.meta.mlx,'Python '+M.meta.python)+
    RD.stat('Runs',M.meta.runs+' x '+M.meta.trials+' trials',M.meta.date)+RD.stat('Load average',M.meta.load[0]+' to '+M.meta.load[1],'shared laptop');
  // 1
  let wsMode='bw';const wsEl=document.getElementById('lab-ws'),wsNote=document.getElementById('lab-ws-note');
  const bands=[{x0:4096,x1:8192,label:'L1',color:'var(--c3)'},{x0:8192,x1:262144,label:'L2',color:'var(--c1)'},{x0:262144,x1:25165824,label:'SLC',color:'var(--c5)'},{x0:25165824,x1:1<<30,label:'DRAM',color:'var(--c2)'}];
  function drawWs(){
    if(wsMode==='tbl'){const c={};M.chase.forEach(p=>c[p.x]=p);
      wsEl.innerHTML='<div class="tw"><table class="tbl-sm"><thead><tr><th>Working set</th><th class="num">GB/s (all threads)</th><th class="num">run spread</th><th class="num">ns per read (one thread)</th><th class="num">run spread</th></tr></thead><tbody>'+
        M.ws.map(p=>{const q=c[p.x];return '<tr><td>'+MC.fmtB(p.x)+'</td><td class="num">'+MC.fmtN(p.y,0)+'</td><td class="num">'+MC.fmtN(p.lo,0)+' to '+MC.fmtN(p.hi,0)+'</td><td class="num">'+(q?MC.fmtN(q.y,0):'-')+'</td><td class="num">'+(q?MC.fmtN(q.lo,0)+' to '+MC.fmtN(q.hi,0):'')+'</td></tr>'}).join('')+'</tbody></table></div>';
      wsNote.innerHTML='Latency was measured up to 512 MB (a chain over 1 GB would not fit beside the bandwidth buffer). DRAM latency, median of the nine points from 128 MB up: '+MC.fmtN(M.dram_lat.y,0)+' ns ('+MC.fmtN(M.dram_lat.lo,0)+' to '+MC.fmtN(M.dram_lat.hi,0)+').';return}
    const s=wsMode==='bw'?M.ws:M.chase;
    MC.line(wsEl,[{name:wsMode==='bw'?'GB/s':'ns per read',color:wsMode==='bw'?'var(--c1)':'var(--c2)',pts:s}],{logx:true,logy:wsMode==='bw',y0:wsMode==='bw'?50:0,xfmt:MC.fmtB,yfmt:v=>MC.fmtN(v,0),xl:'working set',yl:wsMode==='bw'?'GB/s':'ns per dependent read',
      bands:bands.map(b=>Object.assign({},b,{x1:Math.min(b.x1,s[s.length-1].x)})),label:'Working-set sweep'});
    wsNote.innerHTML=wsMode==='bw'?'Plateaus: about '+MC.fmtN(D.nums.m1_l1_gbs,0)+' GB/s up to 128 KB, '+MC.fmtN(D.nums.m1_l2_gbs,0)+' at 1 MB, '+MC.fmtN(D.nums.m1_slc_gbs,0)+' at 32 MB, '+MC.fmtN(D.nums.m1_dram_ws_gbs,1)+' at 1 GB. Apple quotes 200 GB/s for the DRAM; the parent\'s Roofline lab reached 165 with a stream copy. Shaded: published cache sizes (Philip Turner\'s metal-benchmarks), for orientation only.':
      'Steps at about 61 ns, 95 ns, 300 ns and '+MC.fmtN(M.dram_lat.y,0)+' ns. Little\'s law: '+MC.fmtN(D.nums.m1_dram_ws_gbs,1)+' GB/s x '+MC.fmtN(M.dram_lat.y,0)+' ns = '+MC.fmtN(D.nums.m1_inflight_kb,0)+' KB that must be in flight to keep DRAM busy.'}
  RD.seg(document.getElementById('lab-ws-mode'),m=>{wsMode=m;drawWs()});
  // 2
  const gEl=document.getElementById('lab-g');
  function drawG(){const seq=M.ws[M.ws.length-1].y;
    MC.line(gEl,[{name:'useful GB/s',color:'var(--c3)',pts:M.gather}],{logx:true,logy:true,xfmt:MC.fmtB,yfmt:v=>MC.fmtN(v,0),xl:'block size (random position)',yl:'useful GB/s',
      marks:[{x:128,label:'128 B line'},{x:4096,label:'4 KiB',dy:12}],hlines:[{y:seq,label:'sequential, 1 GB: '+MC.fmtN(seq,0),color:'var(--mute)'}],extraY:[seq*1.2],label:'Random blocks'});
    const g={};M.gather.forEach(p=>g[p.x]=p.y);
    document.getElementById('lab-g-note').innerHTML='Below 128 bytes the useful rate is proportional to the block: '+MC.fmtN(g[16],1)+' GB/s at 16 B, '+MC.fmtN(g[128],1)+' at 128 B, about '+MC.fmtN(g[128]/128*1e9/1e6,0)+' million random lines per second either way, so each access costs a whole line. From about 4 KiB ('+MC.fmtN(g[4096],0)+' GB/s) random blocks read nearly as fast as a stream <span class="meas">measured here</span>. A vLLM block of 16 tokens holds, per layer and KV head, 16 x 128 x 2 bytes = 4 KiB of keys (and 4 KiB of values) for a head dimension of 128 in BF16; the block size and layout of a real server differ by model.'}
  // 3
  let kvMode='bytes';const kvEl=document.getElementById('lab-kv');
  function drawKv(){const cols={MHA:'var(--c2)',GQA:'var(--c1)',MQA:'var(--c3)'};
    const ser=['MHA','GQA','MQA'].map(a=>({name:a+' ('+(a==='MHA'?32:a==='GQA'?8:1)+' KV heads)',color:cols[a],pts:M.kv.filter(k=>k.attn===a).map(k=>({x:kvMode==='bytes'?k.bytes:k.L,y:k.us/1000,lo:k.lo/1000,hi:k.hi/1000}))}));
    if(kvMode==='bytes'){const xs=[1<<19,1<<30];ser.push({name:'bytes / 165 GB/s',color:'var(--mute)',dash:'5 4',pts:xs.map(b=>({x:b,y:b/165e9*1000}))})}
    MC.line(kvEl,ser,{logx:true,logy:true,xfmt:kvMode==='bytes'?MC.fmtB:(v=>v>=1024?MC.fmtN(v/1024,0)+'K':String(v)),yfmt:v=>v>=1?MC.fmtN(v,0):String(+v.toPrecision(1)),xl:kvMode==='bytes'?'KV cache bytes (keys + values, FP16)':'context (tokens)',yl:'ms per step',
      xticks:kvMode==='bytes'?[1<<19,1<<21,1<<23,1<<25,1<<27,1<<29]:[1024,4096,16384,65536,131072],label:'Decode attention'});
    const f=M.kvfit;document.getElementById('lab-kv-note').innerHTML='Straight-line fits over caches of 64 MiB and more: GQA '+MC.fmtN(f.GQA.gbs,0)+' GB/s plus '+MC.fmtN(f.GQA.us0/1000,2)+' ms per call ('+f.GQA.n+' points); MHA '+MC.fmtN(f.MHA.gbs,0)+' GB/s ('+f.MHA.n+' points). Small caches sit on a floor of about 0.25 ms per call (launch and synchronisation through Python). MQA reads 8 times fewer bytes than GQA but is not faster in proportion: with 32 query heads per KV head the kernel spends its time on arithmetic, not on memory. The dashed line (cache-bytes view) uses the parent Roofline lab\'s stream-copy bandwidth.'}
  // 4
  const s=M.ssd;document.getElementById('lab-ssd').innerHTML='<thead><tr><th>Access</th><th class="num">GB/s</th><th class="num">per request</th></tr></thead><tbody>'+
    '<tr><td>sequential, 8 MiB reads</td><td class="num">'+MC.fmtN(s.seq_GBs,2)+' ('+MC.fmtN(s.lo_seq,2)+' to '+MC.fmtN(s.hi_seq,2)+')</td><td class="num">-</td></tr>'+
    [[1048576,'1 MiB'],[65536,'64 KiB'],[4096,'4 KiB']].map(r=>'<tr><td>random '+r[1]+' reads</td><td class="num">'+MC.fmtN(s['rand_'+r[0]+'_GBs'],3)+'</td><td class="num">'+MC.fmtN(s['rand_'+r[0]+'_us'],0)+' &micro;s</td></tr>').join('')+
    '<tr><td>for scale: GPU reading DRAM (1 GB working set)</td><td class="num">'+MC.fmtN(D.nums.m1_dram_ws_gbs,1)+'</td><td class="num">'+MC.fmtN(M.dram_lat.y/1000,2)+' &micro;s per dependent read</td></tr></tbody>';
  function all(){if(!live())return;drawWs();drawG();drawKv()}
  RD.seg(document.getElementById('lab-kv-mode'),m=>{kvMode=m;drawKv()});
  reg(()=>{drawWs();drawG();drawKv()});
  let t=0;addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(all,80)});
})();
