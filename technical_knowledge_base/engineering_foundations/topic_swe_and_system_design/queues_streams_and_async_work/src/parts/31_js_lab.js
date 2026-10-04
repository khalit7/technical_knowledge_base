// ---- Queue lab tab: controls, presets and charts over QSIM.run (22_js_qsim.js) ----
(function(){
  const host=document.getElementById('lab-ctl');if(!host||!window.QSIM)return;
  const base={mode:'rate',lam:20,N:1000,T:120,C:4,S:0.15,dist:'exp',V:30,pc:0,Rs:1,idem:false,M:0,pp:0,B:0,burst:false,seed:1};
  const L=window.LABDATA;
  const meanOf=(name,k)=>{if(!L)return null;const rs=L.redelivery.filter(r=>r.name===name);return rs.map(r=>r[k])};
  const P=[
    ['Healthy',{},'Utilisation 75%: 20 messages a second, 4 workers, 0.15 s each. The queue stays short and drains.'],
    ['Overloaded',{lam:30},'Utilisation 113%: the backlog grows by about 3.3 messages a second while arrivals last, and the oldest message ages without limit.'],
    ['Burst, then drain',{burst:true},'Three times the traffic between T/4 and T/2 (utilisation 225% during the burst). Watch how long the drain takes after the burst ends: only the 25% spare capacity drains it.'],
    ['Bounded queue',{lam:30,B:200},'Overloaded, but the queue refuses arrivals beyond 200 messages: some producers are told "not now" (429), and everyone admitted waits at most about 8 s.'],
    ['Crashes, naive',{pc:0.05},'5% of deliveries crash after the side effect. Each crash is a redelivery and a duplicate; each crash also idles a worker for the 1 s restart, which pushes utilisation to about 100%.'],
    ['Crashes, idempotent',{pc:0.05,idem:true},'Same crashes; the consumer records message ids, so every repeat is caught and the duplicate count is zero.'],
    ['Timeout too short',{V:0.3},'No crashes, but a 0.3 s visibility timeout with 0.15 s average jobs: about 13% of jobs outlive their lease and run twice.'],
    ['Poison, no DLQ',{pp:0.02,V:5},'2% of messages always fail. Without a dead-letter queue they return every 5 s forever, piling up.'],
    ['Poison, DLQ after 5',{pp:0.02,V:5,M:5},'Same poison, maxReceiveCount 5: each poison message is tried 5 times, then parked for a human.'],
    ['Lab run: 5% crashes',{mode:'backlog',N:1000,T:30,C:4,S:0.01,dist:'fixed',V:2,pc:0.05,Rs:0.5},'The measured Postgres run: 1,000 jobs, 4 workers, 2 s visibility timeout, 5% crash chance after the e-mail. Measured duplicates: '+(meanOf('at-least-once, 5% crashes','duplicates')||[]).join(', ')+' (mean 50.3); expected 1,000 x 0.05/0.95 = 52.6; this model over 20 seeds: mean 53.0, range 38 to 76.'],
    ['Lab run: timeout 0.3 s',{mode:'backlog',N:600,T:40,C:4,S:0.1,dist:'exp',V:0.3},'The measured run with no crashes: 600 jobs, exponential work with mean 0.1 s, 0.3 s timeout. Measured duplicates: '+(meanOf('at-least-once, no crashes, visibility timeout 0.3 s, work exponential mean 0.1 s','duplicates')||[]).join(', ')+' (mean 22.3); this model over 20 seeds: mean 21.5, range 15 to 28.']];
  let cur=Object.assign({},base);
  const defs=[
    ['mode','Producer','sel',[['rate','Steady arrivals'],['backlog','Backlog at time 0']]],
    ['lam','Arrival rate &lambda; (per s)','rng',1,100,1],['N','Backlog size N','rng',100,5000,100],['T','Duration T (s)','rng',20,300,10],
    ['C','Workers C','rng',1,32,1],['S','Mean work time S (s)','rng',0.01,2,0.01],['dist','Work time','sel',[['exp','Exponential'],['fixed','Fixed']]],
    ['V','Visibility timeout V (s)','rng',0.1,60,0.1],['pc','Crash chance per delivery','rng',0,0.2,0.01],['Rs','Restart time (s)','rng',0.1,10,0.1],
    ['pp','Poison fraction','rng',0,0.1,0.005],['M','Max receives before DLQ (0 = no DLQ)','rng',0,10,1],['B','Queue bound (0 = unbounded)','rng',0,2000,50],['seed','Seed','rng',1,20,1]];
  let h='<div class="ctl">';
  defs.forEach(d=>{const id='lab-'+d[0];
    if(d[2]==='sel')h+='<label>'+d[1]+'<br><select id="'+id+'">'+d[3].map(o=>'<option value="'+o[0]+'">'+o[1]+'</option>').join('')+'</select></label>';
    else h+='<label>'+d[1]+': <b id="'+id+'-v"></b><input type="range" id="'+id+'" min="'+d[3]+'" max="'+d[4]+'" step="'+d[5]+'"></label>'});
  h+='</div><div class="tog"><label><input type="checkbox" id="lab-burst"> 3x burst from T/4 to T/2</label><label><input type="checkbox" id="lab-idem"> Idempotent consumer</label></div>';
  host.innerHTML=h;
  const el=k=>document.getElementById('lab-'+k);
  const show=(k,v)=>{const e=document.getElementById('lab-'+k+'-v');if(e)e.textContent=k==='pc'||k==='pp'?(v*100).toFixed(1)+'%':(k==='M'&&+v===0?'off':(k==='B'&&+v===0?'off':v))};
  function syncUI(){defs.forEach(d=>{const e=el(d[0]);e.value=cur[d[0]];show(d[0],cur[d[0]])});el('burst').checked=cur.burst;el('idem').checked=cur.idem;
    el('lam').closest('label').style.opacity=cur.mode==='rate'?1:.45;el('N').closest('label').style.opacity=cur.mode==='backlog'?1:.45}
  defs.forEach(d=>el(d[0]).addEventListener('input',e=>{cur[d[0]]=d[2]==='sel'?e.target.value:+e.target.value;show(d[0],cur[d[0]]);mark(-1);syncUI();run()}));
  ['burst','idem'].forEach(k=>el(k).addEventListener('change',e=>{cur[k]=e.target.checked;mark(-1);run()}));
  const pre=document.getElementById('lab-pre'),note=document.getElementById('lab-pre-note');
  pre.innerHTML=P.map((p,i)=>'<button data-i="'+i+'">'+p[0]+'</button>').join('');
  function mark(i){[...pre.children].forEach((b,k)=>b.classList.toggle('on',k===i));note.textContent=i>=0?P[i][2]:'Custom settings.'}
  pre.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const i=+b.dataset.i;cur=Object.assign({},base,P[i][1]);mark(i);syncUI();run()});
  const out=document.getElementById('lab-out'),svg=document.getElementById('lab-svg'),lit=document.getElementById('lab-little');
  let last=null;
  function run(){last=QSIM.run(cur);draw()}
  function f1(v,d){return (Math.round(v*Math.pow(10,d))/Math.pow(10,d)).toLocaleString('en-US')}
  function draw(){if(!last)return;const s=last.st,sm=last.samples;
    const rho=cur.mode==='rate'?cur.lam*cur.S/cur.C:null;
    out.innerHTML=RD.stat('Utilisation &rho; = &lambda;S/C',rho===null?'n/a':f1(rho*100,0)+'%',rho===null?'backlog mode':(rho>=1?'over capacity':'below capacity'))+
      RD.stat('Completed',f1(s.completed,0),'of '+f1(s.admitted,0)+' admitted; '+f1(s.left,0)+' left at the end')+
      RD.stat('Rejected (429)',f1(s.rejected,0),cur.B>0?'queue bound '+cur.B:'no bound')+
      RD.stat('Redeliveries',f1(s.redeliveries,0),f1(s.crashes,0)+' crashes')+
      RD.stat('Duplicate side effects',f1(s.duplicates,0),cur.idem?f1(s.dedup,0)+' repeats caught':'no deduplication')+
      RD.stat('Dead-lettered',f1(s.dlq,0),cur.M>0?'after '+cur.M+' receives':'no DLQ')+
      RD.stat('Wait, p50 / p99',f1(s.p50,2)+' / '+f1(s.p99,2)+' s','arrival to acknowledgement')+
      RD.stat('Oldest message, max age',f1(s.maxAge,1)+' s','the number to alert on');
    const W=Math.max(300,Math.min(860,RD.width(svg)));const x0=44,x1=W-8,H=sm.length?sm[sm.length-1].t:1;const X=t=>x0+(x1-x0)*t/Math.max(1,H);
    let b='';const panels=[['Messages in the queue (waiting + in flight)',sm.map(r=>r.depth),'var(--c4)'],['Age of the oldest message (s)',sm.map(r=>r.age),'var(--c2)'],
      ['Completions per second',sm.map((r,i)=>i?r.completed-sm[i-1].completed:0),'var(--c3)']];
    let y=0;panels.forEach(p=>{const vals=p[1],mx=Math.max(1,...vals),ph=78;y+=16;b+=RD.t(0,y-4,p[0],{fs:11,fill:'var(--mute)'});
      b+='<line x1="'+x0+'" x2="'+x1+'" y1="'+(y+ph)+'" y2="'+(y+ph)+'" stroke="var(--line)"/>'+RD.t(x0-4,y+8,f1(mx,mx<10?1:0),{fs:9.5,a:'end'})+RD.t(x0-4,y+ph,'0',{fs:9.5,a:'end'});
      if(cur.mode==='rate'&&cur.burst)b+='<rect x="'+X(cur.T/4)+'" y="'+y+'" width="'+(X(cur.T/2)-X(cur.T/4))+'" height="'+ph+'" fill="var(--bad)" opacity=".08"/>';
      if(cur.mode==='rate')b+='<line x1="'+X(cur.T)+'" x2="'+X(cur.T)+'" y1="'+y+'" y2="'+(y+ph)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
      b+='<polyline fill="none" stroke="'+p[2]+'" stroke-width="1.6" points="'+sm.map((r,i)=>X(r.t).toFixed(1)+','+(y+ph-ph*vals[i]/mx).toFixed(1)).join(' ')+'"/>';y+=ph+10});
    b+=RD.t(x0,y+8,'0 s',{fs:9.5})+RD.t(x1,y+8,f1(H,0)+' s',{fs:9.5,a:'end'})+(cur.mode==='rate'?RD.t(X(cur.T),y+8,'arrivals stop',{fs:9.5,a:'middle',fill:'var(--mute)'}):'');
    svg.innerHTML=RD.svg(W,y+12,b,'Queue depth, oldest age and completions over time');
    lit.innerHTML='Little\'s law: time-average messages in the system L = '+f1(s.L,2)+'; completions per second X = '+f1(s.X,2)+' times mean time in system W = '+f1(s.Wmean,2)+' s gives XW = '+f1(s.X*s.Wmean,2)+
      (s.left===0&&s.dlq===0?' (equal, as the law says, because the queue ended empty).':' (they differ because '+(s.left?f1(s.left,0)+' messages were still in the queue at the end':'dead-lettered messages spent time in the queue without completing')+': the law needs a system that empties).')}
  const reg=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(f)};
  reg(draw);addEventListener('resize',()=>{const t=document.getElementById('t-lab');if(t&&!t.hidden)draw()});
  mark(0);syncUI();run();
})();
