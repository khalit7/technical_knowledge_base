// ---- Run the modules tab: ask, look inside, results across seeds, training curves, in-browser test ----
(function(){
  if(!window.LM||!window.TOY)return;
  const V=LM.vocab,IDX=LM.IDX,T=TOY,R=T.runs;
  const tokS=id=>V[id]==='<bos>'?'bos':V[id]==='<eos>'?'eos':V[id];
  const inSet=(set,i)=>LM.split[set].indexOf(i)>=0;
  const factIdx=(op,a,b)=>LM.facts.findIndex(f=>f[0]===op&&f[1]===a&&f[2]===b);
  let cur=null;
  function syncB(){const op=$('askOp').value,b=$('askB');b.min=op==='rem'?2:0;b.max=op==='rem'?9:19;if(+b.value<+b.min)b.value=b.min;if(+b.value>+b.max)b.value=b.max}
  function chips(seq,ref,from){return seq.slice(from).map((t,k)=>{const r=ref[from+k],ok=r===t;return '<span class="w'+(ok?'':' bad')+'" title="'+(ok?'matches the reference':'reference: '+(r==null?'nothing':tokS(r)))+'">'+tokS(t)+'</span>'}).join(' ')}
  function ask(){syncB();const op=$('askOp').value,a=+$('askA').value,b=+$('askB').value;$('askAv').textContent=a;$('askBv').textContent=b;
    const i=factIdx(op,a,b),F=LM.facts[i],t=LM.trace(F);cur={i,F,t};
    const where=inSet('train',i)?'<span class="vd mid">in a training trace</span>':inSet('val',i)?'<span class="vd mid">validation</span>':'<span class="vd ok">held out: no trace of it was trained on</span>';
    // the frozen model alone, in its own brief format
    const q=[IDX['<bos>'],LM.N0+a,IDX[op==='sum'?'+':'%'],LM.N0+b,IDX['=']],bl=LM.big(q).logits,ba=LM.argmax(bl[bl.length-1]),bp=LM.softmax(bl[bl.length-1])[ba];
    let h='<p>'+where+' The answer is <b>'+F[3]+'</b>.</p><div class="kv"><dt>Frozen model alone</dt><dd><span class="mono">'+a+' '+(op==='sum'?'+':'%')+' '+b+' =</span> <b class="'+(ba===LM.N0+F[3]?'ok':'no')+'">'+tokS(ba)+'</b> <span class="mute">('+(100*bp).toFixed(0)+'%; knows it, explains nothing)</span></dd>';
    for(const m of ['released','causal']){const g=LM.generate(m,t.prompt),ans=LM.answerOf(g.seq);
      h+='<dt>'+(m==='released'?'As released':'Fixed (causal)')+'</dt><dd><div class="sent">'+chips(g.seq,t.full,LM.promptLen)+'</div><span class="small">final answer: <b class="'+(ans===F[3]?'ok':'no')+'">'+(ans==null?'none':ans)+'</b></span></dd>'}
    h+='<dt>Reference trace</dt><dd><span class="mono small">'+t.full.slice(LM.promptLen).map(tokS).join(' ')+'</span></dd></div>';
    h+='<p class="small mute">Prompt given to both: <span class="mono">'+t.prompt.map(tokS).join(' ')+'</span></p>';
    $('askOut').innerHTML=h;refit($('insSvg'))}
  function randomIn(set){const L=LM.split[set],i=L[Math.floor(Math.random()*L.length)],F=LM.facts[i];$('askOp').value=F[0];syncB();$('askA').value=F[1];$('askB').value=F[2];ask()}
  ['askOp'].forEach(id=>$(id).addEventListener('change',ask));['askA','askB'].forEach(id=>$(id).addEventListener('input',ask));
  $('askRnd').addEventListener('click',()=>randomIn('test'));$('askTr').addEventListener('click',()=>randomIn('train'));
  // look inside
  function inside(w){if(!cur)return;const m=$('insVar').value,l=+$('insL').value,full=cur.t.full,N=full.length,P=$('insP');P.max=N-2;if(+P.value>N-2)P.value=N-2;const qi=+P.value;$('insPv').textContent=qi+' ("'+tokS(full[qi])+'")';
    const r=LM.run(m,full),A=r.xatt[l],W=Math.max(300,w),lab=34,cs=Math.min(26,(W-lab-6)/N),H=lab+cs*N+6;let s='';
    for(let i=0;i<N;i++){s+=tx(lab-4,lab+cs*i+cs/2+4,tokS(full[i]),{fs:11,a:'end',c:i===qi?'var(--acc)':null,w:i===qi?600:null});
      s+='<text x="'+(lab+cs*i+cs/2+4).toFixed(1)+'" y="'+(lab-6)+'" font-size="11" text-anchor="start" transform="rotate(-60 '+(lab+cs*i+cs/2+4).toFixed(1)+' '+(lab-6)+')">'+tokS(full[i])+'</text>';
      for(let j=0;j<N;j++){let v=0;A.forEach(h=>v+=h[i][j]/A.length);const fut=j>i;
        s+=rc(lab+cs*j,lab+cs*i,cs-1,cs-1,fut?'var(--bad)':'var(--acc)',{r:1,op:(0.06+0.94*Math.sqrt(v)).toFixed(3)})}
      s+=rc(lab-1,lab+cs*qi-1,cs*N+1,cs+1,'none',{s:'var(--ink)',sw:1.5,r:2})}
    $('insSvg').innerHTML=svgW(W,H+30,s,'Cross-attention weights');
    // predictions at the query, teacher-forced and with the future scrambled
    const pr=LM.softmax(r.logits[qi]),top=[...pr.keys()].sort((a,b)=>pr[b]-pr[a]).slice(0,3);
    const rnd=mulberry32(7),scr=full.map((t,j)=>j>qi&&t!==IDX['<eos>']?LM.N0+Math.floor(rnd()*40):t),r2=LM.run(m,scr),p2=LM.softmax(r2.logits[qi]),top2=[...p2.keys()].sort((a,b)=>p2[b]-p2[a]).slice(0,3);
    let fut=0;A.forEach(h=>{for(let j=qi+1;j<N;j++)fut+=h[qi][j]/A.length});
    const fm=(t,p)=>'"'+tokS(t)+'" '+(100*p[t]).toFixed(0)+'%';
    $('insOut').innerHTML='Position '+qi+' should predict <b>"'+tokS(full[qi+1])+'"</b>. Weight on later states in this layer: <b>'+(100*fut).toFixed(0)+'%</b>.<br>Teacher-forced: '+top.map(t=>fm(t,pr)).join(', ')+'.<br>With every later token replaced by a random number: '+top2.map(t=>fm(t,p2)).join(', ')+'.'+
      '<br><span class="small mute">Gate (mean over channels) at this position, layer '+(l+1)+': '+(r.gates[l][qi].reduce((a,b)=>a+b,0)/r.gates[l][qi].length).toFixed(2)+' (1 = all cross-attention output, 0 = keep the stream).</span>'}
  ['insVar','insL'].forEach(id=>$(id).addEventListener('change',()=>refit($('insSvg'))));$('insP').addEventListener('input',()=>refit($('insSvg')));
  // results across seeds
  const ORDER=T.vars.filter(v=>R[v]),COL={released:'var(--bad)',causal:'var(--acc)',plain:'var(--c4)',small:'var(--c5)',bigft:'var(--c3)',head:'var(--mute)'};
  function results(w){const k=$('resM').value,W=Math.max(300,w),nar=W<600,lab=nar?8:Math.min(270,W*0.42),rh=nar?42:30,H=ORDER.length*rh+30;let s='';
    const val=r=>k==='train_gen'?r.train_gen:r.test[k],isL=k==='loss',mx=isL?Math.max(...ORDER.flatMap(v=>R[v].map(val)))*1.1:1,X=v=>lab+(W-lab-50)*v/mx;
    ORDER.forEach((v,i)=>{const y=10+i*rh+(nar?14:0),xs=R[v].map(val),m=xs.reduce((a,b)=>a+b,0)/xs.length;
      s+=nar?tx(lab,y,T.names[v],{fs:11}):tx(lab-6,y+15,T.names[v],{fs:11,a:'end'});s+=rc(lab,y+4,X(m)-lab,14,COL[v],{r:2,op:.85});
      xs.forEach(x=>s+='<circle cx="'+X(x).toFixed(1)+'" cy="'+(y+11)+'" r="3" fill="var(--ink)"/>');
      s+=tx(Math.max(X(m),...xs.map(X))+8,y+16,isL?m.toFixed(2):Math.round(100*m)+'%',{fs:11})});
    s+=ln2(lab,H-18,W-50,H-18,'var(--line)')+tx(lab,H-4,'0',{fs:11,c:'var(--mute)'})+tx(W-50,H-4,isL?mx.toFixed(1):'100%',{fs:11,a:'end',c:'var(--mute)'});
    $('resSvg').innerHTML=svgW(W,H,s,'Results of every variant');
    $('resNote').innerHTML=isL?'Teacher-forced cross-entropy over every token of the 364 test traces, prompt included (the number model.py reports). Lower looks better; for the released model it is not.':'Bars: mean of 3 seeds; dots: each seed. '+(k==='tf_eq_scrambled'?'The tokens after the first "=" are replaced by random numbers before the teacher-forced pass.':'')}
  $('resM').addEventListener('change',()=>refit($('resSvg')));
  // training curves
  $('curV').innerHTML=ORDER.map(v=>'<option value="'+v+'">'+T.names[v]+'</option>').join('');
  function curves(w){const v=$('curV').value,k=+$('curM').value,W=Math.max(300,w),H=220,pl=46,pr=12,pt=10,pb=34;const runs=R[v];
    const all=runs.flatMap(r=>r.curve.map(c=>c[k])),mx=k===4?1:Math.max(...all)*1.05,X=s=>pl+(W-pl-pr)*s/2500,Y=y=>pt+(H-pt-pb)*(1-y/mx);let s='';
    for(let g=0;g<=4;g++){const y=mx*g/4;s+=ln2(pl,Y(y),W-pr,Y(y),'var(--line)')+tx(pl-5,Y(y)+4,k===4?Math.round(100*y)+'%':y.toFixed(1),{fs:11,a:'end',c:'var(--mute)'})}
    [0,500,1000,1500,2000,2500].forEach(x=>s+=tx(X(x),H-pb+15,fmt(x),{fs:11,a:x===2500?'end':x===0?'start':'middle',c:'var(--mute)'}));s+=tx((pl+W-pr)/2,H-4,'training step',{fs:11,a:'middle',c:'var(--mute)'});
    runs.forEach((r,i)=>{s+='<polyline fill="none" stroke="'+COL[v]+'" stroke-width="1.8" opacity="'+(1-i*0.25)+'" points="'+r.curve.map(c=>X(c[0]).toFixed(1)+','+Y(c[k]).toFixed(1)).join(' ')+'"/>'});
    $('curSvg').innerHTML=svgW(W,H,s,'Training curves')}
  ['curV','curM'].forEach(id=>$(id).addEventListener('change',()=>refit($('curSvg'))));
  // in-browser test
  $('tstGo').addEventListener('click',()=>{const n=+$('tstN').value,L=LM.split.test.slice(0,n),btn=$('tstGo');btn.disabled=true;const ok={released:0,causal:0};let k=0;
    const step=()=>{const t0=performance.now();while(k<L.length&&performance.now()-t0<40){const F=LM.facts[L[k]],t=LM.trace(F);for(const m of ['released','causal'])if(LM.answerOf(LM.generate(m,t.prompt).seq)===F[3])ok[m]++;k++}
      $('tstOut').innerHTML='Running: '+k+' of '+n+'...';
      if(k<L.length){setTimeout(step,0);return}
      const q=v=>R[v]&&R[v][0].test_q?Math.round(100*R[v][0].test_q.gen_acc)+'%':'n/a';
      $('tstOut').innerHTML='As released: <b>'+ok.released+' of '+n+'</b> right ('+(100*ok.released/n).toFixed(0)+'%). Fixed (causal): <b>'+ok.causal+' of '+n+'</b> right ('+(100*ok.causal/n).toFixed(0)+'%).<br><span class="small mute">Seed 0 of each, as shipped (6-bit weights). PyTorch on the same 6-bit weights, all 364: released '+q('released')+', causal '+q('causal')+'.</span>';btn.disabled=false};
    step()});
  // how it was trained
  (function(){const ck=T.check||{},bg=T.big||{},bq=T.big_q||{};const lr=T.lr,grid={};Object.entries(lr).forEach(([k,v])=>{const [n,l]=k.split('|');(grid[n]=grid[n]||[]).push(l+': '+Math.round(100*v.val_gen_acc)+'%')});
    const q=R.causal&&R.causal[0].test_q,f=R.causal&&R.causal[0].test;
    $('howOut').innerHTML='<p><b>Pretraining the frozen model</b>: 6,000 steps of batch 128, AdamW, one-cycle learning rate peaking at 3e-3; every sequence is a start token, 0 to 5 random tokens, then facts separated by ";", loss on the fact tokens only. It ends answering '+Math.round(100*bg.facts)+'% of facts after a random prefix and '+Math.round(100*bg.in_trace)+'% at the "=" of a reasoning trace (after 6-bit quantisation: '+Math.round(100*(bq.facts||0))+'% and '+Math.round(100*(bq.in_trace||0))+'%).</p>'+
      '<p><b>Training each variant</b>: 2,500 steps of batch 32 drawn from the 140 training traces, AdamW, gradient clipping 1.0, the bridge at twice the decoder\'s learning rate (model.py: 1e-4 and 5e-5), dropout 0.1 on the cross-attention weights as in model.py. Learning rate picked per variant on the 56 validation problems (answer right when generating, seed 0): '+Object.entries(grid).map(([n,a])=>T.names[n]+' '+a.join(', ')).join('; ')+'. Then seeds 0, 1 and 2 at the picked rate.</p>'+
      '<p><b>Held-out by construction</b>: training, validation and test are disjoint sets of facts; no test problem appears in any trace. The frozen model saw every fact in the brief format during pretraining: that is the knowledge the method is supposed to transfer.</p>'+
      '<p><b>Browser against PyTorch</b> (check_forward.py, both shipped models, identical 6-bit weights in float64): '+(ck.verdict||'not run')+(ck.causal?'; '+ck.causal.identical_generations+' and '+ck.released.identical_generations+' of 100 generations identical; logits within '+Math.max(ck.causal.max_logit_diff,ck.released.max_logit_diff).toExponential(1)+', cross-attention weights within '+Math.max(ck.causal.max_xattn_diff,ck.released.max_xattn_diff).toExponential(1):'')+'. Quantisation cost (causal, seed 0, test, answer right when generating): '+(f?Math.round(100*f.gen_acc)+'% in float32, '+Math.round(100*q.gen_acc)+'% at 6 bits':'n/a')+'.</p>'})();
  onTab('t-run',()=>{if(!cur)ask();fit($('insSvg'),inside);fit($('resSvg'),results);fit($('curSvg'),curves)});
})();
