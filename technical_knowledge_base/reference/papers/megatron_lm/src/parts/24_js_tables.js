// ---- The paper's tables, rebuilt from PAPER.tables (tables.json) and PAPER.rc (recompute.py) ----
(function(){if(!$('t1Tab'))return;
  const B=v=>(v/1e9).toFixed(3)+'B',M=v=>(v/1e6).toFixed(1)+'M';
  // Table 1
  $('t1Tab').innerHTML='<div class="tw"><table><thead><tr><th class="num">Hidden</th><th class="num">Heads</th><th class="num">Layers</th><th class="num">Parameters (printed)</th><th class="num">Recounted</th><th class="num">Model-parallel GPUs</th><th class="num">Fewest under 32 GB</th><th class="num">Model + data GPUs</th></tr></thead><tbody>'+
    T.t1.rows.map(r=>'<tr><td class="num">'+fmt(r.h)+'</td><td class="num">'+r.a+'</td><td class="num">'+r.l+'</td><td class="num">'+r.p+'B</td><td class="num">'+B(RC.gpt_params[r.p])+'</td><td class="num">'+r.mp+'</td><td class="num">'+RC.min_t[r.p]+' ('+RC.mem[r.p][String(RC.min_t[r.p])].toFixed(1)+' GB)</td><td class="num">'+r.dp+'</td></tr>').join('')+'</tbody></table></div>';
  // Table 2
  $('t2Tab').innerHTML='<div class="tw"><table><thead><tr><th>Parameters</th><th class="num">Layers</th><th class="num">Hidden</th><th class="num">Heads</th><th class="num">Per head</th><th class="num">GPUs</th><th class="num">Days per epoch</th><th class="num">Recounted</th><th class="num">Implied PFLOP/s</th><th class="num">Per GPU, TFLOP/s</th><th class="num">300k iterations, days</th></tr></thead><tbody>'+
    T.t2.rows.map(r=>{const x=RC.t2[r.p];return '<tr><td>'+r.p+'</td><td class="num">'+r.l+'</td><td class="num">'+fmt(r.h)+'</td><td class="num">'+r.a+'</td><td class="num">'+r.hd+'</td><td class="num">'+r.gpus+'</td><td class="num">'+r.days+'</td><td class="num">'+(RC.gpt_params_t2[r.p]>1e9?B(RC.gpt_params_t2[r.p]):M(RC.gpt_params_t2[r.p]))+'</td><td class="num">'+x.pflops.toFixed(1)+'</td><td class="num">'+x.tflops_gpu.toFixed(1)+'</td><td class="num">'+x.train_days.toFixed(1)+'</td></tr>'}).join('')+'</tbody></table></div>';
  // Figure 5, Table 7, Table 8
  let ek='f5';function eff(){const host=$('effSvg');
    if(ek==='f5'){drawF5(host);$('effNote').innerHTML='Labels as printed on Figure 5 (from the PDF). PFLOP/s derived as efficiency × <i>n</i> × 39 TFLOP/s: 0.24 at 8 GPUs, 14.8 at 512. The abstract\'s 15.1 PFLOP/s ÷ (512 × 39) is '+(RC.eff_from_15_1*100).toFixed(1)+'%, the "76%" (see the box in the Results section of The paper tab).';return}
    const rows=ek==='t7'?T.t7.rows.map(r=>[r.a+' heads of '+r.hd,r.eff/100]):T.t8.rows.map(r=>[r.n+' GPU'+(r.n>1?'s':''),+r.s/r.n,r.s]);
    fit(host,w=>{const pl=8,lw=Math.min(130,w*.36),X=v=>pl+lw+(w-pl-lw-50)*v;let q='',y=6;
      rows.forEach(r=>{q+=tx(pl,y+14,r[0],{fs:12})+rc(X(0),y+3,X(r[1])-X(0),16,'var(--c1)',{r:2})+tx(X(r[1])+4,y+15,Math.round(r[1]*100)+'%'+(r[2]?' ('+r[2]+'×)':''),{fs:11});y+=26});
      host.innerHTML=svgW(w,y+6,q,ek==='t7'?'Table 7':'Table 8')});
    $('effNote').innerHTML=ek==='t7'?'8.3B parameters, 8-way model parallel, heads varied with the hidden size fixed at 3,072 (%A4%). More heads mean smaller GEMMs and a larger softmax, so efficiency drops slightly; the trained 8.3B used 24 heads, the scaling study 32.':'The 1.2B model at a fixed batch of 8 (%A4%); efficiency is speedup ÷ GPUs. Doubling to 2 GPUs makes training 64% faster; by 8 GPUs each extra GPU adds little.';
    $('effNote').innerHTML=$('effNote').innerHTML.replace('%A4%','<a href="'+PAPER.meta.ax+'#A4" target="_blank" rel="noopener noreferrer">Appendix D</a>')}
  segOn('effK',m=>{ek=m;$('effSvg').__lw=-1;eff()});
  // Table 3
  let k3='wt';function t3(){fit($('t3Svg'),w=>{const rows=T.t3.rows,mx=k3==='wt'?20:70,pl=8,lw=Math.min(130,w*.36),X=v=>pl+lw+(w-pl-lw-56)*v/mx;let q='',y=6;
      rows.forEach(r=>{const v=+r[k3];q+=tx(pl,y+14,r.m,{fs:12,w:r.m==='8.3B'?600:null})+rc(X(0),y+3,X(v)-X(0),16,r.prior?'var(--mute)':'var(--c1)',{r:2})+tx(X(v)+4,y+15,r[k3]+(k3==='lam'?'%':''),{fs:11});y+=26});
      $('t3Svg').innerHTML=svgW(w,y+6,q,'Table 3')})}
  segOn('t3K',m=>{k3=m;$('t3Svg').__lw=-1;t3()});
  // Table 4
  $('t4Tab').innerHTML='<div class="tw"><table><thead><tr><th>Parameters (printed)</th><th class="num">Layers</th><th class="num">Hidden</th><th class="num">Heads</th><th class="num">GPUs</th><th class="num">Recounted</th></tr></thead><tbody>'+
    T.t4.rows.map(r=>'<tr><td>'+r.p+'</td><td class="num">'+r.l+'</td><td class="num">'+fmt(r.h)+'</td><td class="num">'+r.a+'</td><td class="num">'+r.gpus+'</td><td class="num">'+(RC.bert_params[r.p]>1e9?B(RC.bert_params[r.p]):M(RC.bert_params[r.p]))+'</td></tr>').join('')+'</tbody></table></div>';
  // Table 5
  let k5='race';const first=v=>v==null?null:parseFloat(String(v).split(/[ /(]/)[0]);
  function t5(){const rows=T.t5.rows.filter(r=>r[k5]!=null).slice().sort((a,b)=>first(b[k5])-first(a[k5]));
    const best=ens=>Math.max(...T.t5.rows.filter(r=>!r.meg&&!!r.ens===ens&&r[k5]!=null).map(r=>first(r[k5])));
    $('t5Tab').innerHTML='<div class="tw"><table><thead><tr><th>Model</th>'+T.t5.cols.map(c=>'<th class="num">'+c[1]+'</th>').join('')+'<th class="num">Against best other</th></tr></thead><tbody>'+
      rows.map(r=>{const b=best(!!r.ens),d=first(r[k5])-b;return '<tr'+(r.meg&&d>0?' class="best"':'')+'><td'+(r.meg?' class="meg"':'')+'>'+r.m+'</td>'+T.t5.cols.map(c=>'<td class="num"'+(c[0]===k5?' style="font-weight:600"':'')+'>'+(r[c[0]]==null?'':r[c[0]])+'</td>').join('')+'<td class="num">'+(r.meg?(d>0?'+':'')+d.toFixed(1):'')+'</td></tr>'}).join('')+'</tbody></table></div>'}
  segOn('t5K',m=>{k5=m;t5()});
  // Table 6
  $('t6Tab').innerHTML='<div class="tw"><table><thead><tr><th>Task</th><th>Model</th><th class="num">Batch size</th><th class="num">Learning rate</th><th class="num">Epochs</th></tr></thead><tbody>'+T.t6.rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num">'+r[3]+'</td><td class="num">'+r[4]+'</td></tr>').join('')+'</tbody></table></div><p class="small mute">'+T.t6.note+'</p>';
  onTab('t-tables',()=>{eff();t3();t5()})})();
