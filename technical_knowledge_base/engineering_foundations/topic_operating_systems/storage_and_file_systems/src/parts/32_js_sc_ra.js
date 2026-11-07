// ---- Scene, Fig. 2 (section 3): readahead measured, the first 128 reads of a cold 8 MiB file, 4 KiB at a time (renderer v2) ----
// Every device request is window.ST_DATA.ra[0].ev (io.stat read after every read(), measured); 24_js_rd_ra.js checks that the v5.10 rules predict each one.
// One tile per 4 KiB page of the file (16 per row, page 0 at the front left); a window fetched from the device streams up into the page cache.
(function(){
  if(!document.getElementById('stg-ra')||!window.ST_DATA)return;const {lerp,mix,cl}=S3,D=window.ST_DATA,run=D.ra[0];
  // ev: [read index, page read, pages fetched, requests]; the windows are contiguous, each starting where the last one ended (mm/readahead.c)
  let w0=0;const EV=run.ev.map(v=>{const r=[v[0],w0,v[2],v[3]];w0+=v[2];return r});
  const NP=128,COLS=16,TS=.35,X0=-2.8,Z0=-1.4,YP=1.7;
  const px=p=>X0+(p%COLS)*TS+TS/2,pz=p=>-Z0-Math.floor(p/COLS)*TS-TS/2;
  // reads done at the start and end of each step (stretches of the run); step 8 is the whole run
  const RNG=[[0,0],[0,1],[1,2],[2,5],[5,13],[13,29],[29,128],[128,128]];
  function draw(R,k,e){const P=R.P,[r0,r1]=RNG[k],n=k===7?NP:Math.round(lerp(r0,r1,e));R.grid(-4,4,-2.4,2.4,.5);
    // the device below, the page cache plate above
    R.box([0,0,2.45],[5.6,.45,.7],{fill:mix(P.paper,P.c6,.3),lw:1});R.label([2.8,.22,2.8],'device (virtual disk)',{al:'left',dx:8,fs:12.5,b:1,c:P.ink});
    R.glass([X0-.15,YP,Z0-.15],[COLS*TS+.3,0,0],[0,0,8*TS+.3],{c:P.c6,a:.7,nu:4,nv:2,th:.03,dz:6});
    R.label([0,YP,Z0-.15],'page cache: pages 0 to 127 of the file, 16 to a row',{dy:-14,fs:12.5,b:1,c:P.ink,wide:1});
    const fired=EV.filter(v=>v[0]<n),cur=new Set(EV.filter(v=>v[0]>=r0&&v[0]<n&&(k<7||v[0]>=r0)).map(v=>v[0]));
    const cached=new Map();fired.forEach(v=>{for(let p=v[1];p<v[1]+v[2]&&p<NP;p++)cached.set(p,cur.has(v[0])&&k<7?2:1)});
    const mark=fired.length&&k<7?(()=>{const l=fired[fired.length-1],nxt=EV.find(v=>v[0]>l[0]);return nxt?nxt[0]:-1})():-1;
    for(let p=0;p<NP;p++){const x=px(p),z=pz(p),c=cached.get(p);
      if(!c){R.quad([[x-.14,YP+.01,z-.14],[x+.14,YP+.01,z-.14],[x+.14,YP+.01,z+.14],[x-.14,YP+.01,z+.14]],{fill:null,ec:P.mute,ea:.35,dash:[2,3]});continue}
      R.box([x,YP+.02,z],[.28,.05,.28],{fill:c===2?mix(P.paper,P.c2,.8):mix(P.paper,P.c1,.55),shadow:false,lw:.6,ea:.5})}
    // the readahead mark: the page whose read starts the next window
    if(mark>=0&&mark<NP){R.glow([px(mark),YP+.1,pz(mark)],.25,{c:P.c5,a:.9});if(k<5)R.label([px(mark),YP+.1,pz(mark)],'mark',{fs:12,c:P.c5,b:1,dy:-14,wide:1})}
    // the windows fetched in this step stream up from the device
    EV.filter(v=>cur.has(v[0])&&k<7).forEach(v=>{const a=v[1],b=Math.min(NP,v[1]+v[2])-1,m=[(px(a)+px(b))/2,YP,(pz(a)+pz(b))/2];
      R.flowArc([m[0]*.8,.45,2.2],m,.5,{c:P.c2,r:.06,n:Math.max(3,Math.round(2+v[2]/4)),speed:1.6})});
    // the reader: the page it is reading now
    if(n>0&&k<7){const p=n-1;R.glow([px(p),YP+.12,pz(p)],.32,{c:P.ink,a:.55});R.label([px(p),YP+.12,pz(p)],'read() '+n,{fs:12,mono:1,b:1,c:P.ink,dy:-16})}
    const req=fired.length,pages=fired.reduce((s,v)=>s+v[2],0);
    R.label([X0-.1,YP,-Z0+.2],k===7?'whole run: '+run.reads+' reads, '+run.reqs+' requests':n+' reads · '+req+' request'+(req===1?'':'s')+' · '+pages+' pages',{al:'left',dy:14,fs:12.5,mono:1,b:1,c:P.c2});
  }
  const full={cam:[0,.62],bounds:[[-3.1,0,-1.7],[3.1,2.1,2.9]]};
  S3.stage({id:'stg-ra',list:'sx-ra',fig:'Fig. 2 · readahead, measured on a cold file',cam:full.cam,bounds:full.bounds,aspect:.62,dur:2600,hold:4600,draw,
    // the first windows are small: the camera starts close on the first two rows and pulls back as they grow
    view:k=>k>=1&&k<=3&&innerWidth>=560?{cam:[-.12,.58],bounds:[[-3.1,0,-.3],[.9,2.1,2.9]]}:full,
    margin:w=>w<520?[16,10,26,10]:[18,40,30,40]});
})();
