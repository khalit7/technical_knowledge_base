// ---- Method atlas (t-atlas), part d: two chains of fixes, animated one paper at a time ----
// Each step is one row of the atlas; its caption is that row's "Problem it fixed" cell with its quote and source.
// The value chain shows DQN plus each paper's own change (they were separate papers); Rainbow then combines them.
(function(){
const A=window.ATLAS,AT=window.AT,esc=AT.esc;
const CH={
 value:{comp:[['table','Q-table','one number per state and action'],['net','Q-network','a convolutional net on raw pixels'],['replay','Replay buffer','random minibatches of past steps'],
   ['target','Target network','a frozen copy, refreshed every C updates'],['double','Double-Q target','online net picks, target net values'],['prio','Prioritized replay','replays large-TD-error steps more'],
   ['duel','Dueling head','V(s) plus advantages'],['dist','Distributional output','the return\'s distribution, not its mean'],['multi','Multi-step returns','n rewards before bootstrapping'],['noisy','Noisy nets','learned weight noise in place of epsilon-greedy']],
  steps:{qlearn:{on:['table'],tgt:'Q(s,a) &larr; Q(s,a) + &alpha; [ r + &gamma; max<sub>a\'</sub> Q(s\',a\') &minus; Q(s,a) ]',c:{nets:'0 (a table)',fix:'0 of 6'}},
   dqn13:{on:['net','replay'],tgt:'y = r + &gamma; max<sub>a\'</sub> Q(s\',a\'; &theta;) &nbsp;(the weights being trained)',c:{nets:'1',fix:'0 of 6'}},
   dqn15:{on:['net','replay','target'],tgt:'y = r + &gamma; max<sub>a\'</sub> Q(s\',a\'; &theta;<sup>&minus;</sup>)',c:{nets:'2 (online, target)',fix:'0 of 6'}},
   ddqn:{on:['net','replay','target','double'],tgt:'y = r + &gamma; Q(s\', argmax<sub>a\'</sub> Q(s\',a\'; &theta;); &theta;<sup>&minus;</sup>)',c:{nets:'2',fix:'1 of 6'}},
   per:{on:['net','replay','target','prio'],tgt:'DQN\'s y, with transitions drawn more often the larger their TD error',c:{nets:'2',fix:'1 of 6'}},
   dueling:{on:['net','replay','target','duel'],tgt:'Q(s,a) = V(s) + A(s,a) &minus; mean<sub>a\'</sub> A(s,a\'); DQN\'s y unchanged',c:{nets:'2',fix:'1 of 6'}},
   c51:{on:['net','replay','target','dist'],tgt:'Z(s,a) &larr; projection onto 51 atoms of r + &gamma; Z(s\', a*)',c:{nets:'2',fix:'1 of 6'}},
   rainbow:{on:['net','replay','target','double','prio','duel','dist','multi','noisy'],tgt:'n-step, distributional, double target: projection of &Sigma;<sub>k&lt;n</sub> &gamma;<sup>k</sup> r<sub>t+k+1</sub> + &gamma;<sup>n</sup> Z(s<sub>t+n</sub>, a*; &theta;<sup>&minus;</sup>), a* chosen by the online net',c:{nets:'2',fix:'6 of 6'}}},
  counters:[['nets','Networks held'],['fix','Of Rainbow\'s six extensions']]},
 llm:{comp:[['policy','Policy','the model being trained'],['value','Value model','a critic as large as the policy'],['rm','Reward model','scores whole responses'],['ref','Reference model','KL anchor to the start'],
   ['env','Environment reward','games, robots'],['verifier','Verifier','a program that checks the answer'],['group','G samples per prompt','the group mean is the baseline'],['stdn','Divide by group std','rescales each prompt'],
   ['lenn','Divide by own length','per-response token mean'],['clip','Clip ratio to 1 &plusmn; 0.2','token-level ratio'],['cliph','Clip-higher: 0.8 to 1.28','token-level ratio'],['dyn','Drop all-same groups','zero-advantage groups resampled'],['seq','Sequence-level ratio','one clipped ratio per response']],
  steps:{ppo:{on:['policy','value','env','clip'],tgt:'&Acirc;<sub>t</sub> = &Sigma;<sub>l</sub> (&gamma;&lambda;)<sup>l</sup> &delta;<sub>t+l</sub>, &delta; = r + &gamma;V(s\') &minus; V(s); maximise min(&rho;&Acirc;, clip(&rho;, 1&minus;&epsilon;, 1+&epsilon;)&Acirc;)',c:{nets:'2 (policy, value)',rew:'environment',g:'1'}},
   rlhf:{on:['policy','value','rm','ref','clip'],tgt:'r<sub>t</sub> = RM(x, y) at the last token &minus; &beta; log(&pi;/&pi;<sub>ref</sub>) at every token; &Acirc; from the value model by GAE',c:{nets:'4 (policy, value, reward, reference)',rew:'learned reward model',g:'1'}},
   grpo:{on:['policy','rm','ref','group','stdn','lenn','clip'],tgt:'&Acirc;<sub>i</sub> = (r<sub>i</sub> &minus; mean r) / std r for every token of response i; loss averaged over |o<sub>i</sub>|; + &beta; KL to the reference',c:{nets:'3 (policy, reward, reference)',rew:'learned reward model',g:'G (64 in DeepSeekMath)'}},
   rlvr:{on:['policy','value','ref','verifier','clip'],tgt:'r = &alpha; if the verifier passes, else 0; then PPO with a value model, as Tulu 3 did',c:{nets:'3 (policy, value, reference)',rew:'verifier',g:'1'}},
   drgrpo:{on:['policy','verifier','group','clip'],tgt:'&Acirc;<sub>i</sub> = r<sub>i</sub> &minus; mean r; token losses summed and divided by a constant; no KL term',c:{nets:'1 (policy)',rew:'verifier',g:'G'}},
   dapo:{on:['policy','verifier','group','cliph','dyn'],tgt:'GRPO\'s &Acirc;<sub>i</sub>; ratio clipped to [1 &minus; 0.2, 1 + 0.28]; mean over every token in the batch; groups with identical rewards dropped; no KL term',c:{nets:'1 (policy)',rew:'verifier (rule)',g:'G'}},
   gspo:{on:['policy','group','seq'],tgt:'s<sub>i</sub> = (&pi;<sub>&theta;</sub>(y<sub>i</sub>|x) / &pi;<sub>old</sub>(y<sub>i</sub>|x))<sup>1/|y<sub>i</sub>|</sup>; maximise min(s<sub>i</sub>&Acirc;<sub>i</sub>, clip(s<sub>i</sub>)&Acirc;<sub>i</sub>) per response',c:{nets:'1, plus a reference if a KL term is used (the paper omits it "for brevity")',rew:'not stated in the abstract',g:'G'}}},
  counters:[['nets','Large networks in memory'],['rew','Reward from'],['g','Samples per prompt']]}};
const NOTE={value:'Networks counted from each paper\'s method: DQN 2015 adds the target copy; DDPG-style actor networks are not in this chain.',
 llm:'Network counts: PPO for RLHF holds a value model, a reward model and a reference model besides the policy, and GRPO drops the value model (DeepSeekMath, Figure 4); Dr. GRPO and DAPO remove the KL term and so the reference. A verifier is a program, not a network.'};
const st={chain:'value',i:0,play:false,t:null};
function steps(){return A.chains[st.chain].steps}
function draw(){
  const ch=CH[st.chain],ss=steps(),id=ss[st.i],r=AT.byId[id],S=ch.steps[id],prev=st.i?ch.steps[ss[st.i-1]]:null;
  document.getElementById('at-chain').innerHTML=Object.keys(A.chains).map(k=>'<button data-c="'+k+'" class="'+(st.chain===k?'on':'')+'">'+esc(A.chains[k].name)+'</button>').join('');
  document.getElementById('at-steps').innerHTML=ss.map((s,i)=>'<button data-i="'+i+'" class="'+(i===st.i?'on':'')+'">'+(i+1)+'. '+esc(AT.byId[s].short)+'</button>').join('');
  const sc=document.getElementById('at-scrub');sc.max=ss.length-1;sc.value=st.i;
  document.getElementById('at-play').textContent=st.play?'Pause':'Play';
  document.getElementById('at-recipe').innerHTML=ch.comp.map(c=>{const on=S.on.includes(c[0]),was=prev&&prev.on.includes(c[0]);
    const cls=on?(prev&&!was?'new':''):(was?'gone':'off');return '<div class="cp '+cls+'"><b>'+c[1]+'</b><small>'+c[2]+(cls==='new'?' (added here)':cls==='gone'?' (removed here)':'')+'</small></div>'}).join('');
  document.getElementById('at-tgt').innerHTML='<span class="small mute" style="font-family:inherit">'+esc(r.name)+', '+AT.year(r)+': </span>'+S.tgt;
  document.getElementById('at-cnts').innerHTML=ch.counters.map(c=>'<div class="stat"><div class="k">'+esc(c[1])+'</div><div class="v">'+esc(S.c[c[0]])+'</div></div>').join('');
  const x=r.cells.fixed;
  document.getElementById('at-acap').innerHTML='<b>Step '+(st.i+1)+' of '+ss.length+': '+esc(r.name)+'.</b> '+(st.i?'What it fixed: ':'Starting point: ')+esc(x.v)+'.'+(x.q?' <i>"'+esc(x.q)+'"</i>':'')+' <span class="small">'+AT.srcLink(x.s,x.l)+'</span><br><span class="small mute">'+esc(NOTE[st.chain])+'</span>'}
function visible(){const t=document.getElementById('t-atlas');if(!t||t.hidden||document.hidden)return false;const b=document.getElementById('at-anim-s').getBoundingClientRect();return b.bottom>0&&b.top<innerHeight}
function tick(){clearTimeout(st.t);if(!st.play)return;st.t=setTimeout(()=>{if(visible()){st.i=(st.i+1)%steps().length;draw()}tick()},+document.getElementById('at-speed').value)}
function wire(){
  document.getElementById('at-chain').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.chain=b.dataset.c;st.i=0;draw()});
  document.getElementById('at-steps').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.i=+b.dataset.i;draw()});
  document.getElementById('at-prev').addEventListener('click',()=>{st.i=Math.max(0,st.i-1);draw()});
  document.getElementById('at-next').addEventListener('click',()=>{st.i=Math.min(steps().length-1,st.i+1);draw()});
  document.getElementById('at-scrub').addEventListener('input',e=>{st.i=+e.target.value;draw()});
  document.getElementById('at-play').addEventListener('click',()=>{st.play=!st.play;if(st.play&&st.i===steps().length-1)st.i=0;draw();tick()});
  document.getElementById('at-speed').addEventListener('change',tick)}
let done=false;
function render(){if(!done){done=true;wire();
  // starts paused always; under reduced motion it also stays paused until the reader presses Play
  st.play=false}draw()}
window.TAB_RENDER['t-atlas'].push(render);
})();
