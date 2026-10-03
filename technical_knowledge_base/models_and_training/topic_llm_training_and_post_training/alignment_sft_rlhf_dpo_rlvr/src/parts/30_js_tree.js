// ---- Method family tree tab: methods by first-version date and signal, joined to the method each changed ----
(function(){
  const $=id=>document.getElementById(id);if(!$('trW'))return;
  const N=u=>'https://app.notion.com/p/'+u;
  const LANES=[['sft','Demonstrations, SFT','var(--c1)'],['rlhf','Learned reward, RL','var(--c2)'],['ai','AI feedback, RLAIF','var(--c4)'],['dpo','Preference pairs, offline','var(--c3)'],['online','Preference pairs, online','var(--c6)'],['rlvr','Verifiable reward, RL','var(--c5)']];
  // d: year + (month-1)/12 from the arXiv identifier; p: parents; w: what it removed, fixed or added; kb: where this knowledge base covers it
  const T=[
    {id:'chr',l:'rlhf',d:2017.42,n:'RL from human preferences',u:'https://arxiv.org/abs/1706.03741',p:[],w:'Learn a reward model from people comparing pairs of behaviours, then optimise it with RL: the idea every later method inherits.',kb:''},
    {id:'zie',l:'rlhf',d:2019.67,n:'Fine-tuning LMs from preferences',u:'https://arxiv.org/abs/1909.08593',p:['chr'],w:'Brings it to language models, with a KL penalty that keeps the policy near the pretrained model.',kb:''},
    {id:'sti',l:'rlhf',d:2020.67,n:'Learning to summarize',u:'https://arxiv.org/abs/2009.01325',p:['zie'],w:'Reward model plus PPO with the KL penalty on summarisation: the template InstructGPT scaled.',kb:''},
    {id:'flan',l:'sft',d:2021.67,n:'FLAN',u:'https://arxiv.org/abs/2109.01652',p:[],w:'Instruction tuning: many tasks rewritten as instructions, fine-tuned together, improve zero-shot behaviour.',kb:''},
    {id:'ac',l:'rlvr',d:2022.08,n:'AlphaCode',u:'https://arxiv.org/abs/2203.07814',p:[],w:'Execution as a filter at inference: sample many programs, keep those that pass the example tests. Not RL, but the checker idea.',kb:''},
    {id:'igpt',l:'rlhf',d:2022.17,n:'InstructGPT',u:'https://arxiv.org/abs/2203.02155',p:['sti','flan'],w:'Fixes the three-step recipe: SFT, a Bradley-Terry reward model over K = 4 to 9 ranked answers, PPO with a KL penalty and a pretraining mix.',kb:N('3c65c17b0d0d8180b958d8299996a063')},
    {id:'hh',l:'rlhf',d:2022.25,n:'Helpful and harmless RLHF',u:'https://arxiv.org/abs/2204.05862',p:['igpt'],w:'RLHF for an assistant that is both helpful and harmless; its evasiveness is what Constitutional AI set out to fix.',kb:''},
    {id:'cai',l:'ai',d:2022.92,n:'Constitutional AI',u:'https://arxiv.org/abs/2212.08073',p:['hh'],w:'Replaces human harmlessness labels with a model reading 16 written principles: critique and revise, then RL from AI feedback.',kb:N('3c65c17b0d0d815a9b31e9443961c700')},
    {id:'lima',l:'sft',d:2023.33,n:'LIMA',u:'https://arxiv.org/abs/2305.11206',p:['flan'],w:'1,000 curated examples, no RL: the superficial alignment hypothesis.',kb:''},
    {id:'dpo',l:'dpo',d:2023.38,n:'DPO',u:'https://arxiv.org/abs/2305.18290',p:['igpt'],w:'Removes the reward model and the RL loop: the KL-constrained optimum turns the Bradley-Terry loss into a loss on the policy itself.',kb:N('3c65c17b0d0d818bb1d8cafd30e20f9e')},
    {id:'rlaif',l:'ai',d:2023.67,n:'RLAIF vs RLHF',u:'https://arxiv.org/abs/2309.00267',p:['cai'],w:'An off-the-shelf LLM labeller matches human labels on summarisation and helpful dialogue.',kb:''},
    {id:'ipo',l:'dpo',d:2023.75,n:'IPO',u:'https://arxiv.org/abs/2310.12036',p:['dpo'],w:'Fixes overfitting to deterministic preferences: a squared loss with a target margin.',kb:''},
    {id:'cdpo',l:'dpo',d:2023.88,n:'cDPO',u:'https://ericmitchell.ai/cdpo.pdf',p:['dpo'],w:'Fixes noisy labels: assume each is flipped with probability ε (label smoothing). A note, not on arXiv.',kb:''},
    {id:'itd',l:'online',d:2023.96,n:'Iterative DPO',u:'https://arxiv.org/abs/2312.11456',p:['dpo'],w:'Adds back sampling: regenerate pairs from the current policy, rank, retrain, repeat.',kb:''},
    {id:'kto',l:'dpo',d:2024.08,n:'KTO',u:'https://arxiv.org/abs/2402.01306',p:['dpo'],w:'Removes the need for pairs: one thumbs up or down per answer, a prospect-theory value function.',kb:''},
    {id:'oaif',l:'online',d:2024.09,n:'Online AI feedback',u:'https://arxiv.org/abs/2402.04792',p:['dpo','rlaif'],w:'Online DPO with an LLM labeller judging the policy\'s own samples each step.',kb:''},
    {id:'grpo',l:'rlhf',d:2024.10,n:'GRPO (DeepSeekMath)',u:'https://arxiv.org/abs/2402.03300',p:['igpt'],w:'Removes PPO\'s critic: a group of answers per prompt is its own baseline.',kb:N('3c65c17b0d0d817f9fc5cb9a9fbcbee5')},
    {id:'orpo',l:'dpo',d:2024.17,n:'ORPO',u:'https://arxiv.org/abs/2403.07691',p:['dpo','lima'],w:'Removes the reference model and the separate stage: an odds-ratio term added to the SFT loss.',kb:''},
    {id:'simpo',l:'dpo',d:2024.38,n:'SimPO',u:'https://arxiv.org/abs/2405.14734',p:['dpo'],w:'Removes the reference: the average log-probability is the reward, with a target margin γ.',kb:''},
    {id:'l3',l:'online',d:2024.55,n:'Llama 3',u:'https://arxiv.org/abs/2407.21783',p:['dpo','igpt'],w:'Six rounds of reward model, rejection sampling, SFT and DPO, chosen over PPO for compute.',kb:N('3c65c17b0d0d81aca58ccb9d720b474e')},
    {id:'t3',l:'rlvr',d:2024.88,n:'Tulu 3 (names RLVR)',u:'https://arxiv.org/abs/2411.15124',p:['igpt','ac'],w:'Replaces the reward model with a verification function inside PPO; also length-normalised DPO and the sum loss for SFT.',kb:''},
    {id:'lnd',l:'dpo',d:2024.89,n:'Length-normalised DPO',u:'https://arxiv.org/abs/2411.15124',p:['dpo','simpo'],w:'Keeps the reference, averages each log-ratio over the answer\'s tokens (Tulu 3).',kb:''},
    {id:'r1',l:'rlvr',d:2025.05,n:'DeepSeek-R1',u:'https://arxiv.org/abs/2501.12948',p:['grpo','t3'],w:'GRPO with rule rewards straight on a base model (R1-Zero); long reasoning emerges. R1 adds a cold-start SFT.',kb:N('3c65c17b0d0d813faca4f7a51eaa0c65')},
    {id:'dapo',l:'rlvr',d:2025.18,n:'DAPO',u:'https://arxiv.org/abs/2503.14476',p:['grpo','r1'],w:'Clip-higher, dynamic sampling, token-level loss, overlong shaping: fixes for long chain-of-thought RL.',kb:N('3c65c17b0d0d818c9bcff7177325fe56')},
    {id:'drg',l:'rlvr',d:2025.19,n:'Dr. GRPO',u:'https://arxiv.org/abs/2503.20783',p:['grpo','r1'],w:'Removes GRPO\'s length and standard-deviation normalisations, which bias the update.',kb:N('3c65c17b0d0d818c9bcff7177325fe56')},
    {id:'q3',l:'rlvr',d:2025.36,n:'Qwen3',u:'https://arxiv.org/abs/2505.09388',p:['r1'],w:'Four post-training stages; reasoning RL with GRPO on 3,995 query-verifier pairs.',kb:N('3c65c17b0d0d81a19006e6b096a6e14b')},
    {id:'cispo',l:'rlvr',d:2025.46,n:'CISPO (MiniMax-M1)',u:'https://arxiv.org/abs/2506.13585',p:['grpo'],w:'Clips the importance-sampling weights instead of the token updates.',kb:N('3c65c17b0d0d818c9bcff7177325fe56')},
    {id:'gspo',l:'rlvr',d:2025.55,n:'GSPO',u:'https://arxiv.org/abs/2507.18071',p:['grpo'],w:'One length-normalised ratio per sequence, clipped as a whole, for long answers and MoE models.',kb:N('3c65c17b0d0d818c9bcff7177325fe56')},
    {id:'rar',l:'ai',d:2025.56,n:'Rubrics as Rewards',u:'https://arxiv.org/abs/2507.17746',p:['rlaif','t3'],w:'Rewards for unverifiable domains: an LLM judge scoring against a rubric instead of a Likert scale.',kb:''},
    {id:'o3',l:'rlvr',d:2025.95,n:'Olmo 3 RL-Zero',u:'https://arxiv.org/abs/2512.13961',p:['t3','r1'],w:'RLVR from a fully open base with decontaminated RL data, so RL-from-base results can be trusted.',kb:N('3c65c17b0d0d81e08697df661f83c3ac')},
    {id:'cc',l:'ai',d:2026.05,n:'Claude\'s 2026 constitution',u:'https://www.anthropic.com/news/claude-new-constitution',p:['cai'],w:'A much longer constitution published for Claude (January 2026). Not on arXiv.',kb:''},
    {id:'plc',l:'dpo',d:2026.63,n:'PLC-DPO',u:'https://arxiv.org/abs/2608.30597',p:['dpo','cdpo'],w:'Corrects the labels instead of the loss: each pair routed as clean, flipped or tie.',kb:''},
    {id:'neo',l:'sft',d:2026.69,n:'NeoHorse-1',u:'https://arxiv.org/abs/2609.08183',p:['lima'],w:'SFT data from production traffic, ordered by a routing curriculum.',kb:N('3db5c17b0d0d81e3b105e033a359ad24')}];
  const byId={};T.forEach(t=>byId[t.id]=t);
  const kids=id=>T.filter(t=>t.p.includes(id));
  function lineage(id){const up=new Set(),dn=new Set();(function a(i){byId[i].p.forEach(p=>{if(!up.has(p)){up.add(p);a(p)}})})(id);(function d(i){kids(i).forEach(k=>{if(!dn.has(k.id)){dn.add(k.id);d(k.id)}})})(id);return {up,dn}}
  let sel='dpo',lane='';
  $('trF').innerHTML='<button data-l="" class="on">All lanes</button>'+LANES.map(l=>'<button data-l="'+l[0]+'"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+l[2]+';margin-right:5px"></i>'+l[1]+'</button>').join('');
  function draw(){
    const W=Math.max(1500,RD.width($('trW'))),RH=24,top=26,left=8,y0=2017.2,y1=2026.95,NW=86;
    // time axis compressed before 2022 (few methods), so the crowded years get the room
    const wp=d=>d<2022?(d-y0)*0.35:(2022-y0)*0.35+(d-2022);
    const X=d=>left+150+NW/2+(W-left-160-NW)*wp(d)/wp(y1);
    // place nodes: x by date; inside a lane, the first row with room (as many rows as the lane needs)
    const pos={},LY=[],LHs=[];let yAcc=top;
    LANES.forEach((l,li)=>{const ns=T.filter(t=>t.l===l[0]).sort((a,b)=>a.d-b.d);const last=[];
      ns.forEach(t=>{const x=X(t.d);let r=last.findIndex(v=>x-v>=NW+4);if(r<0){r=last.length;last.push(0)}
        pos[t.id]={x,r};last[r]=x});
      const nr=Math.max(3,last.length);LY[li]=yAcc;LHs[li]=nr*RH+12;ns.forEach(t=>pos[t.id].y=yAcc+12+pos[t.id].r*RH);yAcc+=LHs[li]});
    const H=yAcc+10;
    let g='';
    for(let y=2018;y<=2026;y++)g+='<line x1="'+X(y)+'" x2="'+X(y)+'" y1="14" y2="'+(H-6)+'" stroke="var(--line)"/><text x="'+X(y)+'" y="11" font-size="11" text-anchor="middle" fill="var(--mute)">'+y+'</text>';
    LANES.forEach((l,li)=>{g+='<text x="'+left+'" y="'+(LY[li]+16)+'" font-size="11.5" font-weight="600" fill="'+l[2]+'">'+l[1].split(', ')[0]+'</text>'+(l[1].includes(', ')?'<text x="'+left+'" y="'+(LY[li]+30)+'" font-size="11.5" font-weight="600" fill="'+l[2]+'">'+l[1].split(', ')[1]+'</text>':'')+'<line x1="'+left+'" x2="'+(W-6)+'" y1="'+(LY[li]+LHs[li]-2)+'" y2="'+(LY[li]+LHs[li]-2)+'" stroke="var(--line)" stroke-dasharray="2 4"/>'});
    const L=lineage(sel),on=id=>id===sel||L.up.has(id)||L.dn.has(id);
    const vis=t=>!lane||t.l===lane;
    T.forEach(t=>t.p.forEach(p=>{const a=pos[p],b=pos[t.id];const hl=on(t.id)&&on(p)&&(t.id===sel||p===sel||L.up.has(p)&&(L.up.has(t.id)||t.id===sel)||L.dn.has(t.id)&&(L.dn.has(p)||p===sel));
      const dim=lane&&!(vis(t)&&vis(byId[p]));
      const mx=(a.x+b.x)/2;g+='<path class="tr-edge'+(hl?' hl':'')+(dim?' dim':'')+'" d="M'+(a.x+NW/2)+' '+a.y+' C'+mx+' '+a.y+' '+mx+' '+b.y+' '+(b.x-NW/2)+' '+b.y+'"/>'}));
    T.forEach(t=>{const p=pos[t.id],l=LANES.find(x=>x[0]===t.l),dim=(lane&&!vis(t))||(!on(t.id)&&sel&&false);
      const w=NW,nm=t.n.length>16?t.n.slice(0,15)+'…':t.n;
      g+='<g class="tr-node'+(t.id===sel?' sel':'')+(dim?' dim':'')+'" data-id="'+t.id+'" tabindex="0" role="button" aria-label="'+RD.esc(t.n)+'"><title>'+RD.esc(t.n)+'</title><rect x="'+(p.x-w/2)+'" y="'+(p.y-11)+'" width="'+w+'" height="22" rx="6" fill="'+(on(t.id)?'var(--bg)':'var(--soft)')+'" stroke="'+l[2]+'"/><text x="'+p.x+'" y="'+(p.y+4)+'" font-size="10.5" text-anchor="middle"'+(on(t.id)?'':' fill="var(--mute)"')+'>'+RD.esc(nm)+'</text></g>'});
    $('trW').innerHTML='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Family tree of post-training methods">'+g+'</svg>';
    const t=byId[sel],l=LANES.find(x=>x[0]===t.l),yr=Math.floor(t.d),mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Math.min(11,Math.round((t.d-yr)*12))];
    const ln=(ids)=>ids.length?ids.map(i=>'<a href="#" data-go="'+i+'">'+RD.esc(byId[i].n)+'</a>').join(', '):'none on this tree';
    $('trD').innerHTML='<h3>'+RD.esc(t.n)+'</h3><div class="small mute">'+mo+' '+yr+' · '+l[1]+'</div><p>'+t.w+'</p><dl class="kv"><dt>Paper</dt><dd><a href="'+t.u+'" target="_blank" rel="noopener noreferrer">'+t.u.replace('https://','')+'</a></dd><dt>Builds on</dt><dd>'+ln(t.p)+'</dd><dt>Changed by</dt><dd>'+ln(kids(t.id).map(k=>k.id))+'</dd>'+(t.kb?'<dt>In depth</dt><dd><a href="'+t.kb+'" target="_blank" rel="noopener noreferrer">knowledge base page</a></dd>':'')+'</dl>';
  }
  $('trW').addEventListener('click',e=>{const n=e.target.closest('.tr-node');if(!n)return;sel=n.dataset.id;draw()});
  $('trW').addEventListener('keydown',e=>{const n=e.target.closest('.tr-node');if(n&&(e.key==='Enter'||e.key===' ')){e.preventDefault();sel=n.dataset.id;draw();const m=$('trW').querySelector('[data-id="'+sel+'"]');if(m)m.focus()}});
  $('trD').addEventListener('click',e=>{const a=e.target.closest('a[data-go]');if(!a)return;e.preventDefault();sel=a.dataset.go;draw()});
  $('trF').addEventListener('click',e=>{const b=e.target.closest('button[data-l]');if(!b)return;lane=b.dataset.l;$('trF').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    if(lane&&byId[sel].l!==lane){const f=T.find(t=>t.l===lane);if(f)sel=f.id}draw()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-tree']=window.TAB_RENDER['t-tree']||[]).push(draw);
  window.addEventListener('resize',()=>{if(!$('t-tree').hidden)draw()});
  draw();
})();
