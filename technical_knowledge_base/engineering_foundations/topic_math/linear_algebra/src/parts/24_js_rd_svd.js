// ---- Reading s12: the unit circle under A in one step, under its SVD (rotate, stretch, rotate), and under its eigendecomposition ----
(function(){
  const $=id=>document.getElementById(id);if(!$('rd-svd-card'))return;
  const F=LA.fixed,mul=LA.mul,RM=RD.RM;
  const MATS={A:[[3,0],[4,5]],S:[[2,-2],[-2,5]]};
  let mode='one',mk='A',cur=LA.I(2),tw=0;
  // factors: each {M, kind:'rot'|'scale'|'lin', p (angle or diag)}
  function factors(){const M=MATS[mk];
    if(mode==='one')return [{M,kind:'lin',name:'A'}];
    if(mode==='svd'){const d=LA.svd(M),Vt=LA.T([d.V[0],d.V[1]]).map((r,i)=>r),V=[[d.V[0][0],d.V[1][0]],[d.V[0][1],d.V[1][1]]];
      const Vt2=LA.T(V),U=[[d.U[0][0],d.U[1][0]],[d.U[0][1],d.U[1][1]]];
      const aV=Math.atan2(V[1][0],V[0][0]),aU=Math.atan2(U[1][0],U[0][0]);
      return [{M:Vt2,kind:'rot',p:-aV,name:'Vᵀ'},{M:[[d.s[0],0],[0,d.s[1]]],kind:'scale',p:d.s,name:'Σ'},{M:U,kind:'rot',p:aU,name:'U'}]}
    const e=LA.eig2(M),P=[[e.vecs[0][0],e.vecs[1][0]],[e.vecs[0][1],e.vecs[1][1]]],dP=LA.det2(P),Pi=[[P[1][1]/dP,-P[0][1]/dP],[-P[1][0]/dP,P[0][0]/dP]];
    return [{M:Pi,kind:'lin',name:'P⁻¹'},{M:[[e.vals[0],0],[0,e.vals[1]]],kind:'scale',p:e.vals,name:'Λ'},{M:P,kind:'lin',name:'P'}]}
  function partial(f,t){if(t>=1)return f.M;if(f.kind==='rot')return LA.rot(f.p*t);if(f.kind==='scale')return [[1+(f.p[0]-1)*t,0],[0,1+(f.p[1]-1)*t]];
    return [[1+(f.M[0][0]-1)*t,f.M[0][1]*t],[f.M[1][0]*t,1+(f.M[1][1]-1)*t]]}
  function stateM(i,t){const fs=factors();let M=LA.I(2);for(let k=0;k<i;k++){const tt=(k===i-1&&t!==undefined)?t:1;M=mul(partial(fs[k],tt),M)}return M}
  function marks(){const M=MATS[mk];if(mode==='eig'){const e=LA.eig2(M);return e.vecs}const d=LA.svd(M);return [d.V[0],d.V[1]]}
  function draw(M){const el=$('rd-svd-svg'),W=Math.min(RD.width(el),620),H=Math.round(Math.min(W*0.82,420)),R=7.2,sc=Math.min(W,H)/(2*R),cx=W/2,cy=H/2,X=v=>cx+v*sc,Y=v=>cy-v*sc;
    let b='';for(let g=-7;g<=7;g++){b+='<line x1="'+X(g)+'" y1="0" x2="'+X(g)+'" y2="'+H+'" stroke="var(--line)" stroke-opacity="'+(g?0.6:1)+'"/><line x1="0" y1="'+Y(g)+'" x2="'+W+'" y2="'+Y(g)+'" stroke="var(--line)" stroke-opacity="'+(g?0.6:1)+'"/>'}
    b+='<circle cx="'+cx+'" cy="'+cy+'" r="'+sc+'" fill="none" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    for(let g=-1;g<=1.001;g+=0.5){const p=[[g,-1],[g,1],[-1,g],[1,g]].map(q=>LA.mv(M,q));
      b+='<line x1="'+X(p[0][0])+'" y1="'+Y(p[0][1])+'" x2="'+X(p[1][0])+'" y2="'+Y(p[1][1])+'" stroke="var(--c4)" stroke-opacity=".5"/><line x1="'+X(p[2][0])+'" y1="'+Y(p[2][1])+'" x2="'+X(p[3][0])+'" y2="'+Y(p[3][1])+'" stroke="var(--c4)" stroke-opacity=".5"/>'}
    let c='';for(let i=0;i<=96;i++){const t=i/96*2*Math.PI,p=LA.mv(M,[Math.cos(t),Math.sin(t)]);c+=(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)}
    b+='<path d="'+c+'" fill="var(--c6)" fill-opacity=".12" stroke="var(--c6)" stroke-width="2.2"/>';
    const mk2=marks();mk2.forEach((v,i)=>{const p=LA.mv(M,v);b+=RDF.arrow(X(0),Y(0),X(p[0]),Y(p[1]),i?'var(--c2)':'var(--c1)',2.6);
      const lx=X(p[0]),right=lx>W-95||(p[0]<0&&lx>95);b+=RD.t(right?lx-6:lx+6,Y(p[1])+(p[1]>=0?-6:14),(mode==='eig'?'eigvec ':'v')+(i+1)+' → '+F(LA.norm(p),3),{fs:11.5,w:600,fill:i?'var(--c2)':'var(--c1)',a:right?'end':'start'})});
    el.innerHTML=RD.svg(W,H,b,'Unit circle and grid under the matrix');return mk2.map(v=>LA.mv(M,v))}
  function counters(M,img){const ang=Math.acos(Math.max(-1,Math.min(1,LA.dot(img[0],img[1])/LA.norm(img[0])/LA.norm(img[1]))))*180/Math.PI;
    $('rd-svd-cnt').innerHTML=RD.stat('Area scale so far',F(Math.abs(LA.det2(M)),3),'det = '+F(LA.det2(M),3))+RD.stat('Length of image of '+(mode==='eig'?'eigvec 1':'v1'),F(LA.norm(img[0]),3),'')+
      RD.stat('Length of image of '+(mode==='eig'?'eigvec 2':'v2'),F(LA.norm(img[1]),3),'')+RD.stat('Angle between them',F(ang,1)+'°',mode==='eig'?'eigenvectors: not kept at 90°':'singular vectors: kept at 90°')}
  function caps(i){const M=MATS[mk],nm=mk==='A'?'A':'S',d=LA.svd(M),e=LA.eig2(M),m0=mode;mode='svd';const fs=factors();mode=m0;
    const sv=F(d.s[0],3)+' and '+F(d.s[1],3);
    const C={one:[['Start','The unit circle (radius 1, dashed), the grid of the square [-1, 1]², and two marked input directions v1, v2: the right singular vectors, at right angles.'],
        ['Apply '+nm+' in one step','The circle becomes an ellipse with semi-axes '+sv+' (the singular values), and the marked arrows land on its axes, still at right angles. Switch to the SVD to see how.']],
      svd:[['Start','Same circle, same arrows v1 and v2. The SVD writes '+nm+' = UΣVᵀ.'],
        ['Rotate by Vᵀ ('+F(fs[0].p*180/Math.PI,2)+'°)','Vᵀ turns v1 onto the horizontal axis and v2 onto the vertical one. A rotation: lengths, angles and area unchanged.'],
        ['Stretch by Σ = diag('+sv+')','Now along the axes: horizontal by '+F(d.s[0],3)+', vertical by '+F(d.s[1],3)+'. Area grows by their product, '+F(d.s[0]*d.s[1],3)+' = |det|. This is the only step that changes shape.'],
        ['Rotate by U ('+F(fs[2].p*180/Math.PI,2)+'°)','U turns the axes onto the output directions u1, u2. Final picture: identical to applying '+nm+' in one step. '+(mk==='S'?'For symmetric S, U = V, so this rotation undoes the first.':'U and V differ: A is not symmetric.')]],
      eig:[['Start','Marked arrows: the eigenvectors '+(mk==='A'?'(0, 1) for eigenvalue 5 and (1, -2) for eigenvalue 3, scaled to length 1 (signs may flip). They are not at right angles (dot product -2 before scaling).':'(1, -2) and (2, 1), scaled to length 1, at right angles because S is symmetric.')],
        ['Change basis by P⁻¹',mk==='A'?'P⁻¹ maps the eigenvectors onto the axes. It is not a rotation: it skews the grid, and the circle is already distorted.':'For symmetric S, P⁻¹ = Pᵀ is a rotation: nothing is distorted yet.'],
        ['Scale by Λ = diag('+F(e.vals[0],3)+', '+F(e.vals[1],3)+')','Each axis is scaled by its eigenvalue. In this basis the matrix is just two numbers.'],
        ['Change back by P','P maps the axes back onto the eigenvectors. Each eigenvector ends up only scaled: by '+F(e.vals[0],3)+' and '+F(e.vals[1],3)+'. '+(mk==='A'?'Compare with the SVD: the stretches 6.708 and 2.236 are not these eigenvalues.':'For S, eigen and SVD coincide: same numbers, same directions.')]]};
    const c=C[mode][i];$('rd-svd-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+C[mode].length+': '+c[0]+'</div><p>'+c[1]+'</p>'}
  let last=0;
  function show(i){if(tw){cancelAnimationFrame(tw);tw=0}
    const fin=()=>{const M=stateM(i),img=draw(M);counters(M,img)};
    if(i===last+1&&!RM){const t0=performance.now(),dur=650;const f=now=>{const t=Math.min(1,(now-t0)/dur),e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;const M=stateM(i,e),img=draw(M);counters(M,img);if(t<1)tw=requestAnimationFrame(f);else tw=0};tw=requestAnimationFrame(f)}else fin();
    caps(i);last=i}
  const nSteps=()=>factors().length+1;
  const an=RD.anim({card:'rd-svd-card',ctl:'rd-svd-ctl',n:nSteps(),draw:show,ms:2000,label:'Step of the SVD animation'});
  const leg=()=>{$('rd-svd-leg').innerHTML='<span style="--sw:var(--c6)">unit circle, mapped</span><span style="--sw:var(--c4)">grid of [-1, 1]², mapped</span><span style="--sw:var(--c1)">'+(mode==='eig'?'eigenvector 1':'v1')+'</span><span style="--sw:var(--c2)">'+(mode==='eig'?'eigenvector 2':'v2')+'</span>'};
  RD.seg($('rd-svd-seg'),m=>{mode=m;last=0;leg();an.reset(nSteps());an.play()});
  RD.seg($('rd-svd-mat'),m=>{mk=m;last=0;an.reset(nSteps());an.play()});
  leg();RD.onResize(()=>an.redraw());
})();
