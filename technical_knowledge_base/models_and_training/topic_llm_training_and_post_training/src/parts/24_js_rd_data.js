// ---- Reading, Axis 2: how much data each stage used, and who made it, filling in year by year; its steps are explained in the list beside it (#sx-dt) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-dt'))return;
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
  // the step texts are the ol.sx list beside the figure (#sx-dt), one item per year group
  const NS=1+Math.max(...R.map(r=>r.y));
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
}
  RD.anim({card:'rd-dt',ctl:'rd-dtC',n:NS,list:'sx-dt',draw,ms:5200,label:'Year'});
})();
