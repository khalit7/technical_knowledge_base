// ---- The figures tab: decoded figures, Tables 2 and 3, the checks ----
(function(){
const P=window.PAPER,RC=P.rc,F=window.FIGS,CHK={};RC.checks.forEach(c=>CHK[c.id]=c);
const AXU=P.meta.ax+'#';
const C1='var(--c1)',C2='var(--c2)',C3='var(--c3)',C5='var(--c5)',C4='var(--c4)',GR='var(--mute)';
const note=ids=>ids.map(id=>{const c=CHK[id];return '<div style="margin:3px 0"><b class="v-'+c.verdict+'">'+c.verdict+'</b>: '+c.claim+'. <span class="mute">Paper: '+c.paper+'. Decoded: '+c.ours+'.'+(c.note?' '+c.note+'.':'')+'</span></div>'}).join('');
const cdfY=[[0,'0'],[.2,'0.2'],[.4,'0.4'],[.6,'0.6'],[.8,'0.8'],[1,'1']];
const chart=(el,cfg)=>{const d=document.createElement('div');el.appendChild(d);fit(d,w=>{d.innerHTML=plotLeg(cfg.series)+plotSvg(w,cfg)})};
const pick=(o,k)=>o[k];
const FIG={
 f2:{t:'Figure 2: sandboxes created per task (one week)',at:'S4.F2',draw(el){chart(el,{xlog:true,xr:[30,40000],yr:[0,1],xt:logTicks(30,40000),yt:cdfY,xl:'sandboxes per task (log)',yl:'CDF',
   series:[{n:'Container',c:C2,pts:F.fig2.Container},{n:'microVM',c:C1,pts:F.fig2.microVM}],hl:[{y:.5,t:'p50'},{y:.9,t:'p90'}]})},chk:['fig2']},
 f3:{t:'Figure 3: one representative sandbox, setup, tool calls, test',at:'S4.F3',draw(el){const ph=F.fig3_phases;chart(el,{xr:[0,800],yr:[0,1.6],y2:{yr:[0,2],yt:[[0,'0'],[.5,'0.5'],[1,'1.0'],[1.5,'1.5'],[2,'2.0']],yl:'memory (GB)'},
   xt:[0,200,400,600,800].map(v=>[v,v+'']),yt:[[0,'0'],[.4,'0.4'],[.8,'0.8'],[1.2,'1.2'],[1.6,'1.6']],xl:'time (s)',yl:'CPU (cores)',
   bands:[{x0:ph.setup[0],x1:ph.setup[1],t:'setup'},{x0:ph.tool_call[0],x1:ph.tool_call[1],t:'tool calls',c:'var(--bg)'},{x0:ph.test[0],x1:ph.test[1],t:'test'}],
   series:[{n:'Container CPU',c:C2,pts:F.fig3.Container.cpu},{n:'Container memory',c:C2,da:'5 3',ax:2,pts:F.fig3.Container.mem},{n:'microVM CPU',c:C1,pts:F.fig3.microVM.cpu},{n:'microVM memory',c:C1,da:'5 3',ax:2,pts:F.fig3.microVM.mem}]})},
   txt:'CPU comes in short bursts after setup while memory stays up: the shape behind overcommit and memory reclamation. A single illustrative trace; the paper calls it representative.'},
 f5:{t:'Figure 5: used ÷ requested CPU and memory, average and peak (one week)',at:'S4.F5',draw(el){const S=F.fig5,ser=[];
   [['Container CPU',C2],['Container mem',C5],['microVM CPU',C1],['microVM mem',C3]].forEach(([n,c])=>{ser.push({n:n+' avg',c,pts:S[n+' avg']});ser.push({n:n+' peak',c,da:'5 3',pts:S[n+' peak']})});
   chart(el,{H:240,xr:[0,10],yr:[0,1],xt:[0,2,4,6,8,10].map(v=>[v,v+'%']),yt:cdfY,xl:'used ÷ requested, 0 to 10% (zoom)',yl:'CDF',series:ser.map(s=>Object.assign({},s,{pts:s.pts.filter(p=>p[0]<=10.01)})),vl:[{x:5,t:'5%'}]});
   chart(el,{H:240,xr:[0,100],yr:[0,1],xt:[0,20,40,60,80,100].map(v=>[v,v+'%']),yt:cdfY,xl:'used ÷ requested, full range',yl:'CDF',series:ser.map(s=>Object.assign({},s,{noleg:true}))})},chk:['fig5'],
   txt:'The original splits its x axis at 10%; here the two halves are separate charts.'},
 f6:{t:'Figure 6: live sandboxes on one node over a day',at:'S4.F6',draw(el){chart(el,{xr:[0,24],yr:[0,1100],xt:[0,3,6,9,12,15,18,21,24].map(v=>[v,v+'h']),yt:[0,200,400,600,800,1000].map(v=>[v,fmt(v)]),xl:'time (h)',yl:'sandboxes',
   series:[{n:'Container',c:C2,pts:F.fig6.Container},{n:'microVM',c:C1,pts:F.fig6.microVM}]})},chk:['fig6'],txt:'Curves thinned for the page; the peaks are taken from the full decoded data.'},
 f7:{t:'Figure 7: sandbox lifetimes (30K containers, 10K microVMs)',at:'S4.F7',draw(el){chart(el,{xlog:true,xr:[.01,10000],yr:[0,1],xt:logTicks(.01,10000).map(([v,l])=>[v,l]),yt:cdfY,xl:'lifetime (min, log)',yl:'CDF',
   series:[{n:'Container',c:C2,pts:F.fig7.Container},{n:'microVM',c:C1,da:'5 3',pts:F.fig7.microVM}],hl:[{y:.5,t:'median'},{y:.99,t:'p99'}],vl:[{x:180,t:'3 h'}]})},chk:['p50life','p99life','little']},
 f8:{t:'Figure 8: image fanout per task (1.5M containers, 390K microVMs)',at:'S4.F8',draw(el){chart(el,{xlog:true,xr:[1,20000],yr:[0,1],xt:logTicks(1,20000),yt:cdfY,xl:'sandboxes sharing one image within a task (log)',yl:'CDF',
   series:[{n:'Container',c:C2,pts:F.fig8.Container},{n:'microVM',c:C1,pts:F.fig8.microVM}],hl:[{y:.5,t:'p50'},{y:.9,t:'p90'}]})},chk:['fig8']},
 f10:{t:'Figure 10: an 8,192-container burst, on-demand EROFS against eager Docker pulls',at:'S8.F10',draw(el){const S=F.fig10,c={'Docker (cached)':C5,'Docker (cold)':C1,'EROFS':C2};
   chart(el,{xr:[0,60],yr:[0,900],xt:[0,15,30,45,60].map(v=>[v,v+'']),yt:[0,250,500,750].map(v=>[v,v+'']),xl:'time (min)',yl:'running containers per VM',series:Object.keys(S).map(k=>({n:k,c:c[k],pts:S[k].running}))});
   chart(el,{xr:[0,60],yr:[0,23000],y2:{yr:[0,1750],yt:[[0,'0'],[500,'500'],[1000,'1,000'],[1500,'1,500']],yl:'total written (GB)'},xt:[0,15,30,45,60].map(v=>[v,v+'']),yt:[0,10000,20000].map(v=>[v,fmt(v)]),xl:'time (min)',yl:'write IOPS',
     series:Object.keys(S).map(k=>({n:k+' IOPS',c:c[k],sw:1.2,pts:S[k].iops})).concat(Object.keys(S).map(k=>({n:k+' total',c:c[k],da:'6 3',ax:2,pts:S[k].total_gb})))})},chk:['f10time','f10writes','f10iops','f10peak']},
 f11:{t:'Figure 11: provisioning by tar extraction against EROFS layer mounts',at:'S8.F11',draw(el){const S=F.fig11;
   chart(el,{H:200,xr:[0,90],yr:[0,100],xt:[0,20,40,60,80].map(v=>[v,v+'']),yt:[[0,'0'],[50,'50'],[100,'100']],xl:'time (min)',yl:'CPU (%)',series:[{n:'Tar',c:C1,pts:S.Tar.cpu},{n:'EROFS',c:C2,pts:S.EROFS.cpu}]});
   chart(el,{H:200,xr:[0,90],yr:[0,2500],xt:[0,20,40,60,80].map(v=>[v,v+'']),yt:[[0,'0'],[1000,'1,000'],[2000,'2,000']],xl:'time (min)',yl:'disk write (MB/s)',series:[{n:'Tar',c:C1,pts:S.Tar.write_mb_s},{n:'EROFS',c:C2,pts:S.EROFS.write_mb_s}]})},chk:['f11time','f11writes'],
   txt:'The original also draws a shaded band around each line, which the paper does not explain; only the lines are decoded.'},
 f12:{t:'Figure 12: host memory and CPU, four Firecracker configurations',at:'S8.F12',draw(el){const S=F.fig12,c={baseline:GR,pmem:C1,fpr:C3,'pmem+fpr':C2};
   chart(el,{xr:[-1,50],yr:[0,4300],xt:[0,10,20,30,40,50].map(v=>[v,v+'']),yt:[0,1000,2000,3000,4000].map(v=>[v,fmt(v)]),xl:'time (min)',yl:'host memory (GB)',series:Object.keys(S).map(k=>({n:k,c:c[k],pts:S[k].mem}))});
   chart(el,{H:220,xr:[-.5,9],yr:[0,45],xt:[0,2,4,6,8].map(v=>[v,v+'']),yt:[[0,'0'],[20,'20'],[40,'40']],xl:'time (min), first 9 minutes',yl:'CPU (%)',series:Object.keys(S).map(k=>({n:k,c:c[k],pts:S[k].cpu,noleg:true}))})},chk:['f12peak','f12fpr','f12comb','f12cpu'],
   txt:'The original\'s CPU panel continues from 10 to 50 minutes on a compressed axis, where all four stay near 10% or below; that part is decoded but not drawn here.'},
 f13:{t:'Figure 13: latency-sensitive agent time against best-effort load',at:'S8.F13',draw(el){const d=document.createElement('div');el.appendChild(d);qosChart(d)},chk:['f13base','f13core','f13idle']}};
const sel=$('figSel');if(!sel)return;let cur='f10';
sel.innerHTML=Object.keys(FIG).map(k=>'<button data-f="'+k+'" id="fs_'+k+'">'+FIG[k].t.split(':')[0]+'</button>').join('');
function show(k){cur=k;sel.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.f===k));const f=FIG[k];
  $('figTitle').innerHTML='<a href="'+AXU+f.at+'" target="_blank" rel="noopener noreferrer">'+f.t+'</a>';const el=$('figChart');el.innerHTML='';f.draw(el);
  $('figNote').innerHTML=(f.txt?'<p class="mute">'+f.txt+'</p>':'')+(f.chk?note(f.chk):'')}
