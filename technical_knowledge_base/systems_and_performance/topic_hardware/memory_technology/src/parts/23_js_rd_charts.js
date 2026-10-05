// ---- Shared chart helpers (window.MC) and the Reading tab's static charts ----
window.MC=(function(){
  const D=window.MEMD;
  const fmtB=b=>b>=1<<30?(b/(1<<30)).toFixed(b%(1<<30)?1:0)+' GiB':b>=1<<20?(b/(1<<20)).toFixed(0)+' MiB':b>=1024?(b/1024).toFixed(0)+' KiB':b+' B';
  const fmtN=(v,d)=>{if(!isFinite(v))return '-';const a=Math.abs(v);d=d==null?(a>=100?0:a>=10?1:2):d;return v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})};
  const gb=b=>fmtN(b/1e9,b/1e9>=100?0:b/1e9>=10?1:2)+' GB';
  // line chart: series [{name,color,pts:[{x,y,lo,hi}],dash}], opts {logx,logy,xl,yl,xfmt,yfmt,marks:[{x,label}],bands:[{x0,x1,label,color}],h}
  function line(el,series,o){
    const W=RD.width(el),L=W<500?46:56,R=12,B=o.xl?44:30;
    // legend rows above the plot, wrapped to the width
    const leg=[];let lx_=L+4,lr=0;series.forEach(se=>{if(!se.name)return;const w=se.name.length*5.8+26;if(lx_+w>W-R&&lx_>L+4){lr++;lx_=L+4}leg.push([lx_,lr,se]);lx_+=w});
    const T=14+(leg.length?(lr+1)*13:0),H=(o.h||(W<500?250:290))+(T-14);
    const xs=[],ys=[];series.forEach(s=>s.pts.forEach(p=>{xs.push(p.x);ys.push(p.y);if(p.lo!=null)ys.push(p.lo);if(p.hi!=null)ys.push(p.hi)}));
    (o.extraY||[]).forEach(v=>ys.push(v));
    const lx=o.logx?Math.log10:v=>v,ly=o.logy?Math.log10:v=>v;
    let x0=lx(Math.min(...xs)),x1=lx(Math.max(...xs)),y0=o.y0!=null?ly(o.y0):ly(Math.min(...ys)),y1=o.y1!=null?ly(o.y1):ly(Math.max(...ys));
    if(o.logy){y0=Math.floor(y0);y1=Math.ceil(y1)}else{y0=o.y0!=null?y0:0;y1=y1*1.08}
    if(x1===x0)x1=x0+1;
    const X=v=>L+(lx(v)-x0)/(x1-x0)*(W-L-R),Y=v=>T+(1-(ly(v)-y0)/(y1-y0))*(H-T-B);
    let s='';
    (o.bands||[]).forEach(b=>{const a=X(b.x0),c=X(b.x1);s+='<rect x="'+a+'" y="'+T+'" width="'+Math.max(0,c-a)+'" height="'+(H-T-B)+'" style="fill:'+b.color+';opacity:.10"/>';
      if(b.label)s+=RD.t((a+c)/2,T+11,b.label,{a:'middle',fs:10,fill:'var(--mute)'})});
    // grid
    if(o.logy){for(let e=y0;e<=y1;e++){const yy=Y(Math.pow(10,e));s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" style="stroke:var(--line)"/>'+RD.t(L-4,yy+3,(o.yfmt||fmtN)(Math.pow(10,e)),{a:'end',fs:10,fill:'var(--mute)'})}}
    else{const st=niceStep((y1-y0)/4);for(let v=0;v<=y1+1e-9;v+=st){const yy=Y(v);s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" style="stroke:var(--line)"/>'+RD.t(L-4,yy+3,(o.yfmt||(u=>fmtN(u,st>=1?0:st>=0.1?1:2)))(v),{a:'end',fs:10,fill:'var(--mute)'})}}
    const tk=o.xticks||series[0].pts.map(p=>p.x);const every=Math.max(1,Math.ceil(tk.length/(W<500?5:9)));
    tk.forEach((v,i)=>{if(i%every)return;const xx=X(v);s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+(H-B)+'" y2="'+(H-B+4)+'" style="stroke:var(--mute)"/>'+RD.t(xx,H-B+15,(o.xfmt||fmtN)(v),{a:'middle',fs:10,fill:'var(--mute)'})});
    if(o.xl)s+=RD.t(L+(W-L-R)/2,H-6,o.xl,{a:'middle',fs:11,fill:'var(--mute)'});
    if(o.yl)s+='<text transform="translate(11,'+(T+(H-T-B)/2)+') rotate(-90)" text-anchor="middle" font-size="11" style="fill:var(--mute)">'+o.yl+'</text>';
    (o.hlines||[]).forEach(h=>{const yy=Y(h.y);s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" style="stroke:'+h.color+'" stroke-dasharray="5 4"/>'+RD.t(L+4,yy-4,h.label,{fs:10,fill:h.color})});
    (o.marks||[]).forEach(m=>{const xx=X(m.x);s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+T+'" y2="'+(H-B)+'" style="stroke:var(--mute)" stroke-dasharray="2 3"/>'+RD.t(xx+3,H-B-4-(m.dy||0),m.label,{fs:10,fill:'var(--mute)'})});
    series.forEach(se=>{let d='';se.pts.forEach((p,i)=>{d+=(i?'L':'M')+X(p.x).toFixed(1)+' '+Y(p.y).toFixed(1);
        if(p.lo!=null&&p.hi!=null)s+='<line x1="'+X(p.x)+'" x2="'+X(p.x)+'" y1="'+Y(p.lo)+'" y2="'+Y(p.hi)+'" style="stroke:'+se.color+';opacity:.55"/>'});
      s+='<path d="'+d+'" fill="none" style="stroke:'+se.color+'" stroke-width="2"'+(se.dash?' stroke-dasharray="'+se.dash+'"':'')+'/>';
      se.pts.forEach(p=>{s+='<circle cx="'+X(p.x)+'" cy="'+Y(p.y)+'" r="3" style="fill:'+se.color+'"><title>'+(se.name||'')+': '+(o.xfmt||fmtN)(p.x)+', '+fmtN(p.y)+'</title></circle>'})});
    // legend
    leg.forEach(([x,r,se])=>{const y=6+r*13;s+='<rect x="'+x+'" y="'+(y+2)+'" width="10" height="3" style="fill:'+se.color+'"/>'+RD.t(x+13,y+7,se.name,{fs:10})});
    el.innerHTML=RD.svg(W,H,s,o.label||'chart');
  }
  function niceStep(r){const p=Math.pow(10,Math.floor(Math.log10(r)));const m=r/p;return (m<1.5?1:m<3?2:m<7?5:10)*p}
  // horizontal bars on a log or linear scale: rows [{name,v,label,color,hl}]
  function bars(el,rows,o){o=o||{};const mx=Math.max(...rows.map(r=>r.v)),mn=Math.min(...rows.map(r=>r.v));
    const lo=o.log?Math.floor(Math.log10(mn)):0,hi=o.log?Math.ceil(Math.log10(mx)):mx;
    const f=v=>o.log?(Math.log10(v)-lo)/(hi-lo):v/hi;
    el.innerHTML=rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><div class="nm" title="'+RD.esc(r.name)+'">'+r.name+'</div><div class="track"><div class="fill" style="width:'+(Math.max(.01,f(r.v))*100).toFixed(1)+'%;background:'+(r.color||'var(--acc)')+'"></div></div><div class="val">'+r.label+'</div></div>').join('')}
  return {D,fmtB,fmtN,gb,line,bars};
})();

// ---- section 1: NVIDIA generations ----
(function(){
  const D=MEMD,el=document.getElementById('rd-gen-svg'),note=document.getElementById('rd-gen-note');let mode='idx';
  function draw(){const g=D.gens,a=g[0];const xs=g.map(x=>x.year);
    if(mode==='idx'){MC.line(el,[{name:'BF16 FLOP/s',color:'var(--c1)',pts:g.map(x=>({x:x.year,y:x.bf16/a.bf16}))},{name:'HBM bandwidth',color:'var(--c3)',pts:g.map(x=>({x:x.year,y:x.tbs/a.tbs}))},{name:'HBM capacity',color:'var(--c2)',pts:g.map(x=>({x:x.year,y:x.gb/a.gb}))}],
      {xticks:xs,xfmt:v=>String(v),yfmt:v=>MC.fmtN(v,0)+'x',yl:'times the A100',label:'Growth since A100'});
      note.innerHTML='A100 80GB = 1. Rubin against A100: BF16 '+MC.fmtN(D.nums.gen_bf16_x,1)+'&times;, bandwidth '+MC.fmtN(D.nums.gen_bw_x,1)+'&times;, capacity '+MC.fmtN(D.nums.gen_gb_x,1)+'&times;. Points: '+g.map(x=>x.name+' '+x.year).join(', ')+' (year announced; Rubin in production 2026). Dense BF16, HBM per GPU, vendor pages (sources in the Further reading tab).'}
    else if(mode==='ridge'){MC.line(el,[{name:'FLOPs per byte at the ridge',color:'var(--c4)',pts:g.map(x=>({x:x.year,y:x.ridge}))}],{xticks:xs,xfmt:v=>String(v),yl:'FLOPs per byte',label:'Ridge point'});
      note.innerHTML='Dense BF16 FLOP/s divided by HBM bytes/s: a kernel needs at least this many FLOPs per byte it moves to be compute-bound. '+g.map(x=>x.name+' '+MC.fmtN(x.ridge,0)).join(', ')+'. It rose to the B200 and falls with Rubin\'s 22 TB/s.'}
    else{MC.line(el,[{name:'full-memory reads per second',color:'var(--c6)',pts:g.map(x=>({x:x.year,y:x.reads}))}],{xticks:xs,xfmt:v=>String(v),yl:'reads of all HBM per s',label:'Reads per second'});
      note.innerHTML='Bandwidth / capacity: the batch-1 decode ceiling, in tokens per second, for a model that fills the memory. '+g.map(x=>x.name+' '+MC.fmtN(x.reads,0)).join(', ')+'.'}}
  RD.seg(document.getElementById('rd-gen-mode'),m=>{mode=m;draw()});RD.onRender(draw);RD.onResize(draw);draw();
})();

// ---- section 2: energy table ----
(function(){const rows=[['32-bit int add',0.1],['32-bit float add',0.9],['32-bit register file read',1],['32-bit int multiply',3.1],['32-bit float multiply',3.7],['32-bit SRAM cache read (8 KB)',5],['32-bit DRAM read',640]];
  MC.bars(document.getElementById('rd-energy'),rows.map(r=>({name:r[0],v:r[1],label:r[1]+' pJ',color:r[1]>100?'var(--c2)':r[1]>=5?'var(--c5)':'var(--c1)',hl:r[1]>100})),{log:true})})();

// ---- section 3: the measured ladder ----
(function(){
  const D=MEMD,el=document.getElementById('rd-lad-svg'),note=document.getElementById('rd-lad-note');let mode='bw';
  const bands=[{x0:4096,x1:8192,label:'L1',color:'var(--c3)'},{x0:8192,x1:262144,label:'L2',color:'var(--c1)'},{x0:262144,x1:25165824,label:'SLC 24 MB',color:'var(--c5)'},{x0:25165824,x1:1<<30,label:'DRAM',color:'var(--c2)'}];
  function draw(){const s=mode==='bw'?D.meas.ws:D.meas.chase;
    const bb=bands.map(b=>Object.assign({},b,{x1:Math.min(b.x1,s[s.length-1].x)}));
    MC.line(el,[{name:mode==='bw'?'read bandwidth (median of 3 runs)':'ns per dependent read',color:mode==='bw'?'var(--c1)':'var(--c2)',pts:s}],
      {logx:true,logy:mode==='bw',xfmt:MC.fmtB,yfmt:mode==='bw'?(v=>MC.fmtN(v,0)):(v=>MC.fmtN(v,0)),xl:'working set',yl:mode==='bw'?'GB/s':'ns per read',bands:bb,y0:mode==='bw'?50:0,label:'Memory ladder'});
    note.innerHTML=(mode==='bw'?'All threads read a buffer of the given size repeatedly (65,536 threads, 16-byte loads). ':'One thread follows a random cycle of pointers, one per 128-byte line; time per hop from the difference of two chain lengths, so launch overhead cancels. ')+
      'Bars: spread of the three run medians. Shaded: published cache sizes (Turner), for orientation. <span class="meas">measured here</span>'}
  RD.seg(document.getElementById('rd-lad-mode'),m=>{mode=m;draw()});RD.onRender(draw);RD.onResize(draw);draw();
})();

// ---- section 4: width x rate ----
(function(){
  const el=document.getElementById('rd-wr-svg');
  const sys=[{n:'RTX 5090 GDDR7',w:512,r:28,c:'var(--c2)'},{n:'H100 SXM HBM3 (5 stacks)',w:5120,r:5.234,c:'var(--c1)'},{n:'MI300X HBM3',w:8192,r:5.176,c:'var(--c4)'},{n:'one HBM4 stack (standard)',w:2048,r:8,c:'var(--c3)'}];
  function draw(){const W=RD.width(el),L=6,R=6,T=6,maxW=8192,maxR=28,hh=56/maxR,rowH=94,H=T+sys.length*rowH;let s='';
    const scaleX=(W-L-R)/maxW;let y=T;
    sys.forEach(o=>{const w=Math.max(2,o.w*scaleX),h=Math.max(3,o.r*hh);s+='<rect x="'+L+'" y="'+(y+56-h)+'" width="'+w+'" height="'+h+'" style="fill:'+o.c+';opacity:.75"/>'+
      RD.t(L,y+72,o.n,{fs:11,w:600})+RD.t(L,y+86,o.w+' bits x '+MC.fmtN(o.r,1)+' Gb/s / 8 = '+MC.fmtN(o.w*o.r/8,0)+' GB/s',{fs:10.5,fill:'var(--mute)'});y+=rowH});
    el.innerHTML=RD.svg(W,H,s,'Bus width times pin rate');
    document.getElementById('rd-wr-note').innerHTML='Width and height to scale (same scale for all). H100 and MI300X pin rates derived from their published bandwidth and bus width; RTX 5090 rate published; HBM4 standard rate from Rambus. <span class="der">derived</span>'}
  RD.onRender(draw);RD.onResize(draw);draw();
})();

// ---- section 5: the ladder of tiers ----
(function(){
  const D=MEMD,el=document.getElementById('rd-ladder'),note=document.getElementById('rd-ladder-note');let mode='all';
  function draw(){let rows;
    if(mode==='all')rows=D.ladder.map(r=>({name:r.name+' <span class="mute">('+r.cap+')</span>',v:r.gbs,label:r.gbs>=1e6?MC.fmtN(r.gbs/1e6,0)+' PB/s':r.gbs>=1000?MC.fmtN(r.gbs/1000,r.gbs>=10000?0:2)+' TB/s':MC.fmtN(r.gbs,0)+' GB/s',color:/SRAM/.test(r.name)?'var(--c3)':/HBM|GDDR|LPDDR/.test(r.name)?'var(--c1)':'var(--c2)'}));
    else{const w={};D.meas.ws.forEach(p=>w[p.x]=p.y);const s=D.meas.ssd;
      rows=[['GPU caches, 128 KB working set',w[131072]],['L2 and beyond, 1 MB',w[1048576]],['system level cache, 32 MB',w[33554432]],['LPDDR5 DRAM, 1 GB',w[1073741824]],['SSD, sequential 8 MiB reads',s.seq_GBs],['SSD, random 1 MiB reads',s.rand_1048576_GBs],['SSD, random 64 KiB reads',s.rand_65536_GBs],['SSD, random 4 KiB reads',s.rand_4096_GBs]]
        .map(r=>({name:r[0],v:r[1],label:MC.fmtN(r[1],r[1]<1?3:r[1]<10?2:0)+' GB/s',color:/SSD/.test(r[0])?'var(--c2)':'var(--c3)'}))}
    MC.bars(el,rows,{log:true});
    note.innerHTML=mode==='all'?'Each as published, log scale. Link figures are for both directions together where marked; the NIC is 400 Gb/s = 50 GB/s each way (Llama 3 paper). Sources in the Further reading tab. <span class="vend">vendor spec</span>':
      'M1 Pro GPU reads (median of three runs) and the internal SSD with the page cache bypassed (one reader, queue depth 1: random small reads are latency-bound, '+MC.fmtN(D.meas.ssd.rand_4096_us,0)+' &micro;s per 4 KiB read). <span class="meas">measured here</span>'}
  RD.seg(document.getElementById('rd-ladder-mode'),m=>{mode=m;draw()});draw();
})();

// ---- predict-then-reveal ----
document.querySelectorAll('#t-read .pr').forEach(pr=>{const right=pr.dataset.right||'0';pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
  pr.querySelectorAll('.opts button').forEach(x=>x.classList.remove('right','wrong'));b.classList.add(b.dataset.a===right?'right':'wrong');pr.querySelector('.ans').hidden=false}))});
