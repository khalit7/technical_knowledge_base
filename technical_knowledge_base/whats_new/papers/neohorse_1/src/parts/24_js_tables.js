// ---- Tables tab ----
(function(){
  let tr='t1',view='s',sortK='avg';
  const sel=$('tbS');sel.innerHTML='<option value="avg">Average</option>'+TB.bench.map((b,i)=>'<option value="'+i+'">'+b.n+'</option>').join('');
  function render(){const T=TB[tr],base=T.rows.find(r=>r.role==='base');
    const rows=T.rows.slice().sort((a,b)=>sortK==='avg'?b.avg-a.avg:b.v[+sortK]-a.v[+sortK]);
    const best=TB.bench.map((b,i)=>Math.max(...T.rows.map(r=>r.v[i]))),bestA=Math.max(...T.rows.map(r=>r.avg));
    const cell=(v,p,isBest,bv)=>{if(view==='d'){const d=v-bv;return '<td class="num"'+(d<0?' style="color:var(--bad)"':'')+'>'+(Math.abs(d)<.005?'0.00':(d>0?'+':'')+d.toFixed(2))+'</td>'}return '<td class="num">'+(isBest?'<b>'+p+'</b>':p)+'</td>'};
    let h='<thead><tr><th>Model</th>'+TB.bench.map(b=>'<th class="num">'+b.n+'<br><span class="mute small">'+b.runs+'</span></th>').join('')+'<th class="num">Avg.</th></tr></thead><tbody>';
    rows.forEach(r=>{h+='<tr'+(r.role==='ours'?' class="basec"':'')+'><td>'+(r.role==='ours'?'<b>'+r.m+'</b>':r.m)+(r.role==='base'?' <span class="mute small">(base)</span>':r.role==='ref'?' <span class="mute small">(30B reference)</span>':'')+'</td>';
      r.v.forEach((v,i)=>{h+=cell(v,r.p[i]+(r.star[i]?'∗':''),v===best[i],base.v[i])});
      h+=cell(r.avg,r.avg_p,r.avg===bestA,base.avg)+'</tr>'});
    $('tbl').innerHTML=h+'</tbody>';
    $('tblNote').innerHTML=view==='d'?'Each cell minus the same-size Qwen3.5 base. NeoHorse-1 is the only model here post-trained from that base; the others are independent models, so their differences say how far they sit from it, not what any training did.':
      'Run counts are from §5: one run for PinchBench and VitaBench, the mean of three for QwenClawBench, WorkBuddy Bench and τ²-Bench, the official protocol for the rest. Averages recomputed: all twelve match the plain mean of the ten columns.'}
  segBind('tbT',m=>{tr=m;render()});segBind('tbV',m=>{view=m;render()});sel.addEventListener('change',()=>{sortK=sel.value;render()});
  onTab('t-tables',render);

  // Table 3 with the base, the released model and Figure 7
  const ci=TB.t3.cols.map(k=>TB.bench.findIndex(b=>b.k===k)),nm=TB.t3.cols.map(k=>TB.bench.find(b=>b.k===k).n);
  const b4=rowOf('t1','Qwen3.5-4B'),n4=rowOf('t1','NeoHorse-1-4B');
  let h='<thead><tr><th>Run</th>'+nm.map(n=>'<th class="num">'+n+'</th>').join('')+'<th class="num">Avg.</th><th class="num">vs base</th></tr></thead><tbody>';
  const base5=RCD.base5;
  const line=(n,vals,avg,it)=>'<tr><td>'+(it?'<i>'+n+'</i>':n)+'</td>'+vals.map(v=>'<td class="num">'+(v==null?'':v.toFixed(2))+'</td>').join('')+'<td class="num">'+avg.toFixed(2)+'</td><td class="num"'+(avg<base5?' style="color:var(--bad)"':'')+'>'+(Math.abs(avg-base5)<.005?'0.00':(avg>base5?'+':'')+(avg-base5).toFixed(2))+'</td></tr>';
  h+=line('Qwen3.5-4B, untrained (Table 1)',ci.map(i=>b4.v[i]),base5,1);
  h+=line('Public agent data (Toucan)',TB.t3.rows[0].v.slice(0,5),TB.t3.rows[0].v[5]);
  h+=line('Routing-harness data',TB.t3.rows[1].v.slice(0,5),TB.t3.rows[1].v[5]);
  TB.fig7.points.forEach((p,j)=>{h+=line('Figure 7 run '+(j+1)+', '+p.tokens_M.toFixed(2)+'M tokens'+(j===1?' (= Table 3 harness run)':''),[null,null,null,null,null],p.avg,1)});
  h+=line('NeoHorse-1-4B, released (Table 1)',ci.map(i=>n4.v[i]),RCD.fin5,1);
  $('t3').innerHTML=h+'</tbody>';

  // sizes
  const SZ=[['he','HumanEval',164,'87.20 = 143/164; 96.95 = 159/164'],['lcb','LiveCodeBench v6',175,'53.71 = 94/175; 59.43 = 104/175; Nanbeige\'s starred 72.50 is not k/175'],['ifb','IFBench',300,'60.33 = 181/300; 65.33 = 196/300'],['ife','IFEval',541,'87.06 = 471/541; 88.35 = 478/541'],['vita','VitaBench',400,'every score a multiple of 0.25: 21.50 = 86/400; 32.00 = 128/400']];
  $('szT').innerHTML='<thead><tr><th>Benchmark</th><th class="num">n</th><th>Examples</th><th class="num">4B SE</th><th class="num">9B SE</th></tr></thead><tbody>'+SZ.map(([k,n,c,e])=>'<tr><td>'+n+'</td><td class="num">'+c+'</td><td class="small">'+e+'</td><td class="num">'+RCD.se[k+'4'].se.toFixed(2)+'</td><td class="num">'+RCD.se[k+'9'].se.toFixed(2)+'</td></tr>').join('')+'</tbody>';

  // checks
  $('ckL').innerHTML='<ul class="tight">'+RCD.checks.map(c=>'<li>'+(c.ok?'<span class="ok">✓</span> ':'<span class="no">✗</span> ')+'<b>'+c.name+'</b>: '+c.detail+(c.at&&c.at!=='derived'?' ('+A(PAPER.meta.ax+'#'+c.at,c.at)+')':' (derived)')+'</li>').join('')+'</ul>';
})();
