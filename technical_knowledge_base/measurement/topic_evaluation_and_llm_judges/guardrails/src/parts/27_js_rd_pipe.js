// ---- Reading: the same 450 XSTest conversations through a guardrail inside the model (system prompt) and outside it (classifier rails) ----
(function(){
  const X=GR.X,card=document.getElementById('rd-pa');if(!card)return;
  const MODES={
    out:{name:'Outside the model: classifier rails',steps:[
      {cfg:{},t:'No rails',p:'Mistral-7B-Instruct-v0.1 answers all 450 prompts as released. It complies fully with most unsafe prompts (red) and refuses almost nothing that is safe.'},
      {cfg:{inp:'loose'},t:'Add an input rail (Qwen3Guard-Gen-0.6B, loose)',p:'Every prompt is classified before the model sees it; prompts labelled Unsafe are blocked (blue). Most harmful answers never get generated, at the price of some safe prompts that look dangerous.'},
      {cfg:{inp:'loose',out:'loose'},t:'Add an output rail (same guard on prompt and answer, loose)',p:'Answers that got past the input rail are classified with their prompt; Unsafe ones are blocked (purple). It catches harmful answers the input rail let through, and blocks a few more good answers.'},
      {cfg:{inp:'strict',out:'strict'},t:'Make both rails strict',p:'Controversial now counts as unsafe at both stages. Harmful answers fall to almost none; blocked safe prompts more than double. Same models, same data: only the operating point moved.'}]},
    sys:{name:'Inside the model: guardrail system prompt',steps:[
      {cfg:{},t:'No rails',p:'The same starting point: Mistral-7B-Instruct-v0.1 with no system prompt.'},
      {cfg:{sys:true},t:'Add Mistral\'s guardrail system prompt',p:'XSTest\'s authors re-ran the model with Mistral\'s recommended guardrail prompt. The model now refuses most unsafe prompts itself (grey), but also refuses or half-refuses a large share of the safe ones (orange-ringed squares on the left): over-refusal moved inside the model, where no threshold can be tuned.'},
      {cfg:{sys:true},t:'Compare with the classifier rails',p:'Leaks are in the same single digits either way. The difference is the cost: count the safe prompts refused here against those blocked by the loose rails (switch modes to compare). The prompt also cannot be measured separately from the model, or tuned without re-running everything.',cmp:true}]}
  };
  const st={mode:'out'};
  const seg=document.getElementById('rd-pa-mode');
  seg.innerHTML=Object.entries(MODES).map(([k,m])=>'<button data-m="'+k+'">'+m.name+'</button>').join('');
  const COL={answer:'var(--good)',harm:'var(--bad)',partial:'var(--c5)',refused:'var(--dim)',in:'var(--c1)',out:'var(--c4)'};
  // layout: two blocks of 25 columns (safe 10 rows, unsafe 8 rows), side by side when wide, stacked when narrow
  const svgEl=document.getElementById('rd-pa-svg');let rects=[],built=0;
  const safe=X.filter(x=>!x.unsafe),uns=X.filter(x=>x.unsafe);
  function build(){
    const w=RD.width(svgEl),wide=w>=560,cols=25,gap=wide?24:0;
    const bw=wide?(w-gap)/2:w,cs=Math.min(14,Math.floor(bw/cols)),s=cs-1.5;
    const bh1=10*cs,bh2=8*cs,top=16;
    let b='',y2=wide?top:top+bh1+26,x2=wide?bw+gap:0;
    b+=RD.t(0,11,'250 safe prompts',{fs:11.5,w:600});b+=RD.t(x2,y2-5,'200 unsafe prompts',{fs:11.5,w:600});
    const pos=[];
    safe.forEach((x,i)=>pos.push([x,(i%cols)*cs,top+Math.floor(i/cols)*cs]));
    uns.forEach((x,i)=>pos.push([x,x2+(i%cols)*cs,y2+Math.floor(i/cols)*cs]));
    pos.forEach(([x,px,py],i)=>{b+='<rect data-i="'+i+'" x="'+px.toFixed(1)+'" y="'+py.toFixed(1)+'" width="'+s.toFixed(1)+'" height="'+s.toFixed(1)+'" rx="1.5" stroke-width="1.6"><title></title></rect>'});
    const H=wide?top+Math.max(bh1,bh2)+4:y2+bh2+4;
    svgEl.innerHTML=RD.svg(w,H,b,'450 conversations coloured by what the user received');
    rects=[...svgEl.querySelectorAll('rect')].map((r,i)=>[r,pos[i][0]]);built=w;
  }
  function state(x,cfg){
    const o=GR.outcome(x,cfg);
    if(o.st==='in'||o.st==='inpi')return 'in';if(o.st==='out')return 'out';
    if(o.res==='answer')return x.unsafe?'harm':'answer';
    return o.res==='partial'?'partial':'refused';
  }
  const LAB={answer:'answered',harm:'harmful answer delivered',partial:'partial refusal',refused:'refused by the model',in:'blocked by the input rail',out:'blocked by the output rail'};
  function draw(i){
    if(!rects.length||Math.abs(RD.width(svgEl)-built)>30)build();
    const m=MODES[st.mode],sp=m.steps[i],cfg=sp.cfg;
    seg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===st.mode));
    rects.forEach(([r,x])=>{const s=state(x,cfg);r.style.fill=COL[s];
      const mis=!x.unsafe&&s!=='answer';r.style.stroke=mis?'var(--bad)':'none';
      r.firstChild.textContent='#'+x.id+' '+(x.unsafe?'unsafe':'safe')+' prompt: '+LAB[s]});
    const c=GR.tally(cfg);
    const calls=(cfg.inp?450:0)+(cfg.out?450-c.blockIn:0);
    document.getElementById('rd-pa-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+m.steps.length+': '+sp.t+'</div><p>'+sp.p+'</p>';
    let h=RD.stat('Harmful answers delivered',c.harm+' of 200','plus '+c.part+' partial')+
      RD.stat('Safe prompts blocked by a rail',c.okBlocked+' of 250',(100*c.okBlocked/250).toFixed(1)+'%')+
      RD.stat('Safe prompts refused by the model',(c.okRefused+c.okPartial)+' of 250',c.okRefused+' fully, '+c.okPartial+' partly')+
      RD.stat('Guard-model calls',calls,cfg.inp||cfg.out?'one per prompt, one per answer not already blocked':'none');
    if(sp.cmp){const o=GR.tally({inp:'loose',out:'loose'});h+=RD.stat('Classifier rails, loose (for comparison)',o.harm+' harmful, '+o.okBlocked+' safe blocked','plus '+(o.okRefused+o.okPartial)+' safe refused by the model')}
    document.getElementById('rd-pa-cnt').innerHTML=h;
  }
  document.getElementById('rd-pa-leg').innerHTML=[['answer','answered (safe prompt)'],['harm','harmful answer'],['partial','partial refusal'],['refused','refused by the model'],['in','blocked before the call'],['out','blocked after the call']].map(([k,n])=>'<span><i style="background:'+COL[k]+'"></i>'+n+'</span>').join('')+'<span><i style="background:none;border:1.6px solid var(--bad)"></i>a safe prompt not answered</span>';
  const A=RD.anim({card:'rd-pa',ctl:'rd-pa-ctl',n:MODES.out.steps.length,draw,ms:2600,label:'Pipeline step'});
  seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.mode=b.dataset.m;A.reset(MODES[st.mode].steps.length);A.play()});
  RD.onResize(()=>{build();A.redraw()});
})();
