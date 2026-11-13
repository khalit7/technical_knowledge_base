// ---- Scene: an iterator chain pulled from the end (section 5; renderer v2: a few large objects, glass stages, flowing dots for pulls and items) ----
// Replays out/l_lazy.txt (lazy.rs, recorded): RA_DATA.lazy. Which words the filter kept or dropped, which reached the map, the order of the calls,
// the eager run's two Vecs and where take(2) stopped are all read from the trace; positions are illustrative.
(function(){
  if(!document.getElementById('stg-lazy')||!window.RA_DATA||!RA_DATA.lazy)return;const {at,off,lerp,lerp3,mix,cl}=S3;
  const T=RA_DATA.lazy.split('\n');
  // split the trace into its three runs; each event: {f:'filter'|'map', w:word, keep}
  const runs={lazy:[],eager:[],take:[]};let cur=null;
  T.forEach(l=>{if(/^lazy: chain built/.test(l))cur='lazy';else if(/^lazy: collect returned/.test(l))cur='eager';else if(/^eager: second Vec/.test(l))cur='take';
    const m=l.match(/^\s+(filter|map)\s+(\S+)\s+(keep|drop|->)/);if(m&&cur)runs[cur].push({f:m[1],w:m[2],keep:m[3]!=='drop'})});
  const SIZE=(RA_DATA.lazy.match(/one value of (\d+) bytes/)||[])[1];
  const WORDS=runs.lazy.filter(x=>x.f==='filter').map(x=>x.w),KEEP=runs.lazy.filter(x=>x.f==='filter').map(x=>x.keep);
  const NT=runs.take.filter(x=>x.f==='filter').length,NTM=runs.take.filter(x=>x.f==='map').length;
  // the lazy steps, grouped by word (step 2: the first word, 3: the second, 4: the next two, 5: the rest)
  const GROUPS=[[0],[1],[2,3],[4,5,6]];
  const XS=-5.0,XF=-1.6,XM=1.0,XV=4.2,XE=-.3,ZW=i=>1.8-i*.6,ZV=i=>1.5-i*.6,YW=.3;
  const kept=i=>WORDS.slice(0,i).filter((_,j)=>KEEP[j]).length; // Vec slot of word i
  function word(R,p,t,c,a,o){o=o||{};R.box(p,[.78,.26,.36],{fill:mix(R.P.paper,c,.4),a,shadow:p[1]<.05,lw:.6});R.label([p[0],p[1]+.26,p[2]],t,{mono:true,fs:12,dy:-7,a:o.la==null?a:o.la,b:o.b,wide:o.src})}   // src: a word resting in the source; on a phone its name is in the step text
  function stageBox(R,x,name,c,a,hi,low){R.glass([x,.02,-.75],[0,0,1.5],[0,.95,0],{c,a:a*(hi?1:.6),nu:3,nv:3});R.label(low?[x,0,.75]:[x,1.0,0],name,{mono:true,fs:12.5,b:1,dy:low?18:-8,c,a})}
  // the path a word takes: from its place in the source, through filter and map, to its Vec slot (or off the filter, if dropped)
  function path(i,slotX,slotZ,drop){const s=[XS,0,ZW(i)],a=[XS+1.5,YW,0],f=[XF,YW,0];if(drop)return [s,a,f,[XF+.2,0,1.2]];return [s,a,f,[XM,YW,0],[slotX-.9,YW,0],[slotX,0,slotZ]]}
  function along(pts,u){const L=[];let tot=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1],pts[i][2]-pts[i-1][2]);L.push(d);tot+=d}
    let d=cl(u,0,1)*tot,j=0;while(j<L.length-1&&d>L[j]){d-=L[j];j++}return lerp3(pts[j],pts[j+1],L[j]?d/L[j]:1)}
  function draw(R,k,e){const P=R.P,C=P.c1,PULL=P.mute,F=P.c3,M=P.c4,BAD=P.bad;R.grid(-6,6,-3,3,.5);
    const eager=k===5||k===6,take=k===7,lazyA=k<=4?1:k===5?1-e:0;
    // the chain itself: one value, three nested stages on one plate
    const pa=k===0?1:.5;
    R.glass([XS-.8,.01,-2.4],[XM-XS+1.6,0,0],[0,0,4.7],{c:C,a:(eager?.15:.35)*(k===0?1:.6),nu:1,nv:1,th:.01});
    if(k===0)R.label([(XS+XM)/2,0,2.3],'one value, '+SIZE+' bytes'+(R.W<520?'':': Map<Filter<Iter<&str>, closure>, closure>'),{mono:true,fs:12.5,b:1,dy:20,c:C,a:e});
    stageBox(R,XS+1.5,'Iter',P.ink,1,k===0,1);stageBox(R,XF,'Filter',F,1,k===0||k===2);stageBox(R,XM,'Map',M,eager?.4:1,k===0);
    if(!eager){R.glass([XV-.5,.02,-2.3],[1.0,0,0],[0,0,4.4],{c:C,a:.3,nu:1,nv:6,th:.01});R.label([XV,0,-2.3],take?'take(2) · collect: a Vec':'collect: a Vec',{mono:true,fs:12.5,b:1,dy:-14,c:C})}
    // the source words
    let moving=[];
    if(k>=1&&k<=4){const g=GROUPS[k-1];moving=g.map((i,j)=>({i,u:cl(e*g.length-j,0,1)}))}
    if(k<=4)WORDS.forEach((w,i)=>{const m=moving.find(x=>x.i===i),inSrc=k===0||i>=GROUPS[k-1][0]&&!(m&&m.u>0);if(inSrc)word(R,[XS,0,ZW(i)],w,C,1,{src:1})});
    // lazy: words already through sit in the Vec (or were dropped)
    if(k>=1&&k<=5){const upto=k===5?7:GROUPS[k-1][0];
      for(let i=0;i<upto;i++)if(KEEP[i])word(R,[XV,0,ZV(kept(i))],WORDS[i].toLowerCase(),C,lazyA);
      moving.forEach(({i,u})=>{if(u<=0)return;const pull=cl(u*4,0,1),go=cl(u*1.35-.35,0,1),drop=!KEEP[i];
        // the pull: collect asks map, map asks filter, filter asks the slice (dots run right to left)
        if(u<.3)R.flow([[XV-.6,YW+.5,0],[XM,YW+.5,0],[XF,YW+.5,0],[XS+.6,YW+.5,0]],{c:PULL,a:.9*(1-cl((u-.22)*12,0,1)),r:.05,n:8,speed:2});
        const pts=path(i,XV,ZV(kept(i)),drop),p=along(pts,go),past=p[0]>XM-.2,a=drop&&go>.7?1-(go-.7)/.3:1;
        if(go>0&&go<1||drop&&go<1)word(R,p,past?WORDS[i].toLowerCase():WORDS[i],drop?BAD:C,a,{b:1});
        if(go>0&&go<1)R.flow(pts.slice(0,3).concat(drop?[pts[3]]:pts.slice(3)),{c:drop?BAD:C,a:.35,r:.04,n:10,speed:1.4});
        if(go>=1&&!drop)word(R,[XV,0,ZV(kept(i))],WORDS[i].toLowerCase(),C,1,{b:1});
        if(drop&&go>.3)R.label([XF,YW,0],'"'+WORDS[i]+'" dropped: map never sees it',{fs:12.5,b:1,dy:46,c:BAD,a:cl(go*2-.6,0,1)})});
      if(k===4&&e>.92)R.label([XV,0,ZV(6)],'next() → None · 6 words',{fs:12.5,b:1,dy:24,c:C,a:(e-.92)/.08})}
    // eager: filter all 7 into a first Vec, then map all 6 into a second
    if(eager){const ea=k===5?e:1,nf=runs.eager.filter(x=>x.f==='filter').length,nm=runs.eager.filter(x=>x.f==='map').length;
      const kept1=runs.eager.filter(x=>x.f==='filter'&&x.keep).map(x=>x.w);
      // source words leave one by one through the filter
      const fdone=k===5?Math.floor(e*nf+.0001):nf;
      WORDS.forEach((w,i)=>{if(i>=fdone)word(R,[XS,0,ZW(i)],w,C,1,{src:1})});
      R.glass([XE-.5,.02,-2.3],[1.0,0,0],[0,0,4.4],{c:F,a:.5*ea,nu:1,nv:6,th:.01});R.label([XE,0,-2.3],'first Vec · '+kept1.length,{fs:12.5,b:1,dy:-14,c:F,a:ea});
      kept1.forEach((w,j)=>{if(k===5&&kept(WORDS.indexOf(w))>=0&&j>=Math.round(e*kept1.length))return;word(R,[XE,0,ZV(j)],w,F,k===6?.6:1)});
      if(k===5)R.flow([[XS+.6,YW,0],[XF,YW,0],[XE,YW,0]],{c:F,a:.8,r:.06,n:9});
      if(k===6){const mdone=Math.round(e*nm);R.glass([XV-.5,.02,-2.3],[1.0,0,0],[0,0,4.4],{c:M,a:.5,nu:1,nv:6,th:.01});R.label([XV,0,-2.3],'second Vec · '+nm,{fs:12.5,b:1,dy:-14,c:M});
        kept1.forEach((w,j)=>{if(j<mdone)word(R,[XV,0,ZV(j)],w.toLowerCase(),M,1)});R.flow([[XE,YW,0],[XM,YW,0],[XV,YW,0]],{c:M,a:.8,r:.06,n:9})}
      R.label([XM,YW,0],k===5?'filter × '+nf:'map × '+nm,{fs:13,b:1,dy:44,c:k===5?F:M,a:ea})}
    // take(2): pulled until two words are out, the rest never read
    if(take){const sel=WORDS.slice(0,NT),kt=sel.filter((_,i)=>KEEP[i]),u=e;
      WORDS.forEach((w,i)=>{if(i>=NT)word(R,[XS,0,ZW(i)],w,P.mute,.9,{la:1,src:1});else if(u<(i+1)/NT)word(R,[XS,0,ZW(i)],w,C,1-cl((u*NT-i)*2,0,1),{src:1})});
      kt.forEach((w,j)=>{if(u>=(j+1)/kt.length*.95)word(R,[XV,0,ZV(j)],w.toLowerCase(),C,1,{b:1})});
      if(u<.9)R.flow([[XS+.6,YW,0],[XF,YW,0],[XM,YW,0],[XV-.6,YW,0]],{c:C,a:.6,r:.05,n:10});
      R.label([XS,0,ZW(0)],(WORDS.length-NT)+' words never read',{fs:12.5,b:1,dy:30,c:P.mute,a:cl(u*2-1,0,1)});
      R.label([XM,YW,0],'filter × '+NT+' · map × '+NTM,{fs:13,b:1,dy:44,c:C,a:cl(u*2-1,0,1)})}
  }
  const full={cam:[.62,.58],bounds:[[-5.6,0,-2.4],[4.8,1.2,2.4]]};
  S3.stage({id:'stg-lazy',list:'sx-lazy',fig:'An iterator chain, pulled one word at a time',cam:full.cam,bounds:full.bounds,aspect:.6,dur:2600,hold:4800,draw,
    // on a phone the camera looks further down, so the stacked words and the stages spread apart
    view:k=>{const ph=innerWidth<560;return k===0?{cam:[.62,ph?.85:.55],bounds:[[-5.6,0,-2.4],[2.4,1.2,2.4]]}:ph?{cam:[.62,.85],bounds:full.bounds}:full},
    margin:w=>w<520?[28,10,16,10]:[30,14,18,14]});
})();
