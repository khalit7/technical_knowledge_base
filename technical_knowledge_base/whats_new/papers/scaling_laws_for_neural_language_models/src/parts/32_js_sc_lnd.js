// ---- Scene: Fig. 2, the overfitting law (renderer v2): L(N, D) of Eq. 1.5 with Table 2's constants as a surface over parameters N and dataset size D
// (both log axes), the 2.4% penalty line of Eq. 4.4 (PAPER.rc.overfit_thresh, as the Figure 9 card), then the paper's compute-efficient frontier
// (Table 6 at C_min = C/2, as the Then and now tab) and Chinchilla's 20 tokens per parameter on the same floor. Frontiers are drawn on the floor only:
// the surface is the loss of a model trained on a dataset of D tokens until its test loss stops falling, not the loss of a one-pass run. ----
(function(){
  if(!$('stg-lnd'))return;const {mix}=S3;
  const t=K.t2,r=t.aN/t.aD,lg=Math.log10,LND=(N,D)=>Math.pow(Math.pow(t.Nc/N,r)+t.Dc/D,t.aD),LN=N=>Math.pow(t.Nc/N,t.aN);
  const thr=PAPER.rc.overfit_thresh.v,u=Math.pow(1+thr,1/t.aD)-1,Nm=D=>t.Nc*Math.pow(u*D/t.Dc,1/r);  // the size at which a dataset of D tokens costs 2.4%
  const pen=(N,D)=>LND(N,D)/LN(N)-1;
  const NL=[6,13],DL=[8,13],LB=1,HS=.7;
  const X=lN=>(lN-9.5)*.8,Z=lD=>(lD-10.5)*1.1,H=L=>(L-LB)*HS;
  const P3=(lN,lD,y)=>[X(lN),y==null?H(LND(10**lN,10**lD)):y,Z(lD)];
  const hum=v=>v>=1e12?(v/1e12).toPrecision(3)+'T':v>=1e9?(v/1e9).toPrecision(v>=1e10?3:2)+'B':(v/1e6).toPrecision(v>=1e7?3:2)+'M';
  const PFD=K.PFD,kapN=C=>1.3e9*Math.pow(C/2/PFD,0.73),chinN=C=>Math.sqrt(C/120),CG=5.76e23;
  // the surface on a 28 by 20 grid
  const GX=28,GZ=20,lnAt=i=>NL[0]+(NL[1]-NL[0])*i/GX,ldAt=j=>DL[0]+(DL[1]-DL[0])*j/GZ;
  const HG=[];for(let i=0;i<=GX;i++){HG.push([]);for(let j=0;j<=GZ;j++)HG[i].push(H(LND(10**lnAt(i),10**ldAt(j))))}
  const HMAX=H(LND(10**NL[0],10**DL[0])),LV=nrm3([-.45,1,.6]);
  function nrm3(a){const l=Math.hypot(a[0],a[1],a[2]);return [a[0]/l,a[1]/l,a[2]/l]}
  const ride=(pts,lift)=>pts.map(([lN,lD])=>[X(lN),.012+H(LND(10**lN,10**lD))*(lift==null?1:lift),Z(lD)]);
  const rowD=(lD,n)=>{const q=[];for(let i=0;i<=n;i++)q.push([NL[0]+(NL[1]-NL[0])*i/n,lD]);return q};
  // the 2.4% line on the floor, as (log N, log D) inside the floor
  const PL=[];for(let lD=DL[0];lD<=DL[1]+1e-9;lD+=.1){const l=lg(Nm(10**lD));if(l>=NL[0]&&l<=NL[1])PL.push([l,lD])}
  // the paper's frontier, 1e17 to 1e25 FLOPs, and where it crosses the 2.4% line (bisection on log C)
  const KF=[];for(let lC=17;lC<=25+1e-9;lC+=.1){const N=kapN(10**lC);KF.push([lg(N),lg(10**lC/6/N)])}
  let a=17,b=25;for(let i=0;i<50;i++){const m=(a+b)/2,N=kapN(10**m);if(pen(N,10**m/6/N)<thr)a=m;else b=m}const XC=10**((a+b)/2),XN=kapN(XC),XD=XC/6/XN;
  const BUD=[19,21,23,25];
  const CF=[];for(let lN=NL[0];lN<=DL[1]-1.301+1e-9;lN+=.1)CF.push([lN,lN+1.301]);
  const gcut=[];for(let lN=lg(CG/6)-DL[1];lN<=NL[1]+1e-9;lN+=.05)gcut.push([lN,lg(CG/6)-lN]);
  const GK={N:kapN(CG)},GC={N:chinN(CG)};GK.D=CG/6/GK.N;GC.D=CG/6/GC.N;
  const r1=[9,P=>P.c6],r2=[12,P=>P.c3];
  function surface(R,a,fa,tint){const P=R.P;if(a<=.01)return;
    for(let i=0;i<GX;i++)for(let j=0;j<GZ;j++){const h=[HG[i][j],HG[i+1][j],HG[i+1][j+1],HG[i][j+1]],xs=[lnAt(i),lnAt(i+1),lnAt(i+1),lnAt(i)],zs=[ldAt(j),ldAt(j),ldAt(j+1),ldAt(j+1)];
      const pts=h.map((y,q)=>[X(xs[q]),y*a,Z(zs[q])]);
      const uu=[pts[1][0]-pts[0][0],pts[1][1]-pts[0][1],pts[1][2]-pts[0][2]],vv=[pts[3][0]-pts[0][0],pts[3][1]-pts[0][1],pts[3][2]-pts[0][2]];
      let n=nrm3([uu[1]*vv[2]-uu[2]*vv[1],uu[2]*vv[0]-uu[0]*vv[2],uu[0]*vv[1]-uu[1]*vv[0]]);if(n[1]<0)n=n.map(c=>-c);
      const lam=Math.max(0,n[0]*LV[0]+n[1]*LV[1]+n[2]*LV[2]),tt=Math.pow((h[0]+h[2])/2/HMAX,.75);
      let base=mix(P.paper,P.c5,.08+.6*tt);
      // cells past the 2.4% line take the overfitting tint
      if(tint>0&&pen(10**((xs[0]+xs[1])/2),10**((zs[0]+zs[2])/2))>thr)base=mix(base,P.c4,.32*tint);
      R.quad(pts,{fill:mix([0,0,0],base,P.dark?.6+.4*lam:.8+.2*lam),fa:.94*fa,a:Math.min(1,a*1.5)*fa,edge:false})}
    [8,10,12].forEach(l=>{const q=[];for(let j=0;j<=GZ;j++)q.push([l,ldAt(j)]);R.line(ride(q).map(p=>[p[0],p[1]*a,p[2]]),{c:P.edge,w:.8,a:.4*a*fa,dz:-.02})});
    [9,11].forEach(l=>R.line(ride(rowD(l,GX)).map(p=>[p[0],p[1]*a,p[2]]),{c:P.edge,w:.8,a:.4*a*fa,dz:-.02}))}
  function draw(R,k,e){const P=R.P;R.grid(-3.3,3.3,-3.3,3.3,.4);
    const sa=k===0?e:1,fa=k===3?1-.72*e:k===4?.28:1,tint=k===2?e:k>2?1:0;
    const zf=Z(DL[1])+.34,xr=X(NL[1])+.3;
    R.line([[X(NL[0]),0,Z(DL[1])],[X(NL[1]),0,Z(DL[1])]],{c:P.mute,w:1,a:.6});R.line([[X(NL[1]),0,Z(DL[0])],[X(NL[1]),0,Z(DL[1])]],{c:P.mute,w:1,a:.6});
    if(k<4){[[7,'10M'],[9,'1B'],[11,'100B'],[13,'10T']].forEach(([v,tx])=>R.label([X(v),0,zf],tx,{mono:true,fs:12,c:P.mute}));
      [[9,'1B'],[11,'100B'],[13,'10T']].forEach(([v,tx])=>R.label([xr,0,Z(v)],tx,{mono:true,fs:12,c:P.mute,al:'left',dx:2}));
      R.label([X(9.5),0,zf+.45],'parameters N',{mono:true,fs:12,c:P.ink,dy:6});
      R.label([xr+.6,0,Z(10)],'dataset D (tokens)',{mono:true,fs:12,c:P.ink,al:'left',dx:4,wide:1})}
    surface(R,sa,fa,tint);
    // step 1: the back edge, D = 1e13, is nearly the unlimited-data law
    if(k===0){const ed=ride(rowD(DL[1],48)).map(p=>[p[0],p[1]*sa+.03,p[2]]);R.line(ed,{c:P.ink,w:2,a:e,dash:[7,5],top:1});
      R.label(ed[6],'10T tokens: almost L(N)',{fs:12.5,c:P.ink,b:1,al:'left',dx:8,dy:-12,a:e});
      const hp=[X(NL[0])-.15,0,Z(DL[1])+.15];R.line([hp,[hp[0],H(4)*sa,hp[2]]],{c:P.mute,w:1,a:.7*sa});
      [1.5,2,3,4].forEach(Lv=>{const y=H(Lv)*sa;R.line([[hp[0]-.06,y,hp[2]],[hp[0]+.06,y,hp[2]]],{c:P.mute,w:1,a:sa});R.label([hp[0],y,hp[2]],'loss '+Lv,{mono:true,fs:12,c:P.mute,al:'right',dx:-6,a:sa,grp:'ax'})})}
    // step 2: two rows at a fixed dataset; dots run toward bigger models
    if(k===1){[r1,r2].forEach(([l,cf])=>{const c=cf(P),pts=ride(rowD(l,56)).map(p=>[p[0],p[1]+.03,p[2]]);
        R.line(pts,{c,w:2.6,a:e,top:1});R.flow(pts,{c,a:e*.9,r:.06,speed:1,top:1});
        R.label(pts[pts.length-1],(l===9?'1B tokens':'1T tokens')+' · '+LND(1e13,10**l).toFixed(2),{fs:12.5,c,b:1,al:'left',dx:8,a:e})})}
    // step 3: the 2.4% line of Eq. 4.4, on the floor and on the surface
    if(k>=2){const a=k===2?e:k===3?1:.8,fl=PL.map(([l,d])=>[X(l),.01,Z(d)]);
      R.line(fl,{c:P.c4,w:1.6,a:a*.8,dash:[5,4]});R.line(ride(PL).map(p=>[p[0],p[1]+.03,p[2]]),{c:P.c4,w:2.8,a:a*(k===2?1:.6),top:1});
      if(k===2){R.label(ride([PL[Math.floor(PL.length*.55)]])[0],'2.4% penalty (Eq. 4.4)',{fs:12.5,c:P.c4,b:1,al:'right',dx:-12,dy:-8,a});
        R.label(P3(12.2,8.6),'too big for its data',{fs:12.5,c:P.c4,b:1,a,dy:-14})}}
    // step 4: the paper's frontier on the floor, budgets as straight cuts, tokens per parameter falling
    if(k>=3){const a=k===3?e:1;
      BUD.forEach(lC=>{const s=lC-lg(6),pts=[];for(let lN=Math.max(NL[0],s-DL[1]);lN<=Math.min(NL[1],s-DL[0])+1e-9;lN+=.1)pts.push([X(lN),.01,Z(s-lN)]);
        R.line(pts,{c:P.mute,w:1,a:a*.55});if(k===3&&pts.length)R.label(pts[0],'10'+sup(lC),{mono:true,fs:12,c:P.mute,al:'right',dx:-6,a,grp:'bud'})});
      const kf=KF.map(([l,d])=>[X(l),.02,Z(d)]);R.line(kf,{c:P.c2,w:3.2,a,top:1});R.flow(kf,{c:P.c2,a:a*.9,r:.065,speed:1,top:1});
      BUD.forEach(lC=>{const N=kapN(10**lC);R.ball([X(lg(N)),.06,Z(lg(10**lC/6/N))],.07,{c:P.c2,a,top:1})});
      if(k===3){const p=[X(lg(XN)),.04,Z(lg(XD))];R.glow(p,.22,{c:P.c2,a});
        const n19=kapN(1e19),n25=kapN(1e25);
        R.label([X(lg(n19)),.06,Z(lg(1e19/6/n19))],(1e19/6/n19/n19).toFixed(0)+' tokens per parameter',{fs:12.5,c:P.c2,b:1,al:'right',dx:-10,dy:-8,a});
        R.label([X(lg(n25)),.06,Z(lg(1e25/6/n25))],(1e25/6/n25/n25).toFixed(2)+' at 10²⁵',{fs:12.5,c:P.c2,b:1,al:'left',dx:10,a})}}
    // step 5: Chinchilla's 20 tokens per parameter beside it, and Gopher's budget spent both ways
    if(k===4){const cf=CF.map(([l,d])=>[X(l),.02,Z(d)]);R.line(cf,{c:P.c1,w:3.2,a:e,top:1});
      R.label(cf[Math.floor(cf.length*.3)],'Chinchilla: 20 per parameter',{fs:12.5,c:P.c1,b:1,al:'right',dx:-10,dy:-6,a:e});
      R.line(gcut.map(([l,d])=>[X(l),.015,Z(d)]),{c:P.ink,w:1.6,a:e,dash:[5,4]});
      const pk=[X(lg(GK.N)),.07,Z(lg(GK.D))],pc=[X(lg(GC.N)),.07,Z(lg(GC.D))];
      R.ball(pk,.1,{c:P.c2,a:e,top:1});R.ball(pc,.1,{c:P.c1,a:e,top:1});R.glow(pc,.26,{c:P.c1,a:e});
      R.flow([pk,pc],{c:P.ink,a:e*.8,r:.06,speed:.8,top:1});
      R.label(pk,'Kaplan: '+hum(GK.N)+' on '+hum(GK.D),{fs:12.5,c:P.c2,b:1,al:'left',dx:12,dy:8,a:e});
      R.label(pc,'Chinchilla: '+hum(GC.N)+' on '+hum(GC.D),{fs:12.5,c:P.c1,b:1,al:'left',dx:12,dy:-8,a:e})}
  }
  const full={cam:[.62,.62],bounds:[[-3,0,-3],[3,2.1,3]]};
  const floor={cam:[.5,1.05],bounds:[[-3,0,-3],[3,.6,3]]};
  const nums=()=>{const set=(id,tx)=>{const el=$(id);if(el)el.textContent=tx};
    set('ln-a8',LND(1e8,1e9).toFixed(2));set('ln-a13',LND(1e13,1e9).toFixed(2));set('ln-b8',LND(1e8,1e12).toFixed(2));set('ln-b13',LND(1e13,1e12).toFixed(2));set('ln-dinf',Math.pow(t.Dc/1e9,t.aD).toFixed(2));
    set('ln-n9',hum(Nm(1e9)));set('ln-n12',hum(Nm(1e12)));
    const n19=kapN(1e19),n25=kapN(1e25);set('ln-t19',(1e19/6/n19/n19).toFixed(0));set('ln-t25',(1e25/6/n25/n25).toFixed(2));
    set('ln-xC',sci(XC,1));set('ln-xN',hum(XN));set('ln-xD',hum(XD));
    set('ln-rat',(GK.N/GC.N).toFixed(1));set('ln-rat2',(GC.D/GK.D).toFixed(1));set('ln-gkN',hum(GK.N));set('ln-gkD',hum(GK.D));set('ln-gcN',hum(GC.N));set('ln-gcD',hum(GC.D))};
  nums();
  S3.stage({id:'stg-lnd',list:'sx-lnd',fig:'Fig. 2 · loss over parameters and data (Eq. 1.5)',cam:full.cam,bounds:full.bounds,aspect:.78,dur:1500,hold:5200,draw,
    view:k=>k>=3?floor:full,margin:w=>w<520?[14,10,14,10]:[18,16,14,60]});
})();
