// ---- Reading, Objective: one sentence through five objectives (step animation, mode toggle) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('ob-card'))return;
  const W=['the','quick','brown','fox','jumps','over','the','lazy','dog','near','the','river'];
  // each mode: input tokens [text, class], target tokens, loss flags on target, per-512 counters (derived, see caption)
  const M={
    clm:{name:'Causal LM',
      inp:W.map(w=>[w,'']),
      tgt:W.slice(1).map(w=>[w,'']).concat([['</s>','']]),
      lossAll:true,
      p512:{inp:512,tgt:512,loss:512,note:'every position predicts the next token'},
      cap:['The text: twelve tokens of an ordinary sentence.',
           'What the model sees: the sentence as it is. A causal mask lets each position look only to its left.',
           'What it must produce: the same sentence shifted by one. Every position predicts the token after it, and the last predicts the end of text.',
           'Where the loss is: on every position. Twelve tokens in, twelve predictions trained; nothing is wasted, and generation later uses exactly this rule.']},
    mlm:{name:'Masked LM',
      inp:W.map((w,i)=>(i===2||i===8)?['[MASK]','mask']:[w,'']),
      tgt:W.map((w,i)=>(i===2||i===8)?[w,'']:[w,'hide']),
      loss:[2,8],
      p512:{inp:512,tgt:512,loss:77,note:'round(0.15 × 512) = 77 hidden tokens carry the loss'},
      cap:['The text: the same twelve tokens.',
           'What the model sees: about 15% of tokens replaced by [MASK]; here two of twelve. Every position can see both sides.',
           'What it must produce: the original token at each masked position. The output is as long as the input, but only two positions are scored.',
           'Where the loss is: on the two masked positions only. Bidirectional context is what makes encoders good at understanding; the thin signal per token is why they are a poor fit for generation.']},
    span:{name:'Span corruption',
      inp:[['the',''],['quick',''],['<X>','sen'],['jumps',''],['over',''],['the',''],['lazy',''],['<Y>','sen'],['near',''],['the',''],['river',''],['</s>','']],
      tgt:[['<X>','sen'],['brown',''],['fox',''],['<Y>','sen'],['dog',''],['<Z>','sen']],
      lossAll:true,
      p512:{inp:462,tgt:104,loss:104,note:'77 tokens in 26 spans: input 512 − 77 + 26 + 1, target 77 + 26 + 1'},
      cap:['The text: the same twelve tokens.',
           'What the model sees: each corrupted run (here "brown fox" and "dog") collapsed into one sentinel, unique within the example. The encoder input gets shorter.',
           'What it must produce: only the dropped spans, each after its sentinel, then a closing sentinel. Six target tokens instead of twelve.',
           'Where the loss is: on every target token, so the decoder is short and a step is cheap. This is T5\'s objective; at 512 tokens the target is about a fifth of the length.']},
    ul2:{name:'UL2, X mode',
      inp:[['[X]','mode'],['the',''],['quick',''],['brown',''],['fox',''],['<X>','sen'],['near',''],['the',''],['river',''],['</s>','']],
      tgt:[['<X>','sen'],['jumps',''],['over',''],['the',''],['lazy',''],['dog',''],['<Y>','sen']],
      lossAll:true,
      p512:{inp:262,tgt:261,loss:261,note:'X setting with mean span 64 and 50% corruption: 256 tokens in 4 spans'},
      cap:['The text: the same twelve tokens.',
           'What the model sees: a mode token, [X] for "extreme" denoising, then the sentence with one long span cut out. UL2 also trains [R] (short spans, 15%) and [S] (prefix LM) examples in the same mixture.',
           'What it must produce: the whole long span. Long spans force the model to generate, not just patch, which is why UL2 mixes them in.',
           'Where the loss is: on every target token. At inference you prepend the mode token that matches the task; one model covers short-span repair, long-span generation and prefix LM.']},
    fim:{name:'Fill-in-the-middle',
      inp:[['<PRE>','sen'],['the',''],['quick',''],['brown',''],['fox',''],['<SUF>','sen'],['dog','mv'],['near','mv'],['the','mv'],['river','mv'],['<MID>','sen'],['jumps',''],['over',''],['the',''],['lazy','']],
      tgt:[['the',''],['quick',''],['brown',''],['fox',''],['<SUF>','sen'],['dog',''],['near',''],['the',''],['river',''],['<MID>','sen'],['jumps',''],['over',''],['the',''],['lazy',''],['<EOT>','sen']],
      lossAll:true,
      p512:{inp:515,tgt:515,loss:515,note:'three sentinels added; still one causal prediction per position'},
      cap:['The text: the same twelve tokens.',
           'What the model sees: the document cut into prefix, middle and suffix, and rearranged as prefix, suffix, middle (PSM) with three sentinels. The model is still an ordinary causal model.',
           'What it must produce: the rearranged sequence shifted by one, as in causal LM. When it reaches <MID>, it has already read both the prefix and the suffix, so it learns to write the middle that joins them.',
           'Where the loss is: on every position, so FIM costs nothing in signal. Bavarian et al. found a high FIM rate leaves left-to-right skill intact; DeepSeek-V3 transforms 10% of documents this way.']}
  };
  let mode='clm';
  const esc=RD.esc;
  const tk=(t,c)=>'<span class="tk '+(c||'')+'">'+esc(t)+'</span>';
  function draw(i){
    const m=M[mode];
    const row=$('ob-row'),tg=$('ob-tgt');
    if(i===0){row.innerHTML=W.map(w=>tk(w,'')).join('');$('ob-l1').textContent='The text';}
    else{row.innerHTML=m.inp.map(x=>tk(x[0],x[1]+(i>=1?' ctx':''))).join('');$('ob-l1').textContent='Input the model sees';}
    if(i<2){tg.innerHTML='';$('ob-l2').textContent='Target';}
    else{$('ob-l2').textContent='Target it must produce';
      tg.innerHTML=m.tgt.map((x,j)=>{let c=x[1];if(i>=3){if(m.lossAll&&c!=='hide')c+=' loss';else if(m.loss&&m.loss.indexOf(j)>=0)c+=' loss';}return tk(x[0],c)}).join('');}
    const cap=m.cap[i];
    $('ob-cap').innerHTML='<div class="t">'+m.name+', step '+(i+1)+' of 4</div><p>'+esc(cap)+'</p>';
    const nIn=i===0?W.length:m.inp.length;
    const nT=i<2?0:m.tgt.filter(x=>x[1]!=='hide').length;
    const nL=i<3?0:(m.lossAll?m.tgt.length:m.loss.length);
    $('ob-cnt').innerHTML=RD.stat('Input length',nIn+' tokens','this sentence')+
      RD.stat('Target length',i<2?'·':(mode==='mlm'?m.tgt.length+' (2 scored)':m.tgt.length+' tokens'),'this sentence')+
      RD.stat('Positions with a loss',i<3?'·':nL,'per 12 source tokens')+
      RD.stat('Per 512 tokens',i<3?'·':m.p512.loss+' scored','in '+m.p512.inp+', out '+m.p512.tgt+': '+m.p512.note);
  }
  const A=RD.anim({card:'ob-card',ctl:'ob-ctl',n:4,draw:draw,ms:2200,label:'Objective step'});
  $('ob-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;
    [...$('ob-mode').children].forEach(x=>x.classList.toggle('on',x===b));A.reset(4);A.play();});
})();
