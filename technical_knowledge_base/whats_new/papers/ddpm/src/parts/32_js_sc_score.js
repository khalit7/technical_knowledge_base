// ---- Scene: Fig. 2, the noised data's density as a surface, the trained eps-network's score arrows on it, and the reverse chain climbing it (renderer v2) ----
// Surface: q(x_t) for 600 points of the toy Swiss roll (DM.roll(600, 5)), each spread by Eq. 4 into a Gaussian of variance 1 - abar_t and summed, exact for those
// points, computed at the current t on a 57 x 57 grid over [-1.6, 1.6]^2; height is that density rescaled so every t has the same peak height.
// Arrows: -eps_theta(x, t) of the trained eps (L_simple) toy network on an 11 x 11 grid, length proportional to |eps_theta| (the 2-D score field's convention), capped at |eps_theta| = 2.5.
// Dots: the same network's Algorithm 2 chain (300 points, seed 42, the job the hero and the forward/reverse animation share), placed on the surface.
(function(){
  if(!document.getElementById('stg-score')||typeof DM==='undefined'||!window.S3)return;const {at,mix,lerp}=S3;
  const D=DM.roll(600,5),n=D.length/2,G=57,LO=-1.6,HI=1.6,STEP=(HI-LO)/(G-1),SC=1.9,HM=1.7,NA=11,AL=1.45;
  const gx=i=>LO+i*STEP,WX=x=>x*SC,WZ=y=>-y*SC;
  const cache=new Map();
  // q(x_t) on the grid, separable: exp(-(dx^2+dy^2)/2v) = exp(-dx^2/2v) exp(-dy^2/2v)
  function dens(t){t=Math.max(1,Math.round(t));if(cache.has(t))return cache.get(t);const ab=DM.abar[t],a=Math.sqrt(ab),v=1-ab,ex=new Float64Array(n*G),ey=new Float64Array(n*G);
    for(let i=0;i<n;i++){const x=a*D[2*i],y=a*D[2*i+1];for(let g=0;g<G;g++){const u=gx(g);ex[i*G+g]=Math.exp(-(u-x)*(u-x)/(2*v));ey[i*G+g]=Math.exp(-(u-y)*(u-y)/(2*v))}}
    const d=new Float64Array(G*G);let mx=0;for(let r=0;r<G;r++)for(let c=0;c<G;c++){let s=0;for(let i=0;i<n;i++)s+=ex[i*G+c]*ey[i*G+r];d[r*G+c]=s;if(s>mx)mx=s}
    const o={h:d.map(s=>s/mx*HM),peak:mx/(n*2*Math.PI*v)};if(cache.size>60)cache.delete(cache.keys().next().value);cache.set(t,o);return o}
  function hAt(H,x,y){const fc=(x-LO)/STEP,fr=(y-LO)/STEP;if(fc<0||fr<0||fc>G-1||fr>G-1)return 0;const c=Math.min(G-2,Math.floor(fc)),r=Math.min(G-2,Math.floor(fr)),u=fc-c,v=fr-r;
    return (H[r*G+c]*(1-u)+H[r*G+c+1]*u)*(1-v)+(H[(r+1)*G+c]*(1-u)+H[(r+1)*G+c+1]*u)*v}
  const NET=()=>DM.net('eps_simple'),acache=new Map();
  function arrows(t){t=Math.max(1,Math.round(t));if(acache.has(t))return acache.get(t);const N=NET(),r=[0,0,0,0],o=[];
    for(let a=0;a<NA;a++)for(let b=0;b<NA;b++){const x=-AL+2*AL*a/(NA-1),y=-AL+2*AL*b/(NA-1);DM.meanEps(N,x,y,t,r);o.push([x,y,r[2],r[3]])}
    if(acache.size>200)acache.delete(acache.keys().next().value);acache.set(t,o);return o}
  let J=null,started=false,stg=null,lastD=0;
  const job=()=>J||(J=window.DFX_JOB?window.DFX_JOB('eps'):SAMP.get('eps_simple',300,42,'beta',10));
  function samples(t){const j=job(),lo=Math.floor(t/10)*10,hi=Math.min(1000,lo+10),A=j.snaps[hi],B=j.snaps[lo];if(!A)return null;if(!B||hi===lo)return A;
    const u=(hi-t)/(hi-lo),o=new Float64Array(A.length);for(let i=0;i<A.length;i++)o[i]=A[i]+(B[i]-A[i])*u;return o}
  // the step's t: 25 (data), spread to 300, then 1000; arrows at 1000; climb back to 100, then settle at 25
  const TT=[[25,25],[25,300],[300,1000],[1000,1000],[1000,100],[100,25]];
  const tAt=(k,e)=>{const [a,b]=TT[k];return Math.exp(lerp(Math.log(a),Math.log(b),e))};
  {const p0=dens(25).peak,p1=dens(1000).peak,el=document.getElementById('sc-peak');if(el)el.textContent=Math.round(p0/p1).toLocaleString('en-GB')}
  function draw(R,k,e){const P=R.P,t=tAt(k,e),Hd=dens(t).h;
    if(k>=3&&!started){started=true;SAMP.run(job(),jj=>{const now=performance.now();if(stg&&stg.st.vis&&stg.st.k>=3&&(jj.S.t<1||now-lastD>400)){lastD=now;stg.draw()}})}
    R.grid(-3.6,3.6,-3.6,3.6,.5);
    // the surface: one shaded quad per grid cell, coloured by height
    const base=P.c1,Ld=[-.45,1,.6],ln=Math.hypot(...Ld);
    for(let r=0;r<G-1;r++)for(let c=0;c<G-1;c++){const h00=Hd[r*G+c],h01=Hd[r*G+c+1],h10=Hd[(r+1)*G+c],h11=Hd[(r+1)*G+c+1],hm=(h00+h01+h10+h11)/4;
      const x0=WX(gx(c)),x1=WX(gx(c+1)),z0=WZ(gx(r)),z1=WZ(gx(r+1)),dx=((h01-h00)+(h11-h10))/2/(x1-x0),dz=((h10-h00)+(h11-h01))/2/(z1-z0);
      const nl=Math.hypot(dx,1,dz),lam=Math.max(0,(-dx*Ld[0]+Ld[1]-dz*Ld[2])/(nl*ln));
      const fill=mix(mix(P.paper,base,.12+.75*Math.min(1,hm/HM)),P.dark?[0,0,0]:[40,40,60],.32*(1-lam));
      R.quad([[x0,h00,z0],[x1,h01,z0],[x1,h11,z1],[x0,h10,z1]],{fill,fa:.96,edge:false})}
    R.label([WX(LO),HM+.15,WZ(HI)],'q(xₜ) at t = '+Math.round(t),{al:'left',mono:true,fs:13,b:1,c:P.c1});
    if(k>0&&k<5)R.label([WX(HI),0,WZ(LO)],'[−1.6, 1.6]² of the data plane',{al:'right',mono:true,fs:12,c:P.mute,dy:14,wide:1});
    // the network's score arrows, lying on the surface: -eps_theta, pointing uphill
    if(k>=3){const aa=k===3?e:1;arrows(t).forEach(([x,y,ex,ey])=>{const m=Math.hypot(ex,ey),s=.13*Math.min(m,2.5)/(m||1),x2=x-ex*s,y2=y-ey*s,h1=hAt(Hd,x,y)+.05,h2=hAt(Hd,x2,y2)+.05;
        R.line([[WX(x),h1,WZ(y)],[WX(x2),h2,WZ(y2)]],{c:P.c2,w:2,head:6,a:aa*.95})});
      R.label([WX(HI),HM+.15,WZ(HI)],'−εθ(xₜ, t): uphill',{al:'right',fs:13,b:1,c:P.c2,a:aa,wide:1})}
    // the reverse chain's 300 points riding on the surface
    if(k>=3){const X=samples(k===3?1000:t);if(X){const a=k===3?e:1;for(let i=0;i<X.length/2;i++){const x=X[2*i],y=X[2*i+1];if(Math.abs(x)>HI||Math.abs(y)>HI)continue;
        R.ball([WX(x),hAt(Hd,x,y)+.03,WZ(y)],.045,{c:P.c3,a})}}
      else R.label([0,HM*.6,0],'the network is sampling: t = '+job().S.t,{fs:12.5,c:P.mute})}
  }
  const full={cam:[.45,.62],bounds:[[-3.05,0,-3.05],[3.05,HM,3.05]]};
  stg=S3.stage({id:'stg-score',list:'sx-score',fig:'Fig. 2 · the density, its score, and sampling',cam:full.cam,bounds:full.bounds,aspect:.72,dur:2600,hold:4200,draw,
    view:k=>k===0?{cam:[.3,.95],bounds:[[-2.6,0,-2.6],[2.6,HM,2.6]]}:k===5?{cam:[.3,.95],bounds:[[-2.1,0,-2.1],[2.1,HM,2.1]]}:full,margin:w=>w<520?[14,10,14,10]:[18,16,18,16]});
})();
