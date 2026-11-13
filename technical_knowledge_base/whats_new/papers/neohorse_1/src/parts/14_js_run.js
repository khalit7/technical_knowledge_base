// ---- Schedule the curriculum tab: the three-stage routing curriculum against shuffled SFT, and the coarsened OPD loss ----
// The curriculum engine (2026-11-13: a global, so the 3D loop stage in Reading draws the same pool at the tab's defaults).
// cuPool(mix, confidence 0..1, reserve share 0..0.5): 120 illustrative user-turn examples with router scores, and for each ordering
// (soft, hard, shuf) the rank, the stage (0..2), the held-back flags and the training sequence. Seeded, so the same inputs give the same pool.
const CU_NX=120,CU_PER=40,CU_MIX={routine:[.45,.35,.15,.05],bal:[.25,.3,.27,.18],hard:[.08,.17,.35,.4]};
function cuPool(mixKey,conf,res){const NX=CU_NX,PER=CU_PER,mix=CU_MIX[mixKey];
  function gauss(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
  const r=mulberry32(20260908),sig=.25+(1-conf)*1.2,ex=[];
  for(let i=0;i<NX;i++){let u=r(),t=0;while(t<3&&u>mix[t]){u-=mix[t];t++}const d=t+(r()-.5)+gauss(r)*.3;
    const w=[0,1,2,3].map(k=>Math.exp(-((k-d)**2)/(2*sig*sig))),S=w.reduce((a,b)=>a+b,0),pi=w.map(x=>x/S);
    const hard=pi.indexOf(Math.max(...pi)),soft=pi.reduce((a,p,k)=>a+k*p,0);
    ex.push({pi,hard,soft,px:r(),py:r(),tie:r(),sh:r(),inst:r()})}
  const order={},stage={},reserved={},trainSeq={};
  ['soft','hard','shuf'].forEach(m=>{
    const key=m==='soft'?(e=>e.soft):m==='hard'?(e=>e.hard+e.tie*.001):(e=>e.sh);
    const ord=ex.map((e,i)=>i).sort((a,b)=>key(ex[a])-key(ex[b]));order[m]=ord;
    const st=new Array(NX).fill(0),rs=new Array(NX).fill(false);
    if(m==='shuf'){ord.forEach((i,j)=>st[i]=Math.floor(j/PER))}
    else{const low=ord.slice(0,PER),R=Math.round(res*PER),pick=low.slice().sort((a,b)=>ex[a].sh-ex[b].sh).slice(0,R);
      const R2=Math.ceil(R/2);pick.forEach((i,j)=>{rs[i]=true;st[i]=j<R2?1:2});
      const rest=ord.filter(i=>!rs[i]);rest.forEach((i,j)=>{st[i]=j<PER?0:j<2*PER-R2?1:2})}
    stage[m]=st;reserved[m]=rs;
    const seq=[];for(let j=0;j<3;j++){ex.map((e,i)=>i).filter(i=>st[i]===j).sort((a,b)=>ex[a].inst-ex[b].inst).forEach(i=>seq.push(i))}
    trainSeq[m]=seq});
  // mean soft score of each stage, per ordering (what the counters and the loop stage print)
  const means={};['soft','hard','shuf'].forEach(m=>{means[m]=[0,1,2].map(j=>{const ids=ex.map((e,i)=>i).filter(i=>stage[m][i]===j);return ids.reduce((a,i)=>a+ex[i].soft,0)/ids.length})});
  return {ex,order,stage,reserved,trainSeq,means}}
(function(){
  if(!$('cu'))return;
  const NX=CU_NX,PER=CU_PER;
  let P=null;
  function build(){const conf=+$('cuConf').value/100,res=+$('cuRes').value/100;
    $('cuConfV').textContent=conf<.34?'low':conf<.67?'medium':'high';$('cuResV').textContent=Math.round(res*100)+'% of the lowest third';
    P=cuPool($('cuMix').value,conf,res)}
  const steps={soft:[{t:'Score the pool'},{t:'Sort by score'},{t:'Hold some easy examples back'},{t:'Stage 1'},{t:'Stage 2'},{t:'Stage 3'},{t:'Train'}],hard:[{t:'Score the pool'},{t:'Sort by tier'},{t:'Hold some easy examples back'},{t:'Stage 1'},{t:'Stage 2'},{t:'Stage 3'},{t:'Train'}],shuf:[{t:'Score the pool'},{t:'Shuffle'},{t:'Split into thirds'},{t:'Train'}]};
  function layout(w){const pl=14,pr=14,band=[22,112],sy=150,cw=(w-pl-pr)/3,cell=Math.min(14,(cw-12)/8),bh=5*cell+14,cy=sy+bh+44,ch=104;return {pl,pr,band,sy,cw,cell,bh,cy,ch,H:cy+ch+26}}
  function pos(m,k,i,L,w){const e=P.ex[i],o=P.order[m],rank=o.indexOf(i),st=P.stage[m][i],rs=P.reserved[m][i];
    const sv=m==='hard'?e.hard:e.soft;
    const scatter={x:L.pl+8+e.px*(w-L.pl-L.pr-16),y:L.band[0]+6+e.py*(L.band[1]-L.band[0]-12)};
    const line={x:L.pl+4+rank*(w-L.pl-L.pr-8)/(NX-1),y:L.band[1]-6-(m==='shuf'?e.soft:sv)/3*(L.band[1]-L.band[0]-16)};
    if(k===0)return scatter;
    const inStage=()=>{const mem=P.order[m].filter(j=>P.stage[m][j]===st),slot=mem.indexOf(i);return {x:L.pl+st*L.cw+6+(slot%8+.5)*L.cell,y:L.sy+8+(Math.floor(slot/8)+.5)*L.cell}};
    if(m==='shuf'){return k>=2?inStage():line}
    if(k>=3&&st<=k-3)return inStage();
    if(k>=2&&rs)return {x:line.x,y:line.y-14};
    return line}
  const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  function movAvg(seq){const out=[];for(let j=0;j<seq.length;j++){const a=Math.max(0,j-9);let s=0;for(let t=a;t<=j;t++)s+=P.ex[seq[t]].soft;out.push(s/(j-a+1))}return out}
  const A=makeAnim({id:'cu',mode:'soft',modes:steps,lists:{soft:'sx-cu-soft',hard:'sx-cu-hard',shuf:'sx-cu-shuf'},dur:3800,
    draw:(m,k,e,w)=>{if(!P)build();const L=layout(w);let s='';
      s+=tx(L.pl,14,k===0?'Pool of 120 user-turn examples':m==='shuf'?'Random order':'Ranked by '+(m==='hard'?'assigned tier':'soft score')+' (height = score)',{fs:11,c:'var(--mute)'});
      for(let j=0;j<3;j++){const x=L.pl+j*L.cw;s+=rc(x+2,L.sy,L.cw-4,L.bh,'none',{s:'var(--line)',r:6})+tx(x+L.cw/2,L.sy+L.bh+15,'Stage '+(j+1),{fs:11,a:'middle',w:600})}
      const showStage=m==='shuf'?k>=2:k>=3;
      P.ex.forEach((ex,i)=>{const a=pos(m,Math.max(0,k-1),i,L,w),b=pos(m,k,i,L,w),p=lerp(a,b,k===0?1:e);
        const rs=P.reserved[m][i]&&k>=2&&m!=='shuf';
        s+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(Math.min(4.2,L.cell*.36)).toFixed(1)+'" fill="'+tierCol(m==='hard'?ex.hard:ex.soft)+'"'+(rs?' stroke="var(--bad)" stroke-width="1.6"':'')+'/>'});
      // training chart
      const last=steps[m].length-1,y0=L.cy,ch=L.ch,X=j=>L.pl+30+(w-L.pl-L.pr-34)*j/(NX-1),Y=v=>y0+ch*(1-v/3);
      s+=tx(L.pl,y0-10,'Mean score of the last 10 examples, over training',{fs:11,c:'var(--mute)'});
      [0,1,2,3].forEach(v=>{s+=ln2(L.pl+30,Y(v),w-L.pr,Y(v),'var(--line)')+tx(L.pl+24,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
      [40,80].forEach(j=>{s+=ln2(X(j),y0,X(j),y0+ch,'var(--mute)',{da:'2 3',op:.6})});
      s+=tx(X(20),y0+ch+16,'stage 1',{fs:11,a:'middle',c:'var(--mute)'})+tx(X(60),y0+ch+16,'stage 2',{fs:11,a:'middle',c:'var(--mute)'})+tx(X(100),y0+ch+16,'stage 3',{fs:11,a:'middle',c:'var(--mute)'});
      if(k===last){const n=Math.max(2,Math.round(NX*e)),mv=movAvg(P.trainSeq[m]),sh=movAvg(P.trainSeq.shuf);
        if(m!=='shuf'){let d='';sh.forEach((v,j)=>{d+=(j?'L':'M')+X(j).toFixed(1)+','+Y(v).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="var(--mute)" stroke-width="1.3" stroke-dasharray="4 3"/>'}
        let d='';mv.slice(0,n).forEach((v,j)=>{d+=(j?'L':'M')+X(j).toFixed(1)+','+Y(v).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2.2"/>'}
      return svgW(w,L.H,s,'Three-stage routing curriculum')},
    counters:(m,k)=>{if(!P)build();const last=steps[m].length-1,showStage=m==='shuf'?k>=2:k>=3;
      const mean=j=>{const ids=P.ex.map((e,i)=>i).filter(i=>P.stage[m][i]===j);return (ids.reduce((a,i)=>a+P.ex[i].soft,0)/ids.length).toFixed(2)};
      const low3=P.ex.filter((e,i)=>P.stage[m][i]===2&&e.hard<=1).length,R=P.reserved[m].filter(Boolean).length;
      const split=P.ex.filter(e=>e.hard===1).length;
      return stat('mean soft score by stage',showStage?mean(0)+' · '+mean(1)+' · '+mean(2):'not split yet','0 is C0, 3 is C3')+
        stat('C0 or C1 examples in stage 3',showStage&&(m==='shuf'||k>=5)?low3+' of 40':'',m==='shuf'?'random share':R+' held back from the lowest third')+
        stat('examples',NX+', each used once',split+' assigned tier C1')}});
  const reb=()=>{build();if(A){A.draw()}};
  ['cuMix'].forEach(id=>$(id).addEventListener('change',reb));['cuConf','cuRes'].forEach(id=>$(id).addEventListener('input',reb));
  build();
})();

(function(){
  function draw(w){const K=+$('opK').value;$('opKV').textContent=K;const p=softmax(STU),q=softmax(OPDPRESET[$('opT').value]),r=opdChart(w,p,q,K);
    $('opSvg').innerHTML=r.svg;
    $('opCnt').innerHTML=stat('reverse KL, full vocabulary',r.full.toFixed(3),'KL(P ‖ Q), 16 tokens')+stat('reverse KL, K + 1 bins',r.coarse.toFixed(3),(100*r.coarse/r.full).toFixed(0)+'% of the full value')+stat('forward KL, K + 1 bins',r.fwdCoarse.toFixed(3),'KL(Q ‖ P), for contrast');
    const t=$('opT').value;
    $('opCap').innerHTML=t==='agree'?'When the teacher agrees with the student\'s ranking, most of the divergence sits in the student\'s own top tokens, so even small <i>K</i> keeps most of it.':
      t==='second'?'A disagreement inside the student\'s top two is fully visible from <i>K</i> = 2: the reverse KL pushes the student toward the teacher\'s favourite among its own candidates.':
      'The teacher\'s favourite tokens are ones the student ranks 9th and 12th. Until <i>K</i> reaches them, the coarsened loss only sees that the teacher puts more mass in the "rest" bin, and pushes the student to move mass there in general, not to those tokens. This is the price of storing <i>K</i> + 1 numbers per position instead of the vocabulary.'}
  onTab('t-run',()=>{fit($('opSvg'),draw)});
  $('opK').addEventListener('input',()=>refit($('opSvg')));$('opT').addEventListener('change',()=>refit($('opSvg')));
})();
