// ---- Matrix playground (t-play) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('t-play'))return;
  const F=LA.fixed;
  const P2={'A = [[3, 0], [4, 5]]':[[3,0],[4,5]],'S = WᵀW':[[2,-2],[-2,5]],'Rotation 30°':LA.rot(Math.PI/6).map(r=>r.map(v=>+v.toFixed(4))),'Shear':[[1,1],[0,1]],
    'Projection':[[1,0],[0,0]],'Rank 1: [[1, 2], [2, 4]]':[[1,2],[2,4]],'Reflection':[[1,0],[0,-1]],'Near-singular B':[[1,1],[1,1.001]],'Cholesky example':[[4,2],[2,3]]};
  const P3={'M (rank 2)':[[1,2,3],[2,4,6],[1,0,1]],'W Wᵀ (rank 2)':[[1,0,1],[0,1,-2],[1,-2,5]],'Identity':[[1,0,0],[0,1,0],[0,0,1]],
    'Rotation about z':[[0,-1,0],[1,0,0],[0,0,2]],'Hilbert 3x3':[[1,0.5,1/3],[0.5,1/3,0.25],[1/3,0.25,0.2]].map(r=>r.map(v=>+v.toFixed(6))),'diag(1, 10, 100)':[[1,0,0],[0,10,0],[0,0,100]]};
  let n=2,M=P2['A = [[3, 0], [4, 5]]'].map(r=>r.slice()),preset='A = [[3, 0], [4, 5]]',ns=0;
  function presets(){const P=n===2?P2:P3;$('pl-pres').innerHTML=Object.keys(P).map(k=>'<button data-k="'+k+'"'+(k===preset?' class="on"':'')+'>'+k+'</button>').join('')}
  function inputs(){const el=$('pl-in');el.style.gridTemplateColumns='repeat('+n+',auto)';
    el.innerHTML=M.map((r,i)=>r.map((v,j)=>'<input type="number" step="any" inputmode="decimal" aria-label="Entry row '+(i+1)+' column '+(j+1)+'" data-i="'+i+'" data-j="'+j+'" value="'+(+v.toFixed(6))+'">').join('')).join('')}
  function readouts(){const d=LA.svd(M),dt=LA.det(M),tr=M.reduce((s,r,i)=>s+r[i],0),sym=M.every((r,i)=>r.every((v,j)=>Math.abs(v-M[j][i])<1e-12));
    let ev;if(n===2){const e=LA.eig2(M);ev=e.complex?(F(e.vals[0][0],3)+' ± '+F(e.vals[0][1],3)+'i (complex: no real direction is kept)'):(F(e.vals[0],3)+', '+F(e.vals[1],3)+(e.defective?' (repeated, only one eigenvector direction)':''));
      if(!e.complex)ev+='<br><span class="mute">eigenvectors '+e.vecs.map(v=>'('+F(v[0],3)+', '+F(v[1],3)+')').join(', ')+'</span>'}
    else{const e=LA.eig3(M);ev=e.complex?e.vals.map(v=>Math.abs(v[1])<1e-12?F(v[0],3):F(v[0],3)+(v[1]>0?' + ':' - ')+F(Math.abs(v[1]),3)+'i').join(', '):e.vals.map(v=>F(v,3)).join(', ')}
    const fro=Math.sqrt(d.s.reduce((a,v)=>a+v*v,0)),nuc=d.s.reduce((a,v)=>a+v,0);
    let pd='no (not symmetric)';if(sym){const e=LA.symEig(M).vals;pd=e[e.length-1]>1e-12?'yes (all eigenvalues > 0)':(e[e.length-1]>-1e-12?'semi-definite (smallest eigenvalue 0)':'no (an eigenvalue is negative)')}
    const vec=v=>'('+v.map(x=>F(x,3)).join(', ')+')';
    $('pl-ro').innerHTML='<dt>Determinant</dt><dd>'+F(dt,4)+(Math.abs(dt)<1e-12?' (singular: not invertible)':'')+'</dd><dt>Trace</dt><dd>'+F(tr,4)+'</dd><dt>Rank</dt><dd>'+d.rank+' of '+n+'</dd>'+
      '<dt>Eigenvalues</dt><dd>'+ev+'</dd><dt>Singular values</dt><dd>'+d.s.map(v=>F(v,4)).join(', ')+'</dd>'+
      '<dt>Right singular vectors v</dt><dd>'+d.V.map(vec).join(', ')+'</dd><dt>Left singular vectors u</dt><dd>'+d.U.map(vec).join(', ')+'</dd>'+
      '<dt>Condition number κ</dt><dd>'+(isFinite(d.kappa)?F(d.kappa,4):'∞ (rank-deficient)')+(isFinite(d.kappa)?' <span class="mute">(lose about '+F(Math.log10(d.kappa),1)+' digits)</span>':'')+'</dd>'+
      '<dt>Norms</dt><dd>Frobenius '+F(fro,4)+', spectral '+F(d.s[0],4)+', nuclear '+F(nuc,4)+'</dd><dt>Symmetric</dt><dd>'+(sym?'yes':'no')+'</dd><dt>Positive definite</dt><dd>'+pd+'</dd>';
    // singular value bars
    const el=$('pl-bars'),W=Math.min(RD.width(el),380),H=24*n+26,mx=d.s[0]||1;let b=RD.t(0,12,'Singular values (bars to scale)',{fs:11.5,w:600});
    d.s.forEach((v,i)=>{const w=Math.max(0,(W-90)*v/mx);b+=RD.t(0,32+i*24,'σ'+(i+1),{fs:12})+'<rect x="26" y="'+(21+i*24)+'" width="'+w+'" height="14" rx="3" fill="var(--c'+(i+1)+')"/>'+RD.t(30+w,32+i*24,F(v,3),{fs:11.5})});
    el.innerHTML=RD.svg(W,H,b,'Singular values');return d}
  function pic(d){const el=$('pl-svg');if(n!==2){$('pl-pic').hidden=true;return}$('pl-pic').hidden=false;
    const t=+$('pl-t').value,V=[[d.V[0][0],d.V[1][0]],[d.V[0][1],d.V[1][1]]],U=[[d.U[0][0],d.U[1][0]],[d.U[0][1],d.U[1][1]]];
    const lerp=(A,s)=>[[1+(A[0][0]-1)*s,A[0][1]*s],[A[1][0]*s,1+(A[1][1]-1)*s]];
    const isRot=Q=>Math.abs(LA.det2(Q)-1)<1e-9,ang=Q=>Math.atan2(Q[1][0],Q[0][0]);
    const part=(Q,s,inv)=>isRot(Q)?LA.rot((inv?-1:1)*ang(Q)*s):lerp(inv?LA.T(Q):Q,s);
    let T=LA.I(2);const a=Math.min(1,t),b=Math.min(1,Math.max(0,t-1)),c=Math.max(0,t-2);
    T=part(V,a,true);if(t>1)T=LA.mul([[1+(d.s[0]-1)*b,0],[0,1+(d.s[1]-1)*b]],LA.T(V));if(t>2)T=LA.mul(part(U,c,false),LA.mul([[d.s[0],0],[0,d.s[1]]],LA.T(V)));
    $('pl-tl').textContent=t<=0?'identity':t<1?'rotating by Vᵀ':t<2?'stretching by Σ':t<3?'rotating by U':'full map A = UΣVᵀ';
    const W=Math.min(RD.width(el),520),H=Math.round(W*0.85);
    const pts=[[1,1],[-1,1],[1,-1],[-1,-1]].map(p=>LA.mv(M,p));let R=1.6;pts.forEach(p=>{R=Math.max(R,Math.abs(p[0])*1.08,Math.abs(p[1])*1.08)});
    const sc=Math.min(W,H)/(2*R),cx=W/2,cy=H/2,X=v=>cx+v*sc,Y=v=>cy-v*sc;let s='';
    const step=R>12?Math.ceil(R/8):1;for(let g=-Math.floor(R/step)*step;g<=R;g+=step){s+='<line x1="'+X(g)+'" y1="0" x2="'+X(g)+'" y2="'+H+'" stroke="var(--line)"/><line x1="0" y1="'+Y(g)+'" x2="'+W+'" y2="'+Y(g)+'" stroke="var(--line)"/>'}
    s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+sc+'" fill="none" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    for(let g=-1;g<=1.001;g+=0.5){const p=[[g,-1],[g,1],[-1,g],[1,g]].map(q=>LA.mv(T,q));
      s+='<line x1="'+X(p[0][0])+'" y1="'+Y(p[0][1])+'" x2="'+X(p[1][0])+'" y2="'+Y(p[1][1])+'" stroke="var(--c4)" stroke-opacity=".5"/><line x1="'+X(p[2][0])+'" y1="'+Y(p[2][1])+'" x2="'+X(p[3][0])+'" y2="'+Y(p[3][1])+'" stroke="var(--c4)" stroke-opacity=".5"/>'}
    let c2='';for(let i=0;i<=96;i++){const th=i/96*2*Math.PI,p=LA.mv(T,[Math.cos(th),Math.sin(th)]);c2+=(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)}
    s+='<path d="'+c2+'" fill="var(--c6)" fill-opacity=".12" stroke="var(--c6)" stroke-width="2"/>';
    const e=LA.eig2(M);if(!e.complex)e.vecs.forEach(v=>{s+='<line x1="'+X(-R*v[0]*2)+'" y1="'+Y(-R*v[1]*2)+'" x2="'+X(R*v[0]*2)+'" y2="'+Y(R*v[1]*2)+'" stroke="var(--c5)" stroke-width="1.4" stroke-dasharray="6 4"/>'});
    [0,1].forEach(i=>{const v=d.V[i],col=i?'var(--c2)':'var(--c1)';s+=RDF.arrow(X(0),Y(0),X(v[0]),Y(v[1]),col,1.4,'3 3');const p=LA.mv(T,v);if(LA.norm(p)>1e-9)s+=RDF.arrow(X(0),Y(0),X(p[0]),Y(p[1]),col,2.6)});
    el.innerHTML=RD.svg(W,H,s,'The matrix acting on the plane')}
  function render(){const d=readouts();pic(d)}
  $('pl-in').addEventListener('input',e=>{const t=e.target;if(t.tagName!=='INPUT')return;const v=parseFloat(t.value);if(!isFinite(v))return;M[+t.dataset.i][+t.dataset.j]=v;ns=0;$('pl-nsnote').textContent='';preset='';presets();render()});
  $('pl-pres').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;preset=b.dataset.k;M=(n===2?P2:P3)[preset].map(r=>r.slice());ns=0;$('pl-nsnote').textContent='';presets();inputs();render()});
  RD.seg($('pl-size'),m=>{n=+m;preset=n===2?'A = [[3, 0], [4, 5]]':'M (rank 2)';M=(n===2?P2:P3)[preset].map(r=>r.slice());ns=0;$('pl-nsnote').textContent='';presets();inputs();render()});
  $('pl-t').addEventListener('input',render);
  $('pl-tr').addEventListener('click',()=>{M=LA.T(M);inputs();render()});
  $('pl-reset').addEventListener('click',()=>{const P=n===2?P2:P3;if(!P[preset])preset=Object.keys(P)[0];M=P[preset].map(r=>r.slice());ns=0;$('pl-nsnote').textContent='';presets();inputs();render()});
  $('pl-ns').addEventListener('click',()=>{if(ns===0){const f=Math.sqrt(M.flat().reduce((a,v)=>a+v*v,0));if(f<1e-12)return;M=M.map(r=>r.map(v=>v/f))}
    else{const X=M,XXt=LA.mul(X,LA.T(X)),XXtX=LA.mul(XXt,X);M=X.map((r,i)=>r.map((v,j)=>1.5*v-0.5*XXtX[i][j]))}
    ns++;inputs();const d=readouts();pic(d);
    $('pl-nsnote').textContent=ns===1?'Step 0: divided by the Frobenius norm so every singular value is at most 1. Press again to apply X ← 1.5X − 0.5XXᵀX; the singular vectors stay, each singular value s becomes 1.5s − 0.5s³, which climbs to 1 (zeros stay 0).':'Step '+(ns-1)+': singular values '+d.s.map(v=>F(v,4)).join(', ')+'.'});
  presets();inputs();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-play']=window.TAB_RENDER['t-play']||[]).push(render);
  addEventListener('resize',()=>{if(!$('t-play').hidden)render()});
  render();
})();
