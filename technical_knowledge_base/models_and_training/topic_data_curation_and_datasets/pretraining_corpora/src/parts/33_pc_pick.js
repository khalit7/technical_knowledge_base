// ---- What to train on: a starting mix from published recipes, with an epochs check per corpus ----
(function(){
  const C=(window.PC&&PC.corpora)||[],MX=(window.PC&&PC.mixes)||[];if(!document.getElementById('pk-mix')||!C.length)return;
  const esc=RD.esc,byId=id=>C.find(c=>c.id===id);
  // goal templates: role shares (percent of training tokens) and the published recipe each comes from
  const GOALS={
    gen:{src:'SmolLM3 stage 1 (web 85%, code 12%, maths 3%) with SmolLM2\'s 60/40 FineWeb-Edu/DCLM web split',shares:{web_edu:51,web_div:34,code:12,math:3}},
    stem:{src:'Olmo 3 7B mix (web 76%, science PDFs 14%, code 7%, maths 3%)',shares:{web_edu:38,web_div:38,papers:14,code:7,math:3}},
    code:{src:'SmolLM2\'s last stage (web 58%, Stack-Edu 24%, maths 14%, synthetic textbooks 4%: here papers)',shares:{web_edu:35,web_div:23,code:24,math:14,papers:4}},
    math:{src:'DeepSeekMath 7B (maths corpus 56% + AlgebraicStack 4%, arXiv 10%, code 20%, general text 10%; continued from a code model)',shares:{math:60,papers:10,code:20,web_edu:10}},
    multi:{src:'Apertus stage 1 pools (FineWeb-Edu 56%, FineWeb-2 41%, code and maths 3%)',shares:{web_edu:56,multi:41,code:2,math:1}}
  };
  const ROLE={web_edu:'educational web',web_div:'diverse web',code:'code',math:'maths',papers:'papers and PDFs',multi:'other languages'};
  // candidates per role, smallest and highest-quality first; size in billions of tokens as published (fw_edu2 and cp are derived entries)
  const X={fw_edu2:{name:'FineWeb-Edu-score-2',size:5400,tok:'GPT-2',lic:'odc-by',lic_cls:'open',gated:'no',note:'the same classifier at threshold 2 (FineWeb-Edu card)'},
           cp:{name:'Common Pile v0.1 (Comma training set)',size:463.6,tok:'Comma tokenizer: 463.6B tokens in the main stage, 1,034.4B with its repeats (Comma v0.1 training dataset card)',lic:'per document (open licences)',lic_cls:'open',gated:'no'}};
  const CAND={web_edu:['fineweb_edu','fw_edu2','fineweb'],web_div:['dclm','nemotron_cc','nemotron_cc2','fineweb'],code:['stackedu','stack2'],math:['finemath','megamath','nccmath'],papers:['finepdfs','pes2o'],multi:['fineweb2']};
  const info=id=>{if(X[id])return Object.assign({id},X[id]);const c=byId(id);return c&&{id,name:c.name.replace(/ \(.*\)$/,''),size:c.id==='fineweb2'?3000:c.id==='finepdfs'?2919:c.tokens_b,tok:c.id==='fineweb2'?'words, not tokens (so epochs here are an underestimate)':c.tok,lic:c.lic,lic_cls:c.lic_cls,gated:c.gated}};
  const ok=(i,lic)=>i&&i.size&&(lic==='any'||i.lic_cls!=='res');
  const tokOf=v=>Math.pow(10,1+v*(Math.log10(20000)-1)/40);
  const f=b=>b>=1000?(b/1000).toFixed(b>=10000?1:2)+'T':b>=10?Math.round(b)+'B':b.toFixed(1)+'B';
  const $=id=>document.getElementById(id);
  function plan(){
    const P=+$('pk-size').value,T=tokOf(+$('pk-tok').value),goal=$('pk-goal').value,lic=$('pk-lic').value;
    $('pk-tokv').textContent=f(T)+' tokens';
    const rows=[],dropped=new Set();
    if(lic==='open'){const i=info('cp');rows.push({i,role:'everything',share:100,draw:T,ep:T/i.size})}
    else{
      const G=GOALS[goal];
      Object.entries(G.shares).forEach(([role,sh])=>{let need=T*sh/100;const cs=CAND[role].map(info).filter(Boolean);
        const allowed=cs.filter(i=>{const y=ok(i,lic);if(!y)dropped.add(i.name);return y});
        allowed.forEach((i,k)=>{if(need<=0)return;const last=k===allowed.length-1,take=last?need:Math.min(need,4*i.size);rows.push({i,role:ROLE[role],share:100*take/T,draw:take,ep:take/i.size});need-=take})});
    }
    const maxEp=Math.max(...rows.map(r=>r.ep)),chin=20*P*1e9/1e9;
    $('pk-stats').innerHTML=RD.stat('Chinchilla-optimal tokens',f(chin),'20 tokens per parameter')+RD.stat('Your budget',f(T),(T/chin).toFixed(T/chin<10?1:0)+'× Chinchilla')+RD.stat('Most-repeated corpus',maxEp.toFixed(maxEp<10?2:1)+' epochs',maxEp>4?'<span class="pk-warn">over 4: repeated tokens lose value</span>':'within the 4-epoch range');
    $('pk-mix').innerHTML='<table><thead><tr><th>Corpus</th><th>Role</th><th class="num">Share</th><th class="num">Tokens drawn</th><th class="num">Published size</th><th class="num">Epochs</th><th>Licence field</th><th>Access</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+esc(r.i.name)+'</td><td>'+esc(r.role)+'</td><td class="num">'+r.share.toFixed(1)+'%</td><td class="num">'+f(r.draw)+'</td><td class="num" title="'+esc(r.i.tok||'')+'">'+f(r.i.size)+'</td><td class="num"><span class="pk-ep'+(r.ep>4?' pk-warn':'')+'">'+r.ep.toFixed(r.ep<10?2:1)+'</span></td><td><span class="pc-lic '+(r.i.lic_cls==='open'?'open':r.i.lic_cls==='res'?'res':'mid')+'">'+esc(String(r.i.lic).split(' (')[0])+'</span></td><td class="small">'+esc(r.i.gated)+'</td></tr>').join('')+'</tbody></table>';
    const G=GOALS[goal];
    $('pk-why').innerHTML=(lic==='open'?'Openly licensed only: the one corpus built for this is Common Pile v0.1 (Comma v0.1 trained 1T and 2T tokens on it by repeating sources up to 6 times and more). It is about 15B tokens of web text; expect weaker results on web-knowledge tasks (Reading section 7).':'Shares from: '+esc(G.src)+'.')+
      (dropped.size?' Excluded by your licence choice: '+[...dropped].map(esc).join(', ')+'.':'')+
      (maxEp>4?' <span class="pk-warn">Some corpus is drawn more than 4 times:</span> raise its share elsewhere, accept the repetition knowingly, or pick a larger corpus.':'');
    // nearest published recipe
    const d=m=>Math.abs(Math.log10(m.params_b/P))+Math.abs(Math.log10(m.tokens_t*1000/T));
    const near=MX.slice().sort((a,b)=>d(a)-d(b))[0];
    if(near)$('pk-near').innerHTML='<b>'+esc(near.model)+'</b> <span class="mute small">('+esc(near.org)+', '+near.year+'; '+near.params_b+'B parameters, '+near.tokens_t+'T tokens'+(near.open_data?'':'; data not released')+')</span><div class="bars" style="margin-top:6px">'+near.mix.map(([n,s])=>'<div class="row"><span class="nm" title="'+esc(n)+'">'+esc(n)+'</span><span class="track"><span class="fill" style="width:'+s+'%;background:var(--c3)"></span></span><span class="val">'+s+'%</span></div>').join('')+'</div><p class="small">'+esc(near.note)+'. <a href="'+esc(near.src)+'" target="_blank" rel="noopener noreferrer">Source</a>.</p><p class="small mute">All published mixes: '+MX.map(m=>esc(m.model)+' ('+m.tokens_t+'T)').join(', ')+'.</p>';
  }
  ['pk-size','pk-goal','pk-lic'].forEach(id=>$(id).addEventListener('change',plan));$('pk-tok').addEventListener('input',plan);
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-pcpick']=window.TAB_RENDER['t-pcpick']||[]).push(plan);
  plan();
})();
