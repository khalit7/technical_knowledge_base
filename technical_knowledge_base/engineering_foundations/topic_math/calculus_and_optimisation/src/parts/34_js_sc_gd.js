// ---- Scene, Fig. 4 (section 4): gradient descent on the stretched bowl L = (x² + 10 y²)/2 (H = diag(1, 10), kappa = 10) from (1, 1) (renderer v2) ----
// Every path is iterated here: eta = 1/lambda_max = 0.1, the best fixed step 2/11, a step just above the limit (0.21, illustrative), and heavy-ball
// momentum with Goh's best settings (alpha 0.231, beta 0.270). A run stops when its largest coordinate is under 1e-3 (a thousandfold cut).
(function(){
  if(!document.getElementById('stg-gd')||!window.CSU)return;const C=CSU,{mix,at}=S3;
  const f=(x,y)=>.5*(x*x+10*y*y),g=p=>[p[0],10*p[1]],CAP=7;
  const done=p=>Math.max(Math.abs(p[0]),Math.abs(p[1]))<=1e-3;
  const gd=eta=>{let p=[1,1];const P=[p];for(let k=0;k<400&&!done(p);k++){const q=g(p);p=[p[0]-eta*q[0],p[1]-eta*q[1]];P.push(p);if(f(p[0],p[1])>40)break}return P};
  const ga=(2/(1+Math.sqrt(10)))**2,gb=((Math.sqrt(10)-1)/(Math.sqrt(10)+1))**2;
  const hb=(()=>{let p=[1,1],z=[0,0];const P=[p];for(let k=0;k<400&&!done(p);k++){const q=g(p);z=[gb*z[0]+q[0],gb*z[1]+q[1]];p=[p[0]-ga*z[0],p[1]-ga*z[1]];P.push(p)}return P})();
  const RUNS=[null,gd(.1),gd(2/11),gd(.21).slice(0,5),hb];
  window.CO_GD={steps:RUNS.map(r=>r?r.length-1:0),alpha:ga,beta:gb,diverge:RUNS[3]};
  const XS=.95,ZS=1.7,SH=.3,map=(x,y,v)=>[x*XS,v*SH,-y*ZS];
  const M=C.mesh(f,C.ell(0,0,Math.sqrt(2*CAP),Math.sqrt(2*CAP/10)),16,48),ISO=C.iso(M,[.5,1.5,3,5,7*.999]);
  const COL=P=>[null,P.c1,P.c3,P.bad,P.c4];
  function path(R,run,c,e,a,lab){const n=Math.max(1,Math.min(run.length,Math.ceil(e*run.length))),pts=run.slice(0,n).map(p=>{const w=map(p[0],p[1],f(p[0],p[1]));return [w[0],w[1]+.04,w[2]]});
    if(pts.length>1){R.line(pts,{c,w:2,top:1,a});R.flow(pts,{c,a,r:.055,n:Math.min(14,4+pts.length/3|0),speed:1.4,top:1})}
    pts.forEach((q,i)=>{if(i<14||i%5===0)R.ball(q,.04,{c,a,top:1})});R.ball(pts[pts.length-1],.075,{c,a,top:1});
    if(lab)R.label(pts[pts.length-1],lab,{al:'left',dx:10,dy:-8,fs:12.5,b:1,c,a:a*Math.min(1,e*1.5)})}
  function draw(R,k,e){const P=R.P,cl=COL(P);R.grid(-4,4,-2.6,2.6,.5);
    C.surf(R,M,map,{c:P.c1,a:k===0?1:.6,fa:.85,ea:.1,lo:0,hi:CAP});C.isoDraw(R,ISO,f,map,{c:P.c1,a:k===0?1:.6});
    // the two eigen-directions on the floor
    const ea=k===0?e:.55;R.line([map(-3.7,0,0),map(3.7,0,0)],{c:P.c1,w:1.6,a:ea,dash:[5,4]});R.line([map(0,-1.18,0),map(0,1.18,0)],{c:P.c2,w:1.6,a:ea,dash:[5,4]});
    R.label(map(3.75,0,0),'flat: λ = 1',{al:'left',dx:6,fs:12.5,b:1,c:P.c1,a:ea});R.label(map(0,1.18,0),'steep: λ = 10',{al:'center',dy:-12,fs:12.5,b:1,c:P.c2,a:ea});
    const S=map(1,1,f(1,1));R.ball([S[0],S[1]+.04,S[2]],.08,{c:P.ink,top:1});if(k===0)R.label(S,'start (1, 1)',{al:'left',dx:10,fs:12.5,b:1,a:e});
    R.glow(map(0,0,0),.3,{c:P.good,a:.7,top:1});
    for(let j=1;j<=4;j++){if(j>k)break;const a=j===k?1:.18,r=RUNS[j],lab=j!==k?null:j===3?'climbing out':(r.length-1)+' steps';path(R,r,cl[j],j===k?e:1,a,lab)}
  }
  S3.stage({id:'stg-gd',list:'sx-gd',fig:'Fig. 4 · gradient descent on a stretched bowl',cam:[.22,.92],bounds:[[-3.8,0,-2.1],[3.8,2.2,2.1]],aspect:.62,dur:2600,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[20,16,16,16],
    view:k=>k===3?{cam:[.3,.62],bounds:[[-3.8,0,-3],[3.8,3.6,3]]}:null});
})();
