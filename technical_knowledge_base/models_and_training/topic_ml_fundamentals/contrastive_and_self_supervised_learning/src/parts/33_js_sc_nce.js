// ---- Scene (InfoNCE, Fig. 2): one anchor's 48 candidates through the loss, three rows in depth (renderer v2) ----
// Anchor 31 of the real 48-pair batch ("A woman is dancing in the rain."), its real cosines (CSD.rb.M), the softmax over them at a
// temperature, and where the gradient goes, all computed here with CSI (30_js_batch.js, checked against PyTorch by recompute.py).
// Back row: cosine s_ij; middle row: softmax p_ij; front row: the gradient on each cosine as a share (the positive's pull up is 1,
// the negatives' pushes down add up to 1). Columns are ordered by BERT's cosine, highest in the middle, and keep their places in every step.
// The step list's numbers are static spans (data-nc) written here from the same data; check_stages.mjs compares them.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-nce')||!window.S3||!window.CSD||!window.CSI)return;const {at,off,lerp,mix}=S3;
  const D=CSD.rb,N0=D.s1.length,A=30,FN=41;
  const cosv=m=>[...Array(N0).keys()].map(j=>CSI.cos(D.M[m],N0,A,j));
  const prob=(m,t)=>CSI.rowSoft(D.M[m],N0,N0,t,A).p;
  const share=p=>{const s=1-p[A];return p.map((v,j)=>j===A?1:v/s)};
  const CB=cosv('bert'),CS=cosv('simcse');
  // organ-pipe order: the most similar candidates in the middle, falling away to both sides
  const ORD=[...Array(N0).keys()].sort((a,b)=>CB[b]-CB[a]),POS={};ORD.forEach((j,r)=>{POS[j]=(N0/2)+(r%2?-(r+1)/2:r/2)});
  // the four states the steps move between: [cosines, softmax, push shares]
  const ST={b05:[CB,prob('bert',.05)],b1:[CB,prob('bert',1)],s05:[CS,prob('simcse',.05)]};for(const k in ST)ST[k].push(share(ST[k][1]));
  const pc=v=>(100*v).toFixed(v<.1?1:0)+'%';
  const F={bmin:Math.min(...CB).toFixed(2),bmax:Math.max(...CB).toFixed(2),bpos:CB[A].toFixed(2),bfn:CB[FN].toFixed(2),
    pp05:pc(ST.b05[1][A]),pf05:pc(ST.b05[1][FN]),L05:(-Math.log(ST.b05[1][A])).toFixed(2),sh05:pc(ST.b05[2][FN]),pull05:((1-ST.b05[1][A])/.05).toFixed(1),
    pp1:pc(ST.b1[1][A]),sh1:pc(ST.b1[2][FN]),even:pc(1/47),pull1:((1-ST.b1[1][A])/1).toFixed(2),
    spos:CS[A].toFixed(2),sfn:CS[FN].toFixed(2),spp:pc(ST.s05[1][A]),spf:pc(ST.s05[1][FN]),ssh:pc(ST.s05[2][FN])};
  document.querySelectorAll('[data-nc]').forEach(e=>{e.textContent=F[e.dataset.nc]!=null?F[e.dataset.nc]:'?'});
  const XS=.2,x=j=>(POS[j]-(N0-1)/2)*XS,ZC=-3,ZP=0,ZG=3,HC=2.9,HP=3.4,HG=1.2,YG=1.3;
  function state(k,e){const lerpA=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t)),mixS=(s0,s1,t)=>s0.map((v,i)=>lerpA(v,s1[i],t));
    if(k<=2)return ST.b05;if(k===3)return mixS(ST.b05,ST.b1,e);return mixS(ST.b1,ST.s05,e)}
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-5.6,5.6,-3.8,3.6,.5);
    const [c,p,g]=state(k,e),posC=P.acc,negC=mix(P.paper,P.c2,.55),fnC=P.c2;
    const aC=k===0?1:k===1?lerp(1,.35,e):.35,aP=k===1?e:k>=2?(k===2?lerp(1,.45,e):1):0,aG=at(k,e,2);
    const colr=j=>j===A?posC:j===FN?fnC:negC;
    for(let j=0;j<N0;j++){const xx=x(j),hl=j===A||j===FN;
      R.box([xx,0,ZC],[XS*.72,Math.max(.015,c[j]*HC),.7],{fill:colr(j),a:hl?Math.max(aC,.8):aC,shadow:false,lw:.5});
      if(aP>0)R.box([xx,0,ZP],[XS*.72,Math.max(.012,p[j]*HP),.7],{fill:colr(j),a:hl?Math.max(aP,.85*aP+.15):aP,shadow:false,lw:.5})}
    // the gradient row: a white plinth, the positive's pull standing on it, the negatives' pushes hanging below
    if(aG>0){R.box([0,YG-.04,ZG],[N0*XS+.2,.04,.36],{a:aG,shadow:false});[-1,1].forEach(sx=>R.box([sx*(N0*XS/2),0,ZG],[.03,YG-.05,.03],{a:aG*.8}));
      for(let j=0;j<N0;j++){const v=g[j],hgt=Math.max(.012,v*HG);if(j===A)R.box([x(j),YG,ZG],[XS*.72,hgt,.22],{fill:posC,a:aG,shadow:false,lw:.5});
        else R.box([x(j),YG-.04-hgt,ZG],[XS*.72,hgt,.22],{fill:colr(j),a:aG,shadow:false,lw:.5})}}
    // flows: the cosines into the softmax (step 2), the softmax into the gradient (step 3 on); as dense as the probability at each candidate
    const fl=(z0,z1,y0,y1,a)=>{if(a<=0)return;for(let j=0;j<N0;j++){if(p[j]<.008)continue;R.flowArc([x(j),y0(j),z0],[x(j),y1(j),z1],.25,{c:colr(j),a:a*(.35+.65*Math.min(1,p[j]*3)),r:.05+.05*Math.min(1,p[j]*2),n:Math.max(2,Math.round(2+p[j]*10)),speed:1})}};
    if(k===1)fl(ZC,ZP,j=>c[j]*HC+.05,j=>p[j]*HP+.05,e);
    if(k>=2)fl(ZP,ZG,j=>p[j]*HP+.05,()=>YG+.05,k===2?e:.8);
    // labels: the rows, the positive and the false negative
    const L=-(N0*XS)/2-.15;
    R.label([L,.2,ZC],'cosine s · '+(k>=4?'after SimCSE':'BERT'),{mono:true,fs:12,al:'right',dx:-6,c:P.mute,grp:'row',a:Math.max(.6,aC)});
    if(aP>0)R.label([L,.2,ZP],'softmax p · τ = '+(k===3?lerp(.05,1,e).toFixed(2):'0.05'),{mono:true,fs:12,al:'right',dx:-6,c:P.mute,grp:'row',a:aP});
    if(aG>0)R.label([L,YG,ZG],'gradient · pull up, pushes down',{mono:true,fs:12,al:'right',dx:-6,c:P.mute,grp:'row',a:aG});
    const zl=k===0?ZC:k===1?ZP:ZG,top=j=>k===0?c[j]*HC:k===1?p[j]*HP:j===A?YG+g[j]*HG*.5:YG;
    const pl=k===0?'positive · '+c[A].toFixed(2):k===1?'positive · '+pc(p[A]):'positive · pull';
    R.label([x(A),top(A),zl],pl,{fs:12.5,b:1,dy:k>=2?0:-12,dx:narrow?0:-14,al:narrow?'center':'right',c:posC});
    const fl2=k===0?'42 · "man and woman dancing in rain" · '+c[FN].toFixed(2):k===1?'42 · '+pc(p[FN]):'42 · '+pc(g[FN])+' of the push';
    R.label([x(FN),k>=2?YG-.04-g[FN]*HG:top(FN),zl],fl2,{fs:12.5,b:1,dy:k>=2?14:-12,dx:14,al:'left',c:fnC});
  }
  const full={cam:[.08,.74],bounds:[[-5.1,-.2,-3.4],[5.1,2.9,3.2]]};
  S3.stage({id:'stg-nce',list:'sx-nce',fig:'Fig. 2 · one anchor, 48 real candidates',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1600,hold:4600,draw,
    margin:w=>w<520?[22,8,12,8]:[26,16,12,190],
    view:k=>k===0?{cam:[.08,.42],bounds:[[-5.1,0,-3.4],[5.1,2.9,-2.6]]}:k===1?{cam:[.08,.7],bounds:[[-5.1,0,-3.4],[5.1,2.9,.4]]}:full});
})();
