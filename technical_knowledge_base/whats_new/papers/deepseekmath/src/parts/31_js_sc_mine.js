// ---- Scene: the corpus pipeline of §2.1 run on a synthetic web (renderer v2: a few large objects per step, the camera moving per step,
// a glass plate for the classifier, flowing dots wherever pages move, the seed growing as bars on a white plinth).
// Data: MINE from 13_js_read.js, the page's own illustrative simulation (48 domains of 30 pages, six writing styles; a style is recognised
// once the seed holds 12 positives in it; a domain with over 10% of its pages collected is flagged). Only the mechanism is the paper's. ----
(function(){
  if(!document.getElementById('stg-mine'))return;const {lerp,mix}=S3;
  const M=MINE,NPG=M.NPG,COLS=8,TH=12;let MODE='dd';
  const SHORT=['seed','Q&A','notes','problems','wiki','blog'];
  const gx=di=>(di%COLS-3.5)*1.05,gz=di=>(Math.floor(di/COLS)-2.5)*1.05-1.35;
  const HU=.062,SU=.0125,ZP=2.45,ZS=3.55,sx=s=>(s-2.5)*.78;
  // per domain: math pages by style; per mode and round: found math pages by style and stray non-math finds
  const TOT=M.dom.map(d=>{const t=[0,0,0,0,0,0];d.pages.forEach(p=>{if(p.math)t[p.st]++});return t});
  const FOUND={};['dd','self'].forEach(m=>{FOUND[m]=M[m].map(r=>M.dom.map((d,di)=>{const f=[0,0,0,0,0,0];let fp=0;d.pages.forEach((p,pi)=>{if(r.got.has(di*NPG+pi)){if(p.math)f[p.st]++;else fp++}});return {f,fp}}))});
  const roundAt=k=>k<2?-1:k<4?0:k-3;
  function flaggedAt(m,k){const R=M[m],f=new Set();if(k<3)return f;const upto=k===3?0:roundAt(k);for(let j=0;j<=Math.min(upto,R.length-1);j++)R[j].newFlag.forEach(d=>f.add(d));return f}
  // flagged domains only grow the seed with domain discovery; in the classifier-only mode they are counted but never used
  const newFlags=(m,k)=>k===3?M[m][0].newFlag:k>=4&&k<=5?M[m][roundAt(k)].newFlag:new Set();
  function seedAt(m,k,e){const R=M[m],P=j=>R[Math.min(j,R.length-1)].pos;
    if(k<3)return P(0);if(k===3)return P(0).map((v,s)=>lerp(v,P(1)[s],e));if(k<6){const j=roundAt(k);return P(j).map((v,s)=>lerp(v,P(j+1)[s],e))}return P(3)}
  const knownAt=(m,k)=>k<1?new Set():M[m][Math.max(0,roundAt(k))].R;
  function draw(R,k,e){const P=R.P,SC=[P.c1,P.c2,P.c3,P.c4,P.c5,P.c6],ri=roundAt(k),F=ri>=0?FOUND[MODE][ri]:null,PF=ri>0?FOUND[MODE][ri-1]:null;
    R.grid(-4.6,4.6,-4.2,4.4,.5);
    const fl=flaggedAt(MODE,k),nf=newFlags(MODE,k),showFlag=MODE==='dd'||k<3;
    // 1. the web: a tile per domain, its math pages as a column by style, solid once found, glass while missed
    const webA=k===1?.25:1;
    M.dom.forEach((d,di)=>{const x=gx(di),z=gz(di),isF=fl.has(di)&&MODE==='dd',fa=isF&&nf.has(di)?e:1;
      R.box([x,0,z],[.9,.04,.9],{fill:isF?mix(P.paper,P.ink,.22*fa):mix(P.paper,P.line,.2),a:webA,lw:.6});
      if(isF)R.line([[x-.47,.05,z-.47],[x+.47,.05,z-.47],[x+.47,.05,z+.47],[x-.47,.05,z+.47],[x-.47,.05,z-.47]],{c:P.ink,w:2.2,a:webA*fa});
      const cw=d.mi>=0?.5:.26;
      let y=.04;TOT[di].forEach((n,s)=>{if(!n)return;const got=F?F[di].f[s]:0,was=PF?PF[di].f[s]:0,g=F?(k===3?got:lerp(was,got,e)):0;
        if(g>.01){R.box([x,y,z],[cw,g*HU,cw],{fill:mix(P.paper,SC[s],.8),a:webA,shadow:false,lw:.6});}
        const rest=n-g;if(rest>.01)R.box([x,y+g*HU,z],[cw,rest*HU,cw],{fill:mix(P.paper,SC[s],k===0?.45:.3),a:webA,fa:k===0?.55:.3,shadow:false,lw:.5,ea:.35});
        y+=n*HU});
      if(F&&F[di].fp)R.box([x+.33,.04,z+.33],[.14,F[di].fp*HU*2,.14],{fill:P.bad,a:webA,shadow:false,lw:.5})});
    R.label([gx(0)-.5,0,gz(0)],'web · 48 domains',{al:'right',dx:-8,fs:12,c:P.mute,grp:'row',a:webA});
    // 2. the classifier (a glass plate) and the seed positives in front of it, one bar per style on a white plinth
    const plA=k===0?.25:1,plC=mix(P.c1,P.ink,.15);
    R.glass([-2.35,.06,ZP],[4.7,0,0],[0,1.05,0],{c:plC,a:plA,nu:10,nv:3});
    R.label([2.35,.6,ZP],'classifier',{al:'left',dx:8,fs:12,c:P.c1,b:1,a:plA});
    const seed=seedAt(MODE,k,e),known=knownAt(MODE,k),sA=k===0?.25:1;
    R.box([0,.0,ZS],[4.9,.05,.7],{a:sA,lw:.6});
    seed.forEach((v,s)=>{const h=Math.max(.012,v*SU),kn=known.has(s);R.box([sx(s),.05,ZS],[.48,h,.42],{fill:mix(P.paper,SC[s],v>0?.85:.2),a:sA,shadow:false,lw:.7});
      if(kn&&k>=1)R.glow([sx(s),.05+h+.08,ZS],.16,{c:SC[s],a:sA*.9});
      if(k>=1)R.label([sx(s),0,ZS+.3],SHORT[s],{mono:true,fs:12,dy:13,c:kn?SC[s]:P.mute,b:kn,a:sA,grp:'sty'});
      if(v>0&&k>=1)R.label([sx(s),.05+h,ZS],String(Math.round(v)),{mono:true,fs:12,dy:-10,a:sA,grp:'seedv'})});
    if(k>=1)R.line([[-2.45,.05+TH*SU,ZS-.24],[2.45,.05+TH*SU,ZS-.24]],{c:P.acc,w:1.6,dash:[5,4],a:sA});
    if(k>=1)R.label([-2.45,.05,ZS],'seed positives · '+TH+' to recognise a style',{al:'right',dx:-8,fs:12,c:P.mute,grp:'row',a:sA});
    // flows: the seed trains the classifier; the classifier recalls pages; flagged domains (or its own finds) feed the seed
    if(k===1)seed.forEach((v,s)=>{if(v>0)R.flow([[sx(s),.4,ZS-.2],[sx(s)*.6,.55,ZP+.05]],{c:SC[s],a:e,r:.06,n:4})});
    const recall=k===2||(k>=4&&k<=5);
    if(recall&&F)M.dom.forEach((d,di)=>{const add=F[di].f.reduce((a,b)=>a+b,0)-(PF?PF[di].f.reduce((a,b)=>a+b,0):0);if(add<=0)return;
      const s=F[di].f.indexOf(Math.max(...F[di].f));R.flowArc([Math.max(-2.2,Math.min(2.2,gx(di)*.55)),1.0,ZP],[gx(di),.5,gz(di)],.55,{c:SC[s],a:.85,r:.055,n:Math.min(5,1+Math.round(add/4)),speed:1.5})});
    if(k>=3&&k<=5){if(MODE==='dd')nf.forEach(di=>TOT[di].forEach((n,s)=>{if(n>2)R.flowArc([gx(di),.6,gz(di)],[sx(s),.5,ZS-.15],.9,{c:SC[s],a:e*.9,r:.06,n:Math.max(2,Math.round(n/4)),speed:1.6})}));
      else if(k===3)M.dom.forEach((d,di)=>{if(F&&F[di].f[0])R.flowArc([gx(di),.4,gz(di)],[sx(0),.5,ZS-.15],.9,{c:SC[0],a:e*.6,r:.05,n:2,speed:1.6})})}
  }
  const RND=v=>Math.round(v);
  function counters(k){const el=document.getElementById('mineCnt');if(!el)return;const R=M[MODE],ri=roundAt(k),cur=ri>=0?R[ri]:null;
    const styles=k===0?0:knownAt(MODE,k).size;
    el.innerHTML=stat('math pages found',cur?cur.found+' of '+M.total:'0 of '+M.total,cur?RND(100*cur.found/M.total)+'% recall':'')+
      stat('styles recognised',styles+' of 6','')+
      stat('domains flagged',MODE==='dd'?String(flaggedAt(MODE,k).size):'not used','over 10% collected')+
      stat('overlap with last round',cur&&ri>0?RND(100*cur.overlap)+'%':'','share of this round\'s finds already found')}
  const full={cam:[.3,.68],bounds:[[-4.3,0,-4.2],[4.3,1.3,4.0]]};
  const V=[{cam:[.3,.8],bounds:[[-4.3,0,-4.0],[4.3,1.4,1.8]]},{cam:[.35,.5],bounds:[[-2.9,0,1.9],[2.9,1.4,4.2]]},full,{cam:[.25,.85],bounds:full.bounds},full,full,full];
  const stg=S3.stage({id:'stg-mine',list:'sx-mine-dd',fig:'Fig. 1 · mining a synthetic web, round by round',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:5000,draw,
    view:k=>{const v=V[k],h=document.getElementById('stg-mine');return h&&h.clientWidth<520?{cam:[v.cam[0],Math.min(1.2,v.cam[1]+.25)],bounds:v.bounds}:v},
    margin:w=>w<520?[14,8,14,8]:[16,50,14,130],onStep:k=>counters(k)});
  const seg=document.getElementById('mineM');
  if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(y=>{y.classList.toggle('on',y===b);y.setAttribute('aria-pressed',y===b?'true':'false')});
    MODE=b.dataset.m;['dd','self'].forEach(m=>{const L=document.getElementById('sx-mine-'+m);if(L)L.hidden=m!==MODE});stg.list('sx-mine-'+MODE)}));
})();
