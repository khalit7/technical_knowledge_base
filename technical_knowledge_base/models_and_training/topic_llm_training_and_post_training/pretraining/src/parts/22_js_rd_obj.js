// ---- Reading, Objective: one sentence through five objectives (step animation, mode toggle; each objective's four steps are explained by its own step list, sx-ob-<mode>) ----
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
      p512:{inp:512,tgt:512,loss:512,note:'every position predicts the next token'}},
    mlm:{name:'Masked LM',
      inp:W.map((w,i)=>(i===2||i===8)?['[MASK]','mask']:[w,'']),
      tgt:W.map((w,i)=>(i===2||i===8)?[w,'']:[w,'hide']),
      loss:[2,8],
      p512:{inp:512,tgt:512,loss:77,note:'round(0.15 × 512) = 77 hidden tokens carry the loss'}},
    span:{name:'Span corruption',
      inp:[['the',''],['quick',''],['<X>','sen'],['jumps',''],['over',''],['the',''],['lazy',''],['<Y>','sen'],['near',''],['the',''],['river',''],['</s>','']],
      tgt:[['<X>','sen'],['brown',''],['fox',''],['<Y>','sen'],['dog',''],['<Z>','sen']],
      lossAll:true,
      p512:{inp:462,tgt:104,loss:104,note:'77 tokens in 26 spans: input 512 − 77 + 26 + 1, target 77 + 26 + 1'}},
    ul2:{name:'UL2, X mode',
      inp:[['[X]','mode'],['the',''],['quick',''],['brown',''],['fox',''],['<X>','sen'],['near',''],['the',''],['river',''],['</s>','']],
      tgt:[['<X>','sen'],['jumps',''],['over',''],['the',''],['lazy',''],['dog',''],['<Y>','sen']],
      lossAll:true,
      p512:{inp:262,tgt:261,loss:261,note:'X setting with mean span 64 and 50% corruption: 256 tokens in 4 spans'}},
    fim:{name:'Fill-in-the-middle',
      inp:[['<PRE>','sen'],['the',''],['quick',''],['brown',''],['fox',''],['<SUF>','sen'],['dog','mv'],['near','mv'],['the','mv'],['river','mv'],['<MID>','sen'],['jumps',''],['over',''],['the',''],['lazy','']],
      tgt:[['the',''],['quick',''],['brown',''],['fox',''],['<SUF>','sen'],['dog',''],['near',''],['the',''],['river',''],['<MID>','sen'],['jumps',''],['over',''],['the',''],['lazy',''],['<EOT>','sen']],
      lossAll:true,
      p512:{inp:515,tgt:515,loss:515,note:'three sentinels added; still one causal prediction per position'}}
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
    const nIn=i===0?W.length:m.inp.length;
    const nT=i<2?0:m.tgt.filter(x=>x[1]!=='hide').length;
    const nL=i<3?0:(m.lossAll?m.tgt.length:m.loss.length);
    $('ob-cnt').innerHTML=RD.stat('Input length',nIn+' tokens','this sentence')+
      RD.stat('Target length',i<2?'·':(mode==='mlm'?m.tgt.length+' (2 scored)':m.tgt.length+' tokens'),'this sentence')+
      RD.stat('Positions with a loss',i<3?'·':nL,'per 12 source tokens')+
      RD.stat('Per 512 tokens',i<3?'·':m.p512.loss+' scored','in '+m.p512.inp+', out '+m.p512.tgt+': '+m.p512.note);
  }
  const A=RD.anim({card:'ob-card',ctl:'ob-ctl',n:4,draw:draw,ms:4200,label:'Objective step',list:'sx-ob-clm'});
  $('ob-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;
    [...$('ob-mode').children].forEach(x=>x.classList.toggle('on',x===b));
    Object.keys(M).forEach(k=>$('sx-ob-'+k).hidden=k!==mode);A.reset(4,'sx-ob-'+mode);});
})();
