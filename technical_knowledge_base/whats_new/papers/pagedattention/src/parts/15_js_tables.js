// ---- The paper's figures, rebuilt ----
(function(){
  const SC2={'FasterTransformer':'var(--mute)','Orca (Max)':'var(--bad)','Orca (Pow2)':'var(--c5)','Orca (Oracle)':'var(--c3)','vLLM':'var(--c1)'};
  const ORD=['FasterTransformer','Orca (Max)','Orca (Pow2)','Orca (Oracle)','vLLM'];
  const PAN={fig12_sharegpt:['(a) OPT-13B, 1 GPU','(b) OPT-66B, 4 GPUs','(c) OPT-175B, 8 GPUs'],fig12_alpaca:['(d) OPT-13B, 1 GPU','(e) OPT-66B, 4 GPUs','(f) OPT-175B, 8 GPUs'],
    fig14_parallel:['(a) 2 samples','(b) 4 samples','(c) 6 samples'],fig14_beam:['(d) beam width 2','(e) beam width 4','(f) beam width 6'],fig16_prefix:['(a) 1-shot prefix, 80 tokens','(b) 5-shot prefix, 341 tokens'],fig17_chat:['OPT-13B, ShareGPT conversations']};
  const ANC={fig12_sharegpt:'S5.F12',fig12_alpaca:'S5.F12',fig14_parallel:'S6.F14',fig14_beam:'S6.F14',fig16_prefix:'S6.F16',fig17_chat:'S6.F17'};
  const CLAIM={fig12_sharegpt:'§6.2: vLLM sustains "1.7× to 2.7×" the request rate of Orca (Oracle), "2.7× to 8×" that of Orca (Max), and up to 22× FasterTransformer\'s, at similar latencies.',
    fig12_alpaca:'§6.2: a similar trend, except panel (f), where vLLM\'s advantage over Orca (Oracle) and Orca (Pow2) is "less pronounced" (compute-bound). §6.3 uses panel (d) as the basic-sampling baseline: 1.3× over Orca (Oracle).',
    fig14_parallel:'§6.3: the more sequences to sample, the larger vLLM\'s improvement over the Orca baselines.',fig14_beam:'§6.3: over Orca (Oracle), from 1.3× in basic sampling to 2.3× with beam width 6.',
    fig16_prefix:'§6.4: 1.67× Orca (Oracle)\'s throughput with the 1-shot prefix, 3.58× with the 5-shot prefix.',fig17_chat:'§6.5: vLLM sustains 2× higher request rates than the three Orca baselines.'};
  let fig='fig12_sharegpt',pan=0;
  function crossing(pts,thr){for(let i=0;i+1<pts.length;i++){const [x0,y0]=pts[i],[x1,y1]=pts[i+1];if(y0<thr&&thr<=y1)return x0+(thr-y0)*(x1-x0)/(y1-y0)}return null}
  const curve=v=>longest(v).slice().sort((a,b)=>a[0]-b[0]);
  function caps(f,thr){return FG[f].map(p=>{const o={};Object.keys(p.series).forEach(s=>o[s]=crossing(curve(p.series[s]),thr));return o})}
  window.__capsCheck=()=>{const out={};Object.keys(RC.capacity).forEach(f=>{out[f]={};Object.keys(RC.capacity[f]).forEach(t=>out[f][t]=caps(f,+t))});return out};
  function segs(){const el=$('cvP');el.innerHTML=PAN[fig].map((n,i)=>'<button data-m="'+i+'" class="'+(i===pan?'on':'')+'" aria-pressed="'+(i===pan)+'">'+n+'</button>').join('');
    el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{pan=+b.dataset.m;segs();draw()}))}
  function draw(){const thr=+$('cvT').value/10;$('cvTv').textContent=thr.toFixed(1);const P=FG[fig][pan];
    fit($('cvSvg'),W=>{let xm=0;Object.values(P.series).forEach(v=>curve(v).forEach(p=>{if(!p[2]&&p[0]>xm)xm=p[0]}));xm=Math.ceil(xm*1.08*10)/10;
      const step=xm>20?10:xm>8?2:xm>3?1:xm>1.2?0.5:0.2;const xt=[];for(let v=0;v<=xm+1e-9;v+=step)xt.push([v,(Math.round(v*10)/10).toString()]);
      const H=230,A=frame({W,H,pl:44,pr:12,pt:10,pb:34,x:[0,xm],y:[0,1],xt,yt:[[0,'0'],[0.5,'0.5'],[1,'1.0']],xl:'request rate (requests/s)',yl:'normalized latency (s/token)'});
      const cid='cvc'+W;let s='<defs><clipPath id="'+cid+'"><rect x="44" y="10" width="'+(W-56)+'" height="'+(H-44)+'"/></clipPath></defs>'+A.s;
      s+=ln2(44,A.ly(thr),W-12,A.ly(thr),'var(--acc)',{da:'5 4',sw:1.2})+tx(W-14,A.ly(thr)-4,'threshold '+thr.toFixed(1),{fs:11,a:'end',c:'var(--acc)'});
      const C=caps(fig,thr)[pan];let g='';ORD.filter(n=>P.series[n]).forEach(n=>{const pts=curve(P.series[n]);g+=poly(pts,A.lx,A.ly,SC2[n],{sw:2})+dots(pts.filter(p=>!p[2]),A.lx,A.ly,SC2[n],2.6);
        if(C[n]!=null)g+='<circle cx="'+A.lx(C[n]).toFixed(1)+'" cy="'+A.ly(thr).toFixed(1)+'" r="5" fill="none" stroke="'+SC2[n]+'" stroke-width="2"/>'});
      s+='<g clip-path="url(#'+cid+')">'+g+'</g>';
      const lg=legend(ORD.filter(n=>P.series[n]).map(n=>[n,SC2[n]]),44,H+14,W-50);
      $('cvSvg').innerHTML=svgW(W,H+lg.h+6,s+lg.s,'normalized latency against request rate')});
    const C=caps(fig,thr)[pan];let h='<tr><th>System</th><th class="num">Rate at '+thr.toFixed(1)+' s/token</th><th class="num">vLLM ÷ this</th></tr>';
    ORD.filter(n=>P.series[n]).forEach(n=>{h+='<tr><td><span style="color:'+SC2[n]+'">■</span> '+n+'</td><td class="num">'+(C[n]!=null?C[n].toFixed(2)+' req/s':'not reached in the plot')+'</td><td class="num">'+(n!=='vLLM'&&C[n]&&C.vLLM?(C.vLLM/C[n]).toFixed(2)+'×':'')+'</td></tr>'});
    $('cvTab').innerHTML=h;
    // the claim and the same ratio in every panel, at this threshold
    const all=caps(fig,thr);const R=(a,b)=>all.map(c=>c[a]&&c[b]?(c[a]/c[b]).toFixed(2)+'×':'n/a').join(', ');
    let rep='<b>The text:</b> '+CLAIM[fig]+' <b>Read off the '+A_(PAPER.meta.ax+'#'+ANC[fig],'figure')+' at '+thr.toFixed(1)+' s/token</b>, panel by panel: vLLM ÷ Orca (Oracle) '+R('vLLM','Orca (Oracle)');
    if(all[0]['Orca (Max)'])rep+='; ÷ Orca (Max) '+R('vLLM','Orca (Max)');if(all[0]['FasterTransformer'])rep+='; ÷ FasterTransformer '+R('vLLM','FasterTransformer');
    rep+='. Rings mark where each curve crosses the threshold; dots are the plotted measurements, and lines leaving the top are clipped as in the paper.';
    $('cvRep').innerHTML=rep}
  $('cvF').addEventListener('change',e=>{fig=e.target.value;pan=0;segs();draw()});$('cvT').addEventListener('input',draw);
  // Table 1
  function t1(){let h='<tr><th>Model</th><th>GPUs</th><th class="num">Memory</th><th class="num">Params, printed</th><th class="num">2 B × params</th><th class="num">KV memory</th><th class="num">KV / token</th><th class="num">Slots, printed</th><th class="num">Recomputed</th></tr>';
    RC.table1.forEach((r,i)=>{const T=TB.table1.rows[i];const kv=RC.kv_per_token_bytes['OPT-'+r.model];
      h+='<tr><td>OPT-'+r.model+'</td><td>'+T.gpus+'</td><td class="num">'+T.mem_gb+'</td><td class="num">'+r.printed_params_gb+' GB</td><td class="num'+(r.params_gb_2bytes!==r.printed_params_gb?' tr':'')+'">'+r.params_gb_2bytes+' GB</td><td class="num">'+r.printed_kv_gb+' GB</td><td class="num">'+fmtBytes(kv)+'</td><td class="num">'+r.printed_slots_k+'K</td><td class="num'+(Math.abs(r.slots_k-r.printed_slots_k)>0.06?' tr':'')+'">'+r.slots_k.toFixed(2)+'K</td></tr>'});
    $('t1Tab').innerHTML=h;const r66=RC.table1[1],r175=RC.table1[2];
    $('t1Rep').innerHTML='13B and 175B reproduce (15.73K and 60.07K). 66B gives '+r66.slots_k.toFixed(2)+'K for 21 GB; the printed 9.7K needs '+r66.kv_gb_for_printed_slots.toFixed(1)+' GB, so the memory column is probably rounded. 175B\'s 346 GB of parameters is less than 175 × 2 = 350 GB; the paper does not say why. In every row the KV memory is less than what the parameters leave (14, 28 and 294 GB): the rest goes to activations and other buffers (%FIG1%).'.replace('%FIG1%',A_(PAPER.meta.ax+'#S1.F1','Figure 1'))}
  function bars(){const F=TB.fig13;let h='<tr><th>Figure 13</th><th class="num">Orca (Max)</th><th class="num">Orca (Pow2)</th><th class="num">Orca (Oracle)</th><th class="num">vLLM</th><th class="num">vLLM ÷ Oracle</th><th class="num">vLLM ÷ Max</th></tr>';
    ['ShareGPT','Alpaca'].forEach(d=>{const f=F[d];h+='<tr><td>'+d+' (batched requests)</td><td class="num">'+f['Orca (Max)'].toFixed(2)+'</td><td class="num">'+f['Orca (Pow2)'].toFixed(2)+'</td><td class="num">'+f['Orca (Oracle)'].toFixed(2)+'</td><td class="num">'+f.vLLM.toFixed(2)+'</td><td class="num">'+RC.fig13_ratios[d].vs_oracle.toFixed(2)+'×</td><td class="num">'+RC.fig13_ratios[d].vs_max.toFixed(2)+'×</td></tr>'});
    h+='<tr><th>Figure 15 (Alpaca)</th><th class="num">2</th><th class="num">4</th><th class="num">6</th><th class="num" colspan="3"></th></tr>';
    h+='<tr><td>parallel sampling, saving</td>'+TB.fig15.parallel.map(v=>'<td class="num">'+v.toFixed(2)+'%</td>').join('')+'<td colspan="3" class="small mute">simulated: '+[2,4,6].map(n=>f1(SC['alpaca_vllm_n'+n].saving,2)+'%').join(', ')+'</td></tr>';
    h+='<tr><td>beam search, saving</td>'+TB.fig15.beam.map(v=>'<td class="num">'+v.toFixed(2)+'%</td>').join('')+'<td colspan="3"></td></tr>';
    $('barTab').innerHTML=h;
    $('barRep').innerHTML='Printed labels, checked against the bar heights in the vector graphics (all agree to 0.01). Orca (Max) batches 7.00 on both traces because only ⌊'+fmt(RC.slots_13b,0)+' / 2,048⌋ = 7 maximum-length chunks fit: the one number in Figure 13 that follows from Table 1 alone. Figure 2\'s bars sum to 99.9% for Orca (Max) and Orca (Pow2) (rounding).'}
  function abl(){fit($('ablSvg'),W=>{const n=W>=760?3:W>=500?2:1,w1=Math.floor((W-(n-1)*10)/n),H=190;const out=[];
    const k=FG.fig18a_kernel[0].series;let A=frame({W:w1,H,pl:40,pr:8,pt:16,pb:34,x:[64,256],y:[0,250],xt:[[64,'64'],[128,'128'],[256,'256']],yt:[[0,'0'],[100,'100'],[200,'200']],xl:'context length',yl:'kernel latency (µs)'});
    let s=A.s+tx(40,11,'Figure 18a: attention kernel',{fs:11,w:600});k.vLLM.forEach(p=>{s+=poly(p,A.lx,A.ly,'var(--c1)')+dots(p,A.lx,A.ly,'var(--c1)')});k.FasterTransformer.forEach(p=>{s+=poly(p,A.lx,A.ly,'var(--c2)',{da:'4 3'})+dots(p,A.lx,A.ly,'var(--c2)')});
    s+=tx(A.lx(70),A.ly(215),'vLLM (solid)',{fs:11,c:'var(--c1)'})+tx(A.lx(70),A.ly(185),'FasterTransformer',{fs:11,c:'var(--c2)'})+tx(A.lx(200),A.ly(95),'batch 8',{fs:11,c:'var(--mute)'})+tx(A.lx(110),A.ly(150),'batch 32',{fs:11,c:'var(--mute)'});out.push(svgW(w1,H,s,'Figure 18a'));
    const sw=FG.fig19a_swap[0].series,BS=[1,2,4,8,16,32,64,128,256].map(v=>[v,String(v)]);
    A=frame({W:w1,H,pl:40,pr:8,pt:16,pb:34,x:[1,256],xlog:1,y:[0,140],xt:BS,yt:[[0,'0'],[40,'40'],[80,'80'],[120,'120']],xl:'block size',yl:'time (ms)'});
    s=A.s+tx(40,11,'Figure 19a: recompute against swap',{fs:11,w:600});[['Recompute','var(--c1)'],['Swap in','var(--c2)'],['Swap out','var(--c3)'],['Swap in + out','var(--bad)']].forEach(([nm,c])=>{const p=longest(sw[nm]);s+=poly(p,A.lx,A.ly,c)+dots(p,A.lx,A.ly,c)});
    const lg=legend([['recompute','var(--c1)'],['swap in','var(--c2)'],['swap out','var(--c3)'],['in + out','var(--bad)']],46,H+12,w1-50);out.push(svgW(w1,H+lg.h+14,s+lg.s,'Figure 19a'));
    const e2=FG.fig19b_e2e[0].series;A=frame({W:w1,H,pl:40,pr:8,pt:16,pb:34,x:[1,256],xlog:1,y:[0,2.6],xt:BS,yt:[[0,'0'],[1,'1'],[2,'2']],xl:'block size',yl:'normalized latency (s/token)'});
    s=A.s+tx(40,11,'Figure 19b: end to end, ShareGPT',{fs:11,w:600});[['Recompute','var(--c1)'],['Swap','var(--bad)']].forEach(([nm,c])=>{const p=longest(e2[nm]);s+=poly(p,A.lx,A.ly,c)+dots(p,A.lx,A.ly,c)});
    s+=tx(A.lx(16),A.ly(2.3),'recompute',{fs:11,c:'var(--c1)'})+tx(A.lx(16),A.ly(2.0),'swap',{fs:11,c:'var(--bad)'});out.push(svgW(w1,H,s,'Figure 19b'));
    $('ablSvg').innerHTML='<div style="display:grid;grid-template-columns:repeat('+n+',1fr);gap:10px">'+out.map(x=>'<div>'+x+'</div>').join('')+'</div>'});
    let h='<tr><th>Figure 18a point</th><th class="num">vLLM (µs)</th><th class="num">FasterTransformer (µs)</th><th class="num">Overhead</th></tr>';
    RC.fig18a.forEach(r=>{h+='<tr><td>batch '+r.bs+', context '+r.ctx+'</td><td class="num">'+r.vllm_us.toFixed(1)+'</td><td class="num">'+r.ft_us.toFixed(1)+'</td><td class="num'+(r.overhead_pct>26.5||r.overhead_pct<19.5?' tr':'')+'">'+r.overhead_pct.toFixed(0)+'%</td></tr>'});
    h+='<tr><th>Figure 19a block size</th><th class="num">Recompute (ms)</th><th class="num">Swap in + out (ms)</th><th class="num">Recompute ÷ swap</th></tr>';
    RC.fig19a.forEach(r=>{h+='<tr><td>'+r.block+'</td><td class="num">'+r.recompute_ms.toFixed(1)+'</td><td class="num">'+r.swap_ms.toFixed(1)+'</td><td class="num'+(r.recompute_over_swap>0.2?' tr':'')+'">'+(100*r.recompute_over_swap).toFixed(0)+'%</td></tr>'});
    $('ablTab').innerHTML=h;const o8=RC.fig18a.filter(r=>r.bs===8).map(r=>r.overhead_pct),o32=RC.fig18a.filter(r=>r.bs===32).map(r=>r.overhead_pct),mx=Math.max(...RC.fig19a.map(r=>r.recompute_over_swap));
    $('ablRep').innerHTML='<b>Kernel overhead</b>: the text says 20% to 26%; the figure gives '+Math.min(...o32).toFixed(0)+'% to '+Math.max(...o32).toFixed(0)+'% at batch size 32 and '+Math.min(...o8).toFixed(0)+'% to '+Math.max(...o8).toFixed(0)+'% at batch size 8. <b>Recomputation against swapping</b>: "never higher than 20% of swapping\'s latency" does not hold as written (recompute is '+(100*RC.fig19a[0].recompute_over_swap).toFixed(0)+'% of swap at block size 1 and '+(100*mx).toFixed(0)+'% at 256); as "never more than 20% slower than swapping" it does ('+(100*(mx-1)).toFixed(0)+'% at most). Red cells mark the points outside each claim as written.'}
  function lens(){fit($('lenSvg'),W=>{const two=W>=600,w1=two?Math.floor(W/2)-6:W,H=170;const out=[];
    [['sharegpt','ShareGPT',.02],['alpaca','Alpaca',.08]].forEach(([d,nm,ym])=>{const b=FG['fig11_'+d].bins;const A=frame({W:w1,H,pl:44,pr:8,pt:16,pb:34,x:[0,2048],y:[0,ym],xt:[[0,'0'],[500,'500'],[1000,'1000'],[1500,'1500'],[2000,'2000']],yt:[[0,'0'],[ym/2,(ym/2).toFixed(2)],[ym,ym.toFixed(2)]],xl:'tokens',yl:'density'});
      let s=A.s+tx(44,11,nm,{fs:11,w:600});[['output','var(--c2)'],['input','var(--c1)']].forEach(([k,c])=>{b[k].forEach(([l,r,dd])=>{s+=rc(A.lx(l),A.ly(Math.min(dd,ym)),Math.max(.5,A.lx(r)-A.lx(l)),A.ly(0)-A.ly(Math.min(dd,ym)),c,{r:0,op:.55})})});
      const m=RC.fig11[d];s+=tx(w1-10,30,'input mean '+m.input_mean.toFixed(1),{fs:11,a:'end',c:'var(--c1)'})+tx(w1-10,46,'output mean '+m.output_mean.toFixed(1),{fs:11,a:'end',c:'var(--c2)'});out.push(svgW(w1,H,s,nm+' lengths'))});
    $('lenSvg').innerHTML=two?'<div style="display:flex;gap:12px">'+out.join('')+'</div>':out.join('')});
    const m=RC.fig11;$('lenRep').innerHTML='Means recomputed from the bars: ShareGPT input '+m.sharegpt.input_mean.toFixed(2)+' (printed 161.31), output '+m.sharegpt.output_mean.toFixed(2)+' (337.99); Alpaca input '+m.alpaca.input_mean.toFixed(2)+' (19.31), output '+m.alpaca.output_mean.toFixed(2)+' (58.45). Each histogram\'s area is 1.000. The printed means give the text\'s ratios: '+RC.fig11_ratio_printed.input.toFixed(2)+'× longer prompts and '+RC.fig11_ratio_printed.output.toFixed(2)+'× longer outputs on ShareGPT ("8.4×" and "5.8×").'}
  function chk(){const C=RC.capacity,r=(f,t,a,b)=>C[f][t].map(c=>c[a]&&c[b]?(c[a]/c[b]).toFixed(2):'n/a').join(', ');
    const rng=(f,a,b)=>{let lo=1e9,hi=0;Object.keys(C[f]).forEach(t=>C[f][t].forEach(c=>{if(c[a]&&c[b]){const v=c[a]/c[b];lo=Math.min(lo,v);hi=Math.max(hi,v)}}));return lo.toFixed(2)+' to '+hi.toFixed(2)};
    const o8=RC.fig18a.filter(x=>x.bs===8).map(x=>x.overhead_pct),o32=RC.fig18a.filter(x=>x.bs===32).map(x=>x.overhead_pct);
    const rows=[
      ['KV cache of one OPT-13B token','§3','800 KB',fmt(RC.kv_per_token_bytes['OPT-13B'])+' B = 800 KiB','ok'],
      ['One 2,048-token request','§3','1.6 GB',RC.kv_2048_gib.toFixed(4)+' GiB','ok'],
      ['Weights of a 13B model on an A100-40GB','Fig. 1','26 GB, 65%','26 / 40 = 65%','ok'],
      ['KV cache share on that GPU','§1, Fig. 1','"close to 30%" (text), "&gt;30%" (figure)','Table 1: 12 / 40 = 30%','wording differs'],
      ['Token slots, OPT-13B','Table 1','15.7K',RC.table1[0].slots_k.toFixed(2)+'K','ok'],
      ['Token slots, OPT-66B','Table 1','9.7K',RC.table1[1].slots_k.toFixed(2)+'K (9.7K needs '+RC.table1[1].kv_gb_for_printed_slots.toFixed(1)+' GB)','rounded'],
      ['Token slots, OPT-175B','Table 1','60.1K',RC.table1[2].slots_k.toFixed(2)+'K','ok'],
      ['OPT-175B parameters','Table 1','346 GB','175B × 2 B = 350 GB','differs'],
      ['Never-used slots of requests A and B','Fig. 3','2,038 and 507',RC.fig3.a_never_used+' and '+RC.fig3.b_never_used,'ok'],
      ['Token states in existing systems','§1, Fig. 2','20.4% to 38.2%','Fig. 2 bars 20.4, 26.8, 38.2','ok'],
      ['Orca (Max) batch','Fig. 13','7.00','⌊15,728 / 2,048⌋ = '+RC.orca_max_batch,'ok, independent'],
      ['Orca (Max) "external frag. & others"','Fig. 2','8.9%','free memory '+RC.orca_max_free_pct.toFixed(2)+'%','ok, independent'],
      ['More requests batched, ShareGPT','§6.2','2.2× (Oracle), 4.3× (Max)',RC.fig13_ratios.ShareGPT.vs_oracle.toFixed(2)+'×, '+RC.fig13_ratios.ShareGPT.vs_max.toFixed(2)+'×','ok'],
      ['ShareGPT against Alpaca lengths','§6.1','8.4× prompts, 5.8× outputs',RC.fig11_ratio_printed.input.toFixed(2)+'×, '+RC.fig11_ratio_printed.output.toFixed(2)+'×','ok'],
      ['Request rate over Orca (Oracle), ShareGPT','§6.2','1.7× to 2.7×','at 0.5 s/token: '+r('fig12_sharegpt','0.5','vLLM','Orca (Oracle)')+'; over thresholds 0.1 to 0.9: '+rng('fig12_sharegpt','vLLM','Orca (Oracle)'),'175B below'],
      ['Request rate over Orca (Max), ShareGPT','§6.2','2.7× to 8×','at 0.5: '+r('fig12_sharegpt','0.5','vLLM','Orca (Max)')+'; all thresholds: '+rng('fig12_sharegpt','vLLM','Orca (Max)'),'upper end not reached'],
      ['Request rate over FasterTransformer','§6.2','up to 22×','at 0.5: '+r('fig12_sharegpt','0.5','vLLM','FasterTransformer')+'; all thresholds: '+rng('fig12_sharegpt','vLLM','FasterTransformer'),'depends on threshold'],
      ['Basic sampling over Orca (Oracle), OPT-13B Alpaca','§6.3','1.3×','Fig. 12d at 0.5: '+r('fig12_alpaca','0.5','vLLM','Orca (Oracle)').split(', ')[0]+'×','ok'],
      ['Beam width 6 over Orca (Oracle)','§6.3','2.3×','Fig. 14f at 0.5: '+r('fig14_beam','0.5','vLLM','Orca (Oracle)').split(', ')[2]+'×','ok'],
      ['Shared prefix over Orca (Oracle)','§6.4','1.67×, 3.58×','at 0.5: '+r('fig16_prefix','0.5','vLLM','Orca (Oracle)'),'ok'],
      ['Chatbot over the Orca baselines','§6.5','2×','at 0.5: '+r('fig17_chat','0.5','vLLM','Orca (Oracle)')+' (Oracle), '+r('fig17_chat','0.5','vLLM','Orca (Max)')+' (Max); all thresholds: '+rng('fig17_chat','vLLM','Orca (Oracle)'),'does not reproduce'],
      ['Sharing savings, Alpaca','§6.3, Fig. 15','6.1% to 9.8%; 37.6% to 55.2%','bars 6.09 to 9.79; 37.56 to 55.16','ok'],
      ['Paged kernel overhead','§7.1, Fig. 18a','20% to 26%','batch 32: '+Math.min(...o32).toFixed(0)+'% to '+Math.max(...o32).toFixed(0)+'%; batch 8: '+Math.min(...o8).toFixed(0)+'% to '+Math.max(...o8).toFixed(0)+'%','batch 32 only'],
      ['Recomputation against swapping','§7.3, Fig. 19a','"never higher than 20% of swapping\'s latency"','recompute ÷ swap '+(100*RC.fig19a[0].recompute_over_swap).toFixed(0)+'% to '+(100*Math.max(...RC.fig19a.map(x=>x.recompute_over_swap))).toFixed(0)+'%','holds only as "20% slower"'],
      ['Best block sizes, ShareGPT','§7.2, Fig. 18b','16 to 128','latency at 16, 32, 64, 128: '+[16,32,64,128].map(b=>longest(FG.fig18b_blocksize[0].series.ShareGPT).find(p=>p[0]===b)[1].toFixed(2)).join(', ')+' s/token','ok'],
      ['Best block sizes, Alpaca','§7.2, Fig. 18b','16 and 32','latency at 16, 32, 64: '+[16,32,64].map(b=>longest(FG.fig18b_blocksize[0].series.Alpaca).find(p=>p[0]===b)[1].toFixed(2)).join(', ')+' s/token','ok']];
    let h='<tr><th>Claim</th><th>Where</th><th>Paper</th><th>Recomputed</th><th>Verdict</th></tr>';
    rows.forEach(x=>{h+='<tr><td>'+x[0]+'</td><td>'+x[1]+'</td><td>'+x[2]+'</td><td>'+x[3]+'</td><td class="'+(/^ok/.test(x[4])?'okc':'noc')+'">'+x[4]+'</td></tr>'});
    $('chkTab').innerHTML=h}
  onTab('t-tables',()=>{segs();draw();t1();bars();abl();lens();chk()});
})();
