// ---- Error budget and alerts tab. SLOC.run is mirrored in src/recompute.py (slo_run) ----
window.SLOC=(function(){
  const RPD=[1e4,1e5,1e6,3e6,1e7,1e8];
  const ER=[0.001,0.002,0.003,0.005,0.0075,0.01,0.015,0.02,0.03,0.05,0.075,0.1,0.15,0.2,0.3,0.4,0.5,0.6,0.75,0.9,1.0];
  const DUR=[1,2,3,5,10,15,20,30,45,60,120,180,360,720,1440,2880,5760];
  // SRE workbook ch. 5, Table 5-8 (99.9% SLO starting point)
  const AL=[{n:'Page: 14.4x over 1 h and 5 min',B:14.4,L:60,S:5,page:1},{n:'Page: 6x over 6 h and 30 min',B:6,L:360,S:30,page:1},{n:'Ticket: 1x over 3 days and 6 h',B:1,L:4320,S:360,page:0}];
  const DAYS=28,M=DAYS*1440,START=14*1440;
  function run(slo,rpd,e0,e,d){
    const rpm=rpd/1440,bud=(1-slo)*rpd*DAYS;
    const er=new Float64Array(M);for(let t=0;t<M;t++)er[t]=(t>=START&&t<START+d)?e:e0;
    const pre=new Float64Array(M+1);for(let t=0;t<M;t++)pre[t+1]=pre[t]+er[t];
    const avg=(t,w)=>{const a=Math.max(0,t+1-w);return (pre[t+1]-pre[a])/(t+1-a)};
    const alerts=AL.map(a=>{const th=a.B*(1-slo);let fire=null,reset=null;
      for(let t=START;t<M;t++){const on=avg(t,a.L)>=th-1e-12&&avg(t,a.S)>=th-1e-12;
        if(fire===null){if(on)fire=t-START+1}else if(!on){reset=t-START+1;break}}
      // fire/reset in minutes after the incident began (end of that minute)
      return {fire:fire,reset:reset}});
    const spentInc=Math.min(d,M-START)*e*rpm,spentAll=pre[M]*rpm;
    const formula=e>0?(1-slo)/e*60*14.4:null;
    return {budget:bud,budgetMin:(1-slo)*DAYS*1440,burn:e/(1-slo),burn0:e0/(1-slo),spentInc:spentInc,incShare:spentInc/bud,spentAll:spentAll,left:bud-spentAll,alerts:alerts,formula14:formula,curveStep:60,
      curve:Array.from({length:DAYS*24+1},(_,h)=>bud-pre[Math.min(M,h*60)]*rpm)}}
  return {run:run,RPD:RPD,ER:ER,DUR:DUR,AL:AL,START:START};
})();
(function(){
  const root=document.getElementById('t-slo');if(!root)return;const $=id=>document.getElementById(id);
  const PRE=[['Spike: 10% for 5 min',11,3],['Full outage: 30 min',20,7],['Partial: 5% for 3 h',9,11],['Slow leak: 0.2% for 4 days',1,16]];
  $('slo-pre').innerHTML=PRE.map((p,i)=>'<button data-i="'+i+'">'+p[0]+'</button>').join('');
  const fm=n=>n>=1e6?(n/1e6).toFixed(n>=1e7?0:1)+'M':n>=1e3?Math.round(n/1e3)+'k':String(Math.round(n));
  const fd=m=>m===null?'never':m<60?m+' min':m<1440?(m/60).toFixed(m%60?1:0)+' h':(m/1440).toFixed(1)+' days';
  const fp=v=>{const p=v*100;return (p>=1?p.toFixed(p%1?1:0):p>=0.1?p.toFixed(2).replace(/0$/,''):p.toFixed(3).replace(/0+$/,''))+'%'};
  let R=null;
  function get(){return {slo:+$('slo-slo').value,rpd:SLOC.RPD[+$('slo-rpd').value],e0:+$('slo-e0').value/10000,e:SLOC.ER[+$('slo-e').value],d:SLOC.DUR[+$('slo-d').value]}}
  function run(){const p=get();$('slo-v-slo').textContent='';$('slo-v-rpd').textContent=fm(p.rpd);$('slo-v-e0').textContent=fp(p.e0);$('slo-v-e').textContent=fp(p.e);$('slo-v-d').textContent=fd(p.d);
    R=SLOC.run(p.slo,p.rpd,p.e0,p.e,p.d);R.p=p;
    const a=R.alerts;const pg=[0,1].map(i=>a[i].fire).filter(x=>x!==null);const firstPage=pg.length?Math.min(...pg):null;
    $('slo-out').innerHTML=RD.stat('Budget, 28 days',fm(R.budget)+' failed messages','= '+fd(Math.round(R.budgetMin))+' of full outage')+RD.stat('Incident burn rate',R.burn.toFixed(R.burn<10?1:0)+'x','normal traffic burns '+R.burn0.toFixed(2)+'x')+
      RD.stat('Incident spends',(R.incShare*100).toFixed(1)+'% of budget',fm(R.spentInc)+' failed messages')+RD.stat('First page',fd(firstPage),firstPage===null?'no page alert fired':'after the incident began')+RD.stat('Ticket',fd(a[2].fire),'')+RD.stat('Budget left at day 28',R.left>=0?(R.left/R.budget*100).toFixed(0)+'%':'overspent','including normal errors');
    draw()}
  function draw(){if(!R||root.hidden)return;const p=R.p;const W=Math.max(300,Math.min(860,RD.width($('slo-c1'))));
    // chart 1: error ratio (log) and alert strips
    const span=Math.max(120,Math.min(10080,Math.max(p.d*1.6,...R.alerts.map(a=>(a.reset||a.fire||0)*1.1))));
    const t0=-span*0.08,x0=48,x1=W-6,X=t=>x0+(x1-x0)*(t-t0)/(span-t0);
    const lo=Math.log10(1e-5),hi=0,top=10,h=130,Y=v=>top+h*(1-(Math.log10(Math.max(v,1e-5))-lo)/(hi-lo));let b='';
    [1e-4,1e-3,1e-2,1e-1,1].forEach(v=>{b+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(x0-4,Y(v)+3,fp(v),{fs:9.5,a:'end',fill:'var(--mute)'})});
    SLOC.AL.forEach((a,i)=>{const th=a.B*(1-p.slo);if(th<=1)b+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(th)+'" y2="'+Y(th)+'" stroke="'+['var(--bad)','var(--c2)','var(--c5)'][i]+'" stroke-dasharray="4 3"/>'+RD.t(x1-[0,34,0][i],Y(th)+(i===1?11:-3),a.B+'x',{fs:9.5,a:'end',fill:['var(--bad)','var(--c2)','var(--c5)'][i]})});
    const ed=Math.min(p.d,span);b+='<path d="M'+X(t0)+' '+Y(p.e0)+'L'+X(0)+' '+Y(p.e0)+'L'+X(0)+' '+Y(p.e)+'L'+X(ed)+' '+Y(p.e)+(p.d<span?'L'+X(p.d)+' '+Y(p.e0)+'L'+X(span)+' '+Y(p.e0):'')+'" fill="none" stroke="var(--ink)" stroke-width="2"/>';
    SLOC.AL.forEach((a,i)=>{const y=top+h+26+i*28,al=R.alerts[i];
      b+='<rect x="'+x0+'" y="'+y+'" width="'+(x1-x0)+'" height="11" fill="var(--soft)"/>';
      if(al.fire!==null&&al.fire<=span){const xe=al.reset===null?x1:X(Math.min(span,al.reset));b+='<rect x="'+X(al.fire)+'" y="'+y+'" width="'+Math.max(2,xe-X(al.fire))+'" height="11" fill="'+['var(--bad)','var(--c2)','var(--c5)'][i]+'"/>'}
      b+=RD.t(x0,y-3,a.n+(al.fire===null?': does not fire':': fires at '+fd(al.fire)+(al.reset?', clears at '+fd(al.reset):'')),{fs:9.5})});
    const yb=top+h+26+3*28+4;[0,span/4,span/2,3*span/4,span].forEach((t,i)=>{b+=RD.t(X(t),yb,fd(Math.round(t)),{fs:9.5,a:i===4?'end':'middle',fill:'var(--mute)'})});
    $('slo-c1').innerHTML=RD.svg(W,yb+4,b,'Error ratio before, during and after the incident, with alert thresholds and when each alert fires');
    $('slo-l1').innerHTML='<span style="--sw:var(--ink)">error ratio (log scale)</span><span style="--sw:var(--bad)">14.4x page</span><span style="--sw:var(--c2)">6x page</span><span style="--sw:var(--c5)">1x ticket</span>'+(R.formula14!==null&&R.alerts[0].fire!==null?'<span style="--sw:transparent">Workbook formula for the 14.4x page: '+R.formula14.toFixed(1)+' min; simulated: '+R.alerts[0].fire+' min (the difference is the normal errors already in the window, and whole-minute steps)</span>':'');
    // chart 2: budget left
    const c=R.curve,n=c.length,X2=i=>x0+(x1-x0)*i/(n-1),mx=R.budget,mn=Math.min(0,...c),h2=110,Y2=v=>10+h2*(mx-v)/(mx-mn);let b2='';
    b2+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y2(0)+'" y2="'+Y2(0)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'+RD.t(x0-4,Y2(mx)+4,'100%',{fs:9.5,a:'end'})+RD.t(x0-4,Y2(0)+3,'0',{fs:9.5,a:'end'});
    let d2='';c.forEach((v,i)=>d2+=(i?'L':'M')+X2(i).toFixed(1)+' '+Y2(v).toFixed(1));b2+='<path d="'+d2+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    [0,7,14,21,28].forEach(dd=>b2+=RD.t(X2(dd*24),10+h2+14,'day '+dd,{fs:9.5,a:dd===28?'end':dd===0?'start':'middle',fill:'var(--mute)'}));
    $('slo-c2').innerHTML=RD.svg(W,10+h2+18,b2,'Error budget left over the 28-day window')}
  ['slo-slo','slo-rpd','slo-e0','slo-e','slo-d'].forEach(id=>$(id).addEventListener('input',run));
  $('slo-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=PRE[+b.dataset.i];$('slo-e').value=p[1];$('slo-d').value=p[2];
    $('slo-pre').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));run()});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-slo']=[draw];
  let tm=0;addEventListener('resize',()=>{if(!root.hidden){clearTimeout(tm);tm=setTimeout(draw,80)}});
  run();
})();
