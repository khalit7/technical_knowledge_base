// ---- Kernel lab: attention, naive against online softmax ----
(function(){
  const X=window.LABX,D=X.D,$=X.$,C=X.calc,f=X.fmt,R=D.roof;
  // ---- one query row, step by step ----
  const row=C.demoRow(),T=4,ON=C.online(row.s,row.v,T),NV=C.naive(row.s,row.v);
  let om='online';
  const nSteps=()=>om==='online'?ON.length+1:row.s.length/T+3;
  const r4=x=>(Math.round(x*1e4)/1e4).toFixed(4);
  function draw(i){
    const el=$('lab-on-svg'),W=X.width(el),H=150,n=row.s.length,bw=(W-20)/n,mn=Math.min(...row.s),mxs=Math.max(...row.s);
    const y=v=>110-(v-mn)/(mxs-mn)*90;
    const nt=n/T,tiles=om==='online'?Math.min(i+1,nt):Math.min(i+1,nt);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Scores of one query row against 32 keys">';
    for(let t=0;t<nt;t++){const cur=t===i&&i<nt;s+='<rect x="'+(10+t*T*bw)+'" y="14" width="'+(T*bw)+'" height="100" fill="'+(cur?'var(--hl)':'none')+'" stroke="var(--line)"></rect>'}
    row.s.forEach((v,j)=>{const seen=Math.floor(j/T)<tiles;
      s+='<rect x="'+(10+j*bw+1)+'" y="'+y(v)+'" width="'+Math.max(1,bw-2)+'" height="'+(112-y(v))+'" fill="'+(seen?'var(--c1)':'var(--dim)')+'" opacity="'+(seen?0.85:0.5)+'"></rect>'});
    let mline=null;
    if(om==='online'){mline=ON[Math.min(i,ON.length-1)].m}else if(i>=nt){mline=NV.m}
    if(mline!=null){s+='<line x1="10" x2="'+(W-10)+'" y1="'+y(mline)+'" y2="'+y(mline)+'" stroke="var(--bad)" stroke-dasharray="4 3"></line><text x="'+(W-12)+'" y="'+(y(mline)-3)+'" text-anchor="end" font-size="10.5" fill="var(--bad)">'+(om==='online'?'running max':'max')+' m = '+mline.toFixed(2)+'</text>'}
    s+='<text x="10" y="128" font-size="10.5" fill="var(--mute)">key 1</text><text x="'+(W-10)+'" y="128" text-anchor="end" font-size="10.5" fill="var(--mute)">key 32</text>';
    if(om==='naive'){const st=Math.min(i+1,nt)*T+(i>=nt+1?n:0);s+='<text x="'+(W/2)+'" y="144" text-anchor="middle" font-size="11">stored in device memory: '+st+' numbers</text>'}
    else s+='<text x="'+(W/2)+'" y="144" text-anchor="middle" font-size="11">held on chip: one tile (4 scores) + m, l, acc</text>';
    el.innerHTML=s+'</svg>';
    let cap,stats;
    if(om==='online'){
      if(i<ON.length){const o=ON[i];
        cap='<b>Tile '+(i+1)+' of '+nt+'.</b> Tile max '+o.mt.toFixed(2)+(i>0&&o.alpha<1?'; the running max grew, so the old sum and the old output are multiplied by &alpha; = e<sup>old m &minus; new m</sup> = '+r4(o.alpha):i>0?'; the max did not grow, so &alpha; = 1 and nothing is rescaled':'')+'. Then add this tile\'s e<sup>s &minus; m</sup> to l and e<sup>s &minus; m</sup> v to acc.';
        stats=X.stat('running max m',o.m.toFixed(2),'')+X.stat('&alpha; this tile',i===0?'0 (first tile)':r4(o.alpha),'rescale factor')+X.stat('running sum l',r4(o.l),'')+X.stat('running acc',r4(o.acc),'unnormalised output')}
      else{const o=ON[ON.length-1];cap='<b>Finish.</b> Output = acc / l = '+o.out.toFixed(12)+'. The naive method gets '+NV.out.toFixed(12)+': difference '+Math.abs(o.out-NV.out).toExponential(1)+'. Same answer, never holding more than one tile.';
        stats=X.stat('online output',o.out.toFixed(6),'acc / l')+X.stat('naive output',NV.out.toFixed(6),'')+X.stat('largest thing held',(T+3)+' numbers','one tile + m, l, acc')}
    }else{
      if(i<nt){cap='<b>Tile '+(i+1)+' of '+nt+'.</b> Compute these 4 scores and <b>store</b> them: the max is not known until every score exists.';stats=X.stat('scores stored',String((i+1)*T),'of 32')}
      else if(i===nt){cap='<b>Max.</b> Read all 32 stored scores: m = '+NV.m.toFixed(2)+'.';stats=X.stat('m',NV.m.toFixed(2),'')+X.stat('stored',String(n),'scores')}
      else if(i===nt+1){cap='<b>Exponentials and sum.</b> Read the scores again, write 32 probabilities: l = '+r4(NV.l)+'.';stats=X.stat('l',r4(NV.l),'')+X.stat('stored',String(2*n),'scores + probabilities')}
      else{cap='<b>Output.</b> Read the 32 probabilities and the 32 values: output = '+NV.out.toFixed(12)+'. Memory held grew with the row length; for a real head it is a whole N x N matrix.';stats=X.stat('naive output',NV.out.toFixed(6),'')+X.stat('largest thing held',String(2*n)+' numbers','grows with N')}
    }
    $('lab-on-cap').innerHTML=cap;$('lab-on-stats').innerHTML=stats;
  }
  X.seg($('lab-on-mode'),[['online','Online softmax (FlashAttention)'],['naive','Naive: store every score']],om,v=>{om=v;oa.reset(nSteps())});
  const oa=X.anim({card:'lab-on-card',ctl:'lab-on-ctl',n:nSteps(),draw,ms:1500,label:'Step'});
  oa.show();

  // ---- measured chart: time or memory against N ----
  const NS=[512,1024,2048,4096,8192,16384],SER=[['naive','naive (S in memory)','var(--c2)'],['flash','flash-style, ours','var(--c3)'],['sdpa','MLX fused attention','var(--c4)']];
  const H0=4,d0=64;
  let am='ms';
  function plot(){
    const el=$('lab-at-plot'),W=X.width(el),Hh=W<480?230:260,ml=W<480?44:52,mr=12,mt=10,mb=34;
    const pts=SER.map(([k])=>NS.map(n=>{const c=X.find('attention',k,n);return c?{n,v:am==='ms'?c.ms:c.peak_mib}:null}).filter(Boolean));
    const ext=am==='mib'?{n:16384,v:(C.naiveAttnBytes(H0,16384,4)+C.attnInputs(H0,16384,d0,4))/2**20}:null;
    const all=pts.flat().map(p=>p.v).concat(ext?[ext.v]:[]),lo=Math.pow(10,Math.floor(Math.log10(Math.min(...all)))),hi=Math.pow(10,Math.ceil(Math.log10(Math.max(...all))));
    const x=n=>ml+(Math.log2(n/512)/5)*(W-ml-mr),y=v=>mt+(1-(Math.log10(v/lo))/Math.log10(hi/lo))*(Hh-mt-mb);
    let s='<svg viewBox="0 0 '+W+' '+Hh+'" width="'+W+'" height="'+Hh+'" role="img" aria-label="Attention '+(am==='ms'?'time':'peak memory')+' against sequence length">';
    for(let v=lo;v<=hi*1.001;v*=10){s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"></line><text x="'+(ml-4)+'" y="'+(y(v)+4)+'" text-anchor="end" font-size="10.5">'+(v>=1?f(v):v)+'</text>'}
    NS.forEach(n=>{s+='<text x="'+x(n)+'" y="'+(Hh-mb+14)+'" text-anchor="middle" font-size="10.5">'+(n>=1024?n/1024+'K':n)+'</text>'});
    s+='<text x="'+((ml+W-mr)/2)+'" y="'+(Hh-4)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">sequence length N (4 heads, d = 64, fp32)</text>';
    s+='<text x="4" y="'+(mt+2)+'" font-size="10.5" fill="var(--mute)" transform="rotate(-90 4 '+(mt+2)+')" text-anchor="end">'+(am==='ms'?'ms':'MiB')+'</text>';
    pts.forEach((ps,j)=>{const col=SER[j][2];s+='<polyline fill="none" stroke="'+col+'" stroke-width="2" points="'+ps.map(p=>x(p.n)+','+y(p.v)).join(' ')+'"></polyline>'+
      ps.map(p=>'<circle cx="'+x(p.n)+'" cy="'+y(p.v)+'" r="3" fill="'+col+'"><title>'+SER[j][1]+', N = '+p.n+': '+(am==='ms'?X.fms(p.v)+' ms':f(p.v,0)+' MiB')+'</title></circle>').join('')});
    if(ext){const p=pts[0][pts[0].length-1];s+='<line x1="'+x(p.n)+'" y1="'+y(p.v)+'" x2="'+x(ext.n)+'" y2="'+y(ext.v)+'" stroke="var(--c2)" stroke-dasharray="4 3" stroke-width="2"></line><circle cx="'+x(ext.n)+'" cy="'+y(ext.v)+'" r="3.5" fill="none" stroke="var(--c2)"></circle><text x="'+(x(ext.n)-6)+'" y="'+(y(ext.v)+14)+'" text-anchor="end" font-size="10.5" fill="var(--c2)">not run: '+f(ext.v/1024,1)+' GiB (derived)</text>'}
    el.innerHTML=s+'</svg>';
    $('lab-at-note').innerHTML=SER.map(([,l,c])=>'<span style="color:'+c+';font-weight:600">&#9632;</span> '+l).join(' &nbsp; ')+'. Log scales. '+(am==='ms'?'Median of 3 runs; naive not run at 16K.':'Peak bytes the MLX allocator held during one call, inputs (Q, K, V, O) included. The dashed point is H x N<sup>2</sup> x 4 bytes + inputs: MLX reuses the score buffer for P, so the naive peak is one N x N matrix per head, as the measured points confirm.');
  }
  X.seg($('lab-at-mode'),[['ms','Time'],['mib','Peak memory']],am,v=>{am=v;plot()});
  const a=(k,n)=>X.find('attention',k,n);
  const gfa=c=>C.gflops(c.flops,c.ms);
  const big=C.naiveAttnBytes(32,131072,2);
  $('lab-at-find').innerHTML='Memory: the naive version\'s peak grows 4 times per doubling of N ('+[2048,4096,8192].map(n=>f(a('naive',n).peak_mib,0)).join(', ')+' MiB at 2K, 4K, 8K) because one N x N score matrix per head must exist; the fused kernels only hold their inputs ('+f(a('flash',8192).peak_mib,0)+' MiB for ours at 8K). Scale that to a real model: 32 heads at 128K tokens in bf16 would need '+X.fbytes(big)+' of scores per layer (32 x 131,072<sup>2</sup> x 2 bytes <span class="lab-tag d">derived</span>), which is why long-context training does not work without a FlashAttention-style kernel. Time: at 8K our kernel takes <b>'+X.fms(a('flash',8192).ms)+' ms</b> against <b>'+X.fms(a('naive',8192).ms)+' ms</b> naive, and MLX\'s own fused kernel <b>'+X.fms(a('sdpa',8192).ms)+' ms</b> ('+f(gfa(a('flash',8192))/1e3,2)+' and '+f(gfa(a('sdpa',8192))/1e3,2)+' TFLOP/s, '+f(100*gfa(a('flash',8192))/R.peak_fp32_gf,0)+'% and '+f(100*gfa(a('sdpa',8192))/R.peak_fp32_gf,0)+'% of the FMA peak). Below 2K all three are within launch noise. The naive version is not slow because of arithmetic (it uses the fast library matmul); it is slow because it writes and reads N x N matrices.';
  $('lab-at-metal').textContent=D.metal.FLASH;$('lab-at-triton').textContent=D.tsrc.flash_attn;
  plot();
  X.onRender(()=>{oa.show();plot()});X.onResize(()=>{oa.show();plot()});
})();
