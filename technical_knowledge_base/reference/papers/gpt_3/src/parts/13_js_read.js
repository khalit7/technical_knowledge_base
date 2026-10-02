// ---- The paper tab: in-context against fine-tuning (animated), data mix, compute, predict reveals, tokens per parameter ----
(function(){
  // Figure 2.1's prompt in GPT-3 tokens (r50k_base, src/count_tokens.py)
  const P=[{t:'Translate English to French:',n:7,k:'ins'},{t:'sea otter => loutre de mer',n:10,k:'ex'},{t:'peppermint => menthe poivrée',n:11,k:'ex'},{t:'plush girafe => girafe peluche',n:11,k:'ex'},{t:'cheese =>',n:3,k:'q'}],ANS={t:' fromage',n:2};
  const CTX=2048;
  const modes={
    icl:[{t:'A frozen, pretrained model',c:'GPT-3 175B as pretraining left it. Nothing about the task is in the weights, and nothing will be written to them: the task has to arrive as text in the 2,048-token context.'},
      {t:'The task description',c:'"Translate English to French:" costs 7 tokens. In zero-shot this line and the query are the whole prompt.'},
      {t:'Example 1 goes into the prompt, not into the weights',c:'One demonstration appended (10 tokens). This is one-shot. The weights have not moved; only the context has grown.'},
      {t:'Example 2',c:'Another 11 tokens. Each demonstration is drawn at random from the task\'s training set (§2.4).'},
      {t:'Example 3: few-shot',c:'Three demonstrations, 39 tokens in all. The paper uses as many as fit, typically 10 to 100 (K = 64 for TriviaQA, 32 per SuperGLUE task).'},
      {t:'The query',c:'"cheese =>" (3 tokens). The model must infer from the pattern alone that a French translation should follow.'},
      {t:'One forward pass answers',c:'The model continues with " fromage". No gradient was computed; the same frozen weights serve the next task with a different prompt. Any "learning" happened inside the forward pass (Figure 1.1).'}],
    ft:[{t:'A pretrained model',c:'The same starting point. Fine-tuning will change it.'},
      {t:'Example 1: forward, loss, backward, update',c:'The pair is run through the model, the loss on "loutre de mer" is backpropagated, and every one of the 175 billion weights is nudged. The context holds only this one example.'},
      {t:'Example 2: another update',c:'A second gradient step. The weights drift further toward the task.'},
      {t:'Example 3: another update',c:'A third step. The model now carries the task in its weights, not in its prompt.'},
      {t:'In practice: thousands of examples',c:'Fine-tuning "typically" needs "thousands to hundreds of thousands" of labelled examples (§2), one gradient step per batch. That dataset is the cost GPT-3 set out to remove.'},
      {t:'A separate copy per task',c:'The fine-tuned weights are a new model that must be stored and served for this task alone; the next task starts again from the pretrained copy.'},
      {t:'The query',c:'"cheese =>" alone (3 tokens) goes through the fine-tuned copy, which answers " fromage" without any examples in its context.'}]};
  const cum=k=>{let n=0;for(let i=0;i<Math.min(k,5);i++)n+=P[i].n;return n};
  function draw(m,k,e,W){const narrow=W<560,lh=18,y0=8;let s='';
    s+=tx(0,y0+4,m==='icl'?'prompt (context window)':'training examples, then the prompt',{fs:11,c:'var(--mute)'});
    let lines=[];if(m==='icl'){for(let i=0;i<Math.min(k,5);i++)lines.push({t:P[i].t,op:i===k-1?e:1,k:P[i].k});if(k===6)lines.push({t:'→ fromage',op:e,k:'ans'})}
    else{if(k>=1&&k<=3)lines.push({t:P[k].t,op:e,k:'ex'});if(k===4)lines.push({t:'... thousands more pairs ...',op:e,k:'ex'});if(k===5)lines.push({t:'(no prompt needed)',op:e,k:'ins'});if(k===6){lines.push({t:'cheese =>',op:1,k:'q'});lines.push({t:'→ fromage',op:e,k:'ans'})}}
    lines.forEach((l,i)=>{s+=G(l.op,tx(0,y0+22+i*lh,escH(l.t),{fs:12,c:l.k==='ans'?'var(--good)':l.k==='q'?'var(--c2)':'var(--ink)',w:l.k==='ans'?600:null}).replace('<text','<text font-family="ui-monospace,Menlo,monospace"'))});
    const bw=narrow?Math.min(Math.floor((W-14)/2),170):190,bh=46,bx0=narrow?0:Math.round(W*.58),by=narrow?y0+22+6*lh-4:y0+18;
    const upd=m==='ft'?Math.min(k,3)+(k>=4?1:0):0,tint=m==='ft'&&k<5?Math.min(1,(upd-(k>=1&&k<=3?1-e:0))/4):0;
    s+=rc(bx0,by,bw,bh,'var(--acc2)',{s:'var(--acc)'});if(tint>0)s+=rc(bx0,by,bw,bh,'var(--c2)',{op:tint*.55});
    s+=tx(bx0+bw/2,by+19,'GPT-3 175B weights',{fs:12,a:'middle',w:600})+tx(bx0+bw/2,by+35,m==='icl'?'frozen: 0 updates':(k>=5?'pretrained, kept for other tasks':k>=4?'updated 1,000s of times':upd?'updated '+upd+' time'+(upd>1?'s':''):'pretrained'),{fs:11,a:'middle',c:'var(--mute)'});
    if(m==='ft'&&k>=1&&k<=3){const op=Math.sin(Math.PI*Math.min(1,e));s+=G(op,'<path d="M'+(bx0+bw/2-30)+','+(by-7)+' l30,7 l30,-7" fill="none" stroke="var(--c2)" stroke-width="2"/>'+tx(bx0+bw/2+36,by-4,'gradient step',{fs:11,c:'var(--c2)'}))}
    if(m==='ft'&&k>=5){const x2=narrow?bw+14:bx0,y2=narrow?by:by+bh+12;s+=G(k===5?e:1,rc(x2,y2,bw,bh,'var(--acc2)',{s:'var(--c2)'})+rc(x2,y2,bw,bh,'var(--c2)',{op:.55})+tx(x2+bw/2,y2+19,'translation copy, 175B',{fs:12,a:'middle',w:600})+tx(x2+bw/2,y2+35,'updated 1,000s of times',{fs:11,a:'middle',c:'var(--ink)'}))}
    if(!narrow&&lines.length){const ly=y0+22+(lines.length-1)*lh/2,on=(m==='icl'&&k===6)||(m==='ft'&&(k<=3||k===6));if(on)s+=G(m==='icl'?e:1,'<line x1="'+(W*.5)+'" y1="'+ly+'" x2="'+(bx0-8)+'" y2="'+(m==='ft'&&k===6?by+bh*1.5+12:by+bh/2)+'" stroke="var(--mute)" stroke-width="1.4" marker-end="url(#ahft)"/>')}
    if(m==='icl'&&k===6)s+=G(e,tx(narrow?0:bx0,narrow?by+bh+16:by+bh+16,'one forward pass, nothing written back',{fs:11,c:'var(--good)'}));
    const sy=narrow?by+bh+(m==='icl'&&k===6?44:30):y0+22+6*lh+(m==='ft'&&k>=5?24:18),sw=W-2,used=m==='icl'?cum(k)+(k===6?ANS.n*e:0):(k>=1&&k<=3?P[k].n:k===6?P[4].n+ANS.n*e:0);
    s+=tx(0,sy-8,'context window, to scale: '+fmt(Math.round(used))+' of 2,048 tokens',{fs:11,c:'var(--mute)'});
    s+=rc(0,sy,sw,18,'var(--soft)',{s:'var(--line)',r:3});
    let xx=0;const seg=(n,c)=>{const w=sw*n/CTX;s+=rc(xx,sy,Math.max(w,n>0?1:0),18,c,{r:1});xx+=w};
    if(m==='icl'){for(let i=0;i<Math.min(k,5);i++)seg(P[i].n*(i===k-1?e:1),P[i].k==='ins'?'var(--c4)':P[i].k==='q'?'var(--c2)':'var(--c1)');if(k===6)seg(ANS.n*e,'var(--good)')}
    else if(k>=1&&k<=3)seg(P[k].n*e,'var(--c1)');else if(k===6){seg(P[4].n,'var(--c2)');seg(ANS.n*e,'var(--good)')}
    s+=tx(sw,sy+32,'2,048',{fs:11,a:'end',c:'var(--mute)'})+tx(0,sy+32,'0',{fs:11,c:'var(--mute)'});
    const H=narrow?268:206,defs='<defs><marker id="ahft" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    return svgW(W,H,defs+s,'in-context learning against fine-tuning')}
  function counters(m,k){if(m==='icl'){const n=cum(k)+(k===6?2:0);return stat('Tokens in context',fmt(n),(100*n/CTX).toFixed(1)+'% of 2,048')+stat('Gradient steps','0','never, at any K')+stat('Weights changed','0','the same model serves every task')+stat('Copies of the model','1','')}
    const st=Math.min(k,3);return stat('Tokens in context',k>=1&&k<=3?fmt(P[k].n):k===6?'5':'0','one example at a time')+stat('Gradient steps',k>=4?'thousands':String(st),'one per batch')+stat('Weights changed',st?'all 175B':'0','every step')+stat('Copies of the model',k>=5?'2':'1',k>=5?'one per task':'')}
  makeAnim({id:'ft',modes,mode:'icl',draw,counters,dur:2600});

  // Data mix: tokens available against share of the 300B mix, to scale
  fit($('mixSvg'),W=>{const M=RC.mix,cols=['var(--c1)','var(--c3)','var(--c5)','var(--c4)','var(--c2)'],narrow=W<520;let s='';const tot=M.reduce((a,m)=>a+m.tokens,0),wt=M.reduce((a,m)=>a+m.weight,0);
    const row=(y,lab,vals,sum,txt)=>{s+=tx(0,y-6,lab,{fs:12,w:600});let x=0;vals.forEach((v,i)=>{const w=(W-2)*v/sum;s+=rc(x,y,w,22,cols[i],{r:2,op:.9});if(w>(narrow?44:60))s+=tx(x+4,y+15,txt(i),{fs:11,c:'var(--bg)',w:600});x+=w})};
    row(20,'tokens available (499B)',M.map(m=>m.tokens),tot,i=>(100*M[i].tokens/tot).toFixed(0)+'%');
    row(72,'share of the 300B training tokens',M.map(m=>m.weight),wt,i=>Math.round(100*M[i].weight)+'%');
    let lx=0,ly=112;M.forEach((m,i)=>{const t=m.name.replace(' (filtered)','')+' '+m.epochs_printed+' ep',w=t.length*6.6+22;if(lx+w>W){lx=0;ly+=16}s+=rc(lx,ly-9,10,10,cols[i],{r:2})+tx(lx+14,ly,escH(t),{fs:11});lx+=w});
    $('mixSvg').innerHTML=svgW(W,ly+8,s,'Table 2.2 data mix')});

  // Figure 2.2 from Table D.1, log scale
  fit($('cmpSvg'),W=>{const C=RC.compute,narrow=W<520,lw=narrow?96:118,pr=60,rh=narrow?19:18,H=C.length*rh+30,lg=Math.log10,lo=0,hi=lg(5000),X=v=>lw+(W-lw-pr)*(lg(v)-lo)/(hi-lo);let s='';
    [1,10,100,1000].forEach(t=>{s+=ln2(X(t),4,X(t),C.length*rh+6,'var(--line)')+tx(X(t),C.length*rh+20,fmt(t),{fs:11,a:'middle',c:'var(--mute)'})});
    C.forEach((c,i)=>{const y=6+i*rh,g=c.name.startsWith('GPT-3');s+=tx(lw-6,y+12,c.name,{fs:11,a:'end',w:c.name==='GPT-3 175B'?600:null});s+=rc(lw,y+2,Math.max(1,X(Math.max(1,c.pfd))-lw),rh-6,g?'var(--c1)':'var(--dim)',{r:2});s+=tx(X(Math.max(1,c.pfd))+4,y+12,c.pfd>=100?fmt(c.pfd):c.pfd.toFixed(1),{fs:11})});
    $('cmpSvg').innerHTML=svgW(W,H,s,'training compute in petaflop/s-days')});

  // Predict reveals
  PRED_REVEAL.pGap=()=>{const A=RC.agg;fit($('gapSvg'),W=>{$('gapSvg').innerHTML=sizeChart(W,{title:'Average of the 41 accuracy rows of Table H.1',ylab:'mean accuracy (%)',dom:[15,62],series:[{y:A.f,c:SETC.f,n:'few-shot'},{y:A.o,c:SETC.o,n:'one-shot'},{y:A.z,c:SETC.z,n:'zero-shot'}]})});
    $('gapNote').innerHTML='Few minus zero: '+RC.agg_gap.map((g,i)=>SZ[i]+' '+g.toFixed(1)).join(', ')+' points. The gap grows from Small to 175B on '+RC.gap_grows.n+' of the '+RC.gap_grows.of+' tasks, and from 13B to 175B on '+RC.gap_175_gt_13+'. This is the paper\'s Figure 1.3 recomputed from its own appendix table (independently; the figure has no printed values, and adding SQuAD 2.0 exact match as a 42nd row moves the 175B few-shot mean from '+RC.agg.f[7].toFixed(1)+' to '+RC.agg42.f[7].toFixed(1)+').'};
  function arith(m){const T=RC.tasks.filter(t=>t.cat.startsWith('Arithmetic'));const cs=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--ink)','var(--mute)','var(--bad)','var(--good)'];
    fit($('arSvg'),W=>{$('arSvg').innerHTML=sizeChart(W,{title:'Arithmetic, '+SETN[m]+' (Table H.1)',ylab:'exact-match accuracy (%)',dom:[0,100],series:T.map((t,i)=>({y:t[m],c:cs[i],n:t.name,sw:1.6}))})})}
  PRED_REVEAL.pAr=()=>{arith('f');const t=RC.tasks.find(x=>x.name==='3D+');$('arNote').innerHTML='3-digit addition few-shot: '+t.f.map((v,i)=>SZ[i]+' '+v).join(', ')+'. Everything below 13B is near zero; the jump comes in the last step (Figure 3.10). Exact match is all or nothing: an answer with one wrong digit scores 0, which is why '+A('https://arxiv.org/abs/2304.15004','Schaeffer et al. (2023)')+' argue such jumps partly reflect the metric. A straight line through the seven smaller models in log(parameters) predicts '+(()=>{const F=linfit(LX.slice(0,7),t.f.slice(0,7));return (F.a+F.b*LX[7]).toFixed(1)})()+'% for 175B (<a href="#" data-tab="t-run">refit it</a>).';
    document.querySelectorAll('#arNote a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.querySelector('#tabs button[data-t=t-run]').click()}))};
  segBind('arM',m=>arith(m));
  PRED_REVEAL.pCo=()=>{fit($('coSvg'),W=>{$('coSvg').innerHTML=contamChart(W)});const n2=RC.c1.filter(c=>Math.abs(c.rel_recomputed)<=2).length;
    $('coNote').innerHTML=n2+' of '+RC.c1_n+' benchmarks move by 2% or less (shaded band) on the clean subset; the big moves are the ones the authors examined: DROP and QuAC are over 90% flagged but only the passages, not the questions, were in training; the word tasks lose their trivial items (palindromes) when cleaned. Rebuilt from Table C.1 (Figure 4.2).'};

  // Tokens per parameter, log scale
  fit($('tppSvg'),W=>{const D=[['GPT-3 175B (2020)',300e9,175e9,'var(--c2)'],['Chinchilla 70B (2022)',1.4e12,70e9,'var(--c1)'],['Chinchilla Table 3: optimal 175B',3.7e12,175e9,'var(--c1)'],['LLaMA 65.2B (2023)',1.4e12,65.2e9,'var(--c3)'],['LLaMA 6.7B (2023)',1.0e12,6.7e9,'var(--c3)'],['Llama 3 405B (2024)',15.6e12,405e9,'var(--c4)']];
    const narrow=W<520,lw=narrow?0:220,pr=50,rh=narrow?34:20,H=D.length*rh+30,lg=Math.log10,lo=0,hi=lg(300),X=v=>lw+(W-lw-pr)*(lg(v)-lo)/(hi-lo);let s='';
    [1,10,100].forEach(t=>{s+=ln2(X(t),4,X(t),D.length*rh+6,'var(--line)')+tx(X(t),D.length*rh+20,t,{fs:11,a:'middle',c:'var(--mute)'})});s+=ln2(X(20),4,X(20),D.length*rh+6,'var(--c1)',{da:'3 3'})+tx(X(20),D.length*rh+20,'≈20',{fs:11,a:'middle',c:'var(--c1)'});
    D.forEach((d,i)=>{const y=6+i*rh,v=d[1]/d[2],by=narrow?y+15:y+2;s+=narrow?tx(0,y+11,d[0],{fs:11}):tx(lw-6,y+12,d[0],{fs:11,a:'end'});s+=rc(lw,by,Math.max(1,X(v)-lw),13,d[3],{r:2,op:.85})+tx(X(v)+4,by+11,v<10?v.toFixed(1):fmt(v),{fs:11})});
    $('tppSvg').innerHTML=svgW(W,H,s,'training tokens per parameter')});
})();
