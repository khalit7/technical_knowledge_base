// ---- Scene: Fig. 4, the tiny model's W (3 x 2) and its four subspaces (renderer v2) ----
// The input plane R^2 on the floor in front, W as a glass plate, the score space R^3 (cat, dog, sat) behind it.
// Numbers: W's columns (1, 0, 1) and (0, 1, -2), x = (2, 1), z = Wx = (2, 1, 0), left null direction (-1, 2, 1) (recompute.py: sub_*).
(function(){
  if(!document.getElementById('stg-sub'))return;const {at,off,lerp,lerp3}=S3;
  const Wm=[[1,0],[0,1],[1,-2]],x=[2,1],n=[-1,2,1],nl=Math.sqrt(6);
  const Wx=p=>[Wm[0][0]*p[0]+Wm[0][1]*p[1],Wm[1][0]*p[0]+Wm[1][1]*p[1],Wm[2][0]*p[0]+Wm[2][1]*p[1]];
  const Wt=s=>[s[0]+s[2],s[1]-2*s[2]];
  // the input plane: (a, b) on the floor in front; the score space: (cat, dog, sat) -> world (cat, sat, -dog) around O
  const TS=.8,TZ=4.4,IN=p=>[p[0]*TS,.012,TZ-p[1]*TS];
  const SS=1.0,O=[0,2.75,-2.0],OUT=s=>[O[0]+s[0]*SS,O[1]+s[2]*SS,O[2]-s[1]*SS];
  const q1=[1/Math.SQRT2,0,1/Math.SQRT2],q2=[1/Math.sqrt(3),1/Math.sqrt(3),-1/Math.sqrt(3)]; // orthonormal basis of the column space
  const wv=s=>[s[0]*SS,s[2]*SS,-s[1]*SS];
  // an illustrative cloud of score vectors for step 5, and points on the left null line
  const CL=[];for(const a of [-1,0,1])for(const b of [-1,0,1])for(const c of [-1,0,1])CL.push([a*.8,b*.8,c*.8]);
  const NL=[-1.3,-.65,.65,1.3].map(t=>n.map(v=>v*t/nl));
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-6,7,.5);
    const ina=k===0?1:k<=3?.75:1;
    // the input plane
    const H=2.5;R.quad([IN([-H,-H]),IN([H,-H]),IN([H,H]),IN([-H,H])],{fill:P.c1,fa:.07,a:ina,ea:.4});
    for(let g=-2;g<=2;g++){R.line([IN([g,-H]),IN([g,H])],{c:P.mute,w:g?.8:1.3,a:ina*.45});R.line([IN([-H,g]),IN([H,g])],{c:P.mute,w:g?.8:1.3,a:ina*.45})}
    R.line([IN([0,0]),IN([1,0])],{c:P.c1,w:2.6,head:8,a:ina});R.line([IN([0,0]),IN([0,1])],{c:P.c4,w:2.6,head:8,a:ina});
    R.line([IN([0,0]),IN(x)],{c:P.ink,w:2.6,head:8,a:k===4?.35:ina});
    R.label(IN([1,0]),'e₁',{fs:12.5,b:1,c:P.c1,dx:8,al:'left',dy:6,a:ina});R.label(IN([0,1]),'e₂',{fs:12.5,b:1,c:P.c4,dx:-8,al:'right',a:ina});
    R.label(IN(x),'x = (2, 1)',{fs:12.5,b:1,dx:8,al:'left',a:k===4?.35:ina});
    R.label(IN([0,-H]),k===4?'input ℝ²: Wᵀ lands here':'input ℝ²: row space all of it, null space {0}',{mono:true,fs:12,dy:14,c:P.mute});
    // W as a glass plate between the two spaces
    const pa=k===1?1:k===4?.25:.55;R.glass([-1.5,.25,1.55],[3,0,0],[0,1.5,0],{c:P.c5,a:pa,nu:2,nv:3});R.label([0,1.75,1.55],k===4?'Wᵀ (2 × 3)':'W (3 × 2)',{serif:true,fs:15,b:1,c:P.c5,dy:-10,a:Math.max(.5,pa)});
    // the score axes
    const ax=k===0?.3:.75;[['cat',[1,0,0]],['dog',[0,1,0]],['sat',[0,0,1]]].forEach(([nm,d])=>{R.line([OUT(d.map(v=>-2.6*v)),OUT(d.map(v=>2.6*v))],{c:P.mute,w:1,a:ax});R.label(OUT(d.map(v=>2.75*v)),nm,{mono:true,fs:12,c:P.mute,a:ax})});
    // 2. the columns: where e1 and e2 land
    const ca=k===1?e:k>=2&&k<=3?1:k===4?.3:0;
    if(ca>0){R.line([OUT([0,0,0]),OUT(Wm.map(r=>r[0]))],{c:P.c1,w:2.8,head:9,a:ca});R.line([OUT([0,0,0]),OUT(Wm.map(r=>r[1]))],{c:P.c4,w:2.8,head:9,a:ca});
      R.label(OUT([1,0,1]),'W e₁ = (1, 0, 1)',{fs:12.5,b:1,c:P.c1,dx:8,al:'left',a:ca});R.label(OUT([0,1,-2]),'W e₂ = (0, 1, −2)',{fs:12.5,b:1,c:P.c4,dx:8,al:'left',a:ca})}
    if(k===1){R.flowArc(IN([1,0]),OUT([1,0,1]),1.1,{c:P.c1,a:e,r:.07,speed:1.4});R.flowArc(IN([0,1]),OUT([0,1,-2]),1.1,{c:P.c4,a:e,r:.07,speed:1.4})}
    // 3. the image of the whole plane: the column space, and z = Wx
    const pl=k===2?e:k===3?1:k===4?.45:0;
    if(pl>0){const L=2.7,u=wv(q1).map(v=>v*2*L),v=wv(q2).map(v=>v*2*L),o0=[O[0]-u[0]/2-v[0]/2,O[1]-u[1]/2-v[1]/2,O[2]-u[2]/2-v[2]/2];
      R.glass(o0,u,v,{c:P.c3,a:pl,nu:6,nv:6});R.label([o0[0]+v[0]*.08,o0[1]+v[1]*.08,o0[2]+v[2]*.08],'column space C(W)',{mono:true,fs:12,c:P.c3,a:pl,dy:12,b:1});
      // mapped grid lines of the input plane: lines stay lines, on the plane
      for(let g=-2;g<=2;g++){if(!g)continue;R.line([OUT(Wx([g,-1.4])),OUT(Wx([g,1.4]))],{c:P.c3,w:1,a:pl*.5});R.line([OUT(Wx([-1.4,g*.7])),OUT(Wx([1.4,g*.7]))],{c:P.c3,w:1,a:pl*.5})}}
    const za=k===2?e:k===3?1:k===4?.3:0;
    if(za>0){R.line([OUT([0,0,0]),OUT(Wx(x))],{c:P.ink,w:3,head:9,a:za});R.label(OUT(Wx(x)),'z = Wx = (2, 1, 0)',{fs:12.5,b:1,dx:8,dy:10,al:'left',a:za})}
    if(k===2)R.flowArc(IN(x),OUT(Wx(x)),1.2,{c:P.ink,a:e,r:.07,speed:1.4,n:9});
    // 4. the left null space at right angles
    const na=k===3?e:k===4?1:0;
    if(na>0){R.line([OUT(n.map(v=>-2.5*v/nl)),OUT(n.map(v=>2.5*v/nl))],{c:P.c2,w:3,a:na});R.label(OUT(n.map(v=>2.6*v/nl)),'left null space (−1, 2, 1)',{fs:12.5,b:1,c:P.c2,dx:8,al:'left',a:na});
      if(k===3){const c=OUT([0,0,0]),a1=wv(n.map(v=>.35*v/nl)),b1=wv(q1.map(v=>.35*v));R.line([[c[0]+a1[0],c[1]+a1[1],c[2]+a1[2]],[c[0]+a1[0]+b1[0],c[1]+a1[1]+b1[1],c[2]+a1[2]+b1[2]],[c[0]+b1[0],c[1]+b1[1],c[2]+b1[2]]],{c:P.c2,w:1.6,a:e});
        R.label(OUT(n.map(v=>2.6*v/nl)),'so −z_cat + 2z_dog + z_sat = 0 for every output',{mono:true,fs:12,dy:18,dx:8,al:'left',c:P.c2,a:e,wide:1})}}
    // 5. W^T sends the score space back onto the input plane: the cloud collapses, the null line lands on 0
    if(k===4){CL.forEach(s=>{const t=Wt(s);R.ball(lerp3(OUT(s),IN(t),e),.07,{c:P.c6,a:.85})});
      NL.forEach(s=>{R.ball(lerp3(OUT(s),IN([0,0]),e),.09,{c:P.c2});R.flowArc(OUT(s),IN([0,0]),.9,{c:P.c2,a:.7,r:.05,n:6,speed:1.5})});
      R.label(IN([0,0]),'Wᵀ(−1, 2, 1) = (0, 0)',{fs:12.5,b:1,c:P.c2,dx:-10,dy:16,al:'right',a:e})}
  }
  const full={cam:[.5,.46],bounds:[[-3.2,0,-4.8],[3.2,5.4,6.4]]};
  S3.stage({id:'stg-sub',list:'sx-sub',fig:'Fig. 4 · the tiny model’s W, ℝ² into ℝ³',cam:full.cam,bounds:full.bounds,aspect:.8,dur:1500,hold:4600,draw,
    view:k=>k===0?{cam:[.45,.62],bounds:[[-2.2,0,2.2],[2.2,1.6,6.4]]}:k===3?{cam:[2.26,.28],bounds:[[-3,0,-5],[3,6,1]]}:full});
})();
