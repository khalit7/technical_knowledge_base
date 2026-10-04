// ---- Reading tab: the small widgets (lambda-return weights, one transition two targets, the cliff fall chance), the decision tree and the self-check list.
(function(){
'use strict';
const M=window.MFE;if(!M||!window.RD)return;const $=id=>document.getElementById(id),n=(v,d)=>RD.n(v,d==null?3:d);
// ---------- lambda-return on the worked random-walk episode ----------
(function(){const sl=$('rd-laml');if(!sl)return;
  const R=[0,0,1],Vn=[0.5,0.5];// rewards from C; estimates of D and E (all 0.5)
  function draw(){const l=+sl.value/100;$('rd-lamv').textContent=l.toFixed(2);const o=M.lamReturn(R,Vn,1,l),el=$('rd-lamP'),W=RD.width(el),H=150,lw=Math.min(150,W*0.36),r=56,X=v=>lw+(W-lw-r)*v;
    const lab=['G<tspan font-size="8" dy="-4">(1)</tspan><tspan dy="4"> = 0 + V(D)</tspan>','G<tspan font-size="8" dy="-4">(2)</tspan><tspan dy="4"> = 0 + 0 + V(E)</tspan>','G<tspan font-size="8" dy="-4">(3)</tspan><tspan dy="4"> = G, the full return</tspan>'];let s='';
    o.w.forEach((w,i)=>{const y=8+i*34;s+='<text x="0" y="'+(y+13)+'" font-size="11">'+lab[i]+'</text><rect x="'+lw+'" y="'+(y+2)+'" width="'+Math.max(1,X(w)-lw).toFixed(1)+'" height="15" rx="2" fill="'+(i===2?'var(--c2)':'var(--c1)')+'"/><text x="'+(X(w)+5).toFixed(1)+'" y="'+(y+14)+'" font-size="11">'+n(w,3)+' &#215; '+n(o.G[i],2)+'</text>'});
    const y=8+3*34;s+='<text x="0" y="'+(y+13)+'" font-size="11" font-weight="600">G&#955; target for C</text><rect x="'+lw+'" y="'+(y+2)+'" width="'+Math.max(1,X(o.v)-lw).toFixed(1)+'" height="15" rx="2" fill="var(--ink)" opacity=".7"/><text x="'+(X(o.v)+5).toFixed(1)+'" y="'+(y+14)+'" font-size="11" font-weight="600">'+n(o.v,4)+'</text>';
    el.innerHTML=RD.svg(W,H,s,'Weights of the n-step returns in the lambda-return');
    $('rd-lamT').innerHTML='Weights (1 &minus; &lambda;)&lambda;<sup>n&minus;1</sup> = '+o.w.slice(0,2).map(w=>n(w,3)).join(' and ')+' on the one- and two-step returns, and the lump &lambda;<sup>2</sup> = '+n(o.w[2],3)+' on the full return; G<sup>&lambda;</sup> = '+o.w.map((w,i)=>n(w,3)+' &times; '+n(o.G[i],1)).join(' + ')+' = <b>'+n(o.v,4)+'</b> <i class="nl d">derived</i>. TD(0)\'s target is 0.5 (&lambda; = 0), Monte Carlo\'s is 1 (&lambda; = 1). The bars are the weights; each row\'s right-hand number is weight &times; return.'}
  sl.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw()})();
// ---------- one transition, two targets ----------
(function(){const box=$('rd-ttS');if(!box)return;
  const P=[['R','reward R',-1,-10,10,1],['q','Q(S, right) now',-5,-20,0,0.5],['qBest','Q(S&prime;, right)',-4,-20,0,0.5],['qDown','Q(S&prime;, down), into the cliff',-100,-120,0,1],['a','step size &alpha;',0.5,0.05,1,0.05],['eps','&epsilon; (Expected SARSA)',0.1,0,1,0.05]];
  box.innerHTML=P.map(p=>'<label>'+p[1]+' = <b id="rd-tt'+p[0]+'v"></b><input type="range" id="rd-tt'+p[0]+'" min="'+p[3]+'" max="'+p[4]+'" step="'+p[5]+'" value="'+p[2]+'" aria-label="'+p[1].replace(/&[a-z]+;/g,'')+'"></label>').join('')+
    '<label>A&prime; actually taken next <select id="rd-ttap"><option value="down" selected>down (exploratory)</option><option value="right">right (greedy)</option></select></label>';
  function draw(){const v={};P.forEach(p=>{v[p[0]]=+$('rd-tt'+p[0]).value;$('rd-tt'+p[0]+'v').textContent=RD.n(v[p[0]],p[5]<1?2:0)});
    const ap=$('rd-ttap').value,o=M.twoTargets({R:v.R,q:v.q,qBest:v.qBest,qDown:v.qDown,qO1:-5,qO2:-6,qAp:ap==='down'?v.qDown:v.qBest,a:v.a,g:1,eps:v.eps});
    $('rd-ttO').innerHTML=RD.stat('SARSA target R + Q(S&prime;, A&prime;)',n(o.sarsa.tg,2),'new Q(S, right) = <b>'+n(o.sarsa.nw,2)+'</b>')+RD.stat('Q-learning target R + max Q(S&prime;, &middot;)',n(o.q.tg,2),'new Q(S, right) = <b>'+n(o.q.nw,2)+'</b>')+RD.stat('Expected SARSA target',n(o.es.tg,2),'E<sub>&pi;</sub>Q(S&prime;, &middot;) = '+n(o.es.boot,2)+'; new Q = <b>'+n(o.es.nw,2)+'</b>')}
  box.addEventListener('input',draw);box.addEventListener('change',draw);draw()})();
// ---------- the cliff fall chance ----------
(function(){const box=$('rd-fallS');if(!box)return;
  box.innerHTML='<label>&epsilon; = <b id="rd-fallev"></b><input type="range" id="rd-falle" min="0" max="0.5" step="0.01" value="0.1" aria-label="epsilon"></label><label>Number of actions m = <b id="rd-fallmv"></b><input type="range" id="rd-fallm" min="2" max="8" step="1" value="4" aria-label="number of actions"></label><label>Steps along the edge k = <b id="rd-fallkv"></b><input type="range" id="rd-fallk" min="1" max="20" step="1" value="10" aria-label="steps along the edge"></label>';
  function draw(){const e=+$('rd-falle').value,m=+$('rd-fallm').value,k=+$('rd-fallk').value;$('rd-fallev').textContent=e.toFixed(2);$('rd-fallmv').textContent=m;$('rd-fallkv').textContent=k;const o=M.cliffFall(e,m,k);
    $('rd-fallO').innerHTML=RD.stat('Chance of the fatal action per step','&epsilon;/m = '+n(o.p,4))+RD.stat('A pass with no fall','(1 &minus; &epsilon;/m)<sup>k</sup> = '+n(o.pass,3))+RD.stat('At least one fall',RD.pct(o.fall,1),'per pass along the edge')}
  box.addEventListener('input',draw);draw()})();
// ---------- which method: decision tree (from the page's earlier interactive version) ----------
(function(){const el=$('rd-tree');if(!el)return;
  const N={a:{q:'Are you predicting a fixed policy\'s values, or finding a good policy?',o:[['Predicting (evaluation)','p'],['Finding a policy (control)','c']]},
    p:{q:'Do episodes terminate, and are they short?',o:[['No: continuing task, or very long episodes','td'],['Yes, short episodes','p2']]},
    p2:{q:'Is the state close to Markov?',o:[['Yes','td2'],['No: partially observed','mc']]},
    c:{q:'Does the agent\'s reward while it is still learning matter (real hardware, costly mistakes)?',o:[['Yes','sarsa'],['No: a simulator, mistakes are cheap','c2']]},
    c2:{q:'Do you need to learn from old data or someone else\'s behaviour?',o:[['Yes','ql'],['No','ql2']]},
    td:{a:'TD (or TD(&lambda;))',w:'MC cannot learn until an episode ends; TD learns online after every step.'},
    td2:{a:'TD, or an intermediate n or &lambda;',w:'TD exploits the Markov property and has lower variance; an intermediate setting is often better than either end.'},
    mc:{a:'Monte Carlo, or a large &lambda;',w:'MC does not rely on the Markov property and has more robust convergence with function approximation.'},
    sarsa:{a:'SARSA (or Expected SARSA)',w:'On-policy: it optimises the exploring policy it actually runs, so it avoids risks its own exploration would trigger.'},
    ql:{a:'Q-learning (or Expected SARSA with a greedy target)',w:'Off-policy with no importance sampling: its target ignores which action the behaviour policy took. Multi-step off-policy targets need ratios or tree backups.'},
    ql2:{a:'Q-learning (consider Double Q-learning)',w:'It learns the optimal greedy policy directly; double learning removes maximisation bias.'}};
  const path=['a'];
  function draw(){const cur=N[path[path.length-1]];let h='<div class="rd-ph">Which method should I use?</div>';
    if(path.length>1)h+='<div class="path">'+path.slice(0,-1).map((k,i)=>{const nx=path[i+1];return N[k].o.find(o=>o[1]===nx)[0]}).join(' &rarr; ')+'</div>';
    if(cur.q)h+='<div class="q">'+cur.q+'</div><div class="rd-btns">'+cur.o.map(o=>'<button data-n="'+o[1]+'">'+o[0]+'</button>').join('')+'</div>';
    else h+='<div class="leaf"><b>'+cur.a+'</b><br>'+cur.w+'</div>';
    if(path.length>1)h+='<div class="rd-btns"><button data-back="1">Back</button><button data-reset="1">Start again</button></div>';
    el.innerHTML=h}
  el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.n)path.push(b.dataset.n);else if(b.dataset.back)path.pop();else if(b.dataset.reset)path.length=1;draw()});draw()})();
