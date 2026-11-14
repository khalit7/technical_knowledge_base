// ---- Scene (Long-term decay, Fig. 3): why Figure 2's bound falls. At d = 128 (64 pairs, base 10,000, the head size that reproduces the plot)
// the 64 unit arrows e^(-i r theta_j) are added head to tail on the floor; a post at each partial sum S_j is |S_j| tall, and the average post
// height is the bound of Eq. 37 as plotted. Steps: r = 0, 8, 64, 256; then one Gaussian q and k (the decay chart's first draw, mulberry32(7)),
// whose weighted walk ends at the actual score (its real part) at r = 0 and 256. Exact arithmetic; only the Gaussian draw is illustrative. ----
(function(){
  if(!document.getElementById('stg-decay'))return;const {lerp,mix}=S3;
  const D=128,NP=D/2,B=1e4,TH=[...Array(NP)].map((_,j)=>Math.pow(B,-2*j/D));
  const R0=[0,8,64,256,0,256];
  // the chart's Gaussian draws (13_js_read.js gauss(): mulberry32(7), 200 pairs of q and k)
  const rg=mulberry32(7),g=()=>{let u=0;while(!u)u=rg();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rg())};
  const GD=[...Array(200)].map(()=>[[...Array(D)].map(g),[...Array(D)].map(g)]);
  const hOf=(q,k)=>[...Array(NP)].map((_,j)=>[q[2*j]*k[2*j]+q[2*j+1]*k[2*j+1],q[2*j+1]*k[2*j]-q[2*j]*k[2*j+1]]);
  const H0=hOf(GD[0][0],GD[0][1]);
  // the walk: vertices of the partial sums of w_j e^(-i r theta_j) (w = 1, or h_j)
  function walk(r,h){const pts=[[0,0]];let x=0,y=0;for(let j=0;j<NP;j++){const a=-r*TH[j],c=Math.cos(a),s=Math.sin(a),hr=h?h[j][0]:1,hi=h?h[j][1]:0;x+=hr*c-hi*s;y+=hr*s+hi*c;pts.push([x,y])}return pts}
  const bound=r=>walk(r).slice(1).reduce((t,p)=>t+Math.hypot(p[0],p[1]),0)/NP;
  const nFast=r=>TH.filter(t=>r*t>1).length;
  const score=(r,h)=>{const p=walk(r,h);return p[NP][0]};
  const meanAbs=r=>GD.reduce((t,[q,k])=>t+Math.abs(score(r,hOf(q,k))),0)/GD.length;
  window.__decay={bound,nFast,score:r=>score(r,H0),meanAbs};
  const X0=-4.15,S=.13,HS=.055,GX=0;
  const tw=(st,e,f)=>{const a=f(st.pk),b=f(st.k);return e>=1||a===b?b:lerp(a,b,e)};
  const W=(p,ox)=>[ox+S*p[0],0,-S*p[1]];
  function draw(R,k,e,st){const P=R.P;R.grid(-5,5,-2.6,2.6,.5);
    // steps 1 to 4: the unit walk and its posts; it fades out at step 5
    const ua=k<=3?1:k===4?Math.max(0,1-2*e):0;
    if(ua>.01){const r=k<=3?tw(st,e,s=>R0[s]):256,pts=walk(r),wp=pts.map(p=>W(p,X0));let tot=0;
      for(let j=0;j<NP;j++){const fast=r*TH[j]>1,col=fast?P.c2:P.c1,h=Math.hypot(...pts[j+1]);tot+=h;
        R.line([wp[j],wp[j+1]],{c:col,w:2.2,a:ua});
        R.box(wp[j+1],[.06,Math.max(.01,h*HS),.06],{fill:mix(P.paper,col,.75),a:ua,shadow:false,lw:.5,ea:.5})}
      R.flow(wp,{c:P.c5,a:ua*.85,r:.06,speed:1.6,n:Math.round(10+wp.length/4)});
      const mean=tot/NP,xs=wp.map(p=>p[0]),x0=Math.min(...xs),x1=Math.max(...xs);
      R.line([[x0,mean*HS,0],[x1,mean*HS,0]],{c:P.c5,w:2,dash:[6,4],a:ua});
      R.label([(x0+x1)/2,mean*HS,0],'average height '+mean.toFixed(2)+' = the bound',{fs:13,b:1,c:P.c5,dy:-12,a:ua});
      R.label([X0,0,0],'start',{fs:12,c:P.mute,dy:14,a:ua,wide:1});
      const mh=Math.max(...pts.slice(1).map(p=>Math.hypot(p[0],p[1])));R.label([(x0+x1)/2,mh*HS+.25,0],'distance m − n = '+Math.round(r)+' · '+nFast(r)+' of 64 pairs past 1 radian',{fs:13,b:1,dy:-8,a:ua})}
    // steps 5 and 6: one Gaussian q and k; the walk of h_j e^(-i r theta_j) ends at the score (its real part on the axis)
    const ga=k===4?Math.max(0,2*e-1):k===5?1:0;
    if(ga>.01){const r=k===4?0:tw(st,e,s=>s===5?256:0),pts=walk(r,H0),wp=pts.map(p=>W(p,GX));
      R.line([[GX-3.4,0,0],[GX+3.6,0,0]],{c:P.mute,w:1.2,a:ga*.8});R.label([GX+3.6,0,0],'real axis',{al:'left',dx:6,fs:12,c:P.mute,a:ga});
      for(let j=0;j<NP;j++){const fast=r*TH[j]>1;R.line([wp[j],wp[j+1]],{c:fast?P.c2:P.c1,w:2.2,a:ga})}
      R.flow(wp,{c:P.c5,a:ga*.85,r:.06,speed:1.8,n:22});
      const end=wp[NP],sc=pts[NP][0];R.ball(end,.09,{c:P.c5,a:ga});R.line([end,[end[0],0,0]],{c:P.c5,w:1.6,dash:[5,4],a:ga});R.ball([GX,0,0],.06,{c:P.ink,a:ga});
      R.box([end[0],0,0],[.12,.25,.12],{fill:P.c5,a:ga,shadow:false});
      R.label([end[0],.25,0],'score '+sc.toFixed(2),{fs:13.5,b:1,c:P.c5,dy:-12,a:ga});
      R.label([0,2.2,0],'one Gaussian q and k · distance '+Math.round(r),{fs:13,b:1,dy:-6,a:ga})}
  }
  const full={cam:[-.32,.5],bounds:[[-4.4,0,-1.9],[4.6,3.6,1.9]]};
  S3.stage({id:'stg-decay',list:'sx-decay',fig:'Fig. 3 · why the bound falls: 64 arrows added head to tail',cam:full.cam,bounds:full.bounds,aspect:.52,dur:2200,hold:5200,draw,
    view:k=>{const c=innerWidth<520?[-.85,.62]:full.cam;return k>=4?{cam:[-.2,.75],bounds:[[-3.2,0,-2.6],[3.4,.9,2.6]]}:k===1?{cam:c,bounds:[[-4.4,0,-1.9],[2.4,2.9,1.9]]}:k===2?{cam:c,bounds:[[-4.4,0,-1.7],[.5,2.1,1.7]]}:k===3?{cam:c,bounds:[[-4.4,0,-1.5],[-.4,1.7,1.5]]}:{cam:c,bounds:full.bounds}},
    margin:w=>w<520?[16,8,12,8]:[18,16,14,16]});
})();
