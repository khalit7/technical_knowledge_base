// ---- Training lab, part c: controls, presets, the training loop (capped work per frame), scrubbing and the ten-seed check ----
(function(){
'use strict';
const LB=window.LB,$=id=>document.getElementById(id),tab=$('t-lab');if(!LB||!tab||!$('lb-ctl'))return;
const U=LB.UI={};
const nl=(t,u)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
const NP=id=>'https://app.notion.com/p/'+id;
// one row per component: key, label, options [value, label], one line, the child page that owns it
const ROWS=[
 {g:'Loss',pg:'l',rows:[
  {k:'loss',lab:'Loss',o:[['ce','Cross-entropy'],['mse','MSE on probabilities'],['ls','Label smoothing 0.1'],['focal','Focal, γ = 2']],
   ln:'What training minimises. Smoothing trains on targets 0.95 / 0.05 ('+nl('Szegedy et al. 2015','https://arxiv.org/abs/1512.00567')+'); focal down-weights easy examples by (1 − p)<sup>γ</sup> ('+nl('Lin et al. 2017','https://arxiv.org/abs/1708.02002')+').'}]},
 {g:'Activation and initialisation',pg:'a',rows:[
  {k:'act',lab:'Activation',o:[['sigmoid','Sigmoid'],['tanh','Tanh'],['relu','ReLU'],['gelu','GELU'],['silu','SiLU'],['swiglu','SwiGLU']],
   ln:'The nonlinearity in every hidden layer. GELU is the tanh form ('+nl('Hendrycks and Gimpel','https://arxiv.org/abs/1606.08415')+'); SwiGLU multiplies SiLU(xW) by a second projection xV, so twice the weights per layer ('+nl('Shazeer 2020','https://arxiv.org/abs/2002.05202')+').'},
  {k:'init',lab:'Initialisation',o:[['zeros','All zeros'],['small','Small, σ = 0.01'],['xavier','Xavier'],['he','He']],pg:'n',
   ln:'Starting weights drawn from a normal with this spread; biases start at zero. Xavier: σ = √(2 / (in + out)) ('+nl('Glorot and Bengio 2010','https://proceedings.mlr.press/v9/glorot10a.html')+'); He: σ = √(2 / in), for ReLU ('+nl('He et al. 2015','https://arxiv.org/abs/1502.01852')+').'}]},
 {g:'Normalisation and shape',pg:'n',rows:[
  {k:'norm',lab:'Normalisation',o:[['none','None'],['bn','BatchNorm'],['ln','LayerNorm'],['rms','RMSNorm']],
   ln:'In every layer from the second. BatchNorm averages over the batch ('+nl('Ioffe and Szegedy 2015','https://arxiv.org/abs/1502.03167')+'), LayerNorm over one example\'s features ('+nl('Ba et al. 2016','https://arxiv.org/abs/1607.06450')+'), RMSNorm divides by the root mean square only ('+nl('Zhang and Sennrich 2019','https://arxiv.org/abs/1910.07467')+').'},
  {k:'place',lab:'Placement',o:[['pre','Pre-norm'],['post','Post-norm']],
   ln:'Pre: normalise each layer\'s input (and, at the end, the output layer\'s input). Post: normalise each layer\'s output, after the residual add, as the original Transformer did.'},
  {k:'resid',lab:'Residual',o:[[false,'Off'],[true,'On']],ln:'Each layer from the second adds its input to its output, so the signal has a path that skips the nonlinearity.'},
  {k:'depth',lab:'Hidden layers',o:[1,2,3,4,6,8,10].map(v=>[v,String(v)]),ln:'More layers, more products in the backward pass: where vanishing and exploding gradients come from.'},
  {k:'width',lab:'Width',o:[8,16,24,32,48,64].map(v=>[v,String(v)]),ln:'Units per hidden layer. Wider nets memorise more easily and cost more per step.'}]},
 {g:'Optimiser and schedule',pg:'o',rows:[
  {k:'opt',lab:'Optimiser',o:[['sgd','SGD'],['momentum','SGD + momentum 0.9'],['adam','Adam'],['adamw','AdamW'],['muon','Muon']],
   ln:'Adam scales each weight\'s step by its gradient\'s running size ('+nl('Kingma and Ba','https://arxiv.org/abs/1412.6980')+'). Muon orthogonalises the update of each hidden square matrix ('+nl('Jordan 2024','https://kellerjordan.github.io/posts/muon/')+'; as '+nl('torch.optim.Muon','https://docs.pytorch.org/docs/stable/generated/torch.optim.Muon.html')+'), AdamW for the rest.'},
  {k:'lr',lab:'Learning rate',o:[0.0003,0.001,0.003,0.01,0.03,0.05,0.1,0.3,1].map(v=>[v,String(v)]),ln:'The peak step size. Adam-family optimisers usually want a much smaller one than SGD.'},
  {k:'sched',lab:'Schedule',o:[['constant','Constant'],['step','Step: ×0.1 at 50% and 75%'],['cosine','Cosine to zero'],['wsd','WSD: decay in the last 20%']],
   ln:'How the rate moves after warmup. WSD (warmup, stable, decay) holds it flat and decays linearly at the end ('+nl('Hu et al. 2024, MiniCPM','https://arxiv.org/abs/2404.06395')+').'},
  {k:'warm',lab:'Warmup',o:[[0,'None'],[0.05,'5% of steps'],[0.1,'10% of steps'],[0.2,'20% of steps']],ln:'The rate rises linearly from near zero to its peak over this share of the run ('+nl('Goyal et al. 2017','https://arxiv.org/abs/1706.02677')+').'},
  {k:'bs',lab:'Batch size',o:[[8,'8'],[16,'16'],[32,'32'],[64,'64'],[0,'All points']],ln:'Points per step. Smaller batches give noisier gradients and more steps per pass over the data.'}]},
 {g:'Regularisation',pg:'r',rows:[
  {k:'wd',lab:'Weight decay λ',o:[0,0.0001,0.001,0.01,0.1,0.5].map(v=>[v,String(v)]),ln:'Pulls weight matrices towards zero each step.'},
  {k:'wdMode',lab:'Decay applied as',o:[['l2','L2 in the gradient'],['wd','Decoupled']],
   ln:'For SGD and momentum: add λw to the gradient (L2), or multiply the weights by 1 − lr·λ (decoupled). Fixed by the optimiser otherwise: Adam is L2, AdamW and Muon decoupled ('+nl('Loshchilov and Hutter 2019','https://arxiv.org/abs/1711.05101')+').'},
  {k:'drop',lab:'Dropout',o:[0,0.1,0.2,0.4,0.6].map(v=>[v,String(v)]),ln:'Share of hidden units zeroed at random at each training step, the rest scaled up by 1 / (1 − p); off when measuring ('+nl('Srivastava et al. 2014','https://jmlr.org/papers/v15/srivastava14a.html')+').'},
  {k:'early',lab:'Early stopping',o:[[false,'Off'],[true,'On']],ln:'Stop when validation loss has not improved for 15% of the run.'}]}
];
const SHROWS=[
 {k:'task',lab:'Task',o:Object.keys(LB.TASKS).map(k=>[k,LB.TASKS[k].name])},
 {k:'n',lab:'Training points',o:[40,80,200,400].map(v=>[v,String(v)])},
 {k:'noise',lab:'Labels flipped',o:[[0,'None'],[0.1,'10%'],[0.2,'20%'],[0.3,'30%']]},
 {k:'steps',lab:'Steps',o:[500,1000,1500,2000,3000].map(v=>[v,v.toLocaleString('en-GB')])},
 {k:'seed',lab:'Seed',o:[1,2,3,4,5,6,7,8,9,10].map(v=>[v,String(v)])}];
const ALL=ROWS.flatMap(g=>g.rows);U.ROWS=ALL;
const optLabel=(k,v)=>{const r=ALL.find(x=>x.k===k)||SHROWS.find(x=>x.k===k);const o=r&&r.o.find(x=>x[0]===v);return o?o[1]:String(v)};U.optLabel=optLabel;

// ---------- state ----------
const S={A:{...LB.DEF},B:{...LB.DEF,act:'sigmoid'},sh:{...LB.SHDEF},preset:null,playing:false,follow:true,view:0,runs:null,dirty:true};U.S=S;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;

function effMode(c){return c.opt==='adam'?'l2':LB.decoupledOf(c.opt)?'wd':c.wdMode}
U.effMode=effMode;
function build(){const sh={...S.sh},d=LB.makeData(sh.task,sh.n,sh.noise,sh.seed);S.data=d;
  S.runs=[new LB.Run({...S.A},d,sh),new LB.Run({...S.B},d,sh)];S.view=0;S.follow=true;S.dirty=true;updScrub()}
U.build=build;

// ---------- controls ----------
function sel(id,opts,v,aria){return '<select id="'+id+'" aria-label="'+aria+'">'+opts.map((o,i)=>'<option value="'+i+'"'+(o[0]===v?' selected':'')+'>'+o[1]+'</option>').join('')+'</select>'}
function drawCtl(){let h='<div class="lb-row hd"><div class="lbl">Component</div><div class="ca">Run A</div><div class="cb">Run B</div></div>';
  ROWS.forEach(g=>{const p=LB.PAGES[g.pg];h+='<div class="lb-grp">'+g.g+' · <a href="'+NP(p[1])+'" target="_blank" rel="noopener noreferrer">'+p[0]+'</a></div>';
    g.rows.forEach(r=>{h+='<div class="lb-row" id="lb-r-'+r.k+'"><div class="lbl"><div class="nm">'+r.lab+'</div><div class="ln">'+r.ln+'</div></div>'+
      sel('lb-a-'+r.k,r.o,S.A[r.k],r.lab+', run A')+sel('lb-b-'+r.k,r.o,S.B[r.k],r.lab+', run B')+'</div>'})});
  $('lb-ctl').innerHTML=h;
  $('lb-sh').innerHTML=SHROWS.map(r=>'<label>'+r.lab+sel('lb-s-'+r.k,r.o,S.sh[r.k],r.lab)+'</label>').join('');
  ALL.forEach(r=>['A','B'].forEach(w=>{$('lb-'+w.toLowerCase()+'-'+r.k).addEventListener('change',e=>{S[w][r.k]=r.o[+e.target.value][0];changed()})}));
  SHROWS.forEach(r=>$('lb-s-'+r.k).addEventListener('change',e=>{S.sh[r.k]=r.o[+e.target.value][0];changed()}));
  syncCtl()}
function syncCtl(){ALL.forEach(r=>{['A','B'].forEach(w=>{const el=$('lb-'+w.toLowerCase()+'-'+r.k);let v=S[w][r.k];if(r.k==='wdMode')v=effMode(S[w]);
      const i=r.o.findIndex(o=>o[0]===v);if(i>=0)el.value=String(i);if(r.k==='wdMode')el.disabled=S[w].opt!=='sgd'&&S[w].opt!=='momentum'});
    const a=r.k==='wdMode'?effMode(S.A):S.A[r.k],b=r.k==='wdMode'?effMode(S.B):S.B[r.k];$('lb-r-'+r.k).classList.toggle('diff',a!==b)});
  SHROWS.forEach(r=>{const i=r.o.findIndex(o=>o[0]===S.sh[r.k]);if(i>=0)$('lb-s-'+r.k).value=String(i)})}
U.syncCtl=syncCtl;
function changed(){S.preset=null;drawPre();drawCard();syncCtl();build();U.render&&U.render(true);clearSeeds()}
function copy(f,t){S[t]={...S[f]};changed()}
$('lb-copyab').addEventListener('click',()=>copy('A','B'));$('lb-copyba').addEventListener('click',()=>copy('B','A'));
$('lb-swap').addEventListener('click',()=>{const a=S.A;S.A=S.B;S.B=a;changed()});

// ---------- presets ----------
function drawPre(){$('lb-pre').innerHTML=LB.PRESETS.map(p=>'<button data-p="'+p.id+'" class="'+(S.preset===p.id?'on':'')+'" aria-pressed="'+(S.preset===p.id)+'">'+p.name+'</button>').join('')+
  '<button data-p="" class="'+(S.preset?'':'on')+'" aria-pressed="'+(!S.preset)+'">Your own</button>';
  $('lb-pre').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{b.dataset.p?setPreset(b.dataset.p,true):(S.preset=null,drawPre(),drawCard())}))}
