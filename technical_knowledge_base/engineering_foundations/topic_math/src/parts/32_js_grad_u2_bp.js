// ---- Gradient lab: 2. backprop, step by step (before: forward only; after: forward then backward) ----
(function(){
  const U=GLU,$=U.$,G=GL;
  let net='one',m=G.clone(G.M1),mode='both',trainX=false,hist=[];
  const base=()=>G.clone(net==='one'?G.M1:G.M0);
  const sub=s=>'<small>'+s+'</small>';
  const ROWS1=[
    {k:'x',nm:'x'+sub('embedding of "the cat"')},
    {k:'W',nm:'W'+sub('weights, 3 \u00d7 2')},
    {k:'z',nm:'z = Wx'+sub('logits: cat, dog, sat')},
    {k:'p',nm:'p = softmax(z)'+sub('probabilities')},
    {k:'L',nm:'L = \u2212ln p<sub>sat</sub>'+sub('the loss')}];
  const ROWS2=[
    {k:'x',nm:'x'+sub('embedding of "the cat"')},
    {k:'W1',nm:'W<sub>1</sub>'+sub('weights, 3 × 2')},
    {k:'a',nm:'a = W<sub>1</sub>x'+sub('3 numbers')},
    {k:'h',nm:'h = relu(a)'+sub('negatives set to 0')},
    {k:'W2',nm:'W<sub>2</sub>'+sub('weights, 3 × 3')},
    {k:'z',nm:'z = W<sub>2</sub>h'+sub('logits: cat, dog, sat')},
    {k:'p',nm:'p = softmax(z)'+sub('probabilities')},
    {k:'L',nm:'L = −ln p<sub>sat</sub>'+sub('the loss')}];
  // each step: which forward values exist, which gradients exist, highlighted row, MACs added, caption
  function steps(){return net==='one'?steps1():steps2()}
  function steps1(){const b=G.backward(m),f=b.f,F=v=>U.f(v,3),pc=f.p[m.t],s=[];
    s.push({fw:['x','W'],bw:[],row:null,cap:'Start: the Reading\'s model. Known: the input x = ('+F(m.x[0])+', '+F(m.x[1])+') and one weight matrix W, one row per token.',fm:0,bm:0});
    s.push({fw:['x','W','z'],bw:[],row:'z',cap:'Forward 1: z = Wx. Each logit is a row of W times x (a dot product): 3 rows of 2, 6 multiply-adds. z = ('+f.z.map(F).join(', ')+') for (cat, dog, sat).',fm:6,bm:0});
    s.push({fw:['x','W','z','p'],bw:[],row:'p',cap:'Forward 2: softmax gives p = ('+f.p.map(F).join(', ')+'). The correct token, sat, gets only '+U.f(100*pc,1)+'%: the model is wrong.',fm:6,bm:0});
    s.push({fw:['x','W','z','p','L'],bw:[],row:'L',cap:'Forward 3: the loss is \u2212ln '+F(pc)+' = '+U.f(f.L,4)+' nats. Using the model stops here: 6 multiply-adds.',fm:6,bm:0});
    if(mode==='fwd')return s;
    const all=['x','W','z','p','L'];
    s.push({fw:all,bw:['L'],row:'L',cap:'Backward 0: start at the end. The loss\'s gradient with respect to itself is 1.',fm:6,bm:0});
    s.push({fw:all,bw:['L','p','z'],row:'z',cap:'Backward 1: softmax and cross-entropy together give z\u0305 = p \u2212 y = ('+b.dz.map(F).join(', ')+'). Sat\'s entry is negative: raise the sat logit; cat and dog are positive: lower them.',fm:6,bm:0});
    s.push({fw:all,bw:['L','p','z','W'],row:'W',cap:'Backward 2: W\u0305 = z\u0305 x\u1d40, entry (i, j) = z\u0305\u1d62 \u00d7 x\u2c7c: 6 multiplies. Every row is a multiple of x: this gradient has rank 1.',fm:6,bm:6});
    s.push({fw:all,bw:['L','p','z','W'].concat(trainX?['x']:[]),row:'x',cap:trainX?'Backward 3: x\u0305 = W\u1d40 z\u0305 = ('+b.dx.map(F).join(', ')+'): 6 more multiply-adds, because the embedding is trained too. Backward total 12 = 2 \u00d7 6 forward.':'Backward 3: x\u0305 = W\u1d40 z\u0305 is skipped while the embedding is held fixed (as in the Reading\'s step): backward total 6. Tick the box below to train the embedding: 12 = 2 \u00d7 forward.',fm:6,bm:trainX?12:6});
    return s}
  function steps2(){const b=G.backward(m),f=b.f,F=v=>U.f(v,3);const s=[];
    const pc=f.p[m.t];
    s.push({fw:['x','W1','W2'],bw:[],row:null,cap:'Start. Known: the input x = ('+F(m.x[0])+', '+F(m.x[1])+') and the two weight matrices. Nothing has been computed yet.',fm:0,bm:0});
    s.push({fw:['x','W1','W2','a'],bw:[],row:'a',cap:'Forward 1: a = W\u2081x. Each of the 3 entries is a row of W₁ times x: 2 multiply-adds each, 6 in all. a = ('+f.a.map(F).join(', ')+').',fm:6,bm:0});
    s.push({fw:['x','W1','W2','a','h'],bw:[],row:'h',cap:'Forward 2: relu keeps positives and sets negatives to 0. The third entry ('+F(f.a[2])+') becomes 0: that hidden unit is off for this input. h = ('+f.h.map(F).join(', ')+').',fm:6,bm:0});
    s.push({fw:['x','W1','W2','a','h','z'],bw:[],row:'z',cap:'Forward 3: z = W\u2082h, 3 rows of 3: 9 multiply-adds. Logits z = ('+f.z.map(F).join(', ')+') for (cat, dog, sat).',fm:15,bm:0});
    s.push({fw:['x','W1','W2','a','h','z','p'],bw:[],row:'p',cap:'Forward 4: softmax turns logits into probabilities p = ('+f.p.map(F).join(', ')+'). The correct token, sat, gets only '+U.f(100*pc,1)+'%.',fm:15,bm:0});
    s.push({fw:['x','W1','W2','a','h','z','p','L'],bw:[],row:'L',cap:'Forward 5: the loss is −ln '+F(pc)+' = '+U.f(f.L,4)+'. Using the model stops here: 15 multiply-adds.',fm:15,bm:0});
    if(mode==='fwd')return s;
    const all=['x','W1','W2','a','h','z','p','L'];
    s.push({fw:all,bw:['L'],row:'L',cap:'Backward 0: start at the end. The loss\'s gradient with respect to itself is 1.',fm:15,bm:0});
    s.push({fw:all,bw:['L','p','z'],row:'z',cap:'Backward 1: softmax and cross-entropy together give z̅ = p − y = ('+b.dz.map(F).join(', ')+'). Sat\'s entry is negative: raising the sat logit lowers the loss; cat and dog are positive: lowering them lowers it (panel 1 derives this).',fm:15,bm:0});
    s.push({fw:all,bw:['L','p','z','W2'],row:'W2',cap:'Backward 2: W̅₂ = z̅ hᵀ, entry (i, j) = z̅ᵢ × hⱼ: 9 multiplies. The third column is 0 because h₃ = 0: a weight reading a switched-off unit gets no gradient.',fm:15,bm:9});
    s.push({fw:all,bw:['L','p','z','W2','h'],row:'h',cap:'Backward 3: h̅ = W₂ᵀ z̅: each hidden unit collects the blame of every logit it feeds, weighted by its weight. 9 multiply-adds. h̅ = ('+b.dh.map(F).join(', ')+').',fm:15,bm:18});
    s.push({fw:all,bw:['L','p','z','W2','h','a'],row:'a',cap:'Backward 4: through relu, a̅ = h̅ where a > 0, else 0. Unit 3 had a = '+F(f.a[2])+', so its gradient '+F(b.dh[2])+' is blocked: a̅ = ('+b.da.map(F).join(', ')+').',fm:15,bm:18});
    s.push({fw:all,bw:['L','p','z','W2','h','a','W1'],row:'W1',cap:'Backward 5: W̅₁ = a̅ xᵀ: 6 multiplies. The third row is 0: the off unit\'s incoming weights do not learn from this example.',fm:15,bm:24});
    s.push({fw:all,bw:['L','p','z','W2','h','a','W1'].concat(trainX?['x']:[]),row:'x',cap:trainX?'Backward 6: x̅ = W₁ᵀ a̅: 6 more multiply-adds, needed because the embedding is trained too. Backward total 30 = 2 × 15 forward.':'Backward 6: skipped. The input is not trained, so its gradient is never needed: backward total 24, 1.6 × forward.',fm:15,bm:trainX?30:24});
    return s}
  let S=steps();
  const fwdVal=(k,f)=>k==='x'?m.x:k==='W'?m.W:k==='W1'?m.W1:k==='W2'?m.W2:k==='L'?[f.L]:f[k];
  const grdVal=(k,b)=>({x:b.dx,W:b.dW,W1:b.dW1,W2:b.dW2,a:b.da,h:b.dh,z:b.dz,L:[1]})[k];
  function draw(i){const s=S[i],b=G.backward(m),f=b.f,dd=U.width($('gl-tape'))<480?2:3;
    let h='<div class="hd">value</div><div class="hd">forward</div><div class="hd">gradient ∂L/∂(value)</div>';
    (net==='one'?ROWS1:ROWS2).forEach(r=>{const on=s.row===r.k?' row-on':'';const fv=fwdVal(r.k,f);const hasF=s.fw.includes(r.k),hasB=s.bw.includes(r.k);
      h+='<div class="nm'+on+'">'+r.nm+'</div><div class="cell'+on+'">'+U.mat(fv,{blank:!hasF,d:dd})+'</div><div class="cell'+on+'">';
      if(r.k==='p')h+=hasB?'<span class="small mute">folded into z̅ (p − y)</span>':'';
      else if(mode==='fwd')h+='<span class="small mute">not needed</span>';
      else h+=U.mat(grdVal(r.k,b),{blank:!hasB,sign:true,d:dd});
      h+='</div>'});
    $('gl-tape').innerHTML=h;
    $('gl-bpCap').innerHTML=s.cap;
    $('gl-bpCtr').innerHTML='<span>forward multiply-adds <b>'+s.fm+'</b></span><span>backward multiply-adds <b>'+s.bm+'</b></span>'+(mode==='both'?'<span>backward ÷ forward <b>'+(s.bm?U.f(s.bm/s.fm,2):'0')+'</b></span>':'')+'<span>step <b>'+(i+1)+'</b> of '+S.length+'</span>'}
  const A=U.anim({card:'gl-bpCard',ctl:'gl-bpCtl',n:S.length,draw:i=>draw(Math.min(i,S.length-1)),ms:2200,label:'Backprop step'});
  function rebuild(keep){S=steps();A.reset(S.length);if(keep)A.go(S.length-1)}
  U.seg($('gl-bpMode'),v=>{mode=v;rebuild()});
  U.seg($('gl-bpNet'),v=>{net=v;m=base();hist=[];trainX=net==='two';$('gl-trainX').checked=trainX;$('gl-checkOut').innerHTML='';rebuild();A.play()});
  $('gl-trainX').addEventListener('change',e=>{trainX=e.target.checked;rebuild(true)});
  $('gl-check').addEventListener('click',()=>{const r=G.gradCheck(m,'');let mx=0;
    const rows=r.filter(x=>x.p[0]!=='x'||trainX).map(x=>{const rel=Math.abs(x.an-x.num)/Math.max(1e-12,Math.abs(x.an)+Math.abs(x.num));mx=Math.max(mx,x.an===0&&x.num===0?0:rel);
      const nm=x.p[0]==='x'?'x<sub>'+(x.p[1]+1)+'</sub>':'W<sub>'+(x.p[0][1]||'')+'</sub>['+(x.p[1]+1)+','+(x.p[2]+1)+']';
      return '<tr><td>'+nm+'</td><td class="num">'+U.f(x.an,5)+'</td><td class="num">'+U.f(x.num,5)+'</td><td class="num">'+(x.an===0&&x.num===0?'0':U.e(rel,1))+'</td></tr>'});
    $('gl-checkOut').innerHTML='<p class="small"><span class="gl-pill '+(mx<1e-6?'good':'bad')+'">largest relative error '+U.e(mx,1)+'</span> over '+rows.length+' numbers, nudge <i>h</i> = 10<sup>−5</sup>. Relative error = |analytic − numerical| ÷ (|analytic| + |numerical|); below 10<sup>−6</sup> means the hand-derived backward pass is right.</p><div class="tw"><table class="gl-t"><tr><th>parameter</th><th class="num">backprop</th><th class="num">nudging</th><th class="num">rel. error</th></tr>'+rows.join('')+'</table></div>'});
  function stepInfo(){const L=G.forward(m);$('gl-checkOut').innerHTML='<p class="small">Training steps taken: <b>'+hist.length+'</b>. Loss '+hist.map(v=>U.f(v,4)).concat([U.f(L.L,4)]).join(' → ')+'; P(sat) now <b>'+U.f(100*L.p[m.t],1)+'%</b>. Each step moves every weight (and the embedding, if ticked) by \u2212learning rate \u00d7 its gradient; logits now ('+L.z.map(v=>U.f(v,3)).join(', ')+'), p = ('+L.p.map(v=>U.f(v,3)).join(', ')+'). The tape above now shows the updated model.</p>'}
  $('gl-step').addEventListener('click',()=>{hist.push(G.forward(m).L);m=G.sgdStep(m,+$('gl-lrSel').value,'',-1,!trainX);rebuild(true);stepInfo()});
  $('gl-reset').addEventListener('click',()=>{m=base();hist=[];$('gl-checkOut').innerHTML='';rebuild()});
})();
