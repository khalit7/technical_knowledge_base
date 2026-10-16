// ---- Reading, Detection: time until someone notices, by failure shape (defaults / lab / tuned) ----
(function(){
const $=id=>document.getElementById(id), E=RD.esc;
if(!$('dt-card'))return;
const FL=window.FT.fl.scen, sc=id=>FL.find(s=>s.id===id);
const INF=null;
// each row: [label, defaults {s, who}, lab {s, who}, tuned {s, who}]
const ROWS=[
 ['Process crashes',{s:0.1,w:'torchrun polls its workers every 0.1 s (run.py, v2.14.1); peers see closed sockets at once'},{s:sc('s-crash').detect_s,w:'measured: the Slurm job saw the crash after '+sc('s-crash').detect_s+' s (root Failure lab, run fl-crash)'},{s:0.1,w:'already immediate'}],
 ['Host lost, on Slurm',{s:300,w:'SlurmdTimeout default 300 s (read_config.h @ slurm-24-11-5-1)'},{s:sc('s-node').detect_s,w:'measured: node set DOWN after '+sc('s-node').detect_s.toFixed(1)+' s with SlurmdTimeout=30 (root Failure lab, fl-node)'},{s:30,w:'published: ByteRobust\'s inspections detect a NIC crash or port flapping in 30 s (Wan et al., SOSP 2025, Table 3); without them it waits for the PyTorch timeout'}],
 ['Host lost, on Kubernetes',{s:350,w:'NotReady after 50 s, pods evicted after a further 300 s (v1.37.0 defaults); a pod on a dead kubelet then stays Terminating'},{s:445,w:'measured: NotReady after '+sc('k-node').detect_s.toFixed(1)+' s (grace period set to 30 s), then stuck until an operator applied the out-of-service taint at 445 s (root Failure lab, run fl-k3)'},{s:50,w:'a node-health controller that taints out-of-service at NotReady (illustrative: 50 s, the NotReady grace period)'}],
 ['Host lost, on Ray',{s:30,w:'GCS health checks: 5 s delay, every 3 s, 10 s timeout, 5 failures (ray_config_def.h @ ray-2.59.0)'},{s:sc('r-node').detect_s,w:'measured: node declared dead '+sc('r-node').detect_s.toFixed(1)+' s after the kill (root Failure lab)'},{s:30,w:'already the default'}],
 ['Hang in a collective',{s:600,w:'NCCL watchdog: 10 min (ProcessGroupNCCL.hpp lines 159-160 @ v2.14.1); gloo: 30 min'},{s:sc('s-hang').detect_s,w:'measured: gloo timeout set to 30 s, healthy ranks errored at '+sc('s-hang').detect_s.toFixed(1)+' s (root Failure lab, fl-hang)'},{s:10,w:'published: ByteRobust detects a GPU driver hang or a lost GPU in 10 s (Wan et al., Table 3), against "the timeout threshold (~30 minutes)" without inspection'}],
 ['Watchdog itself wedged',{s:480,w:'NCCL heartbeat monitor: 8 min (ProcessGroupNCCL.cpp line 1775 @ v2.14.1)'},{s:null,w:'not run here (no NCCL on CPU)'},{s:480,w:'no published tuning found'}],
 ['Straggler',{s:INF,w:'no default detector in torch, Slurm, Kubernetes or Ray'},{s:null,w:'see the Straggler replay tab: flagged within 4 to 5 steps with a 10-step window'},{s:60,w:'NVIDIA Resiliency Extension straggler reports every 60 s by default (v0.7.0 docs)'}],
 ['Silent data corruption',{s:INF,w:'no default detector'},{s:null,w:'see section 7: caught only by checksums (weight flips) and replay'},{s:8*3600,w:'published: ByteRobust needed "more than 8 hours of offline stress testing" to find a GPU SDC (Wan et al.)'}]];
let MODE='def';
function draw(){
  const el=$('dt-chart'),w=RD.width(el),narrow=w<560,lw=narrow?0:170,rowH=narrow?40:26,top=4;
  const lo=Math.log10(0.05),hi=Math.log10(86400);
  const X=s=>lw+(Math.log10(s)-lo)/(hi-lo)*(w-lw-12);
  const col=MODE==='def'?1:MODE==='lab'?2:3;
  let s='';
  ROWS.forEach((r,i)=>{const y=top+i*rowH+(narrow?15:0),v=r[col];
    s+=RD.t(narrow?2:lw-6,narrow?y-3:y+13,E(r[0]),{fs:11.5,a:narrow?'start':'end',w:600});
    s+='<rect x="'+lw+'" y="'+y+'" width="'+(w-lw-12)+'" height="16" fill="var(--soft)" stroke="var(--line)"/>';
    if(v.s===null&&MODE!=='def'||v.s===null&&col!==1){s+=RD.t(lw+6,y+12,'not applicable here',{fs:11,fill:'var(--mute)'});return}
    if(v.s===INF||v.s===null){s+='<rect x="'+lw+'" y="'+y+'" width="'+(w-lw-12)+'" height="16" fill="var(--bad)" opacity=".35"/>'+RD.t(w-16,y+12,'never',{fs:11,a:'end',w:600,fill:'var(--bad)'});return}
    const x=X(v.s);s+='<rect x="'+lw+'" y="'+y+'" width="'+(x-lw).toFixed(1)+'" height="16" fill="'+(v.s>=300?'var(--bad)':v.s>=30?'var(--c5)':'var(--good)')+'" opacity=".8"/>';
    s+=RD.t(Math.min(x+4,w-60),y+12,v.s<60?(+v.s).toFixed(v.s<1?2:1)+' s':v.s<7200?(v.s/60).toFixed(1)+' min':(v.s/3600).toFixed(0)+' h',{fs:11});
  });
  const H=top+ROWS.length*rowH+(narrow?18:20);
  [[0.1,'0.1 s'],[1,'1 s'],[10,'10 s'],[60,'1 min'],[600,'10 min'],[3600,'1 h'],[86400,'1 day']].forEach(([v,t])=>{const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+(H-14)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'+RD.t(x,H-3,t,{fs:10.5,a:'middle',fill:'var(--mute)'})});
  el.innerHTML=RD.svg(w,H,s,'Time until a failure is noticed, by failure shape, log scale');
  $('dt-cap').innerHTML='<b>'+(MODE==='def'?'Defaults at the pinned versions':MODE==='lab'?'Measured on this topic\'s lab clusters (Apple M1 Pro, Docker Desktop VM, shared machine), with timeouts shortened for the lab':'What published systems report after tuning (each labelled)')+'.</b><ul>'+ROWS.map(r=>'<li><b>'+E(r[0])+'</b>: '+E(r[col].w)+'</li>').join('')+'</ul>';
}
RD.seg($('dt-mode'),m=>{MODE=m;draw()});
RD.onRender(draw);RD.onResize(draw);draw();
})();