function drawCard(){const P=LB.PRESETS.find(p=>p.id===S.preset);
  if(!P){$('lb-card').innerHTML='<h3>Your own comparison</h3><p>Set A and B in the controls below; the rows where they differ are highlighted. Press Play to train both, and use the ten-seed check to see whether a difference survives a change of seed.</p>';return}
  const pg=LB.PAGES[P.link];
  $('lb-card').innerHTML='<h3>'+P.name+'</h3><p class="see"><b>What you should see.</b> '+P.see+'</p><p><b>Why.</b> '+P.why+' More on %PG%.</p>'.replace('%PG%','<a href="'+NP(pg[1])+'" target="_blank" rel="noopener noreferrer">'+pg[0]+'</a>')+
   '<ul class="lb-claims">'+P.claims.map(c=>'<li><span class="n'+(c.dep?' dep':'')+'">'+c.ok+' of 10</span><span>'+c.t+(c.dep?' <span class="dep">(seed-dependent)</span>':'')+'</span></li>').join('')+'</ul>'+
   '<p class="lb-note">Counts are over seeds 1 to 10, measured with this page\'s code; re-run them under %SD%.</p>'.replace('%SD%','<a href="#lb-s-seeds">Does it happen on every seed?</a>')}
function setPreset(id,play){const P=LB.PRESETS.find(p=>p.id===id);if(!P)return;S.preset=id;S.A={...LB.DEF,...P.a};S.B={...LB.DEF,...P.b};S.sh={...LB.SHDEF,...P.sh,seed:S.sh.seed||1};
  drawPre();drawCard();syncCtl();build();clearSeeds();U.render&&U.render(true);if(play&&!RM)setPlay(true)}
