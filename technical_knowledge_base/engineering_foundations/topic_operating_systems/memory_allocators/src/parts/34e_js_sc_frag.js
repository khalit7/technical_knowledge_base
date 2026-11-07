// ---- Scene, Fig. 5 (section 5): src/exp/frag.c on glibc, a window of 17 pages (four gaps) of its heap, to scale (renderer v2) ----
// 400,000 blocks of 256 B are 272-byte chunks; all but every 64th are freed, so a survivor sits every 64 x 272 = 17,408 bytes (4.25 pages).
// Chunks are laid end to end from the window's first page (an illustrative alignment); a page is kept by malloc_trim when it holds a survivor or the
// free chunk's own header (struct malloc_chunk, 48 bytes on 64-bit), so 4 of these 17 pages stay. The RSS labels are measured (window.AD.frag.glibc).
(function(){
  if(!document.getElementById('stg-frag')||!window.AD)return;const {cl,lerp,mix}=S3;
  const F=AD.frag.glibc,fk=v=>v.toLocaleString('en-US');
  const RSS=[F['allocated 400,000 x 256 B'],F['freed all but every 64th'],F['malloc_trim(0) returned 1'],F['freed everything']];
  const PG=4096,CH=272,NP=17,NC=NP*PG/CH,PW=.66,X0=-NP*PW/2,bx=b=>X0+b/PG*PW;   // NC = 256 chunks
  const surv=[];for(let j=0;j<NC;j+=64)surv.push(j);
  const kept=new Set();surv.forEach(j=>{const a=j*CH,b=a+CH+48;for(let p=Math.floor(a/PG);p<=Math.floor((b-1)/PG);p++)kept.add(p)});
  function draw(R,k,e){const P=R.P;R.grid(-6.6,6.6,-1.6,2,.5);
    R.quad([[X0-.2,-.92,-1.1],[-X0+.2,-.92,-1.1],[-X0+.2,-.92,1.1],[X0-.2,-.92,1.1]],{fill:mix(P.paper,P.c5,.12),edge:false,a:k>=2?.9:0,dz:300});
    if(k>=2)R.label([-X0+.2,-.92,1.1],'returned to the kernel',{al:'right',dy:14,fs:12.5,b:1,c:P.c5,a:k===2?e:1});
    // pages: a dropped page sinks below the floor line and fades
    for(let p=0;p<NP;p++){const drop=k===2?!kept.has(p):k===3,t=drop?(k===2||k===3?cl(e*1.4,0,1):1):0;
      const y=lerp(0,-.9,t),a=lerp(1,.3,t),x=X0+(p+.5)*PW;
      R.box([x,y,0],[PW-.05,.06,1.8],{fill:drop?P.paper:mix(P.paper,P.c5,k>=2?.35:.12),a,shadow:false,lw:.7});
      if(drop&&t>.05&&t<.95)R.flow([[x,.1,.7],[x,-.85,.7]],{c:P.c5,r:.05,n:3,a:1-t})}
    // chunks: live ones stand tall, freed ones lie flat and orange, merged into one free chunk per gap
    const fresh=k===1?cl(e*1.6,0,1):k>=1?1:0;
    for(let j=0;j<NC;j++){const s=surv.includes(j),x=bx(j*CH+CH/2);
      if(k===3&&s)continue;
      if(s||k===0||(k===1&&fresh<1)){const a=s?1:1-fresh,pg=Math.floor(j*CH/PG),y=k===2&&!kept.has(pg)?-.9:0;
        R.box([x,.06+y,0],[CH/PG*PW*.82,s?.45:.3,1.5],{fill:mix(P.paper,P.c5,s&&k>=1?.85:.6),a,shadow:false,lw:.5})}}
    if(k>=1&&k<3)surv.forEach((j,g)=>{const a0=(j+1)*CH,a1=Math.min((j+64)*CH,NP*PG);
      // the free chunk of a gap, cut into its page pieces so the pages that stay keep their part
      for(let p=Math.floor(a0/PG);p<=Math.floor((a1-1)/PG);p++){const lo=Math.max(a0,p*PG),hi=Math.min(a1,(p+1)*PG),drop=k===2&&!kept.has(p),t=drop?cl(e*1.4,0,1):0;
        R.box([bx((lo+hi)/2),.06+lerp(0,-.9,t),0],[(hi-lo)/PG*PW-.01,.1,1.5],{fill:mix(P.paper,P.c2,.6),a:fresh*lerp(1,.2,t),shadow:false,lw:.5})}});
    surv.forEach(j=>{if(k>=1&&k<3)R.label([bx(j*CH+CH/2),.51,0],'live',{dy:-9,fs:12,b:1,c:P.c5,wide:1})});
    const v=k===0?RSS[0]:k===1?RSS[1]:k===2?Math.round(lerp(RSS[1],RSS[2],cl(e*1.4,0,1))):Math.round(lerp(RSS[2],RSS[3],cl(e*1.4,0,1)));
    R.label([X0,0,-.9],['allocated and touched','98% freed','after malloc_trim(0)','everything freed'][k]+': RSS '+fk(k===2&&e>.7?RSS[2]:k===3&&e>.7?RSS[3]:v)+' KiB',{al:'left',dy:-34,fs:13,b:1,c:k===1?P.c2:P.c5});
    R.label([X0-.2,-.92,1.1],'one page: 4 KiB, about 15 chunks of 272 B',{al:'left',dy:14,fs:12,c:P.mute,wide:1});
  }
  S3.stage({id:'stg-frag',list:'sx-frag',fig:'Fig. 5 · 17 pages of glibc heap, to scale',cam:[.1,.55],bounds:[[-6,-.95,-1.1],[6,.7,1.2]],aspect:.5,dur:1700,hold:4800,draw,
    margin:w=>w<520?[34,8,24,8]:[40,14,26,14]});
})();
