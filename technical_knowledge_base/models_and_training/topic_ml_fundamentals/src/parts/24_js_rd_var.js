// ---- Reading, step 2: one batch forward and backward through five 16-layer networks, spread and gradient per layer ----
// Numbers from RDE.stats (checked against PyTorch autograd in src/read/recompute.py).
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-vn'))return;
  const L=16,NS=L+L+3; // input, 16 forward layers, loss, 16 backward layers, summary
  let m=0,g=4,an;
  const MD=RDE.MODES,F=RD.f,E=RD.e;
  $('rd-vnM').innerHTML=MD.map((d,i)=>'<button data-m="'+i+'">'+d.name+'</button>').join('');
  $('rd-vnG').innerHTML=MD.map((d,i)=>'<option value="'+i+'">'+d.name+'</option>').join('');
  $('rd-vnL').innerHTML='<span><i style="background:var(--c1)"></i>this network</span><span><i style="background:var(--c2)"></i>the layer being computed</span><span><i style="background:var(--mute);border-radius:50%"></i>the network it is compared with</span>';
  const NOTE={
    sig:{f:'Sigmoid squashes every unit into (0, 1) around 0.5. The spread drops to 0.22 at once and settles near 0.12: the signal survives, and every unit sits near the middle of the curve, where its slope is close to its maximum, 0.25.',
      b:'Each layer multiplies the gradient by a slope of at most 0.25, against weights scaled to pass variance through unchanged: about a factor of 4 lost per layer.',
      s:'The first layer receives a gradient about 2 billion times smaller than the last. Its weights effectively never move: the vanishing gradient, caused here by the activation, not by saturation in the flat tails.'},
    small:{f:'With variance 1/64 a ReLU layer keeps only half the second moment of its input (ReLU zeroes half), so the spread falls by about √2 per layer: 0.61, 0.44, 0.33 ...',
      b:'The gradients are all tiny but similar in size: here the signal, not the gradient path, is what died. By layer 16 the outputs are almost constant across inputs.',
      s:'The last layer\'s output spread is 0.003, so every input looks the same to the head and the loss is ln 10 = 2.3025 to four figures: the network cannot tell its inputs apart. He\'s factor of 2 is exactly the fix.'},
    he:{f:'He\'s variance 2/64 makes up for the half that ReLU zeroes. The spread wanders between 0.59 and 1.22 but neither vanishes nor explodes over 16 layers.',
      b:'The gradient stays between 0.67 and 1.16 at every layer.',
      s:'The right scale alone keeps a 16-layer ReLU stack healthy at initialisation. It is only a starting point, though: nothing holds the scale once the weights start to change, which is what normalisation adds.'},
    bn:{f:'BatchNorm makes each branch exactly unit-variance across the batch, and the residual adds it to the stream, so the spread grows steadily: 0.84 after layer 1, 2.47 after layer 16.',
      b:'Going down, every residual connection adds the branch\'s gradient to the identity path\'s, so the gradient grows too, from 1.17 at layer 16 to 4.41 at layer 1.',
      s:'No vanishing at all, but a stream that grows with depth: this is why ResNet-style networks put a final normalisation or pooling before the head, and why the toy\'s starting loss (5.42) is far above ln 10.'},
    pre:{f:'Pre-norm: each block reads a normalised copy of the stream and adds a small result back, so the stream itself is never rescaled. The spread drifts only from 1.04 to 1.20.',
      b:'The residual path carries the gradient straight down; the branches add a little each.',
      s:'Every layer gets a gradient of similar size (1.16 to 1.50), and the loss starts near ln 10. This is the 2026 transformer block\'s answer to all four causes at once.'}
  };
  function draw(i){const S=RDE.stats(m),G=RDE.stats(g),id=MD[m].id,n=NOTE[id];
    $('rd-vnM').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.m===m));$('rd-vnG').value=g;
    const fw=Math.min(i,L),bk=i>=L+2?Math.min(L,i-L-1):0,cur=i>=1&&i<=L?i:(i>=L+2&&i<=2*L+1?L+1-(i-L-1):0);
    const box=$('rd-vnSvg'),W=RD.width(box),ph=Math.round(Math.min(170,Math.max(120,W*.26))),gap=34,ml=42,mr=8,mt=16,H=mt+ph+gap+ph+28;
    const x=l=>ml+(W-ml-mr)*(l+0.5)/(L+1),bw=Math.max(3,(W-ml-mr)/(L+1)*0.62);
    const ya=v=>mt+ph*(1-(Math.log10(Math.max(v,1e-3))+3)/4),y0b=mt+ph+gap,yb=v=>y0b+ph*(1-(Math.log10(Math.max(v,1e-12))+12)/13);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Activation spread and gradient size per layer">';
    s+='<text x="'+ml+'" y="11" font-size="11" fill="var(--mute)">Spread of each layer\'s output (forward)</text>';
    for(let e=-3;e<=1;e++){const yy=ya(10**e);s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(yy+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+RD.se(10**e)+'</text>'}
    s+='<text x="'+ml+'" y="'+(y0b-8)+'" font-size="11" fill="var(--mute)">Size of each layer\'s weight gradient (backward)</text>';
    for(let e=-12;e<=1;e+=2){const yy=yb(10**e);s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(yy+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+RD.se(10**e)+'</text>'}
    for(let l=0;l<=L;l++)s+='<text x="'+x(l)+'" y="'+(H-14)+'" font-size="9.5" text-anchor="middle" fill="var(--mute)">'+(l===0?'in':(W<500&&l%2?'':l))+'</text>';
    s+='<text x="'+(W-mr)+'" y="'+(H-2)+'" font-size="10" text-anchor="end" fill="var(--mute)">layer</text>';
    // forward bars (input bar at l = 0)
    const bot=ya(1e-3);
    if(i>=0){const v=S.inStd,yy=ya(v);s+='<rect x="'+(x(0)-bw/2)+'" y="'+yy+'" width="'+bw+'" height="'+(bot-yy)+'" fill="var(--dim)"/>'}
    for(let l=1;l<=fw;l++){const v=S.acts[l-1],yy=ya(v);s+='<rect x="'+(x(l)-bw/2)+'" y="'+yy+'" width="'+bw+'" height="'+Math.max(0,bot-yy)+'" fill="'+(i===l?'var(--c2)':'var(--c1)')+'"/>'}
    const botb=yb(1e-12);
    for(let l=L;l>L-bk;l--){const v=S.grads[l-1],yy=yb(v);s+='<rect x="'+(x(l)-bw/2)+'" y="'+yy+'" width="'+bw+'" height="'+Math.max(0,botb-yy)+'" fill="'+(cur===l&&i>L+1?'var(--c2)':'var(--c1)')+'"/>'}
    // the comparison network, complete, as dots
    if(g!==m)for(let l=1;l<=L;l++){s+='<circle cx="'+x(l)+'" cy="'+ya(G.acts[l-1])+'" r="3.2" fill="var(--mute)" stroke="var(--bg)"/><circle cx="'+x(l)+'" cy="'+yb(G.grads[l-1])+'" r="3.2" fill="var(--mute)" stroke="var(--bg)"/>'}
    if(i===L+1)s+='<text x="'+((W+ml)/2)+'" y="'+(y0b-22)+'" font-size="11.5" text-anchor="middle" fill="var(--c2)">loss = '+F(S.loss,3)+'  (ln 10 = 2.303)</text>';
    box.innerHTML=s+'</svg>';
    let t,p;
    if(i===0){t='The batch: 32 inputs of 64 numbers';p='Spread (standard deviation) '+F(S.inStd,2)+'. Watch what each layer does to it on the way up, then what happens to the gradient on the way down.'}
    else if(i<=L){t='Forward, layer '+i+': spread '+F(S.acts[i-1],3);p=(i<=2||i===L)?n.f:'Each bar is how spread out the layer\'s 32 &times; 64 outputs are. On this log scale, a steady staircase down or up means the same factor lost or gained at every layer.'}
    else if(i===L+1){t='The loss: '+F(S.loss,3);p='Cross entropy over 10 classes; a network that cannot tell its inputs apart scores ln 10 = 2.303. Now the gradient flows back down.'}
    else if(i<=2*L+1){const l=cur;t='Backward, layer '+l+': gradient '+E(S.grads[l-1]);p=(l>=L-1||l<=2)?n.b:'Each layer\'s gradient is the one above it times the layer\'s own Jacobian: a product that grows one factor per layer.'}
    else{t='First layer against last: '+E(S.grads[0]/S.grads[L-1]);p=n.s}
    $('rd-vnT').innerHTML=t;
    $('rd-vnP').innerHTML=p;
    const la=i>=1&&i<=L?i:fw,lg=cur&&i>L+1?cur:(i===2*L+2?1:null);
    $('rd-vnN').innerHTML=RD.stat('Network',MD[m].name,'')+RD.stat('Spread, layer '+(la||'in'),la?F(S.acts[la-1],3):F(S.inStd,3),g!==m?'compared: '+(la?F(G.acts[la-1],3):F(G.inStd,3)):'')+
      RD.stat('Gradient'+(lg?', layer '+lg:''),lg?E(S.grads[lg-1]):'not yet',lg&&g!==m?'compared: '+E(G.grads[lg-1]):'')+
      RD.stat('First / last layer gradient',i===2*L+2?E(S.grads[0]/S.grads[L-1]):'at the end',g!==m&&i===2*L+2?'compared: '+E(G.grads[0]/G.grads[L-1]):'');
  }
  an=RD.anim({card:'rd-vn',ctl:'rd-vnC',n:NS,start:NS-1,draw,ms:650,label:'Layer step'});
  $('rd-vnM').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;m=+b.dataset.m;if(g===m)g=m===4?0:4;an.reset(NS);an.play()});
  $('rd-vnG').addEventListener('change',e=>{g=+e.target.value;an.redraw()});
  // buttons in threads 2 and 3 load a pair into this animation
  document.querySelectorAll('#rd-t2C button,.rd-ld').forEach(b=>b.addEventListener('click',()=>{m=+b.dataset.m;g=+b.dataset.g;$('rd-vn').scrollIntoView({block:'start'});an.reset(NS);an.play()}));
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>an.redraw(),120)});
})();
