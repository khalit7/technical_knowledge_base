// ---- Reading tab (new parts): running example stats, pipeline animation, quoted code, merges, sweep table, calculator table, 2026 table, digit chunks, code ----
window.TKR=(function(){
  if(!window.TKN||!window.TKV)return null;
  const N=window.TKN,{esc,fmt,chips}=TKV,$=id=>document.getElementById(id);
  const td=new TextDecoder('utf-8',{fatal:true});
  // one id of the running example's tokenizer as a chip piece
  function piece(id){if(id===0)return {s:'<|endoftext|>'};const h=N.bpe.hex[id];const b=new Uint8Array(h.match(/../g).map(x=>parseInt(x,16)));
    try{return {s:td.decode(b)}}catch(e){return {hex:h.match(/../g).join(' ')}}}
  const pct=(x,d)=>(100*x).toFixed(d==null?1:d)+'%';
  const M=x=>x>=1e9?(x/1e9).toFixed(x>=1e11?0:2)+'B':(x/1e6).toFixed(2)+'M';
  return {N,piece,pct,M,$};
})();
(function(){
  if(!window.TKR)return;
  const {N,piece,pct,M,$}=TKR,{esc,fmt,chips,strChips}=TKV;
  // quoted source and code that ran
  const Q=N.quotes,q=(id,k)=>{const e=$(id),s=$(id+'Src');if(!e||!Q[k])return;e.textContent=Q[k].text;if(s)s.textContent=Q[k].file+', lines '+Q[k].line+' to '+Q[k].last+' (located by pattern in src/code/quotes.py)'};
  q('tk-qTie','tie');q('tk-qOrder','bpe_order');q('tk-qLoop','bpe_loop');q('tk-qApply','bpe_apply');q('tk-qRegex','byte_regex');q('tk-qPad','pad_vocab');
  const sn=(id,k)=>{const c=$(id),o=$(id+'Out');if(!c||!N.snip[k])return;c.textContent=N.snip[k].code;if(o)o.textContent=N.snip[k].stdout};
  sn('tk-snEncode','encode');sn('tk-snSpecial','special');sn('tk-snChat','chat');
  if($('tk-snTrain')){const r=N.sweep.find(x=>x.V_target===4096);
    $('tk-snTrain').textContent='tok = Tokenizer(models.BPE())\ntok.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)\ntok.decoder = decoders.ByteLevel()\ntr = trainers.BpeTrainer(vocab_size=V, special_tokens=["<|endoftext|>"], min_frequency=2,\n                         initial_alphabet=pre_tokenizers.ByteLevel.alphabet(), show_progress=False)\ntok.train_from_iterator(train, trainer=tr)   # 529,875 TinyStories stories\ntok.save(path)';
    $('tk-snTrainOut').textContent='# recorded in src/out/bpe_sweep.json for V = 4096 (Apple M1 Pro, 4 threads)\nV '+r.V+', merges '+r.merges+', train_seconds '+r.train_seconds+', val_chars_per_token '+r.val_chars_per_token+',\nsame_as_committed '+(r.same_as_committed?'True':'False')+'   # sha256 of the saved file equals the committed tokenizer.json'}
  // stats in one screen
  if($('tk-overStats')){const r=N.bpe.run,s4=N.sweep.find(x=>x.V_target===4096);
    $('tk-overStats').innerHTML=[RD.stat('Vocabulary',fmt(4096),'1 special + 256 bytes + '+fmt(N.bpe.n_merges)+' merges'),
      RD.stat('Characters per token',s4.val_chars_per_token.toFixed(2),'TinyStories validation, '+fmt(N.sweepMeta.val_chars/1e6,1)+'M characters'),
      RD.stat('Running text',fmt(r.n_tokens)+' tokens',fmt(r.chars)+' characters, '+(r.chars/r.n_tokens).toFixed(2)+' per token'),
      RD.stat('Embedding table','1.05M','of 5.84M parameters (tied)'),
      RD.stat('Never seen in training',fmt(N.freq.n_zero)+' entries','of 4,096, measured on 122M tokens')].join('')}
  // first merges
  if($('tk-mergeList')){const sp=s=>esc(s).replace(/ /g,'␣');
    $('tk-mergeList').innerHTML='<div class="tks">'+N.bpe.first.map(m=>'<span class="tk a" title="merge '+m.rank+': '+esc(m.a)+' + '+esc(m.b)+'"><span class="ws">'+m.rank+'</span> '+sp(m.new)+'</span>').join('')+'</div>'}
  // sweep table
  if($('tk-sweepTab')){const NE=N.sweepMeta.nonemb,fl=r=>r.val_tokens*2*(NE+256*r.V);const mn=Math.min(...N.sweep.map(fl));
    let h='<table class="wide"><thead><tr><th class="num">Target V</th><th class="num">Entries</th><th class="num">Merges</th><th class="num">Characters per token</th><th class="num">Running text, tokens</th><th class="num">Embedding share of the tiny GPT</th><th class="num">FLOPs per validation pass</th></tr></thead><tbody>';
    N.sweep.forEach(r=>{const f=fl(r);h+='<tr'+(r.V_target===4096?' class="on"':'')+'><td class="num">'+fmt(r.V_target)+'</td><td class="num">'+fmt(r.V)+'</td><td class="num">'+fmt(r.merges)+'</td><td class="num">'+r.val_chars_per_token.toFixed(3)+'</td><td class="num">'+r.running_tokens+'</td><td class="num">'+pct(r.emb_share)+'</td><td class="num">'+(f/1e12).toFixed(1)+' T'+(f===mn?' (lowest)':'')+'</td></tr>'});
    $('tk-sweepTab').innerHTML=h+'</tbody></table>'}
  // calculator table
  if($('tk-vocCalcTab')){const keys=['gpt2','smollm2-135m','qwen3-0.6b','gemma-3-1b','llama-3.1-8b','qwen3-8b','llama-3.1-405b','qwen3-30b-a3b','gpt-oss-20b','gpt-oss-120b','llama-4-maverick','deepseek-v3','kimi-k2'];
    let h='<table class="wide"><thead><tr><th>Model</th><th class="num">V</th><th class="num">d</th><th>Tied</th><th class="num">Tables</th><th class="num">Share of total</th><th class="num">Share of active</th><th class="num">Output layer, share of decode FLOPs</th></tr></thead><tbody>';
    keys.forEach(k=>{const r=N.calc.find(x=>x.key===k);if(!r)return;h+='<tr><td>'+esc(k)+'</td><td class="num">'+fmt(r.V)+'</td><td class="num">'+fmt(r.d)+'</td><td>'+(r.tied?'yes':'no')+'</td><td class="num">'+M(r.embedding+r.unembedding)+'</td><td class="num">'+pct(r.share_total)+'</td><td class="num">'+pct(r.share_active)+'</td><td class="num">'+pct(r.head_flops_per_token/r.decode_flops_1)+'</td></tr>'});
    $('tk-vocCalcTab').innerHTML=h+'</tbody></table>'}
  // 2026 table
  if($('tk-nowTab')){const R=N.t26.rows,by=Object.fromEntries(R.map(r=>[r.key,r])),k=N.t26.kimi;
    const kind=r=>(r.bytelevel?'BPE, bytes':'BPE, byte fallback')+(r.nfc?', NFC':'');
    let h='<table class="wide"><thead><tr><th>Tokenizer</th><th>Kind</th><th class="num">Entries</th><th class="num">Config vocab_size</th><th>12345678</th><th class="num">Shared with predecessor</th><th>Repository created</th></tr></thead><tbody>';
    R.forEach(r=>{const p=r.pred?by[r.pred]:null;
      h+='<tr><td><b>'+esc(r.label)+'</b><br><span class="small mute">'+esc(r.repo)+'</span></td><td>'+kind(r)+'</td><td class="num">'+fmt(r.entries)+'</td><td class="num">'+(r.cfgV?fmt(r.cfgV):'')+'</td><td><code>'+r.probe_digits.map(esc).join('|')+'</code></td><td class="num">'+(p?fmt(r.shared_with_pred)+' of '+fmt(r.pred_size)+'<br><span class="small mute">vs '+esc(p.label)+'</span>':'')+'</td><td>'+(r.created||'')+'</td></tr>'});
    h+='<tr><td><b>Kimi K3</b><br><span class="small mute">moonshotai/Kimi-K3</span></td><td>BPE, bytes (tiktoken file)</td><td class="num">'+fmt(k.entries)+'</td><td class="num">'+fmt(k.cfgV)+'</td><td><code>'+k.pre_digits.map(esc).join('|')+'</code> (pre-tokens)</td><td></td><td>'+k.created+'</td></tr>';
    $('tk-nowTab').innerHTML=h+'</tbody></table>'}
  // digit chunks under three rules
  if($('tk-chView')){
    const l2r=s=>{const o=[];for(let i=0;i<s.length;i+=3)o.push(s.slice(i,i+3));return o};
    const r2l=s=>{const o=[];let i=s.length;while(i>0){o.unshift(s.slice(Math.max(0,i-3),i));i-=3}return o};
    const one=s=>s.split('');
    const box=(parts,sep)=>'<span class="tk-chn">'+parts.map((p,i)=>'<span class="tk-chk '+(i%2?'b':'a')+'">'+p+'</span>'+(sep&&i<parts.length-1?'<span class="tk-chs">,</span>':'')).join('')+'</span>';
    function draw(){let a=($('tk-chA').value||'').replace(/\D/g,'').slice(0,12)||'0',b=($('tk-chB').value||'').replace(/\D/g,'').slice(0,12)||'0';
      a=String(BigInt(a));b=String(BigInt(b));const c=String(BigInt(a)+BigInt(b));
      const rules=[['Groups of 3 from the left (Llama 3, GPT-4, OLMo 2, DeepSeek)',l2r,false],['Commas: groups of 3 from the right',r2l,true],['Single digits (Qwen, Gemma, Nemotron 3)',one,false]];
      let h='';rules.forEach(([t,f,s])=>{h+='<div class="tk-chr"><div class="small"><b>'+t+'</b></div><div class="tk-chg">'+[a,b,c].map((x,i)=>'<div>'+(i===1?'+ ':i===2?'= ':'')+box(f(x),s)+'</div>').join('')+'</div></div>'});
      $('tk-chView').innerHTML=h+'<p class="small mute">Pieces computed in the page from the rule, as the real tokenizers cut them (checked on 12345678 against each tokenizer file). Read the units column: under the first rule its digit is the last digit of a 1, 2 or 3-digit token that changes from number to number.</p>'}
    $('tk-chA').addEventListener('input',draw);$('tk-chB').addEventListener('input',draw);draw()}
  // code through four tokenizers
  if($('tk-codeRows')){const C=N.compare.code,lab={ours:'Running example (4,096)',gpt2:'GPT-2 (50,257)',llama3:'Llama 3 (128,256)',gemma3:'Gemma 3 (262,144)'};
    $('tk-codeRows').innerHTML=Object.keys(lab).map(k=>'<div class="trow"><div class="nm">'+lab[k]+'</div><div>'+strChips(C[k+'_pieces'])+'</div><div class="n">'+C[k]+'</div></div>').join('')}
})();
