// ---- Reading, top: one training step as a clickable, animated strip of seven stages, run on the toy network ----
// Numbers come from RDE.step (checked against torch.optim in src/read/recompute.py).
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-st'))return;
  const N='https://app.notion.com/p/',ln=(t,id)=>'<a href="'+N+id+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const ST=[
    {nm:'Data, init',sec:'rd-s1',ch:['Normalisation and initialisation','3c65c17b0d0d81369e1cc38ed4e11d48'],
      c:{classic:'32 standardised inputs; He init',modern:'32 inputs; fan-in init, branches &times; &frac14;'}},
    {nm:'Forward',sec:'rd-s2',ch:['Activation functions','3c65c17b0d0d819f8049c255e6f206e2'],
      c:{classic:'ReLU, BatchNorm, residual',modern:'SwiGLU, pre-RMSNorm, residual'}},
    {nm:'Loss',sec:'rd-s3',ch:['Loss functions','3c65c17b0d0d8161a72bc8c572f37d55'],
      c:{classic:'cross entropy',modern:'cross entropy'}},
    {nm:'Backward',sec:'rd-s4',ch:['Normalisation and initialisation','3c65c17b0d0d81369e1cc38ed4e11d48'],
      c:{classic:'backprop, no clipping',modern:'backprop, clip to norm 1'}},
    {nm:'Update',sec:'rd-s5',ch:['Optimisers and learning-rate schedulers','3c65c17b0d0d817080bbc90954681d09'],
      c:{classic:'SGD, momentum 0.9; step decay',modern:'AdamW; warmup, cosine or WSD'}},
    {nm:'Regularise',sec:'rd-s6',ch:['Regularisation','3c65c17b0d0d81e988b5c3cb5e197f98'],
      c:{classic:'L2 10<sup>&minus;4</sup> in the gradient',modern:'decoupled decay 0.1'}},
    {nm:'Measure',sec:'rd-s7',ch:['Evaluation metrics','3c65c17b0d0d81a29acef722e842a29b'],
      c:{classic:'held-out loss, accuracy',modern:'held-out loss, accuracy'}}
  ];
  let rec='modern',an;
  const S=()=>RDE.step(rec),st0=()=>RDE.stats(rec==='classic'?3:4);
  const F=RD.f,E=RD.e,P=v=>RD.pct(v,1);
  function text(i){const s=S(),cl=rec==='classic',R=RDE.RECIPES[rec],ln10=Math.log(10);
    switch(i){
      case 0:return ['1 · A batch arrives; the weights start random',
        cl?'32 examples of 64 numbers each (spread 1.02 after standardising), each labelled by the teacher. The network\'s '+s.nparams.toLocaleString('en-GB')+' weights are drawn with He\'s variance, 2/64, so σ = '+F(Math.sqrt(2/64),3)+', the scale that keeps a ReLU network\'s signal steady.'
          :'The same 32 examples. The '+s.nparams.toLocaleString('en-GB')+' weights are drawn with variance 1/fan-in (σ = '+F(Math.sqrt(1/64),3)+' into the SwiGLU block), and each block\'s output matrix is scaled down a further 1/√16 = 0.25, GPT-2\'s rule, so 16 residual additions do not inflate the stream.',
        [['Batch','32 &times; 64','inputs, 10 classes'],['Weights',s.nparams.toLocaleString('en-GB'),cl?'16 layers of 64 &times; 64, plus the head':'16 SwiGLU blocks, plus the head'],['Init σ',cl?'0.177':'0.125, 0.019','√(2/64)'+(cl?'':'; √(1/176)/4')]]];
      case 1:return ['2 · Forward through 16 layers',
        cl?'Each layer: a 64 &times; 64 linear map, BatchNorm over the batch, add the layer\'s input, ReLU. Every residual addition adds a unit-variance branch, so the stream\'s spread grows from 0.84 after layer 1 to '+F(s.act,2)+' after layer 16.'
          :'Each block: RMSNorm the stream, a SwiGLU feed-forward (64 → 176 → 64), add the result back. The norm sits on the branch, not on the stream, and the branches start small, so the spread only drifts from 1.04 to '+F(s.act,2)+'.',
        [['Spread after layer 16',F(s.act,2),'input 1.02'],['Normalisation',cl?'BatchNorm':'RMSNorm',cl?'after the linear map':'before each block'],['Activation',cl?'ReLU':'SwiGLU','']]];
      case 2:return ['3 · Score it: cross entropy',
        'The mean of &minus;log p(right class) over the batch: '+F(s.loss0,2)+'. A network that knows nothing would score ln 10 = 2.30; '+(cl?'this one is far above it because its last layer\'s outputs are large (spread 2.47) and nothing normalises them before the head, so its random guesses are confident.':'this one is close, since a final RMSNorm keeps the head\'s input at unit scale.'),
        [['Loss',F(s.loss0,3),'cross entropy, batch mean'],['Chance level','2.303','ln 10'],['Batch accuracy',P(s.acc0),'at random init']]];
      case 3:return ['4 · Backward: a gradient for every weight',
        'Backpropagation hands each layer the gradient from above. Global gradient norm: '+F(s.gnorm,2)+'. '+(cl?'The classic recipe uses it as it is. The first layer\'s gradient is '+F(s.first/s.last,1)+' times the last layer\'s: the BatchNorm residual stack grows the gradient on the way down, as it grew the signal on the way up.'
          :'The 2026 recipe clips it: any gradient whose norm exceeds 1.0 is scaled down to 1.0, here by '+F(s.scale,3)+'. First against last layer\'s gradient: '+F(s.first,2)+' against '+F(s.last,2)+', a ratio of '+F(s.first/s.last,2)+'.'),
        [['Gradient norm',F(s.gnorm,2),cl?'not clipped':'clipped to 1.00'],['First / last layer',F(s.first/s.last,2),F(s.first,2)+' / '+F(s.last,2)],['Clipping',cl?'none':'norm 1.0',cl?'':'scale '+F(s.scale,3)]]];
      case 4:return ['5 · Update the weights',
        cl?'SGD with momentum: on the first step the momentum buffer is just the gradient, so every weight moves by 0.1 &times; its gradient. The step changes the weights by '+P(s.unorm/s.pnorm)+' of their size. Over a real run the rate is divided by 10 when the error plateaus.'
          :'AdamW: on the first step its bias-corrected averages are the gradient itself, so each weight moves by the learning rate times the sign of its gradient, about '+E(R.lr)+' per weight, whatever the gradient\'s size. Total change: '+P(s.unorm/s.pnorm)+' of the weights. A real run would start this rate near zero (warmup) and end it by a cosine or WSD cooldown.',
        [['Update size',P(s.unorm/s.pnorm),'‖Δθ‖ / ‖θ‖'],['Learning rate',String(R.lr),cl?'ResNet\'s starting rate':'toy rate, illustrative'],['Optimiser',cl?'SGD + momentum':'AdamW',cl?'β = 0.9':'β = (0.9, 0.95)']]];
      case 5:return ['6 · Regularise: pull the weights towards zero',
        cl?'Weight decay as L2: 10<sup>&minus;4</sup> &times; w is added to every gradient before the step, so it moves with the optimiser (identical to decay for plain SGD). Its share of this step is tiny: ‖Δθ<sub>decay</sub>‖ = '+E(s.wdnorm)+'.'
          :'Decoupled decay: every weight shrinks by η&lambda; = '+E(R.lr*R.wd)+' of itself, separately from the gradient step, as AdamW prescribes; with Adam and L2 in the loss it would have been rescaled per weight (thread 4). ‖Δθ<sub>decay</sub>‖ = '+E(s.wdnorm)+'.',
        [['Decay this step',E(s.wdnorm),'‖Δθ<sub>decay</sub>‖'],['Kind',cl?'L2 in the gradient':'decoupled',cl?'λ = 10<sup>&minus;4</sup>':'λ = 0.1'],['Dropout','none',cl?'':'off in LLM pretraining']]];
      default:return ['7 · Measure, on data the step did not see',
        'On the batch it trained on, the loss fell from '+F(s.loss0,2)+' to '+F(s.loss1,2)+' and accuracy rose from '+P(s.acc0)+' to '+P(s.acc1)+'. On 256 held-out examples the loss went from '+F(s.hl0,2)+' to '+F(s.hl1,2)+' and accuracy from '+P(s.ha0)+' to '+P(s.ha1)+'. '+(cl?'At this toy scale the step fitted its own batch and made held-out examples worse: measured where it trained, it looks like progress.':'One step memorised its batch and learned almost nothing general, which is why loss is measured on held-out data.')+' Real training repeats this step thousands of times; the {{Training lab|#t-lab}} does it live.',
        [['Batch loss',F(s.loss0,2)+' → '+F(s.loss1,2),'acc '+P(s.acc0)+' → '+P(s.acc1)],['Held-out loss',F(s.hl0,2)+' → '+F(s.hl1,2),'256 examples'],['Held-out accuracy',P(s.ha0)+' → '+P(s.ha1),'chance 10%']]];
    }}
  function strip(i){$('rd-stS').innerHTML=ST.map((s,k)=>'<button data-i="'+k+'" class="'+(k===i?'on':k<i?'done':'')+'" aria-pressed="'+(k===i)+'"><span class="k">'+(k+1)+'</span><span class="nm">'+s.nm+'</span><span class="ch">'+s.c[rec]+'</span></button>').join('')}
  function draw(i){strip(i);const [t,p,c]=text(i);$('rd-stT').textContent=t;
    $('rd-stP').innerHTML=p.replace('{{Training lab|#t-lab}}','<a href="#" data-tab="t-lab">Training lab</a>');
    $('rd-stN').innerHTML=c.map(x=>RD.stat(x[0],x[1],x[2])).join('');
    const s=ST[i];$('rd-stG').innerHTML='Read: <a href="#'+s.sec+'">section '+(i+1)+', '+s.nm.toLowerCase()+'</a> · in depth: '+ln(s.ch[0],s.ch[1]);
    $('rd-stR').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.r===rec))}
  an=RD.anim({card:'rd-st',ctl:'rd-stC',n:7,draw,ms:2600,label:'Stage of the training step'});
  $('rd-stS').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(b)an.go(+b.dataset.i)});
  $('rd-stR').addEventListener('click',e=>{const b=e.target.closest('button[data-r]');if(!b)return;rec=b.dataset.r;an.redraw()});
  RD.tabLinks($('rd-st'));
})();
