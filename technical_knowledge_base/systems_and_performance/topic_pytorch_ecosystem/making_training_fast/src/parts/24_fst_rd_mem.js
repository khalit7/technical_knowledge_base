// ---- Reading sections 7 to 9: memory timeline animation, checkpointing bars, fused loss bars ----
(function(){
  const D=window.FST,U=window.FU,$=U.$;
  const M=D.mem.runs, get=(c,h)=>M.find(r=>r.config===c&&r.how===h);
  const CAT=[['PARAMETER','Parameters','var(--c1)'],['OPTIMIZER_STATE','Optimizer state','var(--c5)'],['GRADIENT','Gradients','var(--c3)'],
    ['ACTIVATION','Activations','var(--c2)'],['AUTOGRAD_DETAIL','Backward temporaries','var(--c4)'],['TEMPORARY','Temporaries','var(--c6)'],['INPUT','Batch','var(--mute)'],['UNKNOWN','Unknown','var(--dim)']];
  const MODES=[['plain','Plain'],['ckpt','Checkpoint every block'],['sac_mm','SAC: save matmuls'],['sac_attn','SAC: save attention only']];
  const NAME={plain:'plain',ckpt:'full checkpointing',sac_mm:'SAC saving matmuls',sac_attn:'SAC saving attention only'};
  // ---- section 7: stacked timeline, animated playhead ----
  const big=get('big','plain');
  const YMAX=Math.max(...MODES.map(m=>get('big',m[0]).peak))/1e6*1.05;
  let mode='plain',A=null;const N=48;
  const idx=r=>CAT.map(c=>r.cats.indexOf(c[0]));
  function phaseAt(r,t){const k=r.marks;for(const p of ['fwd','bwd','opt','zero'])if(k[p]&&t>=k[p][0]&&t<=k[p][1])return p;if(k.fwd&&t<k.fwd[0])return 'start';return 'end'}
  const PH={start:'Before forward',fwd:'Forward',bwd:'Backward',opt:'Optimizer step',zero:'zero_grad(set_to_none=True)',end:'After the step'};
  const PHT={start:'Only what persists between steps: parameters and AdamW state.',
    fwd:'Each op saves what its backward will need; activations pile up block by block.',
    bwd:'Gradients appear layer by layer while saved activations are released; with checkpointing each block first rebuilds its activations.',
    opt:'AdamW reads every gradient and updates the parameters and its two running averages in place; its temporaries come and go.',
    zero:'set_to_none frees every gradient tensor.',end:'Back to parameters and optimizer state.'};
  function draw(i){
    const r=get('big',mode),el=$('fst-mem-svg');
    const w=RD.width(el),h=200,L=46,R=8,T=8,B=22;const c=r.curve,t1=c[c.length-1][0],ix=idx(r);
    const X=t=>L+(w-L-R)*t/t1,Y=v=>T+(h-T-B)*(1-v/YMAX);
    const tcut=t1*i/(N-1);
    let s='';
    // gridlines
    for(let g=0;g<=YMAX;g+=200){s+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(g)+'" y2="'+Y(g)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(g)+4,g+' MB',{a:'end',fs:10,fill:'var(--mute)'})}
    // phase bands
    ['fwd','bwd','opt'].forEach(p=>{const k=r.marks[p];if(!k)return;s+='<rect x="'+X(k[0])+'" y="'+(h-B+2)+'" width="'+Math.max(1,X(k[1])-X(k[0]))+'" height="5" fill="var(--dim)"/>'+RD.t(Math.max(L+26,Math.min(w-R-28,(X(k[0])+X(k[1]))/2)),h-4,{fwd:'forward',bwd:'backward',opt:'optimizer'}[p],{a:'middle',fs:10,fill:'var(--mute)'})});
    // stacked areas
    const cum=c.map(p=>{let a=0;return ix.map(j=>a+=(j>=0?p[1+j]:0))});
    for(let k=CAT.length-1;k>=0;k--){
      let top='',bot='';
      c.forEach((p,n)=>{top+=(n?'L':'M')+X(p[0]).toFixed(1)+','+Y(cum[n][k]).toFixed(1)});
      for(let n=c.length-1;n>=0;n--)bot+='L'+X(c[n][0]).toFixed(1)+','+Y(k?cum[n][k-1]:0).toFixed(1);
      s+='<path d="'+top+bot+'Z" fill="'+CAT[k][2]+'" opacity="0.85"/>';
    }
    // dim the future
    s+='<rect x="'+X(tcut)+'" y="'+T+'" width="'+Math.max(0,X(t1)-X(tcut))+'" height="'+(h-T-B)+'" fill="var(--bg)" opacity="0.72"/>';
    s+='<line x1="'+X(tcut)+'" x2="'+X(tcut)+'" y1="'+T+'" y2="'+(h-B)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    // peak marker
    s+='<circle cx="'+X(r.peak_ms)+'" cy="'+Y(r.peak/1e6)+'" r="3.5" fill="var(--ink)"/>';
    el.innerHTML=RD.svg(w,h,s,'Memory by category over one training step');
    // counters at playhead
    let n0=0;for(let n=0;n<c.length;n++)if(c[n][0]<=tcut)n0=n;
    const p=c[n0],val=j=>j>=0?p[1+j]:0,tot=ix.reduce((a,j)=>a+val(j),0);
    let pk=0;for(let n=0;n<=n0;n++)pk=Math.max(pk,cum[n][CAT.length-1]);
    const ph=phaseAt(r,tcut);
    $('fst-mem-cap').innerHTML='<div class="t">'+PH[ph]+' ('+NAME[mode]+')</div><p>'+PHT[ph]+'</p>';
    $('fst-mem-cnt').innerHTML=RD.stat('Live now',U.f1(tot)+' MB')+RD.stat('Activations now',U.f1(val(ix[3]))+' MB')+RD.stat('Gradients now',U.f1(val(ix[2]))+' MB')+RD.stat('Peak so far',U.f1(pk)+' MB','whole step: '+U.mb(r.peak));
  }
  $('fst-mem-leg').innerHTML=CAT.slice(0,6).map(c=>'<span style="--sw:'+c[2]+'">'+c[1]+'</span>').join('');
  A=RD.anim({card:'fst-memcard',ctl:'fst-mem-ctl',n:N,ms:260,draw,label:'Moment in the step'});
  U.seg($('fst-mem-seg'),MODES,m=>{mode=m;if(A)A.reset(N);else draw(0)},'plain');
  RD.onResize(()=>A.redraw());
  const pb=big.peak_by;
  $('fst-mem-read').innerHTML='Before the forward pass, '+U.mb(big.start)+' is already in use: parameters ('+U.mb(pb.PARAMETER)+' = 25,373,184 &times; 4 bytes) and AdamW state ('+U.mb(pb.OPTIMIZER_STATE)+', two numbers per parameter). Forward adds the activations; the peak, '+U.mb(big.peak)+', comes '+(big.peak_ms<big.marks.bwd[0]+5?'at the very start of backward':'early in backward')+', when '+U.mb(pb.ACTIVATION)+' of activations are still held and the first backward temporaries ('+U.mb(pb.AUTOGRAD_DETAIL)+') and gradients ('+U.mb(pb.GRADIENT)+') appear. Gradients reach their full '+U.mb(big.max_by.GRADIENT)+' only at the end of backward, by which time most activations are gone, so the textbook sum "16 bytes per parameter plus activations" ('+U.mb(16*big.params+pb.ACTIVATION)+') overstates this peak. Switch to <i>Checkpoint every block</i>: the activations nearly vanish and the peak moves to the <i>end</i> of backward ('+U.mb(get('big','ckpt').peak)+'), where full gradients and the last block\'s rebuilt activations coexist.';
  U.predict('fst-pr-mem',1,'At the peak, activations hold '+U.mb(pb.ACTIVATION)+'; parameters, AdamW state and the gradients so far hold '+U.mb(pb.PARAMETER+pb.OPTIMIZER_STATE+pb.GRADIENT)+'. With context 256 and batch 8, every block saves several (8 &times; 256 &times; 512)-sized tensors and two (8 &times; 256 &times; 2048) ones (section 8 and the {{Memory budget|#t-mem}} tab count them), which outweighs 25.4M parameters. Halve the batch and the activations halve; the 16 bytes per parameter do not move.'.replace(/\{\{([^|]+)\|#(t-[\w-]+)\}\}/g,'<a href="#" data-tab="$2">$1</a>'));
  RD.tabLinks($('fst-pr-mem'));
  // ---- section 8: checkpointing bars ----
  const TC=D.time_ckpt&&D.time_ckpt.results;
  let ckdev='cpu';
  function ckDraw(){
    const rows=[];
    MODES.forEach(m=>{const r=get('big',m[0]);const t=TC&&TC.find(x=>x.how===m[0]&&x.device===ckdev);
      rows.push({nm:m[1],ml:'peak; backward '+U.comma(r.calls.bwd)+' ATen calls'+(t?'; step '+U.ms(t.median_ms):''),v:r.peak/1e6,txt:U.f1(r.peak/1e6)+' MB',col:m[0]==='plain'?'var(--c2)':'var(--c3)',hl:m[0]==='plain'})});
    U.bars($('fst-ck-bars'),rows,Math.max(...rows.map(r=>r.v)));
  }
  if(TC)U.seg($('fst-ck-seg'),[['cpu','Times on CPU'],['mps','Times on MPS']],d=>{ckdev=d;ckDraw()},'cpu');else ckDraw();
  const ck=get('big','ckpt'),sm=get('big','sac_mm'),sa=get('big','sac_attn');
  if(TC){const t=(h,d)=>TC.find(x=>x.how===h&&x.device===d);
    $('fst-ck-timenote').innerHTML='median of '+t('plain','cpu').trials_ms.length+' trials of 10 steps after 3 warm-up steps, CPU 4 threads and MPS, '+U.load(t('plain','cpu').load);
    $('fst-ck-read').innerHTML='Full checkpointing cut the peak from '+U.mb(big.peak)+' to '+U.mb(ck.peak)+' ('+(100*(1-ck.peak/big.peak)).toFixed(0)+'% less): forward now saves only each block\'s input, '+U.mb(ck.saved)+' instead of '+U.mb(big.saved)+'. The price: backward runs '+U.comma(ck.calls.bwd)+' ATen calls instead of '+U.comma(big.calls.bwd)+' (each block\'s forward again), and the step went from '+U.ms(t('plain','cpu').median_ms)+' to '+U.ms(t('ckpt','cpu').median_ms)+' on the CPU (+'+(100*(t('ckpt','cpu').median_ms/t('plain','cpu').median_ms-1)).toFixed(0)+'%) and from '+U.ms(t('plain','mps').median_ms)+' to '+U.ms(t('ckpt','mps').median_ms)+' on MPS. SAC saving matmuls landed in between ('+U.mb(sm.peak)+', '+U.ms(t('sac_mm','cpu').median_ms)+' on CPU); SAC saving only attention matched full checkpointing\'s peak ('+U.mb(sa.peak)+').';}
  // ---- section 8: compile memory budget ----
  const BU=D.budget&&D.budget.runs;
  if(BU){const g=b=>BU.find(x=>x.budget===b);const e=g(null),c1=g(1),c0=g(0),ch=g(0.5),ce=g('ckpt');
    $('fst-budget-read').innerHTML='Measured on the larger variant (CPU, deterministic, src/exp/budget.py): eager saves '+U.mb(e.saved_activation_bytes)+' of activations, compiled at budget 1.0 '+U.mb(c1.saved_activation_bytes)+', at 0.5 '+U.mb(ch.saved_activation_bytes)+', at 0.2 '+U.mb(g(0.2).saved_activation_bytes)+', and at 0.0 nothing beyond the inputs ('+U.mb(c0.saved_activation_bytes)+': backward recomputes the whole forward); eager checkpointing of every block keeps the block inputs, '+U.mb(ce.saved_activation_bytes)+'. Budget 1.0 saves what eager saves: by default the partitioner optimises runtime, not memory. The loss is the same in all ('+e.loss.toFixed(5)+', freshly initialised model on batch 1).';}
  // ---- section 9: fused linear cross-entropy ----
  const vp=get('big_v50k','plain'),vr=get('big_v50k','lce_ref'),vl=get('big_v50k','lce'),vc=get('big_v50k','ckpt');
  U.bars($('fst-lce-bars'),[
    {nm:'Unfused',ml:'head, then cross_entropy',v:vp.peak/1e6,txt:U.f1(vp.peak/1e6)+' MB',col:'var(--c2)',hl:true},
    {nm:'Fused call, default',ml:'options=None: reference path',v:vr.peak/1e6,txt:U.f1(vr.peak/1e6)+' MB',col:'var(--c2)'},
    {nm:'Fused call, chunked',ml:'options=LinearCrossEntropyOptions()',v:vl.peak/1e6,txt:U.f1(vl.peak/1e6)+' MB',col:'var(--c3)'},
    {nm:'Checkpointing instead',ml:'every block, unfused loss',v:vc.peak/1e6,txt:U.f1(vc.peak/1e6)+' MB',col:'var(--c1)'}]);
  $('fst-lce-loss').textContent=vp.loss.toFixed(4)+' for all four';
  const TL=D.time_lce&&D.time_lce.results;
  if(TL){const t=(h,d)=>TL.find(x=>x.how===h&&x.device===d);
    $('fst-lce-time').innerHTML='Step time, median of 3 trials of 5 steps: unfused '+U.ms(t('plain','cpu').median_ms)+', chunked '+U.ms(t('lce','cpu').median_ms)+' on CPU; '+U.ms(t('plain','mps').median_ms)+' and '+U.ms(t('lce','mps').median_ms)+' on MPS ('+U.load(t('plain','cpu').load)+'; bench lock). Here the chunked loss cost time: +'+(100*(t('lce','cpu').median_ms/t('plain','cpu').median_ms-1)).toFixed(0)+'% on the CPU and +'+(100*(t('lce','mps').median_ms/t('plain','mps').median_ms-1)).toFixed(0)+'% on MPS; it trades time for memory, like checkpointing.';}
  $('fst-lce-read').innerHTML='With 50,257 classes the unfused step peaks at '+U.mb(vp.peak)+'. At that moment the backward temporaries alone hold '+U.mb(vp.peak_by.AUTOGRAD_DETAIL)+': the softmax\'s gradient and the logits\' gradient, two tensors of '+U.mb(8*256*50257*4)+' each. The chunked loss brings the peak to '+U.mb(vl.peak)+' ('+(vp.peak/vl.peak).toFixed(2)+' times lower), and its saved activations from '+U.mb(vp.saved)+' to '+U.mb(vl.saved)+', about what the 43-character model saves ('+U.mb(get('big','plain').saved)+'): the vocabulary no longer costs activation memory. The default call ('+U.mb(vr.peak)+') is byte for byte the unfused peak. How much a given job gains depends on vocabulary, tokens per step and everything else in memory: the release notes say "up to 4x"; for this whole step, which also holds weights, AdamW state and the blocks\' activations, it is '+(vp.peak/vl.peak).toFixed(2)+' times.';
})();
