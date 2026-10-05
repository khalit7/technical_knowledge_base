// ---- Reading s3: one training step's memory under three ways of keeping activations (mirrors mem_anim in src/recompute.py) ----
window.PMA=(function(){
  const X=window.CALCX,m=X.M.l8;
  function ffOf(m){return (m.layer_params-2*m.h-(m.h*m.nh*m.hd+2*m.h*m.nkv*m.hd+m.nh*m.hd*m.h))/(3*m.h)}
  function ledger(m,T){const h=m.h,L=m.L,f=ffOf(m);
    const proj=L*(2*h*m.nh*m.hd+2*h*m.nkv*m.hd),mlp=L*3*h*f,head=h*m.V,coreF=L*4*T*m.nh*m.hd;
    return {f:f,proj:6*proj,mlp:6*mlp,head:6*head,core_fwd:coreF,core_bwd_std:2*coreF,core_bwd_flash:2.5*coreF,six_n:6*m.P,six_n_matmul:6*(proj+mlp+head)}}
  function actLayerTok(m,T,mode){const h=m.h,f=ffOf(m);if(mode==='ckpt')return 2*h;
    const fl=16*h+4*m.nh*m.hd+4*m.nkv*m.hd+8*f+4*m.nh+8;return mode==='flash'?fl:fl-4*m.nh+6*m.nh*T+4*(m.nh-m.nkv)*m.hd}
  const actPostTok=m=>8*m.h+4*m.V+8;
  function memAnim(mode,T){T=T||8192;const h=m.h,V=m.V,L=m.L,lg=ledger(m,T),f=lg.f,S=16*m.P/8;
    const fwdL=(lg.proj+lg.mlp)/3/L*T+lg.core_fwd/L*T,bwdL=2*(lg.proj+lg.mlp)/3/L*T+(mode!=='eager'?lg.core_bwd_flash:2*lg.core_fwd)/L*T;
    const recL=fwdL-2*h*f*T,keep=actLayerTok(m,T,mode==='ckpt'?'ckpt':mode)*T,work=actLayerTok(m,T,'flash')*T,post=actPostTok(m)*T;
    const st=[{kind:'start',mem:S,act:0,post:0,rec:0,fl:0,flr:0}];let act=0,fl=0,flr=0;
    for(let i=0;i<L;i++){act+=keep;fl+=fwdL;st.push({kind:'fwd',layer:i+1,mem:S+act,act:act,post:0,rec:0,fl:fl,flr:flr})}
    fl+=2*h*V*T;st.push({kind:'loss',mem:S+act+post,act:act,post:post,rec:0,fl:fl,flr:flr});
    fl+=4*h*V*T;st.push({kind:'headbwd',mem:S+act+post,act:act,post:post,rec:0,fl:fl,flr:flr});
    for(let i=L;i>=1;i--){const rec=mode==='ckpt'?work:0;if(mode==='ckpt')flr+=recL;fl+=bwdL;
      st.push({kind:'bwd',layer:i,mem:S+act+rec,act:act,post:0,rec:rec,fl:fl,flr:flr});act-=keep}
    let pk=0;st.forEach(x=>{pk=Math.max(pk,x.mem)});return {steps:st,peak:pk,total_fl:fl+flr,states:S}}
  return {ffOf,ledger,actLayerTok,actPostTok,memAnim};
})();
(function(){
  const el=document.getElementById('rd-mem');if(!el)return;
  const A=window.PMA,X=window.CALCX;let mode='flash',zoom=false;
  const runs={eager:A.memAnim('eager'),flash:A.memAnim('flash'),ckpt:A.memAnim('ckpt')};
  const peak=989.5e12*0.4,G=1e9;
  const cap=document.getElementById('rd-mem-cap'),cnt=document.getElementById('rd-mem-cnt');
  const nm={eager:'plain attention',flash:'FlashAttention',ckpt:'full recompute'};
  function caption(s,r){
    if(s.kind==='start')return ['Before the step','Only the model state is resident: 16 bytes per parameter sharded over 8 GPUs, 16.1 GB. Activations start at zero.'];
    if(s.kind==='fwd'){const per=(r.steps[1].act)/G;return ['Forward, layer '+s.layer+' of 32',
      mode==='ckpt'?'Only the layer\'s 8,192 &times; 4,096 BF16 input is kept (2 bytes &times; h per token, '+X.sig(per*1e3)+' MB); everything else is dropped and will be recomputed.':
      'The layer keeps every tensor its backward rule needs: '+X.sig(per)+' GB per layer'+(mode==='eager'?', of which 13.0 GB is the score matrix in FP32 and BF16.':' (49 bytes &times; h per token).')]}
    if(s.kind==='loss')return ['Output head and loss','The logits for 128,256 vocabulary entries are kept in FP32 for the loss: 4.47 GB, more than two layers\' worth with FlashAttention. This is the high-water mark'+(mode==='eager'?'':' for this mode')+'.'];
    if(s.kind==='headbwd')return ['Backward through the head','The head\'s two backward matmuls run (4hV FLOPs per token); its logits are freed afterwards.'];
    return ['Backward, layer '+s.layer,mode==='ckpt'?'First the layer\'s forward is rerun from its saved input (the recompute, in yellow: '+X.sig(s.rec/G)+' GB alive for this layer only), then its backward runs and both are freed. PyTorch stops the recompute once every needed tensor exists, so the down projection is not rerun.':
      'The layer\'s backward runs (twice its forward FLOPs'+(mode==='flash'?', 2.5 times in the attention core':'')+') and its saved tensors are freed.']}
  function draw(i){
    const r=runs[mode],st=r.steps,s=st[i],W=X.sig?RD.width(el):600,H=230,pl=44,pr=10,pt=10,pb=34;
    const ymax=zoom?100:500,sx=k=>pl+k*(W-pl-pr)/(st.length-1),sy=v=>pt+(H-pt-pb)*(1-Math.min(v/G,ymax)/ymax);
    let b='';
    for(let g=0;g<=ymax;g+=ymax/5){b+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+sy(g*G)+'" y2="'+sy(g*G)+'" stroke="var(--line)"/>'+RD.t(pl-4,sy(g*G)+4,g+' GB',{a:'end',fs:10,fill:'var(--mute)'})}
    // ghost outline of the whole step
    b+='<polyline fill="none" stroke="var(--mute)" stroke-dasharray="3 3" stroke-width="1" points="'+st.map((x,k)=>sx(k)+','+sy(x.mem)).join(' ')+'"/>';
    const bw=Math.max(1,(W-pl-pr)/(st.length-1)-1);
    for(let k=0;k<=i;k++){const x=st[k],x0=sx(k)-bw/2;let y=sy(0);
      const segs=[[r.states,'var(--dim)'],[x.act,'var(--c1)'],[x.post,'var(--c2)'],[x.rec,'var(--c5)']];let acc=0;
      segs.forEach(([v,c])=>{if(v<=0)return;const y1=sy(acc+v),y0=sy(acc);if(y0-y1>0.2)b+='<rect x="'+x0+'" y="'+y1+'" width="'+bw+'" height="'+(y0-y1)+'" fill="'+c+'"/>';acc+=v})}
    if(80<=ymax)b+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+sy(80*G)+'" y2="'+sy(80*G)+'" stroke="var(--bad)" stroke-dasharray="5 3"/>'+RD.t(W-pr-2,sy(80*G)-4,'80 GB',{a:'end',fs:10,fill:'var(--bad)'});
    if(zoom&&r.peak/G>ymax)b+=RD.t(pl+6,pt+12,'peak '+Math.round(r.peak/G)+' GB is off the top',{fs:10.5,fill:'var(--bad)'});
    b+='<line x1="'+sx(i)+'" x2="'+sx(i)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--ink)" stroke-width="1"/>';
    b+=RD.t(sx(16),H-pb+14,'forward, layers 1 to 32',{a:'middle',fs:10.5,fill:'var(--mute)'})+RD.t(sx(33.5),H-pb+26,'loss',{a:'middle',fs:10.5,fill:'var(--mute)'})+RD.t(sx(50),H-pb+14,'backward, 32 to 1',{a:'middle',fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Memory during one training step, '+nm[mode]);
    const c=caption(s,r);cap.innerHTML='<div class="t">'+c[0]+' ('+nm[mode]+')</div><p>'+c[1]+'</p>';
    let pk=0;for(let k=0;k<=i;k++)pk=Math.max(pk,st[k].mem);
    cnt.innerHTML=RD.stat('Memory now',X.sig(s.mem/G,3)+' GB','per GPU')+RD.stat('Peak so far',X.sig(pk/G,3)+' GB',pk>80*G?'over the 80 GB H100':'fits 80 GB')+
      RD.stat('FLOPs so far',X.sig((s.fl+s.flr)/1e12,3)+' TFLOP',s.flr>0?X.sig(s.flr/1e12,3)+' of them recompute':'model FLOPs only')+
      RD.stat('Time at 40% MFU',X.sig((s.fl+s.flr)/peak,3)+' s','one H100');
  }
  const an=RD.anim({card:'rd-mem-card',ctl:'rd-mem-ctl',n:runs.flash.steps.length,draw:draw,ms:520,label:'Step of the training step'});
  RD.seg(document.getElementById('rd-mem-mode'),v=>{mode=v;an.reset(runs[v].steps.length);an.play()});
  const z=document.createElement('label');z.className='chk';z.innerHTML='<input type="checkbox" id="rd-mem-zoom"> zoom to 100 GB';
  document.getElementById('rd-mem-mode').after(z);document.getElementById('rd-mem-zoom').addEventListener('change',e=>{zoom=e.target.checked;an.redraw()});
  RD.onResize(()=>an.redraw());
})();
