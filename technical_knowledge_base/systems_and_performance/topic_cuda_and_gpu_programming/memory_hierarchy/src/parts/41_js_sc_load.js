// ---- Scene, Fig. 2: one warp's load as the memory system sees it. 32 lanes (orange) above 1 KB of DRAM drawn as 32-byte sectors
// (four make a 128-byte line); the sectors a load fetches rise and turn blue, the bytes some lane wanted inside them orange, the rest grey.
// Every count comes from the page's sector model (window.MHM.sectors, checked against code/reference.py): coalesced 4 sectors, a 32-byte
// struct stride 32, misaligned 5, float4 16 in one instruction. The random gather's addresses are illustrative (a fixed seed);
// its 32 sectors follow from the addresses. Moved and used bytes stand as two columns on the right. Steps: #sx-load. ----
(function(){
  if(!document.getElementById('stg-load'))return;const {at,mix}=S3,M=window.MHM;
  const NS=32,SP=.4,X0=-1.2-7.5*SP,sx=i=>X0+(i%16)*SP,sz=i=>ZM+Math.floor(i/16)*.7,ZM=.2,LP=.2,lx=l=>-1.2+(l-15.5)*LP,YL=2.2,ZL=-1.2;   // two rows of 16 sectors: bytes 0 to 511 behind, 512 to 1,023 in front
  const CASES=[null,{w:4,stride:4},{w:4,stride:32},{w:4,stride:4,off:4},{w:16,stride:16},'rand'];
  // the random gather: 32 lanes, each a 4-byte word somewhere in a large array (illustrative positions, seeded)
  const RAND=(()=>{let s=7;const r=()=>(s=(s*16807)%2147483647)/2147483647;const out=[];for(let l=0;l<32;l++)out.push({x:-4.4+r()*6.4,z:-.1+r()*2.2,w:Math.floor(r()*8)});return out})();
  const res=CASES.map(c=>c&&c!=='rand'?M.sectors(c):null);
  function words(c,r){const sec={};if(!r)return sec;r.acc.forEach(x=>{for(let b=x.a;b<x.a+c.w;b+=4){const wd=Math.floor(b/4),s=Math.floor(wd/8);(sec[s]=sec[s]||new Set()).add(wd%8)}});return sec}
  const W=CASES.map((c,i)=>words(c,res[i]));
  const BW=2.9,BU=3.6,BS=1.6/1024;   // the moved and used columns: 1,024 bytes are 1.6 units tall
  function draw(R,k,e){const P=R.P;R.grid(-5.4,5.4,-2.2,2.8,.5);
    const c=CASES[k],r=res[k],w=W[k],rand=c==='rand',grey=mix(P.paper,P.mute,.35);
    // the lanes
    for(let l=0;l<32;l++)R.box([lx(l),YL,ZL],[.16,.18,.16],{fill:mix(P.paper,P.c2,.75),shadow:false,lw:.6});
    R.label([lx(0)-.08,YL+.18,ZL],'32 lanes of one warp · '+(k===4?'16':'4')+' bytes each',{mono:true,fs:12.5,b:1,al:'left',dy:-18,c:P.c2,wide:1});
    // the 1 KB strip: 32 sectors, outlined in 128-byte lines
    const sa=rand?.25:1;
    for(let q=0;q<8;q++){const z=sz(q*4);R.quad([[sx(q*4)-.19,0,z-.27],[sx(q*4+3)+.19,0,z-.27],[sx(q*4+3)+.19,0,z+.27],[sx(q*4)-.19,0,z+.27]],{fill:false,ec:P.mute,a:sa*.7,lw:1,dash:[3,3]})}
    for(let s=0;s<NS;s++){const used=w[s],f=!!used&&!rand,h=f?.12+.2*e:.07;
      if(!f){R.box([sx(s),0,sz(s)],[SP*.88,.07,.4],{fill:P.paper,a:sa,shadow:false,lw:.6});continue}
      R.box([sx(s),0,sz(s)],[SP*.88,.03,.46],{fill:mix(P.paper,P.c1,.6),shadow:false,lw:.6});
      // eight words per sector: wanted ones orange, fetched but unused grey
      for(let j=0;j<8;j++){const wx=sx(s)-SP*.44+SP*.88*(j+.5)/8;R.box([wx,.03,sz(s)],[SP*.88/8*.9,used.has(j)?h*1.6:h,.36],{fill:used.has(j)?P.c2:grey,shadow:false,lw:.4,ea:.5})}}
    R.label([sx(0)-.2,0,sz(16)+.3],'1 KB of DRAM · 32-byte sectors',{mono:true,fs:12,al:'left',dy:30,c:P.mute,a:rand?0:1,wide:1});
    if(k===0)R.label([sx(15)-.6,0,sz(16)+.27],'128-byte line',{mono:true,fs:12,dy:46,c:P.mute,a:e,wide:1});
    // the random gather: 32 sectors scattered over a large array, behind the strip
    if(rand){RAND.forEach((p,l)=>{R.box([p.x,0,p.z],[SP*.88,.03,.36],{fill:mix(P.paper,P.c1,.6),shadow:false,lw:.6,a:e});
        for(let j=0;j<8;j++)R.box([p.x-SP*.44+SP*.88*(j+.5)/8,.03,p.z],[SP*.88/8*.9,(j===p.w?1.6:1)*(.12+.2*e),.3],{fill:j===p.w?P.c2:grey,shadow:false,lw:.4,ea:.5,a:e});
        R.flow([[p.x,.35,p.z],[lx(l),YL-.02,ZL]],{c:P.c1,a:e*.75,r:.05,n:2,speed:1.2})});
      R.label([-1.2,0,2.3],'32 sectors scattered over a large array',{mono:true,fs:12.5,b:1,dy:14,c:P.c1,a:e,wide:1})}
    // the data climbs from the fetched sectors to the lanes that asked
    if(r){const seen={};r.acc.forEach(x=>{const s=Math.floor(x.a/32),key=x.l+'_'+s;if(seen[key])return;seen[key]=1;
        R.flow([[sx(s),.4,sz(s)],[lx(x.l),YL-.02,ZL]],{c:P.c1,a:e*.75,r:.05,n:2,speed:1.2})})}
    // moved against used
    let moved=0,used=0,nsec=0;if(r){moved=r.fetched;used=r.used;nsec=r.nSec}else if(rand){moved=1024;used=128;nsec=32}
    const ca=k===0?.25:1;
    R.box([BW,0,ZM],[.42,Math.max(.02,moved*BS*e),.42],{fill:P.c1,a:ca});R.box([BU,0,ZM],[.42,Math.max(.02,used*BS*e),.42],{fill:P.c2,a:ca});
    if(k>0){R.label([BW,moved*BS*e,ZM],'moved '+moved.toLocaleString('en-GB')+' B',{mono:true,fs:12,al:'right',dx:-14,dy:-4,c:P.c1,b:1,wide:1});
      R.label([BU,used*BS*e,ZM],'used '+used+' B',{mono:true,fs:12,al:'left',dx:18,dy:-4,c:P.c2,b:1,wide:1});
      R.label([(BW+BU)/2,0,ZM+.3],nsec+' sectors'+(k===4?' · 1 instruction':''),{mono:true,fs:12.5,b:1,dy:16,c:P.ink,wide:1})}
    // on a phone the side labels hide; one line at the top says what the step fetched
    if(R.W<520&&k>0)R.label([lx(15.5),YL+.18,ZL],nsec+' sectors · '+moved.toLocaleString('en-GB')+' B moved · '+used+' used',{mono:true,fs:12,b:1,dy:-18,c:P.ink});
  }
  const full={cam:[.2,.5],bounds:[[-4.6,0,-1.3],[4.1,2.6,1.3]]};
  const st=S3.stage({id:'stg-load',list:'sx-load',fig:'Fig. 2 · what one warp load fetches',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1400,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[30,90,22,16],
    // step 2 leans in on the four sectors a coalesced load needs; step 6 looks further forward, at the scattered sectors
    view:k=>k===5?{cam:[.2,.62],bounds:[[-4.6,0,-1.3],[4.1,2.6,2.4]]}:k===1?{cam:[.1,.44],bounds:[[-4.6,0,-1.3],[4.1,2.6,1.3]]}:full});
  (window.MHSTG=window.MHSTG||{})['stg-load']=st;
})();
