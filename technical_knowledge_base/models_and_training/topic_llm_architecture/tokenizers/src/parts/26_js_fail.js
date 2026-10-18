// ---- Reading: failure-mode gallery on real tokenizers, and the six-language premium bars ----
(function(){
  const {pieces,chips,esc,TK,SHORT,LAB,fmt}=TKV,F=TD.fail;
  const L=(t,u)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const CASES=[
    {k:'letters',n:'Letters inside a word',t:['strawberry'],note:'"How many r are in strawberry?" Nine of the ten tokenizers here hand the model <code>␣strawberry</code> as a single id; only Llama 2\'s 32K vocabulary splits it (<code>st|raw|berry</code>). The letters are never in the input, so counting them, spelling a word backwards or rhyming has to be learned from indirect evidence. Byte-level models such as ByT5 see every letter and do better on "tasks that are sensitive to spelling and pronunciation" ('+L('ByT5','https://arxiv.org/abs/2105.13626')+').'},
    {k:'num',n:'Digits',t:['num','year'],note:'GPT-2 merges digit runs by frequency, so the same number is cut differently in different places; GPT-4, GPT-4o, Llama 3 and 4 and DeepSeek cut into threes from the <b>left</b>, so the groups do not line up with place value; LLaMA 2, Gemma and Qwen give every digit its own token. Order matters: with GPT-3.5, "right-to-left tokenization (enforced by comma separating numbers at inference time) leads to largely improved performance" on addition: 95.6% against 68.5% one-shot, and "L2R tokenization destroys model performance, dropping to 8.25%" when the answer is longer than the addends ('+L('Singh and Strouse 2024','https://arxiv.org/abs/2402.14903')+'). Commas in "1,299" and "13,999" force right-aligned groups of three; without them GPT-4\'s tokenizer cuts even the year 2024 into <code>202|4</code>.'},
    {k:'space',n:'Trailing whitespace',t:['space_a','space_b','space_c'],note:'In byte-level vocabularies the space belongs to the start of the next word: <code>␣Paris</code> is one token (id 12650 in o200k). A prompt that ends with a space (id 220) forces the model to continue after a lone-space token, a boundary it rarely saw in training, so it tends to produce something odd. "Ending a prompt with any of these can lead to wrong token boundaries, and break things" ('+L('Guidance, token healing','https://github.com/guidance-ai/guidance/blob/0.0.64/notebooks/art_of_prompt_design/prompt_boundaries_and_token_healing.ipynb')+'); the fix there is to back up one token and constrain the next one to start with the removed text. It is why some playgrounds warn about a trailing space ('+L('Karpathy, minbpe notes','https://github.com/karpathy/minbpe/blob/master/lecture.md')+').'},
    {k:'glitch',n:'Glitch tokens',t:['magikarp','petertodd'],note:'<code>␣SolidGoldMagikarp</code> is a single token in GPT-2 and GPT-3\'s vocabulary (id 43453; <code>␣petertodd</code> is 37444). The vocabulary was built from web text that included Reddit usernames from r/counting, while the model\'s training text was more heavily curated, so these ids almost never appeared in training and were left barely trained: the authors found them as the tokens closest to the centroid of all token embeddings. GPT-3 was "largely incapable of repeating these anomalous tokens" ('+L('Rumbelow and Watkins 2023','https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation')+'; the r/counting origin was found by commenters). Later vocabularies split both strings into ordinary pieces, but every vocabulary has under-trained entries: Land and Bartolo find them in many open models from the unembedding matrix and verify them with prompts ('+L('Fishing for Magikarp','https://arxiv.org/abs/2405.05417')+', '+L('code','https://github.com/cohere-ai/magikarp')+').'},
    {k:'chat',n:'Template markers as text',t:['chat'],note:'Unless a marker is registered as a special token, it is ordinary text. <code>&lt;|user|&gt;</code> costs five tokens in eight of these tokenizers. The @@ALIGN@@ page shows a full Tulu 3 conversation token by token and which tokens carry the loss.'}
  ];
  CASES[4].note=CASES[4].note.replace('@@ALIGN@@','<a href="https://app.notion.com/p/3c65c17b0d0d81d5bed7e608d4061c7a" target="_blank" rel="noopener noreferrer">Alignment</a>');
  let cur='letters';
  const cb=document.getElementById('failCase');
  cb.innerHTML=CASES.map(c=>'<button data-k="'+c.k+'"'+(c.k===cur?' class="on"':'')+'>'+c.n+'</button>').join('');
  cb.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.k;cb.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  function draw(){const c=CASES.find(x=>x.k===cur);let h='';
    c.t.forEach(key=>{const f=F[key];h+='<div class="panelt">Text: <code>'+esc(f.text).replace(/ $/,'<span class="ws">␣</span>')+'</code></div>';
      TK.forEach(k=>{const p=pieces(f.text,f.t[k]);const showIds=(key==='magikarp'||key==='petertodd')&&k==='gpt2'||(key.startsWith('space')&&k==='o200k');
        h+='<div class="trow"><div class="nm">'+SHORT[k]+'</div><div>'+chips(p)+(showIds?'<span class="small mute">ids '+f.ids[k].join(', ')+'</span>':'')+'</div><div class="n">'+p.length+'</div></div>'})});
    document.getElementById('failRows').innerHTML=h;document.getElementById('failText').innerHTML='';
    document.getElementById('failNote').innerHTML=c.note}
  draw();

  // six languages, five tokenizers: premium over the whole FLORES-200 dev + devtest
  const FL=TD.fl,ix=Object.fromEntries(TK.map((k,i)=>[k,4+i])),row=Object.fromEntries(FL.map(r=>[r[0],r])),eng=row.eng_Latn;
  const LS=[['fra_Latn','French'],['rus_Cyrl','Russian'],['zho_Hans','Chinese (Simplified)'],['hin_Deva','Hindi'],['tam_Taml','Tamil'],['mya_Mymr','Burmese']];
  const KS=[['gpt2','GPT-2 (2019)','var(--dim)'],['cl100k','GPT-4 (2023)','var(--c2)'],['o200k','GPT-4o (2024)','var(--c1)'],['gemma3','Gemma 3 (2025)','var(--c3)'],['qwen35','Qwen3.5 (2026)','var(--c4)']];
  const prem=(c,k)=>row[c][ix[k]]/eng[ix[k]];
  const max=Math.max(...LS.flatMap(([c])=>KS.map(([k])=>prem(c,k))));
  let h='<div class="hmleg">'+KS.map(([k,n,col])=>'<span><i style="display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:4px;background:'+col+'"></i>'+n+'</span>').join('')+'</div><div class="bars">';
  LS.forEach(([c,n])=>{h+='<div class="band" style="text-transform:none;font-size:12.5px">'+n+'</div>';
    KS.forEach(([k,kn,col])=>{const p=prem(c,k);h+='<div class="row"><span class="nm">'+kn+'</span><span class="track"><span class="fill" style="width:'+(100*p/max).toFixed(1)+'%;background:'+col+'"></span></span><span class="val">'+p.toFixed(2)+'×</span></div>'})});
  document.getElementById('taxBars').innerHTML=h+'</div><p class="small mute">Premium = tokens for the language ÷ tokens for English over the same 2,009 translated sentences, per tokenizer (1.00× is parity with English).</p>';
})();
