// ---- Scene (Reading 6, Fig. 3): a word-level suffix array of two tiny illustrative pages, computed here (renderer v2) ----
// The two pages lie on the floor as word tiles; each suffix is a plate of its words, stacked in page order, then sorted;
// neighbours sharing at least L = 4 leading words light up, map back to both pages, and the span is cut.
(function(){
  if(!document.getElementById('stg-sa'))return;const {at,off,lerp,mix}=S3;
  const Lmin=4,PA='fresh bread every day we use cookies to improve your experience',PB='cheap flights to rome we use cookies to improve your experience';
  // one token stream with a unique separator after each page, so no match can cross a boundary
  const tok=[],doc=[],wi=[];PA.split(' ').forEach((w,i)=>{tok.push(w);doc.push(0);wi.push(i)});tok.push('$A');doc.push(0);wi.push(-1);
  PB.split(' ').forEach((w,i)=>{tok.push(w);doc.push(1);wi.push(i)});tok.push('$B');doc.push(1);wi.push(-1);
  const cmp=(i,j)=>{while(i<tok.length&&j<tok.length){if(tok[i]!==tok[j])return tok[i]<tok[j]?-1:1;i++;j++}return (tok.length-i)-(tok.length-j)};
  const starts=[...tok.keys()].filter(i=>!tok[i].startsWith('$')),sa=starts.slice().sort(cmp),rank={};sa.forEach((i,r)=>rank[i]=r);
  const lcp=(i,j)=>{let n=0;while(i+n<tok.length&&j+n<tok.length&&tok[i+n]===tok[j+n]&&!tok[i+n].startsWith('$'))n++;return n};
  const LC=sa.map((i,r)=>r?lcp(sa[r-1],i):0);                   // LCP with the suffix above in sorted order
  const hit=sa.map((_,r)=>LC[r]>=Lmin||(r+1<sa.length&&LC[r+1]>=Lmin));
  const nA=PA.split(' ').length,shared=PA.split(' ').map((w,i)=>i>=4);   // the cookie sentence: words 5 to 11 of both pages
  const span=new Set();sa.forEach((i,r)=>{if(LC[r]>=Lmin){const a=sa[r-1];for(let t=0;t<LC[r];t++){span.add(i+t);span.add(a+t)}}});
  const sufLen=i=>{let n=0;while(!tok[i+n].startsWith('$'))n++;return n};
  const TP=.44,X0=-2.6,ZF=[2.6,1.7],YS=.25,DY=.3,ZS=-.4;
  const first=i=>{const w=[];for(let t=i;!tok[t].startsWith('$')&&w.length<3;t++)w.push(tok[t]);return w.join(' ')+(sufLen(i)>3?' …':'')};
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-1.5,3.2,.5);
    // 1: the two pages on the floor, word tiles with their separators
    const cut=k===5?e:0,pa=k===1?1-e:k===2||k===3?0:k===4?e:1;
    tok.forEach((w,i)=>{const d=doc[i],x=X0+TP*(wi[i]<0?nA:wi[i]),z=ZF[d],sep=wi[i]<0,inS=span.has(i)&&k>=4;
      const gone=inS&&d===1?cut:0,fill=sep?mix(P.paper,P.ink,.25):inS?mix(P.paper,P.c2,.65):shared[wi[i]]?mix(P.paper,P.c1,.3):P.paper;
      R.box([x,-gone*.4,z],[TP*.86,.08,.5],{fill,a:pa*(1-gone*.85),shadow:!gone,lw:.6});
      if(inS&&k===4)R.glow([x,.1,z],.3,{c:P.c2,a:.7*e})});
    const pl=k===4?0:pa;R.label([X0-TP/2,0,ZF[0]],'page A',{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.ink,a:pl});
    R.label([X0-TP/2,0,ZF[1]],'page B',{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.ink,a:pl});
    // 2 and 3: every suffix as a plate of its words, stacked in page order, then sorted
    const ghost=k===0,sa0=k===0?.1:k===1?lerp(.1,1,e):1,NR=sa.length-1;   // step 1 shows the stack still to come, faintly
    const srt=k===2?e:k>=3?1:0,fade=k>=4?.3:1;
    starts.forEach((i,q)=>{const r=rank[i],y=YS+DY*(NR-lerp(q,r,srt)),n=sufLen(i),lit=k>=3&&hit[r];
      for(let t=0;t<n;t++){const inP=lit&&t<Math.max(LC[r],r+1<sa.length?LC[r+1]:0)&&t<Lmin+3,fill=inP?mix(P.paper,P.c2,.6):doc[i]?mix(P.paper,P.c6,.25):mix(P.paper,P.c1,.22);
        R.box([X0+TP*t,y,ZS],[TP*.86,DY*.62,.3],{fill,a:sa0*(lit?1:fade*(k>=3?.45:1)),shadow:false,lw:.5})}
      if(!ghost)R.label([X0-TP/2,y+DY*.3,ZS],(doc[i]?'B · ':'A · ')+first(i),{al:'right',dx:-6,mono:true,fs:12,c:lit?P.c2:P.ink,a:sa0*(lit?(k===5?0:1):k>=4?0:k===3?.6:.85),grp:'suf',b:lit});
      if(k>=3&&r>0)R.label([X0+TP*10.8,y+DY*.3,ZS],String(LC[r]),{al:'left',mono:true,fs:12,b:LC[r]>=Lmin,c:LC[r]>=Lmin?P.c2:P.mute,a:k>=4?0:(k===3?e:1)*(LC[r]>=Lmin?1:.8),grp:'lcp'})});
    if(k===3)R.label([X0+TP*10.8,YS+DY*sa.length+.1,ZS],'LCP',{al:'left',mono:true,fs:12,b:1,c:P.mute,a:e,wide:1});
    if(k===1||k===2)R.label([X0+TP*5,YS+DY*sa.length+.1,ZS],k===1?sa.length+' suffixes, in page order':'sorted by the text that follows',{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a:k===1?e:1});
    // 5: the matched rows point back into both pages
    if(k===4)sa.forEach((i,r)=>{if(LC[r]<Lmin)return;[i,sa[r-1]].forEach(s=>{const y=YS+DY*(NR-rank[s]),x=X0+TP*wi[s],z=ZF[doc[s]];R.flowArc([X0,y,ZS],[x,.1,z],.4,{c:P.c2,a:.8,r:.05,n:6,speed:1.4})})});
    if(k===5)R.label([X0-TP/2,0,ZF[1]-.3],R.W<520?'cut from B':'cut from B · Dolma 3 keeps A’s copy',{al:'left',mono:true,fs:12.5,b:1,dy:-18,c:P.c2,a:e});
  }
  const top=YS+DY*sa.length+.2,stack={cam:[.32,.1],bounds:[[-3,0,-.6],[2.6,top,-.2]]},full={cam:[.3,.38],bounds:[[-3,0,-.6],[2.6,top,2.9]]},floor={cam:[.2,.8],bounds:[[-2.9,0,1.3],[2.7,.3,3]]};
  S3.stage({id:'stg-sa',list:'sx-sa',fig:'Fig. 3 · a suffix array of two pages (illustrative)',cam:full.cam,bounds:full.bounds,aspect:.78,dur:1500,hold:4600,draw,
    margin:w=>w<520?[16,10,14,10]:[22,40,18,210],view:k=>k>=1&&k<=3?stack:full});
})();
