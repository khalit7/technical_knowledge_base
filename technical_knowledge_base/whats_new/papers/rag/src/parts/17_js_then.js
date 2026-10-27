// ---- Then and now: one four-part pipeline, which parts are trained, how documents are combined ----
(function(){if(!$('th'))return;
  const L=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  // q: query encoder, d: index, c: combination, g: generator; 1 = trained for the task, 0 = frozen or off the shelf
  const S=[
   {n:'RAG',y:'May 2020',u:PAPER.meta.ax,q:1,d:0,g:1,ql:'BERT_q (DPR)',dl:'21M Wikipedia chunks',cl:'marginalise over top k (Sequence or Token)',gl:'BART-large, 406M',
    c:'This paper: the query encoder and BART are fine-tuned together through the marginal likelihood; the document encoder and index stay frozen. The generator reads one document at a time.'},
   {n:'FiD',y:'July 2020',u:'https://arxiv.org/abs/2007.01282',q:0,d:0,g:1,ql:'retriever, not trained',dl:'Wikipedia passages',cl:'encode each passage, decoder reads all at once',gl:'seq2seq generator, fine-tuned',
    c:'Fusion-in-Decoder (Izacard and Grave): retrieval stays fixed, each passage is encoded separately with the question and the decoder attends over all of them together, so evidence is combined inside the network instead of by a sum of probabilities. "The performance of this method significantly improves when increasing the number of retrieved passages."'},
   {n:'RETRO',y:'December 2021',u:'https://arxiv.org/abs/2112.04426',q:0,d:0,g:1,ql:'frozen BERT',dl:'2 trillion tokens',cl:'chunked cross-attention',gl:'trained from scratch',
    c:'Retrieval moves inside a language model (DeepMind): "a frozen Bert retriever, a differentiable encoder and a chunked cross-attention mechanism". With a 2 trillion token database it is comparable to GPT-3 and Jurassic-1 on the Pile "despite using 25× fewer parameters".'},
   {n:'Atlas',y:'August 2022',u:'https://arxiv.org/abs/2208.03299',q:1,d:1,g:1,ql:'Contriever, trained',dl:'re-embedded every 2,500 pretraining steps',cl:'Fusion-in-Decoder',gl:'T5, pretrained with retrieval',
    c:'The end-to-end idea taken furthest (Meta): retriever and language model "carefully designed and pre-trained" together, then fine-tuned with few examples: "over 42% accuracy on Natural Questions using only 64 examples", and "the document index ... can easily be updated". Unlike RAG it trains the document side too: pretraining re-embeds the index every 2,500 steps (Atlas §4.5); fine-tuning then updates the query side only.'},
   {n:'REPLUG',y:'January 2023',u:'https://arxiv.org/abs/2301.12652',q:1,d:0,g:0,ql:'retriever, tuned by the LM',dl:'corpus',cl:'prepend documents to the prompt',gl:'black-box LM (GPT-3, Codex)',
    c:'The generator is frozen behind an API, so only the retriever learns, from the frozen LM\'s own likelihoods: "the LM can be used to supervise the retrieval model". GPT-3 (175B) language modelling improves by 6.3% and Codex five-shot MMLU by 5.1%.'},
   {n:'In-Context RALM',y:'January 2023',u:'https://arxiv.org/abs/2302.00083',q:0,d:0,g:0,ql:'off-the-shelf retriever',dl:'corpus',cl:'prepend documents to the prompt',gl:'frozen LM',
    c:'Nothing trained at all: "leaving the LM architecture unchanged and prepending grounding documents to the input, without any further training of the LM", with "off-the-shelf general purpose retrievers". This is the pattern most deployed RAG follows.'},
   {n:'Self-RAG',y:'October 2023',u:'https://arxiv.org/abs/2310.11511',q:0,d:0,g:1,ql:'retriever, called on demand',dl:'corpus',cl:'model decides when to retrieve, then critiques',gl:'one LM, trained to reflect',
    c:'The generator learns when to retrieve: it "adaptively retrieves passages on-demand, and generates and reflects on retrieved passages", against the "indiscriminately retrieving and incorporating a fixed number of retrieved passages" of plain RAG. The agentic line (%ReAct%) makes retrieval a tool call.'},
   {n:'GraphRAG',y:'April 2024',u:'https://arxiv.org/abs/2404.16130',q:0,d:1,g:0,ql:'query over a graph',dl:'LLM-built entity graph',cl:'summaries of graph communities',gl:'frozen LLM',
    c:'For "global questions directed at an entire text corpus", which chunk retrieval cannot answer, an LLM builds the index itself, an entity knowledge graph with community summaries (Microsoft). The index is the part that is built (by an LLM, not by gradient descent), the generator is frozen.'}];
  const react='<a href="https://app.notion.com/p/3c65c17b0d0d816b9a24c28de8f08ea8" target="_blank" rel="noopener noreferrer">ReAct</a>';
  const modes={m:S.map(s=>({t:s.n+' ('+s.y+')',c:s.c.replace('%ReAct%',react)+' '+L(s.u,'Source')+'.'}))};
  function draw(m,k,e,w){const s0=S[Math.max(0,k-1)],s1=S[k];const narrow=w<620;let s='';
    const parts=[['q','Query encoder',s1.ql],['d','Index',s1.dl],['c','Combine',s1.cl],['g','Generator',s1.gl]];
    const n=4,gap=narrow?10:14,bw=narrow?w-20:(w-gap*(n-1))/n,bh=narrow?52:92;
    parts.forEach((p,i)=>{const x=narrow?10:i*(bw+gap),y=narrow?i*(bh+gap):10;const tr=p[0]==='c'?null:s1[p[0]],was=p[0]==='c'?null:s0[p[0]];
      const op=tr==null?0:(k===0?tr:was+(tr-was)*e);
      s+=rc(x,y,bw,bh,'var(--soft)',{s:'var(--line)'});s+=rc(x,y,bw,bh,'var(--acc2)',{op:op.toFixed(2),s:'var(--acc)',sw:1.5});
      if(tr===0)s+=rc(x+2,y+2,bw-4,bh-4,'none',{s:'var(--mute)',da:'4 3'});
      s+=tx(x+bw/2,y+18,p[1],{a:'middle',fs:12,w:600});
      const words=p[2].split(' '),lines=[];let cur='';const maxc=Math.max(10,Math.floor(bw/6.6));words.forEach(wd=>{if((cur+' '+wd).trim().length>maxc){lines.push(cur.trim());cur=wd}else cur+=' '+wd});lines.push(cur.trim());
      lines.slice(0,narrow?2:4).forEach((l,j)=>{s+=G(k===0?1:e,tx(x+bw/2,y+(narrow?34:38)+j*14,l,{a:'middle',fs:11,c:'var(--mute)'}))});
      if(p[0]!=='c')s+=tx(x+bw-6,y+bh-6,tr?'trained':'frozen',{a:'end',fs:11,c:tr?'var(--ink)':'var(--mute)'});
      if(!narrow&&i<n-1)s+=ln2(x+bw,y+bh/2,x+bw+gap,y+bh/2,'var(--mute)',{sw:1.4})});
    const H=narrow?4*(bh+gap):bh+20;return svgW(w,H,s,'Pipeline of '+s1.n)}
  function counters(m,k){const s=S[k],t=['q','d','g'].filter(x=>s[x]).length;return stat('system',s.n,s.y)+stat('parts trained',t+' of 3','query encoder, index, generator')+stat('retriever learns from the generator',(s.q&&s.g)||s.n==='REPLUG'?'yes':'no','')}
  makeAnim({id:'th',modes,mode:'m',draw,counters,dur:3200});
  $('thTab').innerHTML='<table><thead><tr><th>System</th><th>Year</th><th>Query encoder</th><th>Index</th><th>Generator</th><th>How documents are combined</th></tr></thead><tbody>'+S.map(s=>'<tr><td>'+L(s.u,s.n)+'</td><td>'+s.y+'</td><td>'+(s.q?'trained':'frozen')+'</td><td>'+(s.d?s.dl:'frozen')+'</td><td>'+(s.g?'trained':'frozen')+'</td><td>'+s.cl+'</td></tr>').join('')+'</tbody></table>';
})();
