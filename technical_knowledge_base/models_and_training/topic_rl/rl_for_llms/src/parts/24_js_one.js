// ---- Section 5: one real response through RLHF-PPO, GRPO with a verifier, and Dr. GRPO, token by token ----
(function(){
  const E=window.LLE,D=window.LLD;
  const P=document.getElementById('rd-onP'),Tt=document.getElementById('rd-onT'),Xp=document.getElementById('rd-onX'),N=document.getElementById('rd-onN'),Lg=document.getElementById('rd-onL'),RB=document.getElementById('rd-onR'),Note=document.getElementById('rd-onNote');
  if(!P)return;
  const BETA_PPO=0.02,BETA_GRPO=0.04;let mode='ppo',fi=0,lam=1,rsrc='rm';
  RB.innerHTML=D.feat.map((f,k)=>'<button data-f="'+k+'"'+(k?'':' class="on"')+'>'+(f.pass?'A correct response':'A wrong response')+' ('+f.L+' tokens)</button>').join('')+'<button data-l="1" title="GAE lambda">GAE λ = 1</button><button data-s="1" title="Reward source for PPO">PPO reward: reward model</button>';
  const STEPS=['The response','The score','The KL to the reference','The baseline','The advantage, token by token','The weight each token gets in the loss'];
  function vAt(f,t,key){// value of the prefix before token t, linear between the measured cut points
    const c=f.cuts,v=f[key];if(t<=c[0])return v[0];for(let j=1;j<c.length;j++)if(t<=c[j]){const a=(t-c[j-1])/(c[j]-c[j-1]);return v[j-1]*(1-a)+v[j]*a}return v[v.length-1]}
  function calc(){const f=D.feat[fi],g=D.groups[f.g],T=f.L,o={f,g,T};
    if(mode==='ppo'){o.R=rsrc==='rm'?f.rm:f.pass;o.rew=E.shaped(f.lr,o.R,BETA_PPO);o.kl=f.lr.map(x=>-BETA_PPO*x);o.V=[];for(let t=0;t<T;t++)o.V.push(vAt(f,t,rsrc==='rm'?'vrm':'vpass'));
      o.A=E.gae(o.rew,o.V,1,lam);o.w=o.A.map(a=>a/T)}
    else{const ad=E.groupAdv(g.r,mode==='dr'?'drgrpo':'grpo');o.ad=ad;const a=ad.A[f.i];o.A=new Array(T).fill(a);
      o.kl=f.lr.map(x=>BETA_GRPO*E.k3(Math.exp(-x)));
      const w=E.tokenWeights(ad.A,g.L,mode==='dr'?'drgrpo':'grpo')[f.i];o.w=new Array(T).fill(w);o.wAll=E.tokenWeights(ad.A,g.L,mode==='dr'?'drgrpo':'grpo')}
    return o}
  const col=(v,m)=>{const a=Math.min(1,Math.abs(v)/m),p=Math.round(a*70);return v===0?'transparent':'color-mix(in srgb, '+(v>0?'var(--c3)':'var(--c2)')+' '+p+'%, var(--bg))'};
  function draw(i){const o=calc(),f=o.f,T=o.T,W=RD.width(P),l=46,r=10,t=14,H=200,b=26,X=k=>l+(W-l-r)*(k+0.5)/T,bw=Math.max(0.6,(W-l-r)/T-0.4);let s='',vals=null,lab='';
    if(i===0){vals=f.lr.map(()=>0)}
    if(i===1){vals=f.lr.map((x,k)=>k===T-1?(mode==='ppo'?o.R:f.pass):0);lab=mode==='ppo'?(rsrc==='rm'?'reward-model score, last token only':'verifier reward, last token only'):'verifier: '+(f.pass?'pass 1':'fail 0')+', last token'}
    if(i===2){vals=o.kl;lab=mode==='ppo'?'−β log(π/π_ref) added to each token\'s reward (β = 0.02)':'β · k3 per token, added to the loss (β = 0.04)'}
    if(i===3){vals=null}
    if(i===4){vals=o.A;lab=mode==='ppo'?'GAE advantage, λ = '+lam:'Â, identical on every token'}
    if(i===5){vals=o.w;lab=mode==='ppo'?'Â_t / '+T+' (token mean)':mode==='dr'?'Â / (G · L_max)':'Â / (G · |o|)'}
    if(vals){const m=Math.max(1e-12,...vals.map(Math.abs)),lo=Math.min(0,...vals),hi=Math.max(0,...vals),sp=(hi-lo)||1,Y=v=>t+(H-t-b)*(hi-v)/sp;
      s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(0).toFixed(1)+'" y2="'+Y(0).toFixed(1)+'" stroke="var(--line)"/>';
      if(hi>0)s+=RD.t(l-4,Y(hi)+4,RD.n(hi,Math.abs(hi)<0.01?5:3),{a:'end',fs:9,fill:'var(--mute)'});if(lo<0)s+=RD.t(l-4,Y(lo)+4,RD.n(lo,Math.abs(lo)<0.01?5:3),{a:'end',fs:9,fill:'var(--mute)'});
      vals.forEach((v,k)=>{if(!v)return;const y0=Y(0),y1=Y(v);s+='<rect x="'+(X(k)-bw/2).toFixed(2)+'" y="'+Math.min(y0,y1).toFixed(1)+'" width="'+bw.toFixed(2)+'" height="'+Math.max(0.8,Math.abs(y1-y0)).toFixed(1)+'" fill="'+(v>0?'var(--c3)':'var(--c2)')+'"/>'});
      if(i===0)s+=RD.t((W+l)/2,H/2,T+' tokens, sampled at temperature 1',{a:'middle',fs:12,fill:'var(--mute)'})}
    else{// baseline
      if(mode==='ppo'){const V=o.V,pad=rsrc==='rm'?0.5:0.1,lo=Math.min(...V,o.R)-pad,hi=Math.max(...V,o.R)+pad,Y=v=>t+(H-t-b)*(hi-v)/(hi-lo);
        s+='<polyline fill="none" stroke="var(--c4)" stroke-width="2.2" points="'+V.map((v,k)=>X(k).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'"/>';
        const vk=rsrc==='rm'?f.vrm:f.vpass;f.cuts.forEach((c,j)=>s+='<circle cx="'+X(Math.min(T-1,c)).toFixed(1)+'" cy="'+Y(vk[j]).toFixed(1)+'" r="3.5" fill="var(--c4)"/>');
        s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(o.R).toFixed(1)+'" y2="'+Y(o.R).toFixed(1)+'" stroke="var(--c3)" stroke-dasharray="4 3"/>'+RD.t(W-r,Y(o.R)-4,'final score '+RD.n(o.R,2),{a:'end',fs:9.5,fill:'var(--c3)'});
        [lo+pad,hi-pad].forEach(v=>s+=RD.t(l-4,Y(v)+4,RD.n(v,rsrc==='rm'?1:2),{a:'end',fs:9,fill:'var(--mute)'}));lab=rsrc==='rm'?'V(s_t): expected reward-model score from each prefix':'V(s_t): chance of passing the verifier from each prefix'}
      else{const g=o.g,ad=o.ad,Y=v=>t+(H-t-b)*(1.1-v)/1.2;
        s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(ad.m).toFixed(1)+'" y2="'+Y(ad.m).toFixed(1)+'" stroke="var(--c4)" stroke-width="2.2"/>'+RD.t(l+4,Y(ad.m)-5,'group mean '+RD.n(ad.m,3)+(mode==='grpo'?', std '+RD.n(ad.sd,3):''),{fs:10,fill:'var(--c4)'});
        g.r.forEach((v,k)=>{const x=l+(W-l-r)*(k+0.5)/g.r.length;s+='<circle cx="'+x.toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="'+(k===f.i?6:4)+'" fill="'+(v?'var(--c3)':'var(--c2)')+'"'+(k===f.i?' stroke="var(--ink)" stroke-width="1.5"':'')+'/>'});
        [0,1].forEach(v=>s+=RD.t(l-4,Y(v)+4,String(v),{a:'end',fs:9,fill:'var(--mute)'}));lab='the 16 responses to this prompt (ringed: this one)'}}
    if(lab)s+=RD.t(l,H-8,lab,{fs:10,fill:'var(--mute)'});
    P.innerHTML=RD.svg(W,H,s,STEPS[i])+tokStrip(f,i,vals);
    Tt.textContent=(i+1)+'. '+STEPS[i]+' ('+(mode==='ppo'?'RLHF with PPO':mode==='dr'?'Dr. GRPO':'GRPO with a verifier')+')';
    Xp.innerHTML=caption(i,o);
    const models=mode==='ppo'?(rsrc==='rm'?'4':'3'):'2',roll=mode==='ppo'?'1':String(o.g.r.length),uniq=new Set(o.A.map(a=>a.toFixed(6))).size;
    N.innerHTML=RD.stat('Large models in memory',models,mode==='ppo'?(rsrc==='rm'?'policy, reference, reward, value':'policy, reference, value; verifier is a program'):'policy, reference; verifier is a program')+RD.stat('Rollouts for this prompt',roll,'')+RD.stat('Networks trained',mode==='ppo'?'2':'1',mode==='ppo'?'policy and critic':'policy')+RD.stat('Distinct token advantages',i>=4?String(uniq):'·','of '+T+' tokens')}
  function tokStrip(f,i,vals){const v=vals||f.lr.map(()=>0),m=Math.max(1e-12,...v.map(Math.abs));
    return '<div class="scrollbox" style="max-height:150px;margin-top:6px"><div class="tk sm">'+f.toks.map((x,k)=>'<span style="background:'+(i===0||i===3?'transparent':col(v[k],m))+'" title="token '+(k+1)+(vals?': '+RD.n(v[k],5):'')+'">'+RD.esc(x.replace(/\n/g,'↵'))+'</span>').join('')+'</div></div>'}
  function jump(f){const v=rsrc==='rm'?f.vrm:f.vpass;let b=1;for(let j=2;j<v.length;j++)if(Math.abs(v[j]-v[j-1])>Math.abs(v[b]-v[b-1]))b=j;
    const a=f.cuts[b-1],c=f.cuts[b],txt=f.toks.slice(a,c).join('').replace(/\s+/g,' ').trim();
    return 'The largest move is between tokens '+a+' and '+c+', from '+RD.n(v[b-1],2)+' to '+RD.n(v[b],2)+(rsrc==='rm'?'':' chance of passing')+': "'+RD.esc(txt.length>90?txt.slice(0,90)+'…':txt)+'".'+(rsrc==='rm'&&!f.pass?' The reward model\'s expected score rises as the answer goes wrong; switch the reward to the verifier and the same tokens are where the chance of passing collapses.':'')}
  function caption(i,o){const f=o.f;
    if(mode==='ppo')return ['The policy wrote one answer to the prompt ('+f.L+' tokens). PPO for RLHF usually samples one response per prompt; the reward model, reference and critic will each read it.',
      rsrc==='rm'?'A reward model reads the whole answer and returns one score, '+RD.n(f.rm,3)+' (Skywork-Reward-V2-Qwen3-0.6B, a real model). It lands on the last token only; every other token\'s reward is 0. This answer is '+(f.pass?'correct':'wrong')+', which the reward model is not told.':'PPO with a verifiable reward, as Tülu 3 ran it: the verifier\'s '+f.pass+' lands on the last token. Same critic machinery, a reward that cannot be flattered.',
      'Every token\'s reward gets −β log(π<sub>θ</sub>/π<sub>ref</sub>): tokens the policy now prefers more than the reference are taxed (orange), tokens it likes less are subsidised (green). Here the reference is a stand-in, the base model the instruct model was trained from; β = 0.02 as in InstructGPT.',
      'The critic predicts, from every prefix, the score the finished answer will get. Here it is measured, not learned: 16 continuations sampled from each of '+f.cuts.length+' prefixes and scored by the same '+(rsrc==='rm'?'reward model':'verifier')+' (dots; the line joins them), which is what VinePPO does instead of training a value network. '+jump(f),
      'GAE turns rewards and values into a per-token advantage. With λ = '+lam+(lam===1?', each token\'s advantage is the final shaped return minus the value of its prefix: tokens written while the outcome still looked uncertain get more credit.':', most of a token\'s credit is the change in predicted value it caused, so credit concentrates where the outlook moved.')+' Toggle λ above: DeepSeek found PPO matched GRPO only at λ = 1.',
      'PPO averages over the batch\'s tokens, so each token\'s weight is its own advantage. A token in a stretch where the value jumped up gets pushed hardest; one where it fell is pushed down, even inside a good answer.'][i];
    const g=o.g,ad=o.ad,nc=g.r.reduce((a,b)=>a+b,0),a=ad.A[f.i];
    return ['The policy wrote one answer ('+f.L+' tokens), one of '+g.r.length+' sampled for the same prompt. No critic will read it, and no reward model.',
      'A program checks the boxed answer against the reference: '+(f.pass?'pass, reward 1':'fail, reward 0')+'. The other 15 are checked the same way ('+nc+' of 16 pass). Cheap, exact on this task, and blind to everything but the final number.',
      'The KL is not in the reward: β · k3 per token is added to the loss (β = 0.04 as in DeepSeekMath), so it pulls the policy toward the reference without changing anyone\'s advantage. Same stand-in reference as before.',
      'The baseline is the group itself: mean '+RD.n(ad.m,3)+(mode==='grpo'?', and GRPO divides by the group\'s standard deviation, '+RD.n(ad.sd,3):'; Dr. GRPO does not divide by the spread')+'. No network predicts it; 16 samples measure it.',
      'Every token gets the same advantage, '+RD.sg(a,3)+'. The tokens that decided the answer and the boilerplate around them are credited alike; over many prompts the noise averages out.',
      mode==='dr'?'Dr. GRPO divides by a constant (the longest response in the group, '+Math.max(...g.L)+' tokens), so every token of every response in the group carries the same weight per unit of advantage: '+RD.n(o.w[0],6)+' here.':'GRPO divides by this response\'s own length ('+f.L+'), then by G: '+RD.n(o.w[0],6)+' per token. A longer response of the same score would get a smaller weight per token: the length bias of section 7.'][i]}
  const an=RD.anim({card:'rd-on',ctl:'rd-onC',n:STEPS.length,ms:2600,draw,label:'Step'});
  document.getElementById('rd-onM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));RB.querySelectorAll('[data-l],[data-s]').forEach(x=>x.style.display=mode==='ppo'?'':'none');an.reset(STEPS.length);an.play()});
  RB.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.l){lam=lam===1?0.95:1;b.textContent='GAE λ = '+lam;an.redraw();return}
    if(b.dataset.s){rsrc=rsrc==='rm'?'ver':'rm';b.textContent='PPO reward: '+(rsrc==='rm'?'reward model':'verifier');an.redraw();return}
    fi=+b.dataset.f;[...RB.querySelectorAll('[data-f]')].forEach(x=>x.classList.toggle('on',x===b));an.redraw()});
  Lg.innerHTML='<span><i style="background:var(--c3)"></i>positive</span><span><i style="background:var(--c2)"></i>negative</span><span><i class="ln" style="background:var(--c4)"></i>baseline</span>';
  Note.innerHTML='Real data: GSM8K test problem '+D.feat.map(f=>f.pid).filter((v,k,a)=>a.indexOf(v)===k).join(', ')+', Qwen2.5-0.5B-Instruct (float32 for π<sub>θ</sub>), the base model as a stand-in reference, a real reward model, values measured by 16 continuations from each prefix. Tokens are shaded by the step\'s quantity; hover one for its value.';
  RD.onResize(()=>an.redraw());
})();
