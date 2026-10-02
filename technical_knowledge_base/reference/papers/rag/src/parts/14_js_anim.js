// ---- The two marginalisations, animated on the trained toy model (Reading tab, #mx) ----
(function(){if(!$('mx'))return;
  const sel=$('mxQ');
  const choices=[['novels',DEMO_A,'two documents'],['novels',[...WD.testA].sort((a,b)=>a-b)[1],'two documents'],['president',[...WD.testC].sort((a,b)=>a-b)[0],'one document'],['born',WD.questions.find(q=>q.task==='born'&&q.split==='test').pi,'one document']];
  choices.forEach((c,i)=>{const q=demoQ(c[0],c[1]);const o=document.createElement('option');o.value=i;o.textContent=WD.show(q.x)+' ('+c[2]+')';sel.appendChild(o)});
  let Q,RT,RS;const modes={tok:[],seq:[]};
  const trunc=(t,n)=>t.length>n?t.slice(0,n-1)+'…':t;
  function compute(){const c=choices[+sel.value];Q=demoQ(c[0],c[1]);RT=RAG.answer(RAG.load('tok'),IDX18,Q.x,5);RS=RAG.answer(RAG.load('seq'),IDX18,Q.x,5);
    const ok=(y)=>y.join(' ')===Q.y.join(' ');
    modes.tok.length=0;modes.seq.length=0;
    modes.tok.push({t:'retrieve',c:'The question is encoded once, scored against all '+IDX18.length+' documents by inner product, and the top 5 kept; their scores, renormalised, are the prior <i>p</i>(<i>z</i>|<i>x</i>) (the blue bars). The same 5 documents serve every token.'});
    RT.steps.forEach((st,i)=>{const t=st.tok==='</s>'?'end of answer':'"'+st.tok+'"';const j=st.post.indexOf(Math.max(...st.post));
      modes.tok.push({t:'token '+(i+1)+': '+t,c:'Each document\'s generator pass proposes a next token (right of each row). The mixture Σ<sub><i>z</i></sub> <i>p</i>(<i>z</i>|<i>x</i>) <i>p</i><sub>θ</sub>(<i>y<sub>i</sub></i>|<i>x</i>, <i>z</i>, <i>y</i><sub>&lt;<i>i</i></sub>) picks '+t+' with probability '+st.p.toFixed(2)+'. The orange bars are the document posterior for this token: document '+(j+1)+' carries '+pct(st.post[j])+' of it.'+(i===0?' In the paper\'s Figure 2 this bar moves to one document per fact; watch whether it does here.':'')})});
    modes.tok.push({t:'answer',c:'RAG-Token wrote <b>'+WD.show(RT.y)+'</b>'+(ok(RT.y)?(Q.task==='novels'?', which is right: it took each part from the document that holds it.':', which is right: nearly all the prior sits on the one document that holds the answer, and the generator copied it.'):', against the truth '+WD.show(Q.y)+'.'+(Q.task==='novels'?' Each book document proposed its own title with full confidence, so at every title token the mixture was a near tie between the two proposals (about 0.5 each), greedy decoding took syllables from both titles, and the posterior followed whichever proposal won: the per-document generators are not calibrated about what their document does not say.':''))});
    modes.seq.push({t:'retrieve',c:modes.tok[0].c.replace('The same 5 documents serve every token.','Under RAG-Sequence one document must explain the whole answer.')+' (This is a separately trained RAG-Sequence model, so its retrieval weights differ slightly.)'});
    modes.seq.push({t:'one answer per document',c:'Greedy decoding runs once per document, each document on its own (right of each row). '+RS.hyps.length+' distinct hypotheses come out.'});
    const extra=RS.hyps.reduce((a,h)=>a+RS.perDoc.filter(p=>p.join(' ')!==h.y.join(' ')).length,0);
    modes.seq.push({t:'Thorough Decoding',c:'Every hypothesis is scored under every document: '+extra+' extra forward passes for the (hypothesis, document) pairs whose own decoding did not produce it. The cells are <i>p</i><sub>θ</sub>(<i>y</i>|<i>x</i>, <i>z</i>), the probability of the whole answer given one document. "Fast Decoding" would set those extra cells to zero instead.'});
    const best=RS.hyps.reduce((a,b)=>b.lp>a.lp?b:a);
    modes.seq.push({t:'marginalise',c:'Each hypothesis\'s <i>p</i>(<i>y</i>|<i>x</i>) = Σ<sub><i>z</i></sub> <i>p</i>(<i>z</i>|<i>x</i>) <i>p</i><sub>θ</sub>(<i>y</i>|<i>x</i>, <i>z</i>) (bottom). The winner is <b>'+WD.show(best.y)+'</b>'+(ok(best.y)?', which is right.':', against the truth '+WD.show(Q.y)+(Q.task==='novels'?': no single document holds both titles, so every hypothesis has one title and a guess.':'.'))});
  }
  compute();
  function draw(m,k,e,w){const R=m==='tok'?RT:RS,docs=R.ret.idx.map(i=>IDX18[i]),pz=R.ret.lpz.map(Math.exp);
    const narrow=w<620,rowH=narrow?52:34,top=46;let s='';
    // question and the output strip
    let outT='';if(m==='tok'){const n=Math.max(0,Math.min(k,RT.steps.length));outT=WD.show(RT.steps.slice(0,n).map(st=>st.tok).filter(t=>t!=='</s>'))}else if(k>=3){outT=WD.show(RS.hyps.reduce((a,b)=>b.lp>a.lp?b:a).y)}
    s+=tx(0,14,'x: '+WD.show(Q.x),{fs:12,w:600});s+=tx(0,32,'y: '+(outT||'…'),{fs:12,c:'var(--c2)'});
    const tw=narrow?w:w*.42,bx=narrow?0:tw+8,bw=narrow?w*.32:w*.16,rx=narrow?bw+10:bx+bw+10,rw=w-rx;
    docs.forEach((d,j)=>{const y=top+j*rowH;s+=rc(0,y,w,rowH-4,j%2?'var(--bg)':'var(--soft)',{r:4});
      s+=tx(6,y+14,(j+1)+'. '+trunc(WD.show(d.toks),narrow?52:40),{fs:11});
      const by=narrow?y+22:y+6;s+=rc(narrow?6:bx,by,bw*pz[j]*(k===0?e:1),9,'var(--c1)',{r:2});s+=tx((narrow?6:bx)+bw*pz[j]+4,by+9,pz[j].toFixed(2),{fs:11,c:'var(--mute)'});
      const ry=narrow?y+22:y+6,rX=narrow?rx+30:rx;
      if(m==='tok'&&k>=1&&k<=RT.steps.length){const st=RT.steps[k-1],pp=st.post[j];
        s+=rc(rX,ry,Math.max(0,(rw-(narrow?30:0))*.35)*pp*e,9,'var(--c2)',{r:2});
        const tp=st.perDocTop[j];s+=tx(rX+(rw-(narrow?30:0))*.37,ry+9,'proposes "'+tp[0]+'" '+tp[1].toFixed(2),{fs:11,c:tp[0]===st.tok?'var(--ink)':'var(--mute)'})}
      if(m==='seq'&&k>=1){const h=RS.perDoc[j];if(k===1)s+=G(e,tx(rX,ry+9,'→ '+(WD.show(h)||'(empty)'),{fs:11}));
        else{const n=RS.hyps.length,cw=Math.min(70,(rw-(narrow?30:0))/n);RS.hyps.forEach((hh,c)=>{const p=Math.exp(hh.per[j]),own=RS.perDoc[j].join(' ')===hh.y.join(' ');
          s+=G(k===2?e:1,rc(rX+c*cw,ry-1,cw-4,12,'var(--c4)',{r:2,op:(0.12+0.88*Math.min(1,p)).toFixed(2),s:own?'var(--ink)':null}));s+=G(k===2?e:1,tx(rX+c*cw+2,ry+9,p<0.005?'<.01':p.toFixed(2),{fs:11}))})}}});
    let y=top+docs.length*rowH+6;
    if(m==='tok'&&k>=1&&k<=RT.steps.length){const st=RT.steps[k-1];s+=tx(0,y+12,'mixture picks "'+st.tok+'" at '+st.p.toFixed(2)+'   (blue: prior p(z|x); orange: posterior for this token)',{fs:11,c:'var(--mute)'});y+=20}
    if(m==='seq'&&k>=2){const n=RS.hyps.length,cw=Math.min(70,(rw-(narrow?30:0))/n),rX=narrow?rx+30:rx;
      if(k>=3){const best=RS.hyps.reduce((a,b)=>b.lp>a.lp?b:a);RS.hyps.forEach((hh,c)=>{const p=Math.exp(hh.lp);s+=G(e,rc(rX+c*cw,y,cw-4,Math.max(2,30*Math.min(1,p)),hh===best?'var(--c2)':'var(--c4)',{r:2}));s+=G(e,tx(rX+c*cw+2,y+44,p<0.005?'<.01':p.toFixed(2),{fs:11}))});y+=50}
      RS.hyps.forEach((hh,c)=>{s+=tx(6,y+12+c*15,'h'+(c+1)+' = '+WD.show(hh.y),{fs:11,c:'var(--mute)'})});
      RS.hyps.forEach((_,c)=>{s+=tx(rX+c*cw+2,top-4,'h'+(c+1),{fs:11,c:'var(--mute)'})});y+=RS.hyps.length*15+6}
    return svgW(w,y+4,s,'RAG '+(m==='tok'?'Token':'Sequence')+' marginalisation, step '+(k+1))}
  function counters(m,k){const st=m==='tok'?RT:RS;
    if(m==='tok'){const n=Math.min(k,RT.steps.length);return stat('generator passes',(5*n).toString(),'5 documents × '+n+' tokens')+stat('tokens written',n.toString(),'of '+RT.steps.length)+stat('answer',k>RT.steps.length?(RT.y.join(' ')===Q.y.join(' ')?'right':'wrong'):'…','')}
    const extra=RS.hyps.reduce((a,h)=>a+RS.perDoc.filter(p=>p.join(' ')!==h.y.join(' ')).length,0);
    return stat('decoding runs',k>=1?'5':'0','one per document')+stat('rescoring passes',k>=2?extra.toString():'0','Thorough Decoding')+stat('answer',k>=3?(RS.y.join(' ')===Q.y.join(' ')?'right':'wrong'):'…','')}
  const A=makeAnim({id:'mx',modes,mode:'tok',draw,counters,dur:2600});
  sel.addEventListener('change',()=>{compute();if(A){A.st.k=0;A.st.t=RM?1:0;A.draw()}});
  onTab('t-read',()=>{if(A)A.draw()});
  window.__mx=()=>({tok:RT.y,seq:RS.y,truth:Q.y,steps:{tok:modes.tok.length,seq:modes.seq.length}});
})();
