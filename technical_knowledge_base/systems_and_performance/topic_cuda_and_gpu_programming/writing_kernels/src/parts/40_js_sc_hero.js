// ---- Scene, Fig. 1 (the hero): the matmul ladder as a matmul cube, one rung per step (renderer v2) ----
// C = AB drawn the classic way: C lies on the floor (rows m along z, columns n along x), A stands on the left wall (rows m, depth k
// upwards), B on the back wall (columns n, depth k upwards); a 256 x 256 corner of each, 1 element = 1/64 of a unit.
// Data: window.WKL (src/ladder.py): block tile, K step, thread tile and the derived global bytes per FMA of each rung, drawn as
// the bars on the right (log scale). Orange = global memory, blue = shared memory, green = registers. Steps: #sx-hero.
(function(){
  if(!document.getElementById('stg-hero')||!window.WKL||!window.S3)return;const {at,mix}=S3;
  const L=window.WKL,RU=L.rungs,N=RU.length,u=1/64;
  const X=n=>-2+n*u,Z=m=>-2+m*u,Y=k=>k*u,XA=-2.12,ZB=-2.12,KK=150;
  const BK=r=>r.key==='k3'?32:8,TW=r=>r.key==='k3'||r.key==='k4'?1:8;
  const bx=j=>2.7+j*.4,BZ=-.5,hb=v=>.2+.3*Math.log2(v/.0625);
  function draw(R,k,e){const P=R.P,r=RU[k],G=P.c2,S=P.c1,Rg=P.c3;R.grid(-3,5.6,-3,2.8,.5);
    // the three matrices in global memory
    R.glass([X(0),.01,Z(0)],[4,0,0],[0,0,4],{c:P.mute,a:.75,nu:8,nv:8,th:.02});
    R.glass([XA,0,Z(0)],[0,0,4],[0,4,0],{c:P.mute,a:.55,nu:8,nv:8,th:.02});
    R.glass([X(0),0,ZB],[4,0,0],[0,4,0],{c:P.mute,a:.55,nu:8,nv:8,th:.02});
    R.label([XA,4.05,Z(2)],'A · global',{mono:true,fs:12.5,b:1,c:P.mute,dy:-8});
    R.label([X(256),4.05,ZB],'B · global',{mono:true,fs:12.5,b:1,c:P.mute,dy:-8});
    R.label([X(250),0,Z(256)],'C',{serif:true,fs:15,b:1,c:P.mute,dy:14,dx:-6});
    const a1=at(k,e,k); // everything of the current rung fades in with it
    if(r.block===0){ // rungs 1 and 2: one warp of 32 threads, one output each, no tiles
      const col=r.key==='k1',r0=96,c0=112,yk=Y(KK);
      if(col){R.box([X(c0+.5),.012,Z(r0+16)],[u*2.2,.05,32*u],{fill:Rg,a:a1,shadow:false});
        R.box([XA+.03,yk,Z(r0+16)],[.035,.05,32*u],{fill:G,a:a1,shadow:false});
        R.box([X(c0+.5),yk,ZB+.03],[.06,.06,.035],{fill:G,a:a1,shadow:false});
        for(let i=0;i<8;i++){const m=r0+2+i*4;R.flow([[XA+.05,yk,Z(m)],[X(c0)-.6,yk*.55,Z(m)],[X(c0+.5),.07,Z(m)]],{c:G,a:a1*.9,r:.05,n:5,speed:1.3})}
        R.flow([[X(c0+.5),yk,ZB+.05],[X(c0+.5),yk*.6,Z(r0)-.6],[X(c0+.5),.07,Z(r0+16)]],{c:G,a:a1*.6,r:.05,n:4,speed:1.3});
        R.label([XA,yk,Z(r0+16)],'32 rows: 32 sectors',{mono:true,fs:12,c:G,dy:-14,a:a1,wide:1});
        R.label([X(c0+.5),.05,Z(r0+32)],'one warp: a column of C',{mono:true,fs:12,c:Rg,dy:16,a:a1,wide:1})}
      else{R.box([X(c0+16),.012,Z(r0+.5)],[32*u,.05,u*2.2],{fill:Rg,a:a1,shadow:false});
        R.box([X(c0+16),yk,ZB+.03],[32*u,.05,.035],{fill:G,a:a1,shadow:false});
        R.box([XA+.03,yk,Z(r0+.5)],[.035,.06,.06],{fill:G,a:a1,shadow:false});
        R.flow([[X(c0+16),yk,ZB+.05],[X(c0+16),yk*.6,Z(r0)-.6],[X(c0+16),.07,Z(r0+.5)]],{c:G,a:a1*.9,r:.06,n:6,speed:1.3});
        R.flow([[XA+.05,yk,Z(r0+.5)],[X(c0)-.6,yk*.55,Z(r0+.5)],[X(c0+16),.07,Z(r0+.5)]],{c:G,a:a1*.6,r:.05,n:4,speed:1.3});
        R.label([X(c0+16),yk,ZB],'32 neighbours: one 128-byte line',{mono:true,fs:12,c:G,dy:-14,a:a1,wide:1});
        R.label([X(c0+16),.05,Z(r0+.5)],'one warp: a row of C',{mono:true,fs:12,c:Rg,dy:16,a:a1,wide:1})}
    }else{ // rungs 3 to 7: a block tile, its K step staged in shared memory, a thread tile in registers
      const bt=r.block,bk=BK(r),r0=Math.round((256-bt)/2/8)*8,c0=r0,k0=Math.floor(KK/bk)*bk,th=r.thread,tw=TW(r),hk=Math.max(.1,bk*u),yk=Y(k0);
      // the strips of A and B this block reads over the whole K loop, and the K step it holds now
      R.box([XA+.02,0,Z(r0+bt/2)],[.02,4,bt*u],{fill:G,a:a1*.22,shadow:false,edge:false});
      R.box([X(c0+bt/2),0,ZB+.02],[bt*u,4,.02],{fill:G,a:a1*.22,shadow:false,edge:false});
      R.box([XA+.03,yk,Z(r0+bt/2)],[.035,hk,bt*u],{fill:G,a:a1,shadow:false});
      R.box([X(c0+bt/2),yk,ZB+.03],[bt*u,hk,.035],{fill:G,a:a1,shadow:false});
      // the shared-memory copies: As beside the block's column, Bs behind it
      const xs=X(c0)-.16,zs=Z(r0)-.16;
      R.glass([xs,yk,Z(r0)],[0,0,bt*u],[0,hk,0],{c:S,a:a1,nu:Math.max(1,bk/4),nv:1,th:.03});
      R.glass([X(c0),yk,zs],[bt*u,0,0],[0,hk,0],{c:S,a:a1,nu:Math.max(1,bt/16),nv:1,th:.03});
      R.label([xs,yk+hk,Z(r0+bt/2)],'As · shared',{mono:true,fs:12,b:1,c:S,dy:-12,dx:-10,al:'right',a:a1,wide:1});
      R.label([X(c0+bt),yk+hk,zs],'Bs',{mono:true,fs:12,b:1,c:S,dy:-12,al:'left',dx:6,a:a1,wide:1});
      // the block's slab of work for this K step, and its output tile on the floor
      R.box([X(c0+bt/2),yk,Z(r0+bt/2)],[bt*u,hk,bt*u],{fill:S,a:a1*.35,fa:.5,shadow:false});
      R.box([X(c0+bt/2),.012,Z(r0+bt/2)],[bt*u,.04,bt*u],{fill:mix(P.paper,S,.45),a:a1,shadow:false});
      R.label([X(c0+bt/2),.03,Z(r0+bt)],'block tile '+bt+' × '+bt,{mono:true,fs:12,c:S,dy:15,a:a1,wide:1});
      // the thread tile in registers
      R.box([X(c0+tw/2),.05,Z(r0+th/2)],[Math.max(tw*u,.06),.16,Math.max(th*u,.06)],{fill:Rg,a:a1,shadow:false});
      R.glow([X(c0+tw/2),.15,Z(r0+th/2)],.3,{c:Rg,a:a1*.9});
      R.label([X(c0+tw/2),.1,Z(r0+th/2)],th===1?'1 output':th+' × '+tw+' in registers',{mono:true,fs:12,c:Rg,dx:-10,al:'right',dy:-2,a:a1,wide:1});
      if(r.key==='k10'){R.quad([[X(c0),.07,Z(r0)],[X(c0+64),.07,Z(r0)],[X(c0+64),.07,Z(r0+32)],[X(c0),.07,Z(r0+32)]],{fill:Rg,fa:.25,ec:Rg,a:a1,dash:[5,4]});
        R.label([X(c0+64),.07,Z(r0+16)],'warp tile (size illustrative)',{mono:true,fs:12,c:Rg,al:'left',dx:8,a:a1,wide:1})}
      // flows: global into shared (dot count follows the global bytes per FMA), shared into the slab and down to registers
      const ng=r.moved==null?3:Math.max(3,Math.round(3+2*Math.log2(r.moved/.0625))),rg=r.key==='k6'||r.key==='k10'?.085:.055,ns=r.shared==null?4:Math.max(3,Math.round(3+r.shared));
      [.25,.75].forEach(f=>{R.flow([[XA+.05,yk+hk/2,Z(r0+bt*f)],[xs-.02,yk+hk/2,Z(r0+bt*f)]],{c:G,a:a1,r:rg,n:ng,speed:1.2});
        R.flow([[X(c0+bt*f),yk+hk/2,ZB+.05],[X(c0+bt*f),yk+hk/2,zs-.02]],{c:G,a:a1,r:rg,n:ng,speed:1.2})});
      R.flow([[xs+.02,yk+hk/2,Z(r0+th/2)],[X(c0+tw/2),yk+hk/2,Z(r0+th/2)],[X(c0+tw/2),.14,Z(r0+th/2)]],{c:S,a:a1,r:.05,n:ns,speed:1.4});
      R.flow([[X(c0+tw/2),yk+hk/2,zs+.02],[X(c0+tw/2),yk+hk/2,Z(r0+th/2)],[X(c0+tw/2),.14,Z(r0+th/2)]],{c:S,a:a1*.8,r:.05,n:ns,speed:1.4});
    }
    // the ladder's global traffic, one bar per rung (log scale); later rungs drawn faintly so the frame is full from the start
    RU.forEach((q,j)=>{const cur=j===k,past=j<k;
      if(q.moved==null){R.quad([[bx(j)-.12,.01,BZ-.12],[bx(j)+.12,.01,BZ-.12],[bx(j)+.12,.01,BZ+.12],[bx(j)-.12,.01,BZ+.12]],{ec:P.mute,dash:[3,3],a:cur?1:.35});}
      else R.box([bx(j),0,BZ],[.24,hb(q.moved),.24],{fill:cur?G:past?mix(P.paper,G,.35):P.paper,a:cur?1:past?.75:.22,lw:.7});
      R.label([bx(j),0,BZ+.12],String(j+1),{mono:true,fs:12,c:cur?P.ink:P.mute,b:cur,dy:12,wide:1})});
    const v=r.moved;R.label([bx(k)+.12,v==null?0:hb(v),BZ],v==null?'n/a':(r.asked!==v?v+' B moved':v+' B'),{mono:true,fs:12.5,b:1,c:G,al:'left',dx:6,dy:-6});
    R.label([bx(6),0,BZ+.12],'global bytes per FMA (log)',{mono:true,fs:12,c:G,al:'right',dy:32,wide:1});
  }
  const full={cam:[.62,.5],bounds:[[-2.3,0,-2.3],[5.4,4.1,1.9]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the matmul ladder, rung by rung',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1400,hold:5200,draw,
    margin:w=>w<520?[16,10,16,10]:[22,16,26,16],
    view:k=>({cam:[.66-.03*k,.5+.012*k],bounds:full.bounds})});
  (window.WKSTG=window.WKSTG||{})['stg-hero']=st;
})();
