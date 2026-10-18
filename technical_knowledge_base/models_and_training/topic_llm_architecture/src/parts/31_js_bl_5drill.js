// Block lab: predict-then-reveal drills, the "one screen" table, the real-mistakes table and the code listing.
(function(){
  const B=window.BL;if(!B||!B.$('t-block'))return;
  const D=B.D,$=B.$;
  // drills: <div class="bl-pr"> with buttons (data-ok="1" on the right one) and a hidden .bl-ans
  document.querySelectorAll('#t-block .bl-pr').forEach(pr=>{
    const ans=pr.querySelector('.bl-ans');
    pr.querySelectorAll('.bl-opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.bl-opts button').forEach(x=>{x.classList.remove('bl-right','bl-wrong');if(x.dataset.ok)x.classList.add('bl-right')});
      if(!b.dataset.ok)b.classList.add('bl-wrong');ans.hidden=false}));
    const sk=pr.querySelector('.bl-skip');if(sk)sk.addEventListener('click',e=>{e.preventDefault();ans.hidden=false});
  });
  // one-screen table: every step of one block for the chosen model
  let ready=false,model='tiny';
  function table(){if(!ready)return;
    const s=B.spec(model),b=B.block(s),T=model==='tiny'?'256':'T',L=b.n;
    const rows=[
      ['token ids','(1, '+T+')','',''],
      ['embedding lookup','(1, '+T+', '+b.d+')',B.comma(b.V*b.d)+(s.pos_embed?' + '+B.comma(s.pos_embed)+' positions':''),'0 (a row copy)'],
      ['norm 1','(1, '+T+', '+b.d+')',B.comma(b.normp),'about 5d (elementwise)'],
      ['Q, K, V projections','q (1, '+b.nh+', '+T+', '+b.hd+'), k and v (1, '+b.nkv+', '+T+', '+b.hd+')',B.comma(b.q+b.k+b.v),B.comma(2*(b.q+b.k+b.v))],
      ['scores q·k, mask, softmax','(1, '+b.nh+', '+T+', '+T+')','0','2 x '+b.nh+' x '+b.hd+' x t'],
      ['weighted sum of V','(1, '+b.nh+', '+T+', '+b.hd+')','0','2 x '+b.nh+' x '+b.hd+' x t'],
      ['output projection','(1, '+T+', '+b.d+')',B.comma(b.o),B.comma(2*b.o)],
      ['residual add','(1, '+T+', '+b.d+')','0',String(b.d)],
      ['norm 2','(1, '+T+', '+b.d+')',B.comma(b.normp),'about 5d'],
      [b.glu?'FFN gate and up (SwiGLU)':'FFN up (GELU)','(1, '+T+', '+b.ff+')',B.comma(b.up),B.comma(2*b.up)],
      ['FFN down','(1, '+T+', '+b.d+')',B.comma(b.down),B.comma(2*b.down)],
      ['residual add','(1, '+T+', '+b.d+')','0',String(b.d)],
      ['one block, total','',B.comma(b.q+b.k+b.v+b.o+b.up+b.down+2*b.normp),B.comma(2*(b.q+b.k+b.v+b.o+b.up+b.down))+' + 4 x '+(b.nh*b.hd)+' x t'],
      ['x '+L+' blocks, final norm, LM head','(1, '+T+', '+b.V+')',(b.tied?'0 (tied)':B.comma(b.V*b.d)),B.comma(2*b.V*b.d)]
    ];
    const p=window.CC.params(s);
    $('bl-one').innerHTML='<table><thead><tr><th>step</th><th>output shape</th><th class="num">parameters</th><th class="num">forward FLOPs per token</th></tr></thead><tbody>'+
      rows.map((r,k)=>'<tr'+(k===12?' style="font-weight:600"':'')+'><td>'+r[0]+'</td><td><code>'+r[1]+'</code></td><td class="num">'+r[2]+'</td><td class="num">'+r[3]+'</td></tr>').join('')+'</tbody></table>';
    $('bl-one-sum').innerHTML='Whole model: <b>'+B.comma(p.total)+'</b> parameters, of which '+B.comma(p.matmul_active)+' are matrix weights a token touches (N in "2N"). Forward FLOPs per token = 2N + 4 x '+L+' x '+(b.nh*b.hd)+' x t, where t is the number of positions the token attends to.';
  }
  function build(){if(ready||!window.CC||!window.CCD)return;ready=true;
    const sel=$('bl-one-model');sel.innerHTML=B.models().map(m=>'<option value="'+m.key+'">'+B.esc(m.label)+'</option>').join('');
    sel.addEventListener('change',e=>{model=e.target.value;table()});
    // mistakes
    const M=D.mist;
    $('bl-mist').innerHTML='<table><thead><tr><th>bug (one line in the attention forward)</th><th class="num">loss on the running sequence</th><th>greedy continuation of "…a little girl named"</th></tr></thead><tbody>'+
      '<tr><td>none (correct code)</td><td class="num">'+M.baseline_loss.toFixed(2)+'</td><td>'+B.esc(M.baseline_greedy)+'</td></tr>'+
      M.cases.map(c=>'<tr><td>'+B.esc(c.what)+'</td><td class="num">'+c.loss.toFixed(2)+'</td><td>'+B.esc(c.greedy)+'</td></tr>').join('')+'</tbody></table>';
    $('bl-errs').innerHTML=M.errors.filter(e=>e.error).map(e=>'<div class="bl-codecap">'+B.esc(e.label)+'</div><pre class="bl-code">'+B.esc(e.error)+'</pre>').join('');
    // code listing
    $('bl-codeall').innerHTML='<p class="small">'+B.esc(D.code.file)+' at '+B.esc(D.code.version)+' (commit '+D.code.commit.slice(0,10)+'), lines found by pattern in <code>src/block/code_refs.py</code>.</p>'+
      D.code.refs.map(r=>'<div class="bl-codecap">'+B.esc(r.what)+': <code>modeling_llama.py:'+r.line+(r.end>r.line?'-'+r.end:'')+'</code></div><pre class="bl-code">'+B.esc(r.text)+'</pre>').join('');
  }
  B.onRender(()=>{build();table()});
})();
