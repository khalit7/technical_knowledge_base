// ---- Memory budget tab: peak of one float32 training step of a GPT-shaped model, checked against measured peaks ----
(function(){
  const D=window.FST,U=window.FU,$=U.$;
  const el=$('mb-ctl');if(!el)return;
  // inputs
  const F=[['L','Blocks',1,48,1],['d','Width d',64,4096,64],['H','Heads',1,64,1],['T','Context T',16,8192,16],['B','Batch B',1,64,1],['V','Vocabulary V',16,262144,1]];
  const S={L:8,d:512,H:8,T:256,B:8,V:43,opt:'adamw',ck:'none',loss:'unfused',attn:'sdpa'};
  // the model, per tensor counts in elements; bytes = 4 x elements (float32)
  function model(s){
    const {L,d,H,T,B,V}=s,BTd=B*T*d,BT=B*T;
    const P=V*d+T*d+L*(12*d*d+13*d)+2*d;                       // tied head: counted once
    const blkFull=16*BTd+4*BT+B*H*T+(s.attn==='manual'?MAN*B*H*T*T:0)+(s.attn==='manual'?MANBTD*BTd:0);
    const blkSaved=s.ck==='full'?BTd:blkFull;
    const head=2*BTd+2*BT+(s.loss==='unfused'?BT*V:0)+T;          // ln_f input and output, mean/rstd, logits; T position ids (int64 = 2 floats, rounded)
    const acts=4*(L*blkSaved+head);
    const params=4*P,grads=4*P,opt=s.opt==='adamw'?8*P:s.opt==='sgdm'?4*P:0;
    const tempA=4*Math.max(s.loss==='unfused'?2*BT*V:0,V*d+5*BTd);   // logits' and softmax's gradients, or the head's weight gradient plus one block's backward temporaries
    const A=params+opt+acts+tempA;
    const tempB=s.ck==='full'?4*(blkFull+4*BTd):4*5*BTd;           // end of backward: a rebuilt block (checkpointing) or one block's temporaries
    const Bm=params+opt+grads+tempB;
    return {P,params,grads,opt,acts,tempA,tempB,A,B:Bm,peak:Math.max(A,Bm),which:A>=Bm?'A':'B',blkFull,head};
  }
  const MAN=window.FST.saved_formula&&window.FST.saved_formula.manual_coef_BHTT!=null?window.FST.saved_formula.manual_coef_BHTT:2;
  const MANBTD=window.FST.saved_formula&&window.FST.saved_formula.manual_coef_BTd!=null?window.FST.saved_formula.manual_coef_BTd:0;
  el.innerHTML=F.map(f=>'<label>'+f[1]+' <b id="mb-v-'+f[0]+'"></b><input type="range" id="mb-'+f[0]+'" min="0" max="1000" aria-label="'+f[1]+'"></label>').join('')+
    '<label>Optimizer <select id="mb-opt"><option value="adamw">AdamW (8 bytes per parameter)</option><option value="sgdm">SGD with momentum (4)</option><option value="none">none</option></select></label>'+
    '<label>Checkpointing <select id="mb-ck"><option value="none">none</option><option value="full">every block</option></select></label>'+
    '<label>Loss <select id="mb-loss"><option value="unfused">head, then cross_entropy</option><option value="chunked">linear_cross_entropy, chunked</option></select></label>'+
    '<label>Attention <select id="mb-attn"><option value="sdpa">SDPA, flash-style (CPU here, CUDA)</option><option value="manual">written out (or math backend)</option></select></label>';
  // log-scale sliders
  const toS=(f,v)=>Math.round(1000*Math.log(v/f[2])/Math.log(f[3]/f[2])),fromS=(f,x)=>{let v=f[2]*Math.pow(f[3]/f[2],x/1000);v=Math.round(v/f[4])*f[4];return Math.max(f[2],Math.min(f[3],v))};
  function sync(){F.forEach(f=>{$('mb-'+f[0]).value=toS(f,S[f[0]]);$('mb-v-'+f[0]).textContent=U.comma(S[f[0]])});['opt','ck','loss','attn'].forEach(k=>$('mb-'+k).value=S[k])}
  F.forEach(f=>$('mb-'+f[0]).addEventListener('input',e=>{S[f[0]]=fromS(f,+e.target.value);if(f[0]==='H'&&S.d%S.H)S.H=Math.max(1,[...Array(S.H).keys()].reverse().find(h=>h&&S.d%h===0)||1);$('mb-v-'+f[0]).textContent=U.comma(S[f[0]]);render()}));
  ['opt','ck','loss','attn'].forEach(k=>$('mb-'+k).addEventListener('change',e=>{S[k]=e.target.value;render()}));
  const PRE={small:{L:4,d:256,H:4,T:64,B:8,V:43},big:{L:8,d:512,H:8,T:256,B:8,V:43},v50k:{L:8,d:512,H:8,T:256,B:8,V:50257},gpt2:{L:12,d:768,H:12,T:1024,B:8,V:50257},l8b:{L:32,d:4096,H:32,T:8192,B:1,V:128256}};
  const COL=[['Parameters','var(--c1)','params'],['Optimizer state','var(--c5)','opt'],['Gradients','var(--c3)','grads'],['Saved activations','var(--c2)','acts'],['Backward temporaries','var(--c4)','temp']];
  $('mb-leg').innerHTML=COL.map(c=>'<span style="--sw:'+c[1]+'">'+c[0]+'</span>').join('');
  function strip(parts,max,label){const tot=parts.reduce((a,p)=>a+p[0],0);
    return '<div class="small"><b>'+label+'</b>: '+gb(tot)+'</div><div class="mb-sb" style="width:'+(100*tot/max).toFixed(1)+'%">'+parts.map(p=>'<span title="'+p[2]+': '+gb(p[0])+'" style="width:'+(100*p[0]/tot).toFixed(2)+'%;background:'+p[1]+'"></span>').join('')+'</div>'}
  const gb=b=>b>=1e9?(b/1e9).toFixed(2)+' GB':(b/1e6).toFixed(1)+' MB';
  function render(){
    const m=model(S),max=Math.max(m.A,m.B);
    $('mb-out').innerHTML=RD.stat('Predicted peak',gb(m.peak),m.which==='A'?'at the start of backward':'at the end of backward')+RD.stat('Parameters',U.comma(m.P),gb(m.params))+RD.stat('Saved activations',gb(m.acts),(100*m.acts/m.peak).toFixed(0)+'% of the peak')+RD.stat('16 bytes per parameter',gb(16*m.P),'weights, gradients, AdamW');
    $('mb-moments').innerHTML=strip([[m.params,COL[0][1],'Parameters'],[m.opt,COL[1][1],'Optimizer state'],[m.acts,COL[3][1],'Saved activations'],[m.tempA,COL[4][1],'Backward temporaries']],max,'A. Start of backward')+
      strip([[m.params,COL[0][1],'Parameters'],[m.opt,COL[1][1],'Optimizer state'],[m.grads,COL[2][1],'Gradients'],[m.tempB,COL[4][1],'Backward temporaries']],max,'B. End of backward');
    $('mb-why').innerHTML=m.which==='A'?'The peak is moment A: activations ('+gb(m.acts)+') outweigh the gradients ('+gb(m.grads)+') that replace them by the end of backward. Checkpointing, a smaller batch or shorter context lowers it.':'The peak is moment B: the full gradients plus '+(S.ck==='full'?'one rebuilt block':'one block\'s temporaries')+' outweigh what forward saved. Cutting activations further does not help; sharding gradients and optimizer state (FSDP2) or a lighter optimizer does.';
    const f=x=>U.comma(x);
    $('mb-fx').innerHTML='P = V&middot;d + T&middot;d + L&middot;(12d&sup2; + 13d) + 2d = '+f(m.P)+'     (head tied to the embedding)\n'+
      'per block saved (elements) = 16&middot;BTd + 4&middot;BT + B&middot;H&middot;T'+(S.attn==='manual'?' + '+MANBTD+'&middot;BTd + '+MAN+'&middot;B&middot;H&middot;T&sup2;':'')+' = '+f(m.blkFull)+(S.ck==='full'?'   (checkpointed: only the block input, BTd)':'')+'\n'+
      'head saved = 2&middot;BTd + 2&middot;BT'+(S.loss==='unfused'?' + BTV':'')+' (+ T position ids) = '+f(m.head)+'\n'+
      'A = 4P + optimizer + 4&middot;(L&middot;block + head) + 4&middot;max('+(S.loss==='unfused'?'2&middot;BTV, ':'')+'V&middot;d + 5&middot;BTd)\n'+
      'B = 4P + optimizer + 4P (gradients) + '+(S.ck==='full'?'4&middot;(block + 4&middot;BTd)':'4&middot;5&middot;BTd')+'\npeak = max(A, B)';
  }
  U.seg($('mb-preset'),[['small','Running example'],['big','Larger variant'],['v50k','Larger, V = 50,257'],['gpt2','GPT-2 small shape, T 1,024, B 8'],['l8b','GPT-2 blocks at 8B scale (d 4,096, 32 blocks, V 128,256, T 8,192, B 1)']],p=>{Object.assign(S,PRE[p]);sync();render()},'big');
  const SF=D.saved_formula;
  $('mb-fxnote').innerHTML='Where the terms come from: the per-block and head terms are the tensors autograd saved, listed by shape for a one-block model with odd sizes (B = 3, T = 40, d = 96, H = 3) so each size can be read off'+(SF?' ('+SF.tiny1_items.length+' tensors; src/exp/saved_formula.py)':'')+'. 16&middot;BTd per block: LayerNorm 1 input and output (2), the qkv output (3), attention output (1; on the CPU flash kernel already in the layout the projection needs, so <code>.contiguous()</code> adds nothing), the residual sum and LayerNorm 2 output (2), the MLP\'s fc output and GELU output (4 + 4); 4&middot;BT for two LayerNorms\' mean and reciprocal standard deviation; B&middot;H&middot;T for attention\'s logsumexp. The temporary terms (5&middot;BTd, 2&middot;BTV, V&middot;d) are read from the measured category peaks, not derived: <span class="der">fitted by inspection</span>.';
  // validation against measured runs
  const R=D.mem.runs.filter(r=>['plain','ckpt','lce'].includes(r.how));
  let h='<table class="rd-tbl"><thead><tr><th>Measured run</th><th class="num">Measured peak</th><th class="num">Predicted</th><th class="num">Difference</th></tr></thead><tbody>';
  const extra=SF&&SF.manual_checks?SF.manual_checks:[];
  R.forEach(r=>{const c=r.cfg;const s={L:c.n_layer,d:c.d_model,H:c.n_head,T:c.block_size,B:c.batch_size,V:c.vocab_size,opt:'adamw',ck:r.how==='ckpt'?'full':'none',loss:r.how==='lce'?'chunked':'unfused',attn:'sdpa'};
    const p=model(s).peak;const dd=(p-r.peak)/r.peak;
    h+='<tr><td>'+({small:'running example',big:'larger variant',big_v50k:'larger, V = 50,257'}[r.config])+', '+({plain:'plain',ckpt:'checkpointed',lce:'chunked loss'}[r.how])+'</td><td class="num">'+gb(r.peak)+'</td><td class="num">'+gb(p)+'</td><td class="num '+(Math.abs(dd)<0.03?'ok':'warn')+'">'+(dd>=0?'+':'')+(100*dd).toFixed(1)+'%</td></tr>'});
  $('mb-val').innerHTML=h+'</tbody></table>';
  $('mb-valnote').innerHTML='<span class="meas">measured on Apple M1 Pro</span>, CPU, float32, PyTorch 2.14.1, second training step, peak live bytes from the memory profiler (src/exp/mem_step.py; the same runs as the Reading tab\'s sections 8 to 10). Green: within 3%. Selective checkpointing is not modelled (its saved set depends on the policy); the Reading tab shows its measured peaks.';
  (window.TAB_RENDER['t-mem']=window.TAB_RENDER['t-mem']||[]).push(render);
})();
