// ---- Scene, Fig. 7 (section 8): one 2 MiB stretch with 4 KiB pages (left) and as one transparent huge page (right) (renderer v2) ----
// Left: a level-2 entry, a level-3 table of 512 entries and 512 pages (a 16 x 32 lattice on the floor); right: the level-2 entry maps one 2 MiB block.
// The measured numbers (VM_DATA.first_write, bloat, fork, pte) are written into the step list's spans here.
(function(){
  if(!document.getElementById('stg-huge')||!window.VM_DATA)return;const {at,off,lerp,mix}=S3,D=VM_DATA,F=D.first_write;
  const fmt=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const fk=(k,m)=>D.fork.find(x=>x.kind===k&&x.mib===m).us,tm=us=>us>=1000?fmt(us/1000,1)+' ms':fmt(us)+' us';
  const set=(c,v)=>document.querySelectorAll('.'+c).forEach(x=>x.textContent=v);
  set('vm-f4',fmt(F['4k'].faults));set('vm-f4ms',fmt(F['4k'].ms_median,1));set('vm-fh',fmt(F.thp.faults));set('vm-fhms',fmt(F.thp.ms_median,1));
  set('vm-fk256',tm(fk('4k',256)));set('vm-fk256h',tm(fk('thp',256)));set('vm-fk1gh',tm(fk('thp',1024)));
  const XL=-2.5,XR=2.5,SZ=2.2,ZG=-.6,Y2=2.25,Y3=1.25;
  // the 2 MiB region on the floor: x across 16 columns, z across 32 rows
  const reg=(x0,frac,P,R,a,col)=>{const r=Math.floor(frac*32),w=SZ,d=SZ;
    R.glass([x0-w/2,.005,ZG-d/2],[w,0,0],[0,0,d],{c:P.c3,nu:16,nv:16,a:.55*a,th:.01});
    if(r>0)R.quad([[x0-w/2,.012,ZG-d/2],[x0+w/2,.012,ZG-d/2],[x0+w/2,.012,ZG-d/2+d*r/32],[x0-w/2,.012,ZG-d/2+d*r/32]],{fill:col,a:a*.85,ec:col})};
  function draw(R,k,e){const P=R.P,nar=R.W<520,G=mix(P.paper,P.c3,.55);R.grid(-5,5,-2.2,2.4,.5);
    // the level-2 entries
    [[XL,'4 KiB pages'],[XR,'one 2 MiB huge page']].forEach(([x,t],j)=>{R.glass([x-.8,Y2,ZG-.5],[1.6,0,0],[0,0,1.0],{c:P.c1,nu:8,nv:4,a:.8});
      R.box([x,Y2+.01,ZG],[.2,.08,.25],{fill:P.c1,shadow:false});R.label([x,Y2+.1,ZG-.5],nar?(j?'2 MiB page':'4 KiB pages'):'level 2 · '+t,{fs:12.5,b:1,dy:-10,c:P.c1})});
    // left: the level-3 table, 512 entries
    const l3=k===4?1:k===5?.9:.75;R.glass([XL-SZ/2,Y3,ZG-SZ/2],[SZ,0,0],[0,0,SZ],{c:P.c5,nu:16,nv:16,a:l3});
    R.label([XL-SZ/2,Y3,ZG],'level 3 table · 512 entries',{al:'right',dx:-6,fs:12.5,b:1,c:P.c5,wide:1});
    R.line([[XL,Y2,ZG],[XL,Y3+.02,ZG]],{c:P.c1,w:1.6});R.line([[XL,Y3,ZG],[XL,.02,ZG]],{c:P.c5,w:1,dash:[4,4],a:.6});
    R.line([[XR,Y2,ZG],[XR,.3,ZG]],{c:P.c1,w:1.6});
    // the memory: left fills page by page, right all at once
    const fl=k===0?0:k===1?e:k===3?1/32:1,fr=k===0?0:k===1?(e>.15?1:0):1;
    reg(XL,fl,P,R,1,G);if(k===3){R.quad([[XL-SZ/2,.014,ZG-SZ/2],[XL-SZ/2+SZ/16,.014,ZG-SZ/2],[XL-SZ/2+SZ/16,.014,ZG-SZ/2+SZ/32],[XL-SZ/2,.014,ZG-SZ/2+SZ/32]],{fill:P.c2,ec:P.c2})}
    R.glass([XR-SZ/2,.005,ZG-SZ/2],[SZ,0,0],[0,0,SZ],{c:P.c3,nu:1,nv:1,a:.55,th:.01});if(fr>0)R.box([XR,0,ZG],[SZ,.28,SZ],{fill:k===3?mix(P.paper,P.c2,.55):G,a:fr,shadow:false});
    if(k===1){R.flow([[XL,Y3,ZG],[XL-SZ/2+SZ*((Math.floor(e*512)%16)+.5)/16,.05,ZG-SZ/2+SZ*e]],{c:P.c3,a:1,r:.05,n:3});R.flow([[XR,Y2,ZG],[XR,.35,ZG]],{c:P.c3,a:e,r:.08,n:5});
      R.label([XL,0,ZG+SZ/2],Math.round(e*512)+' of 512 faults',{mono:true,fs:12.5,b:1,dy:16,c:P.c3});R.label([XR,0,ZG+SZ/2],'1 fault',{mono:true,fs:12.5,b:1,dy:16,c:P.c3,a:e})}
    // TLB entries needed to cover the stretch
    if(k===2){const ta=e;for(let i=0;i<32;i++)R.box([XL-1.4+(i%16)*.18,0,1.5+Math.floor(i/16)*.2],[.14,.12,.14],{fill:mix(P.paper,P.c2,.5),a:ta,shadow:false});
      R.box([XR,0,1.6],[.3,.2,.3],{fill:mix(P.paper,P.c2,.6),a:ta});
      R.label([XL,0,1.95],'512 TLB entries (32 drawn)',{fs:12.5,b:1,dy:16,c:P.c2,a:ta});R.label([XR,0,1.85],'1 TLB entry',{fs:12.5,b:1,dy:16,c:P.c2,a:ta})}
    if(k===3){R.label([XL,0,ZG+SZ/2],fmt(D.bloat['4k'])+' KiB resident (256 MiB run)',{fs:12.5,b:1,dy:16,c:P.c2,wide:1});R.label([XR,0,ZG+SZ/2],fmt(D.bloat.thp)+' KiB resident',{fs:12.5,b:1,dy:16,c:P.c2,wide:1})}
    // fork copies the entries
    if(k===4){const cl=[XL,0,1.7];R.glass([cl[0]-SZ/2,.25,1.15],[SZ,0,0],[0,0,1.0],{c:P.c5,nu:16,nv:8,a:e});
      R.flow([[XL,Y3,ZG+SZ/2],[XL,.6,1.4]],{c:P.c5,a:e,r:.07,n:10});R.label([XL,.25,2.15],'512 entries copied · '+tm(fk('4k',256))+' at 256 MiB',{fs:12.5,b:1,dy:14,c:P.c5,a:e});
      R.box([XR,.3,1.6],[.2,.08,.25],{fill:P.c1,a:e,shadow:false});R.flow([[XR,Y2,ZG+.5],[XR,.4,1.55]],{c:P.c1,a:e,r:.07,n:6});R.label([XR,.3,1.85],'1 entry copied · '+tm(fk('thp',256)),{fs:12.5,b:1,dy:14,c:P.c1,a:e})}
    // a spare table deposited per huge page
    if(k===5){R.glass([XR+SZ/2+.2,Y3,ZG-SZ/2],[1.3,0,0],[0,0,SZ],{c:P.c5,nu:8,nv:16,a:e*.8});R.label([XR+SZ/2+.85,Y3,ZG-SZ/2],'deposited spare table',{fs:12.5,b:1,dy:-10,c:P.c5,a:e,al:'right'});
      R.label([0,0,ZG+SZ/2+.3],'VmPTE after 1 GiB: '+fmt(D.pte['4k'])+' KiB with either',{fs:12.5,b:1,dy:16,c:P.c5,a:e})}
  }
  const full={cam:[.12,.4],bounds:[[-4.2,0,-1.8],[4.4,2.5,2.0]]};
  S3.stage({id:'stg-huge',list:'sx-huge',fig:'Fig. 7 · 512 entries or one',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:4800,draw,
    view:()=>innerWidth<520?{cam:[.55,.5],bounds:full.bounds}:null,
    margin:w=>w<520?[22,8,22,8]:[28,14,24,14]});
})();
