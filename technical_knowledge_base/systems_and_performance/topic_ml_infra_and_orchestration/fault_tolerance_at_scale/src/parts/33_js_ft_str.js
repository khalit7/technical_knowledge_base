// ---- Straggler replay tab (t-str): per-rank compute and wait from src/runs/strag_*.json (window.FT.strag) ----
(function(){
const D=window.FT.strag, $=id=>document.getElementById(id), E=RD.esc;
const f1=x=>(+x).toFixed(1), f2=x=>(+x).toFixed(2);
let RUN='strag_mix';
const R=()=>D.runs[RUN];
const planted=RUN=>RUN==='strag_none'?[]:D.slow;
function isSlow(r,s,runName){return planted(runName||RUN).some(p=>p.rank===r&&s>=p.first&&s<=p.last&&(s-p.first)%p.every===0)}
const med=a=>{const b=a.slice().sort((x,y)=>x-y),n=b.length;return n?(n%2?b[(n-1)/2]:(b[n/2-1]+b[n/2])/2):NaN};
const STEPS_SHOWN=6;

// ---- animation: a few consecutive steps as a Gantt chart, one lane per rank
let A;
function drawAnim(i){
  const run=R(), el=$('st-anim'), w=RD.width(el), s0=i;
  const idx=[];for(let k=0;k<STEPS_SHOWN&&s0+k<run.steps.length;k++)idx.push(s0+k);
  const lane=26,top=18,left=56,H=top+4*lane+26;
  const tot=idx.reduce((a,j)=>a+Math.max(...[0,1,2,3].map(r=>run.compute[r][j]+run.comm[r][j])),0);
  const sc=(w-left-10)/Math.max(tot,1);
  let s='';
  for(let r=0;r<4;r++)s+=RD.t(4,top+r*lane+16,'rank '+r,{fs:12,w:600});
  let x0=left;
  idx.forEach(j=>{
    const step=run.steps[j];
    const span=Math.max(...[0,1,2,3].map(r=>run.compute[r][j]+run.comm[r][j]));
    s+='<line x1="'+x0+'" y1="'+(top-6)+'" x2="'+x0+'" y2="'+(top+4*lane)+'" stroke="var(--line)"/>';
    s+=RD.t(x0+3,top-6,'step '+step,{fs:10.5,fill:'var(--mute)'});
    for(let r=0;r<4;r++){
      const c=run.compute[r][j],m=run.comm[r][j],y=top+r*lane+4;
      s+='<rect x="'+x0.toFixed(1)+'" y="'+y+'" width="'+Math.max(.5,c*sc).toFixed(1)+'" height="16" rx="2" fill="'+(isSlow(r,step)?'var(--bad)':'var(--c1)')+'"/>';
      s+='<rect x="'+(x0+c*sc).toFixed(1)+'" y="'+y+'" width="'+Math.max(.5,m*sc).toFixed(1)+'" height="16" rx="2" fill="var(--line)"/>';
    }
    x0+=span*sc;
  });
  s+=RD.t(left,H-6,'time: '+f1(tot)+' ms in view, to scale',{fs:11,fill:'var(--mute)'});
  el.innerHTML=RD.svg(w,H,s,'Per-rank compute and wait for '+idx.length+' consecutive steps');
  const j=idx[0],step=run.steps[j];
  const slow=[0,1,2,3].filter(r=>isSlow(r,step));
  const comp=[0,1,2,3].map(r=>run.compute[r][j]),comm=[0,1,2,3].map(r=>run.comm[r][j]),stp=[0,1,2,3].map(r=>run.step[r][j]);
  $('st-anim-cap').innerHTML='<b>Step '+step+'.</b> '+(slow.length?'Planted slowness on rank '+slow.join(', ')+'. It computes for '+f1(comp[slow[0]])+' ms against '+f1(med([0,1,2,3].filter(r=>!slow.includes(r)).map(r=>comp[r])))+' ms for the others, then waits only '+f1(comm[slow[0]])+' ms, because it arrives last; the others wait '+f1(med([0,1,2,3].filter(r=>!slow.includes(r)).map(r=>comm[r])))+' ms for it.':'No planted slowness on this step: compute '+f1(Math.min(...comp))+' to '+f1(Math.max(...comp))+' ms, wait '+f1(Math.min(...comm))+' to '+f1(Math.max(...comm))+' ms (the all-reduce itself plus small differences in arrival).')+' Every rank\'s step takes about the same time ('+f1(Math.min(...stp))+' to '+f1(Math.max(...stp))+' ms): the step-time log cannot tell who was slow.';
  $('st-anim-out').innerHTML=[0,1,2,3].map(r=>RD.stat('rank '+r,f1(comp[r])+' + '+f1(comm[r])+' ms','compute + wait')).join('');
}
function initAnim(){A=RD.anim({card:'st-anim-card',ctl:'st-anim-ctl',n:R().steps.length-STEPS_SHOWN+1,draw:drawAnim,ms:450,label:'First step shown'})}

// ---- detectors
function flags(rule,stat,win,thr){
  const run=R(),n=run.steps.length,F=[[],[],[],[]],J=[],k=1+thr/100;
  const agg=(arr,j)=>{const a=arr.slice(Math.max(0,j-win+1),j+1);return stat==='max'?Math.max(...a):med(a)};
  // baselines from steps 2..51 (index 1..50): the first step includes warm-up
  const base=[0,1,2,3].map(r=>med(run.compute[r].slice(1,51)));
  const sbase=med(run.step[0].slice(1,51));
  for(let j=0;j<n;j++){
    if(j<1){[0,1,2,3].forEach(r=>F[r].push(false));J.push(false);continue}
    const c=[0,1,2,3].map(r=>agg(run.compute[r],j)),m=[0,1,2,3].map(r=>agg(run.comm[r],j));
    for(let r=0;r<4;r++){
      let f=false;
      const others=a=>med([0,1,2,3].filter(q=>q!==r).map(q=>a[q]));
      if(rule==='wait')f=m[r]>k*Math.min(...m);
      else if(rule==='comp')f=c[r]===Math.max(...c)&&c[r]>k*others(c);
      else if(rule==='rel')f=Math.min(...c)/c[r]<1-thr/100;
      else if(rule==='ind')f=base[r]/c[r]<1-thr/100;
      F[r].push(f);
    }
    J.push(rule==='step'&&agg(run.step[0],j)>k*sbase);
  }
  return {F,J,base,sbase};
}
function score(res,win){
  const run=R(),pl=planted(RUN),rows=[];
  pl.forEach(p=>{
    const js=run.steps.map((s,j)=>j).filter(j=>run.steps[j]>=p.first&&run.steps[j]<=p.last&&(run.steps[j]-p.first)%p.every===0);
    let first=null,hit=0;
    js.forEach(j=>{const f=res.F[p.rank][j]||res.J[j];if(f){hit++;if(first===null)first=run.steps[j]}});
    rows.push({p,first,share:hit/js.length});
  });
  // false positives: a rank flagged with no planted slowness on it anywhere in the window
  let fp=0,fpj=0,tot=0;
  for(let j=1;j<run.steps.length;j++){
    const s=run.steps[j];
    for(let r=0;r<4;r++){tot++;
      let any=false;for(let q=Math.max(0,j-win+1);q<=j;q++)if(isSlow(r,run.steps[q]))any=true;
      if(res.F[r][j]&&!any)fp++}
    let anyJ=false;for(let r=0;r<4;r++)for(let q=Math.max(0,j-win+1);q<=j;q++)if(isSlow(r,run.steps[q]))anyJ=true;
    if(res.J[j]&&!anyJ)fpj++;
  }
  return {rows,fp,fpj,tot};
}
const RULE_TXT={
  wait:'flags every rank whose time in the all-reduce exceeds the shortest wait of any rank by the threshold: the ranks that spent unusually long in the collective, which is what a ranking of collectives by duration shows.',
  comp:'flags the rank whose compute time is the largest, if it exceeds the other ranks\' median by the threshold.',
  rel:'gives each rank the score (fastest rank\'s compute) / (its compute) and flags scores below the cutoff: a comparison across ranks, NVIDIA Resiliency Extension\'s relative score (its default cutoff is 0.75, the slider at 25%).',
  ind:'gives each rank the score (its own median compute over steps 2 to 51) / (its compute now) and flags scores below the cutoff: a comparison with itself over time, like the Resiliency Extension\'s individual score (which uses the rank\'s best so far as the reference).',
  step:'compares the job\'s step time with its own median over steps 2 to 51; it can say the job got slower, never which rank.'};
function drawDet(){
  const rule=$('st-rule').value,stat=$('st-stat').value,win=+$('st-win').value,thr=+$('st-thr').value;
  $('st-win-v').textContent=win+(win===1?' step':' steps');
  $('st-thr-v').textContent=(rule==='rel'||rule==='ind')?'flag a score below '+(1-thr/100).toFixed(2):'flag above '+(1+thr/100).toFixed(2)+' times the reference';
  const res=flags(rule,stat,win,thr),run=R(),n=run.steps.length;
  const el=$('st-det'),w=RD.width(el),left=56,lane=22,top=8,H=top+5*lane*1.0+lane+18;
  const sx=(w-left-8)/n;let s='';
  const rowsY=r=>top+r*lane;
  for(let r=0;r<5;r++){
    s+=RD.t(4,rowsY(r)+14,r<4?'rank '+r:'job',{fs:11.5,w:600});
    s+='<rect x="'+left+'" y="'+(rowsY(r)+2)+'" width="'+(n*sx).toFixed(1)+'" height="'+(lane-6)+'" fill="var(--soft)" stroke="var(--line)"/>';
  }
  for(let j=0;j<n;j++){
    const x=(left+j*sx).toFixed(2),st=run.steps[j];
    for(let r=0;r<4;r++){
      if(isSlow(r,st))s+='<rect x="'+x+'" y="'+(rowsY(r)+2)+'" width="'+Math.max(sx,1).toFixed(2)+'" height="'+((lane-6)/2)+'" fill="var(--bad)"/>';
      if(res.F[r][j])s+='<rect x="'+x+'" y="'+(rowsY(r)+2+(lane-6)/2)+'" width="'+Math.max(sx,1).toFixed(2)+'" height="'+((lane-6)/2)+'" fill="var(--c4)"/>';
    }
    if(res.J[j])s+='<rect x="'+x+'" y="'+(rowsY(4)+2+(lane-6)/2)+'" width="'+Math.max(sx,1).toFixed(2)+'" height="'+((lane-6)/2)+'" fill="var(--c4)"/>';
  }
  [1,50,100,150,200,250,300].forEach(st=>{const x=left+(st-1)*sx;s+=RD.t(x,H-4,st,{fs:10.5,a:'middle',fill:'var(--mute)'})});
  el.innerHTML=RD.svg(w,H,s,'Planted slowness (top half of each lane) and the rule\'s flags (bottom half), steps 1 to '+n);
  const sc=score(res,win);
  let t='<div class="tw"><table class="ft-tbl"><thead><tr><th>Planted straggler</th><th>First flagged at step</th><th>Share of its steps flagged</th></tr></thead><tbody>';
  if(!sc.rows.length)t+='<tr><td colspan="3">None planted in this run: every flag below is a false alarm.</td></tr>';
  sc.rows.forEach(x=>{t+='<tr><td>rank '+x.p.rank+', '+E(x.p.what.split(':')[0])+' (steps '+x.p.first+' to '+x.p.last+(x.p.every>1?', every '+x.p.every+'th':'')+')</td><td class="'+(x.first===null?'bad':'ok')+'">'+(x.first===null?'never':(rule==='step'?'the job, at ':'')+x.first+' (after '+(x.first-x.p.first)+' steps)'+(rule==='step'?'; no rank named':''))+'</td><td>'+Math.round(100*x.share)+'%</td></tr>'});
  t+='</tbody></table></div>';
  $('st-det-tbl').innerHTML=t;
  $('st-det-cap').innerHTML='<b>The rule</b> '+RULE_TXT[rule]+' The statistic is the '+(stat==='med'?'median':'maximum')+' over the last '+win+' step'+(win>1?'s':'')+'. <b>False alarms</b> on this run: '+(rule==='step'?sc.fpj+' job-level flags at steps with no planted slowness in the window':sc.fp+' (rank, step) flags on a rank with no planted slowness in the window')+'.';
}
function initDet(){['st-rule','st-stat'].forEach(id=>$(id).addEventListener('change',drawDet));['st-win','st-thr'].forEach(id=>$(id).addEventListener('input',drawDet));drawDet()}
RD.seg($('st-run'),m=>{RUN=m;A.reset(R().steps.length-STEPS_SHOWN+1);A.go(m==='strag_none'?75:76);drawDet()});
let inited=false;
function render(){if(!inited){inited=true;initAnim();A.go(76);initDet()}else{A.redraw();drawDet()}}
(window.TAB_RENDER=window.TAB_RENDER||{})['t-str']=[render];
addEventListener('resize',()=>{const t=$('t-str');if(t&&!t.hidden&&inited){A.redraw();drawDet()}});
window.FTSTR={flags,score,setRun:m=>{RUN=m},isSlow};
})();
