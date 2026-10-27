// ---- The paper's tables, rebuilt ----
(function(){
  const T=TBX,R=RCX,V=window.MBW.variants,EX=window.MBW.extrap||{};
  const ax=a=>PAPER.meta.ax+'#'+a,AL=(a,t)=>A(ax(a),t);
  const heat=v=>{const x=Math.max(0,Math.min(1,v/100));return 'background:color-mix(in srgb,var(--acc) '+Math.round(x*55)+'%,var(--bg))'};
  // Table 1
  (function(){const archs=['No gate','H3','Mamba'],lay=['S4','Hyena','S6'];let h='<table class="hm"><thead><tr><th class="mh">Architecture</th>'+lay.map(l=>'<th>'+l+'</th>').join('')+'</tr></thead><tbody>';
    archs.forEach(a=>{h+='<tr><th class="mh">'+a+'</th>'+lay.map(l=>{const r=T.t1.rows.find(r=>r[1]===a&&r[2]===l);return r?'<td class="v" style="'+heat(r[3])+'">'+r[3].toFixed(1)+'</td>':'<td class="na">not run</td>'}).join('')+'</tr>'});
    h+='<tr><th class="mh">Toy (Mamba block)</th><td class="v" style="'+heat(100*V.sc_s4.res_q.tok)+'">'+(100*V.sc_s4.res_q.tok).toFixed(1)+'</td><td class="na">not run</td><td class="v" style="'+heat(100*V.sc_s6.res_q.tok)+'">'+(100*V.sc_s6.res_q.tok).toFixed(1)+'</td></tr>';
    $('t1Tbl').innerHTML=h+'</tbody></table>'})();
  // Table 11
  (function(){const lens=[...Array(15).keys()].map(i=>i+6);let h='<table class="hm"><thead><tr><th class="mh">Model <small>params</small></th>'+lens.map(k=>'<th'+(k===8?' style="font-weight:700"':'')+'>2<sup>'+k+'</sup></th>').join('')+'</tr></thead><tbody>';
    const cell=v=>v==='ok'?'<td class="v" style="'+heat(100)+'">✓</td>':v==='oom'?'<td class="na">×</td>':'<td class="v" style="'+heat(+v)+'">'+v+'</td>';
    T.t11.rows.forEach(r=>{h+='<tr><th class="mh">'+r[0]+' <small>'+r[1]+'</small></th>'+r[2].map(cell).join('')+'</tr>'});
    [['ih_s6','Toy Mamba (S6)'],['ih_s4','Toy Mamba, LTI (S4)'],['ih_attn','Toy MHA-RoPE']].forEach(([k,n])=>{if(!EX[k])return;h+='<tr><th class="mh">'+n+' <small>'+fmt(V[k].params)+', trained at 2<sup>6</sup></small></th>'+lens.map(L=>{const e=EX[k][String(L-2)];return e?(e.acc===1?cell('ok'):cell((100*e.acc).toFixed(1))):'<td class="na">'+(L-2<=20?'not run':'')+'</td>'}).join('')+'</tr>'});
    $('t11Tbl').innerHTML=h+'</tbody></table><p class="small mute">Toy rows: the value under 2<sup>k</sup> is the toy tested at 2<sup>k−2</sup>, the same multiple of its training length. Test sets: 200 sequences per length up to 2<sup>12</sup>, 64 up to 2<sup>16</sup>, 16 beyond.</p>'})();
  // Table 3
  let mode='raw',sortc=-1,dir=1;const rows=T.t3.rows.map((r,i)=>Object.assign({i},r));
  const pyth={130:'Pythia-160M',370:'Pythia-410M',1000:'Pythia-1B',1400:'Pythia-1.4B',2800:'Pythia-2.8B',7000:'Pythia-6.9B'};
  function t3(){const cols=T.t3.cols;let rs=rows.slice();if(sortc>=0)rs.sort((a,b)=>{const x=a.v[sortc],y=b.v[sortc];if(x==null)return 1;if(y==null)return -1;return dir*(+x-+y)});
    let h='<table class="hm"><thead><tr><th class="mh">Model</th><th>Token.</th>'+cols.map((c,i)=>'<th data-c="'+i+'" style="cursor:pointer">'+c.replace(' acc','').replace(' ppl','')+'<small>'+(c.includes('ppl')?'ppl ↓':'acc ↑')+(sortc===i?(dir>0?' ▲':' ▼'):'')+'</small></th>').join('')+'</tr></thead><tbody>';
    rs.forEach(r=>{const p=rows.find(x=>x.model===pyth[r.bucket]);h+='<tr'+(r.model.startsWith('Mamba')?' style="background:var(--soft)"':'')+'><th class="mh">'+r.model+'</th><td>'+r.tok+'</td>'+r.v.map((v,i)=>{if(v==null)return '<td class="na">n/a</td>';
        if(mode==='d'){if(!p||p.v[i]==null||r.model===p.model)return '<td class="na">'+(r.model===p.model?'ref':'n/a')+'</td>';const d=+v-+p.v[i],good=cols[i].includes('ppl')?d<0:d>0;return '<td style="color:'+(Math.abs(d)<0.05?'var(--mute)':good?'var(--good)':'var(--bad)')+'">'+(d>0?'+':'')+d.toFixed(cols[i].includes('ppl')?2:1)+'</td>'}
        return '<td'+(r.bold[i]?' style="font-weight:700"':'')+'>'+v+'</td>'}).join('')+'</tr>'});
    $('t3Tbl').innerHTML=h+'</tbody></table>';$('t3Tbl').querySelectorAll('th[data-c]').forEach(th=>th.addEventListener('click',()=>{const c=+th.dataset.c;if(sortc===c)dir=-dir;else{sortc=c;dir=T.t3.cols[c].includes('ppl')?1:-1}t3()}))}
  segBind('t3M',m=>{mode=m;t3()});t3();
  $('t3Best').innerHTML='Mamba is best in its size class in <b>'+R.t3_best.mamba_best+' of '+R.t3_best.cells+'</b> cells, with one tie (WinoGrande at 130M, 51.9 with Pythia-160M). The bold marks in the table agree. The comparison classes are the paper\'s groupings (Pythia-1B sits with Mamba-790M).';
  $('t3Twice').innerHTML='<ul class="tight">'+R.t3_twice.map(x=>'<li>'+x.mamba+' '+(+x.avg).toFixed(1)+' against '+x.pythia_next+' '+(+x.pythia_next_avg).toFixed(1)+': '+(x.matches?'<span style="color:var(--good)">yes</span>':'<span style="color:var(--bad)">no</span>')+' ('+(x.diff>0?'+':'')+(+x.diff).toFixed(1)+')</li>').join('')+'</ul>Holds for three of five sizes, on the average.';
  $('t3Noise').innerHTML='<table><thead><tr><th>Task</th><th>n</th><th>Mamba</th><th>Pythia</th><th>Difference</th><th>Standard error</th><th>z</th></tr></thead><tbody>'+R.t3_noise_28.map(x=>'<tr><td>'+x.task.replace(' acc','')+'</td><td>'+fmt(x.n)+'</td><td>'+x.mamba+'</td><td>'+x.pythia+'</td><td>+'+x.diff+'</td><td>'+x.se+'</td><td><b>'+x.z+'</b></td></tr>').join('')+'</tbody></table>';
  // ablation bars
  function bars(id,items,lo,hi,dec){const el=$(id);el.innerHTML=items.map(([n,v,hl])=>'<div class="row'+(hl?' hl':'')+'"><span class="nm" title="'+n+'">'+n+'</span><span class="track"><span class="fill" style="width:'+(100*(v-lo)/(hi-lo)).toFixed(1)+'%;background:'+(hl?'var(--c1)':'var(--c2)')+'"></span></span><span class="val">'+v.toFixed(dec||2)+'</span></div>').join('')}
  bars('t6Bars',T.t6.rows.map(r=>[r[0]+' + '+r[1],r[2],r[1]==='S6']),8,11);
  bars('t7Bars',T.t7.rows.map(r=>[(r[0]?'Δ ':'')+(r[1]?'B ':'')+(r[2]?'C':'')||'none (LTI)',r[3],r[0]&&r[1]&&r[2]]),8,11);
  bars('t8Bars',T.t8.rows.map(r=>[r[0]+' ('+r[1]+')',r[2],r[0]==='A_n = -(n+1)']),8,9.5);
  bars('t9Bars',T.t9.rows.map(r=>['rank '+r[0]+' ('+r[1]+'M)',r[2],r[0]===64]),8,9.5);
  // Table 13
  (function(){const t=T.t13;let h='<table class="hm"><thead><tr><th class="mh">Model</th><th>Params</th>'+t.lens.map(k=>'<th>2<sup>'+k+'</sup></th>').join('')+'</tr></thead><tbody>';
    t.rows.forEach(r=>{h+='<tr><th class="mh">'+r[0]+'</th><td>'+r[1]+'</td>'+r[2].map(v=>'<td class="v" style="'+heat(v)+'">'+v.toFixed(2)+'</td>').join('')+'</tr>'});
    h+='<tr><th class="mh">Mamba 1.4M minus HyenaDNA</th><td></td>'+R.t13_diff.map(d=>'<td style="font-weight:600;color:'+(d>0?'var(--good)':'var(--bad)')+'">'+(d>0?'+':'')+d.toFixed(2)+'</td>').join('')+'</tr>';
    $('t13Tbl').innerHTML=h+'</tbody></table>'})();
  // Tables 4 and 5
  (function(){const t=T.t4,cols=t.cols;const best=cols.map((c,i)=>{if(!i)return null;const vs=t.rows.slice(0,8).map(r=>r[i+1]).filter(v=>v!=null).map(Number);return t.lower[i]?Math.min(...vs):Math.max(...vs)});
    let h='<table><thead><tr><th>Model</th>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>';
    t.rows.forEach((r,ri)=>{h+='<tr><td>'+r[0]+'</td>'+r.slice(1).map((v,i)=>'<td'+(ri<8&&i&&v!=null&&+v===best[i]?' style="outline:2px solid var(--good);outline-offset:-2px"':'')+'>'+(v==null?'<span class="mute">n/a</span>':v)+'</td>').join('')+'</tr>'});
    $('t4Tbl').innerHTML=h+'</tbody></table>';
    let g='<table><thead><tr><th>Outer</th><th>Center</th>'+T.t5.cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>'+T.t5.rows.map(r=>'<tr>'+r.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table>';$('t5Tbl').innerHTML=g})();
  // Table 15
  $('t15Tbl').innerHTML='<table><thead><tr><th>Batch size</th><th>Transformer (FlashAttention-2)</th><th>Mamba</th><th>Mamba needs</th></tr></thead><tbody>'+R.t15.map(x=>'<tr><td>'+x.bs+'</td><td>'+x.tf+' GB</td><td>'+x.mamba+' GB</td><td>+'+x.more_pct+'%</td></tr>').join('')+'</tbody></table>';
  // parameters
  const names={'mamba-130m':'130M','mamba-370m':'370M','mamba-790m':'790M','mamba-1.4b':'1.4B','mamba-2.8b':'2.8B'};
  $('parTbl').innerHTML='<table><thead><tr><th>Checkpoint</th><th>Layers</th><th><i>D</i></th><th>Per block</th><th>Projections share</th><th>Embedding</th><th>Total</th><th>Name says</th></tr></thead><tbody>'+R.param_recount.map(x=>'<tr><td>'+x.name+'</td><td>'+x.layers+'</td><td>'+fmt(x.d)+'</td><td>'+fmt(x.per_block)+'</td><td>'+x.proj_share+'%</td><td>'+fmt(x.emb)+'</td><td><b>'+fmt(x.total_m,1)+'M</b></td><td>'+names[x.name]+'</td></tr>').join('')+'</tbody></table>';
  $('t12Tbl').innerHTML='<table><thead><tr><th>Params</th><th>n_layers</th><th>d_model</th><th>heads / d_head</th><th>Steps</th><th>LR</th><th>Batch (tokens)</th><th>Tokens</th></tr></thead><tbody>'+T.t12.rows.map(r=>'<tr>'+r.map(v=>'<td>'+(typeof v==='number'?fmt(v):v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  // checks
  const C=[
    ['"5× higher throughput" (abstract)','Figure 8, §4.5','§4.5 says 4 to 5×; against Hugging Face transformers (Appendix E.5), Mamba-6.9B untrained','partly: depends on baseline'],
    ['"up to 3× faster on A100" (introduction); "up to 7× faster than attention at 32K" (Appendix D); "20 to 40×" and "40×" (§4.5, Figure 8)','§1, App. D, §4.5','four different baselines and lengths for the same scan; the core scan only, no projections','consistent once the baselines are named'],
    ['Mamba-3B "4 points higher avg. on common sense reasoning compared to Pythia-3B"','§1, Table 3','63.3 − 59.1 = '+R.t3_vs_pythia3b,'reproduces'],
    ['Mamba-3B "even exceeding Pythia-7B"','§1, Table 3','63.3 against '+R.t3_vs_pythia7b.pythia69+' on the average','reproduces'],
    ['"best-in-class on every single evaluation result"','Table 3 caption',R.t3_best.mamba_best+' of '+R.t3_best.cells+' cells, one tie','reproduces'],
    ['"generally matches baselines at twice the model size"','Table 3 caption','3 of 5 sizes on the average (not 130M, 370M)','partly'],
    ['"over a 1.0 perplexity improvement for a cost of only 1% additional parameters"','§4.6.2, Table 10','9.73 − 8.71 = '+R.t10.gain_sel+'; 367.1M → 371.5M = +'+R.t10.params_pct+'%','reproduces (1.2%, not 1%)'],
    ['LTI layers on Selective Copying','Table 1','range '+R.t1_lti_range[0]+' to '+R.t1_lti_range[1]+'%','as printed'],
    ['"4000× longer than it saw during training"','§4.1.2','2<sup>20</sup> / 2<sup>8</sup> = '+fmt(R.t11_extrap_factor),'rounded'],
    ['induction-heads epochs: 25 × 8,192, 50 × 8,192, 10 epochs','Appendix E.1','= '+fmt(R.ih_steps.e25)+', '+fmt(R.ih_steps.e50)+', '+fmt(R.ih_steps.e10)+' steps','reproduces'],
    ['two Mamba blocks "match the 12D² parameters" of attention + MLP','§3.4','at D = 2,560: '+fmt(R.twelve_d2.two_blocks)+' against '+fmt(R.twelve_d2.twelve_d2)+' ('+R.twelve_d2.ratio+'×)','reproduces, 5% over'],
    ['"most of the parameters (3ED²) are in the linear projections"','§3.4','93.8% (130M) to 95.3% (2.8B) of each block','reproduces'],
    ['fused layer has "the same memory requirements" as FlashAttention','§3.3.2, Table 15','Mamba +'+Math.min(...R.t15.map(x=>x.more_pct))+'% to +'+Math.max(...R.t15.map(x=>x.more_pct))+'%','does not reproduce exactly ("comparable")'],
    ['activations: 16 bytes per SSM layer, 12 + 20 per attention + MLP','Appendix D','2 × 16 = 32 = 12 + 20','consistent'],
    ['IO reduced by O(N), 20 to 40× in practice','Appendix D, §4.5','element count at L = 16,384, D = 1,024, N = 16: '+R.io_fig8.ratio+'×','counted, consistent'],
    ['audio: longest clip 60 s × 16 kHz = 960,000; longest sequence 468 × 2,048','§4.4.1, App. E.4.1',fmt(R.audio.minute)+'; '+fmt(R.audio.longest),'reproduces'],
    ['DNA: 2<sup>24</sup> tokens per step gives 16 segments at 2<sup>20</sup>, 16,384 at 2<sup>10</sup>','App. E.3.3',fmt(R.dna_batch.at20)+'; '+fmt(R.dna_batch.at10),'reproduces'],
    ['checkpoint names 130M to 2.8B','README, configs',R.param_recount.map(x=>x.total_m+'M').join(', '),'reproduces'],
    ['KV cache against state, 2.8B models','this page, configs','crossover at '+R.mem_28.crossover_tokens+' tokens; '+R.mem_28.ratio_2048+'× at 2,048','derived']];
  $('chkTbl').innerHTML='<table><thead><tr><th>Claim</th><th>Where</th><th>Check</th><th>Verdict</th></tr></thead><tbody>'+C.map(r=>'<tr>'+r.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
})();
