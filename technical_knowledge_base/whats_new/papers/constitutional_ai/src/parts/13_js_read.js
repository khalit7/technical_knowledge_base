// ---- The paper tab: the revision measurement, the label demo, the refusal count ----
(function(){
const RC=PAPER.rc,S=CAI.s;
const wrap=(t,fs,maxw)=>{const cw=fs*.56,n=Math.max(4,Math.floor(maxw/cw)),out=[];let cur='';t.split(' ').forEach(w=>{if((cur+' '+w).trim().length>n&&cur){out.push(cur);cur=w}else cur=(cur+' '+w).trim()});if(cur)out.push(cur);return out};
// ---------- 1. the pipelines are the 3D stage in 31_js_sc_pip.js ----------

// ---------- 2. how much each revision rewrites ----------
(()=>{const C=S.chains;fit($('revSvg'),w=>{const H=200,pl=44,pr=10,pt=18,pb=40,iw=w-pl-pr,ih=H-pt-pb;let s='';
  const bwid=Math.min(56,iw/5*.55);
  [0,.25,.5].forEach(v=>{const y=pt+ih*(1-v/.6);s+=ln2(pl,y,w-pr,y,'var(--line)')+tx(pl-6,y+4,Math.round(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'})});
  for(let k=0;k<5;k++){const x=pl+iw*(k+.5)/5;s+=tx(x,H-pb+16,k?(w<520?'rev. ':'revision ')+k:(w<520?'answer':'first answer'),{fs:11,a:'middle'})+tx(x,H-pb+30,C.mean_words[k].toFixed(0)+' words',{fs:11,a:'middle',c:'var(--mute)'});
    if(k){const v=C.new_word_share_mean[k-1],y=pt+ih*(1-v/.6);s+=rc(x-bwid/2,y,bwid,pt+ih-y,'var(--c3)',{r:3})+tx(x,y-5,Math.round(v*100)+'%',{fs:11,a:'middle',w:600})}}
  s+=tx(pl,12,w<520?'new words vs the previous version':'share of words new relative to the previous version (mean of 66 chains)',{fs:11,c:'var(--mute)'});
  $('revSvg').innerHTML=svgEl(w,H,s,'New-word share per revision')});
  $('revNote').innerHTML='Medians: '+C.new_word_share_median.map(v=>Math.round(v*100)+'%').join(', ')+'. Revisions identical to the one before: '+C.identical_to_previous.join(', ')+' of 66. The first revision shortens answers by about a quarter (78 to 60 words) and later ones keep length but keep rephrasing, so the text never settles even though the PM-scored harmlessness gains flatten (Figure 5). Rewritten words are not removed harm: this measures churn, not safety.'})();

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
labDraw(); // drawn at once since 2026-10-25 (visual inline beside the claim, not behind the question)

// ---------- 4. the refusal count, short form ----------
(()=>{const P=S.per_model,M=S.models;fit($('evSvg'),w=>{const rh=30,pl=Math.min(130,w*.36),pr=50,H=M.length*rh+28,iw=w-pl-pr;let s='';
  M.forEach((m,i)=>{const y=14+i*rh,v=P[m].evasive_25w/P[m].n;s+=tx(pl-8,y+14,m,{fs:12,a:'end'})+rc(pl,y+3,iw,16,'var(--soft)',{r:3})+rc(pl,y+3,Math.max(1,iw*v),16,'var(--bad)',{r:3})+tx(pl+Math.max(1,iw*v)+6,y+15,(100*v).toFixed(1)+'%',{fs:11,w:600})});
  s+=tx(w<520?4:pl,10,w<520?'canned refusals, share of 1,122 answers':'share of 1,122 answers that are a canned refusal (25 words or fewer)',{fs:11,c:'var(--mute)'});$('evSvg').innerHTML=svgEl(w,H,s,'Canned refusals per model')});
  const h=P['HH RLHF'],bd=S.hh_evasive_by_dataset;$('evNote').innerHTML='HH RLHF: '+fmt(h.evasive_25w)+' of '+fmt(h.n)+' ('+(100*h.evasive_share).toFixed(1)+'%), on '+h.prompts_with_any_evasive+' of 66 prompts; by source, PALMS '+bd.PALMS[0]+'/'+bd.PALMS[1]+', LaMDA '+bd.LAMDA[0]+'/'+bd.LAMDA[1]+', InstructGPT '+bd.INSTRUCTGPT[0]+'/'+bd.INSTRUCTGPT[1]+'. Helpful RLHF, RL-CAI and RL-CAI with CoT: 0. The most common single answer is "'+CAI.x.refusals[0][0]+'" ('+CAI.x.refusals[0][1]+' times).'})();
})();