// ---------- check yourself ----------
(function(){const el=$('rd-quizL');if(!el)return;
  const Q=[
   ['What does each method use in place of DP\'s expectation over next states?','MC: the whole sampled return. TD: one sampled step plus the current estimate of the next state.'],
   ['Why is MC unbiased but high variance?','G<sub>t</sub> is a sample of exactly what V<sub>&pi;</sub> is the expectation of, but it carries every random action, transition and reward until the episode ends.'],
   ['Why is TD biased?','Its target R + &gamma;V(S&prime;) uses the current estimate V(S&prime;), which may be wrong.'],
   ['A task never terminates. Which evaluation method cannot be used as is: TD(0), Monte Carlo, TD(&lambda;) in its backward view, or SARSA?','Monte Carlo: its target is the complete return, which never arrives in a continuing task.'],
   ['On the random-walk episode C &rarr; D &rarr; E &rarr; right (all values 0.5, &alpha; = 0.1), which states does each method change, and what is V(E) after TD(0)?','TD changes only E, to 0.5 + 0.1 &times; 0.5 = 0.55 (C and D had &delta; = 0); MC changes C, D and E, each to 0.55.'],
   ['Batch MC and batch TD on the AB example: V(A)?','MC 0 (fit to the observed return), TD 0.75 (the maximum-likelihood Markov model).'],
   ['What do &lambda; = 0 and &lambda; = 1 give in TD(&lambda;)? In the &lambda;-return of the same episode from C with &lambda; = 0.5, what is the weight on the full return?','&lambda; = 0: one-step TD; &lambda; = 1: Monte Carlo. With T &minus; t = 3 the lump on G<sub>t</sub> is &lambda;<sup>T&minus;t&minus;1</sup> = 0.5<sup>2</sup> = 0.25; the returns are weighted 0.5, 0.25, 0.25 and G<sup>&lambda;</sup> = 0.625.'],
   ['What is an eligibility trace for?','The backward view: it broadcasts each TD error to recently and frequently visited states, computing TD(&lambda;) online.'],
   ['A state is only partially observed (not Markov). Which is usually more robust: TD(0), Monte Carlo, Q-learning or value iteration?','Monte Carlo: it does not exploit the Markov property, so it is usually more effective in non-Markov environments.'],
   ['Why does model-free control learn Q instead of V?','Greedy improvement over V needs the model to know where each action leads; over Q it is a plain argmax.'],
   ['What does Monte Carlo ES assume, and why is it rarely usable?','That every episode can start from any state-action pair with non-zero probability. Easy in a simulator, rarely possible when learning from real interaction.'],
   ['What does GLIE require?','Every state-action pair explored infinitely often, and the policy converging to greedy (for example &epsilon; = 1/k).'],
   ['SARSA\'s A&prime;: which action is it?','The action actually taken next by the &epsilon;-greedy policy. That is what makes SARSA on-policy.'],
   ['Which condition on the step sizes does SARSA\'s convergence theorem need?','The Robbins-Monro conditions, &Sigma;&alpha;<sub>t</sub> = &infin; and &Sigma;&alpha;<sub>t</sub><sup>2</sup> &lt; &infin;, together with GLIE policies.'],
   ['The exploratory A&prime; = down has Q = &minus;100 and the best Q(S&prime;, right) = &minus;4. With R = &minus;1, &alpha; = 0.5, Q(S, right) = &minus;5, what is SARSA\'s new Q(S, right)?','Target &minus;1 + (&minus;100) = &minus;101; &minus;5 + 0.5 &times; (&minus;101 + 5) = &minus;53. Q-learning would keep &minus;5.'],
   ['Why does one-step Q-learning need no importance sampling?','Its target uses the max over next actions, never the action the behaviour policy chose.'],
   ['Which Bellman equation does Q-learning sample?','The optimality equation for Q: it is sampled Q-value iteration.'],
   ['On the cliff with &epsilon; fixed at 0.1, which learns the edge path and which earns more per episode?','Q-learning values the greedy edge path but its &epsilon;-greedy behaviour falls in (about 22% of passes along the edge fall at least once); SARSA\'s safer path earns more online.'],
   ['What is maximisation bias, and the fix?','The max over noisy estimates is biased upwards. Double Q-learning picks the action with one table and values it with the other.'],
   ['Ordinary or weighted importance sampling: which is unbiased, and which is preferred in practice?','Ordinary (first-visit) is unbiased but its variance can be infinite; weighted is biased (the bias vanishes) with much lower variance, and is preferred.'],
   ['What is the difference between on-policy and off-policy?','Whether the values describe the policy generating the data. Off-policy learns about a target policy from a different behaviour policy; Q-learning is off-policy and still online.'],
   ['GRPO\'s end-of-sequence reward compared against a group mean sits at which end of the dial?','Monte Carlo: it uses the whole sequence\'s sampled reward and no value model. PPO with GAE sits partway along.']];
  el.innerHTML=Q.map((q,i)=>'<details class="mist"><summary>'+(i+1)+'. '+q[0]+'</summary><div class="b">'+q[1]+'</div></details>').join('')})();
})();
