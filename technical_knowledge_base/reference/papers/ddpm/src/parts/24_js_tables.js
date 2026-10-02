// ---- Tables tab: Tables 1 to 4 from tables.json, sortable, with derived columns; recompute.py's checks ----
(function(){const TB=window.PAPER.tables,num=s=>{const m=String(s).replace('≤','').match(/-?\d+(\.\d+)?/);return m?+m[0]:NaN};
  const sub=s=>String(s).replace(/L_simple/g,'L<sub>simple</sub>').replace(/Σ/g,'Σ');
  // Table 1
  let s1={k:null,d:1};
  function t1(){const g=$('t1G').value,D=$('t1D').value,ref=D==='fid'?3.17:3.75;let R=TB.T1.rows.filter(r=>g==='all'||r.g===g);
    if(s1.k)R=R.slice().sort((a,b)=>{const x=num(a[s1.k]),y=num(b[s1.k]);if(isNaN(x)&&isNaN(y))return 0;if(isNaN(x))return 1;if(isNaN(y))return -1;return s1.d*(x-y)});
    const th=(k,l)=>'<th class="s" data-k="'+k+'">'+l+(s1.k===k?(s1.d>0?' ▲':' ▼'):'')+'</th>';
    let h='<table class="dt"><thead><tr><th>Model</th><th>Group</th>'+th('is','IS')+th('fid','FID')+th('nll','NLL test (train)')+'<th>Δ '+(D==='fid'?'FID':'NLL')+'</th></tr></thead><tbody>';
    R.forEach(r=>{const b=k=>(r.b||[]).indexOf(k)>=0?'<b>'+r[k]+'</b>':r[k];const v=num(r[D]);
      h+='<tr'+(r.ours?' class="ours"':'')+'><td>'+sub(r.m)+'</td><td class="small">'+r.g+'</td><td class="n">'+b('is')+'</td><td class="n">'+b('fid')+'</td><td class="n">'+b('nll')+'</td><td class="n">'+(isNaN(v)?'':(v-ref>=0?'+':'−')+Math.abs(v-ref).toFixed(2))+'</td></tr>'});
    $('t1').innerHTML=h+'</tbody></table>';$('t1').querySelectorAll('th.s').forEach(e=>e.addEventListener('click',()=>{const k=e.dataset.k;s1.d=s1.k===k?-s1.d:1;s1.k=k;t1()}))}
  $('t1G').addEventListener('change',t1);$('t1D').addEventListener('change',t1);t1();
  // Table 2 with the toy
  {const V=TOY.variants;let h='<table class="dt"><thead><tr><th>Predicts</th><th>Objective</th><th>IS</th><th>FID</th><th>Toy: on the roll</th><th>Toy: test bound (bits/dim)</th></tr></thead><tbody>';
    TB.T2.rows.forEach(r=>{const v=r.toy&&V[r.toy];h+='<tr'+(r.b?' class="ours"':'')+'><td>'+(r.p==='mu'?'μ̃':'ε')+'</td><td>'+sub(r.obj)+'</td><td class="n">'+(r.b?'<b>'+r.is+'</b>':r.is)+'</td><td class="n">'+(r.b?'<b>'+r.fid+'</b>':r.fid)+'</td><td class="n">'+(v?pct(v.beta.on_roll):'not trained')+'</td><td class="n">'+(v?v.test_bpd.toFixed(3):'')+'</td></tr>'});
    $('t2').innerHTML=h+'</tbody></table>'}
  // Table 3: best per column outlined, and our gap to the best
  {const R=TB.T3.rows,best=[1,2,3].map(c=>Math.min(...R.map(r=>num(r[c])).filter(v=>!isNaN(v))));
    let h='<table class="dt"><thead><tr>'+TB.T3.cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>';
    R.forEach(r=>{const o=/Ours/.test(r[0]);h+='<tr'+(o?' class="ours"':'')+'><td>'+sub(r[0])+'</td>'+[1,2,3].map(c=>{const v=num(r[c]);return '<td class="n"'+(v===best[c-1]?' style="outline:2px solid var(--good);outline-offset:-2px"':'')+'>'+r[c]+(o&&!isNaN(v)?' <span class="mute small">(+'+(v-best[c-1]).toFixed(2)+')</span>':'')+'</td>'}).join('')+'</tr>'});
    $('t3').innerHTML=h+'</tbody></table><p class="small mute">In brackets: our FID minus the best in the column.</p>'}
  // Table 4 with derived shares, and the chart
  {const R=TB.T4.rows.map(r=>r.map(Number)),fin=R[0][1],d100=R[R.length-1][2];
    let h='<table class="dt"><thead><tr><th>Reverse time T − t + 1</th><th>Rate (bits/dim)</th><th>Distortion (RMSE, 0 to 255)</th><th>Share of final rate</th><th>Distortion left (of step 100)</th></tr></thead><tbody>';
    TB.T4.rows.forEach((r,i)=>{h+='<tr><td class="n">'+r[0]+'</td><td class="n">'+r[1]+'</td><td class="n">'+r[2]+'</td><td class="n">'+pct(R[i][1]/fin)+'</td><td class="n">'+pct(R[i][2]/d100)+'</td></tr>'});
    $('t4').innerHTML=h+'</tbody></table>';
    onTab('t-tables',()=>fit($('t4c'),w=>{const P=R.slice().reverse();$('t4c').innerHTML=lineChart(w,{x:[0,1.8],y:[0,80],h:230,xt:[[0,'0'],[.5,'0.5'],[1,'1'],[1.5,'1.5']],yt:[[0,'0'],[20,'20'],[40,'40'],[60,'60'],[80,'80']],xl:'rate (bits per dimension)',yl:'distortion (RMSE)',
      series:[{pts:P.map(r=>[r[1],r[2]]),c:'var(--c1)',n:'Table 4 (CIFAR10 test set)',dots:true,tip:p=>'rate '+p[0]+', RMSE '+p[1]}],label:'Table 4 as Figure 5'})}))}
  // checks
  {let h='<table class="dt"><thead><tr><th>What</th><th>Recomputed</th><th>Printed</th><th></th></tr></thead><tbody>';
    RC.checks.forEach(c=>{const f=v=>Math.abs(v)<1e-3&&v!==0?sci(v,1):(+v).toFixed(Math.abs(v)<10?3:1);h+='<tr><td>'+sub(c.what.replace(/_/g,' ').replace('L simple','L_simple'))+'</td><td class="n">'+f(c.recomputed)+'</td><td class="n">'+f(c.printed)+'</td><td>'+(c.ok?'<span class="ok2">matches</span>':'<span class="no2">differs</span>')+'</td></tr>'});
    $('tchk').innerHTML=h+'</tbody></table><p class="small mute">The <i>L<sub>T</sub></i> check depends on an illustrative mean square of the pixels (0.25), which the paper does not give; with any value between 0 and 1 it is between '+sci(RC.schedule.LT_bits_per_dim_x0_0,0)+' and '+sci(RC.schedule.LT_bits_per_dim_x0_pm1,1)+' bits, consistent with "≈ 10<sup>−5</sup>". Toy rows: the bound equals its rate plus distortion exactly, a check of the evaluation code.</p>'}
})();
