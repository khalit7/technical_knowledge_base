// ---- Part 3 Run it: the benchmark table with every sample ----
(function(){
  const X=window.CLX,CL=X.CL,TAB='t-cl-run',fmt=X.fmt;
  if(!document.getElementById(TAB)||!CL.bench)return;
  function draw(){const el=document.getElementById('rn-bench');if(!el)return;const B=CL.bench;
    const rows=[].concat(B.cpu.map(r=>['CPU Q8_0',r]),B.q4.map(r=>['CPU Q4_0',r]),B.metal.map(r=>['Metal Q8_0',r]));
    el.innerHTML='<table class="cl-t"><thead><tr><th>Where</th><th class="num">Threads</th><th>Repack</th><th>Test</th><th class="num">Median t/s</th><th>All 5 runs (t/s)</th></tr></thead><tbody>'+
      rows.map(([w,r])=>'<tr><td>'+w+'</td><td class="num">'+r.t+'</td><td>'+(r.ngl>0?'n/a':(r.rp?'on':'off'))+'</td><td>'+(r.test==='pp'?'prompt 64':'gen 32')+'</td><td class="num"><b>'+fmt(r.med,0)+'</b></td><td class="small">'+r.s.map(s=>Math.round(s)).join(' ')+'</td></tr>').join('')+'</tbody></table>'}
  X.onRender(TAB,draw);
})();