U.setPreset=setPreset;

// ---------- the loop: both runs advance together; work per frame is capped by time ----------
const BUDGET={1:2,2:9,3:16};// milliseconds of training per frame
let raf=0,lastDraw=0;
function visible(){return !tab.hidden&&!document.hidden}
function setPlay(on){S.playing=on;$('lb-play').textContent=on?'Pause':(allDone()?'Replay':'Play');$('lb-play').setAttribute('aria-pressed',String(on));if(on){if(allDone())build();S.follow=true;kick()}}
U.setPlay=setPlay;
function allDone(){return S.runs&&S.runs.every(r=>r.done)}
function stepBoth(){const[a,b]=S.runs;if(!a.done)a.step();if(!b.done)b.step()}
function kick(){if(!raf)raf=requestAnimationFrame(frame)}
function frame(ts){raf=0;if(!S.playing||!visible())return;
  const sp=+$('lb-speed').value,lim=BUDGET[sp],t0=performance.now();
  if(sp===1){for(let i=0;i<2;i++)stepBoth()}else{let n=0;while(performance.now()-t0<lim&&!allDone()){stepBoth();n++}}
  if(ts-lastDraw>45||allDone()){lastDraw=ts;updScrub();U.render&&U.render(false)}
  if(allDone()){setPlay(false);updScrub();U.render&&U.render(false);return}kick()}
