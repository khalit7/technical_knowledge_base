// ---- PyTorch to JAX page: Reading-tab visuals. Every number comes from window.PJ (src/runs/out/*.json).
window.PJV=(function(){
  const J=window.PJ,esc=RD.esc,g=PJU.get,s2=v=>PJU.fmt(v,'s2');
  // a line chart: series [{name,c,ys:[...]}], o {log, ylab, x0, xlab, h, marks}
  function line(el,series,o){o=o||{};const W=RD.width(el),H=o.h||(W<520?220:250),L=W<520?44:54,R=10,T=10,B=34;
    const all=[];series.forEach(s=>s.ys.forEach(y=>{if(y!=null&&isFinite(y)&&(!o.log||y>0))all.push(y)}));
    let lo=Math.min(...all),hi=Math.max(...all);if(o.log){lo=Math.floor(Math.log10(lo));hi=Math.ceil(Math.log10(hi));if(o.lo!=null)lo=Math.max(lo,o.lo)}else{const p=(hi-lo)*.06||1;lo-=p;hi+=p;if(o.ylo!=null)lo=o.ylo;if(o.yhi!=null)hi=o.yhi}
    const n=Math.max(...series.map(s=>s.ys.length)),x=i=>L+(W-L-R)*i/Math.max(1,n-1);
    const y=v=>{const t=o.log?Math.log10(Math.max(v,Math.pow(10,lo))):v;return T+(H-T-B)*(1-(t-lo)/(hi-lo))};
    let b='';
    const ticks=o.log?Array.from({length:hi-lo+1},(_,i)=>lo+i):[0,1,2,3,4].map(i=>lo+(hi-lo)*i/4);
    ticks.forEach(t=>{const yy=o.log?y(Math.pow(10,t)):y(t);b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--line)"/>'+RD.t(L-4,yy+4,o.log?('1e'+t):(+t.toFixed(2)),{a:'end',fs:10,fill:'var(--mute)'})});
    const xt=o.xticks||[0,Math.round((n-1)/2),n-1];xt.forEach(i=>{b+=RD.t(x(i),H-B+14,(o.x0||0)+i*(o.xstep||1),{a:'middle',fs:10,fill:'var(--mute)'})});
    if(o.xlab)b+=RD.t((L+W-R)/2,H-4,o.xlab,{a:'middle',fs:10.5,fill:'var(--mute)'});
    if(o.ylab)b+=RD.t(L,T-1,'',{});
    series.forEach(s=>{let d='',pen=false;s.ys.forEach((v,i)=>{if(v==null||!isFinite(v)||(o.log&&v<=0)){pen=false;return}d+=(pen?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);pen=true});
      b+='<path d="'+d+'" fill="none" stroke="'+s.c+'" stroke-width="'+(s.w||1.6)+'"'+(s.dash?' stroke-dasharray="4 3"':'')+' opacity="'+(s.op||1)+'"/>'});
    el.innerHTML=RD.svg(W,H,b,o.label||'chart')+(o.legend===false?'':'<div class="pj-leg">'+series.map(s=>'<span><i style="background:'+s.c+'"></i>'+esc(s.name)+'</span>').join('')+'</div>')}
  // log-scale bars: rows [{nm,v,c,txt}] on a decade axis
  function logbars(el,rows,lo,hi){el.innerHTML='<div class="bars pjb">'+rows.map(r=>{const v=r.v;const w=(v==null||!(v>0))?0:Math.max(1,100*(Math.log10(v)-lo)/(hi-lo));
    return '<div class="row'+(r.hl?' hl':'')+'"><span class="nm">'+esc(r.nm)+'</span><span class="track"><span class="fill" style="width:'+Math.min(100,w).toFixed(1)+'%;background:'+(r.c||'var(--c1)')+'"></span></span><span class="val">'+esc(r.txt!=null?r.txt:(v===0?'0':s2(v)))+'</span></div>'}).join('')+'</div>'}
  const smooth=(a,k)=>a.map((_,i)=>{let s=0,n=0;for(let j=Math.max(0,i-k+1);j<=i;j++){if(a[j]!=null){s+=a[j];n++}}return n?s/n:null});
  return {line,logbars,smooth};
})();

// ---- map of the page
(function(){const el=document.getElementById('pj-map');if(!el)return;
  const st=[['1','Translate','modules, optimiser, loop','s-tr'],['2','Set defaults','a dozen differ silently','s-def'],['3','Convert weights','rule on the path, safetensors','s-conv'],['4','Climb the ladder','logits, loss, grads, step, curves','s-eq'],['5','Judge the drift','rounding or bug','s-drift']];
  function draw(){const W=RD.width(el.parentElement),v=W<600;const bw=v?W-20:(W-20-4*14)/5,bh=58,H=v?st.length*(bh+12)+4:bh+10;let b='';
    st.forEach((s,i)=>{const x=v?10:10+i*(bw+14),y=v?4+i*(bh+12):4;
      b+='<g class="pj-mapbox" data-s="'+s[3]+'" style="cursor:pointer"><rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="8" fill="var(--soft)" stroke="var(--acc)"/>'+
        RD.t(x+10,y+20,s[0]+'. '+s[1],{fs:13,w:600})+RD.t(x+10,y+40,s[2],{fs:11,fill:'var(--mute)'})+'</g>';
      if(i<st.length-1)b+=v?'<path d="M'+(W/2)+' '+(y+bh+1)+' v10" stroke="var(--mute)"/>':'<path d="M'+(x+bw+1)+' '+(y+bh/2)+' h12" stroke="var(--mute)"/>'});
    el.setAttribute('viewBox','0 0 '+W+' '+H);el.setAttribute('width',W);el.setAttribute('height',H);el.innerHTML=b}
  el.addEventListener('click',e=>{const gg=e.target.closest('.pj-mapbox');if(gg)document.getElementById(gg.dataset.s).scrollIntoView({block:'start'})});
  draw();RD.onRender(draw);RD.onResize(draw)})();

// ---- in one screen: stats
(function(){const J=window.PJ,g=PJU.get,el=document.getElementById('pj-one-stats');if(!el)return;
  const nDef=document.querySelectorAll('#pj-deftab tbody tr').length-document.querySelectorAll('#pj-deftab tbody td.pj-grp').length;
  const newRuns=Object.values(J.hunt.variants).filter(v=>v.src.indexOf('this page')===0).length;
  el.innerHTML=RD.stat('Logits, correct port',PJU.fmt(g('hunt.variants.correct.rungs.logits'),'s2'),'largest logit '+PJU.fmt(J.hunt.ref.max_abs_logit,'f2'))+
    RD.stat('Defaults that differ',nDef,'each measured alone (section 2)')+
    RD.stat('Port variants trained',Object.keys(J.hunt.variants).length-1,newRuns+' new here, 7 reused from the root')+
    RD.stat('Weights round trip','bit for bit',J.convert.n_tensors+' tensors, '+J.convert.n_transposed+' transposed')+
    RD.stat('GPT-2 by hand',PJU.fmt(J.gpt2.logits_maxdiff,'s2'),'max logit gap at |logit| '+PJU.fmt(J.gpt2.max_abs_logit,'f0'))+
    RD.stat('Twins after '+J.root.twin_steps+' steps',PJU.fmt(J.root.twin_max_abs.torch_vs_jax,'s2'),'largest training-loss gap (root run)')})();

// ---- conversion stats
(function(){const J=window.PJ.convert,el=document.getElementById('pj-conv-stats');if(!el)return;
  el.innerHTML=RD.stat('Tensors',J.n_tensors,J.n_params.toLocaleString('en-US')+' parameters')+RD.stat('Transposed',J.n_transposed,'the Linear kernels')+
    RD.stat('Logits after loading',PJU.fmt(J.torch_to_nnx_logits_maxdiff,'s2'),'500-step weights, largest logit '+PJU.fmt(J.max_abs_logit,'f1'))+
    RD.stat('Back to PyTorch',J.roundtrip_bitwise_equal?'bit-equal':'differs',J.roundtrip_strict_load)})();

// ---- mask cards
(function(){const el=document.getElementById('pj-masks');if(!el)return;const T=4;
  const card=(t,f,note)=>{let c='';for(let i=0;i<T;i++)for(let j=0;j<T;j++){const a=f(i,j);c+='<div class="'+(a?'y':'n')+'" title="query '+i+', key '+j+'">'+(j<=i?'T':'F')+'</div>'}
    return '<div class="pj-mcard"><b>'+t+'</b><div class="pj-mgrid" style="grid-template-columns:repeat('+T+',20px)">'+c+'</div><div class="mute">'+note+'</div></div>'};
  el.innerHTML=card('torch SDPA',(i,j)=>j<=i,'True = attend: causal')+card('jax.nn.dot_product_attention, Flax',(i,j)=>j<=i,'True = attend: causal')+
    card('torch nn.MultiheadAttention',(i,j)=>j>i,'True = blocked: each query sees only later keys; the last row sees nothing')+
    '<div class="pj-cap">Letters are the tensor\'s values (T, F); green cells are the positions the query may attend to under that API.</div>'})();

// ---- fast variance bars
(function(){const el=document.getElementById('pj-fastvar');if(!el)return;const rows=[];
  PJ.defaults.fast_variance.rows.forEach(r=>{rows.push({nm:'mean '+r.mean_offset+': E[x²]-E[x]²',v:r.fast_max_err,c:'var(--bad)',hl:r.fast_max_err>1e-2});rows.push({nm:'mean '+r.mean_offset+': two-pass',v:r.twopass_max_err,c:'var(--good)'})});
  PJV.logbars(el,rows,-8,4)})();

// ---- dropout
(function(){const el=document.getElementById('pj-drop'),cap=document.getElementById('pj-drop-cap');if(!el||!PJ.dropout)return;const D=PJ.dropout.runs;
  const S=[['torch','PyTorch, dropout 0.1','var(--c2)'],['jax_fresh','JAX, fresh key per step','var(--c1)'],['jax_fresh_seed1','JAX, fresh keys, another seed','var(--c6)'],['jax_reuse','JAX, same key every step','var(--c4)'],['jax_off','no dropout (anchor)','var(--mute)']].filter(s=>D[s[0]]);
  const draw=()=>PJV.line(el,S.map(s=>({name:s[1],c:s[2],ys:PJV.smooth(D[s[0]].loss,20).slice(60),dash:s[0]==='jax_off'})),{xlab:'step (training loss, 20-step moving average, from step 60)',x0:60,xticks:[0,120,239],ylo:2.2,yhi:2.65,label:'training loss with dropout'});
  draw();RD.onRender(draw);RD.onResize(draw);
  const f=v=>PJU.fmt(v,'f4'),sm=PJ.dropout.summary;
  cap.innerHTML='Validation after 300 steps (dropout off for evaluation): PyTorch '+f(D.torch.val_300)+', JAX fresh keys '+f(D.jax_fresh.val_300)+(D.jax_fresh_seed1?', JAX another seed '+f(D.jax_fresh_seed1.val_300):'')+', JAX reused key '+f(D.jax_reuse.val_300)+', no dropout '+f(D.jax_off.val_300)+
    '. Step 0 differs by '+PJU.fmt(sm.step0_torch_vs_jax_fresh,'s2')+' already (different masks). The PyTorch and JAX dropout runs differ in validation loss by '+PJU.fmt(Math.abs(D.torch.val_300-D.jax_fresh.val_300),'s2')+', less than two JAX seeds differ from each other ('+PJU.fmt(Math.abs(sm.val_seed_noise),'s2')+'): that is the test a dropout port can pass. The reused key trains one fixed sub-network instead of a fresh one each step; at 300 steps its validation loss is still within seed noise, so a loss curve will not catch it: check that the masks change between steps. Evaluating with dropout left on (the forgotten <code>model.eval()</code>) gives '+f(D.torch.val_300_dropout_left_on)+' instead of '+f(D.torch.val_300)+' for PyTorch. Measured on Apple M1 Pro (CPU), <code>src/runs/pj_dropout.py</code>.'})();
