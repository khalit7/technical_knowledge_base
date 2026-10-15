// ---- Training lab: AdamW check plot, the port panes, pitfalls, the long twin run (animated), checkpoint resume (animated), mixed precision ----
(function(){const {D,$,esc,fmt,stat,seg,chart,anim,onRender,onResize,width}=TR;
  const COL={torch:'var(--c2)',jax:'var(--c1)',nnx:'var(--c3)'};
  const pow10=(a,b)=>{const r=[];for(let e=a;e<=b;e++)r.push(Math.pow(10,e));return r};
  const efmt=v=>'1e'+Math.round(Math.log10(v));

  // AdamW: optax against torch on the same 50 gradients
  (function(){const O=D.ox;
    $('tr-adamw-stats').innerHTML=stat('Matched settings, after '+O.n+' steps',fmt(O.matched.diff[O.n-1],'e1'),'largest parameter difference; weights moved up to '+fmt(O.matched.moved,'e1'))+
      stat('Same, without clipping',fmt(O.matched_noclip.diff[O.n-1],'e1'),'so the clip formula is not the source')+
      stat('Each library\'s defaults',fmt(O.defaults.diff[O.n-1],'e1'),'largest in '+esc(O.worst[0][0])+' (a LayerNorm scale)')+
      stat('Defaults, but weight_decay 0.01 on both',fmt(O.wd_matched.diff[O.n-1],'e1'),'the gap closes to rounding');
    function draw(){const el=$('tr-adamw-plot'),W=width(el),n=O.n,ser=[['matched','var(--c1)','matched settings'],['defaults','var(--c2)','library defaults'],['wd_matched','var(--c3)','defaults, same weight decay']];
      el.innerHTML=chart(W,200,{xmin:1,xmax:n,ymin:1e-9,ymax:1e-2,logy:1,yticks:pow10(-9,-2).filter((v,i)=>i%1===0),yfmt:efmt,xticks:[1,10,20,30,40,50],xlabel:'step',
        series:ser.map(s=>({pts:O[s[0]].diff.map((v,i)=>[i+1,Math.max(v,1e-9)]),color:s[1],w:1.8})),
        extra:[(X,Y,b)=>ser.map((s,i)=>'<text x="'+(b.L+8)+'" y="'+(b.T+14+i*13)+'" font-size="10.5" fill="'+s[1]+'">'+s[2]+'</text>').join('')],label:'Largest parameter difference between torch AdamW and optax adamw per step'})}
    $('tr-adamw-cap').innerHTML='Largest absolute difference over all 826,368 parameters after each step, log scale <span class="tr-meas">measured</span> (<code>src/train/optax_check.py</code>). Matched: the running example\'s settings on both sides (lr warmup to 1e-3, b2 0.95, weight decay 0.1 on the '+O.ndecay+' weight matrices of '+O.ntens+' tensors, clipping at 1.0); it stays at '+fmt(O.matched.diff[O.n-1],'e1')+', one float32 step at 1.0 (2<sup>-23</sup> = 1.19e-7). Defaults: <code>torch.optim.AdamW(params, lr=1e-3)</code> against <code>optax.adamw(1e-3)</code>; the gap grows linearly because only the decay differs: (0.01 &#8722; 0.0001) x lr x weight x steps = '+fmt(O.wd_derived,'e2')+' for a LayerNorm scale of 1.0 after '+O.n+' steps <span class="tr-der">derived</span>, against '+fmt(O.defaults.diff[O.n-1],'e2')+' measured.';
    $('tr-def-wd').innerHTML='after '+O.n+' identical steps the LayerNorm scales differ by '+fmt(O.defaults.diff[O.n-1],'e1')+' (above); in a 300-step training run, validation loss '+fmt(D.pit.v.wd_default.val,'4')+' against '+fmt(D.pit.torch_val300,'4')+' (section 4)';
    onRender(draw);onResize(draw)})();

  // the port, line by line
  (function(){const P=D.port;let side='nnx',cur=null;
    const pane=(arr,el)=>{el.innerHTML=arr.map(([l,k])=>l==='...'?'<div class="l gap">...</div>':'<div class="l'+(k?' k':'')+'"'+(k?' data-k="'+k+'"':'')+'>'+esc(l)+'</div>').join('')};
    function render(){pane(P.torch,$('tr-port-l'));pane(P[side],$('tr-port-r'));$('tr-port-rh').textContent=side==='nnx'?'Flax NNX: model_nnx.py':'plain JAX + optax: model_jax.py';if(cur)hl(cur)}
    function hl(k,from){cur=k;document.querySelectorAll('#t-train .tr-port div.l').forEach(d=>d.classList.toggle('on',d.dataset.k===k));$('tr-port-note').textContent=P.notes[k]||'';
      ['tr-port-l','tr-port-r'].forEach(id=>{if(id===from)return;const pn=$(id),d=pn.querySelector('div.l.on');if(d)pn.scrollTop=Math.max(0,d.offsetTop-40)})}
    ['tr-port-l','tr-port-r'].forEach(id=>{const el=$(id);const f=e=>{const d=e.target.closest('div.l[data-k]');if(d&&d.dataset.k!==cur)hl(d.dataset.k,id)};el.addEventListener('mouseover',f);el.addEventListener('click',f)});
    seg($('tr-portseg'),m=>{side=m;render()});render()})();

  // pitfalls
  (function(){const P=D.pit,keys=Object.keys(P.v),cols=['var(--ink)','var(--c2)','var(--c6)','var(--c4)','var(--c3)','var(--c5)','#d64b8a','var(--c1)'];
    const on={correct:1,transpose:1,ln_eps:1,b2_default:1};let mode='diff';
    $('tr-pit-list').innerHTML=keys.map((k,i)=>'<label><input type="checkbox" data-k="'+k+'"'+(on[k]?' checked':'')+'><span class="sw" style="background:'+cols[i]+'"></span><span>'+esc(P.v[k].label)+'</span></label>').join('');
    $('tr-pit-tab').innerHTML='<tr><td>PyTorch twin (reference)</td><td class="num">0</td><td class="num">'+fmt(P.torch_val300,'4')+'</td><td class="num"></td></tr>'+
      keys.map(k=>{const v=P.v[k],dv=v.val-P.torch_val300;return '<tr><td>'+esc(v.label)+'</td><td class="num">'+fmt(v.d0,'e1')+'</td><td class="num">'+fmt(v.val,'4')+'</td><td class="num">'+(dv>=0?'+':'&#8722;')+Math.abs(dv).toFixed(4)+'</td></tr>'}).join('');
    function draw(){const el=$('tr-pit-plot'),W=width(el),n=P.torch.length;const ser=[];
      if(mode==='loss'){ser.push({pts:P.torch.map((v,i)=>[i,v]),color:'var(--mute)',w:4,op:.35});
        keys.forEach((k,i)=>{if(on[k])ser.push({pts:P.v[k].loss.map((v,j)=>[j,v]),color:cols[i],w:1.4})});
        el.innerHTML=chart(W,240,{xmin:0,xmax:n,ymin:2,ymax:4.8,yticks:[2,2.5,3,3.5,4,4.5],yfmt:v=>v.toFixed(1),xticks:[0,100,200,300],xlabel:'step (thick grey: PyTorch)',series:ser,label:'Training loss with porting mistakes'})}
      else{const wm=a=>{const o=[];for(let j=0;j<a.length;j+=5){o.push([j,Math.max(1e-7,...a.slice(j,j+5))])}return o};keys.forEach((k,i)=>{if(on[k])ser.push({pts:wm(P.v[k].loss.map((v,j)=>Math.abs(v-P.torch[j]))),color:cols[i],w:1.5})});
        el.innerHTML=chart(W,240,{xmin:0,xmax:n,ymin:1e-7,ymax:1,logy:1,yticks:pow10(-7,0),yfmt:efmt,xticks:[0,100,200,300],xlabel:'step: largest |loss minus PyTorch| per 5 steps',series:ser,label:'Difference from PyTorch loss'})}}
    $('tr-pit-list').addEventListener('change',e=>{const k=e.target.dataset.k;if(!k)return;on[k]=e.target.checked?1:0;draw()});
    seg($('tr-pit-mode'),m=>{mode=m;draw()});
    $('tr-pit-cap').innerHTML='Plain-JAX twin, 300 steps each, the shared weights and batches; the PyTorch curve is the setup run\'s. Losses are stored to 6 decimals, so differences below about 1e-6 are rounding. Logit difference: largest |logit| difference from PyTorch on training batch 0 before any training (largest logit about 1.1). <span class="tr-meas">measured</span> (<code>src/train/pitfalls.py</code>)';
    onRender(draw);onResize(draw)})();

  // the long twin run: animated overlay
  (function(){const T=D.twin,E=T.every,n=T.steps,F=Math.round(n/100)+1;let mode='tj';
    const Lmin=Math.min(...T.loss.torch,...T.loss.jax),y0=Math.floor(Lmin*5)/5;
    function draw(f){const el=$('tr-twin-svg'),W=width(el),s=Math.min(n,f*100),k=Math.min(T.loss.torch.length,Math.floor(s/E)+1);
      const top=chart(W,230,{xmin:0,xmax:n,ymin:y0,ymax:4.4,yticks:[y0,2,2.5,3,3.5,4].filter((v,i,a)=>v>=y0&&a.indexOf(v)===i),yfmt:v=>v.toFixed(1),xticks:[0,n/4,n/2,3*n/4,n],xfmt:v=>Math.round(v).toLocaleString('en-US'),ylabel:'',
        series:[{pts:T.loss.jax.slice(0,k).map((v,i)=>[i*E,v]),color:COL.jax,w:1.4},{pts:T.loss.torch.slice(0,k).map((v,i)=>[i*E,v]),color:COL.torch,w:1.4,dash:'4 4'},
          {pts:T.val_at.map((a,i)=>[a,T.val.torch[i]]).filter(q=>q[0]<=s),color:COL.torch,dots:1,r:3.2},{pts:T.val_at.map((a,i)=>[a,T.val.jax[i]]).filter(q=>q[0]<=s),color:COL.jax,dots:1,r:2}],
        extra:[(X,Y,b)=>'<text x="'+(b.L+b.pw-6)+'" y="'+(b.T+14)+'" text-anchor="end" font-size="10.5" fill="'+COL.torch+'">PyTorch (dashed)</text><text x="'+(b.L+b.pw-6)+'" y="'+(b.T+27)+'" text-anchor="end" font-size="10.5" fill="'+COL.jax+'">plain JAX</text>'],label:'Training loss, PyTorch and JAX'});
      const dd=T.dwin[mode].slice(0,k);
      const bot=chart(W,150,{xmin:0,xmax:n,ymin:1e-7,ymax:1e-1,logy:1,yticks:[1e-7,1e-5,1e-3,1e-1],yfmt:efmt,xticks:[0,n/2,n],xfmt:v=>Math.round(v).toLocaleString('en-US'),xlabel:'step',
        series:[{pts:dd.map((v,i)=>[i*E,Math.max(v,1e-7)]),color:mode==='tj'?'var(--c4)':'var(--c3)',w:1.2}],label:'Largest loss difference per 10 steps'});
      el.innerHTML=top+bot;
      const i=Math.min(k-1,T.loss.torch.length-1),st=i*E,a=T.loss.torch[i],b=T.loss.jax[i],c=T.loss.nnx[i];
      const fo=T.first_over;let note='';
      if(fo.e5!=null&&s>=fo.e5&&s<fo.e5+100)note=' The difference has just passed 1e-5 for the first time.';
      if(fo.e3!=null&&s>=fo.e3&&s<fo.e3+100)note=' The difference has just passed 1e-3 for the first time.';
      if(f===0)note=' Same weights, same batch: the losses agree to every printed digit.';
      if(s>=n)note=' End of the run: final validation losses '+fmt(T.val.torch[T.val.torch.length-1],'4')+' (PyTorch) and '+fmt(T.val.jax[T.val.jax.length-1],'4')+' (JAX).';
      $('tr-twin-cap').innerHTML='<b>Step '+st.toLocaleString('en-US')+'.</b> Training loss PyTorch '+a.toFixed(4)+', plain JAX '+b.toFixed(4)+', NNX '+c.toFixed(4)+'; |PyTorch &#8722; JAX| '+fmt(Math.abs(a-b),'e1')+'.'+note}
    const A=anim({card:'tr-twin-card',ctl:'tr-twin-ctl',n:F,ms:420,label:'Training step',draw});
    seg($('tr-twin-mode'),m=>{mode=m;A.redraw()});onResize(()=>A.redraw());
    $('tr-twin-stats').innerHTML=stat('Final validation loss','PyTorch '+fmt(T.val.torch[T.val.torch.length-1],'4'),'plain JAX '+fmt(T.val.jax[T.val.jax.length-1],'4')+', NNX '+fmt(T.val.nnx[T.val.nnx.length-1],'4'))+
      stat('Largest training-loss gap',fmt(T.max_abs_loss_diff.torch_vs_jax,'e1'),'PyTorch vs plain JAX over all '+n.toLocaleString('en-US')+' steps')+
      stat('Steps with clipping active',T.clip.torch.toLocaleString('en-US'),'PyTorch; JAX '+T.clip.jax.toLocaleString('en-US')+' (gradient norm above 1.0)');
    if(T.first_over.e2!=null&&$('tr-twin-over2'))$('tr-twin-over2').textContent=' (and 1e-2 at step '+T.first_over.e2.toLocaleString('en-US')+')';
    const dr=T.drift;$('tr-drift-tab').innerHTML=dr.map(d=>'<tr><td class="num">'+d.step.toLocaleString('en-US')+'</td><td class="num">'+fmt(d.w_torch_vs_jax_excl_keybias,'e1')+'</td><td class="num">'+fmt(d.w_torch_vs_jax_keybias,'e1')+'</td><td class="num">'+fmt(d.keybias_norm_torch,'e1')+'</td><td class="num">'+fmt(d.logits_torch_vs_jax,'e1')+'</td><td class="num">'+d.max_abs_logit.toFixed(1)+'</td></tr>').join('');
    const tm=k=>(T.time[k]*1000).toFixed(0)+' ms';
    $('tr-twin-time').innerHTML=['torch','jax','nnx'].map(k=>stat({torch:'PyTorch (eager)',jax:'plain JAX (jax.jit)',nnx:'Flax NNX (nnx.jit)'}[k],tm(k),'p10 to p90: '+(T.time_p[k][0]*1000).toFixed(0)+' to '+(T.time_p[k][1]*1000).toFixed(0)+' ms; first step '+T.first[k].toFixed(2)+' s')).join('');
  })();

  // checkpoint resume, animated
  (function(){const K=D.ck,L=K.losses_full,N=K.total_steps,S=K.save_at;
    const CAP=['<b>Two runs start from the same weights.</b> Run A will train '+N+' steps without stopping; run B is the same program that will be stopped.',
      '<b>Steps 0 to '+(S-1)+'.</b> Both runs read the same grain batches and their losses are identical.',
      '<b>Run B saves at step '+S+'</b>: params, Adam state and the grain iterator ({"next_index": '+K.iterator_state.next_index+'}) in one orbax checkpoint. <code>save()</code> returned in '+K.save_call_s.toFixed(2)+' s and the background write finished at '+K.save_total_s.toFixed(2)+' s (rough timing, CPU).',
      '<b>Run B\'s process exits.</b> Everything it had in memory is gone; only the checkpoint folder remains.',
      '<b>A new Python process restores step '+K.restored_step+'</b> into arrays of the same shapes, and grain\'s iterator into the same position: the next batch is batch '+S+' of epoch 1 (of '+K.batches_per_epoch+').',
      '<b>Steps '+S+' to '+(N-1)+'.</b> The resumed run\'s losses equal run A\'s at every step ('+(K.losses_identical?'all '+(N-S)+' identical':'NOT identical')+').',
      '<b>Final state compared:</b> '+K.n_arrays_compared+' arrays (parameters and both Adam moments), '+(K.bit_identical_state?'bit-identical':'different')+', largest difference '+K.max_abs_diff+'.'];
    function draw(i){const el=$('tr-ck-svg'),W=width(el),H=210,L0=40,pw=W-L0-12,X=s=>L0+s/N*pw,lane=[20,112],lh=74;
      const ymin=Math.min(...L)-0.1,ymax=Math.max(...L)+0.05,Y=(v,b)=>b+lh-6-(v-ymin)/(ymax-ymin)*(lh-12);
      let s='';const upto=[i<=0?0:i===1?S:N,i<=0?0:i<=4?S:N];
      ['Run A: never stopped','Run B: stopped and resumed'].forEach((nm,r)=>{const b=lane[r];
        s+='<rect x="'+L0+'" y="'+b+'" width="'+pw+'" height="'+lh+'" rx="6" fill="var(--soft)" stroke="var(--line)"/>'+TR.t(L0+6,b+13,nm,{fs:10.5,fill:'var(--mute)'});
        const u=upto[r];if(u>0){const pts=L.slice(0,u).map((v,k)=>(k?'L':'M')+X(k).toFixed(1)+' '+Y(v,b).toFixed(1)).join('');
          s+='<path d="'+pts+'" fill="none" stroke="'+(r?'var(--c1)':'var(--c2)')+'" stroke-width="1.5"/>'}});
      const xs=X(S);
      if(i>=2)s+='<line x1="'+xs+'" x2="'+xs+'" y1="'+(lane[1]-4)+'" y2="'+(lane[1]+lh+4)+'" stroke="var(--c5)" stroke-width="2"/>'+TR.t(xs,lane[1]-5,'checkpoint, step '+S,{a:'middle',fs:10.5,fill:'var(--c5)'});
      if(i===3)s+='<rect x="'+(xs+2)+'" y="'+lane[1]+'" width="'+(X(N)-xs-2)+'" height="'+lh+'" fill="var(--bg)" opacity="0.85"/>'+TR.t((xs+X(N))/2,lane[1]+lh/2+4,'process exited',{a:'middle',fs:11,fill:'var(--mute)'});
      if(i===4)s+=TR.t((xs+X(N))/2,lane[1]+lh/2+4,'new process: restore',{a:'middle',fs:11,fill:'var(--c1)'});
      if(i>=5)s+='<path d="'+L.slice(S).map((v,k)=>(k?'L':'M')+X(S+k).toFixed(1)+' '+Y(v,lane[0]).toFixed(1)).join('')+'" fill="none" stroke="var(--c1)" stroke-width="1" stroke-dasharray="3 3"/>';
      s+=TR.t(L0,H-2,'0',{fs:10,fill:'var(--mute)'})+TR.t(L0+pw,H-2,String(N),{a:'end',fs:10,fill:'var(--mute)'})+TR.t(L0+pw/2,H-2,'step',{a:'middle',fs:10,fill:'var(--mute)'});
      el.innerHTML=TR.svg(W,H,s,'Checkpoint and resume timeline');$('tr-ck-cap').innerHTML=CAP[i]}
    const A=anim({card:'tr-ck-card',ctl:'tr-ck-ctl',n:CAP.length,ms:2000,label:'Checkpoint step',draw});onResize(()=>A.redraw());
    $('tr-ck-stats').innerHTML=stat('Resumed state against uninterrupted',K.bit_identical_state?'bit-identical':'different',K.n_arrays_compared+' arrays, largest difference '+K.max_abs_diff)+
      stat('Losses after resuming',K.losses_identical?'identical':'different','all '+(N-S)+' steps, compared as float64')+
      stat('Async save',K.save_call_s.toFixed(2)+' s','until save() returned; '+K.save_total_s.toFixed(2)+' s until written (rough)');
    $('tr-ck-files').innerHTML=K.files.map(f=>'<div class="row"><span>'+esc(f[0])+'</span><span>'+(f[1]>=1e5?(f[1]/1e6).toFixed(2)+' MB':f[1].toLocaleString('en-US')+' B')+'</span></div>').join('');
  })();

  // mixed precision
  (function(){const M=D.mx,keys=['f32','bf16_master','bf16_all'],nm={f32:'f32',bf16_master:'bf16 + f32 master',bf16_all:'bf16 everywhere'},cl={f32:'var(--ink)',bf16_master:'var(--c1)',bf16_all:'var(--c2)'};
    function draw(){const el=$('tr-mx-plot'),W=width(el);const sm=a=>a.map((v,i)=>[i,a.slice(Math.max(0,i-19),i+1).reduce((x,y)=>x+y,0)/Math.min(20,i+1)]).filter(q=>q[0]>=100);
      const zoom=chart(W,170,{xmin:100,xmax:300,ymin:2.2,ymax:2.5,yticks:[2.2,2.3,2.4,2.5],yfmt:v=>v.toFixed(1),xticks:[100,200,300],xlabel:'steps 100 to 300, 20-step running mean',series:keys.map(k=>({pts:sm(M[k].loss),color:cl[k],w:k==='f32'?3:1.6,op:k==='f32'?.45:1})),label:'Smoothed loss, zoomed'});
      el.innerHTML=chart(W,220,{xmin:0,xmax:M.f32.loss.length,ymin:2,ymax:4.4,yticks:[2,2.5,3,3.5,4],yfmt:v=>v.toFixed(1),xticks:[0,100,200,300],xlabel:'step',
      series:keys.map(k=>({pts:M[k].loss.map((v,i)=>[i,v]),color:cl[k],w:k==='f32'?3:1.5,op:k==='f32'?.4:1})),
      extra:[(X,Y,b)=>keys.map((k,i)=>'<text x="'+(b.L+b.pw-6)+'" y="'+(b.T+14+i*13)+'" text-anchor="end" font-size="10.5" fill="'+cl[k]+'">'+nm[k]+'</text>').join('')],label:'Training loss in three precisions'})+zoom}
    const mb=b=>(b/1e6).toFixed(1)+' MB';
    $('tr-mx-tab').innerHTML=keys.map(k=>{const v=M[k];return '<tr><td>'+nm[k]+' <span class="mute small">(weights '+v.param_dtype+', gradients '+v.grad_dtype+')</span></td><td class="num">'+v.val_300.toFixed(4)+'</td><td class="num">'+mb(v.param_bytes)+' + '+mb(v.opt_state_bytes)+'</td><td class="num">'+v.ln_scale_unmoved.toLocaleString('en-US')+' of '+v.ln_scale_entries.toLocaleString('en-US')+'</td></tr>'}).join('');
    onRender(draw);onResize(draw)})();
})();
