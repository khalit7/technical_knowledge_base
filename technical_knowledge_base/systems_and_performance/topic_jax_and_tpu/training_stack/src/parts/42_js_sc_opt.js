// ---- Scene, Fig. 2 (section 4): one AdamW step through the running example's optax chain, on real gradients (TS.opt.S1, src/runs/ts_optax.py).
// Columns: the eight tracked numbers; rows, back to front: the value after each stage (gradient, clipped, m, v, m-hat, v-hat, Adam direction, + decay,
// update, new parameter), as signed bars on white plinths (positive up, negative hanging below), each row scaled to its own largest magnitude.
// Glass walls are the transformations of the chain the gradient passes through. The chosen number's column is in the highlight colour; its values are
// printed. Steps are explained by #sx-opt; the step and number selects redraw without restarting. ----
(function(){
  const root=document.getElementById('stg-opt');if(!root||!window.TSS||!window.TS)return;const {at,off,lerp,mix}=S3,{lab,legs,tint}=TSS;
  const U=TSU,S1=TS.opt.S1,H=S1.hyper,steps=S1.steps,tr=S1.track,NC=tr.length;
  const KEYS=['grad','clipped','mu','nu','mu_hat','nu_hat','adam','decayed','update','param_after'];
  const RN=['g','clipped','m','v','m̂','v̂','m̂ / (√v̂ + ε)','+ 0.1 p if masked','× (−lr)','p + update'];
  const GRP=[[0],[1],[2,3],[4,5],[6],[7],[8],[9]];
  const WALLS=[[0.5,'clip_by_global_norm(1.0)',P=>P.c2],[1.5,'scale_by_adam(0.9, 0.95, 1e-8)',P=>P.c3],[6.5,'add_decayed_weights(0.1, mask)',P=>P.c3],[7.5,'scale_by_learning_rate(schedule)',P=>P.c3],[8.5,'apply_updates',P=>P.c1]];
  const XS=.9,x=i=>(i-(NC-1)/2)*XS,z=r=>-4.3+r*.95,YP=1.0,HM=.95,W=NC*XS+.3;
  let t=0,ci=0;
  const fmt=v=>{const a=Math.abs(v);return a===0?'0':(a<1e-3||a>=1e3)?U.ex(v,2):Number(v).toPrecision(4)};
  function row(R,r,a,cur){const P=R.P,v=steps[t].stages[KEYS[r]],m=Math.max(...v.map(Math.abs))||1,zz=z(r);
    R.box([0,YP-.045,zz],[W,.045,.38],{a,shadow:false});
    [-1,1].forEach(sx=>R.box([sx*W/2,0,zz],[.035,YP-.05,.035],{a:a*.9,shadow:false}));
    v.forEach((val,i)=>{const h=Math.max(.012,Math.abs(val)/m*HM),sel=i===ci;
      R.box([x(i),val>=0?YP:YP-.045-h,zz],[XS*.62,h,.2],{fill:sel?P.acc:P.paper,a:sel?a:a*(cur?.95:1),shadow:false,lw:.7})});
    lab(R,[x(0)-.6,YP,zz],RN[r],{mono:true,fs:12,al:'right',dx:-6,c:cur?P.ink:P.mute,a:Math.max(.45,a),grp:'rows'});
    if(cur){const val=v[ci],h=Math.abs(val)/m*HM;lab(R,[x(ci),val>=0?YP+h:YP,zz],fmt(val),{mono:true,fs:12.5,b:1,dy:val>=0?-11:-11,c:P.acc,a});
      lab(R,[x(NC-1)+.4,YP,zz],'scale '+fmt(m),{mono:true,fs:12,al:'left',dx:6,c:P.mute,a,grp:'sc',wide:1})}}
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-5,5,.5);
    const now=GRP[k],last=now[now.length-1];
    for(let r=0;r<KEYS.length;r++){
      if(r>last){R.quad([[-W/2,YP,z(r)-.19],[W/2,YP,z(r)-.19],[W/2,YP,z(r)+.19],[-W/2,YP,z(r)+.19]],{a:.5,ec:P.mute,dash:[4,3],lw:1});continue}
      const cur=now.indexOf(r)>=0;row(R,r,cur?Math.min(1,.15+e*1.2):.22,cur)}
    WALLS.forEach(([rr,name,c])=>{const zz=z(0)+(rr)*.95,on=rr===now[0]-.5||((k===3||k===4)&&rr===1.5),seen=rr<last;
      const a=on?1:seen?.22:.12;R.glass([-W/2,.05,zz],[W,0,0],[0,1.75,0],{c:c(P),a,nu:8,nv:3,th:.03});
      if(on)lab(R,[0,1.8,zz],name,{mono:true,fs:12.5,b:1,dy:-10,c:c(P),a:Math.min(1,e*2)})});
    // the chosen number's value flows from the last row through the wall into this one; the others follow faintly
    if(k>0){const from=GRP[k-1][GRP[k-1].length-1];now.forEach(r=>{
      for(let i=0;i<NC;i++){const sel=i===ci;R.flow(legs([[x(i),YP+.25,z(from)+.2],[x(i),YP+.25,z(r)-.2]]),{c:sel?P.acc:P.c2,r:sel?.06:.035,n:sel?6:3,speed:.9,a:(sel?1:.35)*Math.min(1,e*1.5)})}})}
    if(k===2)lab(R,[0,0,z(3)+.3],'opt_state: mu, nu (checkpointed)',{mono:true,fs:12.5,dy:16,c:P.c3,b:1,a:e,wide:1});
  }
  // one view for every step: the whole chain, looked at from the front and above, so the rows spread down the canvas
  const full={cam:[.12,.78],bounds:[[-W/2-.2,0,z(0)-.3],[W/2+.2,1.8,z(9)+.4]]};
  // each step moves in on the row it produces and the row it came from (the camera keeps the full view's distance)
  const V=GRP.map((g,k)=>({cam:[.1,.74],bounds:[[-W/2-.2,0,z(Math.max(0,g[0]-1))-.45],[W/2+.2,1.9,z(g[g.length-1])+.45]]}));
  // the readout under the step list: the chosen number at every stage so far, with the arithmetic of this step
  const STG=[['grad','gradient g','from jax.grad on batch t'],['clipped','after clip_by_global_norm','g x min(1, 1/||g||)'],['mu','first moment m','b1 m + (1 - b1) g'],['nu','second moment v','b2 v + (1 - b2) g&#178;'],
    ['mu_hat','m&#770; (bias-corrected)','m / (1 - b1^(t+1))'],['nu_hat','v&#770; (bias-corrected)','v / (1 - b2^(t+1))'],['adam','Adam direction','m&#770; / (&#8730;v&#770; + eps)'],
    ['decayed','+ weight decay','+ 0.1 p if masked'],['update','update','x (-lr)'],['param_after','new parameter','p + update']];
  function arith(s){const st=steps[t],v=st.stages,prev=t>0?steps[t-1].stages:null,b1=H.b1,b2=H.b2,X=n=>fmt(v[n][ci]),masked=tr[ci].indexOf('(decayed)')>=0;
    switch(s){
      case 0:return 'g = '+X('grad')+'; global norm '+st.grad_norm.toFixed(4)+'.';
      case 1:return st.clip_scale<1?'x '+st.clip_scale.toFixed(4)+' = '+X('clipped')+'.':'norm below 1.0: unchanged, '+X('clipped')+'.';
      case 2:return 'm = '+b1+' x '+(prev?fmt(prev.mu[ci]):'0')+' + '+(1-b1).toFixed(2)+' x g = '+X('mu')+'.';
      case 3:return 'v = '+b2+' x '+(prev?fmt(prev.nu[ci]):'0')+' + '+(1-b2).toFixed(2)+' x g&#178; = '+X('nu')+'.';
      case 4:return 'm&#770; = m / '+(1-Math.pow(b1,t+1)).toFixed(4)+' = '+X('mu_hat')+'.';
      case 5:return 'v&#770; = v / '+(1-Math.pow(b2,t+1)).toFixed(4)+' = '+X('nu_hat')+'.';
      case 6:return 'm&#770; / (&#8730;v&#770; + 1e-8) = '+X('adam')+'.';
      case 7:return masked?'+ 0.1 x '+fmt(v.param_before[ci])+' = '+X('decayed')+'.':'not in the mask: '+X('decayed')+'.';
      case 8:return 'x -'+U.ex(st.lr,2)+' (warmup step '+t+' of 50) = '+X('update')+'.';
      case 9:return fmt(v.param_before[ci])+' + '+X('update')+' = '+X('param_after')+'.';}}
  function readout(k){const v=steps[t].stages,g=GRP[k],last=g[g.length-1];
    document.getElementById('op-pipe').innerHTML=STG.map((s,i)=>'<div class="op-st'+(g.indexOf(i)>=0?' on':i>last?' off':'')+'"><div class="k">'+(i+1)+'. '+s[1]+'</div><div class="v">'+(i<=last?fmt(v[s[0]][ci]):'&#8230;')+'</div><div class="f">'+s[2]+'</div></div>').join('');
    document.getElementById('op-cap').innerHTML='<b>'+U.esc(tr[ci])+', training step '+t+':</b> '+g.map(arith).join(' ');
    const s=steps[t];document.getElementById('op-stats').innerHTML=RD.stat('step',t,'loss '+s.loss.toFixed(4))+RD.stat('learning rate',U.ex(s.lr,2),'warmup')+RD.stat('clip factor',s.clip_scale.toFixed(4),'grad norm '+s.grad_norm.toFixed(3))+RD.stat('hand vs optax',U.ex(s.hand_vs_optax_maxdiff,1)||'0','largest gap, all leaves');
    const nn=s.norms;U.table('op-norms',[['Stage'],['Global norm',1]],[['gradient',nn.grad.toFixed(4)],['after clipping',nn.clipped.toFixed(4)],['Adam direction',nn.adam.toFixed(2)],['+ decay',nn.decayed.toFixed(2)],['update',U.ex(nn.update,3)]])}
  const ss=document.getElementById('op-step'),sc=document.getElementById('op-coord');
  ss.innerHTML=steps.map((s,i)=>'<option value="'+i+'">'+i+' (loss '+s.loss.toFixed(3)+')</option>').join('');
  sc.innerHTML=tr.map((n,i)=>'<option value="'+i+'">'+U.esc(n)+'</option>').join('');
  const st=S3.stage({id:'stg-opt',list:'sx-opt',fig:'Fig. 2 · one AdamW step, eight real numbers',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[34,100,14,130],view:k=>V[k],onStep:k=>{try{readout(k)}catch(err){}}});
  ss.addEventListener('change',()=>{t=+ss.value;readout(st.st.k);st.draw()});
  sc.addEventListener('change',()=>{ci=+sc.value;readout(st.st.k);st.draw()});
  readout(0);
  (window.TSSTG=window.TSSTG||{})['stg-opt']=st;
})();