document.addEventListener('visibilitychange',()=>{if(visible()&&S.playing)kick()});
// when the tab is shown again, the tab script calls the registered render; resume the loop from there
$('lb-play').addEventListener('click',()=>setPlay(!S.playing));
$('lb-step').addEventListener('click',()=>{setPlay(false);const r=S.runs[0],n=Math.max(1,r.every);for(let i=0;i<n&&!allDone();i++)stepBoth();S.follow=true;updScrub();U.render(false);$('lb-play').textContent=allDone()?'Replay':'Play'});
$('lb-reset').addEventListener('click',()=>{const p=S.playing;build();U.render(true);setPlay(p)});

// ---------- scrubbing: show any recorded step; following the live step when the slider is at its end ----------
function cur(){return Math.max(...S.runs.map(r=>r.t))}
function updScrub(){const sc=$('lb-scrub'),c=cur();sc.max=String(S.sh.steps);if(S.follow)S.view=c;sc.value=String(Math.min(S.view,c));
  $('lb-scrubv').textContent='step '+S.view.toLocaleString('en-GB');$('lb-stepn').textContent='trained '+c.toLocaleString('en-GB')+' of '+S.sh.steps.toLocaleString('en-GB')+' steps'}
U.updScrub=updScrub;
$('lb-scrub').addEventListener('input',e=>{const c=cur();let v=+e.target.value;if(v>=c){v=c;S.follow=true}else S.follow=false;S.view=v;e.target.value=String(v);
  $('lb-scrubv').textContent='step '+v.toLocaleString('en-GB');U.render(false)});

