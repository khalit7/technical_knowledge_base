// ---- Reading, "The lifecycle in one screen": stage x axis grid; click a cell to show its paragraph (static text in #rd-gsrc, so search and the ledger see it) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-grid'))return;
    const AX=[{n:'What it changes',s:'#rd-a1'},{n:'Data',s:'#rd-a2'},{n:'Cost',s:'#rd-a3'},{n:'What goes wrong',s:'#rd-a4'}];
  const AXS=['the signal','how much, who makes it','compute, memory, dollars','and the defence'];
  const ST=[
  {g:'Building the base'},
  {n:'Pretraining',k:'next-token, from scratch',page:`{{Pretraining|n:3c65c17b0d0d814f82cffd0d5c0dd5ba}}`,c:[
    'Every weight, from random',
    'Trillions of web tokens',
    'Most of the compute',
    'Divergence, failing hardware']},
  {n:'Mid-training, CPT, long context',k:'same objective, shifted mix',page:`{{Data mixing|n:3c65c17b0d0d819ea5d6c59471e66875}}`,c:[
    'Domain, quality, length',
    'Billions of curated tokens',
    'A few % of pretraining',
    'Forgetting']},
  {g:'Post-training'},
  {n:'SFT',k:'imitate demonstrations',page:`{{Alignment|n:3c65c17b0d0d81d5bed7e608d4061c7a}}`,c:[
    'Format and persona',
    'Thousands of demonstrations',
    'Small',
    'Imitation without skill']},
  {n:'Preference optimisation',k:'RLHF with PPO, DPO family',page:`{{Alignment|n:3c65c17b0d0d81d5bed7e608d4061c7a}}`,c:[
    'Which answer is preferred',
    'Tens of thousands of pairs',
    'Four models, or two',
    'Reward hacking']},
  {n:'RLVR',k:'RL against a checker: GRPO and successors',page:`{{Alignment|n:3c65c17b0d0d81d5bed7e608d4061c7a}}`,c:[
    'Reasoning, agency',
    'Problems and environments',
    'Rollouts and environments',
    'Verifier gaming, collapse']},
  {g:'Making it cheaper'},
  {n:'Distillation',k:'a student imitates a teacher',page:`{{Distillation and Small Language Models|n:3c65c17b0d0d81efa2a8c3b3b623eb09}}`,c:[
    'A smaller model',
    'Teacher outputs',
    'Cheap per point',
    'Inherits the teacher']},
  {n:'PEFT (LoRA, QLoRA)',k:'train a small add-on',page:`{{PEFT|n:3c65c17b0d0d81eba08eef56b3e3b4eb}}`,c:[
    'A low-rank add-on',
    'Whatever the stage needs',
    'One GPU',
    'A capacity ceiling']},
  {n:'Quantization, precision',k:'fewer bits per weight',page:`{{Quantization and Precision|n:3c65c17b0d0d817b8f41ff66fba4cd0e}}`,c:[
    'How weights are stored',
    'A calibration set, or none',
    'Saves memory and time',
    'Outliers, the low-bit cliff']}
  ];
  let sel=[4,1];
  const rows=ST.map((r,ri)=>r.g?'<tr class="sep"><th colspan="5">'+r.g+'</th></tr>':
    '<tr><th class="st" scope="row">'+r.n+'<small>'+r.k+'</small></th>'+r.c.map((c,ci)=>'<td><button data-r="'+ri+'" data-c="'+ci+'" aria-label="'+r.n+': '+AX[ci].n+'">'+c+'</button></td>').join('')+'</tr>').join('');
  $('rd-grid').innerHTML='<thead><tr><th class="st">Stage</th>'+AX.map((a,i)=>'<th>'+(i+1)+' · '+a.n+'<small>'+AXS[i]+'</small></th>').join('')+'</tr></thead><tbody>'+rows+'</tbody>';
  function draw(){const [ri,ci]=sel,r=ST[ri],src=document.querySelector('#rd-gsrc [data-g="'+ri+'-'+ci+'"]');
    $('rd-grid').querySelectorAll('td button').forEach(b=>b.classList.toggle('on',+b.dataset.r===ri&&+b.dataset.c===ci));
    $('rd-gdet').innerHTML='<h3>'+r.n+' · '+AX[ci].n+'</h3><p>'+(src?src.innerHTML.replace(/^<b>[^<]*<\/b>\s*/,''):'')+'</p><p class="go">Compared across all stages: <a href="'+AX[ci].s+'">Axis '+(ci+1)+'</a>. In depth: '+r.page+'.</p>'}
  $('rd-grid').addEventListener('click',e=>{const b=e.target.closest('button[data-r]');if(!b)return;sel=[+b.dataset.r,+b.dataset.c];draw()});
  RD.tabLinks($('rd-gdet'));
  draw();
})();
