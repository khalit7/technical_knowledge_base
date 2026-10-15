// ---- Corpus comparer tab: the measured samples side by side ----
(function(){
  const M=window.PC&&PC.measured;if(!M||!document.getElementById('cm-main'))return;
  const esc=RD.esc,S=M.samples,O=M.order;let metric='len',sel=null;
  const pct=x=>(100*x).toFixed(1)+'%';
  const GCOL={web:'var(--c1)',synthetic:'var(--c4)',open:'var(--open)',mix:'var(--c5)',papers:'var(--c6)',math:'var(--c2)',code:'var(--c3)',multi:'var(--closed)'};
  const name=k=>'<a href="#" data-cm="'+k+'" title="'+esc(S[k].label)+'">'+esc(S[k].label)+'</a>';
  function rowBar(k,w,txt,col){return '<div class="cm-row"><span class="nm">'+name(k)+'</span><span style="display:flex;gap:6px;align-items:center;min-width:0"><span class="cm-stack" style="flex:1"><span style="width:'+Math.max(.5,w).toFixed(1)+'%;background:'+(col||GCOL[S[k].group])+'"></span></span><span class="small" style="white-space:nowrap">'+txt+'</span></span></div>'}
  const V={
    len(){const lx=v=>Math.log10(Math.max(10,v)),lo=1.5,hi=6;
      let h='<div class="small mute">Characters per document: the bar spans the 10th to 90th percentile on a log scale (30 to 1,000,000), the tick is the median.</div>';
      O.forEach(k=>{const c=S[k].chars,a=100*(lx(c.p10)-lo)/(hi-lo),b=100*(lx(c.p90)-lo)/(hi-lo),m=100*(lx(c.p50)-lo)/(hi-lo);
        h+='<div class="cm-row"><span class="nm">'+name(k)+'</span><span style="display:flex;gap:6px;align-items:center;min-width:0"><span style="position:relative;flex:1;height:16px;background:var(--soft);border-radius:3px"><span style="position:absolute;left:'+a.toFixed(1)+'%;width:'+Math.max(.8,b-a).toFixed(1)+'%;top:3px;bottom:3px;background:'+GCOL[S[k].group]+';opacity:.55;border-radius:2px"></span><span style="position:absolute;left:'+m.toFixed(1)+'%;top:0;bottom:0;width:2px;background:var(--ink)"></span></span><span class="small" style="white-space:nowrap;min-width:5.5em;text-align:right">'+c.p50.toLocaleString('en-US')+'</span></span></div>'});
      return [h,'Median characters on the right. Wikipedia articles (this file holds early, long articles) are about ten times longer than a web page and PDFs about twice; this peS2o file is all abstracts (its s2ag part), so it is short. Length matters for long-context training and for how many tokens one "document" weighs in a mix.']},
    tok(){const T=['gpt2','neox','olmo2','qwen3'],TL={gpt2:'GPT-2',neox:'GPT-NeoX',olmo2:'OLMo 2',qwen3:'Qwen3'};
      let h='<div class="tw"><table><thead><tr><th>Characters per token</th>'+T.map(t=>'<th class="num">'+TL[t]+'</th>').join('')+'<th class="num">Qwen3 tokens per GPT-2 token</th></tr></thead><tbody>';
      O.forEach(k=>{const c=S[k].cpt;h+='<tr><td>'+name(k)+'</td>'+T.map(t=>'<td class="num">'+c[t].toFixed(2)+'</td>').join('')+'<td class="num">'+(c.gpt2/c.qwen3).toFixed(2)+'</td></tr>'});
      return [h+'</tbody></table></div>','More characters per token means fewer tokens for the same text. English web text barely changes between tokenizers; code, maths, PDFs and French change most. The last column converts a GPT-2 token count (FineWeb\'s unit) into Qwen3 tokens for that kind of text.']},
    lang(){let h='<div class="small mute">Share of documents by the top language label of fastText lid.176; grey is the rest.</div>';const LC={en:'var(--c1)',fr:'var(--c2)',de:'var(--c3)',es:'var(--c5)'};
      O.forEach(k=>{const L=S[k].lang_top||[];let acc=0;const seg=L.slice(0,3).map(([l,s])=>{acc+=s;return '<span title="'+esc(l)+' '+pct(s)+'" style="width:'+(100*s).toFixed(2)+'%;background:'+(LC[l]||'var(--c4)')+'"></span>'}).join('');
        h+='<div class="cm-row"><span class="nm">'+name(k)+'</span><span style="display:flex;gap:6px;align-items:center;min-width:0"><span class="cm-stack" style="flex:1">'+seg+'</span><span class="small" style="white-space:nowrap;min-width:7.5em">'+L.slice(0,2).map(([l,s])=>esc(l)+' '+pct(s)).join(', ')+'</span></span></div>'});
      return [h,'Median top-label confidence per sample is in each corpus\'s detail. Code and maths get odd labels (the identifier was trained on prose), which is why code and maths pipelines skip or relax language filtering.']},
    dom(){let h='';const ks=O.filter(k=>S[k].domains);
      h+='<div class="tw"><table><thead><tr><th>Sample</th><th class="num">with URL</th><th class="num">distinct domains per 1,000 docs</th><th>top domains (share of documents)</th></tr></thead><tbody>'+ks.map(k=>{const d=S[k].domains;return '<tr><td>'+name(k)+'</td><td class="num">'+pct(d.url_share)+'</td><td class="num">'+d.distinct_per_1000+'</td><td class="small">'+d.top.slice(0,4).map(([n,s])=>esc(n)+' '+pct(s)).join(', ')+'</td></tr>'}).join('')+'</tbody></table></div>';
      return [h,'Web samples spread over almost one domain per document; maths and Wikipedia concentrate on a few sites. Domain shares matter for licence questions (who owns the text) and for opt-outs (section 1).']},
    dup(){let h='';O.forEach(k=>{const e=S[k].exact_dup,n=S[k].near_dup;h+=rowBar(k,100*Math.max(e,n)/0.05,pct(e)+' exact, '+pct(n)+' near')});
      return [h,'Within each sample, exact duplicates (same normalised text) and near duplicates (MinHash on word 5-grams, 128 permutations, LSH at Jaccard 0.8). The curated corpora were already deduplicated, so these are near zero; bar scale is 0 to 5%. Duplicates in a whole corpus come across crawls and files, which a first-N sample of one file cannot see (Reading section 2).']},
    rules(){const R=[['gopher_quality','Gopher quality'],['gopher_repetition','Gopher repetition'],['c4_quality','C4 (datatrove)'],['fineweb_quality','FineWeb']];
      let h='<div class="tw"><table><thead><tr><th>Share passing</th>'+R.map(r=>'<th class="num">'+r[1]+'</th>').join('')+'</tr></thead><tbody>';
      O.forEach(k=>{h+='<tr><td>'+name(k)+'</td>'+R.map(r=>{const v=S[k].pass[r[0]];const a=Math.max(0,Math.min(1,(1-v)/0.8));return '<td class="cm-cell" style="background:color-mix(in srgb,var(--bad) '+(a*45).toFixed(0)+'%,transparent)">'+pct(v)+'</td>'}).join('')+'</tr>'});
      return [h+'</tbody></table></div>','datatrove 0.10.1 filters with default settings (C4 with the terminal-punctuation rule off, as FineWeb ran it, and its default of 5 sentences). Redder cells fail more. Tap a corpus for its most common failure reasons.']},
    edu(){let h='<div class="small mute">FineWeb-Edu classifier, share of documents at each rounded score 0 to 5 (darker = higher); the number is the mean.</div>';
      O.filter(k=>S[k].edu).forEach(k=>{const e=S[k].edu,t=e.hist.reduce((a,b)=>a+b,0);const seg=e.hist.map((c,i)=>'<span title="score '+i+': '+c+'" style="width:'+(100*c/t).toFixed(2)+'%;background:color-mix(in srgb,var(--c2) '+(15+17*i)+'%,var(--bg))"></span>').join('');
        h+='<div class="cm-row"><span class="nm">'+name(k)+'</span><span style="display:flex;gap:6px;align-items:center;min-width:0"><span class="cm-stack" style="flex:1">'+seg+'</span><span class="small" style="white-space:nowrap;min-width:6.8em">'+e.mean.toFixed(2)+' · '+pct(e.ge3)+' at 3+</span></span></div>'});
      return [h,'The classifier was trained on Llama-3-70B grades of FineWeb pages for "educational value at primary to grade school level". It rewards explanatory prose; Wikipedia and maths score high, forums, shops and most PDFs low. Every document of every sample is scored.']}
  };
  function detail(){const d=document.getElementById('cm-detail');if(!sel){d.innerHTML='';return}const s=S[sel];
    const src=s.src||{};
    d.innerHTML='<div class="card"><h3 style="margin:0 0 4px">'+esc(s.label)+'</h3><div class="small">'+s.n.toLocaleString('en-US')+' documents from <code>'+esc(src.repo||'')+'</code>'+(src.revision?' @ '+esc(String(src.revision).slice(0,10)):'')+', file <code style="overflow-wrap:anywhere">'+esc(src.file||'')+'</code>. '+esc(src.note||'')+'</div>'+
      '<div class="small">Median '+s.words_p50.toLocaleString('en-US')+' words; language label confidence median '+(s.lang_score_p50!=null?s.lang_score_p50.toFixed(2):'n/a')+'. Most common rule failures: '+((s.fail_top||[]).slice(0,4).map(([r,c])=>esc(r.replace('_quality','').replace(':',': '))+' ('+c+')').join(', ')||'none')+'.</div>'+
      (s.ex||[]).map(x=>'<div class="cm-ex"><div class="lab">'+(x.score!=null?'edu score '+x.score.toFixed(2):'excerpt')+(x.url?' · '+esc(x.url.replace(/^https?:\/\//,'').split('/')[0]):'')+'</div><blockquote>'+esc(x.text)+'</blockquote></div>').join('')+'</div>'}
  function draw(){const [h,n]=V[metric]();document.getElementById('cm-main').innerHTML=h;document.getElementById('cm-note').innerHTML=n;detail()}
  RD.seg(document.getElementById('cm-seg'),m=>{metric=m;draw()});
  document.getElementById('t-pccmp').addEventListener('click',e=>{const a=e.target.closest('a[data-cm]');if(!a)return;e.preventDefault();sel=a.dataset.cm;detail();document.getElementById('cm-detail').scrollIntoView({block:'nearest'})});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-pccmp']=window.TAB_RENDER['t-pccmp']||[]).push(draw);
  sel=O[0];draw();
})();
