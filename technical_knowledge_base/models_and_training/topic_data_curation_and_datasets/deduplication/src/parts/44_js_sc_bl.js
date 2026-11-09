// ---- Scene (Reading 7, Fig. 4): a Bloom filter of 16 bits and 3 hash functions (illustrative hash values; renderer v2) ----
// Two lines are added ("Home" to bits 2, 7, 11; "Search" to 4, 7, 13), then a new line "Login" (2, 4, 13) is tested and every one of its bits is already set.
(function(){
  if(!document.getElementById('stg-bl'))return;const {at,off,lerp,mix}=S3;
  const M=16,IT=[['Home',[2,7,11]],['Search',[4,7,13]],['Login',[2,4,13]]],BW=.52,ZB=0,ZI=-1.5,YI=1.5;
  const bx=i=>(i-(M-1)/2)*BW,ix=j=>[-2.6,0,2.6][j];
  function draw(R,k,e){const P=R.P;R.grid(-4.8,4.8,-1.2,2.8,.5);
    R.glass([bx(0)-BW/2-.08,0,ZB-.35],[M*BW+.16,0,0],[0,0,.7],{c:P.c1,a:.6,nu:M,nv:1,th:.02});
    const set=new Set();if(k>=1)IT[0][1].forEach(b=>set.add(b));const s2=new Set(set);if(k>=2)IT[1][1].forEach(b=>s2.add(b));
    for(let i=0;i<M;i++){const was=set.has(i)&&k>=2,on1=k===1&&IT[0][1].includes(i),on2=k===2&&IT[1][1].includes(i)&&!set.has(i),now=s2.has(i);
      const t=on1||on2?e:now?1:0,h=lerp(.1,.55,t),test=k===3&&IT[2][1].includes(i);
      R.box([bx(i),0,ZB],[BW*.78,h,.46],{fill:t>.5?mix(P.paper,test?P.c2:P.c1,.6):P.paper,lw:.7});
      R.label([bx(i),0,ZB+.25],String(i),{mono:true,fs:12,dy:14,c:test?P.c2:P.mute,b:test,wide:1});
      if(test)R.glow([bx(i),h,ZB],.35,{c:P.c2,a:.8})}
    // the lines: added (1 and 2) or tested (3), each sending three streams of dots to its bits
    IT.forEach(([w,bits],j)=>{if(k<1||j>k-1){R.box([ix(j),YI-.2,ZI],[1.15,.4,.5],{a:.16,shadow:false});R.label([ix(j),YI+.2,ZI],'"'+w+'"',{fs:13,dy:-12,c:P.mute,a:.35});return}   // lines still to come, faintly
      const cur=j===k-1,p0=[ix(j),YI,ZI];
      const fp=j===2;R.box([p0[0],YI-.2,ZI],[1.15,.4,.5],{fill:fp?mix(P.paper,P.c2,.5):mix(P.paper,P.c1,cur?.45:.18),a:cur?1:.45,shadow:false});
      R.label([p0[0],YI+.2,ZI],'"'+w+'"',{fs:13,b:1,dy:-12,c:fp?P.c2:P.ink,a:cur?1:.55});
      if(cur)bits.forEach(b=>R.flowArc([p0[0],YI-.2,ZI+.25],[bx(b),.5,ZB],.3,{c:fp?P.c2:P.c1,r:.06,n:7,speed:1.5,a:Math.min(1,e*1.5)}));
      else bits.forEach(b=>R.arc([p0[0],YI-.2,ZI+.25],[bx(b),.5,ZB],.3,{c:P.c1,w:1,a:.22}))});
    const nset=k>=2?s2.size:k===1?3:0;
    R.label([0,0,ZB+.4],k===0?'16 bits, all 0 · 3 hash functions':k===3?(R.W<520?'"seen": a false positive':'bits 2, 4 and 13 all set: "seen", a false positive'):nset+' of 16 bits set',{mono:true,fs:12.5,b:1,dy:36,c:k===3?P.c2:P.ink,a:k===0?1:k===3?e:1});
  }
  S3.stage({id:'stg-bl',list:'sx-bl',fig:'Fig. 4 · a Bloom filter (illustrative)',cam:[0,.42],bounds:[[-4.3,0,-1.8],[4.3,1.9,.7]],aspect:.52,dur:1300,hold:4600,draw,margin:w=>w<520?[16,10,20,10]:[22,20,24,20]});
})();
