// ---- Optimiser lab tab (t-opt) ----
(function(){
  const U=TSU,D=U.D,S1=D.opt.S1,root=document.getElementById('t-opt');if(!root)return;
  const H=S1.hyper,steps=S1.steps,tr=S1.track;
  const STG=[['grad','gradient g','from jax.grad on batch t'],['clipped','after clip_by_global_norm','g x min(1, 1/||g||)'],['mu','first moment m','b1 m + (1 - b1) g'],['nu','second moment v','b2 v + (1 - b2) g&#178;'],
    ['mu_hat','m&#770; (bias-corrected)','m / (1 - b1^(t+1))'],['nu_hat','v&#770; (bias-corrected)','v / (1 - b2^(t+1))'],['adam','Adam direction','m&#770; / (&#8730;v&#770; + eps)'],
    ['decayed','+ weight decay','+ 0.1 p if masked'],['update','update','x (-lr)'],['param_after','new parameter','p + update']];
  const fmt=v=>{const a=Math.abs(v);return a===0?'0':(a<1e-3||a>=1e3)?U.ex(v,3):Number(v).toPrecision(5)};
  let t=0,ci=0;
  const ss=document.getElementById('op-step'),sc=document.getElementById('op-coord');
  ss.innerHTML=steps.map((s,i)=>'<option value="'+i+'">'+i+' (loss '+s.loss.toFixed(3)+')</option>').join('');
  sc.innerHTML=tr.map((n,i)=>'<option value="'+i+'">'+U.esc(n)+'</option>').join('');
  function caption(k){const s=steps[t],v=s.stages,prev=t>0?steps[t-1].stages:null,b1=H.b1,b2=H.b2,x=n=>fmt(v[n][ci]);
    const masked=tr[ci].indexOf('(decayed)')>=0;
    switch(k){
      case 0:return 'The gradient of the loss for this number on training batch '+t+': '+x('grad')+'. The whole gradient tree has norm '+s.grad_norm.toFixed(4)+'.';
      case 1:return s.clip_scale<1?'The global norm '+s.grad_norm.toFixed(3)+' is above 1.0, so every gradient is multiplied by '+s.clip_scale.toFixed(4)+': '+x('clipped')+'.':'The global norm '+s.grad_norm.toFixed(3)+' is below 1.0: clipping leaves the gradient unchanged.';
      case 2:return 'm = '+b1+' x '+(prev?fmt(prev.mu[ci]):'0')+' + '+(1-b1).toFixed(2)+' x '+x('clipped')+' = '+x('mu')+'.';
      case 3:return 'v = '+b2+' x '+(prev?fmt(prev.nu[ci]):'0')+' + '+(1-b2).toFixed(2)+' x g&#178; = '+x('nu')+'.';
      case 4:return 'Bias correction divides by 1 - '+b1+'^'+(t+1)+' = '+(1-Math.pow(b1,t+1)).toFixed(4)+': m&#770; = '+x('mu_hat')+'. Early on m is biased towards its zero start.';
      case 5:return 'v&#770; = v / '+(1-Math.pow(b2,t+1)).toFixed(4)+' = '+x('nu_hat')+'.';
      case 6:return 'm&#770; / (&#8730;v&#770; + 1e-8) = '+x('adam')+'. '+(t===0?'At step 0 m&#770; = g and v&#770; = g&#178;, so this is the sign of g, unless |g| is near eps.':'Its size no longer depends on the gradient\'s scale.')+(tr[ci].indexOf('noise')>=0?' This gradient is float noise far below eps = 1e-8, so eps dominates the denominator.':'');
      case 7:return masked?'This is a weight matrix: decay adds 0.1 x p = 0.1 x '+fmt(v.param_before[ci])+', giving '+x('decayed')+'.':'Not in the mask (biases, norms, embeddings): no decay, '+x('decayed')+'.';
      case 8:return 'Multiply by -lr = -'+U.ex(s.lr,2)+' (warmup step '+t+' of 50): update '+x('update')+'.';
      case 9:return 'optax.apply_updates adds it: '+fmt(v.param_before[ci])+' + '+x('update')+' = '+x('param_after')+'.';}}
  function draw(k){const v=steps[t].stages;
    document.getElementById('op-pipe').innerHTML=STG.map((s,i)=>'<div class="op-st'+(i===k?' on':i>k?' off':'')+'"><div class="k">'+(i+1)+'. '+s[1]+'</div><div class="v">'+(i<=k?fmt(v[s[0]][ci]):'&#8230;')+'</div><div class="f">'+s[2]+'</div></div>').join('');
    document.getElementById('op-cap').innerHTML=caption(k);
    const s=steps[t];document.getElementById('op-stats').innerHTML=RD.stat('step',t,'loss '+s.loss.toFixed(4))+RD.stat('learning rate',U.ex(s.lr,2),'warmup')+RD.stat('clip factor',s.clip_scale.toFixed(4),'grad norm '+s.grad_norm.toFixed(3))+RD.stat('hand vs optax',U.ex(s.hand_vs_optax_maxdiff,1)||'0','largest gap, all leaves');
    const nn=s.norms;U.table('op-norms',[['Stage'],['Global norm',1]],[['gradient',nn.grad.toFixed(4)],['after clipping',nn.clipped.toFixed(4)],['Adam direction',nn.adam.toFixed(2)],['+ decay',nn.decayed.toFixed(2)],['update',U.ex(nn.update,3)]]);}
  const A=RD.anim({card:'op-card',ctl:'op-ctl',n:STG.length,draw,ms:1500,label:'Stage'});
  ss.addEventListener('change',()=>{t=+ss.value;A.reset(STG.length);A.play()});
  sc.addEventListener('change',()=>{ci=+sc.value;A.reset(STG.length);A.play()});
  // Muon spectrum
  const S8=D.opt.S8,SV=S8.sv_after_frob_and_each_iter;
  const nsSvg=document.getElementById('op-ns-svg');
  function nsDraw(i){const W=Math.max(280,nsSvg.clientWidth||600),Hh=190,L=40,B=22,T=8;const v=SV[i].slice().sort((a,b)=>b-a);
    const lo=-9,hi=0.5,Y=x=>T+(1-(Math.log10(Math.max(x,1e-9))-lo)/(hi-lo))*(Hh-T-B),bw=(W-L-6)/v.length;
    let s='';[-8,-6,-4,-2,0].forEach(e=>{const y=Y(Math.pow(10,e));s+='<line x1="'+L+'" x2="'+W+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-4,y+3,'1e'+e,{a:'end',fs:10,fill:'var(--mute)'})});
    const y1=Y(1);s+='<line x1="'+L+'" x2="'+W+'" y1="'+y1+'" y2="'+y1+'" stroke="var(--c3)" stroke-dasharray="4 3"/>'+RD.t(W-4,y1-3,'1',{a:'end',fs:10,fill:'var(--c3)'});
    v.forEach((x,j)=>{const y=Y(x);s+='<rect x="'+(L+j*bw).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0.6,bw-0.6).toFixed(1)+'" height="'+(Hh-B-y).toFixed(1)+'" fill="'+(i===0?'var(--c2)':'var(--c1)')+'"/>'});
    s+=RD.t(L,Hh-6,'singular values, largest to smallest (128)',{fs:10.5,fill:'var(--mute)'});
    nsSvg.innerHTML=RD.svg(W,Hh,s,'singular values of the gradient during Newton-Schulz');
    const mx=Math.max(...v),mn=Math.min(...v),mid=v.filter(x=>x>=0.5).length;
    document.getElementById('op-ns-cap').innerHTML=i===0?'Before: the gradient divided by its Frobenius norm. Largest singular value '+mx.toFixed(3)+', smallest '+U.ex(mn,1)+': a spread of '+U.ex(S8.cond_raw,1)+' in the raw gradient. Plain momentum SGD would step mostly along the top few directions.':
      'After iteration '+i+' of X &#8592; 3.4445 X &#8722; 4.7750 (XX&#7488;)X + 2.0315 (XX&#7488;)&#178;X: largest '+mx.toFixed(3)+', '+mid+' of 128 at or above 0.5'+(i===5?'. This is the update direction Muon uses (then scaled by the learning rate and a shape factor). The near-zero direction stays near zero.':'.');}
  const NS=RD.anim({card:'op-ns-card',ctl:'op-ns-ctl',n:SV.length,draw:nsDraw,ms:1300,label:'Iteration'});
  // schedules
  function sched(){const e=document.getElementById('op-sched-svg');if(!e||e.offsetParent===null)return;const S6=D.opt.S6;
    U.lines(e,[{name:'warmup_cosine_decay (old page)',color:U.COL[0],pts:S6.steps.map((s,i)=>[s,S6.warmup_cosine[i]])},{name:'warmup-stable-decay (join_schedules)',color:U.COL[1],pts:S6.steps.map((s,i)=>[s,S6.wsd[i]])}],{dec:5,label:'learning rate schedules',h:200})}
  U.table('op-ms',[['Micro-batch'],['Update norm',1],['mini_step',1],['gradient_step',1]],D.opt.S4.micro.map(m=>[m.micro,m.update_norm===0?'0':m.update_norm.toFixed(4),m.mini_step,m.gradient_step]));
  U.table('op-fin',[['Step'],['NaN?'],['Update norm',1],['notfinite_count',1]],D.opt.S5.steps.map(s=>[s.step,s.nan_injected?'<b>yes</b>':'',s.update_norm===0?'0':s.update_norm.toFixed(4),s.notfinite_count]));
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-opt']=[()=>{A.redraw();NS.redraw();sched()}];
  addEventListener('resize',()=>{if(root.hidden)return;NS.redraw();sched()});
})();
