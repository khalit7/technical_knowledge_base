// ---- Alert lab: the SRE workbook's six SLO alerting approaches on one timeline (twin of src/alertlab.py) ----
window.ALAB=(function(){
  const STEP=10,M=60,H=3600,DAY=86400,PERIOD=30*DAY,LEAD=3*DAY,HORIZON=7*DAY,N=HORIZON/STEP;
  const SCEN={
    outage:['Total outage, 20 min',[[0,20*M,1.0]]],
    deploy:['Bad deploy: 5% errors for 45 min, then rollback',[[0,45*M,0.05]]],
    flap:['Flapping: 100% errors 5 min in every 10, three times',[[0,5*M,1.0],[10*M,5*M,1.0],[20*M,5*M,1.0]]],
    spike15:['15% errors for 10 min (workbook figure 5-6)',[[0,10*M,0.15]]],
    steady35:['3.5% errors for 20 h (the workbook\'s 35x burn)',[[0,20*H,0.035]]],
    leak:['Slow leak: 0.5% errors for 2 days',[[0,2*DAY,0.005]]],
    blip:['Blip: 1% errors for 10 min',[[0,10*M,0.01]]]};
  const KEYS=Object.keys(SCEN);
  function series(key){const e=new Float64Array(N);SCEN[key][1].forEach(([o,d,r])=>{const a=(LEAD+o)/STEP;for(let i=a;i<a+d/STEP;i++)e[i]=r});return e}
  function span(key){return [LEAD,LEAD+Math.max(...SCEN[key][1].map(s=>s[0]+s[1]))]}
  function prefix(e){const p=new Float64Array(e.length+1);for(let i=0;i<e.length;i++)p[i+1]=p[i]+e[i];return p}
  const ratio=(p,i,w)=>{const k=w/STEP,a=Math.max(0,i+1-k);return (p[i+1]-p[a])/k};
  function rules(b){
    const R=ratio;
    return {
      A1:[['10m >= 1x','page',(p,i)=>R(p,i,10*M)>=b]],
      A2:[['36h > 1x','page',(p,i)=>R(p,i,36*H)>b]],
      A3:[['1m > 1x for 1h','page',null]],
      A4:[['1h > 36x','page',(p,i)=>R(p,i,H)>36*b]],
      A5:[['1h > 14.4x','page',(p,i)=>R(p,i,H)>14.4*b],['6h > 6x','page',(p,i)=>R(p,i,6*H)>6*b],['3d > 1x','ticket',(p,i)=>R(p,i,3*DAY)>b]],
      A6:[['1h & 5m > 14.4x','page',(p,i)=>R(p,i,H)>14.4*b&&R(p,i,5*M)>14.4*b],['6h & 30m > 6x','page',(p,i)=>R(p,i,6*H)>6*b&&R(p,i,30*M)>6*b],
          ['24h & 2h > 3x','ticket',(p,i)=>R(p,i,DAY)>3*b&&R(p,i,2*H)>3*b],['3d & 6h > 1x','ticket',(p,i)=>R(p,i,3*DAY)>b&&R(p,i,6*H)>b]]};
  }
  function run(key,slo){
    const b=1-slo,e=series(key),p=prefix(e),[t0,t1]=span(key),out={};
    for(const [ap,rs] of Object.entries(rules(b))){
      const fires=rs.map(([name,sev,f])=>{const v=new Uint8Array(N);
        if(!f){const need=H/STEP;let run=0;for(let i=0;i<N;i++){run=ratio(p,i,M)>b?run+1:0;v[i]=run>=need?1:0}}
        else for(let i=0;i<N;i++)v[i]=f(p,i)?1:0;
        return [name,sev,v]});
      const res={rules:fires.map(f=>[f[0],f[1]])};
      for(const sev of ['page','ticket']){
        const vs=fires.filter(f=>f[1]===sev).map(f=>f[2]);if(!vs.length)continue;
        const on=new Uint8Array(N);for(let i=0;i<N;i++)on[i]=vs.some(v=>v[i])?1:0;
        let first=-1,last=-1,edges=0;for(let i=0;i<N;i++){if(on[i]){if(first<0)first=i;last=i}}
        vs.forEach(v=>{for(let i=0;i<N;i++)if(v[i]&&(i===0||!v[i-1]))edges++});
        const r={fires:first>=0,on};
        if(first>=0)Object.assign(r,{detect_s:(first+1)*STEP-t0,spent_at_detect:(p[first+1]-p[t0/STEP])*STEP/(b*PERIOD),reset_s:(last+1)*STEP-t1,notifications:edges});
        res[sev]=r}
      out[ap]=res}
    return {budget_spent:p[N]*STEP/(b*PERIOD),alerts:out,e,t0,t1};
  }
  return {run,SCEN,KEYS,STEP,LEAD,N,M,H,DAY};
})();

