// Shapes and counts tab (rebuilt 2026-10-23 from the Shape drill): every stored weight of one layer, every activation shape,
// the parameter totals against the Hub and per-token FLOPs, for ten configs (data: TZD.acc). window.TZDR.count(m) is checked
// against src/zero/accounting.py by src/check_data.py.
(function(){
  const D=window.TZD,$=id=>document.getElementById(id);if(!D||!$('tzd-model')||!window.RD)return;
  const esc=RD.esc,f=n=>Math.round(n).toLocaleString('en-US');
  const NAMES={'smollm2-135m':'SmolLM2-135M','qwen3-0.6b':'Qwen3-0.6B','gpt2':'GPT-2 (124M)','llama-2-7b':'Llama 2 7B','mistral-7b-v0.1':'Mistral 7B v0.1','llama-3.1-8b':'Llama 3.1 8B','qwen3-8b':'Qwen3-8B','olmo-2-7b':'OLMo 2 7B','llama-3.1-70b':'Llama 3.1 70B'};
  const M=[{key:'tiny',name:'tiny GPT (this page)',s:{D:256,L:6,H:8,Hk:8,hd:32,F:1024,V:4096,tied:true,glu:false,bias:false,pos:'learned',P:256,qk:'none',conv:false}}];
  D.acc.real.forEach(r=>{const s=Object.assign({},r.shape);s.conv=r.key==='gpt2';s.P=r.key==='gpt2'?1024:0;s.qk=s.qk_norm;M.push({key:r.key,name:NAMES[r.key]||r.key,s,py:r.total,hub:r.hub})});
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
  const fl3=v=>v>=1e9?(v/1e9).toFixed(2)+' G':(v/1e6).toFixed(1)+' M';
  const sh=a=>'('+a.map(f).join(', ')+')';
  const by=b=>b>=2**30?(b/2**30).toFixed(2)+' GiB':b>=2**20?(b/2**20).toFixed(1)+' MiB':b>=1024?(b/1024).toFixed(1)+' KiB':f(b)+' B';
  // the stored tensors of one layer, by the names the checkpoints use (nn.Linear stores (out, in); GPT-2's Conv1D stores (in, out))
  function weights(m){
    const s=m.s,q=s.H*s.hd,kv=s.Hk*s.hd,W=[];
    const w=(n,shape,note)=>W.push([n,shape,note||'']);
    if(m.key==='tiny'){
      w('att.q.weight',[s.D,s.D],'(out, in): x Wᵀ');w('att.k.weight',[s.D,s.D]);w('att.v.weight',[s.D,s.D]);w('att.o.weight',[s.D,s.D],'writes into the stream');
      w('ffn.up.weight',[s.F,s.D],'F = 4D');w('ffn.down.weight',[s.D,s.F],'writes into the stream');w('n1.weight',[s.D],'LayerNorm gain, no bias');w('n2.weight',[s.D])}
    else if(s.conv){
      w('attn.c_attn.weight',[s.D,3*s.D],'Conv1D (in, out): q, k, v side by side');w('attn.c_attn.bias',[3*s.D]);w('attn.c_proj.weight',[s.D,s.D]);w('attn.c_proj.bias',[s.D]);
      w('mlp.c_fc.weight',[s.D,s.F],'F = 4D');w('mlp.c_fc.bias',[s.F]);w('mlp.c_proj.weight',[s.F,s.D]);w('mlp.c_proj.bias',[s.D]);
      w('ln_1.weight and .bias',[2,s.D],'LayerNorm gain and bias');w('ln_2.weight and .bias',[2,s.D])}
    else{
      w('self_attn.q_proj.weight',[q,s.D],q!==s.D?'H hd = '+f(q)+' is not D':'');w('self_attn.k_proj.weight',[kv,s.D],s.Hk<s.H?'GQA: '+s.Hk+' KV heads for '+s.H+' query heads':'one KV head per query head');
      w('self_attn.v_proj.weight',[kv,s.D]);w('self_attn.o_proj.weight',[s.D,q],'writes into the stream');
      if(s.qk.indexOf('per head')===0){w('self_attn.q_norm.weight',[s.hd],'QK-norm, shared by the heads');w('self_attn.k_norm.weight',[s.hd])}
      if(s.qk.indexOf('full')===0){w('self_attn.q_norm.weight',[q],'QK-norm over the full width');w('self_attn.k_norm.weight',[kv])}
      w('mlp.gate_proj.weight',[s.F,s.D],'SwiGLU, F = '+(s.F/s.D).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')+' D');w('mlp.up_proj.weight',[s.F,s.D]);w('mlp.down_proj.weight',[s.D,s.F],'writes into the stream');
      if(m.key==='olmo-2-7b'){w('post_attention_layernorm.weight',[s.D],'OLMo 2 normalises sublayer outputs');w('post_feedforward_layernorm.weight',[s.D])}
      else{w('input_layernorm.weight',[s.D],'RMSNorm gain');w('post_attention_layernorm.weight',[s.D])}}
    return W.map(([n,shp,note])=>({n,shp,note,c:shp.reduce((a,b)=>a*b,1)}));
  }
  function render(){
    const mk=$('tzd-model').value,m=M.find(x=>x.key===mk)||M[0],s=m.s,c=count(s),T=+$('tzd-T').value||256;
    const W=weights(m),sum=W.reduce((a,x)=>a+x.c,0),kvb=2*s.L*s.Hk*s.hd*2,att=4*s.L*T*s.H*s.hd,fl=2*c.matmul+att;
    $('tzd-cfg').innerHTML='D '+f(s.D)+' &middot; L '+s.L+' &middot; H '+s.H+' &middot; H<sub>kv</sub> '+s.Hk+' &middot; hd '+s.hd+' &middot; F '+f(s.F)+' &middot; V '+f(s.V)+' &middot; '+(s.tied?'tied':'untied')+' &middot; '+(s.glu?'SwiGLU':'GELU MLP')+' &middot; '+esc(s.pos)+' positions';
    const hub=m.key==='tiny'?null:m.hub;
    $('tzd-out').innerHTML=RD.stat('Parameters (formula)',f(c.total),hub==null?'equals the code: 5,836,032':'Hub safetensors '+f(hub)+(hub!==c.total?' (stored non-parameters: section 10)':', exact'))+
      RD.stat('One layer',f(c.block),'attention '+f(c.attn)+' + FFN '+f(c.ffn)+' + norms '+f(c.norms))+
      RD.stat('KV cache per token (bf16)',by(kvb),'2 x L x H<sub>kv</sub> x hd x 2 bytes')+
      RD.stat('Forward FLOPs, one token at T = '+f(T),fl3(fl),'weights '+fl3(2*c.matmul)+' + attention '+fl3(att));
    $('tzd-w').innerHTML='<thead><tr><th>Stored tensor (one layer)</th><th>Shape as stored</th><th class="num">Parameters</th><th>Note</th></tr></thead><tbody>'+
      W.map(x=>'<tr><td><code>'+esc(x.n)+'</code></td><td>'+sh(x.shp)+'</td><td class="num">'+f(x.c)+'</td><td>'+esc(x.note)+'</td></tr>').join('')+
      '<tr><td><b>Sum</b></td><td></td><td class="num"><b>'+f(sum)+'</b></td><td>'+(sum===c.block?'equals the formula':'differs from the formula '+f(c.block))+'</td></tr></tbody>';
    const glu=s.glu,A=[['x, the stream',[1,T,s.D]],['q after view and transpose',[1,s.H,T,s.hd]],['k and v (each)',[1,s.Hk,T,s.hd]],['scores q kᵀ, before the mask',[1,s.H,T,T]],['heads merged',[1,T,s.H*s.hd]],['after o, added to the stream',[1,T,s.D]],[glu?'FFN gate and up (each)':'FFN hidden',[1,T,s.F]],['logits, after the last layer',[1,T,s.V]]];
    $('tzd-a').innerHTML='<thead><tr><th>Activation (B = 1, T = '+f(T)+')</th><th>Shape</th><th class="num">Numbers</th><th class="num">bf16</th></tr></thead><tbody>'+
      A.map(([n,a])=>{const k=a.reduce((p,q)=>p*q,1);return '<tr><td>'+n+'</td><td>'+sh(a)+'</td><td class="num">'+f(k)+'</td><td class="num">'+by(2*k)+'</td></tr>'}).join('')+'</tbody>';
    $('tzd-p').innerHTML='<thead><tr><th>Part</th><th>Formula</th><th class="num">Parameters</th></tr></thead><tbody>'+
      [['blocks','L x one layer = '+s.L+' x '+f(c.block),s.L*c.block],['token table','V x D',c.emb],['output layer',s.tied?'tied: the token table':'V x D, untied',c.head],['positions',c.pos?'T<sub>max</sub> x D':'none ('+esc(s.pos)+')',c.pos],['final norm',s.conv?'gain and bias':'gain',c.fin]]
      .map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="num">'+f(r[2])+'</td></tr>').join('')+'<tr><td><b>Total</b></td><td></td><td class="num"><b>'+f(c.total)+'</b></td></tr></tbody>';
  }
  $('tzd-model').innerHTML=M.map(m=>'<option value="'+m.key+'">'+esc(m.name)+'</option>').join('');
  $('tzd-model').addEventListener('change',render);$('tzd-T').addEventListener('change',render);
  $('tzd-tab').innerHTML='<thead><tr><th>Model</th><th class="num">D</th><th class="num">L</th><th class="num">H</th><th class="num">H<sub>kv</sub></th><th class="num">hd</th><th class="num">F</th><th class="num">V</th><th>Tied</th><th class="num">Parameters</th></tr></thead><tbody>'+
    M.map(m=>{const s=m.s;return '<tr><td>'+esc(m.name)+'</td><td class="num">'+f(s.D)+'</td><td class="num">'+s.L+'</td><td class="num">'+s.H+'</td><td class="num">'+s.Hk+'</td><td class="num">'+s.hd+'</td><td class="num">'+f(s.F)+'</td><td class="num">'+f(s.V)+'</td><td>'+(s.tied?'yes':'no')+'</td><td class="num">'+f(count(s).total)+'</td></tr>'}).join('')+'</tbody>';
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-drill']=window.TAB_RENDER['t-drill']||[]).push(render);
  render();
})();
