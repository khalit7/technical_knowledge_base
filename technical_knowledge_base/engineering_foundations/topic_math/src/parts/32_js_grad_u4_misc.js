// ---- Gradient lab: 4. Bernoulli curvature, 5. overflow and log-sum-exp, 6. spot the bug ----
(function(){
  const U=GLU,$=U.$,G=GL;
  // ---------- 4. Bernoulli ----------
  let bz=0;
  function bern(){const r=G.bern(bz);$('gl-bzV').textContent=U.f(bz,2)+' (p = '+U.f(r.p,3)+')';
    $('gl-bernOut').innerHTML=U.stat('Curvature (Hessian), label 1',U.f(r.H1,4),'second difference of the loss')+U.stat('Curvature (Hessian), label 0',U.f(r.H0,4),'same: the label drops out')+
      U.stat('Variance of the label',U.f(r.vr,4),'p(1 − p)² + (1 − p)p²')+U.stat('Fisher information',U.f(r.fish,4),'average squared score')+U.stat('Formula p(1 − p)',U.f(r.exact,4),'largest gap '+U.e(Math.max(Math.abs(r.H0-r.exact),Math.abs(r.H1-r.exact),Math.abs(r.vr-r.exact),Math.abs(r.fish-r.exact)),1));
    const el=$('gl-bernPlot'),W=Math.min(U.width(el),560),H=170,pad={l:40,r:10,t:10,b:26};const X=z=>pad.l+(z+6)/12*(W-pad.l-pad.r),Y=v=>pad.t+(1-v/0.27)*(H-pad.t-pad.b);
    let b='';[0,0.1,0.2,0.25].forEach(v=>{b+=U.ln(pad.l,Y(v),W-pad.r,Y(v),'var(--line)')+U.t(pad.l-4,Y(v)+3,U.f(v,2),{a:'end',fs:10,c:'var(--mute)'})});
    for(let z=-6;z<=6;z+=2)b+=U.t(X(z),H-pad.b+14,String(z).replace('-','−'),{a:'middle',fs:10,c:'var(--mute)'});
    const pts=[];for(let z=-6;z<=6.001;z+=0.1){const p=G.sig(z);pts.push([X(z),Y(p*(1-p))])}b+=U.pl(pts,'var(--c1)',{w:2});
    b+=U.ln(X(bz),pad.t,X(bz),H-pad.b,'var(--c2)',{dash:'3 3'})+U.dot(X(bz),Y(r.exact),5,'var(--c2)');
    b+=U.t((pad.l+W-pad.r)/2,H-2,'logit z',{a:'middle',fs:10.5,c:'var(--mute)'})+U.t(W-pad.r,pad.t+10,'p(1 − p)',{a:'end',fs:11,c:'var(--c1)'});
    el.innerHTML=U.svg(W,H,b,'p times one minus p against the logit')}
  $('gl-bz').addEventListener('input',e=>{bz=+e.target.value;bern()});
  $('gl-bernCard').querySelector('.chips').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;bz=+b.dataset.z;$('gl-bz').value=bz;bern()});
  // ---------- 5. overflow ----------
  function lse(){const Z=+$('gl-lz').value,f32=$('gl-fmt').value==='32';$('gl-lzV').textContent=String(Z);
    const r=f32?Math.fround:(v=>v),ex=v=>r(Math.exp(r(v))),z=[Z,Z-1,0].map(r);
    const en=z.map(ex),sn=r(r(en[0]+en[1])+en[2]),pn=en.map(v=>r(v/sn)),Ln=r(-Math.log(pn[0]));
    const m=Math.max(...z),es=z.map(v=>ex(r(v-m))),ss=r(r(es[0]+es[1])+es[2]),ps=es.map(v=>r(v/ss)),ls=r(m+r(Math.log(ss))),Ls=r(ls-z[0]);
    const v3=a=>a.map(x=>U.g(x,3)).join('<br>');const bad=x=>!isFinite(x)||Number.isNaN(x);
    const cell=(s,isBad)=>'<td class="num'+(isBad?' gl-bad':'')+'">'+s+'</td>';
    $('gl-lseTbl').innerHTML='<tr><th>quantity</th><th class="num">naive<br><span class="small">exponentiate directly</span></th><th class="num">stable<br><span class="small">subtract max m = '+U.g(m,0)+'</span></th></tr>'+
      '<tr><td>exponentials<br><span class="small mute">cat, dog, sat</span></td>'+cell(v3(en),en.some(bad))+cell(v3(es),false)+'</tr>'+
      '<tr><td>their sum</td>'+cell(U.g(sn,4),bad(sn))+cell(U.g(ss,4),false)+'</tr>'+
      '<tr><td>softmax p<br><span class="small mute">cat, dog, sat</span></td>'+cell(v3(pn),pn.some(bad))+cell(v3(ps),false)+'</tr>'+
      '<tr><td>loss −ln p<sub>cat</sub></td>'+cell(U.f(Ln,4),bad(Ln))+cell(U.f(Ls,4),false)+'</tr>';
  }
  $('gl-lz').addEventListener('input',lse);$('gl-fmt').addEventListener('change',lse);
  // ---------- 6. bugs ----------
  const m0=G.clone(G.M0),F=v=>U.f(v,3);
  const traj=(sign,bug)=>{let m=G.clone(G.M0);const L=[G.forward(m).L];for(let i=0;i<5;i++){m=G.sgdStep(m,G.LR,bug||'',sign);L.push(G.forward(m).L)}return L};
  const relErr=(a,n)=>Math.abs(a-n)/Math.max(1e-12,Math.abs(a)+Math.abs(n));
  function checkSummary(bug){const r=G.gradCheck(m0,bug);const by={};r.forEach(x=>{const k=x.p[0];const e=x.an===0&&x.num===0?0:relErr(x.an,x.num);by[k]=Math.max(by[k]||0,e)});
    return Object.keys(by).map(k=>'<span class="gl-pill '+(by[k]<1e-6?'good':'bad')+'">'+(k==='x'?'x':'W<sub>'+k[1]+'</sub>')+': largest relative error '+U.e(by[k],1)+'</span>').join(' ')}
  const BT=[3,-0.5,2,7],BP=[2.5,0,2,8],nB=4;
  const mseB=yp=>yp.reduce((s,v,i)=>s+(v-BT[i])*(v-BT[i]),0)/nB;
  const BUGS=[
    {sym:()=>'Loss over five training steps: <b>'+traj(1).map(v=>U.g(v,3)).join(' → ')+'</b>. It climbs every step, faster and faster.',
     code:['for step in range(5):','    loss = loss_fn(model(x), y)','    grads = backward(loss)','    for w, g in zip(params, grads):','        w += lr * g'],bad:4,
     why:'Wrong sign: the gradient points uphill (the direction that increases the loss fastest), so the update must subtract it: <code>w -= lr * g</code>. With the fix the same five steps give '+traj(-1).map(v=>U.f(v,3)).join(' → ')+'.'},
    {sym:()=>'Runs without any error. Gradient check on the tiny model: '+checkSummary('transpose'),
     code:['dz  = p - y','dW2 = np.outer(dz, h)','dh  = W2 @ dz','da  = dh * (a > 0)','dW1 = np.outer(da, x)','dx  = W1.T @ da'],bad:2,
     why:'Missing transpose: the gradient flowing back through a matrix uses the transpose, <code>dh = W2.T @ dz</code>. Because W₂ is square (3 by 3) the wrong product has the right shape, so nothing crashes; the last layer’s own gradient is still right, which makes the bug look like it lives further down. A non-square matrix would have raised a shape error: the safe habit is a gradient check on a small model whose matrices are not square.'},
    {sym:()=>{const a=G.softmaxNaive([2,1,0]),b=G.softmaxNaive([1000,999,0]),Z=[1000,999,0],l=G.lse(Z);return 'Loss at logits (2, 1, 0) with target sat: <b>'+U.f(-Math.log(a[2]),4)+'</b>, correct. At logits (1000, 999, 0) the probabilities come out as ('+b.map(v=>U.f(v,3)).join(', ')+'), so the loss is <b>'+U.f(-Math.log(b[0]))+'</b> if the answer is cat or dog and <b>'+U.f(-Math.log(b[2]))+'</b> if it is sat (the stable version gives '+Z.map(v=>U.f(l-v,3)).join(', ')+'). Training was fine for a while, then printed nan.'},
     code:['def cross_entropy(z, t):','    p = np.exp(z) / np.exp(z).sum()','    return -np.log(p[t])'],bad:1,
     why:'Overflow: <code>np.exp(1000)</code> is infinity, and infinity / infinity is NaN (panel 5). Subtract the largest logit first, or compute the log-probabilities directly: <code>z - m - np.log(np.exp(z - m).sum())</code> with <code>m = z.max()</code>. In 32-bit floats this happens from a logit of only 88.7.'},
    {sym:()=>{const an=BP.map((v,i)=>2*(v-BT[i])),nu=G.numgrad(mseB,BP,1e-6);return 'Gradient check on a batch of 4 (scikit-learn’s example: targets (3, −0.5, 2, 7), predictions (2.5, 0, 2, 8), MSE '+U.f(mseB(BP),3)+'): analytic ('+an.map(v=>U.f(v,2)).join(', ')+'), numerical ('+nu.map(v=>U.f(v,2)).join(', ')+'). Every entry is off by exactly the batch size, '+U.f(an[3]/nu[3],2)+'.'},
     code:['loss = ((y_pred - y_true) ** 2).mean()','grad = 2 * (y_pred - y_true)','y_pred -= lr * grad'],bad:1,
     why:'Forgot the 1/n: the loss is a mean, so each example’s gradient is <code>2 * (y_pred - y_true) / n</code>. The bug makes the effective learning rate grow with the batch size: a run that is stable at batch 4 diverges at batch 512.'},
    {sym:()=>{const b=G.backward(m0,'twice');return 'Reported loss at the starting model: <b>'+U.f(G.lossTwice(m0),3)+'</b> (true cross-entropy '+U.f(G.forward(m0).L,3)+'). The sat gradient is '+F(b.dz[2])+' instead of '+F(G.backward(m0).dz[2])+'. However well the model learns, the reported loss never drops below '+U.f(Math.log(1+2/Math.E),3)+'.'},
     code:['logits = model(x)','probs  = logits.softmax(-1)','loss   = F.cross_entropy(probs, target)'],bad:1,
     why:'Softmax applied twice: PyTorch’s <code>cross_entropy</code> expects unnormalised logits and applies the softmax itself. Feeding it probabilities (numbers between 0 and 1) squashes them again, so even a perfect prediction (0, 0, 1) is read as logits and scores −ln(e/(e + 2)) = ln(1 + 2/e) = 0.551, and the gradients are weaker. Pass <code>logits</code>.'},
    {sym:()=>{let a=G.clone(G.M0),b=G.clone(G.M0);for(let i=0;i<5;i++){a=G.sgdStep(a,G.LR,'detach');b=G.sgdStep(b,G.LR)}
      return 'The loss still falls (five steps: '+U.f(G.forward(a).L,3)+', against '+U.f(G.forward(b).L,3)+' without the bug), just more slowly, so nothing looks broken. Gradient check: '+checkSummary('detach')},
     code:['a = W1 @ x','h = torch.relu(a).detach()','z = W2 @ h','loss = F.cross_entropy(z[None], target)','loss.backward()'],bad:1,
     why:'Detached by mistake: <code>detach()</code> returns a tensor that never requires gradient, so the backward pass stops at h and W₁ and the embedding never learn (their gradient is empty, shown here as 0). Only the last layer trains, which is why the loss still falls. <code>detach()</code> is right only where you mean "treat this as a constant", as for a target network or a stop-gradient.'},
    {sym:()=>{const b=G.backward(m0);const num=G.gradCheck(m0,'').find(x=>x.p[0]==='W2'&&x.p[1]===0&&x.p[2]===0).num;
      return 'Gradient of W₂[1,1] after 1, 2 and 3 calls of the loop on the same example, against the numerical gradient '+F(num)+': <b>'+[1,2,3].map(k=>F(k*b.dW2[0][0])).join(', ')+'</b>. Ratios 1, 2, 3.'},
     code:['for x, t in batches:','    loss = F.cross_entropy(model(x), t)','    loss.backward()','    optimizer.step()','    # nothing clears the stored gradients'],bad:4,
     why:'Gradients were never zeroed: in PyTorch "Gradients by default add up", so each <code>backward()</code> adds to what is already stored, and every step uses the sum of all past gradients. Call <code>optimizer.zero_grad()</code> before (or after) each step. Adding up on purpose over several small batches before one step is gradient accumulation: then the zeroing happens after the step.'},
    {sym:()=>{const pr=[];BP.forEach(p=>BT.forEach(t=>pr.push((p-t)*(p-t))));const bc=pr.reduce((a,b)=>a+b,0)/pr.length;return 'Same batch as bug 4. Loss <b>'+U.f(bc,3)+'</b> instead of '+U.f(mseB(BP),3)+', and it will not go to zero even with perfect predictions.'},
     code:['y_true = np.array([[3], [-0.5], [2], [7]])   # shape (4, 1)','y_pred = model(x)                              # shape (4,)','loss = ((y_pred - y_true) ** 2).mean()'],bad:2,
     why:'Broadcasting: subtracting a (4,) array from a (4, 1) array silently builds a 4 by 4 table of every prediction minus every target, and the mean runs over all 16. Match the shapes (<code>y_true.reshape(-1)</code>). PyTorch’s <code>F.mse_loss</code> warns: "Using a target size ... that is different to the input size ... This will likely lead to incorrect results due to broadcasting"; a hand-written loss does not.'}];
  const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  $('gl-bugList').innerHTML=BUGS.map((b,i)=>'<div class="gl-bug" id="gl-bug'+i+'"><h3>Bug hunt '+(i+1)+'</h3><div class="gl-sym"><b>Symptom.</b> <span class="gl-symt"></span></div>'+
    '<pre class="gl-code">'+b.code.map((l,j)=>j===b.bad?'<span class="bad">'+esc(l)+'</span>':esc(l)).join('\n')+'</pre>'+
    '<button class="gl-revb" aria-expanded="false">Show the bug</button><div class="gl-rev"><p class="small">'+b.why+'</p></div></div>').join('');
  BUGS.forEach((b,i)=>{const c=$('gl-bug'+i);c.querySelector('.gl-symt').innerHTML=b.sym();
    c.querySelector('.gl-revb').addEventListener('click',e=>{const o=c.classList.toggle('open');c.querySelector('pre').classList.toggle('shown',o);e.target.textContent=o?'Hide':'Show the bug';e.target.setAttribute('aria-expanded',String(o))})});
  bern();lse();U.onRender(bern);U.onResize(bern);
})();
