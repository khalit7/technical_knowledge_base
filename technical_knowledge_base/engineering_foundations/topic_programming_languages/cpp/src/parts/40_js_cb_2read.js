// ---- Part 2 Reading tab: tables and derived numbers computed from window.CB ----
(function(){
  const X=window.CBX,CB=X.CB,f=X.fmt,$=id=>document.getElementById(id);
  if(!CB.ladder)return;
  const sz=kb=>kb>=1048576?(kb/1048576)+' GB':kb>=1024?(kb/1024)+' MB':kb+' KB';
  // latency ladder table: chosen sizes, run 1 with the range of the three runs
  const pick=[16,96,192,1024,4096,8192,16384,65536,524288];
  const R=CB.ladder.random,S=CB.ladder.seq;
  const at=(run,kb)=>{const p=run.pts.find(q=>q[0]===kb);return p?p[1]:NaN};
  const lev=kb=>kb<=128?'L1':kb<=6144?'L2':kb<=32768?'L2, SLC, DRAM':'DRAM';
  let h='<thead><tr><th class="num">Buffer</th><th>Lives in</th><th class="num">Random order, ns per load</th><th class="num">3 runs</th><th class="num">In address order</th></tr></thead><tbody>';
  pick.forEach(kb=>{const v=R.map(r=>at(r,kb));h+='<tr><td class="num">'+sz(kb)+'</td><td>'+lev(kb)+'</td><td class="num"><b>'+f(v[0])+'</b></td><td class="num">'+f(Math.min(...v))+' to '+f(Math.max(...v))+'</td><td class="num">'+f(at(S[0],kb))+'</td></tr>'});
  $('cb-ladtab').innerHTML=h+'</tbody>';
  // dot product table
  const D=CB.dot.v,rows=[['scalar','scalar loop, vectorisation disabled'],['auto','plain loop, -O2'],['fm','plain loop, -O2 -ffast-math'],['neon','NEON intrinsics, 4 accumulators']];
  let d='<thead><tr><th>Version</th><th class="num">In L1, ns/element</th><th class="num">vs scalar</th><th class="num">From DRAM, ns/element</th><th class="num">GB/s</th></tr></thead><tbody>';
  rows.forEach(([k,lab])=>{const l=D['l1_'+k],m=D['dram_'+k];d+='<tr><td>'+lab+'</td><td class="num"><b>'+f(l.runs[0])+'</b> <span class="mute small">('+f(l.min)+' to '+f(l.max)+')</span></td><td class="num">'+f(D.l1_scalar.runs[0]/l.runs[0],1)+'x</td><td class="num">'+f(m.runs[0])+'</td><td class="num">'+f(8/m.runs[0],0)+'</td></tr>'});
  $('cb-dottab').innerHTML=d+'</tbody>';
  // latency model: cycles per element on the critical path
  const ghz=3/D.l1_auto.runs[0];$('cb-ghz').textContent=f(ghz,2);
  const model=[['scalar','one fmadd chain: 4 cycles per element',4],['auto','one fadd chain: 3 cycles per element',3],['neon','4 chains of fmla.4s, each step covers 16 elements: 4 cycles / 16',4/16]];
  let m='<thead><tr><th>Loop</th><th>Critical path</th><th class="num">Predicted ns/element (3.2 GHz)</th><th class="num">Measured</th></tr></thead><tbody>';
  model.forEach(([k,txt,c])=>{m+='<tr><td>'+k+'</td><td>'+txt+'</td><td class="num">'+f(c/3.2)+'</td><td class="num">'+f(D['l1_'+k].runs[0])+'</td></tr>'});
  $('cb-dotmodel').innerHTML=m+'</tbody>';
  // branch misprediction cost (derived)
  const B=CB.br_keep.v,mis=(B.u.runs[0]-B.s.runs[0])/0.5;$('cb-mispns').textContent=f(mis,1);$('cb-mispcyc').textContent=f(mis*3.2,0);
  // roofline table
  const V=CB.roof.v,row=(lab,k,unit)=>'<tr><td>'+lab+'</td><td class="num"><b>'+f(V[k].runs[0],1)+'</b> '+unit+'</td><td class="num">'+f(V[k].min,1)+' to '+f(V[k].max,1)+'</td></tr>';
  $('cb-rooftab').innerHTML='<thead><tr><th>Measurement</th><th class="num">Run 1</th><th class="num">3 runs</th></tr></thead><tbody>'+
    row('Peak FMA, 1 thread','p1','GFLOP/s')+row('Peak FMA, 8 threads','p8','GFLOP/s')+row('Read bandwidth, 1 thread','bw1','GB/s')+row('Read bandwidth, 8 threads','bw8','GB/s')+
    row('Matrix-vector 8192 x 8192 fp32, 1 thread (I = 0.5)','mv1','GFLOP/s')+row('Matrix-vector, 8 threads','mv8','GFLOP/s')+
    row('Matrix-matrix 512 x 512, tiled, 1 thread (I about 85)','mm1','GFLOP/s')+row('Matrix-matrix, 8 threads','mm8','GFLOP/s')+'</tbody>';
  const bw=V.bw8.med;$('cb-tok16').textContent=f(bw/16,1);$('cb-tok4').textContent=f(bw/4.5,0);
})();
