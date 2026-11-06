// ---- Scene, Fig. 5 (section 5): the real chat_id B-tree and a lookup of chat 42000, then a split and the fill that key order leaves (renderer v2) ----
// Steps 1 to 5 are pageinspect on PostgreSQL 16.2 (SE.m1: bt_meta, bt_root_items, bt_path_42000, chat_42000_ctids, pgstatindex): the root's
// separators and downlinks, the entry counts on the path, the 1,130 leaf pages (one tile stands for about 28) and the six table pages, placed
// by page number in a grid of 140 pages a row. Step 6 is an illustrative split. Step 7 is the measured million-key primary key (SE.m3.splits).
(function(){
  if(!document.getElementById('stg-bt')||!window.SE)return;const {at,off,lerp,mix}=S3;
  const M=SE.m1,meta=M.bt_meta[0],path=M.bt_path_42000,st=(M.pgstatindex||[{}])[0];
  const key=d=>{const b=(d||'').trim().split(/\s+/).filter(Boolean).slice(0,8);let v=0;for(let i=b.length-1;i>=0;i--)v=v*256+parseInt(b[i],16);return b.length?v:null};
  const RI=M.bt_root_items.map(r=>({blk:+r.ctid.match(/\((\d+),/)[1],key:key(r.data)}));
  const ctids=String(M.chat_42000_ctids).match(/\(\d+,\d+\)/g)||[],pages=ctids.map(c=>+c.match(/\((\d+),/)[1]);
  const heapPages=Math.round(M.sizes[0].heap/8192),nLeaf=st.leaf_pages||1130,SPL=SE.m3.splits,asc=SPL.find(s=>s.order==='ascending'),rnd=SPL.find(s=>s.order==='random');
  const f=n=>n.toLocaleString('en-US');
  const YR=3.4,YI=2.3,YL=1.2,IX=[-4.5,-1.5,1.5,4.5],NT=40,TX=i=>-5.85+i*.3,TGT=13; // the tile that holds leaf 478, under page 288
  const ROW=140,HX=p=>-6+12*(p%ROW)/ROW,HZ=p=>1.05+Math.floor(p/ROW)*.02;
  function draw(R,k,e){const P=R.P;R.grid(-7,7,-4.6,2,.5);
    const ta=k<=5?1:1-Math.min(1,e*1.8);
    if(ta>0){
      const foc=(lv)=>k===0||k===5?1:k-1===lv?1:k>=1&&k-1>lv?.55:.3;
      // the table: 19,235 pages as a floor plate behind the tree
      R.glass([-6,.01,1],[12,0,0],[0,0,Math.ceil(heapPages/ROW)*.02+.1],{c:P.c3,a:ta*(k===4?.8:.45),nu:14,nv:6,th:.02});
      R.label([-6,0,2.4],'messages: '+f(heapPages)+' table pages',{al:'right',dx:-10,fs:12.5,c:P.c3,a:ta,grp:'lv'});
      // metapage and root
      R.box([-2.2,YR,0],[.5,.12,.5],{fill:mix(P.paper,P.line,.4),a:ta*foc(-1),shadow:false});R.label([-2.2,YR+.12,0],'metapage: root '+meta.root,{al:'right',dx:-14,fs:12,c:P.mute,a:ta,dy:-6});
      const ra=ta*(k===1?1:foc(0));R.box([0,YR,0],[3,.14,.8],{fill:k===1?mix(P.paper,P.acc,.25):P.paper,a:ra,shadow:false});
      RI.forEach((r,i)=>{const x=-1.1+i*.73;R.box([x,YR+.14,0],[.6,.12,.5],{fill:mix(P.paper,P.c1,i===1&&k>=1?.75:.25),a:ra,shadow:false,lw:.6});
        if(k===1)R.label([x,YR+.26,0],r.key==null?'(min)':f(r.key),{fs:12,mono:true,b:i===1&&k===1,c:i===1&&k===1?P.acc:P.ink,dy:-11,a:ra})});
      R.label([1.6,YR+.1,0],'root '+meta.root+' · '+path[0].live_items+' entries',{al:'left',dx:10,fs:12.5,b:1,a:ra,c:k===1?P.acc:P.ink});
      // internal pages: the root's four downlinks
      RI.forEach((r,i)=>{const on=r.blk===path[1].blkno,a=ta*(on&&k===2?1:foc(1));R.box([IX[i],YI,0],[2.4,.12,.7],{fill:on&&k>=2&&k<5?mix(P.paper,P.acc,.25):P.paper,a,shadow:false});
        for(let j=0;j<24;j++)R.box([IX[i]-1.08+j*.094,YI+.12,0],[.06,.08,.42],{fill:mix(P.paper,P.c1,on&&k===2&&j===7?.9:.2),a,shadow:false,lw:.4});
        R.label([IX[i],YI,.35],'page '+r.blk,{fs:12,mono:true,c:on&&k>=1?P.acc:P.mute,dy:14,a:Math.max(a,.4)});
        R.line([[0,YR,0],[IX[i],YI+.2,0]],{c:P.line,w:1,a:ta*.8})});
      if(k===2)R.label([IX[1],YI+.2,0],'page '+path[1].blkno+' · '+path[1].live_items+' entries',{fs:12.5,b:1,c:P.acc,dy:-26});
      if(k===1)R.flowArc([-.37,YR+.2,0],[IX[1],YI+.25,0],.3,{c:P.acc,r:.06});
      if(k===2)R.flowArc([IX[1]-.42,YI+.2,0],[TX(TGT),YL+.2,0],.25,{c:P.acc,r:.06});
      // leaf pages: one tile for about 28 of the 1,130
      for(let i=0;i<NT;i++){const on=i===TGT&&k>=2&&k<5,sp=k===5&&i===TGT+4,a=ta*(on&&k===3?1:foc(2));
        R.box([TX(i)-(sp?.06*e:0),YL,0],[.22-(sp?.1*e:0),.12,.6],{fill:on?mix(P.paper,P.acc,.35):sp?mix(P.paper,P.c2,.5*e):P.paper,a,shadow:false,lw:.6})}
      R.label([TX(0),YL,0],f(nLeaf)+' leaf pages',{al:'right',dx:-10,fs:12.5,c:P.mute,a:ta,grp:'lv'});
      // the leaf: chat 42000's one entry with its six ctids
      if(k===3){for(let j=0;j<6;j++)R.ball([TX(TGT)-.25+j*.1,YL+.22,0],.045,{c:P.c3});R.glow([TX(TGT),YL+.2,0],.5,{c:P.acc,a:.6});
        R.label([TX(TGT),YL+.25,0],(R.W<520?'':'leaf '+path[2].blkno+' · '+path[2].live_items+' entries · ')+'42000 → 6 ctids',{fs:12.5,b:1,c:P.acc,dy:-20})}
      // the table pages those ctids name
      if(k===4){pages.forEach((p,j)=>{const b=[HX(p),0,HZ(p)];R.flow([[TX(TGT),YL,0],[TX(TGT),.5,.9],b],{c:P.c3,r:.06,speed:1.6,n:7});R.box(b,[.22,.22,.22],{fill:P.c3,a:e})});
        R.label([0,0,3.9],(R.W<520?'':'3 index pages and ')+pages.length+' table pages, not '+f(heapPages),{fs:13,b:1,c:P.c3,dy:22,a:e})}
      // a split (illustrative): the full leaf hands its upper half to a new page; the parent gets one more separator
      if(k===5){const x=TX(TGT+4);R.box([x+.08,YL,0],[.12*e+.01,.12,.6],{fill:mix(P.paper,P.c2,.5),a:e,shadow:false});R.glow([x,YL+.1,0],.5,{c:P.c2,a:e*.7});
        R.flowArc([x+.05,YL+.15,0],[IX[1]+.3,YI+.2,0],.3,{c:P.c2,a:e,r:.055});R.glow([IX[1]+.3,YI+.15,0],.45,{c:P.c2,a:e*.6});
        R.label([x,YL,0],R.W<520?'a full leaf splits':'a full leaf splits; the parent gains a separator',{fs:12.5,b:1,c:P.c2,dy:30,a:e})}
    }
    // the same million keys, in order and at random: leaf pages and how full they are
    if(k===6){const a=Math.min(1,e*1.5),per=92,sx=12/Math.ceil(rnd.leaf_pages/per);
      [[asc,1.1,'in order (a sequence)'],[rnd,-1.1,'random order (like UUID v4)']].forEach(([s,z,l],r)=>{const n=Math.ceil(s.leaf_pages/per);
        for(let i=0;i<n;i++){const x=-6+(i+.5)*sx;R.box([x,0,z],[sx*.86,.06,.8],{a,shadow:false,lw:.5});R.box([x,.06,z],[sx*.6,.8*s.avg_leaf_density/100,.5],{fill:mix(P.paper,r?P.c2:P.c1,.55),a,shadow:false,lw:.5})}
        R.label([-6,.85,z-.3],l+': '+f(s.leaf_pages)+' leaf pages, '+Math.round(s.avg_leaf_density)+'% full',{al:'left',fs:12.5,b:1,c:r?P.c2:P.c1,a,dy:-14})});
      R.label([0,0,1.6],'1M bigint keys, primary key · one bar = '+per+' leaf pages',{fs:12.5,c:P.mute,a,dy:22})}
  }
  const full={cam:[.12,.34],bounds:[[-6.2,0,-.5],[6.2,3.7,3.9]]};
  S3.stage({id:'stg-bt',list:'sx-bt',fig:'Fig. 5 · the chat_id B-tree, from pageinspect',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[22,20,18,110],
    view:k=>k===1?{cam:[.12,.3],bounds:[[-3,2.3,-.5],[3.2,3.8,.5]]}:k===2?{cam:[.12,.3],bounds:[[-5.5,1.1,-.5],[1,2.8,.5]]}:k===3?{cam:[.12,.34],bounds:[[-5,.9,-.6],[0,1.8,.6]]}:k===5?{cam:[.12,.32],bounds:[[-5,.9,-.6],[1,2.8,.6]]}:k===6?{cam:[.08,.95],bounds:[[-6.2,0,-1.8],[6.2,1,1.8]]}:full});
})();
