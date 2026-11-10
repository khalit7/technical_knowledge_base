// ---- Scene (Why a nonlinearity, Fig. 1): XOR-shaped points that no line separates, and a two-unit ReLU layer that folds the plane so a flat cut does (renderer v2) ----
// Everything drawn is FOLD (src/mk_fold.py): 60 points in four clusters, the least-squares linear model, and the hand-set layer
// h1 = ReLU(x1 + x2), h2 = ReLU(x1 + x2 - 1), y = h1 - 2 h2. The step list's numbers are written here from the same data (check_stages.mjs compares).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-fd')||!window.S3||!window.FOLD)return;const {at,off,lerp,mix}=S3;
  const F=FOLD,S=2.8,Y0=.6,HY=1.3;
  const wx=x1=>(x1-.5)*S,wz=x2=>(.5-x2)*S,relu=v=>v>0?v:0;
  const lin=(a,b)=>F.lin[0]*a+F.lin[1]*b+F.lin[2],h1=(a,b)=>relu(a+b),h2=(a,b)=>relu(a+b-1),fy=(a,b)=>h1(a,b)-2*h2(a,b);
  const pct=v=>Math.round(v*100)+'%';
  function writeList(){const set=(k,v)=>document.querySelectorAll('[data-fd="'+k+'"]').forEach(e=>e.textContent=v);
    set('n',F.n);set('l0',F.lin_range[0].toFixed(2));set('l1',F.lin_range[1].toFixed(2));set('al',pct(F.acc_lin));set('af',pct(F.acc_fold));
    set('am',F.fold_A_max.toFixed(2));set('bm',F.fold_B_min.toFixed(2));set('an',pct(F.acc_nolin))}
  writeList();
  const G0=-.35,G1=1.35,NG=14;
  // a height field over the square as shaded quads; fn gives the output, col its tint
  function sheet(R,fn,col,a){if(a<=.01)return;const P=R.P,d=(G1-G0)/NG;
    for(let i=0;i<NG;i++)for(let j=0;j<NG;j++){const u0=G0+i*d,u1=u0+d,v0=G0+j*d,v1=v0+d,pts=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]].map(([u,v])=>[wx(u),Y0+HY*fn(u,v),wz(v)]);
      const hm=(fn(u0,v0)+fn(u1,v1))/2;R.quad(pts,{fill:mix(P.paper,col,cl01(.18+.45*(hm+.3))),fa:.62*a,ea:.12*a,lw:.6})}}
  const cl01=v=>Math.max(0,Math.min(1,v));
  // a crease: the line x1 + x2 = c across the square, drawn on the sheet fn
  function crease(R,c,fn,a){const pts=[];for(let i=0;i<=20;i++){const u=G0+(G1-G0)*i/20,v=c-u;if(v<G0-1e-9||v>G1+1e-9)continue;pts.push([wx(u),Y0+HY*fn(u,v)+.01,wz(v)])}
    if(pts.length>1)R.line(pts,{c:R.P.acc,w:2.6,a,top:1})}
  function plane(R,h,c,a){if(a<=.01)return;R.glass([wx(G0),Y0+HY*h,wz(G0)],[S*(G1-G0),0,0],[0,0,-S*(G1-G0)],{c,a,nu:6,nv:6,th:.02})}
  function draw(R,k,e){const P=R.P,A=P.c1,B=P.c2,narrow=R.W<520;R.grid(-4,4,-3.2,3.2,.5);
    // the input plane: the square the points live on
    R.quad([[wx(G0),Y0,wz(G0)],[wx(G1),Y0,wz(G0)],[wx(G1),Y0,wz(G1)],[wx(G0),Y0,wz(G1)]],{fill:mix(P.paper,P.mute,.08),fa:.55,ea:.5,lw:1,dz:100});
    [[0,'0'],[1,'1']].forEach(([v,t])=>{R.label([wx(v),Y0,wz(G0)+.15],'x₁ = '+t,{mono:true,fs:12,c:P.mute,dy:12,wide:1});R.label([wx(G1)+.15,Y0,wz(v)],'x₂ = '+t,{mono:true,fs:12,c:P.mute,al:'left',dx:6,wide:1})});
    // which output the points ride on at this step (their height), blended from the last step's
    const H=[()=>0,lin,h1,h2,fy,fy];
    const hp=(p,kk)=>H[Math.max(0,Math.min(5,kk))](p[0],p[1]);
    // sheets: the linear model's plane (step 2), unit 1 (3), unit 2 (4), the folded output (5, 6)
    if(k===1)plane(R,F.lin[2],mix(P.paper,P.mute,.6),e*.9);
    if(k===2)sheet(R,h1,P.c6,e);if(k===3){sheet(R,h1,P.c6,.25*(1-e));sheet(R,h2,P.c5,e)}
    if(k>=4)sheet(R,fy,P.c4,k===4?e:.8);
    if(k===2)crease(R,0,h1,e);if(k===3)crease(R,1,h2,e);if(k>=4){crease(R,0,fy,k===4?e:.6);crease(R,1,fy,k===4?e:.6)}
    if(k===5)plane(R,.5,P.c3,e*.75);
    // the points: balls on stems at their model output
    F.points.forEach(p=>{const t=k===0?0:e,y0=hp(p,k-1),y1=hp(p,k),hy=Y0+HY*(k===0?0:lerp(k===1?0:y0,y1,t)),c=p[2]?B:A,pos=[wx(p[0]),hy,wz(p[1])];
      if(k>0&&Math.abs(hy-Y0)>.03)R.line([[pos[0],Y0,pos[2]],pos],{c,w:1,a:.35});R.ball(pos,.075,{c,a:.95})});
    // cluster names, on the floor step and the final cut
    const cl=[[0,0,'A',A],[1,1,'A',A],[0,1,'B',B],[1,0,'B',B]];
    if(k===0||k===5)cl.forEach(([u,v,t,c])=>{const hh=k===0?0:fy(u,v);R.label([wx(u)+(u?.42:-.42),Y0+HY*hh,wz(v)],t,{fs:14,b:1,c,al:u?'left':'right',dx:u?4:-4,a:k===0?1:e})});
    // the step's formula, at the sheet's high corner
    // short labels at the front end of each crease and on the front edge of each plane
    const fe=c=>{const u=Math.min(G1,c-G0);return [u,c-u]};
    const lab=(uv,fn,t,c,o)=>R.label([wx(uv[0]),Y0+HY*fn(uv[0],uv[1]),wz(uv[1])],t,Object.assign({mono:true,fs:12.5,b:1,c:mix(P.ink,c,.65),a:k===o.k?e:1},o));
    if(k===1)lab([G0,G0],lin,'y ≈ '+F.lin[2].toFixed(2)+' everywhere',P.mute,{k:1,al:'right',dx:-10});
    if(k===2)lab(fe(0),h1,'crease: x₁ + x₂ = 0',P.acc,{k:2,dy:16});
    if(k===3)lab(fe(1),h2,'crease: x₁ + x₂ = 1',P.acc,{k:3,dy:16});
    if(k===5)lab([G0,G0],()=>.5,'cut at y = 0.5',P.c3,{k:5,al:'right',dx:-10});
  }
  const full={cam:[.42,.5],bounds:[[-2.7,.3,-2.7],[2.7,2.3,2.7]]};
  S3.stage({id:'stg-fd',list:'sx-fd',fig:'Fig. 1 · folding the plane with two ReLUs',cam:full.cam,bounds:full.bounds,aspect:.7,dur:1500,hold:4800,draw,margin:w=>w<520?[14,10,14,10]:[16,14,14,150],
    view:k=>k===0?{cam:[.25,.95],bounds:[[-2.6,.5,-2.6],[2.6,.8,2.6]]}:k===2||k===3?{cam:[.42,.42],bounds:[[-2.7,.3,-2.7],[2.7,4.1,2.7]]}:k===4?{cam:[.55,.38],bounds:full.bounds}:full});
})();
