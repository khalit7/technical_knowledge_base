// ---- Derivative workbench (t-bench): forward, hand-derived VJP, finite-difference check, Jacobian built from VJPs ----
(function(){
  const M=window.MC,D=window.MCD,root=document.getElementById('t-bench');if(!root)return;
  const $=id=>document.getElementById(id);
  let layer='linear',act='gelu',seed=1,P=null,G=null;
  const SH={linear:{W:'m × n (3 × 2)',x:'n (2)',b:'m (3)',y:'m (3)'},act:{x:'n (4)',y:'n (4)'},softmax:{z:'K (3)',y:'K (3)'},sce:{z:'K (3)',y:'scalar'},
    layernorm:{x:'N (4)',gamma:'N (4)',beta:'N (4)',y:'N (4)'},attn:{Q:'T_q × d (2 × 2)',K:'T_k × d (3 × 2)',V:'T_k × d (3 × 2)',y:'T_q × d (2 × 2)'}};
  const NAME={W:'W',x:'x',b:'b',z:'z',gamma:'γ',beta:'β',Q:'Q',K:'K',V:'V'};
  function defaults(){const w=D.wb;
    if(layer==='act'){const a=w.act[act];P=M.clone(a.P);G=a.g.slice();return}
    const d=w[layer];P=M.clone(d.P);G=M.clone(d.g);if(layer==='sce')P.y=2}
  let s=1;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647};
  const r2=()=>Math.round((rnd()*4-2)*100)/100;
  function randomise(){s=seed*7919+13;seed++;rnd();
    const mat=(r,c)=>Array.from({length:r},()=>Array.from({length:c},r2)),vec=n=>Array.from({length:n},r2);
    if(layer==='linear'){P={W:mat(3,2),x:vec(2),b:vec(3)};G=vec(3)}
    if(layer==='act'){P={fn:act,x:vec(4).map(v=>v===0?0.01:v)};G=vec(4)}
    if(layer==='softmax'){P={z:vec(3)};G=vec(3)}
    if(layer==='sce'){P={z:vec(3),y:2};G=[1]}
    if(layer==='layernorm'){P={x:vec(4),gamma:vec(4),beta:vec(4),eps:1e-5};G=vec(4)}
    if(layer==='attn'){P={Q:mat(2,2),K:mat(3,2),V:mat(3,2)};G=mat(2,2)}}
  const f4=v=>(Math.abs(v)<5e-13?0:v).toFixed(4).replace('-','−');
  const ex=v=>v===0?'0':v.toExponential(1).replace('-','−');
  const tbl=a=>'<table class="mx">'+(Array.isArray(a[0])?a:[a]).map(r=>'<tr>'+r.map(v=>'<td>'+f4(v)+'</td>').join('')+'</tr>').join('')+'</table>';
  function render(){
    if(layer==='act')P.fn=act;
    $('wb-actw').style.display=layer==='act'?'':'none';
    root.querySelectorAll('#wb-steps>div').forEach(d=>d.classList.toggle('on',d.dataset.l===layer));
    const L=M.L[layer],h=+$('wb-h').value,y=L.fwd(P),chk=M.fdCheck(layer,P,G,h);
    // shapes
    const sh=SH[layer];
    $('wb-shapes').innerHTML='<div class="tw"><table class="mini"><tr><th>quantity</th><th>shape</th><th>its gradient</th></tr>'+
      L.inputs.map(k=>'<tr><td>'+NAME[k]+'</td><td class="shp">'+sh[k]+'</td><td>'+NAME[k]+'̄: same shape</td></tr>').join('')+
      '<tr><td>output y</td><td class="shp">'+sh.y+'</td><td>ȳ (given, the gradient arriving from above)</td></tr></table></div>';
    const worst=chk.worst,ok=worst<1e-6;
    $('wb-sum').innerHTML=RD.stat('Worst relative error, analytic against numerical',ex(worst),ok?'<span class="ok">agree</span>':(h<1e-8?'<span class="bad">rounding error dominates at this h</span>':'<span class="bad">disagree</span>'))+
      RD.stat('Function evaluations for the check',String(2*L.inputs.reduce((n,k)=>n+M.flat(P[k]).length,0)),'two per input entry; the VJP needed one backward pass');
    let v='<div><h4>inputs</h4>'+L.inputs.map(k=>NAME[k]+tbl(P[k])).join('')+'</div><div><h4>output y</h4>'+tbl(y)+'<h4 style="margin-top:6px">ȳ (the incoming gradient)</h4>'+tbl(G)+'</div>';
    for(const k of L.inputs){const c=chk.per[k],shape=Array.isArray(P[k][0])?P[k][0].length:0;
      const re=a=>shape?a.reduce((acc,x,i)=>{if(i%shape===0)acc.push([]);acc[acc.length-1].push(x);return acc},[]):a;
      v+='<div><h4>'+NAME[k]+'̄: analytic (the VJP rule)</h4>'+tbl(re(c.analytic))+'<h4 style="margin-top:4px">numerical, central difference</h4>'+tbl(re(c.numeric))+'<div class="small">max relative error '+ex(c.relerr)+'</div></div>'}
    if(layer==='layernorm'){const kf=L.kernel(P,G),st=L.stats(P);v+='<div><h4>intermediates</h4><div class="small">μ = '+f4(st.mu)+', σ² = '+f4(st.v)+', r = '+f4(st.r)+'</div>x̂'+tbl(st.xh)+'<div class="small">PyTorch kernel form: a = '+f4(kf.a)+', b = '+f4(kf.b)+', c = '+f4(kf.c)+'</div>a·ȳ·γ + b·x + c'+tbl(kf.x)+'</div>'}
    if(layer==='attn'){const pa=L.parts(P),b=L.bwd(P,G);v+='<div><h4>intermediates</h4>S'+tbl(pa.S)+'A (attention weights)'+tbl(pa.A)+'D (one per query)'+tbl(b.D)+'S̄'+tbl(b.dS)+'</div>'}
    if(layer==='softmax'){const p=M.softmax(P.z);v+='<div><h4>intermediates</h4><div class="small">p · ȳ = '+f4(M.sum(p.map((x,i)=>x*G[i])))+'</div>p'+tbl(p)+'</div>'}
    $('wb-vals').innerHTML=v;
    // Jacobian w.r.t. the first input, built row by row from VJPs with unit vectors
    const k0=L.inputs[0],out=M.flat(y),nin=M.flat(P[k0]).length;
    if(out.length*nin<=72){const J=[];
      for(let i=0;i<out.length;i++){const e=out.map((_,j)=>j===i?1:0);let g=e;if(Array.isArray(y[0])){const c=y[0].length;g=[];for(let r=0;r<y.length;r++)g.push(e.slice(r*c,r*c+c))}
        J.push(M.flat(L.bwd(P,g)[k0]))}
      const vj=out.map((_,i)=>0),gf=M.flat(G);const jt=Array.from({length:nin},(_,c)=>J.reduce((s,row,r)=>s+row[c]*gf[r],0));
      $('wb-jac').innerHTML='<p class="small">∂y/∂'+NAME[k0]+': '+out.length+' outputs by '+nin+' input entries (numerator layout, '+(out.length*nin)+' numbers), built one row at a time by running the backward rule with ȳ set to each unit vector: a Jacobian is just '+out.length+' VJPs. Multiplying Jᵀ by the actual ȳ gives back the VJP above.</p>'+tbl(J)+'<div class="small" style="margin-top:4px">Jᵀ ȳ = </div>'+tbl(jt)+(layer==='linear'?'<p class="small">It equals W, as section 2 of the Reading says.</p>':'')+(layer==='softmax'?'<p class="small">Symmetric, and every row adds up to 0.</p>':'');
    }else $('wb-jac').innerHTML='<p class="small">Too large to show here ('+out.length*nin+' numbers).</p>';
  }
  RD.seg($('wb-layer'),m=>{layer=m;defaults();render()});
  $('wb-act').addEventListener('change',e=>{act=e.target.value;defaults();render()});
  $('wb-h').addEventListener('change',render);
  $('wb-rand').addEventListener('click',()=>{randomise();render()});
  $('wb-reset').addEventListener('click',()=>{defaults();render()});
  defaults();render();
})();
