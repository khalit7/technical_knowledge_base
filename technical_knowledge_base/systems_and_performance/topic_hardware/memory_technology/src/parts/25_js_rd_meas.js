// ---- Reading: the measured M1 Pro charts that used to sit in the Memory lab tab (moved inline 2026-10-23) ----
// section 2: random blocks (rd-gath); section 3: run metadata (rd-meta); section 6: decode attention (rd-kv); section 7: SSD table (rd-ssd)
(function(){
  const D=MEMD,M=D.meas;
  const meta=document.getElementById('rd-meta');
  if(meta)meta.innerHTML=RD.stat('Device',M.meta.device,'GPU '+M.meta.arch+', 16 GB unified')+RD.stat('Software','MLX '+M.meta.mlx,'Python '+M.meta.python)+
    RD.stat('Runs',M.meta.runs+' x '+M.meta.trials+' trials',M.meta.date)+RD.stat('Load average',M.meta.load[0]+' to '+M.meta.load[1],'shared laptop');
  // section 2: random blocks
  const gEl=document.getElementById('rd-gath');
  function drawG(){if(!gEl)return;const seq=M.ws[M.ws.length-1].y;
    MC.line(gEl,[{name:'useful GB/s',color:'var(--c3)',pts:M.gather}],{logx:true,logy:true,xfmt:MC.fmtB,yfmt:v=>MC.fmtN(v,0),xl:'block size (random position)',yl:'useful GB/s',
      marks:[{x:128,label:'128 B line'},{x:4096,label:'4 KiB',dy:12}],hlines:[{y:seq,label:'sequential, 1 GB: '+MC.fmtN(seq,0),color:'var(--mute)'}],extraY:[seq*1.2],label:'Random blocks'});
    const g={};M.gather.forEach(p=>g[p.x]=p.y);
    document.getElementById('rd-gath-note').innerHTML='512 MB read in blocks of a given size at random positions; consecutive threads read consecutive 16-byte pieces of one block; only useful bytes counted. '+MC.fmtN(g[16],1)+' GB/s at 16 B and '+MC.fmtN(g[128],1)+' at 128 B are the same '+MC.fmtN(g[128]/128*1e9/1e6,0)+' million random lines per second; from about 4 KiB ('+MC.fmtN(g[4096],0)+' GB/s) random blocks read nearly as fast as a stream. <span class="meas">measured here</span>'}
  // section 6: decode attention against the cache
  let kvMode='bytes';const kvEl=document.getElementById('rd-kv');
  function drawKv(){if(!kvEl)return;const cols={MHA:'var(--c2)',GQA:'var(--c1)',MQA:'var(--c3)'};
    const ser=['MHA','GQA','MQA'].map(a=>({name:a+' ('+(a==='MHA'?32:a==='GQA'?8:1)+' KV heads)',color:cols[a],pts:M.kv.filter(k=>k.attn===a).map(k=>({x:kvMode==='bytes'?k.bytes:k.L,y:k.us/1000,lo:k.lo/1000,hi:k.hi/1000}))}));
    if(kvMode==='bytes'){const xs=[1<<19,1<<30];ser.push({name:'bytes / 165 GB/s',color:'var(--mute)',dash:'5 4',pts:xs.map(b=>({x:b,y:b/165e9*1000}))})}
    MC.line(kvEl,ser,{logx:true,logy:true,xfmt:kvMode==='bytes'?MC.fmtB:(v=>v>=1024?MC.fmtN(v/1024,0)+'K':String(v)),yfmt:v=>v>=1?MC.fmtN(v,0):String(+v.toPrecision(1)),xl:kvMode==='bytes'?'KV cache bytes (keys + values, FP16)':'context (tokens)',yl:'ms per step',
      xticks:kvMode==='bytes'?[1<<19,1<<21,1<<23,1<<25,1<<27,1<<29]:[1024,4096,16384,65536,131072],label:'Decode attention'});
    const f=M.kvfit;document.getElementById('rd-kv-note').innerHTML='One layer only; a whole model repeats this per layer. Straight-line fits over caches of 64 MiB and more: GQA '+MC.fmtN(f.GQA.gbs,0)+' GB/s plus '+MC.fmtN(f.GQA.us0/1000,2)+' ms per call ('+f.GQA.n+' points); MHA '+MC.fmtN(f.MHA.gbs,0)+' GB/s ('+f.MHA.n+' points). Small caches sit on a floor of about 0.25 ms per call (launch and synchronisation through Python). The dashed line uses the parent Roofline lab\'s stream-copy bandwidth. <span class="meas">measured here</span>'}
  const kvSeg=document.getElementById('rd-kv-mode');if(kvSeg)RD.seg(kvSeg,m=>{kvMode=m;drawKv()});
  // section 7: SSD table
  const s=M.ssd,ssd=document.getElementById('rd-ssd');
  if(ssd)ssd.innerHTML='<thead><tr><th>Access</th><th class="num">GB/s</th><th class="num">per request</th></tr></thead><tbody>'+
    '<tr><td>sequential, 8 MiB reads</td><td class="num">'+MC.fmtN(s.seq_GBs,2)+' ('+MC.fmtN(s.lo_seq,2)+' to '+MC.fmtN(s.hi_seq,2)+')</td><td class="num">-</td></tr>'+
    [[1048576,'1 MiB'],[65536,'64 KiB'],[4096,'4 KiB']].map(r=>'<tr><td>random '+r[1]+' reads</td><td class="num">'+MC.fmtN(s['rand_'+r[0]+'_GBs'],3)+'</td><td class="num">'+MC.fmtN(s['rand_'+r[0]+'_us'],0)+' &micro;s</td></tr>').join('')+
    '<tr><td>for scale: GPU reading DRAM (1 GB working set)</td><td class="num">'+MC.fmtN(D.nums.m1_dram_ws_gbs,1)+'</td><td class="num">'+MC.fmtN(M.dram_lat.y/1000,2)+' &micro;s per dependent read</td></tr></tbody>';
  const all=()=>{drawG();drawKv()};
  RD.onRender(all);RD.onResize(all);all();
})();