sel.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>show(b.dataset.f)));
$('t2body').innerHTML=P.tables.t2.rows.map(r=>'<tr><td>'+r.b+'</td><td class="num">'+fmt(r.base)+'</td><td class="num">'+fmt(r.ws)+'</td><td class="num">'+(r.snap==null?'n/a':fmt(r.snap))+'</td><td class="num">'+r.tb+' TB</td></tr>').join('')+
  '<tr><td>Total (derived)</td><td class="num">'+fmt(11268)+'</td><td class="num">'+fmt(155761)+'</td><td class="num">'+fmt(4889)+'</td><td class="num">133.7 TB</td></tr>';
$('t3body').innerHTML=P.tables.t3.rows.map(r=>'<tr><td>'+r.l+'</td><td class="num">'+r.gb.toFixed(1)+' GB</td><td class="num">'+r.acc.toFixed(1)+'%</td><td class="num">'+(r.acc/100*r.gb).toFixed(2)+' GB</td></tr>').join('');
$('chkBody').innerHTML=RC.checks.map(c=>'<tr><td>'+c.claim+(c.note?'<div class="small mute">'+c.note+'</div>':'')+'</td><td>'+c.where+'</td><td>'+c.paper+'</td><td>'+c.ours+'</td><td class="v v-'+c.verdict+'">'+c.verdict+'</td></tr>').join('');
onTab('t-figs',()=>show(cur));
})();
