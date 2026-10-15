// ---- Reading tab: tables, predict blocks and the two animations (roofline walk, bf16 passes) ----
(function(){
  const U=window.TQU,D=U.D,G=U.G,$=id=>document.getElementById(id),E=RD.esc;
  const gl=U.label;
  // 2. generation table
  U.table($('tq-gen-tab'),[
    ['Generation',g=>'<a href="'+g.url+'" target="_blank" rel="noopener noreferrer">'+E(g.name)+'</a>'],
    ['Year',g=>E(g.year)],
    ['bf16 peak, TFLOP/s',g=>U.fmt(g.bf16/1e12),'num',g=>g.bf16],
    ['int8 or fp8, T/s',g=>U.fmt(g.int8/1e12)+(g.fp8?' <span class="mute">(fp8 '+U.fmt(g.fp8/1e12)+')</span>':''),'num',g=>g.int8],
    ['HBM per chip',g=>E(g.hbm_txt),'num',g=>g.hbm],
    ['HBM GB/s',g=>U.fmt(g.bw/1e9),'num',g=>g.bw],
    ['Ridge, FLOP/byte',g=>U.fmt(g.bf16/g.bw,1)+' <span class="der">calc</span>','num',g=>g.bf16/g.bw],
    ['ICI GBps per chip',g=>g.ici?U.fmt(g.ici/1e9):'<span class="mute">not listed</span>','num',g=>g.ici],
    ['DCN GB/s per chip',g=>U.sig(g.dcn/1e9,3),'num',g=>g.dcn],
    ['VMEM per core',g=>U.fmt(g.vmem)+' MiB','num',g=>g.vmem],
    ['MXUs per core',g=>g.mxus+' x '+g.mxu+'<sup>2</sup>'],
    ['JAX devices per chip',g=>(g.gen==='7x'?'2':'1')+(g.megacore?' <span class="mute">(megacore)</span>':''),'num'],
    ['Chips per host',g=>g.host_chips,'num',g=>g.host_chips],
    ['Pod, chips',g=>U.fmt(g.pod)+' <span class="mute">'+E(g.topo.split(' (')[0])+'</span>','num',g=>g.pod],
    ['Largest single slice',g=>E(g.max_slice)],
    ['On demand, $/chip-hour',g=>'$'+U.fmt(g.price_v,2)+' <span class="mute">'+E(g.region)+'</span>','num',g=>g.price_v]
  ],D.gens);
  $('tq-notes').innerHTML='<ul class="tight">'+D.notes.map(n=>'<li>'+E(n.t)+'</li>').join('')+'</ul>';
  ['tq-pr-gen','tq-pr-roof'].forEach(U.predict);
  // 3. critical batch table
  U.table($('tq-bcrit'),[
    ['Generation',g=>E(g.name)],
    ['bf16 weights and compute',g=>U.fmt(g.bf16/g.bw)+' tokens','num'],
    ['int8 weights, bf16 compute',g=>U.fmt(g.bf16/g.bw/2)+' tokens','num'],
    ['int8 weights and compute',g=>U.fmt(g.int8/g.bw/2)+' tokens','num'],
    ['Two chips over one ICI link: D must exceed',g=>U.fmt(2*g.bf16/g.link1),'num']
  ],D.gens,{narrow:true});

  // ---- roofline walk animation ----
  const WALK=[1,8,32,128,240,512,1024,4096];let wGen='v5e';
  U.seg($('tq-walk-gen'),U.GEN_ORDER.map(k=>[k,gl(k)]),wGen,v=>{wGen=v;walkAn.redraw()});
  const CAP=[
    'Batch 1: a decode step for one user. Each weight is read once and used for one multiply-add per token, so the intensity is about 1 FLOP per byte: every generation sits far down its slanted roof, at a fraction of a percent of peak.',
    'Batch 8: eight users decoding together. The weight bytes are the same, the FLOPs eight times more, so each dot climbs the slope by 8x. Still memory-bound everywhere.',
    'Batch 32: still on the slope. This is where many serving systems run; the MXUs are mostly idle and the step time is the weight bytes divided by HBM bandwidth.',
    'Batch 128: v5p, the generation with the most bandwidth per FLOP, is within reach of its ridge (166). The others are not.',
    'Batch 240: the scaling book\'s critical batch for v5e. the intensity is 222, so v5e and v4 come within 10% of their peaks; v6e, whose MXUs grew much faster than its HBM, is still under half its peak.',
    'Batch 512: past every ridge except v6e\'s (560). This is a small training micro-batch per chip, or a busy prefill.',
    'Batch 1,024: everything compute-bound. From here more tokens per chip add time but not efficiency; the matmul is as fast as the MXUs.',
    'Batch 4,096: a training micro-batch (one 4,096-token sequence per chip). Same weights, same shapes as batch 1: only the number of rows changed, and every generation went from under 1% of its peak to all of it.'];
  function walkDraw(i){
    const host=$('tq-walk-svg'),W=Math.min(760,U.width(host)),H=Math.round(Math.min(330,W*0.62));
    const L=46,R=10,T=10,B=34,x0=Math.log10(0.5),x1=Math.log10(2e4),y0=Math.log10(1e11),y1=Math.log10(4e15);
    const X=v=>L+(Math.log10(v)-x0)/(x1-x0)*(W-L-R),Y=v=>T+(1-(Math.log10(v)-y0)/(y1-y0))*(H-T-B);
    let s='';
    for(let e=0;e<=4;e++){const v=10**e;s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--line)"/>'+U.tx(X(v),H-B+14,v>=1000?(v/1000)+'k':String(v),{a:'middle',fs:10,fill:'var(--mute)'})}
    for(let e=11;e<=15;e++){const v=10**e;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+U.tx(L-4,Y(v)+3,['100G','1T','10T','100T','1P'][e-11],{a:'end',fs:10,fill:'var(--mute)'})}
    s+=U.tx((L+W-R)/2,H-4,'arithmetic intensity, FLOPs per byte (log)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    const B_=WALK[i],mmv=U.mm(1,B_,4096,11008);const ai=mmv.fl/mmv.by;
    U.GEN_ORDER.forEach(k=>{const g=G[k],c=U.GEN_COLOR[k],r=g.bf16/g.bw;const on=k===wGen;
      s+='<polyline fill="none" stroke="'+c+'" stroke-width="'+(on?2.6:1.3)+'" opacity="'+(on?1:.55)+'" points="'+X(0.5)+','+Y(0.5*g.bw)+' '+X(r)+','+Y(g.bf16)+' '+X(2e4)+','+Y(g.bf16)+'"/>';
      if(on)s+=U.tx(X(2e4)-2,Y(g.bf16)-4,gl(k)+' peak',{a:'end',fs:10,fill:c,w:600});
      const y=Math.min(g.bf16,ai*g.bw);s+='<circle cx="'+X(ai)+'" cy="'+Y(y)+'" r="'+(on?6:4)+'" fill="'+c+'" stroke="var(--bg)" stroke-width="1.5"/>'});
    s+='<line x1="'+X(ai)+'" x2="'+X(ai)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--ink)" stroke-dasharray="3 3" opacity=".5"/>'+U.tx(X(ai)+4,T+12,'B = '+U.fmt(B_),{fs:11,w:600});
    host.innerHTML='<div class="tq-leg">'+U.GEN_ORDER.map(k=>'<span><i style="background:'+U.GEN_COLOR[k]+'"></i>'+gl(k)+'</span>').join('')+'</div>'+U.S(W,H,s,'Roofline of five TPU generations with the matmul at batch '+B_);
    $('tq-walk-cap').innerHTML='<b>Step '+(i+1)+' of '+WALK.length+'.</b> '+CAP[i];
    const g=G[wGen],bd=U.bound(mmv.fl,mmv.by,g.bf16,g.bw);
    $('tq-walk-cnt').innerHTML=RD.stat('Batch B',U.fmt(B_),'tokens per chip')+RD.stat('FLOPs',U.si(mmv.fl),'2 B D F')+RD.stat('Bytes from HBM',U.bytes(mmv.by),'bf16 in, weights, out')+
      RD.stat('Intensity',U.fmt(ai,1),'FLOPs per byte')+RD.stat(gl(wGen)+': bound',bd.compute?'compute':'memory','ridge '+U.fmt(g.bf16/g.bw))+RD.stat(gl(wGen)+': of peak',U.pct(bd.frac),'best case')+RD.stat(gl(wGen)+': time',U.time(bd.t),'lower bound');
  }
  const walkAn=RD.anim({card:'tq-walk-card',ctl:'tq-walk-ctl',n:WALK.length,draw:walkDraw,ms:2200,label:'Batch step'});
  RD.onResize(()=>walkAn.redraw());

  // 4. tiles and MXU tables (computed live; the check compares with recompute.json)
  U.table($('tq-tiles'),[['Array',t=>E(t[0])],['Shape',t=>'['+t[1]+', '+t[2]+']','num'],['Tile',t=>U.hbmTile(t[1],t[2]).t+' x 128','num'],
    ['Stored as',t=>{const h=U.hbmTile(t[1],t[2]);return '['+h.rows+', '+h.cols+']'},'num'],['Bytes x',t=>U.fmt(U.hbmTile(t[1],t[2]).padded/(t[1]*t[2]),2),'num']],D.rc.tiles);
  U.table($('tq-mxu'),[['Matmul',t=>E(t[0])],['m x k x n',t=>t[1]+' x '+t[2]+' x '+t[3],'num'],['128 MXU',t=>U.pct(U.mxuUtil(t[1],t[2],t[3],128),1),'num'],['256 MXU',t=>U.pct(U.mxuUtil(t[1],t[2],t[3],256),1),'num']],D.rc.mxu);

  // 5. bf16 passes animation
  const TERMS=[[0,0],[0,1],[1,0],[0,2],[1,1],[2,0]];const PN=['hi','mid','lo'];
  const SCAP=['Two float32 numbers, 24 significant bits each. The MXU only multiplies bf16 numbers, which keep 8.',
    'Round each to bf16: the "hi" parts. This is all DEFAULT precision uses.',
    '1 pass (DEFAULT): multiply the hi parts once. The product of two bf16 numbers is exact in float32, so the whole error comes from the rounding of the inputs.',
    'Take what rounding threw away and round that to bf16 too: the "mid" parts carry the next 8 bits.',
    '3 passes (HIGH, also called bfloat16_3x): add hi x mid and mid x hi. The error drops by about two to three orders of magnitude; mid x mid is skipped because it is smaller still.',
    'One more split: the "lo" parts, the last bits of each float32 number.',
    '6 passes (HIGHEST): add the three products whose sizes come next (hi x lo, mid x mid, lo x hi). The result is as accurate as float32 arithmetic, at six times the MXU work.'];
  const STEPN=[0,0,1,1,3,3,6];
  function splitDraw(i){
    const a=U.fr(+$('tq-split-a').value||0),b=U.fr(+$('tq-split-b').value||0);
    const A=U.split3(a),Bv=U.split3(b),exact=a*b,n=STEPN[i],shown=i>=5?3:i>=3?2:i>=1?1:0;
    let approx=0;const used=TERMS.slice(0,n);used.slice().reverse().forEach(([p,q])=>{approx=U.fr(approx+U.fr(A[p]*Bv[q]))});
    const host=$('tq-split-svg'),W=Math.min(620,U.width(host)),cw=Math.min(96,(W-80)/3),ch=34,H=40+ch*3+18;
    let s=U.tx(70+cw*1.5,14,'b split into bf16 pieces',{a:'middle',fs:11,fill:'var(--mute)'});
    for(let q=0;q<3;q++)s+=U.tx(70+cw*(q+.5),30,q<shown?PN[q]+' '+U.sig(Bv[q],3):PN[q],{a:'middle',fs:10.5,w:600,fill:q<shown?'var(--ink)':'var(--dim)'});
    for(let p=0;p<3;p++){s+=U.tx(64,40+ch*(p+.6),p<shown?PN[p]+' '+U.sig(A[p],3):PN[p],{a:'end',fs:10.5,w:600,fill:p<shown?'var(--ink)':'var(--dim)'});
      for(let q=0;q<3;q++){const k=TERMS.findIndex(t=>t[0]===p&&t[1]===q),on=k>=0&&k<n;
        s+='<rect x="'+(70+cw*q+2)+'" y="'+(40+ch*p+2)+'" width="'+(cw-4)+'" height="'+(ch-4)+'" rx="4" fill="'+(on?'var(--acc2)':'var(--soft)')+'" stroke="'+(on?'var(--acc)':'var(--line)')+'"/>';
        s+=U.tx(70+cw*(q+.5),40+ch*(p+.62),k<0?'skipped':(on?U.sig(A[p]*Bv[q],2):'pass '+(k+1)),{a:'middle',fs:10,fill:on?'var(--ink)':'var(--mute)'})}}
    s+=U.tx(4,40+ch*1.6,'a',{fs:12,w:600});
    host.innerHTML=U.S(W,H,s,'Partial products of the bf16 pieces');
    $('tq-split-cap').innerHTML='<b>Step '+(i+1)+' of 7.</b> '+SCAP[i];
    const err=n?Math.abs(approx-exact):NaN;
    $('tq-split-cnt').innerHTML=RD.stat('Passes',n?String(n):'none yet','bf16 products')+RD.stat('a x b exact',exact.toPrecision(10),'float64')+RD.stat('With these passes',n?approx.toPrecision(10):'n/a','float32 sum')+
      RD.stat('Relative error',n?(exact?U.sig(err/Math.abs(exact),2):'0'):'n/a','')+RD.stat('float32 product',U.fr(exact).toPrecision(10),'rounded once, for comparison');
  }
  const splitAn=RD.anim({card:'tq-split-card',ctl:'tq-split-ctl',n:7,draw:splitDraw,ms:2400,label:'Pass step'});
  ['tq-split-a','tq-split-b'].forEach(id=>$(id).addEventListener('input',()=>splitAn.redraw()));
  RD.onResize(()=>splitAn.redraw());
  // measured precision
  $('tq-tf32').textContent=D.errors.tf32;
  U.table($('tq-prec-tab'),[['Matmuls computed as',r=>E(r.name)],['Max logit error',r=>U.sig(r.max_abs_logit_err,2),'num'],['Mean logit error',r=>U.sig(r.mean_abs_logit_err,2),'num'],
    ['Relative error',r=>U.sig(r.rel_err,2),'num'],['Loss',r=>U.fmt(r.loss,7),'num'],['Same top prediction',r=>U.pct(r.argmax_agree,2),'num']],D.prec.rows);

  // 6. state per chip
  const P70=D.mfu.rows.find(r=>r.model==='Llama 3.1 70B').params,P405=D.mfu.rows.find(r=>r.model==='Llama 3.1 405B').params;
  U.table($('tq-state'),[['Generation',g=>E(g.name)],['HBM per chip',g=>U.gb(g.hbm),'num'],['Parameters per chip at 16 B',g=>U.sig(g.hbm/16/1e9,3)+' B','num'],
    ['Chips for Llama 3.1 70B state',g=>U.fmt(Math.ceil(P70*16/g.hbm)),'num'],['Chips for Llama 3.1 405B state',g=>U.fmt(Math.ceil(P405*16/g.hbm)),'num']],D.gens,{narrow:true});
  // remat chart + table
  const RM=D.remat.rows,base=RM[0];
  function rematDraw(){const host=$('tq-remat-svg'),W=Math.min(640,U.width(host)),H=230,L=52,R=14,T=12,B=36;
    const xs=RM.map(r=>r.flops/base.flops),x0=0.98,x1=Math.max(...xs)*1.03,y1=400;
    const X=v=>L+(v-x0)/(x1-x0)*(W-L-R),Y=v=>T+(1-v/y1)*(H-T-B);let s='';
    [0,100,200,300,400].forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+U.tx(L-4,Y(v)+3,v+' MB',{a:'end',fs:10,fill:'var(--mute)'})});
    [1,1.1,1.2,1.3].forEach(v=>{if(v<=x1)s+=U.tx(X(v),H-B+14,'+'+Math.round((v-1)*100)+'%',{a:'middle',fs:10,fill:'var(--mute)'})});
    s+=U.tx((L+W-R)/2,H-4,'FLOPs of the step, relative to saving everything',{a:'middle',fs:10.5,fill:'var(--mute)'});
    const short={'none (save everything)':'no remat','nothing_saveable (full remat)':'nothing_saveable','dots_saveable':'dots_saveable','dots_with_no_batch_dims_saveable':'dots_no_batch','everything_saveable':'everything_saveable'};
    RM.forEach((r,i)=>{const x=X(r.flops/base.flops),y=Y(r.residual_bytes/1e6);s+='<circle cx="'+x+'" cy="'+y+'" r="5" fill="var(--c'+(i+1)+')"/>'+
      U.tx(x+(x>W*0.7?-8:8),y+(i===4?14:-6),short[r.policy],{a:x>W*0.7?'end':'start',fs:10.5})});
    host.innerHTML=U.S(W,H,s,'Residual bytes against FLOPs for five remat policies')}
  rematDraw();RD.onResize(rematDraw);
  U.table($('tq-remat-tab'),[['Policy (every block)',r=>'<code>'+E(r.policy)+'</code>'],['Residuals',r=>r.residuals,'num'],['Residual MB',r=>U.fmt(r.residual_bytes/1e6,1),'num'],
    ['GFLOP per step',r=>U.fmt(r.flops/1e9,2),'num'],['vs no remat',r=>'+'+U.pct(r.flops/base.flops-1,1),'num'],['Temp MB (CPU plan)',r=>U.fmt(r.temp_bytes/1e6,1),'num']],RM);
  // 7. errors
  $('tq-mesh-err').textContent=D.slice_err;
  // 9. MFU bars
  function mfuDraw(){const host=$('tq-mfu-svg'),W=Math.min(760,U.width(host)),rows=D.mfu.rows,rh=46,L=Math.min(150,W*0.36),R=44,H=rows.length*rh+30;
    const X=v=>L+v/0.7*(W-L-R);let s='';[0,.2,.4,.6].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="4" y2="'+(H-22)+'" stroke="var(--line)"/>'+U.tx(X(v),H-8,Math.round(v*100)+'%',{a:'middle',fs:10,fill:'var(--mute)'})});
    rows.forEach((r,i)=>{const y=6+i*rh;s+=U.tx(4,y+13,E(r.model),{fs:11,w:600})+U.tx(4,y+27,gl(r.gen)+', '+r.chips+' chips',{fs:10,fill:'var(--mute)'});
      [['mfu','var(--c4)','published'],['mfu_noncausal','var(--c5)','non-causal'],['mfu_recomputed','var(--c3)','causal']].forEach(([k,c],j)=>{const v=r[k];
        s+='<rect x="'+L+'" y="'+(y+j*12)+'" width="'+Math.max(1,X(v)-L)+'" height="10" rx="2" fill="'+c+'"/>'+U.tx(X(v)+3,y+j*12+9,U.fmt(v*100,1),{fs:9.5})})});
    host.innerHTML='<div class="tq-leg"><span><i style="background:var(--c4)"></i>published</span><span><i style="background:var(--c5)"></i>recomputed, attention non-causal</span><span><i style="background:var(--c3)"></i>recomputed, causal (current MaxText count)</span></div>'+U.S(W,H,s,'Published and recomputed MFU for eight MaxText runs')}
  mfuDraw();RD.onResize(mfuDraw);
  // 10. cost table
  const CR=D.mfu.rows.map(r=>({name:r.model,hw:gl(r.gen)+' ('+r.chips+' chips)',tok:r.tok,price:r.price,usd:r.usd_per_mtok,mfu:r.mfu}));
  const gp=D.mfu.gpu;CR.push({name:'Llama 3 405B',hw:'H100 (8,192 GPUs, Meta)',tok:gp.tok_s_gpu,price:gp.price,usd:gp.usd_per_mtok,mfu:gp.mfu});
  U.table($('tq-cost'),[['Model',r=>E(r.name)],['Hardware',r=>E(r.hw)],['Tokens/s per chip',r=>U.fmt(r.tok),'num',r=>r.tok],['MFU as reported',r=>U.pct(r.mfu,1),'num',r=>r.mfu],['$ per chip-hour',r=>'$'+U.fmt(r.price,2),'num',r=>r.price],['$ per million tokens',r=>'$'+U.fmt(r.usd,2)+' <span class="der">calc</span>','num',r=>r.usd]],CR);
  // mistakes
  $('tq-err-tf32').textContent=D.errors.tf32;$('tq-err-mesh').textContent=D.slice_err;$('tq-err-7x').textContent=D.errors.tpu7x_4;
})();
