// ---- Deeper: test-time compute. Calculators and charts in the Mechanism, Sampling maths, Training and Stop-paying sections ----
(function(){
const T=window.TTC;if(!T)return;
const {$,fmt,fmtBytes,mulberry32,segBind,svgEl,stat,sci,A,logFrame,lineChart,legend,n3,pc1,TM,makeAnim,onTab}=T;
// ---- Deeper tab: serial depth and KV-cache calculator ----
(function(){
  if(!$('ttcKvL'))return;
  const ids=['ttcKvL','ttcKvH','ttcKvD','ttcKvB','ttcKvT','ttcKvS'];
  function draw(){const L=+$('ttcKvL').value,h=+$('ttcKvH').value,d=+$('ttcKvD').value,b=+$('ttcKvB').value,T=Math.round(Math.pow(10,+$('ttcKvT').value)),s=+$('ttcKvS').value;
    $('ttcKvLv').textContent=L;$('ttcKvHv').textContent=h;$('ttcKvDv').textContent=d;$('ttcKvBv').textContent=b===2?'2 (BF16)':b===1?'1 (FP8)':b+' (FP32)';$('ttcKvTv').textContent=fmt(T);$('ttcKvSv').textContent=s;
    const per=2*L*h*d*b;
    $('ttcKvOut').innerHTML=stat('Serial depth D = L × T',fmt(L*T),'answering directly: '+fmt(L)+' (T = 1)')+
      stat('KV cache per token',fmtBytes(per),'2 × '+L+' × '+h+' × '+d+' × '+b+' = '+fmt(per)+' bytes')+
      stat('KV cache for the trace',fmtBytes(per*T),'one sequence of '+fmt(T)+' tokens')+
      stat('Time before the answer starts',(T/s>=100?fmt(T/s):(T/s).toFixed(1))+' s',fmt(T)+' tokens ÷ '+s+' a second (illustrative)');}
  ids.forEach(i=>$(i).addEventListener('input',draw));draw();
})();

// ---- Deeper tab: three selectors on one problem (one sample, perfect verifier, plurality vote) ----
(function(){
  if(!$('ttcSelP'))return;let m=1;
  segBind('ttcSelM',v=>{m=+v;draw()});
  function draw(){const p=+$('ttcSelP').value,n=+$('ttcSelN').value;$('ttcSelPv').textContent=p.toFixed(2);$('ttcSelNv').textContent=n;
    const ns=[1,3,5,7,9,11,15,21,31,41,63];
    const ser=[{name:'one sample: p',c:'var(--mute)',dash:true,pts:ns.map(x=>[x,p])},
      {name:'perfect verifier: 1 − (1 − p)ⁿ',c:'var(--c3)',pts:ns.map(x=>[x,TM.passk(p,x)])},
      {name:'plurality vote',c:'var(--c1)',dots:true,pts:ns.map(x=>[x,TM.plurality(p,x,m)])}];
    const narrow=$('ttcSel').clientWidth<560;
    $('ttcSelSvg').innerHTML=lineChart({W:narrow?360:640,H:240,x:[1,63],logx:true,y:[0,1],series:ser,marks:[{x:n,l:'n = '+n}],
      xt:ns.filter(x=>!narrow||[1,3,5,11,21,63].includes(x)).map(x=>[x,String(x)]),yt:[[0,'0'],[.25,'0.25'],[.5,'0.5'],[.75,'0.75'],[1,'1']],xl:'samples n (log scale)',yl:'chance the returned answer is right',label:'Accuracy against samples for three selectors'})+legend(ser);
    const q=(1-p)/m,pv=TM.passk(p,n),mv=TM.plurality(p,n,m);
    $('ttcSelOut').innerHTML=stat('Perfect verifier, pass@'+n,n3(pv,4),'1 − (1 − '+p.toFixed(2)+')^'+n+' = 1 − '+n3(Math.pow(1-p,n),4))+
      stat('Plurality vote over '+n,n3(mv,4),'correct '+p.toFixed(2)+' against '+m+' wrong answer'+(m>1?'s':'')+' at '+n3(q,3)+(m>1?' each':''))+
      stat('One sample',n3(p,2),'the baseline both selectors start from');
    $('ttcSelNote').textContent=p>q+1e-9?'The correct answer is the single most likely answer, so more votes push the vote towards 1, more slowly than a verifier.':Math.abs(p-q)<1e-9?'The correct answer is exactly as likely as each wrong one: the vote stays where it is whatever n is.':'A wrong answer is more likely than the correct one, so more votes push the vote towards 0: voting amplifies whatever is most likely.';}
  ['ttcSelP','ttcSelN'].forEach(i=>$(i).addEventListener('input',draw));onTab(draw);draw();
})();

// ---- Deeper tab: best-of-n against a learned reward model (Gao, Schulman and Hilton functional form) ----
(function(){
  if(!$('ttcBonA'))return;
  function draw(){const a=+$('ttcBonA').value,b=+$('ttcBonB').value,n=Math.round(Math.pow(10,+$('ttcBonN').value));$('ttcBonAv').textContent=a.toFixed(2);$('ttcBonBv').textContent=b.toFixed(2);$('ttcBonNv').textContent=fmt(n);
    const xs=[];for(let e=0;e<=5.0001;e+=0.05)xs.push(Math.pow(10,e));
    const dstar=a/(2*b),klStar=dstar*dstar;let nStar=null;
    {let lo=1,hi=1e300;if(TM.klBon(1e300)>klStar){for(let i=0;i<400;i++){const mid=Math.sqrt(lo*hi);if(TM.klBon(mid)<klStar)lo=mid;else hi=mid}nStar=lo}}
    const ymax=Math.max(1e-9,dstar*(a-b*dstar))*1.25,ymaxP=a*Math.sqrt(TM.klBon(1e5));
    const ser=[{name:'gold reward R = d(α − βd)',c:'var(--c1)',pts:xs.map(x=>[x,TM.rBon(x,a,b)])},
      {name:'with no reward-model error (β = 0)',c:'var(--mute)',dash:true,pts:xs.map(x=>[x,a*Math.sqrt(TM.klBon(x))])}];
    const yTop=Math.max(ymax,Math.min(ymaxP,ymax*2.2));
    const narrow=$('ttcBon').clientWidth<560,yt=[];const step=yTop>4?1:yTop>2?0.5:yTop>1?0.25:0.1;for(let v=0;v<=yTop+1e-9;v+=step)yt.push([v,(+v.toFixed(2)).toString()]);
    $('ttcBonSvg').innerHTML=lineChart({W:narrow?360:640,H:240,x:[1,1e5],logx:true,y:[Math.min(0,TM.rBon(1e5,a,b)),yTop],series:ser,marks:[{x:n,l:'n = '+fmt(n)}].concat(nStar&&nStar<1e5?[{x:nStar,l:'peak'}]:[]),
      xt:[[1,'1'],[10,'10'],[100,'100'],[1e3,'1,000'],[1e4,'10⁴'],[1e5,'10⁵']],yt,xl:'samples n (log scale)',yl:'gold reward over n = 1',label:'Gold reward against n for best-of-n'})+legend(ser);
    const kl=TM.klBon(n),d=Math.sqrt(kl);
    $('ttcBonOut').innerHTML=stat('KL = ln n − (n − 1)/n',n3(kl,3),'ln '+fmt(n)+' − '+fmt(n-1)+'/'+fmt(n))+stat('d = √KL',n3(d,3),'how far selection has moved the policy')+
      stat('Gold reward R = d(α − βd)',n3(TM.rBon(n,a,b),3),n3(d,3)+' × ('+a.toFixed(2)+' − '+b.toFixed(2)+' × '+n3(d,3)+')')+
      stat('Peak',nStar?('n ≈ '+fmt(nStar)):'beyond 10⁵','d* = α/(2β) = '+n3(dstar,2)+', KL* = '+n3(klStar,2));}
  ['ttcBonA','ttcBonB','ttcBonN'].forEach(i=>$(i).addEventListener('input',draw));onTab(draw);draw();
})();

// ---- Deeper tab: GRPO group advantages and the share of groups that teach nothing ----
(function(){
  if(!$('ttcGrG'))return;
  function draw(){const G=+$('ttcGrG').value,c=Math.min(+$('ttcGrC').value,G),p=+$('ttcGrP').value;$('ttcGrC').max=G;$('ttcGrGv').textContent=G;$('ttcGrCv').textContent=c;$('ttcGrPv').textContent=p.toFixed(2);
    const mu=c/G,sd=Math.sqrt(mu*(1-mu));let h='<div class="gr">';
    for(let i=0;i<G;i++){const r=i<c?1:0,a=sd>0?(r-mu)/sd:0;h+='<button type="button" class="'+(r?'r1':'')+'" tabindex="-1" aria-label="completion '+(i+1)+'" title="reward '+r+'">'+(a>0?'+':a<0?'−':'')+Math.abs(a).toFixed(2)+'</button>'}
    $('ttcGrView').innerHTML=h+'</div>';
    const zero=Math.pow(p,G)+Math.pow(1-p,G);
    $('ttcGrOut').innerHTML=stat('Group mean and std',n3(mu,3)+' and '+n3(sd,3),c+' of '+G+' correct')+
      stat('Advantage, correct / wrong',sd>0?('+'+n3((1-mu)/sd,3)+' / −'+n3(mu/sd,3)):'0 / 0',sd>0?'(r − mean) ÷ std, shared by every token':'all rewards equal: no gradient')+
      stat('Share of groups with zero signal',pc1(zero),'p^G + (1 − p)^G at p = '+p.toFixed(2)+', G = '+G);}
  ['ttcGrG','ttcGrC','ttcGrP'].forEach(i=>$(i).addEventListener('input',draw));draw();
})();

// ---- Deeper tab: RL sharpens, it does not extend (pass@k for a base model and an RL-sharpened copy) ----
(function(){
  if(!$('ttcShS'))return;
  const base=[0.6,0.4,0.3,0.2,0.1,0.05,0.03,0.02,0.01,0.005]; // illustrative per-problem p for ten problems
  const pk=(ps,k)=>ps.reduce((a,x)=>a+1-Math.pow(1-x,k),0)/ps.length;
  function draw(){const s=+$('ttcShS').value,dr=+$('ttcShD').value;$('ttcShSv').textContent=s;$('ttcShDv').textContent=dr;
    const rl=base.map((x,i)=>i<base.length-dr?1-Math.pow(1-x,s):0);
    const ks=[];for(let e=0;e<=10;e++)ks.push(Math.pow(2,e));
    const ser=[{name:'base model',c:'var(--c1)',dots:true,pts:ks.map(k=>[k,pk(base,k)])},{name:'after RL (sharpened)',c:'var(--c2)',dash:true,dots:true,pts:ks.map(k=>[k,pk(rl,k)])}];
    let cross=null;for(const k of ks){if(pk(base,k)>=pk(rl,k)-1e-12&&pk(rl,1)>pk(base,1)){cross=k;break}}
    const narrow=$('ttcSh').clientWidth<560;
    $('ttcShSvg').innerHTML=lineChart({W:narrow?360:640,H:240,x:[1,1024],logx:true,y:[0,1],series:ser,marks:cross?[{x:cross,l:'base catches up'}]:[],
      xt:ks.filter((k,i)=>!narrow||i%2===0).map(k=>[k,fmt(k)]),yt:[[0,'0'],[.25,'0.25'],[.5,'0.5'],[.75,'0.75'],[1,'1']],xl:'k samples (log scale)',yl:'pass@k, mean over 10 problems',label:'pass@k for base and RL models'})+legend(ser);
    let t='<tr><th>problem</th>'+base.map((_,i)=>'<th class="num">'+(i+1)+'</th>').join('')+'</tr><tr><td>base p</td>'+base.map(x=>'<td class="num">'+x+'</td>').join('')+'</tr><tr><td>RL p</td>'+rl.map(x=>'<td class="num">'+(x===0?'0':x>=0.995?'1.00':x.toFixed(2))+'</td>').join('')+'</tr>';
    $('ttcShTab').innerHTML=t;
    $('ttcShOut').innerHTML=stat('pass@1',n3(pk(base,1),3)+' → '+n3(pk(rl,1),3),'base → after RL')+stat('pass@1024',n3(pk(base,1024),3)+' → '+n3(pk(rl,1024),3),'base → after RL')+
      stat('Crossover',cross?('k = '+fmt(cross)):'none in range',cross?'the base model has caught up by here':(dr?'':'sharpening alone costs no coverage'));}
  ['ttcShS','ttcShD'].forEach(i=>$(i).addEventListener('input',draw));onTab(draw);draw();
})();

// ---- Deeper tab: the unbiased pass@k estimator of Chen et al. ----
(function(){
  if(!$('ttcChN'))return;
  function draw(){const n=+$('ttcChN').value;$('ttcChC').max=n;$('ttcChK').max=n;const c=Math.min(+$('ttcChC').value,n),k=Math.min(+$('ttcChK').value,n);
    $('ttcChNv').textContent=n;$('ttcChCv').textContent=c;$('ttcChKv').textContent=k;
    const est=TM.chen(n,c,k),naive=1-Math.pow(1-c/n,k);
    const a=n-c>=k?TM.comb(n-c,k):0,b=TM.comb(n,k);
    $('ttcChOut').innerHTML=stat('Unbiased estimate',n3(est,3),n-c<k?'every subset of '+k+' contains a correct sample':'1 − C('+(n-c)+', '+k+')/C('+n+', '+k+') = 1 − '+(a<1e7?fmt(Math.round(a)):sci(a,2))+'/'+(b<1e7?fmt(Math.round(b)):sci(b,2)))+
      stat('Naive 1 − (1 − c/n)^k',n3(naive,3),'biased: it treats c/n as the true p')+stat('pass@1',n3(c/n,3),'c / n');}
  ['ttcChN','ttcChC','ttcChK'].forEach(i=>$(i).addEventListener('input',draw));draw();
})();
})();
