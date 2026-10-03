// ---- Reading, "Choosing a path": what you need, and the stages, data, cost and failure that come with it ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-chF'))return;
  const C=[
    {b:'A format, tone or persona',h:'SFT with LoRA, then DPO if taste matters',
     kv:[['Stages','SFT on a few thousand good examples, through LoRA on every weight matrix; DPO on preference pairs if people disagree about what "good" is'],
         ['Data','Hundreds to a few thousand demonstrations, often written by a stronger model; quality over count (LIMA used 1,000)'],
         ['Cost','One GPU: QLoRA fits a 65B base under 48 GB'],
         ['Watch for','A chat template that differs between training and serving; verbosity creeping in from DPO']]},
    {b:'Domain knowledge',h:'Mid-training or continued pretraining, then post-training again',
     kv:[['Stages','Full-parameter next-token training on the domain, then re-run SFT and preference optimisation, since CPT breaks instruction following'],
         ['Data','Billions of tokens, selected hard (Thomson Reuters kept 200B of 19T), with general replay mixed in'],
         ['Cost','A few percent of the base model\'s pretraining; Thomson Reuters\' final run on a 397B base cost $450K (its $40M is a two-year programme including staff)'],
         ['Watch for','Forgetting: re-warm to a lower learning-rate peak and compare against the base model fine-tuned without CPT']]},
    {b:'A narrow task with a checker',h:'Distil, adapt cheaply, then RL against the checker',
     kv:[['Stages','SFT on traces from a frontier model through LoRA, then RLVR (GRPO or a variant) in the real environment'],
         ['Data','A few hundred teacher trajectories plus thousands of tasks the checker can score (the Postgres planner: 400 and 13,646)'],
         ['Cost','Hundreds to a few thousand dollars at 4B: $1,200 for the Postgres planner, SFT and RL'],
         ['Watch for','The checker being gamed; gains that need the same workload to repeat to pay off']]},
    {b:'Reasoning in a small model',h:'Distil from a reasoning teacher, ideally on-policy',
     kv:[['Stages','SFT on a reasoning model\'s verified traces, then on-policy distillation or a short RL stage'],
         ['Data','Hundreds of thousands of verified traces (R1: 800K)'],
         ['Cost','SFT-priced: on the same 32B base, SFT on R1\'s samples beat 10,000+ steps of RL, 72.6% to 47.0% on AIME 2024'],
         ['Watch for','A teacher too far above the student; traces that teach the format without the checking']]},
    {b:'An agent that acts',h:'RL in environments, with the sandbox as part of the budget',
     kv:[['Stages','SFT for the tool format, then RL over many task environments, often asynchronous'],
         ['Data','Thousands of environments with their own checkers (MiMo-V2.6: 7,000+; Mercor: 1,928 expert tasks)'],
         ['Cost','Dominated by rollouts and sandboxes; MiMo-V2.6-Pro\'s final RL stage cost $2.62M in under six days'],
         ['Watch for','Reward hacking through the environment; an inescapable sandbox removes a class of it before the reward has to']]},
    {b:'Less hardware at serving',h:'Quantize first, then distil or go sparse',
     kv:[['Stages','Post-training quantization (FP8 is close to lossless; about 4.9 bits is llama.cpp\'s default), quantization-aware training for lower, distillation for a smaller model'],
         ['Data','A small calibration set that looks like real use'],
         ['Cost','Hours of compute for quantization; a training run for distillation'],
         ['Watch for','The low-bit cliff below about 3 bits for dense models, and calibration data unlike your traffic']]},
    {b:'Pretrain from scratch',h:'Only for a new language, modality, domain or research question',
     kv:[['Stages','Pretraining, a mid-training anneal, long-context extension, then the whole post-training pipeline'],
         ['Data','Trillions of filtered tokens; data quality is the bigger lever'],
         ['Cost','About 6 × parameters × tokens FLOPs: size it in the {{Scaling calculator|#t-scale}}, copy a recipe from {{Open recipes compared|#t-recipes}}'],
         ['Watch for','Loss spikes and hardware failures; plan checkpoints around a failure every few hours at scale']]}
  ];
  $('rd-chF').innerHTML=C.map((c,i)=>'<button data-c="'+i+'"'+(i?'':' class="on"')+'>'+c.b+'</button>').join('');
  function draw(i){$('rd-chF').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.c===i));const c=C[i];
    $('rd-chD').innerHTML='<h3>'+c.h+'</h3><dl class="kv">'+c.kv.map(k=>'<dt>'+k[0]+'</dt><dd>'+k[1]+'</dd>').join('')+'</dl>'}
  $('rd-chF').addEventListener('click',e=>{const b=e.target.closest('button[data-c]');if(b)draw(+b.dataset.c)});
  draw(0);
  RD.tabLinks($('rd-chD'));
})();
