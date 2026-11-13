// ---- Scene: the hero, Fig. 1 (renderer v2): the paper's learning-curve law as a surface over model size N and training compute C (both log axes).
// Every number is the page's own: Eq. 1.6 with Table 5's constants (KAPLAN in 13_js_read.js), each step at the critical batch B_crit(L) (Eq. 5.3), as
// Appendix B does and as the "Spending compute" animation does. Height is the loss; valleys are found here by scanning sizes along each budget. ----
(function(){
  if(!$('stg-hero'))return;const {at,mix}=S3;
  const lg=Math.log10,Bc=L=>K.Bs/Math.pow(L,1/K.aB),Lc=N=>Math.pow(K.Nc/N,K.aN),LS=(N,S)=>Lc(N)+Math.pow(K.Sc/S,K.aS),CofNS=(N,S)=>6*N*Bc(LS(N,S))*S/K.PFD;
  // the loss a model of N parameters reaches after C PF-days at the critical batch: solve C(N, S) = C for the step count S
  function LofNC(N,C){let a=Math.log(1e-3),b=Math.log(1e13);for(let i=0;i<56;i++){const m=(a+b)/2;if(CofNS(N,Math.exp(m))<C)a=m;else b=m}return LS(N,Math.exp((a+b)/2))}
  const NL=[6,11],CL=[-4,3],LB=1.5,LCAP=5,HS=.62;                                  // floor: log10 N and log10 C (PF-days); height: (loss - 1.5) x HS, flat above 5 nats
  const XC=lC=>(lC+.5)*.8,ZN=lN=>-(lN-8.5)*1.1,H=L=>(Math.min(L,LCAP)-LB)*HS;   // compute runs left to right, size from front (small) to back (big)
  const W=(lN,lC,y)=>[XC(lC),y,ZN(lN)];
  const hum=v=>v>=1e12?(v/1e12).toPrecision(3)+'T':v>=1e9?(v/1e9).toPrecision(v>=1e10?3:2)+'B':(v/1e6).toPrecision(v>=1e7?3:2)+'M';
  // the surface on a 24 by 24 grid
  const G=24,lnAt=i=>NL[0]+(NL[1]-NL[0])*i/G,lcAt=j=>CL[0]+(CL[1]-CL[0])*j/G;
  const HG=[];for(let i=0;i<=G;i++){HG.push([]);for(let j=0;j<=G;j++)HG[i].push(H(LofNC(10**lnAt(i),10**lcAt(j))))}
  const HMAX=H(LCAP),LN=nrm3([-.45,1,.6]);
  function nrm3(a){const l=Math.hypot(a[0],a[1],a[2]);return [a[0]/l,a[1]/l,a[2]/l]}
  // a row at fixed N (a learning curve) and a cut at fixed C (a budget), as lists of [log N, log C]
  const row=(lN,c0,c1,n)=>{const r=[];for(let i=0;i<=n;i++)r.push([lN,c0+(c1-c0)*i/n]);return r};
  const cut=(lC,n)=>{const r=[];for(let i=0;i<=n;i++)r.push([NL[0]+(NL[1]-NL[0])*i/n,lC]);return r};
  const ride=(pts,lift)=>pts.map(([lN,lC])=>W(lN,lC,.012+H(LofNC(10**lN,10**lC))*(lift==null?1:lift)));
  // the valley of a budget: the size with the lowest loss, scanned in steps of 0.005 decades
  function valley(lC){let b=null;for(let l=NL[0];l<=NL[1]+1e-9;l+=.005){const L=LofNC(10**l,10**lC);if(!b||L<b.L)b={lN:l,L}}b.N=10**b.lN;b.f=b.L/Lc(b.N)-1;return b}
  const V0=valley(0),CUTS=[-3,-2,-1,0,1,2],VS=CUTS.map(valley);
  const slope=(VS[VS.length-1].lN-VS[0].lN)/(CUTS[CUTS.length-1]-CUTS[0]);
  // the two runs of the "Spending compute" animation: the same target loss 2.50, reached by a model stopped 10% above its converged loss and by one within 2%
  const Lt=2.5,run=f=>{const Lcv=Lt/(1+f),N=K.Nc/Math.pow(Lcv,1/K.aN),S=K.Sc/Math.pow(Lt-Lcv,1/K.aS);return {N,lN:lg(N),C:6*N*Bc(Lt)*S/K.PFD}};
  const EFF=run(K.aN/K.aS),CONV=run(.02);
  // the 2.50 contour: for each size that can reach it, the compute it takes (closed form at L = 2.50)
  const contour=[];for(let l=lg(K.Nc/Math.pow(Lt*.995,1/K.aN))+.01;l<=NL[1];l+=.02){const N=10**l,S=K.Sc/Math.pow(Lt-Lc(N),1/K.aS),C=6*N*Bc(Lt)*S/K.PFD;if(lg(C)<=CL[1]&&lg(C)>=CL[0])contour.push([l,lg(C)])}
  const R7=10**7,R10=10**10;
  function surface(R,a,fa){const P=R.P;if(a<=.01)return;
    for(let i=0;i<G;i++)for(let j=0;j<G;j++){const h=[HG[i][j],HG[i+1][j],HG[i+1][j+1],HG[i][j+1]],xs=[lnAt(i),lnAt(i+1),lnAt(i+1),lnAt(i)],zs=[lcAt(j),lcAt(j),lcAt(j+1),lcAt(j+1)];
      const pts=h.map((y,q)=>W(xs[q],zs[q],y*a));
      const u=[pts[1][0]-pts[0][0],pts[1][1]-pts[0][1],pts[1][2]-pts[0][2]],v=[pts[3][0]-pts[0][0],pts[3][1]-pts[0][1],pts[3][2]-pts[0][2]];
      let n=nrm3([u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]);if(n[1]<0)n=n.map(c=>-c);
      const lam=Math.max(0,n[0]*LN[0]+n[1]*LN[1]+n[2]*LN[2]),t=Math.pow((h[0]+h[2])/2/HMAX,.75),base=mix(P.paper,P.c5,.08+.6*t);
      R.quad(pts,{fill:mix([0,0,0],base,P.dark?.6+.4*lam:.8+.2*lam),fa:.94*fa,a:Math.min(1,a*1.5)*fa,edge:false})}
    // decade lines on the surface
    [7,8,9,10].forEach(l=>R.line(ride(row(l,CL[0],CL[1],G)).map(p=>[p[0],p[1]*a,p[2]]),{c:P.edge,w:.8,a:.4*a*fa,dz:-.02}));
    [-2,0,2].forEach(l=>R.line(ride(cut(l,G)).map(p=>[p[0],p[1]*a,p[2]]),{c:P.edge,w:.8,a:.4*a*fa,dz:-.02}))}
  function draw(R,k,e){const P=R.P;R.grid(-3.3,3.3,-3.3,3.3,.4);
    const sa=k===0?e:1,fa=k===2?.75:k>=3?.55:1;
    // floor axes: compute along the front edge (the smallest size), size along the left edge (the least compute)
    const zf=ZN(NL[0])+.34,xl=XC(CL[0])-.3;
    R.line([W(NL[0],CL[0],0),W(NL[0],CL[1],0)],{c:P.mute,w:1,a:.6});R.line([W(NL[0],CL[0],0),W(NL[1],CL[0],0)],{c:P.mute,w:1,a:.6});
    if(k===0||k===3){if(k===0)[[-4,'10⁻⁴'],[-2,'10⁻²'],[0,'1'],[2,'100']].forEach(([v,t])=>R.label([XC(v),0,zf],t,{mono:true,fs:12,c:P.mute}));
      [[7,'10M'],[9,'1B'],[11,'100B']].forEach(([v,t])=>R.label([xl,0,ZN(v)],t,{mono:true,fs:12,c:P.mute,al:'right',dx:-2}));
      R.label([XC(-.5),0,zf+.45],'compute (PF-days)',{mono:true,fs:12,c:P.ink,dy:6});
      R.label([xl-.6,0,ZN(9.8)],'parameters N',{mono:true,fs:12,c:P.ink,al:'right',dx:-4,wide:1})}
    surface(R,sa,fa);
    // step 1: two learning curves, a small model that flattens and a big one that keeps falling
    if(k===0){const a=e;[[7,P.c4],[10,P.c2]].forEach(([l,c])=>{const pts=ride(row(l,CL[0],CL[1],48)).map(p=>[p[0],p[1]*sa+.03,p[2]]);
        R.line(pts,{c,w:2.6,a,top:1});R.flow(pts,{c,a:a*.9,r:.06,speed:1,top:1});
        const end=pts[pts.length-1],L=LofNC(10**l,10**CL[1]);R.label(end,(l===7?'10M':'10B')+' · '+L.toFixed(2),{fs:12.5,c,b:1,al:'left',dx:8,a})})}
    // the hero budget, 1 PF-day: a curtain from the floor to the surface, its profile, dots running down both walls into the valley
    const cg=cut(0,60),top=ride(cg);
    if(k>=1&&k<=2){const a=k===1?e:1;
      R.line(ride(cg,0),{c:P.c1,w:1.6,a,dash:[5,4]});
      for(let i=0;i<top.length-1;i++){const b0=[top[i][0],0,top[i][2]],b1=[top[i+1][0],0,top[i+1][2]];R.quad([b0,b1,top[i+1],top[i]],{fill:mix(P.paper,P.c1,.45),fa:.3*a,edge:false,dz:-.05})}
      R.line(top,{c:P.c1,w:3,a,top:1});
      if(k===1){R.label(top[4],'1 PF-day',{mono:true,fs:12,c:P.c1,b:1,al:'left',dx:8,dy:-12,a});
        const i0=cg.findIndex(q=>q[0]>=V0.lN);
        R.flow(top.slice(0,i0+1).map(q=>[q[0],q[1]+.04,q[2]]),{c:P.c1,a:a*.85,r:.06,speed:.9,top:1});
        R.flow(top.slice(i0).reverse().map(q=>[q[0],q[1]+.04,q[2]]),{c:P.c1,a:a*.85,r:.06,speed:.9,top:1})}}
    // step 3: the valley, and where that model would end if it kept training (its converged loss, Eq. 1.1 with Table 5)
    if(k>=1&&k<=2){const a=k===1?e:1,p=W(V0.lN,0,H(V0.L)+.05);
      R.glow(p,.26,{c:P.c3,a});R.ball(p,.09,{c:P.c3,a,top:1});R.line([[p[0],0,p[2]],p],{c:P.c3,w:1.3,a:a*.7,dash:[3,3]});
      if(k===1)R.label(p,'valley: '+hum(V0.N)+' · '+V0.L.toFixed(2),{fs:12.5,c:P.c3,b:1,dy:-22,a});
      if(k===2){const on=ride(row(V0.lN,0,CL[1],40)).map(q=>[q[0],q[1]+.03,q[2]]),endp=on[on.length-1];
        R.line(on,{c:P.c3,w:2.2,a:e,dash:[6,4],top:1});R.flow(on,{c:P.c3,a:e*.8,r:.055,speed:.8,top:1});
        R.ball(endp,.07,{c:P.mute,a:e,top:1});
        R.label(p,'stopped here · '+V0.L.toFixed(2),{fs:12.5,c:P.c3,b:1,al:'right',dx:-12,dy:-14,a:e});
        R.label(endp,'trained on: '+Lc(V0.N).toFixed(2),{fs:12.5,c:P.mute,b:1,al:'left',dx:10,a:e})}}
    // step 4: every budget's valley, and the line through them (the compute-efficient frontier)
    if(k===3){const vs=VS.map((v,i)=>[v.lN,CUTS[i]]);
      CUTS.forEach((lC,i)=>{const c=ride(cut(lC,40));R.line(c,{c:P.c1,w:1.5,a:e*.6,top:1});
        const v=VS[i],p=W(v.lN,lC,H(v.L)+.05);R.ball(p,.075,{c:P.c3,a:e,top:1});
        R.label(W(NL[0],lC,H(LofNC(10**NL[0],10**lC))),lC===0?'1':'10'+sup(lC),{mono:true,fs:12,c:P.c1,dy:16,a:e})});
      const fr=[];for(let lC=CUTS[0];lC<=CUTS[CUTS.length-1]+1e-9;lC+=.25)fr.push([valley(lC).lN,lC]);
      const frs=ride(fr).map(q=>[q[0],q[1]+.05,q[2]]);R.line(frs,{c:P.c3,w:3.2,a:e,top:1});R.flow(frs,{c:P.c3,a:e,r:.065,speed:.9,top:1});
      R.line(fr.map(([l,c])=>W(l,c,.01)),{c:P.c3,w:1.6,a:e*.8,dash:[6,4]});
      R.label(frs[frs.length-1],'valleys: N ∝ C^'+slope.toFixed(2),{fs:12.5,c:P.c3,b:1,al:'left',dx:12,a:e})}
    // step 5: the 2.50 contour, its two runs: the big model stopped early and the small one trained to within 2%
    if(k===4){const ct=contour.map(([l,c])=>W(l,c,H(Lt)+.04));R.line(ct,{c:P.c2,w:3.2,a:e,top:1});
      const pe=W(EFF.lN,lg(EFF.C),H(Lt)+.05),pc=W(CONV.lN,lg(CONV.C),H(Lt)+.05);
      R.glow(pe,.26,{c:P.c3,a:e});R.ball(pe,.09,{c:P.c3,a:e,top:1});R.ball(pc,.085,{c:P.c2,a:e,top:1});
      [pe,pc].forEach(p=>R.line([[p[0],0,p[2]],p],{c:P.mute,w:1,a:e*.6,dash:[3,3]}));
      const seg=contour.filter(([l])=>l>=CONV.lN-1e-6&&l<=EFF.lN+1e-6).map(([l,c])=>W(l,c,H(Lt)+.04)).reverse();if(seg.length>1)R.flow(seg,{c:P.c3,a:e,r:.065,speed:.6,top:1});
      R.label(pe,hum(EFF.N)+' stopped early · '+EFF.C.toFixed(2)+' PF-days',{fs:12.5,c:P.c3,b:1,al:'left',dx:12,dy:-10,a:e});
      R.label(pc,hum(CONV.N)+' near converged · '+CONV.C.toFixed(2)+' PF-days',{fs:12.5,c:P.c2,b:1,al:'right',dx:-12,dy:14,a:e});
      R.label(ct[Math.floor(ct.length*.85)],'loss 2.50',{mono:true,fs:12,c:P.c2,al:'left',dx:8,a:e,wide:1})}
    // a loss scale on the back left corner
    if(k===0){const hp=[XC(CL[1])+.2,0,ZN(NL[0])+.2];R.line([hp,[hp[0],H(LCAP)*sa,hp[2]]],{c:P.mute,w:1,a:.7*sa});
      [2,3,4,5].forEach(Lv=>{const y=H(Lv)*sa;R.line([[hp[0]-.06,y,hp[2]],[hp[0]+.06,y,hp[2]]],{c:P.mute,w:1,a:sa});R.label([hp[0],y,hp[2]],'loss '+Lv,{mono:true,fs:12,c:P.mute,al:'left',dx:6,a:sa,grp:'ax'})})}
  }
  const full={cam:[.62,.62],bounds:[[-3,0,-3],[3,2.2,3]]};
  const cutV={cam:[1.65,.5],bounds:[[-1.2,0,-3],[1.2,2.0,3]]};
  const near={cam:[.9,.58],bounds:[W(V0.lN+1.8,-1.2,0),W(V0.lN-1.8,3.2,1.6)]};
  const nums=()=>{const set=(id,t)=>{const el=$(id);if(el)el.textContent=t};
    set('hr-l7',LofNC(R7,10**CL[1]).toFixed(2));set('hr-l10',LofNC(R10,10**CL[1]).toFixed(2));set('hr-c7',Lc(R7).toFixed(2));set('hr-c10',Lc(R10).toFixed(2));
    set('hr-vN',hum(V0.N));set('hr-vL',V0.L.toFixed(2));set('hr-vC',Lc(V0.N).toFixed(2));set('hr-vF',(V0.f*100).toFixed(0));
    set('hr-a',slope.toFixed(2));set('hr-n1',hum(VS[0].N));set('hr-n2',hum(VS[VS.length-1].N));
    set('hr-eN',hum(EFF.N));set('hr-eC',EFF.C.toFixed(2));set('hr-cN',hum(CONV.N));set('hr-cC',CONV.C.toFixed(2));set('hr-r',(EFF.C/CONV.C).toFixed(2))};
  nums();
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · loss over model size and compute (Eq. 1.6)',cam:full.cam,bounds:full.bounds,aspect:.78,dur:1500,hold:5200,draw,
    view:k=>k===1?cutV:k===2?near:full,margin:w=>w<520?[14,10,14,10]:[18,16,14,60]});
})();
