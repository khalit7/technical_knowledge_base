// ---- Reading: "Which family when", a small decision tree ----
(function(){
  // ---- which family when: a small decision tree ----
  (function(){
    const el=document.getElementById('rd-tree');
    const Q={
      q1:['Do you know the environment\'s model (transition probabilities and rewards, or the rules of the game)?',[['Yes','q2'],['No','q3']]],
      q2:['Is the state space small enough to sweep every state?',[['Yes','L_dp'],['No, it is huge (a board game)','L_az']]],
      q3:['Can the agent interact with the environment or a simulator?',[['Yes','q4'],['No, only a fixed dataset','L_off']]],
      q4:['Is this a language model being post-trained?',[['Yes','q5'],['No','q4b']]],
      q5:['Can its answers be checked by a program (tests, an answer checker)?',[['Yes','L_rlvr'],['No, quality needs a judge','q5b']]],
      q5b:['Is a per-token critic, a value model as large as the policy, affordable?',[['Yes','L_ppo_rlhf'],['No','L_grpo_rm']]],
      q4b:['Would planning pay (costly real experience, long horizons), and can you afford heavy compute per decision?',[['Yes','L_mb'],['No','q6']]],
      q6:['Is the problem small and discrete enough for a table?',[['Yes','q7'],['No','q8']]],
      q7:['Does the exploring agent\'s own performance while it learns matter (real hardware, costly mistakes)?',[['Yes','L_sarsa'],['No, mistakes are cheap','L_q']]],
      q8:['Are the actions continuous (torques, steering)?',[['Yes','q9'],['No, discrete','q10']]],
      q9:['Are samples expensive (a real robot)?',[['Yes','L_sac'],['No, a fast simulator','L_ppo']]],
      q10:['Is each environment step precious?',[['Yes','L_dqn'],['No, stability matters more','L_ppo']]]};
    const L={
      L_dp:['Dynamic programming','Policy or value iteration: exact answers; a sweep over every state per iteration.','rd-f-plan'],
      L_az:['Search with learned networks (AlphaZero)','Monte Carlo tree search over the known rules, with policy and value networks to focus it; large compute per move.','rd-f-mb'],
      L_off:['Behaviour cloning or offline RL','Clone the data if it is expert; otherwise offline RL (CQL, IQL) that stays close to the data to avoid distribution shift.','rd-f-off'],
      L_rlvr:['RLVR with GRPO (or PPO)','A verifier as the reward removes the learned reward model the policy would otherwise exploit; GRPO avoids the per-token critic. Watch for all-same groups and length bias.','rd-llm'],
      L_ppo_rlhf:['RLHF with PPO','A reward model plus PPO with a per-token KL penalty to a frozen reference; four models in memory.','rd-llm'],
      L_grpo_rm:['GRPO with a reward model, or DPO','A group of sampled responses per prompt as the baseline instead of a critic; or DPO offline on preference pairs. Watch for reward hacking.','rd-llm'],
      L_mb:['Learn a model and plan (MuZero, Dreamer)','Plan in a learned latent space; large compute per decision, and model errors compound over long plans.','rd-f-mb'],
      L_sarsa:['SARSA','On-policy: it optimises the exploratory policy it actually runs, so it learns the safer behaviour (cliff walking).','rd-f-samp'],
      L_q:['Q-learning','Off-policy: learns the greedy optimum while exploring; can replay old experience.','rd-f-samp'],
      L_sac:['SAC or TD3','Off-policy actor-critics with replay: far fewer environment steps than PPO.','rd-f-pg'],
      L_ppo:['PPO','Robust in any action space; costs data, because each batch is used for a few epochs and then discarded.','rd-f-pg'],
      L_dqn:['The DQN family (Rainbow)','Off-policy replay reuses old data; needs a max over discrete actions.','rd-f-dqn']};
    let path=[{id:'q1'}];
    function draw(){const cur=path[path.length-1].id;let h='<div class="path">'+(path.length>1?'Your answers: '+path.slice(1).map(p=>p.a).join(' → '):'Start here.')+'</div>';
      if(cur in Q){h+='<div class="q">'+Q[cur][0]+'</div><div class="rd-btns">'+Q[cur][1].map((o,k)=>'<button data-k="'+k+'">'+o[0]+'</button>').join('')+'</div>'}
      else{const lf=L[cur];h+='<div class="leaf"><b>'+lf[0]+'</b><p style="margin:4px 0">'+lf[1]+'</p><a href="#'+lf[2]+'">Read the section</a></div>'}
      if(path.length>1)h+='<div class="rd-btns"><button data-back="1">Back</button><button data-reset="1">Start again</button></div>';
      el.innerHTML='<div class="rd-ph">Which family fits your problem?</div>'+h}
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.reset){path=[{id:'q1'}]}else if(b.dataset.back){path.pop()}else{const cur=path[path.length-1].id,o=Q[cur][1][+b.dataset.k];path.push({id:o[1],a:o[0]})}draw()});
    draw();
  })();
})();
