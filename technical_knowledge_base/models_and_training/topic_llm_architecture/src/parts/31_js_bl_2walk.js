// Block lab section 2: one token through one block, step by step, with the real recorded vectors of the trained
// tiny GPT (src/block/trace.py) and the shapes, parameters and FLOPs of the chosen model (window.CC specs).
(function(){
  const B=window.BL;if(!B||!B.$('bl-walk'))return;
  const D=B.D,T=D.trace,$=B.$;
  const P=T.pos,CTX=P+1,SEQ=256;
  let model='tiny',layer=0,anim=null,ready=false;
  const code=k=>D.code.refs.find(r=>r.key===k);
  // steps: id, title, code refs, caption(b) -> html, draw(svg ctx)
  const STEPS=[
    {id:'in',t:'Into the block: the residual stream',refs:['embed','embed_call']},
    {id:'n1',t:'Norm 1 (normalise the copy attention reads)',refs:['rmsnorm','layer_pre_attn']},
    {id:'qkv',t:'Q, K and V projections, split into heads',refs:['qkv_init','split_heads','rope','kv_cache']},
    {id:'sc',t:'Scores: q · k / √d_head, causal mask',refs:['scaling','mask','scores']},
    {id:'sm',t:'Softmax: attention weights',refs:['scores']},
    {id:'av',t:'Weighted sum of the values',refs:['scores','repeat_kv']},
    {id:'o',t:'Merge heads, output projection',refs:['merge_o']},
    {id:'a1',t:'Residual add 1',refs:['layer_pre_attn']},
    {id:'n2',t:'Norm 2 (normalise the copy the FFN reads)',refs:['layer_ffn']},
    {id:'up',t:'FFN up (and gate)',refs:['mlp_init','mlp_forward']},
    {id:'act',t:'Nonlinearity',refs:['mlp_forward']},
    {id:'dn',t:'FFN down',refs:['mlp_forward']},
    {id:'a2',t:'Residual add 2: out of the block',refs:['layer_ffn']},
    {id:'hd',t:'After the last block: final norm and unembedding',refs:['final_norm','lm_head','tied','logits']}
  ];
  function shapes(b){const H=b.nh,Hk=b.nkv,hd=b.hd,d=b.d,F=b.ff,Tn=model==='tiny'?String(SEQ):'T';
    return {in:'(1, '+Tn+', '+d+')',n1:'(1, '+Tn+', '+d+')',
      qkv:'q (1, '+H+', '+Tn+', '+hd+'); k, v (1, '+Hk+', '+Tn+', '+hd+')',
      sc:'(1, '+H+', '+Tn+', '+Tn+')',sm:'(1, '+H+', '+Tn+', '+Tn+')',av:'(1, '+H+', '+Tn+', '+hd+')',
      o:'(1, '+Tn+', '+H*hd+') to (1, '+Tn+', '+d+')',a1:'(1, '+Tn+', '+d+')',n2:'(1, '+Tn+', '+d+')',
      up:(b.glu?'gate and up, each ':'')+'(1, '+Tn+', '+F+')',act:'(1, '+Tn+', '+F+')',dn:'(1, '+Tn+', '+d+')',a2:'(1, '+Tn+', '+d+')',
      hd:'(1, '+Tn+', '+b.V+')'}}
  // cumulative parameters and FLOPs for THIS token inside one block, at context CTX (the token sees CTX positions)
  function counters(b){const c={};let p=0,f=0;const add=(id,dp,df)=>{p+=dp;f+=df;c[id]={p,f,dp,df}};
    add('in',0,0);add('n1',b.normp,0);add('qkv',b.q+b.k+b.v,2*(b.q+b.k+b.v));
    add('sc',0,2*b.nh*b.hd*CTX);add('sm',0,0);add('av',0,2*b.nh*b.hd*CTX);add('o',b.o,2*b.o);add('a1',0,0);
    add('n2',b.normp,0);add('up',b.up,2*b.up);add('act',0,0);add('dn',b.down,2*b.down);add('a2',0,0);
    c.hd={p:p,f:f,dp:b.tied?0:b.V*b.d,df:2*b.V*b.d,head:true};return c}
  function caption(id,b,s){
    const L=layer+1,lay=D.trace.layers[layer],tiny=model==='tiny',d=b.d;
    const nm=v=>B.norm(v).toFixed(1);
    const v=k=>B.vec(layer,k);
    switch(id){
      case 'in':return layer===0?'Token "'+B.tokTxt(T.piece)+'" (id '+T.id+') at position '+P+' looks up row '+T.id+' of the token table ('+D.trace.config.vocab+' x '+D.trace.config.d_model+') and adds row '+P+' of the learned position table: x = tok + pos, '+d+' numbers, norm '+nm(B.vec(-1,'x'))+'. This vector is the <b>residual stream</b>: every later sub-layer reads a copy of it and adds its result back. Real models skip the position row (RoPE rotates q and k instead, step 3).'
        :'Block '+L+' receives the residual stream of token "'+B.tokTxt(T.piece)+'" as block '+layer+' left it: '+d+' numbers, norm '+nm(v('x_in'))+' (it was '+nm(B.vec(-1,'x'))+' after the embedding). Nothing in the block overwrites it; the two sub-layers only add to it.';
      case 'n1':return (tiny?'LayerNorm: subtract the mean of the '+d+' numbers, divide by their standard deviation, multiply by a learned gain (256 parameters; no bias in this model). Norm in '+nm(v('x_in'))+', out '+nm(v('norm1'))+' (about √'+d+' = '+Math.sqrt(d).toFixed(0)+' times the gain).':'RMSNorm: divide by the root mean square (no mean subtraction, cheaper), multiply by a learned gain of '+d+' numbers.')+' Only the copy that attention reads is normalised: pre-norm.';
      case 'qkv':return 'Three matrix products turn the normalised vector into a query (what this token looks for), a key (what it offers to later tokens) and a value (what it passes on). Each is cut into '+b.nh+' heads of '+b.hd+(b.nkv<b.nh?'; K and V have only '+b.nkv+' heads (grouped-query attention: '+(b.nh/b.nkv)+' query heads share each KV head), which is what makes the KV cache '+(b.nh/b.nkv)+'x smaller':'')+'. K and V of every past token are kept in the KV cache, so a new token computes only its own q, k, v.'+(tiny?'':' Llama-style models rotate q and k by position here (RoPE).');
      case 'sc':return 'Each head compares its query with the keys of all '+CTX+' visible positions: one dot product of '+b.hd+' numbers each, divided by √'+b.hd+' = '+Math.sqrt(b.hd).toFixed(2)+' so the scores keep a variance near 1 whatever the head size. Positions after '+P+' are masked to −∞: a token may not read the future it is trained to predict. FLOPs grow with the context: 2 x '+b.nh+' x '+b.hd+' x '+CTX+' = '+B.comma(2*b.nh*b.hd*CTX)+'.';
      case 'sm':{const top=topAttn(layer);return 'Softmax turns each head’s scores into weights that are positive and sum to 1, so the head reads a weighted average. Measured in block '+L+' for this token: '+top.map(t=>'head '+(t.h+1)+' puts '+(t.w*100).toFixed(0)+'% on "'+B.tokTxt(t.tok)+'" (position '+t.i+')').slice(0,3).join('; ')+'. Entropy per head (bits): '+lay.ent.map(x=>x.toFixed(1)).join(', ')+' (log2 of '+CTX+' = '+Math.log2(CTX).toFixed(1)+' would be uniform).';}
      case 'av':return 'Each head sums the value vectors with its weights: '+b.nh+' outputs of '+b.hd+' numbers. This is the only place where information moves between positions. Same cost as the scores: '+B.comma(2*b.nh*b.hd*CTX)+' FLOPs at this context.';
      case 'o':return 'The '+b.nh+' head outputs are concatenated back to '+(b.nh*b.hd)+' numbers and one more matrix (W_O, '+B.comma(b.o)+' parameters) mixes the heads and maps them to the stream width. Output norm '+(tiny?nm(v('attn_out')):'?')+'.';
      case 'a1':return 'x = x + attention(norm(x)). Stream norm '+nm(v('x_in'))+' plus a branch of norm '+nm(v('attn_out'))+' gives '+nm(v('x_mid'))+'. The add costs '+d+' FLOPs and has no parameters; it is why gradients reach early layers unchanged (the identity path).';
      case 'n2':return 'A second norm makes the copy the feed-forward network reads: norm in '+nm(v('x_mid'))+', out '+nm(v('norm2'))+'.';
      case 'up':return (b.glu?'SwiGLU: two matrices of '+d+' x '+b.ff+' (gate and up). With three matrices instead of two, the hidden width is cut to about 8/3 of d_model ('+b.ff+' here, '+(b.ff/d).toFixed(2)+'x) to keep the parameter count of a 4x two-matrix FFN.':'One matrix widens the vector from '+d+' to '+b.ff+' (4x): '+B.comma(b.up)+' parameters, the largest matrix in the block. The width is where the FFN stores what it has learned; 4x is the 2017 Transformer’s choice, kept by GPT-2.')+' Per token the FFN is about two thirds of the block’s weights.';
      case 'act':return (b.glu?'SiLU of the gate times the up projection, elementwise. ':'GELU, elementwise. ')+'Measured for the tiny GPT in block '+L+': '+(lay.gneg*100).toFixed(0)+'% of the '+D.trace.config.ffn_hidden+' pre-activations are negative and '+(lay.gsmall*100).toFixed(0)+'% of the outputs are within 0.05 of zero: the nonlinearity switches most hidden units nearly off for this token. Without it the two matrices would collapse into one linear map.';
      case 'dn':return 'A second matrix maps '+b.ff+' back to '+d+' ('+B.comma(b.down)+' parameters). Output norm '+nm(v('ffn_out'))+'.';
      case 'a2':return 'x = x + FFN(norm(x)): stream norm '+nm(v('x_mid'))+' becomes '+nm(v('x_out'))+'. This is what block '+(L+1>D.trace.config.n_layer?'the final norm':L+1)+' receives. A block’s weights: '+B.comma(s.f.o.p+s.f.a2.p-0)+' parameters per layer counted so far; FLOPs for this token in this block: '+B.comma(s.f.a2.f)+'.';
      case 'hd':{const f=D.trace.final;return 'After block '+D.trace.config.n_layer+', a final norm and the unembedding (the LM head: '+d+' x '+b.V+(b.tied?', the token table reused, tied, no new parameters':', untied: '+B.comma(b.V*d)+' parameters')+') turn the stream into one score (logit) per vocabulary entry: 2 x '+d+' x '+b.V+' = '+B.comma(2*d*b.V)+' FLOPs. Measured: the next token "'+B.tokTxt(T.next)+'" gets probability '+(f.p_next*100).toFixed(1)+'%. The model copied "Roxy" from earlier in the story.';}
    }return ''}
  function topAttn(li){const out=[];for(let h=0;h<8;h++){const a=B.att(li,h);let bi=0;for(let i=0;i<a.length;i++)if(a[i]>a[bi])bi=i;out.push({h,i:bi,w:a[bi],tok:T.pieces[bi]})}
    return out.sort((x,y)=>y.w-x.w)}
  function draw(i){if(!ready)return;
    const st=STEPS[i],b=B.block(B.spec(model)),sh=shapes(b),cn=counters(b);
    const el=$('bl-walk-svg'),w=B.W(el);
    let svg='',h=150;
    const lab=(x,y,s,a)=>'<text x="'+x+'" y="'+y+'" font-size="11" fill="var(--mute)"'+(a?' text-anchor="'+a+'"':'')+'>'+s+'</text>';
    const pan=(items)=>{ // items: [{v,rows,cols,label}] side by side, with optional symbols between
      const gap=items.length>1?26:0;const cols=items.reduce((a,x)=>a+x.cols,0);
      const c=Math.max(2,Math.min(14,Math.floor((w-8-gap*(items.length-1))/cols)));let x=Math.max(0,(w-(cols*c+gap*(items.length-1)))/2),s='',mh=0;
      items.forEach((it,k)=>{s+=B.grid(it.v,it.rows,it.cols,x,18,c,it.mx)+lab(x,12,it.label);
        if(it.sym&&k<items.length-1)s+='<text x="'+(x+it.cols*c+gap/2)+'" y="'+(18+it.rows*c/2+5)+'" font-size="16" text-anchor="middle" fill="var(--ink)">'+it.sym+'</text>';
        x+=it.cols*c+gap;mh=Math.max(mh,it.rows*c)});h=mh+26;return s};
    const v=k=>B.vec(layer,k);
    switch(st.id){
      case 'in':svg=layer===0?pan([{v:B.vec(-1,'tok'),rows:16,cols:16,label:'token row',sym:'+'},{v:B.vec(-1,'pos'),rows:16,cols:16,label:'position row',sym:'='},{v:B.vec(-1,'x'),rows:16,cols:16,label:'x (256)'}])
        :pan([{v:v('x_in'),rows:16,cols:16,label:'residual stream in (256)'}]);break;
      case 'n1':svg=pan([{v:v('x_in'),rows:16,cols:16,label:'x',sym:'→'},{v:v('norm1'),rows:16,cols:16,label:'norm(x)'}]);break;
      case 'qkv':svg=pan([{v:v('q'),rows:8,cols:32,label:'q: 8 heads x 32'},{v:v('k'),rows:8,cols:32,label:'k'},{v:v('v'),rows:8,cols:32,label:'v'}]);break;
      case 'sc':case 'sm':{ // 8 heads x CTX positions
        const n=CTX,c=Math.max(1,Math.min(6,(w-40)/n)),x0=Math.max(30,(w-n*c)/2+12);let s='';
        let gm=0;for(let hh=0;hh<8;hh++)gm=Math.max(gm,...B.att(layer,hh));
        for(let hh=0;hh<8;hh++){const a=B.att(layer,hh);const mx=gm;const y=18+hh*13;
          s+=lab(x0-6,y+9,'h'+(hh+1),'end');
          for(let k2=0;k2<n;k2++){const o=st.id==='sm'?Math.sqrt(a[k2]/mx):Math.min(1,0.15+Math.sqrt(a[k2]/mx)*0.85);if(o<0.04)continue;
            s+='<rect x="'+(x0+k2*c).toFixed(2)+'" y="'+y+'" width="'+Math.max(0.8,c).toFixed(2)+'" height="11" fill="var(--c2)" fill-opacity="'+(st.id==='sm'?o:0.12+0.5*o).toFixed(2)+'"/>'}}
        s+=lab(x0,12,'positions 0 to '+P+' (this token is the last; '+(SEQ-CTX)+' later positions masked)');
        s+='<rect x="'+(x0+n*c+2)+'" y="18" width="'+Math.max(4,Math.min(w-(x0+n*c+4),24))+'" height="'+(8*13-2)+'" fill="var(--dim)" fill-opacity=".5"/>';
        svg=s;h=8*13+26;break}
      case 'av':svg=pan([{v:v('head_out'),rows:8,cols:32,label:'8 head outputs x 32'}]);break;
      case 'o':svg=pan([{v:v('head_out'),rows:8,cols:32,label:'concat (256)',sym:'→'},{v:v('attn_out'),rows:16,cols:16,label:'W_O · concat'}]);break;
      case 'a1':{const mx=Math.max(...Array.from(v('x_mid'),Math.abs));svg=pan([{v:v('x_in'),rows:16,cols:16,label:'x',sym:'+',mx},{v:v('attn_out'),rows:16,cols:16,label:'attention out',sym:'=',mx},{v:v('x_mid'),rows:16,cols:16,label:'x′',mx}]);break}
      case 'n2':svg=pan([{v:v('x_mid'),rows:16,cols:16,label:'x′',sym:'→'},{v:v('norm2'),rows:16,cols:16,label:'norm(x′)'}]);break;
      case 'up':svg=pan([{v:v('ffn_up'),rows:32,cols:32,label:'up: 1024 pre-activations'}]);break;
      case 'act':svg=pan([{v:v('ffn_up'),rows:32,cols:32,label:'before',sym:'→'},{v:v('ffn_act'),rows:32,cols:32,label:'after GELU'}]);break;
      case 'dn':svg=pan([{v:v('ffn_act'),rows:32,cols:32,label:'1024',sym:'→'},{v:v('ffn_out'),rows:16,cols:16,label:'down: 256'}]);break;
      case 'a2':{const mx=Math.max(...Array.from(v('x_out'),Math.abs));svg=pan([{v:v('x_mid'),rows:16,cols:16,label:'x′',sym:'+',mx},{v:v('ffn_out'),rows:16,cols:16,label:'FFN out',sym:'=',mx},{v:v('x_out'),rows:16,cols:16,label:'x″',mx}]);break}
      case 'hd':{const top=D.trace.final.top;const bw=Math.max(60,w-130);let s='';
        top.forEach((t,k)=>{const y=18+k*17;s+='<text x="62" y="'+(y+11)+'" font-size="12" text-anchor="end" fill="var(--ink)">"'+B.tokTxt(t[0])+'"</text>'+
          '<rect x="68" y="'+y+'" width="'+(bw*t[1]).toFixed(1)+'" height="13" fill="var('+(t[0]===T.next?'--c3':'--c1')+')" fill-opacity=".8"/>'+
          '<text x="'+(72+bw*t[1])+'" y="'+(y+11)+'" font-size="11" fill="var(--mute)">'+(t[1]*100).toFixed(1)+'%</text>'});
        svg=lab(68,12,'next-token probabilities, top 10 of '+D.trace.config.vocab)+s;h=18+top.length*17+4;break}
    }
    el.innerHTML='<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+B.esc(st.t)+'">'+svg+'</svg>';
    $('bl-walk-title').textContent=(i+1)+' of '+STEPS.length+': '+st.t;
    $('bl-walk-cap').innerHTML=caption(st.id,b,{f:cn});
    const c=cn[st.id];
    $('bl-walk-stats').innerHTML=[
      ['tensor shape',sh[st.id],model==='tiny'?'batch 1, the 256-token running sequence':'batch 1, T tokens'],
      ['parameters used at this step',B.comma(c.head?c.dp:c.dp),c.head?(b.tied?'tied to the embedding':'untied LM head'):'in block '+(layer+1)],
      ['FLOPs for this token so far',B.comma(c.head?c.df:c.f),c.head?'unembedding alone':'in this block, at context '+CTX],
      ['block total',B.comma(cn.a2.p)+' params',B.comma(cn.a2.f)+' FLOPs per token at context '+CTX]
    ].map(r=>'<div class="stat"><div class="k">'+r[0]+'</div><div class="v">'+r[1]+'</div><div class="d">'+r[2]+'</div></div>').join('');
    $('bl-walk-code').innerHTML=st.refs.map(k=>{const r=code(k);return '<div class="bl-codecap">'+B.esc(r.what)+': <code>modeling_llama.py:'+r.line+(r.end>r.line?'-'+r.end:'')+'</code></div><pre class="bl-code">'+B.esc(r.text)+'</pre>'}).join('');
    document.querySelectorAll('#bl-walk-list li').forEach((li,k)=>li.classList.toggle('cur',k===i));
  }
  function build(){if(ready)return;if(!window.CC||!window.CCD)return;ready=true;
    const ms=B.models();$('bl-walk-model').innerHTML=ms.map(m=>'<option value="'+m.key+'">'+B.esc(m.label)+'</option>').join('');
    $('bl-walk-model').addEventListener('change',e=>{model=e.target.value;anim.redraw()});
    $('bl-walk-layer').addEventListener('change',e=>{layer=+e.target.value;anim.redraw()});
    $('bl-walk-list').innerHTML=STEPS.map((s,k)=>'<li><a href="#" data-k="'+k+'">'+B.esc(s.t)+'</a></li>').join('');
    $('bl-walk-list').addEventListener('click',e=>{const a=e.target.closest('a[data-k]');if(!a)return;e.preventDefault();anim.go(+a.dataset.k)});
    anim=window.RD.anim({card:'bl-walk',ctl:'bl-walk-ctl',n:STEPS.length,draw,ms:3200,label:'Block step'});
  }
  B.onRender(()=>{build();if(anim)anim.redraw()});
  B.onResize(()=>{if(anim)anim.redraw()});
})();
