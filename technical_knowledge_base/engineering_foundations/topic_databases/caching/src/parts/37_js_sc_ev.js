// ---- Scene, Fig. 3 (section 5): LRU against LFU on the same 17 requests, a cache of four keys each (renderer v2) ----
// Illustrative request sequence over three of the real hour's most viewed pages (CA.skew.top: Main_Page, Special:Search, Wikipedia:Featured_pictures)
// and four pages read once (55% of that hour's pages were). Front row LRU, ordered by last use (left newest; the rightmost is the next victim);
// back row LFU, box height = uses, ordered by uses (ties: older use leaves first). Each step plays one stretch of requests; hits counted per row.
(function(){
  if(!document.getElementById('stg-ev')||!window.CA)return;const {at,off,lerp,mix}=S3;
  const CAP=4,STR=[[],['A','B','A','C','B','A','A','C','B'],['s1','s2','s3','s4'],['A','B','C','A'],[]];
  const SEQ=[].concat(...STR),OFF=STR.map((_,i)=>STR.slice(0,i).reduce((s,x)=>s+x.length,0));
  // simulate both policies; snap[t] is the state after t requests
  const snap=[{lru:[],lfu:[],h:[0,0],last:{}}];
  SEQ.forEach((key,t)=>{const p=snap[t],lru=p.lru.slice(),lfu=p.lfu.map(x=>({...x})),h=p.h.slice(),last={...p.last};
    const i=lru.indexOf(key);let ev=[null,null],hit=[i>=0,false];
    if(i>=0){lru.splice(i,1);h[0]++}else if(lru.length>=CAP)ev[0]=lru.pop();lru.unshift(key);
    const j=lfu.findIndex(x=>x.k===key);
    if(j>=0){lfu[j].c++;h[1]++;hit[1]=true}else{if(lfu.length>=CAP){let v=0;lfu.forEach((x,m)=>{if(x.c<lfu[v].c||(x.c===lfu[v].c&&last[x.k]<last[lfu[v].k]))v=m});ev[1]=lfu[v].k;lfu.splice(v,1)}lfu.push({k:key,c:1})}
    last[key]=t;lfu.sort((a,b)=>b.c-a.c||last[b.k]-last[a.k]);snap.push({lru,lfu,h,last,key,ev,hit})});
  const TOP=CA.skew.top,NM={A:TOP[0].title,B:TOP[1].title,C:TOP[2].title.replace('Wikipedia:','')};
  const XS=i=>-1.35+i*1.0,ZR=[1.1,-1.1],SRC=-2.9,BW=.72,BD=.72;
  function colOf(P,k){return k==='A'?P.c1:k==='B'?P.c6:k==='C'?P.c4:mix(P.paper,P.mute,.45)}
  function rowState(s,r){return r===0?s.lru.map(k=>({k,c:1})):s.lfu}
  function draw(R,k,e){const P=R.P;R.grid(-4.2,3.4,-2.4,2.4,.5);
    const seq=STR[k]||[],m=seq.length,u=m?Math.min(m-1e-6,e*m):0,i=Math.floor(u),f=m?u-i:1;
    const t0=OFF[k]+(m?i:0),A=snap[t0],B=m?snap[t0+1]:snap[t0],g=m?Math.max(0,Math.min(1,(f-.45)/.4)):1;
    [0,1].forEach(r=>{const z=ZR[r],sa=rowState(A,r),sb=rowState(B,r);
      // empty slots still to come, drawn faintly so the whole layout shows from the first step
      for(let s=0;s<CAP;s++)R.quad([[XS(s)-BW/2,.005,z-BD/2],[XS(s)+BW/2,.005,z-BD/2],[XS(s)+BW/2,.005,z+BD/2],[XS(s)-BW/2,.005,z+BD/2]],{ec:P.mute,lw:1.2,dash:[4,3],a:.75});
      const keys=new Set([...sa.map(x=>x.k),...sb.map(x=>x.k)]);
      keys.forEach(key=>{const ia=sa.findIndex(x=>x.k===key),ib=sb.findIndex(x=>x.k===key);
        const x=ia>=0&&ib>=0?lerp(XS(ia),XS(ib),g):ib>=0?XS(ib):XS(ia),ca=ia>=0?sa[ia].c:0,cb=ib>=0?sb[ib].c:ca;
        const c=lerp(ca||cb,cb,g),hh=r===0?.55:.22+.2*c,a=ib<0?1-g:ia<0?g:1,y=ib<0?.6*g:0;
        R.box([x,y,z],[BW,hh,BD],{fill:mix(P.paper,colOf(P,key),key[0]==='s'?.3:.55),a,lw:.8});
        R.label([x,hh+y,z],key,{fs:13,b:1,dy:-11,c:key[0]==='s'?P.mute:colOf(P,key),a});
        if(r===1&&a>.5)R.label([x,0,z+BD/2],'×'+Math.round(c),{mono:true,fs:12,dy:11,c:P.mute,a})});
      // the next victim: the rightmost box once the cache is full
      if(sb.length>=CAP)R.line([[XS(CAP-1)-BW/2-.05,.01,z+BD/2+.08],[XS(CAP-1)+BW/2+.05,.01,z+BD/2+.08]],{c:P.bad,w:2.5,a:.8});
      const hb=B.h[r],nb=OFF[k]+(m?i+1:0),xr=XS(CAP-1)+BW/2+.15,hc=k===3&&f>=.9||k>=4?(r===1?P.good:P.bad):P.ink;
      R.label([xr,.3,z],r===0?'LRU · order of last use':'LFU · height = uses',{al:'left',dx:6,dy:-9,mono:true,fs:12,b:1,wide:1,c:P.ink});
      R.label([xr,.3,z],(R.W<520?(r===0?'LRU ':'LFU '):'')+(nb?'hits '+hb+' of '+nb:'empty'),{al:'left',dx:6,dy:R.W<520?0:9,mono:true,fs:12.5,b:1,c:hc});
      // the request in flight: from the queue on the left into its slot (a hit glows green, a miss red)
      if(m&&f<.9){const key=seq[i],ib=sb.findIndex(x=>x.k===key),tx=XS(Math.max(0,ib)),q=Math.min(1,f/.45),hit=B.hit[r];
        const p=[lerp(SRC,tx,q),.9+.5*Math.sin(Math.PI*q),z];R.ball(p,.14,{c:colOf(P,key)});
        if(q>=1)R.glow([tx,.4,z],.55,{c:hit?P.good:P.bad,a:.7*(1-Math.max(0,(f-.6)/.3))});
        R.flow([[SRC,.9,z],[tx,.9,z]],{c:colOf(P,key),a:.35,r:.05,n:5,speed:1.6})}});
    // the queue of requests waiting, on the left
    if(m||k===0){const left=k===0?STR[1]:seq.slice(i+(f>=.45?1:0));left.slice(0,3).forEach((key,j)=>R.ball([SRC-.3-j*.3,.25,0],.12,{c:colOf(P,key),a:.9-.2*j}));
      if(left.length)R.label([SRC-.6,.25,0],'next: '+left.slice(0,5).join(' '),{mono:true,fs:12,dy:22,c:P.mute,wide:1})}
    if(k===0)R.label([0,0,0],'A '+NM.A+' · B '+NM.B+' · C '+NM.C,{mono:true,fs:12,c:P.mute,wide:1});
  }
  const full={cam:[.36,.6],bounds:[[-3.9,0,-1.5],[2.2,1.5,1.5]]};
  S3.stage({id:'stg-ev',list:'sx-ev',fig:'Fig. 3 · LRU and LFU on the same 17 requests',cam:full.cam,bounds:full.bounds,aspect:.58,dur:4200,hold:3600,draw,
    margin:w=>w<520?[16,108,14,6]:[18,200,16,20],
    view:k=>k===4?{cam:[.5,.55],bounds:[[-2,0,-1.5],[2.2,1.5,1.5]]}:full});
  window.CHK=window.CHK||{};CHK.ev={lru:snap[SEQ.length].h[0],lfu:snap[SEQ.length].h[1],n:SEQ.length,stretches:STR.map(s=>s.length)};
})();
