// ---- R1: the recipe as a flow, and the distilled students ----
(function(){
  const R1='https://arxiv.org/abs/2501.12948';
  const ST=[
    {n:'V3-Base',x:8,y:90,w:76,d:'The pretrained V3 (671B total, 37B active). Every R1 stage starts from it or from a checkpoint built on it.'},
    {n:'R1-Zero',x:110,y:10,w:104,d:'<b>Pure RL, no supervised data.</b> GRPO on the base model with rule-based rewards only: accuracy (a checkable answer, tests that pass) and format (reasoning inside think tags). AIME 2024 pass@1 rose from 15.6% to 71.0% over thousands of steps, and to 86.7% with majority voting. Reflection appeared unprompted; an intermediate checkpoint wrote "Wait, wait. Wait. That\'s an aha moment I can flag here. Let\'s reevaluate this step-by-step". <b>Its flaw:</b> poor readability and language mixing.'},
    {n:'Cold-start SFT',x:110,y:90,w:96,d:'<b>"Thousands" of long chain-of-thought examples</b>, from few-shot prompting, from prompting for detailed answers with reflection, and from R1-Zero outputs gathered in a readable format, all refined by human annotators. <b>Fixes:</b> readability (a summary at the end of every answer) and the unstable start of RL from a raw base.'},
    {n:'Reasoning RL',x:232,y:90,w:92,d:'The same large-scale RL as R1-Zero on reasoning tasks (coding, mathematics, science, logic), plus a <b>language-consistency reward</b>: the share of target-language words in the chain of thought. <b>Fixes:</b> language mixing, at a slight cost in benchmark score.'},
    {n:'Rejection sampling',x:350,y:90,w:100,d:'From the converged RL checkpoint, sample several answers per prompt and keep only the correct, readable ones: <b>about 600K reasoning samples</b>. Together with the 200K non-reasoning samples: <b>about 800K</b>.'},
    {n:'SFT on 800K',x:350,y:170,w:100,d:'Fine-tune <b>V3-Base itself</b> (not the RL checkpoint) for two epochs on the 800K samples: what the RL stages learned reaches the final model as data.'},
    {n:'RL, all scenarios',x:476,y:170,w:86,d:'A second RL stage for helpfulness and harmlessness while refining reasoning: <b>rule-based rewards</b> for mathematics, code and logic, <b>learned reward models</b> for general prompts.'},
    {n:'R1',x:586,y:170,w:46,d:'The released model: AIME 2024 pass@1 79.8%, MIT licence.'},
    {n:'Distilled students',x:476,y:90,w:156,d:'<b>Supervised fine-tuning only</b>, no RL: Qwen2.5-Math-1.5B and 7B, Qwen2.5-14B and 32B, Llama-3.1-8B and Llama-3.3-70B-Instruct, each fine-tuned on the same 800K samples. The scatter below shows what they kept.'},
    {n:'V3 SFT data',x:350,y:10,w:100,d:'<b>About 200K non-reasoning samples</b> (writing, factual QA, self-cognition, translation), from the DeepSeek-V3 pipeline, reusing part of V3\'s own supervised dataset.'}];
  let sel=1;
  function draw(){
    const bw=k=>Math.max(2,k/20000);// px per sample: 800K = 40 px
    let s='';
    const box=(i)=>{const q=ST[i],on=i===sel;return '<g data-i="'+i+'" style="cursor:pointer" tabindex="0" role="button" aria-label="'+q.n+'"><rect x="'+q.x+'" y="'+q.y+'" width="'+q.w+'" height="40" rx="6" class="'+(on?'boxa':i===7?'boxc':'box')+'" stroke-width="'+(on?2:1)+'"/><text x="'+(q.x+q.w/2)+'" y="'+(q.y+24)+'" font-size="11.5" text-anchor="middle">'+q.n+'</text></g>'};
    const band=(x1,y1,x2,y2,w,c)=>{const v=x1===x2,m=v?(y1+y2)/2:(x1+x2)/2;return '<path d="M'+x1+','+y1+' C'+(v?x1+','+m+' '+x2+','+m:m+','+y1+' '+m+','+y2)+' '+x2+','+y2+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-opacity=".5"/>'};
    const tx=(x,y,t,c,a)=>'<text x="'+x+'" y="'+y+'" font-size="10.5" text-anchor="'+(a||'middle')+'" fill="'+(c||'var(--mute)')+'">'+t+'</text>';
    s+=band(84,100,110,30,3,'var(--c4)')+tx(80,58,'GRPO','var(--c4)');
    s+=band(160,50,160,90,2,'var(--c4)')+tx(166,74,'readable R1-Zero outputs','var(--mute)','start');
    s+=band(84,110,110,110,2,'var(--c1)')+band(206,110,232,110,2,'var(--c1)');
    s+=band(324,110,350,110,bw(600e3),'var(--c2)')+tx(337,90,'600K');
    s+=band(400,50,400,90,bw(200e3),'var(--c5)')+tx(412,74,'200K','var(--mute)','start');
    s+=band(450,110,476,110,bw(800e3),'var(--c2)')+tx(463,86,'800K');
    s+=band(400,130,400,170,bw(800e3),'var(--c2)')+tx(424,154,'800K','var(--mute)','start');
    s+='<path d="M46,130 C46,214 300,214 350,196" fill="none" stroke="var(--mute)" stroke-width="1.4" stroke-dasharray="4 3"/>'+tx(200,176,'V3-Base is fine-tuned again');
    s+=band(450,190,476,190,3,'var(--c1)')+band(562,190,586,190,3,'var(--c1)');
    s+=tx(222,34,'AIME 15.6% → 71.0%','var(--c4)','start')+tx(609,226,'79.8%','var(--good)');
    ST.forEach((_,i)=>{s+=box(i)});
    $('rvSvg').innerHTML=svgEl(640,232,s,'R1 training pipeline as a data flow');
    $('rvSvg').querySelectorAll('g[data-i]').forEach(g=>{const go=()=>{sel=+g.dataset.i;draw()};g.addEventListener('click',go);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})});
    $('rvDet').innerHTML='<h3>'+ST[sel].n+'</h3><p class="small" style="margin:2px 0 0">'+ST[sel].d+' (<a href="'+R1+'" target="_blank" rel="noopener noreferrer">R1 paper</a>)</p>';
  }
  const D=[['Qwen-1.5B',1.5,28.9,52.7],['Qwen-7B',7,55.5,83.3],['Llama-8B',8,50.4,80.0],['Qwen-14B',14,69.7,80.0],['Qwen-32B',32,72.6,83.3],['Llama-70B',70,70.0,86.7]];
  let mode='p';
  function sc(){
    const W=520,H=230,f=logFrame({W,H,pl:40,pr:104,pt:10,pb:34,x:[1,100],y:[1,100],yt:[],xt:[[1.5,'1.5B'],[7,'7B'],[14,'14B'],[32,'32B'],[70,'70B']],xl:'student size, parameters (log scale)'});
    const ly=v=>10+(H-44)*(1-v/100);let s=f.s;
    [0,20,40,60,80,100].forEach(v=>{s+='<line x1="40" x2="'+(W-104)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="34" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'%</text>'});
    const ref=mode==='p'?[[79.8,'R1, teacher, 79.8','var(--good)'],[63.6,'o1-mini 63.6','var(--mute)']]:[[80.0,'o1-mini 80.0','var(--mute)']];
    ref.forEach(r=>{s+='<line x1="40" x2="'+(W-104)+'" y1="'+ly(r[0])+'" y2="'+ly(r[0])+'" stroke="'+r[2]+'" stroke-dasharray="5 4"/><text x="'+(W-100)+'" y="'+(ly(r[0])+4)+'" font-size="10.5" fill="'+r[2]+'">'+r[1]+'</text>'});
    D.forEach(d=>{const v=mode==='p'?d[2]:d[3],x=f.lx(d[1]),c=d[0][0]==='Q'?'var(--acc)':'var(--c2)';s+='<circle cx="'+x+'" cy="'+ly(v)+'" r="5" fill="'+c+'"><title>'+d[0]+': '+v+'%</title></circle><text x="'+x+'" y="'+(ly(v)+(d[0]==='Llama-8B'?16:-9))+'" font-size="10.5" text-anchor="middle">'+v.toFixed(1)+'</text>'});
    $('dsSvg').innerHTML=svgEl(W,H,s,'distilled student AIME scores against size');
    $('dsCap').innerHTML='Blue: Qwen bases; orange: Llama bases. Values from the distilled-model table on the <a href="https://huggingface.co/deepseek-ai/DeepSeek-R1" target="_blank" rel="noopener noreferrer">R1 model card</a> (same as the R1 paper). '+(mode==='p'?'Qwen-32B keeps '+(100*72.6/79.8).toFixed(0)+'% of the teacher\'s pass@1, and beats o1-mini, from supervised fine-tuning alone.':'With 64 samples and a majority vote, even the 7B student passes o1-mini\'s 80.0; the table gives no cons@64 for R1 itself.');
  }
  segBind('dsM',v=>{mode=v;sc()});draw();sc();
})();
