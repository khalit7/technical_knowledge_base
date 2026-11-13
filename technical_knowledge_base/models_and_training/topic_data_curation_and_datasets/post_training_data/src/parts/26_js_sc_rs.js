// ---- Scene (Reading 3, Fig. 1): rejection sampling and who checks the checker, from OpenR1's own verdicts on the page's sample (window.PD.check, PD.judge):
// the problems fan out to DeepSeek-R1 generations (one cube per about 50), Math-Verify's plate splits them into kept and rejected, the Llama judge's plate
// rescues part of the rejects, and the 30 rescues read by hand show what the judge let through. Counts are the recorded flags, scaled by largest remainder. ----
(function(){
  if(!document.getElementById('stg-rs')||!window.PD||!PD.check)return;const {at,lerp,mix,cl}=S3;
  const C=PD.check,J=PD.judge,f=n=>Math.round(n).toLocaleString('en-US');
  const N=C.n,KEEP=C.answer.ok.rec_mv,JN=C.llama.n,RES=C.llama.true,REJ=N-KEEP,UNJ=REJ-JN,JNO=JN-RES;
  // cubes: one per about 50 generations, each category's count by largest remainder so they add up
  const D=Math.round(N/50),raw=[KEEP,RES,JNO,UNJ].map(v=>v*D/N),cnt=raw.map(Math.floor);
  raw.map((v,i)=>[v-Math.floor(v),i]).sort((a,b)=>b[0]-a[0]).slice(0,D-cnt.reduce((a,b)=>a+b,0)).forEach(([,i])=>cnt[i]++);
  const [nK,nR,nJ,nU]=cnt;
  // a fixed shuffle so kept and rejected generations are mixed in the field, as they are in the data
  const cat=[];[[0,nK],[1,nR],[2,nJ],[3,nU]].forEach(([c,m])=>{for(let i=0;i<m;i++)cat.push(c)});
  let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;for(let i=cat.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[cat[i],cat[j]]=[cat[j],cat[i]]}
  const PT=.21,CS=.16,FC=16,FX=-3.0,FR=Math.ceil(D/FC);
  const field=i=>{const r=Math.floor(i/FC),c=i%FC;return [FX+(c-(FC-1)/2)*PT,0,(r-(FR-1)/2)*PT]};
  const slot=(i,cols,rows,cx,cz,p)=>{const per=cols*rows,l=Math.floor(i/per),j=i%per;return [cx+(j%cols-(cols-1)/2)*p,l*p,cz+(Math.floor(j/cols)-(rows-1)/2)*p]};
  const KX=1.9,KZ=1.2,RX=1.9,RZ=-1.5,PV=.2,KC=12,KR=6,RC=12,RR=4;
  // destination of every cube after Math-Verify (step 2) and after the judge (step 3)
  const mv=[],jd=[];let kk=0,rr=0,rs=0,rr2=0;
  cat.forEach((c,i)=>{if(c===0){mv[i]=slot(kk++,KC,KR,KX,KZ,PV)}else{mv[i]=slot(rr++,RC,RR,RX,RZ,PV)}});
  cat.forEach((c,i)=>{if(c===0)jd[i]=mv[i];else if(c===1)jd[i]=slot(nK+rs++,KC,KR,KX,KZ,PV);else jd[i]=slot(rr2++,RC,RR,RX,RZ,PV)});
  const MVX=-.75,JZ=-.3,KR0=KX+KC*PV/2;
  const way=(a,m,b,t,h)=>t<.5?[lerp(a[0],m[0],t*2),lerp(a[1],m[1],t*2)+Math.sin(t*Math.PI)*(h||.35),lerp(a[2],m[2],t*2)]:[lerp(m[0],b[0],t*2-1),lerp(m[1],b[1],t*2-1)+Math.sin(t*Math.PI)*(h||.35),lerp(m[2],b[2],t*2-1)];
  const stag=(e,i,n)=>cl((e*1.7-(i/n)*.7),0,1);
  // the 30 rescues read by hand (PD.judge): format categories gold, the two that look wrong red
  const RD30=[];J.forEach(([nm,v],g)=>{for(let i=0;i<v;i++)RD30.push(g)});
  const RP=.19,RG=.26,gx0=[];{let x=-1.9;J.forEach(([,v],g)=>{gx0[g]=x;x+=v*RP+RG})}
  const RDZ=2.75,SH=['letter against value','equivalent form','rounding','garbled label','judge wrong'];
  function draw(R,k,e){const P=R.P;R.grid(-6.2,5.4,-2.8,3.4,.5);
    const cField=mix(P.paper,P.c1,.22),cKeep=mix(P.paper,P.good,.6),cRej=mix(P.paper,P.mute,.28),cRes=mix(P.paper,P.c5,.75);
    const la=k===3?0:1; // step 4 is about the hand-read row: the rest recedes
    // the problems plate, and the fan-out to the generations
    const pa=k===0?1:.3;R.glass([-5.4,.05,-1.3],[0,0,2.6],[0,1.05,0],{c:P.c1,a:pa,nu:5,nv:4});
    R.label([-5.4,1.12,0],f(C.problems)+' problems',{mono:true,fs:12.5,b:1,dy:-10,c:P.c1,a:k===0?1:k===3?0:.6});
    if(k===0){[-1.05,-.35,.35,1.05].forEach(z=>R.flowArc([-5.35,.6,z],[FX-.4,.3,z*1.25],.45,{c:P.c1,a:.8*Math.min(1,e*2),r:.06,speed:1.4,n:9}))}
    // Math-Verify's plate
    const ma=k===0?0:k===1?Math.min(1,e*2):k===2?.4:.2;
    R.glass([MVX,.05,-2.0],[0,0,4.0],[0,1.15,0],{c:P.good,a:ma,nu:8,nv:4});
    if(ma>0)R.label([MVX,1.2,-2.0],'Math-Verify (Feb 2025)',{mono:true,fs:12.5,b:1,dy:-10,c:P.good,a:k===3?0:Math.max(ma,.6)});
    // the judge's plate, between the rejected pile (back) and the kept pile (front)
    const ja=k<2?0:k===2?Math.min(1,e*2):.2;
    R.glass([KX-1.35,.05,JZ],[2.7,0,0],[0,1.0,0],{c:P.c5,a:ja,nu:6,nv:4});
    if(ja>0)R.label([KX-1.35,1.0,JZ],'Llama-3.3-70B judge',{mono:true,fs:12.5,b:1,al:'right',dx:-6,c:P.c5,a:k===3?0:Math.max(ja,.6),grp:'jl'});
    // the cubes
    cat.forEach((c,i)=>{let p,fill;
      if(k===0){p=field(i);fill=cField;const t=stag(e,i,D);if(t<=0)return;R.box(p,[CS,CS*t,CS],{fill,a:t,shadow:false,lw:.5});return}
      if(k===1){const t=stag(e,i,D),fp=field(i),m=[MVX,.5,fp[2]*1.1];p=t>=1?mv[i]:way(fp,m,mv[i],t);fill=t<.5?cField:c===0?cKeep:cRej}
      else if(k===2&&c===1){const t=stag(e,i,D),m=[mv[i][0],1.05,JZ];p=t>=1?jd[i]:way(mv[i],m,jd[i],t,.5);fill=t<.5?cRej:cRes}
      else{p=jd[i];fill=c===0?cKeep:c===1?cRes:cRej}
      R.box(p,[CS,CS,CS],{fill,a:k===3?(c===1?.6:.18):1,shadow:false,lw:.5})});
    // labels per step
    if(k===0)R.label([FX,0,FR*PT/2+.1],f(N)+' R1 generations · 1 cube ≈ 50',{mono:true,fs:12.5,dy:16,c:P.ink});
    if(k>=1){R.label([KR0,.3,KZ],(k>=2?'kept '+f(KEEP+RES):'accepted '+f(KEEP)),{mono:true,fs:12.5,b:1,al:'left',dx:10,c:P.good,a:(k===1?e:1)*la});
      R.label([KR0,.2,RZ],'rejected '+f(k>=2?REJ-RES:REJ),{mono:true,fs:12.5,b:1,al:'left',dx:10,c:P.mute,a:(k===1?e:1)*la})}
    if(k===2){R.label([KX-1.35,1.0,JZ],'rescued '+f(RES)+' of '+f(JN)+' judged',{mono:true,fs:12.5,b:1,al:'right',dx:-6,dy:18,c:P.c5,a:e,grp:'jl'});
      R.flowArc([RX,.45,RZ],[KX,.7,KZ],1.0,{c:P.c5,a:.85*e,r:.06,speed:1.2,n:10});R.label([KR0,0,RZ+.2],f(UNJ)+' never judged',{mono:true,fs:12,al:'left',dx:10,dy:R.W<520?30:16,c:P.mute,a:e})}
    // step 4: the 30 rescues read by hand, close up
    if(k===3){RD30.forEach((g,i)=>{const j=RD30.slice(0,i).filter(x=>x===g).length,x=gx0[g]+j*RP,t=stag(e,i,30);
        R.box([x,0,RDZ],[.18,.18*Math.max(.05,t)+(g===4?.14:0),.18],{fill:g===4?P.bad:cRes,a:Math.max(.05,t),shadow:t>.5,lw:.6})});
      J.forEach(([nm,v],g)=>{const xm=gx0[g]+(v-1)*RP/2;R.label([xm,0,RDZ+.1],v+' '+SH[g],{mono:true,fs:12,dy:g%2?36:18,c:g===4?P.bad:P.ink,a:e,b:g===4})});
      R.flowArc([KX,.7,KZ+.4],[1.0,.3,RDZ-.15],.55,{c:P.c5,a:.75,r:.05,speed:1,n:7});
      R.label([gx0[0],.5,RDZ],'30 rescues read by hand',{mono:true,fs:12.5,b:1,al:'left',dy:-22,c:P.ink,a:e})}
  }
  const full={cam:[.16,.7],bounds:[[-5.7,0,-2.0],[4.6,1.2,2.0]]};
  S3.stage({id:'stg-rs',list:'sx-rs',fig:'Fig. 1 · OpenR1: sampled, checked, rescued',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1700,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,24,16,24],
    view:k=>k===0?{cam:[.12,.72],bounds:[[-5.7,0,-1.8],[-.6,1.2,1.9]]}:k===2?{cam:[.22,.74],bounds:[[-1.4,0,-2.1],[4.9,1.3,2.0]]}:k===3?{cam:[.06,.62],bounds:[[-2.2,0,.5],[5.1,.9,3.4]]}:full});
})();
