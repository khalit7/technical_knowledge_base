// ---- The recipe animation: one model from warmup to RLVR, learning rate to scale on a token axis ----
(function(){if(!$('pipe'))return;
const K=RC.tokens,REF=RC.refs,S16=TB.t16.rows,T9=Object.values(RC.t9_gains);
const M={
  '7B':{repo:'OLMo-2-1124-7B',peak:3e-4,T:5.0,cut:K['OLMo-2-1124-7B'].stage1_T,bt:1024*4096,anneal:[50,50,50],t9:1,soup:'three 50B anneals',rl:'PPO with a value function initialised from the 7B reward model, on GSM8K, MATH and constraint prompts'},
  '13B':{repo:'OLMo-2-1124-13B',peak:9e-4,T:5.0,cut:K['OLMo-2-1124-13B'].stage1_T,bt:2048*4096,anneal:[100,100,100,300],t9:2,soup:'three 100B anneals and one 300B anneal',rl:'PPO in three passes: the general mix, then GSM8K, then MATH, re-initialising the value function from the reward model each time'},
  '32B':{repo:'OLMo-2-0325-32B',peak:6e-4,T:6.5,cut:K['OLMo-2-0325-32B'].stage1_T,bt:2048*4096,anneal:[100,100,100,300],t9:3,soup:'three 100B anneals and one 300B anneal',rl:'GRPO (no reward model), learning rate 5 × 10⁻⁷, KL β 0.1, 16 samples per prompt'}};
const lrAt=(t,m)=>{const w=2000*m.bt/1e12;return t<w?t/w:0.1+0.9*0.5*(1+Math.cos(Math.PI*t/m.T))};
const row=(m,stage)=>S16.find(r=>r.c[0]==='OLMo 2 '+m+' '+stage).c;
const steps=m=>{const P=M[m],g=T9[P.t9],cut=RC.lr_at_cut[m];return [
 {t:'Warm up',c:'The learning rate climbs linearly from 0 to its peak of '+Math.round(P.peak*1e4)+' × 10⁻⁴ over 2,000 steps: '+(2000*P.bt/1e9).toFixed(1)+'B tokens at '+fmt(P.bt/4096)+' sequences of 4,096 tokens per step, too short to see at this scale.'},
 {t:'Pretrain on OLMo 2 Mix 1124',c:'A cosine decay "calibrated to reach 10% of the peak" after '+P.T+'T tokens, on 3.9T tokens of mostly web text (about '+(P.cut/3.9).toFixed(1)+' passes over the mix, derived). This stage is 90 to 95% of the training FLOPs. Checkpoints along the way are public: '+fmt(REF[P.repo].stage1)+' branches for this stage.'},
 {t:m==='13B'?'Run the cosine to its end':'Cut the cosine short',c:m==='13B'?'The 13B, which "ran with a higher peak learning rate from the start", runs its 5T cosine to the end, finishing stage 1 at 10% of the peak.':'Stage 1 stops at '+P.cut.toFixed(2)+'T tokens, with the learning rate still at '+Math.round(cut*100)+'% of the peak: OLMo-0424 had shown "the last part of a cosine decay schedule can be cut off and replaced by a linear decay to zero with little loss of performance".'},
 {t:'Mid-train on Dolmino Mix 1124, '+P.anneal.length+' times',c:'From the end of stage 1 the learning rate falls linearly to zero, on a '+P.anneal[0]+'B mix '+(P.anneal.length===4?'(three runs, different data orders) and once on a 300B mix':'three times, each with a different random data order')+'. About half of each mix is filtered web; the rest is FLAN, Stack Exchange, papers, Wikipedia and 10.7B tokens of maths, repeated in the bigger mixes. Inset: the anneals to scale against each other.'},
 {t:'Soup',c:'The final base model is the plain average of the weights of '+P.soup+'. Average over ten tasks: '+g.pre+' after stage 1, <b>'+g.mid+'</b> after mid-training ('+sgn(g.gain)+'); GSM8K '+TB.t9.rows[2*P.t9].c[9]+' to '+TB.t9.rows[2*P.t9+1].c[9]+'.'},
 {t:'Supervised finetuning',c:'Tülu 3 SFT on '+(m==='32B'?'866,138':'939,104')+' prompts'+(m==='32B'?' (the 0225 mix, without date-cutoff mentions and with majority-voted maths answers)':'')+'. Instruct average <b>'+row(m,'SFT')[1]+'</b>.'},
 {t:'DPO',c:'Preference tuning on synthetic, partly on-policy pairs: completions from 20 permissively licensed models and the team\'s own SFT checkpoints, rated by GPT-4o. Average <b>'+row(m,'DPO')[1]+'</b> ('+sgn(num(row(m,'DPO')[1])-num(row(m,'SFT')[1]))+').'},
 {t:'RLVR',c:'Reinforcement learning with verifiable rewards: '+P.rl+'. Final Instruct average <b>'+row(m,'Instruct')[1]+'</b> ('+sgn(num(row(m,'Instruct')[1])-num(row(m,'DPO')[1]))+'); GSM8K '+row(m,'DPO')[4]+' to '+row(m,'Instruct')[4]+', MATH '+row(m,'DPO')[6]+' to '+row(m,'Instruct')[6]+'.'}]};
function draw(m,k,e,w){const P=M[m],H=318,pl=40,pr=12,W=w-pl-pr,Tmax=Math.max(P.T,6.5),lx=t=>pl+W*t/Tmax,y0=14,h0=110,ly=v=>y0+h0*(1-v);let s='';
  // main panel
  s+=rc(pl,y0,W,h0,'none',{s:'var(--line)',r:0});[0,.5,1].forEach(v=>{s+=tx(pl-4,ly(v)+4,(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'})});
  for(let t=0;t<=Tmax+1e-9;t+=1)s+=ln2(lx(t),y0+h0,lx(t),y0+h0+3,'var(--mute)')+tx(lx(t),y0+h0+15,t+'T',{fs:11,a:'middle',c:'var(--mute)'});
  s+=tx(pl,y0-4,'learning rate, % of peak ('+Math.round(P.peak*1e4)+' × 10⁻⁴)',{fs:11,c:'var(--mute)'});
  const prog=k===0?e*0.04:k===1?0.04+e*0.96:1,tEnd=P.cut*prog;let d='';for(let i=0;i<=200;i++){const t=tEnd*i/200;d+=(i?'L':'M')+lx(t).toFixed(1)+','+ly(lrAt(t,P)).toFixed(1)}
  s+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
  if(k>=2){let g='';for(let i=0;i<=60;i++){const t=P.cut+(P.T-P.cut)*i/60;g+=(i?'L':'M')+lx(t).toFixed(1)+','+ly(lrAt(t,P)).toFixed(1)}if(P.T>P.cut+0.01)s+='<path d="'+g+'" fill="none" stroke="var(--mute)" stroke-width="1.2" stroke-dasharray="4 3"/>'+tx(lx(P.T),y0+28,'cosine would end at '+P.T+'T',{fs:11,a:'end',c:'var(--mute)'});
    s+=ln2(lx(P.cut),y0,lx(P.cut),y0+h0,'var(--bad)',{da:'3 3'})+tx(lx(P.cut)+(lx(P.cut)>w-120?-4:4),y0+h0-8,'stage 1 ends, '+P.cut.toFixed(2)+'T',{fs:11,a:lx(P.cut)>w-120?'end':'start',c:'var(--bad)'})}
  if(k>=3){const a=Math.max(...P.anneal)/1000;s+=rc(lx(P.cut),y0,Math.max(2,lx(P.cut+a)-lx(P.cut)),h0,'var(--c3)',{op:.25,r:0})}
  // inset: the anneals to scale
  const y1=y0+h0+30,h1=86;s+=tx(pl,y1-6,'Mid-training, zoomed: '+(k>=3?'learning rate from '+Math.round(RC.lr_at_cut[m]*100)+'% of peak to 0':'(after stage 1)'),{fs:11,c:'var(--mute)'})+rc(pl,y1,W,h1,'none',{s:'var(--line)',r:0});
  if(k>=3){const amax=Math.max(...P.anneal),ax=b=>pl+W*b/amax,cut=RC.lr_at_cut[m],ay=v=>y1+6+(h1-12)*(1-v/cut),pr3=k===3?e:1;
    P.anneal.forEach((len,i)=>{const L=len*pr3,dy=i*3;s+=ln2(ax(0),ay(cut)+dy,ax(L),ay(cut*(1-L/len))+dy,len>100?'var(--c5)':'var(--c3)',{sw:1.8});
      if(pr3>=1)s+=tx(ax(len)-2,ay(0)-4-i*12,len+'B'+(i<3||len>100?'':''),{fs:11,a:'end',c:len>100?'var(--c5)':'var(--c3)'})});
    [0,amax/2,amax].forEach(b=>{s+=tx(ax(b),y1+h1+14,b+'B',{fs:11,a:b===0?'start':b===amax?'end':'middle',c:'var(--mute)'})})}
  // post-training stages (not to scale)
  const y2=y1+h1+28,names=['Soup','SFT','DPO','RLVR'],bw=(W-18)/4;names.forEach((n,i)=>{const on=k>=4+i,cur=k===4+i;
    s+=rc(pl+i*(bw+6),y2,bw,34,on?(cur?'var(--acc2)':'var(--soft)'):'none',{s:on?'var(--acc)':'var(--line)'})+tx(pl+i*(bw+6)+bw/2,y2+21,n,{fs:12,a:'middle',w:cur?700:null,c:on?'var(--ink)':'var(--mute)'});
    if(i<3)s+=tx(pl+i*(bw+6)+bw+3,y2+21,'›',{fs:12,a:'middle',c:'var(--mute)'})});
  return svgW(w,H,s,'OLMo 2 training recipe')}
function counters(m,k,e){const P=M[m],R=REF[P.repo],g=T9[P.t9];
  const prog=k===0?e*0.04:k===1?0.04+e*0.96:1,anneal=P.anneal.reduce((a,b)=>a+b,0)/1000,tok=k<3?P.cut*prog:P.cut+anneal*(k===3?e:1);
  const lr=k<2?lrAt(P.cut*prog,P):k===2?RC.lr_at_cut[m]:k===3?RC.lr_at_cut[m]*(1-e):0;
  const ck=k<3?Math.round(R.stage1*Math.min(1,prog)):R.stage1+Object.keys(R).filter(x=>x.startsWith('stage2')).reduce((a,x)=>a+R[x],0)*(k===3?e:1);
  const score=k<4?(k<2?'n/a':g.pre+' (base)'):k===4?g.mid+' (base)':row(m,['SFT','DPO','Instruct'][k-5])[1]+' (instruct)';
  return stat('Tokens trained',tok.toFixed(2)+'T','all anneal runs counted')+(k>=4?stat('Learning rate','annealed to 0','post-training has its own schedules'):stat('Learning rate',Math.round(lr*100)+'% of peak',(lr*P.peak).toExponential(1).replace('e-','e−')))+stat('Public checkpoints',fmt(Math.round(ck)),'branches on Hugging Face')+stat('Average score',score,k>=5?'Table 16 (10 tasks)':'Table 9 (10 tasks)')}
const modes={};['7B','13B','32B'].forEach(m=>modes[m]=steps(m));
makeAnim({id:'pipe',modes,mode:'7B',draw,counters,dur:2600});
})();
