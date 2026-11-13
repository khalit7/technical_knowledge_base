// ---- Scene: section 7, one softmax computed naive (back row) and stable (front row) on logits (1000, 999, 0), every operation rounded to the chosen format ----
// Values: NC_ANIM.trace(mode, format) in 23_js_rd_anim.js (this page's emulator; check_page.mjs compares it with NumPy and ml_dtypes, numbers.json sm_*).
// Heights: a logit as z/1000; an exponential or probability linearly with 1 drawn as U; the glass ceiling stands for the format's largest number and is not to scale.
(function(){
  if(!document.getElementById('stg-sm')||!window.NC_ANIM)return;const {at,off,lerp,mix}=S3;
  const W=['cat','dog','sat'],XS=[-1.7,0,1.7],XSUM=3.6,ZN=-1.3,ZS=1.3,YP=1.3,HL=1.15/1000,U=.6,HC=1.6;
  let fmt='fp32',TN,TS;
  function load(){TN=NC_ANIM.trace('naive',fmt);TS=NC_ANIM.trace('stable',fmt);window.NC_SMSC={fmt,naive:TN.map(s=>s.rows.map(r=>r[1])),stable:TS.map(s=>s.rows.map(r=>r[1]))}}
  load();
  const fin=Number.isFinite,sh=v=>Number.isNaN(v)?'NaN':v===Infinity?'inf':v===-Infinity?'−inf':FP.show(v,5);
  // a plinth for one row, and a signed bar on it (up for positive, hanging for negative); h in world units, clipped bars get a broken glowing end
  function plinth(R,z,a){R.box([.0,YP-.05,z],[5.0,.05,.62],{a,shadow:false});[-2.35,2.35].forEach(px=>R.box([px,0,z],[.04,YP-.05,.04],{a:a*.8}))}
  function bar(R,xp,z,h,c,a,o){o=o||{};if(a<=.01)return;const P=R.P,hh=Math.max(.012,Math.abs(h));
    R.box([xp,h>=0?YP:YP-.05-hh,z],[.62,hh,.42],{fill:c,a,shadow:false,lw:.7,fa:o.fa});
    if(o.broken){R.glow([xp,YP+hh,z],.42,{c:P.bad,a});}}
  function lab(R,xp,z,h,t,o){o=o||{};R.label([xp,h>=0?YP+Math.max(h,0):YP-.05+h,z],t,{mono:true,fs:12.5,dy:h>=0?-12:12,b:o.b,c:o.c,a:o.a==null?1:o.a})}
  function draw(R,k,e){const P=R.P;R.grid(-4,5,-2.6,2.6,.5);
    const naiveA=k===0?1:k<=2?1:.22,stabA=k===0?1:k<=2?.22:1;
    // the rows' plinths and names
    plinth(R,ZN,naiveA);plinth(R,ZS,stabA);
    R.label([-2.5,YP,ZN],'naive',{al:'right',dx:-8,fs:13,b:1,a:Math.max(.4,naiveA)});R.label([-2.5,YP,ZS],'stable',{al:'right',dx:-8,fs:13,b:1,a:Math.max(.4,stabA)});
    W.forEach((w,i)=>R.label([XS[i],0,ZS+.45],w+(i===2?' (target)':''),{serif:true,fs:13,dy:12,a:.9}));
    const z=TN[0].rows.map(r=>r[1]),cZ=mix(P.paper,P.c1,.45);
    // ---- naive row ----
    const eN=TN.slice(1,4).map(s=>s.rows[0][1]),sumN=TN[4].rows[0][1],pN=TN[5].rows.map(r=>r[1]),LN=TN[6].rows.map(r=>r[1]);
    if(k<=1){W.forEach((_,i)=>{let h=z[i]*HL,c=cZ,t=sh(z[i]),br=false;
      if(k===1){const tgt=fin(eN[i])?eN[i]*U:HC+.55;h=lerp(z[i]*HL,tgt,e);br=!fin(eN[i])&&e>.5;c=br?mix(P.paper,P.bad,.7):mix(cZ,mix(P.paper,P.c3,.5),e);t=e>.5?'e^'+sh(z[i])+' = '+sh(eN[i]):t}
      bar(R,XS[i],ZN,h,c,naiveA,{broken:br});lab(R,XS[i],ZN,h,t,{c:br?P.bad:P.ink,b:br,a:naiveA})})}
    if(k===2){const ap=Math.min(1,e*1.4);
      W.forEach((_,i)=>{const h=fin(eN[i])?eN[i]*U:HC+.55;bar(R,XS[i],ZN,h,fin(eN[i])?mix(P.paper,P.c3,.5):mix(P.paper,P.bad,.7),1-.65*ap,{broken:!fin(eN[i])});
        R.flowArc([XS[i],YP+Math.min(h,HC)+.05,ZN],[XSUM,YP+.5,ZN],.5,{c:fin(eN[i])?P.c3:P.bad,a:.85,r:.06,n:6,speed:1.4})});
      bar(R,XSUM,ZN,HC+.25,mix(P.paper,P.bad,.7),ap,{broken:true});lab(R,XSUM,ZN,HC+.25,'sum = '+sh(sumN),{c:P.bad,b:1,a:ap});
      W.forEach((_,i)=>{const v=pN[i],bad=Number.isNaN(v);R.box([XS[i],YP,ZN],[.62,bad?.62:.012,.42],{fill:bad?mix(P.paper,P.bad,.35):P.paper,a:ap,fa:bad?.35:1,shadow:false,ec:bad?P.bad:undefined,lw:1.2});
        R.label([XS[i],YP+(bad?.62:0),ZN],'p = '+sh(v),{mono:true,fs:12.5,dy:-12,b:1,c:bad?P.bad:P.ink,a:ap})});
      R.label([XSUM,YP,ZN],'loss '+sh(LN[0]),{mono:true,fs:12.5,b:1,c:P.bad,dy:24,a:e});R.label([XSUM,YP,ZN],'grad '+LN.slice(1).map(sh).join(', '),{mono:true,fs:12.5,b:1,c:P.bad,dy:42,a:e,wide:1})}
    if(k>=3){W.forEach((_,i)=>{const v=pN[i],bad=Number.isNaN(v);R.box([XS[i],YP,ZN],[.62,bad?.62:.012,.42],{fill:bad?mix(P.paper,P.bad,.35):P.paper,a:naiveA,fa:bad?.35:1,shadow:false,lw:1});
      R.label([XS[i],YP+(bad?.62:0),ZN],sh(v),{mono:true,fs:12,dy:-12,c:P.mute,a:.5})})}
    // the ceiling: the format's largest number, over the naive row (and, faintly, the stable one)
    const cl=k===0?.3:k<=2?1:.12;
    R.glass([-2.5,YP+HC,ZN-.45],[5,0,0],[0,0,.9],{c:P.bad,a:cl,nu:1,nv:1,th:.02});
    if(k>=1&&k<=2)R.label([-2.5,YP+HC,ZN-.45],'ceiling: largest '+FP.F[fmt].name+' = e^'+Math.log(FP.F[fmt].max).toFixed(2)+' (not to scale)',{al:'left',dy:-12,fs:12,c:P.bad,a:cl,wide:1});
    if(k===4||k===5)R.glass([-2.5,YP+HC,ZS-.45],[5,0,0],[0,0,.9],{c:P.bad,a:.3*(k===4?e:1),nu:1,nv:1,th:.02});
    // ---- stable row ----
    const d=TS[1].rows.map(r=>r[1]),eS=TS[2].rows.map(r=>r[1]),sumS=TS[3].rows[0][1],pS=TS[4].rows.map(r=>r[1]),lp=TS[5].rows.map(r=>r[1]),LS=TS[6].rows.map(r=>r[1]);
    const clip=h=>Math.max(-1.2,h);
    let H=[0,0,0],T=['','',''],C=[cZ,cZ,cZ];
    if(k<=2){H=z.map(v=>v*HL);T=z.map(sh)}
    else if(k===3){H=z.map((v,i)=>lerp(v*HL,clip(d[i]*HL),e));T=d.map(sh);
      W.forEach((_,i)=>R.flowArc([XS[0],YP+z[0]*HL+.05,ZS],[XS[i],YP+.15,ZS],.35+.08*i,{c:P.c2,a:Math.min(1,e*1.5)*.85,r:.06,n:5,speed:1.3}));
      R.label([XS[0],YP+z[0]*HL*(1-e),ZS],'m = '+sh(Math.max(...z)),{mono:true,fs:12.5,b:1,c:P.c2,dy:-30,a:1-e*.3})}
    else if(k===4){H=d.map((v,i)=>lerp(clip(v*HL),eS[i]*U,e));T=eS.map((v,i)=>'e^'+sh(d[i])+' = '+sh(v));C=C.map(c=>mix(c,mix(P.paper,P.c3,.5),e))}
    else if(k===5){H=eS.map((v,i)=>lerp(v*U,pS[i]*U,e));T=pS.map(v=>'p = '+sh(v));C=C.map(()=>mix(mix(P.paper,P.c3,.5),mix(P.paper,P.acc,.55),e))}
    else{H=pS.map((v,i)=>lerp(v*U,clip(lp[i]*U),e));T=lp.map(v=>'ln p = '+sh(v));C=C.map(()=>mix(P.paper,P.acc,.55))}
    W.forEach((_,i)=>{bar(R,XS[i],ZS,H[i],C[i],stabA);lab(R,XS[i],ZS,H[i],T[i],{a:Math.max(.3,stabA),b:k>=3})});
    if(k===5){const ap=Math.min(1,e*1.5);W.forEach((_,i)=>R.flowArc([XS[i],YP+eS[i]*U+.05,ZS],[XSUM,YP+sumS*U,ZS],.45,{c:P.c3,a:.85*ap,r:.06,n:5,speed:1.3}));
      bar(R,XSUM,ZS,sumS*U,mix(P.paper,P.c3,.5),ap);lab(R,XSUM,ZS,sumS*U,'sum = '+sh(sumS),{b:1,a:ap})}
    if(k===6){bar(R,XSUM,ZS,sumS*U,mix(P.paper,P.c3,.5),.35);
      R.label([XSUM,YP+sumS*U,ZS],'loss '+sh(LS[0]),{mono:true,fs:12.5,b:1,c:P.good,dy:-58,a:e});R.label([XSUM,YP+sumS*U,ZS],'grad '+LS.slice(1).map(sh).join(', '),{mono:true,fs:12.5,b:1,c:P.good,dy:-40,a:e,wide:1})}
  }
  const full={cam:[.36,.62],bounds:[[-2.9,0,-2],[4.3,3.4,2]]};
  const st=S3.stage({id:'stg-sm',list:'sx-sm',fig:'One softmax, naive and stable, logits (1000, 999, 0)',cam:full.cam,bounds:full.bounds,aspect:.78,dur:1500,hold:5200,draw,
    view:k=>k===1||k===2?{cam:[.3,.5],bounds:[[-2.9,.4,-2],[4.3,3.4,-.6]]}:k>=3?{cam:[.14,.5],bounds:[[-2.8,0,.8],[k<=4?2.9:4.9,2.5,1.8]]}:full,
    margin:w=>w<520?[16,10,26,58]:[20,20,30,80],onStep:k=>{try{readout(k)}catch(e){}}});
  // the left column's readout: the values of this step as their stored bits (the lanes of 23_js_rd_anim.js)
  const PICK=[[['n',0]],[['n',1],['n',2],['n',3]],[['n',4],['n',5],['n',6]],[['s',1]],[['s',2]],[['s',3],['s',4]],[['s',5],['s',6]]];
  function readout(k){const el=document.getElementById('rd-smOut');if(!el)return;const f=FP.F[fmt];let h='';
    PICK[k].forEach(([m,j])=>{const s=(m==='n'?TN:TS)[j];h+='<div class="op">'+(m==='n'?'naive':'stable')+', '+f.name+': '+s.t+'</div>';s.rows.forEach(r=>{h+=NC_ANIM.lane(r[0],r[1],f,NC_ANIM.kind(r[1]),r[2])})});
    el.innerHTML=h}
  readout(0);
  RD.seg(document.getElementById('rd-smFmt'),m=>{fmt=m;load();readout(0);st.list('sx-sm')});
})();
