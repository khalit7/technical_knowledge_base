// ---- Scene (section 2, Fig. 2): per-coordinate steps on the axis-aligned and the rotated ravine, and Shampoo's full matrix (renderer v2) ----
// The race's engine at its tuned rates. Columns on the right: the size of each coordinate of the gradient at the start, then of Adam's
// first step divided by the rate (m-hat / sqrt(v-hat) = g / |g| on step 1). Step-list numbers are written from the same runs (data-ad spans).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-ad')||!window.SURF)return;const {at,off,lerp,mix}=S3;const XC=-4.35;
  const A=SURF.make('ravine',{D:4.4}),B=SURF.make('rotated',{W:5.6}),C=SURF.COL,E=SURF.E,LR=SURF.LR;
  const g0=A.sf.g(...A.sf.start),g1=B.sf.g(...B.sf.start);
  const ad=E.run('ravine','adam',LR.ravine.adam),adR=E.run('rotated','adam',LR.rotated.adam);
  const st1=(r,lr)=>[(r.xs[1]-r.xs[0])/lr,(r.ys[1]-r.ys[0])/lr];
  const s0=st1(ad,LR.ravine.adam),s1=st1(adR,LR.rotated.adam);
  // Shampoo's accumulated preconditioner after its run on the rotated ravine: H = 1e-4 I + sum g g^T, step matrix H^(-1/2)
  const sh=B.run('shampoo');let H=[1e-4,0,1e-4];for(let t=0;t<sh.T;t++){const g=B.sf.g(sh.xs[t],sh.ys[t]);H[0]+=g[0]*g[0];H[1]+=g[0]*g[1];H[2]+=g[1]*g[1]}
  const M=E.isqrt2(H),tr=(M[0]+M[2])/2,dd=Math.sqrt(((M[0]-M[2])/2)**2+M[1]*M[1]),m1=tr+dd,m2=tr-dd,ev=Math.abs(M[1])>1e-12?[m1-M[2],M[1]]:[1,0],en=Math.hypot(...ev),u1=[ev[0]/en,ev[1]/en],u2=[-u1[1],u1[0]];
  const OPTS=['adagrad','rmsprop','adam'];
  function writeList(){const set=(k,v)=>document.querySelectorAll('[data-ad="'+k+'"]').forEach(e=>e.textContent=v),r0=k=>A.run(k),r1=k=>B.run(k);
    set('gx',Math.abs(g0[0]).toFixed(0));set('gy',Math.abs(g0[1]).toFixed(0));set('sx',Math.abs(s0[0]).toFixed(2));set('sy',Math.abs(s0[1]).toFixed(2));
    set('agf',r0('adagrad').first);set('rmf',r0('rmsprop').first);set('adf',r0('adam').first);set('nef',r0('nes').first);
    set('hx',Math.abs(g1[0]).toFixed(0));set('hy',Math.abs(g1[1]).toFixed(0));
    set('agl',r1('adagrad').ls[150].toFixed(2));set('rml',r1('rmsprop').ls[150].toFixed(3));set('adfr',r1('adam').first);set('shf',r1('shampoo').first);set('shf0',r0('shampoo').first);set('nefr',r1('nes').first);
    set('mr',(m1/m2).toFixed(0))}
  // two columns on the right, x and y; heights morph between the gradient's size and the step's size
  function cols(R,k,e,a){const P=R.P,mx=60,hc=1.5;
    const gA=[Math.abs(g0[0]),Math.abs(g0[1])],gB=[Math.abs(g1[0]),Math.abs(g1[1])],one=[mx/1.6,mx/1.6];
    const v=k===0?gA:k===1?gA.map((x,i)=>lerp(x,one[i],e)):k===2?one:k===3?one.map((x,i)=>lerp(x,gB[i],e)):gB;
    const grad=k===0||(k===1&&e<.5)||(k===3&&e>=.5)||k>=4,show=k<=1?gA:gB,lab=grad?'|gradient|':'|step| ÷ η';
    ['x','y'].forEach((n,i)=>{const z=i?-.45:.45,hh=Math.max(.02,v[i]/mx*hc);R.box([XC,0,z],[.42,hh,.42],{fill:i?P.c2:P.c3,a});
      R.label([XC,hh,z],n+': '+(grad?Math.round(show[i]):'1'),{mono:true,fs:12.5,b:1,c:i?P.c2:P.c3,dy:-12,al:i?'center':'left',dx:i?0:-4,a})});
    R.label([XC,0,.9],lab,{mono:true,fs:12,c:P.mute,dy:14,a,wide:1})}
  function draw(R,k,e){const P=R.P,rot=k>=3;R.grid(-5,4,-3.4,3.4,.5);
    const aA=k<=2?(k===0?Math.min(1,e*1.5):1):k===3?1-e:0,aB=k===3?e:k>3?1:0;
    if(aA>.01){A.mesh(R,aA*.85);A.marks(R,aA)}if(aB>.01){B.mesh(R,aB*.85);B.marks(R,aB)}
    cols(R,k,e,1);
    // 1-2. the first step at the start: SGD's direction (the raw gradient) against Adam's (one rate per coordinate)
    if(k<=1){const S=A,p=S.pt(...S.sf.start,.04),gl=Math.hypot(...g0),sg=[S.sf.start[0]-.9*g0[0]/gl,S.sf.start[1]-.9*g0[1]/gl];
      R.line([p,S.pt(sg[0],sg[1],.04)],{c:P.mute,w:2.2,head:8,top:1,a:k===0?e:1-.5*e});R.label(S.pt(sg[0],sg[1],.04),'−g: almost all across',{fs:12,b:1,c:P.mute,dy:14,al:'left',dx:6,a:k===0?e:1-.5*e});
      if(k===1){const q=S.pt(S.sf.start[0]+.5*s0[0],S.sf.start[1]+.5*s0[1],.04);R.line([p,q],{c:C.adam,w:2.6,head:8,top:1,a:e});R.label(q,'Adam: η per coordinate',{fs:12.5,b:1,c:C.adam,dy:-14,dx:6,al:'left',a:e})}}
    // 3. the per-coordinate methods where the valley's axes are the coordinates (Nesterov faint for reference)
    if(k===2){const t=150*e;A.trail(R,A.run('nes'),t,C.nes,{a:.4});OPTS.forEach(o=>{const end=A.trail(R,A.run(o),t,C[o],{flow:8});R.label(end,SURF.NAME[o],{fs:12.5,b:1,c:C[o],dy:-16,grp:'e2'})})}
    // 4. the same valley turned 45 degrees: the gradient's two coordinates are now alike, and the per-coordinate step points straight across
    if(k===3){const S=B,p=S.pt(...S.sf.start,.04),q=S.pt(S.sf.start[0]+.5*s1[0],S.sf.start[1]+.5*s1[1],.04);R.line([p,q],{c:C.adam,w:2.6,head:8,top:1,a:e});R.label(q,'Adam: straight across',{fs:12.5,b:1,c:C.adam,dx:8,al:'left',a:e})}
    // 5. the per-coordinate methods on the rotated ravine
    if(k===4){OPTS.forEach(o=>{const end=B.trail(R,B.run(o),150*e,C[o],{flow:8});R.label(end,SURF.NAME[o],{fs:12.5,b:1,c:C[o],dy:-16,grp:'e4'})})}
    // 6. Shampoo's full-matrix preconditioner turns with the valley; Nesterov is rotation-invariant too
    if(k===5){OPTS.forEach(o=>B.trail(R,B.run(o),150,C[o],{a:.25}));B.trail(R,B.run('nes'),150*e,C.nes,{a:.8});const end=B.trail(R,sh,150*e,C.shampoo,{flow:8});
      R.label(end,'Shampoo',{fs:12.5,b:1,c:C.shampoo,dy:-18,dx:10,al:'left'});
      const c0=[1,.6],L=2.2;[[u1,m1],[u2,m2]].forEach(([u,m],i)=>{const l=L*Math.max(.18,m/m1);R.line([B.pt(c0[0]-l*u[0],c0[1]-l*u[1],.05),B.pt(c0[0]+l*u[0],c0[1]+l*u[1],.05)],{c:C.shampoo,w:3,a:e,top:1})});
      R.label(B.pt(c0[0]+L*u1[0],c0[1]+L*u1[1],.05),'H^(−1/2): long along the floor',{fs:12,b:1,c:C.shampoo,dy:-12,a:e,wide:1})}
  }
  const vA={cam:[-.75,.88],bounds:[[-4.8,0,-2.25],[3.7,1.8,2.25]]},vB={cam:[-.72,.68],bounds:[[-4.8,0,-2.9],[2.9,1.8,2.9]]};
  S3.stage({id:'stg-ad',list:'sx-ad',fig:'Fig. 2 · per-coordinate steps, and a valley they cannot see',cam:vA.cam,bounds:vA.bounds,aspect:.58,dur:2400,hold:4800,draw,
    margin:w=>w<520?[16,10,16,10]:[24,20,22,20],view:k=>k>=3?vB:vA});
  writeList();
})();
