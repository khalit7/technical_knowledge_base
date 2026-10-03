// ---- Reading, Axis 2: how much data each stage used, and who made it, filling in year by year ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-dt'))return;
  const N=u=>'https://app.notion.com/p/'+u, L=(t,u)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const COL={web:'var(--dim)',ppl:'var(--c1)',ai:'var(--c4)',chk:'var(--c3)'};
  // y: step index (year group); p: panel; v: count as the source gives it; f: label
  const R=[
    {y:0,p:'t',n:'GPT-3 pretraining',v:300e9,f:'300B',w:'web',st:'pretraining'},
    {y:1,p:'t',n:'Chinchilla 70B',v:1.4e12,f:'1.4T',w:'web',st:'pretraining'},
    {y:1,p:'e',n:'InstructGPT SFT',v:13e3,f:'about 13k',w:'ppl',st:'SFT demonstrations'},
    {y:1,p:'e',n:'InstructGPT reward model',v:33e3,f:'33k',w:'ppl',st:'ranked prompts'},
    {y:1,p:'e',n:'InstructGPT PPO',v:31e3,f:'31k',w:'ai',st:'prompts, scored by the reward model'},
    {y:1,p:'e',n:'Constitutional AI, harmless',v:182831,f:'182,831',w:'ai',st:'comparisons labelled by a model'},
    {y:1,p:'e',n:'Constitutional AI, helpful',v:135296,f:'135,296',w:'ppl',st:'human comparisons'},
    {y:2,p:'e',n:'LIMA SFT',v:1000,f:'1,000',w:'ppl',st:'curated examples'},
    {y:3,p:'t',n:'Llama 3 405B',v:15.6e12,f:'15.6T',w:'web',st:'pretraining'},
    {y:3,p:'t',n:'Llama 3 long context',v:800e9,f:'about 800B',w:'web',st:'8K to 128K'},
    {y:3,p:'t',n:'DeepSeekMath corpus',v:120.2e9,f:'120.2B',w:'web',st:'mined maths pages'},
    {y:3,p:'t',n:'OLMo 2 7B anneal',v:50e9,f:'50B (×3)',w:'web',st:'mid-training'},
    {y:4,p:'e',n:'DeepSeek-R1 distillation',v:800e3,f:'800K',w:'ai',st:'samples for students'},
    {y:5,p:'t',n:'Thomson Reuters mid-training',v:200e9,f:'200B of 19T',w:'web',st:'selected tokens'},
    {y:5,p:'e',n:'Mercor RL tasks',v:1928,f:'1,928',w:'ppl',st:'expert-made tasks'},
    {y:5,p:'e',n:'MiMo-V2.6 RL environments',v:7000,f:'7,000+',w:'chk',st:'task environments'},
    {y:5,p:'e',n:'Postgres planner RL',v:13646,f:'13,646',w:'chk',st:'queries, timed by Postgres'},
    {y:5,p:'e',n:'Postgres planner SFT',v:400,f:'400',w:'ai',st:'GPT-6 Astra trajectories'},
    {y:5,p:'e',n:'ToolGrad SFT',v:500,f:'500',w:'chk',st:'verified API chains'}
  ];
  const STEP=[
    {t:'2020: pretraining reads what the web already holds',p:'GPT-3 trained on 300B tokens of filtered web text, books and Wikipedia ('+L('GPT-3 paper page',N('3c65c17b0d0d8193ac92c7648cfaca12'))+'). Nobody wrote any of it for the model.'},
    {t:'2022: more tokens per parameter, and the first labelled post-training',p:'Chinchilla moved pretraining to about 20 tokens per parameter ('+L('Chinchilla',N('3c65c17b0d0d8116b7ddffba5c599f3f'))+'). InstructGPT hired about 40 contractors for about 13k demonstrations and 33k ranked prompts ('+L('InstructGPT',N('3c65c17b0d0d8180b958d8299996a063'))+'); within the year, Constitutional AI had a model label 182,831 harmlessness comparisons from 16 written principles ('+L('Constitutional AI',N('3c65c17b0d0d815a9b31e9443961c700'))+').'},
    {t:'2023: less, but better',p:'LIMA argued that 1,000 carefully chosen examples are enough for SFT, since the knowledge is already in the base model ('+L('LIMA','https://arxiv.org/abs/2305.11206')+').'},
    {t:'2024: pretraining scales, and mid-training gets its own data',p:'Llama 3 405B read 15.6T tokens, then about 800B more to extend its context from 8K to 128K ('+L('Llama 3',N('3c65c17b0d0d81aca58ccb9d720b474e'))+'); DeepSeekMath mined 120.2B tokens of maths from Common Crawl ('+L('DeepSeekMath',N('3c65c17b0d0d817f9fc5cb9a9fbcbee5'))+'); OLMo 2 annealed on a curated 50B-token mix, three times, and averaged the results ('+L('OLMo 2',N('3c65c17b0d0d81fb9857fb956165ae1c'))+').'},
    {t:'2025: a model writes the training set for smaller models',p:'DeepSeek-R1\'s 800K samples (about 600K reasoning traces, 200K other) taught 1.5B to 70B students to reason by SFT alone ('+L('DeepSeek-R1',N('3c65c17b0d0d813faca4f7a51eaa0c65'))+').'},
    {t:'2026: checkers and environments, and selection from huge pools',p:'Thomson Reuters kept 200B of 19T tokens ('+L('The Batch','https://www.deeplearning.ai/the-batch/custom-models-for-law-news-and-finance')+'). RL data is now tasks with a checker: 1,928 expert-made tasks ('+L('Mercor','https://www.mercor.com/blog/training-frontier-knowledge-work-agents-a-397b-rl-training-guide-with-skyrl/')+'), 7,000+ environments ('+L('MiMo-V2.6 card','https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL')+'), 13,646 queries timed by Postgres itself after 400 SFT trajectories from GPT-6 Astra ('+L('write-up','https://rohanbansal.com/qorl')+'), 500 API chains verified before their questions were written ('+L('ToolGrad','https://research.google/blog/toolgrad-efficient-tool-use-dataset-generation-with-textual-gradients')+').'}
  ];
  const PAN={t:{n:'Tokens',lo:10,hi:14},e:{n:'Examples, prompts, tasks or environments',lo:2,hi:6}};
  function panel(k,i){const P=PAN[k];
    let h='<div class="band" style="margin-top:10px">'+P.n+' (log scale, 10<sup>'+P.lo+'</sup> to 10<sup>'+P.hi+'</sup>)</div>';
    R.filter(r=>r.p===k).forEach(r=>{const on=r.y<=i,nw=r.y===i;
      const pct=Math.max(2,100*(Math.log10(r.v)-P.lo)/(P.hi-P.lo));
      h+='<div class="mm-row" style="opacity:'+(on?1:.25)+'"><span class="nm"'+(nw?' style="font-weight:600"':'')+'>'+r.n+'<small>'+r.st+'</small></span>'+
        '<span class="track"><span class="fill" style="width:'+(on?pct.toFixed(1):0)+'%;background:'+COL[r.w]+';transition:width .5s"></span></span>'+
        '<span class="val">'+(on?r.f:'')+'</span></div>'});
    return h}
  function draw(i){$('rd-dtSvg').innerHTML=panel('t',i)+panel('e',i);
    $('rd-dtT').textContent=(i+1)+' of '+STEP.length+' · '+STEP[i].t;$('rd-dtP').innerHTML=STEP[i].p}
  RD.anim({card:'rd-dt',ctl:'rd-dtC',n:STEP.length,start:STEP.length-1,draw,ms:3600,label:'Year'});
})();
