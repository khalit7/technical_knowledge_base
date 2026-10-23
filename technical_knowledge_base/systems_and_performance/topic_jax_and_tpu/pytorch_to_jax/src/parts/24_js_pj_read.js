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

// ---- hero: the same step, PyTorch's hidden state against JAX's explicit state (static, drawn at the measured width)
(function(){const el=document.getElementById('pj-hero');if(!el)return;
  const mix=c=>'color-mix(in srgb,'+c+' 20%,var(--bg))';
  const box=(x,y,w,h,c,dash)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(c?mix(c):'var(--soft)')+'" stroke="'+(c||'var(--line)')+'"'+(dash?' stroke-dasharray="4 3"':'')+'/>';
  const arr=(x1,y1,x2,y2,c,dash)=>'<path d="M'+x1+' '+y1+' L'+x2+' '+y2+'" stroke="'+(c||'var(--mute)')+'" stroke-width="1.4" fill="none" marker-end="url(#pjh-ah)"'+(dash?' stroke-dasharray="4 3"':'')+'/>';
  const ST=[['weights','in nn.Module','var(--c1)'],['gradients','in p.grad','var(--c2)'],['optimiser state','in opt, sched','var(--c3)'],['random state','global generator','var(--c4)']];
  function torchPanel(x,y,w){let b=RD.t(x,y+14,'PyTorch: state lives inside objects',{fs:13,w:600,fill:'var(--ink)'});
    const by=y+26,bh=30;b+=box(x,by,w,bh,null)+RD.t(x+w/2,by+19,'train_step(model, opt, sched, x, y)',{a:'middle',fs:11.5,fill:'var(--ink)'});
    const gw=(w-10)/2,gh=40,gy=by+bh+40;
    ST.forEach((s,i)=>{const gx=x+(i%2)*(gw+10),yy=gy+Math.floor(i/2)*(gh+10);
      b+=box(gx,yy,gw,gh,s[2],true)+RD.t(gx+8,yy+16,s[0],{fs:12,w:600,fill:'var(--ink)'})+RD.t(gx+8,yy+32,s[1],{fs:11,fill:'var(--mute)'});
      if(i<2)b+=arr(gx+gw/2,by+bh+2,gx+gw/2,gy-3,s[2],true)});
    b+=RD.t(x+w/2,by+bh+24,'changed in place',{a:'middle',fs:11,fill:'var(--mute)'});
    const ey=gy+2*(gh+10)+6;b+=RD.t(x,ey+12,'returns loss.item(): a Python number',{fs:11,fill:'var(--mute)'});
    return {svg:b,h:ey+18-y}}
  function jaxPanel(x,y,w){let b=RD.t(x,y+14,'JAX: state goes in and comes out',{fs:13,w:600,fill:'var(--ink)'});
    const IN=[['params','var(--c1)'],['opt_state','var(--c3)'],['key','var(--c4)'],['x, y',null]],OUT=[['new params','var(--c1)'],['new opt_state','var(--c3)'],['loss',null]];
    const row=(items,yy)=>{const cw=(w-6*(items.length-1))/items.length;let r='';items.forEach((it,i)=>{const cx=x+i*(cw+6);r+=box(cx,yy,cw,26,it[1])+RD.t(cx+cw/2,yy+17,it[0],{a:'middle',fs:11.5,fill:'var(--ink)'})});return {r,cw}};
    const iy=y+26,a1=row(IN,iy);b+=a1.r;
    const by=iy+26+22,bh=62;b+=box(x,by,w,bh,'var(--acc)')+RD.t(x+10,by+18,'jax.jit(train_step): one pure function',{fs:12,w:600,fill:'var(--ink)'});
    b+=box(x+10,by+28,w-20,24,'var(--c2)')+RD.t(x+w/2,by+44,w<400?'grads: a value inside':'grads = value_and_grad(loss_fn)(...): a value inside',{a:'middle',fs:11,fill:'var(--ink)'});
    IN.forEach((_,i)=>{const cx=x+i*(a1.cw+6)+a1.cw/2;b+=arr(cx,iy+27,cx,by-3,IN[i][1])});
    const oy=by+bh+22,a2=row(OUT,oy);b+=a2.r;OUT.forEach((_,i)=>{const cx=x+i*(a2.cw+6)+a2.cw/2;b+=arr(cx,by+bh+1,cx,oy-3,OUT[i][1])});
    b+=RD.t(x,oy+26+16,'the caller passes them into the next step',{fs:11,fill:'var(--mute)'});
    return {svg:b,h:oy+26+22-y}}
  function draw(){const W=RD.width(el.parentElement),wide=W>=640,gap=28;
    const defs='<defs><marker id="pjh-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--mute)"/></marker></defs>';
    let svg,H;
    if(wide){const pw=(W-gap)/2-2,a=torchPanel(1,2,pw),b=jaxPanel(pw+gap,2,pw);H=Math.max(a.h,b.h)+6;
      svg=defs+a.svg+'<line x1="'+(pw+gap/2)+'" y1="4" x2="'+(pw+gap/2)+'" y2="'+(H-4)+'" stroke="var(--line)"/>'+b.svg}
    else{const pw=W-2,a=torchPanel(1,2,pw),b=jaxPanel(1,a.h+22,pw);H=a.h+22+b.h+6;svg=defs+a.svg+'<line x1="0" y1="'+(a.h+11)+'" x2="'+W+'" y2="'+(a.h+11)+'" stroke="var(--line)"/>'+b.svg}
    el.setAttribute('viewBox','0 0 '+W+' '+H);el.setAttribute('width',W);el.setAttribute('height',H);el.innerHTML=svg}
  draw();RD.onRender(draw);RD.onResize(draw)})();

// ---- section 1: the two twins' code, one difference per step (lines highlighted in both panes; captions are static HTML)
(function(){const card=document.getElementById('pj-cs-card');if(!card)return;
  const lines=[...card.querySelectorAll('.pj-lines div')],caps=[...document.querySelectorAll('#pj-cs-cap>div')];
  function draw(i){lines.forEach(d=>{const s=(d.dataset.s||'').split(' ').filter(Boolean);const on=i===0?s.length>0:s.indexOf(String(i))>=0;
      d.classList.toggle('on',on);d.classList.toggle('dim',i>0&&!on)});
    caps.forEach(c=>c.hidden=+c.dataset.i!==i)}
  RD.anim({card:'pj-cs-card',ctl:'pj-cs-ctl',n:6,draw,ms:4500,label:'Difference'})})();

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
    '. Step 0 differs by '+PJU.fmt(sm.step0_torch_vs_jax_fresh,'s2')+' already (different masks). The PyTorch and JAX dropout runs differ in validation loss by '+PJU.fmt(Math.abs(D.torch.val_300-D.jax_fresh.val_300),'s2')+', less than two JAX seeds differ from each other ('+PJU.fmt(Math.abs(sm.val_seed_noise),'s2')+'): that is the test a dropout port can pass. The reused key trains one fixed sub-network instead of a fresh one each step; at 300 steps its validation loss is still within seed noise, so a loss curve will not catch it. Evaluating with dropout left on (the forgotten <code>model.eval()</code>) gives '+f(D.torch.val_300_dropout_left_on)+' instead of '+f(D.torch.val_300)+' for PyTorch. Measured on Apple M1 Pro (CPU), <code>src/runs/pj_dropout.py</code>.'})();
