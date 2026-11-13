// ---- Scene, Fig. 2 (section 2): the four-level walk of one address as stacked glass tables (renderer v2) ----
// The address is the job's memory-mapped dataset, 0xffff81fd2000 (root's /proc/PID/maps); its indices and offset come from VMADDR.decode (arm64, 4 KiB pages).
// Each table is a glass plate of 512 entries (a 16 x 32 lattice); the chosen entry sits where its index puts it. Table and frame numbers are illustrative.
(function(){
  if(!document.getElementById('stg-walk')||!window.VMADDR)return;const {at,off,lerp,mix}=S3;
  const HEX='ffff81fd2000',r=VMADDR.decode(HEX,'arm64-4k'),ix=r.idx.map(f=>f.val),off0=r.off;
  const FRAME=0x8a3c1,PA='0x'+(FRAME*4096+off0).toString(16);
  const S=1.6,PX=i=>-3.4+i*1.5,PY=i=>2.5-i*.55,Z0=-1.5,FX=PX(3)+S+.45;
  const ent=(i,j)=>[PX(i)+((j%16)+.5)/16*S,PY(i)+.02,Z0+(Math.floor(j/16)+.5)/32*S];
  const COL=['c1','c2','c3','c4'];
  // the address strip in front: four 9-bit index fields and the 12-bit offset, widths in proportion to their bits
  const BITS=[9,9,9,9,12],SW=7.2,SX=-3.9,ZS=1.7;let sx=SX;const FLD=BITS.map(b=>{const w=SW*b/48;const c=sx+w/2;sx+=w;return {c,w}});
  const TLB=[-4.7,0,.2],REG=[-4.7,0,-1.0];
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-5.6,4.6,-2.4,2.6,.5);
    // the strip
    FLD.forEach((f,i)=>{const on=k===0||(i<4&&k===i+2)||(i===4&&k===5),c=i<4?P[COL[i]]:P.c5;
      R.box([f.c,0,ZS],[f.w-.06,.26,.6],{fill:mix(P.paper,c,on?.55:.18),a:1});
      R.label([f.c,.26,ZS],i<4?String(ix[i]):'0x'+off0.toString(16),{mono:true,fs:13,b:1,dy:-10,c:on?P.ink:P.mute});
      R.label([f.c,0,ZS+.3],i<4?(nar?'L'+i:'level '+i):'offset',{fs:12,dy:12,c:P.mute,a:k===0?1:.6,wide:nar?0:0})});
    if(k===0||k===6)R.label([SX,.13,ZS],'0x'+HEX,{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.ink,a:k===0?1:.55,wide:1});
    // the register and the TLB
    const rg=k===1?1:k>=2&&k<=5?.55:.3;R.box(REG,[.8,.3,.5],{fill:mix(P.paper,P.c5,.35),a:Math.max(.3,k>=1?rg:.3)});R.label([REG[0],.3,REG[2]],'TTBR0_EL1',{mono:true,fs:12,b:1,dy:-10,a:Math.max(.4,rg)});
    const tl=k===1||k===6?1:.35;R.box(TLB,[.8,.42,.6],{fill:mix(P.paper,P.c2,k===6?.6:.3),a:tl});R.label([TLB[0],.42,TLB[2]],k===6?'TLB: hit next time':k>=1?'TLB: miss':'TLB',{fs:12.5,b:1,dy:-10,c:k===1?P.bad:P.ink,a:Math.max(.45,tl)});
    if(k===1)R.flowArc([FLD[0].c,.26,ZS-.3],[TLB[0]+.3,.3,TLB[2]],.5,{c:P.c2,a:e,r:.06,n:8});
    // four tables, a staircase of glass plates; the current one at full strength
    for(let i=0;i<4;i++){const act=k===i+2,done=k>i+2&&k<6,a=k===6?.25:act?1:done?.5:k===0?.35:.22,c=P[COL[i]];
      R.glass([PX(i),PY(i),Z0],[S,0,0],[0,0,S],{c,nu:16,nv:8,a});
      R.label([PX(i),PY(i),Z0+S],nar?'L'+i:'level '+i+' table',{al:'left',fs:12.5,b:1,dy:12,c,a:Math.max(.35,a)});
      // the chosen entry; the next table hangs from it
      const p=ent(i,ix[i]);if(k>=i+2){R.box([p[0],p[1],p[2]],[S/16*.95,.07,S/32*1.6],{fill:c,a:Math.max(.4,a),shadow:false});
        R.label([p[0],p[1]+.07,p[2]],'['+ix[i]+']',{mono:true,fs:12.5,b:1,dy:-10,c,a:act?1:.6})}
      if(act){// the index selects the entry, and the read flows from the previous table (or the register) to it
        R.line([[FLD[i].c,.26,ZS-.3],[p[0],p[1],p[2]]],{c,w:1.2,dash:[4,4],a:e*.8});
        const src=i===0?[REG[0]+.2,.3,REG[2]]:ent(i-1,ix[i-1]);R.flow([src,[PX(i),PY(i)+.02,Z0],[p[0],p[1]+.03,p[2]]],{c,a:e,r:.07,speed:1.4});
        R.glow(p,.22,{c,a:e})}}
    // the data page
    const fa=k===5?1:k===6?1:k===0?.35:.22;R.box([FX+.6,0,.1],[1.0,.45,1.0],{fill:mix(P.paper,P.c5,k>=5?.45:.15),a:fa});
    R.label([FX+.6,.45,.1],'data page (4 KiB frame)',{fs:12.5,b:1,dy:-10,a:Math.max(.4,fa)});
    if(k===5){const p=ent(3,ix[3]);R.flow([[p[0],p[1],p[2]],[FX+.6,.5,.1]],{c:P.c4,a:e,r:.07});R.label([FX+1.1,0,.6],(nar?'':'physical address ')+PA+' (frame illustrative)',{fs:12,dy:14,c:P.c4,a:e,al:'right'})}
    if(k===6){R.flowArc([FLD[0].c,.26,ZS-.3],[TLB[0]+.3,.42,TLB[2]],.4,{c:P.c2,a:e,r:.06,n:6});R.flowArc([TLB[0]+.4,.42,TLB[2]],[FX+.2,.45,.1],1.3,{c:P.c2,a:e,r:.07,speed:1.8});
      R.label([FX+1.1,0,.6],'next access: TLB to frame',{fs:12.5,b:1,dy:14,al:'right',c:P.c2,a:e,wide:1})}
  }
  const full={cam:[.18,.6],bounds:[[-5.4,0,-1.6],[4.6,2.5,2.1]]};
  S3.stage({id:'stg-walk',list:'sx-walk',fig:'Fig. 2 · one address, four table reads',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1400,hold:4600,draw,
    view:k=>k===0?{cam:[.08,.5],bounds:[[-4.2,0,1.2],[4.5,.3,2.1]]}:k>=2&&k<=5?{cam:[.18,.6],bounds:[[PX(k-2)-1.6,0,-1.6],[PX(k-2)+3.5,PY(k-2)+.75,2.5]]}:full,
    margin:w=>w<520?[20,8,18,8]:[26,14,44,14]});
})();
