// ---- Scene (feature scaling, Fig. 3): the loss of a two-weight least-squares fit as a surface, raw against min-max against standardised (renderer v2) ----
// Computed here from NID.wine.pts (the 124 training wines of section 1): fit hue = w · proline + b by gradient descent on the mean squared error,
// L(w, b) = ½ mean((w x + b − hue)²), with x the proline in raw units, min-max scaled or standardised (scaler fitted on the training wines).
// Both axes are drawn to the same scale (one unit of w as long as one unit of b), the honest picture for gradient descent, which steps in
// (w, b) as they are. Learning rate 1.2 / λmax (60% of the largest stable step 2 / λmax), 30 steps from w = b = 0.
// The step list's numbers are written into static spans (data-bw) from the same computation; check_stages.mjs compares and recomputes.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-bw')||!window.S3||!window.NID)return;const {at,off,lerp,mix}=S3;
  const tr=NID.wine.pts.filter(p=>p[3]===1),n=tr.length,hue=tr.map(p=>p[1]),pr=tr.map(p=>p[0]);
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,mu=mean(pr),sd=Math.sqrt(mean(pr.map(v=>(v-mu)*(v-mu)))),mn=Math.min(...pr),mx=Math.max(...pr);
  const XS={raw:pr,mm:pr.map(v=>(v-mn)/(mx-mn)),std:pr.map(v=>(v-mu)/sd)},NS=30;
  function fit(m){const x=XS[m],a=mean(x.map(v=>v*v)),c=mean(x),xh=mean(x.map((v,i)=>v*hue[i])),hm=mean(hue),hh=mean(hue.map(v=>v*v));
    // the Hessian [[a, c], [c, 1]]: its eigenvalues and the bottom of the bowl
    const tm=(a+1)/2,dd=Math.sqrt((a-1)*(a-1)/4+c*c),lmax=tm+dd,lmin=tm-dd,det=a-c*c,ws=(xh-c*hm)/det,bs=(hm*a-c*xh)/det;
    const loss=(w,b)=>.5*(w*w*a+b*b+hh+2*w*b*c-2*w*xh-2*b*hm);
    const lr=1.2/lmax,path=[[0,0]];let w=0,b=0;
    for(let t=0;t<NS;t++){const gw=w*a+b*c-xh,gb=w*c+b-hm;w-=lr*gw;b-=lr*gb;path.push([w,b])}
    return {a,c,lmax,lmin,kappa:lmax/lmin,ws,bs,loss,path,lr,L0:loss(0,0),Lmin:loss(ws,bs),Ln:loss(w,b)}}
  const F={raw:fit('raw'),mm:fit('mm'),std:fit('std')};window.NI_BOWL=F;
  const sup=e=>String(e).replace('-','⁻').split('').map(c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)]||c).join('');
  const fk=v=>v<1e-3?v.toExponential(1).replace(/e\+?(-?)(\d+)/,(m,s,d)=>' × 10'+sup(s+d)):v<1000?(v<10?v.toFixed(1):Math.round(v).toLocaleString('en-GB')):v.toExponential(1).replace(/e\+?(-?)(\d+)/,(m,s,d)=>' × 10'+sup(s+d));
  // static spans: data-bw="raw.kappa" etc.
  const FMT={kappa:f=>fk(f.kappa),L0:f=>f.L0.toFixed(3),Lmin:f=>f.Lmin.toFixed(3),Ln:f=>f.Ln.toFixed(3),bn:f=>Math.abs(f.path[NS][1])<1e-3?fk(f.path[NS][1]).replace(/^(\d)\.(\d) × /,'$1.$2 × '):f.path[NS][1].toFixed(3),bs:f=>f.bs.toFixed(2),
    gap:f=>Math.round(100*(f.Ln-f.Lmin)/(f.L0-f.Lmin))+'%'};
  document.querySelectorAll('[data-bw]').forEach(e=>{const [m,k]=e.dataset.bw.split('.');if(F[m]&&FMT[k])e.textContent=FMT[k](F[m])});
  // display: the start (0, 0) and the bottom both inside a square of half-side HS in (w, b), mapped to a 5 x 5 floor
  const RW=2.5,HT=1.7,MODE=['raw','raw','mm','std'];
  function geo(m){const f=F[m],wc=f.ws/2,bc=f.bs/2,hs=Math.max(Math.abs(f.ws),Math.abs(f.bs))/2+.16,Lc=f.L0*1.25;
    const U=w=>(w-wc)/hs*RW,V=b=>-(b-bc)/hs*RW,Y=(w,b)=>HT*Math.min(1,Math.max(0,(f.loss(w,b)-f.Lmin)/(Lc-f.Lmin)));
    return {f,wc,bc,hs,U,V,Y,p:(w,b,dy)=>[U(w),Y(w,b)+(dy||0),V(b)]}}
  const G={raw:geo('raw'),mm:geo('mm'),std:geo('std')};
  function surface(R,g,a,P,col){if(a<=.01)return;const N=22,{wc,bc,hs}=g,w0=wc-hs,b0=bc-hs,st=2*hs/N;
    if(g===G.raw){
      // raw units: away from the ravine the loss is far above the start's, so the surface is a plateau; the ravine itself is about
      // one pixel wide at this scale, drawn as the line of its floor
      const yP=HT,c=[[w0,b0],[w0+2*hs,b0],[w0+2*hs,b0+2*hs],[w0,b0+2*hs]];
      R.quad(c.map(q=>[g.U(q[0]),yP,g.V(q[1])]),{fill:mix(P.paper,col,.2),a,ea:.25,lw:.8});
      for(let i=1;i<N;i++){R.line([[g.U(w0+i*st),yP,g.V(b0)],[g.U(w0+i*st),yP,g.V(b0+2*hs)]],{c:mix(P.paper,col,.45),w:.6,a:a*.6});R.line([[g.U(w0),yP,g.V(b0+i*st)],[g.U(w0+2*hs),yP,g.V(b0+i*st)]],{c:mix(P.paper,col,.45),w:.6,a:a*.6})}
      const f=g.f,xh=mean(XS.raw.map((v,i)=>v*hue[i])),pts=[];for(let t=0;t<=20;t++){const b=b0+t*2*hs/20,w=(xh-b*f.c)/f.a;pts.push([g.U(w),yP+.005,g.V(b)])}
      R.line(pts,{c:col,w:3,a,top:1});R.label(pts[3],'the ravine, at true width',{fs:12.5,c:col,b:1,al:'left',dx:10,a,wide:1});return}
    for(let i=0;i<N;i++)for(let j=0;j<N;j++){const w=w0+i*st,b=b0+j*st,c=[[w,b],[w+st,b],[w+st,b+st],[w,b+st]],y=c.map(q=>g.Y(q[0],q[1])),h=(y[0]+y[1]+y[2]+y[3])/4/HT;
      R.quad(c.map((q,t)=>[g.U(q[0]),y[t],g.V(q[1])]),{fill:mix(P.paper,col,.12+.55*(1-h)),a,ea:.12,lw:.6})}}
  function pathDraw(R,g,a,P,col,t){const f=g.f,m=Math.max(1,Math.round(t*NS)),raw=g===G.raw,pts=f.path.slice(0,m+1).map(q=>raw?[g.U(q[0]),HT+.01,g.V(q[1])]:g.p(q[0],q[1],.04));
    R.line(pts,{c:col,w:2,a,top:1});pts.forEach((q,i)=>R.ball(q,i===m?.09:.045,{c:col,a,top:1}));
    if(pts.length>1)R.flow(pts,{c:col,a:a*.7,r:.05,speed:1.4,n:Math.max(3,Math.round(pts.length/3)),top:1})}
  function draw(R,k,e){const P=R.P,m=MODE[k],g=G[m],f=g.f,col=m==='std'?P.c6:m==='mm'?P.c1:P.c2;R.grid(-3,3,-3,3,.5);
    const fade=k>=2?Math.min(1,e/.25):1,pm=MODE[k-1];
    if(k>=2&&fade<1){const gp=G[pm];surface(R,gp,1-fade,P,pm==='mm'?P.c1:P.c2)}
    surface(R,g,fade,P,col);
    const raw=m==='raw',s=raw?[g.U(0),HT+.01,g.V(0)]:g.p(0,0,.05),bt=raw?[g.U(f.ws),HT+.01,g.V(f.bs)]:g.p(f.ws,f.bs,.05);
    R.ball(s,.1,{c:P.mute,a:fade,top:1});R.label(s,'start · w = b = 0',{mono:true,fs:12,dy:18,c:P.mute,a:fade});
    R.glow(bt,.22,{c:P.c5,a:fade,top:1});R.ball(bt,.08,{c:P.c5,a:fade,top:1});R.label(bt,'bottom · loss '+f.Lmin.toFixed(3),{mono:true,fs:12,al:'left',dx:14,dy:4,c:P.c5,b:1,a:fade});
    R.label([0,HT+.3,-RW],(raw?'raw units':m==='mm'?'min-max scaled':'standardised')+' · κ = '+fk(f.kappa),{fs:13.5,b:1,c:col,a:fade,dy:-12});
    R.label([RW*.55,0,RW+.1],'w · weight on proline',{mono:true,fs:12,c:P.mute,dy:14,a:fade});R.label([-RW-.1,0,-RW*.45],'b · intercept',{mono:true,fs:12,c:P.mute,al:'right',dx:-6,a:fade});
    if(k>=1){const t=k===1?e:Math.max(0,(e-.25)/.75);if(t>0){pathDraw(R,g,fade,P,P.ink,t);
      const j=Math.max(1,Math.round(t*NS)),q=f.path[j];R.label([0,HT+.3,-RW],'step '+j+' of 30 · loss '+f.loss(q[0],q[1]).toFixed(3),{mono:true,fs:12.5,b:1,dy:8,c:P.ink,a:fade})}}
  }
  S3.stage({id:'stg-bw',list:'sx-bw',fig:'Fig. 3 · one loss, three units, 30 steps of gradient descent',cam:[.55,.62],bounds:[[-2.8,0,-2.8],[2.8,HT+.3,2.8]],aspect:.62,dur:3000,hold:4800,draw,
    margin:w=>w<520?[16,10,12,10]:[24,24,16,24]});
})();
