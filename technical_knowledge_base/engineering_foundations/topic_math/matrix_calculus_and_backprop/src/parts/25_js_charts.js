// ---- Reading: measured charts (forward against reverse mode, forward against backward cost, memory timelines, HVP cost). Data: window.MCD (22_js_data.js) ----
(function(){
  const D=window.MCD;if(!D)return;
  const L10=Math.log10;
  // generic line chart; series: [{name,col,pts:[[x,y],...],dash}]
  function lineChart(el,o){
    const w=RD.width(el),h=o.h||220,ml=o.ml||48,mr=10,mt=10,mb=34;
    const tx=v=>o.logx?L10(v):v, ty=v=>o.logy?L10(v):v;
    const X=v=>ml+(tx(v)-tx(o.x0))/(tx(o.x1)-tx(o.x0))*(w-ml-mr), Y=v=>mt+(1-(ty(v)-ty(o.y0))/(ty(o.y1)-ty(o.y0)))*(h-mt-mb);
    let s='';
    (o.yt||[]).forEach(v=>{s+='<line x1="'+ml+'" x2="'+(w-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(ml-4,Y(v)+4,o.yf?o.yf(v):v,{a:'end',fs:10,fill:'var(--mute)'})});
    (o.xt||[]).forEach(v=>{s+=RD.t(X(v),h-mb+14,o.xf?o.xf(v):v,{a:X(v)>w-24?'end':'middle',fs:10,fill:'var(--mute)'})});
    s+=RD.t(ml+(w-ml-mr)/2,h-4,o.xl||'',{a:'middle',fs:11,fill:'var(--mute)'});
    if(o.yl)s+='<text transform="translate(11,'+(mt+(h-mt-mb)/2)+') rotate(-90)" text-anchor="middle" font-size="11" fill="var(--mute)">'+o.yl+'</text>';
    (o.marks||[]).forEach(m=>{s+='<line x1="'+X(m.x)+'" x2="'+X(m.x)+'" y1="'+mt+'" y2="'+(h-mb)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>'+RD.t(X(m.x)+4,mt+11,m.t,{fs:10,fill:'var(--mute)'})});
    o.series.forEach(se=>{const d=se.pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join('');
      s+='<path d="'+d+'" fill="none" stroke="'+se.col+'" stroke-width="2"'+(se.dash?' stroke-dasharray="5 4"':'')+'/>';
      if(se.dots)se.pts.forEach(p=>{s+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="3" fill="'+se.col+'"/>'})});
    el.innerHTML=RD.svg(w,h,s,o.label||'')+'<div class="mem-legend">'+o.series.map(se=>'<span><svg width="20" height="10" style="display:inline-block;vertical-align:middle;margin-right:4px"><line x1="1" y1="5" x2="19" y2="5" stroke="'+se.col+'" stroke-width="2.5"'+(se.dash?' stroke-dasharray="4 3"':'')+'/></svg>'+se.name+'</span>').join('')+'</div>';
  }
  const ms=v=>v*1000;
  function jac(){const el=document.getElementById('mc-jac-svg');if(!el)return;
    const a=D.jac.out1,b=D.jac.in1;
    // one chart: x = the larger dimension (n for one output, m for one input), four lines
    lineChart(el,{logx:true,logy:true,x0:1,x1:4096,y0:0.1,y1:200,xt:[1,16,256,4096],yt:[0.1,1,10,100],yf:v=>v+' ms',xl:'inputs n (one output) or outputs m (one input)',yl:'time',h:230,
      series:[{name:'one output: forward mode (jacfwd)',col:'var(--c1)',dots:1,pts:a.map(r=>[r.n,ms(r.t_jacfwd)])},
        {name:'one output: reverse mode (jacrev)',col:'var(--c2)',dots:1,pts:a.map(r=>[r.n,ms(r.t_jacrev)])},
        {name:'one input: forward mode',col:'var(--c1)',dash:1,dots:1,pts:[[1,ms(a[0].t_jacfwd)]].concat(b.map(r=>[r.m,ms(r.t_jacfwd)]))},
        {name:'one input: reverse mode',col:'var(--c2)',dash:1,dots:1,pts:[[1,ms(a[0].t_jacrev)]].concat(b.map(r=>[r.m,ms(r.t_jacrev)]))}],label:'Jacobian time against size'});
    const A=a[a.length-1],B=b[b.length-1];
    document.getElementById('mc-jac-cap').textContent='Solid lines: f has one output and n inputs (a loss). At n = 4096 forward mode took '+ms(A.t_jacfwd).toFixed(1)+' ms and reverse mode '+ms(A.t_jacrev).toFixed(2)+' ms, '+Math.round(A.t_jacfwd/A.t_jacrev)+' times less. Dashed lines: one input and m outputs; at m = 4096 the order flips: forward '+ms(B.t_jacfwd).toFixed(2)+' ms, reverse '+ms(B.t_jacrev).toFixed(1)+' ms. Small sizes are dominated by fixed overhead. Both modes agree to 1e-15. Medians of 7 runs; src/inputs/measure/hvp.py.'}
  function cost(){const el=document.getElementById('mc-cost-svg');if(!el)return;
    const F=D.flops,P=D.prof,T=D.timing.none;
    const rows=[['FLOPs, matrix products (mm)',F.fwd_by['aten.mm']/1e9,F.bwd_by['aten.mm']/1e9,'GFLOP'],['FLOPs, attention products (bmm)',F.fwd_by['aten.bmm']/1e9,F.bwd_by['aten.bmm']/1e9,'GFLOP'],
      ['time, matrix products',ms(P.fwd['aten::mm']+P.fwd['aten::bmm']),ms(P.bwd['aten::mm']+P.bwd['aten::bmm']),'ms'],['time, softmax',ms(P.fwd['aten::_softmax']),ms(P.bwd['aten::_softmax_backward_data']),'ms'],
      ['time, whole pass',ms(T.fwd),ms(T.bwd),'ms']];
    let h='';rows.forEach(r=>{const mx=Math.max(r[1],r[2]);
      h+='<div class="small" style="margin:8px 0 2px;font-weight:600">'+r[0]+' <span class="mute">(backward / forward = '+(r[2]/r[1]).toFixed(2)+')</span></div><div class="bars">'+
        [['forward',r[1],'var(--c1)'],['backward',r[2],'var(--c2)']].map(b=>'<div class="row"><span class="nm">'+b[0]+'</span><span class="track"><span class="fill" style="width:'+(100*b[1]/mx).toFixed(1)+'%;background:'+b[2]+'"></span></span><span class="val">'+(b[1]>=100?b[1].toFixed(0):b[1].toFixed(1))+' '+r[3]+'</span></div>').join('')+'</div>'});
    el.innerHTML=h;
    document.getElementById('mc-cost-cap').textContent='FLOPs from FlopCounterMode (matrix products only, exact); times from the PyTorch profiler (self time per operator, median of 5 steps) and from wall-clock timing (median of 15 rounds), CPU, 2 threads. Bars within a pair are to scale; pairs are not to each other.'}
  function tl(){const el=document.getElementById('mc-tl-svg');if(!el)return;
    const cols={none:'var(--c2)',ckpt2:'var(--c5)',ckpt1:'var(--c3)',nograd:'var(--c1)'},names={none:'store everything',ckpt2:'checkpoint every other block',ckpt1:'checkpoint every block',nograd:'inference (no grad)'};
    let xmax=0;const series=['none','ckpt2','ckpt1','nograd'].map(m=>{const t=D.mem[m].tl;xmax=Math.max(xmax,t.n);return {name:names[m]+' (peak '+D.mem[m].peak+' MiB)',col:cols[m],pts:t.pts.map((p,i)=>[i*t.k,p[1]])}});
    lineChart(el,{x0:0,x1:xmax,y0:0,y1:520,xt:[0,500,1000,1500],yt:[0,100,200,300,400,500],xl:'operation number (forward, then backward)',yl:'MiB allocated above the weights',h:240,ml:44,
      marks:[{x:D.mem.none.tl.fwd,t:'backward starts'}],series,label:'Memory during one training step'});
    document.getElementById('mc-tl-cap').textContent='Allocated memory after each operation, minus what was allocated before the step (weights and inputs). The forward pass builds up the stored activations; the backward pass frees them as it uses them while gradients accumulate. Checkpointed runs have more backward operations because they include the recomputation. Apple GPU (MPS), float32; each line is downsampled to about 240 points keeping every bucket’s maximum.'}
  function hvp(){const el=document.getElementById('mc-hvp-svg');if(!el)return;
    const H=D.hvp;
    lineChart(el,{logx:true,logy:true,x0:100,x1:120000,y0:0.3,y1:3000,xt:[100,1000,10000,100000],xf:v=>v>=1000?(v/1000)+'k':v,yt:[1,10,100,1000],yf:v=>v+' ms',xl:'number of parameters n',yl:'time',h:230,
      series:[{name:'gradient',col:'var(--c1)',dots:1,pts:H.map(r=>[r.n,ms(r.t_grad)])},
        {name:'HVP, double backward',col:'var(--c3)',dots:1,pts:H.map(r=>[r.n,ms(r.t_hvp_double_backward)])},
        {name:'HVP, forward-over-reverse',col:'var(--c4)',dots:1,dash:1,pts:H.map(r=>[r.n,ms(r.t_hvp_fwd_over_rev)])},
        {name:'explicit Hessian (torch.func.hessian)',col:'var(--c2)',dots:1,pts:H.filter(r=>r.t_hessian).map(r=>[r.n,ms(r.t_hessian)])}],label:'Hessian-vector product against explicit Hessian'});
    const big=H.filter(r=>r.t_hessian).pop(),last=H[H.length-1];
    document.getElementById('mc-hvp-cap').textContent='A two-layer tanh network on 1,024 examples, float64, CPU, 2 threads, medians of 7 runs. At n = '+big.n.toLocaleString('en-US')+' the explicit Hessian took '+ms(big.t_hessian).toFixed(0)+' ms and '+(big.hessian_bytes/1e6).toFixed(1)+' MB; one HVP took '+ms(big.t_hvp_double_backward).toFixed(1)+' ms. At n = '+last.n.toLocaleString('en-US')+' the Hessian would need '+(last.n*last.n*8/1e9).toFixed(0)+' GB, so it was not attempted; one HVP took '+ms(last.t_hvp_double_backward).toFixed(1)+' ms, '+(last.t_hvp_double_backward/last.t_grad).toFixed(1)+' gradients’ worth. HVPs matched H v to 1e-15 where H was built.'}
  const all=()=>{jac();cost();tl();hvp()};
  RD.onRender(all);RD.onResize(all);all();
})();
