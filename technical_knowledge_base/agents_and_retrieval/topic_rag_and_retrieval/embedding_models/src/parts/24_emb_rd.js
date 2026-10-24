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

  // ---------- one claim through the model (animation)
  (function(){const card=document.getElementById('emb-pa-card');if(!card)return;
    const A=E.anim;document.getElementById('emb-pa-claim').textContent=A.claim;
    let model='bge-small',mode='own';
    const OTHER={'bge-small':'mean','minilm-l6':'cls','qwen3-emb-0.6b':'mean'};
    const PN={cls:'CLS (first token)',mean:'mean of all tokens',last:'last token'};
    const svgEl=document.getElementById('emb-pa-svg'),cap=document.getElementById('emb-pa-cap'),ctr=document.getElementById('emb-pa-ctr');
    function pooled(m,p){const H=m.hidden;if(p==='cls')return H[0];if(p==='last')return H[H.length-1];
      return H[0].map((_,j)=>H.reduce((a,r)=>a+r[j],0)/H.length)}
    function draw(i){const m=A.models[model],p=mode==='own'?m.pool:OTHER[model];const H=m.hidden,n=H.length;
      const W=Math.max(280,Math.min(RD.width(svgEl),720)),lab=Math.min(120,Math.round(W*0.28)),cw=Math.max(6,Math.min(18,(W-lab-20)/17)),rh=n>20?11:14;
      const top=18,gridH=n*rh,H2=top+gridH+70;let s='';
      const mx=Math.max(...H.flat().map(Math.abs))||1;
      s+=RD.t(lab,12,i>=1?'final hidden state, first 16 of '+m.dim+' numbers per token':'tokens',{fs:10.5,fill:'var(--mute)'});
      const use=p==='cls'?[0]:p==='last'?[n-1]:H.map((_,k)=>k);
      H.forEach((row,k)=>{const y=top+k*rh;const isP=k>0&&k<=m.n_prompt;const hot=i>=2&&use.includes(k);
        s+=RD.t(lab-4,y+rh-3,esc(m.tokens[k]).slice(0,16),{a:'end',fs:rh>12?11:9.5,fill:isP?'var(--mute)':hot?'var(--ink)':undefined,w:hot&&use.length===1?600:undefined});
        if(i>=1)row.forEach((v,j)=>{s+='<rect x="'+(lab+j*cw)+'" y="'+(y+1)+'" width="'+(cw-1)+'" height="'+(rh-2)+'" fill="'+EL.heat(v,mx)+'"'+(i>=2&&!hot?' opacity="0.25"':'')+'/>'});
        if(hot&&use.length===1)s+='<rect x="'+(lab-1)+'" y="'+y+'" width="'+(16*cw+1)+'" height="'+rh+'" fill="none" stroke="var(--c5)" stroke-width="2"/>'});
      const y2=top+gridH+12;
      if(i>=2){const v=pooled(m,p),len=m.lengths[p];const vv=i>=3?v.map(x=>x/len):v;const m2=i>=3?Math.max(...vv.map(Math.abs)):mx;
        s+=RD.t(lab-4,y2+12,i>=3?'normalised':'pooled',{a:'end',fs:11,w:600});
        vv.forEach((x,j)=>{s+='<rect x="'+(lab+j*cw)+'" y="'+y2+'" width="'+(cw-1)+'" height="16" fill="'+EL.heat(x,m2)+'"/>'});
        s+=RD.t(lab+16*cw+6,y2+12,i>=3?'length 1':'length '+len.toFixed(2),{fs:10.5,fill:'var(--mute)'})}
      if(i>=4){s+=RD.t(lab,y2+42,'cosine to the labelled abstract: '+m.cos[p].toFixed(3),{fs:12,w:600})}
      svgEl.innerHTML=RD.svg(W,H2,s,'one claim through '+model);
      const caps=['The claim is split into tokens by the model\'s own tokenizer'+(m.n_prompt?': the grey ones are the query '+(model==='qwen3-emb-0.6b'?'instruction':'prefix')+', which the model also reads':'')+'. '+n+' tokens.',
        'The transformer returns one vector of '+m.dim+' numbers per token (only the first 16 are drawn). Each depends on every token it could attend to'+(model==='qwen3-emb-0.6b'?' (in a decoder, only the tokens before it)':'')+'.',
        'Pooling: '+PN[p]+'. '+(p==='mean'?'All real tokens are averaged, number by number.':p==='cls'?'Only the first token\'s vector is kept.':'Only the last token\'s vector is kept; in a decoder it is the only one that has seen the whole text.')+(mode==='other'?' This is NOT how '+model+' was trained.':''),
        'Normalisation divides by the length ('+m.lengths[p].toFixed(2)+'), so the dot product of two vectors becomes their cosine.',
        'The same steps on the labelled abstract ('+m.n_doc_tokens+' tokens) give its vector; the cosine of the two is '+m.cos[p].toFixed(3)+(mode==='other'?', against '+m.cos[m.pool].toFixed(3)+' with the trained pooling':'')+'.'];
      cap.textContent=caps[i];
      ctr.innerHTML='<span>model <b>'+esc(model)+'</b></span><span>pooling <b>'+PN[p]+'</b></span><span>tokens <b>'+n+'</b></span><span>vector <b>'+m.dim+'</b> numbers</span>'}
    const an=RD.anim({card:'emb-pa-card',ctl:'emb-pa-ctl',n:5,draw,ms:2200,label:'Pooling step'});
    RD.seg(document.getElementById('emb-pa-model'),v=>{model=v;an.redraw()});
    RD.seg(document.getElementById('emb-pa-pool'),v=>{mode=v;an.redraw()});
    RD.onResize(()=>an.redraw())})();

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
