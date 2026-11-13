// ---- Scene: Fig. 1, agreement against chance (stg-agr, renderer v2) ----
// Released labels, one stack per item: MT-Bench turn-1 expert votes (370 items, 2 to 6 graduate-student experts each; A wins, tie, B wins),
// the same votes with ties dropped, or HelpSteer2 coherence (a seeded sample of 370 of the 23,652 responses is drawn; every number is computed
// on all of them, window.HE.agree). Steps: the labels; raw pair agreement into a meter; pooled label shares and the chance a random pair
// matches, as a glass plane in the meter; kappa as the gap above that plane over the room above it; the coincidence matrix as a bar field on
// a glass plate and Krippendorff's alpha; the ordered (ordinal or interval) versions and Gwet's AC1. The statistics are window.HES's, which
// check_page.mjs compares with recompute.json; what the step lists must say is published in window.ESS.agr for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-agr')||!window.S3||!window.HES)return;const {mix,lerp,at}=S3,D=window.HE,S=window.HES;
  const MT=D.agree.mtb.t1.map(s=>[...s].map(ch=>S.MTC.indexOf(ch))),HS=S.hsUnits('coherence');
  const ST=[S.mtStats('t1',false),S.mtStats('t1',true),S.hsStats('coherence','all')];
  const LAB=[['A wins','tie','B wins'],['A wins','B wins'],['0','1','2','3','4']];
  const SHORT=[['A','tie','B'],['A','B'],['0','1','2','3','4']];
  let mode=0;
  // field geometry: 20 columns of items, one cube per label stacked
  const G=20,SP=.28,FX=-3.1,CU=.2,CH=.1,MX=2.35,H=2.4,RX=3.6,RS=.75,win=(e,a,b)=>Math.max(0,Math.min(1,(e-a)/(b-a)));
  const pos=i=>[FX+((i%G)-(G-1)/2)*SP,0,((Math.floor(i/G))-9)*SP];
  const units=()=>mode===2?HS:MT;
  // a label's colour: MT-Bench A blue, tie grey, B teal; HelpSteer2 0 to 4 light to dark purple
  function col(P,c){if(mode<2)return c===0?mix(P.paper,P.c1,.75):c===1?mix(P.paper,P.mute,.45):mix(P.paper,P.c6,.8);return mix(P.paper,P.c4,.12+.2*c)}
  // per item: share of rater pairs that agree (ties left out in mode 1; null when fewer than two labels remain)
  function agreeFrac(u){const v=mode===1?u.filter(c=>c!==1):u;if(v.length<2)return null;let a=0,p=0;for(let i=0;i<v.length;i++)for(let j=i+1;j<v.length;j++){p++;if(v[i]===v[j])a++}return a/p}
  const FR=[0,1,2].map(m=>{const save=mode;mode=m;const r=units().map(agreeFrac);mode=save;return r});
  const f3=x=>x.toFixed(3),pc=x=>(100*x).toFixed(1)+'%';
  // the check hook: what each mode's step list must state
  window.ESS=window.ESS||{};ESS.agr=ST.map((r,m)=>({units:r.units,votes:Math.round(r.votes),pairs:r.pairs,po:pc(r.po),pe:f3(r.pe),k:f3(r.kappa_fleiss),a:f3(r.alpha_nominal),
    ao:r.alpha_ordinal!=null?f3(r.alpha_ordinal):null,ai:r.alpha_interval!=null?f3(r.alpha_interval):null,ac1:f3(r.ac1),Do:f3(r.Do_nom),De:f3(r.De_nom),shares:r.shares.map(pc)}));
  // the result bars right of the meter: [name, value, colour key, first step]
  function results(P,r){const out=[['κ',r.kappa_fleiss,P.good,3],['α',r.alpha_nominal,P.c4,4]];
    if(mode===0)out.push(['α ord',r.alpha_ordinal,P.c4,5],['AC1',r.ac1,P.c6,5]);
    if(mode===2)out.push(['α int',r.alpha_interval,P.c4,5],['AC1',r.ac1,P.c6,5]);return out}
  function draw(R,k,e){const P=R.P,r=ST[mode],U=units(),fr=FR[mode],nl=LAB[mode].length;R.grid(-5.8,5.4,-3.2,3.2,.5);
    // 1. the field of stacks (fades out fully while the coincidence matrix replaces it)
    const fa=k<=1?1:k===2?lerp(1,.25,e):k===3?.25*(1-win(e,0,.6)):0;
    if(fa>.01)U.forEach((u,i)=>{const p=pos(i),f=fr[i];
      u.forEach((c,j)=>{const dead=mode===1&&(c===1||f===null);R.box([p[0],j*CH,p[2]],[CU,CH*.92,CU],{fill:col(P,c),a:fa*(dead?.22:1),shadow:false,lw:.5,fa:dead?.35:1})});
      if(k>=1&&f!==null){const t=k===1?e:1,c=f===1?P.good:f===0?P.bad:P.c5;R.box([p[0],u.length*CH,p[2]],[CU+.02,.035,CU+.02],{fill:c,a:fa*t,shadow:false,lw:.4})}});
    if(k===0)R.label([FX,0,3.0],R.W<520?U.length+' items':U.length+(mode===2?' of '+r.units.toLocaleString('en-US')+' responses drawn':' items')+' · one cube per label',{fs:12.5,b:1,dy:14});
    // the meter: a glass back plate 0 to 1, ticks at 0, 0.5, 1
    const ma=k===0?0:k===1?win(e,.55,1):1;
    if(ma>0){R.glass([MX-.85,0,-.55],[1.7,0,0],[0,H,0],{c:P.mute,a:ma*.6,nu:2,nv:10});
      R.label([MX-.85,H,-.55],'1.0 perfect',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:ma});
      // raw agreement
      const t=k===1?win(e,.55,1):1,h=Math.max(.01,r.po*H*t);R.box([MX-.4,0,0],[.36,h,.36],{fill:mix(P.paper,P.acc,.6),a:ma});
      R.label([MX-.4,h,0],'raw '+pc(r.po),{fs:12.5,b:1,dy:-12,c:P.acc,a:ma});
      if(k===1)for(let s=0;s<6;s++){const a0=pos(Math.floor((s+.5)/6*U.length));R.flowArc([a0[0],.3,a0[2]],[MX-.4,h+.05,0],.9,{c:P.acc,a:.55,r:.05,n:5,speed:1.5})}}
    // 2. pooled label shares, and chance: the plane two random labels match at
    if(k>=2){const t=k===2?e:1,w=nl>3?.18:.22,sx=nl>3?.25:.3,x0=.05,pa=k>=4?.18:k===3?.45:1;
      r.shares.forEach((s,j)=>{const c=mode===1?(j?2:0):j,x=x0+j*sx,h=Math.max(.01,s*H*t);R.box([x,0,0],[w,h,w],{fill:col(P,c),a:pa});
        if(k<4)R.label([x,h,0],SHORT[mode][j],{fs:12,dy:-11,c:P.ink,a:pa+.05})});
      if(k<4)R.label([x0+(nl-1)*sx/2,0,.35],'label shares',{fs:12,dy:13,c:P.mute,a:pa});
      const y=r.pe*H*t;R.glass([MX-.85,y,-.55],[1.7,0,0],[0,0,1.1],{c:P.bad,a:Math.min(1,t*1.4)*.9,nu:4,nv:2,th:.02});
      if(k<4)R.label([MX+.4,y,.55],'chance '+f3(r.pe),{fs:12.5,b:1,c:P.bad,a:t,dy:14})}
    // 3. kappa: the gap from chance to raw, over the room from chance to perfect
    if(k>=3){const t=k===3?e:1,y0=r.pe*H,y1=r.po*H,xg=MX+.4;
      R.box([xg,y0,0],[.3,Math.max(.01,(y1-y0)*t),.3],{fill:mix(P.paper,P.good,.6),shadow:false});
      R.line([[xg-.15,y0,0],[xg-.15,H,0],[xg+.15,H,0],[xg+.15,y0,0]],{c:P.good,w:1.3,dash:[4,3],a:t});
      if(k===3)R.label([xg+.2,(y0+H)/2,0],'room above chance '+f3(1-r.pe),{al:'left',dx:8,fs:12,c:P.good,a:t,wide:1})}
    // the result bars, each rescaled to 0..1
    const res=results(P,r);res.forEach(([nm,v,c,s0],j)=>{if(k<s0)return;const t=k===s0?e:1,x=RX+j*RS,h=Math.max(.01,Math.max(0,v)*H*t);
      const ph=R.W<520&&k>s0&&k===5&&res.length>2;R.box([x,0,0],[.3,h,.3],{fill:mix(P.paper,c,.62)});if(!ph)R.label([x,h,0],f3(v),{fs:12,b:1,dy:-11-(j%2)*14,c,a:t,mono:true});R.label([x,0,.2],nm,{fs:12,dy:12,c,a:t,wide:1});
      if(k===3&&j===0)R.flowArc([MX+.4,r.po*H,0],[x,h+.03,0],.4,{c:P.good,a:.7,r:.05,n:6})});
    // mode 1, last step: the ties-counted values beside, as outlines
    if(mode===1&&k===5){const r0=ST[0],t=e;[[MX-.4,r0.po,P.acc],[RX+RS,r0.alpha_nominal,P.c4]].forEach(([x,v,c])=>{const y=v*H;
      R.line([[x-.28,y,.2],[x+.28,y,.2]],{c,w:5,a:t,top:1});R.line([[x-.28,y,.2],[x+.28,y,.2]],{c:P.paper,w:1.5,dash:[4,3],a:t,top:1})});
      R.label([MX+1.5,H,0],'dashes: with ties, raw '+pc(r0.po)+', α '+f3(r0.alpha_nominal),{fs:12.5,b:1,c:P.mute,a:t,dy:-12,wide:1})}
    // 4. the coincidence matrix where the field was
    if(k>=4){const t=k===4?win(e,.5,1):1,cs=nl>3?.82:nl>2?1.25:1.6,w=nl*cs,x0=FX+.5-w/2,z0=-w/2,co=r.co,mx=Math.max(...co.flat()),cats=mode===1?[0,2]:[...Array(nl).keys()];
      R.glass([x0,.004,z0],[w,0,0],[0,0,w],{c:P.c4,a:t*.8,nu:nl,nv:nl,th:.02});
      co.forEach((row,i)=>row.forEach((v,j)=>{const x=x0+(j+.5)*cs,z=z0+(i+.5)*cs,hh=Math.max(.01,v/mx*1.35*t),diag=i===j;
        const dist=Math.abs(cats[i]-cats[j])/(cats[nl-1]-cats[0]||1),c=diag?P.good:k>=5&&mode!==1?mix(P.c5,P.bad,dist):P.bad;
        R.box([x,0,z],[cs*.5,hh,cs*.5],{fill:mix(P.paper,c,.62),shadow:false,a:Math.min(1,t*1.5)});
        if(diag&&nl<=3)R.label([x,hh,z],v.toFixed(0),{fs:12,dy:-10,mono:true,c:diag?P.good:P.bad,a:t})}));
      cats.forEach((c,i)=>{R.label([x0,0,z0+(i+.5)*cs],SHORT[mode][i],{al:'right',dx:-8,fs:12,c:P.ink,a:t});R.label([x0+(i+.5)*cs,0,z0+w],SHORT[mode][i],{fs:12,dy:13,c:P.ink,a:t})});
      R.label([FX+.5,0,z0+w+.45],R.W<520?'coincidence matrix':'coincidence matrix · diagonal agrees, off it disagrees',{fs:12.5,b:1,dy:16,c:P.c4,a:t});
      if(k===4){const xa=RX+RS;R.flowArc([FX+.5,.6,0],[xa,ST[mode].alpha_nominal*H*t+.05,0],1.3,{c:P.c4,a:.6*t,r:.05,n:10})}}
  }
  const full={cam:[-.18,.66],bounds:[[-5.9,0,-2.8],[5.9,2.5,2.9]]};
  // on a phone the last two steps turn the row into depth, matrix in front, so it is larger
  const st=S3.stage({id:'stg-agr',list:'sx-agr-0',fig:'Fig. 1 · one set of labels, scored against chance',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5200,draw,
    margin:w=>w<520?[16,10,14,10]:[22,18,16,36],
    view:k=>k===0?{cam:[-.12,.82],bounds:[[-5.9,0,-2.8],[-.2,.7,3.0]]}:k===1?{cam:[-.18,.66],bounds:[[-5.9,0,-2.8],[3.4,2.5,2.9]]}:k===2?{cam:[-.2,.5],bounds:[[-2.6,0,-1.6],[3.7,2.5,1.6]]}:k===3?{cam:[-.22,.42],bounds:[[-.3,0,-.8],[4.4,2.5,.9]]}:k>=4?(innerWidth<520?{cam:[-.6,.85],bounds:[[-4.8,0,-2.2],[6.1,2.5,2.4]]}:{cam:[-.12,.72],bounds:[[-4.8,0,-2.2],[6.1,2.5,2.4]]}):full});
  const seg=document.getElementById('agr-mode');
  seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{mode=+b.dataset.m;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    [0,1,2].forEach(m=>{document.getElementById('sx-agr-'+m).hidden=m!==mode});st.list('sx-agr-'+mode)});
})();