// ---------- ten seeds, in slices so the page stays responsive ----------
let seedJob=null;
function clearSeeds(){if(seedJob)seedJob.cancel=true;seedJob=null;$('lb-seeds').innerHTML='';$('lb-seedgo').disabled=false}
U.clearSeeds=clearSeeds;
$('lb-seedgo').addEventListener('click',()=>{clearSeeds();const P=LB.PRESETS.find(p=>p.id===S.preset),A={...S.A},B={...S.B},sh0={...S.sh},rows=[];
  const job={cancel:false,seed:1,pair:null};seedJob=job;$('lb-seedgo').disabled=true;
  const claims=P?P.claims:[];
  const head='<div class="tw"><table><thead><tr><th>Seed</th><th class="num">A val. acc.</th><th class="num">B val. acc.</th><th class="num">A val. loss</th><th class="num">B val. loss</th>'+claims.map((c,i)=>'<th class="num">Claim '+(i+1)+'</th>').join('')+'</tr></thead><tbody>';
  const fmtR=(x,r)=>r.div?'diverged':x;
  function show(done){const cnt=claims.map((c,i)=>rows.filter(r=>r.res[i]).length);
    let h=(done?'':'<div class="lb-note">Running seed '+job.seed+' of 10…</div>')+head+rows.map(r=>'<tr><td>'+r.seed+'</td><td class="num">'+fmtR((r.A.vaA*100).toFixed(1)+'%',r.A)+'</td><td class="num">'+fmtR((r.B.vaA*100).toFixed(1)+'%',r.B)+'</td><td class="num">'+r.A.vaL.toFixed(3)+'</td><td class="num">'+r.B.vaL.toFixed(3)+'</td>'+
      r.res.map(v=>'<td class="num '+(v?'y':'n')+'">'+(v?'yes':'no')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
    if(claims.length)h+=claims.map((c,i)=>'<div class="res">Claim '+(i+1)+', '+c.t+': '+cnt[i]+' of '+rows.length+' seeds'+(done?(cnt[i]===c.ok?' (as stated)':' (stated '+c.ok+')'):'')+'</div>').join('');
    else if(done)h+='<div class="lb-note">No preset is selected, so there are no claims to check: compare the columns.</div>';
    $('lb-seeds').innerHTML=h}
  show(false);
  function tick(){if(job.cancel)return;const t0=performance.now();
    while(performance.now()-t0<14){if(!job.pair){const sh={...sh0,seed:job.seed,light:true},d=LB.makeData(sh.task,sh.n,sh.noise,job.seed);job.pair=[new LB.Run(A,d,sh),new LB.Run(B,d,sh)]}
      const[a,b]=job.pair;for(let i=0;i<4;i++){if(!a.done)a.step();if(!b.done)b.step()}
      if(a.done&&b.done){const sa=LB.summ(a),sb=LB.summ(b);rows.push({seed:job.seed,A:sa,B:sb,res:claims.map(c=>!!c.j(sa,sb))});job.pair=null;job.seed++;show(job.seed>10);if(job.seed>10){$('lb-seedgo').disabled=false;seedJob=null;return}}}
    setTimeout(tick,0)}
  setTimeout(tick,0)});

// ---------- first show ----------
let inited=false;
function init(){if(inited)return;inited=true;drawCtl();setPreset(LB.PRESETS[1].id,false);setPlay(false)}
U.init=init;
window.TAB_RENDER=window.TAB_RENDER||{};(window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(()=>{init();U.render&&U.render(true);if(S.playing)kick()});
// test hook for src/lab/check_lab.mjs: finish both runs at once
window.LB_TEST={S,finish(){while(!allDone())stepBoth();S.follow=true;updScrub();U.render(true)},setPreset,setPlay,allDone};
})();
