// ---- Kernel playground (tab t-pkplay): measured results per kernel (PK.K), its code (PK.code), and a VMEM calculator.
(function(){
  const U=PKU,P=window.PK,KN=P.K.kernels,$=id=>document.getElementById(id),e2=U.e2;
  const VMEM={'v4':16,'v5e':128,'v5p':64,'v6e':128,'TPU7x':64};   // MiB per TensorCore, jax/_src/tpu_info.py at jax-v0.11.2
  const pad8=r=>Math.ceil(r/8)*8,pad128=c=>Math.ceil(c/128)*128;
  // operand: [name, rows, cols, bytes per element, buffers]; padded uses (8, 128) tiles
  const blk=(nm,r,c,b,n,R,C)=>({nm,r,c,b,n,R,C});   // R, C: the array's last two dims (none for scratch)
  const KS={
    bias_gelu:{t:'Bias + exact GELU',code:'bias_gelu',p:{bm:[8,64,256,512,1024,4096]},d:{bm:512},M:4096,
      ops:s=>[blk('x',s.bm,512,2,2,4096,512),blk('b',1,512,2,1,1,512),blk('o',s.bm,512,2,2,4096,512)],steps:s=>4096/s.bm,
      meas:()=>[['max abs. error (f32)',e2(KN.bias_gelu.err)],['vs the model\'s hidden activations',e2(KN.bias_gelu.err_vs_A)],['TPU interpreter',e2(KN.bias_gelu.err_tpu_interp)],['tanh GELU instead',e2(KN.bias_gelu.err_tanh_gelu)]],low:()=>KN.bias_gelu.lower},
    softmax:{t:'Fused softmax',code:'softmax_rows',p:{bm:[8,64,512,2048,16384]},d:{bm:512},
      ops:s=>[blk('scores',s.bm,128,4,2,16384,128),blk('out',s.bm,128,4,2,16384,128)],steps:s=>16384/s.bm,
      meas:()=>[['max abs. error (f32)',e2(KN.softmax_rows.err)],['row sums vs 1',e2(KN.softmax_rows.row_sum_err)],['bf16 input (kernel)',e2(KN.softmax_rows.err_bf16_in)],['bf16 input (XLA)',e2(KN.softmax_rows.err_xla_bf16_in)]],low:()=>KN.softmax_rows.lower},
    xent:{t:'Fused cross-entropy',code:'xent_rows',p:{bm:[8,64,512,4096]},d:{bm:512},
      ops:s=>[blk('logits',s.bm,65,4,2,4096,65),blk('labels',s.bm,1,4,2,4096,1),blk('loss',s.bm,1,4,2,4096,1)],steps:s=>4096/s.bm,
      meas:()=>[['mean loss (kernel)',U.comma(KN.xent_rows.mean_loss,5)],['model loss_fn',U.comma(KN.xent_rows.model_loss,5)],['per-row max abs. error',e2(KN.xent_rows.err_rows)],['lanes that are padding',U.comma(KN.xent_rows.lane_waste*100,0)+'%']],low:()=>KN.xent_rows.lower},
    ln:{t:'LayerNorm forward and backward',code:'layer_norm',p:{bm:[8,64,256,1024,4096]},d:{bm:256},
      ops:s=>[blk('x',s.bm,128,4,2,4096,128),blk('scale',1,128,4,1,1,128),blk('bias',1,128,4,1,1,128),blk('y',s.bm,128,4,2,4096,128),blk('mu',s.bm,1,4,2,4096,1),blk('rstd',s.bm,1,4,2,4096,1)],steps:s=>4096/s.bm,
      meas:()=>{const g=KN.layer_norm.grads;return [['forward max abs. error',e2(KN.layer_norm.err)],['dx relative',e2(g.dx.rel)],['dscale relative',e2(g.dscale.rel)],['dbias relative',e2(g.dbias.rel)]]},low:()=>KN.layer_norm.lower_fwd,low2:()=>KN.layer_norm.lower_bwd},
    matmul:{t:'Tiled matmul (the root lab\'s kernel)',code:'matmul_root',p:{bm:[128,256,512,1024,4096],bn:[128],bk:[128,256,512]},d:{bm:512,bn:128,bk:128},
      ops:s=>[blk('A',s.bm,s.bk,2,2,4096,512),blk('B',s.bk,s.bn,2,2,512,128),blk('O',s.bm,s.bn,4,2,4096,128)],steps:s=>(4096/s.bm)*(128/s.bn)*(512/s.bk),
      meas:()=>[['max abs. error (f32, root lab)',e2(P.ROOT.matmul_err)],['Buffered(1)',e2(P.PL.buffered['1'].err)],['Buffered(3) lowering','rejected']],low:()=>null},
    flash:{t:'Flash attention forward',code:'flash_fwd',p:{bq:[16,32,64,128],bk:[16,32,64,128]},d:{bq:64,bk:64},
      ops:s=>[blk('q',s.bq,32,2,2,128,32),blk('k',s.bk,32,2,2,128,32),blk('v',s.bk,32,2,2,128,32),blk('o',s.bq,32,2,2,128,32),blk('lse',s.bq,1,4,2,128,1),blk('m, l (scratch)',s.bq,1,4,2),blk('acc (scratch)',s.bq,32,4,1)],
      steps:s=>(128/s.bq)*(128/s.bk),
      meas:()=>{const f=KN.flash;return [['output',e2(f.err)],['logsumexp',e2(f.err_lse)],['dQ, dK, dV',[f.grads.dq.err,f.grads.dk.err,f.grads.dv.err].map(e2).join(', ')],['bf16 inputs',e2(f.err_bf16_in)]]},low:()=>KN.flash.lower_fwd,low2:()=>KN.flash.lower_bwd},
    manual:{t:'Matmul with copies by hand',code:'matmul_manual',p:{bm:[128,256,512,1024]},d:{bm:512},
      ops:s=>[blk('A slots (scratch)',s.bm,512,2,2),blk('B (whole)',512,128,2,1,512,128),blk('O (whole)',4096,128,4,1,4096,128)],steps:s=>4096/s.bm,
      meas:()=>[['interpret=True',e2(P.K.pipeline.err_manual)],['TPU interpreter',e2(P.K.pipeline.err_manual_tpu_interp)],['wait after use (bug)',P.K.bugs[1].tpu_nan_rows+' NaN rows']],low:()=>P.K.pipeline.lower_manual},
    emit:{t:'Matmul with emit_pipeline',code:'matmul_emit',p:{bm:[128,256,512,1024],bn:[128],bk:[128,256,512]},d:{bm:512,bn:128,bk:128},
      ops:s=>[blk('A',s.bm,s.bk,2,2,4096,512),blk('B',s.bk,s.bn,2,2,512,128),blk('O',s.bm,s.bn,4,2,4096,128)],steps:s=>(4096/s.bm)*(128/s.bn)*(512/s.bk),
      meas:()=>[['interpret mode on CPU','does not run'],['message',U.esc(P.K.pipeline.emit_interp.msg)]],low:()=>P.K.pipeline.lower_emit},
    paged:{t:'Paged decode attention',code:'paged_decode',p:{page:[8,16,32,64]},d:{page:16},
      ops:s=>[blk('q',1,32,2,2,1,32),blk('k page',s.page,32,2,2,s.page,32),blk('v page',s.page,32,2,2,s.page,32),blk('o',1,32,2,2,1,32),blk('m, l (scratch)',1,1,4,2),blk('acc (scratch)',1,32,4,1)],steps:s=>8*(128/s.page),
      meas:()=>[['vs the model\'s attention row',e2(P.K.paged.err)],['TPU interpreter',e2(P.K.paged.err_tpu_interp)],['stale index 9,999','TPU interpreter raises']],low:()=>P.K.paged.lower}};
  const order=['bias_gelu','softmax','xent','ln','matmul','flash','manual','emit','paged'];
  let cur='flash',sel=Object.assign({},KS[cur].d),gen='v4';
  $('kp-kern').innerHTML=order.map(k=>'<button data-m="'+k+'"'+(k===cur?' class="on"':'')+'>'+KS[k].t.replace(' (the root lab\'s kernel)','').replace('Flash attention forward','Flash attention')+'</button>').join('');
  function opsHTML(lw,label){if(!lw)return '';if(!lw.ok)return '<span>'+label+': rejected</span>';
    const o=lw.ops,pick=(re)=>Object.keys(o).filter(k=>re.test(k)).reduce((a,k)=>a+o[k],0);
    return '<span>'+label+': <b>'+lw.lines+'</b> lines of Mosaic</span><span>tpu.matmul <b>'+(o['tpu.matmul']||0)+'</b></span><span>vector ops <b>'+pick(/^vector\.|tpu\.vector_store/)+'</b></span><span>DMA ops <b>'+pick(/dma/)+'</b></span><span>scf.if <b>'+(o['scf.if']||0)+'</b></span><span>math <b>'+pick(/^math\./)+'</b></span>'}
  function head(){const K=KS[cur];$('kp-head').innerHTML='<h3 style="margin:0">'+K.t+'</h3>';
    $('kp-meas').innerHTML=K.meas().map(m=>U.stat(m[0],m[1],'measured here')).join('');
    $('kp-ops').innerHTML=opsHTML(K.low&&K.low(),K.low2?'forward':'lowered for TPU v5e')+opsHTML(K.low2&&K.low2(),'backward')+(cur==='matmul'?'<span>lowering: see the root\'s TPU and Pallas lab</span>':'');
    $('kp-code').innerHTML=U.code(P.code[K.code])}
  function calc(){const K=KS[cur];
    $('kp-calc').innerHTML=Object.keys(K.p).map(p=>'<label>'+p+' <select data-p="'+p+'">'+K.p[p].map(v=>'<option'+(v===sel[p]?' selected':'')+'>'+v+'</option>').join('')+'</select></label>').join('')+
      '<label>Generation <select data-p="gen">'+Object.keys(VMEM).map(g=>'<option'+(g===gen?' selected':'')+'>'+g+'</option>').join('')+'</select></label>';
    out()}
    function out(){const K=KS[cur],ops=K.ops(sel);
    let lg=0,pd=0,bad=[];ops.forEach(o=>{lg+=o.n*o.r*o.c*o.b;pd+=o.n*pad8(o.r)*pad128(o.c)*o.b;
      if(o.R!=null&&!((o.r%8===0||o.r===o.R)&&(o.c%128===0||o.c===o.C)))bad.push(o.nm)});
    const steps=K.steps(sel);const cap=VMEM[gen]*1048576;
    $('kp-out').innerHTML=U.stat('Grid steps',U.comma(steps,0),'')+U.stat('VMEM, logical',U.bytes(lg),'sum of buffers')+U.stat('VMEM, padded to (8, 128)',U.bytes(pd),U.comma(pd/lg,1)+'&#215; the logical')+
      U.stat(gen+' VMEM per core',VMEM[gen]+' MiB',pd<=cap?'fits ('+U.comma(100*pd/cap,1)+'%)':'does not fit')+U.stat('(8, 128) rule',bad.length?'violated':'satisfied',bad.length?U.esc(bad.join(', ')):'each block dim a multiple, or the whole array');
    const mx=Math.max(...Object.values(VMEM))*1048576;
    $('kp-gen').innerHTML=Object.keys(VMEM).map(g=>{const c=VMEM[g]*1048576,w=Math.min(100,100*pd/c);
      return '<div class="row"><span>'+g+' ('+VMEM[g]+' MiB)</span><span class="tr"><span style="width:'+w+'%;background:'+(pd<=c?'var(--good)':'var(--bad)')+'"></span></span><span class="v">'+U.comma(100*pd/c,pd/c<0.01?2:1)+'%</span></div>'}).join('');
    const sw=cur==='flash'?KN.flash.sweep.find(s=>s.bq===sel.bq&&s.bk===sel.bk):null;
    $('kp-note').innerHTML=ops.map(o=>U.esc(o.nm)+': '+o.n+' &#215; '+o.r+' &#215; '+o.c+' &#215; '+o.b+' B').join('; ')+'.'+(sw?' This block shape was run here (error '+e2(sw.err)+') and lowered for TPU v5e: '+(sw.lowers?'accepted':'rejected')+'.':(cur==='flash'?' This combination was not in the sweep run here.':''))}
  $('kp-calc').addEventListener('change',e=>{const s=e.target.closest('select');if(!s)return;if(s.dataset.p==='gen')gen=s.value;else sel[s.dataset.p]=+s.value;out()});
  U.seg($('kp-kern'),m=>{cur=m;sel=Object.assign({},KS[cur].d);head();calc()});
  head();calc();U.onRender('t-pkplay',out);
})();
