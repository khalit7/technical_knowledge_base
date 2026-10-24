// ---- Cluster dashboard: replay of the recorded Prometheus data (window.OC.scen) ----
window.OCD=(function(){
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  // one line chart; series [{name,v,color,dash}], cursor index i, marks [[sec,label]], thr {v,label}
  function chart(W,H,n,step,series,o){o=o||{};const L=40,R=8,T=8,B=22,ymax=o.ymax||Math.max(1e-9,...series.flatMap(s=>s.v.filter(x=>x!=null)))*1.12;
    const xs=i=>L+i/(Math.max(1,n-1))*(W-L-R),ys=v=>T+(1-Math.min(v,ymax)/ymax)*(H-T-B);let s='';
    for(let k=0;k<=3;k++){const v=ymax*k/3;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="var(--line)"/>'+RD.t(L-4,ys(v)+3,(o.fmt||(x=>x>=10?Math.round(x):x.toFixed(x>=1?1:2)))(v),{a:'end',fs:10,fill:'var(--mute)'})}
    const ticks=Math.max(2,Math.floor((W-L-R)/70));for(let k=0;k<=ticks;k++){const i=Math.round((n-1)*k/ticks);s+=RD.t(xs(i),H-6,Math.round(i*step)+' s',{a:k===ticks?'end':k===0?'start':'middle',fs:10,fill:'var(--mute)'})}
    (o.marks||[]).forEach(m=>{const i=m[0]/step;if(i<0||i>n-1)return;s+='<line x1="'+xs(i)+'" x2="'+xs(i)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>'});
    if(o.thr)s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+ys(o.thr.v)+'" y2="'+ys(o.thr.v)+'" stroke="var(--bad)" stroke-dasharray="5 3"/>'+RD.t(W-R-2,ys(o.thr.v)-3,o.thr.label,{a:'end',fs:10,fill:'var(--bad)'});
    series.forEach(sr=>{let p='',up=false;const lim=sr.ghost?n-1:o.cur;sr.v.forEach((v,i)=>{if(i>lim||v==null){up=false;return}p+=(up?'L':'M')+xs(i).toFixed(1)+' '+ys(v).toFixed(1);up=true});
      s+='<path d="'+p+'" fill="none" stroke="'+sr.color+'" stroke-width="'+(sr.ghost?1.3:2)+'"'+(sr.dash?' stroke-dasharray="5 4"':'')+(sr.ghost?' opacity=".6"':'')+'/>'});
    if(o.cur!=null)s+='<line x1="'+xs(o.cur)+'" x2="'+xs(o.cur)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--ink)" stroke-width="1"/>';
    return RD.svg(W,H,s,o.label||'chart')}
  return {COL,chart};
})();
(function(){
  const $=id=>document.getElementById(id);if(!$('oc-db-card')||!window.OC)return;
  const SC=OC.scen,byId={};SC.forEach(s=>byId[s.id]=s);let cur='slow';const C=OCD.COL;
  const CAP={
    base:'The reference: 400 steps of the running example as a JobSet admitted by Kueue (2 pods of 2 ranks). Steps per second climbs as the 30-second rate window fills, the two pods use about 0.35 CPU cores each (most of each step is the 100 ms of extra work), nothing is throttled. GpusHeldNoProgress goes pending at the start (quota admitted, no step yet: startup) and clears before its 20-second <code>for:</code> runs out.',
    slow:'At step 150 the pod holding ranks 2 and 3 was capped at 0.2 CPU through its cgroup, the CPU version of a GPU that throttles its clocks. The whole job slows (synchronous training waits for its slowest member): TrainingSlowdown fired about 40 s later. Look at the CPU panel: the healthy pod dropped to the same 0.17 cores as the capped one, because it now waits. Utilisation cannot find the straggler; the throttling counter can (PodThrottled, pod 1 at 70% to 95% of periods throttled). The throttling rule first read the container cgroup and saw nothing: the limit was set on the pod cgroup, and throttling is counted where the limit is hit. The rule was fixed live (dotted line at 97 s).',
    hang:'At step 150 rank 3 was frozen with SIGSTOP: alive, silent. Within one scrape the step counter stopped; TrainingStalled went pending after 20 s without a step and fired 33 s after the freeze; GpusHeldNoProgress fired 20 s later. Look at the CPU panel: the waiting ranks dropped to about 0.01 cores. Gloo waits in the kernel, so on CPU a hang reads as idle; NCCL keeps a kernel resident and polling, so on a GPU the same hang reads 100% utilisation (Reading, section 2). The job only ended when the 45-second process-group timeout fired, 83 s after the freeze, and torchrun tore down.',
    queue:'Three JobSets submitted together into a ClusterQueue with 12 GPUs, 4 CPUs and 3 GiB. Each asks for 4 GPUs, 2 CPUs and 1,800 MiB, so memory, not GPUs, admits one at a time: Kueue said "insufficient unused quota for memory in flavor default-flavor, 528Mi more needed". GPU quota used never passed 4 of 12, and PendingWithFreeGpus fired for about a minute. Admission waits: 0, 39 and 76 s (Kueue events; its histogram sums 117 s over 6 admissions in the whole session). The third job submitted was admitted before the second.',
    slurm:'Slurm: alice’s training job takes 2 GPUs on each of c1 and c2, bob’s takes all 4 on c3, then carol asks for 4 GPUs on one node. Four GPUs are free (two on each of two nodes), and carol waits with reason Resources for 66 s until alice’s job ends. That is fragmentation measured: the free GPUs are the wrong shape. The community Slurm exporters, and this one, call allocated over total "GPU utilization"; it reads 67% here while the waiting job counts for nothing.'};
  $('oc-db-sc').innerHTML=SC.map(s=>'<button data-m="'+s.id+'"'+(s.id===cur?' class="on"':'')+'>'+s.title+'</button>').join('');
  const lab=n=>n.replace('oc-','');
  function panels(i){const s=byId[cur],W=Math.max(260,Math.min(430,RD.width($('oc-db-panels'))/(RD.width($('oc-db-panels'))>620?2:1)-6)),H=150,o={cur:i,marks:s.marks.map(m=>[m[0],m[2]])};
    const g=$('oc-db-ghost').checked&&cur!=='base'&&cur!=='slurm'?byId.base:null,gs=(v)=>v.slice(0,s.n);
    const P=[];
    const sps=Object.keys(s.s.sps).map((k,j)=>({name:lab(k),v:s.s.sps[k],color:C[j%6]}));if(g)sps.push({name:'base',v:gs(g.s.sps['oc-base']),color:'var(--mute)',dash:1,ghost:1});
    P.push(['Training steps per second','rate(oc_train_step{rank="0"}[30s])',sps,{}]);
    if(s.sys==='k8s'){
      const sin=Object.keys(s.s.since).map((k,j)=>({name:lab(k),v:s.s.since[k],color:C[j%6]}));
      P.push(['Seconds since the last step','time() - max by (run) (oc_train_last_step_timestamp_seconds)',sin,{thr:{v:20,label:'TrainingStalled: 20 s'},ymax:Math.max(30,...sin.flatMap(x=>x.v.filter(v=>v!=null)))*1.1}]);
      const cpu=Object.keys(s.s.cpu).map((k,j)=>({name:k,v:s.s.cpu[k],color:C[j%6]}));if(g)Object.keys(g.s.cpu).forEach(k=>cpu.push({name:'base '+k,v:gs(g.s.cpu[k]),color:'var(--mute)',dash:1,ghost:1}));
      P.push(['Training pod CPU (cores)','sum by (pod) (rate(container_cpu_usage_seconds_total{container="trainer"}[40s]))',cpu,{ymax:.7}]);
      const thr=Object.keys(s.s.thr).map((k,j)=>({name:k,v:s.s.thr[k],color:C[j%6]}));
      P.push(['Share of CPU periods throttled (pod cgroup)','rate(container_cpu_cfs_throttled_periods_total{container=""}[40s]) / rate(container_cpu_cfs_periods_total{container=""}[40s])',thr,{ymax:1,thr:{v:.5,label:'PodThrottled: 0.5'}}]);
      const q=[{name:'GPU quota used',v:s.s.kq_gpu.map((v,j)=>v==null?null:v/(s.s.kq_gpu_quota[j]||12)),color:C[0]},{name:'memory quota used',v:s.s.kq_mem.map((v,j)=>v==null?null:v/(s.s.kq_mem_quota[j]||1)),color:C[1]}];
      P.push(['Kueue ClusterQueue usage / quota','oc_kueue_usage / oc_kueue_quota (from .status.flavorsUsage)',q,{ymax:1.05}]);
      const wl=Object.keys(s.s.kq_wl).filter(k=>k!=='reserving').map((k,j)=>({name:k+' workloads',v:s.s.kq_wl[k],color:C[(j+2)%6]}));
      P.push(['Kueue workloads','oc_kueue_workloads (pendingWorkloads, admittedWorkloads)',wl,{ymax:3.2,fmt:x=>x.toFixed(0)}]);
    }else{
      P.push(['Slurm GPUs allocated of 12','oc_slurm_gres_gpu{state="alloc"} (scontrol show node: AllocTRES)',[{name:'allocated',v:s.s.gpu_alloc,color:C[0]},{name:'total',v:s.s.gpu_total,color:'var(--mute)',dash:1}],{ymax:13,fmt:x=>x.toFixed(0)}]);
      P.push(['Slurm jobs','oc_slurm_jobs (squeue)',Object.keys(s.s.jobs).map((k,j)=>({name:k,v:s.s.jobs[k],color:C[(j+1)%6]})),{ymax:3.2,fmt:x=>x.toFixed(0)}]);
      P.push(['Node container CPU (cores)','rate(oc_node_cpu_seconds_total[15s]) (cgroup cpu.stat)',Object.keys(s.s.node_cpu).map((k,j)=>({name:k,v:s.s.node_cpu[k],color:C[j%6]})),{ymax:.9}]);
    }
    $('oc-db-panels').innerHTML=P.map(p=>'<div class="oc-panel"><h4>'+p[0]+'</h4><div class="q">'+RD.esc(p[1])+'</div>'+OCD.chart(W,H,s.n,s.step,p[2],Object.assign({},o,p[3],{label:p[0]}))+
      '<div class="oc-leg">'+p[2].map(x=>'<span><i style="background:'+x.color+'"></i>'+x.name+(x.v[i]!=null&&!x.ghost?' '+(+x.v[i]).toFixed(2):'')+'</span>').join('')+'</div></div>').join('')}
  function draw(i){const s=byId[cur],t=i*s.step;panels(i);
    const st={};s.alerts.forEach(a=>{if(a[3]<=t&&t<a[4])st[a[0]+(a[1]?' ('+a[1]+')':'')]=a[2]});
    const names=[...new Set(s.alerts.map(a=>a[0]+(a[1]?' ('+a[1]+')':'')))];
    $('oc-db-alerts').innerHTML='<div class="small"><b>Alerts at '+Math.round(t)+' s:</b> '+(names.length?names.map(n=>'<span class="oc-alert '+(st[n]==='firing'?'fire':st[n]==='pending'?'pend':'')+'">'+n+': '+(st[n]||'inactive')+'</span>').join(''):'none defined fire here')+'</div>';
    const ev=s.marks.filter(m=>m[0]<=t).map(m=>Math.round(m[0])+' s '+lab(m[1])+' '+m[2].replace(/:.*->/,' ').replace(/pod-index-1/,'pod 1')).slice(-2).join('; ');
    $('oc-db-cap').innerHTML=CAP[cur]+(ev?'<br><span class="small mute">Events so far: '+RD.esc(ev)+'</span>':'')}
  const A=RD.anim({card:'oc-db-card',ctl:'oc-db-ctl',n:byId[cur].n,ms:500,draw,label:'Time in the recording'});
  A.go(byId[cur].n-1);
  RD.seg($('oc-db-sc'),m=>{cur=m;A.reset(byId[cur].n);A.go(byId[cur].n-1)});
  $('oc-db-ghost').addEventListener('change',()=>A.redraw());
  // what the scrape cost
  const sc=OC.scrape||{},rows=Object.keys(sc).map(k=>'<tr><td>'+RD.esc(k)+'</td><td class="num">'+sc[k][0]+'</td><td class="num">'+sc[k][1]+'</td></tr>').join('');
  $('oc-db-cost').innerHTML='<h3>What watching cost</h3><div class="tw"><table class="oc-tbl"><thead><tr><th>Target</th><th class="num">Samples per scrape</th><th class="num">Kept after relabelling</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="small">Prometheus at the end: '+OC.prom.tsdb_series+' series in its head block, about '+OC.prom.samples_per_s+' samples appended per second at peak, '+Math.round(OC.prom.rss_mb_end)+' MB resident. One idle kind worker exposes about 950 cAdvisor samples per scrape; Kueue’s endpoint 2,516, of which 299 are <code>kueue_*</code> (the rest are Go and controller-runtime internals). <span class="oc-meas">measured</span></p>';
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-dash']=window.TAB_RENDER['t-dash']||[]).push(()=>A.redraw());
  addEventListener('resize',()=>{if(!$('t-dash').hidden)A.redraw()});
})();
