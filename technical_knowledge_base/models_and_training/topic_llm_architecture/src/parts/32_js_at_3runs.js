// Attention lab sections 3 to 6: the trained variants (scatter, table, curves, samples), the published tables,
// the decode timings and the sliding-cache experiment. All numbers from window.ATD (src/attn/out/*.json).
(function(){
  const A=window.AT,D=window.ATD;if(!A||!D||!A.$('at-runs-card'))return;
  const $=A.$,esc=A.esc,grp=A.grp;
  const R=D.runs?D.runs.runs:[];const by={};R.forEach(r=>by[r.run]=r);
  const main=R.filter(r=>!/_s1$/.test(r.run));
  const col={at_mha:'var(--c1)',at_gqa4:'var(--c6)',at_gqa2:'var(--c3)',at_mqa:'var(--c2)',at_mla:'var(--c4)',at_swa64:'var(--c5)',at_swa64_g3:'var(--mute)'};
  const seedOf=r=>by[r.run+'_s1'];
  // ---------- scatter: held-out loss against KV bytes per token ----------
  function scatter(){
    const el=$('at-sc');if(!main.length){el.innerHTML='<p class="at-pend">Runs pending.</p>';return}
    const W=Math.max(290,A.width(el)),H=Math.round(Math.min(300,Math.max(220,W*0.42))),ml=46,mr=12,mt=12,mb=40;
    const ys=[];main.forEach(r=>{ys.push(r.val_loss_100win);const s=seedOf(r);if(s)ys.push(s.val_loss_100win)});
    let y0=Math.min(...ys),y1=Math.max(...ys);const pad=Math.max(0.01,(y1-y0)*0.15);y0-=pad;y1+=pad;
    const X=v=>ml+(W-ml-mr)*v/6400,Y=v=>mt+(H-mt-mb)*(1-(v-y0)/(y1-y0));
    let b='';
    for(const v of [0,1536,3072,4608,6144]){b+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--line)"/>'+A.t(X(v),H-mb+14,grp(v),{a:'middle'})}
    const step=(y1-y0)>0.3?0.1:(y1-y0)>0.12?0.05:0.02;
    for(let v=Math.ceil(y0/step)*step;v<=y1;v+=step){b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+A.t(ml-4,Y(v)+4,v.toFixed(2),{a:'end'})}
    b+=A.t(ml+(W-ml-mr)/2,H-6,'KV cache per token, all layers (bytes, bf16, context 256)',{a:'middle',fill:'var(--mute)'});
    b+='<text x="12" y="'+(mt+(H-mt-mb)/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+(mt+(H-mt-mb)/2)+')">held-out loss</text>';
    const placed=[];
    main.forEach(r=>{const x=X(r.kv_bytes_per_token_bf16_ctx256),y=Y(r.val_loss_100win),c=col[r.run]||'var(--ink)';
      const s=seedOf(r);if(s)b+='<line x1="'+x+'" x2="'+x+'" y1="'+y+'" y2="'+Y(s.val_loss_100win)+'" stroke="'+c+'" stroke-width="2" opacity=".6"/><circle cx="'+x+'" cy="'+Y(s.val_loss_100win)+'" r="4" fill="var(--bg)" stroke="'+c+'" stroke-width="1.6"/>';
      b+='<circle cx="'+x+'" cy="'+y+'" r="5" fill="'+c+'"/>';
      let ly=y-8,lx=x+7,anc='start';if(x>W-120){lx=x-7;anc='end'}
      while(placed.some(p=>Math.abs(p[0]-lx)<70&&Math.abs(p[1]-ly)<12))ly+=13;placed.push([lx,ly]);
      b+=A.t(lx,ly,esc(r.label.replace(', 2 local : 1 global',' 2:1')),{a:anc,fs:11})});
    el.innerHTML=A.svg(W,H,b,'Held-out loss against KV bytes per token for the tiny GPT variants');
    $('at-sc-cap').innerHTML='Filled dots: seed 0. Hollow dots joined by a line: the same variant retrained with seed 1 (different initialisation and batch order), which shows how far a rerun moves the loss. <span class="at-lbl m">measured</span> Apple M1 Pro (MPS, fp32), 1,500 steps of 8,192 tokens each.';
  }
  function runsTable(){
    if(!main.length)return;
    $('at-runs').innerHTML='<tr><th>Variant</th><th>What differs</th><th class="num">Parameters</th><th class="num">KV B/token</th><th class="num">Held-out loss</th><th class="num">Seed 1</th><th class="num">Running sequence</th><th class="num">Tokens/s</th><th class="num">Wall time</th></tr>'+
      main.map(r=>{const s=seedOf(r);return '<tr><td><b style="color:'+(col[r.run]||'inherit')+'">&#9679;</b> '+esc(r.label)+'</td><td style="min-width:11em">'+esc(r.differs)+'</td><td class="num">'+grp(r.params)+'</td><td class="num">'+grp(r.kv_bytes_per_token_bf16_ctx256)+'</td><td class="num"><b>'+r.val_loss_100win.toFixed(3)+'</b></td><td class="num">'+(s?s.val_loss_100win.toFixed(3):'')+'</td><td class="num">'+r.running_seq_loss.toFixed(3)+'</td><td class="num">'+grp(r.median_tok_s)+'</td><td class="num">'+Math.round(r.seconds)+' s</td></tr>'}).join('');
    $('at-runs-note').innerHTML='<span class="at-lbl m">measured</span> Held-out loss on 3,200 fixed validation windows (<code>eval.py</code>); running sequence = mean loss on the 256-token Roxy story (never seen in training). KV bytes per token at the 256-token context, bf16 (SWA-64 averages 64 of 256 tokens per layer). Tokens/s is the median training throughput, rough: a shared laptop at low priority, other jobs between runs. All runs use RoPE; their parameter counts differ because fewer KV heads mean smaller K and V projections.';
  }
  // ---------- curves ----------
  let cvMode='eval';
  function curves(){
    const el=$('at-cv');if(!main.length)return;
    const W=Math.max(290,A.width(el)),H=Math.round(Math.min(280,Math.max(200,W*0.38))),ml=40,mr=10,mt=10,mb=30;
    const key=cvMode==='eval'?'eval_curve':'train_curve';
    const ser=main.map(r=>({r,pts:r[key].filter(p=>p[0]>=(cvMode==='eval'?250:200))}));
    const all=ser.flatMap(s=>s.pts.map(p=>p[1]));let y0=Math.min(...all),y1=Math.max(...all);const pd=(y1-y0)*0.05;y0-=pd;y1+=pd;
    const X=v=>ml+(W-ml-mr)*v/1500,Y=v=>mt+(H-mt-mb)*(1-(v-y0)/(y1-y0));
    let b='';for(const v of [250,500,750,1000,1250,1500])b+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--line)"/>'+A.t(X(v),H-mb+14,v,{a:'middle'});
    const st=(y1-y0)>1?0.5:(y1-y0)>0.4?0.2:0.1;for(let v=Math.ceil(y0/st)*st;v<=y1;v+=st)b+=A.t(ml-4,Y(v)+4,v.toFixed(1),{a:'end'})+'<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>';
    b+=A.t(ml+(W-ml-mr)/2,H-4,'training step',{a:'middle',fill:'var(--mute)'});
    ser.forEach(s=>{b+='<polyline fill="none" stroke="'+(col[s.r.run]||'var(--ink)')+'" stroke-width="1.8" points="'+s.pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>'});
    el.innerHTML=A.svg(W,H,b,'Loss curves of the tiny GPT variants');
    $('at-cv-leg').innerHTML=main.map(r=>'<span><i style="background:'+(col[r.run]||'var(--ink)')+'"></i>'+esc(r.label)+'</span>').join('')+'<span>'+(cvMode==='eval'?'held-out loss on 640 fixed windows, from step 250':'training loss of one batch, every 100 steps from step 200 (noisy)')+'</span>';
  }
  A.seg($('at-cv-seg'),m=>{cvMode=m;curves()});
  function samples(){
    if(!main.length)return;
    const ps=[...new Set(main.flatMap(r=>r.samples.map(s=>s.prompt)))];
    $('at-samp').innerHTML=ps.map(p=>'<p class="small"><b>Prompt:</b> '+esc(p)+'</p>'+main.map(r=>{const s=r.samples.find(x=>x.prompt===p);return s?'<div class="at-sample"><b>'+esc(r.label)+':</b> '+esc(s.greedy.replace(/\n/g,' '))+'</div>':''}).join('')).join('')+
      '<p class="small mute"><span class="at-lbl m">measured</span> Greedy decoding, 60 new tokens, cut at the end-of-text token (<code>eval.py</code>). One prompt per variant says little; the loss above is the comparison.</p>';
  }
  // ---------- published tables ----------
  function pubTable(id,o){
    if(!o||!$(id))return;
    $(id+'-h').innerHTML='<span class="at-lbl p">published</span> <a href="'+o.src+'" target="_blank" rel="noopener noreferrer">'+esc(o.label)+'</a>';
    $(id).innerHTML='<tr>'+o.cols.map((c,i)=>'<th'+(i?' class="num"':'')+'>'+esc(c)+'</th>').join('')+'</tr>'+
      o.rows.map(r=>'<tr>'+r.map((v,i)=>'<td'+(i?' class="num"':'')+'>'+(typeof v==='number'?(Number.isInteger(v)&&v>999?grp(v):v):esc(v))+'</td>').join('')+'</tr>').join('');
    $(id+'-n').textContent=(o.note||'')+' Read '+D.pub.read+'.';
  }
  // ---------- decode timing ----------
  let bMode='ms';
  const bcol={mha:'var(--c1)',gqa8:'var(--c3)',mqa:'var(--c2)',mla_absorbed:'var(--c4)',gqa8_repeat_kv:'var(--ink)'};
  const bnm={mha:'MHA (32 KV heads)',gqa8:'GQA-8',mqa:'MQA (1 KV head)',mla_absorbed:'MLA-sized latent (576, absorbed)',gqa8_repeat_kv:'GQA-8 via repeat_kv'};
  function bench(){
    const el=$('at-bench');if(!D.bench){el.innerHTML='<p class="at-pend">Decode timing pending.</p>';return}
    const rows=D.bench.part_a,vars=[...new Set(rows.map(r=>r.variant))],ctx=[...new Set(rows.map(r=>r.ctx))];
    const W=Math.max(290,A.width(el)),H=Math.round(Math.min(300,Math.max(220,W*0.42))),ml=46,mr=10,mt=10,mb=32;
    const val=r=>bMode==='ms'?r.ms_median:r.GBps;
    const raw=Math.max(...rows.map(val)),p10=10**Math.floor(Math.log10(raw/5)),stp=[1,2,5,10].map(m=>m*p10).find(x=>raw/x<=6),vmax=Math.ceil(raw*1.04/stp)*stp;
    const lx=v=>Math.log2(v),X=v=>ml+(W-ml-mr)*(lx(v)-lx(ctx[0]))/(lx(ctx[ctx.length-1])-lx(ctx[0])),Y=v=>mt+(H-mt-mb)*(1-v/vmax);
    let b='';ctx.forEach(c=>b+='<line x1="'+X(c)+'" x2="'+X(c)+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--line)"/>'+A.t(X(c),H-mb+14,A.ctxs(c),{a:'middle'}));
    const nt=Math.round(vmax/stp);for(let i=0;i<=nt;i++){const v=stp*i;b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+A.t(ml-4,Y(v)+4,stp>=1?Math.round(v):v.toFixed(1),{a:'end'})}
    b+=A.t(ml+(W-ml-mr)/2,H-4,'cached tokens per sequence (batch 4)',{a:'middle',fill:'var(--mute)'});
    b+='<text x="11" y="'+(mt+(H-mt-mb)/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 11 '+(mt+(H-mt-mb)/2)+')">'+(bMode==='ms'?'ms per decode step':'GB/s of cache read')+'</text>';
    vars.forEach(v=>{const pts=rows.filter(r=>r.variant===v);b+='<polyline fill="none" stroke="'+bcol[v]+'" stroke-width="2"'+(v==='gqa8_repeat_kv'?' stroke-dasharray="5 3"':'')+' points="'+pts.map(r=>X(r.ctx).toFixed(1)+','+Y(val(r)).toFixed(1)).join(' ')+'"/>'+pts.map(r=>'<circle cx="'+X(r.ctx)+'" cy="'+Y(val(r))+'" r="2.6" fill="'+bcol[v]+'"/>').join('')});
    el.innerHTML=A.svg(W,H,b,'Attention decode step time against context');
    $('at-bench-leg').innerHTML=vars.map(v=>'<span><i style="background:'+bcol[v]+'"></i>'+bnm[v]+'</span>').join('');
    $('at-bench-note').innerHTML='<span class="at-lbl m">measured</span> '+esc(D.bench.device)+', torch '+esc(D.bench.torch)+', '+esc(D.bench.date)+'; '+esc(D.bench.note)+'. Effective bandwidth = bytes of K and V in the cache / median time (the latent counted once for MLA; the copies made by repeat_kv are extra traffic not counted). One layer of attention only: no projections, no weights.';
    const pb=D.bench.part_b;const cs=[...new Set(pb.map(r=>r.ctx))],ps=[...new Set(pb.map(r=>r.preset))];const pn={rope:'MHA',gqa2:'GQA-2',mqa:'MQA'};
    $('at-benchb').innerHTML='<tr><th>Tiny GPT</th>'+cs.map(c=>'<th class="num">'+grp(c)+' cached</th>').join('')+'</tr>'+ps.map(p=>'<tr><td>'+(pn[p]||p)+'</td>'+cs.map(c=>{const r=pb.find(x=>x.preset===p&&x.ctx===c);return '<td class="num">'+(r?r.ms_median.toFixed(2)+' ms':'')+'</td>'}).join('')+'</tr>').join('');
  }
  A.seg($('at-bench-seg'),m=>{bMode=m;bench()});
  // ---------- sliding cache and sinks ----------
  let sW=32;
  function sink(){
    const el=$('at-sink');if(!D.cpu){el.innerHTML='<p class="at-pend">CPU evaluation pending.</p>';return}
    const S=D.cpu.sliding_serving,f=(run,w,k)=>S.find(r=>r.run===run&&r.serve_window===w&&r.sinks_kept===k);
    const full=S.find(r=>r.run==='at_mha'&&r.serve_window===null);
    const avgFrom=(arr)=>{const a=arr.slice(sW);return a.reduce((x,y)=>x+y,0)/a.length};const base=full.loss_by_pos;
    const items=[['MHA model, full cache (as trained)',avgFrom(base),'var(--c1)'],
      ['MHA model, sliding cache '+sW,f('at_mha',sW,0).loss_pos_ge_W,'var(--bad)'],
      ['MHA model, sliding '+sW+' + first token',f('at_mha',sW,1).loss_pos_ge_W,'var(--c3)'],
      ['MHA model, sliding '+sW+' + first 4 tokens',f('at_mha',sW,4).loss_pos_ge_W,'var(--c6)'],
      ['SWA-64 model, as trained',avgFrom(S.find(r=>r.run==='at_swa64'&&r.serve_window===null).loss_by_pos),'var(--c5)']];
    if(sW<64)items.push(['SWA-64 model, sliding cache '+sW,f('at_swa64',sW,0).loss_pos_ge_W,'var(--mute)']);
    const mx=Math.max(...items.map(i=>i[1]))+0.02,lo=Math.floor(Math.min(...items.map(i=>i[1]))*10)/10-0.1;
    el.innerHTML='<div class="bars">'+items.map(i=>'<div class="row"><span class="nm" title="'+esc(i[0])+'" style="white-space:normal;line-height:1.2">'+esc(i[0])+'</span><span class="track"><span class="fill" style="width:'+(100*(i[1]-lo)/(mx-lo)).toFixed(1)+'%;background:'+i[2]+'"></span></span><span class="val">'+i[1].toFixed(3)+'</span></div>').join('')+'</div>';
    $('at-sink-cap').innerHTML='<span class="at-lbl m">measured</span> Mean loss at positions '+sW+' to 255 of '+grp(D.cpu.val_windows)+' fixed validation windows; '+esc(D.cpu.device)+'. Same trained weights in every MHA row; only the serving mask changes. Bars start at a loss of '+lo.toFixed(1)+', not zero.';
  }
  A.seg($('at-sink-seg'),m=>{sW=+m;sink()});
  function mass(){
    const el=$('at-mass');if(!D.cpu)return;const m=D.cpu.first_token_mass,runs=Object.keys(m).filter(k=>by[k]);
    const L=m[runs[0]].length;
    el.innerHTML='<div class="tw"><table class="at-t"><tr><th>Layer</th>'+runs.map(r=>'<th class="num">'+esc(by[r].label.replace(', 2 local : 1 global',''))+'</th>').join('')+'</tr>'+
      Array.from({length:L},(_,l)=>'<tr><td>'+(l+1)+'</td>'+runs.map(r=>{const v=m[r][l];return '<td class="num" style="background:linear-gradient(90deg,var(--acc2) '+(100*v).toFixed(0)+'%,transparent '+(100*v).toFixed(0)+'%)">'+v.toFixed(3)+'</td>'}).join('')+'</tr>').join('')+'</table></div>';
    $('at-mass-cap').innerHTML='<span class="at-lbl m">measured</span> Share of attention that queries at positions 8 to 255 of the running sequence put on position 0 (mean over heads and queries), by layer. A uniform spread over the visible tokens would put about 0.014 there on average (the mean of 1/(t+1) over those positions).';
  }
  function all(){scatter();runsTable();curves();bench();sink();mass()}
  samples();pubTable('at-pub-gqa',D.pub.gqa_table1);pubTable('at-pub-t8',D.pub.dsv2_table8);pubTable('at-pub-t9',D.pub.dsv2_table9);pubTable('at-pub-sl',D.pub.streaming_table10);
  A.onRender(all);A.onResize(all);if(A.visible())all();
})();
