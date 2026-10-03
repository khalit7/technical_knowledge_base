// ---- Reading 2: which numbers share one mean and variance, on one image tensor and one token tensor ----
(function(){
  const NI=window.NI,root=document.getElementById('ax-t');if(!root)return;
  const KINDS={img:[['bn','BatchNorm'],['ln','LayerNorm'],['in','InstanceNorm'],['gn','GroupNorm (3 groups)'],['rms','RMSNorm']],tok:[['bn','BatchNorm'],['ln','LayerNorm'],['rms','RMSNorm']]};
  const AFF={img:{bn:'&gamma;, &beta;: C = 6 each',ln:'&gamma;, &beta;: C &times; H &times; W = 24 each (PyTorch LayerNorm([C, H, W]))',in:'none by default (PyTorch affine=False)',gn:'&gamma;, &beta;: C = 6 each',rms:'&gamma;: C &times; H &times; W = 24'},
    tok:{bn:'&gamma;, &beta;: D = 6 each',ln:'&gamma;, &beta;: D = 6 each',rms:'&gamma;: D = 6'}};
  const NOTE={bn:'One mean per channel or feature, taken across every example: an example\'s output depends on who else is in the batch, and inference needs running averages.',
    ln:'One mean per example (per token for sequences): independent of the batch and identical at training and inference.',
    in:'One mean per channel of each example: removes each image\'s own contrast per channel, which is why it suits style transfer and hurts classification.',
    gn:'One mean per group of channels of each example: G = 1 is LayerNorm, G = C is InstanceNorm. Batch-independent, so it works with a batch of 1 or 2.',
    rms:'As LayerNorm, but nothing is subtracted: each set is divided by its root mean square, so a set\'s mean survives and only its scale is fixed.'};
  const st={lay:'img',kind:'bn',show:'in',chg:false,sel:0};
  const X={img:NI.makeImage(3),tok:NI.makeTokens(5)};
  function scaled(lay){const x=X[lay],y=new Float64Array(x);const per=lay==='img'?NI.IMG.C*NI.IMG.H*NI.IMG.W:NI.TOK.T*NI.TOK.D;for(let i=0;i<per;i++)y[i]*=3;return y}
  const col=(v,m)=>{const a=Math.min(1,Math.abs(v)/m);return 'color-mix(in srgb,'+(v>=0?'var(--c1)':'var(--c2)')+' '+Math.round(a*70)+'%,var(--bg))'};
  function kindBtns(){document.getElementById('ax-kind').innerHTML=KINDS[st.lay].map(k=>'<button data-k="'+k[0]+'"'+(k[0]===st.kind?' class="on"':'')+'>'+k[1]+'</button>').join('')}
  function render(){
    const lay=st.lay,x0=X[lay],x=st.chg?scaled(lay):x0;
    const r=NI.normalise(x,lay,st.kind,3),r0=NI.normalise(x0,lay,st.kind,3);
    const per=lay==='img'?NI.IMG.C*NI.IMG.H*NI.IMG.W:NI.TOK.T*NI.TOK.D;
    const vals=st.show==='in'?x:r.y;let m=0;for(const v of vals)m=Math.max(m,Math.abs(v));if(st.show==='out')m=2.2;
    const g=r.gid[st.sel];
    let nchg=0;
    const cell=i=>{const v=vals[i];const inG=r.gid[i]===g;const other=Math.floor(i/per)!==0;
      const ch=st.chg&&other&&Math.abs(r.y[i]-r0.y[i])>1e-9;if(ch)nchg++;
      return '<div class="c'+(inG?' g':'')+(ch?' chg':'')+'" data-i="'+i+'" style="background:'+col(v,m)+'" title="'+v.toFixed(3)+'">'+(Math.abs(v)<9.95?v.toFixed(1):Math.round(v))+'</div>'};
    let h='';
    if(lay==='img'){const {N,C,H,W}=NI.IMG;h='<div class="tz">';
      for(let n=0;n<N;n++){h+='<div class="ex"><div class="h">example '+(n+1)+(st.chg&&n===0?' (&times;3)':'')+'</div><div class="chs">';
        for(let c=0;c<C;c++){h+='<div><div class="ch" style="grid-template-columns:repeat('+W+',auto)">';for(let k=0;k<H*W;k++)h+=cell((n*C+c)*H*W+k);h+='</div><div class="lab">c'+(c+1)+'</div></div>'}
        h+='</div></div>'}h+='</div>'}
    else{const {B,T,D}=NI.TOK;h='<div class="tz tok">';
      for(let b=0;b<B;b++){h+='<div class="ex"><div class="h">sequence '+(b+1)+(st.chg&&b===0?' (&times;3)':'')+': '+T+' tokens &times; '+D+' features</div>';
        for(let t=0;t<T;t++){h+='<div class="row">';for(let d=0;d<D;d++)h+=cell((b*T+t)*D+d);h+='</div>'}h+='</div>'}h+='</div>'}
    root.innerHTML=h;
    const i=st.sel,f=(v,d)=>(+v).toFixed(d||3);
    document.getElementById('ax-cnt').innerHTML=
      RD.stat('Sets with their own &mu;, &sigma;',r.ng,'of '+r.cnt[g]+' numbers each')+
      RD.stat('Learned per layer',AFF[lay][st.kind].split(':')[0],AFF[lay][st.kind].split(':')[1]||'')+
      RD.stat('Selected number','x = '+f(x[i],2),(st.kind==='rms'?'mean square ':'&mu; = '+f(r.mu[g],2)+', &sigma;&sup2; = ')+f(r.v[g],2)+' &rarr; y = '+f(r.y[i],3))+
      RD.stat('Outputs changed in other examples',st.chg?String(nchg):'&middot;',st.chg?(nchg?'BatchNorm couples the batch':'each example is on its own'):'press "Change example 1"');
    document.getElementById('ax-note').textContent=NOTE[st.kind];
  }
  root.addEventListener('click',e=>{const c=e.target.closest('.c');if(!c)return;st.sel=+c.dataset.i;render()});
  document.getElementById('ax-lay').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.lay=b.dataset.l;st.sel=0;
    if(!KINDS[st.lay].some(k=>k[0]===st.kind))st.kind='bn';[...e.currentTarget.children].forEach(x=>x.classList.toggle('on',x===b));kindBtns();render()});
  document.getElementById('ax-kind').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.kind=b.dataset.k;kindBtns();render()});
  const bi=document.getElementById('ax-in'),bo=document.getElementById('ax-out'),bc=document.getElementById('ax-chg');
  function showBtns(){bi.classList.toggle('on',st.show==='in');bo.classList.toggle('on',st.show==='out');bc.classList.toggle('on',st.chg)}
  bi.addEventListener('click',()=>{st.show='in';showBtns();render()});
  bo.addEventListener('click',()=>{st.show='out';showBtns();render()});
  bc.addEventListener('click',()=>{st.chg=!st.chg;if(st.chg)st.show='out';showBtns();render()});
  kindBtns();render();
})();
