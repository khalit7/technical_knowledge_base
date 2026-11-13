// ---- Scene (Reading 7, Fig. 4): why the tails go first, from the page's categorical collapse run (window.SYC.run, the JavaScript twin of
// src/scripts/collapse_categorical.py, checked against it generation by generation; defaults 1,000 Zipf(1.1) word types, 2,000 draws a generation, seed 1).
// Word types are grouped into 19 rank bins (log-spaced); a bar's height is the share of its bin's types the model can still produce, one row per generation,
// generation 0 at the front. Replace and accumulate side by side, then the four workflows' types alive at generation 30 over 50 seeds (SY.collapse_ref). ----
(function(){
  if(!document.getElementById('stg-col')||!window.SYC||!window.SY||!SY.collapse_ref)return;const {at,lerp,mix,cl}=S3;
  const ref=SY.collapse_ref,Q=ref.params,V=Q.V,G=Q.G;
  const EDGE=[1,2,3,4,6,8,11,16,22,32,45,63,90,126,178,251,355,501,708,1001],NB=EDGE.length-1;
  const bins=p=>{const out=[];for(let b=0;b<NB;b++){let al=0;for(let r=EDGE[b];r<EDGE[b+1];r++)if(p[r-1]>0)al++;out.push(al/(EDGE[b+1]-EDGE[b]))}return out};
  const runs={};['replace','accumulate'].forEach(m=>{const r=SYC.run(m,V,Q.s,Q.n,G,Q.pi,Q.seed,true);runs[m]={b:r.ps.map(bins),alive:r.m.map(x=>x.alive)}});
  const BW=.27,ZP=.13,HMAX=.9,XR=-3.0,XA=3.0;
  const bx=(x0,b)=>x0+(b-(NB-1)/2)*BW,zg=g=>1.9-g*ZP;
  const stag=(e,i,n)=>cl(e*1.6-(i/n)*.6,0,1);
  const MED=ref.alive_at_G_50_seeds,NM={replace:'replace',accumulate:'accumulate',subsample:'accumulate-subsample',fresh:'fresh real data'};
  function surface(R,m,x0,g0,g1,a,grow){const P=R.P,B=runs[m].b,base=m==='replace'?P.c2:P.c3;
    for(let g=g0;g<=g1;g++){const t=grow==null?1:stag(grow,g-g0,g1-g0+1);if(t<=0)continue;
      B[g].forEach((v,b)=>{const p=[bx(x0,b),0,zg(g)];if(v<=0){R.quad([[p[0]-BW*.42,.002,p[2]-ZP*.42],[p[0]+BW*.42,.002,p[2]-ZP*.42],[p[0]+BW*.42,.002,p[2]+ZP*.42],[p[0]-BW*.42,.002,p[2]+ZP*.42]],{fill:P.bad,a:a*t*.75,edge:false});return}
        R.box(p,[BW*.84,Math.max(.012,v*HMAX*t),ZP*.84],{fill:mix(P.paper,base,.25+.6*v),a:a*Math.min(1,t*1.4),shadow:false,lw:.4})})}}
  function axis(R,x0,a){const P=R.P;[[0,'rank 1'],[7,'11'],[13,'90'],[18,'708 to 1,000']].forEach(([b,t])=>R.label([bx(x0,b),0,zg(0)+.12],t,{mono:true,fs:12,dy:14,c:P.mute,a,wide:b>0&&b<18}))}
  function draw(R,k,e){const P=R.P;R.grid(-6.6,6.6,-2.6,2.8,.5);
    const gone=k===4?cl(1-e*2.6,0,1):1,ra=k<=2?1:k===3?.28:.28*gone,aa=k===3?1:k===4?.28*gone:0;
    // the real distribution behind generation 0 (every type alive), then generation 0's sample of 2,000 draws
    if(k===0){const t=e,y=HMAX+.02,x0=bx(XR,0)-BW/2,x1=bx(XR,NB-1)+BW/2;R.glass([x0,y,zg(0)-ZP*.6],[x1-x0,0,0],[0,0,ZP*1.2],{c:P.mute,a:.9,nu:NB,nv:1,th:.02});
      R.label([x0,y,zg(0)],'real: all 1,000 types alive',{mono:true,fs:12.5,b:1,al:'left',dy:-16,c:P.mute});
      for(let b=1;b<NB;b+=3)R.flow([[bx(XR,b),y+.7,zg(0)],[bx(XR,b),y,zg(0)]],{c:P.c1,a:.75*Math.min(1,t*2),r:.05,speed:.6,n:3})}
    if(k<=4)surface(R,'replace',XR,0,k===0?0:k===1?10:G,ra,k===0?e:null);
    if(k===1)surface(R,'replace',XR,1,10,1,e);
    if(k===2)surface(R,'replace',XR,11,G,1,e);
    if(k<=2){axis(R,XR,1);R.label([bx(XR,0)-.2,0,zg(0)],'generation 0',{wide:1,mono:true,fs:12,al:'right',dx:-4,c:P.mute});if(k>0)R.label([bx(XR,0)-.2,0,zg(k===1?10:G)],'generation '+(k===1?10:G),{wide:1,mono:true,fs:12,al:'right',dx:-4,c:P.mute,a:cl((e-.85)/.15,0,1)})}
    // the newest generation and its count
    const lab=(m,x0,g,a)=>R.label([bx(x0,NB-1)+.2,HMAX*.75,zg(g)],(R.W<520?'':(m==='accumulate'?'gen. ':'generation ')+g+': ')+runs[m].alive[g]+' types',{mono:true,fs:12.5,b:1,al:'left',dx:6,c:m==='replace'?P.c2:P.c3,a});
    if(k===0)lab('replace',XR,0,cl(e*2-1,0,1));
    if(k===1){lab('replace',XR,0,1);lab('replace',XR,10,cl((e-.85)/.15,0,1))}
    if(k===2){lab('replace',XR,10,.5);lab('replace',XR,G,cl((e-.85)/.15,0,1))}
    if(k===1||k===2){const g=k===1?Math.min(10,Math.floor(e*10.99)):Math.min(G,11+Math.floor(e*20.99));if(g>0)[1,5,9].forEach(b=>R.flow([[bx(XR,b),HMAX+.12,zg(0)],[bx(XR,b),HMAX+.12,zg(g)]],{c:P.c2,a:.7,r:.05,speed:.8}))}
    // accumulate: the same 30 generations, with the real sample kept in every fit
    if(k>=3){surface(R,'accumulate',XA,0,G,aa,k===3?cl((e-.45)/.55,0,1):null);if(k===3){axis(R,XA,cl((e-.8)/.2,0,1));
        R.label([bx(XR,0),HMAX,zg(G)],'replace',{mono:true,fs:13,b:1,dy:-14,c:P.c2,a:.8});R.label([bx(XA,0),HMAX,zg(G)],'accumulate',{mono:true,fs:13,b:1,dy:-14,c:P.c3});
        lab('accumulate',XA,G,cl((e-.85)/.15,0,1))}}
    // the four workflows at generation 30, over 50 seeds: median as the column, the range as a glass slab
    if(k===4){const W=['replace','accumulate','subsample','fresh'],C=[P.c2,P.c3,P.c4,P.c5],H=v=>v/V*3.2,g=cl((e-.35)/.65,0,1);if(g<=0)return;
      W.forEach((m,i)=>{const x=-2.4+i*1.6,z=.6,s=MED[m],h=H(s.median)*g;R.box([x,0,z],[.7,.05,.7],{shadow:false});
        R.box([x,.05,z],[.5,Math.max(.01,h),.5],{fill:mix(P.paper,C[i],.7)});
        if(g>.6){const a=cl((g-.6)/.4,0,1);R.glass([x-.42,.05+H(s.min),z],[.84,0,0],[0,H(s.max)-H(s.min),0],{c:C[i],a:a*.8,nu:1,nv:2,th:.4})}
        const la=cl((g-.85)/.15,0,1);R.label([x,.05+H(s.max)+.1,z],R.W<520?String(s.median):s.median+' (' +s.min+' to '+s.max+')',{mono:true,fs:12.5,b:1,dy:-12,c:C[i],a:la});
        R.label([x,0,z+.4],R.W<520?['repl.','accum.','subs.','fresh'][i]:NM[m],{mono:true,fs:12,dy:14+(i%2)*15,c:P.ink,a:g})});
      R.label([-3.4,3.2*ref.expected_alive_gen0/V,.6],'expected in one real sample: '+Math.round(ref.expected_alive_gen0),{wide:1,mono:true,fs:12,al:'right',dx:-6,c:P.mute,a:g});
      R.line([[-3.35,.05+3.2*ref.expected_alive_gen0/V,.6],[2.75,.05+3.2*ref.expected_alive_gen0/V,.6]],{c:P.mute,w:1.2,dash:[5,4],a:g})}
  }
  const full={cam:[.18,.7],bounds:[[-6.2,0,-2.4],[7.4,1.1,2.6]]};
  S3.stage({id:'stg-col',list:'sx-col',fig:'Fig. 4 · word types a refit model can still produce, generation by generation',cam:full.cam,bounds:full.bounds,aspect:.6,dur:2200,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,16,18,16],
    view:k=>k===0?{cam:[.12,.55],bounds:[[-6.4,0,1.2],[1.6,1.0,2.7]]}:k===1?{cam:[.2,.68],bounds:[[-6.2,0,.3],[2.2,1.0,2.6]]}:k===2?{cam:[.24,.74],bounds:[[-6.2,0,-2.3],[2.6,1.0,2.6]]}:k===4?{cam:[.08,.36],bounds:[[-4.9,0,0],[3.2,1.7,1.3]]}:full});
})();
