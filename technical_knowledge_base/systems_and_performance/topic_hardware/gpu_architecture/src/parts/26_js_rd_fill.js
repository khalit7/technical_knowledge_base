// ---- Reading tab: tables and numbers filled from window.GA (src/recompute.py), so prose and data cannot drift ----
(function(){
  const G=window.GA,$=id=>document.getElementById(id);
  const fmt=(v,d)=>v==null?'':Number(v).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
  const chip=id=>G.chips.find(c=>c.id===id);
  // s1: one-screen table
  (function(){
    const cols=[['a100','A100 SXM','A100'],['h100','H100 SXM','H100 SXM'],['b200','B200','B200 (HGX)'],['b300','B300','B300 (HGX)'],['rubin','Rubin','Rubin'],['rtx5090','RTX 5090','RTX 5090']];
    const P=k=>G.peak[k];
    const pk=(v)=>v===null?'<span class="mute">none</span>':v==='ns'?'<span class="mute">n/s</span>':fmt(v);
    const rows=[
      ['Year',c=>c.year],
      ['Compute capability',c=>c.cc||'<span class="mute">n/s</span>'],
      ['SMs enabled (of full die)',c=>(c.sm_on!=null?fmt(c.sm_on):'<span class="mute">n/s</span>')+(c.sm_full!=null?' ('+fmt(c.sm_full)+')':'')],
      ['Dies',c=>c.dies],
      ['Tensor core generation',c=>({a100:'3rd',h100:'4th',b200:'5th',b300:'5th',rubin:'n/s',rtx5090:'5th (consumer)'})[c.id]],
      ['Shared memory per SM, KB',c=>c.smem_kb!=null?c.smem_kb:'<span class="mute">n/s</span>'],
      ['Tensor memory per SM',c=>(c.id==='b200'||c.id==='b300')?'256 KB':(c.id==='rubin'?'<span class="mute">n/s</span>':'none')],
      ['L2, MB',c=>c.l2_mb!=null?c.l2_mb:'<span class="mute">n/s</span>'],
      ['Memory',c=>fmt(c.gb)+' GB '+c.mem],
      ['Bandwidth, TB/s',c=>c.tbs],
      ['BF16 dense, TFLOPS',(c,k)=>pk(P(k).bf16)],
      ['FP8 dense',(c,k)=>pk(P(k).fp8)],
      ['FP4 dense',(c,k)=>pk(P(k).fp4)],
    ];
    let h='<thead><tr><th></th>'+cols.map(c=>'<th class="num">'+c[1]+'</th>').join('')+'</tr></thead><tbody>';
    rows.forEach(r=>{h+='<tr><td>'+r[0]+'</td>'+cols.map(c=>'<td class="num">'+r[1](chip(c[0]),c[2])+'</td>').join('')+'</tr>'});
    $('ga-oneTable').innerHTML=h+'</tbody>';
  })();
  set('ga-fmas',fmt(G.tile.fmas));
  set('ga-rfTot',G.gens.h100_rf_total_mb.toFixed(1));
  set('ga-accKB',G.tile.acc_bytes/1024);
  // s3 numbers
  const H=G.hide,L=G.little;
  set('ga-h0',(H[0].util_steady*100).toFixed(1));set('ga-h1',Math.round(H[1].util_steady*100));set('ga-h2',Math.round(H[2].util_steady*100));
  set('ga-lM1bw',Math.round(L.stream_peak));set('ga-lM1lat',Math.round(G.m1.levels_ns.dram_ns));set('ga-lM1kb',Math.round(L.m1_inflight_kb));set('ga-lM1core',L.m1_per_core_kb.toFixed(1));
  set('ga-lHlat',L.h100_lat_ns);set('ga-lHmb',L.h100_inflight_mb.toFixed(2));set('ga-lHsm',fmt(L.h100_per_sm_bytes));set('ga-lH4',fmt(L.h100_threads_4b));set('ga-lH16',fmt(L.h100_threads_16b));
  set('ga-sOne',L.one_warp.toFixed(2));set('ga-sPeak',Math.round(L.stream_peak));set('ga-sRatio',L.ratio);
  set('ga-cOne',L.chase_one.toFixed(1));set('ga-cSat',Math.round(L.chase_sat));set('ga-cRatio',L.chase_ratio);
  // s4
  const O=G.occ_tile;set('ga-oR',O.by_regs);set('ga-oS',O.by_smem);set('ga-oW',O.warps);set('ga-oP',Math.round(O.occ*100));
  const sm=k=>G.m1.smem.find(p=>p[0]===k)[1];
  set('ga-sm20',Math.round(sm(20)));set('ga-sm24',Math.round(sm(24)));
  // s5 divergence bars
  (function(){
    const D=G.m1.div,mx=D[D.length-1][1];let h='';
    D.forEach(d=>{
      h+='<div class="row"><div class="nm">'+d[0]+' path'+(d[0]>1?'s':'')+', divergent</div><div class="track"><div class="fill" style="width:'+(100*d[1]/mx).toFixed(2)+'%;background:var(--c2)"></div></div><div class="val">'+d[1].toFixed(1)+' ms</div></div>';
      h+='<div class="row"><div class="nm mute">'+d[0]+' path'+(d[0]>1?'s':'')+', uniform</div><div class="track"><div class="fill" style="width:'+(100*d[4]/mx).toFixed(2)+'%;background:var(--c1)"></div></div><div class="val">'+d[4].toFixed(1)+' ms</div></div>';
    });
    $('ga-divBars').innerHTML=h;
  })();
  set('ga-d2',G.div_ratio2.toFixed(2));set('ga-d32',G.div_ratio32.toFixed(1));set('ga-dsg',G.div_sg32.toFixed(2));
  document.querySelectorAll('.ga-load').forEach(e=>e.textContent=G.m1.load_min+' to '+G.m1.load_max);
  document.querySelectorAll('.ga-mlx').forEach(e=>e.textContent=G.m1.versions.split(' ')[1]);
  // s6 ladder
  const Lu=G.luo,Ln=G.luo_ns;
  const tri=k=>Lu.A100[k]+' / '+Lu.H800[k]+' / '+Lu.RTX4090[k];
  set('ga-lSm',tri('smem'));set('ga-lL1',tri('l1'));set('ga-lL2',tri('l2'));set('ga-lGl',tri('glob'));
  set('ga-lSmNs',Ln.H800.smem);set('ga-lL1Ns',Ln.H800.l1);set('ga-lL2Ns',Ln.H800.l2);set('ga-lGlNs',Ln.H800.glob);set('ga-lDsNs',(180/Lu.H800.clk).toFixed(1));
  const lv=G.m1.levels_ns;set('ga-m1L1',Math.round(lv.l1_ns));set('ga-m1L2',Math.round(lv.l2_ns));set('ga-m1SLC',Math.round(lv.slc_ns/10)*10);set('ga-m1D',Math.round(lv.dram_ns));
  // s7, s8
  set('ga-hclk',G.h100_clock.toFixed(2));set('ga-tA',G.tile.ampere_instr);set('ga-tH',G.tile.hopper_instr);set('ga-tB',G.tile.blackwell_instr);set('ga-wgPct',G.gens.luo_wgmma_frac);
  set('ga-cpa',fmt(G.tile.cpasync_16B));set('ga-tma',G.tile.tma_instr);set('ga-tmc',G.tile.tmem_cols);
  // s10 formats table
  (function(){
    const F=[['tf32','TF32'],['bf16','FP16 / BF16'],['fp8','FP8'],['fp6','FP6'],['fp4','FP4'],['int8','INT8 (TOPS)'],['fp64','FP64 tensor']];
    const names=Object.keys(G.peak);let mode='tf';
    function draw(){
      let h='<thead><tr><th>Format</th>'+names.map(n=>'<th class="num">'+n+'</th>').join('')+'</tr></thead><tbody>';
      F.forEach(f=>{h+='<tr><td>'+f[1]+'</td>'+names.map(n=>{const v=G.peak[n][f[0]],b=G.peak[n].bf16;
        if(v===null)return '<td class="fmtcell none">none</td>';if(v==='ns')return '<td class="fmtcell ns">n/s</td>';
        const r=v/b,al=Math.max(.08,Math.min(.85,Math.log2(r+1e-9)/4+.35));
        const bg=f[0]==='bf16'?'var(--soft)':(r>1.01?'rgba(63,127,86,'+al.toFixed(2)+')':'rgba(194,112,58,'+(Math.min(.6,.25+(1-r)*.5)).toFixed(2)+')');
        return '<td class="fmtcell" style="background:'+bg+'">'+(mode==='tf'?fmt(v,v<10?2:(v%1?1:0)):(r>=10?r.toFixed(1):r.toFixed(r%1?2:0))+'&times;')+'</td>'}).join('')+'</tr>'});
      $('ga-fmtTable').innerHTML=h+'</tbody>';
    }
    RD.seg($('ga-fmtSeg'),m=>{mode=m;draw()});draw();
    const R=(p,b)=>Math.round(p/b);
    set('ga-rA',R(312,2.039));set('ga-rH',R(989.5,3.35));set('ga-rB',R(2250,8));set('ga-rR',R(4000,22));set('ga-rH8',R(1979,3.35));set('ga-rB8',R(4500,8));set('ga-rR8',R(17500,22));
  })();
  // s11 consumer vs datacenter
  (function(){
    const r=[
      ['SMs','170','132','148 (independent)'],
      ['Compute capability, wgmma / tcgen05','12.0, neither','9.0, wgmma','10.0, tcgen05 + TMEM'],
      ['BF16 dense, FP32 accumulate, TFLOPS','209.5','989.5','2,250'],
      ['FP8 dense','419','1,979','4,500'],
      ['FP4 dense','1,676','none','9,000'],
      ['Memory','32 GB GDDR7','80 GB HBM3','180 GB HBM3e'],
      ['Bandwidth','1.79 TB/s','3.35 TB/s','8 TB/s'],
      ['L2','96 MB','50 MB','n/s'],
      ['Shared memory per SM / resident warps','100 KB / 48','228 KB / 64','228 KB / 64'],
      ['GPU-to-GPU','PCIe 5.0 x16, 64 GB/s each way','NVLink 900 GB/s','NVLink 1.8 TB/s'],
      ['Power','575 W','up to 700 W','up to 1,200 W'],
      ['Price','$1,999 at launch','not listed','not listed'],
    ];
    $('ga-cvd').innerHTML='<thead><tr><th></th><th class="num">RTX 5090</th><th class="num">H100 SXM</th><th class="num">B200</th></tr></thead><tbody>'+r.map(x=>'<tr><td>'+x[0]+'</td><td class="num">'+x[1]+'</td><td class="num">'+x[2]+'</td><td class="num">'+x[3]+'</td></tr>').join('')+'</tbody>';
  })();
  // predict-then-reveal widgets
  document.querySelectorAll('#t-read .pred').forEach(p=>{const right=p.dataset.right;p.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
    p.querySelectorAll('.opts button').forEach(x=>x.classList.toggle('right',x.dataset.a===right));if(b.dataset.a!==right)b.classList.add('wrong');p.classList.add('done')}))});
})();
