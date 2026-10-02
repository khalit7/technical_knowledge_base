// ---- The paper tab: the two pipelines animated, the revision measurement, the label demo, the refusal count ----
(function(){
const RC=PAPER.rc,S=CAI.s;
const wrap=(t,fs,maxw)=>{const cw=fs*.56,n=Math.max(4,Math.floor(maxw/cw)),out=[];let cur='';t.split(' ').forEach(w=>{if((cur+' '+w).trim().length>n&&cur){out.push(cur);cur=w}else cur=(cur+' '+w).trim()});if(cur)out.push(cur);return out};
// ---------- 1. pipelines: Constitutional AI against HH RLHF ----------
const N={
 cai:[
  {t:'Helpful-only RLHF model',s:'trained with human helpfulness labels only',who:'h',c:'Start from a <b>helpful-only RLHF model</b>: human helpfulness labels, no harmlessness data at all. It complies with harmful requests, which is the point: it is good at following instructions, including the instruction to critique itself (§1.4).'},
  {t:'Red-team prompt, harmful answer',s:'182,831 prompts (42,496 human, 140,335 generated)',who:'n',c:'Sample its answer to a red-team prompt. Prompts came from crowdworkers baiting earlier models (42,496) and from few-shot prompting a pretrained model (140,335); the first answer is typically harmful.'},
  {t:'Critique, then revise ×4',s:'a random principle of 16 each time',who:'a',c:'The same model critiques its answer against a principle drawn at random, then rewrites it to remove the harm. Four rounds per prompt, 731,324 revisions in all. The only human input here is the 16 principles and a few few-shot examples.'},
  {t:'Fine-tune: SL-CAI',s:'revisions + helpfulness samples, 1 epoch',who:'n',c:'Fine-tune a <b>pretrained</b> model on the revisions from all four steps plus 270,592 helpfulness samples. This gets the policy on-distribution so RL needs less exploration.'},
  {t:'Two answers per prompt',s:'sampled from SL-CAI',who:'n',c:'SL-CAI answers each red-team prompt twice. The same model will start RL, so the PM is trained on the kind of text the policy produces.'},
  {t:'Feedback model picks',s:'"which is less harmful?" with 1 of 16 principles',who:'a',c:'A pretrained LM (or, in the CoT variant, the helpful RLHF model thinking step by step) sees both answers and a random principle as a multiple-choice question. Its normalised probabilities for (A) and (B) are the label: 182,831 AI comparisons, no human looks at any of them.'},
  {t:'PM, then RL: RL-CAI',s:'AI harmlessness + human helpfulness labels',who:'h',c:'Train a hybrid PM (182,831 AI harmlessness comparisons and 135,296 human helpfulness ones) and run RL against it from SL-CAI. From here the code is RLHF\'s.'}],
 rlhf:[
  {t:'Pretrained LM',s:'RLHF here starts from it directly',who:'n',c:'The baseline: HH RLHF as in Bai et al. (2022), retrained for this paper directly from the pretrained model (§4.2).'},
  {t:'Crowdworkers red-team',s:'conversations written to bait the model',who:'h',c:'People write conversations designed to elicit harmful output, and at each turn the model gives two answers.'},
  {t:'(no critique step)',s:'',who:'x',c:'There is no supervised harmlessness stage: nothing rewrites the harmful answers.'},
  {t:'(no SL stage)',s:'',who:'x',c:'No supervised fine-tuning on revisions either; RL starts from the pretrained model.'},
  {t:'Two answers per turn',s:'from the model being red-teamed',who:'n',c:'Pairs of answers are collected in the conversations themselves.'},
  {t:'Crowdworker picks',s:'"which is more harmless?"',who:'h',c:'A person picks the more harmless answer. Asked only that, workers rewarded refusals, "which likely produced a significant amount of data favoring evasiveness" (footnote 9): the label the paper set out to replace.'},
  {t:'PM, then RL: HH RLHF',s:'human harmlessness + human helpfulness labels',who:'h',c:'Train the PM on human harmlessness and helpfulness comparisons and run RL. The released harmless-base split of that earlier work alone holds 44,849 comparisons.'}]};
const cnt=(m,k,e)=>{const f=(v,at)=>k>at?v:k===at?Math.round(v*e):0;const box=(l,v,d)=>'<div class="stat"><div class="k">'+l+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  if(m==='cai')return '<div class="grid">'+box('Human harmlessness labels','0','none at any step')+box('AI harmlessness labels',fmt(f(RC.pm_ai,5)),'one per red-team prompt')+box('Human helpfulness labels',fmt(f(RC.pm_human,6)),'in the PM')+box('Principles written',fmt(f(16,2)+f(16,5)),'16 for critiques, 16 for labels')+'</div>';
  return '<div class="grid">'+box('Human harmlessness labels',fmt(f(44849,5)),'released harmless-base split')+box('AI harmlessness labels','0','')+box('Human helpfulness labels',k>=6?'yes':'0','count not given for this PM')+box('Principles written','0','the objective lives in the labels')+'</div>'};
const pipDraw=(m,k,e,w)=>{const L=N[m],two=w>=600,gap=14;let s='',pos=[];
  if(two){const bw=(w-3*gap-8)/4,bh=70;L.forEach((n,i)=>{const r=i<4?0:1,c=i<4?i:7-i;pos.push({x:4+c*(bw+gap),y:10+r*(bh+34),w:bw,h:bh})})}
  else{const bw=w-8,bh=50;L.forEach((n,i)=>pos.push({x:4,y:6+i*(bh+16),w:bw,h:bh}))}
  const H=pos[pos.length-1].y+pos[pos.length-1].h+10;
  L.forEach((n,i)=>{if(i===0)return;const a=pos[i-1],b=pos[i];let x1,y1,x2,y2;
    if(two&&i===4){x1=a.x+a.w/2;y1=a.y+a.h;x2=b.x+b.w/2;y2=b.y}else if(two&&i>4){x1=a.x;y1=a.y+a.h/2;x2=b.x+b.w;y2=b.y+b.h/2}else if(two){x1=a.x+a.w;y1=a.y+a.h/2;x2=b.x;y2=b.y+b.h/2}else{x1=a.x+a.w/2;y1=a.y+a.h;x2=b.x+b.w/2;y2=b.y}
    s+=G(i<=k?1:.25,ar(x1,y1,x2+(two&&i>4?2:two&&i<4?-2:0),y2-(two&&i!==4?0:2)))});
  L.forEach((n,i)=>{const p=pos[i],op=i<k?1:i===k?.35+.65*e:.22,stroke=n.who==='h'?'var(--c2)':n.who==='a'?'var(--c1)':'var(--line)',fill=i===k?'var(--acc2)':n.who==='x'?'var(--bg)':'var(--soft)';
    let g=rc(p.x,p.y,p.w,p.h,fill,{s:stroke,sw:n.who==='h'||n.who==='a'?2:1,r:7,da:n.who==='x'?'4 3':null});
    const tl=wrap(n.t,12,p.w-12),sl=n.s?wrap(n.s,11,p.w-12):[];const lines=tl.length+sl.length,lh=14;let y=p.y+p.h/2-(lines-1)*lh/2+4;
    tl.forEach(t=>{g+=tx(p.x+p.w/2,y,t,{fs:12,a:'middle',w:600});y+=lh});sl.forEach(t=>{g+=tx(p.x+p.w/2,y,t,{fs:11,a:'middle',c:'var(--mute)'});y+=lh});
    if(n.who==='h'||n.who==='a')g+=tx(p.x+p.w-6,p.y+12,n.who==='h'?'people':'model',{fs:11,a:'end',c:stroke});
    s+=G(op,g)});
  return svgEl(w,H,s,'The '+(m==='cai'?'Constitutional AI':'HH RLHF')+' pipeline, step '+(k+1))};
const mk=m=>N[m].map(n=>({t:n.t.replace(/[()]/g,''),c:n.c}));
makeAnim({id:'pip',modes:{cai:mk('cai'),rlhf:mk('rlhf')},mode:'cai',draw:pipDraw,counters:cnt,dur:3200});

// ---------- 2. how much each revision rewrites ----------
PRED_REVEAL['pr-rev']=()=>{const C=S.chains;fit($('revSvg'),w=>{const H=200,pl=44,pr=10,pt=18,pb=40,iw=w-pl-pr,ih=H-pt-pb;let s='';
  const bwid=Math.min(56,iw/5*.55);
  [0,.25,.5].forEach(v=>{const y=pt+ih*(1-v/.6);s+=ln2(pl,y,w-pr,y,'var(--line)')+tx(pl-6,y+4,Math.round(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'})});
  for(let k=0;k<5;k++){const x=pl+iw*(k+.5)/5;s+=tx(x,H-pb+16,k?(w<520?'rev. ':'revision ')+k:(w<520?'answer':'first answer'),{fs:11,a:'middle'})+tx(x,H-pb+30,C.mean_words[k].toFixed(0)+' words',{fs:11,a:'middle',c:'var(--mute)'});
    if(k){const v=C.new_word_share_mean[k-1],y=pt+ih*(1-v/.6);s+=rc(x-bwid/2,y,bwid,pt+ih-y,'var(--c3)',{r:3})+tx(x,y-5,Math.round(v*100)+'%',{fs:11,a:'middle',w:600})}}
  s+=tx(pl,12,w<520?'new words vs the previous version':'share of words new relative to the previous version (mean of 66 chains)',{fs:11,c:'var(--mute)'});
  $('revSvg').innerHTML=svgEl(w,H,s,'New-word share per revision')});
  $('revNote').innerHTML='Medians: '+C.new_word_share_median.map(v=>Math.round(v*100)+'%').join(', ')+'. Revisions identical to the one before: '+C.identical_to_previous.join(', ')+' of 66. The first revision shortens answers by about a quarter (78 to 60 words) and later ones keep length but keep rephrasing, so the text never settles even though the PM-scored harmlessness gains flatten (Figure 5). Rewritten words are not removed harm: this measures churn, not safety.'};

// ---------- 3. soft, hard and clamped labels ----------
let labT='soft';
const sig=x=>1/(1+Math.exp(-x)),lgt=p=>Math.log(p/(1-p));
const target=(t,p)=>t==='hard'?(p>.5?1:p<.5?0:.5):t==='c28'?Math.min(.8,Math.max(.2,p)):t==='c46'?Math.min(.6,Math.max(.4,p)):p;
const run=(t)=>{let d=0;const tr=[0];for(let i=0;i<400;i++){d-=.5*(sig(d)-t);tr.push(d)}return tr};
function labDraw(){const p=+$('labP').value/100;$('labPv').textContent=p.toFixed(2);const T=['soft','hard','c28','c46'],nm={soft:'soft',hard:'hard 0/1',c28:'clamp 20 to 80',c46:'clamp 40 to 60'},col={soft:'var(--c1)',hard:'var(--c2)',c28:'var(--c5)',c46:'var(--c3)'};
  const tr={};T.forEach(t=>tr[t]=run(target(t,p)));
  fit($('labSvg'),w=>{const H=230,pl=40,pr=12,pt=14,pb=34,iw=w-pl-pr,ih=H-pt-pb;const ymax=Math.max(1,Math.ceil(Math.max(...T.map(t=>tr[t][400]))+.3));
    const X=i=>pl+iw*i/400,Y=v=>pt+ih*(1-v/ymax);let s='';
    for(let v=0;v<=ymax;v+=ymax>5?2:1)s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'});
    [0,100,200,300,400].forEach(i=>s+=tx(X(i),H-pb+15,i,{fs:11,a:'middle',c:'var(--mute)'}));
    s+=tx(pl+iw/2,H-pb+29,'gradient steps on this one comparison',{fs:11,a:'middle',c:'var(--mute)'});
    s+=tx(pl+4,pt+10,'reward gap Δ = r(A) − r(B)',{fs:11,c:'var(--mute)'});
    T.forEach(t=>{const on=t===labT;let d='';tr[t].forEach((v,i)=>{if(i%4===0||i===400)d+=(d?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1)});
      s+='<path d="'+d+'" fill="none" stroke="'+col[t]+'" stroke-width="'+(on?2.6:1.2)+'" opacity="'+(on?1:.45)+'"/>';
      const tg=target(t,p);if(on&&tg<1&&tg>0){const y=Y(lgt(tg));s+=ln2(pl,y,w-pr,y,col[t],{da:'4 3',op:.8})}});
    const lg=legend(T.map(t=>[nm[t],col[t]]),pl,H+12,iw);
    $('labSvg').innerHTML=svgEl(w,H+lg.h+6,s+lg.s,'Reward gap over training for four label types')});
  const tg=target(labT,p),d=tr[labT][400];
  $('labO').innerHTML='Target <b>'+tg.toFixed(2)+'</b> · optimum gap logit(target) = <b>'+(tg>=1||tg<=0?'none (infinite)':lgt(tg).toFixed(3))+'</b> · gap after 400 steps <b>'+d.toFixed(2)+'</b>'+(labT==='hard'?' and still growing':'')+' · the PM then says (A) wins with probability '+sig(d).toFixed(3)+'. '+(labT==='c46'?'However sure the chain of thought was, no comparison can ask for a gap above logit(0.6) = '+RC.gap_clamp_60+', so RL cannot farm reward by making answers ever more extreme in one direction.':labT==='hard'?'Every label asks for an infinite gap: the PM is pushed to separate pairs as far as it can, the "extreme responses" the paper saw without clamping.':labT==='c28'?'The cap is logit(0.8) = '+RC.gap_clamp_80+'; the paper found this "slightly improved results" over unclamped CoT labels.':'A calibrated label asks for exactly the confidence it has; this is why soft labels beat hard ones without CoT.')}
segBind('labT',m=>{labT=m;labDraw()});$('labP').addEventListener('input',labDraw);
PRED_REVEAL['pr-lab']=labDraw;

// ---------- 4. the refusal count, short form ----------
PRED_REVEAL['pr-ev']=()=>{const P=S.per_model,M=S.models;fit($('evSvg'),w=>{const rh=30,pl=Math.min(130,w*.36),pr=50,H=M.length*rh+28,iw=w-pl-pr;let s='';
  M.forEach((m,i)=>{const y=14+i*rh,v=P[m].evasive_25w/P[m].n;s+=tx(pl-8,y+14,m,{fs:12,a:'end'})+rc(pl,y+3,iw,16,'var(--soft)',{r:3})+rc(pl,y+3,Math.max(1,iw*v),16,'var(--bad)',{r:3})+tx(pl+Math.max(1,iw*v)+6,y+15,(100*v).toFixed(1)+'%',{fs:11,w:600})});
  s+=tx(pl,10,'share of 1,122 answers that are a canned refusal (25 words or fewer)',{fs:11,c:'var(--mute)'});$('evSvg').innerHTML=svgEl(w,H,s,'Canned refusals per model')});
  const h=P['HH RLHF'],bd=S.hh_evasive_by_dataset;$('evNote').innerHTML='HH RLHF: '+fmt(h.evasive_25w)+' of '+fmt(h.n)+' ('+(100*h.evasive_share).toFixed(1)+'%), on '+h.prompts_with_any_evasive+' of 66 prompts; by source, PALMS '+bd.PALMS[0]+'/'+bd.PALMS[1]+', LaMDA '+bd.LAMDA[0]+'/'+bd.LAMDA[1]+', InstructGPT '+bd.INSTRUCTGPT[0]+'/'+bd.INSTRUCTGPT[1]+'. Helpful RLHF, RL-CAI and RL-CAI with CoT: 0. The most common single answer is "'+CAI.x.refusals[0][0]+'" ('+CAI.x.refusals[0][1]+' times).'};
})();
