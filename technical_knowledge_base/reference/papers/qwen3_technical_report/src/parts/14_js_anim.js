// ---- Two step animations on the paper tab: the post-training routes (Figure 1) and one checkpoint against two ----
(function(){
// ===== 1. Post-training routes =====
const PP={flag:[
  {t:'Start from the base model',c:'Pre-trained on 36T tokens in three stages (§3). Everything below is post-training.',s:-1},
  {t:'Stage 1: long chain-of-thought cold start',c:'Fine-tune on a small, heavily filtered set of QwQ-32B reasoning traces for verifiable math, code, logic and STEM problems. Enough to learn the format of thinking, not so much that it caps what RL can add.',s:0},
  {t:'Stage 2: reasoning RL',c:'GRPO on 3,995 hard but learnable query-verifier pairs. Each sampled response earns one reward from the verifier. Qwen3-235B-A22B: AIME\'24 70.1 to 85.1 in 170 steps.',s:1},
  {t:'Stage 3: thinking mode fusion',c:'Fine-tune again on the stage-2 model\'s own rejection-sampled thinking responses plus curated non-thinking ones, marked /think and /no_think, the non-thinking ones with an empty think block. One checkpoint learns both modes.',s:2},
  {t:'Stage 4: general RL',c:'RL over 20+ tasks (instruction and format following, mode switching, preferences, tools in real environments, RAG) with rule-based rewards, a judge with reference answers, and a reward model.',s:3},
  {t:'Released: Qwen3-235B-A22B and Qwen3-32B',c:'Thinking and non-thinking modes in one set of weights, a budget dial, and the teachers for every smaller model.',s:4}],
 small:[
  {t:'Start from the base model',c:'The same three pre-training stages, at the student\'s size (0.6B to 14B dense, or 30B-A3B).',s:-1},
  {t:'Phase 1: off-policy distillation',c:'Fine-tune on responses the teachers wrote, in both /think and /no_think modes. The student learns to reason and to switch modes by imitation.',s:0},
  {t:'Phase 2: on-policy distillation',c:'The student writes its own responses; the teacher (Qwen3-32B or Qwen3-235B-A22B) scores every position with its full next-token distribution, and the student minimises the KL divergence to it. The student is corrected exactly where its own samples go wrong.',s:1},
  {t:'Released: six small models',c:'In Table 21\'s one comparison (Qwen3-8B, math and code), this phase beat RL from the same checkpoint (AIME\'24 74.4 against 67.6) for 1,800 GPU hours against 17,920.',s:2}]};
const BOX={flag:['Cold start (SFT)','Reasoning RL (GRPO)','Thinking mode fusion (SFT)','General RL','Qwen3-235B-A22B, Qwen3-32B'],small:['Off-policy distillation (SFT)','On-policy distillation (KL)','Qwen3-0.6B to 14B, 30B-A3B']};
const SIG={flag:['token','reward','token','reward','none'],small:['token','dist','none']};
const SIGTXT={token:'one target token per position',reward:'one reward per response',dist:'a full next-token distribution per position',none:'n/a'};
function sigPanel(kind,x0,y0,w,e){let s='';const n=10,cw=Math.min(26,(w-20)/n),y=y0+44;
  for(let i=0;i<n;i++){s+=rc(x0+i*cw,y,cw-3,14,'var(--acc2)',{r:2})}
  s+=tx(x0,y+30,'one response, '+n+' tokens',{fs:11,c:'var(--mute)'});
  if(kind==='token')for(let i=0;i<n;i++){if(i/n<=e)s+=ln2(x0+i*cw+(cw-3)/2,y-2,x0+i*cw+(cw-3)/2,y-14,'var(--c3)',{sw:2})+'<circle cx="'+(x0+i*cw+(cw-3)/2)+'" cy="'+(y-17)+'" r="3" fill="var(--c3)"/>'}
  if(kind==='reward'){const xe=x0+n*cw+6;s+=G(e,'<circle cx="'+(xe+8)+'" cy="'+(y+7)+'" r="7" fill="var(--c5)"/>'+tx(xe+8,y+11,'r',{fs:11,a:'middle',c:'#fff'})+tx(xe+20,y+11,'0 or 1',{fs:11,c:'var(--mute)'}))}
  if(kind==='dist')for(let i=0;i<n;i++){if(i/n>e)continue;for(let k=0;k<5;k++){const h=[14,5,3,2,1][(k+i)%5]*1.6;s+=rc(x0+i*cw+k*(cw-3)/5,y-3-h,(cw-3)/5-1,h,'var(--c4)',{r:0})}}
  return s}
function drawPP(m,k,e,w){const steps=PP[m],st=steps[k],boxes=BOX[m],bh=30,gap=8,W=w,top=6;let s='';
  boxes.forEach((b,i)=>{const y=top+i*(bh+gap),on=i===st.s,done=i<st.s;
    s+=rc(8,y,W-16,bh,on?'var(--acc2)':'var(--soft)',{s:on?'var(--acc)':'var(--line)',sw:on?2:1});
    s+=tx(18,y+19,(i<boxes.length-1?(m==='flag'?'Stage '+(i+1):'Phase '+(i+1))+': ':'')+b,{fs:12,w:on?'600':null,c:done||on?'var(--ink)':'var(--mute)'});
    if(done)s+=tx(W-18,y+19,'done',{fs:11,a:'end',c:'var(--good)'})});
  const py=top+boxes.length*(bh+gap)+4,kind=st.s>=0?SIG[m][st.s]:'none';
  s+=tx(8,py+14,'Signal per response at this step: '+(kind==='none'?'none (no training)':SIGTXT[kind]),{fs:12});
  if(kind!=='none')s+=sigPanel(kind,12,py,W-24,e);
  return svgW(W,py+(kind==='none'?24:96),s,'Post-training route, step '+(k+1))}
function cntPP(m,k){const st=PP[m][k],n=Math.max(0,st.s+(st.s===BOX[m].length-1?0:1));const tr=m==='flag'?Math.min(n,4):Math.min(n,2);
  return stat('Training stages run',tr+' of '+(m==='flag'?4:2),'')+stat('Reasoning RL run on this model',m==='flag'?(st.s>=1?'yes':'not yet'):'never','')+stat('Measured cost',m==='flag'?'not reported':'1,800 GPU h',m==='flag'?'Table 21 gives only RL from an 8B checkpoint: 17,920 GPU h':'Table 21: on-policy phase, 8B, math and code')}
makeAnim({id:'pp',modes:PP,mode:'flag',draw:drawPP,counters:cntPP,dur:3200});

// ===== 2. Two models against one fused checkpoint =====
const FZ={two:[
  {t:'Two requests arrive',c:'A quick one ("capital of France?") and a hard one (a competition problem). Before Qwen3, Qwen served them with two different models.'},
  {t:'A router picks a model',c:'The quick request goes to the chat model (Qwen2.5-32B-Instruct), the hard one to the reasoning model (QwQ-32B). Both sets of weights stay in memory, and the caller must decide which request is hard.'},
  {t:'The chat model answers directly',c:'No thinking tokens. It cannot think more when a request turns out to be hard.'},
  {t:'The reasoning model thinks, then answers',c:'It always thinks, for as long as it likes: the caller has no switch to turn thinking off and no cap on how many tokens it spends.'}],
 one:[
  {t:'The same two requests',c:'Now one Qwen3-32B checkpoint serves both.'},
  {t:'The template carries the switch',c:'The caller adds /no_think to the quick request; the hard one carries /think, or nothing, since thinking is the default (Table 9). The same weights serve both: half the memory.'},
  {t:'/no_think: an empty think block, then the answer',c:'The model writes <think></think> with nothing inside, then answers. Same format in both modes, so a server can force this mode by pre-filling the empty block.'},
  {t:'/think: thinking, then the answer',c:'Thinking until the model closes the block itself, then the answer.'},
  {t:'With a budget: cut, insert, answer',c:'Thinking reaches the budget; the server stops it and inserts "Considering the limited time by the user, I have to give the solution based on the thinking directly now." and </think>. The model answers from the reasoning so far.'}]};
function chips(x,y,w,list,e){let s='',cx=x;const ch=13,tot=list.reduce((a,c)=>a+(c.w||9),0),f=Math.min(1,w/tot);
  list.forEach(c=>{const cw=(c.w||9)*f;if(c.k>e){cx+=cw;return}
    s+=rc(cx,y,Math.max(1,cw-2),ch,c.f,{r:2,s:c.s,da:c.da});if(c.t&&cw-2>=c.t.length*6.2)s+=tx(cx+(cw-2)/2,y+10,c.t,{fs:11,a:'middle',c:c.tc||'var(--ink)'});cx+=cw});return s}
function lane(kind,mode,k,e,x,y,w){// returns chips for one request's lane at step k
  const P={f:'var(--dim)'},TH={f:'var(--bg)',s:'var(--mute)'},A={f:'var(--c3)'},T={f:'var(--acc)'},FL={f:'var(--c4)'},ST={f:'var(--c2)'};const L=[];
  const prompt=n=>{for(let i=0;i<n;i++)L.push(Object.assign({k:0},P))};
  if(kind==='quick'){prompt(5);
    if(mode==='one'&&k>=1)L.push(Object.assign({k:k===1?e:1,w:52,t:'/no_think',tc:'#fff'},FL));
    const go=mode==='two'?k>=2:k>=2;
    if(go){if(mode==='one'){L.push(Object.assign({k:k===2?e*0.3:0,w:44,t:'<think>'},TH),Object.assign({k:k===2?e*0.5:0,w:48,t:'</think>'},TH))}
      for(let i=0;i<3;i++)L.push(Object.assign({k:k===2?(.5+i*.15)*e:0},A))}}
  else{prompt(8);
    if(mode==='one'&&k>=1)L.push(Object.assign({k:k===1?e:1,w:40,t:'/think',tc:'#fff'},FL));
    const go=mode==='two'?k>=3:k>=3;
    if(go){const budget=mode==='one'&&k===4,n=budget?14:26;L.push(Object.assign({k:0},TH,{w:44,t:'<think>'}));
      for(let i=0;i<n;i++)L.push(Object.assign({k:(k===3||k===4)?(i/(n+6))*1.0:0},T));
      if(budget)L.push(Object.assign({k:.75*1,w:60,t:'stop text',tc:'#fff'},ST));
      L.push(Object.assign({k:.82},TH,{w:48,t:'</think>'}));for(let i=0;i<3;i++)L.push(Object.assign({k:.88+i*.04},A))}}
  // when this lane's step is in the past, show everything
  const cur=(kind==='quick'?2:(mode==='one'&&k===4?4:3));
  const ee=k>cur?1:(k===cur?e:1);
  return chips(x,y,w,L,ee)}
function drawFZ(m,k,e,w){const W=w;let s='';const GB=65.5,Gq=65.0,full=2*Gq;const bw=W-16,sc=bw/full;let y=8;
  s+=tx(8,y+10,'Weights in memory (BF16, to scale)',{fs:12});y+=16;
  if(m==='two'){s+=rc(8,y,Gq*sc-2,16,'var(--c2)')+tx(12,y+12,'Qwen2.5-32B-Instruct 65 GB',{fs:11,c:'#fff'});
    s+=G(k>=1?1:.35,rc(8+Gq*sc,y,Gq*sc-2,16,'var(--c4)')+tx(12+Gq*sc,y+12,'QwQ-32B 65 GB',{fs:11,c:'#fff'}))}
  else s+=rc(8,y,GB*sc-2,16,'var(--acc)')+tx(12,y+12,'Qwen3-32B 65.5 GB',{fs:11,c:'#fff'});
  y+=34;
  [['quick','Quick request'],['hard','Hard request']].forEach(([kd,lab])=>{
    const who=m==='two'?(kd==='quick'?'Qwen2.5-32B-Instruct':'QwQ-32B'):'Qwen3-32B';
    s+=tx(8,y+10,lab+(k>=1?' → '+who:''),{fs:12,w:'600'});y+=16;
    s+=lane(kd,m,k,e,8,y,W-16);y+=30});
  const L=legend([['prompt','var(--dim)'],['flag','var(--c4)'],['thinking','var(--acc)'],['answer','var(--c3)']].concat(m==='one'?[['inserted stop text','var(--c2)']]:[]),8,y+6,W-16);
  return svgW(W,y+L.h+4,s+L.s,'One request routed to two models, or to one fused checkpoint')}
function cntFZ(m,k){const think=m==='two'?(k>=3?26:0):(k===3?26:k===4?14:0);
  return stat('Checkpoints deployed',m==='two'?'2':'1','')+stat('Weights in memory',m==='two'?(k>=1?'130 GB':'65 GB'):'65.5 GB','BF16')+stat('Thinking tokens, hard request',think?think+' (illustrative)':'0',m==='one'&&k===4?'capped by the budget':'')+stat('Who chose the mode',m==='two'?'a router':'the caller, by flag','')}
makeAnim({id:'fz',modes:FZ,mode:'two',draw:drawFZ,counters:cntFZ,dur:3000});
})();
