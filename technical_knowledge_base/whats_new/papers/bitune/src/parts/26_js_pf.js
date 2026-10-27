// ---- Reading tab animation: standard prefill against Bitune's two passes, on the toy, computed live ----
(function(){
  if(!window.BT||!window.makeAnim)return;
  const V=BT.vocab,P0=BT.p0,C0=BT.c0,L=BT.cfg.L;
  // a fixed example: the club and list are chosen once so the page always tells the same story
  const club=V.indexOf('chess'),NP=C0-P0;let mem=-1,non=[];
  for(let p=0;p<NP;p++){if(BT.member(club-C0,p)){if(mem<0)mem=p}else non.push(p)}
  const ppl=[non[3],non[11],mem,non[20],non[7]],ids=[1,...ppl.map(p=>P0+p),BT.IDX['?'],club],T=ids.length,lab=ids.map(i=>V[i].replace('<bos>','bos'));
  let RUN=null;const runs=()=>RUN||(RUN={lora:BT.run('lora',ids),bitune:BT.run('bitune',ids)});
  const pm=r=>r.steps[0].probs[P0+mem];
  const STEPS={lora:[
    {t:'The prompt',c:'Five people, then the question "? chess". Only '+V[P0+mem]+' is in the chess club. The toy knows each fact, but learned it with the club first.'},
    {t:'One causal pass',c:'Block 1 of the causal pass, averaged over heads: each row may only read columns to its left (the empty triangle). No person token can see "chess", so none of their keys and values can say "member of the club being asked about".'},
    {t:'The cache',c:'Every prompt token leaves one key and one value per block: '+T+' tokens × '+L+' blocks.'},
    {t:'The answer',c:'":" reads the cache and must pick the member from features that were built without the question.'}],
   bitune:[
    {t:'The prompt',c:'The same prompt.'},
    {t:'Pass 1: causal, default adapter',c:'Exactly the standard pass: the features the pretrained model expects. Kept as K<sub>c</sub>, V<sub>c</sub>.'},
    {t:'Pass 2: bidirectional, its own adapter',c:'No mask: every row may read every column. The person rows now attend to "chess" on their right, so from the next block on each person\'s keys and values can carry whether that person is a member. Kept as K<sub>b</sub>, V<sub>b</sub>.'},
    {t:'Mix, block by block',c:'K = K<sub>c</sub>(1 − α<sub>k</sub>) + K<sub>b</sub>α<sub>k</sub>, the same for V, with the learned α of each block. The cache keeps its usual size.'},
    {t:'The answer, generated causally',c:'":" reads the mixed cache with the ordinary causal weights; every later token (here &lt;eos&gt;) is generated exactly as before.'}]};
  function grid(att,x0,y0,cs,hl,e){let s='';const nh=att.length;
    for(let i=0;i<T;i++){const vis=Math.min(1,Math.max(0,e*T-i));
      for(let j=0;j<T;j++){let a=0;for(let h=0;h<nh;h++)a+=att[h][i][j];a/=nh;
        s+=rc(x0+j*cs,y0+i*cs,cs-1,cs-1,a>0?(hl&&j===T-1?'var(--c2)':'var(--acc)'):'var(--soft)',{r:1,op:a>0?Math.max(.07,Math.min(1,a*1.6))*vis+(1-vis)*0.04:1})}}
    return s}
  function draw(mode,k,e,w){const R=runs()[mode],narrow=w<560;
    const cs=Math.max(10,Math.min(20,Math.floor((narrow?w-70:(w-160)/2)/T))),gx=58,gy=34;
    let s='',H=gy+T*cs+120+(narrow?34:0);
    // token labels
    lab.forEach((t,i)=>s+=tx(gx-4,gy+i*cs+cs*0.75,t,{fs:11,a:'end',c:i>=1&&i<=5&&ppl[i-1]===mem?'var(--good)':'var(--mute)',w:t==='chess'?600:null}));
    const p1=R.passes[0],p2=R.passes[1];
    const show1=k>=1,show2=mode==='bitune'&&k>=2;
    if(!show1){for(let i=0;i<T;i++)for(let j=0;j<T;j++)s+=rc(gx+j*cs,gy+i*cs,cs-1,cs-1,'var(--soft)',{r:1})}
    if(show1){s+=tx(gx,gy-8,mode==='lora'?'causal pass':'pass 1: causal',{fs:11,w:600})+grid(p1.att[0],gx,gy,cs,false,k===1?e:1)}
    const x2=narrow?gx:gx+T*cs+50,y2=narrow?gy+T*cs+24:gy;
    if(narrow&&show2)H+=T*cs+24;
    if(show2){if(narrow)lab.forEach((t,i)=>s+=tx(x2-4,y2+i*cs+cs*0.75,t,{fs:11,a:'end',c:'var(--mute)'}));s+=tx(x2,y2-8,'pass 2: bidirectional',{fs:11,w:600})+grid(p2.att[0],x2,y2,cs,true,k===2?e:1)}
    // cache strip and answer
    const yb=(narrow&&show2?y2:gy)+T*cs+18,cacheK=mode==='lora'?2:3,ansK=mode==='lora'?3:4;
    if(k>=cacheK){const cw=Math.min(26,(w-gx-20)/T);let lb=mode==='lora'?'cache: '+T+' × '+L+' blocks of (K, V)':'mixed cache, same size';
      s+=tx(gx,yb+10,lb,{fs:11,w:600});
      for(let i=0;i<T;i++)for(let l=0;l<L;l++){const c=mode==='lora'?'var(--c1)':'var(--c3)';s+=rc(gx+i*cw,yb+16+l*7,cw-2,6,c,{r:1,op:k===cacheK?0.3+0.7*e:1})}
      if(mode==='bitune'){const al=R.alpha,ax=narrow?gx:gx+T*cw+8,ay=narrow?yb+48:yb+26;s+=tx(ax,ay,'α_k per block '+al[0].map(a=>a.toFixed(2)).join(' / '),{fs:11,c:'var(--mute)'})+tx(ax,ay+14,'α_v per block '+al[1].map(a=>a.toFixed(2)).join(' / '),{fs:11,c:'var(--mute)'})}}
    if(k>=ansK){const pr=R.steps[0].probs,ya=yb+44+(narrow&&mode==='bitune'?34:0),bw=w-gx-70;let x=gx;s+=tx(gx-4,ya+12,':',{fs:12,a:'end',w:600});
      ppl.forEach(p=>{const v=pr[P0+p]*(k===ansK?e:1),isM=p===mem;s+=rc(x,ya+2,Math.max(0,bw*v-0.5),14,isM?'var(--good)':'var(--bad)',{r:1,op:isM?.9:.45})+(bw*v>40?tx(x+3,ya+13,V[P0+p],{fs:11,c:'#fff'}):'');x+=bw*v});
      s+=tx(Math.min(w-4,x+6),ya+13,'→ '+V[R.answer],{fs:12,w:600,a:x+60>w?'end':null})}
    return svgW(w,H,s,'Prefill animation')}
  function counters(mode,k){const R=runs()[mode],np=mode==='lora'?1:Math.min(2,Math.max(k,1)),ansK=mode==='lora'?3:4;
    return stat('prompt passes',String(k>=1?np:0),mode==='lora'?'causal only':'causal + bidirectional')+stat('block evaluations for the prompt',String((k>=1?np:0)*T*L),T+' tokens × '+L+' blocks per pass')+stat('KV cache read by the answer',T*L+' (K, V) pairs','the same for both')+stat('probability on '+V[P0+mem],k>=ansK?(100*pm(R)).toFixed(1)+'%':'not yet',k>=ansK?'answer: '+V[R.answer]:'')}
  const A=makeAnim({id:'pf',modes:STEPS,mode:'lora',draw:(m,k,e,w)=>draw(m,k,e,w),counters,dur:2600});
  window.PF_EXAMPLE={ids,mem,lora:()=>pm(runs().lora),bitune:()=>pm(runs().bitune)};
})();
