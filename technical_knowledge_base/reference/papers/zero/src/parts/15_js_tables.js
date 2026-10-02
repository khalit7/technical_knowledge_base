// ---- The paper's tables, rebuilt ----
(function(){
const AXL=(at,t)=>A(PAPER.meta.ax+'#'+at,t);
// calculator
function calc(){const psi=+$('cP').value*1e9,nd=+$('cN').value,nm=+$('cM').value,mem=+$('cG').value*1e9,k=+$('cK').value;$('cKv').textContent=k;
  fit($('cSvg'),w=>{const lw=Math.min(118,w*.3),bw=w-lw-60,vals=STAGES.map(st=>zStates(psi/nm,nd,st,k)),mx=Math.max(mem*1.15,...vals.map(v=>Math.min(v,mem*4)));
    const sc=v=>Math.min(bw,bw*v/mx),rh=22;let s='';
    STAGES.forEach((st,i)=>{const y=i*(rh+12),v=vals[i],fits=v<=mem;s+=tx(0,y+15,SSHORT[st],{fs:12,w:600});
      const [p,g,o]=zParts(psi/nm,nd,st,k);let cum=0;[[p,COL.p],[g,COL.g],[o,COL.o]].forEach(([q,c])=>{const xa=lw+sc(cum),xb=lw+sc(cum+q);if(xb>xa)s+=rc(xa,y,Math.max(1,xb-xa),rh,c,{r:0});cum+=q});
      if(v>mx)s+=tx(lw+bw-2,y+15,'off scale',{fs:11,a:'end',c:'var(--bg)',w:600});
      s+=tx(lw+sc(v)+4,y+15,gb(v)+' GB',{fs:11,c:fits?'var(--good)':'var(--bad)',w:600})});
    const xm=lw+sc(mem);s+=ln2(xm,-2,xm,4*(rh+12)-8,'var(--ink)',{da:'4 3'})+tx(Math.min(xm,w-4),4*(rh+12)+4,(+$('cG').value)+' GB per GPU',{fs:11,a:'end',c:'var(--mute)'});
    $('cSvg').innerHTML=svgW(w,4*(rh+12)+10,s,'Model states per GPU by stage')});
  $('cO').innerHTML=STAGES.map(st=>stat('Largest model, '+SSHORT[st],psiTxt(zMax(mem,nd,nm,st,k)),'model states only, '+(nd*nm)+' GPUs')).join('');
  const t1=psi===7.5e9&&nd===64&&nm===1&&mem===32e9&&k===12;
  $('cRep').innerHTML=(t1?'<b>Defaults reproduce</b> Table 1\'s 7.5B row at N<sub>d</sub> = 64 (120, 31.4, 16.6, 1.88 GB) and Table 2\'s first row (2B, 7.6B, 14.4B, 128B), independently from the formulas. ':'')+'With N<sub>m</sub> &gt; 1 each model-parallel rank holds Ψ/N<sub>m</sub>, so memory falls by N<sub>d</sub> × N<sub>m</sub> at ZeRO-3 (§1). '+AXL('S5.T1','Table 1')+', '+AXL('S7.T2','Table 2')+'.'}
['cP','cN','cM','cG','cK'].forEach(id=>{$(id).addEventListener('input',calc);$(id).addEventListener('change',calc)});
// Table 1
let t1v='p';
function t1(){const T=TBL.t1,R=RC.t1.cells,st=['os','os_g','os_g_p'],bold=new Set(T.bold.map(b=>b.join('|')));
  let h='<thead><tr><th rowspan="2">N<sub>d</sub></th>'+T.models.map(m=>'<th colspan="3" style="text-align:center">'+m+' model (GB)</th>').join('')+'</tr><tr>'+T.models.map(()=>st.map(s=>'<th>'+SSHORT[s]+'</th>').join('')).join('')+'</tr></thead><tbody>';
  T.nd.forEach((nd,ri)=>{h+='<tr><th>'+nd+'</th>';T.models.forEach((m,mi)=>st.forEach((s,si)=>{const c=R.find(x=>x.model===m&&x.nd===nd&&x.stage===s),pr=T.cells[ri][mi*3+si];
    const v=t1v==='p'?pr:t1v==='c'?fmt(c.computed,c.computed<10?2:1):(c.computed===+pr?'0':(+pr-c.computed>0?'+':'')+fmt(+pr-c.computed,3));
    h+='<td class="'+(c.fits32?'fit ':'')+(bold.has(m+'|'+s+'|'+nd)?'bold ':'')+(c.how==='truncated'?'tr':'')+'" title="printed '+pr+', recomputed '+c.computed+' ('+c.how+')">'+v+'</td>'}));h+='</tr>'});
  $('t1T').innerHTML=h+'</tbody>';
  $('t1Rep').innerHTML='<b>'+RC.t1.match+' of '+RC.t1.n+' cells reproduce</b> independently from §5\'s formulas with GB = 10<sup>9</sup> bytes; '+RC.t1.truncated+' of them (in orange) only if the printed value was truncated rather than rounded (for example 1T at N<sub>d</sub> = 64 is 2,218.75 GB, printed 2218). Green cells fit a 32 GB V100 on model states alone. Bold is the paper\'s, and it marks exactly the <b>smallest DP degree at which each model and stage first fits</b>'+(RC.t1.bold_is_first_fit?' (checked for all five)':'')+'. Note 128B with ZeRO-3 at 64 GPUs is exactly 32 GB, leaving nothing for activations. '+AXL('S5.T1','Table 1 in the paper')+'.'}
segBind('t1V',m=>{t1v=m;t1()});
// Table 2
function t2(){const R=RC.t2.rows;let h='<thead><tr><th>MP</th><th>GPUs</th><th>Baseline</th><th>ZeRO-1</th><th>ZeRO-2</th><th>ZeRO-3</th><th>Measured baseline</th><th>Measured ZeRO-1</th></tr></thead><tbody>';
  TBL.t2.rows.forEach((r,i)=>{const c=R[i];h+='<tr><td>'+r.mp+'</td><td>'+r.gpus+'</td>'+['baseline','os','os_g','os_g_p'].map(k=>'<td class="'+(c[k].how==='exact'?'':'tr')+'" title="recomputed '+c[k].computed_B+'B ('+c[k].how+')">'+r[k]+'</td>').join('')+'<td>'+r.meas_base+' <span class="mute">('+fmt(c.measured_baseline_ratio*100,0)+'%)</span></td><td class="bold">'+r.meas_os+' <span class="mute">('+fmt(c.measured_ratio*100,0)+'%)</span></td></tr>'});
  $('t2T').innerHTML=h+'</tbody>';
  $('t2Rep').innerHTML='<b>'+RC.t2.match+' of '+RC.t2.n+' theoretical cells reproduce</b>: 32 GB divided by each stage\'s bytes per parameter at N<sub>d</sub> = GPUs / MP = 64, times MP. The '+RC.t2.scaled+' in orange match only as the paper computed them, by multiplying the rounded 64-GPU value by MP (7.6B × 4 = 30.4B, where the formula gives 30.57B). Measured sizes, in brackets as a share of the bound: ZeRO-1 reaches 81 to 82% and the baseline 62 to 65%; the paper calls this a match ("realistic upper bounds"). '+AXL('S7.T2','Table 2 in the paper')+'.'}
// Table 3 and Figure 6
function t3(){const F=RC.fig6,cfg=TBL.t3.rows;
  fit($('f6Svg'),w=>{const H=180,pl=40,pb=40,pt=12,bw=(w-pl-8)/5,mx=160;let s='';
    [0,50,100,150].forEach(v=>{const y=pt+(H-pt-pb)*(1-v/mx);s+=ln2(pl,y,w-4,y,'var(--line)')+tx(pl-6,y+4,v+'B',{fs:11,a:'end',c:'var(--mute)'})});
    F.forEach((r,i)=>{const x=pl+i*bw+bw*.2,hh=(H-pt-pb)*r.size_B/mx,y=H-pb-hh;s+=rc(x,y,bw*.6,hh,r.stage==='os'?'var(--c4)':'var(--c1)',{r:3});
      s+=tx(x+bw*.3,y-4,r.size_B+'B',{fs:11,a:'middle',w:600})+tx(x+bw*.3,H-pb+14,r.c,{fs:11,a:'middle'})+tx(x+bw*.3,H-pb+28,r.stage==='os'?'Pos':'Pos+g',{fs:11,a:'middle',c:'var(--mute)'})});
    $('f6Svg').innerHTML=svgW(w,H,s,'Figure 6: largest model per ZeRO configuration')});
  let h='<thead><tr><th>Config</th><th>ZeRO-DP</th><th>ZeRO-R</th><th class="num">Largest model</th><th class="num">Recounted</th><th class="num">Model states per GPU</th></tr></thead><tbody>';
  cfg.forEach((c,i)=>{const r=F[i];h+='<tr><td>'+c[0]+'</td><td>'+c[1]+'</td><td>'+c[2]+'</td><td class="num">'+r.size_B+'B</td><td class="num">'+fmt(r.recount_B,1)+'B</td><td class="num">'+fmt(r.states_GB,1)+' GB</td></tr>'});
  $('t3T').innerHTML=h+'</tbody>'}
// configurations
function t4(){const T=RC.t4,f=(l,hd)=>T.find(r=>r.layers===l&&r.hidden===hd).recount_B;
  $('t4a').textContent=fmt(f(88,4096),1);$('t4b').textContent=fmt(f(132,4096),1);
  const c5=RC.configs.filter(r=>r.at==='A0.T5'&&r.hidden===6144);$('t4c').textContent=fmt(c5[0].recount_B,1);$('t4d').textContent=fmt(c5.find(r=>r.layers===132).recount_B,1);
  $('t4e').textContent=fmt(RC.configs.find(r=>r.label==='1.38B').recount_B,2);
  let h='<thead><tr><th>Table 4 row</th><th>Used in</th><th class="num">Layers</th><th class="num">Hidden</th><th class="num">Recounted</th></tr></thead><tbody>';
  T.forEach(r=>{const bad=r.label==='40B-60B';h+='<tr'+(bad?' style="color:var(--bad)"':'')+'><td>'+r.label+'</td><td>'+r.fig+'</td><td class="num">'+r.layers+'</td><td class="num">'+fmt(r.hidden)+'</td><td class="num">'+fmt(r.recount_B,2)+'B'+(bad?' (misprint)':'')+'</td></tr>'});
  $('t4T').innerHTML=h+'</tbody>'}
function ap(){const F=$('apF').value,R=RC.configs.filter(r=>F==='all'||r.fig===F);
  let h='<thead><tr><th>Figure</th><th>Size</th><th>Who</th><th class="num">GPUs</th><th class="num">MP</th><th class="num">Layers</th><th class="num">Hidden</th><th class="num">Batch</th><th class="num">Total batch</th><th class="num">Recounted</th></tr></thead><tbody>';
  R.forEach(r=>{const off=Math.abs(r.off_pct)>5;h+='<tr'+(off?' style="color:var(--bad)"':'')+'><td>'+r.fig+'</td><td>'+r.label+'</td><td>'+r.who+'</td><td class="num">'+r.gpus+'</td><td class="num">'+r.mp+'</td><td class="num">'+r.layers+'</td><td class="num">'+fmt(r.hidden)+'</td><td class="num">'+r.batch+'</td><td class="num">'+fmt(r.total_batch)+'</td><td class="num" title="'+r.nearer+'">'+fmt(r.nearer==='with embeddings'?r.recount_B:r.core_B,2)+'B ('+(r.off_pct>0?'+':'')+fmt(r.off_pct,1)+'%)</td></tr>'});
  $('apT').innerHTML=h+'</tbody>'}
$('apF').addEventListener('change',ap);
// every number in the text
function ck(){const r=RC,ok='<td class="okc">yes</td>',ro='<td class="okc">rounded</td>',pa='<td class="noc">partly</td>',no='<td class="noc">no</td>',z=window.__zeroCheck?__zeroCheck():null;
  const rows=[
   ['1.5B GPT-2: 3 GB of fp16 weights, at least 24 GB of model states','S3.SS1','3 and 24 GB',fmt(r.gpt2.fp16_weights_GB)+' and '+fmt(r.gpt2.model_states_GB)+' GB (2 and 16 bytes per parameter)',ok],
   ['Figure 1: 7.5B on 64 GPUs','S1.F1','120, 31.4, 16.6, 1.9 GB',['dp','os','os_g','os_g_p'].map(s=>fmt(r.fig1[s],2)).join(', ')+' GB',ok],
   ['1T needs about 16 TB; 16 TB / 1024 GPUs is 16 GB','S1','16 GB',fmt(r.trillion_dp1024_GB,3)+' GB',ro],
   ['Table 1, all cells','S5.T1','54 values',r.t1.match+' of '+r.t1.n+' ('+r.t1.truncated+' truncated)',ok],
   ['Table 2, theoretical sizes','S7.T2','20 values',r.t2.match+' of '+r.t2.n+' ('+r.t2.scaled+' via the rounded 64-GPU value × MP)',ro],
   ['Communication: 2Ψ for ZeRO-1 and 2, 3Ψ for ZeRO-3','S7','2Ψ, 2Ψ, 3Ψ',z?'the animation\'s schedule moves '+['os','os_g','os_g_p'].map(s=>fmt(z[s].comm,0)+'Ψ').join(', '):'2Ψ, 2Ψ, 3Ψ',ok],
   ['GPT-2 activations, sequence 1K, batch 32 (footnote 3 rule)','S3.SS2','about 60 GB',fmt(r.act.gpt2_full_GB,1)+' GB',ok],
   ['GPT-2 with activation checkpointing','S3.SS2','about 8 GB',fmt(r.act.gpt2_ckpt_inputs_GB,1)+' to '+fmt(r.act.gpt2_ckpt_plus_one_layer_GB,1)+' GB (checkpoints; plus one block recomputed)',pa],
   ['100B, batch 32, with checkpointing','S3.SS2','around 60 GB',fmt(r.act100.fp16_GB,1)+' GB = '+fmt(r.act100.fp16_GiB,1)+' GiB (one fp16 checkpoint per block)',ro],
   ['100B at MP 16: checkpoints 33 GB per GPU, 2 GB with P<sub>a</sub>','S6.SS1','33 and 2 GB',fmt(r.act100.fp16_GB,1)+' and '+fmt(r.act100.pa16_fp16_GB,1)+' GB at 2 bytes; 33 and 2 only at 1 byte per value',no],
   ['Fused fp32 buffer: 1.5B model, 3B model','S6.SS2','6 and 12 GB',fmt(r.buffers['1.5B_fp32_GB'])+' and '+fmt(r.buffers['3B_fp32_GB'])+' GB',ok],
   ['P<sub>a</sub> adds under 10% to Megatron\'s communication','S8','under 10%','1/12 = '+fmt(r.pa_comm.ratio_pct,1)+'%',ok],
   ['1T is about 3000× BERT-Large; 140 days','S9','3000×, 140 days',fmt(r.gap.ratio)+'×; 67 min × 3000 = '+fmt(r.gap.days_at_3000x,1)+' days',ok],
   ['15 PFLOPS at over 38 TFLOPS per GPU on 400 GPUs, over 30% of peak','S10.SS2','15 PF, over 30%',fmt(r.results.aggregate_PF,1)+' PF; '+fmt(r.results.pct_peak_38,1)+'% of 125 TFLOPS',ok],
   ['Megatron at 40B across two nodes: about 5 TFLOPS, under 5% of peak','S1','under 5%',fmt(r.results.pct_peak_5,1)+'%',ok],
   ['170B is "over 8×" the state of the art','S1','over 8×','170 / 20 = '+fmt(r.results.size_vs_20B,1)+'× (§9\'s 16 to 20B); 170 / 40 = '+fmt(r.results.size_vs_40B,2)+'× (§1\'s 40B)',pa],
   ['Measured ZeRO-1 sizes "match" the bound','S7.T2','match','81 to 82% of the bound',pa],
   ['Table 4: 40B to 60B at hidden 4096','S10.T4','40 to 60B',fmt(RC.t4.find(x=>x.layers===88&&x.hidden===4096).recount_B,1)+' and '+fmt(RC.t4.find(x=>x.layers===132&&x.hidden===4096).recount_B,1)+'B (the appendix\'s 6144 gives 40.2 and 60.1B)',no],
   ['Appendix configurations, other rows','A0.T5','sizes as labelled',(RC.configs.filter(x=>Math.abs(x.off_pct)<=5).length)+' of '+RC.configs.length+' runs within 5%; the 1.38B baseline recounts to '+fmt(RC.configs.find(x=>x.label==='1.38B').recount_B,2)+'B',pa]];
  let h='<thead><tr><th>Claim</th><th>Where</th><th>Paper</th><th>Recomputed</th><th>Holds?</th></tr></thead><tbody>';
  rows.forEach(x=>h+='<tr><td>'+x[0]+'</td><td>'+AXL(x[1],x[1].replace(/^S(\d+)\.SS(\d+).*/,'§$1.$2').replace(/^S(\d+)\.T(\d+)/,'Table $2').replace(/^S1\.F1$/,'Figure 1').replace(/^A0\.T5$/,'appendix').replace(/^S(\d+)$/,'§$1'))+'</td><td>'+x[2]+'</td><td>'+x[3]+'</td>'+x[4]+'</tr>');
  $('ckT').innerHTML=h+'</tbody>'}
onTab('t-tables',()=>{calc();t1();t2();t3();t4();ap();ck()});
})();
