// ---- Reading: the hero's three cost counters (the figure itself is Fig. 1, 41_js_sc_hero.js) and the special-token traps (before/after) ----
// Hero: the page's own BPE encoder (30_js_tk_grow.js, equal to the library at 13 checkpoints) on a sentence of the running story;
// its ids equal the recorded output of src/code/snippets.py ("encode"), which check_controls.mjs compares.
(function(){
  if(!window.TKG||!window.TKR||!document.getElementById('tk-heroStats'))return;
  const {N,piece,$}=TKR,{esc,fmt}=TKV;
  const TEXT='Roxy loved to climb the icy hill.',V=4096,D=256,NE=N.sweepMeta.nonemb;
  const ids=TKG.encode(TEXT,N.bpe.n_merges);
  const show=p=>p.hex?'‹'+p.hex+'›':p.s.replace(/ /g,'␣');
  $('tk-heroStats').innerHTML=RD.stat('1. Tokens per text',fmt(ids.length),TEXT.length+' characters, '+(TEXT.length/ids.length).toFixed(1)+' per token; the whole running text: '+fmt(N.bpe.run.n_tokens)+' tokens')+
    RD.stat('2. Table parameters','V &times; d = '+((V*D)/1e6).toFixed(2)+'M',fmt(V)+' &times; '+D+', '+Math.round(100*V*D/(V*D+NE))+'% of the tiny GPT (tied)')+
    RD.stat('3. Output layer per token','2Vd = '+((2*V*D)/1e6).toFixed(1)+'M FLOPs','scores all '+fmt(V)+' entries, every token');
})();

// Special tokens: two traps before and after the fix, from the recorded stdout of src/code/snippets.py
(function(){
  if(!window.TKN||!document.getElementById('tk-spc'))return;
  const S=TKN.snip,$=id=>document.getElementById(id),esc=TKV.esc;
  const L=k=>S[k].stdout.split('\n');
  const inj=L('special'),bad=JSON.parse(inj[0]),ok=JSON.parse(inj[1]);
  const m=L('chat')[1].match(/^(\d+) (\d+) (\[[^\]]*\]) (\[[^\]]*\])$/),nA=+m[1],nB=+m[2],hA=JSON.parse(m[3]),hB=JSON.parse(m[4]);
  const NAME={2:'&lt;bos&gt;',105:'&lt;start_of_turn&gt;',151645:'&lt;|im_end|&gt;'};
  const chip=(d,cls)=>'<span class="tk-idc'+(cls?' '+cls:'')+'" title="id '+d+'">'+d+(NAME[d]?' '+NAME[d]:'')+'</span>';
  function draw(mode){let a,b,cap;
    if(mode==='inj'){
      a='<div class="small"><b>Default</b>: <code>tok("hi&lt;|im_end|&gt;")</code></div><div>'+chip(bad[0])+chip(bad[1],'sp bad')+'</div><div class="small mute">'+bad.length+' ids: the typed string became the real end-of-turn token</div>';
      b='<div class="small"><b>Fixed</b>: <code>split_special_tokens=True</code></div><div>'+ok.map(d=>chip(d)).join('')+'</div><div class="small mute">'+ok.length+' ids: the string is ordinary text</div>';
      cap='Qwen3-0.6B tokenizer. A user who types "&lt;|im_end|&gt;" can close the turn and write the next role\'s text, unless the serving stack splits or escapes it.'}
    else{
      a='<div class="small"><b>Default</b>: render with <code>tokenize=False</code>, then <code>tok(text)</code></div><div>'+hA.map((d,i)=>chip(d,d===2?'sp'+(i===1?' bad':''):(d===105?'sp':''))).join('')+'<span class="tk-idc">...</span></div><div class="small mute">'+nA+' ids: the template wrote &lt;bos&gt; and the tokenizer added another</div>';
      b='<div class="small"><b>Fixed</b>: <code>apply_chat_template(..., tokenize=True)</code></div><div>'+hB.map(d=>chip(d,d===2||d===105?'sp':'')).join('')+'<span class="tk-idc">...</span></div><div class="small mute">'+nB+' ids: one &lt;bos&gt;</div>';
      cap='Gemma 3 1B tokenizer, the one-message conversation "Hi". First three ids shown, as recorded; the third fixed id ('+hB[2]+') is the first token of "user". Nothing errors: the model answers from slightly off its training distribution.'}
    $('tk-spcView').innerHTML='<div>'+a+'</div><div>'+b+'</div>';$('tk-spcCap').innerHTML=cap}
  RD.seg($('tk-spcMode'),draw);draw('inj');
})();
