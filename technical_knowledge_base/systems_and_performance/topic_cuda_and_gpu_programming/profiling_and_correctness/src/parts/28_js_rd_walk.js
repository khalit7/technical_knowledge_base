// ---- Reading section 4: NVIDIA's sample pairs as data for Fig. 2 (41_js_sc_walk.js), the numbers in its step lists, and the metric-name anatomy widget. Every number is read from PCD.ncu (ncu --import output).
window.NCU=(function(){
  const N=PCD.ncu,byStem=s=>N.reports.find(r=>r.stem===s);
  // value of a labelled row in a section (first table with that label)
  function get(rep,sec,label){const s=rep.sections.find(x=>x.name===sec);if(!s)return null;for(const t of s.tables)for(const r of t.rows)if(r[0]===label)return {v:+String(r[2]).replace(/,/g,''),u:r[1]};return null}
  function raw(rep,k){const v=rep.raw[k];return v?+v[0]:null}
  function dur(rep){const d=get(rep,'GPU Speed Of Light Throughput','Duration');return d.u==='ms'?d.v*1000:d.u==='ns'?d.v/1000:d.v}
  function rule(rep,sec,re){const s=rep.sections.find(x=>x.name===sec);if(!s)return null;return s.rules.find(r=>re.test(r.text))||null}
  const PAIRS=[
    {b:'addConstDouble3',a:'addConstDouble',ev:{short:'sectors per request',name:'sectors per global load request',f:r=>raw(r,'l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum')/raw(r,'l1tex__t_requests_pipe_lsu_mem_global_op_ld.sum'),fmt:v=>MC.fmtN(v,1),ideal:'ideal 8 for 8-byte loads'},
     rule:r=>rule(r,'Source Counters',/uncoalesced global/),fix:'Treat the array of double3 as a plain array of doubles: each thread loads one 8-byte value instead of three loads 24 bytes apart (<code>d_out[i] = d_in[i] + k</code> over 3N threads).'},
    {b:'transposeCoalesced',a:'transposeNoBankConflicts',ev:{short:'bank conflicts',name:'shared loads: conflicts as % of wavefronts',f:r=>100*raw(r,'l1tex__data_bank_conflicts_pipe_lsu_mem_shared_op_ld.sum')/Math.max(1,raw(r,'l1tex__data_pipe_lsu_wavefronts_mem_shared_op_ld.sum')),fmt:v=>MC.fmtN(v,1)+'%',ideal:'ideal 0%'},
     rule:r=>rule(r,'Memory Workload Analysis Tables',/bank conflict/),fix:'Pad the shared tile by one column: <code>__shared__ float tile[32][32]</code> becomes <code>tile[32][33]</code>, so a column of the tile falls in 32 different banks.'},
    {b:'sobelDouble',a:'sobelFloat',ev:{short:'FP64 pipe busy',name:'FP64 pipe busy, % of active cycles',f:r=>raw(r,'sm__pipe_fp64_cycles_active.avg.pct_of_peak_sustained_active'),fmt:v=>MC.fmtN(v,1)+'%',ideal:'this GPU runs FP64 at 1/64 of FP32'},
     rule:r=>rule(r,'Compute Workload Analysis',/FP64/),fix:'Compute the Sobel filter in <code>float</code> instead of <code>double</code> (<code>Sobel&lt;double&gt;</code> to <code>Sobel&lt;float&gt;</code>): the report notes this GPU\'s FP32 to FP64 peak ratio is 64:1.'}
  ];
  function pairData(k){const p=PAIRS[k],B=byStem(p.b),A=byStem(p.a);const sol=(r,l)=>get(r,'GPU Speed Of Light Throughput',l).v;
    const rl=p.rule(B);return {p,B,A,db:dur(B),da:dur(A),cb:sol(B,'Compute (SM) Throughput'),ca:sol(A,'Compute (SM) Throughput'),mb:sol(B,'Memory Throughput'),ma:sol(A,'Memory Throughput'),
      eb:p.ev.f(B),ea:p.ev.f(A),rule:rl,est:rl&&rl.speedup?+rl.speedup.match(/([\d.]+)%/)[1]:null}}
  return {PAIRS,get,raw,dur,pairData,byStem};
})();
(function(){
  const f=MC.fmtN;
  // anatomy widget
  const EX=[['l1tex','unit: the L1/TEX cache of each SM (others: sm, smsp = SM sub-partition, lts = L2 slice, dram, gpc, gpu)'],['__',''],['data_bank_conflicts_pipe_lsu_mem_shared_op_ld','counter: bank conflicts in the data stage, load/store pipe, shared memory, load operations'],['.sum','roll-up: added over all instances of the unit (all SMs); .avg, .min, .max are the alternatives']];
  const EX2=[['dram','unit: device memory (HBM or GDDR)'],['__',''],['throughput','counter: a throughput metric, the highest % among its constituent counters'],['.avg','roll-up: average over the DRAM instances'],['.pct_of_peak_sustained_elapsed','sub-metric: % of the peak sustained rate over the elapsed cycles (the _active variant uses only cycles the unit was active)']];
  const an2=document.getElementById('rd-anat'),out=document.getElementById('rd-anat-out');
  function anat(){an2.innerHTML=[EX,EX2].map((e,q)=>e.map((p,j)=>p[1]?'<span data-q="'+q+'" data-j="'+j+'">'+p[0]+'</span>':'<b>'+p[0]+'</b>').join('')).join('<i style="flex-basis:100%;height:4px"></i>')}
  anat();an2.addEventListener('click',e=>{const sp=e.target.closest('span[data-j]');if(!sp)return;an2.querySelectorAll('span').forEach(x=>x.classList.toggle('on',x===sp));out.textContent=[EX,EX2][+sp.dataset.q][+sp.dataset.j][1]});
  const p0=NCU.pairData(0),p1=NCU.pairData(1),tb=NCU.byStem('transposeCoalesced');
  Object.assign(window.RDV=window.RDV||{},{n_passes:f(NCU.raw(tb,'profiler__replayer_passes'),0),n_bak:f(NCU.raw(tb,'profiler__replayer_bytes_mem_backed_up.avg'),0),
    w0_est:f(p0.est,2),set_basic:f(PCD.ncu.sets.find(x=>x.id==='basic').metrics,0),set_full:f(PCD.ncu.sets.find(x=>x.id==='full').metrics,0),set_full_n:String(PCD.ncu.sets.find(x=>x.id==='full').sections.length),w0_b:f(p0.db,2),w0_a:f(p0.da,2),w1_est:f(p1.est,2),w1_gain:f((1-p1.da/p1.db)*100,1)});
  // the numbers written in the step lists of Fig. 2 (#sx-wk-0 to #sx-wk-2)
  const du=v=>v>=1000?f(v,0):f(v,2);
  [0,1,2].forEach(k=>{const D=NCU.pairData(k),g=(1-D.da/D.db)*100,o={};
    o['wk'+k+'_db']=du(D.db);o['wk'+k+'_da']=du(D.da);o['wk'+k+'_cb']=f(D.cb,1);o['wk'+k+'_mb']=f(D.mb,1);o['wk'+k+'_ca']=f(D.ca,1);o['wk'+k+'_ma']=f(D.ma,1);
    o['wk'+k+'_eb']=D.p.ev.fmt(D.eb);o['wk'+k+'_ea']=D.p.ev.fmt(D.ea);o['wk'+k+'_gain']=f(g,Math.abs(g)<1?2:1);o['wk'+k+'_x']=f(D.db/D.da,2);
    if(D.est!=null){o['wk'+k+'_est']=f(D.est,2);o['wk'+k+'_ghost']=du(D.db*(1-D.est/100))}
    Object.assign(window.RDV,o)});
})();
