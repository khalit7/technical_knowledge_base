// ---- Scene (5 SVMs, Fig. 3): the SVM's score as a height over the plane, as C grows, with a linear and an RBF kernel (renderer v2) ----
// Two interleaved moons (scikit-learn make_moons(200, noise = 0.25, random_state = 0), standardised; 140 training points). Each fit is this
// page's own SMO solver (MR.fit, 33_js_models.js; decision values within 0.013 of libsvm). The surface is the decision value f(x) over the plane,
// capped at plus and minus 2.5 for display; it crosses the floor along the decision line (f = 0); the glass plates are f = +1 and f = -1, so the
// margin is where the surface runs between them. Support vectors (alpha > 0) are lit; every other point is faded.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-sv')||!window.S3||!window.MR||!window.CD)return;const {lerp,mix,at}=S3;
  const d=CD.lab.moons,CS=[0.01,0.1,1,100],X0=-2.45,X1=2.45,Y0=-2.55,Y1=2.35,HS=.62,CAP=2.5,NG=40;
  let kern='svml';const cache={};
  const wx=v=>v,wz=v=>-(v-(Y0+Y1)/2);
  function fit(kk,i){const key=kk+i;if(cache[key])return cache[key];const o=MR.fit(d,kk,{C:CS[i],g:null}),G=[];
    for(let a=0;a<=NG;a++){const r=[];for(let b=0;b<=NG;b++)r.push(o.dec([X0+(X1-X0)*a/NG,Y0+(Y1-Y0)*b/NG]));G.push(r)}
    const sv=new Set(o.svm.sv),F=d.Xtr.map(x=>o.dec(x));
    return cache[key]={o,G,sv,F,nsv:o.svm.sv.length,margin:o.svm.w?2/Math.hypot(o.svm.w[0],o.svm.w[1]):null}}
  const pct=v=>(100*v).toFixed(1)+'%';
  function writeList(){const set=(k,v)=>document.querySelectorAll('[data-sv="'+k+'"]').forEach(e=>e.textContent=v);
    ['svml','svmr'].forEach((kk,m)=>CS.forEach((_,i)=>{const f=fit(kk,i),p=(m?'r':'l')+i;set(p+'n',String(f.nsv));set(p+'tr',pct(f.o.train));set(p+'te',pct(f.o.test));if(f.margin)set(p+'m',f.margin.toFixed(2))}));
    set('gam',MR.gscale(d.Xtr).toFixed(3))}
  writeList();
  const hgt=v=>HS*Math.max(-CAP,Math.min(CAP,v));
  // marching squares on the grid: segments where the decision value equals lev
  function contour(G,lev){const out=[],P=(a,b)=>[X0+(X1-X0)*a/NG,Y0+(Y1-Y0)*b/NG];
    for(let a=0;a<NG;a++)for(let b=0;b<NG;b++){const v=[G[a][b]-lev,G[a+1][b]-lev,G[a+1][b+1]-lev,G[a][b+1]-lev],p=[P(a,b),P(a+1,b),P(a+1,b+1),P(a,b+1)],e=[];
      for(let k=0;k<4;k++){const i=k,j=(k+1)%4;if((v[i]>0)!==(v[j]>0)){const t=v[i]/(v[i]-v[j]);e.push([p[i][0]+(p[j][0]-p[i][0])*t,p[i][1]+(p[j][1]-p[i][1])*t])}}
      if(e.length>=2)out.push([e[0],e[1]]);if(e.length===4)out.push([e[2],e[3]])}return out}
  function draw(R,k,e,st){const P=R.P,cur=fit(kern,k),prv=fit(kern,st&&st.pk!=null?st.pk:k),t=e,rise=st&&st.pk===k&&e<1;R.grid(-3,3,-3,3,.5);
    R.quad([[wx(X0),0,wz(Y0)],[wx(X1),0,wz(Y0)],[wx(X1),0,wz(Y1)],[wx(X0),0,wz(Y1)]],{fill:mix(P.paper,P.mute,.1),fa:.55,ea:.5,lw:1,dz:100});
    const G=(a,b)=>rise?cur.G[a][b]*t:lerp(prv.G[a][b],cur.G[a][b],t),pos=(x,y,v)=>[wx(x),hgt(v),wz(y)];
    // the score surface, tinted by sign: blue where the model says class 1, orange where it says class 0
    const st2=2;for(let a=0;a<NG;a+=st2)for(let b=0;b<NG;b+=st2){const xs=[X0+(X1-X0)*a/NG,X0+(X1-X0)*(a+st2)/NG],ys=[Y0+(Y1-Y0)*b/NG,Y0+(Y1-Y0)*(b+st2)/NG];
      const v=[G(a,b),G(a+st2,b),G(a+st2,b+st2),G(a,b+st2)],m=(v[0]+v[1]+v[2]+v[3])/4,c=m>=0?P.c1:P.c2;
      R.quad([pos(xs[0],ys[0],v[0]),pos(xs[1],ys[0],v[1]),pos(xs[1],ys[1],v[2]),pos(xs[0],ys[1],v[3])],{fill:mix(P.paper,c,.18+.34*Math.min(1,Math.abs(m)/CAP)),fa:.5,ea:.1,lw:.5})}
    // the margin plates at f = +1 and f = -1, and where the surface meets them (dashed) and meets the floor (the decision line)
    [[1,P.c1],[-1,P.c2]].forEach(([lv,c])=>R.glass([wx(X0),hgt(lv),wz(Y0)],[X1-X0,0,0],[0,0,-(Y1-Y0)],{c,a:.15,nu:4,nv:4,th:.01}));
    const seg=(lev,o)=>contour(cur.G,lev).forEach(([p,q])=>R.line([pos(p[0],p[1],lev),pos(q[0],q[1],lev)],o));
    seg(0,{c:P.ink,w:2.6,a:t,top:1});seg(1,{c:mix(P.ink,P.c1,.5),w:1.5,a:.8*t,dash:[5,4],top:1});seg(-1,{c:mix(P.ink,P.c2,.5),w:1.5,a:.8*t,dash:[5,4],top:1});
    // the training points ride on the surface at their own score; support vectors lit, the rest faded
    d.Xtr.forEach((x,i)=>{const v=rise?cur.F[i]*t:lerp(prv.F[i],cur.F[i],t),p=pos(x[0],x[1],v),c=d.ytr[i]?P.c1:P.c2,isv=cur.sv.has(i);
      if(isv)R.glow(p,.16,{c,a:.7});R.ball(p,isv?.065:.05,{c,a:isv?1:.35,top:1})});
    if(R.W>=520){R.label([wx(X1),hgt(1),wz(Y0)],'f = +1',{mono:true,fs:12,c:mix(P.ink,P.c1,.6),al:'right',dx:-8,grp:'pl'});
      R.label([wx(X1),hgt(-1),wz(Y0)],'f = −1',{mono:true,fs:12,c:mix(P.ink,P.c2,.6),al:'right',dx:-8,grp:'pl'})}
    R.label([wx(X0),hgt(CAP),wz(Y1)],'C = '+CS[k]+(kern==='svml'?' · linear':' · RBF'),{mono:true,fs:13,b:1,c:P.ink,dy:-14});
  }
  // the linear mode is seen along its decision line, so the slope (and with it the margin) shows in profile; the RBF mode from above the moons
  const B=[[-2.5,-1.5,-2.5],[2.5,1.5,2.5]];
  const st=S3.stage({id:'stg-sv',list:'sx-svl',fig:'Fig. 3 · the score as a height: margin, C and the kernel',cam:[-.45,.5],bounds:B,view:()=>({cam:kern==='svml'?[-.45,.5]:[.45,.58],bounds:B}),aspect:.56,dur:1500,hold:4800,draw,
    margin:w=>w<520?[26,10,14,10]:[30,18,18,70]});
  const seg=$('svM');if(seg)seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.dataset.k===kern)return;kern=b.dataset.k;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    $('sx-svl').hidden=kern!=='svml';$('sx-svr').hidden=kern!=='svmr';st.list(kern==='svml'?'sx-svl':'sx-svr')});
})();
