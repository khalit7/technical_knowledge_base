// ---- Scene (Reading 4, Fig. 3): paraphrases in embedding space. A short MMLU item and its identical RLVR prompt as two glass plates, too short for any
// n-gram window; both embedded to one point; then the 72 nearest (test item, post-training prompt) pairs this page lists, each test item at the centre
// and its nearest prompt at radius 0.25 + 28 x (1 - cosine) (the radius is measured, the angle only spreads the dots); the 0.95 and 0.88 rings;
// then the Qwen3-1.7B judge's verdicts by label. Data: window.DG.emb.top (bge-small-en-v1.5, src/scripts/dg_embed.py), DG.gpu.judge. ----
(function(){
  if(!document.getElementById('stg-emb')||!window.DG||!DG.emb)return;const {at,lerp,mix}=S3;
  const $=id=>document.getElementById(id),T=DG.emb.top.slice().sort((a,b)=>b.s-a.s),J=DG.gpu.judge.table;
  const EX=T.find(r=>r.b==='mmlu_test'&&r.x===4414)||T[0],tok=EX.q.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ');
  const rad=s=>.25+28*(1-s),GA=2.39996;
  const pts=T.map((r,i)=>{const a=i*GA,q=rad(r.s);return {r,p:[q*Math.cos(a),.1,q*Math.sin(a)]}});
  const hi=T.filter(r=>r.s>=.95&&!r.ng),mid=T.filter(r=>r.s<.95&&!r.ng&&r.lab),ngc=T.filter(r=>r.ng).length;
  const cnt=(rs,l)=>rs.filter(r=>(r.lab||'unlabelled')===l).length;
  const js=l=>[(J[l+'|SAME']||0),(J[l+'|DIFFERENT']||0)],jc=js('copy'),jo=['variant','similar','phrase','diagram'].map(js).reduce((a,b)=>[a[0]+b[0],a[1]+b[1]],[0,0]);
  const ring=(R,q,c,a,dash)=>{const pp=[];for(let i=0;i<=64;i++){const t=i/64*Math.PI*2;pp.push([q*Math.cos(t),.012,q*Math.sin(t)])}R.line(pp,{c,w:1.4,a,dash})};
  function col(P,r){return r.lab==='copy'?P.bad:r.lab==='variant'?P.c5:r.lab==='similar'?mix(P.paper,P.mute,.55):P.paper}
  function draw(R,k,e){const P=R.P;R.grid(-4.5,7,-4,4,.5);
    // 1. the two plates and the item's tokens, with an 8-token window longer than the item
    if(k<=1){const a=k===0?at(k,e,0):1-e,sh=k===1?lerp(1,.2,e):1;
      [[-1.9,'MMLU test #'+EX.x,P.c2],[1.9,'Tulu 3 RLVR prompt',P.c1]].forEach(([x,nm,c],i)=>{const xx=lerp(x,0,k===1?e:0),w=2.6*sh,h=1.1*sh;
        const la=k===0?a:Math.max(0,1-3*e);R.glass([xx-w/2,.35*sh,0],[w,0,0],[0,h,0],{c,nu:6,nv:3,a});R.label([xx,.35*sh+h,0],nm,{fs:12.5,b:1,dy:-12,c,a:la});
        R.label([xx,.35*sh+h/2,0],(i?EX.t:EX.q),{serif:true,fs:14,a:la})});
      if(k===0){const tw=.5,x0=-1.9-(tok.length*tw)/2;tok.forEach((t,i)=>{R.box([x0+tw*(i+.5),0,1.0],[tw*.85,.14,.4],{a:e,lw:.6});R.label([x0+tw*(i+.5),.14,1.0],t,{mono:true,fs:12,dy:i%2?22:-12,a:e})});
        R.glass([x0,0,1.28],[8*tw,0,0],[0,.5,0],{c:P.c1,nu:8,nv:1,a:e*.8});R.label([x0+8*tw,.5,1.28],tok.length+' tokens · an 8-gram needs 8',{al:'left',dx:8,mono:true,fs:12,c:P.c1,a:e,wide:1})}
      if(k===1){[-1.9,1.9].forEach(x=>R.flowArc([x*(1-e),.5,0],[0,.12,0],.4,{c:P.c2,a:.9,r:.06,speed:1.2}))}}
    // the embedding floor: rings at cosine 0.95 and 0.88, the pairs as dots at their distance
    if(k>=1){const a=k===1?e:1;ring(R,rad(.95),P.c2,a*.9);ring(R,rad(.88),P.mute,a*.7,[5,4]);
      R.label([rad(.95)*.71,.02,-rad(.95)*.71],'cosine 0.95',{mono:true,fs:12,dy:-10,c:P.c2,a:k===1?Math.max(0,(e-.65)/.35):1,wide:1});
      R.label([rad(.88)*.71,.02,-rad(.88)*.71],'0.88',{mono:true,fs:12,dy:-10,c:P.mute,a:k===1?Math.max(0,(e-.65)/.35):1});
      if(k===1){R.ball([0,.12,0],.14,{c:P.bad,a:e});R.label([0,.12,0],'cosine 1.00 · distance 0',{mono:true,fs:12,dy:-16,b:1,c:P.bad,a:Math.max(0,(e-.65)/.35)})}}
    if(k>=2){pts.forEach(({r,p},i)=>{const inB=k===2?r.s>=.95:k===3?(r.s<.95&&r.lab):1,a=(r.ng?.22:inB?1:.22)*(k===2?Math.min(1,e*1.5+i/T.length*.2):1);
      R.ball(p,.1,{c:col(P,r),a});if(!r.lab)R.ball(p,.06,{c:P.card,a})})}
    if(k===2)R.label([0,.1,rad(.95)],hi.length+' missed by n-grams inside 0.95',{mono:true,fs:12,dy:18,b:1,c:P.ink,a:e});
    if(k===3)R.label([0,.1,rad(.88)],mid.length+' labelled between 0.88 and 0.95',{mono:true,fs:12,dy:18,b:1,c:P.ink,a:e});
    // 5. the judge: pairs flow up into it, its verdicts by label as columns
    if(k===4){const jx=5,jy=1.5,ja=Math.max(0,(e-.55)/.45);R.glass([jx-1.1,jy,-.9],[2.2,0,0],[0,0,1.8],{c:P.c4,nu:4,nv:4,a:ja});R.label([jx,jy,0],R.W<520?'judge':'judge · Qwen3-1.7B',{fs:12.5,b:1,dy:-14,c:P.c4,a:ja});
      pts.filter((_,i)=>i%5===0).forEach(({r,p})=>R.flowArc(p,[jx,jy,0],.3,{c:col(P,r)===P.paper?P.mute:col(P,r),a:.7*ja,r:.045,n:4,speed:1.1}));
      const HB=1.15/Math.max(jc[0]+jc[1],jo[0]+jo[1]);
      [[jx-.95,'copy',jc,P.bad],[jx+.95,'not a copy',jo,P.c5]].forEach(([x,nm,[s,d],c])=>{const hs=s*HB*ja,hd=d*HB*ja,ZJ=2.2,la=Math.max(0,(e-.8)/.2);
        R.box([x-.36,0,ZJ],[.55,Math.max(.01,hs),.55],{fill:c,a:Math.min(1,ja*3)});R.box([x+.36,0,ZJ],[.55,Math.max(.01,hd),.55],{fill:mix(P.paper,P.mute,.35),a:Math.min(1,ja*3)});
        R.label([x-.36,hs,ZJ],'same '+s,{mono:true,fs:12,dy:-12,c,a:la,al:'right',dx:4,wide:1});R.label([x+.36,hd,ZJ],'diff. '+d,{mono:true,fs:12,dy:-12,c:P.mute,a:la,al:'left',dx:-4,wide:1});
        R.label([x,0,ZJ],nm,{mono:true,fs:12,dy:20,b:1,c,a:ja})})}
  }
  const full={cam:[.2,.78],bounds:[[-3.8,0,-3.8],[3.8,.3,3.8]]};
  S3.stage({id:'stg-emb',list:'sx-emb',fig:'Fig. 3 · nearest prompts in embedding space',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4600,draw,
    view:k=>k===0?{cam:[.15,.42],bounds:[[-3.4,0,-.3],[3.4,1.6,1.4]]}:k===1?{cam:[.18,.6],bounds:[[-3.6,0,-3.6],[3.6,1.4,3.6]]}:k===4?{cam:[.2,.62],bounds:[[-3.8,0,-3.8],[7.4,1.7,3.8]]}:full});
  // the step list's counts, from the same data
  const L=rs=>{const o=['copy','variant','similar','unlabelled'].map(l=>[cnt(rs,l),l]).filter(x=>x[0]);return o.map(([n,l])=>n+' '+(l==='copy'?(n===1?'copy':'copies'):l==='variant'?(n===1?'variant':'variants'):l)).join(', ').replace(/, ([^,]+)$/,' and $1')};
  $('emb-ntok').textContent=tok.length;$('emb-ng').textContent=ngc;$('emb-hi').textContent=hi.length;$('emb-hic').textContent=L(hi);
  $('emb-mid').textContent=L(mid);
  $('emb-j1').textContent=jc[0]+' of '+(jc[0]+jc[1]);$('emb-j2').textContent=jo[0]+' of '+(jo[0]+jo[1]);
})();
