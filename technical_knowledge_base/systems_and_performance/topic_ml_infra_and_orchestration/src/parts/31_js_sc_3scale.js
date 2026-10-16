// ---- Scheduling lab, section 2: the same three policies on a bigger, synthetic workload (simulated) ----
(function(){
  const $=SC.$;if(!$('sc-sc-card'))return;
  const POL=[['fifo','FIFO','var(--c2)'],['easy','EASY backfill','var(--c1)'],['conservative','Conservative backfill','var(--c3)']];
  let seed=7,view='conservative';
  function occupancy(jobs,sched,cap){const ev=[];jobs.forEach(j=>{const s=sched[j.name];ev.push([s[0],j.size],[s[1],-j.size])});
    ev.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const pts=[];let u=0;ev.forEach(([t,d])=>{u+=d;pts.push([t,u])});return pts}
  function utilOver(pts,t1,cap){let a=0,prevT=0,prevU=0;for(const [t,u] of pts){const tt=Math.min(t,t1);if(tt>prevT)a+=prevU*(tt-prevT);prevT=Math.max(prevT,tt);prevU=u;if(t>=t1)break}
    if(prevT<t1)a+=prevU*(t1-prevT);return a/(cap*t1)}
  function q(arr,p){const s=arr.slice().sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(p*s.length))]}
  function compute(){
    const cap=2**(+$('sc-sc-cap').value),load=+$('sc-sc-load').value,pad=+$('sc-sc-pad').value;
    $('sc-sc-cap-o').textContent=cap;$('sc-sc-load-o').textContent=load.toFixed(2);$('sc-sc-pad-o').textContent=pad.toFixed(1)+'x';
    const jobs=SC_SIM.genWorkload(cap,300,load,pad,seed);const t1=Math.max(...jobs.map(j=>j.submit));
    const res={};POL.forEach(([p])=>{const r=SC_SIM.simulate(jobs,cap,p);const w=jobs.map(j=>r.sched[j.name][0]-j.submit);
      const big=jobs.filter(j=>j.size>=cap/8).map(j=>r.sched[j.name][0]-j.submit);
      const pts=occupancy(jobs,r.sched,cap);res[p]={r,pts,mw:w.reduce((a,b)=>a+b,0)/w.length,p90:q(w,0.9),bigw:big.length?big.reduce((a,b)=>a+b,0)/big.length:NaN,util:utilOver(pts,t1,cap)}});
    return {cap,jobs,t1,res};
  }
  function draw(){
    const R=compute(),cap=R.cap;const h=x=>SC.fmt(x/60,1)+' h';
    let s='<div class="tw"><table><thead><tr><th>Policy</th><th class="num">mean wait</th><th class="num">90th pct wait</th><th class="num">mean wait, jobs &ge; '+(cap/8)+' GPUs</th><th class="num">utilisation while jobs arrive</th></tr></thead><tbody>';
    POL.forEach(([p,nm,c])=>{const x=R.res[p];s+='<tr'+(p===view?' style="font-weight:600"':'')+'><td><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+c+';margin-right:5px"></i>'+nm+'</td><td class="num">'+h(x.mw)+'</td><td class="num">'+h(x.p90)+'</td><td class="num">'+h(x.bigw)+'</td><td class="num">'+Math.round(100*x.util)+'%</td></tr>'});
    s+='</tbody></table></div>';$('sc-sc-tab').innerHTML=s;
    // busy GPUs over time for the viewed policy, FIFO behind it in grey
    const box=$('sc-sc-svg'),W=SC.width(box),H=170,L=40,Rm=8,top=8,bot=26;
    const T=Math.max(...POL.map(([p])=>R.res[p].pts[R.res[p].pts.length-1][0]));
    const x=t=>L+(W-L-Rm)*t/T,y=u=>top+(H-top-bot)*(1-u/cap);
    const path=pts=>{let d='M'+x(0)+','+y(0),u=0;pts.forEach(([t,v])=>{d+='L'+x(t).toFixed(1)+','+y(u).toFixed(1)+'L'+x(t).toFixed(1)+','+y(v).toFixed(1);u=v});return d};
    let b='';[0,cap/2,cap].forEach(u=>{b+='<line x1="'+L+'" x2="'+(W-Rm)+'" y1="'+y(u)+'" y2="'+y(u)+'" stroke="var(--line)"/>'+SC.t(L-4,y(u)+3,u,{a:'end',fs:10,fill:'var(--mute)'})});
    for(let d=0;d<=T/1440;d++){b+=SC.t(x(d*1440),H-bot+13,d+'d',{a:'middle',fs:10,fill:'var(--mute)'})}
    b+='<line x1="'+x(R.t1)+'" x2="'+x(R.t1)+'" y1="'+top+'" y2="'+(H-bot)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>'+SC.t(x(R.t1)-3,top+10,'last submit',{a:'end',fs:10,fill:'var(--mute)'});
    if(view!=='fifo')b+='<path d="'+path(R.res.fifo.pts)+'" fill="none" stroke="var(--c2)" stroke-width="1" opacity=".6"/>';
    const c=POL.find(p=>p[0]===view)[2];b+='<path d="'+path(R.res[view].pts)+'" fill="none" stroke="'+c+'" stroke-width="1.4"/>';
    b+=SC.t(L+2,H-4,'busy GPUs over time (days)',{fs:10,fill:'var(--mute)'});
    box.innerHTML=SC.svg(W,H,b,'Busy GPUs over time under '+view);
    $('sc-sc-note').innerHTML='Workload: 300 jobs, '+R.jobs.reduce((a,j)=>a+j.size,0).toLocaleString('en-US')+' GPUs requested in all, the largest '+Math.max(...R.jobs.map(j=>j.size))+' GPUs, runtimes '+Math.min(...R.jobs.map(j=>j.run))+' to '+Math.max(...R.jobs.map(j=>j.run))+' minutes, seed '+seed+'.';
  }
  ['sc-sc-cap','sc-sc-load','sc-sc-pad'].forEach(id=>$(id).addEventListener('input',draw));
  SC.seg($('sc-sc-view'),m=>{view=m;draw()});
  $('sc-sc-seed').addEventListener('click',()=>{seed=seed%997+1;draw()});
  $('sc-sc-reset').addEventListener('click',()=>{seed=7;['sc-sc-cap','sc-sc-load','sc-sc-pad'].forEach(id=>{$(id).value=$(id).defaultValue});draw()});
  SC.onRender(draw);draw();
})();
