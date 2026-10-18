// Shape drill tab: question generator over real configs (data: TZD.acc). window.TZDR.count(m) is checked against
// src/zero/accounting.py by src/check_data.py.
(function(){
  const D=window.TZD,$=id=>document.getElementById(id);if(!D||!$('tzd-card')||!window.RD)return;
  const esc=RD.esc,f=n=>Math.round(n).toLocaleString('en-US');
  const NAMES={'smollm2-135m':'SmolLM2-135M','qwen3-0.6b':'Qwen3-0.6B','gpt2':'GPT-2 (124M)','llama-2-7b':'Llama 2 7B','mistral-7b-v0.1':'Mistral 7B v0.1','llama-3.1-8b':'Llama 3.1 8B','qwen3-8b':'Qwen3-8B','olmo-2-7b':'OLMo 2 7B','llama-3.1-70b':'Llama 3.1 70B'};
  const M=[{key:'tiny',name:'tiny GPT (this page)',s:{D:256,L:6,H:8,Hk:8,hd:32,F:1024,V:4096,tied:true,glu:false,bias:false,pos:'learned',P:256,qk:'none',conv:false}}];
  D.acc.real.forEach(r=>{const s=Object.assign({},r.shape);s.conv=r.key==='gpt2';s.P=r.key==='gpt2'?1024:0;s.qk=s.qk_norm;M.push({key:r.key,name:NAMES[r.key]||r.key,s,py:r.total})});
  // the parameter formula, the same as accounting.py
  function count(s){
    const qk=s.qk.indexOf('per head')===0?2*s.hd:s.qk.indexOf('full')===0?(s.H+s.Hk)*s.hd:0;
    let attn,ffn,norms,fin;
    if(s.conv){attn=3*s.D*s.D+3*s.D+s.D*s.D+s.D;ffn=s.D*s.F+s.F+s.F*s.D+s.D;norms=4*s.D;fin=2*s.D}
    else{attn=s.D*s.H*s.hd+2*s.D*s.Hk*s.hd+s.H*s.hd*s.D+qk;ffn=(s.glu?3:2)*s.D*s.F;norms=2*s.D;fin=s.D}
    const block=attn+ffn+norms,emb=s.V*s.D,head=s.tied?0:s.V*s.D,pos=s.P*s.D;
    return {attn,ffn,norms,block,emb,head,pos,fin,total:s.L*block+emb+head+pos+fin,matmul:s.L*(s.D*s.H*s.hd+2*s.D*s.Hk*s.hd+s.H*s.hd*s.D+(s.glu?3:2)*s.D*s.F)+s.V*s.D};
  }
  window.TZDR={count,models:M};
  let rng=12345;const rnd=n=>{rng=(rng*1103515245+12345)%2147483648;return rng%n};
  const sh=a=>'('+a.map(f).join(', ')+')';
  function linear(s,out,inn){return s.conv?[inn,out]:[out,inn]}
  const Q=[
    {k:'w',make(m){const s=m.s,o=s.H*s.hd;const ok=linear(s,o,s.D);const nm=s.conv?'the query part of attn.c_attn':'self_attn.q_proj.weight';
      return {q:'Shape of '+nm+' in one layer?',ok:sh(s.conv?[s.D,o]:ok),bad:[sh(s.conv?[o,s.D]:[s.D,o]),sh([s.H,s.hd]),sh([s.D,s.H*s.hd*3])],
        why:(s.conv?'GPT-2’s Conv1D stores (in, out); its c_attn holds q, k and v side by side, (D, 3D) = '+sh([s.D,3*s.D])+', of which q is the first D columns.':'nn.Linear(D, H hd) stores its weight as (out, in) = (H hd, D) = ('+s.H+' x '+s.hd+', '+s.D+').')+(s.H*s.hd!==s.D?' Note H hd = '+f(s.H*s.hd)+' is not D = '+f(s.D)+': the head size is set separately in this config.':'')}}},
    {k:'w',make(m){const s=m.s;if(s.conv)return null;const o=s.Hk*s.hd;
      return {q:'Shape of self_attn.k_proj.weight in one layer?',ok:sh([o,s.D]),bad:[sh([s.H*s.hd,s.D]),sh([s.D,o]),sh([2*o,s.D])],
        why:'Keys have H<sub>kv</sub> = '+s.Hk+' heads of hd = '+s.hd+' ('+(s.Hk<s.H?'grouped-query attention: each KV head serves '+s.H/s.Hk+' query heads':'one per query head')+'), so (H<sub>kv</sub> hd, D) = '+sh([o,s.D])+'. Using H here is the classic GQA mistake.'}}},
    {k:'w',make(m){const s=m.s;const ok=s.conv?[s.F,s.D]:[s.D,s.F];const nm=s.conv?'mlp.c_proj.weight':'mlp.down_proj.weight';
      return {q:'Shape of '+nm+' (the FFN’s down projection)?',ok:sh(ok),bad:[sh(ok.slice().reverse()),sh([s.D,s.D]),sh(s.conv?[4*s.D,s.D].map((x,i)=>i?x:Math.round(8*s.D/3)):[s.D,s.glu?4*s.D:Math.round(8*s.D/3)])],
        why:'Down maps F = '+f(s.F)+' back to D = '+f(s.D)+'; '+(s.conv?'Conv1D stores (in, out) = (F, D).':'nn.Linear(F, D) stores (out, in) = (D, F).')+(s.glu?' This model uses SwiGLU, so F = '+(s.F/s.D).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')+' D, not 4D.':'')}}},
    {k:'a',make(m){const s=m.s,T=[512,1024,2048,4096][rnd(4)];
      return {q:'Shape of the attention scores (q k<sup>T</sup>) of one layer for one sequence of T = '+f(T)+' tokens (B = 1)?',ok:sh([1,s.H,T,T]),bad:[sh([1,s.Hk,T,T]),sh([1,T,T]),sh([1,s.H,T,s.hd])],
        why:'One T x T matrix per query head: (B, H, T, T). '+f(s.H*T*T)+' numbers per layer, '+((s.H*T*T*2)/2**20).toFixed(0)+' MiB in bf16, which is why fused kernels never store it.'+(s.Hk<s.H?' Keys are shared by groups, but every query head still gets its own scores.':'')}}},
    {k:'a',make(m){const s=m.s,T=[256,1024,8192][rnd(3)];
      return {q:'Shape of the logits for B = 4 sequences of T = '+f(T)+' tokens?',ok:sh([4,T,s.V]),bad:[sh([4,s.V]),sh([4,T,s.D]),sh([4*T,s.D])],
        why:'One score per vocabulary entry at every position: (B, T, V). In fp32 that is '+(4*T*s.V*4/2**30).toFixed(2)+' GiB, often the largest single activation in training; some trainers compute the loss in chunks for that reason.'}}},
    {k:'p',make(m){const s=m.s,c=count(s);
      return {q:'Parameters in one decoder layer (attention, FFN and norms)?',ok:f(c.block),bad:[f(12*s.D*s.D),f(c.block+2*s.D*(s.H-s.Hk)*s.hd),f(s.D*s.F*2+4*s.D*s.D)].filter(x=>x!==f(c.block)),
        why:'Attention '+f(c.attn)+' (q '+f(s.D*s.H*s.hd)+', k and v '+f(2*s.D*s.Hk*s.hd)+', o '+f(s.H*s.hd*s.D)+(c.attn>s.D*s.H*s.hd*2+2*s.D*s.Hk*s.hd?', biases or QK-norm gains '+f(c.attn-(2*s.D*s.H*s.hd+2*s.D*s.Hk*s.hd)):'')+') + FFN '+f(c.ffn)+' ('+(s.glu?'3':'2')+' x D x F) + norms '+f(c.norms)+' = '+f(c.block)+'.'}}},
    {k:'p',make(m){const s=m.s,c=count(s);
      return {q:'Total parameters?',ok:f(c.total),bad:[f(c.total+(s.tied?c.emb:-c.head)),f(s.L*c.block),f(12*s.L*s.D*s.D+c.emb)].filter(x=>x!==f(c.total)),
        why:'L x block = '+s.L+' x '+f(c.block)+' = '+f(s.L*c.block)+'; token table '+f(c.emb)+(s.tied?' (tied: the output layer is the same matrix)':' plus a separate output layer '+f(c.head))+(c.pos?'; positions '+f(c.pos):'')+'; final norm '+f(c.fin)+'. Total '+f(c.total)+(m.py!=null?' (accounting.py: '+f(m.py)+').':'.')}}},
    {k:'c',make(m){const s=m.s,v=2*s.L*s.Hk*s.hd*2;
      return {q:'KV cache per token, all layers, in bf16?',ok:f(v)+' bytes',bad:[f(2*s.L*s.H*s.hd*2)+' bytes',f(s.L*s.Hk*s.hd*2)+' bytes',f(2*s.L*s.D*4)+' bytes'].filter(x=>x!==f(v)+' bytes'),
        why:'2 (k and v) x L x H<sub>kv</sub> x hd x 2 bytes = 2 x '+s.L+' x '+s.Hk+' x '+s.hd+' x 2 = '+f(v)+' bytes ('+(v/1024).toFixed(1)+' KiB). At 32k tokens: '+(v*32768/2**30).toFixed(2)+' GiB per sequence.'}}},
    {k:'c',make(m){const s=m.s,c=count(s),T=[1024,4096,32768][rnd(3)],att=4*s.L*T*s.H*s.hd,v=2*c.matmul+att;
      return {q:'Forward FLOPs for the last token of a '+f(T)+'-token context (weights plus attention over the cache)?',ok:(v/1e9).toFixed(2)+' GFLOP',bad:[(2*c.total/1e9).toFixed(2)+' GFLOP',(6*c.matmul/1e9).toFixed(2)+' GFLOP',(2*c.matmul/1e9).toFixed(2)+' GFLOP'].filter(x=>x!==(v/1e9).toFixed(2)+' GFLOP'),
        why:'Weights: 2 x '+f(c.matmul)+' matmul parameters (every block matrix plus the output layer; the embedding lookup is free) = '+(2*c.matmul/1e9).toFixed(2)+' GFLOP. Attention: 2 x 2 x T x H hd per layer = '+(att/1e9).toFixed(2)+' GFLOP. 6N would be training (forward plus backward).'}}}
  ];
  $('tzd-model').innerHTML='<option value="any">any</option>'+M.map(m=>'<option value="'+m.key+'">'+esc(m.name)+'</option>').join('');
  let right=0,total=0,cur;
  function next(){
    const mk=$('tzd-model').value,kind=$('tzd-kind').value;let q=null,m,tries=0;
    while(!q&&tries++<50){m=mk==='any'?M[rnd(M.length)]:M.find(x=>x.key===mk);const pool=Q.filter(x=>kind==='all'||x.k===kind);q=pool[rnd(pool.length)].make(m)}
    if(!q)return;
    const bad=[...new Set(q.bad)].filter(b=>b!==q.ok).slice(0,3),opts=[q.ok,...bad];
    for(let i=opts.length-1;i>0;i--){const j=rnd(i+1);[opts[i],opts[j]]=[opts[j],opts[i]]}
    cur={q,done:false};const s=m.s;
    $('tzd-qt').innerHTML=esc(m.name)+': '+q.q;
    $('tzd-cfg').innerHTML='D '+f(s.D)+' · L '+s.L+' · H '+s.H+' · H<sub>kv</sub> '+s.Hk+' · hd '+s.hd+' · F '+f(s.F)+' · V '+f(s.V)+' · '+(s.tied?'tied':'untied')+' · '+(s.glu?'SwiGLU':'GELU MLP')+(s.conv?' · Conv1D (in, out)':'');
    $('tzd-opts').innerHTML=opts.map(o=>'<button data-v="'+esc(o)+'">'+esc(o)+'</button>').join('');
    $('tzd-ans').hidden=true;$('tzd-ans').innerHTML=q.why;
  }
  $('tzd-opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!cur)return;
    $('tzd-opts').querySelectorAll('button').forEach(x=>{const ok=x.textContent===cur.q.ok;x.classList.toggle('right',ok);x.classList.toggle('wrong',x===b&&!ok)});
    if(!cur.done){total++;if(b.textContent===cur.q.ok)right++;cur.done=true;$('tzd-score').textContent=right+' of '+total}
    $('tzd-ans').hidden=false});
  $('tzd-next').addEventListener('click',next);$('tzd-model').addEventListener('change',next);$('tzd-kind').addEventListener('change',next);
  $('tzd-tab').innerHTML='<thead><tr><th>Model</th><th class="num">D</th><th class="num">L</th><th class="num">H</th><th class="num">H<sub>kv</sub></th><th class="num">hd</th><th class="num">F</th><th class="num">V</th><th>Tied</th><th class="num">Parameters</th></tr></thead><tbody>'+
    M.map(m=>{const s=m.s;return '<tr><td>'+esc(m.name)+'</td><td class="num">'+f(s.D)+'</td><td class="num">'+s.L+'</td><td class="num">'+s.H+'</td><td class="num">'+s.Hk+'</td><td class="num">'+s.hd+'</td><td class="num">'+f(s.F)+'</td><td class="num">'+f(s.V)+'</td><td>'+(s.tied?'yes':'no')+'</td><td class="num">'+f(count(s).total)+'</td></tr>'}).join('')+'</tbody>';
  next();
})();
