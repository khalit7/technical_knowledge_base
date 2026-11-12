// ---- Scene: the hero, Fig. 1 (renderer v2): the predicted loss as a surface over parameters N and training tokens D (both log axes).
// Every number is the page's own: Table 1's models (PAPER.tables.t1), the 20 tokens per parameter of Table 3, and the fitted loss
// L = E + A/N^alpha + B/D^beta with Besiroglu et al.'s refit of Approach 3 (FITS.epoch in 13_js_read.js); valleys from FIT.frontier (Eq. 4). ----
(function(){
  if(!$('stg-hero'))return;const {at,off,lerp,mix}=S3;
  const f=FITS.epoch,lg=Math.log10,CGOP=CG;
  const NL=[9.5,12.5],DL=[10.5,13.5],SC=1.5,HS=4;                                     // floor: log10 N and log10 D; heights: (loss - E) times HS
  const X=lN=>(lN-11)*SC,Z=lD=>(lD-12)*SC,H=(N,D)=>(lossOf(f,N,D)-f.E)*HS;
  const P3=(lN,lD,y)=>[X(lN),y==null?H(10**lN,10**lD):y,Z(lD)];
  // Table 1, parsed as the old 2D hero did
  const MOD=PAPER.tables.t1.rows.map(r=>({nm:r[0].replace(/ \(.*\)/,'').replace(' 530B',''),N:parseFloat(r[1])*(/Trillion/.test(r[1])?1e12:1e9),D:parseFloat(r[2])*(/Trillion/.test(r[2])?1e12:1e9)}));
  const isG=m=>/Gopher/.test(m.nm),isC=m=>/Chinchilla/.test(m.nm);
  // the surface on a 24 by 24 grid
  const G=24,lnAt=i=>NL[0]+(NL[1]-NL[0])*i/G,ldAt=j=>DL[0]+(DL[1]-DL[0])*j/G;
  const HG=[];for(let i=0;i<=G;i++){HG.push([]);for(let j=0;j<=G;j++)HG[i].push(H(10**lnAt(i),10**ldAt(j)))}
  const HMAX=HG[0][0],LN=nrm3([-.45,1,.6]);
  function nrm3(a){const l=Math.hypot(a[0],a[1],a[2]);return [a[0]/l,a[1]/l,a[2]/l]}
  // a budget's cut: every (N, D) with 6ND = C inside the floor, as log N steps
  function cut(C,n){const s=lg(C/6),a=Math.max(NL[0],s-DL[1]),b=Math.min(NL[1],s-DL[0]),pts=[];if(b<=a)return [];
    for(let i=0;i<=n;i++){const lN=a+(b-a)*i/n;pts.push([lN,s-lN])}return pts}
  const CUTS=[1e22,1e23,1e25,1e26];
  const valley=C=>{const o=FIT.frontier(f,C);return {N:o.N,D:o.D,tpp:o.tpp,L:lossOf(f,o.N,o.D)}};
  const VG=valley(CGOP),onCut=N=>({N,D:CGOP/6/N,L:lossOf(f,N,CGOP/6/N)}),GC=onCut(280e9),CC=onCut(70e9);
  const fmtB=v=>hum(v);
  function surface(R,a){const P=R.P;if(a<=.01)return;
    for(let i=0;i<G;i++)for(let j=0;j<G;j++){const h=[HG[i][j],HG[i+1][j],HG[i+1][j+1],HG[i][j+1]],xs=[lnAt(i),lnAt(i+1),lnAt(i+1),lnAt(i)],zs=[ldAt(j),ldAt(j),ldAt(j+1),ldAt(j+1)];
      const pts=h.map((y,q)=>[X(xs[q]),y*a,Z(zs[q])]);
      // shading from the face normal, tint from the height (higher, more ochre)
      const u=[pts[1][0]-pts[0][0],pts[1][1]-pts[0][1],pts[1][2]-pts[0][2]],v=[pts[3][0]-pts[0][0],pts[3][1]-pts[0][1],pts[3][2]-pts[0][2]];
      let n=nrm3([u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]);if(n[1]<0)n=n.map(c=>-c);
      const lam=Math.max(0,n[0]*LN[0]+n[1]*LN[1]+n[2]*LN[2]),t=Math.pow((h[0]+h[2])/2/HMAX,.75),base=mix(P.paper,P.c5,.08+.6*t);
      R.quad(pts,{fill:mix([0,0,0],base,P.dark?.6+.4*lam:.8+.2*lam),fa:.94,a:Math.min(1,a*1.5),edge:false})}
    // decade lines drawn on the surface
    [10,11,12].forEach(lN=>{for(let j=0;j<G;j++)R.line([P3(lN,ldAt(j),null).map((c,q)=>q===1?c*a:c),P3(lN,ldAt(j+1),null).map((c,q)=>q===1?c*a:c)],{c:P.edge,w:.8,a:.45*a,dz:-.02})});
    [11,12,13].forEach(lD=>{for(let i=0;i<G;i++)R.line([P3(lnAt(i),lD,null).map((c,q)=>q===1?c*a:c),P3(lnAt(i+1),lD,null).map((c,q)=>q===1?c*a:c)],{c:P.edge,w:.8,a:.45*a,dz:-.02})})}
  // a curve along the floor (lift 0) or riding on the surface (lift 1)
  const ride=(pts,lift)=>pts.map(([lN,lD])=>[X(lN),.012+H(10**lN,10**lD)*lift,Z(lD)]);
  function draw(R,k,e){const P=R.P;R.grid(-3.4,3.4,-3.4,3.4,.375);
    const lift=k===0?0:k===1?e:1,sa=k===0?0:k===1?e:1;
    // floor axes: parameters along the front edge, tokens along the right edge
    const zf=Z(DL[1])+.3,xr=X(NL[1])+.3;
    R.line([[X(NL[0]),0,Z(DL[1])],[X(NL[1]),0,Z(DL[1])]],{c:P.mute,w:1,a:.6});R.line([[X(NL[1]),0,Z(DL[0])],[X(NL[1]),0,Z(DL[1])]],{c:P.mute,w:1,a:.6});
    if(k!==3&&k!==4){[[10,'10B'],[11,'100B'],[12,'1T']].forEach(([v,t])=>R.label([X(v),0,zf],t,{mono:true,fs:12,c:P.mute}));
      [[11,'100B'],[12,'1T'],[13,'10T']].forEach(([v,t])=>R.label([xr,0,Z(v)],t,{mono:true,fs:12,c:P.mute,al:'left',dx:2}));
      R.label([X(11),0,zf+.45],'parameters N',{mono:true,fs:12,c:P.ink,dy:6});
      R.label([xr+.55,0,Z(12.5)],'tokens D',{mono:true,fs:12,c:P.ink,al:'left',dx:4})}
    // the loss surface
    surface(R,sa);
    if(k===1){const hp=[X(NL[0])-.15,0,Z(DL[0])-.15];R.line([hp,[hp[0],HMAX*sa,hp[2]]],{c:P.mute,w:1,a:.7*sa});
      [2.0,2.2].forEach(Lv=>{const y=(Lv-f.E)*HS*sa;R.line([[hp[0]-.06,y,hp[2]],[hp[0]+.06,y,hp[2]]],{c:P.mute,w:1,a:sa});R.label([hp[0],y,hp[2]],'loss '+Lv.toFixed(1),{mono:true,fs:12,c:P.mute,al:'right',dx:-6,a:sa,grp:'ax'})});
      R.label([hp[0],0,hp[2]],'E = '+f.E.toFixed(2),{mono:true,fs:12,c:P.mute,al:'right',dx:-6,a:sa,grp:'ax'})}
    // 20 tokens per parameter (Table 3): on the floor, then riding on the surface
    const l20=[];for(let i=0;i<=30;i++){const lN=NL[0]+(DL[1]-1.301-NL[0])*i/30;l20.push([lN,lN+1.301])}
    const a20=k===5?.9:k>=2?.3:1;R.line(ride(l20,lift).map(q=>[q[0],q[1]+.02,q[2]]),{c:P.ink,w:2,a:a20,dash:[7,5],top:k>=1});
    if(k<2||k===5)R.label(ride([l20[k===5?27:22]],lift)[0],'20 tokens per parameter',{fs:12,c:P.ink,b:1,al:'left',dx:10,dy:k===5?6:0});
    // Table 1's models: on the floor, then on the surface at their own (N, D)
    const ma=k<=1?1:k===4?.55:.3;
    MOD.forEach(m=>{const lN=lg(m.N),lD=lg(m.D),y=.06+H(m.N,m.D)*lift,p=[X(lN),y,Z(lD)],c=isC(m)?P.c1:isG(m)?P.c2:P.ink;
      if(lift>0)R.line([[p[0],0,p[2]],p],{c,w:1,a:ma*.5});
      R.ball(p,.075,{c,a:ma,top:k>=1});
      const nm=m.nm.split(' ')[0];if(nm==='Jurassic-1'||/^Jurassic/.test(nm))return;
      const t=nm==='GPT-3'?'GPT-3, Jurassic-1':nm;
      if(k<=1)R.label(p,t,{fs:12,c,b:isC(m)||isG(m),al:isC(m)||/LaMDA/.test(nm)?'right':'left',dx:isC(m)||/LaMDA/.test(nm)?-9:9,dy:/MT-NLG/.test(nm)?10:/GPT/.test(nm)?-10:0,grp:isC(m)||isG(m)?null:'m'})});
    // Gopher's budget as a cut: floor line, a curtain up to the surface, the profile along its top
    const cg=cut(CGOP,48);
    if(k>=2){const a=k===2?e:1,ca=k===5?.35:1,top=ride(cg,1);
      R.line(ride(cg,0),{c:P.c1,w:1.6,a:a*ca,dash:[5,4]});
      for(let i=0;i<top.length-1;i++){const b0=[top[i][0],0,top[i][2]],b1=[top[i+1][0],0,top[i+1][2]];R.quad([b0,b1,top[i+1],top[i]],{fill:mix(P.paper,P.c1,.45),fa:.32*a*ca,edge:false,dz:-.05})}
      R.line(top,{c:P.c1,w:3,a:a*ca,top:1});
      if(k<5)R.label(ride([cg[6]],1)[0],'6ND = 5.76 × 10²³',{mono:true,fs:12,c:P.c1,b:1,al:'left',dx:8,dy:-12,a,wide:1});
      // dots stream down both walls of the profile into the valley
      if(k===2||k===3){const lv=lg(VG.N),i0=cg.findIndex(q=>q[0]>=lv);
        R.flow(ride(cg.slice(0,i0+1),1).map(q=>[q[0],q[1]+.04,q[2]]),{c:P.c1,a:a*.8,r:.06,speed:.9,top:1});
        R.flow(ride(cg.slice(i0).reverse(),1).map(q=>[q[0],q[1]+.04,q[2]]),{c:P.c1,a:a*.8,r:.06,speed:.9,top:1})}}
    // the valley of this cut
    if(k>=3){const a=k===3?e:1,p=P3(lg(VG.N),lg(VG.D),H(VG.N,VG.D)+.05);
      R.glow(p,.28,{c:P.c3,a:a*(k===5?.5:1),top:1});R.ball(p,.09,{c:P.c3,a,top:1});
      R.line([[p[0],0,p[2]],p],{c:P.c3,w:1.4,a:a*.7,dash:[3,3]});
      if(k===3)R.label(p,'valley: '+fmtB(VG.N)+' on '+fmtB(VG.D),{fs:12.5,c:P.c3,b:1,dy:-22,a})}
    // Gopher and Chinchilla as two points on the same cut
    if(k===4){const g=P3(lg(GC.N),lg(GC.D),H(GC.N,GC.D)+.05),c=P3(lg(CC.N),lg(CC.D),H(CC.N,CC.D)+.05);
      R.ball(g,.1,{c:P.c2,a:e,top:1});R.ball(c,.1,{c:P.c1,a:e,top:1});R.glow(c,.3,{c:P.c1,a:e,top:1});
      R.label(g,'Gopher 280B · '+GC.L.toFixed(3),{fs:12.5,c:P.c2,b:1,dy:-24,a:e});
      R.label(c,'Chinchilla 70B · '+CC.L.toFixed(3),{fs:12.5,c:P.c1,b:1,dy:-26,a:e});
      const lc=lg(CC.N),lgN=lg(GC.N),seg=cg.filter(q=>q[0]>=lc&&q[0]<=lgN).reverse();
      if(seg.length>1)R.flow(ride(seg,1).map(q=>[q[0],q[1]+.08,q[2]]),{c:P.c2,a:e,r:.07,speed:.8,top:1})}
    // every budget: its cut, its valley, and the line through the valleys
    if(k===5){const VS=[];CUTS.forEach(C=>{const c=cut(C,40);R.line(ride(c,1),{c:P.c1,w:1.8,a:e*.75,top:1});const v=valley(C);VS.push(v);
        const p=P3(lg(v.N),lg(v.D),H(v.N,v.D)+.05);R.ball(p,.075,{c:P.c3,a:e,top:1});
        const ex=lg(C);R.label(ride([c[c.length>20?4:0]],1)[0],'10'+(ex===22?'²²':ex===23?'²³':ex===25?'²⁵':'²⁶'),{mono:true,fs:12,c:P.c1,dy:-10,a:e,grp:'cuts'})});
      VS.splice(2,0,VG);const fr=[];const c0=lg(1e22),c1=lg(1e26);for(let i=0;i<=30;i++){const v=FIT.frontier(f,10**(c0+(c1-c0)*i/30));if(lg(v.N)>=NL[0]&&lg(v.D)<=DL[1])fr.push([lg(v.N),lg(v.D)])}
      R.line(ride(fr,1).map(q=>[q[0],q[1]+.05,q[2]]),{c:P.c3,w:3.2,a:e,top:1});
      R.flow(ride(fr,1).map(q=>[q[0],q[1]+.08,q[2]]),{c:P.c3,a:e,r:.065,speed:.9,top:1});
      R.label(ride([fr[2]],1)[0],'valleys: compute-optimal',{fs:12.5,c:P.c3,b:1,al:'left',dx:12,dy:-4,a:e})}
  }
  const full={cam:[.5,.72],bounds:[[-2.9,0,-2.9],[2.9,2.2,2.9]]};
  const cutV={cam:[.78,.4],bounds:[[-2.6,0,-2.6],[2.6,1.6,2.6]]};
  const lv=lg(VG.N),ld=lg(VG.D),near={cam:[.78,.36],bounds:[[X(lv-1.5),0,Z(ld-1.5)],[X(lv+1.2),1.3,Z(ld+1.2)]]};
  const nums=()=>{const set=(id,t)=>{const el=$(id);if(el)el.textContent=t};
    set('hr-vN',fmtB(VG.N));set('hr-vD',fmtB(VG.D));set('hr-vT',VG.tpp.toFixed(0));set('hr-g',GC.L.toFixed(3));set('hr-c',CC.L.toFixed(3));
    set('hr-a',(f.beta/(f.alpha+f.beta)).toFixed(3));set('hr-t',valley(1e26).tpp.toFixed(0)+' to '+valley(1e22).tpp.toFixed(0))};
  nums();
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · loss over parameters and tokens',cam:full.cam,bounds:full.bounds,aspect:.78,dur:1500,hold:5200,draw,
    view:k=>k===2?cutV:k===3||k===4?near:full,margin:w=>w<520?[14,10,14,10]:[18,16,14,60]});
})();