(function(){
  const A=window.ALAB,$=id=>document.getElementById(id),esc=RD.esc;
  const fmt=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const dur=s=>s<90?fmt(s)+' s':s<90*60?fmt(s/60,s<600?1:0)+' min':s<48*3600?fmt(s/3600,1)+' h':fmt(s/86400,1)+' days';
  const SHORT={outage:'Outage, 20 min',deploy:'Bad deploy, 5%',flap:'Flapping',spike15:'15% for 10 min',steady35:'35x burn, 20 h',leak:'Slow leak, 0.5%',blip:'Blip, 1%'};
  const NAMES={A1:'1. Error ratio over 10 min',A2:'2. Over 36 h',A3:'3. Over 1 min, held 1 h',A4:'4. Burn rate 36 over 1 h',A5:'5. Multiple burn rates',A6:'6. Multiwindow, multi-burn-rate'};
  let scen='outage',slo=0.999,sig=0.05,view='near',cache={};
  const get=(k,s)=>{const id=k+'|'+s;return cache[id]||(cache[id]=A.run(k,s))};
  $('al-scen').innerHTML=A.KEYS.map(k=>'<button data-k="'+k+'"'+(k===scen?' class="on"':'')+'>'+esc(A.SCEN[k][0])+'</button>').join('');
  $('al-scen').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;scen=b.dataset.k;$('al-scen').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  $('al-slo').addEventListener('change',e=>{slo=+e.target.value;draw()});
  $('al-sig').addEventListener('change',e=>{sig=+e.target.value;draw()});
  RD.seg($('al-view'),m=>{view=m;drawChart()});
  let rsel='A6';
  $('al-rsel').innerHTML=Object.keys(NAMES).map(k=>'<button data-m="'+k+'"'+(k===rsel?' class="on"':'')+'>'+k.slice(1)+'</button>').join('');
  RD.seg($('al-rsel'),m=>{rsel=m;drawRule()});
  function drawChart(){
    const r=get(scen,slo),el=$('al-chart'),W=RD.width(el);
    const tA=view==='near'?r.t0-3600:r.t0-6*3600,tB=view==='near'?Math.min(r.t1+Math.max(2*3600,(r.t1-r.t0)*1.5),A.LEAD+4*A.DAY):A.LEAD+4*A.DAY;
    const L=Math.min(70,Math.max(52,W*0.12)),R=8,T=8,CH=110,LH=17,keys=Object.keys(NAMES),H=T+CH+16+keys.length*LH+22;
    const xs=t=>L+(W-L-R)*(t-tA)/(tB-tA);
    const ylo=-4.6,yhi=0,ys=v=>T+CH*(1-(Math.log10(Math.max(v,Math.pow(10,ylo)))-ylo)/(yhi-ylo));
    let b='';[1e-4,1e-3,1e-2,1e-1,1].forEach(v=>{b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="var(--line)"/>'+RD.t(L-4,ys(v)+4,(v*100)+'%',{a:'end',fs:10,fill:'var(--mute)'})});
    b+=RD.t(L-4,ys(0)+3,'0',{a:'end',fs:10,fill:'var(--mute)'});
    const bl=1-slo;b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+ys(bl)+'" y2="'+ys(bl)+'" stroke="var(--good)" stroke-dasharray="4 3"/>'+RD.t(W-R,ys(bl)-3,'budget line '+fmt(bl*100,2)+'%',{a:'end',fs:10,fill:'var(--good)'});
    // error ratio path (step-wise, sampled at most once per pixel)
    const i0=Math.floor(tA/A.STEP),i1=Math.ceil(tB/A.STEP);let d='',prev=null;const stride=Math.max(1,Math.floor((i1-i0)/(W*2)));
    for(let i=i0;i<i1;i+=stride){let v=0;for(let j=i;j<Math.min(i1,i+stride);j++)v=Math.max(v,r.e[j]);const x=xs(i*A.STEP).toFixed(1),y=ys(v).toFixed(1);d+=(d?'L':'M')+x+' '+(prev==null?y:prev)+'L'+x+' '+y;prev=y}
    b+='<path d="'+d+'" fill="none" stroke="var(--bad)" stroke-width="1.6"/>';
    keys.forEach((k,j)=>{const y=T+CH+16+j*LH;b+=RD.t(L-6,y+11,k.replace('A','Rule '),{a:'end',fs:10.5});
      b+='<rect x="'+L+'" y="'+(y+2)+'" width="'+(W-L-R)+'" height="'+(LH-4)+'" fill="var(--soft)"/>';
      ['ticket','page'].forEach(sev=>{const s=r.alerts[k][sev];if(!s||!s.fires)return;let st=-1;
        for(let i=i0;i<=i1;i++){const on=i<i1&&s.on[i];if(on&&st<0)st=i;if(!on&&st>=0){b+='<rect x="'+xs(st*A.STEP).toFixed(1)+'" y="'+(y+(sev==='page'?2:6))+'" width="'+Math.max(1.5,xs(i*A.STEP)-xs(st*A.STEP)).toFixed(1)+'" height="'+(sev==='page'?LH-4:LH-12)+'" fill="'+(sev==='page'?'var(--bad)':'var(--c5)')+'"/>';st=-1}}})});
    const span=tB-tA,step=span<=4*3600?1800:span<=12*3600?3600:span<=2*86400?6*3600:86400;
    for(let t=Math.ceil((tA-r.t0)/step)*step+r.t0;t<=tB;t+=step){const rel=t-r.t0;b+=RD.t(xs(t),H-6,(rel>=0?'+':'')+(Math.abs(rel)>=86400?fmt(rel/86400,1)+' d':fmt(rel/3600,1)+' h'),{a:'middle',fs:10,fill:'var(--mute)'})}
    b+='<line x1="'+xs(r.t0)+'" x2="'+xs(r.t0)+'" y1="'+T+'" y2="'+(H-20)+'" stroke="var(--ink)" stroke-dasharray="2 3"/>';
    el.innerHTML='<div class="leg"><span style="--sw:var(--bad)">error ratio; page</span><span style="--sw:var(--c5)">ticket</span><span style="--sw:var(--good)">1 &minus; SLO</span></div>'+RD.svg(W,H,b,'Incident timeline and alert lanes');
  }
  function drawTable(){
    const r=get(scen,slo);
    $('al-table').querySelector('tbody').innerHTML=Object.keys(NAMES).map(k=>{const a=r.alerts[k],p=a.page,t=a.ticket;
      return '<tr><td>'+NAMES[k]+'</td><td>'+(p.fires?dur(p.detect_s):'<span class="mute">never</span>')+'</td><td class="num">'+(p.fires?fmt(100*p.spent_at_detect,1)+'%':'')+'</td><td>'+(p.fires?(p.reset_s<=0?'when it ends':dur(p.reset_s)):'')+'</td><td>'+(t?(t.fires?'after '+dur(t.detect_s)+', stops '+dur(Math.max(0,t.reset_s))+' after':'<span class="mute">none</span>'):'<span class="mute">no ticket rule</span>')+'</td><td class="num">'+((p.fires?p.notifications:0)+(t&&t.fires?t.notifications:0))+'</td></tr>'}).join('');
    const sp=r.budget_spent;
    $('al-sum').innerHTML=RD.stat('This incident spends',fmt(100*sp,sp<0.1?2:1)+'%','of a 30-day error budget')+RD.stat('So it is',sp>=sig?'significant':'not significant','threshold '+fmt(100*sig)+'%')+
      RD.stat('Budget',fmt(100*(1-slo),2)+'% of requests','1 &minus; SLO')+RD.stat('Peak burn rate',fmt(Math.max(...A.SCEN[scen][1].map(s=>s[2]))/(1-slo),1)+'x','error ratio &divide; budget');
  }
  function drawMx(){
    const keys=Object.keys(NAMES),cnt={};keys.forEach(k=>cnt[k]={tp:0,fp:0,fn:0});
    let h='<thead><tr><th>Incident</th><th class="num">Spends</th>'+keys.map(k=>'<th class="num">'+k.replace('A','')+'</th>').join('')+'</tr></thead><tbody>';
    A.KEYS.forEach(s=>{const r=get(s,slo),signif=r.budget_spent>=sig;
      h+='<tr><td title="'+esc(A.SCEN[s][0])+'">'+SHORT[s]+'</td><td class="num">'+fmt(100*r.budget_spent,r.budget_spent<0.1?2:0)+'%'+(signif?' &#9679;':'')+'</td>'+keys.map(k=>{const p=r.alerts[k].page.fires;
        if(p&&signif)cnt[k].tp++;else if(p)cnt[k].fp++;else if(signif)cnt[k].fn++;
        const good=p===signif;return '<td class="num '+(good?'ok':'no')+'">'+(p?dur(r.alerts[k].page.detect_s):'no')+'</td>'}).join('')+'</tr>'});
    h+='<tr><td><b>Precision</b></td><td></td>'+keys.map(k=>{const c=cnt[k],n=c.tp+c.fp;return '<td class="num"><b>'+(n?fmt(100*c.tp/n)+'%':'n/a')+'</b></td>'}).join('')+'</tr>';
    h+='<tr><td><b>Recall</b></td><td></td>'+keys.map(k=>{const c=cnt[k],n=c.tp+c.fn;return '<td class="num"><b>'+(n?fmt(100*c.tp/n)+'%':'n/a')+'</b></td>'}).join('')+'</tr></tbody>';
    $('al-mx').innerHTML=h;
    window.ALAB_LAST={cnt};
  }
  function drawRule(){
    const b=(1-slo),f=v=>+(v*b).toPrecision(4),r='job:slo_errors_per_request:ratio_rate';
    const T={A1:'- alert: HighErrorRate\n  expr: '+r+'10m{job="chat-api"} >= '+f(1),
      A2:'- alert: HighErrorRate\n  expr: '+r+'36h{job="chat-api"} > '+f(1),
      A3:'- alert: HighErrorRate\n  expr: '+r+'1m{job="chat-api"} > '+f(1)+'\n  for: 1h',
      A4:'- alert: HighErrorRate\n  expr: '+r+'1h{job="chat-api"} > 36 * '+f(1)+'   # = '+f(36),
      A5:'# page\nexpr: '+r+'1h{job="chat-api"} > (14.4*'+f(1)+')\n   or '+r+'6h{job="chat-api"} > (6*'+f(1)+')\n# ticket\nexpr: '+r+'3d{job="chat-api"} > '+f(1),
      A6:'# page\nexpr: ('+r+'1h{job="chat-api"} > (14.4*'+f(1)+')\n       and '+r+'5m{job="chat-api"} > (14.4*'+f(1)+'))\n   or ('+r+'6h{job="chat-api"} > (6*'+f(1)+')\n       and '+r+'30m{job="chat-api"} > (6*'+f(1)+'))\n# ticket\nexpr: ('+r+'24h{job="chat-api"} > (3*'+f(1)+')\n       and '+r+'2h{job="chat-api"} > (3*'+f(1)+'))\n   or ('+r+'3d{job="chat-api"} > '+f(1)+'\n       and '+r+'6h{job="chat-api"} > '+f(1)+')'};
    $('al-rule').textContent=T[rsel]+'\n\n# each '+r+'<window> is a recording rule:\n#   sum(rate(http_requests_total{status=~"5.."}[<window>])) / sum(rate(http_requests_total[<window>]))';
  }
  function repro(){
    const o=get('outage',0.999).alerts,f=get('flap',0.999),s=get('steady35',0.999);
    $('al-repro').innerHTML='<b>Defaults reproduce the workbook</b> (by construction: same rules, same arithmetic) at 99.9%: rule 2 pages a total outage after '+dur(o.A2.page.detect_s)+' (workbook: "2 minutes and 10 seconds"); rule 4 after '+dur(o.A4.page.detect_s)+' and resets '+dur(o.A4.page.reset_s)+' after the outage ends (workbook: "58 minutes"); rule 5 after '+dur(o.A5.page.detect_s)+' (formula: 51.8 s); rule 1\'s workbook figure of 0.6 s shows here as '+dur(o.A1.page.detect_s)+' because the lab steps in 10 seconds. Flapping spends '+fmt(100*f.budget_spent,1)+'% and rule 3 '+(f.alerts.A3.page.fires?'pages':'never pages')+' (workbook: "35%", never); the 35x burn spends '+fmt(100*s.budget_spent)+'% in 20 h and rule 4 '+(s.alerts.A4.page.fires?'pages':'never pages')+' (workbook: all of it "in 20.5 hours", never alerts).';
  }
  function draw(){drawChart();drawTable();drawMx();drawRule()}
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-alab']=[()=>{draw();repro()}];
  addEventListener('resize',()=>{const t=$('t-alab');if(t&&!t.hidden)drawChart()});
})();
