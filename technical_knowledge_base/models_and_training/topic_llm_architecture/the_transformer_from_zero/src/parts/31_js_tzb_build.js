// Build it up tab: a stepper over the nine steps of gpt_zero.py (data: TZD.steps from src/zero/out/steps.json)
(function(){
  const D=window.TZD,$=id=>document.getElementById(id);if(!D||!$('tzb-card')||!window.RD)return;
  const esc=RD.esc,S=D.steps,TOTAL=S[S.length-1].code.start+S[S.length-1].code.lines.length-1;
  const TITLE={config:'1. The config',embed:'2. Embedding: ids to vectors',one_head:'3. One attention head, by hand',multi_head:'4. All heads in one matrix multiply',ffn:'5. The feed-forward network',block:'6. The block: pre-norm and residual',model:'7. The whole model, tied unembedding',loss:'8. The loss: targets shifted by one',sample:'9. Sampling with a KV cache'};
  const CAP={config:'Every number the model needs in one dataclass, plus the ablation switches (all True is the baseline). Nothing runs yet; the test checks the derived sizes.',
    embed:'Two lookup tables. Token ids become rows of a (V, D) table; position t adds row t of a (ctx, D) table, broadcast over the batch. The test proves a lookup is a one-hot matrix multiply and that without positions attention cannot see order.',
    one_head:'A plain function on one sequence: queries, keys and values, scores scaled by 1/sqrt(hd), the future masked to minus infinity, softmax over keys. The test edits a later token and checks that earlier outputs do not move at all.',
    multi_head:'One (D, D) matrix per q, k, v computes all heads; view to (B, T, H, hd) then transpose to (B, H, T, hd) so each head is a batched matmul; merge back with reshape, not view. The test compares with 8 separate heads and with PyTorch’s fused kernel.',
    ffn:'Up to F = 4D, GELU, down to D, at every position independently. SwiGLU is the three-matrix alternative. The test runs one token alone and gets the same answer as inside the sequence.',
    block:'Pre-norm residual: normalise a copy, run the sublayer, add its output to the stream; twice. Shape in equals shape out, so blocks stack. The ablation switches live here.',
    model:'Embedding, six blocks, final LayerNorm, and an output layer that is the token table itself (tied). GPT-2 initialisation, in the same order as tiny_gpt.py, so the starting weights match exactly.',
    loss:'Logits (B, T, V) against the next tokens, flattened to (B T, V) and (B T). The untrained loss sits next to ln V = 8.318.',
    sample:'Prefill the prompt once, then one token per step, appending each layer’s new k and v to a cache instead of recomputing the prefix. Greedy takes the argmax; temperature and top-k reshape the distribution first.'};
  const SYM={'idx':'(B, T)','emb.tok(idx)':'(B, T, D)','emb.pos(arange(T))':'(T, D)','x = tok + pos':'(B, T, D)','x':'(T, D)','q = x @ Wq':'(T, hd)','scores q @ k.T':'(T, T)','y = softmax(masked) @ v':'(T, hd)',
    'att.q(x)':'(B, T, D)','.view(B, T, H, hd)':'(B, T, H, hd)','.transpose(1, 2)':'(B, H, T, hd)','q @ k.transpose(-2, -1)':'(B, H, T, T)','merge: .transpose(1, 2).reshape(B, T, D)':'(B, T, D)','att.o(y)':'(B, T, D)',
    'ffn.up(x)':'(B, T, F)','gelu(.)':'(B, T, F)','ffn.down(.)':'(B, T, D)','block(x)':'(B, T, D)','model(idx[:, :-1])':'(B, T-1, V)','logits':'(B, T-1, V)','targets = idx[:, 1:]':'(B, T-1)',"cache[0]['k'] after 40 tokens":'(B, H, t, hd)'};
  $('tzb-steps').innerHTML=S.map((s,i)=>'<button data-i="'+i+'">'+(i+1)+' '+esc(TITLE[s.key].replace(/^\d+\. /,'').split(':')[0])+'</button>').join('');
  let A;
  function draw(i){
    const s=S[i],c=s.code,end=c.start+c.lines.length-1;
    $('tzb-steps').querySelectorAll('button').forEach((b,j)=>{b.classList.toggle('on',j===i);b.classList.toggle('done',j<i)});
    $('tzb-title').textContent=TITLE[s.key];$('tzb-cap').textContent=CAP[s.key];
    $('tzb-lines').textContent='file: lines '+c.start+' to '+end+' of '+TOTAL;
    $('tzb-bar').style.width=(100*(c.start-1)/TOTAL).toFixed(1)+'%';
    const nw=$('tzb-new');nw.style.left=(100*(c.start-1)/TOTAL).toFixed(1)+'%';nw.style.width=(100*c.lines.length/TOTAL).toFixed(1)+'%';
    $('tzb-shapes').innerHTML=s.shapes.length?s.shapes.map((x,j)=>'<div class="r'+(j===s.shapes.length-1?' new':'')+'"><code>'+esc(x.name)+'</code><div><span class="s">('+x.shape.join(', ')+')</span> <span class="sym">'+esc(SYM[x.name]||'')+'</span><div class="n">'+esc(x.note)+'</div></div></div>').join(''):'<div class="small mute">No tensors yet: this step only defines sizes.</div>';
    const w=String(end).length;
    $('tzb-code').textContent='# the_transformer_from_zero/src/zero/gpt_zero.py\n'+c.lines.map((l,j)=>String(c.start+j).padStart(w,' ')+'  '+l).join('\n');
    $('tzb-out').textContent='# python steps.py (step '+(i+1)+' test, CPU)\n'+s.out.join('\n');
  }
  A=RD.anim({card:'tzb-card',ctl:'tzb-ctl',n:S.length,draw,ms:5200,label:'Build step'});
  $('tzb-steps').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(b)A.go(+b.dataset.i)});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-build']=window.TAB_RENDER['t-build']||[]).push(()=>A.redraw());
})();
