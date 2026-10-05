// ---- Reading 4: the softmax ladder (passes over memory) and Boehm's matmul ladder (published GFLOP/s) ----
(function(){
  if(!window.RD||!window.RDC)return;
  const rows=[['Composed from eager ops','max, subtract, exp, sum, divide: five kernels, the intermediates written out and read back',8],
    ['One kernel, three sweeps','read the row for the max, again for the sum, again to normalise, then write',4],
    ['Online softmax','max and sum in one sweep, then read again to normalise and write',3],
    ['Row kept on chip','read once into registers or shared memory, do everything there, write once',2]];
  const P=268435456,BW=3.35e12;
  const tb=document.getElementById('rd-smx-body');
  if(tb)tb.innerHTML=rows.map((r,i)=>'<tr><td><b>'+(i+1)+'. '+r[0]+'</b></td><td>'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num">'+(r[2]*P/BW*1e3).toFixed(2)+' ms</td></tr>').join('');
  const bx=document.getElementById('rd-mm-bars');
  if(bx){const mx=Math.max(...RDC.boehm.map(b=>b[1]));
    bx.innerHTML=RDC.boehm.map(b=>'<div class="row'+(b[0]==='cuBLAS'?' hl':'')+'"><span class="nm" title="'+b[0]+'">'+b[0]+'</span><span class="track"><span class="fill" style="width:'+(100*b[1]/mx).toFixed(1)+'%;background:'+(b[0]==='cuBLAS'?'var(--c4)':'var(--c1)')+'"></span></span><span class="val">'+b[2].toFixed(1)+'%</span></div>').join('')+
      '<div class="small mute" style="margin-top:4px">Bar length: GFLOP/s, from '+RDC.boehm[0][1].toFixed(0)+' (naive) to '+RDC.boehm[RDC.boehm.length-1][1].toFixed(0)+' (cuBLAS); label: share of cuBLAS.</div>';}
  function labBars(id,rows,unit){const el=document.getElementById(id);if(!el)return;const mx=Math.max(...rows.map(r=>r[1]));
    el.innerHTML=rows.map(r=>'<div class="row'+(/MLX/.test(r[0])?' hl':'')+'"><span class="nm" title="'+RD.esc(r[0])+'">'+RD.esc(r[0])+'</span><span class="track"><span class="fill" style="width:'+Math.max(1,100*r[1]/mx).toFixed(1)+'%;background:'+(/MLX/.test(r[0])?'var(--c4)':'var(--c3)')+'"></span></span><span class="val">'+(r[1]<10?r[1].toFixed(2):r[1].toFixed(1))+' '+unit+'</span></div>').join('')+'<div class="small mute" style="margin-top:4px">Bar length: time, shorter is faster. Kernel lab runs, median of 3.</div>'}
  labBars('rd-lab-smx',RDC.lab.softmax,'ms');labBars('rd-lab-mm',RDC.lab.matmul,'ms');
})();
