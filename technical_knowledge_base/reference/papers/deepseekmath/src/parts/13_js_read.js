// ---- The paper tab: corpus animation, charts from the tables and decoded figures, PPO/GRPO animation, widgets ----
const TB=PAPER.tables,RC=PAPER.rc,pc=s=>s==null||s==='-'||s==='–'?null:parseFloat(s);
const STYLE_C=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
const STYLES=['seed-like (OpenWebMath)','Q&amp;A forum','lecture notes','problem sets','wiki','blog'];
function segFill(id,items,on,cb){const el=$(id);el.innerHTML=items.map(([k,n])=>'<button data-m="'+k+'" aria-pressed="'+(k===on)+'"'+(k===on?' class="on"':'')+'>'+n+'</button>').join('');
  el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});cb(b.dataset.m)}))}
function segOn(id,cb){const el=$(id);el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});cb(b.dataset.m)}))}

// ===== 1. Mining a synthetic web (illustrative) =====
const MINE=(function(){const r=mulberry32(2024),ND=48,NPG=30,MD=[[0,1],[0,2],[1,3],[1,0],[2,4],[2,5],[3,4],[3,1],[4,5],[4,2],[5,3],[5,0]];
  // math domains are spread over the grid; every other domain is general with one stray math page
  const mathAt=[1,6,9,14,19,20,27,30,35,38,41,46],dom=[];
  for(let d=0;d<ND;d++){const mi=mathAt.indexOf(d),pages=[];
    for(let k=0;k<NPG;k++){let math=false,st=-1;
      if(mi>=0){if(k<21){math=true;st=k<13?MD[mi][0]:MD[mi][1]}}else if(k===(d*7)%NPG){math=true;st=Math.floor(r()*6)}
      pages.push({math,st,h:r()})}
    // shuffle so math pages are not all at the top of the cell
    for(let i=pages.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[pages[i],pages[j]]=[pages[j],pages[i]]}
    dom.push({mi,pages})}
  const total=dom.reduce((a,d)=>a+d.pages.filter(p=>p.math).length,0),TH=12;
  function recall(R){const s=new Set();dom.forEach((d,di)=>d.pages.forEach((p,pi)=>{if(p.math&&R.has(p.st)&&p.h<0.9)s.add(di*NPG+pi);if(!p.math&&d.mi>=0&&p.h<0.015)s.add(di*NPG+pi)}));return s}
  function simulate(mode){const rounds=[];let pos=[40,0,0,0,0,0],R=new Set([0]),flagged=new Set();
    for(let it=1;it<=4;it++){const got=recall(R),newFlag=new Set();
      dom.forEach((d,di)=>{let c=0;d.pages.forEach((p,pi)=>{if(got.has(di*NPG+pi))c++});if(c/NPG>0.1&&!flagged.has(di))newFlag.add(di)});
      const prev=rounds.length?rounds[rounds.length-1].got:new Set();let ov=0;got.forEach(x=>{if(prev.has(x))ov++});
      const found=[...got].filter(x=>{const d=dom[Math.floor(x/NPG)],p=d.pages[x%NPG];return p.math}).length;
      rounds.push({it,R:new Set(R),got,newFlag,flagged:new Set(flagged),found,overlap:got.size?ov/got.size:0,pos:pos.slice()});
      if(mode==='dd'){newFlag.forEach(di=>{flagged.add(di);dom[di].pages.forEach(p=>{if(p.math)pos[p.st]++})})}
      else{pos=[0,0,0,0,0,0];got.forEach(x=>{const p=dom[Math.floor(x/NPG)].pages[x%NPG];if(p.math)pos[p.st]++})}
      R=new Set([0,1,2,3,4,5].filter(s=>pos[s]>=TH||s===0))}
    return rounds}
  return {dom,ND,NPG,total,dd:simulate('dd'),self:simulate('self')}})();
