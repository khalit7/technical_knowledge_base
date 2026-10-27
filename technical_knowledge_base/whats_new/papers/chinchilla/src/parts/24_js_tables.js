// ---- The paper's tables, rebuilt ----
(function(){const T=PAPER.tables,RC=PAPER.rc,AX=(t,a)=>A(PAPER.meta.ax+'#'+a,t);
  const num=s=>{s=String(s).replace(/,/g,'');const m={Million:1e6,Billion:1e9,Trillion:1e12};for(const k in m)if(s.indexOf(k)>=0)return parseFloat(s)*m[k];return parseFloat(s)};
  const flag=(ok,v)=>'<span class="'+(ok?'':'bad')+'">'+v+'</span>';
  // Tables 3 and A3
  function t3(){const head=['Parameters','A1 FLOPs','A1 tokens','tokens per parameter','6ND / FLOPs','A2 FLOPs','A2 tokens','6ND / FLOPs','A3 FLOPs','A3 tokens','tokens per parameter','6ND / FLOPs'];
    const rows=T.t3.rows.map((r,i)=>{const N=num(r[0]),a=T.a3.rows[i],q=(c,d)=>6*N*num(d)/parseFloat(c),f=v=>flag(Math.abs(v-1)<.03,v.toFixed(3));
      return [r[0].replace(' Million','M').replace(' Billion','B').replace(' Trillion','T'),r[1],r[3],(num(r[3])/N).toFixed(1),f(q(r[1],r[3])),a[1],a[2],f(q(a[1],a[2])),a[3],a[4],(num(a[4])/N).toFixed(0),f(q(a[3],a[4]))]});
    tbl('t3T',head,rows)}
  // results tables
  function res(){const k=$('resSel').value,t=T[k];let head,rows,note='';
    const pct=s=>parseFloat(String(s).replace('%',''));
    const d=(c,g)=>{if(isNaN(c)||isNaN(g))return '';const v=c-g;return '<span class="'+(v>0?'ok':v<0?'bad':'')+'">'+(v>0?'+':'')+v.toFixed(k==='a5'?3:1)+'</span>'};
    if(k==='t6'){head=['','5-shot accuracy'];rows=t.rows;note=''+AX('Table 6','S4.T6')+'. Forecasts: 73 competitive human forecasters, as reported by Steinhardt (2021). The unweighted mean of Table A6 is '+RC.rows.find(r=>r.id==='mmlu_mean').v.toFixed(1)+' for Chinchilla and '+RC.rows.find(r=>r.id==='mmlu_mean').note.replace('Gopher ','').replace(' (printed 60.0)','')+' for Gopher (printed 60.0).'}
    else if(k==='t9'){head=t.head.concat(['Δ Gopher']);rows=t.rows.map(r=>r.concat([d(pct(r[2]),pct(r[3]))]));note=''+AX('Table 9','S4.T9')+'. The 5-shot and 64-shot rows share one open-book SOTA cell in the paper. §4.2.6 quotes Gopher\'s Natural Questions as 21% and 28%; the table says 24.5% and 28.2%.'}
    else if(k==='t10'){head=['Group','Chinchilla','Gopher','Δ'];rows=t.rows.concat(T.t10r.rows).map(r=>[r[0],r[1],r[2],d(pct(r[1]),pct(r[2]))]);note=''+AX('Table 10','S4.T10')+', left and right halves (gotcha examples contradict occupational stereotypes).'}
    else if(k==='a5'){head=['Subset','Chinchilla','Gopher','Jurassic-1','Δ Gopher (lower is better)'];rows=t.rows.map(r=>r.concat([d(+r[1],+r[2])]).map((c,j)=>j===4?c.replace('ok','tmp').replace('bad','ok').replace('tmp','bad'):c));note=''+AX('Table A5','A8.T5')+', bits per byte. Chinchilla is lower than Gopher on all 19 subsets; Jurassic-1 is lower than Chinchilla on dm_mathematics and ubuntu_irc.'}
    else{head=t.head.concat(['Δ Gopher']);rows=t.rows.map(r=>r.concat([d(pct(r[1]),pct(r[2]))]));note=k==='t7'?''+AX('Table 7','S4.T7')+'. GPT-3 and MT-NLG used a different RACE prompt format, so are not comparable.':''+AX('Table 8','S4.T8')+', zero-shot.'}
    tbl('resT',head,rows);$('resN').innerHTML=note}
  // per-task tables
  function task(){const k=$('taskSel').value,so=$('taskSort').value;let rows=T[k].rows.map(r=>({t:r[0],c:+r[1],g:+r[2],d:+r[1]-+r[2]}));
    rows.sort(so==='t'?(a,b)=>a.t<b.t?-1:1:so==='c'?(a,b)=>b.c-a.c:(a,b)=>b.d-a.d);
    tbl('taskT',['Task','Chinchilla','Gopher','Δ'],rows.map(r=>[r.t,r.c.toFixed(1),r.g.toFixed(1),'<span class="'+(r.d>0?'ok':r.d<0?'bad':'')+'">'+(r.d>0?'+':'')+r.d.toFixed(1)+'</span>']));
    const mc=rows.reduce((s,r)=>s+r.c,0)/rows.length,mg=rows.reduce((s,r)=>s+r.g,0)/rows.length;
    $('taskN').innerHTML='Unweighted means: Chinchilla '+mc.toFixed(1)+', Gopher '+mg.toFixed(1)+' (printed '+(k==='a6'?'67.6 and 60.0':'65.1 and 54.4')+').'}
  // Appendix F calculator
  const SH=T.a4.rows.map(r=>({nm:r[0],L:+r[1],d:+r[2],ff:+r[3],h:+r[4],kq:+r[5],N:num(r[0].replace('M',' Million').replace('B',' Billion')),pr:r[6]})).concat([{nm:'Chinchilla 70B',L:80,d:8192,ff:32768,h:64,kq:128,N:70e9,pr:''},{nm:'Gopher 280B',L:80,d:16384,ff:65536,h:128,kq:128,N:280e9,pr:''}]);
  SH.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.nm+(s.pr?' (printed ratio '+s.pr+')':'');$('a4Sel').appendChild(o)});
  function a4(){const s=SH[+$('a4Sel').value],S=2048,V=32000,ke=s.kq*s.h;
    const t=[['Embeddings','2 · seq · vocab · d',2*S*V*s.d,$('a4Emb').checked],['Q, K, V projections','2 · 3 · seq · d · (kv · heads)',2*3*S*s.d*ke,1],['K @ Q logits','2 · seq² · (kv · heads)',2*S*S*ke,1],['Softmax','3 · heads · seq²',3*s.h*S*S,$('a4Sm').checked],['Softmax @ V','2 · seq² · (kv · heads)',2*S*S*ke,1],['Output projection','2 · seq · (kv · heads) · d',2*S*ke*s.d,1],['Dense block','2 · seq · 2 · d · ffw',2*S*2*s.d*s.ff,1],['Final logits','2 · seq · d · vocab',2*S*s.d*V,$('a4Log').checked]];
    let fwd=0,full=0;const rows=t.map((r,i)=>{const per=i>0&&i<7,v=per?r[2]*s.L:r[2];full+=v;if(r[3])fwd+=v;return [r[0],r[1],r[3]?sciT(v,2):'<span class="mute">left out</span>',r[3]?(per?'× '+s.L+' layers':''):'']});
    const tot=3*fwd,six=6*s.N*S,ratio=tot/six;
    tbl('a4T',['Term','Formula','FLOPs per sequence, all layers',''],rows.concat([['<b>Training (3 × forward)</b>','',sciT(tot,3),''],['6ND (N as printed, D = 2,048)','',sciT(six,3),'']]));
    $('a4O').innerHTML='Ratio to 6ND: <b>'+ratio.toFixed(3)+'</b>'+(s.pr?' (printed '+s.pr+')':'')+'. '+(($('a4Emb').checked||$('a4Log').checked)?'The two vocabulary terms are '+(100*(4*S*V*s.d)/full).toFixed(0)+'% of the full forward count for this model; with them the small models come out far above the printed ratios.':'Without the vocabulary terms, five of the six printed ratios reproduce to within 0.007 (1.1B gives 1.085 against 1.04).')}
  ['a4Sel','a4Emb','a4Log','a4Sm'].forEach(id=>$(id).addEventListener('change',a4));
  // Table A9
  function a9(){const R=RC.a9;tbl('a9T',['Printed (M)','d_model','ffw','kv','heads','layers','12-style count (M)','with relative-position term (M)'],T.a9.rows.map((r,i)=>[r[0],r[1],r[2],r[3],r[4],r[5],R[i][1].toFixed(0),'<b>'+R[i][2].toFixed(0)+'</b>']));
    $('a9Max').textContent=(100*Math.max(...R.map(x=>Math.abs(x[2]/x[0]-1)))).toFixed(1)+'%'}
  // Table A1
  tbl('a1T',T.a1.head,T.a1.rows,r=>+r[4]>1?'hl':'');
  // the checks
  function chk(){const c=RC.counts;$('chkC').innerHTML='<b>'+RC.rows.length+'</b> numbers: '+(c.reproduces||0)+' reproduce, '+(c.partly||0)+' partly, '+(c['does not']||0)+' do not, '+(c.derived||0)+' derived here.';
    const lk=w=>/^http/.test(w)?A(w,w.indexOf('arxiv.org/html/2404')>0?'Besiroglu':w.indexOf('2401.00448')>0?'Sardana':'source'):A(PAPER.meta.ax+'#'+w,w);
    const fv=v=>Math.abs(v)>=1e4||Math.abs(v)<1e-2&&v!==0?sciT(v,3):(Math.abs(v)<10?v.toFixed(3):v.toFixed(1));
    tbl('chkT',['What','Printed','Recomputed','How','Verdict','Note'],RC.rows.map(r=>[r.what+' ('+lk(r.where)+')',r.printed,fv(r.v),r.formula,r.ok,r.note]),null);
    $('chkT').querySelectorAll('tbody tr').forEach(tr=>{const td=tr.children[4],v=td.textContent;td.className=v==='reproduces'?'okc':v==='does not'?'noc':v==='partly'?'mid':''})}
  $('resSel').addEventListener('change',res);$('taskSel').addEventListener('change',task);$('taskSort').addEventListener('change',task);
  onTab('t-tables',()=>{t3();res();task();a4();a9();chk()});
})();
