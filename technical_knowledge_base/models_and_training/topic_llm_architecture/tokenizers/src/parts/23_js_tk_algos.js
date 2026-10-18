// ---- The three tokenizer-training algorithms, implemented exactly (no DOM; check_algos.mjs runs this file in Node) ----
// BPE: byte-level, GPT-2 pre-tokenizer, Hugging Face `tokenizers` BpeTrainer rule (most frequent pair; ties go to the
//   pair with the smallest ids, ids = 256 byte symbols in code-point order, then merges in creation order).
// WordPiece: the Hugging Face course's algorithm (score = freq(ab) / (freq(a) freq(b)); ties go to the first pair met),
//   BERT pre-tokenizer; encoding is greedy longest-match-first with ## continuations.
// Unigram: the Hugging Face course's algorithm (seed = characters + most frequent substrings, probabilities from
//   frequencies, prune the 10% whose removal raises the corpus loss least, never single characters), Metaspace
//   pre-tokenizer; encoding is Viterbi. Checked against the course's printed outputs and against the library.
(function(G){
  // GPT-2 byte to unicode table: printable bytes map to themselves, the rest to U+0100 onward (space -> 'Ġ').
  const B2U=(()=>{const bs=[];for(let i=33;i<=126;i++)bs.push(i);for(let i=161;i<=172;i++)bs.push(i);for(let i=174;i<=255;i++)bs.push(i);
    const cs=bs.slice();let n=0;for(let b=0;b<256;b++)if(!bs.includes(b)){bs.push(b);cs.push(256+n);n++}
    const m=new Array(256);bs.forEach((b,i)=>{m[b]=String.fromCodePoint(cs[i])});return m})();
  const ALPHA=B2U.slice().sort((a,b)=>a.codePointAt(0)-b.codePointAt(0)); // ids 0..255
  const GPT2=/'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
  const enc=new TextEncoder();
  const pretok={
    byteLevel:s=>(s.match(GPT2)||[]).map(w=>Array.from(enc.encode(w),b=>B2U[b]).join('')),
    // BERT: split on whitespace, every punctuation character (ASCII punctuation or Unicode P*) is its own word
    bert:s=>{const out=[];let cur='';for(const ch of s){if(/\s/u.test(ch)){if(cur)out.push(cur);cur=''}
      else if(/[!-\/:-@\[-`{-~]|\p{P}/u.test(ch)){if(cur)out.push(cur);out.push(ch);cur=''}else cur+=ch}if(cur)out.push(cur);return out},
    // XLNet: whitespace split, then '▁' prefixed to every word
    metaspace:s=>s.split(/\s+/u).filter(Boolean).map(w=>'▁'+w)
  };
  // word -> count, in order of first appearance (a Map keeps insertion order, like a Python dict)
  function wordFreqs(lines,fn){const m=new Map();for(const l of lines)for(const w of fn(l))m.set(w,(m.get(w)||0)+1);return m}
  const chars=w=>Array.from(w);

  // ---------- BPE ----------
  function bpeTrain(lines,nMerges){
    const wf=wordFreqs(lines,pretok.byteLevel);
    const id=new Map(ALPHA.map((c,i)=>[c,i]));
    let splits=[...wf.keys()].map(w=>chars(w));const cnt=[...wf.values()];
    const merges=[],hist=[];
    const total=()=>splits.reduce((a,s,i)=>a+s.length*cnt[i],0);
    for(let step=0;step<nMerges;step++){
      const pc=new Map();
      splits.forEach((s,wi)=>{for(let i=0;i<s.length-1;i++){const k=s[i]+'\u0000'+s[i+1];pc.set(k,(pc.get(k)||0)+cnt[wi])}});
      if(!pc.size)break;
      const cand=[...pc].map(([k,c])=>{const [a,b]=k.split('\u0000');return {a,b,c,ia:id.get(a),ib:id.get(b)}});
      cand.sort((x,y)=>y.c-x.c||x.ia-y.ia||x.ib-y.ib);
      const best=cand[0];if(best.c<1)break;
      const tok=best.a+best.b;if(!id.has(tok))id.set(tok,id.size);
      splits=splits.map(s=>{const o=[];for(let i=0;i<s.length;i++){if(i<s.length-1&&s[i]===best.a&&s[i+1]===best.b){o.push(tok);i++}else o.push(s[i])}return o});
      merges.push([best.a,best.b]);
      hist.push({a:best.a,b:best.b,tok,c:best.c,top:cand.slice(0,6).map(x=>[x.a,x.b,x.c]),total:total()});
    }
    return {kind:'bpe',words:[...wf.keys()],counts:cnt,merges,hist,start:[...wf.keys()].reduce((a,w,i)=>a+chars(w).length*cnt[i],0)};
  }
  function bpeApply(word,merges,upto){let s=chars(word);const n=upto==null?merges.length:upto;
    for(let m=0;m<n;m++){const [a,b]=merges[m];if(s.length<2)break;const o=[];for(let i=0;i<s.length;i++){if(i<s.length-1&&s[i]===a&&s[i+1]===b){o.push(a+b);i++}else o.push(s[i])}s=o}return s}
  // Encoding as the library does it: repeatedly apply the lowest-ranked merge present (same result as applying merges in order)
  function bpeEncode(text,merges){const rank=new Map(merges.map(([a,b],i)=>[a+'\u0000'+b,i]));
    return pretok.byteLevel(text).map(w=>{let s=chars(w);for(;;){let bi=-1,br=Infinity;for(let i=0;i<s.length-1;i++){const r=rank.get(s[i]+'\u0000'+s[i+1]);if(r!=null&&r<br){br=r;bi=i}}
      if(bi<0)break;const [a,b]=merges[br];const o=[];for(let i=0;i<s.length;i++){if(i<s.length-1&&s[i]===a&&s[i+1]===b){o.push(a+b);i++}else o.push(s[i])}s=o}return s})}

  // ---------- WordPiece (course algorithm) ----------
  function wpTrain(lines,vocabSize){
    const wf=wordFreqs(lines,pretok.bert);
    const alphabet=[];for(const w of wf.keys()){const c0=chars(w)[0];if(!alphabet.includes(c0))alphabet.push(c0);for(const ch of chars(w).slice(1)){const t='##'+ch;if(!alphabet.includes(t))alphabet.push(t)}}
    // Python's default sort is by code point; JS default sort is by UTF-16 unit, so compare explicitly
    alphabet.sort((x,y)=>{const a=Array.from(x),b=Array.from(y);for(let i=0;i<Math.min(a.length,b.length);i++){const d=a[i].codePointAt(0)-b[i].codePointAt(0);if(d)return d}return a.length-b.length});
    const vocab=['[PAD]','[UNK]','[CLS]','[SEP]','[MASK]',...alphabet];const v0=vocab.length;
    const words=[...wf.keys()],cnt=[...wf.values()];
    let splits=words.map(w=>chars(w).map((c,i)=>i?'##'+c:c));
    const hist=[];const total=()=>splits.reduce((a,s,i)=>a+s.length*cnt[i],0);
    while(vocab.length<vocabSize){
      const lf=new Map(),pf=new Map();
      splits.forEach((s,wi)=>{const f=cnt[wi];if(s.length===1){lf.set(s[0],(lf.get(s[0])||0)+f);return}
        for(let i=0;i<s.length-1;i++){const k=s[i]+'\u0000'+s[i+1];lf.set(s[i],(lf.get(s[i])||0)+f);pf.set(k,(pf.get(k)||0)+f)}
        lf.set(s[s.length-1],(lf.get(s[s.length-1])||0)+f)});
      if(!pf.size)break;
      let best=null,max=null;const all=[];
      for(const [k,f] of pf){const [a,b]=k.split('\u0000');const sc=f/(lf.get(a)*lf.get(b));all.push({a,b,f,fa:lf.get(a),fb:lf.get(b),sc});if(max===null||max<sc){max=sc;best=all[all.length-1]}}
      const tok=best.b.startsWith('##')?best.a+best.b.slice(2):best.a+best.b;
      splits=splits.map(s=>{if(s.length===1)return s;const o=[];for(let i=0;i<s.length;i++){if(i<s.length-1&&s[i]===best.a&&s[i+1]===best.b){o.push(tok);i++}else o.push(s[i])}return o});
      vocab.push(tok);
      const top=all.slice().sort((x,y)=>y.sc-x.sc||y.f-x.f).slice(0,6);
      const byf=all.slice().sort((x,y)=>y.f-x.f)[0];
      hist.push({a:best.a,b:best.b,tok,f:best.f,fa:best.fa,fb:best.fb,sc:best.sc,top:top.map(x=>[x.a,x.b,x.f,x.fa,x.fb,x.sc]),mostFreq:[byf.a,byf.b,byf.f,byf.sc],total:total()});
    }
    return {kind:'wp',words,counts:cnt,vocab,v0,hist,start:words.reduce((a,w,i)=>a+chars(w).length*cnt[i],0)};
  }
  function wpSplitsAt(model,k){ // corpus segmentation after k merges (replay)
    let splits=model.words.map(w=>chars(w).map((c,i)=>i?'##'+c:c));
    for(let m=0;m<k;m++){const h=model.hist[m];splits=splits.map(s=>{if(s.length===1)return s;const o=[];for(let i=0;i<s.length;i++){if(i<s.length-1&&s[i]===h.a&&s[i+1]===h.b){o.push(h.tok);i++}else o.push(s[i])}return o})}
    return splits}
  function wpEncodeWord(word,vset){const toks=[];let w=word;
    while(w.length>0){const cs=Array.from(w);let i=cs.length;while(i>0&&!vset.has(cs.slice(0,i).join('')))i--;
      if(i===0)return ['[UNK]'];toks.push(cs.slice(0,i).join(''));w=cs.slice(i).join('');if(w.length>0)w='##'+w}
    return toks}
  function wpEncode(text,vocab){const vs=new Set(vocab);return pretok.bert(text).map(w=>wpEncodeWord(w,vs))}

  // ---------- Unigram (course algorithm) ----------
  function ugViterbi(word,model){ // model: Map token -> -log p ; returns [tokens, score]
    const cs=Array.from(word),n=cs.length;const best=[{start:0,score:1}];for(let i=0;i<n;i++)best.push({start:null,score:null});
    for(let s=0;s<n;s++){const bs=best[s].score;let tok='';
      for(let e=s+1;e<=n;e++){tok+=cs[e-1];if(bs!==null&&model.has(tok)){const sc=model.get(tok)+bs;if(best[e].score===null||best[e].score>sc)best[e]={start:s,score:sc}}}}
    const seg=best[n];if(seg.score===null)return [['<unk>'],null];
    const toks=[];let start=seg.start,end=n;while(start!==0){toks.unshift(cs.slice(start,end).join(''));const ns=best[start].start;end=start;start=ns}
    toks.unshift(cs.slice(start,end).join(''));return [toks,seg.score]}
  function ugTrain(lines,vocabSize,seed,pct){
    seed=seed||300;pct=pct||0.1;
    const wf=wordFreqs(lines,pretok.metaspace);const words=[...wf.keys()],cnt=[...wf.values()];
    const cf=new Map(),sf=new Map();
    words.forEach((w,wi)=>{const cs=Array.from(w),f=cnt[wi];for(let i=0;i<cs.length;i++){cf.set(cs[i],(cf.get(cs[i])||0)+f);let sub=cs[i];for(let j=i+2;j<=cs.length;j++){sub+=cs[j-1];sf.set(sub,(sf.get(sub)||0)+f)}}});
    const sorted=[...sf].sort((a,b)=>b[1]-a[1]); // stable, like Python's sorted(reverse=True) on equal keys
    let tf=new Map([...cf,...sorted.slice(0,Math.max(0,seed-cf.size))]);const tf0=new Map(tf);
    const mk=()=>{let t=0;for(const v of tf.values())t+=v;return new Map([...tf].map(([k,v])=>[k,-Math.log(v/t)]))};
    let model=mk();
    const loss=m=>{let L=0;words.forEach((w,i)=>{L+=cnt[i]*ugViterbi(w,m)[1]});return L};
    const rounds=[{vocab:[...model.keys()],loss:loss(model),removed:[]}];
    while(model.size>vocabSize){
      const L0=loss(model);const sc=[];
      for(const tok of model.keys()){if(Array.from(tok).length===1)continue;const m2=new Map(model);m2.delete(tok);sc.push([tok,loss(m2)-L0])}
      sc.sort((a,b)=>a[1]-b[1]);
      const nrem=Math.floor(model.size*pct);const removed=[];
      for(let i=0;i<nrem&&i<sc.length;i++){tf.delete(sc[i][0]);removed.push([sc[i][0],sc[i][1]])}
      if(!removed.length)break;
      model=mk();rounds.push({vocab:[...model.keys()],loss:loss(model),removed});
    }
    return {kind:'ug',words,counts:cnt,rounds,model,tf0,start:words.reduce((a,w,i)=>a+Array.from(w).length*cnt[i],0)};
  }
  function ugModelOf(vocabList,tfAll){let t=0;for(const k of vocabList)t+=tfAll.get(k);return new Map(vocabList.map(k=>[k,-Math.log(tfAll.get(k)/t)]))}
  function ugEncode(text,model){return pretok.metaspace(text).map(w=>ugViterbi(w,model)[0])}
  G.TOKALG={B2U,ALPHA,pretok,wordFreqs,bpeTrain,bpeApply,bpeEncode,wpTrain,wpSplitsAt,wpEncode,wpEncodeWord,ugTrain,ugViterbi,ugEncode,ugModelOf};
})(typeof window!=='undefined'?window:globalThis);
