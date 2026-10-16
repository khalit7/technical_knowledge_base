// ---- Mixing lab: RegMix Table 4, the proxy experiment (smoke test, pending box, fit explorer), long horizons, CMR, predicts
(function(){
  const X=window.MXX,D=window.MXD,$=X.$;if(!$('mx-rm'))return;
  // ---------- RegMix Table 4
  function drawRM(){const el=$('mx-rm'),R=D.regmix_t4;const w=X.width(el),lw=Math.min(86,w*.24),rw=96,bw=w-lw-rw,rh=24,h=R.cols.length*rh+20;
    const lo=44,hi=48,x=v=>lw+bw*(v-lo)/(hi-lo);let b='';
    [44,45,46,47,48].forEach(v=>{b+='<line x1="'+x(v)+'" x2="'+x(v)+'" y1="0" y2="'+(h-16)+'" stroke="var(--line)"/>'+X.t(x(v),h-3,v,{a:'middle',fs:10,fill:'var(--mute)'})});
    R.cols.forEach((c,i)=>{const y=i*rh+2,best=c==='RegMix';b+=X.t(lw-6,y+14,c==='Pile-CC'?'Web only':c,{a:'end',fs:11.5,w:best?600:400})+X.rect(lw,y+3,x(R.avg[i])-lw,rh-9,best?'var(--c3)':c==='Pile-CC'?'var(--c1)':'var(--dim)')+
      X.t(x(R.avg[i])+4,y+14,R.avg[i].toFixed(1)+' <tspan fill="var(--mute)" font-size="10">best on '+R.best_on[i]+'</tspan>',{fs:11})});
    el.innerHTML=X.svg(w,h,b,'RegMix Table 4: average downstream accuracy of a 1B model by mixture')}
  X.onRender(drawRM);drawRM();
  $('mx-rm-ratio').textContent='RegMix used '+X.pct(D.regmix_ratio,1)+' of DoReMi\'s, derived';
  X.predict('mx-pr3');
  // ---------- proxy experiment: smoke test and pending box
  const sm=D.smoke,pt=sm.pool_train_tokens;
  $('mx-smoke').innerHTML=X.stat('CPU smoke test','ran '+sm.date,'<span class="lbl me">measured</span> by the child page: prep, train, sweep and DoReMi commands all run')+
    X.stat('Proxy size',X.fmt(sm.params_non_embedding),'parameters outside the embedding ('+X.fmt(sm.params_total)+' in total)')+
    X.stat('CPU throughput','~'+X.fmt(sm.tokens_per_s)+' tokens/s','rough: shared machine, 4 threads, low priority')+
    X.stat('Smoke pools (train tokens)',Object.keys(pt).map(k=>k+' '+X.tok(pt[k])).join(', '),'the topic\'s samples; the real run streams about 25M per domain');
  const has=!!D.proxy;
  if(has){const h2=$('mx-s3').querySelector('h2');h2.textContent=h2.textContent.replace(' (pending GPU run)','')}
  $('mx-pend').innerHTML=has&&!D.proxy.fit?'<b>What ran:</b> DoReMi only, on the M1 Pro GPU on 2026-10-16 (reference and proxy, '+D.proxy.doremi.steps.toLocaleString('en-US')+' steps each, about '+D.proxy.doremi.minutes+' minutes in total), read from the child page\'s <code>data/proxy_runs.json</code>. <b>Not run:</b> the RegMix-style sweep and the rank check, dropped on 2026-10-15 as hours of GPU time that would re-measure what RegMix already published; the design is kept in the table above.':has?'<b>Proxy experiment: results embedded</b> from the child page\'s <code>data/proxy_runs.json</code> (run on '+X.esc(D.proxy.device||'the GPU queue')+'). The explorer below is filled from it.':
    '<b>Pending GPU run (not run yet).</b> The sweep, anchors, DoReMi and rank check need about 4 to 7 hours on the GPU queue (estimate from the child\'s <code>run_pending.sh</code> header: CPU throughput measured, GPU speed assumed 10 to 20 times faster, not measured). Command, from the repository root, holding the bench lock:'+
    '<code class="mx-cmd">cd technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/data_mixing/src/scripts\nDC_SCRATCH=&lt;topic scratch&gt;/dc sh run_pending.sh\ncd ../../../src &amp;&amp; python3 mix/build_data.py &amp;&amp; sh build.sh</code>'+
    'The last line re-reads <code>data_mixing/src/data/proxy_runs.json</code> and fills the fit explorer below (predicted against measured loss for the 48 sweep runs, the anchors, the fitted best mixture, DoReMi\'s weights, and a slider to query the fitted law). Until then nothing below is a result.';
  // ---------- fit explorer (fills when the run exists)
  function fit(){const el=$('mx-fit');if(has&&!D.proxy.fit){const P=D.proxy,R=P.doremi,N=P.names;
      el.innerHTML='<h3>DoReMi on the five domains, measured</h3><div class="mx-tw"><table class="mx-t"><tr><th>Domain</th><th class="n">Natural share</th><th class="n">DoReMi weight</th><th class="n">Ref. loss</th><th class="n">Proxy loss</th></tr>'+
        N.map((n,i)=>'<tr><td><span class="mx-sw" style="background:'+(X.COL[n]||'var(--c6)')+'"></span>'+X.esc(n)+'</td><td class="n">'+X.pct(R.ref_w[i],1)+'</td><td class="n"><b>'+X.pct(R.avg_w[i],1)+'</b></td><td class="n">'+R.ref_loss[i].toFixed(2)+'</td><td class="n">'+R.proxy_loss[i].toFixed(2)+'</td></tr>').join('')+'</table></div>'+
        '<p class="small">Held-out loss in nats per GPT-2 token. DoReMi moved weight to code and maths, the domains whose tokens a trained reference predicts best, and almost off web text. The proxy itself ended '+(Math.min(...R.proxy_loss.map((v,i)=>v-R.ref_loss[i]))).toFixed(2)+' to '+(Math.max(...R.proxy_loss.map((v,i)=>v-R.ref_loss[i]))).toFixed(2)+' nats worse than the reference on every domain; DoReMi uses only its weights. Whether a model trained on these weights beats the natural shares was not run. One run, one seed, a 0.8M-parameter proxy: the weights swung to one domain at a time and their running average was still moving when the run stopped. The step-by-step replay is on {{Data mixing|n:3c65c17b0d0d819ea5d6c59471e66875}}. <span class="lbl me">measured</span></p>';return}
    if(!has){el.innerHTML='<div class="mx-pend" style="opacity:.75"><b>Fit explorer: empty until the run exists.</b> It will plot each sweep run\'s measured mean held-out loss against the Data Mixing Laws fit, list the anchors (natural, uniform, temperature 2) and the rank check, and let you move five weight sliders to read the fitted loss of any mixture.</div>';return}
    const P=D.proxy,N=P.names,f=P.fit,t=N.map(n=>f.t[n]);const pred=r=>f.c+Math.exp(f.b+r.reduce((a,v,i)=>a+v*t[i],0));
    if(!fit.w)fit.w=N.map(n=>f.best[n]);
    const w=X.width(el),sz=Math.min(w,360),pl=42,pb=30,ptp=8,W=sz-pl-8,Hh=sz-pb-ptp;
    const ys=P.pts.map(p=>p[0]).concat(P.pts.map(p=>p[1]));const lo=Math.min(...ys),hi=Math.max(...ys),pad=(hi-lo)*.05||.05,a=lo-pad,c=hi+pad;
    const x=v=>pl+W*(v-a)/(c-a),y=v=>ptp+Hh*(1-(v-a)/(c-a));let b='<line x1="'+x(a)+'" y1="'+y(a)+'" x2="'+x(c)+'" y2="'+y(c)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    for(let k=0;k<=4;k++){const v=a+(c-a)*k/4;b+=X.t(x(v),sz-pb+13,v.toFixed(2),{a:'middle',fs:10,fill:'var(--mute)'})+X.t(pl-4,y(v)+3,v.toFixed(2),{a:'end',fs:10,fill:'var(--mute)'})}
    b+=X.t(pl+W/2,sz-3,'fitted loss',{a:'middle',fs:10.5,fill:'var(--mute)'});
    P.pts.forEach(p=>{b+='<circle cx="'+x(p[1])+'" cy="'+y(p[0])+'" r="3.6" fill="var(--c1)" opacity=".8"/>'});
    const z0=fit.w.reduce((s,v)=>s+v,0)||1,q=pred(fit.w.map(v=>v/z0));b+='<circle cx="'+x(q)+'" cy="'+y(q)+'" r="6" fill="none" stroke="var(--c2)" stroke-width="2"/>';
    let h='<h3>Fit explorer</h3><div class="mx-grid2"><div>'+X.svg(sz,sz,b,'Measured against fitted loss for the sweep runs')+'<div class="small mute">Dots: sweep runs, measured mean held-out loss (vertical) against the fitted law (horizontal). Ring: your mixture\'s fitted loss.</div></div><div>';
    h+=N.map((n,i)=>'<div class="mx-ctl"><label><span class="mx-sw" style="background:'+(X.COL[n]||'var(--c6)')+'"></span>'+X.esc(n)+' <input type="range" min="0" max="100" value="'+Math.round(100*fit.w[i])+'" data-i="'+i+'" aria-label="'+X.esc(n)+' weight"> <output>'+X.pct(fit.w[i]/fit.w.reduce((s,v)=>s+v,0),0)+'</output></label></div>').join('');
    const z=fit.w.reduce((s,v)=>s+v,0)||1;h+='<p><b>Fitted mean loss: '+pred(fit.w.map(v=>v/z)).toFixed(3)+'</b></p>';
    h+='<table class="mx-t"><tr><th>Run</th><th class="n">Mean loss</th><th class="n">Fitted</th></tr>'+Object.keys(P.anchors).map(k=>{const r=P.anchors[k];return '<tr><td>'+X.esc(k)+'</td><td class="n">'+r.loss.toFixed(3)+'</td><td class="n">'+pred(r.w).toFixed(3)+'</td></tr>'}).join('')+'</table>';
    h+='<p class="small">Fitted best (average of the 128 best of 100,000 sampled mixtures): '+N.map(n=>X.esc(n)+' '+X.pct(f.best[n],0)).join(', ')+'.</p>';
    if(P.doremi&&P.doremi.length&&P.doremi[0].w)h+='<p class="small">DoReMi weights: '+N.map(n=>X.esc(n)+' '+X.pct(P.doremi[0].w[n]||0,0)).join(', ')+'.</p>';
    el.innerHTML=h+'</div></div>';
    el.querySelectorAll('input[type=range]').forEach(r=>r.addEventListener('input',e=>{fit.w[+e.target.dataset.i]=+e.target.value/100;fit()}));
  }
  X.onRender(fit);fit();
  // ---------- long horizons
  let HB=15;
  function drawHz(){const el=$('mx-hz'),R=D.horizon.filter(r=>r.budget===HB);const w=X.width(el),narrow=w<520,lw=narrow?0:118,rw=0,bw=w-lw-8,rh=narrow?38:26,h=R.length*rh+20;
    const x=v=>lw+bw*v;let b='';[0,.25,.5,.75,1].forEach(v=>{b+='<line x1="'+x(v)+'" x2="'+x(v)+'" y1="0" y2="'+(h-16)+'" stroke="var(--line)"/>'+X.t(Math.min(w-14,Math.max(10,x(v))),h-3,(v*100)+'%',{a:'middle',fs:10,fill:'var(--mute)'})});
    R.forEach((r,i)=>{const y=i*rh+(narrow?14:2);if(narrow)b+=X.t(2,y-2,r.name,{fs:11,w:600});else b+=X.t(lw-6,y+14,r.name,{a:'end',fs:11});
      const col=r.epochs>16?'var(--bad)':r.epochs>4?'var(--c5)':'var(--c3)';b+=X.rect(lw,y+3,x(r.eff_frac)-lw,rh-(narrow?20:9),col);
      const lab=X.pct(r.eff_frac,0)+' ('+(r.epochs<10?r.epochs.toFixed(1):Math.round(r.epochs))+' epochs)';const lx=x(r.eff_frac);
      b+=lx>w-110?X.t(lx-4,y+14,lab,{a:'end',fs:10.5,fill:'#fff',w:600}):X.t(lx+4,y+14,lab,{fs:10.5,w:600})});
    el.innerHTML=X.svg(w,h,b,'Fresh-token equivalent of a run drawn from one corpus');
    $('mx-hz-t').innerHTML='<tr><th>Corpus</th><th class="n">Total</th><th class="n">Unique real</th><th class="n">Synthetic</th><th class="n">Epochs over unique</th><th class="n">Fresh-token equivalent</th></tr>'+
      R.map(r=>'<tr><td>'+X.esc(r.name)+'</td><td class="n">'+r.total+'T</td><td class="n">'+r.unique+'T</td><td class="n">'+(r.synthetic==null?'none':r.synthetic+'T')+'</td><td class="n">'+(r.epochs<10?r.epochs.toFixed(2):r.epochs.toFixed(1))+'</td><td class="n">'+r.eff.toFixed(2)+'T ('+X.pct(r.eff_frac,0)+')</td></tr>').join('')}
  X.seg($('mx-hz-b'),m=>{HB=+m;drawHz()});X.onRender(drawHz);drawHz();
  // ---------- CMR
  function drawCMR(){const el=$('mx-cmr'),C=D.cmr;const rows=Object.keys(C.finance).map(k=>['Finance, '+k,C.finance[k],'var(--c1)']).concat([['Academic papers, 460M',C.academic_460M,'var(--c4)']]);
    const w=X.width(el),lw=Math.min(150,w*.42),bw=w-lw-50,rh=24,h=rows.length*rh+18,x=v=>lw+bw*v/60;let b='';
    [0,20,40,60].forEach(v=>{b+='<line x1="'+x(v)+'" x2="'+x(v)+'" y1="0" y2="'+(h-14)+'" stroke="var(--line)"/>'+X.t(x(v),h-2,v+'%',{a:'middle',fs:10,fill:'var(--mute)'})});
    rows.forEach((r,i)=>{const y=i*rh+2;b+=X.t(lw-6,y+14,r[0],{a:'end',fs:11})+X.rect(lw,y+3,x(r[1])-lw,rh-9,r[2])+X.t(x(r[1])+4,y+14,r[1].toFixed(1)+'%',{fs:10.5,w:600})});
    el.innerHTML=X.svg(w,h,b,'Critical mixture ratio: largest domain-data share by model size')}
  X.onRender(drawCMR);drawCMR();
})();
