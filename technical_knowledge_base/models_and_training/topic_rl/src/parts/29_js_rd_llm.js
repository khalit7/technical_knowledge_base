// ---- Reading section 18 and "Which family when": one GRPO group, and the decision tree ----
(function(){
  const E=window.RDE;
  (function(){
    const LEN=[220,410,160,530,300,680,250,390,450,180,600,340,270,510,230,360];
    const PRE={a:{G:4,r:[1,0,0,0]},b:{G:16,r:[1].concat(new Array(15).fill(0))},c:{G:16,r:[1,0,1,0,0,1,1,0,1,0,1,0,0,1,0,1]},d:{G:8,r:new Array(8).fill(1)}};
    const P=document.getElementById('rd-grP'),Tt=document.getElementById('rd-grT'),Xp=document.getElementById('rd-grX'),N=document.getElementById('rd-grN');
    let G=4,r=PRE.a.r.slice(),kind='grpo',pre='a';
    const STEPS=['Sample a group','Score with the verifier','Group statistics','Advantages','Spread over tokens'];
    function stats(){const ad=E.groupAdv(r,kind),L=LEN.slice(0,G),Lmax=Math.max(...L);
      const tok=ad.A.map((a,i)=>kind==='drgrpo'?a/(G*Lmax):a/(G*L[i]));return {ad,L,Lmax,tok}}
    function draw(i){const st=stats(),W=RD.width(P),rh=G>8?19:28,H=G*rh+30,l=W<480?64:86,r0=W<480?118:150,bx=l,bw=W-l-r0;let s='';
      const maxA=Math.max(1,...st.ad.A.map(Math.abs)),maxT=Math.max(1e-9,...st.tok.map(Math.abs));
      for(let k=0;k<G;k++){const y=6+k*rh,sc=i>=1,col=sc?(r[k]?'var(--c3)':'var(--c2)'):'var(--dim)';
        s+='<g class="rd-grR" data-k="'+k+'" style="cursor:pointer"><rect x="0" y="'+y+'" width="'+W+'" height="'+(rh-2)+'" fill="transparent"/>'+RD.t(2,y+rh/2+2,'response '+(k+1),{fs:rh<22?9.5:10.5});
        const w=bw*st.L[k]/700;s+='<rect x="'+bx+'" y="'+(y+3)+'" width="'+w.toFixed(1)+'" height="'+(rh-8)+'" rx="2" fill="'+col+'" opacity="'+(sc?0.85:0.6)+'"/>';
        if(i===0||W>=480)s+=RD.t(bx+w+4,y+rh/2+2,st.L[k]+' tok',{fs:9,fill:'var(--mute)'});
        if(sc)s+=RD.t(W-r0+6,y+rh/2+2,r[k]?'pass 1':'fail 0',{fs:10,fill:col,w:600});
        if(i>=3)s+=RD.t(W-r0+(W<480?50:60),y+rh/2+2,'Â '+RD.sg(st.ad.A[k],2),{fs:10.5,w:600,fill:st.ad.A[k]>0?'var(--c3)':st.ad.A[k]<0?'var(--c2)':'var(--mute)'});
        if(i>=4){const tw=Math.abs(st.tok[k])/maxT*Math.min(40,r0*0.25);s+='<rect x="'+(W-tw-2).toFixed(1)+'" y="'+(y+rh/2-3)+'" width="'+tw.toFixed(1)+'" height="6" fill="var(--c4)"/>'}
        s+='</g>'}
      if(i>=2){const ym=H-12;s+=RD.t(2,ym,'mean '+RD.n(st.ad.m,3)+'   std '+RD.n(st.ad.sd,3),{fs:10.5,w:600})}
      if(i>=4)s+=RD.t(W-2,H-12,'per-token weight',{a:'end',fs:9.5,fill:'var(--c4)'});
      P.innerHTML=RD.svg(W,H,s,'GRPO group');
      Tt.textContent=STEPS[i]+' ('+(kind==='grpo'?'GRPO':kind==='drgrpo'?'Dr. GRPO':'RLOO')+', '+G+' responses)';
      const allSame=st.ad.sd===0,nc=r.reduce((a,b)=>a+b,0);
      Xp.innerHTML=[
        'The policy samples '+G+' responses to the same prompt at temperature about 1. Lengths differ (illustrative).',
        'A verifier scores each: '+nc+' of '+G+' pass. No reward model, no critic.',
        allSame?'Every response scored the same, so the standard deviation is 0: this group carries no learning signal at all (DAPO\'s dynamic sampling drops such groups; dividing by a zero standard deviation is also a classic bug).':'The group mean '+RD.n(st.ad.m,3)+' is the baseline: it plays the role V(s) plays in an actor-critic. GRPO also divides by the standard deviation '+RD.n(st.ad.sd,3)+'.',
        allSame?'All advantages are 0.':kind==='grpo'?'Â = (r − mean)/std. A lone correct answer in a hard group gets a large push ('+(nc===1?RD.sg(st.ad.A[0],3):'compare 1 of 16')+'); in a half-right group each correct answer gets +1.000. That gap is Dr. GRPO\'s difficulty bias.':kind==='drgrpo'?'Dr. GRPO drops the division by the standard deviation: Â = r − mean, so a correct answer is worth the same push however hard the prompt.':'RLOO\'s baseline for each response is the mean of the other '+(G-1)+': a correct answer gets 1 minus the others\' pass rate.',
        kind==='drgrpo'?'Dr. GRPO divides every response by the same constant (here the longest length, '+st.Lmax+'), so each token of every response gets the same weight per unit of advantage, short or long.':'GRPO\'s 1/|o| spreads each response\'s advantage over its own length: a long wrong answer is penalised less per token than a short one ('+(st.ad.A.some((a,k)=>a<0)?'per 1,000 tokens: '+RD.n(1000*Math.max(...st.tok.filter(t=>t<0)),3)+' on the longest wrong answer against '+RD.n(1000*Math.min(...st.tok.filter(t=>t<0)),3)+' on the shortest':'no wrong answers here')+'), so wrong answers drift longer: Dr. GRPO\'s length bias.'][i];
      N.innerHTML=RD.stat('Passes',nc+' / '+G,'')+RD.stat('Mean, std',RD.n(st.ad.m,3)+', '+RD.n(st.ad.sd,3),'population std')+RD.stat('Σ advantages',RD.n(st.ad.A.reduce((a,b)=>a+b,0),3),kind==='rloo'?'not zero-sum in general':'zero by construction')+RD.stat('Top advantage',RD.sg(Math.max(...st.ad.A),3),'')}
    const an=RD.anim({card:'rd-gr',ctl:'rd-grC',n:STEPS.length,ms:2200,draw,label:'Step'});
    function setBtns(){[...document.querySelectorAll('#rd-grG button')].forEach(b=>b.classList.toggle('on',b.dataset.p===pre))}
    document.getElementById('rd-grG').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;pre=b.dataset.p;G=PRE[pre].G;r=PRE[pre].r.slice();setBtns();an.reset(STEPS.length);an.play()});
    document.getElementById('rd-grK').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;kind=b.dataset.k;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));an.redraw()});
    P.addEventListener('click',e=>{const g=e.target.closest('.rd-grR');if(!g)return;const k=+g.dataset.k;r[k]=1-r[k];pre='';setBtns();if(an.i<1)an.go(3);else an.redraw()});
    setBtns();RD.onResize(()=>an.redraw());
  })();

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
      L_dp:['Dynamic programming','Policy or value iteration: exact answers; a sweep over every state per iteration.','rd-plan'],
      L_az:['Search with learned networks (AlphaZero)','Monte Carlo tree search over the known rules, with policy and value networks to focus it; large compute per move.','rd-mb'],
      L_off:['Behaviour cloning or offline RL','Clone the data if it is expert; otherwise offline RL (CQL, IQL) that stays close to the data to avoid distribution shift.','rd-off'],
      L_rlvr:['RLVR with GRPO (or PPO)','A verifier as the reward removes the learned reward model the policy would otherwise exploit; GRPO avoids the per-token critic. Watch for all-same groups and length bias.','rd-llm'],
      L_ppo_rlhf:['RLHF with PPO','A reward model plus PPO with a per-token KL penalty to a frozen reference; four models in memory.','rd-llm'],
      L_grpo_rm:['GRPO with a reward model, or DPO','A group of sampled responses per prompt as the baseline instead of a critic; or DPO offline on preference pairs. Watch for reward hacking.','rd-llm'],
      L_mb:['Learn a model and plan (MuZero, Dreamer)','Plan in a learned latent space; large compute per decision, and model errors compound over long plans.','rd-mb'],
      L_sarsa:['SARSA','On-policy: it optimises the exploratory policy it actually runs, so it learns the safer behaviour (cliff walking).','rd-samp'],
      L_q:['Q-learning','Off-policy: learns the greedy optimum while exploring; can replay old experience.','rd-samp'],
      L_sac:['SAC or TD3','Off-policy actor-critics with replay: far fewer environment steps than PPO.','rd-cont'],
      L_ppo:['PPO','Robust in any action space; costs data, because each batch is used for a few epochs and then discarded.','rd-ppo'],
      L_dqn:['The DQN family (Rainbow)','Off-policy replay reuses old data; needs a max over discrete actions.','rd-dqn']};
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
