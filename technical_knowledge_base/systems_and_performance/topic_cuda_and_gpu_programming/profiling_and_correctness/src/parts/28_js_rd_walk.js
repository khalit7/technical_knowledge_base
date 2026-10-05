// ---- Reading section 4: walk a real Nsight Compute report top-down, before and after the fix (NVIDIA's sample pairs) ----
// Also the metric-name anatomy widget. Every number is read from PCD.ncu (ncu --import output).
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
  const f=MC.fmtN;let k=0,D=NCU.pairData(0);
  const el=document.getElementById('rd-walk-svg'),cap=document.getElementById('rd-walk-cap'),cnt=document.getElementById('rd-walk-cnt');
  const regime=(c,m)=>m>=60&&c<60?'memory-bound':c>=60&&m<60?'compute-bound':c>=60&&m>=60?'both units busy':'latency-bound';
  function steps(){const fu=v=>v>=1000?f(v/1000,3)+' ms':f(v,2)+' us';return [
    ['Duration first','<code>'+RD.esc(D.B.kernel.split('(')[0])+'</code> took '+fu(D.db)+' (gpu__time_duration.sum).'],
    ['Speed of Light: which unit is closest to its peak?','Compute (SM) '+f(D.cb,1)+'%, Memory '+f(D.mb,1)+'%: '+regime(D.cb,D.mb)+'.'],
    ['Follow the section the numbers point to',D.p.ev.name+': <b>'+D.p.ev.fmt(D.eb)+'</b> ('+D.p.ev.ideal+').'],
    ['What the guided analysis says',D.rule?(D.rule.speedup?'<b>'+RD.esc(D.rule.speedup)+'</b>. ':'(no estimate) ')+RD.esc(D.rule.text.slice(0,230))+'...':'(no rule fired)'],
    ['Change one thing',D.p.fix],
    ['Profile again',' The fixed kernel: '+fu(D.da)+'; Compute '+f(D.ca,1)+'%, Memory '+f(D.ma,1)+'%; '+D.p.ev.name+' '+D.p.ev.fmt(D.ea)+'.'],
    ['Verdict: estimate against the clock','Estimated speedup '+(D.est!=null?f(D.est,2)+'%':'none given')+'; measured: '+f((1-D.da/D.db)*100,Math.abs(1-D.da/D.db)<0.01?2:1)+'% less time ('+f(D.db/D.da,2)+'&times;).']]}
  function draw(i){
    const W=RD.width(el),L=W<500?96:150,R=56,H=176,rows=[['Duration',D.db,D.da,v=>v>=1000?f(v/1000,2)+' ms':f(v,1)+' us',Math.max(D.db,D.da)],
      ['Compute (SM) %',D.cb,D.ca,v=>f(v,1)+'%',100],['Memory %',D.mb,D.ma,v=>f(v,1)+'%',100],[D.p.ev.short,D.eb,D.ea,D.p.ev.fmt,Math.max(D.eb,D.ea,1)]];
    const hl=[0,1,2,2,-1,-1,0][i];let s='';
    rows.forEach((r,j)=>{const y=12+j*40;if(j===hl)s+='<rect x="0" y="'+(y-6)+'" width="'+W+'" height="36" rx="4" style="fill:var(--hl);opacity:.6"/>';
      s+=RD.t(L-6,y+12,RD.esc(r[0]),{a:'end',fs:11});
      const bw=v=>Math.max(1,v/r[4]*(W-L-R));
      if(i>=Math.min(j===3?2:j,j===0?0:1)){s+='<rect x="'+L+'" y="'+y+'" width="'+bw(r[1]).toFixed(1)+'" height="11" rx="2" style="fill:var(--c2)"/>'+RD.t(L+bw(r[1])+4,y+10,r[3](r[1]),{fs:10})}
      if(i>=5){s+='<rect x="'+L+'" y="'+(y+14)+'" width="'+bw(r[2]).toFixed(1)+'" height="11" rx="2" style="fill:var(--c3)"/>'+RD.t(L+bw(r[2])+4,y+24,r[3](r[2]),{fs:10})}});
    s+='<rect x="'+L+'" y="'+(H-12)+'" width="10" height="8" style="fill:var(--c2)"/>'+RD.t(L+14,H-5,'before',{fs:10})+'<rect x="'+(L+70)+'" y="'+(H-12)+'" width="10" height="8" style="fill:var(--c3)"/>'+RD.t(L+84,H-5,'after the fix',{fs:10});
    el.innerHTML=RD.svg(W,H,s,'Nsight Compute report walk');
    const st=steps()[i];cap.innerHTML='<div class="t">Step '+(i+1)+' of 7: '+st[0]+'</div><p>'+st[1]+'</p>';
    cnt.innerHTML=RD.stat('Before',D.p.b,D.B.kernel.match(/\(.*?\) \(.*$/)?RD.esc(D.B.kernel.slice(D.B.kernel.lastIndexOf(') (')+2,D.B.kernel.lastIndexOf(', Context'))):'')+
      RD.stat('After',i>=5?D.p.a:'...','')+RD.stat('Estimated',D.est!=null?f(D.est,2)+'%':'none',D.rule?'rule in '+(D.rule.speedup?'the report':''):'')+RD.stat('Measured',i>=6?f((1-D.da/D.db)*100,Math.abs(1-D.da/D.db)<0.01?2:1)+'% less time':'...','duration before and after');
  }
  const an=RD.anim({card:'rd-walk-card',ctl:'rd-walk-ctl',n:7,ms:2200,draw,label:'Report step'});
  RD.seg(document.getElementById('rd-walk-seg'),v=>{k=+v;D=NCU.pairData(k);an.reset(7);an.play()});
  RD.onResize(()=>an.redraw());
  // anatomy widget
  const EX=[['l1tex','unit: the L1/TEX cache of each SM (others: sm, smsp = SM sub-partition, lts = L2 slice, dram, gpc, gpu)'],['__',''],['data_bank_conflicts_pipe_lsu_mem_shared_op_ld','counter: bank conflicts in the data stage, load/store pipe, shared memory, load operations'],['.sum','roll-up: added over all instances of the unit (all SMs); .avg, .min, .max are the alternatives']];
  const EX2=[['dram','unit: device memory (HBM or GDDR)'],['__',''],['throughput','counter: a throughput metric, the highest % among its constituent counters'],['.avg','roll-up: average over the DRAM instances'],['.pct_of_peak_sustained_elapsed','sub-metric: % of the peak sustained rate over the elapsed cycles (the _active variant uses only cycles the unit was active)']];
  const an2=document.getElementById('rd-anat'),out=document.getElementById('rd-anat-out');
  function anat(){an2.innerHTML=[EX,EX2].map((e,q)=>e.map((p,j)=>p[1]?'<span data-q="'+q+'" data-j="'+j+'">'+p[0]+'</span>':'<b>'+p[0]+'</b>').join('')).join('<i style="flex-basis:100%;height:4px"></i>')}
  anat();an2.addEventListener('click',e=>{const sp=e.target.closest('span[data-j]');if(!sp)return;an2.querySelectorAll('span').forEach(x=>x.classList.toggle('on',x===sp));out.textContent=[EX,EX2][+sp.dataset.q][+sp.dataset.j][1]});
  const p0=NCU.pairData(0),p1=NCU.pairData(1),tb=NCU.byStem('transposeCoalesced');
  Object.assign(window.RDV=window.RDV||{},{n_passes:f(NCU.raw(tb,'profiler__replayer_passes'),0),n_bak:f(NCU.raw(tb,'profiler__replayer_bytes_mem_backed_up.avg'),0),
    w0_est:f(p0.est,2),set_basic:f(PCD.ncu.sets.find(x=>x.id==='basic').metrics,0),set_full:f(PCD.ncu.sets.find(x=>x.id==='full').metrics,0),set_full_n:String(PCD.ncu.sets.find(x=>x.id==='full').sections.length),w0_b:f(p0.db,2),w0_a:f(p0.da,2),w1_est:f(p1.est,2),w1_gain:f((1-p1.da/p1.db)*100,1)});
})();
