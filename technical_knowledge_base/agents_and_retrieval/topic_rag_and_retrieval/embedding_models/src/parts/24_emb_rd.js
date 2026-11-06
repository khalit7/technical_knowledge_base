// ---- Reading tab, part 1: the pooling stepper, code quotes, pooling table, false negatives ----
(function(){
  const E=window.EMB,esc=RD.esc;
  // ---------- code blocks with line numbers
  function codeBlock(id,parts){const el=document.getElementById(id);if(!el)return;
    el.textContent=parts.map(p=>p.text.split('\n').map((l,i)=>String(p.start+i).padStart(4,' ')+'  '+l).join('\n')).join('\n     ...\n')}
  codeBlock('emb-code-pool',[E.code.cls,E.code.mean,E.code.last]);
  codeBlock('emb-code-norm',[E.code.normalize]);
  codeBlock('emb-code-mnrl',[E.code.mnrl_loss]);
  (function(){const el=document.getElementById('emb-code-train');if(!el)return;const t=E.code.train;
    el.textContent='# scripts/e_train.py, from line '+t.start+' (loss) and line '+t.start2+' (inside the training loop)\n'+t.text})();
  // ---------- pooling table
  (function(){const el=document.getElementById('emb-pool-tab');if(!el)return;
    const rows=[['minilm-l6','all-MiniLM-L6-v2'],['bge-small','bge-small-en-v1.5'],['e5-small-v2','e5-small-v2'],['gte-modernbert','gte-modernbert-base'],['qwen3-emb-0.6b','Qwen3-Embedding-0.6B']];
    el.innerHTML='<tr><th>model</th><th>modules</th><th>pooling</th><th class="num">dims</th><th class="num">length before normalising</th><th class="num">largest difference to encode()</th></tr>'+
      rows.map(r=>{const m=E.pool[r[0]];const L=m.raw_lengths;return '<tr><td>'+r[1]+'</td><td>'+m.modules.join(' &rarr; ')+'</td><td>'+({cls:'CLS',mean:'mean',lasttoken:'last token'}[m.pooling])+'</td><td class="num">'+m.dim+'</td><td class="num">'+Math.min(...L).toFixed(1)+' to '+Math.max(...L).toFixed(1)+'</td><td class="num">'+(m.max_abs_diff===0?'0 (identical)':m.max_abs_diff.toExponential(1))+'</td></tr>'}).join('')})();

  // ---------- false negatives: bars and examples
  (function(){const el=document.getElementById('emb-fn-bars');if(!el)return;
    EL.bars(el,E.fn.bars.map((b,i)=>({name:b[0],v:b[1],txt:(100*b[1]).toFixed(1)+'%',color:i===0?'var(--good)':'var(--bad)'})),{max:1});
    const ex=document.getElementById('emb-fn-ex');
    const card=e=>'<div class="emb-ex"><div class="c">Claim: '+esc(e.claim)+'</div><div><span class="lab">labelled abstract</span> '+esc(e.pos_title)+' <span class="mute">(cosine bge '+e.bge_pos.toFixed(2)+', Qwen3 '+e.qw_pos.toFixed(2)+')</span></div><div><span class="lab">top unlabelled abstract, both models</span> '+esc(e.neg_title)+' <span class="mute">(cosine bge '+e.bge_neg.toFixed(2)+', Qwen3 '+e.qw_neg.toFixed(2)+')</span></div><div class="small mute">'+esc(e.neg_text.slice(0,260))+'&hellip;</div></div>';
    ex.innerHTML=card(E.fn.examples[0])+(E.fn.examples.length>1?'<details class="dp"><summary>'+(E.fn.examples.length-1)+' more pairs <span class="mute">(examples)</span></summary><div class="b">'+E.fn.examples.slice(1).map(card).join('')+'</div></details>':'')})();
})();
// ---------- predict, then reveal
document.querySelectorAll('.emb-prd').forEach(box=>{const ans=box.querySelector('.ans');
  box.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{const right=b.dataset.r==='1';
    box.querySelectorAll('.opts button').forEach(x=>x.classList.remove('right','wrong'));b.classList.add(right?'right':'wrong');
    box.querySelector('.opts button[data-r="1"]').classList.add('right');
    ans.hidden=false;ans.innerHTML=ans.innerHTML.replace(/^<span class="verdict">[^<]*<\/span>/,'');ans.insertAdjacentHTML('afterbegin','<span class="verdict">'+(right?'Yes.':'Not quite.')+'</span>')}))});
