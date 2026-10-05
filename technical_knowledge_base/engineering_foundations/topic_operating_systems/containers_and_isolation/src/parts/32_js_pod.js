// ---- Pod to cgroup tab: Kubernetes v1.34 requests and limits to cgroup v2 files (formulas checked by recompute.py) ----
window.POD=(function(){
  const GiB=1073741824;
  const shares=m=>{if(!m)return 2;const s=Math.floor(m*1024/1000);return Math.min(262144,Math.max(2,s))};          // MilliCPUToShares
  const quota=m=>{if(!m)return 0;return Math.max(1000,Math.floor(m*100000/1000))};                               // MilliCPUToQuota, period 100000
  const wLinear=s=>s===0?0:1+Math.floor((s-2)*9999/262142);                                                       // runc v1.1.2
  const wQuad=s=>{if(s===0)return 0;if(s<=2)return 1;if(s>=262144)return 10000;const l=Math.log2(s);return Math.ceil(Math.pow(10,(l*l+125*l)/612-7/34))}; // opencontainers/cgroups v0.0.3
  // containers: [{cr,cl,mr,ml}] cpu in milli, memory in bytes; null = not set
  function qos(cs){
    let any=false,guar=true;
    cs.forEach(c=>{const req={},lim={};
      if(c.cr!=null)req.cpu=c.cr;if(c.mr!=null)req.mem=c.mr;if(c.cl!=null)lim.cpu=c.cl;if(c.ml!=null)lim.mem=c.ml;
      // the API server defaults a missing request to the limit
      if(req.cpu==null&&lim.cpu!=null)req.cpu=lim.cpu;if(req.mem==null&&lim.mem!=null)req.mem=lim.mem;
      if(Object.keys(req).length||Object.keys(lim).length)any=true;
      if(lim.cpu==null||lim.mem==null)guar=false;
      for(const k in req)if(lim[k]!==req[k])guar=false;});
    return !any?'BestEffort':guar?'Guaranteed':'Burstable';
  }
  function oomAdj(q,c,cap){
    if(q==='Guaranteed')return -997;if(q==='BestEffort')return 1000;
    const req=c.mr!=null?c.mr:(c.ml!=null?c.ml:0);
    let a=1000-Math.floor(1000*req/cap);
    if(a<3)a=3;if(a===1000)a=999;return a;
  }
  function container(q,c,cap){
    const cr=c.cr!=null?c.cr:(c.cl!=null?c.cl:0),s=shares(cr);
    const o={shares:s,wl:wLinear(s),wq:wQuad(s),cpumax:c.cl!=null?quota(c.cl)+' 100000':'max 100000',memmax:c.ml!=null?String(c.ml):'max',adj:oomAdj(q,c,cap),oomgroup:1};
    const mr=c.mr!=null?c.mr:(c.ml!=null?c.ml:0);
    const ml=c.ml!=null?c.ml:0;let h=0;
    if(mr!==ml)h=ml>0?Math.floor((mr+(ml-mr)*0.9)/4096)*4096:Math.floor((mr+(cap-mr)*0.9)/4096)*4096; // no limit: node allocatable, approximated here by capacity
    o.memhigh=h>mr?String(h):'not set';
    o.memmin=mr>0?String(mr):'not set';
    return o;
  }
  function pod(q,cs){
    const sumR=cs.reduce((a,c)=>a+(c.cr!=null?c.cr:(c.cl!=null?c.cl:0)),0);
    const cpuAll=cs.every(c=>c.cl!=null),memAll=cs.every(c=>c.ml!=null);
    const sumCL=cs.reduce((a,c)=>a+(c.cl||0),0),sumML=cs.reduce((a,c)=>a+(c.ml||0),0);
    const s=q==='BestEffort'?2:shares(sumR);
    return {shares:s,wl:wLinear(s),wq:wQuad(s),cpumax:(q!=='BestEffort'&&cpuAll)?quota(sumCL)+' 100000':'max 100000',memmax:(q!=='BestEffort'&&memAll)?String(sumML):'max',
      path:(q==='Guaranteed'?'kubepods/':'kubepods/'+q.toLowerCase()+'/')+'pod&lt;uid&gt;/'};
  }
  return {shares,quota,wLinear,wQuad,qos,container,pod,GiB};
})();
(function(){
  const P=window.POD,E=RD.esc,$=id=>document.getElementById(id);
  const PRE=[
    {node:512,cs:[{n:'trainer',cr:8,cl:8,mr:64,ml:64}]},
    {node:512,cs:[{n:'trainer',cr:8,cl:null,mr:64,ml:64}]},
    {node:512,cs:[{n:'notebook',cr:null,cl:null,mr:null,ml:null}]},
    {node:64,cs:[{n:'server',cr:2,cl:4,mr:8,ml:16},{n:'sidecar',cr:0.1,cl:0.2,mr:0.25,ml:0.5}]},
    {node:512,cs:[{n:'trainer',cr:null,cl:null,mr:32,ml:null}]}];
  const F=[['cr','CPU request (cores)'],['cl','CPU limit (cores)'],['mr','memory request (GiB)'],['ml','memory limit (GiB)']];
  function load(i){const p=PRE[i];$('pd-node').value=p.node;
    $('pd-in').innerHTML=p.cs.map((c,k)=>'<div class="pd-c"><h4>container '+(k+1)+': '+E(c.n)+'</h4>'+F.map(([f,l])=>'<label>'+l+'<input type="number" min="0" step="any" data-c="'+k+'" data-f="'+f+'" value="'+(c[f]==null?'':c[f])+'" placeholder="not set"></label>').join('')+'</div>').join('');
    calc()}
  function read(){const cs=[];$('pd-in').querySelectorAll('input').forEach(inp=>{const k=+inp.dataset.c,f=inp.dataset.f;cs[k]=cs[k]||{};
      const v=inp.value.trim()===''?null:+inp.value;cs[k][f]=v==null||!isFinite(v)||v<0?null:(f[0]==='c'?Math.round(v*1000):Math.round(v*P.GiB))});return cs}
  function calc(){
    const cs=read(),cap=Math.max(1,+$('pd-node').value||1)*P.GiB,q=P.qos(cs);
    const col={Guaranteed:'var(--good)',Burstable:'var(--c5)',BestEffort:'var(--bad)'}[q];
    $('pd-q').innerHTML='QoS class: <span style="color:'+col+'">'+q+'</span>';
    $('pd-why').textContent=q==='Guaranteed'?'Every container has CPU and memory limits equal to its requests.':q==='BestEffort'?'No container sets any CPU or memory request or limit: first to be killed when the node runs out of memory, and CPU weight 1 under contention.':'Some request or limit is set, but not limit equal to request for both CPU and memory in every container.';
    const rows=cs.map(c=>P.container(q,c,cap));
    const R=[['cpu.weight (runc 1.1, linear)',r=>r.wl],['cpu.weight (runc 1.3.6+, quadratic)',r=>r.wq],['(cgroup v1 shares)',r=>r.shares],['cpu.max',r=>r.cpumax],['memory.max',r=>r.memmax],['memory.oom.group',r=>r.oomgroup],['oom_score_adj',r=>r.adj],['memory.min (MemoryQoS, alpha)',r=>r.memmin],['memory.high (MemoryQoS, alpha)',r=>r.memhigh]];
    $('pd-out').innerHTML='<thead><tr><th>Container cgroup file</th>'+cs.map((c,k)=>'<th>container '+(k+1)+'</th>').join('')+'</tr></thead><tbody>'+R.map(([l,f])=>'<tr><td>'+l+'</td>'+rows.map(r=>'<td><code>'+E(String(f(r)))+'</code></td>').join('')+'</tr>').join('')+'</tbody>';
    const p=P.pod(q,cs);
    $('pd-pod').innerHTML='<thead><tr><th>Pod cgroup</th><th><code>'+p.path+'</code></th></tr></thead><tbody>'+
      [['cpu.weight (linear / quadratic)',p.wl+' / '+p.wq],['cpu.max',p.cpumax],['memory.max',p.memmax]].map(r=>'<tr><td>'+r[0]+'</td><td><code>'+r[1]+'</code></td></tr>').join('')+'</tbody>';
  }
  RD.seg($('pd-pre'),m=>load(+m));
  $('pd-in').addEventListener('input',calc);$('pd-node').addEventListener('input',calc);
  load(0);
})();
