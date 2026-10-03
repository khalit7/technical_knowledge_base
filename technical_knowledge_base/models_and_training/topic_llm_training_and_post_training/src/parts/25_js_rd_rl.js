// ---- Reading, Axis 3: one batch of four prompts through PPO, GRPO and DPO (memory derived, outcomes illustrative) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-rl'))return;
  const B=7; // billions of parameters
  const MOD={policy:{n:'Policy',b:16,tr:1,c:'var(--c2)'},critic:{n:'Critic (value model)',b:16,tr:1,c:'var(--c5)'},ref:{n:'Reference (frozen)',b:2,tr:0,c:'var(--c1)'},rm:{n:'Reward model (frozen)',b:2,tr:0,c:'var(--c4)'},chk:{n:'Checker: a program, no weights',b:0,tr:0,c:'var(--c3)'}};
  const MODES={
    ppo:{mods:['policy','critic','ref','rm'],G:1,steps:[
      {t:'Load four models',p:'PPO trains the policy and a critic, and keeps a frozen reference copy (for the KL penalty) and a frozen reward model beside them. Two of the four carry gradients and Adam state.',act:['policy','critic','ref','rm']},
      {t:'Sample one answer per prompt',p:'The policy writes one answer for each of the four prompts. Generation is the slow part of every RL step.',act:['policy'],show:'s'},
      {t:'The reward model scores each answer',p:'A learned model, trained on human rankings, gives each answer a number. It is a proxy for what people want, and the policy will learn its blind spots (Axis 4).',act:['rm'],show:'r'},
      {t:'The critic estimates what was expected',p:'The critic predicts the reward from each partial answer; the advantage is reward minus prediction, so the policy learns only from surprises. It needs its own training, and a second full model\'s memory.',act:['critic'],show:'a'},
      {t:'The reference charges for drift',p:'Each token pays a KL penalty for moving away from the frozen reference, the leash that keeps the policy near the SFT model.',act:['ref'],show:'a'},
      {t:'Update the policy and the critic',p:'Clipped policy-gradient step on the policy, regression step on the critic: two optimiser states, two backward passes.',act:['policy','critic'],show:'a',upd:1}]},
    grpo:{mods:['policy','ref','chk'],G:8,steps:[
      {t:'Load two models',p:'GRPO drops the critic, and with a verifiable reward the reward model too: a program checks the answer. Only the policy is trained.',act:['policy','ref','chk']},
      {t:'Sample a group of 8 answers per prompt',p:'Eight times PPO\'s rollouts for the same four prompts. The memory saved on the critic is spent on generation.',act:['policy'],show:'s'},
      {t:'The checker marks each answer',p:'Right or wrong, from the exact answer or the unit tests: no learned proxy to over-optimise, though the checker itself can be gamed.',act:['chk'],show:'r'},
      {t:'Score each answer against its group',p:'Advantage = (reward minus the group mean) / group standard deviation: the group is the baseline the critic used to provide. A group that is all right or all wrong has no spread, so it teaches nothing (prompts 3 and 4); DAPO\'s dynamic sampling refills the batch with prompts that do.',act:['policy'],show:'a'},
      {t:'The reference charges for drift',p:'The KL term moves from the reward into the loss, against the same frozen reference.',act:['ref'],show:'a'},
      {t:'Update the policy',p:'One trained model, one optimiser state: half PPO\'s model memory at the same size.',act:['policy'],show:'a',upd:1}]},
    dpo:{mods:['policy','ref'],G:2,steps:[
      {t:'Load two models',p:'DPO needs the policy and a frozen reference. No reward model, no critic, no checker.',act:['policy','ref']},
      {t:'No sampling: read fixed pairs',p:'Each prompt comes with a chosen and a rejected answer from the dataset, written and ranked before training. The model never sees its own new answers: offline.',act:[],show:'s'},
      {t:'Compare with the reference',p:'For both answers, how much more likely the policy makes it than the reference does. These reference log-probabilities can be computed once and cached.',act:['ref','policy'],show:'r'},
      {t:'One classification loss',p:'Loss = −log σ(β × (chosen ratio − rejected ratio)): push the chosen answer up relative to the rejected one. The implied reward is β log(π / π_ref).',act:['policy'],show:'a'},
      {t:'Update the policy',p:'Cheap and stable; on hard tasks, on-policy RL that samples its own answers has done better since.',act:['policy'],show:'a',upd:1}]}
  };
  // illustrative outcomes: 1 = right, 0 = wrong; PPO uses scalar rewards
  const GR=[[1,0,1,1,0,1,0,1],[0,0,1,0,0,0,1,0],[1,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0]];
  const PPO=[{r:.8,v:.6},{r:.3,v:.4},{r:.6,v:.5},{r:.1,v:.3}];
  let mode='ppo',A;
  const gb=b=>Math.round(b*B);
  const f2=x=>(x>=0?'+':'−')+Math.abs(x).toFixed(2);
  function adv(g){const m=g.reduce((a,b)=>a+b,0)/g.length,sd=Math.sqrt(g.reduce((a,b)=>a+(b-m)*(b-m),0)/g.length);return g.map(x=>sd>0?(x-m)/sd:0)}
  function draw(i){const M=MODES[mode],s=M.steps[i];
    $('rd-rlM').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));
    $('rd-rlMods').innerHTML=M.mods.map(k=>{const m=MOD[k];return '<span class="rl-mod '+(m.tr?'tr':'fz')+(s.act.includes(k)?' act':'')+'">'+m.n+(m.b?' · '+gb(m.b)+' GB':'')+'</span>'}).join('');
    const tot=M.mods.reduce((a,k)=>a+MOD[k].b,0),mx=36;
    $('rd-rlMem').innerHTML=M.mods.filter(k=>MOD[k].b).map(k=>'<span title="'+MOD[k].n+'" style="width:'+(100*MOD[k].b/mx).toFixed(1)+'%;background:'+MOD[k].c+'"></span>').join('');
    $('rd-rlMemT').textContent=tot+' bytes per parameter: '+gb(tot)+' GB of model state at 7B, before activations (bar drawn against PPO\'s 252 GB)';
    const sh=s.show||'';
    $('rd-rlRH').textContent=mode==='dpo'?'Fixed pairs from the dataset (no rollouts)':'Rollouts: '+M.G+' per prompt';
    let roll='',signals=0,rollouts=0;
    for(let q=0;q<4;q++){let dots='',v='';
      if(mode==='ppo'){const o=PPO[q],a=o.r-o.v;
        if(sh){rollouts++;dots='<span class="rl-d '+(sh==='s'?'s':'')+'" style="'+(sh!=='s'?'background:var(--c4);border-color:var(--c4)':'')+'"></span>'}
        if(sh==='r')v='reward '+o.r.toFixed(1);
        if(sh==='a'){v='reward '+o.r.toFixed(1)+', critic '+o.v.toFixed(1)+', advantage '+f2(a);signals++}}
      else if(mode==='grpo'){const g=GR[q],ad=adv(g);
        if(sh){rollouts+=g.length;dots=g.map((x,j)=>'<span class="rl-d '+(sh==='s'?'s':(x?'yes':'no'))+(sh==='a'&&ad[j]!==0?(ad[j]>0?' ap':' an'):'')+'"></span>').join('')}
        if(sh==='r')v=g.reduce((a,b)=>a+b,0)+' of 8 right';
        if(sh==='a'){const pos=ad.find(x=>x>0),neg=ad.find(x=>x<0);v=pos===undefined?'no spread: advantage 0':'right '+f2(pos)+', wrong '+f2(neg);if(pos!==undefined)signals+=g.length}}
      else{ if(sh){dots='<span class="rl-d yes" title="chosen"></span><span class="rl-d no" title="rejected"></span>'}
        if(sh==='r')v='chosen and rejected, scored against the reference';
        if(sh==='a'){v='one loss term per pair';signals++}}
      roll+='<div class="rl-p"><div class="q">Prompt '+(q+1)+'</div><div class="rl-dots">'+dots+'</div><div class="rl-v">'+v+'</div></div>'}
    $('rd-rlRoll').innerHTML=roll;
    $('rd-rlT').textContent=(i+1)+' of '+M.steps.length+' · '+s.t;$('rd-rlP').textContent=s.p;
    const trained=M.mods.filter(k=>MOD[k].tr).length,frozen=M.mods.filter(k=>MOD[k].b&&!MOD[k].tr).length;
    $('rd-rlN').innerHTML=RD.stat('Models in memory',trained+frozen,trained+' trained, '+frozen+' frozen')+RD.stat('Model state at 7B',gb(tot)+' GB','<i class="nl d">derived</i> '+tot+' B per parameter')+
      RD.stat('Answers generated',mode==='dpo'?'0':(sh?rollouts:0),mode==='dpo'?'pairs come from the dataset':'this batch')+
      RD.stat(mode==='grpo'?'Answers with a learning signal':'Learning signals',sh==='a'?signals:'not yet',mode==='grpo'?'groups with no spread give none':'');
  }
  A=RD.anim({card:'rd-rl',ctl:'rd-rlC',n:MODES.ppo.steps.length,draw,ms:2600,label:'Step'});
  $('rd-rlM').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;mode=b.dataset.m;A.reset(MODES[mode].steps.length);A.play()});
})();
