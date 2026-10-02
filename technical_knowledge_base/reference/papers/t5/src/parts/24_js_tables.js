// ---- The ablation grid, rebuilt: explorer, checks, parameter recount, Table 14 ----
(function(){
  const EX=[['T1','Baseline and no pretraining (Table 1)'],['T2','Architectures (Table 2)'],['T4','Objectives (Table 4)'],['T5','BERT-style variants (Table 5)'],['T6','Corruption rate (Table 6)'],['T7','Span length (Table 7)'],
    ['T8','Data sets (Table 8)'],['T9','Repetition (Table 9)'],['T10','Fine-tuning (Table 10)'],['T11','Mixing (Table 11)'],['T12','Multi-task plus fine-tuning (Table 12)'],['T13','Scaling (Table 13)'],['T15','T5-Base against baseline-1T (Table 15)']];
  const EXNOTE={
   T1:'Ten runs of the baseline from scratch give the standard deviations used for every bold mark; "no pre-training" trains each task from scratch for 2^18 steps. Only EnFr, a large data set, barely gains from pretraining (§3.1.5).',
   T2:'P is one BERT-Base-sized stack, M the FLOPs of the 12 + 12 encoder-decoder. Denoising beats the LM objective for every architecture; the shared encoder-decoder is "nearly as well" as the full one; the prefix LM is below it, "suggesting that the addition of an explicit encoder-decoder attention is beneficial" (§3.2.4).',
   T4:'BERT-style best, prefix LM close on translation, deshuffling considerably worse (§3.3.1).',
   T5:'All four about the same. Dropping corrupted tokens wins GLUE through CoLA (60.04 against 53.84 in Table 16; spotting a missing word is close to judging grammaticality) but loses on SuperGLUE. The two variants that predict only the corrupted tokens make shorter targets and train faster (§3.3.2).',
   T6:'Limited effect, except that 50% significantly degrades GLUE and SQuAD; larger rates also make longer targets. 15% kept, partly on BERT\'s precedent (§3.3.3).',
   T7:'15% corrupted in every row. Mean span 3 slightly (but significantly) beats i.i.d. on most non-translation tasks; 10 slightly underperforms; spans give some speedup through shorter sequences (§3.3.4).',
   T8:'Unfiltered is worst on every task. In-domain data helps its own domain: Wikipedia + TBC lifts MultiRC exact match from 25.78 to 50.93 (Table 16), RealNews-like lifts ReCoRD from 68.16 to 73.72, Wikipedia helps SQuAD. WebText-like needed 12 months of Common Crawl (August 2018 to July 2019) after the Reddit filter left only about 2 GB of one month; 17 GB against the original WebText\'s 40 GB (§3.4.1).',
   T9:'The first N tokens of C4, still 2^35 tokens of training, so the set repeats 64 to 4,096 times. Training loss falls as N shrinks (Figure 6), suggesting memorisation; 64 repeats is harmless. Bigger models may overfit sooner (§3.4.2).',
   T10:'Adapters: SQuAD is fine with a small d; GLUE and SuperGLUE (each concatenated into one task) and translation need a large one. Gradual unfreezing (one more layer every 2^18/12 steps, both stacks from the top, shared embeddings always trained) degrades slightly and speeds up fine-tuning (§3.5.1). The d = 2048 row: see the checks below.',
   T11:'786,432 steps for every row. Equal mixing overfits small tasks and underfits big ones; examples-proportional has a sweet spot in K for most tasks, except EnFr, which always wants more; T = 2 performs best among temperatures (§3.5.2).',
   T12:'Multi-task pretraining uses examples-proportional K = 2^19. Leave-one-out pretrains without the target task, then fine-tunes on it. Supervised-only pretraining (no C4) is significantly worse except on translation, suggesting translation gains little from English pretraining (§3.5.3).',
   T13:'Bigger models: d_model 1024, d_ff 4096, 16 heads, 16 or 32 layers per stack (2× and 4× the parameters and cost). More pretraining steps means more data, since C4 is not finished even at 2^23 steps. Ensembles average logits before the softmax; the fine-tune-only ensemble does not use the full 4× budget. Ensembling beats every other route on CNN/DM, EnDe and EnRo; neither ensemble helps SuperGLUE (§3.6).',
   T15:'Baseline-1T is the baseline pretrained on about 1T tokens; T5-Base adds the non-scaling changes of §3.7. T5-Base wins on every task (validation sets).'};
  const C16=TB.T16.cols,R16=TB.T16.rows,SD16=R16[1].v.map(Number),IDX7=['GLUE','CNNDM R-2','SQuAD EM','SGLUE','EnDe','EnFr','EnRo'].map(c=>C16.indexOf(c));
  const app=t=>R16.filter(r=>'T'+r.table===t);
  let cur='T2';const bar=$('tbE');
  EX.forEach(([t,n])=>{const b=document.createElement('button');b.textContent=n;b.dataset.x=t;bar.appendChild(b)});
  const met=$('tbMet'),src=$('tbSrc');
  function fillMet(){const prev=+met.value||0,from=src.dataset.last,to=src.value,list=to==='app'?C16:M7;met.innerHTML='';
    list.forEach((c,i)=>{const o=document.createElement('option');o.value=i;o.textContent=to==='app'?c:(c+(c==='CNNDM'?' (ROUGE-2)':c==='SQuAD'?' (EM)':''));met.appendChild(o)});
    let nv=prev;if(from!==to)nv=to==='app'?IDX7[prev]:Math.max(0,IDX7.indexOf(prev));met.value=String(nv);src.dataset.last=to}
  src.dataset.last='main';
  function effJ(){const t=cur,useApp=src.value==='app'&&t!=='T15';let j=+met.value;if(src.value==='app'&&!useApp){j=IDX7.indexOf(j);if(j<0)j=0}return {t,useApp,j}}
  function rows(){const {t,useApp,j}=effJ();
    const main=TB[t].rows,ap=useApp?app(t):null;
    return main.map((r,i)=>{const a=ap&&ap[i];const v=useApp?(a?a.v[j]:null):r.v[j];
      const v7=useApp?null:r.v[j],a7=(!useApp&&app(t)[i])?app(t)[i].v[IDX7[j]]:null;
      return {n:r.name+(r.labels&&r.labels.length?' ('+r.labels.join(', ')+')':''),v:v==null?NaN:+v,raw:v,star:r.star,bold:useApp?null:r.bold[j],mism:(!useApp&&a7!=null&&a7!==v7)?a7:null,isSD:/deviation/.test(r.name)}}).filter(r=>!r.isSD)}
  function draw(W){const {t,useApp,j}=effJ(),R=rows(),sd=useApp?SD16[j]:SD7[j];
    [...bar.children].forEach(b=>b.classList.toggle('on',b.dataset.x===t));
    const best=Math.max(...R.map(r=>r.v)),base=R.find(r=>r.star)||R[0];
    let it=R.map(r=>({n:r.n,v:r.v,star:r.star,hl:r.v>=best-2*sd-1e-9}));if($('tbSort').value==='score')it=it.slice().sort((a,b)=>b.v-a.v);
    const name=useApp?C16[j]:M7[j];
    $('tbSvg').innerHTML=hbars(W,it,{best,sd,base:base.v,title:name+', '+t.replace('T','Table ')+(useApp?' rows in Table 16':'')});
    let h='<thead><tr><th>Variant</th><th class="num">'+escH(name)+'</th><th class="num">Δ vs ★</th><th>within 2 SD of best</th>'+(useApp?'':'<th>bold in the paper</th>')+'</tr></thead><tbody>';
    R.forEach(r=>{const within=r.v>=best-2*sd-1e-9;h+='<tr><td>'+(r.star?'★ ':'')+escH(r.n)+'</td><td class="num">'+(r.bold?'<b>'+r.raw+'</b>':r.raw)+(r.mism?' <span class="no" title="Table 16 prints a different value">(Table 16: '+r.mism+')</span>':'')+'</td><td class="num">'+(r.star?'':((r.v-base.v>=0?'+':'')+(r.v-base.v).toFixed(2)))+'</td><td>'+(within?'yes':'')+'</td>'+(useApp?'':'<td>'+(r.bold?'yes':'')+(r.bold!==within?' <span class="no">(differs)</span>':'')+'</td>')+'</tr>'});
    $('tbTab').innerHTML=h+'</tbody>';
    $('tbNote').innerHTML='Two standard deviations here: '+(2*sd).toFixed(3)+' ('+(useApp?'Table 16\'s standard deviation row':'Table 1')+', ten runs of the baseline). Highlighted bars and "within 2 SD": recomputed from the printed scores. '+(t==='T15'&&src.value==='app'?'Table 15 is not in Table 16, so the main-text numbers are shown'+(IDX7.indexOf(+met.value)<0?' (for GLUE: this metric is only in Table 16)':'')+'. ':'')+'<br>'+escH(EXNOTE[t]||'')}
  const el=$('tbSvg');bar.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.x;refit(el)});
  src.addEventListener('change',()=>{fillMet();refit(el)});met.addEventListener('change',()=>refit(el));$('tbSort').addEventListener('change',()=>refit(el));
  fillMet();onTab('t-tables',()=>{fit(el,draw);refit(el)});
  // checks
  const A=RC.averages,B=RC.bold,D=RC.main_vs_t16,T14=RC.t14;
  const d10=D.filter(x=>x.table===10),dOther=D.filter(x=>x.table!==10);
  $('chkO').innerHTML='<ul class="lst">'+
   '<li><b>Averages reproduce independently.</b> The GLUE score is the mean of 8 tasks (CoLA, SST-2, MRPC, STS-B, QQP, MNLI, QNLI, RTE), with two-metric tasks averaged first, MNLI-matched and -mismatched averaged into one, and WNLI left out (§2.4); SuperGLUE is the mean of its 8 tasks the same way. Recomputed from Table 16\'s per-task scores: GLUE '+A.glue_ok+' of '+A.rows+' rows to the printed two decimals, SuperGLUE '+A.sglue_ok+' of '+A.rows+' ('+A.mismatch.map(m=>escH(m.row)+' '+m.sglue[1]+' against '+m.sglue[0]).join('; ')+': rounding of the per-task inputs).</li>'+
   '<li><b>The bold marks follow the stated rule</b> ("within two standard deviations of the maximum", §3.1.5) in '+B.agree+' of '+B.checked+' cells of the main tables. The '+B.disagree.length+' exceptions sit on the cutoff: '+B.disagree.map(x=>'Table '+x.table+' '+escH(x.row)+' '+x.metric+' '+x.value+(x.printed_bold?' is bold although ':' is not bold although ')+(x.printed_bold?'below ':'at or above ')+(x.best-2*SD7[M7.indexOf(x.metric)]).toFixed(3)).join('; ')+'.</li>'+
   '<li><b>One misprint in the main text.</b> Table 10\'s "Adapter layers, <i>d</i> = 2048" row repeats the <i>d</i> = 128 row digit for digit (GLUE 81.51, SuperGLUE 63.03, EnFr 27.50). Table 16 has different numbers for it ('+d10.map(x=>x.metric+' '+x.appendix).join(', ')+'), which fit the text\'s conclusion that the high-resource tasks need a large <i>d</i>; this page treats Table 16\'s row as the real one and shows both.</li>'+
   '<li><b>Two more disagreements between the main tables and Table 16</b>: '+dOther.map(x=>'Table '+x.table+' "'+escH(x.row)+'" '+x.metric+' prints '+x.main+' in the main text and '+x.appendix+' in Table 16').join('; ')+'. The first matters: the text says ensembling four separate models "significantly outperformed every other scaling approach" on English to Romanian, which holds for 28.57 and not for 28.09 (the 2× size, 2× steps row has 28.19), so the main-text value is likely the right one; 28.09 is also the fine-tune-only ensemble\'s EnRo, a likely copy slip.</li>'+
   '<li><b>"State-of-the-art performance on 18 out of the 24 tasks"</b> (§3.7) reproduces independently from Table 14, counting a task only when every one of its metrics is at or above the previous best: '+T14.n_won+' of '+T14.n_tasks+' (GLUE and SuperGLUE averages count as tasks, MNLI-matched and -mismatched as one). Not won: '+T14.tasks.filter(k=>T14.won.indexOf(k)<0).join(', ')+'; QQP is split ('+T14.mixed.join(', ')+': F1 above, accuracy below). Counted by metric column instead, T5-11B leads in '+T14.n_lead_cols+' of '+T14.cols+'.</li></ul>';
  // parameter recount
  function pt(){const V=$('tbV').value,key=V==='32000'?'v32000':'v32128',P=RC.params;let h='<thead><tr><th>Size</th><th>Layers per stack</th><th class="num">d<sub>model</sub></th><th class="num">d<sub>ff</sub></th><th class="num">heads × d<sub>kv</sub></th><th class="num">Recount</th><th>Printed</th><th class="num">Hugging Face checkpoint</th></tr></thead><tbody>';
    Object.keys(P).forEach(k=>{const p=P[k],c=p.cfg,v=p[key];const m=p.hf?(Math.abs(p.v32128-p.hf)===0?' (identical at 32,128)':' (differs by '+fmt(p.v32128-p.hf)+')'):'';
      h+='<tr><td><b>'+k+'</b></td><td class="num">'+c.layers+'</td><td class="num">'+fmt(c.d_model)+'</td><td class="num">'+fmt(c.d_ff)+'</td><td class="num">'+c.heads+' × '+c.d_kv+'</td><td class="num"><b>'+(v>=1e9?(v/1e9).toFixed(2)+'B':(v/1e6).toFixed(1)+'M')+'</b></td><td>'+escH(p.printed)+'</td><td class="num">'+(p.hf?fmt(p.hf)+m:'no metadata')+'</td></tr>'});
    $('tbPt').innerHTML=h+'</tbody>';
    const L=P.Large,B=P.Base;$('tbPn').innerHTML='<span class="ill">Reproduces independently for Small, Base and 3B</span> (and the recount equals the released checkpoints\' own totals to the parameter at a vocabulary of 32,128). <b>Does not reproduce for Large:</b> its configuration (24 + 24 layers, <i>d</i><sub>model</sub> 1,024, <i>d</i><sub>ff</sub> 4,096, 16 heads) counts to '+(L.v32128/1e6).toFixed(1)+'M, the checkpoint agrees, and the printed "around 770 million" is '+(770-L.v32128/1e6).toFixed(0)+'M higher. 770M is what the count gives if the output projection is counted as a separate matrix ('+(L.v32128/1e6).toFixed(1)+'M + 32,128 × 1,024 = '+(L.untied/1e6).toFixed(1)+'M), but the Small and Base figures do not use that convention (they would be '+(P.Small.untied/1e6).toFixed(1)+'M and '+(B.untied/1e6).toFixed(1)+'M), so the printed sizes mix two conventions. The 3B model counts to '+(P['3B'].v32128/1e9).toFixed(2)+'B, which the text itself calls "around 2.8 billion"; 11B counts to '+(P['11B'].v32128/1e9).toFixed(2)+'B. At the baseline size the encoder stack is '+(B.enc/1e6).toFixed(1)+'M, the decoder '+(B.dec/1e6).toFixed(1)+'M, the shared embedding '+(B.emb/1e6).toFixed(1)+'M and the two relative-bias tables '+fmt(B.rel)+' parameters; cross-attention is '+(100*RC.P.cross_share).toFixed(1)+'% of the total (the paper says "about 10%").'}
  $('tbV').addEventListener('change',pt);pt();
  // Table 14
  const c14=TB.T14.cols,r14=TB.T14.rows,m14=$('t14M');c14.forEach((c,i)=>{const o=document.createElement('option');o.value=i;o.textContent=c;if(c==='SuperGLUE Average')o.selected=true;m14.appendChild(o)});
  function d14(W){const i=+m14.value,names=Object.keys(r14);const it=names.map(n=>({n,v:+r14[n][i].v,hl:n==='T5-11B',tag:r14[n][i].src?'('+r14[n][i].src+')':'',c:n==='Previous best'?'var(--c2)':null}));
    const vs=it.map(x=>x.v),lo=Math.min(...vs),hi=Math.max(...vs);
    $('t14Svg').innerHTML=hbars(W,it,{title:c14[i]+', Table 14 (test sets; SQuAD validation)',dom:[Math.max(0,lo-(hi-lo)*.15-1),hi+(hi-lo)*.05+.5]});
    const pb=r14['Previous best'][i],t=r14['T5-11B'][i];$('t14N').innerHTML='Previous best: '+pb.v+' from '+escH(TB.T14.src[pb.src]||'?')+'. T5-11B '+t.v+(+t.v>=+pb.v?', at or above it.':', below it.')+' Bold in the paper: '+names.filter(n=>r14[n][i].b).join(', ')+'.'}
  m14.addEventListener('change',()=>refit($('t14Svg')));onTab('t-tables',()=>{fit($('t14Svg'),d14);refit($('t14Svg'))});
})();
