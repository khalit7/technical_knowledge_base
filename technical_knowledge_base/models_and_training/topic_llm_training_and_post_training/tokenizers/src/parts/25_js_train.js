// ---- Reading: train BPE, WordPiece and Unigram on the same corpus, step by step; encode with all three ----
(function(){
  const A=window.TOKALG,{esc,strChips,fmt}=TKV,stat=RD.stat;
  const COURSE=['This is the Hugging Face Course.','This chapter is about tokenization.','This section shows several tokenizer algorithms.','Hopefully, you will be able to understand how they are trained and generate tokens.'];
  const $=id=>document.getElementById(id);
  const ta=$('trnText');ta.value=COURSE.join('\n');
  let M={},mode='bpe',an=null;
  const show=s=>esc(s); // tokens are shown as the algorithm stores them (Ġ = space in byte-level BPE, ▁ in Unigram, ## = continuation)
  function train(){
    const lines=ta.value.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,200);
    const nB=Math.max(1,Math.min(300,+$('trnBpeN').value||25)),nW=Math.max(10,Math.min(600,+$('trnWpN').value||70)),nU=Math.max(20,Math.min(600,+$('trnUgN').value||100));
    const t0=performance.now();
    M.bpe=A.bpeTrain(lines,nB);M.wp=A.wpTrain(lines,nW);M.ug=A.ugTrain(lines,nU);
    const words=M.bpe.words.length;
    $('trnInfo').textContent=lines.length+' lines, '+words+' distinct pre-tokenized words (BPE\'s pre-tokenizer); trained in '+Math.round(performance.now()-t0)+' ms. Long texts make Unigram slow: it re-scores every candidate each round.';
    setMode(mode);enc();
  }
  const nSteps=m=>m==='ug'?M.ug.rounds.length:M[m].hist.length+1;
  function setMode(m){mode=m;document.querySelectorAll('#trnMode button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
    if(an)an.reset(nSteps(m));}
  function wordsHTML(words,counts,splits,mark,changed){
    let h='';const n=Math.min(words.length,80);
    for(let i=0;i<n;i++)h+='<div class="wrow"'+(changed&&changed[i]?' style="background:var(--hl)"':'')+'><span class="cnt">×'+counts[i]+'</span>'+strChips(splits[i],mark)+'</div>';
    if(words.length>n)h+='<p class="small mute">+ '+(words.length-n)+' more words</p>';
    return h}
  const totalTok=(splits,counts)=>splits.reduce((a,s,i)=>a+s.length*counts[i],0);
  function draw(i){
    const cap=$('trnCap'),cnt=$('trnCnt'),tab=$('trnTab'),note=$('trnNote'),wd=$('trnWords');
    if(mode==='bpe'){const m=M.bpe,h=i>0?m.hist[i-1]:null;
      const splits=m.words.map(w=>A.bpeApply(w,m.merges,i));
      wd.innerHTML=wordsHTML(m.words,m.counts,splits,h?(s=>s===h.tok):null);
      const tot=totalTok(splits,m.counts),bytes=m.start;
      const top=i>0?h.top:(m.hist[0]?m.hist[0].top:[]);
      if(!h)cap.innerHTML='<div class="t">Start: every word is a sequence of bytes</div><p>256 byte tokens in the vocabulary, '+fmt(bytes)+' tokens across the corpus. GPT-2\'s byte-level BPE writes a space as <code>Ġ</code> (Ġ is just the printable stand-in for byte 32), and a non-ASCII character as two to four odd symbols, one per byte. The table shows the pair counts that decide the first merge.</p>';
      else{const tie=top.filter(x=>x[2]===h.c).length;
        cap.innerHTML='<div class="t">Merge '+i+': '+show(h.a)+' + '+show(h.b)+' → '+show(h.tok)+'</div><p>The most frequent adjacent pair, seen '+h.c+' time'+(h.c>1?'s':'')+' across the corpus (each word counts as often as it occurs). Every occurrence is replaced at once; the new token is outlined.'+(tie>1?' '+tie+' pairs were tied at '+h.c+': the library breaks ties by the smallest token ids (byte symbols in code-point order, then merges in the order learned), so this choice is arbitrary but reproducible.':'')+'</p>'}
      cnt.innerHTML=stat('Step',i+' of '+m.hist.length)+stat('Vocabulary',fmt(256+i),'256 bytes + '+i+' merges')+stat('Tokens in corpus',fmt(tot),'from '+fmt(bytes)+' bytes')+stat('Bytes per token',(bytes/tot).toFixed(2));
      $('trnTabT').textContent=i>0?'Pairs counted at merge '+i:'Pairs counted before the first merge';
      tab.innerHTML='<table class="ctab"><thead><tr><th>Pair</th><th class="num">Count</th></tr></thead><tbody>'+top.map((x,j)=>'<tr'+(j===0?' class="on"':'')+'><td><code>'+show(x[0])+'</code> + <code>'+show(x[1])+'</code></td><td class="num">'+x[2]+'</td></tr>').join('')+'</tbody></table>';
      note.textContent='Byte-level, GPT-2 pre-tokenizer: a word keeps its leading space, so "Ġis" and "is" are different words.';
    }else if(mode==='wp'){const m=M.wp,h=i>0?m.hist[i-1]:null;
      const splits=A.wpSplitsAt(m,i);
      wd.innerHTML=wordsHTML(m.words,m.counts,splits,h?(s=>s===h.tok):null);
      const tot=totalTok(splits,m.counts);const nx=m.hist[i]||null;const top=h?h.top:(m.hist[0]?m.hist[0].top:[]);const ref=h||m.hist[0];
      if(!h)cap.innerHTML='<div class="t">Start: every word split into characters</div><p>Inside a word each character carries the <code>##</code> prefix, so <code>s</code> at the start of a word and <code>##s</code> inside one are different tokens. The vocabulary starts with BERT\'s 5 special tokens plus '+(m.v0-5)+' characters.</p>';
      else cap.innerHTML='<div class="t">Merge '+i+': '+show(h.a)+' + '+show(h.b)+' → '+show(h.tok)+'</div><p>Highest score: '+h.f+' / ('+h.fa+' × '+h.fb+') = '+h.sc.toFixed(4)+'. '+(h.mostFreq[0]!==h.a||h.mostFreq[1]!==h.b?'The most frequent pair was '+show(h.mostFreq[0])+' + '+show(h.mostFreq[1])+' ('+h.mostFreq[2]+' times), which BPE would have merged, but its parts are common everywhere, so it scores only '+h.mostFreq[3].toFixed(4)+'.':'Here the most frequent pair also has the best score.')+'</p>';
      cnt.innerHTML=stat('Step',i+' of '+m.hist.length)+stat('Vocabulary',fmt(m.v0+i),'5 special + '+(m.v0-5)+' characters + '+i)+stat('Tokens in corpus',fmt(tot),'from '+fmt(m.start)+' characters')+stat('Characters per token',(m.start/tot).toFixed(2));
      $('trnTabT').textContent=h?'Scores at merge '+i:'Scores before the first merge';
      tab.innerHTML='<table class="ctab"><thead><tr><th>Pair</th><th class="num">f(ab)</th><th class="num">f(a)</th><th class="num">f(b)</th><th class="num">Score</th></tr></thead><tbody>'+top.map((x,j)=>'<tr'+(j===0&&h?' class="on"':'')+'><td><code>'+show(x[0])+'</code> + <code>'+show(x[1])+'</code></td><td class="num">'+x[2]+'</td><td class="num">'+x[3]+'</td><td class="num">'+x[4]+'</td><td class="num">'+x[5].toFixed(4)+'</td></tr>').join('')+'</tbody></table>';
      note.textContent='BERT pre-tokenizer: punctuation is split off and spaces are dropped. Ties go to the first pair met in the corpus, as in the course\'s code.';
    }else{const m=M.ug,r=m.rounds[i];
      const model=A.ugModelOf(r.vocab,m.tf0),splits=m.words.map(w=>A.ugViterbi(w,model)[0]);
      let changed=null;if(i>0){const pm=A.ugModelOf(m.rounds[i-1].vocab,m.tf0);changed=m.words.map((w,k)=>A.ugViterbi(w,pm)[0].join('\u0000')!==splits[k].join('\u0000'))}
      wd.innerHTML=wordsHTML(m.words,m.counts,splits,null,changed);
      const tot=totalTok(splits,m.counts),nch=r.vocab.filter(t=>Array.from(t).length===1).length;
      if(i===0)cap.innerHTML='<div class="t">Start: '+r.vocab.length+' candidates</div><p>Every character ('+nch+') plus the most frequent substrings of the corpus\'s words, each with probability proportional to its count. A word is tokenized by its most probable segmentation (Viterbi), and the corpus loss is the sum of −log P over all words.</p>';
      else cap.innerHTML='<div class="t">Round '+i+': remove '+r.removed.length+' tokens</div><p>For each token the loss is recomputed without it; the 10% whose removal costs least go (single characters are never removed). Words whose best segmentation changed are highlighted. Cheapest removals: '+r.removed.slice(0,5).map(x=>'<code>'+show(x[0])+'</code> (+'+x[1].toFixed(2)+')').join(', ')+'.</p>';
      cnt.innerHTML=stat('Round',i+' of '+(m.rounds.length-1))+stat('Vocabulary',fmt(r.vocab.length),nch+' characters kept')+stat('Corpus loss',r.loss.toFixed(2),'−Σ log P(word)')+stat('Tokens in corpus',fmt(tot),'from '+fmt(m.start)+' characters');
      $('trnTabT').textContent=i>0?'Removed in round '+i+' (loss increase)':'Most frequent candidates';
      const rows=i>0?r.removed.slice(0,12).map(x=>[x[0],'+'+x[1].toFixed(3)]):r.vocab.filter(t=>Array.from(t).length>1).slice(0,12).map(t=>[t,m.tf0.get(t)]);
      tab.innerHTML='<table class="ctab"><thead><tr><th>Token</th><th class="num">'+(i>0?'Loss increase':'Count')+'</th></tr></thead><tbody>'+rows.map(x=>'<tr><td><code>'+show(x[0])+'</code></td><td class="num">'+x[1]+'</td></tr>').join('')+'</tbody></table>'+(i>0&&r.removed.length>12?'<p class="small mute">+ '+(r.removed.length-12)+' more</p>':'');
      note.textContent='Metaspace pre-tokenizer (XLNet): each word starts with ▁ standing for its space. Unigram never adds tokens, so nothing is outlined; it only takes them away.';
    }
  }
  function enc(){const t=$('encIn').value.slice(0,300),o=$('encOut');
    const b=A.bpeEncode(t,M.bpe.merges).flat(),w=A.wpEncode(t,M.wp.vocab).flat(),u=A.ugEncode(t,M.ug.model).flat();
    o.innerHTML=[['BPE',b,M.bpe.merges.length+' merges'],['WordPiece',w,M.wp.vocab.length+' entries'],['Unigram',u,M.ug.model.size+' entries']].map(([n,p,s])=>
      '<div class="trow"><div class="nm">'+n+'<small>'+s+'</small></div><div>'+strChips(p,x=>x==='[UNK]'||x==='<unk>')+'</div><div class="n">'+p.length+'</div></div>').join('')+
      '<p class="small mute">Outlined: unknown. WordPiece gives up on a whole word if any piece is missing; Unigram here marks an unknown word as <code>&lt;unk&gt;</code> (the course\'s code); byte-level BPE never needs to.</p>'}
  document.getElementById('trnMode').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setMode(b.dataset.m)});
  $('trnGo').addEventListener('click',train);
  $('trnReset').addEventListener('click',()=>{ta.value=COURSE.join('\n');$('trnBpeN').value=25;$('trnWpN').value=70;$('trnUgN').value=100;train()});
  $('encIn').addEventListener('input',enc);
  M.bpe=A.bpeTrain(COURSE,25);M.wp=A.wpTrain(COURSE,70);M.ug=A.ugTrain(COURSE,100);
  an=RD.anim({card:'trn',ctl:'trnCtl',n:nSteps('bpe'),draw:i=>draw(i),ms:1500,label:'Training step'});
  train();
})();