(function(){const M=MINE;
  const stepsDD=[{t:'A web to mine',c:'48 domains of 30 pages. Hollow dots are math pages (288 of 1,440); grey dots are everything else. Twelve domains are mostly math, each written mostly in one style; the other 36 hold one stray math page each.'},
    {t:'Seed and first classifier',c:'Only the seed style is known: the classifier is trained on OpenWebMath-like positives and random pages, so it recognises one style of math (blue).'},
    {t:'Round 1: recall and rank',c:'The classifier finds the seed-style pages everywhere, including stray pages in general domains, and misses every other style. The paper kept the top 40B tokens at this point.'},
    {t:'Find math domains',c:'Any domain with over 10% of its pages collected is flagged as math-related (outlined). People mark its math URL patterns; the uncollected pages under them become new positives, in new styles.'},
    {t:'Round 2',c:'Retrained on the richer seed, the classifier now recognises the styles it was shown enough of. More domains cross 10% and are flagged in turn.'},
    {t:'Round 3',c:'The cascade reaches every style. Almost every math page is found.'},
    {t:'Round 4: time to stop',c:'Nothing new to recognise: almost everything collected was already collected in round 3. The paper stopped here, at 98% overlap, with 35.5M pages and 120B tokens.'}];
  const stepsSelf=stepsDD.map((s,i)=>i===3?{t:'Retrain on its own finds',c:'Without domain discovery the only new positives are the pages the classifier already found, all in the style it already knows. Nothing teaches it a new style.'}:
    i===4?{t:'Round 2',c:'The same classifier finds the same pages: recall is stuck at the seed style. This is the failure the paper names: positives that lack "sufficient diversity".'}:i===5?{t:'Round 3',c:'Still stuck. More rounds of self-training do not add styles.'}:i===6?{t:'Round 4',c:'Recall has not moved since round 1. Domain discovery plus human URL annotation is what broke the loop in the paper.'}:s);
  const roundAt=k=>k<2?-1:k<4?0:k-3; // which simulated round is shown at step k
  // domains flagged so far: round j's flags appear at step 3 (round 1) and with each later round
  function flaggedAt(m,k){const R=M[m],f=new Set();if(m!=='dd'||k<3)return f;const upto=k===3?0:roundAt(k);for(let j=0;j<=Math.min(upto,R.length-1);j++)R[j].newFlag.forEach(d=>f.add(d));return f}
  makeAnim({id:'mine',mode:'dd',modes:{dd:stepsDD,self:stepsSelf},dur:2600,
    draw(m,k,e,w){const R=M[m],cols=w<520?6:8,rows=M.ND/cols,gap=4,cw=(w-gap*(cols-1))/cols,dc=6,dr=5,dx=cw/(dc+0.5),dy=Math.min(dx,9),ch=dy*dr+10;
      const ri=roundAt(k),cur=ri>=0?R[ri]:null,prev=ri>0?R[ri-1]:null;let s='';
      const flaggedNow=flaggedAt(m,k);
      const newlyFlag=m==='dd'&&k===3?R[0].newFlag:new Set();
      M.dom.forEach((d,di)=>{const cx=(di%cols)*(cw+gap),cy=Math.floor(di/cols)*(ch+gap);
        const fl=flaggedNow.has(di);s+=rc(cx,cy,cw,ch,'var(--soft)',{r:4,s:fl?'var(--acc)':'var(--line)',sw:fl?2:1,op:fl&&newlyFlag.has(di)?Math.max(0.35,e):1});
        d.pages.forEach((p,pi)=>{const x=cx+dx*(0.75+pi%dc),y=cy+6+dy*(0.5+Math.floor(pi/dc)),id=di*M.NPG+pi;
          const got=cur&&cur.got.has(id),was=prev&&prev.got.has(id),op=got?(was||k!==2&&k<4?1:Math.max(0.15,e)):1;
          if(got&&p.math)s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.9" fill="'+STYLE_C[p.st]+'" opacity="'+op.toFixed(2)+'"/>';
          else if(got)s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.6" fill="var(--bad)" opacity="'+op.toFixed(2)+'"/>';
          else if(p.math)s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.4" fill="none" stroke="'+(k>=1?STYLE_C[p.st]:'var(--mute)')+'" stroke-width="1" opacity="'+(k>=1?0.55:0.8)+'"/>';
          else s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="1.3" fill="var(--dim)"/>'})});
      const H=rows*(ch+gap);let lg='',lx=0,ly=H+14;
      STYLES.forEach((n,i)=>{const t=n.replace('&amp;','&'),lw=t.length*6.2+18;if(lx+lw>w){lx=0;ly+=15}lg+='<circle cx="'+(lx+5)+'" cy="'+(ly-4)+'" r="3.5" fill="'+STYLE_C[i]+'"/>'+tx(lx+12,ly,n,{fs:11,c:'var(--mute)'});lx+=lw});
      return svgW(w,ly+6,s+lg,'Synthetic web: math pages found by round')},
    counters(m,k){const R=MINE[m],ri=roundAt(k),cur=ri>=0?R[ri]:null;
      const styles=k===0?0:cur?cur.R.size:1;
      return stat('math pages found',cur?cur.found+' of '+MINE.total:'0 of '+MINE.total,cur?Math.round(100*cur.found/MINE.total)+'% recall':'')+
        stat('styles recognised',styles+' of 6','')+
        stat('domains flagged',m==='dd'?String(flaggedAt(m,k).size):'not used','over 10% collected')+
        stat('overlap with last round',cur&&ri>0?Math.round(100*cur.overlap)+'%':'','share of this round\'s finds already found')}})})();

// ===== 2. Table 1 bars, the data mix, the arXiv reveal =====
(function(){const T=TB.T1,cols=T.cols.slice(1);let b=0;
  const draw=()=>fit($('t1Svg'),w=>{const rows=T.rows.map(r=>({n:r.label+(r.v[0]!=='N/A'?' ('+r.v[0]+')':''),v:pc(r.v[b+1]),c:r.label==='DeepSeekMath Corpus'?'var(--c1)':'var(--dim)',hl:r.label==='DeepSeekMath Corpus'}));
    $('t1Svg').innerHTML=hbars(w,rows,{lw:200,fmt:v=>v.toFixed(1)+'%',vmax:Math.max(...T.rows.map(r=>pc(r.v[b+1])))*1.15,label:'Table 1, '+cols[b]})});
  segFill('t1M',cols.map((c,i)=>[String(i),c]),'0',m=>{b=+m;draw()});draw()})();
fit($('mixSvg'),w=>{const parts=[['DeepSeekMath Corpus',56,'var(--c1)'],['GitHub code',20,'var(--c2)'],['arXiv',10,'var(--c4)'],['Common Crawl text (en, zh)',10,'var(--c3)'],['AlgebraicStack',4,'var(--c5)']];
  let s='',x=0;const H=26;parts.forEach(([n,v,c])=>{const ww=w*v/100;s+=rc(x,0,ww-1,H,c,{r:3});if(ww>34)s+=tx(x+ww/2,H/2+4,v+'%',{fs:11,a:'middle',c:'#fff',w:'700'});x+=ww});
  let lx=0,ly=H+18;parts.forEach(([n,v,c])=>{const t=n+' '+v+'% = '+(v*5)+'B',lw=t.length*6.2+18;if(lx+lw>w){lx=0;ly+=16}s+=rc(lx,ly-9,10,10,c,{r:2})+tx(lx+14,ly,t,{fs:11});lx+=lw});
  $('mixSvg').innerHTML=svgW(w,ly+6,s,'500B-token data mix')});
PRED_REVEAL['pr-arxiv']=()=>fit($('arxSvg'),w=>{const T=TB.T8,cols=[0,1,3,4],nm=['GSM8K','MATH','SAT','MMLU-STEM'];let s='';
  const groups=['DeepSeek-LLM 1.3B','DeepSeek-Coder-Base-v1.5 7B'],C={'No Math Training':'var(--dim)','MathPile':'var(--c4)','ArXiv-RedPajama':'var(--c2)'};
  const pw=w<520?w:(w-16)/2,ph=150;let out='';
  groups.forEach((g,gi)=>{const rows=T.rows.filter(r=>r.group===g);let t=tx(0,12,g,{fs:12,w:'700'});const bw=(pw-10)/(cols.length*4);
    cols.forEach((c,ci)=>{const x0=ci*(pw-10)/cols.length;rows.forEach((r,ri)=>{const v=pc(r.v[c]),h=v/60*(ph-50);t+=rc(x0+ri*bw+4,ph-24-h,bw-2,h,C[r.label],{r:1});t+=tx(x0+ri*bw+4+bw/2,ph-27-h,v.toFixed(0),{fs:11,a:'middle',c:'var(--mute)'})});
      t+=tx(x0+bw*1.5+4,ph-10,nm[ci],{fs:11,a:'middle'})});
    out+='<div style="display:inline-block;vertical-align:top;width:'+pw+'px;margin-right:'+(gi===0&&w>=520?16:0)+'px">'+svgW(pw,ph,t,g)+'</div>'});
  let lg='';Object.entries(C).forEach(([n,c])=>{lg+='<span style="display:inline-flex;align-items:center;margin-right:12px"><svg width="12" height="12"><rect width="12" height="12" rx="2" fill="'+c+'"/></svg>&nbsp;'+n+'</span>'});
  $('arxSvg').innerHTML=out+'<div class="small">'+lg+'</div>'});

// ===== 3. PPO against GRPO on one toy question (live toy numbers) =====
const READTOY=(function(){let cache=null;const f=function(){if(cache)return cache;const T=TOY,base=TOY.BASE,q=[7,8];
  // short PPO and GRPO runs from the base model (deterministic), for a trained critic and a moved policy
  const cfg={lr:0.003,batch:8,G:8,beta:0.04,lam:0.95,seed:5};
  const cp=T.makeCtx(base,T.ALLQ,'ppo',cfg);for(let i=0;i<100;i++)T.trainStep(cp);
  const r=T.rng(77),outs=[];for(let i=0;i<8;i++)outs.push(T.sample(base,q,r));
  // PPO view: one output sampled from the 100-step PPO policy; its rewards, KL penalties, values, GAE
  const rp=T.rng(5151);let po=T.sample(cp.p,q,rp);for(let k=0;k<20&&T.correct(q,po);k++)po=T.sample(cp.p,q,rp); // show a wrong answer: the instructive case
  const V=[],rt=[],lp=[],lr=[],pp=[];for(let t=0;t<3;t++){V.push(T.value(cp.critic,q[0],q[1],t,po[0],po[1]));const a=T.probs(cp.p,q[0],q[1],t,po[0],po[1])[po[t]],b=T.probs(base,q[0],q[1],t,po[0],po[1])[po[t]];pp.push(a);lp.push(Math.log(a));lr.push(Math.log(b));rt.push(-cfg.beta*(Math.log(a)-Math.log(b))+(t===2?T.correct(q,po):0))}
  const adv=[0,0,0];let g=0;for(let t=2;t>=0;t--){const d=rt[t]+(t<2?V[t+1]:0)-V[t];g=d+cfg.lam*g;adv[t]=g}
  const Rg=outs.map(o=>T.correct(q,o)),mu=Rg.reduce((a,b)=>a+b,0)/8,sd=Math.sqrt(Rg.reduce((a,b)=>a+(b-mu)*(b-mu),0)/7),Ag=Rg.map(v=>sd>0?(v-mu)/sd:0);
  const pg=outs.map(o=>[0,1,2].map(t=>T.probs(base,q[0],q[1],t,o[0],o[1])[o[t]]));
  cache={q,cfg,cp,outs,po,V,rt,adv,pp,R:T.correct(q,po),Rg,mu,sd,Ag,pg};return cache};f.ready=()=>!!cache;return f})();
(function(){
  const S={ppo:[{t:'Sample an output',c:'The policy writes three tokens for 7 + 8: a scratch digit, then the answer as two digits. Bars under each token: its probability. (The toy gives PPO the same 8 samples per question as GRPO; one is followed here.)'},
      {t:'Score the end',c:'The reward arrives only at the last token: 1 if the answer is 15, else 0. In the paper a reward model gives the score; the toy uses the rule.'},
      {t:'KL penalty in the reward',c:'Every token is charged −β log(π/π_ref) inside the reward (Eq. 2), so the KL changes the per-token rewards that GAE will add up.'},
      {t:'The value model guesses',c:'A second network, as large as the policy, predicts at each token the reward still to come. From a half-written answer it must guess whether the final answer will be right.'},
      {t:'GAE: per-token advantages',c:'δ_t = r_t + V_{t+1} − V_t, and A_t = Σ (γλ)^k δ_{t+k}. Early tokens see the final reward only through λ and the critic; a wrong critic means a wrong advantage.'},
      {t:'Update two networks',c:'The policy moves by A_t ∇log π on each token; the value model is trained towards the returns. Two networks trained, two frozen (reference and reward model).'}],
    grpo:[{t:'Sample a group',c:'Eight outputs for the same question, from the same policy. This is the base model: three of its four demonstrations for sums of 15 forgot the carry, so it answers 7 + 8 correctly only about one time in four.'},
      {t:'Score each output',c:'One reward per output (1 right, 0 wrong). No per-token rewards, no value model.'},
      {t:'Normalise within the group',c:'Â_i = (r_i − mean) / std over the eight: right answers get a positive advantage, wrong ones negative, and the sizes depend on how many of the eight were right.'},
      {t:'Same advantage on every token',c:'All three tokens of an output share its Â_i. The scratch digit of a wrong answer is pushed down even when it was right: no critic remains to tell the steps apart.'},
      {t:'KL in the loss, not the reward',c:'The gradient coefficient becomes Â_i + β(π_ref/π − 1) (Eq. 21). At the start π = π_ref and the KL term is exactly zero; it grows as the policy moves.'},
      {t:'Update one network',c:'Only the policy is trained. The group mean replaced the critic as the baseline, at the price of G samples per question.'}]};
  makeAnim({id:'ppo',mode:'ppo',modes:S,dur:3000,
    draw(m,k,e,w){if(!READTOY.ready())return '<p class="small mute">Training the toy\'s PPO for 100 steps in your browser…</p>';const D=READTOY();let s='';const narrow=w<520;
      if(m==='ppo'){const bx0=narrow?8:70,tw=narrow?(w-120)/3:Math.min(110,(w-300)/3),th=34,y0=42;
        s+=tx(4,16,'question: 7 + 8 = ?',{fs:12,w:'700'});
        D.po.forEach((d,t)=>{const x=bx0+t*(tw+8);s+=rc(x,y0,tw,th,'var(--soft)',{s:'var(--line)'})+tx(x+tw/2,y0+22,String(d),{fs:16,a:'middle',w:'700'});
          s+=tx(x+tw/2,y0-4,['scratch','tens','units'][t],{fs:11,a:'middle',c:'var(--mute)'});
          s+=rc(x,y0+th+4,tw*D.pp[t],5,'var(--c1)',{r:1})+tx(x,y0+th+20,'π '+D.pp[t].toFixed(2),{fs:11,c:'var(--mute)'})});
        const xr=bx0+3*(tw+8)+6;
        if(k>=1)s+=G(k===1?e:1,rc(xr,y0,narrow?60:84,th,D.R?'var(--open2)':'var(--closed2)',{s:D.R?'var(--good)':'var(--bad)'})+tx(xr+(narrow?30:42),y0+22,'r = '+D.R,{fs:13,a:'middle',w:'700'}));
        const rowY=[y0+th+44,y0+th+80,y0+th+116],lab=['r_t (with KL)','V_t (critic)','A_t (GAE)'],vals=[D.rt,D.V,D.adv],sh=[2,3,4];
        rowY.forEach((y,ri)=>{if(k<sh[ri])return;const op=k===sh[ri]?e:1;let r2=tx(narrow?4:4,y-6,lab[ri],{fs:11,c:'var(--mute)'});
          vals[ri].forEach((v,t)=>{const x=bx0+t*(tw+8)+tw/2,hh=Math.max(-14,Math.min(14,v*14));r2+=ln2(x-tw/2+4,y+8,x+tw/2-4,y+8,'var(--line)')+rc(x-8,hh>0?y+8-hh:y+8,16,Math.abs(hh),v>=0?'var(--good)':'var(--bad)',{r:1})+tx(x+12,y+12,(v>=0?'+':'')+v.toFixed(3),{fs:11})});
          s+=G(op,r2)});
        if(k>=5){const y=y0+th+140;s+=G(k===5?e:1,tx(4,y,'trained: policy and value model · frozen: reference, reward model',{fs:11.5,w:'700'}))}
        return svgW(w,y0+th+150,s,'PPO on one output')}
      // GRPO: eight rows
      const rh=narrow?22:24,y0=30,tw=narrow?26:34,x0=narrow?4:70;s+=tx(4,16,'question: 7 + 8 = ?  eight samples',{fs:12,w:'700'});
      const xa=x0+3*(tw+4)+(narrow?44:70),aw=Math.max(40,w-xa-60);
      D.outs.forEach((o,i)=>{const y=y0+i*rh;
        o.forEach((d,t)=>{s+=rc(x0+t*(tw+4),y,tw,rh-4,'var(--soft)',{s:'var(--line)',r:3})+tx(x0+t*(tw+4)+tw/2,y+rh-9,String(d),{fs:12.5,a:'middle',w:'700'})});
        if(k>=1)s+=G(k===1?e:1,tx(x0+3*(tw+4)+6,y+rh-9,'r='+D.Rg[i],{fs:12,c:D.Rg[i]?'var(--good)':'var(--bad)',w:'700'}));
        if(k>=2){const a=D.Ag[i],mid=xa+aw/2,len=aw/2*a/2.5;s+=G(k===2?e:1,ln2(mid,y,mid,y+rh-4,'var(--line)')+rc(len>=0?mid:mid+len,y+3,Math.abs(len),rh-10,a>=0?'var(--good)':'var(--bad)',{r:1})+tx(xa+aw+4,y+rh-9,(a>=0?'+':'')+a.toFixed(2),{fs:11}))}
        if(k>=3){const a=D.Ag[i];o.forEach((d,t)=>{s+=G(k===3?e:1,rc(x0+t*(tw+4),y+rh-6,tw,2.5,a>=0?'var(--good)':'var(--bad)',{r:0}))})}});
      const yb=y0+8*rh+16;
      if(k>=2)s+=G(k===2?e:1,tx(4,yb,'mean '+D.mu.toFixed(3)+' · std '+D.sd.toFixed(3)+' (unbiased, as torch.std)',{fs:11.5,c:'var(--mute)'}));
      if(k>=4)s+=G(k===4?e:1,tx(4,yb+16,'KL term β(π_ref/π − 1) = 0 for every token here (π = π_ref at the start)',{fs:11.5,c:'var(--mute)'}));
      if(k>=5)s+=G(k===5?e:1,tx(4,yb+32,'trained: policy only · frozen: reference, reward model',{fs:11.5,w:'700'}));
      return svgW(w,yb+40,s,'GRPO on a group of eight')},
    counters(m,k){if(!READTOY.ready())return '';const D=READTOY();return m==='ppo'?
      stat('networks in memory','4','policy, value, reference, reward')+stat('trained','2','policy and value model')+stat('advantage source','critic + GAE','λ = 0.95, γ = 1')+stat('first token sees the reward with weight',(0.95**2).toFixed(4),'λ² at 3 tokens; 10⁻²³ at 1,024'):
      stat('networks in memory','3','policy, reference, reward')+stat('trained','1','policy')+stat('advantage source','group of 8','right: '+D.Rg.reduce((a,b)=>a+b,0)+' of 8')+stat('first token sees the reward with weight','1','every token shares Â_i')}})})();

// ===== 4. GAE reach =====
(function(){const LS=[3,8,16,32,64,128,256,512,1024,2048,4096,8192,16384,32768],LAM=[0.9,0.95,0.99,0.995,0.999,1];
  const upd=()=>{const L=LS[+$('gaeL').value],lam=LAM[+$('gaeLam').value];$('gaeLv').textContent=fmt(L);$('gaeLamv').textContent=String(lam);
    fit($('gaeSvg'),w=>{const H=200,f=logFrame({W:w,H,pl:46,pr:12,pt:10,pb:34,x:[1,L],xlin:true,y:[1e-30,1],yt:[[1,'1'],[1e-10,'10⁻¹⁰'],[1e-20,'10⁻²⁰'],[1e-30,'10⁻³⁰']],xt:[[1,'1'],[Math.round(L/2),fmt(Math.round(L/2))],[L,fmt(L)]],xl:'token position t'});
      let pts=[];const n=Math.min(L,400);for(let i=0;i<n;i++){const t=Math.round(i*(L-1)/(n-1||1));const v=Math.max(1e-30,Math.pow(lam,L-1-t));pts.push(f.lx(t+1).toFixed(1)+','+f.ly(v).toFixed(1))}
      $('gaeSvg').innerHTML=svgW(w,H,f.s+'<polyline points="'+pts.join(' ')+'" fill="none" stroke="var(--c2)" stroke-width="2"/>'+ln2(f.lx(1),f.ly(1),f.lx(L),f.ly(1),'var(--c1)',{sw:2,da:'5 3'})+tx(f.lx(L)-4,f.ly(1)+14,'GRPO: 1 everywhere',{fs:11,a:'end',c:'var(--c1)'}),'GAE weight by token')});
    const w0=Math.pow(lam,L-1),k1=lam<1?Math.min(L,Math.ceil(Math.log(0.01)/Math.log(lam))):L;
    $('gaeOut').innerHTML=stat('first token\'s weight',w0<1e-3?sci(w0,1):w0.toFixed(3),'λ^(L−1)')+stat('tokens with weight above 1%',fmt(k1)+' of '+fmt(L),'the last ones only')};
  ['gaeL','gaeLam'].forEach(id=>$(id).addEventListener('input',upd));upd()})();

// ===== 5. Memory: PPO against GRPO for a 7B policy (derived) =====
(function(){let mode='rm';const N=RC.params_7b;
  const draw=()=>fit($('memSvg'),w=>{const rows={PPO:[['policy (trained)',16,'var(--c1)'],['value model (trained)',16,'var(--c2)'],['reference (frozen)',2,'var(--c4)']],GRPO:[['policy (trained)',16,'var(--c1)'],['reference (frozen)',2,'var(--c4)']]};
    if(mode==='rm'){rows.PPO.push(['reward model (frozen)',2,'var(--c5)']);rows.GRPO.push(['reward model (frozen)',2,'var(--c5)'])}
    const tot=k=>rows[k].reduce((a,r)=>a+r[1],0),max=tot('PPO')*N/1e9,lw=50,bw=w-lw-70;let s='',y=6;
    ['PPO','GRPO'].forEach(k=>{let x=lw;s+=tx(lw-6,y+17,k,{fs:12,a:'end',w:'700'});rows[k].forEach(([n,b,c])=>{const ww=bw*b*N/1e9/max;s+=rc(x,y,ww-1,24,c,{r:2})+'<title>'+n+': '+(b*N/1e9).toFixed(0)+' GB</title>';if(ww>60)s+=tx(x+ww/2,y+16,n.split(' (')[0],{fs:11,a:'middle',c:'#fff'});x+=ww});
      s+=tx(x+4,y+16,(tot(k)*N/1e9).toFixed(0)+' GB',{fs:11.5,w:'700'});y+=34});
    let lx=lw;const items=[['policy, trained','var(--c1)'],['value model, trained','var(--c2)'],['reference, frozen','var(--c4)']].concat(mode==='rm'?[['reward model, frozen','var(--c5)']]:[]);
    y+=6;items.forEach(([n,c])=>{const t=n.length*6.6+20;if(lx+t>w){lx=lw;y+=16}s+=rc(lx,y-9,10,10,c,{r:2})+tx(lx+14,y,n,{fs:11});lx+=t});
    $('memSvg').innerHTML=svgW(w,y+6,s,'Memory for weights and optimiser state')});
  const out=()=>{const p=(mode==='rm'?34+2:34)*N/1e9,g=(mode==='rm'?18+2:18)*N/1e9;$('memOut').innerHTML=stat('PPO',p.toFixed(0)+' GB','')+stat('GRPO',g.toFixed(0)+' GB','')+stat('saving',Math.round(100*(1-g/p))+'%','weights and optimiser state only')};
  segOn('memM',m=>{mode=m;draw();out()});draw();out()})();

// ===== 6. The KL estimator's gradient (exact, one categorical step) =====
(function(){const zr=[1.0,0.5,0,-0.5,-1],d=[-1,0,0.6,1,-0.6];
  const sm=z=>{const m=Math.max(...z),e=z.map(v=>Math.exp(v-m)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s)};
  const upd=()=>{const s=+$('klS').value/10;$('klSv').textContent=s.toFixed(1);const ref=sm(zr),p=sm(zr.map((v,i)=>v+s*d[i]));
    const kl=p.reduce((a,v,i)=>a+v*Math.log(v/ref[i]),0),klr=ref.reduce((a,v,i)=>a+v*Math.log(v/p[i]),0);
    const gTrue=p.map((v,i)=>v*(Math.log(v/ref[i])-kl)),gK3=p.map((v,i)=>v-ref[i]);
    const dot=gTrue.reduce((a,v,i)=>a+v*gK3[i],0),nt=Math.hypot(...gTrue),nk=Math.hypot(...gK3),cos=nt*nk>0?dot/(nt*nk):1;
    fit($('klSvg'),w=>{const H=170,pl=40,pr=8,pt=22,pb=26,gw=(w-pl-pr)/5,mx=Math.max(0.05,...gTrue.map(Math.abs),...gK3.map(Math.abs));const Y=v=>pt+(H-pt-pb)/2-(H-pt-pb)/2*v/mx;let sv='';
      sv+=ln2(pl,Y(0),w-pr,Y(0),'var(--mute)');sv+=tx(pl-4,Y(mx)+4,'+'+mx.toFixed(2),{fs:11,a:'end',c:'var(--mute)'})+tx(pl-4,Y(-mx)+4,'−'+mx.toFixed(2),{fs:11,a:'end',c:'var(--mute)'});
      for(let i=0;i<5;i++){const x=pl+i*gw,b=gw*0.32;[[gTrue[i],'var(--c1)'],[gK3[i],'var(--c2)']].forEach(([v,c],j)=>{sv+=rc(x+gw*0.15+j*(b+2),Math.min(Y(0),Y(v)),b,Math.abs(Y(v)-Y(0)),c,{r:1})});
        sv+=tx(x+gw/2,H-8,'outcome '+(i+1)+': π '+p[i].toFixed(2),{fs:11,a:'middle',c:'var(--mute)'})}
      const lg=legendW([['∇ KL(π ‖ π_ref), what Eq. 3 writes','var(--c1)'],['∇ of k3 as a loss = ∇ KL(π_ref ‖ π)','var(--c2)']],pl,12,w-pl);
      $('klSvg').innerHTML=svgW(w,H+lg.h-12,'<g transform="translate(0,'+(lg.h-12)+')">'+sv+'</g>'+lg.s,'KL gradients')});
    $('klOut').innerHTML=stat('KL(π ‖ π_ref)',kl.toFixed(4),'= 𝔼<sub>π</sub>[k3]: the value is unbiased')+stat('KL(π_ref ‖ π)',klr.toFixed(4),'the direction the gradient follows')+stat('cosine of the two gradients',cos.toFixed(3),'1 = same direction')};
  $('klS').addEventListener('input',upd);upd()})();

// ===== 7. Table 5 =====
(function(){let mode='cot0';
  const draw=()=>fit($('t5Svg'),w=>{const half=mode.startsWith('cot')?'Chain-of-thought':'Tool-integrated',col=mode==='cot1'?0:1;
    const rows=TB.T5.rows.filter(r=>r.half===half).map(r=>({n:r.label+(r.size&&r.size!=='-'?' '+r.size:''),v:pc(r.v[col]),hatch:r.grey&&r.grey[col],c:r.label.startsWith('DeepSeekMath')?'var(--c1)':(r.group==='Closed-Source Model'?'var(--c4)':'var(--dim)'),hl:r.label.startsWith('DeepSeekMath')})).filter(r=>r.v!=null).sort((a,b)=>b.v-a.v);
    $('t5Svg').innerHTML=hbars(w,rows,{id:'t5',lw:190,rh:19,fmt:v=>v.toFixed(1)+'%',vmax:100,label:'Table 5'})+'<div class="small mute"><span style="color:var(--c4)">■</span> closed &nbsp; <span style="color:var(--mute)">■</span> open &nbsp; <span style="color:var(--c1)">■</span> DeepSeekMath</div>'});
  segOn('t5M',m=>{mode=m;draw()});draw()})();

// ===== 8. The unified view: each method's gradient coefficient on the same eight outputs =====
const GCQ=[[2,3],[4,8],[7,8],[9,9],[5,5],[6,7]];
(function(){const T=TOY,base=T.BASE;let mi='grpo',qi=2;
  const MS=[['sft','SFT'],['rft','RFT'],['onrft','Online RFT'],['dpo','DPO'],['ppo','PPO'],['grpo','GRPO (OS)'],['grpops','GRPO (PS)']];
  const INFO={sft:['the SFT dataset (a human demonstration)','none: human selection','1 on every token (Eq. 7)'],rft:['offline: sampled once from the SFT model','rule','1 if the answer is right, 0 if not (Eq. 10)'],onrft:['online: sampled from the current policy','rule','1 if right, 0 if not (Eq. 10, Eq. 11)'],
    dpo:['offline: a right and a wrong sample from the SFT model','rule (the paper: human preference in general)','σ(β(log-ratio of o⁻ − log-ratio of o⁺)): + on o⁺, − on o⁻ (Eq. 14)'],ppo:['online','learned model in the paper; rule in the toy','A_t from GAE with a value model (Eq. 18)'],
    grpo:['online, a group of G per question','learned model in the paper; rule in the toy','(r − mean)/std + β(π_ref/π − 1) (Eq. 21)'],grpops:['online, a group of G per question','process reward per step','sum of later normalised step rewards + β(π_ref/π − 1) (§4.1.3)']};
  let critic=null;
  function coeffs(q){const r=T.rng(1000+q[0]*10+q[1]),os=[];for(let i=0;i<8;i++)os.push(T.sample(base,q,r));const R=os.map(o=>T.correct(q,o)),S1=os.map(o=>T.stepOK(q,o));
    const s=q[0]+q[1],gold=[s%10,Math.floor(s/10),s%10];const C={};
    C.sft={rows:[gold],gc:[[1,1,1]],lab:['demo']};
    C.rft={rows:os,gc:R.map(v=>[v,v,v])};C.onrft=C.rft;
    const mu=R.reduce((a,b)=>a+b,0)/8,sd=Math.sqrt(R.reduce((a,b)=>a+(b-mu)*(b-mu),0)/7);C.grpo={rows:os,gc:R.map(v=>{const a=sd>0?(v-mu)/sd:0;return [a,a,a]})};
    const all=S1.concat(R),m2=all.reduce((a,b)=>a+b,0)/16,s2=Math.sqrt(all.reduce((a,b)=>a+(b-m2)*(b-m2),0)/15),nz=v=>s2>0?(v-m2)/s2:0;C.grpops={rows:os,gc:os.map((o,i)=>[nz(S1[i])+nz(R[i]),nz(R[i]),nz(R[i])])};
    const ip=R.indexOf(1),im=R.indexOf(0);C.dpo=ip>=0&&im>=0?{rows:[os[ip],os[im]],gc:[[.05,.05,.05],[-.05,-.05,-.05]],lab:['o⁺','o⁻']}:{rows:[],gc:[],none:true};
    if(!critic)critic=READTOY().cp.critic;
    C.ppo={rows:os,gc:os.map((o,i)=>{const V=[0,1,2].map(t=>T.value(critic,q[0],q[1],t,o[0],o[1]));const adv=[0,0,0];let g=0;for(let t=2;t>=0;t--){const d=(t===2?R[i]:0)+(t<2?V[t+1]:0)-V[t];g=d+0.95*g;adv[t]=g}return adv})};
    return {C,R,q}}
  const draw=()=>{const q=GCQ[qi];$('gcQv').textContent=q[0]+' + '+q[1];const {C,R}=coeffs(q),c=C[mi],I=INFO[mi];
    $('gcInfo').innerHTML='<b>data</b> '+I[0]+' · <b>reward</b> '+I[1]+' · <b>GC</b> '+I[2]+(c.none?' · <b>no pair</b>: all eight samples agree on correctness, so DPO has nothing to compare here':'');
    let mx=0.2;Object.values(C).forEach(x=>x.gc.forEach(r=>r.forEach(v=>{mx=Math.max(mx,Math.abs(v))})));
    fit($('gcSvg'),w=>{const rh=22,tw=w<520?24:30,x0=46,xb=x0+3*(tw+3)+40,bw=Math.max(60,(w-xb-10)/3);let s='';
      s+=tx(xb+bw/2,12,'scratch',{fs:11,a:'middle',c:'var(--mute)'})+tx(xb+bw*1.5,12,'tens',{fs:11,a:'middle',c:'var(--mute)'})+tx(xb+bw*2.5,12,'units',{fs:11,a:'middle',c:'var(--mute)'});
      c.rows.forEach((o,i)=>{const y=18+i*rh;s+=tx(x0-6,y+15,c.lab?c.lab[i]:'#'+(i+1),{fs:11,a:'end',c:'var(--mute)'});
        o.forEach((d,t)=>{s+=rc(x0+t*(tw+3),y,tw,rh-4,'var(--soft)',{s:'var(--line)',r:3})+tx(x0+t*(tw+3)+tw/2,y+13,String(d),{fs:12,a:'middle',w:'700'})});
        const ok=c.lab&&c.lab[0]==='demo'?1:T.correct(GCQ[qi],o);s+=tx(x0+3*(tw+3)+4,y+13,ok?'✓':'✗',{fs:13,c:ok?'var(--good)':'var(--bad)',w:'700'});
        c.gc[i].forEach((v,t)=>{const mid=xb+bw*t+bw/2,len=(bw/2-4)*v/mx;s+=ln2(mid,y,mid,y+rh-4,'var(--line)')+rc(len>=0?mid:mid+len,y+3,Math.abs(len),rh-10,v>=0?'var(--good)':'var(--bad)',{r:1})+(Math.abs(v)>1e-9?'<title>'+v.toFixed(3)+'</title>':'')})});
      const H=18+Math.max(1,c.rows.length)*rh+18;s+=tx(xb,H-4,'scale: full half-width = '+mx.toFixed(2),{fs:11,c:'var(--mute)'});
      $('gcSvg').innerHTML=svgW(w,H,s,'Gradient coefficients')})};
  segFill('gcM',MS,mi,m=>{mi=m;draw()});$('gcQ').addEventListener('input',e=>{qi=+e.target.value;draw()});
  window.__gcDraw=draw})();

// ===== 9. Figures 5, 6, 7 decoded =====
const FCOL={'RFT':'var(--c5)','Online RFT':'var(--c3)','GRPO+OS':'var(--c2)','GRPO+PS':'var(--c1)','Iteration-0':'var(--c4)','Iteration-1':'var(--c2)','Iteration-2':'var(--c3)','Maj@K-Instruct':'var(--c4)','Maj@K-RL':'var(--c1)','Pass@K-Instruct':'var(--c4)','Pass@K-RL':'var(--c1)'};
function figChart(el,fig,bench,o){o=o||{};fit(el,w=>{const P=FIGS[fig].panels[bench],ser=P.series,names=Object.keys(ser);const H=w<520?240:270;
  let ys=[];names.forEach(n=>ser[n].forEach(p=>ys.push(p[1])));let y0=Math.floor(Math.min(...ys)-0.5),y1=Math.ceil(Math.max(...ys)+0.5);
  const cat=o.cat,xs=cat?P.x_ticks:null;const xv=v=>cat?xs.indexOf(v):v;const xr=cat?[-0.2,xs.length-0.8]:[0,Math.max(...names.map(n=>ser[n][ser[n].length-1][0]))];
  const lg=legendW(names.map(n=>[n,FCOL[n]||'var(--ink)',n.startsWith('Pass')?'da':'l']),44,12,w-50);
  const f=linFrame({W:w,H:H+lg.h,pl:40,pr:10,pt:10+lg.h,pb:32,x:xr,y:[y0,y1],xl:cat?'K, number of samples':'training steps',yl:'accuracy (%)',xt:cat?xs.map((_,i)=>i):null,fx:cat?(i=>String(xs[i])):(v=>fmt(v))});
  let s=f.s+lg.s;
  if(o.band){const b=ser[o.band],se=bench==='GSM8K'?1319:5000;const up=b.map(p=>[xv(p[0]),p[1]+100*Math.sqrt(p[1]/100*(1-p[1]/100)/se)]),dn=b.map(p=>[xv(p[0]),p[1]-100*Math.sqrt(p[1]/100*(1-p[1]/100)/se)]).reverse();
    s+='<path d="'+pathOf(up.concat(dn),f.X,f.Y)+'Z" fill="'+(FCOL[o.band])+'" opacity="0.15"/>'}
  names.forEach(n=>{s+=lineS(ser[n].map(p=>[xv(p[0]),p[1]]),f.X,f.Y,FCOL[n],{sw:1.8,da:n.startsWith('Pass')?'5 3':null});if(cat)ser[n].forEach(p=>{s+=dotS(f.X(xv(p[0])),f.Y(p[1]),3,FCOL[n],{t:n+' K='+p[0]+': '+p[1].toFixed(1)+'%'})})});
  el.innerHTML=svgW(w,H+lg.h,s,FIGS[fig].figure+' '+bench)})}
(function(){let b5='GSM8K',b6='GSM8K',b7='MATH';const d5=()=>figChart($('f5Svg'),'combined_figure_rl',b5,{band:'GRPO+OS'}),d6=()=>figChart($('f6Svg'),'iter_rl',b6),d7=()=>figChart($('f7Svg'),'combined_MAJ_PASS',b7,{cat:true});
  segOn('f5M',m=>{b5=m;d5()});segOn('f6M',m=>{b6=m;d6()});segOn('f7M',m=>{b7=m;d7()});d5();d6();PRED_REVEAL['pr-pass']=d7})();
// compute the toy runs the PPO animation and the coefficient widget need, after first paint
setTimeout(()=>{try{READTOY();refit($('ppoSvg'));window.__gcDraw()}catch(e){__jsErr(e.message)}},60);
