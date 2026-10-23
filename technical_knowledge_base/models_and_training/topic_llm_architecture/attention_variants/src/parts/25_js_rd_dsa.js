// Reading section 5, DSA as a stepper: the cache, the indexer scoring every entry, top-k selection, attention over the selected
// entries, the reads at V3.2's scale, and the two training stages. Scores: SmolLM2-135M's real attention from the last token of the
// running sequence in layer 18 (mean of 9 heads, AVK), standing in for an indexer (an oracle). k = 16 here; V3.2 uses 2,048.
(function(){
  if(!window.RD||!window.AVK||!document.getElementById('av-dsa-card'))return;
  const $=id=>document.getElementById(id),K=AVK,k=16;
  const r=K.rows.find(x=>x.layer===18&&x.q===K.tokens.length-1)||K.rows[K.rows.length-1];
  const w=Array.from(r.mean,ch=>(ch.charCodeAt(0)-48)/63*r.mean_max),n=r.q+1,mx=Math.max(...w),tot=w.reduce((a,b)=>a+b,0);
  const top=[...Array(n).keys()].sort((a,b)=>w[b]-w[a]).slice(0,k),sel=new Set(top);let kept=0;top.forEach(j=>kept+=w[j]);
  const cap=[
    ['The cache: every entry stays resident','Each of the '+n+' earlier tokens keeps its MLA entry (576 numbers, green) <b>and</b> a 128-number indexer key (the yellow edge). Nothing is evicted: any entry may be selected later. That is why DSA stores more than MLA alone: 83.9 KiB per token against V3\'s 68.6 in bf16.'],
    ['The lightning indexer scores every entry','For the new token, a few small indexer heads compute I<sub>t,s</sub> = &Sigma;<sub>j</sub> w<sub>t,j</sub> ReLU(q<sub>t,j</sub> &middot; k<sub>s</sub>) against every cached indexer key (shading: darker is a higher score). ReLU instead of a softmax and FP8 make each score cheap, but every token is scored: the indexer is still O(L<sup>2</sup>) over a sequence.'],
    ['Keep the top k','Only the k highest-scoring entries (outlined) go to the real attention: k = '+k+' here, 2,048 in V3.2. Here the scores are the model\'s real attention, so these are the best '+k+' any indexer could pick.'],
    ['MLA attention reads only the selected entries','The 128 query heads, in MLA\'s absorbed (MQA) mode, read the '+k+' selected 576-number entries and nothing else: '+k+' of '+n+' entries. A selected entry must be shared by all heads for the kernel to be efficient, which is why DSA sits on MLA. These '+k+' entries hold '+(100*kept/tot).toFixed(0)+'% of this query\'s real attention.'],
    ['What one decoded token reads at V3.2\'s scale','At 131,072 cached tokens, per layer: the indexer reads 131,072 keys of 128 numbers (16.8M numbers) and attention reads 2,048 entries of 576 (1.18M). Together about 24% of what dense V3 reads (75.5M), not 2,048 / 131,072 = 1.6%: the indexer\'s read grows with the context. Below 2,048 tokens DSA reads everything.'],
    ['How it learned to choose: two training stages','V3.2 continued from V3.1-Terminus. <b>Stage 1, dense warm-up:</b> the model frozen, only the indexer trained, for 1,000 steps (2.1B tokens), to match the main attention distribution (scores summed over heads and normalised) with a KL-divergence loss. <b>Stage 2, sparse:</b> 943.7B tokens in which the whole model adapts to top-2,048 selection, while the indexer, detached from the main graph, keeps fitting the attention over the selected set. DSA is an approximation trained in, not applied afterwards.']];
  function draw(i){
    const el=$('av-dsa'),W=RD.width(el),cols=W<560?16:32,cs=Math.min(22,Math.floor((W-4)/cols)),c=cs-2,rows=Math.ceil((n+1)/cols);
    let s='';
    for(let j=0;j<=n;j++){const x=(j%cols)*cs,y=Math.floor(j/cols)*cs;
      if(j===n){s+='<rect x="'+(x+.5)+'" y="'+(y+.5)+'" width="'+(c-1)+'" height="'+(c-1)+'" rx="2" fill="none" stroke="var(--ink)" stroke-width="1.5"/>';continue}
      const a=Math.sqrt(w[j]/mx),on=sel.has(j);let fill='var(--good)',op=.55;
      if(i===1)fill='var(--c5)',op=(.08+.92*a).toFixed(2);
      if(i===2){fill='var(--c5)';op=on?(.15+.85*a).toFixed(2):'0.12'}
      if(i>=3){fill=on?'var(--acc)':'var(--dim)';op=on?1:.6}
      s+='<rect x="'+x+'" y="'+y+'" width="'+c+'" height="'+c+'" rx="2" fill="'+fill+'" fill-opacity="'+op+'"/>';
      if(i===0)s+='<rect x="'+x+'" y="'+(y+c-3)+'" width="'+c+'" height="3" fill="var(--c5)"/>';
      if(i===2&&on)s+='<rect x="'+(x-.5)+'" y="'+(y-.5)+'" width="'+(c+1)+'" height="'+(c+1)+'" rx="2" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    }
    el.innerHTML=RD.svg(cols*cs,rows*cs,s,'DSA step '+(i+1)+': '+cap[i][0]);
    $('av-dsa-cap').innerHTML='<b>Step '+(i+1)+' of '+cap.length+': '+cap[i][0]+'.</b> '+cap[i][1];
    const st=(a,b,d)=>RD.stat(a,b,d);
    $('av-dsa-cnt').innerHTML=st('entries stored',n,'every one kept')+st('indexer keys scored',i>=1?n:0,'all of them')+st('entries read by attention',i>=3?k+' of '+n:'0',i>=3?(100*k/n).toFixed(0)+'% of the entries':'')+st('real attention kept',i>=3?(100*kept/tot).toFixed(0)+'%':'','oracle selection');
    const on=i===5;
    $('av-dsa-stage').innerHTML='<div class="small" style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;opacity:'+(on?1:.45)+'"><span style="border:1px solid var(--line);border-radius:6px;padding:2px 8px;background:var(--soft)">Stage 1: dense warm-up, 2.1B tokens, model frozen, indexer fits dense attention (KL)</span><span style="border:1px solid var(--acc);border-radius:6px;padding:2px 8px;background:var(--acc2)">Stage 2: sparse, 943.7B tokens, model adapts to top-2,048</span></div>';
  }
  const an=RD.anim({card:'av-dsa-card',ctl:'av-dsa-ctl',n:cap.length,ms:2600,draw,label:'DSA step'});
  RD.onResize(()=>an.redraw());
})();
