// ---- Reading tab: question explorer, AA bars, checkpoint counts, stability numbers, stage scores, token budget, Think table ----
(function(){
  const ART=[['w','Final weights'],['c','Corpus and data tooling'],['m','Mixture and its order'],['k','Training code and configs'],['p','Intermediate checkpoints'],['l','Training logs'],['t','Post-training data and code']];
  const Q=[
    {q:'Run, serve or fine-tune the model',need:['w'],how:'Inference and ordinary fine-tuning need only the final weights. For this, an open-weights release is as good as a fully open one, and open-weights models are stronger (see <a href="#s-trade">The price</a>).'},
    {q:'Does this capability come from that data source?',need:['w','c','m','k'],how:'Causal claims about data need the data. "This capability comes from that data source" is untestable against a closed corpus. With Dolma you can ablate a source, retrain at small scale with the released code, and measure. OLMo 2 did this cheaply: 19 "microanneals", each a short anneal on a 50/50 mix of a candidate source and web data, cost 130B tokens in all (<a href="https://app.notion.com/p/3c65c17b0d0d81fb9857fb956165ae1c" target="_blank" rel="noopener noreferrer">OLMo 2 paper page</a>).'},
    {q:'When does a capability appear, or memorisation of a document begin?',need:['p','c'],how:'Checkpoints turn training into an observable process. You can study when a capability appears, when memorisation of a specific document begins (which needs the corpus, to know when the document was seen), how representations reorganise, and intervene mid-run (fork at step N, change the mixture, compare) instead of only studying the finished model. The <a href="#" data-tab="t-log">Training log</a> tab shows in-loop scores rising across the 32B run.'},
    {q:'Is this benchmark score contaminated?',need:['c'],how:'If you cannot search the training corpus, every benchmark number is unfalsifiable in principle. Here you can grep for the eval set. Olmo 3 also introduced a decontamination method for its midtraining mix (<a href="https://arxiv.org/abs/2512.13961" target="_blank" rel="noopener noreferrer">report</a>, section 3.5.1), and OlmoTrace traces outputs back to training documents.'},
    {q:'Does my RL algorithm or data recipe help?',need:['p','t','k','m'],how:'Claiming an RL algorithm or a data recipe helps requires holding the base model, its data and its exact checkpoint fixed. A fork of a released OLMo checkpoint with the released mixture is a controlled experiment; fine-tuning someone\'s closed-corpus weights is not, because you cannot tell your change from what the lab already did.'},
    {q:'What is in this model? (procurement)',need:['c','m','t'],how:'Auditable provenance for regulated deployment. A government or healthcare buyer who must answer "what is in this model" has an answer here, and since September 2026 in K2 Horizon, and nowhere else.'},
    {q:'Why did training go wrong at step N?',need:['l','k','p'],how:'Training logs show loss curves, spikes, restarts and what was changed when, and are almost never published. OLMo 2\'s stability fixes were designed against the OLMo-0424 run; both logs are public, so the fix can be checked (<a href="#" data-tab="t-log" data-to="stab">Training log</a> tab).'}];
  let cur=1;
  function draw(){
    $('qxL').innerHTML=Q.map((x,i)=>'<button data-i="'+i+'" class="'+(i===cur?'on':'')+'" aria-pressed="'+(i===cur)+'">'+x.q+'</button>').join('');
    const q=Q[cur],miss=q.need.filter(n=>n!=='w');
    $('qxA').innerHTML='<div class="small mute" style="margin-bottom:2px">Artefacts this needs (filled); outlined in red: missing from an open-weights release</div>'+ART.map(([k,l])=>{const nd=q.need.includes(k);return '<div class="art'+(nd?' need':'')+(nd&&k!=='w'?' miss':'')+'"><span class="k"></span><span>'+l+'</span><span class="ow">'+(k==='w'?'open weights: yes':'open weights: no')+'</span></div>'}).join('');
    $('qxV').innerHTML=(miss.length?'<div class="verdict no"><b>Open weights: cannot answer.</b> Missing '+miss.length+' of the '+q.need.length+' artefacts it needs.</div>':'<div class="verdict yes"><b>Open weights: enough.</b></div>')+'<div class="verdict yes"><b>Fully open: can answer.</b> '+q.how+'</div>';
    $('qxL').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{cur=+b.dataset.i;draw()}));
    $('qxV').querySelectorAll('a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const t=document.querySelector('button[data-t="'+a.dataset.tab+'"]');t&&t.click();const to=a.dataset.to&&$(a.dataset.to);(to||$('tabs')).scrollIntoView({block:'start'})}));
  }
  draw();
})();
(function(){
  // Artificial Analysis Intelligence Index v4.3, from pages/topic-llms/aa_snapshot.json (1 Oct 2026)
  const R=[['Olmo 3.1 32B Think (est.)',7.1,'var(--open)','Dec 2025'],['K2 Horizon 375B A23B',30.5,'var(--open)','Sep 2026'],['Median open-weights model',33.7,'var(--dim)','21 models'],['Best open weights: MiMo-V2.6-Pro',46.3,'var(--closed)','Sep 2026'],['Best overall: Claude Opus 5.5',57.6,'var(--closed)','max effort']];
  $('aaBars').innerHTML=R.map(([n,v,c,d])=>'<div class="row'+(n.startsWith('Olmo')?' hl':'')+'"><span class="nm" title="'+n+', '+d+'">'+n+'</span><span class="track"><span class="fill" style="width:'+(100*v/60).toFixed(1)+'%;background:'+c+'"></span></span><span class="val">'+v.toFixed(1)+'</span></div>').join('');
  const C=window.CKN||[];const mx=Math.max(...C.map(c=>c[1]));
  $('ckBars').innerHTML=C.map(([n,v])=>'<div class="row'+(n.indexOf('32B Base')>=0?' hl':'')+'"><span class="nm" title="'+n+'">'+n+'</span><span class="track"><span class="fill" style="width:'+(100*v/mx).toFixed(1)+'%;background:var(--open)"></span></span><span class="val">'+fmt(v)+'</span></div>').join('');
  const S=window.STAB||[];
  if(S.length===2)$('stabMini').innerHTML=S.map(s=>stat(s.label,'loss '+s.lossSS.toFixed(2)+'% · grad '+s.gnSS.toFixed(2)+'%',fmt(s.lossSpikes)+' loss and '+fmt(s.gnSpikes)+' gradient-norm spikes in '+fmt(s.n)+' sampled points')).join('');
})();
(function(){
  // Olmo 3 report Table 13 (base aggregate scores: Math, Code, MC STEM, MC non-STEM, GenQA); tokens are cumulative
  const T={
    o3_32:[['Stage 1',5.5,[48.4,29.8,72.3,80.6,76.1]],['Stage 2 ingredient 1',5.6,[66.8,38.4,74.6,85.6,78.9]],['Stage 2 ingredient 2',5.6,[65.4,39.3,74.8,85.0,78.9]],['Stage 2 soup',5.7,[69.7,39.7,75.6,85.7,79.4]],['Stage 3 (long context)',6.2,[61.4,39.7,74.3,85.6,79.7]]],
    o3_7:[['Stage 1',5.9,[23.5,19.8,64.0,71.9,68.5]],['Stage 2',6.0,[59.8,31.9,67.2,78.2,71.3]],['Stage 3 (long context)',6.05,[54.4,30.6,66.4,78.2,72.5]]],
    o2_32:[['Stage 1',6.5,[33.2,16.0,73.0,81.7,75.8]],['Stage 2 ingredient 1',6.6,[51.6,19.9,75.1,84.5,78.5]],['Stage 2 ingredient 2',6.6,[51.9,20.0,74.1,83.8,79.1]],['Stage 2 ingredient 3',6.6,[51.5,19.6,74.4,83.6,79.0]],['Stage 2 ingredient 4',6.8,[51.9,19.2,74.6,83.3,78.3]],['Stage 2 soup',7.1,[53.9,20.5,75.3,84.2,79.1]]],
    o2_7:[['Stage 1',4.0,[12.7,7.1,61.0,70.6,68.6]],['Stage 2 ingredient 1',4.05,[40.4,10.4,64.1,74.6,72.1]],['Stage 2 ingredient 2',4.05,[41.4,10.4,64.3,74.9,71.8]],['Stage 2 ingredient 3',4.05,[40.8,10.1,64.0,74.9,72.1]],['Stage 2 soup',4.15,[41.7,10.4,64.6,75.2,72.4]]]};
  const NOTE={o3_32:'The soup averages the two midtraining runs. Long-context extension costs 8.3 Math points on this suite. The report\'s text and this table disagree on the soup\'s gain, see below.',o3_7:'The 7B midtrained checkpoint is a single run: "initial experimentation for the 7B model did not show similar gains from model merging".',o2_32:'OLMo 2 had no separate long-context stage. Cumulative tokens as Table 13 prints them.',o2_7:'Midtraining adds about 4% more tokens and more than triples the Math score.'};
  let m='o3_32',k=0;const KN=['Math','Code','MC STEM','MC non-STEM','GenQA'];
  function draw(){const rows=T[m],mx=100,first=rows[0][2][k];
    $('stg').innerHTML='<div class="bars">'+rows.map(([n,tk,v])=>{const d=v[k]-first;return '<div class="row'+(n.indexOf('soup')>=0?' hl':'')+'"><span class="nm" title="'+n+'">'+n+' <span class="mute">'+tk+'T</span></span><span class="track"><span class="fill" style="width:'+v[k]+'%;background:'+(n.startsWith('Stage 1')?'var(--dim)':n.indexOf('ingredient')>=0?'var(--acc2)':'var(--acc)')+'"></span></span><span class="val">'+v[k].toFixed(1)+(n==='Stage 1'?'':' <span class="mute small">'+(d>=0?'+':'')+d.toFixed(1)+'</span>')+'</span></div>'}).join('')+'</div>';
    $('stgNote').innerHTML=KN[k]+' aggregate on OlmoBaseEval, 0 to 100, from the {{Olmo 3 report|@o3r}}, Table 13 (by construction); the change is against Stage 1. '+NOTE[m];
  }
  segBind('stgM',v=>{m=v;draw()});segBind('stgK',v=>{k=+v;draw()});onTab('t-read',draw);draw();
})();
(function(){
  // token budget: Olmo 3 report Table 35 against Qwen3 blog
  const parts=[['Stage 1 pretraining',5.5,'var(--c1)'],['Stage 2 midtraining (2 runs)',0.2,'var(--c3)'],['Stage 3 long context',0.1,'var(--c5)']];
  const tot=parts.reduce((a,p)=>a+p[1],0);
  $('tokBar').outerHTML='<div class="bars" id="tokBar"><div class="row"><span class="nm">Qwen3 (approx.)</span><span class="track"><span class="fill" style="width:100%;background:var(--closed)"></span></span><span class="val">36T</span></div><div class="row hl"><span class="nm">Olmo 3 32B</span><span class="track">'+(function(){let x=0;return parts.map(p=>{const s='<span class="fill" style="left:'+(100*x/36).toFixed(2)+'%;width:'+Math.max(0.4,100*p[1]/36).toFixed(2)+'%;background:'+p[2]+'"></span>';x+=p[1];return s}).join('')})()+'</span><span class="val">'+tot.toFixed(1)+'T</span></div></div>';
  $('tokLeg').innerHTML=parts.map(p=>'<span><i style="background:'+p[2]+'"></i>'+p[0]+', '+(p[1]>=1?p[1]+'T':p[1]*1000+'B')+'</span>').join('')+'<span>ratio '+(36/tot).toFixed(1)+'</span>';
})();
(function(){
  // Olmo 3 report Table 14: Olmo 3 Think 32B (3.0 final), Olmo 3.1 Think 32B, Qwen 3 32B, all from Ai2's evaluation suite
  const R=[['Math','MATH',96.1,96.2,95.4],['Math','AIME 2024',76.8,80.6,80.8],['Math','AIME 2025',72.5,78.1,70.9],['Math','OMEGA',50.6,53.4,47.7],
    ['Reasoning','BigBenchHard',89.8,88.6,90.6],['Reasoning','ZebraLogic',76.0,80.1,88.3],['Reasoning','AGI Eval English',88.2,88.8,90.0],
    ['Coding','HumanEvalPlus',91.4,91.5,91.2],['Coding','MBPP+',68.0,68.3,70.6],['Coding','LiveCodeBench v3',83.5,83.3,90.2],
    ['Instruction following','IFEval',89.0,93.8,86.5],['Instruction following','IFBench',47.6,68.1,37.3],
    ['Knowledge','MMLU',85.4,86.4,88.8],['Knowledge','PopQA',31.9,30.9,30.7],['Knowledge','GPQA',58.1,56.7,67.3],['Chat','AlpacaEval 2 LC',74.2,69.1,75.6]];
  let h='<tr><th>Group</th><th>Benchmark</th><th class="num">Olmo 3 Think 32B</th><th class="num">Olmo 3.1 Think 32B</th><th class="num">Qwen 3 32B</th></tr>',w30=0,w31=0,wq=0;
  R.forEach(([g,b,a,c,q])=>{const mx=Math.max(a,c,q);if(q>a)wq++;if(q>c)w31++;
    h+='<tr><td class="mute">'+g+'</td><td>'+b+'</td>'+[a,c,q].map(v=>'<td class="num'+(v===mx?' best':'')+'">'+v.toFixed(1)+'</td>').join('')+'</tr>'});
  $('thinkT').innerHTML=h;
  $('thinkN').innerHTML='Scores from the {{Olmo 3 report|@o3r}}, Table 14, all run by Ai2 on its own suite; bold is the best of the three. Qwen 3 32B scores higher than Olmo 3 Think 32B on '+wq+' of '+R.length+' and higher than Olmo 3.1 Think 32B on '+w31+' of '+R.length+'. Olmo is close on maths and HumanEvalPlus, behind on ZebraLogic, LiveCodeBench and GPQA, and ahead on instruction following.';
})();
